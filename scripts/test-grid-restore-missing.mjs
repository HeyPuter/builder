import fs from 'node:fs';
import { makeDom } from './lib/mini-dom.mjs';

// ---- Regression guard: a reopened multi-image result with files gone --------
// loadChat hands renderSaved one read URL per image of a grid, null for a file
// that is gone. With every file gone it still appended the (empty) grid
// message: an 8px bubble announced as "3 generated images". With some gone,
// the grid kept the original count, so its label was wrong and the 3-image
// layout rule (the third tile spans the row) hit whichever tile came third.
// A single generated image whose file is gone shows nothing at all; an empty
// grid now does the same.
//
// Runs the real renderSaved / gridMessage / fillCard from src/js/media.js on a
// small DOM stand-in.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const media = fs.readFileSync(new URL('../src/js/media.js', import.meta.url), 'utf8');
const { document, body, $ } = makeDom();
const win = { shouldAutoScroll: false };
new Function('window', '$', 'document', 'puter', 'localStorage', 'setInterval', 'clearInterval', 'requestAnimationFrame', media)(
    win, $, document, {}, { getItem: () => null }, () => 1, () => {}, (fn) => fn(),
);
const box = document.createElement('div');
box.setAttribute('class', 'chat-box');
body.appendChild(box);
const GM = win.GeneratedMedia;

const result = {
    success: true, kind: 'image', prompt: 'a fox', aspect_ratio: '1:1', path: '/m/a.png', filename: 'a.png',
    items: [{ path: '/m/a.png', filename: 'a.png' }, { path: '/m/b.png', filename: 'b.png' }, { path: '/m/c.png', filename: 'c.png' }],
};
const messages = () => box.querySelectorAll('.message');

// Every file gone.
GM.renderSaved(result, [null, null, null]);
check('a grid whose files are all gone adds nothing to the chat', messages().length === 0, `${messages().length} message(s)`);

// One of three gone.
box.textContent = '';
GM.renderSaved(result, ['https://read/a', null, 'https://read/c']);
const grid = box.querySelector('.generated-media-grid');
const tiles = box.querySelectorAll('.generated-media-tile');
check('the remaining images are shown', !!grid && tiles.length === 2, `${tiles.length} tile(s)`);
check('…counted as two (no 3-image layout rule on a 2-image grid)', grid && grid.getAttribute('data-count') === '2', grid && grid.getAttribute('data-count'));
check('…and announced as two', grid && grid.getAttribute('aria-label') === '2 generated images', grid && grid.getAttribute('aria-label'));
check('…keeping their own option numbers', tiles.map(t => t.querySelector('.generated-media-caption').textContent).join('|') === 'Option 1|Option 3',
    tiles.map(t => t.querySelector('.generated-media-caption').textContent).join('|'));

// Two of three gone: what's left is one picture, shown like a lone saved version.
box.textContent = '';
GM.renderSaved(result, [null, 'https://read/b', null]);
check('a grid with one image left shows it as a single image', messages().length === 1 && !box.querySelector('.generated-media-grid')
    && box.querySelector('img.generated-media-el')?.getAttribute('src') === 'https://read/b');

// Nothing gone: unchanged.
box.textContent = '';
GM.renderSaved(result, ['https://read/a', 'https://read/b', 'https://read/c']);
const full = box.querySelector('.generated-media-grid');
check('a complete grid is unchanged', full && full.getAttribute('data-count') === '3' && full.getAttribute('aria-label') === '3 generated images'
    && box.querySelectorAll('.generated-media-tile').length === 3);

// A version that fails WHILE the grid is on screen (runGeneration takes its
// tile down with removeCard): the grid kept its original count, so its label
// said "4 generated images" over three and the layout rules (data-count)
// didn't match what reloading the chat shows.
box.textContent = '';
{
    const { $msg, tiles: live } = GM.gridMessage({ kind: 'image', prompt: 'a fox', ratio: '1:1', count: 4 });
    $(box).append($msg);
    GM.removeCard(live[1]);
    const g = box.querySelector('.generated-media-grid');
    check('a live grid that loses a version is recounted', g && g.getAttribute('data-count') === '3', g && g.getAttribute('data-count'));
    check('…and announced with the new count', g && g.getAttribute('aria-label') === '3 generated images', g && g.getAttribute('aria-label'));
    GM.removeCard(live[0]);
    GM.removeCard(live[2]);
    check('…down to one image', g && g.getAttribute('data-count') === '1' && g.getAttribute('aria-label') === '1 generated image', g && g.getAttribute('aria-label'));
    GM.removeCard(live[3]);
    check('…and the empty grid goes with its last tile', !box.querySelector('.generated-media-grid'));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll grid-restore checks passed.');
