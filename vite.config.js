import { defineConfig } from 'vite';
import { transform } from 'esbuild';
import sharp from 'sharp';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderServiceWorker, swVersion } from './scripts/build-sw.mjs';
import {
  PAGES as SEO_PAGES,
  renderPage as renderSeoPage,
  renderSitemap,
  renderLlmsTxt,
  renderHomeGraph,
  ogKey,
  plain as seoPlain,
} from './scripts/build-seo.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, 'src');
// Where the build writes. Every closeBundle emission below (runtime.js, the
// verbatim copies, sw.js, the SEO pages, the OG cards) uses this rather than a
// literal 'dist', so `vite build --outDir …` produces ONE coherent tree instead
// of splitting the hashed bundles from everything else (which also failed on a
// fresh clone with no dist/). Re-pointed from the resolved config; the literal
// is only the fallback until then.
let OUT_DIR = path.resolve(__dirname, 'dist');

// The local JS files, in the exact load order they had as <script> tags in
// index.html. These files share a single global scope by load order (no
// import/export), so the bundle MUST keep that order and stay a classic,
// non-module script — see classicBundle() below.
const SCRIPTS = [
  'js/helpers.js',
  // Shared with the marketing pages (inlined there by seoPagesPlugin): the
  // composer handoff store both sides read and write.
  'js/handoff.js',
  'js/manifest.js',
  'js/publish-state.js',
  'js/publish-errors.js',
  'js/issues-core.js',
  'js/worker-ownership.js',
  'js/tools.js',
  'js/ui.js',
  'js/featured.js',
  'tools/fs/stat.js',
  'tools/fs/mkdir.js',
  'tools/fs/write.js',
  'tools/fs/edit.js',
  'tools/fs/multi_edit.js',
  'tools/fs/delete.js',
  'tools/fs/read.js',
  'tools/fs/view_image.js',
  'tools/fs/view_document.js',
  'tools/fs/rename.js',
  'tools/fs/copy.js',
  'tools/fs/move.js',
  'tools/fs/readdir.js',
  'tools/fs/search_files.js',
  'tools/apps_and_sites/publish_site.js',
  'tools/apps_and_sites/update_preview.js',
  'tools/chat_ui/todo.js',
  'tools/chat_ui/clarify.js',
  'tools/chat_ui/suggest.js',
  'tools/workers/create_worker.js',
  'tools/workers/delete_worker.js',
  'tools/workers/list_workers.js',
  'tools/workers/get_worker.js',
  'tools/external_info/external_fetch.js',
  'js/prompt.js',
  'js/dragdrop.js',
  'js/handleMessageStream.js',
  'js/app.js',
  'js/versions.js',
  'js/issues.js',
  // PWA runtime (SW registration + update/install UX). Last so window.showToast
  // and the rest of the app are already defined; runs its work after `load`.
  'js/pwa.js',
];

// Every URL the generated-app runtime (src/runtime.js) must be reachable at.
// /runtime.js is what the prompt bakes today; /badge.js is the legacy path that
// apps generated before 2026-07-29 carry in HTML we cannot rewrite. Both are
// written from the same bytes — never remove the legacy entry.
const RUNTIME_PATHS = ['runtime.js', 'badge.js'];

// Third-party libraries that used to load from a CDN, now vendored locally
// (see scripts/fetch-vendor.mjs). They expose the globals the app scripts rely
// on ($, marked, hljs, JSZip), so they MUST load before the app bundle. They
// are already minified — we concatenate them verbatim (no re-minify). puter.js
// is intentionally absent: it stays a CDN <script> tag in index.html.
const VENDOR_SCRIPTS = [
  'vendor/highlight.min.js',
  'vendor/marked.umd.min.js',
  'vendor/jszip.min.js',
  'vendor/jquery.min.js',
];

// Read one boolean out of window.FEATURE_FLAGS in src/js/helpers.js, which stays
// the single source of truth for flags (see its header). Build steps that exist
// ONLY to feed a flagged feature can then skip their work when it's off, instead
// of shipping data nothing fetches. A flag we can't parse defaults to ON: the
// runtime guard is the real kill switch, so guessing wrong here can only cost
// build time — never leak a disabled feature into the UI.
function featureFlag(name) {
  try {
    const src = fs.readFileSync(path.join(SRC, 'js/helpers.js'), 'utf8');
    const m = src.match(new RegExp(`^\\s*${name}:\\s*(true|false)\\s*,`, 'm'));
    if (m) return m[1] === 'true';
    console.warn(`[feature-flags] could not read FEATURE_FLAGS.${name} — assuming enabled`);
  } catch (e) {
    console.warn(`[feature-flags] could not read src/js/helpers.js (${e.message}) — assuming ${name} enabled`);
  }
  return true;
}

