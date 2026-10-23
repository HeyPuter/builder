import fs from 'node:fs';
import vm from 'node:vm';
import { makeGitHub } from './lib/fake-github.mjs';

// ---- Regression guard for GitHub sync's engine ------------------------------
// src/js/github-sync.js moves a project's files between Builder and GitHub,
// writing into the project (through versions.js applyExternalUpdate) and
// committing to the user's repository. Every failure here loses someone's
// work or leaks something:
//   * a send that doesn't build on GitHub's head reverts a developer's commit;
//   * a pull that writes while the project is busy loses the AI's or the
//     user's edits, and one that doesn't tell the AI lets it write a pulled
//     file back from memory;
//   * a branch move that isn't a compare-and-swap loses a race silently;
//   * following a rewritten history brings back what someone removed (often
//     a leaked key), or drops Builder's own work;
//   * a key, a deployed backend or Puter's own files reach GitHub, or a key
//     in the repository reaches the publicly served draft site;
//   * Builder's own rewrites of a page (the install block, cache-bust
//     tokens) read as edits and bounce back and forth forever.
// Runs the REAL versions.js and github-sync.js (and the pure modules they
// use) in a VM against an in-memory Puter file system and an in-memory GitHub
// (scripts/lib/fake-github.mjs). Fake keys are assembled at runtime: GitHub's
// push protection scans this repository too.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail !== undefined ? '\n       ' + detail : '')); failures++; }
}

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const helpersSrc = read('../src/js/helpers.js');
const stripAt = helpersSrc.indexOf('window.stripPreviewCacheBust = function');
const SOURCES = [
    ['github-core.js', read('../src/js/github-core.js')],
    ['manifest.js', read('../src/js/manifest.js')],
    ['worker-ownership.js', read('../src/js/worker-ownership.js')],
    ['helpers-strip.js', helpersSrc.slice(stripAt, helpersSrc.indexOf('\n};', stripAt) + 3)],
    ['versions.js', read('../src/js/versions.js')],
    ['github-sync.js', read('../src/js/github-sync.js')],
];

const USER = 'alice';
const APP = 'builder';
const CHAT = 'chat1';
const APPDIR = `/${USER}/AppData/${APP}/${CHAT}`;
const enc = (s) => new TextEncoder().encode(s);
const dec = (b) => new TextDecoder().decode(b);
const FAKE_STRIPE = 'sk_' + 'live_' + 'a1B2c3D4e5F6g7H8i9J0kL';
const FAKE_AWS = 'AKIA' + 'IOSFODNN7EXAMPLE';

function makeFs() {
    const files = new Map();
    const dirs = new Set();
    const notFoundErr = (p) => Object.assign(new Error('not found: ' + p), { code: 'subject_does_not_exist' });
    const bytesOf = (d) => (typeof d === 'string' ? enc(d) : ArrayBuffer.isView(d) ? new Uint8Array(d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength)) : enc(String(d)));
    const isDir = (p) => dirs.has(p) || [...files.keys()].some((k) => k.startsWith(p + '/'));
    return {
        files,
        writes: [],
        read: async (p) => {
            if (!files.has(p)) throw notFoundErr(p);
            const b = files.get(p);
            return { text: async () => dec(b), arrayBuffer: async () => b.slice().buffer };
        },
        async write(p, d) { files.set(p, bytesOf(d)); this.writes.push(p); return { path: p }; },
        mkdir: async (p) => { dirs.add(p); },
        stat: async (p) => {
            if (files.has(p)) return { is_dir: false, size: files.get(p).length };
            if (isDir(p)) return { is_dir: true };
            throw notFoundErr(p);
        },
        readdir: async (p) => {
            if (!isDir(p)) throw notFoundErr(p);
            const items = new Map();
            for (const [k, v] of files) {
                if (!k.startsWith(p + '/')) continue;
                const rel = k.slice(p.length + 1);
                const name = rel.split('/')[0];
                const dir = rel.includes('/');
                if (!items.has(name)) items.set(name, { name, path: p + '/' + name, is_dir: dir, size: dir ? 0 : v.length });
            }
            return [...items.values()];
        },
        copy: async (from, to, o = {}) => {
            const dest = to + '/' + (o.newName || from.split('/').pop());
            if (files.has(from)) files.set(dest, files.get(from).slice());
            else for (const [k, v] of [...files]) if (k.startsWith(from + '/')) files.set(dest + k.slice(from.length), v.slice());
        },
        delete: async (p) => {
            let found = files.delete(p);
            for (const k of [...files.keys()]) if (k.startsWith(p + '/')) { files.delete(k); found = true; }
            dirs.delete(p);
            if (!found) throw notFoundErr(p);
        },
    };
}

async function settle() { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); }

