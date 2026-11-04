import fs from 'node:fs';
import vm from 'node:vm';
import { transform } from 'esbuild';

// ---- Hidden app tests ------------------------------------------------------
// The AI keeps a few automated tests for apps with behaviour worth protecting
// (the AppTests tool), and update_preview runs them in an invisible copy of
// the app. The feature spans five places that must agree:
//
//   1. src/runtime.js half 3 — the runner inside the app's page: inert unless
//      it is the builder's test frame, started only by the builder's origin,
//      and a sandbox that keeps the user's data, money and screen untouched.
//   2. src/js/app-tests.js — storage in the hidden .puter/ folder, the hidden
//      frame and its message protocol, retries, and the conservative results.
//   3. src/js/ui.js verifyPreview — runtime errors win; tests overlap the
//      error watch; anything inconclusive is never a failure.
//   4. src/tools/apps_and_sites/update_preview.js and app_tests.js — what the
//      AI is told, sharing the fix-round budget, behind the feature flag.
//   5. src/js/prompt.js and the wiring (flag, bundle order, labels, publish).
//
// The runner is also exercised end to end in real Chrome during development;
// here it runs against a stub DOM, in source and minified form.

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const runtimeSrc = read('../src/runtime.js');
const appTestsSrc = read('../src/js/app-tests.js');
const uiSrc = read('../src/js/ui.js');
const toolsSrc = read('../src/js/tools.js');
const promptSrc = read('../src/js/prompt.js');
const helpersSrc = read('../src/js/helpers.js');
const viteSrc = read('../vite.config.js');
const streamSrc = read('../src/js/handleMessageStream.js');
const updatePreviewSrc = read('../src/tools/apps_and_sites/update_preview.js');
const appTestsToolSrc = read('../src/tools/apps_and_sites/app_tests.js');
const versionsSrc = read('../src/js/versions.js');

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail === undefined ? '' : '  ' + JSON.stringify(detail))); failures++; }
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function until(fn, ms = 3000) {
    const end = Date.now() + ms;
    while (Date.now() < end) { const v = fn(); if (v) return v; await sleep(5); }
    return fn();
}

const FRAME_NAME = 'puter-test-runner';
const BUILDER = 'https://builder.puter.com';

// ===========================================================================
//  1. Wiring
// ===========================================================================

check('flag: FEATURE_FLAGS.appTests exists', /^\s*appTests:\s*(true|false),/m.test(helpersSrc));
{
    const list = viteSrc.slice(viteSrc.indexOf('const SCRIPTS = ['), viteSrc.indexOf('];', viteSrc.indexOf('const SCRIPTS = [')));
    const at = (f) => list.indexOf("'" + f + "'");
    check('bundle: app-tests.js ships before ui.js and the tools', at('js/app-tests.js') > 0 && at('js/app-tests.js') < at('js/ui.js'));
    check('bundle: the AppTests tool ships after update_preview', at('tools/apps_and_sites/app_tests.js') > at('tools/apps_and_sites/update_preview.js'));
}
check('tools: AppTests never clears the preview early', /PREVIEW_SAFE_TOOLS = new Set\(\[[\s\S]*'AppTests'[\s\S]*\]\);/.test(toolsSrc));
check('tools: AppTests is not a mutating tool (no version of its own)', !/MUTATING_TOOLS = new Set\(\[[^\]]*AppTests/.test(versionsSrc));
check('status: AppTests shows a status that never names tests', /AppTests: 'Working on your app'/.test(streamSrc));
check('publish: release drops the hidden tests before it is returned',
    uiSrc.includes('const droppingTests = dropAppTestsFromRelease(releaseDir);') &&
    uiSrc.indexOf('await droppingTests;') > uiSrc.indexOf('const droppingTests') &&
    uiSrc.indexOf('await droppingTests;') < uiSrc.indexOf('return { pubRoot, releaseName, releaseDir, publishedWorkers, branding };'));

// The tests live where every user-facing surface already looks away.
{
    const ctx = vm.createContext({ window: {}, console });
    vm.runInContext(read('../src/js/editor-core.js'), ctx);
    vm.runInContext(read('../src/js/github-core.js'), ctx);
    const env = makeBuilderEnv();
    const rel = env.window.AppTests._core.TESTS_REL;
    check('storage: inside .puter/', rel.startsWith('.puter/'));
    check('storage: hidden from the Code view', ctx.window.EditorCore.isHidden(rel) === true);
    check('storage: never synced to GitHub', ctx.window.GitHubCore.isExcluded(rel, {}) === 'puter');
    check('storage: skipped by the zip download', /item\.is_dir && item\.name === '\.puter'\) continue;/.test(helpersSrc));
    check('storage: skipped by the AI\'s readdir', read('../src/tools/fs/readdir.js').includes("item.name === '.puter'"));
    check('storage: skipped by SearchFiles', read('../src/tools/fs/search_files.js').includes("it.name === '.puter'"));
}

// The nextStepLabel shown after a check that found failing tests.
{
    const start = toolsSrc.indexOf('function nextStepLabel');
    const end = toolsSrc.indexOf('\n}\n', start);
    const label = new Function('findToolResult', toolsSrc.slice(start, end + 2) + '\nreturn nextStepLabel;')(
        (h, id) => ({ content: { content: JSON.stringify(h[id]) } }));
    const call = [{ name: 'update_preview', id: 'x' }];
    check('status: failing tests → "Fixing a problem"', label(call, { x: { verification: { status: 'tests_failed' } } }) === 'Fixing a problem');
    check('status: tests that still fail → "Finishing up"', label(call, { x: { verification: { status: 'tests_persist' } } }) === 'Finishing up');
    check('status: runtime errors unchanged', label(call, { x: { verification: { status: 'errors_detected' } } }) === 'Fixing a problem');
}

