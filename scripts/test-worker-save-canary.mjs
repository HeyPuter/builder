import fs from 'node:fs';

// ---- Regression guard: the AI updates a worker by saving its file -----------
// A deployed worker serves its source file, workers/<name>.js, and Puter
// redeploys it when that file is saved. The AI didn't know that. create_worker
// was the only update path it was told about, so every backend change resent the
// whole worker to create_worker, which is slow (issue #35). Now edit, multi_edit
// and write (and Code view saves and GitHub pulls) just save the file. To know
// the new code is live, the save stamps a canary route with a fresh token onto
// the start of line 1 and waits until the worker answers it. A save that
// doesn't parse leaves the previous code running with no error from Puter, so
// the code is compiled (not run) first, and a save that doesn't compile is
// reported at once. The canary is hidden from the AI and the user, like the
// preview's cache-bust tokens.
//
// Runs the REAL tools, the REAL ownership rule, the REAL backend-file rule
// (EditorCore), the REAL canary helpers (helpers.js, tools.js) and the REAL
// GitHub normalization against an in-memory filesystem, a fake worker list and
// a fake worker edge that serves whatever a save deployed.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
function slice(src, from, to, label) {
    const a = src.indexOf(from);
    const b = src.indexOf(to, a + from.length);
    if (a < 0 || b < 0) throw new Error('could not extract ' + label);
    return src.slice(a, b);
}

const HELP = read('../src/js/helpers.js');
const PATHS = slice(HELP, 'window.normalizePosixPath =', '// ---- Per-path file-write serialization', 'the path-sandbox helpers');
const CANARY = slice(HELP, '// ---- Worker deploy canary', '// ---- Preview sub-resource cache-busting', 'the canary helpers');
const TOOLS = slice(read('../src/js/tools.js'), '// Saving a deployed worker', 'window.findTool = function', 'the worker save helpers');

// --- In-memory filesystem, fake workers, fake worker edge --------------------
const ROOT = '/nj/AppData/app-uid/chat_abc';
const OTHER = '/nj/AppData/app-uid/chat_xyz';
const FILES = new Map();
let WORKERS = [];
let LIST_THROWS = false;
// What each worker URL serves at the canary route, and how many more canary
// reads a save takes to reach the edge (propagation).
const SERVED = new Map();
let PROPAGATION_READS = 0;
let DEPLOYS = true; // false: Puter keeps the previous code (a save it rejected)
let pending = null;
const calls = { listed: 0, created: 0, canaryReads: 0 };
const reset = () => {
    calls.listed = 0; calls.created = 0; calls.canaryReads = 0;
    LIST_THROWS = false; PROPAGATION_READS = 0; DEPLOYS = true; pending = null;
};
const TOKEN_RE = /router\.get\('\/__builder\/canary', \(\) => '([a-z0-9]+)'\);/;
const puter = {
    fs: {
        read: async (p) => {
            if (!FILES.has(p)) throw { code: 'subject_does_not_exist', message: 'Subject does not exist' };
            const text = FILES.get(p);
            return { text: async () => text };
        },
        mkdir: async () => {},
    },
    workers: {
        list: async () => { calls.listed++; if (LIST_THROWS) throw new Error('network down'); return WORKERS.slice(); },
        create: async (name) => { calls.created++; return { success: true, url: `https://${name}.puter.work` }; },
    },
};
// Puter redeploys a worker when its source file is written.
function onWrite(p, data) {
    const w = WORKERS.find(x => x.file_path === p);
    if (!w || !DEPLOYS) return;
    const m = TOKEN_RE.exec(data);
    pending = { url: w.url, token: m ? m[1] : 'none', reads: PROPAGATION_READS };
}
async function fakeFetch(url) {
    const base = url.slice(0, url.indexOf('/__builder/canary'));
    if (url.indexOf('/__builder/canary?') === -1) throw new Error('unexpected fetch ' + url);
    calls.canaryReads++;
    if (pending && pending.url === base) {
        if (pending.reads-- <= 0) { SERVED.set(base, pending.token); pending = null; }
    }
    return { ok: true, text: async () => SERVED.get(base) || 'old' };
}
const win = {
    tools: [],
    withFileLock: (_p, fn) => Promise.resolve().then(fn),
    writeFileVerified: async (p, d) => { FILES.set(p, d); onWrite(p, d); },
    applyFileEdit: (c, o, n) => {
        if (!c.includes(o)) throw new Error('old_content not found in file.');
        return c.replace(o, n);
    },
};
new Function('window', read('../src/js/editor-core.js'))(win);
new Function('window', read('../src/js/worker-ownership.js'))(win);
new Function('window', read('../src/js/github-core.js'))(win);
new Function('window', 'puter', 'fetch', 'currentAppDir',
    PATHS + '\n' + CANARY + '\n' + TOOLS + '\n'
    + read('../src/tools/fs/edit.js') + '\n' + read('../src/tools/fs/multi_edit.js') + '\n'
    + read('../src/tools/fs/write.js') + '\n' + read('../src/tools/fs/read.js') + '\n'
    + read('../src/tools/workers/create_worker.js'))(win, puter, fakeFetch, undefined);
