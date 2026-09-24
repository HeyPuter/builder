import fs from 'node:fs';
import { COMPOSER_SCRIPT, PUTER_JS_SRC, FILE_ICON_URL } from './build-seo.mjs';

// ---- Regression guard for the marketing-page composer handoff ---------------
// The hero composer on the AI app builder / AI website builder pages behaves
// like the app's own chat box: type, attach files, press send, and the build
// starts. Three pieces carry that across a full page navigation:
//   * src/js/handoff.js — window.BuilderHandoff, an IndexedDB store the
//     marketing page writes the send (text + files) into under a fresh id,
//     and the app reads it out of by that id. Shared by both sides
//     byte-for-byte (bundled into the app, inlined into the pages) so the
//     store cannot drift.
//   * COMPOSER_SCRIPT (scripts/build-seo.mjs) — the page side: sign the
//     visitor in inside their click (the only place a popup may open), park
//     the send, navigate to /?prompt=…&handoff=<id>.
//   * applyPromptDeepLink + consumeComposerHandoff (src/js/app.js) — the app
//     side: read the id, take its record, stage the files through the drop
//     intake, put the text in the box, send. No record, no send: that is what
//     keeps an outside link from starting a build (storage is same-origin, so
//     only our page can have written one).
// This test:
//   * evaluates the REAL handoff helper against an in-memory IndexedDB and
//     drives stash/take through single consumption, unknown ids, two sends
//     side by side, staleness, the sweep and the no-storage failure,
//   * evaluates the REAL composer script against a small fake DOM and drives
//     the attach/paste/dedup/remove tray, Enter, and every submit outcome
//     (signed in, signs in, dismisses, popup blocked, storage failed, no
//     puter.js), asserting sign-in precedes the stash and where it navigates,
//   * text-asserts the app-side integration points and the build wiring.
// Mirrors scripts/test-composer-drafts.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}
const flush = () => new Promise((r) => setImmediate(r));

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const HANDOFF = read('../src/js/handoff.js');
const APP = read('../src/js/app.js');
const DRAGDROP = read('../src/js/dragdrop.js');
const VITE = read('../vite.config.js');
const BUILD = read('./build-seo.mjs');

// =============================================================================
// 1. The handoff helper against an in-memory IndexedDB
// =============================================================================

// Just enough of the IndexedDB API for handoff.js: open with upgrade, one
// object store, put/get/delete/getAll inside a transaction whose requests
// settle in order in a microtask (each firing its own onsuccess, which may
// queue more requests into the same transaction, as the sweep does), and the
// completion/error callbacks the helper listens to.
function fakeIndexedDB() {
    const dbs = new Map();
    const request = () => ({ result: undefined, error: null, onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null });
    return {
        open(name, version) {
            const req = request();
            queueMicrotask(() => {
                let db = dbs.get(name);
                const fresh = !db;
                if (fresh) { db = { version, stores: new Map() }; dbs.set(name, db); }
                const conn = {
                    closed: 0,
                    objectStoreNames: { contains: (n) => db.stores.has(n) },
                    createObjectStore(n) { db.stores.set(n, new Map()); },
                    close() { conn.closed++; },
                    transaction(storeName, mode) {
                        const ops = [];
                        const tx = { oncomplete: null, onerror: null, onabort: null, error: null };
                        const table = () => db.stores.get(storeName);
                        const store = {
                            put(value, key) {
                                const r = request();
                                ops.push(() => {
                                    if (mode !== 'readwrite') throw new Error('read only');
                                    table().set(key, value); r.result = key;
                                });
                                return r;
                            },
                            get(key) { const r = request(); ops.push(() => { r.result = table().get(key); r.onsuccess?.(); }); return r; },
                            getAll() { const r = request(); ops.push(() => { r.result = [...table().values()]; r.onsuccess?.(); }); return r; },
                            delete(key) { const r = request(); ops.push(() => { table().delete(key); r.onsuccess?.(); }); return r; },
                        };
                        tx.objectStore = () => store;
                        queueMicrotask(() => {
                            try { for (let i = 0; i < ops.length; i++) ops[i](); tx.oncomplete?.(); }
                            catch (e) { tx.error = e; tx.onerror?.(); }
                        });
                        return tx;
                    },
                };
                req.result = conn;
                if (fresh) req.onupgradeneeded?.();
                req.onsuccess?.();
            });
            return req;
        },
        _dbs: dbs,
    };
}

