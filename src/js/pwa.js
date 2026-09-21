// PWA runtime: registers the service worker, surfaces an "update ready" prompt
// when a new version has installed, and offers an install affordance driven by
// the beforeinstallprompt event. Everything here runs after `load` so it never
// competes with the app's first paint. Classic global script (see vite.config.js
// SCRIPTS) — no imports; depends only on window.showToast and (optionally)
// window.plausible, both of which load earlier.
(function () {
  if (!('serviceWorker' in navigator)) return;

  var host = location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' ||
                /\.local$/.test(host);
  // Escape hatch to exercise the built worker against `vite preview` (also
  // localhost): visit with ?pwa=force once, or set localStorage.pwaForce = '1'.
  var forced = /[?&]pwa=force\b/.test(location.search);
  try {
    if (forced) localStorage.setItem('pwaForce', '1');
    if (localStorage.getItem('pwaForce') === '1') forced = true;
  } catch (e) {}
  var isDev = isLocal && !forced;

  // In local dev the dev server would serve the raw, unbuilt src/sw.js, and a
  // stale worker left over from a production visit would serve cached bytes and
  // mask changes. Proactively tear any worker + its caches down so `vite dev` is
  // always live, then stop.
  if (isDev) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { r.unregister(); });
    }).catch(function () {});
    if (self.caches && caches.keys) {
      caches.keys().then(function (keys) {
        keys.forEach(function (k) { if (/^aibuilder-/.test(k)) caches.delete(k); });
      }).catch(function () {});
    }
    return;
  }

  function track(name, opts) {
    try { if (window.plausible) window.plausible(name, opts); } catch (e) {}
  }

  function isStandalone() {
    return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
           window.navigator.standalone === true;
  }

  // ---- Update flow -------------------------------------------------------
  // A newly installed worker WAITS (sw.js never self-skips). We tell the user a
  // new version is ready and only activate it — and reload — when they accept,
  // so a live build session is never disrupted mid-turn.
  // Only a user-accepted update should reload the page. The very first install
  // also fires 'controllerchange' (via clients.claim), and that must NOT reload.
  var updateAccepted = false;
  function acceptUpdate(worker) {
    updateAccepted = true;
    worker.postMessage({ type: 'SKIP_WAITING' });
  }
  // The one live update prompt. A long-lived tab can see a second deploy (the
  // hourly reg.update(), or a worker already waiting at registration plus a
  // fresh install): the toast key only throttles, so each prompt used to stack
  // another sticky toast, and the older one's Reload posted SKIP_WAITING to a
  // worker that had since become redundant — nothing activated, no reload, and
  // the toast just went away. Keep a single toast and resolve the target at
  // click time (reg.waiting is always the newest installed worker).
  var updateToast = null;
  function promptUpdate(reg, worker) {
    if (!worker) return;
    if (!window.showToast) { // no UI helper yet: apply on next natural load
      acceptUpdate(worker);
      return;
    }
    if (updateToast && typeof updateToast.dismiss === 'function') updateToast.dismiss();
    updateToast = window.showToast('A new version of AI Builder is available.', {
      type: 'info',
      key: 'pwa-update',
      duration: 0, // sticky until the user chooses
      action: {
        label: 'Reload',
        onClick: function () { acceptUpdate((reg && reg.waiting) || worker); },
      },
    });
  }

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then(function (reg) {
        // A worker already waiting from a previous visit.
        if (reg.waiting && navigator.serviceWorker.controller) promptUpdate(reg, reg.waiting);

        reg.addEventListener('updatefound', function () {
          var installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', function () {
            // "installed" + an existing controller => this is an UPDATE, not the
            // first install. (First install has no controller and shouldn't nag.)
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              promptUpdate(reg, reg.waiting || installing);
            }
          });
        });

        // Catch updates deployed while a long-lived tab stays open.
        setInterval(function () { reg.update().catch(function () {}); }, 60 * 60 * 1000);
      })
      .catch(function () { /* registration failed; the app still works online */ });

    // When the worker the user ACCEPTED takes control, reload once to pick up
    // the new asset set. The first-install claim also fires controllerchange —
    // updateAccepted gates that out so first load never reloads. Guarded to fire
    // at most once.
    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (refreshing || !updateAccepted) return;
      refreshing = true;
      window.location.reload();
    });

    if (isStandalone()) track('PWA Launch', { props: { mode: 'standalone' } });
  });

  // ---- Install flow ------------------------------------------------------
  var deferredPrompt = null;
  var INSTALL_SNOOZE_KEY = 'pwaInstallDismissedAt';
  var SNOOZE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  function snoozed() {
    try {
      var at = parseInt(localStorage.getItem(INSTALL_SNOOZE_KEY) || '0', 10);
      return at && (Date.now() - at) < SNOOZE_MS;
    } catch (e) { return false; }
  }

  // Trigger the native install prompt. Exposed so any future UI (e.g. a menu
  // item) can offer install without re-implementing the plumbing.
  window.promptPWAInstall = function () {
    if (!deferredPrompt) return Promise.resolve(false);
    var p = deferredPrompt;
    deferredPrompt = null;
    p.prompt();
    return p.userChoice.then(function (choice) {
      track('PWA Install Prompt', { props: { outcome: choice.outcome } });
      return choice.outcome === 'accepted';
    }).catch(function () { return false; });
  };
  window.canInstallPWA = function () { return !!deferredPrompt; };

  function offerInstall() {
    if (!deferredPrompt || isStandalone() || snoozed() || !window.showToast) return;
    window.showToast('Install AI Builder for a faster, app-like experience.', {
      type: 'info',
      key: 'pwa-install',
      duration: 0,
      action: {
        label: 'Install',
        onClick: function () { window.promptPWAInstall(); },
      },
      onDismiss: function () {
        try { localStorage.setItem(INSTALL_SNOOZE_KEY, String(Date.now())); } catch (e) {}
      },
    });
    track('PWA Install Offered');
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); // keep the mini-infobar from appearing; we drive it
    deferredPrompt = e;
    offerInstall();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    track('PWA Installed');
  });
})();
