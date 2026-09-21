// SearchFiles — project-wide text/regex search, so the model can LOCATE code
// (a function, selector, string, or symbol) without reading whole files into
// context. Returns matching lines with absolute file paths and 1-based line
// numbers, matched against the same clean source ReadTextFile shows (preview
// cache-bust tokens stripped from HTML), so a follow-up `edit` targets exactly
// what the search reported. Read-only — it never writes anything — and every
// path is confined to the project directory via window.assertPathInProject.
//
// The pure text-matching helpers live on window.__searchFilesInternals so the
// regression test (scripts/test-search-files.mjs) can evaluate this file with a
// stubbed window/puter and exercise both the helpers and the real exec.
window.__searchFilesInternals = (function () {
    // Hard bounds. Everything the search does is capped so a huge project, a
    // giant file, or a pathological regex can degrade the RESULT (with an
    // explicit note) but never hang the tab or flood the model's context.
    const LIMITS = {
        MAX_FILES: 400,          // files actually read+searched
        MAX_DEPTH: 12,           // directory recursion depth below the target
        MAX_ENTRIES: 4000,       // directory entries visited while walking
        MAX_FILE_CHARS: 1000000, // per-file size cap (pre-read when size is known, post-read otherwise)
        MAX_PER_FILE: 25,        // matching lines reported per file
        MAX_TOTAL: 200,          // matching lines reported overall
        CHAR_BUDGET: 35000,      // approx. serialized size of the matches array
        TIME_BUDGET_MS: 20000,   // whole-search wall-clock budget
        MAX_QUERY_CHARS: 2000,
        MAX_LINE_CHARS: 240,     // reported line text is clipped to this
        MAX_TESTED_LINE_CHARS: 20000, // regex runs on at most this much of a line (ReDoS containment)
        READ_CONCURRENCY: 6,
    };

    // Extensions with no searchable text content. Files WITHOUT a listed
    // extension are still read and sniffed (see looksBinary) so unknown text
    // formats keep working.
    const BINARY_EXTENSIONS = new Set([
        'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico', 'icns', 'bmp', 'tif', 'tiff', 'heic', 'heif', 'psd',
        'woff', 'woff2', 'ttf', 'otf', 'eot',
        'mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'mid', 'midi',
        'mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv', 'wmv',
        'zip', 'gz', 'tgz', 'bz2', 'xz', '7z', 'rar', 'br',
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp',
        'wasm', 'exe', 'dll', 'so', 'dylib', 'bin', 'dat', 'class', 'jar', 'pyc',
        'db', 'sqlite', 'sqlite3', 'ds_store',
    ]);

    function hasBinaryExtension(name) {
        const dot = String(name || '').lastIndexOf('.');
        if (dot < 0) return false;
        return BINARY_EXTENSIONS.has(String(name).slice(dot + 1).toLowerCase());
    }

    // Decoded content containing NUL is not text (catches binary files that
    // slipped past the extension check, e.g. an extensionless blob).
    function looksBinary(text) {
        return text.indexOf('\u0000') !== -1;
    }

    function escapeRegExp(s) {
        return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Compile the query into a per-line RegExp. Literal queries are escaped, so
    // only is_regex:true can throw — surfaced as a model-directed error it can fix.
    function compileLineRegex(query, isRegex, caseSensitive) {
        const source = isRegex ? query : escapeRegExp(query);
        try {
            return new RegExp(source, caseSensitive ? '' : 'i');
        } catch (e) {
            throw new Error('Invalid regular expression: ' + ((e && e.message) ? e.message : String(e)) + '. Fix the pattern, or set is_regex to false to search for the literal text.');
        }
    }

    // Split into lines in '\n' space (CRLF/CR normalized) — line numbers are
    // 1-based indexes into this array, and reported text never contains '\r'.
    function toLines(text) {
        return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    }

    // Clip a matched line for the result: the whole line if short, else a
    // window around the match — so a data-URI or minified line can't flood the
    // conversation with one match.
    function clipLine(lineText, matchIndex) {
        const max = LIMITS.MAX_LINE_CHARS;
        if (lineText.length <= max) return lineText;
        const idx = Math.max(0, Math.min(matchIndex || 0, lineText.length - 1));
        const start = Math.max(0, Math.min(idx - 60, lineText.length - max));
        const clipped = lineText.slice(start, start + max);
        return (start > 0 ? '…' : '') + clipped + ((start + max) < lineText.length ? '…' : '');
    }

    // Per-line regex scan. `re` carries no 'g' flag, so it holds no lastIndex
    // state; each line longer than MAX_TESTED_LINE_CHARS is tested only on its
    // head, which bounds the damage a catastrophic model-written regex can do.
    function findLineMatches(lines, re, maxPerFile, deadline) {
        const out = [];
        for (let i = 0; i < lines.length; i++) {
            if (out.length >= maxPerFile) return { matches: out, capped: true };
            if (deadline && (i & 63) === 0 && Date.now() > deadline) return { matches: out, timedOut: true };
            const line = lines[i];
            const tested = line.length > LIMITS.MAX_TESTED_LINE_CHARS ? line.slice(0, LIMITS.MAX_TESTED_LINE_CHARS) : line;
            const m = tested.match(re);
            if (m) out.push({ line: i + 1, text: clipLine(line, m.index || 0) });
        }
        return { matches: out };
    }

    // Literal query containing newline(s): match it across lines against the
    // normalized text and report the line where each occurrence STARTS. One
    // entry per distinct starting line.
    function findMultilineLiteralMatches(lines, query, caseSensitive, maxPerFile) {
        const text = lines.join('\n');
        const needle0 = query.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const hay = caseSensitive ? text : text.toLowerCase();
        const needle = caseSensitive ? needle0 : needle0.toLowerCase();
        const out = [];
        let from = 0, lineNo = 1, counted = 0, lastLine = -1;
        while (out.length < maxPerFile) {
            const idx = hay.indexOf(needle, from);
            if (idx === -1) return { matches: out };
            for (let i = counted; i < idx; i++) if (text.charCodeAt(i) === 10) lineNo++;
            counted = idx;
            if (lineNo !== lastLine) {
                const lineStart = text.lastIndexOf('\n', idx - 1) + 1;
                const nl = text.indexOf('\n', idx);
                const lineEnd = nl === -1 ? text.length : nl;
                out.push({ line: lineNo, text: clipLine(text.slice(lineStart, lineEnd), idx - lineStart) });
                lastLine = lineNo;
            }
            from = idx + Math.max(1, needle.length);
        }
        return { matches: out, capped: true };
    }

    // Search one file's text. opts: { re } for line-based matching, or
    // { multilineQuery, caseSensitive } for a newline-containing literal;
    // plus { maxPerFile, deadline }. Returns { matches, capped?, timedOut? }.
    function searchText(text, opts) {
        const lines = toLines(text);
        if (opts.multilineQuery != null) {
            return findMultilineLiteralMatches(lines, opts.multilineQuery, opts.caseSensitive, opts.maxPerFile);
        }
        return findLineMatches(lines, opts.re, opts.maxPerFile, opts.deadline || 0);
    }

    return { LIMITS, hasBinaryExtension, looksBinary, compileLineRegex, toLines, clipLine, searchText };
})();

window.tools.push({
    type: "function",
    function: {
        name: "SearchFiles",
        description: "Searches the project's text files for a string or regular expression and returns the matching lines with their absolute file paths and 1-based line numbers. Use this to LOCATE something — where a function, style rule, variable, or piece of text lives — instead of reading whole files one by one; then read or edit only the relevant file(s). Only search when you do NOT already know the location: if you wrote or read the file earlier in the conversation, or the project is small and the file is obvious, skip the search and go straight to it. Matching is line-based: a regex cannot span lines (a literal query containing newlines is matched across lines). Binary files are skipped automatically. Results are capped — if the result says it was truncated, narrow the query or search a subdirectory.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The text to search for. Treated as literal text unless is_regex is true. Must not be empty or only whitespace."
                },
                is_regex: {
                    type: "boolean",
                    description: "Whether query is a JavaScript regular expression pattern (source only — no surrounding slashes, no flags). If false, query is matched as literal text."
                },
                case_sensitive: {
                    type: "boolean",
                    description: "Whether matching is case-sensitive. Use false unless casing matters."
                },
                path: {
                    type: "string",
                    description: "The absolute path of the directory to search recursively, or of a single file to search. Pass the app's working directory to search the whole project. Absolute paths start with a /."
                }
            },
            required: ["query", "is_regex", "case_sensitive", "path"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function (args, state) {
        const S = window.__searchFilesInternals;
        const L = S.LIMITS;

        const query = (args && typeof args.query === 'string') ? args.query : '';
        if (!query || !query.trim()) throw new Error('query must be a non-empty string (a whitespace-only query would match nearly every line).');
        if (query.length > L.MAX_QUERY_CHARS) throw new Error(`query is too long (max ${L.MAX_QUERY_CHARS} characters).`);

        const isRegex = !!(args && args.is_regex);
        const caseSensitive = !!(args && args.case_sensitive);
        // A literal query containing a newline is matched across lines; every
        // other query compiles to a per-line regex (literals are escaped, so
        // compilation can only fail for is_regex:true — a fixable model error).
        const multilineLiteral = !isRegex && query.indexOf('\n') !== -1;
        const re = multilineLiteral ? null : S.compileLineRegex(query, isRegex, caseSensitive);

        // Confine the search to the project directory. assertPathInProject also
        // resolves a relative path against the project root; '.' means the root
        // itself. See window.assertPathInProject.
        const rawPath = String((args && args.path) == null ? '' : args.path).trim() || '.';
        const target = window.assertPathInProject(rawPath, state);

        let rootStat;
        try {
            rootStat = await puter.fs.stat(target);
        } catch (e) {
            throw new Error(`Path not found: ${target}`);
        }

        const deadline = Date.now() + L.TIME_BUDGET_MS;
        const notes = [];
        const skipped = { binary_files: 0, too_large_files: 0, unreadable: 0 };
        const files = []; // { path, size? } in deterministic (sorted BFS) order

        if (!rootStat.is_dir) {
            const baseName = target.slice(target.lastIndexOf('/') + 1);
            if (S.hasBinaryExtension(baseName)) throw new Error(`"${target}" is a binary file and cannot be text-searched.`);
            if (typeof rootStat.size === 'number' && rootStat.size > L.MAX_FILE_CHARS) throw new Error(`"${target}" is too large to search (over ${Math.round(L.MAX_FILE_CHARS / 1000)}KB).`);
            files.push({ path: target, size: rootStat.size });
        } else {
            // Bounded BFS. Entries are sorted per directory so the walk — and
            // therefore the result order — is deterministic.
            const queue = [{ dir: target, depth: 0 }];
            let entriesSeen = 0;
            let moreFiles = false, depthCapped = false, listingTimedOut = false;
            while (queue.length) {
                if (Date.now() > deadline) { listingTimedOut = true; break; }
                const { dir, depth } = queue.shift();
                let items;
                try {
                    items = await puter.fs.readdir(dir);
                } catch (e) {
                    skipped.unreadable++;
                    continue;
                }
                items = items.slice().sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
                for (const it of items) {
                    if (++entriesSeen > L.MAX_ENTRIES) { moreFiles = true; queue.length = 0; break; }
                    const full = dir + '/' + it.name;
                    if (it.is_dir) {
                        if (depth + 1 > L.MAX_DEPTH) { depthCapped = true; continue; }
                        queue.push({ dir: full, depth: depth + 1 });
                        continue;
                    }
                    // Hide internal CDN-propagation marker files from the model
                    // (mirrors the readdir tool).
                    if (/^__deploy_.*\.png$/.test(it.name)) continue;
                    if (S.hasBinaryExtension(it.name)) { skipped.binary_files++; continue; }
                    if (typeof it.size === 'number' && it.size > L.MAX_FILE_CHARS) { skipped.too_large_files++; continue; }
                    if (files.length >= L.MAX_FILES) { moreFiles = true; queue.length = 0; break; }
                    files.push({ path: full, size: it.size });
                }
            }
            if (moreFiles) notes.push(`Only the first ${files.length} files were searched; search a subdirectory for full coverage.`);
            if (depthCapped) notes.push(`Directories nested deeper than ${L.MAX_DEPTH} levels were not searched.`);
            if (listingTimedOut) notes.push('Stopped early: the time limit was reached while listing files; results may be incomplete.');
        }

        // Read + match with a small worker pool. Results land in perFile[i]
        // (indexed by the deterministic file order), so concurrency never
        // affects the order of the reported matches.
        const perFile = new Array(files.length).fill(null);
        let filesSearched = 0;
        let searchTimedOut = false;
        let next = 0;
        async function worker() {
            while (true) {
                if (Date.now() > deadline) { searchTimedOut = true; return; }
                const i = next++;
                if (i >= files.length) return;
                const f = files[i];
                let text;
                try {
                    const blob = await puter.fs.read(f.path);
                    text = await blob.text();
                } catch (e) {
                    skipped.unreadable++;
                    continue;
                }
                if (text.length > L.MAX_FILE_CHARS) { skipped.too_large_files++; continue; }
                if (S.looksBinary(text)) { skipped.binary_files++; continue; }
                // Match against the clean source the model sees via ReadTextFile
                // (preview cache-bust tokens hidden), so reported line content —
                // and any edit built from it — lines up with the real file.
                if (/\.html?$/i.test(f.path) && window.stripPreviewCacheBust) {
                    text = window.stripPreviewCacheBust(text);
                }
                perFile[i] = S.searchText(text, {
                    re: re,
                    multilineQuery: multilineLiteral ? query : null,
                    caseSensitive: caseSensitive,
                    maxPerFile: L.MAX_PER_FILE,
                    deadline: deadline,
                });
                filesSearched++;
            }
        }
        if (files.length > 0) {
            const workers = [];
            for (let w = 0; w < Math.min(L.READ_CONCURRENCY, files.length); w++) workers.push(worker());
            await Promise.all(workers);
        }

        // Assemble in file order under the total-match and char budgets.
        const matches = [];
        const matchedFiles = new Set();
        let charCount = 0;
        let totalCapped = false, anyPerFileCapped = false, anyMatchTimedOut = false;
        for (let i = 0; i < files.length && !totalCapped; i++) {
            const r = perFile[i];
            if (!r) continue;
            if (r.capped) anyPerFileCapped = true;
            if (r.timedOut) anyMatchTimedOut = true;
            for (const m of r.matches) {
                const cost = files[i].path.length + m.text.length + 24;
                if (matches.length >= L.MAX_TOTAL || charCount + cost > L.CHAR_BUDGET) { totalCapped = true; break; }
                matches.push({ file: files[i].path, line: m.line, text: m.text });
                matchedFiles.add(files[i].path);
                charCount += cost;
            }
        }

        if (totalCapped) notes.push(`Results truncated to the first ${matches.length} matching lines — narrow the query or search a subdirectory to see the rest.`);
        if (anyPerFileCapped) notes.push(`Some files had more than ${L.MAX_PER_FILE} matching lines; only the first ${L.MAX_PER_FILE} per file are shown.`);
        if (searchTimedOut || anyMatchTimedOut) notes.push('Stopped early: the search hit its time limit; results may be incomplete.');

        const result = {
            query: query,
            searched_path: target,
            files_searched: filesSearched,
            files_with_matches: matchedFiles.size,
            matches: matches,
        };
        if (skipped.binary_files || skipped.too_large_files || skipped.unreadable) result.skipped = skipped;
        if (notes.length) result.notes = notes;
        return result;
    }
})
