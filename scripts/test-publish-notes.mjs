import fs from 'node:fs';
import vm from 'node:vm';

// ---- The AI hears where the published site is --------------------------------
// The AI isn't told the published address any other way: a publish and an
// address change each leave it a hidden note (publishedNoteMessage,
// addressChangedNoteMessage in ui.js). Without one, what it last heard names
// an address that no longer works, or says nothing is public yet, and it hands
// the user that.
//
// The Settings dialog's rename moves the site as the toolbar's and the chat's
// address change do, but left no note, and it ran during the open project's
// turn, where a note would land in the middle of it. Drives the real
// submitAddress / persistPublished (sliced out of showChatProperties) and the
// real savePublishedFields.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const uiSource = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');

function extract(src, signature, end = '\n}\n') {
    const a = src.indexOf(signature);
    if (a < 0) throw new Error('could not find ' + signature);
    const b = src.indexOf(end, a);
    if (b < 0) throw new Error('could not find the end of ' + signature);
    return src.slice(a, b + end.length);
}

// ---- The Settings rename ------------------------------------------------------
// showChatProperties' own closures, with what they read from it.
const SETTINGS = `
function makeSettings(chatId, pub, saved, listEntry) {
    const ADDR_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
    function renderPublishedCell() { globalThis.rendered++; }
    ${extract(uiSource, '    async function persistPublished(fields', '\n    }\n')}
    ${extract(uiSource, '    async function submitAddress($form) {', '\n    }\n')}
    return submitAddress;
}`;

function setup({ open = true, processing = false, history = null, typed = 'new-name', changing = false } = {}) {
    const env = {
        console: { warn() {}, error() {} },
        currentChatId: open ? 'chat-a' : 'chat-b',
        chatHistory: history || [{ role: 'user', content: 'hi' }],
        isProcessing: processing,
        _sendSetupInFlight: false,
        _publishPanelOpen: false,
        rendered: 0,
        hosting: [], toasts: [], saves: [], fieldSaves: [],
        renderPublishPanel() {},
        setPublishBusy() {},
        resolvePublishedDir: async (p) => p,
        absolutizeSocialImagesInRelease: async () => {},
        generateMessageId: () => 'm1',
        saveCurrentChat: async (ctx) => { env.saves.push(ctx.chatHistory.map(m => m.content)); },
        puter: {
            hosting: {
                create: async (sub, path) => { env.hosting.push(['create', sub, path]); },
                delete: async (sub) => { env.hosting.push(['delete', sub]); },
            },
            ui: { alert: async () => {} },
        },
    };
    env.window = Object.assign(env, {
        isPublishInFlight: () => false,
        isAddressChanging: (id) => changing && id === 'chat-a',
        showToast: (text) => env.toasts.push(text),
        refreshPublishButton() {},
        tracked: [],
        track: (event, props) => env.tracked.push([event, props]),
        savePublishedFields: async (id, fields, note) => { env.fieldSaves.push({ id, fields, note }); },
        isSubdomainLimitErr: () => false,
        isSubdomainTakenErr: () => false,
        puterErrInfo: (e) => ({ message: e && e.message }),
        restoreFocus() {},
    });
    vm.createContext(env);
    vm.runInContext([
        extract(uiSource, 'function publishBlockedReason() {'),
        extract(uiSource, 'function previewSubdomain(url) {'),
        extract(uiSource, 'function addressChangedNoteMessage(oldUrl, newUrl) {'),
        extract(uiSource, 'function pushAiNote(history, note) {'),
        extract(appSource, 'function repairDanglingToolUses(history) {'),
        SETTINGS,
    ].join('\n\n'), env);
    const submit = env.makeSettings('chat-a',
        { url: 'https://old-name.puter.site/', path: '/alice/pub/r1' },
        { publishedVersionId: 'v1', publishedAt: 't' },
        { publishedUrl: 'https://old-name.puter.site/' });
    const field = { val: () => typed, prop() { return field; }, trigger() { return field; } };
    const $form = { find: () => field };
    return { env, run: () => submit($form) };
}

const noteText = (m) => m && Array.isArray(m.content) && m.content[0] && m.content[0].text;

{
    const { env, run } = setup({ open: true });
    await run();
    const note = env.chatHistory.at(-1);
    check('open project: the site moves', env.hosting.some(h => h[0] === 'create' && h[1] === 'new-name'));
    check('…and the AI gets a hidden note naming both addresses',
        note && note.role === 'assistant' && note.versionNote === true && note.content[0].type === 'text-hidden'
        && /old-name\.puter\.site/.test(noteText(note)) && /new-name\.puter\.site/.test(noteText(note)),
        JSON.stringify(note));
    check('…saved along with the new address', env.saves.length === 1 && env.saves[0].length === 2);
    check('…and counted, as from Settings',
        env.tracked.length === 1 && env.tracked[0][0] === 'Site Address Changed' && env.tracked[0][1].source === 'settings',
        JSON.stringify(env.tracked));
}

