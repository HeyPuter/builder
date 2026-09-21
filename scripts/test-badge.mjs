import fs from 'node:fs';
import { transform } from 'esbuild';

// ---- Regression guard for the "Made with Puter" badge -------------------
// The badge rides on four coupled pieces that can silently drift apart:
//   1. A prompt rule (src/js/prompt.js) that makes the model bake ONE exact
//      <script> tag into every HTML page. That tag loads the shared runtime
//      script, which carries the badge AND the click-to-edit bridge, so it is
//      baked when FEATURE_FLAGS.createdWithBadge OR .clickToEdit is on.
//   2. The component itself — src/runtime.js half 1, served at
//      builder.puter.com/runtime.js. It must define the element, mount once,
//      dismiss persistently, and never throw into the host page. The build ships
//      it MINIFIED (identifiers mangled), so the behavioral suite below runs
//      against BOTH the source bytes and the same esbuild transform
//      vite.config.js applies.
//   3. The build (vite.config.js), which must ship it at EVERY stable URL it is
//      reachable at — /runtime.js plus the legacy /badge.js that older apps have
//      baked in — while keeping it OUT of the builder's own bundle (SCRIPTS).
//   4. The builder-side guards in src/js/ui.js: both preview error intakes
//      (reactive auto-fix + in-turn verification) must DROP runtime load
//      failures — the script lives outside the app's files, so reporting its
//      404/outage would send the model "fixing" healthy code.
// This renders the real prompt bytes in every flag state, executes the real
// runtime.js against a stub DOM, and slices the real ui.js filter. Half 2 of the
// same file (the click-to-edit bridge) is guarded by
// scripts/test-click-to-edit.mjs; the checks here only hold the line where the
// two halves meet.

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const promptSrc = read('../src/js/prompt.js');
const runtimeSrc = read('../src/runtime.js');
const viteSrc = read('../vite.config.js');
const helpersSrc = read('../src/js/helpers.js');
const uiSrc = read('../src/js/ui.js');
const appSrc = read('../src/js/app.js');

const RUNTIME_TAG_LINE = '<script src="https://builder.puter.com/runtime.js" defer></script>';
// The legacy path apps generated before 2026-07-29 still load. Serving it, and
// filtering its errors, must never regress — that HTML is on user storage.
const LEGACY_TAG_PATH = 'badge.js';

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

// --- 1. The prompt rule ------------------------------------------------------

function renderPrompt(flags) {
    const window = { FEATURE_FLAGS: flags };
    const factory = new Function('window', promptSrc + '\n;return window.system_prompt;');
    const fn = factory(window);
    if (typeof fn !== 'function') throw new Error('window.system_prompt was not defined');
    return fn({ username: 'tester' }, '/tester/AppData/app/chat-xyz');
}

const onP = renderPrompt({ clickToEdit: true, createdWithBadge: true });
// Badge flag off but click-to-edit on: the tag still ships (one file, two
// halves) — but the badge must not be described or demanded any more.
const bridgeOnlyP = renderPrompt({ clickToEdit: true, createdWithBadge: false });
// Both halves off: no tag at all.
const offP = renderPrompt({ clickToEdit: false, createdWithBadge: false });

check('badge tag present in prompt (flag on)', onP.includes(RUNTIME_TAG_LINE));
check('badge tag appears exactly once (flag on)',
    onP.split(RUNTIME_TAG_LINE).length === 2);
check('runtime tag still baked when only click-to-edit is on',
    bridgeOnlyP.includes(RUNTIME_TAG_LINE) && bridgeOnlyP.split(RUNTIME_TAG_LINE).length === 2);
check('badge tag absent from prompt (both halves off)',
    !offP.includes(RUNTIME_TAG_LINE) && !offP.toLowerCase().includes('made with puter'));
check('no leftover ${runtimeSnippet} in any state',
    !onP.includes('${runtimeSnippet}') && !bridgeOnlyP.includes('${runtimeSnippet}') &&
    !offP.includes('${runtimeSnippet}'));

