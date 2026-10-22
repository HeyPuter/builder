import fs from 'node:fs';

// ---- Regression guard: a generation that couldn't be saved still downloads ---
// When saving a generation fails (storage full, say), the card shows what the
// provider handed back — for an image, a data: URL. Download then fell back to
// window.open(dataURL) and "Open in a new tab" linked to it: Chromium blocks a
// top-level data: navigation (nothing happened) and WebKit opened a blank tab.
// The image viewer's Download went the same way. The data: URL is now turned
// into a blob: URL once (released with the chat, like the reopen fallback's),
// used for the picture and Open, and Download saves it under its file name.
// (Download and Open were checked in Chromium and WebKit.)
//
// Runs the real runGeneration and download from src/js/media.js against stubs.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const helpersSrc = read('../src/js/helpers.js');
const mediaSrc = read('../src/js/media.js');

const PNG = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3]);
const DATA_URL = 'data:image/png;base64,' + PNG.toString('base64');

const win = { tools: [], FEATURE_FLAGS: {} };
const a = helpersSrc.indexOf('window.normalizePosixPath =');
const b = helpersSrc.indexOf('// ---- Per-path file-write serialization');
new Function('window', helpersSrc.slice(a, b))(win);
win.isAborted = (c) => !!(c && c.signal && c.signal.aborted);
win.isStaleTurn = () => false;
win.withFileLock = (p, fn) => fn();
win.track = () => {};
const opened = [];
win.open = (u) => { opened.push(u); return null; };
win.showToast = () => {};

const clicks = [];
const document = {
    contains: () => true,
    addEventListener() {},
    createElement: (tag) => ({ tag, click() { clicks.push({ href: this.href, download: this.download }); }, remove() {} }),
    body: { appendChild() {} },
};
const files = new Map();
const puter = {
    fs: {
        mkdir: async () => {},
        stat: async (p) => { if (!files.has(p)) throw new Error('not found'); return {}; },
        getReadURL: async (p) => 'https://read.example' + p,
        read: async (p) => { if (!files.has(p)) throw new Error('not found'); return files.get(p); },
    },
};
const chain = new Proxy(function () {}, { get: () => () => chain, apply: () => chain });
new Function('window', 'puter', '$', 'localStorage', 'document', 'console', mediaSrc)(
    win, puter, () => chain, { getItem: () => null }, document, { log() {}, warn() {}, error() {} });
const GM = win.GeneratedMedia;
const filled = [];
GM.pendingCard = () => ({});
GM.appendToChat = () => {};
GM.onPage = () => true;
GM.removeCard = () => {};
GM.fillCard = (c, o) => filled.push(o);
GM.saveFromSrc = async () => { throw new Error('Storage full'); };
const state = { appDir: '/u/AppData/app/chat1', currentChatId: 'chat1', abortController: new AbortController() };

// An image the provider returned as a data: URL, which couldn't be saved.
const r = await GM.runGeneration({ kind: 'image', ext: 'png', prompt: 'fox', state, generate: async () => ({ src: DATA_URL }) });
const shown = filled[0] || {};
check('the result says it was not saved', r.path === null && shown.path === null);
check('the card shows it from a blob: URL, not the data: URL', /^blob:/.test(shown.url || ''), String(shown.url).slice(0, 40));
if (/^blob:/.test(shown.url || '')) {
    const blob = await (await fetch(shown.url)).blob();
    check('…holding the image itself, typed', blob.type === 'image/png' && Buffer.from(await blob.arrayBuffer()).equals(PNG), blob.type);
}

// Download (the card's button and the image viewer's both call this).
opened.length = 0; clicks.length = 0;
await GM.download({ path: '', url: shown.url, filename: shown.filename });
check('Download saves it under its file name instead of opening a tab', clicks.length === 1 && clicks[0].href === shown.url
    && clicks[0].download === shown.filename && opened.length === 0, JSON.stringify({ clicks, opened }));

opened.length = 0; clicks.length = 0;
await GM.download({ path: '', url: DATA_URL, filename: 'x.png' });
check('a data: URL is saved too, never opened (Chromium blocks that)', clicks.length === 1 && clicks[0].download === 'x.png' && opened.length === 0);

// Unchanged: a saved file downloads from the file; a provider's web URL opens.
files.set('/m/saved.png', new Blob([PNG]));
opened.length = 0; clicks.length = 0;
await GM.download({ path: '/m/saved.png', url: 'https://read.example/m/saved.png', filename: 'saved.png' });
check('a saved file still downloads from the file', clicks.length === 1 && /^blob:/.test(clicks[0].href) && clicks[0].download === 'saved.png' && opened.length === 0);
opened.length = 0; clicks.length = 0;
await GM.download({ path: '', url: 'https://provider.example/tmp.png', filename: 'tmp.png' });
check('a provider web URL still opens in a tab', opened.join() === 'https://provider.example/tmp.png' && clicks.length === 0);

// The blob: URL goes when the chat is cleared.
GM.revokeDisplayURLs?.();
let released = false;
try { await fetch(shown.url); } catch (e) { released = true; }
check('the blob: URL is released when the chat box is cleared', released);

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll unsaved-media download checks passed.');