// ===========================================================================
//  2. The prompt rule
// ===========================================================================
function renderPrompt(flags) {
    const window = { FEATURE_FLAGS: flags };
    new Function('window', promptSrc)(window);
    return window.system_prompt_common();
}
{
    const on = renderPrompt({ appTests: true, clickToEdit: true, createdWithBadge: true });
    const off = renderPrompt({ appTests: false, clickToEdit: true, createdWithBadge: true });
    check('prompt: rule present with the flag on', on.includes('IMPORTANT: Hidden tests.') && on.includes('AppTests tool'));
    check('prompt: rule absent with the flag off', !off.includes('Hidden tests') && !off.includes('AppTests'));
    check('prompt: tells the AI never to mention the tests', on.includes('never mention tests, the AppTests tool or test results'));
    check('prompt: never weaken a test to pass', on.includes('never weaken or delete a test just to make it pass'));
    check('prompt: static (cache-stable)', on === renderPrompt({ appTests: true, clickToEdit: true, createdWithBadge: true }));
    check('prompt: no unresolved placeholder', !on.includes('${'));
    check('prompt: the rest of the prompt is unchanged by the flag',
        on.replace(/\n\nIMPORTANT: Hidden tests\.[^\n]*/, '') === off);
}

// ===========================================================================
//  3. The runner (runtime.js half 3) against a stub DOM
// ===========================================================================


// A tiny DOM: elements with ids, tags, text, values, listeners, visibility.
function makeDom(g) {
    class Ev { constructor(type, init) { this.type = type; Object.assign(this, init || {}); this.defaultPrevented = false; } preventDefault() { this.defaultPrevented = true; } }
    class El {
        constructor(tag, props) {
            this.tagName = tag.toUpperCase(); this.nodeType = 1; this.children = []; this.parentNode = null;
            this.listeners = {}; this.id = ''; this.className = ''; this._text = ''; this.value = ''; this.disabled = false;
            this.hidden = false; this.isConnected = true; this.type = ''; this.tabIndex = -1;
            Object.assign(this, props || {});
        }
        get textContent() { return this._text + this.children.map(c => c.textContent).join(''); }
        set textContent(v) { this._text = String(v); this.children = []; }
        appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
        contains(o) { for (let n = o; n; n = n.parentNode) if (n === this) return true; return false; }
        addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
        dispatchEvent(e) { e.target = e.target || this; (this.listeners[e.type] || []).forEach(fn => fn.call(this, e)); if (e.bubbles && this.parentNode) this.parentNode.dispatchEvent(e); return !e.defaultPrevented; }
        click() { this.dispatchEvent(new Ev('click', { bubbles: true, cancelable: true })); }
        focus() { g.document.activeElement = this; }
        blur() { if (g.document.activeElement === this) g.document.activeElement = g.document.body; }
        getBoundingClientRect() { return this.hidden ? { left: 0, top: 0, width: 0, height: 0 } : { left: 1, top: 1, width: 10, height: 10 }; }
    }
    const body = new El('body');
    const all = () => { const out = []; (function walk(n) { for (const c of n.children) { out.push(c); walk(c); } })(body); return out; };
    const document = {
        body, activeElement: body, readyState: 'complete',
        createElement: (t) => new El(t),
        addEventListener() {}, removeEventListener() {},
        querySelectorAll(sel) {
            if (sel === '##' || /^\s*$/.test(sel)) throw new SyntaxError('bad selector');
            if (sel.startsWith('#')) return all().filter(e => e.id === sel.slice(1));
            return all().filter(e => e.tagName === sel.toUpperCase());
        },
        querySelector(sel) { return this.querySelectorAll(sel)[0] || null; },
    };
    g.Event = Ev; g.MouseEvent = Ev; g.KeyboardEvent = Ev; g.InputEvent = Ev;
    g.getComputedStyle = (el) => ({ visibility: 'visible', display: el.hidden ? 'none' : 'block' });
    g.document = document;
    return { El, body, document };
}

function storageOf(map) {
    return {
        getItem: (k) => (map.has(String(k)) ? map.get(String(k)) : null),
        setItem: (k, v) => { map.set(String(k), String(v)); },
        removeItem: (k) => { map.delete(String(k)); },
        clear: () => map.clear(),
        key: (i) => [...map.keys()][i] ?? null,
        get length() { return map.size; },
    };
}

function makeRuntimeEnv(src, { top = false, name = FRAME_NAME } = {}) {
    const posted = [];
    const listeners = {};
    const realLocal = new Map([['existing', 'kept']]);
    const realKv = new Map([['seed', 'from-real']]);
    const real = { ai: 0, kvSets: 0, fsWrites: 0, signOuts: 0, workerWrites: 0, fetches: [] };
    const g = {
        console, URL, Promise, Proxy, JSON, Math, Date, Object, Array, String, Number, Boolean, Error, SyntaxError, TypeError, RegExp, Symbol, Map, Set,
        setTimeout, clearTimeout, setInterval, clearInterval, encodeURIComponent, Function,
    };
    g.window = g; g.self = g;
    g.top = top ? g : { other: true };
    g.name = name;
    g.parent = { postMessage: (msg, origin) => posted.push({ msg, origin }) };
    g.addEventListener = (t, fn) => (listeners[t] = listeners[t] || []).push(fn);
    g.removeEventListener = () => {};
    g.location = { href: 'https://app.puter.site/' };
    g.localStorage = storageOf(realLocal);
    g.sessionStorage = storageOf(new Map());
    g.fetch = (u, init) => { real.fetches.push({ u: String(u), m: (init && init.method) || 'GET' }); return Promise.resolve({ ok: true }); };
    g.Image = function () { this.src = ''; };
    g.Audio = function (src) { this.src = src; };
    g.puter = {
        ai: { chat: () => { real.ai++; return Promise.resolve('REAL'); }, txt2img: () => { real.ai++; return Promise.resolve(null); }, listModels: () => Promise.resolve(['m']) },
        kv: {
            get: (k) => Promise.resolve(realKv.has(k) ? realKv.get(k) : null),
            set: () => { real.kvSets++; return Promise.resolve(true); },
            del: () => { real.kvSets++; return Promise.resolve(true); },
            list: (p, withValues) => Promise.resolve([...realKv].map(([key, value]) => (withValues ? { key, value } : key))),
            setAuthToken() { return 'internal'; },
        },
        fs: { write: () => { real.fsWrites++; return Promise.resolve({}); }, read: () => Promise.resolve('file') },
        auth: { signIn: () => Promise.resolve({}), signOut: () => { real.signOuts++; } },
        workers: { exec: (u, init) => { if (init && init.method && init.method !== 'GET') real.workerWrites++; return Promise.resolve({ ok: true }); }, create: () => Promise.resolve({}) },
        hosting: { create: () => Promise.resolve({}) },
    };
    const dom = makeDom(g);
    vm.createContext(g);
    vm.runInContext(src, g);
    // Inside the context, `window` is the context's own view of g, not g.
    const self = vm.runInContext('window', g);
    const deliver = (data, origin = BUILDER, source = g.parent) =>
        (listeners.message || []).forEach(fn => fn({ data, origin, source }));
    const raise = (type, ev) => (listeners[type] || []).forEach(fn => fn(ev));
    return { g, self, posted, listeners, deliver, raise, real, realLocal, dom };
}