win.workerCanaryTiming.pollMs = 1;
win.workerCanaryTiming.limitMs = 80;
const tool = (name) => win.tools.find((t) => t.function.name === name);
const st = { appDir: ROOT };
const own = (name) => ({ name, url: `https://${name}.puter.work`, file_path: `${ROOT}/workers/${name}.js` });
const theirs = (name) => ({ name, url: `https://${name}.puter.work`, file_path: `${OTHER}/workers/${name}.js` });
const API = `${ROOT}/workers/api.js`;
const v1 = "router.get('/v', async () => ({ version: 'one' }));\nrouter.get('/*rest', async () => 'not found');\n";
const tokenOf = (text) => (TOKEN_RE.exec(text) || [])[1];
const strip = win.stripWorkerCanary;

// === stamp / strip ===========================================================
{
    const compiles = (code) => { try { new Function(code); return true; } catch (e) { return false; } };
    const samples = [v1, '', 'x', "'use strict';\nrouter.get('/a', () => 1);\n", "﻿router.get('/a', () => 1);", "\"use strict\"\nlet a;",
        "'use strict'; let a = 1;", "'use strict'\nrouter.get('/a', () => 1);", "// notes\n/* more */\n'use strict';\nlet a;", "'use strict'.length;\nlet a;"];
    const roundTrips = samples.map(t => strip(win.stampWorkerCanary(t, 'abc123')) === t);
    check('strip undoes stamp exactly, spaces included', roundTrips.every(Boolean), JSON.stringify(roundTrips));
    const compile = samples.filter(t => compiles(t)).map(t => compiles(win.stampWorkerCanary(t, 'abc123')));
    check('the stamped code compiles whenever the code did, a directive with no semicolon included', compile.every(Boolean), JSON.stringify(compile));
    const stamped = win.stampWorkerCanary(v1, 'abc123');
    check('the canary is the first route, on line 1, so a catch-all can not shadow it',
        stamped.startsWith(";router.get('/__builder/canary', () => 'abc123');router.get('/v'"), stamped);
    check('…and adds no line, so error line numbers still match the file', stamped.split('\n').length === v1.split('\n').length);
    // A with statement is a SyntaxError only in strict code, so it shows
    // whether the directive still applies.
    const stillStrict = (t) => !compiles(win.stampWorkerCanary(t, 't1') + '\nwith ({}) {}');
    check("a leading 'use strict' stays in force, with or without a semicolon, after comments too",
        stillStrict("'use strict';\nlet a;") && stillStrict("'use strict'\nlet a;") && stillStrict("// notes\n/* more */\n'use strict';\nlet a;")
        && win.stampWorkerCanary("'use strict'\nlet a;", 't1').startsWith("'use strict';router.get('/__builder/canary'"));
    check("…and a string that only starts like one isn't taken for it",
        win.stampWorkerCanary("'use strict'.length;", 't1').startsWith(";router.get"));
    check('restamping replaces the old canary', (win.stampWorkerCanary(stamped, 'def456').match(/__builder\/canary/g) || []).length === 1
        && tokenOf(win.stampWorkerCanary(stamped, 'def456')) === 'def456');
    check('strip leaves text without a canary as the same string', strip(v1) === v1);
    const legacy = "router.get('/__builder/canary', () => 'old1'); " + v1;
    check('the shape an earlier build wrote is stripped too, and replaced on the next stamp',
        strip(legacy) === v1 && strip("'use strict'; router.get('/__builder/canary', () => 'old1');\nlet a;") === "'use strict';\nlet a;"
        && (win.stampWorkerCanary(legacy, 'new1').match(/__builder\/canary/g) || []).length === 1);
}

