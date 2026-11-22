import fs from 'node:fs';

// ---- Regression guard: turn-end resets must not steal focus ----------------
// resetUIState (end of every turn) and resetUIForAbort (Stop) put the cursor
// back in the composer. They used to do so unconditionally, so a build that
// finished while the user was typing in the sidebar search, renaming a project
// (the rename editor cancels on blur — the rename was silently lost), choosing
// a publish address, or using their app inside the preview iframe pulled the
// cursor into the composer mid-word. composerMayTakeFocus() (ui.js) is the
// shared gate: only body/html, the composer itself, or its Send/Stop button
// may yield focus. This evaluates the REAL function against a stub DOM.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const UI = new URL('../src/js/ui.js', import.meta.url);
const src = fs.readFileSync(UI, 'utf8');
const a = src.indexOf('function composerMayTakeFocus(');
const b = src.indexOf('\n}\n', a);
if (a < 0 || b <= a) throw new Error('could not extract composerMayTakeFocus from ui.js');
const block = src.slice(a, b + 3);

// Both turn-end resets and the window-focus handler must route through it.
check('resetUIState gates its composer focus on composerMayTakeFocus', (() => {
    const i = src.indexOf('function resetUIState(');
    const j = src.indexOf('flushPreviewRefresh();', i);
    return /composerMayTakeFocus\(\)\)\s*\$\('\.chat-input-message'\)\.focus\(\)/.test(src.slice(i, j));
})());
check('resetUIForAbort gates its composer focus on composerMayTakeFocus', (() => {
    const i = src.indexOf('function resetUIForAbort(');
    const j = src.indexOf('function resetUIState(', i);
    return /composerMayTakeFocus\(\)\)\s*\$\('\.chat-input-message'\)\.focus\(\)/.test(src.slice(i, j));
})());

function mayTakeFocus({ active, modal = false }) {
    const body = { tag: 'body' }, html = { tag: 'html' };
    const el = active === 'body' ? body : active === 'html' ? html
        : active == null ? null : { tag: 'el', className: active };
    const document = {
        body, documentElement: html, activeElement: el,
        querySelector: (sel) => (sel === '.confirm-modal-overlay' && modal) ? {} : null,
    };
    const $ = (node) => ({ hasClass: (c) => !!(node && typeof node.className === 'string' && node.className.split(/\s+/).includes(c)) });
    return new Function('$', 'document', block + '\nreturn composerMayTakeFocus();')($, document);
}

check('nothing focused (body) → composer may take focus', mayTakeFocus({ active: 'body' }) === true);
check('nothing focused (html) → composer may take focus', mayTakeFocus({ active: 'html' }) === true);
check('activeElement null → composer may take focus', mayTakeFocus({ active: null }) === true);
check('composer itself focused → allowed', mayTakeFocus({ active: 'chat-input-message' }) === true);
check('Send/Stop button focused (mouse send) → allowed', mayTakeFocus({ active: 'send processing' }) === true);
check('sidebar search focused → refused', mayTakeFocus({ active: 'chat-search-input' }) === false);
check('rename editor focused → refused', mayTakeFocus({ active: 'chat-title-input' }) === false);
check('publish address field focused → refused', mayTakeFocus({ active: 'publish-name-input' }) === false);
check('preview iframe focused → refused', mayTakeFocus({ active: 'preview-frame' }) === false);
check('confirm modal open, nothing focused → refused', mayTakeFocus({ active: 'body', modal: true }) === false);

// ---- The window-focus handler must not focus from inside the event ---------
// Clicking from the preview iframe back into the composer fires window 'focus'
// first, with activeElement still <body>. Focusing the composer right there,
// mid-way through Chrome moving focus out of the frame, left the IME wired to
// the frame: Korean input arrived as separate letters until the user clicked
// away and back. The handler now decides a tick later, and leaves a composer
// that already has focus alone. This runs the REAL handler against stubs.
const h0 = src.indexOf("$(window).on('focus', function() {");
const h1 = src.indexOf('\n});\n', h0);
if (h0 < 0 || h1 <= h0) throw new Error("could not extract the window 'focus' handler from ui.js");
const handlerSrc = src.slice(h0, h1 + 4);

function runWindowFocus({ active, mobile = false, hasFocus = true, activeAfterTick, modal = false }) {
    const body = { tag: 'body' }, html = { tag: 'html' };
    const composer = { tag: 'textarea', className: 'chat-input-message' };
    const resolve = (a) => a === 'body' ? body : a === 'composer' ? composer
        : a == null ? null : { tag: 'el', className: a };
    const document = {
        body, documentElement: html, activeElement: resolve(active),
        hasFocus: () => hasFocus,
        querySelector: (sel) => (sel === '.confirm-modal-overlay' && modal) ? {} : null,
    };
    let handler = null;
    const focusCalls = [];
    const $ = (arg) => {
        if (arg === '.chat-input-message') {
            return {
                is: (el) => el === composer,
                focus: () => { focusCalls.push('composer'); document.activeElement = composer; },
            };
        }
        if (arg && arg.__isWindow) return { on: (ev, fn) => { if (ev === 'focus') handler = fn; } };
        return { hasClass: (c) => !!(arg && typeof arg.className === 'string' && arg.className.split(/\s+/).includes(c)) };
    };
    const timers = [];
    const window = { __isWindow: true, isMobileViewport: () => mobile };
    new Function('$', 'window', 'document', 'setTimeout',
        block + '\n' + handlerSrc)($, window, document, (fn) => { timers.push(fn); });
    handler();
    const duringEvent = focusCalls.length;
    if (activeAfterTick !== undefined) document.activeElement = resolve(activeAfterTick);
    timers.splice(0).forEach(fn => fn());
    return { duringEvent, total: focusCalls.length };
}

check('window focus never focuses the composer synchronously inside the event',
    runWindowFocus({ active: 'body' }).duringEvent === 0);
check('click from preview back into the composer: no focus() call at all',
    runWindowFocus({ active: 'body', activeAfterTick: 'composer' }).total === 0);
check('return to the tab with nothing focused: composer gets focus (after the tick)',
    runWindowFocus({ active: 'body' }).total === 1);
check('click from preview onto another control: that control keeps focus',
    runWindowFocus({ active: 'body', activeAfterTick: 'chat-search-input' }).total === 0);
check('focus still in the preview iframe: left alone',
    runWindowFocus({ active: 'preview-frame' }).total === 0);
check('window lost focus again before the tick: left alone',
    runWindowFocus({ active: 'body', hasFocus: false }).total === 0);
check('mobile: never refocuses',
    runWindowFocus({ active: 'body', mobile: true }).total === 0);
check('confirm modal open: left alone',
    runWindowFocus({ active: 'body', modal: true }).total === 0);

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll composer focus-guard checks passed.');
