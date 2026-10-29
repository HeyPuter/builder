import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ---- Build Abandoned: a build the user gave up on ---------------------------
// Build Started and Build Completed couldn't say how many builds people left,
// or whether they left during the first wait, before the model showed
// anything. Build Abandoned is sent the moment the user stops a build, opens
// another project (or a new one), deletes this one, or leaves the page, with
// how long they waited and whether anything had appeared. Only builds Build
// Started counted, so the two divide.
//
// Runs the real trackBuildAbandoned and waitBand on a fake clock, the real
// stream handler for what counts as output, and text-asserts the wiring.

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const app = read('../src/js/app.js');
const helpers = read('../src/js/helpers.js');
const streamSource = read('../src/js/handleMessageStream.js');
const toolsSource = read('../src/js/tools.js');
const modelSource = read('../src/js/model-core.js');

function slice(src, from, to) {
    const a = src.indexOf(from), b = src.indexOf(to, a + from.length);
    if (a < 0 || b <= a) throw new Error('could not extract ' + from);
    return src.slice(a, b);
}

let failures = 0;
async function check(name, fn) {
    try { await fn(); console.log('ok   - ' + name); }
    catch (e) { failures++; console.log('FAIL - ' + name + '\n       ' + e.message); }
}

function harness() {
    const events = [];
    let now = 1_000_000;
    const api = new Function('window', 'Date', `
        let _activeBuild = null, isProcessing = true, _turnProgressed = false;
        ${slice(helpers, 'const WAIT_BANDS', '/**\n * Format a token count')}
        ${slice(app, 'function trackBuildAbandoned(how) {', "window.addEventListener('pagehide'")}
        return {
            abandon: trackBuildAbandoned, waitBand,
            start: (firstBuild) => { _activeBuild = { turnSeq: 1, startedAt: Date.now(), firstBuild }; isProcessing = true; _turnProgressed = false; },
            progressed: () => { _turnProgressed = true; },
            idle: () => { isProcessing = false; },
        };`)({ track: (e, p) => events.push([e, p]) }, { now: () => now });
    return { ...api, events, wait: (ms) => { now += ms; } };
}

await check('waiting time is banded around the first wait', async () => {
    const { waitBand } = harness();
    const at = (ms) => waitBand(ms);
    assert.deepEqual([0, 4999, 5000, 9999, 10000, 29999, 30000, 59999, 60000, 179999, 180000, 900000].map(at),
        ['<5s', '<5s', '5-10s', '5-10s', '10-30s', '10-30s', '30-60s', '30-60s', '1-3m', '1-3m', '3m+', '3m+']);
});

await check('leaving during the first wait says nothing had appeared, and how long it was', async () => {
    const h = harness();
    h.start(true);
    h.wait(7000);
    h.abandon('stopped');
    assert.deepEqual(h.events, [['Build Abandoned', { how: 'stopped', saw_output: false, waited: '5-10s', first_build: true }]]);
});

await check('leaving later says the model had shown something', async () => {
    const h = harness();
    h.start(false);
    h.progressed();
    h.wait(45000);
    h.abandon('left');
    assert.deepEqual(h.events[0][1], { how: 'left', saw_output: true, waited: '30-60s', first_build: false });
});

await check('a build is reported once, and nothing without a running build', async () => {
    const h = harness();
    h.abandon('left');
    assert.equal(h.events.length, 0, 'no build started');
    h.start(false);
    h.abandon('switched');
    h.abandon('left');
    assert.equal(h.events.length, 1, 'switching away, then closing the tab, is one abandon');
    h.start(false);
    h.idle();
    h.abandon('left');
    assert.equal(h.events.length, 1, 'a finished build is not abandoned');
});

await check('every way of giving up reports, as it happens', async () => {
    assert.match(app, /function terminateActiveTurn\(how = 'switched'\) \{\s*if \(!isProcessing\) return;\s*trackBuildAbandoned\(how\);/);
    assert.match(app, /if \(currentChatId === chatId\) terminateActiveTurn\('deleted'\);/);
    // The Stop button. Send now on a queued message stops the build too, but
    // to change course, not to give up, so it isn't counted.
    assert.match(app, /if \(isProcessing\) \{\s*trackBuildAbandoned\('stopped'\);\s*stopActiveTurn\(\);/);
    assert.match(app, /window\.addEventListener\('pagehide', \(\) => trackBuildAbandoned\('left'\)\);/);
});

await check('only builds Build Started counted, and only until that turn ends', async () => {
    assert.match(app, /window\.track\?\.\('Build Started', [^\n]*\n\s*_activeBuild = \{ turnSeq, startedAt: turnStartedAt, firstBuild: isFirstBuildTurn \};/);
    assert.match(app, /if \(_activeBuild && _activeBuild\.turnSeq === turnSeq\) _activeBuild = null;/);
});

// ---- What counts as the model showing something -----------------------------

await check('reasoning and a tool call starting count as output, not just text', async () => {
    async function* chunks(...items) { yield* items; }
    let progress = 0;
    const env = {
        AbortController, DOMException, setTimeout, clearTimeout, console,
        currentChatId: 'one', shouldStop: false,
        marked: { parse: (s) => s }, escapeMarkdownSource: (s) => s, $: () => ({ length: 0 }),
        hasActiveTodos: () => false, appendMessage: () => ({ length: 0, find: () => ({ html() {} }), attr() {} }),
        autoScrollTrigger() {}, createThinkingPreview: () => ({ append() {}, remove() {} }),
        isStaleTurn: () => false, isAborted: () => false,
        showSpinner() {}, startSpinnerStub() {}, stopSpinnerStub() {}, scheduleSaveCurrentChat() {},
        generateMessageId: () => 'msg', prepareHistoryForAI: (h) => h,
        noteTurnProgress: () => { progress++; },
        puter: { ai: { chat: async () => chunks({ type: 'text', text: 'Done.' }, { type: 'usage', usage: {} }) } },
    };
    env.window = env;
    vm.createContext(env);
    vm.runInContext(modelSource, env);
    vm.runInContext(streamSource, env);
    vm.runInContext(toolsSource, env);
    const context = { currentChatId: 'one', abortController: new AbortController(), tools: [], chatHistory: [], currentMessage: null, currentMessageContent: '' };
    await env.handleMessageStream(chunks({ type: 'reasoning', reasoning: 'Let me look.' }), context);
    assert.equal(progress, 1, 'reasoning');
    await env.handleMessageStream(chunks({ type: 'tool_use_start', id: 't', name: 'write' }), { ...context, recursed: true });
    assert.equal(progress, 2, 'a tool call starting');
});

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll build-abandoned checks passed.');
