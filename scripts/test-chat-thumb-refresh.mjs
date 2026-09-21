import fs from 'node:fs';

// ---- Regression guard for the sidebar-thumbnail refresh poller --------------
// refreshChatThumb (src/js/app.js) re-checks a project's screenshot for ~40s
// after its live site changes, because the edge re-serves the OLD shot for a
// while before the regenerated one surfaces. The poller READS the screenshot's
// bytes each tick and swaps the visible <img> ONLY when they differ from what's
// shown — so the many ticks that re-serve an identical shot are no-ops instead
// of visible reloads (the flicker we're killing). When the bytes can't be read
// (a CORS-less host / network error) it falls back to the original
// always-swap-via-<img> path, so it is never worse than before.
//
// This test evaluates the production bytes with mocked fetch/Image/$ and asserts:
//   1. unchanged bytes  → NO swap                (the fix)
//   2. changed bytes    → exactly one swap, to the new shot
//   3. fetch error      → fallback swaps every tick (zero-regression behavior)
//   4. out-of-order resolution → a stale older tick can't re-show an old shot
//
// Mirrors the block-extraction style of scripts/test-fs-path-scoping.mjs.

const SRC = new URL('../src/js/app.js', import.meta.url);
const src = fs.readFileSync(SRC, 'utf8');

// Slice from chatThumbUrl (a dependency of refreshChatThumb) through the end of
// refreshChatThumb. Both anchors are unique in app.js.
const startMarker = 'function chatThumbUrl(previewUrl) {';
const endMarker = '    tick();\n};';
const a = src.indexOf(startMarker);
const b = src.indexOf(endMarker);
if (a < 0 || b < 0) throw new Error('could not locate the refreshChatThumb block in app.js');
const block = src.slice(a, b + endMarker.length);

// --- Mutable mock state (the mocks delegate here so each scenario can reset) --
let fetchImpl;        // (url) => Promise<Response-ish>
let curThumb;         // the fake $thumb the selector resolves to
let scheduled;        // the next tick callback captured from setTimeout
let swapCount;        // # of visible <img> src swaps that actually happened
let lastSwapSrc;      // src of the most recent swap

function reset() {
    fetchImpl = null;
    scheduled = null;
    swapCount = 0;
    lastSwapSrc = null;
    curThumb = makeThumb();
}

function makeImg() {
    return {
        length: 1,
        attr(k, v) { if (k === 'src') { swapCount++; lastSwapSrc = v; } return this; },
    };
}

function makeThumb() {
    let img = null;
    const t = {
        length: 1,
        classes: new Set(),
        find(sel) { return sel === '.chat-thumb-img' && img ? img : { length: 0 }; },
        append(child) { img = child; return t; },
        addClass(c) { t.classes.add(c); return t; },
    };
    return t;
}

// jQuery stand-in: a "<img ...>" string constructs an element; any selector
// resolves to the current scenario's thumb.
const $ = (arg) => {
    if (typeof arg === 'string' && arg.trim().startsWith('<img')) return makeImg();
    return curThumb;
};

// Image stand-in: setting .src fires onload on a microtask with a decodable
// (naturalWidth>0) image, mirroring a real successful preload.
class FakeImage {
    set src(v) {
        this._src = v;
        this.naturalWidth = 1;
        Promise.resolve().then(() => { if (this.onload) this.onload(); });
    }
}

const fetchMock = (...args) => fetchImpl(...args);
const setTimeoutMock = (cb) => { scheduled = cb; return 1; };
const DateMock = { now: () => 1000 };

const factory = new Function(
    'window', '$', 'Image', 'fetch', 'setTimeout', 'Date', 'AbortSignal', 'savedChats',
    block + '\n; return { refreshChatThumb: window.refreshChatThumb };'
);
const win = {};
const savedChats = [{ id: 'c1', previewUrl: 'https://app.example.puter.site/' }];
const { refreshChatThumb } = factory(
    win, $, FakeImage, fetchMock, setTimeoutMock, DateMock, undefined, savedChats
);

// Drain all pending microtasks (awaited fetch/arrayBuffer chains + Image.onload).
const flush = () => new Promise((r) => setImmediate(r));

// Run the next scheduled tick (the first tick is fired synchronously by
// refreshChatThumb itself), then let its async work settle.
async function step() {
    const cb = scheduled;
    scheduled = null;
    if (cb) cb();
    await flush();
}

