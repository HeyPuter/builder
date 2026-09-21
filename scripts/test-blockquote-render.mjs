import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard for blockquotes in model-authored markdown -----------
// Chat markdown is HTML-escaped before marked parses it — that is what stops a
// raw tag the model wrote from ever reaching the DOM. But the escape also
// rewrote the one markdown character that carries structure: a blockquote's
// leading ">" became "&gt;", which marked no longer recognises, so every quoted
// line rendered literally as "> …" inside a paragraph.
//
// escapeMarkdownSource puts back ONLY line-leading ">" markers. A ">" at the
// start of a line cannot begin markup (a tag needs "<", which stays escaped),
// so this restores blockquotes without loosening the escape anywhere else.
//
// Runs the REAL escaper + renderer against the REAL vendored marked +
// highlight.js, and re-checks that the escape still neutralizes markup.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const url = (p) => new URL(p, import.meta.url);
const sandbox = vm.createContext({ console, out: {} });
vm.runInContext('var window = this; var self = this;', sandbox);
vm.runInContext(fs.readFileSync(url('../src/vendor/marked.umd.min.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(url('../src/vendor/highlight.min.js'), 'utf8'), sandbox);

const src = fs.readFileSync(url('../src/js/helpers.js'), 'utf8');
function slice(from, to) {
    const a = src.indexOf(from), b = src.indexOf(to, a);
    if (a < 0 || b <= a) throw new Error('could not extract ' + from);
    return src.slice(a, b);
}
vm.runInContext(slice('function htmlEscape(', 'function generateChatId('), sandbox);
// The walkTokens hook that neutralizes javascript:/data: hrefs lives here.
vm.runInContext(slice('window.hasUnsafeUrlScheme = function', '// ---- Syntax-highlight memo'), sandbox);
vm.runInContext(slice('// ---- Syntax-highlight memo', 'function prepareHistoryForAI('), sandbox);
vm.runInContext('marked.use(MARKED_OPTIONS);', sandbox);
check('escapeMarkdownSource exists', vm.runInContext('typeof escapeMarkdownSource === "function"', sandbox));

function render(md) {
    sandbox.out.md = md;
    vm.runInContext('out.html = marked.parse(escapeMarkdownSource(out.md));', sandbox);
    return sandbox.out.html;
}
const count = (html, tag) => (html.match(new RegExp('<' + tag + '>', 'g')) || []).length;

// === Blockquotes render as blockquotes =====================================
check('a quoted line becomes a blockquote', count(render('> quoted'), 'blockquote') === 1);
check('and its text is not prefixed with a literal >', !/<p>&gt;/.test(render('> quoted')));
check('a multi-line quote is one blockquote', count(render('> one\n> two'), 'blockquote') === 1);
check('a nested quote nests', count(render('>> deep'), 'blockquote') === 2);
check('a spaced nested quote nests', count(render('> > deep'), 'blockquote') === 2);
check('an indented marker still quotes', count(render('   > quoted'), 'blockquote') === 1);
check('a quote containing markdown still formats', /<strong>/.test(render('> **bold**')));

// === …and nothing else changes =============================================
check('a mid-line > stays literal', /5 &gt; 3/.test(render('5 > 3 is true')));
check('a mid-line > does not create a quote', count(render('5 > 3 is true'), 'blockquote') === 0);
check('a line of literal "&gt;" text is NOT a quote', count(render('&gt; not a quote'), 'blockquote') === 0);
check('and that line still reads as the model wrote it', /&amp;gt; not a quote/.test(render('&gt; not a quote')));
{
    // Inside a fence, a leading ">" must round-trip to exactly what was written.
    const html = render('```\n> shell line\nif (a > b) {}\n```');
    const text = (html.match(/<code[^>]*>([\s\S]*)<\/code>/) || ['', ''])[1].replace(/<[^>]*>/g, '');
    check('a fenced ">" line survives unchanged', text.includes('&gt; shell line'), text);
    check('a fenced comparison survives unchanged', text.includes('a &gt; b'), text);
}
{
    const html = render('```\n&gt; literal entity\n```');
    const text = (html.match(/<code[^>]*>([\s\S]*)<\/code>/) || ['', ''])[1].replace(/<[^>]*>/g, '');
    check('a fenced literal "&gt;" survives unchanged', text.includes('&amp;gt; literal entity'), text);
}
check('headings, lists and tables are unaffected',
    /<h2>/.test(render('## Title')) && /<li>/.test(render('- item')) && /<table>/.test(render('| a |\n|---|\n| 1 |')));

// === The escape still neutralizes markup ===================================
const PAYLOADS = [
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    '<svg/onload=alert(1)>',
    '<div onmouseover="alert(1)">x</div>',
    '" onmouseover="alert(1)',
    "' onmouseover='alert(1)",
    '<base href="http://evil.test/">',
    '</p><script>alert(1)</script><p>',
    // …including through the newly-restored blockquote path
    '> <img src=x onerror=alert(1)>',
    '> </blockquote><script>alert(1)</script>',
    '>> <svg onload=alert(1)>',
    '   > <script>alert(1)</script>',
];
// Text is escaped, so the only '<' left in the output opens a tag the renderer
// emitted. Inspect those tags alone: anything outside the markdown allowlist, or
// any on* handler attribute, means markup escaped the data region.
const SAFE_TAGS = new Set([
    'p', 'br', 'hr', 'em', 'strong', 'del', 'code', 'pre', 'span', 'a', 'img',
    'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'input', 'div',
]);
function liveMarkup(html) {
    const bad = [];
    for (const tag of html.match(/<[^>]*>/g) || []) {
        const name = (tag.match(/^<\/?([a-zA-Z][a-zA-Z0-9-]*)/) || [])[1];
        if (!name) continue;
        if (!SAFE_TAGS.has(name.toLowerCase())) bad.push('element:' + name);
        if (/\son[a-z]+\s*=/i.test(tag)) bad.push('handler:' + tag.slice(0, 40));
    }
    return bad;
}
for (const p of PAYLOADS) {
    const bad = liveMarkup(render(p));
    check(`no live markup from ${JSON.stringify(p.slice(0, 34))}`, bad.length === 0, bad.join(', '));
}
check('the tag inspector actually detects live markup',
    liveMarkup('<p>ok</p><script>x</script>').length === 2 &&
    liveMarkup('<img src=x onerror=alert(1)>').length === 1);
check('a javascript: link is still neutralized', render('[x](javascript:alert(1))').includes('href="#"'));
check('a javascript: link inside a quote is neutralized', render('> [x](javascript:alert(1))').includes('href="#"'));

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll blockquote-rendering checks passed.');
