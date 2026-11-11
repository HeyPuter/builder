import fs from 'node:fs';

// ---- Regression guard for JavaScript error tracking -------------------------
// src/index.html carries an inline script that turns uncaught errors, unhandled
// promise rejections and failed script/stylesheet loads into a Plausible
// "JavaScript Error" custom event. This test:
//   * checks it sits after the Plausible queue stub and before every other
//     script, so it sees errors thrown while puter.js or the app bundle loads;
//   * evaluates the REAL inline script against a fake `window` and asserts the
//     event shape, the per-page dedupe and cap (each event counts toward the
//     Plausible quota), the noise filters, that the page URL and its query
//     string are never sent, and that nothing it does can throw into the page.
// Mirrors scripts/test-ai-cost-tracking.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const HTML = fs.readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');

// --- Locate the inline tracker ------------------------------------------------
const scripts = [...HTML.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)];
const tracker = scripts.find((m) => m[1].includes("'JavaScript Error'"));
if (!tracker) throw new Error('could not find the error-tracking <script> in src/index.html');
const SRC = tracker[1];

// --- Placement ---------------------------------------------------------------
const stubAt = HTML.indexOf('plausible.init()');
const puterAt = HTML.indexOf('<script src="https://js.puter.com/v2/"></script>');
const firstModuleAt = HTML.indexOf('<script type="module"');
check('tracker comes after the Plausible queue stub', stubAt >= 0 && tracker.index > stubAt);
check('tracker comes before puter.js', puterAt >= 0 && tracker.index < puterAt);
check('tracker comes before the module entry scripts', firstModuleAt >= 0 && tracker.index < firstModuleAt);
// The Vite-injected app bundle is appended at the end of <head>, after puter.js,
// so "before puter.js" also covers it.
check('tracker is a classic inline script (no src, no module)', /^<script>/.test(tracker[0]));

// --- Harness -------------------------------------------------------------------
const ORIGIN = 'https://builder.puter.com';
function load({ plausible, origin = ORIGIN, href = ORIGIN + '/?template=secret-token#frag' } = {}) {
    const listeners = {};
    const calls = [];
    const win = {
        location: { origin, href, pathname: '/' },
        addEventListener(type, fn, capture) { (listeners[type] = listeners[type] || []).push({ fn, capture: !!capture }); },
        plausible: plausible !== undefined ? plausible : (name, opts) => calls.push([name, opts]),
    };
    new Function('window', SRC)(win);
    function fire(type, ev) {
        let threw = false;
        for (const l of listeners[type] || []) {
            try { l.fn(ev); } catch (e) { threw = true; }
        }
        return threw;
    }
    return { win, calls, listeners, fire };
}

function runtimeError(win, { message, filename, lineno = 1, colno = 1, error } = {}) {
    return { target: win, message, filename, lineno, colno, error };
}

// --- Listeners ------------------------------------------------------------------
{
    const { listeners } = load();
    check('one error listener, in the capture phase', listeners.error && listeners.error.length === 1 && listeners.error[0].capture);
    check('one unhandledrejection listener', listeners.unhandledrejection && listeners.unhandledrejection.length === 1);
}

// --- Uncaught error ----------------------------------------------------------------
{
    const { win, calls, fire } = load();
    const error = new TypeError("Cannot read properties of undefined (reading 'files')");
    error.stack = [
        "TypeError: Cannot read properties of undefined (reading 'files')",
        `    at renderFileTree (${ORIGIN}/app-Bx12.js:1:48213)`,
        `    at HTMLButtonElement.<anonymous> (${ORIGIN}/app-Bx12.js:1:51002)`,
        '    at new Promise (<anonymous>)',
    ].join('\n');
    fire('error', runtimeError(win, {
        message: "Uncaught TypeError: Cannot read properties of undefined (reading 'files')",
        filename: ORIGIN + '/app-Bx12.js', lineno: 1, colno: 48213, error,
    }));
    check('uncaught error: one event', calls.length === 1);
    const [name, opts] = calls[0] || [];
    check('uncaught error: event name is JavaScript Error', name === 'JavaScript Error');
    check('uncaught error: kind=error', opts && opts.props.kind === 'error');
    check('uncaught error: message forwarded', opts && opts.props.message === "Uncaught TypeError: Cannot read properties of undefined (reading 'files')");
    check('uncaught error: source is path:line:col on our origin', opts && opts.props.source === '/app-Bx12.js:1:48213');
    check('uncaught error: stack keeps only frames, origin stripped',
        opts && opts.props.stack === 'at renderFileTree (/app-Bx12.js:1:48213)\nat HTMLButtonElement.<anonymous> (/app-Bx12.js:1:51002)');
    check('uncaught error: only the four known props', opts && Object.keys(opts.props).sort().join(',') === 'kind,message,source,stack');
    check('uncaught error: all prop values are strings', opts && Object.values(opts.props).every((v) => typeof v === 'string'));
}

