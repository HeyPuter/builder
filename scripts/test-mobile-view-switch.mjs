import fs from 'node:fs';

// ---- Regression guard: the phone chat ⇄ app switcher keeps focus, and the ---
// ---- covered chat is out of reach -------------------------------------------
// On a phone the app preview is a full-screen layer over the chat, and there
// is one switcher in each pane's toolbar. Pressing a segment hid the pane
// holding the pressed button, dropping focus (VoiceOver's or the keyboard's) to
// <body> on every switch. And in app view the chat was only covered, not
// hidden: Tab and a screen reader's swipe walked into the messages and
// composer underneath.
//
// Functional for syncCoveredChatInert's rule (the real function with a fake
// jQuery); text-level for the wiring.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const ui = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');

{
    const a = ui.indexOf('function syncCoveredChatInert() {');
    const b = ui.indexOf('\n}\n', a);
    check('syncCoveredChatInert is present', a >= 0);
    let classes = new Set(), mobile = true;
    const main = { attrs: new Set(), hasAttribute(k) { return this.attrs.has(k); }, toggleAttribute(k, on) { if (on) this.attrs.add(k); else this.attrs.delete(k); } };
    const $ = (sel) => (sel === 'body'
        ? { hasClass: (c) => classes.has(c) }
        : { each: (fn) => [main].forEach((el) => fn.call(el)) });
    const sync = new Function('$', 'window', ui.slice(a, b + 2) + '\nreturn syncCoveredChatInert;')($, { isMobileViewport: () => mobile });
    const state = (cls, isMobile) => { classes = new Set(cls); mobile = isMobile; sync(); return main.hasAttribute('inert'); };
    check('phone, app view (preview covering the chat): the chat is inert', state(['preview-active'], true) === true);
    check('phone, chat view: not inert', state(['preview-active', 'mobile-view-chat'], true) === false);
    check('phone, no preview: not inert', state([], true) === false);
    check('desktop with the preview docked beside the chat: not inert', state(['preview-active'], false) === false);
    check('back to app view on the phone: inert again', state(['preview-active'], true) === true);
    check('preview closed: the chat is usable again', state(['mobile-view-chat'], true) === false);
}
{
    const ready = ui.slice(ui.indexOf('function syncCoveredChatInert() {'), ui.indexOf('function syncCoveredChatInert() {') + 1600);
    check('recomputed on every body class change (it can never outlive the cover)',
        /new MutationObserver\(syncCoveredChatInert\)\.observe\(document\.body, \{ attributes: true, attributeFilter: \['class'\] \}\)/.test(ready));
    check('…and when the viewport crosses the phone breakpoint',
        /matchMedia\('\(max-width: 900px\)'\)/.test(ready) && /addEventListener\('change', syncCoveredChatInert\)/.test(ready));
    const click = ui.slice(ui.indexOf("$(document).on('click', '.view-seg-btn', function() {"));
    const body = click.slice(0, click.indexOf('\n});\n'));
    check('a switch hands focus to the same segment in the switcher now showing',
        /if \(!\$\(this\)\.is\(':visible'\)\)/.test(body) && /\$\(this\)\.data\('view'\) === view && \$\(this\)\.is\(':visible'\)/.test(body) && /\.trigger\('focus'\)/.test(body));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll mobile view-switch checks passed.');
