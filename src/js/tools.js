const showError = (placeholderMessage, errorText) => {
    if (placeholderMessage && placeholderMessage.length) {
        // Reuse the same friendly-text + styled-card treatment as chat-level
        // errors (appendErrorMessage), but in place of this tool's progress
        // placeholder. Swap the ai-message styling for the red error card.
        const friendly = friendlyErrorMessage(extractErrorText(errorText));
        placeholderMessage.removeClass('ai-message').addClass('error-message');
        placeholderMessage.find('.message-content').html(errorCardHTML(friendly));
    }
};

window.tools = [];


window.findTool = function(name) {
    return window.tools.find(tool => tool.function.name === name);
}

window.executeFunction = async function(functionName, args, state) {
    const tool = window.findTool(functionName);
    if (!tool) {
        throw new Error(`Unknown function: ${functionName}`);
    }
    return await tool.exec(args, state);
}

// Helper function to add tool result to history
function addToolResultToHistory(history, toolCallId, toolResponse, isError = false) {
    // A tool may return content blocks for the model to see (e.g. an image) by
    // returning { __contentBlocks: [...] }. Pass those through as the tool_result
    // content array instead of stringifying it (used by ViewImage). Everything
    // else is serialized to a JSON string as before.
    const hasBlocks = !isError && toolResponse && typeof toolResponse === 'object'
        && Array.isArray(toolResponse.__contentBlocks);
    history.push({
        role: "user",
        content: {
            "type": "tool_result",
            tool_use_id: toolCallId,
            content: hasBlocks ? toolResponse.__contentBlocks : JSON.stringify(toolResponse),
            ...(isError && { is_error: true })
        }
    });
}

// True when `history` already holds a tool_result for `toolUseId` — i.e. the
// interrupted-turn repair (repairDanglingToolUses in app.js) got there first.
function hasToolResultFor(history, toolUseId) {
    if (!Array.isArray(history) || toolUseId == null) return false;
    for (let i = history.length - 1; i >= 0; i--) {
        const m = history[i];
        const c = m && m.content;
        if (m && m.role === 'user' && c && typeof c === 'object' && !Array.isArray(c)
            && c.type === 'tool_result' && c.tool_use_id === toolUseId) return true;
    }
    return false;
}
window.hasToolResultFor = hasToolResultFor;