// Recursively copy a directory (used for /icons, referenced by literal runtime
// paths and therefore not part of the module graph — must ship verbatim).
function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

/**
 * Bundles the load-order-dependent classic scripts.
 *  - dev:   inject the individual <script src> tags (Vite serves them raw),
 *           vendor libs first so their globals exist before the app runs.
 *  - build: emit two content-hashed classic scripts — one vendor bundle (libs
 *           concatenated verbatim) and one app bundle (concatenated in order,
 *           minified whitespace/syntax ONLY; identifiers preserved so implicit
 *           globals / typeof checks keep working) — and inject the vendor tag
 *           before the app tag.
 */
function classicBundle() {
  return {
    name: 'classic-script-bundle',
    configResolved(config) {
      OUT_DIR = path.resolve(config.root, config.build.outDir);
    },
    async buildStart() {
      // Build only: produce the concatenated bundles.
      if (this.meta.watchMode) return; // skip during `vite serve`

      // Vendor libs: already minified, concatenate verbatim (no re-minify) —
      // minus any `//# sourceMappingURL=` / `//# sourceURL=` magic comment.
      // marked's points at a jsDelivr-relative /sm/….map, and V8 honours the
      // LAST such comment anywhere in a script, so the concatenated bundle sent
      // every DevTools session after a map that does not exist on our origin
      // (a 404 plus a "failed to load source map" warning); a map that did load
      // would be line-offset garbage for a concatenated file anyway.
      const stripMagicComments = (code) => code.replace(/^[ \t]*\/\/[#@]\s*source(?:Mapping)?URL=.*$/gm, '');
      const vendor = VENDOR_SCRIPTS.map(
        (rel) => `/* ${rel} */\n${stripMagicComments(fs.readFileSync(path.join(SRC, rel), 'utf8'))}`,
      ).join('\n;\n');
      this.emitFile({ type: 'asset', name: 'vendor.js', source: vendor });

      const parts = [];
      for (const rel of SCRIPTS) {
        parts.push(`/* ${rel} */`);
        parts.push(fs.readFileSync(path.join(SRC, rel), 'utf8'));
      }
      const combined = parts.join('\n;\n');
      const { code } = await transform(combined, {
        // Keep it a sloppy-mode classic script: no ESM, no "use strict".
        minifyWhitespace: true,
        minifySyntax: true,
        minifyIdentifiers: false, // critical: preserve global names
        legalComments: 'none',
        target: 'es2020',
      });
      this.emitFile({ type: 'asset', name: 'app.js', source: code });
    },
    transformIndexHtml(html, ctx) {
      if (ctx.server) {
        // Dev server: classic scripts, in order, served statically by Vite.
        // Vendor libs precede the app scripts.
        return [...VENDOR_SCRIPTS, ...SCRIPTS].map((s) => ({
          tag: 'script',
          attrs: { src: `/${s}` },
          injectTo: 'head',
        }));
      }
      // Build: hashed vendor bundle then hashed app bundle (both classic
      // scripts; vendor runs first so its globals exist for the app).
      const find = (re) => Object.keys(ctx.bundle || {}).find((f) => re.test(f));
      const vendorFile = find(/(^|\/)vendor-[^/]+\.js$/);
      const appFile = find(/(^|\/)app-[^/]+\.js$/);
      return [vendorFile, appFile].map((fileName) => ({
        tag: 'script',
        attrs: { src: `/${fileName}` },
        injectTo: 'head',
      }));
    },
    async closeBundle() {
      // The Puter runtime script — the "Made with Puter" badge plus the
      // click-to-edit bridge — loaded by every generated app via an absolute
      // <script src> URL (see src/runtime.js), so it must ship at stable,
      // unhashed paths. Minified here with the same whitespace/syntax-only rules
      // as the app bundle — except identifiers, which ARE safe to mangle: it's
      // self-contained IIFEs with no cross-file globals.
      //
      // It ships under BOTH names, byte-identical: /runtime.js is canonical, and
      // /badge.js is the legacy path baked into every app generated before
      // 2026-07-29 — that HTML lives on user storage we cannot rewrite, so
      // dropping the alias would kill their badge and picker. One read, two
      // writes, so the two can never drift apart.
      const runtimeSrc = path.join(SRC, 'runtime.js');
      if (fs.existsSync(runtimeSrc)) {
        const { code } = await transform(fs.readFileSync(runtimeSrc, 'utf8'), {
          minifyWhitespace: true,
          minifySyntax: true,
          minifyIdentifiers: true,
          legalComments: 'none',
          target: 'es2020',
        });
        for (const name of RUNTIME_PATHS) {
          fs.writeFileSync(path.join(OUT_DIR, name), code);
        }
      }
      // Keep third-party notices with every distribution of the built assets.
      for (const name of ['LICENSE', 'THIRD_PARTY_NOTICES.md']) {
        fs.copyFileSync(path.join(__dirname, name), path.join(OUT_DIR, name));
      }
      copyDir(path.join(__dirname, 'licenses'), path.join(OUT_DIR, 'licenses'));

      // Ship the runtime-referenced icons verbatim.
      const iconsSrc = path.join(SRC, 'icons');
      if (fs.existsSync(iconsSrc)) {
        copyDir(iconsSrc, path.join(OUT_DIR, 'icons'));
      }
      // Ship favicons / platform icons + manifest with stable (unhashed) paths,
      // so the manifest's internal icon URLs keep resolving.
      const faviconsSrc = path.join(SRC, 'favicons');
      if (fs.existsSync(faviconsSrc)) {
        copyDir(faviconsSrc, path.join(OUT_DIR, 'favicons'));
      }
      // PWA install-prompt screenshots (manifest) and curated featured-feed
      // thumbnails (screenshots/featured/, referenced by explicit "thumbnail"
      // overrides in featured.json) — both referenced by absolute
      // /screenshots/… URLs, so ship them verbatim at stable (unhashed) paths.
      const screenshotsSrc = path.join(SRC, 'screenshots');
      if (fs.existsSync(screenshotsSrc)) {
        copyDir(screenshotsSrc, path.join(OUT_DIR, 'screenshots'));
      }
      // Social-card image, referenced by an absolute URL in the OG/Twitter meta
      // tags — ship it verbatim at a stable (unhashed) path.
      const ogImageSrc = path.join(SRC, 'og-image.png');
      if (fs.existsSync(ogImageSrc)) {
        fs.copyFileSync(ogImageSrc, path.join(OUT_DIR, 'og-image.png'));
      }
      // robots.txt plus the logo, which is fetched by external consumers at its
      // bare URL. Served from the site root at stable, unhashed paths.
      // (featured.json is NOT copied here — featuredFeedPlugin ships a processed
      // version of it instead. sitemap.xml is not here either: seoPagesPlugin
      // GENERATES it from the page registry, so it can never fall out of sync
      // with the pages that actually shipped.)
      for (const f of ['robots.txt', 'puter-logo.png']) {
        const src = path.join(SRC, f);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(OUT_DIR, f));
        }
      }
    },
  };
}

