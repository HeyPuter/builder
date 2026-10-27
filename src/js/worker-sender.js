// worker-sender.js — the sender name on email a project's backend sends
// (window.WorkerSender).
//
// A backend sends email with puter.email.sendTransactional, which always goes
// out from a Puter address. Recipients see the name of the worker's own app
// next to it, and Builder deploys every worker as its own sandbox app
// ("sandbox-<name>"), whose title starts out as that same name. So until
// someone changes the title, mail from a Builder site says it's from
// "sandbox-guestbook-k3x9p2". The address itself can't be changed. The name
// can, and it's just the app's title.
//
// The set_email_sender_name tool sets it for the preview's backend and, once
// the site is published, for the live one ("<name>-live", its own app).
// Publish copies the preview's name to the live backend, and Duplicate copies
// it to the copy's backends. Deleting a project, or a publish retiring a live
// backend, puts the default name back first, because Puter reuses a sandbox app
// by worker name, so a later worker with the same name would otherwise send
// under it.
//
// A backend still on its default name never changes anything, so a project
// that never set a name sees no change. Copy only ever carries a name someone
// chose. It never resets a name on the target, so a live backend renamed by
// hand (in the Dev Center) keeps that name.

(function () {
    'use strict';

    const SANDBOX_PREFIX = 'sandbox-';
    // The email service cuts a sender name off at 78 characters, and removes
    // control characters, quotes, backslashes, angle brackets and "@" (a name
    // that reads like an address is a spoofing trick). Refusing those here,
    // instead of letting them disappear, means the name the user asked for is
    // the name recipients see.
    const MAX_LENGTH = 78;
    const BAD_CHARS = /[\x00-\x1f\x7f"\\<>@]/;

    // A sender name as the user wrote it, checked. Resolves
    // { ok: true, name } with whitespace tidied, or { ok: false, reason } with
    // reason 'empty', 'too-long' (with the tidied name's length) or
    // 'bad-chars'.
    function check(raw) {
        const s = String(raw == null ? '' : raw);
        if (BAD_CHARS.test(s.replace(/[\t\n\r]/g, ' '))) return { ok: false, reason: 'bad-chars' };
        const name = s.replace(/\s+/g, ' ').trim();
        if (!name) return { ok: false, reason: 'empty' };
        if (name.length > MAX_LENGTH) return { ok: false, reason: 'too-long', length: name.length };
        return { ok: true, name };
    }

    // The worker's sandbox app ({ uid, name, title }), or null when the worker
    // runs as no app or as an app that isn't its own sandbox app (renaming
    // that would rename something else). Throws when Puter can't be reached,
    // so a lookup failure is never mistaken for "no app". Both lookups go out
    // at once: this runs for every backend on every publish, duplicate and
    // delete.
    async function appOf(workerName) {
        const [info, found] = await Promise.allSettled([
            puter.workers.get(workerName),
            puter.apps.get(SANDBOX_PREFIX + workerName),
        ]);
        if (info.status === 'rejected') throw info.reason;
        const uid = info.value && info.value.app_uid;
        if (!uid) return null;
        if (found.status === 'rejected') {
            // A worker deployed without a sandbox app of its own.
            if (notFound(found.reason)) return null;
            throw found.reason;
        }
        const app = found.value;
        if (!app || app.uid !== uid || typeof app.name !== 'string' || !app.name) return null;
        return app;
    }

    // Whether someone gave the app a name of its own. A new sandbox app's
    // title is its name.
    function isCustom(app) {
        return !!app && typeof app.title === 'string' && app.title.trim() !== '' && app.title !== app.name;
    }

    function notFound(e) {
        for (const p of [e, e && e.error]) {
            if (!p) continue;
            if (p.status === 404 || p.code === 'entity_not_found' || p.code === 'not_found') return true;
            if (typeof p.message === 'string' && /not found|does not exist/i.test(p.message)) return true;
        }
        return false;
    }

    function forbidden(e) {
        const parts = [e, e && e.error];
        for (const p of parts) {
            if (!p) continue;
            if (p.status === 403 || p.code === 'forbidden') return true;
            if (typeof p.message === 'string' && /forbidden|access denied/i.test(p.message)) return true;
        }
        return false;
    }

    // Give one worker's app this title, unless it already has it. Resolves
    // { ok: true, changed } or { ok: false, reason } with reason 'no-app',
    // 'forbidden' or 'failed'.
    async function setTitle(workerName, title) {
        let app;
        try { app = await appOf(workerName); } catch (e) { return { ok: false, reason: 'failed' }; }
        if (!app) return { ok: false, reason: 'no-app' };
        const wanted = title === null ? app.name : title;
        if (app.title === wanted) return { ok: true, changed: false };
        try {
            await puter.apps.update(app.name, { title: wanted });
            return { ok: true, changed: true };
        } catch (e) {
            return { ok: false, reason: forbidden(e) ? 'forbidden' : 'failed' };
        }
    }

    // Set a worker's sender name, as the user asked for it. An empty name puts
    // the default back. Resolves { ok: true, changed, name } (name is null
    // for the default) or { ok: false, reason } with reason 'too-long',
    // 'bad-chars', 'no-app', 'forbidden' or 'failed'.
    async function set(workerName, raw) {
        let title = null;
        if (String(raw == null ? '' : raw).trim()) {
            const c = check(raw);
            if (!c.ok) return c;
            title = c.name;
        }
        const r = await setTitle(workerName, title);
        return r.ok ? { ok: true, changed: r.changed, name: title } : r;
    }

    // Carry the sender name from one worker to another (Publish: preview to
    // live. Duplicate: original to copy). A source on the default name copies
    // nothing and leaves the target alone. So does a source that can't be
    // read: every project publishes through here, most never set a name, and
    // warning them all about one Puter hiccup would be wrong far more often
    // than right (the next publish tries again). The name is copied as it is,
    // even one set by hand that check() would refuse, since Puter already
    // took it. Resolves { ok, reason?, copied }.
    async function copy(fromWorker, toWorker) {
        let from;
        try { from = await appOf(fromWorker); } catch (e) { return { ok: true, copied: false }; }
        if (!isCustom(from)) return { ok: true, copied: false };
        const r = await setTitle(toWorker, from.title);
        return r.ok ? { ok: true, copied: r.changed } : { ok: false, reason: r.reason, copied: false };
    }

    // Put the default name back before a worker is deleted (a deleted project,
    // a retired live backend). A worker on its default name is left alone.
    async function clear(workerName) {
        let app;
        try { app = await appOf(workerName); } catch (e) { return { ok: false, reason: 'failed' }; }
        if (!isCustom(app)) return { ok: true, cleared: false };
        try {
            await puter.apps.update(app.name, { title: app.name });
            return { ok: true, cleared: true };
        } catch (e) {
            return { ok: false, reason: forbidden(e) ? 'forbidden' : 'failed' };
        }
    }

    window.WorkerSender = { MAX_LENGTH, check, set, copy, clear };
})();
