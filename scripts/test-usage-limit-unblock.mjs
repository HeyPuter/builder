import fs from 'node:fs';

// ---- Regression guard for usage-limit unblock analytics --------------------
// A build that fails at the usage limit stores { at, kind } in localStorage
// under a per-user key; the next completed build reports 'Unblocked After
// Limit' once and clears it. This test:
//   * evaluates the REAL helpers sliced out of app.js against a fake window,
//     localStorage and clock, covering the one-shot clearing, the three time
//     buckets, the seven-day expiry, same_month, per-account scoping, and
//     malformed / blocked storage, then
//   * text-asserts the wiring. Every limit branch records, Build Completed reports
//     unless the stream was cut short for credits.
// Mirrors scripts/test-ai-cost-tracking.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
// The real costBand, from helpers.js, which app.js uses as a global.
const HELPERS = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const bandSrc = HELPERS.slice(HELPERS.indexOf('const COST_BANDS = ['));
const costBand = new Function(bandSrc.slice(0, bandSrc.indexOf('\n}\n', bandSrc.indexOf('function costBand(')) + 3) + 'return costBand;')();
const a = APP.indexOf('// ===== usage-limit-unblock (start) =====');
const b = APP.indexOf('// ===== usage-limit-unblock (end) =====');
if (a < 0 || b < 0) throw new Error('could not extract usage-limit-unblock block');
const make = new Function('window', 'localStorage', 'Date', 'puter', 'navigator', 'costBand',
    APP.slice(a, b) + '\nreturn { recordUsageLimitHit, reportUnblockAfterLimit, LIMIT_HIT_PREFIX, countCompletedBuilds, usageLimitHitProps, isLowBalanceRefusal, planChange, recordPlanAtLimit, checkPaidAfterLimit, LIMIT_PAY_PREFIX, creditsAtStart, readTurnAccount, limitHitTurnProps, afterAccountRead, limitDialogCohort, projectDisplayName, limitDialogCopy };');

const HOUR = 36e5;
const T0 = Date.UTC(2026, 9, 8, 12, 0, 0); // Oct 8 2026, mid-month

function memStorage() {
    const m = new Map();
    return {
        _m: m,
        getItem: k => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { m.set(k, String(v)); },
        removeItem: k => { m.delete(k); },
    };
}

function harness({ storage = memStorage(), uuid = 'user-a', puter = null, navigator = {} } = {}) {
    let now = T0;
    const RealDate = globalThis.Date;
    class FakeDate extends RealDate {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
    }
    const win = { user: uuid ? { uuid } : null, _calls: [] };
    win.track = (event, props) => { win._calls.push([event, props]); };
    const api = make(win, storage, FakeDate, puter, navigator, costBand);
    return { ...api, win, storage, setNow: t => { now = t; } };
}

// One-shot: reported once, then cleared
{
    const h = harness();
    h.recordUsageLimitHit('credits');
    h.setNow(T0 + 10 * 60 * 1000);
    h.reportUnblockAfterLimit();
    h.reportUnblockAfterLimit();
    check('reports exactly once', h.win._calls.length === 1);
    check('event name', h.win._calls[0][0] === 'Unblocked After Limit');
    check('kind carried through', h.win._calls[0][1].kind === 'credits');
    check('storage cleared after report', h.storage._m.size === 0);
}

// No limit hit → nothing reported
{
    const h = harness();
    h.reportUnblockAfterLimit();
    check('no record → no event', h.win._calls.length === 0);
}

// Time buckets and the seven-day expiry
for (const [hours, expected] of [[0.5, '<1h'], [1, '1-24h'], [23.9, '1-24h'], [24, '1-7d'], [167.9, '1-7d'], [168, null], [500, null]]) {
    const h = harness();
    h.recordUsageLimitHit('tier');
    h.setNow(T0 + hours * HOUR);
    h.reportUnblockAfterLimit();
    if (expected) check(`${hours}h → since_limit ${expected}`, h.win._calls.length === 1 && h.win._calls[0][1].since_limit === expected);
    else check(`${hours}h → expired, not reported`, h.win._calls.length === 0);
    check(`${hours}h → record cleared either way`, h.storage._m.size === 0);
}

