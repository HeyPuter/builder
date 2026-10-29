import fs from 'node:fs';

// ---- The message queue (js/message-queue.js) ------------------------------
// While a turn runs, the composer stays usable and what the user sends from it
// waits in a queue, drawn at the bottom of the chat as the user's own messages
// with Edit, Remove and Send now. A clean turn end sends the next queued
// message as the next turn, one per turn. Stop overrides the running turn: the
// next queued message goes in its place, and Send now does the same for its
// own message, the rest staying queued. A turn that ends on its own without
// finishing (error, retries or credits running out) sends nothing and puts
// every queued message back in the composer, ahead of what the user is
// typing, with its files and picked element. This evaluates the
// REAL module against a small jQuery stub and drives those paths, then
// text-asserts where app.js, ui.js, helpers.js and clarify.js hook into it.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '  [' + detail + ']' : '')); failures++; }
}

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const MQ = read('../src/js/message-queue.js');
const APP = read('../src/js/app.js');
const UI = read('../src/js/ui.js');
const HELP = read('../src/js/helpers.js');
const CLARIFY = read('../src/tools/chat_ui/clarify.js');
const CSS = read('../src/css/styles.css');
const INDEX = read('../src/index.html');
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

function makeEnv({ flag = true, clickToEdit = true } = {}) {
    const s = {
        composer: '', drafts: 0, sends: [], toasts: [], announces: [], revoked: [], stops: 0,
        listExists: false, listHTML: '',
        // The Send/Stop button, as updateSendButtonState draws it mid-turn.
        send: { label: 'Stop', html: 'STOP', classes: new Set() },
        quietTargets: [], clearedTargets: 0, copied: null, observed: 0,
    };
    const handlers = {};
    const list = {
        get length() { return s.listExists ? 1 : 0; },
        0: { contains: () => false },
        remove() { s.listExists = false; s.listHTML = ''; return this; },
        html(h) { s.listHTML = h; return this; },
        find() { return { eq: () => ({ find: () => ({ length: 0, first() { return this; } }) }), length: 0, index: () => -1 }; },
    };
    const none = { length: 0, remove() { return this; }, toggleClass() { return this; } };
    const box = { scrollTop: 0, scrollHeight: 500 };
    const env = {
        s, handlers,
        isProcessing: false,
        document: { activeElement: null },
        MutationObserver: class { observe() { s.observed++; } disconnect() {} },
        console: { warn() {} },
        setTimeout,
        htmlEscape, nl_to_p, send_svg: 'ARROW', stop_svg: 'STOP',
        editTargetLabel: (d) => '<code>' + htmlEscape('<' + d.tag + '>') + '</code>',
        chatBoxNearBottom: () => false,
        revokeAttachmentURL: (a) => s.revoked.push(a.name),
        applyDraftToComposer: (t) => { s.composer = t; },
        saveComposerDraft: () => { s.drafts++; },
        // A send that never claims its item models one called off during setup.
        // Tests resolve it by hand.
        sendChatMessage: (input, skip, opts) => new Promise((resolve) => { s.sends.push({ input, opts, resolve }); }),
        window: {
            FEATURE_FLAGS: { messageQueue: flag, clickToEdit },
            attachedImages: [],
            _pendingEditTarget: null,
            _activeClarification: null,
            shouldAutoScroll: false,
            isMobileViewport: () => true,
            announce: (t) => s.announces.push(t),
            showToast: (t) => s.toasts.push(t),
            stopActiveTurn() { s.stops++; env.isProcessing = false; },
            clearEditTarget() { env.window._pendingEditTarget = null; s.clearedTargets++; },
            setEditTarget(t, opts) { env.window._pendingEditTarget = t; if (opts && opts.quiet) s.quietTargets.push(t); },
            takeAttachments() { const t = env.window.attachedImages; env.window.attachedImages = []; return t; },
            returnAttachments(l) { env.window.attachedImages = l.concat(env.window.attachedImages); },
        },
    };
    env.$ = (arg) => {
        if (arg === env.document) return { on(evt, sel, fn) { handlers[evt + ' ' + sel] = fn; return this; } };
        if (arg && arg.__rowId != null) {
            return { closest: () => ({ attr: () => String(arg.__rowId) }), attr: () => arg.__action };
        }
        if (arg === '.chat-input-message') return { val: () => s.composer, focus() {}, 0: null };
        if (arg === '.chat-box') {
            return {
                length: 1, 0: box,
                children: (sel) => (sel === '.message-queue' && s.listExists ? list : none),
                append() { s.listExists = true; return this; },
            };
        }
        if (arg === '.chat-box .message-queue') return s.listExists ? list : none;
        if (arg.startsWith && arg.startsWith('<div class="message-queue"')) return list;
        if (arg === '.send') {
            return {
                length: 1,
                hasClass: (c) => s.send.classes.has(c),
                toggleClass(c, on) { if (on) s.send.classes.add(c); else s.send.classes.delete(c); return this; },
                attr(k) { if (typeof k === 'string') return s.send.label; s.send.label = k['aria-label']; return this; },
                html(h) { s.send.html = h; return this; },
            };
        }
        throw new Error('unexpected selector ' + arg);
    };
    new Function('env', 'with (env) {\n' + MQ + '\n}')(env);
    const Q = env.window.MessageQueue;
    const act = (action, id, el = {}) => handlers['click .queued-message [data-action]'].call(Object.assign(el, { __rowId: id, __action: action }));
    const queueText = (text) => { s.composer = text; return Q.enqueueFromComposer(); };
    return { env, s, Q, act, box, queueText };
}