// === edit on a deployed worker's source ======================================
WORKERS = [own('api')];
FILES.set(API, v1);
reset();
{
    const r = await tool('edit').exec({ path: API, old_content: "'one'", new_content: "'two'" }, st);
    const disk = FILES.get(API);
    check('edit: the file is saved with the change', strip(disk) === v1.replace("'one'", "'two'"), JSON.stringify(disk));
    check('edit: the save carries a canary token', !!tokenOf(disk));
    check('edit: the worker is never redeployed with create()', calls.created === 0);
    check('edit: the result says the change is live, and where',
        r.success === true && r.worker && r.worker.live === true && r.worker.name === 'api'
        && r.worker.url === 'https://api.puter.work', JSON.stringify(r));
}
reset();
PROPAGATION_READS = 3;
{
    const r = await tool('edit').exec({ path: API, old_content: "'two'", new_content: "'three'" }, st);
    check('a save that takes a few reads to reach the edge is still confirmed live',
        r.worker && r.worker.live === true && calls.canaryReads === 4, JSON.stringify({ r, reads: calls.canaryReads }));
    check('a second save matches against the clean code and leaves one canary',
        strip(FILES.get(API)).includes("'three'") && (FILES.get(API).match(/__builder\/canary/g) || []).length === 1);
}
reset();
{
    // The model's old_content can start at the very start of line 1, where
    // the canary sits.
    const r = await tool('edit').exec({ path: API, old_content: "router.get('/v'", new_content: "router.get('/version'" }, st);
    check('an edit of the start of line 1 still matches', r.success === true && strip(FILES.get(API)).startsWith("router.get('/version'"));
}

// === the AI never sees the canary ============================================
{
    const text = await tool('ReadTextFile').exec({ path: API }, st);
    check('read: the canary is hidden', !/__builder/.test(text) && text.startsWith("router.get('/version'"), text);
}

// === a save that doesn't go live =============================================
reset();
DEPLOYS = false;
{
    let r, err;
    try { r = await tool('edit').exec({ path: API, old_content: "'three' }));", new_content: "'three' });" }, st); } catch (e) { err = e; }
    check('broken save: the edit still succeeds (the file did change)', !err && r && r.success === true, err && err.message);
    check('broken save: live is false, with the syntax error',
        r && r.worker && r.worker.live === false && /^SyntaxError: /.test(r.worker.error), JSON.stringify(r));
    check('broken save: …and says the previous code is still running',
        r && r.worker && /still running its previous code/.test(r.worker.note), JSON.stringify(r));
    check('broken save: reported at once, without waiting on the canary', calls.canaryReads === 0, String(calls.canaryReads));
}
reset();
DEPLOYS = false;
FILES.set(API, v1);
{
    const r = await tool('write').exec({ path: API, data: v1.replace('one', 'four') }, st);
    check('slow save: code that parses but is not served yet is reported as not live yet, without an error',
        r.worker && r.worker.live === false && !r.worker.error && /may still be updating/.test(r.worker.note), JSON.stringify(r));
}
reset();
DEPLOYS = false;
{
    const ac = new AbortController();
    ac.abort();
    await tool('write').exec({ path: API, data: v1 }, { appDir: ROOT, abortController: ac });
    check('a stopped turn stops waiting after one read', calls.canaryReads === 1, String(calls.canaryReads));
}
reset();
DEPLOYS = false;
{
    // Puter runs a worker as a plain script and rejects top-level await.
    const r = await tool('write').exec({ path: API, data: 'await Promise.resolve();\n' + v1 }, st);
    check('top-level await is reported at once, as Puter rejects it',
        r.worker && r.worker.live === false && /await/.test(r.worker.error) && calls.canaryReads === 0, JSON.stringify(r));
}

// === several saves of a file in one reply ===================================
// Only the last is waited on: the others report nothing yet, and an edit
// halfway through a change isn't compiled.
reset();
FILES.set(API, v1);
{
    const later = { appDir: ROOT, laterToolCalls: [{ name: 'edit', input: { path: API, old_content: 'x', new_content: 'y' } }] };
    const r = await tool('edit').exec({ path: API, old_content: "'one' }));", new_content: "'one' });" }, later);
    check('a save the same reply makes again is not waited on or compiled',
        r.success === true && r.worker && !('live' in r.worker) && /later call in this reply/.test(r.worker.note) && calls.canaryReads === 0, JSON.stringify(r));
    check('…but it still carries a canary', !!tokenOf(FILES.get(API)));
    const other = { appDir: ROOT, laterToolCalls: [{ name: 'edit', input: { path: `${ROOT}/index.html` } }, { name: 'ReadTextFile', input: { path: API } }] };
    const r2 = await tool('edit').exec({ path: API, old_content: "'one' });", new_content: "'one' }));" }, other);
    check('later calls that save other files, or only read this one, still get the wait', r2.worker && r2.worker.live === true, JSON.stringify(r2));
}

