import fs from 'node:fs';

// ---- Regression guard: the avatar's profile picture -------------------------
// The toolbar avatar and the account panel header show the user's Puter
// profile picture (puter.auth.getProfilePicture) over their initial. That API
// answers null both for "no picture" and for "the request failed", has no
// timeout, and can be missing from an older cached puter.js — so the cache in
// profile-picture.js must:
//   * only ever hold a validated image data URL;
//   * not drop a picture on one null, nor on a throw / hang;
//   * share one request between concurrent asks and respect its freshness;
//   * paint from localStorage on the first frame after a reload;
//   * never record an answer that arrived after the signed-in user changed.
//
// profile-picture.js is a classic browser-global script; evaluate it against a
// stub window with a fake clock (mirrors scripts/test-publish-errors.mjs).

const src = fs.readFileSync(new URL('../src/js/profile-picture.js', import.meta.url), 'utf8');

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const PNG2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function memoryStorage() {
    const m = new Map();
    return {
        _map: m,
        quota: false,
        get length() { return m.size; },
        key(i) { return [...m.keys()][i] ?? null; },
        getItem(k) { return m.has(k) ? m.get(k) : null; },
        setItem(k, v) { if (this.quota) throw new Error('QuotaExceededError'); m.set(k, String(v)); },
        removeItem(k) { m.delete(k); },
    };
}

// A fresh module instance over a stub environment. `answer` is what the next
// getProfilePicture call does: a value, a function returning a value/promise,
// or a list consumed in order.
function load({ storage = memoryStorage(), user = { username: 'ada' }, api = true, online = true, startAt = 1_000_000, image = null } = {}) {
    let now = startAt;
    let timers = [];
    let seq = 0;
    const env = {
        calls: 0,
        answers: [],
        storage,
        events: {},
        window: {
            user,
            puter: { auth: {} },
            addEventListener(type, fn) { (env.events[type] ||= []).push(fn); },
        },
    };
    // image: how an off-DOM load behaves — 'load', 'error', 'hang' (neither),
    // or 'load-no-decode' (loads, decode() never settles). Omitted: no Image
    // constructor at all, so the format check stands alone.
    if (image) {
        env.window.Image = function () {
            const img = this;
            Object.defineProperty(img, 'src', { set() {
                if (image === 'error') fakeSetTimeout(() => img.onerror && img.onerror(), 1);
                else if (image !== 'hang') fakeSetTimeout(() => img.onload && img.onload(), 1);
            } });
            img.decode = () => image === 'load-no-decode' ? new Promise(() => {}) : Promise.resolve();
        };
    }
    if (api) {
        env.window.puter.auth.getProfilePicture = () => {
            env.calls++;
            const a = env.answers.length ? env.answers.shift() : null;
            return typeof a === 'function' ? a() : Promise.resolve(a);
        };
    }
    const fakeSetTimeout = (fn, ms) => { const id = ++seq; timers.push({ id, at: now + (ms || 0), fn }); return id; };
    const fakeClearTimeout = (id) => { timers = timers.filter((t) => t.id !== id); };
    const FakeDate = { now: () => now };
    new Function('window', 'localStorage', 'navigator', 'document', 'setTimeout', 'clearTimeout', 'Date', src)(
        env.window, storage, { onLine: online }, undefined, fakeSetTimeout, fakeClearTimeout, FakeDate);
    env.pp = env.window.profilePicture;
    env.flush = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };
    // Move the clock forward, firing due timers in order and letting the
    // promise chains they unblock run between them.
    env.advance = async (ms) => {
        const end = now + ms;
        for (;;) {
            await env.flush();
            timers.sort((a, b) => a.at - b.at);
            const next = timers[0];
            if (!next || next.at > end) break;
            timers.shift();
            now = next.at;
            next.fn();
        }
        now = end;
        await env.flush();
    };
    env.pending = () => timers.length;
    env.now = () => now;
    return env;
}

