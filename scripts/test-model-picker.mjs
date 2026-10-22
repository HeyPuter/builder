import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ---- The composer's AI model picker (premium) -------------------------------
// js/model-picker.js: who sees it (hidden / locked / open), what a project is
// set to, how a choice is kept on the project, and which model a turn may use.
// Runs the REAL model-picker.js and model-core.js with a small fake jQuery that
// records what the button and panel show.

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const pickerSource = read('../src/js/model-picker.js');
const modelSource = read('../src/js/model-core.js');
const helpers = read('../src/js/helpers.js');
const countAt = helpers.indexOf('function countUserMessages(history) {');
const countSource = helpers.slice(countAt, helpers.indexOf('\n}\n', countAt) + 2);

function setup({ user = { username: 'u' }, paid = false, flag = true, history, saved = false, lastPick = null, fresh, dom = null } = {}) {
    const button = { hidden: true, disabled: false, attrs: {}, label: '', focus: 0, panel: null };
    const handlers = [];
    const calls = { upgrade: [], track: [], toast: [], saves: [], announce: [] };
    const store = new Map(lastPick ? [['builder.lastModel', lastPick]] : []);
    const btnApi = {
        length: 1,
        prop(k, v) { button[k] = v; return btnApi; },
        attr(k, v) {
            if (typeof k === 'object') Object.assign(button.attrs, k);
            else if (v === undefined) return button.attrs[k];
            else button.attrs[k] = v;
            return btnApi;
        },
        find: () => ({ text: (t) => { button.label = t; } }),
        trigger: () => { button.focus++; return btnApi; },
        closest: () => ({ append: (p) => { button.panel = p.html; } }),
    };
    const panelApi = { remove: () => { button.panel = null; }, trigger: () => {} };
    const $ = (arg) => {
        if (arg && arg.__isDocument) return { on: (type, sel, fn) => handlers.push({ type, sel: typeof sel === 'string' ? sel : null, fn: typeof sel === 'function' ? sel : fn }) };
        if (arg === '.model-picker-btn') return btnApi;
        if (arg === '.model-picker-panel') return panelApi;
        if (arg === 'body') return { append: (p) => { button.panel = p.html; } };
        if (typeof arg === 'string' && arg.trim().startsWith('<')) return { html: arg };
        return { closest: () => ({ length: 0 }), attr: (k) => arg && arg.attrs && arg.attrs[k] };
    };
    const isPaid = (u) => !!(u && u.paid);
    // A fake layout for positionPanel: the composer's box, the chat column's
    // top edge, the window, and the panel's natural size.
    const panelEl = { style: {}, offsetWidth: 330, get offsetHeight() { return dom ? dom.natural : 0; } };
    const document = { __isDocument: true };
    if (dom) {
        document.documentElement = { clientWidth: dom.vw || 1200 };
        const composer = { getBoundingClientRect: () => dom.composer };
        const column = { getBoundingClientRect: () => ({ top: dom.column }) };
        const btnEl = { closest: (sel) => (sel === '.chat-input' ? composer : sel === '.chat' ? column : null) };
        document.querySelector = (sel) => (sel === '.model-picker-panel' ? (button.panel ? panelEl : null) : sel === '.model-picker-btn' ? btnEl : null);
    }
    const env = {
        console, Date, Promise, $, document, innerHeight: dom ? dom.vh : 800, innerWidth: dom ? (dom.vw || 1200) : 1200,
        localStorage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) },
        htmlEscape: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
        chatHistory: history || [{ role: 'system', content: [{ type: 'text', text: 'sys' }] }],
        savedChats: saved ? [{ id: 'c1' }] : [],
        currentChatId: 'c1',
        MODEL: 'claude-opus-5-5',
        scheduleSaveCurrentChat: (ctx) => calls.saves.push(ctx),
    };
    env.window = env;
    env.FEATURE_FLAGS = { modelPicker: flag };
    env.user = user ? { ...user, paid } : null;
    env.Branding = { isSubscribed: isPaid };
    env.check_svg = '<svg check/>';
    env.openUpgradeModal = (source) => calls.upgrade.push(source);
    env.track = (name, props) => calls.track.push({ name, props });
    env.showToast = (msg) => calls.toast.push(msg);
    env.announce = (msg) => calls.announce.push(msg);
    env.refreshUserPlan = async () => (fresh === undefined ? env.user : fresh);
    vm.createContext(env);
    vm.runInContext(countSource, env);
    vm.runInContext(modelSource, env);
    vm.runInContext(pickerSource, env);
    const P = env.ModelPicker;
    const fire = (type, sel, self = {}) => {
        const h = handlers.find((x) => x.type === type && x.sel === sel);
        assert.ok(h, 'handler for ' + sel);
        h.fn.call(self, { preventDefault() {}, stopPropagation() {}, key: self.key, target: {} });
    };
    const choose = (id) => fire('click', '.model-picker-panel .model-panel-option', { attrs: { 'data-model': id } });
    return { env, P, button, calls, store, fire, choose, panelEl };
}

