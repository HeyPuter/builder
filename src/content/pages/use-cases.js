import { buildLink } from '../site.js';

// The hub for use-case pages: the things people most often open the builder to
// make, one card each. Its job is routing, in the same spirit as /for/: name
// the thing in one card, and hand the reader to a page written for it.
//
// Every card opens a landing page written for that job. To add a use case,
// write its page (see ai-form-builder.js), register it in index.js with
// `parent: 'use-cases'`, and add a card here.

const cases = [
    {
        icon: 'layout',
        label: 'Apps',
        slug: 'ai-app-builder',
        body: 'Trackers, CRMs, portals, and tools with a real backend: sign-in, storage, and a database, with no server to run.',
    },
    {
        icon: 'globe',
        label: 'Websites',
        slug: 'ai-website-builder',
        body: 'A multi-page site in your own style, live on a real URL, that you update by describing the change.',
    },
    {
        icon: 'zap',
        label: 'Landing pages',
        slug: 'ai-landing-page-builder',
        body: 'One page that sells one thing: a headline, the benefits, some proof, and a call to action, published in minutes.',
    },
    {
        icon: 'pen',
        label: 'Forms',
        slug: 'ai-form-builder',
        body: 'Signups, surveys, intake, and RSVPs, with the responses saved where you can see them and no form service in between.',
    },
    {
        icon: 'camera',
        label: 'Portfolios',
        slug: 'ai-portfolio-builder',
        body: 'Your work, shown the way you want it seen, with a contact form and a design that is yours rather than a template.',
    },
    {
        icon: 'sliders',
        label: 'UI',
        slug: 'ai-ui-builder',
        body: 'Web and responsive mobile UI, from desktop dashboards to touch-friendly phone screens. Preview, refine, and publish one interface for every screen size.',
    },
    {
        icon: 'eye',
        label: 'Prototypes',
        slug: 'ai-prototype-generator',
        body: 'A working prototype at a link you can hand to testers, versioned so you can branch ideas, and able to become the product.',
    },
    {
        icon: 'briefcase',
        label: 'Software',
        slug: 'ai-software-builder',
        body: 'Internal tools and business software with sign-in, a database, and storage included, and nothing to host yourself.',
    },
    {
        icon: 'users',
        label: 'SaaS',
        slug: 'ai-saas-builder',
        body: 'Accounts, per-user data, AI features, and hosting from day one, with running costs that do not grow with your users.',
    },
    {
        icon: 'file',
        label: 'Online decks',
        slug: 'ai-deck-builder',
        body: 'An online presentation you share with a link and present in a browser. Refine the slides, republish, and keep the same URL.',
    },
    {
        icon: 'wand',
        label: 'Games',
        slug: 'ai-game-builder',
        body: 'Puzzles, arcade games, and word games, playable in the browser and on a phone, published to a link you can send.',
    },
];

export default {
    slug: 'use-cases',
    updated: '2026-09-23',
    priority: 0.8,
    changefreq: 'weekly',
    navLabel: 'Use cases',

    title: 'AI Builder Use Cases: Apps, Websites, Forms, and More | Puter',
    description:
        'Use cases for Puter AI Builder: apps, websites, landing pages, forms, portfolios, SaaS, decks, games, and more. Describe what you need and get it built, free.',
    ogTagline: 'One builder, eleven jobs',

    hero: {
        eyebrow: 'Use cases',
        h1: 'One builder for whatever you need to make',
        lead:
            'Apps, websites, landing pages, forms, and more, all from a plain-English description. Pick a use case below to see how it works for that job.',
        cta: { label: 'Start building free', href: '/' },
        secondary: { label: 'Browse prompts', href: '/what-to-build/' },
        note: 'Free with a Puter account. No code, no templates to fight, nothing to install.',
        demo: {
            prompt: 'Build a landing page for my app with a signup form and pricing',
            app: {
                name: 'launch.puter.site',
                header: 'Signups',
                blocks: [
                    {
                        kind: 'stats',
                        items: [
                            { value: '312', label: 'Signups' },
                            { value: '4.8%', label: 'Conversion' },
                            { value: '38', label: 'Today' },
                        ],
                    },
                    {
                        kind: 'bars',
                        label: 'Signups by day',
                        values: [20, 35, 48, 42, 70, 88, 64],
                    },
                ],
            },
        },
    },

    sections: [
        {
            type: 'personas',
            id: 'use-cases',
            heading: 'Pick the job',
            intro:
                'Every card is one kind of thing the builder makes well, and opens a page written for that job: what you get, how to build it, prompts to start from, and the questions people ask.',
            more: 'Read more',
            items: cases,
            after: [
                'Not on the list? The list is where people start, not where the tool stops. Describe the thing in the [builder](/) directly, or see the [pages written for specific professions](/for/).',
            ],
        },



        {
            type: 'cta',
            heading: 'Describe the thing you need',
            body: 'Pick a card above for a running start, or just start typing. One sentence is enough.',
            label: 'Open the builder',
            href: buildLink(''),
        },
    ],
};
