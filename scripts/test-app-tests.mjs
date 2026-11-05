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
    check('a check that did not run says nothing', label(call, { x: { error: 'Not run, because an earlier call in this reply failed' } }) === '');
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

// A Storage class like the browser's: methods and length on the prototype,
// so a reference the app kept still goes through them.
function storageClass() {
    const maps = new WeakMap();
    class Storage {
        constructor(map) { maps.set(this, map); }
        getItem(k) { const m = maps.get(this); return m.has(String(k)) ? m.get(String(k)) : null; }
        setItem(k, v) { maps.get(this).set(String(k), String(v)); }
        removeItem(k) { maps.get(this).delete(String(k)); }
        clear() { maps.get(this).clear(); }
        key(i) { return [...maps.get(this).keys()][i] ?? null; }
        get length() { return maps.get(this).size; }
    }
    return Storage;
}

function makeRuntimeEnv(src, { top = false, name = FRAME_NAME, before } = {}) {
    const posted = [];
    const listeners = {};
    const realLocal = new Map([['existing', 'kept']]);
    const realKv = new Map([['seed', 'from-real']]);
    const real = { ai: 0, kvSets: 0, fsWrites: 0, signOuts: 0, workerWrites: 0, shares: 0, sent: 0, fetches: [] };
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
        ai: {
            chat: () => { real.ai++; return Promise.resolve('REAL'); }, txt2img: () => { real.ai++; return Promise.resolve(null); }, listModels: () => Promise.resolve(['m']),
            // As in puter.js: free reads hang on txt2speech, and convo is a billed live session.
            txt2speech: Object.assign(() => { real.ai++; return Promise.resolve(null); }, { listVoices: () => Promise.resolve(['v1']), listEngines: () => Promise.resolve(['e1']) }),
            convo: () => { real.ai++; return Promise.resolve({}); },
        },
        kv: {
            get: (k) => Promise.resolve(realKv.has(k) ? realKv.get(k) : null),
            set: () => { real.kvSets++; return Promise.resolve(true); },
            del: () => { real.kvSets++; return Promise.resolve(true); },
            list: (p, withValues) => Promise.resolve([...realKv].map(([key, value]) => (withValues ? { key, value } : key))),
            // As in puter.js: clear is its own copy of the real flush.
            flush: () => { real.kvSets++; realKv.clear(); return Promise.resolve(true); },
            clear: () => { real.kvSets++; realKv.clear(); return Promise.resolve(true); },
            share: () => { real.shares++; return Promise.resolve({}); },
            unshare: () => { real.shares++; return Promise.resolve({}); },
            setAuthToken() { return 'internal'; },
        },
        fs: {
            write: () => { real.fsWrites++; return Promise.resolve({}); }, read: () => Promise.resolve('file'),
            share: () => { real.shares++; return Promise.resolve({}); }, unshare: () => { real.shares++; return Promise.resolve({}); },
        },
        auth: { signIn: () => Promise.resolve({}), signOut: () => { real.signOuts++; } },
        workers: { exec: (u, init) => { if (init && init.method && init.method !== 'GET') real.workerWrites++; return Promise.resolve({ ok: true }); }, create: () => Promise.resolve({}) },
        hosting: { create: () => Promise.resolve({}) },
        email: { send: () => { real.sent++; return Promise.resolve({}); }, sendTransactional: () => { real.sent++; return Promise.resolve({}); }, list: () => Promise.resolve([]) },
        notifications: { notify: () => { real.sent++; return Promise.resolve({}); }, status: () => Promise.resolve('on') },
        teams: { resetPassword: () => { real.sent++; return Promise.resolve({}); }, list: () => Promise.resolve([]) },
    };
    const dom = makeDom(g);
    if (before) before(g, { realLocal });
    vm.createContext(g);
    vm.runInContext(src, g);
    // Inside the context, `window` is the context's own view of g, not g.
    const self = vm.runInContext('window', g);
    const deliver = (data, origin = BUILDER, source = g.parent) =>
        (listeners.message || []).forEach(fn => fn({ data, origin, source }));
    const raise = (type, ev) => (listeners[type] || []).forEach(fn => fn(ev));
    return { g, self, posted, listeners, deliver, raise, real, realLocal, realKv, dom };
}

