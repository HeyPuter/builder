import fs from 'node:fs';

// ---- Regression guard for the email sender name (worker-sender.js) ---------
// Email a Builder backend sends goes out from a Puter address, labelled with
// the title of the worker's sandbox app, which starts out as its internal name
// ("sandbox-<worker>"). The set_email_sender_name tool renames that app, and
// Publish, Duplicate and Delete carry or reset the name. What can go wrong:
//   * a project that never set a name sees a change: an extra rename, a
//     prompt, a warning, or its live backend's hand-set name overwritten;
//   * the wrong app is renamed (one that isn't the worker's own sandbox app);
//   * a name the email service would mangle (an "@", quotes, too long) is
//     accepted, so recipients see something other than what the user asked;
//   * another project's backend, or another project's live backend, is
//     renamed;
//   * the live site keeps the old name after the user changes it, or a
//     deleted backend leaves its name for the next worker of the same name;
//   * a Puter failure reads as success, or breaks a publish/duplicate/delete.
// Runs the production bytes with puter stubbed.

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail !== undefined ? ' :: ' + detail : '')); failures++; }
}

const ROOT = '/u/AppData/b/c1';
const PUB = '/u/AppData/b/.published/c1';

// A stub Puter: workers bound to apps, apps with titles, and a log of every
// rename. A sandbox app's title starts out as its name, as puter.js makes it.
function makePuter(o = {}) {
    const workers = o.workers || {
        mail: { app: 'uid-mail', path: ROOT + '/workers/mail.js' },
        'mail-live': { app: 'uid-mail-live', path: PUB + '/backend/mail-live.js' },
        other: { app: 'uid-other', path: '/u/AppData/b/c2/workers/other.js' },
        bare: { app: null, path: ROOT + '/workers/bare.js' },
    };
    const apps = new Map();
    for (const [name, w] of Object.entries(workers)) {
        if (w.app) apps.set('sandbox-' + name, { uid: w.app, name: 'sandbox-' + name, title: 'sandbox-' + name });
    }
    for (const [name, title] of Object.entries(o.titles || {})) apps.get(name).title = title;
    const updates = [];
    const fail = { get: false, update: null, list: false, workersGet: false };
    return {
        apps: appsMap(apps), fail, updates, rawApps: apps,
        workers: {
            get: async (name) => {
                if (fail.workersGet) throw new Error('network');
                return name in workers ? { name, app_uid: workers[name].app } : null;
            },
            list: async () => {
                if (fail.list) throw new Error('network');
                return Object.entries(workers).map(([name, w]) => ({ name, file_path: w.path }));
            },
        },
    };
    function appsMap(map) {
        return {
            get: async (name) => {
                if (fail.get) throw new Error('network');
                const a = map.get(name);
                if (!a) throw { success: false, error: { code: 'entity_not_found', message: 'not found' } };
                return { ...a };
            },
            update: async (name, attrs) => {
                if (fail.update === 'forbidden') throw { success: false, error: { code: 'forbidden', message: 'Access denied', status: 403 } };
                if (fail.update) throw new Error('network');
                const a = map.get(name);
                if (!a) throw new Error('not found');
                updates.push([name, attrs.title]);
                Object.assign(a, { title: attrs.title });
                return { ...a };
            },
        };
    }
}

function load(puter) {
    const window = {};
    new Function('window', 'puter', read('../src/js/worker-sender.js'))(window, puter);
    return window.WorkerSender;
}

const title = (puter, worker) => puter.rawApps.get('sandbox-' + worker).title;

// --- checking a name ---
{
    const WSN = load(makePuter());
    check('check: a plain name is accepted, whitespace tidied', JSON.stringify(WSN.check('  Makor   Family Portal ')) === '{"ok":true,"name":"Makor Family Portal"}');
    check('check: non-Latin names and punctuation are fine', WSN.check('Café Ñandú – Portal (Beta) & Co.').ok && WSN.check('מכור').ok);
    check('check: an "@" is refused (a name must not read as an address)', WSN.check('support@makor.org').reason === 'bad-chars');
    for (const bad of ['Say "hi"', 'a\\b', '<Makor>', 'line\u0000break']) {
        check('check: refused: ' + JSON.stringify(bad), WSN.check(bad).reason === 'bad-chars');
    }
    check('check: a line break is just whitespace', WSN.check('Makor\nPortal').name === 'Makor Portal');
    check('check: empty is refused', WSN.check('   ').reason === 'empty');
    check('check: 78 characters is the limit', WSN.check('x'.repeat(78)).ok && WSN.check('x'.repeat(79)).reason === 'too-long');
}

