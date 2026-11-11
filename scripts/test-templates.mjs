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
//   3b. The AI's pick (UseTemplate, same VM): a template goes into the
//      project the user is already building, only while it has no files but
//      their attachments; its system message learns what a fork's knows, and
//      a failed copy takes back what it made and nothing else.
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
    const colon = one({ suggestions: [{ label: 'Brand', prompt: '  Match my brand:   ' }, { label: 'Plain', prompt: ' Add tags.  ' }] })[0].suggestions;
    check('a prompt the user finishes keeps one space after its colon; others are trimmed',
        colon[0].prompt === 'Match my brand: ' && colon[1].prompt === 'Add tags.');
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
    const sys = (origin) => [{ role: 'system', content: 'x', templateOrigin: origin }, { role: 'user', content: 'hi' }];
    check('originSlug: a fork reports the template it came from',
        core.originSlug(sys({ slug: 'feedback-board', name: 'Feedback board', version: 'abcdef12' })) === 'feedback-board');
    check('originSlug: a project started from scratch reports none',
        core.originSlug([{ role: 'system', content: 'x' }]) === '' && core.originSlug([]) === '' &&
        core.originSlug(null) === '' && core.originSlug('nope') === '');
    check('originSlug: only the system message counts',
        core.originSlug([{ role: 'user', content: 'x', templateOrigin: { slug: 'notes' } }]) === '');
    check('originSlug: a malformed origin reports none',
        core.originSlug(sys({ slug: 'Not A Slug' })) === '' && core.originSlug(sys({ slug: 42 })) === '' &&
        core.originSlug(sys('notes')) === '' && core.originSlug(sys(null)) === '');
}

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
    check('without instructions the note adds no template rules', !bare.includes('Rules for this'));
    const ruled = core.buildTemplateNote({ name: 'Notes', appDir, files: ['index.html'], workers: [], instructions: '- Keep the tags.' });
    check('a template\'s instructions end the note, marked as rules that outlast the user\'s changes',
        /Rules for this "Notes" project\. Keep following them through every change/.test(ruled) && ruled.endsWith('\n- Keep the tags.'));
    check('a fork\'s note (the user picked the template) leaves the replies alone', !/mention the template/.test(note));
    const picked = core.buildTemplateNote({ name: 'Notes', appDir, files: ['index.html'], workers: [], instructions: '- Keep the tags.', via: 'ai' });
    check('the AI\'s pick keeps the template out of the replies, but never hides it when asked, and its rules still end the note',
        /Don't mention the template in your replies\./.test(picked) &&
        /If the user asks whether the app came from a template, say it started from Builder's "Notes" template\./.test(picked) &&
        picked.endsWith('\n- Keep the tags.'));

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

