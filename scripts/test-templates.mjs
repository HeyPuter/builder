import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { buildTemplates, readTemplate, validateTemplate, loadTemplateCore, TEMPLATES } from './build-templates.mjs';

// ---- Regression guard for official project templates -------------------------
// "Use this template" copies a template that ships with the builder
// (src/templates/<slug>/) into a new project in the user's own account. What
// has to hold, and is checked here:
//   1. TemplateCore (js/template-core.js, pure): the index validator the app
//      trusts before it writes anything into an account, the worker-URL
//      placeholders, and the note a fork's system prompt carries (including
//      that a later "Make a copy" of the fork rewrites it correctly).
//   2. The build (scripts/build-templates.mjs): every shipped template is
//      valid, follows the rules the system prompt gives every build, and a
//      broken one fails the build with a readable reason.
//   3. The fork (js/templates.js, driven in a VM with only the account, the
//      network and the DOM mocked, against the REAL built templates): files
//      land in a fresh project, a backend is deployed under a name the project
//      owns and wired into the frontend, the chat is created the way every
//      other project is, and any failure leaves nothing behind.
//   4. The deep link: ?template= is captured before the composer handoff can
//      consume its id, and the fork starts without asking only when a record
//      from a template page's own button is behind it.
//   5. Wiring: boot order, the prompt-history strip, the build and the flag.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const flush = () => new Promise((r) => setImmediate(r));

const CORE_SRC = read('../src/js/template-core.js');
const OWNERSHIP_SRC = read('../src/js/worker-ownership.js');
const TEMPLATES_SRC = read('../src/js/templates.js');
const APP = read('../src/js/app.js');
const HELPERS = read('../src/js/helpers.js');
const UI = read('../src/js/ui.js');
const FEATURED = read('../src/js/featured.js');
const PROMPT = read('../src/js/prompt.js');
const VITE = read('../vite.config.js');

const core = loadTemplateCore();
const ownershipWin = {};
new Function('window', OWNERSHIP_SRC)(ownershipWin);
const WO = ownershipWin.WorkerOwnership;

// =============================================================================
// 1. TemplateCore
// =============================================================================

const VALID = {
    slug: 'notes', name: 'Notes', version: 'abcdef123456', description: 'A notes app.', category: 'App',
    thumbnail: '/template-thumbs/notes.webp',
    files: ['index.html', 'app.js', 'workers/api.js'], workers: ['api'],
    suggestions: [{ label: 'Add tags', prompt: 'Add tags to notes.' }],
};
const one = (patch) => core.sanitizeIndex({ templates: [{ ...VALID, ...patch }] });

{
    const ok = core.sanitizeIndex({ templates: [VALID] });
    check('a well-formed entry is accepted as is',
        ok.length === 1 && ok[0].slug === 'notes' && ok[0].files.length === 3 && ok[0].workers[0] === 'api' &&
        ok[0].suggestions[0].label === 'Add tags' && ok[0].thumbnail === '/template-thumbs/notes.webp');
    check('no index, or no list, is an empty list',
        core.sanitizeIndex(null).length === 0 && core.sanitizeIndex({}).length === 0 && core.sanitizeIndex({ templates: 'x' }).length === 0);
    for (const [label, patch] of [
        ['an uppercase or dotted slug', { slug: 'Notes' }],
        ['a slug with a slash', { slug: 'a/b' }],
        ['a missing name', { name: '' }],
        ['a non-hex version', { version: '../../etc' }],
        ['a path that climbs out', { files: ['index.html', '../secrets.js'] }],
        ['a dot file', { files: ['index.html', '.env'] }],
        ['a dot directory', { files: ['index.html', '.git/config'] }],
        ['a backslash path', { files: ['index.html', 'a\\b.js'] }],
        ['an absolute path', { files: ['index.html', '/etc/passwd'] }],
        ['a doubled file', { files: ['index.html', 'index.html'] }],
        ['no index.html', { files: ['app.js'], workers: [] }],
        ['a worker without its source', { files: ['index.html'], workers: ['api'] }],
        ['a worker name outside the charset', { files: ['index.html', 'workers/a b.js'], workers: ['a b'] }],
        ['a doubled worker', { workers: ['api', 'api'] }],
        ['too many files', { files: ['index.html', ...Array.from({ length: 200 }, (_, i) => `f${i}.js`)], workers: [] }],
    ]) {
        check(`the app rejects ${label}`, one(patch).length === 0);
    }
    check('a thumbnail that is not a root path is dropped, the entry kept',
        one({ thumbnail: 'javascript:alert(1)' })[0].thumbnail === '' && one({ thumbnail: 'https://evil.example/x.png' })[0].thumbnail === '' &&
        one({ thumbnail: '//evil.example/x.png' })[0].thumbnail === '' && one({ thumbnail: '/template-thumbs/notes.webp' })[0].thumbnail === '/template-thumbs/notes.webp');
    check('two entries with one slug keep only the first',
        core.sanitizeIndex({ templates: [VALID, { ...VALID, name: 'Other' }] }).map((t) => t.name).join() === 'Notes');
    const sugg = one({ suggestions: [...Array(8)].map((_, i) => ({ label: 'L' + i, prompt: 'P' + i })).concat([{ label: '', prompt: 'x' }, null]) })[0].suggestions;
    check('suggestions are capped at five and blanks are dropped', sugg.length === 5 && sugg.every((s) => s.label && s.prompt));
}

