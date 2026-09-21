import fs from 'node:fs';

// ---- Regression guard for the ReadTextFile size cap -------------------------
// A ReadTextFile result is stored in the chat history and re-sent with every
// later request. Text attachments can be 10MB, so one read of a big data file
// didn't just fail the current request with "prompt is too long" — the
// persisted block failed every request after it, bricking the project. The
// tool now truncates past window.READ_TEXT_FILE_MAX_CHARS with an explicit
// note. This evaluates the REAL tool file with the REAL path-sandbox helpers
// and a fake puter.fs, and checks the cap, the note, and that ordinary source
// files (and cache-bust stripping) are untouched. Mirrors test-search-files.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const HELP = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const a = HELP.indexOf('window.normalizePosixPath =');
const b = HELP.indexOf('// ---- Per-path file-write serialization');
if (a < 0 || b < 0 || b <= a) throw new Error('could not extract the path-sandbox helper block');
// stripPreviewCacheBust lives further down helpers.js; take it too.
const c = HELP.indexOf('window.stripPreviewCacheBust = function');
const d = HELP.indexOf('// Resolve a raw href/src value');
if (c < 0 || d < 0 || d <= c) throw new Error('could not extract stripPreviewCacheBust');
const TOOL = fs.readFileSync(new URL('../src/tools/fs/read.js', import.meta.url), 'utf8');

let FILES = {};
const puter = {
    fs: {
        read: async (p) => {
            if (!Object.prototype.hasOwnProperty.call(FILES, p)) throw new Error('subject does not exist');
            return { text: async () => FILES[p] };
        },
    },
};
const win = { tools: [] };
new Function('window', 'puter', HELP.slice(a, b) + '\n' + HELP.slice(c, d) + '\n' + TOOL)(win, puter);
const tool = win.tools.find(t => t.function && t.function.name === 'ReadTextFile');
if (!tool) throw new Error('ReadTextFile did not register');
const MAX = win.READ_TEXT_FILE_MAX_CHARS;
check('cap is a sane number (≥ 100k chars, ≤ 500k)', Number.isInteger(MAX) && MAX >= 100000 && MAX <= 500000);

const ROOT = '/u/AppData/app/chat1';
const st = { appDir: ROOT };

// --- an ordinary source file comes back verbatim ------------------------------
FILES[ROOT + '/app.js'] = 'const a = 1;\n'.repeat(2000); // ~26k chars
{
    const out = await tool.exec({ path: ROOT + '/app.js' }, st);
    check('a normal file is returned unchanged', out === FILES[ROOT + '/app.js']);
}

// --- exactly at the cap is NOT truncated ---------------------------------------
FILES[ROOT + '/edge.txt'] = 'x'.repeat(MAX);
{
    const out = await tool.exec({ path: ROOT + '/edge.txt' }, st);
    check('a file exactly at the cap is returned unchanged', out === FILES[ROOT + '/edge.txt']);
}

// --- past the cap is truncated with a note ------------------------------------
FILES[ROOT + '/data.csv'] = 'y'.repeat(MAX + 12345);
{
    const out = await tool.exec({ path: ROOT + '/data.csv' }, st);
    check('an oversized file is cut to the cap', out.startsWith('y'.repeat(MAX)) && out.charAt(MAX) !== 'y');
    check('the result stays bounded (cap + a short note)', out.length < MAX + 600);
    check('the note says it was truncated and how long the file is',
        /truncated/i.test(out) && out.includes((MAX + 12345).toLocaleString()));
    check('the note points the model at SearchFiles / referencing by path',
        out.includes('SearchFiles') && /by path/.test(out));
}

// --- HTML still has its preview cache-bust tokens hidden before the cap -----
FILES[ROOT + '/index.html'] = '<link href="style.css?__pcb=123">' + 'z'.repeat(50);
{
    const out = await tool.exec({ path: ROOT + '/index.html' }, st);
    check('cache-bust tokens are stripped from HTML', out.startsWith('<link href="style.css">'));
}

// --- the sandbox still applies --------------------------------------------------
let threw = false;
try { await tool.exec({ path: '/u/AppData/app/chat2/secret.txt' }, st); } catch (e) { threw = true; }
check('out-of-project reads are still refused', threw);

if (failures) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exit(1);
}
console.log('\nAll ReadTextFile cap checks passed');
