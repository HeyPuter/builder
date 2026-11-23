import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { makeDom } from './lib/mini-dom.mjs';

// ---- Copying and editing messages (js/message-edit.js) -----------------------
// Under each message the user sent, Copy and Edit (shown on hover). Edit turns
// the message into a box to change it in place, and opening it stops a running
// build. Send puts the new text in (files and hidden notes stay), takes what
// came after the message out of the conversation, and builds again from there.
// When anything after the message changed the project's files, they first go
// back to the version the message was sent with (baseVersion), and the
// message's own attachments come back. Cancel leaves the chat as it was, with
// the Resume banner back when there was one.
//
// This runs the REAL module on the mini DOM, with the versions.js and app.js
// calls it makes stubbed, then text-asserts where app.js, tools.js,
// versions.js, helpers.js and ui.js hook into it. scripts/test-message-versions
// runs the versions.js side for real.

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
const tick = async (n = 1) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };

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
    const s = {
        toasts: [], announces: [], stops: 0, sends: [], banners: [], returned: [], cleared: 0, saves: [],
        restores: [], copies: [], clipboard: [],
    };
    let ids = 0;
    const env = {
        console, setTimeout, Promise,
        $, document,
        htmlEscape, nl_to_p,
        isProcessing: false,
        _sendSetupInFlight: false,
        currentChatId: 'chat1',
        currentAppDir: '/u/AppData/b/chat1',
        chatHistory: [{ role: 'system', content: 'sys' }],
        isVersionNote: (m) => !!m.versionNote,
        generateMessageId: () => 'new' + (++ids),
        scheduleSaveCurrentChat: (ctx) => { s.saves.push({ ...ctx, history: ctx.chatHistory.slice() }); },
        clearContinueSuggestions: () => {},
        revokeChatMediaBlobURLs: () => {},
        navigator: { clipboard: { writeText: async (t) => { if (env.clipboardFails) throw new Error('blocked'); s.clipboard.push(t); } } },
        // The files: the version they are at, and what a restore does.
        filesAt: 'v1',
        restoreResult: null,
        // What the real sendChatMessage does with opts.edit, in short: the
        // turn begins (editTurn), and runs on. `onSend` lets a test call it off.
        onSend: null,
        sendChatMessage: (input, skip, opts) => {
            s.sends.push(opts);
            if (env.onSend) return env.onSend(opts);
            s.turn = env.MessageEdit.editTurn(env.chatHistory, opts.edit);
            env.isProcessing = true;
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
        setOpenChatHistory: (h) => { env.chatHistory = h; },
        whenTurnsUnwound: () => Promise.resolve(),
        projectVersionNow: async () => env.filesAt,
        restoreProjectVersion: async (v) => {
            s.restores.push(v);
            if (env.restoreResult) return env.restoreResult(v);
            const from = env.filesAt;
            env.filesAt = v;
            return { ok: true, from };
        },
        copyFilesFromVersion: async (chatId, appDir, v, rels) => { s.copies.push({ v, rels }); return rels.length; },
        // The thinking dots (helpers.js), in short.
        setSpinnerLabel: (text) => { const l = box.querySelector('.floating-spinner-label'); if (l) l.textContent = text; },
    });
    env.showSpinner = () => {
        if (box.querySelector('.floating-spinner')) return;
        const ms = box.querySelectorAll('.message');
        const $dots = $('<div class="floating-spinner"><span class="floating-spinner-label"></span></div>');
        if (ms.length) $(ms[ms.length - 1]).after($dots); else $(box).append($dots);
    };
    env.fadeOutSpinner = () => box.querySelectorAll('.floating-spinner').forEach(n => n.remove());
    vm.createContext(env);
    vm.runInContext(ME, env);
    const ME_ = env.MessageEdit;

    // Draws a sent message the way sendChatMessage does.
    function bubble(id, text, files = '') {
        $(box).append(`<div class="message user-message" data-message-id="${id}"><div class="message-content">${nl_to_p(htmlEscape(text))}${files}</div></div>`);
        return box.querySelector(`.user-message[data-message-id="${id}"]`);
    }
    function aiText(text) { $(box).append(`<div class="message ai-message"><div class="message-content"><p>${text}</p></div></div>`); }
    // Sent with the files at version v1, unless `extra` says otherwise.
    function say(id, content, extra = {}) {
        env.chatHistory.push({ role: 'user', content, messageId: id, baseVersion: 'v1', ...extra });
        bubble(id, typeof content === 'string' ? content : (content.find(b => b.type === 'text') || {}).text || '',
            Array.isArray(content) && content.some(b => b.type === 'image-ref') ? '<div class="attached-images"><img class="message-image" src="t"></div>' : '');
    }
    function reply(text) { env.chatHistory.push({ role: 'assistant', content: text }); aiText(text); }
    const call = (name, id = 't' + Math.random().toString(36).slice(2, 7)) => ({ type: 'tool_use', id, name, input: {} });
    const result = (id) => ({ role: 'user', content: { type: 'tool_result', tool_use_id: id, content: '{}' } });
    const msgEl = (id) => box.querySelector(`.user-message[data-message-id="${id}"]`);
    const editBtn = (id) => { const m = msgEl(id); return m ? m.querySelector('.message-edit-btn') : null; };
    const copyBtn = (id) => { const m = msgEl(id); return m ? m.querySelector('.message-copy-btn') : null; };
    const input = () => box.querySelector('.message-edit-input');
    const hint = () => { const h = box.querySelector('.message-edit-hint'); return h ? h.textContent : ''; };
    const key = (el, k, extra = {}) => dom.dispatch(el, 'keydown', { key: k, ...extra });
    const ids_ = () => [...box.querySelectorAll('.user-message')].map(e => e.getAttribute('data-message-id'));
    const dots = () => { const d = box.querySelector('.floating-spinner'); return d ? d.querySelector('.floating-spinner-label').textContent : null; };
    const shown = (el) => !!el && !el.classList.contains('message-edit-hidden');
    return { dom, env, s, box, composer, ME: ME_, bubble, aiText, say, reply, call, result, msgEl, editBtn, copyBtn, input, hint, key, ids: ids_, dots, shown, $ };
}

