import fs from 'node:fs';

// ---- Regression guard for the worker tools' project sandbox ----------------
// Deployed Puter workers are ACCOUNT-level resources keyed only by name and
// shared by every project on the account, so all four worker tools are scoped
// to the project. On the write side: delete_worker must only ever delete a
// worker THIS project owns, and create_worker — whose backing call redeploys an
// existing name — must never take over a name another project holds. On the read
// side: list_workers and get_worker must not hand another project's worker names,
// live URLs and source paths (which embed its chat id) to this project's model,
// where they persist in the conversation and can get wired into this app.
// Ownership is the rule the rest of the app already uses
// (WorkerOwnership.ownedWorkers: the deployed record's source file lives inside
// the project dir). This test evaluates the REAL tool files with the REAL
// path-sandbox helpers (helpers.js) and the REAL ownership module against a fake
// puter.workers, and drives every accept/refuse branch.
// Mirrors scripts/test-search-files.mjs.

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

// --- Real path-sandbox helpers (helpers.js) + real ownership module ---------
const HELP = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const a = HELP.indexOf('window.normalizePosixPath =');
const b = HELP.indexOf('// ---- Per-path file-write serialization');
if (a < 0 || b < 0 || b <= a) throw new Error('could not extract the path-sandbox helper block');
const WO_SRC = fs.readFileSync(new URL('../src/js/worker-ownership.js', import.meta.url), 'utf8');
const CREATE = fs.readFileSync(new URL('../src/tools/workers/create_worker.js', import.meta.url), 'utf8');
const DELETE = fs.readFileSync(new URL('../src/tools/workers/delete_worker.js', import.meta.url), 'utf8');
const LIST = fs.readFileSync(new URL('../src/tools/workers/list_workers.js', import.meta.url), 'utf8');
const GET = fs.readFileSync(new URL('../src/tools/workers/get_worker.js', import.meta.url), 'utf8');

// --- Fake puter.workers / puter.fs -------------------------------------------
let WORKERS = [];
let LIST_THROWS = false;
const calls = { created: [], deleted: [], mkdir: [], writes: [], got: [], listed: 0 };
function resetCalls() { for (const k of Object.keys(calls)) calls[k] = Array.isArray(calls[k]) ? [] : 0; }
const puter = {
    workers: {
        list: async () => { calls.listed++; if (LIST_THROWS) throw new Error('network down'); return WORKERS.slice(); },
        create: async (name, path, opts) => { calls.created.push({ name, path, opts }); return { success: true, url: `https://${name}.puter.work/` }; },
        delete: async (name) => { calls.deleted.push(name); },
        get: async (name) => {
            calls.got.push(name);
            const w = WORKERS.find(x => x.name === name);
            return w ? { ...w, file_uid: 'uid-' + name } : null;
        },
    },
    fs: { mkdir: async (p) => { calls.mkdir.push(p); } },
};
const win = {
    tools: [],
    withFileLock: (p, fn) => Promise.resolve().then(fn),
    writeFileVerified: async (p, d) => { calls.writes.push({ p, d }); },
};
new Function('window', 'puter', HELP.slice(a, b) + '\n' + WO_SRC + '\n' + CREATE + '\n' + DELETE + '\n' + LIST + '\n' + GET)(win, puter);
const create = win.tools.find(t => t.function && t.function.name === 'create_worker');
const del = win.tools.find(t => t.function && t.function.name === 'delete_worker');
const list = win.tools.find(t => t.function && t.function.name === 'list_workers');
const get = win.tools.find(t => t.function && t.function.name === 'get_worker');
if (!create || !del || !list || !get) throw new Error('worker tools did not register');
const WO = win.WorkerOwnership;

const ROOT = '/nj/AppData/app-uid/chat_abc';
const OTHER = '/nj/AppData/app-uid/chat_xyz';
const st = { appDir: ROOT };
const own = (name) => ({ name, url: `https://${name}.puter.work/`, file_path: `${ROOT}/workers/${name}.js` });
const theirs = (name) => ({ name, url: `https://${name}.puter.work/`, file_path: `${OTHER}/workers/${name}.js` });

