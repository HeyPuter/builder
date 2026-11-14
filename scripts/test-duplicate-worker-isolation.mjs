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
const helpersSource = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const uiSource = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const ownershipSource = fs.readFileSync(new URL('../src/js/worker-ownership.js', import.meta.url), 'utf8');
const senderSource = fs.readFileSync(new URL('../src/js/worker-sender.js', import.meta.url), 'utf8');

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
    extract(appSource, 'function isNotFoundError(error) {'),
    extract(appSource, 'async function discardCopyAttempt(newAppDir, renames) {'),
    extract(appSource, 'async function redeployWorkersForCopy(oldAppDir, newAppDir) {'),
    extract(appSource, 'function markChatItemBusy($item, cls, on) {'),
    extract(appSource, 'function repairDanglingToolUses(history) {'),
    extract(uiSource, 'function copiedProjectNoteMessage(originalUrl) {'),
    extract(uiSource, 'function pushAiNote(history, note) {'),
    extract(appSource, 'function unpublishCopiedHistory(history, originalUrl) {'),
    appSource.match(/^const FRESH_COPY_NOTE = .*$/m)[0],
    extract(appSource, 'function freshCopyHistory(history, extraNotes) {'),
    extract(appSource, 'async function duplicateChat(chatId, { freshConversation = false } = {}) {'),
].join('\n\n');

const PARENT = '/alice/AppData/builder';
const OLD_DIR = PARENT + '/chat1';