const realKvOf = (env) => env.realKv;

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

    // A reference to the real store kept before this file ran (it is
    // deferred): its writes stay in memory too, and it sees the layer.
    {
        let kept = null;
        const e2 = makeRuntimeEnv(src, {
            before: (g2, { realLocal }) => {
                g2.Storage = storageClass();
                g2.localStorage = new g2.Storage(realLocal);
                kept = g2.localStorage;
            },
        });
        kept.setItem('todos', 'TEST');
        kept.removeItem('existing');
        check(`[${label}] a kept localStorage reference writes to memory only`,
            e2.realLocal.get('existing') === 'kept' && !e2.realLocal.has('todos'), [...e2.realLocal]);
        check(`[${label}] a kept reference and the layer agree`,
            kept.getItem('todos') === 'TEST' && e2.g.localStorage.getItem('todos') === 'TEST' && kept.getItem('existing') === null &&
            kept.length === 1 && kept.key(0) === 'todos');
        e2.g.localStorage.setItem('b', '2');
        kept.clear();
        check(`[${label}] clear through a kept reference keeps the real data`,
            kept.length === 0 && e2.g.localStorage.getItem('b') === null && e2.realLocal.get('existing') === 'kept');
        {
            // The layer is a Storage to the app, like the real one.
            const ls = e2.g.localStorage;
            ls.setItem('mine', 'M');
            let threw = '';
            let str = '';
            try { str = String(ls); } catch (e) { threw = e.message; }
            check(`[${label}] the layer behaves like a Storage object`,
                ls instanceof e2.g.Storage && ls.hasOwnProperty('mine') === true && ls.hasOwnProperty('nope') === false &&
                Object.prototype.hasOwnProperty.call(ls, 'mine') && typeof ls.toString === 'function' && !threw && str.length > 0 &&
                'length' in ls && 'mine' in ls && !('nope' in ls) &&
                e2.g.Storage.prototype.getItem.call(ls, 'mine') === 'M' && e2.g.Storage.prototype.setItem.call(ls, 'viaProto', '1') === undefined &&
                ls.getItem('viaProto') === '1' && !e2.realLocal.has('viaProto') && !e2.realLocal.has('mine'), { threw });
            ls.clear();
        }
        const other = new e2.g.Storage(new Map([['x', '1']]));
        other.setItem('y', '2');
        check(`[${label}] a store that isn't overlaid works as before`, other.getItem('y') === '2' && other.length === 2);
    }

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
    {
        // Patterns as puter.js sends them: a prefix, with or without a
        // trailing *, and the { pattern, returnValues } form.
        await kv.set('todo:1', 'milk');
        await kv.set('todos', 'x');
        const plain = await kv.list('todo:');
        const star = await kv.list(' todo:* ');
        const opts = await kv.list({ pattern: 'todo:', returnValues: true });
        const withConfig = await kv.list('todo:', { headers: {} });
        check(`[${label}] kv list matches a pattern as a prefix`,
            JSON.stringify(plain) === '["todo:1"]' && JSON.stringify(star) === '["todo:1"]', { plain, star });
        check(`[${label}] kv list({ pattern, returnValues }) sees the test's writes`,
            opts.length === 1 && opts[0].key === 'todo:1' && opts[0].value === 'milk', opts);
        check(`[${label}] kv list with request options still lists keys`, JSON.stringify(withConfig) === '["todo:1"]', withConfig);
        await kv.del('todo:1');
        await kv.del('todos');
    }
    await kv.flush();
    check(`[${label}] kv flush empties the view only`, (await kv.list()).length === 0 && real.kvSets === 0);
    await kv.set('z', 1);
    await kv.clear();
    check(`[${label}] kv clear empties the view only, never the real store`,
        (await kv.list()).length === 0 && real.kvSets === 0 && env.g.puter.kv === kv && realKvOf(env).get('seed') === 'from-real');
    check(`[${label}] kv and fs sharing refused`,
        /turned off/.test(await kv.share('todo:', 'someone').then(() => 'resolved', e => e.message)) &&
        /turned off/.test(await kv.unshare('h').then(() => 'resolved', e => e.message)) &&
        /turned off/.test(await g.puter.fs.share('/a', 'someone').then(() => 'resolved', e => e.message)) &&
        /turned off/.test(await g.puter.fs.unshare('/a').then(() => 'resolved', e => e.message)) && real.shares === 0);
    check(`[${label}] kv keeps puter.js internals`, kv.setAuthToken() === 'internal');

    // AI: placeholders, no cost.
    const reply = await g.puter.ai.chat('hi');
    check(`[${label}] ai.chat answers a placeholder`, String(reply).includes('placeholder') && reply.message.content === String(reply) && real.ai === 0);
    const streamed = await g.puter.ai.chat('hi', { stream: true });
    const part = await streamed.next();
    check(`[${label}] ai.chat streams a placeholder`, part.value.text.includes('placeholder') && (await streamed.next()).done === true);
    check(`[${label}] ai.txt2img gives a placeholder image`, String((await g.puter.ai.txt2img('x')).src).startsWith('data:image') && real.ai === 0);
    check(`[${label}] free AI calls pass through`, (await g.puter.ai.listModels())[0] === 'm');
    check(`[${label}] ai.txt2speech is faked and keeps its voice list`,
        (await g.puter.ai.txt2speech('hi')).muted === true && (await g.puter.ai.txt2speech.listVoices())[0] === 'v1' &&
        (await g.puter.ai.txt2speech.listEngines())[0] === 'e1' && real.ai === 0);
    check(`[${label}] a live AI conversation is refused`, /turned off/.test(await g.puter.ai.convo({}).then(() => 'resolved', e => e.message)) && real.ai === 0);

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
    {
        // XMLHttpRequest, sendBeacon and form posts: refused like fetch.
        const sent = [];
        const e3 = makeRuntimeEnv(src, {
            before: (g2) => {
                g2.XMLHttpRequest = class {
                    constructor() { this.readyState = 0; this.status = 0; this.events = []; }
                    open(m, u) { this.m = m; this.u = u; this.readyState = 1; }
                    send() { sent.push(this.m + ' ' + this.u); }
                    addEventListener() {}
                    dispatchEvent(e) { this.events.push(e.type + ':' + this.readyState); return true; }
                };
                g2.navigator = { sendBeacon: (u) => { sent.push('BEACON ' + u); return true; } };
                g2.HTMLFormElement = class { constructor(method, action) { this.method = method; this.action = action; } submit() { sent.push('FORM ' + this.action); } };
            },
        });
        const xhr = new e3.g.XMLHttpRequest();
        xhr.open('POST', 'https://api.puter.work/items');
        xhr.send('{}');
        await sleep(10);
        check(`[${label}] worker writes refused (XMLHttpRequest), as a network error`,
            sent.length === 0 && xhr.events.join() === 'readystatechange:4,error:4,loadend:4', { sent, events: xhr.events });
        const sync = new e3.g.XMLHttpRequest();
        sync.open('DELETE', 'https://api.puter.work/items/1', false);
        let threw = '';
        try { sync.send(); } catch (e) { threw = e.message; }
        check(`[${label}] a synchronous worker write throws`, /turned off/.test(threw) && sent.length === 0);
        const get = new e3.g.XMLHttpRequest();
        get.open('POST', 'https://api.puter.work/items');
        get.open('GET', 'https://api.puter.work/items');
        get.send();
        const other = new e3.g.XMLHttpRequest();
        other.open('POST', 'https://example.com/x');
        other.send();
        check(`[${label}] worker reads and other sites pass (XMLHttpRequest)`, sent.join() === 'GET https://api.puter.work/items,POST https://example.com/x', sent);
        sent.length = 0;
        check(`[${label}] worker beacons refused, others sent`,
            e3.g.navigator.sendBeacon('https://api.puter.work/log') === false && e3.g.navigator.sendBeacon('https://example.com/log') === true && sent.join() === 'BEACON https://example.com/log', sent);
        sent.length = 0;
        new e3.g.HTMLFormElement('post', 'https://api.puter.work/subscribe').submit();
        new e3.g.HTMLFormElement('get', 'https://api.puter.work/search').submit();
        check(`[${label}] a form posted to a worker is refused, a GET form isn't`, sent.join() === 'FORM https://api.puter.work/search', sent);
    }
    {
        // The clipboard and fullscreen: the frame may not use them, the
        // visible preview may, so they succeed here without touching anything.
        let userClipboard = 'USER';
        let fullscreens = 0;
        const e5 = makeRuntimeEnv(src, {
            before: (g2) => {
                g2.navigator = { clipboard: { writeText: (t) => { userClipboard = t; return Promise.resolve(); }, readText: () => Promise.resolve(userClipboard) } };
                g2.Element = class { requestFullscreen() { fullscreens++; return Promise.reject(new Error('Disallowed by permissions policy')); } };
                g2.Document = class { exitFullscreen() { return Promise.reject(new Error('Not in fullscreen')); } };
            },
        });
        await e5.g.navigator.clipboard.writeText('pa55word');
        check(`[${label}] the app's copy lands on the frame's own clipboard`,
            (await e5.g.navigator.clipboard.readText()) === 'pa55word' && userClipboard === 'USER', { userClipboard });
        const fsResult = await new e5.g.Element().requestFullscreen().then(() => 'ok', (e) => e.message);
        const exitResult = await new e5.g.Document().exitFullscreen().then(() => 'ok', (e) => e.message);
        check(`[${label}] full-screen requests succeed without going full screen`, fsResult === 'ok' && exitResult === 'ok' && fullscreens === 0);
        const e7 = makeRuntimeEnv(src, {
            before: (g2) => { g2.AudioContext = class { resume() { return new Promise(() => {}); } }; g2.webkitAudioContext = g2.AudioContext; },
        });
        const resumed = await Promise.race([new e7.g.AudioContext().resume().then(() => 'resolved'), sleep(100).then(() => 'hung')]);
        check(`[${label}] AudioContext.resume() resolves without a real click`, resumed === 'resolved');
        {
            // BroadcastChannel: what the test frame says stays in the frame
            // (the visible preview is on the same origin).
            const outside = [];
            let early = null;
            const e8 = makeRuntimeEnv(src, {
                before: (g2) => {
                    g2.EventTarget = EventTarget; g2.MessageEvent = MessageEvent; g2.structuredClone = structuredClone;
                    g2.BroadcastChannel = class extends EventTarget { constructor(n) { super(); this.name = n; } postMessage(d) { outside.push(this.name + ':' + JSON.stringify(d)); } close() {} };
                    early = new g2.BroadcastChannel('sync');
                },
            });
            const a = new e8.g.BroadcastChannel('sync');
            const b = new e8.g.BroadcastChannel('sync');
            const other = new e8.g.BroadcastChannel('other');
            const heard = [];
            b.onmessage = (ev) => heard.push('b:' + ev.data.todo);
            b.addEventListener('message', (ev) => heard.push('b2:' + ev.data.todo));
            other.onmessage = (ev) => heard.push('other');
            a.onmessage = () => heard.push('a heard itself');
            a.postMessage({ todo: 'milk' });
            early.postMessage({ todo: 'eggs' });
            await sleep(10);
            b.close();
            a.postMessage({ todo: 'late' });
            await sleep(10);
            check(`[${label}] BroadcastChannel messages stay inside the test frame`,
                outside.length === 0 && heard.join() === 'b:milk,b2:milk', { outside, heard });
        }
        const e6 = makeRuntimeEnv(src, { before: (g2) => { g2.navigator = {}; } });
        await e6.g.navigator.clipboard.writeText('x');
        check(`[${label}] a page without navigator.clipboard gets the frame's own`, (await e6.g.navigator.clipboard.readText()) === 'x');
    }
    check(`[${label}] worker writes refused (workers.exec)`, /turned off/.test(await reason(g.puter.workers.exec('https://api.puter.work/x', { method: 'DELETE' }))) && real.workerWrites === 0);
    check(`[${label}] email, notifications and team changes refused`,
        /turned off/.test(await reason(g.puter.email.send({ to: 'a@b.c' }))) && /turned off/.test(await reason(g.puter.email.sendTransactional('a@b.c', 's', 'b'))) &&
        /turned off/.test(await reason(g.puter.notifications.notify({ title: 'Hi' }))) && /turned off/.test(await reason(g.puter.teams.resetPassword('x'))) &&
        real.sent === 0);
    check(`[${label}] reading email, notifications and teams passes`,
        Array.isArray(await g.puter.email.list()) && (await g.puter.notifications.status()) === 'on' && Array.isArray(await g.puter.teams.list()));
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
    const inline = body.appendChild(new El('button', { id: 'inline', _text: 'Inline' }));
    inline.addEventListener('click', () => env.raise('error', { message: 'Uncaught TypeError: x', filename: 'https://app.puter.site/?__pv=123_abc', lineno: 9, target: env.self }));
    const boom = body.appendChild(new El('button', { id: 'boom', _text: 'Boom' }));
    boom.addEventListener('click', () => env.raise('error', { message: 'Uncaught Error: kaboom', filename: 'https://app.puter.site/app.js', lineno: 3, target: env.self }));
    body.appendChild(new El('button', { id: 'gone', hidden: true }));
    const slider = body.appendChild(new El('input', { id: 'tip', type: 'range', value: '10', tabIndex: 0 }));
    slider.addEventListener('input', () => { count.textContent = 'tip ' + slider.value; });
    // An SVG element: no click() of its own.
    const cell = body.appendChild(new El('rect', { id: 'cell' }));
    cell.click = undefined;
    cell.addEventListener('click', () => { count.textContent = 'cell clicked'; });

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
        "test('slider', async () => { await fill('#tip', 25); expect(await text('#count')).toBe('tip 25'); });",
        "test('inline error', async () => { await click('#inline'); });",
        "test('svg click', async () => { await click('#cell'); expect(await text('#count')).toBe('cell clicked'); });",
        "test('other page', { page: 'about.html' }, async () => {});",
        "test('phone', { mobile: true }, async () => {});",
    ].join('\n'));
    const by = Object.fromEntries((done?.results || []).map(r => [r.name, r]));
    check(`[${label}] ack goes to the builder's origin only`, env.posted.every(p => p.origin === BUILDER) && env.posted[0].msg.type === 'puter-tests-ack');
    check(`[${label}] plan announced before running`, env.posted.some(p => p.msg.type === 'puter-tests-plan' && p.msg.total === 11));
    check(`[${label}] passing test passes`, by['adds an item']?.passed === true, by['adds an item']);
    check(`[${label}] assertion failure explained with its line`, /Expected "1 items" to be "9 items"\. \(tests line 8\)/.test(by['wrong count']?.error), by['wrong count']);
    check(`[${label}] an app error during a test fails it`, /threw an error during this test: Uncaught Error: kaboom \(app\.js:3\)/.test(by['app error']?.error), by['app error']);
    check(`[${label}] a hidden element is explained`, /exists but is hidden/.test(by['hidden element']?.error), by['hidden element']);
    check(`[${label}] a hung test times out`, /Timed out after 0\.2s|Timed out after 0\.1s/.test(by.hangs?.error), by.hangs);
    check(`[${label}] a bad selector fails at once`, /Invalid CSS selector/.test(by['bad selector']?.error), by['bad selector']);
    check(`[${label}] an SVG element is clicked`, by['svg click']?.passed === true, by['svg click']);
    check(`[${label}] fill sets a slider`, by.slider?.passed === true, by.slider);
    check(`[${label}] an inline script's error names the page, not its cache-buster`, /\(index\.html:9\)$/.test(by['inline error']?.error || ''), by['inline error']);
    check(`[${label}] only this page's tests ran`, !by['other page'] && !by.phone && done.results.length === 9);
    check(`[${label}] other pages and sizes reported as groups`,
        JSON.stringify(done.groups) === JSON.stringify([{ page: '', mobile: false }, { page: 'about.html', mobile: false }, { page: '', mobile: true }]), done.groups);
    check(`[${label}] each result posted as it finished`, env.posted.filter(p => p.msg.type === 'puter-tests-result').length === 9);
    check(`[${label}] a resend of the same run is only acked`, (() => {
        const before = env.posted.length;
        env.deliver({ type: 'puter-tests-run', runId: done.runId, code: 'x' });
        return env.posted.length === before + 1 && env.posted[before].msg.type === 'puter-tests-ack';
    })());
    env.deliver({ type: 'puter-tests-run', runId: 'second', code: 'test("x", () => {})' });
    await sleep(20);
    check(`[${label}] one run per page load`, !env.posted.some(p => p.msg.runId === 'second'));

    // press() sends what a real keyboard sends.
    {
        const e4 = makeRuntimeEnv(src);
        const { El: El4, body: body4 } = e4.dom;
        const seen = [];
        const pad = body4.appendChild(new El4('div', { id: 'pad', tabIndex: 0 }));
        pad.addEventListener('keydown', (e) => seen.push(JSON.stringify(e.key) + '|' + e.code + '|' + e.keyCode + '|' + e.which));
        const btn = body4.appendChild(new El4('button', { id: 'go', tabIndex: 0 }));
        let clicks = 0;
        btn.addEventListener('click', () => clicks++);
        const keys = await runSuite(e4, [
            "test('keys', async () => { for (const k of [' ', 'Space', '1', 'a', 'Enter', 'ArrowLeft', '+', 'Esc']) await press('#pad', k); });",
            "test('space clicks a button', async () => { await press('#go', 'Space'); });",
        ].join('\n'));
        check(`[${label}] press sends real key, code and keyCode`, keys?.results?.[0]?.passed === true && seen.join(' ') ===
            '" "|Space|32|32 " "|Space|32|32 "1"|Digit1|49|49 "a"|KeyA|65|65 "Enter"|Enter|13|13 "ArrowLeft"|ArrowLeft|37|37 "+"|Equal|187|187 "Escape"|Escape|27|27', seen);
        check(`[${label}] the space bar clicks a button`, keys?.results?.[1]?.passed === true && clicks === 1, { clicks });
    }

    // A test that runs out of time stops where it is, instead of clicking
    // on through the next test (and its un-awaited steps don't fail it).
    {
        const e9 = makeRuntimeEnv(src);
        const { El: El9, body: body9 } = e9.dom;
        let clicks = 0;
        const btn = body9.appendChild(new El9('button', { id: 'inc', tabIndex: 0 }));
        btn.addEventListener('click', () => { clicks++; btn.textContent = String(clicks); });
        const r = await runSuite(e9, [
            "test('slow', { timeout: 200 }, async () => { for (let i = 0; i < 40; i++) { await click('#inc'); await sleep(20); } });",
            "test('one click adds one', async () => { const before = +(await text('#inc')); await click('#inc'); await sleep(400); expect(+(await text('#inc')) - before).toBe(1); });",
            "test('left a step running', async () => { waitFor('#never', { timeout: 300 }); });",
            "test('after it', async () => { await sleep(500); });",
        ].join('\n'));
        const by9 = Object.fromEntries((r?.results || []).map(x => [x.name, x]));
        check(`[${label}] a timed-out test fails`, /Timed out/.test(by9.slow?.error || ''), by9.slow);
        check(`[${label}] a timed-out test stops clicking into the next one`, by9['one click adds one']?.passed === true, by9['one click adds one']);
        check(`[${label}] a step left running by a finished test doesn't fail the next`, by9['after it']?.passed === true, by9['after it']);
        const settled = clicks;
        await sleep(300);
        check(`[${label}] nothing keeps clicking after the run`, clicks === settled, { clicks, settled });
    }
    {
        // A step the test didn't await fails while it runs: the browser
        // reports it as an unhandled rejection, which is the test's mistake,
        // not the app's. (The stub has no event loop hook for it, so a button
        // hands the step's error over the way the browser would.)
        const e10 = makeRuntimeEnv(src);
        const { El: El10, body: body10 } = e10.dom;
        const raiser = body10.appendChild(new El10('button', { id: 'raise', tabIndex: 0 }));
        raiser.addEventListener('click', () => e10.raise('unhandledrejection', { reason: raiser.err }));
        const r = await runSuite(e10, [
            "test('forgot await', async () => { waitFor('#never', { timeout: 50 }).catch(e => { $('#raise').err = e; }); await sleep(150); await click('#raise'); });",
            "test('app rejects', async () => { $('#raise').err = new Error('db down'); await click('#raise'); });",
        ].join('\n'));
        const [forgot, appRejects] = r?.results || [];
        check(`[${label}] an un-awaited step's failure is the test's, not the app's`,
            /did not await failed: Timed out after 0\.1s waiting for "#never"/.test(forgot?.error || '') && !/app threw/.test(forgot?.error || ''), forgot);
        check(`[${label}] the app's own unhandled rejection is still the app's`, /app threw an error during this test: Unhandled promise rejection: db down/.test(appRejects?.error || ''), appRejects);
    }

    {
        // text() reads the element on screen first, a hidden one only if
        // that's all there is.
        const e11 = makeRuntimeEnv(src);
        const { El: El11, body: body11 } = e11.dom;
        body11.appendChild(new El11('h2', { _text: 'Settings', hidden: true }));
        body11.appendChild(new El11('h2', { _text: 'Your cart' }));
        body11.appendChild(new El11('p', { id: 'note', _text: 'Saved', hidden: true }));
        const r = await runSuite(e11, [
            "test('visible first', async () => { expect(await text('h2')).toBe('Your cart'); });",
            "test('hidden when that is all', async () => { expect(await text('#note')).toBe('Saved'); });",
        ].join('\n'));
        check(`[${label}] text() prefers the element on screen`, r?.results?.[0]?.passed === true, r?.results?.[0]);
        check(`[${label}] text() still reads a hidden element`, r?.results?.[1]?.passed === true, r?.results?.[1]);
    }

    {
        // Each test sees its own dialogs and AI reply; a reply set at the
        // top level holds for every test.
        const e12 = makeRuntimeEnv(src);
        const { El: El12, body: body12 } = e12.dom;
        const save = body12.appendChild(new El12('button', { id: 'save', tabIndex: 0 }));
        save.addEventListener('click', () => e12.g.alert('Saved'));
        const ask = body12.appendChild(new El12('button', { id: 'ask', tabIndex: 0 }));
        ask.addEventListener('click', async () => { ask.textContent = String(await e12.g.puter.ai.chat('hi')); });
        e12.g.alert('Welcome');
        const r = await runSuite(e12, [
            "setAIReply('TOP');",
            "test('save', async () => { await click('#save'); expect(dialogs.map(d => d.message)).toEqual(['Welcome', 'Saved']); });",
            "test('own dialogs', async () => { await click('#save'); expect(dialogs).toHaveLength(1); });",
            "test('own reply', async () => { setAIReply('MINE'); await click('#ask'); expect(await text('#ask')).toBe('MINE'); });",
            "test('top reply again', async () => { await click('#ask'); expect(await text('#ask')).toBe('TOP'); });",
        ].join('\n'));
        const by12 = Object.fromEntries((r?.results || []).map(x => [x.name, x]));
        check(`[${label}] the first test sees dialogs from page load`, by12.save?.passed === true, by12.save);
        check(`[${label}] each test sees only its own dialogs`, by12['own dialogs']?.passed === true, by12['own dialogs']);
        check(`[${label}] setAIReply in a test holds for that test, the top-level one for the rest`,
            by12['own reply']?.passed === true && by12['top reply again']?.passed === true, [by12['own reply'], by12['top reply again']]);
    }

    {
        // A button inside a disabled fieldset is disabled, though its own
        // property says otherwise.
        const e13 = makeRuntimeEnv(src);
        const { El: El13, body: body13 } = e13.dom;
        const inFieldset = body13.appendChild(new El13('button', { id: 'pay', tabIndex: 0 }));
        inFieldset.matches = (sel) => sel === ':disabled';
        const r = await runSuite(e13, "test('pay', async () => { await click('#pay', { timeout: 100 }); });");
        check(`[${label}] a control in a disabled fieldset is reported disabled`, /be enabled \(it is disabled\)/.test(r?.results?.[0]?.error || ''), r?.results?.[0]);
    }

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
    // The runner compiles the tests with every API name as a parameter, so
    // redeclaring one is a syntax error there; the save-time check must agree.
    check('core: redeclaring an API name is refused at save, as the runner refuses it',
        /already been declared/.test(core.syntaxError("const sleep = (ms) => new Promise(r => setTimeout(r, ms));\ntest('x', async () => { await sleep(1); });") || ''));
    {
        const m = runtimeSrc.match(/var API_NAMES = (\[[^\]]*\]);/);
        const runnerNames = m ? new Function('return ' + m[1])() : null;
        check('core: the save-time check uses the runner\'s API names', JSON.stringify(runnerNames) === JSON.stringify([...core.API_NAMES]), { runnerNames, builder: core.API_NAMES });
    }
    const merged = core.mergeRetry({ results: [{ name: 'a', passed: false, error: 'e' }, { name: 'b', passed: false, error: 'e' }] },
        { results: [{ name: 'a', passed: true }, { name: 'b', passed: false, error: 'e2' }] });
    check('core: a test passing on retry counts as passed', merged.results[0].passed === true && merged.results[1].passed === false);
    {
        // Two tests with one name: the one that passes doesn't stand in for
        // the one that fails both times.
        const run = () => ({ results: [{ name: 'adds', passed: true }, { name: 'adds', passed: false, error: 'e' }] });
        const twin = core.mergeRetry(run(), run());
        check('core: a repeated name can\'t hide a test that fails both times', twin.results[1].passed === false,
            twin.results);
        const shorter = core.mergeRetry({ results: [{ name: 'a', passed: false, error: 'e' }, { name: 'b', passed: false, error: 'e' }] },
            { results: [{ name: 'a', passed: false, error: 'e' }] });
        check('core: a test the retry never reached keeps its first result', shorter.results[1].passed === false && shorter.results[1].error === 'e');
    }
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
{
    // Mid-run, and never from inside the blur itself: refocusing while the
    // browser is still moving focus into the frame left the composer looking
    // focused while Chrome sent the user's keys to the hidden app.
    let inBlur = null, soonAfter = null;
    const env = makeBuilderEnv({
        scenario: (f) => ({
            onRun(msg) {
                f.reply({ type: 'puter-tests-ack', runId: msg.runId });
                setTimeout(() => {
                    env.document.activeElement = f;
                    env.fire('blur', {});
                    inBlur = env.document.activeElement === f;
                    setTimeout(() => {
                        soonAfter = env.document.activeElement === env.composer;
                        f.reply({ type: 'puter-tests-done', runId: msg.runId, results: [{ name: 'a', passed: true }] });
                    }, 60);
                }, 10);
            },
        }),
    });
    await env.AT.run({ baseUrl: BASE, code: "test('x', () => {})" });
    check('builder: focus is not taken back inside the blur event', inBlur === true);
    check('builder: focus goes back to the composer while the tests still run', soonAfter === true);
}