// same_month across a UTC month boundary
{
    const h = harness();
    h.setNow(Date.UTC(2026, 9, 31, 22, 0, 0));
    h.recordUsageLimitHit('credits');
    h.setNow(Date.UTC(2026, 10, 1, 2, 0, 0));
    h.reportUnblockAfterLimit();
    check('crossing into a new month → same_month false', h.win._calls[0][1].same_month === false);

    const h2 = harness();
    h2.recordUsageLimitHit('credits');
    h2.setNow(T0 + 2 * HOUR);
    h2.reportUnblockAfterLimit();
    check('same month → same_month true', h2.win._calls[0][1].same_month === true);
}

// Per-account scoping: account B never reports account A's limit
{
    const storage = memStorage();
    const a = harness({ storage, uuid: 'user-a' });
    a.recordUsageLimitHit('credits');
    const bh = harness({ storage, uuid: 'user-b' });
    bh.setNow(T0 + HOUR);
    bh.reportUnblockAfterLimit();
    check('other account → not reported', bh.win._calls.length === 0);
    check('other account → A\'s record left intact', storage._m.has(a.LIMIT_HIT_PREFIX + 'user-a'));
    a.setNow(T0 + HOUR);
    a.reportUnblockAfterLimit();
    check('original account still reports later', a.win._calls.length === 1);
}

// No signed-in user → nothing written or reported
{
    const h = harness({ uuid: null });
    h.recordUsageLimitHit('credits');
    check('no user → nothing stored', h.storage._m.size === 0);
    h.reportUnblockAfterLimit();
    check('no user → nothing reported', h.win._calls.length === 0);
}

// Malformed records are dropped silently and cleared
for (const bad of ['not json', 'null', '{}', '{"at":"yesterday"}']) {
    const h = harness();
    h.storage.setItem(h.LIMIT_HIT_PREFIX + 'user-a', bad);
    let threw = false;
    try { h.reportUnblockAfterLimit(); } catch (e) { threw = true; }
    check(`malformed ${JSON.stringify(bad)} → no throw, no event`, !threw && h.win._calls.length === 0);
    check(`malformed ${JSON.stringify(bad)} → cleared`, h.storage._m.size === 0);
}

// A timestamp in the future (clock change) is not reported
{
    const h = harness();
    h.recordUsageLimitHit('credits');
    h.setNow(T0 - HOUR);
    h.reportUnblockAfterLimit();
    check('future timestamp → not reported', h.win._calls.length === 0);
}

// Blocked storage (private mode / disabled) never throws
{
    const blocked = {
        getItem() { throw new Error('SecurityError'); },
        setItem() { throw new Error('SecurityError'); },
        removeItem() { throw new Error('SecurityError'); },
    };
    const h = harness({ storage: blocked });
    let threw = false;
    try { h.recordUsageLimitHit('credits'); h.reportUnblockAfterLimit(); } catch (e) { threw = true; }
    check('blocked storage → no throw', !threw);
    check('blocked storage → no event', h.win._calls.length === 0);
}

