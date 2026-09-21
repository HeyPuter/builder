import fs from 'node:fs';

// ---- Regression guard for mobile background/screen-off resilience -----------
// On phones, backgrounding the browser or letting the screen turn off freezes
// the page and usually kills the streaming AI request — sometimes SILENTLY (the
// stream never yields again and never throws). The mobile-lifecycle-keepalive
// block in app.js defends with (1) a screen Wake Lock while a turn runs, (2) a
// return-to-foreground stall watchdog that aborts a dead attempt into the
// existing retry/resume machinery, and (3) hidden-failure retries that don't
// consume the normal retry budget. The watchdog must NEVER kill a healthy turn:
// not on a short tab switch, not when the stream shows life, not after a user
// Stop or chat switch, and not when a newer attempt has taken over. This test:
//   * evaluates the REAL keepalive block sliced out of app.js inside a mocked
//     browser environment (document/navigator/Date/setTimeout) and drives the
//     visibility/freeze handlers + watchdog through every bail condition, then
//   * text-asserts sendChatMessage's stall-recovery + hidden-retry invariants.
// Mirrors scripts/test-transient-retry.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');

// --- Slice + evaluate the REAL keepalive block --------------------------------
const kaA = APP.indexOf('// ===== mobile-lifecycle-keepalive (start) =====');
const kaB = APP.indexOf('// ===== mobile-lifecycle-keepalive (end) =====');
if (kaA < 0 || kaB < 0 || kaB <= kaA) throw new Error('could not extract mobile-lifecycle-keepalive block');
let KEEPALIVE = APP.slice(kaA, kaB);

// The block's module-level `let _x = ...` state is shared with sendChatMessage
// in the real bundle. For the harness, strip those declarations so — inside a
// sloppy-mode `with (env)` — every read/write resolves to the env object, which
// the test can inspect and mutate. If the block's state shape changes, the seed
// list below fails loudly rather than silently testing nothing.
const stateNames = [];
KEEPALIVE = KEEPALIVE.replace(/^let (_\w+) = [^;]+;/gm, (m, name) => { stateNames.push(name); return ''; });
const EXPECTED_STATE = ['_wakeLock', '_wakeLockPending', '_hiddenAt', '_pageWasFrozen',
    '_turnLastActivityAt', '_turnAwaitingStream', '_stallRecovery'];
check('keepalive state variables all found', EXPECTED_STATE.every(n => stateNames.includes(n)));

function makeEnv() {
    const timers = [];
    const docListeners = {};
    const env = {
        __now: 0,
        timers,
        docListeners,
        // stripped block state
        _wakeLock: null, _wakeLockPending: false, _hiddenAt: 0, _pageWasFrozen: false,
        _turnLastActivityAt: 0, _turnAwaitingStream: false, _stallRecovery: false,
        // globals the block reads live
        isProcessing: false,
        currentChatId: 'chat-1',
        abortController: null,
        shouldStop: false,
        activeTurnInterrupted: false,
        // mocked browser environment
        window: {},
        navigator: {},
        document: {
            visibilityState: 'visible',
            addEventListener: (type, fn) => { docListeners[type] = fn; },
        },
        Date: { now: () => env.__now },
        setTimeout: (fn, delay) => { timers.push({ fn, delay }); },
    };
    const exports = new Function('env',
        'with (env) {\n' + KEEPALIVE + '\nreturn { armStallWatchdog, acquireWakeLock, releaseWakeLock, noteTurnActivity };\n}'
    )(env);
    return { env, exports };
}
function makeAbortable() {
    const c = { aborted: 0, abort() { this.aborted++; } };
    return c;
}
function fireHidden(env, at) {
    env.__now = at;
    env.document.visibilityState = 'hidden';
    env.docListeners['visibilitychange']();
}
function fireVisible(env, at) {
    env.__now = at;
    env.document.visibilityState = 'visible';
    env.docListeners['visibilitychange']();
}

