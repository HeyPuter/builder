import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard for the "From the community" featured feed ----------
// The landing feed (src/js/featured.js) is the only surface in the app that
// renders a document nobody on the team wrote: /featured.json is a curated
// batch that the build rewrites (vite.config.js featuredFeedPlugin fills each
// item's `thumbnail` with a build-time screenshot snapshot) and that the client
// then re-fetches and hands straight to the DOM. Everything in
// sanitizeFeaturedItems is therefore the whole of the app's trust boundary for
// remote content, and nothing asserted any of it.
//
// What this pins:
//   1. The sanitizer drops rather than repairs. A malformed item, a non-http(s)
//      link, a missing name or url, or an over-long batch must disappear — a
//      short feed beats a broken card.
//   2. It normalizes to a fixed key set. A feed entry can't smuggle extra
//      fields into the renderer.
//   3. Image URLs resolve against this origin, because the shipped thumbnails
//      are root-relative (/featured-thumbs/…), and anything that isn't http(s)
//      after that resolution is dropped.
//   4. The shuffle keeps pinned items first and rotates the rest, so the 12-card
//      window is a fair sample instead of the first 12 forever.
//   5. Cards render through .attr()/.text() only — never HTML interpolation —
//      and open in a new tab with a label that says so.
//   6. initFeaturedFeed paints the cached batch synchronously, never blanks an
//      already-painted feed on a network failure, re-renders only when the
//      content actually differs, and counts one impression per landing view.
//
// The pure half and the DOM half are driven through a VM sandbox (only the
// jQuery/DOM/fetch/localStorage boundary is mocked), reading the production
// bytes of src/js/featured.js unmodified.

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const featuredSrc = read('../src/js/featured.js');
const viteSrc = read('../vite.config.js');
const helpersSrc = read('../src/js/helpers.js');
const uiSrc = read('../src/js/ui.js');
const appSrc = read('../src/js/app.js');

const ORIGIN = 'https://builder.puter.com';
const FEED_URL = '/featured.json';
const CACHE_KEY = 'featuredFeedCache';
const MAX_ITEMS = 40;
const DISPLAY_COUNT = 12;
const NORMALIZED_KEYS = ['category', 'description', 'icon', 'id', 'name', 'pinned', 'thumbnail', 'url'];

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

// ---- Minimal jQuery/DOM stub ----------------------------------------------
// Records what the renderer asks for instead of drawing it, so a card can be
// asserted on structurally (attributes, text nodes, children) and a handler can
// be fired on demand. Array-shaped: featured.js only ever does $img[0].
function makeEl(sel) {
    const el = {
        sel,
        length: 1,
        attrs: {},
        dataset: {},
        classes: new Set(),
        children: [],
        handlers: {},
        removed: false,
        text_: null,
    };
    el[0] = el;
    // jQuery reads the attributes written into the markup string, and so does a
    // card's own class/id lookup, so parse them the same way here.
    for (const m of String(sel).matchAll(/\s([a-z-]+)="([^"]*)"/g)) el.attrs[m[1]] = m[2];
    el.attr = function (k, v) {
        if (arguments.length < 2) return el.attrs[k];
        if (v === null) delete el.attrs[k]; else el.attrs[k] = v;
        return el;
    };
    el.removeAttr = function (k) { delete el.attrs[k]; return el; };
    el.getAttribute = function (k) { return k in el.attrs ? el.attrs[k] : null; };
    el.text = function (v) {
        if (arguments.length === 0) return el.text_;
        el.text_ = String(v);
        return el;
    };
    // .html() exists so a renderer that reaches for it fails a check instead of
    // throwing: an HTML sink is recorded, never parsed.
    el.html = function (v) { el.html_ = String(v); return el; };
    el.append = function (...kids) { el.children.push(...kids); return el; };
    el.on = function (ev, fn) { (el.handlers[ev] = el.handlers[ev] || []).push(fn); return el; };
    el.addClass = function (c) { el.classes.add(c); return el; };
    el.removeClass = function (c) { el.classes.delete(c); return el; };
    el.remove = function () { el.removed = true; return el; };
    el.empty = function () { el.children = []; return el; };
    el.fire = function (ev, arg) { for (const fn of el.handlers[ev] || []) fn.call(el, arg); };
    return el;
}

