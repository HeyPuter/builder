// templates.js — share a project as a template; start a project from one.
//
// Sharing (the author): "Share as template" in a project's ⋮ menu snapshots
// the project into its own release directory and hosts it on a public
// *.puter.site subdomain (see template-core.js for the site layout and the
// manifest). The snapshot is frozen: later edits reach the template only when
// the author presses "Update template". It is kept apart from the published
// site because it carries the backend's source, which publishing never serves.
//
//   /<user>/AppData/<appID>/.templates/<chatId>/r_<ts>_<rand>/   the release
//   /<user>/AppData/<appID>/.templates/<chatId>.json             its state
//
// Forking (anyone): /?template=<subdomain> opens a card for the template.
// "Use this template" downloads the files into a fresh project in the
// visitor's own account and opens it. Three rules keep a stranger's template
// from acting on the forker's account:
//
//   1. Its workers are never deployed by the fork. A worker runs as whoever
//      deployed it, so the copy gets their source with every reference pointed
//      at an unreachable placeholder (TemplateCore.placeholderWorkerUrl), and
//      the forker deploys them only after reading the code ("Review and deploy
//      backend" in the note atop the conversation).
//   2. Until the forker sends a message of their own, nothing the preview
//      reports starts an automatic fix turn (autoFixBlockedForOpenProject),
//      and MCP tools stay out of every turn until the forker turns them on for
//      the project (mcpBlockedForOpenProject).
//   3. The template's own claims (its listed author) are shown as claims; the
//      one thing the builder can vouch for is the site address it came from.
//
// The conversation that built a template is never part of it: a fork starts
// with a fresh system prompt plus a context block describing the files (see
// TemplateCore.forkContextText).
(function () {
    'use strict';

    const Core = window.TemplateCore;

    // Files worth scanning for credentials before they are published.
    const TEXT_FILE_RE = /\.(html?|js|mjs|cjs|jsx|ts|tsx|css|json|txt|md|xml|svg|webmanifest|ya?ml|toml|ini|cfg|conf|env|py|rb|php|sh|csv)$/i;
    const HTML_FILE_RE = /\.html?$/i;
    const SCAN_MAX_BYTES = 1024 * 1024;
    // Parallel downloads/reads; enough to hide latency without hammering hosting.
    const CONCURRENCY = 4;

    function enabled() {
        return !!(window.FEATURE_FLAGS && window.FEATURE_FLAGS.templates);
    }

    function appRoot() {
        return `/${window.user.username}/AppData/${puter.appID}`;
    }
    function appDirFor(chatId) { return appRoot() + '/' + chatId; }
    function containerFor(chatId) { return appRoot() + '/.templates/' + chatId; }
    function statePathFor(chatId) { return appRoot() + '/.templates/' + chatId + '.json'; }

    // The builder link a template is shared as. Built from this origin so a
    // template shared from a staging or local builder opens there too.
    function templateLink(subdomain) {
        return window.location.origin + '/?template=' + encodeURIComponent(subdomain);
    }

    function byteLength(text) {
        return new TextEncoder().encode(text).length;
    }

    function readText(path) {
        return puter.fs.read(path).then(d => d.text());
    }

    function friendlyError(message, code) {
        const e = new Error(message);
        if (code) e.code = code;
        return e;
    }

    // Run fn over items, at most `limit` at a time. Stops starting new work
    // after the first failure and rethrows it once the in-flight calls settle.
    async function runLimited(items, limit, fn) {
        let next = 0;
        let failure = null;
        const lane = async () => {
            while (next < items.length && !failure) {
                const item = items[next++];
                try { await fn(item); }
                catch (e) { if (!failure) failure = e; }
            }
        };
        await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane));
        if (failure) throw failure;
    }

    // Every entry under `dir` as {path, abs, isDir, size, dot}, `path` relative
    // to `dir`. Dot-prefixed entries are reported (so callers can drop them)
    // but never descended into.
    async function listEntries(dir, rel, out) {
        out = out || [];
        const items = await puter.fs.readdir(dir);
        for (const item of (items || [])) {
            if (!item || typeof item.name !== 'string' || !item.name) continue;
            const path = rel ? rel + '/' + item.name : item.name;
            const abs = dir + '/' + item.name;
            const dot = item.name[0] === '.';
            out.push({ path, abs, isDir: !!item.is_dir, size: Number(item.size), dot });
            if (item.is_dir && !dot) await listEntries(abs, path, out);
        }
        return out;
    }

    function isAssetPath(path) {
        return path === 'assets' || path.indexOf('assets/') === 0;
    }

    // ---- Author side ---------------------------------------------------------

    // The saved sharing state of a project, or null when it isn't shared.
    // Throws on a read failure other than "not there" (deleteChatTemplate must
    // not mistake an outage for "nothing to clean up").
    async function readTemplateState(chatId) {
        let raw;
        try { raw = await readText(statePathFor(chatId)); }
        catch (e) { if (isNotFoundError(e)) return null; throw e; }
        let state;
        try { state = JSON.parse(raw); } catch (e) { return null; }
        if (!state || !Core.parseSubdomain(state.subdomain)) return null;
        return state;
    }

    // The worker records this project owns, as the manifest lists them.
    async function projectWorkers(appDir) {
        const all = await puter.workers.list();
        return window.WorkerOwnership.ownedWorkers(all, appDir).map(w => ({
            name: w.name,
            url: w.url,
            file: w.file_path.slice(appDir.length + 1),
        }));
    }

    // What sharing this project would publish, for the dialog: its files (dot
    // files never ship), its workers, and anything that looks like a credential.
    async function inspectProject(chatId) {
        const appDir = appDirFor(chatId);
        let entries = [];
        try { entries = await listEntries(appDir, ''); }
        catch (e) { if (!isNotFoundError(e)) throw e; }
        const files = entries.filter(e => !e.isDir && !e.dot);
        const hidden = entries.filter(e => e.dot).map(e => e.path);
        const workers = files.length ? await projectWorkers(appDir) : [];
        const secrets = [];
        const scannable = files.filter(f => TEXT_FILE_RE.test(f.path) && !(f.size > SCAN_MAX_BYTES));
        await runLimited(scannable, CONCURRENCY, async (f) => {
            try { secrets.push(...Core.scanTextForSecrets(f.path, await readText(f.abs))); }
            catch (e) { console.warn('Template: could not scan', f.path, e); }
        });
        secrets.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
        return {
            files: files.map(f => ({ path: f.path, size: f.size })),
            hidden,
            workers,
            secrets,
        };
    }

    // Trim a fresh copy of the project down to what a template ships — no dot
    // files, no uploads unless asked, no preview cache-bust tokens — and list
    // what is left with exact sizes (a fork checks every download against them).
    async function cleanSnapshot(filesDir, { includeAssets }) {
        const entries = await listEntries(filesDir, '');
        for (const e of entries) {
            if (e.dot || (!includeAssets && e.path === 'assets')) {
                await puter.fs.delete(e.abs, { recursive: true });
            }
        }
        const kept = entries.filter(e => !e.isDir && !e.dot && (includeAssets || !isAssetPath(e.path)));
        await runLimited(kept, CONCURRENCY, async (f) => {
            if (HTML_FILE_RE.test(f.path)) {
                const text = await readText(f.abs);
                const clean = window.stripPreviewCacheBust ? window.stripPreviewCacheBust(text) : text;
                if (clean !== text) await puter.fs.write(f.abs, clean);
                f.size = byteLength(clean);
            } else if (!Number.isFinite(f.size)) {
                const st = await puter.fs.stat(f.abs);
                f.size = Number(st && st.size);
            }
        });
        return kept.map(f => ({ path: f.path, size: f.size }));
    }

    // The preview's root, relative to the app dir ('' for the app dir itself),
    // so a fork serves the same folder the author's preview did.
    async function previewRootFor(chatId, appDir, files) {
        let previewPath = chatId === currentChatId ? window.currentPreviewPath : null;
        if (!previewPath) {
            try { previewPath = JSON.parse(await readText(chatFilePath(chatId))).previewPath; }
            catch (e) { previewPath = null; }
        }
        if (typeof previewPath !== 'string' || previewPath.indexOf(appDir + '/') !== 0) return '';
        const rel = previewPath.slice(appDir.length + 1).replace(/\/+$/, '');
        return (Core.safeRelativePath(rel) && files.some(f => f.path.indexOf(rel + '/') === 0)) ? rel : '';
    }

    async function createTemplateSubdomain(dir, name) {
        const slug = slugifyTitle(name);
        const candidates = [];
        if (slug) candidates.push(slug + '-template', slug + '-template-' + shortRand());
        candidates.push('template-' + puter.randName('-'), 'template-' + puter.randName('-'));
        let lastErr;
        for (const name of candidates) {
            if (!Core.parseSubdomain(name)) continue;
            try {
                const site = await puter.hosting.create(name, dir);
                return (site && site.subdomain) || name;
            } catch (e) {
                lastErr = e;
                // The account's limit fails every candidate alike.
                if (window.isSubdomainLimitErr && window.isSubdomainLimitErr(e)) break;
            }
        }
        throw lastErr || new Error('Could not create an address for the template.');
    }

    // The template site's own front page: visiting the address sends people to
    // the builder's card for it rather than running the app off the snapshot.
    function redirectPageHtml(name, link) {
        const n = htmlEscape(name), l = htmlEscape(link);
        return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
            '<meta name="viewport" content="width=device-width, initial-scale=1">' +
            `<title>${n} · Puter template</title><meta name="robots" content="noindex">` +
            `<meta http-equiv="refresh" content="0; url=${l}"></head>` +
            '<body style="font-family:system-ui,sans-serif;padding:48px 16px;text-align:center">' +
            `<p>Opening the template <strong>${n}</strong> in the Puter AI Builder…</p>` +
            `<p><a href="${l}">Continue</a></p></body></html>`;
    }

    const _sharing = new Set();

    // Snapshot the project and publish (or re-publish) it as a template.
    // Resolves with the new sharing state.
    async function shareTemplate(chatId, opts) {
        opts = opts || {};
        if (_sharing.has(chatId)) throw friendlyError('This template is already being shared — one moment.');
        _sharing.add(chatId);
        try {
            if (chatId === currentChatId && typeof publishBlockedReason === 'function') {
                const blocked = publishBlockedReason();
                if (blocked) {
                    throw friendlyError(blocked === 'restore'
                        ? 'Finishing the restore — you can share the template the moment it’s done.'
                        : 'Finishing the current task — you can share the template the moment it’s done.');
                }
            }
            const appDir = appDirFor(chatId);
            // Writes still landing in the working dir (see doPublish).
            await window.drainFileLocks?.(appDir);
            const prior = await readTemplateState(chatId);
            const container = containerFor(chatId);
            const releaseName = newReleaseDirName();
            const releaseDir = container + '/' + releaseName;
            let live = false;
            try {
                await puter.fs.mkdir(releaseDir, { recursive: true });
                await puter.fs.copy(appDir, releaseDir, { newName: Core.FILES_DIR, overwrite: true });
                const files = await cleanSnapshot(releaseDir + '/' + Core.FILES_DIR, { includeAssets: !!opts.includeAssets });
                const workers = await projectWorkers(appDir);
                const root = await previewRootFor(chatId, appDir, files);
                const now = new Date().toISOString();
                const manifest = Core.buildManifest({
                    name: opts.name,
                    description: opts.description,
                    author: window.user.username,
                    createdAt: (prior && prior.createdAt) || now,
                    updatedAt: now,
                    root,
                    files,
                    workers,
                });
                await puter.fs.write(releaseDir + '/' + Core.MANIFEST_PATH, JSON.stringify(manifest));

                let sub = prior ? prior.subdomain : null;
                if (sub) {
                    try { await puter.hosting.update(sub, releaseDir); }
                    catch (e) { if (!isNotFoundError(e)) throw e; sub = null; }
                }
                if (!sub) sub = await createTemplateSubdomain(releaseDir, manifest.name);
                live = true;

                // Recorded the moment the address exists: this record is how
                // Stop sharing and project deletion find the site again.
                const state = {
                    subdomain: sub,
                    name: manifest.name,
                    description: manifest.description,
                    includeAssets: !!opts.includeAssets,
                    fileCount: files.length,
                    workerCount: workers.length,
                    createdAt: manifest.createdAt,
                    updatedAt: now,
                };
                await puter.fs.write(statePathFor(chatId), JSON.stringify(state), { createMissingParents: true });

                try { await puter.fs.write(releaseDir + '/index.html', redirectPageHtml(manifest.name, templateLink(sub))); }
                catch (e) { console.warn('Template: could not write the redirect page:', e); }
                await retirePublishedReleases(container, releaseName);
                return state;
            } catch (e) {
                if (!live) {
                    try { await puter.fs.delete(releaseDir, { recursive: true }); }
                    catch (e2) { /* staged copy only — nothing serves it */ }
                }
                throw e;
            }
        } finally {
            _sharing.delete(chatId);
        }
    }

    // Stop sharing: take the site down and drop the snapshot and its record.
    // "Already gone" counts as done; any other failure throws, so deleteChat
    // keeps the project (and this record) for a retry.
    async function deleteChatTemplate(chatId) {
        const state = await readTemplateState(chatId);
        if (state) {
            try { await puter.hosting.delete(state.subdomain); }
            catch (e) { if (!isNotFoundError(e)) throw e; }
        }
        try { await puter.fs.delete(containerFor(chatId), { recursive: true }); }
        catch (e) { if (!isNotFoundError(e)) throw e; }
        try { await puter.fs.delete(statePathFor(chatId)); }
        catch (e) { if (!isNotFoundError(e)) throw e; }
    }

    // ---- Forker side ---------------------------------------------------------

    async function fetchTemplate(subdomain) {
        if (!Core.parseSubdomain(subdomain)) throw friendlyError('This template link isn’t valid.', 'invalid');
        let resp;
        try { resp = await fetch(Core.manifestUrl(subdomain), { cache: 'no-store', credentials: 'omit' }); }
        catch (e) { throw friendlyError('Couldn’t reach the template — check your connection and try again.', 'network'); }
        if (resp.status === 404) throw friendlyError('This template doesn’t exist, or its author stopped sharing it.', 'not-found');
        if (!resp.ok) throw friendlyError(`The template couldn’t be loaded right now (HTTP ${resp.status}).`, 'http');
        let raw;
        try { raw = await resp.json(); }
        catch (e) { throw friendlyError('This link doesn’t point at a Puter template.', 'invalid'); }
        const checked = Core.validateManifest(raw);
        if (!checked.ok) throw friendlyError('This template can’t be used: ' + checked.error + '.', 'invalid');
        return checked.manifest;
    }

    async function downloadFile(subdomain, file) {
        const resp = await fetch(Core.fileUrl(subdomain, file.path), { cache: 'no-store', credentials: 'omit' });
        if (!resp.ok) throw friendlyError(`Couldn’t download “${file.path}” from the template (HTTP ${resp.status}).`);
        const declared = Number(resp.headers.get('content-length'));
        if (Number.isFinite(declared) && declared > Core.LIMITS.maxFileBytes) {
            throw friendlyError(`“${file.path}” is larger than the template says it is.`);
        }
        const blob = await resp.blob();
        if (blob.size !== file.size) {
            throw friendlyError('The template changed while it was being copied. Try again.');
        }
        return blob;
    }

    // Create a new project in the signed-in account from a checked manifest.
    // Resolves with the new chat id; a failure removes everything it created.
    async function forkTemplate(subdomain, manifest, { onProgress } = {}) {
        const newId = generateChatId();
        const newAppDir = appDirFor(newId);
        let previewSub = null;
        try {
            // --- Files. The first write into each directory runs alone (it
            // creates the directory, and two parallel writes creating the same
            // parents can collide); the rest go a few at a time.
            const total = manifest.files.length;
            let done = 0;
            const copyOne = async (f) => {
                const blob = await downloadFile(subdomain, f);
                await puter.fs.write(newAppDir + '/' + f.path, blob, { createMissingParents: true });
                done++;
                onProgress && onProgress({ step: 'files', done, total });
            };
            const firstInDir = new Map();
            const rest = [];
            for (const f of manifest.files) {
                const dir = f.path.indexOf('/') >= 0 ? f.path.slice(0, f.path.lastIndexOf('/')) : '';
                if (firstInDir.has(dir)) rest.push(f);
                else firstInDir.set(dir, f);
            }
            for (const f of firstInDir.values()) await copyOne(f);
            await runLimited(rest, CONCURRENCY, copyOne);

            // --- Backend: sources only, pointed at placeholders (rule 1).
            const pending = manifest.workers.map(w => ({
                name: w.name,
                file: w.file,
                placeholderUrl: Core.placeholderWorkerUrl(w.name),
            }));
            if (pending.length) {
                onProgress && onProgress({ step: 'backend' });
                await window.rewriteWorkerUrlsInDir(newAppDir,
                    manifest.workers.map((w, i) => ({ oldUrl: w.url, newUrl: pending[i].placeholderUrl })));
            }

            // --- Preview. Non-fatal, as for a duplicate: the project is still
            // usable, and its first build gives it one.
            onProgress && onProgress({ step: 'preview' });
            const root = manifest.root ? newAppDir + '/' + manifest.root : newAppDir;
            let previewUrl = null, previewPath = null;
            try {
                const site = await puter.hosting.create(window.makeDraftSubdomain(), root);
                previewSub = site.subdomain;
                previewUrl = `https://${site.subdomain}.puter.site/`;
                previewPath = root;
            } catch (e) {
                console.warn('Template: could not create the preview for the copy:', e);
            }

            // --- The project. Same system prompt shape as new_chat, plus the
            // template context as a third block after the per-project tail.
            const systemPrompt = {
                role: 'system',
                content: [
                    { type: 'text', text: window.system_prompt_common(), cache_control: { type: 'ephemeral', ttl: '1h' } },
                    { type: 'text', text: window.system_prompt_dynamic(newAppDir) },
                    { type: 'text', text: Core.forkContextText(manifest, subdomain, pending) },
                ],
            };
            const now = new Date().toISOString();
            const title = Core.uniqueTitle(manifest.name, savedChats.map(c => (c && c.title) || ''));
            const forkedFrom = {
                subdomain,
                name: manifest.name,
                updatedAt: manifest.updatedAt,
                pendingWorkers: pending,
                allowMcp: false,
            };
            const chatData = {
                id: newId,
                title,
                customTitle: true,
                aiTitled: false,
                timestamp: now,
                history: [systemPrompt],
                lastModified: now,
                previewUrl,
                previewPath,
                publishedUrl: null,
                publishedPath: null,
                publishedVersionId: null,
                publishedAt: null,
                suggestions: [],
                interrupted: false,
                pinned: false,
                forkedFrom,
            };
            await puter.fs.write(chatFilePath(newId), JSON.stringify(chatData));
            savedChats.unshift({
                id: newId,
                title,
                customTitle: true,
                aiTitled: false,
                timestamp: now,
                lastModified: now,
                previewUrl,
                publishedUrl: null,
                pinned: false,
                forkedFrom,
            });
            await saveChatList();
            updateChatHistorySidebar();
            return newId;
        } catch (e) {
            if (previewSub) {
                try { await puter.hosting.delete(previewSub); }
                catch (e2) { console.warn('Template: could not remove the copy’s preview:', e2); }
            }
            try { await puter.fs.delete(newAppDir, { recursive: true }); }
            catch (e2) { /* nothing was written, or it is already gone */ }
            throw e;
        }
    }

    // Merge `patch` into a fork's origin record — its list entry (what
    // saveCurrentChat carries forward) and its chat file.
    async function updateForkedFrom(chatId, patch) {
        const entry = savedChats.find(c => c.id === chatId);
        if (!entry || !entry.forkedFrom) return;
        entry.forkedFrom = Object.assign({}, entry.forkedFrom, patch);
        await withChatFileLock(chatId, async () => {
            let chat;
            try { chat = JSON.parse(await readText(chatFilePath(chatId))); }
            catch (e) { if (isNotFoundError(e)) return; throw e; }
            chat.forkedFrom = Object.assign({}, chat.forkedFrom || entry.forkedFrom, patch);
            await puter.fs.write(chatFilePath(chatId), JSON.stringify(chat));
        });
        await saveChatList();
        if (chatId === currentChatId) renderTemplateOriginNote(entry.forkedFrom);
    }

    const _deployingBackend = new Set();

    // Deploy a fork's backend under fresh names in this account and point the
    // copy's placeholders at it (rule 1 — only ever after the review dialog).
    // Workers that fail stay pending for another try.
    async function deployForkBackend(chatId) {
        const entry = savedChats.find(c => c.id === chatId);
        const pending = (entry && entry.forkedFrom && entry.forkedFrom.pendingWorkers) || [];
        if (!pending.length || _deployingBackend.has(chatId)) return { deployed: [], failed: [] };
        _deployingBackend.add(chatId);
        try {
            const appDir = appDirFor(chatId);
            const all = await puter.workers.list();
            const taken = (Array.isArray(all) ? all : []).map(w => w && w.name);
            // The copy's own files, described the way planCopies expects a
            // source project's deployments: same directory in and out, the
            // placeholder standing in as the "old" address to rewrite.
            const records = pending.map(p => ({ name: p.name, url: p.placeholderUrl, file_path: appDir + '/' + p.file }));
            const plans = window.WorkerOwnership.planCopies(records, taken, appDir, appDir,
                () => Math.random().toString(36).slice(2, 8));
            const setup = await deployWorkerPlans(plans, appDir);
            const deployed = new Set(setup.renames.map(r => r.oldName));
            const remaining = pending.filter(p => !deployed.has(p.name));
            await updateForkedFrom(chatId, { pendingWorkers: remaining });
            return { deployed: setup.renames, failed: remaining.map(p => p.name) };
        } finally {
            _deployingBackend.delete(chatId);
        }
    }

    // ---- Turn policy for forks (rule 2) ---------------------------------------

    function openForkEntry() {
        if (!currentChatId || !Array.isArray(savedChats)) return null;
        const entry = savedChats.find(c => c && c.id === currentChatId);
        return entry && entry.forkedFrom ? entry : null;
    }

    window.autoFixBlockedForOpenProject = function () {
        if (!openForkEntry()) return false;
        return countUserMessages(chatHistory) === 0;
    };

    window.mcpBlockedForOpenProject = function () {
        const entry = openForkEntry();
        return !!entry && entry.forkedFrom.allowMcp !== true;
    };

    // ---- Dialog plumbing --------------------------------------------------------

    let _modalSeq = 0;

    // Mount a modal (backdrop, focus trap, Escape) around `$section`, a
    // .properties-modal.tpl-modal element. `canClose` can veto a close while
    // work is in flight.
    function openModal($section, { onClose, canClose } = {}) {
        const $overlay = $('<div class="confirm-modal-overlay tpl-overlay"></div>').append($section);
        const ns = 'keydown.tplModal' + (++_modalSeq);
        let settled = false;
        let releaseFocus = null;
        let pressedBackdrop = false;
        const close = (force) => {
            if (settled) return;
            if (force !== true && canClose && !canClose()) return;
            settled = true;
            $(document).off(ns);
            $overlay.removeClass('open');
            setTimeout(() => $overlay.remove(), 150);
            if (releaseFocus) releaseFocus();
            if (onClose) onClose();
        };
        $overlay.on('click', '.tpl-close', () => close());
        // Close only when the press also began on the backdrop (a text
        // selection dragged out of a field ends on the overlay).
        $overlay.on('pointerdown', (e) => { pressedBackdrop = e.target === $overlay[0]; });
        $overlay.on('click', (e) => {
            // Never let a click reach the sidebar's click-outside handler.
            e.stopPropagation();
            if (pressedBackdrop && e.target === $overlay[0]) close();
        });
        $(document).on(ns, (e) => {
            if (window.isComposingKeyEvent && window.isComposingKeyEvent(e)) return;
            if (e.key === 'Escape') { e.preventDefault(); close(); }
        });
        $('body').append($overlay);
        releaseFocus = trapDialogFocus($overlay);
        requestAnimationFrame(() => {
            $overlay.addClass('open');
            $section.trigger('focus');
        });
        return { $overlay, close };
    }

    function modalSection(titleId, title) {
        const $section = $(
            `<section class="properties-modal tpl-modal" role="dialog" aria-modal="true" aria-labelledby="${titleId}" tabindex="-1">` +
                '<div class="properties-modal-header">' +
                    `<div class="properties-modal-title" id="${titleId}"></div>` +
                    '<button type="button" class="properties-modal-x tpl-close" aria-label="Close">✕</button>' +
                '</div>' +
                '<div class="tpl-body"></div>' +
                '<div class="tpl-actions"></div>' +
            '</section>');
        $section.find('.properties-modal-title').text(title);
        return $section;
    }

    function tileFor(seed, name) {
        const $tile = $('<div class="tpl-tile" aria-hidden="true"></div>');
        if (typeof featuredPlaceholderStyle === 'function') $tile.attr('style', featuredPlaceholderStyle(seed));
        $tile.append($('<span></span>').text((name[0] || '?').toUpperCase()));
        return $tile;
    }

    function formatDay(iso) {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) { return ''; }
    }

    function plural(n, one, many) {
        return n + ' ' + (n === 1 ? one : (many || one + 's'));
    }

    async function copyText(text, $btn) {
        try {
            await navigator.clipboard.writeText(text);
            const label = $btn.text();
            $btn.text('Copied');
            setTimeout(() => $btn.text(label), 1500);
        } catch (e) {
            window.showToast?.('Couldn’t copy — select the link and copy it yourself.', { type: 'warning' });
        }
    }

    // ---- Share dialog (author) --------------------------------------------------

    function openShareTemplateDialog(chatId) {
        if (!enabled() || !window.user) return;
        const listEntry = savedChats.find(c => c.id === chatId) || {};
        const $section = modalSection('tpl-share-title', 'Share as template');
        const $body = $section.find('.tpl-body');
        const $actions = $section.find('.tpl-actions');
        let busy = false;
        const modal = openModal($section, { canClose: () => !busy });

        $body.append($('<p class="tpl-status"></p>').text('Checking the project…'));

        let info = null;
        let state = null;
        let includeAssets = false;
        let secretsAcknowledged = false;

        Promise.all([inspectProject(chatId), readTemplateState(chatId)]).then(([i, s]) => {
            info = i;
            state = s;
            includeAssets = !!(s && s.includeAssets);
            render();
        }).catch((e) => {
            console.error('Template: could not inspect the project:', e);
            $body.empty().append($('<p class="tpl-error"></p>').text('Couldn’t check this project right now. Check your connection and try again.'));
            $actions.empty().append('<button type="button" class="confirm-modal-btn tpl-secondary tpl-close">Close</button>');
        });

        function shipped() {
            const files = info.files.filter(f => includeAssets || !isAssetPath(f.path));
            const secrets = info.secrets.filter(s => includeAssets || !isAssetPath(s.file));
            return { files, secrets };
        }

        function render() {
            const nameVal = $body.find('.tpl-name').val();
            const descVal = $body.find('.tpl-desc').val();
            $body.empty();
            $actions.empty();

            if (!info.files.length) {
                $body.append($('<p class="tpl-intro"></p>').text('There’s nothing to share yet — build your app first, then share it as a template.'));
                $actions.append('<button type="button" class="confirm-modal-btn tpl-secondary tpl-close">Close</button>');
                return;
            }

            $body.append($('<p class="tpl-intro"></p>').text(
                'Anyone with the link can copy this project into their own Puter account and keep building on it. ' +
                'They get its files and backend code — never your conversation or your app’s data.'));

            if (state) {
                const link = templateLink(state.subdomain);
                const $row = $('<div class="tpl-link-row"></div>');
                $row.append($('<input type="text" class="tpl-link" readonly aria-label="Template link">').val(link));
                $row.append($('<button type="button" class="confirm-modal-btn tpl-secondary tpl-copy">Copy link</button>'));
                $body.append($row);
                const ago = formatPublishedAgo(state.updatedAt);
                $body.append($('<p class="tpl-muted"></p>').text(
                    (ago ? 'Last updated ' + ago + '. ' : '') + 'Changes you make later aren’t shared until you update the template.'));
            }

            const $name = $('<input type="text" class="tpl-name" autocomplete="off">')
                .attr('maxlength', Core.LIMITS.maxNameLength)
                .val(nameVal !== undefined ? nameVal : ((state && state.name) || listEntry.title || ''));
            const $desc = $('<textarea class="tpl-desc" rows="3"></textarea>')
                .attr('maxlength', Core.LIMITS.maxDescriptionLength)
                .val(descVal !== undefined ? descVal : ((state && state.description) || ''));
            $body.append($('<label class="tpl-field">Name</label>').append($name));
            $body.append($('<label class="tpl-field">Description <span class="tpl-optional">(optional)</span></label>').append($desc));

            const { files, secrets } = shipped();
            const bytes = files.reduce((n, f) => n + (f.size || 0), 0);
            const $list = $('<ul class="tpl-list"></ul>');
            $list.append($('<li></li>').text(`${plural(files.length, 'file')} (${Core.formatBytes(bytes)})`));
            if (info.workers.length) {
                $list.append($('<li></li>').text(`The source code of ${plural(info.workers.length, 'backend worker')} — not the data they store`));
            }
            $list.append($('<li></li>').text(`The template’s address, which includes its name, and your username (@${window.user.username}) as its author`));
            $body.append($('<div class="tpl-section-title">What’s shared</div>'), $list);

            const assetCount = info.files.filter(f => isAssetPath(f.path)).length;
            if (assetCount) {
                const $check = $('<label class="tpl-check"><input type="checkbox" class="tpl-assets"> <span></span></label>');
                $check.find('input').prop('checked', includeAssets);
                $check.find('span').text(`Include the ${plural(assetCount, 'file')} you attached in chat (assets/). Leave this off unless the app uses them, like a logo.`);
                $body.append($check);
            }
            if (info.hidden.length) {
                $body.append($('<p class="tpl-muted"></p>').text('Hidden files, such as .env, are never shared.'));
            }

            if (secrets.length) {
                const $warn = $('<div class="tpl-warning" role="alert"></div>');
                $warn.append($('<div class="tpl-warning-title"></div>').text('These look like secrets — anyone with the link could read them'));
                const $hits = $('<ul class="tpl-hits"></ul>');
                for (const s of secrets.slice(0, 8)) {
                    $hits.append($('<li></li>').text(`${s.file}, line ${s.line}: ${s.kind} (${s.excerpt})`));
                }
                if (secrets.length > 8) $hits.append($('<li></li>').text(`… and ${secrets.length - 8} more`));
                $warn.append($hits);
                $warn.append($('<p></p>').text('Remove them (ask the AI to move them out of the code), or confirm they’re safe to publish.'));
                const $ack = $('<label class="tpl-check"><input type="checkbox" class="tpl-secrets-ok"> <span>I’ve checked these — they’re safe to publish</span></label>');
                $ack.find('input').prop('checked', secretsAcknowledged);
                $warn.append($ack);
                $body.append($warn);
            }

            $body.append('<p class="tpl-error" role="alert"></p>');

            if (state) $actions.append('<button type="button" class="confirm-modal-btn tpl-danger tpl-stop">Stop sharing</button>');
            $actions.append('<span class="tpl-spacer"></span>');
            $actions.append('<button type="button" class="confirm-modal-btn tpl-secondary tpl-close">Close</button>');
            $actions.append($('<button type="button" class="confirm-modal-btn tpl-primary tpl-share"></button>')
                .text(state ? 'Update template' : 'Share template'));
            refreshShareButton();
        }

        function refreshShareButton() {
            const { secrets } = shipped();
            const nameOk = !!($body.find('.tpl-name').val() || '').trim();
            $actions.find('.tpl-share').prop('disabled', busy || !nameOk || (secrets.length > 0 && !secretsAcknowledged));
        }

        $body.on('input', '.tpl-name', refreshShareButton);
        $body.on('change', '.tpl-assets', function () { includeAssets = this.checked; render(); });
        $body.on('change', '.tpl-secrets-ok', function () { secretsAcknowledged = this.checked; refreshShareButton(); });
        $body.on('click', '.tpl-copy', function () { copyText(templateLink(state.subdomain), $(this)); });

        $actions.on('click', '.tpl-share', async function () {
            const $btn = $(this);
            busy = true;
            $btn.text(state ? 'Updating…' : 'Sharing…');
            $actions.find('button').prop('disabled', true);
            $body.find('.tpl-error').text('');
            try {
                state = await shareTemplate(chatId, {
                    name: $body.find('.tpl-name').val(),
                    description: $body.find('.tpl-desc').val(),
                    includeAssets,
                });
                busy = false;
                render();
                window.showToast?.('Template shared. Copy the link to send it to people.', { type: 'success' });
                $body.find('.tpl-copy').trigger('focus');
            } catch (e) {
                busy = false;
                console.error('Template: share failed:', e);
                let msg = (window.puterErrInfo ? window.puterErrInfo(e).message : (e && e.message)) || 'Please try again.';
                if (window.isSubdomainLimitErr && window.isSubdomainLimitErr(e)) {
                    msg = 'You’ve reached the maximum number of sites for your account. Delete a site you no longer need, then try again.';
                }
                $actions.find('button').prop('disabled', false);
                $btn.text(state ? 'Update template' : 'Share template');
                refreshShareButton();
                $body.find('.tpl-error').text('Couldn’t share the template. ' + msg);
            }
        });

        $actions.on('click', '.tpl-stop', async function () {
            if (!await puterConfirm('Stop sharing this template? Its link will stop working. Copies people have already made are theirs and are not affected.')) return;
            busy = true;
            $actions.find('button').prop('disabled', true);
            try {
                await deleteChatTemplate(chatId);
                state = null;
                busy = false;
                render();
                window.showToast?.('The template is no longer shared.', { type: 'info' });
            } catch (e) {
                busy = false;
                console.error('Template: could not stop sharing:', e);
                $actions.find('button').prop('disabled', false);
                refreshShareButton();
                $body.find('.tpl-error').text('Couldn’t stop sharing right now. Try again in a moment.');
            }
        });

        return modal;
    }

    // ---- Template card (forker) ---------------------------------------------------

    function readTemplateParam() {
        try { return new URLSearchParams(window.location.search).get('template'); }
        catch (e) { return null; }
    }

    function clearTemplateParam() {
        try {
            const url = new URL(window.location.href);
            if (!url.searchParams.has('template')) return;
            url.searchParams.delete('template');
            history.replaceState(history.state, '', url.pathname + url.search + url.hash);
        } catch (e) { /* cosmetic only */ }
    }

    function openTemplateCard(subdomain) {
        const $section = modalSection('tpl-card-title', 'Template');
        const $body = $section.find('.tpl-body');
        const $actions = $section.find('.tpl-actions');
        let busy = false;
        let manifest = null;
        const modal = openModal($section, { canClose: () => !busy, onClose: clearTemplateParam });

        $body.append($('<p class="tpl-status"></p>').text('Loading template…'));
        $actions.append('<span class="tpl-spacer"></span><button type="button" class="confirm-modal-btn tpl-secondary tpl-close">Cancel</button>');

        const showError = (message) => {
            $section.find('.properties-modal-title').text('Template unavailable');
            $body.empty().append($('<p class="tpl-intro"></p>').text(message));
            $actions.empty().append('<span class="tpl-spacer"></span><button type="button" class="confirm-modal-btn tpl-secondary tpl-close">Close</button>');
        };

        if (!subdomain) {
            showError('This template link isn’t valid.');
            return modal;
        }

        fetchTemplate(subdomain).then((m) => {
            manifest = m;
            $section.find('.properties-modal-title').text(m.name);
            $body.empty();
            const $head = $('<div class="tpl-card-head"></div>');
            $head.append(tileFor(subdomain, m.name));
            const $meta = $('<div class="tpl-card-meta"></div>');
            // The address is the one thing the builder can vouch for; the
            // listed author is whatever the template says (rule 3).
            $meta.append($('<div class="tpl-card-host"></div>').text(subdomain + '.puter.site'));
            if (m.author) {
                $meta.append($('<div class="tpl-muted"></div>').text(`Lists @${m.author} as its author (not verified)`));
            }
            const bits = [plural(m.files.length, 'file'), Core.formatBytes(Core.totalBytes(m))];
            const day = formatDay(m.updatedAt);
            if (day) bits.push('updated ' + day);
            $meta.append($('<div class="tpl-muted"></div>').text(bits.join(' · ')));
            $head.append($meta);
            $body.append($head);
            if (m.description) $body.append($('<p class="tpl-description"></p>').text(m.description));
            const $notes = $('<ul class="tpl-list"></ul>');
            $notes.append($('<li></li>').text('You get your own copy in your account. Nothing you change affects the original.'));
            if (m.workers.length) {
                $notes.append($('<li></li>').text(`Includes a backend (${plural(m.workers.length, 'worker')}). It isn’t deployed until you’ve read its code and chosen to — it would run in your account.`));
            }
            $notes.append($('<li></li>').text('Only use templates from people you trust: its code runs in your preview.'));
            $body.append($notes);
            $body.append('<p class="tpl-status" aria-live="polite"></p><p class="tpl-error" role="alert"></p>');
            $actions.append('<button type="button" class="confirm-modal-btn tpl-primary tpl-use">Use this template</button>');
            $actions.find('.tpl-use').trigger('focus');
        }).catch((e) => showError(e && e.message ? e.message : 'This template couldn’t be loaded.'));

        $actions.on('click', '.tpl-use', async function () {
            if (!manifest || busy) return;
            const $btn = $(this);
            const $status = $body.find('.tpl-status');
            const $error = $body.find('.tpl-error').text('');
            busy = true;
            $actions.find('button').prop('disabled', true);
            $btn.text('Copying…');
            const restore = (message) => {
                busy = false;
                $actions.find('button').prop('disabled', false);
                $btn.text('Use this template');
                $status.text('');
                if (message) $error.text(message);
            };
            // Nothing awaited before this: the sign-in popup must open inside
            // the click.
            try { await ensureAuthenticated(); }
            catch (e) { restore('Sign in to use this template.'); return; }
            if (!await confirmLeaveActiveChat()) { restore(''); return; }
            let newId;
            try {
                newId = await forkTemplate(subdomain, manifest, {
                    onProgress: (p) => {
                        if (p.step === 'files') $status.text(`Copying files (${p.done} of ${p.total})…`);
                        else if (p.step === 'backend') $status.text('Preparing the backend code…');
                        else if (p.step === 'preview') $status.text('Setting up your preview…');
                    },
                });
            } catch (e) {
                console.error('Template: fork failed:', e);
                restore('Couldn’t copy the template. ' + (e && e.message ? e.message : 'Please try again.'));
                return;
            }
            busy = false;
            clearTemplateParam();
            modal.close(true);
            window.track?.('Template Forked', { files: manifest.files.length, workers: manifest.workers.length });
            try { await loadChat(newId); } catch (e) { return; }
            // The draft site was just created; wait for it to propagate before
            // showing it, as publish_site does.
            const chat = savedChats.find(c => c.id === newId);
            if (currentChatId === newId && chat && chat.previewUrl) {
                window.showAppPreview(chat.previewUrl, { waitForReady: true });
            }
        });

        return modal;
    }

    // ?template=<subdomain>: open the card. Called once boot has settled (see
    // app.js). A URL that also restores a project (?p=) belongs to that
    // project, so the template param is simply dropped.
    window.openTemplateFromUrl = function () {
        if (!enabled()) return;
        const raw = readTemplateParam();
        if (raw === null) return;
        if (typeof readUrlChatId === 'function' && readUrlChatId()) { clearTemplateParam(); return; }
        openTemplateCard(Core.parseSubdomain(raw));
    };

    // ---- Backend review (forker) ----------------------------------------------------

    const REVIEW_MAX_CHARS = 200000;

    function openBackendReview(chatId) {
        const entry = savedChats.find(c => c.id === chatId);
        const pending = (entry && entry.forkedFrom && entry.forkedFrom.pendingWorkers) || [];
        if (!pending.length) return;
        if (chatId === currentChatId && isProcessing) {
            window.showToast?.('Finishing the current task — you can deploy the backend the moment it’s done.', { type: 'info', key: 'tpl-deploy-blocked', throttleMs: 3000 });
            return;
        }
        const $section = modalSection('tpl-review-title', 'Review the backend');
        $section.addClass('tpl-review-modal');
        const $body = $section.find('.tpl-body');
        const $actions = $section.find('.tpl-actions');
        let busy = false;
        const modal = openModal($section, { canClose: () => !busy });

        $body.append($('<p class="tpl-intro"></p>').text(
            'This code came with the template and was written by its author. Once deployed it runs in your account, ' +
            'with access to your Puter storage, databases and AI usage. Read it before you deploy it.'));
        const $files = $('<div class="tpl-review-files"></div>');
        $body.append($files);
        $body.append('<p class="tpl-status" aria-live="polite"></p><p class="tpl-error" role="alert"></p>');
        $actions.append('<span class="tpl-spacer"></span>');
        $actions.append('<button type="button" class="confirm-modal-btn tpl-secondary tpl-close">Cancel</button>');
        $actions.append($('<button type="button" class="confirm-modal-btn tpl-primary tpl-deploy" disabled></button>')
            .text(pending.length === 1 ? 'Deploy worker' : `Deploy ${pending.length} workers`));

        const appDir = appDirFor(chatId);
        Promise.all(pending.map(async (p) => {
            let code;
            try { code = await readText(appDir + '/' + p.file); }
            catch (e) { code = null; }
            return { p, code };
        })).then((results) => {
            for (const { p, code } of results) {
                const $file = $('<details class="tpl-review-file" open></details>');
                $file.append($('<summary></summary>').text(p.file));
                const shown = code === null ? '(This file is missing — the worker can’t be deployed.)'
                    : code.length > REVIEW_MAX_CHARS ? code.slice(0, REVIEW_MAX_CHARS) + '\n\n… (truncated)' : code;
                $file.append($('<pre class="tpl-code"></pre>').text(shown));
                $files.append($file);
            }
            $actions.find('.tpl-deploy').prop('disabled', false);
        });

        $actions.on('click', '.tpl-deploy', async function () {
            busy = true;
            $actions.find('button').prop('disabled', true);
            $body.find('.tpl-status').text('Deploying…');
            try {
                const result = await deployForkBackend(chatId);
                busy = false;
                modal.close(true);
                if (result.failed.length) {
                    window.showToast?.(`Deployed ${plural(result.deployed.length, 'worker')}; ${result.failed.join(', ')} couldn’t be deployed. Try again from the note above the conversation.`, { type: 'warning', duration: 8000 });
                } else {
                    window.showToast?.('The backend is deployed.', { type: 'success' });
                }
                if (chatId === currentChatId && result.deployed.length) window.refreshPreviewWhenReady?.();
            } catch (e) {
                busy = false;
                console.error('Template: backend deploy failed:', e);
                $actions.find('button').prop('disabled', false);
                $body.find('.tpl-status').text('');
                $body.find('.tpl-error').text('Couldn’t deploy the backend right now. Try again in a moment.');
            }
        });
    }

    // ---- Origin note (atop a fork's conversation) ------------------------------------

    function renderTemplateOriginNote(forkedFrom) {
        $('.chat-box > .template-origin-note').remove();
        if (!enabled() || !forkedFrom || typeof forkedFrom !== 'object') return;
        const sub = Core.parseSubdomain(forkedFrom.subdomain);
        if (!sub) return;
        const chatId = currentChatId;
        const name = String(forkedFrom.name || 'a template').slice(0, Core.LIMITS.maxNameLength);
        const $note = $('<div class="template-origin-note" role="note"></div>');
        const $line = $('<div class="tpl-note-line"></div>');
        $line.append(document.createTextNode('Started from the template '));
        $line.append($('<a target="_blank" rel="noopener noreferrer"></a>').attr('href', templateLink(sub)).text(name));
        $line.append($('<span class="tpl-note-host"></span>').text(' · ' + sub + '.puter.site'));
        $note.append($line);

        const pending = Array.isArray(forkedFrom.pendingWorkers) ? forkedFrom.pendingWorkers : [];
        if (pending.length) {
            const $row = $('<div class="tpl-note-row"></div>');
            $row.append($('<span></span>').text(
                `Its backend (${plural(pending.length, 'worker')}) isn’t running. It was written by the template’s author and would run in your account.`));
            $row.append($('<button type="button" class="tpl-note-btn tpl-note-deploy">Review and deploy</button>'));
            $note.append($row);
        }

        const mcpCount = (window.mcpManager && typeof window.mcpManager.list === 'function') ? window.mcpManager.list().length : 0;
        if (forkedFrom.allowMcp !== true && mcpCount) {
            const $row = $('<div class="tpl-note-row"></div>');
            $row.append($('<span></span>').text('Your MCP connections are off in this project, because its files came from someone else.'));
            $row.append($('<button type="button" class="tpl-note-btn tpl-note-mcp">Turn on</button>'));
            $note.append($row);
        }

        $note.on('click', '.tpl-note-deploy', () => openBackendReview(chatId));
        $note.on('click', '.tpl-note-mcp', async () => {
            if (!await puterConfirm('Let the AI use your MCP connections in this project? Its files were written by the template’s author and could try to trick the AI into misusing your connected services.')) return;
            try { await updateForkedFrom(chatId, { allowMcp: true }); }
            catch (e) { window.showToast?.('Couldn’t save that setting. Try again.', { type: 'error' }); }
        });
        $('.chat-box').prepend($note);
    }
    window.renderTemplateOriginNote = renderTemplateOriginNote;

    // The MCP row depends on whether any connections exist.
    window.addEventListener('mcp-connections-changed', () => {
        const entry = openForkEntry();
        if (entry && $('.chat-box > .template-origin-note').length) renderTemplateOriginNote(entry.forkedFrom);
    });

    // ---- Settings dialog rows -------------------------------------------------------

    window.appendTemplatePropertiesRows = function ($rows, chatId, forkedFrom) {
        if (!enabled() || !$rows || !$rows.length) return;
        const row = (key) => {
            const $row = $('<div class="properties-row"><span class="properties-key"></span><span class="properties-val"></span></div>');
            $row.find('.properties-key').text(key);
            $rows.append($row);
            return $row.find('.properties-val');
        };
        const sub = forkedFrom && Core.parseSubdomain(forkedFrom.subdomain);
        if (sub) {
            row('Started from').append($('<a target="_blank" rel="noopener noreferrer"></a>')
                .attr('href', templateLink(sub)).text(String(forkedFrom.name || sub).slice(0, Core.LIMITS.maxNameLength)));
        }
        readTemplateState(chatId).then((state) => {
            if (!state) return;
            const $val = row('Template');
            $val.append($('<a target="_blank" rel="noopener noreferrer"></a>').attr('href', templateLink(state.subdomain)).text('Shared'));
            const ago = formatPublishedAgo(state.updatedAt);
            if (ago) $val.append(document.createTextNode(' · updated ' + ago));
        }).catch(() => { /* the row is informational only */ });
    };

    window.openShareTemplateDialog = openShareTemplateDialog;
    window.deleteChatTemplate = deleteChatTemplate;

    // The I/O, for scripts/test-templates.mjs.
    window.Templates = {
        inspectProject,
        shareTemplate,
        deleteChatTemplate,
        readTemplateState,
        fetchTemplate,
        forkTemplate,
        deployForkBackend,
        updateForkedFrom,
        templateLink,
    };
})();
