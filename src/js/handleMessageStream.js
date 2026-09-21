function saveCurrentMessage(context) {
    if (context.currentMessageContent && context.currentMessageContent.trim()) {
        const messageId = generateMessageId();
        // Push to the turn's own history (context.chatHistory), not the global
        // `chatHistory`. They're the same array in the simple case, but if the
        // user switches/reloads a chat mid-stream the global is reassigned —
        // appending to it would land the reply in the wrong chat and the save
        // (which writes context.chatHistory) would miss this message entirely.
        context.chatHistory.push({
            role: "assistant",
            content: context.currentMessageContent,
            messageId: messageId
        });
        // Update the DOM element if it exists
        if (context.currentMessage && context.currentMessage.length) {
            context.currentMessage.attr('data-message-id', messageId);
        }
        // Reset for tool call processing
        context.currentMessageContent = '';
        context.currentMessage = null;
    }
}

// The stream emits a terminal {type:"usage", usage:{ usd_cents, input_tokens,
// output_tokens, ... }} chunk per model call. Accumulate the reported cost and
// token counts on the turn's shared context — one accumulator spans every round
// of the agentic loop, since the nested handleMessageStream/handleToolCalls
// calls all share this same `context`. cacheWrite folds the ephemeral
// (cache-creation) buckets the streamed usage reports.
function recordUsageChunk(context, completion) {
    const u = completion && completion.usage;
    if (!u || typeof u !== 'object') return;
    const num = v => { const n = Number(v); return isFinite(n) && n > 0 ? n : 0; };
    const acc = context.pendingUsage || (context.pendingUsage = {
        cents: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0,
    });
    acc.cents += num(u.usd_cents);
    acc.input += num(u.input_tokens);
    acc.output += num(u.output_tokens);
    acc.cacheRead += num(u.cache_read_input_tokens);
    acc.cacheWrite += num(u.ephemeral_5m_input_tokens) + num(u.ephemeral_1h_input_tokens);
}

// At the end of a turn, fold the accumulated cost + token usage onto the turn's
// last assistant message so it persists with the chat history (and can be
// summed back by sumChatCostCents / sumChatTokenUsage for the project-info
// dialog). Lumping the whole turn's usage onto a single message is intentional —
// the dialog only reports project totals, and a multi-round turn's per-round
// usage chunks arrive interleaved with the recursion, so precise per-message
// attribution would be fragile for no user-visible benefit.
function flushTurnUsage(context) {
    const acc = context.pendingUsage;
    if (!acc) return;
    // Opt-in cache diagnostics: run `localStorage.debugCache = 1` in the console
    // to log per-turn token usage. A large `cacheRead` on a NEW chat's FIRST turn
    // means the shared common-block prefix is being reused across chats. Silent
    // unless the flag is set; safe to remove once verified.
    try {
        if (typeof localStorage !== 'undefined' && localStorage.getItem('debugCache')) {
            console.log('[cache] input=%o output=%o cacheRead=%o cacheWrite=%o cents=%o',
                acc.input, acc.output, acc.cacheRead, acc.cacheWrite, acc.cents);
        }
    } catch (_) {}
    const hasUsage = acc.cents > 0 || acc.input > 0 || acc.output > 0 || acc.cacheRead > 0 || acc.cacheWrite > 0;
    if (!hasUsage) { context.pendingUsage = null; return; }
    // Expose THIS turn's totals so sendChatMessage can report AI cost to analytics
    // (the Build Completed event) without re-summing the whole chat history. acc is
    // the running total across every round of this turn's agentic loop, so it's the
    // full turn cost. Overwritten (not accumulated) per turn — on a retry a fresh
    // context is created, so this snapshot always reflects the successful attempt.
    context.turnUsage = {
        cents: acc.cents, input: acc.input, output: acc.output,
        cacheRead: acc.cacheRead, cacheWrite: acc.cacheWrite,
    };
    const hist = context.chatHistory;
    if (!Array.isArray(hist)) return;
    for (let i = hist.length - 1; i >= 0; i--) {
        if (hist[i] && hist[i].role === 'assistant') {
            const msg = hist[i];
            if (acc.cents > 0) msg.costUsdCents = (msg.costUsdCents || 0) + acc.cents;
            const t = msg.tokenUsage || (msg.tokenUsage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 });
            t.input += acc.input;
            t.output += acc.output;
            t.cacheRead += acc.cacheRead;
            t.cacheWrite += acc.cacheWrite;
            context.pendingUsage = null;
            return;
        }
    }
    // No assistant message to attach to (shouldn't happen — usage follows
    // generated content); leave it pending so a later flush can still capture it.
}

