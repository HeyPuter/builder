import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: the dirty check that gates the safety snapshot --------
// restoreVersion captures the chat it targets up front (a mid-restore chat
// switch must not redirect the file work), but the "does this project have
// un-snapshotted changes?" question it asks before overwriting those files used
// to be answered for whichever chat was on SCREEN. Opening another project while
// the restore awaited storage therefore answered for the wrong project: a dirty
// project A restored while clean project B was open skipped its "Before restore"
// snapshot entirely and its un-snapshotted work was overwritten with no copy
// anywhere — behind a confirm dialog that promises one is saved first.
//
// Drives the real module (VM sandbox, only the FS/UI boundary mocked) through
// its Restore click handler.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const source = fs.readFileSync(new URL('../src/js/versions.js', import.meta.url), 'utf8');

const A_DIR = '/alice/AppData/builder/project-a';
const B_DIR = '/alice/AppData/builder/project-b';
const A_ROOT = '/alice/AppData/builder/.versions/chat-a';

// Build a sandbox around the real versions.js. `hooks` may intercept individual
// filesystem calls to open a deterministic race window. `opts.files` /
// `opts.storage` let a second "session" reuse the cloud files and the browser's
// localStorage of the first, which is what a page reload looks like.
function makeRun(hooks = {}, opts = {}) {
    const files = opts.files || new Map([
        [A_DIR + '/index.html', 'LATEST UNSNAPSHOTTED WORK'],
        [A_DIR + '/new-feature.js', 'UNIQUE NEW FEATURE'],
        [A_ROOT + '/v1/index.html', 'OLD VERSION'],
        [A_ROOT + '/v2/index.html', 'LAST CHECKPOINT'],
        [B_DIR + '/index.html', 'PROJECT B'],
        [A_ROOT + '/index.json', JSON.stringify({ current: 'v2', versions: [{ id: 'v1' }, { id: 'v2' }] })],
    ]);
    const events = new Map();
    const alerts = [], toasts = [];
    let backupAttempts = 0;

    function $(target) {
        return {
            length: 0,
            on(event, selector, handler) { if (typeof selector === 'string') events.set(event + ':' + selector, handler); return this; },
            prop() { return this; },
            data() { return target.versionId; },
        };
    }
    const puter = {
        appID: 'builder',
        ui: { alert: async message => alerts.push(String(message)) },
        fs: {
            read: async path => {
                if (!files.has(path)) throw new Error('not found: ' + path);
                return { text: async () => files.get(path) };
            },
            write: async (path, data) => {
                if (hooks.beforeWrite) await hooks.beforeWrite(path, sandbox);
                files.set(path, data);
            },
            mkdir: async () => {},
            stat: async path => {
                if (hooks.beforeStat) await hooks.beforeStat(path, sandbox);
                if (![...files.keys()].some(p => p.startsWith(path + '/'))) throw new Error('not found: ' + path);
                return { is_dir: true };
            },
            readdir: async path => {
                const items = new Map();
                for (const p of files.keys()) {
                    if (!p.startsWith(path + '/')) continue;
                    const relative = p.slice(path.length + 1);
                    const name = relative.split('/')[0];
                    items.set(name, { name, is_dir: relative.includes('/') });
                }
                return [...items.values()];
            },
            copy: async (from, to, options = {}) => {
                if (from === A_DIR || from === B_DIR) backupAttempts++;
                if (hooks.afterCopy) await hooks.afterCopy(from, sandbox);
                const destination = to + '/' + (options.newName || from.split('/').at(-1));
                if (files.has(from)) files.set(destination, files.get(from));
                else for (const [p, value] of [...files]) {
                    if (p.startsWith(from + '/')) files.set(destination + p.slice(from.length), value);
                }
            },
            delete: async path => {
                for (const p of [...files.keys()]) if (p === path || p.startsWith(path + '/')) files.delete(p);
            },
        },
    };
    const win = {
        user: { username: 'alice' },
        showToast: message => toasts.push(String(message)),
        showPreviewUpdating: () => {},
    };
    const store = opts.storage || new Map();
    const localStorage = opts.blockStorage
        ? { get getItem() { throw new Error('SecurityError'); }, get setItem() { throw new Error('SecurityError'); } }
        : {
            getItem: k => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => { store.set(k, String(v)); },
            removeItem: k => { store.delete(k); },
        };
    const sandbox = {
        window: win, puter, $, document: {}, localStorage,
        currentChatId: 'chat-a', currentAppDir: A_DIR,
        isProcessing: false, puterConfirm: async () => true,
        console: { warn() {}, error() {} },
    };
    vm.createContext(sandbox);
    vm.runInContext(source, sandbox, { filename: 'src/js/versions.js' });

    return {
        sandbox, files, events, alerts, toasts, storage: store,
        get backupAttempts() { return backupAttempts; },
        async restore(versionId) {
            events.get('click:.version-restore').call({ versionId }, { preventDefault() {}, stopPropagation() {} });
            for (let n = 0; n < 500 && win._restoringVersion; n++) await new Promise(setImmediate);
            if (win._restoringVersion) throw new Error('restore did not complete');
        },
        recoverable: value => [...files.values()].includes(value),
    };
}

