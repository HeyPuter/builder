// Renderer for the static marketing/SEO pages.
//
// Pure functions only: every one takes its inputs as arguments and returns a
// string, so the whole thing is unit-testable without touching disk (see
// scripts/test-seo.mjs). All file I/O — reading the stylesheet, extracting the
// font, writing dist/<slug>/index.html, generating the social cards — lives in
// the seoPages() plugin in vite.config.js, mirroring how build-sw.mjs works.
//
// Content lives in src/content/pages/*.js and is described declaratively (a hero
// plus a list of typed sections). That is deliberate: it means the head tags,
// the structured data, the breadcrumbs, the sitemap entry and the llms.txt line
// are all DERIVED from one description of the page instead of being maintained
// by hand in nine files, which is how those things drift out of sync.

import { PAGES } from '../src/content/pages/index.js';
import { ICONS, SCENES } from '../src/content/art.js';
import {
    ORIGIN,
    BRAND,
    BRAND_SHORT,
    PUBLISHER,
    HEADER_NAV,
    FOOTER_NAV,
    LINKS,
    ORGANIZATION,
    SOFTWARE_APPLICATION,
    PLAUSIBLE_SRC,
    urlFor,
    pathFor,
    buildLink,
} from '../src/content/site.js';

export { PAGES };

/* ------------------------------------------------------------------ *
 * Escaping and tiny inline markup
 * ------------------------------------------------------------------ */

export function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Only these schemes may appear in a content link. The content is first-party,
// but the check is cheap and keeps a typo from silently emitting a javascript:
// URL into a published page.
const SAFE_HREF = /^(https?:\/\/|\/|#|mailto:)/i;

/**
 * A deliberately tiny inline syntax for body copy: **bold**, *emphasis*,
 * `code`, and [text](href). Escaping happens FIRST and the patterns are applied
 * to the escaped string, so no author input can ever reach the output as markup.
 */
export function inline(text) {
    let s = escapeHtml(text);
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, href) => {
        // href was escaped above, so &amp; is already correct for an attribute.
        const raw = href.replace(/&amp;/g, '&');
        if (!SAFE_HREF.test(raw)) return label;
        const external = /^https?:\/\//i.test(raw) && !raw.startsWith(ORIGIN);
        const rel = external ? ' rel="noopener"' : '';
        return `<a href="${href}"${rel}>${label}</a>`;
    });
    return s;
}

// Plain text for attributes and structured data: same syntax, markup stripped.
export function plain(text) {
    return String(text)
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1$2')
        .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1');
}

// JSON-LD has to survive being inside a <script> element: the only sequence that
// can break out is "</", so escaping "<" is sufficient and keeps the JSON valid.
function jsonLd(data) {
    return JSON.stringify(data, null, 0).replace(/</g, '\\u003c');
}

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

// Social-card filename for a page. Slugs can contain a slash (guides/…), which
// a flat directory cannot, so they collapse to dashes.
export function ogKey(slug) {
    return slug ? slug.replace(/\//g, '-') : 'home';
}

export function ogUrl(slug) {
    return `${ORIGIN}/og/${ogKey(slug)}.png`;
}

function hrefFor(entry) {
    if (entry.href) return entry.href;
    return pathFor(entry.slug);
}

function isExternal(href) {
    return /^https?:\/\//i.test(href) && !href.startsWith(ORIGIN);
}

function link(entry, extraAttrs = '') {
    const href = hrefFor(entry);
    const rel = isExternal(href) ? ' rel="noopener"' : '';
    return `<a href="${escapeHtml(href)}"${rel}${extraAttrs}>${escapeHtml(entry.label)}</a>`;
}

/* ------------------------------------------------------------------ *
 * Vector art
 *
 * Icons and scenes come from src/content/art.js as first-party markup strings
 * and are inserted unescaped. An unknown name throws, and the test suite
 * renders every page, so a typo in a content module fails the build
 * instead of shipping a blank spot.
 * ------------------------------------------------------------------ */

export function icon(name) {
    const paths = ICONS[name];
    if (!paths) throw new Error(`[seo] unknown icon: ${name}`);
    return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
        `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

// Disclosure chevron for FAQ summaries. Inline (not in ICONS) because it is
// layout chrome for one component rather than content art a page can pick.
const CHEVRON =
    '<svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

function scene(name) {
    const art = SCENES[name];
    if (!art) throw new Error(`[seo] unknown scene: ${name}`);
    return `<svg class="scene" viewBox="0 0 360 240" fill="none" aria-hidden="true">${art}</svg>`;
}

/* ------------------------------------------------------------------ *
 * The hero demo: a miniature of the product, in HTML and CSS
 *
 * Pages can carry `hero.demo`, a tiny declarative spec of the builder
 * window: the sentence typed into the chat, and the app that takes shape
 * in the preview pane next to it. It renders as plain markup animated
 * entirely by CSS (staggered via a --i custom property), weighs a couple
 * of kilobytes, needs no JavaScript, and re-themes with the document.
 * Vertical pages use it to show THEIR reader's app, not a generic one.
 * ------------------------------------------------------------------ */

const DEMO_TASKS = ['Writing the files', 'Running the preview', 'Verified, no errors'];

const DEMO_BLOCKS = {
    stats(block) {
        const items = block.items.map((item) =>
            `<div class="demo-stat"><b>${escapeHtml(item.value)}</b><span>${escapeHtml(item.label)}</span></div>`,
        ).join('');
        return `<div class="demo-stats">${items}</div>`;
    },
    bars(block) {
        const bars = block.values.map((v, i) =>
            `<i style="--h:${Math.max(8, Math.min(100, v))}%;--b:${i}"></i>`,
        ).join('');
        const label = block.label ? `<span>${escapeHtml(block.label)}</span>` : '';
        return `<div class="demo-bars">${label}<div class="demo-bars-track">${bars}</div></div>`;
    },
    list(block) {
        const rows = block.rows.map((row) =>
            `<div class="demo-row"><i></i><div><b>${escapeHtml(row.title)}</b>` +
            `<span>${escapeHtml(row.sub)}</span></div>` +
            (row.tag ? `<em>${escapeHtml(row.tag)}</em>` : '') + `</div>`,
        ).join('');
        return `<div class="demo-list">${rows}</div>`;
    },
};

function renderDemo(demo) {
    const tasks = (demo.tasks || DEMO_TASKS).map((task, i) =>
        `<span class="demo-task" style="--i:${i}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
        `stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">` +
        `<path d="M5 12.5l4.5 4.5L19 7.5"/></svg>${escapeHtml(task)}</span>`,
    ).join('');

    const blocks = (demo.app.blocks || []).map((block, i) => {
        const render = DEMO_BLOCKS[block.kind];
        if (!render) throw new Error(`[seo] unknown demo block: ${block.kind}`);
        return `<div class="demo-block" style="--i:${i}">${render(block)}</div>`;
    }).join('');

    return `<div class="demo" aria-hidden="true"><div class="demo-window">` +
        `<div class="demo-titlebar"><span class="demo-dots"><i></i><i></i><i></i></span>` +
        `<span class="demo-url">${escapeHtml(demo.app.name)}</span></div>` +
        `<div class="demo-cols">` +
        `<div class="demo-chat"><p class="demo-user">${escapeHtml(demo.prompt)}</p>` +
        `<div class="demo-ai">${tasks}</div></div>` +
        `<div class="demo-app"><div class="demo-app-head"><span>${escapeHtml(demo.app.header)}</span><i></i></div>` +
        blocks +
        `</div></div></div></div>`;
}

