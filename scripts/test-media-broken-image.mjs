import fs from 'node:fs';
import { makeDom, El } from './lib/mini-dom.mjs';

// ---- Regression guard: an image that fails to load says so, at full size ----
// When a generated image couldn't be loaded, its card collapsed to 65px: the
// placeholder's size was released, and the frame (line-height 0, so pictures
// sit flush) showed the browser's broken-image glyph and a clipped sliver of
// the alt text. It now keeps the box it would have had and says "Couldn't load
// this image", with Download and Open still in the bar. A saved image whose
// reused read URL has expired is retried once with a fresh one (refreshOnError):
// the card goes back to loading for that, and shows the picture if it loads.
// Checked in Playwright Chromium and WebKit at 1440 and 375, both themes (the
// card stays 422×469 / 355×402, as its placeholder).
//
// Runs the real fillCard / refreshOnError / holdSizeUntilLoaded from media.js
// on a small DOM stand-in.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const src = fs.readFileSync(new URL('../src/js/media.js', import.meta.url), 'utf8');
Object.defineProperty(El.prototype, 'complete', { get() { return this.tagName === 'IMG' && !this.getAttribute('src'); } });

const PATH = '/u/AppData/x/.media/chat1/cat.png';
function setup(urls) {
    const { document, body, $ } = makeDom();
    let n = 0;
    const puter = { fs: { getReadURL: async () => urls[Math.min(n++, urls.length - 1)] } };
    const win = { shouldAutoScroll: true };
    new Function('window', '$', 'document', 'puter', 'localStorage', 'setInterval', 'clearInterval', 'requestAnimationFrame', src)(
        win, $, document, puter, { getItem: () => null }, () => 1, () => {}, (fn) => fn(),
    );
    const box = document.createElement('div');
    box.setAttribute('class', 'chat-box');
    body.appendChild(box);
    const GM = win.GeneratedMedia;
    const $card = GM.pendingCard({ kind: 'image', prompt: 'a cat', ratio: '1:1' });
    GM.appendToChat($card);
    const fig = () => $card.find('.generated-media')[0];
    const note = () => $card.find('.generated-media-broken').text();
    return { GM, $card, fig, note };
}
const tick = () => new Promise(r => setTimeout(r, 0));

// --- A plain failure ---------------------------------------------------------
{
    const t = setup(['https://read.example/a']);
    t.GM.fillCard(t.$card, { kind: 'image', url: 'https://other.example/cat.png', prompt: 'a cat' });
    const img = t.$card.find('img')[0];
    img.fire('error');
    check('a failed image is no longer held as loading', !t.fig().hasClass('is-loading'), t.fig().className);
    check('…keeps its box, shown as broken', t.fig().hasClass('is-broken'), t.fig().className);
    check('…and says so', t.note() === "Couldn't load this image", JSON.stringify(t.note()));
    img.fire('error');
    check('…once', t.$card.find('.generated-media-broken').length === 1);
}

// --- A reused read URL that expired: retried with a fresh one -----------------
{
    const t = setup(['https://read.example/old', 'https://read.example/fresh']);
    const url = await t.GM.displayURL(PATH); // cached, as when a chat is reopened
    t.GM.fillCard(t.$card, { kind: 'image', url, path: PATH, prompt: 'a cat' });
    const img = t.$card.find('img')[0];
    img.fire('error');
    check('the expired URL shows as broken at first', t.fig().hasClass('is-broken'));
    await tick(); await tick();
    check('the retry swaps in the fresh URL', img.getAttribute('src') === 'https://read.example/fresh', img.getAttribute('src'));
    check('…and goes back to loading, without the note', t.fig().hasClass('is-loading') && !t.fig().hasClass('is-broken') && !t.note(), t.fig().className);
    img.fire('load');
    check('when it loads the picture shows', !t.fig().hasClass('is-loading') && !t.fig().hasClass('is-broken') && !t.note(), t.fig().className);
}
{
    const t = setup(['https://read.example/old', 'https://read.example/fresh']);
    const url = await t.GM.displayURL(PATH);
    t.GM.fillCard(t.$card, { kind: 'image', url, path: PATH, prompt: 'a cat' });
    const img = t.$card.find('img')[0];
    img.fire('error');
    await tick(); await tick();
    img.fire('error');
    check('a retry that fails too ends broken (no second retry)', t.fig().hasClass('is-broken') && !t.fig().hasClass('is-loading')
        && img.getAttribute('src') === 'https://read.example/fresh', t.fig().className);
}

check('the lightbox skips a grid tile that failed to load',
    /function lightboxItems\(\$link\) \{[\s\S]*?\.filter\(a => a === \$link\[0\] \|\| !\$\(a\)\.closest\('\.generated-media'\)\.hasClass\('is-broken'\)\)/.test(src));

// --- The stylesheet keeps the box ---------------------------------------------
const css = fs.readFileSync(new URL('../src/css/styles.css', import.meta.url), 'utf8');
check('a broken card is sized like its placeholder',
    /\.generated-media\.is-pending,\s*\.generated-media\.is-broken,\s*\.generated-media\.is-loading \{ width:/.test(css)
    && /\.generated-media\.is-broken \.generated-media-frame,\s*\.generated-media\.is-loading \.generated-media-frame \{\s*aspect-ratio: var\(--gm-ratio/.test(css));
check('…in a grid too', /\.generated-media-grid \.generated-media\.is-broken \.generated-media-frame,/.test(css));
check('…without the broken picture or its link', /\.generated-media\.is-broken \.generated-media-link \{ display: none; \}/.test(css));
check('the note uses the placeholder\'s centred layout', /\n\.generated-media-placeholder \{[^}]*position: absolute;[^}]*inset: 0;/.test(css));

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll broken-image checks passed.');
