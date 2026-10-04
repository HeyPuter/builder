import fs from 'node:fs';

// ---- Regression guard: pasting copied cells/paragraphs pastes their text ------
// The composer's paste handler attaches any clipboard FILE (screenshots, copied
// images, files from the OS). Excel, Word and Numbers put a rendered picture of
// the copied cells/paragraphs on the clipboard alongside the text, which the
// browser exposes as a file — so copying a table to paste its data attached an
// "image.png" and pasted nothing. A rich-text copy (plain text + HTML with real
// text in it + only image files) must fall through to the browser's text paste;
// every genuine image paste must still attach.
//
// Runs the real isRichTextCopy from ui.js against clipboard shapes.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const ui = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const a = ui.indexOf('function isRichTextCopy(cd, files) {');
const b = ui.indexOf('\n}\n', a);
if (a < 0 || b < 0) throw new Error('could not extract isRichTextCopy from ui.js');
const isRichTextCopy = new Function(ui.slice(a, b + 2) + '\nreturn isRichTextCopy;')();

const clip = (data, files) => ({
    cd: { types: [...Object.keys(data), ...(files.length ? ['Files'] : [])], getData: (t) => data[t] || '' },
    files: files.map((type) => ({ type, name: type === 'image/png' ? 'image.png' : 'file' })),
});
const run = ({ cd, files }) => isRichTextCopy(cd, files);

const excelHtml = '<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"><style>td{mso-number-format:General}</style></head>' +
    '<body><!--StartFragment--><table><tr><td>Name</td><td>Price</td></tr><tr><td>Tea</td><td>3.50</td></tr></table><!--EndFragment--></body></html>';
check('Excel cells (text + table HTML + a rendered PNG) paste as text',
    run(clip({ 'text/plain': 'Name\tPrice\nTea\t3.50', 'text/html': excelHtml }, ['image/png'])) === true);
check('Word paragraphs paste as text',
    run(clip({ 'text/plain': 'Hello world', 'text/html': '<p class="MsoNormal"><span>Hello world</span></p>' }, ['image/png'])) === true);
check('a screenshot (only an image) still attaches',
    run(clip({}, ['image/png'])) === false);
check('Firefox "Copy image" (URL as text, HTML that is just the <img>) still attaches',
    run(clip({ 'text/plain': 'https://example.com/cat.png', 'text/html': '<meta charset="utf-8"><!--StartFragment--><img src="https://example.com/cat.png" alt=""><!--EndFragment-->' }, ['image/png'])) === false);
check('a file copied in the OS file manager (name as text, no HTML) still attaches',
    run(clip({ 'text/plain': 'report.pdf' }, ['application/pdf'])) === false);
check('a copy that brings a non-image file is never treated as text',
    run(clip({ 'text/plain': 'x', 'text/html': '<p>x</p>' }, ['application/pdf'])) === false);
check('blank text with an image attaches',
    run(clip({ 'text/plain': '   ', 'text/html': '<p> </p>' }, ['image/png'])) === false);

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll paste-intake checks passed.');
