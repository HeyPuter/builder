// Clarifying-questions tool.
//
// When the user's request is too vague to build confidently, the model can call
// AskClarifyingQuestions with up to TWO short questions, each with a few concrete
// options. We render an interactive card in the chat, BLOCK the agentic loop
// inside exec() until the user answers (picks options, types a custom answer,
// skips, replies directly in the composer, or dismisses the card), then return
// the collected answers as the tool result so the model continues building with
// them in the same turn.
//
// Design notes:
// - At most 2 questions per round (enforced here even if the model sends more) so
//   the user is never flooded — see the system prompt for the model-side rule.
// - Only ONE clarification is ever live at a time: window._activeClarification
//   holds the current session's resolve hooks. sendChatMessage consults it to
//   route a "reply directly" send into the answer instead of starting a new turn;
//   resetChatUIForSwitch()/resetUIForAbort() tear it down on a chat switch/stop.
// - The card's question/option text is MODEL-authored, so every interpolation
//   goes through htmlEscape — same stored-XSS discipline as the todo list and
//   chat titles.

(function () {
    const chevronLeft = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';
    const chevronRight = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
    const arrowRight = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';
    const enterKey = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"/><path d="M20 4v7a4 4 0 0 1-4 4H4"/></svg>';
    const pencil = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
    const closeX = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    // Put the composer into "answer directly" mode while a card is open: re-enable
    // it (the turn left it disabled), swap the placeholder, and show a normal Send
    // button so a typed reply can be submitted. Doesn't steal focus from the card.
    function enableComposerForClarify() {
        $('.chat-input').removeClass('disabled');
        $('.chat-input-message').prop('disabled', false).attr('placeholder', 'Or reply directly…');
        // false => render the Send (not Pause) icon; it self-disables while empty.
        updateSendButtonState(false);
    }

    // Restore the mid-turn "processing" composer: the model keeps working (builds)
    // after the card resolves, so re-disable input and show the Pause control.
    function restoreProcessingComposer() {
        $('.chat-input').addClass('disabled');
        $('.chat-input-message').prop('disabled', true).attr('placeholder', 'Reply to Puter...');
        updateSendButtonState(true);
    }

    // ---- Static summary (shown after the card resolves AND on chat reload) ------
    // `data` is exactly the shape persisted in the tool_result (see buildResult):
    //   { items:[{question, answer, skipped}], directReply, dismissed }
    // Pure render from that object — no interactive state — so a reloaded chat can
    // reconstruct the recap without replaying the card. Returns the jQuery node.
    function renderClarifySummary(data, { append = true } = {}) {
        const items = Array.isArray(data && data.items) ? data.items : [];
        const directReply = data && data.directReply;
        const dismissed = !!(data && data.dismissed);

        let inner = '<div class="clarify-summary-inner">';
        if (dismissed && !items.some(it => !it.skipped) && !directReply) {
            inner += `<div class="clarify-summary-title">Skipped the questions — building with sensible defaults.</div>`;
        } else {
            inner += `<div class="clarify-summary-title">Got it — building with:</div>`;
            inner += '<ul>';
            for (const it of items) {
                if (it.skipped) continue;
                inner += `<li><span class="clarify-summary-q">${htmlEscape(it.question)}</span><span class="clarify-summary-a">${htmlEscape(String(it.answer ?? ''))}</span></li>`;
            }
            if (directReply) {
                inner += `<li class="clarify-summary-direct"><span class="clarify-summary-q">Your reply</span><span class="clarify-summary-a">${htmlEscape(String(directReply))}</span></li>`;
            }
            inner += '</ul>';
        }
        inner += '</div>';

        const html = `<div class="clarify-summary message ai-message"><div class="message-content">${inner}</div></div>`;
        const $node = $(html);
        if (append) {
            const $chatBox = $('.chat-box');
            const floatingSpinner = $chatBox.find('.floating-spinner').detach();
            $chatBox.append($node);
            if (floatingSpinner.length) $node.after(floatingSpinner);
            if (window.shouldAutoScroll) $chatBox.scrollTop($chatBox[0].scrollHeight);
        }
        return $node;
    }
    window.renderClarifySummary = renderClarifySummary;

    // ---- The interactive card ---------------------------------------------------
    // Renders the card, wires keyboard + click handling, and returns a Promise that
    // resolves with the persisted result once the user finishes (answers / direct
    // reply / dismiss) or the turn is aborted.
    function runClarification(questions, context) {
        return new Promise((resolve) => {
            // One question visible at a time. answers[i] is undefined until the user
            // resolves question i, then one of:
            //   { type:'option', value, optionIndex } | { type:'custom', value } | { type:'skip' }
            const answers = new Array(questions.length).fill(undefined);
            let qIndex = 0;
            let activeOption = 0; // keyboard-highlighted option on the current question
            let customOpen = false; // is the "Something else" inline input showing?
            let settled = false;

            const $card = $(`<div class="clarify-card message ai-message" tabindex="-1"><div class="message-content"><div class="clarify-inner"></div></div></div>`);

            // ---- result builders ----
            function buildItems() {
                return questions.map((q, i) => {
                    const a = answers[i];
                    if (!a || a.type === 'skip') return { question: q.question, answer: null, skipped: true };
                    return { question: q.question, answer: a.value, skipped: false };
                });
            }
            function answeredCount() {
                return answers.filter(a => a && a.type !== 'skip').length;
            }

            // ---- teardown / settle ----
            // restoreUI: put the composer back into processing mode (the model is
            // about to build). summary: leave a static recap in the transcript.
            function settle(result, { restoreUI = true, summary = true } = {}) {
                if (settled) return;
                settled = true;
                $(document).off('keydown.clarify');
                try { context.abortController?.signal.removeEventListener('abort', onAbort); } catch (e) {}
                window._activeClarification = null;
                if (summary) {
                    renderClarifySummary(result, { append: false }).insertAfter($card);
                }
                $card.remove();
                if (restoreUI) restoreProcessingComposer();
                resolve(result);
            }

            function finishWithAnswers() {
                const items = buildItems();
                const anyAnswered = items.some(it => !it.skipped);
                const instruction = anyAnswered
                    ? 'The user answered your clarifying questions (see items). Proceed to build now based on these answers. For any skipped question, use your best judgment. Do NOT ask more clarifying questions for this request.'
                    : 'The user skipped the clarifying questions. Proceed now using sensible defaults and reasonable assumptions. Do NOT ask clarifying questions again for this request.';
                settle({ __clarify_result: true, dismissed: !anyAnswered, directReply: null, items, instruction });
            }

            function dismissAll() {
                const items = buildItems();
                const anyAnswered = items.some(it => !it.skipped);
                settle({
                    __clarify_result: true,
                    dismissed: !anyAnswered,
                    directReply: null,
                    items,
                    instruction: anyAnswered
                        ? 'The user closed the questions after partially answering (see items). Proceed to build now; for anything unanswered use sensible defaults. Do NOT ask more clarifying questions.'
                        : 'The user dismissed the clarifying questions without answering. Proceed now using sensible defaults and reasonable assumptions. Do NOT ask clarifying questions again for this request.',
                });
            }

            function submitDirectReply(text) {
                const items = buildItems();
                settle({
                    __clarify_result: true,
                    dismissed: false,
                    directReply: text,
                    items,
                    instruction: `Instead of (or in addition to) the options, the user replied directly: "${text}". Use this reply together with any answered items below, then proceed to build now. Do NOT ask more clarifying questions for this request.`,
                });
            }

            // Aborted turn (Stop button via terminateActiveTurn, or chat switch):
            // resolve so the awaiting loop unwinds, but don't touch the composer
            // (the abort/switch handler owns that) and leave no summary behind.
            function onAbort() {
                settle({ __clarify_result: true, dismissed: true, directReply: null, items: buildItems(), instruction: 'Cancelled.' }, { restoreUI: false, summary: false });
            }

            // ---- navigation ----
            function syncStateForQuestion() {
                const a = answers[qIndex];
                customOpen = !!(a && a.type === 'custom');
                if (a && a.type === 'option') activeOption = a.optionIndex;
                else if (activeOption >= questions[qIndex].options.length) activeOption = 0;
            }
            function goTo(i) {
                if (i < 0 || i >= questions.length) return;
                qIndex = i;
                activeOption = 0;
                syncStateForQuestion();
                render();
            }
            // Advance to the next still-unresolved question, or finish if none remain.
            function advance() {
                const next = answers.findIndex(a => a === undefined);
                if (next === -1) finishWithAnswers();
                else goTo(next);
            }

            // ---- answer actions ----
            function chooseOption(optIndex) {
                const q = questions[qIndex];
                if (optIndex < 0 || optIndex >= q.options.length) return;
                answers[qIndex] = { type: 'option', value: q.options[optIndex], optionIndex: optIndex };
                advance();
            }
            function chooseCustom(text) {
                const v = (text || '').trim();
                if (!v) return;
                answers[qIndex] = { type: 'custom', value: v };
                advance();
            }
            function skipQuestion() {
                answers[qIndex] = { type: 'skip' };
                advance();
            }

            // ---- render ----
            function render() {
                const q = questions[qIndex];
                const total = questions.length;
                const opts = q.options;

                let h = '';
                h += '<div class="clarify-header">';
                h += `<div class="clarify-question">${htmlEscape(q.question)}</div>`;
                h += '<div class="clarify-nav">';
                if (total > 1) {
                    h += `<button class="clarify-prev" title="Previous"${qIndex === 0 ? ' disabled' : ''}>${chevronLeft}</button>`;
                    h += `<span class="clarify-count">${qIndex + 1} of ${total}</span>`;
                    h += `<button class="clarify-next" title="Next"${qIndex === total - 1 ? ' disabled' : ''}>${chevronRight}</button>`;
                }
                h += `<button class="clarify-close" title="Skip these questions">${closeX}</button>`;
                h += '</div></div>';

                // Whether picking an answer here finishes (no other question left
                // unresolved) or advances to the next one — drives the active row's
                // hint icon (↵ submit vs → next), mirroring the reference design.
                const finishesOnAnswer = !answers.some((a, idx) => idx !== qIndex && a === undefined);
                const actionHint = finishesOnAnswer ? enterKey : arrowRight;

                h += '<div class="clarify-options">';
                opts.forEach((opt, i) => {
                    const isActive = i === activeOption && !customOpen;
                    const chosen = answers[qIndex] && answers[qIndex].type === 'option' && answers[qIndex].optionIndex === i;
                    h += `<button class="clarify-option${isActive ? ' active' : ''}${chosen ? ' chosen' : ''}" data-index="${i}">`;
                    h += `<span class="clarify-num">${i + 1}</span>`;
                    h += `<span class="clarify-label">${htmlEscape(opt)}</span>`;
                    h += `<span class="clarify-hint">${isActive ? actionHint : ''}</span>`;
                    h += '</button>';
                });

                // "Something else" custom row (or its inline input) + Skip.
                h += '<div class="clarify-custom-row">';
                if (customOpen) {
                    const prefill = answers[qIndex] && answers[qIndex].type === 'custom' ? htmlEscape(answers[qIndex].value) : '';
                    h += `<span class="clarify-custom-icon">${pencil}</span>`;
                    h += `<input class="clarify-custom-input" type="text" placeholder="Type your answer…" value="${prefill}">`;
                    h += `<button class="clarify-custom-ok" title="Use this answer">${enterKey}</button>`;
                } else {
                    h += `<button class="clarify-custom"><span class="clarify-custom-icon">${pencil}</span><span>Something else</span></button>`;
                }
                h += `<button class="clarify-skip">Skip</button>`;
                h += '</div>';

                h += '</div>'; // .clarify-options

                $card.find('.clarify-inner').html(h);
                if (customOpen) {
                    const $inp = $card.find('.clarify-custom-input');
                    $inp.focus();
                    const el = $inp[0];
                    if (el) el.setSelectionRange(el.value.length, el.value.length);
                } else {
                    // Keep keyboard focus on the card so arrow/number/Enter work
                    // immediately (without stealing it from a composer the user
                    // clicked into).
                    if (!$.contains($card[0], document.activeElement) &&
                        !$(document.activeElement).hasClass('chat-input-message')) {
                        $card[0].focus({ preventScroll: true });
                    }
                }
            }

            // ---- events (delegated on the persistent $card) ----
            $card.on('click', '.clarify-option', function () {
                chooseOption(parseInt($(this).attr('data-index'), 10));
            });
            $card.on('click', '.clarify-prev', () => goTo(qIndex - 1));
            $card.on('click', '.clarify-next', () => goTo(qIndex + 1));
            $card.on('click', '.clarify-close', dismissAll);
            $card.on('click', '.clarify-skip', skipQuestion);
            $card.on('click', '.clarify-custom', () => { customOpen = true; render(); });
            $card.on('click', '.clarify-custom-ok', () => chooseCustom($card.find('.clarify-custom-input').val()));
            $card.on('keydown', '.clarify-custom-input', function (e) {
                // The Enter that commits an IME composition is not an answer.
                if (window.isComposingKeyEvent(e)) { e.stopPropagation(); return; }
                if (e.which === 13) { e.preventDefault(); chooseCustom($(this).val()); }
                else if (e.which === 27) { e.preventDefault(); customOpen = false; render(); }
                e.stopPropagation();
            });

            // Document-level keyboard navigation. Ignored while the user is typing
            // in the composer or the custom input (so those keep normal behavior).
            $(document).on('keydown.clarify', function (e) {
                const t = e.target;
                if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
                // Enter aimed at a focused button or link must activate THAT
                // control. The card's options, Skip, the ×, and Previous/Next
                // are all buttons a keyboard user reaches with Tab; handling
                // Enter here picked the arrow-highlighted option instead of the
                // focused one (and preventDefault cancelled the native click,
                // so Tab-to-Skip + Enter answered the question). Same rule the
                // delete dialog's Enter handler follows (confirmByTyping).
                if (e.key === 'Enter' && t && (t.tagName === 'BUTTON' || t.tagName === 'A')) return;
                const opts = questions[qIndex].options;
                if (e.key === 'ArrowDown') { e.preventDefault(); customOpen = false; activeOption = (activeOption + 1) % opts.length; render(); }
                else if (e.key === 'ArrowUp') { e.preventDefault(); customOpen = false; activeOption = (activeOption - 1 + opts.length) % opts.length; render(); }
                else if (e.key === 'ArrowRight') { e.preventDefault(); goTo(qIndex + 1); }
                else if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(qIndex - 1); }
                else if (e.key === 'Enter') { e.preventDefault(); if (!customOpen) chooseOption(activeOption); }
                else if (e.key === 'Escape') { e.preventDefault(); dismissAll(); }
                else if (/^[1-9]$/.test(e.key)) {
                    const n = parseInt(e.key, 10) - 1;
                    if (n < opts.length) { e.preventDefault(); chooseOption(n); }
                }
            });

            // Expose the resolve hooks so the composer ("reply directly") and the
            // chat-switch/abort teardown can drive this session.
            window._activeClarification = { submitDirectReply, dismiss: dismissAll, teardown: onAbort };
            context.abortController?.signal.addEventListener('abort', onAbort, { once: true });

            // If the turn was already aborted before we got here, bail immediately.
            if (isAborted(context.abortController) || isStaleTurn(context)) { onAbort(); return; }

            // Mount: drop the thinking-dots spinner (the card is now the call to
            // action), append the card, switch the composer to reply-directly mode.
            $('.floating-spinner').remove();
            const $chatBox = $('.chat-box');
            $chatBox.append($card);
            syncStateForQuestion();
            render();
            // Scroll AFTER render() has injected the question/options into
            // .clarify-inner: scrolling against the freshly-appended (still empty)
            // card shell would target a height that excludes the card's content
            // and leave the populated, much taller card below the fold.
            if (window.shouldAutoScroll) $chatBox.scrollTop($chatBox[0].scrollHeight);
            enableComposerForClarify();
        });
    }

    window.tools.push({
        type: "function",
        function: {
            name: "AskClarifyingQuestions",
            description: "Ask the user 1-3 short multiple-choice questions to improve the request. Always send a short, friendly one-line lead-in as a normal text message in the same turn as this call. The call blocks until the user responds; their answers come back as the tool result for you to build from — never ask the same things again.",
            parameters: {
                type: "object",
                properties: {
                    questions: {
                        type: "array",
                        description: "1 to 3 questions. NEVER more than 3 — keep it light so the user isn't overwhelmed; prefer just 1-2. Order them by importance.",
                        items: {
                            type: "object",
                            properties: {
                                question: {
                                    type: "string",
                                    description: "A short, friendly, plain-language question (e.g. \"What kind of site is it?\"). No technical jargon."
                                },
                                options: {
                                    type: "array",
                                    description: "2 to 4 short, concrete answer options (1-4 words each, e.g. \"Personal / portfolio\"). The user can also type their own answer or skip, so you do not need an \"other\" option.",
                                    items: { type: "string" }
                                }
                            },
                            required: ["question", "options"],
                            additionalProperties: false
                        }
                    }
                },
                required: ["questions"],
                additionalProperties: false
            },
            strict: true
        },
        exec: async function (args, context) {
            // Defensive normalization — the schema can't hard-cap array sizes, and
            // we must never overwhelm the user. Keep at most 3 questions (matching
            // the system-prompt limit), each with at most 4 options, dropping
            // anything malformed.
            let questions = Array.isArray(args && args.questions) ? args.questions : [];
            questions = questions
                .filter(q => q && typeof q.question === 'string' && q.question.trim() && Array.isArray(q.options))
                .slice(0, 3)
                .map(q => ({
                    question: q.question.trim(),
                    options: q.options.filter(o => typeof o === 'string' && o.trim()).map(o => o.trim()).slice(0, 4),
                }))
                .filter(q => q.options.length > 0);

            if (questions.length === 0) {
                return {
                    __clarify_result: true,
                    error: 'No valid questions were provided.',
                    instruction: 'The clarifying-questions call had no usable questions. Do not retry it — proceed to build using sensible defaults.',
                };
            }

            // Block here until the user resolves the card. The result is returned
            // as the tool_result, so the agentic loop continues and the model
            // builds with these answers in the same turn.
            return await runClarification(questions, context || {});
        }
    });
})();