// ---- Rewriting a message ----------------------------------------------------
{
    const { ME } = setup();
    const { withText, textOf, requestText, hasFiles, savedFiles } = ME._internals;
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
    check('what was asked, for the version label and Copy: the text, then the pasted text', requestText(out) === 'new text\n\nPASTE');
    check('files: the image and the paste count, the hidden notes don\'t',
        hasFiles(parts) && !hasFiles([{ type: 'text', text: 'x' }, { type: 'text-hidden', text: 'y' }]) && !hasFiles('x'));
    check('the files a message was sent with, by their place in the project',
        JSON.stringify(savedFiles([...parts, { type: 'file-ref', relativePath: 'assets/b.pdf' }])) === '["assets/a.png","assets/b.pdf"]'
        && savedFiles('plain').length === 0);
    const m1 = { content: 'hi' };
    ME.addNote(m1, 'NOTE');
    check('a hidden note joins a plain message as a hidden part',
        JSON.stringify(m1.content) === JSON.stringify([{ type: 'text', text: 'hi' }, { type: 'text-hidden', text: 'NOTE' }]));
    const m2 = { content: [{ type: 'text', text: 'hi' }] };
    ME.addNote(m2, 'NOTE');
    check('…and one with parts, at the end', m2.content.length === 2 && m2.content[1].text === 'NOTE');
}

// ---- What changed after a message -------------------------------------------------
{
    const { ME, call } = setup();
    const { changedSince, hintFor, HINT_REVERT, HINT_AFTER } = ME._internals;
    const sys = { role: 'system', content: 's' };
    const u = (messageId, content = 'hi', extra = {}) => ({ role: 'user', content, messageId, ...extra });
    const a = (content) => ({ role: 'assistant', content });
    const r = (callId) => ({ role: 'user', content: { type: 'tool_result', tool_use_id: callId, content: '{}' } });
    const ch = (h) => changedSince([sys, ...h], 1);
    check('words after it change nothing', !ch([u('m1'), a('Sure, which colour?')]));
    check('reads, searches, a checklist and a question change nothing',
        !ch([u('m1'), a([call('ReadTextFile', 'r1'), call('SearchFiles'), call('TodoWrite'), call('AskClarifyingQuestions')]), r('r1')]));
    check('a write changes the files', ch([u('m1'), a(call('write'))]));
    for (const t of ['multi_edit', 'delete', 'copy', 'move', 'rename', 'mkdir', 'create_worker', 'ExtractZip',
        'GenerateImage', 'RenderSvg', 'set_secret', 'delete_worker', 'publish_site', 'OfferPublish', 'AppTests', 'SomethingNew']) {
        check(`${t} counts as a change`, ch([u('m1'), a(call(t))]));
    }
    check('a restore (or a pull) noted after it is a change',
        ch([u('m1'), a('Done.'), { role: 'assistant', content: '*Restored the project…*', versionNote: true }]));
    check('an error card and a resume\'s nudge aren\'t',
        !ch([u('m1'), { role: 'assistant', content: 'Busy.', isError: true }, { role: 'user', resumeNudge: true, content: [{ type: 'text-hidden', text: 'go on' }] }]));
    check('a later message with no files isn\'t, one with files is',
        !ch([u('m1'), a('ok'), u('m2', 'next')])
        && ch([u('m1'), a('ok'), u('m2', [{ type: 'text', text: 'x' }, { type: 'image-ref', relativePath: 'assets/x.png' }])]));
    const h = (list) => hintFor([sys, ...list], 1);
    check('the box says the app goes back when the files changed since',
        h([u('m1', 'hi', { baseVersion: 'v1' }), a(call('write'))]) === HINT_REVERT);
    check('…that what came after stays, with nothing changed', h([u('m1', 'hi', { baseVersion: 'v1' }), a('Which colour?')]) === HINT_AFTER);
    check('…and nothing for the last message with nothing after it', h([u('m1')]) === '');
}

