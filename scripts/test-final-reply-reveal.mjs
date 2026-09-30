import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: a turn's final reply is never swallowed --------------
// While the progress checklist has unfinished items, text bubbles are
// suppressed (mid-turn narration). A build that stopped mid-checklist made that
// suppression permanent: every reply to "continue" landed in chatHistory but
// never on screen, so the chat looked frozen until a reload. revealFinalReply
// renders a turn's FINAL text if it never got a bubble — and must not:
//   * reveal narration that preceded a tool call,
//   * duplicate a message that is already on screen,
//   * render anything for an aborted / stale turn,
//   * reach back to a message from an earlier turn.
// Runs the REAL handleMessageStream.js against a tiny recording DOM.

const streamSource = fs.readFileSync(new URL('../src/js/handleMessageStream.js', import.meta.url), 'utf8');

function setup({ activeTodos = true, preRendered = [] } = {}) {
    // Rendered assistant bubbles, in order: { id, content }.
    const rendered = preRendered.map(id => ({ id, content: '(from reload)' }));
    let idSeq = 0;
    const bubble = (entry) => ({
        length: 1,
        find: () => ({ html(h) { entry.content = h; } }),
        attr(name, value) { if (name === 'data-message-id') entry.id = value; },
    });
    const env = {
        AbortController, DOMException,
        currentChatId: 'one', shouldStop: false,
        window: {},
        marked: { parse: s => s },
        escapeMarkdownSource: s => s,
        $(selector) {
            if (selector === undefined) return { length: 0, find: () => ({ html() {} }), attr() {} };
            const m = /^\.chat-box \.message\[data-message-id="(.*)"\]$/.exec(selector);
            if (m) {
                const id = m[1].replace(/\\(["\\])/g, '$1');
                return { length: rendered.filter(r => r.id === id).length };
            }
            return { length: 0, remove() {} };
        },
        hasActiveTodos: () => activeTodos,
        appendMessage(content, isUser, p, t, u, messageId) {
            const entry = { id: messageId || null, content };
            rendered.push(entry);
            return bubble(entry);
        },
        autoScrollTrigger() {},
        createThinkingPreview: () => ({ append() {}, remove() {} }),
        isStaleTurn: c => c.currentChatId !== env.currentChatId,
        isAborted: c => !!c?.signal.aborted,
        showSpinner() {}, startSpinnerStub() {}, stopSpinnerStub() {},
        generateMessageId: () => `msg_${++idSeq}`,
        extractErrorText: c => String(c && c.error),
        // Mirrors tools.js: record the tool round, then recurse into the
        // follow-up stream on the SAME context.
        nextRound: null,
        async handleToolCalls(completion, top, c) {
            c.chatHistory.push({ role: 'assistant', content: completion });
            c.chatHistory.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: 'ok' }] });
            if (env.nextRound) await env.handleMessageStream(env.nextRound(), c);
            return {};
        },
    };
    vm.createContext(env);
    vm.runInContext(streamSource, env);
    const context = (history = []) => ({
        currentChatId: env.currentChatId, abortController: new AbortController(),
        chatHistory: history, currentMessage: null, currentMessageContent: '',
    });
    return { env, rendered, context };
}
async function* chunks(...items) { yield* items; }
const textOf = rendered => rendered.map(r => r.content);

// 1. The reported bug: checklist unfinished, model answers "continue" with text.
{
    const h = setup();
    const c = h.context([{ role: 'user', content: 'continue' }]);
    await h.env.handleMessageStream(chunks({ type: 'text', text: 'Picking up with the grid next.' }), c);
    assert.deepEqual(textOf(h.rendered), ['Picking up with the grid next.'], 'text-only reply is shown');
    assert.equal(h.rendered[0].id, c.chatHistory.at(-1).messageId, 'bubble carries the history messageId');
    console.log('ok   - text-only reply under an unfinished checklist is revealed');
}