// --- Off, idle, and the clarifying-questions card --------------------------
{
    const { env, s, Q } = makeEnv({ flag: false });
    env.isProcessing = true;
    s.composer = 'hello';
    check('flag off: a send never joins the queue', !Q.takesComposerSend() && Q.enqueueFromComposer() === false && Q._items().length === 0);
    check('flag off: Stop never sends a queued message', Q.sendNext() === false && s.sends.length === 0);
    Q.syncButton();
    check('flag off: the button stays Stop', s.send.label === 'Stop' && !s.send.classes.has('queueing'));
}
{
    const { env, s, Q } = makeEnv();
    s.composer = 'hello';
    check('no turn running: a send is a normal send', !Q.takesComposerSend() && Q.enqueueFromComposer() === false);
    env.isProcessing = true;
    env.window._activeClarification = {};
    check('a clarifying-questions card takes the send as its answer', !Q.takesComposerSend());
    Q.syncButton();
    check('…and the button is left as the card draws it', s.send.label === 'Stop' && !s.send.classes.has('queueing'));
    env.window._activeClarification = null;
    s.composer = '   ';
    check('an empty composer queues nothing', Q.enqueueFromComposer() === false && Q._items().length === 0);
}

// --- Queueing ---------------------------------------------------------------
{
    const { env, s, Q, box } = makeEnv();
    env.isProcessing = true;
    s.composer = '';
    Q.syncButton();
    check('mid-turn with an empty composer: the button is Stop', s.send.label === 'Stop' && s.send.html === 'STOP');
    s.composer = '  make the header <b>blue</b>\n\nand bold  ';
    Q.syncButton();
    check('mid-turn with text: Stop turns into the queue arrow (one button, not two)',
        s.send.label === 'Queue message' && s.send.html === 'ARROW' && s.send.classes.has('queueing'));

    const drafts = s.drafts;
    check('Enter mid-turn queues', Q.takesComposerSend() && Q.enqueueFromComposer() === true);
    const [a] = Q._items();
    check('the queued text is trimmed', a && a.text === 'make the header <b>blue</b>\n\nand bold');
    check('the composer is emptied', s.composer === '');
    check('the draft is saved (it now holds the queued text)', s.drafts === drafts + 1);
    check('it shows in the chat as a message', s.listExists && s.listHTML.includes('queued-message-bubble'));
    check('…with its paragraphs, escaped', s.listHTML.includes('<p>make the header &lt;b&gt;blue&lt;/b&gt;</p><p>and bold</p>'));
    check('…marked Queued', s.listHTML.includes('Queued'));
    check('…with Edit, Remove and Send now, and no Copy or shortcut hint',
        ['edit', 'remove', 'send-now'].every(x => s.listHTML.includes(`data-action="${x}"`))
        && !s.listHTML.includes('data-action="copy"') && !s.listHTML.includes('<kbd>'));
    check('the chat scrolls to it', box.scrollTop === box.scrollHeight && env.window.shouldAutoScroll === true);
    check('it is kept below what the turn adds', s.observed === 1);
    check('screen readers hear it was queued', s.announces.some(t => /queued/i.test(t)));
    check('…and is Stop again with the box empty', s.send.label === 'Stop' && s.send.html === 'STOP' && !s.send.classes.has('queueing'));

    env.window.attachedImages = [{ name: 'shot.png', type: 'image/png', blobURL: 'blob:x/1' }, { name: 'notes.pdf', type: 'application/pdf' }];
    env.window._pendingEditTarget = { tag: 'button' };
    s.composer = 'also this';
    Q.enqueueFromComposer();
    const b = Q._items()[1];
    check('a queued message takes the tray files', b.attachments.length === 2 && env.window.attachedImages.length === 0);
    check('…and the picked element', b.editTarget && b.editTarget.tag === 'button' && env.window._pendingEditTarget === null && s.clearedTargets === 1);
    check('…and shows them like a sent message does', s.listHTML.includes('<img src="blob:x/1" alt="shot.png" class="message-image">')
        && s.listHTML.includes('📄 notes.pdf') && s.listHTML.includes('Editing <code>&lt;button&gt;</code>'));

    env.window.attachedImages = [{ name: 'a.pdf' }];
    s.composer = '';
    Q.enqueueFromComposer();
    const c = Q._items()[2];
    check('files alone can be queued', Q._items().length === 3 && c.text === '');

    check('the draft is the queued text, then what is typed',
        Q.withQueuedText('still typing') === 'make the header <b>blue</b>\n\nand bold\n\nalso this\n\nstill typing');
    check('…whitespace-only typing adds nothing', Q.withQueuedText('  \n') === 'make the header <b>blue</b>\n\nand bold\n\nalso this');
}
{
    const { env, s, Q } = makeEnv();
    env.isProcessing = true;
    s.composer = 'click me';
    Q.syncButton();
    check('clicking the arrow queues the message', Q.handleSendClick() === true && Q._items().length === 1 && s.composer === '');
    Q.syncButton();
    check('…the button is Stop again', s.send.label === 'Stop');
    check('…and a quick second click does not stop the build', Q.handleSendClick() === true && Q._items().length === 1);
    env.isProcessing = false;
    Q.syncButton();
    check('when the turn ends the arrow state is dropped', !s.send.classes.has('queueing'));
}
{
    const { env, s, Q } = makeEnv();
    env.isProcessing = true;
    Q.syncButton();
    check('a click on Stop is left to sendChatMessage', Q.handleSendClick() === false);
}
{
    const { Q } = makeEnv();
    check('with nothing queued the draft is exactly the typed text', Q.withQueuedText('  hi \n') === '  hi \n');
}

