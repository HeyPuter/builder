import fs from 'node:fs';

// ---- Regression guard for chat-message link/image scheme sanitization ------
// Model-authored (and restored) markdown is HTML-escaped before parsing, so raw
// <a>/<script> can't inject. But markdown LINK syntax — [x](javascript:…) —
// survives escaping, and marked renders it into a live anchor in the privileged
// parent origin (full puter.fs/kv/auth). window.hasUnsafeUrlScheme (helpers.js)
// flags non-allowlisted schemes; the MARKED_OPTIONS walkTokens hook uses it to
// rewrite bad hrefs to '#' for every marked.parse call site at once.
//
// This evaluates the REAL helper sliced out of helpers.js (zero drift) and
// asserts the allowlist + obfuscation defenses. Mirrors the other scripts/test-*.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

// --- Evaluate the real helper from helpers.js -------------------------------
const HELP = new URL('../src/js/helpers.js', import.meta.url);
const src = fs.readFileSync(HELP, 'utf8');
const a = src.indexOf('window.hasUnsafeUrlScheme =');
const b = src.indexOf('window.MARKED_OPTIONS =');
if (a < 0 || b < 0 || b <= a) throw new Error('could not extract hasUnsafeUrlScheme');
const win = {};
new Function('window', src.slice(a, b))(win);
const { hasUnsafeUrlScheme } = win;

// === Safe: relative / anchor / no-scheme (must NOT be flagged) ==============
check('safe: relative path', !hasUnsafeUrlScheme('assets/logo.png'));
check('safe: absolute path', !hasUnsafeUrlScheme('/index.html'));
check('safe: bare fragment', !hasUnsafeUrlScheme('#section'));
check('safe: query only', !hasUnsafeUrlScheme('?q=1'));
check('safe: protocol-relative', !hasUnsafeUrlScheme('//example.com/x'));
check('safe: empty string', !hasUnsafeUrlScheme(''));
check('safe: non-string', !hasUnsafeUrlScheme(null) && !hasUnsafeUrlScheme(undefined));

// === Safe: allowlisted schemes (must NOT be flagged) ========================
check('safe: http', !hasUnsafeUrlScheme('http://example.com'));
check('safe: https', !hasUnsafeUrlScheme('https://example.com/a?b=1#c'));
check('safe: HTTPS uppercase', !hasUnsafeUrlScheme('HTTPS://example.com'));
check('safe: mailto', !hasUnsafeUrlScheme('mailto:nj@puter.com'));
check('safe: tel', !hasUnsafeUrlScheme('tel:+15551234'));
check('safe: ftp', !hasUnsafeUrlScheme('ftp://host/file'));

// === Unsafe: dangerous schemes (MUST be flagged) ============================
check('unsafe: javascript', hasUnsafeUrlScheme('javascript:alert(document.domain)'));
check('unsafe: JaVaScRiPt mixed case', hasUnsafeUrlScheme('JaVaScRiPt:alert(1)'));
check('unsafe: data', hasUnsafeUrlScheme('data:text/html,<script>alert(1)</script>'));
check('unsafe: vbscript', hasUnsafeUrlScheme('vbscript:msgbox(1)'));
check('unsafe: blob', hasUnsafeUrlScheme('blob:https://x/y'));
check('unsafe: file', hasUnsafeUrlScheme('file:///etc/passwd'));

// === Unsafe: obfuscated javascript: (browsers would still execute) ==========
check('unsafe: leading whitespace', hasUnsafeUrlScheme('  javascript:alert(1)'));
check('unsafe: tab inside scheme', hasUnsafeUrlScheme('java\tscript:alert(1)'));
check('unsafe: newline inside scheme', hasUnsafeUrlScheme('java\nscript:alert(1)'));
check('unsafe: control char inside scheme', hasUnsafeUrlScheme('java\x01script:alert(1)'));
check('unsafe: hex entity colon (java&#x3a;)', hasUnsafeUrlScheme('javascript&#x3a;alert(1)'));
check('unsafe: decimal entity colon (java&#58;)', hasUnsafeUrlScheme('javascript&#58;alert(1)'));
check('unsafe: &colon; named entity', hasUnsafeUrlScheme('javascript&colon;alert(1)'));
check('unsafe: &Tab; named entity in scheme', hasUnsafeUrlScheme('java&Tab;script:alert(1)'));

// === Robustness: bogus entities must not throw ==============================
check('robust: huge hex entity does not throw',
    (() => { try { hasUnsafeUrlScheme('javascript&#xFFFFFFFF;:x'); return true; } catch (e) { return false; } })());

// === The walkTokens hook is wired into MARKED_OPTIONS =======================
check('walkTokens hook present in MARKED_OPTIONS',
    src.includes('walkTokens') && src.includes("token.href = '#'") &&
    src.includes('hasUnsafeUrlScheme(token.href)'));
// Model-authored images become links (an <img> is an outbound request the
// browser fires at any host the model names — an exfiltration channel).
check('walkTokens turns image tokens into link tokens',
    /if \(token\.type === 'image'\) \{\s*token\.type = 'link';/.test(src));

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll markdown link-sanitizer checks passed.');