// --- setting, reading, resetting ---
{
    const puter = makePuter();
    const WSN = load(puter);
    check('set: a new backend is on its default name', title(puter, 'mail') === 'sandbox-mail');
    const r = await WSN.set('mail', 'Makor Family Portal');
    check('set: renames the worker\'s own sandbox app', r.ok && r.changed && title(puter, 'mail') === 'Makor Family Portal' &&
        JSON.stringify(puter.updates) === '[["sandbox-mail","Makor Family Portal"]]');
    const again = await WSN.set('mail', 'Makor Family Portal');
    check('set: the same name again changes nothing', again.ok && again.changed === false && puter.updates.length === 1);
    const reset = await WSN.set('mail', '  ');
    check('set: an empty name puts the default back', reset.ok && reset.name === null && title(puter, 'mail') === 'sandbox-mail');
    const bad = await WSN.set('mail', 'a@b');
    check('set: a bad name renames nothing', bad.reason === 'bad-chars' && puter.updates.length === 2);
}
{
    const puter = makePuter();
    const WSN = load(puter);
    check('set: a worker with no app is refused', (await WSN.set('bare', 'X')).reason === 'no-app');
    check('set: an unknown worker is refused', (await WSN.set('nope', 'X')).reason === 'no-app');
    check('set: nothing was renamed', puter.updates.length === 0);
}
{
    // The worker runs as some other app (not its sandbox app): renaming the
    // sandbox app would change nothing, and the bound app isn't Builder's.
    const puter = makePuter({ workers: { mail: { app: 'uid-real-app', path: ROOT + '/workers/mail.js' } } });
    puter.rawApps.set('sandbox-mail', { uid: 'uid-unrelated', name: 'sandbox-mail', title: 'sandbox-mail' });
    const WSN = load(puter);
    check('set: an app that isn\'t the worker\'s own is never renamed', (await WSN.set('mail', 'X')).reason === 'no-app' && puter.updates.length === 0);
}
{
    const puter = makePuter();
    const WSN = load(puter);
    puter.fail.update = 'forbidden';
    check('set: a refused rename says so', (await WSN.set('mail', 'X')).reason === 'forbidden');
    puter.fail.update = 'network';
    check('set: a failed rename says so', (await WSN.set('mail', 'X')).reason === 'failed');
    puter.fail.update = null;
    puter.fail.get = true;
    check('set: a failed lookup is a failure, not "no app"', (await WSN.set('mail', 'X')).reason === 'failed');
    puter.fail.get = false;
    puter.fail.workersGet = true;
    check('set: a failed worker lookup is a failure', (await WSN.set('mail', 'X')).reason === 'failed');
}