// The list of templates a new project's first message carries (UseTemplate).
{
    const list = core.sanitizeIndex({ templates: [VALID, { ...VALID, slug: 'shop', name: 'Shop', category: '', description: 'A shop.' }] });
    const note = core.catalogNote(list);
    check('catalogNote: one line per template, slug first, with its category and sentence',
        note.includes('\n- notes: Notes (App). A notes app.\n') && note.includes('\n- shop: Shop. A shop.\n'));
    check('catalogNote: tells the model when to use one and when to build from scratch',
        /call UseTemplate with its slug before writing any files/.test(note) && /build the app yourself\./.test(note));
    check('catalogNote: the model never brings up templates itself, opening sentence included, but answers when asked',
        /don't bring up templates or a ready-made starting point yourself, in your opening sentence or anywhere else\./.test(note) &&
        /If the user asks about templates, answer honestly\./.test(note));
    check('catalogNote: no templates is no note', core.catalogNote([]) === '' && core.catalogNote(null) === '');
    check('catalogNote: an entry with a bad slug or no name is left out',
        !core.catalogNote([{ slug: '../x', name: 'X' }, { slug: 'y', name: '' }]));
    check('isCatalogNote: recognises the note and nothing else',
        core.isCatalogNote(note) && !core.isCatalogNote('[The user attached 1 file]') && !core.isCatalogNote(null));
    check('entriesInTheWay: the user\'s attachments are not in the way, anything else is',
        core.entriesInTheWay(['assets']).length === 0 && core.entriesInTheWay([]).length === 0 &&
        core.entriesInTheWay(['assets', 'index.html']).join() === 'index.html' && core.entriesInTheWay(['.puter']).join() === '.puter');
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
    make('unterminated', { 'index.html': "fetch('{{WORKER_URL:api}/ideas')", 'workers/api.js': '' });
    check('an unterminated placeholder fails on its own', /malformed/.test(errorsFor(meta('unterminated', { workers: ['api'] }))));
    make('binary', { 'index.html': '', 'app.tsx': "const API = '{{WORKER_URL:api}}';", 'workers/api.js': '' });
    check('a placeholder in a file the fork copies unchanged fails',
        /app\.tsx uses \{\{WORKER_URL:\.\.\.\}\}, but a fork only rewrites text files/.test(errorsFor(meta('binary', { workers: ['api'] }))));
    let shapeErr = '';
    try { buildTemplates({ templates: [meta('good', { workers: ['api'], suggestions: 'x' })], dir: tmp }); } catch (e) { shapeErr = e.message; }
    check('bad metadata is reported, not hidden by a TypeError building the index',
        /needs at least one suggestion/.test(shapeErr) && !/is not a function/.test(shapeErr), shapeErr);
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
// needs the DOM; the dialog only needs not to throw.
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
    const log = { alerts: [], toasts: [], tracked: [], loads: [], versions: [], previews: [], named: [], loading: 0, hid: 0, fetches: [], published: [], dom: [] };
    const extraFiles = new Map(); // url -> text, for synthetic templates
    for (const x of (opts.extra || [])) for (const [p, text] of Object.entries(x.files)) extraFiles.set(`/template-files/${x.entry.slug}/${x.entry.version}/${p}`, text);
    const index = fixtureIndex(opts.extra);
    let listCalls = 0;

    const ctx = {
        console: { warn() {}, error() {}, log() {} },
        URL, URLSearchParams, Response, Blob, JSON, Math, Date, Promise, Set, Map, Array, Object, String, RegExp, Error,
        setTimeout, clearTimeout,
        requestAnimationFrame: (fn) => setTimeout(fn, 0),
        document: { createTextNode: (text) => ({ text }) },
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
            if (/^https:\/\/[^/]+\.puter\.site\//.test(url)) {
                log.siteChecks = (log.siteChecks || 0) + 1;
                return new Response('<!doctype html>', { status: 200 });
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
            log.loads.push([id, o && o.urlMode, o && o.preloaded]);
            ctx.currentChatId = id;
            const chat = JSON.parse(files.get(`chat-history/${id}.json`));
            ctx.currentPreviewUrl = chat.previewUrl;
            return chat;
        },
        readUrlChatId: () => opts.urlChatId || null,
        buildFeaturedPlaceholder: () => chain,
        $: (what) => { if (typeof what === 'string') log.dom.push(what); return chain; },
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
                // A directory exists while a file is under it, as on Puter
                // once the first write has made it.
                readdir: async (p) => {
                    if (opts.readdirFails) throw new Error('network down');
                    const names = new Set();
                    for (const k of files.keys()) if (k.startsWith(p + '/')) names.add(k.slice(p.length + 1).split('/')[0]);
                    if (!names.size) throw Object.assign(new Error('not found'), { code: 'subject_does_not_exist' });
                    return [...names].map((name) => ({ name }));
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
        FEATURE_FLAGS: { templates: opts.flagOff ? false : true, aiTemplates: opts.aiFlagOff ? false : true },
        // What UseTemplate reaches for from the turn (tools.js, app.js) and
        // the publish_site tool it opens the preview with.
        projectRootDir: (state) => (state && state.appDir) || null,
        isNotFoundError: (e) => !!(e && e.code === 'subject_does_not_exist'),
        isAborted: (c) => !!(c && c.signal && c.signal.aborted),
        isStaleTurn: (state) => !!(state && state.stale),
        // Hosts a held preview without showing it, as the real one does
        // (scripts/test-publish-site-reuse.mjs).
        tools: [{
            function: { name: 'publish_site' },
            exec: async (args, state) => {
                log.published.push(args.path);
                if (opts.failPublish) throw new Error('hosting failed');
                const url = 'https://preview-0000.puter.site/';
                const held = ctx.heldPreviewFor(state && state.currentChatId);
                if (held) Object.assign(held, { url, path: args.path });
                else ctx.showAppPreview(url, { waitForReady: true });
                return { success: true, url };
            },
        }],
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
        maybeAutoNameProject: (state) => log.named.push(state && state.currentChatId),
        createProjectVersion: (o) => { log.versions.push(o); return Promise.resolve(); },
        BuilderHandoff: { take: async (id) => (opts.handoff && opts.handoff[id]) || null },
    };
    ctx.window = ctx;
    vm.createContext(ctx);
    vm.runInContext(CORE_SRC + '\n' + OWNERSHIP_SRC + '\n' + TEMPLATES_SRC, ctx);
    const appDir = `${appParent}/chat_new`;
    for (const [p, data] of Object.entries(opts.existing || {})) files.set(`${appDir}/${p}`, data);
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
        const id = await env.ctx.forkTemplate('landing-page', { source: 'page' });
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
        check('fork: opens with the template\'s suggestion chips, marked as the template\'s',
            JSON.stringify(chat.suggestions) ===
            JSON.stringify(core.sanitizeIndex(JSON.parse(JSON.stringify(built.index))).find((x) => x.slug === 'landing-page').suggestions
                .map((s) => ({ ...s, from: 'template' }))) &&
            chat.suggestions.length === entry('landing-page').suggestions.length);
        check('fork: starts unpublished and not interrupted',
            chat.publishedUrl === null && chat.publishedPath === null && chat.interrupted === false &&
            chat.previewUrl === 'https://preview-0000.puter.site/' && chat.previewPath === env.appDir);
        check('fork: listed first in the sidebar and the index saved',
            env.ctx.savedChats[0].id === 'chat_new' && env.ctx.savedChats[0].title === 'Product Landing Page 2' && env.log.listSaves >= 1);
        check('fork: opened once the new site answers, without the edit-propagation wait',
            env.log.loads.length === 1 && env.log.loads[0][0] === 'chat_new' && env.log.loads[0][1] === 'push' &&
            env.log.siteChecks >= 1 && env.log.previews.length === 0);
        check('fork: opened from the chat it saved, not a read of the file back',
            JSON.stringify(env.log.loads[0][2]) === JSON.stringify(chat));
        check('fork: a restore point of the template as it arrived',
            env.log.versions.length === 1 && env.log.versions[0].chatId === 'chat_new' && env.log.versions[0].appDir === env.appDir);
        check('fork: counted, and nothing alarming shown',
            env.log.tracked.some(([e, p]) => e === 'Template Used' && p.template === 'landing-page' && p.source === 'page') &&
            !env.log.tracked.some(([e]) => e === 'Template Use Failed') &&
            env.log.alerts.length === 0);
        check('fork: a template without instructions adds no template rules', !blocks[2].text.includes('Rules for this'));
    }

    // --- A template with instructions -----------------------------------------
    // template.js -> the built index -> sanitizeIndex -> forkTemplate -> the
    // fork's system prompt, end to end.
    {
        const withRules = TEMPLATES.find((m) => m.instructions);
        check('fork: at least one registered template ships instructions', !!withRules);
        if (withRules) {
            const env = makeEnv();
            await env.ctx.forkTemplate(withRules.slug);
            const note = env.chatFile().history[0].content[2].text;
            check('fork: a template\'s instructions reach the fork\'s system prompt, as its rules',
                note.includes(`Rules for this "${withRules.name}" project.`) && note.endsWith('\n' + withRules.instructions.trim()));
        }
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
    // The Template Use Failed events a fork sent, as "slug/source/stage".
    const failedAt = (env) => env.log.tracked.filter(([e]) => e === 'Template Use Failed').map(([, p]) => `${p.template}/${p.source}/${p.stage}`);
    {
        const env = makeEnv({ failCreate: () => true });
        const id = await env.ctx.forkTemplate('feedback-board', { source: 'page' });
        check('a backend that will not deploy: no project is made', id === null && nothingLeft(env));
        check('a backend that will not deploy: reported once, at the backend step',
            JSON.stringify(failedAt(env)) === JSON.stringify(['feedback-board/page/backend']) &&
            !env.log.tracked.some(([e]) => e === 'Template Used'));
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
        check('a worker list that fails: reported at the backend step', JSON.stringify(failedAt(env)) === JSON.stringify(['feedback-board/app/backend']));
    }
    {
        const env = makeEnv({ failFetch: (url) => url.endsWith('/app.js') });
        await env.ctx.forkTemplate('feedback-board');
        check('a file that will not download: nothing is written or deployed at all',
            nothingLeft(env) && env.files.size === 0 && env.listCalls() === 0 && env.log.alerts.length === 1);
        check('a file that will not download: reported at the download step', JSON.stringify(failedAt(env)) === JSON.stringify(['feedback-board/app/download']));
    }
    {
        const env = makeEnv({ failWrite: (p) => p.endsWith('/index.html') });
        await env.ctx.forkTemplate('feedback-board');
        await flush(); await flush();
        check('a write that fails: the backend and every file already written are removed',
            nothingLeft(env) && env.deletedWorkers.length === 1 && (env.log.deleted || []).includes(env.appDir));
        check('a write that fails: reported at the files step', JSON.stringify(failedAt(env)) === JSON.stringify(['feedback-board/app/files']));
    }
    {
        const env = makeEnv({ failWrite: (p) => p.startsWith('chat-history/') });
        const id = await env.ctx.forkTemplate('feedback-board');
        await flush(); await flush();
        check('a project that cannot be saved: nothing is left behind',
            id === null && nothingLeft(env) && env.deletedWorkers.length === 1 && env.log.alerts.length === 1);
        check('a project that cannot be saved: reported at the save step', JSON.stringify(failedAt(env)) === JSON.stringify(['feedback-board/app/save']));
    }
    {
        const env = makeEnv();
        env.ctx.system_prompt_common = () => { throw new Error('prompt failed'); };
        await env.ctx.forkTemplate('feedback-board');
        check('a project that fails while being put together: reported at the save step', JSON.stringify(failedAt(env)) === JSON.stringify(['feedback-board/app/save']));
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
        check('an unknown backend placeholder: reported at the download step', JSON.stringify(failedAt(env)) === JSON.stringify(['sneaky/app/download']));
    }
    {
        const env = makeEnv({ failHosting: true });
        await env.ctx.forkTemplate('landing-page');
        const chat = env.chatFile();
        check('a preview that cannot be created: the project is still made, without one',
            !!chat && chat.previewUrl === null && chat.previewPath === null && env.log.loads.length === 1 && env.log.previews.length === 0);
        check('a preview that cannot be created: the note does not claim one', !chat.history[0].content[2].text.includes('publish_site'));
        check('a preview that cannot be created: counted as used, not failed',
            failedAt(env).length === 0 && env.log.tracked.some(([e]) => e === 'Template Used'));
    }
    {
        const env = makeEnv({ signedOut: true, signInDismissed: true });
        const id = await env.ctx.forkTemplate('landing-page');
        check('a dismissed sign-in: nothing happens and nothing is reported as an error',
            id === null && env.files.size === 0 && env.log.alerts.length === 0 && env.log.fetches.length === 0 && env.log.tracked.length === 0);
    }
    {
        const env = makeEnv({ signedOut: true });
        await env.ctx.forkTemplate('landing-page');
        check('a signed-out visitor who signs in gets the project', !!env.chatFile() && env.log.loads.length === 1);
    }
    {
        const env = makeEnv({ confirmLeave: false });
        const id = await env.ctx.forkTemplate('landing-page');
        check('declining to leave a running build: nothing happens', id === null && env.files.size === 0 && failedAt(env).length === 0);
    }
    {
        const env = makeEnv();
        const id = await env.ctx.forkTemplate('no-such-template');
        check('an unknown template: a toast, and nothing is written', id === null && env.files.size === 0 && env.log.toasts.length === 1);
        check('an unknown template: reported as unavailable', JSON.stringify(failedAt(env)) === JSON.stringify(['no-such-template/app/unavailable']));
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
    // 3b. The AI's pick: UseTemplate copies a template into the open project
    // =========================================================================
    const turn = (env, patch = {}) => ({
        currentChatId: 'chat_open',
        appDir: env.appDir,
        abortController: new AbortController(),
        chatHistory: [
            { role: 'system', content: [
                { type: 'text', text: 'COMMON', cache_control: { type: 'ephemeral', ttl: '1h' } },
                { type: 'text', text: 'WORKDIR ' + env.appDir },
            ] },
            { role: 'user', content: 'Build a landing page for my app' },
        ],
        ...patch,
    });
    const refusal = async (p) => { try { await p; return null; } catch (e) { return e.message; } };
    {
        const env = makeEnv();
        const state = turn(env);
        const out = await env.ctx.useTemplate('landing-page', state);
        const t = tpl('landing-page');
        const sys = state.chatHistory[0];
        check('UseTemplate: every template file lands in the project the user is building, byte for byte',
            t.files.every((f) => env.files.get(`${env.appDir}/${f.path}`) === f.bytes.toString('utf8')) &&
            env.underApp().length === t.files.length);
        check('UseTemplate: no new project is made, and the open one is not reloaded',
            !env.chatFile() && env.ctx.savedChats.length === 0 && env.log.loads.length === 0 && env.log.loading === 0);
        check('UseTemplate: the preview is hosted through publish_site, on the project directory',
            env.log.published.length === 1 && env.log.published[0] === env.appDir && out.preview_url === 'https://preview-0000.puter.site/');
        const held = env.ctx.heldPreviewFor('chat_open');
        check('UseTemplate: the preview is held back, not shown, and the project is not named yet',
            env.log.previews.length === 0 && env.log.named.length === 0 &&
            held && held.url === 'https://preview-0000.puter.site/' && held.path === env.appDir);
        check('UseTemplate: the result says the user sees the preview once update_preview runs',
            /once you call update_preview after your changes/.test(out.note));
        env.ctx.revealHeldPreview(state);
        check('revealHeldPreview: shows the held preview once it is ready, on its directory, and names the project',
            env.log.previews.length === 1 && env.log.previews[0][0] === 'https://preview-0000.puter.site/' &&
            env.log.previews[0][1].waitForReady === true && env.ctx.currentPreviewPath === env.appDir &&
            env.log.named.length === 1 && env.log.named[0] === 'chat_open');
        env.ctx.revealHeldPreview(state);
        check('revealHeldPreview: only once', env.log.previews.length === 1 && env.log.named.length === 1 && env.ctx.heldPreviewFor('chat_open') === null);
        check('UseTemplate: the system message gains a fork\'s note after its two blocks, which are untouched',
            sys.content.length === 3 && sys.content[0].text === 'COMMON' && sys.content[0].cache_control.ttl === '1h' &&
            sys.content[1].text === 'WORKDIR ' + env.appDir && /Product Landing Page/.test(sys.content[2].text) &&
            sys.content[2].text.includes('do not call publish_site') && /Don't mention the template in your replies/.test(sys.content[2].text));
        check('UseTemplate: the origin is recorded, marked as the AI\'s choice',
            sys.templateOrigin.slug === 'landing-page' && sys.templateOrigin.version === t.version && sys.templateOrigin.via === 'ai' &&
            core.originSlug(state.chatHistory) === 'landing-page');
        check('UseTemplate: the conversation after the system message is left as it was',
            state.chatHistory.length === 2 && state.chatHistory[1].content === 'Build a landing page for my app');
        check('UseTemplate: the result lists the files and tells the model to edit on top of the template',
            out.success === true && out.template.slug === 'landing-page' &&
            out.files.includes('index.html') && /do not call publish_site/.test(out.note) && /edit or multi_edit/.test(out.note) &&
            !('workers' in out) && !('rules' in out));
        check('UseTemplate: the closing reply describes the whole app, placeholders included, and leaves the template out',
            /describe the app as a whole/.test(out.note) && /placeholder text or sample data/.test(out.note) &&
            /Don't mention the template unless the user asks about it\./.test(out.note) && !/started from/.test(out.note));
        check('UseTemplate: counted as used by the AI',
            env.log.tracked.some(([e, p]) => e === 'Template Used' && p.template === 'landing-page' && p.source === 'ai'));
        check('UseTemplate: no note about the template is added to the conversation',
            !env.log.dom.includes('<div class="template-origin" role="note"></div>') && !env.log.dom.includes('.chat-box'));
    }
    {
        const env = makeEnv();
        const state = turn(env);
        env.ctx.tools[0].exec = async () => { state.stale = true; return { success: true, url: 'https://preview-0000.puter.site/' }; };
        const out = await env.ctx.useTemplate('landing-page', state);
        check('UseTemplate: a turn the user left mid-copy still gets its project',
            out.success && state.chatHistory[0].templateOrigin.via === 'ai');
    }
    {
        const env = makeEnv();
        const state = turn(env);
        await env.ctx.useTemplate('landing-page', state);
        state.stale = true;
        env.ctx.revealHeldPreview(state);
        check('revealHeldPreview: a turn the user has left shows nothing in the open project, and lets go of the hold',
            env.log.previews.length === 0 && env.log.named.length === 0 && env.ctx.heldPreviewFor('chat_open') === null);
    }
    {
        const env = makeEnv();
        env.ctx.revealHeldPreview({ currentChatId: 'chat_open' });
        check('revealHeldPreview: a turn with nothing held does nothing', env.log.previews.length === 0 && env.log.named.length === 0);
    }
    {
        const env = makeEnv({ existing: { 'assets/logo.png': 'PNG' } });
        const out = await env.ctx.useTemplate('landing-page', turn(env));
        check('UseTemplate: a project holding only the user\'s attachments can start from a template, and keeps them',
            out.success && env.files.get(`${env.appDir}/assets/logo.png`) === 'PNG');
    }
    {
        const env = makeEnv({ existing: { 'index.html': '<h1>mine</h1>' } });
        const state = turn(env);
        const msg = await refusal(env.ctx.useTemplate('landing-page', state));
        check('UseTemplate: a project with files of its own is refused, and nothing is touched',
            /already has files/.test(msg || '') && env.underApp().length === 1 && env.files.get(`${env.appDir}/index.html`) === '<h1>mine</h1>' &&
            env.log.published.length === 0 && state.chatHistory[0].content.length === 2);
    }
    {
        const env = makeEnv();
        const state = turn(env);
        state.chatHistory[0].templateOrigin = { slug: 'ai-chat', name: 'AI Chat App', version: 'abcdef12' };
        const msg = await refusal(env.ctx.useTemplate('landing-page', state));
        check('UseTemplate: a project that already came from a template is refused', /already started from a template/.test(msg || '') && env.files.size === 0);
    }
    {
        const env = makeEnv();
        const msg = await refusal(env.ctx.useTemplate('no-such-template', turn(env)));
        check('UseTemplate: an unknown slug is refused with a way forward', /There is no template "no-such-template"/.test(msg || '') && env.files.size === 0);
    }
    {
        const env = makeEnv({ readdirFails: true });
        const msg = await refusal(env.ctx.useTemplate('landing-page', turn(env)));
        check('UseTemplate: a project whose files cannot be checked is refused, not overwritten', /Couldn't check/.test(msg || '') && env.files.size === 0);
    }
    {
        const env = makeEnv();
        const state = turn(env);
        state.abortController.abort();
        const msg = await refusal(env.ctx.useTemplate('landing-page', state));
        check('UseTemplate: a stopped turn copies nothing', msg === 'Aborted' && env.files.size === 0);
    }
    {
        const env = makeEnv();
        const state = turn(env);
        const out = await env.ctx.useTemplate('feedback-board', state);
        const [worker] = [...env.deployed.values()];
        const appJs = env.files.get(`${env.appDir}/app.js`) || '';
        check('UseTemplate: a backend is deployed under a fresh name the project owns',
            env.deployed.size === 1 && /^feedback-board-api-[a-z0-9]{1,6}$/.test(worker.name) &&
            WO.ownedWorkers([...env.deployed.values()], env.appDir).length === 1);
        check('UseTemplate: the frontend calls the project\'s own worker', appJs.includes(`https://${worker.name}.puter.work`) && !appJs.includes('{{WORKER_URL'));
        check('UseTemplate: the result and the note give the renamed source and its URL',
            out.files.includes(`workers/${worker.name}.js`) && !out.files.includes('workers/api.js') &&
            out.workers.length === 1 && out.workers[0].name === worker.name && out.workers[0].url === `https://${worker.name}.puter.work` &&
            out.workers[0].file_path === `${env.appDir}/workers/${worker.name}.js` &&
            state.chatHistory[0].content[2].text.includes(`Source ${env.appDir}/workers/${worker.name}.js`));
    }
    {
        const withRules = TEMPLATES.find((m) => m.instructions);
        if (withRules) {
            const env = makeEnv();
            const state = turn(env);
            const out = await env.ctx.useTemplate(withRules.slug, state);
            check('UseTemplate: a template\'s rules reach the result and stay in the system message',
                out.rules === withRules.instructions.trim() && /Keep following the rules above/.test(out.note) &&
                state.chatHistory[0].content[2].text.endsWith('\n' + withRules.instructions.trim()));
        }
    }
    {
        const env = makeEnv({ existing: { 'assets/logo.png': 'PNG' }, failWrite: (p) => p.endsWith('/index.html') });
        const state = turn(env);
        const msg = await refusal(env.ctx.useTemplate('feedback-board', state));
        await flush(); await flush();
        check('UseTemplate: a copy that fails removes its backend and its files, and says none of it was kept',
            /none of it was kept/.test(msg || '') && env.deployed.size === 0 && env.deletedWorkers.length === 1 &&
            env.underApp().join() === `${env.appDir}/assets/logo.png`);
        check('UseTemplate: a failed copy never deletes the project directory (the attachments live there)',
            !(env.log.deleted || []).includes(env.appDir));
        check('UseTemplate: a failed copy leaves the system message and the preview alone, and is reported from the AI',
            state.chatHistory[0].content.length === 2 && !state.chatHistory[0].templateOrigin && env.log.published.length === 0 &&
            JSON.stringify(failedAt(env)) === JSON.stringify(['feedback-board/ai/files']));
    }
    {
        const env = makeEnv({ failPublish: true });
        const state = turn(env);
        const out = await env.ctx.useTemplate('landing-page', state);
        check('UseTemplate: a preview that will not open keeps the copy and asks the model to open one',
            out.success && !('preview_url' in out) && /call publish_site once/.test(out.note) &&
            !state.chatHistory[0].content[2].text.includes('publish_site'));
        check('UseTemplate: a preview that will not open is not held, so the model\'s publish_site shows it at once',
            env.ctx.heldPreviewFor('chat_open') === null);
    }
    {
        const env = makeEnv({ aiFlagOff: true });
        const msg = await refusal(env.ctx.useTemplate('landing-page', turn(env)));
        check('UseTemplate: flag off, nothing is copied', /not available/.test(msg || '') && env.files.size === 0);
        check('UseTemplate: flag off, no list of templates and no index fetch',
            (await env.ctx.templateCatalogNote()) === '' && env.log.fetches.length === 0);
    }
    {
        const env = makeEnv();
        const note = await env.ctx.templateCatalogNote();
        check('the list of templates names every template in the index',
            core.isCatalogNote(note) && built.index.templates.every((t) => note.includes(`\n- ${t.slug}: ${t.name}`)));
        const offline = makeEnv({ indexFails: true });
        check('no index, no list (the project is built from scratch)', (await offline.ctx.templateCatalogNote()) === '');
        const slow = makeEnv();
        slow.ctx.fetch = () => new Promise(() => {});
        check('an index that does not arrive in time does not hold up the message', (await slow.ctx.templateCatalogNote({ timeout: 20 })) === '');
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
        check('deep link: a template that no longer exists gets a toast', env.log.toasts.length === 1 && env.files.size === 0);
        check('deep link: a template that no longer exists is reported as unavailable',
            JSON.stringify(failedAt(env)) === JSON.stringify(['gone-now/link/unavailable']) && env.log.tracked.length === 1);
    }
    {
        const env = makeEnv({ search: `?template=gone-now&handoff=${HID}`, handoff: { [HID]: { template: 'gone-now', prompt: '', files: [] } } });
        env.ctx.captureTemplateDeepLink();
        await env.ctx.consumeTemplateDeepLink();
        check('deep link: a hand-over for a template that no longer exists is reported from the page',
            JSON.stringify(failedAt(env)) === JSON.stringify(['gone-now/page/unavailable']));
    }
    {
        const env = makeEnv({ search: '?template=feedback-board', flagOff: true });
        env.ctx.captureTemplateDeepLink();
        await env.ctx.consumeTemplateDeepLink();
        check('flag off: links and the index fetch are inert',
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
        extract(HELPERS, 'function prepareHistoryForAI(historyArray, modelId, opts) {'),
        extract(HELPERS, 'function dropDuplicateToolResults(messages) {'),
        ...HELPERS.match(/^const (RETIRED_SUGGEST_\w+|OPTIONAL_OPENING_RULE|OPENING_LINE_\w+|OLD_PUBLISH_RULE|PUBLISH_TOOLS_\w+) = .*$/gm),
        extract(HELPERS, 'function retireSuggestNextSteps(messages) {'),
        extract(HELPERS, 'function noteOnOldPrompt(messages, oldText, note, newText) {'),
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

// Analytics: a project's events carry the template it was copied from.
{
    const a = HELPERS.indexOf('function templateProp(history) {');
    const b = HELPERS.indexOf('\n}\n', HELPERS.indexOf('function templatePropFor(slug) {'));
    const fn = (win) => new Function('window', HELPERS.slice(a, b + 2) + '\nreturn templateProp;')(win);
    const win = {};
    new Function('window', CORE_SRC)(win);
    const fork = [{ role: 'system', content: 'x', templateOrigin: { slug: 'feedback-board', name: 'Feedback board', version: 'abcdef12' } }];
    check('templateProp: a fork\'s events name its template',
        JSON.stringify(fn(win)(fork)) === JSON.stringify({ from_template: true, template: 'feedback-board' }));
    const scratch = JSON.stringify({ from_template: false });
    check('templateProp: a project from scratch says so, with no template',
        JSON.stringify(fn(win)([{ role: 'system', content: 'x' }])) === scratch && JSON.stringify(fn(win)(null)) === scratch);
    check('templateProp: without TemplateCore it says from scratch rather than throwing',
        JSON.stringify(fn({})(fork)) === scratch);

    const send = APP.slice(APP.indexOf('async function sendChatMessage('));
    check('a turn reads its project\'s template once, from the history it saves to',
        send.includes('const turnTemplate = templateProp(turnSaveContext.chatHistory);'));
    check('Project Created and Build Started carry the template',
        /if \(isFirstBuildTurn\) window\.track\?\.\('Project Created', \{[^\n]*\.\.\.turnTemplate \}\);/.test(send) &&
        /window\.track\?\.\('Build Started', \{[^\n]*\.\.\.turnTemplate \}\);/.test(send));
    check('Build Completed carries the template', /'Build Completed',[\s\S]{0,500}compacted: turnStats\.compactions > 0, \.\.\.turnTemplate \}/.test(send));
    check('Build Abandoned learns the template from the build it reports',
        send.includes('_activeBuild = { turnSeq, startedAt: turnStartedAt, firstBuild: isFirstBuildTurn, template: turnTemplate.template };'));
    check('every limit hit passes the template on to Upgrade After Limit',
        (send.match(/recordUsageLimitHit\('(credits|tier)', turnTemplate\.template\);/g) || []).length === 3);
    check('Project Published carries the template of the project it published', UI.includes('...templateProp(startHistory),'));
    check('Project Downloaded carries the template, read before the download',
        /const template = templateProp\(chatHistory\);\s*await downloadProject\([^\n]*\n\s*window\.track\?\.\('Project Downloaded', template\);/.test(UI));
    check('a template\'s own chips are marked when drawn',
        APP.includes("if (s.from === 'template') $chip.attr('data-from', 'template');"));
    check('Suggestion Clicked says where the chip came from, once per choice',
        /'\.chat-suggestion-chip', function\(\) \{\s*if \(!\$\(this\)\.hasClass\('selected'\)\) \{\s*window\.track\?\.\('Suggestion Clicked', \{\s*from: \$\(this\)\.attr\('data-from'\) === 'template' \? 'template' : 'ai',\s*\.\.\.templateProp\(chatHistory\),/.test(UI));
}

const boot = APP.slice(APP.indexOf('$(document).ready(async function(){'));
const at = (s) => boot.indexOf(s);
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
check('the landing has no templates section', !UI.includes('home-templates') && !APP.includes('initTemplates'));
check('the landing footer links the templates hub', UI.includes("{ href: '/templates/', label: 'Templates' }"));
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

// The AI's pick (UseTemplate).
{
    const TOOL_SRC = read('../src/tools/apps_and_sites/use_template.js');
    const win = { tools: [], FEATURE_FLAGS: { templates: true, aiTemplates: true } };
    new Function('window', TOOL_SRC)(win);
    const tool = win.tools[0];
    check('UseTemplate registers once, with a simple, non-strict input',
        win.tools.length === 1 && tool.function.name === 'UseTemplate' && tool.function.strict === false &&
        JSON.stringify(tool.function.parameters.required) === '["slug"]');
    check('UseTemplate is offered only while both flags are on',
        tool.available() === true &&
        (win.FEATURE_FLAGS.aiTemplates = false, tool.available() === false) &&
        (win.FEATURE_FLAGS = { templates: false, aiTemplates: true }, tool.available() === false));
    check('UseTemplate\'s description says not to tell the user, opening sentence included',
        /Don't tell the user you are starting from a template, in your opening sentence or anywhere else, unless they ask\./.test(tool.function.description));
    check('UseTemplate\'s description names no template, so the cached tool prefix stays the same for every project',
        !TEMPLATES.some((t) => tool.function.description.includes(t.slug)));
    check('the aiTemplates flag exists', /^\s*aiTemplates: (true|false),/m.test(HELPERS));
    check('vite bundles the tool after the templates module it calls',
        pos('tools/apps_and_sites/use_template.js') > pos('js/templates.js'));
    check('UseTemplate counts as a change to the project (a version, the Code view follows)',
        /MUTATING_TOOLS = new Set\(\[[^\]]*'UseTemplate'/.test(read('../src/js/versions.js')));
    check('UseTemplate has a status line while it runs',
        /UseTemplate: 'Setting up the project',/.test(read('../src/js/handleMessageStream.js')));

    const send = APP.slice(APP.indexOf('async function sendChatMessage('));
    check('only a new project\'s first message carries the list, as a hidden part, and not in a template\'s copy',
        /if \(countUserMessages\(turnSaveContext\.chatHistory\) === 0 && !turnTemplate\.from_template\) \{\s*const catalog = await window\.templateCatalogNote\?\.\(\);\s*if \(turnAbandoned\(\)\) throw abandonedError\(\);\s*if \(catalog\) contentParts\.push\(\{ type: 'text-hidden', text: catalog \}\);/.test(send));
    check('the list goes in before the message is added to the history',
        send.indexOf('window.templateCatalogNote?.()') < send.indexOf('turnSaveContext.chatHistory.push({ role: "user", content: messageContent, messageId });'));
    check('the suggestion and naming transcripts leave the list out',
        /p\.type === 'text-hidden' && window\.TemplateCore\?\.isCatalogNote\(p\.text\) \? null/.test(APP));
    check('the end of a turn shows a held preview before its snapshot and save, unless a newer turn has the chat',
        /if \(!supersededSameChat\) window\.revealHeldPreview\?\.\(turnSaveContext\);/.test(send) &&
        send.indexOf('window.revealHeldPreview?.(turnSaveContext)') < send.indexOf('window.createProjectVersion?.(') &&
        send.indexOf('window.revealHeldPreview?.(turnSaveContext)') < send.indexOf('if (!supersededSameChat) scheduleSaveCurrentChat(turnSaveContext);'));
    check('update_preview shows a held preview before it verifies the app',
        /window\.revealHeldPreview\?\.\(state\);[\s\S]*?window\.verifyPreview\(state\)/.test(read('../src/tools/apps_and_sites/update_preview.js')));
    check('saving the open chat records a held preview\'s address and directory',
        /const held = window\.heldPreviewFor\?\.\(chatId\);\s*previewUrl = window\.currentPreviewUrl \|\| \(held && held\.url\) \|\| null;[\s\S]{0,250}previewPath = window\.currentPreviewPath \|\| \(held && held\.path\) \|\| null;/.test(APP));
    check('loadChat draws no note from UseTemplate\'s result',
        !APP.includes('__template_used') && !APP.includes('renderTemplateUsedNote'));
    check('the AI\'s pick gets no "started from" note above the conversation',
        /function renderTemplateOriginNote\(origin\) \{[\s\S]{0,200}if \(origin\?\.via === 'ai'\) return;/.test(TEMPLATES_SRC));
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall template checks passed');
process.exit(failures ? 1 : 0);