check('fileUrl addresses the versioned build path',
    core.fileUrl(core.sanitizeIndex({ templates: [VALID] })[0], 'workers/api.js') === '/template-files/notes/abcdef123456/workers/api.js');

{
    const text = "const API = '{{WORKER_URL:api}}'; fetch('{{WORKER_URL:api}}/x'); fetch('{{WORKER_URL:other}}'); const t = `${a}{{notaplaceholder}}`;";
    check('placeholdersIn lists each worker a file refers to once', core.placeholdersIn(text).sort().join() === 'api,other');
    const out = core.substituteWorkerUrls(text, { api: 'https://notes-api-x1.puter.work/' });
    check('substitution drops the URL\'s trailing slash so `${API}/path` reads naturally',
        out.text.includes("const API = 'https://notes-api-x1.puter.work';") && out.text.includes("fetch('https://notes-api-x1.puter.work/x')"));
    check('a placeholder with no URL is reported and left in place',
        out.missing.join() === 'other' && out.text.includes('{{WORKER_URL:other}}'));
    check('other braces are untouched', out.text.includes('${a}{{notaplaceholder}}'));
    check('substitution ignores inherited keys', core.substituteWorkerUrls('{{WORKER_URL:constructor}}', {}).missing.join() === 'constructor');
}

check('worker base names carry the template and stay short enough for a suffix',
    core.workerBaseName('feedback-board', 'api') === 'feedback-board-api' &&
    core.workerBaseName('a'.repeat(50), 'api').length <= 40 &&
    core.WORKER_NAME_RE.test(WO.deriveCopyName(core.workerBaseName('a'.repeat(50), 'api'), [], () => 'x1y2z3')));
check('titles are disambiguated against existing projects',
    core.uniqueTitle('Notes', ['Other']) === 'Notes' &&
    core.uniqueTitle('Notes', ['Notes']) === 'Notes 2' &&
    core.uniqueTitle('Notes', ['Notes', 'Notes 2']) === 'Notes 3');

{
    const appDir = '/alice/AppData/app-uid/chat_new';
    const note = core.buildTemplateNote({
        name: 'Notes', appDir, files: ['index.html', 'workers/notes-api-x1y2z3.js'],
        previewUrl: 'https://preview-1.puter.site/',
        workers: [{ name: 'notes-api-x1y2z3', url: 'https://notes-api-x1y2z3.puter.work/' }],
    });
    check('the note says the app already exists and lists its files',
        /already contains a complete, working app/.test(note) && note.includes('\n- index.html') && note.includes('\n- workers/notes-api-x1y2z3.js'));
    check('the note says the preview is open and not to publish it again', note.includes('do not call publish_site'));
    check('the note gives each backend by source path and URL',
        note.includes(`Source ${appDir}/workers/notes-api-x1y2z3.js, running at https://notes-api-x1y2z3.puter.work.`));
    check('the note asks the model to build on the existing code', /read the files involved and build on the existing code/.test(note));
    const bare = core.buildTemplateNote({ name: 'Notes', appDir, files: ['index.html'], previewUrl: null, workers: [] });
    check('without a preview or backend the note says neither',
        !bare.includes('publish_site') && !bare.includes('serverless backend'));

    // "Make a copy" of a fork: duplicateChat rewrites the app dir, then
    // WorkerOwnership.rewriteHistory rewrites worker URLs and source paths.
    // The copy's note must describe the COPY's backend, not the fork's.
    const copyDir = '/alice/AppData/app-uid/chat_copy';
    const history = [{ role: 'system', content: [{ type: 'text', text: 'x' }, { type: 'text', text: note }] }];
    const moved = JSON.parse(JSON.stringify(history).split(appDir).join(copyDir));
    const rewritten = WO.rewriteHistory(moved, [{
        oldName: 'notes-api-x1y2z3', newName: 'notes-api-x1y2z3-q9', oldUrl: 'https://notes-api-x1y2z3.puter.work',
        newUrl: 'https://notes-api-x1y2z3-q9.puter.work', copiedFilePath: copyDir + '/workers/notes-api-x1y2z3.js',
        newFilePath: copyDir + '/workers/notes-api-x1y2z3-q9.js',
    }]);
    const copied = rewritten[0].content[1].text;
    check('a copy of a fork gets a note about its own backend',
        copied.includes(`Source ${copyDir}/workers/notes-api-x1y2z3-q9.js, running at https://notes-api-x1y2z3-q9.puter.work.`) &&
        !copied.includes(appDir) && !copied.includes('https://notes-api-x1y2z3.puter.work'));
}

// =============================================================================
// 2. The build
// =============================================================================

