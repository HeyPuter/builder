import fs from 'node:fs';
import vm from 'node:vm';

// ---- Build notifications ------------------------------------------------------
// js/build-notify.js: the offer on a project's first build (only where the
// browser can show them and doesn't block them, once in a browser, ever,
// never after the switch was used, after another offer's toast has gone, and
// only while that build runs), what Turn
// on does (the browser's prompt inside the click), the notification when a
// build ends while the user is away (at once, from the page, or from the
// worker where a page can't show one), a tap, which opens its project like the
// sidebar does, and the Settings switch. Runs the REAL module with a fake
// Notification, worker, toasts, storage and clock, and the REAL worker's
// notificationclick handler. Then text-asserts the wiring.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const SRC = read('../src/js/build-notify.js');
const SW_SRC = read('../src/sw.js');
const flush = async () => { for (let i = 0; i < 10; i++) await new Promise((r) => setImmediate(r)); };

function memoryStorage(seed = {}) {
    const m = new Map(Object.entries(seed));
    return {
        map: m,
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { m.set(k, String(v)); },
        removeItem: (k) => { m.delete(k); },
    };
}
const blocked = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('SecurityError'); },
    removeItem() { throw new Error('SecurityError'); },
};

function setup({
    permission = 'default', answer = 'granted', storage = memoryStorage(), api = true, framed = false,
    pageCanShow = true, worker = true, callbackOnly = false,
    chats = [{ id: 'chat_1_a', title: 'Pomodoro Timer' }], current = 'chat_1_a',
} = {}) {
    const calls = { ask: 0, shown: [], workerShown: [], toast: [], track: [], load: [], confirm: 0, startMessages: 0 };
    const state = { permission, otherOffer: false, visible: 'visible', focused: true, confirmAnswer: true, switch: null, note: null, windowFocus: 0 };

    let now = 0, nextId = 1;
    const timers = [];
    const setTimeoutFake = (fn, ms) => { const id = nextId++; timers.push({ id, at: now + ms, fn }); return id; };
    const clearTimeoutFake = (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); };
    function advance(ms) {
        const end = now + ms;
        for (;;) {
            timers.sort((a, b) => a.at - b.at);
            if (!timers.length || timers[0].at > end) break;
            const t = timers.shift();
            now = t.at;
            t.fn();
        }
        now = end;
    }

    class FakeNotification {
        constructor(title, options) {
            // Android: only a worker may show one.
            if (!pageCanShow) throw new TypeError("Failed to construct 'Notification': Illegal constructor.");
            this.title = title;
            this.options = options;
            this.closed = false;
            calls.shown.push(this);
        }
        close() { this.closed = true; }
        static get permission() { return state.permission; }
        static requestPermission(cb) {
            calls.ask++;
            state.permission = answer;
            if (callbackOnly) { setImmediate(() => cb(answer)); return undefined; }
            return Promise.resolve(answer);
        }
    }

    const swListeners = {};
    const reg = { showNotification: (title, options) => { calls.workerShown.push({ title, options }); return Promise.resolve(); } };
    const navigator = worker ? {
        serviceWorker: {
            getRegistration: () => Promise.resolve(reg),
            addEventListener: (t, fn) => { (swListeners[t] = swListeners[t] || []).push(fn); },
            startMessages: () => { calls.startMessages++; },
        },
    } : {};

    const document = {
        __isDocument: true,
        get visibilityState() { return state.visible; },
        hasFocus: () => state.focused,
        querySelector: (sel) => (sel === '.toast:not(.toast-hide) .toast-action' && state.otherOffer ? {} : null),
    };

    // jQuery, for the switch: the delegated click, and the in-place update.
    const handlers = [];
    const $ = (arg) => {
        if (arg && arg.__isDocument) return { on: (type, sel, fn) => handlers.push({ type, sel, fn }) };
        if (arg === '.build-notify-switch') {
            const sw = {
                get length() { return state.switch ? 1 : 0; },
                attr(k, v) { state.switch[k] = v; return sw; },
                prop(k, v) { state.switch[k] = v; return sw; },
            };
            return sw;
        }
        if (arg === '.settings-notify-state') return { text: (t) => { state.note = t; } };
        return { length: 0 };
    };

    const env = {
        console: { log() {}, warn() {}, error() {} },
        Promise, JSON, Number, String, Array, Object, TypeError, encodeURIComponent,
        document, navigator, localStorage: storage, $,
        setTimeout: setTimeoutFake, clearTimeout: clearTimeoutFake,
        isProcessing: false,
        savedChats: chats,
        currentChatId: current,
        _authInitDone: true,
        loadChat: (id) => { calls.load.push(id); env.currentChatId = id; return Promise.resolve(); },
        confirmLeaveActiveChat: () => { calls.confirm++; return Promise.resolve(state.confirmAnswer); },
        showToast: (msg, opts = {}) => { const t = { msg, opts }; calls.toast.push(t); return { dismiss() {} }; },
        track: (name, props) => calls.track.push({ name, props }),
        htmlEscape: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
        focus: () => { state.windowFocus++; },
    };
    if (api) env.Notification = FakeNotification;
    env.window = env;
    env.self = env;
    env.top = framed ? {} : env;
    vm.createContext(env);
    vm.runInContext(SRC, env);
    const BN = env.BuildNotify;
    const tracked = (name) => calls.track.filter((t) => t.name === name);
    const offers = () => calls.toast.filter((t) => t.opts.key === 'build-notify-offer');
    function start({ chatId = current, firstBuild = true } = {}) {
        env.isProcessing = true;
        BN.turnStarted({ chatId, firstBuild });
    }
    function end({ chatId = current, outcome = 'done' } = {}) {
        env.isProcessing = false;
        BN.turnEnded({ chatId, outcome });
    }
    const away = () => { state.visible = 'hidden'; state.focused = false; };
    // Settings opens: the tab's markup, as the switch the fake jQuery updates.
    function openSettings() {
        const html = BN.settingsHtml();
        state.switch = {
            'aria-checked': /aria-checked="true"/.test(html) ? 'true' : 'false',
            disabled: / disabled>/.test(html),
        };
        state.note = ((html.match(/id="settings-notify-state" role="status">([^<]*)</) || [])[1] || '')
            .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
        return html;
    }
    function clickSwitch() {
        const h = handlers.find((x) => x.type === 'click' && x.sel === '.build-notify-switch');
        h.fn.call({}, { preventDefault() {} });
    }
    const workerTap = (data) => (swListeners.message || []).forEach((fn) => fn({ data }));
    return { BN, env, state, calls, advance, tracked, offers, start, end, away, storage, openSettings, clickSwitch, workerTap };
}

