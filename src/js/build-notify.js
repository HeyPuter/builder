// Build notifications. When a project's first message starts its first build,
// a toast asks whether the user wants a notification when it is done. Once
// they turn it on, a build that ends while they're in another tab or app shows
// one, and so does a build that stops to ask them a question
// (AskClarifyingQuestions waits for an answer, so it would never finish).
// Settings has the switch (its Notifications tab, see mcp-ui.js).
//
// It uses the browser's own notifications. The build runs in this tab, so the
// tab is open when there is something to say. The page shows the notification
// itself, and a tap brings the tab forward. Where a page can't (Android only
// lets a service worker show one), the builder's worker shows it, and a tap
// there goes through its notificationclick handler (src/sw.js), which brings
// forward the tab showing that project, or opens the project in a new tab
// when none does. Inside the
// Puter desktop the builder is a frame, and browsers don't let a frame ask,
// so the offer never shows there and the switch says why.
//
// The offer shows once in a browser, ever, on a project's first build while
// that build still runs. Answered, closed or ignored, it never comes back,
// and the switch is the way to turn them on later. It never shows once the
// switch has been used, or in a browser that can't show notifications or
// blocks them for the site.
//
// ON_KEY holds the user's choice in this browser, '1' on and '0' off. It is
// on only while the browser still allows notifications for the site.
window.BuildNotify = (function () {
    const ON_KEY = 'builder.buildNotify';
    // '1' once the offer has shown, or the switch was used, in this browser.
    const OFFER_KEY = 'builder.buildNotifyOffer';
    // Long enough to read and decide while the build starts. The toast holds
    // while the pointer or focus is on it (showToast).
    const OFFER_MS = 15 * 1000;
    // How soon the offer tries again while another offer's toast is up.
    const OFFER_RETRY_MS = 2 * 1000;
    const ICON = '/favicons/icon-192.png';
    // What the worker's notificationclick handler looks for (src/sw.js).
    const SOURCE = 'build-notify';
    const CLICK_MESSAGE = 'BUILD_NOTIFICATION_CLICK';

    const TEXT = {
        done: 'Your build is done',
        stopped: 'Your build stopped before it finished',
        question: 'The builder has a question',
    };
    const NOTE = {
        framed: 'Notifications work when the builder is open in its own browser tab.',
        unsupported: "This browser can't show notifications from the builder.",
        blocked: "Your browser is blocking notifications from this site. You can allow them in the browser's site settings.",
    };

    // Stand-ins for storage that can't be written, for this load.
    let _choiceFallback = null;
    let _choiceUnsaved = false;
    let _offerFallback = false;
    let _offerUnsaved = false;
    let _turn = null;

    function framed() {
        try { return window.self !== window.top; } catch (e) { return true; }
    }
    function api() {
        return typeof Notification !== 'undefined' && Notification && typeof Notification.requestPermission === 'function' ? Notification : null;
    }
    function permission() {
        try { return api() ? Notification.permission : 'denied'; } catch (e) { return 'denied'; }
    }

    function choice() {
        if (_choiceUnsaved) return _choiceFallback;
        try { return localStorage.getItem(ON_KEY); } catch (e) { return _choiceFallback; }
    }
    function writeChoice(on) {
        _choiceFallback = on ? '1' : '0';
        try {
            localStorage.setItem(ON_KEY, _choiceFallback);
            _choiceUnsaved = false;
        } catch (e) { _choiceUnsaved = true; }
    }

    // 'on', 'off', 'blocked' (the browser blocks the site) or 'unavailable'.
    function state() {
        if (unavailableReason()) return 'unavailable';
        const p = permission();
        if (p === 'denied') return 'blocked';
        return p === 'granted' && choice() === '1' ? 'on' : 'off';
    }
    function unavailableReason() {
        if (framed()) return 'framed';
        if (!api()) return 'unsupported';
        return null;
    }
    const isOn = () => state() === 'on';

    function offerDone() {
        if (_offerUnsaved) return _offerFallback;
        try { return localStorage.getItem(OFFER_KEY) === '1'; } catch (e) { return _offerFallback; }
    }
    function markOfferDone() {
        _offerFallback = true;
        try {
            localStorage.setItem(OFFER_KEY, '1');
            _offerUnsaved = false;
        } catch (e) { _offerUnsaved = true; }
    }

    // The browser's prompt, from a click. Older Safari answers through a
    // callback instead of a promise.
    function askBrowser() {
        return new Promise((resolve) => {
            let p;
            try { p = Notification.requestPermission(resolve); } catch (e) { resolve(permission()); return; }
            if (p && typeof p.then === 'function') p.then(resolve, () => resolve(permission()));
        });
    }

    // Whether the user is looking at the builder, with its tab in front and
    // focused (focus inside the preview frame counts).
    function looking() {
        try {
            return document.visibilityState === 'visible' && (typeof document.hasFocus !== 'function' || document.hasFocus());
        } catch (e) { return true; }
    }

    // The builder's shared state (app.js), read when needed.
    const running = () => typeof isProcessing !== 'undefined' && !!isProcessing;
    function projectTitle(chatId) {
        try {
            const entry = typeof savedChats !== 'undefined' && Array.isArray(savedChats) ? savedChats.find(c => c && c.id === chatId) : null;
            return entry && typeof entry.title === 'string' ? entry.title.trim() : '';
        } catch (e) { return ''; }
    }

    // ---- The offer ------------------------------------------------------------

    function anotherOfferUp() {
        try { return !!document.querySelector('.toast:not(.toast-hide) .toast-action'); } catch (e) { return false; }
    }

    function maybeOffer(chatId) {
        if (offerDone() || state() !== 'off' || choice() === '0') return;
        showOfferWhenClear(chatId);
    }

    // One offer toast at a time, since the PWA install offer also shows as a
    // build starts. The offer is about this build, so it goes with it, and a
    // build that ends first leaves it for the next project.
    function showOfferWhenClear(chatId) {
        if (!running() || !_turn || _turn.chatId !== chatId || offerDone()) return;
        if (anotherOfferUp()) {
            setTimeout(() => showOfferWhenClear(chatId), OFFER_RETRY_MS);
            return;
        }
        markOfferDone();
        window.showToast?.('Want a notification when this build is done?', {
            type: 'info',
            key: 'build-notify-offer',
            duration: OFFER_MS,
            action: { label: 'Turn on', onClick: () => turnOn('offer') },
            onDismiss: () => window.track?.('Notify Answer', { answer: 'dismissed' }),
        });
        window.track?.('Notify Offered');
    }

    // From a click (the offer's Turn on, or the switch). The browser's prompt
    // comes before any await, since browsers show it only from a user gesture.
    function turnOn(source) {
        if (!api() || unavailableReason()) return;
        askBrowser().then((answer) => {
            markOfferDone();
            if (answer === 'granted') {
                writeChoice(true);
                if (source === 'offer') {
                    window.showToast?.("Notifications are on. If you leave this tab, you'll get one when the build is done. You can turn them off in Settings.", { type: 'info', key: 'build-notify-on' });
                }
            } else if (answer === 'denied' && source === 'offer') {
                window.showToast?.(NOTE.blocked, { type: 'warning', key: 'build-notify-blocked' });
            }
            renderSwitch();
            const result = answer === 'granted' ? 'on' : answer === 'denied' ? 'blocked' : 'off';
            if (source === 'offer') window.track?.('Notify Answer', { answer: result });
            else window.track?.('Notify Changed', { on: result === 'on', source, ...(result === 'blocked' && { blocked: true }) });
        });
    }

    function turnOff(source) {
        writeChoice(false);
        markOfferDone();
        renderSwitch();
        window.track?.('Notify Changed', { on: false, source });
    }

    // ---- The notification -----------------------------------------------------

    function send(kind, chatId) {
        if (!isOn() || !chatId || looking()) return;
        const title = TEXT[kind];
        const body = projectTitle(chatId);
        const options = {
            icon: ICON,
            // A newer one for the same project replaces the last, and still
            // gets the user's attention.
            tag: 'build-' + chatId,
            renotify: true,
            data: { source: SOURCE, chatId, kind, url: '/?p=' + encodeURIComponent(chatId) },
        };
        if (body) options.body = body;
        let shown = null;
        try { shown = new Notification(title, options); } catch (e) { /* only a worker may show one here */ }
        if (shown) {
            shown.onclick = () => {
                try { window.focus(); } catch (e) { /* the browser decides */ }
                try { shown.close(); } catch (e) { /* gone already */ }
                opened(kind, chatId);
            };
            window.track?.('Notify Sent', { kind });
            return;
        }
        showFromWorker(title, options)
            .then((ok) => { if (ok) window.track?.('Notify Sent', { kind, worker: true }); })
            .catch((e) => console.warn('Build notification failed:', e));
    }

    async function showFromWorker(title, options) {
        const sw = typeof navigator !== 'undefined' && navigator.serviceWorker;
        if (!sw || typeof sw.getRegistration !== 'function') return false;
        const reg = await sw.getRegistration();
        if (!reg || typeof reg.showNotification !== 'function') return false;
        await reg.showNotification(title, options);
        return true;
    }

    // A turn starts (sendChatMessage). firstBuild is true for the project's
    // first message, which is when the offer shows.
    function turnStarted({ chatId, firstBuild = false } = {}) {
        _turn = { chatId };
        if (firstBuild) maybeOffer(chatId);
    }

    // A turn ends in the open project (sendChatMessage). Its outcome is
    // 'done', 'stopped' (an error, or retries or credits ran out), or null
    // when there is nothing to tell (the user stopped it, or queued messages
    // carry on).
    function turnEnded({ chatId, outcome = null } = {}) {
        _turn = null;
        if (outcome === 'done' || outcome === 'stopped') send(outcome, chatId);
    }

    // A clarify card waits on the user (clarify.js).
    function needsAnswer() {
        if (_turn) send('question', _turn.chatId);
    }

    // A tap on one of these notifications, from the page's own or from the
    // worker's. The tab is in front by now. The worker only picks a tab that
    // shows the project already. The page's own notification comes back to
    // the tab that sent it, which may have moved to another project since,
    // so a tap there opens the project again, as its sidebar entry would.
    function opened(kind, chatId) {
        window.track?.('Notify Opened', { kind: kind || 'unknown' });
        if (typeof chatId !== 'string' || !chatId || !window._authInitDone) return;
        if (typeof currentChatId === 'undefined' || chatId === currentChatId) return;
        if (typeof savedChats === 'undefined' || !savedChats.some(c => c && c.id === chatId)) return;
        Promise.resolve()
            .then(() => (typeof confirmLeaveActiveChat === 'function' ? confirmLeaveActiveChat() : true))
            .then((ok) => { if (ok && chatId !== currentChatId) return loadChat(chatId); })
            .catch(() => { /* loadChat shows its own error */ });
    }

    // ---- The switch (Settings, Notifications tab) --------------------------

    function note() {
        const reason = unavailableReason();
        if (reason) return NOTE[reason];
        return state() === 'blocked' ? NOTE.blocked : '';
    }

    function settingsHtml() {
        const s = state();
        const disabled = s === 'unavailable' || s === 'blocked';
        const esc = (t) => (typeof htmlEscape === 'function' ? htmlEscape(t) : String(t));
        return '<div class="settings-notify">' +
            `<button type="button" class="settings-switch build-notify-switch" role="switch" aria-checked="${s === 'on'}" aria-describedby="settings-notify-text settings-notify-state"${disabled ? ' disabled' : ''}>` +
                '<span>Build notifications</span>' +
                '<span class="settings-switch-track" aria-hidden="true"></span>' +
            '</button>' +
            '<p class="mcp-note" id="settings-notify-text">Get a notification when a build finishes or needs you while you’re in another tab.</p>' +
            `<p class="mcp-note settings-notify-state" id="settings-notify-state" role="status">${esc(note())}</p>` +
        '</div>';
    }

    // In place, so keyboard focus stays on the switch.
    function renderSwitch() {
        if (typeof $ !== 'function') return;
        const $btn = $('.build-notify-switch');
        if (!$btn.length) return;
        const s = state();
        $btn.attr('aria-checked', String(s === 'on')).prop('disabled', s === 'unavailable' || s === 'blocked');
        $('.settings-notify-state').text(note());
    }

    if (typeof $ === 'function') {
        $(document).on('click', '.build-notify-switch', function (e) {
            e.preventDefault();
            if (isOn()) turnOff('settings');
            else turnOn('settings');
        });
    }

    // Taps on a notification the worker showed (src/sw.js).
    try {
        const sw = typeof navigator !== 'undefined' && navigator.serviceWorker;
        if (sw && typeof sw.addEventListener === 'function') {
            sw.addEventListener('message', (e) => {
                const d = e && e.data;
                if (d && d.type === CLICK_MESSAGE) opened(d.kind, d.chatId);
            });
            if (typeof sw.startMessages === 'function') sw.startMessages();
        }
    } catch (e) { /* no worker taps then */ }

    return { turnStarted, turnEnded, needsAnswer, isOn, state, settingsHtml };
})();
