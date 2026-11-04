import fs from 'node:fs';
import vm from 'node:vm';

// ---- Project Published analytics payload ------------------------------------
// doPublish() reports the project's AI usage (token buckets, cost, coarse bands)
// and whether this was the first publish on the Project Published event. The
// tracking is wrapped so a failure there falls back to a minimal event instead
// of failing the publish — which also means a broken enriched path would go
// unnoticed by the other publish tests, whose sandboxes don't load the usage
// helpers and so always take the fallback. This drives the real doPublish with
// those helpers loaded and checks the payload itself.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const source = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const helpersSource = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');

// Slice a top-level function out of the real file (same approach as the other
// ui.js tests) so the production code under test is never re-typed here.
function extract(src, signature) {
    const a = src.indexOf(signature);
    if (a < 0) throw new Error('could not find ' + signature);
    const b = src.indexOf('\n}\n', a);
    if (b < 0) throw new Error('could not find the end of ' + signature);
    return src.slice(a, b + 2);
}

// A contiguous run of the file, from `from` to the end of the function `last`.
function slice(src, from, last) {
    const a = src.indexOf(from);
    if (a < 0) throw new Error('could not find ' + from);
    const b = src.indexOf('\n}\n', src.indexOf(last, a));
    if (b < 0) throw new Error('could not find the end of ' + last);
    return src.slice(a, b + 2);
}
const PUBLISH_CODE = [
    extract(source, 'function publishedRootDir() {'),
    extract(source, 'function publishedDirForChat(chatId) {'),
    extract(source, 'function newReleaseDirName() {'),
    slice(source, 'const PUBLISHED_BACKEND_DIR', 'function publishedBackendDir(chatId) {'),
    extract(source, 'async function retirePublishedReleases(pubRoot, keepName) {'),
    slice(source, 'const LIVE_WORKER_SUFFIX', 'async function retirePublishedWorkers(chatId, keepNames) {'),
    extract(source, 'function previewSubdomain(url) {'),
    extract(source, 'function shortRand() {'),
    extract(source, 'function slugifyTitle(t) {'),
    extract(source, 'function publishBlockedReason() {'),
    extract(source, 'async function createPublishSubdomain(path, desired'),
    extract(helpersSource, 'function generateChatTitle(history) {'),
    extract(helpersSource, 'function templateProp(history) {'),
    extract(helpersSource, 'function templatePropFor(slug) {'),
    extract(source, 'async function doPublish({ reserved = null } = {}) {'),
    extract(source, 'function publishedNoteMessage(url, isFirst) {'),
    extract(source, 'function pushAiNote(history, note) {'),
    extract(source, 'async function publishProject(ui) {'),
].join('\n\n');
const USAGE_CODE = [
    extract(helpersSource, 'function sumChatCostCents(history) {'),
    extract(helpersSource, 'function sumChatTokenUsage(history) {'),
    extract(helpersSource, 'function tokenBand(n) {'),
    helpersSource.slice(helpersSource.indexOf('const COST_BANDS = ['), helpersSource.indexOf('function costBand(cents) {')),
    extract(helpersSource, 'function costBand(cents) {'),
].join('\n\n');
const CORE_SOURCE = fs.readFileSync(new URL('../src/js/template-core.js', import.meta.url), 'utf8');

const ROOT = '/alice/AppData/builder';
const WORK = ROOT + '/project-a';
const PUB = ROOT + '/.published/project-a';

