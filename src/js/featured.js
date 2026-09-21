// "From the community" — a daily-curated feed of featured apps on the landing
// screen. Deliberately a content feed, not a marketing showcase: real
// screenshots, no CTAs, a muted one-line header, and the whole card opens the
// app in a new tab. The hero stays the star — the feed's first card row
// peeking above the fold is the only invitation to scroll.
//
// Data contract: FEATURED_FEED_URL returns
//   { "updated": "YYYY-MM-DD", "items": [{ id, name, url, description,
//     category, thumbnail, icon, pinned }] }
// name + url are required; everything else optional. `pinned: true` holds an
// item at the front of the grid — everything else is shuffled per page load
// (same fairness trick as the starter-prompt chips) so all of the day's picks
// get exposure. Only FEATURED_DISPLAY_COUNT cards render per load, no matter
// how many items the feed carries — the shuffle is what rotates the overflow
// into view across visits.
//
// Thumbnails: the curated source (src/featured.json) usually OMITS them — at
// build time, featuredFeedPlugin (vite.config.js) snapshots each app's
// auto-captured Puter screenshot (<site>/.puter/screenshots/index.png) into
// /featured-thumbs/, normalized to the card's 756×391 box so the browser
// never has to downscale a full 1280×800 capture (which blurs it), and fills
// the field in; an explicit `thumbnail` in the source is a curator override
// and is shipped verbatim. Items whose pull fails render the gradient+initial
// placeholder instead.
//
// Rotating the batch is editing src/featured.json + a deploy (the snapshot
// step is what makes the images first-party and immutable). The runtime fetch
// is still cache-busted per day so edge caches can't pin yesterday's batch.
//
// The last good batch is cached in localStorage and rendered synchronously at
// boot — before the cloak reveal (see revealWhenReady) — so returning
// visitors never see the hero re-center itself when the network copy lands;
// the fresh copy re-renders only if its content actually differs.

const FEATURED_FEED_URL = '/featured.json';
const FEATURED_CACHE_KEY = 'featuredFeedCache';
const FEATURED_MAX_ITEMS = 40; // sanity cap on the parsed feed; a daily batch is ~20
const FEATURED_DISPLAY_COUNT = 12; // cards actually shown per page load

// Validate untrusted feed JSON down to a clean list of renderable items.
// Anything malformed is dropped rather than repaired — a short feed beats a
// broken card. URLs must parse and be http(s); all strings are rendered with
// .text()/.attr() (never HTML interpolation), matching how chat chips handle
// dynamic strings.
function sanitizeFeaturedItems(data) {
    if (!data || !Array.isArray(data.items)) return [];
    const out = [];
    for (const raw of data.items) {
        if (!raw || typeof raw !== 'object') continue;
        const name = (typeof raw.name === 'string' ? raw.name : '').trim();
        let url = '';
        try {
            const u = new URL(String(raw.url || ''));
            if (u.protocol === 'http:' || u.protocol === 'https:') url = u.href;
        } catch (e) { /* not a URL — drop below */ }
        if (!name || !url) continue;

        // Image URLs may be absolute (curator overrides) or root-relative
        // (the /featured-thumbs/ snapshots, built or dev-proxied — see
        // featuredFeedPlugin in vite.config.js), so resolve against this
        // origin before insisting on http(s).
        const httpUrl = (v) => {
            try {
                const u = new URL(String(v || ''), window.location.origin);
                if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
            } catch (e) { /* fall through */ }
            return '';
        };

        out.push({
            id: (typeof raw.id === 'string' && raw.id.trim()) ? raw.id.trim() : url,
            name,
            url,
            description: (typeof raw.description === 'string' ? raw.description : '').trim(),
            category: (typeof raw.category === 'string' ? raw.category : '').trim(),
            thumbnail: httpUrl(raw.thumbnail),
            icon: httpUrl(raw.icon),
            pinned: raw.pinned === true,
        });
        if (out.length >= FEATURED_MAX_ITEMS) break;
    }
    return out;
}

