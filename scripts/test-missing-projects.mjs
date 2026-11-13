import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: a project on disk is never lost from the sidebar ------
// The sidebar lists what chat-history/chat-list.json names; a project is its
// chat file (chat-history/<id>.json) plus its app directory. Three ways a
// project's entry was lost while its files stayed intact, and the explicit way
// back for the ones already lost:
//
//   1. A rebuild from the chat files skipped any file it could not read at that
//      moment, then saved the result. The list was valid from then on, so it
//      was never rebuilt again.
//   2. A save whose read of the list FAILED wrote this tab's list over it,
//      whatever it held.
//   3. A project created while a list write was in flight was recorded as
//      synced, and the next save took it for one deleted in another tab.
//      (Covered by test-chat-list-save-race.mjs, whose fake disk can be read.)
//   4. Settings → Projects (findMissingProjects / restoreMissingProjects) puts
//      back entries for chat files nothing lists. It must only ever add list
//      entries: every chat file byte-identical afterwards, every entry that was
//      listed still listed, a confirmed copy of the old list kept.
//
// Runs the real chat-list code from app.js in a VM over a fake puter.fs.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const app = read('../src/js/app.js');
const helpers = read('../src/js/helpers.js');
const mcpUi = read('../src/js/mcp-ui.js');
const LOCK = helpers.slice(helpers.indexOf('const _fileLocks = new Map()'), helpers.indexOf('// Wait for the writes currently in flight'));
const start = app.indexOf('let savedChats = [];');
const end = app.indexOf('// Merge just the public-site (Publish) fields');
if (start < 0 || end < 0 || !LOCK) throw new Error('could not extract the chat-list code');
const CODE = LOCK + '\n' + app.slice(start, end) + `
globalThis.__list = () => savedChats;
globalThis.__setList = (l) => { savedChats = l; };
globalThis.__setCurrent = (id) => { currentChatId = id; };
globalThis.__loaded = () => chatListLoaded;
globalThis.__adopt = (id, chat) => adoptChatFileIntoEntry(id, chat);
globalThis.__verify = (id) => verifyChatListEntry(id);
globalThis.__verifyAll = () => verifyChatListEntries();
globalThis.__merge = (a, b, c, d) => mergeChatLists(a, b, c, d);
`;

const LIST = 'chat-history/chat-list.json';
const fileOf = (id) => `chat-history/${id}.json`;