{
    // The user moved into the visible preview to try their app (no focusin
    // reaches the builder for that): focus a test takes goes back there, not
    // to the composer, where their typing would become a chat message.
    let preview = null, afterSteal = null;
    const env = makeBuilderEnv({
        scenario: (f) => ({
            onRun(msg) {
                f.reply({ type: 'puter-tests-ack', runId: msg.runId });
                setTimeout(() => {
                    preview = { id: 'preview', isConnected: true, focus() { env.document.activeElement = this; } };
                    env.document.activeElement = preview;
                    env.fire('blur', {});
                    setTimeout(() => {
                        env.document.activeElement = f;
                        env.fire('blur', {});
                        setTimeout(() => {
                            afterSteal = env.document.activeElement;
                            f.reply({ type: 'puter-tests-done', runId: msg.runId, results: [{ name: 'a', passed: true }] });
                        }, 80);
                    }, 30);
                }, 10);
            },
        }),
    });
    await env.AT.run({ baseUrl: BASE, code: "test('x', () => {})" });
    check('builder: focus taken from the visible preview goes back to the preview', afterSteal === preview && env.document.activeElement === preview,
        { afterSteal: afterSteal && afterSteal.id, end: env.document.activeElement && env.document.activeElement.id });
}
{
    // After a steal was given back, the user leaves the composer: the end of
    // the run doesn't pull them back into it (on a phone that raises the
    // keyboard).
    const env = makeBuilderEnv({
        scenario: (f) => ({
            onRun(msg) {
                f.reply({ type: 'puter-tests-ack', runId: msg.runId });
                setTimeout(() => {
                    env.document.activeElement = f;
                    env.fire('blur', {});
                    setTimeout(() => {
                        env.document.activeElement = env.document.body;
                        f.reply({ type: 'puter-tests-done', runId: msg.runId, results: [{ name: 'a', passed: true }] });
                    }, 80);
                }, 10);
            },
        }),
    });
    await env.AT.run({ baseUrl: BASE, code: "test('x', () => {})" });
    check('builder: focus the user moved away stays away at the end of the run', env.document.activeElement === env.document.body,
        env.document.activeElement && env.document.activeElement.id);
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
function makeVerify({ errorsAfterLoad = [], tests, readFails = false, readHangs = false, readDelay = 0, abortAfterMs = 0 } = {}) {
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
            read: async () => {
                if (readHangs) return new Promise(() => {});
                if (readDelay) await sleep(readDelay);
                if (readFails) throw new Error('boom');
                return tests === null ? null : 'test("x", () => {})';
            },
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
const FAIL_FOR_READ = { after: 100, result: { status: 'failed', total: 1, failures: [{ name: 'a', error: 'e', where: '' }], moreFailures: 0 } };
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
{
    // A read of the tests that never comes back doesn't hold update_preview
    // (and the turn) forever, and a slow one doesn't hold up the error watch.
    const t0 = Date.now();
    const [hung, slowRead] = await Promise.all([
        (async () => { const s = Date.now(); const r = await makeVerify({ tests: FAIL_FOR_READ, readHangs: true }).win.verifyPreview({}); return { r, ms: Date.now() - s }; })(),
        (async () => { const s = Date.now(); const v = makeVerify({ tests: { after: 1, result: { status: 'passed' } }, readDelay: 2500 }); const r = await v.win.verifyPreview({}); return { r, ms: Date.now() - s, runs: v.seen.runs }; })(),
    ]);
    check('verify: a tests read that never settles → ok, within the cap', hung.r.status === 'ok' && hung.ms < 5000 + 900, hung);
    check('verify: a slow tests read overlaps the error watch', slowRead.r.status === 'ok' && slowRead.runs === 1 && slowRead.ms < 3000 + 900, slowRead);
    check('verify: read checks settled promptly', Date.now() - t0 < 7000);
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
    {
        // The description names AppTests only while the tool is offered.
        const describe = (appTests) => loadTool(updatePreviewSrc, { tools: [], FEATURE_FLAGS: { appTests } }).function.description;
        check('update_preview: description mentions the tests with the flag on', describe(true).includes('hidden tests (AppTests)'));
        check('update_preview: description with the flag off is the one from before tests',
            !describe(false).includes('AppTests') && describe(false).includes('watches the running app for runtime errors. If the result contains'));
    }
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
    check('tool: tells the AI device features are not available', /camera, microphone, location and popups are not available/.test(appTestsToolSrc));
    check('tool: tells the AI IndexedDB and cookies are not protected', /IndexedDB and cookies are NOT protected/.test(appTestsToolSrc));
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
