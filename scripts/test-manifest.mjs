import fs from 'node:fs';

// ---- Regression guard for installable generated apps (web app manifest) -----
// Making a generated app installable spans five coupled pieces that can drift:
//   1. The pure generator (src/js/manifest.js): the manifest JSON, the meta it
//      derives from the app's own HTML, and the idempotent <head> block. Getting
//      the block wrong is the expensive failure — it is written back into user
//      files on EVERY preview refresh, so a non-idempotent stamp would grow the
//      page without bound and a bad "already stamped?" test would duplicate tags.
//   2. The flag (src/js/helpers.js FEATURE_FLAGS.webManifest), which must gate
//      both the generator and the prompt rule, or the model is told to write an
//      icon.svg for a feature that no longer consumes it.
//   3. The prompt rule (src/js/prompt.js): asks for icon.svg + theme-color and
//      forbids hand-written manifests/service workers.
//   4. The hook (src/js/ui.js): must run inside the preview refresh BEFORE
//      applyPreviewCacheBust, so the tags it writes get cache-bust tokens and
//      ship with the same origin re-sync.
//   5. The build (vite.config.js): the module has to be in SCRIPTS or none of
//      the above exists at runtime.
// Everything here runs the real production bytes.

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const manifestSrc = read('../src/js/manifest.js');
const helpersSrc = read('../src/js/helpers.js');
const promptSrc = read('../src/js/prompt.js');
const uiSrc = read('../src/js/ui.js');
const versionsSrc = read('../src/js/versions.js');
const viteSrc = read('../vite.config.js');

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

// manifest.js is a classic browser-global script. Its DOM work lives inside
// functions, so a bare window is enough to exercise the pure half.
function loadModule(flags) {
    const window = { FEATURE_FLAGS: flags || { webManifest: true } };
    new Function('window', manifestSrc)(window);
    return window;
}
const W = loadModule();

check('module defines the pure API',
    typeof W.deriveManifestMeta === 'function' &&
    typeof W.buildManifestJson === 'function' &&
    typeof W.stampManifestTags === 'function' &&
    typeof W.normalizeSvgForRaster === 'function' &&
    typeof W.ensureAppManifest === 'function');

// --- 1. deriving identity from the app's own HTML ---------------------------

const PAGE = `<!DOCTYPE html>
<html><head>
<title>TaskFlow &mdash; Simple task management</title>
<meta name="description" content="Plan your day and check things off.">
<meta content="#2563eb" name="theme-color">
</head><body><h1>hi</h1></body></html>`;

const meta = W.deriveManifestMeta(PAGE, 'Untitled project');
check('name comes from <title>', meta.name === 'TaskFlow — Simple task management');
check('short_name is the lead segment', meta.shortName === 'TaskFlow');
check('description comes from the meta tag', meta.description === 'Plan your day and check things off.');
check('theme color is read in either attribute order', meta.themeColor === '#2563eb');
check('background color defaults to the theme color', meta.backgroundColor === '#2563eb');
check('hasThemeColorTag is true when the page declares one', meta.hasThemeColorTag === true);

const bare = W.deriveManifestMeta('<html><head></head><body></body></html>', 'My Project');
check('falls back to the project title', bare.name === 'My Project');
check('falls back to a safe theme color', bare.themeColor === '#ffffff');
check('no theme tag → hasThemeColorTag false', bare.hasThemeColorTag === false);
check('empty everything still yields a name', W.deriveManifestMeta('', '').name === 'App');

check('entities in the title are decoded',
    W.deriveManifestMeta('<head><title>Ben &amp; Jerry&#39;s</title></head>').name === "Ben & Jerry's");
check('a junk theme color is rejected, not passed through',
    W.deriveManifestMeta('<head><meta name="theme-color" content="javascript:alert(1)"></head>').themeColor === '#ffffff');
check('a long single-word title is truncated for short_name',
    W.deriveManifestMeta('<head><title>Supercalifragilistic</title></head>').shortName.length <= 12);

// Astral characters (models brand apps with mathematical alphanumerics like
// "𝕹𝖔𝖙𝖊𝖘") must never be cut mid-surrogate-pair, and the monogram must be a
// whole code point — a lone surrogate renders as � in the install dialog and
// as a broken-glyph box baked into every icon.
const loneSurrogate = (s) => {
    const c = s.charCodeAt(s.length - 1);
    return c >= 0xd800 && c <= 0xdbff;
};
check('the monogram is a whole code point, not half a surrogate pair',
    W.monogramLetter('𝕹𝖔𝖙𝖊𝖘') === '𝕹' && W.monogramLetter('𝕹𝖔𝖙𝖊𝖘').length === 2);
