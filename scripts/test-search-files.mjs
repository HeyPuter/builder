import fs from 'node:fs';

// ---- Regression guard for the SearchFiles tool ------------------------------
// SearchFiles (src/tools/fs/search_files.js) is the model's project-wide
// text/regex search. It must: confine every search to the project directory
// (same sandbox as the other fs tools), report correct 1-based line numbers
// against the clean source ReadTextFile shows, skip binary/oversized files,
// stay within its per-file/total/char caps (reporting truncation honestly),
// and stay deterministic regardless of read concurrency. This test evaluates
// the REAL tool file (zero drift) with the REAL path-sandbox helpers from
// helpers.js and a fake in-memory puter.fs, then drives the actual exec.
// Mirrors scripts/test-fs-path-scoping.mjs / test-edit-matcher.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}
async function rejects(promise, substr) {
    try { await promise; return false; }
    catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        return substr ? msg.includes(substr) : true;
    }
}

// --- Evaluate the real path-sandbox helpers from helpers.js -----------------
const HELP = new URL('../src/js/helpers.js', import.meta.url);
const helpSrc = fs.readFileSync(HELP, 'utf8');
const a = helpSrc.indexOf('window.normalizePosixPath =');
const b = helpSrc.indexOf('// ---- Per-path file-write serialization');
if (a < 0 || b < 0 || b <= a) throw new Error('could not extract the path-sandbox helper block');

// --- Fake in-memory puter.fs -------------------------------------------------
// FILES maps absolute path -> string content. Directories exist implicitly.
// Entries in EXTRA_SIZES override the size readdir/stat report (to exercise the
// pre-read size skip without building megabyte strings). FAIL_READDIR lists
// directories whose readdir throws (unreadable-subdir tolerance).
let FILES = {};
let EXTRA_SIZES = {};
let FAIL_READDIR = new Set();

function isDir(p) {
    const prefix = p.endsWith('/') ? p : p + '/';
    return Object.keys(FILES).some(k => k.startsWith(prefix));
}
const puterStub = {
    fs: {
        stat: async (p) => {
            if (Object.prototype.hasOwnProperty.call(FILES, p)) {
                return { name: p.slice(p.lastIndexOf('/') + 1), path: p, is_dir: false, size: EXTRA_SIZES[p] ?? FILES[p].length };
            }
            if (isDir(p)) return { name: p.slice(p.lastIndexOf('/') + 1), path: p, is_dir: true };
            throw new Error('subject does not exist');
        },
        readdir: async (p) => {
            if (FAIL_READDIR.has(p)) throw new Error('permission denied');
            if (!isDir(p)) throw new Error('not a directory');
            const prefix = p.endsWith('/') ? p : p + '/';
            const seen = new Map();
            for (const k of Object.keys(FILES)) {
                if (!k.startsWith(prefix)) continue;
                const rest = k.slice(prefix.length);
                const slash = rest.indexOf('/');
                if (slash === -1) seen.set(rest, { name: rest, is_dir: false, size: EXTRA_SIZES[k] ?? FILES[k].length });
                else if (!seen.has(rest.slice(0, slash))) seen.set(rest.slice(0, slash), { name: rest.slice(0, slash), is_dir: true });
            }
            return [...seen.values()];
        },
        read: async (p) => {
            if (!Object.prototype.hasOwnProperty.call(FILES, p)) throw new Error('subject does not exist');
            return { text: async () => FILES[p] };
        },
    },
};

// --- Evaluate the real tool file against a stub window -----------------------
const TOOL = new URL('../src/tools/fs/search_files.js', import.meta.url);
const toolSrc = fs.readFileSync(TOOL, 'utf8');
const win = { tools: [] };
new Function('window', 'puter', helpSrc.slice(a, b) + '\n' + toolSrc)(win, puterStub);
const tool = win.tools.find(t => t.function && t.function.name === 'SearchFiles');
if (!tool) throw new Error('SearchFiles tool did not register');
const S = win.__searchFilesInternals;
const L = S.LIMITS;

const ROOT = '/u/AppData/app/chat1';
const st = { appDir: ROOT };
function run(args) { return tool.exec(args, st); }
function search(query, path, opts) {
    return run({ query, is_regex: false, case_sensitive: false, path, ...(opts || {}) });
}

// === Schema sanity ===========================================================
{
    const fn = tool.function;
    check('schema: strict with additionalProperties false',
        fn.strict === true && fn.parameters.additionalProperties === false);
    check('schema: all four params required',
        JSON.stringify([...fn.parameters.required].sort()) === JSON.stringify(['case_sensitive', 'is_regex', 'path', 'query']));
}

