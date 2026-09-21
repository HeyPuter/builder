// Checkbox icons shared by the full checklist render (updateTodoDisplay) and
// the in-place check-off patch (checkOffTodoDisplay) below.
const TODO_CHECKED_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><title>checkbox-checked</title><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" stroke="#029802"><rect x="1.25" y="1.25" width="9.5" height="9.5" rx="2" ry="2"></rect><polyline points="3.747 6.5 5.25 8 8.253 4"></polyline></g></svg>';
const TODO_UNCHECKED_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12"><title>checkbox-unchecked</title><g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" stroke="#000000"><rect x="1.25" y="1.25" width="9.5" height="9.5" rx="2" ry="2"></rect></g></svg>';

// Build the checklist's markup (the complete .todo-list node) from a TodoWrite
// payload. Shared by updateTodoDisplay below (remove + append at the bottom of
// the chat) and restoreTodosForResume in app.js, which swaps the fresh markup
// into the already-rendered checklist node so resuming a build doesn't move
// the list. Returns { html, unfinishedCount } — the count drives the caller's
// floating-spinner bookkeeping — or null when there's nothing renderable.
//
// Be defensive about the shape of `todos`. This runs during loadChat's
// history replay, where it's fed a *persisted* TodoWrite payload — and a
// build interrupted mid-stream (or otherwise corrupted) can persist a
// partial tool_use whose `todos` is not an array, or whose entries aren't
// objects. A throw here ('todos.filter is not a function') aborts the ENTIRE
// chat load: the loop bails before the preview ever renders, bricking the
// whole project. So normalise to a clean array of valid entries and bail
// quietly (null) when there's nothing to show, instead of letting it throw.
function buildTodoListHTML(todos, animate) {
    if (!Array.isArray(todos)) return null;
    todos = todos.filter(todo => todo && typeof todo === 'object');
    if (todos.length === 0) return null;

    // Separate todos into completed and unfinished groups
    const completedTodos = todos.filter(todo => todo.status === 'completed');
    const unfinishedTodos = todos.filter(todo => todo.status !== 'completed');

    // Combine: completed first, then unfinished
    const sortedTodos = [...completedTodos, ...unfinishedTodos];

    let html = '<div class="todo-list message ai-message">';
    html += '<div class="message-content"><ul>';

    const checkedSvg = TODO_CHECKED_SVG;
    const uncheckedSvg = TODO_UNCHECKED_SVG;

    sortedTodos.forEach(todo => {
        // Wrap the label in a span so the shimmer applies only to the text,
        // not the checkbox icon.
        // When not animating (e.g. a restored chat with no turn running), an
        // item left "in progress" is no longer active — render it as pending so
        // it gets the dimmed/backlog styling instead of the standout active look
        // (full-opacity text + shimmer). This mirrors the in-memory cleanup that
        // demotes in_progress -> pending when a turn stops.
        const status = (!animate && todo.status === 'in_progress') ? 'pending' : todo.status;
        const icon = status === 'completed' ? checkedSvg : uncheckedSvg;
        const textClass = (animate && status === 'in_progress') ? 'todo-text shimmer' : 'todo-text';
        // Escape model-controlled fields before they hit innerHTML. todo.content
        // is free text from the AI's TodoWrite call (and is re-rendered raw on
        // every chat restore), so interpolating it unescaped is a stored-XSS sink
        // that runs in this privileged app's context — mirror the .text()/htmlEscape
        // discipline used for the chat title and AI messages.
        html += `<li class="todo-${htmlEscape(status)}">${icon} <span class="${textClass}">${htmlEscape(todo.content)}</span></li>`;
    });

    html += '</ul></div></div>';

    return { html, unfinishedCount: unfinishedTodos.length };
}
window.buildTodoListHTML = buildTodoListHTML;

// Helper function to display todos.
//
// `animate` controls the live "shimmer" on the in-progress item. It defaults to
// the global processing state because the shimmer means "this step is being
// worked on right now" — so it should only sweep while a turn is actually
// running. On chat restore (loadChat replays the persisted TodoWrite straight
// into here) `isProcessing` is false, so an item that was left mid-flight when
// the user switched projects renders as a plain unchecked item instead of
// shimmering forever as if work were still happening.
function updateTodoDisplay(todos, animate = isProcessing) {
    // Remove old todo display
    $('.chat-box .todo-list').remove();

    const built = buildTodoListHTML(todos, animate);
    if (!built) return;

    const chatBox = $('.chat-box');
    
    // Check if there's a floating spinner that needs to be moved
    const floatingSpinner = chatBox.find('.floating-spinner');
    
    if (floatingSpinner.length) {
        // Remove spinner temporarily, we'll re-add it after the todo list
        floatingSpinner.detach();
    }

    chatBox.append(built.html);

    // Re-add the floating spinner after the todo list only if every item is
    // done. While the checklist still has unfinished items, it serves as the
    // activity indicator, so the thinking dots are dropped to avoid redundancy.
    if (floatingSpinner.length) {
        if (built.unfinishedCount === 0) {
            const todoList = chatBox.find('.todo-list').last();
            todoList.after(floatingSpinner);
        } else {
            floatingSpinner.remove();
        }
    }
    
    if (window.shouldAutoScroll) {
        chatBox.scrollTop(chatBox[0].scrollHeight);
    }
}

