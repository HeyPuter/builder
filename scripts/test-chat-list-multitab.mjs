import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Separate JS globals and local file locks per tab, one cloud filesystem and
// browser lock manager. Exercise the real persistence and navigation functions.
const app = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const helpers = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
function extract(source, signature) {
    const start = source.indexOf(signature);
    assert.ok(start >= 0, signature);
    const end = source.indexOf('\n}\n', start);
    assert.ok(end > start, signature);
    return source.slice(start, end + 2);
}
const persistence = app.slice(Math.min(app.indexOf("const CHAT_LIST_PATH = 'chat-history/chat-list.json';"),
    app.indexOf('async function loadSavedChats(')),
    app.indexOf('// Every writer of a chat\'s file'));
const code = [
    helpers.slice(helpers.indexOf('const _fileLocks = new Map()'), helpers.indexOf('// Write `data` to `path` and CONFIRM')),
    extract(app, 'function isNotFoundError(error) {'), persistence,
    'let _loadChatSeq = 0, _loadChatSettledSeq = 0;',
    extract(app, 'async function loadChat('),
    extract(app, 'function readUrlChatId() {'),
    extract(app, 'async function initAuthenticatedState() {'),
    app.slice(app.indexOf("window.addEventListener('popstate',"), app.indexOf('// Keep the browser tab/title')),
].join('\n');
const INDEX = 'chat-history/chat-list.json';
const pathFor = id => `chat-history/${id}.json`;
const record = (id, fields = {}) => ({ id, title: id, history: [], pinned: false, ...fields });
const missing = () => Object.assign(new Error('Not found'), { code: 'subject_does_not_exist' });
const tick = async () => { for (let i = 0; i < 8; i++) await new Promise(setImmediate); };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

function environment(initial = []) {
    const disk = new Map([[INDEX, JSON.stringify(initial)]]);
    for (const entry of initial) disk.set(pathFor(entry.id), JSON.stringify(record(entry.id, entry)));
    const queues = new Map();
    const requests = [];
    const locks = {
        request(name, fn) {
            requests.push(name);
            const run = (queues.get(name) || Promise.resolve()).then(fn);
            queues.set(name, run.catch(() => {}));
            return run;
        },
    };
    const io = { reads: [], writes: [], readHook: null, writeHook: null, scanError: null };
    const cloud = {
        async read(path) {
            io.reads.push(path);
            await io.readHook?.(path);
            if (!disk.has(path)) throw missing();
            const data = disk.get(path);
            return { text: async () => data };
        },
        async write(path, data) {
            io.writes.push([path, data]);
            await io.writeHook?.(path, data);
            disk.set(path, data);
        },
        async readdir() {
            if (io.scanError) throw io.scanError;
            return [...disk.keys()].filter(p => p.startsWith('chat-history/'))
                .map(p => ({ name: p.slice('chat-history/'.length), is_dir: false }));
        },
    };
    function tab({ browserLocks = locks, username = 'alice', appID = 'builder' } = {}) {
        const events = {}, toasts = [], urls = [];
        const chain = new Proxy(() => {}, { get: () => () => chain, apply: () => chain });
        const context = vm.createContext({
            savedChats: [], chatListLoaded: false, _deletedChatIds: new Set(),
            currentChatId: 'current', chatHistory: [], isProcessing: false,
            navigator: browserLocks ? { locks: browserLocks } : {}, URLSearchParams,
            console: { warn() {}, error() {} },
            puter: { fs: cloud, appID },
            window: {
                user: { username }, location: { search: '', hash: '' },
                showToast: message => toasts.push(message),
                addEventListener: (name, handler) => { events[name] = handler; },
                system_prompt_common: () => '', system_prompt_dynamic: () => '',
            },
            $: () => chain, updateChatHistorySidebar() {}, updateDocumentTitle() {},
            generateChatTitle: () => 'Untitled', ensureChatHistoryFolder: async () => {},
            aborts: 0, terminateActiveTurn() { context.aborts++; }, resetChatUIForSwitch() {},
            hideAppPreview() {}, restoreComposerDraft() {}, scrollChatToBottom() {},
            setUrlChat: (id, options) => urls.push([id, options]),
            confirmLeaveActiveChat: async () => true,
        });
        vm.runInContext(code, context);
        return Object.assign(context, { events, toasts, urls });
    }
    function add(t, id) {
        disk.set(pathFor(id), JSON.stringify(record(id)));
        t.savedChats.unshift({ id, title: id, pinned: false });
    }
    const ids = () => JSON.parse(disk.get(INDEX)).map(c => c.id).sort();
    return { disk, io, requests, tab, add, ids };
}