// === Pure name lookup ========================================================
{
    const list = [own('api'), theirs('Api'), theirs('other')];
    check('matchesByName: case-insensitive, exact first',
        WO.matchesByName(list, 'api').map(w => w.name).join(',') === 'api,Api');
    check('matchesByName: no hit → []', WO.matchesByName(list, 'nope').length === 0);
    check('matchesByName: junk input → []',
        WO.matchesByName(null, 'api').length === 0 && WO.matchesByName(list, '').length === 0);
    check('findByName: exact match wins', WO.findByName(list, 'Api').name === 'Api');
    check('findByName: unique case-variant is accepted', WO.findByName(list, 'OTHER').name === 'other');
    const twins = [theirs('ab'), theirs('AB')];
    check('findByName: ambiguous case-variants are NOT guessed at', WO.findByName(twins, 'Ab') === null);
    check('findByName: …but an exact match among them is returned', WO.findByName(twins, 'AB').name === 'AB');
    check('findByName: no hit → null', WO.findByName(twins, 'zz') === null);
}

// === delete_worker ===========================================================
WORKERS = [own('api'), theirs('billing'), { name: 'legacy', url: 'https://legacy.puter.work/' }];
resetCalls();
{
    const r = await del.exec({ name: 'api' }, st);
    check('delete: own worker is deleted', calls.deleted.join(',') === 'api' && r.success === true && r.name === 'api');
}
resetCalls();
check("delete: another project's worker is refused (model-directed error)",
    await rejects(del.exec({ name: 'billing' }, st), 'does not belong to this project'));
check('delete: refusal deletes nothing', calls.deleted.length === 0);
resetCalls();
check('delete: unknown name → not found', await rejects(del.exec({ name: 'ghost' }, st), 'not found'));
check('delete: a record with no source path is not deletable (cannot prove ownership)',
    await rejects(del.exec({ name: 'legacy' }, st), 'does not belong'));
check('delete: nothing deleted across the refusals', calls.deleted.length === 0);
resetCalls();
{
    WORKERS = [own('api')];
    const r = await del.exec({ name: 'API' }, st);
    check('delete: unique case-variant resolves to the real record and deletes by its real name',
        calls.deleted.join(',') === 'api' && r.name === 'api');
}
resetCalls();
check('delete: empty name is refused', await rejects(del.exec({ name: '  ' }, st), 'non-empty'));
check('delete: no project dir (no state, no global) → refused for safety',
    await rejects(del.exec({ name: 'api' }, {}), 'refused for safety'));
LIST_THROWS = true;
check('delete: a failing worker lookup fails CLOSED', await rejects(del.exec({ name: 'api' }, st)) && calls.deleted.length === 0);
LIST_THROWS = false;

