import fs from 'node:fs';
import vm from 'node:vm';

// ---- Fast mode ----------------------------------------------------------------
// js/fast-mode.js: who sees the button, what the switch does to each request,
// that a change mid-build applies from the next request, the long-build hint
// (two weeks apart, three times per browser at most, done once fast mode has
// been switched on, never on a build that is fast already), and the pointer
// that What's new's Show me puts up. Runs the REAL fast-mode.js and model-core.js with a small
// fake jQuery, DOM and clock that record what the button, panel and hint show.
// Then text-asserts the wiring in the composer, the turn and its events.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const SRC = read('../src/js/fast-mode.js');
const MODEL_SRC = read('../src/js/model-core.js');
const OPUS = 'claude-opus-5-5';
const SONNET = 'claude-sonnet-5-5';

function memoryStorage(seed = {}) {
    const m = new Map(Object.entries(seed));
    return {
        map: m,
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { m.set(k, String(v)); },
        removeItem: (k) => { m.delete(k); },
    };
}
// Storage that reads but won't take a write, as when it's full.
const full = (seed = {}) => {
    const st = memoryStorage(seed);
    st.setItem = () => { throw new Error('QuotaExceededError'); };
    return st;
};
const blocked = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('SecurityError'); },
    removeItem() { throw new Error('SecurityError'); },
};