function loadHandoff(win) {
    new Function('window', HANDOFF)(win);
    return win.BuilderHandoff;
}

const fileA = new File(['aaa'], 'a.png', { type: 'image/png' });
const fileB = new File(['bbbb'], 'b.pdf', { type: 'application/pdf' });

{
    const idb = fakeIndexedDB();
    const h = loadHandoff({ indexedDB: idb });
    check('helper defines stash and take', typeof h.stash === 'function' && typeof h.take === 'function');

    const id = await h.stash({ prompt: 'Build a CRM', files: [fileA, fileB] });
    check('stash resolves with a usable id', typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id));
    const got = await h.take(id);
    check('take by id returns the text and the files, in order, as Files',
        !!got && got.prompt === 'Build a CRM' && got.files.length === 2 && got.files[0] === fileA && got.files[1] === fileB &&
        got.files.every((f) => f instanceof File));
    check('take consumes: a second take of the same id is null', (await h.take(id)) === null);

    check('an id nobody stashed (an outside link) finds nothing', (await h.take('made-up-id-0001')) === null);
    check('a missing or malformed id finds nothing', (await h.take()) === null && (await h.take('')) === null && (await h.take(42)) === null);

    const idA = await h.stash({ prompt: 'tab A', files: [fileA] });
    const idB = await h.stash({ prompt: 'tab B', files: [fileB] });
    const tookA = await h.take(idA);
    const tookB = await h.take(idB);
    check('two sends side by side (two tabs) each get their own record',
        idA !== idB && tookA.prompt === 'tab A' && tookA.files[0] === fileA && tookB.prompt === 'tab B' && tookB.files[0] === fileB);

    const junk = await h.stash({ prompt: 'junk', files: [fileA, 'not a file', null, { name: 'x' }] });
    const filtered = await h.take(junk);
    check('take drops anything that is not a File', filtered.files.length === 1 && filtered.files[0] === fileA);

    const textOnly = await h.stash({ prompt: 'just words', files: [] });
    const words = await h.take(textOnly);
    check('a text-only send parks with no files', words.prompt === 'just words' && words.files.length === 0);
    const noPrompt = await h.stash({ files: [fileB] });
    check('a file-only send parks with an empty prompt', (await h.take(noPrompt)).prompt === '');

    const old = await h.stash({ prompt: 'abandoned', files: [fileA] });
    const realNow = Date.now;
    Date.now = () => realNow() + 11 * 60 * 1000;
    try {
        check('a record older than ten minutes is treated as abandoned', (await h.take(old)) === null);
        const fresh = await h.stash({ prompt: 'fresh', files: [] });
        const older = await h.stash({ prompt: 'also old', files: [] });
        const table = [...idb._dbs.values()][0].stores.get('pending');
        table.get(older).at = realNow() - 1;
        await h.take(fresh);
        check('a take sweeps abandoned records and keeps live ones', !table.has(older) && !table.has(fresh) && table.size === 0);
    } finally { Date.now = realNow; }
}

{
    const h = loadHandoff({});
    let stashErr = null, takeErr = null;
    await h.stash({ prompt: 'x', files: [fileA] }).catch((e) => { stashErr = e; });
    await h.take('some-id-000000').catch((e) => { takeErr = e; });
    check('without IndexedDB stash rejects (the page then falls back to a prefill)', !!stashErr);
    check('without IndexedDB take rejects (the app then carries on as a prefill)', !!takeErr);
}