// --- A clean finish sends the next one, one per turn ------------------------
{
    const { env, s, Q, queueText } = makeEnv();
    env.isProcessing = true;
    queueText('first');
    queueText('second');
    env.isProcessing = false;

    check('afterTurn with nothing queued sends nothing', makeEnv().Q.afterTurn(true) === false);
    check('a clean finish sends the next queued message', Q.afterTurn(true) === true && s.sends.length === 1);
    const first = s.sends[0];
    check('…as a queued send (its own text, not the composer)', first.input === null && first.opts.queued && first.opts.queued.text === 'first');
    check('…one at a time: the second still waits', Q._items().length === 2 && Q._items()[1].text === 'second');
    check('the one setting up is shown as sending, without actions',
        /queued-message sending[^>]*>[\s\S]*?Sending…<\/span><\/div><\/div>/.test(s.listHTML));
    check('…and stays in the draft until the send claims it', Q.withQueuedText('') === 'first\n\nsecond');
    check('a send from the composer during that setup joins the queue', queueText('third') && Q._items().length === 3);

    check('the send claims it when its turn starts', Q.claim(first.opts.queued) === true);
    check('…then it leaves the draft', Q.withQueuedText('') === 'second\n\nthird');
    check('…and a second claim fails', Q.claim(first.opts.queued) === false);

    env.isProcessing = true; // that turn runs
    first.resolve();
    await tick();
    check('a claimed send ending puts nothing back', s.composer === '' && Q._items().length === 2);
    env.isProcessing = false;
    Q.afterTurn(true);
    check('its clean finish sends the next', s.sends.length === 2 && s.sends[1].opts.queued.text === 'second');
}

