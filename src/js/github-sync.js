// github-sync.js — GitHub sync engine (window.GitHubSync), the I/O half of
// js/github-core.js.
//
// A linked project saves every version as a commit on one branch of the
// user's repository, and commits made on GitHub come back in as new versions.
// Builder's version history stays the record: GitHub mirrors it and sends
// changes in. The rules every pass keeps:
//   * Take in, then send. A pass first brings GitHub's changes into the
//     project, and only then sends Builder's, so a commit can never undo a
//     change it hasn't seen.
//   * Compare and swap. A commit's parent is the head Builder just read, and
//     the branch moves only if it still points there (GraphQL updateRefs with
//     beforeOid). Builder never force-pushes and never rewrites history.
//   * Content decides. Every decision compares git blob hashes of three
//     states, the base (the last commit fully taken in), Builder's current
//     version and GitHub's head (GitHubCore.planPaths). Different files
//     combine. A file changed in both places keeps the project's copy and
//     shows a card, and GitHub's copy stays one click away in its history.
//   * No write into the project unless it is provably idle, and every write
//     ends with a version (versions.js applyExternalUpdate).
//   * The AI hears first: pulled files go into the Code view's hidden note and
//     overwrite guard (code-editor.js), on every device.
//
// Sign-in sits behind one provider (Auth below). Development uses a pasted
// fine-grained personal access token. Production swaps in a GitHub App that
// signs in through a popup, with a small Puter worker doing the code exchange
// and refresh, since a client secret can't live in the browser. Nothing below
// Auth knows which one is in use.
//
// Storage: the link record is /<user>/AppData/<appID>/.repos/<chatId>.json, a
// dot-prefixed sibling of the project folders like .versions and .issues, so
// hosting never serves it and the AI's tools can't reach it. The sign-in is a
// puter.kv entry marked disableSharing. Each version's file hashes are cached
// beside its snapshot as .versions/<chatId>/<versionId>.git.json (snapshots
// never change, so neither does the cache).

