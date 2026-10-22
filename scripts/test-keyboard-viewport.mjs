import fs from 'node:fs';

// ---- Regression guard for the composer vs. the iOS on-screen keyboard -------
// On iOS, opening the keyboard does not shrink the layout: Safari pans the
// visual viewport to reveal the focused field. The app is a fixed-height column
// with the composer at its bottom, so the composer only stayed visible while
// that pan held — scrolling the conversation, the composer growing a line, or a
// streaming reply reflowing the page reset it, and the composer vanished behind
// the keyboard until the user dismissed and re-summoned it.
//
// The keyboard-viewport block in helpers.js sizes the app to the visible area
// (html.vv-sized + --app-h) and undoes the pan, but ONLY while a field in the
// chat column has focus on a touch device at 1x zoom. Everything else —
// dialogs, the sidebar search, the preview iframe, desktop, pinch-zoom — must
// keep the old behaviour, Safari's pan included. This evaluates the REAL block
// sliced out of helpers.js against a mocked visualViewport/document, then
// text-asserts the CSS it relies on stays gated behind html.vv-sized.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? ' — ' + detail : '')); failures++; }
}

const HELPERS = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const A = HELPERS.indexOf('// ===== keyboard-viewport (start) =====');
const B = HELPERS.indexOf('// ===== keyboard-viewport (end) =====');
if (A < 0 || B <= A) throw new Error('could not extract keyboard-viewport block from helpers.js');
const BLOCK = HELPERS.slice(A, B);

// A minimal element: `inChat` decides whether closest('.chat') finds the column.
function el(tag, { inChat = false, editable = false } = {}) {
    return {
        tagName: tag.toUpperCase(),
        isContentEditable: editable,
        scrolledIntoView: 0,
        closest: (sel) => (sel === '.chat' && inChat ? {} : null),
        matches: (sel) => sel.split(',').map(s => s.trim()).includes(tag.toLowerCase()),
        scrollIntoView() { this.scrolledIntoView++; },
    };
}

function makeEnv({ touch = true, hasVisualViewport = true } = {}) {
    const vvListeners = {};
    const docListeners = {};
    const timers = [];
    const classes = new Set();
    const props = {};
    const body = el('body');
    const env = {
        timers,
        window: {
            scrollX: 0,
            scrollY: 0,
            scrollTo(x, y) { this.scrollX = x; this.scrollY = y; },
            matchMedia: (q) => ({ matches: touch && q === '(hover: none), (pointer: coarse)' }),
            visualViewport: hasVisualViewport ? {
                height: 844,
                scale: 1,
                addEventListener: (type, fn) => { vvListeners[type] = fn; },
            } : undefined,
        },
        document: {
            activeElement: body,
            documentElement: {
                classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) },
                style: { setProperty: (k, v) => { props[k] = v; } },
            },
            addEventListener: (type, fn) => { docListeners[type] = fn; },
        },
        setTimeout: (fn) => { timers.push(fn); },
        body,
        sized: () => classes.has('vv-sized'),
        appH: () => props['--app-h'],
        // Focus moves first, then the keyboard animates the visual viewport.
        focus(target) { env.document.activeElement = target; docListeners.focusin?.(); },
        blur() { env.document.activeElement = body; docListeners.focusout?.(); while (timers.length) timers.shift()(); },
        keyboard(height) { env.window.visualViewport.height = height; vvListeners.resize?.(); },
        pan(y) { env.window.scrollY = y; vvListeners.scroll?.(); },
        vvListeners,
        docListeners,
    };
    new Function('window', 'document', 'setTimeout', BLOCK)(env.window, env.document, env.setTimeout);
    return env;
}

// === Composer focused on a phone: app sized to the visible area ============
{
    const env = makeEnv();
    const composer = el('textarea', { inChat: true });
    env.focus(composer);
    check('focusing the composer marks the app vv-sized', env.sized());
    check('--app-h starts at the full visual viewport', env.appH() === '844px', env.appH());
    env.pan(300); // Safari pans to reveal the field before the keyboard lands
    check("Safari's pan is undone while the composer has focus", env.window.scrollY === 0, String(env.window.scrollY));
    env.keyboard(412.6);
    check('keyboard opening shrinks --app-h to the visible height', env.appH() === '413px', env.appH());
    check('keyboard opening scrolls the focused field into view once', composer.scrolledIntoView === 1, String(composer.scrolledIntoView));
    env.keyboard(412.6);
    check('a same-height resize does not scroll again', composer.scrolledIntoView === 1);
    env.keyboard(450); // e.g. the QuickType bar collapsing
    check('a growing viewport updates --app-h without scrolling', env.appH() === '450px' && composer.scrolledIntoView === 1);
    env.pan(120); // a swipe chained into the page
    check('a later pan is undone too', env.window.scrollY === 0);
    env.blur();
    check('blurring the composer drops vv-sized (back to 100dvh)', !env.sized());
}

