import { buildLink, LINKS } from '../site.js';

const starterPrompt = 'Build a responsive web interface for my app that works on phones, tablets, and desktops. Include clear navigation, touch-friendly controls, and forms with validation. Use sample content I can replace and show me the result in the live preview.';

export default {
    slug: 'ai-ui-builder',
    parent: 'use-cases',
    updated: '2026-09-23',
    priority: 0.9,
    changefreq: 'weekly',
    navLabel: 'AI UI builder',

    title: 'AI UI Builder - Web & Responsive Mobile UI, Free',
    description:
        'Build web and responsive mobile UI with AI. Describe your screens, refine layouts in a live preview, then publish free or export HTML, CSS, and JavaScript.',
    ogTagline: 'One interface. Every screen size.',

    hero: {
        eyebrow: 'AI UI builder',
        h1: 'AI UI builder for web and responsive mobile interfaces',
        lead:
            'Describe your screens and get a working web interface that adapts to desktops, tablets, and phones. Click through the UI, refine the layout at each size, and publish it to a link, without writing code.',
        cta: { label: 'Build my UI', href: buildLink(starterPrompt) },
        secondary: { label: 'How to write a good prompt', href: '/guides/how-to-write-a-build-prompt/' },
        note: 'Free with a [Puter](' + LINKS.puter + ') account. Build responsive web UI for desktop and mobile browsers.',
        demo: {
            prompt: 'Design a running app UI with weekly activity, a workout list, and layouts for desktop and phone screens',
            app: {
                name: 'stride.puter.site',
                header: 'This week',
                blocks: [
                    {
                        kind: 'stats',
                        items: [
                            { value: '42 km', label: 'Distance' },
                            { value: '5', label: 'Workouts' },
                            { value: '5:12', label: 'Avg pace' },
                        ],
                    },
                    {
                        kind: 'bars',
                        label: 'Kilometers per day',
                        values: [6, 0, 8, 5, 0, 12, 11],
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
                'Working screens, responsive layouts, and interactions you can try on desktop and mobile.',
            items: [
                {
                    icon: 'layout',
                    title: 'Designs the whole interface',
                    body:
                        'Describe the screen and Puter AI Builder designs it: layout, hierarchy, navigation, forms, cards, tables, empty states, and sensible default content, written for you rather than adapted from a template.',
                },
                {
                    icon: 'code',
                    title: 'Interactions you can try immediately',
                    body:
                        'The output is standard HTML, CSS, and JavaScript running in a live preview. Buttons press, forms validate, tabs switch. You can click through it and use it exactly as a visitor would, from the first version.',
                },
                {
                    icon: 'cursor',
                    title: 'Point at what you want changed',
                    body:
                        'Click any element in the preview and say what to do with it. Precise edits to the exact button, card, or column you mean, without describing where it is.',
                },
                {
                    icon: 'phone',
                    title: 'Layouts for desktop and touch screens',
                    body:
                        'Start with responsive layouts, then refine how each screen adapts: a sidebar that becomes a mobile menu, cards that stack on a phone, and controls with room to tap. Resize the preview and ask for changes at a specific width.',
                },
                {
                    icon: 'database',
                    title: 'Wired to a real backend',
                    body:
                        'Sign-in, per-user data, file storage, and AI models are available to the interface the moment it exists, with nothing to set up. A settings screen can actually save. A chat UI can actually answer.',
                },
                {
                    icon: 'download',
                    title: 'Publish or export, no lock-in',
                    body:
                        'Publish in one click to a free public link, or download the whole project as a zip. There is no build step and no proprietary format, so the files run on any static host or straight off your disk.',
                },
            ],
        },

        {
            type: 'split',
            id: 'last-mile',
            heading: 'Refine your UI from the first screen to the final layout',
            intro:
                'The gap between a generated screen and an interface that holds up is where most of the time goes. These three things close it.',
            items: [
                {
                    title: 'It runs before you see it',
                    art: 'verify',
                    body: [
                        'After every change the preview is reloaded and watched for runtime errors. If something breaks, Puter AI Builder reads the file, fixes the cause, and checks again before handing the interface back to you.',
                        'Every turn is also saved as a version. If a redesign makes things worse, restore the previous one in a click and take a different run at it.',
                    ],
                },
                {
                    title: 'Fine-tune by pointing, not re-prompting',
                    art: 'picker',
                    body: [
                        'Click any element in the running interface and describe what should change about that specific piece. No more explaining which of the four cards you mean.',
                        'For styling, adjust spacing, color, size, and type directly on the selected element and watch it update live. Those tweaks are committed to a stylesheet of your own, and the AI leaves it alone on later turns.',
                    ],
                },
                {
                    title: 'Real files you can take anywhere',
                    art: 'files',
                    body: [
                        'The project is a normal folder of HTML, CSS, and JavaScript. Download it as a zip whenever you like, hand it to a developer, or drop it into an existing codebase.',
                        'Or publish it right here for free. Anything people use inside it, like sign-in or AI features, is covered by their own [Puter](' + LINKS.puter + ') account, so running it costs you nothing at any scale. [How it works](' + LINKS.userPays + ').',
                    ],
                },
            ],
        },

        {
            type: 'steps',
            id: 'how-to',
            heading: 'How to build web and mobile UI with AI',
            intro: 'Four steps from a screen description to a responsive web interface you can share.',
            schema: {
                name: 'How to build web and mobile UI with AI',
                description:
                    'Generate a web interface, refine its desktop and mobile layouts, and publish it using the AI UI builder at builder.puter.com.',
            },
            items: [
                {
                    title: 'Describe the interface',
                    body:
                        'Say what the screens are for, the parts they need, and the look you want. Describe the desktop layout and what should change on a phone, such as a sidebar becoming bottom navigation or a table becoming cards. Attach a logo or reference images if you have them.',
                },
                {
                    title: 'Watch it build',
                    body:
                        'Puter AI Builder writes the HTML, CSS, and JavaScript, runs the interface in the live preview, and checks that it works. A first version is usually ready in a couple of minutes.',
                },
                {
                    title: 'Check desktop and mobile layouts',
                    body:
                        'Resize the preview and try the navigation, buttons, and forms at wide and narrow widths. Ask for changes or click an element to adjust it. Every version is saved, so you can go back.',
                },
                {
                    title: 'Publish it, or take the files',
                    body:
                        'Press Publish to get a public link with free hosting included, then open it on a phone to check touch controls and share it for feedback. Or download the project as a zip and keep working with the web files elsewhere.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'starters',
            heading: 'Not sure where to start? Try one of these',
            intro:
                'Pick one and Puter AI Builder makes it for you. Then make it yours by pointing at what to change.',
            items: [
                {
                    title: 'Analytics dashboard',
                    body: 'Sidebar, KPI cards, a chart, and a sortable table that reads well on any screen.',
                    prompt:
                        'Design an analytics dashboard UI with a collapsible sidebar, four KPI cards across the top, a weekly line chart, a sortable table of recent orders, and a dark mode toggle. Use realistic sample data and keep the layout clean at phone and desktop widths.',
                },
                {
                    title: 'Mobile onboarding flow',
                    body: 'Three steps with large touch targets, a progress indicator, and a summary.',
                    prompt:
                        'Build a responsive web onboarding flow with three steps and a progress indicator: pick a plan, set up a profile with an avatar upload, and choose notification preferences. Use a single column with large touch targets on phones and a centered panel on desktop. Save the answers to my Puter account and show an editable summary screen.',
                },
                {
                    title: 'Settings screen',
                    body: 'Responsive tabs, validated forms, toggles, and a save bar when needed.',
                    prompt:
                        'Design a responsive settings page with a left tab list on desktop and a compact section selector on phones (Profile, Security, Notifications). Include form fields with inline validation, toggle switches, and a sticky save bar that appears only when something has changed. Save the settings to my Puter account so they persist between visits.',
                },
                {
                    title: 'Pricing section',
                    body: 'Three tiers, a monthly and yearly toggle, and a comparison table.',
                    prompt:
                        'Design a pricing section with three tiers, a monthly and yearly toggle that updates the prices, a highlighted recommended plan, a feature comparison table below, and an FAQ accordion. High contrast, generous spacing, and easy to read on a phone.',
                },
                {
                    title: 'Kanban board',
                    body: 'Desktop columns, a mobile list, labels, due dates, and search.',
                    prompt:
                        'Build a responsive kanban board UI with desktop columns for To do, In progress, and Done, drag-and-drop cards with colored labels and due dates, a modal to edit a card, and search. On phones, show one status list at a time and provide a move-to-status menu on each card so dragging is optional. Keep the board saved to my Puter account.',
                },
                {
                    title: 'Chat interface',
                    body: 'Side-by-side chats on desktop, a focused conversation on mobile, and real AI replies.',
                    prompt:
                        'Design a responsive chat interface with a conversation list beside the active chat on desktop. On phones, show one conversation at a time with a back button to the list. Include message timestamps, a typing indicator, and a multi-line composer that stays usable when the phone keyboard opens. Wire it to Puter\'s AI chat and save conversations to my Puter account.',
                },
            ],
        },

        {
            type: 'grid',
            id: 'responsive-layouts',
            columns: 2,
            heading: 'One web interface, layouts for every screen',
            intro:
                'Describe how people will use the UI at a desk and on the move. The same project can adapt its navigation, content, and controls to the space available.',
            items: [
                {
                    icon: 'layout',
                    title: 'Room to work on desktop',
                    body:
                        'Use sidebars, multi-column layouts, sortable tables, and detail panels where there is room for them. Ask for loading, empty, and error states, then click through the flow in the preview to see how the screens work together.',
                },
                {
                    icon: 'phone',
                    title: 'Comfortable to use on a phone',
                    body:
                        'Ask for stacked cards, compact navigation, readable text, and buttons with room to tap. Specify how forms behave when the keyboard opens and give drag or hover interactions a tap-based alternative. Publish the same project to a link that opens in a mobile browser.',
                },
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'AI UI builder FAQ',
            items: [
                {
                    q: 'What is an AI UI builder?',
                    a: [
                        'An AI UI builder turns a plain-language description into a user interface: the layout, the components, the styling, and the states in between. You say what the screen is for and what it needs, and the AI designs it and builds it, usually in minutes.',
                        'Puter AI Builder creates working web UI in HTML, CSS, and JavaScript, with responsive layouts for desktop and mobile browsers. You can click through the screens, refine individual elements, use Puter accounts and storage when needed, and publish the interface or download its files.',
                    ],
                },
                {
                    q: 'Do I need design or coding skills?',
                    a: [
                        'No. Everything from the first description to publishing works in plain English. You refine the interface the same way, by asking for changes or clicking the element you want changed, and you can adjust spacing, colors, and type directly on an element without touching code.',
                        'If you do know design or code, it helps. Precise descriptions get closer first versions, and the output is ordinary HTML, CSS, and JavaScript you can read and edit yourself.',
                    ],
                },
                {
                    q: 'Is the AI UI builder free?',
                    a: [
                        'Yes. Building and publishing are free with a [Puter](' + LINKS.puter + ') account, and no card is required. Open Puter AI Builder, describe an interface, and use it in the preview right away. Nothing is public until you decide to publish.',
                        'Very heavy use can hit the free tier\'s limits, at which point you can upgrade your Puter account. Ordinary building, iterating, and publishing do not.',
                    ],
                },
                {
                    q: 'What types of UI can I build?',
                    a: [
                        'Dashboards, admin panels, settings and profile screens, onboarding flows, forms, tables and data views, kanban boards, chat interfaces, landing pages, pricing sections, and complete multi-screen apps. Anything a web page can show, at phone or desktop size.',
                        'Because the interface can use Puter\'s accounts, storage, and AI models, it can also be a working product rather than a front for nothing: a settings page that saves, a login that logs in, a chat that answers.',
                    ],
                },
                {
                    q: 'Can I edit the generated UI?',
                    a: [
                        'Yes, in three ways. Ask for a change in plain language. Click an element in the live preview and describe what should be different about that piece specifically. Or select an element and adjust its spacing, color, size, and type directly, watching it update as you go.',
                        'Direct visual edits are committed to a stylesheet of your own, which the AI leaves alone on later turns, so a tweak you made by hand does not get undone by the next request.',
                    ],
                },
                {
                    q: 'Does it support responsive design?',
                    a: [
                        'Yes. Interfaces are written responsively by default. Resize the preview to check phone, tablet, and desktop widths, then ask for changes to a particular layout: stack the cards on mobile, collapse the sidebar, or shorten the table. Check the published interface on the devices your audience uses, including touch controls and forms with the keyboard open.',
                    ],
                },
                {
                    q: 'Can I build mobile UI for iPhone and Android?',
                    a: [
                        'Yes, as responsive web UI that opens in the browser on iPhone and Android. Ask for phone-sized screens, bottom navigation, touch-friendly controls, and layouts that adapt when the screen gets wider. The same published link works on desktop too.',
                        'The output is web files. Native iOS or Android interfaces and app-store packages are outside this builder\'s scope.',
                    ],
                },
                {
                    q: 'Can I use the UI in a real product?',
                    a: [
                        'Yes. The interface is real, production-format code, not a prototype export: standard HTML, CSS, and JavaScript with no build step. People publish it as-is with hosting included, or download it and integrate it elsewhere.',
                        'Code you did not write is still code you are responsible for. For anything handling money, health information, or other people\'s personal data, read what was built and treat the AI as a fast first draft rather than a security review.',
                    ],
                },
                {
                    q: 'Can I connect a backend?',
                    a: [
                        'One is already connected. Every interface built here can use user accounts, a key-value database, file storage, and chat, vision, and image models through [Puter](' + LINKS.puter + '), with no API keys to manage and nothing to set up. When something has to run outside the browser, like shared state, a webhook, or a public API, Puter AI Builder can deploy a serverless worker from the same conversation.',
                        'If you want the interface to talk to a backend you already have, describe the API and it will be wired up like any other web page would be.',
                    ],
                },
                {
                    q: 'Can I export the UI, and in what format?',
                    a: [
                        'Yes. Download the whole project as a zip at any time. It is standard HTML, CSS, and JavaScript with no framework and no proprietary format, so it runs on any static host, in any editor, or straight off your disk. There is no export wall and no license to renew.',
                    ],
                },
                {
                    q: 'Can I export to Figma, or import a Figma design?',
                    a: [
                        'Puter AI Builder creates editable web files. It does not export to Figma or import Figma files and design-system libraries.',
                        'You can attach screenshots, a logo, and reference files to the chat, or share a link to an existing site, and describe the layout, styling, and mobile behavior you want to follow.',
                    ],
                },
                {
                    q: 'Does it output React or Tailwind components?',
                    a: [
                        'No. The output is complete pages in plain HTML, CSS, and JavaScript, with no framework and no build step. That is what makes the files portable and immediately publishable, and it is why a browser and an editor are the only tools needed to keep working on them.',
                        'For an existing React project, the exported files can serve as a reference, but adapting them to your components and build setup is a separate development step.',
                    ],
                },
                {
                    q: 'What happens when the AI gets the UI wrong?',
                    a: [
                        'Runtime errors are mostly caught before you see them: Puter AI Builder reloads the preview after each change, watches for errors, and sends them back to the AI to fix and re-verify. A turn is not reported as done until the interface runs clean.',
                        'For everything else, tell it what is wrong in one sentence, or click the offending element and describe the fix. If a change made things worse overall, version history lets you restore an earlier snapshot in a click and try a different direction.',
                    ],
                },
                {
                    q: 'Will later changes undo the tweaks I already made?',
                    a: [
                        'Not the visual ones. Spacing, color, size, and type adjustments you make directly on an element are committed to a stylesheet of your own, and the AI leaves that file alone on later turns. Larger edits are made surgically to the files involved rather than by rewriting the whole project, and every turn is saved as a version you can restore if something drifts.',
                    ],
                },
                {
                    q: 'When is this UI builder a good fit?',
                    a: [
                        'Use it to build a responsive web interface you can try, customize, and publish: a dashboard, an onboarding flow, settings screens, or a complete web app. You edit by describing changes or selecting elements, and can add sign-in, saved data, or AI through Puter.',
                        'The output is HTML, CSS, and JavaScript. If your delivery requires editable Figma layers, framework components, or native mobile code, those are different output formats and require another workflow.',
                    ],
                },
                {
                    q: 'How much does it cost to run what I build?',
                    a: [
                        'Nothing. Hosting is included, and anything people use inside the interface, like sign-in, storage, or AI features, is covered by their own [Puter](' + LINKS.puter + ') account. There are no credits to watch and no surprise bill if it takes off. [How it works](' + LINKS.userPays + ').',
                    ],
                },
                {
                    q: 'Can my team collaborate?',
                    a: [
                        'Each project belongs to one [Puter](' + LINKS.puter + ') account, so building happens from one account at a time. You can share a private link to the work-in-progress preview so a teammate or client can look before anything is published, and duplicate a project to branch off a variation without touching the original.',
                        'The interface you build can be fully multi-user: people sign in with their own accounts, and shared data can live in a serverless worker so everyone sees the same thing.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Build your web and mobile UI',
            body: 'Describe the screens, refine the responsive layouts, and publish a working web interface. Free to start, hosting included.',
            label: 'Build my UI',
            href: buildLink(starterPrompt),
        },
    ],

    related: ['use-cases', 'ai-app-builder', 'ai-website-builder', 'guides/how-to-write-a-build-prompt'],
};