function setup({ user = { username: 'u' }, paid = true, flag = true, storage = memoryStorage(), projectModel = null, mobile = false, bodyClasses = [] } = {}) {
    const state = { hidden: true, attrs: {}, classes: new Set(), btnFocus: 0, panel: null, hint: null, visible: true, modal: false, body: new Set(bodyClasses), chatToggles: 0, viewSynced: 0 };
    const calls = { upgrade: [], track: [], toast: [], announce: [] };
    const handlers = [];

    // The clock: setTimeout runs only when the test moves time on.
    let now = 0, nextId = 1;
    // Date.now() follows the same clock, from a fixed day.
    class ClockDate extends Date { static now() { return Date.UTC(2026, 10, 12) + now; } }
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

    const btnApi = {
        get length() { return 1; },
        prop(k, v) { state[k] = v; return btnApi; },
        attr(k, v) {
            if (typeof k === 'object') Object.assign(state.attrs, k);
            else if (v === undefined) return state.attrs[k];
            else state.attrs[k] = v;
            return btnApi;
        },
        toggleClass(c, on) { if (on) state.classes.add(c); else state.classes.delete(c); return btnApi; },
        removeClass(c) { state.classes.delete(c); return btnApi; },
        trigger() { state.btnFocus++; return btnApi; },
    };
    const $ = (arg) => {
        if (arg && arg.__isDocument) return { on: (type, sel, fn) => handlers.push({ type, sel: typeof sel === 'string' ? sel : null, fn: typeof sel === 'function' ? sel : fn }) };
        if (arg === '.fast-mode-btn') return btnApi;
        if (arg === '.fast-mode-panel') return { remove: () => { state.panel = null; }, trigger: () => {} };
        if (arg === '.fast-mode-hint') return { remove: () => { state.hint = null; } };
        if (arg === '.fast-mode-switch') return { trigger: () => {} };
        if (arg === 'body') return {
            append: (el) => { if (el.html.includes('fast-mode-panel')) state.panel = el.html; else state.hint = el.html; },
            hasClass: (c) => state.body.has(c),
            addClass: (c) => { state.body.add(c); },
        };
        // The preview toolbar's chat toggle, whose click shows the chat panel.
        if (arg === '.preview-toggle-chat') return { first: () => ({ trigger: () => { state.chatToggles++; state.body.delete('chat-hidden'); } }) };
        if (typeof arg === 'string' && arg.trim().startsWith('<')) return { html: arg };
        // A click target: inside the given surfaces, or nowhere.
        return { closest: (sel) => ({ length: arg && arg.inside && arg.inside.includes(sel) ? 1 : 0 }) };
    };

    // A fake layout: the composer near the bottom of a 1200x800 window, the
    // button near its right end.
    const surface = (height) => {
        const el = { style: { setProperty(k, v) { el.style[k] = v; } }, offsetHeight: height, offsetWidth: 300, classList: { list: new Set(), toggle(c, on) { if (on) el.classList.list.add(c); else el.classList.list.delete(c); } } };
        return el;
    };
    const panelEl = surface(140);
    const hintEl = surface(120);
    const composerEl = { getBoundingClientRect: () => ({ top: 600, bottom: 700, left: 100, right: 900 }) };
    const columnEl = { getBoundingClientRect: () => ({ top: 0 }) };
    const btnEl = {
        get hidden() { return state.hidden; },
        getClientRects: () => (state.hidden || !state.visible ? [] : [{}]),
        getBoundingClientRect: () => ({ left: 800, right: 828, width: 28, top: 662, bottom: 690 }),
        closest: (sel) => (sel === '.chat-input' ? composerEl : sel === '.chat' ? columnEl : null),
    };
    const document = {
        __isDocument: true,
        visibilityState: 'visible',
        activeElement: null,
        documentElement: { clientWidth: 1200 },
        querySelector(sel) {
            if (sel === '.fast-mode-btn') return btnEl;
            if (sel === '.fast-mode-panel') return state.panel ? panelEl : null;
            if (sel === '.fast-mode-hint') return state.hint ? hintEl : null;
            if (sel === '.chat-input') return composerEl;
            if (sel === '[aria-modal="true"]') return state.modal ? {} : null;
            if (sel === '.clarify-card') return state.clarify ? {} : null;
            return null;
        },
    };

    const env = {
        console, Date: ClockDate, Promise, Math, $, document, localStorage: storage,
        setTimeout: setTimeoutFake, clearTimeout: clearTimeoutFake,
        innerHeight: 800, innerWidth: 1200,
        htmlEscape: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    };
    env.window = env;
    env.FEATURE_FLAGS = { fastMode: flag };
    env.user = user ? { ...user, paid } : null;
    env.Branding = { isSubscribed: (u) => !!(u && u.paid) };
    env.zap_svg = '<svg zap/>';
    env.cross_svg = '<svg x/>';
    const winListeners = {};
    env.addEventListener = (type, fn) => { winListeners[type] = fn; };
    env.removeEventListener = (type) => { delete winListeners[type]; };
    env.openUpgradeModal = (source) => calls.upgrade.push(source);
    env.track = (name, props) => calls.track.push({ name, props });
    env.showToast = (msg) => calls.toast.push(msg);
    env.announce = (msg) => calls.announce.push(msg);
    env.isMobileViewport = () => mobile;
    env.syncViewSeg = () => { state.viewSynced++; };
    if (projectModel) env.ModelPicker = { access: () => 'open', projectModel: () => projectModel };
    vm.createContext(env);
    vm.runInContext(MODEL_SRC, env);
    vm.runInContext(SRC, env);
    const FM = env.FastMode;

    function fire(type, sel, { target, key } = {}) {
        const e = { key, target: target || {}, preventDefault() {}, stopPropagation() {} };
        // A handler's selector can be a list, as in jQuery.
        const matches = (hSel) => (hSel === null ? sel === null : sel !== null && hSel.split(',').map((x) => x.trim()).includes(sel));
        for (const h of handlers) {
            if (h.type !== type || !matches(h.sel)) continue;
            h.fn.call({}, e);
        }
    }
    const tracked = (name) => calls.track.filter((t) => t.name === name);
    FM.render();
    return { FM, env, state, calls, fire, advance, tracked, storage, hintEl, panelEl, winListeners };
}

const HINT_AT = 30 * 1000;
const DAY = 24 * 60 * 60 * 1000;

// ---- Who sees it ---------------------------------------------------------------

{
    check('signed out: no button', setup({ user: null }).state.hidden === true);
    check('a temporary account: no button', setup({ user: { username: 'g', is_temp: true } }).state.hidden === true);
    check('with the flag off: no button', setup({ flag: false }).state.hidden === true);
    const free = setup({ paid: false });
    check('the free plan sees the button', free.state.hidden === false && free.FM.available());
    const paid = setup();
    check('a paid plan sees the button', paid.state.hidden === false && paid.FM.available());
    check('it starts off', paid.FM.isOn() === false && paid.state.attrs['aria-label'] === 'Fast mode: off' && !paid.state.classes.has('is-on'));
    check('…and every request keeps the usual speed', paid.FM.requestSpeed(OPUS, {}) === undefined);
}

// ---- The switch ---------------------------------------------------------------------