// An error with no Error object (e.g. a cross-origin "Script error.")
{
    const { win, calls, fire } = load();
    fire('error', runtimeError(win, { message: 'Script error.', filename: '', lineno: 0, colno: 0 }));
    check('cross-origin error: still reported', calls.length === 1);
    check('cross-origin error: source falls back to unknown', calls[0] && calls[0][1].props.source === 'unknown');
    check('cross-origin error: no stack prop', calls[0] && !('stack' in calls[0][1].props));
}

// An inline script on the page: filename is the page URL, query string included.
{
    const { win, calls, fire } = load();
    fire('error', runtimeError(win, { message: 'Uncaught ReferenceError: x is not defined', filename: ORIGIN + '/?template=secret-token#frag', lineno: 12, colno: 3 }));
    check('inline-script error: query and hash dropped from source', calls[0] && calls[0][1].props.source === '/:12:3');
}

// Cross-origin file keeps its host, minus the scheme.
{
    const { win, calls, fire } = load();
    fire('error', runtimeError(win, { message: 'Uncaught Error: boom', filename: 'https://js.puter.com/v2/', lineno: 3, colno: 9 }));
    check('third-party error: host kept, scheme dropped', calls[0] && calls[0][1].props.source === 'js.puter.com/v2/:3:9');
}

// --- Unhandled rejections ---------------------------------------------------------
{
    const { calls, fire } = load();
    const reason = new Error('Request failed');
    reason.stack = `Error: Request failed\n    at saveProject (${ORIGIN}/app-Bx12.js:1:900)\n    at async run (${ORIGIN}/app-Bx12.js:1:1200)`;
    fire('unhandledrejection', { reason });
    const p = calls[0] && calls[0][1].props;
    check('rejection (Error): kind=unhandledrejection', p && p.kind === 'unhandledrejection');
    check('rejection (Error): plain Error has no name prefix', p && p.message === 'Request failed');
    check('rejection (Error): source from the top stack frame', p && p.source === '/app-Bx12.js:1:900');
    check('rejection (Error): stack frames forwarded', p && p.stack === 'at saveProject (/app-Bx12.js:1:900)\nat async run (/app-Bx12.js:1:1200)');
}
{
    const { calls, fire } = load();
    const reason = new TypeError('Failed to fetch');
    reason.stack = `TypeError: Failed to fetch\n    at loadThing (${ORIGIN}/app-Bx12.js:1:42)`;
    fire('unhandledrejection', { reason });
    check('rejection (TypeError): name prefixed', calls[0] && calls[0][1].props.message === 'TypeError: Failed to fetch');
}
{
    const { calls, fire } = load();
    fire('unhandledrejection', { reason: 'quota exceeded' });
    fire('unhandledrejection', { reason: { error: { code: 'forbidden', message: 'Permission denied' } } });
    fire('unhandledrejection', { reason: { code: 42 } });
    fire('unhandledrejection', { reason: undefined });
    fire('unhandledrejection', {});
    const msgs = calls.map((c) => c[1].props.message);
    check('rejection (string): forwarded as is', msgs[0] === 'quota exceeded');
    check('rejection (puter.js error object): inner message', msgs[1] === 'Permission denied');
    check('rejection (other object): JSON', msgs[2] === '{"code":42}');
    check('rejection (undefined): reported as "undefined"', msgs[3] === 'undefined');
    check('rejection (no reason): deduped with undefined', calls.length === 4);
    check('rejection without a stack: source unknown, no stack prop', calls[0] && calls[0][1].props.source === 'unknown' && !('stack' in calls[0][1].props));
}
{
    // A reason whose JSON.stringify throws (cycle) must not break anything.
    const { calls, fire } = load();
    const cyc = {}; cyc.self = cyc;
    const threw = fire('unhandledrejection', { reason: cyc });
    check('rejection (cyclic object): no throw', !threw);
    check('rejection (cyclic object): still reported', calls.length === 1 && calls[0][1].props.message === '[object Object]');
}

