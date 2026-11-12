import fs from 'node:fs';

// ---- The README.md every new project starts with --------------------------
// js/project-readme.js holds the fixed text and the "has a readme" rule;
// versions.js adds the file with a project's first version
// (addReadmeToNewProject); prompt.js tells the model to leave it alone.
//
// Runs the real project-readme.js, the real addReadmeToNewProject sliced out
// of versions.js with a fake puter.fs, and the real prompt.js, then
// text-asserts the wiring that a slice can't show.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

const readmeSrc = read('../src/js/project-readme.js');
const versionsSrc = read('../src/js/versions.js');
const promptSrc = read('../src/js/prompt.js');
const viteSrc = read('../vite.config.js');
const helpersSrc = read('../src/js/helpers.js');
const uiSrc = read('../src/js/ui.js');

// --- The text and the name rule --------------------------------------------
const win = {};
new Function('window', readmeSrc)(win);
const R = win.ProjectReadme;

check('the module exposes the README', R && typeof R.TEXT === 'string' && R.FILE_NAME === 'README.md');
check('it opens with the project heading', R.TEXT.startsWith('# Welcome to your AI Builder project\n'));
check('it links to the builder with the README campaign',
    R.TEXT.includes('](https://builder.puter.com/?utm_source=puter-readme&utm_medium=readme&utm_campaign=created-with-puter)'));
