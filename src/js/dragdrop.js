// Drag and drop for local file attachments (no upload — files stay in memory)

// ---- Drag highlight state ------------------------------------------------
// The composer gets a dashed outline while a file is dragged over the page.
// dragenter/dragleave fire once per element the pointer crosses, so a depth
// counter is what keeps the outline steady while moving between children.
//
// The counter alone is not enough to take it away, because a drag can leave
// this document without ever producing the matching dragleave — most visibly by
// moving into the cross-origin preview iframe, whose drag events are dispatched
// in ITS document, not ours. Drop the file there and we never see a drop event
// either, so the counter stayed positive and the outline was stuck on the
// composer for the rest of the session.
//
// So `dragover` is the real signal: the spec has the browser re-fire it on the
// current target every ~350ms for as long as a drag is over this document, and
// it stops the instant one isn't. Each one re-asserts the outline and re-arms a
// short idle timer that takes it away when they stop arriving. The counter is
// kept for the common case — it removes the outline immediately on a clean
// leave instead of waiting out the timer.
let dragCounter = 0;
let dragIdleTimer = null;
// Comfortably above the ~350ms dragover heartbeat, so a throttled frame can't
// clear the outline mid-drag; the next dragover would re-assert it anyway.
const DRAG_IDLE_MS = 1000;

function setDragHighlight(on) {
    document.querySelector('.chat-input')?.classList.toggle('drag-over', !!on);
}

// A drag is over us right now: show the outline and push the idle deadline out.
function noteDragActivity() {
    setDragHighlight(true);
    if (dragIdleTimer) clearTimeout(dragIdleTimer);
    dragIdleTimer = setTimeout(endDrag, DRAG_IDLE_MS);
}

// The drag is over, however it ended (dropped here, dropped elsewhere, left the
// window, cancelled). Idempotent.
function endDrag() {
    if (dragIdleTimer) { clearTimeout(dragIdleTimer); dragIdleTimer = null; }
    dragCounter = 0;
    setDragHighlight(false);
}

// Every attachment — image, text/data, PDF, or any other file — is saved to the
// project's assets/ directory and pulled in by the model ON DEMAND (images via
// ViewImage, text/data via ReadTextFile, PDFs via ViewDocument); other binary
// files are usable by reference only. Nothing is embedded inline, so many files
// can be attached cheaply (a whole gallery or a folder of data) up to this cap.
const MAX_ATTACHMENTS = 50;

// Per-kind attachment size caps. Nothing is inlined, so these bound how much gets
// written into the project's assets/ and (for the readable kinds) how much a
// single on-demand read can pull into context — not request size. Images stay
// modest (on-demand vision tokens); text/PDF/other are roomier since they're only
// read when the model explicitly chooses to.
const MAX_FILE_SIZE = {
    image: 30 * 1024 * 1024,    // 30 MB
    pdf: 10 * 1024 * 1024,     // 10 MB
    text: 10 * 1024 * 1024,    // 10 MB
    other: 25 * 1024 * 1024,   // 25 MB (audio, video, archives, fonts, …)
};

// Pick the size cap for a file by its classified kind (see classifyAttachment).
function maxSizeForFile(file) {
    return MAX_FILE_SIZE[classifyAttachment(file)] || MAX_FILE_SIZE.other;
}

function formatFileSize(bytes) {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
    return bytes + ' B';
}

// Bounds on how much work a single drop may do, so a misdropped huge directory
// (a home folder, a repo with build output) stays snappy. All three feed one
// "truncated" flag that surfaces a "scan stopped early" notice:
// - FOLDER_SCAN_CAP:   max files collected across the whole drop
// - FOLDER_DIR_BUDGET: max directories entered (a tree of thousands of empty
//                      or junk dirs would otherwise enumerate forever, since
//                      dirs don't count against the file cap)
// - FOLDER_MAX_DEPTH:  max nesting depth (also guards against filesystem
//                      cycles should a browser ever follow symlinks)
const FOLDER_SCAN_CAP = 400;
const FOLDER_DIR_BUDGET = 1000;
const FOLDER_MAX_DEPTH = 30;

// OS/tooling junk that nobody means to attach when they drop a folder. Applied
// only to items found INSIDE a dropped folder — an explicitly dropped item is
// honored no matter its name (dropping ".config" itself means you want it).
const JUNK_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini', 'Icon\r']);
const JUNK_DIRS = new Set(['node_modules', '__MACOSX', '__pycache__']);
const isJunkFile = (name) => JUNK_FILES.has(name) || name.startsWith('._');
// Hidden directories (.git, .svn, .cache, …) are skipped wholesale; hidden
// FILES other than OS junk (e.g. .env) are kept — dropping the folder was
// deliberate, and lone dotfiles are cheap while dot-dirs can hold thousands.
const isJunkDir = (name) => JUNK_DIRS.has(name) || name.startsWith('.');

function hasFiles(e) {
    if (e.dataTransfer && e.dataTransfer.types) {
        return Array.from(e.dataTransfer.types).includes('Files');
    }
    return false;
}

