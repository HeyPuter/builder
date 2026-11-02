import fs from 'node:fs';

// ---- The user's own domain on a published site --------------------------------
// The publish popover connects a domain through Puter's own dialog
// (puter.hosting.attach), keeps what it returns on the project's record, and,
// since the builder can't ask Puter for the domain's status, fetches the
// domain itself until it serves the site. An address change leaves a domain
// behind on the old address, so the popover asks before one and offers to
// connect the domain again after. A site not published yet can start with
// its domain straight away: one press reserves the name in the address
// field, opens the dialog for it, and publishes onto it. Custom domains are
// a paid feature: on the free plan the press opens the upgrade dialog.
//
// Runs the real custom-domain.js, the real popover section of ui.js against
// small fakes, the real savePublishedFields, and checks the rest of the wiring.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const ui = read('../src/js/ui.js');
const app = read('../src/js/app.js');
const tick = () => new Promise((r) => setTimeout(r, 0));

const win = {};
new Function('window', read('../src/js/custom-domain.js'))(win);
const CD = win.CustomDomain;

// --- custom-domain.js ------------------------------------------------------------
const pending = {
    uuid: 'u1', hostname: 'WWW.Example.com.', site: 'cafe', status: 'pending', statusDetail: null, isApex: false,
    records: [
        { type: 'CNAME', name: 'www', value: 'sites.puter.site', purpose: 'routing', required: true },
        { type: 'TXT', name: '_puter.www', value: 'abc', purpose: 'ownership', required: true },
        { type: 'CNAME', name: '_acme', value: 'x.y', purpose: 'certificate', required: false },
        { type: 'TXT', name: '', value: 'no name' },
    ],
    createdAt: 1, activatedAt: null,
};
const n = CD.normalize(pending);
check('a domain is kept with its hostname lowercased and its trailing dot dropped', n && n.hostname === 'www.example.com', n && n.hostname);
check('…with its records, minus one that has no name', n.records.length === 3 && n.records[2].required === false);
check('a hostname that can\'t go into a URL is refused', CD.normalize({ hostname: 'evil.com/x' }) === null && CD.normalize({ hostname: 'localhost' }) === null);
check('an unknown status reads as pending', CD.normalize({ hostname: 'a.com', status: 'weird' }).status === 'pending');
check('null or junk is refused', CD.normalize(null) === null && CD.normalize('a.com') === null);

let list = CD.upsert([], pending);
list = CD.upsert(list, { hostname: 'example.com', site: 'cafe', status: 'active', isApex: true });
check('domains are added one per hostname, the latest first', list.length === 2 && list[0].hostname === 'example.com');
list = CD.upsert(list, { uuid: 'u9', hostname: 'www.example.com', site: 'cafe-2', status: 'pending' });
check('connecting a hostname again replaces it, even under a new id, and moves it first', list.length === 2 && list[0].hostname === 'www.example.com' && list[0].site === 'cafe-2' && list[0].uuid === 'u9');
check('a saved list is cleaned of junk and repeats', CD.list([pending, pending, null, { hostname: '' }]).length === 1);

check('a pending domain on the current address is pending', CD.view(pending, 'cafe').kind === 'pending');
check('…and one on an address the site no longer has is moved', CD.view(pending, 'new-name').kind === 'moved');
check('a domain without a recorded site is never moved', CD.view({ hostname: 'a.com', status: 'active' }, 'cafe').kind === 'active');
check('its URL is the https root', CD.view(pending, 'cafe').url === 'https://www.example.com/');

const active = CD.markActive([pending], 'WWW.example.com', 42);
check('a check marks the domain active with the time', active[0].status === 'active' && active[0].activatedAt === 42 && active[0].statusDetail === null);
check('waiting lists pending and failed domains, not active or moved ones',
    CD.waiting([pending, { hostname: 'b.com', site: 'cafe', status: 'failed' }, { hostname: 'c.com', site: 'cafe', status: 'active' }, { hostname: 'd.com', site: 'old', status: 'pending' }], 'cafe')
        .map((d) => d.hostname).join() === 'www.example.com,b.com');
