import fs from 'node:fs';
import vm from 'node:vm';
import { makeDom } from './lib/mini-dom.mjs';

// ---- The hint under Publish ---------------------------------------------------
// js/publish-hint.js: shows once in a browser, ever, after a clean build in a
// project with a preview that isn't published, for someone who has never
// published a project. Waits for the preview to load and for the user to be
// able to see it (tab in front, button on screen, no dialog, popover, clarify
// card or refreshing preview). A new build or a project switch drops the
// wait. What closes it, what each way is tracked as, where it sits, and that
// its Publish opens the popover as the hint's. Runs the REAL module on the
// mini DOM with a fake clock and storage. Then text-asserts the wiring.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const SRC = read('../src/js/publish-hint.js');

function memoryStorage(seed = {}) {
    const m = new Map(Object.entries(seed));
    return {
        map: m,
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { m.set(k, String(v)); },
        removeItem: (k) => { m.delete(k); },
    };
}
const blocked = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('SecurityError'); },
    removeItem() { throw new Error('SecurityError'); },
};

const SHOW_AFTER = 1500;

function setup({ storage = memoryStorage(), published = null, preview = 'https://draft.puter.site/', user = { username: 'u' }, chat = 'chat_a', viewportW = 1200 } = {}) {
    const dom = makeDom();
    const { document, body, $, El } = dom;
    const calls = { track: [], open: [], announce: [] };
    const state = { buttonVisible: true };

    // Layout: the hint is 300x130, the Publish button 80x28 near the top
    // right of a 1200x800 window.
    Object.defineProperty(El.prototype, 'offsetHeight', { configurable: true, get() { return this.hasClass('publish-hint') ? 130 : 0; } });
    Object.defineProperty(El.prototype, 'offsetWidth', { configurable: true, get() { return this.hasClass('publish-hint') ? 300 : 0; } });

    const toolbar = document.createElement('div');
    toolbar.addClass('preview-toolbar');
    body.appendChild(toolbar);
    const btn = document.createElement('button');
    btn.addClass('preview-publish-btn');
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.getClientRects = () => (state.buttonVisible ? [{}] : []);
    btn.getBoundingClientRect = () => ({ left: 1100, right: 1180, width: 80, top: 12, bottom: 40 });
    toolbar.appendChild(btn);

    let now = 0, nextId = 1;
    const timers = [];
    const setTimeoutFake = (fn, ms) => { const id = nextId++; timers.push({ id, at: now + ms, fn }); return id; };
    const clearTimeoutFake = (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); };
    function advance(ms) {
        const end = now + ms;
        for (;;) {
            timers.sort((a, b) => a.at - b.at);
            if (!timers.length || timers[0].at > end) break;
            const t = timers.shift();
            now = t.at;
            t.fn();
        }
        now = end;
    }

    const observers = { mutation: [], resize: [] };
    class MutationObserverFake { constructor(fn) { this.fn = fn; this.on = false; observers.mutation.push(this); } observe() { this.on = true; } disconnect() { this.on = false; } }
    class ResizeObserverFake { constructor(fn) { this.fn = fn; this.on = false; observers.resize.push(this); } observe() { this.on = true; } disconnect() { this.on = false; } }
    const winListeners = {};
    document.visibilityState = 'visible';
    document.documentElement.clientWidth = viewportW;

    const env = {
        console, Promise, Math, JSON, $, document, localStorage: storage,
        setTimeout: setTimeoutFake, clearTimeout: clearTimeoutFake,
        MutationObserver: MutationObserverFake, ResizeObserver: ResizeObserverFake,
        innerWidth: viewportW, innerHeight: 800,
        addEventListener: (ev, fn) => { (winListeners[ev] ||= []).push(fn); },
        removeEventListener: (ev, fn) => { winListeners[ev] = (winListeners[ev] || []).filter((f) => f !== fn); },
        user, currentPreviewUrl: preview, currentPublishedUrl: published,
        cross_svg: '<svg></svg>',
        track: (name, props) => calls.track.push({ name, props }),
        announce: (text) => calls.announce.push(text),
        openPublishPanel: (opts) => calls.open.push(opts),
        isInPuterDialog: (t) => !!(t && t.closest && t.closest('puter-alert')),
    };
    env.window = env;
    env.currentChatId = chat;
    vm.createContext(env);
    vm.runInContext(SRC, env);

    const hint = () => document.querySelector('.publish-hint');
    const add = (html) => { const [el] = dom.parseHTML(html); el.ownerDocument = document; body.appendChild(el); return el; };
    const press = (target) => document.fire('pointerdown', { target });
    const key = (k) => document.fire('keydown', { key: k });
    const click = (sel) => hint().querySelector(sel).fire('click');
    const closed = () => calls.track.filter((t) => t.name === 'Publish Hint Closed').map((t) => t.props.how);
    const shownCount = () => calls.track.filter((t) => t.name === 'Publish Hint Shown').length;
    return { env, PH: env.PublishHint, dom, document, body, btn, state, calls, storage, advance, hint, add, press, key, click, closed, shownCount, observers, winListeners };
}