// One env per scenario: fresh global scope, so the module-level
// featuredThumbObserver starts null and nothing leaks between checks.
function createEnv(opts = {}) {
    const els = {};
    const storage = Object.assign(Object.create(null), opts.storage || {});
    const trackCalls = [];
    const fetches = [];
    const domOff = [];
    const domOn = [];
    const writes = [];
    const observers = [];

    const doc = {
        getElementById: (id) => (els['#' + id] || (els['#' + id] = makeEl('#' + id))),
    };
    const domApi = {
        off: function (...a) { domOff.push(a); return domApi; },
        on: function (...a) { domOn.push(a); return domApi; },
    };
    const $ = function (target) {
        if (target === doc || target === 'document') return domApi;
        if (typeof target !== 'string') return makeEl(String(target));
        // Markup means "build me a node" — always fresh, or every card would
        // share one <a>. A selector means "this element", so it must be stable.
        if (target[0] === '<') return makeEl(target);
        return els[target] || (els[target] = makeEl(target));
    };

    const randomValues = opts.random || null;
    const sandbox = {
        console: { log() {}, warn() {}, error() {} },
        document: doc,
        $,
        URL,
        // Math is an intrinsic of the VM context, so hand it one that can be
        // pinned to a known sequence — the shuffle is otherwise untestable.
        Math: randomValues ? Object.assign(Object.create(Math), { random: () => randomValues.shift() ?? 0 }) : Math,
        fetch: (url, init) => {
            fetches.push({ url: String(url), init });
            return opts.fetch ? opts.fetch(String(url), init) : Promise.resolve({ ok: true, json: async () => null });
        },
        localStorage: {
            getItem: (k) => (k in storage ? storage[k] : null),
            removeItem: (k) => { delete storage[k]; },
            setItem: (k, v) => {
                writes.push({ key: k, value: String(v) });
                if (opts.storageThrows) throw new Error('QuotaExceededError');
                storage[k] = String(v);
            },
        },
        IntersectionObserver: opts.noIntersectionObserver ? undefined : class {
            constructor(cb, opts) { this.cb = cb; this.opts = opts; this.observed = []; this.disconnected = 0; observers.push(this); }
            observe(el) { this.observed.push(el); }
            unobserve(el) { this.observed = this.observed.filter((o) => o !== el); }
            disconnect() { this.disconnected++; this.observed = []; }
        },
        window: {
            location: { origin: opts.origin || ORIGIN },
            FEATURE_FLAGS: { featuredFeed: opts.featureFlag !== false },
            track: (...a) => trackCalls.push(a),
        },
    };
    if (opts.noIntersectionObserver) delete sandbox.IntersectionObserver;
    else sandbox.window.IntersectionObserver = sandbox.IntersectionObserver;
    if (opts.chatId) sandbox.readUrlChatId = () => opts.chatId;

    vm.createContext(sandbox);
    vm.runInContext(featuredSrc, sandbox, { filename: 'src/js/featured.js' });

    return {
        sandbox,
        els,
        trackCalls,
        fetches,
        domOff,
        domOn,
        writes,
        observers,
        // initFeaturedFeed hangs off window, not off the script scope.
        init: () => {
            if (typeof sandbox.window.initFeaturedFeed !== 'function') throw new Error('window.initFeaturedFeed was not defined');
            return sandbox.window.initFeaturedFeed();
        },
        // Top-level `const`s live in the context's declarative record, so read
        // them back through the scope rather than off the sandbox object.
        const: (name) => vm.runInContext(name, sandbox),
        settle: () => new Promise((r) => setTimeout(r, 0)),
    };
}

// A well-formed feed item, overridable field by field.
const item = (over) => Object.assign(
    { id: 'a1', name: 'Alpha', url: 'https://alpha.puter.site', description: 'First', category: 'Games' },
    over || {},
);
const feed = (items) => ({ updated: '2026-07-27', items });