async function runSuite(env, code, extra = {}) {
    const runId = 'run-' + Math.random();
    env.deliver(Object.assign({ type: 'puter-tests-run', runId, code, page: '', mobile: false }, extra));
    const done = await until(() => env.posted.find(p => p.msg.type === 'puter-tests-done' && p.msg.runId === runId), 8000);
    return done ? done.msg : null;
}

async function runtimeChecks(label, src) {
    // Inert where it doesn't belong.
    {
        const topEnv = makeRuntimeEnv(src, { top: true });
        check(`[${label}] top-level page: runner not installed`, !topEnv.g.__puterTestRunner);
        check(`[${label}] top-level page: storage untouched`, topEnv.g.localStorage.getItem('existing') === 'kept' && typeof topEnv.g.puter.ai.chat() === 'object' && topEnv.real.ai === 1);
        const preview = makeRuntimeEnv(src, { name: '' });
        preview.g.localStorage.setItem('k', 'v');
        check(`[${label}] visible preview frame: runner not installed`, !preview.g.__puterTestRunner && preview.realLocal.get('k') === 'v');
        const noBadge = makeRuntimeEnv(src, { name: 'puter-preview-no-badge' });
        check(`[${label}] no-badge preview frame: runner not installed`, !noBadge.g.__puterTestRunner);
    }

    const env = makeRuntimeEnv(src);
    const { g, real } = env;
    check(`[${label}] test frame: runner installed`, g.__puterTestRunner === true);

    // Storage: reads fall through, writes stay in memory.
    check(`[${label}] localStorage reads the real data`, g.localStorage.getItem('existing') === 'kept' && g.localStorage.existing === 'kept');
    g.localStorage.setItem('new', '1');
    g.localStorage.removeItem('existing');
    g.localStorage.prop = 'p';
    check(`[${label}] localStorage writes stay in memory`, g.localStorage.getItem('new') === '1' && g.localStorage.getItem('existing') === null &&
        env.realLocal.get('existing') === 'kept' && !env.realLocal.has('new') && !env.realLocal.has('prop'));
    check(`[${label}] localStorage keys/length reflect the layer`, JSON.stringify(Object.keys(g.localStorage).sort()) === JSON.stringify(['new', 'prop']) && g.localStorage.length === 2);
    g.localStorage.clear();
    check(`[${label}] localStorage.clear hides the real data, keeps it`, g.localStorage.length === 0 && g.localStorage.getItem('existing') === null && env.realLocal.get('existing') === 'kept');

    // puter.kv: same overlay.
    const kv = g.puter.kv;
    check(`[${label}] kv get reads through`, (await kv.get('seed')) === 'from-real');
    await kv.set('a', { n: 1 });
    check(`[${label}] kv set stays in memory`, JSON.stringify(await kv.get('a')) === '{"n":1}' && real.kvSets === 0);
    check(`[${label}] kv incr/decr`, (await kv.incr('c')) === 1 && (await kv.incr('c', 5)) === 6 && (await kv.decr('c')) === 5 && real.kvSets === 0);
    await kv.del('seed');
    check(`[${label}] kv del hides a real key`, (await kv.get('seed')) === null && real.kvSets === 0);
    const keys = await kv.list();
    check(`[${label}] kv list merges the layer`, keys.includes('a') && keys.includes('c') && !keys.includes('seed'), keys);
    const withValues = await kv.list('a*', true);
    check(`[${label}] kv list with a pattern and values`, withValues.length === 1 && withValues[0].key === 'a' && withValues[0].value.n === 1, withValues);
    await kv.flush();
    check(`[${label}] kv flush empties the view only`, (await kv.list()).length === 0 && real.kvSets === 0);
    check(`[${label}] kv keeps puter.js internals`, kv.setAuthToken() === 'internal');

    // AI: placeholders, no cost.
    const reply = await g.puter.ai.chat('hi');
    check(`[${label}] ai.chat answers a placeholder`, String(reply).includes('placeholder') && reply.message.content === String(reply) && real.ai === 0);
    const streamed = await g.puter.ai.chat('hi', { stream: true });
    const part = await streamed.next();
    check(`[${label}] ai.chat streams a placeholder`, part.value.text.includes('placeholder') && (await streamed.next()).done === true);
    check(`[${label}] ai.txt2img gives a placeholder image`, String((await g.puter.ai.txt2img('x')).src).startsWith('data:image') && real.ai === 0);
    check(`[${label}] free AI calls pass through`, (await g.puter.ai.listModels())[0] === 'm');

    // Refusals.
    const reason = (p) => p.then(() => 'resolved', e => e.message);
    check(`[${label}] puter.fs writes refused`, /turned off/.test(await reason(g.puter.fs.write('x', 'y'))) && real.fsWrites === 0);
    check(`[${label}] puter.fs reads pass`, (await g.puter.fs.read('x')) === 'file');
    check(`[${label}] sign-in refused`, /turned off/.test(await reason(g.puter.auth.signIn())));
    await g.puter.auth.signOut();
    check(`[${label}] sign-out is a no-op`, real.signOuts === 0);
    check(`[${label}] worker writes refused (fetch)`, /turned off/.test(await reason(g.fetch('https://api.puter.work/items', { method: 'POST' }))) &&
        !real.fetches.some(f => f.m === 'POST'));
    await g.fetch('https://api.puter.work/items');
    await g.fetch('https://example.com/x', { method: 'POST' });
    check(`[${label}] worker reads and other sites pass (fetch)`, real.fetches.length === 2);
    check(`[${label}] worker writes refused (workers.exec)`, /turned off/.test(await reason(g.puter.workers.exec('https://api.puter.work/x', { method: 'DELETE' }))) && real.workerWrites === 0);
    check(`[${label}] worker management refused`, /turned off/.test(await reason(g.puter.workers.create('x'))) && /turned off/.test(await reason(g.puter.hosting.create('x'))));
    check(`[${label}] dialogs answered silently`, g.confirm('Sure?') === true && g.prompt('Name?', 'Ada') === 'Ada' && g.alert('hi') === undefined && g.open('https://x') === null);

    // Who may start a run.
    env.deliver({ type: 'puter-tests-run', runId: 'evil', code: 'test("x", () => {})' }, 'https://evil.example');
    env.deliver({ type: 'puter-tests-run', runId: 'evil2', code: 'test("x", () => {})' }, 'https://attacker.puter.site');
    env.deliver({ type: 'puter-tests-run', runId: 'evil3', code: 'test("x", () => {})' }, BUILDER, { notParent: true });
    await sleep(30);
    check(`[${label}] runs only for the builder's origin, from the parent`, env.posted.length === 0, env.posted);

    // A real run against the stub DOM.
    const { El, body } = env.dom;
    const count = body.appendChild(new El('p', { id: 'count', _text: '0 items' }));
    const input = body.appendChild(new El('input', { id: 'item', type: 'text', tabIndex: 0 }));
    const add = body.appendChild(new El('button', { id: 'add', _text: 'Add item', tabIndex: 0 }));
    const items = [];
    add.addEventListener('click', () => { if (input.value) { items.push(input.value); count.textContent = items.length + ' items'; } });
    const boom = body.appendChild(new El('button', { id: 'boom', _text: 'Boom' }));
    boom.addEventListener('click', () => env.raise('error', { message: 'Uncaught Error: kaboom', filename: 'https://app.puter.site/app.js', lineno: 3, target: env.self }));
    body.appendChild(new El('button', { id: 'gone', hidden: true }));

    const done = await runSuite(env, [
        "test('adds an item', async () => {",
        "  await fill('#item', 'Milk');",
        "  await click('button', { text: 'add item' });",
        "  expect(await text('#count')).toBe('1 items');",
        "  expect(visible('#gone')).toBe(false);",
        "});",
        "test('wrong count', async () => {",
        "  expect(await text('#count')).toBe('9 items');",
        "});",
        "test('app error', async () => { await click('#boom'); });",
        "test('hidden element', async () => { await click('#gone', { timeout: 150 }); });",
        "test('hangs', { timeout: 150 }, () => new Promise(() => {}));",
        "test('bad selector', async () => { await click('##'); });",
        "test('other page', { page: 'about.html' }, async () => {});",
        "test('phone', { mobile: true }, async () => {});",
    ].join('\n'));
    const by = Object.fromEntries((done?.results || []).map(r => [r.name, r]));
    check(`[${label}] ack goes to the builder's origin only`, env.posted.every(p => p.origin === BUILDER) && env.posted[0].msg.type === 'puter-tests-ack');
    check(`[${label}] plan announced before running`, env.posted.some(p => p.msg.type === 'puter-tests-plan' && p.msg.total === 8));
    check(`[${label}] passing test passes`, by['adds an item']?.passed === true, by['adds an item']);
    check(`[${label}] assertion failure explained with its line`, /Expected "1 items" to be "9 items"\. \(tests line 8\)/.test(by['wrong count']?.error), by['wrong count']);
    check(`[${label}] an app error during a test fails it`, /threw an error during this test: Uncaught Error: kaboom \(app\.js:3\)/.test(by['app error']?.error), by['app error']);
    check(`[${label}] a hidden element is explained`, /exists but is hidden/.test(by['hidden element']?.error), by['hidden element']);
    check(`[${label}] a hung test times out`, /Timed out after 0\.2s|Timed out after 0\.1s/.test(by.hangs?.error), by.hangs);
    check(`[${label}] a bad selector fails at once`, /Invalid CSS selector/.test(by['bad selector']?.error), by['bad selector']);
    check(`[${label}] only this page's tests ran`, !by['other page'] && !by.phone && done.results.length === 6);
    check(`[${label}] other pages and sizes reported as groups`,
        JSON.stringify(done.groups) === JSON.stringify([{ page: '', mobile: false }, { page: 'about.html', mobile: false }, { page: '', mobile: true }]), done.groups);
    check(`[${label}] each result posted as it finished`, env.posted.filter(p => p.msg.type === 'puter-tests-result').length === 6);
    check(`[${label}] a resend of the same run is only acked`, (() => {
        const before = env.posted.length;
        env.deliver({ type: 'puter-tests-run', runId: done.runId, code: 'x' });
        return env.posted.length === before + 1 && env.posted[before].msg.type === 'puter-tests-ack';
    })());
    env.deliver({ type: 'puter-tests-run', runId: 'second', code: 'test("x", () => {})' });
    await sleep(20);
    check(`[${label}] one run per page load`, !env.posted.some(p => p.msg.runId === 'second'));

    // Setup problems.
    const setup = await runSuite(makeRuntimeEnv(src), "throw new Error('bad setup');");
    check(`[${label}] a throwing setup is reported`, /threw before any test ran: bad setup/.test(setup?.setupError), setup);
    const syntax = await runSuite(makeRuntimeEnv(src), 'test(');
    check(`[${label}] a syntax error is reported`, /could not be read/.test(syntax?.setupError), syntax);
    const empty = await runSuite(makeRuntimeEnv(src), '   ');
    check(`[${label}] empty tests are reported`, /empty/.test(empty?.setupError), empty);
    const nested = await runSuite(makeRuntimeEnv(src), "test('outer', () => { test('inner', () => {}); });");
    check(`[${label}] test() inside a test fails that test`, /top level/.test(nested?.results?.[0]?.error), nested);

    // Too many tests: only the first 25 count.
    const many = await runSuite(makeRuntimeEnv(src), Array.from({ length: 30 }, (_, i) => `test('t${i}', () => {});`).join('\n'));
    check(`[${label}] tests beyond the cap are dropped`, many?.total === 25 && many?.dropped === 5 && many.results.length === 25, { total: many?.total, dropped: many?.dropped });
}

