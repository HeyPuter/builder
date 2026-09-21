import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: a restore never proceeds without its safety snapshot ----
// When the working dir is dirty, restoreVersion takes a "Before restore"
// snapshot so the current files stay recoverable. createProjectVersion never
// throws — it resolves null on failure — and the restore used to ignore that
// result and proceed anyway: it overwrote the latest work, deleted files absent
// from the older version, and cleared the dirty flag, leaving no copy anywhere.
// Behind a confirm dialog that promises "a restore point is saved first", and
// behind one-click undo/redo, that is irreversible data loss.
//
// Drives the real module (VM sandbox, only the FS/UI boundary mocked) through
// its Restore click handler with an injected snapshot-copy failure, and asserts
// the project dir is untouched, the dirty flag stays set, and the user is told.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const source = fs.readFileSync(new URL('../src/js/versions.js', import.meta.url), 'utf8');
const appDir = '/alice/AppData/builder/project';
const root = '/alice/AppData/builder/.versions/chat1';

async function run(failBackup) {
    const files = new Map([
        [appDir + '/index.html', 'LATEST UNSNAPSHOTTED WORK'],
        [appDir + '/new-feature.js', 'UNIQUE NEW FEATURE'],
        [root + '/v1/index.html', 'OLD VERSION'],
        [root + '/v2/index.html', 'LAST CHECKPOINT'],
        [root + '/index.json', JSON.stringify({ current: 'v2', versions: [{ id: 'v1' }, { id: 'v2' }] })],
    ]);
    const events = new Map();
    const alerts = [], toasts = [];
    let backupAttempts = 0, overlayShown = null;
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
            write: async (path, data) => { files.set(path, data); },
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
                if (from === appDir) {
                    backupAttempts++;
                    if (failBackup) throw new Error('Injected backup copy network failure');
                }
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
    const window = {
        user: { username: 'alice' },
        showToast: message => toasts.push(String(message)),
        showPreviewUpdating: on => { overlayShown = on; },
    };
    vm.runInNewContext(source, {
        window, puter, $, document: {}, currentChatId: 'chat1', currentAppDir: appDir,
        isProcessing: false, puterConfirm: async () => true,
        console: { warn() {}, error() {} },
    }, { filename: 'src/js/versions.js' });
    window.markProjectModified('write', 'chat1');
    if (window._projectDirtySinceSnapshot !== true) throw new Error('precondition: dir should be dirty');
    events.get('click:.version-restore').call({ versionId: 'v1' }, { preventDefault() {}, stopPropagation() {} });
    for (let n = 0; n < 200 && window._restoringVersion; n++) await new Promise(setImmediate);
    if (window._restoringVersion) throw new Error('restore did not complete');
    const index = JSON.parse(files.get(root + '/index.json'));
    return {
        backupAttempts,
        indexHtml: files.get(appDir + '/index.html'),
        newFeatureExists: files.has(appDir + '/new-feature.js'),
        latestWorkRecoverable: [...files.values()].includes('LATEST UNSNAPSHOTTED WORK'),
        featureRecoverable: [...files.values()].includes('UNIQUE NEW FEATURE'),
        versions: index.versions.length,
        current: index.current,
        dirty: window._projectDirtySinceSnapshot,
        alerts, toasts, overlayShown,
    };
}

const ok = await run(false);
check('control: restore lands the old version', ok.indexHtml === 'OLD VERSION' && ok.current === 'v1');
check('control: safety snapshot recorded', ok.versions === 3);
check('control: overwritten work still recoverable from the snapshot', ok.latestWorkRecoverable && ok.featureRecoverable);
check('control: dir marked clean at the restored version', ok.dirty === false);
check('control: no error shown', ok.alerts.length === 0, JSON.stringify(ok.alerts));

const bad = await run(true);
check('failure: snapshot copy was attempted (and retried)', bad.backupAttempts === 2, 'attempts=' + bad.backupAttempts);
check('failure: current files are NOT overwritten', bad.indexHtml === 'LATEST UNSNAPSHOTTED WORK', 'index.html=' + bad.indexHtml);
check('failure: new file is NOT deleted', bad.newFeatureExists === true);
check('failure: index.current unchanged', bad.current === 'v2', 'current=' + bad.current);
check('failure: no version added', bad.versions === 2);
check('failure: dir still dirty so the next restore retries the snapshot', bad.dirty === true);
check('failure: user is told the restore was aborted', bad.alerts.some(a => /restore point/i.test(a) && /nothing was changed/i.test(a)), JSON.stringify(bad.alerts));
check('failure: preview overlay is cleared', bad.overlayShown === false, 'overlayShown=' + bad.overlayShown);

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all restore-safety-snapshot checks passed');