// ---- The buttons --------------------------------------------------------------------
{
    const t = setup();
    const { env, ME, say, reply, call, result, editBtn, copyBtn, box, dom } = t;
    say('m1', 'first');
    env.chatHistory.push({ role: 'assistant', content: call('write', 'w1') });
    env.chatHistory.push(result('w1'));
    reply('Done.');
    say('m2', 'second');
    t.bubble('m3', 'not in the conversation yet');
    ME.refresh();
    check('every message the user sent gets Copy and Edit, the latest and older ones', !!editBtn('m1') && !!copyBtn('m1') && !!editBtn('m2') && !!copyBtn('m2'));
    check('…not a bubble whose message isn\'t in the conversation yet', !t.msgEl('m3').querySelector('.message-actions'));
    check('…labelled for a screen reader', editBtn('m1').getAttribute('aria-label') === 'Edit message' && copyBtn('m1').getAttribute('aria-label') === 'Copy message');
    check('…in a bar after the message, Copy before Edit',
        t.msgEl('m1').children.at(-1).className.includes('message-actions')
        && t.msgEl('m1').querySelector('.message-actions').children.map(c => c.className).join(' ') === 'message-copy-btn message-edit-btn');
    const before = editBtn('m2');
    before.focus();
    env.chatHistory.push({ role: 'assistant', content: call('ReadTextFile') });
    ME.refresh();
    check('a refresh leaves a bar that is right alone (focus stays)', editBtn('m2') === before && dom.document.activeElement === before);
    env.isProcessing = true;
    ME.refresh();
    check('a running build keeps them (Edit stops it)', !!editBtn('m1') && !!editBtn('m2'));
    check('the turn hooks just refresh', typeof ME.turnStarted === 'function' && typeof ME.turnFor === 'function');

    const off = setup({ flag: false });
    off.say('m1', 'hello');
    off.ME.refresh();
    check('FEATURE_FLAGS.messageEdit off: no buttons', !off.editBtn('m1') && !off.copyBtn('m1'));
    void box;
}

// ---- Edit only on the latest messages -----------------------------------------------
{
    const t = setup();
    const n = t.ME._internals.EDITABLE_LAST;
    check('Edit is on the latest 30 messages', n === 30);
    for (let k = 1; k <= n + 1; k++) { t.say('m' + k, 'message ' + k); t.reply('ok ' + k); }
    t.ME.refresh();
    check('an older one keeps Copy but has no Edit', !!t.copyBtn('m1') && !t.editBtn('m1'));
    check('…the 30 latest have both', !!t.editBtn('m2') && !!t.editBtn('m' + (n + 1)) && !!t.copyBtn('m2'));
    t.ME._internals.open('m1');
    check('…and the older one can\'t be opened another way', !t.input());
    t.say('m' + (n + 2), 'one more');
    t.ME.refresh();
    check('a new message takes Edit off the one that is now 31st', !t.editBtn('m2') && !!t.copyBtn('m2') && !!t.editBtn('m3'));
}

// ---- Copying ------------------------------------------------------------------------
{
    const t = setup();
    t.say('m1', [{ type: 'text', text: 'make it blue' }, { type: 'document', source: { type: 'text', data: 'spec' }, _pasted: true }]);
    t.ME.refresh();
    t.dom.dispatch(t.copyBtn('m1'), 'click');
    await tick();
    check('Copy puts the message on the clipboard, its pasted text too', t.s.clipboard[0] === 'make it blue\n\nspec');
    check('…shows a check, and a screen reader hears it', t.copyBtn('m1').classList.contains('copied') && t.s.announces.includes('Copied.'));
    t.env.clipboardFails = true;
    t.say('m2', 'again');
    t.ME.refresh();
    t.dom.dispatch(t.copyBtn('m2'), 'click');
    await tick();
    check('a blocked clipboard: the user is told', /Couldn’t copy/.test(t.s.toasts.at(-1)));
}

