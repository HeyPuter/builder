import fs from 'node:fs';
import vm from 'node:vm';

// ---- Templates, end to end (src/js/templates.js) ------------------------------
// Drives the real share → fork → deploy-backend flow against an in-memory Puter
// (filesystem, hosting, workers) whose hosted sites are what fetch() serves, so
// the fork reads exactly the bytes the share published. Real helpers are
// sliced out of app.js / ui.js / helpers.js; only the Puter boundary is mocked.
//
// What must hold:
//   * a share publishes a snapshot, never the working dir, without dot files,
//     without uploads unless asked, and without preview cache-bust tokens;
//   * a fork writes only inside its own new project, deploys NO worker, and
//     leaves no reference to the author's backend in the copied files;
//   * the fork's backend deploys only through deployForkBackend, under fresh
//     names, with every placeholder pointed at the new deployment;
//   * a failed fork leaves nothing behind;
//   * automatic fixes and MCP tools stay off in a fresh fork.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const read = (p) => fs.readFileSync(new URL('../src/' + p, import.meta.url), 'utf8');
const APP = read('js/app.js'), UI = read('js/ui.js'), HELPERS = read('js/helpers.js');

function extract(src, signature, end = '\n}\n') {
    const a = src.indexOf(signature);
    if (a < 0) throw new Error('could not find ' + signature);
    const b = src.indexOf(end, a);
    if (b < 0) throw new Error('could not find the end of ' + signature);
    return src.slice(a, b + end.length);
}
const line = (src, re) => src.match(re)[0];

const CODE = [
    extract(APP, 'function isNotFoundError(error) {'),
    extract(APP, 'function chatFilePath(chatId) {'),
    extract(APP, 'function withChatFileLock(chatId, fn) {'),
    line(APP, /^const WORKER_URL_TEXT_FILE_RE = .*$/m),
    extract(APP, 'async function rewriteWorkerUrlsInDir(dir, renames, changed = new Set()) {'),
    'window.rewriteWorkerUrlsInDir = rewriteWorkerUrlsInDir;',
    extract(APP, 'async function deployWorkerPlans(plans, newAppDir) {'),
    line(UI, /^const RELEASE_DIR_RE = .*$/m),
    extract(UI, 'function newReleaseDirName() {'),
    line(UI, /^const PUBLISHED_BACKEND_DIR = .*$/m),
    extract(UI, 'async function retirePublishedReleases(pubRoot, keepName) {'),
    extract(UI, 'function shortRand() {'),
    extract(UI, 'function slugifyTitle(t) {'),
    extract(UI, 'function formatPublishedAgo(iso) {'),
    extract(HELPERS, 'function countUserMessages(history) {'),
    extract(HELPERS, 'function htmlEscape(text) {'),
    extract(HELPERS, 'window.stripPreviewCacheBust = function (text) {', '\n};\n'),
    read('js/worker-ownership.js'),
    read('js/template-core.js'),
    read('js/templates.js'),
].join('\n\n');

// ---- The mock Puter ----------------------------------------------------------
function notFound(path) {
    const e = new Error('not found: ' + path);
    e.code = 'subject_does_not_exist';
    return e;
}

