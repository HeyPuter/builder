import fs from 'node:fs';

// ---- Regression guard for the static marketing/SEO pages --------------------
// The pages under src/content/ are the site's entire crawlable surface: the app
// itself renders its body from JavaScript, so anything a search engine, a link
// preview bot, or a language model knows about this product it learned from a
// document rendered by scripts/build-seo.mjs.
//
// That makes a whole class of quiet failures expensive. A canonical pointing at
// a URL that 301s, a title that got long enough to be truncated in results, two
// pages sharing a description, a link to a page that was renamed, a page nothing
// links to: none of these break the build, none show up in a screenshot, and all
// of them cost traffic for as long as nobody notices. Every one is checked here.
//
// Nine coupled pieces have to stay in agreement:
//   1. The content modules (src/content/pages/*.js) and the registry that lists them.
//   2. The renderer (scripts/build-seo.mjs) and the section types it supports.
//   3. site.js: the origin, the URL shape, and the nav/footer link graph.
//   4. sitemap.xml, generated from the registry.
//   5. llms.txt, generated from the same registry.
//   6. src/index.html: the JSON-LD injection marker and the no-JS link list.
//   7. src/js/ui.js: the landing footer row, the only in-app path to these pages.
//   8. src/robots.txt: the sitemap pointer.
//   9. vite.config.js: the plugin, without which none of it ships.

import {
    PAGES,
    renderPage,
    renderSitemap,
    renderLlmsTxt,
    renderHomeGraph,
    escapeHtml,
    inline,
    plain,
    ogKey,
    ogUrl,
    PUTER_JS_SRC,
    FILE_ICON_URL,
} from './build-seo.mjs';
import { ORIGIN, HEADER_NAV, FOOTER_NAV, PLAUSIBLE_SRC, urlFor, pathFor, buildLink } from '../src/content/site.js';

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const indexHtml = read('../src/index.html');
const uiSrc = read('../src/js/ui.js');
const appSrc = read('../src/js/app.js');
const robotsSrc = read('../src/robots.txt');
const viteSrc = read('../vite.config.js');
const cssSrc = read('../src/content/marketing.css');
const handoffSrc = read('../src/js/handoff.js');

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const bySlug = new Map(PAGES.map((p) => [p.slug, p]));
const rendered = new Map();
for (const page of PAGES) {
    rendered.set(page.slug, renderPage(page, {
        css: cssSrc,
        fontCss: "@font-face{font-family:'Roboto';src:url(/fonts/x.woff2) format('woff2');}",
        fontUrl: '/fonts/x.woff2',
        handoffJs: handoffSrc,
        bySlug,
    }));
}

check('every registered page renders', rendered.size === PAGES.length && PAGES.length > 0);

// --- 1. Head tags -----------------------------------------------------------

