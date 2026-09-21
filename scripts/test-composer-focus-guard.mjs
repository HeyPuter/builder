import fs from 'node:fs';

// ---- Regression guard: turn-end resets must not steal focus ----------------
// resetUIState (end of every turn) and resetUIForAbort (Stop) put the cursor
// back in the composer. They used to do so unconditionally, so a build that
// finished while the user was typing in the sidebar search, renaming a project
// (the rename editor cancels on blur — the rename was silently lost), choosing
// a publish address, or using their app inside the preview iframe pulled the
// cursor into the composer mid-word. composerMayTakeFocus() (ui.js) is the
// shared gate: only body/html, the composer itself, or its Send/Stop button
// may yield focus. This evaluates the REAL function against a stub DOM.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const UI = new URL('../src/js/ui.js', import.meta.url);
const src = fs.readFileSync(UI, 'utf8');
const a = src.indexOf('function composerMayTakeFocus(');
const b = src.indexOf('\n}\n', a);
if (a < 0 || b <= a) throw new Error('could not extract composerMayTakeFocus from ui.js');
const block = src.slice(a, b + 3);

// Both turn-end resets and the window-focus handler must route through it.
check('resetUIState gates its composer focus on composerMayTakeFocus', (() => {
    const i = src.indexOf('function resetUIState(');
    const j = src.indexOf('flushPreviewRefresh();', i);
    return /composerMayTakeFocus\(\)\)\s*\$\('\.chat-input-message'\)\.focus\(\)/.test(src.slice(i, j));
})());
check('resetUIForAbort gates its composer focus on composerMayTakeFocus', (() => {
    const i = src.indexOf('function resetUIForAbort(');
    const j = src.indexOf('function resetUIState(', i);
    return /composerMayTakeFocus\(\)\)\s*\$\('\.chat-input-message'\)\.focus\(\)/.test(src.slice(i, j));
})());

function mayTakeFocus({ active, modal = false }) {
    const body = { tag: 'body' }, html = { tag: 'html' };
    const el = active === 'body' ? body : active === 'html' ? html
        : active == null ? null : { tag: 'el', className: active };
    const document = {
        body, documentElement: html, activeElement: el,
        querySelector: (sel) => (sel === '.confirm-modal-overlay' && modal) ? {} : null,
    };
    const $ = (node) => ({ hasClass: (c) => !!(node && typeof node.className === 'string' && node.className.split(/\s+/).includes(c)) });
    return new Function('$', 'document', block + '\nreturn composerMayTakeFocus();')($, document);
}

check('nothing focused (body) → composer may take focus', mayTakeFocus({ active: 'body' }) === true);
check('nothing focused (html) → composer may take focus', mayTakeFocus({ active: 'html' }) === true);
check('activeElement null → composer may take focus', mayTakeFocus({ active: null }) === true);
check('composer itself focused → allowed', mayTakeFocus({ active: 'chat-input-message' }) === true);
check('Send/Stop button focused (mouse send) → allowed', mayTakeFocus({ active: 'send processing' }) === true);
check('sidebar search focused → refused', mayTakeFocus({ active: 'chat-search-input' }) === false);
check('rename editor focused → refused', mayTakeFocus({ active: 'chat-title-input' }) === false);
check('publish address field focused → refused', mayTakeFocus({ active: 'publish-name-input' }) === false);
check('preview iframe focused → refused', mayTakeFocus({ active: 'preview-frame' }) === false);
check('confirm modal open, nothing focused → refused', mayTakeFocus({ active: 'body', modal: true }) === false);

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll composer focus-guard checks passed.');
