import fs from 'node:fs';

// ---- Regression guard for AI-cost analytics --------------------------------
// A build turn's AI spend is reported to Plausible on the Build Completed event.
// Plausible only sums/averages ONE numeric field — `revenue` — so we piggyback
// on it, sending the cost as a NEGATIVE amount (the refund convention) so the
// dashboard's revenue total reads as money spent. This test:
//   * evaluates the REAL window.track sliced out of helpers.js and asserts it
//     forwards { currency, amount } under a `revenue` key, preserves the negative
//     sign, defaults the currency, stays backward compatible with 2-arg callers,
//     and never throws / never emits a bogus revenue key on bad input, then
//   * text-asserts the invariants at the two wiring sites (handleMessageStream
//     stashes context.turnUsage; app.js sends NEGATIVE dollars guarded on cost>0).
// Mirrors scripts/test-transient-retry.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

// --- Evaluate the REAL window.track from helpers.js -------------------------
const HELP = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const trkA = HELP.indexOf('window.track = function');
const trkEnd = HELP.indexOf('\n};', trkA);
if (trkA < 0 || trkEnd < 0) throw new Error('could not extract window.track block');
const trackSrc = HELP.slice(trkA, trkEnd + 3);
// The sliced code assigns window.track and references window.plausible; run it
// against a fake `window` we control so we can capture the forwarded call.
const makeTrack = new Function('window', trackSrc + '\nreturn window.track;');

function capture(revenueStub) {
    const win = { plausible: (event, opts) => { win._calls.push([event, opts]); }, _calls: [] };
    if (revenueStub !== undefined) win.plausible = revenueStub;
    const track = makeTrack(win);
    return { track, win };
}

// props-only (existing 2-arg callers) — unchanged behavior
{
    const { track, win } = capture();
    track('Build Started', { first_build: true });
    const [, opts] = win._calls[0];
    check('props-only forwards under props key', JSON.stringify(opts) === JSON.stringify({ props: { first_build: true } }));
    check('props-only emits no revenue key', !('revenue' in opts));
}

// no args beyond event — passes undefined (no empty {props} object)
{
    const { track, win } = capture();
    track('Project Downloaded');
    check('bare event forwards undefined opts', win._calls[0][1] === undefined);
}

// revenue forwarded with negative amount preserved + shape correct
{
    const { track, win } = capture();
    track('Build Completed', { first_build: false, model: 'claude-opus-4.8' }, { currency: 'USD', amount: -0.004 });
    const [event, opts] = win._calls[0];
    check('revenue: event name preserved', event === 'Build Completed');
    check('revenue: props still forwarded alongside', opts.props && opts.props.model === 'claude-opus-4.8');
    check('revenue: nested under revenue key', opts.revenue && opts.revenue.currency === 'USD');
    check('revenue: NEGATIVE amount preserved (reads as spend)', opts.revenue.amount === -0.004);
}

// currency defaults to USD when omitted
{
    const { track, win } = capture();
    track('Build Completed', null, { amount: -1.5 });
    const [, opts] = win._calls[0];
    check('revenue: currency defaults to USD', opts.revenue.currency === 'USD' && opts.revenue.amount === -1.5);
    check('revenue: props omitted when null', !('props' in opts));
}

// bad amounts must NOT produce a revenue key (guards against NaN/Infinity/string)
for (const bad of [NaN, Infinity, -Infinity, '0.5', null, undefined]) {
    const { track, win } = capture();
    track('Build Completed', { a: 1 }, { currency: 'USD', amount: bad });
    const opts = win._calls[0][1];
    check('revenue: rejects amount=' + String(bad), !('revenue' in opts));
}

// analytics must never throw into the caller, even if plausible is absent/hostile
{
    const track = makeTrack({ plausible: undefined });
    let threw = false;
    try { track('X', { a: 1 }, { currency: 'USD', amount: -1 }); } catch (_) { threw = true; }
    check('no plausible -> no throw', !threw);

    const track2 = makeTrack({ plausible: () => { throw new Error('boom'); } });
    let threw2 = false;
    try { track2('X', { a: 1 }); } catch (_) { threw2 = true; }
    check('plausible throwing -> swallowed', !threw2);
}

// --- Text-assert the wiring sites (guards the sign + guard conditions) -------
const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const STREAM = fs.readFileSync(new URL('../src/js/handleMessageStream.js', import.meta.url), 'utf8');

check('handleMessageStream stashes context.turnUsage', /context\.turnUsage\s*=/.test(STREAM));
check('app.js reads context.turnUsage for the turn cost', /context\s*&&\s*context\.turnUsage/.test(APP));
// The sign is the whole point: cost must go out as NEGATIVE dollars.
check('app.js sends NEGATIVE revenue amount', /amount:\s*-\(costCents\s*\/\s*100\)/.test(APP));
// Zero-cost turns must not emit a revenue event (would record a $0 conversion).
check('app.js guards revenue on costCents > 0', /costCents\s*>\s*0\s*\?\s*\{\s*currency/.test(APP));

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll AI-cost-tracking checks passed');
