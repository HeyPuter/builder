import fs from 'node:fs';

// ---- Regression guard: FetchExternalResource is bounded and its output is data
// The tool fetches a model-chosen URL through Puter's network relay and hands
// the body to the model. It used to accept any URL (including loopback,
// link-local and private addresses the relay could reach), buffer the whole
// body before trimming, wait forever on a host that never answered, dump
// binary bodies as mojibake, and return the text with no marker that it is
// third-party content — the one intake path with no untrusted-data fence.
// Evaluates the real helpers and text-asserts the exec wiring.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const src = fs.readFileSync(new URL('../src/tools/external_info/external_fetch.js', import.meta.url), 'utf8');
const a = src.indexOf('window.__externalFetchInternals = (function () {');
const b = src.indexOf('window.tools.push({');
if (a < 0 || b <= a) throw new Error('could not extract the internals from external_fetch.js');
const win = {};
new Function('window', src.slice(a, b))(win);
const I = win.__externalFetchInternals;

// --- host allow/deny ---------------------------------------------------------
const host = (u) => new URL(u).hostname; // the same normalisation the exec relies on
for (const u of ['http://localhost/', 'http://LOCALHOST:8080/x', 'http://api.localhost/', 'http://127.0.0.1/', 'http://127.1/', 'http://2130706433/',
    'http://0x7f000001/', 'http://10.0.0.5/', 'http://172.16.9.1/', 'http://172.31.255.255/', 'http://192.168.1.1/', 'http://169.254.169.254/latest/meta-data/',
    'http://100.64.0.1/', 'http://0.0.0.0/', 'http://[::1]/', 'http://[fd00::1]/', 'http://[fe80::1]/', 'http://[::ffff:127.0.0.1]/',
    'http://intranet/', 'http://printer.local/', 'http://db.internal/', 'http://router.home.arpa/',
    // IPv6 spellings of internal targets: the IPv4 address embedded in a
    // compatible, translated, NAT64 or 6to4 address is what gets reached.
    'http://[::127.0.0.1]/', 'http://[::ffff:0:7f00:1]/', 'http://[64:ff9b::a9fe:a9fe]/', 'http://[64:ff9b::10.0.0.1]/',
    'http://[2002:7f00:1::]/', 'http://[2002:c0a8:101::1]/', 'http://[64:ff9b:1::1]/', 'http://[fec0::1]/', 'http://[ff02::1]/',
    'http://[0:0:0:0:0:ffff:a9fe:a9fe]/']) {
    check('denied: ' + u, I.isInternalHostname(host(u)) === true);
}
for (const u of ['https://docs.puter.com/llms.txt', 'https://example.com/', 'http://8.8.8.8/', 'https://172.15.0.1/', 'https://172.32.0.1/', 'https://192.169.0.1/', 'https://[2606:4700::1111]/', 'https://sub.domain.co.uk/path',
    'https://[2001:4860:4860::8888]/', 'https://[64:ff9b::8.8.8.8]/', 'https://[2002:808:808::1]/']) {
    check('allowed: ' + u, I.isInternalHostname(host(u)) === false);
}
check('an empty hostname is refused', I.isInternalHostname('') === true);

// --- content types ------------------------------------------------------------
for (const t of ['text/html; charset=utf-8', 'text/plain', 'application/json', 'application/ld+json', 'application/xml', 'application/javascript', 'application/atom+xml', 'image/svg+xml', '']) {
    check('textual: ' + (t || '(none)'), I.looksTextual(t) === true);
}
for (const t of ['image/png', 'application/pdf', 'application/octet-stream', 'application/zip', 'audio/mpeg', 'video/mp4', 'font/woff2']) {
    check('binary: ' + t, I.looksTextual(t) === false);
}

// --- byte cap via streaming ------------------------------------------------------
{
    const chunk = new TextEncoder().encode('a'.repeat(300000));
    let reads = 0, cancelled = false;
    const response = {
        body: { getReader() { return { async read() { reads++; return reads <= 10 ? { done: false, value: chunk } : { done: true }; }, cancel() { cancelled = true; } }; } },
    };
    const r = await I.readCapped(response);
    check('a huge streamed body is cut at the byte cap', r.truncated === true && r.text.length >= I.MAX_BYTES && r.text.length < I.MAX_BYTES + chunk.length + 1);
    check('… reading stops early (not all chunks pulled)', reads <= 4);
    check('… and the rest of the stream is cancelled', cancelled === true);
}
{
    const r = await I.readCapped({ body: null, text: async () => 'plain' });
    check('a response without a stream falls back to text()', r.text === 'plain' && r.truncated === false);
}

