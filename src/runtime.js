// The runtime script every generated app loads, served at
// builder.puter.com/runtime.js. It is ONE file with TWO independent halves:
//
//   1. The "Made with Puter" attribution badge — a small dismissible pill
//      hovering in the page's bottom-right corner that links back to the
//      builder. TOP-LEVEL documents only.
//   2. The builder's element-picker bridge (click-to-edit) — outlines the
//      hovered element and posts its locator to the builder. FRAMED documents
//      only, i.e. the builder's own live-preview pane.
//
// The halves are mutually exclusive by context, so on any given page exactly
// one of them does anything; each is a self-contained IIFE with its own guard,
// and half 1 runs first so it can never be affected by half 2.
//
// Generated apps load this file with a single baked
// <script src="https://builder.puter.com/runtime.js" defer></script> tag — the
// prompt rule that bakes the tag lives in js/prompt.js (present when
// FEATURE_FLAGS.createdWithBadge OR .clickToEdit is on). Keeping this code OUT
// of the app files and behind one short tag means (a) the model reproduces one
// line verbatim instead of ~2.3KB of minified JS per page it writes, and
// (b) editing THIS file updates every app ever built, including long-published
// ones — which is also how half 2 reaches apps generated before it existed.
//
// TWO stable URLs serve these exact bytes, and both must keep working forever:
//   /runtime.js  — canonical, baked into everything generated from 2026-07-29 on
//   /badge.js    — legacy. Apps generated before then have that path baked into
//                  HTML sitting on user storage we cannot rewrite, so dropping
//                  it would kill their badge and picker. The build writes both
//                  from this one file so they can never drift apart (see
//                  closeBundle() in vite.config.js), and the builder's error
//                  filter matches the HOST rather than either filename
//                  (isRuntimeAssetError in js/ui.js) so neither path can be
//                  reported to the model as a bug in app code. A page can even
//                  end up loading both — the double-include guards below key on
//                  the element name and a window marker, not the URL.
//
// In dev Vite serves it raw at /runtime.js (root is src/); a build minifies it
// to the stable, unhashed paths above. It is deliberately NOT in the builder's
// own script bundle — nothing in the builder UI runs this file.
//
// NOTE on what does NOT belong here: the app's error-reporting snippet stays
// INLINE in every generated page (see prompt.js). It must install before any
// other script runs, and it is the channel that reports "failed to load
// script" — if the reporter itself shipped from this host, an outage would
// silently blind the builder's post-build verification (a broken app would
// verify clean) instead of failing loudly. Errors from THIS file are dropped at
// the builder's door on purpose (isRuntimeAssetError in js/ui.js).
//
// scripts/test-badge.mjs (half 1) and scripts/test-click-to-edit.mjs (half 2)
// execute this file against a stub DOM and guard its invariants; run both after
// any change here.

