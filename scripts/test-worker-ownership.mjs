import fs from 'node:fs';

// ---- Regression guard for serverless-worker ownership (worker-ownership.js) --
// Deployed workers are account-level resources keyed by name; the builder's
// ownership rule is "the deployed record's file_path lives inside the
// project's app dir". These checks pin down the two flows that depend on it:
//   - deleteChat must delete a project's OWNED workers (and never a
//     duplicate's look-alikes) before removing the app directory;
//   - duplicateChat must redeploy the source's workers under fresh names for
//     the copy and rewrite every reference (URLs in files, names/paths/URLs in
//     the cloned history) without ever touching unrelated strings.
// The module is intentionally pure / DOM-free; we evaluate the production
// bytes with a bare window (mirroring scripts/test-issues.mjs) and finish with
// wiring asserts on app.js + vite.config.js so the pure logic can't silently
// come unhooked from the flows it protects.

const src = fs.readFileSync(new URL('../src/js/worker-ownership.js', import.meta.url), 'utf8');
const window = {};
new Function('window', src)(window);
const WO = window.WorkerOwnership;

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

if (!WO || typeof WO.ownedWorkers !== 'function') {
    console.error('FAIL - window.WorkerOwnership was not defined');
    process.exit(1);
}

const APP_DIR = '/nj/AppData/app-uid/chat_abc';

// --- ownedWorkers --------------------------------------------------------------
{
    const workers = [
        { name: 'api', url: 'https://api.puter.work', file_path: APP_DIR + '/workers/api.js' },
        { name: 'deep', url: 'https://deep.puter.work', file_path: APP_DIR + '/backend/nested/deep.js' },
        { name: 'sibling', url: 'https://s.puter.work', file_path: '/nj/AppData/app-uid/chat_abc2/workers/s.js' },
        { name: 'elsewhere', url: 'https://e.puter.work', file_path: '/nj/other/w.js' },
        { name: 'exact-dir', url: 'https://x.puter.work', file_path: APP_DIR },
        { name: 'no-path', url: 'https://n.puter.work' },
        { name: '', file_path: APP_DIR + '/workers/anon.js' },
        null,
    ];
    const owned = WO.ownedWorkers(workers, APP_DIR);
    check('owned: matches files inside the app dir', owned.some(w => w.name === 'api'));
    check('owned: matches nested (non-workers/) placements', owned.some(w => w.name === 'deep'));
    check('owned: chatId-prefix sibling dir is NOT owned', !owned.some(w => w.name === 'sibling'));
    check('owned: unrelated paths are not owned', !owned.some(w => w.name === 'elsewhere'));
    check('owned: path equal to the dir itself is not owned', !owned.some(w => w.name === 'exact-dir'));
    check('owned: records without file_path/name are skipped', owned.length === 2);
    check('owned: trailing slash on appDir tolerated', WO.ownedWorkers(workers, APP_DIR + '/').length === 2);
    check('owned: non-array workers → empty', WO.ownedWorkers(null, APP_DIR).length === 0);
    check('owned: empty appDir → empty (never match-everything)', WO.ownedWorkers(workers, '').length === 0);
    check('owned: slash-only appDir → empty', WO.ownedWorkers(workers, '///').length === 0);
}

// --- deriveCopyName --------------------------------------------------------------
{
    check('name: appends the suffix', WO.deriveCopyName('api', [], () => 'x1y2z3') === 'api-x1y2z3');
    // Collision retries with the next suffix.
    const seq = ['dup', 'ok2'];
    check('name: retries on collision', WO.deriveCopyName('api', ['api-dup'], () => seq.shift()) === 'api-ok2');
    const seq2 = ['s1', 's2'];
    check('name: case-insensitive collision retries', WO.deriveCopyName('api', ['API-S1'], () => seq2.shift()) === 'api-s2');
    const long = 'w'.repeat(80);
    const derived = WO.deriveCopyName(long, [], () => 'abc123');
    check('name: long base is trimmed under the cap', derived.length <= WO.MAX_NAME_LENGTH && derived.endsWith('-abc123'));
    check('name: exhaustion returns null', WO.deriveCopyName('api', ['api-same'], () => 'same') === null);
    check('name: empty base returns null', WO.deriveCopyName('', [], () => 'x') === null);
}

