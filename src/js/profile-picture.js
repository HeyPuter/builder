// profile-picture.js — the signed-in user's Puter profile picture, for the
// toolbar avatar and the account panel header (painted by paintAvatar in
// ui.js, which falls back to the username's initial whenever there is no
// picture to show).
//
// puter.auth.getProfilePicture() resolves to a base64 image data URL, or null
// for "no picture" — and ALSO null when the request simply failed. So:
//   * a picture is shown only after it is validated (an image data URL of a
//     sane size) AND has actually loaded and decoded, so a corrupt payload
//     never paints a broken image and the swap from the initial is one frame;
//   * a null never drops a picture we already have on the strength of one
//     answer: it is re-asked once, and only a second null clears it;
//   * a throw or a hang (bounded by a timeout) is a failure, never "no
//     picture" — whatever is showing stays, and it is retried with backoff.
//
// Caching is stale-while-revalidate. The last good picture is kept per
// username in localStorage, so a reload paints it on the very first frame
// (no initial → picture jitter), and is revalidated in the background once it
// is older than FRESH_MS. Concurrent asks share one request. Other tabs'
// updates arrive through the `storage` event.
//
// Loaded before ui.js (see vite.config.js SCRIPTS); exposes
// window.profilePicture. DOM-free apart from the decode check, so it can be
// exercised with a stub window (see scripts/test-profile-picture.mjs).
(function () {
    'use strict';

    const STORAGE_PREFIX = 'profilePicture:';
    // Revalidate a cached answer (picture or "none") once it is this old.
    const FRESH_MS = 10 * 60 * 1000;
    // getProfilePicture has no timeout of its own; a hung request must not
    // pin the in-flight slot forever.
    const FETCH_TIMEOUT_MS = 15 * 1000;
    // How long the off-DOM load may take before the check counts as a failed
    // attempt (retried) — NOT as a broken picture.
    const LOAD_TIMEOUT_MS = 10 * 1000;
    // How long to wait for the bitmap decode once loaded. Only a warm-up for a
    // jitter-free first paint: a tab the browser isn't painting can stall
    // decode() for seconds, and that says nothing about the image.
    const DECODE_WAIT_MS = 300;
    // Gap before re-asking after a null that would drop a picture we have.
    const CONFIRM_EMPTY_DELAY_MS = 3 * 1000;
    // Retry schedule after failures (throw / timeout), then give up until the
    // next natural trigger (re-render, tab refocus, back online).
    const RETRY_DELAYS_MS = [5 * 1000, 30 * 1000, 2 * 60 * 1000];
    // A data URL longer than this isn't a profile picture we want in memory.
    const MAX_PICTURE_LENGTH = 4 * 1024 * 1024;
    // …and one longer than this isn't worth a slice of the origin's ~5MB
    // localStorage; it is still shown, just not persisted.
    const MAX_PERSISTED_LENGTH = 512 * 1024;

    // Raster formats plus SVG. An SVG rendered through <img> runs no script,
    // so it is as inert as a PNG here.
    const DATA_URL_RE = /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|x-icon|vnd\.microsoft\.icon|svg\+xml);base64,[A-Za-z0-9+/]+={0,2}$/i;

    // username -> { picture, checkedAt, inflight, failures, retryTimer }
    const states = new Map();
    const listeners = new Set();

    function available() {
        try { return typeof window.puter?.auth?.getProfilePicture === 'function'; } catch (e) { return false; }
    }

    function currentUsername() {
        const u = window.user;
        return (u && !u.is_temp && typeof u.username === 'string' && u.username) || '';
    }

    // The canonical form of an API/storage value, or null when it isn't a
    // usable image data URL. Whitespace inside the base64 is legal but
    // pointless, so it is stripped before matching.
    function normalize(value) {
        if (typeof value !== 'string') return null;
        if (value.length > MAX_PICTURE_LENGTH) return null;
        const v = value.replace(/\s+/g, '');
        return DATA_URL_RE.test(v) ? v : null;
    }

    function storageKey(username) {
        return STORAGE_PREFIX + username;
    }

    function readStored(username) {
        let raw = null;
        try { raw = localStorage.getItem(storageKey(username)); } catch (e) { return null; }
        if (!raw) return null;
        try {
            const rec = JSON.parse(raw);
            if (!rec || typeof rec !== 'object') return null;
            const checkedAt = Number(rec.t);
            return {
                picture: rec.p == null ? null : normalize(rec.p),
                // A future timestamp (clock change) would never go stale.
                checkedAt: Number.isFinite(checkedAt) && checkedAt <= Date.now() ? checkedAt : 0,
            };
        } catch (e) {
            return null;
        }
    }

    function writeStored(username, picture, checkedAt) {
        try {
            if (picture && picture.length > MAX_PERSISTED_LENGTH) {
                localStorage.removeItem(storageKey(username));
            } else {
                localStorage.setItem(storageKey(username), JSON.stringify({ p: picture, t: checkedAt }));
            }
        } catch (e) {
            // Quota exceeded or storage blocked — fine, the memory copy stands.
            // Drop any older copy so a reload can't resurrect a stale picture.
            try { localStorage.removeItem(storageKey(username)); } catch (x) {}
        }
    }

    function stateFor(username) {
        let s = states.get(username);
        if (!s) {
            const stored = readStored(username);
            s = {
                picture: stored ? stored.picture : null,
                checkedAt: stored ? stored.checkedAt : 0,
                inflight: null,
                failures: 0,
                retryTimer: null,
            };
            states.set(username, s);
        }
        return s;
    }

    function notify(username, picture) {
        for (const fn of listeners) {
            try { fn(username, picture); } catch (e) { console.error('profilePicture listener failed:', e); }
        }
    }

    function commit(username, s, picture) {
        const changed = s.picture !== picture;
        s.picture = picture;
        s.checkedAt = Date.now();
        writeStored(username, picture, s.checkedAt);
        if (changed) notify(username, picture);
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    // One getProfilePicture call, bounded by FETCH_TIMEOUT_MS. Resolves to the
    // raw value (undefined from an odd SDK counts as null); rejects on a
    // throw, a rejection or the timeout.
    function fetchOnce() {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('getProfilePicture timed out')), FETCH_TIMEOUT_MS);
            let p;
            try {
                p = window.puter.auth.getProfilePicture();
            } catch (e) {
                clearTimeout(timer);
                reject(e);
                return;
            }
            Promise.resolve(p).then(
                (v) => { clearTimeout(timer); resolve(v == null ? null : v); },
                (e) => { clearTimeout(timer); reject(e); }
            );
        });
    }

    // Whether the data URL really is a displayable image: loads it off-DOM
    // (resolves true on load, false on a load error — the only proof of a
    // broken image) and gives the decode a moment, so the <img> painted
    // afterwards usually shows on its first frame. Rejects if the load neither
    // succeeds nor fails in time: that is a failed attempt, retried like a
    // network failure, never cached as "no picture". Without an Image
    // constructor (tests) the format check stands alone.
    function decodes(url) {
        if (typeof window.Image !== 'function') return Promise.resolve(true);
        return new Promise((resolve, reject) => {
            let settled = false;
            const img = new window.Image();
            const finish = (fn, v) => {
                if (settled) return;
                settled = true;
                clearTimeout(timer);
                img.onload = img.onerror = null;
                fn(v);
            };
            const timer = setTimeout(() => finish(reject, new Error('profile picture load timed out')), LOAD_TIMEOUT_MS);
            img.onload = () => {
                // Loaded is proof enough; decode() is only waited on briefly,
                // and its rejection doesn't make a loaded image unusable.
                if (typeof img.decode !== 'function') return finish(resolve, true);
                const done = () => finish(resolve, true);
                img.decode().then(done, done);
                setTimeout(done, DECODE_WAIT_MS);
            };
            img.onerror = () => finish(resolve, false);
            try { img.src = url; } catch (e) { finish(resolve, false); }
        });
    }

    function scheduleRetry(username, s) {
        clearTimeout(s.retryTimer);
        s.retryTimer = null;
        const delay = RETRY_DELAYS_MS[s.failures - 1];
        if (delay == null) return;
        s.retryTimer = setTimeout(() => {
            s.retryTimer = null;
            if (currentUsername() === username) refresh(username, { force: true });
        }, delay);
    }

    async function revalidate(username, s) {
        try {
            let raw = await fetchOnce();
            // getProfilePicture answers null for "failed" too — don't drop a
            // picture we have on one answer. A second null in a row is real.
            if (raw === null && s.picture) {
                await sleep(CONFIRM_EMPTY_DELAY_MS);
                if (currentUsername() !== username) return s.picture;
                raw = await fetchOnce();
            }
            // The SDK asks about whoever is signed in NOW; if that is someone
            // else than when we started, the answer isn't this user's.
            if (currentUsername() !== username) return s.picture;
            let picture = normalize(raw);
            if (picture && picture !== s.picture && !(await decodes(picture))) picture = null;
            if (currentUsername() !== username) return s.picture;
            s.failures = 0;
            clearTimeout(s.retryTimer);
            s.retryTimer = null;
            commit(username, s, picture);
            return picture;
        } catch (e) {
            s.failures++;
            scheduleRetry(username, s);
            return s.picture;
        }
    }

    // The cached picture for `username` (a data URL), or null. Synchronous:
    // safe to call on every render.
    function get(username) {
        if (!username) return null;
        return stateFor(username).picture;
    }

    // Make sure `username`'s picture is fresh: a no-op while the cached
    // answer is younger than FRESH_MS (unless `force`), shares the request
    // already in flight, and never runs for anyone but the signed-in user
    // (the SDK only answers for them). Resolves to the picture or null; never
    // rejects.
    function refresh(username, opts) {
        const force = !!(opts && opts.force);
        if (!username || username !== currentUsername() || !available()) return Promise.resolve(get(username));
        const s = stateFor(username);
        if (s.inflight) return s.inflight;
        if (!force && s.checkedAt && Date.now() - s.checkedAt < FRESH_MS) return Promise.resolve(s.picture);
        // A pending retry owns the next attempt; don't jump its backoff.
        if (!force && s.retryTimer) return Promise.resolve(s.picture);
        if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve(s.picture);
        s.inflight = revalidate(username, s).finally(() => { s.inflight = null; });
        return s.inflight;
    }

    // The painted <img> failed after all (a decode the check let through):
    // forget the picture so nothing keeps re-painting a broken image, and ask
    // again later.
    function invalidate(username, picture) {
        if (!username) return;
        const s = stateFor(username);
        if (!picture || s.picture !== picture) return;
        s.picture = null;
        s.checkedAt = 0;
        try { localStorage.removeItem(storageKey(username)); } catch (e) {}
        notify(username, null);
    }

    // fn(username, picture) whenever a user's picture changes.
    function onChange(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }

    // Forget every cached picture on this device (sign-out).
    function clear() {
        for (const s of states.values()) clearTimeout(s.retryTimer);
        states.clear();
        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith(STORAGE_PREFIX)) keys.push(k);
            }
            keys.forEach((k) => localStorage.removeItem(k));
        } catch (e) {}
    }

    // Another tab revalidated (or signed out): adopt its answer.
    if (typeof window.addEventListener === 'function') {
        window.addEventListener('storage', (e) => {
            if (e.key === null) { states.clear(); return; }
            if (typeof e.key !== 'string' || !e.key.startsWith(STORAGE_PREFIX)) return;
            const username = e.key.slice(STORAGE_PREFIX.length);
            const s = states.get(username);
            if (!s) return;
            const stored = readStored(username);
            const picture = stored ? stored.picture : null;
            s.checkedAt = stored ? stored.checkedAt : 0;
            if (s.picture !== picture) {
                s.picture = picture;
                notify(username, picture);
            }
        });
        // Natural moments to revalidate: back online, and back to the tab
        // (both no-ops while the cache is fresh).
        // Coming back online also cuts short a failure backoff, since the
        // failures were most likely the connection.
        const kick = (afterOutage) => {
            const u = currentUsername();
            if (u) refresh(u, { force: afterOutage && stateFor(u).failures > 0 });
        };
        window.addEventListener('online', () => kick(true));
        if (typeof document !== 'undefined' && document.addEventListener) {
            document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') kick(false); });
        }
    }

    window.profilePicture = { get, refresh, invalidate, onChange, clear, normalize };
})();