const ON_KEY = 'builder.buildNotify';
const OFFER_KEY = 'builder.buildNotifyOffer';
const ON = () => memoryStorage({ [ON_KEY]: '1' });

// ---- The offer ----------------------------------------------------------------

{
    const t = setup();
    t.start();
    const o = t.offers();
    check('a first build offers a notification, with Turn on', o.length === 1 && o[0].msg === 'Want a notification when this build is done?' && o[0].opts.action.label === 'Turn on');
    check('…that closes on its own after 15 seconds', o[0].opts.duration === 15000);
    check('…in plain words', !/[:;]/.test(o[0].msg) && !/push|AI|service worker|permission/i.test(o[0].msg));
    check('…without asking the browser yet', t.calls.ask === 0);
    check('…kept as shown, and tracked', t.storage.getItem(OFFER_KEY) === '1' && t.tracked('Notify Offered').length === 1);
    t.end();
    t.start({ chatId: 'chat_2_b' });
    check('a second first build in the same load is not asked again', t.offers().length === 1);
}

{
    const t = setup();
    t.start({ firstBuild: false });
    check('a later build in a project is never asked', t.offers().length === 0);

    const denied = setup({ permission: 'denied' });
    denied.start();
    check('the browser blocks the site: no offer', denied.offers().length === 0 && !denied.storage.getItem(OFFER_KEY));
    const none = setup({ api: false });
    none.start();
    check('a browser without notifications: no offer', none.offers().length === 0);
    const framed = setup({ framed: true });
    framed.start();
    check('inside another page (the Puter desktop): no offer', framed.offers().length === 0);
    const on = setup({ permission: 'granted', storage: ON() });
    on.start();
    check('on already: no offer', on.offers().length === 0);
    const off = setup({ permission: 'granted', storage: memoryStorage({ [ON_KEY]: '0' }) });
    off.start();
    check('switched off in Settings: no offer', off.offers().length === 0);
    const allowed = setup({ permission: 'granted' });
    allowed.start();
    check('allowed by the browser but never chosen: offered', allowed.offers().length === 1);
}

