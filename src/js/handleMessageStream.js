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

// While the progress checklist has unfinished items, text bubbles are
// suppressed so mid-turn narration doesn't clutter the chat (see the "text"
// branch below and handleToolCalls). But a turn that ENDS on text isn't
// narration — it's the model's reply to the user: a question, a "here's what
// I did" summary written before the last item was checked off, or its answer
// to "continue" after a build stopped mid-checklist. Suppressing that left the
// chat looking frozen: every "continue" got a reply that only showed up after
// a reload. Called once the whole turn has drained; renders the final message
// if it never got a bubble. `fromIndex` limits it to this attempt's messages.
function revealFinalReply(context, fromIndex) {
    const hist = context.chatHistory;
    if (!Array.isArray(hist) || hist.length === 0 || hist.length - 1 < fromIndex) return;
    const last = hist[hist.length - 1];
    if (!last || last.role !== 'assistant' || last.isError) return;
    if (typeof last.content !== 'string' || !last.content.trim()) return;
    // Already on screen — streamed normally, or re-rendered by a chat reload.
    const id = last.messageId && String(last.messageId).replace(/["\\]/g, '\\$&');
    if (id && $(`.chat-box .message[data-message-id="${id}"]`).length) return;
    appendMessage(last.content, false, false, false, false, last.messageId);
}

// The stream emits a terminal {type:"usage", usage:{ usd_cents, input_tokens,
// output_tokens, ... }} chunk per model call. Accumulate the reported cost and
// token counts on the turn's shared context — one accumulator spans every round
// of the agentic loop, since the nested handleMessageStream/handleToolCalls
// calls all share this same `context`. cacheWrite folds the ephemeral
// (cache-creation) buckets the streamed usage reports. lastInput is the size of
// the latest request (all its input buckets together), the context size the
// analytics events band. The latest, not the largest: a refused request is the
// one after it, and on a request that compacted Puter's usage adds the
// summarizing pass, so that one reads high. The turn's stats, shared by every
// attempt, get the cost and that size too, so a turn refused for credits can
// still report them.
function recordUsageChunk(context, completion) {
    const u = completion && completion.usage;
    if (!u || typeof u !== 'object') return;
    const num = v => { const n = Number(v); return isFinite(n) && n > 0 ? n : 0; };
    const acc = context.pendingUsage || (context.pendingUsage = {
        cents: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, lastInput: 0,
    });
    // Token keys are each vendor's own. Claude's (and the Responses API's)
    // input_tokens/output_tokens are read as before. Routes that name them
    // otherwise (prompt_tokens, Gemini's counts) fall back to Puter's
    // provider-neutral usageDetails, which carries at least the totals.
    const d = completion.usageDetails;
    const call = (!('input_tokens' in u) && !('output_tokens' in u) && d && typeof d === 'object')
        ? {
            input: num(d.inputTokens), output: num(d.outputTokens), cacheRead: num(d.cacheReadTokens),
            cacheWrite: num(d.cacheWrite5mTokens) + num(d.cacheWrite1hTokens),
        }
        : {
            input: num(u.input_tokens), output: num(u.output_tokens), cacheRead: num(u.cache_read_input_tokens),
            cacheWrite: num(u.ephemeral_5m_input_tokens) + num(u.ephemeral_1h_input_tokens),
        };
    const cents = num(u.usd_cents);
    const size = call.input + call.cacheRead + call.cacheWrite;
    acc.cents += cents;
    acc.input += call.input;
    acc.output += call.output;
    acc.cacheRead += call.cacheRead;
    acc.cacheWrite += call.cacheWrite;
    // A usage line with no input counts leaves the last size as it was.
    if (size > 0) acc.lastInput = size;
    const stats = context.turnStats;
    if (stats) {
        stats.cents = (stats.cents || 0) + cents;
        if (size > 0) stats.lastInput = size;
    }
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
            // The latest request, a refused turn's fallback context size
            // (lastRequestSize in app.js). Not summed: it's a size, not a spend.
            if (acc.lastInput > 0) t.lastInput = acc.lastInput;
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
// keep working, and so are the chunk's own code and status, which
// isLowBalanceRefusal reads. friendlyErrorMessage() rewrites the text at
// display time.
function normalizeStreamError(completion) {
    const err = new Error(extractErrorText(completion));
    if (completion && typeof completion === 'object') {
        if (completion.error != null) err.error = completion.error;
        if (completion.code != null) err.code = completion.code;
        if (completion.status != null) err.status = completion.status;
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

// A later call in this turn failed (refused for credits, errored, or the turn
// was stopped) while this stream sat in its tool round. Puter sends a call's
// usage chunk last, after its tool_use, so it's still unread here, and without
// it the call's cost never reaches the chat's saved total. Read what's left of
// the stream for usage before unwinding. It's normally already buffered; one
// shared deadline per turn keeps a dead connection from stalling the unwind
// once per tool round.
const DRAIN_USAGE_MS = 1500;
async function drainUsage(stream, context) {
    try {
        const it = stream && stream[Symbol.asyncIterator] && stream[Symbol.asyncIterator]();
        if (!it || !it.next) return;
        if (!context.drainDeadline) context.drainDeadline = Date.now() + DRAIN_USAGE_MS;
        while (true) {
            const left = context.drainDeadline - Date.now();
            if (left <= 0) return;
            let timer;
            const timeout = new Promise(resolve => { timer = setTimeout(() => resolve(null), left); });
            const r = await Promise.race([it.next(), timeout]).finally(() => clearTimeout(timer));
            if (!r || r.done) return;
            if (r.value && r.value.type === 'usage') recordUsageChunk(context, r.value);
        }
    } catch (_) { /* best-effort: the turn's own error is what surfaces */ }
}

// What the model is doing while it writes a tool call, shown beside the
// thinking dots. Puter sends a call's name the moment the model starts it, and
// its arguments as they're written (streamToolInput, see
// ModelCore.buildChatOptions), so a call that takes seconds to write, a whole
// file for `write`, no longer sits behind bare dots. The wording is plain, like
// the checklist's, and never names a file: the user doesn't know index.html.
// `write` and `edit` say which part of the app is changing once the file's path
// has streamed in (appPartLabel), and fall back to their plain wording only
// when the path can't be read. A tool not listed leaves the dots bare: the
// checklist and the clarifying-questions and upgrade cards show for themselves.
const TOOL_PROGRESS = {
    write: 'Working on your app',
    edit: 'Updating your app',
    multi_edit: 'Updating your app',
    delete: 'Removing a file',
    rename: 'Renaming a file',
    copy: 'Copying a file',
    move: 'Moving files',
    mkdir: 'Creating a folder',
    ReadTextFile: 'Reading a file',
    ViewDocument: 'Reading a document',
    ViewImage: 'Looking at an image',
    ShowImage: 'Showing an image',
    RenderSvg: 'Preparing an image for sharing',
    readdir: 'Looking through the project',
    stat: 'Looking through the project',
    SearchFiles: 'Searching the project',
    publish_site: 'Setting up the preview',
    // The words the preview's own overlay uses (showPreviewUpdating).
    update_preview: 'Applying changes',
    // The model adds images and audio the app needs without being asked, so
    // the status says what they're for.
    GenerateImage: 'Creating an image for your app',
    GenerateVideo: 'Generating a video',
    GenerateSpeech: 'Creating audio for your app',
    create_worker: 'Setting up the backend',
    delete_worker: 'Removing a backend',
    list_workers: 'Checking the backend',
    get_worker: 'Checking the backend',
    set_secret: 'Saving a key',
    set_email_sender_name: 'Setting the email sender name',
    FetchExternalResource: 'Reading a web page',
};
// The tools whose status names the part of the app, and whether they create
// it (write) or change it.
const TOOL_PART = { write: 'create', edit: 'change', multi_edit: 'change' };

// The status for a tool call, or '' for none.
function toolProgressLabel(name) {
    if (TOOL_PROGRESS[name]) return TOOL_PROGRESS[name];
    return typeof name === 'string' && name.startsWith('mcp_') ? 'Using a connected service' : '';
}

// The part of the app at `path` (within the project), in the checklist's
// words, as [creating it, changing it].
function appPartLabel(path) {
    const name = path.split('/').pop().toLowerCase();
    if (path === 'index.html') return ['Creating the main page', 'Updating the main page'];
    // The icon the app installs with (see js/manifest.js), not a picture in it.
    if (path === 'icon.svg') return ['Adding the app icon', 'Updating the app icon'];
    if (/\.html?$/.test(name)) return ['Creating a page', 'Updating a page'];
    if (/\.css$/.test(name)) return ['Adding the styling', 'Updating the styling'];
    if (path.startsWith('workers/')) return ['Setting up the backend', 'Updating the backend'];
    if (/\.(m?js|cjs)$/.test(name)) return ['Making it interactive', 'Updating how it works'];
    if (/\.(png|jpe?g|gif|webp|svg|avif|ico)$/.test(name)) return ['Adding an image', 'Updating an image'];
    if (/\.json$/.test(name)) return ["Adding the app's data", "Updating the app's data"];
    return ['Working on your app', 'Working on your app'];
}

// The path a streaming call names, relative to the project when it's inside
// it, else just its file name. null until the call's `path` has streamed in,
// '' when it can't be read. Only the opening characters are searched, since a
// `write` streams the whole file after it.
function progressPath(json, appDir) {
    const m = /"path"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(json.slice(0, 2000));
    if (!m) return json.length > 2000 ? '' : null;
    let path;
    try { path = JSON.parse('"' + m[1] + '"'); } catch (e) { return ''; }
    if (appDir && path.startsWith(appDir + '/')) return path.slice(appDir.length + 1);
    return path.split('/').filter(Boolean).pop() || '';
}

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
    // Where this attempt's messages begin — bounds revealFinalReply below to
    // text this stream produced, never an earlier turn's.
    const historyStart = Array.isArray(context.chatHistory) ? context.chatHistory.length : 0;
    // Compaction entries this stream inserted at historyStart, so a second one
    // goes after the first.
    let compactionsHere = 0;

    // Local ownership matters: recursive tool rounds and stale turns must not
    // tear down another stream's preview. Always dispose before a tool handoff.
    // This model call, counted once into the turn's stats (the Usage Limit Hit
    // event's calls) at its first tool_use or its usage chunk. Not at usage
    // alone: usage comes last, after the tool rounds this stream recursed into,
    // so a later call refused for credits would leave every earlier one
    // uncounted.
    let callCounted = false;
    const countCall = () => {
        if (callCounted || !context.turnStats) return;
        callCounted = true;
        context.turnStats.calls++;
    };
    let thinkingPreview = null;
    const clearThinking = () => {
        thinkingPreview?.remove();
        thinkingPreview = null;
    };
    // The tool call being written, for the status beside the dots
    // (toolProgressLabel): { id, name, json, path }.
    let progress = null;
    // This reply's tool calls, run together once the reply is complete: at its
    // usage line, which Puter writes last, or at the end of the stream. Running
    // each call the moment it arrived started the next model round before the
    // rest of the reply was read, so a reply with several calls (GPT and
    // Gemini make them, and so does Opus when Puter serves it through a
    // reseller) ran calls 2..N after the turn had moved on: late, out of
    // order, over newer files. A reply that ends in an error or an abort drops
    // its calls unrun. They were never stored, so nothing is left dangling.
    // No timer runs them early: a healthy reply can go quiet for minutes while
    // its next call is written, so silence never means the reply is done. A connection that dies mid-reply
    // is ended by Stop or the stall watchdog, and Resume continues the build.
    let pendingTools = [];
    const runPendingTools = async (stopReason) => {
        const batch = pendingTools;
        pendingTools = [];
        if (batch.length === 0) return null;
        // Cut off at the output limit: the last call's arguments are
        // incomplete (Puter hands them over as {}), so it is answered with an
        // error instead of run (see CUT_OFF_TOOL_ERROR in tools.js).
        if (stopReason === 'max_tokens' || stopReason === 'length') batch[batch.length - 1]._cutOff = true;
        // Save before and after a tool call incase the user quits. All of the
        // reply's narration, including text that came after a call, becomes one
        // message ahead of the calls.
        saveCurrentMessage(context);
        let result;
        try {
            // One call stays a plain object, as before, so a Claude history is
            // stored and sent byte for byte as it always was.
            result = await handleToolCalls(batch.length === 1 ? batch[0] : batch, true, context);
        } catch (err) {
            await drainUsage(stream, context);
            throw err;
        }
        saveCurrentMessage(context);
        return result;
    };
    let toolRoundEnded = false;
    try {
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

            if (completion.type === 'reasoning') {
                if (typeof completion.reasoning === 'string' && completion.reasoning.length) {
                    window.noteTurnProgress?.();
                    thinkingPreview ||= createThinkingPreview(context);
                    thinkingPreview.append(completion.reasoning);
                }
                continue;
            }
            // A tool call has started, then its arguments stream in. The
            // complete call still comes as the usual tool_use chunk below, and
            // that is what runs.
            if (completion.type === 'tool_use_start') {
                clearThinking();
                window.noteTurnProgress?.();
                startSpinnerStub();
                progress = { id: completion.id, name: completion.name, json: '', path: null };
                // `write` and `edit` wait for their path, which comes in the
                // call's first pieces: showing "Working on your app" first
                // only for it to be replaced a moment later read as a snap.
                window.setSpinnerLabel?.(TOOL_PART[completion.name] ? '' : toolProgressLabel(completion.name));
                continue;
            }
            if (completion.type === 'tool_input_delta') {
                if (progress && progress.id === completion.id && progress.path === null && TOOL_PART[progress.name]) {
                    progress.json += typeof completion.partialJson === 'string' ? completion.partialJson : '';
                    progress.path = progressPath(progress.json, context.appDir);
                    if (progress.path) {
                        const [creating, changing] = appPartLabel(progress.path);
                        window.setSpinnerLabel?.(TOOL_PART[progress.name] === 'create' ? creating : changing);
                    } else if (progress.path === '') {
                        window.setSpinnerLabel?.(toolProgressLabel(progress.name));
                    }
                }
                continue;
            }
            if (completion.type === 'compaction') {
                // The model summarized the older history (ModelCore compactAt).
                // Stored as its own entry where this request's output begins,
                // ahead of its reply's text and tool calls. Puter writes it
                // before the usage line, which it writes last as it closes the
                // stream, so it always arrives before this reply's tool calls
                // run. Usually it comes first. When Anthropic didn't stream it,
                // Puter sends it after the message, and inserting at
                // historyStart still puts it ahead. The next request starts
                // from here (ModelCore.fromLastCompaction). The model stamp says
                // which vendor can read it back.
                if (typeof completion.encrypted_content === 'string' && completion.encrypted_content) {
                    context.chatHistory.splice(historyStart + compactionsHere++, 0, {
                        role: 'assistant',
                        content: [{ type: 'compaction', id: completion.id, encrypted_content: completion.encrypted_content }],
                        compaction: true,
                        ...(context.model ? { model: context.model } : {}),
                    });
                    if (context.turnStats) context.turnStats.compactions = (context.turnStats.compactions || 0) + 1;
                }
                continue;
            }
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
                // Empty text chunks are sometimes keepalives, not an answer yet.
                if (typeof completion.text !== 'string' || !completion.text) continue;
                clearThinking();
                window.noteTurnProgress?.();
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
                // per-delta .remove()) and self-suppresses while a checklist item is
                // in progress (hasRunningTodo), since its shimmer is the indicator
                // then. The dots are torn down the instant the whole turn's
                // generation ends (recurser block below) and on abort/error/turn-reset,
                // so they never linger past completion.
                showSpinner();
                // The model is writing to the user now, not a tool call.
                window.setSpinnerLabel?.('');

                autoScrollTrigger(context);
            }
            if (completion.type === "usage") {
                countCall();
                recordUsageChunk(context, completion);
                // Puter capped this response at what the balance could pay for
                // and puter.js showed Low Balance. Read by sendChatMessage.
                if (completion.metadata && completion.metadata.usage_limited === true) {
                    context.usageLimited = true;
                }
                // The reply is complete: run its tool calls (see pendingTools).
                const result = await runPendingTools(completion.stopReason || completion.finish_reason);
                if (result && (result.error || shouldStop)) {
                    toolRoundEnded = true;
                    break;
                }
            }
            if (completion.type === "tool_use") {
                countCall();
                clearThinking();
                window.noteTurnProgress?.();
                startSpinnerStub();
                pendingTools.push(completion);
            }
        }
    } finally {
        // Includes stream errors, Stop, navigation, retries and reasoning-only
        // responses, even when the stream never emits another chunk.
        clearThinking();
    }
    if (isAborted(context.abortController) || isStaleTurn(context)) return;
    // A stream that ended without its usage line still ran to its end (an
    // error line would have thrown above), so its calls run now.
    if (!toolRoundEnded && pendingTools.length > 0) {
        await runPendingTools();
        if (isAborted(context.abortController) || isStaleTurn(context)) return;
    }
    if (recurser) {
        // The top-level stream has drained — the entire turn (every recursive
        // round via handleToolCalls) is done generating. Tear down the trailing
        // thinking dots HERE, the moment generation completes, rather than leaving
        // it to resetUIState() in sendChatMessage's finally, which runs only once
        // the turn's bookkeeping is done. stopSpinnerStub removes only
        // the floating dots — the checklist stays and is re-rendered (un-animated)
        // by the reset. A suppressed final reply is revealed FIRST so it lands
        // above the dots (appendMessage re-seats a live spinner below the new
        // bubble) — revealed after the fade began, it was appended beneath the
        // departing dots and jumped up when they were removed.
        saveCurrentMessage(context);
        revealFinalReply(context, historyStart);
        stopSpinnerStub();
        // Fold the whole turn's accumulated AI cost + token usage onto its last
        // assistant message so it's persisted by the end-of-turn save in
        // sendChatMessage.
        flushTurnUsage(context);
    }
}