// ===========================================================================
//  Half 1 — the "Made with Puter" badge (top-level documents only)
// ===========================================================================
// Contract with the pages it runs on:
//   * Zero dependencies, zero layout impact: one fixed-position custom
//     element; all markup and styling live in a shadow root so the app's CSS
//     and the badge's can never collide.
//   * Fails silent and safe: any error (old browser, sandboxed storage,
//     missing body) leaves the page exactly as it was.
//   * The visitor can dismiss it with the × — the choice is remembered per
//     app origin via localStorage and respected on every future visit.
//   * Idempotent: a page that ends up with the tag twice still gets one badge.
//   * Top-level documents only: a framed page (most importantly the builder's
//     own preview pane) never shows the badge.
(function () {
    'use strict';

    var TAG = 'puter-badge';
    var HIDE_KEY = 'puter-badge-hidden';
    var REVEAL_DELAY_MS = 900; // let the app paint first; the badge slides in after
    var DISMISS_MS = 240;      // matches the exit transition below

    // The badge is for real visits only. The builder's live-preview pane loads
    // the app in an iframe, so a framed page never shows it — this covers the
    // preview across reloads and in-app navigation with no builder⇄app
    // messaging, at the accepted cost of also hiding it when a published app
    // is embedded elsewhere. (Comparing window refs is safe cross-origin.)
    if (window.top !== window.self) return;

    // Capability + double-include guards. Anything too old for custom
    // elements / shadow DOM silently gets no badge.
    if (typeof customElements === 'undefined' || typeof Element === 'undefined' ||
        !Element.prototype.attachShadow || typeof HTMLElement === 'undefined') return;
    if (customElements.get(TAG)) return;

    // The visitor hid the badge on this app before — respect that. Touching
    // localStorage can throw (sandboxed iframes); treat "can't read" as "show".
    try { if (localStorage.getItem(HIDE_KEY)) return; } catch (e) {}

    // The builder's app icon (favicons/app-icon.png downscaled to 40px and
    // palette-quantized): crisp at the 18px it renders at, ~1.4KB inlined so
    // the badge never costs the page a second network request.
    var LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAMAAAC7IEhfAAAA/1BMVEUXHCQkKjMcIir29fTt7OwAAAArMToPFR20tbcSFx4jKjFzdXnY2dkXHCJFSU9nam5RVFqpqqwWGyHFxseWmJs4PEMUFx6Iio1ZXWI9QUgTGBwjKjISGB15fIAiKC8UGh4dIyojIysnLTcXFykmLDVdYGV+gIQVGiAfJS0UGh8TEx0qMTufoaQiKDIWHCAaICYJDxien6EeIyoeJC8aIyO/wMEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSxYNzAAAAVXRSTlP+/v///wD+//+xsP//hv/////E////w////ypsTv8yiooRzQ6W//9oVmca1f9SpsL//7wrHf8AAAAAAAAAAAAA////////////////////////////rPfofgAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAKKADAAQAAAABAAAAKAAAAAB65masAAACEklEQVR42oXV54KjIBAA4KEo7GIQop5RUzbZZNv19v6vdgNWXN2bXzJ8jrQQiHw8Hpvr/VJcv55bAZ41n+PVINdjD4+XNrMSMWlaePwAddE4eL4ssSpMHhE2S47mOmjfR3C+LI6LKxok/sDvGdEIKPnCkgqm9AVeQqf4jupDxhjjpZnkH6AJobEFNTlHyGQ6yf+Ch9ksCKUUYsm4AaBDkO8dHFM01igLVk4YxtbBIAO3HAlIPYebmSMZ1wCQEohjCGDgiEpwvnmFlEhJYB3eJGNZ6ms9HSj08Q5SATIhwnW5ka5BzOjClILSVOMr8L6ibwionqTVpMDnXW5L42wfLfSPRFl7KIYe4qwOYFc8Y7YSYvzcD0gTZsQcCuXOgVSx6IahS1wolvXvfeph7NLO2h3BlvqL54JzzpQIYVvQ9TCWFIoPrb4kwm7sN8m7TgkFZ+072SGGGXSjUpn/uDE7xZAluSHDAo0Q9zY3Jk9Yag8ytXhs8cV0Ak/D4ic461SblCmZaG1+4vTWoJuJxZlKlmX+17Ba0c/AwW5eU/gcQr92sn8a4R3sh+0c6nTQLcAAT1CPR2ln/VK2EIdbjkcE60XboSFE4TfYjREXgIjJMXuD6HVsIcWybnnyaqoANnibPW6nGbRVoUnIAGp3kdZhDjdzpgCe26t5D/+J1/6yrzcfsW/18K8QRW/7zd1inPZ1K/4BbjUg8nIwupYAAAAASUVORK5CYII=';

    // Attribution link. utm_content carries the referring app's hostname so
    // the builder can see which apps convert; encodeURIComponent output can
    // never contain a quote, so interpolating it into the template is safe.
    var HREF = 'https://builder.puter.com/?utm_source=puter-badge&utm_medium=badge&utm_campaign=created-with-puter&utm_content=' +
        encodeURIComponent((typeof location !== 'undefined' && location.hostname) || 'unknown');

    var TEMPLATE =
        '<style>' +
        ':host{' +
            'position:fixed;' +
            'right:calc(env(safe-area-inset-right, 0px) + 14px);' +
            'bottom:calc(env(safe-area-inset-bottom, 0px) + 14px);' +
            'z-index:2147483646;' +
            'display:block;' +
            'opacity:0;' +
            'transform:translateY(8px);' +
            'transition:opacity .5s cubic-bezier(.21,1,.27,1),transform .5s cubic-bezier(.21,1,.27,1);' +
            'pointer-events:none;' + // never intercept clicks while invisible
        '}' +
        ':host([data-in]){opacity:1;transform:none;pointer-events:auto;}' +
        ':host([data-out]){opacity:0;transform:translateY(4px);transition-duration:.22s;pointer-events:none;}' +
        '@media (prefers-reduced-motion:reduce){:host{transition:none;transform:none;}}' +
        '@media print{:host{display:none !important;}}' +
        '.badge{' +
            'display:flex;align-items:stretch;' +
            'font:500 12px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;' +
            '-webkit-font-smoothing:antialiased;' +
            'letter-spacing:.01em;' +
            'color:rgba(242,244,248,.92);' +
            'background:rgba(23,28,36,.92);' +
            '-webkit-backdrop-filter:blur(10px) saturate(140%);' +
            'backdrop-filter:blur(10px) saturate(140%);' +
            'border:1px solid rgba(255,255,255,.15);' +
            'border-radius:999px;' +
            'box-shadow:0 1px 2px rgba(15,20,30,.2),0 6px 20px rgba(15,20,30,.25);' +
            'overflow:hidden;' +
            'user-select:none;-webkit-user-select:none;' +
            'transition:background-color .15s ease,border-color .15s ease;' +
        '}' +
        '.badge:hover{background:rgba(32,39,50,.95);border-color:rgba(255,255,255,.22);}' +
        '.link{' +
            'display:flex;align-items:center;gap:7px;' +
            'padding:7px 9px 7px 8px;' +
            'color:inherit;text-decoration:none;outline:none;' +
            'border-radius:999px 0 0 999px;' +
        '}' +
        '.logo{width:18px;height:18px;border-radius:5px;display:block;box-shadow:0 0 0 1px rgba(255,255,255,.1);}' +
        '.text{white-space:nowrap;}' +
        '.brand{font-weight:700;color:#fff;}' +
        '.close{' +
            'display:flex;align-items:center;justify-content:center;' +
            'width:26px;margin:0;padding:0;border:0;background:none;' +
            'border-left:1px solid rgba(255,255,255,.12);' +
            'border-radius:0 999px 999px 0;' +
            'font:inherit;color:rgba(242,244,248,.5);cursor:pointer;outline:none;' +
            'transition:color .15s ease,background-color .15s ease;' +
        '}' +
        '.close:hover{color:#fff;background:rgba(255,255,255,.08);}' +
        '.link:focus-visible,.close:focus-visible{box-shadow:inset 0 0 0 2px rgba(125,165,255,.95);}' +
        '@media (forced-colors:active){.badge{background:Canvas;color:CanvasText;border-color:CanvasText;}}' +
        '</style>' +
        '<div class="badge" role="group" aria-label="Made with Puter">' +
            '<a class="link" href="' + HREF + '" target="_blank" rel="noopener" ' +
                'aria-label="Made with Puter — build your own app or website with AI">' +
                '<img class="logo" src="' + LOGO + '" alt="" width="18" height="18" decoding="async">' +
                '<span class="text">Made with <span class="brand">Puter</span></span>' +
            '</a>' +
            '<button class="close" type="button" aria-label="Hide this badge" title="Hide">' +
                '<svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" focusable="false">' +
                    '<path d="M2.5 2.5l7 7m0-7l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>' +
                '</svg>' +
            '</button>' +
        '</div>';

    function dismiss(el) {
        // Remember per app origin; a visitor who can't persist (sandboxed
        // storage) still gets the badge hidden for this page view.
        try { localStorage.setItem(HIDE_KEY, String(Date.now())); } catch (e) {}
        el.setAttribute('data-out', '');
        setTimeout(function () {
            try { if (el.remove) el.remove(); } catch (e) {}
        }, DISMISS_MS);
    }

    class PuterBadge extends HTMLElement {
        constructor() {
            super();
            var root = this.attachShadow({ mode: 'open' });
            root.innerHTML = TEMPLATE;
            var self = this;
            var close = root.querySelector('.close');
            if (close) close.addEventListener('click', function (e) {
                if (e && e.preventDefault) e.preventDefault();
                dismiss(self);
            });
        }
    }

    try { customElements.define(TAG, PuterBadge); } catch (e) { return; }

    function mount() {
        try {
            if (!document.body || document.querySelector(TAG)) return;
            var el = document.createElement(TAG);
            document.body.appendChild(el);
            // Reveal after the app has had a beat to paint; the attribute flip
            // triggers the :host entrance transition.
            setTimeout(function () { el.setAttribute('data-in', ''); }, REVEAL_DELAY_MS);
        } catch (e) { /* never break the host page */ }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount, { once: true });
    } else {
        mount();
    }
})();

