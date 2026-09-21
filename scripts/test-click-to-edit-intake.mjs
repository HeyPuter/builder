import fs from 'node:fs';

// ---- Regression guard: a "selected element" message is data, and only counts
// while the user is actually picking -------------------------------------------
// The click-to-edit bridge (runtime.js) posts a locator for the element the
// user clicked in the preview. The preview is the generated app — code the
// model wrote, plus whatever it embeds — so the same channel is open to any
// script in the frame, at any time, with any payload. The builder used to
// accept such a message whether or not select mode was armed and fold its
// text/outerHTML verbatim into the user's next message as "the element they
// clicked": a page could raise the editing chip on its own and plant text in
// the prompt, and an oversized payload was persisted into the message for good.
// Now: accepted only while the toolbar's select tool is armed, every field is
// clipped to the bridge's own limits, and the free-text fields are fenced as
// untrusted data in the note the model reads.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const ui = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const runtime = fs.readFileSync(new URL('../src/runtime.js', import.meta.url), 'utf8');

// --- sanitizeEditTarget (real code) ----------------------------------------
const a = ui.indexOf('const EDIT_TARGET_LIMITS =');
const b = ui.indexOf('window.sanitizeEditTarget = sanitizeEditTarget;');
if (a < 0 || b <= a) throw new Error('could not extract sanitizeEditTarget from ui.js');
const sanitizeEditTarget = new Function(ui.slice(a, b) + '\nreturn sanitizeEditTarget;')();

{
    const big = 'x'.repeat(5_000_000);
    const out = sanitizeEditTarget({ type: 'puter-element-selected', tag: 'BUTTON', id: 'go', className: 'a b', selector: 'body > button', text: 'Sign up', html: big });
    check('a normal pick keeps its fields', out.tag === 'button' && out.id === 'go' && out.className === 'a b' && out.text === 'Sign up');
    check('html is clipped to the bridge limit (800) + an ellipsis', out.html.length === 801 && out.html.endsWith('…'));
    check('the message type and other stray keys are not carried', !('type' in out));
}
{
    const runtimeText = Number((runtime.match(/var MAX_TEXT = (\d+)/) || [])[1]);
    const runtimeHtml = Number((runtime.match(/var MAX_HTML = (\d+)/) || [])[1]);
    const limits = new Function(ui.slice(a, ui.indexOf(';', a) + 1) + '\nreturn EDIT_TARGET_LIMITS;')();
    check('builder text/html caps match the bridge\'s own', limits.text === runtimeText && limits.html === runtimeHtml);
}
{
    const ctl = String.fromCharCode(0) + String.fromCharCode(7);
    const out = sanitizeEditTarget({ tag: '<script>', id: 42, className: { toString() { return 'obj'; } }, text: 'a' + ctl + 'b\n\tc', html: null });
    check('a tag name is reduced to letters/digits/hyphens', out.tag === 'script');
    check('non-string fields are coerced', out.id === '42' && out.className === 'obj' && out.html === '');
    check('control characters are stripped from text (newline/tab kept)', out.text === 'ab\n\tc');
    check('a non-object payload yields null', sanitizeEditTarget(null) === null && sanitizeEditTarget('x') === null);
}

// --- wiring ----------------------------------------------------------------
const h0 = ui.indexOf("event.data.type !== 'puter-element-selected'");
const handler = ui.slice(h0, ui.indexOf('});', h0));
check('the selection handler still requires the trusted preview frame', handler.includes('isTrustedPreviewMessage(event)'));
check('… and is ignored unless select mode is armed',
    handler.includes("if (!$('.preview-select-element').hasClass('active')) return;"));
check('… and the payload is sanitized before it becomes the edit target',
    handler.includes('window.setEditTarget(sanitizeEditTarget(event.data))'));
check('the armed check runs before the target is set',
    handler.indexOf("hasClass('active')") < handler.indexOf('setEditTarget('));

const n0 = app.indexOf('The user clicked a specific element in the live preview');
const note = app.slice(n0 - 600, n0 + 1600);
check('the model note labels the element details as untrusted data', /untrusted data/.test(note));
check('visible text is fenced in the note', /Visible text:\\n\$\{fence\(t\.text\)\}/.test(note));
check('outer HTML is fenced in the note', /Outer HTML:\\n\$\{fence\(t\.html\)\}/.test(note));
check('tag/id/class/selector go through the inline sanitizer', /inline\(t\.tag \|\| 'unknown', 32\)/.test(note) && /inline\(t\.selector, 500\)/.test(note));

if (failures) { console.error(`\n${failures} click-to-edit intake check(s) failed.`); process.exit(1); }
console.log('\nAll click-to-edit intake checks passed.');
