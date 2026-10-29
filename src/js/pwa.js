// PWA runtime: registers the service worker, keeps it current, and offers an
// install affordance driven by the beforeinstallprompt event. Both offers stay
// out of the way of someone typing a prompt. The install toast waits for a
// build turn, and the "new version" toast only reaches a tab that really is
// behind. Everything here runs after `load` so it never competes with the
// app's first paint. Classic global script (see vite.config.js SCRIPTS) — no
// imports; depends only on window.showToast and (optionally) window.plausible,
// both of which load earlier.
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

  // ---- Build turns ---------------------------------------------------------
  // updateSendButtonState (helpers.js), the one place the composer flips
  // between a running turn and idle, reports the turn state here (isProcessing,
  // not the button icon it was asked to draw). The install offer waits
  // for a message to be sent, so it never lands while someone types their
  // first prompt, and an update prompt found mid-turn is held until it ends.
  var turnRunning = false;
  window.pwaTurnChanged = function (processing) {
    processing = !!processing;
    if (processing === turnRunning) return;
    turnRunning = processing;
    if (processing) { offerInstall(); return; }
    if (heldUpdate) {
      var held = heldUpdate;
      heldUpdate = null;
      promptUpdate(held.reg, held.worker);
    }
  };

  // ---- Update flow -------------------------------------------------------
  // A newly installed worker WAITS (sw.js never self-skips). Navigations are
  // network-first, so a visit after a deploy already runs the new bundles
  // while the browser installs the new worker beside them. Telling that user
  // "a new version is available" was false, and it landed right as they went
  // to type. So when another worker turns up, this page asks the live site
  // which bundles it serves now. The worker itself can't say, since it may be
  // older than this page (a stale tab left an old version waiting). A tab still
  // on older bundles (left open across a deploy, or booted from the cached
  // shell while offline) is asked to reload. A current one switches to the
  // worker quietly, which sw.js only does while it is the only open page. When
  // it can't tell, it does neither.
  // Only a user-accepted update reloads the page. Every other takeover also
  // fires 'controllerchange' (the first install's clients.claim, a quiet
  // activation, another tab's accepted update), and that must NOT reload.
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
        onClick: function () {
          var waiting = reg && reg.waiting;
          if (waiting) { acceptUpdate(waiting); return; }
          // Nothing left waiting: another tab already activated this version
          // (its clients.claim() took this tab over too, but only the
          // accepting tab reloads). Messaging the now-active worker changed
          // nothing — no controllerchange, no reload, the toast just closed
          // and this tab kept running the old code. Load the new version.
          window.location.reload();
        },
      },
    });
  }
  // A prompt that comes up while a turn runs waits for it to end.
  var heldUpdate = null;
  function offerUpdate(reg, worker) {
    if (turnRunning) { heldUpdate = { reg: reg, worker: worker }; return; }
    promptUpdate(reg, worker);
  }

  // The same-origin bundles a document loads, as one comparable string.
  function bundlesIn(doc) {
    var urls = [];
    var nodes = doc.querySelectorAll('script[src], link[rel="stylesheet"][href]');
    for (var i = 0; i < nodes.length; i++) {
      var u;
      try { u = new URL(nodes[i].getAttribute('src') || nodes[i].getAttribute('href'), location.href); } catch (e) { continue; }
      if (u.origin === location.origin && /^\/assets\//.test(u.pathname)) urls.push(u.pathname);
    }
    return urls.sort().join('\n');
  }
  // Read now (pwa.js runs at the end of the app bundle in <head>, after every
  // one of them) so a chunk loaded later can't join the list.
  var pageBundles = bundlesIn(document);

  // Resolves true when the live site serves other bundles than this page runs
  // (this tab is behind), false when it serves the same ones, null when it
  // can't tell.
  function pageIsBehind() {
    if (!pageBundles || typeof DOMParser === 'undefined') return Promise.resolve(null);
    // The Accept header makes every version of sw.js treat this as a page load,
    // which goes to the network first. Without it '/' is a precached path and
    // would come from the cache.
    return fetch('/', { cache: 'no-cache', headers: { Accept: 'text/html' } })
      .then(function (res) { return res.ok ? res.text() : null; })
      .then(function (html) {
        var live = html ? bundlesIn(new DOMParser().parseFromString(html, 'text/html')) : '';
        return live ? live !== pageBundles : null;
      })
      .catch(function () { return null; });
  }

  // Another worker turned up, installed or taking over. Prompt a tab that is
  // behind, switch a current one quietly, and leave it be when unsure.
  function checkForUpdate(reg, worker) {
    if (!worker) return;
    pageIsBehind().then(function (behind) {
      if (behind === true) { offerUpdate(reg, worker); return; }
      if (behind === false && worker !== navigator.serviceWorker.controller) {
        try { worker.postMessage({ type: 'SKIP_WAITING_IF_ALONE' }); } catch (e) {}
      }
    });
  }

  var registration = null;
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then(function (reg) {
        registration = reg;
        // A worker already waiting from a previous visit.
        if (reg.waiting && navigator.serviceWorker.controller) checkForUpdate(reg, reg.waiting);

        reg.addEventListener('updatefound', function () {
          var installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', function () {
            // "installed" + an existing controller => this is an UPDATE, not the
            // first install. (First install has no controller and shouldn't nag.)
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              checkForUpdate(reg, reg.waiting || installing);
            }
          });
        });

        // Catch updates deployed while a long-lived tab stays open.
        setInterval(function () { reg.update().catch(function () {}); }, 60 * 60 * 1000);
      })
      .catch(function () { /* registration failed; the app still works online */ });

    // When the worker the user ACCEPTED takes control, reload once to pick up
    // the new asset set. Guarded to fire at most once. Any other takeover may
    // be another tab's accepted update to a version this tab is behind, which
    // would leave it on old bundles with nothing left waiting to announce it.
    var refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!updateAccepted) {
        checkForUpdate(registration, navigator.serviceWorker.controller);
        return;
      }
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    if (isStandalone()) track('PWA Launch', { props: { mode: 'standalone' } });
  });

  // ---- Install flow ------------------------------------------------------
  // Chrome fires beforeinstallprompt seconds after load, right when someone is
  // about to type their first prompt. So the event is kept and the offer shows
  // once they send a message. It closes on its own (a sticky one sat in the
  // corner all session for everyone who ignored it), and it comes back at most
  // once a week, or after 30 days once its × is clicked.
  var deferredPrompt = null;
  var DAY_MS = 24 * 60 * 60 * 1000;
  var INSTALL_SNOOZE_KEY = 'pwaInstallDismissedAt';
  var SNOOZE_MS = 30 * DAY_MS; // after its ×
  var INSTALL_SHOWN_KEY = 'pwaInstallShownAt';
  var REPEAT_MS = 7 * DAY_MS; // after it shows at all
  var INSTALL_TOAST_MS = 8000; // held while the pointer or focus is on it
  var installOffered = false; // once per page load even if storage is blocked
  var installToast = null;

  function within(key, ms) {
    try {
      var at = parseInt(localStorage.getItem(key) || '0', 10);
      return at && (Date.now() - at) < ms;
    } catch (e) { return false; }
  }
  function snoozed() {
    return within(INSTALL_SNOOZE_KEY, SNOOZE_MS) || within(INSTALL_SHOWN_KEY, REPEAT_MS);
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
    if (!turnRunning || installOffered || !deferredPrompt || isStandalone() || snoozed() || !window.showToast) return;
    installOffered = true;
    try { localStorage.setItem(INSTALL_SHOWN_KEY, String(Date.now())); } catch (e) {}
    installToast = window.showToast('Install AI Builder for a faster, app-like experience.', {
      type: 'info',
      key: 'pwa-install',
      duration: INSTALL_TOAST_MS,
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
    offerInstall(); // shows now only if a message is already being answered
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    // Installed some other way (e.g. Chrome's own address-bar button).
    // Dismissed in code, so onDismiss (the snooze) doesn't run.
    if (installToast) installToast.dismiss();
    track('PWA Installed');
  });
})();