{
    const t = setup();
    t.fire('click', '.fast-mode-btn');
    check('the button opens the panel', !!t.state.panel && t.state.attrs['aria-expanded'] === 'true');
    check('…with the switch off', /role="switch" aria-checked="false"/.test(t.state.panel));
    check('…the price and the speed, in plain words', t.state.panel.includes('The builder works up to 2.5x faster and uses 2x the credits.') && !/the AI|next step/.test(t.state.panel));
    check('…and no upgrade offer', !/upgrade/i.test(t.state.panel));
    const opened = t.tracked('Fast Mode Opened');
    check('opening is counted, with whether it was on', opened.length === 1 && opened[0].props.on === false && opened[0].props.mid_build === false);

    t.fire('click', '.fast-mode-panel .fast-mode-switch');
    check('the switch turns it on and keeps it in this browser', t.FM.isOn() && t.storage.getItem('builder.fastMode') === '1');
    check('…lights the button', t.state.classes.has('is-on') && t.state.attrs['aria-label'] === 'Fast mode: on');
    check('…and redraws the switch on', /aria-checked="true"/.test(t.state.panel));
    check('…says so to a screen reader', t.calls.announce.includes('Fast mode is on.'));
    const changed = t.tracked('Fast Mode Changed');
    check('the change is counted, from the panel, outside a build',
        changed.length === 1 && changed[0].props.on === true && changed[0].props.source === 'panel' && changed[0].props.mid_build === false);

    const stats = {};
    check('a request on Opus now asks for fast', t.FM.requestSpeed(OPUS, stats) === 'fast');
    check('…and marks the turn for its build events', stats.fastMode === true);
    check('…a request without stats still works', t.FM.requestSpeed(OPUS) === 'fast');
    const sonnetStats = {};
    check('a model without a fast tier keeps its usual speed', t.FM.requestSpeed(SONNET, sonnetStats) === undefined && !sonnetStats.fastMode);

    t.fire('click', '.fast-mode-panel .fast-mode-switch');
    check('the switch turns it off again', !t.FM.isOn() && t.storage.getItem('builder.fastMode') === null && !t.state.classes.has('is-on'));
    check('…and requests go at the usual speed', t.FM.requestSpeed(OPUS, {}) === undefined);

    const reload = setup({ storage: memoryStorage({ 'builder.fastMode': '1' }) });
    check('a reload keeps it on', reload.FM.isOn() && reload.state.classes.has('is-on'));

    const noStorage = setup({ storage: blocked });
    noStorage.fire('click', '.fast-mode-btn');
    noStorage.fire('click', '.fast-mode-panel .fast-mode-switch');
    check('with storage blocked it still works for this load', noStorage.FM.isOn() && noStorage.FM.requestSpeed(OPUS) === 'fast');
}

// ---- A change mid-build ------------------------------------------------------------
// Each request reads the switch as it is made. The one already running was
// made before the change, so it finishes at its speed, and the next follows it.

{
    const t = setup();
    t.FM.setBusy(true);
    t.FM.turnStarted({ model: OPUS });
    const stats = {};
    const first = t.FM.requestSpeed(OPUS, stats);
    t.fire('click', '.fast-mode-btn');
    check('mid-build the panel adds no note about the AI\'s steps', !/the AI|next step|fast-mode-note/.test(t.state.panel));
    t.fire('click', '.fast-mode-panel .fast-mode-switch');
    const next = t.FM.requestSpeed(OPUS, stats);
    check('the request running when it was switched on kept the usual speed', first === undefined);
    check('the next request of the same build asks for fast', next === 'fast' && stats.fastMode === true);
    check('the change is counted as mid-build', t.tracked('Fast Mode Changed')[0].props.mid_build === true);
    t.fire('click', '.fast-mode-panel .fast-mode-switch');
    check('switched off mid-build, the next request is back to usual', t.FM.requestSpeed(OPUS, stats) === undefined);
}

// ---- The free plan ------------------------------------------------------------------
// No paywall. The free plan gets the same switch, and its requests go fast.

{
    const t = setup({ paid: false });
    t.fire('click', '.fast-mode-btn');
    check('the free plan gets the switch', /role="switch" aria-checked="false"/.test(t.state.panel) && !/upgrade/i.test(t.state.panel));
    t.fire('click', '.fast-mode-panel .fast-mode-switch');
    check('…turns it on', t.FM.isOn() && t.state.classes.has('is-on') && t.tracked('Fast Mode Changed').length === 1);
    const stats = {};
    check('…and its requests on Opus go fast', t.FM.requestSpeed(OPUS, stats) === 'fast' && stats.fastMode === true);
    check('nothing offers the upgrade', t.calls.upgrade.length === 0);
}