{
    const { env, run } = setup({ open: true, processing: true });
    await run();
    check('during the open project\'s turn: nothing moves', env.hosting.length === 0, JSON.stringify(env.hosting));
    check('…no note lands in the middle of the turn', env.chatHistory.length === 1);
    check('…and the user is told to wait', env.toasts.length === 1 && /Finishing the current task/.test(env.toasts[0]), JSON.stringify(env.toasts));
}

{
    const { env, run } = setup({ open: false, processing: true }); // the open project's turn
    await run();
    const save = env.fieldSaves[0];
    check('another project: not held by the open project\'s turn', env.hosting.some(h => h[0] === 'create'));
    check('…its record gets the new address, and the note for its AI',
        save && save.id === 'chat-a' && save.fields.publishedUrl === 'https://new-name.puter.site/'
        && /old-name\.puter\.site/.test(noteText(save.note)), JSON.stringify(save));
    check('…and the open project\'s conversation is left alone', env.chatHistory.length === 1);
}

{
    // The toolbar or the chat is moving this project's address: each would
    // create a new address and drop the old one, leaving one of the two new
    // ones behind, unused.
    const { env, run } = setup({ open: false, changing: true });
    await run();
    check('while its address is changing elsewhere: nothing moves, nothing is saved',
        env.hosting.length === 0 && env.fieldSaves.length === 0, JSON.stringify(env.hosting));
    check('…and the user is told to wait', env.toasts.length === 1 && /already changing/.test(env.toasts[0]), JSON.stringify(env.toasts));
}

{
    // Saving the address unchanged closed the editor on main, whatever was
    // running. The waits for a turn and an address change ran first, so it
    // was refused with "Finishing the current task" and the editor stayed.
    const { env, run } = setup({ open: true, processing: true, typed: 'old-name' });
    await run();
    check('unchanged address during a turn: the editor closes', env.rendered === 1, String(env.rendered));
    check('…with no wait toast, nothing moved and no note', env.toasts.length === 0 && env.hosting.length === 0
        && env.chatHistory.length === 1, JSON.stringify(env.toasts));
}

// ---- A stopped turn's tool call keeps its result next to it -------------------
// Stop between a reply's tool calls leaves a call with no result; the next send
// fills it in at the end (repairDanglingToolUses). With a note added after the
// call, the result landed after the note, splitting the call from its result:
// a request the model API rejects, every send after it too.
const dangling = () => [
    { role: 'user', content: 'build it' },
    { role: 'assistant', content: { type: 'tool_use', id: 't1', name: 'write', input: {} } },
];
const isResultFor = (m, id) => m && m.role === 'user' && m.content && m.content.type === 'tool_result' && m.content.tool_use_id === id;
{
    const { env, run } = setup({ open: true, history: dangling() });
    await run();
    const h = env.chatHistory;
    check('a stopped turn\'s call gets its result before the note, right after the call',
        h.length === 4 && isResultFor(h[2], 't1') && h[3].versionNote === true, JSON.stringify(h.map(m => m.role + ':' + (m.content.type || m.content))));
}