// readEntries() returns at most ~100 entries per call (Chrome); drain the
// reader until it comes back empty OR we've pulled `limit` entries — a single
// directory holding hundreds of thousands of entries must not be enumerated
// end-to-end just to attach 50 files. `drained: false` means we stopped early.
function readDirEntries(reader, limit) {
    return new Promise((resolve, reject) => {
        const out = [];
        (function next() {
            reader.readEntries(batch => {
                if (batch.length === 0) return resolve({ entries: out, drained: true });
                out.push(...batch);
                if (out.length >= limit) return resolve({ entries: out, drained: false });
                next();
            }, reject);
        })();
    });
}

function entryToFile(entry) {
    return new Promise((resolve, reject) => entry.file(resolve, reject));
}

// Depth-first walk of the FileSystemEntry trees from a drop. Returns
// { items: [{file, relPath?}], truncated } where relPath is the path inside
// the dropped folder ("photos/cats/1.png") — absent for loose top-level files
// so single-file drops behave exactly as before. `truncated` is set whenever
// ANY bound cut the scan short (file cap, dir budget, depth cap, partial
// directory drain), so the caller can tell the user the folder wasn't fully
// examined instead of silently presenting a partial attach as complete.
async function collectDroppedEntries(entries) {
    const items = [];
    let dirBudget = FOLDER_DIR_BUDGET;
    let truncated = false;

    async function walk(entry, depth) {
        if (items.length >= FOLDER_SCAN_CAP) { truncated = true; return; }
        if (entry.isFile) {
            // Junk filters apply only inside folders (depth > 0): a junk-named
            // item dropped directly was chosen deliberately.
            if (depth > 0 && isJunkFile(entry.name)) return;
            try {
                const file = await entryToFile(entry);
                const rel = String(entry.fullPath || '').replace(/^\//, '');
                items.push({ file, relPath: rel.includes('/') ? rel : undefined });
            } catch (err) {
                console.warn('Could not read dropped entry:', entry.fullPath, err);
            }
        } else if (entry.isDirectory) {
            if (depth > 0 && isJunkDir(entry.name)) return;
            if (depth >= FOLDER_MAX_DEPTH || dirBudget <= 0) { truncated = true; return; }
            dirBudget--;
            // An unreadable subdirectory shouldn't sink the rest of the drop.
            let result;
            try {
                // +1 so hitting the file cap exactly still reads as a full drain
                result = await readDirEntries(entry.createReader(), FOLDER_SCAN_CAP - items.length + 1);
            } catch (err) {
                console.warn('Could not read dropped directory:', entry.fullPath, err);
                return;
            }
            if (!result.drained) truncated = true;
            for (const child of result.entries) {
                await walk(child, depth + 1);
            }
        }
    }

    for (const entry of entries) await walk(entry, 0);
    return { items, truncated };
}

// Monotonic attachment id. Date.now()+Math.random() looked unique but doubles
// near 1.7e12 only have ~2000 representable fractional steps, so a 50-file
// batch pushed in one millisecond had a real collision chance — and a
// collision makes one × button remove two chips (removeAttachment filters by
// id). Seeded with the epoch so ids keep their old magnitude; parseFloat in
// the remove handler round-trips integers below 2^53 exactly.
let nextAttachmentId = Date.now();

// Attach local browser File objects: store File + a blob URL for thumbnails.
// No upload happens here — files are saved to assets/ at send time.
// Accepts a FileList/array of Files (file input path) or an array of
// {file, relPath} items (folder drops). Notices — oversized, duplicates,
// over-cap, truncated scan — are aggregated into ONE alert so a big folder
// drop never turns into a chain of popups; whatever fits is still attached.
async function handleDroppedFiles(browserFiles, meta = {}) {
    // Defensive: dragdrop.js normally runs after app.js has initialized the
    // shared tray array, but never crash a drop on load-order.
    if (!Array.isArray(window.attachedImages)) window.attachedImages = [];

    const items = Array.from(browserFiles || [])
        .map(x => (x instanceof File ? { file: x } : x))
        .filter(x => x && x.file);
    const notices = [];
    const supported = [];
    const oversized = [];

    // Any file type is accepted now — it's saved to assets/ and referenced by path,
    // usable even when the model can't read its contents. Size is the only gate.
    for (const it of items) {
        if (it.file.size > maxSizeForFile(it.file)) { oversized.push(it.file); continue; }
        supported.push(it);
    }

    if (oversized.length > 0) {
        const shown = oversized.slice(0, 5).map(f => `"${f.name}" (${formatFileSize(f.size)})`).join(', ');
        const more = oversized.length > 5 ? ` and ${oversized.length - 5} more` : '';
        notices.push(`Too large, skipped: ${shown}${more}. Maximum size is ${formatFileSize(MAX_FILE_SIZE.image)} for images, ${formatFileSize(MAX_FILE_SIZE.pdf)} for PDFs, ${formatFileSize(MAX_FILE_SIZE.text)} for text/data files, and ${formatFileSize(MAX_FILE_SIZE.other)} for other files.`);
    }

    // Key = path-in-drop (or name) + size, matching against what's already in
    // the tray and within this batch. A Set keeps a 400-item folder drop O(n).
    const dedupKey = (pathish, size) => `${pathish} ${size}`;
    const seen = new Set(window.attachedImages.map(img => dedupKey(img.relPath || img.name, img.size)));
    let duplicates = 0;
    let overCap = 0;

    for (const it of supported) {
        if (window.attachedImages.length >= MAX_ATTACHMENTS) { overCap++; continue; }
        const key = dedupKey(it.relPath || it.file.name, it.file.size);
        if (seen.has(key)) { duplicates++; continue; }
        seen.add(key);

        window.attachedImages.push({
            name: it.file.name,
            relPath: it.relPath,
            size: it.file.size,
            type: it.file.type || guessMimeType(it.file.name),
            file: it.file,
            blobURL: URL.createObjectURL(it.file),
            id: nextAttachmentId++,
        });
    }

    if (duplicates > 0) {
        notices.push(duplicates === 1 ? `1 file was already attached and was skipped.` : `${duplicates} files were already attached and were skipped.`);
    }
    if (overCap > 0) {
        notices.push(`Attachments are limited to ${MAX_ATTACHMENTS} files — ${overCap} file${overCap === 1 ? ' was' : 's were'} skipped.`);
    }
    if (meta.truncated) {
        notices.push(`The dropped folder is very large, so it was only partially scanned — not everything inside was attached.`);
    }

    if (typeof window.updateAttachmentDisplay === 'function') {
        window.updateAttachmentDisplay();
    }

    if (notices.length > 0) {
        await puter.ui.alert(notices.join('\n\n'));
    }
}

function guessMimeType(name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    const map = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
        webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp',
        svg: 'image/svg+xml', pdf: 'application/pdf',
        md: 'text/markdown', markdown: 'text/markdown',
        txt: 'text/plain',
    };
    if (map[ext]) return map[ext];
    // Any other recognized text/code/config file → treat as plain text
    if (isTextAttachment({ name })) return 'text/plain';
    return 'application/octet-stream';
}