const withMessages = (extra = {}) => [
    { role: 'system', content: [{ type: 'text', text: 'sys' }], ...extra },
    { role: 'user', content: 'build a cafe site' },
    { role: 'assistant', content: 'Done.' },
];

let failures = 0;
async function check(name, fn) {
    try { await fn(); console.log('ok   - ' + name); }
    catch (e) { failures++; console.log('FAIL - ' + name + '\n       ' + e.message); }
}

// ---- Who sees it --------------------------------------------------------------

await check('signed out or temporary: no picker', () => {
    const t = setup({ user: null });
    t.P.render();
    assert.equal(t.button.hidden, true);
    const temp = setup({ user: { username: 'tmp', is_temp: true }, paid: true });
    temp.P.render();
    assert.equal(temp.button.hidden, true);
});

await check('flag off: no picker, even on a paid plan', () => {
    const t = setup({ paid: true, flag: false });
    t.P.render();
    assert.equal(t.button.hidden, true);
});

await check('free plan: the button shows the model it builds with, Opus 5.5', () => {
    const t = setup({ history: withMessages({ buildModel: 'gemini-4-argon' }) });
    t.P.render();
    assert.equal(t.button.hidden, false);
    assert.equal(t.button.label, 'Opus 5.5');
    assert.equal(t.button.attrs['aria-label'], 'AI model: Claude Opus 5.5');
});

await check('free plan: the panel lists every model, others locked, with an upgrade offer', () => {
    const t = setup();
    t.P.render();
    t.fire('click', '.model-picker-btn');
    const html = t.button.panel;
    assert.ok(html, 'panel opened');
    for (const name of ['Claude Opus 5.5', 'Claude Sonnet 5.5', 'GPT-6.1 Sol', 'Gemini 4 Argon']) assert.ok(html.includes(name), name);
    assert.equal((html.match(/class="model-panel-option[^"]*locked/g) || []).length, 3);
    assert.ok(html.includes('Unlock every model with a paid Puter plan.'));
    assert.ok(html.includes('model-panel-upgrade'));
    assert.deepEqual(t.calls.track.map((x) => x.name), ['Model Picker Opened']);
});

await check('free plan: picking a locked model opens the upgrade dialog and changes nothing', () => {
    const t = setup({ history: withMessages(), saved: true });
    t.P.render();
    t.fire('click', '.model-picker-btn');
    t.choose('gpt-6.1-sol');
    assert.deepEqual([...t.calls.upgrade], ['model_picker']);
    assert.equal(t.env.chatHistory[0].buildModel, undefined);
    assert.equal(t.calls.saves.length, 0);
    assert.equal(t.button.panel, null, 'panel closed');
});

await check('the upsell button opens the upgrade dialog from the picker', () => {
    const t = setup();
    t.P.render();
    t.fire('click', '.model-picker-btn');
    t.fire('click', '.model-panel-upgrade');
    assert.deepEqual([...t.calls.upgrade], ['model_picker']);
});

// ---- Where the panel opens ---------------------------------------------------------
// The landing column scrolls, so a panel inside the composer was clipped when
// it opened above a composer with little room over it (the tagline area).

const placed = (t) => {
    const top = parseFloat(t.panelEl.style.top);
    const height = parseFloat(t.panelEl.style.maxHeight);
    return { top, height, bottom: top + height, left: parseFloat(t.panelEl.style.left) };
};

await check('room above the composer: the panel opens above it, in full', () => {
    const t = setup({ dom: { composer: { top: 600, bottom: 720, left: 100 }, column: 60, vh: 900, natural: 450 } });
    t.P.render();
    t.fire('click', '.model-picker-btn');
    const p = placed(t);
    assert.equal(p.height, 450);
    assert.equal(p.bottom, 600 - 8, 'ends just above the composer');
    assert.ok(p.top >= 68);
});

