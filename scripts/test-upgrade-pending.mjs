import fs from 'node:fs';

// ---- Regression guard for 'Upgrade Completed' -------------------------------
// A free user's Upgrade click saves { source, at } in localStorage under a
// per-account key, and in memory for the tab it was made in. The next check that finds the account paid reports
// 'Upgrade Completed' with that source once, clears it and shows the success
// dialog, even after a reload. This test
//   * evaluates the REAL block sliced out of ui.js against a fake window,
//     localStorage, clock, Puter and Web Locks, then
//   * text-asserts the wiring (both Upgrade buttons save the click, and the
//     check runs on load, on focus and on return to the tab).
// Mirrors scripts/test-usage-limit-unblock.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const UI = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const a = UI.indexOf('// ===== upgrade-pending (start) =====');
const b = UI.indexOf('// ===== upgrade-pending (end) =====');
if (a < 0 || b < 0) throw new Error('could not extract upgrade-pending block');
const make = new Function('window', 'localStorage', 'Date', 'puter', 'navigator', 'document',
    'updateUserMenu', '_publishPanelOpen', 'renderPublishPanel', 'openUpgradeModal',
    UI.slice(a, b) + '\nreturn { setUpgradePending, refreshSubscriptionAfterUpgrade, startUpgradeChecks, UPGRADE_PENDING_PREFIX };');

const HOUR = 36e5;
const T0 = Date.UTC(2026, 9, 28, 12, 0, 0);
const KEY = 'upgrade_pending:user-a';

function memStorage() {
    const m = new Map();
    return {
        _m: m,
        getItem: k => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { m.set(k, String(v)); },
        removeItem: k => { m.delete(k); },
    };
}

// A Web Locks stand-in for { ifAvailable: true }. A held name hands the
// callback null instead of waiting.
function lockManager() {
    const held = new Set(), names = [];
    return {
        names,
        async request(name, opts, cb) {
            names.push(name);
            if (!opts || opts.ifAvailable !== true) throw new Error('expected ifAvailable');
            if (held.has(name)) return cb(null);
            held.add(name);
            try { return await cb({ name }); } finally { held.delete(name); }
        },
    };
}

// One page load. `box` is what Puter answers, shared by every tab, and the
// clock is shared too, so a later tab is a reload.
const clock = { now: T0 };
function page(box, storage, { locks = lockManager(), hidden = false, signedIn = true, start = true } = {}) {
    const RealDate = globalThis.Date;
    class FakeDate extends RealDate {
        constructor(...args) { super(...(args.length ? args : [clock.now])); }
        static now() { return clock.now; }
    }
    const win = {
        user: signedIn ? { uuid: 'user-a', subscribed: false } : null,
        Branding: { isSubscribed: u => !!(u && !u.is_temp && u.subscribed === true) },
        _calls: [],
        _dialogs: [],
        _fetches: 0,
    };
    win.track = (event, props) => { win._calls.push([event, props]); };
    const puter = {
        auth: {
            getUser: async () => {
                win._fetches++;
                if (box.fail) throw new Error('offline');
                await box.gate;
                return { uuid: box.uuid || 'user-a', subscribed: box.subscribed };
            },
        },
    };
    const api = make(win, storage, FakeDate, puter, locks ? { locks } : {}, { visibilityState: hidden ? 'hidden' : 'visible' },
        () => {}, false, () => {}, (source, opts) => { win._dialogs.push([source, opts]); });
    // Startup's own check, once it has reopened the project.
    const started = start ? api.startUpgradeChecks() : null;
    return { ...api, started, win, storage, locks };
}
const completed = p => p.win._calls.filter(c => c[0] === 'Upgrade Completed');

// Credited once, with the source of the click
{
    clock.now = T0;
    const box = { subscribed: false };
    const p = page(box, memStorage());
    p.setUpgradePending('github');
    const saved = JSON.parse(p.storage.getItem(KEY));
    check('the click is saved per account with its source and time', saved && saved.source === 'github' && saved.at === T0);

    await p.refreshSubscriptionAfterUpgrade();
    check('still free → nothing reported, the click kept', completed(p).length === 0 && p.storage._m.has(KEY));

    box.subscribed = true;
    clock.now = T0 + 5 * 60 * 1000;
    await p.refreshSubscriptionAfterUpgrade();
    const c = completed(p);
    check('paid → one Upgrade Completed with the source', c.length === 1 && c[0][1].source === 'github');
    check('paid 5 minutes after the click → since_click <10m', c[0] && c[0][1].since_click === '<10m');
    check('paid → the click is cleared', !p.storage._m.has(KEY));
    check('paid → the success dialog opens for that source', p.win._dialogs.length === 1 && p.win._dialogs[0][0] === 'github' && p.win._dialogs[0][1].justUpgraded === true);
    check('paid → the cached user is the paid one', p.win.user.subscribed === true);

    await p.refreshSubscriptionAfterUpgrade();
    check('reported once', completed(p).length === 1 && p.win._dialogs.length === 1);
}

