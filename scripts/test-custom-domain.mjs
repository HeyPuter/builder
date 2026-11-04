import fs from 'node:fs';

// ---- The user's own domain on a published site --------------------------------
// The publish popover connects a domain through Puter's own dialog
// (puter.hosting.attach), keeps what it returns on the project's record, and,
// since the builder can't ask Puter for the domain's status, fetches the
// domain itself until it serves the site. An address change leaves a domain
// behind on the old address, so the popover asks before one and offers to
// connect the domain again after. A project has one domain at most, and one
// that another project takes in Puter's window is taken off the project that
// had it. A site not published yet can start with
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

let list = CD.set([], pending);
check('a pick becomes the project\'s domain', list.length === 1 && list[0].hostname === 'www.example.com');
list = CD.set(list, { hostname: 'example.com', site: 'cafe', status: 'active', isApex: true });
check('a project has one domain, so another pick replaces it', list.length === 1 && list[0].hostname === 'example.com');
check('a pick that can\'t be read keeps the one it had', CD.set(list, { hostname: 'bad/host' }).map((d) => d.hostname).join() === 'example.com');
check('a saved list is cleaned to its first readable domain', CD.list([null, { hostname: '' }, pending, { hostname: 'b.com' }]).map((d) => d.hostname).join() === 'www.example.com');
check('removing the domain another project took leaves none', CD.remove([pending], 'WWW.Example.com').length === 0
    && CD.remove([pending], 'other.com').length === 1);

check('a pending domain on the current address is pending', CD.view(pending, 'cafe').kind === 'pending');
check('…and one on an address the site no longer has is moved', CD.view(pending, 'new-name').kind === 'moved');
check('a domain without a recorded site is never moved', CD.view({ hostname: 'a.com', status: 'active' }, 'cafe').kind === 'active');
check('its URL is the https root', CD.view(pending, 'cafe').url === 'https://www.example.com/');

const active = CD.markActive([pending], 'WWW.example.com', 42);
check('a check marks the domain active with the time', active[0].status === 'active' && active[0].activatedAt === 42 && active[0].statusDetail === null);
check('a pending or failed domain is waiting, an active or moved one isn\'t',
    CD.waiting([pending], 'cafe').length === 1 && CD.waiting([{ hostname: 'b.com', site: 'cafe', status: 'failed' }], 'cafe').length === 1
    && !CD.waiting([{ hostname: 'c.com', site: 'cafe', status: 'active' }], 'cafe').length && !CD.waiting([{ hostname: 'd.com', site: 'old', status: 'pending' }], 'cafe').length);
check('the share link is a connected domain', CD.liveUrl(active, 'cafe', 'https://cafe.puter.site/') === 'https://www.example.com/');
check('…else the puter.site address', CD.liveUrl([pending], 'cafe', 'https://cafe.puter.site/') === 'https://cafe.puter.site/'
    && CD.liveUrl(active, 'renamed', 'https://renamed.puter.site/') === 'https://renamed.puter.site/');

{
    // Change domain: old.com works, new.com was just picked.
    const old = { hostname: 'old.com', site: 'cafe', status: 'active' };
    let changed = CD.set([old], { hostname: 'new.com', site: 'cafe', status: 'pending' });
    check('Change domain drops the old one from the project', changed.map((d) => d.hostname).join() === 'new.com');
    check('…so the address is puter.site until the new one works', CD.liveUrl(changed, 'cafe', 'https://cafe.puter.site/') === 'https://cafe.puter.site/');
    changed = CD.markActive(changed, 'new.com', 1);
    check('…and the new one once it does', CD.liveUrl(changed, 'cafe', 'https://cafe.puter.site/') === 'https://new.com/');
}
{
    // A connected domain that later stops showing the site.
    const lost = CD.markLost([{ hostname: 'a.com', site: 'cafe', status: 'active', activatedAt: 1 }], 'a.com', 7);
    check('a connected domain found not showing the site is lost', CD.view(lost[0], 'cafe').kind === 'lost' && lost[0].lostAt === 7 && lost[0].status === 'active');
    check('…so the address goes back to puter.site, and the popover keeps checking it',
        CD.liveUrl(lost, 'cafe', 'https://cafe.puter.site/') === 'https://cafe.puter.site/' && CD.waiting(lost, 'cafe').length === 1);
    check('…until a check finds it working again', CD.markActive(lost, 'a.com', 9)[0].lostAt === null && CD.view(CD.markActive(lost, 'a.com', 9)[0], 'cafe').kind === 'active');
    check('…and a new pick from Puter\'s window is never lost', CD.set(lost, { hostname: 'a.com', site: 'cafe', status: 'active' })[0].lostAt === null);
    check('an address change still reads as moved, not lost', CD.view(lost[0], 'renamed').kind === 'moved');
    check('the project list shows a working domain', CD.domainUrl([{ hostname: 'a.com', site: 'cafe', status: 'active' }], 'https://cafe.puter.site/') === 'https://a.com/');
    check('…and the puter.site address otherwise', CD.domainUrl(lost, 'https://cafe.puter.site/') === null
        && CD.domainUrl([pending], 'https://cafe.puter.site/') === null && CD.domainUrl([], 'https://cafe.puter.site/') === null
        && CD.domainUrl([{ hostname: 'a.com', site: 'cafe', status: 'active' }], null) === null);
}
check('the same page is the same site', CD.sameSite({ body: '<h1>x</h1>' }, { body: '<h1>x</h1>' }));
check('…and so is the same file modified at the same time', CD.sameSite({ body: 'a', lastModified: 'Wed' }, { body: 'b', lastModified: 'Wed' }));
check('a failed read, another page or two empty pages are not', !CD.sameSite(null, { body: 'a' }) && !CD.sameSite({ body: 'a' }, { body: 'b' }) && !CD.sameSite({ body: '' }, { body: '' }));