let built = null;
try { built = buildTemplates(); } catch (e) { check('every registered template builds', false, e.message); }
if (built) {
    check('every registered template builds', built.templates.length === TEMPLATES.length && TEMPLATES.length > 0);
    const accepted = core.sanitizeIndex(JSON.parse(JSON.stringify(built.index)));
    check('the app accepts every built index entry', accepted.length === TEMPLATES.length);
    check('the index lists each template\'s files and its card image',
        built.index.templates.every((e, i) => e.slug === TEMPLATES[i].slug && e.files.includes('index.html') &&
            e.thumbnail === `/template-thumbs/${e.slug}.webp`));

    // The rules the system prompt gives every build apply to templates too:
    // a fork is a project the model will keep editing, and post-build
    // verification depends on the error snippet being there, verbatim, first.
    const snippet = (PROMPT.match(/(<script>\nwindow\.onerror=[\s\S]*?<\/script>)/) || [])[1];
    check('the error-reporting snippet can be read out of prompt.js', !!snippet);
    for (const t of built.templates) {
        const slug = t.meta.slug;
        const html = t.files.find((f) => f.path === 'index.html').bytes.toString('utf8');
        const head = html.slice(0, html.indexOf('</head>'));
        check(`${slug}: carries the error-reporting snippet verbatim as its first script`,
            !!snippet && head.includes(snippet) && head.indexOf('<script') === head.indexOf(snippet));
        check(`${slug}: loads the Puter runtime tag`, head.includes('<script src="https://builder.puter.com/runtime.js" defer></script>'));
        check(`${slug}: declares a theme color`, /<meta name="theme-color" content="#[0-9a-f]{6}">/i.test(head));
        check(`${slug}: ships an icon.svg with a viewBox`,
            t.files.some((f) => f.path === 'icon.svg' && /viewBox=/.test(f.bytes.toString('utf8'))));
        check(`${slug}: has a screenshot`, !!t.screenshot);
        for (const w of t.meta.workers) {
            const referenced = t.files.some((f) => core.isTextFile(f.path) &&
                f.bytes.toString('utf8').includes(core.workerPlaceholder(w)));
            check(`${slug}: its frontend reaches worker "${w}" through the placeholder`, referenced);
        }
        check(`${slug}: suggestions are short chips with real prompts`,
            t.meta.suggestions.length >= 3 && t.meta.suggestions.length <= 5 &&
            t.meta.suggestions.every((s) => s.label.length <= 30 && s.prompt.length >= 30));
    }
}

