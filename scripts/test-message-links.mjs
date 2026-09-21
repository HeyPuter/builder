import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard for links in rendered chat messages ------------------
// An AI message used to be run through marked and THEN through a second,
// regex-based "linkify anything outside a tag" pass. marked's GFM autolinker
// already links bare http(s)/www/ftp URLs and email addresses, and it knows
// where NOT to — inside a code span, inside a fenced block, and inside a link's
// own label. The regex pass knew none of that, so it:
//   * re-linked text already inside an <a>, producing nested anchors (which the
//     parser splits into two links) and a duplicated target attribute;
//   * turned URLs inside inline code and fenced code blocks into live links,
//     swallowing neighbouring quotes into the href and corrupting the code;
//   * bypassed the walkTokens href sanitizer, so it could mint a file:// link
//     marked deliberately refuses;
//   * made a message render differently after a reload than while it streamed
//     (the streaming renderer never ran that pass).
//
// USER messages are rendered WITHOUT markdown, so they still need linkifyText.
//
// Runs the real renderers against the real vendored marked.

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
vm.runInContext(slice('function linkifyText(', 'function appendMessage('), sandbox);
vm.runInContext(slice('function htmlEscape(', 'function generateChatId('), sandbox);
vm.runInContext(slice('window.hasUnsafeUrlScheme = function', '// ---- Syntax-highlight memo'), sandbox);
vm.runInContext(slice('// ---- Syntax-highlight memo', 'function prepareHistoryForAI('), sandbox);
vm.runInContext('marked.use(MARKED_OPTIONS);', sandbox);

// The exact AI-message render pipeline, lifted from appendMessage.
const AI_PIPELINE = slice('parsedContent = marked.parse(isUpgrade', '\n    }\n');
function renderAI(content) {
    sandbox.out.content = content;
    vm.runInContext('var isUpgrade = false, parsedContent; var content = out.content;\n' + AI_PIPELINE + '\nout.html = parsedContent;', sandbox);
    return sandbox.out.html;
}
function renderUser(content) {
    sandbox.out.content = content;
    vm.runInContext('out.html = linkifyText(out.content);', sandbox);
    return sandbox.out.html;
}

const anchors = (html) => html.match(/<a\b[^>]*>/gi) || [];
const hrefsOf = (html) => anchors(html).map(t => (t.match(/href="([^"]*)"/i) || [])[1]);
// Text that sits inside <code>…</code> (inline) or <pre>…</pre> (fenced).
const inside = (html, open, close) => {
    const out = [];
    const re = new RegExp('<' + open + '\\b[^>]*>([\\s\\S]*?)</' + close + '>', 'gi');
    let m; while ((m = re.exec(html))) out.push(m[1]);
    return out.join('');
};

// === A bare URL becomes ONE link ==========================================
{
    const html = renderAI('See https://example.test/path for details.');
    check('a bare URL yields exactly one anchor', anchors(html).length === 1, html);
    check('no nested anchors', !/<a\b[^>]*>[\s\S]*<a\b/i.test(html), html);
    check('no duplicated target attribute', !/target="_blank"[^>]*target="_blank"/i.test(html), html);
    check('and it opens in a new tab', /<a target="_blank" href="https:\/\/example\.test\/path"/.test(html), html);
}

// === Code is left alone ===================================================
{
    const html = renderAI('Call `https://api.example.test/v1` first.');
    check('no link inside an inline code span', !/<a\b/i.test(inside(html, 'code', 'code')), html);
}
{
    const html = renderAI('```js\nfetch("https://api.example.test/v1");\n```');
    check('no link inside a fenced code block', !/<a\b/i.test(inside(html, 'pre', 'pre')), html);
    check('the code block keeps its quotes', inside(html, 'pre', 'pre').includes('&quot;'), html);
}

// === A link label is not re-linked ========================================
{
    const html = renderAI('[open https://inner.test now](https://outer.test)');
    const hrefs = hrefsOf(html);
    check('a labelled link yields one anchor', hrefs.length === 1, JSON.stringify(hrefs));
    check('and it points at the real destination', hrefs[0] === 'https://outer.test', JSON.stringify(hrefs));
}

// === What marked does autolink still gets linked ==========================
check('www. is autolinked', /<a[^>]*href="http:\/\/www\.example\.test/.test(renderAI('see www.example.test now')));
check('an email is autolinked', /href="mailto:/.test(renderAI('mail a@b.test please')));
check('a markdown link still renders', /href="https:\/\/example\.test"/.test(renderAI('[x](https://example.test)')));

// === Unsafe schemes stay neutralized ======================================
check('a javascript: link is neutralized', renderAI('[x](javascript:alert(1))').includes('href="#"'));
check('a bare file:// URL is not turned into a link', !/<a\b/i.test(renderAI('open file:///etc/passwd now')));

// === Model-authored images are links, not <img> requests ==================
// An <img> is a request the browser fires at any host the model names, so an
// injected instruction could ship conversation contents out in its URL.
{
    const html = renderAI('see ![the mockup](https://cdn.example/mock.png) here');
    check('an AI image renders no <img>', !/<img\b/i.test(html), html);
    check('… but a link to its URL, labelled with the alt text',
        /<a target="_blank" href="https:\/\/cdn\.example\/mock\.png"[^>]*>the mockup<\/a>/.test(html), html);
    check('an image with an unsafe scheme is neutralized like a link', renderAI('![x](javascript:alert(1))').includes('href="#"'));
    check('an image with no alt is labelled with its URL', /<a[^>]*>https:\/\/cdn\.example\/a\.png<\/a>/.test(renderAI('![](https://cdn.example/a.png)')));
}

// === Legacy string-content user messages still get linkified ==============
{
    const html = renderUser('check https://example.test/page and www.example.test');
    check('a user message still linkifies a bare URL', anchors(html).length === 2, html);
    check('and opens those in a new tab', (html.match(/target="_blank"/g) || []).length === 2, html);
    check('user text is still escaped', renderUser('<img src=x onerror=alert(1)>').indexOf('<img') === -1);
    // The old pass ran over ALREADY-escaped text: a quoted URL swallowed the
    // &quot; entity into its href, and the www. branch printed `undefined`.
    const quoted = renderUser('see "https://example.test/x" now');
    check('a quoted URL keeps the quote out of its href', /href="https:\/\/example\.test\/x"/.test(quoted) && /&quot;<\/a>|<\/a>&quot;/.test(quoted), quoted);
    const www = renderUser('go to www.example.test now');
    check('a www. URL is linked to http:// and printed intact', /href="http:\/\/www\.example\.test"[^>]*>www\.example\.test<\/a>/.test(www) && !www.includes('undefined'), www);
    check('a sentence-ending full stop stays outside the link', /<\/a>\./.test(renderUser('read https://example.test/page.')));
    check('the text around the URL is escaped', renderUser('<b>x</b> https://e.test').startsWith('&lt;b&gt;x&lt;/b&gt; <a'));
    check('a URL with an ampersand escapes it in the href', /href="https:\/\/e\.test\/\?a=1&amp;b=2"/.test(renderUser('https://e.test/?a=1&b=2')));
}

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll message-link checks passed.');
