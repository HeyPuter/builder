import { buildLink, LINKS } from '../site.js';

export default {
    slug: 'ai-prototype-generator',
    parent: 'use-cases',
    updated: '2026-09-23',
    priority: 0.9,
    changefreq: 'weekly',
    navLabel: 'AI prototype generator',

    title: 'AI Prototype Generator - Working prototypes in minutes, free',
    description:
        'Generate an interactive prototype from a plain-English description. A real working web app, not a mockup: share a link for user testing, edit by pointing, free.',
    ogTagline: 'Prototypes that actually run',

    hero: {
        eyebrow: 'AI prototype generator',
        h1: 'AI prototype generator that gives you a working prototype',
        lead:
            'Describe the product and Puter AI Builder generates an interactive prototype you can click through, type into, and share at a link. It is real code with a real backend, so the prototype that wins testing can become the product without a rebuild.',
        cta: { label: 'Start building', href: '/' },
        secondary: { label: 'How to write a build prompt', href: '/guides/how-to-write-a-build-prompt/' },
        note: 'Free with a [Puter](' + LINKS.puter + ') account. Runs in any modern browser, including on a phone.',
        demo: {
            prompt: 'Prototype a meal planning app with a weekly grid, a recipe library, and a grocery list',
            app: {
                name: 'mealgrid.puter.site',
                header: 'This week',
                blocks: [
                    {
                        kind: 'stats',
                        items: [
                            { value: '18', label: 'Meals planned' },
                            { value: '3', label: 'Slots open' },
                            { value: '24', label: 'Grocery items' },
                        ],
                    },
                    {
                        kind: 'list',
                        rows: [
                            { title: 'Lemon garlic pasta', sub: 'Tue dinner · 25 min', tag: 'Planned' },
                            { title: 'Shakshuka', sub: 'Sat brunch · 30 min', tag: 'New' },
                            { title: 'Thai green curry', sub: 'Sun dinner · 40 min', tag: 'Leftovers' },
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
            heading: 'What you get',
            intro:
                'Everything you need to go from an idea to a prototype people can actually try.',
            items: [
                {
                    icon: 'eye',
                    title: 'A prototype you can actually use',
                    body:
                        'The preview is the real app, not a rendering. Click through the screens, fill in the forms, and use it exactly as a tester would, on a phone or a desktop.',
                },
                {
                    icon: 'link',
                    title: 'A link for user testing',
                    body:
                        'Share a private draft link before anything is public, or publish to a free puter.site address. Testers open it on any device with no install and no account on your side to set up.',
                },
                {
                    icon: 'cursor',
                    title: 'Point at what should change',
                    body:
                        'Click any element in the live preview and say what to do with it. Move a button, reword a step, swap a layout, without describing where it is.',
                },
                {
                    icon: 'history',
                    title: 'Branch ideas, keep every version',
                    body:
                        'Every change is saved as a version you can restore in a click. Duplicate the project to try a second direction while the first stays intact, each with its own preview and its own link.',
                },
                {
                    icon: 'database',
                    title: 'Real data and real sign-in',
                    body:
                        'Accounts, a database, file storage, and AI models are built in with nothing to set up. Your prototype can save what testers enter instead of faking it with placeholder text.',
                },
                {
                    icon: 'download',
                    title: 'Graduates without a rebuild',
                    body:
                        'The prototype is standard HTML, CSS, and JavaScript that you own. Keep building on it until it is the product, publish it, or export the whole thing as a zip and take it anywhere.',
                },
            ],
        },

        {
            type: 'split',
            id: 'real-prototype',
            heading: 'A prototype that survives contact with users',
            intro:
                'A clickable mockup shows what a product would look like. A working prototype shows whether it works. These three things are what make the difference.',
            items: [
                {
                    title: 'Testers never land on a broken screen',
                    art: 'verify',
                    body: [
                        'After every change Puter AI Builder runs the prototype and watches for errors. If a screen breaks, it reads the file, fixes the cause, and checks again before handing it back.',
                        'You spend a testing session watching people use the product, not apologizing for a button that does nothing.',
                    ],
                },
                {
                    title: 'Try a second direction without losing the first',
                    art: 'history',
                    body: [
                        'Every change is saved as a version. If a round of feedback sends you somewhere worse, go back to the version that tested well and take a different run at it.',
                        'When two ideas are worth comparing, duplicate the project and build the other one alongside it. Each copy gets its own preview, history, and link, so you can put both in front of users.',
                    ],
                },
                {
                    title: 'The prototype is already the foundation',
                    art: 'backend',
                    body: [
                        'Because every prototype runs on [Puter](' + LINKS.puter + '), sign-in, a database, storage, and AI models are there from the first version. A signup flow can really create an account; a dashboard can really save data.',
                        'That means the prototype that wins does not get thrown away and rebuilt. Keep iterating in the same project until it is the product, and the people who use it cover their own storage and AI through their own Puter account, so it costs you nothing to run. [How it works](' + LINKS.userPays + ').',
                    ],
                },
            ],
        },

        {
            type: 'steps',
            id: 'how-to',
            heading: 'How to generate a prototype with AI',
            intro: 'Four steps from an idea to a prototype people can try.',
            schema: {
                name: 'How to generate a prototype with AI',
                description:
                    'Generate an interactive, working prototype from a plain-English description using the AI prototype generator at builder.puter.com.',
            },
            items: [
                {
                    title: 'Describe the product',
                    body:
                        'A sentence or two is enough: what it is, who it is for, and the flow you want to test. Attach screenshots, sketches, or a logo as reference if you have them. The more specific you are, the closer the first version will be.',
                },
                {
                    title: 'Watch it build',
                    body:
                        'Puter AI Builder writes the screens and the logic, runs the prototype, and checks that it works. A first version is usually ready in a couple of minutes, running in a live preview you can use right away.',
                },
                {
                    title: 'Refine it by talking, or by pointing',
                    body:
                        'Ask for the next change in plain language, or click any element in the preview and say what should be different. Every version is saved, so you can branch an idea and always get back.',
                },
                {
                    title: 'Share it and test it',
                    body:
                        'Send a private draft link, or press Publish for a public one. Watch people use it, bring the feedback back into the chat, and keep going in the same project until the prototype is the product.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'starters',
            heading: 'Not sure where to start? Try one of these',
            intro:
                'Pick one and Puter AI Builder generates it for you. Then make it yours by describing what to change.',
            items: [
                {
                    title: 'Onboarding flow',
                    body: 'A signup and first-run flow you can put in front of testers this afternoon.',
                    prompt:
                        'Prototype the onboarding flow for a budgeting app: a welcome screen, sign-in with a Puter account, a three-step setup that asks for monthly income, top spending categories, and a savings goal, and a first dashboard that reflects those answers. Save the answers to the user\'s Puter account so returning testers skip setup.',
                },
                {
                    title: 'SaaS dashboard',
                    body: 'The main screen of a product, with real interactions instead of a static picture.',
                    prompt:
                        'Prototype the main dashboard for a customer support tool with a sidebar, a ticket list I can filter by status and priority, a ticket detail panel with a reply box, and a small stats strip at the top. Seed it with twenty realistic sample tickets and let me add and edit tickets, saving them to my Puter account.',
                },
                {
                    title: 'Mobile booking app',
                    body: 'A phone-sized flow from browsing to a confirmed booking.',
                    prompt:
                        'Prototype a mobile app for booking a dog groomer: a list of groomers with photos and ratings, a groomer profile with services and prices, a date and time picker, and a confirmation screen. Make it phone-first with a bottom tab bar, and save bookings to the user\'s Puter account so they show up under a My bookings tab.',
                },
                {
                    title: 'Marketplace listing',
                    body: 'Search, filters, and a listing page for a two-sided marketplace idea.',
                    prompt:
                        'Prototype a marketplace for renting camera gear: a search page with filters for category, price per day, and location, a results grid with sample listings, a listing detail page with a photo gallery and availability calendar, and a request-to-rent form. Let signed-in users post their own listings, saved to their Puter account.',
                },
                {
                    title: 'AI feature concept',
                    body: 'Test whether an AI-powered feature is actually useful before building the whole product.',
                    prompt:
                        'Prototype a feature where a user pastes a long meeting transcript and gets a summary, a list of decisions, and action items with owners, generated by AI. Show the results in three tabs, let the user edit and check off action items, and save each processed meeting to their Puter account for a history view.',
                },
                {
                    title: 'Internal tool',
                    body: 'A quick working version of the tool your team keeps asking for, to check the workflow before committing.',
                    prompt:
                        'Prototype an internal tool for approving expense reports: a submit form with line items and receipt uploads, a queue for approvers with approve and reject buttons and a comment field, and a status page for submitters. Store receipts and reports in the Puter account and use a Puter serverless worker so approvers and submitters see the same queue.',
                },
            ],
        },

        {
            type: 'grid',
            id: 'prototype-vs-mockup',
            columns: 2,
            heading: 'Working prototype or clickable mockup?',
            intro:
                'Most AI prototype generators produce design files: screens linked with hotspots, meant to be viewed and then handed to engineering. Puter AI Builder produces something different, and it is worth knowing which one you need.',
            items: [
                {
                    icon: 'zap',
                    title: 'What a working prototype is good for',
                    body:
                        'Usability testing where people type real things and expect real results. Validating a flow end to end, including sign-in and saved data. Showing investors or stakeholders something they can use rather than watch. And building the actual product afterwards, because nothing gets thrown away: the prototype is real web files with a backend already attached.',
                },
                {
                    icon: 'pen',
                    title: 'What it is not',
                    body:
                        'It does not produce Figma files, design layers, or a canvas of artboards, and there is no export to design tools. You can attach screenshots, sketches, and images as reference and ask for the prototype to follow them, but the output is always a running app. If your goal is a pixel-perfect spec for a design review, a design tool is the better fit; if your goal is to find out whether the product works, this is.',
                },
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'AI prototype generator FAQ',
            items: [
                {
                    q: 'What is an AI prototype generator?',
                    a: [
                        'An AI prototype generator turns a plain-language description of a product into a prototype you can interact with. You describe the screens and the flow, and the AI produces them in minutes instead of the days it takes to wireframe, design, and wire up a prototype by hand.',
                        'Most tools in this category generate design mockups: static screens linked together so a click on one takes you to the next. Puter AI Builder generates a working web app instead. The screens are real, the buttons run real logic, the forms save real data, and the whole thing runs at a link anyone can open. You refine it by asking for changes or clicking the part you want changed.',
                    ],
                },
                {
                    q: 'Do I need design or coding experience?',
                    a: [
                        'No. Every step works in plain English, from the first description to sharing the link. The AI designs the screens, picks sensible defaults for anything you did not specify, and writes the code. You refine it the same way, by asking for changes or clicking the element you want changed.',
                        'If you do know how to code, the output is ordinary HTML, CSS, and JavaScript that you can read and edit, so nothing is hidden from you either.',
                    ],
                },
                {
                    q: 'What kinds of prototypes can I generate?',
                    a: [
                        'Anything that runs in a browser: onboarding and signup flows, dashboards, mobile-first apps, marketplaces, booking flows, internal tools, landing pages, and AI-powered features. Multi-screen flows with navigation are the normal case, not the exception.',
                        'Because a backend is included, prototypes can go further than a mockup: sign-in that creates a real account, forms that save, per-user data, file uploads, AI chat or image generation, and shared state through a serverless worker for multi-user scenarios.',
                    ],
                },
                {
                    q: 'How long does it take to generate a prototype?',
                    a: [
                        'A first working version usually lands in a couple of minutes. Getting it exactly right for a test is a handful of changes on top of that. Every version is saved, so you can stop, share what you have, and pick it up after feedback comes in.',
                    ],
                },
                {
                    q: 'Is the AI prototype generator free?',
                    a: [
                        'Yes. Generating, editing, and publishing prototypes are free with a [Puter](' + LINKS.puter + ') account, and no card is required. Nothing is public until you decide to share it.',
                        'Very heavy use can hit the free tier\'s limits, at which point you can upgrade your Puter account. Ordinary prototyping, sharing, and iterating do not.',
                    ],
                },
                {
                    q: 'Can I customize the prototype after it is generated?',
                    a: [
                        'Yes, all of it. Ask for changes in plain language, or click any element in the live preview and say what should be different. For styling, adjust spacing, colors, and type directly on the element, and those tweaks stay put through later changes. There is no template underneath limiting what can change.',
                    ],
                },
                {
                    q: 'Can I test the prototype with real data?',
                    a: [
                        'Yes. Every prototype comes with a database, file storage, and user accounts built in, so a form can really save and a dashboard can really read what was saved. Ask for realistic sample data to be seeded so the first screen testers see is not empty.',
                        'Each tester\'s data is stored under their own [Puter](' + LINKS.puter + ') account, and shared data, like a queue everyone sees, runs in a serverless worker when you ask for it.',
                    ],
                },
                {
                    q: 'How do I share the prototype with users, clients, or my team?',
                    a: [
                        'Two ways. Share a private draft link to the work-in-progress preview, so a client or a tester can look at it without anything being public. Or press Publish and get a public puter.site link that anyone can open on any device, with no install.',
                        'Both keep working as you iterate: publish again and everyone with the link sees the new version. On a phone the prototype can be added to the home screen and opened like an installed app.',
                    ],
                },
                {
                    q: 'Can I start from a sketch, a screenshot, or an existing design?',
                    a: [
                        'Yes, as reference. Attach screenshots, sketches, images, a logo, PDFs, or text files in the chat, or share a link to an existing site, and describe what to keep and what to change. Puter AI Builder uses them to shape the prototype.',
                        'There is no direct import of Figma or Sketch files, and no automatic sketch-to-design conversion. Attaching an image and saying "make it look like this" is the workflow.',
                    ],
                },
                {
                    q: 'Can I export the prototype to Figma?',
                    a: [
                        'No. Puter AI Builder generates a working app, not design files, so there is no Figma export and no design layers to hand over. What you can export is the project itself: a zip of standard HTML, CSS, and JavaScript that runs anywhere.',
                        'If your team needs a design spec, the usual approach is to point the designer at the running prototype and let them work from that, rather than trying to move it back into a design tool.',
                    ],
                },
                {
                    q: 'What happens when the AI gets something wrong?',
                    a: [
                        'Most runtime errors are caught before you see them: Puter AI Builder reloads the preview after each change, watches for errors, and sends them back to the AI to fix and re-verify.',
                        'For everything else, tell it what is wrong in one sentence, or click the offending element in the preview and describe the fix. If a change made the prototype worse overall, version history lets you restore an earlier snapshot and take a different run at it.',
                    ],
                },
                {
                    q: 'What happens when the prototype needs to become the real product?',
                    a: [
                        'Keep going in the same project. Because the prototype is real code running on a real backend, there is no rebuild step: add the features you skipped, tighten the design, and publish. Apps built this way run with accounts, storage, and hosting included.',
                        'Two honest limits. Puter AI Builder does not process payments itself, so the usual approach is to link out to a payment provider you already use. And for anything handling money, health information, or other people\'s personal data, read what was built before you rely on it, and treat the AI as a fast first draft rather than a security review.',
                    ],
                },
                {
                    q: 'Can I generate a mobile app prototype?',
                    a: [
                        'Yes. Ask for a phone-first layout and resize the preview to check it at any width. The published prototype works on any phone from the link, and it can be added to the home screen with its own icon so it opens like an installed app.',
                        'It is a web app, not a native one. Puter AI Builder does not produce iOS or Android binaries or App Store listings, which for a prototype is usually the point: testers open a link, and updates reach everyone instantly.',
                    ],
                },
                {
                    q: 'Do I own the prototype, and can I export it?',
                    a: [
                        'Yes. The code, the design, and everything you publish are yours. Export the whole project as a zip at any time; it is standard HTML, CSS, and JavaScript with no build step, so it runs on any static host or straight off your disk. Keep it on [Puter](' + LINKS.puter + ') or take it somewhere else, with no license to renew and no export wall.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Generate a prototype people can actually try',
            body: 'Describe it, share the link, and keep the one that works. Free to start, backend and hosting included.',
            label: 'Start building',
            href: buildLink(''),
        },
    ],

    related: ['use-cases', 'ai-app-builder', 'ai-website-builder', 'guides/how-to-write-a-build-prompt'],
};