// Completed builds counted from the chat history
{
    const { countCompletedBuilds: count, usageLimitHitProps: props } = harness();
    const sys = { role: 'system', content: 'sp' };
    const user = t => ({ role: 'user', content: t });
    const toolUse = { role: 'assistant', content: { type: 'tool_use', id: 't1', name: 'Write', input: {} } };
    const toolResult = { role: 'user', content: { type: 'tool_result', tool_use_id: 't1', content: '{}' } };
    const reply = t => ({ role: 'assistant', content: t });
    check('no history → 0', count(undefined) === 0 && count([sys]) === 0);
    check('prompt with no reply (limit hit on first build) → 0', count([sys, user('a')]) === 0);
    check('tool round then reply → 1', count([sys, user('a'), toolUse, toolResult, reply('done')]) === 1);
    check('interrupted on a tool_use → not counted',
        count([sys, user('a'), reply('working'), toolUse]) === 0);
    check('array content holding a tool_use → not counted',
        count([sys, user('a'), { role: 'assistant', content: [{ type: 'text', text: 'x' }, { type: 'tool_use', id: 't' }] }]) === 0);
    check('error card → not counted',
        count([sys, user('a'), { role: 'assistant', content: 'Out of credits', isError: true }]) === 0);
    check('resumed build counts once',
        count([sys, user('a'), toolUse, toolResult, { role: 'user', content: 'continue', resumeNudge: true }, reply('done')]) === 1);
    const restore = { role: 'assistant', content: '*Restored the project to an earlier version ("v2").*', versionNote: true };
    const legacyRestore = { role: 'assistant', content: '*Restored the project to an earlier version.*' };
    check('restore note after a failed build → not counted',
        count([sys, user('a'), { role: 'assistant', content: 'err', isError: true }, restore, user('b')]) === 0);
    check('restore note after a dangling tool_use → not counted',
        count([sys, user('a'), toolUse, restore, user('b')]) === 0);
    check('legacy restore note without the flag → not counted',
        count([sys, user('a'), toolUse, legacyRestore, user('b')]) === 0);
    check('restore note after a finished build → still counted once',
        count([sys, user('a'), reply('ok'), restore, user('b')]) === 1);
    check('mixed history counts each finished build',
        count([sys, user('a'), toolUse, toolResult, reply('ok'), user('b'), toolUse, user('c'), reply('ok'), user('d')]) === 2);

    const history = [sys, user('a'), reply('ok')];
    const p = props(history, [{ id: 'c1' }, { id: 'c2', publishedUrl: 'https://x.puter.site' }], 'c1', null);
    check('props: current project not published', p.published === false);
    check('props: another project published', p.any_published === true);
    check('props: builds_completed', p.builds_completed === 1);
    check('props: current chat not double-counted in projects', p.projects === 2);
    const q = props(history, [], 'new', 'https://y.puter.site');
    check('props: unsaved current chat still counts as a project', q.projects === 1);
    check('props: published current project', q.published === true && q.any_published === true);
    const many = Array.from({ length: 12 }, (_, i) => ({ id: 'c' + i }));
    check('props: project count capped', props(history, many, 'c0', null).projects === '10+');
}

// Low Balance refusals, matching the 'funds' case of puter.js's classifyUpgradeRefusal
{
    const { isLowBalanceRefusal: low } = harness();
    check('402 body code → low balance', low({ error: 'x', message: 'x', code: 'insufficient_funds' }));
    check('nested code → low balance', low({ error: { code: 'insufficient_funds' } }));
    check('bare 402 → low balance', low({ status: 402 }));
    check('nested 402 → low balance', low({ error: { status: 402 } }));
    check('402 subscription_required → not low balance', !low({ status: 402, code: 'subscription_required' }));
    check('storage limit → not low balance', !low({ code: 'storage_limit_reached' }) && !low({ status: 413 }));
    check('429 credits_reserved → not low balance',
        !low({ code: 'too_many_requests', errorCode: 'credits_reserved', message: 'Usage is reserved by requests still running.' }));
    check('provider "insufficient balance" text alone → not low balance', !low(new Error('Insufficient balance on upstream account')));
    check('nothing → false', !low(null) && !low(undefined) && !low('insufficient_funds'));
}

// Stream helpers keep what the checks above read
{
    const STREAM = fs.readFileSync(new URL('../src/js/handleMessageStream.js', import.meta.url), 'utf8');
    const s = STREAM.indexOf('function normalizeStreamError(');
    const e = STREAM.indexOf('\n}\n', s);
    const normalize = new Function('extractErrorText', STREAM.slice(s, e + 2) + '\nreturn normalizeStreamError;')(c => String(c && c.message || ''));
    const err = normalize({ type: 'error', code: 'insufficient_funds', status: 402, message: 'm' });
    check('stream error keeps code', err.code === 'insufficient_funds');
    check('stream error keeps status', err.status === 402);
    check('usage line with usage_limited flags the turn',
        /completion\.type === "usage"\)[\s\S]{0,400}completion\.metadata\.usage_limited === true[\s\S]{0,40}context\.usageLimited = true;/.test(STREAM));
}

