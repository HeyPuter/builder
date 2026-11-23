// message-edit.js — edit the latest message the user sent, until Puter has
// changed something for it.
//
// Under the user's latest message, a pencil opens it for editing in place. It
// is there for as long as nothing done for that message has changed anything:
// the AI has only read files, looked things up, planned or asked a question
// (READ_ONLY_TOOLS), or its turn ended or was stopped before it got further.
// The first call that could change something (a file write, a worker, a
// secret, a generated image, a Publish card) takes the pencil away, and so
// does a version restore or a pull from GitHub after it. An edit never has
// anything to undo.
//
// Opening the editor stops a running build at once, so nothing changes while
// the user types. Send puts in the new text (the message's files, pasted text
// and picked element stay as they were), takes everything after the message
// out of the conversation and builds again from there: sendChatMessage's
// opts.edit, which calls rewind below. Cancel leaves the conversation as it
// was, with the Resume banner back if there was one or the edit stopped a
// build. If something has changed by the time Send is pressed (another
// message went in meanwhile), the new text goes to the composer instead, to
// send as a new message, so nothing typed is lost.
//
// FEATURE_FLAGS.messageEdit turns it off.

(function () {
    'use strict';

    // Calls that leave the project's files, its workers and its site as they
    // were. Every other tool counts as a change, including tools added later.
    const READ_ONLY_TOOLS = new Set([
        'stat', 'readdir', 'ReadTextFile', 'SearchFiles', 'ViewImage', 'ViewDocument', 'ShowImage',
        'FetchExternalResource', 'list_workers', 'get_worker', 'update_preview',
        'TodoWrite', 'AskClarifyingQuestions', 'OfferUpgrade',
    ]);

    const pencilIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';

    const MOVED = 'Puter has changed things since that message, so your edit is in the message box. Send it as a new message.';
    const CHANGED = 'Puter has already started changing things for that message, so it can’t be edited. Send a new message instead.';

    // The open editor: { id, original, files, stopped, bannerBack, bannerText,
    // sending, sent }. One at a time.
    let editing = null;
    // The message the running turn works on (see turnStarted and turnFor).
    // Null while a turn is still setting up, before its message has joined
    // the conversation: the pencil waits for it.
    let turnMessageId = null;

    function enabled() {
        return !!(window.FEATURE_FLAGS && window.FEATURE_FLAGS.messageEdit);
    }
    function turnRunning() {
        return typeof isProcessing !== 'undefined' && !!isProcessing;
    }
    function openHistory() {
        return typeof chatHistory !== 'undefined' && Array.isArray(chatHistory) ? chatHistory : [];
    }

    // ----- the conversation --------------------------------------------------

    function blocks(content) {
        if (Array.isArray(content)) return content;
        return content && typeof content === 'object' ? [content] : [];
    }
    function isToolResult(m) {
        const b = blocks(m.content);
        return b.length > 0 && b.every(x => x && x.type === 'tool_result');
    }
    // A message the user sent: typed, or sent for them (an error report, an
    // Issues batch). Not a tool result or a resume's hidden nudge.
    function isSentMessage(m) {
        return !!m && m.role === 'user' && !!m.messageId && !m.resumeNudge && !isToolResult(m);
    }
    function isNote(m) {
        if (typeof isVersionNote === 'function') return isVersionNote(m);
        return !!m.versionNote;
    }
    // Whether an entry after the message leaves it editable: the AI's words,
    // its error cards, calls that change nothing and their results, a resume's
    // nudge. Not a restore's or a pull's note: the files changed under it.
    function changedNothing(m) {
        if (!m) return true;
        if (m.role === 'user') return !!m.resumeNudge || isToolResult(m);
        if (m.role !== 'assistant' || isNote(m)) return false;
        return blocks(m.content).every(b => !b || b.type !== 'tool_use' || READ_ONLY_TOOLS.has(b.name));
    }

    // The latest message the user sent, if nothing since has changed anything.
    function editableId(history) {
        if (!Array.isArray(history)) return null;
        for (let i = history.length - 1; i >= 0; i--) {
            const m = history[i];
            if (isSentMessage(m)) return m.messageId;
            if (!changedNothing(m)) return null;
        }
        return null;
    }
    // The latest message the user sent, editable or not.
    function lastSentId(history) {
        if (!Array.isArray(history)) return null;
        for (let i = history.length - 1; i >= 0; i--) if (isSentMessage(history[i])) return history[i].messageId;
        return null;
    }
    function indexOf(history, id) {
        for (let i = history.length - 1; i >= 0; i--) if (history[i] && history[i].messageId === id) return i;
        return -1;
    }

    // The text the bubble shows. A chat reload draws a message's last text
    // block (loadChat); a message only ever has one.
    function textOf(content) {
        if (typeof content === 'string') return content;
        const t = blocks(content).filter(b => b && b.type === 'text');
        return t.length ? String(t[t.length - 1].text || '') : '';
    }
    // Files, pasted text cards, images: everything the bubble shows but the text.
    function hasFiles(content) {
        return blocks(content).some(b => b && b.type !== 'text' && b.type !== 'text-hidden');
    }
    // `content` with `text` in place of its text. Everything else stays where
    // it was: the files, the pasted text, and the hidden notes that go with
    // them (the saved paths, the element picked with click-to-edit).
    function withText(content, text) {
        if (!Array.isArray(content)) return text;
        const out = [];
        let placed = false;
        for (const b of content) {
            if (b && b.type === 'text') {
                if (!placed && text) out.push({ ...b, text });
                placed = true;
                continue;
            }
            out.push(b);
        }
        if (!placed && text) out.unshift({ type: 'text', text });
        return out;
    }
    // What the user asked, for the version label: the text, then any pasted
    // text cards (sendChatMessage labels a turn the same way).
    function requestText(content) {
        const pastes = blocks(content)
            .filter(b => b && b.type === 'document' && b._pasted && b.source)
            .map(b => String(b.source.data || ''));
        return [textOf(content), ...pastes].filter(t => t.trim()).join('\n\n');
    }
    // A hidden note (the Code view's hand edits) added to the edited message.
    function addNote(message, note) {
        if (!message || !note) return;
        const parts = typeof message.content === 'string'
            ? (message.content ? [{ type: 'text', text: message.content }] : [])
            : blocks(message.content).slice();
        parts.push({ type: 'text-hidden', text: note });
        message.content = parts;
    }

    // ----- the chat ----------------------------------------------------------

    function bubble(id) {
        if (!id) return null;
        const sel = '.chat-box .user-message[data-message-id="' + String(id).replace(/["\\]/g, '\\$&') + '"]';
        return $(sel)[0] || null;
    }
    function inputOf(e) {
        const msg = e && bubble(e.id);
        return msg ? msg.querySelector('.message-edit-input') : null;
    }

    // Puts the pencil under the message that can be edited now, and takes it
    // from anywhere else. Called whenever that may have changed.
    function refresh() {
        const $bars = $('.chat-box .message-edit-bar');
        let target = null;
        if (enabled() && !editing) {
            const id = editableId(openHistory());
            if (id && (!turnRunning() || id === turnMessageId)) target = bubble(id);
        }
        // Left alone when it is already in its place, so keyboard focus on it
        // survives the refresh every AI call makes.
        if (target && $bars.length === 1 && $bars[0].parentNode === target) return;
        $bars.remove();
        if (!target) return;
        $(target).append('<div class="message-edit-bar">'
            + `<button type="button" class="message-edit-btn" title="Edit message" aria-label="Edit message">${pencilIcon}</button>`
            + '</div>');
    }

    // Not on phones: a focus there pops the keyboard up with nothing to type.
    function focusComposer() {
        const el = $('.chat-input-message')[0];
        if (el && !window.isMobileViewport?.()) el.focus();
    }
    function resize(el) {
        if (!el || !el.style) return;
        el.style.height = 'auto';
        if (el.scrollHeight) el.style.height = el.scrollHeight + 'px';
    }
    function syncSend() {
        const el = inputOf(editing);
        const msg = editing && bubble(editing.id);
        if (!el || !msg) return;
        const empty = !String(el.value || '').trim() && !editing.files;
        $(msg).find('.message-edit-send').prop('disabled', empty || editing.sending);
    }

    function open(id) {
        if (!enabled() || editing) return;
        const history = openHistory();
        if (editableId(history) !== id || (turnRunning() && id !== turnMessageId)) {
            refresh();
            window.showToast?.(CHANGED, { type: 'info', key: 'message-edit-changed', throttleMs: 3000 });
            return;
        }
        const msg = bubble(id);
        const content = msg && msg.querySelector('.message-content');
        const original = history[indexOf(history, id)];
        if (!content || !original) return;

        // Stop the build working on it, so nothing changes while the user types.
        const hadBanner = $('.resume-banner-message').length > 0;
        const stopped = turnRunning() && !!window.stopTurnForEdit?.();
        window.clearResumeBanner?.();
        editing = {
            id, original: textOf(original.content), files: hasFiles(original.content),
            stopped, bannerBack: hadBanner || stopped, bannerText: undefined, sending: false, sent: false,
        };
        $(msg).find('.message-edit-bar').remove();
        msg.classList.add('editing');
        const $input = $('<textarea class="message-edit-input" rows="1" aria-label="Edit your message"></textarea>');
        $input.val(editing.original);
        content.prepend($input[0]);
        $(content).append('<div class="message-edit-actions">'
            + '<button type="button" class="message-edit-cancel">Cancel</button>'
            + '<button type="button" class="message-edit-send">Send</button>'
            + '</div>');
        syncSend();
        const el = $input[0];
        resize(el);
        el.focus();
        el.setSelectionRange?.(el.value.length, el.value.length);
        window.announce?.((stopped ? 'Stopped. ' : '') + 'Edit your message, then send it to build again from there.');
    }

    // Puts the bubble back as it was. restoreBanner: the Resume banner the
    // editor took down (or the one the stopped build asked for meanwhile)
    // comes back.
    function close({ restoreBanner = false } = {}) {
        const e = editing;
        if (!e) return null;
        editing = null;
        const msg = bubble(e.id);
        if (msg) {
            msg.classList.remove('editing');
            $(msg).find('.message-edit-input, .message-edit-actions').remove();
        }
        if (restoreBanner && e.bannerBack) window.showResumeBanner?.(e.bannerText);
        refresh();
        return e;
    }

    function cancel() {
        if (!editing || editing.sending) return;
        close({ restoreBanner: true });
        const btn = $('.chat-box .message-edit-btn')[0];
        if (btn) btn.focus();
        else focusComposer();
    }

    // The edit can't go in where it was: its text goes to the composer, ahead
    // of anything typed there, to send as a new message.
    function moveToComposer(text) {
        close();
        if (text) {
            if (window.MessageQueue?.returnToComposer) window.MessageQueue.returnToComposer([{ text }]);
            else if (typeof applyDraftToComposer === 'function') applyDraftToComposer(text);
        }
        window.showToast?.(MOVED, { type: 'info', key: 'message-edit-moved', duration: 6000 });
        window.announce?.(MOVED);
        focusComposer();
    }

    function send() {
        const e = editing;
        if (!e || e.sending) return;
        const el = inputOf(e);
        const text = String((el && el.value) || '').trim();
        if (!text && !e.files) return;
        if (editableId(openHistory()) !== e.id) {
            moveToComposer(text);
            return;
        }
        // A turn that began since the editor opened (a send from the composer,
        // still setting up) gives way: the edit goes in first, and that
        // turn's message goes back to the composer.
        if (turnRunning()) window.stopTurnForEdit?.();
        e.sending = true;
        const msg = bubble(e.id);
        if (msg) $(msg).find('.message-edit-input, .message-edit-cancel').prop('disabled', true);
        syncSend();
        Promise.resolve()
            .then(() => sendChatMessage(null, false, { edit: { messageId: e.id, text } }))
            .catch((err) => console.warn('Sending an edited message failed:', err))
            .finally(() => {
                if (e.sent || editing !== e) return;
                // Called off before its turn began: a restore, a publish or a
                // project load got there first (its toast says which), or the
                // Code view couldn't save. The editor is the user's again.
                e.sending = false;
                const m = bubble(e.id);
                if (m) $(m).find('.message-edit-input, .message-edit-cancel').prop('disabled', false);
                syncSend();
                if (editableId(openHistory()) !== e.id) moveToComposer(text);
            });
    }

    // ----- sendChatMessage ---------------------------------------------------

    // opts.edit, as its turn begins: the conversation as it was just before
    // the message, then the message with its new text. A new array: the
    // caller makes it the conversation, then calls turnFor. The chat follows:
    // the editor closes, the bubble shows the new text, and what came after
    // it goes. Null when the message isn't there (sendChatMessage checks it
    // is first).
    function rewind(history, edit) {
        const i = Array.isArray(history) && edit ? indexOf(history, edit.messageId) : -1;
        if (i < 0) return null;
        const original = history[i];
        const message = { ...original, content: withText(original.content, edit.text) };
        const out = history.slice(0, i);
        out.push(message);

        if (editing && editing.id === edit.messageId) editing.sent = true;
        close();
        const msg = bubble(edit.messageId);
        if (msg) {
            // What came after it in the chat: its replies, cards, checklist.
            // The queued messages stay, last.
            let dropped = false;
            for (let n = msg.nextElementSibling; n;) {
                const next = n.nextElementSibling;
                if (!n.classList.contains('message-queue')) {
                    if (n.classList.contains('todo-list')) dropped = true;
                    n.remove();
                }
                n = next;
            }
            if (dropped) window.currentTodos = null;
            const content = msg.querySelector('.message-content');
            if (content) {
                const files = content.querySelector('.attached-images');
                if (files) files.remove();
                $(content).html(edit.text ? nl_to_p(htmlEscape(edit.text)) : '');
                if (files) content.appendChild(files);
            }
        }
        // The pencil comes back under it once the caller has made `out` the
        // conversation (turnFor), since it is this turn's message.
        turnMessageId = edit.messageId;
        focusComposer();
        window.announce?.('Building again from your edited message.');
        return { history: out, message, request: requestText(message.content), files: hasFiles(message.content) };
    }

    // Every other turn, as it begins: a resume works on the latest message,
    // and a new message isn't in the conversation yet (turnFor, once it is).
    function turnStarted({ resume = false } = {}) {
        turnMessageId = resume ? lastSentId(openHistory()) : null;
        refresh();
    }

    // The turn's message has joined the conversation. One sent from the
    // composer while the editor was open comes after the message being
    // edited, so the edit can no longer go in where it was.
    function turnFor(id) {
        turnMessageId = id || null;
        if (editing && id && id !== editing.id && !editing.sending) {
            const el = inputOf(editing);
            const text = String((el && el.value) || '').trim();
            if (text && text !== editing.original.trim()) moveToComposer(text);
            else close();
        }
        refresh();
    }

    // A switch to another project: the chat it showed is gone.
    function reset() {
        editing = null;
        turnMessageId = null;
    }

    // While the editor is open, a Resume banner waits for Cancel (Send goes on
    // from the edited message, with nothing to resume). True when held.
    function holdBanner(message) {
        if (!editing) return false;
        editing.bannerBack = true;
        editing.bannerText = message;
        return true;
    }

    // ----- events ------------------------------------------------------------

    $(document).on('click', '.message-edit-btn', function () {
        const msg = this.closest('.user-message');
        if (msg) open(msg.getAttribute('data-message-id'));
    });
    $(document).on('click', '.message-edit-cancel', () => cancel());
    $(document).on('click', '.message-edit-send', () => send());
    $(document).on('input', '.message-edit-input', function () {
        resize(this);
        syncSend();
    });
    // Enter sends and Shift+Enter is a new line, as in the composer. Escape
    // cancels. The Enter that commits an IME composition is neither.
    $(document).on('keydown', '.message-edit-input', function (e) {
        if (window.isComposingKeyEvent?.(e)) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
        } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
            e.preventDefault();
            send();
        }
    });

    window.MessageEdit = {
        enabled,
        refresh,
        rewind,
        turnStarted,
        turnFor,
        reset,
        holdBanner,
        addNote,
        isOpen: () => !!editing,
        // For sendChatMessage's check, and the tests.
        editableId,
        _internals: { READ_ONLY_TOOLS, withText, textOf, requestText, hasFiles, open, cancel, send },
    };
})();
