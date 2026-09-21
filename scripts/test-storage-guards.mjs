import fs from 'node:fs';

// ---- Regression guard: every localStorage access must be inside a try -------
// Touching localStorage is not always safe. Where a browser blocks site data —
// Chrome with cookies blocked for the origin, a sandboxed frame, some private
// modes — the PROPERTY ACCESS itself throws SecurityError before any method
// runs. So `localStorage.getItem(k)` is a throwing expression, not a read that
// returns null.
//
// The app leans on localStorage for conveniences only (theme, the cached
// greeting, composer drafts, the PWA snooze, a one-shot animation flag), and
// every one of them was written defensively — except the tagline shimmer in
// app.js's $(document).ready. That one sat in the middle of the boot sequence,
// so the exception escaped the async ready handler and killed everything after
// it: auth, the project list, the deep-link restore, the composer draft, the
// chat auto-scroll listener. A decorative animation took the whole boot down.
//
// This scans the real sources, ignoring comments and string/regex literals, and
// fails on any localStorage reference not enclosed by a `try` block.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

// Blank out comments and string/regex literals (preserving length and newlines)
// so the brace scan below sees code only. Blanking a template literal whole is
// safe for brace balance: any braces inside it are themselves balanced.
function blankNonCode(src) {
    const out = src.split('');
    const blank = (from, to) => { for (let i = from; i < to && i < out.length; i++) if (out[i] !== '\n') out[i] = ' '; };
    let i = 0;
    let prevSignificant = '';
    while (i < src.length) {
        const c = src[i];
        const next = src[i + 1];
        if (c === '/' && next === '/') { let j = src.indexOf('\n', i); if (j < 0) j = src.length; blank(i, j); i = j; continue; }
        if (c === '/' && next === '*') { let j = src.indexOf('*/', i + 2); j = j < 0 ? src.length : j + 2; blank(i, j); i = j; continue; }
        if (c === '"' || c === "'" || c === '`') {
            let j = i + 1;
            while (j < src.length) {
                if (src[j] === '\\') { j += 2; continue; }
                if (src[j] === c) { j++; break; }
                j++;
            }
            blank(i, j); i = j; continue;
        }
        // A '/' starts a regex literal only where a value is expected.
        if (c === '/' && /[(,=:[!&|?{};+\-*%~^<>]|^$/.test(prevSignificant)) {
            let j = i + 1, inClass = false, ok = false;
            while (j < src.length && src[j] !== '\n') {
                if (src[j] === '\\') { j += 2; continue; }
                if (src[j] === '[') inClass = true;
                else if (src[j] === ']') inClass = false;
                else if (src[j] === '/' && !inClass) { j++; ok = true; break; }
                j++;
            }
            if (ok) { blank(i, j); i = j; continue; }
        }
        if (!/\s/.test(c)) prevSignificant = c;
        i++;
    }
    return out.join('');
}

// Indexes of every `localStorage` reference that no enclosing `try {` covers.
function unguardedLocalStorage(src) {
    const code = blankNonCode(src);
    const bad = [];
    const stack = []; // one entry per open block: true when it is a try block
    let i = 0;
    while (i < code.length) {
        const c = code[i];
        if (c === '{') {
            // Is the token right before this brace `try`?
            let k = i - 1;
            while (k >= 0 && /\s/.test(code[k])) k--;
            stack.push(k >= 2 && code.slice(k - 2, k + 1) === 'try' && !/[\w$]/.test(code[k - 3] || ''));
            i++; continue;
        }
        if (c === '}') { stack.pop(); i++; continue; }
        if (code.startsWith('localStorage', i) && !/[\w$.]/.test(code[i - 1] || '')) {
            if (!stack.some(Boolean)) bad.push(i);
            i += 'localStorage'.length; continue;
        }
        i++;
    }
    return bad;
}

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

// An .html file is scanned as its inline <script> bodies only: everything else
// (markup, HTML comments) is blanked, so prose mentioning localStorage in a
// <!-- comment --> is not read as code. Lengths are preserved, so reported line
// numbers still point into the original file.
function scriptsOnly(html) {
    const out = new Array(html.length).fill(' ');
    for (let i = 0; i < html.length; i++) if (html[i] === '\n') out[i] = '\n';
    const re = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html))) {
        const start = m.index + m[0].indexOf('>') + 1;
        for (let i = start; i < start + m[1].length; i++) out[i] = html[i];
    }
    return out.join('');
}

// The scanner must actually find things — a silently-broken scanner would pass
// every file. Assert it on known-shaped samples first.
check('scanner: flags a bare access',
    unguardedLocalStorage('localStorage.getItem("k");').length === 1);
check('scanner: accepts a try-wrapped access',
    unguardedLocalStorage('try { localStorage.getItem("k"); } catch (e) {}').length === 0);
check('scanner: accepts an access nested deeper inside a try',
    unguardedLocalStorage('try { if (a) { localStorage.setItem("k","v"); } } catch (e) {}').length === 0);
check('scanner: flags an access in the catch block itself',
    unguardedLocalStorage('try { a(); } catch (e) { localStorage.clear(); }').length === 1);
check('scanner: ignores the word in a comment',
    unguardedLocalStorage('// set localStorage.foo = 1\nvar a = 1;').length === 0);
check('scanner: ignores the word in a string',
    unguardedLocalStorage('var s = "localStorage.getItem";').length === 0);
check('scanner: is not confused by braces inside a regex',
    unguardedLocalStorage('var re = /^a{2,3}$/; try { localStorage.getItem("k"); } catch (e) {}').length === 0);
check('scanner: is not confused by braces inside a template literal',
    unguardedLocalStorage('var s = `a ${ {x:1} } b`; try { localStorage.getItem("k"); } catch (e) {}').length === 0);

check('scanner: an .html file is read as its <script> bodies only',
    unguardedLocalStorage(scriptsOnly('<!-- see localStorage -->\n<p>localStorage</p>\n<script>try { localStorage.getItem("k"); } catch (e) {}</script>')).length === 0);
check('scanner: still flags a bare access inside an inline <script>',
    unguardedLocalStorage(scriptsOnly('<script>localStorage.getItem("k");</script>')).length === 1);

// === The real sources ======================================================
const FILES = [
    'src/js/app.js', 'src/js/ui.js', 'src/js/helpers.js', 'src/js/pwa.js',
    'src/js/featured.js', 'src/js/handleMessageStream.js', 'src/js/versions.js',
    'src/js/issues.js', 'src/js/manifest.js', 'src/index.html',
];
for (const rel of FILES) {
    const src = fs.readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
    const bad = unguardedLocalStorage(rel.endsWith('.html') ? scriptsOnly(src) : src);
    check(`${rel}: every localStorage access is inside a try`, bad.length === 0,
        bad.length ? 'unguarded at line(s): ' + bad.map(i => lineOf(src, i)).join(', ') : '');
}

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll storage-guard checks passed.');
