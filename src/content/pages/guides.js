export default {
    slug: 'guides',
    updated: '2026-08-15',
    priority: 0.6,
    changefreq: 'monthly',
    navLabel: 'Guides',

    title: 'Guides: Building Apps and Sites With AI | Puter',
    description:
        'Practical guides to building with an AI builder: full walkthroughs from prompt to published app and site, plus how to write a prompt that gets what you meant.',
    ogTagline: 'Practical, specific, no filler',

    hero: {
        eyebrow: 'Guides',
        h1: 'Guides',
        lead:
            'Short, specific writing about building software by describing it. Every guide is written against the builder as it actually behaves, not against a general idea of what AI tools do.',
    },

    sections: [
        {
            type: 'links',
            id: 'all',
            heading: 'All guides',
            items: [
                {
                    icon: 'wand',
                    label: 'How to build an app with AI',
                    slug: 'guides/how-to-build-an-app-with-ai',
                    body:
                        'A full walkthrough with a real example, from the first sentence to a published URL: what to say, what happens while it builds, how to iterate without making things worse, and when to stop.',
                },
                {
                    icon: 'layout',
                    label: 'How to build a website with AI',
                    slug: 'guides/how-to-build-a-website-with-ai',
                    body:
                        'The same walkthrough for sites: describing structure and tone, working with your own copy and images, editing by clicking, and publishing to a live address.',
                },
                {
                    icon: 'pen',
                    label: 'How to write a build prompt',
                    slug: 'guides/how-to-write-a-build-prompt',
                    body:
                        'The difference between a prompt that produces a demo and one that produces something you can use, with before-and-after examples and the six patterns that account for most of the gap.',
                },
                {
                    icon: 'sparkles',
                    label: 'What is vibe coding?',
                    slug: 'vibe-coding',
                    body:
                        'Where the term came from, what the technique is genuinely good at, the four ways it fails, and how to run the loop so it works for you rather than against you.',
                },
            ],
        },
    ],

    related: ['ai-app-builder', 'ai-website-builder', 'what-to-build', 'features'],
};
