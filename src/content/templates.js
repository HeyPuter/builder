// Factory for the template pages under /templates/.
//
// Each official template (src/templates/<slug>/template.js) gets a static
// page built from its own metadata: what is in it, what to ask for once it is
// yours, and its own questions. This factory contributes the shared skeleton
// (slug shape, parent, section order, the "Use this template" buttons), the
// same division of labour as the profession pages (verticals.js).
//
// "Use this template" is a plain link to the builder (templateLink) that works
// without JavaScript: the app then asks before copying. With JavaScript the
// page signs the visitor in inside their click and parks a handoff record
// first, so the app copies the template on arrival (TEMPLATE_SCRIPT in
// scripts/build-seo.mjs, consumeTemplateDeepLink in src/js/templates.js).

import { TEMPLATES } from '../templates/index.js';
import { templateLink } from './site.js';

export const TEMPLATES_HUB_SLUG = 'templates';

// Keep in sync with thumbPath/shotPath in scripts/build-templates.mjs, which
// writes these files from each template's screenshot.png.
export const templateThumb = (slug) => `/template-thumbs/${slug}.webp`;
export const templateShot = (slug) => `/template-thumbs/${slug}-large.webp`;

// The hub's cards, one per template, in registry order.
export function templateCards() {
    return TEMPLATES.map((t) => ({
        slug: `${TEMPLATES_HUB_SLUG}/${t.slug}`,
        label: t.name,
        body: t.description,
        category: t.category,
        image: templateThumb(t.slug),
    }));
}

export function templatePage(t) {
    const hasBackend = t.workers.length > 0;
    // A chip whose prompt ends in a colon is a sentence the user finishes in
    // the composer ("...match my brand: "). On a page it reads as cut off.
    const ideas = t.suggestions.filter((s) => !/:\s*$/.test(s.prompt));

    return {
        slug: `${TEMPLATES_HUB_SLUG}/${t.slug}`,
        parent: TEMPLATES_HUB_SLUG,
        updated: t.updated,
        priority: 0.6,
        changefreq: 'monthly',
        navLabel: t.name,

        title: t.page.title,
        description: t.page.description,
        ogTagline: t.page.ogTagline,

        hero: {
            eyebrow: 'Template',
            h1: `${t.name} template`,
            lead: t.page.lead,
            cta: { label: 'Use this template', href: templateLink(t.slug), template: t.slug },
            secondary: { label: 'All templates', href: `/${TEMPLATES_HUB_SLUG}/` },
            note: 'Free with a Puter account. Your copy is yours to change, publish or download.',
            screenshot: {
                src: templateShot(t.slug),
                alt: `The ${t.name} template, as it looks when you copy it`,
                width: 1280,
                height: 800,
                framed: true,
            },
        },

        sections: [
            {
                type: 'grid',
                id: 'included',
                heading: 'What is in the template',
                columns: 2,
                items: t.page.features,
            },
            {
                type: 'steps',
                id: 'how-it-works',
                heading: 'How to use it',
                items: [
                    {
                        title: 'Copy it into your account',
                        body: `Press Use this template and sign in with Puter. A new project with every file of the ${t.name} template appears in your account${hasBackend ? ', with its own backend deployed and running' : ''}.`,
                    },
                    {
                        title: 'Describe what to change',
                        body: 'Tell the builder what you want in plain language: your content, your colors, a new feature. It edits the code and shows the result in a live preview.',
                    },
                    {
                        title: 'Publish when it is ready',
                        body: 'Put it on a public address with one click, or download the files and host them anywhere.',
                    },
                ],
            },
            ...(ideas.length ? [{
                type: 'grid',
                id: 'ideas',
                heading: 'Ideas to try once it is yours',
                intro: 'Your copy opens with these suggestions ready to send. Pick one, or describe a change of your own.',
                items: ideas.map((s) => ({ icon: 'wand', title: s.label, body: s.prompt })),
            }] : []),
            {
                type: 'faq',
                id: 'faq',
                heading: 'Questions',
                items: [
                    ...t.page.faq,
                    {
                        q: 'Is the template free to use?',
                        a: ['Yes. Copying a template and building on it is free with a Puter account, and the copy is yours to keep.'],
                    },
                    {
                        q: 'Will changes to the template affect my copy?',
                        a: ['No. Your copy is independent from the moment it is made. Updates to the template never touch it, and nothing you change reaches anyone else.'],
                    },
                ],
            },
            {
                type: 'cta',
                heading: `Start from the ${t.name}`,
                body: 'Copy it into your account in a few seconds, then make it yours by describing what you want.',
                label: 'Use this template',
                href: templateLink(t.slug),
                template: t.slug,
            },
        ],

        related: [TEMPLATES_HUB_SLUG, 'what-to-build', 'ai-app-builder'],
    };
}

export const TEMPLATE_PAGES = TEMPLATES.map(templatePage);
