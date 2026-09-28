// Build helpers for the official project templates (src/templates/).
//
// The templatesPlugin in vite.config.js calls these to turn each template
// folder into what the app fetches: an entry in /templates.json and its files
// under /template-files/<slug>/<version>/. Everything a fork will rely on is
// checked HERE, at build time, so a broken template fails the build instead of
// failing in a user's account:
//   * the folder, the metadata and the file tree agree;
//   * every declared worker ships its source, and every {{WORKER_URL:…}}
//     placeholder names a declared worker (and never sits inside a worker's
//     own source, which is deployed before any URL exists);
//   * the result passes the app's own validator (TemplateCore.sanitizeIndex,
//     evaluated from src/js/template-core.js), so the build cannot ship an
//     index entry the app would silently drop.
// File I/O only; no network. Guarded by scripts/test-templates.mjs.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { TEMPLATES } from '../src/templates/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const SRC = path.resolve(__dirname, '../src');
export const TEMPLATES_DIR = path.join(SRC, 'templates');

export { TEMPLATES };

// Card and page images are derived from <slug>/screenshot.png at build time
// (see templatesPlugin). Their published paths are fixed per slug so the
// static page, the index and the dev server all agree without a lookup.
export const THUMB = { width: 756, height: 391 };   // keep in sync with .feed-thumb
export const SHOT = { width: 1280, height: 800 };
export const thumbPath = (slug) => `/template-thumbs/${slug}.webp`;
export const shotPath = (slug) => `/template-thumbs/${slug}-large.webp`;

const MAX_TOTAL_BYTES = 5 * 1024 * 1024;

// The app's own validator, loaded from the shipping bytes.
export function loadTemplateCore() {
    const window = {};
    new Function('window', fs.readFileSync(path.join(SRC, 'js/template-core.js'), 'utf8'))(window);
    return window.TemplateCore;
}

// Every file under `dir`, as sorted posix paths relative to it. .DS_Store is
// ignored (it is Finder's, not the template's); any other dot file is kept in
// the list so validation can reject it by name.
export function listFiles(dir) {
    const out = [];
    const walk = (abs, rel) => {
        for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
            if (entry.name === '.DS_Store') continue;
            const childRel = rel ? `${rel}/${entry.name}` : entry.name;
            if (entry.isDirectory()) walk(path.join(abs, entry.name), childRel);
            else out.push(childRel);
        }
    };
    if (fs.existsSync(dir)) walk(dir, '');
    return out.sort();
}

// Read one template from disk: its metadata, its files (bytes), its content
// version (a hash over every path and byte, so any change is a new version),
// and whether it has a screenshot.
export function readTemplate(meta, { dir = TEMPLATES_DIR } = {}) {
    const root = path.join(dir, String(meta && meta.slug));
    const filesDir = path.join(root, 'files');
    const files = listFiles(filesDir).map((rel) => ({
        path: rel,
        bytes: fs.readFileSync(path.join(filesDir, ...rel.split('/'))),
    }));
    const hash = crypto.createHash('sha256');
    for (const f of files) {
        hash.update(f.path).update('\0').update(f.bytes).update('\0');
    }
    const screenshot = path.join(root, 'screenshot.png');
    return {
        meta,
        root,
        files,
        version: hash.digest('hex').slice(0, 12),
        screenshot: fs.existsSync(screenshot) ? screenshot : null,
    };
}