check('hostOf names a saved list\'s domain in any state', CD.hostOf([pending]) === 'www.example.com'
    && CD.hostOf([{ hostname: 'a.com', status: 'failed' }]) === 'a.com' && CD.hostOf([]) === null && CD.hostOf(undefined) === null);

// --- The popover section of ui.js against fakes -------------------------------------
const section = ui.slice(ui.indexOf("// ---- The user's own domain (inside the popover)"), ui.indexOf('// ---- Share the draft link (toolbar popover)'));
function harness({ attach, fetchImpl, alertChoice = 'change', paid = true, blocked = null, createImpl, field = 'brave-otter-42', savedChats = [], files = {} } = {}) {
    const state = { attachCalls: [], saves: [], fieldSaves: [], alerts: [], renders: 0, tracks: [], announced: [], timers: [],
        upgrades: [], prompts: [], creates: [], mkdirs: [], publishes: [], order: [], reads: [], deletes: [], field };
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
        // A change is applied to what's on disk, as the real one does inside the lock.
        savePublishedFields: async (id, fields) => {
            const f = { ...fields };
            if (typeof f.publishedDomains === 'function') f.publishedDomains = f.publishedDomains((files[`chat-history/${id}.json`] || { publishedDomains: [pending] }).publishedDomains);
            state.fieldSaves.push([id, f]);
        },
    };
    const puter = {
        hosting: {
            attach: (sub) => { state.attachCalls.push(sub); state.order.push('attach ' + sub); return attach(sub); },
            create: async (name, dir) => { state.creates.push([name, dir]); state.order.push('create ' + name); if (state.refuse) throw state.refuse; if (createImpl) return createImpl(name, dir); return { subdomain: name }; },
            delete: async (name) => { state.deletes.push(name); },
        },
        ui: { alert: async (msg, buttons) => { state.alerts.push([msg, buttons]); return alertChoice; } },
        fs: {
            read: async (path) => { state.reads.push(path); return { text: async () => JSON.stringify(files[path] || { publishedDomains: [pending] }) }; },
            mkdir: async (dir) => { state.mkdirs.push(dir); },
        },
        randName: () => 'random-name-12',
    };
    const $ = (x) => ({ on() {}, hasClass: () => false, val: () => state.field, trigger() { state.focused = x; return this; } });
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
        savedChats,
        state,
    };
    const names = Object.keys(env);
    const code = 'let currentChatId = "A"; let chatHistory = []; let _publishPanelOpen = true; let _suggestedPublishName = null;\n' + section +
        '\nreturn { connectCustomDomain, checkCustomDomain, publishDomainsHtml, confirmAddressChangeKeepsDomains, publishedShareUrl, watchCustomDomains, stopWatchingCustomDomains,' +
        ' publishWithDomain, reservePublishSubdomain, publishAlsoAtHtml, publishAddressHeadHtml, useOwnDomain,' +
        ' markChecking: (host) => _domainManualChecks.add(host), setConnectBusy: () => _domainConnectBusy.add(currentChatId),' +
        ' setChat: (id) => { currentChatId = id; }, closePanel: () => { _publishPanelOpen = false; }, openPanel: () => { _publishPanelOpen = true; } };';
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
    // Project B had www.example.com. Project A takes it in Puter's window, which
    // moves it to A's site.
    const savedChats = [
        { id: 'A', publishedUrl: 'https://cafe.puter.site/' },
        { id: 'B', publishedUrl: 'https://bistro.puter.site/', publishedDomainHost: 'www.example.com' },
        { id: 'C', publishedUrl: null },
        { id: 'D', publishedUrl: 'https://deli.puter.site/', publishedDomainHost: 'other.com' },
    ];
    const files = {
        'chat-history/B.json': { publishedDomains: [{ hostname: 'www.example.com', site: 'bistro', status: 'active' }] },
        'chat-history/D.json': { publishedDomains: [{ hostname: 'other.com', site: 'deli', status: 'active' }] },
    };
    const h = harness({ attach: async () => pending, savedChats, files });
    h.connectCustomDomain();
    for (let i = 0; i < 8; i++) await tick();
    check('a domain another project had is taken off that project', h.state.fieldSaves.length === 1 && h.state.fieldSaves[0][0] === 'B'
        && Array.isArray(h.state.fieldSaves[0][1].publishedDomains) && h.state.fieldSaves[0][1].publishedDomains.length === 0, JSON.stringify(h.state.fieldSaves));
    check('…and stays on this one', h.window.currentPublishedDomains[0]?.hostname === 'www.example.com' && h.state.saves.join() === 'A');
    check('…a project with another domain keeps it', !h.state.fieldSaves.some(([id]) => id === 'D' || id === 'C'));
    check('…and the project list says which project had it, so no project\'s file (a whole conversation) is read to find it',
        h.state.reads.length === 0, h.state.reads.join());
}
{
    // The project that had it is open when the domain lands (the user switched
    // to it while Puter's window was open for A).
    let resolve;
    const savedChats = [{ id: 'A', publishedUrl: 'https://cafe.puter.site/' }, { id: 'B', publishedUrl: 'https://bistro.puter.site/', publishedDomainHost: 'www.example.com' }];
    const files = { 'chat-history/B.json': { publishedDomains: [{ hostname: 'www.example.com', site: 'bistro', status: 'active' }] } };
    const h = harness({ attach: () => new Promise((r) => { resolve = r; }), savedChats, files });
    h.connectCustomDomain();
    h.setChat('B');
    h.window.currentPublishedDomains = CD.list(files['chat-history/B.json'].publishedDomains);
    const renders = h.state.renders;
    resolve(pending);
    for (let i = 0; i < 8; i++) await tick();
    check('…an open project loses it on screen too', h.window.currentPublishedDomains.length === 0 && h.state.saves.includes('B') && h.state.renders > renders);
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
    const also = h.publishAlsoAtHtml('https://cafe.puter.site/');
    check('the puter.site address moves to the line under it', also === '<div class="publish-also">Also at <a href="https://cafe.puter.site/" target="_blank" rel="noopener noreferrer" title="cafe.puter.site">cafe.puter.site</a></div>', also);
    // A long address used to push the popover sideways (56px on a phone).
    const css = read('../src/css/styles.css');
    check('…on one line that cuts a long address short, with the whole of it in the title',
        /\.publish-also \{[^}]*display: flex;[^}]*min-width: 0;[^}]*white-space: nowrap;/.test(css)
        && /\.publish-also a \{[^}]*min-width: 0;[^}]*overflow: hidden;[^}]*text-overflow: ellipsis;/.test(css));
    check('…without a Change of its own, which would only disconnect the domain', !/publish-change-address/.test(also));
    h.window.currentPublishedDomains = CD.set(h.window.currentPublishedDomains, { hostname: 'new.com', site: 'cafe', status: 'pending' });
    check('after Change domain only the new pick shows, waiting for its records', /Your domain</.test(h.publishDomainsHtml())
        && /new\.com/.test(h.publishDomainsHtml()) && !/www\.example\.com/.test(h.publishDomainsHtml()));
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
    // A connected domain is checked again when the popover opens.
    const site = '<html>cafe</html>';
    const fetchFor = (domainPage) => async (url) => {
        if (url.startsWith('https://www.example.com')) {
            if (domainPage === null) throw new Error('unreachable');
            return { ok: true, text: async () => domainPage, headers: { get: () => '' } };
        }
        return { ok: true, text: async () => site, headers: { get: () => '' } };
    };
    const connected = () => [CD.normalize({ ...pending, status: 'active' })];
    const settle = async () => { for (let i = 0; i < 6; i++) await tick(); };

    const ok = harness({ attach: async () => null, fetchImpl: fetchFor(site) });
    ok.window.currentPublishedDomains = connected();
    ok.watchCustomDomains();
    await settle();
    check('a connected domain still showing the site stays connected, with no more checks', ok.window.currentPublishedDomains[0].lostAt === null
        && !ok.state.timers.length && ok.state.saves.length === 0);
    const calls = [];
    const again = harness({ attach: async () => null, fetchImpl: async (u) => { calls.push(u); return fetchFor(site)(u); } });
    again.window.currentPublishedDomains = connected();
    again.watchCustomDomains(); await settle();
    again.watchCustomDomains(); await settle();
    check('…checked once per opening of the popover', calls.filter((u) => u.includes('example.com')).length === 1);
    again.stopWatchingCustomDomains();
    again.watchCustomDomains(); await settle();
    check('…and again on the next one', calls.filter((u) => u.includes('example.com')).length === 2);

    const gone = harness({ attach: async () => null, fetchImpl: fetchFor('<html>someone else</html>') });
    gone.window.currentPublishedDomains = connected();
    gone.watchCustomDomains();
    await settle();
    check('one check that finds another site leaves it connected, and checks again', gone.window.currentPublishedDomains[0].lostAt === null
        && gone.state.timers.includes(15000) && gone.publishedShareUrl('https://cafe.puter.site/') === 'https://www.example.com/');
    gone.watchCustomDomains();
    await settle();
    check('the second in a row marks it lost and saves that', typeof gone.window.currentPublishedDomains[0].lostAt === 'number'
        && gone.state.saves.join() === 'A' && gone.state.tracks.some(([n]) => n === 'Custom Domain Lost'));
    check('…so the site\'s address is puter.site again', gone.publishedShareUrl('https://cafe.puter.site/') === 'https://cafe.puter.site/');
    const card = gone.publishDomainsHtml();
    check('…and the popover says so, with Check now and Connect again', /is-lost/.test(card) && /Not working/.test(card)
        && /stopped showing this site/.test(card) && /Check now/.test(card) && /Connect again/.test(card));
    check('…in plain sentences', !/[:;]\s/.test(card.replace(/<[^>]+>/g, ' ').replace(/https?:\/\//g, '')));

    const unreachable = harness({ attach: async () => null, fetchImpl: fetchFor(null) });
    unreachable.window.currentPublishedDomains = connected();
    unreachable.watchCustomDomains(); await settle();
    unreachable.watchCustomDomains(); await settle();
    check('a domain that stopped answering is lost the same way', typeof unreachable.window.currentPublishedDomains[0].lostAt === 'number');

    const offline = harness({ attach: async () => null });
    offline.window.currentPublishedDomains = connected();
    offline.watchCustomDomains(); await settle();
    offline.watchCustomDomains(); await settle();
    check('a check that can\'t read the site\'s own address either counts for nothing', offline.window.currentPublishedDomains[0].lostAt === null
        && offline.state.saves.length === 0);

    const overlap = harness({ attach: async () => null, fetchImpl: fetchFor('<html>someone else</html>') });
    overlap.window.currentPublishedDomains = connected();
    overlap.watchCustomDomains();
    overlap.watchCustomDomains();
    await settle();
    check('two rounds at once (the popover opening, Puter\'s window closing) count one miss', overlap.window.currentPublishedDomains[0].lostAt === null
        && overlap.state.saves.length === 0);
    overlap.stopWatchingCustomDomains();
    overlap.watchCustomDomains(); await settle();
    check('…and a miss from an earlier opening doesn\'t carry over', overlap.window.currentPublishedDomains[0].lostAt === null
        && overlap.state.saves.length === 0);

    const closed = harness({ attach: async () => null, fetchImpl: fetchFor('<html>someone else</html>') });
    closed.window.currentPublishedDomains = connected();
    closed.watchCustomDomains();
    closed.closePanel();
    await settle();
    closed.openPanel();
    closed.watchCustomDomains(); await settle();
    check('a check that ends after the popover closed counts for nothing', closed.window.currentPublishedDomains[0].lostAt === null
        && closed.state.saves.length === 0);

    const back = harness({ attach: async () => null, fetchImpl: fetchFor(site) });
    back.window.currentPublishedDomains = CD.markLost(connected(), 'www.example.com', 5);
    back.watchCustomDomains();
    await settle();
    check('a lost domain that shows the site again is connected again', back.window.currentPublishedDomains[0].lostAt === null
        && back.publishedShareUrl('https://cafe.puter.site/') === 'https://www.example.com/');
}
{
    const h = harness({ attach: async () => null, alertChoice: 'cancel' });
    check('an address change with no domain asks nothing', await h.confirmAddressChangeKeepsDomains([], 'cafe') === true && h.state.alerts.length === 0);
    check('…nor with only domains already left on an older address', await h.confirmAddressChangeKeepsDomains([{ ...pending, site: 'older' }], 'cafe') === true);
    const ok = await h.confirmAddressChangeKeepsDomains([pending], 'cafe');
    check('with a domain on it, it names the domain and the user can back out', ok === false && /^www\.example\.com /.test(h.state.alerts[0][0]));
    check('…in plain sentences', !/[:;]\s/.test(h.state.alerts[0][0].replace(/https?:\/\//g, '')));
    check('…not saying a domain still waiting for DNS stops working', /is set up for your site’s current address/.test(h.state.alerts[0][0])
        && !/stops working/.test(h.state.alerts[0][0]), h.state.alerts[0][0]);
    await h.confirmAddressChangeKeepsDomains([{ ...pending, status: 'active' }], 'cafe');
    check('…which a working one does', /^www\.example\.com shows your site through its current address, so it stops working/.test(h.state.alerts[1][0]), h.state.alerts[1][0]);
    await h.confirmAddressChangeKeepsDomains([{ ...pending, status: 'active', lostAt: 5 }], 'cafe');
    check('…and one found not working is set up for it too', /is set up for your site’s current address/.test(h.state.alerts[2][0]), h.state.alerts[2][0]);
    h.window.currentPublishedUrl = 'https://renamed.puter.site/';
    h.window.currentPublishedDomains = [CD.normalize(pending)];
    check('after the change the domain offers to connect again', /Not connected/.test(h.publishDomainsHtml()) && /Connect again/.test(h.publishDomainsHtml()));
}
{
    const h = harness({ attach: async () => null });
    h.window.currentPublishedDomains = [CD.normalize({ ...pending, records: [{ type: 'TXT', name: 'x', value: '"><img src=x onerror=alert(1)>' }] })];
    check('record values are escaped', !/<img/.test(h.publishDomainsHtml()));
    h.window.currentPublishedDomains = [CD.normalize({ ...pending, hostname: 'example.com', isApex: true })];
    check('a root domain gets no hint of its own, since Puter\'s window covers it', !/root domain|CNAME flattening/.test(h.publishDomainsHtml()));
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
    const temp = harness({ attach: async () => null, paid: false });
    temp.window.user = { is_temp: true };
    const tempHead = temp.publishAddressHeadHtml();
    check('a signed-out user gets the label alone, counted as no upgrade prompt', /Site address/.test(tempHead)
        && !/publish-domain-action/.test(tempHead) && !temp.state.prompts.length);
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
    check('…and so does Publish, which would race it for the name', h.window.isReservingPublishName('A') === true);
    await tick(); await tick();
    check('the press reserves the name in the address field, then opens Puter\'s window for it', h.state.order.join() === 'create joes-cafe,attach joes-cafe', h.state.order.join());
    check('…and Publish is free again', h.window.isReservingPublishName('A') === false);
    check('…on an empty placeholder folder', h.state.creates[0][1] === '/u/AppData/app/.published/A/r_0_reserved' && h.state.mkdirs.includes('/u/AppData/app/.published/A/r_0_reserved'));
    check('…a placeholder that sorts before every real release', /^r_\d+_/.test('r_0_reserved') && 'r_0_reserved' < 'r_1700000000000_ab12');
    check('…and the publish starts on it', h.state.publishes.length === 1 && await h.state.publishes[0].reserved === 'joes-cafe');
    resolve({ hostname: 'www.joescafe.com', status: 'pending', records: [] });
    await tick(); await tick();
    check('the chosen domain is recorded against that name', h.window.currentPublishedDomains[0]?.site === 'joes-cafe');
    h.useOwnDomain('use-domain');
    await tick(); await tick();
    check('a retry after a failed publish reuses the name instead of making another', h.state.attachCalls[1] === 'joes-cafe'
        && await h.state.publishes[1].reserved === 'joes-cafe' && h.state.creates.length === 1 && h.state.deletes.length === 0);
    // The user types another name before the next try: that name is used, as
    // a plain Publish would, and the one it replaces is let go.
    resolve(null); // Puter's window from the retry is closed
    await tick(); await tick();
    h.state.field = 'joes-diner';
    h.useOwnDomain('use-domain');
    for (let i = 0; i < 4; i++) await tick();
    check('a name typed after a failed try is the one used, not the reserved one', h.state.creates[1]?.[0] === 'joes-diner'
        && h.state.attachCalls[2] === 'joes-diner' && await h.state.publishes[2].reserved === 'joes-diner', JSON.stringify(h.state.creates));
    check('…and the name it replaces is removed', h.state.deletes.join() === 'joes-cafe', h.state.deletes.join());
}
{
    // The new name is taken: the reserved one stays the project's.
    const h = harness({ attach: async () => null, field: 'joes-cafe' });
    h.window.currentPublishedUrl = null;
    h.useOwnDomain('use-domain');
    for (let i = 0; i < 4; i++) await tick();
    h.state.field = 'taken-name';
    const taken = Object.assign(new Error('taken'), { taken: true });
    const create = h.state.creates.length;
    h.window.isSubdomainTakenErr = (e) => e === taken;
    // Every create from here on is refused as taken.
    h.state.refuse = taken;
    h.useOwnDomain('use-domain');
    for (let i = 0; i < 4; i++) await tick();
    check('a typed name that is taken leaves the reserved one in place', h.state.creates.length === create + 1
        && h.state.deletes.length === 0 && h.state.publishes.length === 1 && /already taken/.test(h.state.alerts[0]?.[0] || ''), JSON.stringify(h.state.alerts));
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
    check('…and the button is free again', !/Connecting…/.test(h.publishAddressHeadHtml()) && h.window.isReservingPublishName('A') === false);
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

{
    // The real renderPublishPanel's first-publish form, against fakes. After
    // an own-domain publish that didn't land, its field used to come back
    // with a random name on the next open, and Publish then made that site
    // and deleted the reserved one the domain was connected to.
    const at = ui.indexOf('function renderPublishPanel() {');
    const fn = ui.slice(at, ui.indexOf('\n}\n', at) + 2);
    const form = (reserved) => {
        let body = '';
        const $panel = { length: 1, find: (sel) => ({ text() {}, html(h) { if (sel === '.publish-panel-body') body = h; } }) };
        const env = {
            $: () => $panel, keepPublishPanelFocus: () => () => {}, _publishPanelView: 'form', _publishSuccessData: null,
            publishBusyHere: () => false, publishBlockedReason: () => null, currentChatId: 'A',
            htmlEscape: (s) => String(s), publishAddressHeadHtml: () => '', publishBadgeToggleHtml: () => '',
            puter: { randName: () => 'random-name-12' },
            window: {
                currentPublishedUrl: null, computePublishState: () => ({ state: 'unpublished' }),
                reservedPublishName: (id) => (id === 'A' ? reserved : null), isReservingPublishName: () => false,
            },
        };
        const names = Object.keys(env);
        const suggested = new Function(...names, 'let _suggestedPublishName = null;\n' + fn + '\nrenderPublishPanel(); return _suggestedPublishName;')(...names.map((k) => env[k]));
        return { suggested, body };
    };
    const left = form('joes-cafe');
    check('the form offers the name an own-domain publish reserved and didn\'t land on', left.suggested === 'joes-cafe'
        && /class="publish-name-input" value="joes-cafe"/.test(left.body), left.suggested);
    check('…and a random name when there is none', form(null).suggested === 'random-name-12');
}

{
    // A domain button that waits (Check now while it checks, Connect again or
    // Change domain while Puter's window is open) keeps the keyboard focus
    // through the render that marks it. Disabled, it couldn't hold it, and
    // the real keepPublishPanelFocus sent focus to the popover itself.
    const at = ui.indexOf('function keepPublishPanelFocus($panel) {');
    const keep = new Function('document', ui.slice(at, ui.indexOf('\n}\n', at) + 2) + '\nreturn keepPublishPanelFocus;');
    const button = (html, cls) => {
        const tag = html.match(new RegExp(`<button[^>]*class="[^"]*\\b${cls}\\b[^"]*"[^>]*>`))?.[0] || '';
        return { tag, el: {
            classList: Object.assign(tag.match(/class="([^"]*)"/)[1].split(' '), { contains(c) { return this.includes(c); } }),
            getAttribute: (a) => tag.match(new RegExp(` ${a}="([^"]*)"`))?.[1] ?? null,
            disabled: /\sdisabled[\s>]/.test(tag),
            focus() { this.focused = true; },
        } };
    };
    const focusAfterRender = (before, after) => {
        const panel = { focused: false };
        const body = { contains: (el) => el === before.el };
        const $panel = {
            find: (sel) => sel === '.publish-panel-body' ? Object.assign([body], { length: 1 })
                : { filter: () => [sel.startsWith('.' + after.el.classList[0]) ? after.el : null] },
            trigger: () => { panel.focused = true; },
        };
        keep({ activeElement: before.el })($panel)();
        return after.el.focused ? 'button' : panel.focused ? 'popover' : 'nowhere';
    };
    const h = harness({ attach: async () => null });
    h.window.currentPublishedDomains = [CD.normalize(pending)];
    const idle = button(h.publishDomainsHtml(), 'publish-domain-check');
    h.markChecking('www.example.com');
    const checking = button(h.publishDomainsHtml(), 'publish-domain-check');
    check('Check now reads as busy while it checks', /aria-disabled="true"/.test(checking.tag) && /Checking…/.test(h.publishDomainsHtml()), checking.tag);
    check('…and keeps the focus through that render', focusAfterRender(idle, checking) === 'button', checking.tag);
    h.window.currentPublishedDomains = [CD.normalize({ ...pending, site: 'older' })];
    const reconnect = button(h.publishDomainsHtml(), 'publish-domain-connect');
    const head = button(h.publishAddressHeadHtml(), 'publish-domain-action');
    h.setConnectBusy();
    check('so do Connect again and Change domain while Puter\'s window is open',
        focusAfterRender(reconnect, button(h.publishDomainsHtml(), 'publish-domain-connect')) === 'button'
        && focusAfterRender(head, button(h.publishAddressHeadHtml(), 'publish-domain-action')) === 'button'
        && /Connecting…/.test(h.publishAddressHeadHtml()));
}

{
    // Focus on a DNS record's copy button, then a re-render (a turn ending,
    // say): it used to land on the site's own copy button above, which shares
    // the first class keepPublishPanelFocus matches on.
    const at = ui.indexOf('function keepPublishPanelFocus($panel) {');
    const keep = new Function('document', ui.slice(at, ui.indexOf('\n}\n', at) + 2) + '\nreturn keepPublishPanelFocus;');
    const buttons = (html) => (html.match(/<button[^>]*>/g) || []).map((tag) => {
        const attr = (a) => tag.match(new RegExp(` ${a}="([^"]*)"`))?.[1] ?? null;
        const classes = attr('class').split(' ');
        return { tag, classList: Object.assign(classes, { contains: (c) => classes.includes(c) }), getAttribute: attr,
            disabled: /\sdisabled[\s>]/.test(tag), focus() { this.focused = true; } };
    });
    const h = harness({ attach: async () => null });
    h.window.currentPublishedDomains = [CD.normalize(pending)];
    // The live view's URL row comes first, with the site's copy button.
    const render = () => buttons('<button class="publish-icon-btn publish-copy" title="Copy link">' + h.publishDomainsHtml());
    const before = render();
    const active = before.find((b) => b.getAttribute('data-copy') === 'abc');
    const after = render();
    const $panel = {
        find: (sel) => {
            if (sel === '.publish-panel-body') return Object.assign([{ contains: (el) => before.includes(el) }], { length: 1 });
            const m = sel.match(/^\.([\w-]+)(?:\[data-action="([^"]*)"\])?$/);
            return { filter: () => after.filter((b) => b.classList.contains(m[1]) && (!m[2] || b.getAttribute('data-action') === m[2])) };
        },
        trigger() { this.focused = true; },
    };
    keep({ activeElement: active })($panel)();
    const landed = after.find((b) => b.focused);
    check('a re-render keeps the focus on the DNS record\'s copy button it was on', landed && landed.getAttribute('data-copy') === 'abc',
        landed ? landed.tag : 'none');
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
{
    // The project list shows a working domain in place of the puter.site address.
    const fn = app.slice(app.indexOf('window.savePublishedFields = async function'), app.indexOf('\n};\n', app.indexOf('window.savePublishedFields = async function')) + 4);
    let disk = { publishedUrl: 'https://cafe.puter.site/', publishedDomains: [] };
    let listSaves = 0;
    const window = { CustomDomain: CD };
    const entry = { id: 'A', publishedUrl: 'https://cafe.puter.site/' };
    new Function('window', 'withChatFileLock', 'puter', 'chatFilePath', 'savedChats', 'saveChatList', 'updateChatHistorySidebar', fn)(
        window, async (id, f) => f(),
        { fs: { read: async () => ({ text: async () => JSON.stringify(disk) }), write: async (p, t) => { disk = JSON.parse(t); } } },
        (id) => id, [entry], async () => { listSaves++; }, () => {});
    await window.savePublishedFields('A', { publishedDomains: [{ hostname: 'cafe.com', site: 'cafe', status: 'pending' }] });
    check('a domain still waiting isn\'t the address the project list shows', !entry.publishedDomainUrl);
    check('…but the list names it, for a project that takes it later', entry.publishedDomainHost === 'cafe.com' && listSaves === 1);
    await window.savePublishedFields('A', { publishedDomains: [{ hostname: 'cafe.com', site: 'cafe', status: 'active' }] });
    check('a working one goes on the project list', entry.publishedDomainUrl === 'https://cafe.com/' && listSaves === 2);
    await window.savePublishedFields('A', { publishedDomains: [{ hostname: 'cafe.com', site: 'cafe', status: 'active', lostAt: 3 }] });
    check('…and comes off it once it\'s lost', entry.publishedDomainUrl === null && entry.publishedUrl === 'https://cafe.puter.site/' && listSaves === 3);
    await window.savePublishedFields('A', { publishedDomains: [{ hostname: 'cafe.com', site: 'cafe', status: 'active', lostAt: 4 }] });
    check('…and a change the list doesn\'t show leaves it alone', listSaves === 3);
    await window.savePublishedFields('A', { publishedDomains: [] });
    check('a project another one took the domain from no longer names it', entry.publishedDomainHost === null && listSaves === 4);
}

{
    // Two domain changes at once for a project that isn't open both land.
    const fn = app.slice(app.indexOf('window.savePublishedFields = async function'), app.indexOf('\n};\n', app.indexOf('window.savePublishedFields = async function')) + 4);
    let disk = { publishedUrl: 'https://cafe.puter.site/', publishedDomains: [{ hostname: 'cafe.com', site: 'cafe', status: 'pending' }] };
    const window = { CustomDomain: CD };
    let queue = Promise.resolve();
    const lock = (id, f) => { const run = queue.then(f); queue = run.catch(() => {}); return run; };
    new Function('window', 'withChatFileLock', 'puter', 'chatFilePath', 'savedChats', 'saveChatList', 'updateChatHistorySidebar', fn)(
        window, lock,
        { fs: { read: async () => { await tick(); return { text: async () => JSON.stringify(disk) }; }, write: async (p, t) => { await tick(); disk = JSON.parse(t); } } },
        (id) => id, [], async () => {}, () => {});
    await Promise.all([
        window.savePublishedFields('A', { publishedDomains: (list) => CD.markActive(list, 'cafe.com', 5) }),
        window.savePublishedFields('A', { publishedDomains: (list) => CD.list(list).map((d) => ({ ...d, statusDetail: 'seen' })) }),
    ]);
    check('a domain change runs on what\'s on disk, inside the lock, so two at once both land',
        disk.publishedDomains[0].status === 'active' && disk.publishedDomains[0].statusDetail === 'seen' && disk.publishedUrl === 'https://cafe.puter.site/');
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
check('the open project\'s list entry carries its working domain, and a change to it is written',
    /publishedDomainUrl: window\.CustomDomain\?\.domainUrl\(publishedDomains, publishedUrl\) \|\| null,/.test(save)
    && /\(live\.publishedDomainUrl \|\| null\) === \(entry\.publishedDomainUrl \|\| null\)/.test(save));
check('the list entry names the project\'s domain in any state, and a change to it is written',
    /publishedDomainHost: window\.CustomDomain\?\.hostOf\(publishedDomains\) \|\| null,/.test(save)
    && /\(live\.publishedDomainHost \|\| null\) === \(entry\.publishedDomainHost \|\| null\)/.test(save)
    && /publishedDomainHost: window\.CustomDomain\?\.hostOf\(chat\.publishedDomains\) \|\| null,/.test(app));
check('…and so does a list rebuilt from the project files', /publishedDomainUrl: window\.CustomDomain\?\.domainUrl\(chat\.publishedDomains, chat\.publishedUrl\) \|\| null,/.test(app));
check('the sidebar links to the domain, redraws when it changes, and finds the project by it',
    /const linkUrl = chat\.publishedDomainUrl \|\| chat\.publishedUrl;/.test(app) && /c\.publishedDomainUrl \|\| ''/.test(app)
    && /\(chat\.publishedDomainUrl \|\| ''\)\.toLowerCase\(\)\.includes\(q\)/.test(app));
check('a duplicate starts without the source\'s domains', /publishedAt: null,\s*publishedDomains: \[\],\s*\/\/ Carry the source/.test(app));
check('closing a project clears them', /window\.currentPublishedAt = null;\s*window\.currentPublishedDomains = \[\];/.test(ui));
check('the live popover shows them above the badge box', /publishDomainsHtml\(\) \+\s*publishBadgeToggleHtml\(\) \+/.test(ui));
check('opening the popover checks waiting domains, closing it stops', /refreshUserPlan\(\);\s*\/\/[^\n]*\n\s*watchCustomDomains\(\);/.test(ui) && /stopWatchingCustomDomains\(\);\s*\$\('\.preview-publish-btn'\)\.attr\('aria-expanded', 'false'\);/.test(ui));
check('the live view\'s URL row shows a connected domain, the puter.site address under it',
    /const primary = publishedShareUrl\(url\) \|\| url;/.test(ui) && /\(primary !== url\s*\? publishAlsoAtHtml\(url\)\s*: '<button class="publish-change-address"/.test(ui));
check('…and its copy button copies what it shows', /\.publish-copy', async function \(e\) \{[\s\S]{0,200}const url = publishedShareUrl\(window\.currentPublishedUrl\);/.test(ui));
check('the share view and toast use the connected domain', /const shareUrl = window\.publishedShareUrl\?\.\(url\) \|\| url;/.test(ui) && /_publishSuccessData = \{ url: shareUrl, meta \};/.test(ui));
// The popover's and the chat card's address changes share
// changePublishedAddress, and Settings has its own.
check('every address change asks before leaving a domain behind',
    (ui.match(/await window\.confirmAddressChangeKeepsDomains\?\.\([^)]*\) === false/g) || []).length === 2);
const changeAddress = ui.slice(ui.indexOf('async function changePublishedAddress(typed) {'), ui.indexOf("$(document).on('click', '.publish-address-save'"));
check('a project opened, or the address moved, while the address question waits stops the change',
    /const chatId = currentChatId;\s*if \(await window\.confirmAddressChangeKeepsDomains\?\.\(window\.currentPublishedDomains, oldSub\) === false\s*\|\| currentChatId !== chatId \|\| window\.currentPublishedUrl !== oldUrl\) \{\s*return \{ changed: false, cancelled: true \};/.test(changeAddress));
check('…and the question comes before the waits, which a turn or a publish started meanwhile would get past',
    changeAddress.indexOf('confirmAddressChangeKeepsDomains') > 0 && changeAddress.indexOf('confirmAddressChangeKeepsDomains') < changeAddress.indexOf("throw fail('busy')"));
check('a kept address leaves the popover\'s editor open, with its field back',
    /const r = await changePublishedAddress\(\$input\.val\(\)\);\s*if \(r\.cancelled\) \{ \$input\.prop\('disabled', false\)\.trigger\('focus'\); return; \}/.test(ui));
check('…and the chat\'s card as it was, not saying it is already the address',
    /if \(r\.cancelled\) \{[\s\S]{0,120}return;\s*\}\s*if \(!r\.changed\) \{ showCardError/.test(read('../src/tools/chat_ui/publish.js')));
check('Settings asks before checking for a publish in flight, so one started meanwhile still stops it',
    /confirmAddressChangeKeepsDomains\?\.\(domains, fromSub\) === false\) \{[\s\S]{0,400}if \(window\.isPublishInFlight\(chatId\)\)/.test(ui));
check('the AI knows where the user connects a domain', /"Use custom domain" next to the site address/.test(read('../src/js/prompt.js')) && /paid Puter plan/.test(read('../src/js/prompt.js')));
const publish = ui.slice(ui.indexOf('async function doPublish('), ui.indexOf('async function loadPublishedSiteMeta('));
check('a first publish with a reserved name points that name at the release, after filling in the address',
    /if \(!existingSub && reserved\) \{[\s\S]*?const sub = await reserved;\s*url = `https:\/\/\$\{sub\}\.puter\.site\/`;\s*await absolutizeSocialImagesInRelease\(releaseDir, url, \[startPreviewUrl\]\);\s*await puter\.hosting\.update\(sub, releaseDir\);\s*_reservedPublishNames\.delete\(chatId\);\s*\} else if \(!existingSub\)/.test(publish));
check('…and only a first publish uses one', /let reserved = isFirst \? \(ui\.reserved \|\| null\) : null;/.test(publish));
check('the popover passes the reserved name to the shared publish', /async function doPublish\(\{ reserved = null \} = \{\}\) \{[\s\S]{0,400}return publishProject\(\{[\s\S]{0,200}\breserved,/.test(publish));
check('a plain Publish (the popover\'s Enter, or the chat\'s card) waits while the own-domain route reserves the name',
    /if \(!ui\.reserved && window\.isReservingPublishName\?\.\(currentChatId\)\) \{\s*ui\.render\(\);/.test(publish));
check('…and lands on the site view, where the domain shows its records', /viaDomain = isFirst && !!reserved;/.test(publish) && /if \(_publishPanelOpen && viaDomain\) \{\s*_publishPanelView = 'form';\s*renderPublishPanel\(\);/.test(publish));
check('the placeholder goes with the replaced releases once the publish lands', /await retirePublishedReleases\(pubRoot, releaseName\);/.test(publish));
const form = ui.slice(ui.indexOf("if (st.state === 'unpublished') {"), ui.indexOf("title = 'Your site';"));
check('…and the Publish button shows it', /data-action="publish"\$\{window\.isReservingPublishName\?\.\(currentChatId\) \? ' disabled' : ''\}/.test(form));
check('the heading sits over the address field before a first publish', /publishAddressHeadHtml\(\) \+\s*'<div class="publish-name-row">'/.test(form));
check('…and over the URL row on the live site', /'Live'\}<\/div>` \+\s*publishAddressHeadHtml\(\) \+\s*'<div class="publish-url-row">'/.test(ui));
check('the button runs useOwnDomain', /\.publish-domain-action', function \(e\) \{[\s\S]{0,120}useOwnDomain\(\$\(this\)\.attr\('data-action'\)\);/.test(ui));
const upgrade = ui.slice(ui.indexOf('function openUpgradeModal('), ui.indexOf('const $overlay', ui.indexOf('function openUpgradeModal(')));
check('the upgrade dialog lists custom domains', /id: 'domain', title: 'Use your own domain'/.test(upgrade));
check('…first when the user came from a domain prompt', /source === 'custom_domain' \? 'domain'/.test(upgrade));

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nAll custom-domain checks passed');
