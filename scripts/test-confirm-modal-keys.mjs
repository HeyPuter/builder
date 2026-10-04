import fs from 'node:fs';

// ---- Regression guard: Enter on the delete modal's Cancel must cancel -------
// confirmByTyping (ui.js) arms a document-level keydown handler so Enter
// confirms once the user has typed the confirmation word, wherever focus sits.
// Focus can sit on the Cancel button — it is the first Tab stop after the
// input — and Enter there used to reach this handler BEFORE the button's own
// activation, so pressing Enter on "Cancel" permanently deleted the project.
// The handler must leave Enter alone when it is aimed at a button, so the
// button's native click (Cancel → close(false), Delete → close(true)) decides.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const ui = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const start = ui.indexOf('function confirmByTyping(');
const end = ui.indexOf('function formatPropertyDate(');
check('confirmByTyping is present in ui.js', start >= 0 && end > start);
const body = ui.slice(start, end);

const handlerAt = body.indexOf("$(document).on('keydown.confirmModal'");
check('a document-level keydown handler exists for the modal', handlerAt >= 0);
const handler = body.slice(handlerAt, body.indexOf('});', handlerAt) + 3);
const enterLine = handler.split('\n').find(l => l.includes("e.key === 'Enter'") && !l.trim().startsWith('//')) || '';
check('the document-level Enter still requires the typed word to match', enterLine.includes('matches()'));
check('… and is skipped when the key is aimed at a button (Cancel keeps its own activation)',
    /!\$\(e\.target\)\.is\('button'\)/.test(enterLine));
check('the Cancel button still resolves false', /\$cancel\.on\('click', \(\) => close\(false\)\)/.test(body));
check('the Delete button still resolves true only on a match', /\$confirm\.on\('click', \(\) => \{ if \(matches\(\)\) close\(true\); \}\)/.test(body));

// ---- The dialogs' focus trap holds from wherever focus starts -----------------
// trapDialogFocus listened on the overlay, so it heard nothing once focus had
// left it — and the Settings/MCP dialogs open with focus on their own container
// (tabindex -1, not a Tab stop), from which Shift+Tab is the browser's to take
// to the page behind the backdrop. A re-render that removed the focused control
// dropped focus to <body>, outside the trap's hearing too. Runs the real
// function against a stub document/jQuery.
{
    const a = ui.indexOf('function trapDialogFocus($overlay) {');
    const b = ui.indexOf('\n}\n', a);
    const listeners = [];
    const doc = {
        activeElement: null,
        body: { name: 'body' },
        addEventListener: (type, fn, capture) => listeners.push({ type, fn, capture }),
        removeEventListener: (type, fn) => { const i = listeners.findIndex(l => l.fn === fn); if (i >= 0) listeners.splice(i, 1); },
        contains: () => true,
    };
    doc.activeElement = doc.body;
    const el = (name, focusable) => ({ name, focusable, focus() { doc.activeElement = this; } });
    const container = el('dialog-container', false);
    const close = el('close', true), input = el('input', true), submit = el('submit', true);
    const inDialog = new Set([container, close, input, submit]);
    const overlay = { contains: (x) => inDialog.has(x) };
    const $overlay = Object.assign([overlay], { find: () => ({ filter: () => ({ toArray: () => [close, input, submit] }) }) });
    const $ = (x) => ({ is: () => !!(x && x.focusable) });
    const trap = new Function('document', '$', ui.slice(a, b + 2) + '\nreturn trapDialogFocus;')(doc, $);
    const release = trap($overlay);
    const press = (shiftKey) => {
        const ev = { key: 'Tab', shiftKey, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
        for (const l of [...listeners]) if (l.type === 'keydown') l.fn(ev);
        return ev.defaultPrevented;
    };
    check('focus trap: listens on the document, in the capture phase',
        listeners.length === 1 && listeners[0].type === 'keydown' && listeners[0].capture === true);
    container.focus();
    check('focus trap: Shift+Tab from the dialog container goes to its last control, not the page behind',
        press(true) && doc.activeElement === submit, doc.activeElement.name);
    doc.activeElement = doc.body;
    check('focus trap: Tab with focus dropped to <body> lands on the first control',
        press(false) && doc.activeElement === close, doc.activeElement.name);
    input.focus();
    check('focus trap: Tab between controls is left to the browser', press(false) === false && doc.activeElement === input);
    submit.focus();
    check('focus trap: Tab from the last control wraps to the first', press(false) && doc.activeElement === close);
    const alertButton = el('puter-alert-ok', true);
    alertButton.focus();
    check('focus trap: focus in something opened over the dialog (a Puter alert) is not pulled back',
        press(false) === false && doc.activeElement === alertButton);
    release();
    check('focus trap: closing the dialog removes its listener', listeners.length === 0);
}

if (failures) { console.error(`\n${failures} confirm-modal check(s) failed.`); process.exit(1); }
console.log('\nAll confirm-modal key checks passed.');