// === Arming: only the mobile-freeze scenario trips the watchdog ==============
{
    const { env } = makeEnv();
    env.isProcessing = true;
    env.abortController = makeAbortable();
    env._turnAwaitingStream = true;
    fireHidden(env, 100000);
    fireVisible(env, 105000); // short tab switch
    check('short hidden stretch does NOT arm the watchdog', env.timers.length === 0);
}
{
    const { env } = makeEnv();
    env.isProcessing = true;
    env.abortController = makeAbortable();
    env._turnAwaitingStream = true;
    fireHidden(env, 100000);
    fireVisible(env, 125000); // hidden past STALL_HIDDEN_MIN_MS
    check('long hidden stretch arms the watchdog', env.timers.length === 1);
}
{
    const { env } = makeEnv();
    env.isProcessing = true;
    env.abortController = makeAbortable();
    env._turnAwaitingStream = true;
    env.docListeners['freeze']();
    fireHidden(env, 100000);
    fireVisible(env, 105000); // short, but the page reports it was FROZEN
    check('freeze event arms the watchdog even after a short stretch', env.timers.length === 1);
}
{
    const { env } = makeEnv();
    env.isProcessing = false; // no turn running
    fireHidden(env, 100000);
    fireVisible(env, 125000);
    check('no in-flight turn → nothing armed', env.timers.length === 0);
}
{
    const { env, exports } = makeEnv();
    env.isProcessing = true;
    env.abortController = makeAbortable();
    env._turnAwaitingStream = true;
    fireHidden(env, 100000);
    env.__now = 122000;
    exports.noteTurnActivity(); // chunk arrived while hidden (desktop background tab)
    fireVisible(env, 125000);
    check('fresh stream activity suppresses arming (healthy desktop background tab)', env.timers.length === 0);
}

// === Firing: every bail condition must protect a live/abandoned turn =========
function armedEnv() {
    const { env, exports } = makeEnv();
    env.isProcessing = true;
    env.abortController = makeAbortable();
    env._turnAwaitingStream = true;
    fireHidden(env, 100000);
    fireVisible(env, 125000);
    if (env.timers.length !== 1) throw new Error('expected exactly one armed watchdog');
    const fire = (at) => { env.__now = at; env.timers[0].fn(); };
    return { env, exports, fire };
}
{
    const { env, fire } = armedEnv();
    fire(137000); // silent past the grace window
    check('dead stream → attempt aborted', env.abortController.aborted === 1);
    check('dead stream → stall-recovery flag set for the retry loop', env._stallRecovery === true);
    check('watchdog delay equals the grace window', env.timers[0].delay === 12000);
}
{
    const { env, exports, fire } = armedEnv();
    env.__now = 130000;
    exports.noteTurnActivity(); // stream came back to life during the grace window
    fire(137000);
    check('stream activity during grace → NOT aborted', env.abortController.aborted === 0 && env._stallRecovery === false);
}
{
    const { env, fire } = armedEnv();
    env.shouldStop = true; // user pressed Stop during the grace window
    fire(137000);
    check('user Stop during grace → NOT aborted', env.abortController.aborted === 0 && env._stallRecovery === false);
}
{
    const { env, fire } = armedEnv();
    env.activeTurnInterrupted = true;
    fire(137000);
    check('interrupted turn → NOT aborted', env.abortController.aborted === 0 && env._stallRecovery === false);
}
{
    const { env, fire } = armedEnv();
    env.currentChatId = 'chat-2'; // user switched chats during the grace window
    fire(137000);
    check('chat switch during grace → NOT aborted', env.abortController.aborted === 0 && env._stallRecovery === false);
}
{
    const { env, fire } = armedEnv();
    const watched = env.abortController;
    env.abortController = makeAbortable(); // a newer attempt took over
    fire(137000);
    check('newer attempt during grace → neither controller aborted',
        watched.aborted === 0 && env.abortController.aborted === 0 && env._stallRecovery === false);
}
{
    const { env, fire } = armedEnv();
    env.isProcessing = false; // turn finished during the grace window
    fire(137000);
    check('turn finished during grace → NOT aborted', env.abortController.aborted === 0 && env._stallRecovery === false);
}
{
    const { env, fire } = armedEnv();
    env._turnAwaitingStream = false; // between attempts (backoff wait)
    fire(137000);
    check('turn between attempts (backoff) → NOT aborted', env.abortController.aborted === 0 && env._stallRecovery === false);
}
{
    const { env, fire } = armedEnv();
    env.document.visibilityState = 'hidden'; // backgrounded again before firing
    fire(137000);
    check('re-hidden before firing → NOT aborted (next return re-arms)',
        env.abortController.aborted === 0 && env._stallRecovery === false);
}