async function run({ published, history, withUsageHelpers = true, ui = null, createError = null, switchAway = false, extra = null, extraWindow = null }) {
    const files = new Map([[WORK, 'NEW WORK']]);
    if (published) files.set(PUB, 'OLD COPY');
    const events = [], alerts = [];
    const sandbox = {
        currentChatId: 'project-a',
        currentAppDir: WORK,
        chatHistory: history,
        isProcessing: false,
        _publishPanelOpen: false,
        _publishPanelView: 'form',
        _publishViewIsFirst: false,
        _publishSuccessData: null,
        renderPublishPanel() {},
        setPublishBusy() {},
        loadPublishedSiteMeta: async () => ({ title: '', description: '', icon: '' }),
        $: () => ({ length: 0, val: () => 'alpha-notes', trigger() { return this; }, 0: undefined }),
        console: { warn() {}, error() {} },
        saveCurrentChat: async () => {},
        window: {
            user: { username: 'alice' },
            currentPreviewPath: WORK,
            currentPublishedUrl: published ? 'https://ay-site.puter.site/' : null,
            currentPublishedPath: published ? PUB : null,
            currentPublishedVersionId: published ? 'v0' : null,
            _projectDirtySinceSnapshot: false,
            getCurrentVersionId: () => 'v1',
            savePublishedFields: async () => {},
            showToast() {},
            isSubdomainLimitErr: () => false,
            isSubdomainTakenErr: () => false,
            puterErrInfo: e => ({ message: e && e.message }),
            track: (event, props) => events.push({ event, props }),
        },
        puter: {
            appID: 'builder',
            randName: () => 'random-name',
            ui: { alert: async msg => alerts.push(String(msg)) },
            fs: {
                mkdir: async () => {},
                delete: async path => { files.delete(path); },
                readdir: async dir => {
                    const kids = [...files.keys()]
                        .filter(p => p.startsWith(dir + '/'))
                        .map(p => ({ name: p.slice(dir.length + 1).split('/')[0], is_dir: true }));
                    if (kids.length) return kids;
                    if (files.has(dir)) return [{ name: 'index.html', is_dir: false }];
                    throw new Error('not found');
                },
                copy: async (from, to, options) => { files.set(to + '/' + options.newName, files.get(from)); },
            },
            hosting: {
                create: async sub => {
                    if (switchAway) sandbox.currentChatId = 'project-b'; // opened while it publishes
                    if (createError) throw createError;
                    return { subdomain: sub };
                },
                update: async () => {},
            },
        },
    };
    if (extra) Object.assign(sandbox, extra(sandbox));
    if (extraWindow) Object.assign(sandbox.window, extraWindow(sandbox));
    new Function('window', CORE_SOURCE)(sandbox.window);
    vm.createContext(sandbox);
    vm.runInContext(PUBLISH_CODE + (withUsageHelpers ? '\n\n' + USAGE_CODE : ''), sandbox, { filename: 'src/js/ui.js' });
    await (ui ? sandbox.publishProject(ui) : sandbox.doPublish());
    return { events: events.filter(e => e.event === 'Project Published'), alerts };
}

// Usage lands on assistant messages (see flushTurnUsage); user messages carry none.
const HISTORY = [
    { role: 'system', content: '' },
    { role: 'user', content: 'Alpha Notes App' },
    { role: 'assistant', content: 'built', costUsdCents: 12.5,
        tokenUsage: { input: 40000, output: 20000, cacheRead: 150000, cacheWrite: 30000 } },
    { role: 'user', content: 'make it blue' },
    { role: 'assistant', content: 'done', costUsdCents: 3.25,
        tokenUsage: { input: 5000, output: 5000, cacheRead: 50000, cacheWrite: 0 } },
];

// ---- First publish: full payload --------------------------------------------
{
    const { events, alerts } = await run({ published: false, history: HISTORY });
    const p = events[0] && events[0].props;
    check('first publish: exactly one Project Published event', events.length === 1, JSON.stringify(events));
    check('first publish: no error shown', alerts.length === 0, JSON.stringify(alerts));
    check('first publish: flagged as first', p && p.first_publish === true && p.type === 'first', JSON.stringify(p));
    check('first publish: per-bucket token totals summed across messages',
        p && p.tokens_input === 45000 && p.tokens_output === 25000
        && p.tokens_cache_read === 200000 && p.tokens_cache_write === 30000, JSON.stringify(p));
    check('first publish: tokens_total sums every bucket', p && p.tokens_total === 300000, JSON.stringify(p));
    check('first publish: tokens_band from the total', p && p.tokens_band === '100K-500K', JSON.stringify(p));
    check('first publish: cost_cents summed and rounded to whole cents', p && p.cost_cents === 16, JSON.stringify(p));
    check('first publish: cost_band from the unrounded cost', p && p.cost_band === '<$0.25', JSON.stringify(p));
}

// ---- The template a project was copied from ---------------------------------
{
    const p0 = (await run({ published: false, history: HISTORY })).events[0].props;
    check('a project from scratch: from_template false, no template prop', p0 && p0.from_template === false && !('template' in p0), JSON.stringify(p0));
    const fork = [{ ...HISTORY[0], templateOrigin: { slug: 'feedback-board', name: 'Feedback board', version: 'abcdef12' } }, ...HISTORY.slice(1)];
    const p = (await run({ published: false, history: fork })).events[0].props;
    check('a fork: the template it came from, alongside the totals',
        p && p.from_template === true && p.template === 'feedback-board' && p.tokens_total === 300000, JSON.stringify(p));
}