// Upgrade After Limit, which change a payment made
{
    const { planChange: pc } = harness();
    const free = { subscribed: false, paid_storage: 0, allowance: 1000, purchased: 0 };
    const paid = { subscribed: true, paid_storage: 500, allowance: 45000, purchased: 0 };
    check('free → subscribed is started_paying', pc(free, paid).change === 'started_paying' && pc(free, paid).bought_credits === false);
    check('bigger allowance is plan_up', pc(paid, { ...paid, allowance: 90000 }).change === 'plan_up');
    check('more paid_storage alone is not plan_up when allowance was read', pc(paid, { ...paid, paid_storage: 1000 }) === null);
    check('paid_storage is the fallback without the allowance',
        pc({ ...paid, allowance: null }, { ...paid, allowance: null, paid_storage: 1000 }).change === 'plan_up');
    check('bought credits on the same plan', pc(free, { ...free, purchased: 5000 }).change === 'bought_credits');
    check('plan change and credits in one visit is one change plus the flag',
        pc(free, { ...paid, purchased: 5000 }).change === 'started_paying' && pc(free, { ...paid, purchased: 5000 }).bought_credits === true);
    check('nothing changed → null', pc(paid, { ...paid }) === null);
    check('downgrade → null', pc({ ...paid, allowance: 90000 }, paid) === null && pc(paid, free) === null);
    check('unreadable credits never count as a purchase', pc({ ...free, purchased: null }, { ...free, purchased: 5000 }) === null);
}