{
    const idb = fakeIndexedDB();
    const h = loadHandoff({ indexedDB: idb });
    await h.take(await h.stash({ prompt: 'a', files: [fileA] }));
    const conns = [...idb._dbs.values()];
    check('the store is a single database with the pending store', conns.length === 1 && conns[0].stores.has('pending'));
}

{
    const h = loadHandoff({ indexedDB: fakeIndexedDB(), crypto: { randomUUID: () => 'c0ffee00-0000-4000-8000-000000000001' } });
    check('ids come from crypto.randomUUID where it exists', (await h.stash({ prompt: '', files: [] })) === 'c0ffee00-0000-4000-8000-000000000001');
}

// =============================================================================
// 2. The composer script against a fake DOM
// =============================================================================

function element(tag, classes = []) {
    const el = {
        tagName: tag, classes: new Set(classes), attrs: {}, children: [], parent: null, listeners: {},
        style: {}, hidden: false, disabled: false, required: false, value: '', title: '', className: '',
        type: '', scrollHeight: 30, files: [], focused: 0, clicked: 0, _text: '',
        addEventListener(type, fn, opts) { (el.listeners[type] ||= []).push({ fn, once: !!(opts && opts.once) }); },
        dispatch(type, evt = {}) {
            const list = el.listeners[type] || [];
            const e = Object.assign({ type, target: el, defaulted: false, preventDefault() { e.defaulted = true; } }, evt);
            for (const l of list.slice()) { if (l.once) list.splice(list.indexOf(l), 1); l.fn(e); }
            return e;
        },
        classList: { add: (c) => el.classes.add(c), remove: (c) => el.classes.delete(c), contains: (c) => el.classes.has(c) },
        setAttribute(k, v) { el.attrs[k] = String(v); },
        getAttribute(k) { return k in el.attrs ? el.attrs[k] : null; },
        appendChild(child) { child.parent = el; el.children.push(child); return child; },
        contains(other) { for (let n = other; n; n = n.parent) if (n === el) return true; return false; },
        querySelector(sel) { return find(el, sel); },
        focus() { el.focused++; },
        click() { el.clicked++; el.dispatch('click'); },
    };
    Object.defineProperty(el, 'textContent', {
        get() { return el._text; },
        set(v) { el._text = String(v); if (v === '') el.children = []; },
    });
    return el;
}
function hasClass(el, c) { return el.classes.has(c) || el.className.split(/\s+/).includes(c); }
// `.class` or `tag`, which is all the script asks for.
function matches(el, sel) { return sel.startsWith('.') ? hasClass(el, sel.slice(1)) : el.tagName === sel; }
function find(root, sel) {
    for (const child of root.children) {
        if (matches(child, sel)) return child;
        const deep = find(child, sel);
        if (deep) return deep;
    }
    return null;
}

// A composer as renderComposer() lays it out, plus the fakes the script
// touches. `puter` is null for "puter.js never loaded".
function mount({ fine = true, puter = null, handoff = null } = {}) {
    const root = element('body');
    const f = root.appendChild(element('form', ['hero-composer']));
    const t = f.appendChild(element('textarea', ['hero-composer-message']));
    t.setAttribute('data-examples', JSON.stringify(['A CRM for my shop.', 'A habit tracker.', 'An invoice tool.']));
    t.required = true;
    const tray = f.appendChild(element('div', ['hero-composer-files']));
    tray.hidden = true;
    const thumbs = tray.appendChild(element('div', ['hero-composer-thumbs']));
    const box = f.appendChild(element('div', ['hero-composer-box']));
    const bar = box.appendChild(element('div', ['hero-composer-actions']));
    const attach = bar.appendChild(element('button', ['hero-composer-attach']));
    attach.hidden = true;
    const pick = bar.appendChild(element('input', ['hero-composer-file-input']));
    const send = bar.appendChild(element('button', ['hero-composer-send']));
    f.requestSubmit = () => f.dispatch('submit');

    const head = element('head');
    const doc = { querySelector: (sel) => find(root, sel), createElement: (tag) => element(tag), head };
    const win = {
        matchMedia: (q) => ({ matches: q.includes('pointer: fine') ? fine : q.includes('reduced-motion') }),
        puter, BuilderHandoff: handoff,
    };
    const loc = { href: '' };
    new Function('window', 'document', 'location', COMPOSER_SCRIPT)(win, doc, loc);
    return { f, t, tray, thumbs, attach, pick, send, head, win, loc };
}

