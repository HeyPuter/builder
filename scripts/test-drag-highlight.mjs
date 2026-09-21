import fs from 'node:fs';

// ---- Regression guard for the composer's drag-over outline ----------------
// A file dragged over the page outlines the composer; the outline must come
// back off however the drag ends. dragenter/dragleave alone can't guarantee
// that: a drag can leave this document with no matching dragleave (moving into
// the cross-origin preview iframe, whose drag events fire in ITS document), and
// dropping there produces no drop event here either — so the depth counter
// stayed positive and the outline was stuck for the rest of the session.
//
// dragdrop.js therefore drives the outline from `dragover`, which the browser
// re-fires on the current target every ~350ms for as long as a drag is over
// this document and stops the moment one isn't.
//
// This executes the REAL src/js/dragdrop.js against a stub DOM (same approach
// as test-click-to-edit.mjs) and drives event sequences through the actual
// listeners it registers.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const SRC = new URL('../src/js/dragdrop.js', import.meta.url);
const code = fs.readFileSync(SRC, 'utf8');

// Build a fresh stubbed environment + a handle to drive it.
function makeEnv() {
    const classes = new Set();
    const chatInput = {
        classList: {
            add: (c) => classes.add(c),
            remove: (c) => classes.delete(c),
            toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)),
            contains: (c) => classes.has(c),
        },
    };
    const listeners = new Map();
    let now = 0;
    const timers = []; // { at, fn, id, cancelled }
    let nextTimer = 1;

    const win = {
        addEventListener: (type, fn) => {
            if (!listeners.has(type)) listeners.set(type, []);
            listeners.get(type).push(fn);
        },
    };
    const doc = { querySelector: (sel) => (sel === '.chat-input' ? chatInput : null) };

    const env = {
        highlighted: () => classes.has('drag-over'),
        fire(type, hasFiles = true) {
            const e = {
                preventDefault() {}, stopPropagation() {},
                dataTransfer: hasFiles ? { types: ['Files'], items: [], files: [] } : { types: [] },
            };
            for (const fn of listeners.get(type) || []) fn(e);
        },
        // Advance virtual time, running any timer whose deadline passed.
        advance(ms) {
            now += ms;
            for (const t of timers.slice()) {
                if (!t.cancelled && t.at <= now) { t.cancelled = true; t.fn(); }
            }
        },
        types: () => Array.from(listeners.keys()),
    };

    const setTimeoutStub = (fn, ms) => {
        const t = { at: now + (ms || 0), fn, id: nextTimer++, cancelled: false };
        timers.push(t);
        return t.id;
    };
    const clearTimeoutStub = (id) => {
        const t = timers.find((x) => x.id === id);
        if (t) t.cancelled = true;
    };

    // `$(document).ready(cb)` runs cb immediately so the listeners register.
    const $ = () => ({ ready: (cb) => cb() });

    new Function(
        'window', 'document', '$', 'setTimeout', 'clearTimeout',
        'classifyAttachment', 'isTextAttachment', 'puter', 'console', 'URL', 'File',
        code,
    )(win, doc, $, setTimeoutStub, clearTimeoutStub,
      () => 'other', () => false, { ui: { alert: async () => {} } }, console, {}, function File() {});

    return env;
}

// === The listeners exist ===================================================
{
    const env = makeEnv();
    for (const t of ['dragenter', 'dragover', 'dragleave', 'drop', 'dragend']) {
        check(`listens for ${t}`, env.types().includes(t));
    }
}

// === Normal path: enter, hover, leave ======================================
{
    const env = makeEnv();
    check('starts with no outline', !env.highlighted());
    env.fire('dragenter');
    check('dragenter shows the outline', env.highlighted());
    env.fire('dragover');
    env.advance(400);
    env.fire('dragover');
    env.advance(400);
    check('a hovering drag keeps the outline up', env.highlighted());
    env.fire('dragleave');
    check('leaving the window removes it immediately', !env.highlighted());
}

// === Moving between child elements must not flicker ========================
{
    const env = makeEnv();
    env.fire('dragenter');           // window
    env.fire('dragenter');           // child
    env.fire('dragleave');           // parent
    check('crossing into a child keeps the outline', env.highlighted());
    env.fire('dragleave');           // child -> out
    check('the final leave removes it', !env.highlighted());
}

// === An unmatched dragleave must not wedge the counter negative ============
{
    const env = makeEnv();
    env.fire('dragleave');           // no matching dragenter
    env.fire('dragenter');
    check('outline still appears after a stray dragleave', env.highlighted());
    env.fire('dragleave');
    check('and still clears on the matching leave', !env.highlighted());
}

// === The stuck case: drag walks into the preview iframe and is dropped =====
// No dragleave, no drop reaches us — only the dragover heartbeat stopping.
{
    const env = makeEnv();
    env.fire('dragenter');
    env.fire('dragover');
    check('outline is up while over the page', env.highlighted());
    env.advance(500);
    check('still up inside the heartbeat window', env.highlighted());
    env.advance(600); // heartbeat missed
    check('idle timeout clears a drag that left this document', !env.highlighted());
    // And the state machine is reusable afterwards.
    env.fire('dragenter');
    check('a later drag still outlines the composer', env.highlighted());
}

// === Drop on the composer clears it ========================================
{
    const env = makeEnv();
    env.fire('dragenter');
    env.fire('dragover');
    env.fire('drop');
    check('drop removes the outline', !env.highlighted());
    env.advance(2000);
    check('and nothing re-arms afterwards', !env.highlighted());
}

// === dragend (a drag that started in-page) clears it =======================
{
    const env = makeEnv();
    env.fire('dragenter');
    env.fire('dragend');
    check('dragend removes the outline', !env.highlighted());
}

// === Non-file drags (text selections) are ignored ==========================
{
    const env = makeEnv();
    env.fire('dragenter', false);
    check('a non-file drag never outlines the composer', !env.highlighted());
}

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll drag-highlight checks passed.');
