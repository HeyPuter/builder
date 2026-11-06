import fs from 'node:fs';

// ---- Regression guard: file reads are never answered from WebKit's cache ----
// puter.fs.read asks for a fresh copy with a `Cache-Control: no-cache` request
// header, which WebKit (Safari, every iPhone browser) ignores. A read right
// after a write came back with the old text, so a Code view save on an iPhone
// always "failed" its read-back check though the bytes had landed. On WebKit,
// helpers.js gives every GET to <API origin>/read? its own query parameter at
// XMLHttpRequest.open, so no two reads share a cache entry.
//
// Functional: the real code from helpers.js, run against a fake XMLHttpRequest.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const helpers = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const a = helpers.indexOf('window.addReadCacheBuster = function');
const b = helpers.indexOf('// Write `data` to `path` and CONFIRM', a);
check('the read cache buster is in helpers.js', a >= 0 && b > a);

const API = 'https://api.puter.com';
const UA = {
    iphoneSafari: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
    macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    desktopChrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    androidChrome: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
    firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
};
const load = (window, XHR, userAgent) => new Function('window', 'XMLHttpRequest', 'navigator', helpers.slice(a, b))(window, XHR, { userAgent });

const opened = [];
class FakeXHR {}
FakeXHR.prototype.open = function (method, url, async) { opened.push({ method, url, async, self: this }); };
const window = { puter: { APIOrigin: API } };
load(window, FakeXHR, UA.iphoneSafari);
// A second load (the script evaluated twice) must not wrap open again.
load(window, FakeXHR, UA.iphoneSafari);

// Only WebKit gets the patch: elsewhere the no-cache header works, and a URL
// unique to each read would cost a CORS preflight per read.
for (const [name, ua, want] of [
    ['Safari on iPhone', UA.iphoneSafari, true], ['Chrome on iPhone', UA.iphoneChrome, true], ['Safari on a Mac', UA.macSafari, true],
    ['desktop Chrome', UA.desktopChrome, false], ['Chrome on Android', UA.androidChrome, false], ['Firefox', UA.firefox, false],
]) {
    class X {}
    const plain = function () {};
    X.prototype.open = plain;
    load({ puter: { APIOrigin: API } }, X, ua);
    check(`${name}: ${want ? 'patched' : 'left alone'}`, (X.prototype.open !== plain) === want);
}

const open = (method, url, ...rest) => { const x = new FakeXHR(); x.open(method, url, ...rest); return opened[opened.length - 1]; };
const readUrl = API + '/read?file=%2Fu%2Fapp%2Findex.html';

const r1 = open('get', readUrl);
const r2 = open('GET', readUrl);
check('a read gets a cache-busting parameter', /&_fresh=[^&]+$/.test(r1.url) && r1.url.indexOf(readUrl) === 0, r1.url);
check('two reads of the same file never share a URL', r1.url !== r2.url, r1.url + ' / ' + r2.url);
check('the wrapper is installed once', (r2.url.match(/_fresh=/g) || []).length === 1, r2.url);
check('open keeps its this and its other arguments', r1.self instanceof FakeXHR && open('GET', readUrl, false).async === false);

check('a write (POST) is left alone', open('POST', API + '/write?x=1').url === API + '/write?x=1');
check('other API GETs are left alone', open('GET', API + '/readdir?path=x').url === API + '/readdir?path=x');
check('other origins are left alone', open('GET', 'https://example.com/read?file=x').url === 'https://example.com/read?file=x');
window.puter = undefined;
check('before puter.js has loaded, nothing changes', open('GET', readUrl).url === readUrl);

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll fresh-read checks passed.');
