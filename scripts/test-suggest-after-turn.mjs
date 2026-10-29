import fs from 'node:fs';

// ---- Regression guard: "what next?" chips never hold the composer ----------
// The build model used to write the chips itself, as a SuggestNextSteps call
// after its summary. The turn only ended once that call had streamed, so the
// composer stayed locked for seconds after the preview and the reply were
// done (issue #123). The chips now come from the small suggestion model,
// started once the turn has unwound and never awaited, and the build model has
// no such tool. Older chats keep the system prompt that told it to call one,
// and their histories still hold the calls. The request copy drops the calls
// and adds a note to such a prompt (retireSuggestNextSteps).
//
// Evaluates the real prepareHistoryForAI (helpers.js) and text-asserts the
// wiring in app.js, prompt.js, the tool descriptions and the shipped scripts.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const helpers = read('../src/js/helpers.js');
const app = read('../src/js/app.js');
const prompt = read('../src/js/prompt.js');
const updatePreview = read('../src/tools/apps_and_sites/update_preview.js');
const vite = read('../vite.config.js');

function slice(src, from, to) {
    const a = src.indexOf(from), b = src.indexOf(to, a + from.length);
    if (a < 0 || b <= a) throw new Error('could not extract ' + from);
    return src.slice(a, b);
}
const { prepareHistoryForAI } = new Function('window',
    slice(helpers, 'function prepareHistoryForAI(', '/**\n * Sum the AI-reported cost') +
    '\nreturn { prepareHistoryForAI };')({});

const OLD_PROMPT = 'Build apps.\n\nCRITICAL: To help the user keep going, end your turn by calling the SuggestNextSteps tool exactly once.';
const call = (id, name) => ({ type: 'tool_use', id, name, input: {} });
const toolUse = (id, name) => ({ role: 'assistant', content: call(id, name) });
const toolResult = (id) => ({ role: 'user', content: { type: 'tool_result', tool_use_id: id, content: '{"success":true}' } });
const user = (t) => ({ role: 'user', content: [{ type: 'text', text: t }] });
const assistant = (t) => ({ role: 'assistant', content: t });
const calls = (out) => out.flatMap((m) => (Array.isArray(m.content) ? m.content : [m.content]))
    .filter((b) => b && b.type === 'tool_use').map((b) => b.name);
const results = (out) => out.filter((m) => m.content && m.content.type === 'tool_result').map((m) => m.content.tool_use_id);