// --- Send now ---------------------------------------------------------------
{
    const { env, s, Q, act, queueText } = makeEnv();
    env.isProcessing = true;
    queueText('one');
    queueText('two');
    queueText('three');
    const two = Q._items()[1];
    act('send-now', two.id);
    check('Send now stops the running turn', s.stops === 1);
    check('…and sends that message straight away', s.sends.length === 1 && s.sends[0].opts.queued === two);
    check('…the rest stay queued, in order', Q._items().map(i => i.text).join() === 'two,one,three');
    // The stopped turn unwinds while the sent-now message sets up.
    check('the stopped turn\'s end leaves the queue alone (no Resume banner, nothing back in the box)',
        Q.afterTurn(false) === true && s.composer === '' && s.toasts.length === 0 && Q._items().length === 3);
    act('send-now', Q._items()[2].id);
    check('Send now while one is still setting up puts it next in line', s.sends.length === 1 && s.stops === 1
        && Q._items().map(i => i.text).join() === 'two,three,one');
    Q.claim(two);
    env.isProcessing = true;
    s.sends[0].resolve();
    await tick();
    env.isProcessing = false;
    Q.afterTurn(true);
    check('…and goes when that turn finishes', s.sends[1].opts.queued.text === 'three');
}

// --- A queued send called off before its turn starts ------------------------
{
    const { env, s, Q, queueText } = makeEnv();
    env.isProcessing = true;
    env.window.attachedImages = [{ name: 'q.png' }];
    queueText('one');
    queueText('two');
    env.isProcessing = false;
    env.window.attachedImages = [{ name: 'typed.png' }];
    s.composer = 'typed later';
    Q.afterTurn(true);
    s.sends[0].resolve(); // never claimed: a publish started, the Code view could not save…
    await tick();
    check('a called-off send puts everything back in the composer, oldest first, ahead of the typed text',
        s.composer === 'one\n\ntwo\n\ntyped later', JSON.stringify(s.composer));
    check('…its files go to the front of the tray', env.window.attachedImages.map(a => a.name).join() === 'q.png,typed.png');
    check('…and the queue is empty', Q._items().length === 0 && !s.listExists);
}

// --- Stop overrides what Puter is doing ------------------------------------
{
    const { env, s, Q, queueText } = makeEnv();
    env.isProcessing = true;
    queueText('first');
    queueText('second');
    s.composer = 'typing';
    // sendChatMessage's Stop branch has stopped the turn by now.
    env.isProcessing = false;
    check('Stop with messages queued sends the next one', Q.sendNext() === true && s.sends.length === 1
        && s.sends[0].opts.queued.text === 'first');
    check('…the rest stay queued and the box is untouched', Q._items().map(i => i.text).join() === 'first,second'
        && s.composer === 'typing' && s.toasts.length === 0);
    check('…and the stopped turn\'s end leaves the queue alone (no Resume banner)', Q.afterTurn(false) === true
        && Q._items().length === 2 && s.composer === 'typing');
    check('a second Stop while it sets up sends nothing more', Q.sendNext() === false && s.sends.length === 1);
}
{
    const { Q, s } = makeEnv();
    check('Stop with nothing queued is a plain stop', Q.sendNext() === false && s.sends.length === 0);
}

// --- Errors and running out send nothing more -------------------------------
{
    const { env, s, Q, queueText } = makeEnv();
    env.isProcessing = true;
    env.window._pendingEditTarget = { tag: 'h1' };
    queueText('one');
    queueText('two');
    s.composer = 'typing';
    env.isProcessing = false;
    check('an unclean finish sends nothing', Q.afterTurn(false) === false && s.sends.length === 0);
    check('…and puts the queue back ahead of the typed text', s.composer === 'one\n\ntwo\n\ntyping', JSON.stringify(s.composer));
    check('…bringing the picked element back quietly', s.quietTargets.length === 1 && s.quietTargets[0].tag === 'h1');
    check('…and says so', s.toasts.length === 1 && /2 queued messages are back in the box/.test(s.toasts[0]));
    check('…in plain sentences', !/[:;]/.test(s.toasts[0]));
}
{
    const { env, s, Q, queueText } = makeEnv();
    env.isProcessing = true;
    env.window._pendingEditTarget = { tag: 'h1' };
    queueText('one');
    env.window._pendingEditTarget = { tag: 'footer' }; // picked for the message being typed
    Q.returnAll({ notify: true });
    check('returnAll puts it back', s.composer === 'one' && Q._items().length === 0);
    check('…without replacing an element picked since', env.window._pendingEditTarget.tag === 'footer' && s.quietTargets.length === 0);
    check('…saying it is back (one message)', s.toasts[0] === 'Your queued message is back in the box.');
    Q.returnAll({ notify: true });
    check('…and with nothing queued says nothing', s.toasts.length === 1);
    // An attachment-only composer send handed back has no text to return.
    const drafts = s.drafts;
    s.composer = 'kept';
    Q.returnToComposer([{ text: '' }]);
    check('handing back nothing leaves the composer and the draft alone', s.composer === 'kept' && s.drafts === drafts);
}