// Everything wrong with a template, as readable messages ([] when it is fine).
export function validateTemplate(t, core = loadTemplateCore()) {
    const errors = [];
    const m = t.meta || {};
    const slug = String(m.slug || '');
    const err = (msg) => errors.push(`[templates] ${slug || '(no slug)'}: ${msg}`);

    if (!core.SLUG_RE.test(slug)) err('slug must be lowercase letters, digits and dashes');
    if (path.basename(t.root) !== slug) err(`must live in src/templates/${slug}/`);
    if (typeof m.name !== 'string' || !m.name.trim()) err('needs a name');
    if (typeof m.description !== 'string' || !m.description.trim()) err('needs a description');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(m.updated || ''))) err('needs an ISO `updated` date');
    if (!Array.isArray(m.workers)) err('`workers` must be an array (empty for none)');
    if (!Array.isArray(m.suggestions) || !m.suggestions.length) err('needs at least one suggestion');
    if (!m.page || typeof m.page !== 'object') err('needs `page` copy for its static page');
    // The card, the dialog and the static page all show it.
    if (!t.screenshot) err(`needs a screenshot at src/templates/${slug}/screenshot.png (${SHOT.width}x${SHOT.height})`);

    const paths = t.files.map((f) => f.path);
    if (!paths.length) err('has no files');
    if (!paths.includes('index.html')) err('files/index.html is missing');
    if (paths.length > core.MAX_FILES) err(`has ${paths.length} files (the limit is ${core.MAX_FILES})`);
    for (const p of paths) {
        if (!core.FILE_PATH_RE.test(p)) err(`"${p}" is not an allowed file path (no dot files, no unusual characters)`);
    }
    const total = t.files.reduce((n, f) => n + f.bytes.length, 0);
    if (total > MAX_TOTAL_BYTES) err(`is ${total} bytes (the limit is ${MAX_TOTAL_BYTES})`);

    const workers = Array.isArray(m.workers) ? m.workers : [];
    for (const w of workers) {
        if (!core.WORKER_NAME_RE.test(String(w))) err(`worker name "${w}" is not allowed`);
        if (!paths.includes(`workers/${w}.js`)) err(`declares worker "${w}" but files/workers/${w}.js is missing`);
    }
    if (new Set(workers).size !== workers.length) err('declares a worker twice');
    // A file under workers/ that is not a declared worker would be copied as a
    // plain file, and read by the model as a backend that does not exist.
    for (const p of paths) {
        if (p.startsWith('workers/') && !core.isWorkerSource(p, workers)) {
            err(`${p} is under workers/ but is not a declared worker`);
        }
    }

    for (const f of t.files) {
        if (!core.isTextFile(f.path)) continue;
        const names = core.placeholdersIn(f.bytes.toString('utf8'));
        if (!names.length) continue;
        if (core.isWorkerSource(f.path, workers)) {
            err(`${f.path} is a worker source and cannot use {{WORKER_URL:...}} (it is deployed before any URL exists)`);
            continue;
        }
        for (const n of names) {
            if (!workers.includes(n)) err(`${f.path} uses {{WORKER_URL:${n}}} but declares no worker "${n}"`);
        }
    }
    // A stray, malformed placeholder would reach the fork untouched.
    for (const f of t.files) {
        if (!core.isTextFile(f.path)) continue;
        const text = f.bytes.toString('utf8');
        const all = (text.match(/\{\{\s*WORKER_URL[^}]*\}\}/g) || []);
        const good = (text.match(core.PLACEHOLDER_RE) || []);
        if (all.length !== good.length) err(`${f.path} has a malformed {{WORKER_URL:...}} placeholder`);
    }
    return errors;
}

// The /templates.json entry for one template.
export function indexEntry(t) {
    const m = t.meta;
    return {
        slug: m.slug,
        name: m.name,
        version: t.version,
        description: m.description,
        category: m.category || '',
        thumbnail: t.screenshot ? thumbPath(m.slug) : '',
        files: t.files.map((f) => f.path),
        workers: m.workers.slice(),
        suggestions: m.suggestions.map((s) => ({ label: s.label, prompt: s.prompt })),
    };
}

// Read and validate every registered template. Throws with every problem
// found (not just the first), so a broken template is fixed in one pass.
export function buildTemplates({ templates = TEMPLATES, dir = TEMPLATES_DIR } = {}) {
    const core = loadTemplateCore();
    const read = templates.map((meta) => readTemplate(meta, { dir }));
    const errors = read.flatMap((t) => validateTemplate(t, core));
    const slugs = templates.map((m) => m && m.slug);
    if (new Set(slugs).size !== slugs.length) errors.push('[templates] two templates share a slug');
    const index = { templates: read.map(indexEntry) };
    if (!errors.length) {
        const accepted = core.sanitizeIndex(JSON.parse(JSON.stringify(index)));
        for (const entry of index.templates) {
            if (!accepted.some((a) => a.slug === entry.slug)) {
                errors.push(`[templates] ${entry.slug}: the app would reject this index entry (see TemplateCore.sanitizeIndex)`);
            }
        }
    }
    if (errors.length) throw new Error(errors.join('\n'));
    return { templates: read, index };
}