// --- planCopies --------------------------------------------------------------
{
    const NEW_DIR = '/nj/AppData/app-uid/chat_new';
    // 'job' + suffix 'x-1' and 'job-x' + suffix '1' both yield 'job-x-1': the
    // first assignment must be reserved so the second retries to 'job-x-2'.
    const workers = [
        { name: 'job', url: 'https://job.puter.work', file_path: APP_DIR + '/workers/job.js' },
        { name: 'job-x', url: 'https://job-x.puter.work', file_path: APP_DIR + '/backend/job-x.js' },
        { name: 'foreign', url: 'https://f.puter.work', file_path: '/nj/other/f.js' },
    ];
    const seq = ['x-1', '1', '2'];
    const plans = WO.planCopies(workers, workers.map(w => w.name), APP_DIR, NEW_DIR, () => seq.shift());
    check('plan: only owned workers are planned', plans.length === 2 && !plans.some(p => p.oldName === 'foreign'));
    const job = plans.find(p => p.oldName === 'job');
    check('plan: copied path lands in the new dir', job.copiedFilePath === NEW_DIR + '/workers/job.js');
    check('plan: new file keeps the dir, renamed to <newName>.js', job.newFilePath === NEW_DIR + '/workers/job-x-1.js');
    const jobx = plans.find(p => p.oldName === 'job-x');
    check('plan: non-workers/ placement is preserved', jobx.copiedFilePath === NEW_DIR + '/backend/job-x.js');
    check('plan: names assigned earlier are reserved', jobx.newName === 'job-x-2');
    check('plan: newUrl starts unknown', job.newUrl === null);
    check('plan: oldUrl carried for the rewrite', job.oldUrl === 'https://job.puter.work');
}

// --- rewriteUrlsInText --------------------------------------------------------------
{
    const renames = [{ oldName: 'api', newName: 'api-x1', oldUrl: 'https://api.puter.work/', newUrl: 'https://api-x1.puter.work' }];
    const rw = (t) => WO.rewriteUrlsInText(t, renames);
    check('url: full URL rewritten', rw('fetch("https://api.puter.work")').text === 'fetch("https://api-x1.puter.work")');
    check('url: sub-path usage rewritten', rw('exec("https://api.puter.work/v1/items?x=1")').text === 'exec("https://api-x1.puter.work/v1/items?x=1")');
    check('url: protocol-relative form rewritten', rw("const u = '//api.puter.work/ws';").text === "const u = '//api-x1.puter.work/ws';");
    check('url: bare host rewritten', rw('host: "api.puter.work"').text === 'host: "api-x1.puter.work"');
    check('url: host at start of text rewritten', rw('api.puter.work/x').text === 'api-x1.puter.work/x');
    check('url: look-alike host with hyphen prefix untouched', rw('https://my-api.puter.work/x').changed === false);
    check('url: look-alike host with underscore prefix untouched', rw('https://my_api.puter.work/x').changed === false);
    check('url: subdomain look-alike untouched', rw('https://x.api.puter.work/x').changed === false);
    check('url: longer-TLD look-alike untouched', rw('https://api.puter.works/x').changed === false);
    check('url: changed flag false on no-op', rw('nothing here').changed === false);
    check('url: non-string passthrough', WO.rewriteUrlsInText(null, renames).text === null);
    check('url: rename without newUrl is skipped', WO.rewriteUrlsInText('https://api.puter.work', [{ oldUrl: 'https://api.puter.work', newUrl: null }]).changed === false);
    check('url: dot in host never acts as a wildcard', rw('apiXputerXwork').changed === false);
}