/**
 * Community-feed data + thumbnails (src/featured.json, rendered by
 * js/featured.js).
 *
 * Puter hosting auto-captures a screenshot of every hosted site at
 * /.puter/screenshots/index.png. At BUILD time this plugin snapshots that
 * capture for each featured item into dist/featured-thumbs/<id>-<hash>.webp
 * (content-hashed, so redeploys can never serve a stale image through an edge
 * cache) and ships a processed featured.json whose "thumbnail" fields point at
 * the local copies — the feed then serves stable, first-party images instead
 * of hotlinking third-party hosts that may change or vanish.
 *
 * The snapshot is also NORMALIZED, not copied verbatim. Raw captures are
 * 1280×800 while the cards render at ~215–290 CSS px, and a ~5:1 downscale
 * through the browser's mipmap filtering turns screenshot text to mush.
 * Normalizing crops to the card's exact 756×391 box (top-center, mirroring
 * the CSS object-fit/object-position on .feed-thumb) and Lanczos-resizes to
 * ~2× the rendered size, so the browser's remaining downscale is small enough
 * to stay crisp. WebP because a downscaled screenshot re-encodes ~10× smaller
 * than PNG (resampling anti-aliases every edge, defeating PNG compression).
 *
 * Precedence: an explicit "thumbnail" in src/featured.json is a curator
 * override and is passed through verbatim; only items without one get the
 * .puter pull. A failed pull (external domain, 404, non-image response — some
 * hosts return 200 text/html for unknown paths, hence the content-type guard)
 * warns and ships the item without a thumbnail: the runtime renders its
 * gradient placeholder and the build NEVER fails over a screenshot.
 *
 * Dev parity: `vite serve` rewrites thumbnail-less items to /featured-thumbs/
 * URLs served by a middleware that pulls the live .puter capture and runs the
 * SAME normalization (cached per dev session), so the feed looks — and
 * measures — the same as a build.
 *
 * Gated on FEATURE_FLAGS.featuredFeed: with the feed off, nothing fetches
 * featured.json, so both hooks no-op — no screenshot pulls (a dozen-plus network
 * round trips + re-encodes per build) and no dist/featured.json.
 */
