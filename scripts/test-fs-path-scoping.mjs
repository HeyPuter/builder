import fs from 'node:fs';

// ---- Regression guard for the fs-tool project-directory sandbox ------------
// The model's file tools must only ever touch the current project's app
// directory. Without this, a confused or prompt-injected model could read,
// overwrite, or delete files ANYWHERE in the user's Puter account. The guard
// lives in window.assertPathInProject (src/js/helpers.js) and is called at the
// top of every fs tool's exec. This:
//   * evaluates the REAL helper functions sliced out of helpers.js (zero drift)
//     and asserts containment, '..'-escape defeat, sibling-prefix safety,
//     relative-path resolution, and fail-closed behavior, then
//   * text-asserts every fs tool actually calls the guard and accepts `state`,
//     so a future tool can't silently skip the sandbox.
// Mirrors scripts/test-click-to-edit.mjs / test-edit-matcher.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}
function throws(fn) { try { fn(); return false; } catch (e) { return true; } }

// --- Evaluate the real helper block from helpers.js -------------------------
const HELP = new URL('../src/js/helpers.js', import.meta.url);
const helpSrc = fs.readFileSync(HELP, 'utf8');
const a = helpSrc.indexOf('window.normalizePosixPath =');
const b = helpSrc.indexOf('// ---- Per-path file-write serialization');
if (a < 0 || b < 0 || b <= a) throw new Error('could not extract the path-sandbox helper block');
const block = helpSrc.slice(a, b);
const win = {};
// The helpers assign onto `window` and call each other via `window.*`; they also
// reference `currentAppDir` via typeof (undefined here → fall back to state).
new Function('window', block)(win);
const { normalizePosixPath, assertPathInProject, assertPathsInProject } = win;

const ROOT = '/u/AppData/app/chat1';
const st = { appDir: ROOT };

// === normalizePosixPath =====================================================
check('normalize: plain path unchanged', normalizePosixPath('/a/b/c') === '/a/b/c');
check('normalize: collapses // and .', normalizePosixPath('/a//b/./c') === '/a/b/c');
check('normalize: resolves ..', normalizePosixPath('/a/b/../c') === '/a/c');
check('normalize: trailing .. pops segment', normalizePosixPath('/a/b/c/..') === '/a/b');
check('normalize: strips trailing slash', normalizePosixPath('/a/b/') === '/a/b');
check('normalize: extra .. cannot go above root', normalizePosixPath('/a/../../b') === '/b');

// === assertPathInProject: accepts in-project ================================
check('accept: file inside project', assertPathInProject(ROOT + '/index.html', st) === ROOT + '/index.html');
check('accept: nested file inside project', assertPathInProject(ROOT + '/assets/logo.png', st) === ROOT + '/assets/logo.png');
check('accept: the project root itself', assertPathInProject(ROOT, st) === ROOT);
check('accept: relative path resolves into project',
    assertPathInProject('assets/logo.png', st) === ROOT + '/assets/logo.png');
check('accept: in-project ".." that stays inside is allowed',
    assertPathInProject(ROOT + '/a/../index.html', st) === ROOT + '/index.html');

// === assertPathInProject: rejects out-of-project (the actual fix) ===========
check('reject: sibling project directory', throws(() => assertPathInProject('/u/AppData/app/chat2/secret.txt', st)));
check('reject: sibling with shared prefix (chat10 vs chat1)', throws(() => assertPathInProject('/u/AppData/app/chat10/x', st)));
check('reject: ".." escape to a sibling', throws(() => assertPathInProject(ROOT + '/../chat2/secret', st)));
check('reject: absolute path to account root', throws(() => assertPathInProject('/u/secret.txt', st)));
check('reject: deep ".." escape', throws(() => assertPathInProject(ROOT + '/../../../etc/passwd', st)));
check('reject: relative path that escapes', throws(() => assertPathInProject('../chat2/x', st)));
check('reject: empty path', throws(() => assertPathInProject('', st)));
check('reject: non-string path', throws(() => assertPathInProject(null, st)));

