import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard for the fenced-code renderer -------------------------
// Chat markdown is rendered through marked with the custom renderer in
// window.MARKED_OPTIONS (src/js/helpers.js). marked >= 13 hands renderer methods
// the TOKEN as their single argument, so the renderer's old positional
// `language` parameter was always undefined. Two consequences, both visible on
// every code block the model streams (handleMessageStream.js re-parses the whole
// message on every delta):
//
//   * the fence's declared language was ignored, so every block went through
//     hljs.highlightAuto() — labelling ```js as "cpp" and ```html as
//     "php-template", relabelling itself as the block grew, and costing a full
//     multi-grammar detection pass each time;
//   * `code.text || code` fell through to the token OBJECT for an EMPTY block,
//     rendering a literal "[object Object]" — which is exactly what a fence
//     looks like for the moment between "```js" arriving and its first
//     character.
//
// Runs the REAL renderer from helpers.js against the REAL vendored marked +
// highlight.js (zero drift).

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const url = (p) => new URL(p, import.meta.url);
const sandbox = vm.createContext({ console, out: {} });
vm.runInContext('var window = this; var self = this;', sandbox);
vm.runInContext(fs.readFileSync(url('../src/vendor/marked.umd.min.js'), 'utf8'), sandbox);
vm.runInContext(fs.readFileSync(url('../src/vendor/highlight.min.js'), 'utf8'), sandbox);

// Pull MARKED_OPTIONS (plus the escape helpers it calls) straight out of helpers.js.
const src = fs.readFileSync(url('../src/js/helpers.js'), 'utf8');
// From the syntax-highlight memo (which the renderer calls) through the end of
// MARKED_OPTIONS, so the real renderer runs against its real helper.
const a = src.indexOf('// ---- Syntax-highlight memo');
const b = src.indexOf('function prepareHistoryForAI(');
if (a < 0 || b < 0 || b <= a) throw new Error('could not extract MARKED_OPTIONS');
const e0 = src.indexOf('function htmlEscape(');
const e1 = src.indexOf('function generateChatId(');
if (e0 < 0 || e1 < 0 || e1 <= e0) throw new Error('could not extract htmlEscape/htmlUnescape');
vm.runInContext(src.slice(e0, e1), sandbox);
vm.runInContext(src.slice(a, b), sandbox);
vm.runInContext('marked.use(MARKED_OPTIONS);', sandbox);

// Render markdown the way the app does: escape first, then parse.
function render(md) {
    sandbox.out.md = md;
    vm.runInContext('out.html = marked.parse(htmlEscape(out.md));', sandbox);
    return sandbox.out.html;
}
const fence = (lang, body) => '```' + lang + '\n' + body + '\n```';
const labelOf = (html) => (html.match(/class="code-language">([^<]*)</) || [])[1];

// === The declared language wins ===========================================
check('```js  is labelled js',          labelOf(render(fence('js', 'const x = 1;'))) === 'js');
check('```js  gets the js grammar',     /class="hljs language-js"/.test(render(fence('js', 'const x = 1;'))));
check('```html is labelled html',       labelOf(render(fence('html', '<div class="x">hi</div>'))) === 'html');
check('```css is labelled css',         labelOf(render(fence('css', '.a { color: red }'))) === 'css');
check('```python is labelled python',   labelOf(render(fence('python', 'def f():\n    return 1'))) === 'python');
check('```JS is normalised to js',      labelOf(render(fence('JS', 'const x = 1;'))) === 'js');
check('info string keeps only the language',
    labelOf(render(fence('js title=app.js', 'const x = 1;'))) === 'js');

// A declared-but-unregistered language keeps ITS OWN label rather than a guess.
check('```vue keeps its label',         labelOf(render(fence('vue', '<template><b/></template>'))) === 'vue');

