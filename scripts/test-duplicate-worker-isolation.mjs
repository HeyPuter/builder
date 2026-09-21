import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: a copy is independent, or it is not made -------------
// "Make a copy" gives the copy its own serverless workers and rewrites every
// reference to them, because a worker is an account-level resource: a copy that
// kept the original's URLs would be a second frontend operating on the
// ORIGINAL's live backend data, and its AI would redeploy — hijack — the
// original's workers by name. That redeploy step used to be best-effort: a
// failed worker enumeration, or a failed deployment of one of the copy's
// workers, was warned to the console and the duplication carried on. The copy
// was then hosted, listed and opened as an independent project while still
// calling the original's backend, with nothing shown to the user.
//
// Drives the real duplicateChat + redeployWorkersForCopy (VM sandbox, only the
// FS/hosting/worker/UI boundary mocked) with the real WorkerOwnership module.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const appSource = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const ownershipSource = fs.readFileSync(new URL('../src/js/worker-ownership.js', import.meta.url), 'utf8');

function extract(src, signature) {
    const a = src.indexOf(signature);
    if (a < 0) throw new Error('could not find ' + signature);
    const b = src.indexOf('\n}\n', a);
    if (b < 0) throw new Error('could not find the end of ' + signature);
    return src.slice(a, b + 2);
}
const CODE = [
    'const _duplicatingChats = new Set();',
    appSource.match(/^const WORKER_URL_TEXT_FILE_RE = .*$/m)[0],
    extract(appSource, 'async function rewriteWorkerUrlsInDir(dir, renames, changed = new Set()) {'),
    extract(appSource, 'async function discardCopyAttempt(newAppDir, renames) {'),
    extract(appSource, 'async function redeployWorkersForCopy(oldAppDir, newAppDir) {'),
    extract(appSource, 'async function duplicateChat(chatId) {'),
].join('\n\n');

const PARENT = '/alice/AppData/builder';
const OLD_DIR = PARENT + '/chat1';

// failAt: null | 'list' | 'create-first' | 'create-second'
async function run({ failAt = null, workerCount = 1 } = {}) {
    const files = new Map([
        [OLD_DIR + '/index.html', "fetch('https://original-api.puter.work/save', {method:'POST'})"],
        [OLD_DIR + '/workers/original-api.js', 'export default { fetch() {} }'],
        ['chat-history/chat1.json', JSON.stringify({
            id: 'chat1', title: 'Notes', history: [{ role: 'system', content: 'cwd ' + OLD_DIR }],
            previewUrl: 'https://draft-one.puter.site/', previewPath: OLD_DIR,
        })],
    ]);
    const deployed = new Map([['original-api', {
        name: 'original-api', url: 'https://original-api.puter.work',
        file_path: OLD_DIR + '/workers/original-api.js',
    }]]);
    if (workerCount > 1) {
        files.set(OLD_DIR + '/workers/original-two.js', 'export default { fetch() {} }');
        deployed.set('original-two', {
            name: 'original-two', url: 'https://original-two.puter.work',
            file_path: OLD_DIR + '/workers/original-two.js',
        });
    }
    const alerts = [], sites = new Map();
    let creates = 0;

    const under = dir => [...files.keys()].filter(p => p.startsWith(dir + '/'));
    const sandbox = {
        savedChats: [{ id: 'chat1', title: 'Notes', previewUrl: 'https://draft-one.puter.site/' }],
        currentChatId: 'chat2',
        chatHistory: [],
        generateChatId: () => 'chat-copy',
        saveChatList: async () => {},
        updateChatHistorySidebar() {},
        $: () => ({ addClass() { return this; }, removeClass() { return this; } }),
        console: { warn() {}, error() {} },
        // WorkerOwnership.urlHost parses with the WHATWG URL constructor, which
        // a bare VM context does not provide.
        URL,
        window: {
            user: { username: 'alice' },
            makeDraftSubdomain: () => 'copy-draft',
            withFileLock: (path, fn) => Promise.resolve().then(fn),
        },
        puter: {
            appID: 'builder',
            ui: { alert: async m => alerts.push(String(m)) },
            hosting: {
                create: async (sub, path) => { sites.set(sub, path); return { subdomain: sub }; },
            },
            workers: {
                list: async () => {
                    if (failAt === 'list') throw new Error('workers service unavailable');
                    return [...deployed.values()];
                },
                create: async (name, filePath) => {
                    creates++;
                    if (failAt === 'create-first' && creates === 1) throw new Error('deploy failed');
                    if (failAt === 'create-second' && creates === 2) throw new Error('deploy failed');
                    const url = `https://${name}.puter.work`;
                    deployed.set(name, { name, url, file_path: filePath });
                    return { success: true, url };
                },
                delete: async name => { deployed.delete(name); },
            },
            fs: {
                read: async path => {
                    if (!files.has(path)) { const e = new Error('not found'); e.code = 'subject_does_not_exist'; throw e; }
                    return { text: async () => files.get(path) };
                },
                write: async (path, data) => { files.set(path, data); },
                readdir: async dir => {
                    const items = new Map();
                    for (const p of under(dir)) {
                        const rel = p.slice(dir.length + 1);
                        const name = rel.split('/')[0];
                        items.set(name, { name, is_dir: rel.includes('/') });
                    }
                    if (!items.size) { const e = new Error('not found'); e.code = 'subject_does_not_exist'; throw e; }
                    return [...items.values()];
                },
                copy: async (from, to, options) => {
                    const dest = to + '/' + options.newName;
                    const src = under(from);
                    if (!src.length) { const e = new Error('not found'); e.code = 'subject_does_not_exist'; throw e; }
                    for (const p of src) files.set(dest + p.slice(from.length), files.get(p));
                },
                rename: async (path, newName) => {
                    const dir = path.slice(0, path.lastIndexOf('/'));
                    if (!files.has(path)) throw new Error('not found: ' + path);
                    files.set(dir + '/' + newName, files.get(path));
                    files.delete(path);
                },
                delete: async path => { files.delete(path); for (const p of under(path)) files.delete(p); },
            },
        },
    };
    vm.createContext(sandbox);
    vm.runInContext(ownershipSource, sandbox, { filename: 'src/js/worker-ownership.js' });
    vm.runInContext(CODE, sandbox, { filename: 'src/js/app.js' });

    await sandbox.duplicateChat('chat1');

    const copyDir = PARENT + '/chat-copy';
    const copyFrontend = files.get(copyDir + '/index.html') || '';
    return {
        alerts,
        listed: sandbox.savedChats.some(c => c.id === 'chat-copy'),
        chatFileWritten: files.has('chat-history/chat-copy.json'),
        copyFilesLeft: under(copyDir).length,
        hosted: [...sites.keys()],
        copyCallsOriginal: copyFrontend.includes('original-api.puter.work'),
        copyFrontend,
        deployedNames: [...deployed.keys()].sort(),
    };
}