await check('little room above (the landing page): it opens below, in full', () => {
    const t = setup({ dom: { composer: { top: 330, bottom: 450, left: 100 }, column: 60, vh: 1100, natural: 530 } });
    t.P.render();
    t.fire('click', '.model-picker-btn');
    const p = placed(t);
    assert.equal(p.top, 450 + 8, 'starts just below the composer');
    assert.equal(p.height, 530);
    assert.ok(p.bottom <= 1100 - 8);
});

await check('a short window: the bigger side wins and the list scrolls, never past the toolbar', () => {
    const t = setup({ dom: { composer: { top: 300, bottom: 380, left: 100 }, column: 60, vh: 600, natural: 530 } });
    t.P.render();
    t.fire('click', '.model-picker-btn');
    const p = placed(t);
    assert.ok(p.top >= 60 + 8, `top ${p.top} stays below the chat column's top edge`);
    assert.ok(p.bottom <= 300 - 8, 'and above the composer');
    assert.ok(p.height < 530, 'capped, so the list scrolls');
});

await check('a narrow window: the panel stays inside it horizontally', () => {
    const t = setup({ dom: { composer: { top: 600, bottom: 700, left: 200 }, column: 60, vh: 900, natural: 400, vw: 360 } });
    t.P.render();
    t.fire('click', '.model-picker-btn');
    const p = placed(t);
    assert.ok(p.left >= 8);
    assert.ok(p.left + 330 <= 360 - 8 || p.left === 8);
});

// ---- Choosing on a paid plan ------------------------------------------------------

await check('paid: a new project shows the last pick', () => {
    const t = setup({ paid: true, lastPick: 'gpt-6.1-sol' });
    t.P.render();
    assert.equal(t.button.label, 'GPT-6.1 Sol');
});

await check('paid: a project from before the picker stays on Opus 5.5', () => {
    const t = setup({ paid: true, lastPick: 'gemini-4-argon', history: withMessages() });
    t.P.render();
    assert.equal(t.button.label, 'Opus 5.5');
});

