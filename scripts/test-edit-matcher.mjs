import fs from 'node:fs';

// ---- Load the REAL window.applyFileEdit out of src/js/helpers.js ----------
// helpers.js is a classic browser-global script (no import/export). We evaluate
// it in sloppy mode with a real `window` object (to capture the assignment) and
// permissive stubs for every other global it might touch at load time, then pull
// out window.applyFileEdit. This tests the production bytes with zero drift.
const HELPERS = new URL('../src/js/helpers.js', import.meta.url);
const src = fs.readFileSync(HELPERS, 'utf8');

const makeStub = () => new Proxy(function () {}, {
    get: (t, k) => (k === Symbol.toPrimitive ? () => '' : makeStub()),
    apply: () => makeStub(),
    construct: () => makeStub(),
});
const win = {};
const stubNames = ['document', '$', 'jQuery', 'puter', 'localStorage', 'sessionStorage',
    'navigator', 'Blob', 'FileReader', 'Image', 'marked', 'hljs', 'JSZip', 'fetch',
    'XMLHttpRequest', 'location', 'history', 'alert', 'requestAnimationFrame'];
const factory = new Function('window', ...stubNames, src + '\n;return window;');
const loaded = factory(win, ...stubNames.map(() => makeStub()));
const applyFileEdit = loaded.applyFileEdit;

if (typeof applyFileEdit !== 'function') {
    console.error('FAIL: window.applyFileEdit was not defined after loading helpers.js');
    process.exit(1);
}

// Unicode look-alikes (explicit escapes, no reliance on literal chars).
const LDQUO = '“', RDQUO = '”';   // “ ”
const LSQUO = '‘', RSQUO = '’';   // ‘ ’
const NBSP = ' ', EMDASH = '—';

// ---- Tiny assertion harness ----------------------------------------------
let pass = 0, fail = 0;
const failures = [];
function eq(name, got, want) {
    if (got === want) pass++;
    else { fail++; failures.push(`${name}\n   got:  ${JSON.stringify(got)}\n   want: ${JSON.stringify(want)}`); }
}
function ok(name, cond, detail) {
    if (cond) pass++;
    else { fail++; failures.push(`${name}${detail ? '\n   ' + detail : ''}`); }
}
function throws(name, fn, msgIncludes) {
    try { const r = fn(); fail++; failures.push(`${name}: expected throw, returned ${JSON.stringify(r)}`); }
    catch (e) {
        if (msgIncludes == null || (e.message && e.message.includes(msgIncludes))) pass++;
        else { fail++; failures.push(`${name}: threw but message lacked ${JSON.stringify(msgIncludes)}\n   actual: ${e.message}`); }
    }
}

// ============================ TEST CASES ===================================

eq('exact single', applyFileEdit('a\nb\nc', 'b', 'B'), 'a\nB\nc');
eq('exact multiline', applyFileEdit('x\nfoo\nbar\ny', 'foo\nbar', 'ZZ'), 'x\nZZ\ny');
eq('exact partial-line', applyFileEdit('const x = 1;', 'x = 1', 'y = 2'), 'const y = 2;');

throws('ambiguous exact', () => applyFileEdit('a\na\na', 'a', 'b'), 'matches 3 locations');
throws('not found', () => applyFileEdit('hello\nworld', 'zzz', 'q'), 'not found in file');
throws('empty old', () => applyFileEdit('abc', '', 'x'), 'cannot be empty');
throws('identical (raw)', () => applyFileEdit('abc', 'ab', 'ab'), 'identical');
// A CRLF-only edit is a no-op (returns normalized content), NOT an "identical" throw
eq('crlf-only edit is a no-op', applyFileEdit('x\r\ny\r\nz', 'x\r\ny', 'x\ny'), 'x\ny\nz');
throws('content not text', () => applyFileEdit(null, 'a', 'b'), 'not text');

// CRLF content, LF old_content — matches, returns LF (caller restores CRLF)
eq('crlf content / lf old', applyFileEdit('a\r\nb\r\nc', 'b', 'B'), 'a\nB\nc');

// $-pattern in new_content must be LITERAL (the bug we fixed)
eq('literal $&', applyFileEdit('X', 'X', 'a$&b'), 'a$&b');
eq('literal $1', applyFileEdit('X', 'X', '<$1>'), '<$1>');
eq("literal $'", applyFileEdit('Y', 'Y', "p$'q"), "p$'q");

// Deletion via exact match
eq('exact deletion', applyFileEdit('line1\nline2\nline3', 'line2\n', ''), 'line1\nline3');

// Trailing-whitespace fallback — and OTHER lines keep their trailing ws (the fix)
{
    const file = 'alpha   \n  target  \nbeta\t\n';
    // old has an EXTRA trailing space vs the file, so exact (tier 0) fails and
    // the trailing-whitespace-flexible tier (line-based) handles it.
    const out = applyFileEdit(file, '  target   ', '  TARGET');
    eq('trailing-ws replaced', out, 'alpha   \n  TARGET\nbeta\t\n');
    ok('trailing-ws preserved on alpha', out.startsWith('alpha   \n'), 'got: ' + JSON.stringify(out));
    ok('trailing-ws preserved on beta', out.includes('beta\t\n'), 'got: ' + JSON.stringify(out));
}