// The point of saving it. The tab is gone when the user comes back.
{
    clock.now = T0;
    const box = { subscribed: false };
    const storage = memStorage();
    page(box, storage).setUpgradePending('code_editor');
    box.subscribed = true;
    clock.now = T0 + 2 * HOUR;
    const reloaded = page(box, storage);
    await reloaded.started;
    const c = completed(reloaded);
    check('after a reload → credited to the click from before it', c.length === 1 && c[0][1].source === 'code_editor');
    check('2 hours after the click → since_click 1-24h', c[0] && c[0][1].since_click === '1-24h');
    check('after a reload → the success dialog still opens', reloaded.win._dialogs.length === 1 && reloaded.win._dialogs[0][0] === 'code_editor');
}

// The last click wins
{
    clock.now = T0;
    const box = { subscribed: false };
    const p = page(box, memStorage());
    p.setUpgradePending('model_picker');
    clock.now = T0 + 1000;
    p.setUpgradePending('toolbar');
    box.subscribed = true;
    await p.refreshSubscriptionAfterUpgrade();
    let c = completed(p);
    check('two clicks → the last one is credited, once', c.length === 1 && c[0][1].source === 'toolbar');

    clock.now = T0;
    const later = { subscribed: false };
    const q = page(later, memStorage());
    q.setUpgradePending('chat');
    later.subscribed = true;
    clock.now = T0 + 30 * 60 * 1000;
    await q.refreshSubscriptionAfterUpgrade();
    c = completed(q);
    check('30 minutes after the click → since_click 10-60m', c.length === 1 && c[0][1].since_click === '10-60m');
}

// Too old, someone else, or nothing to do
{
    clock.now = T0;
    let box = { subscribed: false };
    let p = page(box, memStorage());
    p.setUpgradePending('chat');
    box.subscribed = true;
    clock.now = T0 + 24 * HOUR;
    await p.refreshSubscriptionAfterUpgrade();
    check('past 24h → not credited, the click dropped', completed(p).length === 0 && !p.storage._m.has(KEY));

    clock.now = T0;
    box = { subscribed: false };
    p = page(box, memStorage());
    p.setUpgradePending('chat');
    box.subscribed = true;
    box.uuid = 'user-b';
    await p.refreshSubscriptionAfterUpgrade();
    check('a different account answering → not credited, the click kept', completed(p).length === 0 && p.storage._m.has(KEY));

    p = page({ subscribed: true }, memStorage());
    await p.refreshSubscriptionAfterUpgrade();
    check('no click pending → no requests', p.win._fetches === 0 && completed(p).length === 0);

    const storage = memStorage();
    page({ subscribed: false }, storage).setUpgradePending('chat');
    p = page({ subscribed: true }, storage, { signedIn: false });
    await p.refreshSubscriptionAfterUpgrade();
    check('signed out → no requests, the click kept', p.win._fetches === 0 && storage._m.has(KEY));

    p = page({ subscribed: true }, storage, { hidden: true });
    await p.refreshSubscriptionAfterUpgrade();
    check('a hidden tab → no requests', p.win._fetches === 0);

    p = page({ subscribed: true, fail: true }, storage);
    let threw = false;
    try { await p.refreshSubscriptionAfterUpgrade(); } catch (e) { threw = true; }
    check('Puter unreachable → no throw, the click kept for the next check', !threw && completed(p).length === 0 && storage._m.has(KEY));

    const blocked = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); }, removeItem() {} };
    p = page({ subscribed: true }, blocked);
    threw = false;
    try { p.setUpgradePending('chat'); await p.refreshSubscriptionAfterUpgrade(); } catch (e) { threw = true; }
    check('blocked storage → no throw', !threw);
}

// A newer click saved while Puter was answering waits for the next check
{
    clock.now = T0;
    let release;
    const box = { subscribed: true, gate: new Promise(r => { release = r; }) };
    const p = page(box, memStorage());
    p.setUpgradePending('chat');
    const run = p.refreshSubscriptionAfterUpgrade();
    await Promise.resolve();
    clock.now = T0 + 1000;
    p.setUpgradePending('toolbar');
    release();
    await run;
    check('a newer click mid-check → nothing credited this time', completed(p).length === 0);
    box.gate = null;
    await p.refreshSubscriptionAfterUpgrade();
    const c = completed(p);
    check('a newer click mid-check → credited on the next check', c.length === 1 && c[0][1].source === 'toolbar');
}