await check('paid: the panel marks the current model, with no text under the list', () => {
    const t = setup({ paid: true, history: withMessages({ buildModel: 'claude-sonnet-5-5' }), saved: true });
    t.P.render();
    t.fire('click', '.model-picker-btn');
    const html = t.button.panel;
    assert.ok(/model-panel-option selected" data-model="claude-sonnet-5-5"/.test(html));
    assert.equal(html.includes('locked'), false);
    assert.equal(html.includes('model-panel-foot'), false);
    assert.equal(html.includes('model-panel-upsell'), false, 'no upgrade offer on a paid plan');
    assert.equal(html.includes('Beta'), false);
});

await check('paid: choosing a model on a new project sets it and remembers it as the last pick', () => {
    const t = setup({ paid: true, lastPick: 'gpt-6.1-sol' });
    t.P.render();
    t.fire('click', '.model-picker-btn');
    t.choose('gemini-4-argon');
    assert.equal(t.env.chatHistory[0].buildModel, 'gemini-4-argon');
    assert.equal(t.store.get('builder.lastModel'), 'gemini-4-argon');
    assert.equal(t.button.label, 'Gemini 4 Argon');
    assert.equal(t.calls.saves.length, 0, 'a new project saves the choice with its first message');
    const changed = t.calls.track.find((x) => x.name === 'Model Changed');
    assert.equal(changed.props.from, 'gpt-6.1-sol');
    assert.equal(changed.props.to, 'gemini-4-argon');
    assert.equal(changed.props.new_project, true);
});

await check('paid: choosing a model on a saved project saves it right away', () => {
    const t = setup({ paid: true, history: withMessages(), saved: true });
    t.P.render();
    t.fire('click', '.model-picker-btn');
    t.choose('claude-sonnet-5-5');
    assert.equal(t.env.chatHistory[0].buildModel, 'claude-sonnet-5-5');
    assert.equal(t.calls.saves.length, 1);
    assert.equal(t.calls.saves[0].currentChatId, 'c1');
    assert.equal(t.calls.saves[0].chatHistory, t.env.chatHistory);
});

await check('picking the current model changes nothing', () => {
    const t = setup({ paid: true, history: withMessages(), saved: true });
    t.P.render();
    t.fire('click', '.model-picker-btn');
    t.choose('claude-opus-5-5');
    assert.equal(t.calls.saves.length, 0);
    assert.equal(t.calls.track.some((x) => x.name === 'Model Changed'), false);
});

await check('an unknown model id from the page is ignored', () => {
    const t = setup({ paid: true, history: withMessages(), saved: true });
    t.P.render();
    t.choose('gpt-4o');
    assert.equal(t.env.chatHistory[0].buildModel, undefined);
});

await check('during a turn the picker is disabled and its panel closed', () => {
    const t = setup({ paid: true });
    t.P.render();
    t.fire('click', '.model-picker-btn');
    t.P.setBusy(true);
    assert.equal(t.button.disabled, true);
    assert.equal(t.button.panel, null);
    t.fire('click', '.model-picker-btn');
    assert.equal(t.button.panel, null, 'a busy picker does not open');
    t.P.setBusy(false);
    assert.equal(t.button.disabled, false);
});

await check('Escape closes the panel and returns focus to the button', () => {
    const t = setup({ paid: true });
    t.P.render();
    t.fire('click', '.model-picker-btn');
    const before = t.button.focus;
    t.fire('keydown', '.model-picker-panel', { key: 'Escape' });
    assert.equal(t.button.panel, null);
    assert.equal(t.button.focus, before + 1);
});

// ---- The turn hand-off --------------------------------------------------------------

await check('turn start: a new project is set to the last pick before its first message', () => {
    const t = setup({ paid: true, lastPick: 'gemini-4-argon' });
    assert.equal(t.P.claimForTurn(t.env.chatHistory), 'gemini-4-argon');
    assert.equal(t.env.chatHistory[0].buildModel, 'gemini-4-argon');
    t.store.set('builder.lastModel', 'gpt-6.1-sol');
    t.env.chatHistory.push({ role: 'user', content: 'go' });
    assert.equal(t.P.claimForTurn(t.env.chatHistory), 'gemini-4-argon', 'keeps the model it started on');
});

await check('turn start: an older project without a choice is set to Opus 5.5', () => {
    const t = setup({ paid: true, lastPick: 'gemini-4-argon', history: withMessages() });
    assert.equal(t.P.claimForTurn(t.env.chatHistory), 'claude-opus-5-5');
    assert.equal(t.env.chatHistory[0].buildModel, 'claude-opus-5-5');
});

await check('the default model needs no plan check', async () => {
    let checked = 0;
    const t = setup({ paid: true });
    t.env.refreshUserPlan = async () => { checked++; return t.env.user; };
    assert.equal(await t.P.allowedForTurn('claude-opus-5-5'), 'claude-opus-5-5');
    assert.equal(checked, 0);
});

await check('a paid plan builds with the project\'s model', async () => {
    const t = setup({ paid: true });
    assert.equal(await t.P.allowedForTurn('gpt-6.1-sol'), 'gpt-6.1-sol');
    assert.equal(t.calls.toast.length, 0);
});

await check('a plan that ended since the page loaded builds with Opus 5.5 and says so', async () => {
    const t = setup({ paid: true, fresh: { username: 'u', paid: false } });
    assert.equal(await t.P.allowedForTurn('gemini-4-argon'), 'claude-opus-5-5');
    assert.equal(t.calls.toast.length, 1);
    assert.ok(t.calls.toast[0].includes('Claude Opus 5.5'));
});

await check('flag off: a project set to another model builds with the default, silently', async () => {
    const t = setup({ paid: true, flag: false });
    assert.equal(await t.P.allowedForTurn('gemini-4-argon'), 'claude-opus-5-5');
    assert.equal(t.calls.toast.length, 0);
});

await check('the MODEL global still decides the default build', async () => {
    const t = setup({ paid: false });
    t.env.MODEL = 'claude-sonnet-5-5';
    assert.equal(await t.P.allowedForTurn('claude-opus-5-5'), 'claude-sonnet-5-5');
});

// ---- Never sent --------------------------------------------------------------------

await check('prepareHistoryForAI strips the project\'s model setting', () => {
    const at = helpers.indexOf('function prepareHistoryForAI(historyArray, modelId, opts) {');
    const body = helpers.slice(at, helpers.indexOf('\n}\n', at) + 2);
    assert.ok(/if \('buildModel' in msg\) \{\s*delete msg\.buildModel;/.test(body));
});

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll model picker checks passed');
