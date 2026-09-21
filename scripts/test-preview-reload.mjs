import fs from 'node:fs';

// ---- Regression guard for the preview's Reload ----------------------------
// Pointing an iframe at about:blank and back at the same src is a NAVIGATION,
// not a forced reload, so the browser may answer it straight from its HTTP
// cache — and puter.site serves preview pages with `Cache-Control: max-age=20`.
// reloadPreviewFrame re-used the stored URL verbatim, so the toolbar's Reload
// button (and the version-restore fallback that calls the same function) could
// re-show the bytes already in cache and do nothing at all. Verified against a
// max-age host: about:blank → same src made no request; a fresh cache-bust
// token did.
//
// So every reload must go out under a NEW token — and, since the token is
// stored back on the frame, tokens must replace rather than accumulate.
//
// Evaluates the REAL functions sliced out of ui.js against a jQuery stub.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? ' — ' + detail : '')); failures++; }
}

const src = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
function slice(startMarker, endMarker) {
    const a = src.indexOf(startMarker);
    const b = src.indexOf(endMarker, a);
    if (a < 0 || b <= a) throw new Error('could not extract ' + startMarker);
    return src.slice(a, b);
}
// The whole preview-reload region (the sequence counter, the bust helper and
// reloadPreviewFrame itself) plus bustedUrl. Sliced by stable surrounding
// landmarks rather than by the helper's own name, so removing the cache-bust
// fails the ASSERTIONS below rather than the extraction.
const BLOCK =
    slice('// Monotonic counter identifying the latest preview operation', '// ---- Deploy-propagation readiness') +
    slice('function bustedUrl(base) {', '\n\n// Absolute paths of files changed');

// A frame stub recording every src it is pointed at, plus its .data() store.
function makeEnv() {
    const srcs = [];
    const data = {};
    const timers = [];
    const frame = {
        length: 1,
        data: (k, v) => (v === undefined ? data[k] : (data[k] = v)),
        attr: (k, v) => { if (k === 'src') srcs.push(v); return frame; },
    };
    const $ = (sel) => (sel === '.preview-frame' ? frame : { length: 0, find: () => ({ length: 0 }), append: () => {}, remove: () => {} });
    const env = {
        $, window: { clearPreviewChanges: () => {} },
        showPreviewUpdating: () => {},
        setTimeout: (fn) => { timers.push(fn); },
        Date, Math, String, RegExp,
        srcs, data,
        flush: () => { while (timers.length) timers.shift()(); },
    };
    const fn = new Function('$', 'window', 'showPreviewUpdating', 'setTimeout',
        BLOCK +
        '\nreturn { reloadPreviewFrame, bustedUrl, seq: () => _previewRefreshSeq,' +
        '  setActive: (v) => { _previewRefreshActiveSeq = v; },' +
        '  strip: typeof withoutPreviewBust === "function" ? withoutPreviewBust : null };'
    )($, env.window, env.showPreviewUpdating, env.setTimeout);
    return { ...env, ...fn };
}

// === withoutPreviewBust strips exactly the token ===========================
{
    const { strip } = makeEnv();
    check('a reload URL carries a strippable cache-bust token', typeof strip === 'function');
    if (typeof strip !== 'function') { console.error('\n' + (failures + 1) + ' check(s) failed'); process.exit(1); }
    check('strips a lone token', strip('https://a.puter.site/?__pv=1_x') === 'https://a.puter.site/');
    check('strips a leading token, keeps the rest', strip('https://a.puter.site/?__pv=1_x&v=2') === 'https://a.puter.site/?v=2');
    check('strips a trailing token, keeps the rest', strip('https://a.puter.site/?v=2&__pv=1_x') === 'https://a.puter.site/?v=2');
    check('keeps the fragment', strip('https://a.puter.site/?__pv=1_x#top') === 'https://a.puter.site/#top');
    check('leaves a clean URL alone', strip('https://a.puter.site/') === 'https://a.puter.site/');
    check('is idempotent', strip(strip('https://a.puter.site/?__pv=1_x')) === 'https://a.puter.site/');
    check('never touches a lookalike param', strip('https://a.puter.site/?my__pv=1') === 'https://a.puter.site/?my__pv=1');
}

// === Every reload goes out under a fresh token =============================
{
    const env = makeEnv();
    env.reloadPreviewFrame('https://a.puter.site/');
    env.flush();
    const first = env.srcs[env.srcs.length - 1];
    check('the first load is cache-busted', /[?&]__pv=/.test(first), first);
    check('and goes through about:blank', env.srcs.includes('about:blank'));

    env.reloadPreviewFrame();               // the toolbar Reload button
    env.flush();
    const second = env.srcs[env.srcs.length - 1];
    check('a reload uses a DIFFERENT url', second !== first, `${first} vs ${second}`);

    env.reloadPreviewFrame();
    env.flush();
    const third = env.srcs[env.srcs.length - 1];
    check('and again', third !== second);
    check('tokens replace, never accumulate', (third.match(/__pv=/g) || []).length === 1, third);
    check('the base URL survives every reload', third.split('?')[0] === 'https://a.puter.site/');
    check('the stored url is the one actually loaded', env.data['preview-url'] === third);
}

// === Existing query params and fragments survive ===========================
{
    const env = makeEnv();
    env.reloadPreviewFrame('https://a.puter.site/page?lang=fr#section');
    env.flush();
    env.reloadPreviewFrame();
    env.flush();
    const url = env.srcs[env.srcs.length - 1];
    check('an existing query param survives a reload', url.includes('lang=fr'), url);
    check('only one token is present', (url.match(/__pv=/g) || []).length === 1, url);
}

// === Guards ================================================================
{
    const env = makeEnv();
    env.reloadPreviewFrame();               // no url, nothing stored
    env.flush();
    check('a reload with no known url is a no-op', env.srcs.length === 0);
    check('and does not bump the refresh sequence', env.seq() === 0);
}
{
    const env = makeEnv();
    env.reloadPreviewFrame('https://a.puter.site/');
    check('a reload supersedes in-flight propagation probes', env.seq() === 1);
}

// === The toolbar's Reload keeps a mid-flight update alive ==================
// While "Applying changes…" is up, the toolbar Reload (keepPendingUpdate) must
// reload the frame WITHOUT superseding the propagation refresh: superseding it
// forgot the changed paths and never reloaded again (the pane sat on the old
// build until the next turn), and an in-turn verification waiting for that
// refresh to commit stalled for its whole timeout.
{
    const env = makeEnv();
    env.reloadPreviewFrame('https://a.puter.site/');
    env.flush();
    const before = env.seq();
    let cleared = 0;
    env.window.clearPreviewChanges = () => { cleared++; };
    env.setActive(before);              // a propagation refresh is mid-flight
    env.reloadPreviewFrame(undefined, { keepPendingUpdate: true });
    env.flush();
    const url = env.srcs[env.srcs.length - 1];
    check('Reload during a pending update still reloads the frame', /[?&]__pv=/.test(url) && url !== 'about:blank', url);
    check('… but does NOT supersede the pending update', env.seq() === before);
    check('… and keeps its changed paths for that update', cleared === 0);

    env.setActive(0);                   // nothing in flight
    env.reloadPreviewFrame(undefined, { keepPendingUpdate: true });
    check('with nothing pending, the same Reload supersedes as before', env.seq() === before + 1);
    check('… and forgets the changed paths', cleared === 1);
}

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll preview-reload checks passed.');