function featuredFeedPlugin() {
  const enabled = featureFlag('featuredFeed');
  const PUTER_SHOT_PATH = '/.puter/screenshots/index.png';
  // Keep in sync with .feed-thumb's aspect-ratio in styles.css.
  const THUMB_WIDTH = 756;
  const THUMB_HEIGHT = 391;
  const readFeed = () => {
    const file = path.join(SRC, 'featured.json');
    if (!fs.existsSync(file)) return null;
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!Array.isArray(data.items)) data.items = [];
      return data;
    } catch (e) {
      console.warn(`[featured-feed] src/featured.json is invalid JSON: ${e.message}`);
      return null;
    }
  };
  const shotUrlFor = (item) => {
    try { return new URL(PUTER_SHOT_PATH, item.url).href; } catch (e) { return ''; }
  };
  const slugFor = (item) => String(item.id || item.name || 'app')
    .toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'app';

  // Pull a .puter capture with the same guards in build and dev: some hosts
  // return 200 text/html for unknown paths, hence the content-type check.
  const pullShot = async (url) => {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (!type.startsWith('image/')) throw new Error(`not an image (${type || 'no content-type'})`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100) throw new Error('response too small to be a screenshot');
    return buf;
  };

  // Crop + downscale to the card's box (see the header comment for why).
  // `position: 'top'` mirrors the CSS object-position; withoutEnlargement
  // keeps an undersized capture from being blurred UP to the target size.
  const normalizeThumb = (buf) => sharp(buf)
    .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover', position: 'top', withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer();

  return {
    name: 'featured-feed',
    // Dev: intercept /featured.json to point thumbnail-less items at
    // /featured-thumbs/<slug>.webp, and serve those by pulling the live
    // .puter capture through the same normalization as a build.
    configureServer(server) {
      if (!enabled) return;
      // Normalized thumbs are kept for the dev-server session — without this
      // every landing reload would re-pull and re-encode each screenshot.
      const devThumbCache = new Map();
      server.middlewares.use((req, res, next) => {
        const urlPath = (req.url || '').split('?')[0];
        if (urlPath === '/featured.json') {
          const data = readFeed();
          if (!data) return next();
          for (const item of data.items) {
            if (item && !item.thumbnail && item.url && shotUrlFor(item)) {
              item.thumbnail = `/featured-thumbs/${slugFor(item)}.webp`;
            }
          }
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Cache-Control', 'no-store');
          return res.end(JSON.stringify(data));
        }
        const thumb = urlPath.match(/^\/featured-thumbs\/(.+)\.webp$/);
        if (!thumb) return next();
        (async () => {
          const slug = decodeURIComponent(thumb[1]);
          if (!devThumbCache.has(slug)) {
            const items = (readFeed() || {}).items || [];
            const item = items.find(i => i && !i.thumbnail && i.url && slugFor(i) === slug);
            const shot = item ? shotUrlFor(item) : '';
            if (!shot) throw new Error('no such featured item');
            devThumbCache.set(slug, await normalizeThumb(await pullShot(shot)));
          }
          res.setHeader('Content-Type', 'image/webp');
          res.setHeader('Cache-Control', 'no-store');
          res.end(devThumbCache.get(slug));
        })().catch((e) => {
          // 404 → the <img> errors → the runtime paints its gradient
          // placeholder — exactly what a failed pull looks like in a build.
          res.statusCode = 404;
          res.end(`featured thumb unavailable: ${e.message}`);
        });
      });
    },
    // Build: snapshot + rewrite, then ship the processed feed.
    async closeBundle() {
      if (!enabled) return;
      const data = readFeed();
      if (!data) return;
      const thumbsDir = path.join(OUT_DIR, 'featured-thumbs');
      await Promise.all(data.items.map(async (item) => {
        if (!item || item.thumbnail || !item.url) return; // override wins / nothing to derive
        const shot = shotUrlFor(item);
        if (!shot) return;
        try {
          const raw = await pullShot(shot);
          // A capture sharp can't decode still ships raw — unprocessed beats
          // no thumbnail, and the build NEVER fails over a screenshot.
          let buf = raw, ext = 'png';
          try {
            buf = await normalizeThumb(raw);
            ext = 'webp';
          } catch (e) {
            console.warn(`[featured-feed] "${item.id || item.name}": could not normalize screenshot (${e.message}) — shipping it as captured`);
          }
          const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
          const file = `${slugFor(item)}-${hash}.${ext}`;
          fs.mkdirSync(thumbsDir, { recursive: true });
          fs.writeFileSync(path.join(thumbsDir, file), buf);
          item.thumbnail = `/featured-thumbs/${file}`;
        } catch (e) {
          console.warn(`[featured-feed] "${item.id || item.name}": no .puter screenshot (${shot}): ${e.message} — shipping without a thumbnail`);
        }
      }));
      fs.writeFileSync(path.join(OUT_DIR, 'featured.json'), JSON.stringify(data, null, 2));
    },
  };
}

