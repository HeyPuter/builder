import fs from 'node:fs';

// ---- Regression guard for backend keys (worker-secrets.js, set_secret) ------
// A project's API keys (Stripe, Whop, any API) used to be written into its
// backend's source as constants, so they sat in every version, the download,
// the draft site (it serves the project folder) and any GitHub repository the
// project synced to. Now each key lives only in its worker's own key-value
// store, put there by Builder with the user's permission, and the worker reads
// it at run time. What can go wrong:
//   * a key lands somewhere else (a file, a tool result, the conversation);
//   * Builder asks for permission when there is nothing to move, so every
//     publish of every backend pops a dialog;
//   * a worker of another project gets this project's keys;
//   * Publish or Duplicate leave the new backend without its keys, or delete
//     leaves them behind for the next worker of the same name;
//   * Publish overwrites the live site's own live key with the preview's test
//     key, or a live key ends up in the preview;
//   * the line Builder adds after a publish misses a test key, carries a
//     value, or shows up for a project with no keys;
//   * the AI keeps writing keys into code because the prompt still says so.
// Runs the production bytes with puter stubbed. Fake keys are assembled at
// runtime: GitHub's push protection scans this repository too.

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail !== undefined ? ' :: ' + detail : '')); failures++; }
}

const KEY = 'sk_' + 'test_' + '51HxYzAbCdEfGhIjKlMn0pQr';
const LIVE_KEY = 'sk_' + 'live_' + '51HxYzAbCdEfGhIjKlMn0pQr';
const WHOP_SANDBOX = 'https://sandbox-api.whop.com/api/v1';
const WHOP_LIVE = 'https://api.whop.com/api/v1';

// A stub Puter: workers with their own apps, per-app key-value stores, and a
// permission state per app that records every prompt.
function makePuter(o = {}) {
    const apps = new Map(); // app uid -> Map
    const granted = new Set(o.granted || []);
    const prompts = [];
    const workers = o.workers || { pay: 'app-pay', 'pay-live': 'app-pay-live', other: 'app-other', bare: null };
    const store = (app) => { if (!apps.has(app)) apps.set(app, new Map()); return apps.get(app); };
    return {
        apps, granted, prompts,
        workers: {
            get: async (name) => (name in workers ? { name, app_uid: workers[name] } : null),
            list: async () => Object.keys(workers).map((name) => ({ name, file_path: (o.paths && o.paths[name]) || `/u/AppData/b/c1/workers/${name}.js` })),
        },
        perms: {
            check: async (res, d) => res === 'appData' && granted.has(d.app),
            request: async (res, d) => {
                prompts.push(d.app);
                if (o.decline && o.decline.includes(d.app)) return false;
                granted.add(d.app);
                return true;
            },
        },
        kv: {
            get: async (k, opt) => { if (!granted.has(opt.appUuid)) throw new Error('forbidden'); const v = store(opt.appUuid).get(k); return v === undefined ? null : JSON.parse(JSON.stringify(v)); },
            set: async (k, v, opt) => { if (!granted.has(opt.appUuid)) throw new Error('forbidden'); store(opt.appUuid).set(k, JSON.parse(JSON.stringify(v))); return true; },
            del: async (k, opt) => { if (!granted.has(opt.appUuid)) throw new Error('forbidden'); return store(opt.appUuid).delete(k); },
        },
    };
}

function load(puter) {
    const window = {};
    new Function('window', 'puter', read('../src/js/worker-secrets.js'))(window, puter);
    return window.WorkerSecrets;
}