// ---- Opening, cancelling ----------------------------------------------------
{
    const t = setup();
    const { env, s, ME, say, aiText, editBtn, input, dom } = t;
    say('m1', 'make it blue');
    env.isProcessing = true;
    ME.refresh();
    aiText('Let me look at the styles first.');
    dom.dispatch(editBtn('m1'), 'click');
    const msg = t.msgEl('m1');
    check('opening it while Puter works stops the build', s.stops === 1 && !env.isProcessing);
    check('…and turns the message into a box with its text', input() && input().value === 'make it blue' && msg.classList.contains('editing'));
    check('…the box comes first, the text it replaces stays (hidden by CSS)',
        msg.querySelector('.message-content').children[0] === input() && !!msg.querySelector('.message-content p'));
    check('…with Cancel and Send, Send ready', !!msg.querySelector('.message-edit-cancel') && msg.querySelector('.message-edit-send').disabled === false);
    check('…no buttons on it while it\'s open, focus in the box', !msg.querySelector('.message-actions') && dom.document.activeElement === input());
    check('…and a screen reader hears it stopped', /^Stopped\. Edit your message/.test(s.announces.at(-1)));

    // The stopped build ends meanwhile and asks for its Resume banner.
    env.showResumeBanner('The response was interrupted.');
    check('the stopped build\'s Resume banner waits while the editor is open', s.banners.length === 0 && !t.box.querySelector('.resume-banner-message'));

    input().value = 'make it red';
    dom.dispatch(msg.querySelector('.message-edit-cancel'), 'click');
    check('Cancel: the message as it was', !input() && !msg.classList.contains('editing')
        && msg.querySelector('.message-content').textContent === 'make it blue');
    check('…the Resume banner back, with its words', s.banners.length === 1 && s.banners[0] === 'The response was interrupted.');
    check('…and Edit back, focused', editBtn('m1') && dom.document.activeElement === editBtn('m1'));
    check('…nothing sent', s.sends.length === 0);
}
{
    // Nothing running, no banner: Cancel puts back no banner.
    const t = setup();
    t.say('m1', 'hello');
    t.reply('Hi! What would you like to build?');
    t.ME.refresh();
    t.dom.dispatch(t.editBtn('m1'), 'click');
    check('opening it with no build running stops nothing', t.s.stops === 0 && !!t.input());
    check('…the box says what came after stays', t.hint() === t.ME._internals.HINT_AFTER);
    t.key(t.input(), 'Escape');
    check('Escape cancels, with no banner to bring back', !t.input() && t.s.banners.length === 0);

    // A banner that was up when it opened comes back on Cancel.
    t.$(t.box).append('<div class="message resume-banner-message">banner</div>');
    t.dom.dispatch(t.editBtn('m1'), 'click');
    check('opening it takes the Resume banner down', !t.box.querySelector('.resume-banner-message'));
    t.key(t.input(), 'Escape');
    check('…and Cancel puts it back', !!t.box.querySelector('.resume-banner-message'));

    // Opening another message's box closes this one.
    t.say('m2', 'second');
    t.ME.refresh();
    t.dom.dispatch(t.editBtn('m1'), 'click');
    t.dom.dispatch(t.editBtn('m2'), 'click');
    check('Edit on another message moves the box there', t.box.querySelectorAll('.message-edit-input').length === 1
        && t.input().closest('.user-message').getAttribute('data-message-id') === 'm2' && !t.msgEl('m1').classList.contains('editing'));
}

// ---- Sending: nothing changed since the message -------------------------------------
{
    const t = setup();
    const { env, s, ME, say, call, input, dom, box } = t;
    say('m1', [
        { type: 'text', text: 'add a gallery' },
        { type: 'image-ref', path: '/p/assets/a.png', relativePath: 'assets/a.png', thumb: 'data:x' },
        { type: 'text-hidden', text: '[note]' },
    ], { baseVersion: 'v1' });
    env.filesAt = 'v1';
    const original = env.chatHistory;
    env.chatHistory.push({ role: 'assistant', content: [call('readdir', 'r1')] });
    env.chatHistory.push({ role: 'user', content: { type: 'tool_result', tool_use_id: 'r1', content: '[]' } });
    env.chatHistory.push({ role: 'assistant', content: [call('TodoWrite', 'r2')] });
    t.$(box).append('<div class="todo-list message ai-message"><div class="message-content"><ul><li>Plan</li></ul></div></div>');
    t.aiText('Which photos?');
    t.$(box).append('<div class="message-queue" role="list"></div>');
    env.currentTodos = [{ content: 'Plan', status: 'in_progress' }];
    ME.refresh();
    dom.dispatch(t.editBtn('m1'), 'click');
    check('a message with an image: the box shows its text, the image stays in view',
        input().value === 'add a gallery' && !!box.querySelector('.user-message .attached-images'));
    check('…the box says what came after leaves the chat', t.hint() === ME._internals.HINT_AFTER);
    input().value = '';
    dom.dispatch(input(), 'input');
    check('emptied, with an image left: Send still works', box.querySelector('.message-edit-send').disabled === false);
    input().value = '  add a photo gallery  ';
    t.key(input(), 'Enter', { shiftKey: true });
    check('Shift+Enter is a new line, not a send', s.sends.length === 0);
    t.key(input(), 'Enter', { isComposing: true });
    check('the Enter that ends an IME composition doesn\'t send', s.sends.length === 0);
    t.key(input(), 'Enter');
    await tick(4);
    const h = env.chatHistory;
    const edited = h[h.length - 1];
    check('Enter sends it: the conversation is a new array, up to the message, then the message edited',
        h !== original && h.length === 2 && edited.messageId === 'm1' && edited.content[0].text === 'add a photo gallery');
    check('…its image and note kept, and the version it was sent with', edited.content[1].type === 'image-ref' && edited.content[2].text === '[note]' && edited.baseVersion === 'v1');
    check('…the conversation it replaced is left as it was, and marked left', original.length === 5 && original[1].content[0].text === 'add a gallery' && ME.wasLeft(original) && !ME.wasLeft(h));
    check('…nothing to restore: the files were still that version, so the dots never said so', s.restores.length === 0 && s.copies.length === 0 && t.dots() === '');
    check('…built from as an edit, not reverted', s.sends.length === 1 && s.sends[0].edit.messageId === 'm1' && s.sends[0].edit.reverted === false);
    check('…its turn has what the version label and analytics need', s.turn.request === 'add a photo gallery' && s.turn.files === true && s.turn.message === edited);
    check('…saved as a build waiting to go, the moment it changed', s.saves.length >= 1 && s.saves[0].interrupted === true && s.saves[0].history.length === 2);

    const msg = t.msgEl('m1');
    check('the bubble shows the new text, its image still under it',
        msg.querySelector('.message-content p').textContent === 'add a photo gallery'
        && msg.querySelector('.message-content').children.at(-1).className === 'attached-images');
    check('…no editor left', !input() && !msg.classList.contains('editing') && !box.querySelector('.message-edit-actions'));
    check('what came after it is gone, the queued messages stay',
        !box.querySelector('.ai-message') && !box.querySelector('.todo-list') && !!box.querySelector('.message-queue'));
    check('…its checklist with it', env.currentTodos === null);
    check('Copy and Edit are back under it', !!t.editBtn('m1') && !!t.copyBtn('m1'));
    check('the focus goes to the composer', dom.document.activeElement === t.composer);
}