function makePuter(username) {
    const files = new Map(); // abs path -> string
    const dirs = new Set(['/', '/' + username]);
    const sites = new Map(); // subdomain -> dir
    const workers = new Map(); // name -> {name, url, file_path}
    const log = { creates: [], hostingCreates: [], writes: [] };
    const parentOf = p => p.slice(0, p.lastIndexOf('/')) || '/';
    const resolve = p => (p.startsWith('/') ? p : '/' + username + '/' + p);
    const addDirs = (p) => { let d = parentOf(p); while (d && !dirs.has(d)) { dirs.add(d); d = parentOf(d); } };
    const exists = p => files.has(p) || dirs.has(p);
    const children = (dir) => {
        const out = new Map();
        for (const p of [...files.keys(), ...dirs]) {
            if (p === dir || !p.startsWith(dir + '/')) continue;
            const name = p.slice(dir.length + 1).split('/')[0];
            const full = dir + '/' + name;
            out.set(name, { name, is_dir: dirs.has(full), size: files.has(full) ? Buffer.byteLength(files.get(full)) : 0 });
        }
        return [...out.values()];
    };
    const puter = {
        appID: 'builder',
        randName: () => 'random-name-' + Math.random().toString(36).slice(2, 6),
        fs: {
            read: async (p) => {
                p = resolve(p);
                if (!files.has(p)) throw notFound(p);
                const v = files.get(p);
                return { text: async () => v };
            },
            write: async (p, data) => {
                p = resolve(p);
                const text = typeof data === 'string' ? data : await data.text();
                addDirs(p);
                files.set(p, text);
                log.writes.push(p);
            },
            readdir: async (p) => {
                p = resolve(p);
                if (!dirs.has(p)) throw notFound(p);
                return children(p);
            },
            mkdir: async (p) => { p = resolve(p); addDirs(p + '/x'); },
            stat: async (p) => {
                p = resolve(p);
                if (!exists(p)) throw notFound(p);
                return { size: files.has(p) ? Buffer.byteLength(files.get(p)) : 0, is_dir: dirs.has(p) };
            },
            delete: async (p) => {
                p = resolve(p);
                if (!exists(p)) throw notFound(p);
                for (const f of [...files.keys()]) if (f === p || f.startsWith(p + '/')) files.delete(f);
                for (const d of [...dirs]) if (d === p || d.startsWith(p + '/')) dirs.delete(d);
            },
            copy: async (src, destParent, { newName }) => {
                src = resolve(src); destParent = resolve(destParent);
                if (!exists(src)) throw notFound(src);
                const dest = destParent + '/' + newName;
                dirs.add(dest);
                for (const d of [...dirs]) if (d.startsWith(src + '/')) dirs.add(dest + d.slice(src.length));
                for (const [f, v] of [...files]) if (f.startsWith(src + '/')) { addDirs(dest + f.slice(src.length)); files.set(dest + f.slice(src.length), v); }
            },
            rename: async (p, newName) => {
                p = resolve(p);
                if (!files.has(p)) throw notFound(p);
                const to = parentOf(p) + '/' + newName;
                files.set(to, files.get(p));
                files.delete(p);
            },
        },
        hosting: {
            create: async (sub, dir) => {
                if (sites.has(sub)) { const e = new Error('subdomain already taken'); throw e; }
                sites.set(sub, resolve(dir));
                log.hostingCreates.push(sub);
                return { subdomain: sub };
            },
            update: async (sub, dir) => {
                if (!sites.has(sub)) throw notFound(sub);
                sites.set(sub, resolve(dir));
            },
            delete: async (sub) => {
                if (!sites.has(sub)) throw notFound(sub);
                sites.delete(sub);
            },
        },
        workers: {
            list: async () => [...workers.values()].map(w => ({ ...w })),
            create: async (name, filePath) => {
                if (!files.has(filePath)) throw new Error('no source at ' + filePath);
                log.creates.push({ name, filePath, code: files.get(filePath) });
                const url = `https://${name}.puter.work`;
                workers.set(name, { name, url, file_path: filePath });
                return { success: true, url };
            },
            delete: async (name) => { workers.delete(name); },
        },
    };
    return { puter, files, dirs, sites, workers, log };
}

// One shared "internet": every account's hosted sites, served by fetch().
const accounts = [];
let tamper = null; // (path, text) -> text, to simulate a template changing mid-fork
async function fakeFetch(url) {
    const u = new URL(url);
    const m = u.host.match(/^([a-z0-9-]+)\.puter\.site$/);
    const notFoundResp = () => new Response('not found', { status: 404 });
    if (!m) return notFoundResp();
    for (const acct of accounts) {
        const dir = acct.sites.get(m[1]);
        if (!dir) continue;
        const rel = u.pathname.split('/').filter(Boolean).map(decodeURIComponent).join('/');
        const path = dir + '/' + (rel || 'index.html');
        if (!acct.files.has(path)) return notFoundResp();
        let body = acct.files.get(path);
        if (tamper) body = tamper(rel, body);
        return new Response(body, { status: 200 });
    }
    return notFoundResp();
}