// --- saving a key ---
{
    const puter = makePuter();
    const WS = load(puter);
    const r = await WS.set('pay', 'STRIPE_SECRET_KEY', KEY);
    check('set: the key lands in the worker\'s own store', r.ok && puter.apps.get('app-pay').get('secret:STRIPE_SECRET_KEY') === KEY);
    check('set: the user is asked once, for that worker\'s app', puter.prompts.join(',') === 'app-pay');
    check('set: the key name is listed in the store', JSON.stringify(puter.apps.get('app-pay').get('secret-names')) === '["STRIPE_SECRET_KEY"]');
    await WS.set('pay', 'STRIPE_SECRET_KEY', KEY + 'X');
    check('set: saving again overwrites without asking again', puter.prompts.length === 1 && puter.apps.get('app-pay').get('secret:STRIPE_SECRET_KEY') === KEY + 'X' &&
        puter.apps.get('app-pay').get('secret-names').length === 1);
    check('set: the result never carries the key', !JSON.stringify(r).includes(KEY));
    check('set: a bad name is refused before anything happens', (await WS.set('pay', 'stripe-key', KEY)).reason === 'bad-name');
    check('set: an empty key is refused', (await WS.set('pay', 'EMPTY', '  ')).reason === 'empty');
    check('set: a worker with no app of its own is refused', (await WS.set('bare', 'K', KEY)).reason === 'no-app');
    check('names: the names, never the values', JSON.stringify(await WS.names('pay')) === '["STRIPE_SECRET_KEY"]');
}
{
    const puter = makePuter({ decline: ['app-pay'] });
    const WS = load(puter);
    const r = await WS.set('pay', 'STRIPE_SECRET_KEY', KEY);
    check('set: a declined dialog saves nothing and says so', !r.ok && r.reason === 'declined' && !puter.apps.has('app-pay'));
}

// --- copying (Publish, Duplicate) ---
{
    const puter = makePuter();
    const WS = load(puter);
    const r = await WS.copy('pay', 'pay-live');
    check('copy: a backend Builder never gave keys to copies nothing and asks nothing', r.ok && r.copied === 0 && puter.prompts.length === 0);
}
{
    const puter = makePuter();
    const WS = load(puter);
    await WS.set('pay', 'STRIPE_SECRET_KEY', KEY);
    await WS.set('pay', 'WEBHOOK_SECRET', 'whsec_' + 'abc123');
    const r = await WS.copy('pay', 'pay-live');
    check('copy: every key reaches the live backend', r.ok && r.copied === 2 &&
        puter.apps.get('app-pay-live').get('secret:STRIPE_SECRET_KEY') === KEY && puter.apps.get('app-pay-live').get('secret-names').length === 2);
    check('copy: the live backend\'s app is asked once', puter.prompts.join(',') === 'app-pay,app-pay-live');
    await WS.copy('pay', 'pay-live');
    check('copy: publishing again asks nothing', puter.prompts.length === 2);
    check('copy: the result never carries a key', !JSON.stringify(r).includes(KEY));
}
{
    const puter = makePuter({ decline: ['app-pay-live'] });
    const WS = load(puter);
    await WS.set('pay', 'STRIPE_SECRET_KEY', KEY);
    const r = await WS.copy('pay', 'pay-live');
    check('copy: a declined dialog copies nothing and says so', !r.ok && r.reason === 'declined' && !puter.apps.has('app-pay-live'));
}

// --- the live site's own keys ---
{
    const puter = makePuter();
    const WS = load(puter);
    await WS.set('pay', 'STRIPE_SECRET_KEY', KEY);
    await WS.set('pay', 'WEBHOOK_SECRET', 'whsec_' + 'abc123');
    await WS.copy('pay', 'pay-live');
    const r = await WS.set('pay-live', 'STRIPE_SECRET_KEY', LIVE_KEY, { liveOnly: true });
    const live = puter.apps.get('app-pay-live');
    check('live: a live-only key lands in the live backend and is marked as its own', r.ok && live.get('secret:STRIPE_SECRET_KEY') === LIVE_KEY &&
        JSON.stringify(live.get('secret-live-only')) === '["STRIPE_SECRET_KEY"]');
    check('live: the preview keeps its test key', puter.apps.get('app-pay').get('secret:STRIPE_SECRET_KEY') === KEY);
    await WS.set('pay', 'WEBHOOK_SECRET', 'whsec_' + 'new456');
    const again = await WS.copy('pay', 'pay-live');
    check('live: publishing again never replaces the live site\'s own key', live.get('secret:STRIPE_SECRET_KEY') === LIVE_KEY);
    check('live: publishing still copies the other keys', live.get('secret:WEBHOOK_SECRET') === 'whsec_' + 'new456' && again.copied === 1);
    check('live: copy reports the kept key and what it is, never a value',
        JSON.stringify(again.keys) === JSON.stringify([{ name: 'STRIPE_SECRET_KEY', kind: 'stripe-live', kept: true }, { name: 'WEBHOOK_SECRET', kind: 'other', kept: false }]) &&
        !JSON.stringify(again).includes(LIVE_KEY) && !JSON.stringify(again).includes('whsec_'));
    check('live: a live key never goes back to the preview', !JSON.stringify([...puter.apps.get('app-pay')]).includes(LIVE_KEY));
}
{
    const puter = makePuter();
    const WS = load(puter);
    await WS.set('pay', 'STRIPE_SECRET_KEY', KEY);
    const r = await WS.copy('pay', 'pay-live');
    check('copy: a copied test key is reported as one', JSON.stringify(r.keys) === '[{"name":"STRIPE_SECRET_KEY","kind":"stripe-test","kept":false}]');
}
{
    const WS = load(makePuter());
    check('kind: Stripe test and live keys, restricted ones too',
        WS.kindOf(KEY) === 'stripe-test' && WS.kindOf('rk_' + 'test_' + 'abc') === 'stripe-test' &&
        WS.kindOf(LIVE_KEY) === 'stripe-live' && WS.kindOf('rk_' + 'live_' + 'abc') === 'stripe-live');
    check('kind: Whop\'s sandbox and live hosts', WS.kindOf(WHOP_SANDBOX) === 'whop-sandbox' && WS.kindOf(WHOP_LIVE) === 'whop-live');
    check('kind: anything else is other', WS.kindOf('whsec_' + 'abc') === 'other' && WS.kindOf(null) === 'other' && WS.kindOf('https://evil.example/api.whop.com') === 'other');
}

