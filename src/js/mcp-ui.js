// The SDK is an ordinary Vite module; this UI follows the app's classic-script
// and jQuery conventions. Server names, URLs, and tool names are always text.
(function () {
    let closePanel;
    window.openMcpConnections = function () {
        closePanel?.();
        window.closeUserPanel?.();
        document.querySelector('.user-menu-btn')?.focus();
        const manager = window.mcpManager;
        if (!manager) { window.showToast?.('Connections are still loading. Please try again.'); return; }
        const $overlay = $(`
            <div class="confirm-modal-overlay mcp-overlay">
                <section class="properties-modal mcp-modal" role="dialog" aria-modal="true" aria-labelledby="mcp-title" tabindex="-1">
                    <div class="mcp-heading"><h2 id="mcp-title">MCP connections</h2><button type="button" class="mcp-close" aria-label="Close connections">×</button></div>
                    <p class="mcp-intro">Connect tools your AI can use across your projects. Only connect servers you trust to receive tool inputs and perform actions.</p>
                    <div class="mcp-list" aria-live="polite"></div>
                    <form class="mcp-add">
                        <h3>Add a server</h3>
                        <label>Name <input name="serverName" maxlength="80" placeholder="My service" autocomplete="off"></label>
                        <label>Server URL <input name="serverUrl" type="url" required placeholder="https://example.com/mcp" autocomplete="off" spellcheck="false"></label>
                        <label>Bearer token <span class="mcp-optional">(optional)</span><input name="serverToken" type="password" autocomplete="off" spellcheck="false" placeholder="Kept only until disconnected or reloaded"></label>
                        <p class="mcp-note">Supports Streamable HTTP with public access or a bearer token. OAuth sign-in and local command servers are not supported yet. URLs are saved on this device; don’t put secrets in them.</p>
                        <button type="submit" class="mcp-primary">Add and connect</button>
                        <p class="mcp-form-error" role="alert"></p>
                    </form>
                </section>
            </div>`);
        $('body').append($overlay);
        const releaseFocus = trapDialogFocus($overlay);
        function render() {
            const active = document.activeElement;
            const activeId = $(active).closest('.mcp-server').data('id');
            const wasToken = active?.matches('input[type="password"]');
            // Preserve an unfinished reconnect token while another row updates.
            const drafts = new Map();
            $overlay.find('.mcp-server').each(function () {
                drafts.set($(this).data('id'), $(this).find('input').val());
            });
            const $list = $overlay.find('.mcp-list').empty();
            const connections = manager.list();
            if (!connections.length) $('<p class="mcp-empty">No servers connected yet.</p>').appendTo($list);
            for (const record of connections) {
                const $row = $('<article class="mcp-server"><h3></h3><p class="mcp-url"></p><p class="mcp-status"></p><div class="mcp-actions"></div></article>');
                $row.data('id', record.id);
                $row.find('h3').text(record.name);
                $row.find('.mcp-url').text(record.url);
                $row.find('.mcp-status').text(record.error || (record.status === 'connected'
                    ? `Connected · ${record.tools.length} tools${record.viaRelay ? ' · using Puter after a browser CORS check' : ''}`
                    : record.status === 'connecting' ? 'Connecting…' : 'Disconnected'));
                const $actions = $row.find('.mcp-actions');
                if (record.status === 'connected' || record.status === 'connecting') {
                    $('<button type="button"></button>').text(record.status === 'connecting' ? 'Cancel' : 'Disconnect')
                        .on('click', () => manager.disconnect(record.id)).appendTo($actions);
                } else {
                    const $label = $('<label>Bearer token (optional)<input type="password" autocomplete="off" spellcheck="false" placeholder="Token for this connection"></label>');
                    $label.find('input').val(drafts.get(record.id) || '');
                    $actions.append($label);
                    $('<button type="button">Connect</button>').on('click', () => {
                        const token = $label.find('input').val();
                        $label.find('input').val('');
                        void manager.connect(record.id, token);
                    }).appendTo($actions);
                }
                $('<button type="button">Remove</button>').on('click', () => manager.remove(record.id)).appendTo($actions);
                if (record.tools.length) {
                    const $details = $('<details><summary>Available tools</summary><ul></ul></details>');
                    record.tools.forEach(name => $('<li></li>').text(name).appendTo($details.find('ul')));
                    $row.append($details);
                }
                $list.append($row);
            }
            if (activeId && !document.contains(active)) {
                const $row = $list.find('.mcp-server').filter(function () { return $(this).data('id') === activeId; });
                const $target = wasToken && $row.find('input').length ? $row.find('input') : $row.find('button').first();
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
        };
        $overlay.on('click', '.mcp-close', () => closePanel?.());
        $overlay.on('click', e => { if (e.target === $overlay[0]) closePanel?.(); });
        $(document).on('keydown.mcpConnections', e => {
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
        window.addEventListener('mcp-connections-changed', render);
        render();
        requestAnimationFrame(() => { $overlay.addClass('open'); $overlay.find('section').trigger('focus'); });
    };
    $(document).on('click', '.user-panel-mcp', () => window.openMcpConnections());
})();
