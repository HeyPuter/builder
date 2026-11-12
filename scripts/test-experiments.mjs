import fs from 'node:fs';

// ---- experiment(), every A/B test in one place (src/js/experiments.js) --------
// Runs the real file against stubbed browser globals, once per "page load":
// the console API (the printed list, set, reset, and the warnings for a value
// or name that doesn't exist), and the Low Balance dialog cohort, which moved
// here from app.js and must put every account in the same cohort as before.
// The starter and speed tests have their own files.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const SRC = fs.readFileSync(new URL('../src/js/experiments.js', import.meta.url), 'utf8');

function memoryStorage(seed = {}) {
    const m = new Map(Object.entries(seed));
    return {
        getItem: k => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { m.set(k, String(v)); },
        removeItem: k => { m.delete(k); },
        _map: m,
    };
}
const blocked = {
    getItem() { throw new Error('SecurityError'); },
    setItem() { throw new Error('SecurityError'); },
    removeItem() { throw new Error('SecurityError'); },
};

function load({ referrer = '', search = '', local = memoryStorage(), random = 0.1, puter, user = null } = {}) {
    const warnings = [], tables = [];
    const win = { location: { search }, user };
    const env = {
        window: win,
        document: { referrer },
        sessionStorage: memoryStorage(),
        localStorage: local,
        Math: Object.assign(Object.create(Math), { random: () => random }),
        URL, URLSearchParams,
        console: { warn: m => warnings.push(String(m)), table: t => tables.push(t) },
        puter,
    };
    new Function('env', `with (env) {\n${SRC}\n}`)(env);
    return { experiment: win.experiment, experimentProps: win.experimentProps, win, local, warnings, tables };
}

// The starter test is the running one these use. A visitor from
// developer.puter.com is in it, and random < 0.5 draws 'developer'.
const DEV = 'https://developer.puter.com/';

// ---- The printed list -----------------------------------------------------------

{
    const h = load({ referrer: DEV, random: 0.1 });
    const ret = h.experiment();
    const t = h.tables[0] || {};
    check('experiment() prints one table and returns nothing', h.tables.length === 1 && ret === undefined);
    check('…with every test', JSON.stringify(Object.keys(t)) === '["starter","speed","limitDialog"]');
    check('…the valid values of each', t.speed.valid === 'fast | standard' && t.starter.valid === 'developer | default' && t.limitDialog.valid === 'custom | default');
    check('…your variant and that it was drawn', t.starter.variant === 'developer' && t.starter.how === 'drawn');
    check('…the tests you are outside of', t.limitDialog.variant === 'app' && t.limitDialog.how === 'not in test');
    check('…and the ones that ended', t.speed.variant === null && t.speed.how === 'ended');
    const out = load();
    out.experiment();
    check('a visitor from elsewhere is outside the starter test', out.tables[0].starter.variant === null && out.tables[0].starter.how === 'not in test');
}

// ---- set and reset --------------------------------------------------------------

{
    const h = load({ referrer: DEV, random: 0.1 });
    check('starter draws developer here', h.experiment('starter') === 'developer');
    h.experiment.set('starter', 'default');
    check('set forces a variant', h.experiment('starter') === 'default' && h.warnings.length === 0);
    check('…kept under experimentOverrides', h.local.getItem('experimentOverrides') === '{"starter":"default"}');
    check('…without touching the drawn one', h.local.getItem('starterTestArm') === 'developer');
    h.experiment();
    check('the list says it is forced', h.tables[0].starter.variant === 'default' && h.tables[0].starter.how === 'forced');
    check('events report the forced variant', JSON.stringify(h.experimentProps('starter')) === '{"pill_variant":"default"}');

    check('a later load keeps the forced variant', load({ referrer: DEV, local: h.local, random: 0.9 }).experiment('starter') === 'default');

    h.experiment.set('starter', 'Developer');
    check('a variant that does not exist warns with the valid ones', /starter has no variant "Developer"\. Valid: developer, default/.test(h.warnings.at(-1) || ''));
    check('…and changes nothing', h.experiment('starter') === 'default');

    h.experiment.set('startr', 'developer');
    check('a test that does not exist warns with the known ones', /no "startr"\. Known: starter, speed, limitDialog/.test(h.warnings.at(-1) || ''));
    check('…and stores nothing for it', h.local.getItem('experimentOverrides') === '{"starter":"default"}');

    const before = h.warnings.length;
    check('reading a test that does not exist warns and gives null', h.experiment('startr') === null && h.warnings.length === before + 1);
    check('…and its props are empty', JSON.stringify(h.experimentProps('startr')) === '{}');
    check('Object built-ins are not tests', h.experiment('toString') === null && h.experiment('__proto__') === null);

    h.experiment.set('limitDialog', 'custom');
    h.experiment.reset('starter');
    check('reset(name) goes back to the drawn variant', h.experiment('starter') === 'developer');
    check('…and leaves the other overrides', h.local.getItem('experimentOverrides') === '{"limitDialog":"custom"}');
    h.experiment.reset();
    check('reset() clears every override', h.local.getItem('experimentOverrides') === null && h.experiment('limitDialog') === 'app');
}