// --- rewriteHistory --------------------------------------------------------------
{
    const NEW_DIR = '/nj/AppData/app-uid/chat_new';
    // The history AFTER duplicateChat's app-dir rewrite: paths are already in
    // new-dir space, but names/URLs still belong to the ORIGINAL's workers.
    const history = [
        { role: 'system', content: `workdir ${NEW_DIR}` },
        { role: 'user', content: 'add a backend', messageId: 'm1' },
        { role: 'assistant', content: { type: 'tool_use', id: 'tu1', name: 'create_worker', input: { name: 'api', code: "router.get('/', () => 'api')" } } },
        { role: 'user', content: { type: 'tool_result', tool_use_id: 'tu1', content: JSON.stringify({ success: true, name: 'api', url: 'https://api.puter.work', errors: [] }) } },
        { role: 'assistant', content: 'Live at https://api.puter.work/ — the api is ready.', messageId: 'm2' },
        { role: 'assistant', content: [{ type: 'text', text: 'checking' }, { type: 'tool_use', id: 'tu2', name: 'get_worker', input: { name: 'api' } }] },
        { role: 'user', content: { type: 'tool_result', tool_use_id: 'tu2', content: JSON.stringify({ success: true, name: 'api', url: 'https://api.puter.work', file_path: `${NEW_DIR}/workers/api.js` }) } },
        { role: 'assistant', content: { type: 'tool_use', id: 'tu3', name: 'list_workers', input: {} } },
        { role: 'user', content: { type: 'tool_result', tool_use_id: 'tu3', content: JSON.stringify({ success: true, workers: [{ name: 'api', url: 'https://api.puter.work', file_path: `${NEW_DIR}/workers/api.js` }, { name: 'other', url: 'https://other.puter.work', file_path: '/nj/other/w.js' }] }) } },
        { role: 'assistant', content: { type: 'tool_use', id: 'tu4', name: 'edit', input: { path: `${NEW_DIR}/workers/api.js`, old_content: 'x', new_content: 'y' } } },
        // An unrelated tool result with a coincidental `name` field — a name
        // rewrite here would corrupt it, so it must stay untouched.
        { role: 'user', content: { type: 'tool_result', tool_use_id: 'tu4', content: JSON.stringify({ success: true, name: 'api' }) } },
        // Unparseable result content and content-block arrays must survive.
        { role: 'user', content: { type: 'tool_result', tool_use_id: 'tu1', content: 'plain text mentioning api' } },
        { role: 'user', content: { type: 'tool_result', tool_use_id: 'tu2', content: [{ type: 'text', text: 'block content' }] } },
    ];
    const before = JSON.stringify(history);
    const renames = [{
        oldName: 'api', newName: 'api-x1y2', oldUrl: 'https://api.puter.work/', newUrl: 'https://api-x1y2.puter.work',
        copiedFilePath: `${NEW_DIR}/workers/api.js`, newFilePath: `${NEW_DIR}/workers/api-x1y2.js`,
    }];
    const out = WO.rewriteHistory(history, renames);

    check('history: input is never mutated', JSON.stringify(history) === before);
    check('history: returns a new array', out !== history);
    check('history: create_worker input name renamed', out[2].content.input.name === 'api-x1y2');
    check('history: worker code body untouched (no bare-name rewrite)', out[2].content.input.code === "router.get('/', () => 'api')");
    const tu1res = JSON.parse(out[3].content.content);
    check('history: create_worker result name renamed', tu1res.name === 'api-x1y2');
    check('history: create_worker result url swapped (double-encoded)', tu1res.url === 'https://api-x1y2.puter.work');
    check('history: narration URL swapped, prose intact', out[4].content === 'Live at https://api-x1y2.puter.work/ — the api is ready.');
    check('history: tool_use inside a content array renamed', out[5].content[1].input.name === 'api-x1y2');
    const tu2res = JSON.parse(out[6].content.content);
    check('history: get_worker result file_path moved to the renamed file', tu2res.file_path === `${NEW_DIR}/workers/api-x1y2.js`);
    const listRes = JSON.parse(out[8].content.content);
    check('history: list_workers entry renamed', listRes.workers[0].name === 'api-x1y2');
    check('history: unrelated list_workers entry untouched', listRes.workers[1].name === 'other' && listRes.workers[1].url === 'https://other.puter.work');
    check('history: fs-tool input path follows the renamed file', out[9].content.input.path === `${NEW_DIR}/workers/api-x1y2.js`);
    check('history: coincidental name field of a non-worker tool untouched', JSON.parse(out[10].content.content).name === 'api');
    check('history: unparseable result content untouched', out[11].content.content === 'plain text mentioning api');
    check('history: content-block array results untouched', Array.isArray(out[12].content.content));
    check('history: messageIds preserved', out[1].messageId === 'm1' && out[4].messageId === 'm2');
    check('history: empty renames → history returned as-is', WO.rewriteHistory(history, []) === history);
    check('history: non-array history passthrough', WO.rewriteHistory('nope', renames) === 'nope');
}