/* ------------------------------------------------------------------ *
 * The hero composer: the app's chat box, on a marketing page
 *
 * Pages can carry `hero.composer` instead of a demo. It behaves like the
 * composer on the app's landing screen: the visitor types, attaches files
 * (picker, paste or drop), presses send, and the build starts. What the
 * builder does on that send, it does here: a signed-out visitor is asked to
 * sign in first, inside the click, and the sign-in popup is what carries on
 * to the app. The send itself (text and files) travels through IndexedDB
 * (src/js/handoff.js, inlined above the composer script) and the URL carries
 * its id plus the text (/?prompt=…&handoff=<id>, the text so the box is full
 * on the first frame); applyPromptDeepLink and consumeComposerHandoff in
 * src/js/app.js pick it up and send.
 *
 * Without JavaScript it is a plain GET form posting `prompt` to the app
 * root, which is exactly the deep link buildLink() produces: the visitor
 * lands in the builder with their sentence already in the chat box. The
 * attach button is born hidden and only revealed by the script, so that
 * fallback shows nothing it cannot do.
 *
 * The placeholder is the first of the page's example prompts; the script
 * types the rest out and back letter by letter.
 * ------------------------------------------------------------------ */

// The app's own icons, byte for byte: window.send_svg and
// window.attachment_svg in src/index.html, and NON_RENDERED_FILE_URL (the
// thumbnail for a file that is not an image) in src/js/app.js. test-seo.mjs
// asserts these three copies still match those.
const SEND_SVG = '<svg style="width: 20px; height: 20px;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="32px" height="32px" viewBox="0 0 32 32"><g transform="translate(0, 0)"><path d="M16.354,1.146a.5.5,0,0,0-.708,0l-10.5,10.5a.5.5,0,0,0,0,.708l2,2a.5.5,0,0,0,.708,0L14,8.207V30.5a.5.5,0,0,0,.5.5h3a.5.5,0,0,0,.5-.5V8.207l6.146,6.147a.5.5,0,0,0,.708,0l2-2a.5.5,0,0,0,0-.708Z" fill="#ffffff"></path></g></svg>';
const ATTACHMENT_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49"></path></svg>';
export const FILE_ICON_URL = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWZpbGUtaWNvbiBsdWNpZGUtZmlsZSI+PHBhdGggZD0iTTE1IDJINmEyIDIgMCAwIDAtMiAydjE2YTIgMiAwIDAgMCAyIDJoMTJhMiAyIDAgMCAwIDItMlY3WiIvPjxwYXRoIGQ9Ik0xNCAydjRhMiAyIDAgMCAwIDIgMmg0Ii8+PC9zdmc+';

function renderComposer(composer) {
    const examples = composer.examples || [];
    const label = composer.label || 'Describe what you want to build';
    const submit = composer.submit || 'Start building';
    // Same structure as the app's composer (renderSkeleton in src/js/ui.js,
    // updateAttachmentDisplay in app.js): the attachment tray above the box,
    // the textarea, then the actions row with attach on the left and send on
    // the right. The class names differ so marketing.css stays self-contained;
    // the styles are copied from css/styles.css rule for rule.
    return `<form class="hero-composer" action="/" method="get">` +
        `<div class="hero-composer-files" aria-label="Attached files" hidden><div class="hero-composer-thumbs"></div></div>` +
        `<div class="hero-composer-box">` +
        `<label class="sr-only" for="hero-prompt">${escapeHtml(label)}</label>` +
        `<textarea class="hero-composer-message" id="hero-prompt" name="prompt" rows="3" required maxlength="2000" autocomplete="off" ` +
        `placeholder="${escapeHtml(examples[0] || label)}" data-examples="${escapeHtml(JSON.stringify(examples))}"></textarea>` +
        `<div class="hero-composer-actions">` +
        // No `name` on the file input: with JavaScript off the form is a GET,
        // and a named file field would leak the chosen filenames into the URL.
        `<button class="hero-composer-attach" type="button" title="Attach files from your computer" aria-label="Attach files from your computer" hidden>${ATTACHMENT_SVG}</button>` +
        `<input class="hero-composer-file-input" type="file" multiple tabindex="-1" aria-hidden="true" hidden>` +
        `<button class="hero-composer-send" type="submit" title="${escapeHtml(submit)}" ` +
        `aria-label="${escapeHtml(submit)}">${SEND_SVG}</button>` +
        `</div></div></form>`;
}