// === Basic literal search ====================================================
FILES = {
    [ROOT + '/index.html']: '<html>\n<body>\n<h1>Hello World</h1>\n</body>\n</html>',
    [ROOT + '/js/app.js']: 'function greet() {\n  return "hello world";\n}\ngreet();',
    [ROOT + '/style.css']: 'h1 { color: red; }',
};
{
    const r = await search('hello world', ROOT);
    check('literal: case-insensitive finds both files', r.matches.length === 2);
    check('literal: absolute file paths reported',
        r.matches.every(m => m.file.startsWith(ROOT + '/')));
    check('literal: 1-based line numbers correct',
        r.matches.some(m => m.file === ROOT + '/index.html' && m.line === 3) &&
        r.matches.some(m => m.file === ROOT + '/js/app.js' && m.line === 2));
    check('literal: match text is the full line',
        r.matches.find(m => m.file === ROOT + '/js/app.js').text === '  return "hello world";');
    check('literal: files_searched counts searched files', r.files_searched === 3);
    check('literal: files_with_matches counts distinct files', r.files_with_matches === 2);
    check('literal: deterministic order (sorted walk, file order)',
        r.matches[0].file === ROOT + '/index.html' && r.matches[1].file === ROOT + '/js/app.js');
}
{
    const r = await search('Hello World', ROOT, { case_sensitive: true });
    check('literal: case-sensitive matches only exact casing',
        r.matches.length === 1 && r.matches[0].file === ROOT + '/index.html');
}
{
    const r = await search('no-such-string-anywhere', ROOT);
    check('literal: no matches -> empty array, no notes',
        Array.isArray(r.matches) && r.matches.length === 0 && !r.notes);
}

// === Regex search ============================================================
{
    const r = await run({ query: 'colou?r:\\s*red', is_regex: true, case_sensitive: false, path: ROOT });
    check('regex: pattern matches', r.matches.length === 1 && r.matches[0].file === ROOT + '/style.css' && r.matches[0].line === 1);
}
check('regex: invalid pattern is a model-directed error',
    await rejects(run({ query: '(unclosed', is_regex: true, case_sensitive: false, path: ROOT }), 'Invalid regular expression'));
check('regex-lookalike literal: "(unclosed" as literal text does not throw',
    (await search('(unclosed', ROOT)).matches.length === 0);

// === Input validation ========================================================
check('validate: empty query throws', await rejects(search('', ROOT), 'non-empty'));
check('validate: whitespace-only query throws', await rejects(search('  \n ', ROOT), 'non-empty'));
check('validate: oversized query throws', await rejects(search('x'.repeat(L.MAX_QUERY_CHARS + 1), ROOT), 'too long'));
check('validate: nonexistent path throws', await rejects(search('hello', ROOT + '/nope'), 'Path not found'));

// === Path sandbox ============================================================
check('sandbox: sibling project rejected', await rejects(search('hello', '/u/AppData/app/chat2')));
check('sandbox: ".." escape rejected', await rejects(search('hello', ROOT + '/../chat2')));
check('sandbox: account root rejected', await rejects(search('hello', '/u')));
check('sandbox: fails closed with no project dir',
    await rejects(tool.exec({ query: 'hello', is_regex: false, case_sensitive: false, path: ROOT }, {})));
{
    // 'greet' appears on 2 lines of js/app.js (results are matching LINES,
    // not occurrences — 'function greet() {' and 'greet();').
    const r = await search('greet', 'js');
    check('sandbox: relative path resolves into the project and scopes the search',
        r.searched_path === ROOT + '/js' && r.matches.length === 2 && r.matches.every(m => m.file === ROOT + '/js/app.js'));
}
{
    const r = await search('greet', '.');
    check('path: "." searches the project root', r.searched_path === ROOT && r.matches.length === 2);
}
{
    const r = await search('greet', ROOT + '/js/app.js');
    check('path: a single file can be searched', r.files_searched === 1 && r.matches.length === 2);
}

// === Binary / oversized / internal files =====================================
FILES = {
    [ROOT + '/index.html']: 'needle',
    [ROOT + '/logo.png']: 'needle needle',
    [ROOT + '/__deploy_abc.png']: 'needle',
    [ROOT + '/assets/font.woff2']: 'needle',
    [ROOT + '/raw-blob']: 'needle\u0000binary',
    [ROOT + '/big.js']: 'needle',
    [ROOT + '/no-ext-text']: 'a needle here',
};
EXTRA_SIZES = { [ROOT + '/big.js']: L.MAX_FILE_CHARS + 1 };
{
    const r = await search('needle', ROOT);
    check('skip: binary extensions and NUL-sniffed files are not searched',
        r.matches.every(m => m.file === ROOT + '/index.html' || m.file === ROOT + '/no-ext-text') && r.matches.length === 2);
    check('skip: skipped counts reported',
        r.skipped && r.skipped.binary_files === 3 && r.skipped.too_large_files === 1);
    check('skip: extensionless text file IS searched',
        r.matches.some(m => m.file === ROOT + '/no-ext-text'));
    check('skip: single-file search of a binary throws',
        await rejects(search('needle', ROOT + '/logo.png'), 'binary'));
    check('skip: single-file search of an oversized file throws',
        await rejects(search('needle', ROOT + '/big.js'), 'too large'));
}
EXTRA_SIZES = {};

