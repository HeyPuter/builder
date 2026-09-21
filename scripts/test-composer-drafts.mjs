import fs from 'node:fs';

// ---- Regression guard for composer drafts (unsent input) --------------------
// Unsent composer text must survive reloads, project switches, and devices.
// Two layers hold the same {t, at} envelope under the same key: localStorage
// (synchronous fast layer, written on every edit) and puter.kv (debounced
// background mirror for signed-in users, reconciled last-write-wins by
// timestamp; empty t = tombstone so deletions propagate without resurrecting
// sent text). This test:
//   * evaluates the REAL composer-drafts block sliced out of app.js inside a
//     mocked environment (jQuery/localStorage/puter.kv/timers/clock) and drives
//     save, clear, restore, the debounced mirror, the two-way reconcile, and
//     the sign-in re-key through their edge cases, then
//   * text-asserts the integration points: loadChat/new_chat restore, the boot
//     rekey-or-restore, ensureAuthenticated's re-key, both send paths clearing,
//     deleteChat discarding, and ui.js's chip injector mirroring its
//     programmatic write.
// Mirrors scripts/test-mobile-lifecycle.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const UI = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');

// --- Slice + evaluate the REAL composer-drafts block --------------------------
const cdA = APP.indexOf('// ===== composer-drafts (start) =====');
const cdB = APP.indexOf('// ===== composer-drafts (end) =====');
if (cdA < 0 || cdB < 0 || cdB <= cdA) throw new Error('could not extract composer-drafts block');
let BLOCK = APP.slice(cdA, cdB);

// The block's module-level `let _x = ...` state is shared with the rest of
// app.js in the real bundle. For the harness, strip those declarations so —
// inside a sloppy-mode `with (env)` — every read/write resolves to the env
// object, which the test can inspect and mutate. If the state shape changes,
// the seed list below fails loudly rather than silently testing nothing.
const stateNames = [];
BLOCK = BLOCK.replace(/^let (_\w+) = [^;]+;/gm, (m, name) => { stateNames.push(name); return ''; });
const EXPECTED_STATE = ['_draftSeq', '_composerRestoredFromKey', '_cloudDraftPending', '_cloudDraftChain', '_cloudDraftWarned'];
check('draft state variables all found', EXPECTED_STATE.every(n => stateNames.includes(n)));

function makeEnv() {
    const store = new Map();   // localStorage
    const kvStore = new Map(); // cloud
    const kvOps = [];          // every cloud call, in order
    const timers = [];
    const input = { value: '', style: {} };
    const send = { disabled: undefined };
    const docHandlers = {};
    const docEvents = {};
    const winEvents = {};
    const $input = {
        length: 1,
        0: input,
        val(v) { if (v === undefined) return input.value; input.value = v; return this; },
        prop(name, v) { if (v === undefined) return input[name]; input[name] = v; return this; },
    };
    const $send = {
        prop(name, v) { if (v === undefined) return send[name]; send[name] = v; return this; },
    };
    const env = {
        __now: 1000,
        localStorage: {
            getItem: k => (store.has(k) ? store.get(k) : null),
            setItem: (k, v) => store.set(k, String(v)),
            removeItem: k => store.delete(k),
        },
        window: { addEventListener: (t, fn) => { winEvents[t] = fn; } },
        document: {
            visibilityState: 'visible',
            addEventListener: (t, fn) => { docEvents[t] = fn; },
        },
        puter: {
            kv: {
                set: async (k, v) => { kvOps.push(['set', k, v]); kvStore.set(k, String(v)); },
                get: async (k) => { kvOps.push(['get', k]); if (env.kvGetGate) await env.kvGetGate; return kvStore.has(k) ? kvStore.get(k) : null; },
                del: async (k) => { kvOps.push(['del', k]); kvStore.delete(k); },
            },
        },
        kvGetGate: null,
        Date: { now: () => env.__now },
        setTimeout: (fn, delay) => { const t = { fn, delay, cleared: false }; timers.push(t); return t; },
        clearTimeout: (t) => { if (t) t.cleared = true; },
        console: { warn: () => { env.warned = (env.warned || 0) + 1; } },
        warned: 0,
        // stripped block state
        _draftSeq: 0, _composerRestoredFromKey: null, _cloudDraftPending: null, _cloudDraftChain: Promise.resolve(), _cloudDraftWarned: false,
        // globals the block reads live
        currentChatId: 'chat-1',
        chatHistory: [],
        savedChats: [],
        isProcessing: false,
        attachedImages: [],
        autoResizeTextarea: () => {},
        // exposed to assertions
        store, kvStore, kvOps, timers, input, send, docHandlers, docEvents, winEvents,
    };
    env.$ = (arg) => {
        if (arg === env.document) return { on(evts, sel, fn) { docHandlers[evts + ' ' + sel] = fn; return this; } };
        if (arg === '.chat-input-message') return $input;
        if (arg === '.send') return $send;
        throw new Error('unexpected selector: ' + arg);
    };
    const x = new Function('env',
        'with (env) {\n' + BLOCK +
        '\nreturn { composerDraftKey, composerDraftContext, parseDraftEnvelope, saveComposerDraft,' +
        ' clearComposerDraft, restoreComposerDraft, rekeyAnonComposerDraft, settleComposerDraftIdentity,' +
        ' flushCloudDraftMirror };\n}'
    )(env);
    return { env, x };
}
const signIn = (env, name = 'nj') => { env.window.user = { username: name }; };
const pendingTimers = (env) => env.timers.filter(t => !t.cleared && !t.fired);
const fireTimers = (env) => { for (const t of env.timers) { if (!t.cleared && !t.fired) { t.fired = true; t.fn(); } } };
const drain = (env) => env._cloudDraftChain;
const localEnv = (env, key) => { const v = env.store.get(key); return v == null ? null : JSON.parse(v); };
const kvSets = (env, key) => env.kvOps.filter(o => o[0] === 'set' && o[1] === key);

