import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ---- A reply's tool calls run together, after the reply is complete ---------
// GPT and Gemini put several tool calls in one reply (and so does Opus when
// Puter serves it through a reseller). handleMessageStream used to run each
// call the moment it arrived and start the next model round from inside it,
// so calls 2..N of a reply ran after the rest of the turn, late and over newer
// files. Now the calls wait for the reply's usage line and run as one batch,
// stored as one assistant message. Runs the REAL handleMessageStream.js,
// tools.js and model-core.js together, with puter.ai.chat scripted.

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const streamSource = read('../src/js/handleMessageStream.js');
const toolsSource = read('../src/js/tools.js');
const modelSource = read('../src/js/model-core.js');

async function* chunks(...items) { yield* items; }
const tool = (name, id, input = { path: id }) => ({ type: 'tool_use', id, name, input, text: '' });
const usage = (extra = {}) => ({ type: 'usage', usage: { usd_cents: 1, output_tokens: 10 }, ...extra });
const text = (t) => ({ type: 'text', text: t });

function setup(rounds, { model = 'gemini-4-argon' } = {}) {
    const executed = [];
    const requests = [];
    const jq = () => ({ length: 0, find: () => ({ html() {} }), attr() {}, remove() {} });
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
                    requests.push({ prepared, opts, executedSoFar: executed.slice() });
                    const next = rounds.shift();
                    if (typeof next === 'function') return next();
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
    env.tools.push(makeTool('write'), makeTool('TodoWrite'), makeTool('update_preview'));
    const context = {
        currentChatId: 'one', abortController: new AbortController(), model,
        tools: env.tools, chatHistory: [], currentMessage: null, currentMessageContent: '',
    };
    return { env, context, executed, requests };
}

const toolUseMessages = (h) => h.filter((m) => m.role === 'assistant' && m.content && typeof m.content === 'object');
const toolResults = (h) => h.filter((m) => m.role === 'user' && m.content && m.content.type === 'tool_result');

let failures = 0;
async function check(name, fn) {
    try { await fn(); console.log('ok   - ' + name); }
    catch (e) { failures++; console.log('FAIL - ' + name + '\n       ' + e.message); }
}

await check('two calls in one reply run in order, before the next model round', async () => {
    const h = setup([]);
    await h.env.handleMessageStream(chunks(tool('write', 'a'), tool('write', 'b'), usage()), h.context);
    assert.deepEqual(h.executed, ['write:a', 'write:b']);
    assert.equal(h.requests.length, 1, 'one follow-up round, not one per call');
    assert.deepEqual(h.requests[0].executedSoFar, ['write:a', 'write:b'], 'both ran before it');
});

await check('the batch is stored as one assistant message, then one result per call', async () => {
    const h = setup([]);
    await h.env.handleMessageStream(chunks(tool('write', 'a'), tool('TodoWrite', 'b'), usage()), h.context);
    const uses = toolUseMessages(h.context.chatHistory);
    assert.equal(uses.length, 1);
    assert.ok(Array.isArray(uses[0].content));
    assert.deepEqual(Array.from(uses[0].content, (b) => b.id), ['a', 'b']);
    assert.ok(uses[0].content.every((b) => !('text' in b)), 'the chunks\' empty text keys are dropped');
    assert.deepEqual(Array.from(toolResults(h.context.chatHistory), (m) => m.content.tool_use_id), ['a', 'b']);
    const idx = h.context.chatHistory.indexOf(uses[0]);
    assert.equal(h.context.chatHistory[idx + 1].content.tool_use_id, 'a', 'results follow their calls directly');
});

await check('a single call is still stored as a plain object (Claude history unchanged)', async () => {
    const h = setup([], { model: 'claude-opus-5-5' });
    await h.env.handleMessageStream(chunks(tool('write', 'a'), usage()), h.context);
    const uses = toolUseMessages(h.context.chatHistory);
    assert.equal(uses.length, 1);
    assert.equal(Array.isArray(uses[0].content), false);
    assert.equal(uses[0].content.id, 'a');
    assert.equal('text' in uses[0].content, false);
});

await check('the tool_use message is stamped with the turn\'s model', async () => {
    const h = setup([], { model: 'gpt-6.1-sol' });
    await h.env.handleMessageStream(chunks(tool('write', 'a'), usage()), h.context);
    assert.equal(toolUseMessages(h.context.chatHistory)[0].model, 'gpt-6.1-sol');
});