// Expose so ui.js can call it from the file-input change handler
window.handleDroppedFiles = handleDroppedFiles;

$(document).ready(function() {
    window.addEventListener('dragenter', function(e) {
        if (hasFiles(e)) {
            e.preventDefault();
            e.stopPropagation();
            dragCounter++;
            noteDragActivity();
        }
    }, true);

    window.addEventListener('dragover', function(e) {
        if (hasFiles(e)) {
            e.preventDefault();
            e.stopPropagation();
            if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
            // The heartbeat that both holds the outline up and detects a drag
            // that walked off this document (see the note at the top).
            noteDragActivity();
        }
    }, true);

    window.addEventListener('dragleave', function(e) {
        if (hasFiles(e)) {
            e.preventDefault();
            e.stopPropagation();
            // Clamped: a dragleave with no matching dragenter (the pointer
            // entered mid-drag, or the browser skipped one) would otherwise take
            // the counter negative, and it could never reach 0 again.
            dragCounter = Math.max(0, dragCounter - 1);
            if (dragCounter === 0) setDragHighlight(false);
        }
    }, true);

    // The source of a drag that started inside the page tells us it finished
    // wherever it landed. Harmless for drags from outside the browser, which
    // never fire it — the idle timer covers those.
    window.addEventListener('dragend', endDrag, true);

    window.addEventListener('drop', function(e) {
        if (!hasFiles(e)) return;
        e.preventDefault();
        e.stopPropagation();
        endDrag();

        // webkitGetAsEntry() only works synchronously inside the drop event, so
        // grab every entry NOW; the (async) folder traversal happens after.
        // Array.from: DataTransferItemList is array-like everywhere but not
        // guaranteed iterable in every browser. Items where webkitGetAsEntry
        // yields no entry (e.g. an image dragged from a web page) still carry
        // a File via getAsFile — collect those too instead of losing them.
        const entries = [];
        const looseFiles = [];
        for (const item of Array.from(e.dataTransfer?.items || [])) {
            if (item.kind !== 'file') continue;
            const entry = item.webkitGetAsEntry?.();
            if (entry) entries.push(entry);
            else {
                const f = item.getAsFile?.();
                if (f) looseFiles.push(f);
            }
        }

        // Entries path handles files AND folders uniformly; fall back to the
        // plain FileList where webkitGetAsEntry isn't available (no folder
        // support there — browsers surface a folder as an unreadable File).
        const files = e.dataTransfer?.files;
        const pending = (entries.length > 0 || looseFiles.length > 0)
            ? collectDroppedEntries(entries).then(({ items, truncated }) => {
                const all = [...looseFiles.map(f => ({ file: f })), ...items];
                // A folder drop that yields nothing (empty, or all junk/unreadable)
                // shouldn't be a silent no-op — tell the user what happened.
                if (all.length === 0) return puter.ui.alert('No attachable files were found in what you dropped.');
                return handleDroppedFiles(all, { truncated });
            })
            : (files && files.length > 0 ? handleDroppedFiles(files) : Promise.resolve());

        pending.catch(error => {
            console.error('Error in handleDroppedFiles:', error);
            puter.ui.alert(`Error processing dropped files: ${error.message || error}`);
        });
    }, true);
});
