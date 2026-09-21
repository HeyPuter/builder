import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: the published app has its own backend ----------------
// A deployed worker is ONE account-level resource behind ONE URL, and the draft
// and published frontends both called it. So the draft/published split
// protected the static files and nothing protected the backend: the moment the
// AI redeployed a worker while building, the published app's behaviour changed
// with it — a draft-only edit broke live clients before Publish was clicked.
//
// Publishing must give the release its own deployment, from a frozen copy of
// the worker's source, and point the release's files at it. Editing the draft's
// worker afterwards must leave the published endpoint exactly as it was.
//
// Drives the real doPublish and the real create_worker tool (VM sandbox, only
// the FS/hosting/worker/UI boundary mocked) with the real WorkerOwnership.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const uiSource = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const helpersSource = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const ownershipSource = fs.readFileSync(new URL('../src/js/worker-ownership.js', import.meta.url), 'utf8');
const createWorkerSource = fs.readFileSync(new URL('../src/tools/workers/create_worker.js', import.meta.url), 'utf8');
const listWorkerSource = fs.readFileSync(new URL('../src/tools/workers/list_workers.js', import.meta.url), 'utf8');
const deleteWorkerSource = fs.readFileSync(new URL('../src/tools/workers/delete_worker.js', import.meta.url), 'utf8');

function extract(src, signature) {
    const a = src.indexOf(signature);
    if (a < 0) throw new Error('could not find ' + signature);
    const b = src.indexOf('\n}\n', a);
    if (b < 0) throw new Error('could not find the end of ' + signature);
    return src.slice(a, b + 2);
}
function slice(src, from, last) {
    const a = src.indexOf(from);
    if (a < 0) throw new Error('could not find ' + from);
    const b = src.indexOf('\n}\n', src.indexOf(last, a));
    if (b < 0) throw new Error('could not find the end of ' + last);
    return src.slice(a, b + 2);
}

const CODE = [
    helpersSource.slice(
        helpersSource.indexOf('const _fileLocks = new Map()'),
        helpersSource.indexOf('// Write `data` to `path` and CONFIRM')),
    appSource.match(/^const WORKER_URL_TEXT_FILE_RE = .*$/m)[0],
    extract(appSource, 'async function rewriteWorkerUrlsInDir(dir, renames, changed = new Set()) {'),
    'window.rewriteWorkerUrlsInDir = rewriteWorkerUrlsInDir;',
    extract(uiSource, 'function publishedRootDir() {'),
    extract(uiSource, 'function publishedDirForChat(chatId) {'),
    extract(uiSource, 'function newReleaseDirName() {'),
    slice(uiSource, 'const PUBLISHED_BACKEND_DIR', 'function publishedBackendDir(chatId) {'),
    extract(uiSource, 'async function retirePublishedReleases(pubRoot, keepName) {'),
    slice(uiSource, 'const LIVE_WORKER_SUFFIX', 'async function retirePublishedWorkers(chatId, keepNames) {'),
    extract(uiSource, 'function previewSubdomain(url) {'),
    extract(uiSource, 'function shortRand() {'),
    extract(uiSource, 'function slugifyTitle(t) {'),
    extract(uiSource, 'function publishBlockedReason() {'),
    extract(uiSource, 'async function createPublishSubdomain(path, desired'),
    extract(helpersSource, 'function generateChatTitle(history) {'),
    extract(uiSource, 'async function doPublish() {'),
].join('\n\n');

const ROOT = '/alice/AppData/builder';
const WORK = ROOT + '/chat1';
const PUB = ROOT + '/.published/chat1';

const V1 = "router.get('/', () => ({ version: 1 }));";
const V2 = "router.get('/', () => ({ version: 2, extra: true }));";

