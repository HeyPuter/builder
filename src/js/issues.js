// issues.js — per-project issues: a lightweight punch list the user fills with
// bugs/tweaks/ideas while trying their app, then sends to the AI to fix.
//
// UI: an "Issues" toolbar button (with an open-count badge) opens a popover
// panel — quick-add input, open list, collapsible resolved list, and a
// per-issue "Send to AI" action. Sending builds one plain user message (see
// IssuesCore.formatForAI) and hands it to sendChatMessage, exactly like the
// preview error-reporter does, so the user sees precisely what the model
// receives. (The review card's "Send back to AI" re-sends a reopened batch,
// so the message formatting stays batch-capable.)
//
// Storage: /<user>/AppData/<appID>/.issues/<chatId>.json — a dot-prefixed
// sibling of the per-chat app dirs, same convention as .versions/.published,
// so it is never served by hosting, never in the project download, and never
// visible to the AI's readdir (which is scoped to the app dir).
//
// Persistence follows versions.js: an in-memory per-chat cache paints the UI
// instantly and optimistically; every mutation is also queued on a single
// promise chain that re-reads the stored doc, re-applies the operation
// (operations are deterministic — ids/timestamps are minted once, up front),
// and writes — so overlapping mutations can never lost-update the file, and a
// stale cache can never clobber stored issues. All logic lives in
// issues-core.js (pure, tested); this file is only wiring, DOM, and FS.