// A fake disk. `failRead(path, n)` makes the next n reads of a path fail the
// way a dropped request does (Infinity: until cleared); `failWrite` likewise.
function world() {
    const disk = new Map();
    const readFailures = new Map();
    const writeFailures = new Map();
    const writes = [];
    const clock = { waited: 0, reads: 0 };
    const nf = (p) => Object.assign(new Error('not found ' + p), { code: 'subject_does_not_exist' });
    const take = (map, p) => {
        const left = map.get(p) || 0;
        if (left <= 0) return false;
        map.set(p, left - 1);
        return true;
    };
    const puterFs = {
        read: async (p) => {
            await null;
            clock.reads++;
            if (take(readFailures, p) || (readFailures.get('*') && p !== LIST)) throw new Error('network error');
            if (!disk.has(p)) throw nf(p);
            const d = disk.get(p);
            return { text: async () => d };
        },
        write: async (p, d) => {
            await null;
            if (clock.hold && p === LIST) await clock.hold; // a slow list write
            if (take(writeFailures, p) || take(writeFailures, '*')) throw new Error('network error');
            writes.push(p);
            disk.set(p, d);
        },
        stat: async () => ({}), mkdir: async () => {},
        // Only the direct children, directories included, as Puter lists them.
        readdir: async (p) => {
            if (take(readFailures, 'readdir')) throw new Error('network error');
            const names = new Map();
            for (const k of disk.keys()) {
                if (!k.startsWith(p + '/')) continue;
                const rest = k.slice(p.length + 1);
                const slash = rest.indexOf('/');
                if (slash < 0) names.set(rest, { name: rest, is_dir: false, modified: 1767225600 });
                else names.set(rest.slice(0, slash), { name: rest.slice(0, slash), is_dir: true });
            }
            return [...names.values()];
        },
        delete: async (p) => { disk.delete(p); },
    };
    function tab() {
        const deleted = new Set();
        const toasts = [];
        const sb = {
            window: { showToast: (m) => toasts.push(m), currentPreviewUrl: null }, puter: { fs: puterFs },
            console: { log() {}, warn() {}, error() {} },
            // Retries wait on a timer; the test doesn't, but adds the waits up.
            setTimeout: (fn, ms) => { clock.waited += ms || 0; setImmediate(fn); },
            generateChatId: () => 'boot', generateChatTitle: (h) => 'title:' + ((h.find((m) => m.role === 'user') || {}).content || ''),
            _deletedChatIds: deleted, _aiProjectTitles: new Map(), _suggestionsByChat: new Map(),
            setUrlChat() {}, updateChatHistorySidebar() {}, updateDocumentTitle() {},
        };
        vm.createContext(sb);
        vm.runInContext(CODE, sb);
        sb.deleted = deleted;
        sb.toasts = toasts;
        return sb;
    }
    const list = () => JSON.parse(disk.get(LIST));
    return {
        disk, tab, list, writes, clock,
        failRead: (p, n = 1) => readFailures.set(p, n),
        failWrite: (p, n = 1) => writeFailures.set(p, n),
    };
}
const ids = (l) => l.map((c) => c.id).sort().join(',');
const order = (l) => l.map((c) => c.id).join(',');
const chatFile = (id, extra) => JSON.stringify(Object.assign({
    id, title: 'Title ' + id, history: [{ role: 'user', content: id }], lastModified: '2026-01-0' + (id.charCodeAt(id.length - 1) % 9 + 1),
}, extra));
const entryOf = (id, extra) => Object.assign({ id, title: 'Title ' + id, customTitle: false, aiTitled: false, pinned: false }, extra);
const seed = (w, listIds, fileIds) => {
    if (listIds) w.disk.set(LIST, JSON.stringify(listIds.map((id) => entryOf(id))));
    for (const id of fileIds || listIds || []) w.disk.set(fileOf(id), chatFile(id));
};
// Every chat file, to compare byte for byte.
const chatFiles = (w) => JSON.stringify([...w.disk].filter(([k]) => k !== LIST && !k.includes('/list-backups/')).sort());
const settle = async () => { for (let i = 0; i < 20; i++) await new Promise(setImmediate); };

// ============ 1. A rebuild keeps a project whose file it can't read ============
{
    const w = world();
    seed(w, null, ['A', 'B', 'C']);        // no list: boot rebuilds it from the files
    w.failRead(fileOf('B'), Infinity);     // B can't be read during the rebuild
    const before = chatFiles(w);
    const T = w.tab();
    await T.loadSavedChats();
    check('rebuild: a file that could not be read is still listed', ids(T.__list()) === 'A,B,C', ids(T.__list()));
    const b = T.__list().find((c) => c.id === 'B');
    check('rebuild: …as an unverified entry', b && b.unverified === true && b.title === 'Untitled project', JSON.stringify(b));
    check('rebuild: …dated from the file, not blank', !!b && b.lastModified === '2026-01-01T00:00:00.000Z', b && b.lastModified);
    check('rebuild: the saved list has it too', ids(w.list()) === 'A,B,C', w.disk.get(LIST));
    check('rebuild: the readable ones are complete entries', T.__list().filter((c) => !c.unverified).every((c) => c.title.startsWith('Title ')));
    check('rebuild: no chat file was written', chatFiles(w) === before);

    // The file can be read again: the next load completes the entry.
    w.failRead(fileOf('B'), 0);
    const T2 = w.tab();
    await T2.loadSavedChats();
    await settle();
    const b2 = w.list().find((c) => c.id === 'B');
    check('next load: the entry is completed from the file', b2 && !b2.unverified && b2.title === 'Title B', JSON.stringify(b2));
    check('next load: still no chat file written', chatFiles(w) === before);
}
{
    // One dropped request is retried, not treated as an unreadable project.
    const w = world();
    seed(w, null, ['A', 'B']);
    w.failRead(fileOf('B'), 2);
    const T = w.tab();
    await T.loadSavedChats();
    const b = T.__list().find((c) => c.id === 'B');
    check('rebuild: a read that fails twice then works gives a complete entry', b && !b.unverified && b.title === 'Title B', JSON.stringify(b));
}
{
    // A dropped read of a healthy list no longer sends boot down the rebuild.
    const w = world();
    seed(w, ['A', 'B']);
    w.disk.set(LIST, JSON.stringify([entryOf('B', { title: 'Renamed', customTitle: true }), entryOf('A')]));
    w.failRead(LIST, 2);
    const T = w.tab();
    await T.loadSavedChats();
    check('load: the list read is retried', order(T.__list()) === 'B,A' && T.__list()[0].title === 'Renamed', JSON.stringify(T.__list()));
}
{
    // A file that is valid JSON but not a saved chat is not a project; a file
    // gone since the listing is not one either; a directory is skipped.
    const w = world();
    seed(w, null, ['A']);
    w.disk.set('chat-history/notes.json', JSON.stringify({ hello: 1 }));
    w.disk.set('chat-history/list-backups/chat-list-old.json', JSON.stringify([entryOf('GONE')]));
    w.disk.set('chat-history/odd.json/inner.json', chatFile('odd'));
    const T = w.tab();
    await T.loadSavedChats();
    check('rebuild: only real chat files are listed (no stray JSON, backups or directories)', ids(T.__list()) === 'A', ids(T.__list()));
}
{
    // A truncated file can't be told from a response cut short: keep it listed.
    const w = world();
    seed(w, null, ['A', 'B']);
    w.disk.set(fileOf('B'), chatFile('B').slice(0, 20));
    const T = w.tab();
    await T.loadSavedChats();
    check('rebuild: a file that does not parse is listed, unverified', T.__list().find((c) => c.id === 'B')?.unverified === true, JSON.stringify(T.__list()));
    check('verify: …and reported corrupt, the entry left as it is', await T.__verify('B') === 'corrupt' && T.__list().find((c) => c.id === 'B').unverified === true);
}