// === Fields elsewhere keep Safari's pan ====================================
{
    const env = makeEnv();
    const dialogInput = el('input', { inChat: false });
    env.focus(dialogInput);
    env.pan(250);
    env.keyboard(400);
    check('a field outside .chat does not size the app', !env.sized());
    check("a field outside .chat keeps Safari's pan", env.window.scrollY === 250, String(env.window.scrollY));
    check('a field outside .chat is not scrolled by us', dialogInput.scrolledIntoView === 0);
}
{
    const env = makeEnv();
    env.focus(el('iframe', { inChat: false })); // focus inside the preview app
    env.pan(200);
    env.keyboard(400);
    check("the preview iframe keeps Safari's pan", !env.sized() && env.window.scrollY === 200);
}
{
    const env = makeEnv();
    env.focus(el('button', { inChat: true })); // e.g. Send, a suggestion chip
    env.keyboard(400);
    check('a non-text control in .chat does not size the app', !env.sized());
}
{
    const env = makeEnv();
    env.focus(el('div', { inChat: true, editable: true }));
    check('a contenteditable field in .chat sizes the app', env.sized());
}

// === Focus moving straight between fields (keyboard stays up) ==============
{
    const env = makeEnv();
    env.focus(el('textarea', { inChat: true }));
    env.keyboard(400);
    // focusout fires while activeElement is still settling; focusin follows.
    env.document.activeElement = env.body;
    env.docListeners.focusout();
    env.focus(el('input', { inChat: false }));
    while (env.timers.length) env.timers.shift()();
    check('moving focus from the composer to a dialog field drops vv-sized', !env.sized());
}

// === Desktop and pinch-zoom are untouched ==================================
{
    const env = makeEnv({ touch: false });
    env.focus(el('textarea', { inChat: true }));
    env.pan(40);
    env.keyboard(600);
    check('non-touch devices never get vv-sized', !env.sized());
    check('non-touch devices keep their window scroll', env.window.scrollY === 40);
}
{
    const env = makeEnv();
    env.focus(el('textarea', { inChat: true }));
    check('sized before zooming', env.sized());
    env.window.visualViewport.scale = 2;
    env.window.visualViewport.height = 422;
    env.pan(100);
    check('pinch-zoom drops vv-sized', !env.sized());
    check('pinch-zoom keeps the zoomed pan', env.window.scrollY === 100);
}
{
    let threw = null;
    try { makeEnv({ hasVisualViewport: false }); } catch (e) { threw = e; }
    check('browsers without visualViewport load the block without error', !threw, threw && threw.message);
}

// === CSS: every override is gated behind html.vv-sized =====================
const CSS = fs.readFileSync(new URL('../src/css/styles.css', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '');
const rulesUsing = (re) => (CSS.match(/[^{}]*\{[^{}]*\}/g) || []).filter(r => re.test(r))
    .map(r => r.split('{')[0].split(',').map(s => s.trim()));
const ruleBody = (selector) => {
    const i = CSS.indexOf(selector + ' {');
    if (i < 0) return null;
    return CSS.slice(i, CSS.indexOf('}', i));
};
check('body height follows --app-h under vv-sized', /height:\s*var\(--app-h\)/.test(ruleBody('html.vv-sized body') || ''));
check('.chat max-height follows --app-h under vv-sized',
    /max-height:\s*calc\(var\(--app-h\) - var\(--toolbar-h\)\)/.test(ruleBody('html.vv-sized .chat') || ''));
check('landing .chat height follows --app-h under vv-sized',
    /height:\s*calc\(var\(--app-h\) - var\(--toolbar-h\)\)/.test(ruleBody('html.vv-sized .chat:not(.active)') || ''));
// Pull-to-refresh must behave as before while the keyboard is down.
const chatOverscroll = rulesUsing(/overscroll-behavior/).filter(sels => sels.some(s => /\.chat\b/.test(s)));
check('chat overscroll containment only applies under vv-sized',
    chatOverscroll.length > 0 && chatOverscroll.every(sels => sels.every(s => s.startsWith('html.vv-sized'))),
    JSON.stringify(chatOverscroll));
const appHUses = rulesUsing(/var\(--app-h\)/);
check('var(--app-h) is only read under vv-sized (so it is never unset when read)',
    appHUses.length >= 3 && appHUses.every(sels => sels.every(s => s.startsWith('html.vv-sized'))),
    JSON.stringify(appHUses));

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nall keyboard-viewport checks passed');