const titles = new Set();
const descriptions = new Set();
for (const page of PAGES) {
    const html = rendered.get(page.slug);
    const slug = page.slug;

    // Google truncates around 60 characters of pixel width; past ~65 the tail is
    // reliably lost, which is where the differentiating half of a title lives.
    check(`${slug}: title is a usable length (${page.title.length})`,
        page.title.length >= 25 && page.title.length <= 68);
    // Under ~120 wastes the slot; over ~165 gets cut mid-sentence.
    check(`${slug}: description is a usable length (${page.description.length})`,
        page.description.length >= 110 && page.description.length <= 168);
    check(`${slug}: title is unique`, !titles.has(page.title));
    check(`${slug}: description is unique`, !descriptions.has(page.description));
    titles.add(page.title);
    descriptions.add(page.description);

    // The host 301s the slash-less form, so a canonical without the slash makes
    // every indexed URL cost a redirect hop.
    check(`${slug}: canonical is the trailing-slash form`,
        html.includes(`<link rel="canonical" href="${ORIGIN}/${slug}/">`));
    check(`${slug}: is indexable`, /<meta name="robots" content="index, follow/.test(html));
    check(`${slug}: declares a viewport`, html.includes('name="viewport"'));
    check(`${slug}: has exactly one h1`, (html.match(/<h1[^>]*>/g) || []).length === 1);
    check(`${slug}: og:url matches the canonical`,
        html.includes(`<meta property="og:url" content="${ORIGIN}/${slug}/">`));
    check(`${slug}: has a social card with dimensions`,
        html.includes(`<meta property="og:image" content="${ogUrl(slug)}">`) &&
        html.includes('<meta property="og:image:width" content="1200">'));
    check(`${slug}: has a twitter card`,
        html.includes('<meta name="twitter:card" content="summary_large_image">'));
    check(`${slug}: declares a theme-color for both schemes`,
        (html.match(/name="theme-color"/g) || []).length === 2);
    check(`${slug}: has a skip link`, html.includes('class="skip" href="#main"'));
    check(`${slug}: declares the document language`, html.startsWith('<!DOCTYPE html>\n<html lang="en">'));
}

// --- 2. Structured data -----------------------------------------------------

function graphOf(html) {
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    if (!match) return null;
    // The renderer escapes "<" as < precisely so this can never be broken
    // out of; JSON.parse turns it back.
    return JSON.parse(match[1]);
}

for (const page of PAGES) {
    const slug = page.slug;
    let graph = null;
    try { graph = graphOf(rendered.get(slug)); } catch (e) { /* reported below */ }
    check(`${slug}: JSON-LD parses`, graph && Array.isArray(graph['@graph']));
    if (!graph) continue;

    const nodes = graph['@graph'];
    const types = nodes.flatMap((n) => (Array.isArray(n['@type']) ? n['@type'] : [n['@type']]));
    check(`${slug}: graph carries the shared publisher and product entities`,
        types.includes('Organization') && types.includes('WebSite') && types.includes('WebApplication'));

    // Every @id must be a resolvable absolute URL, and none may repeat: two
    // nodes under one @id is how a graph silently loses half its statements.
    const ids = nodes.map((n) => n['@id']);
    check(`${slug}: every node has a unique absolute @id`,
        ids.every((id) => typeof id === 'string' && id.startsWith(ORIGIN)) &&
        new Set(ids).size === ids.length);

    // Internal references must point at a node that is actually present.
    const idSet = new Set(ids);
    const refs = [];
    JSON.stringify(nodes, (key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value) &&
            Object.keys(value).length === 1 && value['@id']) refs.push(value['@id']);
        return value;
    });
    check(`${slug}: every @id reference resolves inside the graph`,
        refs.every((ref) => idSet.has(ref)));

    const hasFaq = (page.sections || []).some((s) => s.type === 'faq');
    check(`${slug}: FAQ markup matches the visible FAQ`, hasFaq === types.includes('FAQPage'));
    if (hasFaq) {
        const faqNode = nodes.find((n) => Array.isArray(n['@type']) && n['@type'].includes('FAQPage'));
        const visible = (page.sections || []).find((s) => s.type === 'faq').items.length;
        check(`${slug}: every visible question is in the markup`,
            faqNode && faqNode.mainEntity && faqNode.mainEntity.length === visible);
    }

    const hasHowTo = (page.sections || []).some((s) => s.type === 'steps' && s.schema);
    check(`${slug}: HowTo markup matches the visible steps`, hasHowTo === types.includes('HowTo'));

    // Guides are Articles and must carry dates; a breadcrumb is required
    // wherever the page is nested, since that is what search results render.
    if (page.type === 'guide') {
        const article = nodes.find((n) => n['@type'] === 'Article' ||
            (Array.isArray(n['@type']) && n['@type'].includes('Article')));
        check(`${slug}: guide is typed as an Article with dates and an author`,
            article && article.datePublished && article.dateModified && article.author);
        check(`${slug}: nested page carries a BreadcrumbList`, types.includes('BreadcrumbList'));
        check(`${slug}: renders visible breadcrumbs`, rendered.get(slug).includes('aria-label="Breadcrumb"'));
    }
}

// --- 3. Internal links ------------------------------------------------------

const knownPaths = new Set([...PAGES.map((p) => pathFor(p.slug)), '/', '#main']);

