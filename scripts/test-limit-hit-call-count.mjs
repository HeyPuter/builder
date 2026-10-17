import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: a refused build still counts its calls and cost ------
// The Usage Limit Hit event's `calls` tells a build refused on its first call
// from one that ran out mid-build. Puter sends each call's usage chunk LAST,
// after its tool_use, and handleMessageStream runs the tool round (and opens the
// next call) as soon as it reads the tool_use. So when a later call is refused,
// every earlier stream is still parked in its tool round and never reads its
// usage. Counting at usage alone reported calls: 0 for every mid-build refusal.
// The same unread usage carried each call's cost, so a build cut short saved
// little or nothing of what it spent, and Project Published's cost_band read
// low. Each parked stream now reads its usage on the way out (drainUsage).
// Runs the REAL handleMessageStream.js, with tool rounds that recurse into the
// next scripted call on the same context, like tools.js.

const streamSource = fs.readFileSync(new URL('../src/js/handleMessageStream.js', import.meta.url), 'utf8');

function setup(rounds) {
    const env = {
        AbortController, DOMException, setTimeout, clearTimeout,
        currentChatId: 'one', shouldStop: false,
        window: {},
        marked: { parse: s => s },
        escapeMarkdownSource: s => s,
        $: () => ({ length: 0, remove() {}, find: () => ({ html() {} }), attr() {} }),
        hasActiveTodos: () => false,
        appendMessage: () => ({ length: 0, find: () => ({ html() {} }), attr() {} }),
        autoScrollTrigger() {},
        createThinkingPreview: () => ({ append() {}, remove() {} }),
        isStaleTurn: c => c.currentChatId !== env.currentChatId,
        isAborted: c => !!c?.signal.aborted,
        showSpinner() {}, startSpinnerStub() {}, stopSpinnerStub() {},
        generateMessageId: () => 'msg',
        extractErrorText: c => String(c && c.error),
        // Mirrors tools.js: run the tools (counting update_preview), then open
        // the next call. A refused call rejects at the open, as puter.ai.chat does.
        async handleToolCalls(completion, top, c) {
            c.chatHistory.push({ role: 'assistant', content: completion });
            if (c.turnStats && completion.name === 'update_preview') c.turnStats.previewChecks++;
            c.chatHistory.push({ role: 'user', content: { type: 'tool_result', tool_use_id: completion.id, content: '{}' } });
            const next = rounds.shift();
            if (next === 'refused') throw Object.assign(new Error('Insufficient funds'), { code: 'insufficient_funds', status: 402 });
            if (typeof next === 'function') await env.handleMessageStream(next(), c);
            else if (next) await env.handleMessageStream(chunks(...next), c);
            return {};
        },
    };
    vm.createContext(env);
    vm.runInContext(streamSource, env);
    const turnStats = { calls: 0, previewChecks: 0 };
    const context = {
        currentChatId: 'one', abortController: new AbortController(),
        chatHistory: [], currentMessage: null, currentMessageContent: '', turnStats,
    };
    return { env, context, turnStats };
}
async function* chunks(...items) { yield* items; }
const tool = (name, id = name) => ({ type: 'tool_use', id, name, input: {} });
const usage = (extra = {}) => ({ type: 'usage', usage: { usd_cents: 1, output_tokens: 10 }, ...extra });
const text = t => ({ type: 'text', text: t });

let failures = 0;
async function check(name, fn) {
    try { await fn(); console.log('ok   - ' + name); }
    catch (e) { failures++; console.log('FAIL - ' + name + '\n       ' + e.message); }
}

// The review's sequence: update_preview, then the next call is refused.
await check('a refusal after one call reports calls: 1, not 0', async () => {
    const h = setup(['refused']);
    await assert.rejects(h.env.handleMessageStream(chunks(tool('update_preview'), usage()), h.context), /Insufficient funds/);
    assert.equal(h.turnStats.calls, 1);
    assert.equal(h.turnStats.previewChecks, 1);
});