// Overlapping tabs must both persist, including a tab queued behind a slow
// cloud write. Merely locking without re-reading/merging still loses A here.
{
    const e = environment([{ id: 'existing', title: 'Original', pinned: false }]);
    const a = e.tab(), b = e.tab(), c = e.tab();
    await Promise.all([a.loadSavedChats(), b.loadSavedChats(), c.loadSavedChats()]);
    e.add(a, 'A'); e.add(b, 'B'); e.add(c, 'C');
    const gate = deferred();
    let writes = 0;
    e.io.writeHook = async () => { if (++writes === 1) await gate.promise; };
    const first = a.saveChatList();
    await tick();
    const rest = [b.saveChatList(), c.saveChatList()];
    await tick();
    assert.equal(writes, 1, 'other tabs cannot write while A holds the browser lock');
    gate.resolve();
    await Promise.all([first, ...rest]);
    assert.deepEqual(e.ids(), ['A', 'B', 'C', 'existing']);
    assert.equal(new Set(e.requests).size, 1, 'all tabs use the same lock');
    const reopened = e.tab();
    await reopened.loadSavedChats();
    assert.deepEqual(Array.from(reopened.savedChats, c => c.id).sort(), e.ids());
    console.log('ok - concurrent tabs preserve all projects across reload');
}

// A stale tab changing one project must not revert other projects' metadata,
// and even edits to different fields of the same entry must be merged.
{
    const e = environment([{ id: 'shared', title: 'Old', pinned: false }]);
    const a = e.tab(), b = e.tab();
    await Promise.all([a.loadSavedChats(), b.loadSavedChats()]);
    a.savedChats[0].title = 'Renamed';
    a.savedChats[0].customTitle = true;
    await a.saveChatList();
    b.savedChats[0].pinned = true;
    e.add(b, 'B');
    await b.saveChatList();
    const entry = JSON.parse(e.disk.get(INDEX)).find(c => c.id === 'shared');
    assert.equal(entry.title, 'Renamed'); assert.equal(entry.customTitle, true); assert.equal(entry.pinned, true);
    // B deletes shared; A still has its old entry but saves a different project.
    b.savedChats = b.savedChats.filter(c => c.id !== 'shared');
    e.disk.delete(pathFor('shared'));
    await b.saveChatList();
    e.add(a, 'A');
    await a.saveChatList();
    assert.deepEqual(e.ids(), ['A', 'B']);
    assert.ok(!a.savedChats.some(c => c.id === 'shared'));
    console.log('ok - stale tabs preserve remote metadata and deletions');
}

// Updates made in the same tab during the network write need another save,
// while newly discovered remote entries must remain in that tab's memory.
{
    const e = environment([{ id: 'shared', title: 'Old', pinned: false }]);
    const a = e.tab(), b = e.tab();
    await Promise.all([a.loadSavedChats(), b.loadSavedChats()]);
    e.add(b, 'B'); await b.saveChatList();
    a.savedChats[0].title = 'First';
    const gate = deferred(); let once = true;
    e.io.writeHook = async () => { if (once) { once = false; await gate.promise; } };
    const first = a.saveChatList(); await tick();
    a.savedChats.find(c => c.id === 'shared').title = 'Newest';
    const second = a.saveChatList(); gate.resolve();
    await Promise.all([first, second]);
    assert.deepEqual(e.ids(), ['B', 'shared']);
    assert.equal(JSON.parse(e.disk.get(INDEX)).find(c => c.id === 'shared').title, 'Newest');
    assert.ok(a.savedChats.some(c => c.id === 'B'));
    console.log('ok - edits during a save are rebased without dropping remote projects');
}

