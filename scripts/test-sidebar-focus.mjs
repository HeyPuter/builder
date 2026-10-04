import fs from 'node:fs';

// ---- Regression guard: keyboard focus survives sidebar actions ---------------
// Focus on a sidebar entry fell to <body> — so the next Tab started over from
// the top of the page and a screen reader lost its place — after:
//   * pinning/unpinning (the list rebuilds and the entry moves section), a
//     rename landing, another project's AI title arriving mid-build: every
//     rebuild of the list replaced the focused link/⋮;
//   * finishing a rename with Enter/✓ or cancelling with Escape/✕: the editor
//     holding focus was swapped for the plain title;
//   * opening a project from the keyboard: the sidebar closed around the
//     focused entry.
// Now a rebuild hands focus to the same control on the rebuilt entry (or, if
// the entry is gone, to the one in its place), a rename returns it to the
// entry's ⋮, and a keyboard open puts it in the composer once the project is
// in. A tap or click moves nothing (no phone keyboard popping up).
//
// Text-level; the flows were checked end to end in the browser.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const app = read('../src/js/app.js');
const ui = read('../src/js/ui.js');

{
    const fn = app.slice(app.indexOf('function updateChatHistorySidebar() {'), app.indexOf('function applyChatSearchFilter('));
    check('a rebuild notes which entry control had focus (link, ⋮ or address)',
        /\['chat-menu-btn', 'chat-app-link', 'chat-item-link'\]\.find\(/.test(fn) && /let refocus = null;/.test(fn));
    check('…and is noted before the list is emptied', fn.indexOf('let refocus = null;') < fn.indexOf('chatList.empty();'));
    check('focus goes back to the same control on the rebuilt entry, else to the entry in its place, else the search box',
        /\.find\('\.' \+ refocus\.control\)/.test(fn) && /\$shown\.eq\(/.test(fn) && /sidebar\.find\('\.chat-search-input'\)/.test(fn));
    check('…restored after a full rebuild and when the list became empty',
        (fn.match(/restoreListFocus\(\);/g) || []).length === 2);
    check('…without scrolling the list for a mouse user', /focus\(\{ preventScroll: !window\.lastInputWasKeyboard\?\.\(\) \}\)/.test(fn));
}
{
    const rename = ui.slice(ui.indexOf('function startRenameChat('), ui.indexOf('let settled = false;', ui.indexOf('function startRenameChat(')));
    check('finishing or cancelling a rename from the editor returns focus to the entry\'s ⋮',
        /const hadFocus = \$edit\[0\]\.contains\(document\.activeElement\);/.test(rename) && /if \(hadFocus\) \$entry\.find\('\.chat-menu-btn'\)\.trigger\('focus'\);/.test(rename));
}
{
    const fn = ui.slice(ui.indexOf('function focusComposerAfterSidebarOpen() {'), ui.indexOf("$(document).on('click', '.chat-item', async function(e) {"));
    check('the composer handoff is for keyboard use only', /if \(!_lastInputWasKeyboard\) return;/.test(fn));
    check('…and leaves focus that has gone elsewhere alone', /closest\('\.chat-history-sidebar'\)/.test(fn));
    check('opening a project from the sidebar hands focus over once it is in (or failed)',
        (ui.match(/loadChat\(chatId\)\.catch\(\(\) => \{\}\)\.then\(focusComposerAfterSidebarOpen\);/g) || []).length === 2);
    check('…and for the already-open project too',
        (ui.match(/closeChatHistorySidebar\(\);\s*focusComposerAfterSidebarOpen\(\);\s*return;/g) || []).length === 2);
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll sidebar focus checks passed.');