// --- wiring: app.js + vite.config.js ------------------------------------------
{
    const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
    const VITE = fs.readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8');

    const delStart = APP.indexOf('async function deleteChat');
    const delEnd = APP.indexOf('async function', delStart + 1);
    const delBody = APP.slice(delStart, delEnd);
    check('wiring: deleteChat exists', delStart >= 0);
    // Both halves of the project's backend: the draft's workers (source in the
    // app dir) and the published release's (source in the published container —
    // see deployPublishedWorkers in ui.js).
    check('wiring: deleteChat enumerates OWNED workers (path-based rule)',
        /WorkerOwnership\.ownedWorkers\(all, appDir\)[\s\S]{0,120}WorkerOwnership\.ownedWorkers\(all, publishedDir\)/.test(delBody));
    check('wiring: deleteChat deletes each owned worker', delBody.includes('puter.workers.delete(worker.name)'));
    check('wiring: worker cleanup runs BEFORE the app-dir delete', delBody.indexOf('puter.workers.delete') < delBody.indexOf('puter.fs.delete(appDir, { recursive: true })'));
    // Worker cleanup is NOT best-effort any more: a worker (or an enumeration)
    // that could not be removed leaves the project listed and retryable rather
    // than hiding it with its backend still running. Behaviour is covered by
    // scripts/test-delete-cleanup.mjs; this just pins the wiring.
    check('wiring: a failed worker cleanup blocks the delete',
        /cleanup\('this project.s workers'/.test(delBody) && delBody.includes('if (undeleted.length)'));

    const dupStart = APP.indexOf('async function duplicateChat');
    const dupEnd = APP.indexOf('window.duplicateChat = duplicateChat');
    const dupBody = APP.slice(dupStart, dupEnd);
    check('wiring: duplicateChat exists', dupStart >= 0);
    check('wiring: duplicateChat redeploys workers for the copy', dupBody.includes('await redeployWorkersForCopy(oldAppDir, newAppDir)'));
    check('wiring: redeploy happens before the copy is published', dupBody.indexOf('redeployWorkersForCopy') < dupBody.indexOf('puter.hosting.create(window.makeDraftSubdomain()'));
    check('wiring: cloned history goes through the worker rewrite', dupBody.includes('WorkerOwnership.rewriteHistory(clonedHistory, workerRenames)'));
    check('wiring: the rewritten history is what gets persisted', dupBody.includes('history: finalHistory'));

    const redeployStart = APP.indexOf('async function redeployWorkersForCopy');
    const redeployBody = APP.slice(redeployStart, APP.indexOf('async function', redeployStart + 1));
    check('wiring: redeploy plans from the account worker list', redeployBody.includes('WorkerOwnership.planCopies(allWorkers'));
    check('wiring: copy workers deploy under their NEW name', redeployBody.includes('puter.workers.create(plan.newName, plan.newFilePath, { sandbox: true })'));

    const rewriteDirStart = APP.indexOf('async function rewriteWorkerUrlsInDir');
    const rewriteDirBody = APP.slice(rewriteDirStart, APP.indexOf('async function', rewriteDirStart + 1));
    check('wiring: file rewrite skips user attachments (assets/)', rewriteDirBody.includes("item.name === 'assets'"));
    check('wiring: file rewrite honors the app-dir write lock', rewriteDirBody.includes('window.withFileLock(fullPath'));

    check('wiring: worker-ownership.js registered in the vite bundle', VITE.includes("'js/worker-ownership.js'"));
    check('wiring: module loads before app.js', VITE.indexOf("'js/worker-ownership.js'") < VITE.indexOf("'js/app.js'"));
}

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nAll worker-ownership checks passed');