function makeApp(username) {
    const acct = makePuter(username);
    accounts.push(acct);
    const chain = new Proxy(function () {}, {
        get: (t, k) => (k === 'length' ? 0 : chain),
        apply: () => chain,
    });
    const ctx = {
        console: { log() {}, warn() {}, error() {} },
        URL, URLSearchParams, TextEncoder, Blob, Response,
        setTimeout, clearTimeout,
        fetch: fakeFetch,
        $: () => chain,
        document: { createTextNode: () => ({}) },
        history: { replaceState() {}, state: null },
        requestAnimationFrame: (fn) => fn(),
        puter: acct.puter,
        savedChats: [],
        currentChatId: null,
        chatHistory: [],
        isProcessing: false,
        saveChatList: async () => { ctx._listSaves = (ctx._listSaves || 0) + 1; },
        updateChatHistorySidebar() {},
        generateChatId: () => 'chat_fork_' + (++ctx._ids),
        _ids: 0,
        publishBlockedReason: () => null,
        window: {
            FEATURE_FLAGS: { templates: true },
            user: { username },
            location: { origin: 'https://builder.puter.com', search: '', href: 'https://builder.puter.com/' },
            addEventListener() {},
            drainFileLocks: async () => {},
            withFileLock: (p, fn) => Promise.resolve().then(fn),
            makeDraftSubdomain: () => 'preview-' + Math.random().toString(36).slice(2, 10),
            system_prompt_common: () => 'COMMON',
            system_prompt_dynamic: (dir) => 'Working directory: ' + dir,
            isSubdomainLimitErr: () => false,
            puterErrInfo: (e) => ({ code: '', message: String(e && e.message) }),
            showToast() {},
        },
    };
    vm.createContext(ctx);
    vm.runInContext(CODE, ctx);
    return { ctx, acct, T: ctx.window.Templates, Core: ctx.window.TemplateCore };
}

// ---- Author: a project with a backend, uploads, a dot file and bust tokens ----
const alice = makeApp('alice');
const ALICE_DIR = '/alice/AppData/builder/chat_a';
const aliceFiles = {
    'index.html': '<script src="app.js?__pcb=123"></script><script>fetch("https://notes-api.puter.work/save")</script>',
    'app.js': 'fetch("https://notes-api.puter.work/list"); // not notes-api.puter.works',
    'workers/notes-api.js': 'router.get("/list", async () => me.puter.kv.get("x"));',
    'assets/private.pdf': 'PRIVATE',
    '.env': 'SECRET=1',
};
for (const [p, v] of Object.entries(aliceFiles)) await alice.acct.puter.fs.write(ALICE_DIR + '/' + p, v);
alice.acct.workers.set('notes-api', { name: 'notes-api', url: 'https://notes-api.puter.work', file_path: ALICE_DIR + '/workers/notes-api.js' });
alice.ctx.savedChats.push({ id: 'chat_a', title: 'Notes' });
await alice.acct.puter.fs.write('chat-history/chat_a.json', JSON.stringify({ id: 'chat_a', previewPath: ALICE_DIR }));

// === Inspect ====================================================================
{
    const info = await alice.T.inspectProject('chat_a');
    check('inspect: lists the project files, not dot files', info.files.map(f => f.path).sort().join(',') === 'app.js,assets/private.pdf,index.html,workers/notes-api.js', JSON.stringify(info.files));
    check('inspect: reports the hidden file', info.hidden.join(',') === '.env');
    check('inspect: finds the owned worker', info.workers.length === 1 && info.workers[0].file === 'workers/notes-api.js');
}

