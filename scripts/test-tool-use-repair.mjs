import fs from 'node:fs';

// ---- Regression guard for dangling tool_use repair ------------------------
// A tool_use is pushed to chatHistory BEFORE its tool runs (handleToolCalls), so
// an interruption in between — Stop, a refresh, or a checkpoint save landing
// mid-tool — persists an assistant tool_use with no matching tool_result. The
// model API rejects that shape outright.
//
// The repair existed, but only ran when the user clicked "Resume". Typing a new
// instruction instead sent the broken history unrepaired: the request failed,
// the error path then persisted `interrupted: false` (which is what gates the
// Resume banner), and every later send failed identically — the project was
// permanently unbuildable with no route back in the UI.
//
// This pins down the repair's behavior (idempotent, order-preserving, no-op on
// healthy histories) and, critically, that it runs on EVERY send path before the
// turn appends anything. Evaluates the REAL repairDanglingToolUses bytes sliced
// out of app.js. Mirrors scripts/test-todo-finalize.mjs / test-transient-retry.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const SRC = new URL('../src/js/app.js', import.meta.url);
const src = fs.readFileSync(SRC, 'utf8');

// --- Evaluate the real repair function -------------------------------------
const a = src.indexOf('function repairDanglingToolUses(history)');
const b = src.indexOf('// Make an interrupted conversation a valid, continuable request');
if (a < 0 || b < 0 || b <= a) throw new Error('could not extract repairDanglingToolUses from app.js');
const repairDanglingToolUses = new Function(
    src.slice(a, b) + '\n; return repairDanglingToolUses;',
)();

const toolUse = (id, name = 'write') => ({ role: 'assistant', content: { type: 'tool_use', id, name, input: {} } });
const toolResult = (id) => ({ role: 'user', content: { type: 'tool_result', tool_use_id: id, content: '{}' } });
const userMsg = (t) => ({ role: 'user', content: t });
const assistantText = (t) => ({ role: 'assistant', content: t });
const isResultFor = (m, id) => m && m.role === 'user' && m.content
    && m.content.type === 'tool_result' && m.content.tool_use_id === id;

// --- no-op on healthy histories --------------------------------------------
{
    const h = [userMsg('build me a site'), toolUse('t1'), toolResult('t1'), assistantText('done')];
    const before = h.length;
    check('healthy history → reports 0 repairs', repairDanglingToolUses(h) === 0);
    check('healthy history → history untouched', h.length === before);
}
check('empty history → 0', repairDanglingToolUses([]) === 0);
check('non-array → 0 (no throw)', repairDanglingToolUses(null) === 0);
check('history with no tool calls at all → 0',
    repairDanglingToolUses([userMsg('hi'), assistantText('hello')]) === 0);

// --- the actual repair ------------------------------------------------------
{
    const h = [userMsg('build it'), toolUse('t1')];
    check('dangling tool_use → exactly 1 repair', repairDanglingToolUses(h) === 1);
    check('repair appends a tool_result for the dangling id', isResultFor(h[2], 't1'));
    check('synthesized result is flagged is_error', h[2].content.is_error === true);
    check('synthesized result explains the interruption',
        /interrupted/i.test(String(h[2].content.content)));
    check('repaired result directly follows its tool_use (valid pairing)',
        h[1].content.id === 't1' && isResultFor(h[2], 't1'));
}
{
    // Parallel tool calls: one assistant message carrying several tool_use blocks,
    // where only some completed before the interrupt.
    const h = [
        userMsg('go'),
        { role: 'assistant', content: [{ type: 'tool_use', id: 't1' }, { type: 'tool_use', id: 't2' }, { type: 'tool_use', id: 't3' }] },
        toolResult('t2'),
    ];
    check('array content → repairs only the unmatched blocks', repairDanglingToolUses(h) === 2);
    const ids = h.slice(3).map((m) => m.content.tool_use_id).sort();
    check('array content → repairs t1 and t3, leaves t2 alone', ids.join(',') === 't1,t3');
}
{
    const h = [userMsg('go'), toolUse('t1'), toolResult('t1'), toolUse('t2')];
    check('only the interrupted round is repaired', repairDanglingToolUses(h) === 1);
    check('completed earlier round is not double-resulted', isResultFor(h[4], 't2'));
}

// --- idempotence (it now runs on paths that may also call prepareResumeHistory)
{
    const h = [userMsg('go'), toolUse('t1')];
    repairDanglingToolUses(h);
    const afterFirst = h.length;
    check('second call repairs nothing', repairDanglingToolUses(h) === 0);
    check('second call appends nothing', h.length === afterFirst);
    check('third call still stable', repairDanglingToolUses(h) === 0 && h.length === afterFirst);
}
{
    // Guard against the same id appearing twice in history.
    const h = [userMsg('go'), toolUse('dup'), toolUse('dup')];
    check('duplicate tool_use id → only one result synthesized', repairDanglingToolUses(h) === 1);
}

// --- the resulting message shape --------------------------------------------
{
    // After repair the history ends on a user tool_result; the turn then appends
    // the user's new text as a separate user message. Consecutive user messages
    // are already routine here (each parallel tool result pushes its own), so
    // this shape is proven — assert the pairing rather than alternation.
    const h = [userMsg('go'), toolUse('t1')];
    repairDanglingToolUses(h);
    h.push(userMsg('actually make it blue'));
    const useIds = h.filter((m) => m.role === 'assistant' && m.content?.type === 'tool_use').map((m) => m.content.id);
    const resIds = h.filter((m) => m.role === 'user' && m.content?.type === 'tool_result').map((m) => m.content.tool_use_id);
    check('every tool_use has a matching tool_result before the new user message',
        useIds.every((id) => resIds.includes(id)));
    check("the user's new instruction survives the repair", h[h.length - 1].content === 'actually make it blue');
}

// --- call-site wiring -------------------------------------------------------
const sendIdx = src.indexOf('async function sendChatMessage(');
const sendSrc = src.slice(sendIdx);
const repairCall = sendSrc.indexOf('repairDanglingToolUses(turnSaveContext.chatHistory);');
const resumeBranch = sendSrc.indexOf('if (isResume) {');
const userPush = sendSrc.indexOf('chatHistory.push({ role: "user", content: messageContent, messageId });');

check('wiring: sendChatMessage repairs the history', repairCall > 0);
check('wiring: repair runs on ALL paths, before the isResume branch (not only on resume)',
    repairCall > 0 && resumeBranch > 0 && repairCall < resumeBranch);
check('wiring: repair runs BEFORE the new user message is appended (keeps result adjacent to tool_use)',
    repairCall > 0 && userPush > 0 && repairCall < userPush);
check('wiring: prepareResumeHistory still repairs (Resume + retry paths keep working)',
    /function prepareResumeHistory\(history\)[\s\S]{0,600}repairDanglingToolUses\(history\);/.test(src));
check('wiring: prepareResumeHistory still appends the resume nudge',
    /function prepareResumeHistory\(history\)[\s\S]{0,1600}resumeNudge: true/.test(src));
check('wiring: retry paths still call prepareResumeHistory',
    (src.match(/prepareResumeHistory\(turnSaveContext\.chatHistory\);/g) || []).length >= 2);
check('wiring: repair helper is defined before sendChatMessage uses it',
    a < sendIdx);

console.log(failures === 0 ? '\nAll tool_use repair checks passed' : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