// --- Failed resource loads -------------------------------------------------------
{
    const { calls, fire } = load();
    fire('error', { target: { tagName: 'SCRIPT', src: ORIGIN + '/app-OLD1.js' } });
    fire('error', { target: { tagName: 'LINK', rel: 'stylesheet', href: ORIGIN + '/assets/styles-x.css?v=2' } });
    fire('error', { target: { tagName: 'SCRIPT', src: 'https://js.puter.com/v2/' } });
    check('resource: script and stylesheet failures reported', calls.length === 3);
    check('resource: kind=resource', calls.every((c) => c[1].props.kind === 'resource'));
    check('resource: script message + path', calls[0] && calls[0][1].props.message === 'Failed to load script' && calls[0][1].props.source === '/app-OLD1.js');
    check('resource: stylesheet message + path, query dropped', calls[1] && calls[1][1].props.message === 'Failed to load stylesheet' && calls[1][1].props.source === '/assets/styles-x.css');
    check('resource: third-party script keeps its host', calls[2] && calls[2][1].props.source === 'js.puter.com/v2/');
}
{
    const { calls, fire } = load();
    fire('error', { target: { tagName: 'IMG', src: ORIGIN + '/avatar.png' } });
    fire('error', { target: { tagName: 'VIDEO', src: ORIGIN + '/clip.mp4' } });
    fire('error', { target: { tagName: 'LINK', rel: 'icon', href: ORIGIN + '/favicon.ico' } });
    fire('error', { target: { tagName: 'SCRIPT', src: 'https://plausible.io/js/pa-abc.js' } });
    check('resource: images, media, icons and a blocked Plausible script are ignored', calls.length === 0);
}

// --- Noise filters -----------------------------------------------------------------
{
    const { win, calls, fire } = load();
    fire('error', runtimeError(win, { message: 'Uncaught Error: ext', filename: 'chrome-extension://abcdef/content.js', lineno: 1, colno: 5 }));
    fire('error', runtimeError(win, { message: 'Uncaught Error: ext', filename: 'moz-extension://abcdef/content.js', lineno: 1, colno: 5 }));
    const reason = new Error('ext');
    reason.stack = 'Error: ext\n    at x (chrome-extension://abcdef/inject.js:3:4)';
    fire('unhandledrejection', { reason });
    fire('error', runtimeError(win, { message: 'ResizeObserver loop completed with undelivered notifications.', filename: '', lineno: 0, colno: 0 }));
    check('extension errors and the ResizeObserver notice are ignored', calls.length === 0);
}
{
    // An extension frame deeper in the stack (e.g. one that wraps fetch) does not hide our own error.
    const { calls, fire } = load();
    const reason = new Error('Bad response');
    reason.stack = `Error: Bad response\n    at publish (${ORIGIN}/app-Bx12.js:1:77)\n    at window.fetch (chrome-extension://abcdef/inject.js:3:4)`;
    fire('unhandledrejection', { reason });
    check('our error with an extension frame below it is still reported', calls.length === 1 && calls[0][1].props.source === '/app-Bx12.js:1:77');
}

// --- Dedupe and cap ----------------------------------------------------------------
{
    const { win, calls, fire } = load();
    for (let i = 0; i < 500; i++) {
        fire('error', runtimeError(win, { message: 'Uncaught Error: loop', filename: ORIGIN + '/app-Bx12.js', lineno: 1, colno: 10 }));
    }
    check('dedupe: the same error 500 times sends one event', calls.length === 1);
    fire('error', runtimeError(win, { message: 'Uncaught Error: loop', filename: ORIGIN + '/app-Bx12.js', lineno: 1, colno: 11 }));
    check('dedupe: same message from another place is a new event', calls.length === 2);
}
{
    const { win, calls, fire } = load();
    for (let i = 0; i < 50; i++) {
        fire('error', runtimeError(win, { message: 'Uncaught Error: id ' + i, filename: ORIGIN + '/app-Bx12.js', lineno: 1, colno: i }));
    }
    check('cap: at most 10 events per page load', calls.length === 10);
}

// --- Truncation ----------------------------------------------------------------------
{
    const { win, calls, fire } = load();
    const error = new Error('x');
    error.stack = 'Error: x\n' + Array.from({ length: 40 }, (_, i) => `    at f${i} (${ORIGIN}/app-Bx12.js:1:${i})`).join('\n');
    fire('error', runtimeError(win, { message: 'Uncaught Error: ' + 'y'.repeat(5000), filename: ORIGIN + '/app-Bx12.js', lineno: 1, colno: 2, error }));
    const p = calls[0] && calls[0][1].props;
    check('truncation: message capped at 300 chars', p && p.message.length === 300 && p.message.endsWith('…'));
    check('truncation: stack keeps the top 5 frames', p && p.stack.split('\n').length === 5);
    check('truncation: every value within Plausible\'s 2000-char limit', p && Object.values(p).every((v) => v.length <= 2000));
}

