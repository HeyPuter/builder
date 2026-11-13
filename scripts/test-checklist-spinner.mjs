import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: the dots and their words show beside the checklist ---
// The thinking dots carry what the builder is doing right now ("Updating the
// styling", "Applying changes", see setSpinnerLabel). They used to be dropped
// whenever a checklist item shimmered in progress, on the premise that the
// shimmer was the indicator. So in a checklist build the words never showed,
// only the list and its shimmering step, and a long step looked stuck
// (issue #179). The dots now stay below the checklist while an item runs.
// A build that stopped mid-checklist (only pending items) still gets them on
// its next turn, as before. Runs the REAL helpers against a tiny recording $.

const helpers = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const todo = fs.readFileSync(new URL('../src/tools/chat_ui/todo.js', import.meta.url), 'utf8');
const stream = fs.readFileSync(new URL('../src/js/handleMessageStream.js', import.meta.url), 'utf8');
const slice = (src, a, b) => {
    const i = src.indexOf(a), j = src.indexOf(b, i);
    if (i < 0 || j < 0) throw new Error(`could not extract ${a}`);
    return src.slice(i, j);
};
const source = slice(helpers, 'function hasActiveTodos()', '// A stream owns its preview')
    + slice(helpers, '// The thinking dots, below the latest message.', '// Function to auto-resize textarea.')
    + slice(ui, 'function startSpinnerStub()', 'function autoScrollTrigger(');

// A label element setSpinnerLabel can write to.
function fakeLabel() {
    const classes = new Set();
    return {
        textContent: '', offsetWidth: 0, onanimationend: null,
        classList: { add: c => classes.add(c), remove: c => classes.delete(c) },
    };
}

// items: the last checklist's <li> classes, e.g. ['todo-completed', 'todo-pending'].
function setup({ items = null, spinner = false } = {}) {
    const state = { spinners: spinner ? 1 : 0, created: 0, fadedOut: 0, removed: 0 };
    const label = fakeLabel();
    const node = (length = 0, extra = {}) => ({
        length, 0: length ? { offsetWidth: 0, scrollHeight: 0 } : undefined,
        find: () => node(), last: () => node(), after() {}, append() {}, remove() {},
        next: () => node(), addClass() { return this; }, removeClass() { return this; },
        ...extra,
    });
    const $ = (sel) => {
        if (sel === '.chat-box .todo-list') {
            if (!items) return node(0);
            const list = {
                find(q) {
                    if (q === 'li') return { not: c => ({ length: items.filter(i => i !== c.slice(1)).length }) };
                    throw new Error('unexpected query ' + q);
                },
            };
            return { length: 1, last: () => ({ length: 1, ...list }) };
        }
        if (sel === '.floating-spinner') {
            return node(state.spinners, {
                remove() { state.spinners = 0; state.removed++; },
                removeClass() { state.spinners = 0; state.fadedOut++; return this; },
            });
        }
        if (typeof sel === 'string' && sel.includes('floating-spinner')) {
            state.created++;
            state.spinners = 1;
            return node(1);
        }
        return node(sel === '.chat-box' ? 1 : 0);
    };
    const env = { $, window: { shouldAutoScroll: false }, setTimeout() {}, clearTimeout() {},
        // The dots' label, once there are dots.
        document: { querySelector: (q) => (q === '.floating-spinner .floating-spinner-label' && state.spinners ? label : null) } };
    vm.createContext(env);
    vm.runInContext(source, env);
    return { env, state, label };
}

const STUCK = ['todo-completed', 'todo-completed', 'todo-pending', 'todo-pending'];
const RUNNING = ['todo-completed', 'todo-in_progress', 'todo-pending'];

// hasActiveTodos (narration suppression) is unchanged.
{
    assert.equal(setup({ items: STUCK }).env.hasActiveTodos(), true, 'pending-only list is active');
    assert.equal(setup({ items: RUNNING }).env.hasActiveTodos(), true, 'running list is active');
    assert.equal(setup({ items: ['todo-completed'] }).env.hasActiveTodos(), false, 'finished list is not active');
    assert.equal(setup().env.hasActiveTodos(), false, 'no checklist is not active');
    console.log('ok   - hasActiveTodos still tracks unfinished items');
}

