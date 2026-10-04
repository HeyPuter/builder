import fs from 'node:fs';

// ---- Regression guard: a failed read is only "not found" when it is ----------
// edit and multi_edit read the file before matching. ANY read failure used to be
// reported as "File not found … Use the 'write' tool to create new files." — a
// network blip on an existing file then invited the model to recreate it from
// memory, silently dropping whatever it misremembered. Only a genuinely missing
// file may point at 'write'; anything else must say the file was left as is.
//
// Runs the real tools against a stubbed filesystem, with the real
// isNotFoundError from app.js.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const app = read('../src/js/app.js');
const a = app.indexOf('function isNotFoundError(error) {');
const b = app.indexOf('\n}\n', a);
const isNotFoundError = new Function(app.slice(a, b + 2) + '\nreturn isNotFoundError;')();

const win = {
    tools: [],
    assertPathInProject: (p) => p,
    withFileLock: (_p, fn) => fn(),
    applyFileEdit: (c, o, n) => c.replace(o, n),
    writeFileVerified: async () => {},
};
let readImpl;
const puter = { fs: { read: (...args) => readImpl(...args) } };
for (const file of ['../src/tools/fs/edit.js', '../src/tools/fs/multi_edit.js']) {
    new Function('window', 'puter', 'isNotFoundError', read(file))(win, puter, isNotFoundError);
}
const tool = (name) => win.tools.find((t) => t.function.name === name);
const runs = {
    edit: () => tool('edit').exec({ path: '/u/app/index.html', old_content: 'a', new_content: 'b' }, {}),
    multi_edit: () => tool('multi_edit').exec({ path: '/u/app/index.html', edits: [{ old_content: 'a', new_content: 'b' }] }, {}),
};

for (const [name, run] of Object.entries(runs)) {
    readImpl = async () => { throw { code: 'subject_does_not_exist', message: 'Subject does not exist' }; };
    let err = null;
    try { await run(); } catch (e) { err = e; }
    check(`${name}: a missing file still points at 'write'`, err && /File not found/.test(err.message) && /'write'/.test(err.message), err && err.message);

    readImpl = async () => { throw new TypeError('Failed to fetch'); };
    err = null;
    try { await run(); } catch (e) { err = e; }
    check(`${name}: a network failure is not reported as a missing file`, err && !/File not found/.test(err.message), err && err.message);
    check(`${name}: …says why, that nothing changed, and not to recreate it`,
        err && /Failed to fetch/.test(err.message) && /nothing was changed/.test(err.message) && /do not recreate/.test(err.message), err && err.message);

    readImpl = async () => ({ text: async () => 'a' });
    let res = null;
    try { res = await run(); } catch (e) { err = e; }
    check(`${name}: a readable file is edited as before`, res && res.success === true, err && err.message);
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll edit read-error checks passed.');
