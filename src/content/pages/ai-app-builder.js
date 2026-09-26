import { buildLink, LINKS } from '../site.js';

export default {
    slug: 'ai-app-builder',
    updated: '2026-09-26',
    priority: 0.9,
    changefreq: 'weekly',
    navLabel: 'AI app builder',

    title: 'AI App Builder - Build and publish apps for free',
    description:
        'Build apps with AI, no coding required. Turn your idea into a working app and publish it in one click. Get started for free. Hosting and backend included.',
    ogTagline: 'From a sentence to a running app',

    hero: {
        eyebrow: 'AI app builder',
        h1: 'AI app builder that hands you a working app',
        lead:
            'Build apps with AI without writing a line of code. Puter AI Builder turns your idea into a working app, complete with a backend.',
        note: 'Free with a [Puter](' + LINKS.puter + ') account. Runs in any modern browser, including on a phone. Not sure where to start? [See what to build](/what-to-build/).',
        composer: {
            submit: 'Start building',
            examples: [
                'A CRM where I drag deals through stages.',
                'A habit tracker with streaks and a weekly chart.',
                'An invoice generator that saves my clients.',
                'A booking app for my dog grooming business.',
            ],
        },
    },

    sections: [
        {
            type: 'grid',
            id: 'what-you-get',
            heading: 'What you get',
            intro:
                'Everything you need to go from an idea to a finished app.',
            items: [
                {
                    icon: 'layout',
                    title: 'Designs the UI for you',
                    body:
                        'Describe the app and Puter AI Builder designs the interface: layout, navigation, forms, empty states, all of it responsive on a phone.',
                },
                {
                    icon: 'database',
                    title: 'Backend included',
                    body:
                        'Every app comes with a backend built in. Accounts, database, file storage, and AI models are available from the moment the app exists, with nothing to set up.',
                },
                {
                    icon: 'shieldCheck',
                    title: 'Checks and fixes its own work',
                    body:
                        'After every change the builder runs the app and watches for errors. If something breaks, it reads the file, fixes the cause, and verifies again before handing it back to you.',
                },
                {
                    icon: 'cursor',
                    title: 'Point at what you want changed',
                    body:
                        'Click any element in the live preview and say what to do with it. Precise edits to the exact button, column, or color you mean, without describing where it is.',
                },
                {
                    icon: 'globe',
                    title: 'Publish in one click, free hosting included',
                    body:
                        'Your app goes live at its own address the moment you want it, ready to share with a link and install on a home screen.',
                },
                {
                    icon: 'users',
                    title: 'Run it for free at any scale',
                    body:
                        'People who use your app cover their own storage and AI usage through their own [Puter](' + LINKS.puter + ') account. If your app ever goes viral, you don\'t get a surprise bill. [How it works](' + LINKS.userPays + ').',
                },
            ],
        },

        {
            type: 'split',
            id: 'last-mile',
            heading: 'An app that works, not just a demo',
            intro:
                'Getting from a first draft to an app that actually works is where most of the time goes. These three things get you there faster.',
            items: [
                {
                    title: 'Errors get fixed before you see them',
                    art: 'verify',
                    body: [
                        'Every change is run and checked before it comes back to you. If something breaks, Puter AI Builder fixes it and checks again.',
                        'You spend your time on what the app should do, not on why it stopped working.',
                    ],
                },
                {
                    title: 'Change exactly what you mean',
                    art: 'picker',
                    body: [
                        'Click any element in the live preview and say what you want changed. No describing where things are.',
                        'For styling, adjust spacing, colors, and type on the spot. Those tweaks stay put through later changes.',
                    ],
                },
                {
                    title: 'Try anything, undo anything',
                    art: 'history',
                    body: [
                        'Every change is saved as a version. If something makes the app worse, go back to the previous one in a click and try again.',
                    ],
                },
            ],
        },

        {
            type: 'steps',
            id: 'how-to',
            heading: 'How to build an app with AI',
            intro: 'Four steps from an idea to a published app.',
            schema: {
                name: 'How to build an app with AI',
                description:
                    'Build a working web app from a plain-English description using the AI app builder at builder.puter.com.',
            },
            items: [
                {
                    title: 'Describe the app',
                    body:
                        'A sentence or two is enough: what it is, who it is for, and what it needs to do. The more specific you are, the closer the first version will be.',
                },
                {
                    title: 'Watch it build',
                    body:
                        'Puter AI Builder writes the app, runs it, and checks that it works. A first version is usually ready in a couple of minutes.',
                },
                {
                    title: 'Change it by talking, or by pointing',
                    body:
                        'Ask for the next change in plain language, or click any element in the preview and say what should be different. Every version is saved, so you can always go back.',
                },
                {
                    title: 'Publish it',
                    body:
                        'Press Publish to get a public link you can share. You can also export the app and take it anywhere.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'starters',
            heading: 'Not sure where to start? Try one of these',
            intro:
                'Pick one and Puter AI Builder makes it for you. Then make it yours by describing what to change.',
            items: [
                {
                    title: 'Habit tracker',
                    body: 'Daily check-offs, streaks, and a year-at-a-glance grid.',
                    prompt:
                        'Build a habit tracker where I can add daily habits, check them off each day, and see a calendar heatmap of the whole year per habit with my current and longest streak. Add a dark mode toggle and keep everything saved to my Puter account.',
                },
                {
                    title: 'Study assistant',
                    body: 'Paste notes, get flashcards and a quiz generated by AI.',
                    prompt:
                        'Build a study assistant where I paste in my notes and it uses AI to generate flashcards and a multiple-choice quiz from them. Let me flip through the cards, mark ones I got wrong to review again, take the quiz with instant feedback and a final score, and save my decks between visits.',
                },
                {
                    title: 'Invoice generator',
                    body: 'Line items, totals, and a clean printable PDF.',
                    prompt:
                        'Build an invoice generator where I enter my business details once, add a client and line items with quantity and rate, and see a clean invoice preview with subtotal, tax, and total. Add sequential invoice numbers, save past invoices between visits, and a print button that produces a tidy one-page PDF.',
                },
                {
                    title: 'Inventory tracker',
                    body: 'Stock levels, low-stock warnings, and a movement log for a small shop.',
                    prompt:
                        'Build an inventory tracker for a small shop where I can add products with a SKU, cost, price, and quantity on hand, record stock in and stock out with a reason, see a highlighted low-stock list under a threshold I set per product, and export the current stock as CSV. Persist everything to my Puter account.',
                },
                {
                    title: 'Client CRM',
                    body: 'Contacts, deal stages, notes, and a pipeline view that saves between visits.',
                    prompt:
                        'Build a lightweight CRM where I can add clients with a company, email, and deal value, move them through stages (Lead, Contacted, Proposal, Won, Lost) on a drag-and-drop board, add dated notes to each client, and see total pipeline value per stage. Save everything to my Puter account so it persists between visits.',
                },
                {
                    title: 'Team standup board',
                    body: 'Shared status updates that everyone on the team can see.',
                    prompt:
                        'Build a team standup board where anyone with the link can post what they did yesterday, what they are doing today, and any blockers, with their name and a timestamp. Use a Puter serverless worker so the posts are shared across everyone who opens it, and group the board by day.',
                },
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'AI app builder FAQ',
            items: [
                {
                    q: 'What is an AI app builder?',
                    a: [
                        'An AI app builder turns a plain-language description into a working app. You describe what the app should do, and the AI designs the screens, sets up the data, writes the logic, and wires it all together, then runs the result so you can try it right away.',
                        'You don\'t need to know how to code. Every step, from the first description to publishing, works in plain English, and you refine the app the same way, by asking for changes or pointing at what should be different. Hosting, accounts, and data storage are included, so there is nothing to set up or maintain yourself.',
                        'Compared with traditional development, it turns weeks of work into minutes and moves your effort from writing code to deciding what the app should do. Compared with no-code tools, you end up owning source code you can read, edit, and take with you, rather than a project locked inside someone else\'s editor. The [full explainer](/guides/what-is-an-ai-app-builder/) covers how these tools work, what they generate, and where they fall short.',
                    ],
                },
                {
                    q: 'How is this different from a no-code app builder?',
                    a: [
                        'A no-code app builder gives you a visual canvas and a fixed set of components. You assemble the app by hand, which gives you fine control but takes hours or days, means learning the platform, and leaves the finished app living inside the vendor\'s system, usually with no way to export it.',
                        'An AI app builder starts from a description and generates the whole app in minutes: interface, data, and logic. With Puter AI Builder you refine it by asking for changes or clicking the element you want changed, so you keep the precision of a visual editor without the setup. The result is real source code you own and can export, and the app can do anything a web page can do, so you are not limited to the components a vendor anticipated.',
                        'The trade-off is that code you did not write is still code you are responsible for. For anything handling money, health information, or other people\'s personal data, read what was built and treat the AI as a fast first draft rather than a security review. For a feature-by-feature comparison of what to look for in a builder, see [the main features of an AI app builder](/guides/main-features-of-an-ai-app-builder/).',
                    ],
                },
                {
                    q: 'What kinds of apps can I build with Puter AI Builder?',
                    a: [
                        'Puter AI Builder is strongest at the software people actually need and rarely get: internal tools, trackers and dashboards, client portals, calculators, planners, study tools, small games, and data-entry apps that would otherwise be a spreadsheet nobody enjoys using.',
                        'Because the generated app can use Puter\'s storage, accounts, AI models, workers, and peer-to-peer connections, it also handles things that normally require a backend, including multi-user apps, AI-powered features, and real-time collaboration.',
                    ],
                },
                {
                    q: 'How long does it take?',
                    a: [
                        'A first working version usually lands in a couple of minutes. Getting it exactly how you want it is a conversation, and most apps are finished in a handful of changes. Every version is saved, so you can stop and pick it up later.',
                    ],
                },
                {
                    q: 'Can I try Puter AI Builder for free?',
                    a: [
                        'Yes. Building is free with a [Puter](' + LINKS.puter + ') account, and no card is required. Open Puter AI Builder, describe an app, and use it in the preview right away. Nothing is public until you decide to publish.',
                        'Very heavy use can hit the free tier\'s limits, at which point you can upgrade your Puter account. Ordinary building, publishing, and iterating do not.',
                    ],
                },
                {
                    q: 'Can I use Puter AI Builder for a real business?',
                    a: [
                        'Yes. Apps built with Puter AI Builder run with accounts, storage, and hosting included, and people use them for client portals, internal tools, booking, and tracking. For anything that handles money or sensitive personal data, review what was built before you rely on it.',
                    ],
                },
                {
                    q: 'Do I own the app I create?',
                    a: [
                        'Yes. The code, the design, and everything you publish are yours. There is no license to renew and no export wall. Keep it on [Puter](' + LINKS.puter + ') or take it somewhere else at any time.',
                        'The project is a normal folder of files, and you can export the whole thing whenever you like. Because the output is standard HTML, CSS, and JavaScript with no build step, an editor and a browser are the only tools you need to keep working on it elsewhere.',
                    ],
                },
                {
                    q: 'Can I keep editing the app after it is published?',
                    a: [
                        'Yes. Ask for changes or click an element in the preview at any time, then publish again to update the live app. Everyone with the link sees the new version, and every version is saved so you can go back if a change makes things worse.',
                    ],
                },
                {
                    q: 'What happens when the AI gets something wrong?',
                    a: [
                        'Most runtime errors are caught before you see them: Puter AI Builder reloads the preview after each change, watches for errors, and sends them back to the AI to fix and re-verify.',
                        'For everything else, tell it what is wrong in one sentence, or click the offending element in the preview and describe the fix. If a change made things worse overall, version history lets you restore an earlier snapshot and take a different run at it.',
                    ],
                },
                {
                    q: 'What is included in the backend?',
                    a: [
                        'Every app comes with user accounts, a database, file storage, and AI models built in, with nothing to set up. Each person\'s data is stored under their own [Puter](' + LINKS.puter + ') account.',
                        'The app you build can use chat, vision, and image generation models directly, with no API keys to manage.',
                        'When something needs to run outside the browser, like shared state, a webhook, or a public API, Puter AI Builder can deploy a serverless worker from the same conversation. Real-time features such as video chat, screen sharing, and multiplayer use Puter\'s peer-to-peer API.',
                    ],
                },
                {
                    q: 'Can I accept payments or monetize it?',
                    a: [
                        'Puter AI Builder does not process payments itself. The usual approach is to link to a payment provider you already use, such as a checkout page or a payment link, and let your app handle everything around it: sign-in, per-user data, and the features people are paying for.',
                    ],
                },
                {
                    q: 'How much does it cost to operate the app?',
                    a: [
                        'Nothing. The people who use your app cover their own storage and AI usage through their own [Puter](' + LINKS.puter + ') account. If your app ever goes viral, you don\'t get a surprise bill. [How it works](' + LINKS.userPays + ').',
                    ],
                },
                {
                    q: 'Can I build a mobile app?',
                    a: [
                        'Yes. Every app you build works on mobile and on the web from the same link. On a phone it can be added to the home screen with its own icon, so it opens and feels like a native app.',
                    ],
                },
                {
                    q: 'Can I publish it to the App Store or Google Play?',
                    a: [
                        'Apps built with Puter AI Builder are web based and mobile responsive. They work on any phone from a link the moment you publish and can be added to the home screen like any other app, so you don\'t need an app store. There is no review to wait for, no fees, and updates go live for everyone instantly.',
                    ],
                },
                {
                    q: 'Can I build from my phone?',
                    a: [
                        'Yes. Puter AI Builder is fully usable on a phone, with the chat and the preview as two views you switch between. Long builds keep running while the screen is on, and a build interrupted by the browser suspending the tab picks back up when you return.',
                    ],
                },
                {
                    q: 'Can I start from my existing website or content?',
                    a: [
                        'Yes. Attach your logo, images, PDFs, or text files, paste your copy into the chat, or share a link to your current site and describe what you want to keep and what should change.',
                    ],
                },
                {
                    q: 'Can my team build together?',
                    a: [
                        'Each project belongs to one [Puter](' + LINKS.puter + ') account, so building happens from one account at a time. The app you build can be fully multi-user: teammates sign in with their own accounts, and shared data can live in a serverless worker so everyone sees the same thing.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Turn your idea into a working app',
            body: 'Build with AI, no coding required. Free to start, hosting and backend included.',
            label: 'Start building',
            href: buildLink(''),
        },
    ],

    related: ['ai-website-builder', 'use-cases', 'for', 'what-to-build', 'guides/how-to-build-an-app-with-ai', 'guides/what-is-an-ai-app-builder'],
};