// ============================================================================
// 1. sanitizeFeaturedItems — the trust boundary
// ============================================================================
{
    const { sandbox } = createEnv();
    const sanitize = (data) => sandbox.sanitizeFeaturedItems(data);

    // --- nothing renderable in, nothing out ---
    check('null / undefined feed yields no items',
        sanitize(null).length === 0 && sanitize(undefined).length === 0);
    check('a non-array `items` yields no items',
        sanitize({ items: 'nope' }).length === 0 &&
        sanitize({ items: { 0: item() } }).length === 0 &&
        sanitize({}).length === 0);
    check('an empty feed yields no items', sanitize(feed([])).length === 0);

    // --- name + url are the only required fields ---
    const minimal = sanitize(feed([{ name: 'Alpha', url: 'https://alpha.puter.site' }]));
    check('name + url is enough to render', minimal.length === 1 && minimal[0].name === 'Alpha');
    check('omitted optional fields become empty strings, not undefined',
        minimal[0].description === '' && minimal[0].category === '' &&
        minimal[0].thumbnail === '' && minimal[0].icon === '' && minimal[0].pinned === false,
        JSON.stringify(minimal[0]));

    // --- dropping, not repairing ---
    const dropped = sanitize(feed([
        { url: 'https://a.puter.site' },                          // no name
        { name: '   ', url: 'https://b.puter.site' },             // whitespace name
        { name: 'No URL' },                                       // no url
        { name: 'Bad URL', url: 'not a url' },                    // unparseable
        { name: 'JS', url: 'javascript:alert(1)' },                // script url
        { name: 'Data', url: 'data:text/html,<script>' },         // data url
        { name: 'FTP', url: 'ftp://files.puter.site/x' },         // wrong scheme
        { name: 'Relative', url: '/relative/path' },              // no origin to resolve against
        null, 'a string', 42, [],                                 // not objects
        item({ name: 'Good' }),
    ]));
    check('only the one renderable item survives a batch of junk',
        dropped.length === 1 && dropped[0].name === 'Good',
        JSON.stringify(dropped.map((d) => d.name)));

    check('http and https are both accepted',
        sanitize(feed([{ name: 'A', url: 'http://a.puter.site' }, { name: 'B', url: 'https://b.puter.site' }])).length === 2);

    // --- string coercion is defensive, never a throw ---
    let threw = false;
    try {
        sanitize(feed([
            { name: 'Obj', url: { toString: () => 'https://x.puter.site' } },
            { name: ['a', 'b'], url: 'https://y.puter.site' },
            { name: { a: 1 }, url: 'https://z.puter.site' },
        ]));
    } catch (e) { threw = true; }
    check('hostile field types sanitize without throwing', !threw);

    // --- trimming ---
    const trimmed = sanitize(feed([item({ name: '  Alpha  ', description: '  First  ', category: '  Games  ', id: '  a1  ' }) ]))[0];
    check('every rendered string is trimmed',
        trimmed.name === 'Alpha' && trimmed.description === 'First' &&
        trimmed.category === 'Games' && trimmed.id === 'a1',
        JSON.stringify(trimmed));

    // --- id falls back to url so the card always has a data-app-id ---
    // The fallback is the *normalized* url, so it carries the trailing slash
    // URL parsing adds — a card key has to match what the beacon later reports.
    check('id falls back to the url when absent or not a string',
        sanitize(feed([{ name: 'A', url: 'https://a.puter.site' }]))[0].id === 'https://a.puter.site/' &&
        sanitize(feed([item({ id: 7 })]) )[0].id === 'https://alpha.puter.site/' &&
        sanitize(feed([item({ id: '   ' }) ]))[0].id === 'https://alpha.puter.site/');
    check('a string id is kept verbatim', sanitize(feed([item({ id: 'BlockArena' })]))[0].id === 'BlockArena');

    // --- pinned is strictly true ---
    const pinnedShapes = sanitize(feed([
        item({ id: 'p1', pinned: true }), item({ id: 'p2', pinned: 'true' }),
        item({ id: 'p3', pinned: 1 }), item({ id: 'p4', pinned: 'yes' }),
    ])).map((i) => [i.id, i.pinned]);
    check('only a real boolean true pins an item',
        JSON.stringify(pinnedShapes) === JSON.stringify([['p1', true], ['p2', false], ['p3', false], ['p4', false]]),
        JSON.stringify(pinnedShapes));

    // --- image URLs resolve against this origin (thumbnails ship root-relative) ---
    const imgs = sandbox.sanitizeFeaturedItems(feed([item({
        thumbnail: '/featured-thumbs/alpha-abc123.png',
        icon: 'https://cdn.puter.site/i.png',
    })]))[0];
    check('a root-relative thumbnail resolves against the page origin',
        imgs.thumbnail === ORIGIN + '/featured-thumbs/alpha-abc123.png', imgs.thumbnail);
    check('an absolute thumbnail is kept as-is', imgs.icon === 'https://cdn.puter.site/i.png');
    const badImgs = sandbox.sanitizeFeaturedItems(feed([item({
        thumbnail: 'javascript:alert(1)',
        icon: 'data:image/svg+xml,<svg onload=alert(1)>',
    })]))[0];
    check('non-http(s) images are emptied, but the item itself is kept',
        badImgs.thumbnail === '' && badImgs.icon === '' && badImgs.name === 'Alpha',
        JSON.stringify(badImgs));

    // --- normalization: fixed key set, nothing smuggled through ---
    const normalized = sanitize(feed([item({ evil: '<script>', __proto__x: 1 }) ]))[0];
    check('the sanitized item has exactly the eight known keys',
        JSON.stringify(Object.keys(normalized).sort()) === JSON.stringify(NORMALIZED_KEYS),
        JSON.stringify(Object.keys(normalized)));
    check('unknown feed fields are dropped, not passed to the renderer',
        normalized.evil === undefined && !('__proto__x' in normalized));
    check('a __proto__ id cannot reach Object.prototype',
        ({}).polluted === undefined && !('evil' in ({})));

    // --- the sanity cap ---
    const many = Array.from({ length: 200 }, (_, i) => item({ id: 'i' + i, name: 'App ' + i }));
    check(`a huge batch is capped at ${MAX_ITEMS} items`,
        sanitize(feed(many)).length === MAX_ITEMS, String(sanitize(feed(many)).length));
    check('the cap keeps the first items, not a sample',
        sandbox.sanitizeFeaturedItems(feed(many))[0].id === 'i0' &&
        sandbox.sanitizeFeaturedItems(feed(many))[MAX_ITEMS - 1].id === 'i' + (MAX_ITEMS - 1));
    check('the cap counts accepted items, not raw entries',
        sandbox.sanitizeFeaturedItems(feed([
            ...Array.from({ length: 100 }, () => ({ name: 'no url' })),
            ...many,
        ])).length === MAX_ITEMS);

    check('the cap constant is the documented 40', createEnv().const('FEATURED_MAX_ITEMS') === 40);
}