{
    const t = setup();
    t.state.otherOffer = true;
    t.start();
    check('another offer\'s toast up (the install offer): it waits', t.offers().length === 0);
    t.advance(2000);
    check('…and keeps waiting while it stays', t.offers().length === 0);
    t.state.otherOffer = false;
    t.advance(2000);
    check('…then shows once it has gone', t.offers().length === 1);

    const late = setup();
    late.state.otherOffer = true;
    late.start();
    late.end();
    late.state.otherOffer = false;
    late.advance(10000);
    check('a build that ends first is never offered, and nothing is counted', late.offers().length === 0 && !late.storage.getItem(OFFER_KEY));
}

{
    const t = setup();
    t.start();
    t.offers()[0].opts.onDismiss();
    check('its × is tracked as a no', t.tracked('Notify Answer')[0].props.answer === 'dismissed');
    const next = setup({ storage: t.storage });
    next.start();
    check('…and a later load never asks again', next.offers().length === 0);
}

{
    const storage = memoryStorage();
    let shown = 0;
    for (let i = 0; i < 3; i++) {
        const t = setup({ storage });
        t.start();
        shown += t.offers().length;
    }
    check('ignored: it shows once in a browser, ever', shown === 1);
    const used = setup();
    used.openSettings();
    used.clickSwitch();
    await flush();
    used.clickSwitch();
    const later = setup({ storage: used.storage });
    later.start();
    check('the switch used first: never offered', later.offers().length === 0);
    const b = setup({ storage: blocked });
    b.start();
    check('storage blocked: it still offers', b.offers().length === 1);
    b.end();
    b.start({ chatId: 'chat_2_b' });
    check('…once, for this load', b.offers().length === 1);
}

// ---- Turn on ------------------------------------------------------------------

{
    const t = setup();
    t.start();
    t.offers()[0].opts.action.onClick();
    check('Turn on asks the browser inside the click', t.calls.ask === 1);
    await flush();
    check('…allowed: on, and answered', t.BN.isOn() && t.storage.getItem(ON_KEY) === '1' && t.storage.getItem(OFFER_KEY) === '1');
    const on = t.calls.toast.find((x) => x.opts.key === 'build-notify-on');
    check('…and a toast says when one comes and where to turn them off', !!on && on.msg === "Notifications are on. If you leave this tab, you'll get one when the build is done. You can turn them off in Settings.");
    check('…tracked', t.tracked('Notify Answer').some((x) => x.props.answer === 'on'));
}

{
    const t = setup({ answer: 'denied' });
    t.start();
    t.offers()[0].opts.action.onClick();
    await flush();
    const b = t.calls.toast.find((x) => x.opts.key === 'build-notify-blocked');
    check('blocked in the prompt: a toast says where to allow it', !!b && /site settings/.test(b.msg) && !t.BN.isOn());
    check('…and it counts as answered', t.storage.getItem(OFFER_KEY) === '1' && t.tracked('Notify Answer').some((x) => x.props.answer === 'blocked'));

    const closed = setup({ answer: 'default' });
    closed.start();
    closed.offers()[0].opts.action.onClick();
    await flush();
    check('the prompt closed with no answer: no toast, answered', closed.calls.toast.length === 1 && closed.storage.getItem(OFFER_KEY) === '1' && !closed.BN.isOn());

    const safari = setup({ callbackOnly: true });
    safari.start();
    safari.offers()[0].opts.action.onClick();
    await flush();
    check('an older Safari, which answers through a callback: on', safari.BN.isOn());
}

