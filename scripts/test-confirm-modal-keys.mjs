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

if (failures) { console.error(`\n${failures} confirm-modal check(s) failed.`); process.exit(1); }
console.log('\nAll confirm-modal key checks passed.');
