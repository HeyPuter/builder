import fs from 'node:fs';

// ---- Regression guard for usage-limit unblock analytics --------------------
// A build that fails at the usage limit stores { at, kind } in localStorage
// under a per-user key; the next completed build reports 'Unblocked After
// Limit' once and clears it. This test:
//   * evaluates the REAL helpers sliced out of app.js against a fake window,
//     localStorage and clock, covering the one-shot clearing, the three time
//     buckets, the seven-day expiry, same_month, per-account scoping, and
//     malformed / blocked storage, then
//   * text-asserts the wiring: both limit branches record, Build Completed reports.
// Mirrors scripts/test-ai-cost-tracking.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const a = APP.indexOf('// ===== usage-limit-unblock (start) =====');
const b = APP.indexOf('// ===== usage-limit-unblock (end) =====');
if (a < 0 || b < 0) throw new Error('could not extract usage-limit-unblock block');
const make = new Function('window', 'localStorage', 'Date',
    APP.slice(a, b) + '\nreturn { recordUsageLimitHit, reportUnblockAfterLimit, LIMIT_HIT_PREFIX };');

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

function harness({ storage = memStorage(), uuid = 'user-a' } = {}) {
    let now = T0;
    const RealDate = globalThis.Date;
    class FakeDate extends RealDate {
        constructor(...args) { super(...(args.length ? args : [now])); }
        static now() { return now; }
    }
    const win = { user: uuid ? { uuid } : null, _calls: [] };
    win.track = (event, props) => { win._calls.push([event, props]); };
    const api = make(win, storage, FakeDate);
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

// Wiring in sendChatMessage
{
    const send = APP.slice(APP.indexOf('async function sendChatMessage('));
    check('tier branch records the limit hit',
        /'Usage Limit Hit'[^\n]*kind: 'tier'[^\n]*\n\s*recordUsageLimitHit\('tier'\);/.test(send));
    check('credits branch records the limit hit',
        /'Usage Limit Hit'[^\n]*kind: 'credits'[^\n]*\n\s*recordUsageLimitHit\('credits'\);/.test(send));
    check('a completed build reports the unblock',
        /'Build Completed',[\s\S]{0,400}reportUnblockAfterLimit\(\);/.test(send));
}

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll usage-limit unblock checks passed');
