import fs from 'node:fs';
import { makeDom } from './lib/mini-dom.mjs';

// ---- Regression guard: reopening a chat reuses its media read URLs -----------
// Every puter.fs.getReadURL is a stat plus a new 24-hour access token, and
// nothing reused them: each open of a chat minted one per generated file again
// (20 images: 20, 40, 60 tokens after three opens) — which is what runs into
// Puter's rate limit on that call. A read URL for a file in the chat's media
// folder (unique names, never overwritten) is now reused for the session while
// its token is fresh; attachments, which can be overwritten, still get a new
// one each time. A reused URL that fails to load is dropped and replaced.
//
// Runs the real loadChat prefetch (sliced out of app.js) and the real
// displayURL / fillCard (src/js/media.js, on a small DOM stand-in).

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const app = read('../src/js/app.js');
const mediaSrc = read('../src/js/media.js');
const load = app.slice(app.indexOf('async function loadChat('), app.indexOf('async function deleteChat('));
const a = load.indexOf('const mediaPaths = new Set();');
const b = load.indexOf('// Rebuild the chat display');
const m0 = app.indexOf('async function mapWithConcurrency(');
const mapSrc = app.slice(m0, app.indexOf('\n}\n', m0) + 2);
const h0 = app.indexOf('function mediaDisplayURL(');
if (a < 0 || b < 0 || h0 < 0 || h0 > m0) throw new Error('could not extract the media prefetch from loadChat');
const helperSrc = app.slice(h0, m0);

let now = Date.parse('2026-10-19T12:00:00Z');
const realNow = Date.now;
Date.now = () => now;

let tokens = 0;
let failNext = 0;
const puter = { fs: {
    getReadURL: async (p) => {
        if (failNext > 0) { failNext--; throw Object.assign(new Error('Too many requests.'), { code: 'too_many_requests' }); }
        tokens++;
        return `https://api.example/token-read?file=${encodeURIComponent(p)}&token=${tokens}`;
    },
    read: async () => new Blob([new Uint8Array([1, 2, 3])]),
} };

const { document, body, $ } = makeDom();
const win = { shouldAutoScroll: false };
new Function('window', '$', 'document', 'puter', 'localStorage', 'setInterval', 'clearInterval', 'requestAnimationFrame', mediaSrc)(
    win, $, document, puter, { getItem: () => null }, () => 1, () => {}, (fn) => fn(),
);
const GM = win.GeneratedMedia;
const box = document.createElement('div');
box.setAttribute('class', 'chat-box');
body.appendChild(box);

const MEDIA = '/u/AppData/app/.media/chat1';
const history = [
    { role: 'system', content: 's' },
    { role: 'user', content: [{ type: 'text', text: 'logos' },
        { type: 'image-ref', path: '/u/AppData/app/chat1/assets/logo.svg' },
        { type: 'image-ref', path: '/u/AppData/app/chat1/assets/icon.svg' }] },
    ...Array.from({ length: 20 }, (_, i) => ({ role: 'user', content: { type: 'tool_result', tool_use_id: 't' + i,
        content: JSON.stringify({ success: true, path: `${MEDIA}/image_${i}.png`, filename: `image_${i}.png` }) } })),
];
const openChat = new Function('window', 'puter', 'history', 'superseded', 'chat',
    helperSrc + mapSrc + '\nreturn (async () => {\n' + load.slice(a, b) + '\nreturn { readURLFor, revoke: revokeChatMediaBlobURLs };\n})();');

const counts = [];
let last = null;
for (let i = 0; i < 3; i++) {
    last = await openChat(win, puter, history, () => false, {});
    counts.push(tokens);
    last.revoke(); // the next open clears the chat box
}
console.log(`     access tokens minted after 1, 2, 3 opens: ${counts.join(', ')} (was 22, 44, 66)`);
check('the first open mints one token per file, as before', counts[0] === 22, String(counts[0]));
check('reopening reuses the generated files’ URLs (only the 2 attachments get new ones)', counts[1] === 24 && counts[2] === 26, counts.join());
const u0 = await last.readURLFor(`${MEDIA}/image_0.png`);
check('…and hands back the same URL', /token=\d+$/.test(u0) && Number(u0.split('token=')[1]) <= 22, u0);
const att = await last.readURLFor('/u/AppData/app/chat1/assets/logo.svg');
check('an attachment (can be overwritten) is never reused', Number(att.split('token=')[1]) > 24, att);

// Tokens last 24 hours: after 23 a new one is minted.
now += 23 * 60 * 60 * 1000 + 1000;
const before = tokens;
const fresh = await GM.displayURL(`${MEDIA}/image_0.png`);
check('a URL older than 23 hours is replaced', tokens === before + 1 && fresh !== u0);
check('…and the new one is reused after that', (await GM.displayURL(`${MEDIA}/image_0.png`)) === fresh && tokens === before + 1);

// A failure is never cached: the blob fallback is released with the chat.
failNext = 1;
const fallback = await GM.displayURL(`${MEDIA}/new.png`);
check('a rate-limited request falls back to a blob: URL', /^blob:/.test(fallback));
const retried = await GM.displayURL(`${MEDIA}/new.png`);
check('…which is not reused: the next open asks for a real URL again', /^https:/.test(retried), retried);

// A reused URL that no longer loads (token revoked) is dropped and replaced.
const stale = await GM.displayURL(`${MEDIA}/image_5.png`);
const $card = GM.renderSaved({ success: true, kind: 'image', prompt: 'a fox', path: `${MEDIA}/image_5.png`, filename: 'image_5.png' }, stale);
const img = $card.find('img.generated-media-el')[0];
img.fire('error');
await new Promise((r) => setTimeout(r, 0));
const now5 = img.getAttribute('src');
check('a cached URL that fails to load is replaced with a fresh one', now5 !== stale && /^https:/.test(now5), now5);
check('…for the link, Open and Download too', $card.find('.generated-media-open').attr('href') === now5
    && $card.find('.generated-media-link').attr('href') === now5 && $card.find('.generated-media-download').attr('data-url') === now5);
check('…and the stale URL is no longer handed out', (await GM.displayURL(`${MEDIA}/image_5.png`)) === now5);
const t = tokens;
img.fire('error');
await new Promise((r) => setTimeout(r, 0));
check('only once per card (no retry loop on a file that is really gone)', tokens === t);

Date.now = realNow;
if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll read-URL cache checks passed.');