// --- copying (Publish, Duplicate): a default name never changes anything ---
{
    const puter = makePuter();
    const WSN = load(puter);
    const r = await WSN.copy('mail', 'mail-live');
    check('copy: a backend on its default name copies nothing', r.ok && r.copied === false && puter.updates.length === 0);
}
{
    // The user renamed the live backend by hand in the Dev Center; the preview
    // still has the default. Publishing must not undo that.
    const puter = makePuter({ titles: { 'sandbox-mail-live': 'Hand Set Name' } });
    const WSN = load(puter);
    await WSN.copy('mail', 'mail-live');
    check('copy: a hand-set live name survives a preview on the default', title(puter, 'mail-live') === 'Hand Set Name' && puter.updates.length === 0);
}
{
    const puter = makePuter({ titles: { 'sandbox-mail': 'Makor Family Portal' } });
    const WSN = load(puter);
    const r = await WSN.copy('mail', 'mail-live');
    check('copy: a chosen name reaches the target', r.ok && r.copied && title(puter, 'mail-live') === 'Makor Family Portal');
    const r2 = await WSN.copy('mail', 'mail-live');
    check('copy: copying again renames nothing', r2.ok && r2.copied === false && puter.updates.length === 1);
}
{
    // A title set by hand that check() would refuse still copies: Puter took it.
    const puter = makePuter({ titles: { 'sandbox-mail': 'Ask: help@makor' } });
    const WSN = load(puter);
    const r = await WSN.copy('mail', 'mail-live');
    check('copy: a hand-set title copies as it is', r.ok && title(puter, 'mail-live') === 'Ask: help@makor');
}
{
    const puter = makePuter({ titles: { 'sandbox-mail': 'Makor' } });
    const WSN = load(puter);
    puter.fail.update = 'network';
    const r = await WSN.copy('mail', 'mail-live');
    check('copy: a failed rename reports it', !r.ok && r.reason === 'failed');
    puter.fail.update = null;
    puter.fail.get = true;
    const unread = await WSN.copy('mail', 'mail-live');
    check('copy: a source that can\'t be read copies nothing and warns nobody', unread.ok && unread.copied === false && puter.updates.length === 0);
}
{
    // An older backend deployed without a sandbox app of its own: Puter has
    // no "sandbox-<name>" app. Publishing it must not warn or rename anything.
    const puter = makePuter({ workers: {
        old: { app: 'uid-builder-itself', path: ROOT + '/workers/old.js' },
        'old-live': { app: 'uid-old-live', path: PUB + '/backend/old-live.js' },
    } });
    puter.rawApps.delete('sandbox-old');
    const WSN = load(puter);
    const c = await WSN.copy('old', 'old-live');
    check('copy: a backend with no sandbox app copies nothing, quietly', c.ok && c.copied === false && puter.updates.length === 0);
    check('set: a backend with no sandbox app is "no app", not a failure', (await WSN.set('old', 'X')).reason === 'no-app');
    check('clear: a backend with no sandbox app is fine', (await WSN.clear('old')).ok);
}

// --- clearing (Delete, a retired live backend) ---
{
    const puter = makePuter();
    const WSN = load(puter);
    const r = await WSN.clear('mail');
    check('clear: a backend on its default name is left alone', r.ok && r.cleared === false && puter.updates.length === 0);
    check('clear: a worker with no app is fine', (await WSN.clear('bare')).ok && (await WSN.clear('nope')).ok);
}
{
    const puter = makePuter({ titles: { 'sandbox-mail-live': 'Makor' } });
    const WSN = load(puter);
    const r = await WSN.clear('mail-live');
    check('clear: a chosen name goes back to the default', r.ok && r.cleared && title(puter, 'mail-live') === 'sandbox-mail-live');
    puter.rawApps.get('sandbox-mail-live').title = 'Makor';
    puter.fail.update = 'network';
    check('clear: a failed reset reports it without throwing', (await WSN.clear('mail-live')).ok === false);
}