// --- Context + keying ---------------------------------------------------------
{
    const { env, x } = makeEnv();
    check("new-chat landing (system-only history, not in sidebar) is the 'home' context",
        x.composerDraftContext() === 'home');
    check("signed-out keys fall back to 'anon'",
        x.composerDraftKey('home') === 'composerDraft:anon:home');
    signIn(env);
    check('keys carry the username once signed in',
        x.composerDraftKey('home') === 'composerDraft:nj:home');
    env.chatHistory = [{ role: 'system' }, { role: 'user' }];
    check('a chat with visible history is a project context (mid-first-turn)',
        x.composerDraftContext() === 'chat-1');
    env.chatHistory = [{ role: 'system' }];
    env.savedChats = [{ id: 'chat-1' }];
    check('a sidebar chat with system-only history is still a project context',
        x.composerDraftContext() === 'chat-1');
}

// --- Envelope parsing ----------------------------------------------------------
{
    const { x } = makeEnv();
    check('envelope JSON round-trips',
        JSON.stringify(x.parseDraftEnvelope('{"t":"hi","at":42}')) === '{"t":"hi","at":42}');
    check('legacy raw-string local values parse with at:0 (any timestamped copy beats them)',
        JSON.stringify(x.parseDraftEnvelope('plain old draft')) === '{"t":"plain old draft","at":0}');
    check('a raw draft that parses to non-envelope JSON stays a raw draft',
        x.parseDraftEnvelope('123').t === '123' && x.parseDraftEnvelope('null').t === 'null');
    check('missing values parse to null', x.parseDraftEnvelope(null) === null && x.parseDraftEnvelope(undefined) === null);
}

// --- Local save + tombstones ----------------------------------------------------
{
    const { env } = makeEnv();
    const onInput = env.docHandlers['input .chat-input-message'];
    check("an 'input' handler on the composer is registered", typeof onInput === 'function');
    env.input.value = 'make me a game';
    onInput();
    const savedAnon = localEnv(env, 'composerDraft:anon:home');
    check("typing at home saves an envelope under the 'home' key",
        savedAnon && savedAnon.t === 'make me a game' && savedAnon.at === 1000);
    env.__now = 2000;
    env.input.value = '';
    onInput();
    const tomb = localEnv(env, 'composerDraft:anon:home');
    check('emptying the composer writes a TOMBSTONE (empty t, fresh at) — not a bare delete',
        tomb && tomb.t === '' && tomb.at === 2000);
    check('signed-out typing never schedules cloud work', pendingTimers(env).length === 0 && env.kvOps.length === 0);
}