// ---- A model without a fast tier ------------------------------------------------------

{
    const t = setup({ projectModel: SONNET, storage: memoryStorage({ 'builder.fastMode': '1' }) });
    check('on, but the project builds with Sonnet: not lit', !t.state.classes.has('is-on') && t.state.attrs['aria-label'] === 'Fast mode: off');
    t.fire('click', '.fast-mode-btn');
    check('the panel says which model it works with, and this one\'s speed',
        t.state.panel.includes('Fast mode works with Claude Opus 5.5.') && t.state.panel.includes('builds with Claude Sonnet 5.5, which runs at its usual speed'));
    check('…and the switch stays on, for when it builds with Opus again', /aria-checked="true"/.test(t.state.panel));
}

// ---- Closing the panel -----------------------------------------------------------------

{
    const t = setup();
    t.fire('click', '.fast-mode-btn');
    t.fire('click', null, { target: { inside: ['.fast-mode-panel'] } });
    check('a click inside the panel keeps it open', !!t.state.panel);
    t.fire('click', null, { target: {} });
    check('a click outside closes it', !t.state.panel && t.state.attrs['aria-expanded'] === 'false');
    t.fire('click', '.fast-mode-btn');
    const focus = t.state.btnFocus;
    t.fire('keydown', '.fast-mode-panel', { key: 'Escape' });
    check('Escape closes it and focus goes back to the button', !t.state.panel && t.state.btnFocus === focus + 1);
    t.fire('click', '.fast-mode-btn');
    t.fire('click', '.fast-mode-btn');
    check('the button closes it again', !t.state.panel);
}

// ---- The long-build hint ----------------------------------------------------------------

function build(t, turn = {}) {
    t.FM.setBusy(true);
    t.FM.turnStarted({ model: OPUS, ...turn });
}

{
    const t = setup();
    build(t);
    t.advance(HINT_AT - 1);
    check('a build under 30 seconds gets no hint', !t.state.hint);
    t.advance(1);
    check('at 30 seconds the hint offers fast mode', !!t.state.hint && t.state.hint.includes('Speed up this build') && t.state.hint.includes('>Turn on<'));
    check('…with the speed and the price, in plain words',
        t.state.hint.includes('Fast mode makes the builder up to 2.5x faster and uses 2x the credits.') && !/the AI|next step/.test(t.state.hint));
    // The button is at 800-828 by 662-690, the hint 300 wide and 120 tall.
    check('…right above the button, its caret pointing at it',
        t.hintEl.style.top === '532px' && t.hintEl.style.left === '538px' && t.hintEl.style['--fast-caret-x'] === '276px' && !t.hintEl.classList.list.has('is-below'));
    check('…remembered for this browser, as its first showing', JSON.parse(t.storage.getItem('builder.fastModeHint')).shown === 1);
    check('…counted as the first', t.tracked('Fast Mode Hint Shown').length === 1 && t.tracked('Fast Mode Hint Shown')[0].props.shown === 1);
    check('…and read out', t.calls.announce.some((m) => m.startsWith('Speed up this build.')));
    t.fire('click', '.fast-mode-hint-go');
    check('Turn on switches it on and closes the hint', t.FM.isOn() && !t.state.hint && t.state.classes.has('is-on'));
    check('…and says it is on', t.calls.toast.includes('Fast mode is on.'));
    const c = t.tracked('Fast Mode Changed');
    check('…counted from the hint, mid-build', c.length === 1 && c[0].props.source === 'hint' && c[0].props.mid_build === true);
    check('…and the build\'s next request is fast', t.FM.requestSpeed(OPUS, {}) === 'fast');

    // Switched on, it's done, even once switched off again.
    t.FM.setBusy(false);
    t.fire('click', '.fast-mode-btn');
    t.fire('click', '.fast-mode-panel .fast-mode-switch');
    t.fire('click', '.fast-mode-btn');
    t.advance(30 * DAY);
    build(t);
    t.advance(HINT_AT * 3);
    check('after Turn on, and fast mode off again, a long build a month later gets no hint', !t.state.hint);
    const reload = setup({ storage: t.storage });
    build(reload);
    reload.advance(HINT_AT * 3);
    check('nor one after a reload', !reload.state.hint);
}

