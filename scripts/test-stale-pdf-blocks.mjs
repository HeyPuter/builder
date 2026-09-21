import fs from 'node:fs';

// ---- Regression guard: earlier turns' PDF pages leave the request ----------
// A ViewDocument result carries the whole PDF as a base64 document block in a
// persisted tool_result, so it used to be re-sent with every later request
// for the life of the project. At ~1,500–3,000 tokens a page, one long PDF
// pushed every subsequent request over the context limit — "prompt is too
// long" on every send, the chat bricked for good. prepareHistoryForAI now
// swaps document blocks from EARLIER turns for a short text stub (the model
// can call ViewDocument again); the current turn's blocks are untouched, and
// so are images. This evaluates the REAL prepareHistoryForAI from helpers.js.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const HELP = new URL('../src/js/helpers.js', import.meta.url);
const src = fs.readFileSync(HELP, 'utf8');
const a = src.indexOf('function prepareHistoryForAI(');
const b = src.indexOf('/**\n * Sum the AI-reported cost');
if (a < 0 || b < 0 || b <= a) throw new Error('could not extract prepareHistoryForAI + stubStaleDocumentBlocks from helpers.js');
const win = {};
const { prepareHistoryForAI, stubStaleDocumentBlocks } = new Function('window',
    src.slice(a, b) + '\nreturn { prepareHistoryForAI, stubStaleDocumentBlocks };')(win);
check('stubStaleDocumentBlocks is exported on window for reuse', win.stubStaleDocumentBlocks === stubStaleDocumentBlocks);

const pdf = (data) => ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } });
const img = (data) => ({ type: 'image', source: { type: 'base64', media_type: 'image/png', data } });
const toolResult = (id, content) => ({ role: 'user', content: { type: 'tool_result', tool_use_id: id, content } });
const toolUse = (id, name, input) => ({ role: 'assistant', content: { type: 'tool_use', id, name, input } });
const user = (text) => ({ role: 'user', content: [{ type: 'text', text }] });
const assistant = (text) => ({ role: 'assistant', content: text, messageId: 'm1' });
const system = { role: 'system', content: 'sys' };

// --- Turn 1 reads a PDF; turn 2 is a new user message ---------------------------
{
    const history = [
        system,
        user('Summarize the attached report'),
        toolUse('t1', 'ViewDocument', { path: 'assets/report.pdf' }),
        toolResult('t1', [{ type: 'text', text: 'Contents of document "assets/report.pdf":' }, pdf('AAAA'.repeat(1000))]),
        assistant('Here is the summary.'),
        user('Now build a page around it'),
        toolUse('t2', 'ViewImage', { path: 'assets/mock.png' }),
        toolResult('t2', [{ type: 'text', text: 'Contents of image' }, img('BBBB')]),
    ];
    const before = JSON.stringify(history);
    const out = prepareHistoryForAI(history);
    check('the persisted history is not mutated', JSON.stringify(history) === before);
    const stale = out[3].content.content;
    check('the earlier turn\'s PDF block is replaced by a text stub',
        stale.length === 2 && stale[1].type === 'text' && /ViewDocument/.test(stale[1].text) && !('source' in stale[1]));
    check('the caption block beside it is kept', stale[0].type === 'text' && stale[0].text.startsWith('Contents of document'));
    check('no base64 PDF bytes remain in the request', !JSON.stringify(out).includes('AAAAAAAA'));
    check('an image block from another turn is left alone', out[7].content.content[1].type === 'image' && out[7].content.content[1].source.data === 'BBBB');
    check('everything else is still in place (message count, roles)',
        out.length === history.length && out.map(m => m.role).join() === history.map(m => m.role).join());
    check('the last message still carries the cache breakpoint', out[out.length - 1].cache_control && out[out.length - 1].cache_control.type === 'ephemeral');
}

// --- A PDF read in the CURRENT turn stays (the model is working with it) -------
{
    const history = [
        system,
        user('first'),
        assistant('ok'),
        user('Summarize the attached report'),
        toolUse('t1', 'ViewDocument', { path: 'assets/report.pdf' }),
        toolResult('t1', [{ type: 'text', text: 'Contents of document' }, pdf('CCCC')]),
        toolUse('t2', 'ReadTextFile', { path: 'x' }),
        toolResult('t2', 'text'),
    ];
    const out = prepareHistoryForAI(history);
    check('a document block read in the current turn is sent intact', out[5].content.content[1].type === 'document' && out[5].content.content[1].source.data === 'CCCC');
    check('a string tool_result is untouched', out[7].content.content === 'text');
}

// --- The resume path: a hidden nudge is a real user message too -----------------
{
    const history = [
        system,
        user('Summarize'),
        toolUse('t1', 'ViewDocument', { path: 'a.pdf' }),
        toolResult('t1', [pdf('DDDD')]),
        assistant('partial…'),
        { role: 'user', resumeNudge: true, content: [{ type: 'text-hidden', text: '[continue]' }] },
    ];
    const out = prepareHistoryForAI(history);
    check('a PDF from before the resume nudge is retired', out[3].content.content[0].type === 'text');
    check('the nudge itself is flattened to a text block as before', out[5].content[0].type === 'text' && !('resumeNudge' in out[5]));
}

// --- Several PDFs, several turns: only the current turn keeps its pages ---------
{
    const history = [
        system,
        user('one'), toolUse('t1', 'ViewDocument', {}), toolResult('t1', [pdf('E1')]), assistant('a'),
        user('two'), toolUse('t2', 'ViewDocument', {}), toolResult('t2', [pdf('E2')]), assistant('b'),
        user('three'), toolUse('t3', 'ViewDocument', {}), toolResult('t3', [pdf('E3')]),
    ];
    const out = prepareHistoryForAI(history);
    const kinds = [3, 7, 11].map(i => out[i].content.content[0].type);
    check('older turns\' PDFs are stubbed, the current turn\'s is kept', kinds.join() === 'text,text,document');
    check('the helper reports how many blocks it retired', stubStaleDocumentBlocks(structuredClone(history)) === 2);
}

// --- Nothing to do: no PDFs, or a history with no user message --------------------
{
    check('a history without document blocks is unchanged', (() => {
        const history = [system, user('hi'), assistant('yo'), user('again')];
        const out = prepareHistoryForAI(history);
        return JSON.stringify(out.map(m => m.content)) === JSON.stringify(history.map(m => m.content));
    })());
    check('odd inputs are tolerated', stubStaleDocumentBlocks(null) === 0 && stubStaleDocumentBlocks([null, {}, { role: 'user' }]) === 0);
}

if (failures) { console.error(`\n${failures} check(s) failed.`); process.exit(1); }
console.log('\nAll stale-PDF-block checks passed.');