// The badge rule must never perturb the error-reporting block the model also
// bakes (same invariant test-click-to-edit.mjs holds for its flag). That block
// stays INLINE precisely so an outage of the hosted script can't blind it.
function errorBlock(p) {
    const start = p.indexOf('window.onerror=');
    const sig = 'return p;};})();';
    const end = p.indexOf(sig, start);
    if (start < 0 || end < 0) throw new Error('error-reporting block not found');
    return p.slice(start, end + sig.length);
}
check('error/fetch block byte-identical across badge flag', errorBlock(onP) === errorBlock(offP));
check('error reporting is never delegated to the hosted script',
    errorBlock(onP).includes("type:'app-error'") && !errorBlock(onP).includes('builder.puter.com'));

// Where the two halves of the file meet: the picker must refuse to highlight or
// select the badge host, which is not in any app file — "selecting" it would
// hand the model an element it can never find or edit. (Behavior is covered in
// test-click-to-edit.mjs; this pins the coupling to the badge's tag name.)
check('the picker skips the badge host (select mode)',
    runtimeSrc.includes("var TAG = 'puter-badge'") &&
    runtimeSrc.includes("var BADGE_TAG = 'PUTER-BADGE'"));

// --- 2. The component: static properties -------------------------------------

check('runtime.js embeds the logo as a data URI (no second request)',
    runtimeSrc.includes('data:image/png;base64,'));
check('runtime.js links back with UTM attribution',
    runtimeSrc.includes('https://builder.puter.com/?utm_source=puter-badge') &&
    runtimeSrc.includes('utm_medium=badge') && runtimeSrc.includes('utm_content='));
check('runtime.js opens the link in a new tab safely',
    runtimeSrc.includes('target="_blank"') && runtimeSrc.includes('rel="noopener"'));
check('runtime.js is accessible (labels on link and close)',
    runtimeSrc.includes('aria-label="Made with Puter') &&
    runtimeSrc.includes('aria-label="Hide this badge"'));
check('runtime.js respects reduced motion and print',
    runtimeSrc.includes('prefers-reduced-motion') && runtimeSrc.includes('@media print'));

// --- 2b. The component: behavior against a stub DOM --------------------------
// runtime.js only touches these globals; new Function injects stubs for all of
// them so the real production bytes run unmodified. The same suite runs on the
// minified output below (see section 3), so identifier mangling can never ship
// a behavior change unnoticed.

function makeDom(opts = {}, srcText = runtimeSrc) {
    const handlers = {};   // '<selector>:<type>' -> fn (shadow-root listeners)
    const defs = new Map();
    const appended = [];
    const store = new Map(opts.hidden ? [['puter-badge-hidden', '1']] : []);
    const timeouts = [];

    class ElementStub {
        constructor() { this.attributes = {}; }
        setAttribute(k, v) { this.attributes[k] = String(v); }
        getAttribute(k) { return k in this.attributes ? this.attributes[k] : null; }
        remove() { const i = appended.indexOf(this); if (i >= 0) appended.splice(i, 1); }
        attachShadow() {
            this.shadow = {
                _html: '',
                set innerHTML(v) { this._html = v; },
                get innerHTML() { return this._html; },
                querySelector(sel) {
                    return { addEventListener(type, fn) { handlers[sel + ':' + type] = fn; } };
                },
            };
            return this.shadow;
        }
    }

    // window.self/.top model top-level vs framed documents (the badge must
    // never show inside a frame — that's the builder's preview pane). The
    // listener registry is here so the FRAMED runs exercise the same file's
    // half 2 (the picker bridge) instead of silently no-op'ing on a missing
    // window.addEventListener; that half's own behavior is covered by
    // scripts/test-click-to-edit.mjs.
    const winListeners = {};
    const win = {
        parent: { postMessage() {} },
        addEventListener(type, fn) { (winListeners[type] = winListeners[type] || []).push(fn); },
        removeEventListener() {},
    };
    win.self = win;
    win.top = opts.framed ? { framedParent: true } : win;

    const env = {
        window: win,
        winListeners,
        document: {
            readyState: 'complete',
            documentElement: { appendChild() {}, removeChild() {} },
            body: { appendChild(el) { appended.push(el); }, style: {} },
            querySelector(tag) { return appended.find((e) => e._tag === tag) || null; },
            addEventListener() {},
            removeEventListener() {},
            createElement(tag) {
                const Ctor = defs.get(tag);
                const el = Ctor ? new Ctor() : new ElementStub();
                el._tag = tag;
                return el;
            },
        },
        localStorage: {
            getItem(k) { if (opts.storageThrows) throw new Error('denied'); return store.has(k) ? store.get(k) : null; },
            setItem(k, v) { if (opts.storageThrows) throw new Error('denied'); store.set(k, v); },
        },
        location: { hostname: 'testapp.puter.site' },
        customElements: { get: (t) => defs.get(t), define: (t, c) => defs.set(t, c) },
        HTMLElement: ElementStub,
        Element: ElementStub,
        setTimeout: (fn, ms) => { timeouts.push(fn); return timeouts.length; },
    };
    env.run = () => { while (timeouts.length) timeouts.shift()(); };
    env.handlers = handlers;
    env.appended = appended;
    env.store = store;
    env.defs = defs;
    env.exec = () => new Function(
        'window', 'document', 'localStorage', 'location', 'customElements', 'HTMLElement', 'Element', 'setTimeout',
        srcText,
    )(env.window, env.document, env.localStorage, env.location, env.customElements, env.HTMLElement, env.Element, env.setTimeout);
    return env;
}