// Not now: back two weeks after it last showed, three times in all.
{
    const t = setup();
    const longBuild = () => {
        build(t);
        t.advance(HINT_AT);
        const shown = !!t.state.hint;
        t.fire('click', '.fast-mode-hint-later');
        t.FM.setBusy(false);
        return shown;
    };
    check('Not now: the first long build shows it', longBuild());
    check('…another long build the same day does not', !longBuild());
    t.advance(13 * DAY);
    check('…nor one 13 days later', !longBuild());
    t.advance(DAY);
    check('…one two weeks after it showed does', longBuild());
    t.advance(14 * DAY);
    check('…and one two weeks after that, a third time', longBuild());
    t.advance(14 * DAY);
    check('…then never again', !longBuild());
    t.advance(365 * DAY);
    check('…however long it has been', !longBuild());
    check('each showing is counted with which one it is', t.tracked('Fast Mode Hint Shown').map((x) => x.props.shown).join() === '1,2,3');
    const reload = setup({ storage: t.storage });
    build(reload);
    reload.advance(HINT_AT * 3);
    check('…and a reload keeps the count', !reload.state.hint);
}
{
    const t = setup();
    build(t, { firstBuild: true });
    t.advance(HINT_AT);
    check('a project\'s first build gets the hint like any other', !!t.state.hint);
}
{
    const t = setup();
    build(t);
    t.advance(HINT_AT);
    t.fire('click', '.fast-mode-hint-close');
    t.FM.setBusy(false);
    t.advance(DAY);
    build(t);
    t.advance(HINT_AT);
    check('× waits two weeks like Not now', !t.state.hint);
}
{
    const t = setup();
    t.fire('click', '.fast-mode-btn');
    t.fire('click', '.fast-mode-panel .fast-mode-switch');
    t.fire('click', '.fast-mode-panel .fast-mode-switch');
    t.fire('click', '.fast-mode-btn');
    build(t);
    t.advance(HINT_AT * 3);
    check('switched on from the panel, even if off again, the hint never shows', !t.state.hint && t.tracked('Fast Mode Hint Shown').length === 0);
}
{
    for (const junk of ['1794460306679', 'not json', '[]']) {
        const t = setup({ storage: memoryStorage({ 'builder.fastModeHint': junk }) });
        build(t);
        t.advance(HINT_AT);
        check(`something else stored (${junk}) counts as never shown`, !!t.state.hint);
    }
}

{
    const t = setup();
    build(t);
    t.advance(HINT_AT);
    t.fire('click', '.fast-mode-hint-later');
    check('Not now closes it and leaves fast mode off', !t.state.hint && !t.FM.isOn());
    const x = setup();
    build(x);
    x.advance(HINT_AT);
    x.fire('click', '.fast-mode-hint-close');
    check('× closes it too', !x.state.hint);
    const end = setup();
    build(end);
    end.advance(HINT_AT);
    end.FM.setBusy(false);
    check('the build ending takes it away', !end.state.hint);
    const btn = setup();
    build(btn);
    btn.advance(HINT_AT);
    btn.fire('click', '.fast-mode-btn');
    check('the button opens the panel in its place', !btn.state.hint && !!btn.state.panel);
}

{
    const t = setup({ paid: false });
    build(t);
    t.advance(HINT_AT);
    check('on the free plan the hint offers fast mode too', !!t.state.hint && t.state.hint.includes('>Turn on<') && !/upgrade|paid/i.test(t.state.hint));
    t.fire('click', '.fast-mode-hint-go');
    check('…and Turn on switches it on', t.FM.isOn() && !t.state.hint && t.calls.upgrade.length === 0);
}

