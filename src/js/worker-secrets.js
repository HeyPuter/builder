// worker-secrets.js — a project's API keys, kept in each backend worker's OWN
// key-value store and nowhere else (window.WorkerSecrets).
//
// A Puter worker runs as its own sandbox app ("sandbox-<name>") with its own
// key-value store. The AI used to write a key (Stripe, Whop, any API) into the
// worker's source as a constant, which put the key in every version, in the
// download, on the draft site (it serves the project folder, workers/
// included) and in any GitHub repository the project syncs to. Now a key goes
// from the user, through the set_secret tool, straight into that worker's
// store as "secret:<NAME>", and the worker reads it with
// me.puter.kv.get('secret:<NAME>'). Builder keeps no copy of its own.
//
// Builder writes into the worker's store the way any app writes into another
// app's data, so the user approves it once per worker app (puter.perms
// 'appData', key-value only). Publish deploys a separate "<name>-live" worker,
// which gets the keys copied from the draft worker, and Duplicate copies them
// to the copy's workers. Deleting a project, or a publish retiring a live
// backend, clears them first. Puter reuses a sandbox app by worker name, so a
// later worker with the same name would otherwise find them.
//
// The live site can also have keys of its own, such as a live payment key
// while the preview keeps a test key. set_secret with live saves one straight
// into the "<name>-live" worker and marks it live-only ("secret-live-only"),
// and Publish never copies over a live-only key. Keys never go the other way,
// so a live key can't end up in the preview.
//
// Builder also keeps the list of key names in the store itself
// ("secret-names"), so copying and clearing never depend on listing another
// app's store. Values never leave these functions: nothing here logs, tracks
// or returns one. Copy reports each key's name and a kind read from the value
// (a Stripe test key, Whop's sandbox host), which is all the publish line in
// the conversation needs (publishNote).

