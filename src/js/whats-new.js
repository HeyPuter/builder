// whats-new.js — the "What's new" dialog, telling users about one recent
// feature, with the words on the left and a drawing of it on the right (one
// above the other on a phone).
// It shows once per account, at startup, to a signed-in user who has built
// something. Closing it in any way (Continue, ✕, Escape, a click outside)
// saves the announcement's start date in puter.kv, under one key per user
// that every later announcement overwrites. A reload with the dialog still up
// shows it again.
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

    const LOCK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
    const CHECK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>';
    const CLOSE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

    // A DNS record in the drawing, its check landing `delay` after the
    // dialog opens.
    const dnsRow = (type, delay) =>
        `<div class="wn-dns-row" style="--d:${delay}s">` +
            `<span class="wn-dns-type">${type}</span><span class="wn-dns-val"></span>` +
            `<span class="wn-dns-state"><i class="wn-dns-wait"></i><span class="wn-dns-ok">${CHECK_SVG}</span></span>` +
        '</div>';

    const ANNOUNCEMENT = {
        // The day it went out (YYYY-MM-DD). It is what kv keeps, so a later
        // announcement needs a later start.
        start: '2026-11-05',
        // Names it in analytics.
        id: 'custom-domain',
        title: 'Publish on your own domain',
        // There is no step to take from here. The domain is connected from a
        // project's Publish menu, so the dialog says where that is.
        body: ({ paid }) =>
            '<p>Your published sites can now use a domain you own, like yourname.com.</p>' +
            '<ol class="whats-new-steps" role="list">' +
                '<li>Open a project and press <strong>Publish</strong>.</li>' +
                '<li>Choose <strong>Use custom domain</strong> next to the site address.</li>' +
                '<li>Add the DNS records it lists where you manage your domain. The site starts showing there a few minutes later.</li>' +
            '</ol>' +
            `<p class="whats-new-note">${paid ? 'Custom domains are part of your Puter plan.' : 'Custom domains come with a paid Puter plan.'}</p>`,
        // The records go green one after the other, then the address bar
        // turns from the puter.site address to the domain (styles.css,
        // .wn-*). Under reduced motion it shows the end straight away.
        art:
            '<div class="wn-domain">' +
                '<div class="wn-browser">' +
                    '<div class="wn-browser-bar">' +
                        '<span class="wn-dots"><i></i><i></i><i></i></span>' +
                        '<span class="wn-url">' +
                            '<span class="wn-url-old">yourname.puter.site</span>' +
                            `<span class="wn-url-new">${LOCK_SVG}yourname.com</span>` +
                        '</span>' +
                    '</div>' +
                    '<div class="wn-page">' +
                        '<span class="wn-page-nav"><b></b><i></i><i></i><i></i></span>' +
                        '<span class="wn-page-hero"></span>' +
                        '<span class="wn-page-title"></span>' +
                        '<span class="wn-page-line"></span>' +
                        '<span class="wn-page-line short"></span>' +
                        '<span class="wn-page-btn"></span>' +
                    '</div>' +
                '</div>' +
                '<div class="wn-dns">' +
                    '<div class="wn-dns-head">DNS records</div>' +
                    dnsRow('CNAME', 0.9) +
                    dnsRow('TXT', 1.3) +
                '</div>' +
            '</div>',
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
                    <div class="whats-new-art" aria-hidden="true">${a.art}</div>
                    <div class="whats-new-actions">
                        <button type="button" class="confirm-modal-btn upgrade-primary whats-new-continue">Continue</button>
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
        const $overlay = $(modalHtml(a, !!window.Branding?.isSubscribed(window.user)));
        let releaseFocus = null;
        let closed = false;
        const close = (how) => {
            if (closed) return;
            closed = true;
            closeOpen = null;
            $(document).off('keydown.whatsNew');
            $overlay.removeClass('open');
            setTimeout(() => $overlay.remove(), 150);
            if (releaseFocus) releaseFocus();
            // Gave way to another dialog, so not seen.
            if (how === 'hidden') return;
            markSeen(a);
            window.track?.('Whats New Closed', { id: a.id, how });
        };
        closeOpen = close;
        $overlay.find('.whats-new-continue').on('click', () => close('continue'));
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