// ===========================================================================
//  Half 2 — the builder's element-picker bridge (framed documents only)
// ===========================================================================
// Click-to-edit: the builder's preview pane is cross-origin (apps are served
// from *.puter.site), so the builder cannot reach into the app's DOM. This
// bridge is the other end of that gap — it stays completely dormant until the
// builder posts {type:'puter-select-mode', enabled:true}, then outlines the
// hovered element and, on the next click, posts a locator for it back. The
// builder side lives in js/ui.js (toolbar toggle, readiness ACK timer, the
// chip above the composer).
//
// Contract with the pages it runs on:
//   * Framed documents only. A published app someone is actually using is
//     top-level and installs NOTHING — not one listener.
//   * Only the builder can arm it, and every reply is addressed to that exact
//     origin. See isBuilderOrigin() for why that matters.
//   * Idempotent: a page that ends up with the tag twice still gets one bridge.
//   * Never leaves the page stuck in select mode: the click handler always
//     disarms, even if building the payload throws.
//   * Nothing throws into the host page. This file is cross-origin to the app,
//     so an uncaught error reaches the app's inline reporter as an
//     unattributable "Script error." with no source — which the builder cannot
//     filter (see isRuntimeAssetError in js/ui.js) and would hand to the model as
//     a bug in healthy app code. Every listener goes through guard().
//
// scripts/test-click-to-edit.mjs executes this half against a stub DOM and
// guards the invariants above; run it after any change here.
(function () {
    'use strict';

    // The badge's inverse guard: this half is for the builder's preview pane.
    // (Comparing window refs is safe cross-origin.)
    if (window.top === window.self) return;

    // Ancient browsers get no picker rather than a thrown error.
    if (!window.addEventListener || !document.addEventListener) return;

    // One bridge per document even if the page ends up with the tag twice. The
    // write is the only statement out here that could throw (a page that froze
    // its window), and per the contract above nothing may throw into the app.
    if (window.__puterSelectBridge) return;
    try { window.__puterSelectBridge = true; } catch (e) { return; }

    var BADGE_TAG = 'PUTER-BADGE'; // uppercase: tagName in an HTML document
    var MAX_TEXT = 200;            // caps on what we hand the builder per pick
    var MAX_HTML = 800;

    var overlay = null;     // hover outline; a bare div with pointer-events:none
    var hovered = null;     // element currently under the cursor while armed
    var armed = false;
    var armedOrigin = null; // origin that armed us; every reply is addressed to it

    // Only the builder may drive select mode, and replies go to that exact
    // origin — never '*'. Without this, ANY page that iframes a published Puter
    // app could arm the picker and harvest the markup of whatever the visitor
    // clicks, which is DOM it otherwise cannot read cross-origin. event.origin
    // is set by the browser and cannot be forged.
    //
    // Allowed: the production and any staging builder host (*.puter.com, all
    // Puter-operated), plus a local dev server. Generated apps live on
    // *.puter.site and are deliberately NOT trusted. Because this check ships
    // centrally, a future builder host is a one-line deploy here — not a
    // rebuild of every app in the wild.
    function isBuilderOrigin(origin) {
        var o = String(origin || '').toLowerCase();
        return /^https:\/\/([a-z0-9-]+\.)*puter\.com$/.test(o) ||
               /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(o);
    }

    // Every listener is registered through this: an error in here must never
    // surface in the app (see the contract above). Wrapped handlers are created
    // ONCE and reused, so removeEventListener still matches.
    function guard(fn) {
        return function (e) {
            try { fn(e); } catch (err) { /* never break the host page */ }
        };
    }

    function reply(msg) {
        if (!armedOrigin) return;
        try { window.parent.postMessage(msg, armedOrigin); } catch (e) { /* best-effort */ }
    }

    function outline(el) {
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;z-index:2147483647;pointer-events:none;' +
                'border:2px solid #2563eb;background:rgba(37,99,235,0.12);' +
                'border-radius:2px;box-sizing:border-box;';
            document.documentElement.appendChild(overlay);
        }
        var r = el.getBoundingClientRect();
        overlay.style.left = r.left + 'px';
        overlay.style.top = r.top + 'px';
        overlay.style.width = r.width + 'px';
        overlay.style.height = r.height + 'px';
    }

    function esc(s) { return (window.CSS && CSS.escape) ? CSS.escape(s) : s; }

    // A locator the model can actually find in the app's source: stop at the
    // nearest id if there is one, otherwise walk up building a descendant chain,
    // disambiguating siblings of the same tag with :nth-of-type.
    function selectorFor(el) {
        var parts = [], node = el;
        while (node && node.nodeType === 1 && node.tagName !== 'HTML') {
            var part = node.tagName.toLowerCase();
            if (node.id) { parts.unshift(part + '#' + esc(node.id)); break; }
            var parent = node.parentNode;
            if (parent) {
                var sameTag = Array.prototype.filter.call(parent.children || [], function (c) {
                    return c.tagName === node.tagName;
                });
                if (sameTag.length > 1) {
                    part += ':nth-of-type(' + (Array.prototype.indexOf.call(sameTag, node) + 1) + ')';
                }
            }
            parts.unshift(part);
            node = parent;
        }
        return parts.join(' > ');
    }

    function clip(s, max) {
        s = s || '';
        return s.length > max ? s.slice(0, max) + '...' : s;
    }

    // The badge host (half 1) exists in no app file, so "selecting" it would
    // hand the model an element it can never find or edit. Events from inside
    // the badge's shadow root retarget to the host, so this covers them too.
    function skip(el) { return !!(el && el.tagName === BADGE_TAG); }

    function onMove(e) {
        if (!armed) return;
        if (skip(e.target)) return; // leave the previous outline where it was
        hovered = e.target;
        outline(hovered);
    }

    function onClick(e) {
        if (!armed) return;
        // Swallow the click either way — the app must not act on a pick.
        e.preventDefault();
        e.stopPropagation();
        if (skip(e.target)) return; // badge click: stay armed, pick nothing
        try {
            var el = e.target;
            reply({
                type: 'puter-element-selected',
                selector: selectorFor(el),
                tag: el.tagName.toLowerCase(),
                id: el.id || '',
                className: (typeof el.className === 'string' ? el.className : ''),
                text: clip((el.textContent || '').trim(), MAX_TEXT),
                html: clip(el.outerHTML || '', MAX_HTML)
            });
        } finally {
            stop(); // one pick per arming, and never get stuck armed
        }
    }

    var moveHandler = guard(onMove);
    var clickHandler = guard(onClick);

    function start() {
        if (armed) return;
        armed = true;
        document.addEventListener('mousemove', moveHandler, true);
        document.addEventListener('click', clickHandler, true);
        if (document.body) document.body.style.cursor = 'crosshair';
    }

    function stop() {
        armed = false;
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
        document.removeEventListener('mousemove', moveHandler, true);
        document.removeEventListener('click', clickHandler, true);
        if (document.body) document.body.style.cursor = '';
    }

    window.addEventListener('message', guard(function (e) {
        if (!e || e.source !== window.parent) return;
        if (!e.data || e.data.type !== 'puter-select-mode') return;
        if (!isBuilderOrigin(e.origin)) return;
        if (e.data.enabled) {
            armedOrigin = e.origin;
            start();
            // The builder disarms its toggle if this ACK doesn't arrive (an app
            // built before this script existed can't send it) — see ui.js.
            reply({ type: 'puter-select-ready' });
        } else {
            stop();
        }
    }));

    // Keep the outline glued to the element as the page moves under it.
    var reposition = guard(function () { if (armed && hovered) outline(hovered); });
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition, true);
})();