const astral = W.deriveManifestMeta('<head><title>X𝕹𝖔𝖙𝖊𝖘𝕬𝖓𝖉𝕸𝖔𝖗𝖊</title></head>', '');
check('short_name truncation never ends mid-surrogate', !loneSurrogate(astral.shortName));
const longAstral = W.deriveManifestMeta('<head><title>' + '𝕬'.repeat(200) + '</title></head>', '');
check('name truncation never ends mid-surrogate', !loneSurrogate(longAstral.name));

// --- 2. the manifest document -----------------------------------------------

const json = W.buildManifestJson(meta);
let parsed;
try { parsed = JSON.parse(json); } catch (e) { parsed = null; }
check('manifest is valid JSON', !!parsed);
check('manifest carries the install-critical fields',
    parsed && parsed.name && parsed.short_name && parsed.start_url && parsed.scope &&
    parsed.display === 'standalone' && parsed.theme_color && parsed.background_color);
check('urls are relative so draft, published and downloaded copies all work',
    parsed.id === './' && parsed.start_url === './' && parsed.scope === './' &&
    parsed.icons.every((i) => !i.src.startsWith('/') && !/^[a-z]+:/i.test(i.src)));
check('has a 192 and a 512 PNG (Chrome install criteria)',
    parsed.icons.some((i) => i.sizes === '192x192' && i.type === 'image/png') &&
    parsed.icons.some((i) => i.sizes === '512x512' && i.type === 'image/png'));
check('has a maskable icon (Android adaptive mask)',
    parsed.icons.some((i) => i.purpose === 'maskable'));
check('description is omitted rather than emitted empty',
    !('description' in JSON.parse(W.buildManifestJson(bare))));

// --- 3. the <head> block: idempotence is the whole ballgame -----------------

const once = W.stampManifestTags(PAGE, meta);
check('block is injected', once && once.includes('rel="manifest"'));
check('block goes inside <head>', once.indexOf('rel="manifest"') < once.indexOf('</head>'));
check('links the apple-touch-icon (iOS ignores manifest icons)',
    once.includes('rel="apple-touch-icon"'));
check('declares mobile-web-app-capable', once.includes('name="mobile-web-app-capable"'));
check('gives the page a tab icon (generated apps ship without one)',
    once.includes('rel="icon"') && once.includes('icons/icon-192.png'));
// An app that brought its own favicon keeps it — and rel="apple-touch-icon",
// including the one in our own block, must never be mistaken for one.
const ownIcon = '<html><head><title>Mine</title><link rel="icon" href="favicon.svg"></head><body></body></html>';
const ownIconMeta = W.deriveManifestMeta(ownIcon, '');
check("an app's own favicon is detected", ownIconMeta.hasIconLink === true);
check("an app's own favicon is not duplicated",
    (W.stampManifestTags(ownIcon, ownIconMeta).match(/rel="icon"/g) || []).length === 1);
check('apple-touch-icon does not count as a favicon',
    W.deriveManifestMeta('<head><link rel="apple-touch-icon" href="x.png"></head>').hasIconLink === false);
check('legacy rel="shortcut icon" counts',
    W.deriveManifestMeta('<head><link rel="shortcut icon" href="x.ico"></head>').hasIconLink === true);
check('our injected favicon is not mistaken for the page\'s own (fixed point)',
    W.deriveManifestMeta(once, '').hasIconLink === false &&
    W.stampManifestTags(once, W.deriveManifestMeta(once, 'x')) === once);
check('does not add a second theme-color when the page has one',
    (once.match(/name="theme-color"/g) || []).length === 1);

const twice = W.stampManifestTags(once, meta);
check('stamping twice is byte-identical (runs on every preview refresh)', twice === once);

// hrefs must be RELATIVE — like the manifest's own URLs, and for the same
// reason: a downloaded project rehosted under a subpath (GitHub Pages /repo/)
// or opened from disk must keep a working manifest link and tab icon. A root
// page gets bare names; a nested page climbs back with the given prefix.
check('block hrefs are relative, not root-absolute',
    once.includes('href="manifest.json"') && !once.includes('href="/'));
const deep = W.stampManifestTags(PAGE, meta, '../');
check('a nested page climbs back to the root',
    deep.includes('href="../manifest.json"') && deep.includes('href="../icons/apple-touch-icon-180.png"'));
check('depth-stamping is idempotent too', W.stampManifestTags(deep, meta, '../') === deep);

// A rename must REPLACE the block, never append a second one.
const renamed = W.stampManifestTags(once, Object.assign({}, meta, { name: 'Renamed', shortName: 'Renamed' }));
check('a rename replaces the block instead of appending',
    (renamed.match(/rel="manifest"/g) || []).length === 1 &&
    renamed.includes('content="Renamed"') && !renamed.includes('content="TaskFlow"'));

