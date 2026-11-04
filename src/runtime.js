// The runtime script every generated app loads, served at
// builder.puter.com/runtime.js. It is ONE file with THREE independent parts
// (called halves below, from when there were two):
//
//   1. The "Made with Puter" attribution badge — a small dismissible pill
//      hovering in the page's bottom-right corner that links back to the
//      builder. Framed pages too, unless the builder's preview says not to.
//   2. The builder's element-picker bridge (click-to-edit) — outlines the
//      hovered element and posts its locator to the builder. FRAMED documents
//      only, i.e. the builder's own live-preview pane.
//   3. The builder's hidden test runner — runs the app's tests when the
//      builder loads the page in its invisible test frame, and nowhere else.
//
// Each half is a self-contained IIFE with its own guard, and half 1 runs first
// so it can never be affected by the others. A framed page can run all three.
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
// scripts/test-badge.mjs (half 1), scripts/test-click-to-edit.mjs (half 2) and
// scripts/test-app-tests.mjs (half 3) execute this file against a stub DOM and
// guard its invariants; run all three after any change here.

// ===========================================================================
//  Half 1 — the "Made with Puter" badge
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
//   * Framed pages show it too, so the builder's preview shows what visitors
//     see, except a frame the builder named 'puter-preview-no-badge'.
(function () {
    'use strict';

    var TAG = 'puter-badge';
    var HIDE_KEY = 'puter-badge-hidden';
    var REVEAL_DELAY_MS = 900; // let the app paint first; the badge slides in after
    var DISMISS_MS = 240;      // matches the exit transition below

    // Framed pages show the badge too, the builder's preview included, so a
    // free user sees what visitors see. The builder names the preview frame
    // 'puter-preview-no-badge' once the site is published without the badge
    // (syncPreviewBadge in js/ui.js). The name lasts across reloads and links
    // inside the app.
    try { if (window.top !== window.self && window.name === 'puter-preview-no-badge') return; } catch (e) {}

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

    // This half is for the builder's preview pane only.
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

    // A <form>'s named controls shadow its own DOM properties: with
    // <input name="id"> inside it, form.id IS that input (and form.tagName,
    // form.parentNode, form.children… likewise for controls of those names).
    // Picking anything inside such a form then built a locator of
    // "form#[object HTMLInputElement]", threw on tagName.toLowerCase (so the
    // pick never reached the builder and its toggle stayed lit), or, with a
    // control named parentNode, walked the form↔input cycle forever. Read every
    // DOM property through its prototype getter where the platform has one;
    // a plain property read is the fallback for anything that is not an
    // element (and for the stub DOM the regression test runs this against).
    function getter(ctor, name) {
        try {
            var d = ctor && ctor.prototype && Object.getOwnPropertyDescriptor(ctor.prototype, name);
            return (d && typeof d.get === 'function') ? d.get : null;
        } catch (e) { return null; }
    }
    var GETTERS = {
        tagName: getter(window.Element, 'tagName'),
        id: getter(window.Element, 'id'),
        className: getter(window.Element, 'className'),
        children: getter(window.Element, 'children'),
        outerHTML: getter(window.Element, 'outerHTML'),
        parentNode: getter(window.Node, 'parentNode'),
        textContent: getter(window.Node, 'textContent')
    };
    function read(el, name) {
        var g = GETTERS[name];
        if (g) { try { return g.call(el); } catch (e) { /* not an element: read it plainly */ } }
        return el[name];
    }

    // A locator the model can actually find in the app's source: stop at the
    // nearest id if there is one, otherwise walk up building a descendant chain,
    // disambiguating siblings of the same tag with :nth-of-type.
    function selectorFor(el) {
        var parts = [], node = el;
        while (node && node.nodeType === 1 && read(node, 'tagName') !== 'HTML') {
            var tag = read(node, 'tagName');
            var part = tag.toLowerCase();
            var id = read(node, 'id');
            if (id) { parts.unshift(part + '#' + esc(id)); break; }
            var parent = read(node, 'parentNode');
            if (parent) {
                var sameTag = Array.prototype.filter.call(read(parent, 'children') || [], function (c) {
                    return read(c, 'tagName') === tag;
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

    // Never cut between the two halves of an emoji (or any non-BMP character):
    // the half left behind is a broken character in the builder's chip.
    function clip(s, max) {
        s = s || '';
        if (s.length <= max) return s;
        var end = max, hi = s.charCodeAt(end - 1);
        if (hi >= 0xD800 && hi <= 0xDBFF) end--;
        return s.slice(0, end) + '...';
    }

    // The badge host (half 1) exists in no app file, so "selecting" it would
    // hand the model an element it can never find or edit. Events from inside
    // the badge's shadow root retarget to the host, so this covers them too.
    function skip(el) { return !!(el && read(el, 'tagName') === BADGE_TAG); }

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
            var className = read(el, 'className');
            reply({
                type: 'puter-element-selected',
                selector: selectorFor(el),
                tag: read(el, 'tagName').toLowerCase(),
                id: read(el, 'id') || '',
                className: (typeof className === 'string' ? className : ''),
                text: clip((read(el, 'textContent') || '').trim(), MAX_TEXT),
                html: clip(read(el, 'outerHTML') || '', MAX_HTML)
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

// ===========================================================================
//  Half 3 — the builder's hidden test runner (its test frame only)
// ===========================================================================
// The builder keeps a small set of automated tests for some apps (the AppTests
// tool, stored in the project's hidden .puter/ folder, never in the app's own
// files). After a change, update_preview loads the app a second time in an
// invisible frame named 'puter-test-runner' and posts the tests here; this
// half runs them against the real page and posts the results back. The
// builder side lives in js/app-tests.js.
//
// Contract with the pages it runs on:
//   * Inert everywhere else. A page that is top-level, or framed under any
//     other name (the builder's visible preview included), installs nothing.
//   * Only the builder can start a run (isBuilderOrigin, as in half 2), and
//     every reply goes to that exact origin. A third-party page that frames an
//     app under this name gets an app whose storage writes go nowhere, and no
//     way to run code in it.
//   * Tests leave no trace the user could see. From the moment this half runs,
//     localStorage, sessionStorage and puter.kv writes go to an in-memory
//     layer over the real data, AI calls get placeholder answers (no cost),
//     puter.fs changes, sign-in and sign-out, hosting/app/worker/team
//     management, email, notifications and requests that change data on the
//     app's workers are refused, BroadcastChannel stays inside the frame,
//     dialogs are answered without showing, and media plays muted. The frame itself
//     is sandboxed without popups, dialogs, downloads or device access.
//     IndexedDB and cookies are the exception: an app usually opens its
//     database before this deferred file runs, so writes there can't be
//     redirected, and the AppTests tool tells the AI not to test them.
//   * Nothing throws into the host page (see half 2's note on "Script error.").
//   * No async/await syntax: one parse error here would take the badge and
//     the picker down with it in every browser that runs halves 1 and 2.
//
// scripts/test-app-tests.mjs runs this half against a stub DOM.
(function () {
    'use strict';

    var FRAME_NAME = 'puter-test-runner';
    try {
        if (window.top === window.self) return;
        if (window.name !== FRAME_NAME) return;
    } catch (e) { return; }
    if (!window.addEventListener || typeof Promise !== 'function') return;
    if (window.__puterTestRunner) return;
    try { window.__puterTestRunner = true; } catch (e) { return; }

    var MAX_TESTS = 25;
    var DEFAULT_TEST_MS = 10000;
    var MAX_TEST_MS = 30000;
    var DEFINE_MS = 5000;
    var FIND_MS = 3000;
    var WAIT_MS = 5000;
    var MAX_SLEEP_MS = 5000;
    var MAX_ERROR = 400;
    var MAX_CODE = 100000;
    var AI_REPLY = 'This is a placeholder AI reply used while testing.';
    var IMAGE = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#d4d4d8"/></svg>');
    var SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';

    var hasOwn = Object.prototype.hasOwnProperty;
    var aiReply = AI_REPLY;
    var baseAIReply = AI_REPLY; // what the tests set at their top level
    var dialogs = [];

    function isBuilderOrigin(origin) {
        var o = String(origin || '').toLowerCase();
        return /^https:\/\/([a-z0-9-]+\.)*puter\.com$/.test(o) ||
               /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(o);
    }

    function attempt(fn) { try { fn(); } catch (e) { /* never break the host page */ } }

    function refused(what) {
        return new Error(what + ' is turned off while tests run.');
    }
    function refuse(what) {
        return function () { return Promise.reject(refused(what)); };
    }

    // ---- The sandbox -------------------------------------------------------

    // Storage whose writes stay in memory while reads fall through to the real
    // store, so the app (and puter.js, which keeps its session there) still
    // sees what was there, and the user's data is never changed. The real
    // store is read through Storage.prototype's own methods, saved before
    // they are rerouted below.
    var StorageProto = (window.Storage && window.Storage.prototype) || null;
    var storageMethods = {};
    var storageLength = null;
    attempt(function () {
        if (!StorageProto) return;
        ['getItem', 'setItem', 'removeItem', 'clear', 'key'].forEach(function (n) {
            if (typeof StorageProto[n] === 'function') storageMethods[n] = StorageProto[n];
        });
        var d = Object.getOwnPropertyDescriptor(StorageProto, 'length');
        if (d && typeof d.get === 'function') storageLength = d.get;
    });
    function realCall(real, n, args) {
        var f = storageMethods[n] || real[n];
        return f.apply(real, args);
    }
    function realLength(real) { return storageLength ? storageLength.call(real) : real.length; }

    function overlayStorage(real) {
        var mem = Object.create(null); // key -> string, or null once removed
        var cleared = false;
        function has(k) { return hasOwn.call(mem, k); }
        function getItem(k) {
            k = String(k);
            if (has(k)) return mem[k];
            if (cleared || !real) return null;
            try { return realCall(real, 'getItem', [k]); } catch (e) { return null; }
        }
        function keys() {
            var out = [];
            if (!cleared && real) {
                try {
                    var n = realLength(real);
                    for (var i = 0; i < n; i++) {
                        var k = realCall(real, 'key', [i]);
                        if (k != null && !has(k)) out.push(k);
                    }
                } catch (e) { /* unreadable store: memory only */ }
            }
            for (var m in mem) if (mem[m] !== null) out.push(m);
            return out;
        }
        var api = {
            getItem: getItem,
            setItem: function (k, v) { mem[String(k)] = String(v); },
            removeItem: function (k) { mem[String(k)] = null; },
            clear: function () { mem = Object.create(null); cleared = true; },
            key: function (i) { var ks = keys(); return (i >= 0 && i < ks.length) ? ks[i] : null; }
        };
        // On Storage's prototype, so it is a Storage to the app (instanceof,
        // String(), hasOwnProperty) and, as on the real one, the prototype's
        // members win over stored keys of the same name.
        var target = Object.create(StorageProto || Object.prototype);
        var proxy = new Proxy(target, {
            get: function (t, p) {
                if (p === 'length') return keys().length;
                if (typeof p !== 'string') return t[p];
                if (hasOwn.call(api, p)) return api[p];
                if (p in t) return t[p];
                var v = getItem(p);
                return v === null ? undefined : v;
            },
            set: function (t, p, v) { if (typeof p === 'string') api.setItem(p, v); return true; },
            deleteProperty: function (t, p) { if (typeof p === 'string') api.removeItem(p); return true; },
            has: function (t, p) {
                if (typeof p !== 'string') return p in t;
                return hasOwn.call(api, p) || p in t || getItem(p) !== null;
            },
            ownKeys: function () { return keys(); },
            getOwnPropertyDescriptor: function (t, p) {
                var v = typeof p === 'string' ? getItem(p) : null;
                return v === null ? undefined : { value: v, writable: true, enumerable: true, configurable: true };
            }
        });
        return { proxy: proxy, api: api, keys: keys };
    }

    // Each real store and its layer. An app (or a library it loads before this
    // file, which is deferred) may have kept the real localStorage in a
    // variable; its method calls go through Storage.prototype, so those are
    // sent to the layer too and its writes still stay in memory.
    var storageLayers = [];
    function layerOf(store) {
        for (var i = 0; i < storageLayers.length; i++) if (storageLayers[i].real === store) return storageLayers[i];
        return null;
    }
    function rerouteStorage() {
        attempt(function () {
            if (!StorageProto) return;
            Object.keys(storageMethods).forEach(function (n) {
                var original = storageMethods[n];
                attempt(function () {
                    StorageProto[n] = function () {
                        var layer = layerOf(this);
                        return layer ? layer.api[n].apply(layer.api, arguments) : original.apply(this, arguments);
                    };
                });
            });
            if (storageLength) {
                Object.defineProperty(StorageProto, 'length', {
                    configurable: true,
                    enumerable: true,
                    get: function () {
                        var layer = layerOf(this);
                        return layer ? layer.keys().length : storageLength.call(this);
                    }
                });
            }
        });
    }

    function overlayWindowStorage(name) {
        attempt(function () {
            var real = null;
            try { real = window[name]; } catch (e) { real = null; }
            var layer = overlayStorage(real);
            if (real) storageLayers.push({ real: real, api: layer.api, keys: layer.keys });
            // Storage.prototype.getItem.call(localStorage, …) reaches the layer too.
            storageLayers.push({ real: layer.proxy, api: layer.api, keys: layer.keys });
            Object.defineProperty(window, name, { configurable: true, enumerable: true, get: function () { return layer.proxy; } });
        });
    }

    function clone(v) {
        if (v === undefined) return null;
        try { return JSON.parse(JSON.stringify(v)); } catch (e) { return v; }
    }

    // A puter.kv.list pattern as puter.js sends it: trimmed, one trailing *
    // dropped, and matched as a prefix ('todo:' and 'todo:*' are the same).
    // null lists every key.
    function kvPrefix(pattern) {
        if (typeof pattern !== 'string') return null;
        var t = pattern.trim();
        if (t.charAt(t.length - 1) === '*') t = t.slice(0, -1);
        return t === '' ? null : t;
    }
    function kvMatches(prefix, key) { return prefix == null || key.indexOf(prefix) === 0; }

    // puter.kv the same way: writes in memory, reads through to the real store.
    function overlayKv(kv) {
        var realGet = typeof kv.get === 'function' ? kv.get.bind(kv) : null;
        var realList = typeof kv.list === 'function' ? kv.list.bind(kv) : null;
        var TOMB = {};
        var mem = Object.create(null);
        var flushed = false;
        function has(k) { return hasOwn.call(mem, k); }
        function get(k) {
            k = String(k);
            if (has(k)) return Promise.resolve(mem[k] === TOMB ? null : clone(mem[k]));
            if (flushed || !realGet) return Promise.resolve(null);
            return Promise.resolve().then(function () { return realGet(k); });
        }
        function incr(k, amount) {
            if (amount !== undefined && typeof amount !== 'number') return Promise.reject(refused('Changing several counters at once with puter.kv'));
            var by = amount === undefined ? 1 : amount;
            k = String(k);
            return get(k).then(function (cur) {
                var next = (Number(cur) || 0) + by;
                mem[k] = next;
                return next;
            });
        }
        var methods = {
            get: get,
            set: function (k, v) { mem[String(k)] = clone(v); return Promise.resolve(true); },
            del: function (k) { mem[String(k)] = TOMB; return Promise.resolve(true); },
            incr: incr,
            decr: function (k, amount) {
                if (amount !== undefined && typeof amount !== 'number') return Promise.reject(refused('Changing several counters at once with puter.kv'));
                return incr(k, -(amount === undefined ? 1 : amount));
            },
            flush: function () { mem = Object.create(null); flushed = true; return Promise.resolve(true); },
            expire: function () { return Promise.resolve(true); },
            expireAt: function () { return Promise.resolve(true); },
            list: function (pattern, returnValues) {
                if (pattern && typeof pattern === 'object') {
                    // { pattern, returnValues } is the same list; anything
                    // more (paging, streaming, order) goes to the real store.
                    var opts = pattern, plain = true;
                    for (var o in opts) if (hasOwn.call(opts, o) && o !== 'pattern' && o !== 'returnValues' && opts[o] !== undefined) plain = false;
                    if (!plain) {
                        var args = arguments;
                        return realList ? Promise.resolve().then(function () { return realList.apply(null, args); }) : Promise.resolve([]);
                    }
                    pattern = typeof opts.pattern === 'string' ? opts.pattern : undefined;
                    returnValues = !!opts.returnValues;
                } else if (typeof pattern === 'boolean') {
                    returnValues = pattern; pattern = undefined;
                } else {
                    // As puter.js reads it: only true asks for values (an
                    // object there is request options).
                    returnValues = returnValues === true;
                }
                var prefix = kvPrefix(pattern);
                var base = (flushed || !realList) ? Promise.resolve([])
                    : Promise.resolve().then(function () { return realList(prefix == null ? '*' : prefix + '*', true); });
                return base.then(function (items) {
                    var values = Object.create(null), order = [];
                    (Array.isArray(items) ? items : []).forEach(function (it) {
                        var key = (it && typeof it === 'object') ? it.key : it;
                        if (key == null) return;
                        key = String(key);
                        if (!kvMatches(prefix, key) || has(key) || hasOwn.call(values, key)) return;
                        values[key] = (it && typeof it === 'object') ? it.value : null;
                        order.push(key);
                    });
                    for (var k in mem) {
                        if (mem[k] === TOMB || !kvMatches(prefix, k)) continue;
                        if (!hasOwn.call(values, k)) order.push(k);
                        values[k] = clone(mem[k]);
                    }
                    return order.map(function (k) { return returnValues ? { key: k, value: values[k] } : k; });
                });
            }
        };
        // puter.js has clear as its own copy of the real flush, so it is
        // replaced too, or it would empty the user's real store.
        methods.clear = methods.flush;
        for (var name in methods) attempt(function () { kv[name] = methods[name]; });
        ['update', 'add', 'remove'].forEach(function (name) {
            if (typeof kv[name] === 'function') attempt(function () { kv[name] = refuse('Changing data with puter.kv.' + name); });
        });
        ['share', 'unshare'].forEach(function (name) {
            if (typeof kv[name] === 'function') attempt(function () { kv[name] = refuse('Sharing data with puter.kv'); });
        });
    }

    function fakeChat() {
        var stream = false;
        for (var i = 0; i < arguments.length; i++) {
            var a = arguments[i];
            if (a && typeof a === 'object' && !Array.isArray(a) && a.stream === true) stream = true;
        }
        var text = aiReply;
        if (stream) {
            var done = false;
            var it = {
                next: function () {
                    if (done) return Promise.resolve({ done: true, value: undefined });
                    done = true;
                    return Promise.resolve({ done: false, value: { type: 'text', text: text } });
                },
                'return': function () { done = true; return Promise.resolve({ done: true, value: undefined }); }
            };
            if (typeof Symbol === 'function' && Symbol.asyncIterator) it[Symbol.asyncIterator] = function () { return it; };
            return Promise.resolve(it);
        }
        return Promise.resolve({
            message: { role: 'assistant', content: text },
            text: text,
            index: 0,
            finish_reason: 'stop',
            toString: function () { return text; },
            valueOf: function () { return text; }
        });
    }
    function fakeImage() { var img = new Image(); img.src = IMAGE; return Promise.resolve(img); }
    function fakeAudio() { var a = new Audio(SILENT_WAV); a.muted = true; return Promise.resolve(a); }
    function fakeVideo() { var v = document.createElement('video'); v.muted = true; return Promise.resolve(v); }
    function fakeText() { return Promise.resolve('Placeholder text read from the image.'); }
    function fakeTranscript() {
        var text = 'Placeholder transcript.';
        return Promise.resolve({ text: text, toString: function () { return text; } });
    }

    function isWorkerUrl(u) {
        try { return /(^|\.)puter\.work$/i.test(new URL(String(u), location.href).hostname); } catch (e) { return false; }
    }
    function changesData(method) { return !/^(GET|HEAD|OPTIONS)$/i.test(String(method || 'GET')); }
    var WORKER_REFUSAL = 'Requests that change data on the app\'s backend';

    function sandboxPage() {
        attempt(function () { window.alert = function (m) { dialogs.push({ type: 'alert', message: String(m == null ? '' : m) }); }; });
        attempt(function () { window.confirm = function (m) { dialogs.push({ type: 'confirm', message: String(m == null ? '' : m) }); return true; }; });
        attempt(function () {
            window.prompt = function (m, d) {
                dialogs.push({ type: 'prompt', message: String(m == null ? '' : m) });
                return d == null ? '' : String(d);
            };
        });
        attempt(function () { window.open = function () { return null; }; });
        attempt(function () {
            var proto = window.HTMLMediaElement && HTMLMediaElement.prototype;
            var play = proto && proto.play;
            if (typeof play !== 'function') return;
            proto.play = function () {
                try { this.muted = true; } catch (e) { /* read-only in some engines */ }
                return play.apply(this, arguments);
            };
        });
        attempt(function () {
            var synth = window.speechSynthesis;
            if (!synth || typeof synth.speak !== 'function') return;
            synth.speak = function (u) {
                setTimeout(function () {
                    try { u.dispatchEvent(new Event('end')); }
                    catch (e) { try { if (u && typeof u.onend === 'function') u.onend({}); } catch (e2) { /* ignore */ } }
                }, 0);
            };
        });
        sandboxClipboard();
        attempt(function () {
            // Web Audio stays suspended in the frame (no autoplay, so the
            // hidden app is never heard), and resume() would wait forever for
            // a click a person never makes there: a game's Start button that
            // awaits it would look broken. It resolves at once; the context
            // stays silent.
            [window.AudioContext, window.webkitAudioContext].forEach(function (C) {
                var proto = C && C.prototype;
                if (!proto || typeof proto.resume !== 'function' || proto.resume.puterTests) return;
                var resume = proto.resume;
                var quick = function () {
                    try {
                        var p = resume.apply(this, arguments);
                        if (p && typeof p.then === 'function') p.then(null, function () { /* stays suspended */ });
                    } catch (e) { /* stays suspended */ }
                    return Promise.resolve();
                };
                quick.puterTests = true;
                proto.resume = quick;
            });
        });
        attempt(function () {
            // The frame has no fullscreen permission, so the request would
            // reject; a full-screen button "works" and the page stays put.
            var El = window.Element && window.Element.prototype;
            var Doc = window.Document && window.Document.prototype;
            var ok = function () { return Promise.resolve(); };
            if (El && typeof El.requestFullscreen === 'function') El.requestFullscreen = ok;
            if (El && typeof El.webkitRequestFullscreen === 'function') El.webkitRequestFullscreen = function () {};
            if (Doc && typeof Doc.exitFullscreen === 'function') Doc.exitFullscreen = ok;
        });
        sandboxBroadcast();
        overlayWindowStorage('localStorage');
        overlayWindowStorage('sessionStorage');
        rerouteStorage();
        attempt(function () {
            var realFetch = window.fetch;
            if (typeof realFetch !== 'function') return;
            window.fetch = function (input, init) {
                var url = typeof input === 'string' ? input : (input && input.url) || String(input);
                var method = (init && init.method) || (input && typeof input === 'object' && input.method) || 'GET';
                if (isWorkerUrl(url) && changesData(method)) return Promise.reject(refused(WORKER_REFUSAL));
                return realFetch.apply(window, arguments);
            };
        });
        guardWorkerWrites();
        sandboxPuter();
    }

    // The other ways a page can send a write to its workers: XMLHttpRequest
    // (axios and older code), navigator.sendBeacon, and a plain form posted
    // to a worker's address. Each is refused like fetch above, and reads go
    // through.
    function guardWorkerWrites() {
        attempt(function () {
            var proto = window.XMLHttpRequest && window.XMLHttpRequest.prototype;
            if (!proto || typeof proto.open !== 'function' || typeof proto.send !== 'function' || typeof WeakMap !== 'function') return;
            var open = proto.open, send = proto.send;
            var blocked = new WeakMap(); // request -> true when sync
            proto.open = function (method, url, isAsync) {
                try {
                    if (isWorkerUrl(url) && changesData(method)) blocked.set(this, isAsync === false);
                    else blocked['delete'](this);
                } catch (e) { /* never break the page */ }
                return open.apply(this, arguments);
            };
            proto.send = function () {
                if (!blocked.has(this)) return send.apply(this, arguments);
                var xhr = this;
                if (blocked.get(xhr)) throw refused(WORKER_REFUSAL);
                // What a request that never reached the server looks like:
                // status 0, readyState 4, then error and loadend.
                setTimeout(function () {
                    attempt(function () { Object.defineProperty(xhr, 'readyState', { configurable: true, get: function () { return 4; } }); });
                    ['readystatechange', 'error', 'loadend'].forEach(function (type) {
                        attempt(function () {
                            var ev;
                            try { ev = type === 'readystatechange' ? new Event(type) : new ProgressEvent(type); }
                            catch (e) { ev = new Event(type); }
                            xhr.dispatchEvent(ev);
                        });
                    });
                }, 0);
            };
        });
        attempt(function () {
            var nav = window.navigator;
            var beacon = nav && nav.sendBeacon;
            if (typeof beacon !== 'function') return;
            nav.sendBeacon = function (url) {
                if (isWorkerUrl(url)) return false; // a beacon is always a POST
                return beacon.apply(nav, arguments);
            };
        });
        attempt(function () {
            var Form = window.HTMLFormElement;
            if (!Form || !Form.prototype) return;
            // Through the prototype: a control named "action" or "method"
            // shadows the form's own property.
            function prop(el, Ctor, name) {
                var d = Ctor && Ctor.prototype && Object.getOwnPropertyDescriptor(Ctor.prototype, name);
                return d && d.get ? d.get.call(el) : el[name];
            }
            function postsToWorker(form, submitter) {
                var useSubmitter = submitter && submitter.hasAttribute;
                var Btn = submitter && submitter.tagName === 'BUTTON' ? window.HTMLButtonElement : window.HTMLInputElement;
                var method = useSubmitter && submitter.hasAttribute('formmethod') ? prop(submitter, Btn, 'formMethod') : prop(form, Form, 'method');
                var action = useSubmitter && submitter.hasAttribute('formaction') ? prop(submitter, Btn, 'formAction') : prop(form, Form, 'action');
                return String(method).toLowerCase() === 'post' && isWorkerUrl(action);
            }
            // Last, after the app's own handlers: a form the app sends with
            // fetch has already been stopped by then.
            window.addEventListener('submit', function (e) {
                try {
                    var form = e.target;
                    if (!e.defaultPrevented && form && form.tagName === 'FORM' && postsToWorker(form, e.submitter)) e.preventDefault();
                } catch (err) { /* never break the page */ }
            });
            var submit = Form.prototype.submit;
            if (typeof submit === 'function') {
                Form.prototype.submit = function () {
                    var blockedPost = false;
                    try { blockedPost = postsToWorker(this, null); } catch (e) { /* never break the page */ }
                    if (!blockedPost) return submit.apply(this, arguments);
                };
            }
        });
    }

    // BroadcastChannel reaches every page of the app's origin, and the
    // visible preview is one: an app that keeps its tabs in step would hand
    // it what a test does, and the preview would save it to the user's real
    // data. Channels opened here talk only to each other; one the app opened
    // before this file ran still hears others but sends nothing out.
    function sandboxBroadcast() {
        attempt(function () {
            var Real = window.BroadcastChannel;
            if (typeof Real !== 'function' || typeof window.EventTarget !== 'function') return;
            if (Real.prototype && typeof Real.prototype.postMessage === 'function') {
                attempt(function () { Real.prototype.postMessage = function () {}; });
            }
            var open = Object.create(null); // name -> the channels open here
            function copyOf(data) {
                return typeof window.structuredClone === 'function' ? window.structuredClone(data) : data;
            }
            function messageEvent(data) {
                try { return new MessageEvent('message', { data: data }); }
                catch (e) { var ev = new Event('message'); ev.data = data; return ev; }
            }
            var Channel = function BroadcastChannel(name) {
                var ch = new window.EventTarget();
                var key = String(name);
                var closed = false;
                ch.name = key;
                ch.onmessage = null;
                ch.onmessageerror = null;
                ch.postMessage = function (data) {
                    if (closed) throw new Error('This BroadcastChannel is closed.');
                    var copy = copyOf(data);
                    (open[key] || []).forEach(function (other) {
                        if (other !== ch) setTimeout(function () { other.__puterDeliver(copy); }, 0);
                    });
                };
                ch.close = function () {
                    closed = true;
                    open[key] = (open[key] || []).filter(function (o) { return o !== ch; });
                };
                // onmessage as a listener, so an error in it is reported
                // like any handler's, as it is on a real channel.
                ch.addEventListener('message', function (ev) {
                    if (typeof ch.onmessage === 'function') return ch.onmessage.call(ch, ev);
                });
                ch.__puterDeliver = function (data) {
                    if (!closed) ch.dispatchEvent(messageEvent(data));
                };
                (open[key] = open[key] || []).push(ch);
                return ch;
            };
            Object.defineProperty(window, 'BroadcastChannel', { configurable: true, writable: true, value: Channel });
        });
    }

    // A clipboard of the frame's own: the frame may not use the real one (the
    // visible preview may, so a working Copy button must not fail here), and
    // a test must never replace what the user copied. readText() gives back
    // what the app copied, so a test can check it.
    function sandboxClipboard() {
        var copied = '';
        var items = [];
        var fake = {
            writeText: function (t) { copied = String(t == null ? '' : t); items = []; return Promise.resolve(); },
            readText: function () { return Promise.resolve(copied); },
            write: function (data) {
                items = Array.isArray(data) ? data.slice() : [];
                copied = '';
                var text = null;
                items.forEach(function (item) {
                    if (text || !item || typeof item.getType !== 'function') return;
                    if (Array.isArray(item.types) && item.types.indexOf('text/plain') === -1) return;
                    text = Promise.resolve(item.getType('text/plain')).then(function (b) { return b && typeof b.text === 'function' ? b.text() : String(b); })
                        .then(function (t) { copied = String(t); }, function () { /* not text */ });
                });
                return text ? text.then(function () {}) : Promise.resolve();
            },
            read: function () { return Promise.resolve(items.slice()); }
        };
        attempt(function () {
            var nav = window.navigator;
            if (!nav) return;
            var board = null;
            try { board = nav.clipboard; } catch (e) { board = null; }
            if (board && typeof board === 'object') {
                Object.keys(fake).forEach(function (n) { attempt(function () { board[n] = fake[n]; }); });
            } else {
                Object.defineProperty(nav, 'clipboard', { configurable: true, enumerable: true, get: function () { return fake; } });
            }
        });
        attempt(function () {
            // The old way to copy: the selected text.
            var exec = document.execCommand;
            if (typeof exec !== 'function') return;
            document.execCommand = function (cmd) {
                var c = String(cmd).toLowerCase();
                if (c !== 'copy' && c !== 'cut') return exec.apply(document, arguments);
                var sel = '';
                try {
                    var a = document.activeElement;
                    if (a && (a.tagName === 'TEXTAREA' || a.tagName === 'INPUT') && typeof a.selectionStart === 'number') {
                        sel = String(a.value).slice(a.selectionStart, a.selectionEnd);
                    } else if (window.getSelection) {
                        sel = String(window.getSelection());
                    }
                } catch (e) { /* nothing selected */ }
                copied = sel;
                items = [];
                return true;
            };
        });
    }

    var sandboxedPuter = null;
    function sandboxPuter() {
        var p;
        try { p = window.puter; } catch (e) { return; }
        if (!p || (typeof p !== 'object' && typeof p !== 'function') || p === sandboxedPuter) return;
        sandboxedPuter = p;
        function set(ns, name, fn) {
            if (ns && (typeof ns === 'object' || typeof ns === 'function')) attempt(function () { ns[name] = fn; });
        }
        var ai = p.ai;
        // A fake that keeps what puter.js hangs on the real function
        // (txt2speech.listVoices and listEngines), which are free reads.
        function fakeOf(name, fake) {
            var real = ai && ai[name];
            if (typeof real !== 'function') return fake;
            var f = function () { return fake.apply(this, arguments); };
            attempt(function () { Object.keys(real).forEach(function (k) { f[k] = real[k]; }); });
            return f;
        }
        set(ai, 'chat', fakeOf('chat', fakeChat));
        set(ai, 'txt2img', fakeOf('txt2img', fakeImage));
        set(ai, 'txt2speech', fakeOf('txt2speech', fakeAudio));
        set(ai, 'speech2speech', fakeOf('speech2speech', fakeAudio));
        set(ai, 'txt2vid', fakeOf('txt2vid', fakeVideo));
        set(ai, 'img2txt', fakeOf('img2txt', fakeText));
        set(ai, 'speech2txt', fakeOf('speech2txt', fakeTranscript));
        // A live voice conversation is a billed realtime session with
        // nothing to fake it with.
        if (ai && typeof ai.convo === 'function') set(ai, 'convo', refuse('Live AI conversations'));
        if (p.kv) attempt(function () { overlayKv(p.kv); });
        ['write', 'mkdir', 'delete', 'rename', 'move', 'copy', 'upload'].forEach(function (n) {
            set(p.fs, n, refuse('Changing files with puter.fs'));
        });
        ['share', 'unshare'].forEach(function (n) {
            if (p.fs && typeof p.fs[n] === 'function') set(p.fs, n, refuse('Sharing files with puter.fs'));
        });
        set(p.auth, 'signIn', refuse('Signing in'));
        set(p.auth, 'signOut', function () { return Promise.resolve(); });
        ['create', 'update', 'delete'].forEach(function (n) {
            set(p.hosting, n, refuse('Changing sites with puter.hosting'));
            set(p.apps, n, refuse('Changing apps with puter.apps'));
            set(p.workers, n, refuse('Changing workers with puter.workers'));
        });
        // Things that reach people or change the account, and can't be taken
        // back: email, notifications pushed to the user's devices, and team
        // members and passwords.
        function refuseAll(ns, names, what) {
            names.forEach(function (n) {
                if (ns && typeof ns[n] === 'function') set(ns, n, refuse(what));
            });
        }
        refuseAll(p.email, ['send', 'sendTransactional'], 'Sending email');
        refuseAll(p.notifications, ['notify', 'cancel', 'enable', 'disable', 'enablePush', 'removeDevice'], 'Sending notifications');
        refuseAll(p.teams, ['create', 'update', 'delete', 'createMember', 'resendActivation', 'disableMember', 'enableMember',
            'resetPassword', 'resetTwoFactor', 'deleteMemberAccount'], 'Changing teams with puter.teams');
        var workers = p.workers;
        var exec = workers && workers.exec;
        if (typeof exec === 'function') {
            set(workers, 'exec', function (url, init) {
                if (changesData(init && init.method)) return Promise.reject(refused(WORKER_REFUSAL));
                return exec.apply(workers, arguments);
            });
        }
    }

    sandboxPage();

    // ---- The test API ------------------------------------------------------

    function clip(s, max) {
        s = String(s == null ? '' : s);
        return s.length > max ? s.slice(0, max) + '…' : s;
    }
    function describeEl(el) {
        try {
            var s = '<' + el.tagName.toLowerCase();
            if (el.id) s += ' id="' + el.id + '"';
            if (typeof el.className === 'string' && el.className) s += ' class="' + el.className + '"';
            return s + '>';
        } catch (e) { return 'element'; }
    }
    function fmt(v) {
        if (typeof v === 'string') return clip(JSON.stringify(v), 120);
        if (v && v.nodeType === 1) return describeEl(v);
        if (typeof v === 'function') return 'a function';
        if (v === undefined) return 'undefined';
        if (typeof v === 'number' || typeof v === 'boolean' || v === null) return String(v);
        try { return clip(JSON.stringify(v), 120); } catch (e) { return clip(String(v), 120); }
    }
    function messageOf(e) {
        if (e && typeof e.message === 'string' && e.message) return e.message;
        return String(e);
    }
    function norm(s) { return String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); }
    function secs(ms) { return (Math.round(ms / 100) / 10) + 's'; }
    function delay(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    // An error of a test step's own (click, waitFor, …), told apart from the
    // app's when a test forgot to await the step.
    function stepError(msg) { var e = new Error(msg); e.puterStep = true; return e; }
    function fatal(msg) { var e = stepError(msg); e.puterFatal = true; return e; }

    function describeTarget(target, opts) {
        var s = (target && target.nodeType === 1) ? describeEl(target) : JSON.stringify(String(target));
        if (opts && opts.text != null) s += ' with text ' + JSON.stringify(String(opts.text));
        return s;
    }

    function query(target, opts) {
        if (target && target.nodeType === 1) return target.isConnected === false ? [] : [target];
        if (typeof target !== 'string' || !target) throw fatal('Expected a CSS selector or an element, got ' + fmt(target) + '.');
        var list;
        try { list = Array.prototype.slice.call(document.querySelectorAll(target)); }
        catch (e) { throw fatal('Invalid CSS selector ' + JSON.stringify(target) + '.'); }
        if (opts && opts.text != null) {
            var want = norm(opts.text).toLowerCase();
            list = list.filter(function (el) { return norm(el.textContent).toLowerCase().indexOf(want) !== -1; });
            // The innermost match is the one meant ("button" inside "li").
            list = list.filter(function (el) { return !list.some(function (o) { return o !== el && el.contains(o); }); });
        }
        return list;
    }

    function isVisible(el) {
        try {
            if (el.isConnected === false) return false;
            var r = el.getBoundingClientRect();
            if (!r || (r.width === 0 && r.height === 0)) return false;
            var s = window.getComputedStyle ? getComputedStyle(el) : null;
            if (s && (s.visibility === 'hidden' || s.display === 'none')) return false;
            return true;
        } catch (e) { return false; }
    }

    // Which test is running. A test that runs out of time can't be stopped
    // (nothing cancels a promise), so each step remembers the test it began
    // in and, once that test is over, never finishes: the late test stays
    // stuck in that step instead of clicking through the tests after it.
    var gen = 0;
    function hang() { return new Promise(function () {}); }
    function stillOn(g) { return function (v) { return g === gen ? v : hang(); }; }

    // Poll check() until it returns something truthy. A throw marked puterFatal
    // fails at once (a typo in a selector won't fix itself); any other throw is
    // retried and reported if the time runs out.
    function poll(check, timeout, describe) {
        var start = Date.now();
        var g = gen;
        return new Promise(function (resolve, reject) {
            (function tick() {
                if (g !== gen) return; // its test is over: never settle
                var lastError = null;
                Promise.resolve().then(check).then(function (v) {
                    if (g !== gen) return;
                    if (v) return resolve(v);
                    next();
                }, function (e) {
                    if (g !== gen) return;
                    if (e && e.puterFatal) return reject(e);
                    lastError = e;
                    next();
                });
                function next() {
                    if (Date.now() - start >= timeout) {
                        return reject(stepError('Timed out after ' + secs(timeout) + ' waiting for ' + describe() +
                            (lastError ? ' (last error: ' + messageOf(lastError) + ')' : '') + '.'));
                    }
                    setTimeout(tick, 50);
                }
            })();
        });
    }

    function timeoutOf(opts, fallback) {
        var t = opts && +opts.timeout;
        return t > 0 ? Math.min(t, MAX_TEST_MS) : fallback;
    }

    // Disabled as the browser sees it: a control inside a disabled fieldset
    // is too, though its own disabled property says false (and a click on it
    // does nothing).
    function isDisabled(el) {
        if (el.disabled) return true;
        try { return typeof el.matches === 'function' && el.matches(':disabled'); } catch (e) { return false; }
    }

    // Wait for a visible (and, for actions, enabled) element.
    function find(target, opts) {
        opts = opts || {};
        var state = 'exist';
        return poll(function () {
            var els = query(target, opts);
            if (!els.length) { state = 'exist'; return null; }
            var shown = els.filter(isVisible);
            // text() reads hidden elements too, but the one on screen first:
            // an app that hides its other screens has the same heading in each.
            if (opts.visible === false) return shown[0] || els[0];
            if (!shown.length) { state = 'be visible (it exists but is hidden)'; return null; }
            if (opts.enabled) {
                var on = shown.filter(function (el) { return !isDisabled(el); });
                if (!on.length) { state = 'be enabled (it is disabled)'; return null; }
                return on[0];
            }
            return shown[0];
        }, timeoutOf(opts, FIND_MS), function () { return describeTarget(target, opts) + ' to ' + state; });
    }

    // `legacy` sets read-only fields the event constructors ignore (keyCode,
    // which, charCode), which older and game code still reads.
    function fire(el, type, init, Ctor, legacy) {
        init = init || {};
        init.bubbles = true; init.cancelable = true; init.composed = true;
        var ev;
        try { ev = new (Ctor || Event)(type, init); } catch (e) { ev = new Event(type, init); }
        if (legacy) {
            Object.keys(legacy).forEach(function (k) {
                var v = legacy[k];
                attempt(function () { Object.defineProperty(ev, k, { configurable: true, get: function () { return v; } }); });
            });
        }
        return el.dispatchEvent(ev);
    }

    function isTextField(el) {
        var tag = el.tagName;
        if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
        if (tag === 'INPUT') return !/^(button|submit|reset|checkbox|radio|file|image|hidden|range|color)$/i.test(el.type || '');
        return !!el.isContentEditable;
    }

    // Fields fill() sets without typing: a slider and a color picker.
    function isSetField(el) {
        return el.tagName === 'INPUT' && /^(range|color)$/i.test(el.type || '');
    }

    function focusFor(el) {
        var active = document.activeElement;
        if (isTextField(el) || el.tagName === 'BUTTON' || el.tagName === 'A' || el.tabIndex >= 0) {
            if (active !== el) try { el.focus({ preventScroll: true }); } catch (e) { /* not focusable */ }
        } else if (active && active !== document.body && active !== el && !(active.contains && active.contains(el))) {
            try { active.blur(); } catch (e) { /* ignore */ }
        }
    }

    function click(target, opts) {
        var g = gen;
        return find(target, merge(opts, { enabled: true })).then(function (el) {
            if (g !== gen) return hang();
            var r = el.getBoundingClientRect();
            var pos = { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 0, view: window };
            var P = window.PointerEvent || window.MouseEvent;
            fire(el, 'pointerdown', merge(pos, { pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 1 }), P);
            fire(el, 'mousedown', merge(pos, { buttons: 1 }), window.MouseEvent);
            focusFor(el);
            fire(el, 'pointerup', merge(pos, { pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0 }), P);
            fire(el, 'mouseup', merge(pos, { buttons: 0 }), window.MouseEvent);
            // SVG elements (a board's cells, a chart's bars) have no click().
            if (typeof el.click === 'function') el.click();
            else fire(el, 'click', merge(pos, { detail: 1, buttons: 0 }), window.MouseEvent);
            return settle();
        });
    }

    function nativeSetter(el) {
        var protos = [window.HTMLInputElement, window.HTMLTextAreaElement, window.HTMLSelectElement];
        for (var i = 0; i < protos.length; i++) {
            if (protos[i] && el instanceof protos[i]) {
                var d = Object.getOwnPropertyDescriptor(protos[i].prototype, 'value');
                if (d && d.set) return d.set;
            }
        }
        return null;
    }

    function fill(target, value, opts) {
        var g = gen;
        return find(target, merge(opts, { enabled: true })).then(function (el) {
            if (g !== gen) return hang();
            var type = String(el.type || '').toLowerCase();
            if (el.tagName === 'INPUT' && (type === 'checkbox' || type === 'radio')) {
                if (el.checked !== !!value) el.click();
                return settle();
            }
            if (!isTextField(el) && !isSetField(el)) throw fatal(describeEl(el) + ' is not a text field, select, slider or checkbox, so fill() can\'t type into it.');
            if (el.readOnly) throw fatal(describeEl(el) + ' is read-only.');
            focusFor(el);
            var text = String(value == null ? '' : value);
            if (el.isContentEditable && el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
                el.textContent = text;
            } else {
                var setter = nativeSetter(el);
                if (setter) setter.call(el, text); else el.value = text;
                if (el.tagName === 'SELECT' && el.value !== text) throw fatal(describeEl(el) + ' has no option with the value ' + JSON.stringify(text) + '.');
            }
            fire(el, 'input', { inputType: 'insertText', data: text }, window.InputEvent);
            fire(el, 'change');
            return settle();
        });
    }

    // What a US keyboard sends for a key, as press() names it: the key
    // itself ('a', '1', ' ', 'Enter', 'ArrowLeft'), or a common alias
    // ('Space', 'Esc', 'Up').
    var KEY_ALIASES = { Space: ' ', Spacebar: ' ', Esc: 'Escape', Return: 'Enter', Left: 'ArrowLeft', Right: 'ArrowRight',
        Up: 'ArrowUp', Down: 'ArrowDown', Del: 'Delete' };
    var KEY_CODES = { Enter: 13, Tab: 9, Escape: 27, Backspace: 8, Delete: 46, Insert: 45, Home: 36, End: 35, PageUp: 33,
        PageDown: 34, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, Shift: 16, Control: 17, Alt: 18, Meta: 91 };
    var PUNCTUATION = { '-': ['Minus', 189], '_': ['Minus', 189], '=': ['Equal', 187], '+': ['Equal', 187],
        '[': ['BracketLeft', 219], '{': ['BracketLeft', 219], ']': ['BracketRight', 221], '}': ['BracketRight', 221],
        '\\': ['Backslash', 220], '|': ['Backslash', 220], ';': ['Semicolon', 186], ':': ['Semicolon', 186],
        "'": ['Quote', 222], '"': ['Quote', 222], ',': ['Comma', 188], '<': ['Comma', 188], '.': ['Period', 190],
        '>': ['Period', 190], '/': ['Slash', 191], '?': ['Slash', 191], '`': ['Backquote', 192], '~': ['Backquote', 192] };
    var SHIFTED_DIGITS = ')!@#$%^&*(';
    function keyInfo(name) {
        var key = String(name == null || name === '' ? 'Enter' : name);
        if (hasOwn.call(KEY_ALIASES, key)) key = KEY_ALIASES[key];
        var code = key, keyCode = 0;
        if (key === ' ') { code = 'Space'; keyCode = 32; }
        else if (/^[a-z]$/i.test(key)) { code = 'Key' + key.toUpperCase(); keyCode = key.toUpperCase().charCodeAt(0); }
        else if (/^[0-9]$/.test(key)) { code = 'Digit' + key; keyCode = 48 + +key; }
        else if (key.length === 1 && SHIFTED_DIGITS.indexOf(key) !== -1) {
            var d = SHIFTED_DIGITS.indexOf(key);
            code = 'Digit' + d; keyCode = 48 + d;
        }
        else if (hasOwn.call(PUNCTUATION, key)) { code = PUNCTUATION[key][0]; keyCode = PUNCTUATION[key][1]; }
        else if (hasOwn.call(KEY_CODES, key)) keyCode = KEY_CODES[key];
        else if (/^F([1-9]|1[0-2])$/.test(key)) keyCode = 111 + +key.slice(1);
        if (key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') code = key + 'Left';
        return { key: key, code: code, keyCode: keyCode };
    }

    // A button, or a checkbox or radio, which the space bar clicks.
    function spaceClicks(el) {
        if (el.tagName === 'BUTTON') return true;
        return el.tagName === 'INPUT' && /^(button|submit|reset|image|checkbox|radio)$/i.test(el.type || '');
    }

    function press(target, key, opts) {
        var g = gen;
        return find(target, merge(opts, { enabled: true })).then(function (el) {
            if (g !== gen) return hang();
            var k = keyInfo(key);
            key = k.key;
            var init = { key: key, code: k.code, view: window };
            var printable = key.length === 1;
            var legacy = { keyCode: k.keyCode, which: k.keyCode, charCode: 0 };
            var pressLegacy = printable || key === 'Enter'
                ? { keyCode: printable ? key.charCodeAt(0) : 13, which: printable ? key.charCodeAt(0) : 13, charCode: printable ? key.charCodeAt(0) : 13 }
                : null;
            focusFor(el);
            var go = fire(el, 'keydown', init, window.KeyboardEvent, legacy);
            if (go && pressLegacy) go = fire(el, 'keypress', init, window.KeyboardEvent, pressLegacy);
            if (go && key === 'Enter') {
                var form = el.form;
                if (el.tagName === 'BUTTON' || el.tagName === 'A' || (el.tagName === 'INPUT' && /^(button|submit|reset|image)$/i.test(el.type || ''))) {
                    el.click();
                } else if (el.tagName === 'INPUT' && form) {
                    var submit = window.HTMLFormElement && HTMLFormElement.prototype.requestSubmit;
                    if (submit) submit.call(form);
                    else fire(form, 'submit');
                }
            }
            var up = fire(el, 'keyup', init, window.KeyboardEvent, legacy);
            if (go && up && key === ' ' && spaceClicks(el) && typeof el.click === 'function') el.click();
            return settle();
        });
    }

    function text(target, opts) {
        return find(target, merge(opts, { visible: false })).then(function (el) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return String(el.value);
            return norm(el.textContent);
        });
    }

    function visible(target, opts) {
        return query(target, opts).some(isVisible);
    }

    function waitFor(target, opts) {
        opts = opts || {};
        if (typeof target === 'function') {
            return poll(target, timeoutOf(opts, WAIT_MS), function () {
                return opts.message ? String(opts.message) : 'the condition ' + clip(norm(String(target)), 100) + ' to be true';
            });
        }
        if (opts.hidden) {
            return poll(function () { return !query(target, opts).some(isVisible); }, timeoutOf(opts, WAIT_MS),
                function () { return describeTarget(target, opts) + ' to be hidden or gone'; });
        }
        return find(target, merge(opts, { timeout: timeoutOf(opts, WAIT_MS) }));
    }

    function sleep(ms) { return delay(Math.max(0, Math.min(+ms || 0, MAX_SLEEP_MS))).then(stillOn(gen)); }

    // A beat for the app's handlers (microtasks and a frame's worth of timers)
    // after each action.
    function settle() { return delay(30).then(stillOn(gen)); }

    function merge(a, b) {
        var out = {}, k;
        if (a) for (k in a) if (hasOwn.call(a, k)) out[k] = a[k];
        if (b) for (k in b) if (hasOwn.call(b, k)) out[k] = b[k];
        return out;
    }

    function deepEqual(a, b) {
        if (Object.is(a, b)) return true;
        if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
        if (Array.isArray(a) !== Array.isArray(b)) return false;
        if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
        var ka = Object.keys(a), kb = Object.keys(b);
        if (ka.length !== kb.length) return false;
        for (var i = 0; i < ka.length; i++) {
            if (!hasOwn.call(b, ka[i]) || !deepEqual(a[ka[i]], b[ka[i]])) return false;
        }
        return true;
    }

    function expect(actual) {
        function matchers(negate) {
            function check(pass, what, expected) {
                if (!!pass === !negate) return;
                throw new Error('Expected ' + fmt(actual) + (negate ? ' not ' : ' ') + what +
                    (arguments.length > 2 ? ' ' + fmt(expected) : '') + '.');
            }
            return {
                toBe: function (e) { check(Object.is(actual, e), 'to be', e); },
                toEqual: function (e) { check(deepEqual(actual, e), 'to equal', e); },
                toContain: function (e) {
                    var ok = typeof actual === 'string' ? actual.indexOf(String(e)) !== -1
                        : Array.isArray(actual) ? actual.some(function (x) { return deepEqual(x, e); }) : false;
                    check(ok, 'to contain', e);
                },
                toMatch: function (re) {
                    var ok = typeof actual === 'string' && (re instanceof RegExp ? re.test(actual) : actual.indexOf(String(re)) !== -1);
                    check(ok, 'to match', re instanceof RegExp ? String(re) : re);
                },
                toHaveLength: function (n) { check(actual != null && actual.length === n, 'to have length', n); },
                toBeTruthy: function () { check(!!actual, 'to be truthy'); },
                toBeFalsy: function () { check(!actual, 'to be falsy'); },
                toBeNull: function () { check(actual === null, 'to be null'); },
                toBeDefined: function () { check(actual !== undefined, 'to be defined'); },
                toBeUndefined: function () { check(actual === undefined, 'to be undefined'); },
                toBeGreaterThan: function (n) { check(actual > n, 'to be greater than', n); },
                toBeGreaterThanOrEqual: function (n) { check(actual >= n, 'to be at least', n); },
                toBeLessThan: function (n) { check(actual < n, 'to be less than', n); },
                toBeLessThanOrEqual: function (n) { check(actual <= n, 'to be at most', n); },
                toBeCloseTo: function (n, digits) {
                    var d = digits == null ? 2 : digits;
                    check(Math.abs(actual - n) < Math.pow(10, -d) / 2, 'to be close to', n);
                }
            };
        }
        var m = matchers(false);
        m.not = matchers(true);
        return m;
    }

    // ---- Running -----------------------------------------------------------

    var API_NAMES = ['test', 'expect', '$', '$$', 'find', 'click', 'fill', 'press', 'text', 'visible',
        'waitFor', 'sleep', 'dialogs', 'setAIReply'];

    function normPage(p) {
        var s = String(p == null ? '' : p).trim().replace(/^\.\//, '').replace(/^\/+/, '');
        return (s === 'index.html' || s === 'index.htm') ? '' : s;
    }

    var registry = [];
    var registering = true;
    function test(name, opts, fn) {
        if (typeof opts === 'function') { fn = opts; opts = {}; }
        if (!registering) throw new Error('test() must be called at the top level of the tests, not inside another test.');
        if (typeof fn !== 'function') throw new Error('test(' + fmt(name) + ') needs a function.');
        opts = (opts && typeof opts === 'object') ? opts : {};
        registry.push({
            name: clip(norm(name) || 'Unnamed test', 120),
            page: normPage(opts.page),
            mobile: !!opts.mobile,
            timeout: timeoutOf(opts, DEFAULT_TEST_MS),
            fn: fn
        });
    }

    var api = {
        test: test,
        expect: expect,
        $: function (sel) { return document.querySelector(sel); },
        $$: function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); },
        find: find,
        click: click,
        fill: fill,
        press: press,
        text: text,
        visible: visible,
        waitFor: waitFor,
        sleep: sleep,
        dialogs: dialogs,
        setAIReply: function (t) { aiReply = String(t == null ? AI_REPLY : t); }
    };

    // Lines in the tests as the AI wrote them. The Function constructor puts a
    // header above the body, and how many lines it takes differs by engine,
    // so it is measured once with a probe rather than assumed.
    var SOURCE_URL = 'puter-app-tests.js';
    var AsyncFunction = null;
    var lineOffset = 0;
    function compile(code) {
        if (!AsyncFunction) {
            // Built from a string so this file never contains async syntax.
            // eslint-disable-next-line no-new-func
            AsyncFunction = new Function('return Object.getPrototypeOf(async function () {}).constructor')();
        }
        return AsyncFunction.apply(null, API_NAMES.concat([code + '\n//# sourceURL=' + SOURCE_URL]));
    }
    function measureOffset() {
        if (!AsyncFunction) return Promise.resolve(0);
        return AsyncFunction('throw new Error("probe")\n//# sourceURL=' + SOURCE_URL)().then(function () { return 0; }, function (e) {
            var n = lineIn(e && e.stack);
            return n ? n - 1 : 0;
        });
    }
    function lineIn(stack) {
        var m = String(stack || '').match(/puter-app-tests\.js:(\d+)/);
        return m ? +m[1] : 0;
    }
    function where(e) {
        var n = lineIn(e && e.stack);
        return n ? ' (tests line ' + Math.max(1, n - (lineOffset || 0)) + ')' : '';
    }

    // The file an error came from, as the AI knows it: without the address's
    // query (the test frame loads the page with a ?__pv= cache-buster), and
    // index.html for the site's root.
    function fileName(src) {
        var name = String(src).split(/[?#]/)[0].split('/').pop();
        return name || 'index.html';
    }

    // Uncaught errors while a test runs are the app breaking under it.
    var current = null;
    window.addEventListener('error', function (e) {
        if (!current || !e || (e.target && e.target !== window)) return;
        var msg = e.message || '';
        var src = e.filename || '';
        if (!src && /^Script error\.?$/i.test(msg)) return; // unattributable, cross-origin
        if (/builder\.puter\.com/.test(src)) return;          // this runtime, not the app
        current.errors.push(msg + (src ? ' (' + fileName(src) + (e.lineno ? ':' + e.lineno : '') + ')' : ''));
    }, true);
    window.addEventListener('unhandledrejection', function (e) {
        if (!current) return;
        var r = e && e.reason;
        if (r && r.puterStep) {
            // The test's own mistake, not the app breaking.
            current.unawaited = current.unawaited || messageOf(r);
            return;
        }
        current.errors.push('Unhandled promise rejection: ' + messageOf(r && r.message ? r : String(r)));
    });

    var builderOrigin = null;
    var runId = null;
    function post(msg) {
        msg.runId = runId;
        try { window.parent.postMessage(msg, builderOrigin); } catch (e) { /* best-effort */ }
    }

    function runOne(t) {
        gen++;
        current = { errors: [] };
        var started = Date.now();
        post({ type: 'puter-tests-progress', name: t.name });
        var timer;
        var timedOut = new Promise(function (resolve) {
            timer = setTimeout(function () { resolve({ timeout: true }); }, t.timeout);
        });
        var body = Promise.resolve().then(function () { return t.fn(api); }).then(function () { return {}; }, function (e) { return { error: e }; });
        return Promise.race([body, timedOut]).then(function (r) {
            clearTimeout(timer);
            gen++; // this test is over; any step still running in it stops
            // Each test sees its own dialogs and AI reply (the first test also
            // sees dialogs from page load). The same array: tests hold it.
            dialogs.length = 0;
            aiReply = baseAIReply;
            return delay(30).then(function () { return r; }); // errors fired by the last action
        }).then(function (r) {
            var errors = current.errors;
            var unawaited = current.unawaited;
            current = null;
            var out = { name: t.name, ms: Date.now() - started, passed: false };
            if (r.timeout) out.error = 'Timed out after ' + secs(t.timeout) + ' (the test never finished).';
            else if (r.error) out.error = messageOf(r.error) + where(r.error);
            else if (errors.length) out.error = 'The app threw an error during this test: ' + errors[0];
            else if (unawaited) out.error = 'A step this test did not await failed: ' + unawaited + ' Put await before every click, fill, press, text, find and waitFor.';
            else out.passed = true;
            if (out.error) out.error = clip(out.error, MAX_ERROR);
            return out;
        });
    }

    function runAll(code, group) {
        var defined;
        try {
            if (typeof code !== 'string' || !code.trim()) throw new Error('The tests are empty.');
            if (code.length > MAX_CODE) throw new Error('The tests are too long.');
            defined = compile(code);
        } catch (e) {
            // A page whose Content Security Policy forbids eval can't run tests
            // at all; that is the environment, not the tests.
            var csp = /Content Security Policy|unsafe-eval|EvalError/i.test(messageOf(e) + ' ' + (e && e.name));
            post({ type: 'puter-tests-done', unavailable: csp, setupError: csp ? null : clip('The tests could not be read: ' + messageOf(e), MAX_ERROR) });
            return Promise.resolve();
        }
        var defineTimer;
        return measureOffset().then(function (offset) {
            lineOffset = offset;
            return Promise.race([
                defined.apply(null, API_NAMES.map(function (n) { return api[n]; })),
                new Promise(function (resolve, reject) {
                    defineTimer = setTimeout(function () { reject(new Error('The tests took too long to set up.')); }, DEFINE_MS);
                })
            ]);
        }).then(function () {
            clearTimeout(defineTimer);
            registering = false;
            baseAIReply = aiReply;
            var all = registry.slice(0, MAX_TESTS);
            var groups = [];
            all.forEach(function (t) {
                if (!groups.some(function (g) { return g.page === t.page && g.mobile === t.mobile; })) groups.push({ page: t.page, mobile: t.mobile });
            });
            var mine = all.filter(function (t) { return t.page === group.page && t.mobile === group.mobile; });
            // Told first, so the builder still knows the other pages to test
            // if this one navigates away before it finishes.
            post({ type: 'puter-tests-plan', groups: groups, total: all.length, dropped: Math.max(0, registry.length - MAX_TESTS) });
            var results = [];
            var chain = Promise.resolve();
            mine.forEach(function (t) {
                chain = chain.then(function () { return runOne(t); }).then(function (r) {
                    results.push(r);
                    post({ type: 'puter-tests-result', result: r });
                });
            });
            return chain.then(function () {
                post({ type: 'puter-tests-done', results: results, groups: groups, total: all.length, dropped: Math.max(0, registry.length - MAX_TESTS) });
            });
        }, function (e) {
            clearTimeout(defineTimer);
            registering = false;
            post({ type: 'puter-tests-done', setupError: clip('The tests threw before any test ran: ' + messageOf(e) + where(e), MAX_ERROR) });
        });
    }

    var started = false;
    window.addEventListener('message', function (e) {
        try {
            if (!e || e.source !== window.parent) return;
            var d = e.data;
            if (!d || d.type !== 'puter-tests-run' || typeof d.runId !== 'string') return;
            if (!isBuilderOrigin(e.origin)) return;
            if (started) {
                // The builder resends until it hears back; answer only the run it started.
                if (d.runId === runId) post({ type: 'puter-tests-ack' });
                return;
            }
            started = true;
            builderOrigin = e.origin;
            runId = d.runId;
            post({ type: 'puter-tests-ack' });
            sandboxPuter(); // puter.js may have loaded after this script
            runAll(d.code, { page: normPage(d.page), mobile: !!d.mobile }).then(null, function (err) {
                post({ type: 'puter-tests-done', setupError: clip('The test runner failed: ' + messageOf(err), MAX_ERROR) });
            });
        } catch (err) { /* never break the host page */ }
    });
})();