// --- Remove, edit, switch ----------------------------------------------------
{
    const { env, s, Q, act, queueText } = makeEnv();
    env.isProcessing = true;
    env.window.attachedImages = [{ name: 'gone.png' }];
    queueText('drop me');
    queueText('fix me');
    const [drop, fix] = Q._items();
    const drafts = s.drafts;
    act('remove', drop.id);
    check('Remove takes the message out', Q._items().length === 1 && Q._items()[0].id === fix.id);
    check('…frees its files', s.revoked.includes('gone.png'));
    check('…and saves the draft without it', s.drafts === drafts + 1);
    s.composer = 'new words';
    act('edit', fix.id);
    check('Edit moves the message back to the composer, ahead of the typed text',
        Q._items().length === 0 && s.composer === 'fix me\n\nnew words' && !s.listExists);
}
{
    const { env, s, Q, queueText } = makeEnv();
    env.isProcessing = true;
    env.window.attachedImages = [{ name: 'x.png' }];
    queueText('leaving');
    const drafts = s.drafts;
    Q.reset();
    check('a project switch empties the queue', Q._items().length === 0 && !s.listExists);
    check('…frees its files', s.revoked.includes('x.png'));
    check('…and leaves the leaving project\'s draft and the composer alone', s.drafts === drafts && s.composer === '');
    env.isProcessing = false;
    check('…and nothing is sent afterwards', Q.afterTurn(true) === false && s.sends.length === 0);
}
{
    // A switch during a queued send's setup: the send finds its item gone.
    const { env, s, Q, queueText } = makeEnv();
    env.isProcessing = true;
    queueText('one');
    env.isProcessing = false;
    Q.afterTurn(true);
    const item = s.sends[0].opts.queued;
    Q.reset();
    check('a send whose queue was reset cannot claim it', Q.claim(item) === false);
    s.sends[0].resolve();
    await tick();
    check('…and nothing comes back into the arriving project\'s composer', s.composer === '');
}

// --- The composer draft carries the queue -----------------------------------
{
    const a = APP.indexOf('// ===== composer-drafts (start) =====');
    const b = APP.indexOf('// ===== composer-drafts (end) =====');
    const BLOCK = APP.slice(a, b).replace(/^let (_\w+) = [^;]+;/gm, '');
    const store = new Map();
    const input = { value: 'typed' };
    const env = {
        localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v), removeItem: k => store.delete(k) },
        window: { user: { username: 'nj', is_temp: true }, addEventListener() {}, MessageQueue: { withQueuedText: t => 'queued\n\n' + t, syncButton() {} } },
        document: { visibilityState: 'visible', addEventListener() {} },
        Date, setTimeout, clearTimeout, console,
        _draftSeq: 0, _composerRestoredFromKey: null, _cloudDraftPending: null, _cloudDraftChain: Promise.resolve(), _cloudDraftWarned: false,
        currentChatId: 'chat-1', chatHistory: [{ role: 'system' }], savedChats: [], isProcessing: true, attachedImages: [],
        autoResizeTextarea() {},
    };
    env.$ = (sel) => {
        if (sel === env.document) return { on() { return this; } };
        if (sel === '.chat-input-message') return { length: 1, 0: input, val: (v) => (v === undefined ? input.value : (input.value = v)) };
        if (sel === '.send') return { prop() { return this; } };
        throw new Error('unexpected selector ' + sel);
    };
    const x = new Function('env', 'with (env) {\n' + BLOCK + '\nreturn { saveComposerDraft, composerDraftContext };\n}')(env);
    check('a turn running in the open chat makes it a project for the draft (no first-turn text under home)',
        x.composerDraftContext() === 'chat-1');
    x.saveComposerDraft();
    const saved = JSON.parse(store.get('composerDraft:nj:chat-1') || 'null');
    check('saveComposerDraft stores the queued text ahead of the typed text', saved && saved.t === 'queued\n\ntyped', JSON.stringify(saved));
    env.isProcessing = false;
    check('…and with no turn and no history the landing stays home', x.composerDraftContext() === 'home');
}