// === create_worker ===========================================================
WORKERS = [own('api'), theirs('billing'), theirs('Reports')];
resetCalls();
{
    const r = await create.exec({ name: 'fresh', code: 'router.get("/", () => 1);' }, st);
    // Worker names are shared by everyone on Puter, so a new worker gets a
    // random suffix (issue #35: "guestbook" was another user's).
    check('create: a new worker is named after the request plus a suffix',
        calls.created.length === 1 && r.success === true && /^fresh-[a-z0-9]{6}$/.test(r.name), r.name);
    check('create: …and the result says to use that name', /Builder named this worker 'fresh-[a-z0-9]{6}'/.test(r.note || ''), r.note);
    check('create: source lands at <project>/workers/<name>.js',
        calls.writes[0] && calls.writes[0].p === `${ROOT}/workers/${r.name}.js` && r.file_path === calls.writes[0].p);
    check('create: deployed from that file under that name, sandboxed',
        calls.created[0].name === r.name && calls.created[0].path === `${ROOT}/workers/${r.name}.js`
        && calls.created[0].opts && calls.created[0].opts.sandbox === true);
    check('create: workers/ dir is created under the project', calls.mkdir[0] === `${ROOT}/workers`);
    check('create: the account list is consulted before writing', calls.listed === 1);
}
resetCalls();
{
    const r = await create.exec({ name: 'api', code: 'x' }, st);
    check("create: this project's OWN worker by that name is redeployed, not suffixed",
        calls.created.length === 1 && r.name === 'api' && calls.created[0].name === 'api' && !r.note);
}
resetCalls();
{
    const a = await create.exec({ name: 'notes', code: 'x' }, st);
    WORKERS = [own('api'), own(a.name), theirs('billing'), theirs('Reports')];
    const b = await create.exec({ name: 'Notes', code: 'y' }, st);
    check('create: asking again for the same name redeploys the worker the first call made',
        b.name === a.name && calls.created.length === 2 && calls.created[1].name === a.name, a.name + ' / ' + b.name);
    check("create: …and that name is the project's own, not another project's",
        WO.requestedName(OTHER, 'notes') !== a.name);
    WORKERS = [own('api'), own('chat-server'), theirs('billing'), theirs('Reports')];
    const c = await create.exec({ name: 'chat', code: 'x' }, st);
    check("create: a request for 'chat' never touches this project's 'chat-server'",
        c.name !== 'chat-server' && /^chat-[a-z0-9]{6}$/.test(c.name) && calls.created[2].name === c.name, c.name);
    const long1 = await create.exec({ name: 'x'.repeat(40) + 'one', code: 'x' }, st);
    const long2 = await create.exec({ name: 'x'.repeat(40) + 'two', code: 'x' }, st);
    check('create: two long names that only differ past the cut get different workers', long1.name !== long2.name, long1.name);
    WORKERS = [own('api'), theirs('billing'), theirs('Reports')];
}
resetCalls();
{
    // The name this request always gets is held by another project of the
    // account: a random suffix instead, written nowhere first.
    const usual = WO.requestedName(ROOT, 'inbox');
    WORKERS = [own('api'), theirs(usual)];
    const r = await create.exec({ name: 'inbox', code: 'x' }, st);
    check("create: a name another project holds gets a random suffix instead",
        r.name !== usual && /^inbox-[a-z0-9]{6}$/.test(r.name) && calls.writes.length === 1 && calls.writes[0].p === `${ROOT}/workers/${r.name}.js`, r.name);
    WORKERS = [own('api'), theirs('billing'), theirs('Reports')];
}
resetCalls();
{
    // ...or by another Puter user, whose 'sandbox-<name>' app has no owner
    // we can see. A sandbox app of our own is ours to reuse.
    const usual = WO.requestedName(ROOT, 'guestbook');
    puter.apps = { get: async (n) => {
        if (n === 'sandbox-' + usual) return { name: n };
        throw { code: 'entity_not_found' };
    } };
    puter.getUser = async () => ({ uuid: 'me' });
    const r = await create.exec({ name: 'guestbook', code: 'x' }, st);
    check("create: a name another Puter user holds gets a random suffix, before anything is written",
        r.name !== usual && /^guestbook-[a-z0-9]{6}$/.test(r.name) && calls.writes.length === 1 && calls.writes[0].p.endsWith(`/${r.name}.js`), r.name);
    puter.apps = { get: async (n) => ({ name: n, owner: { uuid: 'me' } }) };
    resetCalls();
    const mine = await create.exec({ name: 'guestbook', code: 'x' }, st);
    check('create: …while a sandbox app of our own keeps the usual name', mine.name === usual, mine.name);
    delete puter.apps;
    delete puter.getUser;
}
resetCalls();
{
    const r = await create.exec({ name: 'billing', code: 'x' }, st);
    check("create: a name held by another project gets a new worker of this project's own",
        /^billing-[a-z0-9]{6}$/.test(r.name) && calls.created.length === 1 && calls.created[0].name === r.name, r.name);
}
resetCalls();
{
    const r = await create.exec({ name: 'reports', code: 'x' }, st);
    check("create: so does a case-variant of another project's name",
        /^reports-[a-z0-9]{6}$/.test(r.name) && calls.created[0].name === r.name, r.name);
}
resetCalls();
{
    const r = await create.exec({ name: 'A'.repeat(50), code: 'x' }, st);
    check('create: a long name is shortened so the published copy ("-live") keeps the whole suffix',
        /^a{38}-[a-z0-9]{6}$/.test(r.name) && (r.name.slice(0, 45) + '-live').includes(r.name.slice(-6)), r.name);
}
resetCalls();
{
    const realCreate = puter.workers.create;
    puter.workers.create = async () => { throw new TypeError("Cannot read properties of undefined (reading 'uuid')"); };
    check("create: puter.js's crash on another user's name is explained to the model",
        await rejects(create.exec({ name: 'guestbook', code: 'x' }, st), 'already taken by another Puter user'));
    puter.workers.create = realCreate;
}
resetCalls();
check('create: a name that escapes the project dir is refused before any IO',
    await rejects(create.exec({ name: '../../escape', code: 'x' }, st), 'Invalid worker name') && calls.listed === 0 && calls.writes.length === 0);
