import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: SuggestNextSteps ends the turn ----------------------
// SuggestNextSteps is the turn's final action and its result is only
// {success:true}. The tool loop sent that back for another model round, and
// when the reply that called it already carried the summary, the model wrote
// it again, so the turn showed it twice. Now the turn ends there. A reply with
// no text still gets the round, since the model sometimes writes its summary
// after. A reply with other calls beside it, or a failed SuggestNextSteps,
// still gets it too. The summary is shown even while the checklist hides
// narration.
//
// Runs the REAL handleMessageStream.js, tools.js and model-core.js together,
// fed text, tool_use and usage chunks the way Puter streams them.

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const streamSource = read('../src/js/handleMessageStream.js');
const toolsSource = read('../src/js/tools.js');
const modelSource = read('../src/js/model-core.js');

async function* chunks(...items) { yield* items; }
const tool = (name, id) => ({ type: 'tool_use', id, name, input: {}, text: '' });
const usage = () => ({ type: 'usage', usage: { usd_cents: 1, output_tokens: 10 } });
const text = (t) => ({ type: 'text', text: t });

function setup({ todos = false, fail = null } = {}) {
    const requests = [];
    const shown = [];
    let ids = 0;
    const jq = () => ({ length: 0, find: () => ({ html() {} }), attr() {}, remove() {} });
    const env = {
        AbortController, DOMException, setTimeout, clearTimeout, console,
        currentChatId: 'one', shouldStop: false,
        marked: { parse: (s) => s },
        escapeMarkdownSource: (s) => s,
        $: () => ({ length: 0 }),
        hasActiveTodos: () => todos,
        appendMessage: (content) => { if (content) shown.push(content); return jq(); },
        autoScrollTrigger() {},
        createThinkingPreview: () => ({ append() {}, remove() {} }),
        isStaleTurn: (c) => c.currentChatId !== env.currentChatId,
        isAborted: (ac) => !!(ac && ac.signal.aborted),
        showSpinner() {}, startSpinnerStub() {}, stopSpinnerStub() {},
        scheduleSaveCurrentChat() {},
        generateMessageId: () => 'msg_' + (++ids),
        prepareHistoryForAI: (h) => h,
        puter: {
            ai: {
                chat: async () => { requests.push(1); return chunks(text('Again.'), usage()); },
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
        exec: async () => { if (fail === name) throw new Error('boom'); return { success: true }; },
    });
    env.tools.push(makeTool('write'), makeTool('SuggestNextSteps'));
    const context = {
        currentChatId: 'one', abortController: new AbortController(), model: 'claude-opus-5-5',
        tools: env.tools, chatHistory: [], currentMessage: null, currentMessageContent: '',
    };
    return { env, context, requests, shown };
}

const summaries = (h, t) => h.filter((m) => m.role === 'assistant' && m.content === t).length;

let failures = 0;
async function check(name, fn) {
    try { await fn(); console.log('ok   - ' + name); }
    catch (e) { failures++; console.log('FAIL - ' + name + '\n       ' + e.message); }
}

await check('a summary then SuggestNextSteps asks the model for nothing more', async () => {
    const h = setup();
    await h.env.handleMessageStream(chunks(text('Made the heading blue.'), tool('SuggestNextSteps', 's1'), usage()), h.context);
    assert.equal(h.requests.length, 0);
    assert.equal(summaries(h.context.chatHistory, 'Made the heading blue.'), 1, 'the summary is stored once');
    assert.ok(h.context.chatHistory.some((m) => m.role === 'user' && m.content && m.content.tool_use_id === 's1'),
        'the call\'s result is stored');
});

await check('SuggestNextSteps with no summary gets the round to write it', async () => {
    const h = setup();
    await h.env.handleMessageStream(chunks(tool('SuggestNextSteps', 's1'), usage()), h.context);
    assert.equal(h.requests.length, 1);
});

await check('a summary with another call beside SuggestNextSteps still gets the round', async () => {
    const h = setup();
    await h.env.handleMessageStream(chunks(text('Done.'), tool('write', 'w1'), tool('SuggestNextSteps', 's1'), usage()), h.context);
    assert.equal(h.requests.length, 1);
});

await check('a failed write beside SuggestNextSteps reaches the model', async () => {
    const h = setup({ fail: 'write' });
    await h.env.handleMessageStream(chunks(text('Done.'), tool('write', 'w1'), tool('SuggestNextSteps', 's1'), usage()), h.context);
    assert.equal(h.requests.length, 1);
});

await check('a failed SuggestNextSteps still gets the round', async () => {
    const h = setup({ fail: 'SuggestNextSteps' });
    await h.env.handleMessageStream(chunks(text('Done.'), tool('SuggestNextSteps', 's1'), usage()), h.context);
    assert.equal(h.requests.length, 1);
});

await check('any other last call still gets the round', async () => {
    const h = setup();
    await h.env.handleMessageStream(chunks(text('Writing it.'), tool('write', 'w1'), usage()), h.context);
    assert.equal(h.requests.length, 1);
});

await check('with the checklist still open, the summary is shown at the end', async () => {
    const h = setup({ todos: true });
    await h.env.handleMessageStream(chunks(text('Made the heading blue.'), tool('SuggestNextSteps', 's1'), usage()), h.context);
    assert.equal(h.requests.length, 0);
    assert.deepEqual(h.shown, ['Made the heading blue.']);
});

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll suggest-ends-turn checks passed.');
