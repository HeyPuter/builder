// social-images.js — give a published page's social preview image a full URL.
//
// X, Facebook, LinkedIn and Discord show a link's preview card from the page's
// og:image / twitter:image tag, and they don't resolve a relative path there.
// The AI can't write the full URL: it only knows the preview's address, and
// the site is published later, by the user, at an address that can change.
// So it writes a relative path ("assets/preview.png") and publishing fills in
// the site's address in the published copy only (ui.js), the same way the
// badge is taken out of it. The working files keep the relative path.
//
// Pure and DOM-free, so scripts/test-social-images.mjs runs it directly.
(function () {
    'use strict';

    const TAG_RE = /<meta\b[^>]*>/gi;
    const NAME_RE = /\s(?:property|name)\s*=\s*(["'])\s*(?:og:image(?::url|:secure_url)?|twitter:image(?::src)?)\s*\1/i;
    const CONTENT_RE = /(\scontent\s*=\s*)(["'])([^"']*)\2/i;
    const ABSOLUTE_RE = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

    function originOf(url) {
        try { return url ? new URL(url).origin : null; } catch (e) { return null; }
    }

    /**
     * Rewrite one page's social image tags to full URLs on the published site.
     *
     * @param {string} html
     * @param {string} pageUrl  The page's published URL, e.g.
     *                          "https://cafe.puter.site/about/index.html".
     * @param {string[]} [moveFrom]  Other addresses of this site (the preview,
     *                          an address it was renamed from): a full URL on one
     *                          of them is moved to the published address.
     * @returns {{changed: boolean, text: string}}
     */
    function absolutize(html, pageUrl, moveFrom) {
        const src = String(html || '');
        let page;
        try { page = new URL(pageUrl); } catch (e) { return { changed: false, text: src }; }
        const others = new Set((moveFrom || []).map(originOf).filter((o) => o && o !== page.origin));
        let changed = false;
        const text = src.replace(TAG_RE, (tag) => {
            if (!NAME_RE.test(tag)) return tag;
            return tag.replace(CONTENT_RE, (whole, pre, q, value) => {
                const v = value.trim();
                if (!v || /^data:/i.test(v)) return whole;
                let next;
                try {
                    const u = new URL(v, page);
                    if (!ABSOLUTE_RE.test(v)) next = u.href;
                    else if (others.has(u.origin)) next = page.origin + u.pathname + u.search + u.hash;
                    else return whole;
                } catch (e) {
                    return whole;
                }
                if (next === value) return whole;
                changed = true;
                return pre + q + next + q;
            });
        });
        return { changed, text };
    }

    window.SocialImages = { absolutize };
})();