// Upgrade After Limit end to end, with a fake Puter
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
// `state` is what Puter reports; `cached` is window.user from page load.
function fakePuter(box) {
    return {
        auth: {
            getMonthlyUsage: async () => ({ allowanceInfo: { monthUsageAllowance: box.state.allowance, addons: { purchasedCredits: box.state.purchased } } }),
            getUser: async () => {
                if (box.failUser) throw new Error('offline');
                return { uuid: box.uuid || 'user-a', subscribed: box.state.subscribed, paid_storage: box.state.paid_storage };
            },
        },
    };
}
function tab(box, storage, navigator) {
    const h = harness({ puter: fakePuter(box), storage, navigator });
    const c = box.cached || box.state;
    h.win.user = { uuid: 'user-a', subscribed: c.subscribed, paid_storage: c.paid_storage };
    return h;
}
async function paidHarness({ before, after, ageMs = 5 * 60 * 1000, cached, otherAccountLater = false, failUserAtHit = false } = {}) {
    const box = { state: before, cached, failUser: failUserAtHit };
    const h = tab(box, memStorage(), { locks: lockManager() });
    await h.recordPlanAtLimit('credits');
    box.state = after;
    box.failUser = false;
    if (otherAccountLater) box.uuid = 'user-b';
    h.setNow(T0 + ageMs);
    await h.checkPaidAfterLimit();
    return h;
}
{
    const free = { subscribed: false, paid_storage: 0, allowance: 1000, purchased: 0 };
    const paid = { subscribed: true, paid_storage: 500, allowance: 45000, purchased: 0 };
    const paidCalls = h => h.win._calls.filter(c => c[0] === 'Upgrade After Limit');

    let h = await paidHarness({ before: free, after: paid });
    let c = paidCalls(h);
    check('paid after limit → one event', c.length === 1);
    check('paid after limit → props', c[0] && c[0][1].change === 'started_paying' && c[0][1].kind === 'credits' && c[0][1].since_limit === '<10m' && c[0][1].bought_credits === false);
    check('paid after limit → record cleared', !h.storage._m.has(h.LIMIT_PAY_PREFIX + 'user-a'));
    await h.checkPaidAfterLimit();
    check('paid after limit → reported once', paidCalls(h).length === 1);

    for (const [mins, bucket] of [[30, '10-60m'], [5 * 60, '1-24h']]) {
        h = await paidHarness({ before: free, after: { ...free, purchased: 5000 }, ageMs: mins * 60 * 1000 });
        c = paidCalls(h);
        check(`${mins}m → since_limit ${bucket}`, c.length === 1 && c[0][1].since_limit === bucket && c[0][1].change === 'bought_credits');
    }

    h = await paidHarness({ before: free, after: free });
    check('no payment → no event, record kept', paidCalls(h).length === 0 && h.storage._m.has(h.LIMIT_PAY_PREFIX + 'user-a'));

    h = await paidHarness({ before: free, after: paid, ageMs: 24 * HOUR });
    check('past 24h → not reported, record dropped', paidCalls(h).length === 0 && !h.storage._m.has(h.LIMIT_PAY_PREFIX + 'user-a'));

    h = await paidHarness({ before: free, after: paid, otherAccountLater: true });
    check('a different account answering → not reported', paidCalls(h).length === 0);

    // Subscribed in another tab before the limit, page-load user still free
    h = await paidHarness({ before: paid, after: paid, cached: free });
    check('stale cached user → baseline from a fresh fetch, no false started_paying', paidCalls(h).length === 0);

    h = await paidHarness({ before: free, after: paid, failUserAtHit: true });
    check('no fresh user at the hit → no baseline saved', paidCalls(h).length === 0 && !h.storage._m.has(h.LIMIT_PAY_PREFIX + 'user-a'));

    const quiet = harness({ puter: { auth: { getUser: async () => { throw new Error('should not fetch'); }, getMonthlyUsage: async () => { throw new Error('should not fetch'); } } } });
    let threw = false;
    try { await quiet.checkPaidAfterLimit(); } catch (e) { threw = true; }
    check('no pending limit hit → no requests, no throw', !threw && quiet.win._calls.length === 0);

    // Two tabs return from paying at once
    async function twoTabs(navigator) {
        const box = { state: free };
        const storage = memStorage();
        const a = tab(box, storage, navigator), b = tab(box, storage, navigator);
        await a.recordPlanAtLimit('credits');
        box.state = paid;
        await Promise.all([a.checkPaidAfterLimit(), b.checkPaidAfterLimit()]);
        return paidCalls(a).length + paidCalls(b).length;
    }
    const locks = lockManager();
    check('two tabs sharing the Web Lock report once', await twoTabs({ locks }) === 1);
    check('the lock is per account', locks.names.length === 2 && locks.names.every(n => n === 'usage_limit_pay:user-a'));
    check('no Web Locks → the re-read still reports once', await twoTabs({}) === 1);
}

// Credits and plan at turn start, and how far the turn got
{
    const { creditsAtStart: credits, limitHitTurnProps: props } = harness();
    const mc = dollars => ({ remaining: dollars * 1e8, monthUsageAllowance: 3e8 });
    check('credits: banded in dollars like cost_band',
        credits(mc(3)) === '$3-4' && credits(mc(2.99)) === '$2.50-3' && credits(mc(0.4)) === '$0.25-0.50' && credits(mc(0.1)) === '<$0.25');
    check('credits: nothing left → $0', credits(mc(0)) === '$0' && credits({ remaining: -5 }) === '$0');
    check('credits: a credit-multiplier deployment → whole credits', credits({ remaining: 212.6, unit: 'credits' }) === 213);
    check('credits: missing → unknown', credits(null) === 'unknown' && credits({}) === 'unknown' && credits({ remaining: NaN }) === 'unknown');

    const account = { credits: 300, plan: 'free' };
    const stats = (calls, previewChecks) => ({ calls, previewChecks });
    const p0 = props(account, stats(0, 0));
    check('turn props: nothing went through', p0.calls === 0 && p0.preview_checks === '0' && p0.credits_at_start === 300);
    check('turn props: calls sent as is, capped at 30+',
        props(account, stats(7, 0)).calls === 7 && props(account, stats(29, 0)).calls === 29 && props(account, stats(30, 0)).calls === '30+');
    check('turn props: preview checks cap at 3+',
        props(account, stats(1, 2)).preview_checks === '2' && props(account, stats(1, 3)).preview_checks === '3+' &&
        props(account, stats(1, 7)).preview_checks === '3+');
}