await runtimeChecks('source', runtimeSrc);
const { code: minified } = await transform(runtimeSrc, { minifyWhitespace: true, minifySyntax: true, minifyIdentifiers: true, legalComments: 'none', target: 'es2020' });
await runtimeChecks('minified', minified);
{
    // Comments gone and string contents blanked, so only code is checked.
    const { code: bare } = await transform(runtimeSrc, { minifyWhitespace: true, legalComments: 'none', target: 'es2020' });
    const code = bare.replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"/g, '""');
    check('runtime: no async/await or arrow syntax (a parse error would take the badge down)',
        !/=>/.test(code) && !/\basync\b|\bawait\b/.test(code));
}

// ===========================================================================
//  4. The builder side (app-tests.js) against a simulated frame
// ===========================================================================

// A window/document where each hidden frame is driven by `scenario`, which
// plays the runner's part: scenario(frameInfo) returns handlers for the run
// message and the load.
function makeBuilderEnv(opts = {}) {
    const listeners = {};
    const docListeners = {};
    const frames = [];
    const composer = { id: 'composer', isConnected: true, focus() { document.activeElement = this; } };
    const document = {
        visibilityState: opts.hidden ? 'hidden' : 'visible',
        activeElement: composer,
        body: {
            children: [],
            appendChild(f) { this.children.push(f); f.isConnected = true; frames.push(f); f._attached(); return f; },
        },
        createElement() { return makeFrame(); },
        addEventListener(t, fn) { (docListeners[t] = docListeners[t] || []).push(fn); },
        removeEventListener(t, fn) { docListeners[t] = (docListeners[t] || []).filter(x => x !== fn); },
    };
    const window = {
        FEATURE_FLAGS: { appTests: true },
        addEventListener(t, fn) { (listeners[t] = listeners[t] || []).push(fn); },
        removeEventListener(t, fn) { listeners[t] = (listeners[t] || []).filter(x => x !== fn); },
    };
    function makeFrame() {
        const f = {
            attrs: {}, style: {}, loadListeners: [], isConnected: false, sent: [], srcs: [],
            setAttribute(k, v) { this.attrs[k] = v; },
            addEventListener(t, fn) { if (t === 'load') this.loadListeners.push(fn); },
            getBoundingClientRect() { return { width: 1280, height: 800 }; },
            blur() { if (document.activeElement === this) document.activeElement = { id: 'body' }; },
            remove() { this.isConnected = false; document.body.children = document.body.children.filter(x => x !== this); if (document.activeElement === this) document.activeElement = { id: 'body' }; },
            _attached() {},
        };
        const contentWindow = {
            get location() { throw new Error('cross-origin'); },
            postMessage(msg, origin) { f.sent.push({ msg, origin }); if (f.onRun) f.onRun(msg, origin); },
        };
        f.contentWindow = contentWindow;
        let src = '';
        Object.defineProperty(f, 'src', {
            get() { return src; },
            set(v) {
                src = v; f.srcs.push(v);
                if (v === 'about:blank') return;
                const play = opts.scenario && opts.scenario(f, frames.length - 1);
                if (!(play && play.noLoad)) setTimeout(() => f.fireLoad(), 5);
                f.onRun = (msg, origin) => play && play.onRun && play.onRun(msg, origin);
            },
        });
        f.fireLoad = () => f.loadListeners.forEach(fn => fn());
        f.reply = (data, { origin = new URL(src).origin, source = contentWindow } = {}) =>
            (listeners.message || []).forEach(fn => fn({ data, origin, source }));
        return f;
    }
    const files = new Map();
    const ctx = {
        window, document, console, URL, crypto: globalThis.crypto, setTimeout, clearTimeout, setInterval, clearInterval, Promise, Date, Math, JSON, Map, Object, Array, String, Number, Error, SyntaxError,
        isNotFoundError: (e) => /not found/i.test(String(e && e.message)),
        puter: {
            fs: {
                read: async (p) => { if (!files.has(p)) throw new Error('Not found'); return { text: async () => files.get(p) }; },
                delete: async (p) => { if (!files.has(p)) throw new Error('Not found'); files.delete(p); },
            },
        },
    };
    window.withFileLock = (p, fn) => Promise.resolve().then(fn);
    window.writeFileVerified = async (p, d) => { files.set(p, d); };
    ctx.window.document = document;
    vm.createContext(ctx);
    vm.runInContext(appTestsSrc, ctx);
    const AT = window.AppTests;
    Object.assign(AT.timing, { ack: 120, load: 1500, poll: 10, start: 1, budget: opts.budget || 3000 });
    return { window, document, AT, frames, files, composer, listeners, fire: (t, e) => (listeners[t] || []).forEach(fn => fn(e)) };
}

