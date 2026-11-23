import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { makeDom } from './lib/mini-dom.mjs';

// ---- Editing the latest message (js/message-edit.js) ----------------------
// A pencil under the user's latest message opens it for editing in place, for
// as long as nothing done for it has changed anything: the AI has only read,
// looked things up, planned or asked (READ_ONLY_TOOLS). The first call that
// could change something takes the pencil away, so an edit never has anything
// to undo. Opening the editor stops a running build. Send swaps in the new
// text (files and hidden notes stay), drops what came after the message, and
// builds again from there through sendChatMessage's opts.edit (rewind). Cancel
// leaves the chat as it was, with the Resume banner back when there was one or
// the edit stopped a build. An edit that can no longer go in goes to the
// composer. This runs the REAL module on the mini DOM, then text-asserts
// where app.js, tools.js, versions.js and ui.js hook into it.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '  [' + detail + ']' : '')); failures++; }
}

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const ME = read('../src/js/message-edit.js');
const APP = read('../src/js/app.js');
const UI = read('../src/js/ui.js');
const TOOLS = read('../src/js/tools.js');
const VERSIONS = read('../src/js/versions.js');
const HELP = read('../src/js/helpers.js');
const CSS = read('../src/css/styles.css');
const VITE = read('../vite.config.js');
const PKG = JSON.parse(read('../package.json'));