// ---- Validation ------------------------------------------------------------
{
    const { pp } = load();
    check('a PNG data URL is accepted', pp.normalize(PNG) === PNG);
    check('whitespace inside the base64 is stripped', pp.normalize(PNG.slice(0, 40) + '\n  ' + PNG.slice(40)) === PNG);
    check('an SVG data URL is accepted (inert inside <img>)', !!pp.normalize('data:image/svg+xml;base64,PHN2Zy8+'));
    for (const [label, v] of [
        ['an http URL', 'https://example.com/a.png'],
        ['a javascript: URL', 'javascript:alert(1)'],
        ['an HTML data URL', 'data:text/html;base64,PHNjcmlwdD4='],
        ['a non-base64 image data URL', 'data:image/png,<svg onload=alert(1)>'],
        ['base64 with a quote in it', 'data:image/png;base64,AAAA"onerror="x'],
        ['null', null], ['a number', 42], ['an object', { src: PNG }],
        ['an oversized payload', 'data:image/png;base64,' + 'A'.repeat(4 * 1024 * 1024 + 4)],
    ]) check(`${label} is rejected`, pp.normalize(v) === null);
}

// ---- Missing API / signed out ---------------------------------------------
{
    const env = load({ api: false });
    const r = await env.pp.refresh('ada');
    check('an older puter.js without getProfilePicture: refresh resolves null, no throw', r === null);
}
{
    const env = load({ user: { username: 'tmp', is_temp: true } });
    await env.pp.refresh('tmp');
    check('a temporary user is never asked about', env.calls === 0);
}
{
    const env = load({ user: null });
    await env.pp.refresh('ada');
    check('nobody signed in: never asked', env.calls === 0);
}
{
    const env = load();
    await env.pp.refresh('grace');
    check('only the signed-in user is asked about (the SDK answers for them alone)', env.calls === 0);
}

// ---- Success, sharing, freshness, persistence ------------------------------
{
    const env = load();
    const changes = [];
    env.pp.onChange((u, p) => changes.push([u, p]));
    env.answers.push(PNG);
    const [a, b] = await Promise.all([env.pp.refresh('ada'), env.pp.refresh('ada')]);
    check('concurrent asks share one request', env.calls === 1);
    check('…and both get the picture', a === PNG && b === PNG);
    check('get() serves it synchronously afterwards', env.pp.get('ada') === PNG);
    check('listeners hear about the change once', changes.length === 1 && changes[0][0] === 'ada' && changes[0][1] === PNG);
    const stored = JSON.parse(env.storage.getItem('profilePicture:ada'));
    check('it is persisted per username', stored.p === PNG && typeof stored.t === 'number');

    await env.pp.refresh('ada');
    check('a fresh cache asks nothing', env.calls === 1);
    await env.advance(11 * 60 * 1000);
    env.answers.push(PNG);
    await env.pp.refresh('ada');
    check('a stale cache revalidates', env.calls === 2);
    check('an unchanged answer notifies nobody', changes.length === 1);

    // A reload: a new instance over the same storage paints from cache with
    // no request, then revalidates only once stale.
    const env2 = load({ storage: env.storage, startAt: env.now() + 60 * 1000 });
    check('after a reload, get() has the picture before any request', env2.pp.get('ada') === PNG && env2.calls === 0);
    await env2.pp.refresh('ada');
    check('…and a still-fresh persisted answer is not re-asked', env2.calls === 0);
}
{
    const storage = memoryStorage();
    storage.setItem('profilePicture:ada', '{not json');
    const env = load({ storage });
    check('corrupt storage is ignored', env.pp.get('ada') === null);
    storage.setItem('profilePicture:bob', JSON.stringify({ p: 'javascript:alert(1)', t: 1 }));
    check('a tampered stored value is rejected', load({ storage, user: { username: 'bob' } }).pp.get('bob') === null);
}
{
    const storage = memoryStorage();
    storage.quota = true;
    const env = load({ storage });
    env.answers.push(PNG);
    await env.pp.refresh('ada');
    check('storage full: the picture still shows from memory', env.pp.get('ada') === PNG);
}