function runBehavioralChecks(label, srcText) {
    let parses = true;
    try { new Function(srcText); } catch (e) { parses = false; console.error(`  ${label} syntax error: ` + e.message); }
    check(`[${label}] runtime.js is valid JavaScript`, parses);

    // Normal path: defines, mounts once, reveals after the delay.
    {
        const dom = makeDom({}, srcText);
        dom.exec();
        check(`[${label}] defines the <puter-badge> element`, dom.defs.has('puter-badge'));
        check(`[${label}] mounts exactly one badge on <body>`, dom.appended.length === 1);
        check(`[${label}] badge starts hidden, reveals after the delay`,
            dom.appended[0].getAttribute('data-in') === null &&
            (dom.run(), dom.appended[0].getAttribute('data-in') !== null));
        check(`[${label}] shadow markup carries the link, logo, text, and close control`, (() => {
            const html = dom.appended[0].shadow.innerHTML;
            return html.includes('utm_content=testapp.puter.site') &&
                html.includes('data:image/png;base64,') &&
                html.includes('Made with') &&
                html.includes('class="close"');
        })());
    }

    // Dismissal: × click persists the choice and removes the element.
    {
        const dom = makeDom({}, srcText);
        dom.exec();
        dom.run();
        dom.handlers['.close:click']({ preventDefault() {} });
        check(`[${label}] close click sets the exit state`, dom.appended[0].getAttribute('data-out') !== null);
        dom.run();
        check(`[${label}] close click removes the badge`, dom.appended.length === 0);
        check(`[${label}] dismissal is persisted per origin`, dom.store.has('puter-badge-hidden'));
    }

    // Persisted dismissal: a returning visitor never sees the badge.
    {
        const dom = makeDom({ hidden: true }, srcText);
        dom.exec();
        check(`[${label}] persisted dismissal suppresses the badge entirely`, dom.appended.length === 0);
    }

    // Framed document (the builder's preview iframe): never shows the badge.
    // The two halves of the file are mutually exclusive by context, so this is
    // also where we pin that: framed gets the picker bridge and no badge...
    {
        const dom = makeDom({ framed: true }, srcText);
        dom.exec();
        dom.run();
        check(`[${label}] framed page (builder preview) never mounts the badge`,
            dom.appended.length === 0 && !dom.defs.has('puter-badge'));
        check(`[${label}] framed page gets the picker bridge instead`,
            (dom.winListeners.message || []).length === 1);
    }

    // ...and a top-level page (a published app in real use) gets the badge and
    // NOT one idle picker listener.
    {
        const dom = makeDom({}, srcText);
        dom.exec();
        dom.run();
        check(`[${label}] top-level page installs no picker listeners at all`,
            (dom.winListeners.message || []).length === 0 &&
            (dom.winListeners.scroll || []).length === 0 &&
            dom.appended.length === 1);
    }

    // Double include: a page with the tag twice still gets one badge.
    {
        const dom = makeDom({}, srcText);
        dom.exec();
        dom.exec();
        dom.run();
        check(`[${label}] double script include still yields a single badge`, dom.appended.length === 1);
    }

    // Sandboxed storage: reads/writes throw, the badge still works for the view.
    {
        const dom = makeDom({ storageThrows: true }, srcText);
        let threw = false;
        try {
            dom.exec();
            dom.run();
            dom.handlers['.close:click']({ preventDefault() {} });
            dom.run();
        } catch (e) { threw = true; console.error(`  [${label}] storage-throw path errored: ` + e.message); }
        check(`[${label}] storage that throws never breaks the page (shows, dismisses)`,
            !threw && dom.appended.length === 0);
    }
}

