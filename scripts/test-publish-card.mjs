import fs from 'node:fs';
import vm from 'node:vm';
import { makeDom } from './lib/mini-dom.mjs';

// ---- Publishing from the chat ----------------------------------------------
// When the user asks the AI to publish, it calls OfferPublish and a Publish
// card appears in the chat (src/tools/chat_ui/publish.js). The user publishes
// by clicking it, through the same publishProject as the toolbar's popover.
// The newest card draws the project's publish state, so it reads like the
// toolbar: an address and Publish before the first publish, Publish changes
// when the live site is behind, Live once it's up to date. Its button waits
// while a turn runs. An older card is frozen: a "Published" line if the user
// published from it, otherwise hidden. Runs the REAL card code (mini DOM) with publishProject stubbed;
// the real publishProject is driven with a card's hooks in
// test-publish-analytics.mjs.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const cardSource = read('../src/tools/chat_ui/publish.js');
const addressSource = read('../src/tools/chat_ui/address.js');
const uiSource = read('../src/js/ui.js');
const helpersSource = read('../src/js/helpers.js');
const stateSource = read('../src/js/publish-state.js');

function extract(src, signature) {
    const a = src.indexOf(signature);
    if (a < 0) throw new Error('could not find ' + signature);
    return src.slice(a, src.indexOf('\n}\n', a) + 2);
}

function setup() {
    const dom = makeDom();
    const chatBox = dom.document.createElement('div');
    chatBox.className = 'chat-box';
    dom.body.appendChild(chatBox);
    const calls = [], events = [], announced = [];
    const env = {
        console,
        $: dom.$,
        document: dom.document,
        currentChatId: 'project-a',
        busy: false,
        blocked: null,
        publishBusyHere: () => env.busy,
        publishBlockedReason: () => env.blocked,
        badgeChangePending: () => false,
        publishProject: (ui) => { calls.push(ui); return Promise.resolve(); },
        puter: { randName: () => 'random-name' },
        chatHistory: [],
        saves: 0,
        saveCurrentChat: async () => { env.saves++; },
    };
    env.window = Object.assign(env, {
        tools: [],
        currentPreviewUrl: 'https://preview-abc.puter.site/',
        currentPublishedUrl: null,
        currentPublishedPath: null,
        currentPublishedVersionId: null,
        _projectDirtySinceSnapshot: true,
        getCurrentVersionId: () => 'v2',
        isComposingKeyEvent: () => false,
        isSubdomainLimitErr: () => false,
        isAborted: () => false,
        isStaleTurn: () => false,
        isPublishStarting: () => false,
        isAddressChanging: () => false,
        isSubdomainTakenErr: (e) => !!(e && e.taken),
        renames: [],
        renameResult: null,
        changePublishedAddress: (typed) => {
            env.renames.push(typed);
            const r = env.renameResult;
            return r instanceof Error ? Promise.reject(r) : Promise.resolve(r);
        },
        announce: (t) => announced.push(t),
        track: (event, props) => events.push({ event, props }),
    });
    vm.createContext(env);
    vm.runInContext(stateSource, env);
    vm.runInContext([
        extract(helpersSource, 'function htmlEscape(text) {'),
        extract(uiSource, 'function slugifyTitle(t) {'),
    ].join('\n\n'), env);
    vm.runInContext(cardSource, env);
    vm.runInContext(addressSource, env);
    const tool = env.tools.find(t => t.function.name === 'OfferPublish');
    const addressTool = env.tools.find(t => t.function.name === 'OfferAddressChange');
    const cards = () => chatBox.querySelectorAll('.publish-card');
    const q = (el, sel) => el.querySelector(sel);
    return { env, dom, chatBox, tool, addressTool, cards, q, calls, events, announced };
}

// ---- The tool --------------------------------------------------------------
{
    const { tool } = setup();
    check('OfferPublish is registered', !!tool);
    const params = tool.function.parameters;
    check('it takes an optional address, and leaves strict mode to the tools that need it',
        tool.function.strict === false && params.properties.address && params.required.length === 0
        && params.additionalProperties === false);
    check('its description says only when the user asks, and that the user clicks',
        /only when the user asks/.test(tool.function.description) && /the user clicks/.test(tool.function.description));
}

// ---- Nothing built yet: no card --------------------------------------------
{
    const { env, tool, cards } = setup();
    env.currentPreviewUrl = null;
    const r = await tool.exec({ address: 'my-app' }, {});
    check('no app yet: an error and no card', r.error && !r.__publish_offer && cards().length === 0, JSON.stringify(r));
}

