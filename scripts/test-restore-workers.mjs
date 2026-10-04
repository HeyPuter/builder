import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: a restore rolls the project's backend back too --------
// Restore rewrites the project's files, but a serverless worker keeps running
// the code it was last deployed with. The restored frontend kept talking to the
// newer backend: undoing a bad backend change left it running, and an endpoint
// the newer version had changed broke the app the user had just rolled back to.
// After a restore each of the project's own deployed workers is redeployed from
// its restored source; one the restored version has no source for is left
// alone, and the published site's workers are never touched.
//
// Drives the real versions.js restore (VM sandbox, FS/workers mocked) with the
// real worker-ownership.js.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const versionsSrc = read('../src/js/versions.js');
const ownershipSrc = read('../src/js/worker-ownership.js');

const APP = '/alice/AppData/builder/chat1';
const ROOT = '/alice/AppData/builder/.versions/chat1';
const PUB = '/alice/AppData/builder/.published/chat1/__backend';

async function restore({ failDeploy = false } = {}) {
    const files = new Map([
        [APP + '/index.html', 'NEW FRONTEND'],
        [APP + '/workers/api.js', 'NEW BACKEND'],
        [APP + '/workers/added-later.js', 'A WORKER V1 NEVER HAD'],
        [ROOT + '/v1/index.html', 'OLD FRONTEND'],
        [ROOT + '/v1/workers/api.js', 'OLD BACKEND'],
        [ROOT + '/index.json', JSON.stringify({ current: 'v2', versions: [{ id: 'v1' }, { id: 'v2' }] })],
    ]);
    const deployed = new Map([
        ['api', { name: 'api', file_path: APP + '/workers/api.js', code: 'NEW BACKEND' }],
        ['added-later', { name: 'added-later', file_path: APP + '/workers/added-later.js', code: 'A WORKER V1 NEVER HAD' }],
        ['api-live', { name: 'api-live', file_path: PUB + '/api-live.js', code: 'PUBLISHED BACKEND' }],
    ]);
    const creates = [];
    const toasts = [];
    const events = new Map();
    const under = (p) => [...files.keys()].some((k) => k.startsWith(p + '/'));
    const $ = (t) => ({ length: 0, on(e, s, h) { if (typeof s === 'string') events.set(e + ':' + s, h); return this; }, prop() { return this; }, data() { return t.versionId; } });
    const window = { user: { username: 'alice' }, showToast: (m) => toasts.push(String(m)), showPreviewUpdating() {} };
    const puter = {
        appID: 'builder',
        ui: { alert: async () => {} },
        fs: {
            read: async (p) => { if (!files.has(p)) throw new Error('not found: ' + p); return { text: async () => files.get(p) }; },
            write: async (p, d) => { files.set(p, d); },
            mkdir: async () => {},
            stat: async (p) => { if (!files.has(p) && !under(p)) throw new Error('not found: ' + p); return {}; },
            readdir: async (p) => {
                const m = new Map();
                for (const k of files.keys()) {
                    if (!k.startsWith(p + '/')) continue;
                    const rel = k.slice(p.length + 1);
                    m.set(rel.split('/')[0], { name: rel.split('/')[0], is_dir: rel.includes('/') });
                }
                return [...m.values()];
            },
            copy: async (from, to, o = {}) => {
                const dest = to + '/' + (o.newName || from.split('/').at(-1));
                if (files.has(from)) files.set(dest, files.get(from));
                else for (const [k, v] of [...files]) if (k.startsWith(from + '/')) files.set(dest + k.slice(from.length), v);
            },
            delete: async (p) => { for (const k of [...files.keys()]) if (k === p || k.startsWith(p + '/')) files.delete(k); },
        },
        workers: {
            list: async () => [...deployed.values()],
            create: async (name, filePath) => {
                creates.push(name);
                if (failDeploy) throw new Error('deploy failed');
                deployed.set(name, { name, file_path: filePath, code: files.get(filePath) });
                return { success: true, url: `https://${name}.puter.work` };
            },
        },
    };
    const sandbox = {
        window, puter, $, document: {}, currentChatId: 'chat1', currentAppDir: APP, isProcessing: false,
        puterConfirm: async () => true, localStorage: { getItem() { return null; }, setItem() {} },
        isNotFoundError: (e) => /not found/.test(e.message), console: { warn() {}, error() {} },
    };
    vm.createContext(sandbox);
    vm.runInContext(ownershipSrc, sandbox);
    vm.runInContext(versionsSrc, sandbox);
    events.get('click:.version-restore').call({ versionId: 'v1' }, { preventDefault() {}, stopPropagation() {} });
    for (let n = 0; n < 500 && (window._restoringVersion || n < 5); n++) await new Promise(setImmediate);
    for (let n = 0; n < 50; n++) await new Promise(setImmediate); // the background redeploy
    return { files, deployed, creates, toasts };
}

{
    const r = await restore();
    check('the files are restored', r.files.get(APP + '/workers/api.js') === 'OLD BACKEND' && r.files.get(APP + '/index.html') === 'OLD FRONTEND');
    check('the project\'s worker now runs the restored code', r.deployed.get('api').code === 'OLD BACKEND', JSON.stringify(r.deployed.get('api')));
    check('a worker the restored version has no source for is left alone', r.deployed.get('added-later').code === 'A WORKER V1 NEVER HAD' && !r.creates.includes('added-later'));
    check('the published site\'s worker is never touched', r.deployed.get('api-live').code === 'PUBLISHED BACKEND' && !r.creates.includes('api-live'));
    check('nothing to report when it all went through', r.toasts.length === 0, JSON.stringify(r.toasts));
}
{
    const r = await restore({ failDeploy: true });
    check('a failed redeploy leaves the restore in place', r.files.get(APP + '/workers/api.js') === 'OLD BACKEND');
    check('…and says the backend may still be running newer code', r.toasts.length === 1 && /couldn.t be redeployed/.test(r.toasts[0]), JSON.stringify(r.toasts));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll restore-workers checks passed.');
