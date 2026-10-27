import fs from 'node:fs';

// ---- Regression guard: SuggestNextSteps ends the turn ----------------------
// SuggestNextSteps is the turn's final action and its result is only
// {success:true}. The tool loop sent that back for another model round, and
// when the reply that called it already carried the summary, the model wrote
// it again, so the turn showed it twice. Now the turn ends there. A reply with
// no text still gets the round, since the model sometimes writes its summary
// after. Any other last call, or a failed SuggestNextSteps, still gets it too.
//
// Runs the real handleToolCalls from tools.js against stubs.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const tools = fs.readFileSync(new URL('../src/js/tools.js', import.meta.url), 'utf8');
const win = { isMutatingTool: () => false, markProjectModified: () => {} };
let rounds = 0;
const stubs = { round: () => { rounds++; }, fail: null };
const handleToolCalls = new Function('window', 'stubs',
    'const generateMessageId = () => "m"; const hasActiveTodos = () => false; const appendMessage = () => {};' +
    'const isAborted = () => false; const isStaleTurn = () => false; const scheduleSaveCurrentChat = () => {};' +
    'const showSpinner = () => ({}); let spinner;' +
    'const executeFunction = async (name, input) => { if (stubs.fail === name) throw new Error("boom"); return { success: true }; };' +
    'const hasToolResultFor = () => false;' +
    'const abortableAwait = (p) => p; const prepareHistoryForAI = (h) => h;' +
    'const puter = { ai: { chat: async () => { stubs.round(); return {}; } } };' +
    'const handleMessageStream = async () => {};' +
    tools.slice(tools.indexOf('function addToolResultToHistory('), tools.indexOf('function hasToolResultFor(')) +
    tools.slice(tools.indexOf('async function handleToolCalls('), tools.lastIndexOf('}') + 1) +
    '\nreturn handleToolCalls;')(
    Object.assign(win, { ModelCore: { buildChatOptions: () => ({}) } }),
    stubs);

const use = (id, name, input = {}) => ({ type: 'tool_use', id, name, input });
const ctx = () => ({ chatHistory: [], abortController: new AbortController(), currentChatId: 'c1' });

{
    rounds = 0;
    const c = ctx();
    const done = use('s1', 'SuggestNextSteps', { suggestions: [] });
    done.text = 'Made the heading blue.';
    const res = await handleToolCalls(done, true, c);
    check('a reply ending in SuggestNextSteps asks the model for nothing more', rounds === 0, String(rounds));
    check('and the turn ends cleanly', res && !res.error);
    check('its result is still in the history',
        c.chatHistory.some(m => m.role === 'user' && m.content && m.content.tool_use_id === 's1'));
    check('and so is the summary that came with it',
        c.chatHistory.some(m => m.role === 'assistant' && m.content === 'Made the heading blue.'));
}

{
    rounds = 0;
    await handleToolCalls(use('s0', 'SuggestNextSteps', { suggestions: [] }), true, ctx());
    check('SuggestNextSteps with no summary in the reply gets the round to write it', rounds === 1, String(rounds));
}

{
    rounds = 0;
    await handleToolCalls(use('u1', 'update_preview'), true, ctx());
    check('any other last call still gets the next round', rounds === 1, String(rounds));
}

{
    rounds = 0;
    const pair = [use('s2', 'SuggestNextSteps', { suggestions: [] }), use('w1', 'update_preview')]; pair.text = 'Done.';
    await handleToolCalls(pair, true, ctx());
    check('SuggestNextSteps followed by another call still gets the next round', rounds === 1, String(rounds));
}

{
    rounds = 0;
    stubs.fail = 'SuggestNextSteps';
    const failed = use('s3', 'SuggestNextSteps', { suggestions: [] }); failed.text = 'Done.';
    await handleToolCalls(failed, true, ctx());
    stubs.fail = null;
    check('a failed SuggestNextSteps still gets the next round', rounds === 1, String(rounds));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll suggest-ends-turn checks passed.');