function makeWorld({ failDeploy = false, takenLiveName = null } = {}) {
    const files = new Map([
        [WORK + '/index.html', "fetch('https://api-a.puter.work/items')"],
        [WORK + '/workers/api-a.js', V1],
        // Already published once, in the pre-release container layout.
        [PUB + '/index.html', "fetch('https://api-a.puter.work/items')"],
    ]);
    const deployed = new Map([['api-a', {
        name: 'api-a', url: 'https://api-a.puter.work',
        file_path: WORK + '/workers/api-a.js',
    }]]);
    if (takenLiveName) {
        deployed.set(takenLiveName, {
            name: takenLiveName, url: `https://${takenLiveName}.puter.work`,
            file_path: '/alice/AppData/builder/other-project/workers/x.js',
        });
    }
    const sites = new Map([['ay-site', PUB]]);
    const alerts = [];
    const under = dir => [...files.keys()].filter(p => p.startsWith(dir + '/'));

    const $stub = () => ({ length: 0, val: () => '', trigger() { return this; }, 0: undefined });
    const sandbox = {
        currentChatId: 'chat1',
        currentAppDir: WORK,
        chatHistory: [{ role: 'system', content: '' }, { role: 'user', content: 'Alpha' }],
        isProcessing: false,
        _publishPanelOpen: false,
        _publishPanelView: 'form',
        _publishViewIsFirst: false,
        _publishSuccessData: null,
        renderPublishPanel() {},
        setPublishBusy() {},
        loadPublishedSiteMeta: async () => ({ title: '', description: '', icon: '' }),
        $: $stub,
        setTimeout,
        URL,
        console: { warn() {}, error() {} },
        window: {
            tools: [],
            user: { username: 'alice' },
            currentPreviewPath: WORK,
            currentPublishedUrl: 'https://ay-site.puter.site/',
            currentPublishedPath: PUB,
            currentPublishedVersionId: 'a-v0',
            _projectDirtySinceSnapshot: false,
            getCurrentVersionId: () => 'a-v1',
            savePublishedFields: async () => {},
            showToast: () => {},
            isSubdomainLimitErr: () => false,
            isSubdomainTakenErr: () => false,
            puterErrInfo: e => ({ message: (e && e.message) || '' }),
            projectRootDir: () => WORK,
            assertPathInProject: p => p,
            writeFileVerified: async (p, data) => { files.set(p, data); return { success: true }; },
        },
        puter: {
            appID: 'builder',
            randName: () => 'random-name',
            ui: { alert: async m => alerts.push(String(m)) },
            fs: {
                mkdir: async () => {},
                stat: async p => {
                    if (files.has(p) || under(p).length) return { path: p };
                    const e = new Error('not found'); e.code = 'subject_does_not_exist'; throw e;
                },
                read: async p => {
                    if (!files.has(p)) { const e = new Error('not found'); e.code = 'subject_does_not_exist'; throw e; }
                    return { text: async () => files.get(p) };
                },
                write: async (p, data) => { files.set(p, data); },
                readdir: async dir => {
                    const names = new Set();
                    for (const p of under(dir)) names.add(p.slice(dir.length + 1).split('/')[0]);
                    if (!names.size) { const e = new Error('not found'); e.code = 'subject_does_not_exist'; throw e; }
                    return [...names].map(name => ({ name, is_dir: !files.has(dir + '/' + name) }));
                },
                delete: async p => { files.delete(p); for (const q of under(p)) files.delete(q); },
                copy: async (from, to, options) => {
                    const dest = to + '/' + options.newName;
                    if (files.has(from)) { files.set(dest, files.get(from)); return; }
                    const src = under(from);
                    if (!src.length) { const e = new Error('not found'); e.code = 'subject_does_not_exist'; throw e; }
                    for (const p of src) files.set(dest + p.slice(from.length), files.get(p));
                },
            },
            hosting: {
                create: async (sub, path) => { sites.set(sub, path); return { subdomain: sub }; },
                update: async (sub, path) => { sites.set(sub, path); },
            },
            workers: {
                list: async () => [...deployed.values()],
                create: async (name, filePath) => {
                    if (failDeploy && name.endsWith('-live')) throw new Error('deploy failed');
                    const url = `https://${name}.puter.work`;
                    // A deployment snapshots the source file's bytes.
                    deployed.set(name, { name, url, file_path: filePath, code: files.get(filePath) });
                    return { success: true, url };
                },
                delete: async name => { deployed.delete(name); },
            },
        },
    };
    sandbox.saveCurrentChat = async () => {};
    vm.createContext(sandbox);
    vm.runInContext(ownershipSource, sandbox, { filename: 'src/js/worker-ownership.js' });
    vm.runInContext(CODE, sandbox, { filename: 'src/js/ui.js' });
    for (const [name, src] of [['create_worker', createWorkerSource], ['list_workers', listWorkerSource], ['delete_worker', deleteWorkerSource]]) {
        vm.runInContext(src, sandbox, { filename: 'src/tools/workers/' + name + '.js' });
    }
    const tool = name => sandbox.window.tools.find(t => t.function.name === name);
    return { sandbox, files, deployed, sites, alerts, tool, served: () => files.get(sites.get('ay-site') + '/index.html') };
}

