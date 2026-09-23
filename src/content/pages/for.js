import { buildLink } from '../site.js';

// The hub for the profession pages under /for/. Its job is honest routing:
// name the reader's work in one card, and hand them to a page written for it.

export default {
    slug: 'for',
    updated: '2026-08-15',
    priority: 0.8,
    changefreq: 'weekly',
    navLabel: "Who it's for",

    title: 'AI App and Website Builder for Small Businesses | Puter',
    description:
        'Trainers, lawyers, accountants, agents, restaurants, and more use plain English to build the client portals, booking pages, and sites their work needs. Free.',
    ogTagline: 'Built for the work you actually do',

    hero: {
        eyebrow: 'Who it\'s for',
        h1: 'Software for your work, described in your words',
        lead:
            'Most professional software is built for an average of everyone, which is why none of it quite fits you. Here you describe the tool your work actually needs, a portal, a booking page, a tracker, a site, and it gets built, checked, and published while you watch.',
        cta: { label: 'Start building free', href: '/' },
        secondary: { label: 'See what people build', href: '/what-to-build/' },
        note: 'Free with a Puter account. No code, no templates to fight, nothing to install.',
        demo: {
            prompt: 'Build a booking page for my studio with my services, prices, and open slots',
            app: {
                name: 'yourstudio.puter.site',
                header: 'Bookings',
                blocks: [
                    {
                        kind: 'stats',
                        items: [
                            { value: '21', label: 'Booked this week' },
                            { value: '5', label: 'New inquiries' },
                            { value: '2', label: 'Slots left Friday' },
                        ],
                    },
                    {
                        kind: 'bars',
                        label: 'Bookings by day',
                        values: [45, 62, 58, 80, 92, 70, 30],
                    },
                ],
            },
        },
    },

    sections: [
        {
            type: 'personas',
            id: 'professions',
            heading: 'Find your work below',
            intro:
                'Each page is written for one profession: what to build, the exact prompts to start from, and answers to the questions your field actually asks.',
            items: [
                {
                    icon: 'dumbbell',
                    label: 'Personal trainers',
                    slug: 'for/personal-trainers',
                    body: 'Client portals, booking pages, workout plans, and progress charts your clients check between sets.',
                },
                {
                    icon: 'scale',
                    label: 'Lawyers',
                    slug: 'for/lawyers',
                    body: 'A firm site, structured intake, deadline dockets, and time tracking for a solo or small practice.',
                },
                {
                    icon: 'calculator',
                    label: 'Accountants',
                    slug: 'for/accountants',
                    body: 'Document collection portals, filing calendars, engagement trackers, and calculators that bring in clients.',
                },
                {
                    icon: 'home',
                    label: 'Real estate agents',
                    slug: 'for/real-estate-agents',
                    body: 'A page per listing, open house sign-in, a lead pipeline you own, and neighborhood guides buyers search for.',
                },
                {
                    icon: 'utensils',
                    label: 'Restaurants',
                    slug: 'for/restaurants',
                    body: 'A menu you update yourself between rushes, specials boards, QR menus, and reservation requests.',
                },
                {
                    icon: 'camera',
                    label: 'Photographers',
                    slug: 'for/photographers',
                    body: 'A portfolio in your style, client proofing galleries, booking inquiries, and wedding mini-sites.',
                },
                {
                    icon: 'book',
                    label: 'Tutors',
                    slug: 'for/tutors',
                    body: 'Practice quiz portals, AI flashcard makers, progress reports for parents, and a site that earns trust.',
                },
                {
                    icon: 'heart',
                    label: 'Therapists',
                    slug: 'for/therapists',
                    body: 'A calm practice website, consultation requests, client resource pages, and workshop sign-ups.',
                },
                {
                    icon: 'wrench',
                    label: 'Contractors',
                    slug: 'for/contractors',
                    body: 'A site that wins local work, quote requests with photos, job galleries, and a crew job board.',
                },
                {
                    icon: 'sprout',
                    label: 'Nonprofits',
                    slug: 'for/nonprofits',
                    body: 'A mission site anyone on staff can update, volunteer shift signups, event RSVPs, and impact reports.',
                },
                {
                    icon: 'scissors',
                    label: 'Salons',
                    slug: 'for/salons',
                    body: 'A price list that stays current, booking requests, stylist pages, and a last-minute openings board.',
                },
                {
                    icon: 'music',
                    label: 'Musicians',
                    slug: 'for/musicians',
                    body: 'A band site with your aesthetic, show calendars, press kits, release pages, and a mailing list you own.',
                },
                {
                    icon: 'calendar',
                    label: 'Event planners',
                    slug: 'for/event-planners',
                    body: 'A website per event, RSVPs with meal choices, vendor trackers, and a shared run-of-show.',
                },
            ],
            after: [
                'Not on the list? The list is where people started, not where the tool stops. Describe your work and the thing it needs in the [builder](/) directly, or browse [31 ideas with prompts](/what-to-build/) for a running start.',
            ],
        },

        {
            type: 'split',
            id: 'why-it-fits',
            heading: 'Why professionals build their own',
            items: [
                {
                    title: 'Because you can finally specify it yourself',
                    art: 'describe',
                    body: [
                        'The hard part of custom software was never the wanting, it was the translating: your needs, through a developer, through a budget, into something almost right.',
                        'Here the translation step is gone. You describe the tool in the language of your work, and a working version appears in a live preview, usually within minutes.',
                    ],
                },
                {
                    title: 'Because the checking is built in',
                    art: 'verify',
                    body: [
                        'After every change, the app is reloaded and watched for errors, and what breaks gets fixed before the change is called finished. Every version is kept, so you can always step back.',
                        'You judge whether the tool fits the work. The builder judges whether the code runs. That division of labor is the whole product.',
                    ],
                },
                {
                    title: 'Because you keep what gets built',
                    art: 'files',
                    body: [
                        'Everything is ordinary web files: readable, downloadable as a zip, hostable anywhere, including under your own domain. Publishing to a free puter.site address is one click, and so is unpublishing.',
                        'Your tools, your client relationships, your data, your files. The word "your" is doing real work in that sentence.',
                    ],
                },
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'Common questions across every profession',
            items: [
                {
                    q: 'Do I need technical skills, or a technical person?',
                    a: [
                        'Neither. Every step, from the first description to publishing, happens in plain English. The professionals these pages are written for are trainers, lawyers, and cafe owners, not developers, and the tool is designed around that fact.',
                    ],
                },
                {
                    q: 'How is this different from hiring someone on a freelance marketplace?',
                    a: [
                        'Speed, iteration, and ownership. A first version exists in minutes instead of weeks, every revision is a sentence instead of a change order, and the result is files you own rather than a handoff you hope was complete. For complex regulated systems you may still want a professional; for the portals, trackers, and sites on these pages, you are the professional.',
                    ],
                },
                {
                    q: 'What does it actually cost?',
                    a: [
                        'Building, publishing, and hosting on a puter.site address are free with a Puter account, no card required. Where your tools store data for signed-in users, each user\'s storage comes with their own free account, so your costs do not grow with your client list.',
                    ],
                },
                {
                    q: 'What happens to my tools if I stop using the builder?',
                    a: [
                        'They are yours to take. Every project downloads as a zip of standard HTML, CSS, and JavaScript that any web host can serve, so the exit is as simple as the entrance. Nothing on these pages is a lock-in dressed as a feature.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Describe the tool your work needs',
            body: 'Pick your profession above for tailored prompts, or just start typing. One sentence is enough.',
            label: 'Open the builder',
            href: buildLink(''),
        },
    ],

    related: ['ai-app-builder', 'ai-website-builder', 'use-cases', 'what-to-build', 'guides/how-to-write-a-build-prompt'],
};
