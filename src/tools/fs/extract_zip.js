// ExtractZip — unpack a .zip archive that is in the project into a folder of
// the project. A zip the user attaches is saved to assets/ like any other
// attachment (sendChatMessage in app.js), and the note on their message lists
// what is inside (zipAttachmentSummary below). The model picks the folder from
// what the user asked for: the working directory itself to start from, or
// carry on with, the project the archive holds (one the user downloaded from
// Builder and changed on their own computer, or brought over from another
// account), or a folder under assets/ to use the files in it.
//
// Every entry's path goes through assertPathInProject like any tool path, and
// one with a ".." segment is refused outright, so an archive can't write
// outside the project. System junk (macOS's __MACOSX/ and ._ files,
// .DS_Store, Thumbs.db) and the folders Builder keeps out of a project's
// download (Git's, Puter's) are left out. The pure helpers live on
// window.__extractZipInternals for scripts/test-extract-zip.mjs.
window.__extractZipInternals = (function () {
    // An archive over either limit is refused before anything is written.
    // Attachments cap a zip at 25MB (dragdrop.js); these bound what one
    // unpacks to, so a zip bomb can't fill the user's storage or the tab.
    const limits = {
        maxFiles: 2000,
        maxBytes: 200 * 1024 * 1024,
    };
    // How many paths a result lists for the model, and a note on the message.
    const LIST_LIMIT = 150;
    const SUMMARY_LIMIT = 25;

    const JUNK_RE = /(?:^|\/)(?:__MACOSX|\.git|\.puter|\.DS_Store|Thumbs\.db|desktop\.ini|\._[^/]*|__deploy_[^/]*\.png)(?:\/|$)/i;

    // An entry's path relative to the folder it unpacks into, or null when it
    // has none or can't be used safely. Backslashes, a drive letter and a
    // leading slash are made relative; a ".." segment anywhere refuses it.
    function entryPath(name) {
        const segs = String(name == null ? '' : name).replace(/\\/g, '/').replace(/^[A-Za-z]:(?=\/|$)/, '').split('/');
        const out = [];
        for (const s of segs) {
            if (s === '' || s === '.') continue;
            if (s === '..') return null;
            out.push(s);
        }
        return out.length ? out.join('/') : null;
    }

    function isJunk(rel) { return JUNK_RE.test(String(rel || '')); }

    // The folder every file sits in (my-site/ of my-site/index.html), or ''
    // when the files don't share one. A zip made by right-clicking a folder,
    // or downloaded from GitHub, wraps everything in one like that.
    function sharedTopFolder(rels) {
        if (!rels.length) return '';
        const first = rels[0].split('/')[0];
        for (const r of rels) {
            const cut = r.indexOf('/');
            if (cut <= 0 || r.slice(0, cut) !== first) return '';
        }
        return first;
    }

    // The entries of a loaded JSZip archive: { name, dir, size, file }. The
    // size is what the archive's directory says the entry unpacks to.
    function entriesOf(zip) {
        const out = [];
        zip.forEach(function (_rel, file) {
            const size = file && file._data && typeof file._data.uncompressedSize === 'number' ? file._data.uncompressedSize : 0;
            out.push({ name: file.name, dir: !!file.dir, size, file });
        });
        return out;
    }

    // What unpacking `entries` writes: the files with their paths relative to
    // the destination, what was left out, and the folder dropped from the
    // front of every path ('' for none).
    function plan(entries, opts) {
        const stripTopFolder = !opts || opts.stripTopFolder !== false;
        const kept = [];
        const skipped = { junk: 0, unsafe: [] };
        for (const e of entries) {
            if (!e || e.dir) continue;
            const rel = entryPath(e.name);
            if (!rel) { skipped.unsafe.push(String(e.name)); continue; }
            if (isJunk(rel)) { skipped.junk++; continue; }
            kept.push({ name: e.name, rel, size: e.size || 0, file: e.file });
        }
        const stripped = stripTopFolder ? sharedTopFolder(kept.map(f => f.rel)) : '';
        if (stripped) for (const f of kept) f.rel = f.rel.slice(stripped.length + 1);
        const totalBytes = kept.reduce((n, f) => n + f.size, 0);
        return { files: kept, skipped, stripped, totalBytes };
    }

    async function openZip(data) {
        const Zip = window.JSZip || (typeof JSZip !== 'undefined' ? JSZip : null);
        if (!Zip) throw new Error("Builder can't open zip archives right now. Tell the user, and do not retry.");
        const bytes = data && typeof data.arrayBuffer === 'function' ? await data.arrayBuffer() : data;
        try {
            return await Zip.loadAsync(bytes);
        } catch (e) {
            const why = e && e.message ? ` (${e.message})` : '';
            throw new Error(`The file couldn't be opened as a zip archive${why}. It may be damaged, password-protected, or another kind of archive (.rar, .7z, .tar.gz), which ExtractZip can't open. Do not retry; tell the user and ask for a plain .zip.`);
        }
    }

    // What a zip the user attached holds, for the note on their message:
    // { count, stripped, paths, more } with paths relative to the folder
    // ExtractZip would drop, or null when it can't be read.
    async function summarize(data) {
        try {
            const p = plan(entriesOf(await openZip(data)));
            const paths = p.files.map(f => f.rel);
            return { count: paths.length, stripped: p.stripped, paths: paths.slice(0, SUMMARY_LIMIT), more: Math.max(0, paths.length - SUMMARY_LIMIT) };
        } catch (e) {
            return null;
        }
    }

    // Run fn over items, at most `limit` at a time.
    async function runPool(items, limit, fn) {
        let next = 0;
        async function worker() {
            while (next < items.length) {
                const i = next++;
                await fn(items[i], i);
            }
        }
        const n = Math.min(limit, items.length);
        const workers = [];
        for (let i = 0; i < n; i++) workers.push(worker());
        await Promise.all(workers);
    }

    return { limits, LIST_LIMIT, SUMMARY_LIMIT, entryPath, isJunk, sharedTopFolder, entriesOf, plan, openZip, summarize, runPool };
})();