// ---- reads failing across the board: don't retry every file -------------------
{
    // Offline or throttled, each retried file costs a second and two more
    // requests. Over hundreds of chat files that held boot for minutes.
    const w = world();
    const all = Array.from({ length: 60 }, (_, i) => 'P' + String(i).padStart(2, '0'));
    seed(w, null, all);
    w.failRead('*', Infinity);             // every chat file read fails
    const T = w.tab();
    await T.loadSavedChats();
    check('rebuild, every read failing: every project is still listed', T.__list().length === 60 && T.__list().every((c) => c.unverified), String(T.__list().length));
    check('rebuild, every read failing: the retries stop after the first files', w.clock.waited <= 2000, w.clock.waited + ' ms waited');
    check('rebuild, every read failing: about one request per file, not three', w.clock.reads <= 60 + 8, w.clock.reads + ' reads');

    // The next load completes entries in the background; while reads still
    // fail it stops at the first, and tries again at the load after.
    const T2 = w.tab();
    w.clock.waited = 0; w.clock.reads = 0;
    await T2.loadSavedChats();
    await settle(); await settle();
    check('completion, reads still failing: gives up after the first entry', w.clock.waited <= 1000 && w.clock.reads <= 6, w.clock.waited + ' ms, ' + w.clock.reads + ' reads');
    w.failRead('*', 0);
    await T2.__verifyAll();
    check('completion, reads working again: every entry is completed', w.list().length === 60 && w.list().every((c) => !c.unverified && c.title.startsWith('Title ')));
}
{
    // A file that doesn't parse isn't a failing connection: retries go on.
    const w = world();
    seed(w, null, ['A', 'B', 'C', 'D', 'E']);
    for (const id of ['A', 'B', 'C']) w.disk.set(fileOf(id), '{"id":');
    w.failRead(fileOf('E'), 2);            // dropped twice, then fine
    const T = w.tab();
    await T.loadSavedChats();
    const e = T.__list().find((c) => c.id === 'E');
    check('rebuild: corrupt files don\'t use up the retries a dropped request needs', e && !e.unverified, JSON.stringify(e));
}

