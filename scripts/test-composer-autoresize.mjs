import fs from 'node:fs';

// ---- Regression guard for the composer's auto-resize ----------------------
// autoResizeTextarea's body is a forced synchronous layout: it writes
// style.height, then reads scrollHeight, which makes the engine flush layout
// on the spot. The composer binds it to `input keydown keyup keypress paste`
// (ui.js), so a single keystroke ran it four times — and three of those runs
// measure text identical to, or older than, what the first already measured
// (keydown and paste both fire before the character lands). Measured on a
// 3,000-node conversation that was ~1.2ms of layout per keypress for one useful
// result; skipping the redundant passes brought it to ~0.67ms.
//
// The skip must never cost a resize that is actually due. Two things make it
// due: the text changed, or something else reset the height (new_chat and the
// post-send reset both set it straight to 40px) — hence the height half of the
// guard. This evaluates the REAL function against a fake textarea whose
// scrollHeight is only meaningful while height is 'auto' (as in a browser) and
// which counts every measurement.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? ' — ' + detail : '')); failures++; }
}

const src = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const a = src.indexOf('function autoResizeTextarea(');
const b = src.indexOf('\n}', a);
if (a < 0 || b <= a) throw new Error('could not extract autoResizeTextarea from helpers.js');
const autoResizeTextarea = new Function(src.slice(a, b + 2) + '\nreturn autoResizeTextarea;')();

const LINE = 18, CHROME = 62, CAP = 200;
function makeTextarea() {
    const el = {
        value: '',
        style: { height: '' },
        measurements: 0,
        get scrollHeight() {
            this.measurements++;
            // A real textarea only reports its content height once the explicit
            // height is released; otherwise it reports the height it was given.
            if (this.style.height !== 'auto') return parseInt(this.style.height, 10) || 0;
            return CHROME + LINE * Math.max(1, String(this.value).split('\n').length);
        },
    };
    return el;
}
const expected = (value) => Math.min(CAP, CHROME + LINE * Math.max(1, String(value).split('\n').length)) + 'px';

// One "keystroke" = the five events the composer binds, in browser order.
// keydown/paste fire BEFORE the character lands, so they see the previous text.
function keystroke(el, nextValue) {
    autoResizeTextarea(el);          // keydown  (old text)
    el.value = nextValue;
    autoResizeTextarea(el);          // keypress
    autoResizeTextarea(el);          // input
    autoResizeTextarea(el);          // keyup
}

// === One measurement per keystroke, not four ==============================
{
    const el = makeTextarea();
    keystroke(el, 'a');
    el.measurements = 0;
    keystroke(el, 'ab');
    check('a keystroke measures exactly once', el.measurements === 1, `measured ${el.measurements}x`);
}
{
    const el = makeTextarea();
    autoResizeTextarea(el);
    el.measurements = 0;
    for (let i = 0; i < 10; i++) autoResizeTextarea(el); // nothing changed
    check('repeat calls with no change never measure', el.measurements === 0, `measured ${el.measurements}x`);
}

// === …and the height is still always right ================================
{
    const el = makeTextarea();
    const seen = [];
    const type = (v) => { keystroke(el, v); seen.push(el.style.height); };
    type('one line');
    check('a single line gets the base height', el.style.height === expected('one line'));
    type('a\nb\nc\nd');
    check('the box grows with the text', el.style.height === expected('a\nb\nc\nd'));
    check('growing actually changed the height', seen[0] !== seen[1]);
    type('a');
    check('the box shrinks back', el.style.height === expected('a'));
    type(new Array(60).fill('x').join('\n'));
    check('the box stops growing at the 200px cap', el.style.height === '200px');
    type('');
    check('an emptied box returns to the base height', el.style.height === expected(''));
}

// === An external height reset is re-measured, same text or not ============
{
    const el = makeTextarea();
    keystroke(el, 'a\nb\nc');
    const grown = el.style.height;
    check('grew before the reset', grown === expected('a\nb\nc'));
    el.style.height = '40px';        // what new_chat / the post-send reset do
    el.measurements = 0;
    autoResizeTextarea(el);          // same text, height clobbered
    check('a clobbered height is measured again', el.measurements === 1);
    check('and restored to the right value', el.style.height === grown);
}

// === A programmatic refill (draft restore, chip injection) still resizes ===
{
    const el = makeTextarea();
    autoResizeTextarea(el);
    el.value = 'x\ny\nz\nw\nv';      // .val() fires no events; callers call us directly
    autoResizeTextarea(el);
    check('a programmatic refill resizes', el.style.height === expected('x\ny\nz\nw\nv'));
}

// === Never throws on a missing element ====================================
{
    let threw = false;
    try { autoResizeTextarea(null); autoResizeTextarea(undefined); } catch (e) { threw = true; }
    check('a missing textarea is a no-op, not a throw', !threw);
}

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll composer auto-resize checks passed.');