for (const page of PAGES) {
    const html = rendered.get(page.slug);
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    const internal = hrefs.filter((h) => h.startsWith('/') || h.startsWith('#'));
    const broken = internal.filter((h) => {
        const bare = h.split('?')[0].split('#')[0] || '/';
        // Favicon/font/asset paths are files, not pages.
        if (/^\/(favicons|fonts|assets|og)\//.test(bare)) return false;
        return !knownPaths.has(bare) && !knownPaths.has(h);
    });
    check(`${page.slug}: every internal link resolves (${broken.join(', ') || 'none broken'})`,
        broken.length === 0);
}

// A page nothing links to is a page search engines find only through the
// sitemap, and rank as though nobody cares about it. Check every page is
// reachable from either another page or the app's landing footer.
const inboundFrom = new Set();
for (const page of PAGES) {
    for (const other of PAGES) {
        if (other.slug === page.slug) continue;
        if (rendered.get(other.slug).includes(`href="${pathFor(page.slug)}"`)) inboundFrom.add(page.slug);
    }
    if (uiSrc.includes(`'${pathFor(page.slug)}'`) || indexHtml.includes(`href="${pathFor(page.slug)}"`)) {
        inboundFrom.add(page.slug);
    }
}
check('no page is orphaned', PAGES.every((p) => inboundFrom.has(p.slug)));

// The nav definitions are hand-maintained lists of slugs; a rename must not
// leave a 404 in the header or footer of every page on the site.
check('every header nav slug exists', HEADER_NAV.every((item) => bySlug.has(item.slug)));
check('every internal footer link exists',
    FOOTER_NAV.every((group) => group.links.every((l) => l.href || bySlug.has(l.slug))));
check('every `related` slug exists',
    PAGES.every((p) => (p.related || []).every((slug) => bySlug.has(slug))));
check('every page nests under a real parent',
    PAGES.every((p) => !p.parent || bySlug.has(p.parent)));

// --- 4. Sitemap and llms.txt ------------------------------------------------

const sitemap = renderSitemap(PAGES, { homeUpdated: '2026-08-15' });
check('sitemap is well-formed', sitemap.startsWith('<?xml version="1.0" encoding="UTF-8"?>') &&
    sitemap.trimEnd().endsWith('</urlset>'));
check('sitemap includes the homepage', sitemap.includes(`<loc>${ORIGIN}/</loc>`));
check('sitemap includes every page',
    PAGES.every((p) => sitemap.includes(`<loc>${urlFor(p.slug)}</loc>`)));
check('sitemap has one entry per URL',
    (sitemap.match(/<loc>/g) || []).length === PAGES.length + 1);
check('every sitemap URL is absolute and ends in a slash',
    [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
        .every((m) => m[1].startsWith('https://') && m[1].endsWith('/')));
check('every lastmod is an ISO date',
    [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)]
        .every((m) => /^\d{4}-\d{2}-\d{2}$/.test(m[1])));

const llms = renderLlmsTxt(PAGES);
check('llms.txt opens with a title and a summary blockquote',
    llms.startsWith('# ') && llms.includes('\n> '));
check('llms.txt links the app itself', llms.includes(`(${ORIGIN}/)`));
check('llms.txt lists every page', PAGES.every((p) => llms.includes(urlFor(p.slug))));
check('llms.txt carries no leftover inline markup',
    !/\*\*|`/.test(llms.split('\n').filter((l) => l.startsWith('- ')).join('\n')));

// --- 5. The app shell -------------------------------------------------------

check('index.html carries the JSON-LD injection marker', indexHtml.includes('<!--__HOME_JSON_LD__-->'));
check('index.html no longer inlines its own structured data',
    !indexHtml.includes('application/ld+json'));
check('vite injects the homepage graph', viteSrc.includes('__HOME_JSON_LD__') &&
    viteSrc.includes('renderHomeGraph'));
check('vite registers the seo plugin', /plugins:\s*\[[^\]]*seoPagesPlugin\(\)/.test(viteSrc));
check('vite no longer copies a hand-written sitemap',
    !/for \(const f of \[[^\]]*'sitemap\.xml'/.test(viteSrc));

let homeGraph = null;
try { homeGraph = JSON.parse(renderHomeGraph()); } catch (e) { /* reported below */ }
check('the homepage graph parses', homeGraph && Array.isArray(homeGraph['@graph']));
if (homeGraph) {
    // The whole point of generating it: the shared entities must be identical to
    // the ones the marketing pages emit, or they resolve as separate things.
    const pageGraph = graphOf(rendered.get(PAGES[0].slug));
    const idOf = (graph, type) => (graph['@graph'].find((n) => n['@type'] === type) || {})['@id'];
    check('the homepage shares the marketing pages\' Organization entity',
        idOf(homeGraph, 'Organization') === idOf(pageGraph, 'Organization'));
    check('the homepage shares the marketing pages\' WebApplication entity',
        idOf(homeGraph, 'WebApplication') === idOf(pageGraph, 'WebApplication'));
    check('the homepage canonical is the bare origin',
        homeGraph['@graph'].some((n) => n['@id'] === `${ORIGIN}/#webpage` && n.url === `${ORIGIN}/`));
}

// Both crawl paths into the static pages: the no-JS fallback and the rendered
// landing footer. Losing either silently orphans the pages for that audience.
check('the no-JS fallback links into the static pages',
    PAGES.filter((p) => !p.parent)
        .every((p) => indexHtml.includes(`href="${pathFor(p.slug)}"`) || p.slug === 'features') &&
    indexHtml.includes('href="/ai-app-builder/"') &&
    indexHtml.includes('href="/guides/"'));
check('the landing footer renders a nav of the same links',
    uiSrc.includes('chat-footer-nav') &&
    uiSrc.includes("'/ai-app-builder/'") &&
    uiSrc.includes("'/guides/'"));
// Analytics: every marketing page must load the SAME Plausible script as the
// app shell, or the two surfaces report as different sites and the funnel
// from a landing page into the builder becomes invisible.
const shellPlausible = (indexHtml.match(/<script async src="(https:\/\/plausible\.io\/js\/[^"]+)"/) || [])[1];
check('the app shell loads Plausible', !!shellPlausible);
check('marketing pages use the app shell\'s Plausible script id', shellPlausible === PLAUSIBLE_SRC);
for (const page of PAGES) {
    const html = rendered.get(page.slug);
    check(`${page.slug}: carries the Plausible snippet`,
        html.includes(`<script async src="${PLAUSIBLE_SRC}"></script>`) &&
        html.includes('plausible.init()') &&
        html.includes('<link rel="preconnect" href="https://plausible.io">'));
}

check('robots.txt points at the sitemap',
    robotsSrc.includes(`Sitemap: ${ORIGIN}/sitemap.xml`) && /User-agent:\s*\*/.test(robotsSrc));
check('robots.txt disallows nothing', !/^\s*Disallow:\s*\S/m.test(robotsSrc));

// --- 6. Prompt deep links ---------------------------------------------------

check('buildLink percent-encodes the prompt',
    buildLink('Build a & b?') === '/?prompt=Build%20a%20%26%20b%3F');
check('an empty prompt links to the bare app', buildLink('') === '/');
check('the app reads the prompt deep link', appSrc.includes('applyPromptDeepLink') &&
    /new URLSearchParams\(window\.location\.search\);[\s\S]{0,80}\.get\('prompt'\)/.test(appSrc) &&
    /applyPromptDeepLink\(\);/.test(appSrc));
// A bare ?prompt= (a "Build this" chip) only fills the box. Sending happens
// in consumeComposerHandoff, after auth, and only against a record the hero
// composer parked in same-origin storage under the URL's &handoff=<id> — so
// no link from outside can start a build. See scripts/test-composer-handoff.mjs.
check('the prompt deep link on its own never auto-sends',
    /function applyPromptDeepLink\(\)[\s\S]*?\n}/.exec(appSrc)[0].indexOf('sendChatMessage') === -1);