function htmlEscape(text) {
    return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function nl_to_p(text) {
    return text.split(/\n\n+/).map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
        .replace(/<p><\/p>/g, '').replace(/^<p><\/p>|<p><\/p>$/g, '');
}
const tick = () => new Promise(r => setTimeout(r, 0));

// A chat on the mini DOM, the module loaded into it.
function setup({ flag = true } = {}) {
    const dom = makeDom();
    const { document, $ } = dom;
    const box = document.createElement('div');
    box.className = 'chat-box';
    dom.body.appendChild(box);
    const composer = document.createElement('textarea');
    composer.className = 'chat-input-message';
    dom.body.appendChild(composer);
    const s = { toasts: [], announces: [], stops: 0, sends: [], banners: [], returned: [], cleared: 0 };
    const env = {
        console, setTimeout, Promise,
        $, document,
        htmlEscape, nl_to_p,
        isProcessing: false,
        chatHistory: [{ role: 'system', content: 'sys' }],
        isVersionNote: (m) => !!m.versionNote,
        // What the real sendChatMessage does with opts.edit, in short: the
        // rewind, then the conversation swap. `onSend` lets a test call it off.
        onSend: null,
        sendChatMessage: (input, skip, opts) => {
            s.sends.push(opts);
            if (env.onSend) return env.onSend(opts);
            const r = env.MessageEdit.rewind(env.chatHistory, opts.edit);
            env.chatHistory = r.history;
            env.isProcessing = true;
            env.MessageEdit.turnFor(opts.edit.messageId);
            s.rewound = r;
            return new Promise(() => {}); // the turn runs on
        },
    };
    env.window = Object.assign(env, {
        FEATURE_FLAGS: { messageEdit: flag },
        showToast: (m) => s.toasts.push(m),
        announce: (m) => s.announces.push(m),
        isMobileViewport: () => false,
        isComposingKeyEvent: (e) => !!e.isComposing,
        stopTurnForEdit: () => { if (!env.isProcessing) return false; s.stops++; env.isProcessing = false; return true; },
        clearResumeBanner: () => { s.cleared++; box.querySelectorAll('.resume-banner-message').forEach(n => n.remove()); },
        showResumeBanner: (m) => {
            if (env.MessageEdit.holdBanner(m)) return;
            s.banners.push(m);
            $(box).append('<div class="message resume-banner-message">banner</div>');
        },
        MessageQueue: { returnToComposer: (items) => { s.returned.push(...items.map(i => i.text)); composer.value = items.map(i => i.text).join('\n\n'); } },
    });
    vm.createContext(env);
    vm.runInContext(ME, env);
    const ME_ = env.MessageEdit;

    // Draws a sent message the way sendChatMessage does.
    function bubble(id, text, files = '') {
        $(box).append(`<div class="message user-message" data-message-id="${id}"><div class="message-content">${nl_to_p(htmlEscape(text))}${files}</div></div>`);
        return box.querySelector(`.user-message[data-message-id="${id}"]`);
    }
    function aiText(text) { $(box).append(`<div class="message ai-message"><div class="message-content"><p>${text}</p></div></div>`); }
    function say(id, content) {
        env.chatHistory.push({ role: 'user', content, messageId: id });
        bubble(id, typeof content === 'string' ? content : (content.find(b => b.type === 'text') || {}).text || '',
            Array.isArray(content) && content.some(b => b.type === 'image-ref') ? '<div class="attached-images"><img class="message-image" src="t"></div>' : '');
    }
    const call = (name, id = 't' + Math.random().toString(36).slice(2, 7)) => ({ type: 'tool_use', id, name, input: {} });
    const result = (id) => ({ role: 'user', content: { type: 'tool_result', tool_use_id: id, content: '{}' } });
    const pencil = () => box.querySelector('.message-edit-btn');
    const pencilOn = () => { const b = pencil(); return b ? b.closest('.user-message').getAttribute('data-message-id') : null; };
    const input = () => box.querySelector('.message-edit-input');
    const key = (el, k, extra = {}) => dom.dispatch(el, 'keydown', { key: k, ...extra });
    return { dom, env, s, box, composer, ME: ME_, bubble, aiText, say, call, result, pencil, pencilOn, input, key, $ };
}

// ---- Which message can be edited ------------------------------------------
{
    const { ME, call } = setup();
    const id = (h) => ME.editableId([{ role: 'system', content: 's' }, ...h]);
    const u = (messageId, content = 'hi') => ({ role: 'user', content, messageId });
    const a = (content) => ({ role: 'assistant', content });
    const r = (callId) => ({ role: 'user', content: { type: 'tool_result', tool_use_id: callId, content: '{}' } });
    const read = call('ReadTextFile', 'r1');
    check('a message with only words after it can be edited', id([u('m1'), a('Sure, which colour?')]) === 'm1');
    check('…and one with nothing after it yet', id([u('m1')]) === 'm1');
    check('reads, searches, a checklist and a question change nothing',
        id([u('m1'), a([read, call('SearchFiles'), call('TodoWrite'), call('AskClarifyingQuestions')]), r('r1')]) === 'm1');
    check('a write takes it away', id([u('m1'), a(read), r('r1'), a(call('write'))]) === null);
    check('…in a batch with reads too', id([u('m1'), a([call('ReadTextFile'), call('edit')])]) === null);
    for (const t of ['multi_edit', 'delete', 'copy', 'move', 'rename', 'mkdir', 'create_worker', 'ExtractZip',
        'GenerateImage', 'GenerateVideo', 'GenerateSpeech', 'RenderSvg', 'set_secret', 'set_email_sender_name',
        'delete_worker', 'publish_site', 'OfferPublish', 'OfferAddressChange', 'OfferCustomDomain', 'AppTests']) {
        check(`${t} counts as a change`, id([u('m1'), a(call(t))]) === null);
    }
    check('a tool this module has never heard of counts as a change', id([u('m1'), a(call('SomethingNew'))]) === null);
    check('a restore (or a pull) noted after it takes it away',
        id([u('m1'), a('Done.'), { role: 'assistant', content: '*Restored the project…*', versionNote: true }]) === null);
    check('an error card leaves it editable', id([u('m1'), { role: 'assistant', content: 'Busy.', isError: true }]) === 'm1');
    check('so does a resume\'s hidden nudge', id([u('m1'), a('Let me'), { role: 'user', resumeNudge: true, content: [{ type: 'text-hidden', text: 'go on' }] }]) === 'm1');
    check('a tool result as an array of blocks is a result too',
        id([u('m1'), a(read), { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'r1', content: '{}' }] }]) === 'm1');
    check('only the latest message: an older one is never offered',
        id([u('m1'), a(call('write')), r('x'), a('Done.'), u('m2')]) === 'm2');
    check('a message saved without an id is not offered', id([{ role: 'user', content: 'old' }]) === null);
    check('a conversation with no message has none', id([]) === null && ME.editableId(null) === null);
}

