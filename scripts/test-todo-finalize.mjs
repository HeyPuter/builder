import fs from 'node:fs';

// ---- Regression guard for the end-of-turn checklist backstop ----------------
// A clean turn end promotes the checklist's in_progress item(s) to completed
// (promoteFinishedTodos in todo.js, called from sendChatMessage's turnSucceeded
// block) because the final bookkeeping TodoWrite is the call models most often
// skip. The backstop must NEVER lie: pending items stay unchecked, non-clean
// endings (Stop / error / chat switch / retry exhaustion) keep demoting to
// pending, and a turn that made no TodoWrite calls must not resurrect an older
// turn's abandoned checklist. This test:
//   * evaluates the REAL promoteFinishedTodos sliced out of todo.js and asserts
//     its promotion/scoping behavior on data cases, then
//   * text-asserts the call-site + prompt invariants (gated on turnSucceeded,
//     demotion paths intact, prompt example closes out the final todo).
// Mirrors scripts/test-transient-retry.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

// --- Evaluate the REAL promoteFinishedTodos from todo.js ---------------------
const TODO = fs.readFileSync(new URL('../src/tools/chat_ui/todo.js', import.meta.url), 'utf8');
const finA = TODO.indexOf('// ===== todo-turn-finalize (start) =====');
const finB = TODO.indexOf('// ===== todo-turn-finalize (end) =====');
if (finA < 0 || finB < 0 || finB <= finA) throw new Error('could not extract todo-turn-finalize block');
function makePromote(fakeWindow) {
    return new Function('window', TODO.slice(finA, finB) + '\nreturn promoteFinishedTodos;')(fakeWindow);
}

const todoWriteMsg = (todos) => ({
    role: 'assistant',
    content: { type: 'tool_use', id: 't1', name: 'TodoWrite', input: { todos } },
});

// === Promotes in_progress, never pending ====================================
{
    const w = {};
    const todos = [
        { content: 'a', status: 'completed', id: '1' },
        { content: 'b', status: 'in_progress', id: '2' },
        { content: 'c', status: 'pending', id: '3' },
    ];
    const history = [{ role: 'user', content: 'build it' }, todoWriteMsg(todos)];
    const changed = makePromote(w)(history, 0);
    check('promotes in_progress to completed', changed === true && todos[1].status === 'completed');
    check('never touches pending items', todos[2].status === 'pending');
    check('leaves completed items alone', todos[0].status === 'completed');
}

// === Scan is bounded to the turn (fromIndex) ================================
{
    const w = {};
    const todos = [{ content: 'old', status: 'in_progress', id: '1' }];
    const history = [todoWriteMsg(todos), { role: 'user', content: 'new turn' }];
    const changed = makePromote(w)(history, 1);
    check('TodoWrite before fromIndex is out of scope', changed === false && todos[0].status === 'in_progress');
    check('fromIndex 0 brings it in scope (resume)', makePromote(w)(history, 0) === true && todos[0].status === 'completed');
}

// === Only the LAST TodoWrite in range is the live state =====================
{
    const w = {};
    const older = [{ content: 'a', status: 'in_progress', id: '1' }];
    const newer = [{ content: 'a', status: 'completed', id: '1' }];
    const history = [todoWriteMsg(older), todoWriteMsg(newer)];
    const changed = makePromote(w)(history, 0);
    check('superseded list is never dug up', changed === false && older[0].status === 'in_progress');
}

// === Array-shaped assistant content (parallel tool blocks) ==================
{
    const w = {};
    const todos = [{ content: 'a', status: 'in_progress', id: '1' }];
    const history = [{
        role: 'assistant',
        content: [
            { type: 'text', text: 'working' },
            { type: 'tool_use', id: 't1', name: 'TodoWrite', input: { todos } },
        ],
    }];
    check('handles array content shape', makePromote(w)(history, 0) === true && todos[0].status === 'completed');
}

// === Malformed shapes never throw ===========================================
{
    const w = {};
    const history = [
        null,
        { role: 'assistant' },
        { role: 'assistant', content: 'plain text' },
        { role: 'assistant', content: { type: 'tool_use', name: 'TodoWrite', input: { todos: 'garbage' } } },
        { role: 'user', content: { type: 'tool_result', tool_use_id: 'x' } },
    ];
    let threw = false, result = null;
    try { result = makePromote(w)(history, 0); } catch (_) { threw = true; }
    check('malformed history entries never throw', !threw && result === false);
    check('non-array history returns false', makePromote(w)('nope', 0) === false);
}