// --- Debounced cloud mirror ------------------------------------------------------
{
    const { env } = makeEnv();
    signIn(env);
    const onInput = env.docHandlers['input .chat-input-message'];
    env.input.value = 'v1'; onInput();
    env.input.value = 'v1 v2'; onInput();
    env.input.value = 'v1 v2 v3'; onInput();
    check('keystrokes coalesce into ONE pending cloud write', pendingTimers(env).length === 1 && env.kvOps.length === 0);
    fireTimers(env);
    await drain(env);
    const sets = kvSets(env, 'composerDraft:nj:home');
    check('the fired mirror writes the LAST text once', sets.length === 1 && JSON.parse(sets[0][2]).t === 'v1 v2 v3');
}
{
    const { env } = makeEnv();
    signIn(env);
    const onInput = env.docHandlers['input .chat-input-message'];
    env.input.value = 'draft for home'; onInput();
    // Context switch while the mirror is still pending: the old context's final
    // edits must flush, not vanish.
    env.savedChats = [{ id: 'chat-1' }];
    env.input.value = 'draft for chat-1'; onInput();
    await drain(env);
    check('a pending mirror for a LEFT context is flushed, not dropped',
        kvSets(env, 'composerDraft:nj:home').length === 1
        && JSON.parse(kvSets(env, 'composerDraft:nj:home')[0][2]).t === 'draft for home');
    check('the new context gets its own pending mirror', pendingTimers(env).length === 1);
}
{
    const { env } = makeEnv();
    signIn(env);
    const onInput = env.docHandlers['input .chat-input-message'];
    env.input.value = 'x'.repeat(50001); onInput();
    check('oversized drafts stay local-only (no cloud mirror scheduled)',
        pendingTimers(env).length === 0 && localEnv(env, 'composerDraft:nj:home').t.length === 50001);
}
{
    const { env } = makeEnv();
    signIn(env);
    const onInput = env.docHandlers['input .chat-input-message'];
    env.input.value = 'about to background the tab'; onInput();
    env.document.visibilityState = 'hidden';
    env.docEvents['visibilitychange']();
    await drain(env);
    check("hiding the tab flushes the pending mirror immediately (Page Lifecycle 'hidden')",
        kvSets(env, 'composerDraft:nj:home').length === 1);
    check('a pagehide handler is registered as backstop', typeof env.winEvents['pagehide'] === 'function');
}

// --- Clear (consumption) ----------------------------------------------------------
{
    const { env, x } = makeEnv();
    signIn(env);
    const onInput = env.docHandlers['input .chat-input-message'];
    env.store.set('composerDraft:anon:home', JSON.stringify({ t: 'typed signed out', at: 500 }));
    env.input.value = 'send me'; onInput();
    env.__now = 3000;
    x.clearComposerDraft();
    check('clear cancels the pending debounced mirror', pendingTimers(env).length === 0);
    const tomb = localEnv(env, 'composerDraft:nj:home');
    check('clear tombstones the local copy (so it beats older copies elsewhere)',
        tomb && tomb.t === '' && tomb.at === 3000);
    check("clear removes the 'anon' twin (first-send sign-in leaves one behind)",
        !env.store.has('composerDraft:anon:home'));
    await drain(env);
    const sets = kvSets(env, 'composerDraft:nj:home');
    check('clear tombstones the CLOUD copy immediately — no kv.del, no debounce (deletions must propagate)',
        sets.length === 1 && JSON.parse(sets[0][2]).t === ''
        && env.kvOps.every(o => o[0] !== 'del'));
}
{
    const { env, x } = makeEnv();
    signIn(env);
    env.store.set('composerDraft:nj:chat-9', JSON.stringify({ t: 'stale', at: 500 }));
    env.kvStore.set('composerDraft:nj:chat-9', JSON.stringify({ t: 'stale', at: 500 }));
    x.clearComposerDraft('chat-9', { discard: true });
    await drain(env);
    check('discard (deleteChat) removes local outright and kv.del-s the cloud copy',
        !env.store.has('composerDraft:nj:chat-9') && !env.kvStore.has('composerDraft:nj:chat-9')
        && env.kvOps.some(o => o[0] === 'del' && o[1] === 'composerDraft:nj:chat-9'));
}
{
    const { env, x } = makeEnv();
    // Signed out, userKey === anonKey: clear must not tombstone-then-delete
    // itself into resurrecting anything, and must touch no cloud.
    env.store.set('composerDraft:anon:home', JSON.stringify({ t: 'x', at: 1 }));
    x.clearComposerDraft();
    const v = localEnv(env, 'composerDraft:anon:home');
    check('signed-out clear leaves a coherent result (tombstone survives, no self-delete)',
        v && v.t === '' && env.kvOps.length === 0);
}