// ---- The notification ---------------------------------------------------------------

{
    const t = setup({ permission: 'granted', storage: ON() });
    t.start({ firstBuild: false });
    t.away();
    t.end();
    const n = t.calls.shown[0];
    check('a build done while the user is away says so at once', t.calls.shown.length === 1 && n.title === 'Your build is done' && n.options.body === 'Pomodoro Timer');
    check('…with the builder\'s icon, one per project', n.options.icon === '/favicons/icon-192.png' && n.options.tag === 'build-chat_1_a' && n.options.renotify === true);
    check('…carrying the project, for a tap', n.options.data.chatId === 'chat_1_a' && n.options.data.kind === 'done' && n.options.data.url === '/?p=chat_1_a' && n.options.data.source === 'build-notify');
    check('…tracked', t.tracked('Notify Sent').some((x) => x.props.kind === 'done'));
    n.onclick();
    check('a tap brings the tab forward and closes it', t.state.windowFocus === 1 && n.closed && t.tracked('Notify Opened').some((x) => x.props.kind === 'done'));
}

{
    const looking = setup({ permission: 'granted', storage: ON() });
    looking.start({ firstBuild: false });
    looking.end();
    check('the user watching the build: none', looking.calls.shown.length === 0);

    const blurred = setup({ permission: 'granted', storage: ON() });
    blurred.start({ firstBuild: false });
    blurred.state.focused = false;
    blurred.end();
    check('the tab showing but another window focused: it notifies', blurred.calls.shown.length === 1);

    const stopped = setup({ permission: 'granted', storage: ON() });
    stopped.start({ firstBuild: false });
    stopped.away();
    stopped.end({ outcome: 'stopped' });
    check('a build that stopped says so', stopped.calls.shown.length === 1 && stopped.calls.shown[0].title === 'Your build stopped before it finished');

    const q = setup({ permission: 'granted', storage: ON() });
    q.start();
    q.away();
    q.BN.needsAnswer();
    check('a question the build waits on says so', q.calls.shown.length === 1 && q.calls.shown[0].title === 'The builder has a question' && q.calls.shown[0].options.data.kind === 'question');

    const none = setup({ permission: 'granted', storage: ON() });
    none.start({ firstBuild: false });
    none.away();
    none.end({ outcome: null });
    check('a Stop, a switch or a queued message: none', none.calls.shown.length === 0);

    const untitled = setup({ permission: 'granted', storage: ON(), chats: [] });
    untitled.start({ firstBuild: false });
    untitled.away();
    untitled.end({ outcome: 'stopped' });
    check('a project without a name yet: the title alone', untitled.calls.shown.length === 1 && !('body' in untitled.calls.shown[0].options));
}

{
    const never = setup({ permission: 'granted' });
    never.start({ firstBuild: false });
    never.away();
    never.end();
    never.BN.needsAnswer();
    check('never turned on: none', never.calls.shown.length === 0);
    const revoked = setup({ permission: 'default', storage: ON() });
    revoked.start({ firstBuild: false });
    revoked.away();
    revoked.end();
    check('on, but the browser no longer allows it: none', revoked.calls.shown.length === 0 && !revoked.BN.isOn());
    const off = setup({ permission: 'granted', storage: memoryStorage({ [ON_KEY]: '0' }) });
    off.start({ firstBuild: false });
    off.away();
    off.end();
    check('switched off: none', off.calls.shown.length === 0);
}

