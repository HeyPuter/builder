import fs from 'node:fs';

// ---- The fast first build test (speed, src/js/experiments.js) ------------------
// Ended 2026-11-12, when fast mode opened to every account. Nobody is drawn
// into it anymore, so every first build runs at the usual speed and the build
// events carry no speed_variant. Its code stays for a rerun: a forced variant
// still applies, and with 'fast' forced, app.js still builds an Opus first
// build fast. This runs the real experiments.js against stubbed storage, then
// app.js's turn speed for each case, and text-asserts the wiring.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const SRC = fs.readFileSync(new URL('../src/js/experiments.js', import.meta.url), 'utf8');
const MODEL_SRC = fs.readFileSync(new URL('../src/js/model-core.js', import.meta.url), 'utf8');
const modelWin = { FEATURE_FLAGS: {} };
new Function('window', MODEL_SRC)(modelWin);
const ModelCore = modelWin.ModelCore;

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

const fresh = load({ random: 0.1 });
check('it has ended, so nobody is in it', fresh.arm() === null);
check('…the build events carry no speed_variant', JSON.stringify(fresh.props()) === '{}');
check('…and nothing is drawn or stored', fresh.local.getItem('speedTestArm') === null);

const drawnBefore = load({ local: memoryStorage({ speedTestArm: 'fast' }) });
check('a browser drawn into the fast arm before it ended is out of it too', drawnBefore.arm() === null);
check('…its draw kept for a rerun', drawnBefore.local.getItem('speedTestArm') === 'fast');

const forced = load({ local: memoryStorage({ experimentOverrides: '{"speed":"fast"}' }) });
check('a forced variant still applies', forced.arm() === 'fast');
check('…and rides on events as speed_variant', JSON.stringify(forced.props()) === '{"speed_variant":"fast"}');

let threw = false;
try { load({ local: blocked }).arm(); } catch (e) { threw = true; }
check('blocked storage does not throw', !threw);

// ---- The turn's speed (app.js) ------------------------------------------------
// Decided once the turn's model is settled, so a plan that lapsed (Opus again)
// and a model without a fast tier are both seen.

const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const TOOLS = fs.readFileSync(new URL('../src/js/tools.js', import.meta.url), 'utf8');

const speedLine = APP.match(/turnModel = await window\.ModelPicker\.allowedForTurn\(chosenModel\);\s*turnServiceSpeed = ([^\n]+);/);
// The one other assignment is the refusal fallback's: a turn that switches
// from Opus to the fallback model (refusal branch of the retry loop) clears
// it, since the fast tier is Opus's. It sets nothing else.
const speedAssignments = APP.match(/turnServiceSpeed = [^\n]*/g) || [];
const refusalReset = speedAssignments.filter((s) => s === 'turnServiceSpeed = undefined;');
check('the speed is decided once, right after the model is settled', !!speedLine
    && speedAssignments.length === 2 && refusalReset.length === 1
    && /isModelRefusal\(streamError\)\) \{[\s\S]{0,1200}turnServiceSpeed = undefined;[\s\S]{0,800}continue;/.test(APP));
const turnSpeed = speedLine && new Function('isFirstBuildTurn', 'turnModel', 'window', `return ${speedLine[1]};`);
// arm: 'fast' or 'standard' forced, 'none' for nothing forced, null for no
// experiments.js at all.
const speedFor = (firstBuild, arm, model = 'claude-opus-5-5') => {
    const local = memoryStorage(arm && arm !== 'none' ? { experimentOverrides: JSON.stringify({ speed: arm }) } : {});
    const win = arm ? load({ local, random: 0.1 }).win : {};
    win.ModelCore = ModelCore;
    return turnSpeed(firstBuild, model, win);
};
check('now it has ended, an Opus first build keeps the usual speed', turnSpeed && speedFor(true, 'none') === undefined);
check('with fast forced, an Opus first build asks for fast', turnSpeed && speedFor(true, 'fast') === 'fast');
check('…a later build keeps the usual speed', turnSpeed && speedFor(false, 'fast') === undefined);
check('with standard forced, a first build keeps the usual speed', turnSpeed && speedFor(true, 'standard') === undefined);
check('a first build on another model keeps the usual speed, even with fast forced',
    turnSpeed && ['claude-sonnet-5-5', 'gpt-6.1-sol', 'gemini-4-argon'].every(m => speedFor(true, 'fast', m) === undefined));
check('without experiments.js a build keeps the usual speed', turnSpeed && speedFor(true, null) === undefined);

// Without the experiment's speed, a request asks the user's fast mode
// (js/fast-mode.js, see test-fast-mode.mjs), so the experiment's wins.
check('the first request of every attempt asks for it',
    /buildChatOptions\(turnModel, \{ tools: turnTools, signal: abortController\.signal, serviceSpeed: turnServiceSpeed \|\| window\.FastMode\?\.requestSpeed\(turnModel, turnStats\) \}\)/.test(APP));
check('the turn context carries it to the later rounds', /model: turnModel, serviceSpeed: turnServiceSpeed,/.test(APP));
check('every later round asks for it',
    /buildChatOptions\(c\.model, \{ tools: c\.tools \|\| window\.builtinTools\(\), signal: c\.abortController\.signal, serviceSpeed: c\.serviceSpeed \|\| window\.FastMode\?\.requestSpeed\(c\.model, c\.turnStats\) \}\)/.test(TOOLS));

const props = /\.\.\.window\.experimentProps\?\.\('speed'\)/.source;
check('Build Started carries the arm', new RegExp(`window\\.track\\?\\.\\('Build Started', \\{[^\\n]*${props} \\}\\);`).test(APP));
check('Build Completed carries the arm', new RegExp(`'Build Completed',[\\s\\S]{0,500}\\.\\.\\.turnTemplate,\\s*${props} \\},`).test(APP));
check('Build Abandoned carries the arm', new RegExp(`'Build Abandoned', \\{[\\s\\S]{0,300}\\.\\.\\.templatePropFor\\(build\\.template\\), ${props},`).test(APP));
check('Usage Limit Hit carries the arm', new RegExp(`'Usage Limit Hit', \\{[^\\n]*${props} \\}\\)\\);`).test(APP));

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall fast first build test checks passed');
