import fs from 'node:fs';
import vm from 'node:vm';
import { makeDom } from './lib/mini-dom.mjs';

// ---- Publishing from the chat ----------------------------------------------
// When the user asks the AI to publish, it calls OfferPublish and a Publish
// card appears in the chat (src/tools/chat_ui/publish.js). The user publishes
// by clicking it, through the same publishProject as the toolbar's popover.
// The card draws the project's publish state, so it reads like the toolbar:
// an address and Publish before the first publish, Publish changes when the
// live site is behind, Live once it's up to date. Its button waits while a
// turn runs. Runs the REAL card code (mini DOM) with publishProject stubbed;
// the real publishProject is driven with a card's hooks in
// test-publish-analytics.mjs.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const cardSource = read('../src/tools/chat_ui/publish.js');
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
    const tool = env.tools.find(t => t.function.name === 'OfferPublish');
    const cards = () => chatBox.querySelectorAll('.publish-card');
    const q = (el, sel) => el.querySelector(sel);
    return { env, dom, chatBox, tool, cards, q, calls, events, announced };
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
    calls[1].success({ isFirst: true });
    env.refreshPublishCards();
    check('success: read out', t.announced.includes('Your website is live.'));
    const link = q(card, '.publish-card-link');
    check('success: Live, with the address as a link',
        /Live/.test(card.textContent) && link && link.getAttribute('href') === 'https://bakery-2.puter.site/'
        && link.textContent === 'bakery-2.puter.site' && link.getAttribute('target') === '_blank');
    check('success: no button left', !q(card, '.publish-card-btn'));

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
    check('every card shows the same state', cards().length === 2 && cards().every(c => /Live/.test(c.textContent) && !q(c, '.publish-card-btn')));
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
    const app = read('../src/js/app.js');
    check('loadChat shows a saved card again', /toolResponse\.__publish_offer\)[\s\S]{0,200}renderPublishCard\?\.\(\{ address: toolResponse\.address \}\)/.test(app));
}

// ---- Wiring --------------------------------------------------------------------
{
    const vite = read('../vite.config.js');
    check('bundled after ui.js', vite.indexOf("'tools/chat_ui/publish.js'") > vite.indexOf("'js/ui.js'"));
    const refresh = extract(uiSource, 'window.refreshPublishButton = function () {');
    check('the toolbar refresh redraws the cards first, before any early return',
        refresh.indexOf('refreshPublishCards') > 0 && refresh.indexOf('refreshPublishCards') < refresh.indexOf('return'));
    check('the busy state redraws the cards', /function setPublishBusy[\s\S]*?refreshPublishCards[\s\S]*?\n}\n/.test(uiSource));
    const tools = read('../src/js/tools.js');
    check('OfferPublish writes no files (no preview clear)', /PREVIEW_SAFE_TOOLS = new Set\(\[[\s\S]*'OfferPublish'[\s\S]*?\]\)/.test(tools));
    const prompt = read('../src/js/prompt.js');
    check('the prompt points a publish request at OfferPublish', /When the user asks you to publish it, call the OfferPublish tool/.test(prompt));
    const doPublish = extract(uiSource, 'async function doPublish() {');
    check('the popover publishes through publishProject too', /return publishProject\(\{/.test(doPublish));
}

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all publish-card checks passed');
