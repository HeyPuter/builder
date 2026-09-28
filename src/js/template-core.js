// template-core.js — pure helpers for official project templates.
//
// A template is a small, complete app that ships with the builder itself
// (src/templates/<slug>/, reviewed like any other code in this repository).
// "Use this template" copies it into a brand-new project in the user's own
// account, where it is theirs to keep building on. The build turns the
// templates into three things (templatesPlugin in vite.config.js):
//   * /templates.json — the index the app reads: one entry per template, with
//     its file list and a content version.
//   * /template-files/<slug>/<version>/<path> — the files themselves. The
//     version is a hash of the template's bytes, so an index and the files it
//     lists can never be mixed across two deploys.
//   * /templates/<slug>/ — a static page per template (see
//     src/content/templates.js), whose "Use this template" button carries the
//     visitor into the app.
//
// Backends: a template may ship serverless workers (files/workers/<name>.js).
// A fork deploys each one under a fresh account-unique name of its own, and
// the template's frontend refers to a worker only through a placeholder,
// {{WORKER_URL:<name>}}, which the fork replaces with that deployment's URL.
// Nothing a fork runs is shared with anyone else's copy.
//
// PURE by design: no I/O, no DOM, no reads of other window.* modules. The
// I/O half (fetching, forking, the landing section and dialog) is
// src/js/templates.js. Evaluated with a bare window object by
// scripts/test-templates.mjs.
window.TemplateCore = (function () {
    'use strict';

    // A slug is the template's folder name and the last segment of its page
    // URL, so it is kept to the characters both allow without escaping.
    const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,48}[a-z0-9])?$/;
    // The same charset create_worker enforces for worker names.
    const WORKER_NAME_RE = /^[A-Za-z0-9_-]{1,50}$/;
    // A relative file path inside a template: segments of safe characters, no
    // dot-leading segment (which also rules out "." and ".."), no backslash.
    const FILE_PATH_RE = /^(?!.*(?:^|\/)\.)[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/;
    const VERSION_RE = /^[a-f0-9]{8,64}$/;
    const PLACEHOLDER_RE = /\{\{WORKER_URL:([A-Za-z0-9_-]+)\}\}/g;
    // Files a placeholder may appear in, and that a fork therefore rewrites.
    // Binary files are copied byte for byte.
    const TEXT_FILE_RE = /\.(html?|js|mjs|css|json|txt|md|xml|svg|webmanifest)$/i;

    const MAX_TEMPLATES = 60;
    const MAX_FILES = 200;
    const MAX_SUGGESTIONS = 5;

    function str(v, max) {
        return (typeof v === 'string' ? v : '').trim().slice(0, max);
    }

    function workerPlaceholder(name) {
        return '{{WORKER_URL:' + name + '}}';
    }

    function isTextFile(path) {
        return TEXT_FILE_RE.test(String(path || ''));
    }

    function isWorkerSource(path, workers) {
        return (workers || []).some(w => path === 'workers/' + w + '.js');
    }

    // Validate untrusted index JSON down to a clean list of templates. The
    // index is first-party, but it is fetched at runtime and drives file
    // writes into the user's account, so anything malformed is dropped rather
    // than repaired, exactly like the featured feed (sanitizeFeaturedItems).
    function sanitizeIndex(data) {
        if (!data || !Array.isArray(data.templates)) return [];
        const out = [];
        const seen = new Set();
        for (const raw of data.templates) {
            if (!raw || typeof raw !== 'object') continue;
            const slug = str(raw.slug, 50);
            const name = str(raw.name, 80);
            const version = str(raw.version, 64);
            if (!SLUG_RE.test(slug) || !name || !VERSION_RE.test(version) || seen.has(slug)) continue;
            if (!Array.isArray(raw.files) || !raw.files.length || raw.files.length > MAX_FILES) continue;
            const files = raw.files.filter(f => typeof f === 'string' && FILE_PATH_RE.test(f));
            if (files.length !== raw.files.length || new Set(files).size !== files.length) continue;
            if (files.indexOf('index.html') === -1) continue;
            const workers = Array.isArray(raw.workers) ? raw.workers : [];
            if (!workers.every(w => typeof w === 'string' && WORKER_NAME_RE.test(w))) continue;
            if (new Set(workers).size !== workers.length) continue;
            // Every worker a template declares must ship its source.
            if (!workers.every(w => files.indexOf('workers/' + w + '.js') !== -1)) continue;
            const suggestions = (Array.isArray(raw.suggestions) ? raw.suggestions : [])
                .map(s => (s && typeof s === 'object') ? { label: str(s.label, 60), prompt: str(s.prompt, 600) } : null)
                .filter(s => s && s.label && s.prompt)
                .slice(0, MAX_SUGGESTIONS);
            seen.add(slug);
            out.push({
                slug,
                name,
                version,
                description: str(raw.description, 200),
                category: str(raw.category, 40),
                // Same-origin paths only: a second leading slash would make it
                // a protocol-relative URL on another host.
                thumbnail: typeof raw.thumbnail === 'string' && /^\/(?![/\\])[A-Za-z0-9/._-]+$/.test(raw.thumbnail) ? raw.thumbnail : '',
                files,
                workers: workers.slice(),
                suggestions,
            });
            if (out.length >= MAX_TEMPLATES) break;
        }
        return out;
    }

    // Where the build serves a template file. Every segment was validated by
    // sanitizeIndex, so nothing here needs escaping.
    function fileUrl(template, path) {
        return '/template-files/' + template.slug + '/' + template.version + '/' + path;
    }

    // The worker names a text file refers to through placeholders.
    function placeholdersIn(text) {
        const names = new Set();
        String(text).replace(PLACEHOLDER_RE, (m, name) => { names.add(name); return m; });
        return Array.from(names);
    }

    // Swap every {{WORKER_URL:<name>}} for that worker's deployed URL (no
    // trailing slash, so `${url}/path` in the template reads naturally).
    // Returns the names it found no URL for in `missing`; a fork treats any
    // as a failure rather than shipping a frontend that calls nothing.
    function substituteWorkerUrls(text, urlsByName) {
        const missing = new Set();
        const out = String(text).replace(PLACEHOLDER_RE, (m, name) => {
            const url = urlsByName && Object.prototype.hasOwnProperty.call(urlsByName, name) ? urlsByName[name] : '';
            if (typeof url !== 'string' || !url) { missing.add(name); return m; }
            return url.replace(/\/+$/, '');
        });
        return { text: out, missing: Array.from(missing) };
    }

    // The stem a fork's deployed worker is named from: the template slug plus
    // the template's own worker name, so a user's worker list says where each
    // one came from. A random suffix is added by the caller
    // (WorkerOwnership.deriveCopyName) to make it account-unique.
    function workerBaseName(slug, name) {
        const base = (slug + '-' + name).replace(/[^A-Za-z0-9_-]+/g, '-');
        return base.slice(0, 40).replace(/-+$/, '') || 'worker';
    }

    // "Feedback board", then "Feedback board 2", "Feedback board 3"... when
    // the user already has projects by that name.
    function uniqueTitle(base, takenTitles) {
        const taken = new Set((takenTitles || []).filter(t => typeof t === 'string'));
        if (!taken.has(base)) return base;
        for (let n = 2; n < 1000; n++) {
            if (!taken.has(base + ' ' + n)) return base + ' ' + n;
        }
        return base;
    }

    // The system-prompt block a forked project carries after the usual
    // working-directory rules. A fork's conversation starts empty, and without
    // this the model would only know about files it wrote itself, so it would
    // treat a finished app as a blank project and write over it. The system
    // prompt is persisted with the chat and never regenerated, so this stays
    // true for the life of the project.
    //
    // Workers are described by source path and URL only, never by bare name:
    // those are the two tokens duplicateChat rewrites everywhere in a copied
    // history (WorkerOwnership.rewriteHistory), so a copy of a fork gets a note
    // about ITS workers. The name follows from the path by create_worker's
    // own convention.
    function buildTemplateNote(opts) {
        const appDir = String(opts.appDir || '').replace(/\/+$/, '');
        const lines = [];
        lines.push(`This project was created from the official "${opts.name}" template, so the working directory already contains a complete, working app. Its files, relative to the working directory:`);
        for (const f of (opts.files || [])) lines.push('- ' + f);
        if (opts.previewUrl) {
            lines.push(`The live preview is already open and serves ${appDir}. It updates automatically when files change, so do not call publish_site for this project.`);
        }
        const workers = opts.workers || [];
        if (workers.length) {
            lines.push('The app has a serverless backend that is already deployed:');
            for (const w of workers) {
                lines.push(`- Source ${appDir}/workers/${w.name}.js, running at ${String(w.url).replace(/\/+$/, '')}. Its worker name is the file name without ".js"; to change it, call create_worker with that same name and the full updated code.`);
            }
        }
        lines.push('Before changing anything, read the files involved and build on the existing code. Keep what already works unless the user asks to replace it, and keep following every rule above.');
        return lines.join('\n');
    }

    return {
        SLUG_RE,
        WORKER_NAME_RE,
        FILE_PATH_RE,
        PLACEHOLDER_RE,
        MAX_FILES,
        workerPlaceholder,
        isTextFile,
        isWorkerSource,
        sanitizeIndex,
        fileUrl,
        placeholdersIn,
        substituteWorkerUrls,
        workerBaseName,
        uniqueTitle,
        buildTemplateNote,
    };
})();
