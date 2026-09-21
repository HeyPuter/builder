// Factory for the profession landing pages under /for/.
//
// Each vertical is a content module (src/content/pages/for-*.js) that describes
// ONE audience: what they would actually build, the prompts that start those
// builds, and the questions they would actually ask. This factory contributes
// only the shared skeleton (slug shape, parent, section order, the closing
// CTA), so structure stays consistent across the set while every sentence on
// every page is written for its reader.
//
// That distinction is deliberate and worth protecting: pages that share a
// template but not their copy are landing pages; pages that share copy with
// the audience name swapped in are doorway spam, and search engines treat
// them accordingly. If a new vertical is ever tempted to reuse another's
// sections verbatim, it should not ship.

import { buildLink } from './site.js';

export const VERTICALS_HUB_SLUG = 'for';

export function verticalPage(v) {
    return {
        slug: `${VERTICALS_HUB_SLUG}/${v.slug}`,
        parent: VERTICALS_HUB_SLUG,
        updated: v.updated || '2026-08-15',
        priority: 0.7,
        changefreq: 'monthly',
        navLabel: v.navLabel,

        title: v.title,
        description: v.description,
        ogTagline: v.ogTagline,

        hero: {
            eyebrow: v.eyebrow,
            h1: v.h1,
            lead: v.lead,
            cta: { label: 'Start building free', href: '/' },
            secondary: { label: 'See how it works', href: '/ai-app-builder/' },
            note: v.note || 'Free with a Puter account. No code, nothing to install, works on your phone.',
            demo: v.demo,
        },

        sections: [
            {
                type: 'grid',
                id: 'what-to-make',
                heading: v.useCasesHeading,
                intro: v.useCasesIntro,
                items: v.useCases,
            },
            {
                type: 'split',
                id: 'how-it-fits',
                heading: v.splitHeading,
                items: v.splits,
            },
            {
                type: 'prompts',
                id: 'starters',
                heading: v.promptsHeading,
                intro:
                    'Each of these opens the builder with the prompt already in the box. ' +
                    'Swap in your own services, names, and prices before you send it.',
                items: v.prompts,
            },
            {
                type: 'faq',
                id: 'faq',
                heading: v.faqHeading,
                items: v.faq,
            },
            {
                type: 'cta',
                heading: v.ctaHeading,
                body: v.ctaBody,
                label: 'Open the builder',
                href: buildLink(''),
            },
        ],

        related: v.related,
    };
}
