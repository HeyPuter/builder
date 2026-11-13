import fs from 'node:fs';

// ---- The draft preview is shown on puter.host when that host answers ---------
// Puter serves every site at <sub>.puter.site and again at <sub>.puter.host,
// the same files with no edge cache in front. On puter.host a refresh only
// prepares the files and reloads, with no canary and no wait for a clear. But
// puter.host isn't on the Public Suffix List yet, and some networks and filters
// block it, so each time the preview opens or refreshes the builder asks
// puter.host first (a HEAD). With no answer the preview stays on puter.site and
// the refresh clears its cache with the canary (test-preview-canary.mjs).
//
// Runs the real functions sliced out of ui.js against stubs and a fake clock.

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
const fn = (name) => slice(name, '\n}\n') + '\n}\n';
const BLOCK =
    slice('// Monotonic counter identifying the latest preview operation', '// --- Project-loading skeleton') +
    fn('function previewSubdomain(url) {') +
    slice('// Wait for the latest changes to reach the live site', 'let previewRefreshPending = false;') +
    fn('let _previewOpenSeq = 0;'); // its counter, then loadPreviewOnAnsweringHost

const DIR = '/u/AppData/app/c1';
const SITE = 'https://preview-x.puter.site/';
const HOST = 'https://preview-x.puter.host/';
const CANARY = '.puter/canary.txt';

