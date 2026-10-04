import fs from 'node:fs';

// ---- Regression guard: a menu closed from the keyboard leaves no "open" state --
// The project ⋮ menu and the preview "…" menu are puter.ui.contextMenu
// popups. Puter's menu drives the keyboard from its own capture-phase listener
// and swallows those keys, so after Escape (or an item chosen with Enter) the
// buttons' "open" state outlived the menu: the entry stayed highlighted, the
// "…" button kept aria-expanded="true", and the next Enter on the button only
// "closed" the menu that was already gone — it took a second press to open it.
// The menu's close event now resets that state — except for a pointer close,
// which the buttons' own handlers manage (their click-again toggle needs the
// state to survive the menu's close inside the press).
//
// Functional for onContextMenuKeyboardClose (the real code with a fake
// document); text-level for its wiring into both menus.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const ui = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const start = ui.indexOf('let _lastInputWasKeyboard = false;');
const fnAt = ui.indexOf('function onContextMenuKeyboardClose(onClose) {');
const end = ui.indexOf('\n}\n', fnAt);
if (start < 0 || fnAt < 0) throw new Error('could not extract onContextMenuKeyboardClose from ui.js');
const CODE = ui.slice(start, end + 2);

const tasks = [];
const setTimeout = (fn) => { tasks.push(fn); };
const runTasks = () => { while (tasks.length) tasks.shift()(); };
const captured = {};
let menus = [];
const document = {
    addEventListener: (t, fn, capture) => { if (capture) (captured[t] ||= []).push(fn); },
    querySelectorAll: () => menus,
};
const win = {};
const api = new Function('window', 'document', 'setTimeout', CODE + '\nreturn { onContextMenuKeyboardClose, modality: () => _lastInputWasKeyboard };')(win, document, setTimeout);
const press = (type) => (captured[type] || []).forEach((fn) => fn({ type }));
const openMenu = () => { const m = new EventTarget(); menus = [m]; return m; };

{
    const menu = openMenu();
    let closed = 0;
    api.onContextMenuKeyboardClose(() => closed++);
    press('keydown');
    menu.dispatchEvent(new Event('close'));   // Escape inside the menu
    check('Escape (a keyboard close) resets the button state', closed === 1);
    menu.dispatchEvent(new Event('close'));
    check('…once', closed === 1);
}
{
    const menu = openMenu();
    let closed = 0;
    api.onContextMenuKeyboardClose(() => closed++);
    press('pointerdown');                     // a press on the ⋮ itself / outside
    menu.dispatchEvent(new Event('close'));   // the menu's own capture listener closes it, mid-press
    runTasks();
    check('a pointer close is left to the buttons\' handlers (their click-again toggle)', closed === 0);
}
{
    const menu = openMenu();
    let closed = 0;
    api.onContextMenuKeyboardClose(() => closed++);
    press('pointerdown');
    runTasks();                               // the press is over…
    menu.dispatchEvent(new Event('close'));   // …and an item's click action closes the menu
    check('a close after the press has ended (an item clicked) resets the state too', closed === 1);
}
{
    menus = [];
    let threw = false;
    try { api.onContextMenuKeyboardClose(() => {}); } catch (e) { threw = true; }
    check('no menu rendered (inside the Puter desktop): nothing to watch, no error', !threw);
}
{
    press('keydown');
    check('keyboard use is remembered', api.modality() === true);
    check('…and readable app-wide', win.lastInputWasKeyboard() === true);
    press('pointerdown');
    check('…and a press switches it back to pointer', api.modality() === false && win.lastInputWasKeyboard() === false);
}

// ---- Wiring ------------------------------------------------------------------
{
    const chatMenu = ui.slice(ui.indexOf("$(document).on('click', '.chat-menu-btn', function(e) {"));
    const chatMenuBody = chatMenu.slice(0, chatMenu.indexOf('\n});\n'));
    check('the ⋮ menu clears its held highlight and toggle flag on a keyboard close',
        /onContextMenuKeyboardClose\(\(\) => \{\s*\$\('\.chat-item'\)\.removeClass\('menu-open'\);\s*openChatMenuBtn = null;\s*\}\);/.test(chatMenuBody));
    const overflow = ui.slice(ui.indexOf("$(document).on('click', '.preview-overflow', function(e) {"));
    const overflowBody = overflow.slice(0, overflow.indexOf('\n});\n'));
    check('the "…" menu clears aria-expanded and its flag on a keyboard close',
        /onContextMenuKeyboardClose\(\(\) => \{\s*overflowMenuOpen = false;\s*\$\(trigger\)\.attr\('aria-expanded', 'false'\);\s*\}\);/.test(overflowBody));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll menu keyboard-close checks passed.');
