import { buildLink, LINKS } from '../site.js';

export default {
    slug: 'ai-app-builder',
    updated: '2026-08-15',
    priority: 0.9,
    changefreq: 'weekly',
    navLabel: 'AI app builder',

    title: 'AI App Builder: Describe It, Get a Working App | Puter',
    description:
        'Describe an app in plain English and Puter writes the files, runs it in a live preview, fixes its own errors, and publishes it to a real URL. Free, in your browser.',
    ogTagline: 'From a sentence to a running app',

    hero: {
        eyebrow: 'AI app builder',
        h1: 'An AI app builder that hands you a working app',
        lead:
            'Type what you want. Puter writes the files, runs the app in a live preview next to you, checks that it actually works, and gives you a public URL the moment you want one. Nothing to install, nothing to configure, no code required.',
        cta: { label: 'Start building', href: '/' },
        secondary: { label: 'See what to build', href: '/what-to-build/' },
        note: 'Free with a Puter account. Runs in any modern browser, including on a phone.',
        demo: {
            prompt: 'Build a CRM where I can drag deals through stages and see pipeline value',
            app: {
                name: 'dealboard.puter.site',
                header: 'Pipeline',
                blocks: [
                    {
                        kind: 'stats',
                        items: [
                            { value: '48k', label: 'Pipeline value' },
                            { value: '7', label: 'Deals in play' },
                            { value: '3', label: 'Closing this week' },
                        ],
                    },
                    {
                        kind: 'list',
                        rows: [
                            { title: 'Acme redesign', sub: 'Proposal · 12,400', tag: 'Warm' },
                            { title: 'Bluebird site', sub: 'Contacted · 3,800', tag: 'New' },
                            { title: 'Corvid app', sub: 'Negotiation · 21,000', tag: 'Hot' },
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
            heading: 'What you get on the first try',
            intro:
                'Not a mockup, not a component tree you have to learn. A folder of files that runs.',
            items: [
                {
                    icon: 'file',
                    title: 'Real, readable files',
                    body:
                        'Every app is ordinary HTML, CSS, and JavaScript in a folder you can open and read. Styling is Tailwind from a CDN, so there is no build step and no toolchain to keep alive. If you can read a web page, you can read your app.',
                },
                {
                    icon: 'eye',
                    title: 'A live preview, not a screenshot',
                    body:
                        'The preview pane runs the actual app while it is being written. Click through it, type into it, break it, and ask for the next change in the same window. What you see is the thing you will publish.',
                },
                {
                    icon: 'shieldCheck',
                    title: 'It checks its own work',
                    body:
                        'After every change the builder reloads the preview and watches for runtime errors. If the app throws, the AI reads the file that broke, fixes the cause, and re-checks before it tells you it is finished.',
                },
                {
                    icon: 'database',
                    title: 'A backend that is already running',
                    body:
                        'Saving data, signing people in, storing uploads, calling an AI model: all of it is available the moment the app exists. There is no database to provision and no API key to paste in.',
                },
                {
                    icon: 'globe',
                    title: 'A public URL in one click',
                    body:
                        'Publish and the app is live at its own address on puter.site. No deploy pipeline, no hosting account, no waiting for a build to go green. Unpublish just as quickly.',
                },
                {
                    icon: 'phone',
                    title: 'Installable by default',
                    body:
                        'Every app gets a web manifest and a full set of icons generated for it, so anyone you share it with can add it to a home screen and launch it like a native app.',
                },
            ],
        },

        {
            type: 'split',
            id: 'last-mile',
            heading: 'Prototypes are easy. The last mile is the hard part.',
            intro:
                'Generating something that *looks* like an app is close to a solved problem; every tool in this category produces a screenshot-perfect first draft. The gap that costs you an afternoon is between "it renders" and "it works": the button that does nothing, the form that drops your input, the chart that throws on an empty dataset. The builder is designed around closing that gap.',
            items: [
                {
                    title: 'Verification after every turn',
                    art: 'verify',
                    body: [
                        'The preview reloads after each change and reports runtime errors straight back to the AI, which reads the file that broke, fixes the underlying cause, and re-verifies.',
                        'A turn is not finished until the app runs clean. That single rule is most of the difference between a demo generator and a tool you can rely on.',
                    ],
                },
                {
                    title: 'Point instead of describing',
                    art: 'picker',
                    body: [
                        'Turn on the element picker, click the thing that is wrong in the live preview, and describe the change. No more "the third card in the second row, under the heading".',
                        'For pure styling, skip the sentence entirely: nudge spacing, colors, and type on the selected element and apply. Those edits land in their own stylesheet, so a later AI change cannot quietly undo them.',
                    ],
                },
                {
                    title: 'Every version, kept',
                    art: 'history',
                    body: [
                        'Every turn is a snapshot with a description of what changed. If a change makes things worse, restore the previous version in a click and try a different sentence.',
                        'A safety snapshot is taken before each restore, so even the undo is undoable. Iteration without fear is the point.',
                    ],
                },
            ],
        },

        {
            type: 'grid',
            id: 'backend',
            columns: 2,
            heading: 'The backend you did not have to build',
            intro:
                'Apps built here can call Puter.js directly, which means the parts that normally take a weekend of setup are already there and already authenticated.',
            items: [
                {
                    icon: 'database',
                    title: 'Database and key-value storage',
                    body:
                        'Store per-user records, settings, and app state with a couple of calls. No schema migration, no connection string, no free-tier database that sleeps after an hour.',
                },
                {
                    icon: 'folder',
                    title: 'File storage',
                    body:
                        'Read and write real files: uploads, exports, generated images, documents. Each user\'s data lives in their own Puter storage rather than a bucket you have to administer.',
                },
                {
                    icon: 'lock',
                    title: 'Sign-in',
                    body:
                        'Add a sign-in button and your app has accounts. There is no user table to run, no password reset flow to write, and no session infrastructure to keep patched.',
                },
                {
                    icon: 'sparkles',
                    title: 'AI inside the app you built',
                    body:
                        'The app you make can itself call chat models, vision, and image generation. Build a study-notes summarizer or an image editor without holding a single provider key.',
                },
                {
                    icon: 'zap',
                    title: 'Serverless workers',
                    body:
                        'When something has to run off the client (shared state, a webhook, a scheduled job, a public API), deploy a worker from the same conversation.',
                },
                {
                    icon: 'users',
                    title: 'Peer-to-peer',
                    body:
                        'Video and voice chat, screen sharing, multiplayer games, and live collaboration go over Puter\'s peer API, so real-time features do not need a signalling server of your own.',
                },
            ],
            after: [
                'One consequence is worth stating plainly, because it changes what is worth building. On Puter, the people who use your app cover their own storage and AI usage through their own Puter accounts ([the user-pays model](' + LINKS.userPays + ')). A side project that unexpectedly finds an audience does not hand you a bill that scales with strangers\' usage.',
            ],
        },

        {
            type: 'steps',
            id: 'how-to',
            heading: 'How to build an app with AI',
            intro: 'Five steps, and only the first one is required reading.',
            schema: {
                name: 'How to build an app with AI',
                description:
                    'Build a working web app from a plain-English description using the AI app builder at builder.puter.com.',
            },
            items: [
                {
                    title: 'Describe the app',
                    body:
                        'One or two sentences is enough to start: what it is, who it is for, and the two or three things it must do. "A shift planner for a coffee shop where I can add staff, drag them onto a weekly grid, and see who is over their hours" gets you much further than "a scheduling app".',
                },
                {
                    title: 'Answer a couple of questions',
                    body:
                        'If the request leaves something genuinely open, you get at most one short round of questions about the product, never about the technology. Skip them and sensible defaults are used instead.',
                },
                {
                    title: 'Watch it build',
                    body:
                        'A checklist shows what is being worked on. Files appear, the preview fills in, and the app is opened and verified for you. A first version usually lands in a couple of minutes.',
                },
                {
                    title: 'Change it by talking, or by pointing',
                    body:
                        'Ask for the next thing in plain language, or click an element in the preview and describe what should be different about that specific piece. Each turn is snapshotted, so nothing you liked is ever lost.',
                },
                {
                    title: 'Publish it',
                    body:
                        'Press Publish for a public URL on puter.site, or share the private draft link while it is still in progress. You can also download the entire project as a zip and host it anywhere that serves static files.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'starters',
            heading: 'Start from something concrete',
            intro:
                'These open the builder with the prompt already in the box. Edit it before you send, or send it as-is and iterate.',
            items: [
                {
                    title: 'Client CRM',
                    body: 'Contacts, deal stages, notes, and a pipeline view that saves between visits.',
                    prompt:
                        'Build a lightweight CRM where I can add clients with a company, email, and deal value, move them through stages (Lead, Contacted, Proposal, Won, Lost) on a drag-and-drop board, add dated notes to each client, and see total pipeline value per stage. Save everything to my Puter account so it persists between visits.',
                },
                {
                    title: 'Inventory tracker',
                    body: 'Stock levels, low-stock warnings, and a movement log for a small shop.',
                    prompt:
                        'Build an inventory tracker for a small shop where I can add products with a SKU, cost, price, and quantity on hand, record stock in and stock out with a reason, see a highlighted low-stock list under a threshold I set per product, and export the current stock as CSV. Persist everything to my Puter account.',
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
                    title: 'Team standup board',
                    body: 'Shared status updates that everyone on the team can see.',
                    prompt:
                        'Build a team standup board where anyone with the link can post what they did yesterday, what they are doing today, and any blockers, with their name and a timestamp. Use a Puter serverless worker so the posts are shared across everyone who opens it, and group the board by day.',
                },
                {
                    title: 'Habit tracker',
                    body: 'Daily check-offs, streaks, and a year-at-a-glance grid.',
                    prompt:
                        'Build a habit tracker where I can add daily habits, check them off each day, and see a calendar heatmap of the whole year per habit with my current and longest streak. Add a dark mode toggle and keep everything saved to my Puter account.',
                },
            ],
        },

        {
            type: 'prose',
            id: 'vs-no-code',
            heading: 'How this differs from a no-code app builder',
            body: [
                'A classic no-code builder gives you a canvas and a fixed set of components. You assemble the app by dragging, and the result lives inside the vendor\'s runtime. That is genuinely fast for the shapes the vendor anticipated, and a wall the moment you need something they did not.',
                'An AI app builder inverts that. You describe the outcome and get source code, so there is no component catalog to stay inside of. The app can do anything a web page can do, because it *is* a web page. When you outgrow the conversation, you open the files and edit them yourself, or download the project and take it somewhere else entirely.',
                'The honest trade-off: source code you did not write is still source code you are responsible for. For anything handling money, health information, or other people\'s personal data, read what was built, and treat the AI as a fast first draft rather than a security review. For the internal tools, personal utilities, prototypes, and small products that make up most of what people actually need, that trade is a good one.',
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
                        'An AI app builder turns a written description into a working application. You describe what the app should do and the AI writes the interface, the logic, and the data handling, then runs the result so you can use it immediately.',
                        'The difference from traditional development is where your effort goes. Instead of writing code, you spend your time deciding what the app should do and reviewing what came back. The difference from no-code tools is what you end up owning: source code you can read, edit, and take with you, rather than a document inside someone else\'s editor.',
                    ],
                },
                {
                    q: 'Do I need to know how to code?',
                    a: [
                        'No. Every step, from the first description to publishing, works in plain English. Knowing some HTML or JavaScript helps when you want to make a precise change yourself, but it is never required, and you can always ask for the change instead of making it.',
                    ],
                },
                {
                    q: 'Is it free?',
                    a: [
                        'Yes, building is free with a Puter account, and no card is required to start. Very heavy use can hit the free tier\'s limits, at which point you can upgrade your Puter account; ordinary building, publishing, and iterating do not.',
                    ],
                },
                {
                    q: 'What kinds of apps can it build?',
                    a: [
                        'It is strongest at the software people actually need and rarely get: internal tools, trackers and dashboards, client portals, calculators, planners, study tools, small games, and data-entry apps that would otherwise be a spreadsheet nobody enjoys using.',
                        'Because the generated app can use Puter\'s storage, accounts, AI models, workers, and peer-to-peer connections, it also handles things that normally require a backend, including multi-user apps, AI-powered features, and real-time collaboration.',
                    ],
                },
                {
                    q: 'Where does my app run, and who can see it?',
                    a: [
                        'While you build, the app runs in a private preview only you can open. Nothing is public until you press Publish. When you do, the app gets its own address on puter.site that anyone with the link can visit, and you can take it down again at any point.',
                    ],
                },
                {
                    q: 'Can I edit the code myself?',
                    a: [
                        'Yes. The project is a normal folder of files, and you can download the whole thing as a zip at any time. Because the output is standard HTML, CSS, and JavaScript with no build step, an editor and a browser are the only tools you need to keep working on it elsewhere.',
                    ],
                },
                {
                    q: 'What happens when the AI gets something wrong?',
                    a: [
                        'Most runtime errors are caught before you see them: the builder reloads the preview after each change, watches for errors, and sends them back to the AI to fix and re-verify.',
                        'For everything else, tell it what is wrong in one sentence, or click the offending element in the preview and describe the fix. If a change made things worse overall, version history lets you restore an earlier snapshot and take a different run at it.',
                    ],
                },
                {
                    q: 'Can my app store data and have user accounts?',
                    a: [
                        'Yes. Apps built here can use Puter\'s key-value store and file storage for data, and Puter accounts for sign-in, without you running a database or an auth service. Each person\'s data is stored under their own account rather than in a shared table you have to secure.',
                    ],
                },
                {
                    q: 'Do I have to pay for my users\' usage?',
                    a: [
                        'No. Puter apps run on a model where each person brings their own account for the storage and AI they use. That is why a project here can get popular without producing a bill that grows with strangers\' usage, which is the usual reason hobby AI apps get taken offline.',
                    ],
                },
                {
                    q: 'Does it work on a phone?',
                    a: [
                        'Yes. The builder is fully usable on a phone, with the chat and the preview as two views you switch between. Long builds keep running while the screen is on, and a build interrupted by the browser suspending the tab picks back up when you return.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Describe your app and see it run',
            body: 'No signup wall, no template gallery to wade through. One sentence is enough to start.',
            label: 'Open the builder',
            href: buildLink(''),
        },
    ],

    related: ['ai-website-builder', 'for', 'what-to-build', 'guides/how-to-build-an-app-with-ai'],
};