// --- Where the app hooks in --------------------------------------------------
function fnSlice(src, header) {
    const i = src.indexOf(header);
    if (i < 0) return '';
    const j = src.slice(i + header.length).search(/\n(?:async )?function |\nconst /);
    return j < 0 ? src.slice(i) : src.slice(i, i + header.length + j);
}
{
    const send = fnSlice(APP, 'async function sendChatMessage(');
    check('Stop stops the turn, then sends the next queued message, or offers Resume when none is queued',
        /if \(isProcessing\) \{\s*(?:trackBuildAbandoned\('stopped'\);\s*)?stopActiveTurn\(\);[\s\S]{0,300}?if \(window\.MessageQueue\?\.sendNext\?\.\(\)\) return;[\s\S]*?showResumeBanner\(\);\s*return;/.test(send));
    const stop = fnSlice(APP, 'function stopActiveTurn(');
    check('stopActiveTurn marks, aborts and frees the composer, for Stop and Send now alike',
        /activeTurnInterrupted = true;[\s\S]*abortController\.abort\(\);[\s\S]*resetUIForAbort\(\);/.test(stop)
        && APP.includes('window.stopActiveTurn = stopActiveTurn;'));
    check('a send during a queued message\'s setup joins the queue instead of being dropped',
        /if \(_sendSetupInFlight\) \{\s*if \(userInput == null && chat_input_message == null && !opts\.resume && !opts\.queued\) \{\s*window\.MessageQueue\?\.enqueueFromComposer\?\.\(\);/.test(send));
    check('a queued send claims its message where a composer send consumes the composer',
        /\} else if \(queued && !window\.MessageQueue\?\.claim\?\.\(queued\)\) \{[\s\S]{0,400}?_sendSetupInFlight = false;[\s\S]{0,200}?return;/.test(send)
        && send.indexOf('window.MessageQueue?.claim?.(queued)') < send.indexOf('isProcessing = true;'));
    check('a queued send abandoned before its message lands goes back to the composer',
        /if \(!isResume && \(consumedComposer \|\| queued\) && !turnAppended[^)]*\) \{[\s\S]{0,200}?window\.MessageQueue\?\.returnToComposer\?\.\(\[queued \|\| \{ text: messageText \}\]\);/.test(send));
    const superseded = send.indexOf('if (supersededInChat) return;');
    const after = send.indexOf('window.MessageQueue?.afterTurn?.(');
    check('the queue moves on only after the turn has fully ended, and only if no newer one started',
        superseded > 0 && after > superseded && send.indexOf('const sendingQueued = turnChatId === currentChatId && !isProcessing') > superseded);
    check('…a credits-limited finish counts as unclean', send.includes('afterTurn?.(turnSucceeded && !(context && context.usageLimited))'));
    check('a turn stopped by Send now offers no Resume', /if \(turnSaveContext\.interrupted && turnChatId === currentChatId && !isProcessing && !sendingQueued\) \{\s*showResumeBanner\(\);/.test(send));
    check('the turn start leaves the composer to lockComposerForTurn',
        send.includes('lockComposerForTurn();') && !send.includes("$('.chat-input-message').prop('disabled', true)"));
    check('Build Started marks queued sends', send.includes('...(queued && { queued: true })'));

    const sw = fnSlice(APP, 'function resetChatUIForSwitch(');
    check('a project switch empties the queue', sw.includes('window.MessageQueue?.reset?.();'));
    check('the tray hand-off helpers are exposed', APP.includes('window.takeAttachments = takeAttachments;') && APP.includes('window.returnAttachments = returnAttachments;'));
}
{
    const keydown = UI.slice(UI.indexOf("$(document).on('keydown', '.chat-input-message'"), UI.indexOf("$(document).on('click', '.app'"));
    const route = keydown.indexOf('window.MessageQueue?.takesComposerSend?.()');
    check('Enter (with or without Cmd/Ctrl) mid-turn queues and never clicks Stop',
        route > 0 && route < keydown.indexOf("$('.send').click();")
        && /takesComposerSend\?\.\(\)\) \{\s*window\.MessageQueue\.enqueueFromComposer\(\);\s*return;/.test(keydown)
        && !keydown.includes('sendNowFromComposer'));
    check('there is no second button beside Send/Stop', !UI.includes('queue-send') && !CSS.includes('queue-send'));
    check('the Send button\'s click goes through the queue first',
        /\$\(document\)\.on\('click', '\.send', async function\(e\) \{[\s\S]{0,200}?if \(window\.MessageQueue\?\.handleSendClick\?\.\(\)\) return;\s*await sendChatMessage\(\);/.test(UI));
    check('setEditTarget can restore an element quietly', /window\.setEditTarget = function\(d, \{ quiet = false \} = \{\}\)/.test(UI) && UI.includes('if (quiet) return;'));
    const lock = fnSlice(HELP, 'function lockComposerForTurn(');
    check('with the queue on the composer stays open mid-turn', /if \(window\.MessageQueue\?\.enabled\?\.\(\)\) \{[\s\S]*?prop\('disabled', false\)[\s\S]*?return;/.test(lock));
    check('the clarify card restores the turn composer the same way', fnSlice(CLARIFY, '    function restoreProcessingComposer(').includes('lockComposerForTurn();')
        && !/prop\('disabled', true\)/.test(CLARIFY));
    check('the flag is on', /messageQueue: true,/.test(HELP));
    check('the module loads after app.js', VITE.indexOf("'js/message-queue.js'") > VITE.indexOf("'js/app.js'"));
    check('npm test runs this file', PKG.scripts.test.includes('scripts/test-message-queue.mjs'));
}

// --- A stopped turn unwinding under the next one -----------------------------
// Stop with messages queued starts the next turn at once, while the stopped
// one may still be uploading or giving up its request.
{
    const send = fnSlice(APP, 'async function sendChatMessage(');
    check('a stopped turn that throws after a newer one started shows no error card in it',
        send.includes('if (!shouldStop && !activeTurnInterrupted && turnChatId === currentChatId && turnSeq === _turnSeq) {'));
    check('…and leaves the newer turn\'s dots alone', /if\(spinner && turnSeq === _turnSeq\)\s*spinner\.remove\(\);/.test(send));
    check('its unsent message comes back even when a newer turn has started',
        send.includes('if (!isResume && (consumedComposer || queued) && !turnAppended && turnChatId === currentChatId) {')
        && send.includes('if (turnSeq === _turnSeq) clearResumeBanner();'));
    check('a clarify reply keeps queued messages in the draft',
        /if \(window\.MessageQueue\?\.withQueuedText\?\.\(''\)\) saveComposerDraft\(\);\s*else clearComposerDraft\(\);/.test(send));
    const snap = send.indexOf('const preAuthEditTarget = window._pendingEditTarget || null;');
    check('a send takes its picked element when it starts, like its text and files',
        snap > 0 && snap < send.indexOf('await ensureAuthenticated();')
        && send.includes('if (consumedComposer && window._pendingEditTarget === preAuthEditTarget) window.clearEditTarget?.();'));
}
{
    // clearAllAttachments({ only }) leaves files attached during the send.
    const a = APP.indexOf('function clearAllAttachments(opts) {');
    const b = APP.indexOf('\n}\n', a) + 3;
    const env = { attachedImages: [], window: {}, revoked: [], timers: 0 };
    const fn = new Function('env', `with (env) {\n${APP.slice(a, b)}\nreturn clearAllAttachments;\n}`)(Object.assign(env, {
        updateAttachmentDisplay() {},
        revokeAttachmentURL: (x) => env.revoked.push(x.name),
        setTimeout: (f) => { env.timers++; f(); },
    }));
    const sent = { name: 'sent.png' };
    const later = { name: 'later.png' };
    env.attachedImages = [sent, later];
    fn({ deferRevoke: true, only: [sent] });
    check('a send clears only the files it sent from the tray',
        env.attachedImages.length === 1 && env.attachedImages[0] === later && env.window.attachedImages === env.attachedImages);
    check('…revoking only theirs, after the delay', env.revoked.join() === 'sent.png' && env.timers === 1);
    fn();
    check('a plain Clear still empties the tray', env.attachedImages.length === 0 && env.revoked.join() === 'sent.png,later.png');
}

// --- Stop is a stop button ---------------------------------------------------
check('the running-turn button shows a stop square, not pause',
    /window\.stop_svg = '<svg[^']*<path d="M5 1h14/.test(INDEX) && !INDEX.includes('pause_svg')
    && HELP.includes('.html(processing ? stop_svg : send_svg)'));
check('…on the same plate as Send, not red', !/\.send\.processing\s*\{/.test(CSS) && !CSS.includes('#d64242'));

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll message-queue checks passed.');
