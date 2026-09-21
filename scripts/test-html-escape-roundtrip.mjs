import fs from 'node:fs';

// ---- Regression guard for htmlEscape / htmlUnescape ------------------------
// Chat messages are HTML-escaped before marked parses them, so nothing the
// model writes can inject markup. The fenced-code renderer then needs the raw
// source back to hand to highlight.js, and calls htmlUnescape to get it — which
// makes the pair an exact round trip by contract, for EVERY input.
//
// It wasn't: htmlUnescape decoded "&amp;" first, minting a fresh '&' that the
// later passes read as the start of another entity. Escaped source containing a
// literal "&lt;" — routine in a code block about HTML, XML or JSX — came back
// as "<", so the block showed markup the model never wrote. Only the five
// entities htmlEscape produces can trigger it, which is exactly the set a code
// block about escaping contains.
//
// Evaluates the REAL functions sliced out of helpers.js (zero drift).

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const HELP = new URL('../src/js/helpers.js', import.meta.url);
const src = fs.readFileSync(HELP, 'utf8');
const a = src.indexOf('function htmlEscape(');
const b = src.indexOf('function generateChatId(');
if (a < 0 || b < 0 || b <= a) throw new Error('could not extract htmlEscape/htmlUnescape');
const mod = new Function(src.slice(a, b) + '\nreturn { htmlEscape, htmlUnescape };')();
const { htmlEscape, htmlUnescape } = mod;

// === The contract: unescape(escape(x)) === x, for anything =================
const SAMPLES = [
    '',
    'plain text',
    '<div class="a">hi</div>',
    "it's a test",
    'a && b',
    'R&D',
    // The cases that used to be corrupted: entity text that survives escaping.
    '&lt;',
    '&gt;',
    '&amp;',
    '&quot;',
    '&#39;',
    '&lt;div&gt;Hello&lt;/div&gt;',
    'Use &amp;lt; to write a literal &lt; in HTML',
    'if (a &lt; b &amp;&amp; c &gt; d) {}',
    '<p>&nbsp;&mdash;&amp;</p>',
    '&lt;script&gt;alert(1)&lt;/script&gt;',
    'JSON: {"k": "&lt;v&gt;"}',
    'emoji 🙂 and astral 𝕹',
    '&amp;amp;amp;',
];
for (const s of SAMPLES) {
    check(`round trip: ${JSON.stringify(s)}`, htmlUnescape(htmlEscape(s)) === s);
}

// === htmlEscape still neutralizes every markup-active character ============
check('escape: < > & " \' all replaced', htmlEscape(`<>&"'`) === '&lt;&gt;&amp;&quot;&#39;');
check('escape: output contains no raw markup character', !/[<>"']/.test(htmlEscape(`<a href="x">'&</a>`)));

// === Idempotence of a double escape, decoded twice ========================
check('double escape decodes back in two passes',
    htmlUnescape(htmlUnescape(htmlEscape(htmlEscape('<b>&</b>')))) === '<b>&</b>');

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll HTML escape round-trip checks passed.');
