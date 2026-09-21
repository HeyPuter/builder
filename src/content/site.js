// Site-wide constants for the static marketing/SEO pages.
//
// These pages are rendered at BUILD time into dist/<slug>/index.html (see
// scripts/build-seo.mjs and the seoPages() plugin in vite.config.js). They are
// plain, self-contained documents: no app bundle, no framework, no client-side
// routing. Search engines, AI crawlers, and people on slow connections all get
// the full text in the first response.
//
// Everything here is data only — no Node APIs, no DOM — so the renderer and its
// tests can import this file directly.

// Canonical origin. Every canonical/OG/sitemap URL is built from this, so it is
// the one place a domain change has to be made.
export const ORIGIN = 'https://builder.puter.com';

// The product, named consistently across every page and every schema block.
export const BRAND = 'AI Builder by Puter';
export const BRAND_SHORT = 'AI Builder';
export const PUBLISHER = 'Puter Technologies Inc.';

// The hosting stack serves <path>/index.html for a directory URL and 301s the
// slash-less form to it (verified against the live CloudFront/S3 origin). So the
// non-redirecting, canonical form of every page URL ends in a slash — canonicals
// and sitemap entries MUST use it, or every indexed URL costs a redirect hop.
export function urlFor(slug) {
    if (!slug) return `${ORIGIN}/`;
    return `${ORIGIN}/${slug}/`;
}

export function pathFor(slug) {
    return slug ? `/${slug}/` : '/';
}

// Deep link into the builder with the composer pre-filled. Handled by
// applyPromptDeepLink() in src/js/app.js: it drops the text into the input and
// leaves the send to the visitor, exactly like a starter chip.
export function buildLink(prompt) {
    return prompt ? `/?prompt=${encodeURIComponent(prompt)}` : '/';
}

// Privacy-friendly analytics. This is the same Plausible script the app shell
// loads (src/index.html) — the ids MUST stay identical or the marketing pages
// and the app report as two different sites. test-seo.mjs asserts they match.
export const PLAUSIBLE_SRC = 'https://plausible.io/js/pa-TFe2q9zANEWpbEbfrsjzG.js';

// External destinations, kept here so a moved URL is a one-line fix. Verified
// against the live sites; docs paths are case-sensitive (/Workers/, /Peer/).
export const LINKS = {
    puter: 'https://puter.com/',
    docs: 'https://docs.puter.com/',
    puterJs: 'https://docs.puter.com/getting-started/',
    workers: 'https://docs.puter.com/Workers/',
    peer: 'https://docs.puter.com/Peer/',
    userPays: 'https://docs.puter.com/user-pays-model/',
    // Puter itself is open source. The builder's own repository is NOT public —
    // do not link it, and do not describe the builder as open source.
    puterGithub: 'https://github.com/HeyPuter/puter',
    x: 'https://x.com/HeyPuter',
    discord: 'https://discord.com/invite/PQcx7Teh8u',
};

// Header navigation, in priority order. Also the primary internal-link graph:
// every page links to every other, so crawl depth from the homepage is 1.
export const HEADER_NAV = [
    { label: 'App builder', slug: 'ai-app-builder' },
    { label: 'Website builder', slug: 'ai-website-builder' },
    { label: "Who it's for", slug: 'for' },
    { label: 'What to build', slug: 'what-to-build' },
    { label: 'Features', slug: 'features' },
    { label: 'Guides', slug: 'guides' },
];

// Footer link map. Internal entries reference a page slug; external ones carry a
// full href. Groups are rendered in order.
export const FOOTER_NAV = [
    {
        heading: 'Build',
        links: [
            { label: 'AI app builder', slug: 'ai-app-builder' },
            { label: 'AI website builder', slug: 'ai-website-builder' },
            { label: 'What to build', slug: 'what-to-build' },
            { label: 'Features', slug: 'features' },
        ],
    },
    {
        heading: 'Made for',
        links: [
            { label: "Who it's for", slug: 'for' },
            { label: 'Personal trainers', slug: 'for/personal-trainers' },
            { label: 'Lawyers', slug: 'for/lawyers' },
            { label: 'Accountants', slug: 'for/accountants' },
            { label: 'Real estate agents', slug: 'for/real-estate-agents' },
            { label: 'Restaurants', slug: 'for/restaurants' },
        ],
    },
    {
        heading: 'Learn',
        links: [
            { label: 'Guides', slug: 'guides' },
            { label: 'How to build an app with AI', slug: 'guides/how-to-build-an-app-with-ai' },
            { label: 'How to write a build prompt', slug: 'guides/how-to-write-a-build-prompt' },
            { label: 'What is vibe coding?', slug: 'vibe-coding' },
        ],
    },
    {
        heading: 'Platform',
        links: [
            { label: 'Puter', href: LINKS.puter },
            { label: 'Puter.js docs', href: LINKS.docs },
            { label: 'Serverless workers', href: LINKS.workers },
            { label: 'User-pays model', href: LINKS.userPays },
        ],
    },
    {
        heading: 'Community',
        links: [
            { label: 'Discord', href: LINKS.discord },
            { label: 'X', href: LINKS.x },
            { label: 'Puter on GitHub', href: LINKS.puterGithub },
        ],
    },
];

// Organization node, referenced by @id from every page's graph so search engines
// see one publisher entity rather than a copy per page.
export const ORGANIZATION = {
    '@type': 'Organization',
    '@id': `${ORIGIN}/#organization`,
    name: 'Puter',
    legalName: PUBLISHER,
    url: LINKS.puter,
    logo: {
        '@type': 'ImageObject',
        url: `${ORIGIN}/favicons/icon-512.png`,
        width: 512,
        height: 512,
    },
    sameAs: [LINKS.x, LINKS.puterGithub, LINKS.discord],
};

// The product itself, also referenced by @id. Claims here must stay true of the
// shipping app: it is free to use with a Puter account and runs in the browser.
export const SOFTWARE_APPLICATION = {
    '@type': 'WebApplication',
    '@id': `${ORIGIN}/#software`,
    name: BRAND,
    alternateName: ['Puter AI Builder', 'Puter Builder'],
    url: `${ORIGIN}/`,
    applicationCategory: 'DeveloperApplication',
    applicationSubCategory: 'AI app builder',
    operatingSystem: 'Any (web-based)',
    browserRequirements: 'Requires JavaScript and a modern web browser.',
    inLanguage: 'en',
    isAccessibleForFree: true,
    offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        availability: 'https://schema.org/InStock',
    },
    featureList: [
        'Build a working web app from a plain-English description',
        'Live preview that reloads as the app is written',
        'Automatic error detection and repair after each change',
        'Click an element in the preview to edit it',
        'One-click publishing to a public URL',
        'Version history with restore',
        'Download the whole project as a zip',
        'Cloud storage, database, auth, AI, and serverless workers via Puter.js',
    ],
    publisher: { '@id': `${ORIGIN}/#organization` },
};