// === fail closed when the project dir is unknown ============================
check('fail-closed: no appDir + no currentAppDir throws', throws(() => assertPathInProject(ROOT + '/x', {})));

// === assertPathsInProject ===================================================
check('paths: all inside ok returns normalized', (() => {
    const r = assertPathsInProject([ROOT + '/a', 'b'], st);
    return Array.isArray(r) && r.length === 2 && r[1] === ROOT + '/b';
})());
check('paths: one outside throws', throws(() => assertPathsInProject([ROOT + '/a', '/u/AppData/app/chat2/b'], st)));
check('paths: empty array throws', throws(() => assertPathsInProject([], st)));
check('paths: non-array throws', throws(() => assertPathsInProject('not-an-array', st)));

// === Every fs tool calls the guard and accepts `state` ======================
const TOOLDIR = new URL('../src/tools/', import.meta.url);
function tool(rel) { return fs.readFileSync(new URL(rel, TOOLDIR), 'utf8'); }
const SIG = /exec:\s*async\s*function\s*\(\s*args\s*,\s*state\s*\)/;

const singlePath = ['fs/write.js', 'fs/edit.js', 'fs/multi_edit.js', 'fs/delete.js',
    'fs/rename.js', 'fs/read.js', 'fs/readdir.js', 'fs/stat.js'];
for (const f of singlePath) {
    const s = tool(f);
    check(`${f}: exec takes (args, state)`, SIG.test(s));
    check(`${f}: guards args.path`, s.includes('assertPathInProject(args.path'));
}

// Multi-path + dual-path tools.
const move = tool('fs/move.js');
check('fs/move.js: exec takes (args, state)', SIG.test(move));
check('fs/move.js: guards every source path', move.includes('assertPathsInProject(args.paths_array'));
check('fs/move.js: guards the destination', move.includes("assertPathInProject(args.destination"));

const mkdir = tool('fs/mkdir.js');
check('fs/mkdir.js: exec takes (args, state)', SIG.test(mkdir));
check('fs/mkdir.js: guards every directory path', mkdir.includes('assertPathsInProject(args.paths_array'));

const copy = tool('fs/copy.js');
check('fs/copy.js: exec takes (args, state)', SIG.test(copy));
check('fs/copy.js: guards source and destination',
    copy.includes('assertPathInProject(args.path') && copy.includes("assertPathInProject(args.destination"));

const rename = tool('fs/rename.js');
check('fs/rename.js: rejects new_name containing a slash', rename.includes('new_name must be a plain'));

const view = tool('fs/view_image.js');
check('fs/view_image.js: guards the resolved path', view.includes('assertPathInProject(path'));

// SearchFiles resolves ''/'.'/relative input to a target first (like
// view_image), so it guards the resolved variable rather than args.path.
const searchTool = tool('fs/search_files.js');
check('fs/search_files.js: exec takes (args, state)', SIG.test(searchTool));
check('fs/search_files.js: guards the resolved path', searchTool.includes('assertPathInProject(rawPath, state)'));

const worker = tool('workers/create_worker.js');
check('workers/create_worker.js: exec takes (args, state)', SIG.test(worker));
check('workers/create_worker.js: guards the computed worker path', worker.includes('assertPathInProject(`'));

// publish_site exposes a directory to the PUBLIC internet, so an unsandboxed
// args.path here is the highest-impact escape (exfiltration, not just local
// tampering). It must confine the published path to the project like every
// other path-taking tool.
const publish = tool('apps_and_sites/publish_site.js');
check('apps_and_sites/publish_site.js: exec takes (args, state)', SIG.test(publish));
check('apps_and_sites/publish_site.js: guards args.path', publish.includes('assertPathInProject(args.path'));