/* ------------------------------------------------------------------ *
 * Chrome: header, footer, breadcrumbs
 * ------------------------------------------------------------------ */

function renderHeader(page) {
    const nav = HEADER_NAV.map((item) => {
        const current = item.slug === page.slug ? ' aria-current="page"' : '';
        return link(item, current);
    }).join('');

    return `<header class="site-header"><div class="wrap">` +
        `<a class="brand" href="/"><img src="/favicons/app-icon.png" alt="" width="26" height="26" decoding="async">` +
        `<span>${escapeHtml(BRAND_SHORT)}</span></a>` +
        `<nav class="site-nav" aria-label="Main">${nav}</nav>` +
        `<a class="btn btn-primary btn-sm" href="/">Start building</a>` +
        `</div></header>`;
}

function renderFooter() {
    const cols = FOOTER_NAV.map((group) => {
        const items = group.links.map((entry) => `<li>${link(entry)}</li>`).join('');
        return `<div class="footer-col"><h2>${escapeHtml(group.heading)}</h2><ul>${items}</ul></div>`;
    }).join('');

    return `<footer class="site-footer"><div class="wrap">` +
        `<div class="footer-grid">` +
        `<div class="footer-about">` +
        `<a class="brand" href="/"><img src="/favicons/app-icon.png" alt="" width="26" height="26" loading="lazy" decoding="async">` +
        `<span>${escapeHtml(BRAND_SHORT)}</span></a>` +
        `<p>Describe an app or a website and it gets built, verified, and published. Free, in your browser, from the team behind Puter.</p>` +
        `</div>${cols}</div>` +
        `<div class="footer-bottom">` +
        `<span>&copy; 2026 ${escapeHtml(PUBLISHER)}</span>` +
        `<span><a href="${escapeHtml(LINKS.puter)}" rel="noopener">Puter</a> &middot; ` +
        `<a href="${escapeHtml(LINKS.docs)}" rel="noopener">Docs</a> &middot; ` +
        `<a href="${escapeHtml(LINKS.discord)}" rel="noopener">Discord</a></span>` +
        `</div></div></footer>`;
}

// Breadcrumb trail, derived from the page's `parent` chain. Returns null for a
// top-level page, where a one-item trail would be noise.
function crumbTrail(page, bySlug) {
    if (!page.parent) return null;
    const trail = [{ label: 'Home', slug: '' }];
    const parent = bySlug.get(page.parent);
    if (parent) trail.push({ label: parent.navLabel || parent.hero.h1, slug: parent.slug });
    trail.push({ label: page.navLabel || page.hero.h1, slug: page.slug });
    return trail;
}

function renderCrumbs(trail) {
    if (!trail) return '';
    const items = trail.map((entry, i) => {
        const last = i === trail.length - 1;
        const label = escapeHtml(entry.label);
        return `<li>${last ? `<span>${label}</span>` : `<a href="${escapeHtml(pathFor(entry.slug))}">${label}</a>`}</li>`;
    }).join('');
    return `<nav class="crumbs" aria-label="Breadcrumb"><ol>${items}</ol></nav>`;
}

/* ------------------------------------------------------------------ *
 * Sections
 * ------------------------------------------------------------------ */

function heading(section, level = 'h2') {
    if (!section.heading) return '';
    const id = section.id ? ` id="${escapeHtml(section.id)}"` : '';
    return `<${level}${id}>${inline(section.heading)}</${level}>`;
}

function paragraphs(list) {
    return (list || []).map((p) => `<p>${inline(p)}</p>`).join('');
}

function bulletList(list) {
    if (!list || !list.length) return '';
    return `<ul>${list.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`;
}

function afterBlock(list) {
    if (!list || !list.length) return '';
    return `<div class="section-after">${paragraphs(list)}</div>`;
}