resetCalls();
// "../index" stays INSIDE the project (<root>/index.js), so the path sandbox
// alone let it through and the worker source overwrote the app's entry file.
check('create: a name that resolves inside the project but outside workers/ is refused',
    await rejects(create.exec({ name: '../index', code: 'x' }, st), 'Invalid worker name') && calls.listed === 0 && calls.writes.length === 0);
check('create: a name with a slash is refused',
    await rejects(create.exec({ name: 'api/v1', code: 'x' }, st), 'Invalid worker name'));
check('create: empty name is refused', await rejects(create.exec({ name: '', code: 'x' }, st), 'non-empty'));
check('create: no project dir → refused for safety', await rejects(create.exec({ name: 'w', code: 'x' }, {}), 'refused for safety'));
resetCalls();
LIST_THROWS = true;
check('create: a failing worker lookup fails CLOSED (nothing written)',
    await rejects(create.exec({ name: 'fresh2', code: 'x' }, st)) && calls.writes.length === 0 && calls.created.length === 0);
LIST_THROWS = false;

// === list_workers ============================================================
WORKERS = [own('api'), own('notes'), theirs('billing'), { name: 'legacy', url: 'https://legacy.puter.work/' }];
resetCalls();
{
    const r = await list.exec({}, st);
    const names = r.workers.map(w => w.name).sort().join(',');
    check("list: only this project's workers are listed", r.success === true && names === 'api,notes');
    check("list: another project's worker is not listed", !r.workers.some(w => w.name === 'billing'));
    check('list: a record with no source path is not claimed', !r.workers.some(w => w.name === 'legacy'));
    check('list: each entry still carries name/url/file_path', r.workers.every(w => w.name && w.url && w.file_path));
}
resetCalls();
{
    WORKERS = [theirs('billing')];
    const r = await list.exec({}, st);
    check('list: a project with no workers of its own lists nothing', r.success === true && r.workers.length === 0);
}
check('list: no project dir → refused for safety', await rejects(list.exec({}, {}), 'refused for safety'));
LIST_THROWS = true;
check('list: a failing account lookup fails CLOSED', await rejects(list.exec({}, st)));
LIST_THROWS = false;

// === get_worker ==============================================================
WORKERS = [own('api'), theirs('billing'), { name: 'legacy', url: 'https://legacy.puter.work/' }];
resetCalls();
{
    const r = await get.exec({ name: 'api' }, st);
    check("get: this project's own worker is returned", r.success === true && r.name === 'api' && !!r.url);
    check('get: details come from workers.get (file_uid present)', r.file_uid === 'uid-api');
}
resetCalls();
{
    const r = await get.exec({ name: 'billing' }, st);
    check("get: another project's worker reports not found", r.success === false && /not found/i.test(r.error));
    check("get: and its details are never fetched", calls.got.length === 0);
    check("get: nothing about it leaks into the result", !JSON.stringify(r).includes('puter.work'));
}
resetCalls();
{
    const r = await get.exec({ name: 'legacy' }, st);
    check('get: a record with no source path is not claimed', r.success === false && calls.got.length === 0);
}
resetCalls();
{
    const r = await get.exec({ name: 'ghost' }, st);
    check('get: an unknown name reports not found', r.success === false);
}
resetCalls();
{
    WORKERS = [own('api')];
    const r = await get.exec({ name: 'API' }, st);
    check('get: a unique case-variant resolves to the real record', r.success === true && r.name === 'api');
}
check('get: empty name is refused', await rejects(get.exec({ name: '  ' }, st), 'non-empty'));
check('get: no project dir → refused for safety', await rejects(get.exec({ name: 'api' }, {}), 'refused for safety'));
resetCalls();
LIST_THROWS = true;
check('get: a failing account lookup fails CLOSED', await rejects(get.exec({ name: 'api' }, st)) && calls.got.length === 0);
LIST_THROWS = false;