{
    const t = setup({ permission: 'granted', storage: ON(), pageCanShow: false });
    t.start({ firstBuild: false });
    t.away();
    t.end();
    await flush();
    const w = t.calls.workerShown[0];
    check('a page that can\'t show one (Android): the worker does, the same notification', t.calls.workerShown.length === 1 && w.title === 'Your build is done' && w.options.data.chatId === 'chat_1_a');
    check('…tracked as the worker\'s', t.tracked('Notify Sent').some((x) => x.props.worker === true));
    const nowhere = setup({ permission: 'granted', storage: ON(), pageCanShow: false, worker: false });
    let threw = false;
    try {
        nowhere.start({ firstBuild: false });
        nowhere.away();
        nowhere.end();
        await flush();
    } catch (e) { threw = true; }
    check('…and with no worker either, nothing breaks', !threw && nowhere.calls.workerShown.length === 0);
}

// ---- A tap --------------------------------------------------------------------

{
    const chats = [{ id: 'chat_1_a', title: 'A' }, { id: 'chat_2_b', title: 'B' }];
    const t = setup({ chats });
    check('the page takes taps from the worker', t.calls.startMessages === 1);
    t.workerTap({ type: 'BUILD_NOTIFICATION_CLICK', chatId: 'chat_1_a', kind: 'done' });
    await flush();
    check('a tap on the open project leaves it as it is', t.calls.load.length === 0 && t.calls.confirm === 0);
    t.workerTap({ type: 'BUILD_NOTIFICATION_CLICK', chatId: 'chat_2_b', kind: 'done' });
    await flush();
    check('a tap on another project asks first, as the sidebar does, then opens it', t.calls.confirm === 1 && t.calls.load.length === 1 && t.calls.load[0] === 'chat_2_b');
    t.state.confirmAnswer = false;
    t.workerTap({ type: 'BUILD_NOTIFICATION_CLICK', chatId: 'chat_1_a', kind: 'done' });
    await flush();
    check('…and stays put on a no', t.calls.load.length === 1);
    t.workerTap({ type: 'BUILD_NOTIFICATION_CLICK', chatId: 'chat_gone', kind: 'done' });
    t.workerTap({ type: 'SKIP_WAITING' });
    await flush();
    check('a deleted project, or another message: nothing', t.calls.load.length === 1 && t.calls.confirm === 2);

    const boot = setup({ chats });
    boot.env._authInitDone = false;
    boot.workerTap({ type: 'BUILD_NOTIFICATION_CLICK', chatId: 'chat_2_b', kind: 'done' });
    await flush();
    check('a page still starting up leaves it to its link', boot.calls.load.length === 0);
}

// ---- The switch ---------------------------------------------------------------

{
    const t = setup();
    const html = t.openSettings();
    check('Settings shows a switch, off', /role="switch" aria-checked="false"/.test(html) && html.includes('Build notifications') && !/ disabled>/.test(html));
    check('…that says what it does, plainly', html.includes('Get a notification when a build finishes or needs you while you’re in another tab.'));
    t.clickSwitch();
    check('switching it on asks the browser inside the click', t.calls.ask === 1);
    await flush();
    check('…allowed: on, drawn in place', t.BN.isOn() && t.state.switch['aria-checked'] === 'true' && t.state.switch.disabled === false);
    check('…and the offer never comes', t.storage.getItem(OFFER_KEY) === '1');
    check('…tracked', t.tracked('Notify Changed').some((x) => x.props.on === true && x.props.source === 'settings'));
    t.clickSwitch();
    check('switching it off: off at once, kept, no prompt', !t.BN.isOn() && t.storage.getItem(ON_KEY) === '0' && t.state.switch['aria-checked'] === 'false' && t.calls.ask === 1);
    t.clickSwitch();
    await flush();
    check('…and back on', t.BN.isOn() && t.state.switch['aria-checked'] === 'true');
}

