import fs from 'node:fs';
import vm from 'node:vm';

// ---- Versions for edited messages (versions.js) ------------------------------
// Editing a message puts the project's files back to the version it was sent
// with, and switching between an edited message's versions puts each one's
// files back (js/message-edit.js). That rests on four things here, run on the
// real module with only the file system and the UI mocked:
//   - projectVersionNow: the version the files are at, once the snapshots
//     queued before the ask have landed, null when no version holds them, and
//     'empty' for a project with no files yet.
//   - restoreProjectVersion: a restore with no dialog and no note in the
//     conversation, that says which version the files were at before (its
//     restore point when they had changed), and goes ahead on the current
//     version when the files have changed since it.
//   - a restore to 'empty' removes every file but Puter's .puter folder.
//   - copyFilesFromVersion: a message's own attachments come back from the
//     version just left.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const source = fs.readFileSync(new URL('../src/js/versions.js', import.meta.url), 'utf8');
const appDir = '/alice/AppData/builder/chat1';
const root = '/alice/AppData/builder/.versions/chat1';
const settle = async () => { for (let n = 0; n < 50; n++) await new Promise(setImmediate); };

function load(initial, { history } = {}) {
    const files = new Map(Object.entries(initial));
    const alerts = [], confirms = [], notes = [], modified = [];
    const puter = {
        appID: 'builder',
        ui: { alert: async (m) => alerts.push(String(m)) },
        fs: {
            read: async (p) => {
                if (!files.has(p)) throw Object.assign(new Error('not found: ' + p), { code: 'subject_does_not_exist' });
                return { text: async () => files.get(p) };
            },
            write: async (p, d) => { files.set(p, d); },
            mkdir: async () => {},
            stat: async (p) => {
                if (!files.has(p) && ![...files.keys()].some(k => k.startsWith(p + '/'))) throw new Error('not found: ' + p);
                return {};
            },
            readdir: async (p) => {
                const items = new Map();
                for (const k of files.keys()) {
                    if (!k.startsWith(p + '/')) continue;
                    const rel = k.slice(p.length + 1);
                    const name = rel.split('/')[0];
                    items.set(name, { name, is_dir: rel.includes('/') });
                }
                if (!items.size && ![...files.keys()].some(k => k.startsWith(p + '/'))) {
                    throw Object.assign(new Error('not found: ' + p), { code: 'subject_does_not_exist' });
                }
                return [...items.values()];
            },
            copy: async (from, to, o = {}) => {
                const dest = to + '/' + (o.newName || from.split('/').at(-1));
                if (files.has(from)) files.set(dest, files.get(from));
                else for (const [k, v] of [...files]) if (k.startsWith(from + '/')) files.set(dest + k.slice(from.length), v);
            },
            delete: async (p) => { for (const k of [...files.keys()]) if (k === p || k.startsWith(p + '/')) files.delete(k); },
        },
    };
    const window = {
        user: { username: 'alice' },
        showToast() {},
        showPreviewUpdating() {},
    };
    const ctx = {
        window, puter, document: {}, currentChatId: 'chat1', currentAppDir: appDir,
        isProcessing: false, _sendSetupInFlight: false,
        localStorage: (() => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; })(),
        puterConfirm: async (m) => { confirms.push(m); return true; },
        chatHistory: history || [],
        appendMessage: (n) => notes.push(n),
        generateMessageId: () => 'm' + Math.random(),
        isNotFoundError: (e) => !!e && e.code === 'subject_does_not_exist',
        console: { warn() {}, error() {}, log() {} },
        $: () => ({ length: 0, on() { return this; }, prop() { return this; }, find() { return this; } }),
    };
    vm.runInNewContext(source, ctx, { filename: 'src/js/versions.js' });
    const origMark = window.markProjectModified;
    window.markProjectModified = (t, c, o) => { modified.push(t); return origMark(t, c, o); };
    const index = () => JSON.parse(files.get(root + '/index.json'));
    return { window, files, alerts, confirms, notes, modified, index, ctx };
}

// ---- projectVersionNow ---------------------------------------------------------
{
    const t = load({
        [appDir + '/index.html']: 'v2 page',
        [root + '/v1/index.html']: 'v1 page',
        [root + '/v2/index.html']: 'v2 page',
        [root + '/index.json']: JSON.stringify({ current: 'v2', versions: [{ id: 'v1' }, { id: 'v2' }] }),
    });
    check('clean files: the current version', await t.window.projectVersionNow('chat1', appDir) === 'v2');
    t.window.markProjectModified('write', 'chat1');
    const asked = t.window.projectVersionNow('chat1', appDir);
    const snap = t.window.createProjectVersion({ chatId: 'chat1', appDir, label: 'later' });
    check('changed files no version holds: none', await asked === null);
    const id = await snap;
    check('…until a snapshot takes them, asked after it was queued', typeof id === 'string' && await t.window.projectVersionNow('chat1', appDir) === id);

    // Asked while a snapshot of the changes is still copying: it waits for it.
    t.window.markProjectModified('write', 'chat1');
    const snap2 = t.window.createProjectVersion({ chatId: 'chat1', appDir, label: 'more' });
    const during = t.window.projectVersionNow('chat1', appDir);
    const id2 = await snap2;
    check('asked while the snapshot that takes the files is queued: that one', await during === id2);
    t.window.markProjectModified('write', 'chat1');
    check('a change after it: none again', await t.window.projectVersionNow('chat1', appDir) === null);
}
{
    const t = load({});
    check('a project with no files yet: empty', await t.window.projectVersionNow('chat1', appDir) === 'empty');
    check('…the stand-in is exported', t.window.EMPTY_PROJECT_VERSION === 'empty');
    const u = load({ [appDir + '/.puter/shot.png']: 'x' });
    check('…Puter\'s own folder doesn\'t count as files', await u.window.projectVersionNow('chat1', appDir) === 'empty');
}