const RENDERERS = {
    prose(section) {
        const quote = section.quote ? `<blockquote class="quote">${inline(section.quote)}</blockquote>` : '';
        return `<section><div class="wrap">${heading(section)}` +
            `<div class="prose">${paragraphs(section.body)}${bulletList(section.list)}${quote}</div>` +
            `${afterBlock(section.after)}</div></section>`;
    },

    grid(section) {
        const cards = section.items.map((item) =>
            `<article class="card">` +
            (item.icon ? `<span class="card-icon">${icon(item.icon)}</span>` : '') +
            `<h3>${inline(item.title)}</h3><p>${inline(item.body)}</p></article>`,
        ).join('');
        const cols = section.columns === 2 ? ' cols-2' : '';
        const intro = section.intro ? `<p class="section-intro">${inline(section.intro)}</p>` : '';
        return `<section><div class="wrap">${heading(section)}${intro}` +
            `<div class="grid${cols}">${cards}</div>${afterBlock(section.after)}</div></section>`;
    },

    // Alternating rows of copy and a themed vignette. This is the section that
    // replaces a wall of text: each row makes one point, illustrated.
    split(section) {
        const rows = section.items.map((item) =>
            `<div class="split-row"><div class="split-copy">` +
            `<h3>${inline(item.title)}</h3>${paragraphs(item.body)}${bulletList(item.list)}` +
            (item.link ? `<p class="split-link"><a href="${escapeHtml(item.link.href)}">${escapeHtml(item.link.label)}</a></p>` : '') +
            `</div><div class="split-art">${scene(item.art)}</div></div>`,
        ).join('');
        const intro = section.intro ? `<p class="section-intro">${inline(section.intro)}</p>` : '';
        return `<section><div class="wrap">${heading(section)}${intro}` +
            `<div class="split">${rows}</div>${afterBlock(section.after)}</div></section>`;
    },

    // The vertical hub: one card per profession, each linking to its page.
    personas(section) {
        const cards = section.items.map((item) => {
            const href = hrefFor(item);
            const more = item.more || section.more || 'See what to build';
            return `<a class="persona-card" href="${escapeHtml(href)}">` +
                `<span class="card-icon">${icon(item.icon)}</span>` +
                `<h3>${inline(item.label)}</h3><p>${inline(item.body)}</p>` +
                `<span class="persona-more">${escapeHtml(more)}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span>` +
                `</a>`;
        }).join('');
        const intro = section.intro ? `<p class="section-intro">${inline(section.intro)}</p>` : '';
        return `<section><div class="wrap">${heading(section)}${intro}` +
            `<div class="grid personas">${cards}</div>${afterBlock(section.after)}</div></section>`;
    },

    steps(section) {
        const items = section.items.map((item) =>
            `<li><h3>${inline(item.title)}</h3><p>${inline(item.body)}</p></li>`,
        ).join('');
        const intro = section.intro ? `<p class="section-intro">${inline(section.intro)}</p>` : '';
        return `<section><div class="wrap">${heading(section)}${intro}` +
            `<ol class="steps">${items}</ol>${afterBlock(section.after)}</div></section>`;
    },

    prompts(section) {
        const cards = section.items.map((item) => {
            const href = buildLink(item.prompt);
            return `<article class="prompt-card"><h3>${inline(item.title)}</h3><p>${inline(item.body)}</p>` +
                `<details class="prompt-reveal"><summary>Show the prompt</summary>` +
                `<p>${escapeHtml(item.prompt)}</p></details>` +
                `<a class="btn btn-secondary btn-sm" href="${escapeHtml(href)}">Build this</a></article>`;
        }).join('');
        const intro = section.intro ? `<p class="section-intro">${inline(section.intro)}</p>` : '';
        return `<section><div class="wrap">${heading(section)}${intro}` +
            `<div class="grid">${cards}</div></div></section>`;
    },

    compare(section) {
        const note = section.note ? `<p class="compare-note">${inline(section.note)}</p>` : '';
        return `<section><div class="wrap">${heading(section)}<div class="compare">` +
            `<p>${inline(section.body)}</p><div class="compare-pair">` +
            `<div class="compare-box"><span class="label">Vague</span><q>${escapeHtml(section.before)}</q></div>` +
            `<div class="compare-box is-after"><span class="label">Specific</span><q>${escapeHtml(section.after)}</q></div>` +
            `</div>${note}</div></div></section>`;
    },

    faq(section) {
        const items = section.items.map((item, i) =>
            `<details class="faq-item"${i === 0 ? ' open' : ''}>` +
            `<summary><h3>${inline(item.q)}</h3>${CHEVRON}</summary>` +
            `<div class="faq-body"><div class="faq-body-inner">${paragraphs(item.a)}</div></div></details>`,
        ).join('');
        return `<section><div class="wrap">${heading(section)}<div class="faq">${items}</div></div></section>`;
    },

    links(section) {
        const cards = section.items.map((item) => {
            const href = hrefFor(item);
            const rel = isExternal(href) ? ' rel="noopener"' : '';
            return `<a class="link-card" href="${escapeHtml(href)}"${rel}>` +
                (item.icon ? `<span class="card-icon">${icon(item.icon)}</span>` : '') +
                `<h3>${inline(item.label)}</h3><p>${inline(item.body)}</p></a>`;
        }).join('');
        const intro = section.intro ? `<p class="section-intro">${inline(section.intro)}</p>` : '';
        return `<section><div class="wrap">${heading(section)}${intro}` +
            `<div class="link-list">${cards}</div></div></section>`;
    },

    cta(section) {
        const href = section.href || '/';
        return `<section class="cta-band"><div class="wrap">${heading(section)}` +
            `<p>${inline(section.body)}</p>` +
            `<a class="btn btn-primary" href="${escapeHtml(href)}">${escapeHtml(section.label || 'Start building')}</a>` +
            `</div></section>`;
    },
};

function renderSection(section) {
    const render = RENDERERS[section.type];
    if (!render) throw new Error(`[seo] unknown section type: ${section.type}`);
    return render(section);
}

function renderRelated(page, bySlug) {
    if (!page.related || !page.related.length) return '';
    const items = page.related.map((slug) => {
        const target = bySlug.get(slug);
        if (!target) throw new Error(`[seo] "${page.slug}" links to unknown page "${slug}"`);
        return `<li><a href="${escapeHtml(pathFor(target.slug))}">${escapeHtml(target.navLabel || target.hero.h1)}</a> ` +
            `<span>${escapeHtml(plain(target.ogTagline || ''))}</span></li>`;
    }).join('');
    return `<section class="related"><div class="wrap"><h2>Keep reading</h2><ul>${items}</ul></div></section>`;
}

/* ------------------------------------------------------------------ *
 * Structured data
 * ------------------------------------------------------------------ */

function faqNodes(page) {
    const section = (page.sections || []).find((s) => s.type === 'faq');
    if (!section) return null;
    return section.items.map((item) => ({
        '@type': 'Question',
        name: plain(item.q),
        acceptedAnswer: { '@type': 'Answer', text: item.a.map(plain).join('\n\n') },
    }));
}

