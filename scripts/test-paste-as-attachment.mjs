import fs from 'node:fs';

// ---- A long text paste becomes a "Pasted text" card ------------------------
// Pasting a log, a spec or a file's contents used to fill the composer with a
// wall of text. Past a size (isLongPaste in ui.js) the paste goes in the tray
// as a card instead (attachPastedText in dragdrop.js). It is no file: it is
// never saved to assets/, and the model still gets the text inline, labelled
// as pasted (prepareHistoryForAI in helpers.js). Short pastes stay ordinary
// text. Evaluates the real functions; text-asserts the send path's wiring.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const UI = read('../src/js/ui.js');
const DD = read('../src/js/dragdrop.js');
const APP = read('../src/js/app.js');
const HELP = read('../src/js/helpers.js');
const PKG = JSON.parse(read('../package.json'));

const slice = (src, start, end) => {
    const a = src.indexOf(start);
    const b = src.indexOf(end, a);
    if (a < 0 || b < 0) throw new Error('could not find ' + start);
    return src.slice(a, b);
};

// ---- isLongPaste ----------------------------------------------------------
const isLongPaste = new Function('window',
    slice(UI, 'const LONG_PASTE_CHARS', 'window.isLongPaste = isLongPaste;') + '\nreturn isLongPaste;')({});

check('a sentence stays inline', isLongPaste('make the header blue') === false);
check('blank text stays inline', isLongPaste('\n\n   \n'.repeat(50)) === false);
check('2000+ characters on one line is long', isLongPaste('x'.repeat(2000)) === true);
check('1999 characters on a few lines is not', isLongPaste('x'.repeat(1990) + '\n'.repeat(9)) === false);
check('30 short lines is long', isLongPaste(Array.from({ length: 30 }, (_, i) => 'l' + i).join('\n')) === true);
check('29 short lines is not', isLongPaste(Array.from({ length: 29 }, (_, i) => 'l' + i).join('\n')) === false);
check('non-strings are not', isLongPaste(null) === false && isLongPaste(undefined) === false);

// ---- The paste handler ----------------------------------------------------
const handler = slice(UI, "$(document).on('paste', '.chat-input-message'", '\n});\n');
check('files still go to the file intake (unless it is a rich-text copy)',
    /files && files\.length && !isRichTextCopy\(cd, files\)[\s\S]*handleDroppedFiles\(files\)/.test(handler));
check('a long text paste is taken over and attached',
    /isLongPaste\(text\)[\s\S]*e\.preventDefault\(\);\s*window\.attachPastedText\(text\)/.test(handler));
check('a read-only composer takes no pasted card',
    /if \(this\.readOnly \|\| this\.disabled\) return;[\s\S]*isLongPaste\(text\)/.test(handler));
check('a short paste is left to the browser',
    /if \(!isLongPaste\(text\)[^\n]*\) return;/.test(handler));

// ---- attachPastedText -----------------------------------------------------
function makeTray() {
    const env = { alerts: [], toasts: [], renders: 0, announced: [] };
    const win = {
        attachedImages: [],
        announce: (t) => env.announced.push(t),
        showToast: (msg) => env.toasts.push(msg),
        updateAttachmentDisplay: () => { env.renders++; },
    };
    const puter = { ui: { alert: (m) => { env.alerts.push(m); return Promise.resolve(); } } };
    const src = 'const MAX_ATTACHMENTS = 50;\nlet nextAttachmentId = 1;\n'
        + slice(DD, 'function attachPastedText(text) {', 'window.attachPastedText = attachPastedText;')
        + '\nreturn attachPastedText;';
    const attach = new Function('window', 'puter', src)(win, puter);
    return { win, env, attach };
}