// ---- Rewriting a message ----------------------------------------------------
{
    const { ME } = setup();
    const { withText, textOf, requestText, hasFiles } = ME._internals;
    check('a plain message is its text', withText('old', 'new') === 'new' && textOf('old') === 'old');
    const parts = [
        { type: 'text', text: 'old' },
        { type: 'document', source: { type: 'text', data: 'PASTE' }, _pasted: true, _name: 'Pasted text' },
        { type: 'image-ref', path: '/p/assets/a.png', relativePath: 'assets/a.png', thumb: 'data:x' },
        { type: 'text-hidden', text: '[The user attached 1 file…]' },
        { type: 'text-hidden', text: '[The user clicked a specific element…]' },
    ];
    const out = withText(parts, 'new text');
    check('the text is swapped in its place', out[0].type === 'text' && out[0].text === 'new text' && textOf(out) === 'new text');
    check('…and the pasted text, the image and both hidden notes stay, in order',
        JSON.stringify(out.slice(1)) === JSON.stringify(parts.slice(1)));
    check('…the original isn\'t touched', parts[0].text === 'old');
    const filesOnly = withText(parts, '');
    check('emptied with files left: the text block goes', !filesOnly.some(b => b.type === 'text') && filesOnly.length === 4);
    const noText = withText(parts.slice(2), 'caption');
    check('a message that was only files gets its text first', noText[0].type === 'text' && noText[0].text === 'caption' && noText.length === 4);
    check('what was asked, for the version label: the text, then the pasted text', requestText(out) === 'new text\n\nPASTE');
    check('files: the image and the paste count, the hidden notes don\'t',
        hasFiles(parts) && !hasFiles([{ type: 'text', text: 'x' }, { type: 'text-hidden', text: 'y' }]) && !hasFiles('x'));
    const m1 = { content: 'hi' };
    ME.addNote(m1, 'NOTE');
    check('a hand-edit note joins a plain message as a hidden part',
        JSON.stringify(m1.content) === JSON.stringify([{ type: 'text', text: 'hi' }, { type: 'text-hidden', text: 'NOTE' }]));
    const m2 = { content: [{ type: 'text', text: 'hi' }] };
    ME.addNote(m2, 'NOTE');
    check('…and one with parts, at the end', m2.content.length === 2 && m2.content[1].text === 'NOTE');
}

// ---- The pencil -------------------------------------------------------------
{
    const t = setup();
    const { env, ME, say, aiText, call, pencil, pencilOn } = t;
    say('m1', 'first');
    env.chatHistory.push({ role: 'assistant', content: call('write') });
    aiText('Done.');
    say('m2', 'second');
    ME.refresh();
    check('under the latest message, and only there', pencilOn() === 'm2' && t.box.querySelectorAll('.message-edit-btn').length === 1);
    check('…labelled for a screen reader', pencil().getAttribute('aria-label') === 'Edit message');

    // A turn starting: no pencil until its message is in.
    env.isProcessing = true;
    ME.turnStarted({});
    check('a new turn setting up: no pencil on the message before it', !pencil());
    ME.turnFor('m2');
    check('its message is in: the pencil is on it while the AI works', pencilOn() === 'm2');
    env.chatHistory.push({ role: 'assistant', content: call('ReadTextFile') });
    const before = pencil();
    before.focus();
    ME.refresh();
    check('a read keeps it, the same button (focus stays)', pencil() === before && t.dom.document.activeElement === before);
    env.chatHistory.push({ role: 'user', content: { type: 'tool_result', tool_use_id: 'x', content: '{}' } });
    env.chatHistory.push({ role: 'assistant', content: call('write') });
    ME.refresh();
    check('a write about to run takes it away', !pencil());
    env.isProcessing = false;
    ME.refresh();
    check('…for good, after the turn', !pencil());

    // A resume works on the latest message.
    const r = setup();
    r.say('m1', 'hello');
    r.env.isProcessing = true;
    r.ME.turnStarted({ resume: true });
    check('a resume: the pencil stays on the message it continues', r.pencilOn() === 'm1');

    const off = setup({ flag: false });
    off.say('m1', 'hello');
    off.ME.refresh();
    check('FEATURE_FLAGS.messageEdit off: no pencil', !off.pencil());
}