// applyPreviewCacheBust stamps ?__pcb= onto our own <link> hrefs after we write
// them. The next refresh must still recognize its own block.
const busted = once
    .replace('href="manifest.json"', 'href="manifest.json?__pcb=1712"')
    .replace('href="icons/apple-touch-icon-180.png"', 'href="icons/apple-touch-icon-180.png?__pcb=1712"');
const afterBust = W.stampManifestTags(busted, meta);
check('a cache-busted block is recognized and replaced, not duplicated',
    (afterBust.match(/rel="manifest"/g) || []).length === 1 &&
    !afterBust.includes('__pcb'));

// Opt-outs.
check('a page with its own manifest link is left alone',
    W.stampManifestTags('<head><link rel="manifest" href="/mine.webmanifest"></head>', meta) === null);
check('a page with no <head> is left alone',
    W.stampManifestTags('<div>fragment</div>', meta) === null);
check('hasForeignManifestLink ignores our own generated block',
    W.hasForeignManifestLink(once) === false);

// Missing </head> (browsers accept it, so we must too).
const noClose = W.stampManifestTags('<html><head><title>X</title><body>y</body></html>', meta);
check('injects after <head> when </head> is absent', !!noClose && noClose.includes('rel="manifest"'));

// A page with no theme-color gets ours.
const NO_THEME_PAGE = '<html><head><title>X</title></head><body></body></html>';
const noTheme = W.stampManifestTags(NO_THEME_PAGE, W.deriveManifestMeta(NO_THEME_PAGE, 'My Project'));
check('supplies a theme-color when the page has none', noTheme.includes('name="theme-color"'));

// The flip-flop guard, run exactly the way the real loop runs: derive from the
// file on disk, stamp, repeat. The theme-color we inject must NOT read back as
// "the page already declares one" — if it did, the next pass would drop the
// tag, the pass after would re-add it, and the user's HTML would be rewritten
// on every single turn, forever.
function refreshCycle(page, fallback) {
    return W.stampManifestTags(page, W.deriveManifestMeta(page, fallback));
}
check("our injected theme-color is not mistaken for the page's own",
    W.deriveManifestMeta(noTheme, 'My Project').hasThemeColorTag === false);
check('derive → stamp is a fixed point for a page with no theme-color',
    refreshCycle(noTheme, 'My Project') === noTheme &&
    refreshCycle(refreshCycle(noTheme, 'My Project'), 'My Project') === noTheme);
check('derive → stamp is a fixed point for a page with a theme-color',
    refreshCycle(once, 'ignored') === once);

// Attribute injection through the app title.
const evil = W.deriveManifestMeta('<head><title>Ev"il&gt;<script>x</title></head>');
const evilOut = W.stampManifestTags('<head></head>', evil);
check('the short name is attribute-escaped',
    evilOut.includes('&quot;') && !/content="Ev"il/.test(evilOut));

// --- 4. SVG normalization for rasterizing ------------------------------------

const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
const norm = W.normalizeSvgForRaster(svg, 512);
check('intrinsic size is added (Firefox draws nothing without it)',
    norm.includes('width="512"') && norm.includes('height="512"'));
check('the drawing itself is preserved', norm.includes('<path d="M0 0h24v24H0z"/>'));
check('an existing width/height is replaced, not duplicated',
    (W.normalizeSvgForRaster('<svg width="1" height="1" viewBox="0 0 8 8"><rect/></svg>', 192)
        .match(/width=/g) || []).length === 1);
// style beats attributes for intrinsic sizing, so root style sizing must be
// stripped too — otherwise the art decodes at the style's size and drawImage
// upscales it into a blurry icon.
const styled = W.normalizeSvgForRaster(
    '<svg style="width:24px;height:24px;color:red" viewBox="0 0 8 8"><rect/></svg>', 512);
check('style-based sizing on the root is stripped',
    !/style="[^"]*width/.test(styled) && styled.includes('width="512"'));
check('non-sizing style declarations survive', styled.includes('color:red'));
check('inner-element styles are untouched',
    W.normalizeSvgForRaster('<svg viewBox="0 0 8 8"><rect style="width:4px"/></svg>', 512)
        .includes('<rect style="width:4px"/>'));
check('an SVG with no viewBox is refused (nothing to scale into)',
    W.normalizeSvgForRaster('<svg><rect/></svg>', 192) === null);
check('non-SVG input is refused', W.normalizeSvgForRaster('not an svg', 192) === null);

// --- 5. the flag gates the generator ----------------------------------------

const off = loadModule({ webManifest: false });
let touchedFs = false;
globalThis.puter = { fs: { stat: () => { touchedFs = true; return Promise.reject(new Error('x')); } } };
await off.ensureAppManifest('/u/AppData/app/chat-1', {});
check('flag off → generator does no IO at all', touchedFs === false);
// Flag on but no puter/document (this Node process): must return quietly, never throw.
let threw = false;
try { await W.ensureAppManifest('/u/AppData/app/chat-1', {}); } catch (e) { threw = true; }
check('generator never throws into its caller (the preview refresh)', threw === false);
delete globalThis.puter;

