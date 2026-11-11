import fs from 'node:fs';

// ---- The fast first build test (speed, src/js/experiments.js) ------------------
// Every browser is split in half. The 'fast' variant builds each project's
// first build with serviceSpeed 'fast', the 'standard' variant at the model's
// usual speed. This runs the real draw from experiments.js against stubbed
// storage: that the variant sticks, that a forced one wins, and that blocked
// storage still yields one. Then it runs app.js's turn speed for each case and
// text-asserts the wiring: every round of that build asks for it, and the four
// build events carry the variant.

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
    };
}
const blocked = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };

// Load experiments.js as a fresh page would. random is one value, or a list
// handed out in turn.
function load({ local = memoryStorage(), random = 0.1 } = {}) {
    const draws = [].concat(random);
    let n = 0;
    const win = { location: { search: '' } };
    const env = {
        window: win,
        document: { referrer: '' },
        sessionStorage: memoryStorage(),
        localStorage: local,
        Math: Object.assign(Object.create(Math), { random: () => draws[Math.min(n++, draws.length - 1)] }),
        URL, URLSearchParams,
        console: { warn() {}, table() {} },
    };
    new Function('env', `with (env) {\n${SRC}\n}`)(env);
    return { arm: () => win.experiment('speed'), props: () => win.experimentProps('speed'), win, local };
}

const first = load({ random: 0.1 });
check('random < 0.5 draws the fast arm', first.arm() === 'fast');
check('the arm rides on events as speed_variant', JSON.stringify(first.props()) === '{"speed_variant":"fast"}');
check('the arm is kept in localStorage', first.local.getItem('speedTestArm') === 'fast');

const reload = load({ local: first.local, random: 0.9 });
check('a later load keeps the arm, not a fresh draw', reload.arm() === 'fast');

const other = load({ random: 0.9 });
check('random >= 0.5 draws the standard arm', other.arm() === 'standard');

const forced = load({ local: memoryStorage({ speedTestArm: 'standard', experimentOverrides: '{"speed":"fast"}' }) });
check('a forced variant overrides the stored arm', forced.arm() === 'fast');
check('…without overwriting the stored arm', forced.local.getItem('speedTestArm') === 'standard');

const junk = load({ local: memoryStorage({ speedTestArm: 'bogus' }), random: 0.9 });
check('a junk stored arm is redrawn', junk.arm() === 'standard' && junk.local.getItem('speedTestArm') === 'standard');

let threw = false, noStorage = null;
try { noStorage = load({ local: blocked, random: [0.1, 0.9] }); noStorage.arm(); }
catch (e) { threw = true; }
check('blocked storage does not throw', !threw);
check('…and the browser still gets an arm for this load', noStorage && noStorage.arm() === 'fast');
check('…the same one for the whole load', noStorage && noStorage.props().speed_variant === 'fast');

// ---- The turn's speed (app.js) ------------------------------------------------

const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const TOOLS = fs.readFileSync(new URL('../src/js/tools.js', import.meta.url), 'utf8');

const speedLine = APP.match(/isFirstBuildTurn = countUserMessages\(turnSaveContext\.chatHistory\) === 0;\s*turnServiceSpeed = ([^\n]+);/);
check('the speed is decided once, with isFirstBuildTurn', !!speedLine && (APP.match(/turnServiceSpeed = /g) || []).length === 1);
const turnSpeed = speedLine && new Function('isFirstBuildTurn', 'window', `return ${speedLine[1]};`);
const speedFor = (firstBuild, arm) => turnSpeed(firstBuild, arm ? load({ random: arm === 'fast' ? 0.1 : 0.9 }).win : {});
check('a first build in the fast arm asks for fast', turnSpeed && speedFor(true, 'fast') === 'fast');
check('a later build in the fast arm keeps the usual speed', turnSpeed && speedFor(false, 'fast') === undefined);
check('a first build in the standard arm keeps the usual speed', turnSpeed && speedFor(true, 'standard') === undefined);
check('without experiments.js a build keeps the usual speed', turnSpeed && speedFor(true, null) === undefined);

check('the first request of every attempt asks for it',
    /buildChatOptions\(turnModel, \{ tools: turnTools, signal: abortController\.signal, serviceSpeed: turnServiceSpeed \}\)/.test(APP));
check('the turn context carries it to the later rounds', /model: turnModel, serviceSpeed: turnServiceSpeed,/.test(APP));
check('every later round asks for it',
    /buildChatOptions\(c\.model, \{ tools: c\.tools \|\| window\.builtinTools\(\), signal: c\.abortController\.signal, serviceSpeed: c\.serviceSpeed \}\)/.test(TOOLS));

const props = /\.\.\.window\.experimentProps\?\.\('speed'\)/.source;
check('Build Started carries the arm', new RegExp(`window\\.track\\?\\.\\('Build Started', \\{[^\\n]*${props} \\}\\);`).test(APP));
check('Build Completed carries the arm', new RegExp(`'Build Completed',[\\s\\S]{0,500}\\.\\.\\.turnTemplate,\\s*${props} \\},`).test(APP));
check('Build Abandoned carries the arm', new RegExp(`'Build Abandoned', \\{[\\s\\S]{0,300}\\.\\.\\.templatePropFor\\(build\\.template\\), ${props},`).test(APP));
check('Usage Limit Hit carries the arm', new RegExp(`'Usage Limit Hit', \\{[^\\n]*${props} \\}\\)\\);`).test(APP));

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall fast first build test checks passed');