// ---- First publish ---------------------------------------------------------
{
    const t = setup();
    const { env, tool, cards, q, calls, dom } = t;
    env.blocked = 'task'; // the tool runs inside the turn
    const r = await tool.exec({ address: 'Bakery Orders!' }, {});
    check('result: marked for reload, with the cleaned address',
        r.__publish_offer === true && r.address === 'bakery-orders', JSON.stringify(r));
    check('result: an id for the card, on the card too',
        /^offer-/.test(r.offer) && cards()[0].getAttribute('data-offer') === r.offer, JSON.stringify(r));
    check('result: tells the model nothing is public until the click',
        /bakery-orders\.puter\.site/.test(r.instruction) && /Nothing is public until they click Publish/.test(r.instruction));
    check('card shown once', cards().length === 1);
    const card = cards()[0];
    const input = q(card, '.publish-card-input');
    const btn = q(card, '.publish-card-btn');
    check('card: the address is filled in', input && input.value === 'bakery-orders');
    check('card: one Publish button', btn && btn.textContent === 'Publish');
    check('card: the button waits while the turn runs', btn.disabled === true);
    check('shown once in analytics', t.events.some(e => e.event === 'Publish Card Shown' && e.props.state === 'form'));

    // The user edits the address while the reply finishes.
    input.focus();
    input.value = 'bakery';
    dom.dispatch(input, 'input');
    env.blocked = null;
    env.refreshPublishCards();
    check('turn ends: the button is ready', q(card, '.publish-card-btn').disabled === false);
    check('turn ends: the typed address and its field are kept',
        q(card, '.publish-card-input') === input && input.value === 'bakery' && dom.document.activeElement === input);

    dom.dispatch(q(card, '.publish-card-btn'), 'click');
    check('click: publishes through publishProject, from the chat', calls.length === 1 && calls[0].source === 'chat');
    check('click: the typed address is the one published', calls[0].desiredName() === 'bakery');

    // In flight.
    env.busy = true;
    env.refreshPublishCards();
    const busyBtn = q(card, '.publish-card-btn');
    check('publishing: the button says so and is disabled', busyBtn.textContent === 'Publishing…' && busyBtn.disabled === true);
    check('publishing: the address is locked', q(card, '.publish-card-input').disabled === true);
    check('publishing: the address survives the redraw', q(card, '.publish-card-input').value === 'bakery');

    // Fails: the address is taken.
    env.busy = false;
    env.refreshPublishCards();
    const err = new Error('address taken'); err.code = 'name-taken';
    calls[0].fail(err);
    const errEl = q(card, '.publish-card-error');
    check('failure: a short error beside the field', errEl && errEl.textContent === 'That address is taken. Try another.');
    check('failure: the field is focused for the fix', dom.document.activeElement === q(card, '.publish-card-input'));
    check('failure: read out', t.announced.includes('That address is taken. Try another.'));
    const field = q(card, '.publish-card-input');
    field.value = 'bakery-2';
    dom.dispatch(field, 'input');
    check('typing clears the error', !q(card, '.publish-card-error'));

    // Enter publishes.
    dom.dispatch(field, 'keydown', { key: 'Enter' });
    check('Enter in the field publishes', calls.length === 2 && calls[1].desiredName() === 'bakery-2');

    // Succeeds.
    env.currentPublishedUrl = 'https://bakery-2.puter.site/';
    env.currentPublishedVersionId = 'v2';
    env._projectDirtySinceSnapshot = false;
    env.chatHistory.push({ role: 'user', content: { type: 'tool_result', tool_use_id: 't1', content: JSON.stringify(r) } });
    await calls[1].success({ url: 'https://bakery-2.puter.site/', isFirst: true });
    env.refreshPublishCards();
    check('success: read out', t.announced.includes('Your website is live.'));
    const link = q(card, '.publish-card-link');
    check('success: Live, with the address as a link',
        /Live/.test(card.textContent) && link && link.getAttribute('href') === 'https://bakery-2.puter.site/'
        && link.textContent === 'bakery-2.puter.site' && link.getAttribute('target') === '_blank');
    check('success: no button left', !q(card, '.publish-card-btn'));
    check('success: the publish is saved on the card\'s tool result, and the chat saved',
        env.chatHistory[0].publishCardUrl === 'https://bakery-2.puter.site/' && env.saves === 1);

    // A disabled button does nothing.
    env._projectDirtySinceSnapshot = true;
    env.blocked = 'task';
    env.refreshPublishCards();
    const changesBtn = q(card, '.publish-card-btn');
    check('changes since: Publish changes', changesBtn && changesBtn.textContent === 'Publish changes');
    dom.dispatch(changesBtn, 'click');
    check('a waiting button ignores clicks', calls.length === 2);
}

