import { buildLink } from '../site.js';

export default {
    slug: 'ai-website-builder',
    updated: '2026-08-15',
    priority: 0.9,
    changefreq: 'weekly',
    navLabel: 'AI website builder',

    title: 'AI Website Builder: A Real Site From One Prompt | Puter',
    description:
        'Describe the site you want and Puter builds it, shows it running, and publishes it to a live URL. Real HTML you can download, no templates, no monthly fee.',
    ogTagline: 'Describe the site. Publish the site.',

    hero: {
        eyebrow: 'AI website builder',
        h1: 'An AI website builder that gives you the actual site',
        lead:
            'Describe the pages you need and Puter writes them, shows them running in a live preview, and publishes them to a real URL. What you get is plain HTML and CSS you can read, edit, download, and host anywhere.',
        cta: { label: 'Start building', href: '/' },
        secondary: { label: 'Read the walkthrough', href: '/guides/how-to-build-a-website-with-ai/' },
        note: 'Free with a Puter account. Publishing takes one click and no hosting setup.',
        demo: {
            prompt: 'Build a site for my pottery studio with classes, a gallery, and signups',
            app: {
                name: 'kilnhouse.puter.site',
                header: 'Kiln House Studio',
                blocks: [
                    {
                        kind: 'stats',
                        items: [
                            { value: '6', label: 'Classes this week' },
                            { value: '14', label: 'New signups' },
                            { value: '2', label: 'Spots left Sat' },
                        ],
                    },
                    {
                        kind: 'list',
                        rows: [
                            { title: 'Intro to the wheel', sub: 'Tue 18:00 · 8 seats', tag: '3 left' },
                            { title: 'Glaze workshop', sub: 'Sat 10:00 · 6 seats', tag: 'Full' },
                            { title: 'Open studio', sub: 'Sun 12:00 · members', tag: 'Open' },
                        ],
                    },
                ],
            },
        },
    },

    sections: [
        {
            type: 'grid',
            id: 'what-you-get',
            heading: 'What makes this different from a template',
            intro:
                'Template builders start from someone else\'s layout and ask you to bend it. This starts from your description.',
            items: [
                {
                    icon: 'wand',
                    title: 'No theme to fight',
                    body:
                        'There is no gallery to pick from and no grid system you have to work around. Describe the structure and the mood you want and the layout is written for that, not adapted from a demo about a fictional yoga studio.',
                },
                {
                    icon: 'cursor',
                    title: 'Change anything by pointing at it',
                    body:
                        'Click a heading, a card, or an image in the live preview and say what should be different. You can also nudge spacing, color, and type directly on the selected element and apply the result when it looks right.',
                },
                {
                    icon: 'code',
                    title: 'Standard HTML and CSS',
                    body:
                        'The output is a normal static site: HTML pages, a stylesheet, and Tailwind from a CDN. No proprietary page format, no export that loses half the design, no build step to keep alive.',
                },
                {
                    icon: 'phone',
                    title: 'Responsive from the start',
                    body:
                        'Sites are written mobile-first and you can check them at any width in the preview. Ask for a change on small screens specifically and you get it, rather than a desktop layout that reflows badly.',
                },
                {
                    icon: 'globe',
                    title: 'Publish and unpublish freely',
                    body:
                        'One click puts the site on its own puter.site address. Before that, a private draft link lets you show work in progress to a client or a friend without making anything public.',
                },
                {
                    icon: 'download',
                    title: 'Yours to take',
                    body:
                        'Download the whole site as a zip whenever you like and host it on any static host. Nothing about the site depends on staying here after it is built.',
                },
            ],
        },

        {
            type: 'prose',
            id: 'what-kind',
            heading: 'The kinds of sites this is good at',
            body: [
                'It is strongest wherever the content is known and the design is the work: a portfolio, a personal site, a landing page for a launch, a small business site with hours and a menu and a map, an event page, a documentation site, a link hub, a résumé, a wedding page, a community directory.',
                'It is equally happy building the interactive parts most site builders make you bolt on: a booking form that stores submissions, a searchable catalog, a members-only area behind a sign-in button, a pricing calculator, a gallery that loads images from cloud storage. Those are ordinary requests here, because a site built on Puter can use the same storage, accounts, and AI that an app can.',
                'Where you should be careful is anything with real commercial or legal weight: online stores that take payments, sites holding customer records, anything under a compliance regime. You can absolutely build the front of those here, but read what was built before it handles anyone\'s money or personal data.',
            ],
        },

        {
            type: 'steps',
            id: 'how-to',
            heading: 'How to build a website with AI',
            intro: 'Start rough, then get specific. The first version exists to be reacted to.',
            schema: {
                name: 'How to build a website with AI',
                description:
                    'Build and publish a static website from a plain-English description using the AI website builder at builder.puter.com.',
            },
            items: [
                {
                    title: 'Say what the site is for and who it is for',
                    body:
                        '"A one-page site for my two-person landscaping business in Portland, with services, a gallery, prices, and a contact form" produces a far better first version than "a business website". Purpose and audience do more work than any styling adjective.',
                },
                {
                    title: 'Name the sections you know you need',
                    body:
                        'List the pages or sections you are sure about and let the builder fill the rest. Anything you do not mention gets a sensible default that is easy to delete, which is faster than starting from an empty page.',
                },
                {
                    title: 'Give the look a direction',
                    body:
                        'A couple of words of direction goes a long way: warm and editorial, clean and technical, high-contrast and loud. If you have brand colors or a logo, attach the logo and name the hex codes.',
                },
                {
                    title: 'Refine by pointing',
                    body:
                        'Once the site is up in the preview, stop describing locations and start clicking them. Select the element you mean and say "make this smaller and left-aligned on mobile". Direct visual edits handle the fiddly spacing work without another round trip.',
                },
                {
                    title: 'Publish, then keep editing',
                    body:
                        'Publishing is one click and does not freeze anything. Keep making changes afterwards and push them live whenever you want; version history means a bad edit is one restore away.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'starters',
            heading: 'Try one of these',
            intro: 'Each one opens the builder with the prompt loaded. Swap in your own details first.',
            items: [
                {
                    title: 'Portfolio',
                    body: 'Work samples, an about section, and a contact form that actually stores messages.',
                    prompt:
                        'Build a modern personal portfolio site with a bold hero, an about section, a projects grid where each project opens a detail view with images and a description, and a contact form. Store contact form submissions in my Puter account so I can read them later. Include a dark mode toggle and make it look great on a phone.',
                },
                {
                    title: 'Local business',
                    body: 'Services, prices, hours, and a booking request form.',
                    prompt:
                        'Build a one-page site for a small local business with a hero, a services section with prices, an about section, opening hours, customer testimonials, a booking request form that saves submissions, and a footer with contact details and a map embed. Warm, friendly, and easy to read on a phone.',
                },
                {
                    title: 'Product launch page',
                    body: 'A hero, feature highlights, pricing, FAQ, and an email waitlist.',
                    prompt:
                        'Build a product launch landing page with a strong hero and call to action, three feature highlights with icons, a pricing table with three tiers, an FAQ accordion, and an email waitlist form that stores signups. Clean, high-contrast, and modern.',
                },
                {
                    title: 'Documentation site',
                    body: 'A sidebar, searchable pages, and code samples that copy cleanly.',
                    prompt:
                        'Build a documentation site with a fixed sidebar of sections, a search box that filters pages as I type, syntax-highlighted code blocks with a copy button, anchored headings with a table of contents on each page, and a dark mode toggle.',
                },
                {
                    title: 'Event page',
                    body: 'Schedule, speakers, venue, and RSVP collection.',
                    prompt:
                        'Build an event page with a countdown to the date, a schedule broken into sessions with times and speakers, speaker bios in a grid, venue details with directions, and an RSVP form that saves responses. Make it energetic and colorful.',
                },
                {
                    title: 'Restaurant menu',
                    body: 'Categories, dietary tags, and a menu that is easy to update.',
                    prompt:
                        'Build a restaurant site with a hero photo, a menu organized by course with prices and dietary tags (vegetarian, vegan, gluten-free), opening hours, a location map, and a reservation request form. Let me edit the menu items from an admin view that saves to my Puter account.',
                },
            ],
        },

        {
            type: 'grid',
            id: 'beyond-static',
            columns: 2,
            heading: 'When the site needs to do something',
            intro:
                'The moment a site stops being brochureware, most builders ask you to buy a plan or wire up a third-party service. Here the pieces are already connected.',
            items: [
                {
                    icon: 'mail',
                    title: 'Forms that keep what people send',
                    body:
                        'Contact forms, booking requests, and signups can write straight into your Puter storage, so submissions are yours to read and export instead of being emailed into a void.',
                },
                {
                    icon: 'pen',
                    title: 'Content you can edit later',
                    body:
                        'Ask for a small admin view and you get one: edit menu items, prices, or posts in the browser and have the site read them from storage rather than from hardcoded markup.',
                },
                {
                    icon: 'lock',
                    title: 'Sign-in and members-only pages',
                    body:
                        'Put part of the site behind a sign-in button using Puter accounts. No user database, no session handling, no password resets to implement.',
                },
                {
                    icon: 'sparkles',
                    title: 'AI features on the page',
                    body:
                        'A support chatbot that knows your FAQ, an image generator for a campaign page, a summarizer for long documents: the site can call AI models directly without you holding a provider key.',
                },
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'AI website builder FAQ',
            items: [
                {
                    q: 'How is this different from Wix, Squarespace, or WordPress?',
                    a: [
                        'Those tools are editors: you work inside their canvas, their themes, and their plugin ecosystem, and your site stays there. That is a fair trade for many people, and it comes with a monthly bill and a ceiling.',
                        'Here you describe the site and get standard HTML and CSS files. There is no theme to work around, no plugin marketplace to shop in, and no lock-in, because you can download the whole site and host it anywhere. The trade is that you are describing rather than dragging, which is faster once you get used to it and less familiar at first.',
                    ],
                },
                {
                    q: 'Can I use my own domain?',
                    a: [
                        'Published sites get an address on puter.site. If you need your own domain, download the site as a zip and point your domain at any static host, or put a domain in front of the published site with your DNS provider\'s redirect or proxy tools.',
                    ],
                },
                {
                    q: 'Will the site work on phones?',
                    a: [
                        'Yes. Sites are written responsively by default, and you can resize the preview to check. If something reads badly at a particular width, say so and it gets fixed for that width specifically.',
                    ],
                },
                {
                    q: 'Can I add my own images, logo, and copy?',
                    a: [
                        'Yes. Attach images, a logo, PDFs, or a text file with your copy in the chat and they are saved into the project for the builder to use. You can also paste your text directly into the conversation and ask for it to be placed.',
                    ],
                },
                {
                    q: 'Is the site good for SEO?',
                    a: [
                        'The output is server-rendered static HTML, which is the easiest thing there is for a search engine to read: no client-side routing, no JavaScript required to see the content. Ask for the specifics you want (title and description tags, a sitemap, headings that match your keywords, Open Graph tags for social previews, structured data) and they will be written into the pages.',
                    ],
                },
                {
                    q: 'How many pages can a site have?',
                    a: [
                        'As many as you need. Larger sites are built as separate files with shared styling, and you can ask for new pages one at a time as the site grows rather than planning the whole thing up front.',
                    ],
                },
                {
                    q: 'What if I want a developer to take it over?',
                    a: [
                        'Hand them the zip. It is a static site with no framework, no bundler, and no proprietary format, which makes it one of the easiest things to pick up and continue in an ordinary editor.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Describe your site and watch it get built',
            body: 'A sentence about who it is for and what it should say is enough to see a first version.',
            label: 'Open the builder',
            href: buildLink(''),
        },
    ],

    related: ['ai-app-builder', 'for', 'guides/how-to-build-a-website-with-ai', 'what-to-build'],
};