// ---- The reported scenario --------------------------------------------------
{
    const w = makeWorld();
    await w.sandbox.doPublish();

    const releaseFrontend = w.served();
    check('publish: the release calls a backend of its own, not the draft’s',
        /api-a-live\.puter\.work/.test(releaseFrontend) && !/\/\/api-a\.puter\.work/.test(releaseFrontend),
        releaseFrontend);
    check('publish: the published worker is deployed from a frozen copy',
        w.deployed.has('api-a-live') && w.deployed.get('api-a-live').code === V1,
        JSON.stringify([...w.deployed.keys()]));
    check('publish: its source lives outside the app directory',
        w.deployed.get('api-a-live').file_path.indexOf(PUB + '/') === 0,
        w.deployed.get('api-a-live').file_path);
    check('publish: no error', w.alerts.length === 0, JSON.stringify(w.alerts));

    // Now the draft edit the report is about: the AI updates the worker.
    await w.tool('create_worker').exec({ name: 'api-a', code: V2 }, {});
    check('draft edit: the DRAFT worker is updated', w.deployed.get('api-a').code === V2);
    check('draft edit: the published backend still runs the published code',
        w.deployed.get('api-a-live').code === V1, w.deployed.get('api-a-live').code);
    check('draft edit: the published frontend still points at it',
        /api-a-live\.puter\.work/.test(w.served()), w.served());

    // And publishing again is what moves it.
    await w.sandbox.doPublish();
    check('republish: the published backend picks up the new code',
        w.deployed.get('api-a-live').code === V2, w.deployed.get('api-a-live').code);
    check('republish: the published backend keeps its URL, so live clients keep working',
        w.deployed.get('api-a-live').url === 'https://api-a-live.puter.work');
}

// ---- The AI cannot reach the live backend ----------------------------------
{
    const w = makeWorld();
    await w.sandbox.doPublish();

    const listed = await w.tool('list_workers').exec({}, {});
    check('tools: the live backend is not listed to the model',
        listed.workers.map(x => x.name).join() === 'api-a', JSON.stringify(listed.workers));

    let refusedDelete = false;
    try { await w.tool('delete_worker').exec({ name: 'api-a-live' }, {}); }
    catch (e) { refusedDelete = /does not belong to this project/.test(e.message); }
    check('tools: the model cannot delete the live backend', refusedDelete);
    check('tools: …and it is still deployed', w.deployed.has('api-a-live'));

    let refusedCreate = false;
    try { await w.tool('create_worker').exec({ name: 'api-a-live', code: 'x' }, {}); }
    catch (e) { refusedCreate = /belongs to a different project/.test(e.message); }
    check('tools: the model cannot redeploy over the live backend', refusedCreate);
    check('tools: …and its code is untouched', w.deployed.get('api-a-live').code === V1);
}

// ---- A backend that cannot be published fails the publish -------------------
{
    const w = makeWorld({ failDeploy: true });
    await w.sandbox.doPublish();
    check('deploy failure: the previous release is still what the address serves',
        w.served() === "fetch('https://api-a.puter.work/items')", w.served());
    check('deploy failure: the user is told', w.alerts.length === 1
        && /deploy|publish/i.test(w.alerts[0]), JSON.stringify(w.alerts));
}

// ---- A name held by another project is refused, not hijacked ----------------
{
    const w = makeWorld({ takenLiveName: 'api-a-live' });
    await w.sandbox.doPublish();
    check('name clash: another project’s worker is not overwritten',
        w.deployed.get('api-a-live').file_path === '/alice/AppData/builder/other-project/workers/x.js');
    check('name clash: the publish fails with a rename suggestion',
        w.alerts.length === 1 && /rename/i.test(w.alerts[0]), JSON.stringify(w.alerts));
}

// ---- Projects without workers are entirely unaffected ----------------------
{
    const w = makeWorld();
    w.files.delete(WORK + '/workers/api-a.js');
    w.deployed.delete('api-a');
    w.files.set(WORK + '/index.html', 'plain static app');
    await w.sandbox.doPublish();
    check('no workers: the release is published unchanged',
        w.served() === 'plain static app' && w.deployed.size === 0, w.served());
    check('no workers: no error', w.alerts.length === 0, JSON.stringify(w.alerts));
}

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all published-workers checks passed');