/**
 * Ships the offline fallback page and writes the service worker (dist/sw.js).
 * Runs in closeBundle — AFTER every asset (and the verbatim favicons copied by
 * classicBundle) is on disk — so the precache list is built by scanning the real
 * output. That keeps the list truthful: it can never reference Vite's empty
 * index.html facade chunk (a pure-CSS entry that is listed in the in-memory
 * bundle but never written), which would 404 on install. sw.js is written at the
 * ROOT with a stable (unhashed) name so it can claim the whole origin scope.
 * The SW is a build-only artifact; in `vite dev` js/pwa.js tears any worker down
 * so the dev server always serves live bytes.
 */
function pwaPlugin() {
  return {
    name: 'pwa-service-worker',
    // Order after classicBundle so its favicon/offline copies have landed.
    // `enforce: 'post'` only orders the plugin list; closeBundle is a PARALLEL
    // hook, so rollup starts every plugin's handler back to back and this one
    // ran its existsSync checks while classicBundle was still awaiting the
    // runtime.js minify — before it had copied favicons/. Every PWA icon was
    // silently dropped from the precache list. `sequential: true` makes rollup
    // await the earlier handlers before running this one.
    enforce: 'post',
    closeBundle: {
      sequential: true,
      handler() {
        // Ship the self-contained offline page first — it must exist on disk to be
        // both precached and served by the worker.
        const offlineSrc = path.join(SRC, 'offline.html');
        if (fs.existsSync(offlineSrc)) {
          fs.copyFileSync(offlineSrc, path.join(OUT_DIR, 'offline.html'));
        }

        // The executable shell: hashed JS/CSS/manifest actually on disk. Fonts and
        // images (also under /assets) are left to the SW's runtime cache-first path
        // to keep the install small and fast.
        const assetsDir = path.join(OUT_DIR, 'assets');
        const hashedShell = fs.existsSync(assetsDir)
          ? fs.readdirSync(assetsDir)
              .filter((f) => /\.(js|css|webmanifest)$/i.test(f))
              .map((f) => '/assets/' + f)
          : [];

        // Stable-path shell files (copied verbatim). Only precache the ones that
        // truly exist so the list never points at a missing file.
        const staticShell = [
          '/',
          '/index.html',
          '/offline.html',
          '/favicons/icon-192.png',
          '/favicons/icon-512.png',
          '/favicons/maskable-192.png',
          '/favicons/maskable-512.png',
          '/favicons/apple-touch-icon.png',
        ].filter((u) => u === '/' || fs.existsSync(path.join(OUT_DIR, u)));

        const precache = [...new Set([...staticShell, ...hashedShell])];

        const swSrc = fs.readFileSync(path.join(SRC, 'sw.js'), 'utf8');
        // Version tracks the worker logic, the precached set AND the bytes of
        // the stable-path shell files (offline.html, the icons): the worker
        // serves those cache-first, so a deploy that changes one of them without
        // renaming a bundle must still install a new worker — hashing only the
        // URL list left such a deploy invisible to every returning user.
        const shellDigest = staticShell
          .filter((u) => u !== '/')
          .map((u) => crypto.createHash('sha256').update(fs.readFileSync(path.join(OUT_DIR, u))).digest('hex'))
          .join('\n');
        const version = swVersion(swSrc, precache.slice().sort().join('\n'), shellDigest);
        const source = renderServiceWorker(swSrc, { version, precache });
        fs.writeFileSync(path.join(OUT_DIR, 'sw.js'), source);
      },
    },
  };
}