// Records the order of sign-in and stash calls across both fakes.
function fakes({ signedIn = true, signIn = () => Promise.resolve({ success: true }), stash = () => Promise.resolve('id-abc-123') } = {}) {
    const calls = [];
    const puter = { auth: { isSignedIn: () => signedIn, signIn: () => { calls.push('signIn'); return signIn(); } } };
    const handoff = { stash: (send) => { calls.push('stash'); handoff.stashed = { prompt: send.prompt, files: send.files.slice() }; return stash(); } };
    return { calls, puter, handoff };
}

{
    const m = mount();
    check('script reveals the attach button', m.attach.hidden === false);
    check('send starts disabled with nothing to send', m.send.disabled === true);

    m.f.dispatch('focusin');
    m.f.dispatch('focusin');
    m.f.dispatch('pointerenter');
    const scripts = m.head.children.filter((c) => c.tagName === 'script');
    check('first touch of the composer loads puter.js, once', scripts.length === 1 && scripts[0].src === PUTER_JS_SRC && scripts[0].async === true);

    m.t.value = 'A CRM for my shop';
    m.t.dispatch('input');
    check('typing enables send', m.send.disabled === false);
    check('textarea grows with its content', m.t.style.height === '30px');
    m.t.value = '';
    m.t.dispatch('input');
    check('clearing disables send again', m.send.disabled === true);

    m.attach.click();
    check('attach opens the native picker', m.pick.clicked === 1);
    m.pick.files = [fileA, fileB];
    m.pick.dispatch('change');
    check('picked files become thumbnails', m.thumbs.children.length === 2 && m.tray.hidden === false &&
        find(m.thumbs.children[0], '.hero-composer-file-name').textContent === 'a.png');
    check('an image thumbnail shows the image, any other file the app\'s file icon',
        find(m.thumbs.children[0], 'img').src.startsWith('blob:') && find(m.thumbs.children[1], 'img').src === FILE_ICON_URL);
    check('a remove control names its file', find(m.thumbs.children[1], '.hero-composer-file-remove').getAttribute('aria-label') === 'Remove b.pdf' &&
        find(m.thumbs.children[1], '.hero-composer-file-remove').textContent === '×');
    check('a file-only send is allowed (send on, required off)', m.send.disabled === false && m.t.required === false);

    m.pick.files = [new File(['aaa'], 'a.png', { type: 'image/png' })];
    m.pick.dispatch('change');
    check('the same name and size is not attached twice', m.thumbs.children.length === 2);

    m.t.dispatch('paste', { clipboardData: { files: [new File(['ccccc'], 'c.txt', { type: 'text/plain' })] } });
    check('pasting a file attaches it', m.thumbs.children.length === 3);
    const textPaste = m.t.dispatch('paste', { clipboardData: { files: [] } });
    check('pasting text is left to the browser', textPaste.defaulted === false && m.thumbs.children.length === 3);

    m.f.dispatch('dragover', { dataTransfer: { files: [] } });
    check('dragging over highlights the box', m.f.classes.has('is-dragover'));
    m.f.dispatch('drop', { dataTransfer: { files: [new File(['dd'], 'd.csv', { type: 'text/csv' })] } });
    check('dropping attaches and clears the highlight', m.thumbs.children.length === 4 && !m.f.classes.has('is-dragover'));

    find(m.thumbs.children[0], '.hero-composer-file-remove').dispatch('click');
    check('remove takes the thumbnail out and refocuses the box', m.thumbs.children.length === 3 &&
        find(m.thumbs.children[0], '.hero-composer-file-name').textContent === 'b.pdf' && m.t.focused > 0);
    while (m.thumbs.children.length) find(m.thumbs.children[0], '.hero-composer-file-remove').dispatch('click');
    check('removing every file hides the tray and disables send', m.tray.hidden === true && m.send.disabled === true && m.t.required === true);
}

