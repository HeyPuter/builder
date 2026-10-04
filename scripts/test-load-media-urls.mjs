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

let inFlight = 0, maxInFlight = 0;
const resolved = [];
const puter = { fs: { getReadURL: async (p) => {
    inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 15));
    inFlight--;
    if (p.includes('missing')) throw new Error('not found');
    resolved.push(p);
    return 'https://read/' + p;
} } };
const run = new Function('puter', 'history', 'superseded', 'chat',
    mapSrc + '\nreturn (async () => {\n' + load.slice(a, b) + '\nreturn { readURLFor, mediaURLs };\n})();');

const history = [
    { role: 'system', content: 's' },
    { role: 'user', content: [{ type: 'text', text: 'icons' },
        ...Array.from({ length: 12 }, (_, i) => ({ type: 'image-ref', path: `/app/assets/icon${i}.svg` })),
        { type: 'image-ref', path: '/app/assets/has-thumb.png', thumb: 'data:image/png;base64,AA' },
        { type: 'image-ref', path: '/app/assets/missing.svg' }] },
    { role: 'user', content: [{ type: 'file', puter_path: '/legacy/old.png' }] },
    { role: 'user', content: { type: 'tool_result', tool_use_id: 't', content: JSON.stringify({ success: true, path: '/gen/img.png', filename: 'img.png' }) } },
];
const t0 = Date.now();
const { readURLFor, mediaURLs } = await run(puter, history, () => false, {});
const elapsed = Date.now() - t0;
check('every media path is resolved before the render loop', mediaURLs.size === 15, String(mediaURLs.size));
check('…in parallel (a few at a time), not one round trip after another', maxInFlight > 1 && maxInFlight <= 6 && elapsed < 15 * 15 * 0.6, `max ${maxInFlight}, ${elapsed}ms`);
check('an attachment with a saved thumbnail needs no URL', !resolved.includes('/app/assets/has-thumb.png'));
check('legacy attachments and generated media are covered too', resolved.includes('/legacy/old.png') && resolved.includes('/gen/img.png'));
check('the loop gets each URL back', (await readURLFor('/app/assets/icon3.svg')) === 'https://read//app/assets/icon3.svg');
let err = null;
try { await readURLFor('/app/assets/missing.svg'); } catch (e) { err = e; }
check('a path that failed still fails in the loop (placeholder shown, as before)', !!err);
check('the loop uses the prefetched URLs', !/await puter\.fs\.getReadURL\((item|toolResponse)\./.test(load) && (load.match(/await readURLFor\(/g) || []).length === 3);

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll load media-URL checks passed.');