// --- Restore + two-way reconcile ----------------------------------------------------
{
    const { env, x } = makeEnv();
    signIn(env);
    env.store.set('composerDraft:nj:home', JSON.stringify({ t: 'local newer', at: 900 }));
    env.kvStore.set('composerDraft:nj:home', JSON.stringify({ t: 'cloud older', at: 100 }));
    env.input.value = 'text from the chat we just left';
    x.restoreComposerDraft();
    check('restore applies the LOCAL copy synchronously (instant, offline-correct)',
        env.input.value === 'local newer');
    check('restore enables the send button for a non-empty draft', env.send.disabled === false);
    await drain(env);
    check('reconcile pushes a newer local copy up (self-heals a lost debounced mirror)',
        JSON.parse(env.kvStore.get('composerDraft:nj:home')).t === 'local newer');
    check('...and does not touch the composer', env.input.value === 'local newer');
}
{
    const { env, x } = makeEnv();
    signIn(env);
    env.store.set('composerDraft:nj:home', JSON.stringify({ t: 'local older', at: 100 }));
    env.kvStore.set('composerDraft:nj:home', JSON.stringify({ t: 'cloud newer', at: 900 }));
    x.restoreComposerDraft();
    check('local applies first while the cloud fetch is in flight', env.input.value === 'local older');
    await drain(env);
    check('a newer cloud copy swaps into the composer', env.input.value === 'cloud newer');
    check('...and is written through to local (next boot is instant with it)',
        localEnv(env, 'composerDraft:nj:home').t === 'cloud newer');
}
{
    const { env, x } = makeEnv();
    signIn(env);
    env.store.set('composerDraft:nj:home', JSON.stringify({ t: 'typed on this device', at: 100 }));
    env.kvStore.set('composerDraft:nj:home', JSON.stringify({ t: '', at: 900 }));
    x.restoreComposerDraft();
    await drain(env);
    check('a newer cloud TOMBSTONE clears the composer (draft was sent on another device)',
        env.input.value === '');
}
{
    const { env, x } = makeEnv();
    signIn(env);
    env.kvStore.set('composerDraft:nj:home', JSON.stringify({ t: 'from my other laptop', at: 900 }));
    x.restoreComposerDraft();
    await drain(env);
    check('cloud-only draft (fresh browser, no local) restores', env.input.value === 'from my other laptop');
}
{
    const { env, x } = makeEnv();
    signIn(env);
    const same = JSON.stringify({ t: 'in sync', at: 500 });
    env.store.set('composerDraft:nj:home', same);
    env.kvStore.set('composerDraft:nj:home', same);
    x.restoreComposerDraft();
    await drain(env);
    check('equal timestamps reconcile to a no-op (read only, no redundant write)',
        env.kvOps.filter(o => o[0] === 'set').length === 0);
}
{
    // The user types WHILE the cloud fetch is in flight: their edit is newer
    // than anything fetched — the stale cloud copy must not clobber it.
    const { env, x } = makeEnv();
    signIn(env);
    env.kvStore.set('composerDraft:nj:home', JSON.stringify({ t: 'stale cloud', at: 900 }));
    let release; env.kvGetGate = new Promise(r => { release = r; });
    x.restoreComposerDraft();
    env.input.value = 'typed mid-fetch';
    env.docHandlers['input .chat-input-message']();
    release();
    await drain(env);
    check('an edit during the cloud fetch wins (seq guard drops the stale apply)',
        env.input.value === 'typed mid-fetch');
    check('...and the stale cloud copy is not written through to local',
        localEnv(env, 'composerDraft:nj:home').t === 'typed mid-fetch');
}
{
    // Same race, but the user SWITCHES CONTEXT (loadChat restores again): the
    // older fetch must not apply into the new context's composer.
    const { env, x } = makeEnv();
    signIn(env);
    env.kvStore.set('composerDraft:nj:home', JSON.stringify({ t: 'home draft', at: 900 }));
    env.kvStore.set('composerDraft:nj:chat-1', JSON.stringify({ t: 'chat draft', at: 900 }));
    let release; env.kvGetGate = new Promise(r => { release = r; });
    x.restoreComposerDraft();               // home fetch, gated
    env.savedChats = [{ id: 'chat-1' }];    // user opens the project
    env.kvGetGate = null;
    x.restoreComposerDraft();               // chat-1 restore supersedes
    release();
    await drain(env);
    check('a restore supersedes an older in-flight fetch (no cross-context apply)',
        env.input.value === 'chat draft');
}
{
    const { env, x } = makeEnv();
    env.store.set('composerDraft:anon:home', JSON.stringify({ t: 'anon draft', at: 500 }));
    x.restoreComposerDraft();
    await drain(env);
    check('signed-out restore is local-only (no cloud reads)',
        env.input.value === 'anon draft' && env.kvOps.length === 0);
}
{
    const { env, x } = makeEnv();
    signIn(env);
    env.kvStore.set('composerDraft:nj:home', JSON.stringify({ t: 'draft', at: 900 }));
    env.isProcessing = true;
    env.send.disabled = 'untouched';
    x.restoreComposerDraft();
    await drain(env);
    check('restore/reconcile leave the send button alone while a turn is processing',
        env.send.disabled === 'untouched');
}
{
    const { env, x } = makeEnv();
    signIn(env);
    // Legacy raw local value + no cloud: restore shows it and seeds the cloud.
    env.store.set('composerDraft:nj:home', 'pre-cloud raw draft');
    x.restoreComposerDraft();
    await drain(env);
    check('legacy raw local drafts restore and seed the cloud',
        env.input.value === 'pre-cloud raw draft'
        && JSON.parse(env.kvStore.get('composerDraft:nj:home')).t === 'pre-cloud raw draft');
}