runBehavioralChecks('source', runtimeSrc);

// --- 3. The shipped bytes: same suite on the minified output -----------------
// Mirror the exact esbuild options vite.config.js uses for the shipped runtime —
// especially minifyIdentifiers: true, which is safe ONLY while the file stays
// self-contained IIFEs with no cross-file globals. If that breaks, these catch it.
const { code: minifiedSrc } = await transform(runtimeSrc, {
    minifyWhitespace: true,
    minifySyntax: true,
    minifyIdentifiers: true,
    legalComments: 'none',
    target: 'es2020',
});
runBehavioralChecks('minified', minifiedSrc);

// --- 4. The build wiring ------------------------------------------------------

// The runtime must ship at BOTH stable paths, from the same bytes: /runtime.js
// (what the prompt bakes) and the legacy /badge.js (baked into every app
// generated before 2026-07-29 — dropping it would kill their badge and picker).
const RUNTIME_PATHS = (/const RUNTIME_PATHS = \[([^\]]*)\]/.exec(viteSrc)?.[1] || '')
    .split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean);
check('vite declares both runtime paths', RUNTIME_PATHS.includes('runtime.js') &&
    RUNTIME_PATHS.includes(LEGACY_TAG_PATH));
check('vite writes every declared runtime path from one source',
    viteSrc.includes("path.join(SRC, 'runtime.js')") &&
    /for \(const name of RUNTIME_PATHS\)[\s\S]{0,160}writeFileSync/.test(viteSrc));
check('the tag the prompt bakes is one of the paths vite ships',
    RUNTIME_PATHS.some((n) => RUNTIME_TAG_LINE.includes('/' + n + '"')));
check('runtime.js stays OUT of the builder bundle (SCRIPTS)',
    !/const SCRIPTS = \[[^\]]*runtime\.js/s.test(viteSrc));
check('FEATURE_FLAGS.createdWithBadge exists as the kill switch',
    /createdWithBadge:\s*(true|false)/.test(helpersSrc));

// --- 5. The builder-side error filter (ui.js) ---------------------------------
// A 404/outage of the runtime posts "Failed to load script: …" app-errors from
// every generated page. Both intakes must drop them: the reactive auto-fix
// handler (would auto-send a "fix it" turn) and the in-turn verification
// capture (would flag a healthy app as broken mid-turn).

check('ui.js defines the runtime error filter', uiSrc.includes('function isRuntimeAssetError'));
check('reactive auto-fix intake drops runtime errors',
    uiSrc.includes('if (isRuntimeAssetError(message, source)) return;'));
check('in-turn verification intake drops runtime errors',
    uiSrc.includes('if (isRuntimeAssetError(d.message, d.source)) return;'));