async function setup(o = {}) {
    const gh = makeGitHub();
    const pfs = makeFs();
    const kv = new Map();
    const toasts = [];
    const tracked = [];
    const imported = [];
    let clockOffset = 0;
    const RealDate = Date;
    class FakeDate extends RealDate { static now() { return RealDate.now() + clockOffset; } }
    const window = {
        FEATURE_FLAGS: { githubSync: true, codeEditor: true, webManifest: true },
        user: { username: USER, subscribed: true },
        showToast: (t) => toasts.push(String(t)),
        track: (e, p) => tracked.push([e, p]),
        refreshUserPlan: async () => window.user,
        Branding: { isSubscribed: (u) => !!(u && !u.is_temp && u.subscribed === true) },
        addEventListener() {},
        dispatchEvent() { return true; },
        CodeEditor: {
            hasUnsavedEdits: () => !!o.unsaved,
            importExternalChanges: (c, n) => { imported.push(n); return true; },
            markUnread() {},
            checkpointNow: async () => {},
            turnPrepNeeded: () => false,
            onRestoreStart() {},
            onRestoreEnd() {},
        },
        currentPreviewPath: null,
    };
    const puter = {
        appID: APP,
        fs: pfs,
        kv: {
            get: async (k) => (kv.has(k) ? JSON.parse(JSON.stringify(kv.get(k))) : null),
            set: async (k, v, opt) => { kv.set(k, JSON.parse(JSON.stringify(v))); kv.set(k + ':opts', opt || null); return true; },
            del: async (k) => kv.delete(k),
        },
        workers: { list: async () => o.workers || [] },
        ui: { alert: async () => {} },
    };
    const $ = () => {
        const q = { length: 0, on() { return q; }, prop() { return q; }, attr() { return q; }, remove() { return q; }, append() { return q; }, data() {}, trigger() { return q; } };
        return q;
    };
    const context = vm.createContext({
        window, puter, $, document: { visibilityState: 'visible', addEventListener() {} },
        navigator: { onLine: true }, fetch: gh.fetch, crypto: globalThis.crypto, TextEncoder, TextDecoder, btoa, atob,
        setTimeout, clearTimeout, CustomEvent: class { constructor(n, x) { this.type = n; this.detail = x && x.detail; } },
        console: { log() {}, warn() {}, error() {} },
        currentChatId: CHAT, currentAppDir: APPDIR, isProcessing: false, _sendSetupInFlight: false, _loadChatSeq: 0, _loadChatSettledSeq: 0,
        chatHistory: [], appendMessage() {}, saveCurrentChat: async () => {}, generateMessageId: () => 'm' + Math.random(),
        isNotFoundError: (e) => !!(e && e.code === 'subject_does_not_exist'),
        puterConfirm: async () => true,
        Date: FakeDate,
    });
    for (const [filename, src] of SOURCES) vm.runInContext(src, context, { filename });
    const W = window;
    const S = W.GitHubSync;
    // Only explicit passes in these tests, so every request count is exact.
    S.onVersionsChanged = () => {};
    const t = {
        gh, pfs, kv, toasts, tracked, imported, W, S, context,
        clock(ms) { clockOffset += ms; },
        async write(rel, data) { await pfs.write(APPDIR + '/' + rel, data); W.markProjectModified('write', CHAT); },
        async remove(rel) { await pfs.delete(APPDIR + '/' + rel); W.markProjectModified('delete', CHAT); },
        disk(rel) { const b = pfs.files.get(APPDIR + '/' + rel); return b ? dec(b) : null; },
        async version(label, extra) { return W.createProjectVersion(Object.assign({ chatId: CHAT, appDir: APPDIR, label }, extra || {})); },
        async sync() { await S.checkNow(CHAT); await settle(); },
        state() { return S.stateFor(CHAT); },
        link() { const b = pfs.files.get(`/${USER}/AppData/${APP}/.repos/${CHAT}.json`); return b ? JSON.parse(dec(b)) : null; },
        async index() { return JSON.parse(dec(pfs.files.get(`/${USER}/AppData/${APP}/.versions/${CHAT}/index.json`))); },
        mutations() { return gh.log.filter((r) => r.method !== 'GET').length; },
        head() { return gh.headCommit(gh.login, 'my-site', 'main'); },
        files() { return gh.headFiles(gh.login, 'my-site', 'main'); },
    };
    return t;
}

const PAGE = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <title>Shop</title>\n    <link rel="stylesheet" href="style.css">\n  </head>\n  <body>hi</body>\n</html>\n';