// --- Sign-in identity settle ----------------------------------------------------------
{
    const { env, x } = makeEnv();
    env.store.set('composerDraft:anon:home', JSON.stringify({ t: 'typed signed out', at: 500 }));
    env.input.value = 'typed signed out';
    x.rekeyAnonComposerDraft();
    check('rekey is a NO-OP while signed out (must not delete the draft it just wrote)',
        env.store.has('composerDraft:anon:home'));
    signIn(env);
    x.settleComposerDraftIdentity();
    check('settle with typed text re-keys it under the just-signed-in user',
        localEnv(env, 'composerDraft:nj:home').t === 'typed signed out');
    check('...the anon copy is dropped (no leak to the next signed-out visitor)',
        !env.store.has('composerDraft:anon:home'));
    check('...and the re-keyed draft gets its first cloud mirror', pendingTimers(env).length === 1);
}
{
    // The reported bug: sign in from the Sign In button with an EMPTY composer
    // — the user's saved draft must appear right away, not on the next reload.
    const { env, x } = makeEnv();
    env.store.set('composerDraft:nj:home', JSON.stringify({ t: 'draft from last visit', at: 500 }));
    signIn(env);
    x.settleComposerDraftIdentity();
    await drain(env);
    check("settle with an empty composer restores the signed-in user's saved draft (no reload needed)",
        env.input.value === 'draft from last visit');
    check('settle is exposed for the ui.js Sign In handler',
        typeof env.window.settleComposerDraftIdentity === 'function');
}
{
    // Deep-link boot: loadChat's restore already filled the composer from the
    // settled identity's OWN store, then the boot settle runs. It must not
    // re-key that text as if the user had typed it — re-saving would re-stamp
    // `at` to now (stale local text would then beat a genuinely newer copy from
    // another device) and bump the seq the restore's in-flight cloud reconcile
    // is gated on, dropping that newer copy entirely.
    const { env, x } = makeEnv();
    signIn(env);
    env.savedChats = [{ id: 'chat-1' }];
    env.store.set('composerDraft:nj:chat-1', JSON.stringify({ t: 'stale local', at: 100 }));
    env.kvStore.set('composerDraft:nj:chat-1', JSON.stringify({ t: 'newer from my phone', at: 900 }));
    let release; env.kvGetGate = new Promise(r => { release = r; });
    x.restoreComposerDraft();        // loadChat's restore (cloud fetch in flight)
    x.settleComposerDraftIdentity(); // boot settle right after
    check('settle after a same-identity restore does not re-stamp the stored draft',
        localEnv(env, 'composerDraft:nj:chat-1').at === 100 && pendingTimers(env).length === 0);
    release();
    await drain(env);
    check('...so the newer cloud copy still swaps in (reconcile survives the settle)',
        env.input.value === 'newer from my phone'
        && JSON.parse(env.kvStore.get('composerDraft:nj:chat-1')).t === 'newer from my phone');
}
{
    // But text the user EDITED after a restore is theirs — settle must still
    // re-key it (the restored-verbatim guard must drop on the first edit).
    const { env, x } = makeEnv();
    env.store.set('composerDraft:anon:home', JSON.stringify({ t: 'restored anon', at: 100 }));
    x.restoreComposerDraft();                       // signed-out boot restore
    env.input.value = 'restored anon plus edits';
    env.docHandlers['input .chat-input-message'](); // user keeps typing
    signIn(env);
    x.settleComposerDraftIdentity();
    check('settle re-keys a restored-then-edited draft under the signed-in user',
        localEnv(env, 'composerDraft:nj:home').t === 'restored anon plus edits'
        && !env.store.has('composerDraft:anon:home'));
}