// Stopped mid-checklist, the user sends "continue".
{
    const h = setup({ items: STUCK });
    assert.notEqual(h.env.startSpinnerStub(), null, 'turn start shows the dots');
    assert.equal(h.state.created, 1);
    console.log('ok   - stuck checklist: new turn shows the thinking dots');
}

// The reported case: a step is running, and the dots show what it's doing.
{
    const h = setup({ items: RUNNING });
    assert.notEqual(h.env.showSpinner(), null, 'dots show below a running step');
    assert.equal(h.state.created, 1);
    h.env.setSpinnerLabel('Updating the styling');
    assert.equal(h.label.textContent, 'Updating the styling', 'the step\'s tool call is named');

    const h2 = setup({ items: RUNNING, spinner: true });
    assert.notEqual(h2.env.startSpinnerStub(), null, 'existing dots stay once an item runs');
    assert.equal(h2.state.fadedOut, 0, 'not faded out');
    assert.equal(h2.state.created, 0, 'reused, no flicker');
    assert.equal(h2.state.removed, 0, 'not removed');
    console.log('ok   - running checklist: the dots and their words stay');
}

// Existing dots are reused (not recreated) while nothing is shimmering.
{
    const h = setup({ items: STUCK, spinner: true });
    assert.notEqual(h.env.startSpinnerStub(), null);
    assert.equal(h.state.created, 0, 'reused, no flicker');
    assert.equal(h.state.fadedOut, 0);
    console.log('ok   - existing dots are reused while no item is running');
}

// A TodoWrite that starts a step re-renders the list at the bottom of the chat
// and puts the dots back below it, not away.
{
    const calls = [];
    const spinnerNode = {
        length: 1,
        detach() { calls.push('detach'); return this; },
        remove() { calls.push('remove'); },
    };
    const chatBox = {
        length: 1, 0: { scrollHeight: 0 },
        find(q) {
            if (q === '.floating-spinner') return spinnerNode;
            if (q === '.todo-list') return { last: () => ({ after: (n) => calls.push(n === spinnerNode ? 'after-list' : 'after-other') }) };
            throw new Error('unexpected query ' + q);
        },
        append(html) { calls.push(html.includes('todo-in_progress') ? 'append-running-list' : 'append-list'); },
        scrollTop() {},
    };
    const env = {
        $: (sel) => (sel === '.chat-box' ? chatBox : { remove() {} }),
        window: { shouldAutoScroll: false },
        htmlEscape: (s) => String(s),
        isProcessing: true,
    };
    vm.createContext(env);
    vm.runInContext(slice(todo, 'const TODO_CHECKED_SVG', 'window.buildTodoListHTML')
        + slice(todo, 'function updateTodoDisplay(', '// Make updateTodoDisplay available globally'), env);
    env.updateTodoDisplay([
        { id: '1', content: 'Creating the main page', status: 'completed' },
        { id: '2', content: 'Adding the styling', status: 'in_progress' },
        { id: '3', content: 'Making it interactive', status: 'pending' },
    ], true);
    assert.deepEqual(calls, ['detach', 'append-running-list', 'after-list'], 'dots re-seated below the running list');
    console.log('ok   - a step starting keeps the dots below the checklist');
}

// No dots gate on the checklist any more; narration suppression keeps hasActiveTodos.
{
    assert.doesNotMatch(helpers + ui + todo + stream, /hasRunningTodo/, 'the running-step gate is gone');
    assert.doesNotMatch(source.slice(source.indexOf('function showSpinner()')), /hasActiveTodos\(\)/, 'dots never gate on hasActiveTodos');
    assert.match(stream, /hasActiveTodos\(\) \? \$\(\) : appendMessage/, 'narration suppression unchanged');
    console.log('ok   - no dots gate on the checklist');
}