{
    const t = setup({ answer: 'denied' });
    t.openSettings();
    t.clickSwitch();
    await flush();
    check('blocked in the prompt: the switch stays off, disabled, and says where to allow it',
        t.state.switch['aria-checked'] === 'false' && t.state.switch.disabled === true && /site settings/.test(t.state.note));
    check('…with no toast over Settings', t.calls.toast.length === 0);

    const denied = setup({ permission: 'denied' });
    const html = denied.openSettings();
    check('blocked already: disabled, with the note', / disabled>/.test(html) && /site settings/.test(denied.state.note));
    const framed = setup({ framed: true });
    framed.openSettings();
    check('inside the Puter desktop: disabled, it says to use its own tab', framed.state.switch.disabled === true && framed.state.note === 'Notifications work when the builder is open in its own browser tab.');
    const none = setup({ api: false });
    none.openSettings();
    check('a browser without them: disabled, it says so', none.state.switch.disabled === true && /can.t show notifications/.test(none.state.note));
    const on = setup({ permission: 'granted', storage: ON() });
    const onHtml = on.openSettings();
    check('on already: drawn on', /aria-checked="true"/.test(onHtml) && on.state.note === '');
}

// ---- The worker's tap -----------------------------------------------------------------------

function loadWorker() {
    const listeners = {};
    const calls = { opened: [], focused: [], posted: [], closed: 0, waited: null, matchOpts: null };
    let pages = [];
    const self = {
        location: { origin: 'https://builder.puter.com' },
        addEventListener: (t, fn) => { listeners[t] = fn; },
        clients: {
            matchAll: (opts) => {
                calls.matchOpts = opts;
                return Promise.resolve(pages.map((p) => ({ ...p, focus() { calls.focused.push(p.url); return Promise.resolve(); }, postMessage(m) { calls.posted.push({ url: p.url, m }); } })));
            },
            openWindow: (url) => { calls.opened.push(url); return Promise.resolve(); },
        },
        registration: {},
        skipWaiting() {},
    };
    const ctx = { self, URL, console, Promise, caches: {} };
    vm.createContext(ctx);
    vm.runInContext(SW_SRC, ctx);
    async function tap(data, open = []) {
        pages = open;
        Object.assign(calls, { opened: [], focused: [], posted: [], closed: 0, waited: null });
        const event = { notification: { data, close() { calls.closed++; } }, waitUntil(p) { calls.waited = p; } };
        listeners.notificationclick(event);
        await calls.waited;
        return calls;
    }
    return { tap, calls };
}

{
    const w = loadWorker();
    const data = { source: 'build-notify', chatId: 'chat_2_b', kind: 'done', url: '/?p=chat_2_b' };
    let c = await w.tap(data, [
        { url: 'https://builder.puter.com/ai-app-builder/', frameType: 'top-level' },
        { url: 'https://builder.puter.com/?p=chat_1_a', frameType: 'top-level' },
        { url: 'https://builder.puter.com/?p=chat_2_b', frameType: 'top-level' },
    ]);
    check('the worker: a tap goes to the tab showing that project, focused, and is told which',
        c.focused[0] === 'https://builder.puter.com/?p=chat_2_b' && c.posted[0].m.type === 'BUILD_NOTIFICATION_CLICK' && c.posted[0].m.chatId === 'chat_2_b' && c.closed === 1);
    check('…counting tabs it doesn\'t control', c.matchOpts.includeUncontrolled === true && c.matchOpts.type === 'window');
    c = await w.tap(data, [
        { url: 'https://builder.puter.com/guides/?p=chat_2_b', frameType: 'top-level' },
        { url: 'https://builder.puter.com/', frameType: 'top-level' },
        { url: 'https://builder.puter.com/?p=chat_1_a', frameType: 'top-level' },
        { url: 'https://builder.puter.com/?p=chat_2_b', frameType: 'nested' },
    ]);
    check('…with no tab of its own showing the project, it opens it in a new one, and leaves the others be',
        c.opened[0] === '/?p=chat_2_b' && c.focused.length === 0 && c.posted.length === 0);
    c = await w.tap({ ...data, url: '//evil.example/' }, []);
    check('…and only ever a path on this site', c.opened[0] === '/');
    c = await w.tap({ ...data, url: 'https://evil.example/' }, []);
    check('…not a full address either', c.opened[0] === '/');
    let touched = false;
    const listeners = {};
    const ctx = { self: { location: { origin: 'https://builder.puter.com' }, addEventListener: (t, fn) => { listeners[t] = fn; }, clients: {} }, URL, console, Promise, caches: {} };
    vm.createContext(ctx);
    vm.runInContext(SW_SRC, ctx);
    listeners.notificationclick({ notification: { data: { other: true }, close() { touched = true; } }, waitUntil() { touched = true; } });
    check('another notification is left alone', !touched);
}

