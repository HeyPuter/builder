import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ---- Context compaction ------------------------------------------------------
// Every round resends the whole history, so a long project grew until the
// model refused it ("prompt is too long") and every round on the way there
// cost more. Puter's compaction option has the model summarize the older
// history into one opaque item once the input passes compactAt. The builder
// stores the item as its own assistant entry (handleMessageStream) and each
// request starts from the last usable one (ModelCore.fromLastCompaction,
// called by prepareHistoryForAI). This runs the REAL model-core.js,
// prepareHistoryForAI and handleMessageStream.js.

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

const coreBox = { window: {} };
vm.createContext(coreBox);
vm.runInContext(read('../src/js/model-core.js'), coreBox);
const M = coreBox.window.ModelCore;

const HELP = read('../src/js/helpers.js');
const a = HELP.indexOf('function prepareHistoryForAI(');
const b = HELP.indexOf('/**\n * Sum the AI-reported cost');
if (a < 0 || b < 0 || b <= a) throw new Error('could not extract prepareHistoryForAI from helpers.js');
const { prepareHistoryForAI } = new Function('window', HELP.slice(a, b) + '\nreturn { prepareHistoryForAI };')({ ModelCore: M });

let failures = 0;
async function check(name, fn) {
    try { await fn(); console.log('ok   - ' + name); }
    catch (e) { failures++; console.log('FAIL - ' + name + '\n       ' + e.message); }
}
const plain = (x) => JSON.parse(JSON.stringify(x));

const OPUS = 'claude-opus-5-5';
const GPT = 'gpt-6.1-sol';
const sys = { role: 'system', content: [{ type: 'text', text: 'common' }], buildModel: OPUS };
const item = (id, model = OPUS) => ({
    role: 'assistant', content: [{ type: 'compaction', id, encrypted_content: 'blob-' + id }], compaction: true, model,
});
const user = (t) => ({ role: 'user', content: t });
const reply = (t) => ({ role: 'assistant', content: t });
const call = (id) => ({ role: 'assistant', content: { type: 'tool_use', id, name: 'write', input: {} }, model: OPUS });
const result = (id) => ({ role: 'user', content: { type: 'tool_result', tool_use_id: id, content: '{"success":true}' } });
const texts = (msgs) => Array.from(msgs, (m) => m.role + ':' + (typeof m.content === 'string' ? m.content
    : Array.isArray(m.content) ? m.content.map((p) => p.type === 'compaction' ? 'C' + p.id : p.type).join(',')
    : m.content.type === 'tool_use' ? 'use' + m.content.id : 'result' + m.content.tool_use_id));

// ---- Which part of the history a request carries ---------------------------

await check('no compaction yet: the whole history goes, unchanged', () => {
    const h = [sys, user('a'), reply('b'), user('c')];
    assert.deepEqual(texts(M.fromLastCompaction(plain(h), OPUS)), ['system:text', 'user:a', 'assistant:b', 'user:c']);
});

await check('the system prompt, then the last compaction and everything after it', () => {
    const h = [sys, user('a'), call('t1'), result('t1'), item('1'), call('t2'), result('t2'), user('next')];
    assert.deepEqual(texts(M.fromLastCompaction(plain(h), OPUS)),
        ['system:text', 'assistant:C1', 'assistant:uset2', 'user:resultt2', 'user:next']);
});

await check('a later compaction replaces an earlier one', () => {
    const h = [sys, user('a'), item('1'), reply('b'), user('c'), item('2'), reply('d'), user('e')];
    assert.deepEqual(texts(M.fromLastCompaction(plain(h), OPUS)), ['system:text', 'assistant:C2', 'assistant:d', 'user:e']);
});

await check('the marker is dropped from the request, the stored history keeps it', () => {
    const h = [sys, user('a'), item('1'), reply('b')];
    const out = M.fromLastCompaction(plain(h), OPUS);
    assert.ok(!('compaction' in out[1]));
    assert.equal(h[2].compaction, true);
});

