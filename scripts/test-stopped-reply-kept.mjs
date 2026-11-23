import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ---- A reply that gets cut off keeps the text that had streamed so far ------
// Text is committed to the history around tool calls and at the end of a turn.
// A Stop, a credit error or a closed tab in the middle of the reply came
// before either, so the sentence in progress was never saved. It was gone
// after a reload, and unseen by the model on Resume or "continue". Runs the
// REAL handleMessageStream.js with scripted streams, and the blocks of app.js
// that end a turn without a retry or save a reply while it streams.

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
        extractErrorText: (e) => (e && (e.message || (e.error && e.error.message))) || String(e),
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

// The watchdog's abort can also end the stream without an AbortError. When a
// chunk is already in hand as the abort lands, the loop's own isAborted check
// returns. sendChatMessage then never reaches its retry, and the post-loop
// backstop turns the turn into a Resume. That block runs here from app.js.
const appSource = read('../src/js/app.js');
// The source from `at` through the brace that closes the first block opened
// after it.
function blockFrom(at) {
    assert.ok(at >= 0, 'block found in app.js');
    let depth = 0, i = appSource.indexOf('{', at);
    for (; i < appSource.length; i++) {
        if (appSource[i] === '{') depth++;
        else if (appSource[i] === '}' && --depth === 0) break;
    }
    return appSource.slice(at, i + 1);
}
const stallBackstop = () => blockFrom(appSource.indexOf('if (_stallRecovery) {', appSource.indexOf('// Belt-and-suspenders')));
// Reads that are already settled. The abort fires as the last one is taken,
// so that chunk wins the race against the abort. The reads use the page's own
// Promise, as a real stream's do. One from another realm settles a tick late.
function abortsWithChunkInHand(env, controller, ...items) {
    const PagePromise = vm.runInContext('Promise', env);
    let i = 0;
    return {
        [Symbol.asyncIterator]() { return this; },
        next() {
            if (i === items.length - 1) controller.abort();
            return PagePromise.resolve(i < items.length ? { value: items[i++], done: false } : { done: true });
        },
    };
}

await check('a watchdog abort that ends the stream quietly, with no retry, keeps the text', async () => {
    const h = setup({ stallRecovery: true });
    await h.env.handleMessageStream(abortsWithChunkInHand(h.env, h.context.abortController, text('Working on it'), text(' more')), h.context);
    assert.equal(replies(h).length, 0, 'held back while a retry could still rewrite it');
    h.env.context = h.context;
    vm.runInContext(`var turnChatId = 'one', activeTurnInterrupted = false, retryGaveUp = false, gaveUpBannerText = '';`, h.env);
    vm.runInContext(stallBackstop(), h.env);
    assert.equal(h.env.retryGaveUp, true, 'offers Resume');
    assert.deepEqual(replies(h).map((m) => m.content), ['Working on it']);
});

// ---- Out of credits ---------------------------------------------------------
// Puter either cuts the stream short (usage_limited, which ends like any other
// reply) or sends a 402 insufficient_funds error line. The error line throws
// out of the stream, which is no abort, so the text is kept where
// sendChatMessage records the error card. That catch block runs here from
// app.js.
const turnCatch = () => {
    const at = appSource.lastIndexOf('} catch (error) {', appSource.indexOf('error.error?.delegate === "usage-limited-chat"'));
    return `(function (error) ${blockFrom(at + 1).slice('catch (error) '.length)})`;
};
function runTurnCatch(h, error) {
    const chainable = { length: 0, remove() {}, hide() {}, closest() { return chainable; } };
    Object.assign(h.env, {
        context: h.context, turnSaveContext: { chatHistory: h.context.chatHistory },
        spinner: null, turnSeq: 7, _turnSeq: 7, turnChatId: 'one', activeTurnInterrupted: false,
        turnErrored: false, isFirstBuildTurn: false, turnModel: 'm', turnTemplate: {}, turnStats: {}, savedChats: [],
        $: () => chainable,
        trackLimitHit() {}, recordUsageLimitHit() {}, usageLimitHitProps: () => ({}),
        isLowBalanceRefusal: (e) => e?.error?.code === 'insufficient_funds',
        friendlyErrorMessage: () => 'You are out of credits.',
        appendErrorMessage: () => ({ addClass() {} }),
        isCreditErrorEntry: (m) => !!m.creditError,
    });
    vm.runInContext(turnCatch(), h.env)(error);
}
const creditErrorLine = { type: 'error', error: { code: 'insufficient_funds', message: 'Insufficient funds' } };
const shown = (h) => h.context.chatHistory.slice(1).map((m) => (m.isError ? '[error card]' : m.content));

await check('a reply Puter cuts short for credits is saved', async () => {
    const h = setup();
    await h.env.handleMessageStream(chunks(text('Adding the menu sec'), { type: 'usage', usage: {}, metadata: { usage_limited: true } }), h.context);
    assert.equal(h.context.usageLimited, true);
    assert.deepEqual(replies(h).map((m) => m.content), ['Adding the menu sec']);
});