// The note on a message with a zip attached reads this (app.js).
window.zipAttachmentSummary = function (file) {
    return window.__extractZipInternals.summarize(file);
};

window.tools.push({
    type: "function",
    function: {
        name: "ExtractZip",
        description: "Unpack a .zip archive that is in the project (for example one the user attached, saved under assets/) and write its files into a folder of the project. Choose the folder from what the user asked for: to start from, continue, import or restore the project the archive holds (for example an app they downloaded from Builder and changed on their computer), extract into the working directory itself; to use the files in it (images, data, fonts, …), extract into a folder under assets/. Files already at the same paths are replaced and other files are left alone. When every file sits inside one top-level folder (my-site/index.html), that folder is dropped so its contents land directly in the destination. System junk (__MACOSX, .DS_Store, .git) is skipped, and the archive itself is removed from the project afterwards unless keep_zip is true.",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The .zip file to unpack. Absolute (starts with /) or relative to the working directory (e.g. \"assets/my-app.zip\")."
                },
                destination: {
                    type: "string",
                    description: "The folder to write the files into, absolute or relative to the working directory, created if needed. Leave it out to unpack into the working directory itself, which makes the archive's files the project's files."
                },
                keep_zip: {
                    type: "boolean",
                    description: "Keep the .zip file in the project after unpacking it. Default false: it is removed, so it doesn't ship with the app."
                },
                strip_top_folder: {
                    type: "boolean",
                    description: "Drop the one top-level folder every file sits in, when there is one. Default true."
                }
            },
            required: ["path"],
            additionalProperties: false
        },
        strict: false
    },
    exec: async function (args, state) {
        const I = window.__extractZipInternals;
        args = args || {};
        const root = window.projectRootDir(state);
        const zipPath = window.assertPathInProject(typeof args.path === 'string' ? args.path.trim() : args.path, state);
        const destArg = typeof args.destination === 'string' && args.destination.trim() ? args.destination.trim() : root;
        const dest = window.assertPathInProject(destArg, state, 'destination');
        const stopped = () => !!(window.isAborted?.(state?.abortController) || window.isStaleTurn?.(state));

        let blob;
        try {
            blob = await puter.fs.read(zipPath);
        } catch (e) {
            if (typeof isNotFoundError === 'function' && isNotFoundError(e)) {
                throw new Error(`There is no file at "${zipPath}". Use the path the attachment note gives.`);
            }
            throw e;
        }
        const zip = await I.openZip(blob);
        const p = I.plan(I.entriesOf(zip), { stripTopFolder: args.strip_top_folder !== false });
        if (!p.files.length) {
            throw new Error('The archive has no files to unpack' + (p.skipped.junk || p.skipped.unsafe.length ? ' (only system files or unsafe paths, which are skipped)' : '') + '. Do not retry; tell the user.');
        }
        if (p.files.length > I.limits.maxFiles) {
            throw new Error(`The archive has ${p.files.length} files, more than the ${I.limits.maxFiles} ExtractZip unpacks. Nothing was written. Do not retry; tell the user, and ask for a smaller archive (without node_modules or build output, for example).`);
        }
        if (p.totalBytes > I.limits.maxBytes) {
            const mb = (n) => Math.round(n / (1024 * 1024));
            throw new Error(`The archive unpacks to about ${mb(p.totalBytes)}MB, more than the ${mb(I.limits.maxBytes)}MB ExtractZip writes. Nothing was written. Do not retry; tell the user, and ask for a smaller archive.`);
        }
        if (stopped()) throw new Error('Aborted');

        const written = [];
        const failed = [];
        let interrupted = false;
        await I.runPool(p.files, 6, async (f) => {
            if (stopped()) { interrupted = true; return; }
            const abs = window.assertPathInProject(dest + '/' + f.rel, state, 'archive entry');
            try {
                const data = await f.file.async('blob');
                // The same lock every writer of a file takes, so the preview's
                // background cache-bust can't write a stale copy over this one.
                // Parents are created on the way, and a write that loses a race
                // to create the same folder gets one more try.
                const write = () => puter.fs.write(abs, data, { createMissingParents: true });
                await window.withFileLock(abs, async () => {
                    try { await write(); }
                    catch (e) { await new Promise(r => setTimeout(r, 300)); await write(); }
                });
                written.push(abs);
            } catch (e) {
                failed.push({ path: abs, error: (e && (e.message || e.error?.message)) || String(e) });
            }
        });
        if (written.length) window.schedulePreviewRefresh?.();
        if (!written.length) {
            if (interrupted) throw new Error('Aborted');
            throw new Error(`None of the archive's files could be written (${failed[0] ? failed[0].error : 'unknown error'}). Tell the user.`);
        }

        // The archive goes once every file is out, so it doesn't ship with the
        // app or sit in every version. Not when unpacking wrote over it.
        let zipRemoved = false;
        if (!args.keep_zip && !failed.length && !interrupted && written.indexOf(zipPath) === -1) {
            try {
                await window.withFileLock(zipPath, () => puter.fs.delete(zipPath));
                zipRemoved = true;
            } catch (e) {
                console.warn('ExtractZip: could not remove the archive:', zipPath, e);
            }
        }

        const relToRoot = (abs) => abs === root ? '' : abs.slice(root.length + 1);
        const files = written.map(relToRoot).sort();
        const backend = files.filter(r => window.EditorCore ? window.EditorCore.classify(r).backend : /^workers\/[A-Za-z0-9_-]{1,50}\.js$/.test(r));
        const intoRoot = dest === root;

        const out = { success: true, destination: dest, extracted: written.length };
        out.files = files.slice(0, I.LIST_LIMIT);
        if (files.length > I.LIST_LIMIT) out.more_files = files.length - I.LIST_LIMIT;
        if (p.stripped) out.dropped_top_folder = p.stripped;
        if (p.skipped.junk) out.skipped_system_files = p.skipped.junk;
        if (p.skipped.unsafe.length) out.skipped_unsafe_paths = p.skipped.unsafe.slice(0, 20);
        if (failed.length) out.failed = failed.slice(0, 20);
        if (interrupted) out.interrupted = true;
        out.zip_removed = zipRemoved;

        let note = `Unpacked ${written.length} file${written.length === 1 ? '' : 's'} into ${dest}.`;
        if (intoRoot) note += " They are the project's files now: read the ones the user's request touches before changing them, and build on them instead of rewriting the app.";
        note += ' The preview does not show them yet: end the turn with update_preview, after publish_site if this project has no preview yet.';
        if (backend.length) {
            note += ` ${backend.join(', ')} ${backend.length === 1 ? 'is a backend source' : 'are backend sources'} from the archive, not deployed for this project. If the app calls ${backend.length === 1 ? 'that backend' : 'those backends'}, deploy each with create_worker (pass its code; it gets a new name and URL), change the app to call the new URL, then delete the old source file.`;
        }
        if (failed.length) note += ` ${failed.length} file${failed.length === 1 ? '' : 's'} couldn't be written (see failed), so the archive was kept. Tell the user which.`;
        if (interrupted) note += ' The turn was stopped partway, so some files were not unpacked.';
        out.note = note;
        return out;
    }
});
