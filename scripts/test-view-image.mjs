import fs from 'node:fs';

// ---- Regression guard: ViewImage never puts a block the API rejects into the
// history ---------------------------------------------------------------------
// A tool result is persisted in the chat and re-sent with every later request,
// so a block the API refuses doesn't fail one request — it fails every request
// after it, for good. ViewImage used to let three such blocks through:
//   * an SVG's entire source as text (an exported illustration is megabytes:
//     "prompt is too long" from then on), uncapped unlike ReadTextFile;
//   * an image labelled by its EXTENSION, not its bytes — a WebP or JPEG saved
//     under a .png name is common for images from the web, and the API rejects
//     a media_type that doesn't match the data;
//   * bytes that aren't an image the API takes (AVIF/HEIC/BMP behind a .png
//     name, a corrupt file), passed through untouched.
// It also kept images up to 4MB raw, which is 5.33MB base64 — over the 5MB limit.
//
// Functional: runs the real tool against a stubbed filesystem/browser.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const src = fs.readFileSync(new URL('../src/tools/fs/view_image.js', import.meta.url), 'utf8');
const readSrc = fs.readFileSync(new URL('../src/tools/fs/read.js', import.meta.url), 'utf8');
const win = { tools: [], assertPathInProject: (p) => p };
const puterProxy = { fs: { read: (...a) => globalThis.puter.fs.read(...a) } };
new Function('window', 'puter', readSrc)(win, puterProxy);
new Function('window', 'puter', src)(win, puterProxy);
const I = win.__viewImageInternals;
const tool = win.tools.find((t) => t.function.name === 'ViewImage');
check('tool registered with the internals exposed', !!tool && typeof I.sniffImageType === 'function');

// --- Content sniffing --------------------------------------------------------
const PNG = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
const JPEG = [0xFF, 0xD8, 0xFF, 0xE0];
const GIF = [...Buffer.from('GIF89a')];
const WEBP = [...Buffer.from('RIFF'), 1, 2, 3, 4, ...Buffer.from('WEBPVP8 ')];
const AVIF = [0, 0, 0, 0x1C, ...Buffer.from('ftypavif')];
check('sniffs PNG', I.sniffImageType(Uint8Array.from(PNG)) === 'image/png');
check('sniffs JPEG', I.sniffImageType(Uint8Array.from(JPEG)) === 'image/jpeg');
check('sniffs GIF', I.sniffImageType(Uint8Array.from(GIF)) === 'image/gif');
check('sniffs WebP', I.sniffImageType(Uint8Array.from(WEBP)) === 'image/webp');
check('a RIFF that is not WebP (e.g. WAV) is not an image', I.sniffImageType(Uint8Array.from([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WAVE')])) === null);
check('AVIF is not one of the API\'s formats', I.sniffImageType(Uint8Array.from(AVIF)) === null);
check('empty input is not an image', I.sniffImageType(new Uint8Array(0)) === null);
check('raw byte cap leaves the base64 payload under the 5MB limit', I.VISION_MAX_BYTES * 4 / 3 < 5 * 1024 * 1024);

// --- The tool, end to end ------------------------------------------------------
globalThis.FileReader = class {
    readAsDataURL(blob) {
        blob.arrayBuffer().then((buf) => {
            this.result = 'data:x;base64,' + Buffer.from(buf).toString('base64');
            this.onload();
        });
    }
};
// Decoding is stubbed per scenario: `decodes` false = the browser can't read it.
function stubBrowser({ decodes = true, width = 800, height = 600 } = {}) {
    globalThis.createImageBitmap = async () => {
        if (!decodes) throw new Error('decode failed');
        return { width, height, close() {} };
    };
    globalThis.document = {
        createElement: () => ({
            width: 0, height: 0,
            getContext: () => ({ drawImage() {} }),
            toBlob(cb, type) { cb(new Blob([Uint8Array.from(type === 'image/png' ? PNG : JPEG)], { type })); },
        }),
    };
}
async function run(name, bytes, opts) {
    stubBrowser(opts);
    const blob = new Blob([bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes)]);
    globalThis.puter = { fs: { read: async () => blob } };
    try { return { ok: true, res: await tool.exec({ path: '/u/AppData/app/c1/assets/' + name }, { appDir: '/u/AppData/app/c1' }) }; }
    catch (e) { return { ok: false, err: e }; }
}
const mediaOf = (r) => r.ok && r.res.__contentBlocks[1] && r.res.__contentBlocks[1].source.media_type;

{
    const r = await run('photo.png', [...PNG, 1, 2, 3]);
    check('a real PNG is shown as image/png', mediaOf(r) === 'image/png', JSON.stringify(r.err?.message));
}
{
    const r = await run('photo.png', [...WEBP, 1, 2, 3]);
    check('WebP bytes behind a .png name are labelled image/webp, not by the extension', mediaOf(r) === 'image/webp', JSON.stringify(r.err?.message || mediaOf(r)));
}
{
    const r = await run('hero.jpg', [...PNG, 9, 9]);
    check('PNG bytes behind a .jpg name are labelled image/png', mediaOf(r) === 'image/png');
}
{
    const r = await run('pic.png', [...AVIF, 7, 7], { decodes: true });
    check('decodable bytes in a format the API won\'t take are re-encoded to PNG/JPEG',
        r.ok && ['image/png', 'image/jpeg'].includes(mediaOf(r)), JSON.stringify(r.err?.message));
    check('… and the caption doesn\'t claim a resize that didn\'t happen', r.ok && !/downscaled/.test(r.res.__contentBlocks[0].text));
}
{
    const r = await run('pic.png', [...AVIF, 7, 7], { decodes: false });
    check('undecodable non-image bytes are refused before they reach the history', !r.ok && /can't be viewed/.test(r.err.message));
}
{
    const r = await run('broken.png', [...PNG, 0, 0], { decodes: false });
    check('a corrupt image (valid header, won\'t decode) is refused too', !r.ok && /can't be viewed/.test(r.err.message));
}
{
    const r = await run('big.png', [...PNG, 1], { width: 4000, height: 3000 });
    check('an oversized image is still downscaled, with a caption saying so',
        r.ok && /downscaled from 4000×3000/.test(r.res.__contentBlocks[0].text));
}

// --- SVG source is capped like ReadTextFile -----------------------------------
{
    const huge = '<svg xmlns="http://www.w3.org/2000/svg">' + '<path d="M0 0L1 1"/>'.repeat(200000) + '</svg>';
    const r = await run('art.svg', new TextEncoder().encode(huge));
    const text = r.ok ? r.res.__contentBlocks[0].text : '';
    check('a multi-megabyte SVG is truncated to the ReadTextFile cap',
        r.ok && text.length < win.READ_TEXT_FILE_MAX_CHARS + 1000 && /truncated: this SVG is/.test(text),
        `length ${text.length}`);
}
{
    const small = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="4"/></svg>';
    const r = await run('icon.svg', new TextEncoder().encode(small));
    check('a normal SVG is returned whole', r.ok && r.res.__contentBlocks[0].text.endsWith(small));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll view-image checks passed.');
