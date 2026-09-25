// A connection chooses its transport during discovery. Never replay tool calls:
// a CORS-blocked response does not mean the server did not execute the request.
export function browserFirstFetch({ url, browserFetch, relayFetch, origin, isInternalHostname,
    online = () => true, onRelay = () => {}, signal, timeoutMs = 30000 }) {
    let relay = false;
    let discovering = true;
    const endpoint = new URL(url);

    function boundedResponse(response, signal) {
        if (!response.body) return response;
        const reader = response.body.getReader();
        let bytes = 0;
        let ended = false;
        let abort;
        const cleanup = () => { ended = true; signal.removeEventListener('abort', abort); };
        const body = new ReadableStream({
            start(controller) {
                abort = () => {
                    if (ended) return;
                    cleanup();
                    controller.error(signal.reason);
                    reader.cancel().catch(() => {});
                };
                signal.addEventListener('abort', abort, { once: true });
                if (signal.aborted) abort();
            },
            async pull(controller) {
                try {
                    const chunk = await reader.read();
                    if (ended) return;
                    if (chunk.done) { cleanup(); controller.close(); return; }
                    bytes += chunk.value.byteLength;
                    if (bytes > 2_000_000) throw new Error('MCP response exceeded 2 MB.');
                    controller.enqueue(chunk.value);
                } catch (error) {
                    if (ended) return;
                    cleanup(); controller.error(error);
                    reader.cancel().catch(() => {});
                }
            },
            cancel() { cleanup(); return reader.cancel(); },
        });
        return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
    }

    async function send(fetcher, init) {
        const timeout = AbortSignal.timeout(timeoutMs);
        // Ending the session (DELETE) runs after the connection's signal has
        // been aborted, so only its own signal and the timeout bound it.
        // keepalive lets it outlive a page that is being closed.
        const ending = init.method === 'DELETE';
        const combined = AbortSignal.any([ending ? null : signal, init.signal, timeout].filter(Boolean));
        combined.throwIfAborted();
        let listener;
        const aborted = new Promise((_, reject) => {
            listener = () => reject(combined.reason);
            combined.addEventListener('abort', listener, { once: true });
        });
        // Puter's fetch may ignore AbortSignal. Bound the wait locally too, and
        // release a response arriving after cancellation.
        const pending = Promise.resolve().then(() => fetcher(endpoint.href, {
            ...init, credentials: 'omit', redirect: 'error', signal: combined, ...(ending && { keepalive: true }),
        })).then(response => {
            if (combined.aborted) {
                response.body?.cancel().catch(() => {});
                throw combined.reason;
            }
            // Keep cancellation and the byte cap active while reading JSON/SSE,
            // even when Puter's implementation ignores the request signal.
            return boundedResponse(response, combined);
        });
        try { return await Promise.race([pending, aborted]); }
        finally { combined.removeEventListener('abort', listener); }
    }

    async function fetchMcp(input, init = {}) {
        // Do not let server redirects or future SDK auth discovery send a token
        // to another endpoint. OAuth is intentionally not enabled by this client.
        if (new URL(String(input)).href !== endpoint.href) throw new Error('Unexpected MCP endpoint.');
        let response;
        try {
            response = await send(relay ? relayFetch : browserFetch, init);
        } catch (error) {
            let method;
            try { method = JSON.parse(init.body).method; } catch { /* not JSON-RPC */ }
            const safeDiscovery = ['initialize', 'notifications/initialized', 'tools/list'].includes(method);
            if (relay || !discovering || !safeDiscovery || error?.name !== 'TypeError' ||
                signal?.aborted || init.signal?.aborted || !online() ||
                endpoint.origin === origin || isInternalHostname(endpoint.hostname)) throw error;

            // Fetch deliberately conceals CORS details. An opaque response from
            // the SAME endpoint is evidence of reachability without CORS, unlike
            // DNS/TLS/offline/CSP failures. This is a best-effort diagnosis, not
            // proof: browsers expose no API that identifies CORS conclusively.
            const probe = await send(browserFetch, { method: 'HEAD', mode: 'no-cors', cache: 'no-store' });
            await probe.body?.cancel();
            if (probe.type !== 'opaque') throw error;
            relay = true;
            onRelay();
            response = await send(relayFetch, init);
        }
        // No fallback on HTTP errors, parsing errors or a failed response body.
        return response;
    }
    fetchMcp.finishDiscovery = () => { discovering = false; };
    return fetchMcp;
}
