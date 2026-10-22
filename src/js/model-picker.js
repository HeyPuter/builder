// The composer's model picker: which AI model builds the open project.
//
// Choosing a model is part of a paid Puter plan, like editing code yourself,
// and follows the same three states (ModelCore.pickerAccess): hidden without a
// real account, locked on the free plan (the models are listed with an upgrade
// offer, and builds use the default), open on a paid plan.
//
// The choice is a project setting stored on the project's system message
// (history[0].buildModel), so every save, Duplicate and reload carries it, and
// prepareHistoryForAI strips it before anything is sent. A new project starts
// on the user's last pick (this browser's), and keeps the model it started on.
// The pure rules live in model-core.js; this is the button, the panel and the
// turn hand-off (claimForTurn / allowedForTurn, called by sendChatMessage).
window.ModelPicker = (function () {
    const LAST_PICK_KEY = 'builder.lastModel';
    const lock_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

    let _open = false;
    // A turn is running: the picker is disabled, like the rest of the composer.
    let _busy = false;

    const core = () => window.ModelCore;

    function readLastPick() {
        try { return localStorage.getItem(LAST_PICK_KEY); } catch (e) { return null; }
    }
    function writeLastPick(id) {
        try { localStorage.setItem(LAST_PICK_KEY, id); } catch (e) { /* the project keeps its own copy */ }
    }

    function liveHistory() {
        return typeof chatHistory !== 'undefined' && Array.isArray(chatHistory) ? chatHistory : [];
    }
    function systemOf(history) {
        return Array.isArray(history) && history[0] && history[0].role === 'system' ? history[0] : null;
    }

    function access(user) {
        const u = user === undefined ? window.user : user;
        return core().pickerAccess({
            flagOn: !!(window.FEATURE_FLAGS && window.FEATURE_FLAGS.modelPicker),
            signedIn: !!u,
            isTemp: !!(u && u.is_temp),
            subscribed: !!(u && window.Branding && window.Branding.isSubscribed(u)),
        });
    }

    // The model a project is set to (see ModelCore.projectModel).
    function projectModel(history) {
        history = history || liveHistory();
        const sys = systemOf(history);
        return core().projectModel({
            stored: sys && sys.buildModel,
            isNew: countUserMessages(history) === 0,
            lastPick: readLastPick(),
        });
    }

    // What the open project builds with now: its model on a paid plan, the
    // default otherwise. The button shows this.
    function shownModel() {
        return access() === 'open' ? projectModel() : core().DEFAULT_MODEL;
    }

    function render() {
        const $btn = $('.model-picker-btn');
        if (!$btn.length) return;
        if (access() === 'hidden') {
            closePanel();
            $btn.prop('hidden', true);
            return;
        }
        const m = core().get(shownModel());
        $btn.prop('hidden', false)
            .prop('disabled', _busy)
            .attr({ title: 'AI model: ' + m.label, 'aria-label': 'AI model: ' + m.label });
        $btn.find('.model-picker-label').text(m.short);
        if (_open) renderPanel();
    }

    function renderPanel() {
        const a = access();
        const current = shownModel();
        const esc = (s) => (typeof htmlEscape === 'function' ? htmlEscape(s) : String(s));
        const rows = core().ids().map((id) => {
            const m = core().get(id);
            const selected = id === current;
            const locked = a !== 'open' && id !== core().DEFAULT_MODEL;
            const mark = selected
                ? `<span class="model-option-check">${window.check_svg || ''}</span>`
                : locked ? `<span class="model-option-lock" title="Paid plan">${lock_svg}</span>` : '';
            return `<button type="button" class="model-panel-option${selected ? ' selected' : ''}${locked ? ' locked' : ''}" data-model="${esc(id)}" aria-pressed="${selected}">` +
                '<span class="model-option-text">' +
                    `<span class="model-option-name">${esc(m.label)}${m.beta ? '<span class="model-option-tag">Beta</span>' : ''}</span>` +
                    `<span class="model-option-note">${esc(core().noteFor(id))}</span>` +
                '</span>' +
                mark +
            '</button>';
        }).join('');
        // Free plan only: the upgrade offer under the list.
        const foot = a === 'open'
            ? ''
            : '<div class="model-panel-upsell"><p>Unlock every model with a paid Puter plan.</p><button type="button" class="model-panel-upgrade">Upgrade</button></div>';
        const $panel = $(
            '<div class="model-picker-panel" role="dialog" aria-label="AI model" tabindex="-1">' +
                `<div class="model-panel-header"><span>AI model</span><button type="button" class="model-panel-close" title="Close" aria-label="Close">${window.cross_svg || window.x_svg || '×'}</button></div>` +
                `<div class="model-panel-body">${rows}</div>` +
                foot +
            '</div>');
        $('.model-picker-panel').remove();
        // On the body, not in the composer: the landing column scrolls
        // (overflow-y: auto), which clipped a panel opening above it.
        $('body').append($panel);
        positionPanel();
    }

    // Place the fixed panel next to the composer: above it when it fits (or
    // when above has more room), else below, never past the top of the chat
    // column (the toolbar) or the bottom of the window. What doesn't fit
    // scrolls inside the panel.
    function positionPanel() {
        if (typeof document === 'undefined' || !document.querySelector) return;
        const panel = document.querySelector('.model-picker-panel');
        const btn = document.querySelector('.model-picker-btn');
        if (!panel || !btn) return;
        const composer = (btn.closest && btn.closest('.chat-input')) || btn;
        const column = btn.closest && btn.closest('.chat');
        const c = composer.getBoundingClientRect();
        const gap = 8;
        const edge = 8;
        const viewportW = document.documentElement.clientWidth || window.innerWidth;
        const viewportH = window.innerHeight;
        const topLimit = Math.max(edge, column ? column.getBoundingClientRect().top + edge : edge);
        panel.style.maxHeight = 'none';
        const natural = panel.offsetHeight;
        const above = c.top - gap - topLimit;
        const below = viewportH - edge - (c.bottom + gap);
        const up = natural <= above || above >= below;
        const height = Math.max(0, Math.min(natural, up ? above : below));
        panel.style.maxHeight = height + 'px';
        panel.style.top = (up ? c.top - gap - height : c.bottom + gap) + 'px';
        const left = Math.min(c.left + 8, viewportW - panel.offsetWidth - edge);
        panel.style.left = Math.max(edge, left) + 'px';
    }
    // The composer moves with the window, the landing column's scroll and the
    // composer's own growth while the panel is open.
    function onViewportChange(e) {
        const target = e && e.target;
        if (target && target.closest && target.closest('.model-picker-panel')) return;
        positionPanel();
    }

    function openPanel() {
        if (_busy || access() === 'hidden') return;
        _open = true;
        $('.model-picker-btn').attr('aria-expanded', 'true');
        renderPanel();
        window.addEventListener?.('resize', onViewportChange);
        window.addEventListener?.('scroll', onViewportChange, true);
        // The dialog takes focus (not a row) so Escape works and Tab reaches
        // the options, without a focus ring from a mouse open.
        $('.model-picker-panel').trigger('focus');
        window.track?.('Model Picker Opened', { access: access() });
    }

    function closePanel({ focus = false } = {}) {
        const wasOpen = _open;
        _open = false;
        window.removeEventListener?.('resize', onViewportChange);
        window.removeEventListener?.('scroll', onViewportChange, true);
        $('.model-picker-btn').attr('aria-expanded', 'false');
        $('.model-picker-panel').remove();
        if (focus && wasOpen) $('.model-picker-btn').trigger('focus');
    }

    function choose(id) {
        if (!core().get(id)) return;
        if (access() !== 'open') {
            closePanel({ focus: id === core().DEFAULT_MODEL });
            if (id !== core().DEFAULT_MODEL) window.openUpgradeModal?.('model_picker');
            return;
        }
        const from = projectModel();
        closePanel({ focus: true });
        if (id === from) return;
        const history = liveHistory();
        const sys = systemOf(history);
        if (sys) sys.buildModel = id;
        writeLastPick(id);
        // A saved project keeps the choice now; a new one saves it with its
        // first message.
        if (typeof savedChats !== 'undefined' && savedChats.some((c) => c.id === currentChatId)) {
            scheduleSaveCurrentChat({ currentChatId, chatHistory: history });
        }
        render();
        window.track?.('Model Changed', { from, to: id, new_project: countUserMessages(history) === 0 });
        window.announce?.(core().get(id).label + ' will build this project.');
    }

    // Turn start, before the user's message joins the history: the model this
    // project is set to, written onto it if it had none, so a new project keeps
    // the model it started on even when the last pick changes later.
    function claimForTurn(history) {
        const id = projectModel(history);
        const sys = systemOf(history);
        if (sys && !core().get(sys.buildModel)) sys.buildModel = id;
        return id;
    }

    // The model the turn may use. The default needs no check. Another model
    // gets a fresh plan check, since a plan can end while the page is open.
    async function allowedForTurn(chosen) {
        if (chosen === core().DEFAULT_MODEL) return core().resolveTurnModel({ fallback: MODEL });
        const user = window.refreshUserPlan ? await window.refreshUserPlan() : window.user;
        const a = access(user);
        if (a === 'locked') {
            window.showToast?.('Your paid Puter plan has ended, so this project builds with Claude Opus 5.5.', { key: 'model-plan-ended', throttleMs: 10 * 60 * 1000 });
            render();
        }
        return core().resolveTurnModel({ chosen, allowed: a === 'open', fallback: MODEL });
    }

    function setBusy(processing) {
        _busy = !!processing;
        if (_busy) closePanel();
        render();
    }

    $(document).on('click', '.model-picker-btn', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (_open) closePanel();
        else openPanel();
    });
    $(document).on('click', '.model-picker-panel .model-panel-option', function (e) {
        e.preventDefault();
        e.stopPropagation();
        choose($(this).attr('data-model'));
    });
    $(document).on('click', '.model-panel-upgrade', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closePanel();
        window.openUpgradeModal?.('model_picker');
    });
    $(document).on('click', '.model-panel-close', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closePanel({ focus: true });
    });
    $(document).on('keydown', '.model-picker-panel', function (e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            closePanel({ focus: true });
        }
    });
    $(document).on('click', function (e) {
        if (!_open) return;
        if (typeof isInPuterDialog === 'function' && isInPuterDialog(e.target)) return;
        const $t = $(e.target);
        if ($t.closest('.model-picker-panel').length || $t.closest('.model-picker-btn').length) return;
        closePanel();
    });

    return { render, setBusy, close: closePanel, access, projectModel, claimForTurn, allowedForTurn };
})();