check('the deep link is stripped from the URL',
    /function applyPromptDeepLink\(\)[\s\S]*?\n}/.exec(appSrc)[0].includes("searchParams.delete('prompt')"));

// Every prompt card must actually carry a prompt, or the button is a lie.
for (const page of PAGES) {
    const cards = (page.sections || []).filter((s) => s.type === 'prompts').flatMap((s) => s.items);
    if (!cards.length) continue;
    check(`${page.slug}: every prompt card has a substantial prompt`,
        cards.every((c) => typeof c.prompt === 'string' && c.prompt.length > 60));
}

// --- 7. Escaping and inline markup -----------------------------------------

check('escapeHtml neutralises tags and quotes',
    escapeHtml('<img src=x onerror="alert(1)">') ===
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
check('inline escapes before applying markup',
    inline('**<script>**') === '<strong>&lt;script&gt;</strong>');
check('inline renders links', inline('[docs](https://docs.puter.com/)')
    === '<a href="https://docs.puter.com/" rel="noopener">docs</a>');
// Content is first-party, so this is a typo guard rather than a defence, but a
// scheme that slipped through would ship to every visitor of the page.
check('inline never emits a link for an unsafe scheme',
    !/<a /.test(inline('[x](javascript:alert(1))')) &&
    !/javascript:/.test(inline('[x](javascript:void(0))')) &&
    !/<a /.test(inline('[x](data:text/html,hi)')));
check('inline leaves internal links unrelled',
    inline('[a](/guides/)') === '<a href="/guides/">a</a>');
check('plain strips markup for structured data',
    plain('**bold** and [a link](/x/) and `code`') === 'bold and a link and code');
check('ogKey flattens nested slugs', ogKey('guides/how-to-build-an-app-with-ai')
    === 'guides-how-to-build-an-app-with-ai');

// --- 8. Content style -------------------------------------------------------

// Em and en dashes are deliberately absent from this site's copy. They are easy
// to reintroduce by paste and impossible to spot in review, so the rule is
// enforced here rather than remembered.
// Covers the rendered document, so the chrome the renderer contributes (header,
// footer, related list, alt text) is held to the same rule as the content
// modules. Inlined CSS and script are excluded: they are machine output, not
// copy, and the build strips their comments anyway.
const copyOf = (html) => html
    .replace(/<style>[\s\S]*?<\/style>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '');
for (const page of PAGES) {
    const copy = copyOf(rendered.get(page.slug));
    check(`${page.slug}: copy uses no em or en dashes`,
        !/[—–]/.test(copy) && !/&[mn]dash;/.test(copy));
}
check('llms.txt uses no em or en dashes', !/[—–]/.test(renderLlmsTxt(PAGES)));

// github.com/HeyPuter/build is a PRIVATE repository: linking it ships a 404 to
// every visitor, and calling the builder open source is simply untrue. Puter
// itself is open source and is the correct thing to point at.
const allRendered = [...rendered.values()].join('\n') + renderLlmsTxt(PAGES);
check('nothing links to the private builder repository',
    !allRendered.includes('github.com/HeyPuter/build'));
check('nothing calls the builder itself open source',
    !/\bthe builder is open source\b/i.test(allRendered) &&
    !/builder'?s own source/i.test(allRendered));

// Docs paths are case-sensitive on this host; the lowercase forms 404.
check('docs links use the case-sensitive paths',
    !/docs\.puter\.com\/workers\//.test(allRendered) &&
    !/docs\.puter\.com\/peer\//.test(allRendered));

// A description that merely restates the title wastes the only piece of copy the
// author fully controls in a search result.
for (const page of PAGES) {
    check(`${page.slug}: description is not a copy of the title`,
        page.description.toLowerCase() !== page.title.toLowerCase());
    check(`${page.slug}: declares an ISO updated date`, /^\d{4}-\d{2}-\d{2}$/.test(page.updated));
}

// --- 9. Vertical pages ------------------------------------------------------
// The profession pages under /for/ share a factory but must never share copy:
// pages that differ only by the audience name are doorway spam, and search
// engines penalise the whole site for them, not just the offending pages.

const hub = bySlug.get('for');
const verticals = PAGES.filter((p) => p.parent === 'for');
check('the vertical hub exists and carries the persona cards',
    hub && (hub.sections || []).some((s) => s.type === 'personas'));
check('there are at least six vertical pages', verticals.length >= 6);

if (hub) {
    const hubHtml = rendered.get('for');
    check('the hub links every vertical page',
        verticals.every((v) => hubHtml.includes(`href="${pathFor(v.slug)}"`)));
    const personaSlugs = (hub.sections.find((s) => s.type === 'personas') || { items: [] })
        .items.map((i) => i.slug);
    check('every persona card points at a registered vertical',
        personaSlugs.every((slug) => bySlug.has(slug)) &&
        verticals.every((v) => personaSlugs.includes(v.slug)));
}

for (const v of verticals) {
    check(`${v.slug}: eyebrow names the audience`, /^For /.test(v.hero.eyebrow));
    check(`${v.slug}: carries a hero demo`, !!v.hero.demo &&
        rendered.get(v.slug).includes('class="demo"'));
    const types = (v.sections || []).map((s) => s.type);
    check(`${v.slug}: has prompts, split art, and its own FAQ`,
        types.includes('prompts') && types.includes('split') && types.includes('faq'));
    check(`${v.slug}: links back to the hub`, (v.related || []).includes('for'));
}

// Copy uniqueness across the whole vertical set: no prompt, FAQ question, or
// section heading may be reused verbatim on another vertical.
const seenCopy = new Map();
let duplicated = null;
for (const v of verticals) {
    const bits = [];
    for (const s of v.sections || []) {
        if (s.heading) bits.push(s.heading);
        if (s.type === 'prompts') bits.push(...s.items.map((i) => i.prompt));
        if (s.type === 'faq') bits.push(...s.items.map((i) => i.q));
        if (s.type === 'grid') bits.push(...s.items.map((i) => i.body));
    }
    for (const bit of bits) {
        if (seenCopy.has(bit)) duplicated = `"${bit.slice(0, 60)}" on ${v.slug} and ${seenCopy.get(bit)}`;
        seenCopy.set(bit, v.slug);
    }
}
check(`no copy is shared between verticals (${duplicated || 'none'})`, !duplicated);

// The hero composer is the app's chat box on a marketing page: type, attach,
// send, and the build starts (the flow itself is exercised by
// scripts/test-composer-handoff.mjs). Without JavaScript it is still a real
// form that lands the visitor in the builder with their prompt in the chat
// box: a GET to the app root with a `prompt` field is exactly the deep link
// applyPromptDeepLink() reads.
const shellSendSvg = (indexHtml.match(/window\.send_svg = '([^']+)';/) || [])[1];
const shellAttachSvg = (indexHtml.match(/window\.attachment_svg = `([^`]+)`/) || [])[1];
const appFileIcon = (appSrc.match(/let NON_RENDERED_FILE_URL = "([^"]+)";/) || [])[1];
const shellPuter = (indexHtml.match(/<script src="(https:\/\/js\.puter\.com\/[^"]+)"><\/script>/) || [])[1];
check('the app shell loads puter.js from its CDN', !!shellPuter);
check('the composer signs in through the same puter.js the app loads', shellPuter === PUTER_JS_SRC);
for (const slug of ['ai-app-builder', 'ai-website-builder']) {
    const page = bySlug.get(slug);
    const html = rendered.get(slug);
    const c = page.hero.composer;
    check(`${slug}: hero carries a composer, not a demo`, !!c && !page.hero.demo);
    check(`${slug}: composer spec is complete`,
        Array.isArray(c.examples) && c.examples.length >= 3 &&
        c.examples.every((e) => typeof e === 'string' && e.length > 20 && e.length <= 60 && /[.!?]$/.test(e)));
    check(`${slug}: composer posts the prompt to the app root`,
        /<form class="hero-composer" action="\/" method="get">/.test(html) &&
        /<textarea class="hero-composer-message" id="hero-prompt" name="prompt"[^>]*required/.test(html) &&
        html.includes('class="hero-composer-send" type="submit"'));
    // The box is the app's own: same structure, same icons, same file
    // placeholder, so the visitor's first sight of the builder is the builder.
    check(`${slug}: composer is laid out like the app's (tray above, box, actions row)`,
        html.indexOf('<div class="hero-composer-files"') < html.indexOf('<div class="hero-composer-box">') &&
        html.indexOf('<div class="hero-composer-box">') < html.indexOf('<div class="hero-composer-actions">') &&
        html.indexOf('class="hero-composer-attach"') < html.indexOf('class="hero-composer-send"'));
    check(`${slug}: send button carries the app's send icon`,
        !!shellSendSvg && html.includes(`aria-label="${escapeHtml(c.submit || 'Start building')}">${shellSendSvg}</button>`));
    check(`${slug}: attach button carries the app's attachment icon`,
        !!shellAttachSvg && html.includes(`hidden>${shellAttachSvg}</button>`));
    check(`${slug}: a non-image attachment shows the app's file icon`,
        !!appFileIcon && appFileIcon === FILE_ICON_URL && html.includes(JSON.stringify(FILE_ICON_URL)));
    // The attach button and the file input exist for the script alone: born
    // hidden so the no-JS form shows nothing it cannot do, and the input has no
    // name so a no-JS GET cannot leak filenames into the URL.
    check(`${slug}: attach button is born hidden`,
        /<button class="hero-composer-attach" type="button"[^>]*\bhidden>/.test(html));
    check(`${slug}: file input is hidden and unnamed`,
        /<input class="hero-composer-file-input" type="file" multiple[^>]*\bhidden>/.test(html) &&
        !/<input class="hero-composer-file-input"[^>]*\bname=/.test(html));
    check(`${slug}: attachment tray is present and empty`,
        html.includes('<div class="hero-composer-files" aria-label="Attached files" hidden><div class="hero-composer-thumbs"></div></div>'));
    check(`${slug}: first example is the static placeholder and all ride along for the typewriter`,
        html.includes(`placeholder="${escapeHtml(c.examples[0])}"`) &&
        html.includes(`data-examples="${escapeHtml(JSON.stringify(c.examples))}"`));
    check(`${slug}: hero is the centred single-column variant`,
        html.includes('class="hero has-composer"') && !html.includes('class="demo"'));
    check(`${slug}: composer script is inlined`, html.includes("querySelector('.hero-composer')"));
    check(`${slug}: handoff helper is inlined ahead of the composer script`,
        html.includes('window.BuilderHandoff = {') &&
        html.indexOf('window.BuilderHandoff = {') < html.indexOf("querySelector('.hero-composer')"));
    check(`${slug}: composer parks the send and hands its id to the app`,
        html.includes('h.stash({prompt:text,files:files})') && html.includes("'handoff='+encodeURIComponent(id)"));
    check(`${slug}: composer loads puter.js on demand and signs in before handing off`,
        html.includes(JSON.stringify(PUTER_JS_SRC)) &&
        html.indexOf('p.auth.signIn()') < html.indexOf('h.stash({prompt:text,files:files})'));
}
for (const page of PAGES) {
    if (['ai-app-builder', 'ai-website-builder'].includes(page.slug)) continue;
    const html = rendered.get(page.slug);
    check(`${page.slug}: no composer script or handoff helper without a composer`,
        !!page.hero.composer ||
        (!html.includes("querySelector('.hero-composer')") && !html.includes('BuilderHandoff') && !html.includes('js.puter.com')));
}
// marketing.css copies the app's composer rules value for value. Spot-check
// the ones that define the look, against the app's stylesheet, so a change to
// the app's box (a new radius, a new send plate) shows up here as a failure.
const stylesSrc = read('../src/css/styles.css');
const appRule = (sel) => (stylesSrc.match(new RegExp(`\n${sel.replace(/[.\-]/g, '\\$&')}\\s*\\{([^}]*)\\}`)) || [])[1] || '';
const composerCss = cssSrc.slice(cssSrc.indexOf('.hero-composer {'), cssSrc.indexOf('.eyebrow {'));
const decl = (block, prop) => ((block.match(new RegExp(`(?:^|[\\s;{])${prop}:\\s*([^;]+);`)) || [])[1] || '').trim();
// A colour lives in a composer-local token (the third column) so dark mode
// can swap it; the app's value must then end with the token's light value.
for (const [appSel, prop, token] of [
    ['.chat-input', 'border-radius'],
    ['.chat-input', 'border', '--c-box-border'],
    ['.chat-input-message', 'font-size'],
    ['.chat-input-message', 'min-height'],
    ['.chat-input-message', 'max-height'],
    ['.chat-input-message', 'padding-left'],
    ['.chat-input-message-actions', 'height'],
    ['.send', 'width'],
    ['.send', 'border-radius'],
    ['.send', 'background-color', '--c-send-bg'],
    ['.send', 'margin-right'],
    ['.attachment-button', 'margin-left'],
    ['.attachment-button', 'color', '--c-attach'],
    ['.attachment-preview', 'border-radius'],
    ['.attachment-preview', 'background', '--c-tray-bg'],
    ['.attachment-thumbnail', 'width'],
    ['.attachment-info', 'font-size'],
]) {
    const want = decl(appRule(appSel), prop);
    const ok = token
        ? !!want && want.endsWith(decl(composerCss, token))
        : !!want && composerCss.includes(`${prop}: ${want};`) || (prop === 'padding-left' && composerCss.includes(`padding: ${want};`));
    check(`composer copies the app's ${appSel} ${prop} (${want})`, ok);
}
check('a composer page cannot render without the handoff helper', (() => {
    try {
        renderPage(bySlug.get('ai-app-builder'), { css: '', fontCss: '', fontUrl: '', bySlug });
        return false;
    } catch (e) { return /handoff/.test(String(e && e.message)); }
})());

// The hero demos are tiny declarative mock apps; a malformed spec should fail
// here, not at deploy time. Every demo needs the parts the animation assumes.
for (const page of PAGES) {
    const demo = page.hero && page.hero.demo;
    if (!demo) continue;
    check(`${page.slug}: demo spec is complete`,
        typeof demo.prompt === 'string' && demo.prompt.length > 20 &&
        demo.app && typeof demo.app.name === 'string' && demo.app.name.endsWith('.puter.site') &&
        typeof demo.app.header === 'string' &&
        Array.isArray(demo.app.blocks) && demo.app.blocks.length >= 1);
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall SEO checks passed');
process.exit(failures ? 1 : 0);
