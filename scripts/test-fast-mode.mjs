import fs from 'node:fs';
import vm from 'node:vm';

// ---- Fast mode (premium) ------------------------------------------------------
// js/fast-mode.js: who sees the button (hidden / locked / open), what the
// switch does to each request, that a change mid-build applies from the next
// request, and the long-build hint (once per browser, never on a build that
// is fast already). Runs the REAL fast-mode.js and model-core.js with a small
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
const blocked = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('SecurityError'); },
    removeItem() { throw new Error('SecurityError'); },
};

function setup({ user = { username: 'u' }, paid = true, flag = true, storage = memoryStorage(), projectModel = null, fresh } = {}) {
    const state = { hidden: true, attrs: {}, classes: new Set(), btnFocus: 0, panel: null, hint: null, visible: true, modal: false };
    const calls = { upgrade: [], track: [], toast: [], announce: [], refresh: 0 };
    const handlers = [];

    // The clock: setTimeout runs only when the test moves time on.
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
        trigger() { state.btnFocus++; return btnApi; },
    };
    const $ = (arg) => {
        if (arg && arg.__isDocument) return { on: (type, sel, fn) => handlers.push({ type, sel: typeof sel === 'string' ? sel : null, fn: typeof sel === 'function' ? sel : fn }) };
        if (arg === '.fast-mode-btn') return btnApi;
        if (arg === '.fast-mode-panel') return { remove: () => { state.panel = null; }, trigger: () => {} };
        if (arg === '.fast-mode-hint') return { remove: () => { state.hint = null; } };
        if (arg === '.fast-mode-switch') return { trigger: () => {} };
        if (arg === 'body') return { append: (el) => { if (el.html.includes('fast-mode-panel')) state.panel = el.html; else state.hint = el.html; } };
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
            return null;
        },
    };

    const env = {
        console, Date, Promise, Math, $, document, localStorage: storage,
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
    env.refreshUserPlan = async () => { calls.refresh++; if (fresh !== undefined) env.user = fresh; return env.user; };
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
    const flush = () => new Promise((r) => setImmediate(r));
    FM.render();
    return { FM, env, state, calls, fire, advance, tracked, flush, storage, hintEl, panelEl, winListeners };
}

const HINT_AT = 45 * 1000;

// ---- Who sees it ---------------------------------------------------------------

{
    check('signed out: no button', setup({ user: null }).state.hidden === true);
    check('a temporary account: no button', setup({ user: { username: 'g', is_temp: true } }).state.hidden === true);
    check('with the flag off: no button, even on a paid plan', setup({ flag: false }).state.hidden === true);
    const free = setup({ paid: false });
    check('the free plan sees the button', free.state.hidden === false && free.FM.access() === 'locked');
    const paid = setup();
    check('a paid plan sees the button', paid.state.hidden === false && paid.FM.access() === 'open');
    check('it starts off', paid.FM.isOn() === false && paid.state.attrs['aria-label'] === 'Fast mode: off' && !paid.state.classes.has('is-on'));
    check('…and every request keeps the usual speed', paid.FM.requestSpeed(OPUS, {}) === undefined);
}

// ---- The switch, on a paid plan --------------------------------------------------

{
    const t = setup();
    t.fire('click', '.fast-mode-btn');
    check('the button opens the panel', !!t.state.panel && t.state.attrs['aria-expanded'] === 'true');
    check('…with the switch off', /role="switch" aria-checked="false"/.test(t.state.panel));
    check('…the price and the speed', t.state.panel.includes('about 2.5x faster and uses 2x the credits'));
    check('…no upgrade offer', !t.state.panel.includes('fast-mode-upgrade'));
    check('…and checks the plan again', t.calls.refresh === 1);
    check('opening is counted', t.tracked('Fast Mode Opened').length === 1 && t.tracked('Fast Mode Opened')[0].props.access === 'open');

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
    check('mid-build the panel says when a change applies', t.state.panel.includes('next step'));
    t.fire('click', '.fast-mode-panel .fast-mode-switch');
    const next = t.FM.requestSpeed(OPUS, stats);
    check('the request running when it was switched on kept the usual speed', first === undefined);
    check('the next request of the same build asks for fast', next === 'fast' && stats.fastMode === true);
    check('the change is counted as mid-build', t.tracked('Fast Mode Changed')[0].props.mid_build === true);
    t.fire('click', '.fast-mode-panel .fast-mode-switch');
    check('switched off mid-build, the next request is back to usual', t.FM.requestSpeed(OPUS, stats) === undefined);
    t.FM.setBusy(false);
    check('after the build the panel drops the mid-build note', !t.state.panel.includes('next step'));
}