// ---- Already published -----------------------------------------------------
{
    const { env, tool, cards, q } = setup();
    env.currentPublishedUrl = 'https://ay-site.puter.site/';
    env.currentPublishedVersionId = 'v2';
    const dirty = await tool.exec({ address: 'whatever' }, {});
    check('changes: the model is told it goes live on the click',
        /live at https:\/\/ay-site\.puter\.site\//.test(dirty.instruction) && /Publish changes button/.test(dirty.instruction));
    check('changes: no address field', !q(cards()[0], '.publish-card-input'));
    env._projectDirtySinceSnapshot = false;
    const clean = await tool.exec({ address: 'whatever' }, {});
    check('up to date: the model is told there is nothing new', /already live/.test(clean.instruction) && /nothing new to publish/.test(clean.instruction));
    const [older, newest] = cards();
    check('only the newest card is drawn from the state', /Live/.test(newest.textContent) && !q(newest, '.publish-card-btn'));
    check('an older card nobody published from is hidden',
        older.classList.contains('is-superseded') && !q(older, '.publish-card-btn') && !q(older, '.publish-card-link'));
    env._projectDirtySinceSnapshot = true;
    env.refreshPublishCards();
    check('a hidden card stays hidden when the state changes',
        older.classList.contains('is-superseded') && /Publish changes/.test(newest.textContent));
}

// ---- Offered before an edit in the same reply ------------------------------
{
    const { env, tool } = setup();
    env.currentPublishedUrl = 'https://ay-site.puter.site/';
    env.currentPublishedVersionId = 'v2';
    env._projectDirtySinceSnapshot = false;
    // The edit leaves the site behind, so the model is told the card offers
    // Publish changes, as it will once the reply ends. A later read changes
    // nothing.
    env.isMutatingTool = (name) => ['write', 'edit'].includes(name);
    const editLater = await tool.exec({}, { laterToolCalls: [{ name: 'edit', input: {} }] });
    check('up to date, an edit still to come: the model is told the changes go live on the click',
        /Publish changes button/.test(editLater.instruction) && !/nothing new/.test(editLater.instruction), editLater.instruction);
    const readLater = await tool.exec({}, { laterToolCalls: [{ name: 'ReadTextFile', input: {} }] });
    check('up to date, only a read to come: still nothing new', /nothing new to publish/.test(readLater.instruction), readLater.instruction);
}

// ---- The old address stays readable ----------------------------------------
// An older card's address that has since moved is crossed out, and it still
// says where that publish went: at 13px it needs 4.5:1 against the card
// (WCAG AA). #8a8a8a on the card's #fafafa was 3.3:1.
{
    const css = read('../src/css/styles.css');
    const colorOf = (sel, prop) => {
        const m = css.match(new RegExp('\\n' + sel.replace(/[.-]/g, '\\$&') + ' \\{[^}]*?\\b' + prop + ':\\s*(#[0-9a-f]{6})', 'i'));
        return m && m[1];
    };
    const lum = (hex) => {
        const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
            .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const fg = colorOf('.publish-card-gone', 'color');
    const bg = colorOf('.publish-card-inner', 'background');
    const ratio = fg && bg ? (lum(bg) + 0.05) / (lum(fg) + 0.05) : 0;
    check('a moved address on an older card meets 4.5:1 against the card', ratio >= 4.5, `${fg} on ${bg}: ${ratio.toFixed(2)}`);
}

// ---- Published, but no preview: no publish from the chat --------------------
// A publish ships the preview's files. In a project published once and then
// opened without a preview, the card still offered Publish changes, and it
// would have shipped the whole project folder (publishedRootDir falls back
// to it). The toolbar has no Publish then, and Settings refuses.
{
    const { env, tool, cards, q, dom, calls } = setup();
    env.currentPreviewUrl = null;
    env.currentPublishedUrl = 'https://ay-site.puter.site/';
    const r = await tool.exec({}, {});
    check('no preview: OfferPublish returns an error and no card', r.error && !r.__publish_offer && cards().length === 0, JSON.stringify(r));

    // A card from before (a reloaded chat) waits, and Enter says why.
    const toasts = [];
    env.showToast = (text) => toasts.push(text);
    env.renderPublishCard({ address: 'ay-site', offer: 'offer-1' });
    const btn = q(cards()[0], '.publish-card-btn');
    check('no preview: a reloaded card\'s Publish changes waits', btn && btn.disabled, cards()[0].innerHTML);
    dom.dispatch(btn, 'click');
    check('…a click does nothing', calls.length === 0);
    env.currentPublishedUrl = null;
    env.refreshPublishCards();
    dom.dispatch(q(cards()[0], '.publish-card-input'), 'keydown', { key: 'Enter' });
    check('…and Enter in a first publish\'s field says there is nothing to publish yet',
        calls.length === 0 && /nothing to publish yet/.test(toasts[0] || ''), JSON.stringify(toasts));
}

// ---- The address the AI passes is kept as the user gave it ------------------
// Both tools made the address the way a title is made into one: dots became
// hyphens and it was cut at 30 characters, so "move it to
// joes-bakery.puter.site" offered joes-bakery-puter-site, and a longer
// address lost its end. The AI then presented that as what was asked for.
{
    const t = setup();
    t.env.currentPublishedUrl = 'https://old-name.puter.site/';
    const long = 'the-best-bakery-in-san-francisco-bay';
    for (const [given, want] of [
        ['joes-bakery.puter.site', 'joes-bakery'],
        ['https://joes-bakery.puter.site/', 'joes-bakery'],
        [long, long],
        ["Joe's Bakery", 'joe-s-bakery'],
    ]) {
        const r = await t.addressTool.exec({ address: given }, {});
        check(`OfferAddressChange: "${given}" is offered as ${want}`, r.address === want, JSON.stringify(r));
    }
    const u = setup();
    const r = await u.tool.exec({ address: 'Joes-Bakery.puter.site' }, {});
    check('OfferPublish: an address given with .puter.site is kept, without it', r.address === 'joes-bakery', JSON.stringify(r));
}

// ---- Enter while the button waits says why ---------------------------------
// The card arrives during the AI's reply, so its button starts out waiting.
// Enter in the field did nothing at all, and the dimmed button gave no
// reason; the popover shows "Finishing the current task…" instead.
{
    const { env, dom, tool, cards, q, calls } = setup();
    const toasts = [];
    env.showToast = (text, opts) => toasts.push({ text, opts });
    env.blocked = 'task';
    await tool.exec({ address: 'bakery' }, {});
    const field = q(cards()[0], '.publish-card-input');
    dom.dispatch(field, 'keydown', { key: 'Enter' });
    check('Enter during a reply: nothing is published', calls.length === 0);
    check('…and a throttled toast says why',
        toasts.length === 1 && toasts[0].text === 'Finishing the current task — you can publish the moment it’s done.'
        && toasts[0].opts.key === 'publish-blocked' && toasts[0].opts.throttleMs > 0, JSON.stringify(toasts));
    env.blocked = 'restore';
    dom.dispatch(field, 'keydown', { key: 'Enter' });
    check('…a restore is named as such', /Finishing the restore/.test(toasts.at(-1).text), toasts.at(-1).text);
    env.blocked = null;
    env.refreshPublishCards();
    dom.dispatch(q(cards()[0], '.publish-card-input'), 'keydown', { key: 'Enter' });
    check('once the reply ends, Enter publishes', calls.length === 1 && toasts.length === 2);

    // A Change address card waiting on another publish says that.
    const a = setup();
    const aToasts = [];
    a.env.showToast = (text) => aToasts.push(text);
    a.env.currentPublishedUrl = 'https://old-name.puter.site/';
    a.env.isPublishStarting = () => true;
    await a.addressTool.exec({ address: 'new-name' }, {});
    a.dom.dispatch(a.q(a.cards()[0], '.publish-card-input'), 'keydown', { key: 'Enter' });
    check('Change address waiting on a publish: says so', a.env.renames.length === 0
        && aToasts[0] === 'Finishing publishing — you can change the address the moment it’s done.', JSON.stringify(aToasts));
}

// ---- A long address shows that it goes on ----------------------------------
// On a 320px phone the field fits about 25 characters at 16px, and an
// address the AI suggests can be 30 (slugifyTitle): it was cut mid-letter
// against .puter.site ("neighborhood-bakery-order.puter.site"), a different
// address. An ellipsis marks the cut.
{
    const css = read('../src/css/styles.css');
    const rule = (css.match(/\n\.publish-card-input \{[^}]*\}/) || [''])[0];
    check('the address field ends a cut address with an ellipsis', /text-overflow:\s*ellipsis/.test(rule), rule);
}

// ---- An older card keeps the publish made from it ---------------------------
{
    const { env, tool, cards, q, calls, dom } = setup();
    const r = await tool.exec({ address: 'first-try' }, {});
    env.chatHistory.push({ role: 'user', content: { type: 'tool_result', tool_use_id: 't1', content: JSON.stringify(r) } });
    const first = cards()[0];
    dom.dispatch(q(first, '.publish-card-btn'), 'click');
    env.currentPublishedUrl = 'https://first-try.puter.site/';
    env.currentPublishedVersionId = 'v2';
    await calls[0].success({ url: 'https://first-try.puter.site/', isFirst: true });

    // Changes since, and the user asks again.
    env._projectDirtySinceSnapshot = true;
    await tool.exec({}, {});
    const [older, newest] = cards();
    const record = q(older, '.publish-card-record');
    check('older card: a Published line with the address it went to',
        record && /Published/.test(older.textContent) && q(older, '.publish-card-link').getAttribute('href') === 'https://first-try.puter.site/'
        && !older.classList.contains('is-superseded'));
    check('older card: no button, no Live', !q(older, '.publish-card-btn') && !/Live/.test(older.textContent));
    check('newest card: Publish changes', /Publish changes/.test(newest.textContent));

    // The address changes later: the record keeps where that publish went,
    // but that address no longer works, so it is no longer a link.
    env.currentPublishedUrl = 'https://renamed.puter.site/';
    env.refreshPublishCards();
    const gone = q(older, '.publish-card-gone');
    check('older card: a moved address stays, as plain text',
        !q(older, '.publish-card-link') && gone && gone.textContent === 'first-try.puter.site' && /Published/.test(older.textContent));
    check('…its whole address is in its title, for when it is cut off',
        gone && gone.getAttribute('title') === 'first-try.puter.site');
    check('…and the live link\'s too', q(newest, '.publish-card-link')
        && q(newest, '.publish-card-link').getAttribute('title') === 'https://renamed.puter.site/');
    check('…and a screen reader hears that it no longer works',
        gone && q(gone.parentNode, '.sr-only') && /no longer works/.test(q(gone.parentNode, '.sr-only').textContent),
        older.textContent);
}

// ---- Changing the address from the chat --------------------------------------
{
    const { addressTool, cards } = setup();
    check('OfferAddressChange is registered, with a required address',
        addressTool && addressTool.function.parameters.required.includes('address') && addressTool.function.strict === false);
    check('its description says only when the user asks, that the user clicks, and that the old address breaks',
        /only when the user asks/.test(addressTool.function.description) && /the user clicks/.test(addressTool.function.description)
        && /old address stops working/.test(addressTool.function.description));
    const r = await addressTool.exec({ address: 'new-name' }, {});
    check('not published: an error pointing at OfferPublish, and no card', r.error && /OfferPublish/.test(r.error) && cards().length === 0);
}
{
    const t = setup();
    const { env, addressTool, cards, q, dom } = t;
    env.currentPublishedUrl = 'https://old-name.puter.site/';
    env.currentPublishedVersionId = 'v2';
    env._projectDirtySinceSnapshot = false;
    const same = await addressTool.exec({ address: 'old-name' }, {});
    check('already at that address: no card', !same.__publish_offer && /already at/.test(same.instruction) && cards().length === 0);

    env.blocked = 'task';
    const r = await addressTool.exec({ address: 'Bakery Orders' }, {});
    check('result: a card for reload, of the address kind, with the cleaned address',
        r.__publish_offer === true && r.kind === 'address' && r.address === 'bakery-orders' && /^offer-/.test(r.offer), JSON.stringify(r));
    check('result: tells the model nothing moves until the click, and the old address stops working',
        /https:\/\/old-name\.puter\.site\//.test(r.instruction) && /bakery-orders\.puter\.site/.test(r.instruction)
        && /Nothing moves until they click/.test(r.instruction) && /old address stops working/.test(r.instruction));
    const card = cards()[0];
    const btn = q(card, '.publish-card-btn');
    check('card: the new address in a field, and Change address', q(card, '.publish-card-input').value === 'bakery-orders' && btn.textContent === 'Change address');
    check('card: says where the site moves from, and that old links break',
        /old-name\.puter\.site/.test(q(card, '.publish-card-note').textContent) && /stop working/.test(q(card, '.publish-card-note').textContent));
    check('card: waits while the turn runs', btn.disabled === true);
    dom.dispatch(btn, 'click');
    check('a waiting button ignores clicks', env.renames.length === 0);
    check('shown in analytics as an address card', t.events.some(e => e.event === 'Publish Card Shown' && e.props.state === 'address'));

    env.blocked = null;
    env.refreshPublishCards();
    const input = q(card, '.publish-card-input');
    input.value = 'bakery';
    dom.dispatch(input, 'input');

    // Taken.
    env.renameResult = Object.assign(new Error('taken'), { taken: true });
    dom.dispatch(q(card, '.publish-card-btn'), 'click');
    await new Promise(setImmediate);
    check('click: runs the address change with the typed address', env.renames[0] === 'bakery');
    check('taken: a short error beside the field', q(card, '.publish-card-error')?.textContent === 'That address is taken. Try another.');
    check('taken: the typed address is kept', q(card, '.publish-card-input').value === 'bakery');

    // In flight.
    env.isAddressChanging = () => true;
    env.refreshPublishCards();
    check('changing: the button says so and is disabled', q(card, '.publish-card-btn').textContent === 'Changing…' && q(card, '.publish-card-btn').disabled);
    env.isAddressChanging = () => false;
    env.refreshPublishCards();

    // Works: Enter in the field.
    env.chatHistory.push({ role: 'user', content: { type: 'tool_result', tool_use_id: 't1', content: JSON.stringify(r) } });
    env.renameResult = { changed: true, url: 'https://bakery.puter.site/', oldUrl: 'https://old-name.puter.site/', open: true };
    env.currentPublishedUrl = 'https://bakery.puter.site/';
    dom.dispatch(q(card, '.publish-card-input'), 'keydown', { key: 'Enter' });
    await new Promise(setImmediate); await new Promise(setImmediate);
    check('done: the card reads like any other, Live at the new address',
        /Live/.test(card.textContent) && q(card, '.publish-card-link').getAttribute('href') === 'https://bakery.puter.site/' && !q(card, '.publish-card-input'));
    check('done: read out, tracked from the chat, and saved on the tool result',
        t.announced.includes('Your site is now at bakery.puter.site.')
        && t.events.some(e => e.event === 'Site Address Changed' && e.props.source === 'chat')
        && env.chatHistory[0].publishCardUrl === 'https://bakery.puter.site/');

    // A newer card: this one freezes as "Address changed".
    await t.tool.exec({}, {});
    const older = cards()[0];
    check('older address card: Address changed, with the address it moved to',
        /Address changed/.test(older.textContent) && q(older, '.publish-card-link').getAttribute('href') === 'https://bakery.puter.site/');
}
{
    // While an address change runs, Publish waits too.
    const { env, tool, cards, q } = setup();
    env.currentPublishedUrl = 'https://a.puter.site/';
    env.currentPublishedVersionId = 'v1';
    env.isAddressChanging = () => true;
    await tool.exec({}, {});
    check('a Publish card waits while the address changes', q(cards()[0], '.publish-card-btn').disabled === true);

    // Only for this project's own address: one that keeps changing after the
    // user opened another project doesn't hold this one's cards.
    env.isAddressChanging = (chatId) => chatId === undefined || chatId === 'project-other';
    env.refreshPublishCards();
    check('another project\'s address change: Publish doesn\'t wait', q(cards()[0], '.publish-card-btn').disabled === false);
    await env.tools.find(t => t.function.name === 'OfferAddressChange').exec({ address: 'b' }, {});
    const addr = cards()[1];
    check('…and a Change address card isn\'t drawn as changing',
        q(addr, '.publish-card-btn').textContent === 'Change address' && q(addr, '.publish-card-btn').disabled === false);
}

// ---- The address change itself (ui.js) ----------------------------------------
{
    const start = uiSource.indexOf('const _addressChangingChats = new Set();');
    const end = uiSource.indexOf('\n}\n', uiSource.indexOf('async function changePublishedAddress(typed) {')) + 2;
    function make({ blocked = null, busy = false, starting = false } = {}) {
        const log = [];
        const sb = {
            console: { warn() {} },
            currentChatId: 'p',
            chatHistory: [],
            publishBlockedReason: () => blocked,
            publishBusyHere: () => busy,
            previewSubdomain: (u) => (String(u).match(/^https:\/\/([^.]+)\.puter\.site/) || [])[1] || null,
            resolvePublishedDir: async (p) => p,
            absolutizeSocialImagesInRelease: async () => {},
            saveCurrentChat: async () => log.push('save'),
            puter: { hosting: { create: async (sub) => log.push('create:' + sub), delete: async (sub) => log.push('delete:' + sub) } },
        };
        sb.window = Object.assign(sb, {
            currentPublishedUrl: 'https://old.puter.site/',
            currentPublishedPath: '/pub/p/r1',
            refreshPublishButton: () => log.push('refresh'),
            refreshPublishCards: () => {},
            isPublishStarting: (id) => starting && id === 'p',
        });
        vm.createContext(sb);
        vm.runInContext(extract(uiSource, 'function addressChangedNoteMessage(oldUrl, newUrl) {') + '\n' + extract(uiSource, 'function pushAiNote(history, note) {') + '\n' + uiSource.slice(start, end), sb);
        return { sb, log };
    }
    const ok = make();
    const r = await ok.sb.changePublishedAddress(' New ');
    const note = ok.sb.chatHistory[0];
    check('change: the new address is created before the old one goes, and the project points at it',
        r.changed && r.open && r.url === 'https://new.puter.site/' && ok.log.join() === 'create:new,delete:old,save,refresh'
        && ok.sb.currentPublishedUrl === 'https://new.puter.site/', ok.log.join());
    check('change: a hidden note tells the AI the old address no longer works',
        note && note.versionNote && note.content[0].type === 'text-hidden'
        && note.content[0].text.includes('https://old.puter.site/') && note.content[0].text.includes('https://new.puter.site/'));
    const turn = make({ blocked: 'task' });
    let code = null;
    try { await turn.sb.changePublishedAddress('new'); } catch (e) { code = e.code; }
    check('during a turn: refused, nothing created', code === 'busy' && turn.log.length === 0);
    // A publish saving the Code view's edits first is a publish: it goes on
    // to update the address being moved, and could retire the release the
    // new address was just pointed at.
    const saving = make({ starting: true });
    code = null;
    try { await saving.sb.changePublishedAddress('new'); } catch (e) { code = e.code; }
    check('while a publish saves code first: refused, nothing created', code === 'busy' && saving.log.length === 0, saving.log.join());
    // A publish running: it updates the address being moved.
    const publishing = make({ busy: true });
    code = null;
    try { await publishing.sb.changePublishedAddress('new'); } catch (e) { code = e.code; }
    check('while a publish runs: refused, nothing created', code === 'busy' && publishing.log.length === 0, publishing.log.join());
    // The published files can't be found: the new address would point at
    // nothing, and the old one would be dropped.
    const lost = make();
    lost.sb.resolvePublishedDir = async () => null;
    code = null;
    try { await lost.sb.changePublishedAddress('new'); } catch (e) { code = e.code; }
    check('no published files: refused, nothing created or dropped', code === 'no-files'
        && !lost.log.some(l => l.startsWith('create') || l.startsWith('delete')), lost.log.join());
    check('…and the project isn\'t left marked as changing', lost.sb.isAddressChanging('p') === false);
    const bad = make();
    try { await bad.sb.changePublishedAddress('-bad-'); } catch (e) { code = e.code; }
    check('an invalid address is refused', code === 'invalid-name' && bad.log.length === 0);
    const same = make();
    const s2 = await same.sb.changePublishedAddress('old');
    check('the same address: nothing to change', s2.changed === false && same.log.length === 0);
    check('the flag clears afterwards', ok.sb.isAddressChanging() === false);

    // Per project: a send in another project doesn't wait for this one.
    const slow = make();
    let finishCreate;
    slow.sb.puter.hosting.create = () => new Promise((res) => { finishCreate = res; });
    const pending = slow.sb.changePublishedAddress('newer');
    for (let i = 0; i < 20 && !finishCreate; i++) await new Promise(setImmediate);
    check('while it runs: this project is changing, another one isn\'t',
        slow.sb.isAddressChanging() === true && slow.sb.isAddressChanging('p') === true
        && slow.sb.isAddressChanging('other') === false);
    finishCreate();
    await pending;
    check('…and neither is, once it ends', slow.sb.isAddressChanging('p') === false && slow.sb.isAddressChanging() === false);

    // Two projects at once: the user opened another one while the first ran.
    const two = make();
    let finishFirst;
    two.sb.puter.hosting.create = (sub) => sub === 'first-new'
        ? new Promise((res) => { finishFirst = res; })
        : Promise.resolve(two.log.push('create:' + sub));
    const first = two.sb.changePublishedAddress('first-new');
    for (let i = 0; i < 20 && !finishFirst; i++) await new Promise(setImmediate);
    two.sb.currentChatId = 'q';
    two.sb.currentPublishedUrl = 'https://q-old.puter.site/';
    two.sb.currentPublishedPath = '/pub/q/r1';
    let err = null, second = null;
    try { second = await two.sb.changePublishedAddress('q-new'); } catch (e) { err = e; }
    check('another project can change its address meanwhile', !err && second && second.changed && second.url === 'https://q-new.puter.site/', err && err.code);
    check('…and the first is still changing', two.sb.isAddressChanging('p') === true && two.sb.isAddressChanging('q') === false);
    err = null;
    two.sb.currentChatId = 'p';
    try { await two.sb.changePublishedAddress('again'); } catch (e) { err = e; }
    check('the same project can\'t start a second change', err && err.code === 'busy');
    finishFirst();
    await first;
    check('both done: none changing', two.sb.isAddressChanging() === false);
}

// ---- A turn that is gone shows nothing --------------------------------------
{
    const { env, tool, cards } = setup();
    env.isStaleTurn = () => true;
    const r = await tool.exec({ address: 'x' }, {});
    check('stale turn: no card', cards().length === 0 && r.__publish_offer === true);
}

// ---- A reloaded chat ---------------------------------------------------------
{
    const { env, cards, q } = setup();
    env.renderPublishCard({ address: 'saved-name' });
    check('reload: the card is drawn from its saved address', q(cards()[0], '.publish-card-input').value === 'saved-name');
    env.currentPublishedUrl = 'https://used.puter.site/';
    env.renderPublishCard({ address: 'used', offer: 'offer-1', publishedUrl: 'https://used.puter.site/' });
    env.renderPublishCard({ address: 'latest', offer: 'offer-2' });
    const [unused, used, latest] = cards();
    check('reload: an older unused card is hidden', unused.classList.contains('is-superseded'));
    check('reload: an older card published from reads Published', /Published/.test(used.textContent) && q(used, '.publish-card-link'));
    check('reload: the newest is the control, drawn from the state', q(latest, '.publish-card-btn').textContent === 'Publish changes');
    const app = read('../src/js/app.js');
    // The call's arguments, in any order.
    const from = app.indexOf('} else if (toolResponse.__publish_offer) {');
    const call = from < 0 ? '' : app.slice(app.indexOf('window.renderPublishCard?.({', from), app.indexOf('});', from));
    check('loadChat shows a saved card again, with its id, its publish and its kind',
        ['address: toolResponse.address', 'offer: toolResponse.offer', 'publishedUrl: message.publishCardUrl', 'kind: toolResponse.kind']
            .every(arg => call.includes(arg)), call);
    // Run, not read: what the model is sent has no publishCardUrl, and the
    // saved history keeps it.
    const ha = helpersSource.indexOf('function prepareHistoryForAI(');
    const hb = helpersSource.indexOf('/**\n * Sum the AI-reported cost', ha);
    const { prepareHistoryForAI } = new Function('window', helpersSource.slice(ha, hb) + '\nreturn { prepareHistoryForAI };')({});
    const saved = [
        { role: 'system', content: 'x' },
        { role: 'assistant', content: [{ type: 'tool_use', id: 't1', name: 'OfferPublish', input: {} }] },
        { role: 'user', content: { type: 'tool_result', tool_use_id: 't1', content: '{"__publish_offer":true}' }, publishCardUrl: 'https://a.puter.site/' },
    ];
    const sent = prepareHistoryForAI(saved);
    check('the saved publish never reaches the model, and stays saved',
        sent.every(m => !('publishCardUrl' in m)) && saved[2].publishCardUrl === 'https://a.puter.site/', JSON.stringify(sent));
}

// ---- Keyboard focus survives the redraws ------------------------------------
// The busy redraw replaced the focused Publish button, dropping focus to the
// page: a keyboard user's next Tab started from the top of it.
{
    const { env, tool, cards, q, calls, dom } = setup();
    await tool.exec({ address: 'shop' }, {});
    const card = cards()[0];
    const btn = q(card, '.publish-card-btn');
    btn.focus();
    dom.dispatch(btn, 'keydown', { key: 'Enter' }); // not the field: nothing
    dom.dispatch(btn, 'click');
    env.busy = true;
    env.refreshPublishCards();
    const inner = q(card, '.publish-card-inner');
    check('publishing: focus stays on the card while its button is disabled',
        dom.document.activeElement === inner && inner.getAttribute('tabindex') === '-1');
    env.busy = false;
    env.currentPublishedUrl = 'https://shop.puter.site/';
    env.currentPublishedVersionId = 'v2';
    env._projectDirtySinceSnapshot = false;
    await calls[0].success({ url: 'https://shop.puter.site/', isFirst: true });
    check('live: focus moves to the site\'s link', dom.document.activeElement === q(card, '.publish-card-link'));
    env._projectDirtySinceSnapshot = true;
    env.refreshPublishCards();
    check('changes since: focus moves to Publish changes', dom.document.activeElement === q(card, '.publish-card-btn'));

    // Focus elsewhere is left alone.
    const composer = dom.document.createElement('textarea');
    dom.body.appendChild(composer);
    composer.focus();
    env.busy = true;
    env.refreshPublishCards();
    check('a redraw leaves focus outside the card alone', dom.document.activeElement === composer);
}

// ---- …and the button waiting in place --------------------------------------
// A publish that first saves the Code view's edits disables the button without
// a redraw. The browser drops focus from a disabled button to the page, so a
// keyboard user's Publish left them at the top of it.
{
    const { env, tool, cards, q, dom } = setup();
    env.currentPublishedUrl = 'https://shop.puter.site/';
    env.currentPublishedVersionId = 'v1';
    await tool.exec({}, {});
    const card = cards()[0];
    const btn = q(card, '.publish-card-btn');
    btn.focus();
    env.isPublishStarting = () => true; // saving the Code view's edits
    env.refreshPublishCards();
    const inner = q(card, '.publish-card-inner');
    check('the button waits, in place', q(card, '.publish-card-btn') === btn && btn.disabled === true);
    check('…and focus moves to the card', dom.document.activeElement === inner && inner.getAttribute('tabindex') === '-1');
    env.isPublishStarting = () => false;
    const composer = dom.document.createElement('textarea');
    dom.body.appendChild(composer);
    composer.focus();
    env.blocked = 'task';
    env.refreshPublishCards();
    check('a button waiting without focus leaves focus alone', dom.document.activeElement === composer);
}

// ---- An error is about its own attempt --------------------------------------
// A failed Publish changes left its error on the card. The user then published
// from the toolbar, so the card read Live; the next change the AI made brought
// the card back to Publish changes, with the old error under it, as if that
// publish had failed too.
{
    const { env, tool, cards, q, calls, dom } = setup();
    env.currentPublishedUrl = 'https://bakery.puter.site/';
    env.currentPublishedVersionId = 'v1';
    await tool.exec({}, {});
    const card = cards()[0];
    dom.dispatch(q(card, '.publish-card-btn'), 'click');
    calls[0].fail(new Error('network'));
    check('a failed Publish changes shows its error', !!q(card, '.publish-card-error'));
    env.refreshPublishCards();
    check('…which a redraw in the same state keeps', !!q(card, '.publish-card-error'));
    env.busy = true; // the toolbar publishes
    env.refreshPublishCards();
    check('another publish starting drops the error', !q(card, '.publish-card-error'));
    env.busy = false;
    env._projectDirtySinceSnapshot = false; env.currentPublishedVersionId = 'v2';
    env.refreshPublishCards();
    env._projectDirtySinceSnapshot = true; // the AI changes something
    env.refreshPublishCards();
    check('…and it doesn\'t come back with the next changes',
        card.getAttribute('data-mode') === 'changes' && !q(card, '.publish-card-error'));

    // Without a publish in between: Live, then changes again.
    dom.dispatch(q(card, '.publish-card-btn'), 'click');
    calls[1].fail(new Error('network'));
    env._projectDirtySinceSnapshot = false; // up to date: Live
    env.refreshPublishCards();
    env._projectDirtySinceSnapshot = true;
    env.refreshPublishCards();
    check('a change of state drops it too', !q(card, '.publish-card-error'));
}

// ---- A failure doesn't take focus from where the user moved on to ----------
// A publish takes a few seconds, and the user may start typing their next
// message meanwhile: the error went beside the field and pulled focus into
// it, mid-sentence.
{
    const { env, tool, cards, q, calls, dom } = setup();
    await tool.exec({ address: 'shop' }, {});
    const card = cards()[0];
    dom.dispatch(q(card, '.publish-card-btn'), 'click');
    const composer = dom.document.createElement('textarea');
    dom.body.appendChild(composer);
    composer.focus();
    const err = new Error('taken'); err.code = 'name-taken';
    calls[0].fail(err);
    check('failure while typing elsewhere: the error shows, focus stays put',
        q(card, '.publish-card-error') && dom.document.activeElement === composer);
    env.renameResult = Object.assign(new Error('busy'), { code: 'busy' });
    env.currentPublishedUrl = 'https://shop.puter.site/';
    await env.tools.find(t => t.function.name === 'OfferAddressChange').exec({ address: 'shop-2' }, {});
    const addr = cards()[1];
    dom.dispatch(q(addr, '.publish-card-btn'), 'click');
    await new Promise(setImmediate);
    check('…and a failed address change too, saying why it was refused',
        q(addr, '.publish-card-error') && q(addr, '.publish-card-error').textContent === 'Wait for the current task to finish, then try again.'
        && dom.document.activeElement === composer, q(addr, '.publish-card-error')?.textContent);
}

// ---- How it went, after the user opened another project ---------------------
// The card's failure went only onto the card, which a switch had taken off
// the screen: nothing told the user, and the project still read Publish when
// they came back. And a user who came back mid-publish has a new copy of the
// card, drawn by loadChat: the old one got the outcome.
{
    const { env, tool, cards, q, calls, dom, chatBox } = setup();
    const toasts = [];
    env.showToast = (text, opts) => toasts.push({ text, opts });
    const r = await tool.exec({ address: 'shop' }, {});
    dom.dispatch(q(cards()[0], '.publish-card-btn'), 'click');
    env.currentChatId = 'project-b';
    chatBox.textContent = '';
    const err = new Error('taken'); err.code = 'name-taken';
    calls[0].fail(err);
    check('failure in another project: a toast says so, with the reason',
        toasts.length === 1 && toasts[0].opts.type === 'error'
        && toasts[0].text === 'Your site couldn’t be published. That address is taken. Try another.', JSON.stringify(toasts));
    calls[0].fail(new Error('network'));
    check('…a generic failure reads plainly', toasts[1] && toasts[1].text === 'Your site couldn’t be published. Please try again.', JSON.stringify(toasts[1]));

    // Back to the project before it ended: the card is drawn again.
    env.currentChatId = 'project-a';
    dom.dispatch(q(env.renderPublishCard({ address: 'shop', offer: r.offer })[0], '.publish-card-btn'), 'click');
    chatBox.textContent = '';
    const again = env.renderPublishCard({ address: 'shop', offer: r.offer })[0];
    calls[1].fail(err);
    check('back in the project: the error is on the card that is showing',
        q(again, '.publish-card-error') && q(again, '.publish-card-error').textContent === 'That address is taken. Try another.'
        && toasts.length === 2);
    env.currentPublishedUrl = 'https://shop.puter.site/';
    env.currentPublishedVersionId = 'v2';
    await calls[1].success({ url: 'https://shop.puter.site/', isFirst: true });
    check('…and a success marks that card as published from',
        again.getAttribute('data-published-url') === 'https://shop.puter.site/');

    // The address change, the same way.
    env.renameResult = Object.assign(new Error('taken'), { taken: true });
    await env.tools.find(t => t.function.name === 'OfferAddressChange').exec({ address: 'shop-2' }, {});
    dom.dispatch(q(cards()[cards().length - 1], '.publish-card-btn'), 'click');
    env.currentChatId = 'project-b';
    chatBox.textContent = '';
    await new Promise(setImmediate);
    check('a failed address change in another project: a toast',
        toasts.length === 3 && toasts[2].text === 'Your site’s address couldn’t be changed. That address is taken. Try another.', JSON.stringify(toasts[2]));
}

// ---- Phones: the field is 16px ----------------------------------------------
// iOS Safari zooms the page when a field under 16px gets focus, and stays
// zoomed. The card's field was 13px, beside a .puter.site suffix that phones
// already draw at 16px.
{
    const css = read('../src/css/styles.css');
    const base = css.indexOf('.publish-card-input {');
    const zoomNote = css.indexOf('iOS Safari zooms the whole page');
    const list = css.slice(zoomNote, css.indexOf('font-size: 16px', zoomNote));
    check('on phones the card\'s field is 16px, after its base rule so it wins',
        base > 0 && zoomNote > base && /\.publish-card-input,/.test(list), list);
}

// ---- A narrow card puts the button under the field --------------------------
// Beside the button on a phone, the field was so narrow that a long address
// was cut off against its .puter.site suffix ("bakery-ord.puter.site").
{
    const css = read('../src/css/styles.css');
    const inner = extract(css, '.publish-card-inner {');
    check('the card is a size container', /container-type: inline-size/.test(inner));
    check('a narrow card wraps the rows with a field, the field taking the whole row',
        /@container \(max-width: \d+px\) \{\s*\.publish-card-row\.has-field \{ flex-wrap: wrap;[\s\S]*?\.publish-card-row\.has-field > \.publish-card-address \{ flex-basis: calc\(100% \+ 6px\); \}/.test(css));
    const { env, tool, cards, q, addressTool } = setup();
    await tool.exec({ address: 'shop' }, {});
    check('the publish form\'s row has a field', q(cards()[0], '.publish-card-row').classList.contains('has-field'));
    env.currentPublishedUrl = 'https://shop.puter.site/';
    await addressTool.exec({ address: 'shop-2' }, {});
    check('so does the address change\'s', q(cards()[1], '.publish-card-row').classList.contains('has-field'));
    await tool.exec({}, {});
    check('the Publish changes row doesn\'t (its link shortens instead)', !q(cards()[2], '.publish-card-row').classList.contains('has-field'));
}

// ---- An address change is counted after a switch too -------------------------
{
    const { env, addressTool, cards, q, dom, events } = setup();
    env.currentPublishedUrl = 'https://shop.puter.site/';
    await addressTool.exec({ address: 'shop-2' }, {});
    env.renameResult = { changed: true, url: 'https://shop-2.puter.site/', oldUrl: 'https://shop.puter.site/', open: false };
    dom.dispatch(q(cards()[0], '.publish-card-btn'), 'click');
    await new Promise(setImmediate);
    check('an address change that ends in another project is still counted',
        events.some(e => e.event === 'Site Address Changed' && e.props.source === 'chat'), JSON.stringify(events));
}

// ---- …and recorded on its card, in its own project ---------------------------
// The card's outcome is saved on its tool result (publishCardUrl), so it reads
// as used after a reload. Once another project was open, it was dropped: back
// in the project, an unused-looking Change address card offered to move the
// site to the address it already had.
{
    const { env, tool, addressTool, cards, q, calls, dom } = setup();
    const files = new Map();
    const locks = [];
    env.chatFilePath = (id) => `chat-history/${id}.json`;
    env.withChatFileLock = (id, fn) => { locks.push(id); return fn(); };
    env.puter.fs = {
        read: async (p) => ({ text: async () => files.get(p) }),
        write: async (p, d) => { files.set(p, d); },
    };
    const toolResult = (r) => ({ role: 'user', content: { type: 'tool_result', tool_use_id: 't', content: JSON.stringify(r) } });
    const saved = (offer) => JSON.parse(files.get('chat-history/project-a.json')).history
        .find(m => m.content && m.content.content && m.content.content.includes(offer));

    env.currentPublishedUrl = 'https://shop.puter.site/';
    const r = await addressTool.exec({ address: 'shop-2' }, {});
    files.set('chat-history/project-a.json', JSON.stringify({ id: 'project-a', history: [toolResult(r)] }));
    env.renameResult = { changed: true, url: 'https://shop-2.puter.site/', oldUrl: 'https://shop.puter.site/', open: false };
    dom.dispatch(q(cards()[0], '.publish-card-btn'), 'click');
    env.currentChatId = 'project-b'; // opened while it ran
    env.chatHistory = [];
    for (let i = 0; i < 5; i++) await new Promise(setImmediate);
    check('an address change that ends in another project: recorded in its own saved conversation',
        saved(r.offer)?.publishCardUrl === 'https://shop-2.puter.site/' && locks.includes('project-a'),
        files.get('chat-history/project-a.json'));
    check('…and the open project\'s conversation is left alone', env.chatHistory.length === 0);

    // A publish from a card that went live once another project was open.
    env.currentChatId = 'project-a';
    env.currentPublishedUrl = null;
    const p = await tool.exec({ address: 'cafe' }, {});
    files.set('chat-history/project-a.json', JSON.stringify({ id: 'project-a', history: [toolResult(p)] }));
    dom.dispatch(q(cards()[cards().length - 1], '.publish-card-btn'), 'click');
    env.currentChatId = 'project-b';
    await calls.at(-1).away({ chatId: 'project-a', url: 'https://cafe.puter.site/', isFirst: true });
    check('a card publish that ends in another project: recorded the same way',
        saved(p.offer)?.publishCardUrl === 'https://cafe.puter.site/');

    // Live while the project was open, but it was left while that was saved.
    env.currentChatId = 'project-a';
    const p2 = await tool.exec({}, {});
    files.set('chat-history/project-a.json', JSON.stringify({ id: 'project-a', history: [toolResult(p2)] }));
    dom.dispatch(q(cards()[cards().length - 1], '.publish-card-btn'), 'click');
    env.currentChatId = 'project-b';
    await calls.at(-1).success({ url: 'https://cafe.puter.site/', isFirst: false });
    check('…and one left during its last save too', saved(p2.offer)?.publishCardUrl === 'https://cafe.puter.site/');
}

// ---- The field's error and note are tied to it ------------------------------
{
    const { env, tool, addressTool, cards, q, calls, dom } = setup();
    await tool.exec({ address: 'shop' }, {});
    const card = cards()[0];
    check('no error: the field isn\'t marked invalid or described',
        !q(card, '.publish-card-input').hasAttribute('aria-invalid') && !q(card, '.publish-card-input').hasAttribute('aria-describedby'));
    dom.dispatch(q(card, '.publish-card-btn'), 'click');
    calls[0].fail(Object.assign(new Error('taken'), { code: 'name-taken' }));
    const input = q(card, '.publish-card-input');
    const errEl = q(card, '.publish-card-error');
    check('an error: the field is invalid, and described by the error',
        input.getAttribute('aria-invalid') === 'true' && errEl.getAttribute('id') && input.getAttribute('aria-describedby') === errEl.getAttribute('id'));
    input.value = 'shop-2';
    dom.dispatch(input, 'input');
    check('typing a fix: no longer invalid', !input.hasAttribute('aria-invalid'));
    env.currentPublishedUrl = 'https://shop.puter.site/';
    await addressTool.exec({ address: 'shop-3' }, {});
    const addr = cards()[1];
    const note = q(addr, '.publish-card-note');
    check('the address change\'s field is described by its warning, with its own id',
        note.getAttribute('id') && note.getAttribute('id') !== errEl.getAttribute('id')
        && q(addr, '.publish-card-input').getAttribute('aria-describedby') === note.getAttribute('id'));
}

// ---- Wiring --------------------------------------------------------------------
{
    const vite = read('../vite.config.js');
    check('bundled after ui.js', vite.indexOf("'tools/chat_ui/publish.js'") > vite.indexOf("'js/ui.js'"));
    check('the address tool is bundled after the card', vite.indexOf("'tools/chat_ui/address.js'") > vite.indexOf("'tools/chat_ui/publish.js'"));
    const refresh = extract(uiSource, 'window.refreshPublishButton = function () {');
    check('the toolbar refresh redraws the cards first, before any early return',
        refresh.indexOf('refreshPublishCards') > 0 && refresh.indexOf('refreshPublishCards') < refresh.indexOf('return'));
    check('the busy state redraws the cards', /function setPublishBusy[\s\S]*?refreshPublishCards[\s\S]*?\n}\n/.test(uiSource));
    const tools = read('../src/js/tools.js');
    check('OfferPublish writes no files (no preview clear)', /PREVIEW_SAFE_TOOLS = new Set\(\[[\s\S]*'OfferPublish'[\s\S]*?\]\)/.test(tools));
    check('nor does OfferAddressChange', /PREVIEW_SAFE_TOOLS = new Set\(\[[\s\S]*'OfferAddressChange'[\s\S]*?\]\)/.test(tools));
    const prompt = read('../src/js/prompt.js');
    check('the prompt points a publish request at OfferPublish', /When the user asks you to publish it, call the OfferPublish tool/.test(prompt));
    check('and an address change at OfferAddressChange', /change the published site's address, call OfferAddressChange/.test(prompt));
    const doPublish = extract(uiSource, 'async function doPublish({ reserved = null } = {}) {');
    check('the popover publishes through publishProject too', /return publishProject\(\{/.test(doPublish));
}

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all publish-card checks passed');