// ---- Control: the copy gets its own backend ---------------------------------
const ok = await run();
check('control: the copy is listed', ok.listed === true);
check('control: its frontend no longer calls the original backend',
    ok.copyCallsOriginal === false, ok.copyFrontend);
check('control: the copy has a worker of its own',
    ok.deployedNames.length === 2 && ok.deployedNames.some(n => n.startsWith('original-api-')),
    JSON.stringify(ok.deployedNames));
check('control: the copy is hosted', ok.hosted.join() === 'copy-draft');
check('control: no error shown', ok.alerts.length === 0, JSON.stringify(ok.alerts));

// ---- The worker list fails: we cannot prove the copy is independent ---------
const listFail = await run({ failAt: 'list' });
check('list failure: no copy is exposed', listFail.listed === false && listFail.chatFileWritten === false,
    JSON.stringify(listFail));
check('list failure: nothing is hosted with the original’s URLs', listFail.hosted.length === 0,
    JSON.stringify(listFail.hosted));
check('list failure: the half-made copy’s files are removed', listFail.copyFilesLeft === 0,
    'files left: ' + listFail.copyFilesLeft);
check('list failure: the user is told why', listFail.alerts.length === 1
    && /backend|worker/i.test(listFail.alerts[0]), JSON.stringify(listFail.alerts));

// ---- A deployment fails -----------------------------------------------------
const deployFail = await run({ failAt: 'create-first' });
check('deploy failure: no copy is exposed', deployFail.listed === false && deployFail.chatFileWritten === false);
check('deploy failure: nothing is hosted', deployFail.hosted.length === 0);
check('deploy failure: the original’s worker is untouched',
    deployFail.deployedNames.join() === 'original-api', JSON.stringify(deployFail.deployedNames));
check('deploy failure: the user is told why', deployFail.alerts.length === 1);

// ---- A PARTIAL deployment must not leak the workers it did create -----------
const partial = await run({ failAt: 'create-second', workerCount: 2 });
check('partial: no copy is exposed', partial.listed === false && partial.chatFileWritten === false);
check('partial: the worker that did deploy is removed again',
    partial.deployedNames.join() === 'original-api,original-two',
    JSON.stringify(partial.deployedNames));
check('partial: the user is told why', partial.alerts.length === 1, JSON.stringify(partial.alerts));

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all duplicate-worker-isolation checks passed');