// Recovery must work for VALID stale JSON, missing JSON, and corrupt JSON.
for (const initialIndex of ['[]', null, '{broken']) {
    const e = environment();
    if (initialIndex === null) e.disk.delete(INDEX); else e.disk.set(INDEX, initialIndex);
    e.disk.set(pathFor('orphan'), JSON.stringify(record('orphan', {
        publishedUrl: 'https://example.puter.site/', pinned: true, customTitle: true,
    })));
    e.disk.set(pathFor('unreadable'), '{broken');
    const t = e.tab(); await t.loadSavedChats();
    assert.deepEqual(e.ids(), ['orphan']);
    assert.equal(t.savedChats[0].publishedUrl, 'https://example.puter.site/');
    assert.equal(t.savedChats[0].pinned, true);
    assert.equal(t.savedChats[0].customTitle, true);
}
console.log('ok - missing projects are recovered from valid, missing, and corrupt indexes');

// Recovery scans filenames, but does not re-download already indexed histories.
{
    const e = environment([{ id: 'existing', title: 'Existing' }]);
    await e.tab().loadSavedChats();
    assert.deepEqual(e.io.reads, [INDEX]);
    assert.equal(e.io.writes.length, 0);
    console.log('ok - ordinary boot reads no indexed conversation files and does not rewrite the list');
}

// Failed reads are not an empty list; failed writes/lock requests must not
// poison subsequent saves or mark local changes as persisted.
{
    const e = environment([{ id: 'existing', title: 'Existing' }]);
    const t = e.tab(); await t.loadSavedChats(); e.add(t, 'A');
    e.io.readHook = async p => { if (p === INDEX) throw new Error('offline'); };
    await t.saveChatList();
    assert.deepEqual(e.ids(), ['existing']); assert.equal(e.io.writes.length, 0);
    assert.ok(t.toasts.length);
    e.io.readHook = null;
    e.io.writeHook = async () => { throw new Error('offline'); };
    await t.saveChatList(); assert.deepEqual(e.ids(), ['existing']);
    e.io.writeHook = null;
    await t.saveChatList(); assert.deepEqual(e.ids(), ['A', 'existing']);
    const t2 = e.tab({ browserLocks: { request: async () => { throw new Error('unavailable'); } } });
    await t2.loadSavedChats(); e.add(t2, 'B'); await t2.saveChatList();
    assert.deepEqual(e.ids(), ['A', 'existing']);
    t2.navigator.locks = t.navigator.locks;
    await t2.saveChatList(); assert.deepEqual(e.ids(), ['A', 'B', 'existing']);
    console.log('ok - failed reads, writes, and lock requests preserve changes for retry');
}

// If neither the list nor the directory is readable at boot, later saves can
// retry initialization without recursion/deadlock and preserve unsaved entries.
{
    const e = environment([{ id: 'existing', title: 'Existing' }]);
    e.io.readHook = async p => { if (p === INDEX) throw new Error('offline'); };
    e.io.scanError = new Error('offline');
    const t = e.tab(); await t.loadSavedChats(); e.add(t, 'A');
    await t.saveChatList(); assert.equal(e.io.writes.length, 0);
    assert.ok(t.savedChats.some(c => c.id === 'A'));
    e.io.readHook = null; e.io.scanError = null;
    await t.saveChatList(); assert.deepEqual(e.ids(), ['A', 'existing']);
    console.log('ok - offline boot retries safely when storage returns');
}