// Broken templates fail the build with a reason.
{
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tpl-'));
    const make = (slug, files, { screenshot = true } = {}) => {
        const dir = path.join(tmp, slug);
        for (const [rel, text] of Object.entries(files)) {
            fs.mkdirSync(path.dirname(path.join(dir, 'files', rel)), { recursive: true });
            fs.writeFileSync(path.join(dir, 'files', rel), text);
        }
        if (screenshot) fs.writeFileSync(path.join(dir, 'screenshot.png'), 'png');
    };
    const meta = (slug, extra = {}) => ({
        slug, name: 'T', description: 'd', updated: '2026-01-01', workers: [],
        suggestions: [{ label: 'a', prompt: 'b' }], page: {}, ...extra,
    });
    const errorsFor = (m) => validateTemplate(readTemplate(m, { dir: tmp }), core).join('\n');

    make('good', { 'index.html': '<p>{{WORKER_URL:api}}</p>', 'workers/api.js': 'router.get("/", () => 1);' });
    check('a valid fixture has no errors', errorsFor(meta('good', { workers: ['api'] })) === '');
    make('noindex', { 'app.js': '' });
    check('a missing index.html fails', /index\.html is missing/.test(errorsFor(meta('noindex'))));
    make('noshot', { 'index.html': '' }, { screenshot: false });
    check('a missing screenshot fails', /needs a screenshot/.test(errorsFor(meta('noshot'))));
    make('dotfile', { 'index.html': '', '.env': 'SECRET=1' });
    check('a dot file fails', /"\.env" is not an allowed file path/.test(errorsFor(meta('dotfile'))));
    make('noworker', { 'index.html': '' });
    check('a declared worker without its source fails', /files\/workers\/api\.js is missing/.test(errorsFor(meta('noworker', { workers: ['api'] }))));
    make('stray', { 'index.html': '', 'workers/old.js': '' });
    check('an undeclared file under workers/ fails', /workers\/old\.js is under workers\/ but is not a declared worker/.test(errorsFor(meta('stray'))));
    make('unknown', { 'index.html': "'{{WORKER_URL:api}}'" });
    check('a placeholder for an undeclared worker fails', /declares no worker "api"/.test(errorsFor(meta('unknown'))));
    make('inworker', { 'index.html': '', 'workers/a.js': "'{{WORKER_URL:b}}'", 'workers/b.js': '' });
    check('a placeholder inside a worker source fails', /is a worker source and cannot use/.test(errorsFor(meta('inworker', { workers: ['a', 'b'] }))));
    make('malformed', { 'index.html': "'{{WORKER_URL: api}}' '{{WORKER_URL:api}'" });
    check('a malformed placeholder fails', /malformed/.test(errorsFor(meta('malformed'))));
    check('a folder that does not match the slug fails',
        /must live in src\/templates\/other\//.test(validateTemplate({ ...readTemplate(meta('good', { workers: ['api'] }), { dir: tmp }), meta: meta('other', { workers: ['api'] }) }, core).join('\n')));
    let threw = '';
    try { buildTemplates({ templates: [meta('noindex'), meta('dotfile')], dir: tmp }); } catch (e) { threw = e.message; }
    check('the build reports every broken template at once', /noindex/.test(threw) && /dotfile/.test(threw));

    const a = readTemplate(meta('good'), { dir: tmp }).version;
    fs.writeFileSync(path.join(tmp, 'good/files/index.html'), '<p>{{WORKER_URL:api}}</p> ');
    const b = readTemplate(meta('good'), { dir: tmp }).version;
    check('the version changes when any byte changes', a !== b && /^[a-f0-9]{12}$/.test(b));
    fs.rmSync(tmp, { recursive: true, force: true });
}

// =============================================================================
// 3. The fork, in a VM, against the real built templates
// =============================================================================

// A jQuery stand-in that absorbs any chain of calls. The fork itself never
// needs the DOM; the dialog and landing section only need not to throw.
const chain = new Proxy(function () {}, {
    get: (t, k) => (k === 'length' ? 1 : k === 'then' ? undefined : k === Symbol.toPrimitive ? () => '' : chain),
    apply: () => chain,
});

function fixtureIndex(extra = []) {
    const index = JSON.parse(JSON.stringify(built.index));
    index.templates.push(...extra.map((x) => x.entry));
    return index;
}

function makeEnv(opts = {}) {
    const appParent = '/alice/AppData/app-uid';
    const files = new Map();
    const deployed = new Map();
    const deletedWorkers = [];
    const sites = [];
    const deletedSites = [];
    const log = { alerts: [], toasts: [], tracked: [], loads: [], versions: [], previews: [], loading: 0, hid: 0, fetches: [] };
    const extraFiles = new Map(); // url -> text, for synthetic templates
    for (const x of (opts.extra || [])) for (const [p, text] of Object.entries(x.files)) extraFiles.set(`/template-files/${x.entry.slug}/${x.entry.version}/${p}`, text);
    const index = fixtureIndex(opts.extra);
    let listCalls = 0;

    const ctx = {
        console: { warn() {}, error() {}, log() {} },
        URL, URLSearchParams, Response, Blob, JSON, Math, Date, Promise, Set, Map, Array, Object, String, RegExp, Error,
        setTimeout, clearTimeout,
        requestAnimationFrame: (fn) => setTimeout(fn, 0),
        document: {},
        localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
        location: { href: 'https://builder.puter.com/' + (opts.search || ''), search: opts.search || '' },
        history: {
            state: null,
            replaceState(state, title, url) { log.replaced = url; ctx.location.search = new URL(url, 'https://x').search; },
        },
        fetch: async (url) => {
            log.fetches.push(url);
            if (url === '/templates.json') {
                if (opts.indexFails) throw new Error('offline');
                return new Response(JSON.stringify(index));
            }
            if (opts.failFetch && opts.failFetch(url)) return new Response('nope', { status: 404 });
            if (extraFiles.has(url)) return new Response(extraFiles.get(url));
            const m = url.match(/^\/template-files\/([^/]+)\/([^/]+)\/(.+)$/);
            const t = m && built.templates.find((x) => x.meta.slug === m[1] && x.version === m[2]);
            const f = t && t.files.find((x) => x.path === m[3]);
            return f ? new Response(f.bytes) : new Response('missing', { status: 404 });
        },
        savedChats: (opts.savedChats || []).map((c) => ({ ...c })),
        currentChatId: 'chat_open',
        generateChatId: () => 'chat_new',
        saveChatList: async () => { log.listSaves = (log.listSaves || 0) + 1; },
        updateChatHistorySidebar() {},
        ensureAuthenticated: async () => {
            if (!ctx.user || ctx.user.is_temp) {
                if (opts.signInDismissed) throw new Error('dismissed');
                ctx.user = { username: 'alice' };
            }
            return ctx.user;
        },
        confirmLeaveActiveChat: async () => opts.confirmLeave !== false,
        loadChat: async (id, o) => {
            log.loads.push([id, o && o.urlMode]);
            ctx.currentChatId = id;
            const chat = JSON.parse(files.get(`chat-history/${id}.json`));
            ctx.currentPreviewUrl = chat.previewUrl;
            return chat;
        },
        readUrlChatId: () => opts.urlChatId || null,
        buildFeaturedPlaceholder: () => chain,
        $: () => chain,
        puter: {
            appID: 'app-uid',
            fs: {
                write: async (p, data) => {
                    await flush();
                    if (opts.failWrite && opts.failWrite(p)) throw new Error('write failed');
                    files.set(p, data);
                },
                delete: async (p) => {
                    log.deleted = (log.deleted || []).concat(p);
                    for (const k of [...files.keys()]) if (k === p || k.startsWith(p + '/')) files.delete(k);
                },
            },
            workers: {
                list: async () => { listCalls++; if (opts.listFails) throw new Error('list failed'); return [...deployed.values(), { name: 'someone-else', url: 'https://someone-else.puter.work', file_path: '/alice/AppData/app-uid/other/workers/someone-else.js' }]; },
                create: async (name, filePath) => {
                    if (opts.failCreate && opts.failCreate(name)) return { success: false, errors: ['boom'] };
                    if (!files.has(filePath)) throw new Error('worker source was not written first: ' + filePath);
                    const rec = { name, url: `https://${name}.puter.work/`, file_path: filePath, source: files.get(filePath) };
                    deployed.set(name, rec);
                    return { success: true, url: rec.url };
                },
                delete: async (name) => { deletedWorkers.push(name); deployed.delete(name); },
            },
            hosting: {
                create: async (sub, dir) => {
                    if (opts.onHosting) opts.onHosting(ctx);
                    if (opts.failHosting) throw new Error('hosting failed');
                    sites.push({ sub, dir });
                    return { subdomain: sub };
                },
                delete: async (sub) => { deletedSites.push(sub); },
            },
            ui: { alert: async (m) => { log.alerts.push(m); } },
        },
        user: opts.signedOut ? null : { username: 'alice' },
        FEATURE_FLAGS: { templates: opts.flagOff ? false : true },
        withFileLock: (p, fn) => fn(),
        writeFileVerified: async (p, d) => { await ctx.puter.fs.write(p, d); },
        makeDraftSubdomain: () => 'preview-0000',
        system_prompt_common: () => 'COMMON',
        system_prompt_dynamic: (dir) => 'WORKDIR ' + dir,
        showToast: (m) => log.toasts.push(m),
        track: (e, p) => log.tracked.push([e, p]),
        showProjectLoading: () => { log.loading++; },
        hideProjectLoading: () => { log.hid++; },
        showAppPreview: (url, o) => log.previews.push([url, o]),
        createProjectVersion: (o) => { log.versions.push(o); return Promise.resolve(); },
        BuilderHandoff: { take: async (id) => (opts.handoff && opts.handoff[id]) || null },
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(CORE_SRC + '\n' + OWNERSHIP_SRC + '\n' + TEMPLATES_SRC, ctx);
    const appDir = `${appParent}/chat_new`;
    const underApp = () => [...files.keys()].filter((k) => k.startsWith(appDir + '/'));
    const chatFile = () => files.has('chat-history/chat_new.json') ? JSON.parse(files.get('chat-history/chat_new.json')) : null;
    return { ctx, files, deployed, deletedWorkers, sites, deletedSites, log, appDir, underApp, chatFile, listCalls: () => listCalls };
}

const tpl = (slug) => built.templates.find((t) => t.meta.slug === slug);
const entry = (slug) => built.index.templates.find((t) => t.slug === slug);

if (built) {
    // --- A frontend-only template ---------------------------------------------
    {
        const env = makeEnv({ savedChats: [{ id: 'c1', title: 'Product Landing Page' }] });
        const id = await env.ctx.forkTemplate('landing-page', { source: 'landing' });
        const t = tpl('landing-page');
        const chat = env.chatFile();
        check('fork: resolves with the new project id', id === 'chat_new');
        check('fork: every template file lands in the new project, byte for byte',
            t.files.every((f) => env.files.get(`${env.appDir}/${f.path}`) === f.bytes.toString('utf8')) &&
            env.underApp().length === t.files.length);
        check('fork: gets its own draft preview of the project directory',
            env.sites.length === 1 && env.sites[0].dir === env.appDir && env.sites[0].sub === 'preview-0000');
        check('fork: a frontend-only template never touches workers', env.listCalls() === 0 && env.deployed.size === 0);
        check('fork: the chat is saved with only a system message',
            !!chat && Array.isArray(chat.history) && chat.history.length === 1 && chat.history[0].role === 'system');
        const blocks = chat.history[0].content;
        check('fork: its system prompt is the usual two blocks plus the template note',
            blocks.length === 3 && blocks[0].text === 'COMMON' && blocks[0].cache_control && blocks[0].cache_control.type === 'ephemeral' &&
            blocks[1].text === 'WORKDIR ' + env.appDir && /Product Landing Page/.test(blocks[2].text) && blocks[2].text.includes('\n- app.js'));
        check('fork: the system message records where it came from',
            chat.history[0].templateOrigin.slug === 'landing-page' && chat.history[0].templateOrigin.version === t.version);
        check('fork: named after the template, disambiguated, and kept from the auto-namers',
            chat.title === 'Product Landing Page 2' && chat.customTitle === true && chat.aiTitled === false);
        check('fork: opens with the template\'s suggestion chips',
            JSON.stringify(chat.suggestions) ===
            JSON.stringify(core.sanitizeIndex(JSON.parse(JSON.stringify(built.index))).find((x) => x.slug === 'landing-page').suggestions) &&
            chat.suggestions.length === entry('landing-page').suggestions.length);
        check('fork: starts unpublished and not interrupted',
            chat.publishedUrl === null && chat.publishedPath === null && chat.interrupted === false &&
            chat.previewUrl === 'https://preview-0000.puter.site/' && chat.previewPath === env.appDir);
        check('fork: listed first in the sidebar and the index saved',
            env.ctx.savedChats[0].id === 'chat_new' && env.ctx.savedChats[0].title === 'Product Landing Page 2' && env.log.listSaves >= 1);
        check('fork: opened, with the preview waiting for the new site to go live',
            env.log.loads.length === 1 && env.log.loads[0][0] === 'chat_new' && env.log.loads[0][1] === 'push' &&
            env.log.previews.length === 1 && env.log.previews[0][1].waitForReady === true);
        check('fork: a restore point of the template as it arrived',
            env.log.versions.length === 1 && env.log.versions[0].chatId === 'chat_new' && env.log.versions[0].appDir === env.appDir);
        check('fork: counted, and nothing alarming shown',
            env.log.tracked.some(([e, p]) => e === 'Template Used' && p.template === 'landing-page' && p.source === 'landing') &&
            env.log.alerts.length === 0);
    }

    // --- A template with a backend --------------------------------------------
    {
        const env = makeEnv();
        await env.ctx.forkTemplate('feedback-board');
        const [worker] = [...env.deployed.values()];
        const appJs = env.files.get(`${env.appDir}/app.js`) || '';
        const src = tpl('feedback-board').files.find((f) => f.path === 'workers/api.js').bytes.toString('utf8');
        const chat = env.chatFile();
        const note = chat ? chat.history[0].content[2].text : '';
        check('backend: exactly one worker deployed, under a fresh name that says where it came from',
            env.deployed.size === 1 && /^feedback-board-api-[a-z0-9]{1,6}$/.test(worker.name));
        check('backend: deployed from workers/<its name>.js inside the new project (create_worker\'s convention)',
            worker.file_path === `${env.appDir}/workers/${worker.name}.js` && worker.source === src &&
            !env.files.has(`${env.appDir}/workers/api.js`));
        check('backend: the project owns its worker, so deleting it deletes the worker',
            WO.ownedWorkers([...env.deployed.values()], env.appDir).length === 1);
        check('backend: the frontend calls the fork\'s own worker, placeholder gone',
            appJs.includes(`const API = 'https://${worker.name}.puter.work';`) && !appJs.includes('{{WORKER_URL'));
        check('backend: the note lists the renamed source and gives its URL',
            note.includes(`\n- workers/${worker.name}.js`) && !note.includes('\n- workers/api.js') &&
            note.includes(`Source ${env.appDir}/workers/${worker.name}.js, running at https://${worker.name}.puter.work.`));
        check('backend: no other account worker is touched', env.deletedWorkers.length === 0);
    }

    // --- Failures leave nothing behind ----------------------------------------
    const nothingLeft = (env) => env.underApp().length === 0 && !env.chatFile() &&
        !env.ctx.savedChats.some((c) => c.id === 'chat_new') && env.log.loads.length === 0 && env.deployed.size === 0;
    {
        const env = makeEnv({ failCreate: () => true });
        const id = await env.ctx.forkTemplate('feedback-board');
        check('a backend that will not deploy: no project is made', id === null && nothingLeft(env));
        check('a backend that will not deploy: the user is told nothing was added', env.log.alerts.length === 1 && /Nothing was added/.test(env.log.alerts[0]));
        check('a backend that will not deploy: the loading state is taken down', env.log.hid >= 1);
    }
    {
        const two = {
            entry: { slug: 'two-workers', name: 'Two', version: 'aaaaaaaa1111', description: 'd', files: ['index.html', 'workers/a.js', 'workers/b.js'], workers: ['a', 'b'], suggestions: [] },
            files: { 'index.html': "'{{WORKER_URL:a}}' '{{WORKER_URL:b}}'", 'workers/a.js': 'a', 'workers/b.js': 'b' },
        };
        const env = makeEnv({ extra: [two], failCreate: (name) => name.startsWith('two-workers-b') });
        await env.ctx.forkTemplate('two-workers');
        check('a second backend that fails: the first one deployed is removed again',
            nothingLeft(env) && env.deletedWorkers.length === 1 && env.deletedWorkers[0].startsWith('two-workers-a-'));
    }
    {
        const env = makeEnv({ listFails: true });
        await env.ctx.forkTemplate('feedback-board');
        check('a worker list that fails: no project is made (a name could clash)', nothingLeft(env) && env.log.alerts.length === 1);
    }
    {
        const env = makeEnv({ failFetch: (url) => url.endsWith('/app.js') });
        await env.ctx.forkTemplate('feedback-board');
        check('a file that will not download: nothing is written or deployed at all',
            nothingLeft(env) && env.files.size === 0 && env.listCalls() === 0 && env.log.alerts.length === 1);
    }
    {
        const env = makeEnv({ failWrite: (p) => p.endsWith('/index.html') });
        await env.ctx.forkTemplate('feedback-board');
        await flush(); await flush();
        check('a write that fails: the backend and every file already written are removed',
            nothingLeft(env) && env.deletedWorkers.length === 1 && (env.log.deleted || []).includes(env.appDir));
    }
    {
        const bad = {
            entry: { slug: 'sneaky', name: 'Sneaky', version: 'bbbbbbbb2222', description: 'd', files: ['index.html'], workers: [], suggestions: [] },
            files: { 'index.html': "fetch('{{WORKER_URL:api}}')" },
        };
        const env = makeEnv({ extra: [bad] });
        await env.ctx.forkTemplate('sneaky');
        check('a placeholder for a backend the template does not ship is refused before any write',
            nothingLeft(env) && env.files.size === 0 && env.log.alerts.length === 1);
    }
    {
        const env = makeEnv({ failHosting: true });
        await env.ctx.forkTemplate('landing-page');
        const chat = env.chatFile();
        check('a preview that cannot be created: the project is still made, without one',
            !!chat && chat.previewUrl === null && chat.previewPath === null && env.log.loads.length === 1 && env.log.previews.length === 0);
        check('a preview that cannot be created: the note does not claim one', !chat.history[0].content[2].text.includes('publish_site'));
    }
    {
        const env = makeEnv({ signedOut: true, signInDismissed: true });
        const id = await env.ctx.forkTemplate('landing-page');
        check('a dismissed sign-in: nothing happens and nothing is reported as an error',
            id === null && env.files.size === 0 && env.log.alerts.length === 0 && env.log.fetches.length === 0);
    }
    {
        const env = makeEnv({ signedOut: true });
        await env.ctx.forkTemplate('landing-page');
        check('a signed-out visitor who signs in gets the project', !!env.chatFile() && env.log.loads.length === 1);
    }
    {
        const env = makeEnv({ confirmLeave: false });
        const id = await env.ctx.forkTemplate('landing-page');
        check('declining to leave a running build: nothing happens', id === null && env.files.size === 0);
    }
    {
        const env = makeEnv();
        const id = await env.ctx.forkTemplate('no-such-template');
        check('an unknown template: a toast, and nothing is written', id === null && env.files.size === 0 && env.log.toasts.length === 1);
    }
    {
        const env = makeEnv();
        const first = env.ctx.forkTemplate('landing-page');
        const second = await env.ctx.forkTemplate('landing-page');
        await first;
        check('a second click while copying does not make a second project',
            second === null && env.ctx.savedChats.filter((c) => c.id === 'chat_new').length === 1);
    }
    {
        const env = makeEnv({ onHosting: (ctx) => { ctx.currentChatId = 'chat_elsewhere'; } });
        await env.ctx.forkTemplate('landing-page');
        check('opening another project mid-copy: the user is not pulled out of it',
            !!env.chatFile() && env.log.loads.length === 0 && env.log.toasts.length === 1 && env.ctx.currentChatId === 'chat_elsewhere');
    }

    // =========================================================================
    // 4. Deep links
    // =========================================================================
    const HID = 'abcdef12-3456-4789-abcd-ef1234567890';
    {
        const env = makeEnv({ search: `?template=feedback-board&handoff=${HID}`, handoff: { [HID]: { template: 'feedback-board', prompt: '', files: [] } } });
        env.ctx.captureTemplateDeepLink();
        check('deep link: both params leave the address bar at once (the composer never sees the id)',
            env.log.replaced === '/' && env.ctx.location.search === '');
        await env.ctx.consumeTemplateDeepLink();
        check('deep link: a hand-over from the template page\'s button copies straight away',
            !!env.chatFile() && env.log.loads.length === 1 &&
            env.log.tracked.some(([e, p]) => e === 'Template Used' && p.source === 'page'));
    }
    {
        const env = makeEnv({ search: `?template=feedback-board&handoff=${HID}` });
        env.ctx.captureTemplateDeepLink();
        await env.ctx.consumeTemplateDeepLink();
        check('deep link: an id with no record behind it (an outside link) only shows the dialog',
            !env.chatFile() && env.files.size === 0 && env.log.tracked.some(([e, p]) => e === 'Template Viewed' && p.source === 'link'));
    }
    {
        const env = makeEnv({ search: '?template=feedback-board' });
        env.ctx.captureTemplateDeepLink();
        await env.ctx.consumeTemplateDeepLink();
        check('deep link: a plain link only shows the dialog', !env.chatFile() && env.log.tracked.some(([e]) => e === 'Template Viewed'));
    }
    {
        const env = makeEnv({ search: `?template=feedback-board&handoff=${HID}`, handoff: { [HID]: { template: 'ai-chat', prompt: '', files: [] } } });
        env.ctx.captureTemplateDeepLink();
        await env.ctx.consumeTemplateDeepLink();
        check('deep link: a record for a different template does not count', !env.chatFile() && env.log.tracked.some(([e]) => e === 'Template Viewed'));
    }
    {
        const env = makeEnv({ signedOut: true, search: `?template=feedback-board&handoff=${HID}`, handoff: { [HID]: { template: 'feedback-board', prompt: '', files: [] } } });
        env.ctx.captureTemplateDeepLink();
        await env.ctx.consumeTemplateDeepLink();
        check('deep link: a hand-over that arrives signed out waits for a click in the dialog',
            !env.chatFile() && env.log.fetches.includes('/templates.json') && env.log.tracked.some(([e]) => e === 'Template Viewed'));
    }
    {
        const env = makeEnv({ search: '?template=feedback-board', urlChatId: 'chat_x' });
        env.ctx.captureTemplateDeepLink();
        await env.ctx.consumeTemplateDeepLink();
        check('deep link: a link that also restores a project is about that project',
            env.log.fetches.length === 0 && env.log.tracked.length === 0 && env.log.replaced === '/');
    }
    {
        const env = makeEnv({ search: '?template=..%2Fetc' });
        env.ctx.captureTemplateDeepLink();
        await env.ctx.consumeTemplateDeepLink();
        check('deep link: a malformed slug is ignored', env.log.fetches.length === 0 && env.log.tracked.length === 0);
    }
    {
        const env = makeEnv({ search: '?template=gone-now' });
        env.ctx.captureTemplateDeepLink();
        await env.ctx.consumeTemplateDeepLink();
        check('deep link: a template that no longer exists gets a toast', env.log.toasts.length === 1 && env.log.tracked.length === 0);
    }
    {
        const env = makeEnv({ search: '?template=feedback-board', flagOff: true });
        env.ctx.captureTemplateDeepLink();
        await env.ctx.consumeTemplateDeepLink();
        env.ctx.initTemplates();
        check('flag off: links, the landing section and the index fetch are all inert',
            env.log.fetches.length === 0 && env.log.tracked.length === 0);
    }
    {
        const env = makeEnv({ search: '?prompt=hello' });
        env.ctx.captureTemplateDeepLink();
        check('deep link: a prompt link is left alone for applyPromptDeepLink', env.log.replaced === undefined && env.ctx.location.search === '?prompt=hello');
    }
}

// =============================================================================
// 5. Wiring
// =============================================================================

{
    const extract = (src, signature) => {
        const a = src.indexOf(signature);
        const b = src.indexOf('\n}\n', a);
        return src.slice(a, b + 2);
    };
    const sandbox = { structuredClone };
    vm.createContext(sandbox);
    vm.runInContext([
        HELPERS.match(/^const _SURROGATE_RE = .*$/m)[0],
        extract(HELPERS, 'function wellFormedText(s) {'),
        extract(HELPERS, 'function wellFormedDeep(value) {'),
        extract(HELPERS, 'function prepareHistoryForAI(historyArray) {'),
        extract(HELPERS, 'function dropDuplicateToolResults(messages) {'),
        extract(HELPERS, 'function stubStaleDocumentBlocks(messages) {'),
    ].join('\n'), sandbox);
    const history = [
        { role: 'system', content: [{ type: 'text', text: 'x' }], templateOrigin: { slug: 'a', name: 'A', version: 'abcdef12' } },
        { role: 'user', content: 'hi' },
    ];
    const sent = sandbox.prepareHistoryForAI(history);
    check('the template origin never reaches the model', !('templateOrigin' in sent[0]) && sent[0].content[0].text === 'x');
    check('stripping it leaves the saved history intact', history[0].templateOrigin.slug === 'a');
}

const boot = APP.slice(APP.indexOf('$(document).ready(async function(){'));
const at = (s) => boot.indexOf(s);
check('boot paints the templates row with the feed', at('window.initTemplates?.();') > at('initFeaturedFeed();') && at('initFeaturedFeed();') > 0);
check('boot captures a template link before the prompt link reads the handoff id',
    at('window.captureTemplateDeepLink?.();') > 0 && at('window.captureTemplateDeepLink?.();') < at('applyPromptDeepLink();'));
check('boot consumes a template link after auth and the composer handoff',
    at('window.consumeTemplateDeepLink?.();') > at('await consumeComposerHandoff();') && at('await consumeComposerHandoff();') > at('await initializeUser();'));
check('loadChat renders the "started from" note from the system message',
    /history\[0\]\.templateOrigin\) \{\s*window\.renderTemplateOriginNote\?\.\(history\[0\]\.templateOrigin\);/.test(APP));
check('the origin note is built from text, never HTML',
    /function renderTemplateOriginNote[\s\S]*?\n    }\n/.exec(TEMPLATES_SRC)[0].indexOf('.html(') === -1);
// A fork is saved from birth with only its system prompt: the checks that
// read "no user message yet" as "not a saved project" must know better.
check('a fork with no messages yet still saves (a publish before its first message persists)',
    APP.includes("if (!hasNonSystemMessages && !savedChats.some(c => c.id === context.currentChatId)) {"));
check('Back from a fork with no messages yet returns to the landing',
    APP.includes("} else if (currentChatId && (chatHistory.some(m => m.role !== 'system') || savedChats.some(c => c.id === currentChatId))) {"));
check('the feature flag exists', /^\s*templates: (true|false),/m.test(HELPERS));
check('the landing section is rendered only with the flag on, inside the feed layout',
    /if \(window\.FEATURE_FLAGS\?\.templates\) \{\s*h \+= `<section class="home-feed home-templates"/.test(UI));
check('the landing footer links the templates hub', UI.includes("{ href: '/templates/', label: 'Templates' }"));
check('the feed and the templates row share the landing layout switch',
    FEATURED.includes("$('#new-chat').toggleClass('has-feed', $('.home-feed:not([hidden])').length > 0);") &&
    !/\$\('#new-chat'\)\.(add|remove)Class\('has-feed'\)/.test(FEATURED) &&
    TEMPLATES_SRC.includes('window.syncHomeFeedLayout?.();'));
const scripts = (VITE.match(/const SCRIPTS = \[([\s\S]*?)\];/) || [])[1] || '';
const pos = (f) => scripts.indexOf(`'${f}'`);
check('vite bundles both halves, pure first, after what they build on',
    pos('js/template-core.js') > pos('js/worker-ownership.js') && pos('js/templates.js') > pos('js/featured.js') &&
    pos('js/templates.js') > pos('js/template-core.js') && pos('js/templates.js') < pos('js/app.js'));
check('vite registers the templates plugin', /plugins:\s*\[[^\]]*templatesPlugin\(\)/.test(VITE));
check('the plugin validates, then ships the index, the versioned files and the images',
    /closeBundle: \{[\s\S]*?buildTemplates\(\)[\s\S]*?'template-files', t\.meta\.slug, t\.version[\s\S]*?'template-thumbs'[\s\S]*?'templates\.json'/.test(VITE));
check('the template files are stable-path files to the service worker (fetched fresh)',
    !/IMMUTABLE_PATH_RE = [^\n]*template/.test(read('../src/sw.js')));

console.log(failures ? `\n${failures} check(s) failed` : '\nall template checks passed');
process.exit(failures ? 1 : 0);
