import fs from 'node:fs';

// ---- ExtractZip: start from, or use, a .zip the user attaches ---------------
// A user can download a project as a zip, change it on their computer (or
// move it to another account) and bring it back by attaching the zip. The
// attachment is saved to assets/ like any file, and ExtractZip writes its
// files into the project: into the working directory to import the project,
// or under assets/ to use the files. These checks drive the real tool with the
// JSZip build the app ships, the real path guards from helpers.js, and a stub
// filesystem.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (rel) => fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');

// JSZip, as vendored (src/vendor/jszip.min.js).
const jszipMod = { exports: {} };
new Function('module', 'exports', read('src/vendor/jszip.min.js'))(jszipMod, jszipMod.exports);
const JSZip = jszipMod.exports;

// The path guards (normalizePosixPath, projectRootDir, assertPathInProject)
// and isZipAttachment, sliced out of helpers.js.
const helpers = read('src/js/helpers.js');
const guardsStart = helpers.indexOf('window.normalizePosixPath = function');
const guardsEnd = helpers.indexOf('// ---- Generated media folder');
const zipFnStart = helpers.indexOf('function isZipAttachment(');
const zipFnEnd = helpers.indexOf('\n}', zipFnStart) + 2;
check('helpers.js has the path guards and isZipAttachment', guardsStart > 0 && guardsEnd > guardsStart && zipFnStart > 0);

const ROOT = '/u/AppData/app/c1';
const win = { tools: [], JSZip };
new Function('window', helpers.slice(guardsStart, guardsEnd))(win);
const isZipAttachment = new Function(helpers.slice(zipFnStart, zipFnEnd) + '\nreturn isZipAttachment;')();
new Function('window', read('src/js/editor-core.js'))(win);

const NOT_FOUND = 'subject_does_not_exist';
const isNotFoundError = (e) => !!e && e.code === NOT_FOUND;
// `puter` is looked up at call time, so each scenario can swap the stub.
const puterProxy = { fs: new Proxy({}, { get: (_t, k) => (...a) => globalThis.puter.fs[k](...a) }) };
new Function('window', 'puter', 'isNotFoundError', read('src/tools/fs/extract_zip.js'))(win, puterProxy, isNotFoundError);
const I = win.__extractZipInternals;
const tool = win.tools.find((t) => t.function.name === 'ExtractZip');