{
    const { win, env, attach } = makeTray();
    const text = 'line\n'.repeat(40);
    check('a paste is attached', attach(text) === true && win.attachedImages.length === 1);
    const a = win.attachedImages[0];
    check('the card carries the text, named "Pasted text"', a.pastedText === text && a.name === 'Pasted text' && a.type === 'text/plain');
    check('it is not a file (nothing to save to assets/)', !('file' in a) && !('blobURL' in a));
    check('its size is the UTF-8 byte count', a.size === new Blob([text]).size);
    check('the tray is redrawn', env.renders === 1);
    check('a screen reader hears that the paste became a card', env.announced[0] === 'Long paste attached as Pasted text.');

    check('the same text twice is not attached again', attach(text) === false && win.attachedImages.length === 1 && env.toasts.length === 1);

    attach('other\n'.repeat(40));
    check('a second paste is numbered', win.attachedImages[1].name === 'Pasted text 2');
    check('ids are distinct', win.attachedImages[0].id !== win.attachedImages[1].id);

    win.attachedImages.splice(0, 1);
    attach('third\n'.repeat(40));
    attach('fourth\n'.repeat(40));
    check('a new paste takes the lowest free name, never a taken one',
        win.attachedImages.map(a => a.name).join('|') === 'Pasted text 2|Pasted text|Pasted text 3',
        win.attachedImages.map(a => a.name).join('|'));
}
{
    const { win, env, attach } = makeTray();
    for (let i = 0; i < 50; i++) win.attachedImages.push({ name: 'f' + i, id: 1000 + i });
    check('a full tray refuses the paste and says why', attach('x'.repeat(3000)) === false && env.alerts.length === 1);
}

// ---- What the model gets --------------------------------------------------
{
    const a = HELP.indexOf('function prepareHistoryForAI(');
    const b = HELP.indexOf('/**\n * Sum the AI-reported cost');
    const { prepareHistoryForAI } = new Function('window',
        HELP.slice(a, b) + '\nreturn { prepareHistoryForAI };')({});
    const history = [
        { role: 'system', content: 'sys' },
        { role: 'user', messageId: 'u1', content: [
            { type: 'text', text: 'fix this error' },
            { type: 'document', source: { type: 'text', media_type: 'text/plain', data: 'TypeError: boom\n  at x.js:1' }, _name: 'Pasted text', _pasted: true },
        ] },
    ];
    const out = prepareHistoryForAI(history, 'm');
    const parts = out[1].content;
    check('the paste reaches the model as plain text after the typed message',
        parts.length === 2 && parts[0].text === 'fix this error' && parts[1].type === 'text', JSON.stringify(parts));
    check('it is labelled as pasted text, with the whole text',
        parts[1].text.startsWith('Text the user pasted ("Pasted text"):') && parts[1].text.endsWith('TypeError: boom\n  at x.js:1'), parts[1].text);
    check('no display-only fields leak', !JSON.stringify(parts).includes('_pasted') && !JSON.stringify(parts).includes('_name'));
    check('the stored history is untouched', history[1].content[1].type === 'document' && history[1].content[1]._pasted === true);
}

// ---- The send path --------------------------------------------------------
check('pastes are split off before the asset pipeline',
    /const pastes = sendAttachments\.filter\(a => a\.pastedText != null\);\s*const atts = sendAttachments\.filter\(a => a\.pastedText == null\);/.test(APP));
check('each paste is stored as a pasted text document block',
    /type: 'document', source: \{ type: 'text', media_type: 'text\/plain', data: a\.pastedText \}, _name: a\.name, _pasted: true/.test(APP));
check('the tray clears everything that was sent, pastes included',
    APP.includes('clearAllAttachments({ deferRevoke: true, only: sendAttachments })'));
check('a reloaded chat draws a pasted block as a card',
    /item\.type === 'document' && item\.source\?\.type === 'text' && item\._pasted\)[\s\S]{0,80}pastedCardHTML/.test(APP));
check('the tray draws a paste as a card', /img\.pastedText != null[\s\S]{0,80}pastedCardHTML\(img\.pastedText, img\.name, \{ trayId: img\.id \}\)/.test(APP));

// The draft keeps the cards (see test-composer-drafts): every change to them
// saves it, and a send takes them out of the tray with the text it clears.
check('attaching a paste saves the draft', /window\.saveComposerDraft\?\.\(\);\s*return true;/.test(slice(DD, 'function attachPastedText(text) {', 'window.attachPastedText')));
check('removing a pasted card saves the draft',
    /if \(removed && removed\.pastedText != null\) saveComposerDraft\(\);/.test(slice(APP, 'function removeAttachment(id) {', '\n}\n')));
