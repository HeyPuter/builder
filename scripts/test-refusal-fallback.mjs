import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ---- A request the model's safety system declines ---------------------------
// Anthropic's safety system can decline a request: Puter then ends the stream
// cleanly, with no text and no tool calls, and a usage line whose stopReason is
// "refusal". The builder read that as a finished turn, so the chat went
// silent: nothing saved, no error, and every later message was declined and
// charged the same way. Now:
//   * handleMessageStream throws a model_refusal error on that usage line and
//     runs none of the declined reply's tool calls (REAL handleMessageStream.js,
//     tools.js and model-core.js, puter.ai.chat scripted);
//   * the turn continues once on ModelCore.refusalFallback's model, which is
//     never offered in the picker but is sent and shaped like any Claude model;
//   * the switch is remembered per project in this browser only (the REAL
//     refusal-fallback block of app.js, against a fake localStorage);
//   * otherwise the refusal card is saved with isError: 'refusal', which every
//     existing truthy isError check (and older app versions) still handles.

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const streamSource = read('../src/js/handleMessageStream.js');
const toolsSource = read('../src/js/tools.js');
const modelSource = read('../src/js/model-core.js');
const APP = read('../src/js/app.js');
const HELP = read('../src/js/helpers.js');
const CSS = read('../src/css/styles.css');

let failures = 0;
async function check(name, fn) {
    try { await fn(); console.log('ok   - ' + name); }
    catch (e) { failures++; console.log('FAIL - ' + name + '\n       ' + e.message); }
}
const block = (src, name) => {
    const a = src.indexOf(`// ===== ${name} (start) =====`);
    const b = src.indexOf(`// ===== ${name} (end) =====`);
    if (a < 0 || b < 0 || b <= a) throw new Error('could not find the ' + name + ' block');
    return src.slice(a, b);
};

// ---- ModelCore: the fallback model ------------------------------------------
function modelCore(flags = { compaction: true }) {
    const sandbox = { window: { FEATURE_FLAGS: flags } };
    vm.createContext(sandbox);
    vm.runInContext(modelSource, sandbox);
    return sandbox.window.ModelCore;
}
const M = modelCore();
const plain = (x) => JSON.parse(JSON.stringify(x));

await check('Opus and Sonnet fall back to Fable 5.2; others have no fallback', () => {
    assert.equal(M.refusalFallback('claude-opus-5-5'), 'claude-fable-5-2');
    assert.equal(M.refusalFallback('claude-sonnet-5-5'), 'claude-fable-5-2');
    assert.equal(M.refusalFallback('claude-fable-5-2'), null, 'the fallback never falls back again');
    assert.equal(M.refusalFallback('gpt-6.1-sol'), null);
    assert.equal(M.refusalFallback('gemini-4-argon'), null);
    assert.equal(M.refusalFallback(undefined), null);
    assert.equal(M.refusalFallback('toString'), null, 'no prototype keys');
});

await check('the fallback model is not in the picker and is never a project\'s model', () => {
    assert.deepEqual(plain(M.ids()), ['claude-opus-5-5', 'claude-sonnet-5-5', 'gpt-6.1-sol', 'gemini-4-argon']);
    assert.equal(M.get('claude-fable-5-2'), null);
    assert.equal(M.projectModel({ stored: 'claude-fable-5-2' }), 'claude-opus-5-5');
    assert.equal(M.resolveTurnModel({ chosen: 'claude-fable-5-2', allowed: true, fallback: 'claude-fable-5-2' }), 'claude-opus-5-5');
});