// --- 6. the real loop, end to end -------------------------------------------
// The pure checks above can't see the control flow that decides WHEN to write,
// and that is where the expensive mistakes live: this code rewrites files in the
// user's project on every single preview refresh. So drive the real
// ensureAppManifest against a fake puter.fs, the REAL helpers.js (write locks,
// the HTML walker, and stripPreviewCacheBust), and the real cache-buster that
// runs immediately after it in the refresh.

const fullWindow = { FEATURE_FLAGS: { webManifest: true } };
new Function('window', helpersSrc)(fullWindow);
new Function('window', manifestSrc)(fullWindow);
// A canvas-less document: icon rendering bails to null, which is what we want —
// these cases are about file churn, not pixels (the raster path is exercised in
// a browser separately).
globalThis.document = { createElement: () => ({ getContext: () => null }) };
globalThis.window = fullWindow;

const APP = '/u/AppData/app/chat-1';
const APP_PAGE = '<!DOCTYPE html>\n<html>\n<head>\n    <title>Notes</title>\n' +
    '    <meta name="theme-color" content="#0f172a">\n' +
    '    <link rel="stylesheet" href="styles.css">\n</head>\n<body>hi</body>\n</html>\n';
const ICONS = {
    [APP + '/icons/icon-192.png']: 'png', [APP + '/icons/icon-512.png']: 'png',
    [APP + '/icons/maskable-512.png']: 'png', [APP + '/icons/apple-touch-icon-180.png']: 'png',
};

function mountFs(seed) {
    const files = Object.assign({}, seed);
    const mt = {};
    let clock = 100;
    for (const k of Object.keys(files)) mt[k] = ++clock;
    const writes = [];
    // writeIcons mkdirs icons/ before rendering anything, so this is a reliable
    // "did we enter icon generation at all" probe (the fake DOM below can't
    // actually produce PNGs).
    const mkdirs = [];
    globalThis.puter = { fs: {
        stat: async (p) => {
            if (!(p in files)) throw new Error('not found');
            return { modified: mt[p], size: String(files[p]).length, is_dir: false };
        },
        read: async (p) => ({ text: async () => {
            if (!(p in files)) throw new Error('not found');
            return files[p];
        } }),
        readdir: async (dir) => {
            const out = new Map();
            for (const p of Object.keys(files)) {
                if (!p.startsWith(dir + '/')) continue;
                const rest = p.slice(dir.length + 1);
                out.set(rest.split('/')[0], { name: rest.split('/')[0], is_dir: rest.includes('/') });
            }
            return [...out.values()];
        },
        mkdir: async (d) => { mkdirs.push(d); },
        write: async (p, d) => { files[p] = d; mt[p] = ++clock; writes.push(p); },
    } };
    fullWindow.invalidateAppManifestCache();
    return { files, writes, mkdirs, touch: (p) => { mt[p] = ++clock; }, mtime: (p) => mt[p], setMtime: (p, v) => { mt[p] = v; } };
}

// A whole refresh cycle, in the order ui.js runs it.
async function refresh(app) {
    await fullWindow.ensureAppManifest(app, { fallbackName: 'Fallback' });
    await fullWindow.applyPreviewCacheBust(app);
}

// The steady state: nothing about the app changed, so a refresh must touch
// nothing. The trap is applyPreviewCacheBust stamping ?__pcb= onto the links we
// just wrote — if the next pass doesn't look past those tokens it rewrites every
// HTML file, forever, on every refresh.
{
    const m = mountFs(Object.assign({
        [APP + '/index.html']: APP_PAGE,
        [APP + '/styles.css']: 'body{}',
        // A nested page too: its ../-prefixed hrefs and the tokens the
        // cache-buster stamps onto them must survive the round trip without
        // tricking the next pass into a rewrite.
        [APP + '/pages/about.html']: '<html><head><title>About</title></head><body>a</body></html>',
    }, ICONS));
    await refresh(APP);
    check('first refresh stamps the page', m.files[APP + '/index.html'].includes('rel="manifest"'));
    check('the cache-buster tokenizes our own links',
        m.files[APP + '/index.html'].includes('manifest.json?__pcb='));
    check('nested links get tokens too',
        m.files[APP + '/pages/about.html'].includes('../manifest.json?__pcb='));
    fullWindow.invalidateAppManifestCache(); // a page reload: only disk state remains
    m.writes.length = 0;
    await fullWindow.ensureAppManifest(APP, { fallbackName: 'Fallback' });
    check('a no-op refresh writes nothing', m.writes.length === 0);
}