// --- the line Builder adds after a publish ---
{
    const WS = load(makePuter());
    const note = (keys, ok = true) => WS.publishNote([{ live: 'pay-live', result: { ok, reason: ok ? undefined : 'declined', copied: keys.length, keys } }]);
    check('note: nothing when no backend has keys', WS.publishNote([]) === '' && note([]) === '' &&
        WS.publishNote([{ live: 'pay-live', result: null }]) === '' && WS.publishNote(undefined) === '');
    const test = note([{ name: 'STRIPE_SECRET_KEY', kind: 'stripe-test', kept: false }]);
    check('note: a Stripe test key on the live site is called out',
        test === '*Published. The live site got `STRIPE_SECRET_KEY` from the preview. `STRIPE_SECRET_KEY` is a Stripe test key, so the live site can’t take real payments yet.*', test);
    const kept = note([{ name: 'STRIPE_SECRET_KEY', kind: 'stripe-live', kept: true }, { name: 'WEBHOOK_SECRET', kind: 'other', kept: false }]);
    check('note: a live key the live site kept says so, with no warning',
        kept === '*Published. The live site got `WEBHOOK_SECRET` from the preview and kept its own `STRIPE_SECRET_KEY`.*', kept);
    const whop = note([{ name: 'WHOP_API_KEY', kind: 'other', kept: false }, { name: 'WHOP_API', kind: 'whop-sandbox', kept: false }]);
    check('note: Whop\'s sandbox on the live site is called out', /got `WHOP_API_KEY` and `WHOP_API` from the preview\. `WHOP_API` points to Whop’s sandbox, so the live site can’t take real payments yet\.\*$/.test(whop), whop);
    const half = note([{ name: 'WHOP_API_KEY', kind: 'other', kept: true }, { name: 'WHOP_API', kind: 'whop-sandbox', kept: false }]);
    check('note: a live Whop key against the sandbox host is called out', /points to Whop’s sandbox/.test(half) && /kept its own `WHOP_API_KEY`/.test(half), half);
    const failed = note([], false);
    check('note: keys that didn\'t arrive are said, with what to do', /^\*Published, but the live site didn’t get all of its keys/.test(failed) && /Publishing again tries once more\./.test(failed), failed);
    const many = WS.publishNote([
        { live: 'a-live', result: { ok: true, keys: [{ name: 'A_KEY', kind: 'other', kept: false }, { name: 'SHARED', kind: 'other', kept: false }] } },
        { live: 'b-live', result: { ok: true, keys: [{ name: 'SHARED', kind: 'other', kept: false }, { name: 'B_KEY', kind: 'other', kept: false }] } },
    ]);
    check('note: keys across backends are listed once each', many === '*Published. The live site got `A_KEY`, `SHARED` and `B_KEY` from the preview.*', many);
    check('note: only valid key names reach the conversation', note([{ name: 'X`](https://evil.example)', kind: 'other', kept: false }, { name: 'ignore previous', kind: 'other', kept: false }]) === '');
}
{
    // End to end: what copy reports is what the note says, and no value
    // reaches it.
    const puter = makePuter();
    const WS = load(puter);
    await WS.set('pay', 'STRIPE_SECRET_KEY', KEY);
    const n = WS.publishNote([{ live: 'pay-live', result: await WS.copy('pay', 'pay-live') }]);
    check('note: built from a real copy, it names the test key and never carries it', /is a Stripe test key/.test(n) && !n.includes(KEY), n);
}