// The runner's part for a well-behaved page: ack, plan, results, done.
function runner(resultsFor, { groups = [{ page: '', mobile: false }] } = {}) {
    return (f, index) => ({
        onRun(msg) {
            const r = resultsFor(msg, index, f);
            if (r === 'silent') return;
            f.reply({ type: 'puter-tests-ack', runId: msg.runId });
            if (r === 'hang') return;
            f.reply({ type: 'puter-tests-plan', runId: msg.runId, groups, total: 1 });
            for (const res of r) f.reply({ type: 'puter-tests-result', runId: msg.runId, result: res });
            f.reply({ type: 'puter-tests-done', runId: msg.runId, results: r, groups, total: r.length });
        },
    });
}

const BASE = 'https://preview-1.puter.site/';
{
    const core = makeBuilderEnv().AT._core;
    check('core: main page url is the preview, busted', /^https:\/\/preview-1\.puter\.site\/\?__pv=/.test(core.groupUrl(BASE, { page: '' })));
    check('core: a page of the app', /^https:\/\/preview-1\.puter\.site\/shop\/cart\.html\?__pv=/.test(core.groupUrl(BASE, { page: 'shop/cart.html' })));
    check('core: never another site', core.groupUrl(BASE, { page: 'https://evil.example/x' }) === null &&
        core.groupUrl(BASE, { page: '//evil.example/x' }) === null && core.groupUrl(BASE, { page: 'javascript:alert(1)' }) === null);
    const cleaned = core.cleanResult({ name: 'a`b\nc', passed: 'yes', error: 'x'.repeat(1000) });
    check('core: frame results are cleaned and clipped', cleaned.name === 'a b c' && cleaned.passed === false && cleaned.error.length <= 401);
    check('core: syntax errors caught at save', !!core.syntaxError('test(') && core.syntaxError("test('x', async () => { await click('#a'); })") === null);
    const merged = core.mergeRetry({ results: [{ name: 'a', passed: false, error: 'e' }, { name: 'b', passed: false, error: 'e' }] },
        { results: [{ name: 'a', passed: true }, { name: 'b', passed: false, error: 'e2' }] });
    check('core: a test passing on retry counts as passed', merged.results[0].passed === true && merged.results[1].passed === false);
    const s = core.summarize([{ group: { page: '', mobile: false }, results: Array.from({ length: 10 }, (_, i) => ({ name: 't' + i, passed: false, error: 'e' })) }]);
    check('core: failures capped for the AI', s.failures.length === 8 && s.moreFailures === 2 && s.total === 10);
}

