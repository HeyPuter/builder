import fs from 'node:fs';

// ---- Adding credits at the usage limit ---------------------------------------
// A paid account that runs out is offered Puter's top-up. This evaluates the
// REAL helpers sliced out of ui.js against a fake puter, window and clock:
// who is offered it, what a purchase reports, and when the stopped build
// continues. Mirrors scripts/test-usage-limit-unblock.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const UI = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const BRANDING = fs.readFileSync(new URL('../src/js/branding.js', import.meta.url), 'utf8');
const a = UI.indexOf('// ===== add-credits (start) =====');
const b = UI.indexOf('// ===== add-credits (end) =====');
if (a < 0 || b < 0) throw new Error('could not extract add-credits block');

function harness({ user = { uuid: 'u', subscribed: true }, env = 'web', showTopUp, usage = [], resumable = true } = {}) {
    const win = { user, _calls: [] };
    new Function('window', BRANDING)(win);
    win.track = (...args) => win._calls.push(args);
    win._banners = [];
    win.showResumeBanner = (message) => win._banners.push(message);
    const reads = [...usage];
    const puter = {
        env,
        ui: showTopUp === null ? {} : { showTopUp_: showTopUp || (async () => ({ toppedUp: true })) },
        auth: { getMonthlyUsage: async () => {
            const next = reads.length > 1 ? reads.shift() : reads[0];
            if (next instanceof Error) throw next;
            return next;
        } },
    };
    win.puter = puter;
    const state = { resumed: 0, resumable, waits: 0 };
    const make = new Function('window', 'puter', 'setTimeout', 'canResumeAfterLimit', 'resumeBuild',
        'let _limitResumeChatId = "chat-1";\n' + UI.slice(a, b) +
        '\nreturn { canAddCredits, openTopUp, resumeAfterCredits, resumeChat: () => _limitResumeChatId };');
    const api = make(win, puter, (fn) => { state.waits++; fn(); }, () => state.resumable, () => { state.resumed++; });
    return { ...api, win, state, events: (name) => win._calls.filter(c => c[0] === name) };
}
const left = (remaining) => ({ allowanceInfo: { remaining } });

// Who is offered the top-up
check('a paid account on the web', harness().canAddCredits());
check('not a free account', !harness({ user: { uuid: 'u', subscribed: false } }).canAddCredits());
check('not a temp account', !harness({ user: { uuid: 'u', subscribed: true, is_temp: true } }).canAddCredits());
check('not a seat', !harness({ user: { uuid: 'u', subscribed: true, team: { uid: 't' } } }).canAddCredits());
check('not inside the Puter desktop', !harness({ env: 'app' }).canAddCredits());
check('not on a puter.js without the top-up', !harness({ showTopUp: null }).canAddCredits());

// What the top-up reports
{
    let h = harness();
    check('a purchase resolves true', await h.openTopUp('usage_limit', { cohort: 'custom' }) === true);
    check('the click and the purchase are counted with their source',
        h.events('Top-up Clicked')[0][1].source === 'usage_limit' && h.events('Top-up Clicked')[0][1].cohort === 'custom' &&
        h.events('Top-up Completed').length === 1 && h.events('Top-up Completed')[0][1].source === 'usage_limit');
    h = harness({ showTopUp: async () => ({ toppedUp: false }) });
    check('closing without buying resolves false, and is not counted as bought',
        await h.openTopUp('usage_limit') === false && h.events('Top-up Completed').length === 0);
    h = harness({ showTopUp: async () => { throw new Error('no frame'); } });
    check('a top-up that fails resolves false', await h.openTopUp('usage_limit') === false);
    h = harness({ showTopUp: () => { throw new Error('sync'); } });
    check('a top-up that throws at once resolves false', await h.openTopUp('usage_limit') === false);
}

// Continuing the build
{
    let h = harness({ usage: [left(500)] });
    await h.resumeAfterCredits();
    check('continues once there is credit to spend', h.state.resumed === 1 && h.resumeChat() === null &&
        h.events('Build Resumed After Top-up').length === 1 && h.state.waits === 0);

    h = harness({ usage: [left(0), new Error('offline'), left(0), left(250)] });
    await h.resumeAfterCredits();
    check('waits for credit that has not landed yet', h.state.resumed === 1 && h.state.waits === 3);

    h = harness({ usage: [left(0)] });
    await h.resumeAfterCredits();
    check('does not continue into another refusal when the credit never shows',
        h.state.resumed === 0 && h.resumeChat() === 'chat-1' && h.state.waits === 5);
    check('…and leaves a Resume in the chat instead', h.win._banners.length === 1 && /credits haven\u2019t arrived yet/.test(h.win._banners[0]));

    h = harness({ usage: [left(500)], resumable: false });
    await h.resumeAfterCredits();
    check('does nothing with no stopped build in this project', h.state.resumed === 0);

    h = harness({ usage: [left(0), left(500)] });
    h.state.resumable = true;
    const first = h.resumeAfterCredits();
    const second = h.resumeAfterCredits();
    await Promise.all([first, second]);
    check('two notices of one purchase continue once', h.state.resumed === 1);

    h = harness({ usage: [left(0), left(500)] });
    const run = h.resumeAfterCredits();
    h.state.resumable = false; // the user switched projects while it waited
    await run;
    check('does not continue in a project the user has left', h.state.resumed === 0 && h.win._banners.length === 0);

    h = harness({ usage: [left(0)] });
    const late = h.resumeAfterCredits();
    h.state.resumable = false;
    await late;
    check('no Resume left in a project the user has left', h.win._banners.length === 0);

    h = harness({ usage: [left(500)] });
    await h.resumeAfterCredits();
    check('no Resume left when the build continued', h.win._banners.length === 0);

    // A request can be refused with a little credit left. That credit is not
    // the purchase, so the balance has to go above it.
    h = harness({ usage: [left(300), left(300), left(300), left(5300)] });
    await h.openTopUp('usage_limit');
    await h.resumeAfterCredits();
    check('credit left over from before the purchase is not the purchase',
        h.state.resumed === 1 && h.state.waits === 2);

    h = harness({ usage: [left(300)] });
    await h.openTopUp('usage_limit');
    await h.resumeAfterCredits();
    check('does not continue on leftover credit alone', h.state.resumed === 0 && h.state.waits === 5);

    h = harness({ usage: [left(300)] });
    await h.openTopUp('usage_limit');
    await h.resumeAfterCredits({ landed: true });
    check('a purchase already seen on the account needs no rise', h.state.resumed === 1 && h.state.waits === 0);

    h = harness({ usage: [new Error('offline'), left(0), left(500)] });
    await h.openTopUp('usage_limit');
    await h.resumeAfterCredits();
    check('a balance that could not be read before falls back to any credit', h.state.resumed === 1 && h.state.waits === 1);
}

if (failures) { console.error(`\n${failures} add-credits check(s) failed`); process.exit(1); }
console.log('\nAll add-credits checks passed');