check('the share link is a connected domain', CD.liveUrl(active, 'cafe', 'https://cafe.puter.site/') === 'https://www.example.com/');
check('…else the puter.site address', CD.liveUrl([pending], 'cafe', 'https://cafe.puter.site/') === 'https://cafe.puter.site/'
    && CD.liveUrl(active, 'renamed', 'https://renamed.puter.site/') === 'https://renamed.puter.site/');

{
    // Change domain: old.com works, new.com was just picked.
    const old = { hostname: 'old.com', site: 'cafe', status: 'active' };
    let changed = CD.upsert([old], { hostname: 'new.com', site: 'cafe', status: 'pending' });
    check('a new pick doesn\'t take the address before it works', CD.liveUrl(changed, 'cafe', 'https://cafe.puter.site/') === 'https://old.com/');
    changed = CD.markActive(changed, 'new.com', 1);
    check('…and takes it once it does, the old one still listed', CD.liveUrl(changed, 'cafe', 'https://cafe.puter.site/') === 'https://new.com/' && changed.some((d) => d.hostname === 'old.com'));
}
check('the same page is the same site', CD.sameSite({ body: '<h1>x</h1>' }, { body: '<h1>x</h1>' }));
check('…and so is the same file modified at the same time', CD.sameSite({ body: 'a', lastModified: 'Wed' }, { body: 'b', lastModified: 'Wed' }));
check('a failed read, another page or two empty pages are not', !CD.sameSite(null, { body: 'a' }) && !CD.sameSite({ body: 'a' }, { body: 'b' }) && !CD.sameSite({ body: '' }, { body: '' }));