// === Share ======================================================================
let state;
{
    state = await alice.T.shareTemplate('chat_a', { name: 'Notes', description: 'Take notes.', includeAssets: false });
    const siteDir = alice.acct.sites.get(state.subdomain);
    check('share: hosted on its own template address', state.subdomain === 'notes-template' && !!siteDir, state.subdomain);
    check('share: serves a release snapshot, not the working dir', siteDir.startsWith('/alice/AppData/builder/.templates/chat_a/r_'), siteDir);
    const manifest = JSON.parse(alice.acct.files.get(siteDir + '/template.json'));
    const paths = manifest.files.map(f => f.path).sort().join(',');
    check('share: uploads are left out unless asked', paths === 'app.js,index.html,workers/notes-api.js', paths);
    check('share: dot files never ship', !alice.acct.files.has(siteDir + '/files/.env'));
    check('share: the excluded upload is not on the site', !alice.acct.files.has(siteDir + '/files/assets/private.pdf'));
    check('share: preview cache-bust tokens stripped', !alice.acct.files.get(siteDir + '/files/index.html').includes('__pcb'));
    check('share: listed sizes match the served bytes', manifest.files.every(f => Buffer.byteLength(alice.acct.files.get(siteDir + '/files/' + f.path)) === f.size));
    check('share: the working dir is untouched', alice.acct.files.get(ALICE_DIR + '/index.html').includes('__pcb=123'));
    check('share: worker listed with its source', manifest.workers.length === 1 && manifest.workers[0].name === 'notes-api');
    check('share: author recorded', manifest.author === 'alice');
    check('share: front page redirects to the builder card', /url=https:\/\/builder\.puter\.com\/\?template=notes-template/.test(alice.acct.files.get(siteDir + '/index.html')));
    const saved = await alice.T.readTemplateState('chat_a');
    check('share: state recorded for stop-sharing / delete', saved && saved.subdomain === state.subdomain);
}

// === Update keeps the address and retires the old release ========================
{
    await alice.acct.puter.fs.write(ALICE_DIR + '/app.js', 'fetch("https://notes-api.puter.work/list"); // not notes-api.puter.works v2');
    const firstDir = alice.acct.sites.get(state.subdomain);
    const again = await alice.T.shareTemplate('chat_a', { name: 'Notes', description: 'Take notes.', includeAssets: false });
    const secondDir = alice.acct.sites.get(again.subdomain);
    check('update: same address', again.subdomain === state.subdomain);
    check('update: new release served', secondDir !== firstDir && alice.acct.files.get(secondDir + '/files/app.js').includes('v2'));
    check('update: old release removed', ![...alice.acct.dirs].some(d => d === firstDir));
    check('update: created date kept', again.createdAt === state.createdAt);
    state = again;
}