// ============================================================================
// 2. shuffleFeaturedItems — pinned first, the rest rotated
// ============================================================================
{
    const pinned = item({ id: 'p1', name: 'P1', pinned: true });
    const pinned2 = item({ id: 'p2', name: 'P2', pinned: true });
    const rest = ['a', 'b', 'c', 'd'].map((n) => item({ id: n, name: n }));

    const shuffled = createEnv().sandbox.shuffleFeaturedItems([...rest, pinned, pinned2]);
    check('pinned items lead the list', shuffled[0] === pinned && shuffled[1] === pinned2);
    check('pinned items keep their curated order', shuffled[0].id === 'p1' && shuffled[1].id === 'p2');
    check('every item survives the shuffle, exactly once',
        shuffled.length === 6 &&
        new Set(shuffled.map((i) => i.id)).size === 6 &&
        rest.every((r) => shuffled.includes(r)));
    check('nothing unpinned is promoted above the pinned block',
        shuffled.slice(0, 2).every((i) => i.pinned === true));

    // The input is the cached batch; shuffling it in place would corrupt the
    // localStorage copy the next load compares against.
    const input = [...rest, pinned];
    const copy = input.slice();
    createEnv().sandbox.shuffleFeaturedItems(input);
    check('the source array is not mutated', input.length === copy.length && input.every((i, n) => i === copy[n]));
    check('a fresh array comes back', createEnv().sandbox.shuffleFeaturedItems(input) !== input);

    check('an all-pinned feed keeps its exact order',
        createEnv().sandbox.shuffleFeaturedItems([pinned, pinned2]).map((i) => i.id).join() === 'p1,p2');
    check('empty and single-item feeds pass through',
        createEnv().sandbox.shuffleFeaturedItems([]).length === 0 &&
        createEnv().sandbox.shuffleFeaturedItems([rest[0]]).length === 1);

    // Pin the RNG to pin the algorithm: j === 0 on every step walks the tail
    // element to the front each pass, so [a,b,c] must land as [b,c,a]. This
    // fails if the Fisher-Yates loop direction is ever flipped, which is the
    // classic way a "random" shuffle silently stops being uniform.
    const fixed = createEnv({ random: [0, 0, 0, 0] });
    check('the Fisher-Yates direction is unchanged (j=0 rotation)',
        fixed.sandbox.shuffleFeaturedItems([rest[0], rest[1], rest[2]]).map((i) => i.id).join() === 'b,c,a',
        fixed.sandbox.shuffleFeaturedItems([rest[0], rest[1], rest[2]]).map((i) => i.id).join());
    check('a pinned item still leads with a pinned RNG',
        fixed.sandbox.shuffleFeaturedItems([rest[0], pinned]).map((i) => i.id).join() === 'p1,a');

    // Over many draws the order has to actually move, or every visitor sees the
    // same grid and the "new picks daily" rotation is a lie.
    const spread = new Set();
    for (let i = 0; i < 60; i++) spread.add(createEnv().sandbox.shuffleFeaturedItems(rest).map((r) => r.id).join());
    check('the unpicked block is genuinely rotated across loads', spread.size > 1, [...spread].join(' | '));
}

// ============================================================================
// 3. featuredPlaceholderStyle — the gradient behind a missing screenshot
// ============================================================================
{
    const { sandbox } = createEnv();
    const style = sandbox.featuredPlaceholderStyle;

    check('the same id always yields the same gradient',
        style('alpha') === style('alpha'));
    check('different ids yield different gradients', style('alpha') !== style('beta'));

    const hues = style('BlockArena').match(/hsl\((\d+), (\d+)%, (\d+)%\)/g) || [];
    check('the gradient is two hsl() stops', hues.length === 2, style('BlockArena'));
    const nums = [...style('BlockArena').matchAll(/hsl\((\d+), (\d+)%, (\d+)%\)/g)].map((m) => m.slice(1).map(Number));
    check('every hue is an integer in [0, 360)', nums.every(([h]) => Number.isInteger(h) && h >= 0 && h < 360),
        style('BlockArena'));
    check('the second hue is the first plus 42, wrapped',
        nums.length === 2 && nums[1][0] === (nums[0][0] + 42) % 360, JSON.stringify(nums));
    check('an empty id does not throw', typeof style('') === 'string');

    // The seed is hashed, never interpolated, so it cannot close the style
    // attribute it is written into.
    const hostile = style('1);background:url(javascript:alert(1)');
    check('the seed cannot inject css',
        /^background: linear-gradient\(135deg, hsl\(\d+, 45%, 52%\), hsl\(\d+, 50%, 38%\)\)$/.test(hostile),
        hostile);
}

