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

check('Escape still dismisses the card', lines.some(l => l.includes("e.key === 'Escape'") && l.includes('dismissAll()')));
check('digits still pick an option', lines.some(l => /\^\[1-9\]\$/.test(l)));

// ---- The card only takes keys meant for it -----------------------------------
// The handler sits on document and used to act wherever focus was: Escape that
// closed a popover, the sidebar or a dialog also skipped the questions; Enter on
// a Puter alert (shadow-root dialog → target is the <puter-alert> host) picked
// the highlighted option and, via preventDefault, left the alert stuck open.
// Run the real handler against stub events.
{
    const fnSrc = handler.slice(handler.indexOf('function (e)'), handler.lastIndexOf('}') + 1);
    const calls = [];
    const card = { contains: (el) => !!(el && el.inCard) };
    const body = { tagName: 'BODY' };
    const scope = {
        $card: [card], questions: [{ options: ['a', 'b', 'c'] }], qIndex: 0, activeOption: 0, customOpen: false,
        render: () => calls.push('render'), goTo: (i) => calls.push('goTo:' + i),
        chooseOption: (i) => calls.push('choose:' + i), dismissAll: () => calls.push('dismiss'),
        document: { body, documentElement: { tagName: 'HTML' } },
    };
    const fire = new Function('scope', `with (scope) { return (${fnSrc}); }`)(scope);
    const press = (key, target, prevented = false) => {
        calls.length = 0;
        fire({ key, target, isDefaultPrevented: () => prevented, preventDefault() {} });
        return calls.slice();
    };
    const popoverButton = { tagName: 'BUTTON' };
    const puterAlert = { tagName: 'PUTER-ALERT' };
    const optionInCard = { tagName: 'BUTTON', inCard: true };
    const cardItself = { tagName: 'DIV', inCard: true };
    check('Escape aimed at another surface (a popover) does not skip the questions', press('Escape', popoverButton).length === 0);
    check('Enter on a Puter alert does not answer the question', press('Enter', puterAlert).length === 0);
    check('arrows aimed elsewhere (the version list) are left alone', press('ArrowDown', { tagName: 'LI' }).length === 0);
    check('a key another handler already consumed is ignored', press('Escape', body, true).length === 0);
    check('Escape with focus on the card skips the questions', press('Escape', cardItself).join() === 'dismiss');
    check('Escape with nothing focused still skips them', press('Escape', body).join() === 'dismiss');
    check('digits with focus on the card pick an option', press('2', cardItself).join() === 'choose:1');
    check('Enter on a focused option is left to the button', press('Enter', optionInCard).length === 0);
}

// ---- The card doesn't pull focus out of other controls ------------------------
check('render() only focuses the card when nothing else has focus',
    /if \(!active \|\| active === document\.body \|\| active === document\.documentElement\) \{\s*\$card\[0\]\.focus/.test(src));

if (failures) { console.error(`\n${failures} clarify key check(s) failed.`); process.exit(1); }
console.log('\nAll clarify key checks passed.');