// === a copy of a worker's source =============================================
{
    FILES.set(`${ROOT}/backup/api.js`, FILES.get(API));
    const text = await tool('ReadTextFile').exec({ path: `${ROOT}/backup/api.js` }, st);
    check('read: a copy of a worker source elsewhere shows no canary either', !/__builder/.test(text) && text.length > 0, text);
}

// === saves that overlap =====================================================
// A Code view save and an AI save of the same file can overlap. Once the
// later one is live, the earlier one's wait is over too.
reset();
{
    const url = 'https://overlap.puter.work';
    const older = '00000000a' + 'aaaaaa', newer = '00000000b' + 'bbbbbb';
    SERVED.set(url, newer);
    const r = await win.workerSaveResult({ name: 'overlap', url, token: older }, v1);
    check('a later save of the same file going live ends an earlier save\'s wait', r.live === true, JSON.stringify(r));
    SERVED.set(url, older);
    const r2 = await win.workerSaveResult({ name: 'overlap', url, token: newer }, v1);
    check('…but an earlier save still being served does not count for a later one', r2.live === false, JSON.stringify(r2));
    const target = await win.workerSaveTarget(API, st);
    check('the lookup makes no token, so tokens follow the order saves are written', target && !('token' in target), JSON.stringify(target));
    win.stampWorkerSave(target, v1);
    const t = target.token;
    check('tokens start with the time they were made, padded to sort', /^[0-9a-z]{15}$/.test(t)
        && parseInt(t.slice(0, 9), 36) <= Date.now() && parseInt(t.slice(0, 9), 36) > Date.now() - 5000, t);
}

// === multi_edit and write ====================================================
reset();
FILES.set(API, v1);
{
    const r = await tool('multi_edit').exec({ path: API, edits: [{ old_content: "'one'", new_content: "'five'" }] }, st);
    check('multi_edit: stamps the canary and reports live', r.success === true && r.edits_applied === 1
        && r.worker && r.worker.live === true && !!tokenOf(FILES.get(API)) && calls.created === 0, JSON.stringify(r));
}
reset();
{
    const r = await tool('write').exec({ path: API, data: v1 }, st);
    check('write: stamps the canary and reports live', r.success === true && r.worker && r.worker.live === true
        && strip(FILES.get(API)) === v1 && calls.created === 0, JSON.stringify(r));
}

// === files that are not a deployed worker's source ===========================
reset();
FILES.set(`${ROOT}/index.html`, '<p>a</p>');
{
    const r = await tool('edit').exec({ path: `${ROOT}/index.html`, old_content: 'a', new_content: 'b' }, st);
    check('a page edit never looks up workers or reads a canary', calls.listed === 0 && calls.canaryReads === 0);
    check('…and its result and file are unchanged', r.success === true && !('worker' in r) && FILES.get(`${ROOT}/index.html`) === '<p>b</p>');
}
reset();
{
    const code = 'self.onmessage = () => {};';
    const r = await tool('write').exec({ path: `${ROOT}/workers/helper.js`, data: code }, st);
    check('a workers/ file no deployed worker runs (a browser Web Worker) gets no canary',
        FILES.get(`${ROOT}/workers/helper.js`) === code && !('worker' in r) && calls.canaryReads === 0, JSON.stringify(r));
}
reset();
WORKERS = [own('api'), theirs('billing')];
{
    const r = await tool('write').exec({ path: `${ROOT}/workers/billing.js`, data: v1 }, st);
    check("a file named after another project's worker gets no canary", FILES.get(`${ROOT}/workers/billing.js`) === v1 && !('worker' in r));
}