/**
 * The static marketing/SEO pages (src/content/), plus the crawl files derived from
 * them.
 *
 * Why these are separate documents rather than routes in the app: the builder is
 * a single-page app whose entire body is written by JavaScript at runtime. That
 * is right for a tool and wrong for a landing page — a crawler, a link preview
 * bot, or a language model answering "what can build me an app from a
 * description?" should get the full text in the first response, not a shell plus
 * a bundle. So each page is rendered at BUILD time into dist/<slug>/index.html:
 * one request, no JavaScript required, nothing to hydrate.
 *
 * The URL shape is dictated by the host. builder.puter.com is served from S3
 * behind CloudFront, which resolves <path>/index.html for a directory URL and
 * 301s the slash-less form to it. So /ai-app-builder/ is the URL that answers
 * without a redirect, and every canonical, sitemap entry and internal link uses
 * that trailing-slash form (see urlFor() in src/content/site.js).
 *
 * Everything on the page is inlined or first-party: the stylesheet is embedded
 * in the document and the one font is self-hosted under a content-hashed name.
 * These pages therefore paint with zero blocking round trips beyond the HTML
 * itself, which is both a ranking input and the difference between a landing
 * page that works on a train and one that does not.
 *
 * In `vite serve` the same renderer runs per-request through a middleware, so
 * dev and production render from identical code.
 */