// Genuine tier-2 multi-line re-indent (exact fails because inter-line indent differs)
eq('reindent multiline (clean tier2)',
    applyFileEdit('a:\n    x = 1\n    y = 2\nb:', 'x = 1\ny = 2', 'x = 10\ny = 20'),
    'a:\n    x = 10\n    y = 20\nb:');

// REGRESSION GUARD (reviewer-found): multi-line old_content with a PARTIAL first
// line, reaching the trailing-ws tier because file lines carry trailing spaces.
eq('tier1 partial first line (multi-line)',
    applyFileEdit('const r = compute(  \n  a, b);  \nnext();\n', 'compute(\n  a, b);', 'calc(\n  a, b);'),
    'const r = calc(\n  a, b);\nnext();\n');
// REGRESSION GUARD: multi-line old_content with a PARTIAL last line + trailing ws
eq('tier1 partial last line (multi-line)',
    applyFileEdit('foo();  \n  return bar + baz;\n', 'foo();\n  return bar', 'REPLACED'),
    'REPLACED + baz;\n');

// Tier-2 deletion: removing a uniformly-indented block leaves NO stray blank line
eq('tier2 deletion no stray blank',
    applyFileEdit('    a\n    b\n    c', 'a\nb', ''), '    c');

// Leading-indentation shift: file indented MORE than old (uniform) → re-indent
eq('reindent under-indented',
    applyFileEdit('function f() {\n        return 1;\n}', '    return 1;', '    return 2;'),
    'function f() {\n        return 2;\n}');

// Leading-indentation: model used NO indent, file uses tabs → re-indent with tab
eq('reindent tab',
    applyFileEdit('\tif (x) {\n\t\tdoThing();\n\t}', 'doThing();', 'doOther();'),
    '\tif (x) {\n\t\tdoOther();\n\t}');

// Multi-line block re-indent, preserving relative indentation + blank lines
eq('reindent multiline+blank',
    applyFileEdit('    a();\n    b();\n\n    c();', 'a();\nb();\n\nc();', 'a();\nB();\n\nc();'),
    '    a();\n    B();\n\n    c();');

// Inconsistent indentation (can't reconcile one delta) → no guess, throws
throws('inconsistent indent',
    () => applyFileEdit('    a();\n    b();', 'a();\n  b();', 'a();\n  B();'), 'not found');

// re-indent a multi-line block where new_content has its own deeper nesting
eq('reindent nested new (multiline)',
    applyFileEdit('main:\n    step_one()\n    step_two()', 'step_one()\nstep_two()',
        'for i in range(3):\n    step_one()\nstep_two()'),
    'main:\n    for i in range(3):\n        step_one()\n    step_two()');

// Unicode smart double-quotes — match, replace, and OTHER smart quotes preserved
{
    const file = `const s = ${LDQUO}hello${RDQUO};\nconst t = ${LDQUO}keep${RDQUO};`;
    const out = applyFileEdit(file, 'const s = "hello";', 'const s = "HI";');
    eq('unicode dquote match', out, `const s = "HI";\nconst t = ${LDQUO}keep${RDQUO};`);
    ok('other smart quotes preserved', out.includes(`${LDQUO}keep${RDQUO}`), 'got: ' + JSON.stringify(out));
}

// Unicode single quotes
eq('unicode squote',
    applyFileEdit(`x = ${LSQUO}v${RSQUO}`, "x = 'v'", "x = 'w'"), "x = 'w'");

// NBSP in file, regular space in old_content
eq('nbsp match',
    applyFileEdit(`a${NBSP}=${NBSP}1`, 'a = 1', 'a = 2'), 'a = 2');

// em-dash in file, hyphen in old
eq('emdash match',
    applyFileEdit(`x${EMDASH}y`, 'x-y', 'x-z'), 'x-z');

// Unicode ambiguous → exact fails (both are curly), normalized matches twice
throws('unicode ambiguous',
    () => applyFileEdit(`${LDQUO}q${RDQUO}\n${LDQUO}q${RDQUO}`, '"q"', 'X'), 'matches');

// Diagnostic: near-miss (case differs) → not found
throws('diagnostic region',
    () => applyFileEdit('line one\nline two here\nline three', 'line two HERE', 'X'), 'not found in file');

// Whitespace-only mismatch (tabs vs spaces, can't reconcile) → helpful diagnostic
{
    let msg = '';
    try { applyFileEdit('\t\tfoo()', '    foo()', 'bar()'); } catch (e) { msg = e.message; }
    ok('ws diagnostic mentions closest region', /closest region/.test(msg), 'msg=' + JSON.stringify(msg));
}

// Exact wins even if a looser tier could also match elsewhere
eq('exact precedence', applyFileEdit('a\nb\n  c  ', 'b', 'B'), 'a\nB\n  c  ');

// File ending without newline, replace last line
eq('last line no trailing nl', applyFileEdit('a\nb', 'b', 'B'), 'a\nB');
// File with trailing newline preserved
eq('trailing nl preserved', applyFileEdit('a\nb\n', 'a', 'A'), 'A\nb\n');
// old_content longer than file → not found (no crash)
throws('old longer than file', () => applyFileEdit('short', 'a\nb\nc\nd\ne', 'x'), 'not found');

// ============================ RESULTS ======================================
console.log(`\n${pass} passed, ${fail} failed\n`);
if (fail) { console.log('FAILURES:\n' + failures.map(f => ' - ' + f).join('\n')); process.exit(1); }
console.log('ALL GREEN');
