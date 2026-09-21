/**
 * Fetches every third-party asset the app used to pull from a CDN and writes
 * local copies into src/vendor/, so the build can bundle them instead of
 * linking out to a CDN at runtime. The ONLY thing left on a CDN is puter.js.
 *
 * Run with: node scripts/fetch-vendor.mjs
 *
 * Re-run this whenever you bump a pinned version below. It is intentionally
 * NOT part of `vite build` — the build consumes the static, committed files in
 * src/vendor/ so it stays offline and deterministic.
 * Keep THIRD_PARTY_NOTICES.md and licenses/ in sync when updating these assets.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const VENDOR = path.resolve(__dirname, '../src/vendor');
const FONTS = path.join(VENDOR, 'fonts');

// A modern browser UA so Google Fonts serves woff2 (and variable fonts).
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Plain files copied verbatim: [url, local filename under src/vendor].
const RAW = [
  ['https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js', 'highlight.min.js'],
  ['https://cdn.jsdelivr.net/npm/marked@15.0.6/lib/marked.umd.min.js', 'marked.umd.min.js'],
  ['https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', 'jszip.min.js'],
  ['https://code.jquery.com/jquery-3.7.1.min.js', 'jquery.min.js'],
  [
    'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css',
    'highlight-atom-one-dark.min.css',
  ],
];

// Google Fonts stylesheets: [url, local css filename, font-file prefix]. Each
// references one or more woff2 files which we download and re-point locally.
const FONT_CSS = [
  [
    'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined',
    'material-symbols.css',
    'material-symbols',
  ],
  [
    'https://fonts.googleapis.com/css2?family=Roboto+Mono:ital,wght@0,100..700;1,100..700&family=Roboto:ital,wght@0,100..900;1,100..900&family=Bungee+Shade&display=swap',
    'google-fonts.css',
    'gf',
  ],
];

async function get(url, asBuffer = false) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return asBuffer ? Buffer.from(await res.arrayBuffer()) : res.text();
}

async function main() {
  fs.mkdirSync(FONTS, { recursive: true });

  for (const [url, name] of RAW) {
    process.stdout.write(`• ${name} … `);
    fs.writeFileSync(path.join(VENDOR, name), await get(url, true));
    console.log('ok');
  }

  for (const [url, cssName, prefix] of FONT_CSS) {
    process.stdout.write(`• ${cssName} … `);
    let css = await get(url);

    // Find every woff2 URL, download it, and rewrite the reference to a local
    // relative path. Vite re-fingerprints these as assets at build time.
    const seen = new Map();
    let i = 0;
    const urlRe = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g;
    const matches = [...css.matchAll(urlRe)];
    for (const m of matches) {
      const remote = m[1];
      if (!seen.has(remote)) {
        const file = `${prefix}-${String(++i).padStart(3, '0')}.woff2`;
        fs.writeFileSync(path.join(FONTS, file), await get(remote, true));
        seen.set(remote, file);
      }
      css = css.replace(remote, `./fonts/${seen.get(remote)}`);
    }
    fs.writeFileSync(path.join(VENDOR, cssName), css);
    console.log(`ok (${seen.size} font file${seen.size === 1 ? '' : 's'})`);
  }

  console.log('\nVendored into src/vendor/.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