await check('a request on the fallback model is built for it, not quietly for Opus', () => {
    const o = M.buildChatOptions('claude-fable-5-2', { tools: [] });
    assert.equal(o.model, 'claude-fable-5-2');
    assert.equal(o.provider, 'claude');
    assert.equal(o.reasoning_effort, 'high');
    assert.equal(o.stream, true);
    assert.equal(o.parallelToolCalls, true);
    assert.deepEqual(plain(o.compaction), { trigger_tokens: 250000 });
    assert.equal('serviceSpeed' in o, false);
    assert.equal(M.isClaude('claude-fable-5-2'), true);
    assert.equal(M.supportsPdf('claude-fable-5-2'), true);
    assert.equal(M.supportsGif('claude-fable-5-2'), true);
    assert.equal(M.supportsFast('claude-fable-5-2'), false, 'fast mode stays on Opus');
    assert.equal(M.labelOf('claude-fable-5-2'), 'Claude Fable 5.2');
    assert.equal(M.labelOf('claude-opus-5-5'), 'Claude Opus 5.5');
});

await check('the picker models build exactly as before', () => {
    const opus = M.buildChatOptions('claude-opus-5-5', { tools: [] });
    assert.equal(opus.model, 'claude-opus-5-5');
    assert.equal(opus.reasoning_effort, 'medium');
    assert.equal(M.buildChatOptions('nope').model, 'claude-opus-5-5', 'an unknown id is still the default');
    assert.equal(M.buildChatOptions('claude-sonnet-5-5').reasoning_effort, 'high');
});

await check('a Claude history goes to the fallback model unchanged (Claude shaping)', () => {
    const h = [
        { role: 'system', content: [{ type: 'text', text: 'common', cache_control: { type: 'ephemeral', ttl: '1h' } }] },
        { role: 'user', content: [{ type: 'text', text: 'hi' }] },
        { role: 'assistant', content: { type: 'tool_use', id: 't', name: 'ViewImage', input: {} }, model: 'claude-opus-5-5' },
        { role: 'user', content: { type: 'tool_result', tool_use_id: 't', content: [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'x' } }] } },
    ];
    const out = M.shapeHistory(JSON.parse(JSON.stringify(h)), 'claude-fable-5-2');
    const expected = JSON.parse(JSON.stringify(h));
    delete expected[2].model;
    assert.deepEqual(plain(out), expected, 'images stay in the tool result, cache markers stay');
});

await check('a summary the fallback model compacts into is read back on later requests', () => {
    const h = [
        { role: 'system', content: 's' },
        { role: 'user', content: 'old' },
        { role: 'assistant', content: [{ type: 'compaction', id: 'c', encrypted_content: 'SUMMARY' }], compaction: true, model: 'claude-fable-5-2' },
        { role: 'assistant', content: 'after' },
        { role: 'user', content: 'new' },
    ];
    // The summary leads the assistant turn after it: [system, summary + 'after', 'new'].
    const expected = [
        { role: 'system', content: 's' },
        { role: 'assistant', content: [{ type: 'compaction', id: 'c', encrypted_content: 'SUMMARY' }, { type: 'text', text: 'after' }] },
        { role: 'user', content: 'new' },
    ];
    for (const target of ['claude-fable-5-2', 'claude-opus-5-5']) {
        assert.deepEqual(plain(M.fromLastCompaction(h, target)), expected, target + ': cut at the fallback model\'s summary');
    }
    // An Opus summary is read on the fallback model the same way.
    const opusMade = JSON.parse(JSON.stringify(h));
    opusMade[2].model = 'claude-opus-5-5';
    assert.deepEqual(plain(M.fromLastCompaction(opusMade, 'claude-fable-5-2')), expected);
    // A summary from a model nobody knows is still skipped, as before.
    const unknown = JSON.parse(JSON.stringify(h));
    unknown[2].model = 'claude-unknown';
    assert.equal(plain(M.fromLastCompaction(unknown, 'claude-opus-5-5')).some((m) => m.content === 'old'), true);
});

// ---- handleMessageStream: the refusal ends the reply -------------------------
async function* chunks(...items) { yield* items; }
const tool = (name, id) => ({ type: 'tool_use', id, name, input: { path: id }, text: '' });
const usage = (extra = {}) => ({ type: 'usage', usage: { usd_cents: 1, input_tokens: 100, output_tokens: 10 }, ...extra });
const refusalUsage = () => ({
    type: 'usage', stopReason: 'refusal', finish_reason: 'content_filter',
    stopDetails: { type: 'refusal', category: 'reasoning_extraction', explanation: 'declined' },
    usage: { usd_cents: 37.6, input_tokens: 92689, cache_read_input_tokens: 26431, output_tokens: 0 },
});
const text = (t) => ({ type: 'text', text: t });