await check('a round that failed after compacting: its summary is skipped and left out', () => {
    // Retried: the entry is last. Errored: an error card follows it.
    for (const tail of [[], [{ role: 'assistant', content: 'Something went wrong', isError: true }, user('retry')]]) {
        const h = [sys, user('a'), reply('b'), user('c'), item('1'), ...tail];
        const out = texts(M.fromLastCompaction(plain(h), OPUS));
        assert.ok(!out.includes('assistant:C1'), out.join(' '));
        assert.equal(out[1], 'user:a');
    }
});

await check('a failed compaction falls back to the one before it', () => {
    const h = [sys, user('a'), item('1'), reply('b'), user('c'), item('2')];
    assert.deepEqual(texts(M.fromLastCompaction(plain(h), OPUS)), ['system:text', 'assistant:C1', 'assistant:b', 'user:c']);
});

await check('a retried round that compacted twice uses the one its reply followed', () => {
    const h = [sys, user('a'), item('1'), item('2'), reply('b')];
    assert.deepEqual(texts(M.fromLastCompaction(plain(h), OPUS)), ['system:text', 'assistant:C2', 'assistant:b']);
});

await check('after a switch to another vendor the full history goes, without the foreign item', () => {
    const h = [sys, user('a'), item('1'), reply('b'), user('c')];
    const out = texts(M.fromLastCompaction(plain(h), GPT));
    assert.deepEqual(out, ['system:text', 'user:a', 'assistant:b', 'user:c']);
});

await check('a model of the same vendor reads it (Opus to Sonnet)', () => {
    const h = [sys, user('a'), item('1'), reply('b'), user('c')];
    assert.equal(texts(M.fromLastCompaction(plain(h), 'claude-sonnet-5-5'))[1], 'assistant:C1');
});

await check('switching back finds the newest item that vendor can read', () => {
    const h = [sys, user('a'), item('1'), reply('b'), user('c'), item('2', GPT), reply('d'), user('e')];
    assert.deepEqual(texts(M.fromLastCompaction(plain(h), OPUS)),
        ['system:text', 'assistant:C1', 'assistant:b', 'user:c', 'assistant:d', 'user:e']);
});

await check('an entry with no known model stamp is never used', () => {
    const h = [sys, user('a'), { ...item('1'), model: undefined }, reply('b')];
    assert.ok(!texts(M.fromLastCompaction(plain(h), OPUS)).includes('assistant:C1'));
});

// ---- Through prepareHistoryForAI -------------------------------------------

await check('prepareHistoryForAI sends from the compaction, every bookkeeping field stripped', () => {
    const h = [sys, user('a'), reply('b'), user('c'), item('1'), { ...reply('d'), messageId: 'm1', tokenUsage: { input: 1 } }, user('e')];
    const out = prepareHistoryForAI(h, OPUS);
    assert.deepEqual(texts(out), ['system:text', 'assistant:C1', 'assistant:d', 'user:e']);
    assert.deepEqual(plain(out[1]), { role: 'assistant', content: [{ type: 'compaction', id: '1', encrypted_content: 'blob-1' }] });
    assert.ok(!('buildModel' in out[0]) && !('messageId' in out[2]) && !('tokenUsage' in out[2]));
    assert.deepEqual(plain(out[3].cache_control), { type: 'ephemeral' });
});

await check('prepareHistoryForAI reads the error marker before stripping it', () => {
    const h = [sys, user('a'), item('1'), { role: 'assistant', content: 'Failed', isError: true }, user('again')];
    const out = prepareHistoryForAI(h, OPUS);
    assert.ok(!texts(out).includes('assistant:C1'));
    assert.ok(out.every((m) => !('isError' in m)));
});

// ---- The stream hands the item over ----------------------------------------

