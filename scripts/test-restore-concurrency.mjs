import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: restore copies a directory's files a few at a time ----
// restoreDirFromSnapshot made one round trip per entry, strictly in sequence,
// so restoring a project with a few dozen attachments blocked sends for tens
// of seconds. Files within a directory now copy a few at a time. On a copy
// failure no new copy starts and the in-flight ones finish before the error
// surfaces — the restore's mixed-directory handling assumes the walk stopped.
//
// Drives the real versions.js restore (VM sandbox, FS mocked with latency).

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const source = fs.readFileSync(new URL('../src/js/versions.js', import.meta.url), 'utf8');
const APP = '/alice/AppData/builder/chat1';
const ROOT = '/alice/AppData/builder/.versions/chat1';

async function restore({ failOn = null, files: count = 30 } = {}) {
    const files = new Map([[ROOT + '/index.json', JSON.stringify({ current: 'v2', versions: [{ id: 'v1' }, { id: 'v2' }] })]]);
    for (let i = 0; i < count; i++) {
        files.set(`${ROOT}/v1/assets/f${i}.png`, 'old' + i);
        files.set(`${APP}/assets/f${i}.png`, 'new' + i);
    }
    files.set(ROOT + '/v1/index.html', 'OLD');
    files.set(APP + '/index.html', 'NEW');
    let inFlight = 0, maxInFlight = 0, copies = 0, copiesAfterDone = 0, done = false;
    const alerts = [];
    const events = new Map();
    const under = (p) => [...files.keys()].some((k) => k.startsWith(p + '/'));
    const $ = (t) => ({ length: 0, on(e, s, h) { if (typeof s === 'string') events.set(e + ':' + s, h); return this; }, prop() { return this; }, data() { return t.versionId; } });
    const window = { user: { username: 'alice' }, showToast() {}, showPreviewUpdating() {} };
    const slow = () => new Promise((r) => setTimeout(r, 5));
    const puter = {
        appID: 'builder', ui: { alert: async (m) => alerts.push(String(m)) },
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
                if (done) copiesAfterDone++;
                copies++; inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
                await slow();
                inFlight--;
                if (failOn && from.endsWith(failOn)) throw new Error('storage blip');
                const dest = to + '/' + (o.newName || from.split('/').at(-1));
                if (files.has(from)) files.set(dest, files.get(from));
                else for (const [k, v] of [...files]) if (k.startsWith(from + '/')) files.set(dest + k.slice(from.length), v);
            },
            delete: async (p) => { for (const k of [...files.keys()]) if (k === p || k.startsWith(p + '/')) files.delete(k); },
        },
    };
    vm.runInNewContext(source, { window, puter, $, document: {}, currentChatId: 'chat1', currentAppDir: APP, isProcessing: false,
        puterConfirm: async () => true, localStorage: { getItem() { return null; }, setItem() {} },
        isNotFoundError: (e) => /not found/.test(e.message), console: { warn() {}, error() {} } });
    const t0 = Date.now();
    events.get('click:.version-restore').call({ versionId: 'v1' }, { preventDefault() {}, stopPropagation() {} });
    for (let n = 0; n < 5000 && (window._restoringVersion || n < 5); n++) await new Promise((r) => setTimeout(r, 1));
    done = true;
    const elapsed = Date.now() - t0;
    await new Promise((r) => setTimeout(r, 50));
    return { files, maxInFlight, copies, copiesAfterDone, alerts, elapsed };
}

{
    const r = await restore();
    check('every file is restored', [...Array(30).keys()].every((i) => r.files.get(`${APP}/assets/f${i}.png`) === 'old' + i) && r.files.get(APP + '/index.html') === 'OLD');
    check('a directory\'s files are copied a few at a time', r.maxInFlight > 1 && r.maxInFlight <= 6, `max in flight ${r.maxInFlight}`);
    check('no error shown', r.alerts.length === 0, JSON.stringify(r.alerts));
}
{
    const r = await restore({ failOn: 'f3.png' });
    check('a failed copy fails the restore', r.alerts.length === 1 && /storage blip/.test(r.alerts[0]), JSON.stringify(r.alerts));
    check('…after which no copy is still landing behind its back', r.copiesAfterDone === 0, String(r.copiesAfterDone));
    check('…and the walk stopped instead of copying the rest', r.copies < 31, `copies ${r.copies}`);
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll restore-concurrency checks passed.');