{
    const h = load({ referrer: DEV, local: memoryStorage({ experimentOverrides: 'not json' }) });
    check('unreadable overrides are ignored', h.experiment('starter') === 'developer');
    const g = load({ referrer: DEV, random: 0.9, local: memoryStorage({ experimentOverrides: '{"starter":"Developer","speed":"fast"}' }) });
    check('a stored override that is not a variant is ignored', g.experiment('starter') === 'default');
    check('…while the valid one beside it still counts', g.experiment('speed') === 'fast');
    const arr = load({ referrer: DEV, local: memoryStorage({ experimentOverrides: '["default"]' }) });
    check('an override list that is not an object is ignored', arr.experiment('starter') === 'developer');
}

{
    let threw = false, h = null;
    try {
        h = load({ referrer: DEV, local: blocked, random: 0.9 });
        h.experiment.set('starter', 'developer');
        h.experiment.reset();
        h.experiment();
    } catch (e) { threw = true; }
    check('blocked storage never throws', !threw);
    check('…set says nothing could be forced', h && /storage is blocked/.test(h.warnings.join('\n')));
    check('…and the variant is still drawn', h && h.experiment('starter') === 'default');
}

// ---- An ended test (speed) --------------------------------------------------------

{
    const h = load({ random: 0.1 });
    check('an ended test puts nobody in it', h.experiment('speed') === null);
    check('…so its events carry nothing', JSON.stringify(h.experimentProps('speed')) === '{}');
    check('…and nothing is drawn or stored for it', h.local.getItem('speedTestArm') === null);
    check('a browser drawn before it ended is out of it too',
        load({ local: memoryStorage({ speedTestArm: 'fast' }) }).experiment('speed') === null);
    h.experiment.set('speed', 'fast');
    check('a forced variant still applies, to try it by hand',
        h.experiment('speed') === 'fast' && JSON.stringify(h.experimentProps('speed')) === '{"speed_variant":"fast"}');
    h.experiment();
    check('…and the list says it is forced', h.tables[0].speed.how === 'forced');
}

// ---- limitDialog: the same cohort as before it moved ----------------------------

{
    const web = (uuid, local) => load({ puter: { env: 'web' }, user: uuid ? { uuid } : null, local }).experiment('limitDialog');
    // What app.js's limitDialogCohort() returned for these accounts.
    const BEFORE = {
        'user-a': 'default',
        'user-b': 'custom',
        '0b6f3c2e-9a41-4d8e-b0f7-1c2d3e4f5a6b': 'custom',
        'd1e2f3a4-b5c6-4789-90ab-cdef01234567': 'custom',
        'f00dbabe-0000-4000-8000-000000000001': 'default',
        '7c9e6679-7425-40de-944b-e07fc1f90ae7': 'custom',
        'a': 'default',
        'zz': 'custom',
    };
    check('every account keeps the cohort it had', Object.entries(BEFORE).every(([id, cohort]) => web(id) === cohort));
    check('no puter / desktop app → app cohort', load().experiment('limitDialog') === 'app' && load({ puter: { env: 'app' } }).experiment('limitDialog') === 'app');
    check('…and its events still say app', JSON.stringify(load({ puter: { env: 'app' } }).experimentProps('limitDialog')) === '{"cohort":"app"}');
    check('web without a user → default', web(null) === 'default');
    check('cohort is stable per account', web('user-a') === web('user-a'));
    let custom = 0;
    for (let i = 0; i < 2000; i++) if (web('u-' + i + '-x') === 'custom') custom++;
    check(`cohorts split about evenly (${custom}/2000 custom)`, custom > 900 && custom < 1100);
    const st = memoryStorage();
    const h = load({ puter: { env: 'web' }, user: { uuid: 'user-a' }, local: st });
    h.experiment.set('limitDialog', 'custom');
    const forcedCustom = h.experiment('limitDialog');
    h.experiment.set('limitDialog', 'default');
    check('set forces the cohort', forcedCustom === 'custom' && h.experiment('limitDialog') === 'default');
    const desk = load({ puter: { env: 'app' }, local: memoryStorage({ experimentOverrides: '{"limitDialog":"custom"}' }) });
    check('a forced cohort does not apply inside the desktop', desk.experiment('limitDialog') === 'app'
        && JSON.stringify(desk.experimentProps('limitDialog')) === '{"cohort":"app"}');
    desk.experiment();
    check('…and the list says it is not in the test', desk.tables[0].limitDialog.how === 'not in test');
    check('the cohort follows the user who signs in later', (() => {
        const late = load({ puter: { env: 'web' } });
        const first = late.experiment('limitDialog');
        late.win.user = { uuid: 'user-b' };
        return first === 'default' && late.experiment('limitDialog') === 'custom';
    })());
}

// ---- Wiring -------------------------------------------------------------------

const read = p => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const VITE = read('../vite.config.js');
const at = f => VITE.indexOf(`'js/${f}'`);
check('loaded before ui.js and app.js', at('experiments.js') > 0 && at('experiments.js') < at('ui.js') && at('experiments.js') < at('app.js'));
const APP = read('../src/js/app.js'), UI = read('../src/js/ui.js');
check('the old per-test code and debug keys are gone',
    !/limitDialogCohort|starterTest\b|starterTestProps|speedTest\b|speedTestProps|debugLimitCohort|debugStarterArm|debugSpeedArm/.test(APP + UI));
check('the limit hit and its pay record carry the cohort',
    /cohort: window\.experiment\('limitDialog'\),\n\s*\.\.\.templateProp\(history\)/.test(APP)
    && /plan, cohort: window\.experiment\('limitDialog'\), template \}/.test(APP));
check('the Low Balance dialog and its funnel read the cohort',
    (UI.match(/const cohort = window\.experiment\('limitDialog'\);/g) || []).length === 2);

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall experiment checks passed');