// ---- Sending: an older message, the files changed since ----------------------------------
{
    const t = setup();
    const { env, s, ME, say, reply, call, result, dom } = t;
    say('m1', [{ type: 'text', text: 'a todo app' }, { type: 'image-ref', relativePath: 'assets/logo.png', path: '/x/assets/logo.png' }], { baseVersion: 'empty' });
    env.chatHistory.push({ role: 'assistant', content: call('write', 'w1') });
    env.chatHistory.push(result('w1'));
    reply('Built it.');
    say('m2', 'make it dark', { baseVersion: 'v1' });
    env.chatHistory.push({ role: 'assistant', content: call('edit', 'w2') });
    env.chatHistory.push(result('w2'));
    reply('Dark now.');
    env.filesAt = 'v2';
    ME.refresh();
    dom.dispatch(t.editBtn('m1'), 'click');
    check('the box says the app goes back, and where the current version stays', t.hint() === ME._internals.HINT_REVERT);
    t.input().value = 'a notes app';
    let finish;
    env.restoreResult = (v) => new Promise(r => { finish = () => { env.filesAt = v; r({ ok: true, from: 'v2' }); }; });
    dom.dispatch(t.msgEl('m1').querySelector('.message-edit-send'), 'click');
    await tick(4);
    const msg = t.msgEl('m1');
    check('while the files go back: the box closes and the bubble shows the new text',
        !t.input() && !msg.classList.contains('editing') && msg.querySelector('.message-edit-staged').textContent === 'a notes app'
        && msg.querySelector('.message-content').children.filter(c => c.tagName === 'P').every(p => !t.shown(p)));
    check('…what came after it is hidden, not gone yet', !t.shown(t.msgEl('m2')) && !t.shown(t.box.querySelector('.ai-message')) && env.chatHistory.length === 9);
    check('…and the dots say it is reverting', t.dots() === ME._internals.REVERTING);
    finish();
    await tick(6);
    check('the files go back to the version it was sent with (here, no files yet)', s.restores.length === 1 && s.restores[0] === 'empty');
    check('…the dots stay for the build, their words cleared', t.dots() === '');
    check('…its own files come back from the version left', s.copies.length === 1 && s.copies[0].v === 'v2' && s.copies[0].rels[0] === 'assets/logo.png');
    check('…the build goes as reverted', s.sends.length === 1 && s.sends[0].edit.reverted === true);
    check('…from the edited message, the later message gone with the rest',
        env.chatHistory.length === 2 && env.chatHistory[1].content[0].text === 'a notes app' && !env.chatHistory.some(m => m.messageId === 'm2'));
    check('the chat shows only the edited message now', JSON.stringify(t.ids()) === '["m1"]');
}

// ---- A message with no version on record ---------------------------------------------
{
    const t = setup();
    const { env, ME, say, reply, call, result } = t;
    say('m1', 'a todo app', { baseVersion: undefined });
    env.chatHistory.push({ role: 'assistant', content: call('write', 'w1') });
    env.chatHistory.push(result('w1'));
    reply('Built it.');
    say('m2', 'make it dark', { baseVersion: null });
    say('m3', 'add a footer', { baseVersion: 'v2' });
    ME.refresh();
    check('sent before versions were kept with messages: Copy, but no Edit', !!t.copyBtn('m1') && !t.editBtn('m1'));
    check('…nor for one whose files no version held', !!t.copyBtn('m2') && !t.editBtn('m2'));
    check('…a message with its version on record can be edited', !!t.editBtn('m3'));
    ME._internals.open('m1');
    check('…and one without can\'t be opened another way', !t.input());

    // A message just sent: Edit once its version is known.
    say('m4', 'add a header', { baseVersion: undefined });
    ME.refresh();
    check('a message whose version isn\'t known yet has no Edit', !t.editBtn('m4') && !!t.copyBtn('m4'));
    env.chatHistory.at(-1).baseVersion = 'v3';
    ME.refresh();
    check('…and gets it once it is', !!t.editBtn('m4'));
}