// failAt: null | 'list' | 'create-first' | 'create-second' | 'chat-write'
// fresh: the refusal card's "Continue in a new chat" (freshConversation).
// noSystem: a source whose history has no system prompt.
async function run({ failAt = null, workerCount = 1, senderTitle = null, failRename = false, published = false, openUnsaved = false, fresh = false, noSystem = false, systemBlocks = false } = {}) {
    // A published source: its AI was told the public address, and the user
    // published from a Publish card in the chat.
    const history = noSystem ? [] : [{ role: 'system', content: systemBlocks
        ? [{ type: 'text', text: 'common', cache_control: { type: 'ephemeral', ttl: '1h' } }, { type: 'text', text: 'cwd ' + OLD_DIR }]
        : 'cwd ' + OLD_DIR, buildModel: 'claude-opus-5-5' }];
    // A conversation to leave behind (a fresh copy drops it). Only on the
    // fresh runs, so the other checks see the history they always have.
    if (fresh || noSystem) history.push(
        { role: 'user', content: [{ type: 'text', text: 'make a notes app' }] },
        { role: 'assistant', content: 'Done.' },
    );
    if (published) {
        history.push(
            { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'OfferPublish', input: {} }] },
            { role: 'user', content: { type: 'tool_result', tool_use_id: 't1',
                content: JSON.stringify({ __publish_offer: true, address: 'notes', offer: 'offer-1', instruction: '' }) },
                publishCardUrl: 'https://notes.puter.site/' },
            { role: 'assistant', content: [{ type: 'text-hidden', text: '[The user published the app. It is now public at https://notes.puter.site/.]' }], versionNote: true },
        );
    }
    const files = new Map([
        [OLD_DIR + '/index.html', "fetch('https://original-api.puter.work/save', {method:'POST'})"],
        [OLD_DIR + '/workers/original-api.js', 'export default { fetch() {} }'],
        // An image generated in the chat (its media folder, beside the project).
        [PARENT + '/.media/chat1/image_1.png', 'PNG'],
        ['chat-history/chat1.json', JSON.stringify({
            id: 'chat1', title: 'Notes', history,
            previewUrl: 'https://draft-one.puter.site/', previewPath: OLD_DIR,
            ...(published && !openUnsaved ? { publishedUrl: 'https://notes.puter.site/', publishedPath: PARENT + '/.published/chat1/r1' } : {}),
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
    const alerts = [], sites = new Map(), toasts = [];
    let creates = 0;
    // Each worker's sandbox app, whose title is its email sender name
    // (worker-sender.js). puter.js makes one per worker name, titled with it.
    const apps = new Map();
    const renames = [];
    const ensureApp = name => {
        if (!apps.has('sandbox-' + name)) apps.set('sandbox-' + name, { uid: 'uid-' + name, name: 'sandbox-' + name, title: 'sandbox-' + name });
    };
    for (const name of deployed.keys()) ensureApp(name);
    if (senderTitle) apps.get('sandbox-original-api').title = senderTitle;

    const under = dir => [...files.keys()].filter(p => p.startsWith(dir + '/'));
    const sandbox = {
        savedChats: [{ id: 'chat1', title: 'Notes', previewUrl: 'https://draft-one.puter.site/' }],
        currentChatId: 'chat2',
        chatHistory: [],
        generateChatId: () => 'chat-copy',
        saveChatList: async () => {},
        updateChatHistorySidebar() {},
        $: () => ({ addClass() { return this; }, removeClass() { return this; }, toggleClass() { return this; }, hasClass() { return false; }, find() { return { attr() { return this; } }; } }),
        console: { warn() {}, error() {} },
        // WorkerOwnership.urlHost parses with the WHATWG URL constructor, which
        // a bare VM context does not provide.
        URL,
        window: {
            user: { username: 'alice' },
            makeDraftSubdomain: () => 'copy-draft',
            withFileLock: (path, fn) => Promise.resolve().then(fn),
            showToast: (m, o) => toasts.push([String(m), o && o.key]),
        },
        puter: {
            appID: 'builder',
            ui: { alert: async m => alerts.push(String(m)) },
            hosting: {
                create: async (sub, path) => { sites.set(sub, path); return { subdomain: sub }; },
                delete: async (sub) => { sites.delete(sub); },
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
                    ensureApp(name);
                    return { success: true, url };
                },
                delete: async name => { deployed.delete(name); },
                get: async name => (deployed.has(name) ? { name, app_uid: apps.get('sandbox-' + name).uid } : null),
            },
            apps: {
                get: async name => {
                    if (!apps.has(name)) throw { error: { code: 'entity_not_found' } };
                    return { ...apps.get(name) };
                },
                update: async (name, attrs) => {
                    if (failRename) throw new Error('rename failed');
                    renames.push([name, attrs.title]);
                    apps.get(name).title = attrs.title;
                    return { ...apps.get(name) };
                },
            },
            fs: {
                read: async path => {
                    if (!files.has(path)) { const e = new Error('not found'); e.code = 'subject_does_not_exist'; throw e; }
                    return { text: async () => files.get(path) };
                },
                write: async (path, data) => {
                    if (failAt === 'chat-write' && path === 'chat-history/chat-copy.json') throw new Error('storage unavailable');
                    files.set(path, data);
                },
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
                stat: async path => {
                    if (!files.has(path) && !under(path).length) { const e = new Error('not found'); e.code = 'subject_does_not_exist'; throw e; }
                    return { path };
                },
                mkdir: async () => {},
            },
        },
    };
    // The source is the open project, published moments ago: its file
    // doesn't have the address yet, the live state does.
    if (openUnsaved) {
        sandbox.currentChatId = 'chat1';
        sandbox.chatHistory = history;
        sandbox.window.currentPublishedUrl = 'https://notes.puter.site/';
    }
    vm.createContext(sandbox);
    // The real media-folder helpers (window.mediaDirForAppDir).
    const h0 = helpersSource.indexOf('window.normalizePosixPath =');
    const h1 = helpersSource.indexOf('window.assertPathInProject =');
    const m0 = helpersSource.indexOf('window.mediaDirForAppDir =');
    const m1 = helpersSource.indexOf('window.chatMediaDir =');
    new Function('window', helpersSource.slice(h0, h1) + helpersSource.slice(m0, m1))(sandbox.window);
    vm.runInContext(ownershipSource, sandbox, { filename: 'src/js/worker-ownership.js' });
    vm.runInContext(senderSource, sandbox, { filename: 'src/js/worker-sender.js' });
    vm.runInContext(CODE, sandbox, { filename: 'src/js/app.js' });

    const sourceBefore = files.get('chat-history/chat1.json');
    const sourceHistoryBefore = JSON.stringify(sandbox.chatHistory);
    const returned = await sandbox.duplicateChat('chat1', fresh ? { freshConversation: true } : undefined);

    const copyDir = PARENT + '/chat-copy';
    const copyFrontend = files.get(copyDir + '/index.html') || '';
    return {
        returned,
        sourceUnchanged: files.get('chat-history/chat1.json') === sourceBefore
            && JSON.stringify(sandbox.chatHistory) === sourceHistoryBefore,
        listEntry: sandbox.savedChats.find(c => c.id === 'chat-copy') || null,
        alerts,
        listed: sandbox.savedChats.some(c => c.id === 'chat-copy'),
        chatFileWritten: files.has('chat-history/chat-copy.json'),
        copyFilesLeft: under(copyDir).length,
        copyMediaLeft: under(PARENT + '/.media/chat-copy').length,
        copyChat: files.has('chat-history/chat-copy.json') ? JSON.parse(files.get('chat-history/chat-copy.json')) : null,
        hosted: [...sites.keys()],
        copyCallsOriginal: copyFrontend.includes('original-api.puter.work'),
        copyFrontend,
        deployedNames: [...deployed.keys()].sort(),
        apps, renames, toasts,
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
check('control: the copy gets its own copy of the generated media', ok.copyMediaLeft === 1, String(ok.copyMediaLeft));
check('control: a backend on its default sender name renames nothing', ok.renames.length === 0, JSON.stringify(ok.renames));

// ---- A published source: the copy isn't, and its AI is told ---------------
// The copy inherits a conversation that says the site is public at the
// original's address. Its AI gave that address out as the copy's, and the
// Publish card the user published from read "Published" in the copy.
{
    const r = await run({ published: true });
    const h = r.copyChat.history;
    check('published source: the copy starts unpublished', r.copyChat.publishedUrl === null);
    check('published source: no card in the copy records the original\'s publish',
        !h.some(m => 'publishCardUrl' in m), JSON.stringify(h));
    const last = h[h.length - 1];
    check('published source: a note tells the copy\'s AI the address is the original\'s',
        last.role === 'assistant' && last.versionNote === true && last.content[0].type === 'text-hidden'
        && /copy isn't published/.test(last.content[0].text) && last.content[0].text.includes('https://notes.puter.site/'),
        JSON.stringify(last));
    const offer = h.find(m => m.content && m.content.type === 'tool_result' && m.content.content.includes('__publish_offer'));
    const offerResult = offer && JSON.parse(offer.content.content);
    check('published source: the copy\'s card isn\'t filled in with the original\'s (taken) address',
        offerResult && offerResult.__publish_offer === true && offerResult.address === '' && offerResult.offer === 'offer-1',
        JSON.stringify(offerResult));
    const open = await run({ published: true, openUnsaved: true });
    const openLast = open.copyChat.history.at(-1);
    check('the open project, published but not yet saved: its live address is the one the note names',
        openLast.versionNote === true && /copy isn't published/.test(openLast.content[0].text)
        && openLast.content[0].text.includes('https://notes.puter.site/'), JSON.stringify(openLast));
    const plain = await run();
    check('unpublished source: no note added', plain.copyChat.history.length === 1, JSON.stringify(plain.copyChat.history));
}

// ---- The copy's backend sends under the original's sender name --------------
{
    const r = await run({ senderTitle: 'Makor Family Portal' });
    const copyName = r.deployedNames.find(n => n.startsWith('original-api-'));
    check('sender: the copy\'s backend gets the original\'s sender name',
        r.listed && r.apps.get('sandbox-' + copyName).title === 'Makor Family Portal' &&
        r.apps.get('sandbox-original-api').title === 'Makor Family Portal', JSON.stringify(r.renames));
    const f = await run({ senderTitle: 'Makor', failRename: true });
    check('sender: a failed copy never fails the duplicate, and the user is told',
        f.listed && f.alerts.length === 0 && f.toasts.some(([m, k]) => k === 'duplicate-sender'), JSON.stringify({ alerts: f.alerts, toasts: f.toasts }));
    // A duplicate that fails after the copy's backend got the name: the
    // discarded backend gives the name back before it is deleted.
    const d = await run({ senderTitle: 'Makor', failAt: 'chat-write' });
    const discarded = [...d.apps.keys()].find(k => k.startsWith('sandbox-original-api-'));
    check('sender: a discarded copy\'s backend gets its default name back',
        !d.listed && !!discarded && d.apps.get(discarded).title === discarded, JSON.stringify(d.renames));
}

// ---- The copy's chat file can't be written: nothing is left behind -----------
// Its files, its redeployed workers and its draft site were all created before
// the final write. The generic catch only alerted, so each failed attempt (and
// each retry) left a running worker nobody owned and a site counting against
// the account's limit.
{
    const r = await run({ failAt: 'chat-write' });
    check('copy save failure: the copy is not listed', r.listed === false && r.chatFileWritten === false);
    check('copy save failure: the copy\'s worker is removed', r.deployedNames.join() === 'original-api', JSON.stringify(r.deployedNames));
    check('copy save failure: the copy\'s draft site is removed', r.hosted.length === 0, JSON.stringify(r.hosted));
    check('copy save failure: the copied files are removed', r.copyFilesLeft === 0, String(r.copyFilesLeft));
    check('copy save failure: no copy of the generated media is left behind', r.copyMediaLeft === 0, String(r.copyMediaLeft));
    check('copy save failure: the user is told', r.alerts.length === 1 && /Could not duplicate/.test(r.alerts[0]), JSON.stringify(r.alerts));
}

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

// ---- "Continue in a new chat": the files, a fresh conversation --------------
// The refusal card's button (refusal-fallback in app.js). Everything a copy
// guarantees still holds; only the conversation is left behind, and nothing
// about the original changes.
{
    const control = await run();
    check('control: a plain copy resolves to the copy\'s id', control.returned === 'chat-copy', String(control.returned));
    check('control: a plain copy leaves the original untouched', control.sourceUnchanged === true);

    const r = await run({ fresh: true });
    const h = r.copyChat && r.copyChat.history;
    check('fresh: the copy is saved, listed and returned', r.listed && r.chatFileWritten && r.returned === 'chat-copy', JSON.stringify({ listed: r.listed, returned: r.returned }));
    check('fresh: the original chat file and live history are untouched', r.sourceUnchanged === true);
    check('fresh: only the system prompt is kept', Array.isArray(h) && h.length === 1 && h[0].role === 'system', JSON.stringify(h));
    check('fresh: the prompt points at the copy\'s own directory', typeof h[0].content === 'string'
        && h[0].content.includes(PARENT + '/chat-copy') && !h[0].content.includes(OLD_DIR + ' ') && !h[0].content.endsWith(OLD_DIR), h[0].content);
    check('fresh: the prompt tells the AI the files are the app as it stands', /continues from an earlier conversation/.test(h[0].content), h[0].content);
    check('fresh: the project\'s settings on the prompt are kept', h[0].buildModel === 'claude-opus-5-5', JSON.stringify(h[0]));
    check('fresh: the copy has its own backend and files', r.copyCallsOriginal === false && r.deployedNames.length === 2, JSON.stringify(r.deployedNames));
    check('fresh: the copy is hosted on its own draft', r.hosted.join() === 'copy-draft', JSON.stringify(r.hosted));
    check('fresh: no follow-up chips from the old conversation', Array.isArray(r.copyChat.suggestions) && r.copyChat.suggestions.length === 0);
    check('fresh: not interrupted, not published', r.copyChat.interrupted === false && r.copyChat.publishedUrl === null);
    check('fresh: no error shown', r.alerts.length === 0, JSON.stringify(r.alerts));

    // The prompt as new chats store it: content blocks, the first cached.
    const b = await run({ fresh: true, systemBlocks: true });
    const bs = b.copyChat.history[0];
    check('fresh, block prompt: the note is added as a block after the existing ones',
        b.copyChat.history.length === 1 && Array.isArray(bs.content) && bs.content.length === 3
        && bs.content[0].text === 'common' && bs.content[0].cache_control && bs.content[0].cache_control.ttl === '1h'
        && bs.content[1].text === 'cwd ' + PARENT + '/chat-copy'
        && bs.content[2].type === 'text' && /continues from an earlier conversation/.test(bs.content[2].text),
        JSON.stringify(bs));

    // A published original: the copy's AI is told the address isn't its own,
    // on the prompt, so the conversation doesn't open on an assistant note.
    const p = await run({ fresh: true, published: true });
    const ph = p.copyChat.history;
    check('fresh, published source: still only the system prompt', ph.length === 1 && ph[0].role === 'system', JSON.stringify(ph));
    check('fresh, published source: the prompt names the original\'s address as not the copy\'s',
        /copy isn't published/.test(ph[0].content) && ph[0].content.includes('https://notes.puter.site/'), ph[0].content);
    check('fresh, published source: the copy starts unpublished', p.copyChat.publishedUrl === null);
    check('fresh, published source: the original is untouched', p.sourceUnchanged === true);

    // The open project (live history ahead of disk): read, never changed.
    const o = await run({ fresh: true, published: true, openUnsaved: true });
    check('fresh, open project: the live history is untouched and the copy has only the prompt',
        o.sourceUnchanged === true && o.copyChat.history.length === 1, JSON.stringify(o.copyChat && o.copyChat.history));

    // No system prompt: the AI wouldn't know where the files are. No copy.
    const n = await run({ fresh: true, noSystem: true });
    check('fresh, no prompt: no copy is made or listed', n.listed === false && n.chatFileWritten === false && n.returned === undefined);
    check('fresh, no prompt: nothing was copied or hosted', n.copyFilesLeft === 0 && n.hosted.length === 0
        && n.deployedNames.join() === 'original-api', JSON.stringify({ files: n.copyFilesLeft, hosted: n.hosted, workers: n.deployedNames }));
    check('fresh, no prompt: the user is told', n.alerts.length === 1 && /Could not duplicate/.test(n.alerts[0]), JSON.stringify(n.alerts));
    check('fresh, no prompt: the original is untouched', n.sourceUnchanged === true);

    // A failure after the copy was half made still takes it all back.
    const f = await run({ fresh: true, failAt: 'chat-write' });
    check('fresh, save failure: nothing is left behind', !f.listed && f.copyFilesLeft === 0 && f.hosted.length === 0
        && f.deployedNames.join() === 'original-api' && f.returned === undefined, JSON.stringify({ files: f.copyFilesLeft, hosted: f.hosted, workers: f.deployedNames }));
}

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all duplicate-worker-isolation checks passed');