// === Nothing in_progress -> no-op ===========================================
{
    const w = {};
    const todos = [{ content: 'a', status: 'completed', id: '1' }, { content: 'b', status: 'pending', id: '2' }];
    const history = [todoWriteMsg(todos)];
    check('no in_progress items means no change', makePromote(w)(history, 0) === false && todos[1].status === 'pending');
}

// === window.currentTodos kept in sync when it is a separate array ===========
{
    const w = { currentTodos: [{ content: 'b', status: 'in_progress', id: '2' }] };
    const todos = [{ content: 'b', status: 'in_progress', id: '2' }];
    const history = [todoWriteMsg(todos)];
    makePromote(w)(history, 0);
    check('separate window.currentTodos array is synced', w.currentTodos[0].status === 'completed');
}

// === Call-site invariants (text asserts) ====================================
const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
{
    // The gate must also require the turn to still be the LIVE one (turnLive =
    // turnSeq === _turnSeq && same chat): a Stopped turn unwinding after a
    // Resume/re-send otherwise read the NEW turn's clean globals as its own
    // success and checked off that turn's in-progress step.
    const gate = APP.indexOf("!retryGaveUp && turnLive && !isAborted(abortController) && !activeTurnInterrupted");
    check('turnLive requires this turn to be the latest in this chat',
        APP.includes('const turnLive = turnSeq === _turnSeq && turnChatId === currentChatId;'));
    const succeeded = APP.indexOf('turnSucceeded = true;');
    const call = APP.indexOf('window.promoteFinishedTodos?.(');
    const catchIdx = APP.indexOf('} catch (error) {', succeeded);
    check('clean-completion gate still intact', gate >= 0 && succeeded > gate);
    check('backstop runs inside the turnSucceeded block only', call > succeeded && catchIdx > call);
    check('backstop runs before the end-of-turn save (inside try)', call < APP.indexOf('turnSaveContext.interrupted = !turnSucceeded'));
    check('scan start captured at turn start', APP.indexOf('const turnTodoScanStart = turnSaveContext.chatHistory.length;') >= 0);
    check('resume turns scan the whole history', APP.includes('isResume ? 0 : turnTodoScanStart'));
    check('error path still demotes in_progress to pending', APP.includes("if (t.status === 'in_progress') t.status = 'pending';"));
}
{
    const UI = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
    const demotions = UI.split("if (t.status === 'in_progress') t.status = 'pending';").length - 1;
    check('abort + turn-end demotion paths both intact in ui.js', demotions >= 2);
}

// === Rendered-list patch invariants =========================================
{
    check('checkOffTodoDisplay patches li in place (no re-render)',
        TODO.includes('checkOffTodoDisplay') && TODO.includes('replaceWith(TODO_CHECKED_SVG)')
        && TODO.includes("removeClass('todo-in_progress').addClass('todo-completed')")
        && TODO.includes("removeClass('shimmer')"));
    const patchBody = TODO.slice(TODO.indexOf('function checkOffTodoDisplay'), TODO.indexOf('window.checkOffTodoDisplay'));
    check('checkOffTodoDisplay never calls updateTodoDisplay', !patchBody.includes('updateTodoDisplay'));
}

// === Prompt + tool-description invariants (all three places agree) ==========
{
    const PROMPT = fs.readFileSync(new URL('../src/js/prompt.js', import.meta.url), 'utf8');
    check('prompt rule: final TodoWrite before the summary',
        PROMPT.includes('never end a turn with an item still "in_progress"'));
    const done = PROMPT.indexOf('Mark third todo completed');
    const summary = PROMPT.indexOf('Send the short final summary');
    check('prompt example closes out the final todo before the summary', done >= 0 && summary > done);
    check('tool description carries the same final-call instruction',
        TODO.includes('never end a turn with an item still \\"in_progress\\"'));
}

console.log(failures === 0 ? '\nAll todo-finalize tests passed.' : `\n${failures} todo-finalize test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
