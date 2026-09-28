// templates.js — official project templates: the landing section, the
// template dialog, the /?template=<slug> deep link, and the fork itself.
//
// What a template is, and how the build ships it, is described at the top of
// js/template-core.js (the pure half of this feature). This file is the half
// that talks to the network, the user's account and the DOM.
//
// Forking a template creates a project exactly like one the user built
// themselves, so everything downstream (the sidebar, version history, Make a
// copy, Publish, Delete) needs no special case:
//   * its files are written into a fresh app directory;
//   * each worker it ships is deployed under a fresh account-unique name
//     from <appDir>/workers/<name>.js, so the project owns it by the rule in
//     worker-ownership.js, and deleting the project deletes it;
//   * it gets its own draft preview site;
//   * its system prompt carries one extra block (TemplateCore.
//     buildTemplateNote) telling the model the app already exists, and the
//     system message records where it came from (templateOrigin, stripped
//     before the history is sent — see prepareHistoryForAI in helpers.js).
// A fork that cannot deploy its backend is not made: a frontend left calling
// {{WORKER_URL:…}} placeholders would be broken on arrival, and a half-made
// fork's workers would be orphaned. Everything it created is removed again.
(function () {
    'use strict';

    const INDEX_URL = '/templates.json';
    const CACHE_KEY = 'templateIndexCache';
    const DISPLAY_COUNT = 6;

    let _templates = null;       // sanitized list once the index has loaded
    let _indexRequest = null;    // in-flight fetch of the index, shared
    let _forking = null;         // slug of the fork in flight, if any
    let _deepLink = null;        // { slug, handoffId } captured at boot

    const core = () => window.TemplateCore;
    const enabled = () => !!window.FEATURE_FLAGS?.templates;

    // ---- The index ------------------------------------------------------------

    function readCachedIndex() {
        try {
            return core().sanitizeIndex(JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'));
        } catch (e) {
            return [];
        }
    }

    // Resolves with the sanitized template list ([] when unavailable). The
    // first call fetches; later calls share that result. A failed fetch is not
    // remembered, so the next caller (a dialog, a deep link) tries again.
    function loadTemplates() {
        if (_templates) return Promise.resolve(_templates);
        if (_indexRequest) return _indexRequest;
        _indexRequest = fetch(INDEX_URL, { cache: 'no-cache' })
            .then(r => (r.ok ? r.json() : null))
            .then(data => {
                const list = core().sanitizeIndex(data);
                if (list.length) {
                    _templates = list;
                    try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) { /* cache is an optimization only */ }
                }
                return list;
            })
            .catch(() => [])
            .finally(() => { _indexRequest = null; });
        return _indexRequest;
    }

    async function findTemplate(slug) {
        const list = await loadTemplates();
        return list.find(t => t.slug === slug) || null;
    }

    // ---- The fork -------------------------------------------------------------

    function randomSuffix() {
        return Math.random().toString(36).slice(2, 8);
    }

    // Run fn over items, `limit` at a time, in order. Unlike mapWithConcurrency
    // (app.js), the first failure stops any further item from starting, and the
    // call rejects only once the ones already running have settled: a fork's
    // cleanup deletes its directory, and a write still in flight must not
    // recreate a file in it afterwards.
    async function runPool(items, limit, fn) {
        const results = new Array(items.length);
        let next = 0;
        let error = null;
        async function worker() {
            while (!error && next < items.length) {
                const i = next++;
                try { results[i] = await fn(items[i], i); }
                catch (e) { if (!error) error = e; }
            }
        }
        const workers = [];
        for (let i = 0; i < Math.min(limit, items.length); i++) workers.push(worker());
        await Promise.all(workers);
        if (error) throw error;
        return results;
    }

    // Fetch every file of a template. Text files come back as strings (a fork
    // rewrites worker placeholders in them), everything else as a Blob.
    async function fetchTemplateFiles(template) {
        const fetchOne = async (path) => {
            const res = await fetch(core().fileUrl(template, path), { cache: 'no-cache' });
            if (!res.ok) throw new Error(`could not download ${path} (HTTP ${res.status})`);
            return core().isTextFile(path)
                ? { path, text: await res.text(), blob: null }
                : { path, text: null, blob: await res.blob() };
        };
        return runPool(template.files, 6, fetchOne);
    }

    // Put back everything a failed fork created. Best effort: nothing here was
    // ever listed in the sidebar, so a leftover costs storage, not correctness —
    // except a worker, which is why those go first.
    async function discardFork(appDir, deployed, subdomain) {
        for (const w of deployed) {
            try { await puter.workers.delete(w.name); }
            catch (e) { console.warn('Template: could not remove the worker of a failed fork:', w.name, e); }
        }
        if (subdomain) {
            try { await puter.hosting.delete(subdomain); }
            catch (e) { console.warn('Template: could not remove the preview of a failed fork:', subdomain, e); }
        }
        try { await puter.fs.delete(appDir, { recursive: true }); }
        catch (e) { /* the directory may never have been created */ }
    }

    // Copy a template into a new project in the signed-in user's account.
    // Resolves with the new chat id, or null when nothing was made (already
    // forking, the user declined to leave a running build). Throws on failure
    // after cleaning up; the caller tells the user.
    async function createFork(template) {
        const username = window.user.username;
        const parentDir = `/${username}/AppData/${puter.appID}`;
        const newId = generateChatId();
        const appDir = `${parentDir}/${newId}`;

        const files = await fetchTemplateFiles(template);
        const byPath = new Map(files.map(f => [f.path, f]));

        // Every placeholder must name a worker this template ships, or the
        // fork would leave a dead reference behind. The build checks this too;
        // this is the runtime half of the same promise.
        for (const f of files) {
            if (f.text == null) continue;
            const unknown = core().placeholdersIn(f.text).filter(n => template.workers.indexOf(n) === -1);
            if (unknown.length) throw new Error(`${f.path} refers to an unknown backend (${unknown.join(', ')})`);
        }

        const deployed = [];     // { templateName, name, url }
        let subdomain = null;
        try {
            // 1. The backend. Deployed first, so the frontend can be written
            //    with its real URLs in place of the placeholders.
            if (template.workers.length) {
                const existing = await puter.workers.list();
                const taken = (Array.isArray(existing) ? existing : []).map(w => w && w.name).filter(Boolean);
                for (const workerName of template.workers) {
                    const name = window.WorkerOwnership.deriveCopyName(
                        core().workerBaseName(template.slug, workerName), taken, randomSuffix);
                    if (!name) throw new Error('could not pick a name for the backend');
                    taken.push(name);
                    // create_worker's own convention (workers/<name>.js), so a
                    // later edit by the project's AI redeploys this same worker
                    // from this same file.
                    const filePath = `${appDir}/workers/${name}.js`;
                    const source = byPath.get(`workers/${workerName}.js`).text;
                    await window.withFileLock(filePath, () => window.writeFileVerified(filePath, source));
                    const created = await puter.workers.create(name, filePath, { sandbox: true });
                    if (!created || created.success === false || !created.url) {
                        throw new Error('the backend did not deploy');
                    }
                    deployed.push({ templateName: workerName, name, url: created.url });
                }
            }

            // 2. Everything else, placeholders swapped for the fork's own URLs.
            const urls = {};
            for (const w of deployed) urls[w.templateName] = w.url;
            const rest = files.filter(f => !core().isWorkerSource(f.path, template.workers));
            await runPool(rest, 4, async (f) => {
                let data = f.blob;
                if (f.text != null) {
                    const out = core().substituteWorkerUrls(f.text, urls);
                    if (out.missing.length) throw new Error(`${f.path} refers to a backend that was not deployed`);
                    data = out.text;
                }
                await puter.fs.write(`${appDir}/${f.path}`, data, { createMissingParents: true });
            });
        } catch (e) {
            await discardFork(appDir, deployed, subdomain);
            throw e;
        }

        // 3. The draft preview. A failure here keeps the fork (its files are
        //    complete and the model opens a preview on the first turn), the
        //    same call duplicateChat makes.
        let previewUrl = null;
        try {
            const site = await puter.hosting.create(window.makeDraftSubdomain(), appDir);
            subdomain = site.subdomain;
            previewUrl = `https://${site.subdomain}.puter.site/`;
        } catch (e) {
            console.warn('Template: could not open a preview for the new project:', e);
        }

        // 4. The project itself: a system prompt that knows the app exists,
        //    the template's own follow-up chips, and a title the auto-namers
        //    leave alone (customTitle, see saveCurrentChat).
        const renamedFiles = template.files.map(p => {
            const w = template.workers.find(n => p === `workers/${n}.js`);
            return w ? `workers/${deployed.find(d => d.templateName === w).name}.js` : p;
        });
        const note = core().buildTemplateNote({
            name: template.name,
            appDir,
            files: renamedFiles,
            previewUrl,
            workers: deployed,
        });
        const systemMessage = {
            role: 'system',
            // The same two blocks every project starts with (see
            // initAuthenticatedState), plus the template note after them so
            // the cached common prefix is untouched.
            content: [
                { type: 'text', text: window.system_prompt_common(), cache_control: { type: 'ephemeral', ttl: '1h' } },
                { type: 'text', text: window.system_prompt_dynamic(appDir) },
                { type: 'text', text: note },
            ],
            templateOrigin: { slug: template.slug, name: template.name, version: template.version },
        };
        const now = new Date().toISOString();
        const title = core().uniqueTitle(template.name, savedChats.map(c => c.title || ''));
        const chatData = {
            id: newId,
            title,
            customTitle: true,
            aiTitled: false,
            timestamp: now,
            history: [systemMessage],
            lastModified: now,
            previewUrl,
            previewPath: previewUrl ? appDir : null,
            publishedUrl: null,
            publishedPath: null,
            publishedVersionId: null,
            publishedAt: null,
            suggestions: template.suggestions,
            interrupted: false,
            pinned: false,
        };
        try {
            await puter.fs.write(`chat-history/${newId}.json`, JSON.stringify(chatData));
        } catch (e) {
            await discardFork(appDir, deployed, subdomain);
            throw e;
        }
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
        });
        await saveChatList();
        updateChatHistorySidebar();

        // A restore point for the template as it arrived, so "back to the
        // original" is always one click in Version history. Fire and forget:
        // a failed snapshot costs that convenience, never the project.
        window.createProjectVersion?.({ chatId: newId, appDir, label: `${template.name} template` });
        return newId;
    }

    // Fork `slug` and open the new project. Signs the visitor in first, so it
    // must be called from inside a click (the only place the sign-in popup is
    // allowed to open) unless they are already signed in.
    async function forkTemplate(slug, { source = 'app' } = {}) {
        if (_forking) return null;
        _forking = slug;
        const startedIn = currentChatId;
        let template = null;
        try {
            await ensureAuthenticated();
            template = await findTemplate(slug);
            if (!template) {
                window.showToast?.("That template isn't available right now. Try again in a moment.", { type: 'error' });
                return null;
            }
            if (!await confirmLeaveActiveChat()) return null;
            window.showProjectLoading?.(template.name, { hasPreview: true });
            const newId = await createFork(template);
            window.track?.('Template Used', { template: template.slug, source });
            // The user may have opened another project while the fork was
            // being made. Don't pull them out of it: the new one is in the
            // sidebar, and a toast says where.
            if (currentChatId !== startedIn) {
                window.showToast?.(`“${template.name}” is ready in your projects.`, { type: 'success' });
                return newId;
            }
            await loadChat(newId, { urlMode: 'push' }).catch(() => {});
            // The site was created seconds ago: wait for it to reach the CDN
            // (with the usual overlay) rather than showing a not-found page.
            if (currentChatId === newId && window.currentPreviewUrl) {
                window.showAppPreview(window.currentPreviewUrl, { waitForReady: true });
            }
            return newId;
        } catch (e) {
            window.hideProjectLoading?.();
            // A dismissed sign-in is the user's answer, not an error.
            if (!window.user || window.user.is_temp) return null;
            console.error('Could not create a project from the template:', e);
            const name = template ? `“${template.name}”` : 'this template';
            puter.ui.alert(`Couldn't create a project from ${name}. Nothing was added to your account, so you can safely try again.`);
            return null;
        } finally {
            _forking = null;
        }
    }

    // ---- The dialog -----------------------------------------------------------

    // Preview card for one template: screenshot, name, description, and the
    // button that forks it. Used by the landing cards and by a /?template=
    // link that arrives without a click behind it.
    function openTemplateDialog(template, { source = 'app' } = {}) {
        $('.template-modal-overlay').remove();
        const $overlay = $(`
            <div class="confirm-modal-overlay template-modal-overlay">
                <div class="template-modal" role="dialog" aria-modal="true" aria-labelledby="template-modal-title" aria-describedby="template-modal-body">
                    <div class="template-modal-thumb"></div>
                    <div class="template-modal-content">
                        <div class="template-modal-eyebrow">Template</div>
                        <h2 class="template-modal-title" id="template-modal-title"></h2>
                        <p class="template-modal-body" id="template-modal-body"></p>
                        <p class="template-modal-note">It is copied into a new project in your account, where you can change anything by describing it.</p>
                        <div class="template-modal-actions">
                            <a class="template-modal-details" target="_blank" rel="noopener">About this template</a>
                            <button type="button" class="confirm-modal-btn confirm-modal-cancel template-modal-cancel">Cancel</button>
                            <button type="button" class="confirm-modal-btn template-modal-use">Use this template</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
        $overlay.find('.template-modal-title').text(template.name);
        $overlay.find('.template-modal-body').text(template.description);
        $overlay.find('.template-modal-details').attr('href', `/templates/${template.slug}/`);
        $overlay.find('.template-modal-thumb').append(buildThumb(template, { eager: true }));

        let releaseFocus = null;
        const close = () => {
            $(document).off('keydown.templateModal');
            $overlay.removeClass('open');
            setTimeout(() => $overlay.remove(), 150);
            if (releaseFocus) releaseFocus();
        };
        const $use = $overlay.find('.template-modal-use');
        $use.on('click', () => {
            if ($use.prop('disabled')) return;
            $use.prop('disabled', true).text('Copying…');
            // Called synchronously from the click so a signed-out visitor's
            // sign-in popup is allowed to open.
            const fork = forkTemplate(template.slug, { source });
            // A declined sign-in or a failure leaves the dialog up to try
            // again; the new project's arrival takes it down.
            fork.then((newId) => {
                if (newId) close();
                else $use.prop('disabled', false).text('Use this template');
            });
        });
        $overlay.find('.template-modal-cancel').on('click', close);
        $overlay.on('mousedown', (e) => { if (e.target === $overlay[0]) close(); });
        $overlay.find('.template-modal').on('mousedown click', (e) => e.stopPropagation());
        $(document).on('keydown.templateModal', (e) => {
            if (e.key === 'Escape' && !$use.prop('disabled')) { e.preventDefault(); close(); }
        });

        $('body').append($overlay);
        releaseFocus = window.trapDialogFocus ? window.trapDialogFocus($overlay) : null;
        requestAnimationFrame(() => {
            $overlay.addClass('open');
            $use.trigger('focus');
        });
        window.track?.('Template Viewed', { template: template.slug, source });
    }

    // ---- The landing section --------------------------------------------------

    function buildThumb(template, { eager = false } = {}) {
        const $thumb = $('<div class="feed-thumb"></div>');
        // The feed's own gradient + initial placeholder, from featured.js.
        const placeholder = () => buildFeaturedPlaceholder({ id: template.slug, name: template.name });
        if (template.thumbnail) {
            const $img = $('<img class="feed-thumb-img" alt="" decoding="async">');
            $img.on('load', () => $img.addClass('loaded'));
            $img.on('error', () => { $img.remove(); $thumb.append(placeholder()); });
            if (!eager) $img.attr('loading', 'lazy');
            $img.attr('src', template.thumbnail);
            $thumb.append($img);
        } else {
            $thumb.append(placeholder());
        }
        return $thumb;
    }

    function buildCard(template) {
        const $card = $('<button type="button" class="feed-card template-card"></button>')
            .attr('data-template', template.slug)
            .attr('aria-label', `${template.name} template${template.description ? ': ' + template.description : ''}`);
        $card.append(buildThumb(template));
        const $meta = $('<div class="feed-card-meta"></div>');
        const $row = $('<div class="feed-card-title-row"></div>');
        $row.append($('<span class="feed-card-title"></span>').text(template.name));
        if (template.category) $row.append($('<span class="feed-card-cat"></span>').text(template.category));
        $meta.append($row);
        if (template.description) $meta.append($('<div class="feed-card-desc"></div>').text(template.description));
        $card.append($meta);
        return $card;
    }

    function renderTemplatesSection(list) {
        const $section = $('.home-templates');
        if (!$section.length) return;
        if (!list.length) {
            $section.attr('hidden', true).empty();
        } else {
            const $head = $('<div class="home-feed-head"></div>');
            $head.append($('<h2 class="home-feed-title"></h2>').text('Start from a template'));
            $head.append($('<a class="home-feed-sub home-templates-all" href="/templates/"></a>').text('All templates'));
            const $grid = $('<div class="home-feed-grid"></div>');
            list.slice(0, DISPLAY_COUNT).forEach(t => $grid.append(buildCard(t)));
            $section.empty().append($head, $grid).removeAttr('hidden');
        }
        window.syncHomeFeedLayout?.();
    }

    // ---- The fork's opening note ----------------------------------------------

    // Shown at the top of a forked project's conversation (see loadChat). Its
    // history starts with only the system prompt, so without this the project
    // would open onto an empty chat with no hint of where the app came from.
    // Rendered from the persisted origin, never from HTML.
    function renderTemplateOriginNote(origin) {
        const name = typeof origin?.name === 'string' ? origin.name.slice(0, 80) : '';
        if (!name) return;
        const $note = $('<div class="template-origin" role="note"></div>');
        const $line = $('<p class="template-origin-line"></p>');
        $line.append(document.createTextNode('Started from the '));
        const slug = typeof origin.slug === 'string' && core().SLUG_RE.test(origin.slug) ? origin.slug : '';
        const $name = slug
            ? $('<a target="_blank" rel="noopener"></a>').attr('href', `/templates/${slug}/`)
            : $('<strong></strong>');
        $line.append($name.text(name), document.createTextNode(' template.'));
        $note.append($line);
        $note.append($('<p class="template-origin-sub"></p>')
            .text('It is your project now. Describe what you would like to change, or pick an idea below.'));
        $('.chat-box').append($note);
    }

    // ---- Deep links -----------------------------------------------------------

    // /?template=<slug>, from a template page's "Use this template" button (or
    // any link). Read at boot, before applyPromptDeepLink, and taken out of
    // the address bar at once. A `handoff` id travelling with it belongs to
    // this link, so it is removed here too: the composer handoff must never
    // consume a template's record as an empty send.
    function captureTemplateDeepLink() {
        let slug = null, handoffId = null;
        try {
            const params = new URLSearchParams(window.location.search);
            slug = params.get('template');
            handoffId = params.get('handoff');
        } catch (e) { return; }
        if (slug === null) return;
        try {
            const url = new URL(window.location.href);
            url.searchParams.delete('template');
            url.searchParams.delete('handoff');
            history.replaceState(history.state, '', url.pathname + url.search + url.hash);
        } catch (e) { /* cosmetic only */ }
        // A link that also restores a project is about that project.
        if (!enabled() || readUrlChatId() || !core().SLUG_RE.test(slug || '')) return;
        _deepLink = {
            slug,
            handoffId: /^[A-Za-z0-9-]{8,64}$/.test(handoffId || '') ? handoffId : null,
        };
    }

    // Once auth has settled. The template page signs the visitor in and parks
    // {template: slug} in same-origin storage before navigating, so a record
    // for this slug means their own click on our button is behind this link:
    // the fork starts straight away. Anything else (an outside link, a
    // made-up id, a sign-in that did not happen) gets the dialog instead, and
    // the fork waits for a click there.
    async function consumeTemplateDeepLink() {
        const link = _deepLink;
        _deepLink = null;
        if (!link) return;

        let record = null;
        if (link.handoffId) {
            try { record = await window.BuilderHandoff?.take(link.handoffId); }
            catch (e) { console.warn('Could not read the template handoff:', e); }
        }
        const template = await findTemplate(link.slug);
        if (!template) {
            window.showToast?.("That template isn't available right now. Try again in a moment.", { type: 'error' });
            return;
        }
        const clicked = !!(record && record.template === link.slug);
        if (clicked && window.user && !window.user.is_temp) {
            await forkTemplate(link.slug, { source: 'page' });
            return;
        }
        openTemplateDialog(template, { source: 'link' });
    }

    // ---- Boot -----------------------------------------------------------------

    // Called once from boot (app.js), right after initFeaturedFeed(). Paints
    // the cached index synchronously (pre-reveal, like the feed), then
    // revalidates. The kill switch (FEATURE_FLAGS.templates) leaves the
    // section out of the landing entirely (renderSkeleton) and makes every
    // entry point here a no-op.
    function initTemplates() {
        if (!enabled()) return;
        const cached = readCachedIndex();
        if (cached.length) renderTemplatesSection(cached);
        loadTemplates().then((list) => {
            if (list.length && JSON.stringify(list) !== JSON.stringify(cached)) renderTemplatesSection(list);
        });

        $(document).off('click.templates').on('click.templates', '.template-card', async function () {
            const slug = this.getAttribute('data-template');
            const template = await findTemplate(slug);
            if (template) openTemplateDialog(template, { source: 'landing' });
        });
    }

    window.initTemplates = initTemplates;
    window.renderTemplateOriginNote = renderTemplateOriginNote;
    window.forkTemplate = forkTemplate;
    window.captureTemplateDeepLink = captureTemplateDeepLink;
    window.consumeTemplateDeepLink = consumeTemplateDeepLink;
})();