{
    const puter = {
        auth: {
            getMonthlyUsage: async () => ({ allowanceInfo: { remaining: 0, monthUsageAllowance: 3e8 } }),
            getUser: async () => ({ uuid: 'user-a', subscribed: true }),
        },
    };
    const h = harness({ puter });
    h.win.Branding = { isSubscribed: u => !!(u && u.subscribed) };
    const a = await h.readTurnAccount();
    check('account: credits and plan read fresh', a.credits === '$0' && a.plan === 'paid');
    const failing = harness({ puter: { auth: { getMonthlyUsage: async () => { throw new Error('x'); }, getUser: async () => { throw new Error('x'); } } } });
    const f = await failing.readTurnAccount();
    check('account: failed reads → unknown', f.credits === 'unknown' && f.plan === 'unknown');
}

// Calls and preview checks counted into the turn stats
{
    const TOOLS = fs.readFileSync(new URL('../src/js/tools.js', import.meta.url), 'utf8');
    const STREAM = fs.readFileSync(new URL('../src/js/handleMessageStream.js', import.meta.url), 'utf8');
    check('the tool loop counts preview checks',
        /if \(c\.turnStats && toolCall\.name === 'update_preview'\) c\.turnStats\.previewChecks\+\+;/.test(TOOLS));
    check('each call is counted at its first tool_use or usage (behavior: test-limit-hit-call-count)',
        /completion\.type === "usage"\) \{\s*countCall\(\);/.test(STREAM) && /completion\.type === "tool_use"\) \{\s*countCall\(\);/.test(STREAM));
}

// The limit hit waits for the account read, but not forever
{
    const { afterAccountRead } = harness();
    let calls = 0, release;
    const read = new Promise(r => { release = r; });
    afterAccountRead(read, () => calls++);
    await new Promise(r => setTimeout(r, 10));
    check('waits while the read is pending', calls === 0);
    release();
    await new Promise(r => setTimeout(r, 10));
    check('runs once the read lands', calls === 1);
    let none = 0;
    afterAccountRead(null, () => none++);
    await new Promise(r => setTimeout(r, 10));
    check('no read started → runs right away', none === 1);
    let failed = 0;
    afterAccountRead(Promise.reject(new Error('x')), () => failed++);
    await new Promise(r => setTimeout(r, 10));
    check('a failed read still runs it', failed === 1);
    let hung = 0;
    const t0 = Date.now();
    await new Promise(r => afterAccountRead(new Promise(() => {}), () => { hung++; r(); }));
    check('a hung read runs it after about 3s, once', hung === 1 && Date.now() - t0 >= 2900);
}

