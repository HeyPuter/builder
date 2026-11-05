import fs from 'node:fs';
import vm from 'node:vm';

// ---- The What's new dialog ------------------------------------------------------
// js/whats-new.js tells a returning user about the newest feature, once. It
// shows at startup to a signed-in account with at least one project, never over
// a build or another dialog, and closing it in any way saves the
// announcement's start date in puter.kv, under one key per user that a later
// announcement overwrites. Runs the real whats-new.js with a small fake jQuery
// and kv, then checks the startup wiring in app.js and the bundle list.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const source = read('../src/js/whats-new.js');
const tick = () => new Promise((r) => setTimeout(r, 0));

const KV_KEY = 'whats_new_seen';
const START = (source.match(/start: '(\d{4}-\d{2}-\d{2})'/) || [])[1];
check('the announcement has a YYYY-MM-DD start', !!START);

function setup({ user = { uuid: 'u1', username: 'ann' }, paid = false, kv = {}, kvFails = false, kvSetFails = false, otherDialog = false } = {}) {
    const calls = { kvGet: [], kvSet: [], kvDel: [], track: [], released: 0, warn: [] };
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
        Date, Promise, $, document,
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
    env.Branding = { isSubscribed: () => paid };
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
    check('… and it is counted as shown', t.calls.track.some((c) => c.name === 'Whats New Shown' && c.id === 'custom-domain'));
    check('… opening records nothing yet, so a reload with it still up shows it again',
        t.calls.kvSet.length === 0);

    const html = t.shown()[0].html;
    check('the dialog is a labelled, described modal', /role="dialog"/.test(html) && /aria-modal="true"/.test(html)
        && /aria-labelledby="whats-new-title"/.test(html) && /aria-describedby="whats-new-body"/.test(html));
    check('the words come before the drawing, and the drawing is hidden from screen readers',
        html.indexOf('whats-new-text') < html.indexOf('whats-new-art') && /class="whats-new-art" aria-hidden="true"/.test(html));
    check('it has a New badge and the custom domain title', /whats-new-badge">New</.test(html) && /Publish on your own domain/.test(html));
    check('its one action is Continue', (html.match(/<button/g) || []).length === 2 && />Continue</.test(html) && /aria-label="Close"/.test(html));
    check('it says where the feature is, in the words the publish menu uses',
        /<strong>Publish<\/strong>/.test(html) && /<strong>Use custom domain<\/strong>/.test(html));

    t.fire('.whats-new-continue click');
    await tick();
    check('Continue closes it', t.shown().length === 0 && t.calls.released === 1 && !t.docHandlers['keydown.whatsNew']);
    check('… saves the announcement’s start in puter.kv', t.calls.kvSet.join() === KV_KEY && t.kvStore.get(KV_KEY) === START, String(t.kvStore.get(KV_KEY)));
    check('… under the one key, nothing else', [...t.kvStore.keys()].join() === KV_KEY);
    check('… and is counted with how it closed', t.calls.track.some((c) => c.name === 'Whats New Closed' && c.how === 'continue'));

    t.fire('.whats-new-continue click');
    await tick();
    check('a second click does not record or count it twice',
        t.calls.kvSet.length === 1 && t.calls.track.filter((c) => c.name === 'Whats New Closed').length === 1);

    check('the next startup skips it',
        (await t.W.maybeShow({ hasProjects: true })) === false && t.shown().length === 0);
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
    check(`closing by ${how} records it too`, t.shown().length === 0 && t.kvStore.get(KV_KEY) === START
        && t.calls.track.some((c) => c.name === 'Whats New Closed' && c.how === how));
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
    t.fire('.whats-new-continue click');
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
    t.fire('.whats-new-continue click');
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

// --- Plan line ---------------------------------------------------------------------
{
    const free = setup();
    await free.W.maybeShow({ hasProjects: true });
    check('free plan: says custom domains come with a paid plan', /come with a paid Puter plan/.test(free.shown()[0].html));
    const paid = setup({ paid: true });
    await paid.W.maybeShow({ hasProjects: true });
    check('paid plan: says they are part of the plan', /part of your Puter plan/.test(paid.shown()[0].html));
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
    t.fire('.whats-new-continue click');
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

// --- Copy ----------------------------------------------------------------------------
{
    const t = setup();
    await t.W.maybeShow({ hasProjects: true });
    const html = t.shown()[0].html;
    const text = html.slice(html.indexOf('whats-new-text'), html.indexOf('whats-new-art'))
        .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    check('the words use no em or en dashes', !/[–—]/.test(text), text);
    check('… and no colon or semicolon joining sentences', !/[;:]/.test(text), text);
}

// --- Wiring --------------------------------------------------------------------------
{
    const app = read('../src/js/app.js');
    const ready = app.slice(app.indexOf('$(document).ready(async function(){'));
    const linkAt = ready.indexOf('const startedFromLink = /[?&](?:template|prompt|handoff)=/.test(window.location.search);');
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