// --- Privacy -----------------------------------------------------------------------
{
    const { win, calls, fire } = load();
    fire('error', runtimeError(win, { message: 'Uncaught Error: a', filename: ORIGIN + '/?template=secret-token', lineno: 1, colno: 1 }));
    fire('unhandledrejection', { reason: new Error('b') });
    fire('error', { target: { tagName: 'SCRIPT', src: ORIGIN + '/x.js?template=secret-token' } });
    const blob = JSON.stringify(calls);
    check('privacy: no url prop', calls.every((c) => !('url' in c[1].props)));
    check('privacy: the page query string never leaves the page', !blob.includes('secret-token'));
}
{
    // An inline script's stack frames carry the full page URL. The stack prop
    // must drop its query and hash like source does.
    const PAGE = ORIGIN + '/?template=secret-token&x=(paren):1:2#frag-secret';
    const { win, calls, fire } = load();
    const error = new Error('inline');
    error.stack = [
        'Error: inline',
        `    at HTMLDocument.<anonymous> (${PAGE}:12:3)`,
        `    at Foo.#privateThing (${ORIGIN}/app-Bx12.js:1:99)`,
        `    at eval (eval at run (${PAGE}:20:5), <anonymous>:4:17)`,
        `    at ${PAGE}:30:7`,
    ].join('\n');
    fire('error', runtimeError(win, { message: 'Uncaught Error: inline', filename: PAGE, lineno: 12, colno: 3, error }));
    const reason = new Error('inline rejection');
    // Firefox/Safari frame format.
    reason.stack = `start@${PAGE}:40:9\n@${ORIGIN}/app-Bx12.js?v=2#x:1:5`;
    fire('unhandledrejection', { reason });
    const [errProps, rejProps] = calls.map((c) => c[1].props);
    const blob = JSON.stringify(calls);
    check('privacy (stack): no query value in any prop', !blob.includes('secret-token') && !blob.includes('paren') && !blob.includes('template='));
    check('privacy (stack): no hash in any prop', !blob.includes('frag-secret') && !blob.includes('#x'));
    check('privacy (stack): Chrome frames keep their position',
        errProps && errProps.stack === [
            'at HTMLDocument.<anonymous> (/:12:3)',
            'at Foo.#privateThing (/app-Bx12.js:1:99)',
            'at eval (eval at run (/:20:5), <anonymous>:4:17)',
            'at /:30:7',
        ].join('\n'));
    check('privacy (stack): a #private method name is not mistaken for a hash', errProps && errProps.stack.includes('Foo.#privateThing'));
    check('privacy (stack): Firefox frames keep their position', rejProps && rejProps.stack === 'start@/:40:9\n@/app-Bx12.js:1:5');
    check('privacy (stack): rejection source from the cleaned top frame', rejProps && rejProps.source === '/:40:9');
}

// --- Never throws into the page ------------------------------------------------------
{
    const { win, fire } = load({ plausible: () => { throw new Error('plausible broke'); } });
    const threw = fire('error', runtimeError(win, { message: 'Uncaught Error: a', filename: ORIGIN + '/a.js' }))
        || fire('unhandledrejection', { reason: new Error('b') })
        || fire('error', { target: { tagName: 'SCRIPT', src: ORIGIN + '/c.js' } });
    check('a throwing plausible() is swallowed', !threw);
}
{
    const { win, fire } = load({ plausible: null });
    const threw = fire('error', runtimeError(win, { message: 'Uncaught Error: a', filename: ORIGIN + '/a.js' }));
    check('no plausible() at all: no throw', !threw);
}
{
    const { win, fire } = load();
    const threw = fire('error', undefined) || fire('error', null) || fire('unhandledrejection', undefined)
        || fire('error', { target: win }) || fire('error', { target: { tagName: 'SCRIPT' } });
    check('malformed events: no throw', !threw);
}
{
    let threw = false;
    try { new Function('window', SRC)({}); } catch (e) { threw = true; }
    check('setup on a window without addEventListener/location: no throw', !threw);
}

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nall error-tracking checks passed');
