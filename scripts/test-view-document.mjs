import fs from 'node:fs';

// ---- Regression guard for ViewDocument's pre-flight limits ------------------
// The document API reads at most 100 pages / 32MB per request. A PDF over
// either limit used to enter the conversation as a document block, fail the
// request, and (until the next user turn retired the block) fail the retry
// too. The tool now estimates the page count and checks the size BEFORE the
// pages enter the history, and returns a model-directed error instead.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const src = fs.readFileSync(new URL('../src/tools/fs/view_document.js', import.meta.url), 'utf8');
const win = { tools: [], assertPathInProject: (p) => p };
// `puter` is looked up at call time so each scenario below can swap the stub.
const puterProxy = { fs: { read: (...a) => globalThis.puter.fs.read(...a) } };
new Function('window', 'puter', src)(win, puterProxy);
const I = win.__viewDocumentInternals;
const tool = win.tools.find((t) => t.function.name === 'ViewDocument');
check('tool registered with the internals exposed', !!tool && !!I && typeof I.estimatePdfPages === 'function');

const page = (n) => `${n} 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n`;
const pdf = (n) => '%PDF-1.4\n2 0 obj\n<< /Type /Pages /Count ' + n + ' >>\nendobj\n' + Array.from({ length: n }, (_, i) => page(i + 3)).join('');
check('counts /Type /Page objects', I.estimatePdfPages(pdf(7)) === 7);
check('does not count the /Type /Pages tree node', I.estimatePdfPages('<< /Type /Pages /Count 3 >>') === 0);
check('tolerates whitespace variants', I.estimatePdfPages('/Type/Page\n/Type  /Page /Type /Page>>') === 3);
check('an object-stream PDF (no visible page objects) estimates 0, never high', I.estimatePdfPages('%PDF-1.5 binary junk') === 0);
check('limits are the API\'s: 100 pages, under 32MB base64-encoded', I.MAX_PDF_PAGES === 100 && I.MAX_PDF_BYTES <= 24 * 1024 * 1024);

// Drive the real exec with a stub filesystem.
async function run(bytes) {
    const blob = { size: bytes.length, text: async () => bytes };
    globalThis.puter = { fs: { read: async () => blob } };
    // FileReader is only reached when the pre-flight passes; stub it to a
    // known base64 so the success path can be asserted too.
    globalThis.FileReader = class { readAsDataURL() { this.result = 'data:application/pdf;base64,QUJD'; this.onload(); } };
    try { return { ok: true, res: await tool.exec({ path: '/u/AppData/app/c1/assets/doc.pdf' }, { appDir: '/u/AppData/app/c1' }) }; }
    catch (e) { return { ok: false, err: e }; }
}
{
    const r = await run(pdf(120));
    check('a 120-page PDF is refused before it enters the conversation', !r.ok && /about 120 pages/.test(r.err.message));
    check('… with a model-directed instruction not to retry', /Do not retry/.test(r.err.message));
}
{
    const r = await run(pdf(3));
    check('a 3-page PDF is read', r.ok && Array.isArray(r.res.__contentBlocks) && r.res.__contentBlocks[1].type === 'document');
    check('… and its data is the base64 payload', r.res.__contentBlocks[1].source.data === 'QUJD');
}
{
    const big = { size: 30 * 1024 * 1024, text: async () => '' };
    globalThis.puter = { fs: { read: async () => big } };
    let err = null;
    try { await tool.exec({ path: '/u/AppData/app/c1/assets/doc.pdf' }, { appDir: '/u/AppData/app/c1' }); } catch (e) { err = e; }
    check('an oversized PDF is refused by size', !!err && /too large to read/.test(err.message));
}

if (failures) { console.error(`\n${failures} ViewDocument check(s) failed.`); process.exit(1); }
console.log('\nAll ViewDocument checks passed.');