// --- an older chat's calls and prompt ---------------------------------------
{
    // The usual shape: summary, then the call, then a new message.
    const h = [
        { role: 'system', content: OLD_PROMPT },
        user('make the heading blue'),
        toolUse('e1', 'edit'), toolResult('e1'),
        toolUse('p1', 'update_preview'), toolResult('p1'),
        assistant('Made the heading blue.'),
        toolUse('s1', 'SuggestNextSteps'), toolResult('s1'),
        user('now add a footer'),
    ];
    const before = JSON.stringify(h);
    const out = prepareHistoryForAI(h);
    check('the persisted history is not mutated', JSON.stringify(h) === before);
    check('the SuggestNextSteps call is left out', !calls(out).includes('SuggestNextSteps'), JSON.stringify(calls(out)));
    check('…and so is its result', !results(out).includes('s1'), JSON.stringify(results(out)));
    check('the other calls and results stay', calls(out).join() === 'edit,update_preview' && results(out).join() === 'e1,p1');
    check('the summary stays, followed by the new message',
        out[out.length - 2].content === 'Made the heading blue.' && out[out.length - 1].content[0].text === 'now add a footer');
    check('the cache breakpoint is on the new message', out[out.length - 1].cache_control?.type === 'ephemeral');
    check('the old prompt gets the note that the tool is gone',
        /SuggestNextSteps tool no longer exists/.test(out[0].content) && out[0].content.startsWith(OLD_PROMPT));
}
{
    // A call written before its summary, which then came in another round.
    const h = [
        { role: 'system', content: OLD_PROMPT },
        user('build it'),
        toolUse('p1', 'update_preview'), toolResult('p1'),
        toolUse('s1', 'SuggestNextSteps'), toolResult('s1'),
        assistant('Built it.'),
        user('thanks'),
    ];
    const out = prepareHistoryForAI(h);
    check('a call before the summary is left out too', !calls(out).includes('SuggestNextSteps') && !results(out).includes('s1'));
    check('…leaving the preview result, then the summary', out[3].content.tool_use_id === 'p1' && out[4].content === 'Built it.');
}
{
    // A batch: the call shared a reply with update_preview.
    const h = [
        { role: 'system', content: OLD_PROMPT },
        user('build it'),
        { role: 'assistant', content: [call('p1', 'update_preview'), call('s1', 'SuggestNextSteps')] },
        toolResult('p1'), toolResult('s1'),
        user('thanks'),
    ];
    const out = prepareHistoryForAI(h);
    check('a batched call is taken out of its reply, which keeps the rest',
        Array.isArray(out[2].content) && out[2].content.length === 1 && out[2].content[0].name === 'update_preview');
    check('…and only its result goes', results(out).join() === 'p1');
}
{
    // An old prompt can still lead the model to call it. That call and its
    // error stay, or the next request would look the same and it would call
    // again, round after round.
    const h = [
        { role: 'system', content: OLD_PROMPT },
        user('make the heading blue'),
        toolUse('e1', 'edit'), toolResult('e1'),
        toolUse('s1', 'SuggestNextSteps'),
        { role: 'user', content: { type: 'tool_result', tool_use_id: 's1', content: '{"error":"Unknown function: SuggestNextSteps"}', is_error: true } },
    ];
    const out = prepareHistoryForAI(h);
    check('a call made in this turn keeps its error, so the model sees it failed',
        calls(out).includes('SuggestNextSteps') && results(out).includes('s1'));
}
{
    // Resuming an older chat cut off right after the call: no nudge is added
    // (it ends on a result), so the request must still end on that result.
    const h = [
        { role: 'system', content: OLD_PROMPT },
        user('build it'),
        toolUse('p1', 'update_preview'), toolResult('p1'),
        assistant('Built it.'),
        toolUse('s1', 'SuggestNextSteps'), toolResult('s1'),
    ];
    const out = prepareHistoryForAI(h);
    check('a resumed turn still ends on a tool result, never on the assistant',
        out[out.length - 1].role === 'user' && out[out.length - 1].content.tool_use_id === 's1');
}
{
    // The two-block prompt: the cached common block must stay as it was.
    const common = { type: 'text', text: OLD_PROMPT, cache_control: { type: 'ephemeral', ttl: '1h' } };
    const h = [
        { role: 'system', content: [common, { type: 'text', text: 'Working directory: /a' }] },
        user('hi'),
    ];
    const out = prepareHistoryForAI(h);
    const blocks = out[0].content;
    check('a block prompt gets the note as a block of its own, at the end',
        blocks.length === 3 && /no longer exists/.test(blocks[2].text));
    check('…leaving the cached common block as it was', JSON.stringify(blocks[0]) === JSON.stringify(common));
}
{
    // A chat started on the current prompt has nothing to retire.
    const h = [
        { role: 'system', content: [{ type: 'text', text: 'Build apps.' }, { type: 'text', text: 'Working directory: /a' }] },
        user('hi'), assistant('Hello.'), user('build it'),
    ];
    const out = prepareHistoryForAI(h);
    check('a current chat gets no note', out[0].content.length === 2 && !JSON.stringify(out).includes('SuggestNextSteps'));
    check('…and keeps every message', out.length === h.length);
}

// --- the build model no longer has or is told about the tool ---------------
check('no shipped script registers SuggestNextSteps', !/tools\/chat_ui\/suggest\.js/.test(vite)
    && !fs.existsSync(new URL('../src/tools/chat_ui/suggest.js', import.meta.url)));
check('the system prompt never mentions it', !prompt.includes('SuggestNextSteps'));
check('update_preview never mentions it', !updatePreview.includes('SuggestNextSteps'));

// --- the chips come after the turn, unawaited ------------------------------
{
    const send = app.slice(app.indexOf('async function sendChatMessage('), app.indexOf('// ---- Follow-up suggestions'));
    const unlock = send.indexOf('resetUIState(turnChatId);');
    const gen = send.indexOf('generateContinueSuggestions(turnSaveContext);');
    check('the turn starts the chip generator', gen > 0);
    check('…after the composer is unlocked', unlock > 0 && gen > unlock);
    check('…without waiting for it', !/await\s+generateContinueSuggestions/.test(send));
    check('…only for a finished turn in the open chat',
        /if \(turnSucceeded && turnChatId === currentChatId && !isProcessing && !sendingQueued\) \{\s*generateContinueSuggestions\(turnSaveContext\);/.test(send));
    // A queued message is about to start the next turn, which would clear the
    // chips at once. The suggestion model is not called for nothing.
    check('…and not when a queued message is about to be sent',
        send.indexOf('const sendingQueued =') > unlock && send.indexOf('const sendingQueued =') < gen);
    const genFn = slice(app, 'async function generateContinueSuggestions(', '// ---- Automatic project naming');
    check('the generator uses the small suggestion model', /model: SUGGESTION_MODEL/.test(genFn)
        && /const SUGGESTION_MODEL = 'anthropic\/claude-haiku-/.test(app));
    check('…and drops its result once the user has moved on',
        /if \(seq !== _suggestSeq\) return;\s*if \(originChatId !== currentChatId\) return;\s*if \(isProcessing\) return;/.test(genFn));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll suggest-after-turn checks passed.');
