// The composer's fast mode: a switch that has the AI answer at Puter's fast
// service speed (serviceSpeed 'fast'), about 2.5x faster for 2x the credits.
//
// It is part of a paid Puter plan and follows the model picker's three states
// (ModelCore.pickerAccess): hidden without a real account, locked on the free
// plan (the panel has an Upgrade button where the switch goes), open on a
// paid plan. Only a model with
// a fast tier (ModelCore's fast, Opus) goes faster. On any other model the
// switch stays where it is, builds run at the usual speed and the panel says
// so.
//
// The switch belongs to this browser, not to a project, and starts off. Each
// request reads it as it is made (requestSpeed, called by sendChatMessage and
// handleToolCalls), so a change mid-build lets the request already running
// finish and applies from the next one. The button stays usable while a turn
// runs for that reason.
//
// A build still running after HINT_AFTER_MS gets a hint over the composer
// that offers fast mode, or the upgrade on the free plan. It shows once per
// browser, and never on a build that is fast already (see turnStarted).
window.FastMode = (function () {
    const ON_KEY = 'builder.fastMode';
    const HINT_KEY = 'builder.fastModeHintShown';
    const HINT_AFTER_MS = 45 * 1000;
    // How soon the hint tries again when the user can't see it yet.
    const HINT_RETRY_MS = 5 * 1000;
    // Opus's fast tier against its usual one. Change them here if its price
    // does, and the panel, the hint and the Upgrade dialog follow.
    const SPEED = '2.5x';
    const COST = '2x';
    const SUMMARY = `The AI works about ${SPEED} faster and uses ${COST} the credits.`;

    let _open = false;
    // The composer shows a running turn (updateSendButtonState).
    let _busy = false;
    // The running turn, from turnStarted: its model, and whether it is fast
    // already or the project's first build.
    let _turn = null;
    let _hintTimer = null;
    let _hintOpen = false;
    // Stand-ins for blocked storage, for this load.
    let _hintShown = false;
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
    function hintShown() {
        if (_hintShown) return true;
        try { return !!localStorage.getItem(HINT_KEY); } catch (e) { return false; }
    }
    function markHintShown() {
        _hintShown = true;
        try { localStorage.setItem(HINT_KEY, String(Date.now())); } catch (e) { /* once per load then */ }
    }

    function access(user) {
        const u = user === undefined ? window.user : user;
        return core().pickerAccess({
            flagOn: !!(window.FEATURE_FLAGS && window.FEATURE_FLAGS.fastMode),
            signedIn: !!u,
            isTemp: !!(u && u.is_temp),
            subscribed: !!(u && window.Branding && window.Branding.isSubscribed(u)),
        });
    }

    // The model the open project builds with (see ModelPicker), the default
    // without the picker.
    function shownModel() {
        const p = window.ModelPicker;
        return p && p.access() === 'open' ? p.projectModel() : core().DEFAULT_MODEL;
    }

    // Whether a request on this model goes fast: the switch is on, the plan
    // is paid and the model has a fast tier.
    function applies(model) {
        return isOn() && access() === 'open' && core().supportsFast(model);
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
        if (access() === 'hidden') {
            closePanel();
            hideHint();
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
        const a = access();
        const model = shownModel();
        const on = a === 'open' && isOn();
        const esc = (s) => (typeof htmlEscape === 'function' ? htmlEscape(s) : String(s));
        let note = '';
        if (a === 'open' && !core().supportsFast(model)) {
            const fastModels = core().ids().filter(core().supportsFast).map((id) => core().get(id).label);
            note = `Fast mode works with ${fastModels.join(' and ')}. This project builds with ${core().get(model).label}, which runs at its usual speed.`;
        } else if (a === 'open' && _busy) {
            note = 'A change takes effect at the AI’s next step.';
        }
        // The switch on a paid plan. The free plan gets the upgrade offer in
        // its place.
        const name = `<span class="fast-mode-name">${zap()}<span>Fast mode</span></span>`;
        const head = a === 'open'
            ? `<button type="button" class="fast-mode-switch" role="switch" aria-checked="${on}" aria-describedby="fast-mode-summary">` +
                name + '<span class="fast-mode-track" aria-hidden="true"></span>' +
              '</button>'
            : `<div class="fast-mode-head">${name}<button type="button" class="fast-mode-upgrade" aria-describedby="fast-mode-summary">Upgrade</button></div>`;
        // The switch is drawn again on every change, so keyboard focus moves
        // to the new one.
        const active = typeof document !== 'undefined' ? document.activeElement : null;
        const refocus = !!(active && active.classList && active.classList.contains('fast-mode-switch'));
        const $panel = $(
            '<div class="fast-mode-panel" role="dialog" aria-label="Fast mode" tabindex="-1">' +
                head +
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

    // Place a surface fixed on <body> (the panel or the hint) right above the
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
    // the hint is up.
    function reposition(e) {
        const target = e && e.target;
        if (target && target.closest && target.closest('.fast-mode-panel, .fast-mode-hint')) return;
        if (_hintOpen && !buttonVisible()) { hideHint(); return; }
        place(document.querySelector('.fast-mode-panel'));
        place(document.querySelector('.fast-mode-hint'));
    }
    function syncListeners() {
        const want = _open || _hintOpen;
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
        if (access() === 'hidden') return;
        hideHint();
        _open = true;
        $('.fast-mode-btn').attr('aria-expanded', 'true');
        renderPanel();
        syncListeners();
        // The dialog takes focus (not the switch) so Escape works and Tab
        // reaches the switch, without a focus ring from a mouse open.
        $('.fast-mode-panel').trigger('focus');
        window.track?.('Fast Mode Opened', { access: access() });
        // A plan can start or end while the page is open. When it changed,
        // refreshUserPlan redraws the composer (updateUserMenu), and this panel
        // with it.
        window.refreshUserPlan?.();
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
        if (access() !== 'open' || on === isOn()) return;
        writeOn(on);
        render();
        window.track?.('Fast Mode Changed', { on, source, mid_build: _busy });
    }

    // A turn's model is settled (sendChatMessage). fast: the turn is fast
    // already, from the speed experiment (experiments.js). firstBuild: the
    // project's first build, which gets no hint while that experiment compares
    // first builds, since only its standard variant would ever see one.
    function turnStarted({ model, fast = false, firstBuild = false } = {}) {
        clearTimeout(_hintTimer);
        _hintTimer = null;
        _turn = { model, fast: !!fast, firstBuild: !!firstBuild };
        // A plan can end while the page is open. The turn's first request
        // doesn't wait for this, and the ones after it go at the usual speed.
        if (isOn() && access() === 'open' && window.refreshUserPlan) {
            Promise.resolve(window.refreshUserPlan()).then((u) => {
                if (access(u) !== 'locked') return;
                window.showToast?.('Your paid Puter plan has ended, so fast mode is off.', { key: 'fast-mode-plan-ended', throttleMs: 10 * 60 * 1000 });
                render();
            }, () => {});
        }
        if (!_turn.fast && !_turn.firstBuild && !hintShown()) _hintTimer = setTimeout(maybeShowHint, HINT_AFTER_MS);
    }

    function buttonVisible() {
        if (typeof document === 'undefined' || !document.querySelector) return false;
        const btn = document.querySelector('.fast-mode-btn');
        return !!(btn && !btn.hidden && btn.getClientRects().length);
    }

    function maybeShowHint() {
        _hintTimer = null;
        if (!_busy || !_turn || _hintOpen || hintShown()) return;
        const a = access();
        if (a === 'hidden' || !core().supportsFast(_turn.model) || applies(_turn.model)) return;
        // Wait until the user can see it: the tab in front, the chat showing
        // the button (a phone can be on the app view), no dialog and not the
        // panel itself.
        const blocked = _open || !buttonVisible() || document.visibilityState === 'hidden'
            || !!document.querySelector('[aria-modal="true"]');
        if (blocked) {
            _hintTimer = setTimeout(maybeShowHint, HINT_RETRY_MS);
            return;
        }
        showHint(a);
    }

    function showHint(a) {
        markHintShown();
        const paid = a === 'open';
        const title = paid ? 'Speed up this build' : 'Build faster with fast mode';
        const text = paid
            ? `Fast mode makes the AI about ${SPEED} faster and uses ${COST} the credits. It starts with the AI’s next step.`
            : `Fast mode makes the AI about ${SPEED} faster. It comes with a paid Puter plan.`;
        const $hint = $(
            '<div class="fast-mode-hint" role="dialog" aria-labelledby="fast-mode-hint-title" aria-describedby="fast-mode-hint-text">' +
                `<button type="button" class="fast-mode-hint-close" title="Close" aria-label="Close">${window.cross_svg || '×'}</button>` +
                `<p class="fast-mode-hint-title" id="fast-mode-hint-title">${zap()}<span>${title}</span></p>` +
                `<p class="fast-mode-hint-text" id="fast-mode-hint-text">${text}</p>` +
                '<div class="fast-mode-hint-actions">' +
                    '<button type="button" class="fast-mode-hint-later">Not now</button>' +
                    `<button type="button" class="fast-mode-hint-go">${paid ? 'Turn on' : 'Upgrade'}</button>` +
                '</div>' +
            '</div>');
        $('.fast-mode-hint').remove();
        $('body').append($hint);
        _hintOpen = true;
        place(document.querySelector('.fast-mode-hint'));
        syncListeners();
        window.announce?.(title + '. ' + text);
        window.track?.('Fast Mode Hint Shown', { access: a });
    }

    function hideHint() {
        if (!_hintOpen) return;
        _hintOpen = false;
        $('.fast-mode-hint').remove();
        syncListeners();
    }

    // The composer starts or stops showing a turn. The hint belongs to the
    // turn, so it goes with it.
    function setBusy(processing) {
        const was = _busy;
        _busy = !!processing;
        if (!_busy) {
            clearTimeout(_hintTimer);
            _hintTimer = null;
            _turn = null;
            hideHint();
        }
        if (_open && was !== _busy) renderPanel();
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
    $(document).on('click', '.fast-mode-upgrade', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closePanel();
        window.openUpgradeModal?.('fast_mode');
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
        hideHint();
        if (access() !== 'open') {
            window.openUpgradeModal?.('fast_mode_hint');
            return;
        }
        setOn(true, 'hint');
        window.showToast?.('Fast mode is on. It starts with the AI’s next step.');
    });
    $(document).on('click', '.fast-mode-hint-later, .fast-mode-hint-close', function (e) {
        e.preventDefault();
        e.stopPropagation();
        hideHint();
    });
    $(document).on('click', function (e) {
        if (!_open) return;
        if (typeof isInPuterDialog === 'function' && isInPuterDialog(e.target)) return;
        const $t = $(e.target);
        if ($t.closest('.fast-mode-panel').length || $t.closest('.fast-mode-btn').length) return;
        closePanel();
    });
    // A switch in another tab changes this one's next request too.
    window.addEventListener?.('storage', (e) => { if (e.key === ON_KEY) render(); });

    return { SPEED, COST, render, setBusy, turnStarted, requestSpeed, applies, access, isOn, close: closePanel };
})();