function howToNode(page, url) {
    const section = (page.sections || []).find((s) => s.type === 'steps' && s.schema);
    if (!section) return null;
    return {
        '@type': 'HowTo',
        '@id': `${url}#howto`,
        name: section.schema.name,
        description: section.schema.description,
        totalTime: section.schema.totalTime || 'PT10M',
        step: section.items.map((item, i) => ({
            '@type': 'HowToStep',
            position: i + 1,
            name: plain(item.title),
            text: plain(item.body),
            url: `${url}#${section.id}`,
        })),
    };
}

function breadcrumbNode(trail, url) {
    if (!trail) return null;
    return {
        '@type': 'BreadcrumbList',
        '@id': `${url}#breadcrumb`,
        itemListElement: trail.map((entry, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: entry.label,
            item: urlFor(entry.slug),
        })),
    };
}

function buildGraph(page, { url, trail }) {
    const isArticle = page.type === 'guide';
    const faq = faqNodes(page);
    const howTo = howToNode(page, url);
    const crumbs = breadcrumbNode(trail, url);

    const website = {
        '@type': 'WebSite',
        '@id': `${ORIGIN}/#website`,
        url: `${ORIGIN}/`,
        name: BRAND,
        description:
            'Build apps and websites by describing them. Free, in your browser, with hosting and a cloud backend included.',
        inLanguage: 'en',
        publisher: { '@id': ORGANIZATION['@id'] },
    };

    const pageTypes = isArticle ? ['Article'] : ['WebPage'];
    if (faq) pageTypes.push('FAQPage');

    const pageNode = {
        '@type': pageTypes.length === 1 ? pageTypes[0] : pageTypes,
        '@id': `${url}#webpage`,
        url,
        name: page.title,
        headline: plain(page.hero.h1),
        description: page.description,
        isPartOf: { '@id': website['@id'] },
        inLanguage: 'en',
        datePublished: page.published || page.updated,
        dateModified: page.updated,
        primaryImageOfPage: { '@type': 'ImageObject', url: ogUrl(page.slug), width: 1200, height: 630 },
        about: { '@id': SOFTWARE_APPLICATION['@id'] },
    };
    if (isArticle) {
        pageNode.image = ogUrl(page.slug);
        pageNode.author = { '@id': ORGANIZATION['@id'] };
        pageNode.publisher = { '@id': ORGANIZATION['@id'] };
        pageNode.mainEntityOfPage = url;
    }
    if (faq) pageNode.mainEntity = faq;
    if (crumbs) pageNode.breadcrumb = { '@id': crumbs['@id'] };

    const graph = [ORGANIZATION, website, SOFTWARE_APPLICATION, pageNode];
    if (crumbs) graph.push(crumbs);
    if (howTo) graph.push(howTo);

    return { '@context': 'https://schema.org', '@graph': graph };
}

/* ------------------------------------------------------------------ *
 * The page
 * ------------------------------------------------------------------ */

/**
 * Render one page to a complete HTML document.
 *
 * @param {object} page   a module from src/content/pages/
 * @param {object} opts
 * @param {string} opts.css       stylesheet text, inlined into <head>
 * @param {string} opts.fontCss   @font-face rules for the self-hosted font
 * @param {string} opts.fontUrl   the woff2 to preload (empty to skip)
 * @param {string} opts.handoffJs src/js/handoff.js, inlined into pages that
 *                                carry a composer (required for those)
 * @param {Map}    opts.bySlug    every page, for related links and breadcrumbs
 */