// ---- completing an unverified entry -----------------------------------------
{
    const w = world();
    seed(w, null, ['A', 'B']);
    w.disk.set(fileOf('B'), chatFile('B', { customTitle: true, title: 'Mine', pinned: true, publishedUrl: 'https://b.puter.site/' }));
    w.failRead(fileOf('B'), Infinity);
    const T = w.tab();
    await T.loadSavedChats();
    check('verify: unreadable while the file can\'t be read, entry untouched',
        await T.__verify('B') === 'unreadable' && T.__list().find((c) => c.id === 'B').unverified === true);
    w.failRead(fileOf('B'), 0);
    check('verify: verified once it can', await T.__verify('B') === 'verified');
    const b = T.__list().find((c) => c.id === 'B');
    check('verify: the entry carries the file\'s title, pin and published address',
        !b.unverified && b.title === 'Mine' && b.customTitle === true && b.pinned === true && b.publishedUrl === 'https://b.puter.site/', JSON.stringify(b));
    check('verify: an entry that is already complete is left alone', await T.__verify('A') === 'verified');
}
{
    // What opening the project does (loadChat → adoptChatFileIntoEntry).
    const w = world();
    seed(w, null, ['A', 'B']);
    w.failRead(fileOf('B'), Infinity);
    const T = w.tab();
    await T.loadSavedChats();
    // The user renamed and pinned the stand-in entry meanwhile.
    const b = T.__list().find((c) => c.id === 'B');
    b.title = 'My name'; b.customTitle = true; b.pinned = true;
    const changed = T.__adopt('B', JSON.parse(chatFile('B', { previewUrl: 'https://p.puter.site/' })));
    const after = T.__list().find((c) => c.id === 'B');
    check('adopt: completes the entry and keeps a rename and pin made on the stand-in',
        changed === true && !after.unverified && after.title === 'My name' && after.customTitle === true && after.pinned === true
        && after.previewUrl === 'https://p.puter.site/', JSON.stringify(after));
    check('adopt: a complete entry is never replaced', T.__adopt('A', JSON.parse(chatFile('A', { title: 'Other' }))) === false
        && T.__list().find((c) => c.id === 'A').title === 'Title A');
    check('adopt: a file for another project is refused', T.__adopt('A', JSON.parse(chatFile('B'))) === false);
    check('adopt: position in the list is kept', order(T.__list()) === order(w.list()), order(T.__list()));
}
{
    // A stand-in entry never replaces the complete one already on disk.
    const w = world();
    const T = w.tab();
    const mine = [Object.assign(entryOf('B'), { title: 'Untitled project', unverified: true }), entryOf('A')];
    const disk = [entryOf('A'), entryOf('B', { title: 'Real', pinned: true })];
    const merged = T.__merge(mine, disk, new Map(), new Set());
    const b = merged.find((c) => c.id === 'B');
    check('merge: the complete entry on disk wins over a stand-in', b.title === 'Real' && !b.unverified && merged.length === 2, JSON.stringify(merged));
}

{
    // Boot could read neither the list nor the directory, so the list loads at
    // the first save instead. A project made meanwhile is in memory, complete;
    // if that late rebuild can't read its file, the stand-in must not replace
    // the entry this session already has (a save would take the stand-in's
    // title and pin for the project's own).
    const w = world();
    seed(w, null, ['A']);
    w.failRead(LIST, Infinity);
    w.failRead('readdir', 1);
    const T = w.tab();
    await T.loadSavedChats();
    check('late load: boot left the list unloaded', T.__loaded() === false);
    w.failRead(fileOf('N'), Infinity);
    T.__setCurrent('N');
    await T.saveCurrentChat({ currentChatId: 'N', chatHistory: [{ role: 'user', content: 'N' }, { role: 'assistant', content: 'x' }], interrupted: true });
    const n = T.__list().find((c) => c.id === 'N');
    check('late load: the list is loaded by the save', T.__loaded() === true && ids(T.__list()) === 'A,N', ids(T.__list()));
    check('late load: the project made this session keeps its own entry', !!n && !n.unverified && n.title === 'title:N', JSON.stringify(n));
}

