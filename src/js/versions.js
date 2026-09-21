// versions.js — Project version history (checkpoints) with one-click rollback.
//
// After every AI turn that modifies the project files, a full snapshot of the
// app directory is taken automatically. Snapshots are stored OUTSIDE the
// published app directory — under /<user>/AppData/<appID>/.versions/<chatId>/ —
// so they are never served by hosting, never included in the project download,
// and never visible to the AI's own readdir (which is scoped to the app dir).
//
// The user can restore any snapshot from the Versions panel in the preview
// toolbar. Restoring reverts the project files to that snapshot and reloads the
// live preview. Snapshots are immutable, so restoring is itself fully
// reversible — you can switch to any other version at any time.

(function () {
    'use strict';

    // Keep at most this many snapshots per chat; oldest are pruned (never the
    // one currently in the working directory).
    const MAX_VERSIONS = 30;

    // Tools that mutate the project directory and therefore warrant a snapshot.
    // create_worker writes workers/<name>.js into the app dir, so it belongs here.
    // delete_worker is intentionally omitted: it only calls puter.workers.delete
    // and touches no project file, so snapshotting it would create redundant,
    // no-change versions.
    const MUTATING_TOOLS = new Set(['write', 'edit', 'multi_edit', 'delete', 'copy', 'move', 'rename', 'mkdir', 'create_worker']);

    // ----- change tracking ---------------------------------------------------

    // Called by the tool dispatcher after a project-modifying tool runs, and by
    // the attachment-save path. Non-mutating tool names are ignored. `chatId`
    // is the turn's chat (a mid-turn switch must not dirty the chat the user
    // moved to); it defaults to the open chat.
    window.markProjectModified = function (toolName, chatId) {
        if (toolName && !MUTATING_TOOLS.has(toolName)) return;
        window._filesChangedThisTurn = (window._filesChangedThisTurn || 0) + 1;
        // The working dir now has changes that may not yet be captured by a
        // snapshot. restoreVersion reads this to take a pre-restore safety
        // snapshot, so an interrupted turn (Stop) or a failed end-of-turn
        // snapshot can't be silently destroyed by a later restore/undo. Cleared
        // when a snapshot succeeds (performCreateVersion) or after a restore.
        markDirty(chatId || openChatId());
    };

    // "Has un-snapshotted changes", PER CHAT. One global boolean used to serve
    // every chat: chat A's failed end-of-turn snapshot left it true, a turn in
    // chat B then cleared it, and a later Restore in A skipped its "Before
    // restore" safety snapshot — A's un-snapshotted work was overwritten with
    // no restore point, the opposite of what the confirm dialog promises. The
    // reverse leak made B's Publish button read "Publish your latest changes"
    // right after switching from a dirty A. window._projectDirtySinceSnapshot
    // remains the OPEN chat's view of this set for the readers in ui.js.
    const _dirtyChats = new Set();
    // Per-chat count of mutations, bumped by every markProjectModified. A
    // snapshot records the count it started copying at and may clear the dirty
    // flag only if the count has not moved since: a snapshot's copy and its
    // index write are separated by a network round trip, and the next turn can
    // edit files inside that gap. Clearing unconditionally declared those newer
    // edits captured by a snapshot that does not contain them, so if the next
    // checkpoint failed a later restore overwrote them with no safety copy.
    const _mutationGen = new Map();
    // Chats this session has watched all the way to a checkpoint (a snapshot
    // that captured them, or a restore that rewrote them). Only for these is
    // "absent from _dirtyChats" first-hand knowledge rather than a record read
    // back from the browser — see isChatDirty.
    const _knownClean = new Set();

    // The set lives in memory, but the edits it describes live in cloud storage:
    // a reload — or a crash, or a tab closed mid-turn — dropped the record and
    // kept the files, and the next restore then saw a clean project and deleted
    // work that had never reached a checkpoint. Mirror it into localStorage so
    // it outlives the session that made the edits. Per-origin storage is shared
    // by every account on this browser profile, so the key carries the username
    // (same convention as the composer drafts in app.js). Merely TOUCHING
    // localStorage throws where site data is blocked, so every access is
    // guarded; a blocked store is recorded rather than ignored, because it is
    // the difference between "this project is clean" and "we cannot tell".
    let _storageUsable = true;
    let _hydratedKey = null;
    function dirtyStoreKey() {
        const name = (window.user && window.user.username) || '';
        return name ? 'builderUnsnapshotted:' + name : null;
    }
    function hydrateDirty() {
        const key = dirtyStoreKey();
        if (!key || _hydratedKey === key) return;
        _hydratedKey = key;
        try {
            const ids = JSON.parse(localStorage.getItem(key) || '[]');
            if (Array.isArray(ids)) for (const id of ids) if (id) _dirtyChats.add(id);
        } catch (e) {
            _storageUsable = false;
        }
    }
    function persistDirty() {
        const key = dirtyStoreKey();
        if (!key) return;
        try { localStorage.setItem(key, JSON.stringify([..._dirtyChats].filter(Boolean))); }
        catch (e) { _storageUsable = false; }
    }

    function markDirty(chatId) {
        hydrateDirty();
        _mutationGen.set(chatId, (_mutationGen.get(chatId) || 0) + 1);
        _dirtyChats.add(chatId);
        _knownClean.delete(chatId);
        persistDirty();
    }
    // The working dir is now known to match a checkpoint.
    function clearDirty(chatId) {
        hydrateDirty();
        _dirtyChats.delete(chatId);
        _knownClean.add(chatId);
        persistDirty();
    }
    function openChatId() { return typeof currentChatId !== 'undefined' ? currentChatId : null; }
    // Ask the question for a NAMED chat. Anything that spans an await must use
    // this rather than the window property below: the property answers for the
    // chat on screen, and the user can open another project at any point during
    // a restore or a publish.
    function isChatDirty(chatId) {
        const id = chatId || openChatId();
        hydrateDirty();
        if (_dirtyChats.has(id)) return true;
        // With no readable record and no checkpoint watched this session, the
        // working dir cannot be shown to match its version — and a needless
        // safety snapshot costs a copy, while a missing one costs the user's
        // work. Assume un-snapshotted changes.
        return !_storageUsable && !_knownClean.has(id);
    }
    window.isProjectDirty = isChatDirty;
    Object.defineProperty(window, '_projectDirtySinceSnapshot', {
        configurable: true,
        get() { return _dirtyChats.has(openChatId()); },
        set(v) { if (v) markDirty(openChatId()); else clearDirty(openChatId()); },
    });

    // Called at the start of every turn so the snapshot only fires when this
    // turn actually changed files.
    window.resetTurnFileChanges = function () {
        window._filesChangedThisTurn = 0;
    };

    // ----- path helpers ------------------------------------------------------

    function versionsRootForChat(chatId) {
        return `/${window.user.username}/AppData/${puter.appID}/.versions/${chatId}`;
    }

    function indexPath(chatId) {
        return versionsRootForChat(chatId) + '/index.json';
    }

    function generateVersionId() {
        return 'v_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    }

    function labelFromText(text) {
        if (!text) return '';
        const t = String(text).trim().replace(/\s+/g, ' ');
        return t.length > 60 ? t.slice(0, 60) + '…' : t;
    }

    function formatRelativeTime(iso) {
        if (!iso) return '';
        const then = new Date(iso).getTime();
        if (isNaN(then)) return '';
        const diff = Math.max(0, Date.now() - then);
        const sec = Math.round(diff / 1000);
        if (sec < 60) return 'just now';
        const min = Math.round(sec / 60);
        if (min < 60) return `${min} min ago`;
        const hr = Math.round(min / 60);
        if (hr < 24) return `${hr} hr ago`;
        const days = Math.round(hr / 24);
        if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
        try {
            return new Date(iso).toLocaleDateString();
        } catch (e) {
            return '';
        }
    }

    // ----- index (metadata) read/write --------------------------------------

    // In-memory cache of the last successfully read/written index, keyed by
    // chatId. It lets the panel paint instantly on open instead of blocking on a
    // network read every time (the read still runs in the background to
    // reconcile). The cache is kept authoritative because writeIndex — the only
    // way the index changes — updates it. Only genuine parsed indexes are cached,
    // never the empty fallback, so a transient read error can't make a chat with
    // real versions briefly render as "no versions".
    const indexCache = new Map();

    // Cheap signature of what the panel actually shows, used to skip a redundant
    // re-render (and the flicker / scroll reset it causes) when the background
    // read matches what we already painted from cache. Labels and timestamps are
    // immutable once written, so the version id list plus the current pointer
    // fully determine the rendered list.
    function indexSignature(index) {
        if (!index) return '';
        return (index.current || '') + '#' + ((index.versions || []).map(v => v.id).join(','));
    }

    // The version id the working dir currently matches, for the open chat — the
    // "where are we now" pointer the Publish control compares against its
    // published baseline to decide if there are unpublished changes. Reads the
    // in-memory cache only (no FS), so it's safe to call synchronously from the
    // toolbar; returns null when nothing is cached yet.
    window.getCurrentVersionId = function () {
        if (!currentChatId) return null;
        const idx = indexCache.get(currentChatId);
        return (idx && idx.current) || null;
    };

    // Read the index for a chat. A MISSING file is a project with no snapshots
    // yet, so it legitimately returns an empty index. A corrupt file also returns
    // empty — a backup is parked first and the next write resets it cleanly. Any
    // OTHER failure (network/permission) THROWS: the mutating callers below write
    // back whatever they read, so treating unknown state as "no versions" would
    // persist an empty index over a chat's entire version history and orphan
    // every snapshot directory. Display-only callers must use
    // readIndexForDisplay, which never throws.
    async function readIndex(chatId) {
        let txt;
        try {
            txt = await puter.fs.read(indexPath(chatId)).then(d => d.text());
        } catch (e) {
            if (typeof isNotFoundError === 'function' && isNotFoundError(e)) {
                return { current: null, versions: [] };
            }
            throw e;
        }
        let parsed;
        try {
            parsed = JSON.parse(txt);
        } catch (e) {
            parsed = null;
        }
        if (!parsed || !Array.isArray(parsed.versions)) {
            // Corrupt/unusable (e.g. an interrupted write). The next write resets
            // the file, losing whatever it held — so park a best-effort backup
            // first, mirroring the issues doc's recovery. Fire-and-forget: it must
            // never block or fail the read path.
            try {
                puter.fs.copy(indexPath(chatId), versionsRootForChat(chatId), { newName: 'index.corrupt.json', overwrite: true })
                    .catch(() => { /* best effort */ });
            } catch (err) { /* best effort */ }
            return { current: null, versions: [] };
        }
        if (typeof parsed.current === 'undefined') parsed.current = null;
        if (chatId) {
            indexCache.set(chatId, parsed);
            if (chatId === currentChatId) {
                updateVersionNavButtons(parsed);
                // The current-version pointer may have changed → the Publish
                // control's "unpublished changes" state can change with it.
                window.refreshPublishButton?.();
            }
        }
        return parsed;
    }

    // Never-throwing readIndex for the read-only surfaces (panel, toolbar,
    // undo/redo). On failure it falls back to the last known-good cached index so
    // a transient blip keeps showing the real history, and returns null when there
    // is nothing trustworthy to show — callers must treat null as "unknown", never
    // as "no versions".
    async function readIndexForDisplay(chatId) {
        try {
            return await readIndex(chatId);
        } catch (e) {
            console.warn('readIndex failed; falling back to cache:', e);
            return indexCache.get(chatId) || null;
        }
    }

    async function writeIndex(chatId, index) {
        await puter.fs.write(indexPath(chatId), JSON.stringify(index), { createMissingParents: true });
        if (chatId) {
            indexCache.set(chatId, index);
            if (chatId === currentChatId) {
                updateVersionNavButtons(index);
                // A new snapshot, a relabel, or a restore just moved/confirmed the
                // current-version pointer — refresh the Publish "changes" state.
                window.refreshPublishButton?.();
            }
        }
    }

    // ----- snapshot creation -------------------------------------------------

    // Which snapshots the MAX_VERSIONS cap retires, oldest first. Never the
    // version the working dir currently matches, and never `protect` — the
    // version a restore is in the middle of reading. The restore takes its
    // pre-restore safety snapshot AFTER checking that the target exists, and
    // that snapshot is what pushes a full history over the cap: without the
    // exemption, restoring the OLDEST version of a project at the cap deleted
    // that very version (the safety snapshot became `current`, so the plain
    // oldest-first prune reached it), then failed the restore with a raw "not
    // found" — the one version the user asked for was gone for good.
    // Pure, so scripts/test-version-prune.mjs can pin it down.
    function versionsToPrune(versions, current, protect) {
        const list = Array.isArray(versions) ? versions : [];
        const keep = new Set([current, protect].filter(Boolean));
        const out = [];
        let excess = list.length - MAX_VERSIONS;
        for (let i = 0; i < list.length && excess > 0; i++) {
            const v = list[i];
            if (!v || keep.has(v.id)) continue;
            out.push(v);
            excess--;
        }
        return out;
    }
    window.__versionsToPrune = versionsToPrune;

    // Snapshots are serialized through this promise chain so two overlapping
    // turns can never lost-update index.json, while callers never have to await
    // (and thus never block — or hang — the UI behind a directory copy).
    let snapshotChain = Promise.resolve();

    // Snapshot the current app directory. Called at the end of a turn that
    // changed files. Never throws — failures are logged and swallowed so a
    // snapshot problem can never break the chat.
    async function performCreateVersion(opts) {
        opts = opts || {};
        try {
            // Prefer the chat/appDir captured by the caller at turn start. This
            // is essential: if the user switches chats mid-turn the live globals
            // point at a different project, but the turn's file edits landed in
            // the chat that was active when it started — so snapshot that one.
            const chatId = opts.chatId || currentChatId;
            const appDir = opts.appDir || currentAppDir;
            if (!chatId || !appDir || !window.user) return null;

            // Only snapshot when the app directory actually has content.
            let items;
            try {
                items = await puter.fs.readdir(appDir);
            } catch (e) {
                return null; // app dir doesn't exist yet
            }
            if (!Array.isArray(items) || items.length === 0) return null;

            const versionId = generateVersionId();
            const root = versionsRootForChat(chatId);
            await puter.fs.mkdir(root, { recursive: true });
            // Copy the whole app dir into the versions root, renamed to versionId.
            // Result: <root>/<versionId>/ holds an exact copy of the app dir.
            // Retry once on a transient failure (the copy is the heaviest, most
            // network-dependent step; overwrite:true makes a re-copy idempotent),
            // so a single blip on a large multi-file project doesn't silently drop
            // the only snapshot of the turn's changes.
            // Everything this snapshot can possibly capture is what the app dir
            // holds from here on; a mutation from this point (during the copy,
            // or during the index write that follows) is NOT in it.
            const genAtCopy = _mutationGen.get(chatId) || 0;
            try {
                await puter.fs.copy(appDir, root, { newName: versionId, overwrite: true });
            } catch (copyErr) {
                console.warn('createProjectVersion: copy failed, retrying once:', copyErr);
                await puter.fs.copy(appDir, root, { newName: versionId, overwrite: true });
            }

            // Throws if the index can't be READ (as opposed to being legitimately
            // absent). That aborts the snapshot via the catch below — leaving the
            // directory copied above orphaned, which is harmless and recoverable —
            // instead of pushing this version onto an empty index and persisting
            // that over the chat's real history.
            const index = await readIndex(chatId);
            index.versions.push({
                id: versionId,
                label: labelFromText(opts.label),
                createdAt: new Date().toISOString(),
                previewUrl: window.currentPreviewUrl || null,
            });
            index.current = versionId;

            // Enforce the cap: prune the oldest snapshots, but never the current
            // one, and never a version a restore is about to read (opts.protect).
            const pruned = versionsToPrune(index.versions, index.current, opts.protect);
            for (const doomed of pruned) {
                index.versions.splice(index.versions.indexOf(doomed), 1);
            }

            await writeIndex(chatId, index);
            // The working dir is now captured by this snapshot (this chat's —
            // the snapshot may belong to a chat the user has since left) — but
            // only if nothing edited it since the copy began. A newer turn's
            // edits stay marked un-snapshotted until their own checkpoint lands.
            if ((_mutationGen.get(chatId) || 0) === genAtCopy) clearDirty(chatId);
            renderVersionsPanelIfOpen();

            // Remove the pruned snapshots' files only AFTER the index that drops
            // them is on disk. Deleting first meant a failed index write left the
            // on-disk index listing versions whose files were already gone (a
            // Restore on one hit "files are missing") while the snapshot just
            // taken — whose directory exists — was invisible. A leftover
            // directory behind an index that no longer lists it is harmless.
            for (const doomed of pruned) {
                try {
                    await puter.fs.delete(root + '/' + doomed.id, { recursive: true });
                } catch (e) { /* best effort */ }
            }

            // Upgrade the auto-derived label to a concise AI description in the
            // background. The snapshot (with its fallback label) is already
            // durable and visible, so this never blocks the restore point or the
            // panel; it just rewrites the label a moment later when the model
            // responds. generateVersionLabel lives in app.js (it owns the model +
            // text helpers); a failure leaves the fallback label in place.
            if (opts.aiContext && typeof window.generateVersionLabel === 'function') {
                Promise.resolve(window.generateVersionLabel(opts.aiContext))
                    .then(function (aiLabel) { if (aiLabel) relabelVersion(chatId, versionId, aiLabel); })
                    .catch(function () { /* keep the fallback label */ });
            }
            return versionId;
        } catch (e) {
            console.warn('createProjectVersion failed:', e);
            // A failed snapshot means no restore point exists for this turn's
            // changes, yet the user believes one does. Surface it (throttled) so
            // "you can always go back" isn't a silent lie. _projectDirtySinceSnapshot
            // stays true, so a subsequent restore still captures a safety snapshot.
            window.showToast?.("Couldn't save a restore point for these changes — you may not be able to revert them.",
                { type: 'warning', key: 'snapshot-failed', throttleMs: 15000 });
            return null;
        }
    }

    // Rewrite a single snapshot's label after the fact (used by the background AI
    // labelling above). Routed through snapshotChain so it can never lost-update
    // index.json against a concurrent snapshot, and re-renders only when the
    // panel belongs to the chat being relabelled.
    function relabelVersion(chatId, versionId, label) {
        snapshotChain = snapshotChain.catch(function () {}).then(async function () {
            try {
                const index = await readIndex(chatId);
                const v = (index.versions || []).find(function (x) { return x.id === versionId; });
                if (!v) return;
                const clean = labelFromText(label);
                if (!clean || clean === v.label) return;
                v.label = clean;
                await writeIndex(chatId, index);
                if (chatId === currentChatId) renderVersionsPanelIfOpen();
            } catch (e) {
                console.warn('relabelVersion failed:', e);
            }
        });
        return snapshotChain;
    }

    // Queue a snapshot. Returns the chain so a caller MAY await it, but the
    // intended use at end-of-turn is fire-and-forget (do not block the UI).
    window.createProjectVersion = function (opts) {
        snapshotChain = snapshotChain.catch(() => {}).then(() => performCreateVersion(opts));
        return snapshotChain;
    };

    // Remove all snapshots for a chat (called when the chat is deleted).
    window.deleteChatVersions = async function (chatId) {
        if (!chatId || !window.user) return;
        indexCache.delete(chatId);
        // Don't keep a deleted project in the durable un-snapshotted record.
        _dirtyChats.delete(chatId);
        _knownClean.delete(chatId);
        _mutationGen.delete(chatId);
        persistDirty();
        try { await snapshotChain; } catch (e) { /* ignore */ }
        try {
            await puter.fs.delete(versionsRootForChat(chatId), { recursive: true });
        } catch (e) { /* not found / best effort */ }
    };

    // ----- restore -----------------------------------------------------------

    // Recursively make curDir an exact copy of snapDir. For each snapshot entry:
    // copy files in (overwriting), recurse into directories, and — if a same-name
    // entry exists with a DIFFERENT type (file<->dir changed between versions) —
    // remove the stale entry first so the copy/mkdir lands cleanly. Finally,
    // delete anything in curDir that the snapshot doesn't have, at every level.
    //
    // Files are copied before any same-path deletion in the common (same-type)
    // case, so a copy failure leaves the current files intact and aborts (the
    // caller catches) rather than losing data. readdir(snapDir) throwing also
    // aborts.
    //
    // A failed deletion does not abort the walk — the rest of the snapshot must
    // still land — but it is NOT harmless either: a file the chosen version
    // deliberately removed can be a live route, a script the restored page
    // loads, or an asset that leaves the app matching neither version. Collect
    // those paths and return them so the caller can report a partial restore
    // instead of announcing a version the directory does not match.
    async function restoreDirFromSnapshot(curDir, snapDir, leftovers) {
        leftovers = leftovers || [];
        const snapItems = await puter.fs.readdir(snapDir);
        let curItems = [];
        try { curItems = await puter.fs.readdir(curDir); } catch (e) { curItems = []; }
        const curByName = new Map(curItems.map(it => [it.name, it]));
        const snapByName = new Map(snapItems.map(it => [it.name, it]));

        for (const snapItem of snapItems) {
            const dest = curDir + '/' + snapItem.name;
            const cur = curByName.get(snapItem.name);
            // Same name but different type → remove the stale entry first.
            if (cur && cur.is_dir !== snapItem.is_dir) {
                await lockedFs(dest, () => puter.fs.delete(dest, { recursive: true }));
            }
            if (snapItem.is_dir) {
                if (!cur || cur.is_dir !== true) {
                    try { await puter.fs.mkdir(dest); } catch (e) { /* may already exist */ }
                }
                await restoreDirFromSnapshot(dest, snapDir + '/' + snapItem.name, leftovers);
            } else {
                await lockedFs(dest, () => puter.fs.copy(snapDir + '/' + snapItem.name, curDir, { overwrite: true }));
                // Record the restored file so the preview can verify it has
                // propagated to the live site before reloading.
                window.recordPreviewChange?.(dest);
            }
        }

        // Remove entries that the snapshot doesn't contain.
        for (const curItem of curItems) {
            if (!snapByName.has(curItem.name)) {
                const stale = curDir + '/' + curItem.name;
                try {
                    await lockedFs(stale, () => puter.fs.delete(stale, { recursive: true }));
                } catch (e) {
                    console.warn('Restore prune: failed to remove', curItem.name, e);
                    leftovers.push(curItem.name);
                }
            }
        }
        return leftovers;
    }

    // Every write a restore makes into the app dir goes through the per-path
    // write lock, like every other app-dir writer (see window.withFileLock).
    // A restore is only ever started between turns, but the preview refresh
    // that follows a turn keeps writing in the background for a while after
    // the turn ends: applyPreviewCacheBust and ensureAppManifest each hold a
    // page's lock across a read → rewrite → write. An unlocked restore copy
    // landing inside that gap was then overwritten by the stamper's stale
    // buffer — the restored page silently reverted to the pre-restore
    // version while the version panel said the restore had succeeded.
    function lockedFs(path, fn) {
        return typeof window.withFileLock === 'function' ? window.withFileLock(path, fn) : fn();
    }

    async function restoreVersion(versionId, opts) {
        opts = opts || {};
        if (typeof isProcessing !== 'undefined' && isProcessing) {
            await puter.ui.alert('Please wait for the current task to finish before restoring a version.');
            return;
        }
        // A publish of this project is copying the working files into its
        // release right now. Restoring would rewrite them mid-copy — the public
        // site would get a mix of two versions, and the snapshot the publish
        // records as its baseline would describe the restored files instead of
        // the published ones.
        if (window.isPublishInFlight?.(openChatId())) {
            await puter.ui.alert('Please wait for publishing to finish before restoring a version.');
            return;
        }
        // Ignore re-entrant clicks while a restore is already running.
        if (window._restoringVersion) return;

        // Arm the guard BEFORE the confirm dialog. Sends and auto error-fix turns
        // both check window._restoringVersion, so this closes the confirm-window
        // race where a concurrent turn could mutate files / lost-update index.json.
        window._restoringVersion = true;
        // Reflect the block in an open Publish popover (its action becomes an
        // inline "finishing…" row); the finally re-enables it when we're done.
        window.refreshPublishButton?.();
        // Same for an open Issues panel: its send actions are blocked while a
        // restore is rewriting the project files.
        window.refreshIssuesSendState?.();
        // Capture the chat this restore targets. The user can still navigate to
        // another chat during the (async) restore; we use the captured values for
        // the file work and skip UI/history side-effects if the context changed.
        const chatId = currentChatId;
        const appDir = currentAppDir;
        try {
            // Let any in-flight background snapshot finish first, so we read the
            // index and mutate files against a consistent, fully-written state.
            try { await snapshotChain; } catch (e) { /* ignore */ }

            // Throws if the index can't be read — the catch below reports it and
            // no project file has been touched yet, which is the safe outcome.
            let index = await readIndex(chatId);
            const version = index.versions.find(v => v.id === versionId);
            if (!version) {
                await puter.ui.alert('That version could not be found.');
                return;
            }
            if (version.id === index.current) return; // already the live version

            // Undo/redo intentionally skip the confirm dialog: they must stay
            // one-click to be useful, and the pre-restore safety snapshot below
            // makes them genuinely reversible (the opposite button — or that
            // safety snapshot — always recovers the prior state), so a misclick
            // is never destructive. Adding a confirm here would defeat the point.
            if (!opts.skipConfirm) {
                const ok = await puterConfirm('Restore the project to this version? Your current files will be replaced — a restore point is saved first, so you can switch back.');
                if (!ok) return;
            }

            $('.preview-versions-panel .version-restore, .preview-undo, .preview-redo').prop('disabled', true);

            const snapDir = versionsRootForChat(chatId) + '/' + versionId;
            // Verify the snapshot's files still exist (nicer message than a raw
            // copy failure).
            try {
                await puter.fs.stat(snapDir);
            } catch (e) {
                await puter.ui.alert("This version's files are missing and cannot be restored.");
                return;
            }

            // Give BOTH surfaces instant feedback up front (the file copy below
            // can take a while): show the preview overlay, and optimistically move
            // the menu's highlight to the chosen version right now — rendered from
            // the in-memory index, no FS read. The authoritative re-render happens
            // after the files are written; a failure reverts it.
            if (currentChatId === chatId && typeof window.showPreviewUpdating === 'function') {
                window.showPreviewUpdating(true);
            }
            if (currentChatId === chatId && panelOpen) {
                renderVersionsPanel({ versions: index.versions, current: versionId });
            }

            // Safety net: if the working dir has changes NOT yet captured by a
            // snapshot — an interrupted/Stopped turn, or a failed end-of-turn
            // snapshot (see the toast above) — capture them NOW, before we
            // overwrite the dir, so the pre-restore state is always recoverable.
            // This is what makes the confirm copy ("a restore point is saved
            // first") true and undo/redo non-destructive. In the common case the
            // working dir already matches a snapshot (clean), so this is skipped
            // and undo/redo's linear pointer model is untouched. The record is
            // mirrored into localStorage, so edits left un-snapshotted by a
            // reload or a crash are still covered in the next session.
            // Asked for the chat this restore targets, not the one on screen:
            // the awaits above (the snapshot chain, the index read, the confirm
            // dialog, the snapshot stat) all give the user time to open another
            // project, and the answer for THAT project says nothing about the
            // files we are about to overwrite. A dirty A restored while a clean
            // B was open used to skip its safety snapshot entirely.
            if (isChatDirty(chatId)) {
                // protect: the cap prune inside must never retire the
                // version we are about to restore from (see versionsToPrune).
                // createProjectVersion never throws; it resolves null when the
                // snapshot could not be taken. That null MUST abort the restore:
                // proceeding would overwrite (and delete) the un-snapshotted work
                // with no copy anywhere, and then clear the dirty flag so no later
                // restore would try again either — irreversible data loss behind
                // a dialog that just promised "a restore point is saved first".
                // Nothing in the project dir has been touched yet, and the dirty
                // flag stays set, so the next attempt takes the snapshot again.
                const saved = await window.createProjectVersion({ chatId, appDir, label: 'Before restore', protect: versionId });
                if (!saved) {
                    throw new Error("Couldn't save a restore point for your current files, so nothing was changed. Try again in a moment.");
                }
            }

            // Reconcile the working dir to exactly match the snapshot. The app dir
            // itself is never removed, so the path-bound hosting connection is
            // preserved.
            // The working dir matches no version we can name. Leaving
            // index.current on the previous version rendered that row as
            // "Current" with no Restore button — the one version the user most
            // wants to put back was the one they could not — and told the
            // publish state the baseline still matched. Drop the pointer (the
            // unknown state every reader already handles: every row offers
            // Restore) and flag the dir dirty so a later restore still takes its
            // safety snapshot. A snapshotChain link, like the success path's
            // write.
            const markDirUnknown = async function () {
                try {
                    await (snapshotChain = snapshotChain.catch(function () {}).then(async function () {
                        const idx = (await readIndexForDisplay(chatId)) || index;
                        idx.current = null;
                        await writeIndex(chatId, idx);
                    }));
                } catch (e2) { /* best effort — the alert still fires */ }
                markDirty(chatId);
                window.invalidateAppManifestCache?.(appDir);
            };

            let leftovers = [];
            try {
                leftovers = await restoreDirFromSnapshot(appDir, snapDir);
            } catch (e) {
                // A copy failure aborts the walk, but the files copied before it
                // already landed: the working dir is now a mix of two snapshots
                // and matches NEITHER.
                await markDirUnknown();
                throw e;
            }
            if (leftovers.length) {
                // Every snapshot file landed, but files this version does not
                // contain are still there, so the directory is a superset of the
                // version — not the version. Say so instead of marking it
                // Current, and leave the state retryable.
                await markDirUnknown();
                const names = leftovers.slice(0, 3).join(', ') + (leftovers.length > 3 ? '…' : '');
                const partial = new Error(`Your project was restored, but files this version doesn't have could not be removed (${names}) — so it doesn't fully match this version yet. Try restoring again in a moment.`);
                // Reported as-is: "Restore failed" would misdescribe it, since
                // every file of the chosen version did land.
                partial.partialRestore = true;
                throw partial;
            }
            // The whole directory just changed underneath the manifest generator,
            // so its "nothing changed since last time" cache no longer describes
            // what is on disk (the restored snapshot may predate the manifest, or
            // carry a different title/icon). Drop it so the refresh below
            // regenerates from the restored files. See js/manifest.js.
            window.invalidateAppManifestCache?.(appDir);

            // Re-read the index immediately before writing so we never clobber a
            // concurrently-written index (defensive; the guard should prevent it).
            // This read also picks up the safety snapshot taken just above.
            // The files are ALREADY restored here, so a read failure must not
            // abort: fall back to the last known-good index (the cache, which
            // writeIndex keeps current — safety snapshot included) and, failing
            // that, to the index read at the top of this restore. Never to an
            // empty one, which would erase the history we just restored from.
            // Run this final read-modify-write as a snapshotChain link. The
            // initial await of the chain at the top of this restore predates the
            // background AI relabel of the last turn's snapshot (relabelVersion,
            // queued only when the label arrives seconds later): that relabel
            // read the index while the files were still copying and wrote it
            // back — current = the pre-restore version — AFTER this write, so
            // disk and cache claimed the working dir matched a version it no
            // longer did (wrong "Current" row, wrong publish baseline, the live
            // version with no Restore button). Chained, a relabel already queued
            // runs first and the read below sees its label; one queued later
            // sees our current pointer.
            const fallbackIndex = index;
            await (snapshotChain = snapshotChain.catch(function () {}).then(async function () {
                index = (await readIndexForDisplay(chatId)) || fallbackIndex;
                index.current = versionId;
                await writeIndex(chatId, index);
            }));
            // The working dir now exactly matches versionId's snapshot.
            clearDirty(chatId);

            // Only touch UI/conversation state if we're still on the chat we
            // restored — a mid-restore chat switch must not redirect the preview
            // reload, the note, or the panel to a different project.
            if (currentChatId === chatId) {
                // Reload the live preview so the restored files are shown, after
                // waiting for the restored files to propagate to the CDN.
                if (typeof window.refreshPreviewWhenReady === 'function') {
                    window.refreshPreviewWhenReady();
                } else if (typeof reloadPreviewFrame === 'function') {
                    reloadPreviewFrame(window.currentPreviewUrl || undefined);
                }

                // Leave a note in the conversation so the model's context stays
                // coherent about the revert, and so it survives a chat reload.
                // Strip HTML/markdown-active characters from the label since this
                // string is rendered through the markdown pipeline.
                const safeLabel = (version.label || '').replace(/[<>`*_\[\]()!]/g, '').trim();
                const note = `*Restored the project to an earlier version${safeLabel ? ` ("${safeLabel}")` : ''}.*`;
                if (typeof chatHistory !== 'undefined' && Array.isArray(chatHistory)) {
                    const messageId = (typeof generateMessageId === 'function') ? generateMessageId() : null;
                    chatHistory.push({ role: 'assistant', content: note, messageId });
                    if (typeof appendMessage === 'function') appendMessage(note, false);
                    try {
                        if (typeof saveCurrentChat === 'function') {
                            saveCurrentChat({ currentChatId: chatId, chatHistory: chatHistory });
                        }
                    } catch (e) { /* non-fatal */ }
                }

                // Authoritative re-render from the in-memory index we just wrote
                // (no extra FS read). The optimistic render above already moved the
                // highlight, so this is usually a no-op-looking confirm.
                if (panelOpen) renderVersionsPanel(index);
            }
        } catch (e) {
            console.error('Restore failed:', e);
            // Clear the overlay on failure (the success path hands it off to
            // refreshPreviewWhenReady, which hides it after the reload).
            if (typeof window.showPreviewUpdating === 'function') window.showPreviewUpdating(false);
            // Revert the optimistic highlight to the true persisted state.
            renderVersionsPanelIfOpen();
            await puter.ui.alert((e && e.partialRestore ? '' : 'Restore failed: ') + (e.message || e));
        } finally {
            window._restoringVersion = false;
            $('.preview-versions-panel .version-restore').prop('disabled', false);
            // Re-enable publishing now the restore is done (swaps the inline
            // "finishing…" row back to the Publish button in an open popover).
            window.refreshPublishButton?.();
            // Un-grey the Issues panel's send actions too.
            window.refreshIssuesSendState?.();
            // Recompute undo/redo from the cached index (writeIndex updated it on
            // success; on failure/cancel this restores the pre-restore state).
            updateVersionNavButtons();
        }
    }

    // ----- undo/redo toolbar navigation --------------------------------------

    // The versions array is chronological (snapshots are appended) and
    // index.current points at the version the working dir matches. Undo/redo
    // simply step that pointer to the previous/next snapshot in the list.
    function adjacentVersionIds(index) {
        const versions = (index && index.versions) || [];
        if (versions.length === 0) return { undoId: null, redoId: null };
        const i = versions.findIndex(v => v.id === (index.current || null));
        if (i === -1) {
            // No (or unknown) current pointer — legacy index. The working dir
            // normally matches the newest snapshot; offer it as the undo target
            // so one click safely re-establishes the pointer.
            return { undoId: versions[versions.length - 1].id, redoId: null };
        }
        return {
            undoId: i > 0 ? versions[i - 1].id : null,
            redoId: i < versions.length - 1 ? versions[i + 1].id : null,
        };
    }

    // Enable/disable the toolbar undo/redo buttons from an index. With no index
    // given, falls back to the cached index of the current chat (no FS read), so
    // a cache miss renders both disabled rather than stale state from another chat.
    function updateVersionNavButtons(index) {
        const $btns = $('.preview-undo, .preview-redo');
        if (!$btns.length) return;
        if (!index) index = currentChatId ? indexCache.get(currentChatId) : null;
        const { undoId, redoId } = adjacentVersionIds(index);
        $('.preview-undo').prop('disabled', !undoId || !!window._restoringVersion);
        $('.preview-redo').prop('disabled', !redoId || !!window._restoringVersion);
    }

    // Called by showAppPreview whenever the preview pane is (re)shown, so the
    // buttons always reflect the chat the preview belongs to.
    window.updateVersionNavButtons = function () {
        updateVersionNavButtons();
        // First time we see this chat in the session: fetch the index in the
        // background; readIndex refreshes the buttons when it lands. Uses the
        // non-throwing wrapper — this is unawaited, so a read failure would
        // otherwise surface as an unhandled rejection.
        if (currentChatId && !indexCache.has(currentChatId)) readIndexForDisplay(currentChatId);
    };

    // ----- panel UI ----------------------------------------------------------

    // Tracks open/closed intent synchronously. The panel is appended to the DOM
    // only after an async readIndex, so we cannot rely on DOM presence to decide
    // open-vs-close in the (synchronous) toggle handler.
    let panelOpen = false;

    // ----- keyboard navigation -----------------------------------------------
    // The version id that currently holds keyboard focus (the roving-tabindex
    // "active option" of the listbox). Reset whenever the panel closes so a fresh
    // open defaults focus to the live version. Survives the panel's frequent
    // re-renders (relabel, restore) so arrow-key navigation isn't reset under the
    // user; renderVersionsPanel re-applies it to the rebuilt DOM.
    let focusedVersionId = null;

    // Pick which row should be focusable on (re)render: keep the user's current
    // keyboard position if it's still in the list, else default to the live
    // version, else the newest snapshot.
    function resolveFocusId(index) {
        const versions = (index && index.versions) || [];
        if (focusedVersionId && versions.some(v => v.id === focusedVersionId)) return focusedVersionId;
        if (index && index.current && versions.some(v => v.id === index.current)) return index.current;
        return versions.length ? versions[versions.length - 1].id : null; // newest
    }

    // Move keyboard focus to a row: update the roving tabindex / aria-selected
    // across all rows, focus the element, and scroll it into view.
    function setFocusedItem(el) {
        if (!el) return;
        focusedVersionId = el.getAttribute('data-version-id');
        $('.preview-versions-panel .version-item').attr({ tabindex: '-1', 'aria-selected': 'false' });
        el.setAttribute('tabindex', '0');
        el.setAttribute('aria-selected', 'true');
        el.focus();
        if (el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }

    // Focus the active row (or the close button when there are no rows, so Escape
    // still has somewhere to fire from). Called on a genuine open and after a
    // re-render that happened while the panel held focus.
    function focusActiveItem() {
        const items = $('.preview-versions-panel .version-item').toArray();
        if (!items.length) {
            $('.preview-versions-panel .versions-panel-close').trigger('focus');
            return;
        }
        const el = items.find(x => x.getAttribute('data-version-id') === focusedVersionId) || items[0];
        setFocusedItem(el);
    }

    // Build and (re)mount the panel from an in-memory index object — pure and
    // synchronous (no FS read), so callers can update the highlight instantly.
    function renderVersionsPanel(index) {
        const versions = (index && index.versions) || [];
        const current = index && index.current;
        const ordered = versions.slice().reverse(); // newest first
        // The one row that's tab-focusable (roving tabindex); arrow keys move it.
        const activeId = resolveFocusId(index);

        let html = '<div class="preview-versions-panel">';
        html += '<div class="versions-panel-header"><span>Version history</span>';
        html += `<button class="versions-panel-close" title="Close">${window.cross_svg}</button></div>`;

        if (ordered.length === 0) {
            html += '<div class="versions-empty">No versions yet. Snapshots are saved automatically as the app is built and changed.</div>';
        } else {
            html += '<div class="versions-list" role="listbox" aria-label="Version history">';
            ordered.forEach((v, i) => {
                const isCurrent = v.id === current;
                const isActive = v.id === activeId;
                const num = versions.length - i;
                const label = v.label ? htmlEscape(v.label) : 'Update';
                const time = htmlEscape(formatRelativeTime(v.createdAt));
                // role=option + roving tabindex: only the active row is in the tab
                // order (tabindex 0); arrows move focus between rows, Enter restores.
                html += `<div class="version-item${isCurrent ? ' current' : ''}" data-version-id="${htmlEscape(v.id)}" role="option" tabindex="${isActive ? '0' : '-1'}" aria-selected="${isActive ? 'true' : 'false'}">`;
                html += `<div class="version-info">`;
                html += `<div class="version-label" title="${label}">${label}</div>`;
                html += `<div class="version-meta">Version ${num} · ${time}</div>`;
                html += `</div>`;
                // The restore button stays mouse-clickable but is removed from the
                // tab order (tabindex -1): keyboard users activate the focused row
                // with Enter instead, so Tab isn't cluttered with a stop per row.
                html += isCurrent
                    ? `<span class="version-current-badge">Current</span>`
                    : `<button class="version-restore" data-version-id="${htmlEscape(v.id)}" tabindex="-1">Restore</button>`;
                html += `</div>`;
            });
            html += '</div>';
        }
        html += '</div>';

        // Preserve keyboard focus across the rebuild: if a row in the old panel
        // held focus, move focus to the active row of the new one (otherwise a
        // background relabel/restore re-render would drop the user out of the list).
        const $old = $('.preview-versions-panel');
        const hadFocus = $old.length > 0 && $old[0].contains(document.activeElement);
        $old.remove();
        $('.preview-pane').append(html);
        // Renders rebuild the panel element, so the caret offset (an inline CSS
        // var pointing at the toolbar button) must be re-applied every time.
        window.positionPanelCaret?.('.preview-versions-panel', '.preview-versions');
        // Keep restore buttons disabled while a restore is in flight.
        if (window._restoringVersion) {
            $('.preview-versions-panel .version-restore').prop('disabled', true);
        }
        if (hadFocus) focusActiveItem();
    }

    // Render just the panel chrome with a transient "Loading…" body. Used only on
    // the very first open of a chat (nothing cached yet) so the panel appears
    // instantly instead of after the network read returns.
    function renderVersionsLoading() {
        let html = '<div class="preview-versions-panel">';
        html += '<div class="versions-panel-header"><span>Version history</span>';
        html += `<button class="versions-panel-close" title="Close">${window.cross_svg}</button></div>`;
        html += '<div class="versions-empty">Loading…</div>';
        html += '</div>';
        $('.preview-versions-panel').remove();
        $('.preview-pane').append(html);
        window.positionPanelCaret?.('.preview-versions-panel', '.preview-versions');
    }

    // Shown when the index couldn't be read and nothing was cached. Deliberately
    // distinct from the empty state ("No versions yet"): the snapshots may well
    // exist, we just don't know, and implying they're gone would be a lie.
    function renderVersionsUnavailable() {
        let html = '<div class="preview-versions-panel">';
        html += '<div class="versions-panel-header"><span>Version history</span>';
        html += `<button class="versions-panel-close" title="Close">${window.cross_svg}</button></div>`;
        html += '<div class="versions-empty">Couldn\'t load version history. Check your connection and reopen this panel.</div>';
        html += '</div>';
        $('.preview-versions-panel').remove();
        $('.preview-pane').append(html);
        window.positionPanelCaret?.('.preview-versions-panel', '.preview-versions');
    }

    // opts.focus: move keyboard focus into the panel after it paints. Set on a
    // genuine open (toggle button / keyboard) but NOT on the refresh-in-place that
    // renderVersionsPanelIfOpen does, so a background relabel doesn't yank focus.
    async function openVersionsPanel(opts) {
        if (!window.user) return;
        // Only one toolbar popover open at a time — close the publish/share/
        // issues/device popovers if showing (each closes this one symmetrically
        // when it opens).
        window.closePublishPanel?.();
        window.closeSharePanel?.();
        window.closeIssuesPanel?.();
        window.closeDevicePanel?.();
        const wantFocus = !!(opts && opts.focus);
        panelOpen = true;
        // Drives the toolbar button's held "open" look (see styles.css).
        $('.preview-versions').attr('aria-expanded', 'true');
        const chatId = currentChatId;

        // Paint immediately so opening feels instant: from the cached index if we
        // have one (the common case — you've been working in this chat), else a
        // lightweight loading state. The authoritative read runs below.
        const cached = indexCache.get(chatId);
        if (cached) {
            renderVersionsPanel(cached);
            if (wantFocus) focusActiveItem();
        } else {
            renderVersionsLoading();
        }

        const index = await readIndexForDisplay(chatId);
        // A close or chat switch may have happened during the await; honor it and
        // don't stomp on a panel that now belongs to a different chat.
        if (!panelOpen || currentChatId !== chatId) return;
        // The read failed and there was nothing cached to fall back on. Say so:
        // rendering an empty list here would claim this project has no versions,
        // which is exactly the false impression that must never be given.
        if (!index) {
            renderVersionsUnavailable();
            return;
        }
        // Re-render only if the list actually changed since the instant paint, so
        // a cache hit doesn't trigger a needless DOM swap (and scroll reset).
        if (!cached || indexSignature(cached) !== indexSignature(index)) {
            renderVersionsPanel(index);
            // No cache meant we showed the loading chrome (unfocusable); move focus
            // in now that the real rows exist. With a cache, renderVersionsPanel
            // already preserved focus if the panel held it.
            if (wantFocus && !cached) focusActiveItem();
        }
    }

    function closeVersionsPanel() {
        panelOpen = false;
        focusedVersionId = null;
        $('.preview-versions').attr('aria-expanded', 'false');
        $('.preview-versions-panel').remove();
    }
    // Exposed so chat-context changes (new_chat / loadChat / hideAppPreview) can
    // close a panel that would otherwise linger in the persistent preview pane
    // and act on the wrong chat.
    window.closeVersionsPanel = closeVersionsPanel;

    function renderVersionsPanelIfOpen() {
        if (panelOpen) {
            openVersionsPanel();
        }
    }

    // ----- event wiring ------------------------------------------------------

    // Toggle the panel from the toolbar button.
    $(document).on('click', '.preview-versions', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (panelOpen) {
            closeVersionsPanel();
        } else {
            openVersionsPanel({ focus: true });
        }
    });

    // Keyboard navigation within the open panel (a listbox). Bound on the panel so
    // it only fires while a row (or the close button) inside it holds focus —
    // arrow keys elsewhere (e.g. the chat input) are untouched.
    //   ↑/↓        move focus between snapshots
    //   Home/End   jump to newest / oldest
    //   Enter/Space restore the focused snapshot (no-op on the live one)
    //   Escape     close the panel and return focus to its toolbar button
    $(document).on('keydown', '.preview-versions-panel', function (e) {
        if (!panelOpen) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            closeVersionsPanel();
            $('.preview-versions').trigger('focus'); // return focus to the trigger
            return;
        }

        // Navigation/restore keys act only when a row is focused (the close button
        // keeps its own native Enter/Space = close behaviour).
        if (!$(e.target).hasClass('version-item')) return;

        const items = $('.preview-versions-panel .version-item').toArray();
        if (!items.length) return;
        let idx = items.findIndex(el => el.getAttribute('data-version-id') === focusedVersionId);
        if (idx < 0) idx = 0;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedItem(items[Math.min(items.length - 1, idx + 1)]);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedItem(items[Math.max(0, idx - 1)]);
                break;
            case 'Home':
                e.preventDefault();
                setFocusedItem(items[0]);
                break;
            case 'End':
                e.preventDefault();
                setFocusedItem(items[items.length - 1]);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                // restoreVersion no-ops on the live version and guards re-entrancy.
                if (focusedVersionId) restoreVersion(focusedVersionId);
                break;
        }
    });

    $(document).on('click', '.versions-panel-close', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeVersionsPanel();
    });

    $(document).on('click', '.version-restore', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const versionId = $(this).data('version-id');
        if (versionId) restoreVersion(versionId);
    });

    // Toolbar undo/redo: restore the previous/next version. stopPropagation keeps
    // an open versions panel from being closed by the outside-click handler, so
    // the user can watch the highlight step through history.
    $(document).on('click', '.preview-undo, .preview-redo', async function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!window.FEATURE_FLAGS.undoRedo) return;
        if (window._restoringVersion) return;
        const isUndo = $(this).hasClass('preview-undo');
        // The cached index is what enabled the button; the read is a fallback.
        // Non-throwing: a failed read leaves the buttons inert (adjacentVersionIds
        // yields no target) rather than rejecting inside the click handler.
        const index = indexCache.get(currentChatId) || await readIndexForDisplay(currentChatId);
        const { undoId, redoId } = adjacentVersionIds(index);
        const targetId = isUndo ? undoId : redoId;
        if (targetId) restoreVersion(targetId, { skipConfirm: true });
    });

    // Close the panel when clicking outside of it (but not on the toggle button).
    $(document).on('click', function (e) {
        if (!panelOpen) return;
        const $t = $(e.target);
        if ($t.closest('.preview-versions-panel').length) return;
        if ($t.closest('.preview-versions').length) return;
        closeVersionsPanel();
    });
})();
