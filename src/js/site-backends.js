// site-backends.js — a project's dynamic backends (window.SiteBackends).
//
// A dynamic backend is a file __workers/<name>.worker.js in the folder a site
// serves. Puter runs it at <site>/__workers/<name>/..., starts it on the first
// request, and runs a saved change within about a second. It has no deploy
// step, no worker record and no name shared with the rest of Puter, so a page
// calls it with the relative path /__workers/<name>/... and the same code
// works on the preview and on the live site. Puter never serves the file
// itself.
//
// It runs as the app registered for the site's address, so every address has
// a store of its own. The preview and the live site keep separate data and
// keys, and so does a copy of the project. Builder puts keys into that store
// the way it does for a worker (worker-secrets.js).
//
// For a project with dynamic backends, Builder registers that app itself the
// moment it creates a site (registerApp), before anything runs there. Puter
// finds an app by its address, so the backend and the site's pages run as
// Builder's app, and Builder, being its creator, may change it. That's what
// lets it set the email sender name (the app's title, worker-sender.js), and
// keep a live site's data when its address changes, by pointing the same app
// at the new address (moveApp). The app is named after the project, "<name>"
// for the live site and "<name> (preview)" for the preview, until a sender
// name is chosen. Builder keeps the app's name, and that bookkeeping, in its
// own key-value store under "site-app:<origin>", since Puter looks apps up by
// name and a registered app's name can't be worked out from the address.
// When something ran on the site before Builder could register the app,
// Puter has made one of its own, which Builder can't change. That site still
// works, with keys but without a sender name Builder can set.
//
// A project gets dynamic backends when it's made while
// FEATURE_FLAGS.dynamicWorkers is on, and keeps that for good. The mark sits
// on its system message, which holds the instructions the AI was given and is
// never rebuilt, so a project made earlier keeps create_worker and the
// instructions that go with it. What a site's files hold is handled either
// way, at publish, duplicate, a new address and delete, since Puter runs any
// __workers file it finds.
window.SiteBackends = (function () {
    'use strict';

    const FOLDER = '__workers';
    const SUFFIX = '.worker.js';
    // Puter's rule for the part before .worker.js, which is also the URL
    // segment.
    const NAME_RE = /^[a-z0-9_-]+$/;
    const FILE_RE = /^__workers\/([a-z0-9_-]+)\.worker\.js$/;

    // Whether a project made now gets dynamic backends.
    function forNewProjects() {
        return !!(window.FEATURE_FLAGS && window.FEATURE_FLAGS.dynamicWorkers);
    }

    // Mark a new project's system message when it gets dynamic backends.
    // Returns the message.
    function markNewProject(systemMessage) {
        if (systemMessage && forNewProjects()) systemMessage.dynamicWorkers = true;
        return systemMessage;
    }

    // Whether the project with this history has dynamic backends.
    function isDynamicProject(history) {
        const sys = Array.isArray(history) ? history[0] : null;
        return !!(sys && sys.role === 'system' && sys.dynamicWorkers === true);
    }

    // The builder's tools as a project with this history gets them. A project
    // with dynamic backends gets no tool marked legacyOnly (create_worker),
    // and the wording in each tool's `dynamic` block, which can replace its
    // description and its parameters' descriptions. Any other project gets
    // the tools as they always were. Neither mark goes out with the tools,
    // since they're sent to the AI as they are.
    function toolsFor(tools, history) {
        const list = (Array.isArray(tools) ? tools : []).filter(Boolean);
        const bare = ({ dynamic, legacyOnly, ...t }) => t;
        if (!isDynamicProject(history)) return list.map((t) => (t.dynamic || 'legacyOnly' in t ? bare(t) : t));
        return list.filter((t) => !t.legacyOnly).map((t) => {
            if (!t.dynamic) return bare(t);
            const spec = t.function;
            const props = {};
            for (const [key, prop] of Object.entries((spec.parameters && spec.parameters.properties) || {})) {
                const said = t.dynamic.parameters && t.dynamic.parameters[key];
                props[key] = said ? { ...prop, description: said } : prop;
            }
            return {
                ...bare(t),
                function: {
                    ...spec,
                    description: t.dynamic.description || spec.description,
                    parameters: { ...spec.parameters, properties: props },
                },
            };
        });
    }

    function validName(name) { return typeof name === 'string' && NAME_RE.test(name); }

    // The backend name of a file, from its path relative to the folder the
    // site serves, or null for any other file. Top level only, since Puter
    // never runs a file in a subfolder of __workers.
    function nameOf(servedRel) {
        const m = FILE_RE.exec(String(servedRel == null ? '' : servedRel).replace(/^\/+/, ''));
        return m ? m[1] : null;
    }

    // The https://<name>.puter.site origin of a site's URL, or null. Puter runs
    // dynamic backends on puter.site only.
    function siteOrigin(url) {
        let u;
        try { u = new URL(String(url == null ? '' : url)); } catch (e) { return null; }
        if (u.protocol !== 'https:' || !/^[a-z0-9-]+\.puter\.site$/i.test(u.host)) return null;
        return u.origin.toLowerCase();
    }

    // The path a page calls a backend at, on its own site.
    function pathOf(name) { return '/' + FOLDER + '/' + name; }

    // Where a backend answers on a site, with no trailing slash. null when
    // either half is unusable.
    function urlOf(siteUrl, name) {
        const origin = siteOrigin(siteUrl);
        return origin && validName(name) ? origin + pathOf(name) : null;
    }

    function notFound(e) {
        for (const p of [e, e && e.error]) {
            if (!p) continue;
            if (p.status === 404 || /not_?found|does_not_exist/i.test(String(p.code || ''))) return true;
            if (typeof p.message === 'string' && /not found|does not exist|no such/i.test(p.message)) return true;
        }
        return false;
    }

    function timeout(ms) {
        try { return AbortSignal.timeout(ms); } catch (e) { return undefined; }
    }

    // The backends in the folder a site serves, as [{ name, path }] sorted by
    // name. [] when the folder has no __workers. Any other failure throws, so
    // a read that failed never passes for a site without backends.
    async function list(servedDir) {
        const dir = String(servedDir || '').replace(/\/+$/, '') + '/' + FOLDER;
        let items;
        try { items = await puter.fs.readdir(dir); }
        catch (e) { if (notFound(e)) return []; throw e; }
        const out = [];
        for (const item of items || []) {
            if (!item || item.is_dir || typeof item.name !== 'string' || !item.name.endsWith(SUFFIX)) continue;
            const name = item.name.slice(0, -SUFFIX.length);
            if (validName(name)) out.push({ name, path: dir + '/' + item.name });
        }
        return out.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    }

    // The uid of the app a site runs as. Puter derives it from the address, so
    // it's asked once per address.
    const uids = new Map();
    async function appUidOf(siteUrl) {
        const origin = siteOrigin(siteUrl);
        if (!origin) return null;
        if (uids.has(origin)) return uids.get(origin);
        const resp = await fetch((puter.APIOrigin || 'https://api.puter.com') + '/auth/app-uid-from-origin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + puter.authToken },
            body: JSON.stringify({ origin }),
            signal: timeout(10000),
        });
        if (!resp.ok) throw new Error(`Puter couldn't say which app ${origin} runs as (${resp.status}).`);
        const data = await resp.json();
        const uid = data && typeof data.uid === 'string' && data.uid ? data.uid : null;
        if (uid) uids.set(origin, uid);
        return uid;
    }

    // Call the site's backends, one at a time, until one answers, so Puter
    // starts it and makes the site's app. A 503 is a backend Puter couldn't
    // start. Resolves whether one answered.
    async function wake(siteUrl, names) {
        for (const name of names || []) {
            const url = urlOf(siteUrl, name);
            if (!url) continue;
            try {
                const resp = await fetch(url + window.WORKER_CANARY_PATH + '?__pv=' + Date.now(), { cache: 'no-store', signal: timeout(10000) });
                if (resp.status !== 503) return true;
            } catch (e) { /* try the next one */ }
        }
        return false;
    }

    // -- The app Builder registers for a site --

    // A project's name, from the project list, or '' when it isn't there.
    function titleOf(chatId) {
        const list = typeof savedChats !== 'undefined' && Array.isArray(savedChats) ? savedChats : [];
        const entry = list.find((c) => c && c.id === chatId);
        return (entry && entry.title) || '';
    }

    const APP_KEY = 'site-app:';
    // Puter's limit on an app's title.
    const MAX_TITLE = 100;

    function appKey(siteUrl) {
        const origin = siteOrigin(siteUrl);
        return origin ? APP_KEY + origin : null;
    }

    // What Builder recorded about the app it registered for a site,
    // { name, kind, defaultTitle, senderName }, or null for a site it didn't.
    async function record(siteUrl) {
        const key = appKey(siteUrl);
        if (!key) return null;
        const r = await puter.kv.get(key);
        return r && typeof r === 'object' && typeof r.name === 'string' && r.name ? r : null;
    }

    // The title a site's app has while no sender name is chosen. kind is
    // 'preview' or 'live'.
    function defaultTitle(projectTitle, kind) {
        const name = String(projectTitle == null ? '' : projectTitle).replace(/\s+/g, ' ').trim() || 'Untitled';
        const suffix = kind === 'preview' ? ' (preview)' : '';
        return name.slice(0, MAX_TITLE - suffix.length).trim() + suffix;
    }

    // Register the app a new site runs as, named after the project. Call it
    // right after creating the site, before anything runs there, or Puter
    // makes one of its own first. Resolves the app, or null when Puter
    // refused, which leaves the site on an app Puter makes. Never throws,
    // since a site without Builder's app still works.
    async function registerApp(siteUrl, projectTitle, kind) {
        const origin = siteOrigin(siteUrl);
        if (!origin) return null;
        const title = defaultTitle(projectTitle, kind);
        let app;
        try {
            app = await puter.apps.create({ name: origin.slice('https://'.length).split('.')[0], indexURL: origin, title, dedupeName: true });
        } catch (e) {
            console.warn('Could not register an app for', origin, e);
            return null;
        }
        if (!app || !app.name || !app.uid) return null;
        try {
            await puter.kv.set(APP_KEY + origin, { name: app.name, kind, defaultTitle: title, senderName: null });
        } catch (e) {
            // Without its record Builder could never find the app again, and
            // the site would run as it anyway. So it goes, and the site runs
            // as the app Puter makes.
            console.warn('Could not record the app for', origin, e);
            try { await puter.apps.delete(app.name); } catch (e2) { console.warn('Could not remove the unrecorded app', app.name, e2); }
            return null;
        }
        uids.set(origin, app.uid);
        return app;
    }

    // Change the record of a site's app. Resolves whether it was there.
    async function updateRecord(siteUrl, patch) {
        const r = await record(siteUrl);
        if (!r) return false;
        await puter.kv.set(appKey(siteUrl), { ...r, ...patch });
        return true;
    }

    // Note the sender name chosen for a site's app, or null for its default.
    function setSenderName(siteUrl, name) {
        return updateRecord(siteUrl, { senderName: name || null });
    }

    // Follow a project's new name on the app Builder registered for its
    // site, while it still has the name Builder gave it. A sender name
    // chosen in chat, or a title set by hand in the Dev Center, stays. Best
    // effort. Renames of one site run one at a time, so a quick second one
    // reads the record the first one left and the two never cross.
    const retitles = new Map();
    function retitle(siteUrl, projectTitle) {
        const key = siteOrigin(siteUrl);
        if (!key) return Promise.resolve();
        const run = (retitles.get(key) || Promise.resolve()).then(() => retitleNow(siteUrl, projectTitle));
        retitles.set(key, run);
        run.then(() => { if (retitles.get(key) === run) retitles.delete(key); });
        return run;
    }
    async function retitleNow(siteUrl, projectTitle) {
        try {
            const r = await record(siteUrl);
            if (!r) return;
            const title = defaultTitle(projectTitle, r.kind);
            if (title === r.defaultTitle) return;
            if (!r.senderName) {
                const app = await puter.apps.get(r.name);
                if (app && app.title === r.defaultTitle) await puter.apps.update(r.name, { title });
            }
            await puter.kv.set(appKey(siteUrl), { ...r, defaultTitle: title });
        } catch (e) {
            console.warn('Could not rename the app of', siteUrl, e);
        }
    }

    // Point the app Builder registered for `oldUrl` at `newUrl`, a site just
    // created, so the new address runs as the same app and keeps its data and
    // keys. Resolves whether it moved, and when it didn't, nothing changed.
    // The new address's record is written first and removed again if Puter
    // refuses, and a leftover old record is harmless, since a record only
    // counts while its app still has that address (builderAppOf).
    async function moveApp(oldUrl, newUrl) {
        const origin = siteOrigin(newUrl);
        let r;
        try { r = await record(oldUrl); } catch (e) { return false; }
        if (!r || !origin) return false;
        try { await puter.kv.set(APP_KEY + origin, r); } catch (e) { return false; }
        let moved = false;
        try {
            await puter.apps.update(r.name, { indexURL: origin });
            moved = true;
        } catch (e) {
            // An update that reached Puter but whose answer got lost still
            // moved the app.
            try { moved = siteOrigin((await puter.apps.get(r.name)).index_url) === origin; } catch (e2) { /* not moved */ }
            if (!moved) console.warn('Could not move the app of', oldUrl, 'to', newUrl, e);
        }
        if (!moved) {
            try { await puter.kv.del(APP_KEY + origin); } catch (e) { /* only ever read with its app's address */ }
            return false;
        }
        try { await puter.kv.del(appKey(oldUrl)); } catch (e) { /* only ever read with its app's address */ }
        uids.delete(siteOrigin(oldUrl));
        uids.delete(origin);
        return true;
    }

    // Whether Builder registered the app a site runs as. Throws when that
    // can't be read, since "no" would leave the app behind.
    async function hasApp(siteUrl) {
        return !!(await builderAppOf(siteUrl));
    }

    // Delete the app Builder registered for a site, with the site. Throws
    // when Puter refuses, so the caller can say what's left.
    async function deleteApp(siteUrl) {
        const r = await record(siteUrl);
        if (!r) return;
        try { await puter.apps.delete(r.name); }
        catch (e) { if (!notFound(e)) throw e; }
        await puter.kv.del(appKey(siteUrl));
    }

    // The app Builder registered for a site, with its record as `builder`,
    // or null. One that no longer points at the site isn't the site's.
    async function builderAppOf(siteUrl) {
        const r = await record(siteUrl);
        if (!r) return null;
        let app;
        try { app = await puter.apps.get(r.name); }
        catch (e) { if (notFound(e)) return null; throw e; }
        return app && siteOrigin(app.index_url) === siteOrigin(siteUrl) ? { ...app, builder: r } : null;
    }

    // The app a site runs as, or null when there is none. That's the app
    // Builder registered for it, with its record as `builder`, or else the
    // one Puter made for the address. With `wakeNames`, a site whose app
    // Puter hasn't made yet gets its backends called first. An app someone
    // else registered for the address counts as none, since changing it would
    // change something else. Throws when Puter can't be reached, so a failed
    // lookup is never mistaken for "no app".
    async function appOf(siteUrl, wakeNames) {
        const registered = await builderAppOf(siteUrl);
        if (registered) return registered;
        const uid = await appUidOf(siteUrl);
        if (!uid) return null;
        const get = async () => {
            try { return await puter.apps.get(uid); }
            catch (e) { if (notFound(e)) return null; throw e; }
        };
        let app = await get();
        if (!app && wakeNames && wakeNames.length && await wake(siteUrl, wakeNames)) {
            // A site created a moment ago can answer before Puter has made
            // its app, so the app gets a few seconds to show up.
            for (let i = 0; i < 5 && !app; i++) {
                if (i) await new Promise((r) => setTimeout(r, 1000));
                app = await get();
            }
        }
        return app && app.uid === uid && app.name === uid ? app : null;
    }

    // The open project's site, for a tool call or a save. That's the folder
    // the site serves (it holds __workers) and its preview and live
    // addresses. null when the call's project isn't the open one, whose
    // addresses are the only ones in memory, or doesn't have dynamic
    // backends.
    function siteOf(state) {
        const root = window.projectRootDir(state);
        const open = typeof currentAppDir !== 'undefined' && currentAppDir ? window.normalizePosixPath(currentAppDir) : '';
        if (!root || root !== open) return null;
        const history = (state && state.chatHistory) || (typeof chatHistory !== 'undefined' ? chatHistory : null);
        if (!isDynamicProject(history)) return null;
        const served = window.currentPreviewPath ? window.normalizePosixPath(window.currentPreviewPath) : root;
        return {
            root,
            servedDir: served === root || served.startsWith(root + '/') ? served : root,
            previewUrl: siteOrigin(window.currentPreviewUrl) ? window.currentPreviewUrl : null,
            publishedUrl: siteOrigin(window.currentPublishedUrl) ? window.currentPublishedUrl : null,
        };
    }

    return { FOLDER, SUFFIX, NAME_RE, forNewProjects, markNewProject, isDynamicProject, toolsFor,
        titleOf, defaultTitle, registerApp, setSenderName, retitle, moveApp, hasApp, deleteApp, validName, nameOf, siteOrigin, pathOf, urlOf, list, appUidOf, wake, appOf, siteOf };
})();