// === the worker lookup fails ================================================
reset();
LIST_THROWS = true;
FILES.set(API, win.stampWorkerCanary(v1, 'oldtok'));
{
    let r, err;
    try { r = await tool('edit').exec({ path: API, old_content: "'one'", new_content: "'six'" }, st); } catch (e) { err = e; }
    check('lookup failure: the edit still succeeds, written clean', !err && r && r.success === true && FILES.get(API) === v1.replace("'one'", "'six'"), err && err.message);
    check('lookup failure: says it could not check, without claiming the save is live',
        r && r.worker && r.worker.live === false && !r.worker.name && /couldn't look up/.test(r.worker.note), JSON.stringify(r));
}

// === create_worker hands back the file to edit ================================
reset();
WORKERS = [];
{
    const r = await tool('create_worker').exec({ name: 'fresh', code: v1 }, st);
    check('create_worker: the result names the source file to edit later', r.file_path === `${ROOT}/workers/${r.name}.js` && /^fresh-/.test(r.name), JSON.stringify(r));
}

// === GitHub never gets the canary ============================================
{
    const G = win.GitHubCore;
    const enc = (s) => new TextEncoder().encode(s);
    const dec = (b) => new TextDecoder().decode(b);
    const deps = { stripCacheBust: () => { throw new Error('not a page'); }, stripWorkerCanary: strip };
    check('GitHub: a worker source is pushed without its canary',
        dec(G.normalizeForGit('workers/api.js', enc(win.stampWorkerCanary(v1, 'tok9')), deps)) === v1);
    const plain = enc(v1);
    check('GitHub: a worker source without a canary is the same bytes', G.normalizeForGit('workers/api.js', plain, deps) === plain);
    check('GitHub: a copy of a worker source elsewhere is pushed without the canary too',
        dec(G.normalizeForGit('src/api.js', enc(win.stampWorkerCanary(v1, 'tok9')), deps)) === v1);
    const css = enc('a{}');
    check('GitHub: a file that is not a script is never read', G.normalizeForGit('a.css', css, deps) === css);
}

// === everywhere else a worker source is shown ================================
{
    const editor = read('../src/js/code-editor.js');
    check('the Code view hides the canary in every file',
        /function stripTokens\(abs, text\) \{\s*if \(window\.stripWorkerCanary\) text = window\.stripWorkerCanary\(text\);/.test(editor));
    check('the project download hides the canary, and keeps any other file as its bytes',
        /const clean = window\.stripWorkerCanary\(raw\);\s*if \(clean !== raw\) text = clean;[\s\S]{0,40}zip\.file\(item\.name, text != null \? text : blob\);/.test(HELP));
    check('search hides the canary in every file',
        read('../src/tools/fs/search_files.js').includes('if (window.stripWorkerCanary) text = window.stripWorkerCanary(text);'));
    check("the pull note's before side is the file as git has it, with no canary",
        /if \(keepBytes && bytes\.length <= NOTE_TEXT_LIMIT\) bytesOf\[rel\] = norm;/.test(read('../src/js/github-sync.js')));
    check('the published backend is written with the canary stripped',
        /const source = await puter\.fs\.read\(worker\.file_path\)\.then\(d => d\.text\(\)\);\s*await puter\.fs\.write\(sourcePath, window\.stripWorkerCanary\(source\), \{ overwrite: true \}\);/.test(read('../src/js/ui.js')));
    const sync = read('../src/js/github-sync.js');
    check('GitHub sync passes the canary stripper', sync.includes('stripWorkerCanary: window.stripWorkerCanary,'));
    check('a GitHub pull writes a deployed backend with a canary, before the files are written',
        /const worker = w\.text != null \? await window\.workerSaveTarget\?\.\(w\.path, \{ appDir \}\) : null;[\s\S]{0,300}window\.stampWorkerSave\(worker,[\s\S]{0,120}w\.bytes = new TextEncoder\(\)\.encode\(code\);[\s\S]*?window\.applyExternalUpdate\(/.test(sync));
    check('…then waits on it, and never redeploys with create()',
        sync.includes('window.workerSaveResult?.(s.worker, s.code)') && !/redeployWorkerSource|workers\.create/.test(sync));
}

// === what the model is told =================================================
{
    const desc = tool('create_worker').function.description;
    check('create_worker says to edit the file, not resend the code, to change a deployed worker',
        /To change a worker that is already deployed, do not call this again/.test(desc) && /edit or multi_edit/.test(desc));
    const prompt = read('../src/js/prompt.js');
    check('the system prompt says the same, and what live false means',
        /To change a deployed worker, edit its file workers\/<name>\.js with edit or multi_edit/.test(prompt)
        && /If live is false, the worker may still be running its previous code/.test(prompt));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll worker save-canary checks passed.');