// --- The popover section of ui.js against fakes -------------------------------------
const section = ui.slice(ui.indexOf("// ---- The user's own domain (inside the popover)"), ui.indexOf('// ---- Share the draft link (toolbar popover)'));
function harness({ attach, fetchImpl, alertChoice = 'change', paid = true, blocked = null, createImpl, field = 'brave-otter-42' } = {}) {
    const state = { attachCalls: [], saves: [], fieldSaves: [], alerts: [], renders: 0, tracks: [], announced: [], timers: [],
        upgrades: [], prompts: [], creates: [], mkdirs: [], publishes: [], order: [] };
    const window = {
        CustomDomain: CD,
        user: { subscribed: paid },
        Branding: { isSubscribed: (u) => !!(u && u.subscribed === true) },
        isSubdomainLimitErr: (e) => !!(e && e.limit),
        isSubdomainTakenErr: (e) => !!(e && e.taken),
        currentPublishedUrl: 'https://cafe.puter.site/',
        currentPublishedDomains: [],
        external_link_svg: '<svg/>',
        check_svg: '<svg/>',
        track: (name, props) => state.tracks.push([name, props]),
        announce: (t) => state.announced.push(t),
        puterErrInfo: (e) => ({ message: e && e.message || '' }),
        savePublishedFields: async (id, fields) => state.fieldSaves.push([id, fields]),
    };
    const puter = {
        hosting: {
            attach: (sub) => { state.attachCalls.push(sub); state.order.push('attach ' + sub); return attach(sub); },
            create: async (name, dir) => { state.creates.push([name, dir]); state.order.push('create ' + name); if (createImpl) return createImpl(name, dir); return { subdomain: name }; },
        },
        ui: { alert: async (msg, buttons) => { state.alerts.push([msg, buttons]); return alertChoice; } },
        fs: {
            read: async () => ({ text: async () => JSON.stringify({ publishedDomains: [pending] }) }),
            mkdir: async (dir) => { state.mkdirs.push(dir); },
        },
        randName: () => 'random-name-12',
    };
    const $ = (x) => ({ on() {}, hasClass: () => false, val: () => field, trigger() { state.focused = x; return this; } });
    const env = {
        window, puter, $,
        htmlEscape: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
        previewSubdomain: (u) => { const m = (u || '').match(/^https?:\/\/([^.]+)\.puter\.site/i); return m ? m[1] : null; },
        bustedUrl: (u) => u,
        _probeAbortSignal: () => undefined,
        fetch: fetchImpl || (async () => { throw new Error('offline'); }),
        location: { host: 'builder.puter.com' },
        document: {},
        // The re-check timer is recorded, never run.
        setTimeout: (fn, ms) => { state.timers.push(ms); return state.timers.length; },
        clearTimeout: () => {},
        saveCurrentChat: async (ctx) => state.saves.push(ctx.currentChatId),
        renderPublishPanel: () => { state.renders++; },
        trackUpgradePromptShown: (source) => state.prompts.push(source),
        openUpgradeModal: (source) => state.upgrades.push(source),
        slugifyTitle: (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
        generateChatTitle: () => 'Joe’s Cafe',
        shortRand: () => 'x7k2',
        publishedDirForChat: (id) => `/u/AppData/app/.published/${id}`,
        publishBlockedReason: () => blocked,
        publishBusyHere: () => false,
        _publishStarting: new Set(),
        publishedRootDir: () => '/u/AppData/app/A',
        publishBadgeToggleHtml: () => '[badge]',
        publishWaitingHtml: (r) => `[waiting ${r}]`,
        doPublish: (opts) => { state.publishes.push(opts); },
        state,
    };
    const names = Object.keys(env);
    const code = 'let currentChatId = "A"; let chatHistory = []; let _publishPanelOpen = true; let _suggestedPublishName = null;\n' + section +
        '\nreturn { connectCustomDomain, checkCustomDomain, publishDomainsHtml, confirmAddressChangeKeepsDomains, publishedShareUrl,' +
        ' publishWithDomain, reservePublishSubdomain, publishAlsoAtHtml, publishAddressHeadHtml, useOwnDomain,' +
        ' setChat: (id) => { currentChatId = id; }, closePanel: () => { _publishPanelOpen = false; } };';
    const api = new Function(...names, code)(...names.map((k) => env[k]));
    return { ...api, window, state };
}

{
    let resolve;
    const h = harness({ attach: () => new Promise((r) => { resolve = r; }) });
    h.connectCustomDomain();
    check('the dialog opens in the click itself, before any await (a popup needs the click)', h.state.attachCalls.join() === 'cafe');
    check('…and the button waits for it', /Connecting…/.test(h.publishAddressHeadHtml()) && /disabled/.test(h.publishAddressHeadHtml()));
    h.connectCustomDomain();
    check('a second press while it is open does nothing', h.state.attachCalls.length === 1);
    resolve({ ...pending, site: undefined });
    await tick(); await tick();
    check('the chosen domain goes on the project, with the site it was opened for', h.window.currentPublishedDomains.length === 1
        && h.window.currentPublishedDomains[0].site === 'cafe', JSON.stringify(h.window.currentPublishedDomains));
    check('…and is saved', h.state.saves.join() === 'A');
    const html = h.publishDomainsHtml();
    check('a pending domain shows its records and a Check now button', /Waiting for DNS/.test(html) && /sites\.puter\.site/.test(html) && /_puter\.www/.test(html) && /Check now/.test(html));
    check('…with an optional record marked', /<small>Optional<\/small>/.test(html));
    check('…and the popover checks it again while it waits', h.state.timers.includes(15000), h.state.timers.join());
    check('the share link stays on puter.site while it waits', h.publishedShareUrl('https://cafe.puter.site/') === 'https://cafe.puter.site/');
}
{
    const h = harness({ attach: async () => null });
    h.connectCustomDomain();
    await tick(); await tick();
    check('closing the dialog without a choice saves nothing', h.state.saves.length === 0 && h.window.currentPublishedDomains.length === 0);
    check('with no domain the heading offers one, and nothing shows below', /data-action="use-domain"[^>]*>Use custom domain</.test(h.publishAddressHeadHtml()) && h.publishDomainsHtml() === '');
}
{
    let resolve;
    const h = harness({ attach: () => new Promise((r) => { resolve = r; }) });
    h.connectCustomDomain();
    h.setChat('B');
    resolve(pending);
    await tick(); await tick(); await tick();
    check('a domain chosen after a switch to another project goes on the project it was for',
        h.state.fieldSaves.length === 1 && h.state.fieldSaves[0][0] === 'A' && h.state.saves.length === 0);
    check('…and only its domains are written', Object.keys(h.state.fieldSaves[0][1]).join() === 'publishedDomains');
}
{
    const h = harness({ attach: async () => { const e = new Error('nope'); e.code = 'not_supported'; throw e; } });
    h.connectCustomDomain();
    await tick(); await tick();
    check('a Puter desktop without the dialog says where to connect one', h.state.alerts.length === 1 && /builder\.puter\.com/.test(h.state.alerts[0][0]));
}
{
    const page = '<html>cafe</html>';
    const fetchImpl = async (url) => ({ ok: true, text: async () => page, headers: { get: () => '' } });
    const h = harness({ attach: async () => null, fetchImpl });
    h.window.currentPublishedDomains = [CD.normalize(pending)];
    const live = await h.checkCustomDomain('A', 'www.example.com', 'https://cafe.puter.site/');
    check('a domain serving the site\'s page is marked connected', live === true && h.window.currentPublishedDomains[0].status === 'active');
    check('…and becomes the link to share', h.publishedShareUrl('https://cafe.puter.site/') === 'https://www.example.com/');
    const below = h.publishDomainsHtml();
    check('…and gets no card of its own, since the URL row shows it', below === '');
    check('…and the heading offers to change it', /data-action="change-domain"[^>]*>.*Change domain/.test(h.publishAddressHeadHtml()));
    const also = h.publishAlsoAtHtml('https://www.example.com/', 'https://cafe.puter.site/');
    check('the puter.site address moves to the line under it', /Also at <a href="https:\/\/cafe\.puter\.site\/"[^>]*>cafe\.puter\.site<\/a>/.test(also));
    check('…without a Change of its own, which would only disconnect the domain', !/publish-change-address/.test(also));
    h.window.currentPublishedDomains = CD.upsert(h.window.currentPublishedDomains, { hostname: 'example.com', site: 'cafe', status: 'active' });
    h.window.currentPublishedDomains = CD.upsert(CD.markActive(h.window.currentPublishedDomains, 'example.com', 1), { hostname: 'new.com', site: 'cafe', status: 'pending' });
    check('a waiting pick next to a working domain is labelled the new one', /New domain</.test(h.publishDomainsHtml()) && /new\.com/.test(h.publishDomainsHtml()));
    check('…after any other connected domain', /Also at <a[^>]*>example\.com<\/a>, <a[^>]*>cafe\.puter\.site<\/a>/.test(h.publishAlsoAtHtml('https://www.example.com/', 'https://cafe.puter.site/')));
}
{
    const fetchImpl = async (url) => {
        if (url.startsWith('https://www.example.com')) return { ok: true, text: async () => 'parked', headers: { get: () => '' } };
        return { ok: true, text: async () => '<html>cafe</html>', headers: { get: () => '' } };
    };
    const h = harness({ attach: async () => null, fetchImpl });
    h.window.currentPublishedDomains = [CD.normalize(pending)];
    check('a domain still showing another site stays pending', await h.checkCustomDomain('A', 'www.example.com', 'https://cafe.puter.site/') === false
        && h.window.currentPublishedDomains[0].status === 'pending');
    const offline = harness({ attach: async () => null });
    offline.window.currentPublishedDomains = [CD.normalize(pending)];
    check('…and so does one that can\'t be reached yet', await offline.checkCustomDomain('A', 'www.example.com', 'https://cafe.puter.site/') === false);
}
{
    const h = harness({ attach: async () => null, alertChoice: 'cancel' });
    check('an address change with no domain asks nothing', await h.confirmAddressChangeKeepsDomains([], 'cafe') === true && h.state.alerts.length === 0);
    check('…nor with only domains already left on an older address', await h.confirmAddressChangeKeepsDomains([{ ...pending, site: 'older' }], 'cafe') === true);
    const ok = await h.confirmAddressChangeKeepsDomains([pending, { hostname: 'example.com', site: 'cafe', status: 'active' }], 'cafe');
    check('with domains on it, it names them and the user can back out', ok === false && /www\.example\.com and example\.com show your site/.test(h.state.alerts[0][0]));
    check('…in plain sentences', !/[:;]\s/.test(h.state.alerts[0][0].replace(/https?:\/\//g, '')));
    h.window.currentPublishedUrl = 'https://renamed.puter.site/';
    h.window.currentPublishedDomains = [CD.normalize(pending)];
    check('after the change the domain offers to connect again', /Not connected/.test(h.publishDomainsHtml()) && /Connect again/.test(h.publishDomainsHtml()));
}
{
    const h = harness({ attach: async () => null });
    h.window.currentPublishedDomains = [CD.normalize({ ...pending, records: [{ type: 'TXT', name: 'x', value: '"><img src=x onerror=alert(1)>' }] })];
    check('record values are escaped', !/<img/.test(h.publishDomainsHtml()));
    h.window.currentPublishedUrl = null;
    check('an unpublished project shows no domain part', h.publishDomainsHtml() === '');
}

// --- The heading's button and the paid-plan gate ---------------------------------------
{
    const free = harness({ attach: async () => null, paid: false });
    const head = free.publishAddressHeadHtml();
    const paidHead = harness({ attach: async () => null });
    check('on the free plan the button looks the same as on a paid one, with no tag or Upgrade button',
        head === paidHead.publishAddressHeadHtml() && !/Premium|Upgrade/.test(head));
    check('…and still counts as an upgrade prompt there, not on a paid plan', free.state.prompts.includes('custom_domain') && !paidHead.state.prompts.length);
    free.useOwnDomain('use-domain');
    check('…and the press opens the upgrade dialog, not Puter\'s', free.state.upgrades.join() === 'custom_domain' && free.state.attachCalls.length === 0);
    free.connectCustomDomain();
    check('a Connect again on the free plan opens the upgrade dialog too', free.state.upgrades.length === 2 && free.state.attachCalls.length === 0);
    free.window.currentPublishedUrl = null;
    free.useOwnDomain('use-domain');
    check('…and so does a press before a first publish, publishing nothing', free.state.upgrades.length === 3 && free.state.publishes.length === 0 && free.state.creates.length === 0);
    const paid = harness({ attach: async () => null });
    paid.useOwnDomain('use-domain');
    check('…and a press on a live site opens Puter\'s window at once', paid.state.attachCalls.join() === 'cafe');
}

// --- First publish that starts with the user's own domain --------------------------------
{
    let resolve;
    const h = harness({ attach: () => new Promise((r) => { resolve = r; }), field: 'joes-cafe' });
    h.window.currentPublishedUrl = null;
    h.useOwnDomain('use-domain');
    check('the button waits while the name is reserved', /Connecting…/.test(h.publishAddressHeadHtml()));
    await tick(); await tick();
    check('the press reserves the name in the address field, then opens Puter\'s window for it', h.state.order.join() === 'create joes-cafe,attach joes-cafe', h.state.order.join());
    check('…on an empty placeholder folder', h.state.creates[0][1] === '/u/AppData/app/.published/A/r_0_reserved' && h.state.mkdirs.includes('/u/AppData/app/.published/A/r_0_reserved'));
    check('…a placeholder that sorts before every real release', /^r_\d+_/.test('r_0_reserved') && 'r_0_reserved' < 'r_1700000000000_ab12');
    check('…and the publish starts on it', h.state.publishes.length === 1 && await h.state.publishes[0].reserved === 'joes-cafe');
    resolve({ hostname: 'www.joescafe.com', status: 'pending', records: [] });
    await tick(); await tick();
    check('the chosen domain is recorded against that name', h.window.currentPublishedDomains[0]?.site === 'joes-cafe');
    h.useOwnDomain('use-domain');
    await tick(); await tick();
    check('a retry after a failed publish reuses the name instead of making another', h.state.attachCalls[1] === 'joes-cafe'
        && await h.state.publishes[1].reserved === 'joes-cafe' && h.state.creates.length === 1);
}
{
    const h = harness({ attach: async () => null, field: '' });
    h.window.currentPublishedUrl = null;
    h.useOwnDomain('use-domain');
    await tick();
    check('an empty field gets a name from the project\'s title', h.state.creates[0]?.[0] === 'joe-s-cafe-x7k2', JSON.stringify(h.state.creates));
}
{
    const h = harness({ attach: async () => null, field: 'taken-name', createImpl: async () => { const e = new Error('taken'); e.taken = true; throw e; } });
    h.window.currentPublishedUrl = null;
    h.useOwnDomain('use-domain');
    await tick(); await tick(); await tick();
    check('a taken name is reported here, with no window opened and nothing published', /already taken/.test(h.state.alerts[0]?.[0] || '')
        && h.state.attachCalls.length === 0 && h.state.publishes.length === 0, JSON.stringify(h.state.alerts));
    check('…and the button is free again', !/Connecting…/.test(h.publishAddressHeadHtml()));
}
{
    const h = harness({ attach: async () => null, createImpl: async () => { const e = new Error('limit'); e.limit = true; throw e; } });
    h.window.currentPublishedUrl = null;
    h.useOwnDomain('use-domain');
    await tick(); await tick(); await tick();
    check('so is an account at its site limit', /maximum number of published sites/.test(h.state.alerts[0]?.[0] || '') && h.state.attachCalls.length === 0);
}
{
    const h = harness({ attach: async () => null, field: 'Not Valid!' });
    h.window.currentPublishedUrl = null;
    h.useOwnDomain('use-domain');
    await tick();
    check('an invalid name is refused before anything is reserved', /valid address/.test(h.state.alerts[0]?.[0] || '') && h.state.creates.length === 0);
}
{
    const h = harness({ attach: async () => null, blocked: 'turn' });
    h.window.currentPublishedUrl = null;
    h.useOwnDomain('use-domain');
    await tick();
    check('while a build runs, nothing is reserved or opened: the publish says to wait', h.state.attachCalls.length === 0
        && h.state.creates.length === 0 && h.state.publishes.length === 1 && h.state.publishes[0] === undefined);
}
{
    const h = harness({ attach: async () => null });
    h.publishWithDomain();
    check('a site already published never takes the first-publish path', h.state.creates.length === 0 && h.state.publishes.length === 0);
}

// --- savePublishedFields merges only what it is given --------------------------------
{
    const fn = app.slice(app.indexOf('window.savePublishedFields = async function'), app.indexOf('\n};\n', app.indexOf('window.savePublishedFields = async function')) + 4);
    let disk = { publishedUrl: 'https://cafe.puter.site/', publishedPath: '/p', publishedVersionId: 'v1', publishedAt: 't', publishedDomains: [] };
    let listSaves = 0;
    const window = {};
    const entry = { id: 'A', publishedUrl: 'https://cafe.puter.site/' };
    new Function('window', 'withChatFileLock', 'puter', 'chatFilePath', 'savedChats', 'saveChatList', 'updateChatHistorySidebar', fn)(
        window, async (id, f) => f(),
        { fs: { read: async () => ({ text: async () => JSON.stringify(disk) }), write: async (p, t) => { disk = JSON.parse(t); } } },
        (id) => id, [entry], async () => { listSaves++; }, () => {});
    await window.savePublishedFields('A', { publishedDomains: [pending] });
    check('saving domains alone keeps the published address on disk', disk.publishedUrl === 'https://cafe.puter.site/' && disk.publishedPath === '/p' && disk.publishedVersionId === 'v1' && disk.publishedDomains.length === 1);
    check('…and leaves the project list alone', listSaves === 0 && entry.publishedUrl === 'https://cafe.puter.site/');
    await window.savePublishedFields('A', { publishedUrl: 'https://new.puter.site/', publishedPath: '/q', publishedVersionId: 'v2', publishedAt: 'u' });
    check('a publish still writes its four fields and keeps the domains', disk.publishedUrl === 'https://new.puter.site/' && disk.publishedDomains.length === 1 && listSaves === 1 && entry.publishedUrl === 'https://new.puter.site/');
}

// --- Wiring --------------------------------------------------------------------------
const vite = read('../vite.config.js');
check('the module is in the bundle, before ui.js',
    vite.includes("'js/custom-domain.js'") && vite.indexOf("'js/custom-domain.js'") < vite.indexOf("'js/ui.js'"));
const save = app.slice(app.indexOf('async function saveCurrentChat('), app.indexOf('window.savePublishedFields = async function'));
check('a save of the open project writes its domains', /publishedDomains = window\.currentPublishedDomains \|\| \[\];/.test(save));
check('…and a background save keeps the ones on disk', /publishedDomains = Array\.isArray\(prev\.publishedDomains\) \? prev\.publishedDomains : \[\];/.test(save));
check('…into the record', /publishedDomains: publishedDomains,/.test(save));
check('opening a project restores its domains', /window\.currentPublishedDomains = window\.CustomDomain\.list\(chat\.publishedDomains\);/.test(app));
check('a duplicate starts without the source\'s domains', /publishedAt: null,\s*publishedDomains: \[\],\s*\/\/ Carry the source/.test(app));
check('closing a project clears them', /window\.currentPublishedAt = null;\s*window\.currentPublishedDomains = \[\];/.test(ui));
check('the live popover shows them above the badge box', /publishDomainsHtml\(\) \+\s*publishBadgeToggleHtml\(\) \+/.test(ui));
check('opening the popover checks waiting domains, closing it stops', /refreshUserPlan\(\);\s*\/\/[^\n]*\n\s*watchCustomDomains\(\);/.test(ui) && /stopWatchingCustomDomains\(\);\s*\$\('\.preview-publish-btn'\)\.attr\('aria-expanded', 'false'\);/.test(ui));
check('the live view\'s URL row shows a connected domain, the puter.site address under it',
    /const primary = publishedShareUrl\(url\) \|\| url;/.test(ui) && /\(primary !== url\s*\? publishAlsoAtHtml\(primary, url\)\s*: '<button class="publish-change-address"/.test(ui));
check('…and its copy button copies what it shows', /\.publish-copy', async function \(e\) \{[\s\S]{0,200}const url = publishedShareUrl\(window\.currentPublishedUrl\);/.test(ui));
check('the share view and toast use the connected domain', /const shareUrl = window\.publishedShareUrl\?\.\(url\) \|\| url;/.test(ui) && /_publishSuccessData = \{ url: shareUrl, meta \};/.test(ui));
check('both address editors ask before leaving a domain behind',
    (ui.match(/await window\.confirmAddressChangeKeepsDomains\?\.\([^)]*\) === false\)/g) || []).length === 2);
check('the AI knows where the user connects a domain', /"Use custom domain" next to the site address/.test(read('../src/js/prompt.js')) && /paid Puter plan/.test(read('../src/js/prompt.js')));
const publish = ui.slice(ui.indexOf('async function doPublish('), ui.indexOf('async function loadPublishedSiteMeta('));
check('a first publish with a reserved name points that name at the release, after filling in the address',
    /if \(!existingSub && reserved\) \{[\s\S]*?const sub = await reserved;\s*url = `https:\/\/\$\{sub\}\.puter\.site\/`;\s*await absolutizeSocialImagesInRelease\(releaseDir, url, \[startPreviewUrl\]\);\s*await puter\.hosting\.update\(sub, releaseDir\);\s*_reservedPublishNames\.delete\(chatId\);\s*\} else if \(!existingSub\)/.test(publish));
check('…and only a first publish uses one', /if \(!isFirst\) reserved = null;/.test(publish));
check('…and lands on the site view, where the domain shows its records', /if \(_publishPanelOpen && reserved\) \{\s*_publishPanelView = 'form';\s*renderPublishPanel\(\);/.test(publish));
check('the placeholder goes with the replaced releases once the publish lands', /await retirePublishedReleases\(pubRoot, releaseName\);/.test(publish));
const form = ui.slice(ui.indexOf("if (st.state === 'unpublished') {"), ui.indexOf("title = 'Your site';"));
check('the heading sits over the address field before a first publish', /publishAddressHeadHtml\(\) \+\s*'<div class="publish-name-row">'/.test(form));
check('…and over the URL row on the live site', /'Live'\}<\/div>` \+\s*publishAddressHeadHtml\(\) \+\s*'<div class="publish-url-row">'/.test(ui));
check('the button runs useOwnDomain', /\.publish-domain-action', function \(e\) \{[\s\S]{0,120}useOwnDomain\(\$\(this\)\.attr\('data-action'\)\);/.test(ui));
const upgrade = ui.slice(ui.indexOf('function openUpgradeModal('), ui.indexOf('const $overlay', ui.indexOf('function openUpgradeModal(')));
check('the upgrade dialog lists custom domains', /id: 'domain', title: 'Use your own domain'/.test(upgrade));
check('…first when the user came from a domain prompt', /source === 'custom_domain' \? 'domain'/.test(upgrade));

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nAll custom-domain checks passed');