// ---- savePublishedFields adds the note to that chat's file --------------------
{
    const files = new Map([['chat-history/chat-b.json', JSON.stringify({ id: 'chat-b', history: [{ role: 'user', content: 'hi' }] })]]);
    const env = {
        console: { warn() {}, error() {} },
        savedChats: [{ id: 'chat-b' }],
        saveChatList: async () => {},
        updateChatHistorySidebar() {},
        puter: {
            fs: {
                read: async (p) => ({ text: async () => files.get(p) }),
                write: async (p, d) => { files.set(p, d); },
            },
        },
    };
    env.window = env;
    vm.createContext(env);
    vm.runInContext([
        extract(appSource, 'function chatFilePath(chatId) {'),
        extract(appSource, 'function withChatFileLock(chatId, fn) {'),
        extract(appSource, 'function repairDanglingToolUses(history) {'),
        extract(appSource, 'window.savePublishedFields = async function (chatId, fields', '\n};\n'),
    ].join('\n\n'), env);
    const note = { role: 'assistant', content: [{ type: 'text-hidden', text: '[moved]' }], versionNote: true };
    await env.savePublishedFields('chat-b', { publishedUrl: 'https://x.puter.site/' }, note);
    const saved = JSON.parse(files.get('chat-history/chat-b.json'));
    check('savePublishedFields: the address and the note go into that chat\'s file',
        saved.publishedUrl === 'https://x.puter.site/' && saved.history.length === 2 && noteText(saved.history[1]) === '[moved]',
        JSON.stringify(saved));
    await env.savePublishedFields('chat-b', { publishedUrl: 'https://y.puter.site/' });
    check('…and without one, the conversation is unchanged',
        JSON.parse(files.get('chat-history/chat-b.json')).history.length === 2);
    files.set('chat-history/chat-b.json', JSON.stringify({ id: 'chat-b', history: dangling() }));
    await env.savePublishedFields('chat-b', { publishedUrl: 'https://z.puter.site/' }, note);
    const h = JSON.parse(files.get('chat-history/chat-b.json')).history;
    check('…a stopped turn\'s call there gets its result before the note, too',
        h.length === 4 && isResultFor(h[2], 't1') && noteText(h[3]) === '[moved]', JSON.stringify(h));
}

// ---- After a publish, the AI may give out the address ------------------------
// The prompt and publish_site's description tell the AI never to share a
// public link, and the notes only said the site is public: asked "what's my
// link?" after publishing, it hedged or pointed at the preview.
{
    const sb = { generateMessageId: () => 'm' };
    vm.createContext(sb);
    vm.runInContext(extract(uiSource, 'function publishedNoteMessage(url, isFirst) {') + '\n'
        + extract(uiSource, 'function addressChangedNoteMessage(oldUrl, newUrl) {'), sb);
    const first = noteText(sb.publishedNoteMessage('https://a.puter.site/', true));
    const again = noteText(sb.publishedNoteMessage('https://a.puter.site/', false));
    const moved = noteText(sb.addressChangedNoteMessage('https://a.puter.site/', 'https://b.puter.site/'));
    check('the publish notes say the AI can give the user the address',
        /you can give the user that address/.test(first) && /you can give the user that address/.test(again), first + ' | ' + again);
    check('…and the address change note, the new one', /you can give the user the new one/.test(moved), moved);
    const publishSite = fs.readFileSync(new URL('../src/tools/apps_and_sites/publish_site.js', import.meta.url), 'utf8');
    check('publish_site keeps the link private only until the user publishes',
        /until the user has published it you should not tell the user the app is "live"\/"published" or share a public link/.test(publishSite));
}

// ---- An older chat's prompt learns about the Publish button ------------------
// A chat keeps the system prompt it started with. One from before the chat's
// Publish button sends the user to the preview's Publish button and names
// neither OfferPublish nor OfferAddressChange, so the projects most ready to
// publish had only the tools' descriptions to go on.
{
    const helpers = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
    const promptSrc = fs.readFileSync(new URL('../src/js/prompt.js', import.meta.url), 'utf8');
    const a = helpers.indexOf('function prepareHistoryForAI(');
    const b = helpers.indexOf('/**\n * Sum the AI-reported cost', a);
    const { prepareHistoryForAI } = new Function('window', helpers.slice(a, b) + '\nreturn { prepareHistoryForAI };')({});
    const user = { role: 'user', content: [{ type: 'text', text: 'publish it' }] };
    const OLD = 'The user decides if and when to make the app public themselves, using the Publish button in the preview. You never make the app public, and you must NOT tell the user the app is "live".';
    const out = prepareHistoryForAI([{ role: 'system', content: OLD }, user]);
    check('an older prompt gets a note naming OfferPublish and OfferAddressChange',
        out[0].content.startsWith(OLD) && /call the OfferPublish tool/.test(out[0].content) && /OfferAddressChange/.test(out[0].content),
        out[0].content);
    const blocks = prepareHistoryForAI([{ role: 'system', content: [{ type: 'text', text: OLD, cache_control: { type: 'ephemeral' } }] }, user]);
    check('…as a block of its own, leaving the cached block untouched',
        blocks[0].content.length === 2 && blocks[0].content[0].text === OLD && /OfferPublish/.test(blocks[0].content[1].text));
    check('the current prompt has the rule itself', promptSrc.includes('call the OfferPublish tool'));
    const current = prepareHistoryForAI([{ role: 'system', content: OLD + ' When the user asks you to publish it, call the OfferPublish tool.' }, user]);
    check('…so a chat on it gets no note', !current[0].content.includes('[When the user asks you to publish the app'), current[0].content);
}

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all publish-notes checks passed');