// === Unreadable subdirectory is tolerated ====================================
FILES = {
    [ROOT + '/ok/a.js']: 'needle',
    [ROOT + '/locked/b.js']: 'needle',
};
FAIL_READDIR = new Set([ROOT + '/locked']);
{
    const r = await search('needle', ROOT);
    check('resilience: unreadable subdir skipped, others still searched',
        r.matches.length === 1 && r.matches[0].file === ROOT + '/ok/a.js' && r.skipped && r.skipped.unreadable === 1);
}
FAIL_READDIR = new Set();

// === HTML cache-bust stripping ===============================================
FILES = { [ROOT + '/index.html']: '<link href="style.css?__cb=12345">' };
win.stripPreviewCacheBust = (t) => t.replace(/\?__cb=\d+/g, '');
{
    const r = await search('style.css', ROOT);
    check('html: matches the clean (cache-bust-stripped) source',
        r.matches.length === 1 && r.matches[0].text === '<link href="style.css">');
}
delete win.stripPreviewCacheBust;

// === CRLF and line clipping ==================================================
FILES = {
    [ROOT + '/crlf.txt']: 'one\r\ntwo\r\nthree needle\r\nfour',
    [ROOT + '/long.js']: 'short\n' + 'x'.repeat(500) + 'needle' + 'y'.repeat(500),
};
{
    const r = await search('needle', ROOT);
    const crlf = r.matches.find(m => m.file === ROOT + '/crlf.txt');
    check('crlf: line number computed on normalized lines', crlf && crlf.line === 3);
    check('crlf: reported text has no carriage return', crlf && !crlf.text.includes('\r'));
    const long = r.matches.find(m => m.file === ROOT + '/long.js');
    check('clip: long line clipped around the match',
        long && long.line === 2 && long.text.length <= L.MAX_LINE_CHARS + 2 && long.text.includes('needle'));
}

// === Multiline literal query =================================================
FILES = { [ROOT + '/app.js']: 'alpha\nbeta\ngamma\nbeta\ngamma' };
{
    const r = await search('beta\ngamma', ROOT);
    check('multiline: literal with newline matches across lines, at both starts',
        r.matches.length === 2 && r.matches[0].line === 2 && r.matches[1].line === 4);
    check('multiline: reported text is the starting line', r.matches[0].text === 'beta');
}

// === Caps: per-file, total, and honest truncation notes =====================
FILES = {};
for (let f = 0; f < 10; f++) {
    FILES[ROOT + '/f' + f + '.txt'] = Array.from({ length: 30 }, (_, i) => 'needle line ' + i).join('\n');
}
{
    const r = await search('needle', ROOT);
    check('caps: per-file cap enforced',
        r.matches.filter(m => m.file === ROOT + '/f0.txt').length === L.MAX_PER_FILE);
    check('caps: total cap enforced', r.matches.length === L.MAX_TOTAL);
    check('caps: truncation notes present',
        Array.isArray(r.notes) && r.notes.some(n => n.includes('truncated')) && r.notes.some(n => n.includes('more than ' + L.MAX_PER_FILE)));
}

// === Caps: char budget bounds the serialized result ==========================
FILES = {};
for (let f = 0; f < 30; f++) {
    FILES[ROOT + '/g' + f + '.txt'] = Array.from({ length: 10 }, () => 'needle ' + 'z'.repeat(230)).join('\n');
}
{
    const r = await search('needle', ROOT);
    const size = JSON.stringify(r.matches).length;
    check('caps: char budget keeps the matches payload bounded', size <= L.CHAR_BUDGET + 2000);
    check('caps: char-budget truncation is reported', Array.isArray(r.notes) && r.notes.some(n => n.includes('truncated')));
}

// === Helpers: pure-function edge cases =======================================
check('helper: hasBinaryExtension is case-insensitive and dot-aware',
    S.hasBinaryExtension('LOGO.PNG') && !S.hasBinaryExtension('readme') && !S.hasBinaryExtension('.gitignore') && S.hasBinaryExtension('a.b.woff2'));
check('helper: looksBinary detects NUL only',
    S.looksBinary('a\u0000b') && !S.looksBinary('plain text'));
check('helper: literal compile never throws on regex metachars',
    S.compileLineRegex('a(b[c\\', false, true).test('xa(b[c\\y'));
check('helper: clipLine returns short lines verbatim', S.clipLine('short', 0) === 'short');

// === Wiring: the tool must actually ship and stay sandboxed =================
const viteSrc = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');
check('wiring: search_files.js is in the vite SCRIPTS bundle list',
    viteSrc.includes("'tools/fs/search_files.js'"));
check('wiring: exec takes (args, state)', /exec:\s*async\s*function\s*\(\s*args\s*,\s*state\s*\)/.test(toolSrc));
check('wiring: tool guards its path through assertPathInProject', toolSrc.includes('window.assertPathInProject('));
check('wiring: tool is read-only (never writes/deletes)',
    !toolSrc.includes('puter.fs.write') && !toolSrc.includes('puter.fs.delete') && !toolSrc.includes('writeFileVerified'));

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll SearchFiles checks passed.');