// ============================================================================
// 4. buildFeaturedCard — links, labels, and the no-HTML rule
// ============================================================================
{
    const { sandbox } = createEnv();

    const card = sandbox.buildFeaturedCard(sanitizeOne(sandbox, item()), 0);
    check('the card links out to the app', card.attrs.href === 'https://alpha.puter.site/',
        card.attrs.href);
    check('the card opens in a new tab, safely',
        card.attrs.target === '_blank' && card.attrs.rel === 'noopener noreferrer');
    check('the card carries its id and grid position',
        card.attrs['data-app-id'] === 'a1' && card.attrs['data-position'] === 0);
    check('the accessible label folds in the description and the new tab',
        card.attrs['aria-label'] === 'Alpha — First (opens in a new tab)', card.attrs['aria-label']);

    const noDesc = sandbox.buildFeaturedCard(sanitizeOne(sandbox, item({ description: '' })), 0);
    check('a descriptionless card does not get a dangling separator',
        noDesc.attrs['aria-label'] === 'Alpha (opens in a new tab)', noDesc.attrs['aria-label']);

    // .text() and .attr() only: the feed is remote content, so a card must
    // never be assembled by string concatenation.
    check('the renderer never interpolates HTML',
        !/\.html\s*\(/.test(featuredSrc) && !/innerHTML/.test(featuredSrc));
    const hostile = sandbox.buildFeaturedCard(sanitizeOne(sandbox, item({
        name: '<img src=x onerror=alert(1)>',
        description: '</div><script>alert(2)</script>',
        category: '"><b>x',
    })), 0);
    check('no node in the card is filled through an HTML sink',
        collect(hostile).every((e) => e.html_ === undefined));
    const titles = findAllClass(hostile, 'feed-card-title');
    const descs = findAllClass(hostile, 'feed-card-desc');
    const cats = findAllClass(hostile, 'feed-card-cat');
    check('a hostile name lands in a text node, not in markup',
        titles.length === 1 && titles[0].text_ === '<img src=x onerror=alert(1)>', titles[0] && titles[0].text_);
    check('a hostile description and category are text too',
        descs[0].text_ === '</div><script>alert(2)</script>' && cats[0].text_ === '"><b>x');
    check('no element is ever built from feed text',
        collect(hostile).every((e) => e.text_ === null || typeof e.text_ === 'string'));

    // --- thumbnails ---
    const eager = sandbox.buildFeaturedCard(sanitizeOne(sandbox, item({ thumbnail: '/t.png' })), 0);
    const eagerImg = findClass(eager, 'feed-thumb-img');
    check('the first row loads its screenshot eagerly',
        eagerImg.attrs.src === ORIGIN + '/t.png' && eagerImg.attrs['data-src'] === undefined);
    check('screenshot images are decorative (the card label carries the name)',
        eagerImg.attrs.alt === '' && eagerImg.attrs.decoding === 'async');

    const env = createEnv();
    const lazy = env.sandbox.buildFeaturedCard(
        env.sandbox.sanitizeFeaturedItems(feed([item({ thumbnail: '/t.png' })]))[0], 6);
    const lazyImg = findClass(lazy, 'feed-thumb-img');
    check('a below-the-fold screenshot waits for the observer',
        lazyImg.attrs.src === undefined && lazyImg.attrs['data-src'] === ORIGIN + '/t.png');
    check('the observer is rooted at the scrolling chat column with a lead margin',
        env.observers.length === 1 && env.observers[0].opts.root === env.els['#new-chat'] &&
        env.observers[0].opts.rootMargin === '600px 0px' &&
        env.observers[0].observed.length === 1);

    const noThumb = sandbox.buildFeaturedCard(sanitizeOne(sandbox, item({ thumbnail: '' })), 0);
    check('a thumbless item renders the gradient tile instead of an img',
        !!findClass(noThumb, 'feed-thumb-ph') && !findClass(noThumb, 'feed-thumb-img'));

    const failed = sandbox.buildFeaturedCard(sanitizeOne(sandbox, item({ thumbnail: '/t.png' })), 0);
    const failImg = findClass(failed, 'feed-thumb-img');
    failImg.fire('error');
    check('a screenshot that fails to load falls back to the gradient tile',
        failImg.removed === true && !!findClass(failed, 'feed-thumb-ph'));
    failImg.fire('load');
    check('a screenshot that loads marks itself loaded', failImg.classes.has('loaded'));

    const icon = sandbox.buildFeaturedCard(sanitizeOne(sandbox, item({ icon: '/i.png' })), 0);
    const iconImg = findClass(icon, 'feed-card-icon');
    check('an app icon is eager and drops itself on error',
        iconImg.attrs.src === ORIGIN + '/i.png' &&
        (iconImg.fire('error'), iconImg.removed === true));
}

// ============================================================================
// 5. lazyLoadFeaturedThumb — the observer callback itself
// ============================================================================
{
    const env = createEnv();
    const $img = makeEl('<img class="feed-thumb-img">');
    env.sandbox.lazyLoadFeaturedThumb($img, '/t.png');
    check('the img is parked on data-src until it nears the viewport',
        $img.attrs['data-src'] === '/t.png' && $img.attrs.src === undefined);

    // The observer watches the raw element ($img[0]) and promotes data-src to
    // src itself, so drive the callback the way the browser would.
    const el = $img[0];
    el.dataset.src = '/t.png';
    const observer = env.observers[0];
    observer.cb([{ isIntersecting: false, target: el }, { isIntersecting: true, target: el }]);
    check('the screenshot is promoted to src on the first intersection',
        el.src === '/t.png' && el.dataset.src === undefined);
    check('the observer stops watching a loaded image', observer.observed.length === 0);
    observer.cb([{ isIntersecting: true, target: el }]);
    check('a second intersection does not re-set src', el.src === '/t.png');

    const noIO = createEnv({ noIntersectionObserver: true });
    const $plain = makeEl('<img>');
    noIO.sandbox.lazyLoadFeaturedThumb($plain, '/t.png');
    check('without IntersectionObserver the src is set directly',
        $plain.attrs.src === '/t.png' && $plain.attrs['data-src'] === undefined);
}

// ============================================================================
// 6. renderFeaturedFeed — the 12-card window and the empty state
// ============================================================================
{
    const env = createEnv();
    const many = Array.from({ length: 30 }, (_, i) => item({ id: 'i' + i, name: 'App ' + i, thumbnail: '/t' + i + '.png' }));
    env.sandbox.renderFeaturedFeed(env.sandbox.sanitizeFeaturedItems(feed(many)));
    const feedEl = env.els['.home-feed'];
    check(`only ${DISPLAY_COUNT} cards render however large the feed is`,
        cardsOf(feedEl).length === DISPLAY_COUNT, String(cardsOf(feedEl).length));
    check('the section is revealed and marked on the chat column',
        feedEl.attrs.hidden === undefined && env.els['#new-chat'].classes.has('has-feed'));
    check('the header says what the grid is',
        findClass(feedEl, 'home-feed-title').text_ === 'From the community');

    // A pinned item 20 rows down would never survive a plain slice.
    const fair = createEnv();
    const pinned = item({ id: 'star', name: 'Star', pinned: true });
    const batch = fair.sandbox.sanitizeFeaturedItems(feed([
        ...Array.from({ length: 20 }, (_, i) => item({ id: 'i' + i, name: 'App ' + i })),
        pinned,
    ]));
    fair.sandbox.renderFeaturedFeed(fair.sandbox.shuffleFeaturedItems(batch));
    const fairCards = cardsOf(fair.els['.home-feed']);
    check('a pinned item always makes the card window',
        fairCards.length === DISPLAY_COUNT && fairCards.some((c) => c.attrs['data-app-id'] === 'star'));

    // --- empty feed: the feature must look absent, not broken ---
    const empty = createEnv();
    empty.sandbox.renderFeaturedFeed([]);
    check('an empty feed tears the section down',
        empty.els['.home-feed'].attrs.hidden === true &&
        empty.els['.home-feed'].children.length === 0 &&
        !empty.els['#new-chat'].classes.has('has-feed'));

    // --- re-render drops the observer holding the detached images ---
    const swap = createEnv();
    const draw = () => swap.sandbox.renderFeaturedFeed(swap.sandbox.sanitizeFeaturedItems(feed(many)));
    draw();
    const first = swap.observers[swap.observers.length - 1];
    check('the first draw observes the lazy screenshots',
        !!first && first.observed.length === DISPLAY_COUNT - 4, String(first && first.observed.length));
    draw();
    check('a re-render disconnects the observer behind the replaced cards',
        !!first && first.disconnected === 1 && swap.observers[swap.observers.length - 1] !== first);
}

// ============================================================================
// 7. initFeaturedFeed — the boot sequence
// ============================================================================
{
    const cached = feed([item({ id: 'c1', name: 'Cached' })]);

    // --- kill switch ---
    const off = createEnv({ featureFlag: false, storage: { [CACHE_KEY]: JSON.stringify(cached) } });
    off.init();
    await off.settle();
    check('with the flag off nothing is fetched, rendered or bound',
        off.fetches.length === 0 && off.els['.home-feed'] === undefined &&
        off.domOn.length === 0 && off.trackCalls.length === 0);
    check('the disabled state is the current default',
        /^\s*featuredFeed:\s*false\s*,/m.test(helpersSrc));

    // --- the cached batch paints before the network answers ---
    const cachedOnly = createEnv({ storage: { [CACHE_KEY]: JSON.stringify(cached) }, fetch: () => new Promise(() => {}) });
    cachedOnly.init();
    const cachedCards = cardsOf(cachedOnly.els['.home-feed']);
    check('the cached batch is painted synchronously, with no layout shift',
        cachedCards.length === 1 && cachedCards[0].attrs['data-app-id'] === 'c1', String(cachedCards.length));
    check('the request is cache-busted per day',
        cachedOnly.fetches.length === 1 && new RegExp('^' + FEED_URL + '\\?d=\\d{4}-\\d{2}-\\d{2}$').test(cachedOnly.fetches[0].url),
        cachedOnly.fetches[0].url);
    check('the feed request skips the HTTP cache', cachedOnly.fetches[0].init.cache === 'no-cache');

    // --- same content: no re-render, no cache write ---
    const same = createEnv({
        storage: { [CACHE_KEY]: JSON.stringify(cached) },
        fetch: async () => ({ ok: true, json: async () => cached }),
    });
    same.init();
    await same.settle();
    check('an unchanged batch is not re-rendered or re-cached',
        same.writes.length === 0 && same.trackCalls.length === 1);

    // --- changed content: re-render and refresh the cache ---
    const fresh = createEnv({
        storage: { [CACHE_KEY]: JSON.stringify(cached) },
        fetch: async () => ({ ok: true, json: async () => feed([item({ id: 'c1', name: 'Cached' }), item({ id: 'n1', name: 'New' })]) }),
    });
    fresh.init();
    await fresh.settle();
    const freshCards = cardsOf(fresh.els['.home-feed']);
    check('a changed batch replaces the painted grid',
        freshCards.length === 2 && freshCards.some((c) => c.attrs['data-app-id'] === 'n1'), String(freshCards.length));
    check('the cache is rewritten only when the content differs',
        fresh.writes.length === 1 && fresh.writes[0].key === CACHE_KEY &&
        JSON.parse(fresh.writes[0].value).items.length === 2);

    // --- failures must never blank a painted feed ---
    for (const [label, fetchImpl] of [
        ['a network error', async () => { throw new Error('offline'); }],
        ['a non-ok response', async () => ({ ok: false, json: async () => ({}) })],
        ['unparseable json', async () => ({ ok: true, json: async () => { throw new Error('bad json'); } })],
        ['an empty batch', async () => ({ ok: true, json: async () => feed([]) })],
        ['a rejected url', async () => ({ ok: true, json: async () => ({ items: [{ name: '', url: '' }] }) })],
    ]) {
        const env = createEnv({ storage: { [CACHE_KEY]: JSON.stringify(cached) }, fetch: fetchImpl });
        let threw = false;
        try { env.init(); await env.settle(); } catch (e) { threw = true; }
        const cards = cardsOf(env.els['.home-feed']);
        check(label + ' leaves the cached feed on screen',
            !threw && cards.length === 1 && cards[0].attrs['data-app-id'] === 'c1',
            threw ? 'threw' : String(cards.length));
    }

    // --- a corrupt cache is treated as absent ---
    const corrupt = createEnv({ storage: { [CACHE_KEY]: '{not json' } });
    let corruptThrew = false;
    try { corrupt.init(); await corrupt.settle(); } catch (e) { corruptThrew = true; }
    check('a corrupt localStorage batch is ignored, not fatal', !corruptThrew);

    // --- a full cache must not break the fresh copy ---
    const quota = createEnv({
        storage: { [CACHE_KEY]: JSON.stringify(cached) },
        storageThrows: true,
        fetch: async () => ({ ok: true, json: async () => feed([item({ id: 'n1', name: 'New' })]) }),
    });
    let quotaThrew = false;
    try { quota.init(); await quota.settle(); } catch (e) { quotaThrew = true; }
    const quotaCards = cardsOf(quota.els['.home-feed']);
    check('a quota failure writing the cache still renders the fresh batch',
        !quotaThrew && quotaCards.length === 1 && quotaCards[0].attrs['data-app-id'] === 'n1',
        String(quotaCards.length));

    // --- impressions ---
    const viewed = createEnv({ fetch: async () => ({ ok: true, json: async () => cached }) });
    viewed.init();
    viewed.init();
    await viewed.settle();
    check('one impression per landing view, however often init runs',
        viewed.trackCalls.filter((c) => c[0] === 'Featured Feed Seen').length === 1,
        JSON.stringify(viewed.trackCalls));

    const deepLink = createEnv({
        chatId: 'abc123',
        fetch: async () => ({ ok: true, json: async () => cached }),
    });
    deepLink.init();
    await deepLink.settle();
    check('a project deep link never counts a feed impression',
        deepLink.trackCalls.filter((c) => c[0] === 'Featured Feed Seen').length === 0);

    // --- the click beacon, and that re-init does not stack handlers ---
    const clicked = createEnv({ fetch: async () => ({ ok: true, json: async () => cached }) });
    clicked.init();
    await clicked.settle();
    check('the click beacon is bound after an off() so re-init cannot double-count',
        clicked.domOff.some((a) => a[0] === 'click.featuredFeed') &&
        clicked.domOn.length === 1 && clicked.domOn[0][0] === 'click.featuredFeed' &&
        clicked.domOn[0][1] === '.feed-card' && typeof clicked.domOn[0][2] === 'function',
        JSON.stringify(clicked.domOn.map((a) => a.slice(0, 2))));
    const card = makeEl('.feed-card');
    card.attrs['data-app-id'] = 'BlockArena';
    card.attrs['data-position'] = '3';
    clicked.domOn[0][2].call(card);
    check('a card click reports the app and its grid position',
        JSON.stringify(clicked.trackCalls.at(-1)) === JSON.stringify(['Featured App Opened', { app: 'BlockArena', position: 3 }]),
        JSON.stringify(clicked.trackCalls.at(-1)));
    const bare = makeEl('.feed-card');
    clicked.domOn[0][2].call(bare);
    check('a card click with no attributes does not throw',
        JSON.stringify(clicked.trackCalls.at(-1)[1]) === JSON.stringify({ app: '', position: 0 }));
}

// ============================================================================
// 8. Wiring, and the curated source the build feeds in
// ============================================================================
check('featured.js is part of the classic bundle',
    viteSrc.includes("'js/featured.js',"));
check('the feature flag is declared where vite.config.js featureFlag() reads it',
    new RegExp('^\\s*featuredFeed:\\s*(true|false)\\s*,', 'm').test(helpersSrc) &&
    viteSrc.includes("new RegExp(`^\\\\s*${name}:\\\\s*(true|false)\\\\s*,`, 'm')"),
    'the flag and its reader have drifted apart');
check('the landing skeleton only emits the section when the flag is on',
    uiSrc.includes('if (window.FEATURE_FLAGS?.featuredFeed) {') &&
    uiSrc.includes('<section class="home-feed" aria-label="Featured apps from the community" hidden>'));
check('initFeaturedFeed() is called once at boot, right after renderSkeleton()',
    (appSrc.match(/\n\s*initFeaturedFeed\(\);/g) || []).length === 1 &&
    /renderSkeleton\(\);[\s\S]{0,400}initFeaturedFeed\(\);/.test(appSrc));
check('the feed is fetched from the absolute path the build ships',
    featuredSrc.includes("const FEATURED_FEED_URL = '/featured.json';") &&
    viteSrc.includes("'featured.json'"));

{
    // Every curated entry must survive the sanitizer, or a card silently
    // vanishes from the landing page with nothing in the console to say so.
    const src = JSON.parse(read('../src/featured.json'));
    const { sandbox } = createEnv();
    const kept = sandbox.sanitizeFeaturedItems(src);
    check('the curated batch is shaped like the data contract',
        Array.isArray(src.items) && typeof src.updated === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(src.updated));
    check('every curated item is renderable (name + http(s) url)',
        kept.length === src.items.length,
        JSON.stringify(src.items.filter((i, n) => kept[n]?.id !== (typeof i.id === 'string' && i.id.trim() ? i.id.trim() : ''))));
    check('curated urls are all https puter sites',
        kept.every((i) => /^https:\/\/[a-z0-9.-]+\.puter\.site\/?$/.test(i.url)),
        JSON.stringify(kept.filter((i) => !/^https:\/\//.test(i.url)).map((i) => i.url)));
    check('curated ids are unique (data-app-id keys the analytics event)',
        new Set(kept.map((i) => i.id)).size === kept.length);
    check('curated names are non-empty and reasonably short',
        kept.every((i) => i.name && i.name.length <= 40));
    check('the curated batch fits under the sanitizer cap',
        src.items.length <= MAX_ITEMS, String(src.items.length));
}

// ---- helpers --------------------------------------------------------------
function sanitizeOne(sandbox, raw) { return sandbox.sanitizeFeaturedItems(feed([raw]))[0]; }
// Every element in the tree, so a card can be searched by class. Matched on the
// exact class attribute: 'feed-card-title' is also a prefix of
// 'feed-card-title-row'.
function collect(el, out = []) {
    out.push(el);
    for (const kid of el.children || []) if (kid && kid.sel !== undefined) collect(kid, out);
    return out;
}
function findClass(root, cls) { return collect(root).find((e) => e.sel.includes('class="' + cls + '"')); }
// The cards on screen, or [] when no grid was drawn: "how many cards are
// rendered" is 0 whether the grid is missing or merely empty.
function cardsOf(root) {
    if (!root) return [];
    const grid = findClass(root, 'home-feed-grid');
    return grid ? grid.children : [];
}
function findAllClass(root, cls) { return collect(root).filter((e) => e.sel.includes('class="' + cls + '"')); }

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll featured-feed checks passed.');