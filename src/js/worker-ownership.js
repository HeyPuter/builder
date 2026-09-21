// worker-ownership.js — pure helpers for serverless-worker ownership.
//
// Deployed Puter workers are ACCOUNT-level resources keyed only by name: they
// are not tied to the project (chat) that created them, and the builder keeps
// no explicit per-project worker registry. The ownership rule everything here
// builds on:
//
//   A project owns a deployed worker iff the worker's REGISTERED source file
//   (the file_path recorded by puter.workers.create, as reported by
//   puter.workers.list/get) lives inside that project's app directory.
//
// This is derivable for every worker ever deployed through create_worker (which
// always writes <appDir>/workers/<name>.js before deploying), so it needs no
// migration — and, critically, it is immune to the duplicate-project trap: a
// duplicated project carries a COPY of the original's workers/*.js files, but
// the deployed records still point at the ORIGINAL's directory, so the copy
// provably owns nothing until it deploys workers of its own.
//
// Consumers (app.js): deleteChat deletes a project's owned workers before
// removing its directory; duplicateChat redeploys the source's owned workers
// under fresh names for the copy and rewrites every reference via the rewrite
// helpers below.
//
// PURE by design: no I/O, no DOM, no window.* reads — evaluated with a bare
// window object by scripts/test-worker-ownership.mjs (same pattern as
// issues-core.js / test-issues.mjs).
window.WorkerOwnership = (function () {
    'use strict';

    // Tools whose args/results carry a worker NAME that must follow a rename.
    // list_workers is handled separately (its result nests names in an array).
    const NAME_TOOLS = ['create_worker', 'delete_worker', 'get_worker'];

    // Keep generated names comfortably inside subdomain-label territory (the
    // worker name becomes the host of its URL).
    const MAX_NAME_LENGTH = 50;

    function stripTrailingSlashes(s) {
        return String(s).replace(/\/+$/, '');
    }

    function escapeRegExp(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // The host of a worker URL, e.g. 'https://api.puter.work/' -> 'api.puter.work'.
    // Returns '' when the URL is unusable.
    function urlHost(url) {
        if (typeof url !== 'string' || !url) return '';
        try {
            return new URL(url).host;
        } catch (e) {
            // Not an absolute URL — tolerate a bare host or protocol-relative form.
            const m = String(url).match(/^(?:\/\/)?([A-Za-z0-9._-]+(?::\d+)?)(?:[/?#]|$)/);
            return m ? m[1] : '';
        }
    }

    // The deployed workers owned by the project at `appDir`. See the header
    // comment for the ownership rule. Prefix-matches with a trailing '/' so a
    // sibling directory that merely shares the chatId as a name prefix
    // ('…/abc' vs '…/abc2') can never be mistaken for the project itself.
    function ownedWorkers(workers, appDir) {
        if (!Array.isArray(workers) || typeof appDir !== 'string' || !stripTrailingSlashes(appDir)) return [];
        const prefix = stripTrailingSlashes(appDir) + '/';
        return workers.filter(w =>
            w && typeof w.name === 'string' && w.name.length > 0 &&
            typeof w.file_path === 'string' && w.file_path.indexOf(prefix) === 0);
    }

    // Every deployed record whose name matches `name` case-insensitively, exact
    // matches first. Worker names are account-global and the backend's case
    // rules are undocumented, so the create/delete tools compare conservatively
    // (a lone case-variant of a foreign name is treated as that worker, never as
    // a free name). Returns [] for unusable input.
    function matchesByName(workers, name) {
        if (!Array.isArray(workers) || typeof name !== 'string' || !name) return [];
        const lower = name.toLowerCase();
        const hits = workers.filter(w => w && typeof w.name === 'string' && w.name.toLowerCase() === lower);
        return hits.sort((a, b) => (a.name === name ? 0 : 1) - (b.name === name ? 0 : 1));
    }

    // The single deployed record `name` refers to: an exact match, else a
    // case-insensitive match only when it is unique (an ambiguous set must not
    // be guessed at — that could pick the wrong worker to delete). Null if none.
    function findByName(workers, name) {
        const hits = matchesByName(workers, name);
        const exact = hits.find(w => w.name === name);
        if (exact) return exact;
        return hits.length === 1 ? hits[0] : null;
    }

    // A fresh account-unique name for a copy's redeployed worker: the original
    // name plus a '-<suffix>' tail. `takenNames` is every name already in use
    // (compared case-insensitively — worker names are account-global and the
    // backend's case rules are not documented, so collide conservatively).
    // `nextSuffix` is injected so callers control randomness and tests stay
    // deterministic. Returns null if no unique name could be derived.
    function deriveCopyName(baseName, takenNames, nextSuffix) {
        if (typeof baseName !== 'string' || !baseName) return null;
        const taken = new Set();
        for (const n of (takenNames || [])) {
            if (typeof n === 'string') taken.add(n.toLowerCase());
        }
        for (let attempt = 0; attempt < 100; attempt++) {
            const suffix = String(nextSuffix());
            if (!suffix) continue;
            let stem = baseName;
            if (stem.length + suffix.length + 1 > MAX_NAME_LENGTH) {
                stem = stem.slice(0, MAX_NAME_LENGTH - suffix.length - 1).replace(/-+$/, '');
            }
            const candidate = stem ? `${stem}-${suffix}` : suffix;
            if (!taken.has(candidate.toLowerCase())) return candidate;
        }
        return null;
    }

    // Plan the copy-side identity of each owned worker for duplicateChat: where
    // the plain file copy landed its source (copiedFilePath), and the fresh
    // name + renamed path it should be redeployed under. Workers keep their
    // directory placement relative to the app dir (always workers/ for
    // create_worker deployments); only the basename changes, to
    // '<newName>.js', matching the convention create_worker itself uses — so a
    // later redeploy by the copy's AI lands on the SAME file. Names are
    // reserved as they are assigned so multiple workers can't collide with
    // each other. `newUrl` is unknown until deployment; the caller fills it in.
    function planCopies(owned, takenNames, oldAppDir, newAppDir, nextSuffix) {
        const oldRoot = stripTrailingSlashes(oldAppDir);
        const newRoot = stripTrailingSlashes(newAppDir);
        const taken = (takenNames || []).filter(n => typeof n === 'string').slice();
        const plans = [];
        for (const w of ownedWorkers(owned, oldRoot)) {
            const newName = deriveCopyName(w.name, taken, nextSuffix);
            if (!newName) continue;
            taken.push(newName);
            const rel = w.file_path.slice(oldRoot.length); // '/workers/<name>.js'
            const relDir = rel.slice(0, rel.lastIndexOf('/') + 1);
            plans.push({
                oldName: w.name,
                newName: newName,
                oldUrl: (typeof w.url === 'string' && w.url) ? w.url : null,
                newUrl: null,
                copiedFilePath: newRoot + rel,
                newFilePath: newRoot + relDir + newName + '.js'
            });
        }
        return plans;
    }

    // Swap every reference to the ORIGINAL workers for the copy's own by
    // replacing the URL HOST (e.g. 'api.puter.work' -> 'api-x7k2p1.puter.work').
    // Host-level replacement catches full URLs, protocol-relative '//host/…'
    // forms, and sub-path usages alike — puter.workers.exec() and fetch() both
    // address workers by URL, so this is the complete set of runtime
    // references. Boundary guards keep look-alike hosts safe: 'api.puter.work'
    // never matches inside 'my-api.puter.work', 'x.api.puter.work', or
    // 'api.puter.works'. Renames without both URLs (e.g. a failed redeploy) are
    // skipped. Returns { text, changed }.
    function rewriteUrlsInText(text, renames) {
        if (typeof text !== 'string') return { text: text, changed: false };
        let out = text;
        for (const r of (renames || [])) {
            if (!r) continue;
            const fromHost = urlHost(r.oldUrl);
            const toHost = urlHost(r.newUrl);
            if (!fromHost || !toHost || fromHost === toHost) continue;
            const re = new RegExp('(^|[^A-Za-z0-9._-])' + escapeRegExp(fromHost) + '(?![A-Za-z0-9_-])', 'g');
            out = out.replace(re, (m, boundary) => boundary + toHost);
        }
        return { text: out, changed: out !== text };
    }

    // Rewrite a duplicated chat's cloned history so it references the COPY's
    // workers instead of the original's. Expects the history AFTER the app-dir
    // rewrite (so worker file paths already sit under the new app dir —
    // `copiedFilePath` space). Two passes:
    //
    //  1. String-level, over the serialized history, for the two kinds of
    //     globally-unique token that appear at ANY nesting depth (assistant
    //     narration, tool inputs, double-encoded tool-result JSON): worker URL
    //     hosts (via rewriteUrlsInText) and worker source file paths. Neither
    //     contains JSON-escaped characters, so they appear verbatim even inside
    //     nested stringified content.
    //
    //  2. Structured, for worker NAMES — short strings that would false-match
    //     inside ordinary code/prose, so they are only touched where a name is
    //     structurally unambiguous: the `name` input of the worker tools, and
    //     the `name` fields of those tools' results (matched to their tool_use
    //     by id, so an unrelated tool's coincidental `name` field is never
    //     touched). list_workers results get their `workers[].name` entries
    //     mapped the same way.
    //
    // Pure: returns a NEW history array; the input is never mutated.
    function rewriteHistory(history, renames) {
        if (!Array.isArray(history)) return history;
        const usable = (renames || []).filter(r => r && typeof r.oldName === 'string' && typeof r.newName === 'string');
        if (!usable.length) return history;

        // Pass 1 — globally-unique tokens at any depth.
        let serialized = rewriteUrlsInText(JSON.stringify(history), usable).text;
        for (const r of usable) {
            if (typeof r.copiedFilePath === 'string' && typeof r.newFilePath === 'string' &&
                r.copiedFilePath && r.copiedFilePath !== r.newFilePath) {
                serialized = serialized.split(r.copiedFilePath).join(r.newFilePath);
            }
        }
        const out = JSON.parse(serialized);

        // Pass 2 — names, structurally.
        const byOldName = new Map(usable.map(r => [r.oldName, r.newName]));
        const resultKind = new Map(); // tool_use id -> 'named' | 'list'
        for (const msg of out) {
            if (!msg || typeof msg !== 'object') continue;
            if (msg.role === 'assistant') {
                const blocks = Array.isArray(msg.content) ? msg.content : [msg.content];
                for (const b of blocks) {
                    if (!b || typeof b !== 'object' || b.type !== 'tool_use') continue;
                    if (NAME_TOOLS.indexOf(b.name) !== -1) {
                        if (b.input && typeof b.input.name === 'string' && byOldName.has(b.input.name)) {
                            b.input.name = byOldName.get(b.input.name);
                        }
                        if (b.id != null) resultKind.set(b.id, 'named');
                    } else if (b.name === 'list_workers' && b.id != null) {
                        resultKind.set(b.id, 'list');
                    }
                }
            } else if (msg.role === 'user' && msg.content && typeof msg.content === 'object' &&
                       !Array.isArray(msg.content) && msg.content.type === 'tool_result') {
                // Results always follow their tool_use, so a single forward
                // pass sees the id first. Content-block arrays (e.g. ViewImage)
                // and unparseable strings are left untouched.
                const kind = resultKind.get(msg.content.tool_use_id);
                if (!kind || typeof msg.content.content !== 'string') continue;
                let parsed;
                try { parsed = JSON.parse(msg.content.content); } catch (e) { continue; }
                let touched = false;
                if (kind === 'named') {
                    if (parsed && typeof parsed.name === 'string' && byOldName.has(parsed.name)) {
                        parsed.name = byOldName.get(parsed.name);
                        touched = true;
                    }
                } else if (parsed && Array.isArray(parsed.workers)) {
                    for (const w of parsed.workers) {
                        if (w && typeof w.name === 'string' && byOldName.has(w.name)) {
                            w.name = byOldName.get(w.name);
                            touched = true;
                        }
                    }
                }
                if (touched) msg.content.content = JSON.stringify(parsed);
            }
        }
        return out;
    }

    return {
        NAME_TOOLS: NAME_TOOLS,
        MAX_NAME_LENGTH: MAX_NAME_LENGTH,
        ownedWorkers: ownedWorkers,
        matchesByName: matchesByName,
        findByName: findByName,
        deriveCopyName: deriveCopyName,
        planCopies: planCopies,
        rewriteUrlsInText: rewriteUrlsInText,
        rewriteHistory: rewriteHistory
    };
})();
