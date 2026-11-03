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
}

// ---- The address change itself (ui.js) ----------------------------------------
{
    const start = uiSource.indexOf('let _addressChanging = false;');
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
        vm.runInContext(extract(uiSource, 'function addressChangedNoteMessage(oldUrl, newUrl) {') + '\n' + uiSource.slice(start, end), sb);
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
    check('loadChat shows a saved card again, with its id and its publish',
        /toolResponse\.__publish_offer\)[\s\S]{0,400}renderPublishCard\?\.\(\{\s*address: toolResponse\.address,\s*offer: toolResponse\.offer,\s*publishedUrl: message\.publishCardUrl,/.test(app));
    check('the saved publish never reaches the model', /delete msg\.publishCardUrl/.test(helpersSource));
    check('loadChat passes the card\'s kind', /publishedUrl: message\.publishCardUrl,\s*kind: toolResponse\.kind,/.test(app));
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
    const doPublish = extract(uiSource, 'async function doPublish() {');
    check('the popover publishes through publishProject too', /return publishProject\(\{/.test(doPublish));
}

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all publish-card checks passed');
