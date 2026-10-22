import fs from 'node:fs';
import { makeDom } from './lib/mini-dom.mjs';

// ---- Regression guard: the image viewer closes on a chat switch -------------
// The full-screen image viewer (media.js lightbox) is appended to <body>,
// outside the chat box, and locks the page's scrolling while open. A chat
// switch empties the chat box but never closed it, so switching while it was
// open — a phone's Back button, browser Back/Forward — left the previous
// chat's picture on screen over the new chat, with scrolling still locked.
//
// Runs the real lightbox from src/js/media.js on a small DOM stand-in, and the
// real resetChatUIForSwitch sliced out of app.js (the reset both switch paths,
// loadChat and new_chat, go through) against stubs.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const media = fs.readFileSync(new URL('../src/js/media.js', import.meta.url), 'utf8');
const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const a = APP.indexOf('function resetChatUIForSwitch() {');
const b = APP.indexOf('\n}\n', a);
if (a < 0 || b <= a) throw new Error('could not extract resetChatUIForSwitch from app.js');
const resetSrc = APP.slice(a, b + 3);

// The page: a chat box holding a generated image, with the real media.js.
const { document, body, $ } = makeDom();
const win = { shouldAutoScroll: true };
new Function('window', '$', 'document', 'puter', 'localStorage', 'setInterval', 'clearInterval', 'requestAnimationFrame', media)(
    win, $, document, {}, { getItem: () => null }, () => 1, () => {}, (fn) => fn(),
);
const box = document.createElement('div');
box.setAttribute('class', 'chat-box');
body.appendChild(box);
const GM = win.GeneratedMedia;
const $card = GM.renderSaved({ success: true, kind: 'image', prompt: 'a cat', path: '/m/cat.png', filename: 'cat.png' }, 'https://read.example/cat.png');
const link = $card.find('.generated-media-link')[0];

// The real reset, with the rest of the app stubbed out.
const chain = new Proxy(function () {}, { get: (t, k) => (k === 'length' ? 0 : () => chain), apply: () => chain });
const resetChatUIForSwitch = new Function('$', 'window', `
    let isProcessing = false, shouldStop = false, abortController = null, _lastSuggestionContext = null;
    const clearContinueSuggestions = () => {}, clearResumeBanner = () => {}, clearRetryStatus = () => {};
    const updateSendButtonState = () => {}, clearAllAttachments = () => {};
    ${resetSrc}
    return resetChatUIForSwitch;`)(() => chain, win);

// --- Open the viewer, then switch chats ---------------------------------------
GM.openLightbox($(link));
check('the viewer opens over the page', !!document.querySelector('.media-lightbox') && body.hasClass('media-lightbox-open'));

resetChatUIForSwitch();
box.textContent = ''; // what loadChat / new_chat do next: empty the chat box

check('a chat switch closes the viewer', !document.querySelector('.media-lightbox'));
check('…and unlocks the page\'s scrolling', !body.hasClass('media-lightbox-open'));
check('…without handing focus to the image being removed', document.activeElement !== link);

// --- The viewer still works in the next chat ---------------------------------
{
    const $next = GM.renderSaved({ success: true, kind: 'image', prompt: 'a dog', path: '/m/dog.png', filename: 'dog.png' }, 'https://read.example/dog.png');
    const nextLink = $next.find('.generated-media-link')[0];
    GM.openLightbox($(nextLink));
    check('the viewer opens again in the next chat', document.querySelectorAll('.media-lightbox').length === 1);
    GM.closeLightbox();
    check('a normal close still returns focus to the image that opened it', document.activeElement === nextLink);
    resetChatUIForSwitch();
    check('a switch with no viewer open is harmless', !document.querySelector('.media-lightbox') && !body.hasClass('media-lightbox-open'));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll image-viewer chat-switch checks passed.');
