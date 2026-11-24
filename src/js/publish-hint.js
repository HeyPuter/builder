// A one-time hint under the toolbar's Publish button, after a build, saying
// that Publish puts the project online.
//
// It shows once in a browser, ever, the first time a build finishes cleanly
// in a project that has a preview and isn't published yet. Not for someone who
// has published a project already, since they know where Publish is, and not
// after a build that ran out of credits, since that one stopped partway.
//
// It waits SHOW_AFTER_MS so the preview loads first and the user sees their
// app before the hint. It then waits for the user to be able to see it: the
// tab in front, the Publish button on screen (a phone shows it only in the
// app view), no dialog, popover or clarify card up, and the preview done
// refreshing. A new build or a switch to another project drops the wait,
// and the next clean build tries again.
//
// Once it shows it counts as shown. Its Publish opens the Publish popover
// (with the address field ready), and so does the toolbar's button. Not now,
// the ✕, Escape and a press anywhere else close it. A new build, a switch to
// another project, a publish from the chat, or the button going off screen
// close it too.
//
// A publish from a popover opened while the hint was up is tracked with
// source 'hint' (openPublishPanel in ui.js).
//
// In the console, PublishHint.show() puts it up now, and PublishHint.reset()
// forgets that it was shown.
window.PublishHint = (function () {
    'use strict';

    const KEY = 'builder.publishHint';
    const SHOW_AFTER_MS = 1500;
    // How soon it tries again while the user can't see it yet.
    const RETRY_MS = 1000;
    const TITLE = 'Put it online';
    const TEXT = 'Publish gives your project a link anyone can open. You can keep editing and publish again any time.';
    const GLOBE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';

    // Stand-in for storage that can't be read or written, for this load.
    let _shownFallback = false;
    let _unsaved = false;
    // The project whose finished build the hint is waiting to show for.
    let _pending = null;
    let _timer = null;
    let _up = false;
    let _bodyObserver = null;
    let _toolbarObserver = null;

    function shown() {
        if (_unsaved) return _shownFallback;
        try { return localStorage.getItem(KEY) === '1'; } catch (e) { return _shownFallback; }
    }
    function markShown() {
        _shownFallback = true;
        try { localStorage.setItem(KEY, '1'); _unsaved = false; } catch (e) { _unsaved = true; }
    }

    const openChat = () => (typeof currentChatId !== 'undefined' ? currentChatId : null);

    // The toolbar's Publish button while it can be seen and used. A phone's
    // chat view hides the preview pane, and with it the button.
    function publishButton() {
        const btn = document.querySelector('.preview-publish-btn');
        return btn && !btn.disabled && btn.getClientRects().length ? btn : null;
    }

    // Whether there is something here to publish: a preview, not published.
    function wanted() {
        return !!(window.user && window.currentPreviewUrl && !window.currentPublishedUrl
            && document.querySelector('.preview-publish-btn'));
    }

    // Something else has the user's attention, or would sit under the hint:
    // a dialog (ours or Puter's), any popover (they mark their trigger
    // aria-expanded, the Publish popover too), a clarify card waiting on an
    // answer, fast mode's bubble, or the preview still applying the build.
    function busyElsewhere() {
        return document.visibilityState === 'hidden'
            || !publishButton()
            || !!document.querySelector('[aria-modal="true"]')
            || !!document.querySelector('puter-dialog, puter-alert, puter-prompt')
            || !!document.querySelector('[aria-haspopup][aria-expanded="true"]')
            || !!document.querySelector('.clarify-card')
            || !!document.querySelector('.fast-mode-hint')
            || !!document.querySelector('.preview-updating');
    }

    function cancel() {
        clearTimeout(_timer);
        _timer = null;
        _pending = null;
    }

    // A build finished cleanly in the open project (app.js). everPublished:
    // a project in the user's list has been published.
    function buildDone({ chatId, everPublished } = {}) {
        if (_up || shown() || everPublished) return;
        cancel();
        _pending = chatId;
        _timer = setTimeout(tryShow, SHOW_AFTER_MS);
    }

    function tryShow() {
        _timer = null;
        if (!_pending || _up || shown()) return;
        if (_pending !== openChat() || !wanted()) { _pending = null; return; }
        if (busyElsewhere()) { _timer = setTimeout(tryShow, RETRY_MS); return; }
        _pending = null;
        show();
    }

    function show() {
        if (_up || !publishButton()) return false;
        cancel();
        markShown();
        const $hint = $(
            '<div class="publish-hint" role="dialog" aria-labelledby="publish-hint-title" aria-describedby="publish-hint-text">' +
                `<button type="button" class="publish-hint-close" title="Close" aria-label="Close">${window.cross_svg || '×'}</button>` +
                `<p class="publish-hint-title" id="publish-hint-title">${GLOBE}<span>${TITLE}</span></p>` +
                `<p class="publish-hint-text" id="publish-hint-text">${TEXT}</p>` +
                '<div class="publish-hint-actions">' +
                    '<button type="button" class="publish-hint-later">Not now</button>' +
                    '<button type="button" class="publish-hint-go">Publish</button>' +
                '</div>' +
            '</div>');
        $hint.find('.publish-hint-go').on('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            hide('publish');
            window.openPublishPanel?.({ source: 'hint' });
        });
        $hint.find('.publish-hint-later').on('click', (e) => { e.preventDefault(); e.stopPropagation(); hide('later'); });
        $hint.find('.publish-hint-close').on('click', (e) => { e.preventDefault(); e.stopPropagation(); hide('close'); });
        $('.publish-hint').remove();
        $('body').append($hint);
        _up = true;
        $('.preview-publish-btn').addClass('is-hinted');
        place();
        listen(true);
        // Not focused: it shows on its own, and the user may be typing.
        window.announce?.(TITLE + '. ' + TEXT);
        window.track?.('Publish Hint Shown');
        return true;
    }

    // how: publish, later, close, escape, outside (a press elsewhere), build
    // (a new build started) or away (the project, the preview or the button
    // went, or the site was published from the chat).
    function hide(how) {
        cancel();
        if (!_up) return false;
        _up = false;
        listen(false);
        $('.publish-hint').remove();
        $('.preview-publish-btn').removeClass('is-hinted');
        window.track?.('Publish Hint Closed', { how });
        return true;
    }

    // Under the button, its right edge just past the button's, or above it
    // when there's only room there. The caret points at the button's middle
    // (--fast-caret-x, the bubble styles it shares with fast mode's).
    function place() {
        const el = document.querySelector('.publish-hint');
        const btn = publishButton();
        if (!el || !btn) return;
        const b = btn.getBoundingClientRect();
        const gap = 10;
        const edge = 8;
        const viewportW = document.documentElement.clientWidth || window.innerWidth;
        const viewportH = window.innerHeight;
        const height = el.offsetHeight;
        const below = viewportH - edge - (b.bottom + gap) >= height || b.top - gap - edge < height;
        el.style.top = (below ? b.bottom + gap : b.top - gap - height) + 'px';
        const width = el.offsetWidth;
        const left = Math.max(edge, Math.min(b.right + 6 - width, viewportW - width - edge));
        el.style.left = left + 'px';
        el.style.setProperty('--fast-caret-x', Math.round(b.left + b.width / 2 - left) + 'px');
        el.classList.toggle('is-below', below);
    }

    // The button moves with the window, the chat panel opening or closing
    // (the body's classes) and the toolbar's own width. Once it can't be
    // seen, the hint goes.
    function reposition() {
        if (!_up) return;
        if (!publishButton()) { hide('away'); return; }
        place();
    }

    function onPointerDown(e) {
        const t = e.target;
        if (!t || !t.closest) return;
        // The button opens the popover, which closes the hint as 'publish'.
        if (t.closest('.publish-hint') || t.closest('.preview-publish-btn')) return;
        if (window.isInPuterDialog?.(t)) return;
        hide('outside');
    }
    function onKeyDown(e) {
        if (e.key === 'Escape') hide('escape');
    }

    function listen(on) {
        if (on) {
            window.addEventListener('resize', reposition);
            document.addEventListener('pointerdown', onPointerDown, true);
            document.addEventListener('keydown', onKeyDown, true);
            if (typeof MutationObserver !== 'undefined') {
                _bodyObserver = new MutationObserver(reposition);
                _bodyObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
            }
            const toolbar = document.querySelector('.preview-toolbar');
            if (toolbar && typeof ResizeObserver !== 'undefined') {
                _toolbarObserver = new ResizeObserver(reposition);
                _toolbarObserver.observe(toolbar);
            }
        } else {
            window.removeEventListener('resize', reposition);
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown, true);
            if (_bodyObserver) { _bodyObserver.disconnect(); _bodyObserver = null; }
            if (_toolbarObserver) { _toolbarObserver.disconnect(); _toolbarObserver = null; }
        }
    }

    // The composer starts or stops showing a turn (updateSendButtonState).
    // A new build takes the hint, and any wait for it, with it.
    function setBusy(processing) {
        if (processing) hide('build');
    }

    // The Publish popover is opening (openPublishPanel). True when the hint
    // was up, so a publish from it counts as the hint's.
    function panelOpened() {
        return hide('publish');
    }

    // The Publish button's state may have changed (refreshPublishButton): a
    // publish from the chat's card, or a publish starting.
    function refresh() {
        if (!_up) return;
        if (window.currentPublishedUrl || !publishButton()) hide('away');
        else place();
    }

    function reset() {
        _shownFallback = false;
        _unsaved = false;
        try { localStorage.removeItem(KEY); } catch (e) { /* the fallback is reset */ }
    }

    return { buildDone, setBusy, panelOpened, refresh, hide, show, reset, isUp: () => _up };
})();
