import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: a failed listing never passes for an empty one --------
// restoreDirFromSnapshot lists the working directory to find the files the
// chosen version doesn't have, and prunes them. Every failure of that listing
// was read as "the directory is empty": with a transient error on the listing
// (a network blip, a 5xx) there was nothing to prune, so those files stayed,
// the directory was a superset of the version, and the restore still marked
// it Current and clean — a silent partial restore, exactly the state the
// leftovers reporting exists to surface. Only a directory that doesn't exist
// yet may count as empty; anything else fails the restore, which then marks
// the state unknown and says so.
//
// The end-of-turn snapshot listed the directory the same way, and a failed
// listing resolved null like "doesn't exist yet", so it was the one snapshot
// failure the "Couldn't save a restore point" warning never reported.
//
// Drives the real versions.js (VM sandbox, FS mocked).

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const versionsSrc = read('../src/js/versions.js');

const APP = '/alice/AppData/builder/chat1';
const ROOT = '/alice/AppData/builder/.versions/chat1';

function makeWorld({ readdirFails } = {}) {
    const files = new Map([
        [APP + '/index.html', 'V2'],
        [APP + '/extra.js', 'ONLY IN V2'],
        [ROOT + '/v1/index.html', 'V1'],
        [ROOT + '/index.json', JSON.stringify({ current: 'v2', versions: [{ id: 'v1' }, { id: 'v2' }] })],
    ]);
    const toasts = [];
    const alerts = [];
    const events = new Map();
    const under = (p) => [...files.keys()].some((k) => k.startsWith(p + '/'));
    const $ = (t) => ({ length: 0, on(e, s, h) { if (typeof s === 'string') events.set(e + ':' + s, h); return this; }, prop() { return this; }, data() { return t.versionId; } });
    const window = { user: { username: 'alice' }, showToast: (m) => toasts.push(String(m)), showPreviewUpdating() {} };
    const puter = {
        appID: 'builder',
        ui: { alert: async (m) => alerts.push(String(m)) },
        fs: {
            read: async (p) => { if (!files.has(p)) throw new Error('not found: ' + p); return { text: async () => files.get(p) }; },
            write: async (p, d) => { files.set(p, d); },
            mkdir: async () => {},
            stat: async (p) => { if (!files.has(p) && !under(p)) throw new Error('not found: ' + p); return {}; },
            readdir: async (p) => {
                if (readdirFails && readdirFails(p)) throw new Error('Internal server error');
                const m = new Map();
                for (const k of files.keys()) {
                    if (!k.startsWith(p + '/')) continue;
                    const rel = k.slice(p.length + 1);
                    m.set(rel.split('/')[0], { name: rel.split('/')[0], is_dir: rel.includes('/') });
                }
                if (!m.size && ![...files.keys()].some((k) => k.startsWith(p + '/'))) throw new Error('not found: ' + p);
                return [...m.values()];
            },
            copy: async (from, to, o = {}) => {
                const dest = to + '/' + (o.newName || from.split('/').at(-1));
                if (files.has(from)) files.set(dest, files.get(from));
                else for (const [k, v] of [...files]) if (k.startsWith(from + '/')) files.set(dest + k.slice(from.length), v);
            },
            delete: async (p) => { for (const k of [...files.keys()]) if (k === p || k.startsWith(p + '/')) files.delete(k); },
        },
    };
    const sandbox = {
        window, puter, $, document: {}, currentChatId: 'chat1', currentAppDir: APP, isProcessing: false,
        puterConfirm: async () => true, localStorage: { getItem() { return null; }, setItem() {} },
        isNotFoundError: (e) => /not found/.test(e.message), console: { warn() {}, error() {} },
    };
    vm.createContext(sandbox);
    vm.runInContext(versionsSrc, sandbox);
    const settle = async () => { for (let n = 0; n < 500 && (window._restoringVersion || n < 5); n++) await new Promise(setImmediate); };
    return { files, toasts, alerts, events, window, sandbox, settle };
}

// === A transient listing failure during the prune ============================
{
    let calls = 0;
    const w = makeWorld({ readdirFails: (p) => p === APP && ++calls === 1 });
    w.events.get('click:.version-restore').call({ versionId: 'v1' }, { preventDefault() {}, stopPropagation() {} });
    await w.settle();
    const index = JSON.parse(w.files.get(ROOT + '/index.json'));
    check('the listing fails before any copy, so the files are left exactly as they were', w.files.get(APP + '/index.html') === 'V2');
    check('the directory is NOT marked as matching the version', index.current !== 'v1', 'current=' + index.current);
    check('…its state is unknown, so the next restore takes a safety snapshot', index.current === null && w.sandbox.window.isProjectDirty?.('chat1') !== false);
    check('the user is told the restore did not complete', w.alerts.length === 1 && /Restore failed/.test(w.alerts[0]), JSON.stringify(w.alerts));
    check('the file the version doesn\'t have is still there (nothing was silently pruned)', w.files.get(APP + '/extra.js') === 'ONLY IN V2');
}

// === A directory that doesn't exist yet is still simply empty ================
{
    const w = makeWorld();
    w.files.set(ROOT + '/v1/assets/logo.svg', '<svg/>'); // v1 has a subdirectory the working dir lacks
    w.events.get('click:.version-restore').call({ versionId: 'v1' }, { preventDefault() {}, stopPropagation() {} });
    await w.settle();
    const index = JSON.parse(w.files.get(ROOT + '/index.json'));
    check('a subdirectory the working dir lacks is created and filled', w.files.get(APP + '/assets/logo.svg') === '<svg/>');
    check('…and the restore completes as Current', index.current === 'v1' && w.alerts.length === 0, JSON.stringify(w.alerts));
    check('the prune still runs for the files the version doesn\'t have', !w.files.has(APP + '/extra.js'));
}

// === The end-of-turn snapshot reports a failed listing =======================
{
    const w = makeWorld({ readdirFails: (p) => p === APP });
    const id = await w.sandbox.window.createProjectVersion({ chatId: 'chat1', appDir: APP, label: 'x' });
    check('a snapshot whose listing failed resolves null', id === null);
    check('…and warns that no restore point was saved', w.toasts.some((t) => /restore point/.test(t)), JSON.stringify(w.toasts));
}
{
    const w = makeWorld();
    const id = await w.sandbox.window.createProjectVersion({ chatId: 'chat1', appDir: '/alice/AppData/builder/never-made', label: 'x' });
    check('a project directory that does not exist yet is quietly nothing to snapshot', id === null && w.toasts.length === 0, JSON.stringify(w.toasts));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll restore-readdir-failure checks passed.');