// --- Failure tolerance ----------------------------------------------------------------
{
    const { env, x } = makeEnv();
    signIn(env);
    env.localStorage.setItem = () => { throw new Error('quota'); };
    env.localStorage.getItem = () => { throw new Error('private mode'); };
    env.localStorage.removeItem = () => { throw new Error('nope'); };
    env.input.value = 'text';
    let threw = false;
    try { x.saveComposerDraft(); x.clearComposerDraft(); x.restoreComposerDraft(); x.rekeyAnonComposerDraft(); }
    catch (e) { threw = true; }
    await drain(env);
    check('save/clear/restore/rekey never throw on storage failure', !threw);
}
{
    const { env, x } = makeEnv();
    signIn(env);
    env.puter.kv.set = async () => { throw new Error('network down'); };
    env.input.value = 'text';
    env.docHandlers['input .chat-input-message']();
    fireTimers(env);
    x.clearComposerDraft();
    await drain(env);
    check('cloud failures degrade silently to local-only (warn once, never throw)',
        env.warned === 1 && localEnv(env, 'composerDraft:nj:home').t === '');
    // The chain must survive a failed op — later ops still run.
    env.puter.kv.set = async (k, v) => { env.kvStore.set(k, String(v)); };
    env.input.value = 'after the outage';
    env.docHandlers['input .chat-input-message']();
    fireTimers(env);
    await drain(env);
    check('the op chain survives failures (later mirrors still land)',
        JSON.parse(env.kvStore.get('composerDraft:nj:home')).t === 'after the outage');
}

// --- Text-assert the integration points ------------------------------------------------
function fnSlice(src, header) {
    const a = src.indexOf(header);
    if (a < 0) return '';
    // Good enough for these assertions: the function body up to the next
    // top-level (column-0) function/const declaration.
    const b = src.slice(a + header.length).search(/\n(?:async )?function |\nconst /);
    return b < 0 ? src.slice(a) : src.slice(a, a + header.length + b);
}

const loadChatSrc = fnSlice(APP, 'async function loadChat(');
check('loadChat restores the arriving chat\'s draft', loadChatSrc.includes('restoreComposerDraft()'));

const newChatSrc = fnSlice(APP, 'function new_chat(');
check('new_chat restores the home draft', newChatSrc.includes('restoreComposerDraft()'));
check('new_chat restores AFTER its 40px height reset (multiline drafts must not be squashed)',
    newChatSrc.indexOf("css('height', '40px')") < newChatSrc.indexOf('restoreComposerDraft()'));

