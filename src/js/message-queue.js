// message-queue.js — messages the user sends while a turn is running.
//
// The composer stays usable during a turn. Enter, or the Stop button, which
// turns into a send arrow once there is something to send, moves what the
// composer holds (its text, its staged files and the element picked with
// click-to-edit) into a queue. Queued messages show at the bottom of the chat
// as the user's own messages, each with Edit, Remove and Send now. When the
// turn finishes cleanly, sendChatMessage hands the first queued message to the
// next turn, and so on, one message per turn. Stop overrides what Puter is
// doing: it ends the running turn and the next queued message goes at once.
// Send now does the same for the message it belongs to. The rest stay queued
// behind it either way. A turn that ends on its own without finishing (an
// error card, running out of retries or credits) sends nothing more and puts
// the queued messages back in the composer, since the next one would likely
// fail the same way.
//
// The queue belongs to the open project and only lives while a turn runs
// there. Its text is part of the project's composer draft (saveComposerDraft
// reads withQueuedText), so a reload or a switch to another project mid-build
// brings it back in the composer, the same way a Stop does. Files and the
// picked element are kept in memory only, like the attachment tray.
//
// FEATURE_FLAGS.messageQueue turns it off. The composer is then locked for the
// whole turn, as before (see lockComposerForTurn in helpers.js).

