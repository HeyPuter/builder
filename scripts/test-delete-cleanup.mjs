import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: a delete that failed must not look like it worked -----
// deleteChat removes a project's hosted sites, its serverless workers, its app
// directory, the published copy and the saved conversation. Every one of those
// failures used to be swallowed with a console warning, and the project was
// then dropped from the sidebar and tombstoned regardless. A transient service
// error therefore left a public site and an account-level worker running with
// no UI path back to them: the entry that carried their URLs was gone.
//
// A failure that is "already not there" is a successful deletion; anything else
// must leave the project listed, untombstoned and retryable, and say so.
//
// Drives the real deleteChat (VM sandbox, only the FS/hosting/worker/UI
// boundary mocked) with each cleanup step failing in turn.

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
    'const _deletedChatIds = new Set();',
    extract(appSource, 'function isNotFoundError(error) {'),
    extract(appSource, 'async function deleteChat(chatId) {'),
].join('\n\n');

const APP_DIR = '/alice/AppData/builder/chat1';

function notFound() { const e = new Error('not found'); e.code = 'subject_does_not_exist'; return e; }

// failing: which step rejects, and with what kind of error.
async function run({ failing = null, notFoundOnly = false } = {}) {
    const sites = new Set(['draft-one', 'pub-one']);
    const workers = new Map([['api-a', { name: 'api-a', file_path: APP_DIR + '/workers/api-a.js' }]]);
    const dirs = new Set([APP_DIR, '/alice/AppData/builder/.published/chat1', 'chat-history/chat1.json']);
    const alerts = [];
    const boom = step => {
        if (failing !== step) return null;
        return notFoundOnly ? notFound() : new Error('service unavailable');
    };

    const sandbox = {
        savedChats: [
            { id: 'chat1', title: 'Notes', previewUrl: 'https://draft-one.puter.site/', publishedUrl: 'https://pub-one.puter.site/' },
            { id: 'chat2', title: 'Other' },
        ],
        currentChatId: 'chat2',
        terminateActiveTurn() {},
        new_chat() {},
        saveChatList: async () => {},
        updateChatHistorySidebar() {},
        clearComposerDraft() {},
        _chatSavePending: new Map(),
        _suggestionsByChat: new Map(),
        console: { warn() {}, error() {} },
        window: {
            user: { username: 'alice' },
            animateChatItemRemoval: async () => {},
            deleteChatVersions: async () => {},
            deleteChatIssues: async () => {},
        },
        puter: {
            appID: 'builder',
            ui: { alert: async m => alerts.push(String(m)) },
            hosting: {
                delete: async sub => {
                    const e = boom('hosting'); if (e) throw e;
                    if (!sites.has(sub)) throw notFound();
                    sites.delete(sub);
                },
            },
            workers: {
                list: async () => {
                    const e = boom('worker-list'); if (e) throw e;
                    return [...workers.values()];
                },
                delete: async name => {
                    const e = boom('worker-delete'); if (e) throw e;
                    if (!workers.has(name)) throw notFound();
                    workers.delete(name);
                },
            },
            fs: {
                delete: async path => {
                    if (path === APP_DIR) { const e = boom('appdir'); if (e) throw e; }
                    if (path.startsWith('chat-history/')) { const e = boom('chatfile'); if (e) throw e; }
                    if (!dirs.has(path)) throw notFound();
                    dirs.delete(path);
                },
            },
        },
    };
    vm.createContext(sandbox);
    vm.runInContext(ownershipSource, sandbox, { filename: 'src/js/worker-ownership.js' });
    vm.runInContext(CODE, sandbox, { filename: 'src/js/app.js' });

    let threw = false;
    try { await sandbox.deleteChat('chat1'); } catch (e) { threw = true; }

    return {
        threw,
        alerts,
        stillListed: sandbox.savedChats.some(c => c.id === 'chat1'),
        tombstoned: sandbox.deleteChat && vm.runInContext("_deletedChatIds.has('chat1')", sandbox),
        sitesLeft: [...sites].sort(),
        workersLeft: [...workers.keys()],
        dirsLeft: [...dirs].sort(),
    };
}

// ---- Control: everything goes -----------------------------------------------
const ok = await run();
check('control: the project leaves the sidebar', ok.stillListed === false);
check('control: sites and workers are gone',
    ok.sitesLeft.length === 0 && ok.workersLeft.length === 0,
    JSON.stringify({ sites: ok.sitesLeft, workers: ok.workersLeft }));
check('control: files are gone', ok.dirsLeft.length === 0, JSON.stringify(ok.dirsLeft));
check('control: tombstoned so a late save cannot resurrect it', ok.tombstoned === true);
check('control: no error shown', ok.alerts.length === 0 && ok.threw === false, JSON.stringify(ok.alerts));

// ---- Each cleanup step failing in turn --------------------------------------
for (const [step, label, survives] of [
    ['hosting', 'a hosted site', r => r.sitesLeft.length > 0],
    ['worker-list', 'the worker enumeration', r => r.workersLeft.length > 0],
    ['worker-delete', 'a worker', r => r.workersLeft.length > 0],
    ['appdir', 'the project files', r => r.dirsLeft.includes(APP_DIR)],
    ['chatfile', 'the saved conversation', r => r.dirsLeft.some(d => d.startsWith('chat-history/'))],
]) {
    const r = await run({ failing: step });
    check(`${step}: the resource really did survive (${label})`, survives(r), JSON.stringify(r));
    check(`${step}: the project stays in the sidebar`, r.stillListed === true, JSON.stringify(r));
    check(`${step}: the project is not tombstoned, so it can be deleted again`, r.tombstoned === false);
    check(`${step}: the user is told what could not be removed`,
        r.alerts.length === 1 && /could not be removed|couldn.t/i.test(r.alerts[0]), JSON.stringify(r.alerts));
    check(`${step}: the caller sees the failure`, r.threw === true);
}

// ---- "Already gone" is a successful deletion, not a failure -----------------
for (const step of ['hosting', 'worker-delete', 'appdir', 'chatfile']) {
    const r = await run({ failing: step, notFoundOnly: true });
    check(`${step}/not-found: the delete completes normally`,
        r.stillListed === false && r.alerts.length === 0 && r.threw === false,
        JSON.stringify(r));
}

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all delete-cleanup checks passed');