// Two tabs come back at once
{
    async function twoTabs(locks) {
        clock.now = T0;
        const box = { subscribed: false };
        const storage = memStorage();
        const t1 = page(box, storage, { locks }), t2 = page(box, storage, { locks });
        t1.setUpgradePending('github');
        box.subscribed = true;
        await Promise.all([t1.refreshSubscriptionAfterUpgrade(), t2.refreshSubscriptionAfterUpgrade()]);
        return completed(t1).length + completed(t2).length;
    }
    const locks = lockManager();
    check('two tabs sharing the Web Lock report once', await twoTabs(locks) === 1);
    // A tab in another process holding the lock, which the re-read alone
    // can't see.
    clock.now = T0;
    const busy = lockManager();
    busy.request = async (name, opts, cb) => cb(null);
    const p = page({ subscribed: true }, memStorage(), { locks: busy });
    p.setUpgradePending('github');
    await p.refreshSubscriptionAfterUpgrade();
    check('the lock held by another tab → this tab leaves the click alone', completed(p).length === 0 && p.storage._m.has(KEY) && p.win._fetches === 0);
    check('the lock is per account', locks.names.length === 2 && locks.names.every(n => n === KEY));
    check('no Web Locks → the re-read still reports once', await twoTabs(null) === 1);
}

// The tab that clicked still turns paid when another tab credited the click
{
    clock.now = T0;
    const box = { subscribed: false };
    const storage = memStorage();
    const clicked = page(box, storage), other = page(box, storage);
    clicked.setUpgradePending('usage_limit');
    box.subscribed = true;
    await other.refreshSubscriptionAfterUpgrade();
    check('another tab back first → it credits the click', completed(other).length === 1 && completed(other)[0][1].source === 'usage_limit');
    await clicked.refreshSubscriptionAfterUpgrade();
    check('the tab that clicked → no second Upgrade Completed', completed(clicked).length === 0);
    check('the tab that clicked → still turns paid and shows its success dialog',
        clicked.win.user.subscribed === true && clicked.win._dialogs.length === 1 && clicked.win._dialogs[0][0] === 'usage_limit');
    await clicked.refreshSubscriptionAfterUpgrade();
    check('the tab that clicked → only once', clicked.win._dialogs.length === 1 && clicked.win._fetches === 1);
}

// Storage that doesn't take the click
{
    for (const [name, storage] of [
        ['storage full', { getItem: () => null, setItem() { throw new Error('QuotaExceededError'); }, removeItem() {} }],
        ['storage blocked', { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); }, removeItem() {} }],
    ]) {
        clock.now = T0;
        const box = { subscribed: false };
        const p = page(box, storage);
        p.setUpgradePending('chat');
        box.subscribed = true;
        clock.now = T0 + 5 * 60 * 1000;
        await p.refreshSubscriptionAfterUpgrade();
        const c = completed(p);
        check(`${name} → the same tab still credits the click once`, c.length === 1 && c[0][1].source === 'chat' && c[0][1].since_click === '<10m');
        check(`${name} → and shows the success dialog`, p.win._dialogs.length === 1 && p.win.user.subscribed === true);
        await p.refreshSubscriptionAfterUpgrade();
        check(`${name} → only once`, completed(p).length === 1);
    }
}

// Nothing runs before startup has reopened the project
{
    clock.now = T0;
    const box = { subscribed: false };
    const storage = memStorage();
    page(box, storage).setUpgradePending('code_editor');
    box.subscribed = true;
    const booting = page(box, storage, { start: false });
    await booting.refreshSubscriptionAfterUpgrade();
    check('a focus during startup → no requests, the click kept', booting.win._fetches === 0 && storage._m.has(KEY));
    await booting.startUpgradeChecks();
    check('startup done → credited and the success dialog shown', completed(booting).length === 1 && booting.win._dialogs.length === 1);
}

// Wiring
{
    check('the Upgrade dialog saves a free user\'s click', UI.includes('if (!paid) setUpgradePending(source);'));
    check('the out-of-credits dialog saves a free user\'s click', UI.includes("if (!ctx.paid) setUpgradePending('usage_limit');"));
    check('the check runs on focus and on return to the tab',
        UI.includes("window.addEventListener('focus', refreshSubscriptionAfterUpgrade);") &&
        UI.includes("document.addEventListener('visibilitychange', refreshSubscriptionAfterUpgrade);"));
    check('the checks start on load, after the deep-link restore',
        /window\.hideProjectLoading\?\.\(\);\s*\}\s*(\/\/[^\n]*\n\s*)*startUpgradeChecks\(\);/.test(APP) &&
        APP.indexOf('startUpgradeChecks();') > APP.indexOf('await ensureAuthenticated();'));
}

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll upgrade-pending checks passed');