// ---- The free plan --------------------------------------------------------------------

{
    const t = setup({ paid: false, storage: memoryStorage({ 'builder.fastMode': '1' }) });
    check('stored on, a free plan is not lit', !t.state.classes.has('is-on'));
    check('…and its requests keep the usual speed', t.FM.requestSpeed(OPUS, {}) === undefined);
    t.fire('click', '.fast-mode-btn');
    check('the panel has Upgrade where the switch goes', !t.state.panel.includes('role="switch"')
        && /<div class="fast-mode-head">.*Fast mode.*<button type="button" class="fast-mode-upgrade"[^>]*>Upgrade<\/button><\/div>/.test(t.state.panel));
    check('…over the price and the speed', t.state.panel.includes('about 2.5x faster and uses 2x the credits'));
    t.fire('click', '.fast-mode-panel .fast-mode-switch');
    check('a switch click that slips through does nothing', t.tracked('Fast Mode Changed').length === 0 && t.storage.getItem('builder.fastMode') === '1');
    t.fire('click', '.fast-mode-upgrade');
    check('Upgrade opens the dialog from fast mode and closes the panel', t.calls.upgrade.join() === 'fast_mode' && !t.state.panel);
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
    check('a build under 45 seconds gets no hint', !t.state.hint);
    t.advance(1);
    check('at 45 seconds the hint offers fast mode', !!t.state.hint && t.state.hint.includes('Speed up this build') && t.state.hint.includes('>Turn on<'));
    check('…with the price and when it starts', t.state.hint.includes('2x the credits') && t.state.hint.includes('next step'));
    // The button is at 800-828 by 662-690, the hint 300 wide and 120 tall.
    check('…right above the button, its caret pointing at it',
        t.hintEl.style.top === '532px' && t.hintEl.style.left === '538px' && t.hintEl.style['--fast-caret-x'] === '276px' && !t.hintEl.classList.list.has('is-below'));
    check('…remembered for this browser', !!t.storage.getItem('builder.fastModeHintShown'));
    check('…counted', t.tracked('Fast Mode Hint Shown').length === 1 && t.tracked('Fast Mode Hint Shown')[0].props.access === 'open');
    check('…and read out', t.calls.announce.some((m) => m.startsWith('Speed up this build.')));
    t.fire('click', '.fast-mode-hint-go');
    check('Turn on switches it on and closes the hint', t.FM.isOn() && !t.state.hint && t.state.classes.has('is-on'));
    check('…says the step running now finishes first', t.calls.toast.some((m) => m.includes('next step')));
    const c = t.tracked('Fast Mode Changed');
    check('…counted from the hint, mid-build', c.length === 1 && c[0].props.source === 'hint' && c[0].props.mid_build === true);
    check('…and the build\'s next request is fast', t.FM.requestSpeed(OPUS, {}) === 'fast');

    // Once per browser.
    t.FM.setBusy(false);
    t.fire('click', '.fast-mode-btn');
    t.fire('click', '.fast-mode-panel .fast-mode-switch');
    t.fire('click', '.fast-mode-btn');
    build(t);
    t.advance(HINT_AT * 3);
    check('the next long build gets no hint', !t.state.hint);
    const reload = setup({ storage: t.storage });
    build(reload);
    reload.advance(HINT_AT * 3);
    check('nor one after a reload', !reload.state.hint);
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
    check('on the free plan the hint offers the upgrade', !!t.state.hint && t.state.hint.includes('>Upgrade<') && t.state.hint.includes('paid Puter plan'));
    t.fire('click', '.fast-mode-hint-go');
    check('…which opens the dialog from the hint', t.calls.upgrade.join() === 'fast_mode_hint' && !t.state.hint && !t.FM.isOn());
}