// ---- restoreProjectVersion --------------------------------------------------------
{
    const history = [{ role: 'user', content: 'hi', messageId: 'u1' }];
    const t = load({
        [appDir + '/index.html']: 'v2 page',
        [appDir + '/extra.js']: 'only in v2',
        [root + '/v1/index.html']: 'v1 page',
        [root + '/v2/index.html']: 'v2 page',
        [root + '/v2/extra.js']: 'only in v2',
        [root + '/index.json']: JSON.stringify({ current: 'v2', versions: [{ id: 'v1' }, { id: 'v2' }] }),
    }, { history });
    const r = await t.window.restoreProjectVersion('v1');
    check('restores with no dialog', t.confirms.length === 0 && t.alerts.length === 0, JSON.stringify(t.alerts));
    check('…the files are the version', t.files.get(appDir + '/index.html') === 'v1 page' && !t.files.has(appDir + '/extra.js'));
    check('…and says the files were at the current version before', r && r.ok === true && r.from === 'v2', JSON.stringify(r));
    check('…no note in the conversation', history.length === 1 && t.notes.length === 0);
    check('…and the files are now that version', await t.window.projectVersionNow('chat1', appDir) === 'v1' && t.index().current === 'v1');

    // Changed files: a restore point first, and that is where they were.
    t.files.set(appDir + '/index.html', 'hand edit');
    t.window.markProjectModified('write', 'chat1');
    const r2 = await t.window.restoreProjectVersion('v2');
    const point = t.index().versions.find(v => v.label === 'Before restore');
    check('changed files: a restore point is taken, and they were at it', !!point && r2.ok && r2.from === point.id, JSON.stringify(r2));
    check('…which holds them', t.files.get(root + '/' + point.id + '/index.html') === 'hand edit');

    // The current version, with files changed since: it still goes back.
    t.files.set(appDir + '/index.html', 'another edit');
    t.window.markProjectModified('write', 'chat1');
    const r3 = await t.window.restoreProjectVersion('v2');
    check('the current version with changed files: they go back to it', r3.ok && t.files.get(appDir + '/index.html') === 'v2 page');
    const r4 = await t.window.restoreProjectVersion('v2');
    check('…and with nothing changed, nothing to do', r4.ok && r4.from === 'v2');

    const r5 = await t.window.restoreProjectVersion('v9');
    check('a version that isn\'t there: refused, the user told', !r5 && /could not be found/.test(t.alerts.at(-1)));

    t.ctx.isProcessing = true;
    const r6 = await t.window.restoreProjectVersion('v1');
    check('refused while a build runs', !r6 && /wait for the current task/.test(t.alerts.at(-1)));
}

// ---- back to empty --------------------------------------------------------------
{
    const t = load({
        [appDir + '/index.html']: 'built',
        [appDir + '/assets/a.png']: 'img',
        [appDir + '/.puter/shot.png']: 'shot',
        [root + '/v1/index.html']: 'built',
        [root + '/v1/assets/a.png']: 'img',
        [root + '/index.json']: JSON.stringify({ current: 'v1', versions: [{ id: 'v1' }] }),
    });
    const r = await t.window.restoreProjectVersion('empty');
    check('empty: every file goes', r && r.ok && !t.files.has(appDir + '/index.html') && !t.files.has(appDir + '/assets/a.png'), JSON.stringify(r));
    check('…but Puter\'s own folder stays', t.files.get(appDir + '/.puter/shot.png') === 'shot');
    check('…no version is current, and the files were at the one before', t.index().current === null && r.from === 'v1');
    check('…the versions are all still there', t.index().versions.length === 1 && t.files.get(root + '/v1/index.html') === 'built');
    check('…and the files are known to be empty', await t.window.projectVersionNow('chat1', appDir) === 'empty');
    const back = await t.window.restoreProjectVersion('v1');
    check('…and back again', back.ok && back.from === 'empty' && t.files.get(appDir + '/index.html') === 'built');
}

// ---- a message's own files come back ----------------------------------------------
{
    const t = load({
        [appDir + '/index.html']: 'v1 page',
        [root + '/v2/index.html']: 'v2 page',
        [root + '/v2/assets/photos/cat.png']: 'cat',
        [root + '/index.json']: JSON.stringify({ current: 'v1', versions: [{ id: 'v1' }, { id: 'v2' }] }),
    });
    const n = await t.window.copyFilesFromVersion('chat1', appDir, 'v2', ['assets/photos/cat.png', 'assets/gone.png', '../escape.png']);
    check('the files the message was sent with come back from the version left', n === 1 && t.files.get(appDir + '/assets/photos/cat.png') === 'cat');
    check('…one it doesn\'t have, or a path out of the project, is skipped', !t.files.has(appDir + '/assets/gone.png') && !t.files.has('/alice/AppData/builder/escape.png'));
    check('…and they count as a change to the files', t.modified.length === 1 && await t.window.projectVersionNow('chat1', appDir) === null);
    check('…nothing comes from the empty project', await t.window.copyFilesFromVersion('chat1', appDir, 'empty', ['x']) === 0);
}

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nAll message-version checks passed.');