// ---- Sending: the files can't be put back ----------------------------------------------
{
    const t = setup();
    const { env, s, ME, say, reply, call, result, dom } = t;
    say('m1', 'a todo app', { baseVersion: 'v1' });
    env.chatHistory.push({ role: 'assistant', content: call('write', 'w1') });
    env.chatHistory.push(result('w1'));
    reply('Built it.');
    env.filesAt = 'v2';
    const original = env.chatHistory;
    ME.refresh();
    env.restoreResult = () => undefined; // refused or failed; the restore told the user
    dom.dispatch(t.editBtn('m1'), 'click');
    t.input().value = 'a notes app';
    dom.dispatch(t.msgEl('m1').querySelector('.message-edit-send'), 'click');
    await tick(8);
    check('a failed restore: nothing is built, the conversation untouched', s.sends.length === 0
        && env.chatHistory === original && !ME.wasLeft(original) && original.length === 5);
    check('…the box stays open with the edit, usable again', !!t.input() && t.input().value === 'a notes app'
        && t.input().disabled === false && t.msgEl('m1').querySelector('.message-edit-send').disabled === false && !ME.isBusy());
    check('…the reply showing again, the bubble\'s text as it was, no dots',
        t.shown(t.box.querySelector('.ai-message')) && !t.box.querySelector('.message-edit-staged')
        && !t.box.querySelector('.message-edit-hidden') && t.dots() === null);
}