{
    let submits = 0;
    const m = mount({ fine: true });
    m.f.addEventListener('submit', () => { submits++; });
    const composing = m.t.dispatch('keydown', { key: 'Enter', isComposing: true });
    check('Enter mid-IME composition is ignored', composing.defaulted === false && submits === 0);
    const k229 = m.t.dispatch('keydown', { key: 'Enter', keyCode: 229 });
    check('Enter with keyCode 229 is ignored', k229.defaulted === false && submits === 0);
    const shift = m.t.dispatch('keydown', { key: 'Enter', shiftKey: true });
    check('Shift+Enter inserts a newline', shift.defaulted === false && submits === 0);
    const empty = m.t.dispatch('keydown', { key: 'Enter' });
    check('Enter with nothing to send does nothing', empty.defaulted === true && submits === 0);
    m.t.value = 'Hello';
    m.t.dispatch('input');
    m.t.dispatch('keydown', { key: 'Enter' });
    check('Enter with text submits on a fine-pointer device', submits === 1);
}
{
    let submits = 0;
    const m = mount({ fine: false });
    m.f.addEventListener('submit', () => { submits++; });
    m.t.value = 'Hello';
    m.t.dispatch('input');
    const e = m.t.dispatch('keydown', { key: 'Enter' });
    check('on a touch device Enter inserts a newline and the button sends', e.defaulted === false && submits === 0);
}

// --- submit outcomes ---------------------------------------------------------

