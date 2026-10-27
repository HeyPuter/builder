import fs from 'node:fs';

// ---- Regression guard: the preview reloads once the canary shows the clear ----
// puter.site's edge keeps a copy of each file per Origin request header. A write
// clears only the copy without one (the preview iframe's), and the builder's
// fetches always send Origin, so the builder can't see the iframe's copy. A
// hosting.update clears every copy on the site at once. The refresh used to hold
// every reload to at least 10 seconds after a hosting.update, about 12 s in all.
// Now it reads a canary file (so the builder's copy holds the old value), writes
// a new value, calls hosting.update, and reloads the moment the builder's copy
// shows the new value, which only that site-wide clear can do. With no old
// value to read it waits for the limit instead.
//
// Runs the real functions sliced out of ui.js against stubs, a fake edge and a
// fake clock.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const ui = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
function slice(startMarker, endMarker) {
    const a = ui.indexOf(startMarker);
    const b = ui.indexOf(endMarker, a);
    if (a < 0 || b <= a) throw new Error('could not extract ' + startMarker);
    return ui.slice(a, b);
}
const BLOCK =
    slice('// Monotonic counter identifying the latest preview operation', '// --- Project-loading skeleton') +
    slice('function previewSubdomain(url) {', '\n}\n') + '\n}\n' +
    slice('// Wait for the latest changes to reach the live site', 'let previewRefreshPending = false;');

const DIR = '/u/AppData/app/c1';
const CANARY = '.cache/canary.txt';
const START = 1_000_000;

// The fake edge, as the builder sees it. Its copy of a file is saved on the
// first fetch and dropped only by the site-wide clear a hosting.update asks for
// (opts.clearDelay ms later, never when null). A missing file is a 404 and is
// not saved.
function makeEnv(opts = {}) {
    let now = START;
    const timers = [];
    const reloads = [];
    const calls = { hostingUpdate: 0, canaryWrites: 0 };
    const clearDelay = 'clearDelay' in opts ? opts.clearDelay : 4000;
    const disk = {};
    if (opts.canary !== false) disk[CANARY] = 'v0';
    const copy = {};
    if (opts.cached !== false && opts.canary !== false) copy[CANARY] = 'v0';
    const frameData = {};
    const frame = {
        length: 1,
        data: (k, v) => (v === undefined ? frameData[k] : (frameData[k] = v)),
        attr: (k, v) => { if (k === 'src' && v !== 'about:blank') reloads.push(now); return frame; },
        one: () => frame,
    };
    const body = { length: 1, find: () => ({ length: 0, remove() {} }), append() {} };
    const $ = (sel) => (sel === '.preview-frame' ? frame : body);
    const win = { currentPreviewUrl: 'https://preview-x.puter.site/', currentPreviewPath: DIR };
    const later = (fn, ms) => { timers.push({ at: now + (ms || 0), fn }); };
    const rel = (p) => p.slice(DIR.length + 1);
    const puter = {
        hosting: {
            update: async () => {
                calls.hostingUpdate++;
                if (opts.updateFails) throw new Error('hosting.update failed');
                if (clearDelay != null) later(() => { for (const k of Object.keys(copy)) delete copy[k]; }, clearDelay);
            },
        },
        fs: {
            write: async (p, text) => {
                if (rel(p) === CANARY) { calls.canaryWrites++; if (opts.writeFails) throw new Error('write failed'); }
                disk[rel(p)] = text;
            },
            stat: async (p) => { if (!(rel(p) in disk)) throw new Error('not found'); return {}; },
        },
    };
    const fetch = async (url) => {
        const n = new URL(url).pathname.slice(1);
        if (!n) return { ok: true, headers: { get: (h) => (/cache-control/i.test(h) ? 'no-store' : null) }, text: async () => '' };
        if (!(n in copy)) {
            if (!(n in disk)) return { ok: false, status: 404, headers: { get: () => null }, text: async () => 'not found' };
            copy[n] = disk[n];
        }
        const text = copy[n];
        return { ok: true, headers: { get: () => null }, text: async () => text };
    };
    const quiet = { log() {}, warn() {}, error() {} };
    const api = new Function('$', 'window', 'puter', 'fetch', 'Date', 'setTimeout', 'AbortSignal', 'console',
        'currentChatId', 'currentAppDir', 'chatHistory', 'generateChatTitle',
        BLOCK + '\nreturn { refreshPreviewWhenReady, reloadPreviewFrame, ensurePreviewCanary,' +
        ' limit: typeof PREVIEW_CANARY_LIMIT_MS === "number" ? PREVIEW_CANARY_LIMIT_MS : null };'
    )($, win, puter, fetch, { now: () => now }, later, undefined, quiet, 'c1', DIR, [], () => '');
    return {
        ...api, calls, reloads, disk, copy,
        now: () => now,
        async run(promise) {
            let done = false;
            promise.then(() => { done = true; });
            for (let i = 0; i < 5000 && !done; i++) {
                await new Promise((r) => setImmediate(r));
                if (done) break;
                timers.sort((a, b) => a.at - b.at);
                const t = timers.shift();
                if (!t) continue;
                now = Math.max(now, t.at);
                t.fn();
            }
            return done;
        },
    };
}

