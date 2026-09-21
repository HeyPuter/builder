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
    'http://intranet/', 'http://printer.local/', 'http://db.internal/', 'http://router.home.arpa/']) {
    check('denied: ' + u, I.isInternalHostname(host(u)) === true);
}
for (const u of ['https://docs.puter.com/llms.txt', 'https://example.com/', 'http://8.8.8.8/', 'https://172.15.0.1/', 'https://172.32.0.1/', 'https://192.169.0.1/', 'https://[2606:4700::1111]/', 'https://sub.domain.co.uk/path']) {
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

if (failures) { console.error(`\n${failures} external-fetch check(s) failed.`); process.exit(1); }
console.log('\nAll external-fetch checks passed.');
