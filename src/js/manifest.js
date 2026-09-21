// ---- Installable generated apps (web app manifest) -------------------------
//
// Every app the model builds is made installable automatically: a manifest.json,
// a set of real PNG icons, and the matching <head> tags are generated here and
// written into the app's own directory. Both addresses that serve a project —
// the draft preview (preview-<uuid>.puter.site) and the published copy
// (.published/<chatId> behind the public subdomain) — serve the app dir at the
// site root, and publish's dir copy carries the files to production with no
// extra step. Every URL involved (the manifest's internals AND the stamped
// hrefs, which climb with ../ per directory) is RELATIVE, so a downloaded
// project keeps working when rehosted under a subpath or opened from disk.
//
// Why the builder generates this instead of the model writing it:
//   - A manifest cannot be hosted centrally the way src/runtime.js is. It must
//     be a same-origin file in the app's own root, so the "one baked tag" trick
//     used for the badge/click-to-edit runtime is not available here.
//   - Installability needs real PNG icons at 192/512 (plus a maskable variant
//     and an apple-touch-icon — iOS ignores manifest icons). The model can only
//     emit text, so it cannot produce them; a canvas can.
//   - Doing it here costs zero prompt tokens per build, stays consistent across
//     apps, and works RETROACTIVELY: an app built months ago becomes installable
//     on its next preview refresh.
// The model's only contribution is identity, which it is already good at: an
// icon.svg in the project root and a <meta name="theme-color"> in the page (see
// the rule in js/prompt.js). Without either, we still emit a monogram icon and a
// valid manifest, so the feature never depends on the model getting it right.
//
// NOT shipped: a service worker. Chrome has not required one for install from
// the browser menu/omnibox since 108 (mobile) / 112 (desktop), and a caching
// service worker inside a generated app would fight the three things that make
// the builder work — the per-turn preview reload, applyPreviewCacheBust's
// sub-resource tokens, and version restore. The automatic install PROMPT still
// wants a fetch handler; that is a deliberate, separate decision.
//
// The pure string/JSON half of this file (deriveManifestMeta, buildManifestJson,
// stampManifestTags, normalizeSvgForRaster) is DOM-free and guarded by
// scripts/test-manifest.mjs. Only ensureAppManifest below touches puter.fs.

// Marker around the tags we inject. Regeneration replaces the whole block, so a
// renamed app or a recolored theme updates in place instead of accumulating a
// second copy — and a user (or the model) can see at a glance that the lines are
// generated. Everything outside the markers is the model's, and is never touched.
const PWA_BLOCK_START = '<!-- puter-pwa: generated, do not edit -->';
const PWA_BLOCK_END = '<!-- /puter-pwa -->';

// Icon set written to <appDir>/icons/. 192 + 512 "any" satisfy the install
// criteria, the maskable 512 keeps Android from letterboxing the art inside its
// adaptive-icon mask, and the 180 apple-touch-icon is what iOS actually uses for
// Add to Home Screen (it ignores the manifest's icons entirely).
const ICON_FILES = {
    any192: 'icons/icon-192.png',
    any512: 'icons/icon-512.png',
    maskable512: 'icons/maskable-512.png',
    apple180: 'icons/apple-touch-icon-180.png',
};

const DEFAULT_THEME = '#ffffff';

// Written into every manifest we generate, and the only way we recognize our
// own file later (see isGeneratedManifest).
const GENERATOR_TAG = 'builder.puter.com';

// ---- pure helpers ----------------------------------------------------------

// Titles and descriptions are HTML, and models write real punctuation as
// entities ("Tasks &mdash; fast"). Decoded in ONE pass so "&amp;lt;" comes back
// as the literal "&lt;" rather than being double-decoded into a tag.
const NAMED_ENTITIES = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    mdash: '—', ndash: '–', hellip: '…', middot: '·', bull: '•',
    lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
    times: '×', deg: '°', copy: '©', reg: '®', trade: '™',
};
function decodeEntities(s) {
    return String(s == null ? '' : s).replace(/&(#x?[0-9a-f]+|[a-z][a-z0-9]*);/gi, (whole, body) => {
        if (body[0] === '#') {
            const hex = body[1] === 'x' || body[1] === 'X';
            const code = parseInt(hex ? body.slice(2) : body.slice(1), hex ? 16 : 10);
            if (!isFinite(code) || code < 0 || code > 0x10ffff) return whole;
            try { return String.fromCodePoint(code); } catch (e) { return whole; }
        }
        const key = body.toLowerCase();
        return Object.prototype.hasOwnProperty.call(NAMED_ENTITIES, key) ? NAMED_ENTITIES[key] : whole;
    });
}

