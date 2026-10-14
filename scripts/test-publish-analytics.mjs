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
    extract(source, 'async function doPublish({ trigger } = {}) {'),
].join('\n\n');
const USAGE_CODE = [
    extract(helpersSource, 'function sumChatCostCents(history) {'),
    extract(helpersSource, 'function sumChatTokenUsage(history) {'),
    extract(helpersSource, 'function tokenBand(n) {'),
    helpersSource.slice(helpersSource.indexOf('const COST_BANDS = ['), helpersSource.indexOf('function costBand(cents) {')),
    extract(helpersSource, 'function costBand(cents) {'),
].join('\n\n');

const ROOT = '/alice/AppData/builder';
const WORK = ROOT + '/project-a';
const PUB = ROOT + '/.published/project-a';

async function run({ published, history, withUsageHelpers = true }) {
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
                create: async sub => ({ subdomain: sub }),
                update: async () => {},
            },
        },
    };
    vm.createContext(sandbox);
    vm.runInContext(PUBLISH_CODE + (withUsageHelpers ? '\n\n' + USAGE_CODE : ''), sandbox, { filename: 'src/js/ui.js' });
    await sandbox.doPublish();
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