// ---- Republish: same totals, flagged as not first ---------------------------
{
    const { events } = await run({ published: true, history: HISTORY });
    const p = events[0] && events[0].props;
    check('republish: flagged as not first', p && p.first_publish === false && p.type === 'republish', JSON.stringify(p));
    check('republish: still reports whole-project totals', p && p.tokens_total === 300000, JSON.stringify(p));
}

// ---- No recorded usage: the "0" band ----------------------------------------
{
    const { events } = await run({ published: false, history: HISTORY.slice(0, 2) });
    const p = events[0] && events[0].props;
    check('no usage: zero totals and the "0" / "$0" bands',
        p && p.tokens_total === 0 && p.tokens_band === '0' && p.cost_cents === 0 && p.cost_band === '$0',
        JSON.stringify(p));
}

// ---- Usage helpers missing: falls back, publish still succeeds --------------
{
    const { events, alerts } = await run({ published: false, history: HISTORY, withUsageHelpers: false });
    const p = events[0] && events[0].props;
    check('fallback: publish still succeeds', alerts.length === 0, JSON.stringify(alerts));
    check('fallback: minimal event still sent',
        events.length === 1 && p.type === 'first' && p.first_publish === true && !('tokens_total' in p),
        JSON.stringify(events));
    const fork = [{ ...HISTORY[0], templateOrigin: { slug: 'feedback-board', name: 'Feedback board', version: 'abcdef12' } }, ...HISTORY.slice(1)];
    const f = (await run({ published: false, history: fork, withUsageHelpers: false })).events[0];
    check('fallback: a fork still names the template', f && f.props.from_template === true && f.props.template === 'feedback-board', JSON.stringify(f));
}

// ---- The AI hears about the publish -----------------------------------------
// The user publishes outside any turn, so a hidden note tells the AI on its
// next message that the site is live (and where), whichever surface it came from.
{
    const first = structuredClone(HISTORY);
    await run({ published: false, history: first });
    const note = first[first.length - 1];
    const text = note && Array.isArray(note.content) && note.content[0] && note.content[0].text;
    check('first publish: a hidden note for the AI with the address',
        note.role === 'assistant' && note.versionNote === true && note.content.length === 1
        && note.content[0].type === 'text-hidden' && /published the app/.test(text) && /https:\/\/[a-z0-9-]+\.puter\.site\//.test(text),
        JSON.stringify(note));
    const again = structuredClone(HISTORY);
    await run({ published: true, history: again });
    const n2 = again[again.length - 1];
    check('republish: the note says the latest changes are live',
        n2.content[0].type === 'text-hidden' && /latest changes/.test(n2.content[0].text) && n2.content[0].text.includes('https://ay-site.puter.site/'),
        JSON.stringify(n2));
}

// ---- Published from the chat's Publish card ----------------------------------
// The card (tools/chat_ui/publish.js) runs the same publish with its own hooks
// and source. The popover's event carries no source.
{
    const seen = [];
    const card = {
        source: 'chat',
        render() { seen.push('render'); },
        desiredName: () => 'bakery',
        start(isFirst) { seen.push('start:' + isFirst); },
        success({ url, isFirst }) { seen.push('success:' + url + ':' + isFirst); },
        fail(e) { seen.push('fail'); },
    };
    const { events, alerts } = await run({ published: false, history: HISTORY, ui: card });
    const p = events[0] && events[0].props;
    check('card: published, reported with source chat', events.length === 1 && p.source === 'chat' && p.first_publish === true, JSON.stringify(events));
    check('card: its hooks ran in order, at the address it typed',
        seen.join() === 'start:true,success:https://bakery.puter.site/:true', seen.join());
    check('card: no popover alert', alerts.length === 0, JSON.stringify(alerts));
    const panel = (await run({ published: false, history: HISTORY })).events[0].props;
    check('popover: no source on its event', panel && !('source' in panel), JSON.stringify(panel));

    seen.length = 0;
    const failed = await run({ published: false, history: HISTORY, ui: card, createError: new Error('boom') });
    check('card failure: its fail hook runs, with no alert and no event',
        seen.join() === 'start:true,fail' && failed.alerts.length === 0 && failed.events.length === 0,
        JSON.stringify({ seen, alerts: failed.alerts, events: failed.events }));

    // Live once another project is open: success is for the open project,
    // so the card hears it through away, to record it on its own project.
    seen.length = 0;
    card.away = ({ chatId, url, isFirst }) => { seen.push('away:' + chatId + ':' + url + ':' + isFirst); };
    const away = await run({ published: false, history: HISTORY, ui: card, switchAway: true });
    check('card, another project open by the end: away runs instead of success, and it is counted',
        seen.join() === 'start:true,away:project-a:https://bakery.puter.site/:true' && away.events.length === 1,
        JSON.stringify({ seen, events: away.events }));
    const popoverAway = await run({ published: false, history: HISTORY, switchAway: true });
    check('popover, the same: it has no away hook, and the publish still counts', popoverAway.events.length === 1);
}

