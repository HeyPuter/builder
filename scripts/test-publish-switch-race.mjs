import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: publishing project A never touches project B ----------
// doPublish() copies the working files into the frozen published dir BEFORE it
// decides which public subdomain to point at. That copy is a multi-second await,
// and the progress note explicitly invites the user to "close this and keep
// building" — so switching projects mid-publish is ordinary use, not an exotic
// race. The destination used to be re-read from window.currentPublishedUrl AFTER
// the copy, and loadChat repoints that global at the newly-opened project:
//   * switching to a published B made hosting.update() push A's files onto B's
//     LIVE public address, and saved B's URL + B's version id onto A's record —
//     from then on every publish of A overwrote B's site;
//   * switching to a never-published B sent A down the first-publish branch,
//     minting a SECOND subdomain for A (auto-named from B's chat history) and
//     orphaning A's real address on stale files, while the toast still said
//     "Your changes are now live".
// Everything that identifies the destination (URL, version baseline, the history
// the auto-name derives from) must therefore be captured before the first await.
//
// Drives the real doPublish (VM sandbox, only the FS/hosting/UI boundary mocked)
// with a deferred copy that deterministically opens the switch window.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const source = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const helpersSource = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');

// Slice a top-level function out of the real file (same approach as the other
// ui.js tests) so the production code under test is never re-typed here.
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

check('doPublish captures the destination before awaiting', /const startUrl = window\.currentPublishedUrl/.test(source));

const ROOT = '/alice/AppData/builder';
const A_WORK = ROOT + '/project-a';
const A_PUB = ROOT + '/.published/project-a';
const B_PUB = ROOT + '/.published/project-b';