const done = (t, extra = {}) => t.PH.buildDone({ chatId: 'chat_a', everPublished: false, ...extra });

// ---- When it shows ------------------------------------------------------------
{
    const t = setup();
    done(t);
    t.advance(SHOW_AFTER - 1);
    check('waits for the preview to load before showing', !t.hint());
    t.advance(1);
    check('shows after a clean build in an unpublished project', !!t.hint());
    check('it says what Publish does, in plain words', t.hint().textContent.includes('Put it online')
        && t.hint().textContent.includes('Publish gives your project a link anyone can open.'));
    check('it has Not now, Publish and a close button', !!t.hint().querySelector('.publish-hint-later')
        && !!t.hint().querySelector('.publish-hint-go') && !!t.hint().querySelector('.publish-hint-close'));
    check('the Publish button pulses while it is up', t.btn.hasClass('is-hinted'));
    check('tracked as shown', t.shownCount() === 1);
    check('a screen reader hears it', t.calls.announce.length === 1 && t.calls.announce[0].startsWith('Put it online.'));
    check('counted as shown in this browser', t.storage.map.get('builder.publishHint') === '1');
    check('isUp says so', t.PH.isUp() === true);
}

{
    const t = setup({ storage: memoryStorage({ 'builder.publishHint': '1' }) });
    done(t);
    t.advance(10000);
    check('never shows again once it has shown in this browser', !t.hint());
}

{
    const t = setup();
    done(t);
    t.advance(SHOW_AFTER);
    t.click('.publish-hint-later');
    done(t);
    t.advance(10000);
    check('not a second time in the same load either', !t.hint() && t.shownCount() === 1);
}

{
    const t = setup();
    done(t, { everPublished: true });
    t.advance(10000);
    check('not for someone who has published a project before', !t.hint());
}

{
    const t = setup({ published: 'https://mine.puter.site/' });
    done(t);
    t.advance(10000);
    check('not for a project that is published already', !t.hint());
}

{
    const t = setup({ preview: null });
    done(t);
    t.advance(10000);
    check('not without a preview (nothing to publish)', !t.hint());
}

{
    const t = setup({ user: null });
    done(t);
    t.advance(10000);
    check('not when signed out', !t.hint());
}

{
    const t = setup();
    done(t);
    t.env.currentChatId = 'chat_b';
    t.advance(10000);
    check('not once the user has switched to another project', !t.hint());
    t.env.currentChatId = 'chat_a';
    t.advance(10000);
    check('and switching back does not bring the old wait back', !t.hint());
}

{
    const t = setup();
    done(t);
    t.PH.setBusy(true);
    t.advance(10000);
    check('a new build before it shows drops the wait', !t.hint());
    t.PH.setBusy(false);
    done(t);
    t.advance(SHOW_AFTER);
    check('the next clean build tries again', !!t.hint());
}

