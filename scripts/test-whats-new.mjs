import fs from 'node:fs';
import vm from 'node:vm';

// ---- The What's new dialog ------------------------------------------------------
// js/whats-new.js tells a returning user about recent features, one per load,
// each once. It shows at startup to a signed-in account with at least one
// project, never over a build or another dialog. Show me closes it and points
// at the feature (fast mode's bolt button), auto top-up's button opens Puter's
// billing page in a new tab, Later just closes it, and closing it in any way
// saves the announcement's start date in puter.kv, under one key per user. A
// load shows the oldest announcement newer than that, running today and for
// the account (auto top-up only for an account that buys its own credit).
// Runs the real whats-new.js with a small fake jQuery, kv, FastMode and clock,
// then checks the startup wiring in app.js and the bundle list.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const source = read('../src/js/whats-new.js');
const tick = () => new Promise((r) => setTimeout(r, 0));

const KV_KEY = 'whats_new_seen';
const STARTS = [...source.matchAll(/^\s*start: '(\d{4}-\d{2}-\d{2})',$/gm)].map((m) => m[1]);
const ENDS = [...source.matchAll(/^\s*end: '(\d{4}-\d{2}-\d{2})',$/gm)].map((m) => m[1]);
const IDS = [...source.matchAll(/^\s*id: '([a-z-]+)',$/gm)].map((m) => m[1]);
check('the announcements are fast mode then auto top-up', IDS.join() === 'fast-mode,auto-top-up', IDS.join());
check('each has a YYYY-MM-DD start and end, the end on or after the start',
    STARTS.length === IDS.length && ENDS.length === IDS.length && STARTS.every((d, i) => ENDS[i] >= d));
check('… and each starts later than the one before (kv keeps only the start)',
    STARTS.every((d, i) => i === 0 || d > STARTS[i - 1]), STARTS.join());
const START = STARTS[0];
const TOPUP = STARTS[1];
// The next day, as YYYY-MM-DD.
const dayAfter = (d) => { const t = new Date(d + 'T12:00:00'); t.setDate(t.getDate() + 1); return t.toISOString().slice(0, 10); };
// Noon on the day auto top-up went out, when both are running.
const NOW = TOPUP + 'T12:00:00';

function setup({ user = { uuid: 'u1', username: 'ann' }, paid = false, topUp = paid, fast = true, now = NOW, kv = {}, kvFails = false, kvSetFails = false, otherDialog = false } = {}) {
    const calls = { kvGet: [], kvSet: [], kvDel: [], track: [], released: 0, warn: [], showMe: [] };
    const kvStore = new Map(Object.entries(kv));
    const overlays = [];
    const docHandlers = {};
    const inside = { name: 'inside the dialog' };

    function makeOverlay(html) {
        const el = { html, removed: false, classes: new Set(), handlers: {}, contains: (t) => t === el || t === inside };
        const handle = {
            0: el,
            html,
            find: (sel) => ({
                on: (events, fn) => { for (const ev of events.split(' ')) (el.handlers[sel + ' ' + ev] ||= []).push(fn); },
                trigger: () => {},
            }),
            on: (ev, fn) => { (el.handlers['overlay ' + ev] ||= []).push(fn); },
            addClass: (c) => { el.classes.add(c); return handle; },
            removeClass: (c) => { el.classes.delete(c); return handle; },
            remove: () => { el.removed = true; },
        };
        return handle;
    }
    const document = {
        __doc: true,
        querySelector(sel) {
            const live = overlays.filter((o) => !o[0].removed);
            if (sel === '.confirm-modal-overlay') return otherDialog || live.length ? {} : null;
            if (sel === '.whats-new-overlay') return live.length ? live[0][0] : null;
            return null;
        },
    };
    const $ = (arg) => {
        if (arg && arg.__doc) return {
            on: (ev, fn) => { docHandlers[ev] = fn; },
            off: (ev) => { delete docHandlers[ev]; },
        };
        if (arg === 'body') return { append: (o) => overlays.push(o) };
        if (typeof arg === 'string' && arg.trim().startsWith('<')) return makeOverlay(arg);
        throw new Error('fake $ does not know ' + arg);
    };
    const env = {
        console: { ...console, warn: (...a) => calls.warn.push(a.join(' ')) },
        // The clock reads now, so the tests don't depend on the day they run.
        Date: class extends Date { constructor(...a) { super(...(a.length ? a : [now])); } static now() { return new Date(now).getTime(); } },
        Promise, $, document,
        setTimeout: (fn) => fn(),
        requestAnimationFrame: (fn) => fn(),
        puter: {
            kv: {
                get: async (k) => { calls.kvGet.push(k); if (kvFails) throw new Error('offline'); return kvStore.has(k) ? kvStore.get(k) : null; },
                set: async (k, v) => { calls.kvSet.push(k); if (kvSetFails) throw new Error('offline'); kvStore.set(k, v); return true; },
                del: async (k) => { calls.kvDel.push(k); kvStore.delete(k); return true; },
            },
        },
        keyIsForDialog: (e, overlay) => overlay.contains(e.target),
        trapDialogFocus: () => () => { calls.released++; },
    };
    env.window = env;
    env.user = user ? { ...user } : null;
    // A team seat is paid but can't buy credit (topUp false).
    env.Branding = { isSubscribed: () => paid, canTopUp: () => topUp };
    // Show me records whether the dialog was still up when it ran.
    env.FastMode = {
        SPEED: '2.5x', COST: '2x',
        available: () => fast,
        showMe: () => { calls.showMe.push({ dialogUp: overlays.some((o) => !o[0].removed) }); return true; },
    };
    env.track = (name, props) => calls.track.push({ name, ...props });
    vm.createContext(env);
    vm.runInContext(source, env);

    const shown = () => overlays.filter((o) => !o[0].removed);
    const fire = (key, e = {}) => {
        const o = overlays[overlays.length - 1][0];
        for (const fn of o.handlers[key] || []) fn({ target: o, preventDefault() {}, stopPropagation() {}, ...e });
    };
    return { env, calls, kvStore, overlays, shown, fire, docHandlers, inside, W: env.WhatsNew };
}

