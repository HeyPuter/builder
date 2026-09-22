import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const helpers = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const previewSource = helpers.slice(helpers.indexOf('function createThinkingPreview('), helpers.indexOf('function showSpinner('));
const streamSource = fs.readFileSync(new URL('../src/js/handleMessageStream.js', import.meta.url), 'utf8');

// Exercise the real preview + stream together. This DOM records textContent,
// node ownership and pending paints without introducing a browser dependency.
function setup() {
    const nodes = [];
    const timers = new Map();
    let timerId = 0;
    const box = { appendChild(node) { nodes.push(node); node.isConnected = true; } };
    const env = {
        AbortController, DOMException,
        currentChatId: 'one', shouldStop: false,
        window: {},
        setTimeout(fn) { timers.set(++timerId, fn); return timerId; },
        clearTimeout(id) { timers.delete(id); },
        document: {
            querySelector: () => box,
            createElement() {
                const text = { textContent: '' };
                const viewport = { scrollHeight: 100, clientHeight: 60, scrollTop: 0 };
                return {
                    text, viewport, isConnected: false,
                    classList: { toggle() {} },
                    querySelector(sel) { return sel.endsWith('-text') ? text : viewport; },
                    remove() { this.isConnected = false; },
                };
            },
        },
        $: () => ({ remove() {}, length: 0 }),
        autoScrollTrigger() {},
        isStaleTurn: c => c.currentChatId !== env.currentChatId,
        isAborted: c => c?.signal.aborted,
        hasActiveTodos: () => false,
        appendMessage() {
            assert.equal(live().length, 0, 'thinking is gone before answer rendering');
            return { length: 0 };
        },
        showSpinner() {}, startSpinnerStub() {}, stopSpinnerStub() {},
        generateMessageId: () => 'message-id',
        extractErrorText: c => c.error,
        handleToolCalls: async () => ({ error: false }),
    };
    vm.createContext(env);
    vm.runInContext(previewSource + '\n' + streamSource, env);
    function live() { return nodes.filter(n => n.isConnected); }
    return {
        env, live, timers,
        context: () => ({ currentChatId: env.currentChatId, abortController: new AbortController(), chatHistory: [], currentMessageContent: '' }),
        paint() { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } },
    };
}
async function* chunks(...items) { yield* items; }

{
    const h = setup();
    const preview = h.env.createThinkingPreview(h.context());
    preview.append('\n');
    preview.append(null);
    assert.equal(h.live().length, 0);
    preview.append('The');
    preview.append(' request');
    preview.append(' is a');
    assert.equal(h.timers.size, 1, 'rapid chunks share one paint');
    h.paint();
    assert.equal(h.live()[0].text.textContent, '\nThe request is a');
    preview.append('<img src=x onerror=alert(1)>');
    h.paint();
    assert.match(h.live()[0].text.textContent, /<img src=x onerror=alert\(1\)>/);
    assert.ok(!h.live()[0].innerHTML.includes('<img'), 'reasoning never enters HTML');
    preview.append('x'.repeat(5000));
    h.paint();
    assert.equal(h.live()[0].text.textContent.length, 1600, 'bounded rolling tail');
    preview.append(' pending');
    preview.remove();
    assert.equal(h.live().length, 0);
    assert.equal(h.timers.size, 0);
    preview.append('late');
    h.paint();
    assert.equal(h.live().length, 0, 'removed preview cannot resurrect');
}

{
    const h = setup();
    const context = h.context();
    async function* response() {
        yield { type: 'reasoning', reasoning: 'The request' };
        assert.equal(h.live().length, 1);
        yield { type: 'text', text: '' };
        assert.equal(h.live().length, 1, 'empty text does not end thinking');
        yield { type: 'text', text: 'Happy to build your portfolio!' };
        assert.equal(h.live().length, 0);
        yield { type: 'usage', usage: { usd_cents: 1.10048, output_tokens: 273 } };
    }
    await h.env.handleMessageStream(response(), context);
    assert.equal(context.chatHistory.length, 1);
    assert.equal(context.chatHistory[0].content, 'Happy to build your portfolio!');
    assert.equal(context.chatHistory[0].costUsdCents, 1.10048);
    assert.equal(h.timers.size, 0);
}