// 2. Narration before a tool stays hidden; the final text after the round shows.
{
    const h = setup();
    h.env.nextRound = () => chunks({ type: 'text', text: 'All set — the grid is built.' });
    const c = h.context([{ role: 'user', content: 'continue' }]);
    await h.env.handleMessageStream(chunks(
        { type: 'text', text: 'Now writing the grid.' },
        { type: 'tool_use', id: 't', name: 'WriteFile', input: {} },
    ), c);
    assert.deepEqual(textOf(h.rendered), ['All set — the grid is built.'], 'only the final reply is shown');
    assert.equal(c.chatHistory.find(m => m.content === 'Now writing the grid.') != null, true, 'narration still in history');
    console.log('ok   - mid-turn narration stays suppressed, final reply after a tool round is revealed');
}

// 3. No active checklist: streamed normally, never duplicated.
{
    const h = setup({ activeTodos: false });
    const c = h.context([{ role: 'user', content: 'hi' }]);
    await h.env.handleMessageStream(chunks({ type: 'text', text: 'Hello' }, { type: 'text', text: '!' }), c);
    assert.equal(h.rendered.length, 1, 'one bubble');
    assert.equal(h.rendered[0].content, 'Hello!');
    console.log('ok   - normally streamed reply is not duplicated');
}

// 4. Turn ends on a tool round with no closing text: nothing to reveal.
{
    const h = setup();
    const c = h.context([{ role: 'user', content: 'go' }]);
    await h.env.handleMessageStream(chunks(
        { type: 'text', text: 'Writing files.' },
        { type: 'tool_use', id: 't', name: 'WriteFile', input: {} },
    ), c);
    assert.equal(h.rendered.length, 0, 'narration before the last tool is not revealed');
    console.log('ok   - turn ending on a tool result reveals nothing');
}

// 5. Aborted or stale turns render nothing.
for (const end of ['abort', 'stale']) {
    const h = setup();
    const c = h.context([{ role: 'user', content: 'continue' }]);
    async function* response() {
        yield { type: 'text', text: 'Partial' };
        if (end === 'abort') c.abortController.abort();
        else h.env.currentChatId = 'two';
    }
    await h.env.handleMessageStream(response(), c).catch(() => {});
    assert.equal(h.rendered.length, 0, `${end}: nothing rendered`);
    console.log(`ok   - ${end === "abort" ? "aborted" : "stale"} turn reveals nothing`);
}

// 6. Empty response never reaches back to an earlier turn's reply.
{
    const h = setup();
    const c = h.context([
        { role: 'user', content: 'build' },
        { role: 'assistant', content: 'Earlier reply', messageId: 'old' },
        { role: 'user', content: 'continue' },
    ]);
    await h.env.handleMessageStream(chunks({ type: 'usage', usage: {} }), c);
    assert.equal(h.rendered.length, 0, 'no bubble for an empty response');
    // Even if the history ends on an older assistant message (no new user
    // message this attempt, e.g. a retry that produced nothing), it's out of scope.
    const c2 = h.context([{ role: 'assistant', content: 'Earlier reply', messageId: 'old' }]);
    await h.env.handleMessageStream(chunks(), c2);
    assert.equal(h.rendered.length, 0, 'earlier message is out of scope');
    console.log('ok   - earlier turns are never re-rendered');
}

// 7. Already on screen (e.g. a switch-away-and-back reload rendered it): no duplicate.
{
    const h = setup({ preRendered: ['msg_1'] });
    const c = h.context([{ role: 'user', content: 'continue' }]);
    await h.env.handleMessageStream(chunks({ type: 'text', text: 'Reply' }), c);
    assert.equal(c.chatHistory.at(-1).messageId, 'msg_1');
    assert.equal(h.rendered.length, 1, 'existing bubble is reused, not duplicated');
    console.log('ok   - reply already on screen is not duplicated');
}

// 8. Error entries are never re-rendered as plain replies.
{
    const h = setup();
    const c = h.context([{ role: 'user', content: 'x' }]);
    c.chatHistory.push({ role: 'assistant', content: 'Something went wrong', isError: true });
    h.env.revealFinalReply(c, 0);
    assert.equal(h.rendered.length, 0, 'isError entry skipped');
    console.log('ok   - error entries are skipped');
}