{
    const { calls, puter, handoff } = fakes({ signedIn: true });
    const m = mount({ puter, handoff });
    m.t.value = '  Build a & b?  ';
    m.t.dispatch('input');
    m.pick.files = [fileA];
    m.pick.dispatch('change');
    const e = m.f.dispatch('submit');
    check('submit is taken over from the native GET', e.defaulted === true);
    check('the box is busy while the handoff runs', m.f.classes.has('is-busy') && m.send.disabled === true);
    await flush();
    check('signed in: no sign-in prompt, the send is parked, then off to the app with its id',
        calls.join(',') === 'stash' && handoff.stashed.prompt === 'Build a & b?' &&
        handoff.stashed.files.length === 1 && handoff.stashed.files[0] === fileA &&
        m.loc.href === '/?prompt=Build%20a%20%26%20b%3F&handoff=id-abc-123');
}
{
    const { calls, puter, handoff } = fakes({ signedIn: true });
    const m = mount({ puter, handoff });
    m.t.value = 'Just text';
    m.t.dispatch('input');
    m.f.dispatch('submit');
    await flush();
    check('text only: parked too (the id is what lets the app send), then off with prompt and id',
        calls.join(',') === 'stash' && handoff.stashed.prompt === 'Just text' && handoff.stashed.files.length === 0 &&
        m.loc.href === '/?prompt=Just%20text&handoff=id-abc-123');
}
{
    const { calls, puter, handoff } = fakes({ signedIn: true });
    const m = mount({ puter, handoff });
    m.pick.files = [fileB];
    m.pick.dispatch('change');
    m.f.dispatch('submit');
    await flush();
    check('file only: parked with an empty prompt and sent with only the id in the URL',
        calls.join(',') === 'stash' && handoff.stashed.prompt === '' && m.loc.href === '/?handoff=id-abc-123');
}
{
    const { calls, puter, handoff } = fakes({ signedIn: false });
    const m = mount({ puter, handoff });
    m.t.value = 'Sign me in';
    m.t.dispatch('input');
    m.pick.files = [fileA];
    m.pick.dispatch('change');
    m.f.dispatch('submit');
    check('signed out: the sign-in popup opens synchronously, inside the click', calls[0] === 'signIn');
    await flush();
    check('signed out: sign in, then park, then go',
        calls.join(',') === 'signIn,stash' && m.loc.href === '/?prompt=Sign%20me%20in&handoff=id-abc-123');
}
{
    const { calls, puter, handoff } = fakes({ signedIn: false, signIn: () => Promise.reject({ error: 'dismissed' }) });
    const m = mount({ puter, handoff });
    m.t.value = 'Changed my mind';
    m.t.dispatch('input');
    m.pick.files = [fileA];
    m.pick.dispatch('change');
    m.f.dispatch('submit');
    await flush();
    check('dismissed sign-in: stays put with text and files intact, ready to try again',
        calls.join(',') === 'signIn' && m.loc.href === '' && m.t.value === 'Changed my mind' &&
        m.thumbs.children.length === 1 && !m.f.classes.has('is-busy') && m.send.disabled === false);
}
{
    const { calls, puter, handoff } = fakes({ signedIn: false, signIn: () => Promise.reject({ error: 'popup_blocked' }) });
    const m = mount({ puter, handoff });
    m.t.value = 'Blocked';
    m.t.dispatch('input');
    m.f.dispatch('submit');
    await flush();
    check('blocked popup: carries on to the app, whose own Send can open it',
        calls.join(',') === 'signIn,stash' && m.loc.href === '/?prompt=Blocked&handoff=id-abc-123');
}
{
    const { calls, puter, handoff } = fakes({ signedIn: true, stash: () => Promise.reject(new Error('quota')) });
    const m = mount({ puter, handoff });
    m.t.value = 'No storage';
    m.t.dispatch('input');
    m.pick.files = [fileA];
    m.pick.dispatch('change');
    m.f.dispatch('submit');
    await flush();
    check('parking failed: the text still goes as a plain prefill, so the visitor can attach again',
        calls.join(',') === 'stash' && m.loc.href === '/?prompt=No%20storage');
}
{
    const { handoff } = fakes();
    const m = mount({ puter: null, handoff });
    m.t.value = 'No puter';
    m.t.dispatch('input');
    m.f.dispatch('submit');
    await flush();
    check('puter.js never loaded: parked and off to the app, which asks to sign in on its own Send',
        m.loc.href === '/?prompt=No%20puter&handoff=id-abc-123');
}
{
    const { puter } = fakes();
    const m = mount({ puter, handoff: null });
    m.t.value = 'No helper';
    m.t.dispatch('input');
    m.f.dispatch('submit');
    await flush();
    check('no handoff helper on the page: a plain prefill, never a send', m.loc.href === '/?prompt=No%20helper');
}
{
    const { puter, handoff } = fakes();
    const m = mount({ puter, handoff });
    m.t.value = '   ';
    m.f.dispatch('submit');
    await flush();
    check('nothing to send: no navigation, the box takes focus', m.loc.href === '' && m.t.focused > 0);
}
{
    const { calls, puter, handoff } = fakes({ signedIn: false, signIn: () => new Promise(() => {}) });
    const m = mount({ puter, handoff });
    m.t.value = 'Twice';
    m.t.dispatch('input');
    m.f.dispatch('submit');
    m.f.dispatch('submit');
    await flush();
    check('a second submit while the popup is open is ignored', calls.length === 1);
}

// =============================================================================
// 3. App-side integration and build wiring
// =============================================================================

