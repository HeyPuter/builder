import fs from 'node:fs';

// ---- Regression guard: a press inside a Puter dialog is not a press outside --
// puter.ui.alert / prompt, the context menu and the pickers are custom elements
// appended to <body>, outside every panel of ours. The buttons in their shadow
// roots don't stop their clicks, so a press on OK / Yes / No bubbles to document
// with the dialog host as its target — and every "click outside closes" handler
// read it as a click outside: a failed publish's alert closed the publish
// popover and dropped the typed address it had just promised to keep; an invalid
// address in the Settings dialog collapsed the sidebar under it; "No" to leaving
// a running project closed the project list.
//
// Runs the real isInPuterDialog against a tiny DOM, and checks every outside-
// press closer consults it.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const ui = read('../src/js/ui.js');
const issues = read('../src/js/issues.js');
const versions = read('../src/js/versions.js');

// --- the predicate ------------------------------------------------------------
{
    const a = ui.indexOf('const PUTER_DIALOG_SELECTOR =');
    const b = ui.indexOf('window.isInPuterDialog = isInPuterDialog;', a);
    check('isInPuterDialog is defined in ui.js', a > 0 && b > a);
    // Minimal jQuery: closest(selector) walks up by tag name.
    const $ = (el) => ({
        closest(selector) {
            const tags = selector.split(',').map((t) => t.trim().toUpperCase());
            for (let n = el; n; n = n.parent) if (tags.includes(n.tagName)) return [n];
            return [];
        },
    });
    const isIn = new Function('$', ui.slice(a, b) + '\nreturn isInPuterDialog;')($);
    const body = { tagName: 'BODY', parent: null };
    const panel = { tagName: 'DIV', parent: body };
    const alertHost = { tagName: 'PUTER-ALERT', parent: body };   // what document sees for a shadow-root button
    const promptHost = { tagName: 'PUTER-PROMPT', parent: body };
    const insideDialog = { tagName: 'BUTTON', parent: { tagName: 'PUTER-DIALOG', parent: body } };
    check('the retargeted alert host counts as inside a dialog', isIn(alertHost) === true);
    check('so does a prompt', isIn(promptHost) === true);
    check('and a descendant of a dialog', isIn(insideDialog) === true);
    check('an ordinary element does not', isIn(panel) === false && isIn(body) === false);
    check('a missing target does not throw', isIn(null) === false && isIn(undefined) === false);
}

// --- every outside-press closer consults it ----------------------------------
// The body of the undelegated handler whose guard variable is `flag`.
function closer(src, event, flag) {
    const re = new RegExp(`\\$\\(document\\)\\.on\\('${event}', function ?\\(e\\) \\{\\s*(?://[^\\n]*\\n\\s*)*if \\(!${flag}\\) return;`);
    const m = re.exec(src);
    if (!m) return '';
    return src.slice(m.index, src.indexOf('});', m.index) + 3);
}
const closers = [
    ['publish popover', ui, 'click', '_publishPanelOpen'],
    ['share popover', ui, 'click', '_sharePanelOpen'],
    ['device panel', ui, 'click', '_devicePanelOpen'],
    ['projects sidebar', ui, 'click', 'chatHistorySidebarOpen'],
    ['account panel', ui, 'pointerdown', 'userPanelOpen'],
    ['overflow menu', ui, 'pointerdown', 'overflowMenuOpen'],
    ['issues panel', issues, 'click', 'panelOpen'],
    ['versions panel', versions, 'click', 'panelOpen'],
];
for (const [name, src, event, flag] of closers) {
    const body = closer(src, event, flag);
    check(`${name}: its outside-${event} closer ignores a press inside a Puter dialog`,
        body.length > 0 && /isInPuterDialog(\?\.)?\(e\.target\)\) return;/.test(body), body.slice(0, 200) || '(handler not found)');
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll Puter-dialog click checks passed.');