// === Wake lock: best-effort, turn-scoped, never leaked =======================
{
    const { env, exports } = makeEnv(); // navigator has NO wakeLock
    env.isProcessing = true;
    await exports.acquireWakeLock();
    check('no Wake Lock API → silently fine', env._wakeLock === null);
}
function makeLock() {
    return { released: false, release() { this.released = true; return Promise.resolve(); }, addEventListener() {} };
}
{
    const { env, exports } = makeEnv();
    const lock = makeLock();
    env.navigator.wakeLock = { request: async () => lock };
    env.isProcessing = true;
    await exports.acquireWakeLock();
    check('wake lock acquired while a turn runs', env._wakeLock === lock);
    env.isProcessing = false; // turn over (resetUIState clears the flag before release)
    exports.releaseWakeLock();
    check('wake lock released when the turn ends', env._wakeLock === null && lock.released === true);
}
{
    const { env, exports } = makeEnv();
    const lock = makeLock();
    env.navigator.wakeLock = { request: async () => lock };
    env.isProcessing = false; // turn ended while the request was in flight
    await exports.acquireWakeLock();
    check('turn ended during acquisition → lock released, not leaked', env._wakeLock === null && lock.released === true);
}
{
    const { env, exports } = makeEnv();
    const lock = makeLock();
    env.navigator.wakeLock = { request: async () => lock };
    env.isProcessing = true;
    await exports.acquireWakeLock();
    exports.releaseWakeLock(); // a NEWER turn is processing — must keep the lock
    check('release is skipped while another turn still runs', env._wakeLock === lock && lock.released === false);
}
{
    const { env, exports } = makeEnv();
    env.navigator.wakeLock = { request: async () => { throw new Error('should not be called'); } };
    env.document.visibilityState = 'hidden';
    env.isProcessing = true;
    await exports.acquireWakeLock();
    check('no acquisition attempt while the page is hidden', env._wakeLock === null);
}

// === Structural invariants of the recovery paths in sendChatMessage ==========
const sendA = APP.indexOf('async function sendChatMessage(');
const rest = APP.slice(sendA + 50);
const endRel = rest.search(/\n(async )?function \w/);
const SEND = endRel > 0 ? APP.slice(sendA, sendA + 50 + endRel) : APP.slice(sendA);
check('sendChatMessage slice is bounded and non-trivial', SEND.length > 500 && SEND.length < APP.length);