{
    const none = (label, opts, turn, before) => {
        const t = setup(opts);
        if (before) before(t);
        build(t, turn);
        t.advance(HINT_AT * 3);
        check(label, !t.state.hint && t.tracked('Fast Mode Hint Shown').length === 0);
    };
    none('no hint on a build fast already (the speed experiment)', {}, { fast: true });
    none('no hint on a project\'s first build, which the speed experiment compares', {}, { firstBuild: true });
    none('no hint with fast mode on', { storage: memoryStorage({ 'builder.fastMode': '1' }) });
    none('no hint on a model without a fast tier', {}, { model: SONNET });
    none('no hint signed out', { user: null });
    none('no hint with the flag off', { flag: false });
    const ended = setup();
    build(ended);
    ended.advance(HINT_AT - 1000);
    ended.FM.setBusy(false);
    ended.advance(HINT_AT * 3);
    check('a build that ends before 45 seconds never shows it', !ended.state.hint);
    check('…and the browser can still see it on a later build', !ended.storage.getItem('builder.fastModeHintShown'));
}

{
    const t = setup();
    t.state.visible = false;
    build(t);
    t.advance(HINT_AT);
    check('the chat out of sight (a phone on the app view): the hint waits', !t.state.hint && !t.storage.getItem('builder.fastModeHintShown'));
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
    check('with storage blocked the hint still shows only once per load', t.tracked('Fast Mode Hint Shown').length === 1);
}

// ---- A plan that ends while the page is open ---------------------------------------------

{
    const t = setup({ storage: memoryStorage({ 'builder.fastMode': '1' }), fresh: { username: 'u', paid: false } });
    build(t);
    await t.flush();
    check('a build with fast mode on checks the plan', t.calls.refresh === 1);
    check('…and on finding it ended, says fast mode is off', t.calls.toast.some((m) => m.includes('plan has ended, so fast mode is off')));
    check('…unlights the button', !t.state.classes.has('is-on'));
    check('…and the build\'s next requests keep the usual speed', t.FM.requestSpeed(OPUS, {}) === undefined);
    const off = setup({ fresh: { username: 'u', paid: false } });
    build(off);
    await off.flush();
    check('with fast mode off a build does not check the plan for it', off.calls.refresh === 0);
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
    check('the composer\'s turn state reaches it', /window\.ModelPicker\?\.setBusy\?\.\(processing\);[\s\S]{0,200}window\.FastMode\?\.setBusy\?\.\(processing\);/.test(HELPERS));
    check('…but the composer lock leaves it usable', !/lockComposerForTurn[\s\S]{0,500}fast-mode-btn/.test(HELPERS));
    check('it is drawn whenever the model picker is', /function render\(\) \{\s*(\/\/[^\n]*\n\s*)*window\.FastMode\?\.render\?\.\(\);/.test(PICKER));
    check('the turn tells it its model, once the speed experiment has settled the speed',
        /turnServiceSpeed = [^\n]+;\s*window\.FastMode\?\.turnStarted\?\.\(\{ model: turnModel, fast: !!turnServiceSpeed, firstBuild: isFirstBuildTurn \}\);/.test(APP));
    check('the first request of every attempt reads it as it is made',
        APP.includes('serviceSpeed: turnServiceSpeed || window.FastMode?.requestSpeed(turnModel, turnStats) })'));
    check('every later round reads it as it starts',
        TOOLS.includes('serviceSpeed: c.serviceSpeed || window.FastMode?.requestSpeed(c.model, c.turnStats) })'));
    check('the turn context carries the stats it marks', /context = \{[^\n]*turnStats\};/.test(APP));
    check('Build Started says whether it is on', /window\.track\?\.\('Build Started', \{[^\n]*fast_mode: !!window\.FastMode\?\.applies\(chosenModel\)/.test(APP));
    check('Build Completed says whether it ran', /'Build Completed',\s*\{[^\n]*fast_mode: !!turnStats\.fastMode,/.test(APP));
    check('Build Abandoned says whether it ran', /'Build Abandoned', \{[\s\S]{0,200}fast_mode: !!\(build\.stats && build\.stats\.fastMode\),/.test(APP));
    check('Usage Limit Hit says whether it ran', /function limitHitTurnProps[\s\S]{0,500}fast_mode: !!stats\.fastMode,/.test(APP));
    check('the Upgrade dialog lists it, and leads with it from fast mode',
        /\{ id: 'fast', title: 'Fast mode'/.test(UI) && /source === 'fast_mode' \|\| source === 'fast_mode_hint' \? 'fast'/.test(UI));
}

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall fast mode checks passed');