// ---- The wiring ---------------------------------------------------------------------------

{
    const APP = read('../src/js/app.js');
    const CLARIFY = read('../src/tools/chat_ui/clarify.js');
    const MCP = read('../src/js/mcp-ui.js');
    const VITE = read('../vite.config.js');
    const PKG = read('../package.json');
    const CSS = read('../src/css/styles.css');

    check('every turn tells it, with the project\'s first build marked',
        /window\.FastMode\?\.turnStarted\?\.\([^\n]+\);\s*(\/\/[^\n]*\n\s*)*if \(!turnAbandoned\(\)\) window\.BuildNotify\?\.turnStarted\?\.\(\{ chatId: turnChatId, firstBuild: isFirstBuildTurn \}\);/.test(APP));
    const endAt = APP.indexOf('window.BuildNotify?.turnEnded?.(');
    check('the end of a turn tells it, after the queue has had its say and a superseded turn has gone',
        endAt > APP.indexOf('const sendingQueued = ') && APP.indexOf('const sendingQueued = ') > APP.indexOf('if (supersededInChat) return;'));
    const endBlock = APP.slice(APP.indexOf('const sendingQueued = '), endAt + 80);
    check('…no outcome for another project or a queued message', /const outcome = turnChatId !== currentChatId \|\| sendingQueued \? null/.test(endBlock));
    check('…done is a clean finish with credits left', /: turnSucceeded && !usageLimited \? 'done'/.test(endBlock));
    check('…stopped is credits running out, an error card, or retries given up', /: turnSucceeded \|\| turnErrored \|\| retryGaveUp \? 'stopped' : null;/.test(endBlock));
    check('…but not from a turn stopped while its plan was checked', APP.includes('if (!turnAbandoned()) window.BuildNotify?.turnStarted?.({'));
    check('a clarify card tells it before it waits', /window\.BuildNotify\?\.needsAnswer\?\.\(\);\s*return await runClarification\(/.test(CLARIFY));
    check('Settings has a Notifications tab with the switch',
        MCP.includes('role="tab" id="settings-tab-notifications" aria-controls="settings-panel-notifications" data-tab="notifications">Notifications</button>')
        && /role="tabpanel" id="settings-panel-notifications" aria-labelledby="settings-tab-notifications" data-tab="notifications">\s*\$\{window\.BuildNotify\?\.settingsHtml\?\.\(\) \|\| ''\}/.test(MCP));
    check('…and openSettings can ask for it', MCP.includes("tab === 'notifications'"));
    check('the switch keeps its own look in the modal, in both themes',
        CSS.includes('.mcp-modal .settings-switch {') && /\.mcp-modal button:not\([^)]*\.settings-switch\)/.test(CSS) && CSS.includes('html[data-theme="dark"] .settings-switch-track'));
    check('the worker imports nothing from another site', !/importScripts/.test(SW_SRC));
    check('build-notify.js loads after app.js', VITE.indexOf("'js/build-notify.js'") > VITE.indexOf("'js/app.js'") && VITE.indexOf("'js/app.js'") > 0);
    check('npm test runs this file', PKG.includes('node scripts/test-build-notify.mjs'));
}

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall build notification checks passed');