check('attempt liveness is bracketed for the watchdog (_turnAwaitingStream true→false)',
    /_turnAwaitingStream = true;[\s\S]*?await abortableAwait\(puter\.ai\.chat/.test(SEND)
    && /catch \(streamError\) \{\s*\n\s*if \(abortController === attemptController\) _turnAwaitingStream = false;/.test(SEND));
check('a stale turn\'s late unwind cannot clear the live turn\'s liveness flag',
    SEND.includes('const attemptController = abortController;')
    && !/\n\s*_turnAwaitingStream = false;/.test(SEND)); // only the guarded form exists
check('stall recovery NEVER fires on user stop / chat-switch',
    /_stallRecovery && !shouldStop\s*&&\s*!activeTurnInterrupted && turnChatId === currentChatId/.test(SEND));
check('stall flag is always consumed (no leak into the next error)',
    SEND.includes('_stallRecovery = false;'));
check('stall recovery resumes from checkpointed history without consuming the retry budget',
    (() => {
        const a = SEND.indexOf('if (stallRecovery) {');
        if (a < 0) return false;
        const b = SEND.indexOf('if (attempt >= MAX_TURN_RETRIES)', a);
        if (b < 0) return false;
        const block = SEND.slice(a, b);
        return block.includes('prepareResumeHistory(turnSaveContext.chatHistory)')
            && block.includes('if (!proceed) break')
            && block.includes('continue;')
            && !block.includes('attempt++');
    })());
check('stall flag cleared at turn start (no stale recovery from a previous turn)',
    /isProcessing = true;[\s\S]{0,400}_stallRecovery = false;/.test(SEND));
check('hidden-page failures do not consume the retry budget (but stay capped)',
    SEND.includes("document.visibilityState === 'hidden'")
    && SEND.includes('hiddenRetries < MAX_HIDDEN_TURN_RETRIES')
    && SEND.includes('if (hiddenRetry) hiddenRetries++; else attempt++;'));
check('silent abort-unwind still leaves the turn resumable (post-loop _stallRecovery → retryGaveUp)',
    /if \(_stallRecovery\) \{[\s\S]*?retryGaveUp = true;/.test(SEND));
check('wake lock is acquired at turn start and released at teardown',
    SEND.includes('acquireWakeLock();') && SEND.includes('releaseWakeLock();'));

// === Liveness stamps feed the watchdog =======================================
const HMS = fs.readFileSync(new URL('../src/js/handleMessageStream.js', import.meta.url), 'utf8');
check('every streamed chunk stamps liveness (after the abort/stale bail)',
    /isAborted\(context\.abortController\) \|\| isStaleTurn\(context\)[\s\S]*?window\.noteTurnActivity\?\.\(\)/.test(HMS));
const TOOLS = fs.readFileSync(new URL('../src/js/tools.js', import.meta.url), 'utf8');
check('each agentic round handoff stamps liveness (stale-guarded)',
    TOOLS.includes('if (!isStaleTurn(c)) window.noteTurnActivity?.()'));

// === Abort-aware stream plumbing =============================================
// puter.ai.chat ignores the `signal` option, so the abort that drives Stop /
// chat-switch / the stall watchdog only takes effect because these wrappers
// race the pending open/read against the signal. Without them, a watchdog
// abort of a dead socket would unhang NOTHING and the recovery never runs.
check('handleMessageStream iterates via the abort-aware wrapper',
    HMS.includes('for await (const completion of abortableStream(stream, context.abortController && context.abortController.signal))'));
check('first-round open is abort-aware (app.js)', SEND.includes('await abortableAwait(puter.ai.chat('));
check('round-handoff open is abort-aware (tools.js)', TOOLS.includes('await abortableAwait(puter.ai.chat('));

// Functional: evaluate the REAL wrappers sliced out of handleMessageStream.js.
const abA = HMS.indexOf('// ===== abortable-stream (start) =====');
const abB = HMS.indexOf('// ===== abortable-stream (end) =====');
if (abA < 0 || abB < 0 || abB <= abA) throw new Error('could not extract abortable-stream block');
const { abortableAwait, abortableStream } = new Function(
    HMS.slice(abA, abB) + '\nreturn { abortableAwait, abortableStream };'
)();

{
    async function* src() { yield 1; yield 2; }
    const ctrl = new AbortController();
    const out = [];
    for await (const v of abortableStream(src(), ctrl.signal)) out.push(v);
    check('abortableStream passes chunks through and completes', out.join(',') === '1,2');
}
{
    let returned = false;
    const dead = { [Symbol.asyncIterator]: () => ({
        next: () => new Promise(() => {}),
        return: () => { returned = true; return Promise.resolve({ done: true }); },
    }) };
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 20);
    let err = null;
    try { for await (const _ of abortableStream(dead, ctrl.signal)) {} } catch (e) { err = e; }
    check('abortableStream: abort unhangs a silent dead read with AbortError', err && err.name === 'AbortError');
    check('abortableStream: underlying iterator gets a best-effort return()', returned === true);
}
{
    const ctrl = new AbortController();
    ctrl.abort();
    const dead = { [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }) };
    let err = null;
    try { for await (const _ of abortableStream(dead, ctrl.signal)) {} } catch (e) { err = e; }
    check('abortableStream: pre-aborted signal rejects immediately', err && err.name === 'AbortError');
}
{
    async function* src() { yield 'a'; }
    const out = [];
    for await (const v of abortableStream(src(), null)) out.push(v);
    check('abortableStream without a signal delegates untouched', out[0] === 'a');
}
{
    const ctrl = new AbortController();
    const v = await abortableAwait(Promise.resolve(42), ctrl.signal);
    check('abortableAwait resolves normally', v === 42);
}
{
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 20);
    let err = null;
    try { await abortableAwait(new Promise(() => {}), ctrl.signal); } catch (e) { err = e; }
    check('abortableAwait: abort unhangs a dead open with AbortError', err && err.name === 'AbortError');
}
{
    const ctrl = new AbortController();
    let disposed = false;
    let resolveLate;
    const late = new Promise(r => { resolveLate = r; });
    const p = abortableAwait(late, ctrl.signal).catch(e => e.name);
    ctrl.abort();
    const name = await p;
    resolveLate({ [Symbol.asyncIterator]: () => ({
        next: () => new Promise(() => {}),
        return: () => { disposed = true; return Promise.resolve({ done: true }); },
    }) });
    await new Promise(r => setTimeout(r, 10));
    check('abortableAwait: a stream arriving after the abort is disposed, not leaked',
        name === 'AbortError' && disposed === true);
}

// === Summary ================================================================
if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll mobile-lifecycle checks passed.');
