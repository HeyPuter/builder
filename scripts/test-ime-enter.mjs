import fs from 'node:fs';

// ---- Regression guard for IME-safe Enter handling ---------------------------
// Users typing Chinese, Japanese or Korean (and some autocomplete keyboards)
// commit each composed word with Enter. Safari delivers that Enter as a keydown
// with keyCode 13 and isComposing=true; Chrome reports keyCode 229 for every
// key while composing. Treating either as "send" fires the chat message — or
// commits a project rename / publish address / delete confirmation — with a
// half-typed word. window.isComposingKeyEvent (helpers.js) is the one shared
// check; every Enter-to-submit handler must consult it. This test:
//   * evaluates the REAL helper against a bare window and drives it through
//     jQuery-wrapped and native event shapes, then
//   * text-asserts that each Enter-submitting handler is gated on it.
// Mirrors scripts/test-publish-state.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const HELP = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const a = HELP.indexOf('window.isComposingKeyEvent = function');
const b = HELP.indexOf('// Turn RAW text into HTML with its URLs as links');
if (a < 0 || b < 0 || b <= a) throw new Error('could not extract isComposingKeyEvent');
const window = {};
new Function('window', HELP.slice(a, b))(window);
const isComposing = window.isComposingKeyEvent;
check('helper is defined', typeof isComposing === 'function');

// === Classification ==========================================================
check('plain Enter (jQuery-wrapped) is not composing',
    isComposing({ which: 13, originalEvent: { keyCode: 13, isComposing: false } }) === false);
check('Safari IME commit (keyCode 13 + isComposing) is composing',
    isComposing({ which: 13, originalEvent: { keyCode: 13, isComposing: true } }) === true);
check('Chrome IME key (keyCode 229) is composing',
    isComposing({ which: 229, originalEvent: { keyCode: 229, isComposing: false } }) === true);
check('native event without a jQuery wrapper works',
    isComposing({ keyCode: 13, isComposing: true }) === true &&
    isComposing({ keyCode: 13, isComposing: false }) === false);
check('missing originalEvent falls back to the wrapper itself',
    isComposing({ which: 229 }) === true && isComposing({ which: 13 }) === false);
check('null / undefined never throw and are not composing',
    isComposing(null) === false && isComposing(undefined) === false);

// === Every Enter-to-submit handler is gated ==================================
const UI = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const CLARIFY = fs.readFileSync(new URL('../src/tools/chat_ui/clarify.js', import.meta.url), 'utf8');

// Slice a handler by a distinctive anchor and confirm the composing guard runs
// inside it before the Enter branch.
function gated(src, anchor, span = 900) {
    const i = src.indexOf(anchor);
    if (i < 0) return false;
    const slice = src.slice(i, i + span);
    const g = slice.indexOf('isComposingKeyEvent');
    const enter = slice.search(/e\.(which === 13|key === 'Enter')/);
    return g >= 0 && enter >= 0 && g < enter;
}
check('composer Enter-to-send is IME-safe',
    gated(UI, "$(document).on('keydown', '.chat-input-message'"));
check('project rename Enter is IME-safe',
    gated(UI, "$input.on('keydown', function(e) {\n        e.stopPropagation();"));
check('first-publish address Enter is IME-safe',
    gated(UI, "$(document).on('keydown', '.publish-name-input'"));
check('change-address Enter is IME-safe',
    gated(UI, "$(document).on('keydown', '.publish-address-input'"));
check('delete-confirmation Enter is IME-safe (input handler)',
    gated(UI, "$input.on('keydown', (e) => {\n            e.stopPropagation();"));
check('delete-confirmation Enter is IME-safe (document fallback)',
    gated(UI, "$(document).on('keydown.confirmModal'"));
check('settings address Enter is IME-safe',
    gated(UI, "$form.find('.properties-address-cancel').on('click', cancel);", 500));
check('clarifying-questions custom answer Enter is IME-safe',
    gated(CLARIFY, "$card.on('keydown', '.clarify-custom-input'"));

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nAll IME Enter checks passed');
