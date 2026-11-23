// message-edit.js — copy and edit the messages the user sent.
//
// Under each message the user sent, a Copy and an Edit button show on hover
// (always on touch screens). Edit is only on a message with the version of
// the files it was sent with on record (see below), so not on messages sent
// before versions were kept with messages. It is also only on the latest
// EDITABLE_LAST messages, since Version history keeps about that many
// versions. It turns the message into a box to change it in place. Opening it stops a running build, so nothing changes while the user
// types. Send puts the new text in (the message's files, pasted text and
// picked element stay), takes what came after the message out of the
// conversation, and builds again from there.
//
// Every message keeps the version of the project's files it was sent with
// (baseVersion, recorded by sendChatMessage through projectVersionNow in
// versions.js). When anything after the message changed the files, Send puts
// them back to that version first, the way Version history restores one, and
// brings back the files the message itself was sent with. Meanwhile the
// bubble shows the new text, what came after it is hidden, and the thinking
// dots say what is going on. The files it leaves stay in Version history, so
// the user can still go back to them.
//
// The conversation is never cut short in place. An edit puts a new array in
// its place, and the old one is marked left (wasLeft), so a late save of it
// can't put it back.
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

    const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
    const pencilIcon = svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>');
    const copyIcon = svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>');
    const checkIcon = svg('<polyline points="20 6 9 17 4 12"/>');

    // What the box says Send will do.
    const HINT_REVERT = 'Your app goes back to how it was before this message, and what came after it leaves the chat. You can still get the current version back from Version history.';
    const HINT_AFTER = 'What came after this message leaves the chat.';
    const COPY_FAILED = 'Couldn’t copy the message. Select its text and copy it instead.';
    // Beside the thinking dots while the files go back.
    const REVERTING = 'Reverting to the previous version';
    // How many of the latest messages the user sent have Edit. Version history
    // keeps 30 versions (MAX_VERSIONS in versions.js), so an older message's
    // version is likely gone.
    const EDITABLE_LAST = 30;
    const BUILD_BUSY = 'Wait for the build to finish, or stop it, then try again.';

    // The open editor: { id, original, files, hint, bannerBack, bannerText,
    // sending, staged }. One at a time.
    let editing = null;
    // An edit that went in, until its turn begins or is called off:
    // { chatId, id, began }.
    let pending = null;
    // Conversations an edit put a new array in place of.
    const left = new WeakSet();

    function enabled() {
        return !!(window.FEATURE_FLAGS && window.FEATURE_FLAGS.messageEdit);
    }
    function turnRunning() {
        return typeof isProcessing !== 'undefined' && !!isProcessing;
    }
    function openHistory() {
        return typeof chatHistory !== 'undefined' && Array.isArray(chatHistory) ? chatHistory : [];
    }
    function openChatId() {
        return typeof currentChatId !== 'undefined' ? currentChatId : null;
    }
    function openAppDir() {
        return typeof currentAppDir !== 'undefined' ? currentAppDir : null;
    }
    function setHistory(history) {
        if (typeof window.setOpenChatHistory === 'function') window.setOpenChatHistory(history);
        else chatHistory = history; // eslint-disable-line no-global-assign
    }
    function isVersion(v) {
        return typeof v === 'string' && !!v;
    }

    // Why the project can't be touched right now, or null.
    function busyReason() {
        if (typeof _sendSetupInFlight !== 'undefined' && _sendSetupInFlight) return 'Your message is still going in. Try again in a moment.';
        if (typeof _loadChatSeq !== 'undefined' && typeof _loadChatSettledSeq !== 'undefined' && _loadChatSeq !== _loadChatSettledSeq) return 'The project is still opening. Try again in a moment.';
        const chatId = openChatId();
        if (window._restoringVersion || window.isRestoreStarting?.(chatId)) return 'Finishing the restore. Try again in a moment.';
        if (window.isPublishInFlight?.(chatId) || window.isPublishStarting?.(chatId)) return 'Finishing publishing. Try again in a moment.';
        return null;
    }

    // A stopped build may still be finishing its last step. Waits for it, at
    // most a while, so its last write can't land on top of restored files.
    function settleTurns() {
        if (typeof window.whenTurnsUnwound !== 'function') return Promise.resolve();
        return Promise.race([
            window.whenTurnsUnwound().catch(() => {}),
            new Promise(r => setTimeout(r, 15000)),
        ]);
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
    // Whether an entry left the project's files as they were. The AI's words,
    // its error cards, calls that change nothing and their results, and a
    // resume's nudge did. A restore's or a pull's note didn't.
    function changedNothing(m) {
        if (!m) return true;
        if (m.role === 'user') return !!m.resumeNudge || isToolResult(m);
        if (m.role !== 'assistant' || isNote(m)) return false;
        return blocks(m.content).every(b => !b || b.type !== 'tool_use' || READ_ONLY_TOOLS.has(b.name));
    }
    // The files a message was sent with (its attachments, saved to assets/),
    // relative to the project folder.
    function savedFiles(content) {
        return blocks(content)
            .filter(b => b && (b.type === 'image-ref' || b.type === 'file-ref') && typeof b.relativePath === 'string' && b.relativePath)
            .map(b => b.relativePath);
    }
    // Whether anything after history[i] changed the project's files.
    function changedSince(history, i) {
        for (let k = i + 1; k < history.length; k++) {
            const m = history[k];
            if (isSentMessage(m)) {
                if (savedFiles(m.content).length) return true;
                continue;
            }
            if (!changedNothing(m)) return true;
        }
        return false;
    }
    // Whether the conversation shows anything after history[i].
    function anythingAfter(history, i) {
        for (let k = i + 1; k < history.length; k++) if (history[k] && !history[k].resumeNudge) return true;
        return false;
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
    // block (loadChat), and a message only ever has one.
    function textOf(content) {
        if (typeof content === 'string') return content;
        const t = blocks(content).filter(b => b && b.type === 'text');
        return t.length ? String(t[t.length - 1].text || '') : '';
    }
    // Files, pasted text cards, images. Everything the bubble shows but the text.
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
    // What the user asked, for the version label and for Copy. The text, then
    // any pasted text cards (sendChatMessage labels a turn the same way).
    function requestText(content) {
        const pastes = blocks(content)
            .filter(b => b && b.type === 'document' && b._pasted && b.source)
            .map(b => String(b.source.data || ''));
        return [textOf(content), ...pastes].filter(t => t.trim()).join('\n\n');
    }
    // A hidden note added to a message (the Code view's hand edits).
    function addNote(message, note) {
        if (!message || !note) return;
        const parts = typeof message.content === 'string'
            ? (message.content ? [{ type: 'text', text: message.content }] : [])
            : blocks(message.content).slice();
        parts.push({ type: 'text-hidden', text: note });
        message.content = parts;
    }

    // What Send will do, for the box's hint.
    function hintFor(history, i) {
        if (changedSince(history, i)) return HINT_REVERT;
        return anythingAfter(history, i) ? HINT_AFTER : '';
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
    function barOf(msg) {
        if (!msg) return null;
        for (const c of msg.children) if (c.classList && c.classList.contains('message-actions')) return c;
        return null;
    }

    // The messages the user sent, and the ones with Edit: among the latest
    // EDITABLE_LAST, those with the version they were sent with on record.
    function sentMessages(history) {
        const all = history.filter(isSentMessage);
        return {
            sent: new Set(all.map(m => m.messageId)),
            editable: new Set(all.slice(-EDITABLE_LAST).filter(m => isVersion(m.baseVersion)).map(m => m.messageId)),
        };
    }

    // Puts Copy under every message the user sent, and Edit under the latest
    // ones, as the conversation stands. A bar that is already right is left
    // alone, so keyboard focus on it survives the refresh every AI call makes.
    function refresh() {
        const $box = $('.chat-box');
        if (!enabled()) {
            $box.find('.message-actions').remove();
            return;
        }
        const { sent, editable } = sentMessages(openHistory());
        $box.find('.user-message[data-message-id]').each(function () {
            const id = this.getAttribute('data-message-id');
            let bar = barOf(this);
            if (!sent.has(id) || (editing && editing.id === id)) {
                if (bar) bar.remove();
                return;
            }
            const canEdit = editable.has(id) ? '1' : '0';
            if (bar && bar.getAttribute('data-edit') === canEdit) return;
            if (bar) bar.remove();
            $(this).append(`<div class="message-actions" data-edit="${canEdit}">`
                + `<button type="button" class="message-copy-btn" title="Copy message" aria-label="Copy message">${copyIcon}</button>`
                + (canEdit === '1' ? `<button type="button" class="message-edit-btn" title="Edit message" aria-label="Edit message">${pencilIcon}</button>` : '')
                + '</div>');
        });
    }

    // Not on phones, where a focus pops the keyboard up with nothing to type.
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
        if (!enabled() || pending) return;
        let carry = null;
        if (editing) {
            if (editing.id === id || editing.sending) return;
            // Another message's box closes, and what it held back comes along.
            carry = close();
        }
        const history = openHistory();
        const i = indexOf(history, id);
        const msg = bubble(id);
        const content = msg && msg.querySelector('.message-content');
        if (i < 0 || !isSentMessage(history[i]) || !content || !sentMessages(history).editable.has(id)) {
            refresh();
            return;
        }
        const original = history[i];

        // Stop a running build, so nothing changes while the user types.
        const hadBanner = $('.resume-banner-message').length > 0;
        const stopped = turnRunning() && !!window.stopTurnForEdit?.();
        window.clearResumeBanner?.();
        editing = {
            id, original: textOf(original.content), files: hasFiles(original.content),
            hint: hintFor(history, i),
            bannerBack: hadBanner || stopped || !!(carry && carry.bannerBack),
            bannerText: carry ? carry.bannerText : undefined,
            sending: false,
        };
        drawBox(editing, editing.original);
        window.announce?.((stopped ? 'Stopped. ' : '') + 'Edit your message, then send it to build again from there.'
            + (editing.hint ? ' ' + editing.hint : ''));
    }

    // The box, in place of the message's text, holding `text`.
    function drawBox(e, text) {
        const msg = bubble(e.id);
        const content = msg && msg.querySelector('.message-content');
        if (!content) return;
        const bar = barOf(msg);
        if (bar) bar.remove();
        msg.classList.add('editing');
        const $input = $('<textarea class="message-edit-input" rows="1" aria-label="Edit your message"></textarea>');
        $input.val(text);
        content.prepend($input[0]);
        $(content).append('<div class="message-edit-actions">'
            + (e.hint ? `<p class="message-edit-hint">${htmlEscape(e.hint)}</p>` : '')
            + '<button type="button" class="message-edit-cancel">Cancel</button>'
            + '<button type="button" class="message-edit-send">Send</button>'
            + '</div>');
        syncSend();
        const el = $input[0];
        resize(el);
        el.focus();
        el.setSelectionRange?.(el.value.length, el.value.length);
    }

    // ----- while an edit goes in -------------------------------------------------

    // The thinking dots, below the message (what came after it is hidden), with
    // `label` beside them when given.
    function showDots(label) {
        if (typeof showSpinner !== 'function') return;
        showSpinner();
        if (label) window.setSpinnerLabel?.(label);
    }
    function hideDots() {
        if (typeof fadeOutSpinner === 'function') fadeOutSpinner();
        else $('.chat-box .floating-spinner').remove();
    }

    // Send shows the edit at once. The box closes, the bubble shows the new
    // text, and what came after it is hidden, with the dots under it. The
    // conversation itself changes only once the files are back, and unstage
    // puts the chat back as it was if they can't be.
    function stage(e, text) {
        const msg = bubble(e.id);
        const content = msg && msg.querySelector('.message-content');
        if (!content) return;
        $(msg).find('.message-edit-input, .message-edit-actions').remove();
        msg.classList.remove('editing');
        const hidden = [];
        for (const n of [...content.children]) {
            if (n.classList.contains('attached-images')) continue;
            n.classList.add('message-edit-hidden');
            hidden.push(n);
        }
        for (let n = msg.nextElementSibling; n; n = n.nextElementSibling) {
            if (n.classList.contains('message-queue') || n.classList.contains('floating-spinner')) continue;
            n.classList.add('message-edit-hidden');
            hidden.push(n);
        }
        content.prepend($(`<div class="message-edit-staged">${text ? nl_to_p(htmlEscape(text)) : ''}</div>`)[0]);
        e.staged = { hidden };
        showDots();
    }
    function unstage(e, text) {
        const msg = bubble(e.id);
        if (!e.staged || !msg) return;
        $(msg).find('.message-edit-staged').remove();
        e.staged.hidden.forEach(n => n.classList.remove('message-edit-hidden'));
        e.staged = null;
        hideDots();
        drawBox(e, text);
    }

    // Puts the bubble back as it was. restoreBanner: the Resume banner the
    // editor took down (or the one a stopped build asked for meanwhile) comes
    // back.
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
        const id = editing.id;
        close({ restoreBanner: true });
        const msg = bubble(id);
        const btn = msg && msg.querySelector('.message-edit-btn');
        if (btn) btn.focus();
        else focusComposer();
    }

    // The message is no longer in the conversation. The edit goes to the
    // composer, ahead of anything typed there, to send as a new message.
    function moveToComposer(text) {
        close({ restoreBanner: true });
        if (text) {
            if (window.MessageQueue?.returnToComposer) window.MessageQueue.returnToComposer([{ text }]);
            else if (typeof applyDraftToComposer === 'function') applyDraftToComposer(text);
        }
        const say = 'That message is no longer in the conversation, so your edit is in the message box. Send it as a new message.';
        window.showToast?.(say, { type: 'info', key: 'message-edit-moved', duration: 6000 });
        window.announce?.(say);
        focusComposer();
    }

    function saveChat(interrupted) {
        if (typeof scheduleSaveCurrentChat !== 'function') return;
        scheduleSaveCurrentChat({ chatHistory: openHistory(), currentChatId: openChatId(), appDir: openAppDir(), interrupted });
    }

    // The chat drops what came after the message, and the bubble shows its new
    // text. The queued messages stay, last.
    function rewindChat(id, text) {
        const msg = bubble(id);
        if (!msg) return;
        msg.classList.remove('editing');
        $(msg).find('.message-edit-input, .message-edit-actions').remove();
        let dropped = false;
        for (let n = msg.nextElementSibling; n;) {
            const next = n.nextElementSibling;
            if (!n.classList.contains('message-queue') && !n.classList.contains('floating-spinner')) {
                if (n.classList.contains('todo-list')) dropped = true;
                n.remove();
            }
            n = next;
        }
        if (dropped) window.currentTodos = null;
        // A Publish card waiting above the composer, a clarifying question,
        // and the follow-up chips came after it too.
        window.ChatDock?.clear?.();
        window._activeClarification?.teardown?.();
        if (typeof clearContinueSuggestions === 'function') clearContinueSuggestions();
        const content = msg.querySelector('.message-content');
        if (content) {
            const files = content.querySelector('.attached-images');
            if (files) files.remove();
            $(content).html(text ? nl_to_p(htmlEscape(text)) : '');
            if (files) content.appendChild(files);
        }
    }

    async function send() {
        const e = editing;
        if (!e || e.sending) return;
        const el = inputOf(e);
        const text = String((el && el.value) || '').trim();
        if (!text && !e.files) return;
        if (indexOf(openHistory(), e.id) < 0) {
            moveToComposer(text);
            return;
        }
        const busy = busyReason();
        if (busy) {
            window.showToast?.(busy, { type: 'info', key: 'message-edit-busy', throttleMs: 3000 });
            return;
        }
        // A message sent from the composer while the box was open is building.
        // It stops, and leaves the chat with the rest of what came after.
        if (turnRunning()) window.stopTurnForEdit?.();
        e.sending = true;
        const chatId = openChatId();
        const appDir = openAppDir();
        stage(e, text);
        // The box is the user's again, with the chat as it was (the restore
        // said why, or this does).
        const callOff = (why) => {
            if (editing !== e) return;
            e.sending = false;
            unstage(e, text);
            if (why) window.showToast?.(why, { type: 'info', key: 'message-edit-busy', throttleMs: 3000 });
        };

        await settleTurns();
        if (editing !== e || openChatId() !== chatId) return;
        // The stopped build's teardown takes its dots down.
        showDots();
        let history = openHistory();
        let i = indexOf(history, e.id);
        if (i < 0) {
            e.sending = false;
            hideDots();
            moveToComposer(text);
            return;
        }
        const blocked = turnRunning() ? BUILD_BUSY : busyReason();
        if (blocked) {
            callOff(blocked);
            return;
        }

        // The project's files go back to the version the message was sent
        // with, when anything after it changed them.
        const original = history[i];
        let reverted = false;
        try {
            const now = await window.projectVersionNow?.(chatId, appDir);
            // Read once the snapshots queued before the ask have landed, so a
            // message still being built has its version on record by now.
            const base = original.baseVersion;
            if (now !== base) {
                if (editing === e) showDots(REVERTING);
                const r = await window.restoreProjectVersion?.(base);
                if (!r || !r.ok) {
                    callOff();
                    return;
                }
                reverted = true;
                const own = savedFiles(original.content);
                if (own.length && isVersion(r.from)) await window.copyFilesFromVersion?.(chatId, appDir, r.from, own);
            }
        } catch (err) {
            console.warn('Putting the files back for an edited message failed:', err);
            callOff();
            return;
        }
        // Another project opened meanwhile (its switch closed the box).
        if (editing !== e || openChatId() !== chatId) return;
        history = openHistory();
        i = indexOf(history, e.id);
        if (i < 0) {
            e.sending = false;
            hideDots();
            moveToComposer(text);
            return;
        }

        // The conversation goes back to just before the message, then the
        // message with its new text. A new array, so a late save of the old
        // one can't put it back.
        const message = { ...history[i], content: withText(history[i].content, text) };
        const out = history.slice(0, i);
        out.push(message);
        left.add(history);
        setHistory(out);
        editing = null;
        // The dots stay for the build, which says what it is doing next.
        window.setSpinnerLabel?.('');
        rewindChat(e.id, text);
        refresh();
        focusComposer();
        window.announce?.('Building again from your edited message.');
        // Saved now, as a build waiting to go. If the tab closes first, the
        // Resume banner builds from the edited message.
        saveChat(true);

        const p = pending = { chatId, id: e.id, began: false };
        Promise.resolve()
            .then(() => sendChatMessage(null, false, { edit: { messageId: e.id, reverted } }))
            .catch((err) => console.warn('Building from an edited message failed:', err))
            .finally(() => {
                if (p.began || pending !== p) return;
                // Called off before its turn began (the Code view couldn't
                // save, say). The edited message waits, with the Resume banner
                // to build from it.
                pending = null;
                if (openChatId() !== chatId) return;
                if (!turnRunning()) hideDots();
                window.showResumeBanner?.();
            });
    }

    // ----- copying -----------------------------------------------------------

    async function copy(btn) {
        const msg = btn.closest('.user-message');
        const id = msg && msg.getAttribute('data-message-id');
        const history = openHistory();
        const m = id ? history[indexOf(history, id)] : null;
        const content = msg && msg.querySelector('.message-content');
        const text = m ? requestText(m.content) : (content ? content.textContent : '');
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            window.showToast?.(COPY_FAILED, { type: 'info', key: 'message-copy-failed', throttleMs: 3000 });
            return;
        }
        btn.classList.add('copied');
        btn.setAttribute('title', 'Copied');
        $(btn).html(checkIcon);
        window.announce?.('Copied.');
        setTimeout(() => {
            btn.classList.remove('copied');
            btn.setAttribute('title', 'Copy message');
            $(btn).html(copyIcon);
        }, 1500);
    }

    // ----- sendChatMessage ---------------------------------------------------

    // Whether the edited message can be built from. It is still the last
    // message the user sent.
    function canBuild(history, id) {
        return lastSentId(history) === id;
    }

    // An edited message's turn begins. What its version label and analytics
    // need.
    function editTurn(history, edit) {
        const message = history[indexOf(history, edit.messageId)];
        if (pending && pending.id === edit.messageId) {
            pending.began = true;
            pending = null;
        }
        refresh();
        return { message, request: requestText(message.content), files: hasFiles(message.content) };
    }

    // Every other turn, as it begins, and as its message joins the conversation.
    function turnStarted() { refresh(); }
    function turnFor() { refresh(); }

    // A switch to another project. The chat it showed is gone.
    function reset() {
        editing = null;
        pending = null;
    }

    // While the editor is open or an edit is going in, a Resume banner waits
    // (Cancel brings it back, and the edit builds from the edited message
    // instead). True when held.
    function holdBanner(message) {
        if (editing) {
            editing.bannerBack = true;
            editing.bannerText = message;
            return true;
        }
        // The banner a stopped build asks for is about what the edit took out.
        // The edited message gets its own if its build doesn't go.
        return !!pending;
    }

    // ----- events ------------------------------------------------------------

    $(document).on('click', '.message-edit-btn', function () {
        const msg = this.closest('.user-message');
        if (msg) open(msg.getAttribute('data-message-id'));
    });
    $(document).on('click', '.message-copy-btn', function () { copy(this); });
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
        canBuild,
        editTurn,
        turnStarted,
        turnFor,
        reset,
        wasLeft: (history) => !!history && typeof history === 'object' && left.has(history),
        holdBanner,
        addNote,
        isOpen: () => !!editing || !!pending,
        isBusy: () => !!pending || !!(editing && editing.sending),
        // For the tests.
        _internals: { READ_ONLY_TOOLS, withText, textOf, requestText, hasFiles, savedFiles, changedSince, hintFor, open, cancel, send, copy, HINT_REVERT, HINT_AFTER, REVERTING, EDITABLE_LAST },
    };
})();