const L = makeEnv().limit;
check('there is an upper limit, under the old 22 s', typeof L === 'number' && L > 0 && L < 22000, String(L));

{
    const env = makeEnv({ clearDelay: 4000 });
    const finished = await env.run(env.refreshPreviewWhenReady());
    check('the refresh finishes', finished);
    check('it writes the canary and asks for the clear once each', env.calls.canaryWrites === 1 && env.calls.hostingUpdate === 1,
        JSON.stringify(env.calls));
    check('it reloads once, when the clear lands, not after a 10 s floor',
        env.reloads.length === 1 && env.reloads[0] - START >= 4000 && env.reloads[0] - START <= 4600, `${env.reloads[0] - START}ms`);
    check('the builder\'s copy now holds the new value, ready to be the old value next time', env.copy[CANARY] === env.disk[CANARY]);

    const second = env.now();
    await env.run(env.refreshPreviewWhenReady());
    check('the next refresh is just as quick', env.reloads[1] - second >= 4000 && env.reloads[1] - second <= 4600, `${env.reloads[1] - second}ms`);
}

{
    const env = makeEnv({ cached: false, clearDelay: 4000 });
    await env.run(env.refreshPreviewWhenReady());
    check('a canary the builder had no copy of is read first, so it still works',
        env.reloads[0] - START >= 4000 && env.reloads[0] - START <= 4600, `${env.reloads[0] - START}ms`);
}

{
    const env = makeEnv({ canary: false, clearDelay: 4000 });
    await env.run(env.refreshPreviewWhenReady());
    check('with no canary yet it waits for the limit', env.reloads[0] - START >= L, `${env.reloads[0] - START}ms`);
    check('and creates the canary for next time', CANARY in env.disk);
}

{
    const env = makeEnv({ clearDelay: null });
    await env.run(env.refreshPreviewWhenReady());
    check('a clear that never lands reloads at the limit', env.reloads.length === 1 && env.reloads[0] - START >= L && env.reloads[0] - START < L + 600,
        `${env.reloads[0] - START}ms`);
}

{
    const env = makeEnv({ updateFails: true });
    await env.run(env.refreshPreviewWhenReady());
    check('a failed hosting.update reloads at the limit', env.reloads[0] - START >= L, `${env.reloads[0] - START}ms`);
}

{
    const env = makeEnv({ writeFails: true, clearDelay: 4000 });
    await env.run(env.refreshPreviewWhenReady());
    check('a failed canary write reloads at the limit', env.reloads[0] - START >= L, `${env.reloads[0] - START}ms`);
}

{
    const env = makeEnv({ clearDelay: null });
    const first = env.refreshPreviewWhenReady();
    await new Promise((r) => setImmediate(r));
    env.reloadPreviewFrame('https://preview-x.puter.site/'); // a plain reload, or a chat switch
    await env.run(first);
    check('a superseded refresh never reloads', env.reloads.length === 1 && env.reloads[0] === START + 30, JSON.stringify(env.reloads));
}

{
    const env = makeEnv({ canary: false });
    await env.ensurePreviewCanary(DIR);
    check('opening a project without a canary creates one', env.disk[CANARY] === 'start');
    env.disk[CANARY] = 'abc';
    await env.ensurePreviewCanary(DIR);
    check('and leaves an existing one alone', env.disk[CANARY] === 'abc');
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll preview canary checks passed.');