// Make updateTodoDisplay available globally for chat restoration
window.updateTodoDisplay = updateTodoDisplay;

// ===== todo-turn-finalize (start) =====
// End-of-turn backstop for the checklist's final bookkeeping call. The model is
// prompted to close out the checklist with one last TodoWrite before its final
// summary, but that call is pure bookkeeping and is the one models most often
// skip — leaving the last step rendered unchecked forever even though the build
// finished and shipped. When a turn ends CLEANLY (sendChatMessage's
// turnSucceeded gate: not aborted, not stopped, not switched away, retries not
// exhausted), promote in_progress -> completed on the turn's live checklist:
// an item left in_progress at a clean end means the model declared it started
// the step and then voluntarily concluded the turn, so checking it off matches
// what the model told the user. Items still `pending` are NEVER touched — the
// model never claimed to start those, so checking them off would lie. All
// non-clean endings (Stop, error, chat switch, retry exhaustion) keep the
// existing demotion to pending (resetUIState / resetUIForAbort / the catch in
// sendChatMessage).
//
// `history` is scanned only from `fromIndex` (the turn's first message) so a
// turn that made no TodoWrite calls can never resurrect and falsely complete a
// PREVIOUS turn's abandoned checklist. A resume turn passes 0: the interrupted
// build's checklist predates the resume but is exactly the list the resumed
// work is finishing (same scan restoreTodosForResume uses).
//
// Mutates the found TodoWrite's `input.todos` in place — the same array the
// end-of-turn save serializes — so the promotion persists and a reload renders
// the item checked. Returns true when something was promoted (the caller then
// patches the rendered list via checkOffTodoDisplay).
function promoteFinishedTodos(history, fromIndex) {
    if (!Array.isArray(history)) return false;
    const start = Math.max(0, Number(fromIndex) || 0);
    // The LAST TodoWrite in range is the checklist's live state (each call
    // carries the full list); never dig past it to older, superseded lists.
    let todos = null;
    for (let i = history.length - 1; i >= start && !todos; i--) {
        const m = history[i];
        if (!m || m.role !== 'assistant' || !m.content) continue;
        const blocks = Array.isArray(m.content)
            ? m.content
            : (typeof m.content === 'object' ? [m.content] : []);
        for (const b of blocks) {
            if (b && b.type === 'tool_use' && b.name === 'TodoWrite'
                && b.input && Array.isArray(b.input.todos)) {
                todos = b.input.todos;
                break;
            }
        }
    }
    if (!todos) return false;
    let changed = false;
    for (const t of todos) {
        if (t && typeof t === 'object' && t.status === 'in_progress') {
            t.status = 'completed';
            changed = true;
        }
    }
    if (!changed) return false;
    // window.currentTodos normally aliases the same array (TodoWrite's exec and
    // restoreTodosForResume both assign the history entry's array), but sync it
    // explicitly so the turn-end demotion in resetUIState sees no in_progress
    // items even if that aliasing ever changes.
    if (Array.isArray(window.currentTodos) && window.currentTodos !== todos) {
        for (const t of window.currentTodos) {
            if (t && typeof t === 'object' && t.status === 'in_progress') t.status = 'completed';
        }
    }
    return true;
}
window.promoteFinishedTodos = promoteFinishedTodos;
// ===== todo-turn-finalize (end) =====

// Check off the promoted item(s) in the rendered checklist IN PLACE. A full
// updateTodoDisplay() re-render would re-append the list at the bottom of the
// chat box — BELOW the final summary bubble that streamed in after it — making
// the checklist visibly jump at turn end. Patching the existing <li>s keeps it
// exactly where the user watched it, and matches a normal completed render
// (todo-completed class + green checked icon, shimmer removed).
function checkOffTodoDisplay() {
    const $list = $('.chat-box .todo-list').last();
    if (!$list.length) return;
    $list.find('li.todo-in_progress').each(function () {
        const $li = $(this);
        $li.removeClass('todo-in_progress').addClass('todo-completed');
        $li.find('svg').first().replaceWith(TODO_CHECKED_SVG);
        $li.find('.todo-text').removeClass('shimmer');
    });
}
window.checkOffTodoDisplay = checkOffTodoDisplay;

window.tools.push({
    type: "function",
    function: {
        name: "TodoWrite",
        description: "Tracks task progress by creating and updating a todo list that's visible to users. Every call must send the complete todos array. IMPORTANT: before writing your end-of-turn summary, always make one final call marking every finished item \"completed\" — never end a turn with an item still \"in_progress\".",
        parameters: {
            type: "object",
            properties: {
                todos: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            content: {
                                type: "string",
                                description: "A short, plain-language description of the step, written for a non-technical user. Describe the outcome, not the implementation, and do not mention file names, code, or technical terms. For example, use \"Creating the main page\" instead of \"Create index.html\", or \"Adding the styling\" instead of \"Create styles.css\"."
                            },
                            status: {
                                type: "string",
                                enum: ["pending", "in_progress", "completed"],
                                description: "Current status of the todo"
                            },
                            id: {
                                type: "string",
                                description: "Unique identifier for the todo"
                            }
                        },
                        required: ["content", "status", "id"],
                        additionalProperties: false
                    }
                }
            },
            required: ["todos"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function(args) {
        // Store todos in a global state
        window.currentTodos = args.todos;
        
        // Update UI to show current todos
        updateTodoDisplay(args.todos);
        
        return { success: true };
    }
});