// === The guard's RESOLVED path is what each tool actually operates on ======
// assertPathInProject deliberately accepts a RELATIVE path and resolves it
// against the project dir. puter.fs resolves a relative path against the app's
// data root instead — so a tool that validates args.path but then hands the RAW
// value to puter.fs would report "in project" and write somewhere else entirely
// (e.g. "chat-history/chat-list.json" → the user's project index). Every tool
// must therefore capture the guard's return value and use THAT.
const RESOLVED_USERS = {
    'fs/write.js':      ['const path = window.assertPathInProject(args.path', 'writeFileVerified(path,'],
    'fs/edit.js':       ['const path = window.assertPathInProject(args.path', 'puter.fs.read(path)'],
    'fs/multi_edit.js': ['const path = window.assertPathInProject(args.path', 'puter.fs.read(path)'],
    'fs/delete.js':     ['const path = window.assertPathInProject(args.path', 'puter.fs.delete(path)'],
    'fs/rename.js':     ['const path = window.assertPathInProject(args.path', 'puter.fs.rename(path,'],
    'fs/read.js':       ['const path = window.assertPathInProject(args.path', 'puter.fs.read(path)'],
    'fs/readdir.js':    ['const path = window.assertPathInProject(args.path', 'puter.fs.readdir(path)'],
    'fs/stat.js':       ['const path = window.assertPathInProject(args.path', 'puter.fs.stat(path)'],
    'fs/copy.js':       ['const src = window.assertPathInProject(args.path', 'puter.fs.copy(src, destDir)'],
    'fs/move.js':       ['const paths = window.assertPathsInProject(args.paths_array', 'puter.fs.move(path, destination)'],
    'fs/mkdir.js':      ['const paths = window.assertPathsInProject(args.paths_array', 'for (const path of paths)'],
};
for (const [f, needles] of Object.entries(RESOLVED_USERS)) {
    const s = tool(f);
    check(`${f}: operates on the guard's resolved path`, needles.every((n) => s.includes(n)));
}
// No fs tool may pass the raw, unvalidated path straight to puter.fs.
for (const f of Object.keys(RESOLVED_USERS)) {
    const s = tool(f);
    check(`${f}: never hands args.path/args.destination to puter.fs`,
        !/puter\.fs\.[a-z]+\(\s*args\.(path|destination|paths_array)/.test(s));
}

// --- The project directory itself is not a valid target for the destructive
// tools. It IS inside the sandbox (assertPathInProject accepts it — readdir,
// stat and search need that), so each of delete / rename / move refuses it
// explicitly: a single injected call could otherwise wipe or orphan the whole
// project, whose hosting connection and conversation are bound to that path.
for (const f of ['fs/delete.js', 'fs/rename.js', 'fs/move.js']) {
    const s = tool(f);
    check(`${f}: refuses the project directory itself`,
        s.includes('window.projectRootDir(state)') && /Refusing to (delete|rename|move) the project directory itself/.test(s));
}
// create_worker builds a path from the worker NAME, so the name must be a
// plain identifier: "../index" resolved to <root>/index.js — inside the
// project, so the sandbox let it through — and overwrote the app's entry file.
{
    const s = fs.readFileSync(new URL('../src/tools/workers/create_worker.js', import.meta.url), 'utf8');
    const m = s.match(/new RegExp\('(\^\[A-Za-z0-9_-\]\{1,)' \+ maxLen \+ '(\}\$)'\)/);
    check('create_worker: validates the name against a plain-identifier charset', !!m);
    if (m) {
        const re = new RegExp(m[1] + '50' + m[2]);
        check('create_worker: "../index" is rejected', !re.test('../index'));
        check('create_worker: "api/v1" is rejected', !re.test('api/v1'));
        check('create_worker: "my-api_2" is accepted', re.test('my-api_2'));
        check('create_worker: an over-long name is rejected', !re.test('a'.repeat(51)));
    }
    check('create_worker: the name check runs before the path is built',
        s.indexOf('Invalid worker name') > 0 && s.indexOf('Invalid worker name') < s.indexOf('assertPathInProject(`${root}/workers/${name}.js`'));
}

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll fs path-scoping checks passed.');
