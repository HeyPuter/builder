import fs from 'node:fs';

// ---- Regression guard: the account panel's theme control is a real radio group
// It is announced as a radio group ("radio button, 1 of 3") but worked like
// three separate buttons: every option was a Tab stop and the arrow keys did
// nothing. Now only the chosen option is a Tab stop, and the arrow keys move
// to and choose the next/previous option (wrapping), with Home/End.
//
// Runs the real keydown handler with a fake jQuery; text-level for tabindex.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const ui = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const start = ui.indexOf("$(document).on('keydown', '.user-theme-opt', function(e) {");
const end = ui.indexOf('\n});\n', start) + 5;
if (start < 0) throw new Error('could not find the theme keydown handler');
const HANDLER = ui.slice(start, end);

let focused = null, chosen = null;
const opts = ['light', 'dark', 'device'].map((key) => ({ key, focus() { focused = key; } }));
let handler = null;
const $ = (x) => {
    if (x && x.nodeType === 9) return { on: (ev, sel, fn) => { handler = fn; } };
    if (opts.includes(x)) return {
        closest: () => ({ find: () => Object.assign([...opts], { index: (el) => opts.indexOf(el) }) }),
        data: () => x.key,
    };
    throw new Error('unexpected $ arg');
};
new Function('$', 'document', 'setThemeChoice', HANDLER)($, { nodeType: 9 }, (k) => { chosen = k; });
const press = (from, key) => {
    focused = chosen = null;
    let prevented = false;
    handler.call(opts.find((o) => o.key === from), { key, preventDefault() { prevented = true; } });
    return { focused, chosen, prevented };
};

let r = press('light', 'ArrowRight');
check('ArrowRight moves to and chooses the next option', r.focused === 'dark' && r.chosen === 'dark' && r.prevented);
r = press('device', 'ArrowRight');
check('…wrapping from the last to the first', r.focused === 'light' && r.chosen === 'light');
r = press('light', 'ArrowLeft');
check('ArrowLeft wraps from the first to the last', r.focused === 'device' && r.chosen === 'device');
r = press('dark', 'ArrowUp');
check('ArrowUp goes back too', r.focused === 'light');
r = press('light', 'ArrowDown');
check('ArrowDown goes forward too', r.focused === 'dark');
r = press('dark', 'End');
check('End chooses the last option', r.chosen === 'device');
r = press('dark', 'Home');
check('Home chooses the first option', r.chosen === 'light');
r = press('dark', 'Tab');
check('other keys (Tab, Enter, Space) are left alone', r.focused === null && r.chosen === null && !r.prevented);

check('only the chosen option is a Tab stop when the panel opens',
    /role="radio" aria-checked="\$\{active \? 'true' : 'false'\}" tabindex="\$\{active \? '0' : '-1'\}"/.test(ui));
check('…and the Tab stop follows the choice', /\.attr\('aria-checked', active \? 'true' : 'false'\)\s*\.attr\('tabindex', active \? '0' : '-1'\)/.test(ui));

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll theme radio-group checks passed.');
