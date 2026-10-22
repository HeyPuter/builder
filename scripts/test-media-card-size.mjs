import fs from 'node:fs';
import { makeDom } from './lib/mini-dom.mjs';

// ---- Regression guard: a generated image or video doesn't jump when it lands -
// The "Generating…" placeholder was 360px wide (a video's 460px) and at most
// 420px tall, while the finished media is up to 420px wide (video 520px) and
// 520px tall at its own shape. So every card changed size when its picture
// arrived: a square one 362×399 → 422×469 on a desktop, a portrait (9:16) one
// 362×459 → 295×569; a video sat at the <video> default of 300×150 until its
// metadata loaded; and the caption bar grew 10px when the Download / Open
// buttons appeared. The placeholder now takes exactly the finished box, worked
// out from the ratio (--gm-ar = width ÷ height, set by buildCard), a video
// keeps that box while it loads, and the bar is always the buttons' height.
// Measured in Playwright Chromium and WebKit at 1440, 390 and 375, light and
// dark, for 1:1, 16:9, 9:16, 4:3 and 3:4 images and videos: placeholder, loading
// and finished boxes identical to the pixel. Grid tiles keep their own sizes.
//
// Runs the real pendingCard from media.js, then checks the stylesheet's
// placeholder size against the finished media's own size rules.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const src = fs.readFileSync(new URL('../src/js/media.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/css/styles.css', import.meta.url), 'utf8');

// === buildCard hands CSS the ratio as a number ============================
const { document, $ } = makeDom();
const win = {};
new Function('window', '$', 'document', 'puter', 'localStorage', 'setInterval', 'clearInterval', src)(
    win, $, document, {}, { getItem: () => null }, () => 1, () => {},
);
const GM = win.GeneratedMedia;
const RATIOS = { '1:1': 1, '16:9': 16 / 9, '9:16': 9 / 16, '4:3': 4 / 3, '3:4': 3 / 4, '3:2': 1.5, '2:3': 2 / 3 };
for (const [ratio, ar] of Object.entries(RATIOS)) {
    const fig = GM.pendingCard({ kind: 'image', prompt: 'x', ratio }).find('.generated-media').els[0];
    check(`a ${ratio} card gets --gm-ar ${ar.toFixed(3)}`, Math.abs(parseFloat(fig.style['--gm-ar']) - ar) < 1e-9 && fig.hasClass('has-ratio'), JSON.stringify(fig.style));
}
{
    const fig = GM.pendingCard({ kind: 'audio', prompt: 'x', ratio: '16:9' }).find('.generated-media').els[0];
    check('an audio card has no ratio', fig.style['--gm-ar'] === undefined && !fig.hasClass('has-ratio'));
    const none = GM.pendingCard({ kind: 'image', prompt: 'x' }).find('.generated-media').els[0];
    check('…nor does an image with none given', none.style['--gm-ar'] === undefined && !none.hasClass('has-ratio'));
}

// === The placeholder is the finished box ==================================
const px = (re, what) => { const m = css.match(re); if (!m) { check(what + ' is in the stylesheet', false); return NaN; } return parseFloat(m[1]); };
const cardMax = px(/\n\.generated-media \{[^}]*max-width: min\(100%, (\d+)px\);/, 'the card\'s max width');
const videoMax = px(/\n\.generated-media\.kind-video \{ max-width: min\(100%, (\d+)px\); \}/, 'the video card\'s max width');
const elMaxH = px(/\n\.generated-media-el \{[^}]*max-height: (\d+)px;/, 'the media\'s max height');
const BORDER = 2; // the card's 1px border, each side
const pendRe = (sel) => new RegExp(sel + ' \\{ width: min\\(100% - (\\d+)px, (\\d+)px, (\\d+)px \\* var\\(--gm-ar, 1\\)\\); \\}');
const img = css.match(pendRe('\\.generated-media\\.is-pending,\\s*(?:\\.generated-media\\.is-broken,\\s*)?\\.generated-media\\.is-loading'));
const vid = css.match(pendRe('\\.generated-media\\.kind-video\\.is-pending,\\s*\\.generated-media\\.kind-video\\.has-ratio'));
check('a placeholder is sized from its ratio', !!img, '');
check('…a video\'s too, and while it loads', !!vid, '');
const frame = (css.match(/\.generated-media\.is-pending \.generated-media-frame,\s*(?:\.generated-media\.is-broken \.generated-media-frame,\s*)?\.generated-media\.is-loading \.generated-media-frame \{[^}]*\}/) || [''])[0];
check('…its frame keeps the ratio', /aspect-ratio: var\(--gm-ratio, 1 \/ 1\);/.test(frame), frame);
check('…and may be as tall as the media', /max-height: (\d+)px;/.test(frame) && +frame.match(/max-height: (\d+)px;/)[1] >= elMaxH, frame);
check('a video with a ratio fills that box at its ratio',
    /\.generated-media\.kind-video\.has-ratio \.generated-media-el \{ width: 100%; aspect-ratio: var\(--gm-ratio\); \}/.test(css));
if (img && vid) {
    for (const col of [740, 362, 355, 300]) for (const [ratio, ar] of Object.entries(RATIOS)) for (const [kind, m, max] of [['image', img, cardMax], ['video', vid, videoMax]]) {
        // A large picture (as generated) at its natural size, capped by the
        // card (the column less its border, and max-width) and by max-height.
        const finalW = Math.min(col - BORDER, max, elMaxH * ar);
        const pendW = Math.min(col - +m[1], +m[2], +m[3] * ar);
        if (Math.abs(finalW - pendW) > 0.5) check(`${kind} ${ratio} at a ${col}px column: placeholder ${pendW.toFixed(1)}px wide = finished ${finalW.toFixed(1)}px`, false);
    }
    check('…which matches the finished media for every ratio, kind and width', true);
}
const bar = (css.match(/\n\.generated-media-bar \{\n[^}]*\}/) || [''])[0];
const btn = px(/\.generated-media-download,\s*\.generated-media-open \{[^}]*height: (\d+)px;/, 'the action buttons\' height');
check('the caption bar is the action buttons\' height from the start', (bar.match(/min-height: (\d+)px;/) || [])[1] == btn, bar);
check('grid tiles keep their own size',
    /\.generated-media-grid \.generated-media,\s*\.generated-media-grid \.generated-media\.is-pending,\s*\.generated-media-grid \.generated-media\.is-loading \{ width: 100%; max-width: none; display: flex; \}/.test(css));

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll media card size checks passed.');