async function builderScenario(name, opts, expectFn) {
    const env = makeBuilderEnv(opts);
    const r = await env.AT.run(Object.assign({ baseUrl: BASE, code: "test('x', () => {})" }, opts.run || {}));
    await sleep(15);
    check(name, expectFn(r, env), Object.assign({}, r, { frames: env.frames.length, sent: env.frames.map(f => f.sent.map(s => s.origin)) }));
    check(name + ' — no frame left behind', env.document.body.children.length === 0);
    return env;
}

await builderScenario('builder: passing run', { scenario: runner(() => [{ name: 'a', passed: true }]) },
    (r, env) => r.status === 'passed' && r.total === 1 && env.frames.length === 1 &&
        env.frames[0].sent[0].origin === 'https://preview-1.puter.site' &&
        env.frames[0].name === FRAME_NAME && env.frames[0].attrs.sandbox === 'allow-scripts allow-same-origin allow-forms' &&
        env.frames[0].attrs.allow === '' && env.frames[0].attrs['aria-hidden'] === 'true' && env.frames[0].tabIndex === -1 &&
        /opacity:0/.test(env.frames[0].style.cssText) && /pointer-events:none/.test(env.frames[0].style.cssText));
await builderScenario('builder: no runner answers → unavailable', { scenario: runner(() => 'silent') }, (r) => r.status === 'unavailable');
await builderScenario('builder: nothing loads → unavailable', { scenario: () => ({ noLoad: true }) },
    (r) => r.status === 'unavailable');
await builderScenario('builder: failing twice → failed', { scenario: runner(() => [{ name: 'a', passed: false, error: 'Expected 1 to be 2.' }]) },
    (r, env) => r.status === 'failed' && r.failures[0].name === 'a' && /Expected 1 to be 2/.test(r.failures[0].error) && env.frames.length === 2);
await builderScenario('builder: flaky (fails, then passes) → passed', {
    scenario: runner((msg, i) => [{ name: 'a', passed: i > 0, error: i > 0 ? '' : 'flaky' }]),
}, (r) => r.status === 'passed');
await builderScenario('builder: no tests registered → none', { scenario: runner(() => []) }, (r) => r.status === 'none');
await builderScenario('builder: other pages run in their own frames', {
    scenario: runner((msg) => [{ name: 'on ' + (msg.page || 'main') + (msg.mobile ? ' phone' : ''), passed: true }],
        { groups: [{ page: '', mobile: false }, { page: 'about.html', mobile: false }, { page: '', mobile: true }, { page: 'https://evil.example/', mobile: false }] }),
}, (r, env) => r.status === 'failed' && r.total === 3 && r.failures.length === 1 && /isn't a page of this app/.test(r.failures[0].error) &&
    env.frames.length === 3 && /about\.html/.test(env.frames[1].srcs[0]) && env.frames[2].style.cssText.includes('width:390px'));
await builderScenario('builder: navigating away mid-test → that test fails', {
    scenario: (f) => ({
        onRun(msg) {
            f.reply({ type: 'puter-tests-ack', runId: msg.runId });
            f.reply({ type: 'puter-tests-plan', runId: msg.runId, groups: [{ page: '', mobile: false }], total: 2 });
            f.reply({ type: 'puter-tests-result', runId: msg.runId, result: { name: 'first', passed: true } });
            f.reply({ type: 'puter-tests-progress', runId: msg.runId, name: 'clicks a link' });
            setTimeout(() => f.fireLoad(), 5);
        },
    }),
}, (r) => r.status === 'failed' && r.failures.length === 1 && r.failures[0].name === 'clicks a link' && /navigated away/.test(r.failures[0].error) && r.passed === 1);
await builderScenario('builder: messages from elsewhere are ignored', {
    scenario: (f) => ({
        onRun(msg) {
            const done = { type: 'puter-tests-done', runId: msg.runId, results: [{ name: 'forged', passed: false, error: 'x' }] };
            f.reply(done, { origin: 'https://evil.example' });
            f.reply(done, { source: { other: true } });
            f.reply(Object.assign({}, done, { runId: 'other' }));
        },
    }),
}, (r) => r.status === 'unavailable');
await builderScenario('builder: setup error reported once, not retried', {
    scenario: (f) => ({ onRun(msg) { f.reply({ type: 'puter-tests-ack', runId: msg.runId }); f.reply({ type: 'puter-tests-done', runId: msg.runId, setupError: 'The tests threw before any test ran: x' }); } }),
}, (r, env) => r.status === 'failed' && r.failures[0].name === 'Setting up the tests' && env.frames.length === 1);
await builderScenario('builder: a page that forbids eval → unavailable', {
    scenario: (f) => ({ onRun(msg) { f.reply({ type: 'puter-tests-ack', runId: msg.runId }); f.reply({ type: 'puter-tests-done', runId: msg.runId, unavailable: true }); } }),
}, (r) => r.status === 'unavailable');
{
    let n = 0;
    const started = Date.now();
    await builderScenario('builder: a stopped turn → skipped at once', {
        scenario: runner(() => 'hang'),
        run: { aborted: () => ++n > 5 },
    }, (r) => r.status === 'skipped' && Date.now() - started < 1000);
}
await builderScenario('builder: out of time → the running test is not blamed', {
    budget: 200,
    scenario: (f) => ({ onRun(msg) { f.reply({ type: 'puter-tests-ack', runId: msg.runId }); f.reply({ type: 'puter-tests-progress', runId: msg.runId, name: 'slow' }); } }),
}, (r) => r.status !== 'failed');
await builderScenario('builder: failures from a background tab are not trusted', {
    hidden: true,
    scenario: runner(() => [{ name: 'a', passed: false, error: 'Timed out' }]),
}, (r) => r.status === 'skipped');
await builderScenario('builder: flag off → nothing runs', {
    scenario: runner(() => [{ name: 'a', passed: false, error: 'e' }]),
    run: {},
}, (r) => r.status === 'failed'); // sanity: on by default in this env
{
    const env = makeBuilderEnv({ scenario: runner(() => [{ name: 'a', passed: false, error: 'e' }]) });
    env.window.FEATURE_FLAGS.appTests = false;
    const r = await env.AT.run({ baseUrl: BASE, code: "test('x', () => {})" });
    check('builder: flag off → none, no frame', r.status === 'none' && env.frames.length === 0);
}
{
    // Focus that lands in the hidden frame goes straight back to the composer.
    const env = makeBuilderEnv({
        scenario: (f) => ({
            onRun(msg) {
                f.reply({ type: 'puter-tests-ack', runId: msg.runId });
                setTimeout(() => {
                    env.document.activeElement = f;
                    env.fire('blur', {});
                    f.reply({ type: 'puter-tests-done', runId: msg.runId, results: [{ name: 'a', passed: true }] });
                }, 10);
            },
        }),
    });
    const r = await env.AT.run({ baseUrl: BASE, code: "test('x', () => {})" });
    check('builder: focus pulled into the test frame goes back to the composer', r.status === 'passed' && env.document.activeElement === env.composer);
}

