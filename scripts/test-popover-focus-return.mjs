import fs from 'node:fs';

// ---- Regression guard: closing a toolbar popover hands focus back -----------
// Each preview-toolbar popover is removed or hidden when closed. When focus was
// on its ✕ (or anywhere inside it), focus fell to <body>: the next Tab started
// over from the top of the page and a screen reader lost its place. Every close
// path a user triggers from inside the popover returns focus to the toolbar
// button that opened it. The versions panel's ✕ was the one that didn't.
//
// Text-level: each close handler is located and must refocus its trigger.
// The publish popover also keeps focus across its own re-renders (below).

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

// ---- Focus inside the publish popover survives its own re-renders ------------
// The popover's body is rebuilt whenever the publish state changes under it (a
// turn ending, a snapshot landing) and on every step of the publish/address
// flows. Focus on a control in the body went down with the old markup — to
// <body>, out of the open popover — and leaving the address editor (✕, Escape,
// saving the same or a new name) hid the field holding focus, with the same
// result. Runs the real keepPublishPanelFocus against a small fake DOM/jQuery.
{
    const a = ui.indexOf('function keepPublishPanelFocus($panel) {');
    const b = ui.indexOf('\n}\n', a);
    check('keepPublishPanelFocus is present', a >= 0);
    const doc = { activeElement: null };
    const mk = (classes, attrs = {}, visible = true) => {
        const classList = Object.assign([...classes], { contains(c) { return this.includes(c); } });
        const el = { classList, attrs, visible, value: 'my-site', sel: null,
            getAttribute: (k) => attrs[k] ?? null,
            focus() { doc.activeElement = el; },
            setSelectionRange(x, y) { el.sel = [x, y]; } };
        return el;
    };
    let bodyEls = [];
    const panelEl = { name: 'panel', focus() { doc.activeElement = panelEl; } };
    const bodyEl = { contains: (x) => bodyEls.includes(x) };
    const matches = (el, selector) => {
        const m = selector.match(/^\.([\w-]+)(?:\[data-action="([^"]+)"\])?$/);
        return m && el.classList.includes(m[1]) && (!m[2] || el.attrs['data-action'] === m[2]);
    };
    const $panel = {
        0: panelEl,
        find(selector) {
            if (selector === '.publish-panel-body') return Object.assign([bodyEl], { length: 1 });
            const found = bodyEls.filter((el) => matches(el, selector));
            return { filter: () => found.filter((el) => el.visible) };
        },
        trigger(ev) { if (ev === 'focus') panelEl.focus(); },
    };
    const keep = new Function('document', ui.slice(a, b + 2) + '\nreturn keepPublishPanelFocus;')(doc);

    const copy = mk(['publish-icon-btn', 'publish-copy']);
    bodyEls = [copy]; copy.focus();
    let restore = keep($panel);
    const copy2 = mk(['publish-icon-btn', 'publish-copy']);
    bodyEls = [copy2];   // the body was rebuilt
    restore();
    check('re-render: focus returns to the same control in the new body', doc.activeElement === copy2);

    const publish = mk(['publish-action'], { 'data-action': 'publish' });
    bodyEls = [publish]; publish.focus();
    restore = keep($panel);
    bodyEls = [mk(['publish-uptodate'])];   // now up to date: no Publish button
    restore();
    check('re-render: a control that is gone hands focus to the popover itself', doc.activeElement === panelEl);

    const name = mk(['publish-name-input']);
    bodyEls = [name]; name.focus();
    restore = keep($panel);
    const name2 = mk(['publish-name-input']);
    bodyEls = [name2];
    restore();
    check('re-render: the first-publish name field keeps focus, caret at the end', doc.activeElement === name2 && name2.sel && name2.sel[0] === 7);

    const elsewhere = { name: 'composer' };
    doc.activeElement = elsewhere;
    restore = keep($panel);
    bodyEls = [mk(['publish-copy'])];
    restore();
    check('re-render: focus outside the popover is left where it is', doc.activeElement === elsewhere);

    const fn = ui.slice(ui.indexOf('function renderPublishPanel() {'), a);
    const returns = (fn.match(/\n        return;/g) || []).length;
    const restores = (fn.match(/restoreFocus\(\);/g) || []).length;
    check('renderPublishPanel restores focus on every path (success, progress, form)',
        /const restoreFocus = keepPublishPanelFocus\(\$panel\);/.test(fn) && restores === returns + 1, `returns=${returns} restores=${restores}`);

    const end = ui.slice(ui.indexOf('function endPublishAddressEdit($panel) {'), ui.indexOf("$(document).on('click', '.publish-address-cancel'"));
    check('leaving the address editor moves focus to "Change address"', /\.publish-change-address/.test(end) && /focus\(/.test(end));
    check('…on ✕ / Escape', /on\('click', '\.publish-address-cancel', function \(\) \{\s*endPublishAddressEdit\(/.test(ui));
    check('…on saving the same name', /if \(newSub === oldSub\) \{ endPublishAddressEdit\(\$panel\); return; \}/.test(ui));
    check('…and after saving a new one', /renderPublishPanel\(\);\s*endPublishAddressEdit\(\$panel\);/.test(ui));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll popover focus-return checks passed.');