// ---- Opening, cancelling ----------------------------------------------------
{
    const t = setup();
    const { env, s, ME, say, aiText, pencil, input, dom } = t;
    say('m1', 'make it blue');
    env.isProcessing = true;
    ME.turnFor('m1');
    aiText('Let me look at the styles first.');
    dom.dispatch(pencil(), 'click');
    const msg = t.box.querySelector('.user-message');
    check('opening it while Puter works stops the build', s.stops === 1 && !env.isProcessing);
    check('…and turns the message into a box with its text', input() && input().value === 'make it blue' && msg.classList.contains('editing'));
    check('…the box comes first, the text it replaces stays (hidden by CSS)',
        msg.querySelector('.message-content').children[0] === input() && !!msg.querySelector('.message-content p'));
    check('…with Cancel and Send, Send ready', !!msg.querySelector('.message-edit-cancel') && msg.querySelector('.message-edit-send').disabled === false);
    check('…no pencil while it\'s open, focus in the box', !pencil() && dom.document.activeElement === input());
    check('…and a screen reader hears it stopped', /^Stopped\. Edit your message/.test(s.announces.at(-1)));

    // The stopped build ends meanwhile and asks for its Resume banner.
    env.showResumeBanner('The response was interrupted.');
    check('the stopped build\'s Resume banner waits while the editor is open', s.banners.length === 0 && !t.box.querySelector('.resume-banner-message'));

    input().value = 'make it red';
    dom.dispatch(msg.querySelector('.message-edit-cancel'), 'click');
    check('Cancel: the message as it was', !input() && !msg.classList.contains('editing')
        && msg.querySelector('.message-content').textContent === 'make it blue');
    check('…the Resume banner back, with its words', s.banners.length === 1 && s.banners[0] === 'The response was interrupted.');
    check('…and the pencil back, focused', pencil() && dom.document.activeElement === pencil());
    check('…nothing sent', s.sends.length === 0);
}
{
    // Nothing running, no banner: Cancel puts back no banner.
    const t = setup();
    t.say('m1', 'hello');
    t.aiText('Hi! What would you like to build?');
    t.ME.refresh();
    t.dom.dispatch(t.pencil(), 'click');
    check('opening it with no build running stops nothing', t.s.stops === 0 && !!t.input());
    t.key(t.input(), 'Escape');
    check('Escape cancels, with no banner to bring back', !t.input() && t.s.banners.length === 0);

    // A banner that was up when it opened comes back on Cancel.
    t.$(t.box).append('<div class="message resume-banner-message">banner</div>');
    t.dom.dispatch(t.pencil(), 'click');
    check('opening it takes the Resume banner down', !t.box.querySelector('.resume-banner-message'));
    t.key(t.input(), 'Escape');
    check('…and Cancel puts it back', !!t.box.querySelector('.resume-banner-message'));
}
{
    // Clicked just as a write went out: refused, nothing stopped.
    const t = setup();
    t.say('m1', 'hello');
    t.ME.refresh();
    const btn = t.pencil();
    t.env.chatHistory.push({ role: 'assistant', content: t.call('write') });
    t.dom.dispatch(btn, 'click');
    check('a change since the pencil was drawn: no editor, the user is told', !t.input() && t.s.toasts.length === 1 && /can’t be edited/.test(t.s.toasts[0]));
    check('…and the stale pencil goes', !t.pencil());
}