// Storage through the real read/write/remove.
{
    const env = makeBuilderEnv();
    const dir = '/u/AppData/app/chat-1';
    check('storage: path', env.AT.testsPath(dir) === dir + '/.puter/builder/tests.js' && env.AT.testsPath('') === '');
    check('storage: none yet → null', (await env.AT.read(dir)) === null);
    await env.AT.write(dir, "test('a', () => {});");
    check('storage: write then read', (await env.AT.read(dir)) === "test('a', () => {});");
    const refusal = (p) => p.then(() => '', e => e.message);
    check('storage: empty code refused', /empty/.test(await refusal(env.AT.write(dir, '  '))));
    check('storage: oversized code refused', /under 100000/.test(await refusal(env.AT.write(dir, 'x'.repeat(100001)))));
    check('storage: syntax error refused, old tests kept', /syntax error/.test(await refusal(env.AT.write(dir, 'test('))) &&
        (await env.AT.read(dir)) === "test('a', () => {});");
    await env.AT.remove(dir);
    check('storage: remove', (await env.AT.read(dir)) === null);
    await env.AT.remove(dir);
    check('storage: removing nothing is fine', true);
}

// ===========================================================================
//  5. verifyPreview: errors win, tests overlap, inconclusive is never a failure
// ===========================================================================
const vStart = uiSrc.indexOf('// --- In-turn preview verification');
const vEnd = uiSrc.indexOf("$(document).on('click', '.send'", vStart);
const verifySlice = uiSrc.slice(vStart, vEnd);
function makeVerify({ errorsAfterLoad = [], tests, readFails = false, abortAfterMs = 0 } = {}) {
    const loadHandlers = [];
    const frame = { length: 1, on(ev, fn) { if (ev === 'load') loadHandlers.push(fn); return this; }, off() { return this; } };
    const $ = (sel) => (sel === '.preview-frame' ? frame : sel === 'body' ? { hasClass: () => true } : { length: 0 });
    const listeners = [];
    const started = Date.now();
    const seen = { runs: 0, abortedSeen: false };
    const win = {
        currentPreviewUrl: BASE,
        isAborted: () => abortAfterMs > 0 && Date.now() - started > abortAfterMs,
        isStaleTurn: () => false,
        projectRootDir: () => '/app',
        addEventListener(ev, fn) { if (ev === 'message') listeners.push(fn); },
        schedulePreviewRefresh() {},
        flushPreviewRefresh() {
            setTimeout(() => {
                win._notifyPreviewReloadCommit();
                loadHandlers.slice().forEach(h => h());
                for (const e of errorsAfterLoad) listeners.forEach(fn => fn({ data: { type: 'app-error', message: e }, source: {} }));
            }, 10);
        },
    };
    if (tests !== undefined) {
        win.AppTests = {
            enabled: () => true,
            read: async () => { if (readFails) throw new Error('boom'); return tests === null ? null : 'test("x", () => {})'; },
            run: async ({ aborted }) => {
                seen.runs++;
                if (tests === 'reject') throw new Error('runner crashed');
                const end = Date.now() + 4000;
                while (Date.now() < end) {
                    if (aborted()) { seen.abortedSeen = true; return { status: 'skipped' }; }
                    if (tests.after && Date.now() - started > tests.after) break;
                    await sleep(20);
                }
                return tests.result;
            },
        };
    }
    new Function('window', '$', 'isTrustedPreviewMessage', 'isRuntimeAssetError', verifySlice + '\nreturn null;')(win, $, () => true, () => false);
    return { win, seen };
}
{
    const FAIL = { after: 100, result: { status: 'failed', total: 2, failures: [{ name: 'a', error: 'e', where: '' }], moreFailures: 0 } };
    const t0 = Date.now();
    const [noTests, failing, passing, errorsWin, rejecting, readFailing, stopped, slowTests] = await Promise.all([
        makeVerify({ tests: null }).win.verifyPreview({}),
        makeVerify({ tests: FAIL }).win.verifyPreview({}),
        makeVerify({ tests: { after: 100, result: { status: 'passed', total: 2, failures: [] } } }).win.verifyPreview({}),
        (async () => { const v = makeVerify({ tests: { after: 3800, result: FAIL.result }, errorsAfterLoad: ['Boom'] }); const r = await v.win.verifyPreview({}); await sleep(50); return { r, seen: v.seen }; })(),
        makeVerify({ tests: 'reject' }).win.verifyPreview({}),
        makeVerify({ tests: FAIL, readFails: true }).win.verifyPreview({}),
        makeVerify({ tests: { after: 3900, result: FAIL.result }, abortAfterMs: 3300 }).win.verifyPreview({}),
        (async () => { const s = Date.now(); const r = await makeVerify({ tests: { after: 3600, result: { status: 'passed' } } }).win.verifyPreview({}); return Date.now() - s; })(),
    ]);
    check('verify: no tests → ok, as before', noTests.status === 'ok');
    check('verify: failing tests → test-failures', failing.status === 'test-failures' && failing.failures[0].name === 'a' && failing.total === 2);
    check('verify: passing tests → ok', passing.status === 'ok');
    check('verify: runtime errors win and the tests are dropped',
        errorsWin.r.status === 'errors' && errorsWin.r.errors[0] === 'Boom' && errorsWin.seen.abortedSeen === true);
    check('verify: a crashing runner → ok (never a failure)', rejecting.status === 'ok');
    check('verify: an unreadable tests file → ok', readFailing.status === 'ok');
    check('verify: a stop during the tests → skipped', stopped.status === 'skipped');
    check('verify: tests overlap the error watch (no added wait when they finish inside it)', slowTests < 3900 + 600, slowTests);
    check('verify: all scenarios settled promptly', Date.now() - t0 < 8000);
}