// ---- #19: the project is switched while the restore awaits storage ----------
{
    let switched = false;
    const run = makeRun({
        // The snapshot-existence check is the last await before the dirty gate.
        async beforeStat(path, sandbox) {
            if (switched || !path.endsWith('/v1')) return;
            switched = true;
            sandbox.currentChatId = 'chat-b';
            sandbox.currentAppDir = B_DIR;
        },
    });
    run.sandbox.window.markProjectModified('write', 'chat-a');
    await run.restore('v1');

    check('switch: the project that was restored got its safety snapshot',
        run.backupAttempts >= 1, 'copies from a project dir: ' + run.backupAttempts);
    check('switch: the un-snapshotted work is still recoverable',
        run.recoverable('LATEST UNSNAPSHOTTED WORK') && run.recoverable('UNIQUE NEW FEATURE'),
        JSON.stringify([...run.files.keys()]));
    check('switch: the old version was still restored',
        run.files.get(A_DIR + '/index.html') === 'OLD VERSION',
        run.files.get(A_DIR + '/index.html'));
    check('switch: no error shown', run.alerts.length === 0, JSON.stringify(run.alerts));
}

// ---- Control: a clean project does not collect a needless snapshot ----------
{
    const run = makeRun();
    // Nothing marked modified, and the restore's own bookkeeping has run at
    // least once this session: a snapshot here would be pure clutter.
    run.sandbox.window.markProjectModified('write', 'chat-a');
    await run.restore('v1');
    const before = run.backupAttempts;
    await run.restore('v2');
    check('control: a second restore of a now-clean project takes no snapshot',
        run.backupAttempts === before, 'extra copies: ' + (run.backupAttempts - before));
}

// ---- #21: a newer turn edits files while an older snapshot is being written --
// The snapshot copied the directory, then wrote its index entry. An edit that
// landed in between is NOT in that snapshot, but the completion used to clear
// the project's dirty flag unconditionally — so if the next turn's checkpoint
// then failed, a restore saw a "clean" project and overwrote the newer work
// with no safety snapshot.
{
    let armed = true;
    const run = makeRun({
        async beforeWrite(path, sandbox) {
            if (!armed || !path.endsWith('/index.json')) return;
            armed = false;
            // Turn B edits a file after turn A's copy, before its index write.
            run.files.set(A_DIR + '/index.html', 'NEWER TURN WORK');
            sandbox.window.markProjectModified('write', 'chat-a');
        },
    });
    run.sandbox.window.markProjectModified('write', 'chat-a');
    await run.sandbox.window.createProjectVersion({ chatId: 'chat-a', appDir: A_DIR, label: 'turn A' });

    const snapshotted = [...run.files.entries()]
        .filter(([p]) => p.startsWith('/alice/AppData/builder/.versions/'))
        .map(([, v]) => v);
    check('overlap: the newer edit is in no snapshot',
        !snapshotted.includes('NEWER TURN WORK'), JSON.stringify(snapshotted));
    check('overlap: the project is still marked as having un-snapshotted changes',
        run.sandbox.window._projectDirtySinceSnapshot === true,
        'dirty=' + run.sandbox.window._projectDirtySinceSnapshot);

    // And the consequence the flag exists to prevent: a later restore must still
    // save the newer work first.
    await run.restore('v1');
    check('overlap: restoring afterwards still saves the newer work',
        run.recoverable('NEWER TURN WORK'), JSON.stringify([...run.files.values()]));
}

// ---- Control: an undisturbed snapshot does clear the flag -------------------
{
    const run = makeRun();
    run.sandbox.window.markProjectModified('write', 'chat-a');
    await run.sandbox.window.createProjectVersion({ chatId: 'chat-a', appDir: A_DIR, label: 'turn A' });
    check('control: a snapshot that captured everything marks the project clean',
        run.sandbox.window._projectDirtySinceSnapshot === false,
        'dirty=' + run.sandbox.window._projectDirtySinceSnapshot);
}

// ---- #20: the tab is reloaded before the edits reach a checkpoint -----------
// The record that the working files differ from the current checkpoint lived
// only in memory, while the files themselves live in cloud storage. A reload
// (or a crash, or closing the tab mid-turn) dropped the record and kept the
// files, so the next restore saw a clean project and deleted work that had
// never been captured.
{
    const first = makeRun();
    first.sandbox.window.markProjectModified('write', 'chat-a');

    // A brand-new session: same cloud files, same browser, no JavaScript state.
    const second = makeRun({}, { files: first.files, storage: first.storage });
    await second.restore('v1');

    check('reload: the restore still saved the un-snapshotted work',
        second.recoverable('LATEST UNSNAPSHOTTED WORK') && second.recoverable('UNIQUE NEW FEATURE'),
        JSON.stringify([...second.files.values()]));
    check('reload: the old version was restored', second.files.get(A_DIR + '/index.html') === 'OLD VERSION');
}

// ---- Control: a project whose checkpoint did land stays clean over a reload -
{
    const first = makeRun();
    first.sandbox.window.markProjectModified('write', 'chat-a');
    await first.sandbox.window.createProjectVersion({ chatId: 'chat-a', appDir: A_DIR, label: 'turn A' });

    const second = makeRun({}, { files: first.files, storage: first.storage });
    await second.restore('v1');
    check('control/reload: a checkpointed project takes no safety snapshot',
        second.backupAttempts === 0, 'copies: ' + second.backupAttempts);
}

// ---- Storage blocked: cleanliness cannot be proved, so assume it is not -----
{
    const run = makeRun({}, { blockStorage: true });
    await run.restore('v1');
    check('blocked storage: an unproven project is backed up before restoring',
        run.backupAttempts >= 1 && run.recoverable('LATEST UNSNAPSHOTTED WORK'),
        'copies: ' + run.backupAttempts);
}

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all restore-dirty-tracking checks passed');