{
    const none = (label, opts, turn, before) => {
        const t = setup(opts);
        if (before) before(t);
        build(t, turn);
        t.advance(HINT_AT * 3);
        check(label, !t.state.hint && t.tracked('Fast Mode Hint Shown').length === 0);
    };
    none('no hint on a build fast already (the speed experiment, forced)', {}, { fast: true });
    none('no hint with fast mode on', { storage: memoryStorage({ 'builder.fastMode': '1' }) });
    none('no hint on a model without a fast tier', {}, { model: SONNET });
    none('no hint signed out', { user: null });
    none('no hint with the flag off', { flag: false });
    const ended = setup();
    build(ended);
    ended.advance(HINT_AT - 1000);
    ended.FM.setBusy(false);
    ended.advance(HINT_AT * 3);
    check('a build that ends before 30 seconds never shows it', !ended.state.hint);
    check('…and the browser can still see it on a later build', !ended.storage.getItem('builder.fastModeHint'));
}

{
    const t = setup();
    t.state.visible = false;
    build(t);
    t.advance(HINT_AT);
    check('the chat out of sight (a phone on the app view): the hint waits', !t.state.hint && !t.storage.getItem('builder.fastModeHint'));
    t.state.visible = true;
    t.env.document.visibilityState = 'hidden';
    t.advance(5000);
    check('…a tab in the background: it waits', !t.state.hint);
    t.env.document.visibilityState = 'visible';
    t.state.modal = true;
    t.advance(5000);
    check('…a dialog open: it waits', !t.state.hint);
    t.state.modal = false;
    t.advance(5000);
    check('…and shows once the user can see it', !!t.state.hint);
    check('while it is up it follows the window', typeof t.winListeners.resize === 'function');
    t.state.visible = false;
    t.winListeners.resize();
    check('the button going out of sight takes it away', !t.state.hint);
    check('…and stops following the window', !t.winListeners.resize);
}

{
    const t = setup({ storage: blocked });
    build(t);
    t.advance(HINT_AT);
    t.fire('click', '.fast-mode-hint-later');
    build(t);
    t.advance(HINT_AT * 2);
    check('with storage blocked the hint still keeps its count for this load', t.tracked('Fast Mode Hint Shown').length === 1);
}

// Storage that reads but won't take a write (full): what this load changed
// wins over the old stored value.
{
    const t = setup({ storage: full() });
    t.fire('click', '.fast-mode-btn');
    t.fire('click', '.fast-mode-panel .fast-mode-switch');
    check('storage full: the switch still turns it on for this load', t.FM.isOn() && t.state.classes.has('is-on') && t.FM.requestSpeed(OPUS) === 'fast');
    t.fire('click', '.fast-mode-panel .fast-mode-switch');
    check('…and off again', !t.FM.isOn() && t.FM.requestSpeed(OPUS) === undefined);
    const h = setup({ storage: full() });
    build(h);
    h.advance(HINT_AT);
    h.fire('click', '.fast-mode-hint-later');
    h.FM.setBusy(false);
    build(h);
    h.advance(HINT_AT * 2);
    check('storage full: the hint keeps its count and waits its two weeks', h.tracked('Fast Mode Hint Shown').length === 1);
    const on = setup({ storage: full({ 'builder.fastMode': '1' }) });
    on.fire('click', '.fast-mode-btn');
    on.fire('click', '.fast-mode-panel .fast-mode-switch');
    check('storage full with it stored on: switching it off holds for this load', !on.FM.isOn() && !on.state.classes.has('is-on'));
}

// A phone's app view covers the chat but keeps it in the layout.
{
    const t = setup({ mobile: true, bodyClasses: ['preview-active'] });
    build(t);
    t.advance(HINT_AT);
    check('a phone on the app view: the hint waits, though the button keeps its box', !t.state.hint && t.tracked('Fast Mode Hint Shown').length === 0);
    t.state.body.add('mobile-view-chat');
    t.advance(5000);
    check('…and shows once the chat is in view', !!t.state.hint);
    t.state.body.delete('mobile-view-chat');
    t.winListeners.resize();
    check('switching back to the app view takes it away', !t.state.hint);
    t.state.body.add('mobile-view-chat');
    t.fire('click', '.fast-mode-btn');
    t.state.body.delete('mobile-view-chat');
    t.winListeners.resize();
    check('…and closes the panel too', !t.state.panel && t.state.attrs['aria-expanded'] === 'false');
    const wide = setup({ bodyClasses: ['preview-active'] });
    build(wide);
    wide.advance(HINT_AT);
    check('a wide screen with the preview open shows it, the chat being beside it', !!wide.state.hint);
}