// Turn a terminal "error" stream chunk into an Error that sendChatMessage's
// catch can display. extractErrorText() (helpers.js) digs the human-readable
// message out of whatever shape the chunk carries (including a wrapped
// '400 {...}' envelope). The structured `.error` payload is preserved on the
// thrown object so downstream checks (e.g. the usage-limit delegate branch)
// keep working; friendlyErrorMessage() rewrites the text at display time.
function normalizeStreamError(completion) {
    const err = new Error(extractErrorText(completion));
    if (completion && typeof completion === 'object' && completion.error != null) {
        err.error = completion.error;
    }
    return err;
}

// ---- Abort-aware stream plumbing -------------------------------------------
// puter.ai.chat does NOT honor the `signal` option (the SDK never reads
// options.signal — verified against js.puter.com/v2), so aborting the turn's
// AbortController cancels nothing by itself: a `for await` parked on a dead
// socket's next chunk — exactly what a mobile tab-freeze leaves behind — would
// hang forever, and even a user Stop only takes effect when the next chunk
// happens to arrive. These wrappers make BOTH await points abort-aware locally:
// the pending open/read is raced against the signal, so an abort (user Stop,
// chat switch, or the background-freeze stall watchdog in app.js) unwinds the
// turn immediately with an AbortError even when the network is silent.
// ===== abortable-stream (start) =====

// Best-effort close of an async-iterable stream nobody will consume, so the
// SDK's reader/connection isn't left dangling. Never throws, never awaited.
function disposeAbandonedStream(stream) {
    try {
        const it = stream && stream[Symbol.asyncIterator] && stream[Symbol.asyncIterator]();
        const p = it && it.return && it.return();
        if (p && p.catch) p.catch(() => {});
    } catch (_) { /* disposal is best-effort */ }
}

// Await `promise` (a puter.ai.chat open) but reject with AbortError the moment
// `signal` fires. If the open resolves after the abort already won, the
// unwanted stream is disposed rather than leaked.
function abortableAwait(promise, signal) {
    if (!signal) return promise;
    return new Promise((resolve, reject) => {
        let settled = false;
        promise.then(
            (value) => {
                if (settled) { disposeAbandonedStream(value); return; }
                settled = true;
                resolve(value);
            },
            (err) => { if (!settled) { settled = true; reject(err); } },
        );
        const onAbort = () => {
            if (settled) return;
            settled = true;
            reject(new DOMException('The operation was aborted.', 'AbortError'));
        };
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
    });
}

// Iterate `stream`, racing every pending next() against the signal. On abort
// the generator throws AbortError immediately (the dead read is left behind —
// Promise.race keeps its eventual settlement handled), and the underlying
// iterator gets a best-effort return() so a still-live stream can close, same
// as a plain `for await` would do on early exit.
async function* abortableStream(stream, signal) {
    if (!signal) { yield* stream; return; }
    const it = stream[Symbol.asyncIterator]();
    const aborted = new Promise((_, reject) => {
        const onAbort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
        if (signal.aborted) onAbort();
        else signal.addEventListener('abort', onAbort, { once: true });
    });
    // The turn usually ends without an abort; keep the sentinel's eventual
    // rejection (e.g. a Stop long after this stream drained) from surfacing as
    // an unhandled rejection.
    aborted.catch(() => {});
    try {
        while (true) {
            const r = await Promise.race([it.next(), aborted]);
            if (r.done) return;
            yield r.value;
        }
    } finally {
        try {
            const p = it.return && it.return();
            if (p && p.catch) p.catch(() => {});
        } catch (_) { /* best-effort close */ }
    }
}
// ===== abortable-stream (end) =====

/**
 *
 * @param {*} stream
 * @param {{abortController: AbortController, chatHistory: Array, currentMessage: any, currentMessageContent: string}} context
 * @returns
 */