// === Auto-detection still covers a bare fence =============================
{
    const html = render(fence('', 'def greet(name):\n    return "hi " + name'));
    check('bare fence still gets a detected label', !!labelOf(html) && labelOf(html) !== '');
    check('bare fence is still highlighted', /<span class="hljs-/.test(html));
}

// === Empty blocks render empty, never "[object Object]" ===================
for (const md of ['```js\n```', '```\n```', '```js\n', '```\n']) {
    const html = render(md);
    check(`no [object Object] for ${JSON.stringify(md)}`, html.indexOf('object Object') === -1);
}
check('an opening fence renders an empty code element',
    /<code class="hljs language-js"><\/code>/.test(render('```js\n')));

// === Content is still preserved and still escaped =========================
{
    const html = render(fence('html', '<script>alert(1)</script>'));
    check('markup in a block is not live', html.indexOf('<script>') === -1);
    // highlight.js wraps the tag in its own spans, so compare the block's text
    // content (markup stripped) rather than a raw substring.
    const text = (html.match(/<code[^>]*>([\s\S]*)<\/code>/) || ['', ''])[1].replace(/<[^>]*>/g, '');
    check('markup in a block is shown as text', text === '&lt;script&gt;alert(1)&lt;/script&gt;');
}
{
    // The htmlEscape/htmlUnescape round trip must still hand highlight.js the
    // model's literal source (see test-html-escape-roundtrip.mjs).
    const html = render(fence('js', 'if (a < b && c > d) {}'));
    check('operators survive the escape round trip',
        html.includes('&lt;') && html.includes('&amp;&amp;') && html.includes('&gt;'));
}
{
    // A block that is not valid in its declared grammar is still coloured
    // (ignoreIllegals) rather than dropping to plain text mid-stream.
    const html = render('```js\nconst x = {\n');
    check('a half-written block is still highlighted', /<span class="hljs-/.test(html));
}

// === The class attribute can't be broken out of ===========================
{
    const html = render(fence('js" onload="alert(1)', 'const x = 1;'));
    check('a hostile info string cannot inject an attribute', html.indexOf('onload') === -1);
}

// === Inline code spans are untouched ======================================
check('inline code still renders', render('use `npm test` here').includes('<code>npm test</code>'));

// === The declared language actually changes the highlighting ==============
{
    const asJson = render(fence('json', '{"a": 1}'));
    const asJs = render(fence('js', '{"a": 1}'));
    check('different declared languages produce different markup', asJson !== asJs);
}

// === The highlight memo returns identical markup, and actually memoizes =====
// Streaming re-parses the whole message per delta, so the same finished block is
// rendered again and again; the memo must be a pure speed-up, never a behaviour
// change (and must stay bounded).
{
    const block = fence('js', 'const x = 1;\nfunction f(){ return x; }');
    const first = render(block);
    const second = render(block);
    check('a re-rendered block is byte-identical', first === second);

    // Count real highlight work across a simulated stream of the same message.
    sandbox.out.hlCalls = 0;
    vm.runInContext(`
        const _h = hljs.highlight.bind(hljs), _a = hljs.highlightAuto.bind(hljs);
        hljs.highlight = function (...x) { out.hlCalls++; return _h(...x); };
        hljs.highlightAuto = function (...x) { out.hlCalls++; return _a(...x); };
    `, sandbox);
    const finished = fence('js', 'const a = 1;\nconst b = 2;\nconst c = 3;');
    const tail = '\n\nNow the rest of the message keeps streaming in.';
    for (let i = 1; i <= tail.length; i++) render(finished + tail.slice(0, i));
    check('a finished block is highlighted once, not once per delta',
        sandbox.out.hlCalls <= 2, `highlighted ${sandbox.out.hlCalls}x over ${tail.length} deltas`);

    // A block whose text is still growing must still be re-highlighted.
    sandbox.out.hlCalls = 0;
    const growing = 'const value = compute(';
    for (let i = 1; i <= growing.length; i++) render('```js\n' + growing.slice(0, i));
    check('a growing block is re-highlighted as it changes',
        sandbox.out.hlCalls >= growing.length - 1, `highlighted ${sandbox.out.hlCalls}x`);
    vm.runInContext('hljs.highlight = _h; hljs.highlightAuto = _a;', sandbox);
}
{
    // The cache is bounded: a burst of distinct large blocks must not grow it
    // without limit.
    vm.runInContext('out.cacheMax = _HL_CACHE_MAX_CHARS;', sandbox);
    const big = 'x'.repeat(20000);
    for (let i = 0; i < 60; i++) render(fence('js', '// ' + i + '\n' + big));
    vm.runInContext('out.cacheChars = _hlCacheChars; out.cacheSize = _hlCache.size;', sandbox);
    check('the highlight cache stays within its char budget',
        sandbox.out.cacheChars <= sandbox.out.cacheMax,
        `held ${sandbox.out.cacheChars} chars (budget ${sandbox.out.cacheMax})`);
    check('the highlight cache evicts rather than growing forever',
        sandbox.out.cacheSize < 60, `held ${sandbox.out.cacheSize} entries`);
    // …and still renders correctly afterwards.
    check('rendering still works after eviction', labelOf(render(fence('css', '.a{color:red}'))) === 'css');
}

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll fenced-code renderer checks passed.');