function escapeAttr(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function collapse(s) {
    return String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
}

// Truncate by CODE POINTS, never by code units. Titles with astral characters
// are real — models brand apps with mathematical alphanumerics ("𝕹𝖔𝖙𝖊𝖘") — and
// String.prototype.slice can cut a surrogate pair in half, leaving a lone
// surrogate that renders as � in the manifest name, the install dialog and the
// apple-mobile-web-app-title attribute.
function cpSlice(s, n) {
    const cps = Array.from(String(s == null ? '' : s));
    return cps.length <= n ? String(s == null ? '' : s) : cps.slice(0, n).join('');
}
function cpLen(s) {
    return Array.from(String(s == null ? '' : s)).length;
}

// Content of <meta name="…"> regardless of attribute order. Returns '' when the
// tag is absent or has no content attribute.
function metaContent(html, name) {
    const re = new RegExp('<meta\\b[^>]*\\bname\\s*=\\s*["\']' + name + '["\'][^>]*>', 'i');
    const tag = (String(html).match(re) || [])[0];
    if (!tag) return '';
    // Match the value up to the SAME quote that opened it, so a description
    // like content="Bob's task list" keeps its apostrophe instead of stopping
    // at it (the manifest's description became "Bob").
    const m = tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i);
    return m ? collapse(decodeEntities(m[2])) : '';
}

// A CSS color we are willing to hand to both the manifest and canvas fillStyle.
// Hex is settled without a DOM (the overwhelmingly common case, and it keeps the
// pure tests honest); anything else is put to the engine, which is the same
// parser that will accept or reject it later. A value that fails — the classic
// being `theme-color: dark`, which is not a color at all — must not reach the
// manifest (browsers drop the field) or a canvas (fillStyle silently ignores the
// assignment and paints the previous color, i.e. black).
function sanitizeColor(c, fallback) {
    const v = collapse(c).toLowerCase();
    if (!v) return fallback;
    if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(v)) return v;
    if (typeof CSS !== 'undefined' && CSS && typeof CSS.supports === 'function') {
        return CSS.supports('color', v) ? v : fallback;
    }
    // No engine to ask (Node, in the tests): fall back to a syntax check.
    if (/^(rgb|hsl)a?\([0-9a-z%.,\s/]+\)$/.test(v)) return v;
    if (/^[a-z]{3,20}$/.test(v)) return v;
    return fallback;
}

// Resolve any CSS color to RGB. Hex is parsed directly; everything else goes
// through a canvas, which normalizes it to "#rrggbb" or "rgba(…)". Returns null
// when the value isn't a color the engine accepts.
function resolveRgb(value) {
    const v = collapse(value).toLowerCase();
    let hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v) && v.slice(1);
    if (!hex) {
        try {
            const ctx = document.createElement('canvas').getContext('2d');
            if (!ctx) return null;
            // Two different sentinels: an invalid assignment is IGNORED, so the
            // value only "sticks" (agrees across both) if the engine accepted it.
            ctx.fillStyle = '#000000';
            ctx.fillStyle = v;
            const a = String(ctx.fillStyle);
            ctx.fillStyle = '#ffffff';
            ctx.fillStyle = v;
            if (a !== String(ctx.fillStyle)) return null;
            const m = /^#([0-9a-f]{6})$/i.exec(a);
            if (m) hex = m[1];
            else {
                const rgb = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(a);
                if (!rgb) return null;
                return { r: +rgb[1] / 255, g: +rgb[2] / 255, b: +rgb[3] / 255 };
            }
        } catch (e) { return null; }
    }
    if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    return {
        r: parseInt(hex.slice(0, 2), 16) / 255,
        g: parseInt(hex.slice(2, 4), 16) / 255,
        b: parseInt(hex.slice(4, 6), 16) / 255,
    };
}

// short_name is what shows under the installed icon — roughly 12 characters
// before platforms start truncating. Titles are usually "Name — tagline", so the
// lead segment is the real name; only fall back to a hard slice.
function shortNameFor(name) {
    const lead = collapse(String(name).split(/\s+[|–—:·-]\s+/)[0]) || collapse(name);
    if (cpLen(lead) <= 12) return lead;
    const firstWord = lead.split(' ')[0];
    if (cpLen(firstWord) <= 12) return firstWord;
    return cpSlice(lead, 12).trim();
}