check('editing a pasted card saves the draft', /entry\.pastedText = next;[\s\S]{0,120}window\.saveComposerDraft\?\.\(\)/.test(UI));
check('a send takes its pasted cards out of the tray right after clearing the draft',
    /clearComposerDraft\(preAuthDraftContext\);[\s\S]{0,400}const sentPastes = sendAttachments\.filter\(a => a\.pastedText != null\);\s*if \(sentPastes\.length\) clearAllAttachments\(\{ only: sentPastes \}\);/.test(APP));

check('a composer send that never lands hands its pasted cards back with its text',
    /returnToComposer\?\.\(\[queued \|\| \{\s*text: messageText,\s*attachments: sendAttachments\.filter\(a => a\.pastedText != null\),\s*\}\]\)/.test(APP));

check('a reply to a clarifying question carries the pasted cards after the typed text',
    /const pastes = userInput == null \? attachedImages\.filter\(a => a\.pastedText != null\) : \[\];\s*const text = \[typed, \.\.\.pastes\.map\(a => a\.pastedText\)\]/.test(APP)
    && /if \(pastes\.length\) clearAllAttachments\(\{ only: pastes \}\);[\s\S]{0,600}submitDirectReply\(text\)/.test(APP));

check('a tray file that isn\'t an image is drawn as a file card', /attachment-thumbnail\$\{isImage \? '' : ' is-file'\}/.test(APP));

{
    const MQ = read('../src/js/message-queue.js');
    check('a queued message draws its pasted text as the same card as a sent one',
        /window\.pastedCardHTML\(a\.pastedText, a\.name, \{ index: i \}\)/.test(MQ));
    check('a queued card opens its text', UI.includes("'.message .pasted-card-open, .queued-message .pasted-card-open'")
        && /window\.MessageQueue\?\.pastedText\?\.\(/.test(UI) && /pastedText,\n/.test(MQ));
}

// ---- Features that read what the user wrote ------------------------------
// A long paste used to be the message's text. As a card it is a document
// block, and the project title, the version label and the suggestion /
// naming transcript must still read it.
{
    const pasteOnly = { role: 'user', content: [
        { type: 'document', source: { type: 'text', media_type: 'text/plain', data: 'TypeError: boom\n  at x.js:1' }, _name: 'Pasted text', _pasted: true },
    ] };
    const a = HELP.indexOf('function generateChatTitle(');
    const generateChatTitle = new Function(HELP.slice(a, HELP.indexOf('\n}\n', a) + 3) + '\nreturn generateChatTitle;')();
    check('a paste-only first message titles the project from its paste',
        generateChatTitle([{ role: 'system' }, pasteOnly]) === 'TypeError: boom at x.js:1');
    check('typed text still wins the title',
        generateChatTitle([{ role: 'system' }, { role: 'user', content: [{ type: 'text', text: 'fix it' }, ...pasteOnly.content] }]) === 'fix it');

    const b = APP.indexOf('function suggestionMessageText(');
    const suggestionMessageText = new Function(APP.slice(b, APP.indexOf('\n}\n', b) + 3) + '\nreturn suggestionMessageText;')();
    check('the suggestion and naming transcript reads the paste after the typed text',
        suggestionMessageText({ role: 'user', content: [{ type: 'text', text: 'fix it' }, ...pasteOnly.content, { type: 'image-ref', path: 'p' }] })
            === 'fix it TypeError: boom\n  at x.js:1');
    check('the version label and its AI context read the pastes',
        /const turnRequest = \[messageText, \.\.\.sendAttachments\.filter\(a => a\.pastedText != null\)\.map\(a => a\.pastedText\)\][\s\S]{0,200}userMessage: turnRequest,[\s\S]{0,200}label: isResume \? 'Resumed build' : turnRequest,/.test(APP));
}

check('a click outside the edit dialog keeps unsaved edits instead of discarding them',
    /if \(editable && \$overlay\.find\('\.pasted-modal-text'\)\.val\(\) !== text\) \{[\s\S]{0,120}return;\s*\}\s*close\(\);/.test(UI));

check('npm test runs this file', PKG.scripts.test.includes('node scripts/test-paste-as-attachment.mjs'));

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll paste-as-attachment checks passed.');
