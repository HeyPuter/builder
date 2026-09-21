import fs from 'node:fs';

// ---- Regression guard: Enter on a focused clarify button activates IT --------
// The clarifying-questions card (tools/chat_ui/clarify.js) arms a document-level
// keydown handler so ArrowUp/Down, digits, Enter and Escape drive the card
// wherever focus sits. Its options, Skip, the close × and Previous/Next are
// real <button>s a keyboard user reaches with Tab. Enter on one of them used to
// reach this handler first, which picked the ARROW-highlighted option instead
// of the focused button (Tab to option 3 + Enter answered option 1) and, via
// preventDefault, cancelled the button's own click (Tab to Skip + Enter
// answered instead of skipping). The handler must leave Enter alone when it is
// aimed at a button or link so the native activation decides — the same rule
// the delete dialog's Enter handler follows (test-confirm-modal-keys.mjs).

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const src = fs.readFileSync(new URL('../src/tools/chat_ui/clarify.js', import.meta.url), 'utf8');
const handlerAt = src.indexOf("$(document).on('keydown.clarify'");
check('a document-level keydown handler exists for the card', handlerAt >= 0);
const handler = src.slice(handlerAt, src.indexOf('});', handlerAt) + 3);
const lines = handler.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('//'));

const typingGuard = lines.find(l => l.includes("t.tagName === 'INPUT'")) || '';
check('typing targets (input/textarea/select/contenteditable) are still left alone',
    typingGuard.includes("'TEXTAREA'") && typingGuard.includes("'SELECT'") && typingGuard.includes('isContentEditable'));

const enterGuardIdx = lines.findIndex(l => l.includes("e.key === 'Enter'") && l.includes("'BUTTON'") && l.includes('return'));
check('Enter aimed at a button or link returns before any card handling',
    enterGuardIdx >= 0 && /'A'/.test(lines[enterGuardIdx]));

const enterPickIdx = lines.findIndex(l => l.includes("e.key === 'Enter'") && l.includes('chooseOption(activeOption)'));
check('… and the highlighted-option Enter branch still exists after that guard',
    enterPickIdx > enterGuardIdx);

check('Escape still dismisses from anywhere', lines.some(l => l.includes("e.key === 'Escape'") && l.includes('dismissAll()')));
check('digits still pick an option', lines.some(l => /\^\[1-9\]\$/.test(l)));

if (failures) { console.error(`\n${failures} clarify key check(s) failed.`); process.exit(1); }
console.log('\nAll clarify key checks passed.');