async function handleMessageStream(stream, context) {
    // Top level stream check so save isn't spammed
    let recurser = false;
    if (!context.recursed) {
        recurser = true;
        context.recursed = true;
    }
    
    // Abort-aware iteration: puter.ai.chat ignores the signal option, so this
    // race is what actually makes an abort take effect while the stream is
    // silent (see the abortable-stream block above).
    for await (const completion of abortableStream(stream, context.abortController && context.abortController.signal)) {
        // Bail if the request was aborted OR the user has since switched chats —
        // in either case nothing from this turn should render into the live chat.
        if (isAborted(context.abortController) || isStaleTurn(context)) {
            return;
        }

        // Liveness stamp for the background-freeze watchdog (see
        // mobile-lifecycle-keepalive in app.js): a chunk arriving means the
        // stream survived the freeze and must not be declared stalled. After
        // the abort/stale check so a dying turn can't mask the live one.
        window.noteTurnActivity?.();

        if (completion.type === "error") {
            // The stream can deliver a TERMINAL error chunk instead of content —
            // e.g. the request was rejected upstream (image too large, malformed
            // request, provider outage). Previously the loop only acted on "text"
            // and "tool_use" chunks, so an "error" chunk fell through and the turn
            // ended with the spinner gone and NO message — a silent failure. Throw
            // it so sendChatMessage's catch surfaces it in the chat and records it
            // to history, exactly like an error thrown by puter.ai.chat itself.
            throw normalizeStreamError(completion);
        }
        if (completion.type === "text") {
            if (!context.currentMessage) {
                // While the progress checklist has unfinished items, suppress
                // mid-turn narration from the UI. The text still goes into
                // chatHistory via saveCurrentMessage so the model's context is
                // intact; we just don't render a bubble for it. We use an
                // empty jQuery as the message handle so the .find/.attr calls
                // below silently no-op.
                context.currentMessage = hasActiveTodos() ? $() : appendMessage('', false);
            }
            context.currentMessageContent += completion.text;

            // Only render when there is a bubble to render into. While the
            // checklist suppresses narration, currentMessage is an EMPTY jQuery
            // and .html() is a no-op — but its argument was still evaluated, so
            // the whole accumulated message was re-parsed (and its fenced code
            // re-highlighted) on every delta for nothing.
            if (context.currentMessage.length) {
                context.currentMessage.find('.message-content').html(
                    marked.parse(escapeMarkdownSource(context.currentMessageContent))
                    .replace(/<a href=/g, '<a target="_blank" href=')
                );
            }

            // Keep the thinking dots visible as a trailing indicator beneath the
            // streaming bubble. Previously a text chunk REMOVED the dots
            // (stopSpinnerStub), so once the model finished narrating and went
            // quiet to reason about its next tool call there was no activity
            // indicator at all — a "dead zone" that looked stuck even though the
            // request was still in flight (esp. on follow-up turns that don't use
            // a TodoWrite checklist). showSpinner() is idempotent — it reuses an
            // existing spinner (no per-delta DOM churn, strictly less than the old
            // per-delta .remove()) and self-suppresses while a checklist is active
            // (hasActiveTodos), since the shimmering in-progress item is the
            // indicator then. The dots are torn down the instant the whole turn's
            // generation ends (recurser block below) and on abort/error/turn-reset,
            // so they never linger past completion.
            showSpinner();

            autoScrollTrigger(context);
        }
        if (completion.type === "usage") {
            recordUsageChunk(context, completion);
        }
        if (completion.type === "tool_use") {
            startSpinnerStub();

            // Save before and after a tool call incase the user quits
            saveCurrentMessage(context);
            const result = await handleToolCalls(completion, true, context);
            saveCurrentMessage(context);
            if (result.error || shouldStop) {
                break;
            }
        }
    }
    if (recurser) {
        // The top-level stream has drained — the entire turn (every recursive
        // round via handleToolCalls) is done generating. Tear down the trailing
        // thinking dots HERE, the moment generation completes, rather than leaving
        // it to resetUIState() in sendChatMessage's finally: that runs only AFTER
        // an awaited (up to 8s) end-of-turn save, which would otherwise leave the
        // dots spinning long after the model stopped. stopSpinnerStub removes only
        // the floating dots — the checklist stays and is re-rendered (un-animated)
        // by the reset.
        stopSpinnerStub();
        saveCurrentMessage(context);
        // Fold the whole turn's accumulated AI cost + token usage onto its last
        // assistant message so it's persisted by the end-of-turn save in
        // sendChatMessage.
        flushTurnUsage(context);
    }
}