check('it says how to run it locally', R.TEXT.includes('git clone <this-repository-url>') && R.TEXT.includes('npx serve .'));
check('the code block is fenced', (R.TEXT.match(/^```/gm) || []).length === 2);
check('the custom domain says it is paid', /own domain with a paid plan/.test(R.TEXT));
check('nothing is left for a template to fill in', !/\$\{|undefined|null/.test(R.TEXT));
check('it ends with a newline', R.TEXT.endsWith('\n') && !R.TEXT.endsWith('\n\n'));

for (const name of ['README.md', 'readme.md', 'README', 'Readme.rst', 'README.txt', 'README.old.md']) {
    check(`"${name}" counts as a readme`, R.isReadmeName(name));
}
for (const name of ['readme-notes.md', 'my-readme.md', 'index.html', 'READ.md', '', null]) {
    check(`"${name}" is not a readme`, !R.isReadmeName(name));
}
check('a readme file in the listing is found', R.hasReadme([{ name: 'index.html' }, { name: 'Readme.md', is_dir: false }]));
check('a folder named readme is not a readme', !R.hasReadme([{ name: 'README', is_dir: true }, { name: 'index.html' }]));
check('a listing without one has none', !R.hasReadme([{ name: 'index.html' }, { name: 'app.js' }]));
check('no listing has none', !R.hasReadme(null));

// --- addReadmeToNewProject, the real bytes ---------------------------------
const a = versionsSrc.indexOf('    const _readmeSteps = new Map();');
const b = versionsSrc.indexOf('    async function performCreateVersion(opts)');
if (a < 0 || b < 0 || b <= a) throw new Error('could not extract addReadmeToNewProject from versions.js');
const block = versionsSrc.slice(a, b);

// index: the chat's version index, or an Error readIndex throws.
// indexGate: a promise readIndex waits on first (a slow read).
// write: what puter.fs.write does (default: succeeds).
// listing: what puter.fs.readdir returns for the project, or an Error it throws.
function sandbox({ index = { versions: [], current: null }, indexGate, write, listing, flag = true, module = true } = {}) {
    const calls = { reads: 0, writes: [], warns: 0, listings: 0 };
    const puter = {
        fs: {
            write: async (path, data, opts) => {
                calls.writes.push({ path, data, opts });
                if (write) return write(path, data, opts);
                return {};
            },
            readdir: async () => {
                calls.listings++;
                if (listing instanceof Error) throw listing;
                return listing;
            },
        },
    };
    const readIndex = async () => {
        calls.reads++;
        if (indexGate) await indexGate;
        if (index instanceof Error) throw index;
        return index;
    };
    const w = { FEATURE_FLAGS: { projectReadme: flag }, ProjectReadme: module ? R : undefined };
    const add = new Function('window', 'puter', 'readIndex', 'console',
        block + '\n; return addReadmeToNewProject;')(w, puter, readIndex, { warn: () => { calls.warns++; } });
    return { add, ensure: w.ensureProjectReadme, calls };
}

const APP = '/u/AppData/app/chat1';
const LISTING = [{ name: 'index.html' }, { name: 'app.js' }];

{
    const s = sandbox();
    await s.add('chat1', APP, LISTING);
    const w = s.calls.writes[0];
    check('a new project gets the README', s.calls.writes.length === 1 && w.path === APP + '/README.md' && w.data === R.TEXT, JSON.stringify(s.calls.writes));
    check('the write never replaces or renames a file', w && w.opts.overwrite === false && w.opts.dedupeName === false);
    await s.add('chat1', APP, LISTING);
    check('the same project is asked once per session', s.calls.reads === 1 && s.calls.writes.length === 1);
}
{
    const s = sandbox({ index: { versions: [{ id: 'v_1' }], current: 'v_1' } });
    await s.add('chat1', APP, LISTING);
    check('a project with versions gets none (an older project, or a README deleted since)', s.calls.writes.length === 0 && s.calls.reads === 1);
}
{
    const s = sandbox();
    await s.add('chat1', APP, [...LISTING, { name: 'readme.txt' }]);
    check('a project with its own readme keeps it, without reading the index', s.calls.writes.length === 0 && s.calls.reads === 0);
}
{
    const s = sandbox({ flag: false });
    await s.add('chat1', APP, LISTING);
    check('the flag off adds nothing', s.calls.writes.length === 0 && s.calls.reads === 0);
}
{
    const s = sandbox({ module: false });
    await s.add('chat1', APP, LISTING);
    check('without the module nothing happens', s.calls.writes.length === 0 && s.calls.reads === 0);
}
{
    const s = sandbox({ index: Object.assign(new Error('Failed to fetch'), { code: 'network_error' }) });
    let threw = false;
    try { await s.add('chat1', APP, LISTING); } catch (e) { threw = true; }
    check('an unreadable index skips the README and never throws', !threw && s.calls.writes.length === 0 && s.calls.warns === 1);
}
{
    const s = sandbox({ write: async () => { throw Object.assign(new Error('exists'), { code: 'item_with_same_name_exists' }); } });
    let threw = false;
    try { await s.add('chat1', APP, LISTING); } catch (e) { threw = true; }
    check('a failed write never throws (the snapshot goes ahead)', !threw && s.calls.warns === 1);
}

// --- The download waits for it (ensureProjectReadme) -----------------------
{
    // The first version's step is still reading the index when the download
    // starts: the download waits for that same step, so the zip, listed after
    // it, has the README.
    let open;
    const gate = new Promise((r) => { open = r; });
    const s = sandbox({ indexGate: gate, listing: LISTING });
    const snapshot = s.add('chat1', APP, LISTING);
    let downloadDone = false;
    const download = s.ensure('chat1', APP).then(() => { downloadDone = true; });
    await new Promise((r) => setTimeout(r, 10));
    check('a download during the first version waits for its README', !downloadDone && s.calls.writes.length === 0);
    open();
    await Promise.all([snapshot, download]);
    check('and goes on once the README is written', downloadDone && s.calls.writes.length === 1);
    check('the two share one step (one index read, one write)', s.calls.reads === 1 && s.calls.listings === 0);
}
{
    const s = sandbox({ listing: LISTING });
    await s.ensure('chat1', APP);
    check('a download before the first version adds the README itself', s.calls.writes.length === 1 && s.calls.listings === 1);
    await s.add('chat1', APP, LISTING);
    await s.ensure('chat1', APP);
    check('and the snapshot and later downloads ask nothing more', s.calls.reads === 1 && s.calls.listings === 1 && s.calls.writes.length === 1);
}
{
    const s = sandbox({ listing: [...LISTING, { name: 'README.md' }] });
    await s.ensure('chat1', APP);
    await s.ensure('chat1', APP);
    check('a project with a readme is listed once and left as it is', s.calls.listings === 1 && s.calls.reads === 0 && s.calls.writes.length === 0);
}
{
    const s = sandbox({ listing: [{ name: '.puter', is_dir: true }] });
    await s.ensure('chat1', APP);
    check('an empty project gets no README from a download', s.calls.writes.length === 0 && s.calls.reads === 0);
    await s.add('chat1', APP, LISTING);
    check('and its first version still adds one', s.calls.writes.length === 1);
}
{
    const s = sandbox({ listing: Object.assign(new Error('subject does not exist'), { code: 'subject_does_not_exist' }) });
    let threw = false;
    try { await s.ensure('chat1', APP); } catch (e) { threw = true; }
    check('a missing folder never fails the download', !threw && s.calls.writes.length === 0);
}
{
    const s = sandbox({ listing: LISTING, flag: false });
    await s.ensure('chat1', APP);
    check('the flag off adds nothing on download', s.calls.writes.length === 0);
}

// --- Wiring ----------------------------------------------------------------
const perf = versionsSrc.slice(b, versionsSrc.indexOf('    // Rewrite a single snapshot\'s label'));
const hook = perf.indexOf('if (!opts.fromRestore) await addReadmeToNewProject(chatId, appDir, items);');
check('performCreateVersion adds it, except for restores', hook > 0);
check('after the empty-project check and before the copy',
    hook > perf.indexOf('return NOTHING_TO_SNAPSHOT;') && hook < perf.indexOf('await puter.fs.copy(appDir, root'));

const dl = helpersSrc.slice(helpersSrc.indexOf('async function downloadProject(appDir, name, chatId)'));
const ensureAt = dl.indexOf('if (chatId) await window.ensureProjectReadme?.(chatId, appDir);');
check('the download waits for the README before it lists the files', ensureAt > 0 && ensureAt < dl.indexOf('await addDirToZip(appDir, zip);'));
check('the preview download passes its project', uiSrc.includes("await downloadProject(currentAppDir, title || 'project', currentChatId);"));
check('the sidebar download passes its project', uiSrc.includes('await downloadProject(appDir, title, chatId);'));
check('every download passes its project', (uiSrc.match(/downloadProject\(/g) || []).length === 2);

const order = (name) => viteSrc.indexOf(`'${name}'`);
check('the module loads before versions.js', order('js/project-readme.js') > 0 && order('js/project-readme.js') < order('js/versions.js'));
check('the flag is on', /\n    projectReadme: true,/.test(helpersSrc));

// --- The prompt rule -------------------------------------------------------
function promptWith(flags) {
    const w = { FEATURE_FLAGS: flags };
    new Function('window', promptSrc)(w);
    return w.system_prompt_common();
}
const RULE = 'The builder adds a README.md file to each project\'s root directory.';
check('the prompt tells the model about the README', promptWith({ projectReadme: true }).includes(RULE));
check('the rule tells it to write none of its own unless asked',
    promptWith({ projectReadme: true }).includes('Unless the user asks you to, do not create a README of your own, and do not edit, move or delete the builder\'s README.md.'));
check('the flag off drops the rule', !promptWith({ projectReadme: false }).includes('README'));

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nAll project README checks passed.');
