import fs from 'node:fs';

// ---- Regression guard for the transient-failure auto-retry ------------------
// A build turn's AI call is retried with backoff on transient provider failures
// (overload / rate-limit / timeout / network), resuming from the work already in
// chatHistory. The retry must NEVER fire on a deterministic failure (bad input,
// out-of-credits, usage-limit) or on a user Stop / chat-switch — otherwise it
// wastes attempts on something that can't succeed, or "comes back to life" after
// the user abandoned the turn. This test:
//   * evaluates the REAL isTransientTurnError / retryBackoffMs helpers sliced out
//     of app.js (wired to the REAL extractErrorText from helpers.js — zero drift)
//     and asserts the classification + backoff schedule, then
//   * text-asserts that sendChatMessage's retry loop keeps its safety invariants
//     (gates on the classifier, resumes via prepareResumeHistory, caps attempts,
//     bails on stop/switch, and offers an in-place resume on exhaustion).
// Mirrors scripts/test-fs-path-scoping.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}
function label(e) {
    let s;
    try { s = JSON.stringify(e); } catch (_) { s = null; }
    if (s === undefined || s === null) s = String(e);
    return s.slice(0, 60);
}

// --- Evaluate the REAL extractErrorText (+ unwrapErrorEnvelope) from helpers.js
const HELP = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
{
    const a = HELP.indexOf('function extractErrorText(error) {');
    const b = HELP.indexOf('// Map a raw');
    if (a < 0 || b < 0 || b <= a) throw new Error('could not extract extractErrorText block');
}
const extA = HELP.indexOf('function extractErrorText(error) {');
const extB = HELP.indexOf('// Map a raw');
const extractErrorText = new Function(
    HELP.slice(extA, extB) + '\nreturn extractErrorText;'
)();

// --- Evaluate the REAL classifier block from app.js -------------------------
const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const clsA = APP.indexOf('// ===== transient-retry-classifier (start) =====');
const clsB = APP.indexOf('// ===== transient-retry-classifier (end) =====');
if (clsA < 0 || clsB < 0 || clsB <= clsA) throw new Error('could not extract transient-retry-classifier block');
const { isTransientTurnError, retryBackoffBaseMs } = new Function(
    'extractErrorText',
    APP.slice(clsA, clsB) + '\nreturn { isTransientTurnError, retryBackoffBaseMs };'
)(extractErrorText);

// === Transient errors: MUST retry ===========================================
const TRANSIENT = [
    new Error('Overloaded'),
    'AI model provider is overloaded, please try again',
    'no fallback model available',
    '429 Too Many Requests',
    'rate limit exceeded',
    '500 Internal Server Error',
    '502 Bad Gateway',
    '503 Service Unavailable',
    '504 Gateway Timeout',
    '529',
    'Request timed out',
    'ETIMEDOUT',
    'Failed to fetch',
    'NetworkError when attempting to fetch resource',
    'socket hang up',
    'ECONNRESET',
    { error: { message: 'The upstream is overloaded' } },
    { message: '503 service unavailable' },
    // Wrapped '400 {json}' envelope whose inner message is transient → unwrapped.
    '400 {"error":{"message":"The service is temporarily overloaded"}}',
];
for (const e of TRANSIENT) {
    check('transient → retry: ' + label(e), isTransientTurnError(e) === true);
}

// === Deterministic / user errors: MUST NOT retry ============================
const NON_TRANSIENT = [
    null,
    undefined,
    '',
    new Error('400 Bad Request'),
    '401 Unauthorized',
    '403 Forbidden',
    '413 Payload Too Large',
    'invalid_request_error: messages: at least one message is required',
    { error: { delegate: 'usage-limited-chat' } },
    'Insufficient credits to complete this request',
    'Your account balance is insufficient',
    'Image dimensions exceed the 8000-pixel limit',
    'That image exceeds the maximum size',
    'unsupported image format',
    'could not process image',
    // User Stop / chat-switch — an AbortError is never a transient retry, even if
    // its message coincidentally mentions a timeout.
    { name: 'AbortError', message: 'The operation was aborted' },
    { name: 'AbortError', message: 'timed out' },
    // Word-boundary guard: a token/context-length number must NOT read as a 5xx.
    'context length exceeded: maximum is 500000 tokens',
    'maximum 5000 tokens allowed',
];
for (const e of NON_TRANSIENT) {
    check('non-transient → no retry: ' + label(e), isTransientTurnError(e) === false);
}

