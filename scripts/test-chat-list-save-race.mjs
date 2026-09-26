import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: the newest project list is the one that survives ------
// Every writer of the sidebar index — creating a project, duplicating one,
// renaming, pinning, deleting — calls saveChatList(), which serialized the
// whole in-memory array straight to chat-history/chat-list.json. Nothing
// serialized those writes against each other, and the per-chat file locks do
// not cover this separate path, so two overlapping saves raced: an older write
// that finished last put its older array back on disk. Memory still showed the
// new project, so nothing looked wrong until a reload, when the project
// vanished from the sidebar (its own chat file orphaned, and a valid-but-stale
// index does not trigger the recovery scan).
//
// Drives the real saveChatList (VM sandbox, only the FS/UI boundary mocked)
// with a first write that completes after the second.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const appSource = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const helpersSource = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');

const LOCK = helpersSource.slice(
    helpersSource.indexOf('const _fileLocks = new Map()'),
    helpersSource.indexOf('// Write `data` to `path` and CONFIRM'));

// The list path, its lock helper, the coalescing slot and saveChatList itself,
// taken verbatim as one block so the module-level state comes with them.
const listStart = appSource.indexOf("const CHAT_LIST_PATH = 'chat-history/chat-list.json';");
if (listStart < 0) throw new Error('could not find the chat-list save block');
const CODE = [
    LOCK,
    appSource.slice(listStart, appSource.indexOf('\n}\n', appSource.indexOf('async function saveChatList() {')) + 2),
].join('\n\n');

const LIST_PATH = 'chat-history/chat-list.json';

function makeSandbox() {
    const disk = new Map([[LIST_PATH, '[]']]);
    const writes = [];
    let releaseFirst = null;
    const sandbox = {
        savedChats: [{ id: 'A' }],
        chatListLoaded: true,
        _deletedChatIds: new Set(),
        updateChatHistorySidebar() {},
        loadSavedChats: async () => {},
        console: { warn() {}, error() {} },
        window: { showToast() {} },
        puter: {
            fs: {
                read: async path => ({ text: async () => disk.get(path) }),
                write: async (path, data) => {
                    const n = writes.length;
                    writes.push(data);
                    // The first write is the slow one: it lands only once the
                    // test releases it, after any later write has finished.
                    if (n === 0) await new Promise(res => { releaseFirst = res; });
                    disk.set(path, data);
                },
            },
        },
    };
    vm.createContext(sandbox);
    vm.runInContext(CODE, sandbox, { filename: 'src/js/app.js' });
    return { sandbox, disk, writes, release: () => releaseFirst && releaseFirst() };
}

const tick = async (n = 5) => { for (let i = 0; i < n; i++) await new Promise(setImmediate); };

// ---- An older save completing after a newer one -----------------------------
{
    const { sandbox, disk, writes, release } = makeSandbox();
    const first = sandbox.saveChatList();
    await tick();
    check('setup: the first save is in flight', writes.length === 1, JSON.stringify(writes));

    // A project is created while that write is still outstanding.
    sandbox.savedChats = [{ id: 'B' }, { id: 'A' }];
    const second = sandbox.saveChatList();
    await tick();

    release();
    await Promise.all([first, second]);
    await tick();

    const persisted = JSON.parse(disk.get(LIST_PATH) || 'null');
    check('the persisted list is the newest one',
        Array.isArray(persisted) && persisted.map(c => c.id).join() === 'B,A',
        JSON.stringify(persisted));
    check('memory and disk agree',
        JSON.stringify(persisted) === JSON.stringify(sandbox.savedChats),
        JSON.stringify(persisted) + ' vs ' + JSON.stringify(sandbox.savedChats));
}

// ---- Saves queued behind a slow one are coalesced ---------------------------
{
    const { sandbox, disk, writes, release } = makeSandbox();
    const first = sandbox.saveChatList();
    await tick();
    sandbox.savedChats = [{ id: 'B' }, { id: 'A' }];
    const queued = [sandbox.saveChatList(), sandbox.saveChatList(), sandbox.saveChatList()];
    await tick();
    release();
    await Promise.all([first, ...queued]);
    await tick();

    check('three saves behind one in-flight write collapse into a single write',
        writes.length === 2, 'writes: ' + writes.length);
    check('and that write still holds the newest list',
        (JSON.parse(disk.get(LIST_PATH) || 'null') || []).map(c => c.id).join() === 'B,A',
        disk.get(LIST_PATH));
}

// ---- A failing write must not stall every later save ------------------------
{
    const disk = new Map([[LIST_PATH, '[]']]);
    let calls = 0;
    const sandbox = {
        savedChats: [{ id: 'A' }],
        chatListLoaded: true,
        _deletedChatIds: new Set(),
        updateChatHistorySidebar() {},
        loadSavedChats: async () => {},
        console: { warn() {}, error() {} },
        window: { showToast() {} },
        puter: {
            fs: {
                read: async path => ({ text: async () => disk.get(path) }),
                write: async (path, data) => {
                    if (++calls === 1) throw new Error('network down');
                    disk.set(path, data);
                },
            },
        },
    };
    vm.createContext(sandbox);
    vm.runInContext(CODE, sandbox, { filename: 'src/js/app.js' });

    await sandbox.saveChatList();
    sandbox.savedChats = [{ id: 'B' }, { id: 'A' }];
    await sandbox.saveChatList();
    check('a failed write does not poison the queue',
        (JSON.parse(disk.get(LIST_PATH) || 'null') || []).map(c => c.id).join() === 'B,A',
        disk.get(LIST_PATH));
}

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all chat-list-save-race checks passed');
