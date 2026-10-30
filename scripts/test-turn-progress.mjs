import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// ---- What the user sees while a turn's first step is written ----------------
// The first seconds of a turn showed only the thinking dots: the model wrote
// its first tool call, and Puter sent a call only once it was complete. Two
// changes fill that wait.
// 1. The request asks for streamToolInput, so Puter sends a call's name the
//    moment the model starts it, and its arguments as they're written. The
//    dots show what it's doing ("Updating the main page") from then on.
// 2. The opening line is required. Older prompts made it optional and models
//    skipped it. Chats keep the prompt they started with, so an older one gets
//    the new rule as a note on the request copy.
//
// Runs the REAL handleMessageStream.js, tools.js and model-core.js together
// with puter.ai.chat scripted, and the real prepareHistoryForAI.

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const streamSource = read('../src/js/handleMessageStream.js');
const toolsSource = read('../src/js/tools.js');
const modelSource = read('../src/js/model-core.js');
const helpers = read('../src/js/helpers.js');
const prompt = read('../src/js/prompt.js');

const APP = '/u/AppData/app/chat-1';

async function* chunks(...items) { yield* items; }
const start = (name, id) => ({ type: 'tool_use_start', id, name });
const delta = (id, partialJson) => ({ type: 'tool_input_delta', id, partialJson });
const tool = (name, id, input = {}) => ({ type: 'tool_use', id, name, input, text: '' });
const usage = () => ({ type: 'usage', usage: { usd_cents: 1, output_tokens: 10 } });
const text = (t) => ({ type: 'text', text: t });
// A call's arguments as Puter streams them: split into small pieces.
const pieces = (id, json, size = 7) => {
    const out = [];
    for (let i = 0; i < json.length; i += size) out.push(delta(id, json.slice(i, i + size)));
    return out;
};

function setup(rounds) {
    const labels = [];
    const executed = [];
    const jq = () => ({ length: 0, find: () => ({ html() {} }), attr() {}, remove() {} });
    const env = {
        AbortController, DOMException, setTimeout, clearTimeout, console,
        currentChatId: 'one', shouldStop: false,
        marked: { parse: (s) => s },
        escapeMarkdownSource: (s) => s,
        $: () => ({ length: 0 }),
        hasActiveTodos: () => false,
        appendMessage: jq,
        autoScrollTrigger() {},
        createThinkingPreview: () => ({ append() {}, remove() {} }),
        isStaleTurn: (c) => c.currentChatId !== env.currentChatId,
        isAborted: (ac) => !!(ac && ac.signal.aborted),
        showSpinner() {}, startSpinnerStub() {}, stopSpinnerStub() {},
        scheduleSaveCurrentChat() {},
        generateMessageId: () => 'msg',
        prepareHistoryForAI: (h) => h,
        setSpinnerLabel: (t) => labels.push(t),
        puter: { ai: { chat: async () => chunks(...(rounds.shift() || [text('Done.'), usage()])) } },
    };
    env.window = env;
    vm.createContext(env);
    vm.runInContext(modelSource, env);
    vm.runInContext(streamSource, env);
    vm.runInContext(toolsSource, env);
    for (const name of ['edit', 'write', 'TodoWrite', 'update_preview', 'mcp_notion_search']) {
        env.tools.push({
            type: 'function',
            function: { name, parameters: { type: 'object', properties: {} } },
            exec: async (args) => { executed.push(`${name}:${JSON.stringify(args)}`); return { success: true }; },
        });
    }
    const context = {
        currentChatId: 'one', abortController: new AbortController(), model: 'claude-opus-5-5', appDir: APP,
        tools: env.tools, chatHistory: [], currentMessage: null, currentMessageContent: '',
    };
    return { env, context, labels, executed };
}

let failures = 0;
async function check(name, fn) {
    try { await fn(); console.log('ok   - ' + name); }
    catch (e) { failures++; console.log('FAIL - ' + name + '\n       ' + e.message); }
}

// ---- The status beside the dots ---------------------------------------------

await check('an edit names the part of the app as soon as its path is in, with nothing before it', async () => {
    const input = { path: APP + '/index.html', old_content: '<h1>Hi</h1>', new_content: '<h1>Hello</h1>' };
    const h = setup([]);
    await h.env.handleMessageStream(chunks(
        start('edit', 'e1'), ...pieces('e1', JSON.stringify(input)), tool('edit', 'e1', input), usage(),
    ), h.context);
    // No "Updating your app" first: the path comes in the call's first pieces,
    // and a generic label replaced a moment later read as a snap. Then ''
    // once the edit has run and the next round starts, and '' again for that
    // round's text.
    assert.deepEqual(h.labels, ['', 'Updating the main page', '', '']);
});

await check('the complete call is still the one that runs', async () => {
    const input = { path: APP + '/index.html', data: '<p>x</p>' };
    const h = setup([]);
    await h.env.handleMessageStream(chunks(
        start('write', 'w1'), ...pieces('w1', JSON.stringify(input)), tool('write', 'w1', input), usage(),
    ), h.context);
    assert.deepEqual(h.executed, ['write:' + JSON.stringify(input)]);
});