// The model rewriting a page it already stamped (a plain `write` of index.html)
// drops the block. Nothing about the app's identity changed, so the cheap
// "skip, nothing changed" path must NOT be what decides this — otherwise the app
// silently loses its manifest, icons and iOS tags for the rest of the session.
{
    const m = mountFs(Object.assign({ [APP + '/index.html']: APP_PAGE }, ICONS));
    await refresh(APP);
    m.files[APP + '/index.html'] = APP_PAGE.replace('<body>hi</body>', '<body>hello</body>');
    m.touch(APP + '/index.html');
    await refresh(APP);
    check('a page the model rewrote is re-stamped in the same session',
        m.files[APP + '/index.html'].includes('rel="manifest"'));
}

// Attachments are the user's own files, saved verbatim under assets/. Injecting
// our block into an uploaded .html would silently alter what they uploaded.
{
    const m = mountFs(Object.assign({
        [APP + '/index.html']: APP_PAGE,
        [APP + '/assets/uploaded.html']: '<html><head><title>Upload</title></head><body>x</body></html>',
    }, ICONS));
    await refresh(APP);
    check('attached HTML under assets/ is left untouched',
        !m.files[APP + '/assets/uploaded.html'].includes('puter-pwa'));
}

// Multi-page apps: every page carries the same identity, and a nested page's
// hrefs climb back to the app root so they resolve from its own directory.
{
    const m = mountFs(Object.assign({
        [APP + '/index.html']: APP_PAGE,
        [APP + '/pages/about.html']: '<html><head><title>About</title></head><body>a</body></html>',
    }, ICONS));
    await refresh(APP);
    check('sub-pages are stamped with the entry page\'s identity',
        m.files[APP + '/pages/about.html'].includes('content="Notes"'));
    check('sub-page hrefs climb back to the root',
        m.files[APP + '/pages/about.html'].includes('href="../manifest.json'));
    check('root-page hrefs stay bare',
        m.files[APP + '/index.html'].includes('href="manifest.json'));
}

// Icons are expensive to produce and end up in every version snapshot, so they
// must only be re-rendered when something they actually depend on moves — the
// art, the plate color, or (monogram only) the app's initial. Editing a tagline
// must not touch them.
{
    const m = mountFs(Object.assign({ [APP + '/index.html']: APP_PAGE }, ICONS));
    await refresh(APP);
    m.files[APP + '/index.html'] = APP_PAGE.replace('<title>Notes</title>',
        '<title>Notes</title>\n    <meta name="description" content="A new tagline.">');
    m.touch(APP + '/index.html');
    m.mkdirs.length = 0;
    await refresh(APP);
    check('the manifest picks up a changed description',
        m.files[APP + '/manifest.json'].includes('A new tagline.'));
    check('a description edit does not re-render the icons', m.mkdirs.length === 0);
}

// ...but a change the icons DO depend on must re-render them.
{
    const m = mountFs(Object.assign({ [APP + '/index.html']: APP_PAGE }, ICONS));
    await refresh(APP);
    m.files[APP + '/index.html'] = APP_PAGE.replace('#0f172a', '#b91c1c');
    m.touch(APP + '/index.html');
    m.mkdirs.length = 0;
    await refresh(APP);
    check('a theme-color change re-renders the icons', m.mkdirs.length > 0);
}
{
    const m = mountFs(Object.assign({ [APP + '/index.html']: APP_PAGE, [APP + '/icon.svg']: '<svg viewBox="0 0 8 8"><rect width="8" height="8"/></svg>' }, ICONS));
    await refresh(APP);
    m.files[APP + '/icon.svg'] = '<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="4"/></svg>';
    m.touch(APP + '/icon.svg');
    m.mkdirs.length = 0;
    await refresh(APP);
    check('a redrawn icon.svg re-renders the icons', m.mkdirs.length > 0);
}
// Timestamps are whole seconds, and the model routinely writes icon.svg in the
// same second the first refresh painted the monogram PNGs. Equal must still
// count as "the art is at least as new as the icons" — a strict comparison
// left the app shipping the monogram until something else about it changed.
{
    const m = mountFs(Object.assign({ [APP + '/index.html']: APP_PAGE }, ICONS));
    await refresh(APP);
    m.files[APP + '/icon.svg'] = '<svg viewBox="0 0 8 8"><circle cx="4" cy="4" r="4"/></svg>';
    const oldestIcon = Math.min(...Object.keys(ICONS).map((p) => m.mtime(p)));
    m.setMtime(APP + '/icon.svg', oldestIcon);
    m.mkdirs.length = 0;
    fullWindow.invalidateAppManifestCache();
    await refresh(APP);
    check('an icon.svg written in the same second as the icons still re-renders them', m.mkdirs.length > 0);
}