// ---- The card sees its failure with the busy state clear --------------------
// A failed publish clears its busy state before the surface shows the
// failure: the card's redraw while busy clears its error (and the popover's
// draws the progress note again), so a failure shown while still busy was
// wiped at once. The other tests stub the busy state out.
{
    let busy = false, busyAtFail = null;
    const card = {
        source: 'chat',
        render() {},
        desiredName: () => 'bakery',
        start() {},
        success() {},
        fail() { busyAtFail = busy; },
    };
    await run({ published: false, history: HISTORY, ui: card, createError: new Error('boom'),
        extra: () => ({ setPublishBusy(b) { busy = b; } }) });
    check('card failure: the busy state is clear when its fail hook runs', busyAtFail === false, String(busyAtFail));
}

// ---- No publish while this project's address is moving ---------------------
// Publishing then would update the address that is about to go away. The
// wait was only checked by reading the source.
{
    const seen = [], toasts = [];
    const card = {
        source: 'chat',
        render() { seen.push('render'); },
        desiredName: () => 'bakery',
        start() { seen.push('start'); },
        success() { seen.push('success'); },
        fail() { seen.push('fail'); },
    };
    const r = await run({ published: true, history: HISTORY, ui: card,
        extraWindow: () => ({
            isAddressChanging: (id) => id === 'project-a',
            showToast: (text) => toasts.push(text),
        }) });
    check('while the address moves: nothing is published, and the surface redraws',
        seen.join() === 'render' && r.events.length === 0, seen.join());
    check('…and the user is told to wait', toasts.length === 1 && /Finishing the address change/.test(toasts[0]), JSON.stringify(toasts));
    const other = await run({ published: true, history: HISTORY, ui: { ...card, render() {}, start() {}, success() {}, fail() {} },
        extraWindow: () => ({ isAddressChanging: (id) => id === 'project-b' }) });
    check('another project\'s address change doesn\'t hold this publish', other.events.length === 1);
}

// ---- tokenBand / costBand boundaries -----------------------------------------
{
    const ctx = vm.createContext({});
    vm.runInContext(USAGE_CODE, ctx);
    const cases = [
        [0, '0'], [-5, '0'], [NaN, '0'], [1, '<100K'], [99999, '<100K'], [100000, '100K-500K'],
        [499999, '100K-500K'], [500000, '500K-1M'], [1e6, '1M-5M'], [5e6, '5M-10M'], [10e6, '10M+'],
    ];
    const bad = cases.filter(([n, want]) => ctx.tokenBand(n) !== want).map(([n, want]) => `${n}: got ${ctx.tokenBand(n)}, want ${want}`);
    check('tokenBand: band boundaries', bad.length === 0, bad.join('; '));

    const costCases = [
        [0, '$0'], [-1, '$0'], [NaN, '$0'], [0.003, '<$0.25'], [24.9, '<$0.25'], [25, '$0.25-0.50'],
        [50, '$0.50-1'], [100, '$1-1.50'], [150, '$1.50-2'], [200, '$2-2.50'], [250, '$2.50-3'],
        [299.9, '$2.50-3'], [300, '$3-4'], [400, '$4-5'], [500, '$5-7.50'], [750, '$7.50-10'],
        [1000, '$10-20'], [2000, '$20+'], [50000, '$20+'],
    ];
    const badCost = costCases.filter(([n, want]) => ctx.costBand(n) !== want).map(([n, want]) => `${n}: got ${ctx.costBand(n)}, want ${want}`);
    check('costBand: band boundaries', badCost.length === 0, badCost.join('; '));
}

if (failures) { console.error(failures + ' failure(s)'); process.exit(1); }
console.log('all publish-analytics checks passed');