export function renderPage(page, { css = '', fontCss = '', fontUrl = '', handoffJs = '', bySlug }) {
    const url = urlFor(page.slug);
    const trail = crumbTrail(page, bySlug);
    const hero = page.hero;
    if (hero.composer && !handoffJs) {
        throw new Error(`${page.slug}: the hero composer needs src/js/handoff.js (opts.handoffJs) to hand files to the app`);
    }

    const preloadFont = fontUrl
        ? `<link rel="preload" href="${escapeHtml(fontUrl)}" as="font" type="font/woff2" crossorigin>`
        : '';

    const heroActions = [];
    if (hero.cta) {
        heroActions.push(
            `<a class="btn btn-primary" href="${escapeHtml(hero.cta.href)}">${escapeHtml(hero.cta.label)}</a>`,
        );
    }
    if (hero.secondary) {
        heroActions.push(
            `<a class="btn btn-secondary" href="${escapeHtml(hero.secondary.href)}">${escapeHtml(hero.secondary.label)}</a>`,
        );
    }

    const metaBits = [];
    if (page.type === 'guide') {
        metaBits.push(`Updated ${formatDate(page.updated)}`);
        if (page.readingTime) metaBits.push(escapeHtml(page.readingTime));
    }

    const heroCopy =
        `<div class="hero-copy">` +
        (hero.eyebrow ? `<p class="eyebrow">${escapeHtml(hero.eyebrow)}</p>` : '') +
        `<h1>${inline(hero.h1)}</h1>` +
        `<p class="lead">${inline(hero.lead)}</p>` +
        (hero.composer ? renderComposer(hero.composer) : '') +
        (heroActions.length ? `<div class="hero-actions">${heroActions.join('')}</div>` : '') +
        (hero.note ? `<p class="hero-note">${inline(hero.note)}</p>` : '') +
        (metaBits.length ? `<p class="meta-line">${metaBits.join(' &middot; ')}</p>` : '') +
        `</div>`;

    const heroHtml =
        `<div class="hero${trail ? ' has-crumbs' : ''}${hero.demo ? ' has-demo' : ''}${hero.composer ? ' has-composer' : ''}"><div class="wrap">` +
        renderCrumbs(trail) +
        `<div class="hero-inner">` +
        heroCopy +
        (hero.demo ? renderDemo(hero.demo) : '') +
        `</div></div></div>`;

    const hasFaq = (page.sections || []).some((s) => s.type === 'faq');

    const body = (page.sections || []).map(renderSection).join('');
    const graph = buildGraph(page, { url, trail });

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeHtml(page.description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="author" content="Puter">
<meta property="og:type" content="${page.type === 'guide' ? 'article' : 'website'}">
<meta property="og:site_name" content="${escapeHtml(BRAND)}">
<meta property="og:title" content="${escapeHtml(page.title)}">
<meta property="og:description" content="${escapeHtml(page.description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogUrl(page.slug)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${escapeHtml(plain(page.hero.h1))}. ${escapeHtml(BRAND)}.">
<meta property="og:locale" content="en_US">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(page.title)}">
<meta name="twitter:description" content="${escapeHtml(page.description)}">
<meta name="twitter:image" content="${ogUrl(page.slug)}">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#171c24" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicons/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicons/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png">
${preloadFont}
<link rel="preconnect" href="https://plausible.io">
<script>${THEME_SCRIPT}</script>
<style>${fontCss}${css}</style>
<script type="application/ld+json">${jsonLd(graph)}</script>
<script async src="${escapeHtml(PLAUSIBLE_SRC)}"></script>
<script>${PLAUSIBLE_SCRIPT}</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${renderHeader(page)}
<main id="main">
${heroHtml}
${body}
${renderRelated(page, bySlug)}
</main>
${renderFooter()}
${hasFaq ? `<script>${FAQ_SCRIPT}</script>` : ''}
${hero.composer ? `<script>${handoffJs}\n${COMPOSER_SCRIPT}</script>` : ''}
</body>
</html>
`;
}

// Resolve the theme before first paint, using the same source of truth as the
// app (an explicit choice in localStorage, otherwise the OS preference). Without
// this a visitor who chose dark in the builder gets a white flash on every
// marketing page. Kept byte-identical in spirit to the snippet in index.html.
const THEME_SCRIPT =
    `(function(){try{var t=localStorage.getItem('theme');` +
    `if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

// Plausible's queueing stub, kept byte-identical to the one in src/index.html
// so both surfaces initialise the same way. The async script above it is the
// only network request these pages make beyond their own assets.
// Animated FAQ disclosure. <details> cannot be height-transitioned in CSS
// because its content is display:none while closed, so the summary click is
// intercepted and the body's height is driven with the Web Animations API:
// opening sets the attribute first and grows from 0, closing shrinks to 0 and
// only then removes the attribute. Without JS, or under reduced motion, the
// element behaves natively, which is why the markup is a real <details>.
const FAQ_SCRIPT =
    `(function(){var f=document.querySelector('.faq');if(!f)return;` +
    `var r=window.matchMedia('(prefers-reduced-motion: reduce)').matches;` +
    `f.querySelectorAll('details').forEach(function(d){` +
    `var s=d.querySelector('summary'),b=d.querySelector('.faq-body');if(!s||!b)return;` +
    `s.addEventListener('click',function(e){e.preventDefault();` +
    `if(d.classList.contains('is-animating'))return;` +
    `if(r||!b.animate){d.open=!d.open;return;}` +
    `d.classList.add('is-animating');` +
    `if(d.open){d.classList.add('is-closing');var h=b.offsetHeight;` +
    `var a=b.animate([{height:h+'px',opacity:1},{height:'0px',opacity:0}],{duration:220,easing:'ease',fill:'forwards'});` +
    `a.onfinish=function(){d.open=false;a.cancel();d.classList.remove('is-animating','is-closing');};}` +
    `else{d.open=true;var h2=b.offsetHeight;` +
    `var a2=b.animate([{height:'0px',opacity:0},{height:h2+'px',opacity:1}],{duration:260,easing:'ease'});` +
    `a2.onfinish=function(){d.classList.remove('is-animating');};}});});})();`;

// The composer's behaviour, mirroring the app's chat box (src/js/ui.js,
// app.js, dragdrop.js) so a visitor who starts here and continues there
// meets the same rules:
//   * Enter sends only where a physical keyboard is likely (pointer: fine);
//     on a phone Enter inserts a newline and the button sends. The IME guard
//     (isComposing / keyCode 229) keeps Enter from firing mid-conversion for
//     Japanese, Chinese, and Korean input.
//   * Send is disabled until there is text or a file, and a file-only send
//     is allowed.
//   * Files arrive from the attach button, a paste, or a drop onto the box,
//     and are deduplicated by name + size, like the app's tray. Size and
//     count limits are the app's to enforce: it runs every handed-off file
//     through the same intake as a drop and reports what it skipped.
//   * Send signs a signed-out visitor in first, from inside the click, which
//     is the only place a browser lets the sign-in popup open. A dismissed
//     sign-in leaves everything in place, like the app's Send. puter.js is
//     loaded on the first touch of the composer so it is ready by then; if it
//     is not (blocked, slow), the app asks on its own Send instead.
//   * Then the send (text and files) is parked in IndexedDB
//     (window.BuilderHandoff, from src/js/handoff.js inlined just above this
//     script) and the page navigates to /?prompt=…&handoff=<id>. The id is
//     what the app sends on: only a page of ours can have written the record
//     behind it. If parking fails the text still goes, as a plain prefill, so
//     the visitor lands with it staged and can attach again.
//
// The placeholder is typed out letter by letter, held, deleted, and replaced
// with the next example, cycling through data-examples. It pauses while the
// box holds text (the placeholder is invisible then anyway) and holds the
// full first sentence when the visitor prefers reduced motion.
// The same CDN script the app shell loads (src/index.html); test-seo.mjs
// asserts the two agree, or a sign-in here would not be one there.
export const PUTER_JS_SRC = 'https://js.puter.com/v2/';

export const COMPOSER_SCRIPT =
    `(function(){var f=document.querySelector('.hero-composer');if(!f)return;` +
    `var t=f.querySelector('textarea'),send=f.querySelector('.hero-composer-send'),` +
    `attach=f.querySelector('.hero-composer-attach'),pick=f.querySelector('.hero-composer-file-input'),` +
    `tray=f.querySelector('.hero-composer-files'),thumbs=f.querySelector('.hero-composer-thumbs');if(!t||!send)return;` +
    `var fine=!!(window.matchMedia&&window.matchMedia('(pointer: fine)').matches);` +
    `var still=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);` +
    `var files=[],busy=false,puterLoad=null;` +
    // puter.js on demand: a reader who never touches the box never fetches it.
    `function loadPuter(){if(puterLoad||window.puter)return;puterLoad=document.createElement('script');` +
    `puterLoad.src=${JSON.stringify(PUTER_JS_SRC)};puterLoad.async=true;document.head.appendChild(puterLoad);}` +
    `['focusin','pointerenter','touchstart'].forEach(function(ev){f.addEventListener(ev,loadPuter,{once:true,passive:true});});` +
    `function grow(){t.style.height='auto';t.style.height=Math.min(t.scrollHeight,240)+'px';}` +
    `function sync(){var has=!!t.value.trim()||files.length>0;send.disabled=busy||!has;t.required=files.length===0;}` +
    // Tray: a 60px thumbnail per file (the image itself, or the app's file
    // icon), the name along its bottom edge, a remove control in its corner.
    `function url(x){if(x._url)return x._url;try{x._url=URL.createObjectURL(x);}catch(err){x._url='';}return x._url;}` +
    `function drop(x){if(x._url){try{URL.revokeObjectURL(x._url);}catch(err){}x._url='';}}` +
    `function render(){if(!tray||!thumbs)return;thumbs.textContent='';files.forEach(function(x,i){var d=document.createElement('div');` +
    `d.className='hero-composer-thumb';d.title=x.name;var im=document.createElement('img');` +
    `im.src=((x.type||'').indexOf('image/')===0&&url(x))||${JSON.stringify(FILE_ICON_URL)};im.alt=x.name;im.loading='lazy';im.decoding='async';` +
    `var rm=document.createElement('button');rm.type='button';rm.className='hero-composer-file-remove';rm.title='Remove';rm.setAttribute('aria-label','Remove '+x.name);rm.textContent='\u00d7';` +
    `rm.addEventListener('click',function(){drop(x);files.splice(i,1);render();sync();t.focus();});` +
    `var n=document.createElement('div');n.className='hero-composer-file-name';n.textContent=x.name;` +
    `d.appendChild(im);d.appendChild(rm);d.appendChild(n);thumbs.appendChild(d);});` +
    `tray.hidden=files.length===0;}` +
    `function add(list){var seen={};files.forEach(function(x){seen[x.name+'\\n'+x.size]=1;});` +
    `Array.prototype.forEach.call(list||[],function(x){if(!x||!x.name)return;var k=x.name+'\\n'+x.size;if(seen[k])return;seen[k]=1;files.push(x);});render();sync();}` +
    `t.addEventListener('input',function(){grow();sync();});` +
    `t.addEventListener('keydown',function(e){if(e.key!=='Enter'||e.shiftKey||e.isComposing||e.keyCode===229||!fine)return;` +
    `e.preventDefault();if(!send.disabled)f.requestSubmit?f.requestSubmit():f.submit();});` +
    `if(attach&&pick){attach.hidden=false;attach.addEventListener('click',function(){loadPuter();pick.value='';pick.click();});` +
    `pick.addEventListener('change',function(){add(pick.files);pick.value='';});}` +
    `t.addEventListener('paste',function(e){var cd=e.clipboardData;if(!cd||!cd.files||!cd.files.length)return;e.preventDefault();add(cd.files);});` +
    `['dragenter','dragover'].forEach(function(ev){f.addEventListener(ev,function(e){if(!e.dataTransfer)return;e.preventDefault();f.classList.add('is-dragover');});});` +
    `f.addEventListener('dragleave',function(e){if(!f.contains(e.relatedTarget))f.classList.remove('is-dragover');});` +
    `f.addEventListener('drop',function(e){f.classList.remove('is-dragover');if(!e.dataTransfer||!e.dataTransfer.files.length)return;e.preventDefault();add(e.dataTransfer.files);});` +
    // Sign in like the app's Send does: resolve true to carry on, false to stay.
    `function signedIn(){var p=window.puter;if(!p||!p.auth||typeof p.auth.signIn!=='function')return Promise.resolve(true);` +
    `try{if(p.auth.isSignedIn())return Promise.resolve(true);}catch(err){return Promise.resolve(true);}` +
    `return p.auth.signIn().then(function(){return true;},function(err){return !!(err&&err.error==='popup_blocked');});}` +
    // Park the send and go. The URL carries the record's id, which is what lets
    // the app send on arrival (see src/js/handoff.js); with no record to park
    // into, the text alone goes and the app only prefills.
    `function prefill(text){return text?'/?prompt='+encodeURIComponent(text):'/';}` +
    `function go(text){var h=window.BuilderHandoff;if(!h){location.href=prefill(text);return;}` +
    `h.stash({prompt:text,files:files}).then(function(id){location.href=prefill(text)+(text?'&':'?')+'handoff='+encodeURIComponent(id);},` +
    `function(){location.href=prefill(text);});}` +
    `f.addEventListener('submit',function(e){e.preventDefault();if(busy)return;t.value=t.value.trim();var text=t.value;` +
    `if(!text&&!files.length){t.focus();return;}busy=true;f.classList.add('is-busy');sync();` +
    `signedIn().then(function(ok){if(ok){go(text);return;}busy=false;f.classList.remove('is-busy');sync();});});` +
    `sync();` +
    `var ex=[];try{ex=JSON.parse(t.getAttribute('data-examples')||'[]');}catch(err){}` +
    `if(still||ex.length<2)return;` +
    `var i=0,n=0,del=false;` +
    `function tick(){if(t.value){setTimeout(tick,600);return;}` +
    `var s=ex[i],d;if(!del){n++;t.placeholder=s.slice(0,n);` +
    `if(n>=s.length){del=true;d=2200;}else d=34+Math.random()*40;}` +
    `else{n--;t.placeholder=s.slice(0,n);if(n<=0){del=false;i=(i+1)%ex.length;d=500;}else d=18;}` +
    `setTimeout(tick,d);}` +
    `setTimeout(tick,1600);})();`;

const PLAUSIBLE_SCRIPT =
    `window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},` +
    `plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init()`;

function formatDate(iso) {
    const [y, m, d] = String(iso).split('-').map(Number);
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    return `${d} ${months[m - 1]} ${y}`;
}

/**
 * The homepage's structured data, injected into src/index.html at build time.
 *
 * It lives here rather than inline in index.html so the Organization, WebSite
 * and WebApplication nodes are literally the same objects the marketing pages
 * emit, under the same @id values. That is what lets a search engine resolve
 * them to ONE entity across eleven documents instead of eleven near-duplicates,
 * and it means a change to the product description cannot land on nine pages and
 * miss the tenth.
 */
export function renderHomeGraph() {
    const url = `${ORIGIN}/`;
    const website = {
        '@type': 'WebSite',
        '@id': `${ORIGIN}/#website`,
        url,
        name: BRAND,
        description:
            'Build apps and websites by describing them. Free, in your browser, with hosting and a cloud backend included.',
        inLanguage: 'en',
        publisher: { '@id': ORGANIZATION['@id'] },
    };
    const home = {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: 'AI App Builder: Build Apps and Websites With AI',
        description:
            'Describe what you want and Puter builds it: a working app or website, running in your browser, publishable to a real URL. Free, no code required.',
        isPartOf: { '@id': website['@id'] },
        inLanguage: 'en',
        about: { '@id': SOFTWARE_APPLICATION['@id'] },
        primaryImageOfPage: {
            '@type': 'ImageObject',
            url: `${ORIGIN}/og-image.png`,
            width: 1200,
            height: 630,
        },
    };
    return jsonLd({ '@context': 'https://schema.org', '@graph': [ORGANIZATION, website, SOFTWARE_APPLICATION, home] });
}

/* ------------------------------------------------------------------ *
 * Crawl files
 * ------------------------------------------------------------------ */

/**
 * sitemap.xml, generated from the registry so a new page cannot be forgotten.
 * Every <loc> is the trailing-slash form, which is the URL the host serves
 * without a redirect.
 */
export function renderSitemap(pages, { homeUpdated }) {
    const entries = [
        { loc: `${ORIGIN}/`, lastmod: homeUpdated, changefreq: 'weekly', priority: '1.0' },
        ...pages.map((page) => ({
            loc: urlFor(page.slug),
            lastmod: page.updated,
            changefreq: page.changefreq || 'monthly',
            priority: (page.priority ?? 0.5).toFixed(1),
        })),
    ];

    const body = entries.map((entry) =>
        `  <url>\n` +
        `    <loc>${entry.loc}</loc>\n` +
        `    <lastmod>${entry.lastmod}</lastmod>\n` +
        `    <changefreq>${entry.changefreq}</changefreq>\n` +
        `    <priority>${entry.priority}</priority>\n` +
        `  </url>`,
    ).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

/**
 * /llms.txt — the emerging convention for handing a language model a compact,
 * accurate map of a site instead of making it infer one from rendered HTML. It
 * matters here for the same reason a sitemap does: this product is most often
 * discovered through a question ("what can build me an app from a description?")
 * and the answer increasingly comes from a model rather than a results page.
 * Same registry, so it cannot drift from the sitemap.
 */
export function renderLlmsTxt(pages) {
    const lines = [
        `# ${BRAND}`,
        '',
        '> Build working web apps and websites by describing them in plain English. ' +
        'The AI writes the files, runs the result in a live preview, fixes its own runtime errors, ' +
        'and publishes to a public URL. Free to use with a Puter account, runs entirely in the browser, ' +
        'and the output is standard HTML, CSS, and JavaScript you can download and host anywhere.',
        '',
        'Apps built here can use Puter.js for storage, a key-value database, user sign-in, AI models, ' +
        'serverless workers, and peer-to-peer connections without any backend setup. Each person using ' +
        'an app brings their own Puter account for the storage and AI they consume, so the developer\'s ' +
        'costs do not scale with usage.',
        '',
        '## Product',
        '',
        `- [Open the builder](${ORIGIN}/): the app itself. Describe what you want and it gets built.`,
    ];

    for (const page of pages) {
        lines.push(`- [${plain(page.navLabel || page.hero.h1)}](${urlFor(page.slug)}): ${plain(page.description)}`);
    }

    lines.push(
        '',
        '## Platform',
        '',
        `- [Puter](${LINKS.puter}): the cloud operating system this is built on.`,
        `- [Puter.js documentation](${LINKS.docs}): the APIs generated apps use for storage, auth, AI, and workers.`,
        `- [Serverless workers](${LINKS.workers}): backend code deployed from the same conversation, for shared state and public APIs.`,
        `- [User-pays model](${LINKS.userPays}): why an app built here does not bill its author for its users' storage and AI.`,
        `- [Puter on GitHub](${LINKS.puterGithub}): the platform is open source.`,
        '',
    );

    return lines.join('\n');
}
