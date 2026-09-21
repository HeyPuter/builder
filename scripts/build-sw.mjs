import { createHash } from 'node:crypto';

// Build-time renderer for src/sw.js. The service worker source ships with two
// placeholders that are filled in per build:
//   '__SW_VERSION__'          → a short content hash, so every deploy busts the
//                               old caches on activate.
//   [/*__PRECACHE_MANIFEST__*/] → the list of app-shell URLs to precache, whose
//                               hashed filenames are only known after bundling.
// This is imported by BOTH vite.config.js (to emit dist/sw.js) and
// scripts/test-pwa.mjs (to assert the contract), so the two can never drift.

export const SW_VERSION_TOKEN = "'__SW_VERSION__'";
export const SW_PRECACHE_TOKEN = '/*__PRECACHE_MANIFEST__*/';

// Deterministic short hash of any set of strings. Used to derive the cache
// version from the worker source + the precache list, so it changes iff the
// shipped shell changes.
export function swVersion(...parts) {
  const h = createHash('sha256');
  for (const p of parts) h.update(String(p));
  return h.digest('hex').slice(0, 12);
}

// Returns the final service-worker source with both placeholders replaced.
// Throws if either placeholder is missing (source drifted) or still present
// after substitution (replacement failed) — a broken SW must fail the build,
// never ship silently.
export function renderServiceWorker(source, { version, precache }) {
  if (typeof source !== 'string') throw new Error('sw source must be a string');
  if (!version) throw new Error('sw version is required');
  if (!Array.isArray(precache)) throw new Error('precache must be an array');

  if (!source.includes(SW_VERSION_TOKEN)) {
    throw new Error('sw.js is missing the ' + SW_VERSION_TOKEN + ' placeholder');
  }
  if (!source.includes(SW_PRECACHE_TOKEN)) {
    throw new Error('sw.js is missing the ' + SW_PRECACHE_TOKEN + ' placeholder');
  }

  // Stable, de-duplicated order so the injected list (and thus the version, when
  // derived from it) is deterministic across builds of identical input.
  const urls = [...new Set(precache)].sort();
  const list = urls.map((u) => JSON.stringify(u)).join(', ');

  const out = source
    .replace(SW_VERSION_TOKEN, JSON.stringify(String(version)))
    .replace(SW_PRECACHE_TOKEN, list);

  if (out.includes('__SW_VERSION__') || out.includes('__PRECACHE_MANIFEST__')) {
    throw new Error('sw.js still contains a placeholder after rendering');
  }
  return out;
}