(function () {
    'use strict';

    // Off unless both flags are on: the AI hears about pulled files through
    // the Code view's note and guard, which do nothing without codeEditor.
    const F = window.FEATURE_FLAGS || {};
    if (!F.githubSync || !F.codeEditor || !window.GitHubCore) return;
    const Core = window.GitHubCore;

    const API = 'https://api.github.com';
    const AUTH_KEY = 'github:auth';
    // Which files sync. 2: every file but Git's and Puter's folders, old
    // deploy markers and system junk (GitHubCore.isExcluded). A link record
    // agreed its base under 1 until its first pass under 2 (see the pass).
    const RULES = 2;
    // How long a new version waits for the AI's short label before it is sent
    // with the user's own words as its title.
    const LABEL_WAIT_MS = 10000;
    // The longest a send waits for the GitHub step before the turn starts.
    const PRE_TURN_CAP_MS = 20000;
    const READ_CONCURRENCY = 6;
    const NOTE_TEXT_LIMIT = 200000;

    function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
    function username() { return (window.user && window.user.username) || ''; }
    function appDirFor(chatId) { return `/${username()}/AppData/${puter.appID}/${chatId}`; }
    function notFound(e) { return typeof isNotFoundError === 'function' && isNotFoundError(e); }
    function openChat() { return typeof currentChatId !== 'undefined' ? currentChatId : null; }
    function track(event, props) { try { window.track?.(event, props); } catch (e) { /* never */ } }
    function toast(text, opts) { window.showToast?.(text, Object.assign({ type: 'info', duration: 5000 }, opts || {})); }
    function filesBand(n) { return n <= 1 ? '1' : n <= 5 ? '2-5' : n <= 20 ? '6-20' : '21+'; }

    // ---- Sign-in ----------------------------------------------------------

    const Auth = {
        _cache: undefined, // undefined: not read yet. null: signed out.
        async read() {
            if (this._cache !== undefined) return this._cache;
            try {
                const v = await puter.kv.get(AUTH_KEY);
                this._cache = v && typeof v === 'object' && v.token ? v : null;
            } catch (e) {
                // KV unreachable (an account out of credits can't use it):
                // unknown is not signed in, but don't remember it as such.
                return null;
            }
            return this._cache;
        },
        async token() {
            const a = await this.read();
            return a ? a.token : null;
        },
        // Development provider: a fine-grained personal access token with
        // Contents read and write (plus Administration write to create
        // repositories). Checked against GitHub before it is kept.
        async signInWithToken(token) {
            const t = String(token || '').trim();
            if (!/^(?:github_pat_|ghp_|gho_|ghu_)[A-Za-z0-9_]{20,}$/.test(t)) throw Object.assign(new Error('That doesn’t look like a GitHub token.'), { kind: 'bad-token' });
            const r = await gh('GET', '/user', { token: t });
            const value = { kind: 'token', token: t, login: r.data.login, id: r.data.id, savedAt: Date.now() };
            await puter.kv.set(AUTH_KEY, value, { disableSharing: true });
            this._cache = value;
            changed(null);
            track('GitHub Signed In', { provider: 'token' });
            return { login: value.login };
        },
        async signOut() {
            this._cache = null;
            try { await puter.kv.del(AUTH_KEY); } catch (e) { /* the memory copy is gone either way */ }
            changed(null);
        },
        // GitHub refused the token (revoked, expired). Forget it, so the
        // panel asks to sign in again instead of failing every pass.
        invalidate() {
            if (this._cache) this.signOut();
        },
    };

    // ---- GitHub API ---------------------------------------------------------

    // Mutating calls are spaced out: GitHub limits content-creating requests
    // to 80 a minute and asks for a second between them when there are many.
    let _mutChain = Promise.resolve();
    const _mutTimes = [];
    let _rateLimitedUntil = 0;
    function pace(method) {
        if (method === 'GET') return Promise.resolve();
        const run = _mutChain.then(async () => {
            const now = Date.now();
            while (_mutTimes.length && now - _mutTimes[0] > 60000) _mutTimes.shift();
            const gap = _mutTimes.length >= 10 ? 1000 : 0;
            const last = _mutTimes.length ? _mutTimes[_mutTimes.length - 1] : 0;
            const wait = Math.max(0, last + gap - now);
            if (wait) await sleep(wait);
            _mutTimes.push(Date.now());
        });
        _mutChain = run.catch(() => {});
        return run;
    }

    // stored: the call used the kept sign-in, so a refusal means it is no
    // longer good (a token being checked before it is kept is not).
    function failure(info, stored) {
        const c = Core.classifyError(info, Date.now());
        const e = new Error(info.message || c.kind);
        e.kind = c.kind;
        e.status = info.status;
        if (c.retryAt) e.retryAt = c.retryAt;
        if (c.kind === 'rate-limit') _rateLimitedUntil = Math.max(_rateLimitedUntil, c.retryAt || 0);
        if (c.kind === 'auth' && stored) Auth.invalidate();
        return e;
    }

    // One REST call. o: { token, body, etag, raw, scope }. Resolves
    // { status, data, etag } or { notModified: true } on a 304, or
    // { bytes } for o.raw. Throws an error with .kind (GitHubCore.classifyError).
    async function gh(method, path, o) {
        o = o || {};
        if (_rateLimitedUntil > Date.now()) throw failure({ status: 429, message: 'rate limited', headers: { 'retry-after': String(Math.ceil((_rateLimitedUntil - Date.now()) / 1000)) } });
        const token = o.token || await Auth.token();
        if (!token) throw failure({ status: 401, message: 'signed out' });
        const headers = {
            Accept: o.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
            Authorization: 'Bearer ' + token,
            'X-GitHub-Api-Version': '2022-11-28',
        };
        // A conditional request: GitHub answers 304 without counting it
        // against the hourly limit, and setting the header ourselves also
        // keeps the browser's own cache (refs are cached 60 s) out of it.
        if (o.etag) headers['If-None-Match'] = o.etag;
        let body;
        if (o.body !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(o.body); }
        await pace(method);
        let res;
        try {
            res = await fetch(API + path, { method, headers, body, cache: 'no-store' });
        } catch (e) {
            throw failure({ status: 0, network: true, message: String((e && e.message) || e) });
        }
        if (res.status === 304) return { notModified: true, status: 304 };
        if (!res.ok) {
            let data = null;
            try { data = await res.json(); } catch (e) { /* not JSON */ }
            const errors = data && Array.isArray(data.errors) ? data.errors.map((x) => (typeof x === 'string' ? x : x && x.message)).filter(Boolean) : [];
            throw failure({ status: res.status, message: [data && data.message, ...errors].filter(Boolean).join(' ') || res.statusText, headers: res.headers, scope: o.scope }, !o.token);
        }
        if (o.raw) return { status: res.status, bytes: new Uint8Array(await res.arrayBuffer()) };
        const data = res.status === 204 ? null : await res.json();
        return { status: res.status, data, etag: res.headers.get('ETag') };
    }

    async function graphql(query, variables) {
        const r = await gh('POST', '/graphql', { body: { query, variables } });
        const errors = r.data && r.data.errors;
        if (errors && errors.length) {
            throw failure({ status: 200, message: errors.map((x) => x.message).join(' '), graphqlErrors: errors });
        }
        return r.data && r.data.data;
    }

    function enc(s) { return encodeURIComponent(s); }
    function repoPath(repo) { return `/repos/${enc(repo.owner)}/${enc(repo.name)}`; }
    function toBase64(bytes) {
        let s = '';
        for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(s);
    }

    const Api = {
        repoFromData(d) {
            return {
                id: d.id, nodeId: d.node_id, owner: d.owner && d.owner.login, name: d.name,
                private: !!d.private, defaultBranch: d.default_branch || 'main', htmlUrl: d.html_url, archived: !!d.archived,
            };
        },
        async createRepo(name, isPrivate) {
            const r = await gh('POST', '/user/repos', { body: { name, private: !!isPrivate, auto_init: true } });
            return Api.repoFromData(r.data);
        },
        // The branch head: its commit, tree and whether it is protected.
        // null when it doesn't exist. etag: the previous answer, for a free
        // "nothing changed".
        async getHead(repo, branch, etag) {
            let r;
            try {
                r = await gh('GET', `${repoPath(repo)}/branches/${enc(branch)}`, { etag, scope: 'ref' });
            } catch (e) {
                if (e.kind === 'missing-ref') return null;
                throw e;
            }
            if (r.notModified) return { notModified: true };
            return { commit: r.data.commit.sha, tree: r.data.commit.commit.tree.sha, protected: !!r.data.protected, etag: r.etag };
        },
        async getTree(repo, treeSha) {
            const r = await gh('GET', `${repoPath(repo)}/git/trees/${treeSha}?recursive=1`);
            if (r.data.truncated) throw Object.assign(new Error('This repository is too big for Builder to keep in step with a project.'), { kind: 'too-big' });
            return r.data.tree || [];
        },
        async getBlob(repo, sha) { return (await gh('GET', `${repoPath(repo)}/git/blobs/${sha}`, { raw: true })).bytes; },
        async createBlob(repo, bytes) {
            return (await gh('POST', `${repoPath(repo)}/git/blobs`, { body: { content: toBase64(bytes), encoding: 'base64' } })).data.sha;
        },
        async createTree(repo, baseTree, entries) {
            return (await gh('POST', `${repoPath(repo)}/git/trees`, { body: { base_tree: baseTree, tree: entries } })).data.sha;
        },
        async createCommit(repo, message, tree, parents) {
            return (await gh('POST', `${repoPath(repo)}/git/commits`, { body: { message, tree, parents } })).data.sha;
        },
        // ahead / behind / diverged / identical, or 'gone' when the base
        // commit no longer exists (a force-push removed it).
        async compare(repo, base, head) {
            try {
                const r = await gh('GET', `${repoPath(repo)}/compare/${base}...${head}?per_page=100`);
                const commits = (r.data.commits || []).map((c) => ({ sha: c.sha, subject: String((c.commit && c.commit.message) || '').split('\n')[0] }));
                return { status: r.data.status, commits };
            } catch (e) {
                if (e.status === 404) return { status: 'gone', commits: [] };
                throw e;
            }
        },
        // Move the branch only if it still points at `before`. One atomic
        // compare-and-swap. The REST fast-forward check would let a commit
        // built on an old base slip onto a branch someone moved back.
        async moveBranch(repo, branch, before, after) {
            await graphql(
                'mutation($repo: ID!, $updates: [RefUpdate!]!) { updateRefs(input: { repositoryId: $repo, refUpdates: $updates }) { clientMutationId } }',
                { repo: repo.nodeId, updates: [{ name: 'refs/heads/' + branch, beforeOid: before, afterOid: after }] });
        },
    };

    // ---- The link record --------------------------------------------------

    function reposRoot() { return `/${username()}/AppData/${puter.appID}/.repos`; }
    function linkPath(chatId) { return reposRoot() + `/${chatId}.json`; }
    const _linkCache = new Map();
    const _forgotten = new Set();
    let _linkChain = Promise.resolve();

    function normalizeLink(x) {
        if (!x || typeof x !== 'object' || !x.repo || !x.branch) return null;
        return Object.assign({
            v: 1,
            rules: 1,
            base: { commit: null, tree: null, versionId: null, at: 0 },
            firstSync: null,
            keptOut: [],
            conflicts: [],
            toldKeys: [],
            pullSeq: 0,
            recentPulls: [],
            aiNotes: [],
            pause: null,
            sendPartial: null,
            builderCommits: [],
            disconnected: false,
        }, x);
    }

    // The stored record, or null. A missing file is a project that was never
    // linked. A corrupt one is parked as a backup and read as unlinked. Any
    // other failure throws: unknown is not "unlinked".
    async function readLink(chatId) {
        let txt;
        try {
            txt = await puter.fs.read(linkPath(chatId)).then((d) => d.text());
        } catch (e) {
            if (notFound(e)) { _linkCache.set(chatId, null); return null; }
            throw e;
        }
        let link = null;
        try { link = normalizeLink(JSON.parse(txt)); } catch (e) { link = null; }
        if (!link) {
            try { puter.fs.copy(linkPath(chatId), reposRoot(), { newName: `${chatId}.corrupt.json`, overwrite: true }).catch(() => {}); } catch (e) { /* best effort */ }
        }
        _linkCache.set(chatId, link);
        return link;
    }
    async function readLinkSafe(chatId) {
        try { return await readLink(chatId); } catch (e) { return _linkCache.get(chatId) || null; }
    }

    // Read, change, write, one at a time per tab, always from the file as it
    // is now, so a stale copy never wins. fn(link) returns the new record, or
    // undefined to leave it.
    function updateLink(chatId, fn) {
        const run = _linkChain.catch(() => {}).then(async () => {
            if (_forgotten.has(chatId)) return null;
            const cur = await readLink(chatId);
            const next = fn(cur ? JSON.parse(JSON.stringify(cur)) : null);
            if (next === undefined) return cur;
            await puter.fs.write(linkPath(chatId), JSON.stringify(next), { createMissingParents: true });
            _linkCache.set(chatId, normalizeLink(next));
            return _linkCache.get(chatId);
        });
        _linkChain = run.catch(() => {});
        return run;
    }

    function linkedFromCache(chatId) {
        const l = _linkCache.get(chatId);
        return !!(l && !l.disconnected);
    }

    // ---- Files and maps ---------------------------------------------------

    // Every file under root as [{rel, size}], skipping folders that never
    // sync (".git", ".puter" and the like) without listing them.
    async function walk(root) {
        const out = [];
        async function visit(dir, prefix) {
            let items;
            try {
                items = await puter.fs.readdir(dir);
            } catch (e) {
                if (notFound(e)) return;
                throw e;
            }
            for (const it of items || []) {
                const rel = prefix ? prefix + '/' + it.name : it.name;
                if (it.is_dir) {
                    // A folder whose every file would be left out (".git",
                    // ".puter", "__workers", ".github", dot-folders in assets).
                    if (Core.isExcluded(rel + '/x', {})) continue;
                    await visit(dir + '/' + it.name, rel);
                } else {
                    out.push({ rel, size: typeof it.size === 'number' ? it.size : null });
                }
            }
        }
        await visit(root, '');
        return out;
    }

    async function readBytes(path) {
        const blob = await puter.fs.read(path);
        return new Uint8Array(await blob.arrayBuffer());
    }

    async function forEachLimited(items, limit, fn) {
        let next = 0;
        let failure = null;
        const worker = async () => {
            while (!failure && next < items.length) {
                const item = items[next++];
                try { await fn(item); } catch (e) { if (!failure) failure = e; }
            }
        };
        await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
        if (failure) throw failure;
    }

    function normalizeDeps() {
        return {
            digest: (alg, data) => crypto.subtle.digest(alg, data),
            stripCacheBust: window.stripPreviewCacheBust,
        };
    }

    // Hash every syncable file under `root`: { files: { rel: { sha, size } },
    // generatedManifest }. Files that never sync whatever the context (".git",
    // ".puter" and so on) aren't read at all, and files too big for GitHub keep
    // their size and no hash. `keepBytes` also returns the bytes of small text
    // files, for the AI note's diffs.
    async function hashTree(root, servedPrefix, keepBytes) {
        const deps = normalizeDeps();
        const list = await walk(root);
        const files = {};
        const bytesOf = {};
        let generatedManifest = false;
        const manifestRel = servedPrefix ? servedPrefix + '/manifest.json' : 'manifest.json';
        await forEachLimited(list, READ_CONCURRENCY, async (f) => {
            const rel = Core.normalizePath(f.rel);
            if (!rel || Core.isExcluded(rel, {})) return;
            if (typeof f.size === 'number' && f.size > Core.MAX_FILE_BYTES) { files[rel] = { sha: null, size: f.size }; return; }
            const bytes = await readBytes(root + '/' + rel);
            if (rel === manifestRel) {
                try { generatedManifest = !!window.isGeneratedManifest?.(new TextDecoder().decode(bytes)); } catch (e) { /* not ours */ }
            }
            const norm = Core.normalizeForGit(rel, bytes, deps);
            files[rel] = { sha: await Core.gitBlobSha(norm, deps.digest), size: bytes.length };
            if (keepBytes && bytes.length <= NOTE_TEXT_LIMIT) bytesOf[rel] = bytes;
        });
        return { files, generatedManifest, bytesOf };
    }

    // A version's hashes, cached for good beside its snapshot.
    const _versionHashes = new Map();
    function versionHashPath(chatId, versionId) { return window.versionSnapshotDir(chatId, versionId) + '.git.json'; }
    async function versionHashes(chatId, versionId, servedPrefix) {
        const key = chatId + ':' + versionId;
        if (_versionHashes.has(key)) return _versionHashes.get(key);
        try {
            const cached = JSON.parse(await puter.fs.read(versionHashPath(chatId, versionId)).then((d) => d.text()));
            if (cached && cached.v === 3 && cached.files && cached.servedPrefix === (servedPrefix || '')) {
                _versionHashes.set(key, cached);
                return cached;
            }
        } catch (e) { /* not cached yet */ }
        const h = await hashTree(window.versionSnapshotDir(chatId, versionId), servedPrefix, false);
        // v3: hashed under rules 2, pages with Builder's install tags in them.
        const value = { v: 3, servedPrefix: servedPrefix || '', files: h.files, generatedManifest: h.generatedManifest };
        _versionHashes.set(key, value);
        try { await puter.fs.write(versionHashPath(chatId, versionId), JSON.stringify(value)); } catch (e) { /* recomputed next time */ }
        return value;
    }

    // Hashes to a sync map under the current exclusion context.
    function mapOf(hashes, ctx) {
        const map = {};
        const excluded = [];
        for (const rel of Object.keys(hashes.files).sort()) {
            const f = hashes.files[rel];
            const reason = Core.isExcluded(rel, Object.assign({}, ctx, {
                size: f.size,
                lfs: !!(ctx.lfsMatch && ctx.lfsMatch(rel)),
                generatedManifest: ctx.generatedManifest,
            }));
            if (reason || !f.sha) { excluded.push({ path: rel, reason: reason || 'too-big' }); continue; }
            map[rel] = f.sha;
        }
        return { map, excluded };
    }

    const _trees = new Map();
    async function treeOf(link, treeSha) {
        if (_trees.has(treeSha)) return _trees.get(treeSha);
        const entries = await Api.getTree(link.repo, treeSha);
        _trees.set(treeSha, entries);
        if (_trees.size > 20) _trees.delete(_trees.keys().next().value);
        return entries;
    }

    const _lfs = new Map();
    async function lfsMatchFor(link, entries) {
        const attrs = entries.find((e) => e.path === '.gitattributes' && e.type === 'blob');
        if (!attrs) return null;
        if (!_lfs.has(attrs.sha)) {
            const text = new TextDecoder().decode(await Api.getBlob(link.repo, attrs.sha));
            _lfs.set(attrs.sha, /filter=lfs/.test(text) ? Core.lfsMatcher(text) : null);
        }
        return _lfs.get(attrs.sha);
    }

    // The project-relative paths of this project's deployed backends. A failed
    // listing fails the pass: guessing "none" would send their keys.
    const _owned = new Map();
    async function ownedWorkersOf(appDir) {
        const hit = _owned.get(appDir);
        if (hit && Date.now() - hit.at < 60000) return hit.paths;
        const list = await puter.workers.list();
        const paths = (window.WorkerOwnership ? window.WorkerOwnership.ownedWorkers(list, appDir) : [])
            .map((w) => String(w.file_path).slice(appDir.length + 1))
            .filter(Boolean);
        _owned.set(appDir, { at: Date.now(), paths });
        return paths;
    }

    // The folder the preview serves, relative to the project. Known for the
    // open project, remembered for the others.
    const _served = new Map();
    function servedPrefixOf(chatId, appDir) {
        if (chatId === openChat()) {
            const p = window.currentPreviewPath;
            const prefix = typeof p === 'string' && p.startsWith(appDir + '/') ? p.slice(appDir.length + 1) : '';
            _served.set(chatId, prefix);
        }
        return _served.get(chatId) || '';
    }

    // ---- State for the panel ------------------------------------------------

    const _state = new Map();
    // The state each project's last pass ended on. A check carries it as
    // prev, so the panel keeps showing it while the check runs instead of
    // flashing "Checking" over a result that usually comes back the same.
    const _settled = new Map();
    const PASSING = ['checking', 'saving', 'bringing'];
    function changed(chatId) {
        try { window.dispatchEvent(new CustomEvent('github-sync-changed', { detail: { chatId } })); } catch (e) { /* never */ }
    }
    function setState(chatId, s) {
        const next = s ? Object.assign({ at: Date.now() }, s) : null;
        if (!next) _settled.delete(chatId);
        else if (!PASSING.includes(next.kind)) _settled.set(chatId, next);
        else if (next.kind === 'checking' && _settled.has(chatId)) next.prev = _settled.get(chatId);
        _state.set(chatId, next);
        changed(chatId);
        return s;
    }

    // ---- Busy rules ---------------------------------------------------------

    // Turns per project, by sequence number, from the send's setup until the
    // turn has fully unwound. A stopped turn's tool can still write after
    // isProcessing drops, and a switch to another project clears the globals.
    const _turns = new Map();
    const _turnLocks = new Map();
    function turnActive(chatId) { return !!(_turns.get(chatId) && _turns.get(chatId).size); }
    function projectLockName(chatId) { return 'builder-project:' + username() + ':' + chatId; }

    // Why GitHub's files can't be written into the project right now, or null.
    function busyReason(chatId, trigger) {
        if (chatId !== openChat()) return 'not-open';
        if (typeof isProcessing !== 'undefined' && isProcessing) return 'ai';
        if (trigger !== 'pre-turn' && typeof _sendSetupInFlight !== 'undefined' && _sendSetupInFlight) return 'ai';
        if (turnActive(chatId)) return 'ai';
        if (window._restoringVersion || window.isRestoreStarting?.(chatId)) return 'busy';
        if (window.isPublishInFlight?.(chatId) || window.isPublishStarting?.(chatId)) return 'busy';
        if (typeof _loadChatSeq !== 'undefined' && typeof _loadChatSettledSeq !== 'undefined' && _loadChatSeq !== _loadChatSettledSeq) return 'busy';
        if (window.CodeEditor?.hasUnsavedEdits?.(chatId)) return 'unsaved-code';
        return null;
    }

    // ---- The pass -------------------------------------------------------------

    const _passes = new Map(); // chatId -> { running, again, timer }
    const _busy = new Set(); // chats with a pass writing right now
    const _labeled = new Set();
    const _labelWaiters = new Map();
    const _retries = new Map();

    function schedulePass(chatId, trigger, delayMs) {
        if (!chatId) return;
        const slot = _passes.get(chatId) || {};
        _passes.set(chatId, slot);
        if (slot.timer) clearTimeout(slot.timer);
        slot.timer = setTimeout(() => { slot.timer = null; runPass(chatId, trigger); }, delayMs || 0);
    }

    // One pass per project at a time in this tab, and across tabs too when
    // the browser has Web Locks. A trigger during a pass runs one more after.
    function runPass(chatId, trigger) {
        const slot = _passes.get(chatId) || {};
        _passes.set(chatId, slot);
        if (slot.running) { slot.again = trigger || 'again'; return slot.running; }
        const body = async () => {
            try {
                await pass(chatId, trigger);
                _retries.delete(chatId);
            } catch (e) {
                onPassError(chatId, e);
            }
        };
        const locked = navigator.locks && typeof navigator.locks.request === 'function'
            ? () => navigator.locks.request('builder-github:' + username() + ':' + chatId, body)
            : body;
        slot.running = Promise.resolve().then(locked).finally(() => {
            slot.running = null;
            if (slot.again) {
                const t = slot.again;
                slot.again = null;
                runPass(chatId, t);
            }
        });
        return slot.running;
    }

    function onPassError(chatId, e) {
        const kind = (e && e.kind) || 'unknown';
        console.warn('GitHub sync:', kind, e);
        const attempt = (_retries.get(chatId) || 0);
        if (kind === 'network' || kind === 'server' || kind === 'unknown') {
            _retries.set(chatId, attempt + 1);
            const wait = Core.backoffMs(attempt);
            setState(chatId, { kind: 'waiting', reason: navigator.onLine === false ? 'offline' : 'unreachable', retryAt: Date.now() + wait });
            schedulePass(chatId, 'retry', wait);
            return;
        }
        if (kind === 'rate-limit') {
            const at = e.retryAt || Date.now() + 60000;
            setState(chatId, { kind: 'waiting', reason: 'slowed', retryAt: at });
            schedulePass(chatId, 'retry', Math.max(1000, at - Date.now()));
            return;
        }
        if (kind === 'auth') return setState(chatId, { kind: 'signed-out' });
        if (kind === 'no-access') return setState(chatId, { kind: 'repo-missing' });
        if (kind === 'missing-ref') return setState(chatId, { kind: 'branch-missing' });
        if (kind === 'rules' || kind === 'signed-required') return setState(chatId, { kind: 'rules', signed: kind === 'signed-required' });
        if (kind === 'archived') return setState(chatId, { kind: 'archived' });
        if (kind === 'too-big') return setState(chatId, { kind: 'too-big' });
        if (kind === 'secret') return setState(chatId, { kind: 'secret', tier: 'block', path: e.path || null, byGitHub: true });
        setState(chatId, { kind: 'error', message: e && e.message });
    }

    async function pass(chatId, trigger) {
        const user = window.refreshUserPlan ? await window.refreshUserPlan() : window.user;
        let link = await readLink(chatId);
        if (!link || link.disconnected) return setState(chatId, null);
        // A pause is remembered, so the first sync after it asks before the
        // project's copy of a file both sides changed goes out
        // (GitHubCore.holdCollisionsForReview).
        const pauseFor = async (reason) => {
            if (link.lastPause !== reason) await updateLink(chatId, (l) => (l ? Object.assign(l, { lastPause: reason }) : undefined));
        };
        if (!window.Branding || !window.Branding.isSubscribed(user)) { await pauseFor('lapsed'); return setState(chatId, { kind: 'lapsed' }); }
        if (!(await Auth.token())) { await pauseFor('signed-out'); return setState(chatId, { kind: 'signed-out' }); }
        if (link.pause && link.pause.reason === 'history' && trigger !== 'choice') {
            return setState(chatId, { kind: 'history', head: link.pause.head });
        }
        const appDir = appDirFor(chatId);
        setState(chatId, { kind: 'checking' });

        for (let round = 0; round < 4; round++) {
            link = await readLink(chatId);
            if (!link || link.disconnected) return setState(chatId, null);
            const head = await Api.getHead(link.repo, link.branch);
            if (!head) throw Object.assign(new Error('branch missing'), { kind: 'missing-ref' });

            let index = await window.readVersionIndexFresh(chatId);
            // A project whose files match no version (a partial restore, or
            // edits before its first version) gets one first, but only while
            // it is open and idle here: another tab could be mid-turn in it.
            if (!index.current) {
                const why = busyReason(chatId, trigger);
                if (why) return setState(chatId, { kind: 'waiting', reason: why === 'not-open' ? 'not-a-version' : why });
                if (!(await saveFolderAsVersion(chatId, appDir))) return setState(chatId, { kind: 'waiting', reason: 'not-a-version' });
                continue;
            }

            const servedPrefix = servedPrefixOf(chatId, appDir);
            const vHashes = await versionHashes(chatId, index.current, servedPrefix);
            const headEntries = await treeOf(link, head.tree);
            // generatedManifest is only for reading an older record's base
            // under its own rules (legacy, below).
            const ctx = {
                servedPrefix,
                keptOut: new Set(link.keptOut.map((k) => k.path)),
                generatedManifest: !!vHashes.generatedManifest,
                lfsMatch: await lfsMatchFor(link, headEntries),
            };
            const V = mapOf(vHashes, ctx);
            const G = Core.treeToMap(headEntries, ctx);

            // The base: GitHub's tree at the last commit both sides agreed on.
            // firstSync wins over it. 'send' is a new repository's first save,
            // in one step. GitHub's starter README goes (a project with its own
            // replaces it), so neither side has a file the other doesn't, and
            // nothing comes in right after the repository was made. After
            // GitHub's history changed, the user's choice is 'send' or 'bring'
            // (resolveHistory). A record that agreed its base under older rules
            // reads it under those (legacy). Then a file GitHub has that
            // Builder used to leave out comes in, instead of reading as deleted
            // here.
            const legacyBase = (link.rules || 1) < RULES && !!link.base.tree && !link.firstSync;
            let B;
            if (link.firstSync === 'send') B = { map: G.map, modes: G.modes };
            else if (link.firstSync === 'bring') B = { map: V.map, modes: {} };
            else if (!link.base.tree) B = { map: {}, modes: {} };
            else B = Core.treeToMap(await treeOf(link, link.base.tree), legacyBase ? Object.assign({}, ctx, { legacy: true }) : ctx);

            // An older record goes through the take-in once even when GitHub
            // hasn't moved, so what GitHub has beyond the old rules comes in,
            // and its base is agreed again under the current ones.
            if (head.commit !== link.base.commit || link.firstSync || legacyBase) {
                if (Core.sameFiles(G.map, V.map)) {
                    await setBase(chatId, head, index.current, { clearFirst: true });
                    continue;
                }
                let commits = [];
                if (!link.firstSync) {
                    const cmp = await Api.compare(link.repo, link.base.commit, head.commit);
                    commits = cmp.commits;
                    if (Core.classifyCompare(cmp.status) === 'ask') {
                        await updateLink(chatId, (l) => (l ? Object.assign(l, { pause: { reason: 'history', head: head.commit, status: cmp.status, at: Date.now() } }) : undefined));
                        track('GitHub History Changed', { status: cmp.status });
                        return setState(chatId, { kind: 'history', head: head.commit });
                    }
                }
                const plan = Core.planPaths(B.map, V.map, G.map, { guardPaths: guardPathsFor(link, index) });
                if (plan.collisions.length) await recordConflicts(chatId, plan.collisions, head.commit);
                if (plan.pull.length) {
                    const why = busyReason(chatId, trigger);
                    if (why) return setState(chatId, { kind: 'waiting', reason: why });
                    const r = await takeIn(chatId, appDir, link, head, plan, commits, index, V, vHashes, ctx, trigger);
                    if (r === 'replan') continue;
                    if (r !== 'ok') return;
                } else {
                    await setBase(chatId, head, Core.sameFiles(G.map, V.map) ? index.current : null, { clearFirst: true });
                }
                if (trigger === 'pre-turn') { schedulePass(chatId, 'after-pull', 500); return; }
                continue;
            }

            // GitHub hasn't moved since the base: send what the project has.
            if (Core.sameFiles(V.map, B.map)) return setState(chatId, upToDateState(link));
            if (trigger === 'pre-turn') { schedulePass(chatId, 'version', 500); return; }
            const entry = index.versions.find((v) => v.id === index.current) || {};
            if (entry.partial && link.sendPartial !== entry.id) return setState(chatId, { kind: 'waiting', reason: 'stopped', versionId: entry.id });
            await waitForLabel(chatId, entry);
            const r = await send(chatId, appDir, link, head, B, V, index, entry);
            if (r === 'stale') continue;
            return;
        }
        // Lost the race four times in a row: someone else is pushing fast.
        throw Object.assign(new Error('GitHub kept changing'), { kind: 'network' });
    }

    function upToDateState(link) {
        const open = (link.conflicts || []).filter((c) => !c.dismissed);
        return open.length ? { kind: 'collision', paths: open.map((c) => c.path) } : { kind: 'up-to-date', checkedAt: Date.now() };
    }

    // Paths a pull wrote after the turn behind this version started: where the
    // version changed one, the AI may have written it from its memory of the
    // old file, so it is a card, never a silent revert (GitHubCore.planPaths).
    function guardPathsFor(link, index) {
        const entry = index.versions.find((v) => v.id === index.current);
        if (!entry || typeof entry.pullSeq !== 'number') return null;
        const out = new Set();
        for (const p of link.recentPulls || []) if (p.seq > entry.pullSeq) for (const path of p.paths || []) out.add(path);
        return out;
    }

    async function setBase(chatId, head, versionId, o) {
        return updateLink(chatId, (l) => {
            if (!l) return undefined;
            l.base = { commit: head.commit, tree: head.tree, versionId: versionId || null, at: Date.now() };
            l.rules = RULES;
            if (o && o.clearFirst) l.firstSync = null;
            if (o && o.pulledPaths) l.conflicts = (l.conflicts || []).filter((c) => !o.pulledPaths.includes(c.path));
            return l;
        });
    }

    async function recordConflicts(chatId, collisions, githubCommit) {
        await updateLink(chatId, (l) => {
            if (!l) return undefined;
            const byPath = new Map((l.conflicts || []).map((c) => [c.path, c]));
            for (const c of collisions) {
                byPath.set(c.path, { path: c.path, kind: c.kind, baseSha: c.baseSha, githubSha: c.githubSha, githubCommit, at: Date.now() });
            }
            l.conflicts = Array.from(byPath.values());
            return l;
        });
        track('GitHub Conflict Shown', { files_band: filesBand(collisions.length) });
    }

    function waitForLabel(chatId, entry) {
        if (!entry || entry.labelSource !== 'user' || _labeled.has(chatId + ':' + entry.id)) return Promise.resolve();
        const age = Date.now() - Date.parse(entry.createdAt || 0);
        if (!(age >= 0) || age > LABEL_WAIT_MS) return Promise.resolve();
        return new Promise((resolve) => {
            const key = chatId + ':' + entry.id;
            const t = setTimeout(() => { _labelWaiters.delete(key); resolve(); }, LABEL_WAIT_MS - age);
            _labelWaiters.set(key, () => { clearTimeout(t); resolve(); });
        });
    }

    async function saveFolderAsVersion(chatId, appDir) {
        if (chatId === openChat()) await window.CodeEditor?.checkpointNow?.(chatId, appDir);
        if (!window.isProjectDirty?.(chatId)) {
            const idx = await window.readVersionIndexFresh(chatId);
            if (idx.current) return true;
        }
        const r = await window.createProjectVersion?.({ chatId, appDir, label: 'Saved before update from GitHub' });
        return typeof r === 'string';
    }

    // ---- Take in ------------------------------------------------------------

    async function takeIn(chatId, appDir, link, head, plan, commits, index, V, vHashes, ctx, trigger) {
        // Edits that aren't a version yet are saved as one first, so the
        // previous state is always one Restore away.
        if (window.isProjectDirty?.(chatId) || (window.CodeEditor?.turnPrepNeeded?.(chatId) && !window.CodeEditor?.hasUnsavedEdits?.(chatId))) {
            await saveFolderAsVersion(chatId, appDir);
            return 'replan';
        }
        _busy.add(chatId);
        setState(chatId, { kind: 'bringing' });
        try {
            // The folder must hold exactly the current version. Another tab or
            // device may have written files that are in no version yet. Those
            // become a version first, and the plan is made again.
            const disk = await hashTree(appDir, ctx.servedPrefix, true);
            const D = mapOf(disk, ctx);
            if (!Core.sameFiles(D.map, V.map)) {
                await window.createProjectVersion?.({ chatId, appDir, label: 'Saved before update from GitHub' });
                return 'replan';
            }

            const writes = [];
            const deletes = [];
            const noteFiles = [];
            const keptOut = [];
            const keyed = [];
            await forEachLimited(plan.pull.filter((p) => p.sha), 4, async (p) => {
                const bytes = await Api.getBlob(link.repo, p.sha);
                if (await Core.gitBlobSha(bytes, normalizeDeps().digest) !== p.sha) throw Object.assign(new Error('a file from GitHub did not arrive intact'), { kind: 'network' });
                if (Core.isLfsPointer(bytes)) { keptOut.push({ path: p.path, reason: 'lfs' }); return; }
                const text = Core.isText(bytes) ? new TextDecoder().decode(bytes) : null;
                // A key in a file from the repository comes in like any file,
                // and the AI warns the user about it in the chat (keyNews).
                if (Core.isKeyFileName(p.path) || (text != null && Core.scanSecrets(text).length)) keyed.push(p.path);
                writes.push({ path: appDir + '/' + p.path, bytes, rel: p.path, text });
            });
            for (const p of plan.pull) if (!p.sha) deletes.push(appDir + '/' + p.path);
            for (const w of writes) {
                const beforeBytes = disk.bytesOf[w.rel];
                noteFiles.push({
                    path: w.path,
                    kind: Object.prototype.hasOwnProperty.call(V.map, w.rel) ? 'changed' : 'added',
                    before: beforeBytes && w.text != null && Core.isText(beforeBytes) ? new TextDecoder().decode(beforeBytes) : null,
                    after: w.text != null && w.text.length <= NOTE_TEXT_LIMIT ? w.text : null,
                });
            }
            for (const d of deletes) noteFiles.push({ path: d, kind: 'removed' });
            if (keptOut.length) {
                await updateLink(chatId, (l) => {
                    if (!l) return undefined;
                    for (const k of keptOut) if (!l.keptOut.some((x) => x.path === k.path)) l.keptOut.push(k);
                    return l;
                });
            }
            if (!writes.length && !deletes.length) {
                await setBase(chatId, head, null, { clearFirst: true });
                return 'ok';
            }

            const entry = index.versions.find((v) => v.id === index.current) || {};
            const count = writes.length + deletes.length;
            const res = await window.applyExternalUpdate({
                chatId,
                appDir,
                writes: writes.map((w) => ({ path: w.path, bytes: w.bytes })),
                deletes,
                labelSource: 'github',
                label: Core.pullLabel(head.commit),
                expectCurrent: index.current,
                partial: !!entry.partial,
                note: `*Brought in changes from GitHub (${count} file${count === 1 ? '' : 's'}).*`,
                allowDuringSendSetup: trigger === 'pre-turn',
            });
            if (!res.ok) {
                if (res.reason === 'moved' || res.reason === 'dirty') return 'replan';
                if (res.reason === 'write-failed') {
                    setState(chatId, { kind: 'error', message: 'Couldn’t finish bringing in the GitHub changes. The previous version is in Version history.' });
                    return 'failed';
                }
                setState(chatId, { kind: 'waiting', reason: res.reason === 'unsaved-code' ? 'unsaved-code' : 'busy' });
                return 'failed';
            }

            // Tell the AI on this device now, and on others through the record.
            const conflictPaths = plan.collisions.map((c) => appDir + '/' + c.path);
            const noteId = 'gh-' + head.commit.slice(0, 12) + '-' + Date.now().toString(36);
            const clean = plan.pull.map((p) => p.path).filter((p) => !keyed.includes(p));
            const keyPaths = keyNews((_linkCache.get(chatId) || link).toldKeys, keyed, clean).fresh.map((p) => appDir + '/' + p);
            const note = { id: noteId, files: noteFiles, commits: commits.slice(-5), collisions: conflictPaths, keys: keyPaths, publicRepo: !link.repo.private };
            window.CodeEditor?.importExternalChanges?.(chatId, note);
            // A pulled change to a deployed backend's code goes live on the
            // draft backend (the published one changes only on Publish), and
            // its keys stay in its store. Puter redeploys a worker when its
            // source file is written. Builder deploys once more to be sure, as
            // a Code view save does.
            const deployed = new Set(await ownedWorkersOf(appDir).catch(() => []));
            for (const w of writes) {
                if (deployed.has(w.rel)) Promise.resolve(window.redeployWorkerSource?.(appDir, w.path)).catch(() => {});
            }
            const pulled = plan.pull.map((p) => p.path);
            // The new version is exactly GitHub's head when nothing was kept
            // back, which lets the next commit list the versions it folds in.
            const exact = !plan.collisions.length && !plan.push.length && !keptOut.length;
            await updateLink(chatId, (l) => {
                if (!l) return undefined;
                l.base = { commit: head.commit, tree: head.tree, versionId: exact ? res.versionId : null, at: Date.now() };
                l.rules = RULES;
                l.firstSync = null;
                l.pullSeq = (l.pullSeq || 0) + 1;
                l.recentPulls = (l.recentPulls || []).concat([{ seq: l.pullSeq, commit: head.commit, paths: pulled }]).slice(-20);
                l.toldKeys = keyNews(l.toldKeys, keyed, clean).told;
                l.aiNotes = (l.aiNotes || []).concat([{ id: noteId, files: noteFiles.map((f) => ({ path: f.path, kind: f.kind })), commits: note.commits, collisions: conflictPaths, keys: note.keys, publicRepo: note.publicRepo }]).slice(-20);
                l.conflicts = (l.conflicts || []).filter((c) => !pulled.includes(c.path));
                return l;
            });
            toast(`Brought in changes from GitHub (${count} file${count === 1 ? '' : 's'}).`, { key: 'github-pulled', throttleMs: 4000 });
            track('GitHub Brought In', { trigger: trigger || 'unknown', files_band: filesBand(count) });
            return 'ok';
        } finally {
            _busy.delete(chatId);
        }
    }

    // ---- Send ----------------------------------------------------------------

    async function send(chatId, appDir, link, head, B, V, index, entry) {
        // GitHub hasn't moved, so its side is the base. The turn rule still
        // applies: a file another device pulled while this version's turn ran
        // goes out with a card, never as a silent revert.
        const plan = Core.planPaths(B.map, V.map, B.map, { guardPaths: guardPathsFor(link, index) });
        if (plan.collisions.length) {
            await recordConflicts(chatId, plan.collisions, link.base.commit);
            link = (await readLink(chatId)) || link;
        }
        const conflictPaths = new Set((link.conflicts || []).filter((c) => !c.dismissed).map((c) => c.path));
        const hold = Core.holdCollisionsForReview({ baseAgeMs: Date.now() - (link.base.at || 0), pauseReason: link.lastPause || null });
        let push = Core.sendTree(plan, V.map, { includeCollisions: !hold });
        if (hold) push = push.filter((p) => !conflictPaths.has(p.path));
        if (!push.length) return setState(chatId, upToDateState(link));

        _busy.add(chatId);
        setState(chatId, { kind: 'saving' });
        try {
            const snap = window.versionSnapshotDir(chatId, index.current);
            const deps = normalizeDeps();
            const onGitHub = new Set(Object.values(B.map));
            const blobs = [];
            // A key written in a file never holds the save. The AI hears
            // about it with the user's next message and asks the user in the
            // chat (see tellAboutKeys).
            const keyed = [];
            const clean = [];
            for (const p of push) {
                if (!p.sha) { clean.push(p.path); continue; }
                const raw = await readBytes(snap + '/' + p.path);
                const bytes = Core.normalizeForGit(p.path, raw, deps);
                if (await Core.gitBlobSha(bytes, deps.digest) !== p.sha) throw Object.assign(new Error('a version file changed while sending'), { kind: 'unknown' });
                (Core.isKeyFileName(p.path) || (Core.isText(bytes) && Core.scanSecrets(new TextDecoder().decode(bytes)).length) ? keyed : clean).push(p.path);
                blobs.push({ path: p.path, sha: p.sha, bytes });
            }
            for (const b of blobs) {
                if (onGitHub.has(b.sha)) continue;
                const got = await Api.createBlob(link.repo, b.bytes);
                if (got !== b.sha) throw Object.assign(new Error('GitHub stored different bytes than Builder sent'), { kind: 'unknown' });
                onGitHub.add(b.sha);
            }
            const tree = push.map((p) => ({ path: p.path, mode: (B.modes && B.modes[p.path]) || '100644', type: 'blob', sha: p.sha }));
            const treeSha = await Api.createTree(link.repo, head.tree, tree);
            const message = commitMessageFor(link, index, entry, push, conflictPaths);
            const commit = await Api.createCommit(link.repo, message, treeSha, [head.commit]);
            try {
                await Api.moveBranch(link.repo, link.branch, head.commit, commit);
            } catch (e) {
                if (e.kind === 'stale') return 'stale';
                throw e;
            }
            await updateLink(chatId, (l) => {
                if (!l) return undefined;
                l.base = { commit, tree: treeSha, versionId: index.current, at: Date.now() };
                l.rules = RULES;
                l.firstSync = null;
                l.lastPause = null;
                l.sendPartial = null;
                l.builderCommits = (l.builderCommits || []).concat([commit]).slice(-50);
                return l;
            });
            await tellAboutKeys(chatId, appDir, link, keyed, clean);
            track('GitHub Saved', { kind: entry.labelSource === 'user' ? 'prompt' : 'label', files_band: filesBand(push.length) });
            return setState(chatId, upToDateState(await readLinkSafe(chatId) || link));
        } finally {
            _busy.delete(chatId);
        }
    }

    // Keys are never a reason to hold anything back, in either direction. A
    // file with what looks like a key goes to GitHub, or comes in from it,
    // like any file, and the AI warns the user about it in the chat. It hears
    // about each file once, with the user's next message on any device
    // (through the record, like a pull's note). toldKeys is the record's list
    // of those files. A file seen without a key drops off it, so a key added
    // back later is told again.
    function keyNews(told, keyed, clean) {
        const before = told || [];
        const kept = before.filter((p) => !clean.includes(p));
        const fresh = keyed.filter((p) => !kept.includes(p));
        return { told: kept.concat(fresh).slice(-100), fresh, changed: fresh.length > 0 || kept.length !== before.length };
    }

    // After a save: the files that just went to GitHub with a key in them.
    async function tellAboutKeys(chatId, appDir, link, keyed, clean) {
        // The cache is fresh here, since the base was just saved.
        if (!keyNews((_linkCache.get(chatId) || link).toldKeys, keyed, clean).changed) return;
        const note = { id: 'gh-keys-' + Date.now().toString(36), files: [], commits: [], collisions: [], keys: [], publicRepo: !link.repo.private };
        await updateLink(chatId, (l) => {
            if (!l) return undefined;
            const news = keyNews(l.toldKeys, keyed, clean);
            if (!news.changed) return undefined;
            l.toldKeys = news.told;
            if (news.fresh.length) {
                note.keys = news.fresh.map((p) => appDir + '/' + p);
                l.aiNotes = (l.aiNotes || []).concat([note]).slice(-20);
            }
            return l;
        });
        if (note.keys.length) {
            window.CodeEditor?.importExternalChanges?.(chatId, note);
            track('GitHub Key Saved', { files_band: filesBand(note.keys.length) });
        }
    }

    function commitMessageFor(link, index, entry, push, conflictPaths) {
        const ids = index.versions.map((v) => v.id);
        const at = ids.indexOf(index.current);
        const baseAt = link.base.versionId ? ids.indexOf(link.base.versionId) : -1;
        const restore = baseAt > -1 && at > -1 && at < baseAt;
        // A version brought in from GitHub stands for GitHub's own commits.
        // When it is the newest (Builder's changes were kept beside what came
        // in), the commit is named after the newest version Builder made, and
        // versions from GitHub are never listed as folded in.
        let named = entry;
        if (entry.labelSource === 'github') {
            named = null;
            for (let i = at - 1; i >= 0 && !named; i--) if (index.versions[i].labelSource !== 'github') named = index.versions[i];
        }
        const folded = !restore && baseAt > -1 && at > baseAt
            ? index.versions.slice(baseAt + 1, at)
                .filter((v) => v !== named && v.labelSource !== 'github')
                .map((v) => ({ label: v.label, fromUserMessage: v.labelSource === 'user' }))
            : [];
        const collisions = (link.conflicts || [])
            .filter((c) => conflictPaths.has(c.path) && push.some((p) => p.path === c.path))
            .map((c) => ({ path: c.path, githubSha: c.githubCommit }));
        return Core.commitMessage({
            label: named ? named.label : '',
            kind: restore ? 'restore' : 'version',
            fromUserMessage: !!named && named.labelSource === 'user',
            publicRepo: !link.repo.private,
            folded,
            collisions,
        }, { redact: Core.redactSecrets });
    }

    // ---- Notes for the AI on every device ------------------------------------

    function importNotes(chatId, link) {
        if (!link || !Array.isArray(link.aiNotes)) return;
        for (const n of link.aiNotes) window.CodeEditor?.importExternalChanges?.(chatId, n);
    }

    // ---- Connecting -------------------------------------------------------------

    // Link a project to a new repository. o: { name, isPrivate }. Builder only
    // saves a project to a repository it created for it, so there is never a
    // question of whose files, branch or history win. Stopping and saving
    // again later makes another new repository.
    async function connect(chatId, o) {
        o = o || {};
        const user = window.refreshUserPlan ? await window.refreshUserPlan() : window.user;
        if (!window.Branding || !window.Branding.isSubscribed(user)) throw Object.assign(new Error('Saving to GitHub is part of a paid Puter plan.'), { kind: 'plan' });
        const repo = await Api.createRepo(Core.repoNameFromTitle(o.name), o.isPrivate !== false);
        const branch = repo.defaultBranch || 'main';
        // A new repository answers 409 for a moment while GitHub sets it up.
        for (let i = 0; i < 8 && !(await Api.getHead(repo, branch).catch(() => null)); i++) await sleep(1250);
        _forgotten.delete(chatId);
        await updateLink(chatId, () => ({
            v: 1,
            rules: RULES,
            repo,
            branch,
            base: { commit: null, tree: null, versionId: null, at: Date.now() },
            firstSync: 'send',
            keptOut: [],
            conflicts: [],
            toldKeys: [],
            pullSeq: 0,
            recentPulls: [],
            aiNotes: [],
            pause: null,
            sendPartial: null,
            builderCommits: [],
            linkedAt: Date.now(),
            disconnected: false,
        }));
        track('GitHub Connected', { repo: 'new' });
        changed(chatId);
        await runPass(chatId, 'connect');
        return { repo, branch };
    }

    // ---- Public surface ---------------------------------------------------------

    window.GitHubSync = {
        // For the panel.
        auth: Auth,
        api: Api,
        stateFor(chatId) { return _state.get(chatId) || null; },
        linkFor(chatId) { return _linkCache.get(chatId) || null; },
        readLink: readLinkSafe,
        async signedInAs() { const a = await Auth.read(); return a ? a.login : null; },
        connect,
        checkNow(chatId) { return runPass(chatId || openChat(), 'user'); },
        // Stop syncing. The record stays, marked disconnected, so every tab and
        // device sees the project stopped. Saving again makes a new repository
        // (connect).
        async disconnect(chatId) {
            await updateLink(chatId, (l) => (l ? Object.assign(l, { disconnected: true }) : undefined));
            setState(chatId, null);
            track('GitHub Disconnected');
        },
        async includeAgain(chatId, path) {
            await updateLink(chatId, (l) => (l ? Object.assign(l, { keptOut: l.keptOut.filter((k) => k.path !== path) }) : undefined));
            return runPass(chatId, 'user');
        },
        async sendStoppedTurn(chatId, versionId) {
            await updateLink(chatId, (l) => (l ? Object.assign(l, { sendPartial: versionId }) : undefined));
            return runPass(chatId, 'user');
        },
        // The collision card: the project keeps its copy (the card goes), or
        // takes GitHub's copy back as a new version.
        async resolveConflict(chatId, path, choice) {
            const link = await readLink(chatId);
            const c = link && link.conflicts.find((x) => x.path === path);
            if (!c) return;
            if (choice === 'keep') {
                await updateLink(chatId, (l) => (l ? Object.assign(l, { conflicts: l.conflicts.filter((x) => x.path !== path) }) : undefined));
                track('GitHub Conflict Resolved', { choice: 'keep' });
                return changed(chatId);
            }
            if (choice === 'github') {
                const why = busyReason(chatId, 'user');
                if (why) { toast('Builder can bring GitHub’s copy in once the current task is done.'); return; }
                const appDir = appDirFor(chatId);
                const index = await window.readVersionIndexFresh(chatId);
                const writes = [];
                const deletes = [];
                if (c.githubSha) writes.push({ path: appDir + '/' + path, bytes: await Api.getBlob(link.repo, c.githubSha) });
                else deletes.push(appDir + '/' + path);
                const res = await window.applyExternalUpdate({
                    chatId, appDir, writes, deletes,
                    labelSource: 'github',
                    label: Core.pullLabel(c.githubCommit),
                    expectCurrent: index.current,
                    note: '*Switched 1 file to GitHub’s copy.*',
                });
                if (!res.ok) { toast('Builder couldn’t switch to GitHub’s copy right now. Try again in a moment.'); return; }
                const noteId = 'gh-copy-' + Date.now().toString(36);
                window.CodeEditor?.importExternalChanges?.(chatId, { id: noteId, files: [{ path: appDir + '/' + path, kind: c.githubSha ? 'changed' : 'removed' }], commits: [], collisions: [] });
                await updateLink(chatId, (l) => (l ? Object.assign(l, { conflicts: l.conflicts.filter((x) => x.path !== path) }) : undefined));
                track('GitHub Conflict Resolved', { choice: 'github' });
                return runPass(chatId, 'user');
            }
        },
        // GitHub's history was rewritten while the project had changes too.
        // 'github': the project takes GitHub's files exactly. 'project': the
        // project's files go on top of GitHub's new history. 'later': nothing
        // changes and syncing stays paused.
        async resolveHistory(chatId, choice) {
            if (choice === 'later') {
                await updateLink(chatId, (l) => (l ? Object.assign(l, { lastPause: 'history-not-now' }) : undefined));
                track('GitHub History Changed', { choice: 'later' });
                return changed(chatId);
            }
            await updateLink(chatId, (l) => (l ? Object.assign(l, {
                pause: null,
                firstSync: choice === 'github' ? 'bring' : 'send',
            }) : undefined));
            track('GitHub History Changed', { choice });
            return runPass(chatId, 'choice');
        },

        // Hooks from versions.js and app.js.
        onVersionsChanged(chatId) {
            if (!linkedFromCache(chatId)) {
                if (!_linkCache.has(chatId)) readLinkSafe(chatId).then((l) => { if (l && !l.disconnected) schedulePass(chatId, 'version', 300); });
                return;
            }
            schedulePass(chatId, 'version', 300);
        },
        onVersionLabeled(chatId, versionId) {
            const key = chatId + ':' + versionId;
            _labeled.add(key);
            const w = _labelWaiters.get(key);
            if (w) { _labelWaiters.delete(key); w(); }
        },
        onProjectOpen(chatId) {
            readLinkSafe(chatId).then((l) => {
                if (l && !l.disconnected) schedulePass(chatId, 'open', 1500);
                changed(chatId);
            });
        },
        onPlanChanged() {
            const chatId = openChat();
            if (chatId && linkedFromCache(chatId)) schedulePass(chatId, 'plan', 0);
            changed(chatId);
        },
        onTurnStart(chatId, seq) {
            if (!_turns.has(chatId)) _turns.set(chatId, new Set());
            _turns.get(chatId).add(seq);
            // Other tabs on this device: a pull there waits while this turn
            // holds the project's shared lock.
            if (linkedFromCache(chatId) && navigator.locks && typeof navigator.locks.request === 'function') {
                const key = chatId + ':' + seq;
                navigator.locks.request(projectLockName(chatId), { mode: 'shared' },
                    () => new Promise((resolve) => _turnLocks.set(key, resolve))).catch(() => {});
            }
        },
        onTurnEnd(chatId, seq) {
            const set = _turns.get(chatId);
            if (set) { set.delete(seq); if (!set.size) _turns.delete(chatId); }
            const key = chatId + ':' + seq;
            const release = _turnLocks.get(key);
            if (release) { _turnLocks.delete(key); release(); }
            const s = _state.get(chatId);
            if (!turnActive(chatId) && s && s.kind === 'waiting' && s.reason === 'ai') schedulePass(chatId, 'turn-end', 300);
        },
        // Before a turn starts (sendChatMessage). Notes from other devices are
        // imported for every turn. A typed message also checks GitHub and
        // takes its changes in first. Never throws, never blocks for long.
        async beforeTurn(t) {
            t = t || {};
            const link = await readLinkSafe(t.chatId);
            if (!link || link.disconnected) return;
            importNotes(t.chatId, link);
            if (t.autoFix || t.resume) return;
            const slot = _passes.get(t.chatId);
            if (slot && slot.timer) { clearTimeout(slot.timer); slot.timer = null; }
            await Promise.race([
                runPass(t.chatId, 'pre-turn'),
                sleep(PRE_TURN_CAP_MS),
            ]);
        },
        // The note went out with a message: other devices needn't tell it again.
        notePosted(chatId, ids) {
            if (!ids || !ids.length) return;
            updateLink(chatId, (l) => (l ? Object.assign(l, { aiNotes: (l.aiNotes || []).filter((n) => !ids.includes(n.id)) }) : undefined)).catch(() => {});
        },
        isBusy(chatId) { return _busy.has(chatId); },
        // How many pulls the project had taken in when a turn started. Saved
        // on the turn's version, so a pull that lands during the turn (from
        // another device) is told apart by the turn rule (guardPathsFor).
        pullSeqFor(chatId) {
            const l = _linkCache.get(chatId);
            return l && !l.disconnected && typeof l.pullSeq === 'number' ? l.pullSeq : undefined;
        },
        // deleteChat: the link record goes. The repository is never touched.
        async forgetProject(chatId) {
            _forgotten.add(chatId);
            _linkCache.delete(chatId);
            _state.delete(chatId);
            try { await _linkChain; } catch (e) { /* ignore */ }
            try { await puter.fs.delete(linkPath(chatId)); } catch (e) { if (!notFound(e)) throw e; }
        },
    };

    // Back on the tab, or back online: check the open project.
    let _lastFocusPass = 0;
    function onReturn() {
        if (document.visibilityState === 'hidden') return;
        const chatId = openChat();
        if (!chatId || !linkedFromCache(chatId) || Date.now() - _lastFocusPass < 30000) return;
        _lastFocusPass = Date.now();
        schedulePass(chatId, 'focus', 0);
    }
    window.addEventListener('focus', onReturn);
    document.addEventListener('visibilitychange', onReturn);
    window.addEventListener('online', () => { const c = openChat(); if (c && linkedFromCache(c)) schedulePass(c, 'online', 0); });
})();
