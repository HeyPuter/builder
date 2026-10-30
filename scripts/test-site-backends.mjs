import fs from 'node:fs';

// ---- Regression guard for dynamic backends (site-backends.js) --------------
// A project made while FEATURE_FLAGS.dynamicWorkers is on builds its backends
// as files __workers/<name>.worker.js in the folder the site serves, run by
// Puter on that same site, with a store that belongs to the site's address.
// A project made before keeps create_worker for good. What can go wrong:
//   * a save of the file isn't checked against the preview, or a file Puter
//     never runs (nested, misnamed, outside the served folder) is treated as
//     a backend;
//   * a key lands in the wrong site's store, or a publish, a duplicate or a
//     new live address leaves the destination without its keys;
//   * a publish overwrites the live site's own live key, or a new address
//     loses the mark that keeps it the live site's;
//   * the release ships the preview's save canary;
//   * the AI is still told to use create_worker, or not told how pages call
//     a backend;
//   * a project made before the flag gets the new tools or loses its old
//     ones, or the mark that tells them apart reaches the AI.
// Runs the production bytes with puter and fetch stubbed.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail !== undefined ? ' :: ' + detail : '')); failures++; }
}
async function rejects(promise, substr) {
    try { await promise; return false; }
    catch (e) { return substr ? String((e && e.message) || e).includes(substr) : true; }
}
const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
function slice(src, from, to, label) {
    const a = src.indexOf(from);
    const b = src.indexOf(to, a + from.length);
    if (a < 0 || b < 0) throw new Error('could not extract ' + label);
    return src.slice(a, b);
}

const HELP = read('../src/js/helpers.js');
const PATHS = slice(HELP, 'window.normalizePosixPath =', '// ---- Per-path file-write serialization', 'the path-sandbox helpers');
const CANARY = slice(HELP, '// ---- Worker deploy canary', '// ---- Preview sub-resource cache-busting', 'the canary helpers');
const TOOLS = slice(read('../src/js/tools.js'), '// Saving a deployed worker', 'window.findTool = function', 'the worker save helpers');
const UI_SRC = read('../src/js/ui.js');
const UI_BACKENDS = slice(UI_SRC, '// ----- dynamic backends', '// Remove the runtime tag', 'the dynamic backend helpers') +
    slice(UI_SRC, 'function previewSubdomain(url) {', '\n}\n', 'previewSubdomain') + '\n}\n';
const MODULES = ['worker-ownership', 'site-backends', 'worker-secrets', 'worker-sender', 'editor-core', 'template-core']
    .map((n) => read(`../src/js/${n}.js`)).join('\n');
const TOOL_FILES = ['create_worker', 'delete_worker', 'list_workers', 'get_worker', 'set_secret', 'set_email_sender_name']
    .map((n) => read(`../src/tools/workers/${n}.js`)).join('\n');

const KEY = 'sk_' + 'test_' + '51HxYzAbCdEfGhIjKlMn0pQr';
const LIVE_KEY = 'sk_' + 'live_' + '51HxYzAbCdEfGhIjKlMn0pQr';
const ROOT = '/u/AppData/b/c1';
const RELEASE = '/u/AppData/b/.published/c1/r_1_x';
const PREVIEW = 'https://preview-abc.puter.site/';
const LIVE = 'https://shop.puter.site/';
const NEW_LIVE = 'https://store.puter.site/';
const API = 'https://api.puter.com';