(function () {
    'use strict';

    const Core = window.IssuesCore;

    // ----- icons (stroke: currentColor so they follow the toolbar/theme) -----

    window.issues_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>';
    const PLUS_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    const SEND_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';
    const CHECK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2.5 8.5 6 12 13.5 4"/></svg>';
    const REOPEN_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
    // SVG (not a "›" text glyph) so it centers exactly against the label —
    // glyph ink sits off its box center and drifts by font.
    const CHEVRON_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';

    // ----- paths / storage ----------------------------------------------------

    function issuesRoot() {
        return `/${window.user.username}/AppData/${puter.appID}/.issues`;
    }

    function issuesPathForChat(chatId) {
        return issuesRoot() + `/${chatId}.json`;
    }

    // In-memory cache of the last known-good doc per chat. Same contract as the
    // versions index cache: it lets the panel/badge paint instantly, and it is
    // kept authoritative because every successful read and every queued write
    // updates it. It is never the base of a write (writes re-read the file), so
    // a wrong cache can only mis-render, never destroy data.
    const docCache = new Map();

    // Mutations queued but not yet persisted, per chat. While one is pending, a
    // background reconcile read must not overwrite the (newer) optimistic cache
    // with the (older) stored state — the queue itself re-caches when it lands.
    const pendingOps = new Map();
    function pendingCount(chatId) { return pendingOps.get(chatId) || 0; }
    function bumpPending(chatId, delta) {
        const next = pendingCount(chatId) + delta;
        if (next > 0) pendingOps.set(chatId, next);
        else pendingOps.delete(chatId);
    }
    // Monotonic per-chat mutation counter. A reconcile read snapshots it before
    // reading and refuses to cache if it moved — that closes the window where a
    // slow read (issued before a mutation, resolving after its write completed,
    // so pendingCount is back to 0) would clobber the newer cache.
    const mutationEpoch = new Map();
    function epoch(chatId) { return mutationEpoch.get(chatId) || 0; }

    // Chats whose cache holds the empty fallback pinned after a FAILED read
    // (panel opened while offline). The pin keeps the panel usable, but it must
    // not masquerade as truth: the badge path keeps re-reading these until a
    // genuine read (or a queued write's authoritative doc) replaces the pin —
    // otherwise one offline moment would zero the badge for the whole session.
    const pinnedFallback = new Set();

    // Bounded retry for the chain's FS ops: one transient blip (flaky mobile
    // network, brief API hiccup) shouldn't cost the user their punch list.
    // Two waits max (300ms/900ms) so the serialized chain can't back up badly.
    async function withRetries(fn) {
        let lastErr;
        for (let attempt = 0; attempt < 3; attempt++) {
            if (attempt > 0) await new Promise(r => setTimeout(r, attempt === 1 ? 300 : 900));
            try {
                return await fn();
            } catch (e) { lastErr = e; }
        }
        throw lastErr;
    }

    // UI refresh on behalf of a data change must never throw into its caller:
    // inside the mutation chain a render bug would surface as a bogus
    // "couldn't save" toast; on the optimistic path it would break the click
    // handler that triggered it.
    function safeRefreshUI(chatId) {
        try {
            updateBadgeFromCache();
            renderPanelIfOpenFor(chatId);
        } catch (e) {
            console.warn('issues: UI refresh failed:', e);
        }
    }

    // Read the stored doc, normalized. Missing file = a project with no issues
    // yet (returns an empty doc). A corrupt file also returns an empty doc — the
    // next write resets it cleanly. Any OTHER failure (network/permission)
    // THROWS: the caller must not treat unknown state as empty, and above all
    // must never write over it.
    async function readDocRemote(chatId) {
        let txt;
        try {
            txt = await puter.fs.read(issuesPathForChat(chatId)).then(d => d.text());
        } catch (e) {
            if (typeof isNotFoundError === 'function' && isNotFoundError(e)) return Core.emptyDoc();
            throw e;
        }
        try {
            return Core.normalizeDoc(JSON.parse(txt));
        } catch (e) {
            // Corrupt (e.g. interrupted write). The next write will reset the
            // file, losing whatever it held — so park a best-effort backup copy
            // first. Idempotent (overwrite) and fire-and-forget: recovery must
            // never block or fail the read path.
            try {
                puter.fs.copy(issuesPathForChat(chatId), issuesRoot(), { newName: `${chatId}.corrupt.json`, overwrite: true })
                    .catch(() => { /* best effort */ });
            } catch (err) { /* best effort */ }
            return Core.emptyDoc();
        }
    }

    // Background read that reconciles the cache/badge/panel with storage. Only
    // genuine reads are cached (missing-file counts as genuine); a transient
    // read error can't make a chat with real issues render as none. Skips the
    // cache/render entirely while a mutation is in flight for this chat — the
    // stored state is older than the optimistic cache in that window.
    async function readDocReconcile(chatId) {
        const epochAtRead = epoch(chatId);
        let doc;
        try {
            doc = await readDocRemote(chatId);
        } catch (e) {
            return Core.emptyDoc();
        }
        if (!pendingCount(chatId) && epoch(chatId) === epochAtRead) {
            const prev = docCache.get(chatId);
            const changed = !prev || Core.signature(prev) !== Core.signature(doc);
            docCache.set(chatId, doc);
            pinnedFallback.delete(chatId); // a genuine read replaces any offline pin
            if (chatId === currentChatId) {
                try {
                    updateBadgeFromCache();
                    if (changed) renderPanelIfOpenFor(chatId);
                } catch (e) {
                    console.warn('issues: UI refresh failed:', e);
                }
            }
        }
        return doc;
    }

    // Serialize all writes through one promise chain (the versions.js pattern):
    // each queued task re-reads the file, re-applies its operation, and writes,
    // so overlapping mutations can't lost-update each other. `.catch(() => {})`
    // before each `.then` so one failure never poisons the queue.
    let mutationChain = Promise.resolve();
    // Chats deleted this session. A mutation for one (the "Issue deleted"
    // toast's Undo landing after the project itself was deleted) must be a
    // no-op: with the cache gone it probed an empty doc, read not-found, and
    // wrote the restored issue into a fresh .issues/<gone chat>.json —
    // resurrecting a file deleteChat had just removed.
    const deletedChats = new Set();

    // Apply `op` (a pure doc → {ok, doc} function from IssuesCore, with any
    // ids/timestamps already bound) optimistically to the cache for an instant
    // render, then queue the authoritative read-modify-write. Returns the
    // optimistic result so callers can surface validation errors ('limit',
    // 'too_long', …) immediately.
    function mutate(chatId, op) {
        if (deletedChats.has(chatId)) return { ok: false, error: 'deleted' };
        let optimistic = { ok: true };
        const cached = docCache.get(chatId);
        if (cached) {
            // A throwing op (core bug, corrupted cache shape) must not escape
            // into the click handler that called us — fail the action instead.
            try {
                optimistic = op(cached);
            } catch (e) {
                console.warn('issues: mutation failed on cached doc:', e);
                return { ok: false, error: 'internal' };
            }
            if (!optimistic.ok) return optimistic; // invalid — nothing to queue
            docCache.set(chatId, optimistic.doc);
            if (chatId === currentChatId) safeRefreshUI(chatId);
        } else {
            // No cache yet (first half-second after opening a never-seen chat).
            // Probe against an empty doc so validation errors ('empty',
            // 'too_long') still surface; 'not_found' just means the doc hasn't
            // loaded — let the queued application decide.
            let probe;
            try {
                probe = op(Core.emptyDoc());
            } catch (e) {
                console.warn('issues: mutation failed on empty doc:', e);
                return { ok: false, error: 'internal' };
            }
            if (!probe.ok && probe.error !== 'not_found') return probe;
        }
        mutationEpoch.set(chatId, epoch(chatId) + 1);
        bumpPending(chatId, 1);
        mutationChain = mutationChain.catch(() => {}).then(async () => {
            // Retried: transient read/write failures self-heal instead of
            // dropping the op; a still-failing op falls to the toast below.
            const fresh = await withRetries(() => readDocRemote(chatId));
            let res;
            try {
                res = op(fresh);
            } catch (e) {
                console.warn('issues: mutation failed on stored doc:', e);
                res = { ok: false };
            }
            // Only the LAST pending op for this chat may re-cache/re-render:
            // earlier ops carry a doc that predates the later optimistic edits,
            // and re-caching it would make a just-typed issue flicker away until
            // the next write lands. (pendingCount includes this op — decremented
            // in the .finally — so "last" means <= 1.)
            const last = pendingCount(chatId) <= 1;
            if (!res.ok) {
                // The op no longer applies (e.g. the issue was deleted in
                // another tab). The optimistic cache is now ahead of reality —
                // re-sync it to the stored state so the phantom change doesn't
                // linger on screen indefinitely.
                if (last) {
                    docCache.set(chatId, fresh);
                    pinnedFallback.delete(chatId);
                    if (chatId === currentChatId) safeRefreshUI(chatId);
                }
                return;
            }
            await withRetries(() => puter.fs.write(issuesPathForChat(chatId), JSON.stringify(res.doc), { createMissingParents: true }));
            if (last) {
                docCache.set(chatId, res.doc);
                pinnedFallback.delete(chatId);
                if (chatId === currentChatId) safeRefreshUI(chatId);
            }
        }).catch(e => {
            // The optimistic UI already shows the change; the write didn't land.
            // Surface it (throttled) so silent data loss isn't possible.
            console.warn('issues: persist failed:', e);
            window.showToast?.("Couldn't save your issues — recent changes may be lost after a reload.",
                { type: 'warning', key: 'issues-save-failed', throttleMs: 15000 });
        }).finally(() => {
            bumpPending(chatId, -1);
        });
        return optimistic;
    }

    // Remove the stored issues for a chat (called from deleteChat in app.js,
    // alongside deleteChatVersions). Lets in-flight writes drain first so a
    // queued save can't resurrect the file after the delete.
    window.deleteChatIssues = async function (chatId) {
        if (!chatId || !window.user) return;
        deletedChats.add(chatId);
        docCache.delete(chatId);
        pinnedFallback.delete(chatId);
        draftByChat.delete(chatId);
        if (cardState && cardState.chatId === chatId) cardState = null;
        if (cardDismissedFor === chatId) cardDismissedFor = null;
        try { await mutationChain; } catch (e) { /* ignore */ }
        try {
            await puter.fs.delete(issuesPathForChat(chatId));
        } catch (e) { /* not found / best effort */ }
        try {
            await puter.fs.delete(issuesRoot() + `/${chatId}.corrupt.json`);
        } catch (e) { /* usually doesn't exist */ }
    };

    // ----- toolbar badge -------------------------------------------------------

    // Sync every passive indicator with the current chat's cached doc: the
    // toolbar badge (when the preview toolbar exists) and the in-chat review
    // card. Called after every cache change, so the surfaces can't drift.
    function updateBadgeFromCache() {
        const doc = currentChatId ? docCache.get(currentChatId) : null;
        const open = doc ? Core.openIssues(doc).length : 0;
        const review = doc ? Core.reviewIssues(doc).length : 0;
        const count = open + review;
        const $btn = $('.preview-issues');
        if ($btn.length) {
            const $badge = $btn.find('.issues-count-badge');
            if (count > 0) {
                $badge.text(count > 99 ? '99+' : String(count)).prop('hidden', false);
                // Everything left is merely awaiting the user's check → the badge
                // goes green: "the AI is waiting on you", not "work outstanding".
                $badge.toggleClass('review-only', open === 0);
                const parts = [];
                if (open) parts.push(`${open} open`);
                if (review) parts.push(`${review} to review`);
                $btn.attr('title', `Issues — ${parts.join(', ')}`);
            } else {
                $badge.prop('hidden', true).removeClass('review-only');
                $btn.attr('title', 'Issues');
            }
        }
        refreshIssueReviewCard();
    }

    // Called by showAppPreview whenever the preview pane is (re)shown, so the
    // badge always reflects the chat the preview belongs to. First time we see
    // this chat in the session — or while the cache still holds an offline
    // fallback pin — fetch the doc in the background; the reconcile read
    // refreshes the badge when it lands. Must never throw: a failure here
    // would break showAppPreview itself.
    window.updateIssuesBadge = function () {
        try {
            if (!window.FEATURE_FLAGS.issues) return;
            updateBadgeFromCache();
            if (currentChatId && window.user
                && (!docCache.has(currentChatId) || pinnedFallback.has(currentChatId))) {
                readDocReconcile(currentChatId);
            }
        } catch (e) {
            console.warn('issues: badge refresh failed:', e);
        }
    };

    // Needs-attention count (open + awaiting review) for the current chat,
    // from cache only (no FS) — safe to call synchronously and never throws
    // (the overflow menu must render even if this misbehaves). Used by the
    // mobile overflow menu, where the toolbar button (and badge) is collapsed.
    window.getOpenIssuesCount = function () {
        try {
            const doc = currentChatId ? docCache.get(currentChatId) : null;
            return doc ? Core.openIssues(doc).length + Core.reviewIssues(doc).length : 0;
        } catch (e) {
            return 0;
        }
    };

    // True while the in-chat review card is on screen asking about AI fixes.
    // app.js consults this so the end-of-turn "what next?" chips never compete
    // with an open question the user owes an answer. Never throws — it runs on
    // the end-of-turn path.
    window.isIssueReviewPromptShowing = function () {
        try {
            return $('.chat-box .issue-review-card').length > 0;
        } catch (e) {
            return false;
        }
    };

    // Return focus to whatever control opens the panel: the toolbar button on
    // desktop, or the overflow ("…") button on mobile where the toolbar button
    // is display:none (focusing a hidden element silently no-ops).
    function focusIssuesTrigger() {
        const $btn = $('.preview-issues');
        if ($btn.is(':visible')) $btn.trigger('focus');
        else $('.preview-overflow').trigger('focus');
    }

    // ----- in-chat review card -------------------------------------------------
    // "Did the fixes work?" — asked IN the chat when a turn that was fixing
    // issues ends, because that's where the user is looking at that moment.
    // Modeled on the clarifying-questions card (message ai-message shell, all
    // text htmlEscaped, appended to .chat-box). Ephemeral by design: it renders
    // from the issues doc, so it reappears after a reload for as long as items
    // are still awaiting review, and it never touches chatHistory.

    function removeIssueReviewCard() {
        cancelCardAutoDismiss();
        cardHovered = false; // a removed card never fires mouseleave
        $('.chat-box .issue-review-card').remove();
        cardSig = null;
    }

    function cardRowHtml(issue) {
        return `<div class="irc-item" data-issue-id="${htmlEscape(issue.id)}">` +
            `<div class="irc-text">${htmlEscape(issue.text)}</div>` +
            '<div class="irc-actions">' +
                `<button class="irc-fixed">${CHECK_ICON}<span>Fixed</span></button>` +
                `<button class="irc-broken">${REOPEN_ICON}<span>Not fixed</span></button>` +
            '</div>' +
        '</div>';
    }

    // Mount (or update) the singleton card at the end of the chat. Skips the
    // DOM swap when the content wouldn't change, so unrelated cache updates
    // don't churn the card under the user's pointer — but always keeps the
    // card LAST in the transcript: a resume banner, error card, or restore
    // note appended after it would otherwise strand it mid-history.
    function mountReviewCard(sig, innerHtml) {
        const $box = $('.chat-box');
        if (!$box.length) return;
        let $card = $box.find('.issue-review-card');
        const isNew = !$card.length;
        if (isNew) {
            $card = $('<div class="issue-review-card message ai-message"><div class="message-content"><div class="irc-inner"></div></div></div>');
        }
        if (isNew || cardSig !== sig) {
            $card.find('.irc-inner').html(innerHtml);
            // A card mid-fade being replaced by different content (a new
            // round's question) must come back to full opacity.
            $card.removeClass('irc-leaving');
            cardSig = sig;
        }
        if (isNew || $card.next().length) $box.append($card); // append moves an existing node
        if (isNew && window.shouldAutoScroll) {
            const box = $box[0];
            if (box) box.scrollTop = box.scrollHeight;
        }
    }

    // Central sync: derive the card from the current chat's cached doc. Called
    // from updateBadgeFromCache (every cache change) and refreshIssuesSendState
    // (turn start/end), so it also removes the card the moment a turn starts.
    // Never throws — it sits on the turn start/end path (updateSendButtonState)
    // where an exception would wedge the composer.
    function refreshIssueReviewCard() {
        try {
            refreshIssueReviewCardInner();
        } catch (e) {
            console.warn('issues: review card refresh failed:', e);
        }
    }

    function refreshIssueReviewCardInner() {
        if (!window.FEATURE_FLAGS.issues) { removeIssueReviewCard(); return; }
        if (cardState && cardState.chatId !== currentChatId) cardState = null;
        if (cardDismissedFor && cardDismissedFor !== currentChatId) cardDismissedFor = null;
        // Never show the question while a turn is streaming into the chat, and
        // END the round when one starts: a new conversation turn supersedes the
        // card, and a terminal summary resurrected from stale counts after some
        // LATER turn would claim work from a bygone round (its "Send back to
        // AI" ids included). Undecided review items survive in the doc, so the
        // question re-derives cleanly when the turn ends. A version restore
        // (window._restoringVersion) deliberately does NOT tear the card down —
        // it doesn't stream into the chat, and wiping the card mid-decision
        // because a restore is running would eat the user's round.
        const turnActive = (typeof isProcessing !== 'undefined' && isProcessing) || window._activeClarification;
        if (turnActive) {
            removeIssueReviewCard();
            cardState = null;
            return;
        }
        const doc = currentChatId ? docCache.get(currentChatId) : null;
        const review = doc ? Core.reviewIssues(doc) : [];

        if (!review.length) {
            // Everything decided. If the user decided any of it THROUGH the
            // card, close with a summary (and a send-back for reopens);
            // otherwise (panel-confirmed, or nothing pending) just go away.
            if (cardState && (cardState.confirmedCount || cardState.reopenedIds.length)) {
                const reopened = cardState.reopenedIds.length;
                let inner = '<div class="irc-terminal">';
                if (reopened > 0) {
                    inner += `<span class="irc-terminal-text">${reopened === 1 ? '1 issue reopened.' : `${reopened} issues reopened.`}</span>` +
                        `<button class="irc-send-back">${SEND_ICON}<span>Send back to AI</span></button>`;
                } else {
                    inner += `<span class="irc-terminal-text irc-terminal-ok">${CHECK_ICON}${cardState.confirmedCount === 1 ? 'Fix confirmed.' : 'All fixes confirmed.'}</span>`;
                }
                inner += `<button class="irc-dismiss" title="Dismiss">${window.cross_svg}</button></div>`;
                const sig = 'terminal:' + cardState.confirmedCount + ':' + reopened;
                mountReviewCard(sig, inner);
                // Only the pure acknowledgment auto-hides. Re-arm only for a
                // NEW signature — background cache refreshes re-derive the
                // same card and must not keep pushing the fade out — and not
                // while hovered (mouseleave re-arms).
                if (reopened === 0 && !cardHovered && (!cardAutoDismiss || cardAutoDismiss.sig !== sig)) {
                    armCardAutoDismiss(sig);
                }
            } else {
                removeIssueReviewCard();
                cardState = null;
                // The question is gone (e.g. everything confirmed through the
                // panel) — paint any "what next?" chips whose render it was
                // holding back. No-op when nothing was deferred.
                window.renderDeferredSuggestions?.();
            }
            return;
        }

        if (cardDismissedFor === currentChatId) return; // "later" — the panel still shows them
        if (!cardState) cardState = { chatId: currentChatId, confirmedCount: 0, reopenedIds: [] };

        let inner = '<div class="irc-header">' +
            '<div class="irc-title">Did the fixes work?</div>' +
            `<button class="irc-dismiss" title="Review later">${window.cross_svg}</button>` +
        '</div>' +
        '<div class="irc-sub">Check the preview, then confirm each one.</div>' +
        '<div class="irc-list">';
        review.forEach(i => { inner += cardRowHtml(i); }); // same order as the sent message
        inner += '</div>';
        if (review.length > 1) {
            inner += `<div class="irc-footer"><button class="irc-all-fixed">${CHECK_ICON}<span>All fixed</span></button></div>`;
        }
        // The question outranks the "what next?" chips — drop any already on
        // screen (after a reload, loadChat restores chips before this card
        // re-derives from the async doc read). New chips are cached but not
        // painted while the card shows (see renderContinueSuggestions in
        // app.js), and repainted via renderDeferredSuggestions the moment the
        // card leaves the chat.
        $('.chat-suggestions').remove();
        mountReviewCard('list:' + review.map(i => i.id).join(','), inner);
    }

    // ----- panel state ---------------------------------------------------------

    // Open/closed intent tracked synchronously (the authoritative read is async,
    // so DOM presence can't decide open-vs-close in the toggle handler).
    let panelOpen = false;
    // The chat the open panel belongs to. Every panel action mutates THIS chat,
    // never the live currentChatId: loadChat reassigns currentChatId before it
    // closes lingering panels, so reading the global at action/commit time could
    // write the old panel's data into the newly-opened chat's issues file.
    let panelChatId = null;
    // Issue id currently being edited inline, if any (and the chat it belongs
    // to, captured when the edit began — see panelChatId above). While set,
    // list re-renders are deferred (they would destroy the editor
    // mid-keystroke) and flushed when the edit finishes.
    let editingId = null;
    let editingChatId = null;
    let renderPending = false;
    // Guards finishEdit against the focusout that its own DOM teardown fires.
    let finishingEdit = false;
    // Newest-added issue id — its row gets a one-shot enter animation.
    let justAddedId = null;
    // The Resolved section starts collapsed; sticky for the session.
    let resolvedCollapsed = true;
    // First-run intro showing instead of the add input (see renderList): set
    // once the user proceeds, reset when the panel closes so a still-empty
    // list gets the explanation again on the next open.
    let introDismissed = false;
    // Unsubmitted add-input text, per chat. Closing the panel is navigation,
    // not a decision to discard what was typed — the draft is restored on the
    // next open (in-memory only; a reload starts clean).
    const draftByChat = new Map();
    // The batch of issues the CURRENT AI turn is fixing: set when a send starts
    // the turn, cleared when app.js reports the turn finished (see
    // window.notifyIssuesTurnFinished below). While set, those rows show a live
    // "Fixing…" chip instead of "Sent". At most one batch can exist — sends are
    // blocked while a turn is running.
    let activeFix = null; // { chatId, ids: Set<string> }

    function isBeingFixed(issue) {
        return !!(activeFix
            && activeFix.chatId === (panelChatId || currentChatId)
            && activeFix.ids.has(issue.id)
            && issue.sentAt); // an edit mid-fix clears sentAt — the new wording is a new ask
    }

    // ---- in-chat review card state (see refreshIssueReviewCard below) --------
    // The chat is where the user is looking when a turn ends, so that's where
    // the "did the fixes work?" question is asked — the panel's review group is
    // the pull surface, this card is the push surface; both drive the same doc.
    // cardState tracks what the user decided THROUGH the card this round, so a
    // closing summary ("2 reopened — send back?") can be offered when the last
    // pending item is decided. cardDismissedFor suppresses re-showing a card
    // the user closed with "later" (until a new batch or a chat switch).
    let cardState = null; // { chatId, confirmedCount, reopenedIds: [] }
    let cardSig = null;   // what the mounted card currently shows (skip no-op re-renders)
    let cardDismissedFor = null; // chatId whose pending card the user dismissed
    // Auto-dismiss for the success-only terminal summary ("All fixes
    // confirmed.") — pure acknowledgment, so it fades out on its own after a
    // few seconds. The reopened variant carries a "Send back" CTA and never
    // auto-hides. Armed per card signature; hovering pauses the countdown.
    const CARD_AUTO_DISMISS_MS = 2500;
    let cardAutoDismiss = null; // { sig, timer }
    let cardHovered = false;

    function cancelCardAutoDismiss() {
        if (cardAutoDismiss) {
            clearTimeout(cardAutoDismiss.timer);
            cardAutoDismiss = null;
        }
    }

    // Fade out, then dismiss exactly like the × does. Signature-guarded at
    // every step: if anything replaces or removes the card meanwhile (a new
    // round's question, a chat switch, a turn starting), the stale timer must
    // never touch the newer card.
    function armCardAutoDismiss(sig) {
        cancelCardAutoDismiss();
        const timer = setTimeout(() => {
            cardAutoDismiss = null;
            if (cardSig !== sig) return; // superseded since armed
            const $card = $('.chat-box .issue-review-card');
            if (!$card.length) return;
            $card.addClass('irc-leaving');
            setTimeout(() => {
                if (cardSig !== sig) return; // superseded mid-fade
                cardState = null;
                removeIssueReviewCard();
                // Same as the ×: the card no longer holds the floor — paint
                // any deferred "what next?" chips.
                window.renderDeferredSuggestions?.();
            }, 250);
        }, CARD_AUTO_DISMISS_MS);
        cardAutoDismiss = { sig, timer };
    }

    function isBusy() {
        return !!((typeof isProcessing !== 'undefined' && isProcessing)
            || window._restoringVersion
            || window._activeClarification);
    }

    // Same relative-time formatting as the versions panel (private there).
    function formatRelativeTime(iso) {
        if (!iso) return '';
        const then = new Date(iso).getTime();
        if (isNaN(then)) return '';
        const diff = Math.max(0, Date.now() - then);
        const sec = Math.round(diff / 1000);
        if (sec < 60) return 'just now';
        const min = Math.round(sec / 60);
        if (min < 60) return `${min} min ago`;
        const hr = Math.round(min / 60);
        if (hr < 24) return `${hr} hr ago`;
        const days = Math.round(hr / 24);
        if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
        try {
            return new Date(iso).toLocaleDateString();
        } catch (e) {
            return '';
        }
    }

    function autoResizeInput(el) {
        if (!el) return;
        el.style.height = 'auto';
        // scrollHeight excludes the border, but the border-box height must
        // include it — without the correction the box lands 2px short of its
        // own content, stays scrollable, and paints a phantom scrollbar.
        const border = el.offsetHeight - el.clientHeight;
        const target = el.scrollHeight + border;
        el.style.height = Math.min(target, 96) + 'px';
        // While the box can still grow there is never anything to scroll;
        // only the 96px cap introduces real overflow.
        el.style.overflowY = target > 96 ? 'auto' : 'hidden';
    }

    // ----- panel rendering -----------------------------------------------------

    function ensurePanelSkeleton() {
        let $panel = $('.preview-issues-panel');
        if ($panel.length) return $panel;
        $panel = $(
            '<div class="preview-issues-panel" role="dialog" aria-label="Issues" tabindex="-1">' +
                `<div class="issues-panel-header"><span>Issues</span><button class="issues-panel-close" title="Close">${window.cross_svg}</button></div>` +
                '<div class="issues-add-row">' +
                    `<textarea class="issues-add-input" rows="1" maxlength="${Core.MAX_TEXT_LENGTH}" placeholder="Describe a bug or tweak…" aria-label="New issue"></textarea>` +
                    `<button class="issues-add-btn" title="Add issue (Enter)" aria-label="Add issue" disabled>${PLUS_ICON}</button>` +
                '</div>' +
                '<div class="issues-body"></div>' +
                '<div class="issues-footer" hidden>' +
                    '<div class="issues-busy-hint">Waiting for the current task to finish…</div>' +
                '</div>' +
            '</div>');
        $('.preview-pane').append($panel);
        return $panel;
    }

    // One issue row. Everything user-authored is escaped; ids are constrained to
    // a safe charset by IssuesCore.normalizeDoc, so they're also usable in
    // attribute selectors.
    function issueRowHtml(issue) {
        const resolved = issue.status === 'resolved';
        const inReview = issue.status === 'review';
        const time = formatRelativeTime(issue.createdAt);
        // Lifecycle chip: open issues show where they are with the AI ("Fixing…"
        // while their turn runs, "Sent" if a turn was stopped before finishing);
        // resolved issues distinguish a confirmed AI fix from a manual
        // check-off. Review rows carry no chip — their pinned group says it.
        let sentChip = '';
        if (issue.status === 'open') {
            if (isBeingFixed(issue)) sentChip = '<span class="issue-fixing-chip"><span class="issue-fixing-dot"></span>Fixing…</span>';
            else if (issue.sentAt) sentChip = '<span class="issue-sent-chip">Sent</span>';
        } else if (resolved && issue.resolvedBy === 'ai') {
            sentChip = '<span class="issue-fixed-chip">Fixed by AI</span>';
        }
        // The circle is the row's primary action: check off (open), confirm the
        // AI's fix (review), or reopen (resolved).
        const toggleTitle = resolved ? 'Reopen' : (inReview ? 'Confirm fixed' : 'Mark as resolved');
        const toggleAria = resolved ? 'Reopen issue' : (inReview ? 'Confirm this issue is fixed' : 'Mark issue as resolved');
        return `<div class="issue-item${resolved ? ' resolved' : ''}${inReview ? ' review' : ''}" data-issue-id="${htmlEscape(issue.id)}">` +
            `<button class="issue-toggle" role="checkbox" aria-checked="${resolved}" title="${toggleTitle}" aria-label="${toggleAria}">${CHECK_ICON}</button>` +
            '<div class="issue-main">' +
                `<div class="issue-text" role="button" tabindex="0" title="Click to edit">${htmlEscape(issue.text)}</div>` +
                `<div class="issue-meta">${htmlEscape(time)}${sentChip}</div>` +
            '</div>' +
            '<div class="issue-actions">' +
                (issue.status === 'open' ? `<button class="issue-send" title="Send to AI" aria-label="Send this issue to the AI">${SEND_ICON}</button>` : '') +
                (inReview ? `<button class="issue-still-broken" title="Still broken — reopen" aria-label="Still broken — reopen this issue">${REOPEN_ICON}</button>` : '') +
                `<button class="issue-delete" title="Delete" aria-label="Delete issue">${window.cross_svg}</button>` +
            '</div>' +
        '</div>';
    }

    // (Re)build the list + footer from an in-memory doc — pure and synchronous,
    // so mutations can update the view instantly. The panel chrome (header, add
    // row) is never rebuilt, so typing in the add input survives every render.
    function renderList(doc) {
        const $panel = $('.preview-issues-panel');
        if (!$panel.length) return;
        if (editingId) {
            renderPending = true;
            // The enter animation would otherwise fire on whatever render
            // eventually flushes — long after the add it belongs to.
            justAddedId = null;
            return;
        }

        // The rebuild below destroys the list DOM. If focus is inside it (a
        // keyboard user just activated a row button), remember where, so it can
        // be restored and Tab/Escape don't get dumped to <body>.
        const bodyEl = $panel.find('.issues-body')[0];
        const active = document.activeElement;
        let refocus = null;
        if (bodyEl && active && bodyEl.contains(active)) {
            let cls = (active.className || '').split(' ')[0] || null;
            // The inline editor never survives a render — its focus belongs on
            // the text element that replaces it.
            if (cls === 'issue-edit-input') cls = 'issue-text';
            refocus = {
                rowId: $(active).closest('.issue-item').attr('data-issue-id') || null,
                cls,
            };
        }

        const open = Core.openIssues(doc);
        const review = Core.reviewIssues(doc);
        const resolved = Core.resolvedIssues(doc);
        // First-run intro: nothing recorded yet — lead with what this panel IS
        // and gate the add input behind an explicit start (a bare text field
        // explains nothing). Skipped once the user proceeds, and suppressed if
        // the input holds a draft, so a slow first read landing mid-typing
        // can't hide the field out from under the user.
        const emptyDoc = open.length === 0 && review.length === 0 && resolved.length === 0;
        const intro = emptyDoc && !introDismissed && !($panel.find('.issues-add-input').val() || '').trim();
        const inputHadFocus = document.activeElement === $panel.find('.issues-add-input')[0];
        $panel.find('.issues-add-row').prop('hidden', intro);
        let html = '';
        if (intro) {
            html = '<div class="issues-intro">' +
                `<div class="issues-intro-icon">${window.issues_svg}</div>` +
                '<div class="issues-intro-text">Keep track of ideas, tasks, and things to fix.</div>' +
                `<button class="issues-intro-start">${PLUS_ICON}<span>Add your first issue</span></button>` +
            '</div>';
        } else if (emptyDoc) {
            html = '<div class="issues-empty">Keep track of ideas, tasks, and things to fix.</div>';
        } else {
            // Items the AI finished, pinned on top: this is the decision the
            // user owes the list, so it comes before everything else.
            if (review.length) {
                html += '<div class="issues-review-header"><span>Ready to review (' + review.length + ')</span>' +
                    (review.length > 1 ? '<button class="issues-confirm-all">Confirm all</button>' : '') +
                    '</div>';
                html += '<div class="issues-list issues-list-review">';
                // Chronological — matching the in-chat card and the numbering
                // of the sent message, so all three surfaces line up.
                review.forEach(i => { html += issueRowHtml(i); });
                html += '</div>';
            }
            if (open.length === 0) {
                // Suppress "all clear" while reviews are pending — it isn't.
                if (review.length === 0) html += '<div class="issues-empty">All clear — no open issues.</div>';
            } else {
                html += '<div class="issues-list">';
                open.slice().reverse().forEach(i => { html += issueRowHtml(i); }); // newest first
                html += '</div>';
            }
            if (resolved.length) {
                html += `<button class="issues-resolved-header" aria-expanded="${!resolvedCollapsed}">` +
                    `<span class="issues-resolved-chevron${resolvedCollapsed ? '' : ' expanded'}">${CHEVRON_ICON}</span>Resolved (${resolved.length})</button>`;
                if (!resolvedCollapsed) {
                    html += '<div class="issues-list issues-list-resolved">';
                    resolved.slice().reverse().forEach(i => { html += issueRowHtml(i); });
                    html += '</div>';
                }
            }
        }
        $panel.find('.issues-body').html(html);

        if (justAddedId) {
            $panel.find(`.issue-item[data-issue-id="${justAddedId}"]`).addClass('issue-item-enter');
            justAddedId = null;
        }

        if (refocus) {
            // Same row + same control if it survived (e.g. delete of another
            // row); for controls outside rows (the Resolved header), the same
            // control in the new body; else the panel container, keeping focus
            // inside the dialog.
            const $scope = refocus.rowId
                ? $panel.find(`.issue-item[data-issue-id="${refocus.rowId}"]`)
                : $panel.find('.issues-body');
            const $target = refocus.cls ? $scope.find('.' + refocus.cls).first() : $();
            ($target.length ? $target : $panel).trigger('focus');
        }

        // Hiding the add row drops focus on <body> if the input held it (a
        // slow first read landing on an untouched empty list) — move it to the
        // intro's CTA so Escape/Tab keep working inside the dialog.
        if (intro && inputHadFocus) $panel.find('.issues-intro-start').trigger('focus');

        syncBusyUI();
    }

    function renderListLoading() {
        const $panel = $('.preview-issues-panel');
        if (!$panel.length) return;
        $panel.find('.issues-body').html('<div class="issues-empty">Loading…</div>');
        $panel.find('.issues-footer').prop('hidden', true);
    }

    function renderPanelIfOpenFor(chatId) {
        if (!panelOpen || chatId !== panelChatId || chatId !== currentChatId) return;
        renderList(docCache.get(chatId) || Core.emptyDoc());
    }

    // Enable/disable the send actions to match the app's busy state. Kept in
    // sync live by updateSendButtonState (helpers.js), which calls
    // window.refreshIssuesSendState at every turn start/end — so an open panel
    // un-greys the moment the AI finishes.
    function syncBusyUI() {
        const $panel = $('.preview-issues-panel');
        if (!$panel.length) return;
        const busy = isBusy();
        const $sends = $panel.find('.issue-send');
        $sends.prop('disabled', busy);
        // The footer now only explains why the row send buttons are greyed —
        // show it just while a turn actually blocks them.
        $panel.find('.issues-footer').prop('hidden', !busy || !$sends.length);
    }
    // Never throws — it runs inside updateSendButtonState at every turn
    // start/end, where an exception would wedge the composer.
    window.refreshIssuesSendState = function () {
        try {
            if (panelOpen) syncBusyUI();
        } catch (e) {
            console.warn('issues: busy-state sync failed:', e);
        }
        // A turn starting removes the review card (it must not sit mid-stream);
        // a turn ending re-derives it once the batch lands in review.
        // (Internally guarded — see refreshIssueReviewCard.)
        refreshIssueReviewCard();
    };

    // ----- open / close --------------------------------------------------------

    async function openIssuesPanel() {
        if (!window.FEATURE_FLAGS.issues) return;
        if (!window.user) return;
        // Only one toolbar popover at a time — close the siblings symmetrically
        // (they close this one when they open).
        window.closeVersionsPanel?.();
        window.closePublishPanel?.();
        window.closeSharePanel?.();
        window.closeDevicePanel?.();
        panelOpen = true;
        $('.preview-issues').attr('aria-expanded', 'true');
        const chatId = currentChatId;
        panelChatId = chatId;

        const $panel = ensurePanelSkeleton();
        window.positionPanelCaret?.('.preview-issues-panel', '.preview-issues');
        // Restore the draft the user left in the add input last time this
        // chat's panel was closed. Done before the first render: a non-empty
        // input also (correctly) suppresses the first-run intro.
        const draft = draftByChat.get(chatId);
        if (draft) {
            $panel.find('.issues-add-input').val(draft);
            $panel.find('.issues-add-btn').prop('disabled', false);
        }
        // Fit the add input to its content up front — the CSS fallback height
        // is a fraction of a line off even when empty (especially at the 16px
        // mobile font size), which clips the placeholder; a restored
        // multi-line draft needs the real autosize anyway.
        autoResizeInput($panel.find('.issues-add-input')[0]);
        const cached = docCache.get(chatId);
        if (cached) renderList(cached);
        else renderListLoading();
        // Focus the primary control so the user can act immediately: the add
        // input normally, or the intro's CTA when the first-run intro is
        // showing (its add row is hidden). Except on mobile, where autofocus
        // pops the keyboard over the list; there the dialog container takes
        // focus so Escape still works.
        if (window.isMobileViewport?.()) $panel.trigger('focus');
        else {
            const $input = $panel.find('.issues-add-input');
            if ($input.is(':visible')) $input.trigger('focus');
            else {
                const $start = $panel.find('.issues-intro-start');
                ($start.length ? $start : $panel).trigger('focus');
            }
        }

        const doc = await readDocReconcile(chatId); // re-renders via its side-effects if changed
        // A close or chat switch may have happened during the await.
        if (!panelOpen || panelChatId !== chatId || currentChatId !== chatId) return;
        // If the read failed there's still no cache; pin the empty fallback so
        // mutations have a base and the panel is usable offline. Harmless for
        // data: writes never use the cache as their base (see mutate), and the
        // pin is tracked so the badge path keeps re-reading until a genuine
        // read replaces it. Skipped while a mutation is pending — its doc is
        // stale by definition, and the queue re-caches when it lands.
        if (!docCache.has(chatId) && !pendingCount(chatId)) {
            docCache.set(chatId, doc);
            pinnedFallback.add(chatId);
        }
        // Replace the loading chrome even when the read matched the fallback.
        if (!cached) renderList(docCache.get(chatId) || doc);
    }

    // Never throws — hideAppPreview / loadChat / new_chat call this during
    // teardown, and an exception there would break the chat switch itself.
    function closeIssuesPanel() {
        try {
            if (!panelOpen && !$('.preview-issues-panel').length) return;
            finishEdit(true); // an in-progress edit is committed, not lost
        } catch (e) {
            console.warn('issues: closing edit commit failed:', e);
        }
        // Keep (don't discard) the add input's draft for this chat's next open.
        if (panelChatId) {
            const draft = $('.preview-issues-panel .issues-add-input').val() || '';
            if (draft.trim()) draftByChat.set(panelChatId, draft);
            else draftByChat.delete(panelChatId);
        }
        panelOpen = false;
        panelChatId = null;
        editingId = null;
        editingChatId = null;
        renderPending = false;
        justAddedId = null;
        introDismissed = false;
        $('.preview-issues').attr('aria-expanded', 'false');
        $('.preview-issues-panel').remove();
    }
    // Exposed so chat-context changes (new_chat / loadChat / hideAppPreview) and
    // the sibling popovers can close a panel that would otherwise linger in the
    // persistent preview pane and act on the wrong chat.
    window.closeIssuesPanel = closeIssuesPanel;

    // ----- actions --------------------------------------------------------------

    function addIssueFromInput() {
        const chatId = panelChatId || currentChatId;
        const $input = $('.issues-add-input');
        const cleaned = Core.cleanIssueText($input.val());
        if (!cleaned.ok) {
            if (cleaned.error === 'too_long') {
                window.showToast?.(`That issue is too long — keep it under ${Core.MAX_TEXT_LENGTH} characters.`, { type: 'warning', key: 'issue-too-long', throttleMs: 4000 });
            }
            return;
        }
        // Mint id/timestamp once so the optimistic and authoritative
        // applications of this add produce the identical issue.
        const id = Core.generateIssueId();
        const now = new Date().toISOString();
        justAddedId = id;
        const res = mutate(chatId, doc => Core.addIssue(doc, cleaned.text, { id, now }));
        if (!res.ok) {
            justAddedId = null;
            if (res.error === 'limit') {
                window.showToast?.(`Issue limit reached (${Core.MAX_ISSUES}). Delete some issues first.`, { type: 'warning', key: 'issues-limit', throttleMs: 4000 });
            }
            return;
        }
        // Analytics: the issues funnel is Issue Created → Issues Sent to AI →
        // Issue Resolved / Issue Reopened. On Resolved, resolved_by splits
        // confirmed AI fixes from manual check-offs — Resolved(ai) vs Reopened
        // is the AI fix success rate; `via` says whether the decision came
        // from the panel or the in-chat review card.
        window.track?.('Issue Created');
        $input.val('');
        autoResizeInput($input[0]);
        $('.issues-add-btn').prop('disabled', true);
        $input.trigger('focus'); // rapid entry: keep typing, Enter, repeat
    }

    function toggleIssueStatus(id) {
        const chatId = panelChatId || currentChatId;
        const doc = docCache.get(chatId);
        const issue = doc && doc.issues.find(i => i.id === id);
        if (!issue) return;
        // Circle semantics per state: open → resolved (check off), review →
        // resolved (confirm the AI's fix — setIssueStatus credits it 'ai'),
        // resolved → open (reopen).
        const next = issue.status === 'resolved' ? 'open' : 'resolved';
        const now = new Date().toISOString();
        const res = mutate(chatId, d => Core.setIssueStatus(d, id, next, { now }));
        if (res.ok && next === 'resolved') {
            window.track?.('Issue Resolved', { resolved_by: issue.status === 'review' ? 'ai' : 'user', via: 'panel', count: 1 });
        }
    }

    function deleteIssueWithUndo(id) {
        const chatId = panelChatId || currentChatId;
        const doc = docCache.get(chatId);
        const idx = doc ? doc.issues.findIndex(i => i.id === id) : -1;
        const snapshot = idx >= 0 ? Object.assign({}, doc.issues[idx]) : null;
        const res = mutate(chatId, d => Core.deleteIssue(d, id));
        if (!res.ok) return;
        if (snapshot) {
            window.showToast?.('Issue deleted.', {
                type: 'info',
                duration: 5000,
                action: {
                    label: 'Undo',
                    onClick: () => { mutate(chatId, d => Core.restoreIssue(d, snapshot, idx)); },
                },
            });
        }
    }

    // Send a batch of issues to the AI as one plain user message. Mirrors the
    // preview error-reporter's guards: never interrupt a running turn (a send
    // during one would be treated as Stop), a restore, or a clarification card.
    function sendIssuesToAI(issues) {
        if (!issues.length) return;
        if (isBusy()) {
            window.showToast?.('The AI is still working — send your issues when the current task finishes.',
                { key: 'issues-busy', throttleMs: 4000 });
            return;
        }
        const message = Core.formatForAI(issues);
        if (!message) return;
        const chatId = panelChatId || currentChatId;
        const now = new Date().toISOString();
        const ids = issues.map(i => i.id);
        mutate(chatId, d => Core.markIssuesSent(d, ids, { now }));
        // Arm the fix batch BEFORE the turn starts so a reopened panel shows
        // "Fixing…" from the first moment. app.js reports back when the turn
        // ends (every terminal path runs through its post-finally hook).
        activeFix = { chatId, ids: new Set(ids) };
        closeIssuesPanel();
        // Make sure the conversation is actually visible so the user sees the
        // turn start: un-collapse the docked chat on desktop, switch to the
        // chat view on mobile.
        $('body').removeClass('chat-hidden');
        if (window.isMobileViewport?.()) {
            $('body').addClass('mobile-view-chat');
            window.syncViewSeg?.();
        }
        window.track?.('Issues Sent to AI', { count: issues.length });
        // sendChatMessage can bail before the turn starts (e.g. a guest
        // dismissing the sign-in prompt it raises). On every STARTED turn its
        // promise settles only after the end-of-turn notify hook has consumed
        // the batch, so a batch still armed when it settles was never picked
        // up: disarm it, or the rows would show a phantom "Fixing…" and the
        // NEXT clean turn in this chat would wrongly claim the batch as
        // reviewed.
        const armed = activeFix;
        sendChatMessage(message).catch(() => {}).then(() => {
            if (activeFix === armed) {
                activeFix = null;
                // No turn started, so nothing was sent: take the "Sent" stamp
                // written above back too (only where it is still OUR stamp), or
                // the rows would claim the AI saw text it never received — and
                // keep claiming it across reloads.
                mutate(chatId, d => Core.unmarkIssuesSent(d, ids, { now }));
                if (armed.chatId === currentChatId) safeRefreshUI(armed.chatId);
            }
        });
    }

    // Called by app.js after EVERY terminal turn path (success, error, stop,
    // mid-turn chat switch) with the chat the turn ran in and whether it
    // streamed to a clean completion. Closes the loop the send opened:
    //   clean finish → the batch moves to "Ready to review" and a toast points
    //     the user at the preview. Deliberately NOT auto-resolved: the AI
    //     finishing means it claims the work is done, not that it is — only
    //     the user's confirmation moves an issue to resolved, so the resolved
    //     list stays trustworthy;
    //   anything else → the batch is dropped and the rows revert from
    //     "Fixing…" to "Sent", claiming nothing.
    // markSentIssuesForReview is conservative: issues deleted, hand-resolved,
    // or EDITED while the turn ran are left alone (see issues-core.js).
    // Never throws — app.js calls this on the end-of-turn path, where an
    // exception would suppress the resume banner and follow-up suggestions.
    window.notifyIssuesTurnFinished = function (opts) {
        try {
            notifyIssuesTurnFinishedInner(opts || {});
        } catch (e) {
            console.warn('issues: turn-finished handling failed:', e);
        }
    };

    function notifyIssuesTurnFinishedInner(opts) {
        const batch = activeFix;
        if (!batch || batch.chatId !== opts.chatId) return; // not an issues turn
        activeFix = null;
        const chatId = batch.chatId;
        if (!opts.succeeded) {
            if (chatId === currentChatId) safeRefreshUI(chatId);
            return;
        }
        // A fresh batch supersedes any earlier card round or "later" dismissal —
        // the question is being asked anew about new work. Keyed by the batch's
        // chat, NOT gated on it being current: if the user switched away
        // mid-turn, a stale "later" from an earlier round would otherwise keep
        // suppressing the new batch's card when they switch back.
        if (cardState && cardState.chatId === chatId) cardState = null;
        if (cardDismissedFor === chatId) cardDismissedFor = null;
        const res = mutate(chatId, d =>
            Core.markSentIssuesForReview(d, Array.from(batch.ids), { now: new Date().toISOString() }));
        const count = (res && res.ok && typeof res.reviewed === 'number') ? res.reviewed : 0;
        // The question itself is asked by the in-chat review card (rendered by
        // the mutate above). Add a toast only when the chat is off-screen —
        // preview fullscreen on mobile, or collapsed on desktop — pointing at
        // the card the user can't currently see.
        const chatHidden = $('body').hasClass('chat-hidden')
            || (window.isMobileViewport?.() && !$('body').hasClass('mobile-view-chat'));
        if (count > 0 && chatId === currentChatId && chatHidden) {
            window.showToast?.(
                count === 1
                    ? 'The AI finished your issue — check that it works.'
                    : `The AI finished ${count} issues — check that they work.`,
                {
                    type: 'success',
                    duration: 8000,
                    action: {
                        label: 'Review',
                        onClick: () => {
                            if (chatId !== currentChatId) return; // switched away since
                            // Reveal the chat, where the review card is waiting.
                            $('body').removeClass('chat-hidden');
                            if (window.isMobileViewport?.()) $('body').addClass('mobile-view-chat');
                            window.syncViewSeg?.();
                            const el = $('.chat-box .issue-review-card')[0];
                            if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
                        },
                    },
                });
        }
    }

    // ----- inline editing -------------------------------------------------------

    function beginEdit(id) {
        if (editingId === id) return;
        finishEdit(true); // commit any other in-progress edit first
        const chatId = panelChatId || currentChatId;
        const doc = docCache.get(chatId);
        const issue = doc && doc.issues.find(i => i.id === id);
        if (!issue) return;
        const $row = $(`.preview-issues-panel .issue-item[data-issue-id="${id}"]`);
        if (!$row.length) return;
        editingId = id;
        editingChatId = chatId;
        $row.addClass('editing');
        const $ta = $(`<textarea class="issue-edit-input" rows="1" maxlength="${Core.MAX_TEXT_LENGTH}" aria-label="Edit issue"></textarea>`).val(issue.text);
        $row.find('.issue-text').replaceWith($ta);
        autoResizeInput($ta[0]);
        $ta.trigger('focus');
        const el = $ta[0];
        el.setSelectionRange(el.value.length, el.value.length); // caret at end
    }

    // Commit (or discard) the in-progress edit. An empty or unchanged result is
    // a cancel, not a delete — clearing the text must never destroy an issue.
    function finishEdit(commit) {
        if (!editingId || finishingEdit) return;
        finishingEdit = true;
        const id = editingId;
        // Commit to the chat the edit was STARTED in — during a chat switch,
        // currentChatId has already moved on by the time the lingering panel is
        // closed (and this commit runs).
        const chatId = editingChatId || currentChatId;
        const $ta = $('.preview-issues-panel .issue-edit-input');
        const value = $ta.val();
        editingId = null;
        editingChatId = null;
        try {
            if (commit) {
                const cleaned = Core.cleanIssueText(value);
                // Skip untouched text entirely: no write, and no clearing of the
                // "Sent" stamp for words the AI did in fact see.
                const doc = docCache.get(chatId);
                const existing = doc && doc.issues.find(i => i.id === id);
                if (cleaned.ok && (!existing || existing.text !== cleaned.text)) {
                    mutate(chatId, d => Core.updateIssueText(d, id, cleaned.text, { now: new Date().toISOString() }));
                }
            }
        } finally {
            finishingEdit = false;
        }
        // Rebuild the row from the (possibly updated) cache; also flushes any
        // render deferred while the editor was open.
        renderPending = false;
        renderPanelIfOpenFor(chatId);
    }

    // ----- event wiring ----------------------------------------------------------

    // Toolbar button toggles the panel.
    $(document).on('click', '.preview-issues', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (panelOpen) closeIssuesPanel();
        else openIssuesPanel();
    });

    $(document).on('click', '.issues-panel-close', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeIssuesPanel();
        focusIssuesTrigger();
    });

    // Escape closes the panel — except in the add input with text (clears it
    // instead) and in the inline editor (its own handler cancels the edit).
    $(document).on('keydown', '.preview-issues-panel', function (e) {
        if (e.key !== 'Escape') return;
        const $t = $(e.target);
        if ($t.hasClass('issues-add-input') && $t.val()) {
            e.preventDefault();
            $t.val('');
            autoResizeInput($t[0]);
            $('.issues-add-btn').prop('disabled', true);
            return;
        }
        e.preventDefault();
        closeIssuesPanel();
        focusIssuesTrigger();
    });

    // Click outside closes (also triggered synthetically when focus moves into
    // the preview iframe — see dismissOverlaysForIframeFocus in ui.js).
    $(document).on('click', function (e) {
        if (!panelOpen) return;
        const $t = $(e.target);
        if ($t.closest('.preview-issues-panel').length) return;
        if ($t.closest('.preview-issues').length) return;
        // Toasts live on <body>, outside the panel, but the ones on screen while
        // it is open are its own ("Issue deleted. [Undo]", the limit notices):
        // clicking Undo or their × must not read as a click-away that closes
        // the panel the moment the row comes back.
        if ($t.closest('.toast-container').length) return;
        closeIssuesPanel();
    });

    // Quick-add: Enter adds (Shift+Enter for a newline), the + button too.
    $(document).on('keydown', '.issues-add-input', function (e) {
        e.stopPropagation(); // typing must never reach app-level handlers
        if (e.key === 'Escape') {
            // Re-dispatch to the panel handler above (stopPropagation blocks it).
            if ($(this).val()) {
                $(this).val('');
                autoResizeInput(this);
                $('.issues-add-btn').prop('disabled', true);
            } else {
                closeIssuesPanel();
                focusIssuesTrigger();
            }
            return;
        }
        if (e.which === 13 && !e.shiftKey) {
            e.preventDefault();
            addIssueFromInput();
        }
    });
    $(document).on('input', '.issues-add-input', function () {
        autoResizeInput(this);
        $('.issues-add-btn').prop('disabled', !$(this).val().trim());
    });
    $(document).on('click', '.issues-add-btn', function (e) {
        e.preventDefault();
        addIssueFromInput();
        $('.issues-add-input').trigger('focus');
    });

    // Row actions.
    $(document).on('click', '.issue-toggle', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = $(this).closest('.issue-item').attr('data-issue-id');
        if (id) toggleIssueStatus(id);
    });
    $(document).on('click', '.issue-delete', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = $(this).closest('.issue-item').attr('data-issue-id');
        if (id) deleteIssueWithUndo(id);
    });
    $(document).on('click', '.issue-send', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = $(this).closest('.issue-item').attr('data-issue-id');
        const doc = docCache.get(panelChatId || currentChatId);
        const issue = doc && doc.issues.find(i => i.id === id && i.status === 'open');
        if (issue) sendIssuesToAI([issue]);
    });
    // Click the text to edit it in place.
    $(document).on('click', '.preview-issues-panel .issue-text', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = $(this).closest('.issue-item').attr('data-issue-id');
        if (id) beginEdit(id);
    });
    // Keyboard parity for click-to-edit — the text is a focusable role=button
    // (the global [role="button"]:focus-visible rule provides its ring).
    $(document).on('keydown', '.preview-issues-panel .issue-text', function (e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault();
        e.stopPropagation();
        const id = $(this).closest('.issue-item').attr('data-issue-id');
        if (id) beginEdit(id);
    });
    $(document).on('keydown', '.issue-edit-input', function (e) {
        e.stopPropagation();
        if (e.key === 'Escape') {
            e.preventDefault();
            finishEdit(false);
        } else if (e.which === 13 && !e.shiftKey) {
            e.preventDefault();
            finishEdit(true);
        }
    });
    $(document).on('input', '.issue-edit-input', function () {
        autoResizeInput(this);
    });
    // Clicking anywhere else while editing commits the edit (focusout is the
    // delegated form of blur). DEFERRED: committing re-renders the list, and
    // doing that between the mousedown (which moved focus) and the click of
    // whatever was clicked would destroy the click's target mid-gesture — the
    // click would silently vanish (e.g. a delete button needing two presses).
    // Deferring lets the click land on the intact DOM first. The session guard
    // makes the deferred commit a no-op when something in between (Enter,
    // Escape, panel close, switching edit to another row) already finished
    // THIS edit — otherwise it would instantly commit the newly-started one.
    $(document).on('focusout', '.issue-edit-input', function () {
        if (!editingId) return;
        const session = editingId;
        setTimeout(() => {
            if (editingId === session) finishEdit(true);
        }, 0);
    });

    // Review-row "still broken": back to open (setIssueStatus clears the sent
    // stamp, so it reads as fresh work and re-arms for the next send).
    $(document).on('click', '.issue-still-broken', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const id = $(this).closest('.issue-item').attr('data-issue-id');
        if (!id) return;
        const chatId = panelChatId || currentChatId;
        const res = mutate(chatId, d => Core.setIssueStatus(d, id, 'open', { now: new Date().toISOString() }));
        if (res.ok) window.track?.('Issue Reopened', { via: 'panel' });
    });

    // Confirm the whole review batch in one tap.
    $(document).on('click', '.issues-confirm-all', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const chatId = panelChatId || currentChatId;
        const doc = docCache.get(chatId);
        const ids = doc ? Core.reviewIssues(doc).map(i => i.id) : [];
        if (!ids.length) return;
        const res = mutate(chatId, d => Core.confirmReviewIssues(d, ids, { now: new Date().toISOString() }));
        if (res.ok) window.track?.('Issue Resolved', { resolved_by: 'ai', via: 'panel', count: ids.length });
    });

    // First-run intro: proceed to the regular panel (add input shown, focused
    // — the user just asked to add, so popping the keyboard is right even on
    // mobile).
    $(document).on('click', '.issues-intro-start', function (e) {
        e.preventDefault();
        e.stopPropagation();
        introDismissed = true;
        renderPanelIfOpenFor(panelChatId || currentChatId);
        $('.preview-issues-panel .issues-add-input').trigger('focus');
    });

    // Resolved section expand/collapse.
    $(document).on('click', '.issues-resolved-header', function (e) {
        e.preventDefault();
        e.stopPropagation();
        resolvedCollapsed = !resolvedCollapsed;
        renderPanelIfOpenFor(panelChatId || currentChatId);
    });

    // ----- in-chat review card actions ----------------------------------------
    // Each decision drives the same store as the panel; the card, panel, and
    // badge all re-derive from the cache the mutate updates.

    // A decided row only counts (and mutates) if it is STILL in review right
    // now — the same item may have been confirmed/reopened via the panel, a
    // second tab, or a double-click since this card row was painted. Acting on
    // stale rows would drift the terminal summary's counts from reality.
    function cardDecisionTarget($btn) {
        if (!cardState || cardState.chatId !== currentChatId) return null;
        const id = $btn.closest('.irc-item').attr('data-issue-id');
        if (!id) return null;
        const doc = docCache.get(currentChatId);
        const issue = doc && doc.issues.find(i => i.id === id);
        return (issue && issue.status === 'review') ? issue : null;
    }

    $(document).on('click', '.issue-review-card .irc-fixed', function (e) {
        e.preventDefault();
        const issue = cardDecisionTarget($(this));
        if (!issue) return;
        cardState.confirmedCount++;
        const res = mutate(currentChatId, d => Core.setIssueStatus(d, issue.id, 'resolved', { now: new Date().toISOString() }));
        if (res.ok) window.track?.('Issue Resolved', { resolved_by: 'ai', via: 'card', count: 1 });
    });

    $(document).on('click', '.issue-review-card .irc-broken', function (e) {
        e.preventDefault();
        const issue = cardDecisionTarget($(this));
        if (!issue) return;
        cardState.reopenedIds.push(issue.id);
        const res = mutate(currentChatId, d => Core.setIssueStatus(d, issue.id, 'open', { now: new Date().toISOString() }));
        if (res.ok) window.track?.('Issue Reopened', { via: 'card' });
    });

    $(document).on('click', '.issue-review-card .irc-all-fixed', function (e) {
        e.preventDefault();
        if (!cardState || cardState.chatId !== currentChatId) return;
        const doc = docCache.get(currentChatId);
        const ids = doc ? Core.reviewIssues(doc).map(i => i.id) : [];
        if (!ids.length) return;
        cardState.confirmedCount += ids.length;
        const res = mutate(currentChatId, d => Core.confirmReviewIssues(d, ids, { now: new Date().toISOString() }));
        if (res.ok) window.track?.('Issue Resolved', { resolved_by: 'ai', via: 'card', count: ids.length });
    });

    // Hovering the card pauses the success-summary's auto-dismiss (standard
    // toast behavior — never yank content out from under the pointer);
    // leaving re-arms a fresh countdown if it still applies. The signature's
    // trailing field is the reopened count: only ":0" (no CTA) auto-hides.
    $(document).on('mouseenter', '.issue-review-card', function () {
        cardHovered = true;
        cancelCardAutoDismiss();
    });
    $(document).on('mouseleave', '.issue-review-card', function () {
        cardHovered = false;
        if (cardSig && /^terminal:\d+:0$/.test(cardSig)) armCardAutoDismiss(cardSig);
    });

    // "Later": drop the card, keep the items in review — the panel's group and
    // the green badge still carry them, and a future batch re-asks.
    $(document).on('click', '.issue-review-card .irc-dismiss', function (e) {
        e.preventDefault();
        cardDismissedFor = currentChatId;
        cardState = null;
        removeIssueReviewCard();
        // Whether this closed the pending question ("later") or the terminal
        // summary, the card no longer holds the floor — paint any deferred
        // "what next?" chips.
        window.renderDeferredSuggestions?.();
    });

    // Terminal follow-up: re-send everything reopened through this card round.
    // The busy check comes FIRST so a click during a running turn keeps the
    // card (and the affordance) instead of eating it with a "try later" toast.
    $(document).on('click', '.issue-review-card .irc-send-back', function (e) {
        e.preventDefault();
        const state = cardState;
        if (!state || state.chatId !== currentChatId) return;
        if (isBusy()) {
            window.showToast?.('The AI is still working — send your issues when the current task finishes.',
                { key: 'issues-busy', throttleMs: 4000 });
            return;
        }
        const doc = docCache.get(currentChatId);
        const wanted = new Set(state.reopenedIds);
        const issues = doc ? Core.openIssues(doc).filter(i => wanted.has(i.id)) : [];
        cardState = null;
        removeIssueReviewCard();
        if (issues.length) sendIssuesToAI(issues);
        else {
            // Everything reopened through the card has since been resolved or
            // deleted elsewhere — say so instead of silently doing nothing.
            window.showToast?.('Those issues were already handled — nothing to send.',
                { key: 'issues-sendback-empty', throttleMs: 4000 });
        }
    });
})();