// ---- It waits until the user can see it -------------------------------------
const waits = [
    ['the Publish button is off screen (a phone on the chat view)', (t) => { t.state.buttonVisible = false; }, (t) => { t.state.buttonVisible = true; }],
    ['the tab is in the background', (t) => { t.document.visibilityState = 'hidden'; }, (t) => { t.document.visibilityState = 'visible'; }],
    ['a dialog is up', (t) => t.add('<div class="upgrade-modal" role="dialog" aria-modal="true"></div>'), (t, el) => el.remove()],
    ["one of Puter's dialogs is up", (t) => t.add('<puter-alert></puter-alert>'), (t, el) => el.remove()],
    ['a popover is open', (t) => t.add('<button class="preview-versions" aria-haspopup="dialog" aria-expanded="true"></button>'), (t, el) => el.setAttribute('aria-expanded', 'false')],
    ['the Publish popover is open', (t) => { t.btn.setAttribute('aria-expanded', 'true'); }, (t) => { t.btn.setAttribute('aria-expanded', 'false'); }],
    ['a clarify card waits on an answer', (t) => t.add('<div class="clarify-card"></div>'), (t, el) => el.remove()],
    ["fast mode's bubble is up", (t) => t.add('<div class="fast-mode-hint"></div>'), (t, el) => el.remove()],
    ['the preview is still applying the build', (t) => t.add('<div class="preview-updating"></div>'), (t, el) => el.remove()],
    ['a publish is running (the button is disabled)', (t) => { t.btn.props.disabled = true; }, (t) => { t.btn.props.disabled = false; }],
];
for (const [what, block, unblock] of waits) {
    const t = setup();
    const el = block(t);
    done(t);
    t.advance(SHOW_AFTER + 5000);
    const waited = !t.hint();
    unblock(t, el);
    t.advance(1000);
    check(`waits while ${what}, then shows`, waited && !!t.hint());
}

// ---- What closes it -----------------------------------------------------------
function upHint(opts) {
    const t = setup(opts);
    done(t);
    t.advance(SHOW_AFTER);
    return t;
}
const gone = (t) => !t.hint() && !t.btn.hasClass('is-hinted') && !t.PH.isUp();

{
    const t = upHint();
    t.click('.publish-hint-go');
    check("its Publish closes it as 'publish'", gone(t) && t.closed().join() === 'publish');
    check('and opens the Publish popover as the hint\'s', t.calls.open.length === 1 && t.calls.open[0].source === 'hint');
}
{
    const t = upHint();
    t.click('.publish-hint-later');
    check("Not now closes it as 'later'", gone(t) && t.closed().join() === 'later' && !t.calls.open.length);
}
{
    const t = upHint();
    t.click('.publish-hint-close');
    check("the close button closes it as 'close'", gone(t) && t.closed().join() === 'close');
}
{
    const t = upHint();
    t.key('Enter');
    check('another key leaves it up', !!t.hint());
    t.key('Escape');
    check("Escape closes it as 'escape'", gone(t) && t.closed().join() === 'escape');
}
{
    const t = upHint();
    t.press(t.hint().querySelector('.publish-hint-text'));
    check('a press inside it leaves it up', !!t.hint());
    const alert = t.add('<puter-alert><button></button></puter-alert>');
    t.press(alert.querySelector('button'));
    check("a press in one of Puter's dialogs leaves it up", !!t.hint());
    t.press(t.btn);
    check('a press on the Publish button leaves it for the popover to close', !!t.hint());
    check("the popover opening closes it as 'publish', and says it was up", t.PH.panelOpened() === true && gone(t) && t.closed().join() === 'publish');
    check('a popover opened with no hint up is not the hint\'s', t.PH.panelOpened() === false);
}
{
    const t = upHint();
    const elsewhere = t.add('<div class="chat-input"></div>');
    t.press(elsewhere);
    check("a press anywhere else closes it as 'outside'", gone(t) && t.closed().join() === 'outside');
}
{
    const t = upHint();
    t.PH.setBusy(false);
    check('a turn ending leaves it up', !!t.hint());
    t.PH.setBusy(true);
    check("a new build closes it as 'build'", gone(t) && t.closed().join() === 'build');
}
{
    const t = upHint();
    t.env.currentPublishedUrl = 'https://mine.puter.site/';
    t.PH.refresh();
    check("a publish from the chat's card closes it as 'away'", gone(t) && t.closed().join() === 'away');
}
{
    const t = upHint();
    t.PH.hide('away');
    check("a project switch or the preview closing closes it as 'away'", gone(t) && t.closed().join() === 'away');
    t.PH.hide('away');
    check('closing it again tracks nothing more', t.closed().length === 1);
}
{
    const t = upHint();
    const mo = t.observers.mutation.find((o) => o.on);
    check('watches the body classes while up', !!mo);
    t.state.buttonVisible = false;
    mo.fn();
    check("the button going off screen (a phone switching to chat) closes it as 'away'", gone(t) && t.closed().join() === 'away');
    check('and stops watching', !mo.on && !t.observers.resize.some((o) => o.on) && !(t.winListeners.resize || []).length);
}

