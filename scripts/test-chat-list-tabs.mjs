import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: two tabs share one project list -----------------------
// chat-list.json is the sidebar index for every open tab of the account, and
// each tab used to write its own in-memory copy over it — a copy read once at
// boot. So:
//   * a project created in tab B vanished at tab A's next save (every build
//     round saves): its file was orphaned — the list was valid, so recovery
//     never ran, and a ?p= link refuses unlisted ids;
//   * a project deleted in one tab was written back by the other;
//   * a rename or pin made in one tab was reverted by the other.
// Each list write now merges what is on disk. Runs the real chat-list code
// (loadSavedChats … saveCurrentChat) in two VM "tabs" sharing one fake puter.fs.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const app = read('../src/js/app.js');
const helpers = read('../src/js/helpers.js');
const LOCK = helpers.slice(helpers.indexOf('const _fileLocks = new Map()'), helpers.indexOf('// Wait for the writes currently in flight'));
const start = app.indexOf('let savedChats = [];');
const end = app.indexOf('// Merge just the public-site (Publish) fields');
if (start < 0 || end < 0 || !LOCK) throw new Error('could not extract the chat-list code');
const CODE = LOCK + '\n' + app.slice(start, end) + `
globalThis.__list = () => savedChats;
globalThis.__setList = (l) => { savedChats = l; };
globalThis.__setCurrent = (id) => { currentChatId = id; };
`;

function world() {
    const disk = new Map();
    const nf = (p) => Object.assign(new Error('not found ' + p), { code: 'subject_does_not_exist' });
    const puterFs = {
        read: async (p) => { await null; if (!disk.has(p)) throw nf(p); const d = disk.get(p); return { text: async () => d }; },
        write: async (p, d) => { await null; disk.set(p, d); },
        stat: async () => ({}), mkdir: async () => {},
        readdir: async (p) => [...disk.keys()].filter((k) => k.startsWith(p + '/')).map((k) => ({ name: k.slice(p.length + 1) })),
        delete: async (p) => { disk.delete(p); },
    };
    function tab() {
        const deleted = new Set();
        const sb = {
            window: { showToast() {}, currentPreviewUrl: null }, puter: { fs: puterFs }, console: { log() {}, warn() {}, error() {} },
            generateChatId: () => 'boot', generateChatTitle: (h) => 'title:' + ((h.find((m) => m.role === 'user') || {}).content || ''),
            _deletedChatIds: deleted, _aiProjectTitles: new Map(), _suggestionsByChat: new Map(),
            setUrlChat() {}, updateChatHistorySidebar() {}, updateDocumentTitle() {},
        };
        vm.createContext(sb);
        vm.runInContext(CODE, sb);
        sb.deleteLocally = (id) => { deleted.add(id); sb.__setList(sb.__list().filter((c) => c.id !== id)); };
        return sb;
    }
    const list = () => JSON.parse(disk.get('chat-history/chat-list.json'));
    return { disk, tab, list };
}
const ids = (l) => l.map((c) => c.id).sort().join(',');
const seed = (w, entries) => {
    w.disk.set('chat-history/chat-list.json', JSON.stringify(entries));
    for (const e of entries) w.disk.set(`chat-history/${e.id}.json`, JSON.stringify({ id: e.id, title: e.title, history: [{ role: 'user', content: e.id }] }));
};
const save = (t, id) => { t.__setCurrent(id); return t.saveCurrentChat({ currentChatId: id, chatHistory: [{ role: 'user', content: id }, { role: 'assistant', content: 'x' }], interrupted: true }); };

{
    const w = world();
    seed(w, [{ id: 'P', title: 'P' }, { id: 'D', title: 'D' }]);
    const A = w.tab(), B = w.tab();
    await A.loadSavedChats(); await B.loadSavedChats();
    await save(B, 'N');                    // tab B creates a project
    await save(A, 'P');                    // tab A keeps building in P
    check('a project created in another tab survives this tab\'s save', ids(w.list()) === 'D,N,P', ids(w.list()));
    check('…and shows up in this tab\'s list', A.__list().some((c) => c.id === 'N'));
    check('…at the top, where a new project lands', w.list()[0].id === 'N', w.list().map((c) => c.id).join(','));
}
{
    const w = world();
    seed(w, [{ id: 'P', title: 'P' }, { id: 'D', title: 'D' }]);
    const A = w.tab(), B = w.tab();
    await A.loadSavedChats(); await B.loadSavedChats();
    B.deleteLocally('D'); await B.saveChatList(); // tab B deletes D
    await save(A, 'P');
    check('a project deleted in another tab is not written back', ids(w.list()) === 'P', ids(w.list()));
    check('…and leaves this tab\'s list too', !A.__list().some((c) => c.id === 'D'));
}
{
    const w = world();
    seed(w, [{ id: 'P', title: 'P' }, { id: 'Q', title: 'Q' }]);
    const A = w.tab(), B = w.tab();
    await A.loadSavedChats(); await B.loadSavedChats();
    const q = B.__list().find((c) => c.id === 'Q'); q.title = 'Renamed in B'; q.customTitle = true; q.pinned = true;
    await B.saveChatList();
    await save(A, 'P');
    const qOnDisk = w.list().find((c) => c.id === 'Q');
    check('a rename and pin made in another tab are not reverted', qOnDisk.title === 'Renamed in B' && qOnDisk.pinned === true, JSON.stringify(qOnDisk));
}
{
    const w = world();
    seed(w, [{ id: 'P', title: 'P' }, { id: 'Q', title: 'Q' }]);
    const A = w.tab(), B = w.tab();
    await A.loadSavedChats(); await B.loadSavedChats();
    await save(B, 'P');                    // another tab writes the list meanwhile
    const q = A.__list().find((c) => c.id === 'Q'); q.title = 'Renamed in A'; q.customTitle = true;
    await A.saveChatList();
    check('this tab\'s own change wins over the copy on disk', w.list().find((c) => c.id === 'Q').title === 'Renamed in A');
}
{
    const w = world();
    seed(w, [{ id: 'P', title: 'P' }]);
    const A = w.tab();
    await A.loadSavedChats();
    await save(A, 'N2');
    await A.saveChatList();
    check('one tab alone keeps working exactly as before', ids(w.list()) === 'N2,P' && w.list()[0].id === 'N2', w.list().map((c) => c.id).join(','));
}

// ---- A missing index is rebuilt from the chat files --------------------------
// A first save interrupted between the chat file and the index (or the index
// deleted by hand) left files with no list. Boot started from an empty list,
// and the next save wrote a list without them — hidden for good.
{
    const w = world();
    for (const id of ['OLD1', 'OLD2']) {
        w.disk.set(`chat-history/${id}.json`, JSON.stringify({ id, title: id, history: [{ role: 'user', content: id }], lastModified: '2026-01-0' + id.slice(-1) }));
    }
    const A = w.tab();
    await A.loadSavedChats();
    check('missing index: the projects on disk are listed', ids(A.__list()) === 'OLD1,OLD2', ids(A.__list()));
    await save(A, 'NEW');
    check('missing index: the next save keeps them', ids(w.list()) === 'NEW,OLD1,OLD2', ids(w.list()));
}
{
    const w = world();
    const A = w.tab();
    await A.loadSavedChats();
    check('brand-new account: an empty list', A.__list().length === 0);
    await save(A, 'FIRST');
    check('brand-new account: the first project is saved to the list', ids(w.list()) === 'FIRST', w.disk.get('chat-history/chat-list.json'));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll chat-list multi-tab checks passed.');