function streamEnv() {
    const env = {
        AbortController, DOMException, setTimeout, clearTimeout,
        currentChatId: 'one', shouldStop: false, window: {},
        marked: { parse: (s) => s }, escapeMarkdownSource: (s) => s,
        $: () => ({ length: 0, remove() {}, find: () => ({ html() {} }), attr() {} }),
        hasActiveTodos: () => false,
        appendMessage: () => ({ length: 0, find: () => ({ html() {} }), attr() {} }),
        autoScrollTrigger() {}, createThinkingPreview: () => ({ append() {}, remove() {} }),
        isStaleTurn: (c) => c.currentChatId !== env.currentChatId,
        isAborted: (c) => !!c?.signal.aborted,
        showSpinner() {}, startSpinnerStub() {}, stopSpinnerStub() {},
        generateMessageId: () => 'msg', extractErrorText: (c) => String(c && c.error),
        async handleToolCalls(completion, top, c) {
            c.chatHistory.push({ role: 'assistant', content: completion, model: c.model });
            return {};
        },
    };
    vm.createContext(env);
    vm.runInContext(read('../src/js/handleMessageStream.js'), env);
    return env;
}
async function* chunks(...items) { yield* items; }
const turn = (history) => ({
    currentChatId: 'one', abortController: new AbortController(), model: OPUS,
    chatHistory: history, currentMessage: null, currentMessageContent: '',
    turnStats: { calls: 0, previewChecks: 0, cents: 0, lastInput: 0, compactions: 0 },
});
const usage = (u) => ({ type: 'usage', usage: { usd_cents: 1, output_tokens: 10, ...u } });

await check('the item is stored ahead of its reply, stamped with the model', async () => {
    const env = streamEnv();
    const c = turn([sys, user('a')]);
    await env.handleMessageStream(chunks(
        { type: 'compaction', id: 'cmp_1', encrypted_content: 'opaque' },
        { type: 'text', text: 'Done.' },
        usage({ input_tokens: 1000 }),
    ), c);
    assert.deepEqual(texts(c.chatHistory), ['system:text', 'user:a', 'assistant:Ccmp_1', 'assistant:Done.']);
    assert.deepEqual(plain(c.chatHistory[2]), {
        role: 'assistant', content: [{ type: 'compaction', id: 'cmp_1', encrypted_content: 'opaque' }], compaction: true, model: OPUS,
    });
    assert.equal(c.turnStats.compactions, 1);
    // The next request starts from it.
    assert.deepEqual(texts(prepareHistoryForAI([...c.chatHistory, user('b')], OPUS)), ['system:text', 'assistant:Ccmp_1', 'assistant:Done.', 'user:b']);
});

await check('a compaction mid-build sits before the tool call of its round', async () => {
    const env = streamEnv();
    const c = turn([sys, user('a')]);
    await env.handleMessageStream(chunks(
        { type: 'compaction', id: 'cmp_2', encrypted_content: 'opaque' },
        { type: 'tool_use', id: 't9', name: 'write', input: {} },
        usage({ input_tokens: 10 }),
    ), c);
    assert.deepEqual(texts(c.chatHistory).slice(2), ['assistant:Ccmp_2', 'assistant:uset9']);
});

await check('an item Puter sends after the message still lands ahead of it', async () => {
    // Anthropic didn't stream the block, so Puter reads it from the final
    // message and sends it after the text and the tool call.
    const env = streamEnv();
    const c = turn([sys, user('a')]);
    await env.handleMessageStream(chunks(
        { type: 'text', text: 'Writing it.' },
        { type: 'tool_use', id: 't3', name: 'write', input: {} },
        { type: 'compaction', id: 'cmp_3', encrypted_content: 'summary' },
        usage({ input_tokens: 10 }),
    ), c);
    assert.deepEqual(texts(c.chatHistory).slice(2), ['assistant:Ccmp_3', 'assistant:Writing it.', 'assistant:uset3']);
});

await check('even after the usage line, when the reply is already saved, it lands ahead of it', async () => {
    const env = streamEnv();
    const c = turn([sys, user('a')]);
    await env.handleMessageStream(chunks(
        { type: 'text', text: 'Writing it.' },
        { type: 'tool_use', id: 't4', name: 'write', input: {} },
        usage({ input_tokens: 10 }),
        { type: 'compaction', id: 'cmp_4', encrypted_content: 'summary' },
    ), c);
    assert.deepEqual(texts(c.chatHistory).slice(2), ['assistant:Ccmp_4', 'assistant:Writing it.', 'assistant:uset4']);
});