await check('the part comes from the path within the project, never a file name', async () => {
    const inFolder = setup([]);
    await inFolder.env.handleMessageStream(chunks(start('write', 'w1'), ...pieces('w1', `{"path":"${APP}/js/app.js","data":"x"}`),
        tool('write', 'w1'), usage()), inFolder.context);
    assert.equal(inFolder.labels[1], 'Making it interactive');
    const nested = setup([]);
    await nested.env.handleMessageStream(chunks(start('write', 'w1'), ...pieces('w1', `{"path":"${APP}/blog/index.html","data":"x"}`),
        tool('write', 'w1'), usage()), nested.context);
    assert.equal(nested.labels[1], 'Creating a page', 'only the project\'s own index.html is the main page');
    assert.ok(![...inFolder.labels, ...nested.labels].some((l) => /\.(html|js)\b/.test(l)), 'no file names');
});

await check('every kind of file has plain words, for creating it and for changing it', async () => {
    const h = setup([]);
    const table = {
        'index.html': ['Creating the main page', 'Updating the main page'],
        'about.html': ['Creating a page', 'Updating a page'],
        'css/style.css': ['Adding the styling', 'Updating the styling'],
        'app.js': ['Making it interactive', 'Updating how it works'],
        'workers/api.js': ['Setting up the backend', 'Updating the backend'],
        'assets/Logo.PNG': ['Adding an image', 'Updating an image'],
        'images/hero.svg': ['Adding an image', 'Updating an image'],
        'icon.svg': ['Adding the app icon', 'Updating the app icon'],
        'data/menu.json': ["Adding the app's data", "Updating the app's data"],
        'README.md': ['Working on your app', 'Working on your app'],
    };
    for (const [path, want] of Object.entries(table)) assert.deepEqual([...h.env.appPartLabel(path)], want, path);
});

await check('an escaped path is read as written', async () => {
    const h = setup([]);
    await h.env.handleMessageStream(chunks(start('write', 'w1'), ...pieces('w1', `{"path":"${APP}/my \\"best\\" page.html","data":"x"}`),
        tool('write', 'w1'), usage()), h.context);
    assert.equal(h.labels[1], 'Creating a page');
});

await check('a long write stops being read once its path is in', async () => {
    const h = setup([]);
    const json = `{"path":"${APP}/index.html","data":"${'x'.repeat(20000)}"}`;
    await h.env.handleMessageStream(chunks(start('write', 'w1'), ...pieces('w1', json, 50), tool('write', 'w1'), usage()), h.context);
    assert.deepEqual(h.labels.slice(0, 2), ['', 'Creating the main page']);
    assert.equal(h.labels.filter((l) => l === 'Creating the main page').length, 1, 'set once, not on every piece');
});

await check('a write whose path can\'t be read falls back to its plain wording', async () => {
    const h = setup([]);
    const json = `{"data":"${'x'.repeat(3000)}","path":"${APP}/index.html"}`;
    await h.env.handleMessageStream(chunks(start('write', 'w1'), ...pieces('w1', json, 100), tool('write', 'w1'), usage()), h.context);
    assert.deepEqual(h.labels.slice(0, 2), ['', 'Working on your app']);
});

await check('tools with their own UI leave the dots bare, other tools get a plain status', async () => {
    const h = setup([[start('update_preview', 'u1'), tool('update_preview', 'u1'), usage()],
        [start('mcp_notion_search', 'm1'), tool('mcp_notion_search', 'm1'), usage()], [text('Done.'), usage()]]);
    await h.env.handleMessageStream(chunks(start('TodoWrite', 't1'), tool('TodoWrite', 't1'), usage()), h.context);
    assert.deepEqual(h.labels.filter((l) => l), ['Applying changes', 'Finishing up', 'Using a connected service']);
    assert.equal(h.labels[0], '', 'the checklist call shows no status');
});

await check('after the preview check the dots say what comes next, not Working', async () => {
    const run = async (verification) => {
        const h = setup([[text('Done.'), usage()]]);
        h.env.tools.find((t) => t.function.name === 'update_preview').exec = async () => (verification ? { success: true, verification } : { success: true });
        await h.env.handleMessageStream(chunks(start('update_preview', 'u1'), tool('update_preview', 'u1'), usage()), h.context);
        return h.labels.filter((l) => l);
    };
    assert.deepEqual(await run(null), ['Applying changes', 'Finishing up']);
    assert.deepEqual(await run({ status: 'errors_detected', errors: ['x'] }), ['Applying changes', 'Fixing a problem']);
    assert.deepEqual(await run({ status: 'errors_persist', errors: ['x'] }), ['Applying changes', 'Finishing up'],
        'on its last try the model explains instead of fixing');
});

await check('every build request asks Puter to stream tool calls', async () => {
    const h = setup([]);
    assert.equal(h.env.ModelCore.buildChatOptions('claude-opus-5-5').streamToolInput, true);
    assert.equal(h.env.ModelCore.buildChatOptions('gpt-6.1-sol').streamToolInput, true);
});