// opts.host: how puter.host answers the check. 'up' (200), a status number,
// 'blocked' (the request fails, as a DNS block or an ad blocker does), or
// 'hang' (no answer ever). opts.hostMs: how long its answer takes.
// opts.manifestMs / opts.stampMs: how long each preparation step takes.
function makeEnv(opts = {}) {
    let now = 1_000_000;
    const start = now;
    const timers = [];
    const later = (f, ms) => { timers.push({ at: now + (ms || 0), fn: f }); };
    const steps = [];
    const reloads = [];
    const calls = { hostingUpdate: 0, canaryWrites: 0, hostChecks: [] };
    // puter.site's edge copy of the canary, dropped 4 s after a hosting.update.
    const disk = { [CANARY]: 'v0' };
    const copy = { [CANARY]: 'v0' };
    const frameData = {};
    const frame = {
        length: 1,
        data: (k, v) => (v === undefined ? frameData[k] : (frameData[k] = v)),
        attr: (k, v) => { if (k === 'src' && v !== 'about:blank') { reloads.push({ at: now - start, url: v }); steps.push('reload'); } return frame; },
        one: () => frame,
    };
    const body = { length: 1, find: () => ({ length: 0, remove() {} }), append() {}, hasClass: () => true };
    const $ = (sel) => (sel === '.preview-frame' ? frame : body);
    const win = {
        currentPreviewUrl: SITE,
        currentPreviewPath: DIR,
        ensureAppManifest: () => new Promise((r) => later(() => { steps.push('manifest'); r(); }, opts.manifestMs ?? 200)),
        applyPreviewCacheBust: () => new Promise((r) => later(() => { steps.push('stamp'); r(); }, opts.stampMs ?? 100)),
    };
    const rel = (p) => p.slice(DIR.length + 1);
    const puter = {
        hosting: {
            update: async () => {
                calls.hostingUpdate++;
                later(() => { for (const k of Object.keys(copy)) delete copy[k]; }, 4000);
            },
        },
        fs: {
            write: async (p, text) => { if (rel(p) === CANARY) calls.canaryWrites++; disk[rel(p)] = text; },
        },
    };
    const fetch = (url, init = {}) => {
        const host = opts.host ?? 'up'; // read each time, so a test can unblock it
        const u = new URL(url);
        if (u.hostname.endsWith('.puter.host')) {
            if (init.method === 'HEAD') calls.hostChecks.push({ url, method: init.method, at: now - start });
            if (host === 'blocked') return new Promise((_, no) => later(() => no(new TypeError('Failed to fetch')), opts.hostMs ?? 20));
            if (host === 'hang') return new Promise(() => {});
            const status = host === 'up' ? 200 : host;
            // puter.host sends no Cache-Control.
            return new Promise((r) => later(() => r({ ok: status >= 200 && status < 300, status, headers: { get: () => null }, text: async () => '' }),
                init.method === 'HEAD' ? (opts.hostMs ?? 150) : 0));
        }
        const n = u.pathname.slice(1);
        if (!n) return Promise.resolve({ ok: true, status: 200, headers: { get: (h) => (/cache-control/i.test(h) ? 'no-store' : null) }, text: async () => '' });
        if (!(n in copy)) copy[n] = disk[n];
        return Promise.resolve({ ok: true, status: 200, headers: { get: () => null }, text: async () => copy[n] });
    };
    const quiet = { log() {}, warn() {}, error() {} };
    const api = new Function('$', 'window', 'puter', 'fetch', 'Date', 'setTimeout', 'clearTimeout', 'AbortSignal', 'console',
        'currentChatId', 'currentAppDir', 'chatHistory', 'generateChatTitle', 'isProcessing', 'previewRefreshPending',
        BLOCK + '\nreturn { refreshPreviewWhenReady, reloadPreviewFrame, checkPuterHost, toPuterHost, previewShownUrl,' +
        ' loadPreviewOnAnsweringHost };'
    )($, win, puter, fetch, { now: () => now }, later, () => {}, undefined, quiet, 'c1', DIR, [], () => '', true, opts.pending !== false);
    return {
        ...api, win, calls, steps, reloads, frameData,
        startEarly: () => win.startEarlyPreviewClear(),
        sleep: (ms) => new Promise((r) => later(r, ms)),
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

// ---- The draft's puter.host address -------------------------------------------

{
    const { toPuterHost } = makeEnv();
    check('a draft\'s puter.site address has a puter.host twin', toPuterHost(SITE) === HOST);
    check('…keeping its path, query and fragment',
        toPuterHost('https://preview-x.puter.site/a/b.html?q=1#top') === 'https://preview-x.puter.host/a/b.html?q=1#top');
    check('…and a bare host', toPuterHost('http://preview-x.puter.site') === 'https://preview-x.puter.host');
    check('another host has none', toPuterHost('https://example.com/') === null);
    check('a look-alike host has none', toPuterHost('https://x.puter.site.evil.com/') === null);
    check('no address has none', toPuterHost(null) === null && toPuterHost(undefined) === null);
}

// ---- The check ------------------------------------------------------------------

{
    const env = makeEnv({ host: 'up' });
    let ok;
    await env.run(env.checkPuterHost(SITE).then((v) => { ok = v; }));
    check('the check is one HEAD to the draft on puter.host',
        env.calls.hostChecks.length === 1 && env.calls.hostChecks[0].method === 'HEAD' && env.calls.hostChecks[0].url === HOST,
        JSON.stringify(env.calls.hostChecks));
    check('an answer means puter.host', ok === true);
    check('…but the answer alone changes nothing on screen, only what loads does', env.previewShownUrl(SITE) === SITE);
}
for (const [host, want, name] of [
    [204, true, 'any 2xx means puter.host'],
    [403, false, 'a 403 (a filtering proxy\'s block page) means puter.site'],
    [404, false, 'a 404 (no page at the root) means puter.site, which only costs the slower refresh'],
    [302, false, 'anything else that isn\'t a 2xx means puter.site'],
    [503, false, 'a server error means puter.site'],
    ['blocked', false, 'a failed request (a block) means puter.site'],
]) {
    const env = makeEnv({ host });
    let ok;
    await env.run(env.checkPuterHost(SITE).then((v) => { ok = v; }));
    check(name, ok === want, String(ok));
}
{
    const env = makeEnv({ host: 'hang' });
    let ok;
    await env.run(env.checkPuterHost(SITE).then((v) => { ok = v; }));
    check('no answer within the limit means puter.site, without waiting forever', ok === false);
}
{
    const env = makeEnv();
    let ok;
    await env.run(env.checkPuterHost('https://example.com/').then((v) => { ok = v; }));
    check('an address that isn\'t a draft is never checked', ok === false && env.calls.hostChecks.length === 0);
}

// ---- A refresh while puter.host answers -----------------------------------------

{
    const env = makeEnv({ host: 'up', hostMs: 150, manifestMs: 200, stampMs: 100 });
    const finished = await env.run(env.refreshPreviewWhenReady());
    check('the refresh finishes', finished);
    check('it checks puter.host on every refresh', env.calls.hostChecks.length === 1);
    check('it writes no canary and asks for no clear', env.calls.canaryWrites === 0 && env.calls.hostingUpdate === 0, JSON.stringify(env.calls));
    check('it reloads on puter.host under a fresh token',
        env.reloads.length === 1 && env.reloads[0].url.startsWith(HOST + '?__pv='), JSON.stringify(env.reloads));
    check('the install block, then the cache-bust tokens (puter.host sends no Cache-Control), then the reload',
        env.steps.join(' ') === 'manifest stamp reload', env.steps.join(' '));
    check('the check runs alongside the manifest pass, so it adds no time',
        env.reloads[0] && env.reloads[0].at === 300, env.reloads[0] && env.reloads[0].at + 'ms');

    await env.run(env.refreshPreviewWhenReady());
    check('the next refresh checks again', env.calls.hostChecks.length === 2);
}

// ---- A refresh while puter.host is blocked --------------------------------------

{
    const env = makeEnv({ host: 'blocked' });
    await env.run(env.refreshPreviewWhenReady());
    check('it falls back to the puter.site canary and clear',
        env.calls.canaryWrites === 1 && env.calls.hostingUpdate === 1, JSON.stringify(env.calls));
    check('…and reloads on puter.site once the clear lands',
        env.reloads.length === 1 && env.reloads[0].url.startsWith(SITE + '?__pv=') && env.reloads[0].at >= 4000,
        JSON.stringify(env.reloads));
    check('puter.site sends no-store, so no cache-bust tokens', !env.steps.includes('stamp'), env.steps.join(' '));
}

// ---- The early clear --------------------------------------------------------------

// The project is opened first, so the frame is on the host its check chose.
async function opened(env) {
    await env.run(env.loadPreviewOnAnsweringHost(SITE));
    await env.run(env.sleep(50));
}
{
    const env = makeEnv({ host: 'up' });
    await opened(env);
    env.startEarly();
    await env.run(env.sleep(50));
    check('a round that wrote starts no early clear while the frame is on puter.host',
        env.calls.canaryWrites === 0 && env.calls.hostingUpdate === 0, JSON.stringify(env.calls));
}
{
    const env = makeEnv({ host: 'blocked' });
    await opened(env);
    env.startEarly();
    await env.run(env.sleep(1000));
    check('…but does while it is on puter.site', env.calls.canaryWrites === 1, JSON.stringify(env.calls));
    const t = env.reloads.length;
    await env.run(env.refreshPreviewWhenReady());
    check('the refresh takes the early clear over, with no second canary',
        env.calls.canaryWrites === 1 && env.calls.hostingUpdate === 1 && env.reloads.length === t + 1 && env.reloads[t].url.startsWith(SITE),
        JSON.stringify({ calls: env.calls, reloads: env.reloads }));
}

{
    // puter.host starts answering between the round's end and the refresh.
    const opts = { host: 'blocked' };
    const env = makeEnv(opts);
    await opened(env);
    env.startEarly();
    await env.run(env.sleep(500));
    opts.host = 'up';
    const t = env.reloads.length;
    await env.run(env.refreshPreviewWhenReady());
    check('if puter.host answers by the refresh, the early clear is dropped and the reload goes there',
        env.reloads.length === t + 1 && env.reloads[t].url.startsWith(HOST + '?__pv=') && env.reloads[t].at < 4000,
        JSON.stringify(env.reloads));
}

{
    // The refresh starts right after the round, while the early clear is still
    // preparing, and the check takes long enough for the early clear to reach
    // its next step before failing. It used to see the refresh's counter, stop,
    // and leave the refresh nothing to reload.
    const env = makeEnv({ host: 'blocked', hostMs: 1500 });
    await opened(env);
    env.startEarly();
    const t = env.reloads.length;
    await env.run(env.refreshPreviewWhenReady());
    check('a slow failed check during an early clear still ends in a reload on puter.site',
        env.reloads.length === t + 1 && env.reloads[t].url.startsWith(SITE + '?__pv='),
        JSON.stringify({ calls: env.calls, reloads: env.reloads.slice(t) }));
    check('…with the one canary the early clear wrote', env.calls.canaryWrites === 1, JSON.stringify(env.calls));
}

// ---- Opening a project ------------------------------------------------------------

{
    const env = makeEnv({ host: 'up' });
    await env.run(env.loadPreviewOnAnsweringHost(SITE));
    await env.run(env.sleep(50));
    check('an opened project loads on puter.host when it answers',
        env.reloads.length === 1 && env.reloads[0].url.startsWith(HOST + '?__pv='), JSON.stringify(env.reloads));
}
{
    const env = makeEnv({ host: 'blocked' });
    await env.run(env.loadPreviewOnAnsweringHost(SITE));
    await env.run(env.sleep(50));
    check('…and on puter.site when it doesn\'t',
        env.reloads.length === 1 && env.reloads[0].url.startsWith(SITE + '?__pv='), JSON.stringify(env.reloads));
}
{
    const env = makeEnv({ host: 'up', hostMs: 150 });
    const first = env.loadPreviewOnAnsweringHost(SITE);
    const second = env.loadPreviewOnAnsweringHost(SITE); // the same project opened again
    await env.run(Promise.all([first, second]));
    await env.run(env.sleep(50));
    check('a newer open of the project replaces the older one, so it loads once', env.reloads.length === 1, JSON.stringify(env.reloads));
}
{
    // The previous project is on screen, and the badge sync (or the toolbar's
    // Reload) reloads the frame while the new project's check is out.
    const env = makeEnv({ host: 'up', hostMs: 150 });
    const OLD = 'https://preview-old.puter.host/?__pv=1_a';
    env.frameData['preview-url'] = OLD;
    const p = env.loadPreviewOnAnsweringHost(SITE);
    env.reloadPreviewFrame(null, { keepPendingUpdate: true });
    await env.run(p);
    await env.run(env.sleep(50));
    check('a reload during the check loads the new project, never the previous one',
        env.reloads.length > 0 && env.reloads.every((r) => !r.url.includes('preview-old')), JSON.stringify(env.reloads));
    check('…and the open still lands on the host its check chose',
        env.reloads.length > 0 && env.reloads[env.reloads.length - 1].url.startsWith(HOST + '?__pv='), JSON.stringify(env.reloads));
}
{
    // A refresh starts while the open's check is out (puter.host blocked, so
    // the refresh waits about 4 s for puter.site's clear).
    const env = makeEnv({ host: 'blocked', hostMs: 200 });
    const p = env.loadPreviewOnAnsweringHost(SITE);
    const refresh = env.refreshPreviewWhenReady();
    await env.run(Promise.all([p, refresh]));
    check('a refresh starting during the check doesn\'t hold the page back, it shows right away',
        env.reloads.length === 2 && env.reloads[0].at < 1000 && env.reloads[0].url.startsWith(SITE), JSON.stringify(env.reloads));
    check('…and the refresh still reloads once its clear lands', env.reloads[1] && env.reloads[1].at >= 4000, JSON.stringify(env.reloads));
}
{
    // A failed check (an older project's, or one that timed out) answers after
    // this project loaded on puter.host.
    const opts = { host: 'up' };
    const env = makeEnv(opts);
    await opened(env);
    opts.host = 'blocked';
    await env.run(env.checkPuterHost(SITE));
    check('a late failed check doesn\'t move the Share link, tests or error mapping off the host on screen',
        env.previewShownUrl(SITE) === HOST);
}
{
    const env = makeEnv({ host: 'up', hostMs: 150 });
    const p = env.loadPreviewOnAnsweringHost(SITE);
    env.win.currentPreviewUrl = 'https://preview-y.puter.site/'; // another project opened
    await env.run(p);
    await env.run(env.sleep(50));
    check('an open whose project changed during the check never loads', env.reloads.length === 0, JSON.stringify(env.reloads));
}
{
    const show = slice('window.showAppPreview = function(url, opts) {', '/** Hide the preview pane');
    check('showAppPreview opens a saved project through the host check',
        /else \{[^}]*loadPreviewOnAnsweringHost\(url\);/.test(show));
}

// ---- The Share draft link ---------------------------------------------------------
// It shows the host the preview is on, so the link matches what the user sees.

for (const [host, want] of [['up', HOST], ['blocked', SITE]]) {
    const env = makeEnv({ host });
    await opened(env);
    let html = '';
    const panel = { length: 1, find: () => ({ html: (h) => { html = h; } }) };
    const render = new Function('$', 'window', 'htmlEscape', 'previewShownUrl',
        fn('function renderSharePanel() {') + '\nreturn renderSharePanel;'
    )(() => panel, { currentPreviewUrl: SITE, external_link_svg: '' }, (t) => String(t), env.previewShownUrl);
    render();
    const bare = want.replace('https://', '').replace(/\/$/, '');
    check(`the Share draft panel shows and links ${host === 'up' ? 'puter.host while it answers' : 'puter.site while puter.host is blocked'}`,
        html.includes(`href="${want}"`) && html.includes(`>${bare}</a>`) && !html.includes(host === 'up' ? 'puter.site' : 'puter.host'), html);
}
{
    const copy = slice("$(document).on('click', '.preview-share-panel .share-copy'", '\n});');
    check('the copy button copies the link the panel shows', copy.includes(".find('.publish-url-display').attr('href')"));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll preview host checks passed.');
