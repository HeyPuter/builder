// message-edit.js — copy, edit and switch between versions of the messages the
// user sent.
//
// Under each message the user sent, a Copy and an Edit button show on hover
// (always on touch screens). Edit turns the message into a box to change it in
// place. Opening it stops a running build, so nothing changes while the user
// types. Send puts the new text in (the message's files, pasted text and
// picked element stay) and builds again from there.
//
// Every message keeps the version of the project's files it was sent with
// (baseVersion, recorded by sendChatMessage through projectVersionNow in
// versions.js). When anything after the message changed the files, Send puts
// them back to that version first, the way the Versions panel restores one,
// and brings back the files the message itself was sent with. A message sent
// before this was kept has no version on record, so the files stay as they
// are, the user is told so in the box, and the AI gets a note saying so.
//
// Nothing is lost by an edit. The conversation from the message on stays as
// another version of the message, with the version of the files it had got
// to (head), and arrows under the message switch between its versions. A
// switch puts that version's files back too, after saving the ones it leaves
// as a version of their own if they changed since. The versions not showing
// are kept with the chat (chat.branches, saved by saveCurrentChat):
//     { [group]: { active, variants: [{ tail, head, interrupted } | null] } }
// where group is the first version's message id, each version of the message
// carries it as branchGroup, `active` is the one in the conversation (its
// entry is null), and a tail is the conversation from that version of the
// message on.
//
// The conversation is never cut short in place. An edit or a switch puts a
// new array in its place, and the old one is marked left (wasLeft), so a
// turn stopped for the edit and still unwinding can't save it back.
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

    const svg = (body, size = 15) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
    const pencilIcon = svg('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>');
    const copyIcon = svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>');
    const checkIcon = svg('<polyline points="20 6 9 17 4 12"/>');
    const prevIcon = svg('<polyline points="15 18 9 12 15 6"/>', 14);
    const nextIcon = svg('<polyline points="9 18 15 12 9 6"/>', 14);

    // What the box says Send will do to the app.
    const HINT_REVERT = 'Your app goes back to how it was before this message. The current version stays, and you can switch back to it.';
    const HINT_KEPT = 'Your app stays as it is now. What came after this message stays, and you can switch back to it.';
    const HINT_AFTER = 'What came after this message stays, and you can switch back to it.';
    // For the AI, on an edited message whose files couldn't be put back.
    const KEPT_NOTE = '[The user edited this message after the conversation had gone on. The project\'s files were not put back to how they were when it was first sent, so they may include changes made after it. Check the files before relying on what the conversation says about them.]';
    const NO_FILES = 'Your app stays as it is now. The builder has no saved copy of how this version left it.';
    const COPY_FAILED = 'Couldn’t copy the message. Select its text and copy it instead.';
    const SWITCH_BUSY = 'Wait for the build to finish, or stop it, then switch versions.';
    const BUILD_BUSY = 'Wait for the build to finish, or stop it, then try again.';

    // The open editor: { id, original, files, hint, bannerBack, bannerText,
    // sending }. One at a time.
    let editing = null;
    // An edit sent, from the moment the conversation changes until its turn
    // begins or is called off: { chatId, id (the new version's message id) }.
    let pending = null;
    // True while the chat switches to another version of a message.
    let switching = false;
    // The open chat's other versions (see the top of this file), and the chat
    // they belong to.
    let branches = null;
    let branchesChatId = null;
    // Conversations an edit or a switch put a new array in place of.
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
    function newMessageId() {
        return typeof generateMessageId === 'function'
            ? generateMessageId()
            : 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
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
    // A hidden note added to a message (the Code view's hand edits, or
    // KEPT_NOTE).
    function addNote(message, note) {
        if (!message || !note) return;
        const parts = typeof message.content === 'string'
            ? (message.content ? [{ type: 'text', text: message.content }] : [])
            : blocks(message.content).slice();
        parts.push({ type: 'text-hidden', text: note });
        message.content = parts;
    }

    // What Send will do to the app, for the box's hint.
    function hintFor(history, i) {
        const m = history[i];
        const changed = changedSince(history, i);
        if (changed && isVersion(m.baseVersion)) return HINT_REVERT;
        if (changed) return HINT_KEPT;
        return anythingAfter(history, i) ? HINT_AFTER : '';
    }

    // ----- versions of a message ----------------------------------------------

    function groupOf(m) {
        if (!m || !m.branchGroup || !branches || branchesChatId !== openChatId()) return null;
        const g = branches[m.branchGroup];
        return g && Array.isArray(g.variants) && g.variants.length > 1 ? g : null;
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

    function barHTML(m, g) {
        let nav = '';
        if (g) {
            const n = g.variants.length;
            const at = g.active + 1;
            nav = '<div class="message-branch-nav" role="group" aria-label="Versions of this message">'
                + `<button type="button" class="message-branch-prev" title="Previous version" aria-label="Previous version"${at <= 1 || switching ? ' disabled' : ''}>${prevIcon}</button>`
                + `<span class="message-branch-count">${at} / ${n}</span>`
                + `<button type="button" class="message-branch-next" title="Next version" aria-label="Next version"${at >= n || switching ? ' disabled' : ''}>${nextIcon}</button>`
                + '</div>';
        }
        return nav
            + `<button type="button" class="message-copy-btn" title="Copy message" aria-label="Copy message">${copyIcon}</button>`
            + `<button type="button" class="message-edit-btn" title="Edit message" aria-label="Edit message">${pencilIcon}</button>`;
    }

    // Puts Copy, Edit and the version arrows under every message the user
    // sent, as the conversation stands. A bar already right is left alone, so
    // keyboard focus on it survives the refresh every AI call makes.
    function refresh() {
        const $box = $('.chat-box');
        if (!enabled()) {
            $box.find('.message-actions').remove();
            return;
        }
        const byId = new Map();
        for (const m of openHistory()) if (isSentMessage(m)) byId.set(m.messageId, m);
        $box.find('.user-message[data-message-id]').each(function () {
            const id = this.getAttribute('data-message-id');
            const m = byId.get(id);
            let bar = barOf(this);
            if (!m || (editing && editing.id === id)) {
                if (bar) bar.remove();
                return;
            }
            const g = groupOf(m);
            const sig = g ? `${g.active}/${g.variants.length}/${switching ? 1 : 0}` : '-';
            if (bar && bar.getAttribute('data-sig') === sig) return;
            const focused = bar && bar.contains(document.activeElement) ? document.activeElement.className : null;
            if (!bar) {
                bar = document.createElement('div');
                bar.className = 'message-actions';
                this.appendChild(bar);
            }
            bar.setAttribute('data-sig', sig);
            bar.classList.toggle('has-versions', !!g);
            $(bar).html(barHTML(m, g));
            if (focused) {
                const again = bar.querySelector('.' + String(focused).split(' ')[0]);
                if (again && !again.disabled) again.focus();
            }
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

    function open(id, { text, carry } = {}) {
        if (!enabled() || switching || pending) return;
        if (editing) {
            if (editing.id === id || editing.sending) return;
            // Another message's box closes, and what it held back comes along.
            carry = close();
        }
        const history = openHistory();
        const i = indexOf(history, id);
        const msg = bubble(id);
        const content = msg && msg.querySelector('.message-content');
        if (i < 0 || !isSentMessage(history[i]) || !content) {
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
        const bar = barOf(msg);
        if (bar) bar.remove();
        msg.classList.add('editing');
        const $input = $('<textarea class="message-edit-input" rows="1" aria-label="Edit your message"></textarea>');
        $input.val(text != null ? text : editing.original);
        content.prepend($input[0]);
        $(content).append('<div class="message-edit-actions">'
            + (editing.hint ? `<p class="message-edit-hint">${htmlEscape(editing.hint)}</p>` : '')
            + '<button type="button" class="message-edit-cancel">Cancel</button>'
            + '<button type="button" class="message-edit-send">Send</button>'
            + '</div>');
        syncSend();
        const el = $input[0];
        resize(el);
        el.focus();
        el.setSelectionRange?.(el.value.length, el.value.length);
        window.announce?.((stopped ? 'Stopped. ' : '') + 'Edit your message, then send it to build again from there.'
            + (editing.hint ? ' ' + editing.hint : ''));
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

    // The edit can't go in where it was. Its text goes to the composer, ahead
    // of anything typed there, to send as a new message.
    function moveToComposer(text, why) {
        close({ restoreBanner: true });
        if (text) {
            if (window.MessageQueue?.returnToComposer) window.MessageQueue.returnToComposer([{ text }]);
            else if (typeof applyDraftToComposer === 'function') applyDraftToComposer(text);
        }
        const say = why || 'That message is no longer in the conversation, so your edit is in the message box. Send it as a new message.';
        window.showToast?.(say, { type: 'info', key: 'message-edit-moved', duration: 6000 });
        window.announce?.(say);
        focusComposer();
    }

    function saveChat(interrupted) {
        if (typeof scheduleSaveCurrentChat !== 'function') return;
        scheduleSaveCurrentChat({ chatHistory: openHistory(), currentChatId: openChatId(), appDir: openAppDir(), interrupted });
    }

    // The chat drops what came after the message, and the bubble shows its new
    // text under its new id. The queued messages stay, last.
    function rewindChat(oldId, message, text) {
        const msg = bubble(oldId);
        if (!msg) return;
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
        // A Publish card waiting above the composer, a clarifying question,
        // and the follow-up chips came after it too.
        window.ChatDock?.clear?.();
        window._activeClarification?.teardown?.();
        if (typeof clearContinueSuggestions === 'function') clearContinueSuggestions();
        msg.setAttribute('data-message-id', message.messageId);
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
        // It stops, and goes into the version this edit leaves.
        if (turnRunning()) window.stopTurnForEdit?.();
        e.sending = true;
        const msg = bubble(e.id);
        if (msg) $(msg).find('.message-edit-input, .message-edit-cancel').prop('disabled', true);
        syncSend();
        const chatId = openChatId();
        const appDir = openAppDir();

        await settleTurns();
        if (editing !== e || openChatId() !== chatId) return;
        const history = openHistory();
        const i = indexOf(history, e.id);
        const blocked = i < 0 ? 'gone' : (turnRunning() ? 'turn' : busyReason());
        if (blocked) {
            e.sending = false;
            if (msg) $(msg).find('.message-edit-input, .message-edit-cancel').prop('disabled', false);
            syncSend();
            if (i < 0) moveToComposer(text);
            else window.showToast?.(blocked === 'turn' ? BUILD_BUSY : blocked, { type: 'info', key: 'message-edit-busy', throttleMs: 3000 });
            return;
        }

        // The conversation goes back to just before the message, then the
        // message with its new text, at once. What came after it is kept as
        // the version this leaves.
        const original = history[i];
        const changed = changedSince(history, i);
        const group = original.branchGroup || original.messageId;
        const message = { ...original, messageId: newMessageId(), branchGroup: group, content: withText(original.content, text) };
        delete message.baseVersion;
        original.branchGroup = group;
        if (!branches || branchesChatId !== chatId) { branches = {}; branchesChatId = chatId; }
        const g = branches[group] || (branches[group] = { active: 0, variants: [null] });
        const leaving = g.active;
        const stash = { tail: history.slice(i), head: null, interrupted: !!e.bannerBack };
        g.variants[leaving] = stash;
        g.variants.push(null);
        g.active = g.variants.length - 1;
        const out = history.slice(0, i);
        out.push(message);
        left.add(history);
        setHistory(out);
        pending = { chatId, id: message.messageId };
        editing = null;
        if (msg) {
            msg.classList.remove('editing');
            $(msg).find('.message-edit-input, .message-edit-actions').remove();
        }
        rewindChat(e.id, message, text);
        refresh();
        focusComposer();
        window.announce?.('Building again from your edited message.');
        // Saved now, as a build waiting to go. If the tab closes first, the
        // Resume banner builds from the edited message.
        saveChat(true);

        // The project's files go back to the version the message was sent
        // with, and the version left keeps the files it had got to.
        let reverted = false;
        let head = null;
        try {
            const now = await window.projectVersionNow?.(chatId, appDir);
            // Read once the snapshots queued before the ask have landed, so a
            // message still being built has its version on record by now.
            const base = original.baseVersion;
            if (isVersion(base)) message.baseVersion = base;
            if (isVersion(base) && now !== base) {
                const r = await window.restoreProjectVersion?.(base);
                if (!r || !r.ok) {
                    await putBack({ chatId, history, out, group, leaving, e, text, stash });
                    return;
                }
                reverted = true;
                head = r.from || null;
                const own = savedFiles(original.content);
                if (own.length && isVersion(head)) await window.copyFilesFromVersion?.(chatId, appDir, head, own);
            } else {
                head = isVersion(now) ? now : null;
                // Files no version holds are saved as one, so this version
                // can come back to them.
                if (!head && typeof window.createProjectVersion === 'function') {
                    const v = await window.createProjectVersion({ chatId, appDir, label: 'Before edit' });
                    if (isVersion(v)) head = v;
                }
                // Sent before versions were kept with messages. It goes with
                // the files as they are now, and the AI is told when those
                // include later changes.
                if (!isVersion(base)) {
                    if (changed) addNote(message, KEPT_NOTE);
                    if (isVersion(head)) message.baseVersion = head;
                }
            }
        } catch (err) {
            console.warn('Putting the files back for an edited message failed:', err);
        }
        stash.head = head;
        if (!pending || pending.id !== message.messageId || openChatId() !== chatId || openHistory() !== out) {
            // The user opened another project meanwhile. The edit is saved
            // with its chat, and the Resume banner builds from it there.
            if (pending && pending.id === message.messageId) pending = null;
            return;
        }
        saveChat(true);
        let began = false;
        const p = pending;
        p.began = () => { began = true; };
        Promise.resolve()
            .then(() => sendChatMessage(null, false, { edit: { messageId: message.messageId, reverted } }))
            .catch((err) => console.warn('Building from an edited message failed:', err))
            .finally(() => {
                if (began || pending !== p) return;
                // Called off before its turn began (the Code view couldn't
                // save, say). The edited message waits, with the Resume banner
                // to build from it.
                pending = null;
                refresh();
                if (openChatId() === chatId) window.showResumeBanner?.();
            });
    }

    // The files couldn't be put back (the restore said why). The conversation
    // goes back to how it was, and the box opens again with the edit in it.
    async function putBack({ chatId, history, out, group, leaving, e, text, stash }) {
        if (pending && pending.chatId === chatId) pending = null;
        if (openChatId() !== chatId || openHistory() !== out) return;
        const g = branches && branches[group];
        if (g) {
            g.variants.pop();
            g.variants[leaving] = null;
            g.active = leaving;
            if (g.variants.length < 2) delete branches[group];
        }
        left.delete(history);
        setHistory(history);
        await redraw(history, false);
        saveChat(!!stash.interrupted);
        open(e.id, { text, carry: e });
    }

    // ----- switching versions ----------------------------------------------------

    // Draws the conversation again, as opening the project does, keeping the
    // queued messages and the scroll position.
    async function redraw(history, interrupted) {
        const $box = $('.chat-box');
        const box = $box[0];
        const scroll = box ? box.scrollTop : 0;
        const queue = box ? Array.from(box.children).filter(c => c.classList.contains('message-queue')) : [];
        queue.forEach(q => q.remove());
        $box.empty();
        if (typeof revokeChatMediaBlobURLs === 'function') revokeChatMediaBlobURLs();
        window.currentTodos = null;
        window.ChatDock?.clear?.();
        if (typeof clearContinueSuggestions === 'function') clearContinueSuggestions();
        const chatId = openChatId();
        if (typeof window.renderChatHistory === 'function') {
            await window.renderChatHistory(history, () => openChatId() !== chatId || openHistory() !== history);
        }
        if (openChatId() !== chatId || openHistory() !== history) return;
        queue.forEach(q => box.appendChild(q));
        window.clearResumeBanner?.();
        if (interrupted) window.showResumeBanner?.();
        window.restorePublishDock?.();
        refresh();
        if (box) box.scrollTop = scroll;
    }

    async function switchTo(id, step) {
        if (!enabled() || switching || pending || editing) return;
        if (turnRunning()) {
            window.showToast?.(SWITCH_BUSY, { type: 'info', key: 'message-edit-busy', throttleMs: 3000 });
            return;
        }
        const busy = busyReason();
        if (busy) {
            window.showToast?.(busy, { type: 'info', key: 'message-edit-busy', throttleMs: 3000 });
            return;
        }
        const history = openHistory();
        const i = indexOf(history, id);
        const g = i >= 0 ? groupOf(history[i]) : null;
        const target = g ? g.active + step : -1;
        const v = g && target >= 0 && target < g.variants.length ? g.variants[target] : null;
        if (!v) return;
        const chatId = openChatId();
        const appDir = openAppDir();
        const bannerUp = $('.resume-banner-message').length > 0;
        switching = true;
        refresh();
        try {
            await settleTurns();
            if (openChatId() !== chatId || openHistory() !== history || turnRunning() || busyReason()) return;
            const now = await window.projectVersionNow?.(chatId, appDir);
            const at = indexOf(history, id);
            if (openChatId() !== chatId || openHistory() !== history || turnRunning() || at < 0) return;
            // The conversation switches first, then the files follow. If
            // another project opens while they go back, this chat is saved
            // showing the version its files are going back to.
            const out = history.slice(0, at).concat(v.tail);
            const leaving = g.active;
            const stash = { tail: history.slice(at), head: isVersion(now) ? now : null, interrupted: bannerUp };
            g.variants[leaving] = stash;
            g.variants[target] = null;
            g.active = target;
            left.add(history);
            setHistory(out);
            saveChat(!!v.interrupted);
            const drawn = redraw(out, !!v.interrupted);
            let noFiles = false;
            if (isVersion(v.head) && v.head !== now) {
                const r = await window.restoreProjectVersion?.(v.head);
                if (!r || !r.ok) {
                    // The files stayed (the restore said why), so the
                    // conversation goes back to the version they still match.
                    await drawn;
                    if (openChatId() === chatId && openHistory() === out) {
                        g.variants[target] = v;
                        g.variants[leaving] = null;
                        g.active = leaving;
                        left.delete(history);
                        setHistory(history);
                        await redraw(history, bannerUp);
                        saveChat(bannerUp);
                    }
                    return;
                }
                stash.head = r.from || null;
            } else if (!isVersion(v.head)) {
                noFiles = true;
            }
            // Files no version holds are saved as one, so the version left
            // can come back to them.
            if (!isVersion(stash.head) && noFiles && typeof window.createProjectVersion === 'function') {
                const pinned = await window.createProjectVersion({ chatId, appDir, label: 'Before switching' });
                if (isVersion(pinned)) stash.head = pinned;
            }
            await drawn;
            if (openChatId() !== chatId || openHistory() !== out) return;
            if (stash.head !== (isVersion(now) ? now : null)) saveChat(!!v.interrupted);
            switching = false;
            refresh();
            const now2 = bubble(v.tail[0] && v.tail[0].messageId);
            const btn = now2 && now2.querySelector(step < 0 ? '.message-branch-prev' : '.message-branch-next');
            const focusTo = btn && !btn.disabled ? btn
                : (now2 ? [...now2.querySelectorAll('.message-branch-nav button')].find(b => !b.disabled) : null);
            if (focusTo) focusTo.focus();
            window.announce?.(`Version ${target + 1} of ${g.variants.length}.`);
            if (noFiles) window.showToast?.(NO_FILES, { type: 'info', key: 'message-edit-no-files', duration: 6000 });
        } catch (err) {
            console.warn('Switching versions failed:', err);
        } finally {
            switching = false;
            refresh();
        }
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
        const i = indexOf(history, edit.messageId);
        const message = history[i];
        if (pending && pending.id === edit.messageId) {
            const p = pending;
            pending = null;
            if (typeof p.began === 'function') p.began();
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
        branches = null;
        branchesChatId = null;
    }

    // loadChat, as a chat becomes the open one.
    function loadBranches(chatId, data) {
        branchesChatId = chatId;
        branches = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    }

    // What saveCurrentChat keeps for a chat. The open chat's versions, none for
    // a conversation with no edited message, or undefined for the file's own.
    function branchesFor(chatId, history) {
        if (chatId && chatId === branchesChatId && branches) return branches;
        if (!Array.isArray(history) || !history.some(m => m && m.branchGroup)) return {};
        return undefined;
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
        // The banner a stopped build asks for is about the conversation the
        // edit left. The edited message gets its own if its build doesn't go.
        return !!pending;
    }

    // ----- events ------------------------------------------------------------

    $(document).on('click', '.message-edit-btn', function () {
        const msg = this.closest('.user-message');
        if (msg) open(msg.getAttribute('data-message-id'));
    });
    $(document).on('click', '.message-copy-btn', function () { copy(this); });
    $(document).on('click', '.message-branch-prev, .message-branch-next', function () {
        const msg = this.closest('.user-message');
        if (msg && !this.disabled) switchTo(msg.getAttribute('data-message-id'), this.classList.contains('message-branch-prev') ? -1 : 1);
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
        canBuild,
        editTurn,
        turnStarted,
        turnFor,
        reset,
        loadBranches,
        branchesFor,
        wasLeft: (history) => !!history && typeof history === 'object' && left.has(history),
        holdBanner,
        addNote,
        isOpen: () => !!editing || !!pending,
        isBusy: () => !!pending || switching || !!(editing && editing.sending),
        // For the tests.
        _internals: { READ_ONLY_TOOLS, withText, textOf, requestText, hasFiles, savedFiles, changedSince, hintFor, open, cancel, send, switchTo, copy, HINT_REVERT, HINT_KEPT, HINT_AFTER, KEPT_NOTE },
    };
})();