// --- Who sees it -------------------------------------------------------------------
{
    for (const [label, opts] of [
        ['signed out', { user: null }],
        ['a temporary (guest) account', { user: { uuid: 't1', is_temp: true } }],
    ]) {
        const t = setup(opts);
        const r = await t.W.maybeShow({ hasProjects: true });
        check(`not shown to ${label}`, r === false && t.shown().length === 0 && t.calls.kvGet.length === 0);
    }
    const t = setup();
    check('not shown to an account with no projects yet, and kv is not asked',
        (await t.W.maybeShow({ hasProjects: false })) === false && t.shown().length === 0 && t.calls.kvGet.length === 0);
}

// --- Shown once ------------------------------------------------------------------
{
    const t = setup();
    const r = await t.W.maybeShow({ hasProjects: true });
    check('a returning user with nothing recorded sees it', r === true && t.shown().length === 1);
    check('… after asking puter.kv under its one key', t.calls.kvGet.join() === KV_KEY, t.calls.kvGet.join());
    check('… and it is counted as shown', t.calls.track.some((c) => c.name === 'Whats New Shown' && c.id === 'fast-mode'));
    check('… opening records nothing yet, so a reload with it still up shows it again',
        t.calls.kvSet.length === 0);

    const html = t.shown()[0].html;
    check('the dialog is a labelled, described modal', /role="dialog"/.test(html) && /aria-modal="true"/.test(html)
        && /aria-labelledby="whats-new-title"/.test(html) && /aria-describedby="whats-new-body"/.test(html));
    check('the words come before the drawing, and the drawing is hidden from screen readers',
        html.indexOf('whats-new-text') < html.indexOf('whats-new-art') && /class="whats-new-art" aria-hidden="true"/.test(html));
    check('it has a New badge and the fast mode title', /whats-new-badge">New</.test(html) && /Build faster with fast mode/.test(html));
    check('its actions are Later and Show me, in that order, and ✕',
        (html.match(/<button/g) || []).length === 3 && html.indexOf('>Later<') > 0 && html.indexOf('>Later<') < html.indexOf('>Show me<')
        && /upgrade-primary whats-new-show/.test(html) && /aria-label="Close"/.test(html) && !/>Continue</.test(html));
    check('it gives the speed, the price and where the button is',
        /makes the builder work up to 2\.5x faster/.test(html) && /2x the credits/.test(html) && /bolt button in the chat box\./.test(html));
    check('… in plain words, without the AI’s steps or model names', !/the AI|next step|Opus|whats-new-note/.test(html));
    check('the drawing races a usual build against a fast one, with no spinner',
        /class="wn-fast"/.test(html) && /wn-lane is-fast/.test(html) && /2\.5x faster<\/span>/.test(html) && !/wn-wait/.test(html));

    t.fire('.whats-new-later click');
    await tick();
    check('Later closes it', t.shown().length === 0 && t.calls.released === 1 && !t.docHandlers['keydown.whatsNew']);
    check('… without pointing at anything', t.calls.showMe.length === 0);
    check('… saves the announcement’s start in puter.kv', t.calls.kvSet.join() === KV_KEY && t.kvStore.get(KV_KEY) === START, String(t.kvStore.get(KV_KEY)));
    check('… under the one key, nothing else', [...t.kvStore.keys()].join() === KV_KEY);
    check('… and is counted with how it closed', t.calls.track.some((c) => c.name === 'Whats New Closed' && c.how === 'later'));

    t.fire('.whats-new-later click');
    await tick();
    check('a second click does not record or count it twice',
        t.calls.kvSet.length === 1 && t.calls.track.filter((c) => c.name === 'Whats New Closed').length === 1);

    check('the next startup skips it',
        (await t.W.maybeShow({ hasProjects: true })) === false && t.shown().length === 0);
}

// --- Show me -------------------------------------------------------------------------
{
    const t = setup();
    await t.W.maybeShow({ hasProjects: true });
    t.fire('.whats-new-show click');
    await tick();
    check('Show me closes it and hands focus back', t.shown().length === 0 && t.calls.released === 1 && !t.docHandlers['keydown.whatsNew']);
    check('… then points at the bolt button, once the dialog is gone',
        t.calls.showMe.length === 1 && t.calls.showMe[0].dialogUp === false);
    check('… saves it as seen', t.kvStore.get(KV_KEY) === START);
    check('… and is counted as show', t.calls.track.some((c) => c.name === 'Whats New Closed' && c.how === 'show'));
    t.fire('.whats-new-show click');
    await tick();
    check('a second click does not point again', t.calls.showMe.length === 1);
}

// --- Every way out records it -----------------------------------------------------
for (const [how, act] of [
    ['close', (t) => t.fire('.whats-new-x click')],
    ['escape', (t) => t.docHandlers['keydown.whatsNew']({ key: 'Escape', target: t.inside, preventDefault() {} })],
    ['outside', (t) => t.fire('overlay mousedown')],
]) {
    const t = setup();
    await t.W.maybeShow({ hasProjects: true });
    act(t);
    await tick();
    check(`closing by ${how} records it too, and points at nothing`, t.shown().length === 0 && t.kvStore.get(KV_KEY) === START
        && t.calls.track.some((c) => c.name === 'Whats New Closed' && c.how === how) && t.calls.showMe.length === 0);
}
{
    const t = setup();
    await t.W.maybeShow({ hasProjects: true });
    t.docHandlers['keydown.whatsNew']({ key: 'Escape', target: { name: 'outside the dialog' }, preventDefault() {} });
    t.fire('overlay mousedown', { target: t.inside });
    await tick();
    check('Escape aimed elsewhere, and a press inside the card, leave it open', t.shown().length === 1 && t.calls.kvSet.length === 0);
}

// --- What kv already has ------------------------------------------------------------
{
    const t = setup({ kv: { [KV_KEY]: START } });
    check('this announcement already closed (here or on another device): not shown',
        (await t.W.maybeShow({ hasProjects: true })) === false && t.shown().length === 0);
}
{
    const t = setup({ kv: { [KV_KEY]: '2099-01-01' } });
    check('a later start stored: not shown', (await t.W.maybeShow({ hasProjects: true })) === false);
}
{
    const t = setup({ kv: { [KV_KEY]: '2026-01-01' } });
    check('an earlier announcement closed: this one shows', (await t.W.maybeShow({ hasProjects: true })) === true);
    t.fire('.whats-new-later click');
    await tick();
    check('… and closing it overwrites the same key', t.kvStore.size === 1 && t.kvStore.get(KV_KEY) === START);
}
for (const junk of [1730000000000, true, { at: 1 }, '']) {
    const t = setup({ kv: { [KV_KEY]: junk } });
    check(`something else stored (${JSON.stringify(junk)}) counts as nothing seen`,
        (await t.W.maybeShow({ hasProjects: true })) === true);
}

// --- kv trouble -----------------------------------------------------------------
{
    const t = setup({ kvFails: true });
    check('kv unreachable at startup: not shown, and nothing saved, so a later load tries again',
        (await t.W.maybeShow({ hasProjects: true })) === false && t.shown().length === 0 && t.calls.kvSet.length === 0);
}
{
    const t = setup({ kvSetFails: true });
    await t.W.maybeShow({ hasProjects: true });
    t.fire('.whats-new-later click');
    await tick();
    await tick();
    check('kv failing on close: it still closes', t.shown().length === 0);
    check('… with a warning, not a thrown error', t.calls.warn.length === 1);
}

// --- Nothing else on screen -------------------------------------------------------
{
    const t = setup();
    check('a build started while kv answered: not shown',
        (await t.W.maybeShow({ hasProjects: true, busy: () => true })) === false && t.shown().length === 0);
    check('… and nothing recorded, so the next startup tries again', t.calls.kvSet.length === 0);
}
{
    const t = setup({ otherDialog: true });
    check('another dialog is up: not shown', (await t.W.maybeShow({ hasProjects: true })) === false && t.shown().length === 0);
}
{
    const t = setup();
    const p = t.W.maybeShow({ hasProjects: true });
    t.env.user = { uuid: 'u2' };
    check('the account changed while kv answered: not shown', (await p) === false && t.shown().length === 0);
}
{
    const t = setup();
    t.W.open();
    check('opened from the console it shows, and only once at a time', t.W.open() === false && t.shown().length === 1);
    check('startup does not stack a second one on it', (await t.W.maybeShow({ hasProjects: true })) === false && t.overlays.length === 1);
}

// --- Fast mode not there -------------------------------------------------------------
{
    const t = setup({ fast: false });
    check('fast mode unavailable (its flag off): not shown, and kv is not asked',
        (await t.W.maybeShow({ hasProjects: true })) === false && t.shown().length === 0 && t.calls.kvGet.length === 0);
    check('… nor from the console', t.W.open() === false && t.shown().length === 0);
    check('… and nothing recorded, so a load with it shows it', t.calls.kvSet.length === 0);
}
{
    const free = setup();
    await free.W.maybeShow({ hasProjects: true });
    const paid = setup({ paid: true });
    await paid.W.maybeShow({ hasProjects: true });
    check('every plan gets the same words', free.shown()[0].html === paid.shown()[0].html);
}

// --- Giving way to the upgrade dialog ---------------------------------------------
{
    const t = setup();
    t.W.hide();
    check('hide with nothing open does nothing', t.overlays.length === 0 && t.calls.kvSet.length === 0);
    await t.W.maybeShow({ hasProjects: true });
    t.W.hide();
    await tick();
    check('hide closes it and hands focus back', t.shown().length === 0 && t.calls.released === 1 && !t.docHandlers['keydown.whatsNew']);
    check('… without marking it seen or counting a close',
        t.calls.kvSet.length === 0 && !t.calls.track.some((c) => c.name === 'Whats New Closed'));
    check('… so a later load shows it again', (await t.W.maybeShow({ hasProjects: true })) === true);
    t.fire('.whats-new-later click');
    await tick();
    check('closing it then records it as usual', t.kvStore.get(KV_KEY) === START);
}

// --- reset (console) ---------------------------------------------------------------
{
    const t = setup({ kv: { [KV_KEY]: START } });
    await t.W.reset();
    check('reset deletes the key, so the next startup shows it',
        !t.kvStore.has(KV_KEY) && (await t.W.maybeShow({ hasProjects: true })) === true);
}

// --- Auto top-up -----------------------------------------------------------------------
{
    const t = setup({ paid: true });
    check('a paid account that missed fast mode sees fast mode first',
        (await t.W.maybeShow({ hasProjects: true })) === true && /Build faster with fast mode/.test(t.shown()[0].html));
    t.fire('.whats-new-later click');
    await tick();
    check('… and the next load, auto top-up', (await t.W.maybeShow({ hasProjects: true })) === true
        && /Keep building with auto top-up/.test(t.shown()[0].html)
        && t.calls.track.some((c) => c.name === 'Whats New Shown' && c.id === 'auto-top-up'));

    const html = t.shown()[0].html;
    check('its main button is a link to Puter’s billing page, opened in a new tab',
        /<a class="confirm-modal-btn upgrade-primary whats-new-show" href="https:\/\/puter\.com\/#billing" target="_blank" rel="noopener noreferrer">Turn on auto top-up<\/a>/.test(html));
    check('… after Later, with ✕, and no Show me',
        (html.match(/<button/g) || []).length === 2 && html.indexOf('>Later<') < html.indexOf('>Turn on auto top-up<')
        && /aria-label="Close"/.test(html) && !/Show me/.test(html));
    check('it says what it does and where to turn it on',
        /adds credits for you when you run low/.test(html) && /Turn it on in your Puter billing settings\./.test(html));
    check('the drawing is the credits card and switch, on the green panel, hidden from screen readers',
        /class="whats-new-art is-credits" aria-hidden="true"/.test(html) && /class="wn-topup"/.test(html)
        && /wn-credits-bar/.test(html) && /wn-switch/.test(html) && /Topped up<\/span>/.test(html)
        && /<span>Credits used<\/span>/.test(html));

    t.fire('.whats-new-show click');
    await tick();
    check('its button closes the dialog and points at nothing (the link opens the page)',
        t.shown().length === 0 && t.calls.released === 2 && t.calls.showMe.length === 0);
    check('… saves its start as seen', t.kvStore.get(KV_KEY) === TOPUP, String(t.kvStore.get(KV_KEY)));
    check('… and is counted as show', t.calls.track.some((c) => c.name === 'Whats New Closed' && c.id === 'auto-top-up' && c.how === 'show'));
    check('then nothing more', (await t.W.maybeShow({ hasProjects: true })) === false && t.shown().length === 0);
}
{
    const t = setup({ paid: true, kv: { [KV_KEY]: START } });
    check('a paid account that closed fast mode sees auto top-up', (await t.W.maybeShow({ hasProjects: true })) === true
        && /auto top-up/.test(t.shown()[0].html));
}
{
    const t = setup({ kv: { [KV_KEY]: START } });
    check('a free account that closed fast mode sees nothing', (await t.W.maybeShow({ hasProjects: true })) === false && t.shown().length === 0);
    t.env.Branding.canTopUp = () => true;
    check('… until it pays for a plan', (await t.W.maybeShow({ hasProjects: true })) === true && /auto top-up/.test(t.shown()[0].html));
}
{
    const t = setup({ paid: true, topUp: false });
    await t.W.maybeShow({ hasProjects: true });
    check('a team seat sees fast mode', /Build faster with fast mode/.test(t.shown()[0].html));
    t.fire('.whats-new-later click');
    await tick();
    check('… but never auto top-up, since its team buys the credit', (await t.W.maybeShow({ hasProjects: true })) === false);
}
{
    const t = setup({ paid: true, fast: false });
    check('fast mode off: a paid account goes straight to auto top-up',
        (await t.W.maybeShow({ hasProjects: true })) === true && /auto top-up/.test(t.shown()[0].html));
}

// --- Running from start to end -------------------------------------------------------
{
    const t = setup({ paid: true, kv: { [KV_KEY]: START }, now: START + 'T12:00:00' });
    check('auto top-up waits for its start day', (await t.W.maybeShow({ hasProjects: true })) === false);
}
{
    const fastEnd = ENDS[0];
    const free = setup({ now: dayAfter(fastEnd) + 'T12:00:00' });
    check('after fast mode’s end: a free account sees nothing, and kv is not asked',
        (await free.W.maybeShow({ hasProjects: true })) === false && free.calls.kvGet.length === 0);
    const paid = setup({ paid: true, now: dayAfter(fastEnd) + 'T12:00:00' });
    check('… while a paid account that never saw fast mode gets auto top-up instead',
        (await paid.W.maybeShow({ hasProjects: true })) === true && /auto top-up/.test(paid.shown()[0].html));
    const last = setup({ paid: true, now: fastEnd + 'T23:00:00' });
    check('fast mode still shows on its end day', (await last.W.maybeShow({ hasProjects: true })) === true
        && /fast mode/.test(last.shown()[0].html));
}
{
    const t = setup({ paid: true, now: dayAfter(ENDS[1]) + 'T12:00:00' });
    check('after the last end: nothing shows, and kv is not asked',
        (await t.W.maybeShow({ hasProjects: true })) === false && t.calls.kvGet.length === 0);
    check('… though the console still opens the newest', t.W.open() === true && /auto top-up/.test(t.shown()[0].html));
}

// --- Console ----------------------------------------------------------------------------
{
    const free = setup();
    check('open() on a free account shows fast mode, the newest it gets', free.W.open() === true && /fast mode/.test(free.shown()[0].html));
    const free2 = setup();
    check('open(\'auto-top-up\') on a free account shows nothing', free2.W.open('auto-top-up') === false && free2.shown().length === 0);
    const paid = setup({ paid: true, kv: { [KV_KEY]: TOPUP } });
    check('open() on a paid account shows auto top-up even after it was seen', paid.W.open() === true && /auto top-up/.test(paid.shown()[0].html));
    const byId = setup({ paid: true });
    check('open(\'fast-mode\') shows fast mode', byId.W.open('fast-mode') === true && /fast mode/.test(byId.shown()[0].html));
    const none = setup();
    check('open with an unknown id shows nothing', none.W.open('nope') === false && none.shown().length === 0);
}

// --- Copy ----------------------------------------------------------------------------
for (const [label, opts] of [['fast mode', {}], ['auto top-up', { paid: true, kv: { [KV_KEY]: START } }]]) {
    const t = setup(opts);
    await t.W.maybeShow({ hasProjects: true });
    const html = t.shown()[0].html;
    const text = html.slice(html.indexOf('whats-new-text'), html.indexOf('whats-new-art'))
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    check(`${label}: the words use no em or en dashes`, !/[–—]/.test(text), text);
    check(`… and no colon or semicolon joining sentences`, !/[;:]/.test(text), text);
    check(`… nor the AI or model names`, !/the AI|Opus|Claude/.test(text), text);
}

// --- Wiring --------------------------------------------------------------------------
{
    const app = read('../src/js/app.js');
    const ready = app.slice(app.indexOf('$(document).ready(async function(){'));
    const linkAt = ready.indexOf('const startedFromLink = /[?&](?:template|prompt|handoff|settings)=/.test(window.location.search);');
    check('startup notes a template/prompt/handoff link before those are taken out of the URL',
        linkAt >= 0 && linkAt < ready.indexOf('captureTemplateDeepLink') && linkAt < ready.indexOf('applyPromptDeepLink()'));
    const callAt = ready.indexOf('window.WhatsNew?.maybeShow(');
    const call = ready.slice(ready.lastIndexOf('if (!startedFromLink', callAt), ready.indexOf('.catch(', callAt));
    check('startup calls maybeShow, but not after a link that starts something, nor while an upgrade is pending',
        callAt >= 0 && /^if \(!startedFromLink && !upgradeIsPending\(\)\)/.test(call));
    check('… after the upgrade checks have started (they read the same pending click)',
        callAt > ready.indexOf('startUpgradeChecks();'));
    check('… after auth, the project list and the deep links are settled',
        callAt > ready.indexOf('await ensureAuthenticated()') && callAt > ready.indexOf('window.consumeTemplateDeepLink?.()'));
    check('… with whether the user has projects',
        /hasProjects: savedChats\.length > 0/.test(call));
    check('… and a busy check covering a build, typing since load, and focus moved off the chat box',
        /busy: \(\) => isProcessing \|\| _sendSetupInFlight \|\| _typedSinceLoad \|\| !composerMayTakeFocus\(\)/.test(call));
    const typedAt = app.indexOf("document.addEventListener('input', () => { _typedSinceLoad = true; }, true);");
    check('typing anywhere on the page is noted from the moment app.js loads, before startup runs',
        typedAt >= 0 && typedAt < app.indexOf('$(document).ready(async function(){') && /let _typedSinceLoad = false;/.test(app));

    const ui = read('../src/js/ui.js');
    const upgrade = ui.slice(ui.indexOf('function openUpgradeModal('), ui.indexOf('const paid = window.Branding.isSubscribed(window.user);', ui.indexOf('function openUpgradeModal(')));
    check('the upgrade dialog makes What’s new step aside before it opens', /window\.WhatsNew\?\.hide\(\);/.test(upgrade));
    check('… not awaited, with failures caught', !/await window\.WhatsNew/.test(ready) && /maybeShow\([\s\S]*?\}\)\.catch\(/.test(ready.slice(callAt)));

    const vite = read('../vite.config.js');
    const pos = (f) => vite.indexOf(`'${f}'`);
    check('whats-new.js is in the bundle, after ui.js', pos('js/whats-new.js') > pos('js/ui.js') && pos('js/ui.js') > 0);

    const css = read('../src/css/styles.css');
    check('styles: the dialog, its phone layout and reduced motion are styled',
        /\.whats-new-modal \{/.test(css) && /grid-template-areas: "text" "art" "actions"/.test(css)
        && /prefers-reduced-motion: reduce\) \{\s*\.whats-new-art \* \{ animation: none !important; \}/.test(css));
    check('styles: dark theme covers the dialog', /html\[data-theme="dark"\] \.whats-new-modal/.test(css));

    check('whats-new.js keeps nothing in localStorage (kv is the only record)', !/localStorage/.test(source));
}

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll What’s new checks passed.');