function setup(rounds, { model = 'claude-opus-5-5' } = {}) {
    const executed = [];
    const requests = [];
    const bubbles = [];
    const jq = () => { const b = { length: 1, find: () => ({ html() {} }), attr() {}, remove() { b.removed = true; } }; bubbles.push(b); return b; };
    const env = {
        AbortController, DOMException, setTimeout, clearTimeout, console,
        currentChatId: 'one', shouldStop: false,
        marked: { parse: (s) => s },
        escapeMarkdownSource: (s) => s,
        $: () => ({ length: 0 }),
        hasActiveTodos: () => false,
        appendMessage: jq,
        autoScrollTrigger() {},
        createThinkingPreview: () => ({ append() {}, remove() {} }),
        isStaleTurn: (c) => c.currentChatId !== env.currentChatId,
        isAborted: (ac) => !!(ac && ac.signal.aborted),
        showSpinner() {}, startSpinnerStub() {}, stopSpinnerStub() {},
        scheduleSaveCurrentChat() {},
        generateMessageId: () => 'msg',
        prepareHistoryForAI: (h, m) => ({ history: JSON.parse(JSON.stringify(h)), model: m }),
        puter: {
            ai: {
                chat: async (prepared, opts) => {
                    requests.push({ prepared, opts });
                    const next = rounds.shift();
                    return chunks(...(next || [text('Done'), usage()]));
                },
            },
        },
    };
    env.window = env;
    vm.createContext(env);
    vm.runInContext(modelSource, env);
    vm.runInContext(streamSource, env);
    vm.runInContext(toolsSource, env);
    const makeTool = (name) => ({
        type: 'function',
        function: { name, parameters: { type: 'object', properties: {} } },
        exec: async (args) => { executed.push(`${name}:${args && args.path}`); return { success: true }; },
    });
    env.isMutatingTool = (n) => n === 'write';
    env.tools.push(makeTool('write'));
    const context = {
        currentChatId: 'one', abortController: new AbortController(), model,
        tools: env.tools, chatHistory: [{ role: 'user', content: 'go' }], currentMessage: null, currentMessageContent: '',
    };
    return { env, context, executed, requests, bubbles };
}
async function rejection(p) {
    try { await p; } catch (e) { return e; }
    throw new Error('expected the stream to throw');
}

await check('a refusal on the first reply throws model_refusal, with its category and model', async () => {
    const h = setup([]);
    const err = await rejection(h.env.handleMessageStream(chunks(refusalUsage()), h.context));
    assert.equal(err.code, 'model_refusal');
    assert.equal(err.name, 'ModelRefusalError');
    assert.equal(err.refusal.category, 'reasoning_extraction');
    assert.equal(err.model, 'claude-opus-5-5');
    assert.equal(h.env.isModelRefusal(err), true);
    assert.equal(h.context.chatHistory.length, 1, 'nothing was added to the conversation');
    assert.equal(h.requests.length, 0, 'no further request');
});

await check('the declined request\'s usage is still recorded (it was charged)', async () => {
    const h = setup([]);
    await rejection(h.env.handleMessageStream(chunks(refusalUsage()), h.context));
    assert.equal(h.context.pendingUsage.cents, 37.6);
    assert.equal(h.context.pendingUsage.input, 92689);
    assert.equal(h.context.pendingUsage.cacheRead, 26431);
});

await check('a reply declined after it began: its tool calls never run and its text is not saved', async () => {
    const h = setup([]);
    const err = await rejection(h.env.handleMessageStream(chunks(text('Sure, '), tool('write', 'a'), refusalUsage()), h.context));
    assert.equal(err.code, 'model_refusal');
    assert.deepEqual(h.executed, [], 'the declined call did not run');
    assert.equal(h.context.chatHistory.length, 1, 'no assistant message or tool call stored');
    assert.equal(h.context.currentMessageContent, 'Sure, ', 'the partial text is left for the caller to remove');
});