// === A duplicated chat's history follows the copy's worker names =============
{
    const use = (id, name, input) => ({ role: 'assistant', content: { type: 'tool_use', id, name, input } });
    const result = (id, obj) => ({ role: 'user', content: { type: 'tool_result', tool_use_id: id, content: JSON.stringify(obj) } });
    const history = [
        use('c1', 'create_worker', { name: 'guestbook', code: 'x' }),
        result('c1', { success: true, name: 'guestbook-ab12cd', url: 'https://guestbook-ab12cd.puter.work',
            note: "Builder named this worker 'guestbook-ab12cd' so its name is unique on Puter. Use this name and url from now on." }),
        use('s1', 'set_secret', { worker: 'guestbook-ab12cd', name: 'KEY', value: 'v', live: false }),
        result('s1', { success: true, worker: 'guestbook-ab12cd', name: 'KEY', live: false }),
        use('e1', 'edit', { path: '/x/workers/guestbook-ab12cd.js', old_content: 'a', new_content: 'b' }),
        result('e1', { success: true, path: '/x/workers/guestbook-ab12cd.js', worker: { name: 'guestbook-ab12cd', url: 'https://guestbook-ab12cd.puter.work', live: true } }),
    ];
    const out = WO.rewriteHistory(history, [{ oldName: 'guestbook-ab12cd', newName: 'guestbook-ab12cd-x7k2p1',
        oldUrl: 'https://guestbook-ab12cd.puter.work', newUrl: 'https://guestbook-ab12cd-x7k2p1.puter.work' }]);
    const parsed = (i) => JSON.parse(out[i].content.content);
    check("duplicate: create_worker's result and its note name the copy's worker",
        parsed(1).name === 'guestbook-ab12cd-x7k2p1' && parsed(1).note.includes("'guestbook-ab12cd-x7k2p1'") && !parsed(1).note.includes("'guestbook-ab12cd'"), parsed(1).note);
    check("duplicate: set_secret's input and result name the copy's worker",
        out[2].content.input.worker === 'guestbook-ab12cd-x7k2p1' && parsed(3).worker === 'guestbook-ab12cd-x7k2p1');
    check("duplicate: a file save's worker field names the copy's worker",
        parsed(5).worker.name === 'guestbook-ab12cd-x7k2p1' && parsed(5).worker.url === 'https://guestbook-ab12cd-x7k2p1.puter.work', JSON.stringify(parsed(5)));
}

// === Wiring: the guards stay hooked up ========================================
check('delete_worker consults WorkerOwnership.ownedWorkers', DELETE.includes('WorkerOwnership.ownedWorkers('));
check('create_worker consults WorkerOwnership.ownedWorkers', CREATE.includes('WO.ownedWorkers(all, root)'));
check('list_workers consults WorkerOwnership.ownedWorkers', LIST.includes('WorkerOwnership.ownedWorkers('));
check('get_worker consults WorkerOwnership.ownedWorkers', GET.includes('WorkerOwnership.ownedWorkers('));
check('all four tools scope to the turn-captured project dir',
    [DELETE, CREATE, LIST, GET].every(src => src.includes('window.projectRootDir(state)')));
// The descriptions must tell the model the scope, or it will keep asking for
// workers it cannot see and mis-read the refusals.
check('the read tools describe themselves as project-scoped',
    /THIS project/.test(LIST) && /THIS project/.test(GET));

if (failures) {
    console.error(`\n${failures} check(s) FAILED`);
    process.exit(1);
}
console.log('\nAll worker-tool sandbox checks passed');
