import fs from 'node:fs';

// ---- Regression guard: out-of-credits cards leave once the account can pay ----
// An upgrade or a top-up clears the out-of-credits error cards from the open
// chat (clearCreditErrors in app.js) and marks their saved entries so a reload
// doesn't draw them again. This test:
//   * evaluates the REAL isCreditErrorEntry / clearCreditErrors sliced out of
//     app.js against a fake jQuery, document and save, and
//   * text-asserts the wiring: the live card is told the same way a reload
//     tells it, and loadChat skips cleared entries.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const a = APP.indexOf('// ===== clear-credit-errors (start) =====');
const b = APP.indexOf('// ===== clear-credit-errors (end) =====');
if (a < 0 || b < 0) throw new Error('could not extract clear-credit-errors block');
const BLOCK = APP.slice(a, b);

// A card in the fake chat box. `classes` are its .message classes; `focused`
// says whether the page's focus is inside it.
function card(classes) { return { classes: new Set(classes), removed: false }; }

function harness({ history = [], processing = false, cards = [], focusIn = null, keyboard = false } = {}) {
    const saves = [];
    const focused = [];
    const document = { activeElement: focusIn ? focusIn.inner : { tag: 'body' }, body: { tag: 'body' } };
    if (!focusIn) document.activeElement = document.body;
    // Only the selectors clearCreditErrors uses are understood.
    const $ = (sel) => {
        let picked = [];
        if (sel === '.chat-box .message.credit-error, .chat-box .message.upgrade-message') {
            picked = cards.filter(c => !c.removed && (c.classes.has('credit-error') || c.classes.has('upgrade-message')));
        } else if (sel === '.chat-input-message') {
            picked = [{ composer: true }];
        }
        const set = {
            length: picked.length,
            toArray: () => picked.map(c => c.composer ? c : { contains: (el) => !!focusIn && focusIn === c && el === focusIn.inner }),
            remove() {
                for (const c of picked) {
                    c.removed = true;
                    if (focusIn === c) document.activeElement = document.body;
                }
                return set;
            },
            filter: () => set,
            trigger(ev) { if (ev === 'focus') { focused.push(sel); document.activeElement = { composer: true }; } return set; },
        };
        return set;
    };
    const window = { lastInputWasKeyboard: () => keyboard };
    const fns = new Function('window', 'document', '$', 'chatHistory', 'isProcessing', 'currentChatId', 'saveCurrentChat',
        BLOCK + '\nreturn { isCreditErrorEntry, clearCreditErrors };')(
        window, document, $, history, processing, 'chat-1',
        (ctx) => { saves.push(ctx); return Promise.resolve(); });
    return { ...fns, saves, focused, document, window };
}

const CREDITS_TEXT = "Your account doesn't have enough credits to complete this request.";

// ---- isCreditErrorEntry -------------------------------------------------------
{
    const { isCreditErrorEntry } = harness();
    check('marked out-of-credits error is a credit error',
        isCreditErrorEntry({ role: 'assistant', isError: true, content: 'Payment required', creditError: true }));
    check('an error saved before the marker is told by its text',
        isCreditErrorEntry({ role: 'assistant', isError: true, content: CREDITS_TEXT }));
    check('another error is not',
        !isCreditErrorEntry({ role: 'assistant', isError: true, content: 'The request timed out. Please try again.' }));
    check('an ordinary reply mentioning credits is not',
        !isCreditErrorEntry({ role: 'assistant', content: CREDITS_TEXT }));
    check('a user message is not',
        !isCreditErrorEntry({ role: 'user', isError: true, content: CREDITS_TEXT }));
    check('a missing entry is not', !isCreditErrorEntry(null));
}

// ---- clearCreditErrors: history and saving --------------------------------------
{
    const history = [
        { role: 'system', content: 'sys' },
        { role: 'user', content: 'build me a site' },
        { role: 'assistant', isError: true, content: CREDITS_TEXT, creditError: true },
        { role: 'user', content: 'again' },
        { role: 'assistant', isError: true, content: 'The request timed out. Please try again.' },
    ];
    const credit = card(['error-message', 'credit-error']);
    const limit = card(['upgrade-message']);
    const other = card(['error-message']);
    const h = harness({ history, cards: [credit, limit, other] });
    h.clearCreditErrors();
    check('the out-of-credits card and the usage-limit card leave the chat', credit.removed && limit.removed);
    check('another error card stays', !other.removed);
    check('the out-of-credits entry is marked cleared', history[2].creditErrorCleared === true);
    check('another error entry is not', !history[4].creditErrorCleared);
    check('the chat is saved once', h.saves.length === 1 && h.saves[0].chatHistory === history && h.saves[0].currentChatId === 'chat-1');
    h.clearCreditErrors();
    check('nothing new to mark: no second save', h.saves.length === 1);
}
{
    const history = [{ role: 'assistant', isError: true, content: CREDITS_TEXT }];
    const h = harness({ history, processing: true });
    h.clearCreditErrors();
    check('during a build the entry is marked, and the build\'s own save writes it', history[0].creditErrorCleared === true && h.saves.length === 0);
}

// ---- clearCreditErrors: focus ---------------------------------------------------
// The card's own button had focus (the user paid from it). Removing the card
// must not leave focus on <body>.
{
    const credit = card(['upgrade-message']);
    credit.inner = { tag: 'button' };
    const h = harness({ cards: [credit], focusIn: credit, keyboard: true });
    h.clearCreditErrors();
    check('keyboard user: focus moves to the composer when its card leaves',
        credit.removed && h.focused.length === 1 && h.focused[0] === '.chat-input-message' && h.document.activeElement.composer === true);
}
{
    const credit = card(['error-message', 'credit-error']);
    credit.inner = { tag: 'button' };
    const h = harness({ cards: [credit], focusIn: credit, keyboard: false });
    h.clearCreditErrors();
    check('after a tap or click the composer is not focused (no phone keyboard)', credit.removed && h.focused.length === 0);
}
{
    const credit = card(['error-message', 'credit-error']);
    const h = harness({ cards: [credit], keyboard: true });
    h.clearCreditErrors();
    check('focus elsewhere is left alone', credit.removed && h.focused.length === 0 && h.document.activeElement === h.document.body);
}
{
    // completeUpgrade clears before it opens the success dialog, whose focus
    // trap remembers the focused element to return to.
    const UI = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
    check('the upgrade clears the cards before the success dialog opens',
        /window\.clearCreditErrors\?\.\(\);\s*openUpgradeModal\(source, \{ justUpgraded: true \}\);/.test(UI));
}

// ---- Wiring --------------------------------------------------------------------
{
    // The live card is tagged by the same test a reload uses, on the very entry
    // that is saved, so the two can't disagree.
    const at = APP.indexOf('const friendlyError = friendlyErrorMessage(errorText);');
    const body = APP.slice(at, APP.indexOf('turnSaveContext.chatHistory.push(errorEntry);', at) + 60);
    check('the live card is tagged with isCreditErrorEntry on the saved entry',
        at > 0 && /if \(isCreditErrorEntry\(errorEntry\)\) \$card\.addClass\('credit-error'\);/.test(body), body.slice(0, 400));
    check('the entry tagged is the entry saved', body.includes('turnSaveContext.chatHistory.push(errorEntry);'));
    check('a reload tags its card the same way',
        /appendErrorMessage\(message\.content\);\s*if \(isCreditErrorEntry\(message\)\) \$card\.addClass\('credit-error'\);/.test(APP));
    check('a reload skips cleared entries', /if \(message\.creditErrorCleared\) continue;/.test(APP));
}

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