(function () {
    'use strict';

    const PREFIX = 'secret:';
    const NAMES_KEY = 'secret-names';
    const LIVE_ONLY_KEY = 'secret-live-only';
    const NAME_RE = /^[A-Z][A-Z0-9_]{0,63}$/;
    const MAX_VALUE = 8000;
    // Key-value only, and only what these functions do: read and write keys,
    // and remove them when a project is deleted.
    const SCOPES = { kv: ['get', 'set', 'del'] };

    function validName(name) { return NAME_RE.test(String(name || '')); }

    // The worker's own app, or null when it has none (a worker bound to no
    // app can't hold keys of its own).
    async function appOf(workerName) {
        const info = await puter.workers.get(workerName);
        return (info && info.app_uid) || null;
    }

    // Already allowed, without asking. A failed check reads as "not allowed",
    // which only ever means nothing is copied or cleared.
    async function allowed(app) {
        try { return !!(await puter.perms.check('appData', { app, scopes: SCOPES })); }
        catch (e) { return false; }
    }
    // Allowed now, asking the user if needed.
    async function allow(app) {
        if (await allowed(app)) return true;
        try { return !!(await puter.perms.request('appData', { app, scopes: SCOPES })); }
        catch (e) { return false; }
    }

    async function listIn(app, key) {
        const v = await puter.kv.get(key, { appUuid: app });
        return Array.isArray(v) ? v.filter(validName) : [];
    }
    function namesIn(app) { return listIn(app, NAMES_KEY); }
    async function addTo(app, key, name) {
        const list = await listIn(app, key);
        if (!list.includes(name)) await puter.kv.set(key, list.concat([name]), { appUuid: app });
    }

    // What a key is, read from its value, for the publish line. The value
    // itself never leaves here. A Whop host is saved as WHOP_API next to the
    // key (prompt.js), which is how a sandbox setup shows.
    function kindOf(value) {
        const v = String(value == null ? '' : value);
        if (/^(?:sk|rk)_test_/.test(v)) return 'stripe-test';
        if (/^(?:sk|rk)_live_/.test(v)) return 'stripe-live';
        if (/sandbox-api\.whop\.com/.test(v)) return 'whop-sandbox';
        if (/(?:^|\/\/)api\.whop\.com/.test(v)) return 'whop-live';
        return 'other';
    }

    // Save one key into one worker's store. opts.liveOnly also marks it as the
    // live site's own key, which Publish never copies over. Resolves
    // { ok: true } or { ok: false, reason } with reason 'bad-name', 'empty',
    // 'too-long', 'no-app', 'declined' or 'failed'.
    async function set(workerName, name, value, opts) {
        if (!validName(name)) return { ok: false, reason: 'bad-name' };
        if (typeof value !== 'string' || !value.trim()) return { ok: false, reason: 'empty' };
        if (value.length > MAX_VALUE) return { ok: false, reason: 'too-long' };
        let app;
        try { app = await appOf(workerName); } catch (e) { return { ok: false, reason: 'failed' }; }
        if (!app) return { ok: false, reason: 'no-app' };
        if (!(await allow(app))) return { ok: false, reason: 'declined' };
        try {
            await puter.kv.set(PREFIX + name, value.trim(), { appUuid: app });
            await addTo(app, NAMES_KEY, name);
            if (opts && opts.liveOnly) await addTo(app, LIVE_ONLY_KEY, name);
            return { ok: true };
        } catch (e) {
            return { ok: false, reason: 'failed' };
        }
    }

    // The key names a worker holds (never the values). [] when Builder was
    // never allowed into it, which means it holds none Builder put there.
    async function names(workerName) {
        try {
            const app = await appOf(workerName);
            if (!app || !(await allowed(app))) return [];
            return await namesIn(app);
        } catch (e) {
            return [];
        }
    }

    // Copy every key from one worker to another (Publish: draft to live.
    // Duplicate: original to copy), except the target's live-only keys. A
    // worker with no keys copies nothing and never asks the user anything.
    // Resolves { ok, reason?, copied, keys: [{ name, kind, kept }] }, where
    // kept means the target kept its own live-only key. Never a value.
    async function copy(fromWorker, toWorker) {
        let from, to;
        try { from = await appOf(fromWorker); } catch (e) { return { ok: false, reason: 'failed', copied: 0, keys: [] }; }
        // Builder was never allowed into the source, so it put no keys there.
        if (!from || !(await allowed(from))) return { ok: true, copied: 0, keys: [] };
        let list;
        try { list = await namesIn(from); } catch (e) { return { ok: false, reason: 'failed', copied: 0, keys: [] }; }
        if (!list.length) return { ok: true, copied: 0, keys: [] };
        try { to = await appOf(toWorker); } catch (e) { return { ok: false, reason: 'failed', copied: 0, keys: [] }; }
        if (!to) return { ok: false, reason: 'no-app', copied: 0, keys: [] };
        if (to === from) return { ok: true, copied: 0, keys: [] };
        if (!(await allow(to))) return { ok: false, reason: 'declined', copied: 0, keys: [] };
        let copied = 0;
        const keys = [];
        try {
            const liveOnly = await listIn(to, LIVE_ONLY_KEY);
            for (const name of list) {
                if (liveOnly.includes(name)) {
                    keys.push({ name, kind: kindOf(await puter.kv.get(PREFIX + name, { appUuid: to })), kept: true });
                    continue;
                }
                const value = await puter.kv.get(PREFIX + name, { appUuid: from });
                if (typeof value !== 'string' || !value) continue;
                await puter.kv.set(PREFIX + name, value, { appUuid: to });
                keys.push({ name, kind: kindOf(value), kept: false });
                copied++;
            }
            const there = await namesIn(to);
            const merged = there.concat(list.filter((n) => !there.includes(n)));
            await puter.kv.set(NAMES_KEY, merged, { appUuid: to });
            return { ok: true, copied, keys };
        } catch (e) {
            return { ok: false, reason: 'failed', copied, keys };
        }
    }

    // The line Builder adds to the conversation after a publish, saying what
    // the live site got, or '' when there is nothing to say (no keys anywhere,
    // the common case). reports is [{ live: worker name, result: what copy()
    // resolved to }]. It holds only Builder's own words and key names
    // (checked by validName), so nothing from outside reaches the AI. The AI
    // reads it on the next message from any device, since it's saved with the
    // chat, and the user sees it too.
    function publishNote(reports) {
        const got = [];
        const kept = [];
        const kinds = new Map();
        let failed = false;
        for (const r of reports || []) {
            const res = r && r.result;
            if (!res) continue;
            if (!res.ok) failed = true;
            // A copy that failed partway still reports the keys it copied.
            for (const k of res.keys || []) {
                if (!k || !validName(k.name)) continue;
                const into = k.kept ? kept : got;
                if (!into.includes(k.name)) into.push(k.name);
                if (k.kind && k.kind !== 'other') kinds.set(k.name, k.kind);
            }
        }
        if (!failed && !got.length && !kept.length) return '';
        const code = (name) => '`' + name + '`';
        const list = (names) => names.length === 1 ? code(names[0])
            : names.slice(0, -1).map(code).join(', ') + ' and ' + code(names[names.length - 1]);
        const parts = [failed
            ? 'Published, but the live site didn’t get all of its keys, so the parts that need them won’t work there yet. Publishing again tries once more.'
            : 'Published.'];
        if (got.length && kept.length) parts.push(`The live site got ${list(got)} from the preview and kept its own ${list(kept)}.`);
        else if (got.length) parts.push(`The live site got ${list(got)} from the preview.`);
        else if (kept.length) parts.push(`The live site kept its own ${list(kept)}.`);
        const of = (kind) => [...kinds].filter(([, k]) => k === kind).map(([name]) => name);
        const test = of('stripe-test');
        const sandbox = of('whop-sandbox');
        if (test.length) parts.push(`${list(test)} ${test.length === 1 ? 'is a Stripe test key' : 'are Stripe test keys'}, so the live site can’t take real payments yet.`);
        if (sandbox.length) parts.push(`${list(sandbox)} ${sandbox.length === 1 ? 'points' : 'point'} to Whop’s sandbox, so the live site can’t take real payments yet.`);
        return '*' + parts.join(' ') + '*';
    }

    // Remove every key Builder put into a worker, before the worker is deleted
    // (a deleted project, a retired live backend). Never asks, since a worker
    // Builder was never allowed into holds no keys of Builder's.
    async function clear(workerName) {
        try {
            const app = await appOf(workerName);
            if (!app || !(await allowed(app))) return { ok: true, cleared: 0 };
            const list = await namesIn(app);
            for (const name of list) await puter.kv.del(PREFIX + name, { appUuid: app });
            if (list.length) await puter.kv.del(NAMES_KEY, { appUuid: app });
            if ((await listIn(app, LIVE_ONLY_KEY)).length) await puter.kv.del(LIVE_ONLY_KEY, { appUuid: app });
            return { ok: true, cleared: list.length };
        } catch (e) {
            return { ok: false, reason: 'failed', cleared: 0 };
        }
    }

    window.WorkerSecrets = { PREFIX, NAMES_KEY, LIVE_ONLY_KEY, SCOPES, validName, kindOf, set, names, copy, clear, publishNote };
})();