// Web Locks are optional in older/embedded browsers. Save still works there,
// and the next boot recovers any lost index entries from independent files.
{
    const e = environment(); const t = e.tab({ browserLocks: null });
    await t.loadSavedChats(); e.add(t, 'A'); await t.saveChatList();
    assert.deepEqual(e.ids(), ['A']);
    const otherUser = e.tab({ username: 'bob' });
    await otherUser.loadSavedChats(); await otherUser.saveChatList();
    const otherApp = e.tab({ appID: 'other-app' });
    await otherApp.loadSavedChats(); await otherApp.saveChatList();
    assert.equal(new Set(e.requests).size, 2, 'lock identity includes account and app');
    console.log('ok - fallback saves and account/app lock scoping');
}

// A direct link does not depend on either the index or a successful directory
// scan. Drive actual authenticated boot + loadChat, then Back/Forward.
for (const location of [{ search: '?p=orphan', hash: '' }, { search: '', hash: '#orphan' }]) {
    const e = environment();
    e.disk.set(pathFor('orphan'), JSON.stringify(record('orphan')));
    e.io.scanError = new Error('directory unavailable');
    const t = e.tab(); t.window.location = location;
    await t.initAuthenticatedState();
    assert.equal(t.currentChatId, 'orphan'); assert.deepEqual(e.ids(), ['orphan']);
    assert.equal(t.urls[0][1].replace, true);
    e.disk.set(pathFor('another'), JSON.stringify(record('another')));
    t.window.location = { search: '?p=another', hash: '' };
    await t.events.popstate();
    assert.equal(t.currentChatId, 'another'); assert.deepEqual(e.ids(), ['another', 'orphan']);
}
console.log('ok - query/hash links and Back/Forward open unindexed project files');

// Even when all list reads fail, an accessible project link can still open.
{
    const e = environment(); e.disk.set(pathFor('orphan'), JSON.stringify(record('orphan')));
    e.io.readHook = async p => { if (p === INDEX) throw new Error('index unavailable'); };
    e.io.scanError = new Error('directory unavailable');
    const t = e.tab(); t.window.location.search = '?p=orphan';
    await t.initAuthenticatedState();
    assert.equal(t.currentChatId, 'orphan');
    assert.equal(e.io.writes.length, 0, 'opening a file does not justify overwriting an unreadable index');
    console.log('ok - direct project loading survives an unavailable index and directory');
}

// Recovery introduces an await before a switch. A slower link must not take
// over after the user has selected another project during that await.
{
    const e = environment(); const t = e.tab(); await t.loadSavedChats();
    e.disk.set(pathFor('A'), JSON.stringify(record('A')));
    e.disk.set(pathFor('B'), JSON.stringify(record('B')));
    const gate = deferred(); let once = true;
    e.io.writeHook = async () => { if (once) { once = false; await gate.promise; } };
    const first = t.loadChat('A'); await tick();
    const second = t.loadChat('B'); await tick();
    gate.resolve(); await Promise.all([first, second]);
    assert.equal(t.currentChatId, 'B'); assert.equal(t.aborts, 1);
    assert.deepEqual(Array.from(t.urls, u => u[0]), ['B']);
    console.log('ok - a slow link recovery cannot supersede newer navigation');
}

// Invalid paths/files and nonexistent projects leave the current turn alone.
{
    const e = environment(); const t = e.tab(); await t.loadSavedChats();
    for (const id of ['../elsewhere', 'bad/id', '..', 'missing']) {
        await assert.rejects(t.loadChat(id));
    }
    e.disk.set(pathFor('mismatch'), JSON.stringify(record('different')));
    e.disk.set(pathFor('invalid'), JSON.stringify({ id: 'invalid' }));
    await assert.rejects(t.loadChat('mismatch'));
    await assert.rejects(t.loadChat('invalid'));
    assert.equal(t.aborts, 0); assert.equal(t.currentChatId, 'current');
    assert.ok(!e.io.reads.some(p => p.includes('..') || p.includes('bad/id')));
    assert.equal(t.toasts.length, 6);
    console.log('ok - invalid or missing links do not read arbitrary paths or stop the active turn');
}

console.log('All multi-tab project persistence checks passed.');