// Everything the manifest and the icons need, read out of the app's own HTML.
// `fallbackName` is the project title, used only when the page has no <title>.
window.deriveManifestMeta = function (html, fallbackName) {
    // Read the app's OWN markup: strip any block we wrote previously first.
    // Without this, the theme-color we inject on the first pass reads back as
    // "the page already has one" on the second, we drop it from the block, the
    // third pass adds it again — a flip-flop that rewrites the user's HTML on
    // every single preview refresh. Same reason the block never counts as a
    // hand-written manifest link (see hasForeignManifestLink).
    const src = replacePwaBlocks(String(html || ''), '\n');
    const titleRaw = (src.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
    const name = collapse(decodeEntities(titleRaw)) || collapse(fallbackName) || 'App';
    const themeColor = sanitizeColor(metaContent(src, 'theme-color'), DEFAULT_THEME);
    return {
        name: cpSlice(name, 120),
        shortName: shortNameFor(name),
        description: cpSlice(metaContent(src, 'description'), 300),
        themeColor,
        // The splash screen behind the icon. The page's own theme color is the
        // closest thing to "this app's surface" we can know without rendering it.
        backgroundColor: themeColor,
        // Whether the page already declares a theme color — if it does we must
        // not add a second <meta name="theme-color">, which browsers resolve by
        // first match and which would look like a bug to whoever reads the file.
        hasThemeColorTag: !!metaContent(src, 'theme-color'),
        // Same for a favicon: some apps ship their own.
        hasIconLink: hasIconLinkTag(src),
    };
};

// Does the page declare its own favicon? Matches rel="icon" and the legacy
// rel="shortcut icon" by TOKEN, so rel="apple-touch-icon" — a different
// relationship, and one our own block contains — never counts as one.
function hasIconLinkTag(html) {
    for (const tag of String(html).match(/<link\b[^>]*>/gi) || []) {
        const rel = /\brel\s*=\s*["']([^"']*)["']/i.exec(tag);
        if (!rel) continue;
        if (rel[1].toLowerCase().split(/\s+/).includes('icon')) return true;
    }
    return false;
}

// The manifest itself. Every URL is RELATIVE to the manifest (which sits at the
// site root), so the same bytes work on the draft subdomain, the published
// subdomain, and a downloaded copy served from anywhere.
//
// `prev` is the parsed PREVIOUS generated manifest (already verified as ours by
// the caller), and regeneration is a MERGE into it, not a replacement: only the
// identity-derived fields we manage are overwritten. Everything else survives —
// display, orientation, shortcuts, categories, whatever the model added because
// the user asked for it ("make my app landscape-only" edits our file). A full
// rebuild would silently revert those on the next title or theme change.
window.buildManifestJson = function (meta, prev) {
    // No previous manifest: start from our defaults. These are set only ONCE —
    // after that they belong to the merge-preserved, user-adjustable set.
    const m = (prev && typeof prev === 'object' && !Array.isArray(prev)) ? Object.assign({}, prev) : {
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui', 'browser'],
        orientation: 'any',
    };
    // The managed fields: derived from the app's own pages/files, always ours.
    m.id = './';
    m.name = meta.name;
    m.short_name = meta.shortName;
    if (meta.description) m.description = meta.description;
    else delete m.description;
    // "./" resolves to the site root, which only serves a page when index.html
    // exists. For a project whose entry is some other file, an installed app
    // launched at "./" would open a 404 — so the entry file itself is the
    // start_url (meta.startUrl, set by the orchestrator).
    m.start_url = meta.startUrl || './';
    m.scope = './';
    m.background_color = meta.backgroundColor;
    m.theme_color = meta.themeColor;
    m.icons = [
        { src: ICON_FILES.any192, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: ICON_FILES.any512, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: ICON_FILES.maskable512, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ];
    // Ownership marker. "manifest.json" is a perfectly ordinary filename for
    // app data (asset manifests, plugin manifests), and we overwrite this file
    // whenever the app's identity changes — so we must be able to tell OUR file
    // from one that was already there. Unknown members are ignored by every
    // manifest parser. See isGeneratedManifest.
    m.generator = GENERATOR_TAG;
    return JSON.stringify(m, null, 2) + '\n';
};

// Is this manifest.json ours to rewrite? Anything we can't positively identify
// — a foreign manifest, app data that happens to share the name, or a file we
// can't parse — is left alone, and the whole project opts out (see
// ensureAppManifestInner): linking OUR block at THEIR file would be worse than
// doing nothing.
window.isGeneratedManifest = function (text) {
    if (typeof text !== 'string' || !text.trim()) return false;
    try { return JSON.parse(text).generator === GENERATOR_TAG; }
    catch (e) { return false; }
};

// Does this page already carry a hand-written manifest link (one the model or
// user wrote, outside our block)? If so we stay out of the way completely — the
// app has its own PWA setup and ours would fight it.
function hasForeignManifestLink(html) {
    const withoutOurs = replacePwaBlocks(String(html), '');
    return /<link\b[^>]*\brel\s*=\s*["'][^"']*\bmanifest\b[^"']*["']/i.test(withoutOurs);
}
window.hasForeignManifestLink = hasForeignManifestLink;

// Matches one generated block TOGETHER with the whitespace hugging it on both
// sides; callers replace it with a single "\n". That, plus the two canonical
// insertion points below (which absorb the whitespace at the seam), is what
// makes stamping a fixed point: strip-then-stamp reproduces the previous bytes
// exactly. It has to — this runs on every preview refresh, so any leftover
// newline would grow the user's HTML by a line per turn, forever.
// The body may not run through a SECOND start marker. Without that, a page
// left with an orphaned start marker (the model rewrote the head and dropped
// the end of the block) had the next stamp match from the orphan to the FIRST
// end marker — swallowing everything in between, i.e. the user's own <title>,
// stylesheets and scripts. An orphan is now left alone as an inert comment.
//
// This used to be one regex with a leading `[ \t]*\r?\n?[ \t]*`. Two adjacent
// optional whitespace groups backtrack O(k²) from every start position inside a
// run of k spaces — O(k³) per run — and the engine tries every position in the
// document, body included. A <pre> holding a padded fixed-width table (200
// lines × 300 spaces, ordinary model output) cost over a second PER PASS, with
// ~5 passes per preview refresh including the mid-turn ones. The markers are
// now located with linear regexes and the seam walked by hand; the output is
// byte-identical to what the regex produced (test-manifest.mjs pins the
// fixed-point cases).
const PWA_START_RE = /<!-- puter-pwa: generated, do not edit -->/gi;
const PWA_START_PREFIX_RE = /<!-- puter-pwa: generated/gi;
const PWA_END_RE = /<!-- \/puter-pwa -->/gi;

// The whitespace seam the old regex swallowed on each side of the block:
// `[ \t]*\r?\n?[ \t]*` — spaces/tabs, at most ONE line break, spaces/tabs.
// seamStart walks it backwards from `i` (leftmost possible start, as the
// regex's leftmost match did); seamEnd walks it forwards (greedy).
function seamStart(s, i) {
    let j = i;
    while (j > 0 && (s[j - 1] === ' ' || s[j - 1] === '\t')) j--;
    if (j > 0 && s[j - 1] === '\n') j--;
    if (j > 0 && s[j - 1] === '\r') j--;
    while (j > 0 && (s[j - 1] === ' ' || s[j - 1] === '\t')) j--;
    return j;
}
function seamEnd(s, i) {
    let j = i;
    while (j < s.length && (s[j] === ' ' || s[j] === '\t')) j++;
    if (j < s.length && s[j] === '\r') j++;
    if (j < s.length && s[j] === '\n') j++;
    while (j < s.length && (s[j] === ' ' || s[j] === '\t')) j++;
    return j;
}

// Replace every generated block — start marker through the FIRST end marker
// after it, plus the seam on both sides — with `replacement`. A start marker
// followed by another start marker before any end marker is an orphan and is
// left alone (see above). Returns the input itself when there is no block.
function replacePwaBlocks(html, replacement) {
    const s = String(html == null ? '' : html);
    let out = '';
    let last = 0;
    let from = 0;
    let found = false;
    while (true) {
        PWA_START_RE.lastIndex = from;
        const start = PWA_START_RE.exec(s);
        if (!start) break;
        const bodyAt = start.index + start[0].length;
        PWA_END_RE.lastIndex = bodyAt;
        const end = PWA_END_RE.exec(s);
        if (!end) break; // no end marker anywhere after this start: nothing more to strip
        PWA_START_PREFIX_RE.lastIndex = bodyAt;
        const next = PWA_START_PREFIX_RE.exec(s);
        if (next && next.index < end.index) { from = next.index; continue; } // orphan
        const a = Math.max(last, seamStart(s, start.index));
        const b = seamEnd(s, end.index + end[0].length);
        out += s.slice(last, a) + replacement;
        last = b;
        from = b;
        found = true;
    }
    return found ? out + s.slice(last) : s;
}
window.__replacePwaBlocks = replacePwaBlocks;

// Inject (or refresh) the generated <head> block. Returns the new HTML, or null
// when this file must be left alone — no <head> to inject into, or the page
// already has its own manifest link. Idempotent: stamping twice with the same
// meta produces byte-identical output, and stamping after a rename replaces the
// old block rather than appending a second one.
//
// `relPrefix` climbs from the page's directory back to the app root ('' for a
// root page, '../' for pages/about.html, …). The hrefs are RELATIVE — like the
// manifest's own internal URLs, and for the same reason: a root-absolute
// "/manifest.json" only works when the app is served at a domain root. It is on
// *.puter.site, but a DOWNLOADED project opened from disk or rehosted under a
// subpath (e.g. GitHub Pages /repo/) would get a 404 manifest, a broken tab
// icon and a broken apple-touch-icon. Relative hrefs work in all of them.
window.stampManifestTags = function (html, meta, relPrefix) {
    const src = String(html || '');
    if (!/<head\b[^>]*>/i.test(src)) return null;
    if (hasForeignManifestLink(src)) return null;
    const p = relPrefix || '';

    const stripped = replacePwaBlocks(src, '\n');
    const lines = [
        PWA_BLOCK_START,
        `<link rel="manifest" href="${p}manifest.json">`,
    ];
    // The tab icon. Generated apps overwhelmingly ship without one — the tab
    // shows the browser's generic globe and /favicon.ico 404s — and we are
    // already producing exactly the right file, so this is free. Skipped when
    // the app brought its own.
    if (!meta.hasIconLink) {
        lines.push(`<link rel="icon" type="image/png" sizes="192x192" href="${p}${ICON_FILES.any192}">`);
    }
    lines.push(...[
        `<link rel="apple-touch-icon" href="${p}${ICON_FILES.apple180}">`,
        '<meta name="mobile-web-app-capable" content="yes">',
        '<meta name="apple-mobile-web-app-capable" content="yes">',
        '<meta name="apple-mobile-web-app-status-bar-style" content="default">',
        `<meta name="apple-mobile-web-app-title" content="${escapeAttr(meta.shortName)}">`,
    ]);
    // Only supply a theme color when the page doesn't declare its own — the
    // page's tag is the source of truth we derived the manifest from.
    if (!meta.hasThemeColorTag) {
        lines.push(`<meta name="theme-color" content="${escapeAttr(meta.themeColor)}">`);
    }
    lines.push(PWA_BLOCK_END);
    const block = lines.map((l) => '    ' + l).join('\n');

    // Prefer just before </head>; fall back to just after <head> for pages that
    // leave the closing tag off (browsers accept it, so we must too). Both
    // patterns swallow the whitespace at the seam and re-emit it canonically, so
    // the result is identical whether or not a block was just stripped.
    // (Seam walked procedurally for the same backtracking reason as
    // replacePwaBlocks; the result matches the old regex byte for byte.)
    const close = /<\/head\s*>/i.exec(stripped);
    if (close) {
        const a = seamStart(stripped, close.index);
        return stripped.slice(0, a) + '\n' + block + '\n' + close[0] +
            stripped.slice(close.index + close[0].length);
    }
    return stripped.replace(/<head\b[^>]*>[ \t]*\r?\n?[ \t]*/i, (m) =>
        m.trim() + '\n' + block + '\n');
};

// An <img> will not rasterize an SVG that has no intrinsic size in every engine
// (Firefox draws nothing), and the model is told to ship a viewBox without fixed
// dimensions. Give the root element explicit width/height for the raster pass —
// the file on disk is never modified. Returns null if this isn't an SVG.
window.normalizeSvgForRaster = function (svgText, size) {
    const src = String(svgText || '');
    const open = src.match(/<svg\b[^>]*>/i);
    if (!open) return null;
    let tag = open[0];
    tag = tag.replace(/\s(width|height)\s*=\s*(["'])[^"']*\2/gi, '');
    // Sizing via the root's style attribute must go too: style BEATS the
    // width/height attributes we inject below, so a model-written
    // style="width:24px;height:24px" would make the browser decode the art at
    // 24px and drawImage upscale it to 512 — a visibly blurry icon.
    tag = tag.replace(/(\sstyle\s*=\s*)(["'])([^"']*)\2/i, (whole, pre, q, css) =>
        pre + q + css.replace(/\b(?:width|height)\s*:\s*[^;]*;?/gi, '').trim() + q);
    tag = tag.replace(/^<svg/i, `<svg width="${size}" height="${size}"`);
    // No viewBox and no dimensions left: the drawing has no coordinate system we
    // can scale into, so refuse rather than emit a blank icon.
    if (!/\bviewBox\s*=/i.test(tag)) return null;
    return src.slice(0, open.index) + tag + src.slice(open.index + open[0].length);
};

// ---- icon rasterization (DOM) ----------------------------------------------

function loadImage(url, timeoutMs) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const timer = setTimeout(() => { img.src = ''; reject(new Error('icon load timeout')); },
            timeoutMs || 8000);
        img.onload = () => { clearTimeout(timer); resolve(img); };
        img.onerror = () => { clearTimeout(timer); reject(new Error('icon load failed')); };
        img.src = url;
    });
}

function canvasToPngBlob(canvas) {
    return new Promise((resolve) => {
        try { canvas.toBlob((b) => resolve(b || null), 'image/png'); }
        catch (e) { resolve(null); }
    });
}

// Relative luminance, to pick readable ink for the monogram. This has to handle
// named and functional colors, not just hex: `theme-color: black` used to fall
// through to dark ink and render an all-but-invisible letter on a black plate.
function inkFor(background) {
    const c = resolveRgb(background);
    if (!c) return '#111827';
    const lin = (x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
    const L = 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
    return L > 0.5 ? '#111827' : '#ffffff';
}

// One icon. `draw(ctx, box)` paints into the safe box; `background` fills the
// full square first (needed for maskable and iOS, which don't want transparency).
async function renderIcon(size, padding, background, draw) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    if (background) {
        // Never assign an unvalidated color: fillStyle IGNORES an invalid value,
        // leaving the canvas default (black) — so a junk theme-color would paint
        // every plate black instead of falling back to something sane.
        ctx.fillStyle = resolveRgb(background) ? background : DEFAULT_THEME;
        ctx.fillRect(0, 0, size, size);
    }
    const inset = Math.round(size * padding);
    draw(ctx, { x: inset, y: inset, w: size - inset * 2, h: size - inset * 2 });
    return canvasToPngBlob(canvas);
}

// Decode icon.svg ONCE, at the largest size we emit, and reuse that one image
// for every icon: four separate decodes cost four blob URLs, four parses and —
// when the art is broken — four consecutive load timeouts stacked in front of
// the user's preview reload. Downscaling the 512 raster to 192/180 with
// high-quality smoothing is visually indistinguishable from a native raster at
// those sizes. Returns null (→ monogram fallback) if the art is unusable.
const MAX_ICON_PX = 512;
async function loadIconArt(svgText) {
    const normalized = window.normalizeSvgForRaster(svgText, MAX_ICON_PX);
    if (!normalized) return null;
    let url = null;
    try {
        url = URL.createObjectURL(new Blob([normalized], { type: 'image/svg+xml' }));
        const img = await loadImage(url, 5000);
        return { img, release: () => { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } } };
    } catch (e) {
        if (url) { try { URL.revokeObjectURL(url); } catch (e2) { /* ignore */ } }
        return null;
    }
}

// Fallback art: the app's initial on its theme color. Deliberately plain — it
// exists so that an app with no icon.svg (every app built before this feature,
// and any build where the model skipped it) is still installable and doesn't
// show the browser's generic globe.
async function renderMonogramIcon(letter, size, padding, background) {
    const ink = inkFor(background);
    return renderIcon(size, padding, background, (ctx, box) => {
        ctx.fillStyle = ink;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `600 ${Math.round(box.h * 0.62)}px -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
        // Optical centering: textBaseline 'middle' sits slightly high for caps.
        ctx.fillText(letter, box.x + box.w / 2, box.y + box.h / 2 + box.h * 0.03);
    });
}

// First CODE POINT, not first code unit: an astral letter ("𝕹") indexed with
// [0] yields a lone high surrogate, and fillText bakes it into every icon as a
// broken-glyph box.
function monogramLetter(name) {
    const ch = Array.from(collapse(name).replace(/[^\p{L}\p{N}]/gu, ''))[0];
    return (ch || 'A').toUpperCase();
}
// For the tests only — the callers above stay on the private binding.
window.monogramLetter = monogramLetter;

// ---- orchestration ---------------------------------------------------------

// appDir -> signature of the last successful generation, so a turn that changed
// nothing relevant does no IO at all. Session-scoped only; the on-disk checks
// below are what make the skip correct after a reload.
const _lastManifestSig = new Map();

// A "does not exist" filesystem error, as opposed to a real failure (network,
// throttling, a 5xx). Same heuristics as isNotFoundError in app.js, local so
// this file stays self-contained for its test harness.
function isMissingFileError(e) {
    const code = String((e && (e.code || (e.error && e.error.code))) || '');
    if (code) return /not_?found|does_not_exist|subject_does_not_exist/i.test(code);
    const msg = String((e && (e.message || (e.error && e.error.message))) || e || '').toLowerCase();
    return msg.includes('not found') || msg.includes('does not exist') || msg.includes('no such');
}

// null ONLY when the file does not exist; any other failure propagates and
// ends this refresh's pass (ensureAppManifest is best-effort — the next refresh
// retries). Swallowing every error as "absent" let one flaky read of a
// manifest.json we did NOT write skip the foreign-file guard and overwrite it
// with ours — exactly the data loss isGeneratedManifest exists to prevent — or
// revert the merge-preserved fields of our own; and a flaky stat of icon.svg
// re-rendered the monogram over the app's real icon, which then never read as
// newer than those icons again.
async function readText(path) {
    try { return await puter.fs.read(path).then((b) => b.text()); }
    catch (e) { if (isMissingFileError(e)) return null; throw e; }
}

async function statOf(path) {
    try { return await puter.fs.stat(path); }
    catch (e) { if (isMissingFileError(e)) return null; throw e; }
}

// The page whose <title>/description/theme-color define the app's identity.
// index.html by convention; otherwise the alphabetically FIRST root HTML file —
// sorted, not readdir order, because the pick feeds the manifest's name, the
// monogram letter and every page's stamped block: a pick that flapped with
// directory listing order would rewrite all of them on random refreshes.
async function findEntryHtml(appDir) {
    const index = appDir + '/index.html';
    if (await statOf(index)) return index;
    let items;
    try { items = await puter.fs.readdir(appDir); }
    catch (e) { return null; }
    const names = (items || [])
        .filter((it) => !it.is_dir && /\.html?$/i.test(it.name))
        .map((it) => it.name)
        .sort();
    return names.length ? appDir + '/' + names[0] : null;
}

async function writeIcons(appDir, meta, svgText) {
    const letter = monogramLetter(meta.name);
    const bg = meta.backgroundColor || DEFAULT_THEME;
    // mkdir the icons dir up front rather than leaning on createMissingParents:
    // this is the same shape the attachment-save path uses for binary writes,
    // which is the proven one. Ignore "already exists".
    try { await puter.fs.mkdir(appDir + '/icons', { recursive: true }); }
    catch (e) { /* already there */ }
    // Decode the art up front so the "do we have real art?" question is answered
    // once — including for the plate decision below, which was previously made
    // from "is there an icon.svg file" rather than "did it actually render".
    const art = svgText ? await loadIconArt(svgText) : null;
    // "any" icons keep the art transparent when it came from an SVG (nicer on
    // desktop taskbars and dark surfaces); the monogram always needs its plate.
    const anyBg = art ? null : bg;
    const jobs = [
        { file: ICON_FILES.any192, size: 192, padding: 0, background: anyBg },
        { file: ICON_FILES.any512, size: 512, padding: 0, background: anyBg },
        // Maskable art must survive an aggressive circular crop: keep it inside
        // the inner ~80% and paint the plate edge-to-edge.
        { file: ICON_FILES.maskable512, size: 512, padding: 0.14, background: bg },
        // iOS square-crops and dislikes transparency, so this one is opaque too.
        { file: ICON_FILES.apple180, size: 180, padding: 0.08, background: bg },
    ];
    let wrote = 0;
    try {
        for (const job of jobs) {
            let blob = null;
            if (art) {
                blob = await renderIcon(job.size, job.padding, job.background, (ctx, box) => {
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(art.img, box.x, box.y, box.w, box.h);
                });
            }
            if (!blob) blob = await renderMonogramIcon(letter, job.size, job.padding, job.background || bg);
            if (!blob) continue;
            const path = appDir + '/' + job.file;
            const name = job.file.slice(job.file.lastIndexOf('/') + 1);
            // Hand puter.fs a File, not a bare Blob: the SDK's upload path reads
            // a name/type off what it is given (this is what the attachment save
            // path passes), and a named File also lands with the right type.
            const data = (typeof File === 'function') ? new File([blob], name, { type: 'image/png' }) : blob;
            try {
                await window.withFileLock(path, () => puter.fs.write(path, data, { createMissingParents: true }));
                wrote++;
            } catch (e) { /* best effort — a missing icon degrades, it doesn't break */ }
        }
    } finally {
        if (art) art.release();
    }
    return wrote;
}

// Generate/refresh the manifest, icons and <head> tags for the project at
// `appDir`. Best-effort and never throws: this runs inside the preview refresh,
// and a failure here must never cost the user their reload.
window.ensureAppManifest = async function (appDir, opts) {
    if (!window.FEATURE_FLAGS || !window.FEATURE_FLAGS.webManifest) return;
    if (!appDir || typeof puter === 'undefined' || !puter.fs) return;
    if (typeof document === 'undefined') return;
    try { return await ensureAppManifestInner(appDir, opts || {}); }
    catch (e) { return; }
};

// The app's pages, excluding assets/ — attachments saved there are the user's
// own files, never touched (see the attachment save path in app.js).
async function listAppPages(appDir, entryPath) {
    const collect = window.collectPreviewHtmlFiles;
    const htmlFiles = collect ? await collect(appDir, 50) : [entryPath];
    const assetsPrefix = appDir + '/assets/';
    return htmlFiles.filter((p) => !p.startsWith(assetsPrefix));
}

// Strip our generated block from a page's HTML, or null when nothing changes.
// replacePwaBlocks + a "\n" replacement is the exact inverse of stamping, so a
// de-stamped page is byte-identical to its never-stamped self.
function destampedHtml(clean) {
    const stripped = replacePwaBlocks(clean, '\n');
    return stripped === clean ? null : stripped;
}

// A project that opted out (it runs its own PWA setup, or its manifest.json is
// somebody else's file) must not keep OUR block either: the block's manifest
// link would keep pointing the browser — and any install attempt — at a file
// that is no longer the app manifest we wrote. Walk the pages and remove it.
async function destampAppPages(appDir, entryPath) {
    for (const path of await listAppPages(appDir, entryPath)) {
        await window.withFileLock(path, async () => {
            const text = await readText(path);
            if (text == null) return;
            const clean = window.stripPreviewCacheBust ? window.stripPreviewCacheBust(text) : text;
            const out = destampedHtml(clean);
            if (out == null) return;
            try { await puter.fs.write(path, out); } catch (e) { /* best effort */ }
        });
    }
}

async function ensureAppManifestInner(appDir, opts) {
    const entryPath = await findEntryHtml(appDir);
    if (!entryPath) return; // no app yet — nothing to make installable

    const entryHtml = await readText(entryPath);
    if (entryHtml == null) return;
    const cleanEntry = window.stripPreviewCacheBust ? window.stripPreviewCacheBust(entryHtml) : entryHtml;
    // The app runs its own PWA setup — leave every part of it alone, and take
    // back any block we stamped before it did.
    if (hasForeignManifestLink(cleanEntry)) return destampAppPages(appDir, entryPath);

    // A manifest.json we did not write is somebody else's file — the app's own
    // PWA setup, or app data that happens to use the name. Read it before doing
    // anything else and stay out of the project entirely: overwriting it would
    // destroy data, and a block stamped earlier would now point the browser (and
    // any install) at a file that isn't an app manifest — so remove that too.
    const manifestPath = appDir + '/manifest.json';
    const existing = await readText(manifestPath);
    if (existing != null && !window.isGeneratedManifest(existing)) return destampAppPages(appDir, entryPath);

    const meta = window.deriveManifestMeta(cleanEntry, opts.fallbackName);
    // Launch the installed app at the entry page. "./" (the root) only serves
    // something when index.html exists; for any other entry, name the file.
    const entryName = entryPath.slice(appDir.length + 1);
    meta.startUrl = entryName === 'index.html' ? './' : './' + encodeURI(entryName);
    const iconSvgPath = appDir + '/icon.svg';
    const iconSvgStat = await statOf(iconSvgPath);
    const iconStamp = iconSvgStat ? String(iconSvgStat.modified || iconSvgStat.size || '1') : '';

    // The signature gates only the EXPENSIVE half (reading/writing the manifest
    // and re-rendering icons). It deliberately does NOT gate the stamp pass
    // below: the model rewriting a page with the `write` tool drops the block
    // without changing the app's title, theme or icon, so a signature-gated
    // stamp would leave that page — and the whole app, if it is index.html —
    // without its manifest, icons and iOS tags for the rest of the session.
    // The stamp pass is a read-and-compare that writes nothing in the steady
    // state, so running it every refresh is cheap.
    // startUrl is in the signature so a project that gains an index.html (entry
    // changes → start_url changes) regenerates instead of skipping.
    const sig = JSON.stringify([meta.name, meta.shortName, meta.description, meta.themeColor, meta.startUrl, iconStamp]);
    if (_lastManifestSig.get(appDir) !== sig) {
        // The previous generated manifest (isGeneratedManifest upstream
        // guarantees it is ours or absent). Basis for the merge-regeneration
        // AND the icon-regen decision below.
        let prevManifest = null;
        try { prevManifest = existing ? JSON.parse(existing) : null; }
        catch (e) { prevManifest = null; }

        // --- manifest.json ---
        const json = window.buildManifestJson(meta, prevManifest);
        if (existing !== json) {
            await window.withFileLock(manifestPath, () =>
                puter.fs.write(manifestPath, json, { createMissingParents: true }));
        }

        // --- icons ---
        // Re-render only when something the PIXELS depend on moved: the art
        // itself (icon.svg newer than the icons), the plate color, or — for the
        // monogram fallback — the app's initial. Deliberately NOT "the manifest
        // changed at all": a tagline edit rewrites manifest.json but produces
        // byte-identical icons, and every needless re-render costs four uploads
        // and four new blobs inside the next version snapshot.
        let needIcons = !prevManifest;
        if (prevManifest) {
            if (prevManifest.background_color !== meta.backgroundColor) needIcons = true;
            else if (!iconSvgStat &&
                monogramLetter(prevManifest.name || '') !== monogramLetter(meta.name)) needIcons = true;
        }
        let oldestIcon = Infinity;
        for (const rel of Object.values(ICON_FILES)) {
            const st = await statOf(appDir + '/' + rel);
            if (!st) { needIcons = true; break; }
            const m = Number(st.modified);
            if (isFinite(m)) oldestIcon = Math.min(oldestIcon, m);
        }
        if (!needIcons && iconSvgStat && isFinite(Number(iconSvgStat.modified)) && isFinite(oldestIcon)) {
            // >=, not >: the timestamps are whole seconds, and the model
            // routinely writes icon.svg within the same second the first
            // refresh painted the monogram PNGs. A strict comparison then never
            // saw the svg as newer, so the app shipped the monogram instead of
            // its icon until something else about it changed. Equal costs one
            // extra render, after which the icons are strictly newer.
            if (Number(iconSvgStat.modified) >= oldestIcon) needIcons = true;
        }
        if (needIcons) {
            const svgText = iconSvgStat ? await readText(iconSvgPath) : null;
            await writeIcons(appDir, meta, svgText && /<svg\b/i.test(svgText) ? svgText : null);
        }
    }

    // --- <head> tags on every page ---
    // Multi-page apps get the tags everywhere, so installing from any entry
    // point gives the same app identity. Each file is rewritten under its write
    // lock, exactly like applyPreviewCacheBust, so a concurrent AI edit can't be
    // clobbered by our stale buffer.
    for (const path of await listAppPages(appDir, entryPath)) {
        // How far below the app root this page lives, so its hrefs can climb
        // back to the root relatively (see stampManifestTags).
        const rel = path.slice(appDir.length + 1);
        const relPrefix = '../'.repeat(rel.split('/').length - 1);
        await window.withFileLock(path, async () => {
            const text = await readText(path);
            if (text == null) return;
            // Compare against the file with cache-bust tokens REMOVED.
            // applyPreviewCacheBust runs right after us and stamps ?__pcb= onto
            // the very links we write; if we compared raw text, our token-free
            // render would never match what is on disk and we would rewrite
            // every HTML file on every refresh, forever — pure churn, and a
            // needless write racing the model's edits. Comparing stripped-to-
            // stripped makes the steady state a true no-op.
            const clean = window.stripPreviewCacheBust ? window.stripPreviewCacheBust(text) : text;
            const stamped = window.stampManifestTags(clean, meta, relPrefix);
            if (stamped == null) {
                // This page won't take our block (it gained its own manifest
                // link, or lost its <head>). If it still carries a block from
                // an earlier stamp, that block is stale — take it back out.
                const out = destampedHtml(clean);
                if (out != null) {
                    try { await puter.fs.write(path, out); } catch (e) { /* best effort */ }
                }
                return;
            }
            if (stamped === clean) return;
            // Writing the token-free copy is safe: the cache-bust pass that
            // follows recomputes every token from the assets' mtimes anyway.
            try { await puter.fs.write(path, stamped); } catch (e) { /* best effort */ }
        });
    }

    _lastManifestSig.set(appDir, sig);
}

// Version restore swaps the whole directory underneath us, so the cached
// signature no longer describes what is on disk. Called from the restore path.
window.invalidateAppManifestCache = function (appDir) {
    if (appDir) _lastManifestSig.delete(appDir);
    else _lastManifestSig.clear();
};
