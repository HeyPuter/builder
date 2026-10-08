// The templates hub: every official template, with a card linking to its page.
// The cards come from the template registry (src/templates/index.js), so a
// new template is listed here by adding it there.

import { templateCards } from '../templates.js';

export default {
    slug: 'templates',
    updated: '2026-09-28',
    priority: 0.7,
    changefreq: 'weekly',
    navLabel: 'Templates',

    title: 'Free App and Website Templates to Copy and Edit With AI',
    description:
        'Start from a finished app or website instead of a blank page. Copy any template into your Puter account, then change it by describing what you want.',
    ogTagline: 'Start from something that already works',

    hero: {
        eyebrow: 'Templates',
        h1: 'Templates',
        lead:
            'Finished apps and websites you can copy into your own account and keep building on. Each one works the moment it is copied, and every part of it can be changed by describing what you want.',
        cta: { label: 'Browse templates', href: '#all' },
        secondary: { label: 'Start from scratch', href: '/' },
    },

    sections: [
        {
            type: 'templates',
            id: 'all',
            heading: 'All templates',
            items: templateCards(),
        },
        {
            type: 'steps',
            id: 'how-templates-work',
            heading: 'How templates work',
            items: [
                {
                    title: 'Pick one that is close',
                    body: 'It does not have to be exact. A template is a working starting point, not a finished product for your case.',
                },
                {
                    title: 'Copy it into your account',
                    body: 'Every file lands in a new project of your own, with a live preview. Templates with a backend get their own copy of it, deployed for you.',
                },
                {
                    title: 'Make it yours',
                    body: 'Describe the changes you want and watch the preview update. Publish it when it is ready, or download the files.',
                },
            ],
        },
        {
            type: 'faq',
            id: 'faq',
            heading: 'Questions about templates',
            items: [
                {
                    q: 'Why start from a template instead of a prompt?',
                    a: [
                        'A template skips the first build. You begin with something that already runs and looks finished, and spend your time on what makes it yours instead of on the basics every app of that kind needs.',
                    ],
                },
                {
                    q: 'Who makes these templates?',
                    a: [
                        'The Puter team. Each one is reviewed and kept working, so what you copy runs the moment it lands in your account.',
                    ],
                },
                {
                    q: 'Does my copy share anything with other people’s copies?',
                    a: [
                        'No. Your copy has its own files, its own preview and, for templates with a backend, its own backend and data. Nothing you do reaches the template or anyone else.',
                    ],
                },
            ],
        },
        {
            type: 'cta',
            heading: 'Have something else in mind?',
            body: 'Describe it and the builder makes it from scratch, then keeps improving it with you.',
            label: 'Start building',
            href: '/',
        },
    ],

    related: ['what-to-build', 'use-cases', 'ai-app-builder'],
};