function seoPagesPlugin() {
  const CONTENT_DIR = path.join(SRC, 'content');
  const bySlug = new Map(SEO_PAGES.map((p) => [p.slug, p]));
  // The homepage is the app itself, which changes with every deploy; the
  // marketing pages carry their own explicit `updated` date instead of a file
  // mtime, which a fresh clone would reset to checkout time.
  const homeUpdated = new Date().toISOString().slice(0, 10);

  const readCss = () => fs.readFileSync(path.join(CONTENT_DIR, 'marketing.css'), 'utf8');
  // The composer handoff helper (src/js/handoff.js) is part of the app bundle
  // AND inlined into every marketing page with a composer, so both sides share
  // one definition of the store a handed-off file travels through.
  const readHandoff = () => fs.readFileSync(path.join(SRC, 'js/handoff.js'), 'utf8');
  const buildHandoff = async () => (await transform(readHandoff(), {
    loader: 'js', minifyWhitespace: true, minifySyntax: true, legalComments: 'none', target: 'es2020',
  })).code;

  // The stylesheet is inlined into every page, so its comments would ship
  // eleven times over. Minified for the build (no target set, so modern syntax
  // like color-mix() is passed through untouched); left verbatim in dev, where
  // being able to read it in devtools is worth more than the bytes.
  const buildCss = async () => (await transform(readCss(), { loader: 'css', minify: true })).code;

  /**
   * Pull the self-hosted Roboto faces out of the vendored Google Fonts CSS.
   * Parsed rather than hardcoded: scripts/fetch-vendor.mjs renumbers the gf-NNN
   * files whenever it re-fetches, so a hardcoded filename would rot silently
   * into a 404 and a fallback-font page nobody notices.
   *
   * Only the latin and latin-ext subsets of the upright variable face are taken
   * — that is ~60KB for the entire weight range these pages use.
   */
  const extractFont = () => {
    const cssPath = path.join(SRC, 'vendor/google-fonts.css');
    if (!fs.existsSync(cssPath)) return { faces: [] };
    const css = fs.readFileSync(cssPath, 'utf8');
    const faces = [];
    const re = /\/\*\s*(latin|latin-ext)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
    let match;
    while ((match = re.exec(css))) {
      const [, subset, block] = match;
      if (!/font-family:\s*'Roboto'/.test(block)) continue;
      if (!/font-style:\s*normal/.test(block)) continue;
      const file = (block.match(/url\(\.\/fonts\/([^)]+)\)/) || [])[1];
      const range = (block.match(/unicode-range:\s*([^;]+);/) || [])[1];
      if (!file || !range) continue;
      const src = path.join(SRC, 'vendor/fonts', file);
      if (!fs.existsSync(src)) continue;
      faces.push({ subset, src, range: range.trim() });
    }
    // latin first: it is the subset that will actually be used, and preloading
    // it is what keeps the headline from swapping fonts mid-read.
    faces.sort((a, b) => (a.subset === 'latin' ? -1 : 1));
    return { faces };
  };

  const fontFaceCss = (entries) => entries.map((entry) =>
    `@font-face{font-family:'Roboto';font-style:normal;font-weight:100 900;` +
    `font-stretch:100%;font-display:swap;src:url(${entry.url}) format('woff2');` +
    `unicode-range:${entry.range};}`,
  ).join('');

  /**
   * Per-page social card, composed to match the site's existing og-image.png:
   * dark ground, the app mark, an accent eyebrow, the page's own tagline.
   *
   * Text is drawn through librsvg's font stack rather than the self-hosted
   * Roboto, since librsvg resolves fonts through the system and cannot use a
   * woff2 we simply have on disk. Helvetica/Arial is close enough in a 1200x630
   * card, and a failure here NEVER fails the build: the shared card is copied to
   * the page's path instead, so the URL in the meta tag always resolves.
   */
  const buildOgImages = async () => {
    const outDir = path.join(OUT_DIR, 'og');
    fs.mkdirSync(outDir, { recursive: true });
    const iconPath = path.join(SRC, 'favicons/app-icon.png');
    const icon = fs.existsSync(iconPath)
      ? await sharp(iconPath).resize(104, 104, { fit: 'contain' }).png().toBuffer()
      : null;

    // Rough advance-width per character for the headline face, used only to
    // decide where to break. Being a little conservative keeps two lines inside
    // the card at every headline we ship.
    const wrap = (text, maxChars) => {
      const words = String(text).split(/\s+/);
      const lines = [''];
      for (const word of words) {
        const candidate = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
        if (candidate.length <= maxChars || !lines[lines.length - 1]) lines[lines.length - 1] = candidate;
        else lines.push(word);
      }
      return lines.slice(0, 2);
    };

    const xmlEscape = (s) => String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    for (const page of SEO_PAGES) {
      const dest = path.join(outDir, `${ogKey(page.slug)}.png`);
      const headline = seoPlain(page.ogTagline || page.hero.h1);
      const eyebrow = (page.hero.eyebrow || 'AI Builder').toUpperCase();
      const lines = wrap(headline, 30);
      const startY = lines.length > 1 ? 386 : 410;
      const family = 'Helvetica Neue, Helvetica, Arial, Liberation Sans, DejaVu Sans, sans-serif';

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
<rect width="1200" height="630" fill="#171c24"/>
<text x="600" y="300" text-anchor="middle" font-family="${xmlEscape(family)}" font-size="21" font-weight="700" letter-spacing="3.4" fill="#6cb0f5">${xmlEscape(eyebrow)}</text>
${lines.map((line, i) =>
        `<text x="600" y="${startY + i * 70}" text-anchor="middle" font-family="${xmlEscape(family)}" font-size="58" font-weight="700" fill="#ffffff">${xmlEscape(line)}</text>`,
      ).join('\n')}
<text x="600" y="546" text-anchor="middle" font-family="${xmlEscape(family)}" font-size="24" font-weight="500" fill="#8b94a0">Free &#183; No code &#183; builder.puter.com</text>
</svg>`;

      try {
        let image = sharp(Buffer.from(svg));
        if (icon) image = image.composite([{ input: icon, top: 132, left: 548 }]);
        await image.png({ compressionLevel: 9 }).toFile(dest);
      } catch (e) {
        console.warn(`[seo] could not render the social card for "${page.slug}" (${e.message}) — using the shared one`);
        const shared = path.join(SRC, 'og-image.png');
        if (fs.existsSync(shared)) fs.copyFileSync(shared, dest);
      }
    }
  };

  return {
    name: 'seo-pages',
    // After classicBundle, whose closeBundle copies the crawl files and the
    // favicons these pages reference.
    enforce: 'post',

    // The app's own structured data. index.html carries a placeholder comment
    // instead of a literal block so the homepage's Organization / WebSite /
    // WebApplication nodes are generated from the SAME objects the marketing
    // pages use (see renderHomeGraph) and cannot drift from them. Runs in dev and
    // in build, so what you inspect locally is what ships.
    transformIndexHtml(html) {
      const marker = '<!--__HOME_JSON_LD__-->';
      if (!html.includes(marker)) {
        console.warn('[seo] index.html is missing the __HOME_JSON_LD__ marker — the homepage will ship without structured data');
        return html;
      }
      return html.replace(
        marker,
        `<script type="application/ld+json">${renderHomeGraph()}</script>`,
      );
    },

    // Dev: render on demand from the same functions the build uses, so a content
    // change is visible on reload and dev/prod can never diverge.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = (req.url || '').split('?')[0];

        if (urlPath === '/sitemap.xml') {
          res.setHeader('Content-Type', 'application/xml');
          return res.end(renderSitemap(SEO_PAGES, { homeUpdated }));
        }
        if (urlPath === '/llms.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.end(renderLlmsTxt(SEO_PAGES));
        }
        // Dev stand-in for the generated cards: the shared image, so link
        // previews resolve without running sharp on every request.
        if (urlPath.startsWith('/og/') && urlPath.endsWith('.png')) {
          const shared = path.join(SRC, 'og-image.png');
          if (!fs.existsSync(shared)) return next();
          res.setHeader('Content-Type', 'image/png');
          return res.end(fs.readFileSync(shared));
        }

        const slug = urlPath.replace(/^\/+|\/+$/g, '');
        const page = bySlug.get(slug);
        if (!page) return next();
        // Mirror the host's redirect so links are exercised in their canonical
        // form during development too.
        if (!urlPath.endsWith('/')) {
          res.statusCode = 301;
          res.setHeader('Location', `/${slug}/`);
          return res.end();
        }

        const { faces } = extractFont();
        const entries = faces.map((f) => ({
          url: `/vendor/fonts/${path.basename(f.src)}`,
          range: f.range,
        }));
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        return res.end(renderSeoPage(page, {
          css: readCss(),
          fontCss: fontFaceCss(entries),
          fontUrl: entries[0] ? entries[0].url : '',
          handoffJs: readHandoff(),
          bySlug,
        }));
      });
    },

    // Sequential for the same reason as pwaPlugin's hook: this must run AFTER
    // classicBundle's copies (a parallel hook would not wait for them).
    closeBundle: {
      sequential: true,
      async handler() {
        // 1. Self-host the font under a content-hashed name.   The service worker
        //    serves same-origin assets cache-first, so a stable filename would
        //    pin a stale font forever; the hash makes a replacement a new URL.
        const { faces } = extractFont();
        const fontsDir = path.join(OUT_DIR, 'fonts');
        const entries = [];
        for (const face of faces) {
          const bytes = fs.readFileSync(face.src);
          const hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 8);
          const name = `roboto-${face.subset}-${hash}.woff2`;
          fs.mkdirSync(fontsDir, { recursive: true });
          fs.writeFileSync(path.join(fontsDir, name), bytes);
          entries.push({ url: `/fonts/${name}`, range: face.range });
        }
        if (!entries.length) {
          console.warn('[seo] no Roboto face found in the vendored fonts — marketing pages will use the system stack');
        }

        // 2. Social cards, before the HTML that points at them.
        await buildOgImages();

        // 3. The pages themselves.
        const css = await buildCss();
        const handoffJs = await buildHandoff();
        const fontCss = fontFaceCss(entries);
        const fontUrl = entries[0] ? entries[0].url : '';
        for (const page of SEO_PAGES) {
          const dir = path.join(OUT_DIR, ...page.slug.split('/'));
          fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(
            path.join(dir, 'index.html'),
            renderSeoPage(page, { css, fontCss, fontUrl, handoffJs, bySlug }),
          );
        }

        // 4. Crawl files, generated from the same registry as the pages.
        fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), renderSitemap(SEO_PAGES, { homeUpdated }));
        fs.writeFileSync(path.join(OUT_DIR, 'llms.txt'), renderLlmsTxt(SEO_PAGES));
      },
    },
  };
}

// Browsers resolve *.localhost to loopback, but the OS resolver used by Node
// may not. Bind to loopback and advertise the browser-friendly hostname instead.
function localDevUrl() {
  return {
    name: 'local-dev-url',
    configureServer(server) {
      for (const method of ['printUrls', 'openBrowser']) {
        const original = server[method].bind(server);
        server[method] = () => {
          if (server.resolvedUrls) {
            server.resolvedUrls.local = server.resolvedUrls.local.map((value) => {
              const url = new URL(value);
              url.hostname = 'builder.puter.localhost';
              return url.href;
            });
          }
          return original();
        };
      }
    },
  };
}

export default defineConfig({
  root: 'src',
  publicDir: false,
  plugins: [localDevUrl(), classicBundle(), featuredFeedPlugin(), pwaPlugin(), seoPagesPlugin()],
  server: {
    host: '127.0.0.1',
    port: 8080,
    open: true,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        // Stable, hashed names for cache-busting.
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