// ---- null is ambiguous: don't drop a picture on one answer -----------------
{
    const env = load();
    env.answers.push(PNG);
    await env.pp.refresh('ada');
    env.answers.push(null, PNG);
    const p = env.pp.refresh('ada', { force: true });
    await env.advance(5000);
    check('a null followed by the picture keeps the picture', (await p) === PNG && env.pp.get('ada') === PNG && env.calls === 3);

    env.answers.push(null, null);
    const q = env.pp.refresh('ada', { force: true });
    await env.advance(5000);
    check('two nulls in a row really mean "no picture"', (await q) === null && env.pp.get('ada') === null);
    check('…and the "none" answer is cached too', JSON.parse(env.storage.getItem('profilePicture:ada')).p === null);

    env.answers.push(null);
    await env.pp.refresh('ada', { force: true });
    check('with no picture to lose, one null is enough (no extra request)', env.calls === 6);
}
{
    const env = load();
    env.answers.push('https://evil.example/x.png');
    await env.pp.refresh('ada');
    check('a non-data-URL answer counts as no picture', env.pp.get('ada') === null);
}

// ---- The off-DOM image check ------------------------------------------------
{
    const env = load({ image: 'load' });
    env.answers.push(PNG);
    const p = env.pp.refresh('ada');
    await env.advance(10);
    check('an image that loads is accepted', (await p) === PNG);
}
{
    const env = load({ image: 'error' });
    env.answers.push(PNG);
    const p = env.pp.refresh('ada');
    await env.advance(10);
    check('an image that fails to load counts as no picture', (await p) === null && env.pp.get('ada') === null);
}
{
    const env = load({ image: 'load-no-decode' });
    env.answers.push(PNG);
    const p = env.pp.refresh('ada');
    await env.advance(1000);
    check('a decode() that stalls (tab not painting) does not block a loaded picture', (await p) === PNG);
}
{
    const env = load({ image: 'hang' });
    env.answers.push(PNG);
    const p = env.pp.refresh('ada');
    await env.advance(10 * 1000);
    check('a load that never settles is a failed attempt…', (await p) === null);
    check('…not cached as "no picture"', env.storage.getItem('profilePicture:ada') === null);
    check('…and is retried', env.pending() > 0);
}

// ---- Failures: throw / hang keep what is showing, and retry ----------------
{
    const env = load();
    env.answers.push(PNG);
    await env.pp.refresh('ada');
    env.answers.push(() => Promise.reject(new Error('network')));
    const r = await env.pp.refresh('ada', { force: true });
    check('a rejected request keeps the picture', r === PNG && env.pp.get('ada') === PNG);
    env.answers.push(PNG2);
    await env.pp.refresh('ada');
    check('a pending retry is not jumped by a routine refresh', env.calls === 2);
    await env.advance(5000);
    check('the retry fires after its backoff and picks up the new picture', env.calls === 3 && env.pp.get('ada') === PNG2);
}
{
    const env = load();
    env.answers.push(() => { throw new Error('sync throw'); });
    const r = await env.pp.refresh('ada');
    check('a synchronous throw from the SDK is contained', r === null);
}
{
    const env = load();
    env.answers.push(PNG);
    await env.pp.refresh('ada');
    env.answers.push(() => new Promise(() => {}));
    const r = env.pp.refresh('ada', { force: true });
    await env.advance(15 * 1000);
    check('a request that never settles times out and keeps the picture', (await r) === PNG);
    env.answers.push(PNG);
    await env.pp.refresh('ada', { force: true });
    check('…and does not pin the in-flight slot', env.calls === 3);
}
{
    const env = load();
    for (let i = 0; i < 10; i++) env.answers.push(() => Promise.reject(new Error('down')));
    await env.pp.refresh('ada');
    await env.advance(60 * 60 * 1000);
    check('retries stop after the backoff schedule runs out', env.calls === 4 && env.pending() === 0, `calls=${env.calls}`);
    env.answers.length = 0;
    env.answers.push(PNG);
    env.events.online.forEach((fn) => fn());
    await env.flush();
    check('coming back online retries straight away', env.calls === 5 && env.pp.get('ada') === PNG);
}
{
    const env = load({ online: false });
    await env.pp.refresh('ada');
    check('offline: no request is made', env.calls === 0);
}