await check('a refusal in a later round keeps the earlier rounds, then throws', async () => {
    const h = setup([[refusalUsage()]]);
    const err = await rejection(h.env.handleMessageStream(chunks(tool('write', 'a'), usage()), h.context));
    assert.equal(err.code, 'model_refusal');
    assert.deepEqual(h.executed, ['write:a'], 'round one ran');
    const roles = h.context.chatHistory.map((m) => m.role);
    assert.deepEqual(roles, ['user', 'assistant', 'user'], 'its call and result are kept for the retry to resume from');
    assert.equal(h.context.chatHistory[2].content.type, 'tool_result');
});

await check('a normal reply is untouched (no false refusals)', async () => {
    const h = setup([]);
    await h.env.handleMessageStream(chunks(text('Hello'), usage({ stopReason: 'end_turn' })), h.context);
    assert.equal(h.context.chatHistory.at(-1).content, 'Hello');
    const h2 = setup([]);
    await h2.env.handleMessageStream(chunks(tool('write', 'a'), usage({ stopReason: 'tool_use' })), h2.context);
    assert.deepEqual(h2.executed, ['write:a']);
    const h3 = setup([]);
    await h3.env.handleMessageStream(chunks(text('Cut'), usage({ stopReason: 'max_tokens' })), h3.context);
    assert.equal(h3.context.chatHistory.at(-1).content, 'Cut');
});

await check('a turn on the fallback model sends its requests to that model', async () => {
    const h = setup([], { model: 'claude-fable-5-2' });
    await h.env.handleMessageStream(chunks(tool('write', 'a'), usage()), h.context);
    assert.equal(h.requests.length, 1);
    assert.equal(h.requests[0].opts.model, 'claude-fable-5-2');
    assert.equal(h.requests[0].prepared.model, 'claude-fable-5-2');
});

await check('a model_refusal is never classed as a transient failure', () => {
    const extA = HELP.indexOf('function extractErrorText(error) {');
    const extB = HELP.indexOf('// Map a raw');
    const extractErrorText = new Function(HELP.slice(extA, extB) + '\nreturn extractErrorText;')();
    const { isTransientTurnError } = new Function('extractErrorText',
        block(APP, 'transient-retry-classifier') + '\nreturn { isTransientTurnError };')(extractErrorText);
    const h = setup([]);
    const err = h.env.modelRefusalError({ category: 'cyber' }, 'claude-opus-5-5');
    assert.equal(isTransientTurnError(err), false);
});

// ---- app.js: who falls back, and remembering it ----------------------------
function refusalBlock({ flag = true, user = { username: 'a', subscribed: true }, storage } = {}) {
    const store = storage || new Map();
    const localStorage = {
        getItem: (k) => (store.has(k) ? store.get(k) : null),
        setItem: (k, v) => { store.set(k, String(v)); },
    };
    const toasts = [];
    const sandbox = {
        localStorage, console, Date, JSON, Object,
        window: {
            FEATURE_FLAGS: { refusalFallback: flag, compaction: true },
            user,
            Branding: { isSubscribed: (u) => !!(u && u.subscribed) },
            showToast: (m, o) => toasts.push([m, o && o.key]),
        },
        htmlEscape: (s) => String(s),
        errorCardHTML: (m) => `<card>${m}</card>`,
        appendMessage: (html) => html,
    };
    vm.createContext(sandbox);
    vm.runInContext(modelSource, sandbox);
    // Without a document the click handler isn't registered (guarded).
    vm.runInContext(block(APP, 'refusal-fallback') + `
        this.api = { refusalFallbackFor, refusalFallbackRemember, refusalFallbackRemembered, refusalFallbackToast,
            refusalCardHTML, appendRefusalCard, refusalCardText, REFUSAL_CARD_TEXT, REFUSAL_CARD_TEXT_OTHER,
            REFUSAL_FALLBACK_KEY, REFUSAL_FALLBACK_TTL_MS };`, sandbox);
    return { api: sandbox.api, store, toasts };
}

