import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: a restore that could not finish never claims it did --
// Restoring reconciles the working directory to the chosen snapshot: it copies
// the snapshot's files in, then deletes everything the snapshot does not have.
// Those deletions were best-effort — a failure warned to the console and the
// restore carried on to mark that version Current and the project clean. But a
// file the selected version deliberately removed is not harmless: it can be a
// live route, a script the restored page still loads, or an asset that makes
// the app behave like neither version. The user was told the project matched a
// version it did not match, and the publish baseline believed it too.
//
// Drives the real module (VM sandbox, only the FS/UI boundary mocked) through
// its Restore click handler with an injected deletion failure.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const source = fs.readFileSync(new URL('../src/js/versions.js', import.meta.url), 'utf8');
const appDir = '/alice/AppData/builder/project';
const root = '/alice/AppData/builder/.versions/chat1';

// undeletable: a path whose removal always rejects (null = everything deletes).
// opts.failFinalIndexWrite: the index write that records the restored version
// as current rejects (every file has already landed by then).
async function run(undeletable, opts = {}) {
    const files = new Map([
        [appDir + '/index.html', 'NEWER INDEX'],
        [appDir + '/new-feature.js', 'A ROUTE V1 DOES NOT HAVE'],
        [appDir + '/extras/legacy.js', 'A NESTED LEFTOVER'],
        [root + '/v1/index.html', 'OLD INDEX'],
        [root + '/v2/index.html', 'NEWER INDEX'],
        [root + '/v2/new-feature.js', 'A ROUTE V1 DOES NOT HAVE'],
        [root + '/v2/extras/legacy.js', 'A NESTED LEFTOVER'],
        [root + '/index.json', JSON.stringify({ current: 'v2', versions: [{ id: 'v1' }, { id: 'v2' }] })],
    ]);
    const events = new Map();
    const alerts = [];
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
                if (opts.failFinalIndexWrite && path === root + '/index.json' && JSON.parse(data).current === 'v1') {
                    throw new Error('storage unavailable');
                }
                files.set(path, data);
            },
            mkdir: async () => {},
            stat: async path => {
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
                const destination = to + '/' + (options.newName || from.split('/').at(-1));
                if (files.has(from)) files.set(destination, files.get(from));
                else for (const [p, value] of [...files]) {
                    if (p.startsWith(from + '/')) files.set(destination + p.slice(from.length), value);
                }
            },
            delete: async path => {
                if (undeletable && path === undeletable) throw new Error('permission denied');
                for (const p of [...files.keys()]) if (p === path || p.startsWith(path + '/')) files.delete(p);
            },
        },
    };
    let previewRefreshes = 0;
    const window = {
        user: { username: 'alice' },
        showToast: () => {},
        showPreviewUpdating: () => {},
        refreshPreviewWhenReady: () => { previewRefreshes++; },
    };
    const localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    vm.runInNewContext(source, {
        window, puter, $, document: {}, localStorage,
        currentChatId: 'chat1', currentAppDir: appDir,
        isProcessing: false, puterConfirm: async () => true,
        console: { warn() {}, error() {} },
    }, { filename: 'src/js/versions.js' });

    events.get('click:.version-restore').call({ versionId: 'v1' }, { preventDefault() {}, stopPropagation() {} });
    for (let n = 0; n < 500 && window._restoringVersion; n++) await new Promise(setImmediate);
    if (window._restoringVersion) throw new Error('restore did not complete');

    const index = JSON.parse(files.get(root + '/index.json'));
    return {
        alerts,
        indexHtml: files.get(appDir + '/index.html'),
        leftoverFile: files.has(appDir + '/new-feature.js'),
        leftoverNested: files.has(appDir + '/extras/legacy.js'),
        current: index.current,
        dirty: window._projectDirtySinceSnapshot,
        previewRefreshes,
    };
}

// ---- Control: everything reconciles ----------------------------------------
const ok = await run(null);
check('control: the snapshot files are restored', ok.indexHtml === 'OLD INDEX');
check('control: files the version does not have are gone',
    ok.leftoverFile === false && ok.leftoverNested === false);
check('control: the version becomes current', ok.current === 'v1', 'current=' + ok.current);
check('control: the project is clean at that version', ok.dirty === false);
check('control: no error shown', ok.alerts.length === 0, JSON.stringify(ok.alerts));

// ---- A file the selected version removed cannot be deleted ------------------
const fileFail = await run(appDir + '/new-feature.js');
check('file: the leftover is reported to the user', fileFail.alerts.length === 1
    && /could not be removed/i.test(fileFail.alerts[0]), JSON.stringify(fileFail.alerts));
check('file: the version is NOT claimed as current', fileFail.current !== 'v1',
    'current=' + fileFail.current);
check('file: the project is left marked as not matching a checkpoint',
    fileFail.dirty === true, 'dirty=' + fileFail.dirty);
check('file: the snapshot files still landed', fileFail.indexHtml === 'OLD INDEX');

// ---- The same for a directory the selected version removed ------------------
const dirFail = await run(appDir + '/extras');
check('directory: the leftover is reported to the user', dirFail.alerts.length === 1
    && /could not be removed/i.test(dirFail.alerts[0]), JSON.stringify(dirFail.alerts));
check('directory: the version is NOT claimed as current', dirFail.current !== 'v1',
    'current=' + dirFail.current);
check('directory: the project is left marked as not matching a checkpoint',
    dirFail.dirty === true, 'dirty=' + dirFail.dirty);

// ---- The files land, but recording the restored version fails --------------
// It used to surface as a plain "Restore failed" over files that had in fact
// been replaced, with the old version still Current, the project marked clean
// against it, and the preview still showing the pre-restore app.
{
    const r = await run(null, { failFinalIndexWrite: true });
    check('index write: the files are restored', r.indexHtml === 'OLD INDEX');
    check('index write: the user is told the files were restored, not that it failed',
        r.alerts.length === 1 && !/^Restore failed/.test(r.alerts[0]) && /files were restored/.test(r.alerts[0]), JSON.stringify(r.alerts));
    check('index write: the old version is not left marked current', r.current !== 'v2', 'current=' + r.current);
    check('index write: the project is left marked as not matching a checkpoint', r.dirty === true);
    check('index write: the preview reloads to show the restored files', r.previewRefreshes === 1);
}
// A file that could not be removed leaves the files changed too: reload.
{
    const r = await run(appDir + '/new-feature.js');
    check('partial restore: the preview reloads to show what is on disk', r.previewRefreshes === 1);
}

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all restore-prune-failure checks passed');
