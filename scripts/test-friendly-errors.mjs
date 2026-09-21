import fs from 'node:fs';

// ---- Regression guard: error text classification ----------------------------
// friendlyErrorMessage rewrites raw provider errors into one actionable
// sentence. Two defects: it matched '529'/'503'/'429' as bare substrings, so
// the context-window error — whose text carries a six-digit token count — was
// mislabelled "the service is busy, try again" (a retry fails identically,
// forever), and a JSON envelope whose inner message was not a string made the
// display path throw on .trim(), so no error card rendered at all.
// Evaluates the real functions from helpers.js.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const src = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const a = src.indexOf('function extractErrorText(');
const b = src.indexOf('function nl_to_p(');
if (a < 0 || b <= a) throw new Error('could not extract the error helpers');
const { extractErrorText, friendlyErrorMessage } = new Function(src.slice(a, b) + '\nreturn { extractErrorText, friendlyErrorMessage };')();

const busy = "The AI service is busy right now. Please wait a moment and try again.";
const quick = "You're sending messages too quickly. Please wait a few seconds and try again.";

// The token count must not read as a status code.
for (const n of ['215290', '205030', '204290', '529000', '150300']) {
    const msg = friendlyErrorMessage(`prompt is too long: ${n} tokens > 200000 maximum`);
    check(`prompt too long (${n} tokens) is explained as a too-long conversation`, /too long/.test(msg) && msg !== busy && msg !== quick, msg);
}
check('a request id containing 529 is not "busy"',
    friendlyErrorMessage('Request req_01HZ5293K failed: invalid_request_error: model not found') !== busy);
// Real status codes still classify.
check('a real 529 is "busy"', friendlyErrorMessage('Error 529: overloaded') === busy);
check('a real 503 is "busy"', friendlyErrorMessage('upstream returned 503') === busy);
check('a real 429 is "too quickly"', friendlyErrorMessage('HTTP 429') === quick);
check('"rate limit" still classifies', friendlyErrorMessage('rate limit exceeded') === quick);
check('other context-window phrasings are caught too',
    /too long/.test(friendlyErrorMessage('context_length_exceeded')) && /too long/.test(friendlyErrorMessage('This model\'s maximum context length is 200000 tokens')));

// Non-string envelopes must not throw.
let threw = false, out = '';
try { out = friendlyErrorMessage(extractErrorText('400 {"error":{"message":{"code":1}}}')); } catch (e) { threw = true; }
check('a non-string inner message never throws', !threw);
check('… and still yields a readable sentence', typeof out === 'string' && out.length > 0, out);
check('a bare object error is stringified, not thrown',
    (() => { try { return typeof friendlyErrorMessage(extractErrorText({ error: { message: 42 } })) === 'string'; } catch (e) { return false; } })());
check('null/undefined give the generic fallback',
    /Something went wrong/.test(friendlyErrorMessage(extractErrorText(null))) && /Something went wrong/.test(friendlyErrorMessage(undefined)));
check('a normal envelope still unwraps',
    friendlyErrorMessage(extractErrorText('400 {"type":"error","error":{"message":"image exceeds 5 MB maximum"}}')).includes('too large'));

if (failures) { console.error(`\n${failures} friendly-error check(s) failed.`); process.exit(1); }
console.log('\nAll friendly-error checks passed.');
