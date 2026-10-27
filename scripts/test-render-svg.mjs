import fs from 'node:fs';

// ---- Regression guard: the AI can turn its own SVG into a PNG (issue #36) ----
// `write` stores text only, so a site that needed a PNG of art the AI drew (a
// social preview card, a PNG favicon) used to end with the AI building a
// canvas page and asking the user to download and re-upload the image.
// RenderSvg draws the SVG in the builder and saves the PNG into the project.
//
// Runs the real tool (and the real normalizeSvgForRaster from manifest.js)
// against a stubbed filesystem and browser.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const ROOT = '/u/AppData/app/chat1';
const win = {
    tools: [],
    FEATURE_FLAGS: { webManifest: true },
    projectRootDir: () => ROOT,
    assertPathInProject: (p) => {
        if (p === '.') return ROOT;
        const abs = p.startsWith('/') ? p : ROOT + '/' + p.replace(/^\.?\/+/, '');
        if (abs !== ROOT && !abs.startsWith(ROOT + '/')) throw new Error('outside the project');
        return abs;
    },
    withFileLock: (path, fn) => fn(),
    __viewImageInternals: {
        VISION_MAX_BYTES: 3.5 * 1024 * 1024,
        fitImageForVision: async (blob, mediaType) => ({ blob, mediaType, fitted: false }),
    },
};
const cards = [];
win.GeneratedMedia = {
    displayURL: async (p) => 'blob:' + p,
    pendingCard: (o) => ({ pending: o }),
    fillCard: (card, o) => { card.filled = o; },
    appendToChat: (card) => cards.push(card),
};
const changed = [];
win.markProjectModified = () => changed.push('modified');
win.recordPreviewChange = (p) => changed.push('preview:' + p);
win.schedulePreviewRefresh = () => changed.push('refresh');

const files = new Map();
const puter = {
    fs: {
        read: async (p) => {
            if (!files.has(p)) throw new Error('not found');
            const v = files.get(p);
            return v instanceof Blob ? v : new Blob([v]);
        },
        write: async (p, data) => { files.set(p, data); },
        stat: async (p) => {
            if (!files.has(p)) throw new Error('not found');
            return { size: files.get(p) instanceof Blob ? files.get(p).size : String(files.get(p)).length };
        },
    },
};

new Function('window', read('../src/js/manifest.js'))(win);
new Function('window', 'puter', read('../src/tools/fs/show_image.js'))(win, puter);
new Function('window', 'puter', read('../src/tools/fs/render_svg.js'))(win, puter);
const I = win.__renderSvgInternals;
const tool = win.tools.find((t) => t.function.name === 'RenderSvg');
check('tool registered with the internals exposed', !!tool && typeof I.outputSize === 'function');

// --- Sizing --------------------------------------------------------------------
const card = I.intrinsicBox('<svg viewBox="0 0 1200 630"><rect/></svg>');
check('reads the viewBox', card && card.w === 1200 && card.h === 630 && card.hasViewBox);
const sized = I.intrinsicBox('<svg width="64px" height="32"><rect/></svg>');
check('falls back to numeric width/height', sized && sized.w === 64 && sized.h === 32 && !sized.hasViewBox);
check('no viewBox and no size is refused', I.intrinsicBox('<svg width="100%"><rect/></svg>') === null);
check('a broken viewBox is refused', I.intrinsicBox('<svg viewBox="0 0 0 10"><rect/></svg>') === null);

const s1 = I.outputSize(card, 1200, 630);
check('width and height are used as given', s1.width === 1200 && s1.height === 630);
const s2 = I.outputSize(card, 600);
check('width alone keeps the shape', s2.width === 600 && s2.height === 315);
const s3 = I.outputSize({ w: 24, h: 24 });
check('neither: long edge is 1200', s3.width === 1200 && s3.height === 1200);
const s4 = I.outputSize(card, 99999, 99999);
check('sizes are capped', s4.width === I.MAX_EDGE && s4.height === I.MAX_EDGE);

const prepared = I.prepare('<svg width="64" height="32"><rect/></svg>', sized, { width: 128, height: 64 });
check('a missing namespace is added (an <img> draws nothing without it)', prepared.includes('xmlns="http://www.w3.org/2000/svg"'));
check('a viewBox is made from width/height', prepared.includes('viewBox="0 0 64 32"'));
check('the output size becomes the intrinsic size',
    prepared.includes('width="128"') && prepared.includes('height="64"') && (prepared.match(/width=/g) || []).length === 1);
check('normalizeSvgForRaster still defaults height to width (icons)',
    win.normalizeSvgForRaster('<svg viewBox="0 0 8 8"><rect/></svg>', 192).includes('height="192"'));

// --- The tool, end to end --------------------------------------------------------
let drawn = null;
let decodes = true;
globalThis.Image = class {
    set src(v) {
        this._src = v;
        if (!v) return;
        setTimeout(() => (decodes ? this.onload() : this.onerror()), 0);
    }
    get src() { return this._src; }
};
globalThis.document = {
    createElement: () => {
        const c = {
            getContext: () => ({ drawImage: (img, x, y, w, h) => { drawn = { w, h, cw: c.width, ch: c.height }; } }),
            toBlob: (cb, type) => cb(new Blob([new Uint8Array([0x89, 0x50, 0x4E, 0x47, 1, 2, 3])], { type })),
        };
        return c;
    },
};
globalThis.FileReader = class {
    readAsDataURL(blob) {
        blob.arrayBuffer().then((buf) => {
            this.result = 'data:image/png;base64,' + Buffer.from(buf).toString('base64');
            this.onload();
        });
    }
};
const run = (args) => tool.exec(args, { appDir: ROOT, currentChatId: 'chat1' });
const rejects = async (args, re) => {
    try { await run(args); return false; } catch (e) { return re.test(e.message); }
};