// ---- Sending ------------------------------------------------------------------
{
    const t = setup();
    const { env, s, ME, say, call, pencil, input, dom, box } = t;
    say('m1', [
        { type: 'text', text: 'add a gallery' },
        { type: 'image-ref', path: '/p/assets/a.png', relativePath: 'assets/a.png', thumb: 'data:x' },
        { type: 'text-hidden', text: '[note]' },
    ]);
    const original = env.chatHistory;
    env.chatHistory.push({ role: 'assistant', content: [call('readdir', 'r1')] });
    env.chatHistory.push({ role: 'user', content: { type: 'tool_result', tool_use_id: 'r1', content: '[]' } });
    env.chatHistory.push({ role: 'assistant', content: [call('TodoWrite', 'r2')] });
    t.$(box).append('<div class="todo-list message ai-message"><div class="message-content"><ul><li>Plan</li></ul></div></div>');
    t.aiText('Which photos?');
    t.$(box).append('<div class="message-queue" role="list"></div>');
    env.currentTodos = [{ content: 'Plan', status: 'in_progress' }];
    ME.refresh();
    dom.dispatch(pencil(), 'click');
    check('a message with an image: the box shows its text, the image stays in view',
        input().value === 'add a gallery' && !!box.querySelector('.user-message .attached-images'));
    input().value = '';
    dom.dispatch(input(), 'input');
    check('emptied, with an image left: Send still works', box.querySelector('.message-edit-send').disabled === false);
    input().value = '  add a photo gallery  ';
    t.key(input(), 'Enter', { shiftKey: true });
    check('Shift+Enter is a new line, not a send', s.sends.length === 0);
    t.key(input(), 'Enter', { isComposing: true });
    check('the Enter that ends an IME composition doesn\'t send', s.sends.length === 0);
    t.key(input(), 'Enter');
    await tick();
    check('Enter sends it, as an edit, its text trimmed',
        s.sends.length === 1 && s.sends[0].edit.messageId === 'm1' && s.sends[0].edit.text === 'add a photo gallery');

    const h = env.chatHistory;
    check('the conversation is a new array, up to the message and no further',
        h !== original && h.length === 2 && h[1].messageId === 'm1');
    check('…the message has its new text, its image and note kept',
        h[1].content[0].text === 'add a photo gallery' && h[1].content[1].type === 'image-ref' && h[1].content[2].text === '[note]');
    check('…the conversation it replaced is left as it was', original.length === 5 && original[1].content[0].text === 'add a gallery');
    const msg = box.querySelector('.user-message');
    check('the bubble shows the new text, its image still under it',
        msg.querySelector('.message-content p').textContent === 'add a photo gallery'
        && msg.querySelector('.message-content').children.at(-1).className === 'attached-images');
    check('…no editor left', !input() && !msg.classList.contains('editing') && !box.querySelector('.message-edit-actions'));
    check('what came after it is gone, the queued messages stay',
        !box.querySelector('.ai-message') && !box.querySelector('.todo-list') && !!box.querySelector('.message-queue'));
    check('…its checklist with it', env.currentTodos === null);
    check('the pencil is back on it while it builds again', t.pencilOn() === 'm1');
    check('the rewind reports what the version label and analytics need',
        s.rewound.request === 'add a photo gallery' && s.rewound.files === true);
    check('the focus goes back to the composer', dom.document.activeElement === t.composer);
}
{
    // Called off before its turn began (a restore started, say): the editor is
    // the user's again.
    const t = setup();
    t.say('m1', 'hello');
    t.ME.refresh();
    t.dom.dispatch(t.pencil(), 'click');
    let release;
    t.env.onSend = () => new Promise(r => { release = r; });
    t.input().value = 'hello there';
    t.dom.dispatch(t.box.querySelector('.message-edit-send'), 'click');
    await tick();
    check('sending: the box and both buttons wait', t.input().disabled === true
        && t.box.querySelector('.message-edit-send').disabled === true && t.box.querySelector('.message-edit-cancel').disabled === true);
    t.dom.dispatch(t.box.querySelector('.message-edit-send'), 'click');
    await tick();
    check('…and a second click sends nothing more', t.s.sends.length === 1);
    release();
    await tick(); await tick();
    check('called off: still open, usable again, with what was typed', t.input() && t.input().disabled === false
        && t.input().value === 'hello there' && t.box.querySelector('.message-edit-send').disabled === false);

    // Called off because something changed meanwhile: the text goes to the composer.
    t.env.onSend = () => { t.env.chatHistory.push({ role: 'assistant', content: '*Pulled from GitHub*', versionNote: true }); return Promise.resolve(); };
    t.dom.dispatch(t.box.querySelector('.message-edit-send'), 'click');
    await tick(); await tick();
    check('called off by a change: the edit is in the composer and the user is told',
        !t.input() && t.s.returned.at(-1) === 'hello there' && /in the message box/.test(t.s.toasts.at(-1)));
}
{
    // Changed before Send: nothing is sent, the text goes to the composer.
    const t = setup();
    t.say('m1', 'hello');
    t.ME.refresh();
    t.dom.dispatch(t.pencil(), 'click');
    t.input().value = 'hello again';
    t.env.chatHistory.push({ role: 'assistant', content: '*Restored*', versionNote: true });
    t.dom.dispatch(t.box.querySelector('.message-edit-send'), 'click');
    check('no longer editable at Send: not sent, moved to the composer', t.s.sends.length === 0
        && t.s.returned[0] === 'hello again' && t.composer.value === 'hello again' && !t.input());
    check('…the message itself as it was', t.box.querySelector('.user-message .message-content').textContent === 'hello');
}
{
    // Empty, with no files: nothing to send.
    const t = setup();
    t.say('m1', 'hello');
    t.ME.refresh();
    t.dom.dispatch(t.pencil(), 'click');
    t.input().value = '   ';
    t.dom.dispatch(t.input(), 'input');
    check('emptied, no files: Send is off', t.box.querySelector('.message-edit-send').disabled === true);
    t.key(t.input(), 'Enter');
    check('…and Enter sends nothing', t.s.sends.length === 0);
}
{
    // A turn setting up from the composer when Send is pressed gives way.
    const t = setup();
    t.say('m1', 'hello');
    t.ME.refresh();
    t.dom.dispatch(t.pencil(), 'click');
    t.env.isProcessing = true;
    t.ME.turnStarted({});
    t.input().value = 'hello edited';
    t.dom.dispatch(t.box.querySelector('.message-edit-send'), 'click');
    await tick();
    check('a send still setting up is stopped, and the edit goes', t.s.stops === 1 && t.s.sends.length === 1);
}
{
    // A message sent from the composer while the editor is open comes after
    // it: the edit can no longer go in.
    const t = setup();
    t.say('m1', 'hello');
    t.ME.refresh();
    t.dom.dispatch(t.pencil(), 'click');
    t.input().value = 'hello edited';
    t.env.isProcessing = true;
    t.ME.turnStarted({});
    t.say('m2', 'something else');
    t.ME.turnFor('m2');
    check('another message joined: the edit goes to the composer', !t.input() && t.s.returned[0] === 'hello edited');
    const u = setup();
    u.say('m1', 'hello');
    u.ME.refresh();
    u.dom.dispatch(u.pencil(), 'click');
    u.say('m2', 'something else');
    u.ME.turnFor('m2');
    check('…unchanged, the editor just closes', !u.input() && u.s.returned.length === 0 && u.s.toasts.length === 0);
    check('…and the pencil moves to the new message', u.pencilOn() === 'm2');
}
{
    // A chat switch drops the editor's state with the chat.
    const t = setup();
    t.say('m1', 'hello');
    t.ME.refresh();
    t.dom.dispatch(t.pencil(), 'click');
    t.ME.reset();
    t.box.textContent = '';
    check('after a switch nothing is open', t.ME.isOpen() === false && t.ME.holdBanner('x') === false);
}