await check('a credit error mid-reply keeps the text, ahead of the error card', async () => {
    const h = setup();
    const err = await h.env.handleMessageStream(chunks(text('Adding the menu sec'), creditErrorLine), h.context).catch((e) => e);
    assert.equal(err?.error?.code, 'insufficient_funds', 'the error line throws');
    assert.equal(replies(h).length, 0, 'not kept by the stream, it was not aborted');
    runTurnCatch(h, err);
    assert.equal(h.env.turnErrored, true);
    assert.deepEqual(shown(h), ['Adding the menu sec', '[error card]']);
});

await check('a credit error before any text adds only the error card', async () => {
    const h = setup();
    const err = await h.env.handleMessageStream(chunks(creditErrorLine), h.context).catch((e) => e);
    runTurnCatch(h, err);
    assert.deepEqual(shown(h), ['[error card]']);
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

// ---- Network errors past the retries ----------------------------------------
check('out of retries, the text is kept instead of dropped for a retry', () => {
    assert.match(appSource, /if \(!stallRecovery && attempt >= MAX_TURN_RETRIES\) keepCutOffReply\(context\);\s*else removeUncommittedBubble\(context\);/);
});

// ---- A tab closed, reloaded or killed mid-reply -----------------------------
// Nothing runs then, so the text is saved while it streams. Runs app.js's
// pending-reply and reply-checkpoints blocks next to the real stream, on fake
// timers.
function checkpointSetup(opts) {
    const h = setup(opts);
    const timers = [];
    const listeners = {};
    h.saves = [];
    Object.assign(h.env, {
        setTimeout: (fn) => { const t = { fn }; timers.push(t); return t; },
        clearTimeout: (t) => { if (t) t.cleared = true; },
        document: { visibilityState: 'visible', addEventListener: (type, fn) => { listeners[type] = fn; } },
        // What the save would write as the chat's history.
        scheduleSaveCurrentChat: (ctx) => { h.saves.push([...h.env.historyWithPendingReply(ctx)].map((m) => m.content)); },
    });
    for (const name of ['pending-reply', 'reply-checkpoints']) {
        const a = appSource.indexOf(`// ===== ${name} (start) =====`);
        const b = appSource.indexOf(`// ===== ${name} (end) =====`);
        assert.ok(a >= 0 && b > a, `${name} block found in app.js`);
        vm.runInContext(appSource.slice(a, b), h.env);
    }
    h.runTimers = () => timers.splice(0).forEach((t) => { if (!t.cleared) t.fn(); });
    h.hidePage = () => { h.env.document.visibilityState = 'hidden'; listeners.visibilitychange(); };
    h.start = (stream) => {
        const run = h.env.handleMessageStream(stream, h.context).catch(() => {});
        return new Promise((r) => setTimeout(r, 5)).then(() => run);
    };
    return h;
}

await check('a reply still being written is saved within seconds, after the history', async () => {
    const h = checkpointSetup();
    h.start(hangingAfter(text('Here is what I built '), text('so far')));
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(h.saves.length, 0, 'not on every chunk');
    h.runTimers();
    assert.deepEqual(h.saves, [['Build a menu page', 'Here is what I built so far']]);
    assert.equal(h.context.chatHistory.length, 1, 'the live history is left to the turn');
    h.context.abortController.abort();
});

await check('hiding the page saves it at once', async () => {
    const h = checkpointSetup();
    h.start(hangingAfter(text('Half of the reply')));
    await new Promise((r) => setTimeout(r, 5));
    h.hidePage();
    assert.deepEqual(h.saves, [['Build a menu page', 'Half of the reply']]);
    h.runTimers();
    assert.equal(h.saves.length, 1, 'the timer was cancelled');
    h.context.abortController.abort();
});

check('the save writes the text, and pagehide sends it', () => {
    assert.match(appSource, /history: historyWithPendingReply\(context\),/);
    assert.match(appSource, /window\.addEventListener\('pagehide', \(\) => \{\s*\/\/[^\n]*\n\s*flushReplyCheckpoint\(\);/);
});

await check('nothing more is saved once the reply was committed', async () => {
    const h = checkpointSetup();
    await h.env.handleMessageStream(chunks(text('All done.'), { type: 'usage', usage: {} }), h.context);
    h.runTimers();
    assert.equal(h.saves.length, 0);
});

await check('a turn a newer one replaced is not saved', async () => {
    const h = checkpointSetup({ latestTurnSeq: 8 });
    h.start(hangingAfter(text('Working on it')));
    await new Promise((r) => setTimeout(r, 5));
    h.runTimers();
    assert.equal(h.saves.length, 0);
    h.context.abortController.abort();
});

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nAll stopped-reply checks passed');