// ---- "Working" after a second of nothing ------------------------------------
// The real setSpinnerLabel from helpers.js, with a fake label and clock.
function labelHarness({ withLabel = true } = {}) {
    let now = 0;
    const timers = [];
    const classes = new Set();
    const fades = [];
    const label = withLabel ? {
        textContent: '',
        get offsetWidth() { return 0; },
        classList: {
            add: (c) => { classes.add(c); if (c === 'is-changing') fades.push(label.textContent); },
            remove: (c) => classes.delete(c),
        },
    } : null;
    const env = {
        document: { querySelector: () => label },
        setTimeout: (fn, ms) => { const t = { at: now + ms, fn }; timers.push(t); return t; },
        clearTimeout: (t) => { const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); },
        window: {},
    };
    const set = new Function('document', 'setTimeout', 'clearTimeout', 'window',
        slice(helpers, 'const SPINNER_IDLE_LABEL', 'window.setSpinnerLabel = setSpinnerLabel;') + '\nreturn setSpinnerLabel;'
    )(env.document, env.setTimeout, env.clearTimeout, env.window);
    const advance = (ms) => {
        const until = now + ms;
        for (;;) {
            timers.sort((a, b) => a.at - b.at);
            if (!timers.length || timers[0].at > until) break;
            const t = timers.shift();
            now = t.at;
            t.fn();
        }
        now = until;
    };
    return { set, advance, label, fades, timers };
}

await check('a cleared label says Working after a second, not before', async () => {
    const h = labelHarness();
    h.set('');
    h.advance(999);
    assert.equal(h.label.textContent, '');
    h.advance(1);
    assert.equal(h.label.textContent, 'Working');
});

await check('a new step within that second cancels it, so quick hand-offs stay plain', async () => {
    const h = labelHarness();
    h.set('Updating the main page');
    h.set('');
    h.advance(400);
    h.set('Applying changes');
    h.advance(5000);
    assert.equal(h.label.textContent, 'Applying changes');
    assert.equal(h.timers.length, 0);
});

await check('new words fade in, the same words don\'t restart it', async () => {
    const h = labelHarness();
    h.set('Creating the main page');
    h.set('Creating the main page');
    h.set('Applying changes');
    assert.deepEqual(h.fades, ['Creating the main page', 'Applying changes']);
});

await check('with no dots on screen nothing waits or loops', async () => {
    const h = labelHarness({ withLabel: false });
    h.set('');
    h.advance(10000);
    assert.equal(h.timers.length, 0);
});

// ---- The required opening line ------------------------------------------------

function slice(src, from, to) {
    const a = src.indexOf(from), b = src.indexOf(to, a + from.length);
    if (a < 0 || b <= a) throw new Error('could not extract ' + from);
    return src.slice(a, b);
}
const { prepareHistoryForAI } = new Function('window',
    slice(helpers, 'function prepareHistoryForAI(', '/**\n * Sum the AI-reported cost') +
    '\nreturn { prepareHistoryForAI };')({});
const OLD_PROMPT = 'Build apps. For every turn — first or follow-up — you may send AT MOST one short opening message that acknowledges the request.';
const userMsg = { role: 'user', content: [{ type: 'text', text: 'make it blue' }] };

await check('the prompt requires one opening sentence, and a closing line that doesn\'t repeat it', async () => {
    assert.ok(prompt.includes('In every turn that uses tools, start with exactly one short opening sentence, before your first tool call'));
    assert.ok(prompt.includes('end with one short closing line that does not repeat your opening sentence'));
    assert.ok(!prompt.includes('keep your summary of what you did short'), 'the old summary rule is gone');
});

await check('an older chat\'s optional rule gets the required one as a note', async () => {
    const plainOut = prepareHistoryForAI([{ role: 'system', content: OLD_PROMPT }, userMsg]);
    assert.ok(plainOut[0].content.startsWith(OLD_PROMPT) && /required, not optional/.test(plainOut[0].content));
    const common = { type: 'text', text: OLD_PROMPT, cache_control: { type: 'ephemeral', ttl: '1h' } };
    const blockOut = prepareHistoryForAI([{ role: 'system', content: [common, { type: 'text', text: 'Working directory: /a' }] }, userMsg]);
    assert.equal(blockOut[0].content.length, 3, 'the note is a block of its own, at the end');
    assert.deepEqual(blockOut[0].content[0], common, 'the cached common block is untouched');
});

await check('a chat on the current prompt gets no note', async () => {
    // Its "no commentary" paragraph still has the optional wording, next to
    // the rule's own paragraph.
    assert.ok(prompt.includes('you may send AT MOST one short opening message'));
    const out = prepareHistoryForAI([{ role: 'system', content: prompt }, userMsg]);
    assert.ok(!out[0].content.includes('It is required, not optional. Apart from it, the rules against narrating between tool calls still apply.]'));
});

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll turn-progress checks passed.');
