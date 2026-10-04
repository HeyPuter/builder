import fs from 'node:fs';

// ---- Regression guard: an entry being deleted or duplicated is off-limits ----
// .chat-item.deleting / .duplicating dim the entry and set pointer-events:none
// — which only stops pointers. The keyboard went straight through: Enter on the
// entry opened (or, via its link, navigated to) a project mid-delete, and its ⋮
// offered Delete or Duplicate again. A list rebuild mid-way (any save) also
// dropped the classes, making it clickable again. Both states now go through
// markChatItemBusy (classes + aria-disabled), rebuilt entries re-apply them,
// and the click/⋮ handlers refuse a busy entry.
//
// Functional for markChatItemBusy (the real function, fake jQuery); text-level
// for the wiring.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const app = read('../src/js/app.js');
const ui = read('../src/js/ui.js');

{
    const a = app.indexOf('function markChatItemBusy($item, cls, on) {');
    const b = app.indexOf('\n}\n', a);
    check('markChatItemBusy is present', a >= 0);
    const classes = new Set();
    const attrs = {};
    const $item = {
        toggleClass(c, on) { if (on) classes.add(c); else classes.delete(c); return this; },
        hasClass: (c) => classes.has(c),
        find: () => ({ attr: (k, v) => { if (v === null) delete attrs[k]; else attrs[k] = v; } }),
    };
    const mark = new Function(app.slice(a, b + 2) + '\nreturn markChatItemBusy;')();
    mark($item, 'deleting', true);
    check('busy: dimmed class + announced as unavailable', classes.has('deleting') && attrs['aria-disabled'] === 'true');
    mark($item, 'duplicating', true);
    mark($item, 'deleting', false);
    check('still unavailable while the other operation runs', attrs['aria-disabled'] === 'true' && !classes.has('deleting'));
    mark($item, 'duplicating', false);
    check('available again once both are done', !('aria-disabled' in attrs) && classes.size === 0);
}
{
    check('a rebuilt entry stays busy while it is still deleting or duplicating',
        /if \(_deletedChatIds\.has\(chat\.id\)\) markChatItemBusy\(chatItem, 'deleting', true\);/.test(app)
        && /if \(_duplicatingChats\.has\(chat\.id\)\) markChatItemBusy\(chatItem, 'duplicating', true\);/.test(app));
    check('duplicate marks and clears the entry through markChatItemBusy',
        /markChatItemBusy\(\$\(`\.chat-item\[data-chat-id="\$\{chatId\}"\]`\), 'duplicating', true\);/.test(app)
        && /markChatItemBusy\(\$\(`\.chat-item\[data-chat-id="\$\{chatId\}"\]`\), 'duplicating', false\);/.test(app));
    check('…and so does delete (looked up again on failure, in case it was rebuilt)',
        (ui.match(/markChatItemBusy\(\$\(`\.chat-item\[data-chat-id="\$\{chatId\}"\]`\), 'deleting', (true|false)\);/g) || []).length === 2);
    check('no stray direct class toggles bypass it', !/addClass\('deleting'\)|removeClass\('deleting'\)|addClass\('duplicating'\)|removeClass\('duplicating'\)/.test(app + ui));
    const click = ui.slice(ui.indexOf("$(document).on('click', '.chat-item', async function(e) {"));
    check('the entry\'s click refuses a busy entry — and stops its link navigating',
        /if \(\$\(this\)\.is\('\.deleting, \.duplicating'\)\) \{ e\.preventDefault\(\); return; \}/.test(click.slice(0, 800)));
    const menu = ui.slice(ui.indexOf("$(document).on('click', '.chat-menu-btn', function(e) {"));
    check('its ⋮ refuses too', /if \(\$\(this\)\.closest\('\.chat-item'\)\.is\('\.deleting, \.duplicating'\)\) return;/.test(menu.slice(0, 400)));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll busy-entry checks passed.');