(function () {
    'use strict';

    // [{ id, text, attachments, editTarget }], oldest first.
    let queue = [];
    // The message handed to sendChatMessage that is still in its setup. It is
    // shown as sending and stays in the draft until the send claims it.
    let pending = null;
    let nextId = 1;
    // Keeps the queued messages below everything the running turn adds to the
    // chat (see keepAtBottom).
    let pinObserver = null;

    const clockIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>';
    const pointerIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 9l5 12 1.8-5.2L21 14Z"/><path d="M7.2 2.2 8 5.1"/><path d="m5.1 8-2.9-.8"/><path d="M14 4.1 12 6"/><path d="m6 12-1.9 2"/></svg>';
    const pencilIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
    const closeIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    function enabled() {
        return !!(window.FEATURE_FLAGS && window.FEATURE_FLAGS.messageQueue);
    }
    function turnRunning() {
        return typeof isProcessing !== 'undefined' && isProcessing;
    }
    function composerText() {
        return $('.chat-input-message').val() || '';
    }
    function stagedCount() {
        return (window.attachedImages && window.attachedImages.length) || 0;
    }
    function hasComposerContent() {
        return composerText().trim().length > 0 || stagedCount() > 0;
    }
    function waiting() {
        return pending ? [pending, ...queue] : queue;
    }
    function revokeFiles(item) {
        for (const a of (item && item.attachments) || []) {
            if (typeof revokeAttachmentURL === 'function') revokeAttachmentURL(a);
        }
    }
    function scrollChatToEnd() {
        const box = $('.chat-box')[0];
        if (box) box.scrollTop = box.scrollHeight;
        window.shouldAutoScroll = true;
    }

    // Whether a send from the composer joins the queue right now: a turn is
    // running, or a queued message is still setting up its own. A
    // clarifying-questions card takes the composer's text as its answer
    // instead (sendChatMessage routes it there).
    function takesComposerSend() {
        if (!enabled() || window._activeClarification) return false;
        return turnRunning() || !!pending;
    }

    // What the composer holds, as a queue item. Empties the composer, the
    // tray and the picked element.
    function takeComposer() {
        const text = composerText().trim();
        const attachments = typeof window.takeAttachments === 'function' ? window.takeAttachments() : [];
        let editTarget = null;
        if (window.FEATURE_FLAGS.clickToEdit && window._pendingEditTarget) {
            editTarget = window._pendingEditTarget;
            window.clearEditTarget?.();
        }
        applyDraftToComposer('');
        return { id: nextId++, text, attachments, editTarget };
    }

    // Enter mid-turn. Returns false when there was nothing to queue.
    function enqueueFromComposer() {
        if (!takesComposerSend() || !hasComposerContent()) return false;
        queue.push(takeComposer());
        saveComposerDraft();
        render();
        scrollChatToEnd();
        window.announce?.('Message queued. It sends when Puter finishes.');
        return true;
    }

    // Stop, with messages queued: sendChatMessage has stopped the turn, and
    // the next queued message takes its place. False when nothing is queued
    // (or one is already on its way), and Stop is a plain stop.
    function sendNext() {
        if (!queue.length || pending) return false;
        start(queue.shift());
        scrollChatToEnd();
        return true;
    }

    function sendNow(id) {
        const i = queue.findIndex(item => item.id === id);
        if (i < 0) return;
        const [item] = queue.splice(i, 1);
        startNow(item);
    }

    // Stop the running turn and send this message in its place. The rest of
    // the queue waits for the new turn. With a queued message already on its
    // way (no turn to stop yet), this one goes right after it.
    function startNow(item) {
        if (pending) {
            queue.unshift(item);
            saveComposerDraft();
            render();
            return;
        }
        if (turnRunning()) window.stopActiveTurn?.();
        start(item);
        scrollChatToEnd();
    }

    function start(item) {
        pending = item;
        saveComposerDraft();
        render();
        sendChatMessage(null, false, { queued: item })
            .catch((e) => console.warn('Sending a queued message failed:', e))
            .finally(() => {
                // Still unclaimed: the send was called off before its turn
                // started (a restore or a publish began, the Code view could
                // not save). No turn is left to wait for, so the rest of the
                // queue goes back to the composer with it.
                if (pending === item) {
                    pending = null;
                    returnToComposer([item, ...queue.splice(0)]);
                }
            });
    }

    // Put messages back in the composer, ahead of whatever it holds now. Their
    // text comes first, oldest first, then the text already in the box. Their
    // files go to the front of the tray. A picked element comes back only
    // when no other one is picked, since the composer holds one at a time.
    function returnToComposer(items) {
        items = (items || []).filter(Boolean);
        const texts = items.map(i => i.text || '').filter(t => t.trim());
        const nothing = !texts.length && !items.some(i => (i.attachments || []).length || i.editTarget);
        if (nothing) {
            render();
            return;
        }
        if (texts.length) {
            const typed = composerText();
            if (typed.trim()) texts.push(typed);
            applyDraftToComposer(texts.join('\n\n'));
        }
        const files = items.flatMap(i => i.attachments || []);
        if (files.length && typeof window.returnAttachments === 'function') window.returnAttachments(files);
        if (window.FEATURE_FLAGS?.clickToEdit && !window._pendingEditTarget) {
            const picked = items.find(i => i.editTarget);
            if (picked) window.setEditTarget?.(picked.editTarget, { quiet: true });
        }
        saveComposerDraft();
        render();
    }

    // Everything waiting goes back in the composer and nothing more is sent.
    // notify: say so, for the paths where the box filling up on its own would
    // otherwise look like the messages were lost or sent.
    function returnAll({ notify = false } = {}) {
        const items = waiting();
        queue = [];
        pending = null;
        if (!items.length) return;
        returnToComposer(items);
        if (notify) {
            const msg = items.length === 1
                ? 'Your queued message is back in the box.'
                : `Your ${items.length} queued messages are back in the box.`;
            window.showToast?.(msg, { type: 'info', key: 'queue-returned', duration: 4000 });
            window.announce?.(msg);
        }
    }

    // sendChatMessage, once a turn in the open project has ended and no newer
    // one has started. succeeded: it finished cleanly. Returns true when a
    // queued message is starting the next turn: the next one in line, sent
    // here, or one that stopped this turn (Stop, Send now) and is still
    // setting up.
    function afterTurn(succeeded) {
        if (pending) return true;
        if (!queue.length) return false;
        if (!succeeded) {
            returnAll({ notify: true });
            return false;
        }
        start(queue.shift());
        return true;
    }

    // sendChatMessage, at the point a queued send becomes its turn. False when
    // the queue no longer holds it (a switch to another project emptied it
    // during the setup), and the send must be called off.
    function claim(item) {
        if (!item || pending !== item) return false;
        pending = null;
        saveComposerDraft();
        render();
        return true;
    }

    // A switch to another project. The queued text is already in the leaving
    // project's draft, so the composer brings it back there. The files are
    // dropped, like the tray's.
    function reset() {
        for (const item of waiting()) revokeFiles(item);
        queue = [];
        pending = null;
        render();
    }

    // The composer draft is the waiting messages followed by the typed text,
    // which is what the composer shows once they come back to it.
    function withQueuedText(typed) {
        const texts = waiting().map(i => i.text || '').filter(t => t.trim());
        if (!texts.length) return typed;
        if (typed.trim()) texts.push(typed);
        return texts.join('\n\n');
    }

    function remove(id) {
        const i = queue.findIndex(item => item.id === id);
        if (i < 0) return;
        const [item] = queue.splice(i, 1);
        revokeFiles(item);
        saveComposerDraft();
        render();
        window.announce?.('Removed from the queue.');
    }

    function edit(id) {
        const i = queue.findIndex(item => item.id === id);
        if (i < 0) return;
        const [item] = queue.splice(i, 1);
        returnToComposer([item]);
        if (!window.isMobileViewport()) {
            const el = $('.chat-input-message')[0];
            if (el) {
                el.focus();
                el.setSelectionRange(el.value.length, el.value.length);
            }
        }
    }

    // One queued message, drawn like the user's own message, with its actions
    // under it.
    function rowHTML(item, sending) {
        let h = `<div class="queued-message${sending ? ' sending' : ''}" role="listitem" data-id="${item.id}">`;
        h += '<div class="queued-message-bubble">';
        if (item.text) h += nl_to_p(htmlEscape(item.text));
        const files = item.attachments || [];
        if (files.length) {
            // The same markup as the sent message's bubble (see sendChatMessage).
            h += '<div class="attached-images">' + files.map(a => (a.type || '').startsWith('image/') && a.blobURL
                ? `<img src="${htmlEscape(a.blobURL)}" alt="${htmlEscape(a.name)}" class="message-image">`
                : `<div class="attached-document">📄 ${htmlEscape(a.relPath || a.name)}</div>`).join('') + '</div>';
        }
        if (item.editTarget) {
            const label = typeof editTargetLabel === 'function'
                ? editTargetLabel(item.editTarget)
                : '<code>' + htmlEscape('<' + (item.editTarget.tag || 'element') + '>') + '</code>';
            h += `<div class="queued-message-target">${pointerIcon}<span>Editing ${label}</span></div>`;
        }
        h += '</div>';
        h += '<div class="queued-message-bar">';
        h += `<span class="queued-message-state">${clockIcon}${sending ? 'Sending…' : 'Queued'}</span>`;
        if (!sending) {
            h += `<button type="button" class="queued-message-icon" data-action="edit" title="Edit" aria-label="Edit queued message">${pencilIcon}</button>`;
            h += `<button type="button" class="queued-message-icon" data-action="remove" title="Remove" aria-label="Remove queued message">${closeIcon}</button>`;
            h += `<button type="button" class="queued-message-send-now" data-action="send-now" title="Stop the current reply and send this now">Send now</button>`;
        }
        return h + '</div></div>';
    }

    // The running turn keeps adding to the chat (its replies, tool cards, a
    // clarifying-questions card). Whatever lands after the queued messages is
    // moved above them, so they stay last, like messages not yet sent.
    function keepAtBottom(list, box) {
        if (pinObserver && pinObserver._list === list) return;
        stopKeepingAtBottom();
        if (typeof MutationObserver !== 'function') return;
        pinObserver = new MutationObserver(() => {
            if (list.parentNode !== box) {
                stopKeepingAtBottom();
                return;
            }
            if (box.lastElementChild === list) return;
            const active = document.activeElement;
            const hadFocus = !!active && list.contains(active);
            box.appendChild(list);
            if (hadFocus) active.focus({ preventScroll: true });
        });
        pinObserver._list = list;
        pinObserver.observe(box, { childList: true });
    }
    function stopKeepingAtBottom() {
        if (pinObserver) pinObserver.disconnect();
        pinObserver = null;
    }

    function render() {
        const items = waiting();
        const $box = $('.chat-box');
        let $list = $box.children('.message-queue');
        if (!items.length || !$box.length) {
            $list.remove();
            stopKeepingAtBottom();
            syncButton();
            return;
        }
        const box = $box[0];
        const wasNearBottom = typeof chatBoxNearBottom === 'function' && chatBoxNearBottom(box);
        // Keep keyboard focus on the same row's control across the redraw.
        let focusAction = null;
        let focusIndex = -1;
        const active = document.activeElement;
        if ($list.length && active && $list[0].contains(active)) {
            focusAction = $(active).attr('data-action') || null;
            focusIndex = $list.find('.queued-message').index($(active).closest('.queued-message'));
        }
        if (!$list.length) {
            $list = $('<div class="message-queue" role="list" aria-label="Queued messages"></div>');
            $box.append($list);
        }
        $list.html(items.map(item => rowHTML(item, item === pending)).join(''));
        keepAtBottom($list[0], box);
        if (focusAction) {
            const $row = $list.find('.queued-message').eq(Math.max(0, focusIndex));
            let $target = $row.find(`[data-action="${focusAction}"]`);
            if (!$target.length) $target = $row.find('[data-action]').first();
            if ($target.length) $target[0].focus({ preventScroll: true });
            else if (!window.isMobileViewport()) $('.chat-input-message').focus();
        }
        // A new or longer message shouldn't push the latest reply out of view
        // for someone reading at the bottom.
        if (wasNearBottom) box.scrollTop = box.scrollHeight;
        syncButton();
    }

    // While a turn runs, the Send button is Stop, and it turns into the queue
    // arrow while the composer holds something to queue: one button, never
    // both. Called wherever the composer's content or the turn state changes
    // (updateSendButtonState, the composer input handler, the tray), and
    // redraws only when the button should change.
    function syncButton() {
        const content = hasComposerContent();
        const $send = $('.send');
        if (!$send.length) return;
        // Outside a turn, or with a clarifying-questions card open,
        // updateSendButtonState has drawn the button already.
        const running = turnRunning() && !window._activeClarification;
        const queueing = running && enabled() && content;
        $send.toggleClass('queueing', queueing);
        if (!running) return;
        const label = queueing ? 'Queue message' : 'Stop';
        if ($send.attr('aria-label') === label) return;
        $send.html(queueing ? send_svg : stop_svg).attr({ title: label, 'aria-label': label });
    }

    // When the arrow was last clicked: see handleSendClick.
    let queuedAt = 0;

    // The Send button's click. True when this module took it: the button was
    // the queue arrow, or this is a second click right after one. The button
    // is Stop again by then, and a double click must not stop the build.
    function handleSendClick() {
        if ($('.send').hasClass('queueing')) {
            enqueueFromComposer();
            queuedAt = Date.now();
            // Back to the box for the next message.
            if (!window.isMobileViewport()) $('.chat-input-message').focus();
            return true;
        }
        return Date.now() - queuedAt < 600;
    }
    $(document).on('click', '.queued-message [data-action]', function () {
        const id = Number($(this).closest('.queued-message').attr('data-id'));
        const action = $(this).attr('data-action');
        if (action === 'edit') edit(id);
        else if (action === 'remove') remove(id);
        else if (action === 'send-now') sendNow(id);
    });

    window.MessageQueue = {
        enabled,
        takesComposerSend,
        enqueueFromComposer,
        sendNext,
        sendNow,
        returnToComposer,
        returnAll,
        afterTurn,
        claim,
        reset,
        withQueuedText,
        syncButton,
        handleSendClick,
        // For tests.
        _items: () => waiting().slice(),
    };
})();