// Low Balance dialog test: cohort, project name, copy
{
    check('no puter / desktop app → app cohort', harness().limitDialogCohort() === 'app' && harness({ puter: { env: 'app' } }).limitDialogCohort() === 'app');
    const web = uuid => { const h = harness({ puter: { env: 'web' } }); h.win.user = uuid ? { uuid } : null; return h.limitDialogCohort(); };
    check('web without a user → default', web(null) === 'default');
    check('cohort is stable per account', web('user-a') === web('user-a'));
    {
        const st = memStorage();
        st.setItem('debugLimitCohort', 'custom');
        const h = harness({ puter: { env: 'web' }, storage: st });
        h.win.user = { uuid: 'user-a' };
        const forcedCustom = h.limitDialogCohort();
        st.setItem('debugLimitCohort', 'default');
        check('debugLimitCohort forces the cohort', forcedCustom === 'custom' && h.limitDialogCohort() === 'default');
    }
    let custom = 0;
    for (let i = 0; i < 2000; i++) if (web('u-' + i + '-x') === 'custom') custom++;
    check(`cohorts split about evenly (${custom}/2000 custom)`, custom > 900 && custom < 1100);
    {
        const h = harness({ puter: { env: 'web' } });
        check('Usage Limit Hit props carry the cohort', ['custom', 'default'].includes(h.usageLimitHitProps([], [], 'c', null).cohort));
    }

    const { projectDisplayName: name, limitDialogCopy: copy } = harness();
    check('name: user rename', name({ title: 'Pizza Shop', customTitle: true }, null) === 'Pizza Shop');
    check('name: AI name', name({ title: 'Pizza Shop', aiTitled: true }, null) === 'Pizza Shop');
    check('name: first prompt is not a name', name({ title: 'make me a website for my pizza…' }, null) === null);
    check('name: published subdomain next', name({ title: 'make me…' }, 'https://tonys-pizza.puter.site') === 'tonys-pizza');
    check('name: preview subdomain is not a name', name(null, 'https://preview-1234.puter.site') === null);
    check('name: nothing → null', name(null, null) === null && name(null, 'not a url') === null);

    const base = { name: 'Pizza Shop', building: false, steps: null, hasApp: true, published: null, paid: false };
    let c = copy({ ...base, building: true, steps: { done: 4, total: 6 } });
    check('steps: state, heading, words', c.state === 'steps' && c.heading === 'Finish building \u201cPizza Shop\u201d' && c.body === 'Upgrade to finish the rest.' && c.cta === 'Upgrade');
    c = copy({ ...base, building: true, steps: { done: 6, total: 6 } });
    check('all steps done → not the steps face', c.state === 'building');
    c = copy({ ...base, name: null, building: true });
    check('building without a name says your app', c.heading === 'Keep building your app' && c.body === 'Your last request didn\u2019t finish. Upgrade to finish it.');
    c = copy(base);
    check('idle with an app → app face', c.state === 'app' && c.lead === 'You\u2019ve run out of credits.' && c.body === 'Upgrade to make this change.' && c.cta === 'Upgrade');
    c = copy({ ...base, hasApp: false, name: null });
    check('nothing built → new face, no repeated lead', c.state === 'new' && c.lead === null && c.body === 'A paid plan gives you more credits, so you can keep building with Puter.');
    c = copy({ ...base, hasApp: false, name: null, paid: true });
    check('nothing built on a paid plan → bigger plan', c.body === 'A bigger plan gives you more credits, so you can keep building with Puter.' && c.cta === 'Upgrade');
    c = copy({ ...base, paid: true, building: true, steps: { done: 1, total: 3 } });
    check('paid → bigger plan wording, same button', c.body.endsWith('Move to a bigger plan to finish the rest.') && c.cta === 'Upgrade');
    c = copy({ ...base, published: 'https://tonys-pizza.puter.site/' });
    check('published → address for the address bar', c.address === 'tonys-pizza.puter.site' && copy(base).address === null);
    check('free copy never claims monthly or free credits', !/month|free credits/i.test(JSON.stringify([copy(base), copy({ ...base, hasApp: false })])));
}