files.set(ROOT + '/assets/preview.svg', '<svg viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#0e1525"/></svg>');
const out = await run({ path: 'assets/preview.svg', width: 1200, height: 630 });
const png = files.get(ROOT + '/assets/preview.png');
check('the PNG is saved next to the SVG by default', png instanceof Blob && png.type === 'image/png');
check('the canvas is the requested size', drawn && drawn.cw === 1200 && drawn.ch === 630 && drawn.w === 1200);
check('the AI is shown the rendered image',
    Array.isArray(out.__contentBlocks) && out.__contentBlocks[1].type === 'image' && out.__contentBlocks[1].source.media_type === 'image/png');
check('the result names the relative path to reference', out.__contentBlocks[0].text.includes('"assets/preview.png"'));
check('the save counts as a project change for history and the preview',
    changed.includes('modified') && changed.includes('preview:' + ROOT + '/assets/preview.png') && changed.includes('refresh'));

check('the PNG shows in the chat as a card, from the saved file',
    cards.length === 1 && cards[0].filled.url === 'blob:' + ROOT + '/assets/preview.png'
    && cards[0].filled.path === ROOT + '/assets/preview.png' && cards[0].filled.filename === 'preview.png');
check('the AI is told the image is already showing', /now showing in the chat/.test(out.__contentBlocks[0].text));
check('reopening the chat finds the PNG in the result again',
    I.renderedPath(out.__contentBlocks, ROOT) === ROOT + '/assets/preview.png');
check('other content-block results (ViewImage) have no card',
    I.renderedPath([{ type: 'text', text: 'Contents of image "assets/a.png":' }], ROOT) === null);

await run({ path: 'assets/preview.svg', output: 'og/card', width: 600 });
check('output without .png gets it, and missing folders are fine', files.get(ROOT + '/og/card.png') instanceof Blob);

check('a non-SVG source is refused', await rejects({ path: 'assets/photo.png' }, /not an \.svg/));
check('an output outside the project is refused', await rejects({ path: 'assets/preview.svg', output: '/u/AppData/app/chat2/x.png' }, /outside the project/));
check('the project folder itself is not an output', await rejects({ path: 'assets/preview.svg', output: '.' }, /file path inside the project/));
files.set(ROOT + '/nosize.svg', '<svg><rect/></svg>');
check('an SVG with no size asks for a viewBox', await rejects({ path: 'nosize.svg' }, /viewBox/));
decodes = false;
check('an SVG the browser cannot decode explains what to fix', await rejects({ path: 'assets/preview.svg' }, /well-formed XML/));
decodes = true;

// --- ShowImage: an SVG the AI drew, shown in the chat -------------------------------
const show = win.tools.find((t) => t.function.name === 'ShowImage');
files.set(ROOT + '/assets/logo.svg', '<svg viewBox="0 0 10 10"><rect/></svg>');
cards.length = 0;
const shownLogo = await show.exec({ path: 'assets/logo.svg' }, { appDir: ROOT });
check('ShowImage puts the SVG in the chat as a card',
    cards.length === 1 && cards[0].filled.path === ROOT + '/assets/logo.svg' && cards[0].filled.prompt === 'assets/logo.svg');
check('its result is shaped like a GenerateImage result, so a reload shows the card again',
    shownLogo.success && shownLogo.kind === 'image' && shownLogo.path === ROOT + '/assets/logo.svg' && shownLogo.filename === 'logo.svg');
const showRejects = async (args, re) => {
    try { await show.exec(args, { appDir: ROOT }); return false; } catch (e) { return re.test(e.message); }
};
cards.length = 0;
let stopped = false;
win.isAborted = () => stopped;
const slow = win.GeneratedMedia.displayURL;
win.GeneratedMedia.displayURL = async (p) => { stopped = true; return slow(p); };
await show.exec({ path: 'assets/logo.svg' }, { appDir: ROOT });
check('a chat switch while the image URL loads leaves the other chat alone', cards.length === 0);
win.GeneratedMedia.displayURL = slow;
delete win.isAborted;
check('ShowImage refuses a file that is not an image', await showRejects({ path: 'index.html' }, /not an image/));
check('ShowImage refuses a missing file', await showRejects({ path: 'assets/nope.svg' }, /does not exist/));
check('ShowImage stays inside the project', await showRejects({ path: '/u/AppData/app/chat2/x.svg' }, /outside the project/));

// --- Wiring ------------------------------------------------------------------------
const vite = read('../vite.config.js');
check('the tool is in the bundle, after view_image.js',
    vite.includes("'tools/fs/render_svg.js'") && vite.indexOf("'tools/fs/view_image.js'") < vite.indexOf("'tools/fs/render_svg.js'"));
const app = read('../src/js/app.js');
check('loadChat shows the card again and resolves its URL up front',
    (app.match(/__renderSvgInternals\?\.renderedPath\(/g) || []).length === 2 && app.includes("renderSaved({ success: true, kind: 'image'"));
const prompt = read('../src/js/prompt.js');
const pngRule = prompt.split('\n').find((l) => l.includes('RenderSvg')) || '';
check('the RenderSvg rule leaves apple-touch-icons to the builder (it makes them from icon.svg)',
    !/apple-touch-icon/.test(pngRule) && !/apple-touch-icon/.test(tool.function.description));
check('ShowImage is in the bundle', vite.includes("'tools/fs/show_image.js'"));
check('the prompt has the AI show a drawn logo with ShowImage instead of generating one',
    prompt.includes('ShowImage') && !prompt.includes('a logo idea'));
check('the prompt points the AI at RenderSvg instead of a download-and-reupload page',
    prompt.includes('RenderSvg') && /re-upload/.test(prompt));

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nAll render-svg checks passed');