// switchTo: null (stay on A) | 'published' | 'unpublished'
async function run({ switchTo = null, aPublished = true, typedName = '' } = {}) {
    const files = new Map([
        [A_WORK, 'PROJECT A NEW WORK'],
        [A_PUB, 'PROJECT A PUBLISHED COPY'],
        [B_PUB, 'PROJECT B PUBLISHED COPY'],
    ]);
    // Live sites: subdomain -> the dir it serves.
    const sites = new Map([['bee-site', B_PUB]]);
    if (aPublished) sites.set('ay-site', A_PUB);
    const hostingCalls = [], saved = [], alerts = [], toasts = [], snapshots = [];
    const versions = { 'project-a': 'a-v1', 'project-b': 'b-v7' };

    let copyStarted, releaseCopy;
    const copying = new Promise(res => { copyStarted = res; });
    const gate = new Promise(res => { releaseCopy = res; });

    const $stub = () => ({
        length: 0,
        val: () => typedName,
        trigger() { return this; },
        0: undefined,
    });

    const sandbox = {
        currentChatId: 'project-a',
        currentAppDir: A_WORK,
        // generateChatTitle skips index 0, so the first entry is a placeholder.
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
            currentPublishedUrl: aPublished ? 'https://ay-site.puter.site/' : null,
            currentPublishedPath: aPublished ? A_PUB : null,
            currentPublishedVersionId: aPublished ? 'a-v0' : null,
            _projectDirtySinceSnapshot: true,
            getCurrentVersionId: () => versions[sandbox.currentChatId] || null,
            createProjectVersion: async ({ chatId }) => {
                snapshots.push(chatId);
                versions[chatId] = versions[chatId] + '-snap';
                sandbox.window._projectDirtySinceSnapshot = false;
            },
            savePublishedFields: async (id, fields) => { saved.push({ id, ...fields }); },
            showToast: msg => toasts.push(String(msg)),
            isSubdomainLimitErr: () => false,
            isSubdomainTakenErr: () => false,
            puterErrInfo: e => ({ message: e && e.message }),
        },
        puter: {
            appID: 'builder',
            randName: () => 'random-name',
            ui: { alert: async msg => alerts.push(String(msg)) },
            fs: {
                mkdir: async () => {},
                delete: async path => { files.delete(path); },
                // A directory is one blob here; a publish release is a child of
                // the project's published container.
                readdir: async dir => {
                    const kids = [...files.keys()]
                        .filter(p => p.startsWith(dir + '/'))
                        .map(p => ({ name: p.slice(dir.length + 1).split('/')[0], is_dir: true }));
                    if (kids.length) return kids;
                    if (files.has(dir)) return [{ name: 'index.html', is_dir: false }];
                    throw new Error('not found');
                },
                copy: async (from, to, options) => {
                    copyStarted();
                    await gate; // hold the publish open across the project switch
                    files.set(to + '/' + options.newName, files.get(from));
                },
            },
            hosting: {
                create: async (sub, path) => {
                    hostingCalls.push({ method: 'create', sub, path });
                    sites.set(sub, path);
                    return { subdomain: sub };
                },
                update: async (sub, path) => {
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
        publishedVersionId: sandbox.window.currentPublishedVersionId,
    });

    vm.createContext(sandbox);
    vm.runInContext(CODE, sandbox, { filename: 'src/js/ui.js' });

    const operation = sandbox.doPublish();
    await copying;
    if (switchTo) {
        // The ownership-changing assignments loadChat performs (app.js:800–825).
        sandbox.currentChatId = 'project-b';
        sandbox.currentAppDir = ROOT + '/project-b';
        sandbox.chatHistory = [{ role: 'system', content: '' }, { role: 'user', content: 'Beta Budget Tracker' }];
        sandbox.window.currentPreviewPath = ROOT + '/project-b';
        const bPublished = switchTo === 'published';
        sandbox.window.currentPublishedUrl = bPublished ? 'https://bee-site.puter.site/' : null;
        sandbox.window.currentPublishedPath = bPublished ? B_PUB : null;
        sandbox.window.currentPublishedVersionId = bPublished ? 'b-v6' : null;
    }
    releaseCopy();
    await operation;

    const record = saved.find(s => s.id === 'project-a') || null;
    return {
        hostingCalls,
        alerts,
        toasts,
        snapshots,
        savedIds: saved.map(s => s.id),
        record,
        bSiteServes: files.get(sites.get('bee-site')),
        aSiteServes: sites.has('ay-site') ? files.get(sites.get('ay-site')) : null,
        siteCount: sites.size,
        subdomains: [...sites.keys()].sort(),
    };
}

// ---- Controls: nothing changes when the user stays put -----------------------
const republish = await run({ aPublished: true });
check('control/republish: A’s own subdomain is updated', republish.hostingCalls.length === 1
    && republish.hostingCalls[0].method === 'update' && republish.hostingCalls[0].sub === 'ay-site'
    && republish.hostingCalls[0].path.startsWith(A_PUB + '/r_'),
    JSON.stringify(republish.hostingCalls));
check('control/republish: A’s site serves A’s new work', republish.aSiteServes === 'PROJECT A NEW WORK');
check('control/republish: B untouched', republish.bSiteServes === 'PROJECT B PUBLISHED COPY');
check('control/republish: A records its own URL', republish.record && republish.record.publishedUrl === 'https://ay-site.puter.site/',
    JSON.stringify(republish.record));
check('control/republish: the Published snapshot becomes the baseline',
    republish.snapshots.join() === 'project-a' && republish.record.publishedVersionId === 'a-v1-snap',
    JSON.stringify({ snapshots: republish.snapshots, id: republish.record.publishedVersionId }));
check('control/republish: no error shown', republish.alerts.length === 0, JSON.stringify(republish.alerts));

const firstPublish = await run({ aPublished: false, typedName: 'alpha-notes' });
check('control/first publish: mints the typed address', firstPublish.hostingCalls.length === 1
    && firstPublish.hostingCalls[0].method === 'create' && firstPublish.hostingCalls[0].sub === 'alpha-notes',
    JSON.stringify(firstPublish.hostingCalls));
check('control/first publish: it serves A’s published copy',
    firstPublish.hostingCalls[0].path.startsWith(A_PUB + '/r_'), firstPublish.hostingCalls[0].path);
check('control/first publish: B untouched', firstPublish.bSiteServes === 'PROJECT B PUBLISHED COPY');

// ---- The race: switching to a PUBLISHED project mid-copy ---------------------
const raceRepublish = await run({ aPublished: true, switchTo: 'published' });
check('switch/republish: still targets A’s subdomain', raceRepublish.hostingCalls.length === 1
    && raceRepublish.hostingCalls[0].sub === 'ay-site'
    && raceRepublish.hostingCalls[0].path.startsWith(A_PUB + '/r_'),
    JSON.stringify(raceRepublish.hostingCalls));
check('switch/republish: B’s live site is NOT overwritten with A’s files',
    raceRepublish.bSiteServes === 'PROJECT B PUBLISHED COPY', 'B serves: ' + raceRepublish.bSiteServes);
check('switch/republish: A’s site still serves A', raceRepublish.aSiteServes === 'PROJECT A NEW WORK');
check('switch/republish: persisted to A, not the open chat', raceRepublish.savedIds.join() === 'project-a',
    JSON.stringify(raceRepublish.savedIds));
check('switch/republish: A keeps its own URL', raceRepublish.record
    && raceRepublish.record.publishedUrl === 'https://ay-site.puter.site/',
    JSON.stringify(raceRepublish.record));
check('switch/republish: A keeps its own version baseline, not B’s',
    raceRepublish.record && raceRepublish.record.publishedVersionId === 'a-v1',
    'versionId=' + (raceRepublish.record && raceRepublish.record.publishedVersionId));
check('switch/republish: no snapshot taken for the project that left the screen',
    raceRepublish.snapshots.length === 0, JSON.stringify(raceRepublish.snapshots));

const raceFirst = await run({ aPublished: false, switchTo: 'published', typedName: 'alpha-notes' });
check('switch/first publish: creates A’s address rather than updating B’s',
    raceFirst.hostingCalls.length === 1 && raceFirst.hostingCalls[0].method === 'create'
    && raceFirst.hostingCalls[0].sub === 'alpha-notes'
    && raceFirst.hostingCalls[0].path.startsWith(A_PUB + '/r_'),
    JSON.stringify(raceFirst.hostingCalls));
check('switch/first publish: B’s live site is untouched', raceFirst.bSiteServes === 'PROJECT B PUBLISHED COPY');
check('switch/first publish: A records its new URL', raceFirst.record
    && raceFirst.record.publishedUrl === 'https://alpha-notes.puter.site/',
    JSON.stringify(raceFirst.record));

// ---- The reverse: switching to a NEVER-PUBLISHED project mid-copy ------------
const raceUnpublished = await run({ aPublished: true, switchTo: 'unpublished' });
check('switch/unpublished: does NOT mint a second subdomain for A',
    raceUnpublished.hostingCalls.length === 1 && raceUnpublished.hostingCalls[0].method === 'update',
    JSON.stringify(raceUnpublished.hostingCalls));
check('switch/unpublished: A’s original address is not orphaned',
    raceUnpublished.subdomains.join() === 'ay-site,bee-site' && raceUnpublished.aSiteServes === 'PROJECT A NEW WORK',
    JSON.stringify(raceUnpublished.subdomains));

// ---- The auto-derived name must come from the project being published --------
const raceAutoName = await run({ aPublished: false, switchTo: 'published', typedName: '' });
check('switch/auto-name: the address is derived from A’s chat, not B’s',
    raceAutoName.hostingCalls[0] && raceAutoName.hostingCalls[0].sub === 'alpha-notes-app',
    JSON.stringify(raceAutoName.hostingCalls));

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all publish-switch-race checks passed');
