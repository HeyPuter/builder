import fs from 'node:fs';
import { makeDom } from './lib/mini-dom.mjs';

// ---- Regression guard: a generating image/video card is announced once ------
// The "Generating image…" placeholder is a role="status" live region, and the
// elapsed-time counter (1s, 2s, 3s…) sat inside it. A status region re-reads
// its whole text whenever any of it changes, so a screen reader spoke
// "Generating image… 1s", "…2s", "…3s" every second for as long as the provider
// took (minutes, for a video). The counter must be hidden from assistive tech
// (as the dictation timer is) while the label — and a video's "this can take a
// few minutes" hint — stay readable.
//
// Runs the real pendingCard from src/js/media.js on a small DOM stand-in and
// ticks its timer by hand.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const src = fs.readFileSync(new URL('../src/js/media.js', import.meta.url), 'utf8');

function load() {
    const { document, body, $ } = makeDom();
    const timers = [];
    const win = {};
    const realNow = Date.now;
    let offset = 0;
    const DateStub = class extends Date {};
    DateStub.now = () => realNow() + offset;
    new Function('window', '$', 'document', 'puter', 'localStorage', 'setInterval', 'clearInterval', 'Date', src)(
        win, $, document, {}, { getItem: () => null },
        (fn) => { timers.push(fn); return timers.length; }, () => {}, DateStub,
    );
    const box = document.createElement('div');
    box.setAttribute('class', 'chat-box');
    body.appendChild(box);
    const tick = (ms) => { offset += ms; timers.forEach(f => f()); };
    return { GM: win.GeneratedMedia, $, tick, box };
}

// What a screen reader gets from an element: its text minus aria-hidden parts.
function spoken(el) {
    if (el.nodeType === 3) return el.data;
    if (el.getAttribute('aria-hidden') === 'true') return '';
    return el.childNodes.map(spoken).join('');
}

for (const kind of ['image', 'video', 'audio']) {
    const { GM, tick } = load();
    const $card = GM.pendingCard({ kind, prompt: 'a snowy cabin', ratio: '16:9' });
    GM.appendToChat($card);
    const status = $card.find('[role="status"]')[0];
    check(`${kind}: the placeholder is a status region`, !!status);
    const first = spoken(status);
    tick(1000);
    tick(1000);
    tick(65000);
    const later = spoken(status);
    const $elapsed = $card.find('.generated-media-elapsed');
    check(`${kind}: the counter still ticks on screen`, /1m 07s/.test($elapsed.text()), $elapsed.text());
    check(`${kind}: the status region's spoken text does not change as the counter ticks`, first === later,
        `${JSON.stringify(first)} → ${JSON.stringify(later)}`);
    check(`${kind}: the label is still read`, new RegExp(`Generating ${kind}`).test(later), later);
    if (kind === 'video') check('video: the "this can take a few minutes" hint is still read', /few minutes/i.test(later), later);
}

// Grid tiles are pending cards too.
{
    const { GM, tick } = load();
    const { $msg } = GM.gridMessage({ kind: 'image', prompt: 'cats', ratio: '1:1', count: 2 });
    GM.appendToChat($msg);
    const statuses = $msg.find('[role="status"]').toArray();
    const before = statuses.map(spoken);
    tick(3000);
    check('grid tiles: no tile re-announces as its counter ticks', statuses.length === 2 && statuses.map(spoken).every((t, i) => t === before[i]),
        JSON.stringify([before, statuses.map(spoken)]));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll generating-card status checks passed.');