await check('a paid plan falls back; free, temporary, signed-out and flag-off do not', () => {
    assert.equal(refusalBlock().api.refusalFallbackFor('claude-opus-5-5'), 'claude-fable-5-2');
    assert.equal(refusalBlock({ user: { subscribed: false } }).api.refusalFallbackFor('claude-opus-5-5'), null);
    assert.equal(refusalBlock({ user: { subscribed: true, is_temp: true } }).api.refusalFallbackFor('claude-opus-5-5'), null);
    assert.equal(refusalBlock({ user: null }).api.refusalFallbackFor('claude-opus-5-5'), null);
    assert.equal(refusalBlock({ flag: false }).api.refusalFallbackFor('claude-opus-5-5'), null);
    assert.equal(refusalBlock().api.refusalFallbackFor('claude-fable-5-2'), null);
    assert.equal(refusalBlock().api.refusalFallbackFor('gpt-6.1-sol'), null);
});

await check('the switch is remembered for that project only', () => {
    const { api } = refusalBlock();
    assert.equal(api.refusalFallbackRemembered('p1', 'claude-opus-5-5'), null, 'nothing before a refusal');
    api.refusalFallbackRemember('p1', 'claude-opus-5-5', 'claude-fable-5-2');
    assert.equal(api.refusalFallbackRemembered('p1', 'claude-opus-5-5'), 'claude-fable-5-2');
    assert.equal(api.refusalFallbackRemembered('p2', 'claude-opus-5-5'), null, 'another project starts on its own model');
    assert.equal(api.refusalFallbackRemembered('p1', 'claude-sonnet-5-5'), null, 'only for the model that declined');
});

await check('a remembered switch lapses: after 30 days, on a free plan, or with the flag off', () => {
    const storage = new Map();
    const a = refusalBlock({ storage });
    a.api.refusalFallbackRemember('p1', 'claude-opus-5-5', 'claude-fable-5-2');
    const saved = JSON.parse(storage.get(a.api.REFUSAL_FALLBACK_KEY));
    saved.p1.at = Date.now() - a.api.REFUSAL_FALLBACK_TTL_MS - 1000;
    storage.set(a.api.REFUSAL_FALLBACK_KEY, JSON.stringify(saved));
    assert.equal(a.api.refusalFallbackRemembered('p1', 'claude-opus-5-5'), null, 'expired');
    const b = refusalBlock({ user: { subscribed: false } });
    b.api.refusalFallbackRemember('p1', 'claude-opus-5-5', 'claude-fable-5-2');
    assert.equal(b.api.refusalFallbackRemembered('p1', 'claude-opus-5-5'), null, 'free plan');
    const fresh = new Map();
    refusalBlock({ storage: fresh }).api.refusalFallbackRemember('p1', 'claude-opus-5-5', 'claude-fable-5-2');
    assert.equal(refusalBlock({ storage: fresh, flag: false }).api.refusalFallbackRemembered('p1', 'claude-opus-5-5'), null, 'flag off');
});

await check('broken or unavailable storage never throws into a turn', () => {
    const storage = new Map([['builder.refusalFallback', '{not json']]);
    const { api } = refusalBlock({ storage });
    assert.equal(api.refusalFallbackRemembered('p1', 'claude-opus-5-5'), null);
    api.refusalFallbackRemember('p1', 'claude-opus-5-5', 'claude-fable-5-2');
    assert.equal(api.refusalFallbackRemembered('p1', 'claude-opus-5-5'), 'claude-fable-5-2', 'rewritten cleanly');
    storage.set('builder.refusalFallback', '[1,2]');
    assert.equal(api.refusalFallbackRemembered('p1', 'claude-opus-5-5'), null, 'an array is ignored');
    // A browser that throws on every access (private mode, blocked storage).
    const sandbox = { localStorage: { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } },
        console, Date, JSON, Object,
        window: { FEATURE_FLAGS: { refusalFallback: true }, user: { subscribed: true }, Branding: { isSubscribed: () => true } } };
    vm.createContext(sandbox);
    vm.runInContext(modelSource, sandbox);
    vm.runInContext(block(APP, 'refusal-fallback') + 'this.api = { refusalFallbackRemember, refusalFallbackRemembered };', sandbox);
    sandbox.api.refusalFallbackRemember('p1', 'claude-opus-5-5', 'claude-fable-5-2');
    assert.equal(sandbox.api.refusalFallbackRemembered('p1', 'claude-opus-5-5'), null);
});