// ===== One project's story =====================================================
{
    const t = await setup({ workers: [{ name: 'pay', file_path: APPDIR + '/workers/pay.js' }, { name: 'api', file_path: APPDIR + '/workers/api.js' }] });
    const { W, S, gh } = t;
    check('the engine loaded behind its flags', !!S && typeof S.connect === 'function');

    // A built project, with everything that must never reach GitHub.
    const stamped = W.stampManifestTags(PAGE, W.deriveManifestMeta(PAGE, 'Shop'), '').replace('style.css"', 'style.css?__pcb=1712345"');
    await t.write('index.html', stamped);
    await t.write('style.css', 'body{}');
    await t.write('workers/pay.js', "router.post('/pay', async () => ({ ok: !!(await me.puter.kv.get('secret:STRIPE_SECRET_KEY')) }));");
    await t.write('workers/compute.js', 'self.onmessage = () => {};');
    await t.write('workers/api.js', "router.get('/', async () => ({ key: await me.puter.kv.get('secret:STRIPE_SECRET_KEY') ? 'set' : 'missing' }));");
    await t.write('.puter/screenshots/index.png', new Uint8Array([137, 80, 78, 71, 0, 1]));
    await t.write('manifest.json', JSON.stringify({ name: 'Shop', generator: 'builder.puter.com' }));
    await t.write('icons/icon-192.png', new Uint8Array([137, 80, 78, 71, 9]));
    await t.version('Initial build');

    // --- sign-in ---
    let refused = null;
    try { await S.auth.signInWithToken('github_pat_' + 'B'.repeat(30)); } catch (e) { refused = e; }
    check('sign-in: a token GitHub refuses is not kept', !!refused && !t.kv.has('github:auth'));
    await S.auth.signInWithToken(gh.token);
    check('sign-in: the token is kept private to Builder', t.kv.get('github:auth').login === gh.login && t.kv.get('github:auth:opts').disableSharing === true);

    // --- connect a new repository: the first save ---
    await S.connect(CHAT, { mode: 'new', name: 'My Site', isPrivate: true });
    await settle();
    let files = t.files();
    // GitHub gets the files the Code view shows. The Code view hides the
    // preview's cache tokens and shows Builder's install tags.
    check('first save: the page goes up as the Code view shows it, install tags in and cache tokens out',
        files['index.html'] === stamped.replace('style.css?__pcb=1712345"', 'style.css"') && files['index.html'].includes('puter-pwa: generated'), JSON.stringify(files['index.html']));
    check('first save: ordinary files and a browser Web Worker go up', files['style.css'] === 'body{}' && files['workers/compute.js'] === 'self.onmessage = () => {};');
    check('first save: deployed backends go up like any code', !!files['workers/api.js'] && !!files['workers/pay.js'] && files['workers/pay.js'].includes("me.puter.kv.get('secret:STRIPE_SECRET_KEY')"));
    check('first save: Builder\'s install files go up, and Puter\'s own folder stays out',
        'manifest.json' in files && 'icons/icon-192.png' in files && !Object.keys(files).some((p) => p.startsWith('.puter')), Object.keys(files).join(','));
    // GitHub can only take Builder's first save on top of a commit, so the
    // repository starts with GitHub's README. The first save removes it, in
    // one step, so neither side has it and nothing comes in right after the
    // repository was made.
    check('first save: GitHub\'s starter README goes, and nothing comes into the project', !('README.md' in files) && t.disk('README.md') === null &&
        t.imported.length === 0 && !t.context.chatHistory.some((m) => m.versionNote && /Brought in changes from GitHub/.test(m.content)),
        JSON.stringify({ github: files['README.md'], project: t.disk('README.md'), notes: t.imported.length }));
    check('first save: the commit is titled with the version label', t.head().message === 'Initial build');
    check('first save: the repository is private', gh.repos.get(gh.login + '/my-site').private === true);
    check('first save: the link record points at the new head', t.link().base.commit === t.head().sha && t.link().firstSync === null);
    check('first save: the state says saved', t.state() && t.state().kind === 'up-to-date', JSON.stringify(t.state()));

    // --- Builder ahead: one commit on top of GitHub's head ---
    let prev = t.head().sha;
    await t.write('style.css', 'body{color:red}');
    await t.version('Make text red');
    t.clock(61000);
    let before = t.mutations();
    await t.sync();
    check('send: one new commit whose parent is the previous head', t.head().parents[0] === prev && t.head().message === 'Make text red');
    check('send: only the changed file is uploaded (blob, tree, commit, branch move)', t.mutations() - before === 4, String(t.mutations() - before));
    check('send: GitHub has the change', t.files()['style.css'] === 'body{color:red}');

    // --- nothing new: a check costs no writes ---
    before = t.mutations();
    await t.sync();
    check('no change: a check writes nothing to GitHub', t.mutations() === before && t.state().kind === 'up-to-date');

    // --- a check carries the last result, so the panel keeps showing it ---
    // Opening the panel starts a check, and swapping "Saved" for "Checking"
    // and back made the panel jump twice.
    const seen = [];
    const dispatch = W.dispatchEvent;
    W.dispatchEvent = () => { seen.push(S.stateFor(CHAT)); return true; };
    await t.sync();
    W.dispatchEvent = dispatch;
    const during = seen.find((x) => x && x.kind === 'checking');
    check('check: while it runs, the last result rides along', !!during && !!during.prev && during.prev.kind === 'up-to-date' && t.state().kind === 'up-to-date', JSON.stringify(seen));

    // --- GitHub ahead: a developer pushes, Builder takes it in ---
    const dev1 = gh.push(gh.login, 'my-site', 'main', { 'about.html': '<p>about</p>', 'style.css': 'body{color:blue}' }, 'Add about page');
    before = t.mutations();
    await t.sync();
    check('take in: the new file and the changed file land in the project', t.disk('about.html') === '<p>about</p>' && t.disk('style.css') === 'body{color:blue}');
    check('take in: Builder writes nothing to GitHub', t.mutations() === before && t.head().sha === dev1);
    let idx = await t.index();
    let cur = idx.versions.find((v) => v.id === idx.current);
    check('take in: a new version labelled in Builder\'s own words', cur.label === 'From GitHub (' + dev1.slice(0, 7) + ')', cur.label);
    const pullNote = t.imported[t.imported.length - 1];
    check('take in: the AI is told which files changed, with the commit as data',
        pullNote.files.some((f) => f.path === APPDIR + '/about.html' && f.kind === 'added') &&
        pullNote.files.some((f) => f.path === APPDIR + '/style.css' && f.kind === 'changed' && f.before === 'body{color:red}' && f.after === 'body{color:blue}') &&
        pullNote.commits[0].subject === 'Add about page');
    check('take in: the note is kept in the record for other devices', t.link().aiNotes.some((n) => n.id === pullNote.id));
    check('take in: the base moves to GitHub\'s head', t.link().base.commit === dev1);
    check('take in: Puter\'s own folder in the project is untouched', !!t.disk('.puter/screenshots/index.png') && !!t.disk('manifest.json'));
    check('take in: a visible chat line in Builder\'s words', t.context.chatHistory.some((m) => m.versionNote && /Brought in changes from GitHub \(2 files\)/.test(m.content)));

    // --- both changed, different files: combined, linear history ---
    const dev2 = gh.push(gh.login, 'my-site', 'main', { 'README.md': '# My site' }, 'Docs');
    await t.write('app.js', 'console.log(1)');
    await t.version('Add app.js');
    t.clock(61000);
    await t.sync();
    files = t.files();
    check('combine: GitHub gets Builder\'s file and keeps the developer\'s', files['app.js'] === 'console.log(1)' && files['README.md'] === '# My site');
    check('combine: the project gets the developer\'s file', t.disk('README.md') === '# My site' && t.disk('app.js') === 'console.log(1)');
    // The project's newest version is the one that brought the developer's
    // file in, but the commit carries Builder's change, so it is named after
    // Builder's version, never "From GitHub".
    check('combine: the commit is named after Builder\'s version', t.head().message === 'Add app.js', t.head().message);
    check('combine: Builder\'s commit sits on top of the developer\'s (no merge commit)', t.head().parents.length === 1 && t.head().parents[0] === dev2);
    check('combine: no card for changes to different files', t.state().kind === 'up-to-date' && t.link().conflicts.length === 0);

    // --- both changed the same file: the project keeps its copy, with a card ---
    const dev3 = gh.push(gh.login, 'my-site', 'main', { 'style.css': 'body{color:green}' }, 'Dev green');
    await t.write('style.css', 'body{color:purple}');
    await t.version('Purple');
    t.clock(61000);
    await t.sync();
    check('collision: the project keeps its copy', t.disk('style.css') === 'body{color:purple}' && t.files()['style.css'] === 'body{color:purple}');
    check('collision: GitHub\'s copy stays in history, in the parent commit', t.head().parents[0] === dev3);
    check('collision: the commit says where GitHub\'s copy is', /GitHub also changed style\.css in [0-9a-f]{7}/.test(t.head().message), t.head().message);
    check('collision: a card is recorded and shown', t.link().conflicts.length === 1 && t.link().conflicts[0].path === 'style.css' && t.state().kind === 'collision');
    await t.sync();
    check('collision: the card survives the next sync (only an answer clears it)', t.link().conflicts.length === 1);
    await S.resolveConflict(CHAT, 'style.css', 'github');
    await settle();
    check('collision: "Use GitHub\'s copy" brings it back into the project and onto the branch',
        t.disk('style.css') === 'body{color:green}' && t.files()['style.css'] === 'body{color:green}' && t.link().conflicts.length === 0);

    // --- a race: someone pushes between Builder's read and its branch move ---
    await t.write('a.txt', 'one');
    await t.version('Add a');
    gh.hooks.beforeCommit = () => gh.push(gh.login, 'my-site', 'main', { 'b.txt': 'dev' }, 'Race');
    t.clock(61000);
    await t.sync();
    files = t.files();
    check('race: the losing move changes nothing, and the next try combines both', files['a.txt'] === 'one' && files['b.txt'] === 'dev' && t.disk('b.txt') === 'dev');

    // --- a rewritten history asks first and writes nothing ---
    const older = dev1;
    const diskBefore = JSON.stringify([...t.pfs.files.entries()].filter(([k]) => k.startsWith(APPDIR + '/')).map(([k, v]) => [k, dec(v)]));
    gh.forceBranch(gh.login, 'my-site', 'main', older);
    before = t.mutations();
    t.clock(61000);
    await t.sync();
    check('rewind: Builder stops and asks', t.state().kind === 'history' && t.link().pause && t.link().pause.reason === 'history');
    check('rewind: nothing is written, here or on GitHub',
        t.mutations() === before && JSON.stringify([...t.pfs.files.entries()].filter(([k]) => k.startsWith(APPDIR + '/')).map(([k, v]) => [k, dec(v)])) === diskBefore);
    check('rewind: the branch is left where the user put it', t.head().sha === older);
    await t.sync();
    check('rewind: later checks keep waiting for the choice', t.state().kind === 'history' && t.head().sha === older);
    await S.resolveHistory(CHAT, 'github');
    await settle();
    check("rewind: \"Use GitHub's version\" makes the project match GitHub exactly",
        t.disk('style.css') === 'body{color:blue}' && t.disk('app.js') === null && t.disk('README.md') === null && t.disk('a.txt') === null,
        JSON.stringify({ style: t.disk('style.css'), app: t.disk('app.js'), readme: t.disk('README.md'), a: t.disk('a.txt'), b: t.disk('b.txt') }));
    check('rewind: the removed commits stay removed', t.head().sha === older && t.state().kind === 'up-to-date', JSON.stringify(t.state()));
    idx = await t.index();
    check('rewind: the work from before is still in Version history', idx.versions.some((v) => v.label === 'Add a'));

    // --- a key in a file never holds the save, and the AI asks in the chat ---
    // Builder used to hold the version and offer buttons. Now the version
    // goes as it is, and the AI hears about the file with the user's next
    // message, once.
    await t.write('config.js', `const stripe = "${FAKE_STRIPE}";`);
    await t.version('Config');
    let notesBefore = t.imported.length;
    t.clock(61000);
    await t.sync();
    check('key: the version goes to GitHub as it is', t.state().kind === 'up-to-date' && t.files()['config.js'] === `const stripe = "${FAKE_STRIPE}";`, JSON.stringify(t.state()));
    const keyNote = t.imported.slice(notesBefore).find((n) => n.keys && n.keys.length);
    check('key: the AI is told which file, on any device', !!keyNote && keyNote.keys.join() === APPDIR + '/config.js' && keyNote.publicRepo === false &&
        t.link().aiNotes.some((n) => n.id === keyNote.id) && JSON.stringify(t.link().toldKeys) === '["config.js"]', JSON.stringify(keyNote));
    check('key: the note never carries the key', !JSON.stringify(t.link()).includes(FAKE_STRIPE));
    await t.write('config.js', `const stripe = "${FAKE_STRIPE}";\nconst more = 1;`);
    await t.version('Config again');
    notesBefore = t.imported.length;
    t.clock(61000);
    await t.sync();
    check('key: told once, not with every version of the file', t.state().kind === 'up-to-date' && !t.imported.slice(notesBefore).some((n) => n.keys && n.keys.length));
    await t.write('config.js', "const stripe = await (await fetch('/api/key')).text();");
    await t.version('Key moved');
    t.clock(61000);
    await t.sync();
    check('key: once the file goes out without it, it is forgotten', JSON.stringify(t.link().toldKeys) === '[]');

    // --- busy: never written while the AI works ---
    gh.push(gh.login, 'my-site', 'main', { 'busy.txt': 'x' }, 'While busy');
    t.context.isProcessing = true;
    await t.sync();
    check('busy: GitHub\'s change waits while the AI works', t.disk('busy.txt') === null && t.state().kind === 'waiting' && t.state().reason === 'ai');
    t.context.isProcessing = false;
    await t.sync();
    check('busy: it comes in once the AI is done', t.disk('busy.txt') === 'x');

    // --- a key from the repository comes in, and the AI warns the user ---
    // Builder used to leave such a file on GitHub. Holding it back isn't
    // Builder's call, warning about it in the chat is.
    notesBefore = t.imported.length;
    gh.push(gh.login, 'my-site', 'main', { 'server/db.js': `const aws = "${FAKE_AWS}";`, 'ok.txt': 'fine' }, 'Add db');
    await t.sync();
    check('pulled key: the file comes in like any file', t.disk('server/db.js') === `const aws = "${FAKE_AWS}";` && t.disk('ok.txt') === 'fine');
    const pulledNote = t.imported.slice(notesBefore).find((n) => n.keys && n.keys.length);
    check('pulled key: the AI is told which file, with the pull\'s own note', !!pulledNote && pulledNote.keys.join() === APPDIR + '/server/db.js' &&
        pulledNote.files.some((f) => f.path === APPDIR + '/server/db.js') && t.link().toldKeys.includes('server/db.js') &&
        t.link().aiNotes.some((n) => n.id === pulledNote.id && n.keys.length === 1), JSON.stringify(pulledNote && pulledNote.keys));
    check('pulled key: nothing is kept out for it', !t.link().keptOut.some((k) => k.path === 'server/db.js'));
    await t.write('more.txt', 'more');
    await t.version('More');
    notesBefore = t.imported.length;
    t.clock(61000);
    await t.sync();
    check('pulled key: a later send keeps it on GitHub, and the AI isn\'t told again', 'server/db.js' in t.files() && t.files()['more.txt'] === 'more' &&
        !t.imported.slice(notesBefore).some((n) => n.keys && n.keys.length));

    // --- Builder's install tags, added after a pull, go with the next change ---
    // The Code view shows them, so GitHub gets them too.
    gh.push(gh.login, 'my-site', 'main', { 'index.html': PAGE.replace('hi', 'hello') }, 'Edit page');
    await t.sync();
    const pulledPage = t.disk('index.html');
    const restamped = W.stampManifestTags(pulledPage, W.deriveManifestMeta(pulledPage, 'Shop'), '');
    await t.pfs.write(APPDIR + '/index.html', restamped); // the preview refresh, which marks nothing dirty
    await t.write('note.txt', 'n');
    await t.version('Note');
    const headBefore = t.head().sha;
    t.clock(61000);
    await t.sync();
    check('restamp: the next send carries the tags with the real change', t.head().parents[0] === headBefore && t.files()['index.html'] === restamped && t.files()['note.txt'] === 'n');

    // --- another device's saved edit that is in no version yet ---
    // It is already in the shared project folder. A pull must not write over
    // it: Builder saves it as a version first, then combines.
    await t.pfs.write(APPDIR + '/local.txt', 'from my laptop'); // no dirty mark: another device wrote it
    gh.push(gh.login, 'my-site', 'main', { 'remote.txt': 'from github' }, 'Remote file');
    t.clock(61000);
    await t.sync();
    idx = await t.index();
    check('foreign edit: it is saved as a version before anything is written',
        idx.versions.some((v) => v.label === 'Saved before update from GitHub'));
    check('foreign edit: it survives, and GitHub\'s change comes in',
        t.disk('local.txt') === 'from my laptop' && t.disk('remote.txt') === 'from github');
    check('foreign edit: it then goes to GitHub like any change', t.files()['local.txt'] === 'from my laptop' && t.files()['remote.txt'] === 'from github');

    // --- the turn rule: a pull from another device lands while a turn runs ---
    // The turn started before the pull (its version carries the older
    // pullSeq) and rewrote the pulled file from its memory of the old one.
    const seqAtTurnStart = t.link().pullSeq;
    gh.push(gh.login, 'my-site', 'main', { 'ok.txt': 'fixed on github' }, 'Fix ok.txt');
    await t.sync();
    check('turn rule: the pull landed', t.disk('ok.txt') === 'fixed on github' && t.link().pullSeq === seqAtTurnStart + 1);
    await t.write('ok.txt', 'fine, edited by the AI from memory');
    await t.version('AI turn', { pullSeq: seqAtTurnStart });
    t.clock(61000);
    await t.sync();
    check('turn rule: the AI\'s rewrite of the pulled file shows a card, not a silent revert',
        t.link().conflicts.some((c) => c.path === 'ok.txt' && c.kind === 'turn') && t.state().kind === 'collision', JSON.stringify(t.link().conflicts));
    check('turn rule: the commit names the file and where GitHub\'s copy is', /GitHub also changed ok\.txt/.test(t.head().message), t.head().message);
    await S.resolveConflict(CHAT, 'ok.txt', 'keep');
    await settle();
    check('turn rule: "Keep this copy" closes the card', t.link().conflicts.length === 0);

    // --- a lapsed plan pauses both ways, with no requests ---
    W.user.subscribed = false;
    const requests = gh.log.length;
    await t.sync();
    check('lapsed: no request reaches GitHub', gh.log.length === requests && t.state().kind === 'lapsed');
    check('lapsed: the pause is remembered for the next sync', t.link().lastPause === 'lapsed');
    W.user.subscribed = true;

    // --- delete forgets the link, never the repository ---
    await S.forgetProject(CHAT);
    check('delete: the link record is gone and the repository stays', t.link() === null && !!gh.repos.get(gh.login + '/my-site'));
}