// ============ 2. A save never writes over a list it couldn't read ==============
{
    const w = world();
    seed(w, ['A', 'B']);
    const T = w.tab();
    await T.loadSavedChats();
    // Another tab adds a project; this tab's read of the list then fails.
    w.disk.set(fileOf('N'), chatFile('N'));
    w.disk.set(LIST, JSON.stringify([entryOf('N'), entryOf('A'), entryOf('B')]));
    const onDisk = w.disk.get(LIST);
    T.__list().find((c) => c.id === 'A').pinned = true; // this tab's own change
    w.failRead(LIST, Infinity);
    await T.saveChatList();
    check('save: the list is not written while it can\'t be read', w.disk.get(LIST) === onDisk, w.disk.get(LIST));
    check('save: …the user is told', T.toasts.length === 1, JSON.stringify(T.toasts));
    check('save: …and this tab keeps its change in memory', T.__list().find((c) => c.id === 'A').pinned === true);
    // The read works again: the next save merges, losing neither side.
    w.failRead(LIST, 0);
    await T.saveChatList();
    check('save: the next save keeps the other tab\'s project and this tab\'s change',
        ids(w.list()) === 'A,B,N' && w.list().find((c) => c.id === 'A').pinned === true, w.disk.get(LIST));
}
{
    const w = world();
    seed(w, ['A', 'B']);
    const T = w.tab();
    await T.loadSavedChats();
    w.failRead(LIST, 2);                   // two dropped requests, then fine
    T.__list().find((c) => c.id === 'A').pinned = true;
    await T.saveChatList();
    check('save: a read that fails twice then works still saves', w.list().find((c) => c.id === 'A').pinned === true && T.toasts.length === 0);
}
{
    const w = world();
    seed(w, ['A', 'B']);
    const T = w.tab();
    await T.loadSavedChats();
    w.disk.delete(LIST);                   // the list is gone: nothing to protect
    await T.saveChatList();
    check('save: a missing list is written, as before', ids(w.list()) === 'A,B');
    w.disk.set(LIST, '[{"id":"A"');        // corrupt: this tab's list replaces it
    await T.saveChatList();
    check('save: a corrupt list is replaced, as before', ids(w.list()) === 'A,B');
}
{
    // The whole of gap 1 + 2 together: the list read fails at boot, one chat
    // file can't be read during the rebuild, and the list read fails again at
    // the save. The intact list on disk must survive.
    const w = world();
    seed(w, ['A', 'B', 'C']);
    const onDisk = w.disk.get(LIST);
    w.failRead(LIST, Infinity);
    w.failRead(fileOf('B'), Infinity);
    const T = w.tab();
    await T.loadSavedChats();
    check('flaky boot: every project is shown', ids(T.__list()) === 'A,B,C', ids(T.__list()));
    check('flaky boot: the intact list on disk is not overwritten', w.disk.get(LIST) === onDisk);
    w.failRead(LIST, 0); w.failRead(fileOf('B'), 0);
    await T.saveChatList();
    const b = w.list().find((c) => c.id === 'B');
    check('flaky boot: once readable, the saved list has all three, B complete', ids(w.list()) === 'A,B,C' && b && !b.unverified, w.disk.get(LIST));
}

// ============ 3. Changes made while a list write is in flight ==================
{
    const w = world();
    seed(w, ['A', 'B']);
    const T = w.tab();
    await T.loadSavedChats();
    let release;
    w.clock.hold = new Promise((r) => { release = r; });
    T.__list().find((c) => c.id === 'A').pinned = true;
    const first = T.saveChatList();        // in flight until released
    await settle();
    // Meanwhile: a rename, and a new project.
    const b = T.__list().find((c) => c.id === 'B'); b.title = 'Renamed'; b.customTitle = true;
    T.__list().unshift(entryOf('N'));
    const second = T.saveChatList();
    await settle();
    w.clock.hold = null; release();
    await Promise.all([first, second]);
    await settle();
    check('in flight: a project created during the write is kept by the next save', ids(w.list()) === 'A,B,N' && ids(T.__list()) === 'A,B,N', w.disk.get(LIST));
    check('in flight: a rename made during the write is not reverted', w.list().find((c) => c.id === 'B').title === 'Renamed', w.disk.get(LIST));
    check('in flight: the change the first write carried is there too', w.list().find((c) => c.id === 'A').pinned === true);
}