// --- exec wiring ----------------------------------------------------------------
const exec = src.slice(b);
check('only absolute http(s) URLs are fetched', /url\.protocol !== 'http:' && url\.protocol !== 'https:'/.test(exec));
check('internal hosts are refused before any fetch',
    exec.indexOf('isInternalHostname(url.hostname)') > 0 && exec.indexOf('isInternalHostname(url.hostname)') < exec.indexOf('puter.net.fetch('));
check('the fetch is raced against a timeout', /Promise\.race\(\[work, timeout\]\)/.test(exec) && /TIMEOUT_MS/.test(exec));
check('binary bodies are refused rather than returned', /binary: true/.test(exec) && /not text, so its contents cannot be returned/.test(exec));
check('the body is read through the byte-capped reader', /I\.readCapped\(response\)/.test(exec));
check('the result is fenced and labelled as untrusted data', /data: fence\(data\)/.test(exec) && /untrusted data/.test(exec));
check('the conversation-size trim is still applied', /MAX_CHARS/.test(exec));

// --- redirects (the real exec, stubbed network) --------------------------------
// puter.net.fetch never follows redirects, so the model got a bare "301 Moved"
// page with the target dropped. The tool follows them itself — each hop held to
// the first URL's rules.
{
    const twin = { tools: [] };
    let routes = {};
    const requested = [];
    const puterStub = { net: { fetch: async (href) => {
        requested.push(href);
        const r = routes[href];
        if (!r) return new Response('not found', { status: 404, headers: { 'content-type': 'text/plain' } });
        const nullBody = [101, 204, 205, 304].includes(r.status);
        return new Response(nullBody ? null : (r.body ?? ''), { status: r.status, headers: r.headers || {} });
    } } };
    new Function('window', 'puter', src)(twin, puterStub);
    const tool = twin.tools.find((t) => t.function.name === 'FetchExternalResource');
    const run = async (URL_) => { try { return { ok: true, res: await tool.exec({ URL: URL_ }, {}) }; } catch (e) { return { ok: false, err: e }; } };

    routes = {
        'http://docs.example.com/guide': { status: 301, headers: { location: 'https://docs.example.com/guide' }, body: '<h1>Moved</h1>' },
        'https://docs.example.com/guide': { status: 308, headers: { location: '/guide/' } },
        'https://docs.example.com/guide/': { status: 200, headers: { 'content-type': 'text/html' }, body: '<h1>The guide</h1>' },
    };
    let r = await run('http://docs.example.com/guide');
    check('redirects: an http→https→trailing-slash chain is followed to the content',
        r.ok && r.res.status === 200 && /The guide/.test(r.res.data), JSON.stringify(r.res || r.err.message));
    check('redirects: relative Location headers resolve against the hop that sent them', requested.includes('https://docs.example.com/guide/'));
    check('redirects: the result says where the content came from',
        r.ok && r.res.url === 'http://docs.example.com/guide' && r.res.redirected_to === 'https://docs.example.com/guide/');

    routes = { 'https://evil.example.com/x': { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data/' } } };
    requested.length = 0;
    r = await run('https://evil.example.com/x');
    check('redirects: a hop to a private address is refused, not fetched',
        !r.ok && /private or internal/.test(r.err.message) && !requested.some((u) => u.includes('169.254')), r.ok ? 'fetched' : r.err.message);

    routes = { 'https://a.example.com/x': { status: 302, headers: { location: 'file:///etc/passwd' } } };
    r = await run('https://a.example.com/x');
    check('redirects: a hop to a non-http(s) scheme is refused', !r.ok && /non-http\(s\)/.test(r.err.message));

    routes = {};
    for (let i = 0; i < 8; i++) routes[`https://loop.example.com/${i}`] = { status: 302, headers: { location: `/${i + 1}` } };
    r = await run('https://loop.example.com/0');
    check('redirects: a redirect loop stops after a few hops', !r.ok && /redirected more than \d+ times/.test(r.err.message));

    routes = { 'https://plain.example.com/': { status: 200, headers: { 'content-type': 'text/plain' }, body: 'hello' } };
    r = await run('https://plain.example.com/');
    check('redirects: a direct response carries no redirected_to', r.ok && r.res.status === 200 && !('redirected_to' in r.res));

    routes = { 'https://cache.example.com/': { status: 304, headers: {} } };
    r = await run('https://cache.example.com/');
    check('redirects: a 3xx without a Location is returned as is', r.ok && r.res.status === 304);
}

if (failures) { console.error(`\n${failures} external-fetch check(s) failed.`); process.exit(1); }
console.log('\nAll external-fetch checks passed.');