// === Fork ========================================================================
const bob = makeApp('bob');
bob.acct.workers.set('unrelated', { name: 'unrelated', url: 'https://unrelated.puter.work', file_path: '/bob/elsewhere.js' });
let forkId;
{
    const manifest = await bob.T.fetchTemplate(state.subdomain);
    check('fetch: the manifest validates in another account', manifest.name === 'Notes' && manifest.files.length === 3);
    const progress = [];
    forkId = await bob.T.forkTemplate(state.subdomain, manifest, { onProgress: p => progress.push(p.step) });
    const dir = '/bob/AppData/builder/' + forkId;
    const written = [...bob.acct.files.keys()].filter(p => p.startsWith('/bob/AppData/'));
    check('fork: every file lands inside the new project', written.length > 0 && written.every(p => p.startsWith(dir + '/')), JSON.stringify(written));
    check('fork: all listed files copied', ['index.html', 'app.js', 'workers/notes-api.js'].every(p => bob.acct.files.has(dir + '/' + p)));
    check('fork: NO worker deployed', bob.acct.log.creates.length === 0);
    const all = [...bob.acct.files].filter(([p]) => p.startsWith(dir + '/')).map(([, v]) => v).join('\n');
    check('fork: no reference to the author\'s backend remains', !/notes-api\.puter\.work(?!s)/.test(all), all);
    check('fork: references point at the unreachable placeholder', bob.acct.files.get(dir + '/app.js').includes('notes-api.backend-not-deployed.invalid'));
    check('fork: look-alike hosts untouched', bob.acct.files.get(dir + '/app.js').includes('notes-api.puter.works'));
    check('fork: a preview was created in the forker\'s account', bob.acct.log.hostingCreates.length === 1);
    const chat = JSON.parse(bob.acct.files.get('/bob/chat-history/' + forkId + '.json'));
    const sys = chat.history[0];
    check('fork: only a system prompt — none of the author\'s conversation', chat.history.length === 1 && sys.role === 'system');
    check('fork: system prompt targets the NEW project dir', sys.content[1].text.includes(dir));
    check('fork: context block marks the files untrusted', sys.content.length === 3 && /untrusted/i.test(sys.content[2].text));
    check('fork: origin recorded with the pending backend', chat.forkedFrom.subdomain === state.subdomain &&
        chat.forkedFrom.pendingWorkers.length === 1 && chat.forkedFrom.allowMcp === false);
    check('fork: origin does not carry the unverified author', !('author' in chat.forkedFrom));
    check('fork: listed in the sidebar with its origin', bob.ctx.savedChats[0].id === forkId && !!bob.ctx.savedChats[0].forkedFrom);
    check('fork: progress reported', progress.includes('files') && progress.includes('backend') && progress.includes('preview'));
}

// === Fresh-fork turn policy =======================================================
{
    bob.ctx.currentChatId = forkId;
    bob.ctx.chatHistory = [{ role: 'system', content: 'x' }];
    check('policy: auto-fix blocked before the user speaks', bob.ctx.window.autoFixBlockedForOpenProject() === true);
    check('policy: MCP blocked in a fork', bob.ctx.window.mcpBlockedForOpenProject() === true);
    bob.ctx.chatHistory.push({ role: 'user', content: 'make it blue' });
    check('policy: auto-fix allowed once the user has sent a message', bob.ctx.window.autoFixBlockedForOpenProject() === false);
    await bob.T.updateForkedFrom(forkId, { allowMcp: true });
    check('policy: MCP allowed after the user turns it on', bob.ctx.window.mcpBlockedForOpenProject() === false);
    const persisted = JSON.parse(bob.acct.files.get('/bob/chat-history/' + forkId + '.json'));
    check('policy: the MCP choice is persisted', persisted.forkedFrom.allowMcp === true);
    bob.ctx.currentChatId = 'chat_other';
    bob.ctx.savedChats.push({ id: 'chat_other' });
    check('policy: ordinary projects are unaffected', bob.ctx.window.autoFixBlockedForOpenProject() === false && bob.ctx.window.mcpBlockedForOpenProject() === false);
}

// === Deploying the fork's backend =================================================
{
    const dir = '/bob/AppData/builder/' + forkId;
    const result = await bob.T.deployForkBackend(forkId);
    check('deploy: one worker deployed', result.deployed.length === 1 && result.failed.length === 0, JSON.stringify(result));
    const created = bob.acct.log.creates[0];
    check('deploy: under a fresh name, never the author\'s', created && created.name !== 'notes-api' && created.name.startsWith('notes-api-'), created && created.name);
    check('deploy: from the copy\'s own source file', created && created.filePath.startsWith(dir + '/workers/'));
    const app = bob.acct.files.get(dir + '/app.js');
    check('deploy: placeholders rewritten to the new worker', app.includes(created.name + '.puter.work') && !app.includes('.invalid'), app);
    const entry = bob.ctx.savedChats.find(c => c.id === forkId);
    check('deploy: nothing left pending', entry.forkedFrom.pendingWorkers.length === 0);
    const again = await bob.T.deployForkBackend(forkId);
    check('deploy: a second call is a no-op', again.deployed.length === 0 && bob.acct.log.creates.length === 1);
    const owned = bob.ctx.window.WorkerOwnership.ownedWorkers(await bob.acct.puter.workers.list(), dir);
    check('deploy: the worker is owned by the fork (deleteChat will remove it)', owned.length === 1);
}