// ===== Every file syncs, and an older record keeps what GitHub has =====
// GitHub gets the files the Code view shows, .github, __workers, .env and
// Builder's install files included. A record whose base was agreed while
// Builder still left some of those out reads that base under the old rules
// once, so a file only GitHub had comes in instead of being deleted there.
{
    const t = await setup();
    const { S, gh } = t;
    await t.write('index.html', '<p>site</p>');
    await t.version('Site');
    await S.auth.signInWithToken(gh.token);
    await S.connect(CHAT, { mode: 'new', name: 'My Site', isPrivate: true });
    await settle();
    // A developer adds files Builder used to leave out, and the record says
    // Builder agreed to that commit under the old rules.
    gh.push(gh.login, 'my-site', 'main', { '.github/workflows/ci.yml': 'on: push', '__workers/api.worker.js': 'export default {}', '.env.example': 'A=1' }, 'Tooling');
    const head = await S.api.getHead(t.link().repo, 'main');
    const old = t.link();
    old.base = { commit: head.commit, tree: head.tree, versionId: null, at: Date.now() };
    delete old.rules;
    await t.pfs.write(`/${USER}/AppData/${APP}/.repos/${CHAT}.json`, JSON.stringify(old));
    t.clock(61000);
    await t.sync();
    let files = t.files();
    check('older record: what Builder used to leave out comes in, and stays on GitHub',
        t.disk('.github/workflows/ci.yml') === 'on: push' && t.disk('__workers/api.worker.js') === 'export default {}' && t.disk('.env.example') === 'A=1' &&
        files['.github/workflows/ci.yml'] === 'on: push' && files['__workers/api.worker.js'] === 'export default {}' && files['.env.example'] === 'A=1',
        JSON.stringify({ disk: [t.disk('.github/workflows/ci.yml'), t.disk('__workers/api.worker.js'), t.disk('.env.example')], github: Object.keys(files) }));
    check('older record: it is on the current rules after that', t.link().rules === 2, String(t.link().rules));
    // From here they sync like any file, both ways.
    let notesBefore = t.imported.length;
    await t.write('__workers/api.worker.js', 'export default { fetch() {} }');
    await t.write('.env', 'TOKEN=abc');
    await t.version('Worker and env');
    t.clock(61000);
    await t.sync();
    files = t.files();
    check('every file: __workers and .env go up like any file', files['__workers/api.worker.js'] === 'export default { fetch() {} }' && files['.env'] === 'TOKEN=abc');
    const envNote = t.imported.slice(notesBefore).find((n) => n.keys && n.keys.length);
    check('every file: a key file by its name alone gets the AI\'s warning', !!envNote && envNote.keys.includes(APPDIR + '/.env') && !envNote.keys.includes(APPDIR + '/__workers/api.worker.js'),
        JSON.stringify(envNote && envNote.keys));
    // The common older record has nothing for Builder to bring in. One pass
    // still moves it to the current rules, without a write anywhere.
    const again = t.link();
    delete again.rules;
    await t.pfs.write(`/${USER}/AppData/${APP}/.repos/${CHAT}.json`, JSON.stringify(again));
    const writesBefore = t.mutations();
    const headBefore = t.head().sha;
    t.clock(61000);
    await t.sync();
    check('older record: with nothing to bring in, it moves to the current rules and writes nothing',
        t.link().rules === 2 && t.mutations() === writesBefore && t.head().sha === headBefore && t.state().kind === 'up-to-date',
        JSON.stringify({ rules: t.link().rules, state: t.state() }));
}

