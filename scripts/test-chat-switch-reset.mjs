import fs from 'node:fs';

// ---- Regression guard for the chat-switch composer reset -------------------
// Everything the user has STAGED in the composer belongs to the project they
// staged it in: the unsent text (swapped per project by restoreComposerDraft),
// the click-to-edit target, and the attachment tray.
//
// new_chat() emptied the tray; loadChat() did not — it only ran
// resetChatUIForSwitch(), which left it alone. So files attached in project A
// followed the user into project B, and the next send there wrote A's files
// into B's assets/ and described them to the model as B's attachments.
//
// Both switch paths run resetChatUIForSwitch(), so that is where the tray is
// emptied. This evaluates the REAL function sliced out of app.js against stubs
// and asserts it, plus the ordering the Send button depends on.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');

// --- Slice + evaluate the REAL resetChatUIForSwitch --------------------------
const a = APP.indexOf('function resetChatUIForSwitch() {');
if (a < 0) throw new Error('could not find resetChatUIForSwitch in app.js');
const b = APP.indexOf('\n}\n', a);
if (b <= a) throw new Error('could not delimit resetChatUIForSwitch');
const block = APP.slice(a, b + 3);

function run(seed) {
    const calls = [];
    const tray = seed.tray.slice();
    // Chainable jQuery stub: every call is recorded, nothing else happens.
    const chain = new Proxy(function () {}, {
        get: (t, k) => (k === 'length' ? 0 : () => chain),
        apply: () => chain,
    });
    const $ = () => chain;
    const win = {
        currentTodos: ['stale'],
        attachedImages: tray,
        clearEditTarget: () => calls.push('clearEditTarget'),
        _activeClarification: { teardown: () => calls.push('clarifyTeardown') },
        _autoFixTurns: 7,
    };
    const stubs = `
        let isProcessing = seed.isProcessing, shouldStop = seed.shouldStop, abortController = seed.abortController;
        const clearContinueSuggestions = () => calls.push('clearContinueSuggestions');
        const clearResumeBanner = () => calls.push('clearResumeBanner');
        const clearRetryStatus = () => calls.push('clearRetryStatus');
        const updateSendButtonState = (p) => calls.push('updateSendButtonState');
        const clearAllAttachments = () => { calls.push('clearAllAttachments'); tray.length = 0; };
    `;
    const fn = new Function('$', 'window', 'seed', 'calls', 'tray',
        stubs + block + '\nreturn function () { resetChatUIForSwitch(); return { isProcessing, shouldStop, abortController }; };'
    )($, win, seed, calls, tray);
    const after = fn();
    return { calls, tray, after, win };
}

const seed = { tray: [{ name: 'mockup.png' }, { name: 'notes.txt' }], isProcessing: true, shouldStop: true, abortController: {} };
const r = run(seed);

// === The tray is emptied ===================================================
check('the attachment tray is emptied on a chat switch', r.calls.includes('clearAllAttachments'));
check('no staged file survives the switch', r.tray.length === 0);

// === …before the Send button is recomputed =================================
// updateSendButtonState treats "has an attachment" as sendable, so recomputing
// it while the tray still held the previous project's files would leave Send
// lit for a composer that is actually empty.
check('the tray is emptied before the Send button is recomputed',
    r.calls.indexOf('clearAllAttachments') < r.calls.indexOf('updateSendButtonState'));

// === The rest of the reset is untouched ====================================
check('the click-to-edit target is still dropped', r.calls.includes('clearEditTarget'));
check('the suggestion chips are still dropped', r.calls.includes('clearContinueSuggestions'));
check('the resume banner is still dropped', r.calls.includes('clearResumeBanner'));
check('the retry status is still dropped', r.calls.includes('clearRetryStatus'));
check('the Send button is still recomputed', r.calls.includes('updateSendButtonState'));
check('a stale clarifying-questions card is still torn down', r.calls.includes('clarifyTeardown'));
check('the checklist state is cleared', r.win.currentTodos === null);
check('the auto-fix budget is reset', r.win._autoFixTurns === 0);
check('processing flags are cleared', r.after.isProcessing === false && r.after.shouldStop === false);
check('the aborted turn controller is released', r.after.abortController === null);

// === Both switch paths go through it =======================================
const loadChat = APP.slice(APP.indexOf('async function loadChat('), APP.indexOf('async function deleteChat('));
check('loadChat runs the shared reset', /\bresetChatUIForSwitch\(\)/.test(loadChat));
const newChat = APP.slice(APP.indexOf('function new_chat('), APP.indexOf('function isAborted('));
check('new_chat runs the shared reset', /\bresetChatUIForSwitch\(\)/.test(newChat));
// …and no longer needs a clear of its own (one owner, so the two can't drift).
check('new_chat no longer clears the tray separately', !/clearAllAttachments\(\)/.test(newChat));

// The open chat's draft address must switch with the chat itself. It was only
// set by showAppPreview at the END of loadChat, so a save of the newly-open
// chat landing in between (after the media URL awaits) stamped the previous
// project's preview address onto it.
{
    const becomesCurrent = loadChat.indexOf('currentChatId = chatId;');
    const previewSet = loadChat.indexOf('window.currentPreviewUrl = chat.previewUrl || null;');
    const firstAwaitAfter = loadChat.indexOf('await ', becomesCurrent);
    check('loadChat sets the draft address as soon as the chat is current (before any await)',
        becomesCurrent > 0 && previewSet > becomesCurrent && previewSet < firstAwaitAfter, `${becomesCurrent} ${previewSet} ${firstAwaitAfter}`);
}

// A send must not start while a project is still being opened: loadChat
// clears the processing flags before its file download and installs the
// project only after it, so a Send in that window started a turn against the
// project being LEFT. Its end-of-turn reset then bailed as stale and the opened
// project was left with a disabled composer, a Stop button and a Resume banner.
{
    const send = APP.slice(APP.indexOf('async function sendChatMessage('), APP.indexOf('const turnSeq = ++_turnSeq;'));
    const gate = send.indexOf('if (_loadChatSeq !== _loadChatSettledSeq) {');
    const setup = send.indexOf('_sendSetupInFlight = true;');
    const stop = send.indexOf('if (isProcessing) {');
    check('sendChatMessage refuses while a project load is in flight', gate > 0 && gate < setup, `${gate} ${setup}`);
    check('…but Stop still works during a load (the gate sits after the Stop branch)', stop > 0 && stop < gate, `${stop} ${gate}`);
    check('the refusal says why', /send-blocked-loading/.test(send.slice(gate, setup)));
    // new_chat disowns any load in flight by bumping the load counter; it must
    // settle it too, or the landing it opens would refuse every send.
    const bump = newChat.indexOf('_loadChatSeq++;');
    const settle = newChat.indexOf('_loadChatSettledSeq = _loadChatSeq;');
    check('new_chat settles the load counter it bumps', bump > 0 && settle > bump, `${bump} ${settle}`);
    // …and loadChat settles it on every exit, so the gate can never stick.
    const settles = (loadChat.match(/_loadChatSettledSeq = Math\.max\(_loadChatSettledSeq, seq\)/g) || []).length;
    check('loadChat settles the counter on success, failure and supersession', settles >= 3, String(settles));
}

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll chat-switch reset checks passed.');
