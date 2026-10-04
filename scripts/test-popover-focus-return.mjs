import fs from 'node:fs';

// ---- Regression guard: closing a toolbar popover hands focus back -----------
// Each preview-toolbar popover is removed or hidden when closed. When focus was
// on its ✕ (or anywhere inside it), focus fell to <body>: the next Tab started
// over from the top of the page and a screen reader lost its place. Every close
// path a user triggers from inside the popover returns focus to the toolbar
// button that opened it. The versions panel's ✕ was the one that didn't.
//
// Text-level: each close handler is located and must refocus its trigger.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const versions = read('../src/js/versions.js');
const ui = read('../src/js/ui.js');

// The body of the delegated handler bound for `selector` (up to its closing `});`).
function handler(src, event, selector) {
    const at = src.indexOf(`$(document).on('${event}', '${selector}'`);
    if (at < 0) return '';
    return src.slice(at, src.indexOf('});', at) + 3);
}

const cases = [
    ['versions panel ✕', versions, '.versions-panel-close', '.preview-versions'],
    ['publish popover ✕', ui, '.publish-panel-close', '.preview-publish-btn'],
    ['share popover ✕', ui, '.share-panel-close', '.preview-share'],
    ['device panel ✕', ui, '.device-panel-close', '.preview-device-trigger'],
];
for (const [name, src, sel, trigger] of cases) {
    const body = handler(src, 'click', sel);
    check(`${name}: hands focus back to its toolbar button`,
        body.length > 0 && body.includes(`$('${trigger}').trigger('focus')`), body.slice(0, 300) || '(handler not found)');
}

// Escape inside the versions panel already did; keep it that way.
{
    const at = versions.indexOf("$(document).on('keydown', '.preview-versions-panel'");
    const body = versions.slice(at, versions.indexOf("if (e.key === 'Escape')", at) + 200);
    check('versions panel Escape: hands focus back too', /closeVersionsPanel\(\);\s*\$\('\.preview-versions'\)\.trigger\('focus'\)/.test(body));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll popover focus-return checks passed.');
