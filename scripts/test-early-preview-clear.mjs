import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ---- The tool loop starts the preview's cache clear early -------------------
// Puter lets Claude make one tool call per reply, so a whole model round sits
// between the AI's last write and its update_preview call. The tool loop now
// starts the clear when a round that may have written files ends, and drops it
// before any tool that may write, since the canary only covers files written
// before its read. The clear itself, and update_preview's refresh taking it
// over, are covered in test-preview-canary.mjs.
//
// Runs the REAL handleMessageStream.js, tools.js and model-core.js together,
// with puter.ai.chat scripted, and records every start and drop in order.

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const streamSource = read('../src/js/handleMessageStream.js');
const toolsSource = read('../src/js/tools.js');
const modelSource = read('../src/js/model-core.js');
const appSource = read('../src/js/app.js');

async function* chunks(...items) { yield* items; }
const tool = (name, id) => ({ type: 'tool_use', id, name, input: {}, text: '' });
const usage = () => ({ type: 'usage', usage: { usd_cents: 1, output_tokens: 10 } });
const text = (t) => ({ type: 'text', text: t });

// `rounds`: what each follow-up request streams back, in order.
function setup(rounds) {
    const events = [];
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
        prepareHistoryForAI: (h) => h,
        startEarlyPreviewClear: () => events.push('start'),
        dropEarlyPreviewClear: () => events.push('drop'),
        puter: {
            ai: {
                chat: async () => chunks(...(rounds.shift() || [text('Done.'), usage()])),
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
        exec: async () => { events.push(name); return { success: true }; },
    });
    for (const name of ['edit', 'write', 'TodoWrite', 'ReadTextFile', 'update_preview', 'GenerateImage', 'mcp_files_write']) {
        env.tools.push(makeTool(name));
    }
    const context = {
        currentChatId: 'one', abortController: new AbortController(), model: 'claude-opus-5-5',
        tools: env.tools, chatHistory: [], currentMessage: null, currentMessageContent: '',
    };
    return { env, context, events };
}

let failures = 0;
async function check(name, fn) {
    try { await fn(); console.log('ok   - ' + name); }
    catch (e) { failures++; console.log('FAIL - ' + name + '\n       ' + e.message); }
}

await check('an edit drops any earlier clear, and its round starts one before update_preview', async () => {
    const h = setup([[tool('update_preview', 'u1'), usage()], [text('Done.'), usage()]]);
    await h.env.handleMessageStream(chunks(tool('edit', 'e1'), usage()), h.context);
    assert.deepEqual(h.events, ['drop', 'edit', 'start', 'update_preview']);
});

await check('read-only rounds in between keep the clear going', async () => {
    const h = setup([[tool('TodoWrite', 't1'), usage()], [tool('ReadTextFile', 'r1'), usage()],
        [tool('update_preview', 'u1'), usage()], [text('Done.'), usage()]]);
    await h.env.handleMessageStream(chunks(tool('edit', 'e1'), usage()), h.context);
    assert.deepEqual(h.events, ['drop', 'edit', 'start', 'TodoWrite', 'ReadTextFile', 'update_preview']);
});

await check('a second edit drops the first clear and starts another', async () => {
    const h = setup([[tool('write', 'w1'), usage()], [tool('update_preview', 'u1'), usage()], [text('Done.'), usage()]]);
    await h.env.handleMessageStream(chunks(tool('edit', 'e1'), usage()), h.context);
    assert.deepEqual(h.events, ['drop', 'edit', 'start', 'drop', 'write', 'start', 'update_preview']);
});

await check('tools that save into the project, MCP tools included, count as writes', async () => {
    const h = setup([[tool('mcp_files_write', 'm1'), usage()], [text('Done.'), usage()]]);
    await h.env.handleMessageStream(chunks(tool('GenerateImage', 'g1'), usage()), h.context);
    assert.deepEqual(h.events, ['drop', 'GenerateImage', 'start', 'drop', 'mcp_files_write', 'start']);
});

await check('a round that already ran update_preview starts no clear', async () => {
    const h = setup([[text('Done.'), usage()]]);
    // Two calls in one reply, as GPT and Gemini send them.
    await h.env.handleMessageStream(chunks(tool('edit', 'e1'), tool('update_preview', 'u1'), usage()), h.context);
    assert.deepEqual(h.events, ['drop', 'edit', 'update_preview']);
});

await check('a stopped turn starts no clear', async () => {
    const h = setup([]);
    h.env.tools.find((t) => t.function.name === 'edit').exec = async () => {
        h.events.push('edit');
        h.context.abortController.abort();
        return { success: true };
    };
    await h.env.handleMessageStream(chunks(tool('edit', 'e1'), usage()), h.context);
    assert.deepEqual(h.events, ['drop', 'edit']);
});

await check('each turn drops a clear left from before it', async () => {
    const send = appSource.slice(appSource.indexOf('async function sendChatMessage('));
    const drop = send.indexOf('window.dropEarlyPreviewClear?.();');
    assert.ok(drop > 0 && drop < send.indexOf('const stream = await abortableAwait(puter.ai.chat('),
        'dropped before the first request');
});

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll early-preview-clear checks passed.');