const sendSrc = fnSlice(APP, 'async function sendChatMessage(');
check('sendChatMessage clears the draft when the composer is consumed',
    (sendSrc.match(/clearComposerDraft\(/g) || []).length >= 2); // clarification reply + main path
// Only a send that takes its text FROM the composer may consume what the user
// staged there. A programmatic send (the preview's automatic error-fix report,
// the Issues panel's batch) used to wipe the typed text, tombstone its draft,
// ship the attachment tray along with the report, and spend the click-to-edit
// target — all of which belong to the user's own next message.
check('the main-path clear is gated on consumedComposer (Resume + programmatic sends leave the composer alone)',
    /const consumedComposer = !isResume && userInput == null && chat_input_message == null;/.test(sendSrc) &&
    /if \(consumedComposer\) \{[^}]*clearComposerDraft\(preAuthDraftContext\)/s.test(sendSrc));
check('programmatic sends do not take or clear the attachment tray',
    sendSrc.includes('const atts = consumedComposer ? preAuthAttachments : [];') &&
    // (deferRevoke: the bubble just rendered from these blob URLs may still be
    // loading them — see clearAllAttachments.)
    /if \(consumedComposer\) clearAllAttachments\(\{ deferRevoke: true \}\);/.test(sendSrc));
// The tray is snapshotted next to the composer text, before the sign-in gate:
// a deep-link load inside ensureAuthenticated empties the tray, so reading it
// afterwards dropped the files the user attached to the message being sent.
check('send snapshots the attachment tray BEFORE ensureAuthenticated',
    sendSrc.indexOf('const preAuthAttachments = attachedImages.slice();') > 0 &&
    sendSrc.indexOf('const preAuthAttachments = attachedImages.slice();') < sendSrc.indexOf('await ensureAuthenticated();'));
check('programmatic sends do not spend the click-to-edit target',
    sendSrc.includes('if (consumedComposer && window.FEATURE_FLAGS?.clickToEdit && window._pendingEditTarget)'));
check('an attachment-only composer send still goes through',
    /if \(!isResume && !messageText && \(!consumedComposer \|\| preAuthAttachments\.length === 0\)\) \{[^}]*return; \}/.test(sendSrc));

const deleteSrc = fnSlice(APP, 'async function deleteChat(');
check('deleteChat DISCARDS the gone chat\'s draft (both layers, no tombstone litter)',
    deleteSrc.includes('clearComposerDraft(chatId, { discard: true })'));

check('boot settles the composer against the resolved identity',
    /applyHomeGreeting\(\);[\s\S]{0,600}settleComposerDraftIdentity\(\);/.test(APP));

// sendChatMessage reads the composer right after ensureAuthenticated resolves —
// a draft restore anywhere on that path would splice stored text into the
// message being sent (worst case: an attachment-only send silently carrying
// it). The settle belongs to the Sign In button, never the send path.
check('the send path never restores/settles a draft (would corrupt the outgoing message)',
    !/restoreComposerDraft|settleComposerDraftIdentity|rekeyAnonComposerDraft/.test(fnSlice(APP, 'async function sendChatMessage('))
    && !/restoreComposerDraft|settleComposerDraftIdentity|rekeyAnonComposerDraft/.test(fnSlice(APP, 'async function ensureAuthenticated(')));

// ensureAuthenticated's first-run init deep-links into loadChat, which DOES
// restore a draft into the composer. The send must therefore consume the text
// (and clear the draft context) captured BEFORE the auth await — otherwise a
// signed-out deep-link visitor's typed message is replaced by that project's
// stored draft (sent unseen) or silently dropped.
{
    const authIdx = sendSrc.indexOf('await ensureAuthenticated()');
    const textIdx = sendSrc.indexOf('const preAuthComposerText');
    const ctxIdx = sendSrc.indexOf('const preAuthDraftContext');
    check('send captures the composer text + draft context BEFORE ensureAuthenticated (whose deep-link loadChat rewrites the composer)',
        authIdx > -1 && textIdx > -1 && ctxIdx > -1 && textIdx < authIdx && ctxIdx < authIdx
        && sendSrc.includes('?? preAuthComposerText')
        && sendSrc.includes('clearComposerDraft(preAuthDraftContext)'));
}

const signInBtnSrc = UI.slice(UI.indexOf("'.sign-in-btn'"), UI.indexOf("'.sign-in-btn'") + 700);
check('the Sign In button settles the composer after an in-session sign-in',
    /await ensureAuthenticated\(\);[\s\S]{0,400}window\.settleComposerDraftIdentity\?\.\(\);/.test(signInBtnSrc));

const chipSrc = fnSlice(UI, 'function applyChipPromptToComposer(');
check('ui.js chip injection mirrors its programmatic write into the draft store',
    chipSrc.includes('window.saveComposerDraft?.()'));

// -----------------------------------------------------------------------------------------
if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nAll composer-draft checks passed');