// The block finder must stay linear. Its regex predecessor's leading
// `[ \t]*\r?\n?[ \t]*` backtracked cubically inside whitespace runs, and a <pre>
// holding a padded fixed-width table (ordinary model output: 200 lines × 300
// spaces) cost over a second per pass, several passes per preview refresh.
{
    const page = '<html><head><title>T</title></head><body><pre>' +
        ('x' + ' '.repeat(300) + 'y\n').repeat(200) + '</pre></body></html>';
    const t0 = Date.now();
    const stamped = fullWindow.stampManifestTags(page, { name: 'T', shortName: 'T', description: '', themeColor: '#123456', backgroundColor: '#ffffff', startUrl: './' }, '');
    const restamped = fullWindow.stampManifestTags(stamped, { name: 'T', shortName: 'T', description: '', themeColor: '#123456', backgroundColor: '#ffffff', startUrl: './' }, '');
    fullWindow.hasForeignManifestLink(stamped);
    fullWindow.deriveManifestMeta(stamped, 'T');
    const ms = Date.now() - t0;
    check('a page full of padded whitespace stamps in linear time (' + ms + 'ms)', ms < 250);
    check('… and is still a fixed point', restamped === stamped);
    check('… with the block placed once, before </head>', (stamped.match(/puter-pwa: generated/g) || []).length === 1 && stamped.indexOf('<!-- /puter-pwa -->') < stamped.indexOf('</head>'));
}

// A TRANSIENT read failure is not "no manifest". One flaky read of a
// manifest.json we did not write used to skip the foreign-file guard and
// overwrite it with ours; a flaky read of our own reverted its preserved fields.
// The pass must bail instead and leave every file alone.
{
    const foreign = JSON.stringify({ name: 'Their data', records: [1, 2, 3] });
    const m = mountFs(Object.assign({ [APP + '/index.html']: APP_PAGE, [APP + '/manifest.json']: foreign }, ICONS));
    const realRead = globalThis.puter.fs.read;
    globalThis.puter.fs.read = async (p) => {
        if (p === APP + '/manifest.json') throw new Error('Network request failed (503)');
        return realRead(p);
    };
    await refresh(APP);
    check('a transient read failure on manifest.json writes nothing', m.writes.length === 0);
    check('… the foreign manifest.json is untouched', m.files[APP + '/manifest.json'] === foreign);
    check('… and the page is not stamped', !m.files[APP + '/index.html'].includes('puter-pwa'));
    globalThis.puter.fs.read = realRead;
    await refresh(APP);
    check('once the read works, the foreign manifest is still respected (hands off)',
        m.files[APP + '/manifest.json'] === foreign && !m.files[APP + '/index.html'].includes('rel="manifest"'));
}
{
    // A flaky stat of icon.svg must not re-render the monogram over the real icon.
    const m = mountFs(Object.assign({ [APP + '/index.html']: APP_PAGE, [APP + '/icon.svg']: '<svg viewBox="0 0 8 8"><rect width="8" height="8"/></svg>' }, ICONS));
    await refresh(APP);
    const realStat = globalThis.puter.fs.stat;
    globalThis.puter.fs.stat = async (p) => {
        if (p === APP + '/icon.svg') throw new Error('Network request failed (503)');
        return realStat(p);
    };
    m.mkdirs.length = 0;
    fullWindow.invalidateAppManifestCache();
    await refresh(APP);
    check('a transient stat failure on icon.svg does not re-render the icons', m.mkdirs.length === 0);
    globalThis.puter.fs.stat = realStat;
}

// An app with its own PWA setup: hands off, completely.
{
    const own = '<html><head><title>Mine</title><link rel="manifest" href="/mine.json"></head><body></body></html>';
    const m = mountFs({ [APP + '/index.html']: own });
    await refresh(APP);
    check('an app with its own manifest link is never touched',
        m.files[APP + '/index.html'] === own && !(APP + '/manifest.json' in m.files));
}

// A project with no index.html: the entry pick must be deterministic (sorted,
// not readdir order — a flapping pick would rewrite the manifest, every block
// and the monogram on random refreshes), and start_url must point at the entry
// file, because "./" resolves to a directory the host cannot serve.
{
    // zeta.html is seeded FIRST so plain readdir order would pick it.
    const m = mountFs(Object.assign({
        [APP + '/zeta.html']: '<html><head><title>Zeta</title></head><body></body></html>',
        [APP + '/alpha.html']: '<html><head><title>Alpha</title></head><body></body></html>',
    }, ICONS));
    await refresh(APP);
    const mj = JSON.parse(m.files[APP + '/manifest.json']);
    check('entry pick is alphabetical, not readdir order', mj.name === 'Alpha');
    check('no-index start_url launches the entry file', mj.start_url === './alpha.html');
}
{
    const m = mountFs(Object.assign({ [APP + '/index.html']: APP_PAGE }, ICONS));
    await refresh(APP);
    check('index.html keeps the plain "./" start_url',
        JSON.parse(m.files[APP + '/manifest.json']).start_url === './');
}