// Build a 200 response whose body is the given Uint8Array.
const okResp = (bytes) => ({ ok: true, arrayBuffer: () => Promise.resolve(bytes.buffer) });

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const OLD = new Uint8Array([1, 2, 3, 4]);
const NEW = new Uint8Array([9, 8, 7, 6]);

// === Scenario 1+2: edge serves OLD for 3 ticks, then NEW ====================
await (async () => {
    reset();
    let n = 0;
    fetchImpl = () => Promise.resolve(okResp(n++ < 3 ? OLD : NEW));

    refreshChatThumb('c1');   // tick 0 (fires synchronously)
    await flush();
    for (let i = 0; i < 4; i++) await step();   // ticks 1..4 (5 ticks total)

    // tick0: baseline reveal (1) · ticks1-2: OLD==OLD skip · tick3: NEW change (2) · tick4: skip
    check('serves OLD then NEW → exactly 2 swaps (reveal + change), not 5', swapCount === 2);
    check('final swap is the changed shot (tick 3 url)', String(lastSwapSrc).endsWith('_3'));
})();

// === Scenario 3: bytes unreadable (CORS/network) → fallback swaps every tick =
await (async () => {
    reset();
    fetchImpl = () => Promise.reject(new Error('CORS blocked'));

    refreshChatThumb('c1');
    await flush();
    await step();
    await step();   // 3 ticks total

    check('fetch error → fallback swaps every tick (zero regression)', swapCount === 3);
})();

// === Scenario 3b: not-served-yet (404) ticks never swap, don't poison baseline
await (async () => {
    reset();
    let n = 0;
    fetchImpl = () => Promise.resolve(n++ < 2 ? { ok: false } : okResp(OLD));

    refreshChatThumb('c1');   // tick0: 404
    await flush();
    await step();             // tick1: 404
    await step();             // tick2: OLD → first reveal
    await step();             // tick3: OLD == OLD → skip

    check('404 ticks do not swap; first real shot reveals once', swapCount === 1);
    check('404 did not corrupt baseline (tick3 OLD is a no-op)', String(lastSwapSrc).endsWith('_2'));
})();

// === Scenario 4: out-of-order resolution can't re-show a stale shot =========
await (async () => {
    reset();
    const resolvers = {};
    fetchImpl = (url) => {
        const seq = Number(String(url).split('_').pop());
        return new Promise((res) => { resolvers[seq] = res; });   // resolve manually
    };

    refreshChatThumb('c1');                 // tick0 fetch (seq 0) — pending
    const t1 = scheduled; scheduled = null; t1();   // tick1 fetch (seq 1) — pending

    // Newer tick (seq 1, NEW shot) resolves FIRST.
    resolvers[1](okResp(NEW));
    await flush();
    // Older tick (seq 0, OLD shot) resolves LATE.
    resolvers[0](okResp(OLD));
    await flush();

    check('out-of-order: only the newer shot swaps', swapCount === 1);
    check('out-of-order: stale older tick does not overwrite (still showing NEW)', String(lastSwapSrc).endsWith('_1'));
})();

// === Scenario 5: a late error-fallback tick must not overwrite a newer success
// (the fallback path obeys the same ordering guard as the success path). =======
await (async () => {
    reset();
    const ctl = {};   // seq -> { resolve, reject } so we control timing + outcome
    fetchImpl = (url) => {
        const seq = Number(String(url).split('_').pop());
        return new Promise((resolve, reject) => { ctl[seq] = { resolve, reject }; });
    };

    refreshChatThumb('c1');                       // tick0 fetch (seq 0) — pending
    const t1 = scheduled; scheduled = null; t1(); // tick1 fetch (seq 1) — pending

    ctl[1].resolve(okResp(NEW));                  // newer tick succeeds first → swaps NEW
    await flush();
    ctl[0].reject(new Error('CORS blocked'));     // older tick errors LATE → fallback
    await flush();

    check('error-fallback respects ordering: stale errored tick does not repaint', swapCount === 1);
    check('error-fallback: still showing the newer shot (not the stale fallback)', String(lastSwapSrc).endsWith('_1'));
})();

if (failures > 0) {
    console.error(`\n${failures} chat-thumb-refresh check(s) failed`);
    process.exit(1);
}
console.log('\nAll chat-thumb-refresh checks passed');