// A clarify card waiting on the user: the build isn't what's slow.
{
    const t = setup();
    build(t);
    t.state.clarify = true;
    t.advance(HINT_AT);
    check('a clarify card waiting on an answer: the hint waits', !t.state.hint);
    t.state.clarify = false;
    t.advance(5000);
    check('…and shows once it is answered', !!t.state.hint);
}

// ---- Show me (What's new) ------------------------------------------------------------------

{
    const t = setup();
    const focus = t.state.btnFocus;
    check('Show me puts up a pointer', t.FM.showMe() === true && !!t.state.hint && t.state.hint.includes('Fast mode is here'));
    check('…that says what the bolt does, with one Got it button',
        t.state.hint.includes('Press the bolt to switch fast mode on or off.') && t.state.hint.includes('>Got it<')
        && !t.state.hint.includes('fast-mode-hint-close') && !t.state.hint.includes('>Turn on<'));
    check('…in the hint\'s place over the button, its caret pointing at it',
        / is-pointer"/.test(t.state.hint) && t.hintEl.style.top === '532px' && t.hintEl.style['--fast-caret-x'] === '276px');
    check('…while the button pulses', t.state.classes.has('is-pointed'));
    check('…and focus moves to the button', t.state.btnFocus === focus + 1);
    check('…read out, and not counted as the long-build hint',
        t.calls.announce.some((m) => m.startsWith('Fast mode is here.')) && t.tracked('Fast Mode Hint Shown').length === 0
        && !t.storage.getItem('builder.fastModeHint'));
    check('…and it follows the window', typeof t.winListeners.resize === 'function');
    t.fire('click', '.fast-mode-hint-got');
    check('Got it takes it away and stops the pulse', !t.state.hint && !t.state.classes.has('is-pointed') && !t.winListeners.resize);
    check('…leaving fast mode as it was', !t.FM.isOn() && t.tracked('Fast Mode Changed').length === 0);
}

{
    const btn = setup();
    btn.FM.showMe();
    btn.fire('click', '.fast-mode-btn');
    check('pressing the bolt opens the panel in the pointer\'s place', !btn.state.hint && !!btn.state.panel && !btn.state.classes.has('is-pointed'));
    const out = setup();
    out.FM.showMe();
    out.fire('click', null, { target: { inside: ['.fast-mode-hint'] } });
    check('a click inside the pointer keeps it', !!out.state.hint);
    out.fire('click', null, { target: {} });
    check('a click anywhere else takes it away', !out.state.hint && !out.state.classes.has('is-pointed'));
    const esc = setup();
    esc.FM.showMe();
    esc.fire('keydown', null, { key: 'Enter' });
    check('another key keeps it', !!esc.state.hint);
    esc.fire('keydown', null, { key: 'Escape' });
    check('Escape takes it away', !esc.state.hint);
    const busy = setup();
    busy.FM.setBusy(true);
    busy.FM.showMe();
    busy.FM.setBusy(false);
    check('a build ending leaves it up, since it is not the build\'s', !!busy.state.hint);
    const open = setup();
    open.fire('click', '.fast-mode-btn');
    open.FM.showMe();
    check('with the panel open, the panel closes for it', !open.state.panel && !!open.state.hint);
}

{
    const t = setup();
    build(t);
    t.advance(HINT_AT - 1000);
    t.FM.showMe();
    t.advance(1000);
    check('the long-build hint waits while the pointer is up', t.state.hint.includes('Fast mode is here') && !t.storage.getItem('builder.fastModeHint'));
    t.fire('click', '.fast-mode-hint-got');
    t.advance(5000);
    check('…and shows once it goes', !!t.state.hint && t.state.hint.includes('Speed up this build'));
}

{
    const phone = setup({ mobile: true, bodyClasses: ['preview-active'] });
    phone.FM.showMe();
    check('a phone on the app view switches to the chat first', phone.state.body.has('mobile-view-chat') && phone.state.viewSynced === 1 && !!phone.state.hint);
    const chat = setup({ mobile: true, bodyClasses: ['preview-active', 'mobile-view-chat'] });
    chat.FM.showMe();
    check('…and one on the chat stays there', chat.state.viewSynced === 0 && !!chat.state.hint);
    const desk = setup({ bodyClasses: ['preview-active'] });
    desk.FM.showMe();
    check('a wide screen with the preview open keeps its layout', !desk.state.body.has('mobile-view-chat'));
    const hidden = setup({ bodyClasses: ['preview-active', 'chat-hidden'] });
    hidden.FM.showMe();
    check('a hidden chat panel is shown, through its toggle', hidden.state.chatToggles === 1 && !hidden.state.body.has('chat-hidden'));
    const unseen = setup();
    unseen.state.visible = false;
    check('the button still out of sight: a toast says where it is, and no pointer',
        unseen.FM.showMe() === false && !unseen.state.hint && unseen.calls.toast.some((m) => m.includes('bolt button in the chat box')));
    const out = setup({ user: null });
    check('signed out: nothing to show', out.FM.showMe() === false && !out.state.hint && out.calls.toast.length === 0);
}

// ---- The wiring ---------------------------------------------------------------------------

{
    const UI = read('../src/js/ui.js');
    const APP = read('../src/js/app.js');
    const TOOLS = read('../src/js/tools.js');
    const HELPERS = read('../src/js/helpers.js');
    const PICKER = read('../src/js/model-picker.js');
    const VITE = read('../vite.config.js');
    const HTML = read('../src/index.html');

    const at = (s) => UI.indexOf(s);
    check('the button sits after the model picker and before the mic and Send',
        at('class="model-picker-btn"') > 0 && at('class="model-picker-btn"') < at('class="fast-mode-btn"')
        && at('class="fast-mode-btn"') < at('class="voice-input-button"') && at('class="voice-input-button"') < at('<button class="send"'));
    check('…only with the flag on', /if \(window\.FEATURE_FLAGS\?\.fastMode\) \{\s*h \+= `<button type="button" class="fast-mode-btn"/.test(UI));
    check('the flag is on', /\n\s*fastMode: true,/.test(HELPERS));
    check('the bolt is drawn in index.html', HTML.includes('window.zap_svg = '));
    check('fast-mode.js loads after model-picker.js',
        VITE.indexOf("'js/model-picker.js'") > 0 && VITE.indexOf("'js/fast-mode.js'") > VITE.indexOf("'js/model-picker.js'"));
    check('the turn\'s real state reaches it, not the Send icon a clarify card shows mid-turn',
        /window\.ModelPicker\?\.setBusy\?\.\(processing\);[\s\S]{0,500}window\.FastMode\?\.setBusy\?\.\(typeof isProcessing !== 'undefined' \? !!isProcessing : processing\);/.test(HELPERS));
    check('…but the composer lock leaves it usable', !/lockComposerForTurn[\s\S]{0,500}fast-mode-btn/.test(HELPERS));
    check('it is drawn whenever the model picker is', /function render\(\) \{\s*(\/\/[^\n]*\n\s*)*window\.FastMode\?\.render\?\.\(\);/.test(PICKER));
    check('the turn tells it its model, once the speed experiment has settled the speed',
        /turnServiceSpeed = [^\n]+;\s*window\.FastMode\?\.turnStarted\?\.\(\{ model: turnModel, fast: !!turnServiceSpeed \}\);/.test(APP));
    check('the first request of every attempt reads it as it is made',
        APP.includes('serviceSpeed: turnServiceSpeed || window.FastMode?.requestSpeed(turnModel, turnStats) })'));
    check('every later round reads it as it starts',
        TOOLS.includes('serviceSpeed: c.serviceSpeed || window.FastMode?.requestSpeed(c.model, c.turnStats) })'));
    check('the turn context carries the stats it marks', /context = \{[^\n]*turnStats\};/.test(APP));
    check('Build Started says whether it is on', /window\.track\?\.\('Build Started', \{[^\n]*fast_mode: !!window\.FastMode\?\.applies\(chosenModel\)/.test(APP));
    check('Build Completed says whether it ran', /'Build Completed',\s*\{[^\n]*fast_mode: !!turnStats\.fastMode,/.test(APP));
    check('Build Abandoned says whether it ran', /'Build Abandoned', \{[\s\S]{0,200}fast_mode: !!\(build\.stats && build\.stats\.fastMode\),/.test(APP));
    check('Usage Limit Hit says whether it ran', /function limitHitTurnProps[\s\S]{0,500}fast_mode: !!stats\.fastMode,/.test(APP));
    check('the Upgrade dialog leaves it out, since every plan has it', !/id: 'fast'/.test(UI) && !/fast_mode_hint|'fast_mode'/.test(UI));
}

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall fast mode checks passed');