// Pinned items keep their curated order at the front; the rest are
// Fisher-Yates shuffled (copy, source untouched) so every pick gets fair
// exposure across page loads.
function shuffleFeaturedItems(items) {
    const pinned = items.filter(i => i.pinned);
    const rest = items.filter(i => !i.pinned);
    for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return pinned.concat(rest);
}

// Deterministic two-hue gradient from the item id, used behind the initial
// letter while the screenshot loads — and as the whole thumb when an item has
// no thumbnail yet. Derived from hash math only, so safe to set as style.
function featuredPlaceholderStyle(seed) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    const h1 = hash % 360;
    const h2 = (h1 + 42) % 360;
    return `background: linear-gradient(135deg, hsl(${h1}, 45%, 52%), hsl(${h2}, 50%, 38%))`;
}

// Gradient + initial-letter tile: the thumb when an item ships no screenshot,
// and the fallback when its screenshot fails to load.
function buildFeaturedPlaceholder(item) {
    const $ph = $('<div class="feed-thumb-ph"></div>').attr('style', featuredPlaceholderStyle(item.id));
    $ph.append($('<span></span>').text((item.name[0] || '?').toUpperCase()));
    return $ph;
}

// Lazy-load screenshots with an explicit IntersectionObserver rooted at the
// chat column. Native loading=lazy is unreliable here: Chrome computes its
// lazy distance against the document viewport, and this page scrolls inside
// .chat (the body never scrolls), so below-the-fold images never fetch.
// 600px of rootMargin keeps the next rows ready before they're reached.
let featuredThumbObserver = null;
function lazyLoadFeaturedThumb($img, src) {
    if (!('IntersectionObserver' in window)) { $img.attr('src', src); return; }
    if (!featuredThumbObserver) {
        featuredThumbObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                const el = entry.target;
                featuredThumbObserver.unobserve(el);
                if (el.dataset.src) { el.src = el.dataset.src; delete el.dataset.src; }
            }
        }, { root: document.getElementById('new-chat'), rootMargin: '600px 0px' });
    }
    $img.attr('data-src', src);
    featuredThumbObserver.observe($img[0]);
}

function buildFeaturedCard(item, position) {
    const $card = $('<a class="feed-card" target="_blank" rel="noopener noreferrer"></a>')
        .attr('href', item.url)
        .attr('data-app-id', item.id)
        .attr('data-position', position)
        // The visible text repeats this; the explicit label folds the new-tab
        // behavior in for screen-reader users.
        .attr('aria-label', item.name + (item.description ? ' — ' + item.description : '') + ' (opens in a new tab)');

    const $thumb = $('<div class="feed-thumb"></div>');
    if (item.thumbnail) {
        // The thumb's own neutral surface is the loading state (a loud
        // gradient flashing under a crossfade reads as jank); the screenshot
        // fades in over it on load. The gradient+initial tile appears only if
        // the image actually fails. The first row loads eagerly — it peeks
        // above the fold on the landing frame — the rest as they approach.
        const $img = $('<img class="feed-thumb-img" alt="" decoding="async">');
        $img.on('load', () => $img.addClass('loaded'));
        $img.on('error', () => { $img.remove(); $thumb.append(buildFeaturedPlaceholder(item)); });
        if (position < 4) $img.attr('src', item.thumbnail);
        else lazyLoadFeaturedThumb($img, item.thumbnail);
        $thumb.append($img);
    } else {
        $thumb.append(buildFeaturedPlaceholder(item));
    }
    $card.append($thumb);

    const $meta = $('<div class="feed-card-meta"></div>');
    const $titleRow = $('<div class="feed-card-title-row"></div>');
    if (item.icon) {
        // App icon beside the title (the YouTube channel-avatar slot) — real
        // identity beats a bare text row. Eager: icons are a few KB each, and
        // native lazy-loading doesn't fire inside this scroller anyway (see
        // lazyLoadFeaturedThumb). Dropped silently on error.
        const $icon = $('<img class="feed-card-icon" alt="" decoding="async">');
        $icon.on('error', () => $icon.remove());
        $icon.attr('src', item.icon);
        $titleRow.append($icon);
    }
    $titleRow.append($('<span class="feed-card-title"></span>').text(item.name));
    if (item.category) $titleRow.append($('<span class="feed-card-cat"></span>').text(item.category));
    $meta.append($titleRow);
    if (item.description) $meta.append($('<div class="feed-card-desc"></div>').text(item.description));
    $card.append($meta);

    return $card;
}

