import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: nothing edits a project while it is being published ---
// Publishing copies the working files into a frozen release and records the
// version snapshot those bytes correspond to. It refuses to START while a build
// turn or a version restore is running — but the reverse was not true: a turn
// or a restore could start while a publish was awaiting storage. The copy then
// ran against files that were changing under it (a release mixing two
// versions), and the "Published" snapshot taken after the copy captured the
// NEWER work and was saved as the published baseline, so the recorded version
// described bytes that were never public.
//
// The lock has to hold in both directions. Checks the real guards in app.js
// (sendChatMessage), versions.js (restoreVersion) and ui.js (the publish-busy
// query they share), and drives the real restore handler with a publish in
// flight to prove it refuses.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const uiSource = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const versionsSource = fs.readFileSync(new URL('../src/js/versions.js', import.meta.url), 'utf8');

// ---- ui.js exposes the query, scoped to the project being published ---------
check('ui.js exposes window.isPublishInFlight', /window\.isPublishInFlight\s*=/.test(uiSource));
check('the query is scoped per chat, not global',
    /isPublishInFlight\s*=\s*function\s*\(chatId\)[\s\S]{0,220}_publishBusyChatId/.test(uiSource),
    'it must answer for a named project, since a publish outlives a chat switch');

// ---- app.js: a send waits for the publish ----------------------------------
{
    const start = appSource.indexOf('async function sendChatMessage(');
    const body = appSource.slice(start, start + 6000);
    check('sendChatMessage refuses while this project is being published',
        /isPublishInFlight/.test(body), 'no publish guard alongside the restore guard');
    check('…and says so instead of silently doing nothing',
        /isPublishInFlight[\s\S]{0,400}showToast/.test(body));
}

// ---- versions.js: a restore waits for the publish --------------------------
{
    const start = versionsSource.indexOf('async function restoreVersion(');
    const body = versionsSource.slice(start, start + 2500);
    check('restoreVersion refuses while the project is being published',
        /isPublishInFlight/.test(body));
}

// ---- and the restore handler really does refuse ----------------------------
{
    const appDir = '/alice/AppData/builder/project';
    const root = '/alice/AppData/builder/.versions/chat1';
    const files = new Map([
        [appDir + '/index.html', 'PUBLISHING THESE BYTES'],
        [root + '/v1/index.html', 'OLD VERSION'],
        [root + '/index.json', JSON.stringify({ current: 'v2', versions: [{ id: 'v1' }, { id: 'v2' }] })],
    ]);
    const events = new Map(), alerts = [];
    let copies = 0;
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
        ui: { alert: async m => alerts.push(String(m)) },
        fs: {
            read: async path => ({ text: async () => files.get(path) }),
            write: async (path, data) => { files.set(path, data); },
            mkdir: async () => {},
            stat: async () => ({ is_dir: true }),
            readdir: async path => {
                const items = new Map();
                for (const p of files.keys()) {
                    if (!p.startsWith(path + '/')) continue;
                    const rel = p.slice(path.length + 1);
                    items.set(rel.split('/')[0], { name: rel.split('/')[0], is_dir: rel.includes('/') });
                }
                return [...items.values()];
            },
            copy: async (from, to, options = {}) => {
                copies++;
                const dest = to + '/' + (options.newName || from.split('/').at(-1));
                if (files.has(from)) files.set(dest, files.get(from));
                else for (const [p, v] of [...files]) {
                    if (p.startsWith(from + '/')) files.set(dest + p.slice(from.length), v);
                }
            },
            delete: async path => { for (const p of [...files.keys()]) if (p === path || p.startsWith(path + '/')) files.delete(p); },
        },
    };
    const win = {
        user: { username: 'alice' },
        showToast: () => {},
        showPreviewUpdating: () => {},
        // A publish for this very project is mid-flight.
        isPublishInFlight: chatId => chatId === 'chat1',
    };
    vm.runInNewContext(versionsSource, {
        window: win, puter, $, document: {},
        localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
        currentChatId: 'chat1', currentAppDir: appDir,
        isProcessing: false, puterConfirm: async () => true,
        console: { warn() {}, error() {} },
    }, { filename: 'src/js/versions.js' });

    // Un-snapshotted edits, so an unguarded restore would both copy (its safety
    // snapshot) and overwrite the very bytes the publish is copying.
    win.markProjectModified('write', 'chat1');
    events.get('click:.version-restore').call({ versionId: 'v1' }, { preventDefault() {}, stopPropagation() {} });
    for (let n = 0; n < 200 && win._restoringVersion; n++) await new Promise(setImmediate);

    check('live: the restore does not touch the files being published',
        copies === 0 && files.get(appDir + '/index.html') === 'PUBLISHING THESE BYTES',
        'copies=' + copies + ' index=' + files.get(appDir + '/index.html'));
    check('live: the user is told to wait rather than left guessing',
        alerts.length === 1 && /publish/i.test(alerts[0]), JSON.stringify(alerts));
}

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all publish-mutation-lock checks passed');