// The override in ui.js
{
    const UI = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
    const o = UI.slice(UI.indexOf('function installLowBalanceOverride('));
    check('override is web only', /puter\.env !== 'web'/.test(o.slice(0, 400)));
    check('Puter\'s dialog is removed only after ours opens',
        /cohort === 'custom' && openLimitModal\(\)\) \{\s*this\.remove\(\);\s*return;/.test(o));
    check('a failure falls back to Puter\'s dialog', /catch \(e\) \{ \/\* fall back to Puter's dialog \*\/ \}\s*return open\.apply\(this, arguments\);/.test(o));
    check('the default cohort is counted too', /variant: 'puter', cohort/.test(o));
    check('installed at load', /\ninstallLowBalanceOverride\(\);/.test(UI));
    check('upgrade from the limit dialog waits for Upgrade Completed', /_upgradePending = 'usage_limit'/.test(UI));
    check('success screen can continue the stopped build', /upgrade-resume[\s\S]{0,500}resumeBuild\(\)/.test(UI));
    check('continue re-checks the project before resuming', /upgrade-resume[\s\S]{0,300}if \(!canResumeAfterLimit\(\)\) return;[\s\S]{0,150}resumeBuild\(\)/.test(UI));
    check('upgrade saves the project the dialog opened for', /const chatId = currentChatId;[\s\S]*_limitResumeChatId = ctx\.building \? chatId : null;/.test(UI));
    check('only a turn that got somewhere is building', /building: !!isProcessing && \(_turnProgressed \|\| !!\(steps && steps\.done < steps\.total\)\)/.test(UI));
    check('each turn starts with no progress', /isProcessing = true;[\s\S]{0,200}_turnProgressed = false;/.test(APP));
    const STREAM_SRC = fs.readFileSync(new URL('../src/js/handleMessageStream.js', import.meta.url), 'utf8');
    check('text and tool calls count as progress',
        /completion\.type === "text"[\s\S]{0,400}noteTurnProgress/.test(STREAM_SRC) && /completion\.type === "tool_use"[\s\S]{0,100}noteTurnProgress/.test(STREAM_SRC));
}

// Wiring in sendChatMessage
{
    const send = APP.slice(APP.indexOf('async function sendChatMessage('));
    check('tier branch records the limit hit',
        /trackLimitHit\([^\n]*kind: 'tier'[^\n]*\n\s*recordUsageLimitHit\('tier'\);/.test(send));
    check('credits branch records the limit hit',
        /trackLimitHit\([^\n]*kind: 'credits'[^\n]*\n\s*recordUsageLimitHit\('credits'\);/.test(send));
    check('every limit branch sends the extra props',
        (send.match(/trackLimitHit\([^\n]*\.\.\.usageLimitHitProps\(turnSaveContext\.chatHistory, savedChats, turnChatId, window\.currentPublishedUrl\)/g) || []).length === 3);
    check('the limit hit waits for the account read, then adds the turn props',
        /const trackLimitHit = props => afterAccountRead\(turnAccountRead,\s*\(\) => window\.track\?\.\('Usage Limit Hit', \{ \.\.\.props, \.\.\.limitHitTurnProps\(turnAccount, turnStats\) \}\)\);/.test(send));
    check('the account is read once per turn, before the attempts',
        /turnAccountRead = readTurnAccount\(\)\.then\(a => \{ turnAccount = a; \}, \(\) => \{\}\);\s*while \(true\)/.test(send));
    check('every attempt shares the turn stats', /interrupted: true, turnStats\}/.test(send));
    check('Build Completed carries cost band, plan and credits',
        /'Build Completed',[\s\S]{0,300}cost_band: costBand\(costCents\), plan: turnAccount\.plan, credits_at_start: turnAccount\.credits/.test(send));
    check('error branch counts only Low Balance refusals',
        /if \(isLowBalanceRefusal\(error\)\) \{\s*trackLimitHit\(/.test(send));
    check('a stream cut short for credits records the hit instead of an unblock',
        /'Build Completed',[\s\S]{0,800}if \(context && context\.usageLimited\) \{\s*trackLimitHit\([^\n]*kind: 'credits'[^\n]*\n\s*recordUsageLimitHit\('credits'\);\s*\} else \{\s*reportUnblockAfterLimit\(\);/.test(send));
    check('the limit hit also saves the plan', /function recordUsageLimitHit\(kind\) \{[\s\S]{0,300}recordPlanAtLimit\(kind\);/.test(APP));
    check('paid check runs on focus, on return to the tab and on load',
        /addEventListener\('focus', \(\) => \{ checkPaidAfterLimit\(\); \}\)/.test(APP) &&
        /visibilitychange[\s\S]{0,120}checkPaidAfterLimit\(\)/.test(APP) &&
        /await initializeUser\(\);[\s\S]{0,400}checkPaidAfterLimit\(\)/.test(APP));
}

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll usage-limit unblock checks passed');