// === Backoff schedule (pure, jitter-free) ===================================
check('backoff(0) = 1s', retryBackoffBaseMs(0) === 1000);
check('backoff(1) = 2s', retryBackoffBaseMs(1) === 2000);
check('backoff(2) = 4s', retryBackoffBaseMs(2) === 4000);
check('backoff(3) = 8s', retryBackoffBaseMs(3) === 8000);
check('backoff(4) capped at 8s', retryBackoffBaseMs(4) === 8000);
check('backoff(10) capped at 8s', retryBackoffBaseMs(10) === 8000);
check('backoff monotonic non-decreasing', [0,1,2,3,4,5].every((n,i,a) => i === 0 || retryBackoffBaseMs(a[i]) >= retryBackoffBaseMs(a[i-1])));

// === Structural invariants of the retry loop in sendChatMessage =============
// Slice from sendChatMessage to the next top-level function declaration (nested
// functions inside it are indented, so a column-0 `function` marks the end).
const sendA = APP.indexOf('async function sendChatMessage(');
const rest = APP.slice(sendA + 50);
const endRel = rest.search(/\n(async )?function \w/);
const SEND = endRel > 0 ? APP.slice(sendA, sendA + 50 + endRel) : APP.slice(sendA);
check('sendChatMessage slice is bounded and non-trivial', SEND.length > 500 && SEND.length < APP.length);

check('retry loop gates on the transient classifier', SEND.includes('isTransientTurnError(streamError)'));
check('retry resumes from checkpointed history (prepareResumeHistory)', /prepareResumeHistory\(turnSaveContext\.chatHistory\)/.test(SEND));
check('retry is capped by MAX_TURN_RETRIES', SEND.includes('attempt >= MAX_TURN_RETRIES'));
check('MAX_TURN_RETRIES is defined', /const MAX_TURN_RETRIES = \d+/.test(APP));
check('retry NEVER fires on user stop / chat-switch (active guard)',
    SEND.includes('!shouldStop') && SEND.includes('!activeTurnInterrupted')
    && SEND.includes('!isAborted(abortController)'));
check('exhaustion offers an in-place resume (retryGaveUp → showResumeBanner)',
    SEND.includes('retryGaveUp = true') && /retryGaveUp && turnChatId === currentChatId/.test(SEND)
    && /showResumeBanner\(/.test(SEND));
check('backoff wait is abortable on stop/switch (waitForRetry checks the flags)',
    /function waitForRetry[\s\S]*?activeTurnInterrupted[\s\S]*?turnChatId !== currentChatId/.test(APP));
check('a stopped/switched wait bails without retrying (if (!proceed) break)',
    SEND.includes('if (!proceed) break'));
// A Stop hands the composer back immediately while this turn's end-of-turn save
// is still draining, so a quick Resume / re-send starts a NEWER turn in the SAME
// chat. That newer turn must not be clobbered by the old one's teardown (which
// would re-enable input mid-stream, null its abortController, and paint a stale
// resume banner) — the chat-id guards can't tell the two apart, so a per-turn
// sequence number gates the teardown and the follow-up UI.
check('each turn claims a sequence number (turnSeq)', SEND.includes('const turnSeq = ++_turnSeq'));
check('the turn counter is declared at module level', /^let _turnSeq = 0;/m.test(APP));
check('teardown (resetUIState) is skipped once a newer same-chat turn has started',
    /const supersededInChat = turnSeq !== _turnSeq;[\s\S]*?if \(!supersededInChat\) \{[\s\S]*?resetUIState\(turnChatId\);/.test(SEND));
check('follow-up banners/suggestions bail for a superseded turn',
    /notifyIssuesTurnFinished[\s\S]*?if \(supersededInChat\) return;[\s\S]*?showResumeBanner/.test(SEND));
check('partial unsaved bubble is dropped before resuming (removeUncommittedBubble)',
    SEND.includes('removeUncommittedBubble(context)'));

// === Summary ================================================================
if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll transient-retry checks passed.');