await check('a later round\'s item lands at that round, not at the turn start', async () => {
    // Round one ends in a tool call, whose result opens round two, which compacts.
    const env = streamEnv();
    const c = turn([sys, user('a')]);
    env.handleToolCalls = async (completion, top, ctx) => {
        ctx.chatHistory.push({ role: 'assistant', content: completion, model: ctx.model });
        ctx.chatHistory.push(result(completion.id));
        if (completion.id === 'r1') {
            await env.handleMessageStream(chunks(
                { type: 'text', text: 'Next.' },
                { type: 'compaction', id: 'cmp_r2', encrypted_content: 'summary' },
                usage({ input_tokens: 10 }),
            ), ctx);
        }
        return {};
    };
    await env.handleMessageStream(chunks({ type: 'tool_use', id: 'r1', name: 'write', input: {} }, usage({ input_tokens: 10 })), c);
    assert.deepEqual(texts(c.chatHistory).slice(2), ['assistant:user1', 'user:resultr1', 'assistant:Ccmp_r2', 'assistant:Next.']);
});

await check('an empty compaction chunk stores nothing', async () => {
    const env = streamEnv();
    const c = turn([sys, user('a')]);
    await env.handleMessageStream(chunks({ type: 'compaction', id: 'x' }, { type: 'text', text: 'ok' }, usage({})), c);
    assert.deepEqual(texts(c.chatHistory), ['system:text', 'user:a', 'assistant:ok']);
    assert.equal(c.turnStats.compactions, 0);
});

// ---- Request size and spend for the analytics events -----------------------

await check('a request\'s size counts uncached, cache read and cache written input', async () => {
    const env = streamEnv();
    const c = turn([sys, user('a')]);
    env.recordUsageChunk(c, usage({ input_tokens: 2000, cache_read_input_tokens: 90000, ephemeral_5m_input_tokens: 8000 }));
    assert.equal(c.pendingUsage.lastInput, 100000);
    assert.equal(c.turnStats.lastInput, 100000);
    // Routes that report through usageDetails count the same way.
    env.recordUsageChunk(c, { type: 'usage', usage: { usd_cents: 1 }, usageDetails: { inputTokens: 300000, cacheReadTokens: 5000 } });
    assert.equal(c.turnStats.lastInput, 305000);
    assert.equal(c.turnStats.cents, 2);
});

await check('the latest request is the size, not the largest (a compaction shrinks it)', async () => {
    const env = streamEnv();
    const c = turn([sys, user('a')]);
    env.recordUsageChunk(c, usage({ input_tokens: 130000 }));
    env.recordUsageChunk(c, usage({ input_tokens: 2000, cache_read_input_tokens: 30000 }));
    assert.equal(c.turnStats.lastInput, 32000);
    assert.equal(c.turnStats.cents, 2);
});

await check('the turn\'s latest request is kept on its message, not summed', async () => {
    const env = streamEnv();
    const c = turn([sys, user('a'), { role: 'assistant', content: 'b', tokenUsage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, lastInput: 120000 } }]);
    env.recordUsageChunk(c, usage({ input_tokens: 80000 }));
    env.flushTurnUsage(c);
    assert.equal(c.chatHistory[2].tokenUsage.lastInput, 80000);
    assert.equal(c.turnUsage.lastInput, 80000);
    // A flush with nothing new leaves it.
    env.flushTurnUsage(c);
    assert.equal(c.chatHistory[2].tokenUsage.lastInput, 80000);
});

const ctxSrc = HELP.slice(HELP.indexOf('const CONTEXT_BANDS = ['));
const contextBand = new Function(ctxSrc.slice(0, ctxSrc.indexOf('\n}\n', ctxSrc.indexOf('function contextBand(')) + 3) + 'return contextBand;')();
await check('context bands', () => {
    assert.equal(contextBand(0), 'unknown');
    assert.equal(contextBand(undefined), 'unknown');
    assert.equal(contextBand(49999), '<50k');
    assert.equal(contextBand(100000), '100-150k');
    assert.equal(contextBand(480000), '200-500k');
    assert.equal(contextBand(999999), '500k-1M');
    assert.equal(contextBand(1000000), '1M+');
});

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll compaction checks passed');