// ===== Backend code with a key written in it goes to GitHub too =====
// Older projects wrote keys into their backend's code. That file used to be
// left out without a word. Now it goes up like any code, and the AI asks the
// user about the key in the chat.
{
    const t = await setup({ workers: [{ name: 'pay', file_path: APPDIR + '/workers/pay.js' }] });
    const { S, gh } = t;
    await t.write('index.html', PAGE);
    await t.write('workers/pay.js', `const KEY = "${FAKE_STRIPE}";\nrouter.post('/pay', async () => ({ ok: !!KEY }));`);
    await t.version('Shop');
    await S.auth.signInWithToken(gh.token);
    await S.connect(CHAT, { mode: 'new', name: 'My Site', isPrivate: false });
    await settle();
    const files = t.files();
    check('backend key: the backend goes up like any code, nothing held', t.state().kind === 'up-to-date' && !!files['workers/pay.js'] && files['index.html'] === PAGE, JSON.stringify(t.state()));
    const note = t.imported.find((n) => n.keys && n.keys.length);
    check('backend key: the AI is told to ask, and that the repository is public', !!note && note.keys.join() === APPDIR + '/workers/pay.js' && note.publicRepo === true, JSON.stringify(t.imported));
}

// ===== The wiring ==============================================================
{
    const src = read('../src/js/github-sync.js');
    check('wiring: branches move only through the compare-and-swap', src.includes('updateRefs') && src.includes('beforeOid') && !/git\/refs/.test(src) && !/force:\s*true/.test(src));
    check('wiring: pulls write files, never copy or move over them', !/puter\.fs\.(copy|move)\(/.test(read('../src/js/versions.js').slice(read('../src/js/versions.js').indexOf('window.applyExternalUpdate'), read('../src/js/versions.js').indexOf('// ----- panel UI'))));
    check('wiring: the plan is checked fresh at the start of every pass', /async function pass\(chatId, trigger\) \{\s*const user = window\.refreshUserPlan/.test(src));
    check('wiring: the sign-in is stored with disableSharing', /puter\.kv\.set\(AUTH_KEY, value, \{ disableSharing: true \}\)/.test(src));
    check('wiring: the engine needs the Code view flag', /!F\.githubSync \|\| !F\.codeEditor/.test(src));
    // The panel: clicking Connect closed it and lost the pasted token. The
    // action redrew the panel at once, which emptied the token field and took
    // the clicked button out of the page, so the close-on-outside-click
    // handler read the click as outside.
    const ui = read('../src/js/github-ui.js');
    const actBody = ui.slice(ui.indexOf('async function act(fn)'), ui.indexOf('async function loadRepos()'));
    check('panel: an action disables controls in place and never redraws before it runs', !/render\(\);\s*try \{/.test(actBody) && /prop\('disabled', true\)/.test(actBody));
    check('panel: clicks inside the panel stop there', /const on = \(selector, handler\) => \$\(document\)\.on\('click', '\.preview-github-panel ' \+ selector, function \(e\) \{\s*e\.preventDefault\(\);\s*e\.stopPropagation\(\);/.test(ui));
    check('panel: a click on a removed element is not "outside"', /document\.documentElement\.contains\(e\.target\)/.test(ui));
    check('panel: the token is read before the action starts', /const token = String\(\$\('\.preview-github-panel \.gh-token-input'\)\.val\(\)[^;]*;\s*act\(/.test(ui));
    check('panel: typed values survive a redraw', /value="\$\{esc\(_form\.token\)\}"/.test(ui) && /value="\$\{esc\(_form\.name\)\}"/.test(ui) && /_form\.isPrivate \? ' checked' : ''/.test(ui));
    // There was no way to disconnect GitHub while the project wasn't saving
    // to it, and once GitHub was disconnected a project set up to save showed
    // a dot it couldn't get rid of without connecting again.
    const accountRow = ui.slice(ui.indexOf('function accountRow()'), ui.indexOf('function connectForm('));
    const connectBody = ui.slice(ui.indexOf('function connectForm('), ui.indexOf('function stateView('));
    const renderBody = ui.slice(ui.indexOf('function render()'), ui.indexOf('function paintButton()'));
    check('panel: Disconnect GitHub signs out after asking', /gh-signout">Disconnect GitHub</.test(accountRow) &&
        /on\('\.gh-signout', \(\) => act\(async \(\) => \{\s*const ok = [^;]*puterConfirm\('Disconnect GitHub[^;]*;\s*if \(!ok\) return;\s*await Sync\.auth\.signOut\(\);/.test(ui));
    check('panel: Disconnect GitHub shows wherever Builder is signed in', connectBody.includes('accountRow()') &&
        (renderBody.match(/accountRow\(\)/g) || []).length === 2);
    check('panel: a project can stop saving while GitHub is disconnected', /body = linked \? tokenForm\(link\) \+ '<div class="gh-footer">' \+ stopRow\(\)/.test(renderBody));
    check('panel: a check keeps the last result up, and only the Sync button says so',
        /const shown = checking && now\.prev \? now\.prev : now;/.test(renderBody) &&
        /const label = syncing \? 'Syncing…' : shown && shown\.kind === 'up-to-date' \? 'Synced' : 'Sync';/.test(renderBody) &&
        /if \(holdState\) \$panel\.find\('\.gh-state'\)\.find\('button, input, select'\)\.prop\('disabled', true\);/.test(renderBody));
    // The repository is the link to GitHub, in place of a separate link row
    // and an "Open on GitHub" button, and Sync stands in for every state's
    // "Check again".
    check('panel: the repository (branch) is the link, with no other way out to GitHub',
        /<a class="gh-link gh-repo" href="\$\{esc\(repoUrl\(link\)\)\}"[^>]*>\$\{esc\(repoLabel\(link\)\)\} \(\$\{esc\(link\.branch\)\}\)<\/a>/.test(renderBody) &&
        !/Open on GitHub|Check now|Check again|'Try now'/.test(ui.replace(/\/\/[^\n]*/g, '')));
    check('panel: one Sync handler, and nothing else on the old check class', /on\('\.gh-sync', \(\) => Sync\.checkNow\(chatId\(\)\)\);/.test(ui) && !/on\('\.gh-check'/.test(ui));
    // Builder only saves a project to a new repository it creates for it.
    // Using an existing one raised questions about whose files, branch and
    // history win, so the panel never offers it and the engine can't do it.
    check('panel: a project only ever saves to a new repository', !/gh-mode|gh-repo-select|gh-branch-select|Use a repository I already have/.test(ui) &&
        /await Sync\.connect\(chatId\(\), \{ name, isPrivate \}\);/.test(ui) && /Repository name<input/.test(connectBody) &&
        !/mode === 'existing'|getRepo|listRepos|listBranches|initEmpty|findDoubleLink/.test(src));
    check('panel: the suggested name starts over for another project',
        /if \(_form\.formChat !== chatId\(\)\) Object\.assign\(_form, \{ name: null, isPrivate: true, formChat: chatId\(\) \}\);/.test(ui));
    check('panel: the title carries a Beta badge', /<span class="github-panel-title">GitHub integration<span class="beta-badge">Beta<\/span><\/span>/.test(ui));
    const uiMain = read('../src/js/ui.js');
    const upgrade = uiMain.slice(uiMain.indexOf('function openUpgradeModal('), uiMain.indexOf('window.openUpgradeModal = openUpgradeModal;'));
    check('upgrade: the dialog lists GitHub, with its Beta badge, first when opened from its panel',
        /\.\.\.\(window\.GitHubSync \? \[githubPerk\] : \[\]\)/.test(upgrade) && /Save your projects to GitHub<span class="beta-badge">Beta<\/span>/.test(upgrade) &&
        /: source === 'github' && window\.GitHubSync \? githubPerk : null;/.test(upgrade) && /if \(lead\) perkList\.unshift\(perkList\.splice\(perkList\.indexOf\(lead\), 1\)\[0\]\);/.test(upgrade));
    // Builder never holds a version back for a key, and the panel has no
    // buttons for one. The AI asks the user in the chat instead.
    check('panel: no buttons hold a key back', !/gh-store-key|gh-keep-out|gh-allow-secret/.test(ui) && !/backend file, which Builder never sends/.test(ui));
    check('wiring: a key in a file never stops the save', !/kind: 'secret', tier: block/.test(src) && /await tellAboutKeys\(chatId, appDir, link, keyed, clean\);/.test(src));
    // The Code view is stubbed above, so its half of the key note is checked
    // by its source. A key note reaches the AI, and never holds an automatic
    // fix of an error the way changed files do.
    const editorSrc = read('../src/js/code-editor.js');
    check('wiring: the Code view carries key notes to the AI, without holding automatic fixes',
        /for \(const k of note\.keys \|\| \[\]\)/.test(editorSrc) && /keys: x\.keys,\s*publicRepo: x\.publicRepo,/.test(editorSrc) &&
        /if \(\(externalPending\(p\) \|\| keysPending\(p\)\) && window\.GitHubCore\)/.test(editorSrc) &&
        /function externalPending\(p\) \{\s*return Object\.keys\(p\.external\.files\)\.length > 0 \|\| p\.external\.collisions\.length > 0;\s*\}/.test(editorSrc));
    const keptOut = ui.slice(ui.indexOf('function keptOutList('), ui.indexOf('function render()'));
    check('panel: the kept-out list shows only for files actually kept out, without the general note',
        /if \(!items\) return '';/.test(keptOut) && !/always stay in Builder/.test(ui));
    const vite = read('../vite.config.js');
    const scripts = vite.slice(vite.indexOf('const SCRIPTS = ['), vite.indexOf('];', vite.indexOf('const SCRIPTS = [')));
    check('wiring: github-sync ships after versions.js and code-editor.js',
        scripts.indexOf("'js/github-sync.js'") > scripts.indexOf("'js/code-editor.js'") && scripts.indexOf("'js/github-sync.js'") > scripts.indexOf("'js/versions.js'"));
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll github-sync checks passed');
process.exit(failures ? 1 : 0);
