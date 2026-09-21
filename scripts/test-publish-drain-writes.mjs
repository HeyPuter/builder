import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: publish never copies a file mid-rewrite --------------
// Every writer of the app directory takes that file's write lock (withFileLock)
// so no two of them interleave a read → rewrite → write. The publish copy is
// not a per-path writer — it copies the whole directory in one call — so it
// took no locks at all, and the writes it can land in the middle of keep
// running for a while AFTER a turn ends: the post-turn preview refresh
// (applyPreviewCacheBust) and the manifest generator each hold a page's lock
// across a read, several stats and a write-back.
//
// That is the window behind "clicked publish before the AI finished … file
// contents are missing": the preview had appeared, the turn's own guard had
// already lifted, and the publish copied a file another writer was in the
// middle of replacing. Draining the app directory's locks before the copy
// closes it.
//
// Drives the real doPublish and the real withFileLock in one VM, with a writer
// deliberately parked inside its read → write gap.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const uiSource = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
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

const LOCKS = helpersSource.slice(
    helpersSource.indexOf('const _fileLocks = new Map()'),
    helpersSource.indexOf('// Write `data` to `path` and CONFIRM'));

const CODE = [
    LOCKS,
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

// ---- Static: the drain exists and the publish uses it before copying --------
check('helpers.js exposes window.drainFileLocks', /window\.drainFileLocks\s*=/.test(helpersSource));
{
    const start = uiSource.indexOf('async function doPublish() {');
    const body = uiSource.slice(start, uiSource.indexOf('\n}\n', start));
    const drainAt = body.indexOf('drainFileLocks');
    const copyAt = body.indexOf('puter.fs.copy(');
    check('doPublish drains the working directory before copying it',
        drainAt >= 0 && copyAt >= 0 && drainAt < copyAt, `drain@${drainAt} copy@${copyAt}`);
}

// ---- Behavioural: a writer parked mid-rewrite -------------------------------
const ROOT = '/alice/AppData/builder';
const WORK = ROOT + '/project-a';
const PUB = ROOT + '/.published/project-a';

const files = new Map([
    [WORK + '/index.html', 'FINISHED TURN OUTPUT'],
    [PUB + '/index.html', 'OLD PUBLISHED'],
]);
const sites = new Map([['ay-site', PUB]]);
const under = dir => [...files.keys()].filter(p => p.startsWith(dir + '/'));
const alerts = [];

const $stub = () => ({ length: 0, val: () => '', trigger() { return this; }, 0: undefined });
const sandbox = {
    currentChatId: 'project-a',
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
    console: { warn() {}, error() {} },
    window: {
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
    },
    puter: {
        appID: 'builder',
        randName: () => 'random-name',
        ui: { alert: async m => alerts.push(String(m)) },
        fs: {
            mkdir: async () => {},
            readdir: async dir => {
                const names = new Set();
                for (const p of under(dir)) names.add(p.slice(dir.length + 1).split('/')[0]);
                if (!names.size) throw new Error('not found');
                return [...names].map(name => ({ name, is_dir: !files.has(dir + '/' + name) }));
            },
            delete: async path => { files.delete(path); for (const p of under(path)) files.delete(p); },
            copy: async (from, to, options) => {
                const dest = to + '/' + options.newName;
                for (const p of under(from)) files.set(dest + p.slice(from.length), files.get(p));
            },
        },
        hosting: {
            create: async (sub, path) => { sites.set(sub, path); return { subdomain: sub }; },
            update: async (sub, path) => { sites.set(sub, path); },
        },
    },
};
sandbox.saveCurrentChat = async () => {};
vm.createContext(sandbox);
vm.runInContext(CODE, sandbox, { filename: 'src/js/ui.js' });

// The post-turn preview refresh: holds index.html's lock across its whole
// read → rewrite → write. Between those two points the file is in the state
// the copy must never capture.
let releaseWriter;
const writerParked = new Promise(res => { releaseWriter = res; });
let parked;
const writer = sandbox.window.withFileLock(WORK + '/index.html', async () => {
    files.set(WORK + '/index.html', 'HALF-WRITTEN');
    await new Promise(res => { parked = res; });
    files.set(WORK + '/index.html', 'FINISHED TURN OUTPUT, CACHE-BUSTED');
});
await new Promise(setImmediate);
releaseWriter();

const publishing = sandbox.doPublish();
// Give the publish every chance to run ahead of the writer.
for (let i = 0; i < 20; i++) await new Promise(setImmediate);
parked();
await writer;
await publishing;

const servedDir = sites.get('ay-site');
const served = files.get(servedDir + '/index.html');
check('the release holds the finished file, not the half-written one',
    served === 'FINISHED TURN OUTPUT, CACHE-BUSTED', 'served: ' + served);
check('the publish still succeeded', alerts.length === 0, JSON.stringify(alerts));

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all publish-drain-writes checks passed');