// ---- The read-only tools really are ------------------------------------------
{
    const { ME } = setup();
    const toolsDir = new URL('../src/tools/', import.meta.url);
    const files = [];
    const walk = (dir) => {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, e.name);
            if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p);
        }
    };
    walk(toolsDir.pathname);
    const byName = new Map();
    for (const f of files) {
        const src = fs.readFileSync(f, 'utf8');
        for (const m of src.matchAll(/name: *["']([A-Za-z_]+)["']/g)) byName.set(m[1], src);
    }
    for (const name of ME._internals.READ_ONLY_TOOLS) {
        const src = byName.get(name);
        check(`${name} is a real tool that writes nothing`, !!src
            && !/puter\.fs\.(write|mkdir|delete|copy|move|rename|upload)\b|markProjectModified|puter\.workers\.(create|delete)|puter\.hosting\./.test(src));
    }
}

// ---- Wiring -------------------------------------------------------------------
{
    check('the module loads after app.js and message-queue.js',
        VITE.indexOf("'js/message-edit.js'") > VITE.indexOf("'js/message-queue.js'")
        && VITE.indexOf("'js/message-queue.js'") > VITE.indexOf("'js/app.js'"));
    check('FEATURE_FLAGS.messageEdit is on', /\n    messageEdit: true,\n/.test(HELP));
    check('the test runs with npm test', PKG.scripts.test.includes('node scripts/test-message-edit.mjs'));

    const stopFn = APP.slice(APP.indexOf('function stopTurnForEdit() {'), APP.indexOf('window.stopTurnForEdit = stopTurnForEdit;'));
    check('stopping for an edit counts the build as abandoned, then stops it like Stop',
        /trackBuildAbandoned\('edited'\);\s*stopActiveTurn\(\);/.test(stopFn) && !/MessageQueue|showResumeBanner/.test(stopFn));
    const banner = APP.slice(APP.indexOf('function showResumeBanner(message) {'));
    check('the Resume banner waits while the editor is open',
        banner.indexOf('window.MessageEdit?.holdBanner?.(message)') > 0 && banner.indexOf('window.MessageEdit?.holdBanner?.(message)') < banner.indexOf('clearResumeBanner();'));
    const reset = APP.slice(APP.indexOf('function resetChatUIForSwitch() {'), APP.indexOf('\n}\n', APP.indexOf('function resetChatUIForSwitch() {')));
    check('a chat switch resets it', reset.includes('window.MessageEdit?.reset?.();'));
    const dock = APP.indexOf('window.restorePublishDock?.();');
    check('loadChat draws the pencil once the conversation is drawn', dock > 0 && APP.indexOf('window.MessageEdit?.refresh?.();', dock) - dock < 300);

    const send = APP.slice(APP.indexOf('async function sendChatMessage('), APP.indexOf('// ---- Follow-up suggestions'));
    check('opts.edit is read (and never with a resume)', send.includes('const edit = !isResume && opts.edit && opts.edit.messageId ? opts.edit : null;'));
    check('an automatic fix waits while a message is open for editing',
        send.indexOf('if (opts.autoFix && window.MessageEdit?.isOpen?.()) return;') > 0
        && send.indexOf('if (opts.autoFix && window.MessageEdit?.isOpen?.()) return;') < send.indexOf('if (isProcessing) {'));
    check('an edit isn\'t a reply to a clarifying question', send.includes('if (window._activeClarification && !edit) {'));
    check('an edit takes nothing from the composer',
        send.includes('const consumedComposer = !isResume && !queued && !edit && userInput == null')
        && send.includes("const messageText = isResume ? '' : edit ? String(edit.text || '')"));
    check('…nor joins the queue', send.includes("!opts.resume && !opts.queued && !edit) {"));
    const check_ = send.indexOf('} else if (edit && window.MessageEdit?.editableId?.(chatHistory) !== edit.messageId) {');
    const rewind = send.indexOf('edited = window.MessageEdit.rewind(chatHistory, edit);');
    const swap = send.indexOf('chatHistory = edited.history;');
    check('it checks the message can still be edited after the setup\'s awaits',
        check_ > send.indexOf('window.GitHubSync.beforeTurn') && check_ < send.indexOf('isProcessing = true;'));
    check('…then, with no await between, rewinds and swaps the conversation before the turn\'s context is built',
        rewind > send.indexOf('isProcessing = true;') && swap > rewind && swap < send.indexOf('const turnSeq = ++_turnSeq;')
        && swap < send.indexOf('const turnSaveContext = {')
        && !send.slice(check_, swap).split('\n').some(l => !/^\s*\/\//.test(l) && /\bawait\b/.test(l)));
    check('other turns tell the pencil they started', send.includes('window.MessageEdit?.turnStarted?.({ resume: isResume });'));
    check('a new message tells it once it is in the conversation',
        /chatHistory\.push\(\{ role: "user", content: messageContent, messageId \}\);[\s\S]{0,400}window\.MessageEdit\?\.turnFor\?\.\(messageId\);/.test(send));
    const branch = send.slice(send.indexOf('} else if (edited) {'), send.indexOf('} else if (!skipAddToHistory) {'));
    check('an edit\'s turn: Build Started marked edited, the build tracked, the message counted as in',
        /window\.track\?\.\('Build Started', \{[^\n]*edited: true/.test(branch)
        && branch.includes('_activeBuild = { turnSeq,') && branch.includes('userMessageAppended = true;')
        && !branch.includes("'Project Created'"));
    check('…hand edits from the Code view go with it', branch.includes('window.MessageEdit.addNote(edited.message, manualEditNote);'));
    check('its version is labelled with the edited request', send.includes('const turnRequest = edited ? edited.request :'));

    const push = TOOLS.indexOf('content: completion.length === 1 ? completion[0] : completion,');
    const refresh = TOOLS.indexOf('window.MessageEdit?.refresh?.()', push);
    check('a round\'s calls take the pencil away before any of them runs',
        push > 0 && refresh > push && refresh < TOOLS.indexOf('await executeFunction(toolCall.name', push));
    check('a restore and a pull from GitHub take it away', (VERSIONS.match(/window\.MessageEdit\?\.refresh\?\.\(\);/g) || []).length === 2);
    check('so does going live with backend keys', UI.includes("appendMessage(keysNote, false);\n                // The site went live under the last message: no editing it.\n                window.MessageEdit?.refresh?.();"));

    check('styles: the pencil, the box, its buttons, on phones and in dark mode',
        ['.message-edit-bar {', '.message-edit-btn {', '.message-edit-input {', '.message-edit-actions {', '.message-edit-send {',
            '.user-message.editing .message-content > :not(.message-edit-input)',
            'html[data-theme="dark"] .message-edit-input', '    .message-edit-btn { width: 36px; height: 36px; }'].every(c => CSS.includes(c)));
}

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nAll message-edit checks passed.');