// ---- The signed-in user changed mid-request --------------------------------
{
    const env = load();
    let resolve;
    env.answers.push(() => new Promise((r) => { resolve = r; }));
    const p = env.pp.refresh('ada');
    env.window.user = { username: 'grace' };
    resolve(PNG);
    await p;
    check("an answer that lands after a user switch is not recorded as the old user's",
        env.pp.get('ada') === null && env.storage.getItem('profilePicture:ada') === null);
}

// ---- invalidate / clear / other tabs ---------------------------------------
{
    const env = load();
    env.answers.push(PNG);
    await env.pp.refresh('ada');
    env.pp.invalidate('ada', PNG2);
    check('invalidating a picture that is no longer current does nothing', env.pp.get('ada') === PNG);
    env.pp.invalidate('ada', PNG);
    check('invalidating the current picture drops it everywhere',
        env.pp.get('ada') === null && env.storage.getItem('profilePicture:ada') === null);

    env.answers.push(PNG);
    await env.pp.refresh('ada');
    env.storage.setItem('unrelated', '1');
    env.pp.clear();
    check('clear() wipes every cached picture but nothing else',
        env.pp.get('ada') === null && env.storage.getItem('unrelated') === '1'
        && ![...env.storage._map.keys()].some((k) => k.startsWith('profilePicture:')));
}
{
    const env = load();
    env.answers.push(PNG);
    await env.pp.refresh('ada');
    const seen = [];
    env.pp.onChange((u, p) => seen.push(p));
    env.storage.setItem('profilePicture:ada', JSON.stringify({ p: PNG2, t: 1 }));
    env.events.storage.forEach((fn) => fn({ key: 'profilePicture:ada' }));
    check("another tab's newer picture is adopted and announced", env.pp.get('ada') === PNG2 && seen[0] === PNG2);
}
{
    const env = load();
    env.pp.onChange(() => { throw new Error('bad listener'); });
    const origError = console.error;
    console.error = () => {};
    env.answers.push(PNG);
    const r = await env.pp.refresh('ada');
    console.error = origError;
    check('a throwing listener cannot break the refresh', r === PNG && env.pp.get('ada') === PNG);
}

// ---- Wiring ------------------------------------------------------------------
{
    const ui = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
    const vite = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
    check('profile-picture.js loads before ui.js', vite.indexOf("'js/profile-picture.js'") > 0
        && vite.indexOf("'js/profile-picture.js'") < vite.indexOf("'js/ui.js'"));
    check('the toolbar avatar is painted through paintAvatar and refreshed',
        /paintAvatar\(\$container\.find\('\.user-avatar'\)\[0\], window\.user\.username\);\s*window\.profilePicture\?\.refresh\(window\.user\.username\);/.test(ui));
    check('the account panel avatar is painted through paintAvatar',
        /paintAvatar\(\$panel\.find\('\.user-panel-avatar'\)\[0\], name\);/.test(ui));
    check('the picture is set as an <img> src, never interpolated into HTML',
        /img\.src = picture;/.test(ui) && !/\$\{picture\}|' \+ picture/.test(ui));
    check('a broken painted image falls back to the initial and is invalidated',
        /img\.addEventListener\('error'[\s\S]{0,200}profilePicture\?\.invalidate\(username, picture\)/.test(ui));
    const logout = ui.slice(ui.indexOf("$(document).on('click', '.user-panel-logout'"));
    check('logging out forgets cached pictures before the reload',
        logout.indexOf('profilePicture?.clear()') > 0 && logout.indexOf('profilePicture?.clear()') < logout.indexOf('location.reload()'));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll profile picture checks passed.');
