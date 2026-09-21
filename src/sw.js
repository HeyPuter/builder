/* AI Builder service worker.
 *
 * Strategy (this is an online AI tool, so the goal is a fast, installable,
 * gracefully-offline SHELL — not offline AI):
 *   - The app shell (index.html, the hashed JS/CSS bundles, the offline page,
 *     the manifest, and the PWA icons) is PRECACHED at install so the app opens
 *     instantly and still boots with no network.
 *   - Same-origin content-hashed assets (/assets/*, /fonts/*, /featured-thumbs/*)
 *     and the precached shell files are served cache-first. The hashed paths
 *     are immutable (the hash changes when the bytes change) and the shell
 *     files' bytes are folded into VERSION at build time, so a cached copy of
 *     either is always correct and never goes stale.
 *   - Every OTHER same-origin file lives at a stable path (featured.json, the
 *     curated screenshots, favicons outside the shell, robots.txt) and a deploy
 *     can change its bytes without changing its URL — so those go network-first
 *     with the cache only as the offline fallback. (Cache-first pinned the first
 *     copy a user ever fetched until the next accepted update, and a deploy that
 *     touched only such files never produced a new worker at all.)
 *   - Navigations are network-first (with navigation preload), falling back to
 *     the cached shell and then the offline page. Returning users always get
 *     fresh HTML when online, but never a blank page when offline.
 *   - Everything cross-origin is bypassed entirely: puter.js, the Puter API and
 *     auth, published/preview iframes, and analytics are never intercepted or
 *     cached. API/auth traffic must always reach the network.
 *
 * The precache list and the cache version are injected at build time — see
 * scripts/build-sw.mjs (renderServiceWorker) and vite.config.js. In the raw
 * source the version is a placeholder string and the precache list is empty; the
 * build replaces both. */

var VERSION = '__SW_VERSION__';
var PRECACHE = [/*__PRECACHE_MANIFEST__*/];
var SHELL_CACHE = 'aibuilder-shell-' + VERSION;
var RUNTIME_CACHE = 'aibuilder-runtime-' + VERSION;
var OFFLINE_URL = '/offline.html';

self.addEventListener('install', function (event) {
  event.waitUntil((async function () {
    var cache = await caches.open(SHELL_CACHE);
    // Add each shell URL independently so a single unreachable asset can't wedge
    // the whole install (which would leave users with no service worker at all).
    // `cache: 'reload'` bypasses the HTTP cache so we precache fresh bytes.
    await Promise.all(PRECACHE.map(function (url) {
      return cache.add(new Request(url, { cache: 'reload' })).catch(function () {});
    }));
  })());
  // Intentionally NOT calling skipWaiting() here: a freshly installed worker
  // waits until the page tells it to activate (see the 'message' handler), so we
  // never swap the asset set out from under a live session. The page surfaces an
  // "update ready" prompt and only then requests activation.
});

self.addEventListener('activate', function (event) {
  event.waitUntil((async function () {
    // Faster network-first navigations where supported.
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) {}
    }
    // Drop caches left behind by older versions of this worker.
    var keys = await caches.keys();
    await Promise.all(keys.map(function (key) {
      if (key !== SHELL_CACHE && key !== RUNTIME_CACHE) return caches.delete(key);
    }));
    await self.clients.claim();
  })());
});

// The page posts this once the user accepts an available update.
self.addEventListener('message', function (event) {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isHtmlNavigation(request) {
  if (request.mode === 'navigate') return true;
  var accept = request.headers.get('accept') || '';
  return request.method === 'GET' && accept.indexOf('text/html') !== -1;
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return; // never touch non-GET (writes, uploads)

  var url;
  try { url = new URL(request.url); } catch (e) { return; }

  // Only our own origin. The puter.js CDN, the Puter API/auth, analytics, and
  // any preview/published iframe on another origin all pass straight through.
  if (url.origin !== self.location.origin) return;

  // Never intercept the worker script itself — let the browser's update flow own
  // it so a new deploy is always picked up.
  if (url.pathname === '/sw.js') return;

  // Navigations: network-first, then this document from cache, then the cached
  // shell, then the offline page.
  if (isHtmlNavigation(request)) {
    event.respondWith((async function () {
      try {
        var preload = await event.preloadResponse;
        var response = preload || (await fetch(request));
        // Keep a copy so a later offline visit gets THIS page back rather than
        // the app shell. Only complete, same-origin successes: the host answers
        // an unknown path with the shell under a 404, and caching that would
        // pin a wrong page at a real URL.
        if (response && response.ok && response.type === 'basic') {
          var runtime = await caches.open(RUNTIME_CACHE);
          runtime.put(request, response.clone());
        }
        return response;
      } catch (e) {
        // Offline. Prefer this exact document if it has ever been cached — the
        // static marketing pages under /ai-app-builder/, /guides/… are separate
        // documents, and handing one of them the app shell instead would be a
        // silent bait and switch. Then the shell, then the offline page.
        var exact = await caches.match(request, { ignoreSearch: true });
        if (exact) return exact;
        var cache = await caches.open(SHELL_CACHE);
        return (await cache.match('/index.html')) ||
               (await cache.match('/')) ||
               (await cache.match(OFFLINE_URL)) ||
               Response.error();
      }
    })());
    return;
  }

  // Immutable assets: cache-first (content-hashed → safe to keep forever), and
  // lazily fill the runtime cache so the app works fully offline after one load.
  if (isImmutable(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  // Stable-path files: network-first, cache as the offline fallback.
  event.respondWith(networkFirst(request));
});

// Content-hashed paths, plus the precached shell (its bytes are part of VERSION).
var IMMUTABLE_PATH_RE = /^\/(assets|fonts|featured-thumbs)\//;
function isImmutable(url) {
  return IMMUTABLE_PATH_RE.test(url.pathname) || PRECACHE.indexOf(url.pathname) !== -1;
}

async function cacheFirst(request) {
  var cached = await caches.match(request);
  if (cached) return cached;
  try {
    var response = await fetch(request);
    // Only cache complete, same-origin ("basic") success responses.
    if (response && response.ok && response.type === 'basic') {
      var cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    // Offline and never cached — last-ditch re-check, else a network error.
    return (await caches.match(request)) || Response.error();
  }
}

async function networkFirst(request) {
  try {
    var response = await fetch(request);
    if (response && response.ok && response.type === 'basic') {
      var cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (e) {
    return (await caches.match(request)) || Response.error();
  }
}
