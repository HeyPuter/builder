// branding.js — the paid "remove branding" perk, pure half.
//
// Every generated page loads the Puter runtime with one baked tag
// (<script src="https://builder.puter.com/runtime.js" defer></script>, or the
// legacy /badge.js path — see src/runtime.js), and that script draws the
// "Made with Puter" badge. Removing the branding means publishing without that
// tag: the publish flow strips it from the release's HTML when the user ticks
// "Remove the badge" in the publish popover and has a paid Puter subscription
// (stripBrandingFromRelease in ui.js). Only the
// published copy is edited; the working files keep the tag, so the builder's
// preview keeps its click-to-edit bridge (half 2 of the same script).
//
// Kept DOM-free so scripts/test-branding.mjs can run the production bytes.
(function () {
    'use strict';

    // Where a user upgrades. Billing lives on puter.com, not in the builder.
    // The dashboard's upgrade page, in the format puter.js builds for its own
    // dialog (upgradeUrl in UsageLimitDialog.js): which upgrade (funds,
    // subscription, storage), the app the call ran as, and the SDK call that
    // was refused, as iface::method. The page only opens its upgrade flow with
    // a reason, so an upgrade the user chose still sends one.
    function upgradeUrl({ reason, appID, method } = {}) {
        const url = new URL('https://puter.com/dashboard/');
        if (reason) url.searchParams.set('upgrade', reason);
        if (appID) url.searchParams.set('upgrade_app', appID);
        if (method) url.searchParams.set('upgrade_method', method);
        url.hash = 'home';
        return url.href;
    }

    // One runtime tag, either path, any attribute order or quoting, plus the
    // whitespace and line break it sat on so no blank line is left behind.
    // The attribute must be exactly `src` (whitespace before it, so never
    // `data-src`), and the URL must end at runtime.js / badge.js or its query
    // (so never `runtime.js-custom`): this deletes from a user's release.
    const RUNTIME_TAG_RE = /[ \t]*<script\b[^>]*?\ssrc\s*=\s*["']?https?:\/\/builder\.puter\.com\/(?:runtime|badge)\.js(?:[?#][^"'\s>]*)?(?=["'\s>])["']?[^>]*>\s*<\/script\s*>[ \t]*(?:\r?\n)?/gi;

    function hasRuntimeTag(html) {
        RUNTIME_TAG_RE.lastIndex = 0;
        return RUNTIME_TAG_RE.test(String(html || ''));
    }

    function stripRuntimeTags(html) {
        const text = String(html || '');
        RUNTIME_TAG_RE.lastIndex = 0;
        const out = text.replace(RUNTIME_TAG_RE, '');
        return { text: out, changed: out !== text };
    }

    // puter.auth.getUser() reports a paid plan as `subscribed: true`.
    // Anything else (signed out, temp user, missing field) is the free tier.
    function isSubscribed(user) {
        return !!(user && !user.is_temp && user.subscribed === true);
    }

    window.Branding = { upgradeUrl, hasRuntimeTag, stripRuntimeTags, isSubscribed };
})();
