import fs from 'node:fs';

// ---- Regression guard: opening a project resolves media URLs in parallel ------
// loadChat renders attachments saved without a thumbnail (SVG, HEIC, older
// chats), legacy attachments and generated media from a read URL — a stat plus
// a token request each — and awaited them one at a time inside the render loop:
// forty dropped icons meant ~80 sequential round trips of loading skeleton on
// every open. They are now resolved up front, a few at a time.
//
// Runs the real prefetch block sliced out of loadChat against a slow stub.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const app = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const load = app.slice(app.indexOf('async function loadChat('), app.indexOf('async function deleteChat('));
const a = load.indexOf('const mediaPaths = new Set();');
const b = load.indexOf('// Rebuild the chat display');
if (a < 0 || b < 0) throw new Error('could not extract the media prefetch from loadChat');
const m0 = app.indexOf('async function mapWithConcurrency(');
const mapSrc = app.slice(m0, app.indexOf('\n}\n', m0) + 2);
// mediaDisplayURL and revokeChatMediaBlobURLs sit just above
// mapWithConcurrency; they hand over to the real GeneratedMedia.displayURL /
// revokeDisplayURLs (src/js/media.js, shared with live generations).
const h0 = app.indexOf('function mediaDisplayURL(');
if (h0 < 0 || h0 > m0) throw new Error('could not extract mediaDisplayURL');
const helperSrc = app.slice(h0, m0);
const mediaSrc = fs.readFileSync(new URL('../src/js/media.js', import.meta.url), 'utf8');

let inFlight = 0, maxInFlight = 0;
const resolved = [];
const tooMany = () => Object.assign(new Error('Too many requests.'), { code: 'too_many_requests' });
const puter = { fs: {
    getReadURL: async (p) => {
        inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((r) => setTimeout(r, 15));
        inFlight--;
        if (p.includes('missing')) throw new Error('not found');
        if (p.includes('limited')) throw tooMany();
        resolved.push(p);
        return 'https://read/' + p;
    },
    read: async (p) => {
        if (p.includes('missing')) throw new Error('not found');
        return new Blob([new Uint8Array([1, 2, 3])]);
    },
} };
const win = {};
const chain = new Proxy(function () {}, { get: () => () => chain, apply: () => chain });
new Function('window', 'puter', '$', 'localStorage', 'document', mediaSrc)(win, puter, () => chain, { getItem: () => null }, {});
const run = new Function('window', 'puter', 'history', 'superseded', 'chat',
    helperSrc + mapSrc + '\nreturn (async () => {\n' + load.slice(a, b) + '\nreturn { readURLFor, mediaURLs, revoke: revokeChatMediaBlobURLs };\n})();');

const history = [
    { role: 'system', content: 's' },
    { role: 'user', content: [{ type: 'text', text: 'icons' },
        ...Array.from({ length: 12 }, (_, i) => ({ type: 'image-ref', path: `/app/assets/icon${i}.svg` })),
        { type: 'image-ref', path: '/app/assets/has-thumb.png', thumb: 'data:image/png;base64,AA' },
        { type: 'image-ref', path: '/app/assets/missing.svg' }] },
    { role: 'user', content: [{ type: 'file', puter_path: '/legacy/old.png' }] },
    { role: 'user', content: { type: 'tool_result', tool_use_id: 't', content: JSON.stringify({ success: true, path: '/gen/img.png', filename: 'img.png' }) } },
    { role: 'user', content: { type: 'tool_result', tool_use_id: 'v', content: JSON.stringify({ success: true, kind: 'video', path: '/gen/limited.mp4', filename: 'limited.mp4' }) } },
];
const t0 = Date.now();
const { readURLFor, mediaURLs, revoke } = await run(win, puter, history, () => false, {});
const elapsed = Date.now() - t0;
check('every media path is resolved before the render loop', mediaURLs.size === 16, String(mediaURLs.size));
check('…in parallel (a few at a time), not one round trip after another', maxInFlight > 1 && maxInFlight <= 6 && elapsed < 15 * 15 * 0.6, `max ${maxInFlight}, ${elapsed}ms`);
check('an attachment with a saved thumbnail needs no URL', !resolved.includes('/app/assets/has-thumb.png'));
check('legacy attachments and generated media are covered too', resolved.includes('/legacy/old.png') && resolved.includes('/gen/img.png'));
check('the loop gets each URL back', (await readURLFor('/app/assets/icon3.svg')) === 'https://read//app/assets/icon3.svg');
let err = null;
try { await readURLFor('/app/assets/missing.svg'); } catch (e) { err = e; }
check('a path that failed still fails in the loop (placeholder shown, as before)', !!err);

// Puter rate-limits getReadURL (429 on /auth/create-access-token). Every
// generated image and video vanished from reopened chats while it did, though
// the files were there and plain reads worked. They now show from the file.
const limitedURL = await readURLFor('/gen/limited.mp4');
check('a rate-limited read URL falls back to reading the file', /^blob:/.test(limitedURL), limitedURL);
const blob = await (await fetch(limitedURL)).blob();
check('…typed by its extension, so a video plays and an SVG shows', blob.type === 'video/mp4', blob.type);
revoke();
let released = false;
try { await fetch(limitedURL); } catch (e) { released = true; }
check('clearing the chat releases those blob URLs', released);
check('loadChat and new_chat release them when they clear the chat box',
    (app.match(/\$\('\.chat-box'\)\.empty\(\);\n\s*revokeChatMediaBlobURLs\(\);/g) || []).length === 2);
// Four call sites: image refs, legacy files, a single generated file, and each
// image of a multi-image grid.
check('the loop uses the prefetched URLs', !/await puter\.fs\.getReadURL\((item|toolResponse|it)\./.test(load) && (load.match(/await readURLFor\(/g) || []).length === 4);

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll load media-URL checks passed.');