{
    const h = setup();
    const context = h.context();
    h.env.handleToolCalls = async (_, __, c) => {
        assert.equal(h.live().length, 0, 'tool handoff clears outer reasoning');
        async function* followup() {
            yield { type: 'reasoning', reasoning: 'Now consider the answer' };
            assert.equal(h.live().length, 1, 'recursive rounds get their own preview');
            yield { type: 'text', text: 'Done' };
        }
        await h.env.handleMessageStream(followup(), c);
        return {};
    };
    await h.env.handleMessageStream(chunks(
        { type: 'reasoning', reasoning: 'Ask a question' },
        { type: 'tool_use', name: 'AskClarifyingQuestions', input: {} },
    ), context);
    assert.equal(h.live().length, 0);
    assert.equal(context.chatHistory[0].content, 'Done');
}

for (const end of ['complete', 'error-chunk', 'transport-error', 'stale']) {
    const h = setup();
    const context = h.context();
    async function* response() {
        yield { type: 'reasoning', reasoning: 'Working' };
        yield { type: 'reasoning', reasoning: ' on this' };
        if (end === 'error-chunk') yield { type: 'error', error: 'busy' };
        if (end === 'transport-error') throw new Error('disconnected');
        if (end === 'stale') {
            h.env.currentChatId = 'two';
            yield { type: 'reasoning', reasoning: 'late chunk' };
        }
    }
    const result = h.env.handleMessageStream(response(), context);
    if (end.includes('error')) await assert.rejects(result);
    else await result;
    assert.equal(h.live().length, 0, `${end} cleans up`);
    assert.equal(h.timers.size, 0, `${end} cancels pending paint`);
    assert.equal(context.chatHistory.length, 0, 'reasoning-only stream saves no message');
}

{
    const h = setup();
    h.env.hasActiveTodos = () => true;
    const context = h.context();
    async function* response() {
        yield { type: 'reasoning', reasoning: 'Checking the layout' };
        assert.equal(h.live().length, 1, 'reasoning is visible alongside an active checklist');
        yield { type: 'text', text: 'Narration suppressed by the checklist' };
    }
    await h.env.handleMessageStream(response(), context);
    assert.equal(h.live().length, 0);
    assert.equal(context.chatHistory[0].content, 'Narration suppressed by the checklist');
    const plain = h.context();
    await h.env.handleMessageStream(chunks(
        { type: 'reasoning', reasoning: null },
        { type: 'reasoning', reasoning: {} },
        { type: 'text', text: 'Plain answer' },
    ), plain);
    assert.equal(h.live().length, 0);
    assert.equal(plain.chatHistory[0].content, 'Plain answer');
}

{
    const h = setup();
    const context = h.context();
    let started;
    const ready = new Promise(resolve => { started = resolve; });
    async function* hanging() {
        yield { type: 'reasoning', reasoning: 'Waiting' };
        started();
        await new Promise(() => {});
    }
    const result = h.env.handleMessageStream(hanging(), context);
    await ready;
    assert.equal(h.live().length, 1);
    context.abortController.abort();
    assert.equal(h.live().length, 0, 'Stop removes preview immediately on a silent stream');
    // Start another turn before the old one finishes unwinding.
    const next = h.env.createThinkingPreview(h.context());
    next.append('New turn');
    await assert.rejects(result, { name: 'AbortError' });
    assert.equal(h.live().length, 1, 'old finally cannot remove new preview');
    next.remove();
}

{
    const h = setup();
    const preview = h.env.createThinkingPreview(h.context());
    preview.append('First chat');
    preview.append(' pending');
    h.env.currentChatId = 'two';
    h.paint();
    assert.equal(h.live().length, 0, 'deferred paint respects chat navigation');
}

console.log('All thinking-preview checks passed.');