// ---- Registration -----------------------------------------------------------
check('ExtractZip registers, with its internals exposed', !!tool && !!I && typeof I.plan === 'function');
check('… with loose inputs (keeps the strict-tool budget)', tool && tool.function.strict === false);
check('… and only path required', JSON.stringify(tool.function.parameters.required) === '["path"]');
check('the app loads it (vite.config.js SCRIPTS)', /'tools\/fs\/extract_zip\.js'/.test(read('vite.config.js')));
check('it takes a version like any file change (versions.js)', /MUTATING_TOOLS = new Set\(\[[^\]]*'ExtractZip'/.test(read('src/js/versions.js')));
check('the status line names it (handleMessageStream.js)', /ExtractZip: '[^']+'/.test(read('src/js/handleMessageStream.js')));
check('the system prompt points zips at ExtractZip', /ExtractZip unpacks it/.test(read('src/js/prompt.js')));
check('a zip attachment\'s note points at ExtractZip (app.js)', /Zip archives — not unpacked yet\. When the user wants what is inside, call ExtractZip/.test(read('src/js/app.js')));

// ---- isZipAttachment ---------------------------------------------------------
check('isZipAttachment: by name', isZipAttachment({ name: 'My App.ZIP' }));
check('isZipAttachment: by MIME', isZipAttachment({ name: 'download', type: 'application/zip' }) && isZipAttachment({ name: 'x', type: 'application/x-zip-compressed' }));
check('isZipAttachment: a saved file-ref, by its path', isZipAttachment({ path: ROOT + '/assets/site.zip' }));
check('isZipAttachment: other files are not', !isZipAttachment({ name: 'a.tar.gz' }) && !isZipAttachment({ name: 'zip.png', type: 'image/png' }) && !isZipAttachment(null));

// ---- Pure helpers ------------------------------------------------------------
check('entryPath: plain paths stay', I.entryPath('css/style.css') === 'css/style.css');
check('entryPath: backslashes become slashes', I.entryPath('css\\style.css') === 'css/style.css');
check('entryPath: a leading slash or drive letter is dropped', I.entryPath('/etc/x') === 'etc/x' && I.entryPath('C:\\x\\y') === 'x/y');
check('entryPath: "." and empty segments go', I.entryPath('./a//./b') === 'a/b');
check('entryPath: any ".." refuses the entry', I.entryPath('../x') === null && I.entryPath('a/../../x') === null && I.entryPath('a/..') === null);
check('entryPath: nothing left is no path', I.entryPath('') === null && I.entryPath('./') === null);
check('isJunk: macOS and Windows junk', ['__MACOSX/a/._b', 'a/.DS_Store', 'Thumbs.db', 'x/desktop.ini', 'img/._photo.png'].every(I.isJunk));
check('isJunk: Git\'s and Puter\'s folders and deploy markers', ['.git/config', 'a/.git/HEAD', '.puter/tests.json', '__deploy_1.png'].every(I.isJunk));
check('isJunk: real files are kept', !['index.html', '.gitignore', 'assets/a.png', '.github/workflows/ci.yml', '.env.example'].some(I.isJunk));
check('sharedTopFolder: one folder around everything', I.sharedTopFolder(['site/index.html', 'site/css/a.css']) === 'site');
check('sharedTopFolder: none with a file at the top', I.sharedTopFolder(['site/index.html', 'README.md']) === '');
check('sharedTopFolder: none across two folders', I.sharedTopFolder(['a/x', 'b/y']) === '');
{
    const entries = [
        { name: 'site/', dir: true, size: 0 },
        { name: 'site/index.html', size: 10 },
        { name: 'site/js/app.js', size: 5 },
        { name: '__MACOSX/site/._index.html', size: 1 },
        { name: 'site/../../evil.txt', size: 1 },
    ];
    const p = I.plan(entries);
    check('plan: folders are not files', p.files.every((f) => !/\/$/.test(f.name)));
    check('plan: junk and unsafe entries are left out and counted', p.skipped.junk === 1 && p.skipped.unsafe.length === 1 && p.files.length === 2);
    check('plan: the shared folder is dropped', p.stripped === 'site' && p.files.map((f) => f.rel).join(',') === 'index.html,js/app.js');
    check('plan: sizes add up', p.totalBytes === 15);
    const kept = I.plan(entries, { stripTopFolder: false });
    check('plan: stripTopFolder false keeps it', kept.stripped === '' && kept.files[0].rel === 'site/index.html');
}

// ---- The tool, end to end ----------------------------------------------------
async function zipBlob(entries) {
    const z = new JSZip();
    for (const [name, content] of Object.entries(entries)) z.file(name, content);
    return new Blob([await z.generateAsync({ type: 'uint8array' })]);
}
function stubFs(initial, { failWrite = () => false } = {}) {
    const files = new Map(Object.entries(initial));
    const writes = [];
    const deleted = [];
    globalThis.puter = { fs: {
        read: async (p) => {
            if (!files.has(p)) { const e = new Error('Not found'); e.code = NOT_FOUND; throw e; }
            return files.get(p);
        },
        write: async (p, data, opts) => {
            if (failWrite(p)) throw new Error('Storage full');
            writes.push({ p, opts });
            files.set(p, data);
        },
        delete: async (p) => { files.delete(p); deleted.push(p); },
    } };
    return { files, writes, deleted };
}
let refreshes = 0;
win.withFileLock = (_p, fn) => fn();
win.schedulePreviewRefresh = () => { refreshes++; };
const state = (extra) => ({ appDir: ROOT, ...extra });
async function run(args, st = state()) {
    try { return { ok: true, res: await tool.exec(args, st) }; }
    catch (e) { return { ok: false, err: e }; }
}
const text = async (data) => (typeof data === 'string' ? data : await data.text());

// A project downloaded from Builder and zipped again on a Mac: everything in
// one folder, with Finder's junk and a backend source.
{
    const zip = await zipBlob({
        'my-site/index.html': '<!doctype html><h1>Hi</h1>',
        'my-site/css/style.css': 'h1{color:red}',
        'my-site/workers/api-k3x9p2.js': "router.get('/', () => 'ok');",
        'my-site/.DS_Store': 'junk',
        '__MACOSX/my-site/._index.html': 'junk',
    });
    const fsx = stubFs({ [ROOT + '/assets/my-site.zip']: zip });
    refreshes = 0;
    const r = await run({ path: 'assets/my-site.zip' });
    check('import: succeeds', r.ok, r.err && r.err.message);
    const res = r.res || {};
    check('import: lands in the working directory, folder dropped', res.destination === ROOT && res.dropped_top_folder === 'my-site'
        && JSON.stringify(res.files) === JSON.stringify(['css/style.css', 'index.html', 'workers/api-k3x9p2.js']), JSON.stringify(res));
    check('import: the bytes are the archive\'s', fsx.files.has(ROOT + '/index.html') && (await text(fsx.files.get(ROOT + '/index.html'))) === '<!doctype html><h1>Hi</h1>');
    check('import: parents are created on the way', fsx.writes.every((w) => w.opts && w.opts.createMissingParents === true));
    check('import: Finder\'s junk is skipped', res.skipped_system_files === 2 && ![...fsx.files.keys()].some((p) => /DS_Store|__MACOSX/.test(p)));
    check('import: the archive is removed afterwards', res.zip_removed === true && fsx.deleted.includes(ROOT + '/assets/my-site.zip'));
    check('import: the preview is told', refreshes === 1);
    check('import: the note says to build on the files and refresh the preview', /project's files now/.test(res.note) && /update_preview/.test(res.note) && /publish_site/.test(res.note));
    check('import: the note names the undeployed backend and create_worker', /workers\/api-k3x9p2\.js is a backend source/.test(res.note) && /create_worker/.test(res.note));
}

// A folder of images to use, kept in assets/gallery with the zip kept.
{
    const zip = await zipBlob({ 'a.png': 'A', 'b.png': 'B' });
    const fsx = stubFs({ [ROOT + '/assets/photos.zip']: zip });
    const r = await run({ path: ROOT + '/assets/photos.zip', destination: 'assets/gallery', keep_zip: true });
    check('use files: succeeds into a relative folder', r.ok && r.res.destination === ROOT + '/assets/gallery', r.err && r.err.message);
    check('use files: written under it', fsx.files.has(ROOT + '/assets/gallery/a.png') && fsx.files.has(ROOT + '/assets/gallery/b.png'));
    check('use files: keep_zip keeps the archive', r.res.zip_removed === false && fsx.files.has(ROOT + '/assets/photos.zip'));
    check('use files: no project-files note outside the root', !/project's files now/.test(r.res.note));
}

// One folder kept when asked.
{
    const fsx = stubFs({ [ROOT + '/assets/x.zip']: await zipBlob({ 'docs/a.txt': 'a' }) });
    const r = await run({ path: 'assets/x.zip', destination: 'assets', strip_top_folder: false });
    check('strip_top_folder false: the folder stays', r.ok && fsx.files.has(ROOT + '/assets/docs/a.txt') && !r.res.dropped_top_folder);
}

// An archive can't write outside the project, whatever its names say.
{
    const fsx = stubFs({ [ROOT + '/assets/evil.zip']: await zipBlob({ '../../../escape.txt': 'x', 'ok.txt': 'y', '/abs.txt': 'z' }) });
    const r = await run({ path: 'assets/evil.zip', destination: 'assets/in' });
    const outside = [...fsx.files.keys()].filter((p) => !p.startsWith(ROOT + '/'));
    check('zip slip: nothing lands outside the project', r.ok && outside.length === 0 && fsx.writes.every((w) => w.p.startsWith(ROOT + '/assets/in/')),
        JSON.stringify([...fsx.files.keys()]));
}

// Paths the model gives are guarded too.
{
    stubFs({ [ROOT + '/assets/a.zip']: await zipBlob({ 'a.txt': 'a' }) });
    const out = await run({ path: 'assets/a.zip', destination: '/u/AppData/app/c2' });
    check('a destination outside the project is refused', !out.ok && /outside this project/.test(out.err.message));
    const outZip = await run({ path: '/u/Documents/a.zip' });
    check('an archive outside the project is refused', !outZip.ok && /outside this project/.test(outZip.err.message));
    const missing = await run({ path: 'assets/nope.zip' });
    check('a missing archive says so', !missing.ok && /There is no file at/.test(missing.err.message));
}

// Not a zip at all.
{
    stubFs({ [ROOT + '/assets/a.zip']: new Blob(['Rar!\x1a\x07 not a zip']) });
    const r = await run({ path: 'assets/a.zip' });
    check('a file that isn\'t a zip gets an error the model can act on', !r.ok && /couldn't be opened as a zip archive/.test(r.err.message) && /Do not retry/.test(r.err.message));
}

// Nothing but junk.
{
    stubFs({ [ROOT + '/assets/a.zip']: await zipBlob({ '__MACOSX/._x': 'j', '.DS_Store': 'j' }) });
    const r = await run({ path: 'assets/a.zip' });
    check('an archive of only junk writes nothing and says so', !r.ok && /no files to unpack/.test(r.err.message));
}

// Limits: refused before anything is written.
{
    const fsx = stubFs({ [ROOT + '/assets/a.zip']: await zipBlob({ 'a.txt': 'a', 'b.txt': 'b', 'c.txt': 'c' }) });
    const saved = { ...I.limits };
    I.limits.maxFiles = 2;
    const many = await run({ path: 'assets/a.zip' });
    I.limits.maxFiles = saved.maxFiles;
    I.limits.maxBytes = 2;
    const big = await run({ path: 'assets/a.zip' });
    I.limits.maxBytes = saved.maxBytes;
    check('too many files: refused', !many.ok && /more than the 2 ExtractZip unpacks/.test(many.err.message));
    check('too many bytes: refused', !big.ok && /unpacks to about/.test(big.err.message));
    check('… and nothing was written', fsx.writes.length === 0);
}

// A write that fails keeps the archive and reports the file.
{
    const fsx = stubFs({ [ROOT + '/assets/a.zip']: await zipBlob({ 'a.txt': 'a', 'b.txt': 'b' }) }, { failWrite: (p) => p.endsWith('/b.txt') });
    const r = await run({ path: 'assets/a.zip' });
    check('partial failure: the rest is written', r.ok && fsx.files.has(ROOT + '/a.txt'));
    check('partial failure: the failed file is listed', r.res.failed.length === 1 && r.res.failed[0].path === ROOT + '/b.txt');
    check('partial failure: the archive is kept', r.res.zip_removed === false && fsx.files.has(ROOT + '/assets/a.zip') && /archive was kept/.test(r.res.note));
}

// A stopped turn writes nothing.
{
    const fsx = stubFs({ [ROOT + '/assets/a.zip']: await zipBlob({ 'a.txt': 'a' }) });
    win.isAborted = () => true;
    const r = await run({ path: 'assets/a.zip' });
    delete win.isAborted;
    check('a stopped turn writes nothing', !r.ok && r.err.message === 'Aborted' && fsx.writes.length === 0);
}

// The note on the user's message.
{
    const s = await win.zipAttachmentSummary(await zipBlob({ 'site/index.html': 'x', 'site/a.js': 'y', 'site/.DS_Store': 'j' }));
    check('summary: counts files without junk, paths after the dropped folder', s && s.count === 2 && s.stripped === 'site' && s.paths.join(',') === 'index.html,a.js', JSON.stringify(s));
    const many = {};
    for (let i = 0; i < I.SUMMARY_LIMIT + 5; i++) many['f' + i + '.txt'] = String(i);
    const m = await win.zipAttachmentSummary(await zipBlob(many));
    check('summary: long lists are clipped with a count of the rest', m.paths.length === I.SUMMARY_LIMIT && m.more === 5);
    check('summary: an unreadable file gives null, not a throw', (await win.zipAttachmentSummary(new Blob(['nope']))) === null);
}

if (failures) { console.error(`\n${failures} ExtractZip check(s) failed.`); process.exit(1); }
console.log('\nAll ExtractZip checks passed.');
