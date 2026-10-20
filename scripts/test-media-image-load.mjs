import fs from 'node:fs';
import { makeDom, El } from './lib/mini-dom.mjs';

// ---- Regression guard: a finished image card keeps its size until it loads ---
// fillCard swaps the "Generating image…" placeholder for the <img>. The image
// has no size until the browser has its first bytes, so the card collapsed to
// just its caption bar, the chat scrolled to the bottom of that short card, and
// then the picture arrived and pushed the caption and Download button below the
// fold. Now:
//   * the card keeps the placeholder's size (.is-loading) until the image loads
//     or fails — a failure must not leave it stuck as an empty box;
//   * when it loads, a reader who was at the bottom is pinned there again; one
//     who had scrolled up to read something else is left where they are.
//
// Runs the real fillCard from src/js/media.js (and the real chatBoxNearBottom
// from app.js) on a small DOM stand-in. The chat box's height is modelled from
// the card's state: the placeholder is 420px tall, the loaded image 700px, an
// image still loading with nothing holding its size 0px.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const src = fs.readFileSync(new URL('../src/js/media.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const a = app.indexOf('function chatBoxNearBottom(');
const b = app.indexOf('\n}\n', a);
if (a < 0 || b < 0) throw new Error('could not extract chatBoxNearBottom from app.js');
const chatBoxNearBottom = new Function(app.slice(a, b + 2) + '\nreturn chatBoxNearBottom;')();

// As in a browser: an <img> is complete at once when it has no URL to load.
Object.defineProperty(El.prototype, 'complete', { get() { return this.tagName === 'IMG' && !this.getAttribute('src'); } });

const OTHER = 3000, PLACEHOLDER = 420, LOADED = 700, CLIENT = 600;

function setup() {
    const { document, body, $ } = makeDom();
    const win = { shouldAutoScroll: true, chatBoxNearBottom };
    new Function('window', '$', 'document', 'puter', 'localStorage', 'setInterval', 'clearInterval', src)(
        win, $, document, {}, { getItem: () => null }, () => 1, () => {},
    );
    const box = document.createElement('div');
    box.setAttribute('class', 'chat-box');
    body.appendChild(box);
    box.clientHeight = CLIENT;
    Object.defineProperty(box, 'scrollHeight', {
        get() {
            const fig = box.querySelector('.generated-media');
            if (!fig) return OTHER;
            const img = fig.querySelector('img');
            const held = fig.hasClass('is-pending') || fig.hasClass('is-loading');
            const h = held ? PLACEHOLDER : (img && img.loaded ? LOADED : 0);
            return OTHER + h;
        },
    });
    const GM = win.GeneratedMedia;
    const $card = GM.pendingCard({ kind: 'image', prompt: 'a cat', ratio: '2:3' });
    GM.appendToChat($card);
    const fill = () => {
        GM.fillCard($card, { kind: 'image', url: 'https://read.example/cat.png', path: '/m/cat.png', filename: 'cat.png', prompt: 'a cat' });
        return $card.find('img')[0];
    };
    const fig = () => $card.find('.generated-media')[0];
    const gap = () => box.scrollHeight - box.scrollTop - box.clientHeight;
    return { win, box, $card, fill, fig, gap };
}

// --- At the bottom: the card keeps its size, and the chat follows the image ---
{
    const t = setup();
    check('pinned to the bottom while generating', t.gap() === 0, 'gap ' + t.gap());
    const img = t.fill();
    check('the card keeps the placeholder size while the image downloads', t.fig().hasClass('is-loading') && t.box.scrollHeight === OTHER + PLACEHOLDER,
        `class "${t.fig().className}", height ${t.box.scrollHeight - OTHER}`);
    check('…and is still at the bottom', t.gap() === 0, 'gap ' + t.gap());
    img.loaded = true;
    img.fire('load');
    check('loaded: the placeholder size is released', !t.fig().hasClass('is-loading'), t.fig().className);
    check('loaded: the caption and Download bar are still in view (pinned to the bottom)', t.gap() === 0, 'gap ' + t.gap());
}

// --- Scrolled up to read: left where they are --------------------------------
{
    const t = setup();
    const img = t.fill();
    t.box.scrollTop = 1000; // the reader scrolled up
    img.loaded = true;
    img.fire('load');
    check('a reader who scrolled up is not pulled down when the image loads', t.box.scrollTop === 1000, 'scrollTop ' + t.box.scrollTop);
}

// --- A failed load does not leave an empty box -------------------------------
{
    const t = setup();
    const img = t.fill();
    img.fire('error');
    check('a failed image releases the placeholder size (not stuck loading)', !t.fig().hasClass('is-loading'), t.fig().className);
}

// --- Nothing to wait for -----------------------------------------------------
{
    const t = setup();
    // An image with no URL is complete at once (as is one the browser already
    // has cached) and may never fire load/error: never hold its size.
    const GM = t.win.GeneratedMedia;
    GM.fillCard(t.$card, { kind: 'image', url: '', path: null, filename: 'cat.png', prompt: 'a cat' });
    check('an image that is already complete is not held in the loading state', !t.fig().hasClass('is-loading'), t.fig().className);
}

// --- Video and audio players have their own size -----------------------------
{
    const t = setup();
    t.win.GeneratedMedia.fillCard(t.$card, { kind: 'video', url: 'https://read.example/v.mp4', path: '/m/v.mp4', filename: 'v.mp4', prompt: 'a cat' });
    check('a video card is not held (iOS may not load its metadata until played)', !t.fig().hasClass('is-loading'), t.fig().className);
}

// --- The stylesheet holds the size ------------------------------------------
{
    const css = fs.readFileSync(new URL('../src/css/styles.css', import.meta.url), 'utf8');
    check('styles.css gives a loading card the placeholder\'s aspect ratio',
        /\.generated-media\.is-loading \.generated-media-frame\s*\{\s*aspect-ratio: var\(--gm-ratio/.test(css));
    check('styles.css keeps the loading image out of the layout',
        /\.generated-media\.is-loading \.generated-media-el\s*\{[^}]*position: absolute/.test(css));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll generated-image load checks passed.');