await check('later rounds keep the turn\'s model, options and history shape', async () => {
    const h = setup([], { model: 'gpt-6.1-sol' });
    await h.env.handleMessageStream(chunks(tool('write', 'a'), usage()), h.context);
    const { prepared, opts } = h.requests[0];
    assert.equal(prepared.model, 'gpt-6.1-sol', 'prepareHistoryForAI is told the model');
    assert.equal(opts.model, 'gpt-6.1-sol');
    assert.equal(opts.provider, 'openai-responses');
    assert.equal(opts.parallelToolCalls, false);
});

await check('narration around the calls is saved as one message ahead of them', async () => {
    const h = setup([]);
    await h.env.handleMessageStream(chunks(text('On it. '), tool('write', 'a'), text('Also this.'), tool('write', 'b'), usage()), h.context);
    const firstUse = h.context.chatHistory.findIndex((m) => m.role === 'assistant' && typeof m.content === 'object');
    assert.equal(h.context.chatHistory[firstUse - 1].content, 'On it. Also this.');
});

await check('a reply cut off at the output limit: its last call is answered, not run', async () => {
    const h = setup([]);
    await h.env.handleMessageStream(chunks(tool('write', 'a'), tool('write', 'b', {}), usage({ stopReason: 'max_tokens' })), h.context);
    assert.deepEqual(h.executed, ['write:a']);
    const results = toolResults(h.context.chatHistory);
    const b = results.find((m) => m.content.tool_use_id === 'b');
    assert.ok(b && b.content.is_error, 'the cut-off call gets an error result');
    assert.ok(String(b.content.content).includes('cut off'));
    assert.ok(toolUseMessages(h.context.chatHistory)[0].content.every((x) => !('_cutOff' in x)), 'the marker is not stored');
});

await check('finish_reason "length" counts as cut off too', async () => {
    const h = setup([]);
    await h.env.handleMessageStream(chunks(tool('write', 'a', {}), usage({ finish_reason: 'length' })), h.context);
    assert.deepEqual(h.executed, []);
});

await check('a reply that ends in an error runs none of its calls and leaves nothing dangling', async () => {
    const h = setup([]);
    await assert.rejects(h.env.handleMessageStream(chunks(tool('write', 'a'), { type: 'error', message: 'Overloaded' }), h.context));
    assert.deepEqual(h.executed, []);
    assert.equal(toolUseMessages(h.context.chatHistory).length, 0);
});

await check('a stream that ends without its usage line still runs its calls', async () => {
    const h = setup([]);
    await h.env.handleMessageStream(chunks(tool('write', 'a'), tool('write', 'b')), h.context);
    assert.deepEqual(h.executed, ['write:a', 'write:b']);
});

await check('silence after a call is not the end of the reply: nothing runs until it ends', async () => {
    // Puter sends each call only once it is complete, so a healthy reply can
    // be silent for minutes while it writes the next one. Running the first
    // call during that silence started a new round before the second arrived.
    let release;
    const gate = new Promise((r) => { release = r; });
    async function* slow() { yield tool('write', 'a'); await gate; yield tool('write', 'b'); yield usage(); }
    const h = setup([]);
    const run = h.env.handleMessageStream(slow(), h.context);
    await new Promise((r) => setTimeout(r, 50));
    assert.deepEqual(h.executed, [], 'the first call waits for the rest of the reply');
    release();
    await run;
    assert.deepEqual(h.executed, ['write:a', 'write:b']);
    assert.equal(h.requests.length, 1, 'one follow-up round for the whole reply');
});

await check('a connection that dies mid-reply runs nothing, and Stop ends the turn', async () => {
    async function* dies() { yield tool('write', 'a'); await new Promise(() => {}); }
    const h = setup([]);
    const run = h.env.handleMessageStream(dies(), h.context);
    await new Promise((r) => setTimeout(r, 50));
    assert.deepEqual(h.executed, []);
    h.context.abortController.abort();
    await run.catch(() => {});
    assert.deepEqual(h.executed, [], 'the unfinished reply\'s call never runs');
    assert.equal(h.requests.length, 0);
});

await check('a stopped turn runs no waiting calls', async () => {
    const h = setup([]);
    async function* stopped() { yield tool('write', 'a'); h.context.abortController.abort(); yield usage(); }
    await h.env.handleMessageStream(stopped(), h.context).catch(() => {});
    assert.deepEqual(h.executed, []);
});

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll tool batching checks passed');