// A stub Puter. Sites serve folders, and an address runs as the app whose
// index_url is that address, which Puter makes itself the first time a backend
// there runs when no app has the address. Every app has its own key-value
// store behind a permission the user grants once, and records who created it,
// since Puter lets an app change only the apps it created. Builder's own
// key-value store needs no permission.
function makeEnv(o = {}) {
    const files = new Map(Object.entries(o.files || {}));
    const sites = Object.assign({ 'https://preview-abc.puter.site': ROOT, 'https://shop.puter.site': RELEASE, 'https://store.puter.site': RELEASE }, o.sites || {});
    const apps = new Map(); // name -> { uid, name, title, index_url, creator }
    const stores = new Map();
    const builderKv = new Map();
    const granted = new Set();
    const prompts = [];
    const toasts = [];
    const confirms = [];
    const fetched = { uid: 0, wake: [] };
    const writes = [];
    const hostingDeleted = [];
    const uidFor = (origin) => 'app-' + origin.replace(/^https:\/\//, '').replace(/\./g, '-');
    const originOf = (url) => String(url || '').replace(/\/+$/, '');
    const byOrigin = (origin) => [...apps.values()].find((a) => originOf(a.index_url) === origin) || null;
    const byUid = (uid) => [...apps.values()].find((a) => a.uid === uid) || null;
    const puterApp = (origin) => {
        if (!byOrigin(origin)) { const uid = uidFor(origin); apps.set(uid, { uid, name: uid, title: uid, index_url: origin, creator: 'puter' }); }
        return byOrigin(origin);
    };
    for (const origin of o.apps || []) puterApp(origin);
    const store = (app) => { if (!stores.has(app)) stores.set(app, new Map()); return stores.get(app); };
    const copyOf = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
    let seq = 0;
    const puter = {
        APIOrigin: API,
        authToken: 'tok',
        fs: {
            readdir: async (dir) => {
                if (o.readdirFails) throw new Error('network down');
                const items = [];
                for (const p of files.keys()) {
                    if (!p.startsWith(dir + '/')) continue;
                    const rest = p.slice(dir.length + 1);
                    const name = rest.split('/')[0];
                    if (!items.some((i) => i.name === name)) items.push({ name, is_dir: rest.includes('/') });
                }
                if (!items.length) throw { code: 'subject_does_not_exist', message: 'Subject does not exist' };
                return items;
            },
            read: async (p) => { if (!files.has(p)) throw { code: 'subject_does_not_exist' }; const t = files.get(p); return { text: async () => t }; },
            write: async (p, d) => { writes.push(p); files.set(p, d); },
        },
        apps: {
            create: async (opts) => {
                const origin = originOf(opts.indexURL);
                // Puter merges into an app it made for the address, which an
                // app may not change.
                if (byOrigin(origin)) throw { status: 403, code: 'forbidden', message: 'Access denied' };
                let name = opts.name;
                if (apps.has(name)) { if (!opts.dedupeName) throw { status: 400, code: 'app_name_already_in_use' }; name += '-x' + (++seq); }
                const app = { uid: 'app-reg-' + name, name, title: opts.title, index_url: origin + '/', creator: 'builder' };
                apps.set(name, app);
                return copyOf(app);
            },
            get: async (name) => { const a = apps.get(name); if (!a) throw { status: 404, message: 'Entity not found' }; return copyOf(a); },
            update: async (name, attrs) => {
                const a = apps.get(name);
                if (!a) throw { status: 404, message: 'Entity not found' };
                if (a.creator !== 'builder') throw { status: 403, code: 'forbidden', message: 'Access denied' };
                if (attrs.indexURL !== undefined) {
                    if (o.moveFails) throw { status: 400, code: 'app_index_url_already_in_use' };
                    a.index_url = originOf(attrs.indexURL) + '/';
                }
                if (attrs.title !== undefined) a.title = attrs.title;
                return copyOf(a);
            },
            delete: async (name) => { if (!apps.delete(name)) throw { status: 404, message: 'Entity not found' }; return { success: true }; },
        },
        workers: { list: async () => [], get: async () => null },
        hosting: { delete: async (sub) => { hostingDeleted.push(sub); } },
        perms: {
            check: async (res, d) => res === 'appData' && granted.has(d.app),
            request: async (res, d) => {
                if (!byUid(d.app)) throw { status: 404 };
                prompts.push(d.app);
                if (o.decline) return false;
                granted.add(d.app);
                return true;
            },
        },
        kv: {
            get: async (k, opt) => {
                if (!opt || !opt.appUuid) { if (o.recordReadFails) throw new Error('kv down'); return copyOf(builderKv.get(k)); }
                if (!granted.has(opt.appUuid)) throw new Error('forbidden');
                return copyOf(store(opt.appUuid).get(k));
            },
            set: async (k, v, opt) => {
                if (!opt || !opt.appUuid) { if (o.recordWriteFails) throw new Error('kv down'); builderKv.set(k, copyOf(v)); return true; }
                if (!granted.has(opt.appUuid)) throw new Error('forbidden');
                store(opt.appUuid).set(k, copyOf(v));
                return true;
            },
            del: async (k, opt) => {
                if (!opt || !opt.appUuid) return builderKv.delete(k);
                if (!granted.has(opt.appUuid)) throw new Error('forbidden');
                return store(opt.appUuid).delete(k);
            },
        },
    };
    globalThis.fetch = async (url, init) => {
        if (url === API + '/auth/app-uid-from-origin') {
            fetched.uid++;
            const { origin } = JSON.parse(init.body);
            const app = byOrigin(origin);
            return { ok: true, status: 200, json: async () => ({ uid: app ? app.uid : uidFor(origin) }) };
        }
        const u = new URL(url);
        const m = /^\/__workers\/([a-z0-9_-]+)\//.exec(u.pathname);
        const dir = sites[u.origin];
        if (m && dir && files.has(`${dir}/__workers/${m[1]}.worker.js`)) {
            fetched.wake.push(u.origin + '/' + m[1]);
            puterApp(u.origin);
            return { ok: false, status: 404, text: async () => 'Not found' };
        }
        return { ok: false, status: 404, text: async () => 'Not found' };
    };
    globalThis.puterConfirm = async (text) => { confirms.push(text); return o.confirm !== false; };
    globalThis.currentAppDir = o.openDir === undefined ? ROOT : o.openDir;
    // The open project's history, whose system message says which kind it is.
    globalThis.chatHistory = [o.dynamic === false ? { role: 'system' } : { role: 'system', dynamicWorkers: true }];
    globalThis.savedChats = [{ id: 'c1', title: 'Shop' }];
    const win = {
        FEATURE_FLAGS: { dynamicWorkers: o.flag !== false },
        tools: [],
        currentPreviewUrl: o.previewUrl === undefined ? PREVIEW : o.previewUrl,
        currentPreviewPath: o.previewPath === undefined ? ROOT : o.previewPath,
        currentPublishedUrl: o.publishedUrl === undefined ? LIVE : o.publishedUrl,
        showToast: (t) => toasts.push(t),
        withFileLock: (p, fn) => Promise.resolve().then(fn),
        writeFileVerified: async (p, d) => { files.set(p, d); },
    };
    const ui = new Function('window', 'puter',
        PATHS + '\n' + CANARY + '\n' + MODULES + '\n' + TOOLS + '\n' + TOOL_FILES + '\n' + UI_BACKENDS +
        '\nreturn { publishSiteBackends, stripCanaryFromReleaseBackends, planSiteMove, finishSiteMove, moveSiteBackends };')(win, puter);
    const tool = (name) => win.tools.find((t) => t.function.name === name);
    // The app an address runs as, the way Puter finds it.
    const appAt = (url) => byOrigin(originOf(url));
    // Register the preview's and the live site's apps the way Builder does
    // when it creates the sites.
    const registerBoth = async () => {
        await win.SiteBackends.registerApp(PREVIEW, 'Shop', 'preview');
        await win.SiteBackends.registerApp(LIVE, 'Shop', 'live');
    };
    return { win, puter, ui, tool, files, apps, stores, builderKv, granted, prompts, toasts, confirms, fetched, writes, hostingDeleted, uidFor, appAt, registerBoth };
}

const BACKEND = { [`${ROOT}/__workers/api.worker.js`]: "router.get('/x', () => 1);", [`${ROOT}/index.html`]: '<html></html>' };
const PREVIEW_APP = 'app-preview-abc-puter-site';
const LIVE_APP = 'app-shop-puter-site';
const NEW_LIVE_APP = 'app-store-puter-site';
// A turn's state carries its project's history, as a real turn's does.
const st = { appDir: ROOT, currentChatId: 'c1', chatHistory: [{ role: 'system', dynamicWorkers: true }] };

// --- what counts as a dynamic backend ---
{
    const { win } = makeEnv();
    const SB = win.SiteBackends;
    check('name: a top-level .worker.js file is a backend', SB.nameOf('__workers/api.worker.js') === 'api' && SB.nameOf('/__workers/my_api-2.worker.js') === 'my_api-2');
    check('name: nested, misnamed or uppercase files are not', [
        '__workers/sub/api.worker.js', '__workers/api.js', 'workers/api.js', '__workers/Api.worker.js', 'x/__workers/api.worker.js', '__workers/.worker.js',
    ].every((p) => SB.nameOf(p) === null));
    check('origin: a puter.site URL gives its origin', SB.siteOrigin('https://Shop.puter.site/a?b=1') === 'https://shop.puter.site');
    check('origin: other hosts and plain http give none', [
        'https://shop.puter.app/', 'http://shop.puter.site/', 'https://a.b.puter.site/', 'https://example.com/', '', null,
    ].every((u) => SB.siteOrigin(u) === null));
    check('url: a backend answers under /__workers on its site', SB.urlOf(PREVIEW, 'api') === 'https://preview-abc.puter.site/__workers/api' && SB.urlOf(null, 'api') === null && SB.urlOf(PREVIEW, 'A') === null);
    const EC = win.EditorCore;
    check('code view: a backend file is tagged as backend', EC.classify('__workers/api.worker.js').backend === true);
    check('code view: the served-folder path decides when the site serves a subfolder',
        EC.classify('site/__workers/api.worker.js', { servedRel: '__workers/api.worker.js' }).backend === true &&
        EC.classify('__workers/api.worker.js', { servedRel: null }).backend === true &&
        EC.classify('__workers/sub/a.worker.js').backend === false);
}

// --- listing a site's backends ---
{
    const { win } = makeEnv({ files: {
        [`${ROOT}/__workers/zeta.worker.js`]: '', [`${ROOT}/__workers/api.worker.js`]: '',
        [`${ROOT}/__workers/helpers.js`]: '', [`${ROOT}/__workers/sub/x.worker.js`]: '', [`${ROOT}/__workers/Bad.worker.js`]: '',
    } });
    const list = await win.SiteBackends.list(ROOT);
    check('list: only the backends Puter runs, by name', JSON.stringify(list.map((b) => b.name)) === '["api","zeta"]', JSON.stringify(list));
    check('list: with their paths', list[0].path === `${ROOT}/__workers/api.worker.js`);
    check('list: a site without __workers has none', (await win.SiteBackends.list('/u/elsewhere')).length === 0);
    const failing = makeEnv({ readdirFails: true });
    check('list: a read that fails is a failure, not "no backends"', await rejects(failing.win.SiteBackends.list(ROOT), 'network down'));
}

// --- the save check ---
{
    const { win } = makeEnv({ files: BACKEND });
    const t = await win.workerSaveTarget(`${ROOT}/__workers/api.worker.js`, { appDir: ROOT });
    check('save: a backend save is checked on the preview', t && t.name === 'api' && t.url === 'https://preview-abc.puter.site/__workers/api', JSON.stringify(t));
    check('save: a file Puter never runs is not', await win.workerSaveTarget(`${ROOT}/__workers/sub/a.worker.js`, { appDir: ROOT }) === null);
    const stamped = win.stampWorkerSave(t, "router.get('/x', () => 1);");
    check('save: the canary goes on the saved code', stamped.startsWith(";router.get('/__builder/canary'"));
}
{
    const { win } = makeEnv({ files: BACKEND, previewUrl: null });
    check('save: with no preview yet there is nothing to check', await win.workerSaveTarget(`${ROOT}/__workers/api.worker.js`, { appDir: ROOT }) === null);
}
{
    const { win } = makeEnv({ files: BACKEND, openDir: '/u/AppData/b/c2' });
    check('save: a project that is not open is never checked against the open one\'s preview',
        await win.workerSaveTarget(`${ROOT}/__workers/api.worker.js`, { appDir: ROOT }) === null);
}
{
    const { win } = makeEnv({ previewPath: `${ROOT}/site` });
    const t = await win.workerSaveTarget(`${ROOT}/site/__workers/api.worker.js`, { appDir: ROOT });
    check('save: the backend sits in the folder the preview serves', t && t.name === 'api');
    check('save: a __workers folder the preview doesn\'t serve isn\'t run', await win.workerSaveTarget(`${ROOT}/__workers/api.worker.js`, { appDir: ROOT }) === null);
}
{
    const { win } = makeEnv({ dynamic: false, files: BACKEND });
    check('older project: a __workers file gets no save check', await win.workerSaveTarget(`${ROOT}/__workers/api.worker.js`, { appDir: ROOT }) === null);
}
{
    const { win } = makeEnv({ files: BACKEND });
    const t = await win.workerSaveTarget(`${ROOT}/__workers/api.worker.js`, { appDir: ROOT, chatHistory: [{ role: 'system' }] });
    check('older project: the turn\'s own history decides, not the open chat\'s', t === null);
}

// --- the tools ---
{
    const on = makeEnv({ files: BACKEND });
    const off = makeEnv({ dynamic: false, files: BACKEND });
    const SB = on.win.SiteBackends;
    const dynTools = SB.toolsFor(on.win.tools, [{ role: 'system', dynamicWorkers: true }]);
    const oldTools = SB.toolsFor(on.win.tools, [{ role: 'system' }]);
    const named = (list, n) => list.find((t) => t.function.name === n);
    check('tools: a dynamic project gets no create_worker', !named(dynTools, 'create_worker'));
    check('tools: an older project keeps it', !!named(oldTools, 'create_worker') && !!named(SB.toolsFor(on.win.tools, null), 'create_worker'));
    check('tools: an older project gets the tools as before', oldTools.length === on.win.tools.length &&
        oldTools.every((t, i) => t.function === on.win.tools[i].function && t.exec === on.win.tools[i].exec));
    check('tools: neither kind sends the marks to the AI', dynTools.concat(oldTools).every((t) => !('dynamic' in t) && !('legacyOnly' in t)));
    check('tools: a dynamic project is told about __workers', /__workers/.test(named(dynTools, 'set_secret').function.description) &&
        /__workers/.test(named(dynTools, 'set_secret').function.parameters.properties.worker.description));
    check('tools: an older project is not', !/__workers/.test(named(oldTools, 'set_secret').function.description) &&
        !/__workers/.test(named(oldTools, 'set_secret').function.parameters.properties.worker.description));
    check('tools: the dynamic wording keeps the parameters', JSON.stringify(Object.keys(named(dynTools, 'set_secret').function.parameters.properties)) ===
        JSON.stringify(Object.keys(named(oldTools, 'set_secret').function.parameters.properties)) &&
        named(dynTools, 'set_secret').function.strict === named(oldTools, 'set_secret').function.strict);
    check('tools: the same exec runs for both', named(dynTools, 'set_secret').exec === named(oldTools, 'set_secret').exec);
    check('new projects: marked only while the flag is on',
        SB.markNewProject({ role: 'system' }).dynamicWorkers === true &&
        !('dynamicWorkers' in makeEnv({ flag: false }).win.SiteBackends.markNewProject({ role: 'system' })));
    const listed = await on.tool('list_workers').exec({}, st);
    check('list_workers: lists the backends with the path pages call',
        listed.backends && listed.backends.length === 1 && listed.backends[0].path === '/__workers/api' &&
        listed.backends[0].preview_url === 'https://preview-abc.puter.site/__workers/api', JSON.stringify(listed));
    check('list_workers: an older project gets nothing new', !('backends' in await off.tool('list_workers').exec({}, { ...st, chatHistory: [{ role: 'system' }] })));
    const got = await on.tool('get_worker').exec({ name: 'api' }, st);
    check('get_worker: a backend is found by its file', got.success && got.file_path === `${ROOT}/__workers/api.worker.js`);
    check('delete_worker: a backend is removed by deleting its file', await rejects(on.tool('delete_worker').exec({ name: 'api' }, st), 'delete that file'));
}

// --- keys ---
{
    const env = makeEnv({ files: BACKEND });
    const r = await env.tool('set_secret').exec({ worker: 'api', name: 'STRIPE_SECRET_KEY', value: KEY, live: false }, st);
    check('set_secret: the key lands in the preview site\'s store', r.success && env.stores.get(PREVIEW_APP).get('secret:STRIPE_SECRET_KEY') === KEY, JSON.stringify(r));
    check('set_secret: without Builder\'s app, Puter makes one by running the backend first', env.fetched.wake.length === 1 && env.apps.has(PREVIEW_APP));
    check('set_secret: the user is asked once, for that site', env.prompts.join(',') === PREVIEW_APP);
    check('set_secret: the result never repeats the key', !JSON.stringify(r).includes(KEY));
    check('set_secret: the AI is told pages must not read it', /never read a secret: key from browser code/.test(r.note));
    const again = await env.tool('set_secret').exec({ worker: 'api', name: 'OTHER_KEY', value: 'v', live: false }, st);
    check('set_secret: a second key asks nothing and wakes nothing', again.success && env.prompts.length === 1 && env.fetched.wake.length === 1);
}
{
    const env = makeEnv({ files: Object.assign({ [`${RELEASE}/__workers/api.worker.js`]: '' }, BACKEND) });
    const r = await env.tool('set_secret').exec({ worker: 'api', name: 'STRIPE_SECRET_KEY', value: LIVE_KEY, live: true }, st);
    check('set_secret live: the key goes only to the live site\'s store', r.success && env.stores.get(LIVE_APP).get('secret:STRIPE_SECRET_KEY') === LIVE_KEY && !env.stores.has(PREVIEW_APP));
    check('set_secret live: it is marked as the live site\'s own', JSON.stringify(env.stores.get(LIVE_APP).get('secret-live-only')) === '["STRIPE_SECRET_KEY"]');
}
{
    const env = makeEnv({ files: BACKEND, publishedUrl: null });
    const r = await env.tool('set_secret').exec({ worker: 'api', name: 'K', value: 'v', live: true }, st);
    check('set_secret live: an unpublished site says to publish first', !r.success && /publish first/.test(r.error));
    const env2 = makeEnv({ files: BACKEND, previewUrl: null });
    const r2 = await env2.tool('set_secret').exec({ worker: 'api', name: 'K', value: 'v', live: false }, st);
    check('set_secret: with no preview it says to open one', !r2.success && /publish_site/.test(r2.error));
    const env3 = makeEnv({ files: BACKEND });
    check('set_secret: an unknown backend says to write its file', await rejects(env3.tool('set_secret').exec({ worker: 'nope', name: 'K', value: 'v', live: false }, st), '__workers/nope.worker.js'));
    const env4 = makeEnv({ files: BACKEND, decline: true });
    const r4 = await env4.tool('set_secret').exec({ worker: 'api', name: 'K', value: 'v', live: false }, st);
    check('set_secret: a declined permission says so', !r4.success && /didn't allow Builder/.test(r4.error));
}

// --- publish ---
{
    const env = makeEnv({
        files: Object.assign({ [`${RELEASE}/__workers/api.worker.js`]: ";router.get('/__builder/canary', () => 'abc123');router.get('/x', () => 1);" }, BACKEND),
    });
    await env.tool('set_secret').exec({ worker: 'api', name: 'STRIPE_SECRET_KEY', value: KEY, live: false }, st);
    await env.ui.stripCanaryFromReleaseBackends(RELEASE);
    check('publish: the release\'s backend loses the preview\'s save canary', env.files.get(`${RELEASE}/__workers/api.worker.js`) === "router.get('/x', () => 1);");
    const reports = await env.ui.publishSiteBackends(PREVIEW, LIVE, RELEASE);
    check('publish: the live site gets the preview\'s keys', env.stores.get(LIVE_APP).get('secret:STRIPE_SECRET_KEY') === KEY);
    const note = env.win.WorkerSecrets.publishNote(reports);
    check('publish: the line in the conversation names the key and the test key', /STRIPE_SECRET_KEY/.test(note) && /Stripe test key/.test(note) && !note.includes(KEY), note);
    // The live site gets a live key of its own, which the next publish keeps.
    await env.tool('set_secret').exec({ worker: 'api', name: 'STRIPE_SECRET_KEY', value: LIVE_KEY, live: true }, st);
    await env.ui.publishSiteBackends(PREVIEW, LIVE, RELEASE);
    check('publish: the live site\'s own key is kept', env.stores.get(LIVE_APP).get('secret:STRIPE_SECRET_KEY') === LIVE_KEY);
    // A new live address, for a site whose app Puter made.
    const plan = await env.ui.planSiteMove(LIVE, RELEASE);
    check('new address: the user is warned the data stays behind', plan && plan.moveApp === false && JSON.stringify(plan.backends) === '["api"]' &&
        env.confirms.length === 1 && /starts with no saved data/.test(env.confirms[0]));
    await env.ui.finishSiteMove(LIVE, NEW_LIVE, plan, 'Shop');
    check('new address: its backend gets the live keys', env.stores.get(NEW_LIVE_APP).get('secret:STRIPE_SECRET_KEY') === LIVE_KEY);
    check('new address: a live key stays the live site\'s own', JSON.stringify(env.stores.get(NEW_LIVE_APP).get('secret-live-only')) === '["STRIPE_SECRET_KEY"]');
    check('new address: the old address\'s keys are cleared', !env.stores.get(LIVE_APP).has('secret:STRIPE_SECRET_KEY'));
    await env.ui.publishSiteBackends(PREVIEW, NEW_LIVE, RELEASE);
    check('new address: the next publish keeps the live key', env.stores.get(NEW_LIVE_APP).get('secret:STRIPE_SECRET_KEY') === LIVE_KEY);
}
{
    const env = makeEnv({ files: BACKEND });
    const reports = await env.ui.publishSiteBackends(PREVIEW, LIVE, '/u/AppData/b/.published/c1/r_2_y');
    check('publish: a release without a backend copies nothing and asks nothing', reports.length === 0 && env.prompts.length === 0 && env.fetched.uid === 0);
    const plan = await env.ui.planSiteMove(LIVE, '/u/AppData/b/.published/c1/r_2_y');
    check('new address: no backend, no question', plan && JSON.stringify(plan.backends) === '[]' && env.confirms.length === 0);
    const declined = makeEnv({ files: { [`${RELEASE}/__workers/api.worker.js`]: '' }, confirm: false });
    check('new address: declining keeps the address', await declined.ui.planSiteMove(LIVE, RELEASE) === null);
}
{
    const env = makeEnv({ files: Object.assign({ [`${RELEASE}/__workers/api.worker.js`]: '' }, BACKEND) });
    await env.ui.publishSiteBackends(PREVIEW, LIVE, RELEASE);
    check('publish: a preview with no keys asks nothing', env.prompts.length === 0 && env.toasts.length === 0);
}

// --- deleting a project clears the site's keys ---
{
    const env = makeEnv({ files: BACKEND });
    await env.tool('set_secret').exec({ worker: 'api', name: 'STRIPE_SECRET_KEY', value: KEY, live: false }, st);
    const r = await env.win.WorkerSecrets.clear({ site: PREVIEW });
    check('clear: the site\'s keys go', r.ok && r.cleared === 1 && !env.stores.get(PREVIEW_APP).has('secret:STRIPE_SECRET_KEY'));
    const none = makeEnv();
    const r2 = await none.win.WorkerSecrets.clear({ site: PREVIEW });
    check('clear: a site whose backend never ran has nothing to clear and asks nothing', r2.ok && r2.cleared === 0 && none.prompts.length === 0);
}

// --- the email sender name ---
{
    // A site whose app Puter made, since something ran there first.
    const env = makeEnv({ files: BACKEND });
    const r = await env.tool('set_email_sender_name').exec({ worker: 'api', name: 'Shop' }, st);
    check('sender: on an app Puter made, the user is sent to the Dev Center with the app ids',
        !r.success && /Dev Center/.test(r.error) && r.error.includes(PREVIEW_APP) && r.error.includes(LIVE_APP), JSON.stringify(r));
}
{
    const env = makeEnv({ files: Object.assign({ [`${RELEASE}/__workers/api.worker.js`]: '' }, BACKEND) });
    await env.registerBoth();
    const r = await env.tool('set_email_sender_name').exec({ worker: 'api', name: 'Makor Family Portal' }, st);
    check('sender: on Builder\'s apps, the preview and the live site are both renamed',
        r.success && r.live === 'updated' && env.appAt(PREVIEW).title === 'Makor Family Portal' && env.appAt(LIVE).title === 'Makor Family Portal', JSON.stringify(r));
    check('sender: the chosen name is recorded', env.builderKv.get('site-app:https://preview-abc.puter.site').senderName === 'Makor Family Portal');
    await env.win.SiteBackends.retitle(PREVIEW, 'Portal');
    check('sender: renaming the project leaves a chosen name alone', env.appAt(PREVIEW).title === 'Makor Family Portal');
    const reset = await env.tool('set_email_sender_name').exec({ worker: 'api', name: '' }, st);
    check('sender: an empty name goes back to the project\'s name', reset.success && env.appAt(PREVIEW).title === 'Portal (preview)' && env.appAt(LIVE).title === 'Shop',
        env.appAt(PREVIEW).title + ' / ' + env.appAt(LIVE).title);
    check('sender: and forgets the chosen name', env.builderKv.get('site-app:https://preview-abc.puter.site').senderName === null);
}
{
    const env = makeEnv({ files: BACKEND });
    env.apps.set('my-registered-app', { uid: 'app-mine', name: 'my-registered-app', title: 'Mine', index_url: 'https://preview-abc.puter.site/', creator: 'user' });
    check('sender: an app the user registered for the address by hand is never changed', await env.win.SiteBackends.appOf(PREVIEW) === null);
}

// --- the app Builder registers for a site ---
{
    const env = makeEnv({ files: Object.assign({ [`${RELEASE}/__workers/api.worker.js`]: '' }, BACKEND) });
    const SB = env.win.SiteBackends;
    check('title: the live app is the project\'s name and the preview\'s says so', SB.defaultTitle('Shop', 'live') === 'Shop' && SB.defaultTitle(' Shop  Mail ', 'preview') === 'Shop Mail (preview)');
    check('title: an unnamed project and a long name still fit', SB.defaultTitle('', 'live') === 'Untitled' &&
        SB.defaultTitle('x'.repeat(150), 'preview').length === 100 && SB.defaultTitle('x'.repeat(150), 'preview').endsWith(' (preview)'));
    const app = await SB.registerApp(PREVIEW, 'Shop', 'preview');
    check('register: the preview runs as Builder\'s app, named after the project', app && env.appAt(PREVIEW).creator === 'builder' && env.appAt(PREVIEW).title === 'Shop (preview)');
    check('register: Builder records it', JSON.stringify(env.builderKv.get('site-app:https://preview-abc.puter.site')) ===
        JSON.stringify({ name: 'preview-abc', kind: 'preview', defaultTitle: 'Shop (preview)', senderName: null }));
    const r = await env.tool('set_secret').exec({ worker: 'api', name: 'STRIPE_SECRET_KEY', value: KEY, live: false }, st);
    check('register: keys go into that app\'s store, and Puter never makes one of its own',
        r.success && env.stores.get(app.uid).get('secret:STRIPE_SECRET_KEY') === KEY && env.fetched.wake.length === 0 && !env.apps.has(PREVIEW_APP));
    check('register: the user is asked about that app', env.prompts.join(',') === app.uid);
    env.apps.set('preview-abc-taken', { uid: 'app-x', name: 'shop', title: 'Someone else', index_url: 'https://elsewhere.puter.site/', creator: 'user' });
    env.apps.set('shop', env.apps.get('preview-abc-taken'));
    const live = await SB.registerApp(LIVE, 'Shop', 'live');
    check('register: a name someone else holds gets a suffix', live && live.name.startsWith('shop-') && env.appAt(LIVE).title === 'Shop');
}
{
    const env = makeEnv({ files: BACKEND, apps: ['https://preview-abc.puter.site'] });
    const app = await env.win.SiteBackends.registerApp(PREVIEW, 'Shop', 'preview');
    check('register: too late once Puter made an app for the address, and nothing is recorded', app === null && env.builderKv.size === 0);
}
{
    const env = makeEnv({ files: BACKEND });
    const SB = env.win.SiteBackends;
    await env.registerBoth();
    await SB.retitle(PREVIEW, 'Bakery');
    await SB.retitle(LIVE, 'Bakery');
    check('rename: the apps follow the project\'s name', env.appAt(PREVIEW).title === 'Bakery (preview)' && env.appAt(LIVE).title === 'Bakery');
    // The live app retitled by hand in the Dev Center.
    env.appAt(LIVE).title = 'Hand Picked';
    await SB.retitle(PREVIEW, 'Cafe');
    await SB.retitle(LIVE, 'Cafe');
    check('rename: a title set by hand in the Dev Center stays', env.appAt(LIVE).title === 'Hand Picked' && env.appAt(PREVIEW).title === 'Cafe (preview)');
    await SB.retitle('https://elsewhere.puter.site/', 'Bakery');
    check('rename: a site Builder has no app for is left alone', true);
    check('delete: Builder knows which apps are its own', await SB.hasApp(PREVIEW) && !(await SB.hasApp('https://elsewhere.puter.site/')));
    await SB.deleteApp(PREVIEW);
    check('delete: the app and its record go', !env.appAt(PREVIEW) && !env.builderKv.has('site-app:https://preview-abc.puter.site') && !(await SB.hasApp(PREVIEW)));
    await SB.deleteApp(PREVIEW);
    check('delete: deleting again is fine', true);
}
{
    // Publish carries a chosen sender name to the live site, and only that.
    const env = makeEnv({ files: Object.assign({ [`${RELEASE}/__workers/api.worker.js`]: '' }, BACKEND) });
    await env.registerBoth();
    await env.ui.publishSiteBackends(PREVIEW, LIVE, RELEASE);
    check('publish: the live app keeps the project\'s name, not the preview\'s', env.appAt(LIVE).title === 'Shop');
    await env.win.WorkerSender.set({ site: PREVIEW, backends: ['api'] }, 'Shop Mail');
    await env.ui.publishSiteBackends(PREVIEW, LIVE, RELEASE);
    check('publish: a chosen sender name goes live', env.appAt(LIVE).title === 'Shop Mail' &&
        env.builderKv.get('site-app:https://shop.puter.site').senderName === 'Shop Mail');
}
{
    // A name only the live site has is never reset by a preview on its default.
    const env = makeEnv({ files: Object.assign({ [`${RELEASE}/__workers/api.worker.js`]: '' }, BACKEND) });
    await env.registerBoth();
    await env.win.WorkerSender.set({ site: LIVE, backends: ['api'] }, 'Live Only');
    await env.ui.publishSiteBackends(PREVIEW, LIVE, RELEASE);
    check('publish: the live site\'s own sender name stays', env.appAt(LIVE).title === 'Live Only');
}
{
    // A new live address takes the app along.
    const env = makeEnv({ files: Object.assign({ [`${RELEASE}/__workers/api.worker.js`]: '' }, BACKEND) });
    await env.registerBoth();
    await env.tool('set_secret').exec({ worker: 'api', name: 'STRIPE_SECRET_KEY', value: LIVE_KEY, live: true }, st);
    const liveUid = env.appAt(LIVE).uid;
    env.stores.get(liveUid).set('orders', ['o1']);
    const plan = await env.ui.planSiteMove(LIVE, RELEASE);
    check('move: with Builder\'s app there is nothing to ask', plan && plan.moveApp === true && env.confirms.length === 0);
    await env.ui.finishSiteMove(LIVE, NEW_LIVE, plan, 'Shop');
    check('move: the new address runs as the same app', env.appAt(NEW_LIVE) && env.appAt(NEW_LIVE).uid === liveUid && !env.appAt(LIVE));
    check('move: so its data and keys are still there', JSON.stringify(env.stores.get(liveUid).get('orders')) === '["o1"]' &&
        JSON.stringify(await env.win.WorkerSecrets.names({ site: NEW_LIVE })) === '["STRIPE_SECRET_KEY"]');
    check('move: the record follows the address', env.builderKv.has('site-app:https://store.puter.site') && !env.builderKv.has('site-app:https://shop.puter.site'));
    check('move: nothing was copied or warned about', env.toasts.length === 0 && !env.apps.has(NEW_LIVE_APP));
}
{
    // Puter refusing the move changes nothing.
    const env = makeEnv({ files: Object.assign({ [`${RELEASE}/__workers/api.worker.js`]: '' }, BACKEND), moveFails: true });
    await env.registerBoth();
    const liveUid = env.appAt(LIVE).uid;
    const plan = await env.ui.planSiteMove(LIVE, RELEASE);
    check('move refused: the address change fails', await rejects(env.ui.finishSiteMove(LIVE, NEW_LIVE, plan), 'the address wasn’t changed'));
    check('move refused: the app stays on the old address with its record', env.appAt(LIVE) && env.appAt(LIVE).uid === liveUid &&
        env.builderKv.has('site-app:https://shop.puter.site') && !env.builderKv.has('site-app:https://store.puter.site'));
    check('move refused: the new address goes again, and nothing else is made', JSON.stringify(env.hostingDeleted) === '["store"]' && !env.appAt(NEW_LIVE));
}
{
    // A move that reached Puter but whose answer got lost still counts.
    const env = makeEnv({ files: BACKEND });
    await env.registerBoth();
    const update = env.puter.apps.update;
    env.puter.apps.update = async (...args) => { await update(...args); throw new Error('connection reset'); };
    check('move: an update whose answer got lost still moved', await env.win.SiteBackends.moveApp(LIVE, NEW_LIVE) &&
        env.builderKv.has('site-app:https://store.puter.site') && !env.builderKv.has('site-app:https://shop.puter.site'));
}
{
    // Builder's records can't be read or written.
    const env = makeEnv({ files: BACKEND });
    await env.registerBoth();
    env.puter.kv.get = async (k, opt) => { if (!opt || !opt.appUuid) throw new Error('kv down'); return null; };
    check('lookup: a record that can\'t be read is an error, not "no app"', await rejects(env.win.SiteBackends.hasApp(LIVE), 'kv down'));
    check('lookup: so an address change stops before anything changes', await rejects(env.ui.planSiteMove(LIVE, RELEASE), 'kv down') && env.confirms.length === 0);
    check('lookup: and a move reports it didn\'t happen', await env.win.SiteBackends.moveApp(LIVE, NEW_LIVE) === false && env.appAt(LIVE));
    const failing = makeEnv({ files: BACKEND, recordWriteFails: true });
    const app = await failing.win.SiteBackends.registerApp(PREVIEW, 'Shop', 'preview');
    check('register: an app whose record can\'t be written is removed again', app === null && !failing.appAt(PREVIEW));
}
{
    // Two renames close together, the first one's record write slow.
    const env = makeEnv({ files: BACKEND });
    await env.registerBoth();
    const set = env.puter.kv.set;
    let slowed = false;
    env.puter.kv.set = async (k, v, opt) => {
        if (!slowed && !(opt && opt.appUuid)) { slowed = true; await new Promise((r) => setTimeout(r, 30)); }
        return set(k, v, opt);
    };
    await Promise.all([env.win.SiteBackends.retitle(PREVIEW, 'Bakery'), env.win.SiteBackends.retitle(PREVIEW, 'Cafe')]);
    check('rename: two at once end on the last name, record included', env.appAt(PREVIEW).title === 'Cafe (preview)' &&
        env.builderKv.get('site-app:https://preview-abc.puter.site').defaultTitle === 'Cafe (preview)');
    await env.win.SiteBackends.retitle(PREVIEW, 'Diner');
    check('rename: and later ones still apply', env.appAt(PREVIEW).title === 'Diner (preview)');
}
{
    // Republishing gives the live site its keys before it switches to the
    // new code, a first publish once the address exists.
    const publish = UI_SRC.slice(UI_SRC.indexOf('async function doPublish('), UI_SRC.indexOf('async function loadPublishedSiteMeta('));
    const republish = publish.slice(publish.indexOf('} else {', publish.indexOf('if (!existingSub) {')));
    check('publish: a republish copies the keys before the address serves the release',
        republish.indexOf('publishSiteBackends(') > 0 && republish.indexOf('publishSiteBackends(') < republish.indexOf('puter.hosting.update(existingSub'));
    check('publish: a first publish copies them after the address exists',
        publish.indexOf('registerApp(url') > 0 && publish.indexOf('publishSiteBackends(', publish.indexOf('registerApp(url')) < publish.indexOf('} else {', publish.indexOf('if (!existingSub) {')));
}

// --- the prompt ---
{
    const prompt = (flag) => {
        const window = { FEATURE_FLAGS: { dynamicWorkers: flag, clickToEdit: true, createdWithBadge: true, webManifest: true } };
        new Function('window', read('../src/js/prompt.js'))(window);
        return window.system_prompt_common();
    };
    const on = prompt(true);
    const off = prompt(false);
    check('prompt: the AI writes backends to __workers', /__workers\/<name>\.worker\.js/.test(on) && /no create_worker tool/.test(on));
    check('prompt: pages call a backend by its relative path', /fetch\('\/__workers\/api\/items'\)/.test(on) && /never with a full address/.test(on));
    check('prompt: create_worker is no longer the way to make one', !/Deploy each worker once with create_worker/.test(on));
    check('prompt: pages never read a key', /never read a secret: key from browser code/.test(on));
    check('prompt: the default sender name is the project\'s name', /sender name is its project's name/.test(on));
    check('prompt: the flag off keeps the create_worker rules', /Deploy each worker once with create_worker/.test(off) && !/__workers/.test(off) && /sandbox-<worker name>/.test(off));
}

// --- a template fork's note ---
{
    const { win } = makeEnv();
    const note = win.TemplateCore.buildTemplateNote({
        name: 'Feedback Board', appDir: ROOT, files: ['index.html', '__workers/api.worker.js'], previewUrl: PREVIEW,
        workers: [{ templateName: 'api', name: 'api', url: '/__workers/api', dynamic: true }],
    });
    check('template: the note points at the backend file and its path', note.includes(`${ROOT}/__workers/api.worker.js`) && note.includes('call at /__workers/api'));
    check('template: and never at create_worker', !/create_worker/.test(note));
}

// --- the mark never reaches the AI ---
{
    const vm = await import('node:vm');
    const coreBox = { window: {} };
    vm.createContext(coreBox);
    vm.runInContext(read('../src/js/model-core.js'), coreBox);
    const HELP_SRC = read('../src/js/helpers.js');
    const prep = new Function('window', slice(HELP_SRC, 'function prepareHistoryForAI(', '/**\n * Sum the AI-reported cost', 'prepareHistoryForAI') +
        '\nreturn prepareHistoryForAI;')({ ModelCore: coreBox.window.ModelCore });
    const history = [{ role: 'system', content: [{ type: 'text', text: 'common' }], dynamicWorkers: true }, { role: 'user', content: 'hi' }];
    const sent = prep(history);
    check('history: the mark is stripped before sending', !JSON.stringify(sent).includes('dynamicWorkers'));
    check('history: and kept on the saved project', history[0].dynamicWorkers === true);
}

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nAll site-backends checks passed');