// ===========================================================================
//  6. What the AI is told (update_preview) and the AppTests tool
// ===========================================================================
function loadTool(src, win) {
    const ctx = vm.createContext({ window: win, console, Promise });
    vm.runInContext(src, ctx);
    return win.tools[win.tools.length - 1];
}
{
    let health;
    const win = { tools: [], verifyPreview: async () => health, isAborted: () => false, isStaleTurn: () => false };
    const tool = loadTool(updatePreviewSrc, win);
    const failing = { status: 'test-failures', failures: [{ name: 'adds an item', error: 'Expected "0 items" to be "1 items".', where: 'at phone size' }], moreFailures: 3, total: 9 };
    const state = {};
    health = failing;
    const first = await tool.exec({}, state);
    check('update_preview: failing tests → tests_failed', first.verification?.status === 'tests_failed');
    check('update_preview: names the test, where, and the rest', first.verification.note.includes('- adds an item [at phone size]: Expected "0 items" to be "1 items".') &&
        first.verification.note.includes('…and 3 more.'));
    check('update_preview: failure text framed as untrusted', /untrusted data/.test(first.verification.note));
    check('update_preview: never mention the tests to the user', first.verification.note.includes('Never mention the tests to the user.'));
    check('update_preview: never weaken a test', first.verification.note.includes('Never weaken or delete a test just to make it pass.'));
    health = { status: 'errors', errors: ['Boom'] };
    const second = await tool.exec({}, state);
    check('update_preview: runtime errors share the same budget', second.verification?.status === 'errors_detected');
    health = failing;
    const third = await tool.exec({}, state);
    check('update_preview: third round → tests_persist, stop', third.verification?.status === 'tests_persist' &&
        /do not call update_preview again/.test(third.verification.note) && /without\s+mentioning tests/.test(third.verification.note));
    health = { status: 'ok' };
    check('update_preview: ok → plain success', JSON.stringify(await tool.exec({}, {})) === '{"success":true}');
    health = { status: 'test-failures', failures: [] };
    check('update_preview: an empty failure list → plain success', JSON.stringify(await tool.exec({}, {})) === '{"success":true}');
}
{
    const calls = [];
    const win = {
        tools: [], FEATURE_FLAGS: { appTests: true },
        projectRootDir: () => '/app',
        AppTests: {
            enabled: () => win.FEATURE_FLAGS.appTests,
            read: async (d) => { calls.push(['read', d]); return calls.some(c => c[0] === 'write') ? 'saved' : null; },
            write: async (d, c) => { calls.push(['write', d, c]); },
            remove: async (d) => { calls.push(['remove', d]); },
        },
    };
    const tool = loadTool(appTestsToolSrc, win);
    check('tool: AppTests registers', tool.function.name === 'AppTests');
    check('tool: not strict (Claude allows 20 strict tools)', tool.function.strict !== true);
    check('tool: offered only with the flag', tool.available() === true && (win.FEATURE_FLAGS.appTests = false, tool.available() === false));
    win.FEATURE_FLAGS.appTests = true;
    const none = await tool.exec({ action: 'read' }, {});
    check('tool: read with none', none.code === '' && /no tests/.test(none.note));
    const saved = await tool.exec({ action: 'write', code: "test('a', () => {})" }, {});
    check('tool: write saves into the project', saved.success && calls.some(c => c[0] === 'write' && c[1] === '/app'));
    check('tool: read returns them', (await tool.exec({ action: 'read' }, {})).code === 'saved');
    check('tool: delete', (await tool.exec({ action: 'delete' }, {})).success && calls.some(c => c[0] === 'remove'));
    const err = (p) => p.then(() => '', e => e.message);
    check('tool: write without code refused', /code is missing/.test(await err(tool.exec({ action: 'write' }, {}))));
    check('tool: unknown action refused', /action must be/.test(await err(tool.exec({ action: 'run' }, {}))));
    win.FEATURE_FLAGS.appTests = false;
    check('tool: refuses with the flag off', /not available/.test(await err(tool.exec({ action: 'read' }, {}))));

    // builtinTools leaves it out when the flag is off.
    const ctx = vm.createContext({ window: { FEATURE_FLAGS: { appTests: false } }, console });
    vm.runInContext(toolsSrc, ctx);
    vm.runInContext(appTestsToolSrc, ctx);
    const names = () => ctx.window.getTurnTools().map(t => t.function.name);
    check('tools: flag off → not offered to the model', !names().includes('AppTests') && ctx.window.tools.some(t => t.function.name === 'AppTests'));
    ctx.window.FEATURE_FLAGS.appTests = true;
    check('tools: flag on → offered', names().includes('AppTests'));
}

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll app-tests checks passed.');