await check('the remembered list is capped, keeping the newest', () => {
    const storage = new Map();
    const { api } = refusalBlock({ storage });
    const many = {};
    for (let i = 0; i < 150; i++) many['old' + i] = { from: 'claude-opus-5-5', to: 'claude-fable-5-2', at: Date.now() - 100000 + i };
    storage.set(api.REFUSAL_FALLBACK_KEY, JSON.stringify(many));
    api.refusalFallbackRemember('newest', 'claude-opus-5-5', 'claude-fable-5-2');
    const saved = JSON.parse(storage.get(api.REFUSAL_FALLBACK_KEY));
    assert.equal(Object.keys(saved).length, 100);
    assert.ok(saved.newest);
    assert.equal(saved.old0, undefined, 'the oldest went');
});

await check('the card says who declined it, that it isn\'t the user\'s fault, and offers a fresh chat', () => {
    const { api, toasts } = refusalBlock();
    assert.match(api.REFUSAL_CARD_TEXT, /Anthropic/);
    assert.match(api.REFUSAL_CARD_TEXT, /isn't a problem with your project or your Puter account/);
    const html = api.refusalCardHTML(api.REFUSAL_CARD_TEXT);
    assert.ok(html.startsWith('<card>'), 'the standard error card');
    assert.match(html, /class="refusal-new-chat-btn"[^>]*>Continue in a new chat</);
    api.refusalFallbackToast('p1', 'claude-opus-5-5', 'claude-fable-5-2');
    api.refusalFallbackToast('p1', 'claude-opus-5-5', 'claude-fable-5-2');
    assert.equal(toasts.length, 2, 'throttling is showToast\'s job (same key)');
    assert.equal(toasts[0][1], 'refusal-fallback-p1');
    assert.match(toasts[0][0], /Claude Fable 5\.2.*Anthropic's safety system.*Claude Opus 5\.5/);
});

await check('the card names Anthropic only for a Claude model', () => {
    const { api } = refusalBlock();
    assert.equal(api.refusalCardText('claude-opus-5-5'), api.REFUSAL_CARD_TEXT);
    assert.equal(api.refusalCardText('claude-fable-5-2'), api.REFUSAL_CARD_TEXT);
    assert.equal(api.refusalCardText('gpt-6.1-sol'), api.REFUSAL_CARD_TEXT_OTHER);
    assert.equal(api.refusalCardText('gemini-4-argon'), api.REFUSAL_CARD_TEXT_OTHER);
    assert.doesNotMatch(api.REFUSAL_CARD_TEXT_OTHER, /Anthropic|Claude/);
    assert.match(api.REFUSAL_CARD_TEXT_OTHER, /isn't a problem with your project or your Puter account/);
});

await check('the button tells the user when the project is already being copied', () => {
    const fn = APP.slice(APP.indexOf('async function continueInNewChat(btn) {'));
    const guard = fn.indexOf('_duplicatingChats.has(chatId)');
    assert.ok(guard > 0 && guard < fn.indexOf("$btn.prop('disabled', true)"), 'checked before the button is disabled');
    assert.match(fn.slice(guard, guard + 300), /showToast\?\.\('This project is already being copied/);
});

await check('a fallback model\'s summary is stamped with a model every app version knows', async () => {
    assert.equal(M.stampModel('claude-fable-5-2'), 'claude-opus-5-5');
    assert.equal(M.stampModel('claude-opus-5-5'), 'claude-opus-5-5');
    assert.equal(M.stampModel('gpt-6.1-sol'), 'gpt-6.1-sol');
    assert.equal(M.stampModel('unknown-x'), 'unknown-x');
    // Through the real stream: a compaction chunk on a turn running on the fallback.
    const h = setup([], { model: 'claude-fable-5-2' });
    await h.env.handleMessageStream(chunks({ type: 'compaction', id: 'c1', encrypted_content: 'SUM' }, text('ok'), usage()), h.context);
    const entry = h.context.chatHistory.find((m) => m.compaction === true);
    assert.equal(entry.model, 'claude-opus-5-5');
    // And an Opus turn's stamp is unchanged.
    const o = setup([], { model: 'claude-opus-5-5' });
    await o.env.handleMessageStream(chunks({ type: 'compaction', id: 'c2', encrypted_content: 'SUM' }, text('ok'), usage()), o.context);
    assert.equal(o.context.chatHistory.find((m) => m.compaction === true).model, 'claude-opus-5-5');
    // The original (pre-change) lookup reads it back: get() knows the stamp.
    assert.ok(M.get(entry.model));
});

// ---- app.js: the turn's invariants (text) ------------------------------------
const send = APP.slice(APP.indexOf('async function sendChatMessage('));

await check('refusalSwitched is declared at the function\'s top level, so the catch can read it', () => {
    // Four spaces: sendChatMessage's own scope, beside the other turn state
    // the catch reads (turnServiceSpeed), not inside its try block.
    assert.match(send, /\n    let turnServiceSpeed;\n(?:    \/\/[^\n]*\n)+    let refusalSwitched = false;\n/);
    assert.equal(send.split('let refusalSwitched').length - 1, 1, 'declared once');
    const decl = send.indexOf('let refusalSwitched = false;');
    const outerCatch = send.indexOf('} catch (error) {');
    assert.ok(decl > 0 && decl < outerCatch);
});

await check('the retry loop handles a refusal before the transient check, once, then resumes', () => {
    const loop = send.slice(send.indexOf('} catch (streamError) {'));
    const refusal = loop.indexOf('isModelRefusal(streamError)');
    const transient = loop.indexOf('isTransientTurnError(streamError)');
    assert.ok(refusal > 0 && refusal < transient, 'refusal branch first');
    const branch = loop.slice(refusal, transient);
    assert.match(branch, /refusalSwitched \? null : refusalFallbackFor\(from\)/, 'at most once per turn');
    assert.match(branch, /if \(!next\) throw streamError;/, 'no fallback: to the card');
    assert.match(branch, /removeUncommittedBubble\(context\)/, 'the declined text is dropped');
    assert.match(branch, /flushTurnUsage\(context\)/, 'the declined request\'s cost is kept');
    assert.match(branch, /window\.setSpinnerLabel\?\.\(''\)/, 'the declined reply\'s tool status is cleared');
    assert.match(branch, /turnServiceSpeed = undefined;/, 'no fast tier on the fallback');
    assert.match(branch, /turnTools = window\.getTurnTools\(turnModel\)/);
    assert.match(branch, /refusalFallbackRemember\(turnChatId, from, next\)/);
    assert.match(branch, /prepareResumeHistory\(turnSaveContext\.chatHistory\);\s*continue;/, 'resumes like a retry');
    assert.doesNotMatch(branch, /attempt\+\+/, 'not counted against the retry budget');
    assert.match(loop.slice(refusal - 80, refusal + 40), /if \(active && typeof isModelRefusal === 'function' && isModelRefusal\(streamError\)\)/, 'only for the live, unstopped turn');
});

await check('a remembered switch is applied after the plan check, never with a fast tier, before the tools', () => {
    const allowed = send.indexOf('turnModel = await window.ModelPicker.allowedForTurn(chosenModel);');
    const speed = send.indexOf('turnServiceSpeed = isFirstBuildTurn');
    const started = send.indexOf('window.FastMode?.turnStarted?.({ model: turnModel, fast: !!turnServiceSpeed });');
    const remembered = send.indexOf('refusalFallbackRemembered(turnChatId, turnModel)');
    const tools = send.indexOf('let turnTools = window.getTurnTools(turnModel);');
    assert.ok(allowed > 0 && allowed < speed && speed < started && started < remembered && remembered < tools,
        JSON.stringify({ allowed, speed, started, remembered, tools }));
    assert.match(send.slice(started, remembered), /BuildNotify\?\.turnStarted[\s\S]*if \(!turnServiceSpeed\) \{\s*const remembered = $/);
    // Fast mode is told the model the turn switched to.
    assert.match(send.slice(remembered, tools), /turnModel = remembered;\s*window\.FastMode\?\.turnStarted\?\.\(\{ model: turnModel, fast: false \}\);/);
});

await check('with no fallback the refusal card is shown and saved as isError: \'refusal\'', () => {
    const outer = send.slice(send.indexOf('}else if(typeof isModelRefusal === \'function\' && isModelRefusal(error)){'));
    assert.ok(outer.length > 0);
    const branch = outer.slice(0, outer.indexOf('}else{'));
    assert.match(branch, /const refusalText = refusalCardText\(error\.model \|\| turnModel\);/);
    assert.match(branch, /appendRefusalCard\(refusalText\)/);
    assert.match(branch, /chatHistory\.push\(\{ role: "assistant", content: refusalText, isError: 'refusal' \}\)/);
    assert.match(branch, /removeUncommittedBubble\(context\)/);
    // The catch marks it errored (no Resume banner, queued messages handed back).
    const guard = send.slice(send.indexOf('if (!shouldStop && !activeTurnInterrupted && turnChatId === currentChatId && turnSeq === _turnSeq) {'));
    assert.ok(guard.indexOf('turnErrored = true;') < guard.indexOf('isModelRefusal(error)'));
});

await check('a reload draws the refusal card again; any other error is drawn as before', () => {
    const load = APP.slice(APP.indexOf('async function loadChat('));
    const at = load.indexOf("if (message.isError === 'refusal') {");
    assert.ok(at > 0);
    const seg = load.slice(at, at + 400);
    assert.match(seg, /appendRefusalCard\(message\.content\);\s*\} else if \(message\.isError\) \{\s*appendErrorMessage\(message\.content\);/);
});

await check('isError: \'refusal\' is stripped before sending, like every error card', () => {
    // prepareHistoryForAI removes any truthy isError (older app versions too).
    assert.match(HELP, /if \(msg\.isError\) \{\s*delete msg\.isError;/);
    // No strict comparison on a chat message's marker would miss the string
    // value. (An MCP tool response's own isError, in tools.js, is unrelated.)
    const all = [APP, HELP, streamSource, toolsSource].join('\n');
    const strict = all.match(/[\w?.]*\.isError\s*(?:===|!==)\s*[^\s;)]+/g) || [];
    assert.deepEqual(strict.filter((s) => !/toolResponse\?\.isError === true/.test(s) && s !== "message.isError === 'refusal'"), [], JSON.stringify(strict));
});

await check('the feature has a kill switch, on', () => {
    assert.match(HELP, /refusalFallback: true,/);
});

await check('the new styles exist for light and dark', () => {
    assert.match(CSS, /\.refusal-switch-message \{|\.refusal-switch-message,|,\s*\.refusal-switch-message/);
    assert.match(CSS, /\.refusal-card-actions \{/);
    assert.match(CSS, /\.refusal-new-chat-btn \{|,\s*\.refusal-new-chat-btn \{/);
    assert.match(CSS, /html\[data-theme="dark"\] \.refusal-new-chat-btn/);
});

if (failures) { console.error(`\n${failures} refusal-fallback check(s) failed`); process.exit(1); }
console.log('\nAll refusal-fallback checks passed');
