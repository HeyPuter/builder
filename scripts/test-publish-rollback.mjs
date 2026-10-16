import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: a failed republish never takes the live site down -----
// doPublish used to delete the published directory and only THEN copy the new
// files into it. The public subdomain stays registered against that path, so a
// copy that failed after the delete (a network blip, a quota error) left the
// address serving nothing: a republish that reported failure had destroyed the
// last good deployment. The same held for a hosting update that failed after a
// successful copy.
//
// The replacement must be copied and verified into a NEW release directory and
// hosting switched to it only once that copy is complete; the previous release
// is retired afterwards. Drives the real doPublish (VM sandbox, only the
// FS/hosting/UI boundary mocked).

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const source = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const helpersSource = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');

function extract(src, signature) {
    const a = src.indexOf(signature);
    if (a < 0) throw new Error('could not find ' + signature);
    const b = src.indexOf('\n}\n', a);
    if (b < 0) throw new Error('could not find the end of ' + signature);
    return src.slice(a, b + 2);
}

// A contiguous run of the file, from `from` to the end of the function `last`.
function slice(src, from, last) {
    const a = src.indexOf(from);
    if (a < 0) throw new Error('could not find ' + from);
    const b = src.indexOf('\n}\n', src.indexOf(last, a));
    if (b < 0) throw new Error('could not find the end of ' + last);
    return src.slice(a, b + 2);
}
const CODE = [
    extract(source, 'function publishedRootDir() {'),
    extract(source, 'function publishedDirForChat(chatId) {'),
    extract(source, 'function newReleaseDirName() {'),
    slice(source, 'const PUBLISHED_BACKEND_DIR', 'function publishedBackendDir(chatId) {'),
    extract(source, 'async function retirePublishedReleases(pubRoot, keepName) {'),
    slice(source, 'const LIVE_WORKER_SUFFIX', 'async function retirePublishedWorkers(chatId, keepNames) {'),
    extract(source, 'function previewSubdomain(url) {'),
    extract(source, 'function shortRand() {'),
    extract(source, 'function slugifyTitle(t) {'),
    extract(source, 'function publishBlockedReason() {'),
    extract(source, 'async function createPublishSubdomain(path, desired'),
    extract(helpersSource, 'function generateChatTitle(history) {'),
    extract(source, 'async function doPublish() {'),
].join('\n\n');

const ROOT = '/alice/AppData/builder';
const A_WORK = ROOT + '/project-a';
const A_PUB = ROOT + '/.published/project-a';

// A tiny hierarchical filesystem: a Map of file path -> contents, with
// directories implied by the keys. Enough for copy/readdir/delete/stat.
function makeFs(initial) {
    const files = new Map(initial);
    const under = dir => [...files.keys()].filter(p => p.startsWith(dir + '/'));
    return {
        files,
        exists: dir => files.has(dir) || under(dir).length > 0,
        // What the public address actually serves, as a sorted name=content list.
        serves(dir) {
            const out = under(dir).map(p => p.slice(dir.length + 1) + '=' + files.get(p));
            return out.sort().join(',');
        },
        api: {
            mkdir: async () => {},
            stat: async path => {
                if (files.has(path) || under(path).length > 0) return { path };
                const e = new Error('not found'); e.code = 'subject_does_not_exist'; throw e;
            },
            readdir: async dir => {
                const names = new Set();
                for (const p of under(dir)) names.add(p.slice(dir.length + 1).split('/')[0]);
                if (!names.size && !files.has(dir)) {
                    const e = new Error('not found'); e.code = 'subject_does_not_exist'; throw e;
                }
                return [...names].map(name => ({ name, is_dir: !files.has(dir + '/' + name) }));
            },
            delete: async path => { files.delete(path); for (const p of under(path)) files.delete(p); },
            copy: async (from, to, options) => {
                const dest = to + '/' + options.newName;
                if (files.has(from)) { files.set(dest, files.get(from)); return; }
                const src = under(from);
                if (!src.length) { const e = new Error('not found'); e.code = 'subject_does_not_exist'; throw e; }
                for (const p of src) files.set(dest + p.slice(from.length), files.get(p));
            },
        },
    };
}