async function handleToolCalls(completion, isTopLevel = false, c) {
    // Extract text content
    const textContent = completion.text;
    delete completion.text;
    
    // Normalize completion to array
    if(!Array.isArray(completion))
        completion = [completion];

    // Add text content to history if present. Suppress the UI bubble while
    // the progress checklist has unfinished items, so mid-turn narration that
    // arrives packaged with a tool_use doesn't clutter the chat. History is
    // preserved so the model's own context stays intact.
    if (textContent && textContent.trim()) {
        const messageId = generateMessageId();
        c.chatHistory.push({
            role: "assistant",
            content: textContent,
            messageId: messageId
        });
        if (!hasActiveTodos()) {
            appendMessage(textContent, false, false, false, false, messageId);
        }
    }

    // Add tool_use to history
    c.chatHistory.push({
        role: "assistant",
        content: completion.length === 1 ? completion[0] : completion
    });

    // Process tool calls - execute all tools
    const toolCalls = completion.filter(t => t && t.type === 'tool_use');

    // Execute all tools and collect results
    for (const toolCall of toolCalls) {
        // Check for abort (or a chat switch) before each tool execution
        if (isAborted(c.abortController) || isStaleTurn(c)) {
            return { error: 'Aborted', history: c.chatHistory };
        }
        
        try {
            // Execute the tool
            const toolResponse = await executeFunction(toolCall.name, toolCall.input, c);
            // The exec may have outlived its turn: the user hit Stop mid-tool
            // and sent a new message, whose setup already synthesized a result
            // for this id (repairDanglingToolUses) and appended their prompt.
            // A second result for the same id, landing after that prompt,
            // breaks the tool_use/tool_result adjacency the API enforces —
            // every later request in the chat was rejected, for good.
            if (!hasToolResultFor(c.chatHistory, toolCall.id)) {
                addToolResultToHistory(c.chatHistory, toolCall.id, toolResponse);
            }
        } catch (error) {
            // Extract error message
            const errorMessage = error.error?.message || error.message || error;
            // Store error result in history (same guard as above)
            if (!hasToolResultFor(c.chatHistory, toolCall.id)) {
                addToolResultToHistory(c.chatHistory, toolCall.id, { error: errorMessage }, true);
            }
        } finally {
            // Track project-file changes so the turn can be snapshotted for
            // version history. Done in finally because multi-path tools (move,
            // mkdir) can mutate the filesystem and then throw — the change still
            // happened. No-op for non-mutating tool names.
            window.markProjectModified?.(toolCall.name, c.currentChatId);
            // Record the ACTUAL file paths each tool writes, so the preview can
            // verify exactly those files have propagated to the live site before
            // reloading. rename/copy/move land the file at a COMPUTED path (not
            // the raw input): rename -> dir(path)/new_name, copy/move -> dest/basename.
            try {
                const _inp = toolCall.input || {};
                const _base = s => (typeof s === 'string' ? s.slice(s.lastIndexOf('/') + 1) : '');
                const _trimEnd = s => (typeof s === 'string' ? s.replace(/\/+$/, '') : '');
                if (toolCall.name === 'rename' && _inp.path && _inp.new_name) {
                    window.recordPreviewChange?.(_inp.path.slice(0, _inp.path.lastIndexOf('/') + 1) + _inp.new_name);
                } else if (toolCall.name === 'copy' && _inp.path && _inp.destination) {
                    window.recordPreviewChange?.(_trimEnd(_inp.destination) + '/' + _base(_inp.path));
                } else if (toolCall.name === 'move' && Array.isArray(_inp.paths_array) && _inp.destination) {
                    _inp.paths_array.forEach(p => window.recordPreviewChange?.(_trimEnd(_inp.destination) + '/' + _base(p)));
                } else {
                    if (_inp.path) window.recordPreviewChange?.(_inp.path);
                    if (Array.isArray(_inp.paths_array)) _inp.paths_array.forEach(p => window.recordPreviewChange?.(p));
                }
            } catch (e) { /* recording is best-effort */ }
        }
    }
    
    // Checkpoint this round's results (the assistant tool_use + every tool_result
    // just pushed into c.chatHistory) BEFORE the throw-prone next-round
    // puter.ai.chat below. Coalesced + non-blocking, so it's cheap. This is the
    // crash-safety net for a long multi-round turn: if the next round throws, or
    // the user refreshes while the AI is still working, the completed rounds are
    // already on disk rather than waiting for an end-of-turn save that never runs.
    if (toolCalls.length > 0) {
        scheduleSaveCurrentChat(c);
    }

    spinner = showSpinner();

    // Check for abort/chat-switch after showing spinner (clean it up if so)
    if (isAborted(c.abortController) || isStaleTurn(c)) {
        if (spinner) {
            spinner.remove();
            spinner = null;
        }
        return { error: 'Aborted', history: c.chatHistory };
    }
    // Only create a new AbortController if one doesn't already exist
    // (it's created in sendChatMessage for top-level calls, and we don't want to overwrite it)
    if (!c.abortController) {
        c.abortController = new AbortController();
    }

    // Build the next-round request from the TURN's captured history (c.chatHistory),
    // not the global `chatHistory` — a mid-turn chat switch reassigns the global,
    // and feeding the wrong conversation to the model here would corrupt the turn.
    // abortableAwait: the SDK ignores the signal option, so the open must be
    // raced against the signal locally or an abort can't unstick a dead open.
    const stream = await abortableAwait(puter.ai.chat(prepareHistoryForAI(c.chatHistory), {
        model: MODEL,
        tools: window.tools,
        stream: true,
        reasoning_effort: 'high',
        signal: c.abortController.signal
    }), c.abortController.signal);
    // Round handoff = liveness for the background-freeze watchdog (see
    // mobile-lifecycle-keepalive in app.js). Guarded so a stale turn's rounds
    // can't mask a stall of the chat the user actually has open.
    if (!isStaleTurn(c)) window.noteTurnActivity?.();

    // Don't remove spinner here - keep it visible during tool calls
    // It will be removed when we actually get text content
    c.currentMessageContent = '';
    c.currentMessage = null;

    // Process stream responses
    await handleMessageStream(stream, c)

    // Check if we were aborted (or the user switched chats) during stream
    // processing. Use the turn's captured controller/history (c.*), not the
    // reassignable globals, so a mid-turn chat switch can't make this read the
    // wrong abort state or return another chat.
    if (isAborted(c.abortController) || isStaleTurn(c)) {
        return { error: 'Aborted', history: c.chatHistory };
    }

    // STEP 5: Otherwise exit - handle remaining text content and final sync
    // Only modify history here for final text content (top level only)
    if (isTopLevel) {
        // Non-blocking + coalesced: mid-turn checkpoints keep crash safety but
        // no longer stack up serial full-history writes as the recursion unwinds.
        scheduleSaveCurrentChat(c);
    }
    
    // Return the updated history
    return {
        history: c.chatHistory,
        messageContent: c.currentMessageContent
    };
}