await check('a refusal deep in the build counts every call before it', async () => {
    const h = setup([[tool('write', 'w2'), usage()], [tool('update_preview'), usage()], 'refused']);
    await assert.rejects(h.env.handleMessageStream(chunks(text('Building'), tool('write', 'w1'), usage()), h.context));
    assert.equal(h.turnStats.calls, 3);
    assert.equal(h.turnStats.previewChecks, 1);
});

await check('the first call refused reports calls: 0', async () => {
    const h = setup([]);
    await assert.rejects(h.env.handleMessageStream(chunks({ type: 'error', error: 'Insufficient funds', code: 'insufficient_funds' }), h.context));
    assert.equal(h.turnStats.calls, 0);
});

await check('a finished build counts each call once, tool_use and usage together', async () => {
    const h = setup([[tool('write', 'w2'), usage()], [text('Done'), usage()]]);
    await h.env.handleMessageStream(chunks(tool('write', 'w1'), usage()), h.context);
    assert.equal(h.turnStats.calls, 3);
});

await check('several tool_use chunks in one response are one call', async () => {
    const h = setup([null, null]);
    await h.env.handleMessageStream(chunks(tool('write', 'a'), tool('write', 'b'), usage()), h.context);
    assert.equal(h.turnStats.calls, 1);
});

await check('a response Puter cut short for credits still counts', async () => {
    const h = setup([[text('Half a'), usage({ metadata: { usage_limited: true } })]]);
    await h.env.handleMessageStream(chunks(tool('write', 'w1'), usage()), h.context);
    assert.equal(h.turnStats.calls, 2);
    assert.equal(h.context.usageLimited, true);
});

await check('no turn stats → nothing breaks', async () => {
    const h = setup([]);
    delete h.context.turnStats;
    await h.env.handleMessageStream(chunks(text('Hi'), usage()), h.context);
});

// Cost: what the earlier calls spent still reaches the turn's total
await check('a refused build still records the cost of its earlier calls', async () => {
    const h = setup([[tool('write', 'w2'), { type: 'usage', usage: { usd_cents: 30, output_tokens: 300 } }], 'refused']);
    const first = { type: 'usage', usage: { usd_cents: 12.5, output_tokens: 100 } };
    await assert.rejects(h.env.handleMessageStream(chunks(tool('write', 'w1'), first), h.context));
    assert.equal(h.context.pendingUsage.cents, 42.5);
    assert.equal(h.context.pendingUsage.output, 400);
    h.context.chatHistory.push({ role: 'assistant', content: 'Out of credits', isError: true });
    h.env.flushTurnUsage(h.context);
    assert.equal(h.context.chatHistory.at(-1).costUsdCents, 42.5, 'saved onto the chat for sumChatCostCents');
});

await check('a finished build records each call once (no double count from the drain)', async () => {
    const h = setup([[text('Done'), usage()]]);
    await h.env.handleMessageStream(chunks(tool('write', 'w1'), usage()), h.context);
    assert.equal(h.context.turnUsage.cents, 2);
});

await check('a dead connection stalls the unwind at most once, not once per round', async () => {
    // Every parked stream hangs after its tool_use: its usage never arrives.
    async function* hangs(id) { yield tool('write', id); await new Promise(() => {}); }
    const h = setup([() => hangs('w2'), () => hangs('w3'), 'refused']);
    const t0 = Date.now();
    await assert.rejects(h.env.handleMessageStream(hangs('w1'), h.context), /Insufficient funds/);
    const took = Date.now() - t0;
    assert.ok(took < 2500, `unwound in ${took}ms`);
    assert.equal(h.turnStats.calls, 3);
});

await check('the drain ignores anything but usage', async () => {
    const h = setup(['refused']);
    await assert.rejects(h.env.handleMessageStream(chunks(tool('write', 'w1'), text('late text'), tool('write', 'w9'), usage()), h.context));
    assert.equal(h.context.pendingUsage.cents, 1);
    assert.equal(h.context.chatHistory.filter(m => m.content && m.content.id === 'w9').length, 0, 'no tool round from the drain');
});

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll limit-hit call and cost checks passed');