const deepLink = APP.slice(APP.indexOf('function applyPromptDeepLink()'), APP.indexOf('async function consumeComposerHandoff()'));
check('applyPromptDeepLink reads the handoff id', deepLink.includes("handoffId = params.get('handoff');"));
check('the id is validated before it is used', deepLink.includes("if (!HANDOFF_ID_RE.test(handoffId || '')) handoffId = null;") &&
    APP.includes('const HANDOFF_ID_RE = /^[A-Za-z0-9-]{8,64}$/;'));
check('applyPromptDeepLink records the id for the consumer', deepLink.includes('_composerHandoffId = handoffId;'));
check('applyPromptDeepLink strips prompt and id from the URL',
    deepLink.includes("url.searchParams.delete('prompt');") && deepLink.includes("url.searchParams.delete('handoff');"));
check('a file-only handoff (id without prompt) still gets through', deepLink.includes('if ((!hasPrompt && !handoffId) || readUrlChatId()) return;'));
check('a bare URL flag can no longer start a build', !APP.includes("params.get('send')") && !APP.includes('_composerHandoffPending'));

const consume = APP.slice(APP.indexOf('async function consumeComposerHandoff()'), APP.indexOf('function cleanLandingUtmParams()'));
check('consumeComposerHandoff runs once per id', consume.includes('const id = _composerHandoffId;') && consume.includes('_composerHandoffId = null;'));
check('consumeComposerHandoff takes the record by id through the shared helper', consume.includes('window.BuilderHandoff?.take(id)'));
check('no record, no send: an outside link is a prefill', consume.includes('if (!record) return;') &&
    consume.indexOf('if (!record) return;') < consume.indexOf('handleDroppedFiles'));
check('parked files go through the drop intake (size, count, dedup rules)', consume.includes('await handleDroppedFiles(record.files);'));
check('the drop intake is a global the app can reach', /^async function handleDroppedFiles\(/m.test(DRAGDROP));
check("the record's text replaces whatever the draft restore put in the box, even when empty",
    consume.includes("$input.val(record.prompt.slice(0, 2000));") && consume.indexOf('$input.val(') < consume.indexOf('await sendChatMessage();'));
check('a signed-out visitor is left staged, not sent into a blocked popup', consume.includes('if (!window.user || window.user.is_temp) return;'));
check('the send is the ordinary composer send', consume.includes('await sendChatMessage();') &&
    consume.indexOf('handleDroppedFiles') < consume.indexOf('await sendChatMessage();'));
check('nothing to send, nothing sent', consume.includes("if (!record.prompt.trim() && attachedImages.length === 0) return;"));

const ready = APP.slice(APP.indexOf('$(document).ready(async function(){'));
check('boot fills the composer from the deep link before first paint', ready.indexOf('applyPromptDeepLink();') < ready.indexOf('revealWhenReady();'));
check('boot consumes the handoff after auth and the draft settle, before the focus',
    ready.indexOf('settleComposerDraftIdentity();') < ready.indexOf('await consumeComposerHandoff();') &&
    ready.indexOf('await consumeComposerHandoff();') < ready.indexOf("$('.chat-input-message').focus();"));

const scripts = VITE.slice(VITE.indexOf('const SCRIPTS = ['), VITE.indexOf('];', VITE.indexOf('const SCRIPTS = [')));
check('handoff.js ships in the app bundle, ahead of app.js',
    scripts.includes("'js/handoff.js'") && scripts.indexOf("'js/handoff.js'") < scripts.indexOf("'js/app.js'"));
check('the dev server and the build both inline handoff.js into the marketing pages',
    (VITE.match(/handoffJs/g) || []).length >= 3 && VITE.includes("path.join(SRC, 'js/handoff.js')"));
check('the renderer inlines the helper ahead of the composer script', BUILD.includes('<script>${handoffJs}\\n${COMPOSER_SCRIPT}</script>'));
check('the helper is a classic script defining one global', HANDOFF.includes('window.BuilderHandoff = {') && !/\bexport\b|\bimport\b/.test(HANDOFF));

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nall composer handoff checks passed');
