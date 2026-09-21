import fs from 'node:fs';

// ---- Regression guard for the composer's Send button --------------------
// Three places decide whether Send is clickable: updateAttachmentDisplay, the
// composer's input handler, and updateSendButtonState (called at every turn
// boundary — start, abort, chat switch, end). The first two treat "has text OR
// has attachments" as sendable; updateSendButtonState used to look at the text
// alone, so a turn ending with a file staged and no text left the button dead
// until the user typed a character. This evaluates the REAL function out of
// helpers.js against a tiny jQuery stub and asserts all four combinations.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const HELP = new URL('../src/js/helpers.js', import.meta.url);
const src = fs.readFileSync(HELP, 'utf8');
const a = src.indexOf('function updateSendButtonState(');
const b = src.indexOf('\n/**', a);
if (a < 0 || b <= a) throw new Error('could not extract updateSendButtonState from helpers.js');
const block = src.slice(a, b);

// Minimal jQuery stub: '.send' is a chainable button recording `disabled`,
// '.chat-input-message' just reports its value.
function makeEnv(text, attachmentCount) {
    const button = { disabled: null };
    const chain = {
        html: () => chain,
        toggleClass: () => chain,
        attr: () => chain,
        prop: (k, v) => { if (k === 'disabled') button.disabled = v; return chain; },
    };
    const $ = (sel) => {
        if (sel === '.send') return chain;
        if (sel === '.chat-input-message') return { val: () => text };
        throw new Error('unexpected selector ' + sel);
    };
    const win = { attachedImages: new Array(attachmentCount).fill({}) };
    const fn = new Function('$', 'window', 'pause_svg', 'send_svg',
        block + '\nreturn updateSendButtonState;')($, win, '', '');
    return { fn, button };
}

function disabledFor(text, attachments, processing) {
    const { fn, button } = makeEnv(text, attachments);
    fn(processing);
    return button.disabled;
}

// Idle turn: sendable iff there is text OR at least one attachment.
check('idle, no text, no attachments → disabled', disabledFor('', 0, false) === true);
check('idle, whitespace only, no attachments → disabled', disabledFor('   \n ', 0, false) === true);
check('idle, text only → enabled', disabledFor('hello', 0, false) === false);
check('idle, attachment only → enabled', disabledFor('', 1, false) === false);
check('idle, whitespace + attachment → enabled', disabledFor('  ', 2, false) === false);
check('idle, text + attachment → enabled', disabledFor('hi', 1, false) === false);

// Mid-turn the button is Stop and must always be clickable.
check('processing → always enabled (it is Stop)', disabledFor('', 0, true) === false);
check('processing with attachments → always enabled', disabledFor('', 3, true) === false);

// Never throw when the tray global hasn't been created yet (early boot).
check('missing attachedImages global is treated as empty', (() => {
    const button = { disabled: null };
    const chain = { html: () => chain, toggleClass: () => chain, attr: () => chain,
        prop: (k, v) => { if (k === 'disabled') button.disabled = v; return chain; } };
    const $ = (sel) => sel === '.send' ? chain : { val: () => '' };
    const fn = new Function('$', 'window', 'pause_svg', 'send_svg',
        block + '\nreturn updateSendButtonState;')($, {}, '', '');
    fn(false);
    return button.disabled === true;
})());

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll Send-button state checks passed.');
