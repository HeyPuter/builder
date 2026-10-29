import fs from 'node:fs';
import {
  renderServiceWorker,
  swVersion,
  SW_VERSION_TOKEN,
  SW_PRECACHE_TOKEN,
} from './build-sw.mjs';

// ---- Regression guard for the PWA layer -----------------------------------
// Covers the pieces that must stay in sync for the app to be an installable,
// gracefully-offline PWA: the web manifest + its icons, the installability meta
// tags in index.html, the self-contained offline page, the service-worker
// render contract (placeholder injection is all-or-nothing), and the safety
// invariants baked into sw.js (same-origin only, GET only, network-first nav).
// Pure/offline: it reads the source bytes, never runs a build or a browser.

const root = new URL('../', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');
const readBytes = (rel) => fs.readFileSync(new URL(rel, root));
const exists = (rel) => fs.existsSync(new URL(rel, root));

let failures = 0;
function check(name, cond) {
  if (cond) console.log('ok   - ' + name);
  else { console.error('FAIL - ' + name); failures++; }
}

// Width/height from a PNG's IHDR chunk (big-endian, right after the 8-byte
// signature + length + "IHDR"): width @16, height @20. Avoids an image dep.
function pngSize(rel) {
  const b = readBytes(rel);
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

// --- Web app manifest ------------------------------------------------------
let manifest;
try { manifest = JSON.parse(read('src/favicons/site.webmanifest')); }
catch (e) { console.error('FAIL - manifest is valid JSON: ' + e.message); process.exit(1); }

check('manifest has name', typeof manifest.name === 'string' && manifest.name.length > 0);
check('manifest has short_name', !!manifest.short_name);
check('manifest has a stable id', manifest.id === '/');
check('manifest start_url is "/"', manifest.start_url === '/');
check('manifest scope is "/"', manifest.scope === '/');
check('manifest display is standalone', manifest.display === 'standalone');
check('manifest declares display_override', Array.isArray(manifest.display_override) && manifest.display_override.includes('standalone'));
check('manifest has theme_color', /^#[0-9a-f]{6}$/i.test(manifest.theme_color || ''));
check('manifest has background_color', /^#[0-9a-f]{6}$/i.test(manifest.background_color || ''));
check('manifest declares categories', Array.isArray(manifest.categories) && manifest.categories.length > 0);
check('manifest has icons', Array.isArray(manifest.icons) && manifest.icons.length > 0);

const anyIcons = (manifest.icons || []).filter((i) => (i.purpose || 'any').split(/\s+/).includes('any'));
const maskIcons = (manifest.icons || []).filter((i) => (i.purpose || '').split(/\s+/).includes('maskable'));
check('manifest has at least one "any" icon', anyIcons.length >= 1);
check('manifest has a dedicated maskable icon', maskIcons.length >= 1);
// A single entry claiming both "any" and "maskable" is the anti-pattern we fixed
// (a maskable icon has safe-zone padding and looks shrunken when used as "any").
const dualPurpose = (manifest.icons || []).some((i) => {
  const p = (i.purpose || 'any').split(/\s+/);
  return p.includes('any') && p.includes('maskable');
});
check('no icon claims both "any" and "maskable"', !dualPurpose);
check('manifest advertises 192 and 512 sizes', (manifest.icons || []).some((i) => i.sizes === '192x192') && (manifest.icons || []).some((i) => i.sizes === '512x512'));

// Every referenced icon must exist on disk (verbatim-copied to /favicons) at the
// exact advertised dimensions — a wrong/missing size fails installability.
for (const icon of manifest.icons || []) {
  const rel = 'src' + icon.src; // src values are absolute "/favicons/..."
  check('icon file exists: ' + icon.src, exists(rel));
  const size = pngSize(rel);
  const [w, h] = (icon.sizes || '').split('x').map(Number);
  check('icon dimensions match ' + icon.sizes + ': ' + icon.src, !!size && size.w === w && size.h === h);
}

// --- Screenshots (richer install UI) ---------------------------------------
const shots = manifest.screenshots || [];
check('manifest declares screenshots', Array.isArray(shots) && shots.length > 0);
const wide = shots.filter((s) => s.form_factor === 'wide');
const narrow = shots.filter((s) => s.form_factor === 'narrow' || !s.form_factor);
check('has a wide (desktop) screenshot', wide.length >= 1);
check('has a narrow (mobile) screenshot', narrow.length >= 1);

for (const s of shots) {
  const rel = 'src' + s.src; // absolute "/screenshots/..."
  check('screenshot file exists: ' + s.src, exists(rel));
  check('screenshot is a raster image (not svg): ' + s.src, /^image\/(png|jpeg|webp)$/.test(s.type || ''));
  const size = pngSize(rel); // all our shots are PNG
  const [w, h] = (s.sizes || '').split('x').map(Number);
  check('screenshot dimensions match ' + s.sizes + ': ' + s.src, !!size && size.w === w && size.h === h);
  if (size) {
    // Chrome constraints: each side 320–3840px, and max side ≤ 2.3× the min.
    const okRange = size.w >= 320 && size.h >= 320 && size.w <= 3840 && size.h <= 3840;
    const ratio = Math.max(size.w, size.h) / Math.min(size.w, size.h);
    check('screenshot within Chrome size limits: ' + s.src, okRange);
    check('screenshot aspect ratio ≤ 2.3: ' + s.src, ratio <= 2.3);
  }
  check('screenshot has a label (a11y): ' + s.src, typeof s.label === 'string' && s.label.length > 0);
}

// Chrome requires a consistent aspect ratio within each form factor, else it
// drops the set. Compare declared sizes rather than files (already matched above).
function sameAspect(list) {
  if (list.length < 2) return true;
  const a = list.map((s) => { const [w, h] = s.sizes.split('x').map(Number); return w / h; });
  return a.every((r) => Math.abs(r - a[0]) < 0.01);
}
check('wide screenshots share one aspect ratio', sameAspect(wide));
check('narrow screenshots share one aspect ratio', sameAspect(narrow));

// --- index.html installability hints ---------------------------------------
const html = read('src/index.html');
check('index.html links the manifest', /<link\s+rel="manifest"\s+href="\/favicons\/site\.webmanifest">/.test(html));
check('index.html has a theme-color meta', /<meta\s+name="theme-color"/.test(html));
check('index.html has apple-mobile-web-app-capable', /name="apple-mobile-web-app-capable"\s+content="yes"/.test(html));
check('index.html has mobile-web-app-capable', /name="mobile-web-app-capable"\s+content="yes"/.test(html));
check('index.html sets apple-mobile-web-app-title', /name="apple-mobile-web-app-title"/.test(html));
check('index.html has an apple-touch-icon', /rel="apple-touch-icon"/.test(html));

// --- Offline fallback page (must be self-contained) ------------------------
check('offline.html exists', exists('src/offline.html'));
const offline = read('src/offline.html');
check('offline.html has a retry control', /location\.reload\(\)/.test(offline));
check('offline.html auto-recovers on reconnect', /addEventListener\(\s*['"]online['"]/.test(offline));
// No external network references — it is served precisely when there is no net.
const externalRefs = (offline.match(/(?:src|href)\s*=\s*["']https?:\/\//gi) || []);
check('offline.html references no external URLs', externalRefs.length === 0);

// --- Service worker: source contract + safety invariants -------------------
const swSrc = read('src/sw.js');
check('sw.js contains the version placeholder', swSrc.includes(SW_VERSION_TOKEN));
check('sw.js contains the precache placeholder', swSrc.includes(SW_PRECACHE_TOKEN));
check('sw.js bypasses cross-origin requests', /url\.origin\s*!==\s*self\.location\.origin/.test(swSrc));
check('sw.js only handles GET', /request\.method\s*!==\s*['"]GET['"]/.test(swSrc));
check('sw.js does network-first for navigations', /isHtmlNavigation/.test(swSrc) && /preloadResponse/.test(swSrc));
check('sw.js falls back to the offline page', /OFFLINE_URL/.test(swSrc) && /offline\.html/.test(swSrc));
check('sw.js only caches basic (same-origin) responses', /response\.type\s*===\s*['"]basic['"]/.test(swSrc));
// Cache-first is reserved for content-hashed paths and the precached shell;
// every other same-origin file lives at a stable path a deploy can change in
// place, so it must be network-first (cache-first pinned the first copy forever).
check('sw.js serves only immutable/shell paths cache-first', /isImmutable\(url\)/.test(swSrc) && /IMMUTABLE_PATH_RE = \/\^\\\/\(assets\|fonts\|featured-thumbs\)/.test(swSrc));
check('sw.js serves stable-path files network-first', /networkFirst\(request\)/.test(swSrc));
check('sw.js supports skipWaiting via message', /SKIP_WAITING/.test(swSrc) && /skipWaiting/.test(swSrc));
check('sw.js cleans up old caches on activate', /caches\.keys\(\)/.test(swSrc) && /caches\.delete/.test(swSrc));

// --- renderServiceWorker: all-or-nothing placeholder injection -------------
const fakePrecache = ['/', '/index.html', '/assets/app-abc.js', '/assets/app-abc.js', '/offline.html'];
const rendered = renderServiceWorker(swSrc, { version: 'testver123', precache: fakePrecache });
check('render injects the version', rendered.includes('"testver123"'));
check('render injects a precache URL', rendered.includes('"/assets/app-abc.js"'));
check('render de-duplicates the precache list', (rendered.match(/"\/assets\/app-abc\.js"/g) || []).length === 1);
check('render leaves no version placeholder', !rendered.includes('__SW_VERSION__'));
check('render leaves no precache placeholder', !rendered.includes('__PRECACHE_MANIFEST__'));
// Rendered output must be syntactically valid JS (parse without executing).
let parses = true;
try { new Function(rendered); } catch (e) { parses = false; }
check('rendered sw.js parses as valid JS', parses);

function throws(fn) { try { fn(); return false; } catch (e) { return true; } }
check('render throws without a version', throws(() => renderServiceWorker(swSrc, { precache: [] })));
check('render throws when precache is not an array', throws(() => renderServiceWorker(swSrc, { version: 'v', precache: 'x' })));
check('render throws when a placeholder is missing', throws(() => renderServiceWorker('// no placeholders here', { version: 'v', precache: [] })));

// --- swVersion: deterministic + sensitive to input -------------------------
check('swVersion is deterministic', swVersion('a', 'b') === swVersion('a', 'b'));
check('swVersion changes with input', swVersion('a', 'b') !== swVersion('a', 'c'));
check('swVersion is a short hex string', /^[0-9a-f]{12}$/.test(swVersion('a')));

// --- PWA runtime (js/pwa.js) invariants ------------------------------------
const pwa = read('src/js/pwa.js');
check('pwa.js registers /sw.js', /serviceWorker\.register\(\s*['"]\/sw\.js['"]/.test(pwa));
check('pwa.js tears the worker down in local dev', /getRegistrations\(\)/.test(pwa) && /unregister\(\)/.test(pwa));
// The critical guard: the first-install claim also fires controllerchange, so a
// reload must only happen for a user-ACCEPTED update — never on first load.
check('pwa.js only reloads on an accepted update', /updateAccepted/.test(pwa) && /!updateAccepted/.test(pwa) && /controllerchange/.test(pwa));
check('pwa.js exposes a programmatic install trigger', /window\.promptPWAInstall\s*=/.test(pwa));
check('pwa.js snoozes a dismissed install prompt', /pwaInstallDismissedAt/.test(pwa) && /onDismiss/.test(pwa));
check('sw.js answers GET_PRECACHE on the port the page sends', /GET_PRECACHE/.test(swSrc) && /event\.ports\[0\]\.postMessage\(PRECACHE\)/.test(swSrc));
check('helpers.js reports turns to pwa.js', /window\.pwaTurnChanged\(processing\)/.test(read('src/js/helpers.js')));

// --- pwa.js run for real against a fake browser -----------------------------
// Both toasts used to land seconds after load, right as people went to type.
// The "new version" one was usually false too. Navigations are network-first,
// so a visit after a deploy already runs the new bundles while the browser
// installs the new worker beside them. Now a worker that ships what the page
// runs is activated quietly, only a tab that is behind it gets the prompt
// (held while a turn runs), and the install offer waits for the first message.
const ORIGIN = 'https://builder.puter.com';
const NEW_SHELL = ['/', '/index.html', '/assets/app-new.js', '/assets/index-new.css'];
const flush = () => new Promise((r) => setImmediate(r));

function fakeWorker(precache) {
    return {
        state: 'installing', posted: [], listeners: {},
        postMessage(m, ports) {
            this.posted.push(m);
            // A worker that can't answer (precache null) just never replies.
            if (m.type === 'GET_PRECACHE' && ports && precache) ports[0].postMessage(precache.slice());
        },
        addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
        skipped() { return this.posted.some((m) => m.type === 'SKIP_WAITING'); },
    };
}

function boot({ bundles = ['app-new.js', 'index-new.css'], controller = fakeWorker(['/assets/app-old.js']), waiting = null, store = {} } = {}) {
    const winListeners = {}, swListeners = {}, toasts = [], timers = [];
    let reloads = 0;
    const reg = {
        waiting, installing: null, listeners: {},
        addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); },
        update: () => Promise.resolve(),
    };
    const sw = {
        controller,
        register: () => Promise.resolve(reg),
        addEventListener(t, fn) { (swListeners[t] = swListeners[t] || []).push(fn); },
        getRegistrations: () => Promise.resolve([]),
    };
    const win = {
        addEventListener(t, fn) { (winListeners[t] = winListeners[t] || []).push(fn); },
        showToast(msg, opts) {
            const t = { msg, opts, dismissed: false, dismiss() { this.dismissed = true; } };
            toasts.push(t);
            return t;
        },
        location: { reload: () => { reloads++; } },
        matchMedia: () => ({ matches: false }),
        navigator: {},
    };
    const nodes = bundles.map((f) => (/\.css$/.test(f) ? { href: ORIGIN + '/assets/' + f } : { src: ORIGIN + '/assets/' + f }));
    nodes.push({ src: 'https://js.puter.com/v2/' }); // cross-origin: not one of ours
    class FakeChannel {
        constructor() {
            this.port1 = { onmessage: null };
            const p1 = this.port1;
            this.port2 = { postMessage: (data) => p1.onmessage && p1.onmessage({ data }) };
        }
    }
    const fakeSetTimeout = (fn, ms) => { timers.push({ fn, ms, live: true }); return timers.length; };
    const fakeClearTimeout = (id) => { if (id && timers[id - 1]) timers[id - 1].live = false; };
    new Function('window', 'navigator', 'location', 'document', 'localStorage', 'self',
        'setTimeout', 'clearTimeout', 'setInterval', 'MessageChannel', pwa)(
        win,
        { serviceWorker: sw },
        { hostname: 'builder.puter.com', search: '', href: ORIGIN + '/', origin: ORIGIN },
        { querySelectorAll: () => nodes },
        { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
        {},
        fakeSetTimeout, fakeClearTimeout, () => 0, FakeChannel,
    );
    const fire = (map, t, arg) => (map[t] || []).forEach((fn) => fn(arg));
    return {
        win, reg, sw, toasts, store,
        reloads: () => reloads,
        load: async () => { fire(winListeners, 'load'); await flush(); },
        // The browser installs `worker` as an update and it reaches "installed".
        install: async (worker) => {
            reg.installing = worker;
            fire(reg.listeners, 'updatefound');
            reg.installing = null;
            reg.waiting = worker;
            worker.state = 'installed';
            fire(worker.listeners, 'statechange');
            await flush();
        },
        takeOver: async (worker) => { sw.controller = worker; reg.waiting = null; fire(swListeners, 'controllerchange'); await flush(); },
        turn: (on) => win.pwaTurnChanged(on),
        appInstalled: () => fire(winListeners, 'appinstalled'),
        runTimers: async () => { for (const t of timers) if (t.live) { t.live = false; t.fn(); } await flush(); },
        installPrompt: () => {
            const e = { prevented: false, preventDefault() { this.prevented = true; }, prompt() {}, userChoice: Promise.resolve({ outcome: 'accepted' }) };
            fire(winListeners, 'beforeinstallprompt', e);
            return e;
        },
    };
}
const updateToasts = (b) => b.toasts.filter((t) => t.opts.key === 'pwa-update');
const installToasts = (b) => b.toasts.filter((t) => t.opts.key === 'pwa-install');

// A visit after a deploy, where the page already runs the new bundles.
{
    const b = boot();
    await b.load();
    const w = fakeWorker(NEW_SHELL);
    await b.install(w);
    check('update a fresh page already runs shows no toast', updateToasts(b).length === 0);
    check('update a fresh page already runs is activated quietly', w.skipped());
    await b.takeOver(w);
    check('quiet activation neither reloads nor prompts', b.reloads() === 0 && updateToasts(b).length === 0);
}
{
    const w = fakeWorker(NEW_SHELL);
    const b = boot({ waiting: w });
    await b.load();
    check('a worker already waiting at load is activated quietly when the page runs it', w.skipped() && updateToasts(b).length === 0);
}
{
    const b = boot();
    await b.load();
    const w = fakeWorker(null); // never answers
    await b.install(w);
    check('no answer from the worker waits before deciding', !w.skipped());
    await b.runTimers();
    check('no answer from the worker counts as current (no false prompt)', w.skipped() && updateToasts(b).length === 0);
}
// A tab left open across a deploy.
{
    const b = boot({ bundles: ['app-old.js', 'index-old.css'] });
    await b.load();
    const w = fakeWorker(NEW_SHELL);
    await b.install(w);
    check('a tab behind the new worker gets the Reload prompt', updateToasts(b).length === 1 && !w.skipped());
    updateToasts(b)[0].opts.action.onClick();
    check('Reload activates the waiting worker', w.skipped() && b.reloads() === 0);
    await b.takeOver(w);
    check('the accepted takeover reloads once', b.reloads() === 1);
}
{
    const b = boot({ bundles: ['app-old.js', 'index-old.css'] });
    await b.load();
    b.turn(true);
    await b.install(fakeWorker(NEW_SHELL));
    check('an update found mid-turn is held', updateToasts(b).length === 0);
    b.turn(false);
    check('the held update prompts once the turn ends', updateToasts(b).length === 1);
}
// Another tab activated the new version quietly. This one is still on old
// bundles and nothing is left waiting to announce it.
{
    const b = boot({ bundles: ['app-old.js', 'index-old.css'] });
    await b.load();
    await b.takeOver(fakeWorker(NEW_SHELL));
    check('a takeover by a newer version than this tab runs prompts', updateToasts(b).length === 1 && b.reloads() === 0);
    updateToasts(b)[0].opts.action.onClick();
    check('its Reload, with nothing left waiting, reloads the tab', b.reloads() === 1);
}
// First install. There is no controller, and the claim's controllerchange must not reload.
{
    const b = boot({ controller: null });
    await b.load();
    const w = fakeWorker(NEW_SHELL);
    await b.install(w);
    await b.takeOver(w);
    check('first install neither prompts nor reloads', updateToasts(b).length === 0 && b.reloads() === 0);
}
// Two deploys seen by one stale tab keep a single toast.
{
    const b = boot({ bundles: ['app-old.js'] });
    await b.load();
    await b.install(fakeWorker(NEW_SHELL));
    await b.install(fakeWorker(NEW_SHELL));
    check('a second update replaces the first toast', updateToasts(b).length === 2 && updateToasts(b)[0].dismissed && !updateToasts(b)[1].dismissed);
}

// The install offer waits for the first message, closes on its own, and comes
// back at most weekly (30 days after its ×).
{
    const b = boot();
    await b.load();
    const e = b.installPrompt();
    check('install prompt event is taken over (no mini-infobar)', e.prevented);
    check('install offer does not show at load', installToasts(b).length === 0);
    b.turn(true);
    check('install offer shows as soon as a message is sent', installToasts(b).length === 1 && installToasts(b)[0].opts.action.label === 'Install');
    check('install offer closes on its own', installToasts(b)[0].opts.duration > 0);
    b.turn(false);
    check('a turn ending does not close it early', !installToasts(b)[0].dismissed);
    b.turn(true);
    check('install offer shows once per page load', installToasts(b).length === 1);
    b.appInstalled();
    check('installing another way dismisses the offer without snoozing it', installToasts(b)[0].dismissed && !('pwaInstallDismissedAt' in b.store));
}
const DAY = 24 * 60 * 60 * 1000;
async function offeredWith(store) {
    const b = boot({ store });
    await b.load();
    b.installPrompt();
    b.turn(true);
    return installToasts(b).length === 1;
}
{
    const b = boot();
    await b.load();
    b.installPrompt();
    b.turn(true);
    const ignored = await offeredWith({ ...b.store });
    check('an ignored install offer stays hidden on the next visit', !ignored);
    check('an ignored install offer comes back after a week', await offeredWith({ pwaInstallShownAt: String(Date.now() - 8 * DAY) }));
}
{
    const b = boot();
    await b.load();
    b.turn(true);
    b.installPrompt();
    check('an install event that arrives mid-turn is offered right away', installToasts(b).length === 1);
    installToasts(b)[0].opts.onDismiss();
    check('the install offer\'s × snoozes it', 'pwaInstallDismissedAt' in b.store);
    const stale = { pwaInstallShownAt: String(Date.now() - 8 * DAY) };
    check('a dismissed install offer stays hidden past the week', !(await offeredWith({ ...stale, pwaInstallDismissedAt: String(Date.now() - 8 * DAY) })));
    check('a dismissed install offer comes back after 30 days', await offeredWith({ ...stale, pwaInstallDismissedAt: String(Date.now() - 31 * DAY) }));
}

// --- Build wiring (vite.config) --------------------------------------------
const vite = read('vite.config.js');
check('vite registers the pwa plugin', /pwaPlugin\(\)/.test(vite));
check('vite writes sw.js at the root', /'sw\.js'/.test(vite) && /renderServiceWorker/.test(vite));
check('vite loads js/pwa.js in the bundle', /'js\/pwa\.js'/.test(vite));
check('vite precaches the maskable icons', /maskable-512\.png/.test(vite));
// closeBundle is a PARALLEL rollup hook: without `sequential: true` the precache
// scan ran before classicBundle had copied favicons/ and every icon was dropped
// from the list (the built sw.js shipped without them).
check('vite runs the sw precache scan after the favicon copy (sequential closeBundle)',
    /closeBundle:\s*\{\s*sequential:\s*true,\s*handler\(\)/.test(vite));
check('vite ships the offline page', /offline\.html/.test(vite));
// The shell files are served cache-first, so their BYTES must be part of the
// worker version or a deploy that only changes them never reaches users.
check('vite folds the shell files\' bytes into the SW version', /shellDigest/.test(vite) && /swVersion\(swSrc, precache\.slice\(\)\.sort\(\)\.join\('\\n'\), shellDigest\)/.test(vite));
check('vite ships the screenshots dir', /screenshots/.test(vite));

console.log('\n' + (failures ? failures + ' check(s) FAILED' : 'all PWA checks passed'));
process.exit(failures ? 1 : 0);
