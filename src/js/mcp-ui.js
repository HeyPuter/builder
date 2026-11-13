// The Settings modal, opened by the toolbar's gear (beside <puter-user-menu>)
// and by the account panel's MCP connections row. Four tabs, MCP
// connections, Appearance (the Light / Dark / Device theme control),
// Notifications (the build notifications switch, from js/build-notify.js) and
// Projects (restore projects missing from the sidebar; /?settings=projects
// opens it, see openSettingsFromLink in app.js).
// The SDK is an ordinary Vite module; this UI follows the app's classic-script
// and jQuery conventions. Server names, URLs, and tool names are always text.
(function () {
    let closePanel;
    // The gear reopens the tab last shown; the MCP row asks for its own.
    let lastTab = 'mcp';
    window.openSettings = function (tab) {
        if (tab === 'mcp' || tab === 'appearance' || tab === 'notifications' || tab === 'projects') lastTab = tab;
        closePanel?.();
        window.closeUserPanel?.();
        document.querySelector('.user-menu-btn')?.focus();
        const manager = window.mcpManager;
        if (!manager) { window.showToast?.('Connections are still loading. Please try again.'); return; }
        const $overlay = $(`
            <div class="confirm-modal-overlay mcp-overlay">
                <section class="properties-modal mcp-modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" tabindex="-1">
                    <div class="mcp-heading"><h2 id="settings-title">Settings</h2><button type="button" class="mcp-close" aria-label="Close settings">×</button></div>
                    <div class="settings-tabs" role="tablist" aria-label="Settings sections">
                        <button type="button" class="settings-tab" role="tab" id="settings-tab-mcp" aria-controls="settings-panel-mcp" data-tab="mcp">MCP connections</button>
                        <button type="button" class="settings-tab" role="tab" id="settings-tab-appearance" aria-controls="settings-panel-appearance" data-tab="appearance">Appearance</button>
                        <button type="button" class="settings-tab" role="tab" id="settings-tab-notifications" aria-controls="settings-panel-notifications" data-tab="notifications">Notifications</button>
                        <button type="button" class="settings-tab" role="tab" id="settings-tab-projects" aria-controls="settings-panel-projects" data-tab="projects">Projects</button>
                    </div>
                    <div class="settings-panel" role="tabpanel" id="settings-panel-mcp" aria-labelledby="settings-tab-mcp" data-tab="mcp">
                    <p class="mcp-intro">Connect tools your AI can use across your projects. Only connect servers you trust to receive tool inputs and perform actions.</p>
                    <div class="mcp-list"></div>
                    <p class="mcp-announce" role="status"></p>
                    <form class="mcp-add">
                        <h4>Add a server</h4>
                        <label>Name <input name="serverName" maxlength="80" placeholder="My service" autocomplete="off"></label>
                        <label>Server URL <input name="serverUrl" type="url" required placeholder="https://example.com/mcp" autocomplete="off" spellcheck="false"></label>
                        <label>Bearer token <span class="mcp-optional">(optional)</span><input name="serverToken" type="password" autocomplete="off" spellcheck="false" placeholder="Kept only until disconnected or reloaded"></label>
                        <p class="mcp-note">Supports Streamable HTTP with public access or a bearer token. OAuth sign-in and local command servers are not supported yet. URLs are saved on this device; don’t put secrets in them.</p>
                        <button type="submit" class="mcp-primary">Add and connect</button>
                        <p class="mcp-form-error" role="alert"></p>
                    </form>
                    </div>
                    <div class="settings-panel" role="tabpanel" id="settings-panel-appearance" aria-labelledby="settings-tab-appearance" data-tab="appearance">
                        <div class="settings-theme">
                            <span class="user-theme-label" id="settings-theme-label">Theme</span>
                            ${window.themeSegmentHtml('settings-theme-label')}
                        </div>
                        <p class="mcp-note">Device follows your system’s light or dark setting.</p>
                    </div>
                    <div class="settings-panel" role="tabpanel" id="settings-panel-notifications" aria-labelledby="settings-tab-notifications" data-tab="notifications">
                        ${window.BuildNotify?.settingsHtml?.() || ''}
                    </div>
                    <div class="settings-panel" role="tabpanel" id="settings-panel-projects" aria-labelledby="settings-tab-projects" data-tab="projects">
                        <h4 class="settings-restore-title">Restore missing projects</h4>
                        <p class="mcp-note">If a project is missing from your sidebar, Builder can look through your saved projects for any that aren’t listed. Looking changes nothing.</p>
                        <button type="button" class="settings-restore-scan">Look for missing projects</button>
                        <div class="settings-restore-result" role="status"></div>
                    </div>
                </section>
            </div>`);
        $('body').append($overlay);
        // A theme change re-renders the toolbar, replacing the gear that opened
        // Settings; closing hands focus to its replacement instead of <body>.
        const fromGear = !!document.activeElement?.classList.contains('settings-btn');
        const releaseFocus = trapDialogFocus($overlay);
        // Tabs: only the selected one is a Tab stop, and the arrow keys (with
        // Home/End) move between them, selecting as they go.
        const $tabs = $overlay.find('.settings-tab');
        // On a phone the strip scrolls sideways: bring the selected tab into
        // it (a link can open Settings on the last one). Called again once
        // the dialog is shown, since nothing has a size before that.
        function revealSelectedTab() {
            const tab = $tabs.filter('[aria-selected="true"]')[0];
            const strip = tab && tab.parentNode;
            if (!strip || typeof tab.getBoundingClientRect !== 'function') return;
            const s = strip.getBoundingClientRect(), t = tab.getBoundingClientRect();
            if (!s.width) return;
            if (t.left < s.left) strip.scrollLeft -= s.left - t.left;
            else if (t.right > s.right) strip.scrollLeft += t.right - s.right;
        }
        function selectTab(key, focus) {
            lastTab = key;
            $tabs.each(function () {
                const selected = this.dataset.tab === key;
                $(this).attr({ 'aria-selected': selected ? 'true' : 'false', tabindex: selected ? '0' : '-1' });
                if (selected && focus) this.focus();
            });
            revealSelectedTab();
            $overlay.find('.settings-panel').each(function () { this.hidden = this.dataset.tab !== key; });
        }
        selectTab(lastTab, false);
        $tabs.on('click', function () { selectTab(this.dataset.tab, true); });
        $tabs.on('keydown', function (e) {
            const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
            let i = $tabs.index(this);
            if (step) i = (i + step + $tabs.length) % $tabs.length;
            else if (e.key === 'Home') i = 0;
            else if (e.key === 'End') i = $tabs.length - 1;
            else return;
            e.preventDefault();
            selectTab($tabs[i].dataset.tab, true);
        });
        // The list is rebuilt on every change, so it is not a live region (that
        // re-read every row). Only a row whose status changed is announced.
        const announced = new Map();
        function render() {
            const changes = [];
            const active = document.activeElement;
            const activeId = $(active).closest('.mcp-server').data('id');
            const wasToken = active?.matches('input[type="password"]');
            const wasSummary = active?.matches('summary');
            // Preserve an unfinished reconnect token and an expanded tool list
            // (with its scroll position) while another row updates.
            const drafts = new Map();
            const expanded = new Map();
            $overlay.find('.mcp-server').each(function () {
                drafts.set($(this).data('id'), $(this).find('input').val());
                const details = $(this).find('details')[0];
                if (details?.open) expanded.set($(this).data('id'), details.querySelector('ul').scrollTop);
            });
            const $list = $overlay.find('.mcp-list').empty();
            const connections = manager.list();
            if (!connections.length) $('<p class="mcp-empty">No servers connected yet.</p>').appendTo($list);
            for (const record of connections) {
                const $row = $('<article class="mcp-server"><h4></h4><p class="mcp-url"></p><p class="mcp-status"></p><div class="mcp-actions"></div></article>');
                // Every row has the same controls, so name each one after its
                // server: a screen reader otherwise lists "Remove, Remove, …".
                $row.data('id', record.id).attr({ 'data-status': record.status, 'aria-labelledby': `mcp-name-${record.id}` });
                $row.find('h4').attr('id', `mcp-name-${record.id}`).text(record.name);
                $row.find('.mcp-url').text(record.url);
                const status = record.error || (record.status === 'connected'
                    ? `Connected · ${record.tools.length} ${record.tools.length === 1 ? 'tool' : 'tools'}${record.viaRelay ? ' · using Puter after a browser CORS check' : ''}`
                    : record.status === 'connecting' ? 'Connecting…' : 'Disconnected');
                $row.find('.mcp-status').text(status);
                if (announced.get(record.id) !== status) {
                    if (announced.has(record.id)) changes.push(`${record.name}: ${status}`);
                    announced.set(record.id, status);
                }
                const $actions = $row.find('.mcp-actions');
                if (record.status === 'connected' || record.status === 'connecting') {
                    const verb = record.status === 'connecting' ? 'Cancel' : 'Disconnect';
                    $('<button type="button"></button>').text(verb).attr('aria-label', `${verb} ${record.name}`)
                        .on('click', () => manager.disconnect(record.id)).appendTo($actions);
                } else {
                    const $label = $('<label>Bearer token <span class="mcp-optional">(optional)</span><input type="password" autocomplete="off" spellcheck="false" placeholder="Token for this connection"></label>');
                    $label.find('input').val(drafts.get(record.id) || '')
                        .attr('aria-label', `Bearer token for ${record.name} (optional)`);
                    $actions.append($label);
                    const connect = () => {
                        const token = $label.find('input').val();
                        $label.find('input').val('');
                        void manager.connect(record.id, token);
                    };
                    // Enter connects, as it adds a server in the form below.
                    $label.find('input').on('keydown', e => {
                        if (e.key === 'Enter' && !window.isComposingKeyEvent(e)) { e.preventDefault(); connect(); }
                    });
                    $('<button type="button">Connect</button>').attr('aria-label', `Connect ${record.name}`)
                        .on('click', connect).appendTo($actions);
                }
                $('<button type="button">Remove</button>').attr('aria-label', `Remove ${record.name}`)
                    .on('click', () => manager.remove(record.id)).appendTo($actions);
                if (record.tools.length) {
                    const $details = $('<details><summary>Available tools</summary><ul></ul></details>');
                    record.tools.forEach(name => $('<li></li>').text(name).appendTo($details.find('ul')));
                    $details.prop('open', expanded.has(record.id));
                    $row.append($details);
                }
                $list.append($row);
                if (expanded.has(record.id)) $row.find('details ul').scrollTop(expanded.get(record.id));
            }
            if (changes.length) $overlay.find('.mcp-announce').text(changes.join('. '));
            if (activeId && !document.contains(active)) {
                const $row = $list.find('.mcp-server').filter(function () { return $(this).data('id') === activeId; });
                const $target = wasToken && $row.find('input').length ? $row.find('input')
                    : wasSummary && $row.find('summary').length ? $row.find('summary') : $row.find('button').first();
                ($target.length ? $target : $overlay.find('section')).trigger('focus');
            }
        }
        closePanel = function () {
            window.removeEventListener('mcp-connections-changed', render);
            $(document).off('keydown.mcpConnections');
            $overlay.find('input[type="password"]').val('');
            releaseFocus();
            $overlay.remove();
            closePanel = null;
            if (fromGear && (!document.activeElement || document.activeElement === document.body)) {
                document.querySelector('.settings-btn')?.focus({ preventScroll: true });
            }
        };
        $overlay.on('click', '.mcp-close', () => closePanel?.());
        // A click on the backdrop doesn't close Settings (a stray click would
        // lose a half-typed server); the modal jolts to say it's still open.
        // Only when the press also began on the backdrop: a text selection
        // dragged out of a field ends in a click on the overlay.
        let pressedBackdrop = false;
        $overlay.on('pointerdown', e => { pressedBackdrop = e.target === $overlay[0]; });
        $overlay.on('click', e => {
            if (!pressedBackdrop || e.target !== $overlay[0]) return;
            const modal = $overlay.find('.settings-modal')[0];
            modal.classList.remove('is-jolting');
            void modal.offsetWidth; // restart the animation on a quick second click
            modal.classList.add('is-jolting');
        });
        $overlay.on('animationend', '.settings-modal', function (e) { if (e.target === this) this.classList.remove('is-jolting'); });
        $(document).on('keydown.mcpConnections', e => {
            if (window.isComposingKeyEvent(e)) return; // Escape cancels the IME, not the dialog
            if (!window.keyIsForDialog(e, $overlay[0])) return; // e.g. a Puter dialog above this one
            if (e.key === 'Escape') { e.preventDefault(); closePanel?.(); }
        });
        $overlay.find('form').on('submit', function (e) {
            e.preventDefault();
            const form = this;
            const $error = $overlay.find('.mcp-form-error').text('');
            try {
                const id = manager.add({ name: form.elements.serverName.value, url: form.elements.serverUrl.value });
                const token = form.elements.serverToken.value;
                form.reset();
                void manager.connect(id, token);
            } catch (error) { $error.text(error.message); }
        });
        // Projects: look for saved projects the sidebar doesn't list, then put
        // back the ones found (findMissingProjects / restoreMissingProjects in
        // app.js). Looking is read-only; restoring only adds list entries.
        // Titles come from the user's files and are always set as text.
        const $restore = $overlay.find('.settings-restore-result');
        const $scan = $overlay.find('.settings-restore-scan');
        const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
        const say = (text, cls) => $('<p class="mcp-note"></p>').addClass(cls || '').text(text).appendTo($restore);
        const sayUnreadable = (names) => {
            if (names.length) say(`${plural(names.length, 'saved file')} couldn’t be read and ${names.length === 1 ? 'was' : 'were'} left as ${names.length === 1 ? 'it is' : 'they are'}.`);
        };
        // A waiting button is aria-disabled, not disabled (as elsewhere in the
        // app): disabling the button just pressed drops keyboard focus to
        // <body>, out of the dialog. restoreBusy refuses a second press.
        const setWaiting = ($btn, waiting) => waiting ? $btn.attr('aria-disabled', 'true') : $btn.removeAttr('aria-disabled');
        // The results are rebuilt around whatever was focused in them (the
        // Restore button, once pressed); focus left on <body> by that goes to
        // the button that starts over.
        const emptyResults = () => {
            const hadFocus = $restore[0].contains(document.activeElement);
            $restore.empty();
            if (hadFocus) $scan.trigger('focus');
        };
        // Where restored projects land: first in the list, which is the top of
        // the sidebar unless it is split into Pinned and Recent (it is once
        // anything is pinned), and a restored project keeps its pin.
        const whereRestored = (restored) => {
            if (!document.querySelector('.chat-section-label[data-section="pinned"]')) return 'at the top of your sidebar';
            const pinned = restored.filter(c => c && c.pinned).length;
            if (pinned === 0) return 'at the top of Recent in your sidebar';
            if (pinned === restored.length) return 'at the top of Pinned in your sidebar';
            return 'back in your sidebar';
        };
        let restoreBusy = false;
        $scan.on('click', async function () {
            if (restoreBusy) return;
            restoreBusy = true;
            setWaiting($scan, true).text('Looking…');
            emptyResults();
            try {
                const found = await window.findMissingProjects();
                if (!found.missing.length) {
                    say('Every saved project is already in your sidebar.');
                    sayUnreadable(found.unreadable);
                    return;
                }
                // The action comes before the list: a long list scrolls with the
                // dialog, and the button must not end up below the fold.
                say(`Found ${plural(found.missing.length, 'project')} that ${found.missing.length === 1 ? 'isn’t' : 'aren’t'} in your sidebar. Restoring puts ${found.missing.length === 1 ? 'it' : 'them'} back. No project files are changed.`);
                const ids = found.missing.map(c => c.id);
                const $go = $('<button type="button" class="mcp-primary settings-restore-go"></button>')
                    .text(`Restore ${plural(ids.length, 'project')}`).appendTo($restore);
                const $list = $('<ul class="settings-restore-list"></ul>').appendTo($restore);
                for (const chat of found.missing) {
                    const $item = $('<li></li>').appendTo($list);
                    $('<span class="settings-restore-name"></span>').text(chat.title || 'Untitled project').appendTo($item);
                    const when = chat.lastModified ? new Date(chat.lastModified) : null;
                    if (when && !isNaN(when)) $('<span class="settings-restore-date"></span>').text(when.toLocaleDateString()).appendTo($item);
                }
                sayUnreadable(found.unreadable);
                $go.on('click', async function () {
                    if (restoreBusy) return;
                    restoreBusy = true;
                    setWaiting($go, true).text('Restoring…');
                    setWaiting($scan, true);
                    try {
                        const done = await window.restoreMissingProjects(ids);
                        emptyResults();
                        if (!done.restored.length) say('Those projects are already in your sidebar.');
                        else if (done.saved) say(`Restored ${plural(done.restored.length, 'project')}. ${done.restored.length === 1 ? 'It’s' : 'They’re'} ${whereRestored(done.restored)}.`);
                        else say(`${done.restored.length === 1 ? 'The project is' : 'The projects are'} back in your sidebar, but that couldn’t be saved yet. Keep this tab open: Builder saves it with your next change.`, 'settings-restore-error');
                        if (done.restored.length) window.track?.('Missing Projects Restored', { count: done.restored.length, saved: !!done.saved });
                    } catch (error) {
                        console.error('Restore missing projects failed:', error);
                        emptyResults();
                        say('Couldn’t restore just now, and nothing was changed. Check your connection and try again.', 'settings-restore-error');
                    } finally {
                        restoreBusy = false;
                        setWaiting($scan, false);
                    }
                });
            } catch (error) {
                console.error('Looking for missing projects failed:', error);
                emptyResults();
                say('Couldn’t look just now. Check your connection and try again.', 'settings-restore-error');
            } finally {
                restoreBusy = false;
                setWaiting($scan, false).text('Look for missing projects');
            }
        });
        window.addEventListener('mcp-connections-changed', render);
        render();
        requestAnimationFrame(() => { $overlay.addClass('open'); $overlay.find('section').trigger('focus'); revealSelectedTab(); });
    };
    $(document).on('click', '.user-panel-mcp', () => window.openSettings('mcp'));
})();
