import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ---- A reply cut off by Stop keeps the text that had streamed so far --------
// Text is committed to the history around tool calls and at the end of a turn.
// A Stop in the middle of the reply returned before either, so the sentence in
// progress stayed on screen but was never saved: gone after a reload, and
// unseen by the model on Resume. Runs the REAL handleMessageStream.js with a
// scripted stream that writes some text, then goes quiet until aborted.

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const streamSource = read('../src/js/handleMessageStream.js');

// Yields its chunks, then hangs like a live stream until the caller aborts.
async function* hangingAfter(...items) {
    yield* items;
    await new Promise(() => {});
}
async function* chunks(...items) { yield* items; }
const text = (t) => ({ type: 'text', text: t });

function setup({ stallRecovery = false, latestTurnSeq = 7 } = {}) {
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
    };
    env.window = env;
    vm.createContext(env);
    // app.js's globals, which the stream reads by name.
    vm.runInContext(`var _stallRecovery = ${stallRecovery}; var _latestTurnSeqByChat = new Map([['one', ${latestTurnSeq}]]);`, env);
    vm.runInContext(streamSource, env);
    const context = {
        currentChatId: 'one', abortController: new AbortController(), turnSeq: 7,
        chatHistory: [{ role: 'user', content: 'Build a menu page' }],
        currentMessage: null, currentMessageContent: '',
    };
    return { env, context };
}

// Start the stream, let its chunks land, then Stop it.
async function stopMidReply(h, stream) {
    const run = h.env.handleMessageStream(stream, h.context).catch((e) => e);
    await new Promise((r) => setTimeout(r, 5));
    h.context.abortController.abort();
    return run;
}

const replies = (h) => h.context.chatHistory.filter((m) => m.role === 'assistant');

let failures = 0;
async function check(name, fn) {
    try { await fn(); console.log('ok   - ' + name); }
    catch (e) { failures++; console.log('FAIL - ' + name + '\n       ' + e.message); }
}

await check('Stop keeps the text that had streamed so far', async () => {
    const h = setup();
    await stopMidReply(h, hangingAfter(text('Done! I added the menu page '), text('and')));
    const r = replies(h);
    assert.equal(r.length, 1);
    assert.equal(r[0].content, 'Done! I added the menu page and');
    assert.equal(h.context.currentMessageContent, '', 'committed, not left pending');
});

await check('a stream already aborted when its next chunk arrives keeps it too', async () => {
    const h = setup();
    async function* abortsItself() {
        yield text('Half a sentence');
        h.context.abortController.abort();
        yield text(' more');
    }
    await h.env.handleMessageStream(abortsItself(), h.context).catch(() => {});
    assert.deepEqual(replies(h).map((m) => m.content), ['Half a sentence']);
});

await check('a Stop before any text adds nothing', async () => {
    const h = setup();
    await stopMidReply(h, hangingAfter());
    assert.equal(replies(h).length, 0);
});

await check('the stall watchdog\'s abort leaves the text unsaved (its retry rewrites it)', async () => {
    const h = setup({ stallRecovery: true });
    await stopMidReply(h, hangingAfter(text('Working on it')));
    assert.equal(replies(h).length, 0);
});

await check('a newer turn in the same chat gets the history to itself', async () => {
    const h = setup({ latestTurnSeq: 8 });
    await stopMidReply(h, hangingAfter(text('Working on it')));
    assert.equal(replies(h).length, 0);
});

await check('a reply that finishes is still saved once', async () => {
    const h = setup();
    await h.env.handleMessageStream(chunks(text('All done.'), { type: 'usage', usage: {} }), h.context);
    assert.deepEqual(replies(h).map((m) => m.content), ['All done.']);
});

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nAll stopped-reply checks passed');