// "manifest.json" is also an ordinary data filename. One we did not write must
// never be overwritten, and the block must not be stamped either — pointing a
// <link rel="manifest"> at somebody else's JSON is worse than doing nothing.
{
    const data = '{"assets":{"sprites":"sprites.png"},"version":3}';
    const m = mountFs({ [APP + '/index.html']: APP_PAGE, [APP + '/manifest.json']: data });
    await refresh(APP);
    check("an app's own manifest.json is never overwritten", m.files[APP + '/manifest.json'] === data);
    check('and its pages are not stamped either',
        !m.files[APP + '/index.html'].includes('puter-pwa'));
}
{
    // Unparseable: still not ours, still hands off.
    const m = mountFs({ [APP + '/index.html']: APP_PAGE, [APP + '/manifest.json']: '{oops' });
    await refresh(APP);
    check('an unreadable manifest.json is treated as foreign', m.files[APP + '/manifest.json'] === '{oops');
}

// Opting out must also take our block back OUT. Once a foreign manifest.json
// appears, a block stamped earlier keeps <link rel="manifest"> pointing the
// browser (and any install attempt) at the foreign file — stale and wrong.
// De-stamping must restore the page byte-identically to its pre-stamp self.
{
    const m = mountFs(Object.assign({ [APP + '/index.html']: APP_PAGE }, ICONS));
    await refresh(APP);
    check('block present before the takeover', m.files[APP + '/index.html'].includes('rel="manifest"'));
    m.files[APP + '/manifest.json'] = '{"assets":{"sprites":"s.png"}}';
    m.touch(APP + '/manifest.json');
    fullWindow.invalidateAppManifestCache();
    await refresh(APP);
    check('a foreign manifest.json takeover removes the stale block',
        !m.files[APP + '/index.html'].includes('puter-pwa'));
    check('de-stamping restores the page byte-identically',
        m.files[APP + '/index.html'] === APP_PAGE);
    check('the foreign file itself is untouched',
        m.files[APP + '/manifest.json'] === '{"assets":{"sprites":"s.png"}}');
}
// Same per page: one page adopts its own manifest link → only ITS block goes.
{
    const m = mountFs(Object.assign({
        [APP + '/index.html']: APP_PAGE,
        [APP + '/about.html']: '<html><head><title>About</title></head><body>a</body></html>',
    }, ICONS));
    await refresh(APP);
    m.files[APP + '/about.html'] = m.files[APP + '/about.html'].replace('<title>About</title>',
        '<title>About</title><link rel="manifest" href="mine.webmanifest">');
    m.touch(APP + '/about.html');
    await refresh(APP);
    check('a page that adopts its own manifest link loses our block',
        !m.files[APP + '/about.html'].includes('puter-pwa') &&
        m.files[APP + '/about.html'].includes('mine.webmanifest'));
    check('other pages keep theirs', m.files[APP + '/index.html'].includes('rel="manifest"'));
}
check('our own manifest is recognized', W.isGeneratedManifest(W.buildManifestJson(meta)) === true);
check('a foreign manifest is not', W.isGeneratedManifest('{"name":"x","icons":[]}') === false);

// Regeneration is a MERGE into our previous manifest, not a rebuild: fields we
// don't manage (orientation, display, shortcuts, …) may have been changed by
// the model at the user's explicit request, and a rebuild would silently
// revert them on the next title/theme change.
{
    const prev = JSON.parse(W.buildManifestJson(meta));
    prev.orientation = 'landscape';           // "make my app landscape-only"
    prev.shortcuts = [{ name: 'New note', url: './#new' }];
    const renamed = JSON.parse(W.buildManifestJson(
        Object.assign({}, meta, { name: 'Field Notes', shortName: 'Field Notes' }), prev));
    check('merge preserves user-adjusted unmanaged fields',
        renamed.orientation === 'landscape' && renamed.shortcuts?.[0]?.name === 'New note');
    check('merge still updates the managed identity fields',
        renamed.name === 'Field Notes' && renamed.generator === 'builder.puter.com');
    check('merge-regeneration is byte-stable',
        W.buildManifestJson(meta, prev) === W.buildManifestJson(meta, JSON.parse(W.buildManifestJson(meta, prev))));
}
// End to end: model edits orientation in our manifest, user renames the app —
// the rename lands, the orientation survives.
{
    const m = mountFs(Object.assign({ [APP + '/index.html']: APP_PAGE }, ICONS));
    await refresh(APP);
    const edited = JSON.parse(m.files[APP + '/manifest.json']);
    edited.orientation = 'landscape';
    m.files[APP + '/manifest.json'] = JSON.stringify(edited, null, 2) + '\n';
    m.touch(APP + '/manifest.json');
    m.files[APP + '/index.html'] = APP_PAGE.replace('<title>Notes</title>', '<title>Field Notes</title>');
    m.touch(APP + '/index.html');
    fullWindow.invalidateAppManifestCache();
    await refresh(APP);
    const final = JSON.parse(m.files[APP + '/manifest.json']);
    check('a rename does not revert a user-requested orientation',
        final.name === 'Field Notes' && final.orientation === 'landscape');
}

