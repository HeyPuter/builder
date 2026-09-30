import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: a turn always has an activity indicator --------------
// The thinking dots are dropped while the progress checklist stands in as the
// indicator — but only a SHIMMERING (in_progress) item indicates anything. A
// build that stopped mid-checklist leaves only pending items; gating the dots
// on "any unfinished item" (hasActiveTodos) then left the next turn — e.g. the
// user's "continue" — with no indicator at all, so it looked frozen. The dots
// must gate on hasRunningTodo instead. Runs the REAL helpers against a tiny
// recording $.

const helpers = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const ui = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const todo = fs.readFileSync(new URL('../src/tools/chat_ui/todo.js', import.meta.url), 'utf8');
const slice = (src, a, b) => {
    const i = src.indexOf(a), j = src.indexOf(b, i);
    if (i < 0 || j < 0) throw new Error(`could not extract ${a}`);
    return src.slice(i, j);
};
const source = slice(helpers, 'function hasActiveTodos()', '// A stream owns its preview')
    + slice(helpers, 'function showSpinner()', '// Function to auto-resize textarea.')
    + slice(ui, 'function startSpinnerStub()', 'function autoScrollTrigger(');

// items: the last checklist's <li> classes, e.g. ['todo-completed', 'todo-pending'].
function setup({ items = null, spinner = false } = {}) {
    const state = { spinners: spinner ? 1 : 0, created: 0, fadedOut: 0 };
    const node = (length = 0, extra = {}) => ({
        length, 0: length ? { offsetWidth: 0, scrollHeight: 0 } : undefined,
        find: () => node(), last: () => node(), after() {}, append() {}, remove() {},
        addClass() { return this; }, removeClass() { return this; },
        ...extra,
    });
    const $ = (sel) => {
        if (sel === '.chat-box .todo-list') {
            if (!items) return node(0);
            const list = {
                find(q) {
                    if (q === 'li') return { not: c => ({ length: items.filter(i => i !== c.slice(1)).length }) };
                    if (q === 'li.todo-in_progress') return { length: items.filter(i => i === 'todo-in_progress').length };
                    throw new Error('unexpected query ' + q);
                },
            };
            return { length: 1, last: () => ({ length: 1, ...list }) };
        }
        if (sel === '.floating-spinner') {
            return node(state.spinners, {
                remove() { state.spinners = 0; },
                removeClass() { state.spinners = 0; state.fadedOut++; return this; },
            });
        }
        if (typeof sel === 'string' && sel.includes('floating-spinner')) { state.created++; return node(1); }
        return node(sel === '.chat-box' ? 1 : 0);
    };
    const env = { $, window: { shouldAutoScroll: false }, setTimeout() {} };
    vm.createContext(env);
    vm.runInContext(source, env);
    return { env, state };
}

const STUCK = ['todo-completed', 'todo-completed', 'todo-pending', 'todo-pending'];
const RUNNING = ['todo-completed', 'todo-in_progress', 'todo-pending'];

// hasRunningTodo reflects only a shimmering item; hasActiveTodos is unchanged.
{
    assert.equal(setup({ items: STUCK }).env.hasRunningTodo(), false, 'pending-only list is not running');
    assert.equal(setup({ items: STUCK }).env.hasActiveTodos(), true, 'pending-only list is still active (narration stays suppressed)');
    assert.equal(setup({ items: RUNNING }).env.hasRunningTodo(), true, 'in_progress item is running');
    assert.equal(setup().env.hasRunningTodo(), false, 'no checklist is not running');
    console.log('ok   - hasRunningTodo tracks the shimmering item only');
}

// The reported case: stopped mid-checklist, user sends "continue".
{
    const h = setup({ items: STUCK });
    assert.notEqual(h.env.startSpinnerStub(), null, 'turn start shows the dots');
    assert.equal(h.state.created, 1);
    console.log('ok   - stuck checklist: new turn shows the thinking dots');
}

// An actively running build keeps the shimmer as its only indicator.
{
    const h = setup({ items: RUNNING });
    assert.equal(h.env.showSpinner(), null, 'no dots next to a shimmering item');
    assert.equal(h.state.created, 0);
    const h2 = setup({ items: RUNNING, spinner: true });
    assert.equal(h2.env.startSpinnerStub(), null, 'existing dots fade out once an item runs');
    assert.equal(h2.state.fadedOut, 1);
    console.log('ok   - running checklist: shimmer replaces the dots');
}

// Existing dots are reused (not recreated) while nothing is shimmering.
{
    const h = setup({ items: STUCK, spinner: true });
    assert.notEqual(h.env.startSpinnerStub(), null);
    assert.equal(h.state.created, 0, 'reused, no flicker');
    assert.equal(h.state.fadedOut, 0);
    console.log('ok   - existing dots are reused while no item is running');
}

// Every dots gate uses hasRunningTodo; narration suppression keeps hasActiveTodos.
{
    const updateTodoDisplay = slice(todo, 'function updateTodoDisplay(', '// Make updateTodoDisplay available globally');
    assert.match(updateTodoDisplay, /if \(!hasRunningTodo\(\)\)/, 'updateTodoDisplay keeps the dots unless an item runs');
    assert.doesNotMatch(source.slice(source.indexOf('function showSpinner()')), /hasActiveTodos\(\)/, 'dots never gate on hasActiveTodos');
    const stream = fs.readFileSync(new URL('../src/js/handleMessageStream.js', import.meta.url), 'utf8');
    assert.match(stream, /hasActiveTodos\(\) \? \$\(\) : appendMessage/, 'narration suppression unchanged');
    console.log('ok   - gates are wired to the right helper');
}
