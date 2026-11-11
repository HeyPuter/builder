import fs from 'node:fs';

// ---- The developer starter test (src/js/experiments.js) ----------------------
// Visitors from developer.puter.com or docs.puter.com are split in half between
// the developer starter pills and the usual ones. This runs the real detection
// and draw from experiments.js against stubbed browser globals: who enters the
// test, that the session and the variant stick, that a forced variant wins, and
// that blocked storage still yields a variant instead of throwing into boot.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const SRC = fs.readFileSync(new URL('../src/js/experiments.js', import.meta.url), 'utf8');
const UI = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');

function memoryStorage(seed = {}) {
    const m = new Map(Object.entries(seed));
    return {
        getItem: k => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => { m.set(k, String(v)); },
        removeItem: k => { m.delete(k); },
        _map: m,
    };
}
const blocked = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };

// Load experiments.js as a fresh page would. random is one value, or a list
// handed out in turn. Returns { arm, props } plus the storages, so a second
// load can reuse them.
function load({ referrer = '', search = '', session = memoryStorage(), local = memoryStorage(), random = 0.1 } = {}) {
    const draws = [].concat(random);
    let n = 0;
    const win = { location: { search } };
    const env = {
        document: { referrer },
        window: win,
        sessionStorage: session,
        localStorage: local,
        Math: Object.assign(Object.create(Math), { random: () => draws[Math.min(n++, draws.length - 1)] }),
        URL, URLSearchParams,
        console: { warn() {}, table() {} },
    };
    new Function('env', `with (env) {\n${SRC}\n}`)(env);
    return { arm: () => win.experiment('starter'), props: () => win.experimentProps('starter'), win, session, local };
}
const sourceOf = (referrer, search = '') => load({ referrer, search }).session.getItem('starterTestSource');

check('developer.puter.com referrer → developer.puter.com', sourceOf('https://developer.puter.com/') === 'developer.puter.com');
check('docs.puter.com referrer with a path → docs.puter.com', sourceOf('https://docs.puter.com/AI/chat/') === 'docs.puter.com');
check('docs link utm_source with no referrer → docs.puter.com', sourceOf('', '?utm_source=docs.puter.com&utm_medium=referral') === 'docs.puter.com');
check('puter.com referrer → not in the test', load({ referrer: 'https://puter.com/' }).arm() === null);
check('a look-alike host → not in the test', load({ referrer: 'https://developer.puter.com.evil.example/' }).arm() === null);
check('no referrer, no utm → not in the test', load().arm() === null);

const outside = load({ referrer: 'https://www.google.com/' });
check('a visitor from elsewhere is outside the test', outside.arm() === null);
check('…and their events get no pill_variant prop', JSON.stringify(outside.props()) === '{}');
check('…and nothing is drawn for them', outside.local.getItem('starterTestArm') === null);

const first = load({ referrer: 'https://developer.puter.com/', random: 0.1 });
check('a developer.puter.com visitor enters the test', first.session.getItem('starterTestSource') === 'developer.puter.com' && first.arm() !== null);
check('random < 0.5 draws the developer arm', first.arm() === 'developer');
check('the arm rides on events as pill_variant', first.props().pill_variant === 'developer');
check('the arm is kept in localStorage', first.local.getItem('starterTestArm') === 'developer');

const reload = load({ referrer: 'https://builder.puter.com/what-to-build/', session: first.session, local: first.local, random: 0.9 });
check('a later load in the same tab session stays in the test', reload.session.getItem('starterTestSource') === 'developer.puter.com');
check('…with the same arm, not a fresh draw', reload.arm() === 'developer');

const newSession = load({ referrer: '', local: first.local, random: 0.9 });
check('a new session with no developer referrer is outside the test', newSession.arm() === null);

const back = load({ referrer: 'https://docs.puter.com/', local: first.local, random: 0.9 });
check('a returning browser keeps its arm on its next visit from the docs', back.arm() === 'developer' && back.session.getItem('starterTestSource') === 'docs.puter.com');

const other = load({ referrer: 'https://docs.puter.com/', random: 0.9 });
check('random >= 0.5 draws the default arm', other.arm() === 'default');

const forced = load({ search: '?utm_source=developer.puter.com', local: memoryStorage({ starterTestArm: 'default', experimentOverrides: '{"starter":"developer"}' }) });
check('a forced variant overrides the stored arm', forced.arm() === 'developer');
check('…without overwriting the stored arm', forced.local.getItem('starterTestArm') === 'default');
const forcedOutside = load({ local: memoryStorage({ experimentOverrides: '{"starter":"developer"}' }) });
check('a forced variant puts a visitor from elsewhere in the test', forcedOutside.arm() === 'developer' && forcedOutside.props().pill_variant === 'developer');

const junk = load({ referrer: 'https://docs.puter.com/', local: memoryStorage({ starterTestArm: 'bogus' }), random: 0.9 });
check('a junk stored arm is redrawn', junk.arm() === 'default' && junk.local.getItem('starterTestArm') === 'default');

let threw = false, noStorage = null;
try { noStorage = load({ referrer: 'https://developer.puter.com/', session: blocked, local: blocked, random: [0.1, 0.9] }); noStorage.arm(); }
catch (e) { threw = true; }
check('blocked storage does not throw', !threw);
check('…and the visitor still gets an arm for this load', noStorage && noStorage.arm() === 'developer');
check('…the same one for the whole load', noStorage && noStorage.props().pill_variant === 'developer');

// The render picks up the arm, and Project Created reports it.
const r0 = UI.indexOf('function renderStarterPrompts(');
const render = UI.slice(r0, UI.indexOf('\n}\n', r0));
check('the developer arm renders DEVELOPER_STARTER_PROMPTS', /window\.experiment\('starter'\) === 'developer' \? DEVELOPER_STARTER_PROMPTS : STARTER_PROMPTS/.test(render));

const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
check('Project Created carries the arm', /window\.track\?\.\('Project Created', \{ \.\.\.window\.experimentProps\?\.\('starter'\), \.\.\.turnTemplate \}\);/.test(APP));

const dev = UI.slice(UI.indexOf('const DEVELOPER_STARTER_PROMPTS = ['), UI.indexOf('];', UI.indexOf('const DEVELOPER_STARTER_PROMPTS = [')));
const labels = [...dev.matchAll(/label: '([^']+)'/g)].map(m => m[1]);
check('there are more developer ideas than the six the row shows', labels.length > 6);
check('the developer ideas include the AI chatbot and the resume analyzer', labels.includes('AI chatbot') && labels.includes('AI resume analyzer'));
check('no two developer ideas share a label', new Set(labels).size === labels.length);

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall starter test checks passed');