// Execute the real filter sliced out of ui.js.
{
    const bStart = uiSrc.indexOf('function isRuntimeAssetError');
    const bEnd = uiSrc.indexOf('\n}', bStart);
    const isRuntimeAssetError = new Function('return ' + uiSrc.slice(bStart, bEnd + 2))();

    // It must match on the HOST, not a filename — that is what keeps every path
    // the runtime is served at covered, including the legacy one, without a list
    // to maintain here. A path-shaped needle would silently stop filtering the
    // moment the canonical filename changes.
    const needle = /const needle = '([^']+)'/.exec(uiSrc.slice(bStart))?.[1];
    check('filter matches the host, not a filename',
        needle === 'builder.puter.com');

    // Every path vite ships the runtime at must be filtered — current and legacy.
    for (const name of RUNTIME_PATHS) {
        check(`filter: load failure of /${name} → dropped`,
            isRuntimeAssetError(`Failed to load script: https://builder.puter.com/${name}`, '') === true &&
            isRuntimeAssetError('Script error.', `https://builder.puter.com/${name}`) === true);
    }

    check('filter: ordinary app errors pass through',
        isRuntimeAssetError('TypeError: x is undefined', 'app.js') === false &&
        isRuntimeAssetError('Failed to load script: https://cdn.tailwindcss.com', '') === false &&
        isRuntimeAssetError('Failed to load script: https://js.puter.com/v2/', '') === false);
    check('filter: the app\'s own host is never filtered',
        isRuntimeAssetError('Boom', 'https://myapp.puter.site/script.js') === false);
    check('filter: null/undefined fields never throw',
        isRuntimeAssetError(null, undefined) === false);
}

// --- 6. Campaign-tag hygiene (app.js) -----------------------------------------
// Badge referrals land with ?utm_* params. Once the landing pageview has
// recorded them they must never leak into the ?p=<chatId> permalinks users
// copy (a re-shared link would replay them as a fresh badge referral), and the
// landing URL itself gets scrubbed after analytics had its chance to record.

function sliceFn(src, name) {
    const a = src.indexOf('function ' + name);
    const b = src.indexOf('\n}', a);
    if (a < 0 || b < 0) throw new Error('could not slice ' + name);
    return src.slice(a, b + 2);
}

{
    const factory = new Function('window', 'history',
        sliceFn(appSrc, 'stripUtmParams') + '\n' + sliceFn(appSrc, 'setUrlChat') +
        '\nreturn { stripUtmParams, setUrlChat };');

    // stripUtmParams alone: case-insensitive, surgical, reports whether it acted.
    {
        const { stripUtmParams } = factory({}, {});
        const p = new URL('https://x.test/?utm_source=a&UTM_Medium=b&foo=bar&utm_content=c').searchParams;
        check('strip: removes every utm_* param (case-insensitive)',
            stripUtmParams(p) === true && p.toString() === 'foo=bar');
        const q = new URL('https://x.test/?foo=bar&p=abc').searchParams;
        check('strip: leaves non-utm params untouched and reports no-op',
            stripUtmParams(q) === false && q.toString() === 'foo=bar&p=abc');
    }

    // setUrlChat: the permalink it writes must carry p (and other params) but
    // never utm_*, and the push/replace choice must be honored.
    {
        const calls = [];
        const history = {
            pushState: (s, t, u) => calls.push(['push', u]),
            replaceState: (s, t, u) => calls.push(['replace', u]),
        };
        const window = { location: { href: 'https://builder.puter.com/?utm_source=puter-badge&utm_medium=badge&utm_campaign=created-with-puter&utm_content=app.puter.site&foo=bar' } };
        const { setUrlChat } = factory(window, history);
        setUrlChat('chat-123');
        check('setUrlChat: permalink drops utm_* but keeps other params',
            calls[0][0] === 'push' && calls[0][1] === '/?foo=bar&p=chat-123');
        setUrlChat(null, { replace: true });
        check('setUrlChat: replace mode honored, utm_* still stripped',
            calls[1][0] === 'replace' && calls[1][1] === '/?foo=bar');
    }
}

// The landing-URL scrub must exist, wait for the analytics capture window
// (after the load event), and preserve the history entry's state.
check('landing scrub waits for window load before stripping',
    appSrc.includes('function cleanLandingUtmParams') &&
    appSrc.includes("window.addEventListener('load', kick, { once: true })"));
check('landing scrub preserves history state and hash',
    appSrc.includes('history.replaceState(history.state,') &&
    appSrc.includes('url.pathname + url.search + url.hash'));
check('landing scrub is armed at boot', appSrc.includes('\ncleanLandingUtmParams();'));

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll created-with-Puter badge checks passed.');