// ============ 4. Settings → Projects: restore missing projects =================
{
    const w = world();
    seed(w, ['A', 'B'], ['A', 'B', 'LOST1', 'LOST2']);
    w.disk.set(fileOf('LOST1'), chatFile('LOST1', { lastModified: '2026-02-01', pinned: true, publishedUrl: 'https://l.puter.site/' }));
    w.disk.set(fileOf('LOST2'), chatFile('LOST2', { lastModified: '2026-03-01' }));
    w.disk.set('chat-history/notes.json', JSON.stringify({ hello: 1 }));          // not a chat
    w.disk.set('chat-history/broken.json', '{"id":"broken","hist');              // doesn't parse
    w.disk.set('chat-history/copy.json', chatFile('A'));                          // another project's id
    w.disk.set('chat-history/nohistory.json', JSON.stringify({ id: 'nohistory' })); // nothing to open
    const T = w.tab();
    await T.loadSavedChats();
    const everything = JSON.stringify([...w.disk].sort());
    const writesBefore = w.writes.length;

    const found = await T.findMissingProjects();
    check('find: the chat files nothing lists, newest first', order(found.missing) === 'LOST2,LOST1', order(found.missing));
    check('find: files that are not an openable project are reported, not offered',
        [...found.unreadable].sort().join() === 'broken.json,copy.json,nohistory.json,notes.json', found.unreadable.join());
    check('find: entries carry what the file knows', found.missing[1].pinned === true && found.missing[1].publishedUrl === 'https://l.puter.site/'
        && found.missing[1].title === 'Title LOST1');
    check('find: changes nothing on disk', JSON.stringify([...w.disk].sort()) === everything && w.writes.length === writesBefore);
    check('find: changes nothing in memory', order(T.__list()) === 'A,B');

    const files = chatFiles(w);
    const oldList = w.disk.get(LIST);
    const done = await T.restoreMissingProjects(['LOST1']);
    check('restore: only the project asked for', order(done.restored) === 'LOST1' && ids(w.list()) === 'A,B,LOST1', w.disk.get(LIST));
    check('restore: confirmed on disk', done.saved === true);
    check('restore: it goes first, the rest keep their order', order(w.list()) === 'LOST1,A,B', order(w.list()));
    check('restore: every entry that was listed is unchanged',
        JSON.stringify(w.list().slice(1)) === JSON.stringify(JSON.parse(oldList)));
    check('restore: every chat file is byte-identical', chatFiles(w) === files);
    check('restore: a copy of the old list was kept', !!done.backupPath && w.disk.get(done.backupPath) === oldList, String(done.backupPath));
    check('restore: only the list and its copy were written',
        w.writes.slice(writesBefore).every((p) => p === LIST || p === done.backupPath), w.writes.slice(writesBefore).join());
    check('restore: shown in this tab', order(T.__list()) === 'LOST1,A,B');

    const again = await T.restoreMissingProjects(['LOST1']);
    check('restore: asking again adds nothing', again.restored.length === 0 && order(w.list()) === 'LOST1,A,B' && again.backupPath === null);

    // The copies are never taken for projects: by a rebuild, or by another look.
    const T2 = w.tab();
    w.disk.delete(LIST);
    await T2.loadSavedChats();
    check('restore: the kept copy is not mistaken for a project by a rebuild',
        !T2.__list().some((c) => /chat-list/.test(c.id)) && T2.__list().every((c) => !c.unverified || c.id === 'broken'), ids(T2.__list()));
}
{
    // Nothing is changed when the copy of the list can't be saved.
    const w = world();
    seed(w, ['A'], ['A', 'LOST']);
    const T = w.tab();
    await T.loadSavedChats();
    const everything = JSON.stringify([...w.disk].sort());
    w.failWrite('*', 1);
    let threw = false;
    try { await T.restoreMissingProjects(['LOST']); } catch (e) { threw = true; }
    check('restore: a copy that can\'t be saved stops it', threw);
    check('restore: …with nothing changed on disk or in memory', JSON.stringify([...w.disk].sort()) === everything && order(T.__list()) === 'A');
}
{
    // Nothing is changed when the list can't be read.
    const w = world();
    seed(w, ['A'], ['A', 'LOST']);
    const T = w.tab();
    await T.loadSavedChats();
    const everything = JSON.stringify([...w.disk].sort());
    w.failRead(LIST, Infinity);
    let threwFind = false, threwRestore = false;
    try { await T.findMissingProjects(); } catch (e) { threwFind = true; }
    try { await T.restoreMissingProjects(['LOST']); } catch (e) { threwRestore = true; }
    check('restore: an unreadable list stops both the look and the restore', threwFind && threwRestore);
    check('restore: …with nothing changed', JSON.stringify([...w.disk].sort()) === everything && order(T.__list()) === 'A');
}
{
    // The list write fails after the copy: reported, nothing lost, saved later.
    const w = world();
    seed(w, ['A'], ['A', 'LOST']);
    const T = w.tab();
    await T.loadSavedChats();
    const oldList = w.disk.get(LIST);
    w.failWrite(LIST, 1);
    const done = await T.restoreMissingProjects(['LOST']);
    check('restore: a failed list write is reported as not saved', done.saved === false && done.restored.length === 1);
    check('restore: …the list on disk is as it was', w.disk.get(LIST) === oldList);
    check('restore: …and the project is shown meanwhile', order(T.__list()) === 'LOST,A');
    await T.saveChatList();
    check('restore: …and saved by the next save', order(w.list()) === 'LOST,A');
}
{
    // Never brings back a project deleted in this session, or one another tab
    // has just created (it is on disk, only not in this tab's memory yet).
    const w = world();
    seed(w, ['A'], ['A', 'DELETED', 'NEW']);
    const T = w.tab();
    await T.loadSavedChats();
    T.deleted.add('DELETED');
    w.disk.set(LIST, JSON.stringify([entryOf('NEW'), entryOf('A')]));
    const found = await T.findMissingProjects();
    check('find: a project deleted this session is not offered', !found.missing.some((c) => c.id === 'DELETED'));
    check('find: a project another tab just listed is not offered', !found.missing.some((c) => c.id === 'NEW') && found.missing.length === 0);
}
{
    // Before the list has loaded there is nothing to compare against.
    const w = world();
    seed(w, ['A'], ['A', 'LOST']);
    const T = w.tab();
    let threw = false;
    try { await T.findMissingProjects(); } catch (e) { threw = true; }
    check('find: refuses before the project list has loaded', threw && T.__loaded() === false);
}
{
    // No list at all (boot rebuilt it): nothing to copy, nothing missing.
    const w = world();
    seed(w, null, ['A', 'B']);
    const T = w.tab();
    await T.loadSavedChats();
    const found = await T.findMissingProjects();
    check('find: after a rebuild nothing is missing', found.missing.length === 0 && found.unreadable.length === 0);
}

