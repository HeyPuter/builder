// code-editor.js — the Code view.
//
// A Preview | Code toggle in the preview toolbar swaps the preview for the
// project's files. Everyone signed in can read them; a paid Puter plan unlocks
// editing and saving (the pure rules live in js/editor-core.js, CodeMirror in
// src/editor/, loaded the first time Code opens).
//
// Builder was written for one writer, the AI. Hand edits have to keep every
// part of it coherent, which is most of this file:
//   * Saves take the same per-file lock as the AI's tools, compare the disk
//     against what the editor loaded (cache-bust tokens removed), and refuse
//     to overwrite a newer copy. They mark the project modified, record the
//     path for the preview, and refresh it.
//   * During an AI turn, a restore or a publish the editor is read only. Open
//     files follow what the AI writes. A file with unsaved edits is never
//     overwritten; it shows a conflict instead.
//   * Unsaved edits are saved before a turn starts, and saved hand edits get
//     their own version first, so undoing the AI's turn keeps them.
//   * The next message to the AI carries a hidden note listing the files the
//     user edited, and its write tool refuses to overwrite one until it has
//     read it again (assertModelMayOverwrite).
//   * A runtime error after a hand edit no longer starts a paid automatic fix.
//     It is shown here with "Ask AI to fix", until the user's next message.
//   * Leaving the project, closing the tab, restoring or publishing with
//     unsaved edits asks first or saves first.
//
// Everything other modules call is on window.CodeEditor, and every call site
// uses ?. so the app runs unchanged when FEATURE_FLAGS.codeEditor is false.
(function () {
    'use strict';
    if (!window.FEATURE_FLAGS || !window.FEATURE_FLAGS.codeEditor || !window.EditorCore) return;
    const C = window.EditorCore;

    const ICON = {
        file: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
        folder: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
        image: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/></svg>',
        cloud: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>',
        lock: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
        chevron: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
        down: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
        spinner: '<span class="code-spinner" aria-hidden="true"></span>',
        alert: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
        pencil: '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
        close: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    };

    // ---- State ------------------------------------------------------------

    const S = {
        mode: 'preview',         // what the pane shows: 'preview' | 'code'
        chatId: null,            // the project the open files belong to
        appDir: null,
        access: 'hidden',        // EditorCore.access()
        lib: null,               // the loaded CodeMirror module
        dirs: new Map(),         // absolute folder → sorted entries, or { error }
        expanded: new Set(),     // absolute folders shown open in the tree
        tabs: [],                // absolute paths of open files, in tab order
        active: null,            // the file showing
        files: new Map(),        // absolute path → open file (see openFile)
        turnBusy: false,         // from beforeTurn until onTurnEnd
        heldErrors: new Map(),   // project → the error shown instead of an auto-fix
        status: null,            // { text, kind } for the status line
        flash: null,             // a short warning shown over status
        statusHtml: null,        // what the live region last said
        barsHtml: null,          // what the bars last showed
        cursor: null,
        phoneEditing: false,     // phones: Edit pressed, the keyboard may open
        sheetOpen: false,        // phones: the file list is up
        opening: false,
        planWasEdit: false,
        promptCounted: false,    // the upgrade bar's impression, once per open
    };
    let $root = null;

    function user() { return window.user && window.user.username ? window.user.username : null; }
    function isPhone() { return !!(window.isMobileViewport && window.isMobileViewport()); }
    function norm(p) { return window.normalizePosixPath ? window.normalizePosixPath(p) : p; }
    function relPath(abs) { return S.appDir && abs.startsWith(S.appDir + '/') ? abs.slice(S.appDir.length + 1) : abs; }
    function baseName(p) { return String(p).split('/').pop(); }
    function servedRoot() {
        const root = typeof publishedRootDir === 'function' ? publishedRootDir() : S.appDir;
        return root ? norm(root) : S.appDir;
    }
    function servedRel(abs) {
        const root = servedRoot();
        return root && abs.startsWith(root + '/') ? abs.slice(root.length + 1) : null;
    }
    function isHtml(abs) { return /\.html?$/i.test(abs); }
    function esc(s) { return typeof htmlEscape === 'function' ? htmlEscape(s) : String(s).replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';'); }
    function stripTokens(abs, text) {
        return isHtml(abs) && window.stripPreviewCacheBust ? window.stripPreviewCacheBust(text) : text;
    }
    function deleted(chatId) { return typeof _deletedChatIds !== 'undefined' && _deletedChatIds.has(chatId); }
    function notFound(e) { return typeof isNotFoundError === 'function' && isNotFoundError(e); }
    // The preview pane is on screen (it stays in the DOM, hidden, between
    // projects).
    function paneShowing() { return $('body').hasClass('preview-active') && $('.preview-pane').length > 0; }
    // A turn is running from the send's setup until it has fully unwound. Stop
    // drops isProcessing at once, but a tool call already running can still
    // write a file. The turn's controller stays set until it is done, so the
    // editor stays read only until then.
    function turnRunning() {
        if (typeof isProcessing !== 'undefined' && isProcessing) return true;
        if (typeof _sendSetupInFlight !== 'undefined' && _sendSetupInFlight) return true;
        return S.turnBusy && typeof abortController !== 'undefined' && abortController != null;
    }
    function track(event, props) { try { window.track?.(event, props); } catch (e) { /* never */ } }
    function toast(text, opts) { window.showToast?.(text, opts || { type: 'info', duration: 5000 }); }
    function nameList(files) {
        const names = files.map((f) => baseName(f.abs || f));
        return names.length === 1 ? names[0] : names.length === 2 ? names.join(' and ') : `${names.length} files`;
    }

    // ---- Local storage ----------------------------------------------------
    // Per account (the key carries the username, like composer drafts), and
    // every access guarded: blocked site data must never break the editor.
    function store(key, value) {
        try {
            if (value === null) localStorage.removeItem(key);
            else localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) { return false; }
    }
    function load(key) {
        try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    }
    function keysWithPrefix(prefix) {
        const out = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(prefix)) out.push(k);
            }
        } catch (e) { /* blocked */ }
        return out;
    }

    // Hand edits the AI has not been told about yet, and saved edits not yet in
    // a version. { files: { abs: { before, after } }, version: [abs] }.
    // before/after drive the diff in the note, kept only while small. While
    // files is not empty, the project's preview errors wait for the user
    // instead of starting an automatic fix (holdAutoFix).
    const NOTE_TEXT_LIMIT = 200000;
    function pendingKey(chatId) { return 'codeEditor.pending:' + user() + ':' + chatId; }
    function loadPending(chatId) {
        const p = load(pendingKey(chatId)) || {};
        return { files: p.files && typeof p.files === 'object' ? p.files : {}, version: Array.isArray(p.version) ? p.version : [] };
    }
    function savePending(chatId, p) {
        const empty = !Object.keys(p.files).length && !p.version.length;
        if (store(pendingKey(chatId), empty ? null : p)) return;
        // Over quota: keep the file list, drop the texts behind the diffs.
        for (const k of Object.keys(p.files)) p.files[k] = { before: null, after: null };
        store(pendingKey(chatId), p);
    }
    function hasPendingNote(chatId) {
        return !!(chatId && user()) && Object.keys(loadPending(chatId).files).length > 0;
    }

    // Files the user changed since the AI last read them. The write and
    // create_worker tools refuse to overwrite one of these from memory.
    function unreadKey() { return 'codeEditor.unread:' + user(); }
    function loadUnread() { const list = load(unreadKey()); return new Set(Array.isArray(list) ? list : []); }
    function saveUnread(set) { store(unreadKey(), set.size ? [...set].slice(-300) : null); }
    // Every mark at a path or under it (a folder), mapped through fn: return
    // the new path, or null to drop it.
    function remapUnread(prefix, fn) {
        const unread = loadUnread();
        let changed = false;
        for (const p of [...unread]) {
            if (p !== prefix && !p.startsWith(prefix + '/')) continue;
            const next = fn(p);
            if (next === p) continue;
            unread.delete(p);
            if (next) unread.add(next);
            changed = true;
        }
        if (changed) saveUnread(unread);
    }

    // Unsaved text, mirrored as the user types, so a crash or a closed tab does
    // not lose it. Restored only onto the exact text it was typed against.
    const DRAFT_LIMIT = 500000;
    function draftKey(abs) { return 'codeEditor.draft:' + user() + ':' + abs; }
    const _draftTimers = new Map();
    function saveDraftSoon(file) {
        clearTimeout(_draftTimers.get(file.abs));
        _draftTimers.set(file.abs, setTimeout(() => {
            _draftTimers.delete(file.abs);
            if (!file.buf || !C.isDirtyStatus(file.buf.status) || file.buf.text.length > DRAFT_LIMIT) { store(draftKey(file.abs), null); return; }
            store(draftKey(file.abs), { base: C.hashText(file.buf.base), text: file.buf.text, at: Date.now() });
        }, 800));
    }
    function clearDraft(abs) {
        clearTimeout(_draftTimers.get(abs));
        _draftTimers.delete(abs);
        store(draftKey(abs), null);
    }

    function tabsKey(chatId) { return 'codeEditor.tabs:' + user() + ':' + chatId; }

    // ---- Access -----------------------------------------------------------

    // Asks Puter again: the user may have upgraded, or their plan lapsed, in
    // another tab. Cheap, so done on open and before every save.
    async function refreshAccess() {
        const u = window.refreshUserPlan ? await window.refreshUserPlan() : window.user;
        accessFrom(u);
        return S.access;
    }
    function accessFrom(u) {
        const was = S.access;
        S.access = C.access({
            flagOn: true,
            signedIn: !!(u && u.username),
            isTemp: !!(u && u.is_temp),
            subscribed: !!(window.Branding && window.Branding.isSubscribed(u)),
        });
        if (was === 'edit' && S.access !== 'edit' && hasUnsaved()) S.planWasEdit = true;
        if (S.access === 'edit') S.planWasEdit = false;
        if (was !== S.access) for (const file of S.files.values()) applyEditable(file);
    }

    // ---- The pane ---------------------------------------------------------

    function shellHtml() {
        return `
            <section class="code-view" aria-label="Project code" hidden>
                <nav class="code-tree" aria-label="Project files">
                    <div class="code-tree-head"><span>Files</span><button type="button" class="code-sheet-close" aria-label="Close files">${ICON.close}</button></div>
                    <ul class="code-tree-list"></ul>
                </nav>
                <div class="code-main">
                    <div class="code-head">
                        <button type="button" class="code-files-btn" aria-haspopup="dialog" aria-expanded="false">${ICON.file}<span class="code-files-name">Files</span>${ICON.down}</button>
                        <div class="code-tabs" role="tablist" aria-label="Open files"></div>
                        <div class="code-actions">
                            <span class="code-readonly" hidden>${ICON.lock}<span>Read only</span></span>
                            <button type="button" class="code-edit-btn" hidden>${ICON.pencil}<span>Edit</span></button>
                            <button type="button" class="code-discard-btn" hidden>Discard</button>
                            <button type="button" class="code-save-btn" hidden>Save<kbd>${/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? '⌘S' : 'Ctrl+S'}</kbd></button>
                        </div>
                    </div>
                    <div class="code-bars"></div>
                    <div class="code-panes"><div class="code-empty" hidden></div></div>
                    <div class="code-status"><span class="code-status-left" role="status" aria-live="polite"></span><span class="code-status-right"></span></div>
                </div>
                <div class="code-sheet-scrim"></div>
            </section>`;
    }

    // The view sits inside .preview-body, over the iframe, so the app keeps
    // running at its real size. Auto-fix, the in-turn check and the refresh all
    // find the frame there. The frame is hidden, never removed.
    function ensureShell() {
        if ($root && document.contains($root[0])) return $root;
        const $body = $('.preview-pane .preview-body');
        if (!$body.length) return null;
        $root = $(shellHtml());
        $body.append($root);
        // A fresh shell shows nothing yet, whatever was drawn into the last one.
        S.statusHtml = null;
        S.barsHtml = null;
        return $root;
    }

    function setMode(mode) {
        const wasCode = S.mode === 'code';
        S.mode = mode === 'code' ? 'code' : 'preview';
        const code = S.mode === 'code';
        if (code && !wasCode) S.promptCounted = false;
        $('.preview-pane').toggleClass('code-mode', code);
        $('.pane-mode-btn').each(function () {
            const on = ($(this).attr('data-mode') === 'code') === code;
            $(this).toggleClass('active', on).attr('aria-pressed', on ? 'true' : 'false');
        });
        if (code) {
            ensureShell();
            $root.prop('hidden', false);
            // The picker needs a visible app to point at, and the size menu has
            // nothing to resize. Stop both while the code covers the preview.
            window.disarmPreviewPicker?.();
            window.closeDevicePanel?.();
            $('.preview-select-element, .preview-device-trigger').prop('disabled', true);
        } else {
            if ($root) $root.prop('hidden', true);
            $('.preview-select-element, .preview-device-trigger').prop('disabled', false);
            closeSheet();
        }
        renderChrome();
    }

    async function openCode(opts) {
        opts = opts || {};
        if (S.opening) return;
        const chatId = typeof currentChatId !== 'undefined' ? currentChatId : null;
        const appDir = typeof currentAppDir !== 'undefined' ? currentAppDir : null;
        if (!chatId || !appDir || !paneShowing()) return;
        S.opening = true;
        try {
            const alreadyOpen = S.mode === 'code' && S.chatId === chatId;
            const access = await refreshAccess();
            if (access === 'hidden' || currentChatId !== chatId) return;
            if (S.chatId !== chatId) startProject(chatId, appDir);
            setMode('code');
            if (!alreadyOpen) track('Code View Opened', { plan: access === 'edit' ? 'paid' : 'free' });
            if (!S.lib) {
                setStatus('Loading the editor…', 'busy');
                try {
                    S.lib = await window.loadCodeEditor();
                } catch (e) {
                    console.error('Code editor failed to load:', e);
                    setStatus(null);
                    setMode('preview');
                    toast(navigator.onLine === false
                        ? 'The code editor needs a connection the first time it opens. Try again when you’re online.'
                        : 'The code editor couldn’t load. Reload the page to get the latest version, then try again.',
                    { type: 'error', duration: 8000 });
                    return;
                }
                setStatus(null);
                // Files opened while the library loaded get their editors now.
                for (const file of S.files.values()) if (file.pendingMount) mountEditor(file);
            }
            if (S.mode !== 'code' || S.chatId !== chatId) return;
            if (!alreadyOpen || !S.dirs.has(S.appDir)) await loadDir(appDir);
            renderTree();
            if (!S.tabs.length) await openInitialFiles();
            if (opts.focus !== false && !isPhone()) activeFile()?.handle?.focus();
        } finally {
            S.opening = false;
        }
    }

    function closeCode() {
        if (S.mode !== 'code') return;
        setMode('preview');
        // Saved hand edits become a version as the user leaves the code.
        if (S.chatId) checkpoint(S.chatId, S.appDir);
    }

    // A new project in the view: drop the old one's files and tree.
    function startProject(chatId, appDir) {
        disposeAll();
        S.chatId = chatId;
        S.appDir = norm(appDir);
        S.expanded = new Set([S.appDir]);
    }

    function disposeAll() {
        for (const file of S.files.values()) {
            try { file.handle?.destroy(); } catch (e) { /* already gone */ }
            if (file.objectUrl) URL.revokeObjectURL(file.objectUrl);
        }
        S.files.clear();
        S.tabs = [];
        S.active = null;
        S.dirs.clear();
        S.expanded.clear();
        S.chatId = null;
        S.appDir = null;
        S.turnBusy = false;
        S.phoneEditing = false;
        S.status = null;
        S.flash = null;
        S.statusHtml = null;
        S.barsHtml = null;
        S.cursor = null;
        if ($root) {
            $root.find('.code-pane').remove();
            $root.find('.code-tabs').empty();
            $root.find('.code-tree-list').empty();
            $root.find('.code-bars').empty();
            $root.find('.code-empty').prop('hidden', true);
        }
    }

    // ---- The file tree ----------------------------------------------------

    async function loadDir(absDir) {
        let items;
        try {
            items = await puter.fs.readdir(absDir);
        } catch (e) {
            // A new project's folder appears with its first write.
            if (notFound(e)) { S.dirs.set(absDir, []); return; }
            S.dirs.set(absDir, { error: true });
            return;
        }
        const entries = [];
        for (const it of items || []) {
            if (!it || !it.name) continue;
            const abs = absDir.replace(/\/+$/, '') + '/' + it.name;
            const isDir = !!(it.is_dir ?? it.isDir);
            if (!isDir && C.classify(relPath(abs)).hidden) continue;
            entries.push({ name: it.name, abs, isDir, size: typeof it.size === 'number' ? it.size : null });
        }
        S.dirs.set(absDir, C.sortEntries(entries));
    }

    let _treeTimer = null;
    function refreshTreeSoon(delay) {
        clearTimeout(_treeTimer);
        _treeTimer = setTimeout(async () => {
            if (!S.appDir) return;
            const dirs = [...S.expanded];
            for (const dir of dirs) await loadDir(dir);
            renderTree();
        }, delay == null ? 400 : delay);
    }

    function entryIcon(entry) {
        if (entry.isDir) return ICON.folder;
        const info = C.classify(relPath(entry.abs), { servedRel: servedRel(entry.abs) });
        if (info.backend) return ICON.cloud;
        if (info.kind === 'image') return ICON.image;
        return ICON.file;
    }

    // Re-rendering replaces the buttons, so keep keyboard focus on the one
    // that had it (same path and kind), or it drops to the page.
    function keepFocus(container, render) {
        const active = document.activeElement;
        let key = null;
        if (active && container && container.contains(active)) {
            const holder = active.closest('[data-path]');
            key = holder ? { path: holder.getAttribute('data-path'), cls: active.classList[0] } : null;
        }
        render();
        if (!key || !container) return;
        const holders = container.querySelectorAll('[data-path]');
        for (const el of holders) {
            if (el.getAttribute('data-path') !== key.path) continue;
            const target = el.classList.contains(key.cls) ? el : el.querySelector('.' + key.cls);
            if (target) { target.focus(); return; }
        }
    }

    function renderTree() {
        if (!$root || !S.appDir) return;
        const out = [];
        const walk = (dir, depth) => {
            const entries = S.dirs.get(dir);
            if (!entries) return;
            if (entries.error) {
                out.push(`<li class="code-tree-note" style="padding-left:${10 + depth * 14}px">Couldn’t list this folder. <button type="button" class="code-tree-retry" data-dir="${esc(dir)}">Try again</button></li>`);
                return;
            }
            if (!entries.length && depth === 0) out.push('<li class="code-tree-note">No files yet.</li>');
            for (const e of entries) {
                const info = e.isDir ? null : C.classify(relPath(e.abs), { size: e.size, servedRel: servedRel(e.abs) });
                const generated = e.isDir ? (servedRel(e.abs) === 'icons') : (info.generatedIcon || (info.maybeGeneratedManifest && S.files.get(e.abs)?.readOnlyReason === 'generated'));
                const open = e.isDir && S.expanded.has(e.abs);
                const file = S.files.get(e.abs);
                const dirty = holdsUnsaved(file);
                const cls = ['code-tree-item'];
                if (e.abs === S.active) cls.push('is-active');
                if (generated) cls.push('is-generated');
                out.push(`<li><button type="button" class="${cls.join(' ')}" data-path="${esc(e.abs)}" ${e.isDir ? `data-dir="1" aria-expanded="${open}"` : ''} ${e.abs === S.active ? 'aria-current="true"' : ''} style="padding-left:${(e.isDir ? 4 : 22) + depth * 14}px">`
                    + (e.isDir ? `<span class="code-tree-chevron${open ? ' is-open' : ''}">${ICON.chevron}</span>` : '')
                    + entryIcon(e)
                    + `<span class="code-tree-name">${esc(e.name)}</span>`
                    + (info && info.backend ? '<span class="code-tree-tag">backend</span>' : '')
                    + (generated ? `<span class="code-tree-lock" title="Generated by Builder">${ICON.lock}</span>` : '')
                    + (dirty ? '<span class="code-dot" aria-label="Unsaved changes"></span>' : '')
                    + '</button></li>');
                if (open) walk(e.abs, depth + 1);
            }
        };
        walk(S.appDir, 0);
        const list = $root.find('.code-tree-list')[0];
        keepFocus(list, () => { list.innerHTML = out.join(''); });
    }

    async function toggleDir(abs) {
        if (S.expanded.has(abs)) {
            S.expanded.delete(abs);
            renderTree();
            return;
        }
        S.expanded.add(abs);
        if (!S.dirs.has(abs)) await loadDir(abs);
        renderTree();
    }

    // ---- Open files -------------------------------------------------------

    function activeFile() { return S.active ? S.files.get(S.active) : null; }

    function dirtyFiles(chatId) {
        if (chatId && chatId !== S.chatId) return [];
        return [...S.files.values()].filter((f) => f.buf && C.isDirtyStatus(f.buf.status));
    }
    function hasUnsaved(chatId) { return dirtyFiles(chatId).length > 0; }
    // Files deleted or moved somewhere else while they had unsaved changes.
    // Saving would recreate them, so they are not saved, and their text is
    // only in the editor.
    function strandedFiles(chatId) {
        if (chatId && chatId !== S.chatId) return [];
        return [...S.files.values()].filter((f) => f.buf && f.buf.status === 'deleted' && !C.sameContent(f.buf.text, f.buf.base));
    }
    // Whether a file's editor holds text that is not on disk, stranded or not
    // (the unsaved dots on its tab, in the file list and on the Code button).
    function holdsUnsaved(f) {
        return !!(f && f.buf && (C.isDirtyStatus(f.buf.status)
            || (f.buf.status === 'deleted' && !C.sameContent(f.buf.text, f.buf.base))));
    }

    // A file opens read only when it is generated, too large, or not UTF-8.
    // The plan and a running turn are checked separately (canEdit).
    const READ_ONLY_REASONS = {
        generated: 'Builder writes this file from your app’s name, color and icon.svg, so it’s read only.',
        large: 'This file is over 1 MB, so it opens read only here.',
        encoding: 'This file isn’t UTF-8 text, so it opens read only to keep its encoding intact.',
    };

    function canEdit(file) {
        return S.access === 'edit' && !file.readOnlyReason && !turnRunning() && !settlingIn(file.chatId) && !window._restoringVersion
            && !window.isPublishInFlight?.(file.chatId) && file.buf && file.buf.status !== 'deleted';
    }

    // Saving before the files are used or left (a publish, a restore, a
    // project switch): text typed while that runs would miss the save and be
    // left behind, so the project's editor waits until it is done. Counted
    // per project, so one still saving after the user moved on doesn't hold
    // up the next. A turn's own setup already waits (turnRunning). Saving
    // itself is not blocked (blockFor).
    const _settling = new Map();
    function settlingIn(chatId) { return (_settling.get(chatId) || 0) > 0; }
    async function whileSettling(chatId, run) {
        _settling.set(chatId, (_settling.get(chatId) || 0) + 1);
        renderChrome();
        try {
            return await run();
        } finally {
            const left = (_settling.get(chatId) || 1) - 1;
            if (left > 0) _settling.set(chatId, left);
            else _settling.delete(chatId);
            renderChrome();
        }
    }

    function applyEditable(file) {
        if (!file.handle) return;
        const readOnly = !canEdit(file);
        const editable = !isPhone() || (S.phoneEditing && !readOnly);
        if (file._readOnly !== readOnly) { file._readOnly = readOnly; file.handle.setReadOnly(readOnly); }
        if (file._editable !== editable) { file._editable = editable; file.handle.setEditable(editable); }
    }

    async function openInitialFiles() {
        const saved = load(tabsKey(S.chatId));
        const exists = (abs) => {
            const dir = abs.slice(0, abs.lastIndexOf('/'));
            const entries = S.dirs.get(dir);
            return Array.isArray(entries) && entries.some((e) => e.abs === abs && !e.isDir);
        };
        if (saved && Array.isArray(saved.tabs) && saved.tabs.length) {
            for (const dir of new Set(saved.tabs.map((p) => p.slice(0, p.lastIndexOf('/'))))) {
                if (dir.startsWith(S.appDir) && !S.dirs.has(dir)) await loadDir(dir);
            }
            const tabs = saved.tabs.filter((p) => p.startsWith(S.appDir + '/') && exists(p)).slice(0, 8);
            for (const abs of tabs) await openFile(abs, { activate: abs === saved.active || (!tabs.includes(saved.active) && abs === tabs[0]) });
            if (S.tabs.length) return;
        }
        // Otherwise the page the preview shows, or the first text file.
        const root = servedRoot();
        if (root !== S.appDir && !S.dirs.has(root)) await loadDir(root);
        const rootEntries = Array.isArray(S.dirs.get(root)) ? S.dirs.get(root) : [];
        const index = rootEntries.find((e) => !e.isDir && /^index\.html?$/i.test(e.name));
        if (index) { await openFile(index.abs); return; }
        const topEntries = Array.isArray(S.dirs.get(S.appDir)) ? S.dirs.get(S.appDir) : [];
        const first = topEntries.find((e) => !e.isDir && C.classify(e.name).kind === 'text');
        if (first) await openFile(first.abs);
        else renderPanes();
    }

    // The message shown when no file is open.
    function renderPanes() {
        if (!$root) return;
        const listing = S.appDir ? S.dirs.get(S.appDir) : null;
        const text = !S.appDir ? ''
            : listing && listing.error ? 'Couldn’t list the project’s files. Check your connection, then try again from the file list.'
            : Array.isArray(listing) && !listing.length ? 'This project has no files yet. Ask the AI to build something, and its files show up here.'
            : 'Pick a file to open it.';
        $root.find('.code-empty').text(text).prop('hidden', !!S.tabs.length || !text);
    }

    function saveTabs() {
        if (!S.chatId) return;
        store(tabsKey(S.chatId), S.tabs.length ? { tabs: S.tabs.slice(0, 8), active: S.active } : null);
    }

    function decode(bytes) {
        if (bytes.includes(0)) return { binary: true };
        let text;
        let utf8 = true;
        try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
        catch (e) { utf8 = false; text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes); }
        let bom = false;
        if (text.charCodeAt(0) === 0xFEFF) { bom = true; text = text.slice(1); }
        return { text, utf8, bom, crlf: text.includes('\r\n') };
    }
    // Read inside the file's lock, so a write in progress (the AI's, the
    // preview's token stamp) is never seen half done.
    async function readFile(abs) {
        const blob = await window.withFileLock(abs, () => puter.fs.read(abs));
        return decode(new Uint8Array(await blob.arrayBuffer()));
    }

    async function openFile(abs, opts) {
        opts = opts || {};
        abs = norm(abs);
        if (!S.appDir || !abs.startsWith(S.appDir + '/')) return;
        if (S.files.has(abs)) { if (opts.activate !== false) activate(abs); return; }
        const dir = abs.slice(0, abs.lastIndexOf('/'));
        const entry = Array.isArray(S.dirs.get(dir)) ? S.dirs.get(dir).find((e) => e.abs === abs) : null;
        const info = C.classify(relPath(abs), { size: entry ? entry.size : null, servedRel: servedRel(abs) });
        const file = {
            abs, rel: relPath(abs), info, chatId: S.chatId, appDir: S.appDir,
            buf: null, handle: null, readOnlyReason: null, crlf: false, bom: false,
            $pane: $('<div class="code-pane" role="tabpanel"></div>'), message: null, pendingMount: false,
        };
        S.files.set(abs, file);
        S.tabs.push(abs);
        ensureShell();
        $root.find('.code-panes').append(file.$pane);
        if (opts.activate !== false || !S.active) activate(abs);
        else renderTabs();
        file.$pane.html(`<div class="code-pane-message">${ICON.spinner}<span>Opening ${esc(baseName(abs))}…</span></div>`);

        if (info.kind === 'image') { await showImage(file); return; }
        if (info.kind === 'binary') { showMessage(file, 'This file can’t be shown here. Download the project to get it.'); return; }
        if (info.tooLargeToView) { showMessage(file, 'This file is too large to open here. Download the project to get it.'); return; }

        let read;
        try {
            read = await readFile(abs);
        } catch (e) {
            // A failed read must never become an empty buffer someone can save
            // over the real file.
            showMessage(file, notFound(e) ? 'This file no longer exists.' : 'Couldn’t open this file.', notFound(e) ? null : 'retry');
            return;
        }
        if (!S.files.has(abs) || S.files.get(abs) !== file) return;
        if (read.binary) { showMessage(file, 'This file isn’t text, so it can’t be shown here.'); return; }
        const text = C.toLF(stripTokens(abs, read.text));
        file.crlf = read.crlf;
        file.bom = read.bom;
        if (info.tooLargeToEdit) file.readOnlyReason = 'large';
        else if (!read.utf8) file.readOnlyReason = 'encoding';
        else if (info.maybeGeneratedManifest && C.isGeneratedManifest(text)) file.readOnlyReason = 'generated';
        file.buf = C.openBuffer(text);
        // Unsaved text from a crash or a closed tab, typed against this exact
        // file: bring it back as unsaved changes. Only while the plan allows
        // saving it. Otherwise it stays stored in case the plan comes back.
        const draft = load(draftKey(abs));
        if (draft && draft.base === C.hashText(text) && typeof draft.text === 'string' && draft.text !== text) {
            if (S.access === 'edit' && !file.readOnlyReason) {
                file.buf = C.reduceBuffer(file.buf, { type: 'edit', text: draft.text });
                toast(`Restored your unsaved changes to ${baseName(abs)}.`, { type: 'info', duration: 6000 });
            }
        } else if (draft) {
            store(draftKey(abs), null);
        }
        if (S.lib) mountEditor(file);
        else file.pendingMount = true;
        renderTree();
        renderChrome();
    }

    function mountEditor(file) {
        file.pendingMount = false;
        file.$pane.empty();
        const host = $('<div class="code-editor-host"></div>')[0];
        file.$pane.append(host);
        file._readOnly = !canEdit(file);
        file._editable = !isPhone() || (S.phoneEditing && !file._readOnly);
        file.handle = S.lib.createEditor(host, {
            doc: file.buf.text,
            language: file.info.language,
            readOnly: file._readOnly,
            editable: file._editable,
            wrap: isPhone() || file.info.language === 'markdown',
            indent: C.detectIndent(file.buf.base),
            label: 'Code editor, ' + file.rel,
            computeProtected: file.info.language === 'html' ? C.protectedRanges : () => [],
            onChange: (text) => onEdit(file, text),
            onSave: () => { saveFile(file); },
            onCursor: (pos) => { if (file.abs === S.active) { S.cursor = pos; renderStatus(); } },
            onEditAttempt: (coords) => onEditAttempt(file, coords),
            onProtectedBlock: (kind) => flashStatus(kind === 'whole'
                ? 'Builder’s locked lines can’t be changed, so that edit wasn’t made. Edit around them.'
                : 'Builder’s locked lines were left as they are.'),
        });
        if (C.isDirtyStatus(file.buf.status)) markUnsavedLines(file);
    }

    function showMessage(file, text, action) {
        file.message = text;
        file.$pane.html(`<div class="code-pane-message"><span>${esc(text)}</span>${action === 'retry' ? '<button type="button" class="code-retry-open">Try again</button>' : ''}</div>`);
        renderChrome();
    }

    async function showImage(file) {
        try {
            const blob = await window.withFileLock(file.abs, () => puter.fs.read(file.abs));
            if (!S.files.has(file.abs)) return;
            file.objectUrl = URL.createObjectURL(blob);
            file.$pane.html(`<div class="code-image"><img alt="${esc(baseName(file.abs))}" src="${esc(file.objectUrl)}"><span>${esc(file.rel)}</span></div>`);
        } catch (e) {
            showMessage(file, 'Couldn’t open this image.', 'retry');
        }
        renderChrome();
    }

    function activate(abs) {
        S.active = abs;
        for (const f of S.files.values()) f.$pane.toggleClass('is-active', f.abs === abs);
        const file = S.files.get(abs);
        S.cursor = file && file.handle ? file.handle.getCursor() : null;
        renderTabs();
        renderTree();
        renderPanes();
        renderChrome();
        saveTabs();
        closeSheet();
    }

    async function closeTab(abs) {
        const file = S.files.get(abs);
        if (!file) return;
        if (file.buf && C.isDirtyStatus(file.buf.status)) {
            const choice = await askSave([file], 'before closing it');
            if (choice === 'cancel') return;
            if (choice === 'save' && !await saveFile(file)) return;
            if (choice === 'discard') clearDraft(abs);
        }
        // Closing a file deleted elsewhere drops its unsaved text (its bar
        // said so), and its draft with it.
        if (file.buf && file.buf.status === 'deleted') clearDraft(abs);
        const hadFocus = !!($root && $root[0].contains(document.activeElement));
        try { file.handle?.destroy(); } catch (e) { /* gone */ }
        if (file.objectUrl) URL.revokeObjectURL(file.objectUrl);
        file.$pane.remove();
        S.files.delete(abs);
        const i = S.tabs.indexOf(abs);
        S.tabs = S.tabs.filter((p) => p !== abs);
        if (S.active === abs) S.active = S.tabs[Math.min(i, S.tabs.length - 1)] || null;
        if (S.active) activate(S.active);
        else { renderTabs(); renderTree(); renderPanes(); renderChrome(); saveTabs(); }
        // The closed tab's button is gone: focus moves to the tab now showing,
        // or to the file list when none is left.
        if (hadFocus) {
            const next = $root.find('.code-tab.is-active .code-tab-btn')[0] || $root.find('.code-tree-item')[0];
            next?.focus();
        }
    }

    // ---- Editing ----------------------------------------------------------

    let _unsavedMarkTimer = null;
    function onEdit(file, text) {
        const was = file.buf.status;
        file.dropped = false;
        file.buf = C.reduceBuffer(file.buf, { type: 'edit', text });
        saveDraftSoon(file);
        clearTimeout(_unsavedMarkTimer);
        _unsavedMarkTimer = setTimeout(() => markUnsavedLines(file), 300);
        if (was !== file.buf.status) { renderTabs(); renderTree(); renderChrome(); }
        else if (S.status && S.status.kind === 'ok') setStatus(null);
    }

    function markUnsavedLines(file) {
        if (!file.handle || !file.buf) return;
        if (!C.isDirtyStatus(file.buf.status)) { file.handle.clearMarks(); return; }
        const lines = C.changedLines(file.buf.base, file.buf.text);
        if (lines.length <= 2000) file.handle.markLines(lines, 'user');
    }

    // A free user (or anyone in a read-only moment) tried to type.
    let _attemptTip = null;
    function onEditAttempt(file, coords) {
        if (canEdit(file)) return;
        let text;
        let upgrade = false;
        if (S.access !== 'edit') { text = 'Upgrade to edit this file'; upgrade = true; }
        else if (file.readOnlyReason) text = READ_ONLY_REASONS[file.readOnlyReason];
        else if (turnRunning()) text = 'Editing is paused while the AI works.';
        else if (window._restoringVersion) text = 'Editing is paused while a version is restored.';
        else if (window.isPublishInFlight?.(file.chatId)) text = 'Editing is paused while your site publishes.';
        else if (settlingIn(file.chatId)) text = 'Editing is paused while your changes are saved.';
        else return;
        if (upgrade && !file._attemptTracked) { file._attemptTracked = true; track('Code Edit Blocked', { reason: 'plan' }); }
        _attemptTip?.remove();
        const $tip = $(`<div class="code-tip" role="tooltip">${ICON.lock}<span>${esc(text)}</span>${upgrade ? '<button type="button" class="code-upgrade-btn" data-source="code_editor">See plans</button>' : ''}</div>`);
        const host = file.$pane[0].getBoundingClientRect();
        const left = coords ? Math.max(8, Math.min(coords.left - host.left, host.width - 280)) : 24;
        const top = coords ? Math.max(8, coords.bottom - host.top + 6) : 24;
        $tip.css({ left: left + 'px', top: top + 'px' });
        file.$pane.append($tip);
        _attemptTip = $tip;
        setTimeout(() => { if (_attemptTip === $tip) { $tip.remove(); _attemptTip = null; } }, 3500);
    }

    // ---- Saving -----------------------------------------------------------

    function blockFor(file, opts) {
        return C.saveBlock({
            access: S.access,
            readOnly: !!file.readOnlyReason,
            turnRunning: !(opts && opts.turnSetup) && turnRunning(),
            restoring: !!window._restoringVersion,
            publishing: !!window.isPublishInFlight?.(file.chatId),
            deleted: deleted(file.chatId),
        });
    }

    // One file, start to finish. Options:
    //   turnSetup: called from beforeTurn while the send is set up (the turn
    //     has not started); the turn's own end refreshes the preview.
    //   deferRefresh: called before a publish; the publish refreshes the
    //     preview once it has copied the files.
    // Resolves true once the file on disk holds what the editor shows. A
    // second call while one is running (the Save button and Cmd+S together)
    // shares the first.
    function saveFile(file, opts) {
        if (!file) return Promise.resolve(true);
        if (file._saveInFlight) return file._saveInFlight;
        const run = doSave(file, opts || {}).finally(() => { file._saveInFlight = null; });
        file._saveInFlight = run;
        return run;
    }

    async function doSave(file, opts) {
        if (!file.buf || !file.handle) return true;
        if (file.buf.status === 'conflict') { renderChrome(); return false; }
        if (!C.isDirtyStatus(file.buf.status)) return true;
        if (file.buf.status === 'saving') return false;
        await refreshAccess();
        const block = blockFor(file, opts);
        if (block) {
            setStatus(block.message, 'warn');
            renderChrome();
            return false;
        }
        let abs;
        try { abs = window.assertPathInProject(file.abs, { appDir: file.appDir }); }
        catch (e) { file.buf = C.reduceBuffer(file.buf, { type: 'failed', error: 'This file is outside the project, so it can’t be saved.' }); renderChrome(); return false; }
        const text = file.handle.getText();
        const before = file.buf.base;
        file.buf = C.reduceBuffer(file.buf, { type: 'saving' });
        renderChrome();
        // The publish check and the lock request happen in the same tick: a
        // publish starting now either sees this save in its drain or this
        // save sees it and stops.
        if (window.isPublishInFlight?.(file.chatId)) {
            file.buf = C.reduceBuffer(file.buf, { type: 'failed', error: C.saveBlock({ access: 'edit', publishing: true }).message });
            renderChrome();
            return false;
        }
        let outcome;
        try {
            outcome = await window.withFileLock(abs, async () => {
                let disk = null;
                try {
                    disk = decode(new Uint8Array(await (await puter.fs.read(abs)).arrayBuffer()));
                } catch (e) {
                    if (!notFound(e)) throw e;
                }
                if (!disk) return { gone: true };
                if (disk.binary) return { conflict: '' };
                const now = C.toLF(stripTokens(abs, disk.text));
                // Someone else changed the file since it was loaded. The
                // install block Builder restamps is not someone else.
                if (!C.sameContent(now, before) && C.withoutGeneratedBlocks(now) !== C.withoutGeneratedBlocks(before)) {
                    return { conflict: now };
                }
                // The project may have been deleted while this waited for the
                // lock: a write now would recreate its folder.
                if (deleted(file.chatId)) return { gone: true };
                let out = text;
                if (file.crlf) out = out.replace(/\n/g, '\r\n');
                if (file.bom) out = '﻿' + out;
                await window.writeFileVerified(abs, out);
                // Inside the lock, right after the bytes landed: a snapshot can
                // never count this save as captured before it is, and a publish
                // waiting on the lock sees the project as changed.
                window.markProjectModified?.(undefined, file.chatId);
                return { ok: true };
            });
        } catch (e) {
            console.error('Save failed:', e);
            file.buf = C.reduceBuffer(file.buf, { type: 'failed', error: 'Couldn’t save ' + baseName(abs) + '. Your changes are still here.' });
            renderChrome();
            track('Code Save Failed', { reason: 'io' });
            return false;
        }
        if (outcome.gone) {
            file.buf = C.reduceBuffer(file.buf, { type: 'failed', error: baseName(abs) + ' was deleted or moved after you opened it, so it wasn’t saved.' });
            renderChrome();
            return false;
        }
        if (outcome.conflict != null) {
            file.buf = C.reduceBuffer(file.buf, { type: 'conflict', text: outcome.conflict });
            renderChrome();
            track('Code Save Failed', { reason: 'conflict' });
            return false;
        }
        file.buf = C.reduceBuffer(file.buf, { type: 'saved', text });
        const open = S.files.get(file.abs) === file;
        if (file.dropped) {
            // The user dropped their changes while this save ran (Don't save,
            // Lose changes). It still landed, so the editor follows the
            // saved text instead of offering the older text as unsaved.
            file.dropped = false;
            file.buf = C.reduceBuffer(file.buf, { type: 'discard' });
            if (open) file.handle.setText(file.buf.text);
        }
        // Text typed while the save ran is still unsaved: keep its draft,
        // unless the file was closed or its project left meanwhile.
        if (open && C.isDirtyStatus(file.buf.status)) saveDraftSoon(file);
        else clearDraft(abs);
        markUnsavedLines(file);
        renderTabs();
        renderTree();
        afterSave(file, abs, before, text, opts);
        renderChrome();
        return true;
    }

    function afterSave(file, abs, before, after, opts) {
        const chatId = file.chatId;
        if (deleted(chatId)) return;
        window.recordPreviewChange?.(abs);
        window.refreshPublishButton?.();
        // What the AI is told on its next turn, and what goes in the next
        // checkpoint. before is kept from the first save since the AI last saw
        // the file, so the diff covers every edit made in between. While these
        // records exist, the project's preview errors wait for the user.
        const p = loadPending(chatId);
        const rec = p.files[abs] || { before: before.length <= NOTE_TEXT_LIMIT ? before : null };
        rec.after = after.length <= NOTE_TEXT_LIMIT && rec.before !== null ? after : null;
        if (rec.after === null) rec.before = null;
        p.files[abs] = rec;
        if (!p.version.includes(abs)) p.version.push(abs);
        savePending(chatId, p);
        const unread = loadUnread();
        unread.add(abs);
        saveUnread(unread);
        // A report already counting down is about code being replaced, and a
        // held error described the code before this save.
        window.cancelPendingAutoFixes?.();
        if (S.heldErrors.delete(chatId)) renderBars();
        track('Code Saved', { language: file.info.language || file.info.kind, backend: !!file.info.backend });
        if (file.info.backend) redeployBackend(file, abs);
        if (opts.turnSetup || opts.deferRefresh) {
            // The turn that is about to start, or the publish, refreshes the
            // preview itself and covers this file there.
            window.schedulePreviewRefresh?.();
        } else if (chatId === currentChatId && window.currentPreviewUrl) {
            refreshPreview();
        } else {
            setStatus('Saved.', 'ok');
        }
    }

    async function redeployBackend(file, abs) {
        setStatus('Saved. Updating your app’s backend, which can take up to 30 seconds.', 'busy');
        const r = await window.redeployWorkerSource?.(file.appDir, abs);
        if (r && r.failed && !r.name) {
            setStatus('Saved, but Builder couldn’t check whether the backend needs updating. Save again to retry.', 'warn');
            return;
        }
        if (!r || !r.name) { setStatus('Saved.', 'ok'); return; }
        if (r.failed) {
            setStatus('Saved, but the backend couldn’t be updated. It is still running the previous code.', 'warn');
            toast('Saved ' + baseName(abs) + ', but the backend couldn’t be updated. Save again to retry.', { type: 'warning', duration: 8000 });
            return;
        }
        if (!S.status || S.status.kind !== 'busy') setStatus('Saved. The backend is updated.', 'ok');
    }

    // One preview refresh at a time, plus one more if a save landed while it
    // ran (that save's bytes may have missed its sync). Each refresh waits at
    // least 10 seconds for puter.site to serve the new files.
    let _refreshRunning = false;
    let _refreshAgain = false;
    async function refreshPreview() {
        if (_refreshRunning) { _refreshAgain = true; return; }
        _refreshRunning = true;
        setStatus('Saved. Updating the preview, usually 10 to 25 seconds.', 'busy');
        try {
            do {
                _refreshAgain = false;
                await window.refreshPreviewWhenReady?.();
            } while (_refreshAgain);
        } finally {
            _refreshRunning = false;
        }
        if (S.status && S.status.kind === 'busy') setStatus('Saved. The preview is up to date.', 'ok');
    }

    async function saveAll(opts) {
        opts = opts || {};
        let ok = true;
        for (const file of dirtyFiles(opts.chatId || S.chatId)) {
            let saved = await saveFile(file, opts);
            // A save already running when this one was asked for (Cmd+S a
            // moment before) wrote the text from when it started. Save what
            // the editor holds now.
            if (saved && file.handle && file.buf && file.buf.status === 'dirty') saved = await saveFile(file, opts);
            if (!saved) ok = false;
        }
        return ok;
    }

    // Unsaved edits before something that works from the files on disk (a
    // turn, a publish, a restore): saved when possible. When the plan no
    // longer allows saving, the user drops them or stays. 'ok' to go ahead,
    // 'stay' when the user chose to stay, 'failed' when a save failed.
    async function settleUnsaved(chatId, opts) {
        const dirty = dirtyFiles(chatId);
        if (!dirty.length) return 'ok';
        await refreshAccess();
        if (S.access !== 'edit') {
            const choice = await puter.ui.alert(`Your plan no longer includes editing code, so your changes to ${nameList(dirty)} can’t be saved. Discard them and continue?`, [
                { label: 'Discard and continue', value: 'discard', type: 'primary' },
                { label: 'Stay', value: 'cancel', type: 'secondary' },
            ]);
            if (choice !== 'discard') return 'stay';
            discardAll(chatId);
            return 'ok';
        }
        return await whileSettling(chatId || S.chatId, () => saveAll(Object.assign({ chatId }, opts))) ? 'ok' : 'failed';
    }

    function discard(file) {
        if (!file || !file.buf) return;
        // A save already running still lands (see doSave).
        if (file.buf.status === 'saving') file.dropped = true;
        file.buf = C.reduceBuffer(file.buf, { type: 'discard' });
        file.handle?.setText(file.buf.text);
        file.handle?.clearMarks();
        clearDraft(file.abs);
        renderTabs();
        renderTree();
        renderChrome();
    }

    function discardAll(chatId) {
        for (const file of dirtyFiles(chatId)) discard(file);
    }

    // ---- Conflicts and changes from outside --------------------------------

    // Reread the open files of a project and follow the disk: a clean file
    // reloads (its changed lines highlighted), a file with unsaved edits turns
    // into a conflict. Coalesced, since one AI turn can write many times.
    let _reconcileTimer = null;
    let _reconcileChain = Promise.resolve();
    function reconcileSoon(delay, opts) {
        clearTimeout(_reconcileTimer);
        _reconcileTimer = setTimeout(() => {
            _reconcileChain = _reconcileChain.then(() => reconcile(opts || {})).catch(() => {});
        }, delay == null ? 400 : delay);
    }

    async function reconcile(opts) {
        const chatId = S.chatId;
        for (const file of [...S.files.values()]) {
            if (S.chatId !== chatId) return;
            if (!file.buf || file.buf.status === 'saving' || !file.handle) continue;
            let read;
            try {
                read = await readFile(file.abs);
            } catch (e) {
                if (notFound(e) && file.buf.status !== 'deleted') {
                    file.buf = C.reduceBuffer(file.buf, { type: 'deleted' });
                    applyEditable(file);
                    renderChrome();
                }
                continue;
            }
            if (read.binary || S.files.get(file.abs) !== file) continue;
            const disk = C.toLF(stripTokens(file.abs, read.text));
            // The file is back. Judge the buffer against what it was based on,
            // so unsaved text turns into a conflict instead of being replaced.
            const wasDeleted = file.buf.status === 'deleted';
            if (wasDeleted) {
                file.buf = Object.assign({}, file.buf, { status: C.sameContent(file.buf.text, file.buf.base) ? 'clean' : 'dirty' });
                applyEditable(file);
            }
            const prev = file.buf;
            const next = C.reduceBuffer(prev, { type: 'disk', text: disk });
            file.crlf = read.crlf;
            file.bom = read.bom;
            if (next === prev) {
                if (wasDeleted) { renderTabs(); renderTree(); renderChrome(); }
                continue;
            }
            file.buf = next;
            if (next.text !== file.handle.getText()) {
                const changed = C.changedLines(prev.text, next.text);
                file.handle.setText(next.text);
                if (opts.highlight !== false && changed.length && changed.length <= 2000) file.handle.markLines(changed, 'ai');
                clearDraft(file.abs);
            }
            renderTabs();
            renderTree();
            renderChrome();
        }
        refreshTreeSoon(0);
    }

    function showCompare(file) {
        if (!file || !file.buf || file.buf.status !== 'conflict') return;
        const diff = C.unifiedDiff(file.buf.disk, file.buf.text, { context: 3 }) || '';
        const lines = diff.split('\n').filter((l, i, a) => i < a.length - 1 || l).map((l) => {
            const cls = l.startsWith('@@') ? 'is-hunk' : l[0] === '+' ? 'is-add' : l[0] === '-' ? 'is-del' : '';
            return `<span class="${cls}">${esc(l) || ' '}</span>`;
        }).join('\n');
        const $overlay = $(`
            <div class="confirm-modal-overlay code-compare-overlay">
                <div class="properties-modal code-compare-modal" role="dialog" aria-modal="true" aria-labelledby="code-compare-title" tabindex="-1">
                    <div class="properties-modal-header">
                        <div class="properties-modal-title" id="code-compare-title">${esc(baseName(file.abs))}, your version compared with the one on disk</div>
                        <button type="button" class="properties-modal-x" title="Close" aria-label="Close">✕</button>
                    </div>
                    <p class="code-compare-legend"><span class="is-del">Lines only in the version on disk</span><span class="is-add">Lines only in your version</span></p>
                    <pre class="code-compare-diff">${lines || 'The two versions are the same.'}</pre>
                    <div class="properties-modal-actions">
                        <button type="button" class="confirm-modal-btn confirm-modal-cancel code-compare-theirs">Use the version on disk</button>
                        <button type="button" class="confirm-modal-btn code-compare-mine">Keep mine</button>
                    </div>
                </div>
            </div>`);
        let release = null;
        const close = () => {
            $(document).off('keydown.codeCompare');
            $overlay.removeClass('open');
            setTimeout(() => $overlay.remove(), 150);
            release?.();
        };
        $overlay.find('.properties-modal-x').on('click', close);
        $overlay.find('.code-compare-mine').on('click', () => { close(); resolveConflict(file, 'keepMine'); });
        $overlay.find('.code-compare-theirs').on('click', () => { close(); resolveConflict(file, 'useTheirs'); });
        $overlay.on('mousedown', (e) => { if (e.target === $overlay[0]) close(); });
        $(document).on('keydown.codeCompare', (e) => {
            if (e.key === 'Escape' && (!window.keyIsForDialog || window.keyIsForDialog(e, $overlay[0]))) { e.preventDefault(); close(); }
        });
        $('body').append($overlay);
        if (typeof trapDialogFocus === 'function') release = trapDialogFocus($overlay);
        requestAnimationFrame(() => { $overlay.addClass('open'); $overlay.find('.code-compare-modal').trigger('focus'); });
    }

    function resolveConflict(file, choice) {
        if (!file || !file.buf || file.buf.status !== 'conflict') return;
        file.buf = C.reduceBuffer(file.buf, { type: choice });
        if (choice === 'useTheirs') { file.handle?.setText(file.buf.text); clearDraft(file.abs); }
        markUnsavedLines(file);
        renderTabs();
        renderTree();
        renderChrome();
        if (choice === 'keepMine') file.handle?.focus();
    }

    // ---- Versions ---------------------------------------------------------

    // Saved hand edits become their own version: when the user leaves the code,
    // switches project, or before the next AI turn (awaited there, so the AI's
    // version holds only its own changes).
    async function checkpoint(chatId, appDir, opts) {
        if (!chatId || !appDir || deleted(chatId)) return;
        const p = loadPending(chatId);
        if (!p.version.length) return;
        const label = C.versionLabel(p.version);
        p.version = [];
        savePending(chatId, p);
        // Another snapshot (a publish, a restore's safety copy) may already hold
        // these edits.
        if (window.isProjectDirty && !window.isProjectDirty(chatId)) return;
        const run = window.createProjectVersion?.({ chatId, appDir, label });
        if (opts && opts.wait && run) { try { await run; } catch (e) { /* the snapshot reports its own failure */ } }
    }

    // ---- Chrome -----------------------------------------------------------

    function setStatus(text, kind) {
        S.status = text ? { text, kind: kind || 'info' } : null;
        renderStatus();
    }

    // A warning about one action, gone after a few seconds so it never hides
    // the file's own state (Unsaved changes, Saving). It sits over the status
    // instead of replacing it, so "Updating the preview" comes back after it.
    function flashStatus(text) {
        const flash = { text, kind: 'warn' };
        S.flash = flash;
        renderStatus();
        setTimeout(() => {
            if (S.flash !== flash) return;
            S.flash = null;
            renderStatus();
        }, 4000);
    }

    function renderStatus() {
        if (!$root) return;
        const file = activeFile();
        const shown = S.flash || S.status;
        let left = '';
        if (shown) {
            left = (shown.kind === 'busy' ? ICON.spinner : '') + `<span>${esc(shown.text)}</span>`;
        } else if (file && file.buf) {
            if (file.buf.status === 'saving') left = ICON.spinner + '<span>Saving…</span>';
            else if (C.isDirtyStatus(file.buf.status)) left = '<span class="code-dot"></span><span>Unsaved changes</span>';
            else if (S.access === 'view') left = '<span>Read only on the free plan</span>';
            else if (file.readOnlyReason) left = '<span>Read only</span>';
        }
        // The left side is a live region: only rewrite it when it changes, or
        // screen readers repeat it on every caret move.
        const kind = shown ? shown.kind : 'info';
        const leftKey = kind + '|' + left;
        if (S.statusHtml !== leftKey) {
            S.statusHtml = leftKey;
            $root.find('.code-status-left').attr('class', 'code-status-left is-' + kind).html(left);
        }
        const right = [];
        if (file && file.handle && S.cursor) right.push(`<span>Ln ${S.cursor.line}, Col ${S.cursor.col}</span>`);
        const lang = file && file.info.language
            ? { html: 'HTML', svg: 'SVG', css: 'CSS', javascript: 'JavaScript', json: 'JSON', markdown: 'Markdown', plain: 'Text' }[file.info.language]
            : null;
        if (lang) right.push(`<span>${lang}</span>`);
        $root.find('.code-status-right').html(right.join(''));
    }

    function renderTabs() {
        if (!$root) return;
        const html = S.tabs.map((abs) => {
            const f = S.files.get(abs);
            const dirty = holdsUnsaved(f);
            const active = abs === S.active;
            return `<div class="code-tab${active ? ' is-active' : ''}" data-path="${esc(abs)}">`
                + `<button type="button" class="code-tab-btn" role="tab" aria-selected="${active}" title="${esc(relPath(abs))}">${esc(baseName(abs))}${dirty ? '<span class="code-dot" aria-label="Unsaved changes"></span>' : ''}</button>`
                + `<button type="button" class="code-tab-close" aria-label="Close ${esc(baseName(abs))}">${ICON.close}</button></div>`;
        }).join('');
        const tabs = $root.find('.code-tabs')[0];
        keepFocus(tabs, () => { tabs.innerHTML = html; });
        const file = activeFile();
        $root.find('.code-files-name').text(file ? baseName(file.abs) : 'Files');
    }

    function bar(kind, html, actions) {
        return `<div class="code-bar is-${kind}" role="${kind === 'error' || kind === 'conflict' ? 'alert' : 'status'}"><div class="code-bar-text">${html}</div>${actions ? `<div class="code-bar-actions">${actions}</div>` : ''}</div>`;
    }

    function renderBars() {
        if (!$root) return;
        const file = activeFile();
        const out = [];
        const busy = turnRunning() || !!window._restoringVersion
            || !!(S.chatId && (window.isPublishInFlight?.(S.chatId) || window.isPublishStarting?.(S.chatId) || window.isRestoreStarting?.(S.chatId)));
        if (turnRunning() && S.chatId === currentChatId) {
            out.push(bar('busy', `${ICON.spinner}<span>The AI is changing your files. Editing is paused until it finishes, and open files update as it writes.</span>`));
        } else if (window._restoringVersion) {
            out.push(bar('busy', `${ICON.spinner}<span>Restoring a version. Editing is paused until it finishes.</span>`));
        } else if (S.chatId && window.isPublishInFlight?.(S.chatId)) {
            out.push(bar('busy', `${ICON.spinner}<span>Publishing your site. You can save again when it finishes.</span>`));
        }
        if (S.access === 'view') {
            out.push(bar(S.planWasEdit ? 'info' : 'upgrade',
                S.planWasEdit
                    ? '<span>Your paid plan has ended, so files are read only again. Everything you saved stays in your project.</span>'
                    : '<span>Editing code yourself is part of a paid Puter plan. You can read, search and copy every file now, and hand edits never use credits.</span>',
                '<button type="button" class="code-upgrade-btn is-primary" data-source="code_editor">Upgrade to edit</button>'));
            // The offer's impression, once per open of the Code view (also when
            // a lapse brings the bar up while it is open).
            if (S.mode === 'code' && !S.promptCounted) {
                S.promptCounted = true;
                if (typeof _upgradePromptsShown !== 'undefined') _upgradePromptsShown.delete('code_editor');
                if (typeof trackUpgradePromptShown === 'function') trackUpgradePromptShown('code_editor');
            }
        }
        const held = S.chatId ? S.heldErrors.get(S.chatId) : null;
        if (held) {
            const where = held.file ? `${esc(relPath(held.file))}${held.line ? ', line ' + held.line : ''}` : '';
            out.push(bar('error',
                `${ICON.alert}<div><strong>Your app reported an error after your code change.</strong>`
                + (held.message ? `<code>${esc(String(held.message).slice(0, 300))}</code>` : '')
                + (where ? `<span class="code-bar-where">${where}</span>` : '') + '</div>',
                (held.file ? `<button type="button" class="code-goto-error">Go to ${held.line ? 'line ' + held.line : 'file'}</button>` : '')
                + `<button type="button" class="code-ask-fix is-primary"${busy ? ' disabled' : ''}>Ask AI to fix</button>`
                + `<button type="button" class="code-dismiss-error" aria-label="Dismiss">${ICON.close}</button>`));
        }
        if (file && file.buf) {
            if (file.buf.status === 'conflict') {
                out.push(bar('conflict',
                    `<span><strong>${esc(baseName(file.abs))} changed after you started editing it.</strong> Pick which version to keep.</span>`,
                    '<button type="button" class="code-conflict-compare">Compare</button>'
                    + '<button type="button" class="code-conflict-theirs">Use the new version</button>'
                    + '<button type="button" class="code-conflict-mine is-primary">Keep mine</button>'));
            } else if (file.buf.status === 'error' && file.buf.error) {
                out.push(bar('error', `<span>${esc(file.buf.error)}</span>`, S.access === 'edit' ? '<button type="button" class="code-save-retry is-primary">Try again</button>' : ''));
            } else if (file.buf.status === 'deleted') {
                out.push(bar('info', '<span>This file was deleted or moved. Close it, or copy what you need first.</span>'));
            }
            if (file.readOnlyReason) out.push(bar('info', `${ICON.lock}<span>${esc(READ_ONLY_REASONS[file.readOnlyReason])}</span>`));
            else if (file.info.backend && S.access === 'edit') out.push(bar('note', `${ICON.cloud}<span>This is your app’s backend. Saving it redeploys the backend, which takes up to 30 seconds.</span>`));
        }
        // Rewrite only when something changed: the bars hold alerts, which a
        // screen reader announces again on every rewrite, and buttons that
        // would lose keyboard focus.
        const html = out.join('');
        if (S.barsHtml !== html) {
            S.barsHtml = html;
            $root.find('.code-bars')[0].innerHTML = html;
        }
    }

    function renderChrome() {
        // The toolbar's Code button carries a dot while unsaved edits wait
        // behind the preview.
        $('.pane-mode-btn[data-mode="code"] .pane-mode-dot').prop('hidden', !(S.mode === 'preview' && (hasUnsaved() || strandedFiles().length > 0)));
        if (!$root) return;
        const file = activeFile();
        for (const f of S.files.values()) applyEditable(f);
        const textFile = !!(file && file.buf && file.handle);
        const dirty = !!(file && file.buf && C.isDirtyStatus(file.buf.status));
        const readOnly = !file || S.access !== 'edit' || !!(file && file.readOnlyReason);
        $root.find('.code-readonly').prop('hidden', !(textFile && readOnly));
        const block = file && file.buf ? blockFor(file) : null;
        $root.find('.code-save-btn').prop('hidden', !(textFile && S.access === 'edit' && !file.readOnlyReason))
            .prop('disabled', !dirty || !!block || file.buf.status === 'saving' || file.buf.status === 'conflict');
        $root.find('.code-discard-btn').prop('hidden', !(dirty && file.buf.status !== 'saving'));
        const phone = isPhone();
        $root.toggleClass('is-phone', phone);
        $root.find('.code-edit-btn').prop('hidden', !(phone && textFile && S.access === 'edit' && !file.readOnlyReason && !S.phoneEditing))
            .prop('disabled', !!block && block.reason !== 'plan');
        renderBars();
        renderStatus();
    }

    // ---- Phones -----------------------------------------------------------

    function openSheet() {
        if (!$root) return;
        S.sheetOpen = true;
        $root.addClass('sheet-open');
        $root.find('.code-files-btn').attr('aria-expanded', 'true');
        $root.find('.code-tree').attr({ role: 'dialog', 'aria-modal': 'true' });
        setTimeout(() => {
            const $active = $root.find('.code-tree-item.is-active');
            ($active.length ? $active : $root.find('.code-tree-item')).first().trigger('focus');
        }, 0);
    }
    function closeSheet() {
        if (!$root || !S.sheetOpen) return;
        const hadFocus = $root.find('.code-tree')[0].contains(document.activeElement);
        S.sheetOpen = false;
        $root.removeClass('sheet-open');
        $root.find('.code-files-btn').attr('aria-expanded', 'false');
        $root.find('.code-tree').removeAttr('role aria-modal');
        if (hadFocus) $root.find('.code-files-btn').trigger('focus');
    }

    // ---- Leaving, asking ---------------------------------------------------

    // Save, drop, or stay, before the files are closed. A file that cannot be
    // saved right now (a running turn, a conflict) only offers drop or stay.
    async function askSave(files, why) {
        const list = nameList(files);
        const conflict = files.some((f) => f.buf && f.buf.status === 'conflict');
        const blocked = conflict || files.some((f) => blockFor(f));
        if (blocked) {
            const reason = conflict ? 'changed somewhere else too, so your changes can’t be saved until you pick a version' : 'can’t be saved right now';
            const choice = await puter.ui.alert(`${list} ${reason}. Leave them and lose your changes?`,
                [{ label: 'Lose changes', value: 'discard', type: 'primary' }, { label: 'Stay', value: 'cancel', type: 'secondary' }]);
            return choice === 'discard' ? 'discard' : 'cancel';
        }
        const choice = await puter.ui.alert(`Save your changes to ${list} ${why}? Changes you don’t save are lost.`, [
            { label: 'Save', value: 'save', type: 'primary' },
            { label: 'Don’t save', value: 'discard', type: 'secondary' },
            { label: 'Cancel', value: 'cancel', type: 'secondary' },
        ]);
        return choice === 'save' || choice === 'discard' ? choice : 'cancel';
    }

    // ---- Events -----------------------------------------------------------

    $(document).on('click', '.pane-mode-btn', function () {
        if ($(this).attr('data-mode') === 'code') openCode();
        else closeCode();
    });
    $(document).on('click', '.code-tree-item', function () {
        const abs = $(this).attr('data-path');
        if ($(this).attr('data-dir')) toggleDir(abs);
        else openFile(abs).then(() => { if (!isPhone()) activeFile()?.handle?.focus(); });
    });
    $(document).on('click', '.code-tree-retry', async function () {
        const dir = $(this).attr('data-dir');
        await loadDir(dir);
        renderTree();
        renderPanes();
    });
    $(document).on('click', '.code-retry-open', function () {
        const abs = S.active;
        const file = activeFile();
        if (!file) return;
        file.$pane.remove();
        S.files.delete(abs);
        S.tabs = S.tabs.filter((p) => p !== abs);
        openFile(abs);
    });
    $(document).on('click', '.code-tab-btn', function () {
        activate($(this).closest('.code-tab').attr('data-path'));
        if (!isPhone()) activeFile()?.handle?.focus();
    });
    $(document).on('click', '.code-tab-close', function (e) {
        e.stopPropagation();
        closeTab($(this).closest('.code-tab').attr('data-path'));
    });
    $(document).on('auxclick', '.code-tab', function (e) {
        if (e.button === 1) { e.preventDefault(); closeTab($(this).attr('data-path')); }
    });
    $(document).on('click', '.code-save-btn, .code-save-retry', function () { saveFile(activeFile()); });
    $(document).on('click', '.code-discard-btn', async function () {
        const file = activeFile();
        if (!file) return;
        const ok = typeof puterConfirm === 'function' ? await puterConfirm(`Discard your changes to ${baseName(file.abs)}?`) : true;
        if (ok) discard(file);
    });
    $(document).on('click', '.code-edit-btn', function () {
        S.phoneEditing = true;
        renderChrome();
        activeFile()?.handle?.focus();
    });
    $(document).on('click', '.code-files-btn', function () { if (S.sheetOpen) closeSheet(); else openSheet(); });
    $(document).on('click', '.code-sheet-close, .code-sheet-scrim', closeSheet);
    $(document).on('click', '.code-upgrade-btn', function (e) {
        e.preventDefault();
        e.stopPropagation();
        window.openUpgradeModal?.($(this).attr('data-source') || 'code_editor');
    });
    $(document).on('click', '.code-conflict-compare', function () { showCompare(activeFile()); });
    $(document).on('click', '.code-conflict-mine', function () { resolveConflict(activeFile(), 'keepMine'); });
    $(document).on('click', '.code-conflict-theirs', function () { resolveConflict(activeFile(), 'useTheirs'); });
    $(document).on('click', '.code-goto-error', async function () {
        const held = S.chatId ? S.heldErrors.get(S.chatId) : null;
        if (!held || !held.file) return;
        await openFile(held.file);
        const file = S.files.get(held.file);
        if (file && file.handle && held.line) {
            file.handle.gotoLine(held.line, held.col || 1);
            file.handle.markLines([held.line], 'error');
            file.handle.focus();
        }
    });
    $(document).on('click', '.code-dismiss-error', function () {
        if (S.chatId) S.heldErrors.delete(S.chatId);
        renderChrome();
    });
    // The held error stays until the turn really starts (beforeTurn clears it),
    // so a send refused by a publish or a restore loses nothing.
    $(document).on('click', '.code-ask-fix', function () {
        const held = S.chatId ? S.heldErrors.get(S.chatId) : null;
        if (!held || typeof sendChatMessage !== 'function') return;
        // A publish or a restore that is still saving first is left to
        // sendChatMessage, which says why it waits.
        if (turnRunning() || window._restoringVersion || window.isPublishInFlight?.(S.chatId)) return;
        track('Code Ask AI To Fix');
        // Show the conversation the fix is about to appear in.
        $('body').removeClass('chat-hidden');
        if (isPhone()) { $('body').addClass('mobile-view-chat'); window.syncViewSeg?.(); }
        sendChatMessage(held.report);
    });
    // Ctrl/Cmd+S anywhere in the code view saves instead of opening the
    // browser's "Save page" dialog.
    $(document).on('keydown', '.code-view', function (e) {
        if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 's' || e.key === 'S')) {
            // Inside the editor CodeMirror already saved and prevented it.
            const handled = e.isDefaultPrevented ? e.isDefaultPrevented() : e.defaultPrevented;
            e.preventDefault();
            if (!handled) saveFile(activeFile());
        }
        if (e.key === 'Escape' && S.sheetOpen) { e.preventDefault(); closeSheet(); }
    });
    // Changes from another tab or Puter's own file manager show up when the
    // user comes back to this one.
    let _lastFocusCheck = 0;
    function checkOnReturn() {
        if (document.visibilityState === 'hidden' || S.mode !== 'code' || !S.files.size) return;
        if (Date.now() - _lastFocusCheck < 5000) return;
        _lastFocusCheck = Date.now();
        reconcileSoon(100, { highlight: false });
    }
    window.addEventListener('focus', checkOnReturn);
    document.addEventListener('visibilitychange', checkOnReturn);
    const phoneQuery = window.matchMedia && window.matchMedia('(max-width: 900px)');
    if (phoneQuery && phoneQuery.addEventListener) {
        phoneQuery.addEventListener('change', () => { S.phoneEditing = false; closeSheet(); renderChrome(); });
    }

    // ---- What the rest of Builder calls -----------------------------------

    window.CodeEditor = {
        open: (opts) => openCode(opts),
        isOpen: () => S.mode === 'code',
        // The leave checks (switching projects, Back/Forward, closing the tab)
        // also count edits to a file deleted elsewhere, which leaving loses.
        hasUnsaved: (chatId) => hasUnsaved(chatId) || strandedFiles(chatId).length > 0,
        saveAll: (opts) => saveAll(opts),

        // confirmLeaveActiveChat: unsaved edits are saved, dropped, or the
        // switch is called off. Resolves true when it is fine to leave.
        async confirmLeave() {
            // Files deleted or moved elsewhere whose unsaved text the user
            // agreed to lose. Asked about again for any found while a save
            // runs.
            const lost = new Set();
            const askStranded = async () => {
                const fresh = strandedFiles().filter((f) => !lost.has(f));
                if (!fresh.length) return true;
                const one = fresh.length === 1;
                const choice = await puter.ui.alert(`${nameList(fresh)} ${one ? 'was' : 'were'} deleted or moved while you had unsaved changes, so ${one ? 'it' : 'they'} can’t be saved. Leave and lose those changes?`, [
                    { label: 'Lose changes', value: 'discard', type: 'primary' },
                    { label: 'Stay', value: 'cancel', type: 'secondary' },
                ]);
                if (choice !== 'discard') return false;
                for (const f of fresh) lost.add(f);
                return true;
            };
            // Leaving: the lost text's drafts go too, so it isn't offered back
            // if the file returns.
            const leave = () => {
                for (const f of lost) clearDraft(f.abs);
                return true;
            };
            if (!await askStranded()) return false;
            let files = dirtyFiles();
            for (;;) {
                if (!files.length) return leave();
                const choice = await askSave(files, 'before leaving this project');
                if (choice === 'cancel') return false;
                if (choice === 'discard') {
                    // Including a file found deleted while this was asked.
                    for (const f of strandedFiles()) lost.add(f);
                    discardAll();
                    return leave();
                }
                if (!await whileSettling(S.chatId, () => saveAll())) {
                    // The save failed: show why, in the code, and stay.
                    const failed = dirtyFiles();
                    toast(`Couldn’t save ${nameList(failed)}, so you’re still in this project. Open Code to see why.`, { type: 'error', duration: 8000 });
                    if (S.mode !== 'code') openCode({ focus: false });
                    return false;
                }
                if (!await askStranded()) return false;
                // A file can still have unsaved text in the editor after the
                // save, such as one opened from a draft while it ran: ask
                // again. A file whose editor never loaded keeps its draft.
                files = dirtyFiles().filter((f) => f.handle);
            }
        },

        // resetChatUIForSwitch: another project is opening. The leave gate has
        // already dealt with unsaved edits.
        onProjectSwitch() {
            if (S.chatId) { checkpoint(S.chatId, S.appDir); saveTabs(); }
            disposeAll();
            if (S.mode === 'code') setMode('preview');
        },
        // hideAppPreview: the pane is going away (a new project, or one with
        // no preview).
        onPaneHidden() {
            if (S.chatId) { checkpoint(S.chatId, S.appDir); saveTabs(); }
            disposeAll();
            S.mode = 'preview';
            $('.preview-pane').removeClass('code-mode');
            $('.pane-mode-btn').each(function () {
                const on = $(this).attr('data-mode') === 'preview';
                $(this).toggleClass('active', on).attr('aria-pressed', on ? 'true' : 'false');
            });
            $('.preview-select-element, .preview-device-trigger').prop('disabled', false);
            if ($root) $root.prop('hidden', true);
            closeSheet();
        },
        // deleteChat, before anything is removed: the open files close and can
        // never be saved again (saves check _deletedChatIds too). The records
        // stay until the delete is known to have worked.
        onProjectDeleting(chatId) {
            if (chatId && S.chatId === chatId) disposeAll();
        },
        // deleteChat, after the project is gone: drop its records.
        onProjectDeleted(chatId, appDir) {
            if (!chatId) return;
            store(pendingKey(chatId), null);
            store(tabsKey(chatId), null);
            S.heldErrors.delete(chatId);
            const dir = appDir ? norm(appDir) : null;
            if (dir && user()) {
                remapUnread(dir, () => null);
                for (const k of keysWithPrefix('codeEditor.draft:' + user() + ':' + dir + '/')) store(k, null);
            }
            if (S.chatId === chatId) disposeAll();
        },
        // duplicateChat: the copy starts with the same files, so it gets the
        // same unreported hand edits and the same overwrite guards.
        // renames: redeployWorkersForCopy's records. Each copied backend source
        // (copiedFilePath) was renamed to newFilePath for the copy's own worker.
        onProjectCopied(fromChatId, toChatId, fromAppDir, toAppDir, renames) {
            if (!fromChatId || !toChatId || !fromAppDir || !toAppDir || !user()) return;
            const from = norm(fromAppDir);
            const to = norm(toAppDir);
            const renamed = new Map((Array.isArray(renames) ? renames : [])
                .filter((r) => r && typeof r.copiedFilePath === 'string' && typeof r.newFilePath === 'string')
                .map((r) => [norm(r.copiedFilePath), norm(r.newFilePath)]));
            const move = (p) => {
                const q = (p === from || p.startsWith(from + '/')) ? to + p.slice(from.length) : p;
                return renamed.get(q) || q;
            };
            const p = loadPending(fromChatId);
            if (Object.keys(p.files).length || p.version.length) {
                const files = {};
                for (const [path, rec] of Object.entries(p.files)) files[move(path)] = rec;
                savePending(toChatId, { files, version: p.version.map(move) });
            }
            const unread = loadUnread();
            let added = false;
            for (const path of [...unread]) {
                if (path.startsWith(from + '/')) { unread.add(move(path)); added = true; }
            }
            if (added) saveUnread(unread);
        },

        // Whether beforeTurn has work that takes a moment (sendChatMessage
        // locks the composer meanwhile, so nothing typed there is lost).
        turnPrepNeeded(chatId) {
            return hasUnsaved(chatId) || (!!chatId && !!user() && loadPending(chatId).version.length > 0);
        },
        // sendChatMessage, before the turn starts: unsaved edits go to disk,
        // saved ones become their own version. Resolves false to call the send
        // off (the composer keeps its text). The editor is read only from here
        // until onTurnEnd.
        async beforeTurn(t) {
            t = t || {};
            const chatId = t.chatId;
            // An automatic fix never starts over code the user is still
            // writing. The error waits in the editor instead.
            if (t.autoFix && hasUnsaved(chatId)) return false;
            S.turnBusy = true;
            renderChrome();
            const names = dirtyFiles(chatId).map((f) => baseName(f.abs));
            const settled = await settleUnsaved(chatId, { turnSetup: true });
            if (settled !== 'ok') {
                S.turnBusy = false;
                renderChrome();
                if (settled === 'failed') {
                    toast(t.consumedComposer
                        ? 'Your code changes couldn’t be saved, so the AI didn’t start. Your message is still in the box.'
                        : 'Your code changes couldn’t be saved, so the AI didn’t start.', { type: 'error', duration: 8000 });
                    if (S.mode !== 'code') openCode({ focus: false });
                }
                return false;
            }
            if (names.length && !dirtyFiles(chatId).length && S.access === 'edit') {
                toast(`Saved your changes to ${names.length === 1 ? names[0] : names.length + ' files'} before the AI started.`, { type: 'success', duration: 4000 });
            }
            await checkpoint(chatId, t.appDir || S.appDir, { wait: true });
            // The user spoke: a held error is theirs to send again if it comes
            // back. An automatic fix or a resume is not the user speaking.
            if (!t.autoFix && !t.resume && S.heldErrors.delete(chatId)) renderBars();
            S.phoneEditing = false;
            renderChrome();
            return true;
        },
        // After the turn has fully unwound (its last tool write included), or
        // when a send is called off after beforeTurn.
        onTurnEnd() {
            S.turnBusy = false;
            if (S.files.size) reconcileSoon(0);
            else refreshTreeSoon(0);
            renderChrome();
        },

        // The hidden note for the next user message, or ''. Cleared only by
        // notePosted, once the message is in the conversation.
        pendingNote(chatId) {
            if (!chatId || !user()) return '';
            const p = loadPending(chatId);
            const paths = Object.keys(p.files);
            if (!paths.length) return '';
            return C.buildManualEditNote({ files: paths.map((path) => ({ path, before: p.files[path].before, after: p.files[path].after })) });
        },
        notePosted(chatId) {
            const p = loadPending(chatId);
            p.files = {};
            savePending(chatId, p);
        },

        // The write and create_worker tools: refuse to replace a file the user
        // edited until the model has read it again. A file that no longer
        // exists has nothing to protect.
        async assertModelMayOverwrite(absPath) {
            const path = norm(absPath);
            if (!user() || !loadUnread().has(path)) return;
            try {
                await puter.fs.stat(path);
            } catch (e) {
                if (notFound(e)) { remapUnread(path, (p) => (p === path ? null : p)); return; }
            }
            // A read the model sees only the start of keeps the guard, so the
            // advice covers that case too.
            throw new Error(`The user edited ${absPath} by hand in the Code view since you last read it, so writing the whole file from memory would undo their changes. Read it again with ReadTextFile first, then apply your change, preferably with edit or multi_edit. If the read comes back truncated, use edit or multi_edit, since writing the whole file stays refused.`);
        },
        noteModelRead(absPath) {
            const unread = loadUnread();
            if (unread.delete(norm(absPath))) saveUnread(unread);
        },
        // The AI renamed, moved, copied or deleted files: their guards follow.
        onModelFileOp(toolName, input, state) {
            if (!user() || !input) return;
            const abs = (p) => { try { return window.assertPathInProject(p, state); } catch (e) { return null; } };
            const base = (p) => p.slice(p.lastIndexOf('/') + 1);
            if (toolName === 'delete' && input.path) {
                const p = abs(input.path);
                if (p) remapUnread(p, () => null);
            } else if (toolName === 'rename' && input.path && input.new_name) {
                const from = abs(input.path);
                if (from) remapUnread(from, (p) => from.slice(0, from.lastIndexOf('/') + 1) + input.new_name + p.slice(from.length));
            } else if ((toolName === 'move' || toolName === 'copy') && input.destination) {
                const dest = abs(String(input.destination).replace(/\/+$/, ''));
                const sources = toolName === 'move' ? (Array.isArray(input.paths_array) ? input.paths_array : []) : [input.path];
                if (!dest) return;
                for (const src of sources) {
                    const from = src && abs(src);
                    if (!from) continue;
                    const to = dest + '/' + base(from);
                    if (toolName === 'move') remapUnread(from, (p) => to + p.slice(from.length));
                    else {
                        const unread = loadUnread();
                        let added = false;
                        for (const p of [...unread]) {
                            if (p === from || p.startsWith(from + '/')) { unread.add(to + p.slice(from.length)); added = true; }
                        }
                        if (added) saveUnread(unread);
                    }
                }
            }
        },

        // The AI's tools changed files. Reread what is open (coalesced).
        onToolWrite(toolName, chatId) {
            if (chatId !== S.chatId) return;
            if (S.files.size) reconcileSoon(400);
            else refreshTreeSoon(400);
        },
        // The preview reloaded: the refresh may have restamped tokens or the
        // install block in open pages.
        onPreviewReloaded(chatId) {
            if (chatId === S.chatId && S.files.size) reconcileSoon(300, { highlight: false });
        },

        // doPublish, before it copies the files: unsaved edits are saved
        // without refreshing the preview (the copy must not race a restamp;
        // the publish refreshes once it is done). 'ok', 'stay' or 'failed'.
        prepareForPublish(chatId) {
            return settleUnsaved(chatId, { deferRefresh: true });
        },

        // restoreVersion, before anything is touched: unsaved edits are saved
        // first so the restore point holds them. Resolves false to cancel, and
        // 'confirmed' when the user has already agreed to the restore.
        async beforeRestore(chatId, opts) {
            const files = dirtyFiles(chatId);
            if (!files.length) return true;
            await refreshAccess();
            const askFirst = !(opts && opts.skipConfirm);
            if (askFirst && S.access === 'edit') {
                const ok = typeof puterConfirm === 'function'
                    ? await puterConfirm('Restore this version? Your unsaved code changes are saved first and kept as a version, so you can switch back to them.')
                    : true;
                if (!ok) return false;
            }
            const settled = await settleUnsaved(chatId);
            if (settled === 'stay') return false;
            if (settled === 'failed') {
                await puter.ui.alert('Your code changes couldn’t be saved, so the version wasn’t restored.');
                return false;
            }
            return askFirst && S.access === 'edit' ? 'confirmed' : true;
        },
        onRestoreStart() { renderChrome(); },
        // noted: the restore finished and its note is in the conversation.
        // Then the AI knows the files changed, and the hand-edit note (and its
        // hold on automatic fixes) goes. Otherwise the file list stays, without
        // diffs, so the next message still asks the AI to reread those files.
        onRestoreEnd(chatId, filesTouched, noted) {
            if (filesTouched && chatId && user()) {
                const p = loadPending(chatId);
                if (noted) p.files = {};
                else for (const k of Object.keys(p.files)) p.files[k] = { before: null, after: null };
                p.version = [];
                savePending(chatId, p);
                S.heldErrors.delete(chatId);
            }
            if (chatId === S.chatId && S.files.size) reconcileSoon(0, { highlight: false });
            renderChrome();
        },
        onPublishBusyChange() { renderChrome(); },
        // A publish or a restore started or stopped saving this view's edits
        // first (isPublishStarting, isRestoreStarting). The bars count both
        // as busy, so they redraw on each change.
        onStartingChange() { renderChrome(); },
        onPlanChanged() {
            accessFrom(window.user);
            renderChrome();
        },

        // The preview's error handlers, before an automatic fix: while the
        // AI has not yet been told about hand edits (or edits are unsaved),
        // the error is held for the user instead. Kept per project and across
        // reloads, since the record it rests on is stored. Returns true when
        // it is held.
        holdAutoFix(err) {
            const chatId = typeof currentChatId !== 'undefined' ? currentChatId : null;
            if (!chatId) return false;
            if (!hasPendingNote(chatId) && !hasUnsaved(chatId)) return false;
            const first = !S.heldErrors.has(chatId);
            S.heldErrors.set(chatId, {
                report: err.report,
                message: err.message || '',
                file: err.source ? C.errorFile(err.source, window.currentPreviewUrl, servedRoot()) : null,
                line: err.lineno || null,
                col: err.colno || null,
            });
            if (chatId === S.chatId) renderChrome();
            if (first && S.mode !== 'code') {
                toast('Your app reported an error after your code change. Open Code to see it, or ask the AI to fix it.', { type: 'warning', key: 'code-held-error', throttleMs: 10000, duration: 8000 });
            }
            return true;
        },
    };
})();
