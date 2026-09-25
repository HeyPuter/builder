import { createMcpManager } from './client.mjs';

let storage;
try { storage = window.localStorage; } catch { /* private browsing */ }
window.mcpManager = createMcpManager({
    getOwner: () => window.user?.username || null,
    storage,
    browserFetch: (url, init) => window.fetch(url, init),
    relayFetch: (url, init) => window.puter.net.fetch(url, { ...init, headers: Object.fromEntries(new Headers(init.headers)) }),
    origin: window.location.origin,
    isInternalHostname: hostname => window.__externalFetchInternals.isInternalHostname(hostname),
    online: () => navigator.onLine !== false,
    onChange: () => window.dispatchEvent(new Event('mcp-connections-changed')),
});
window.addEventListener('pagehide', () => window.mcpManager.reset());
// Show servers another tab added or removed (the manager merges them in).
window.addEventListener('storage', event => {
    if (event.key === null || event.key.startsWith('builder.mcp.v1:')) window.dispatchEvent(new Event('mcp-connections-changed'));
});