// (Re)draw the feed. An empty list tears the section down, reverting the
// landing to the plain centered layout — a failed or empty feed must look
// like the feature doesn't exist, not like it broke.
//
// Only the first FEATURED_DISPLAY_COUNT items are drawn, however large the
// feed is: callers pass a pinned-first shuffled list, so pinned items always
// make the cut and the rest rotate through the remaining slots per page load.
function renderFeaturedFeed(items) {
    const $feed = $('.home-feed');
    if (!$feed.length) return;
    items = items.slice(0, FEATURED_DISPLAY_COUNT);

    // A re-render replaces every card; drop the old observer (and its
    // references to the detached images) with them.
    if (featuredThumbObserver) { featuredThumbObserver.disconnect(); featuredThumbObserver = null; }

    if (!items.length) {
        $feed.attr('hidden', true).empty();
        $('#new-chat').removeClass('has-feed');
        return;
    }

    const $head = $('<div class="home-feed-head"></div>');
    $head.append($('<h2 class="home-feed-title"></h2>').text('From the community'));
    $head.append($('<span class="home-feed-sub"></span>').text('New picks daily'));

    const $grid = $('<div class="home-feed-grid"></div>');
    items.forEach((item, i) => $grid.append(buildFeaturedCard(item, i)));

    $feed.empty().append($head, $grid).removeAttr('hidden');
    $('#new-chat').addClass('has-feed');
}

// Called once from boot (app.js), right after renderSkeleton().
window.initFeaturedFeed = function () {
    // Kill switch (FEATURE_FLAGS.featuredFeed): nothing is fetched, rendered or
    // bound, and renderSkeleton never emits the section — the landing screen is
    // the plain centered layout. A stale localStorage batch from a run when the
    // flag was on is left alone (it is only ever read back through here).
    if (!window.FEATURE_FLAGS?.featuredFeed) return;

    // 1. Paint the cached batch synchronously — we're still pre-reveal, so
    //    returning visitors get the feed layout on the first visible frame.
    let cachedItems = [];
    try {
        cachedItems = sanitizeFeaturedItems(JSON.parse(localStorage.getItem(FEATURED_CACHE_KEY) || 'null'));
    } catch (e) { /* corrupt cache — treat as absent */ }
    if (cachedItems.length) renderFeaturedFeed(shuffleFeaturedItems(cachedItems));

    // 2. Revalidate. Cache-busted per day (the batch rotates daily); re-render
    //    only when the content actually changed, and never blank an already
    //    painted feed on a network failure.
    const day = new Date().toISOString().slice(0, 10);
    const sep = FEATURED_FEED_URL.includes('?') ? '&' : '?';
    fetch(FEATURED_FEED_URL + sep + 'd=' + day, { cache: 'no-cache' })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
            const items = sanitizeFeaturedItems(data);
            if (!items.length) return;
            if (JSON.stringify(items) !== JSON.stringify(cachedItems)) {
                try { localStorage.setItem(FEATURED_CACHE_KEY, JSON.stringify({ items })); } catch (e) { /* quota — cache is an optimization only */ }
                renderFeaturedFeed(shuffleFeaturedItems(items));
            }
            // One impression per landing view (deep links restore straight
            // into a project, where the feed is never seen — don't count those).
            if (!window._featuredImpressionSent && !(typeof readUrlChatId === 'function' && readUrlChatId())) {
                window._featuredImpressionSent = true;
                window.track('Featured Feed Seen', { count: items.length });
            }
        })
        .catch(() => { /* offline / blocked — cached or no feed, both fine */ });

    // Which apps earn their daily slot: id + grid position per click.
    $(document).off('click.featuredFeed').on('click.featuredFeed', '.feed-card', function () {
        window.track('Featured App Opened', {
            app: this.getAttribute('data-app-id') || '',
            position: Number(this.getAttribute('data-position')) || 0,
        });
    });
};
