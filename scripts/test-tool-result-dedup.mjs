import fs from 'node:fs';

// ---- Regression guard: one tool_result per tool_use, always -----------------
// The model API requires each tool_result to sit in the user message directly
// after its tool_use. Two things used to break that after a Stop during a slow
// tool (publish_site, create_worker, a big write) followed by a quick re-send:
//   1. the new turn's repairDanglingToolUses synthesized a result for the
//      in-flight tool_use and appended the user's prompt, and then the OLD
//      turn's exec resolved and pushed a second result for the same id after
//      that prompt (tools.js had no guard between exec resolving and the push);
//   2. nothing at send time removed such a duplicate, so once persisted, every
//      later request in the chat was rejected with a 400 — the project could
//      never send again, and the resume repair couldn't help because the id
//      already had a result.
// Evaluates the real dropDuplicateToolResults (helpers.js) + hasToolResultFor
// (tools.js), and text-asserts the wiring at both ends.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const helpers = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const tools = fs.readFileSync(new URL('../src/js/tools.js', import.meta.url), 'utf8');

function slice(src, from, to) {
    const a = src.indexOf(from), b = src.indexOf(to, a + from.length);
    if (a < 0 || b <= a) throw new Error('could not extract ' + from);
    return src.slice(a, b);
}
const win = {};
const { prepareHistoryForAI, dropDuplicateToolResults } = new Function('window',
    slice(helpers, 'function prepareHistoryForAI(', '/**\n * Sum the AI-reported cost') +
    '\nreturn { prepareHistoryForAI, dropDuplicateToolResults };')(win);
const hasToolResultFor = new Function('window',
    slice(tools, 'function hasToolResultFor(', 'async function handleToolCalls(') + '\nreturn hasToolResultFor;')(win);

const toolUse = (id) => ({ role: 'assistant', content: { type: 'tool_use', id, name: 'write', input: {} } });
const toolResult = (id, text) => ({ role: 'user', content: { type: 'tool_result', tool_use_id: id, content: text } });
const user = (t) => ({ role: 'user', content: [{ type: 'text', text: t }] });
const assistant = (t) => ({ role: 'assistant', content: t });

// --- dropDuplicateToolResults -----------------------------------------------
{
    // The exact corrupted shape: repair result, user's new prompt, then the
    // late real result for the same id.
    const h = [
        { role: 'system', content: 's' },
        user('build it'),
        toolUse('t1'),
        toolResult('t1', '{"error":"The previous step was interrupted before it finished."}'),
        user('actually make it blue'),
        toolResult('t1', '{"success":true}'),
    ];
    const before = JSON.stringify(h);
    const out = prepareHistoryForAI(h);
    check('the persisted history is not mutated', JSON.stringify(h) === before);
    const results = out.filter(m => m.role === 'user' && m.content && m.content.type === 'tool_result');
    check('exactly one tool_result survives for the duplicated id', results.length === 1);
    check('the surviving result is the FIRST one (the one adjacent to its tool_use)',
        out[3].content.type === 'tool_result' && /interrupted/.test(out[3].content.content));
    check("the user's new prompt is now the last message", out[out.length - 1].content[0].text === 'actually make it blue');
    check('the cache breakpoint lands on the (new) last message', out[out.length - 1].cache_control?.type === 'ephemeral');
}
{
    const h = [user('a'), toolUse('t1'), toolResult('t1', '{}'), toolUse('t2'), toolResult('t2', '{}'), assistant('done')];
    const out = prepareHistoryForAI(h);
    check('a healthy history keeps every distinct result', out.filter(m => m.content?.type === 'tool_result').length === 2);
    check('… and its length', out.length === h.length);
    check('pure helper leaves distinct results alone', dropDuplicateToolResults(h).length === h.length);
}
{
    // Array-content user messages (attachments) and plain strings are never
    // mistaken for tool results.
    const h = [user('x'), { role: 'user', content: 'plain' }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'z' }] }];
    check('non-object / array user content is untouched', dropDuplicateToolResults(h).length === 3);
    check('odd input tolerated', dropDuplicateToolResults(null) === null);
}

// --- hasToolResultFor ---------------------------------------------------------
{
    const h = [user('a'), toolUse('t1'), toolResult('t1', '{}')];
    check('hasToolResultFor finds an existing result', hasToolResultFor(h, 't1') === true);
    check('… and reports none for an unmatched id', hasToolResultFor(h, 't2') === false);
    check('… tolerates odd input', hasToolResultFor(null, 't1') === false && hasToolResultFor(h, null) === false);
}

// --- wiring ---------------------------------------------------------------------
const loop = slice(tools, 'for (const toolCall of toolCalls) {', '// Checkpoint this round');
check('tools.js: the success push is gated on no result existing yet',
    /if \(!hasToolResultFor\(c\.chatHistory, toolCall\.id\)\) \{\s*addToolResultToHistory\(c\.chatHistory, toolCall\.id, toolResponse(?:,|\))/.test(loop));
check('tools.js: the error push is gated the same way',
    /if \(!hasToolResultFor\(c\.chatHistory, toolCall\.id\)\) \{\s*addToolResultToHistory\(c\.chatHistory, toolCall\.id, \{ error: errorMessage \}, true\)/.test(loop));
check('helpers.js: prepareHistoryForAI dedupes before setting the cache breakpoint',
    helpers.indexOf('dropDuplicateToolResults(copy)') < helpers.indexOf("cache_control = { type: \"ephemeral\" }"));

if (failures) { console.error(`\n${failures} tool-result dedup check(s) failed.`); process.exit(1); }
console.log('\nAll tool-result dedup checks passed.');
