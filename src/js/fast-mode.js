// The composer's fast mode: a switch that has the AI answer at Puter's fast
// service speed (serviceSpeed 'fast'), about 2.5x faster for 2x the credits.
//
// Every signed-in account can switch it on, on any plan. Without a real
// account (signed out, or a temporary one) the button is hidden, since a
// build asks the user to sign in first. Only a model with a fast tier
// (ModelCore's fast, Opus) goes faster. On any other model the switch stays
// where it is, builds run at the usual speed and the panel says so.
//
// The switch belongs to this browser, not to a project, and starts off. Each
// request reads it as it is made (requestSpeed, called by sendChatMessage and
// handleToolCalls), so a change mid-build lets the request already running
// finish and applies from the next one. The button stays usable while a turn
// runs for that reason.
//
// A build still running after HINT_AFTER_MS gets a hint over the composer
// that offers fast mode. It comes back HINT_AGAIN_MS after it last showed, up
// to HINT_MAX times per browser, and stops for good once fast mode has been
// switched on in this browser. It never shows on a build that is fast already
// (see turnStarted).
//
// What's new's Show me (whats-new.js) calls showMe, which puts a pointer over
// the button in the same place, and the button pulses until it goes.
window.FastMode = (function () {
    const ON_KEY = 'builder.fastMode';
    const HINT_KEY = 'builder.fastModeHint';
    const HINT_AFTER_MS = 30 * 1000;
    // Two weeks apart, so someone who builds every day isn't asked at every
    // chance, and three times in all, since three "Not now"s are an answer.
    const HINT_AGAIN_MS = 14 * 24 * 60 * 60 * 1000;
    const HINT_MAX = 3;
    // How soon the hint tries again when the user can't see it yet.
    const HINT_RETRY_MS = 5 * 1000;
    // Opus's fast tier against its usual one. Change them here if its price
    // does, and the panel and the hint follow.
    const SPEED = '2.5x';
    const COST = '2x';
    // Most users don't code, so the words say "the builder" and leave out
    // that a change waits for the AI's next request. "Up to", since only the
    // AI's answers speed up, not saving files or loading the preview.
    const SUMMARY = `The builder works up to ${SPEED} faster and uses ${COST} the credits.`;

    let _open = false;
    // The composer shows a running turn (updateSendButtonState).
    let _busy = false;
    // The running turn, from turnStarted: its model, and whether it is fast
    // already.
    let _turn = null;
    let _hintTimer = null;
    // The bubble over the button: 'hint' (the long-build hint), 'pointer'
    // (showMe) or null.
    let _bubble = null;
    // Stand-ins for blocked storage, for this load.
    let _hintFallback = { shown: 0, at: 0, used: false };
    let _onFallback = false;
    let _listening = false;
    let _composerObserver = null;

    const core = () => window.ModelCore;
    const zap = () => window.zap_svg || '';

    function isOn() {
        try { return localStorage.getItem(ON_KEY) === '1'; } catch (e) { return _onFallback; }
    }
    function writeOn(on) {
        _onFallback = on;
        try {
            if (on) localStorage.setItem(ON_KEY, '1');
            else localStorage.removeItem(ON_KEY);
        } catch (e) { /* kept for this load */ }
    }
    // The hint in this browser: how many times it has shown, when it last
    // did, and whether fast mode has been switched on (used).
    function hintRecord() {
        let raw;
        try { raw = localStorage.getItem(HINT_KEY); } catch (e) { return _hintFallback; }
        let r = null;
        try { r = JSON.parse(raw); } catch (e) { /* anything else counts as nothing */ }
        return r && typeof r === 'object'
            ? { shown: Number(r.shown) || 0, at: Number(r.at) || 0, used: !!r.used }
            : { shown: 0, at: 0, used: false };
    }
    function writeHintRecord(r) {
        _hintFallback = r;
        try { localStorage.setItem(HINT_KEY, JSON.stringify(r)); } catch (e) { /* kept for this load */ }
    }
    function hintDue() {
        const r = hintRecord();
        if (r.used || r.shown >= HINT_MAX) return false;
        return !r.shown || Date.now() - r.at >= HINT_AGAIN_MS;
    }

    // A real account, with the flag on.
    function available() {
        const u = window.user;
        return !!(window.FEATURE_FLAGS && window.FEATURE_FLAGS.fastMode && u && !u.is_temp);
    }

    // The model the open project builds with (see ModelPicker), the default
    // without the picker.
    function shownModel() {
        const p = window.ModelPicker;
        return p && p.access() === 'open' ? p.projectModel() : core().DEFAULT_MODEL;
    }

    // Whether a request on this model goes fast: the switch is on, the
    // account is real and the model has a fast tier.
    function applies(model) {
        return isOn() && available() && core().supportsFast(model);
    }

    // The serviceSpeed of one request, or undefined for the model's usual
    // one. stats is the turn's (turnStats in sendChatMessage), marked so its
    // build events can say fast mode ran.
    function requestSpeed(model, stats) {
        if (!applies(model)) return undefined;
        if (stats) stats.fastMode = true;
        return 'fast';
    }

    function render() {
        const $btn = $('.fast-mode-btn');
        if (!$btn.length) return;
        if (!available()) {
            closePanel();
            hideBubble();
            $btn.prop('hidden', true);
            return;
        }
        const lit = applies(shownModel());
        const label = 'Fast mode: ' + (lit ? 'on' : 'off');
        $btn.prop('hidden', false)
            .toggleClass('is-on', lit)
            .attr({ title: label, 'aria-label': label });
        if (_open) renderPanel();
    }

    function renderPanel() {
        const model = shownModel();
        const on = isOn();
        const esc = (s) => (typeof htmlEscape === 'function' ? htmlEscape(s) : String(s));
        let note = '';
        if (!core().supportsFast(model)) {
            const fastModels = core().ids().filter(core().supportsFast).map((id) => core().get(id).label);
            note = `Fast mode works with ${fastModels.join(' and ')}. This project builds with ${core().get(model).label}, which runs at its usual speed.`;
        }
        // The switch is drawn again on every change, so keyboard focus moves
        // to the new one.
        const active = typeof document !== 'undefined' ? document.activeElement : null;
        const refocus = !!(active && active.classList && active.classList.contains('fast-mode-switch'));
        const $panel = $(
            '<div class="fast-mode-panel" role="dialog" aria-label="Fast mode" tabindex="-1">' +
                `<button type="button" class="fast-mode-switch" role="switch" aria-checked="${on}" aria-describedby="fast-mode-summary">` +
                    `<span class="fast-mode-name">${zap()}<span>Fast mode</span></span>` +
                    '<span class="fast-mode-track" aria-hidden="true"></span>' +
                '</button>' +
                `<p class="fast-mode-text" id="fast-mode-summary">${SUMMARY}</p>` +
                (note ? `<p class="fast-mode-note">${esc(note)}</p>` : '') +
            '</div>');
        $('.fast-mode-panel').remove();
        // On the body, like the model picker's panel, so the landing column's
        // scroll box can't clip it.
        $('body').append($panel);
        place(document.querySelector && document.querySelector('.fast-mode-panel'));
        if (refocus) $('.fast-mode-switch').trigger('focus');
    }

    // Place a surface fixed on <body> (the panel or the bubble) right above the
    // button, or below it when above has less room, never past the top of the
    // chat column. Its right edge sits just past the button's, so the caret
    // that --fast-caret-x points at the button clears the rounded corner.
    function place(el) {
        if (!el || typeof document === 'undefined' || !document.querySelector) return;
        const btn = document.querySelector('.fast-mode-btn');
        if (!btn) return;
        const column = btn.closest && btn.closest('.chat');
        const b = btn.getBoundingClientRect();
        // Room for the caret between the surface and the button.
        const gap = 10;
        const edge = 8;
        const viewportW = document.documentElement.clientWidth || window.innerWidth;
        const viewportH = window.innerHeight;
        const topLimit = Math.max(edge, column ? column.getBoundingClientRect().top + edge : edge);
        const height = el.offsetHeight;
        const above = b.top - gap - topLimit;
        const below = viewportH - edge - (b.bottom + gap);
        const up = height <= above || above >= below;
        el.style.top = (up ? b.top - gap - height : b.bottom + gap) + 'px';
        const width = el.offsetWidth;
        const left = Math.max(edge, Math.min(b.right + 10 - width, viewportW - width - edge));
        el.style.left = left + 'px';
        el.style.setProperty('--fast-caret-x', Math.round(b.left + b.width / 2 - left) + 'px');
        el.classList.toggle('is-below', !up);
    }

    // The button moves with the window and the landing column's scroll, and
    // with the composer as it grows while the user types, while the panel or
    // the bubble is up.
    function reposition(e) {
        const target = e && e.target;
        if (target && target.closest && target.closest('.fast-mode-panel, .fast-mode-hint')) return;
        if (_bubble && !buttonVisible()) { hideBubble(); return; }
        place(document.querySelector('.fast-mode-panel'));
        place(document.querySelector('.fast-mode-hint'));
    }
    function syncListeners() {
        const want = _open || !!_bubble;
        if (want === _listening) return;
        _listening = want;
        if (want) {
            window.addEventListener?.('resize', reposition);
            window.addEventListener?.('scroll', reposition, true);
            const composer = document.querySelector && document.querySelector('.chat-input');
            if (composer && typeof ResizeObserver !== 'undefined') {
                _composerObserver = new ResizeObserver(() => reposition());
                _composerObserver.observe(composer);
            }
        } else {
            window.removeEventListener?.('resize', reposition);
            window.removeEventListener?.('scroll', reposition, true);
            if (_composerObserver) { _composerObserver.disconnect(); _composerObserver = null; }
        }
    }

    function openPanel() {
        if (!available()) return;
        hideBubble();
        _open = true;
        $('.fast-mode-btn').attr('aria-expanded', 'true');
        renderPanel();
        syncListeners();
        // The dialog takes focus (not the switch) so Escape works and Tab
        // reaches the switch, without a focus ring from a mouse open.
        $('.fast-mode-panel').trigger('focus');
        window.track?.('Fast Mode Opened', { on: isOn(), mid_build: _busy });
    }

    function closePanel({ focus = false } = {}) {
        const wasOpen = _open;
        _open = false;
        syncListeners();
        $('.fast-mode-btn').attr('aria-expanded', 'false');
        $('.fast-mode-panel').remove();
        if (focus && wasOpen) $('.fast-mode-btn').trigger('focus');
    }

    function setOn(on, source) {
        if (!available() || on === isOn()) return;
        writeOn(on);
        // Whoever has switched it on knows where it is, so the hint is done.
        if (on && !hintRecord().used) writeHintRecord({ ...hintRecord(), used: true });
        render();
        window.track?.('Fast Mode Changed', { on, source, mid_build: _busy });
    }

    // A turn's model is settled (sendChatMessage). fast: the turn is fast
    // already, from the speed experiment (experiments.js), which has ended
    // but can still be forced.
    function turnStarted({ model, fast = false } = {}) {
        clearTimeout(_hintTimer);
        _hintTimer = null;
        _turn = { model, fast: !!fast };
        if (!_turn.fast && hintDue()) _hintTimer = setTimeout(maybeShowHint, HINT_AFTER_MS);
    }

    function buttonVisible() {
        if (typeof document === 'undefined' || !document.querySelector) return false;
        const btn = document.querySelector('.fast-mode-btn');
        return !!(btn && !btn.hidden && btn.getClientRects().length);
    }

    function maybeShowHint() {
        _hintTimer = null;
        if (!_busy || !_turn || !hintDue()) return;
        if (!available() || !core().supportsFast(_turn.model) || applies(_turn.model)) return;
        // Wait until the user can see it: the tab in front, the chat showing
        // the button (a phone can be on the app view), no dialog, and not the
        // panel itself or showMe's pointer.
        const blocked = _open || !!_bubble || !buttonVisible() || document.visibilityState === 'hidden'
            || !!document.querySelector('[aria-modal="true"]');
        if (blocked) {
            _hintTimer = setTimeout(maybeShowHint, HINT_RETRY_MS);
            return;
        }
        showHint();
    }

    // Puts up the bubble of one kind (see _bubble) in place of any other.
    function showBubble(kind, { title, text, actions, closeButton = false }) {
        const $bubble = $(
            `<div class="fast-mode-hint${kind === 'pointer' ? ' is-pointer' : ''}" role="dialog" aria-labelledby="fast-mode-hint-title" aria-describedby="fast-mode-hint-text">` +
                (closeButton ? `<button type="button" class="fast-mode-hint-close" title="Close" aria-label="Close">${window.cross_svg || '×'}</button>` : '') +
                `<p class="fast-mode-hint-title" id="fast-mode-hint-title">${zap()}<span>${title}</span></p>` +
                `<p class="fast-mode-hint-text" id="fast-mode-hint-text">${text}</p>` +
                `<div class="fast-mode-hint-actions">${actions}</div>` +
            '</div>');
        $('.fast-mode-hint').remove();
        $('body').append($bubble);
        _bubble = kind;
        $('.fast-mode-btn').toggleClass('is-pointed', kind === 'pointer');
        place(document.querySelector('.fast-mode-hint'));
        syncListeners();
        window.announce?.(title + '. ' + text);
    }

    function hideBubble() {
        if (!_bubble) return;
        _bubble = null;
        $('.fast-mode-hint').remove();
        $('.fast-mode-btn').removeClass('is-pointed');
        syncListeners();
    }

    function showHint() {
        const r = hintRecord();
        const shown = r.shown + 1;
        writeHintRecord({ ...r, shown, at: Date.now() });
        showBubble('hint', {
            title: 'Speed up this build',
            text: `Fast mode makes the builder up to ${SPEED} faster and uses ${COST} the credits.`,
            actions: '<button type="button" class="fast-mode-hint-later">Not now</button>' +
                '<button type="button" class="fast-mode-hint-go">Turn on</button>',
            closeButton: true,
        });
        // shown: which showing this is, 1 to HINT_MAX.
        window.track?.('Fast Mode Hint Shown', { shown });
    }

    // What's new's Show me. Brings the chat into view when a phone shows the
    // app or the chat panel is hidden, then points at the button and gives
    // it focus. The pointer goes with Got it, Escape, a click anywhere else,
    // or the button, which opens the panel as usual.
    function showMe() {
        if (!available()) return false;
        const $body = $('body');
        if (window.isMobileViewport?.() && $body.hasClass('preview-active') && !$body.hasClass('mobile-view-chat')) {
            $body.addClass('mobile-view-chat');
            window.syncViewSeg?.();
        }
        if ($body.hasClass('chat-hidden')) $('.preview-toggle-chat').first().trigger('click');
        closePanel();
        if (!buttonVisible()) {
            window.showToast?.('Fast mode is the bolt button in the chat box.');
            return false;
        }
        showBubble('pointer', {
            title: 'Fast mode is here',
            text: 'Press the bolt to switch fast mode on or off.',
            actions: '<button type="button" class="fast-mode-hint-got">Got it</button>',
        });
        $('.fast-mode-btn').trigger('focus');
        return true;
    }

    // The composer starts or stops showing a turn. The hint belongs to the
    // turn, so it goes with it. The pointer doesn't.
    function setBusy(processing) {
        _busy = !!processing;
        if (!_busy) {
            clearTimeout(_hintTimer);
            _hintTimer = null;
            _turn = null;
            if (_bubble === 'hint') hideBubble();
        }
    }

    $(document).on('click', '.fast-mode-btn', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (_open) closePanel();
        else openPanel();
    });
    $(document).on('click', '.fast-mode-panel .fast-mode-switch', function (e) {
        e.preventDefault();
        e.stopPropagation();
        setOn(!isOn(), 'panel');
        window.announce?.(isOn() ? 'Fast mode is on.' : 'Fast mode is off.');
    });
    $(document).on('keydown', '.fast-mode-panel', function (e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            closePanel({ focus: true });
        }
    });
    $(document).on('click', '.fast-mode-hint-go', function (e) {
        e.preventDefault();
        e.stopPropagation();
        hideBubble();
        setOn(true, 'hint');
        window.showToast?.('Fast mode is on.');
    });
    $(document).on('click', '.fast-mode-hint-later, .fast-mode-hint-close, .fast-mode-hint-got', function (e) {
        e.preventDefault();
        e.stopPropagation();
        hideBubble();
    });
    $(document).on('keydown', function (e) {
        if (e.key === 'Escape' && _bubble === 'pointer') hideBubble();
    });
    $(document).on('click', function (e) {
        if (typeof isInPuterDialog === 'function' && isInPuterDialog(e.target)) return;
        const $t = $(e.target);
        if (_bubble === 'pointer' && !$t.closest('.fast-mode-hint').length) hideBubble();
        if (!_open) return;
        if ($t.closest('.fast-mode-panel').length || $t.closest('.fast-mode-btn').length) return;
        closePanel();
    });
    // A switch in another tab changes this one's next request too.
    window.addEventListener?.('storage', (e) => { if (e.key === ON_KEY) render(); });

    return { SPEED, COST, render, setBusy, turnStarted, requestSpeed, applies, available, isOn, showMe, close: closePanel };
})();