// === A template that changes mid-fork leaves nothing behind =========================
{
    const manifest = await bob.T.fetchTemplate(state.subdomain);
    const before = new Set(bob.acct.files.keys());
    const sitesBefore = bob.acct.sites.size;
    tamper = (rel, body) => (rel === 'files/app.js' ? body + ' // changed' : body);
    let err = null;
    try { await bob.T.forkTemplate(state.subdomain, manifest); } catch (e) { err = e; }
    tamper = null;
    check('mid-fork change: the fork fails', !!err && /changed/.test(err.message), err && err.message);
    const leftovers = [...bob.acct.files.keys()].filter(p => !before.has(p));
    check('mid-fork change: no files left behind', leftovers.length === 0, JSON.stringify(leftovers));
    check('mid-fork change: no preview site left behind', bob.acct.sites.size === sitesBefore);
    check('mid-fork change: not listed', bob.ctx.savedChats.filter(c => c.forkedFrom).length === 1);
}

// === Fetch refuses what isn't a template =========================================
{
    const expectCode = async (sub, code) => {
        let err = null;
        try { await bob.T.fetchTemplate(sub); } catch (e) { err = e; }
        check(`fetch: ${JSON.stringify(sub)} refused (${code})`, !!err && err.code === code, err && (err.code + ' ' + err.message));
    };
    await expectCode('no-such-template', 'not-found');
    await expectCode('evil.com', 'invalid');
    // A site that serves a tampered manifest.
    const siteDir = alice.acct.sites.get(state.subdomain);
    const good = alice.acct.files.get(siteDir + '/template.json');
    const bad = JSON.parse(good);
    bad.files.push({ path: '../../../escape.js', size: 1 });
    alice.acct.files.set(siteDir + '/template.json', JSON.stringify(bad));
    await expectCode(state.subdomain, 'invalid');
    alice.acct.files.set(siteDir + '/template.json', good);
}

// === Stop sharing =================================================================
{
    await alice.T.deleteChatTemplate('chat_a');
    check('stop: the site is gone', !alice.acct.sites.has(state.subdomain));
    check('stop: the snapshot is gone', ![...alice.acct.dirs].some(d => d.startsWith('/alice/AppData/builder/.templates/chat_a')));
    check('stop: the state is gone', (await alice.T.readTemplateState('chat_a')) === null);
    let err = null;
    try { await alice.T.deleteChatTemplate('chat_a'); } catch (e) { err = e; }
    check('stop: running it again is a no-op', err === null, err && err.message);
    check('stop: the fork is unaffected', bob.acct.files.has('/bob/AppData/builder/' + forkId + '/index.html'));
}

// === Wiring =======================================================================
{
    const VITE = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
    check('wiring: template-core.js loads before templates.js', VITE.indexOf("'js/template-core.js'") > 0 && VITE.indexOf("'js/template-core.js'") < VITE.indexOf("'js/templates.js'"));
    check('wiring: deleteChat removes a shared template', extract(APP, 'async function deleteChat(chatId) {').includes("cleanup('the shared template', () => window.deleteChatTemplate(chatId))"));
    check('wiring: saveCurrentChat carries forkedFrom forward', (extract(APP, 'async function saveCurrentChatUnlocked(context) {').match(/forkedFrom:/g) || []).length === 2);
    check('wiring: auto-fix scheduler consults the fork policy', extract(UI, 'function scheduleAutoFix(delayMs, fire) {').includes('autoFixBlockedForOpenProject'));
    check('wiring: turn tools consult the MCP policy', read('js/tools.js').includes('mcpBlockedForOpenProject'));
}

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nAll template checks passed');
