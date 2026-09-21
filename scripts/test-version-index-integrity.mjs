import fs from 'node:fs';

// ---- Regression guard for version-history index integrity -----------------
// index.json is the ONLY record of what snapshots exist; the snapshot
// directories beside it are unreachable without it. readIndex used to catch
// every failure and return an empty index, and its mutating callers
// (performCreateVersion / restoreVersion) write back whatever they read — so a
// single transient read blip silently persisted "no versions" over a chat's
// entire history and orphaned every snapshot on disk.
//
// The invariant this pins down: an UNKNOWN read outcome must never be
// presentable as "no versions". Missing file = genuinely empty (a new project);
// corrupt file = empty, but only after parking a backup; anything else THROWS so
// the mutating callers abort instead of clobbering. Read-only callers use
// readIndexForDisplay, which never throws and degrades to the cache, never to
// an empty list.
//
// Evaluates the REAL readIndex/readIndexForDisplay bytes sliced out of
// versions.js (zero drift), then text-asserts the call-site wiring.
// Mirrors scripts/test-fs-path-scoping.mjs / test-issues.mjs.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}
async function rejects(fn) { try { await fn(); return false; } catch (e) { return true; } }

const SRC = new URL('../src/js/versions.js', import.meta.url);
const src = fs.readFileSync(SRC, 'utf8');

// --- Evaluate the real index-read block ------------------------------------
const a = src.indexOf('    // Read the index for a chat.');
const b = src.indexOf('    async function writeIndex(chatId, index)');
if (a < 0 || b < 0 || b <= a) throw new Error('could not extract the index-read block from versions.js');
const block = src.slice(a, b);

// Build a fresh sandbox per case: the block declares readIndex /
// readIndexForDisplay and reaches out to puter.fs, the module-level cache, and a
// few UI hooks — all injected here.
function sandbox({ read, copy }) {
    const calls = { copies: [] };
    const puter = {
        fs: {
            read: async (p) => read(p),
            copy: async (...args) => { calls.copies.push(args); return {}; },
        },
    };
    if (copy) puter.fs.copy = async (...args) => { calls.copies.push(args); return copy(...args); };
    const indexCache = new Map();
    const factory = new Function(
        'puter', 'indexPath', 'versionsRootForChat', 'indexCache', 'currentChatId',
        'updateVersionNavButtons', 'window', 'isNotFoundError', 'console',
        block + '\n; return { readIndex, readIndexForDisplay };',
    );
    const api = factory(
        puter,
        (id) => `/u/AppData/app/.versions/${id}/index.json`,
        (id) => `/u/AppData/app/.versions/${id}`,
        indexCache,
        'chat1',
        () => {},
        { refreshPublishButton: () => {} },
        // The real isNotFoundError from app.js, by behavior: code/message sniffing.
        (e) => /not_?found|does_not_exist/i.test(e?.code || '') ||
            /not found|does not exist|no such/i.test(String(e?.message || e || '')),
        { warn: () => {} },
    );
    return { ...api, indexCache, calls };
}

const REAL = { current: 'v_2', versions: [{ id: 'v_1' }, { id: 'v_2' }] };
const notFound = Object.assign(new Error('subject does not exist'), { code: 'subject_does_not_exist' });
const network = Object.assign(new Error('Failed to fetch'), { code: 'network_error' });

// --- readIndex: the missing-vs-broken distinction ---------------------------
{
    const s = sandbox({ read: async () => { throw notFound; } });
    const idx = await s.readIndex('chat1');
    check('missing file → empty index (a brand-new project has no snapshots)',
        idx && idx.current === null && Array.isArray(idx.versions) && idx.versions.length === 0);
    check('missing file → does NOT cache the empty index', s.indexCache.size === 0);
}
{
    const s = sandbox({ read: async () => { throw network; } });
    check('transient read failure → THROWS (the core fix; must not read as "no versions")',
        await rejects(() => s.readIndex('chat1')));
}
{
    const s = sandbox({ read: async () => ({ text: async () => JSON.stringify(REAL) }) });
    const idx = await s.readIndex('chat1');
    check('valid index → parsed through', idx.current === 'v_2' && idx.versions.length === 2);
    check('valid index → cached', s.indexCache.get('chat1').current === 'v_2');
}
{
    const s = sandbox({ read: async () => ({ text: async () => JSON.stringify({ versions: [{ id: 'v_1' }] }) }) });
    const idx = await s.readIndex('chat1');
    check('index without a current pointer → normalized to null', idx.current === null);
}