// ============ Wiring ==========================================================
{
    const del = app.slice(app.indexOf('async function deleteChat(chatId) {'), app.indexOf('const subsToDelete = new Set();'));
    const guard = del.indexOf("if (savedChats.find(c => c.id === chatId)?.unverified) {");
    check('delete: an unverified entry is completed from its file before anything is removed',
        guard >= 0 && guard < del.indexOf('_deletedChatIds.add(chatId);') && del.includes("if (state === 'unreadable') {"));
    const load = app.slice(app.indexOf('async function loadChat(chatId'), app.indexOf('const superseded = () => {'));
    check('open: the entry is completed from the file before the project can be saved',
        /JSON\.parse\(await puter\.fs\.read\(`chat-history\/\$\{chatId\}\.json`\)[\s\S]{0,400}if \(adoptChatFileIntoEntry\(chatId, chat\)\)/.test(load));
    check('save: what is recorded as synced is the list as it was written, taken before the write is awaited',
        /const written = JSON\.stringify\(savedChats\);\s*const synced = chatListSyncedMap\(savedChats\);\s*await puter\.fs\.write\(CHAT_LIST_PATH, written\);\s*_chatListSynced = synced;/.test(app));
    const restore = app.slice(app.indexOf('async function findMissingProjects() {'), app.indexOf('window.restoreMissingProjects = restoreMissingProjects;'));
    check('restore: the code never deletes, moves or copies over anything',
        restore.length > 0 && !/puter\.fs\.(delete|move|rename|copy)\b/.test(restore) && !/puter\.(hosting|workers)\b/.test(restore));
    check('restore: its only writes are the copy of the list and saveChatList',
        (restore.match(/puter\.fs\.write\(/g) || []).length === 1 && restore.includes('await puter.fs.write(backupPath, raw,')
        && (restore.match(/saveChatList\(\)/g) || []).length === 1);

    check('Settings has a Projects tab',
        mcpUi.includes('role="tab" id="settings-tab-projects" aria-controls="settings-panel-projects" data-tab="projects">Projects</button>')
        && mcpUi.includes('role="tabpanel" id="settings-panel-projects" aria-labelledby="settings-tab-projects" data-tab="projects">'));
    check('…that openSettings can ask for', mcpUi.includes("tab === 'projects'"));
    check('…which looks only when asked, and restores only when asked again',
        mcpUi.includes("$scan.on('click'") && mcpUi.includes('await window.findMissingProjects()')
        && mcpUi.includes("$go.on('click'") && mcpUi.includes('await window.restoreMissingProjects(ids)')
        && (mcpUi.match(/restoreMissingProjects\(/g) || []).length === 1 && (mcpUi.match(/findMissingProjects\(/g) || []).length === 1);
    // Disabling the button just pressed drops keyboard focus out of the dialog.
    const panel = mcpUi.slice(mcpUi.indexOf("const $restore = $overlay.find('.settings-restore-result');"), mcpUi.indexOf("window.addEventListener('mcp-connections-changed', render);"));
    check('…whose waiting buttons are aria-disabled, never disabled, so focus stays in the dialog',
        panel.length > 0 && !/\.prop\('disabled'/.test(panel) && panel.includes(".attr('aria-disabled', 'true')"));
    check('…and focus goes back to the Look button when the results it was in are rebuilt',
        /const hadFocus = \$restore\[0\]\.contains\(document\.activeElement\);\s*\$restore\.empty\(\);\s*if \(hadFocus\) \$scan\.trigger\('focus'\);/.test(panel)
        && !/\$restore\.empty\(\);[\s\S]*\$restore\.empty\(\);/.test(panel));
    check('…and shows titles as text', mcpUi.includes(".text(chat.title || 'Untitled project')"));
    // Four tabs are wider than a phone: the strip scrolls, it doesn't push the
    // last tab (this one) and the dialog off to the right.
    const css = read('../src/css/styles.css');
    const strip = (css.match(/\n\.settings-tabs \{[^}]*\}/) || [''])[0];
    const tabRule = (css.match(/\n\.mcp-modal \.settings-tab \{[^}]*\}/) || [''])[0];
    check('the tab strip scrolls sideways on a narrow screen', /overflow-x: auto;/.test(strip) && /flex: none;/.test(tabRule) && /white-space: nowrap;/.test(tabRule));
    check('…and the selected tab is brought into view, also once the dialog is shown',
        (mcpUi.match(/revealSelectedTab\(\);/g) || []).length === 2 && /addClass\('open'\);[^\n]*revealSelectedTab\(\);/.test(mcpUi));
    const link = app.slice(app.indexOf('function openSettingsFromLink() {'), app.indexOf('// Reveal the cloaked UI only once'));
    check('/?settings=projects opens it, and does nothing else',
        link.includes("url.searchParams.get('settings')") && link.includes("'projects'") && link.includes('window.openSettings(tab)')
        && !/MissingProjects|saveChatList|puter\.fs/.test(link));
    check('…the param is taken out of the address bar', link.includes("url.searchParams.delete('settings')") && link.includes('history.replaceState('));
}

// ============ The link: /?settings=projects ====================================
{
    const fnSrc = app.slice(app.indexOf('function openSettingsFromLink() {'), app.indexOf('// Reveal the cloaked UI only once'));
    // Runs the real function against a fake address bar; timers run at once.
    function visit(href, { managerAfter = 0 } = {}) {
        const opened = [];
        const replaced = [];
        let ticks = 0;
        const window = {
            location: { href },
            mcpManager: managerAfter === 0 ? {} : undefined,
            openSettings: (tab) => opened.push(tab),
        };
        const history = { state: { chatId: 'X' }, replaceState: (state, _t, url) => replaced.push([state, url]) };
        const queue = [];
        const setTimeout = (fn) => queue.push(fn);
        new Function('window', 'history', 'setTimeout', 'URL', fnSrc + '\nopenSettingsFromLink();')(window, history, setTimeout, URL);
        while (queue.length && ticks < 500) {
            ticks++;
            if (managerAfter > 0 && ticks === managerAfter) window.mcpManager = {};
            queue.shift()();
        }
        return { opened, replaced, ticks };
    }
    let v = visit('https://builder.example/?settings=projects');
    check('link: opens Settings on the Projects tab', v.opened.join() === 'projects', v.opened.join());
    check('link: takes the param out of the address bar, keeping the history state', v.replaced.length === 1 && v.replaced[0][1] === '/' && v.replaced[0][0].chatId === 'X', JSON.stringify(v.replaced));
    v = visit('https://builder.example/?p=abc&settings=projects&x=1#frag');
    check('link: leaves the rest of the address alone', v.replaced[0][1] === '/?p=abc&x=1#frag', v.replaced[0] && v.replaced[0][1]);
    v = visit('https://builder.example/?p=abc');
    check('link: no param, nothing happens', v.opened.length === 0 && v.replaced.length === 0);
    v = visit('https://builder.example/?settings=nonsense');
    check('link: an unknown tab opens nothing, and is still removed', v.opened.length === 0 && v.replaced.length === 1);
    v = visit('https://builder.example/?settings=projects', { managerAfter: 5 });
    check('link: waits for Settings to finish loading', v.opened.join() === 'projects', v.opened.join());
    v = visit('https://builder.example/?settings=projects', { managerAfter: -1 });
    check('link: if Settings never loads, says so once instead of doing nothing', v.opened.join() === 'projects' && v.ticks < 200, v.opened.join() + ' after ' + v.ticks);
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll missing-projects checks passed.');