// --- the set_email_sender_name tool ---
function toolSetup(o = {}) {
    const puter = makePuter(o);
    const window = { tools: [] };
    new Function('window', 'puter', read('../src/js/worker-ownership.js'))(window, puter);
    new Function('window', 'puter', read('../src/js/worker-sender.js'))(window, puter);
    window.projectRootDir = () => ROOT;
    window.publishedDirForChat = (chatId) => '/u/AppData/b/.published/' + chatId;
    window.liveWorkerName = (name) => name + '-live';
    new Function('window', 'puter', read('../src/tools/workers/set_email_sender_name.js'))(window, puter);
    return { puter, tool: window.tools.find((t) => t.function.name === 'set_email_sender_name') };
}
async function throws(p) { try { await p; return null; } catch (e) { return e; } }
{
    const { tool } = toolSetup();
    check('tool: registered as a strict tool', !!tool && tool.function.strict === true &&
        JSON.stringify(tool.function.parameters.required) === '["worker","name"]' && tool.function.parameters.additionalProperties === false);
    check('tool: the description says the address can\'t change', /can't be changed/.test(tool.function.description));
}
{
    const { puter, tool } = toolSetup();
    const r = await tool.exec({ worker: 'mail', name: 'Makor Family Portal' }, { currentChatId: 'c1' });
    check('tool: sets the preview and the published live backend', r.success === true && r.live === 'updated' &&
        title(puter, 'mail') === 'Makor Family Portal' && title(puter, 'mail-live') === 'Makor Family Portal');
    check('tool: the result names the worker and the name', r.worker === 'mail' && r.sender_name === 'Makor Family Portal' && /preview and the live site/.test(r.note));
    const back = await tool.exec({ worker: 'mail', name: '' }, { currentChatId: 'c1' });
    check('tool: an empty name resets both', back.success && back.sender_name === null &&
        title(puter, 'mail') === 'sandbox-mail' && title(puter, 'mail-live') === 'sandbox-mail-live' && /default name/.test(back.note));
}
{
    const { puter, tool } = toolSetup({ workers: { mail: { app: 'uid-mail', path: ROOT + '/workers/mail.js' } } });
    const r = await tool.exec({ worker: 'mail', name: 'Makor' }, { currentChatId: 'c1' });
    check('tool: before the first publish, only the preview, and the note says publishing follows',
        r.success && r.live === 'not-published' && title(puter, 'mail') === 'Makor' && /isn’t published yet/.test(r.note));
}
{
    // A "mail-live" deployed from ANOTHER project's published folder.
    const { puter, tool } = toolSetup({ workers: {
        mail: { app: 'uid-mail', path: ROOT + '/workers/mail.js' },
        'mail-live': { app: 'uid-mail-live', path: '/u/AppData/b/.published/c9/backend/mail-live.js' },
    } });
    const r = await tool.exec({ worker: 'mail', name: 'Makor' }, { currentChatId: 'c1' });
    check('tool: another project\'s live backend is never renamed', r.success && r.live === 'not-published' && title(puter, 'mail-live') === 'sandbox-mail-live');
}
{
    const { puter, tool } = toolSetup();
    const foreign = await throws(tool.exec({ worker: 'other', name: 'X' }, { currentChatId: 'c1' }));
    check('tool: another project\'s worker is refused', !!foreign && /does not belong to this project/.test(foreign.message));
    const live = await throws(tool.exec({ worker: 'mail-live', name: 'X' }, { currentChatId: 'c1' }));
    check('tool: the live backend can\'t be named directly', !!live && /does not belong to this project/.test(live.message));
    const missing = await throws(tool.exec({ worker: 'nope', name: 'X' }, { currentChatId: 'c1' }));
    check('tool: an unknown worker says to create it first', !!missing && /create_worker first/.test(missing.message));
    const noWorker = await throws(tool.exec({ worker: ' ', name: 'X' }, {}));
    check('tool: an empty worker is refused', !!noWorker);
    check('tool: nothing was renamed by any refusal', puter.updates.length === 0);
}
{
    const { puter, tool } = toolSetup();
    const at = await tool.exec({ worker: 'mail', name: 'help@makor.org' }, { currentChatId: 'c1' });
    check('tool: an address is refused with a reason the AI can relay', at.success === false && /not an email address/.test(at.error));
    const long = await tool.exec({ worker: 'mail', name: 'x'.repeat(90) }, { currentChatId: 'c1' });
    check('tool: a long name is refused with its length', long.success === false && /90 characters/.test(long.error));
    // The length is the one the check measured, after runs of spaces became one.
    const spaced = await tool.exec({ worker: 'mail', name: 'x'.repeat(40) + ' '.repeat(20) + 'y'.repeat(40) }, { currentChatId: 'c1' });
    check('tool: a long name\'s length is counted the way the limit is', spaced.success === false && /81 characters/.test(spaced.error), spaced.error);
    check('tool: a refused name renames nothing and never lists workers first', puter.updates.length === 0);
}
{
    const { puter, tool } = toolSetup();
    puter.fail.list = true;
    const e = await throws(tool.exec({ worker: 'mail', name: 'X' }, { currentChatId: 'c1' }));
    check('tool: a failing worker list fails closed', !!e && puter.updates.length === 0);
}
{
    const { puter, tool } = toolSetup();
    puter.fail.update = 'forbidden';
    const r = await tool.exec({ worker: 'mail', name: 'Makor' }, { currentChatId: 'c1' });
    check('tool: a refused rename tells the user how to do it in the Dev Center', r.success === false &&
        /dev-center/.test(r.error) && /sandbox-mail/.test(r.error));
}
{
    // The preview renames, the live one fails: still a success, and says so.
    const { puter, tool } = toolSetup();
    const update = puter.apps.update;
    puter.apps.update = async (name, attrs) => { if (name === 'sandbox-mail-live') throw new Error('network'); return update(name, attrs); };
    const r = await tool.exec({ worker: 'mail', name: 'Makor' }, { currentChatId: 'c1' });
    check('tool: a live backend that fails is reported, the preview still set', r.success && r.live === 'failed' &&
        title(puter, 'mail') === 'Makor' && /Publishing again/.test(r.note));
}
{
    const { tool } = toolSetup();
    const e = await throws(tool.exec({ worker: 'mail', name: 'X' }, { currentChatId: 'c1' }).then(() => null));
    check('tool: a missing chat id still works for the preview', e === null);
}

// --- the prompt and the wiring ---
{
    const prompt = read('../src/js/prompt.js');
    check('prompt: the AI knows about the tool and the fixed address', /set_email_sender_name/.test(prompt) &&
        /always goes out from a Puter address, which can't be changed/.test(prompt));
    check('prompt: replies go to replyTo', /pass replyTo/.test(prompt));
    const common = prompt.slice(prompt.indexOf('window.system_prompt_common'));
    const para = common.slice(common.indexOf('IMPORTANT: Email a worker sends'), common.indexOf('\n', common.indexOf('IMPORTANT: Email a worker sends')));
    check('prompt: the paragraph has no template-literal syntax', para.length > 0 && !para.includes('`') && !para.includes('${'));

    const ui = read('../src/js/ui.js');
    const publish = ui.slice(ui.indexOf('async function deployPublishedWorkers('), ui.indexOf('async function stripBrandingFromRelease('));
    check('publish: the live backend gets the sender name after it deploys',
        publish.indexOf('WorkerSender?.copy(worker.name, liveName)') > publish.indexOf('puter.workers.create(liveName'));
    const retire = ui.slice(ui.indexOf('async function retirePublishedWorkers('), ui.indexOf('async function doPublish('));
    check('publish: a retired live backend gets its default name back before it is deleted',
        retire.indexOf('WorkerSender?.clear(worker.name)') > -1 && retire.indexOf('WorkerSender?.clear(worker.name)') < retire.indexOf('puter.workers.delete(worker.name)'));
    const app = read('../src/js/app.js');
    check('duplicate: the copy\'s backends get the original\'s sender name', app.includes('WorkerSender?.copy(plan.oldName, plan.newName)'));
    const del = app.slice(app.indexOf('async function deleteChat('), app.indexOf('// Remove the app directory', app.indexOf('async function deleteChat(')));
    check('delete: the sender name is reset before each worker is deleted',
        del.indexOf('WorkerSender?.clear(worker.name)') > -1 && del.indexOf('WorkerSender?.clear(worker.name)') < del.indexOf('puter.workers.delete(worker.name)'));
    const tool = read('../src/tools/workers/set_email_sender_name.js');
    const code = tool.replace(/^(?:\/\/.*\n)+/, '');
    check('tool: nothing leaks into the shared global scope', /^window\.tools\.push\(\{[\s\S]*\}\);\s*$/.test(code) && !/^(?:function|const|let|var) /m.test(code));
    const vite = read('../vite.config.js');
    const scripts = vite.slice(vite.indexOf('const SCRIPTS = ['), vite.indexOf('];', vite.indexOf('const SCRIPTS = [')));
    check('bundle: the helper and the tool ship, helper first', scripts.includes("'js/worker-sender.js'") && scripts.includes("'tools/workers/set_email_sender_name.js'") &&
        scripts.indexOf("'js/worker-sender.js'") < scripts.indexOf("'tools/workers/set_email_sender_name.js'"));
}

// --- a duplicated chat's history follows the copy's worker names ---
{
    const window = {};
    new Function('window', read('../src/js/worker-ownership.js'))(window);
    const use = (id, name, input) => ({ role: 'assistant', content: { type: 'tool_use', id, name, input } });
    const result = (id, obj) => ({ role: 'user', content: { type: 'tool_result', tool_use_id: id, content: JSON.stringify(obj) } });
    const out = window.WorkerOwnership.rewriteHistory([
        use('n1', 'set_email_sender_name', { worker: 'mail-ab12cd', name: 'Makor' }),
        result('n1', { success: true, worker: 'mail-ab12cd', sender_name: 'Makor', live: 'not-published' }),
    ], [{ oldName: 'mail-ab12cd', newName: 'mail-ab12cd-x7k2p1', oldUrl: 'https://mail-ab12cd.puter.work', newUrl: 'https://mail-ab12cd-x7k2p1.puter.work' }]);
    check('duplicate: the tool\'s input and result name the copy\'s worker',
        out[0].content.input.worker === 'mail-ab12cd-x7k2p1' && JSON.parse(out[1].content.content).worker === 'mail-ab12cd-x7k2p1');
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll worker-sender checks passed');
process.exit(failures ? 1 : 0);