// --- corrupt content: empty, but only with a backup parked -----------------
for (const [label, body] of [['unparseable JSON', '{not json'], ['wrong shape', '{"versions":"nope"}']]) {
    const s = sandbox({ read: async () => ({ text: async () => body }) });
    const idx = await s.readIndex('chat1');
    check(`corrupt (${label}) → empty index so the chat can self-heal`,
        idx.versions.length === 0 && idx.current === null);
    check(`corrupt (${label}) → parks an index.corrupt.json backup first`,
        s.calls.copies.length === 1 && s.calls.copies[0][2]?.newName === 'index.corrupt.json');
    check(`corrupt (${label}) → backup is overwrite-safe (idempotent)`,
        s.calls.copies[0][2]?.overwrite === true);
}
{
    // The backup is best-effort: a failing copy must not turn a recoverable
    // corrupt index into a hard read failure.
    const s = sandbox({
        read: async () => ({ text: async () => '{broken' }),
        copy: async () => { throw new Error('copy failed'); },
    });
    const idx = await s.readIndex('chat1');
    check('corrupt + failing backup copy → still returns empty, never throws', idx.versions.length === 0);
}

// --- readIndexForDisplay: never throws, never invents emptiness -------------
{
    const s = sandbox({ read: async () => { throw network; } });
    s.indexCache.set('chat1', REAL);
    const idx = await s.readIndexForDisplay('chat1');
    check('display read + failure + cache → serves the cached REAL history',
        idx && idx.versions.length === 2);
    check('display read + failure + cache → never an empty list', idx.versions.length !== 0);
}
{
    const s = sandbox({ read: async () => { throw network; } });
    const idx = await s.readIndexForDisplay('chat1');
    check('display read + failure + no cache → null ("unknown"), NOT an empty index', idx === null);
}
{
    const s = sandbox({ read: async () => { throw notFound; } });
    const idx = await s.readIndexForDisplay('chat1');
    check('display read + genuinely missing → empty index (correct, not unknown)',
        idx && idx.versions.length === 0);
}

// --- call-site wiring -------------------------------------------------------
// The mutating callers must use the THROWING read, so an unknown outcome aborts
// them instead of being written back over real history.
const mutators = [
    ['performCreateVersion', 'const index = await readIndex(chatId);'],
    ['relabelVersion', 'const index = await readIndex(chatId);'],
    ['restoreVersion pre-flight', 'let index = await readIndex(chatId);'],
];
for (const [name, needle] of mutators) {
    check(`wiring: ${name} uses the throwing readIndex`, src.includes(needle));
}
check('wiring: restoreVersion post-restore re-read falls back instead of aborting',
    src.includes('index = (await readIndexForDisplay(chatId)) || fallbackIndex;'));
// … and that read-modify-write runs as a snapshotChain link, so the background
// AI relabel of the last snapshot (also a chain link) can never write a stale
// `current` back over the restore's.
check('wiring: restoreVersion final index write is serialized on snapshotChain',
    /await \(snapshotChain = snapshotChain\.catch\(function \(\) \{\}\)\.then\(async function \(\) \{\s*index = \(await readIndexForDisplay\(chatId\)\) \|\| fallbackIndex;/.test(src));

// The read-only surfaces must use the non-throwing wrapper.
check('wiring: versions panel uses readIndexForDisplay',
    src.includes('const index = await readIndexForDisplay(chatId);'));
check('wiring: panel renders an explicit "unavailable" state, never a false empty list',
    src.includes('renderVersionsUnavailable();') && src.includes('function renderVersionsUnavailable()'));
check('wiring: unavailable state is worded differently from the empty state',
    src.includes('load version history') && !/renderVersionsUnavailable[\s\S]{0,400}No versions yet/.test(src));
check('wiring: undo/redo handler uses readIndexForDisplay',
    src.includes('await readIndexForDisplay(currentChatId)'));
check('wiring: background toolbar prefetch uses readIndexForDisplay (unawaited → no unhandled rejection)',
    src.includes('!indexCache.has(currentChatId)) readIndexForDisplay(currentChatId);'));
check('wiring: no bare readIndex left on an unawaited/display path',
    !/[^y]\breadIndex\(currentChatId\)/.test(src.replace(/readIndexForDisplay\(currentChatId\)/g, 'X')));

console.log(failures === 0 ? '\nAll version-index integrity checks passed' : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
