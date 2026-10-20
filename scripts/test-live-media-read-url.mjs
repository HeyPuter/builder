import fs from 'node:fs';

// ---- Regression guard: a live generation shows its saved file under a 429 ----
// Puter rate-limits getReadURL (the access token a read URL carries). A
// reopened chat already fell back to reading the file into a blob: URL, but a
// generation that had just finished did not: the card fell back to the
// provider's temporary URL (which expires), and a video saved with no
// provider URL got an empty player. Both now share the reopen fallback.
//
// Runs the real runGeneration and GenerateImage (src/js/media.js,
// src/tools/media/generate_image.js) against stubbed puter.ai / puter.fs, and
// the real loadChat helpers sliced out of app.js.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const helpersSrc = read('../src/js/helpers.js');
const mediaSrc = read('../src/js/media.js');
const imageSrc = read('../src/tools/media/generate_image.js');
const appSrc = read('../src/js/app.js');

const ROOT = '/u/AppData/app/chat1';
const win = { tools: [], FEATURE_FLAGS: {} };
const a = helpersSrc.indexOf('window.normalizePosixPath =');
const b = helpersSrc.indexOf('// ---- Per-path file-write serialization');
new Function('window', helpersSrc.slice(a, b))(win);
win.isAborted = (c) => !!(c && c.signal && c.signal.aborted);
win.isStaleTurn = () => false;
win.withFileLock = (p, fn) => fn();
win.track = () => {};

const existing = new Map();
let limited = true;
const puter = {
    ai: { txt2img: async (p, o) => { existing.set(o.puter_output_path, new Blob([new Uint8Array([0x89, 0x50, 0x4E, 0x47])])); return { src: 'https://provider.example/tmp.png' }; } },
    fs: {
        mkdir: async () => {},
        stat: async (p) => { if (!existing.has(p)) throw new Error('not found'); return {}; },
        getReadURL: async (p) => {
            if (limited) throw Object.assign(new Error('Too many requests.'), { code: 'too_many_requests' });
            return 'https://read.example' + p;
        },
        read: async (p) => { if (!existing.has(p)) throw new Error('not found'); return new Blob([await existing.get(p).arrayBuffer()]); },
        write: async (p, blob) => { existing.set(p, blob); },
    },
};
const chain = new Proxy(function () {}, { get: () => () => chain, apply: () => chain });
const $ = () => chain;
const run = (src) => new Function('window', 'puter', '$', 'localStorage', 'document', 'console', src)(
    win, puter, $, { getItem: () => null }, { contains: () => true, addEventListener() {} }, { log() {}, warn() {}, error() {} });
run(mediaSrc);
const GM = win.GeneratedMedia;
const filled = [];
GM.pendingCard = () => ({});
GM.appendToChat = () => {};
GM.onPage = () => true;
GM.removeCard = () => {};
GM.fillCard = (c, o) => filled.push(o);
run(imageSrc);
const state = { appDir: ROOT, currentChatId: 'chat1', abortController: new AbortController() };

// A video the provider saved itself (puter_output_path) with no URL returned.
const merged = await GM.runGeneration({ kind: 'video', ext: 'mp4', prompt: 'waves', state,
    generate: async (extra) => { await puter.fs.write(extra.puter_output_path, new Blob([new Uint8Array(8)])); return ''; } });
const mergeURL = filled[0] && filled[0].url;
check('a saved video with no provider URL still plays when its read URL is rate-limited', /^blob:/.test(mergeURL || ''), JSON.stringify(mergeURL));
if (/^blob:/.test(mergeURL || '')) {
    const blob = await (await fetch(mergeURL)).blob();
    check('…from the saved file, typed so Safari plays it', blob.type === 'video/mp4' && blob.size === 8, blob.type);
}
check('…and the result still points at the saved file', !!merged.path && filled[0].path === merged.path);

// A generated image: the saved copy, not the provider's temporary URL.
await win.tools.find(t => t.function.name === 'GenerateImage').exec({ prompt: 'fox' }, state);
const imgURL = filled[1] && filled[1].url;
check('a generated image shows its saved copy, not the provider URL that expires', /^blob:/.test(imgURL || ''), JSON.stringify(imgURL));

// Those blob: URLs are released with the chat, like a reopened chat's.
check('they are tracked with the reopened chat’s blob URLs', typeof GM.revokeDisplayURLs === 'function');
if (typeof GM.revokeDisplayURLs === 'function') {
    GM.revokeDisplayURLs();
    let gone = false;
    try { await fetch(imgURL); } catch (e) { gone = true; }
    check('…and released when the chat box is cleared', gone);
}

// No 429: a normal read URL, nothing to release.
limited = false;
filled.length = 0;
await win.tools.find(t => t.function.name === 'GenerateImage').exec({ prompt: 'cat' }, state);
check('without a rate limit the card gets the read URL as before', /^https:\/\/read\.example\//.test(filled[0] && filled[0].url), filled[0] && filled[0].url);

// loadChat and runGeneration go through the one helper.
check('loadChat uses the shared helper', /GeneratedMedia\.displayURL\(/.test(appSrc) && !/async function mediaDisplayURL[\s\S]{0,200}getReadURL/.test(appSrc));
const runGen = mediaSrc.slice(mediaSrc.indexOf('async function runGeneration('), mediaSrc.indexOf('async function videoFrameDataURL('));
check('runGeneration uses it too', runGen.includes('api.displayURL(path)') && !runGen.includes('getReadURL'));

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll live media read-URL checks passed.');