// failAt: null | 'copy' | 'hosting'
async function run({ failAt = null } = {}) {
    const disk = makeFs([
        [A_WORK + '/index.html', 'NEW WORK'],
        [A_WORK + '/app.js', 'NEW SCRIPT'],
        [A_PUB + '/index.html', 'OLD PUBLISHED'],
        [A_PUB + '/app.js', 'OLD SCRIPT'],
    ]);
    const sites = new Map([['ay-site', A_PUB]]);
    const hostingCalls = [], alerts = [], toasts = [], saved = [];

    const $stub = () => ({ length: 0, val: () => '', trigger() { return this; }, 0: undefined });

    const sandbox = {
        currentChatId: 'project-a',
        currentAppDir: A_WORK,
        chatHistory: [{ role: 'system', content: '' }, { role: 'user', content: 'Alpha Notes App' }],
        isProcessing: false,
        _publishPanelOpen: false,
        _publishPanelView: 'form',
        _publishViewIsFirst: false,
        _publishSuccessData: null,
        renderPublishPanel() {},
        setPublishBusy() {},
        loadPublishedSiteMeta: async () => ({ title: '', description: '', icon: '' }),
        $: $stub,
        console: { warn() {}, error() {} },
        window: {
            user: { username: 'alice' },
            currentPreviewPath: A_WORK,
            currentPublishedUrl: 'https://ay-site.puter.site/',
            currentPublishedPath: A_PUB,
            currentPublishedVersionId: 'a-v0',
            _projectDirtySinceSnapshot: false,
            getCurrentVersionId: () => 'a-v1',
            createProjectVersion: async () => 'a-v2',
            savePublishedFields: async (id, fields) => { saved.push({ id, ...fields }); },
            showToast: msg => toasts.push(String(msg)),
            isSubdomainLimitErr: () => false,
            isSubdomainTakenErr: () => false,
            puterErrInfo: e => ({ message: (e && e.message) || '' }),
        },
        puter: {
            appID: 'builder',
            randName: () => 'random-name',
            ui: { alert: async msg => alerts.push(String(msg)) },
            fs: {
                ...disk.api,
                copy: async (from, to, options) => {
                    if (failAt === 'copy') { const e = new Error('storage unavailable'); throw e; }
                    return disk.api.copy(from, to, options);
                },
            },
            hosting: {
                create: async (sub, path) => {
                    hostingCalls.push({ method: 'create', sub, path });
                    sites.set(sub, path);
                    return { subdomain: sub };
                },
                update: async (sub, path) => {
                    if (failAt === 'hosting') throw new Error('hosting unavailable');
                    hostingCalls.push({ method: 'update', sub, path });
                    sites.set(sub, path);
                },
            },
        },
    };
    sandbox.saveCurrentChat = async ({ currentChatId }) => saved.push({
        id: currentChatId,
        publishedUrl: sandbox.window.currentPublishedUrl,
        publishedPath: sandbox.window.currentPublishedPath,
    });

    vm.createContext(sandbox);
    vm.runInContext(CODE, sandbox, { filename: 'src/js/ui.js' });
    await sandbox.doPublish();

    const servedDir = sites.get('ay-site');
    return {
        hostingCalls,
        alerts,
        toasts,
        served: disk.serves(servedDir),
        servedDir,
        publishedPath: sandbox.window.currentPublishedPath,
        // Everything left under the project's published container.
        releaseDirs: [...new Set([...disk.files.keys()]
            .filter(p => p.startsWith(A_PUB + '/'))
            .map(p => p.slice(A_PUB.length + 1).split('/')[0]))].sort(),
        fileCount: [...disk.files.keys()].filter(p => p.startsWith(A_PUB + '/')).length,
    };
}

// ---- Control: a successful republish swaps the public bytes -----------------
const ok = await run();
check('control: the public address serves the new files',
    ok.served === 'app.js=NEW SCRIPT,index.html=NEW WORK', ok.served);
check('control: hosting was pointed at the new release', ok.hostingCalls.length === 1
    && ok.hostingCalls[0].method === 'update' && ok.hostingCalls[0].path === ok.servedDir,
    JSON.stringify(ok.hostingCalls));
check('control: the served path is recorded as the published path',
    ok.publishedPath === ok.servedDir, ok.publishedPath + ' vs ' + ok.servedDir);
check('control: no error shown', ok.alerts.length === 0, JSON.stringify(ok.alerts));
check('control: the superseded release is retired (no unbounded growth)',
    ok.fileCount === 2, JSON.stringify(ok.releaseDirs) + ' files=' + ok.fileCount);

// ---- The bug: the copy fails after the old release was already removed ------
const copyFail = await run({ failAt: 'copy' });
check('copy failure: the previous deployment still serves its files',
    copyFail.served === 'app.js=OLD SCRIPT,index.html=OLD PUBLISHED', copyFail.served);
check('copy failure: hosting was never re-pointed', copyFail.hostingCalls.length === 0,
    JSON.stringify(copyFail.hostingCalls));
check('copy failure: the user is told it failed', copyFail.alerts.length === 1
    && /Could not publish/i.test(copyFail.alerts[0]), JSON.stringify(copyFail.alerts));

// ---- The same for a hosting update that fails after a complete copy ---------
const hostFail = await run({ failAt: 'hosting' });
check('hosting failure: the previous deployment still serves its files',
    hostFail.served === 'app.js=OLD SCRIPT,index.html=OLD PUBLISHED', hostFail.served);
check('hosting failure: the user is told it failed', hostFail.alerts.length === 1
    && /Could not publish/i.test(hostFail.alerts[0]), JSON.stringify(hostFail.alerts));
check('hosting failure: the half-finished release is cleaned up',
    hostFail.fileCount === 2, 'files=' + hostFail.fileCount);

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all publish-rollback checks passed');