// ---- Sending: called off before its turn began -------------------------------------------
{
    const t = setup();
    t.say('m1', 'hello', { baseVersion: 'v1' });
    t.ME.refresh();
    t.dom.dispatch(t.editBtn('m1'), 'click');
    let release;
    t.env.onSend = () => new Promise(r => { release = r; });
    t.input().value = 'hello there';
    t.dom.dispatch(t.msgEl('m1').querySelector('.message-edit-send'), 'click');
    await tick(6);
    check('while it goes in: busy, and sends from the composer wait', t.ME.isBusy() === true && t.ME.isOpen() === true);
    t.env.showResumeBanner('old build interrupted');
    check('…the stopped build\'s Resume banner is about what the edit took out, so it doesn\'t show', t.s.banners.length === 0);
    release();
    await tick(3);
    check('called off (the Code view couldn\'t save, say): the edited message waits with the Resume banner',
        t.s.banners.length === 1 && t.s.banners[0] === undefined && !t.ME.isBusy());
    check('…and the dots go', t.dots() === null);
    check('…the edit stays in the conversation', t.env.chatHistory.at(-1).content === 'hello there');
}
{
    // Changed project during the restore: nothing builds there.
    const t = setup();
    t.say('m1', 'hello', { baseVersion: 'v1' });
    t.env.chatHistory.push({ role: 'assistant', content: t.call('write') });
    t.env.filesAt = 'v2';
    t.ME.refresh();
    let finish;
    t.env.restoreResult = () => new Promise(r => { finish = r; });
    t.dom.dispatch(t.editBtn('m1'), 'click');
    t.input().value = 'hello there';
    t.dom.dispatch(t.msgEl('m1').querySelector('.message-edit-send'), 'click');
    await tick(4);
    t.ME.reset();
    t.env.currentChatId = 'chat2';
    t.env.chatHistory = [{ role: 'system', content: 's' }];
    finish({ ok: true, from: 'v2' });
    await tick(4);
    check('another project opened while the files went back: nothing builds there', t.s.sends.length === 0 && !t.ME.isBusy()
        && t.env.chatHistory.length === 1);
}
{
    // Busy elsewhere: Send waits, nothing changes.
    const t = setup();
    t.say('m1', 'hello');
    t.ME.refresh();
    t.dom.dispatch(t.editBtn('m1'), 'click');
    t.env._restoringVersion = true;
    t.dom.dispatch(t.msgEl('m1').querySelector('.message-edit-send'), 'click');
    await tick(3);
    check('a restore running: Send says so and the box stays', /Finishing the restore/.test(t.s.toasts.at(-1)) && !!t.input() && t.s.sends.length === 0);
    t.env._restoringVersion = false;
}
{
    // A message sent from the composer while the box was open is building:
    // Send stops it, and it leaves the chat with the rest.
    const t = setup();
    t.say('m1', 'hello', { baseVersion: 'v1' });
    t.ME.refresh();
    t.dom.dispatch(t.editBtn('m1'), 'click');
    t.say('m2', 'something else', { baseVersion: 'v1' });
    t.env.isProcessing = true;
    t.ME.turnFor('m2');
    check('another message joining leaves the box open', !!t.input());
    t.input().value = 'hello edited';
    t.dom.dispatch(t.msgEl('m1').querySelector('.message-edit-send'), 'click');
    await tick(6);
    check('Send stops that build and the edit goes', t.s.stops === 1 && t.s.sends.length === 1);
    check('…the other message leaves the chat', !t.env.chatHistory.some(m => m.messageId === 'm2') && JSON.stringify(t.ids()) === '["m1"]');
}
{
    // Empty, with no files: nothing to send.
    const t = setup();
    t.say('m1', 'hello');
    t.ME.refresh();
    t.dom.dispatch(t.editBtn('m1'), 'click');
    t.input().value = '   ';
    t.dom.dispatch(t.input(), 'input');
    check('emptied, no files: Send is off', t.box.querySelector('.message-edit-send').disabled === true);
    t.key(t.input(), 'Enter');
    check('…and Enter sends nothing', t.s.sends.length === 0);
}
{
    // A switch to another project drops the editor's state with the chat.
    const t = setup();
    t.say('m1', 'hello');
    t.ME.refresh();
    t.dom.dispatch(t.editBtn('m1'), 'click');
    t.ME.reset();
    t.box.textContent = '';
    check('after a switch nothing is open', t.ME.isOpen() === false && t.ME.holdBanner('x') === false);
    check('a conversation not left reads as such', t.ME.wasLeft([]) === false && t.ME.wasLeft(null) === false);
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
    check('the tests run with npm test', PKG.scripts.test.includes('node scripts/test-message-edit.mjs') && PKG.scripts.test.includes('node scripts/test-message-versions.mjs'));

    const stopFn = APP.slice(APP.indexOf('function stopTurnForEdit() {'), APP.indexOf('window.stopTurnForEdit = stopTurnForEdit;'));
    check('stopping for an edit counts the build as abandoned, then stops it like Stop',
        /trackBuildAbandoned\('edited'\);\s*stopActiveTurn\(\);/.test(stopFn) && !/MessageQueue|showResumeBanner/.test(stopFn));
    const banner = APP.slice(APP.indexOf('function showResumeBanner(message) {'));
    check('the Resume banner waits while the editor is open',
        banner.indexOf('window.MessageEdit?.holdBanner?.(message)') > 0 && banner.indexOf('window.MessageEdit?.holdBanner?.(message)') < banner.indexOf('clearResumeBanner();'));
    const reset = APP.slice(APP.indexOf('function resetChatUIForSwitch() {'), APP.indexOf('\n}\n', APP.indexOf('function resetChatUIForSwitch() {')));
    check('a chat switch resets it', reset.includes('window.MessageEdit?.reset?.();'));

    const dock = APP.indexOf('window.restorePublishDock?.();');
    check('loadChat draws the buttons once the conversation is drawn', dock > 0 && APP.indexOf('window.MessageEdit?.refresh?.();', dock) - dock < 300);
    check('the open chat\'s conversation can be swapped from outside', APP.includes('window.setOpenChatHistory = function (history) {'));

    const save = APP.slice(APP.indexOf('async function saveCurrentChatUnlocked('), APP.indexOf('window.savePublishedFields = async'));
    check('loadChat draws the conversation as before', !APP.includes('renderChatHistory') && !APP.includes('branches'));
    check('a save of a conversation an edit left is never written', save.includes('if (window.MessageEdit?.wasLeft?.(context.chatHistory)) return;')
        && save.indexOf('wasLeft') < save.indexOf('puter.fs.write('));

    const send = APP.slice(APP.indexOf('async function sendChatMessage('), APP.indexOf('// ---- Follow-up suggestions'));
    check('opts.edit is read (and never with a resume)', send.includes('const edit = !isResume && opts.edit && opts.edit.messageId ? opts.edit : null;'));
    check('an automatic fix waits while a message is open for editing',
        send.indexOf('if (opts.autoFix && window.MessageEdit?.isOpen?.()) return;') > 0
        && send.indexOf('if (opts.autoFix && window.MessageEdit?.isOpen?.()) return;') < send.indexOf('if (isProcessing) {'));
    check('a send from the composer waits while an edit goes in',
        send.includes('if (!edit && window.MessageEdit?.isBusy?.()) {'));
    check('an edit isn\'t a reply to a clarifying question', send.includes('if (window._activeClarification && !edit) {'));
    check('an edit takes nothing from the composer',
        send.includes('const consumedComposer = !isResume && !queued && !edit && userInput == null')
        && send.includes("const messageText = isResume || edit ? '' :"));
    check('…nor joins the queue', send.includes("!opts.resume && !opts.queued && !edit) {"));
    const check_ = send.indexOf('} else if (edit && !window.MessageEdit?.canBuild?.(chatHistory, edit.messageId)) {');
    const began = send.indexOf('edited = window.MessageEdit.editTurn(chatHistory, edit);');
    check('it checks the edited message is still the last after the setup\'s awaits',
        check_ > send.indexOf('window.GitHubSync.beforeTurn') && check_ < send.indexOf('isProcessing = true;'));
    check('…then, with no await between, its turn begins before the turn\'s context is built',
        began > send.indexOf('isProcessing = true;') && began < send.indexOf('const turnSaveContext = {')
        && !send.slice(check_, began).split('\n').some(l => !/^\s*\/\//.test(l) && /\bawait\b/.test(l)));
    check('other turns tell it they started', send.includes('window.MessageEdit?.turnStarted?.({ resume: isResume });'));
    check('a new message tells it once it is in the conversation',
        /chatHistory\.push\(\{ role: "user", content: messageContent, messageId \}\);[\s\S]{0,1500}window\.MessageEdit\?\.turnFor\?\.\(messageId\);/.test(send));

    const base = send.indexOf("const turnBase = (!isResume && !edit && !skipAddToHistory) ? window.projectVersionNow?.(currentChatId, currentAppDir) : null;");
    check('a new message\'s version is asked at turn start, before its files are saved and the AI runs',
        base > send.indexOf('window.resetTurnFileChanges?.();') && base < send.indexOf('await puter.fs.write(assetPath, a.file);')
        && base < send.indexOf('const turnSaveContext = {'));
    check('…and kept on the message once known, which brings its Edit, saved again if the turn\'s save went first',
        /const userEntry = turnSaveContext\.chatHistory\[turnSaveContext\.chatHistory\.length - 1\];\s*Promise\.resolve\(turnBase\)\.then\(\(v\) => \{\s*if \(v === undefined\) return;\s*userEntry\.baseVersion = v;[\s\S]{0,200}if \(turnSaveContext\.chatHistory === chatHistory\) window\.MessageEdit\?\.refresh\?\.\(\);\s*if \(turnSaved && !supersededSameChat\) scheduleSaveCurrentChat\(turnSaveContext\);/.test(send)
        && /if \(!supersededSameChat\) scheduleSaveCurrentChat\(turnSaveContext\);\s*turnSaved = true;/.test(send));
    check('a turn whose conversation an edit left neither snapshots nor saves it',
        /supersededSameChat = _latestTurnSeqByChat\.get\(turnChatId\) !== turnSeq\s*\|\| !!window\.MessageEdit\?\.wasLeft\?\.\(turnSaveContext\.chatHistory\);/.test(send));
    check('every turn says when it has fully unwound, for an edit to wait on',
        send.includes('const unwound = turnUnwinding();') && /GitHubSync\?\.onTurnEnd\?\.\(turnChatId, turnSeq\); \} catch \(e\) \{ \/\* never \*\/ \}\s*unwound\.done\(\);/.test(send)
        && APP.includes('window.whenTurnsUnwound = whenTurnsUnwound;'));
    const branch = send.slice(send.indexOf('} else if (edited) {'), send.indexOf('} else if (!skipAddToHistory) {'));
    check('an edit\'s turn: Build Started marked edited and reverted, the build tracked, the message counted as in',
        /window\.track\?\.\('Build Started', \{[^\n]*edited: true, reverted: !!edit\.reverted/.test(branch)
        && branch.includes('_activeBuild = { turnSeq,') && branch.includes('userMessageAppended = true;')
        && !branch.includes("'Project Created'"));
    check('…hand edits from the Code view go with it', branch.includes('window.MessageEdit.addNote(edited.message, manualEditNote);'));
    check('its version is labelled with the edited request', send.includes('const turnRequest = edited ? edited.request :'));

    check('the AI never sees a message\'s version', HELP.includes("if ('baseVersion' in msg) delete msg.baseVersion;"));
    check('a copied project forgets the original\'s versions', /for \(const m of finalHistory\) \{\s*if \(m\) delete m\.baseVersion;\s*\}/.test(APP));

    check('versions.js offers what the edit needs',
        VERSIONS.includes('window.projectVersionNow = function (chatId, appDir) {') && VERSIONS.includes('window.restoreProjectVersion = function (versionId, opts) {')
        && VERSIONS.includes('window.copyFilesFromVersion = async function (chatId, appDir, versionId, relPaths) {')
        && VERSIONS.includes("return restoreVersion(versionId, Object.assign({ skipConfirm: true, quiet: true, exact: true }, opts || {}));"));
    check('a quiet restore leaves no note in the conversation', VERSIONS.includes("if (!opts.quiet && typeof chatHistory !== 'undefined' && Array.isArray(chatHistory)) {"));

    const push = TOOLS.indexOf('content: completion.length === 1 ? completion[0] : completion,');
    const refresh = TOOLS.indexOf('window.MessageEdit?.refresh?.()', push);
    check('a round\'s calls refresh the buttons before any of them runs',
        push > 0 && refresh > push && refresh < TOOLS.indexOf('await executeFunction(toolCall.name', push));
    check('a restore and a pull from GitHub refresh them', (VERSIONS.match(/window\.MessageEdit\?\.refresh\?\.\(\);/g) || []).length === 2);
    check('so does going live with backend keys', UI.includes("appendMessage(keysNote, false);\n                // The site went live under the last message: no editing it.\n                window.MessageEdit?.refresh?.();"));

    check('styles: the bar shown on hover or focus, always on touch screens, the box, in dark mode and on phones',
        ['.message-actions {', '.message-edit-hidden { display: none !important; }', '.user-message:hover .message-actions > button,', '.message-actions:focus-within > button {',
            '.message-copy-btn.copied', '.message-edit-input {', '.message-edit-hint {',
            '.message-edit-actions {', '.message-edit-send {', '.user-message.editing .message-content > :not(.message-edit-input)',
            'html[data-theme="dark"] .message-edit-input', 'html[data-theme="dark"] .message-copy-btn'].every(c => CSS.includes(c))
        && /@media \(hover: none\), \(pointer: coarse\) \{[\s\S]*?\.message-actions > \.message-copy-btn,\s*\.message-actions > \.message-edit-btn \{ opacity: 1; \}/.test(CSS));
}

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nAll message-edit checks passed.');
