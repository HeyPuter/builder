import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { browserFirstFetch } from '../src/mcp/network.mjs';
import { createMcpManager, validateEndpoint, toolResult } from '../src/mcp/client.mjs';

const endpoint = 'https://mcp.example.com/mcp';
const json = value => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
const request = method => ({ method: 'POST', body: JSON.stringify({ jsonrpc: '2.0', id: 1, method }),
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer private-token' } });
const base = { url: endpoint, origin: 'https://builder.puter.com', isInternalHostname: () => false, timeoutMs: 1000 };
let checks = 0;
async function test(name, run) {
    await run(); checks++; console.log(`ok - ${name}`);
}

await test('HTTPS URLs reject embedded credentials, fragments, and invalid schemes', () => {
    for (const value of ['javascript:alert(1)', 'http://example.com/mcp', 'https://me:secret@example.com', endpoint + '#secret', 'nonsense']) {
        assert.throws(() => validateEndpoint(value));
    }
    assert.equal(validateEndpoint(endpoint), endpoint);
});

await test('browser success and HTTP errors never use Puter', async () => {
    for (const status of [200, 401, 403, 404, 429, 500]) {
        let relayed = 0;
        const fetch = browserFirstFetch({ ...base, browserFetch: async (_, init) => {
            assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error');
            return new Response('{}', { status });
        }, relayFetch: async () => { relayed++; } });
        assert.equal((await fetch(endpoint, request('initialize'))).status, status);
        assert.equal(relayed, 0);
    }
});

await test('CORS-compatible reachability check permits discovery fallback only after browser failure', async () => {
    const calls = [];
    const fetch = browserFirstFetch({ ...base, browserFetch: async (_, init) => {
        calls.push('browser:' + init.method);
        if (init.mode === 'no-cors') { assert.equal(init.headers, undefined); return { type: 'opaque' }; }
        throw new TypeError('Failed to fetch');
    }, relayFetch: async (_, init) => {
        calls.push('relay:' + JSON.parse(init.body).method);
        assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer private-token');
        return json({ ok: true });
    } });
    await fetch(endpoint, request('initialize'));
    fetch.finishDiscovery();
    await fetch(endpoint, request('tools/call'));
    assert.deepEqual(calls, ['browser:POST', 'browser:HEAD', 'relay:initialize', 'relay:tools/call']);
});

await test('DNS/TLS, offline, private hosts, same origin, aborts and timeouts never relay', async () => {
    for (const variant of ['unreachable', 'offline', 'private', 'same-origin', 'abort', 'timeout', 'not-opaque']) {
        let relayed = 0;
        const fetch = browserFirstFetch({ ...base,
            ...(variant === 'offline' ? { online: () => false } : {}),
            ...(variant === 'private' ? { isInternalHostname: () => true } : {}),
            ...(variant === 'same-origin' ? { origin: new URL(endpoint).origin } : {}),
            browserFetch: async (_, init) => {
                if (variant === 'abort' || variant === 'timeout') throw new DOMException('Stopped', variant === 'abort' ? 'AbortError' : 'TimeoutError');
                if (init.mode === 'no-cors' && variant === 'not-opaque') return { type: 'basic' };
                throw new TypeError('Failed to fetch');
            }, relayFetch: async () => { relayed++; },
        });
        await assert.rejects(fetch(endpoint, request('initialize')));
        assert.equal(relayed, 0, variant);
    }
});

await test('failed tool calls are never replayed, including before finishDiscovery', async () => {
    let calls = 0;
    const fetch = browserFirstFetch({ ...base, browserFetch: async () => { calls++; throw new TypeError('Failed to fetch'); },
        relayFetch: async () => { assert.fail('Must not relay'); } });
    await assert.rejects(fetch(endpoint, request('tools/call')));
    assert.equal(calls, 1);
    fetch.finishDiscovery();
    await assert.rejects(fetch(endpoint, request('tools/list')));
    assert.equal(calls, 2);
});

await test('endpoint changes and oversized bodies fail without fallback', async () => {
    const fetch = browserFirstFetch({ ...base, browserFetch: async () => new Response('x'.repeat(2_000_001)),
        relayFetch: () => assert.fail('Must not relay') });
    await assert.rejects(fetch('https://other.example/mcp', request('initialize')));
    const response = await fetch(endpoint, request('initialize'));
    await assert.rejects(response.text(), /exceeded/);
});

await test('a relay that ignores abort cannot hang discovery', async () => {
    const controller = new AbortController();
    const fetch = browserFirstFetch({ ...base, signal: controller.signal,
        browserFetch: async (_, init) => { if (init.mode === 'no-cors') return { type: 'opaque' }; throw new TypeError(); },
        relayFetch: async () => { controller.abort(); return new Promise(() => {}); } });
    await assert.rejects(fetch(endpoint, request('initialize')), { name: 'AbortError' });
});

await test('abort cancels an already-open response body even when fetch ignores signals', async () => {
    const controller = new AbortController();
    let cancelled = false;
    const fetch = browserFirstFetch({ ...base, signal: controller.signal,
        browserFetch: async () => new Response(new ReadableStream({ cancel() { cancelled = true; } })),
        relayFetch: () => assert.fail('Must not relay'),
    });
    const response = await fetch(endpoint, request('initialize'));
    const reading = response.text();
    controller.abort();
    await assert.rejects(reading, { name: 'AbortError' });
    assert.equal(cancelled, true);
});

function fixture({ sse = false, failAuth = false, loop = false, toolError = false, hang = false, toolList } = {}) {
    let owner = 'alice';
    const data = new Map();
    const requests = [];
    const response = (id, result) => sse
        ? new Response(`event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id, result })}\n\n`,
            { headers: { 'Content-Type': 'text/event-stream' } })
        : json({ jsonrpc: '2.0', id, result });
    const manager = createMcpManager({ getOwner: () => owner,
        storage: { setItem: (key, value) => data.set(key, value), getItem: key => data.get(key) },
        origin: base.origin, isInternalHostname: () => false, timeoutMs: 1000,
        relayFetch: () => assert.fail('Must use native fetch'),
        browserFetch: async (_, init) => {
            if (init.method === 'GET') return new Response(null, { status: 405 });
            assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer private-token');
            const message = JSON.parse(init.body);
            requests.push(message);
            if (failAuth) return new Response('SECRET SERVER ERROR private-token', { status: 401 });
            if (message.method === 'initialize') {
                return response(message.id, { protocolVersion: '2025-11-25', capabilities: { tools: {} }, serverInfo: { name: 'fixture', version: '1' } });
            }
            if (message.method === 'tools/list') {
                if (toolList) return response(message.id, { tools: toolList });
                return response(message.id, { tools: [{ name: message.params?.cursor ? 'write' : 'read',
                    description: 'A fixture tool', inputSchema: { type: 'object', properties: { path: { type: 'string' } } } }],
                    ...(!message.params?.cursor || loop ? { nextCursor: 'page-two' } : {}) });
            }
            if (message.method === 'tools/call') {
                if (hang) return new Promise(() => {});
                return response(message.id, { content: [{ type: 'text', text: 'Fixture output' }], isError: toolError,
                    structuredContent: { selectedTool: message.params.name, args: message.params.arguments } });
            }
            return new Response(null, { status: 202 });
        },
    });
    const id = manager.add({ name: 'Fixture', url: endpoint });
    return { manager, id, requests, data, setOwner(value) { owner = value; } };
}

for (const sse of [false, true]) {
    await test(`real SDK initialization, pagination, dispatch and results (${sse ? 'SSE' : 'JSON'})`, async () => {
        const { manager, id, requests, data } = fixture({ sse });
        await manager.connect(id, 'private-token');
        assert.equal(manager.list()[0].status, 'connected');
        assert.deepEqual(manager.list()[0].tools, ['read', 'write']);
        const tools = manager.getTools();
        assert.match(tools[0].function.name, /^mcp_[a-f0-9_]+$/);
        assert.notEqual(tools[0].function.name, tools[1].function.name);
        const output = await tools[1].exec({ path: 'hello' });
        assert.equal(output.result.structuredContent.selectedTool, 'write');
        assert.equal(output.result.structuredContent.args.path, 'hello');
        assert.ok(requests.some(request => request.method === 'notifications/initialized'));
        assert.ok(!JSON.stringify([...data]).includes('private-token'));
        manager.disconnect(id);
        assert.equal(manager.getTools().length, 0);
        await assert.rejects(tools[0].exec({}), /disconnected/);
        await manager.connect(id, 'private-token');
        assert.equal(manager.getTools()[0].function.name, tools[0].function.name);
        await assert.rejects(tools[0].exec({}), /disconnected/);
        manager.reset();
    });
}

await test('auth errors are sanitized and repeated cursors fail closed', async () => {
    for (const options of [{ failAuth: true }, { loop: true }]) {
        const { manager, id } = fixture(options);
        await manager.connect(id, 'private-token');
        assert.equal(manager.list()[0].status, 'error');
        assert.equal(manager.getTools().length, 0);
        assert.ok(!manager.list()[0].error.includes('private-token'));
        manager.reset();
    }
});

await test('discovery limits explain the actual problem, not the URL or token', async () => {
    const tool = name => ({ name, inputSchema: { type: 'object' } });
    const cases = [
        [Array.from({ length: 65 }, (_, i) => tool(`t${i}`)), /Too many tools/],
        [[tool('same'), tool('same')], /invalid or duplicate tool definition/],
        [[{ ...tool('big'), description: 'x'.repeat(130000) }], /too large/],
    ];
    for (const [toolList, expected] of cases) {
        const { manager, id } = fixture({ toolList });
        await manager.connect(id, 'private-token');
        assert.equal(manager.list()[0].status, 'error');
        assert.match(manager.list()[0].error, expected);
        assert.equal(manager.getTools().length, 0);
        manager.reset();
    }
    // The limit spans every connection, so a second server that would exceed it
    // says so rather than suggesting its URL or token is wrong.
    const first = fixture({ toolList: Array.from({ length: 60 }, (_, i) => tool(`a${i}`)) });
    await first.manager.connect(first.id, 'private-token');
    assert.equal(first.manager.list()[0].status, 'connected');
    const secondId = first.manager.add({ name: 'Second', url: 'https://other.example.com/mcp' });
    await first.manager.connect(secondId, 'private-token');
    const second = first.manager.list().find(record => record.id === secondId);
    assert.equal(second.status, 'error');
    assert.match(second.error, /Too many tools/);
    assert.equal(first.manager.getTools().length, 60);
    first.manager.reset();
});

await test('account changes discard live tools and isolate saved settings', async () => {
    const { manager, id, setOwner } = fixture();
    await manager.connect(id, 'private-token');
    const [tool] = manager.getTools();
    setOwner('bob');
    assert.equal(manager.list().length, 0);
    await assert.rejects(tool.exec({}), /disconnected/);
    setOwner('alice');
    assert.equal(manager.list()[0].status, 'disconnected');
    assert.equal(manager.getTools().length, 0);
});

await test('disconnect during initialization cannot register late tools', async () => {
    const { manager, id } = fixture();
    const connecting = manager.connect(id, 'private-token');
    manager.disconnect(id);
    await connecting;
    assert.equal(manager.list()[0].status, 'disconnected');
    assert.equal(manager.getTools().length, 0);
});

await test('cancelled tool calls settle promptly and are not replayed', async () => {
    const { manager, id, requests } = fixture({ hang: true });
    await manager.connect(id, 'private-token');
    const controller = new AbortController();
    const call = manager.getTools()[0].exec({}, { abortController: controller });
    await new Promise(resolve => setTimeout(resolve, 10));
    controller.abort();
    await assert.rejects(call, { name: 'AbortError' });
    assert.equal(requests.filter(request => request.method === 'tools/call').length, 1);
    manager.reset();
});

await test('MCP errors remain errors and large results are bounded', async () => {
    const { manager, id } = fixture({ toolError: true });
    await manager.connect(id, 'private-token');
    const result = await manager.getTools()[0].exec({});
    assert.equal(result.isError, true);
    const big = toolResult({ content: [{ type: 'text', text: 'x'.repeat(100000) }] });
    assert.equal(big.truncated, true);
    assert.equal(big.text.length, 64000);
    const media = toolResult({ content: [
        { type: 'text', text: 'Screenshot taken' },
        { type: 'image', mimeType: 'image/png', data: 'A'.repeat(200000) },
        { type: 'audio', mimeType: 'audio/wav', data: 'B'.repeat(4096) },
        { type: 'resource', resource: { uri: 'file:///a.bin', mimeType: 'application/octet-stream', blob: 'C'.repeat(8192) } },
        { type: 'resource', resource: { uri: 'file:///a.txt', text: 'kept' } },
    ], structuredContent: { ok: true } });
    assert.equal(media.truncated, undefined);
    assert.ok(!/AAAA|BBBB|CCCC/.test(JSON.stringify(media)));
    assert.deepEqual(media.result.content[1], { type: 'image', mimeType: 'image/png', omitted: 'image data omitted (147 KB)' });
    assert.equal(media.result.content[2].omitted, 'audio data omitted (3 KB)');
    assert.equal(media.result.content[3].resource.uri, 'file:///a.bin');
    assert.equal(media.result.content[3].resource.omitted, 'Binary resource data omitted (6 KB)');
    assert.equal(media.result.content[4].resource.text, 'kept');
    assert.deepEqual(media.result.structuredContent, { ok: true });
    manager.reset();
});

await test('Builder dispatch uses the turn snapshot and propagates MCP error status', async () => {
    const context = vm.createContext({ window: {} });
    vm.runInContext(fs.readFileSync(new URL('../src/js/tools.js', import.meta.url), 'utf8'), context);
    const { window } = context;
    window.mcpManager = { getTools: () => [{ function: { name: 'mcp_fixture' }, exec: () => 'new' }] };
    const snapshot = [{ function: { name: 'mcp_fixture' }, exec: () => 'captured' }];
    assert.equal(await window.executeFunction('mcp_fixture', {}, { tools: snapshot }), 'captured');
    const history = [];
    context.addToolResultToHistory(history, 'call', { isError: true }, true);
    assert.equal(history[0].content.is_error, true);
    const app = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
    assert.ok(app.includes('tools: turnTools'));
    assert.ok(fs.readFileSync(new URL('../src/index.html', import.meta.url), 'utf8').includes('/mcp/entry.mjs'));
    // The SDK stays out of the start-up bundle: only a dynamic import may load it.
    const client = fs.readFileSync(new URL('../src/mcp/client.mjs', import.meta.url), 'utf8');
    assert.ok(!/^\s*import\s[^(]*@modelcontextprotocol/m.test(client));
    assert.ok(client.includes("import('@modelcontextprotocol/sdk/client/index.js')"));
});

console.log(`\n${checks} MCP checks passed.`);
