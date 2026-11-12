// whats-new.js — the "What's new" dialog, telling users about one recent
// feature, with the words on the left and a drawing of it on the right (one
// above the other on a phone).
// It shows once per account, at startup, to a signed-in user who has built
// something. Show me closes it and points at the feature (the
// announcement's showMe). Closing it any other way (Later, ✕, Escape, a
// click outside) just closes it. Either way it saves the announcement's start
// date in puter.kv, under one key per user that every later announcement
// overwrites. A reload with the dialog still up shows it again.
//
// The upgrade dialog comes first. Startup leaves this one out while an
// upgrade is pending (app.js), and the upgrade dialog opening over it closes
// it unseen (hide), so a later load shows it again.
//
// Only the newest announcement is ever shown. A new one replaces ANNOUNCEMENT
// with a later start, and everyone sees it once, whether or not they saw the
// last.
//
// In the console, WhatsNew.open() shows it now, and WhatsNew.reset() forgets
// that it was seen, so the next load shows it again.
(function () {
    'use strict';

    const BOLT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>';
    const MIC_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>';
    const SEND_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>';
    const CURSOR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M4.04 4.69a.5.5 0 0 1 .65-.65l16 6.5a.5.5 0 0 1-.06.95l-6.13 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.12a.5.5 0 0 1-.95.07z"/></svg>';
    const CHECK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
    const CLOSE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    // One build in the drawing's race. The fast one ends with a check.
    const lane = (name, fast) =>
        `<div class="wn-lane${fast ? ' is-fast' : ''}">` +
            `<span class="wn-lane-name">${fast ? BOLT_SVG : ''}${name}</span>` +
            '<span class="wn-lane-bar"><i></i></span>' +
            `<span class="wn-lane-state">${fast ? `<span class="wn-ok">${CHECK_SVG}</span>` : ''}</span>` +
        '</div>';

    const ANNOUNCEMENT = {
        // The day it went out (YYYY-MM-DD). It is what kv keeps, so a later
        // announcement needs a later start.
        start: '2026-11-12',
        // Names it in analytics.
        id: 'fast-mode',
        // The bolt button needs a real account and the flag (FastMode), so
        // without them the dialog waits for a load that has both.
        when: () => !!window.FastMode?.available(),
        title: 'Build faster with fast mode',
        // For people who don't code, so it keeps to plain words and leaves
        // the details (only Opus goes faster) to the fast mode panel.
        body: () =>
            `<p>Fast mode makes the builder work up to ${window.FastMode.SPEED} faster. It uses ${window.FastMode.COST} the credits while it’s on.</p>` +
            '<p>Switch it on with the bolt button in the chat box.</p>',
        // A cursor presses the bolt in a composer, then two builds race, the
        // fast one done while the usual one is a little over a third along
        // (styles.css, .wn-*). Under reduced motion it shows the end straight
        // away.
        art: () =>
            '<div class="wn-fast">' +
                '<div class="wn-race">' +
                    '<div class="wn-race-head"><span>Building your app</span>' +
                        `<span class="wn-race-chip">${BOLT_SVG}${window.FastMode.SPEED} faster</span></div>` +
                    lane('Usual', false) +
                    lane('Fast', true) +
                '</div>' +
                '<div class="wn-composer">' +
                    '<span class="wn-composer-line"></span>' +
                    '<span class="wn-composer-line short"></span>' +
                    '<div class="wn-composer-row">' +
                        '<span class="wn-composer-bolt">' +
                            `${BOLT_SVG}<i class="wn-ring"></i>` +
                            `<span class="wn-cursor"><span>${CURSOR_SVG}</span></span>` +
                        '</span>' +
                        `<span class="wn-composer-mic">${MIC_SVG}</span>` +
                        `<span class="wn-composer-send">${SEND_SVG}</span>` +
                    '</div>' +
                '</div>' +
            '</div>',
        // Show me closes the dialog and points at the bolt button.
        showMe: () => window.FastMode.showMe(),
    };

    // The start of the last announcement the user closed. puter.kv is the
    // user's own (per app), so the key needs no account in it.
    const KV_KEY = 'whats_new_seen';

    function markSeen(a) {
        Promise.resolve().then(() => puter.kv.set(KV_KEY, a.start))
            .catch((e) => console.warn('What’s new: could not save that it was seen:', e));
    }

    // Called once at startup (app.js), when the project list is in.
    // hasProjects and busy are app.js's to know. The dialog is for people who
    // have built something, and never goes up over a build that has started.
    async function maybeShow({ hasProjects = false, busy = () => false } = {}) {
        const a = ANNOUNCEMENT;
        const user = window.user;
        if (!user || user.is_temp || !user.uuid || !hasProjects) return false;
        if (a.when && !a.when()) return false;
        let seen;
        // If kv can't be reached there's no telling, so a later load tries again.
        try { seen = await puter.kv.get(KV_KEY); }
        catch (e) { return false; }
        // Dates as YYYY-MM-DD sort as text. Anything else stored counts as
        // nothing seen.
        if (typeof seen === 'string' && seen >= a.start) return false;
        // While kv answered, the account may have changed, a build started,
        // or another dialog gone up.
        if (!window.user || window.user.uuid !== user.uuid) return false;
        if (busy() || document.querySelector('.confirm-modal-overlay')) return false;
        return open(a);
    }

    function modalHtml(a, paid) {
        return `
            <div class="confirm-modal-overlay whats-new-overlay">
                <div class="whats-new-modal" role="dialog" aria-modal="true" aria-labelledby="whats-new-title" aria-describedby="whats-new-body" tabindex="-1">
                    <div class="whats-new-text">
                        <span class="whats-new-badge">New</span>
                        <h2 class="whats-new-title" id="whats-new-title">${a.title}</h2>
                        <div class="whats-new-body" id="whats-new-body">${a.body({ paid })}</div>
                    </div>
                    <div class="whats-new-art" aria-hidden="true">${a.art()}</div>
                    <div class="whats-new-actions">
                        <button type="button" class="confirm-modal-btn confirm-modal-cancel whats-new-later">Later</button>
                        <button type="button" class="confirm-modal-btn upgrade-primary whats-new-show">Show me</button>
                    </div>
                    <button type="button" class="whats-new-x" title="Close" aria-label="Close">${CLOSE_SVG}</button>
                </div>
            </div>
        `;
    }

    // The open dialog's close, for hide().
    let closeOpen = null;

    function open(a = ANNOUNCEMENT) {
        if (document.querySelector('.whats-new-overlay')) return false;
        if (a.when && !a.when()) return false;
        const $overlay = $(modalHtml(a, !!window.Branding?.isSubscribed(window.user)));
        let releaseFocus = null;
        let closed = false;
        const close = (how) => {
            if (closed) return;
            closed = true;
            closeOpen = null;
            $(document).off('keydown.whatsNew');
            $overlay.removeClass('open');
            setTimeout(() => {
                $overlay.remove();
                // Once the dialog is gone, so it doesn't cover what it shows.
                if (how === 'show') a.showMe();
            }, 150);
            if (releaseFocus) releaseFocus();
            // Gave way to another dialog, so not seen.
            if (how === 'hidden') return;
            markSeen(a);
            window.track?.('Whats New Closed', { id: a.id, how });
        };
        closeOpen = close;
        $overlay.find('.whats-new-show').on('click', () => close('show'));
        $overlay.find('.whats-new-later').on('click', () => close('later'));
        $overlay.find('.whats-new-x').on('click', () => close('close'));
        $overlay.on('mousedown', (e) => { if (e.target === $overlay[0]) close('outside'); });
        $overlay.find('.whats-new-modal').on('mousedown click', (e) => e.stopPropagation());
        $(document).on('keydown.whatsNew', (e) => {
            if (e.key === 'Escape' && keyIsForDialog(e, $overlay[0])) { e.preventDefault(); close('escape'); }
        });
        $('body').append($overlay);
        releaseFocus = trapDialogFocus($overlay);
        window.track?.('Whats New Shown', { id: a.id });
        requestAnimationFrame(() => {
            $overlay.addClass('open');
            $overlay.find('.whats-new-modal').trigger('focus');
        });
        return true;
    }

    // Called by a dialog that comes first (the upgrade dialog). Closes this
    // one without marking it seen.
    function hide() {
        if (closeOpen) closeOpen('hidden');
    }

    async function reset() {
        await puter.kv.del(KV_KEY);
    }

    window.WhatsNew = { maybeShow, open: () => open(ANNOUNCEMENT), hide, reset };
})();