// --- 7. wiring ---------------------------------------------------------------

check('FEATURE_FLAGS.webManifest exists', /\bwebManifest:\s*(true|false)\b/.test(helpersSrc));
check('helpers exports the shared HTML walker',
    /window\.collectPreviewHtmlFiles\s*=\s*_collectPreviewHtmlFiles/.test(helpersSrc));

check('manifest.js is in the build', /'js\/manifest\.js'/.test(viteSrc));
check('manifest.js loads before ui.js (shared globals are load-ordered)',
    viteSrc.indexOf("'js/manifest.js'") < viteSrc.indexOf("'js/ui.js'"));

// The hook must live in the refresh, ahead of the cache-bust pass.
const refreshStart = uiSrc.indexOf('async function refreshPreviewWhenReady');
const refreshBody = uiSrc.slice(refreshStart, refreshStart + 4000);
check('the preview refresh calls ensureAppManifest',
    refreshStart !== -1 && /window\.ensureAppManifest\?\.\(/.test(refreshBody));
check('it runs BEFORE applyPreviewCacheBust (so the new tags get tokens)',
    refreshBody.indexOf('ensureAppManifest') < refreshBody.indexOf('applyPreviewCacheBust'));
check('version restore drops the generator cache',
    /invalidateAppManifestCache\?\.\(appDir\)/.test(versionsSrc));

// --- 8. the prompt rule ------------------------------------------------------

function renderPrompt(flags) {
    const window = { FEATURE_FLAGS: flags };
    const factory = new Function('window', promptSrc + '\n;return window.system_prompt;');
    return factory(window)({ username: 'tester' }, '/tester/AppData/app/chat-xyz');
}
const promptOn = renderPrompt({ webManifest: true, clickToEdit: true, createdWithBadge: true });
const promptOff = renderPrompt({ webManifest: false, clickToEdit: true, createdWithBadge: true });

check('flag on → the model is asked for an icon.svg', /icon\.svg/.test(promptOn));
check('flag on → the model is asked for a theme-color', /name="theme-color"/.test(promptOn));
check('flag on → hand-written manifests are forbidden',
    /NEVER hand-write a manifest\.json/.test(promptOn));
check('flag on → unsolicited service workers are forbidden',
    /service worker/i.test(promptOn));
check('flag off → the rule disappears entirely',
    !/icon\.svg/.test(promptOff) && !/manifest\.json/.test(promptOff));
check('the rule does not leak into todos/summaries',
    /Do not mention the manifest, the icon file, or installability/.test(promptOn));

// --- an orphaned start marker must never swallow the user's head -------------
// A page the model rewrote can be left with the START marker but no end
// marker. The block regex used to match from that orphan to the FIRST end
// marker on the next stamp — deleting the user's <title>, stylesheets and
// scripts in between. The body may no longer run through a second start.
{
    const meta = W.deriveManifestMeta('<html><head><title>T</title></head></html>', 'T');
    const orphan = '<html><head>\n<!-- puter-pwa: generated, do not edit -->\n<title>Keep me</title>\n<link rel="stylesheet" href="style.css">\n<script src="app.js"></script>\n</head><body></body></html>';
    const pass1 = W.stampManifestTags(orphan, meta, '');
    const pass2 = W.stampManifestTags(pass1, meta, '');
    check('orphaned start marker: the user\'s title/stylesheet/script survive a second stamp',
        pass2.includes('<title>Keep me</title>') && pass2.includes('style.css') && pass2.includes('app.js'));
    check('orphaned start marker: stamping is still a fixed point', pass2 === pass1);
    check('orphaned start marker: exactly one generated block', pass2.split('<!-- /puter-pwa -->').length === 2);
}
// --- a content value keeps the other quote character --------------------------
check("a description containing an apostrophe is read whole",
    W.deriveManifestMeta('<head><title>x</title><meta name="description" content="Bob\'s task list"></head>', 'x').description === "Bob's task list");
check("a single-quoted content value containing a double quote is read whole",
    W.deriveManifestMeta("<head><title>x</title><meta name='description' content='Say \"hi\" fast'></head>", 'x').description === 'Say "hi" fast');

console.log(failures ? `\n${failures} check(s) failed` : '\nall manifest checks passed');
process.exit(failures ? 1 : 0);