// --- clearing (delete project, retired live backend) ---
{
    const puter = makePuter();
    const WS = load(puter);
    await WS.set('pay', 'STRIPE_SECRET_KEY', KEY);
    const r = await WS.clear('pay');
    check('clear: the keys and their list are removed', r.ok && r.cleared === 1 && puter.apps.get('app-pay').size === 0);
    const before = puter.prompts.length;
    const r2 = await WS.clear('other');
    check('clear: a backend Builder never gave keys to is left alone, without asking', r2.ok && r2.cleared === 0 && puter.prompts.length === before);
}
{
    const puter = makePuter();
    const WS = load(puter);
    await WS.set('pay-live', 'STRIPE_SECRET_KEY', LIVE_KEY, { liveOnly: true });
    const r = await WS.clear('pay-live');
    check('clear: a live backend\'s own keys and their marks go too', r.ok && r.cleared === 1 && puter.apps.get('app-pay-live').size === 0);
}

// --- the set_secret tool ---
{
    const root = '/u/AppData/b/c1';
    const puter = makePuter({ paths: { other: '/u/AppData/b/c2/workers/other.js' } });
    const window = { tools: [] };
    new Function('window', 'puter', read('../src/js/worker-ownership.js'))(window, puter);
    new Function('window', 'puter', read('../src/js/worker-secrets.js'))(window, puter);
    window.projectRootDir = () => root;
    new Function('window', 'puter', read('../src/tools/workers/set_secret.js'))(window, puter);
    const tool = window.tools.find((t) => t.function.name === 'set_secret');
    check('tool: set_secret is registered as a strict tool', !!tool && tool.function.strict === true);
    const ok = await tool.exec({ worker: 'pay', name: 'STRIPE_SECRET_KEY', value: KEY }, {});
    check('tool: the key is saved for this project\'s worker', ok.success === true && puter.apps.get('app-pay').get('secret:STRIPE_SECRET_KEY') === KEY);
    check('tool: the result tells the AI how to read it and never repeats it',
        ok.read_it_with === "await me.puter.kv.get('secret:STRIPE_SECRET_KEY')" && !JSON.stringify(ok).includes(KEY));
    let foreign = null;
    try { await tool.exec({ worker: 'other', name: 'K', value: KEY }, {}); } catch (e) { foreign = e; }
    check('tool: another project\'s worker is refused', !!foreign && /does not belong to this project/.test(foreign.message) && !puter.apps.has('app-other'));
    let missing = null;
    try { await tool.exec({ worker: 'nope', name: 'K', value: KEY }, {}); } catch (e) { missing = e; }
    check('tool: an unknown worker says to create it first', !!missing && /create_worker first/.test(missing.message));
    let badName = null;
    try { await tool.exec({ worker: 'pay', name: 'my key', value: KEY }, {}); } catch (e) { badName = e; }
    check('tool: a bad key name is refused', !!badName && /UPPER_SNAKE_CASE/.test(badName.message) && !JSON.stringify(badName.message).includes(KEY));
}
{
    const puter = makePuter({ decline: ['app-pay'] });
    const window = { tools: [] };
    new Function('window', 'puter', read('../src/js/worker-ownership.js'))(window, puter);
    new Function('window', 'puter', read('../src/js/worker-secrets.js'))(window, puter);
    window.projectRootDir = () => '/u/AppData/b/c1';
    new Function('window', 'puter', read('../src/tools/workers/set_secret.js'))(window, puter);
    const r = await window.tools[0].exec({ worker: 'pay', name: 'STRIPE_SECRET_KEY', value: KEY }, {});
    check('tool: a declined dialog tells the AI what to say, without the key', r.success === false && /didn't allow Builder/.test(r.error) && !JSON.stringify(r).includes(KEY));
}
// The live site's own key, through the tool. The live backend is deployed
// from the project's published folder (deployPublishedWorkers in ui.js).
function liveToolSetup(o = {}) {
    const puter = makePuter({
        workers: o.workers,
        paths: Object.assign({ 'pay-live': '/u/AppData/b/.published/c1/backend/pay-live.js', other: '/u/AppData/b/c2/workers/other.js' }, o.paths),
    });
    const window = { tools: [] };
    new Function('window', 'puter', read('../src/js/worker-ownership.js'))(window, puter);
    new Function('window', 'puter', read('../src/js/worker-secrets.js'))(window, puter);
    window.projectRootDir = () => '/u/AppData/b/c1';
    window.publishedDirForChat = (chatId) => '/u/AppData/b/.published/' + chatId;
    window.liveWorkerName = (name) => name + '-live';
    new Function('window', 'puter', read('../src/tools/workers/set_secret.js'))(window, puter);
    return { puter, tool: window.tools.find((t) => t.function.name === 'set_secret'), WS: window.WorkerSecrets };
}
{
    const { puter, tool } = liveToolSetup();
    check('tool: live is a required yes-or-no', tool.function.parameters.properties.live.type === 'boolean' && tool.function.parameters.required.includes('live'));
    await tool.exec({ worker: 'pay', name: 'STRIPE_SECRET_KEY', value: KEY, live: false }, { currentChatId: 'c1' });
    const r = await tool.exec({ worker: 'pay', name: 'STRIPE_SECRET_KEY', value: LIVE_KEY, live: true }, { currentChatId: 'c1' });
    check('tool: live saves the key only in the published copy of that backend', r.success === true && r.worker === 'pay-live' && r.live === true &&
        puter.apps.get('app-pay-live').get('secret:STRIPE_SECRET_KEY') === LIVE_KEY && puter.apps.get('app-pay').get('secret:STRIPE_SECRET_KEY') === KEY);
    check('tool: a live key is marked as the live site\'s own', JSON.stringify(puter.apps.get('app-pay-live').get('secret-live-only')) === '["STRIPE_SECRET_KEY"]');
    check('tool: the live result never repeats the key', !JSON.stringify(r).includes(LIVE_KEY));
    let direct = null;
    try { await tool.exec({ worker: 'pay-live', name: 'STRIPE_SECRET_KEY', value: KEY, live: false }, { currentChatId: 'c1' }); } catch (e) { direct = e; }
    check('tool: the live backend can\'t be named directly', !!direct && /does not belong to this project/.test(direct.message) &&
        puter.apps.get('app-pay-live').get('secret:STRIPE_SECRET_KEY') === LIVE_KEY);
}
{
    const { puter, tool } = liveToolSetup({ workers: { pay: 'app-pay' } });
    const r = await tool.exec({ worker: 'pay', name: 'STRIPE_SECRET_KEY', value: LIVE_KEY, live: true }, { currentChatId: 'c1' });
    check('tool: a live key before the first publish asks for a publish, and saves nothing', r.success === false && /isn’t published yet/.test(r.error) &&
        !puter.apps.has('app-pay') && puter.prompts.length === 0);
}
{
    // A "pay-live" that belongs to another project's published site.
    const { puter, tool } = liveToolSetup({ paths: { 'pay-live': '/u/AppData/b/.published/c9/backend/pay-live.js' } });
    const r = await tool.exec({ worker: 'pay', name: 'STRIPE_SECRET_KEY', value: LIVE_KEY, live: true }, { currentChatId: 'c1' });
    check('tool: a live backend of another project never gets the key', r.success === false && !puter.apps.has('app-pay-live'));
}

// --- the prompt and the wiring ---
{
    const prompt = read('../src/js/prompt.js');
    check('prompt: keys never go into the worker\'s code any more', !/The key goes ONLY in the worker's code/.test(prompt) && !/constant next to the key/.test(prompt));
    check('prompt: keys are saved with set_secret and read from the worker\'s own store',
        /set_secret/.test(prompt) && prompt.includes("await me.puter.kv.get('secret:STRIPE_SECRET_KEY')") && /never at the top of the script/.test(prompt));
    // A key cached in the worker kept the old value after set_secret saved a
    // new one, until the worker was redeployed.
    check('prompt: keys are read on every request, never cached', /Read it on every request and never keep it in a variable outside the handler or cache it/.test(prompt) &&
        !/if \(!\(name in keys\)\)/.test(prompt));
    check('prompt: Stripe and Whop keys have fixed names', /set_secret as STRIPE_SECRET_KEY/.test(prompt) && /set_secret as WHOP_API_KEY/.test(prompt));
    // A key already in an older project's code is the user's call. The AI
    // offers to move it and moves it only once they agree.
    check('prompt: a key already in code is offered a move, never moved unasked',
        /still has a key written in its code \(an older project\), don't move it on your own/.test(prompt) &&
        /offer to move it into the worker's private store\. Only once they agree, save it with set_secret/.test(prompt) &&
        !/move it: save it with set_secret/.test(prompt));
    check('prompt: a live key is saved for the live site only', /Save a live key \(sk_live_ or rk_live_\) with live set to true/.test(prompt) &&
        /Save it with set_secret as WHOP_API_KEY with live set to true/.test(prompt));
    check('prompt: the AI knows what Builder\'s line after a publish means', /After each publish, Builder adds a line in italics/.test(prompt) &&
        !/Remind them about the live key whenever they publish/.test(prompt));
    // The preview and the live site run the same code, so anything that
    // differs between them (Whop's host, its business id) can't be in it.
    check('prompt: Whop\'s host and business id live in the store, not the code',
        /save the API host next to it as WHOP_API/.test(prompt) && /Never put the host in the code/.test(prompt) &&
        /set_secret as WHOP_COMPANY_ID/.test(prompt) && !/const WHOP_API =/.test(prompt) && !/keep it in memory\./.test(prompt) &&
        !/store it as a constant in the worker/.test(prompt));
    const src = read('../src/js/worker-secrets.js');
    check('helper: values are never logged or tracked', !/console\.|window\.track|showToast/.test(src));
    check('helper: key-value access only', /const SCOPES = \{ kv: \['get', 'set', 'del'\] \};/.test(src) && !/fs:/.test(src));
    const ui = read('../src/js/ui.js');
    const publish = ui.slice(ui.indexOf('async function deployPublishedWorkers('), ui.indexOf('async function stripBrandingFromRelease('));
    check('publish: the live backend gets the draft backend\'s keys after it deploys',
        publish.indexOf('WorkerSecrets?.copy(worker.name, liveName)') > publish.indexOf('puter.workers.create(liveName'));
    check('publish: what each live backend got rides on its rename', /renames\.push\(\{[^}]*\bkeys,\s*\}\)/.test(publish));
    const success = ui.slice(ui.indexOf('window.currentPublishedAt = now;'), ui.indexOf('ok = true;', ui.indexOf('window.currentPublishedAt = now;')));
    check('publish: the line goes into the open chat before it is saved',
        success.includes('WorkerSecrets?.publishNote?.(') && success.includes('versionNote: true') &&
        success.indexOf('publishNote') < success.indexOf('saveCurrentChat('));
    const retire = ui.slice(ui.indexOf('async function retirePublishedWorkers('), ui.indexOf('async function doPublish('));
    check('publish: a retired live backend loses its keys before it is deleted',
        retire.indexOf('WorkerSecrets?.clear(worker.name)') > -1 && retire.indexOf('WorkerSecrets?.clear(worker.name)') < retire.indexOf('puter.workers.delete(worker.name)'));
    check('publish: the tool can find the live backend', /^window\.liveWorkerName = liveWorkerName;$/m.test(ui) && /^window\.publishedDirForChat = publishedDirForChat;$/m.test(ui));
    const app = read('../src/js/app.js');
    check('duplicate: the copy\'s backends get the original\'s keys', app.includes('WorkerSecrets?.copy(plan.oldName, plan.newName)'));
    const del = app.slice(app.indexOf('async function deleteChat('), app.indexOf('// Remove the app directory', app.indexOf('async function deleteChat(')));
    check('delete: keys are cleared before each worker is deleted',
        del.indexOf('WorkerSecrets?.clear(worker.name)') > -1 && del.indexOf('WorkerSecrets?.clear(worker.name)') < del.indexOf('puter.workers.delete(worker.name)'));
    const vite = read('../vite.config.js');
    const scripts = vite.slice(vite.indexOf('const SCRIPTS = ['), vite.indexOf('];', vite.indexOf('const SCRIPTS = [')));
    check('bundle: the helper and the tool ship', scripts.includes("'js/worker-secrets.js'") && scripts.includes("'tools/workers/set_secret.js'") &&
        scripts.indexOf("'js/worker-secrets.js'") < scripts.indexOf("'tools/workers/set_secret.js'"));
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll worker-secrets checks passed');
process.exit(failures ? 1 : 0);