// ---- Where it sits ------------------------------------------------------------
{
    const t = upHint();
    const el = t.hint();
    check('under the button', el.style.top === '50px' && el.hasClass('is-below'));
    check('its right edge just past the button\'s', el.style.left === (1186 - 300) + 'px');
    check('its caret at the button\'s middle', el.style['--fast-caret-x'] === (1140 - 886) + 'px');
}
{
    const t = upHint({ viewportW: 1000 });
    const el = t.hint();
    check('kept inside a narrow window', el.style.left === (1000 - 300 - 8) + 'px');
}

// ---- Storage ------------------------------------------------------------------
{
    const t = setup({ storage: blocked });
    done(t);
    t.advance(SHOW_AFTER);
    const first = !!t.hint();
    t.click('.publish-hint-later');
    done(t);
    t.advance(10000);
    check('with storage blocked it still shows, once for the load', first && !t.hint() && t.shownCount() === 1);
}
{
    const t = setup();
    done(t);
    t.advance(SHOW_AFTER);
    t.click('.publish-hint-later');
    t.PH.reset();
    check('reset forgets it was shown', !t.storage.map.has('builder.publishHint'));
    check('show() puts it up from the console', t.PH.show() === true && !!t.hint());
}

// ---- Wiring -------------------------------------------------------------------
const VITE = read('../vite.config.js');
const APP = read('../src/js/app.js');
const UI = read('../src/js/ui.js');
const HELPERS = read('../src/js/helpers.js');
const PKG = read('../package.json');

check('publish-hint.js loads after ui.js',
    VITE.indexOf("'js/publish-hint.js'") > VITE.indexOf("'js/ui.js'") && VITE.indexOf("'js/ui.js'") > 0);
{
    const at = APP.indexOf('window.PublishHint?.buildDone?.(');
    const before = APP.slice(Math.max(0, at - 700), at);
    check('a build that finished cleanly in the open project, with nothing queued, starts it',
        at > 0 && /if \(turnSucceeded && turnChatId === currentChatId && !isProcessing && !sendingQueued\) \{\s*generateContinueSuggestions/.test(before));
    check('not a build that ran out of credits', /if \(!\(context && context\.usageLimited\)\) \{\s*$/.test(before));
    check('it knows whether any project was published', /everPublished: savedChats\.some\(\(c\) => c && c\.publishedUrl\)/.test(APP.slice(at, at + 200)));
}
check('a project switch closes it', /window\.PublishHint\?\.hide\?\.\('away'\);\s*window\.closeVersionsPanel\?\.\(\);\s*window\.closePublishPanel\?\.\(\);\s*window\.closeSharePanel/.test(APP));
check('a build starting closes it (updateSendButtonState)', HELPERS.includes('window.PublishHint?.setBusy?.('));
{
    const fn = UI.slice(UI.indexOf('function openPublishPanel('), UI.indexOf('function closePublishPanel('));
    check('the Publish popover opening closes it and takes the hint as its source',
        fn.includes("const hinted = !!window.PublishHint?.panelOpened?.();") && fn.includes("_publishPanelSource = source || (hinted ? 'hint' : null);"));
    check('openPublishPanel is on window for the hint', UI.includes('window.openPublishPanel = openPublishPanel;'));
}
{
    const fn = UI.slice(UI.indexOf('function closePublishPanel('), UI.indexOf('window.closePublishPanel = closePublishPanel;'));
    check('closing the popover forgets its source', fn.includes('_publishPanelSource = null;'));
}
{
    const fn = UI.slice(UI.indexOf('async function doPublish('), UI.indexOf('async function doPublish(') + 900);
    check("a publish from the popover carries its source (Project Published's source prop)",
        fn.includes('...(_publishPanelSource ? { source: _publishPanelSource } : {}),'));
}
{
    const fn = UI.slice(UI.indexOf('window.refreshPublishButton = function'), UI.indexOf('window.refreshPublishButton = function') + 400);
    check('the Publish button refreshing refreshes it', fn.includes('window.PublishHint?.refresh?.();'));
}
{
    const fn = UI.slice(UI.indexOf('window.hideAppPreview = function'), UI.indexOf('window.hideAppPreview = function') + 3000);
    check('the preview closing closes it', fn.includes("window.PublishHint?.hide?.('away');"));
}
check('npm test runs this file', PKG.includes('node scripts/test-publish-hint.mjs'));

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nall publish hint checks passed');
