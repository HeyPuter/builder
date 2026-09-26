import { buildLink, LINKS } from '../site.js';

export default {
    slug: 'features',
    updated: '2026-08-15',
    priority: 0.7,
    changefreq: 'monthly',
    navLabel: 'Features',

    title: 'Features: Live Preview, Self-Repair, Publishing | Puter Builder',
    description:
        'Everything the Puter AI builder does: a self-verifying live preview, click-to-edit, visual style edits, version history, one-click publishing, and a cloud backend.',
    ogTagline: 'Everything the builder does',

    hero: {
        eyebrow: 'Features',
        h1: 'Everything the builder does',
        lead:
            'A complete list, without the marketing adjectives. If something here matters to you, it works today; if a capability is missing from this page, assume it does not exist yet.',
        cta: { label: 'Start building', href: '/' },
        secondary: { label: 'See what to build', href: '/what-to-build/' },
    },

    sections: [
        {
            type: 'grid',
            id: 'building',
            heading: 'Building',
            items: [
                {
                    icon: 'wand',
                    title: 'Plain-language builds',
                    body:
                        'Describe an app or a site and get a complete first version: files, layout, logic, and sensible default content. Underspecified requests are filled in with conventional choices rather than left as a skeleton.',
                },
                {
                    icon: 'chat',
                    title: 'Clarifying questions, at most once',
                    body:
                        'If a request leaves something genuinely open, you get one short round of up to three product questions with suggested answers. They are never about technology, and skipping them is always allowed.',
                },
                {
                    icon: 'check',
                    title: 'A progress checklist',
                    body:
                        'Longer builds show a live checklist in plain language, so you can see what is being worked on and what is left instead of watching an opaque spinner.',
                },
                {
                    icon: 'folder',
                    title: 'Attachments',
                    body:
                        'Drop in images, a logo, PDFs, CSVs, or text files. They are saved into the project and referenced by path, and the builder reads the ones it actually needs to see.',
                },
                {
                    icon: 'file',
                    title: 'Multi-file projects',
                    body:
                        'Anything beyond a single page is split into separate files and folders, edited surgically rather than rewritten wholesale, so later changes stay fast as the project grows.',
                },
                {
                    icon: 'sparkles',
                    title: 'Follow-up suggestions',
                    body:
                        'Each turn ends with a few specific next steps for your app in particular, based on what it already has. Tap one to send it, or ignore them entirely.',
                },
            ],
        },

        {
            type: 'grid',
            id: 'preview',
            heading: 'The preview, and editing what you see',
            items: [
                {
                    icon: 'eye',
                    title: 'Live preview',
                    body:
                        'The app runs beside the conversation and reloads with every change. It is the real app, not a rendering: you can click through it, type into it, and use it exactly as a visitor would.',
                },
                {
                    icon: 'shieldCheck',
                    title: 'Automatic error repair',
                    body:
                        'After each change the preview is reloaded and watched for runtime errors. Anything it throws goes back to the AI, which reads the file that broke, fixes the cause, and re-verifies. A turn is not reported as done until the app runs clean.',
                },
                {
                    icon: 'cursor',
                    title: 'Click to edit',
                    body:
                        'Arm the element picker, click any element in the running app, and describe what should change about that specific piece. No more explaining which of the four cards you mean.',
                },
                {
                    icon: 'sliders',
                    title: 'Direct visual edits',
                    body:
                        'Adjust spacing, color, size, and type on a selected element and watch it update live. Apply commits the result to a stylesheet of your own, which the AI leaves alone on later turns.',
                },
                {
                    icon: 'history',
                    title: 'Version history',
                    body:
                        'Every turn is snapshotted with a short description of what changed. Restore any earlier version in a click, and a safety snapshot is taken before a restore so the restore itself is undoable.',
                },
                {
                    icon: 'layout',
                    title: 'Responsive checking',
                    body:
                        'Resize the preview to see the app at any width, and ask for changes that apply to one width in particular.',
                },
            ],
        },

        {
            type: 'grid',
            id: 'shipping',
            heading: 'Shipping',
            items: [
                {
                    icon: 'globe',
                    title: 'One-click publishing',
                    body:
                        'Publish puts the app on its own public address on puter.site. No hosting account, no deploy pipeline, no build to wait on. Unpublishing is equally immediate.',
                },
                {
                    icon: 'link',
                    title: 'Private draft links',
                    body:
                        'Share a link to the work-in-progress preview without making anything public, so a client or a friend can look at it before you decide to publish.',
                },
                {
                    icon: 'phone',
                    title: 'Installable apps',
                    body:
                        'A web manifest and a complete icon set are generated for every app from its own title, colors, and icon, so anyone can install it to a home screen and launch it full screen.',
                },
                {
                    icon: 'download',
                    title: 'Download the project',
                    body:
                        'Export the whole project as a zip whenever you want. It is standard HTML, CSS, and JavaScript with no build step, so it will run on any static host, or straight off your disk.',
                },
                {
                    icon: 'refresh',
                    title: 'Duplicate a project',
                    body:
                        'Copy a project to branch off a variation, keeping the original intact. The copy gets its own preview, its own history, and its own publishing.',
                },
                {
                    icon: 'search',
                    title: 'Project management',
                    body:
                        'Rename, search, and organize your projects in a sidebar, with a screenshot of each so you can find the one you mean at a glance.',
                },
            ],
        },

        {
            type: 'grid',
            id: 'backend',
            columns: 2,
            heading: 'What your app can use',
            intro:
                'Apps built here can call Puter.js, so the usual backend checklist is already done and already authenticated. See the [Puter.js documentation](' + LINKS.docs + ') for the full API.',
            items: [
                {
                    icon: 'database',
                    title: 'Key-value storage',
                    body: 'Per-user records, settings, and app state, with no schema to define and no database to run.',
                },
                {
                    icon: 'folder',
                    title: 'File storage',
                    body: 'Real files: uploads, exports, generated images, documents, all stored under each user\'s own account.',
                },
                {
                    icon: 'lock',
                    title: 'Authentication',
                    body: 'Sign-in with Puter accounts. No user table, no session handling, no password reset flow to write.',
                },
                {
                    icon: 'sparkles',
                    title: 'AI models',
                    body: 'Chat, vision, and image generation callable from inside the app you built, without holding a provider key.',
                },
                {
                    icon: 'zap',
                    title: 'Serverless workers',
                    body: 'Deploy backend code from the same conversation for shared state, webhooks, scheduled work, or a public API.',
                },
                {
                    icon: 'users',
                    title: 'Peer-to-peer',
                    body: 'Video and voice chat, screen sharing, multiplayer, and live collaboration without running signalling infrastructure.',
                },
                {
                    icon: 'globe',
                    title: 'Hosting',
                    body: 'Static hosting on puter.site for both the draft preview and the published site.',
                },
                {
                    icon: 'receipt',
                    title: 'The user-pays model',
                    body: 'Each person using your app brings their own account for the storage and AI they consume, so your costs do not scale with other people\'s usage. [How it works](' + LINKS.userPays + ').',
                },
            ],
        },

        {
            type: 'grid',
            id: 'platform',
            heading: 'The builder itself',
            items: [
                {
                    icon: 'globe',
                    title: 'Runs in the browser',
                    body:
                        'Nothing to install and nothing to keep updated. Open a tab and start, on macOS, Windows, Linux, ChromeOS, or a phone.',
                },
                {
                    icon: 'phone',
                    title: 'Works on mobile',
                    body:
                        'On phones the chat and preview become two views you switch between, with the toolbar adapting to the space. Long builds keep running while the screen is on.',
                },
                {
                    icon: 'refresh',
                    title: 'Survives interruptions',
                    body:
                        'A build interrupted by a dropped connection or a suspended tab resumes rather than dying, and transient failures are retried automatically without you losing the turn.',
                },
                {
                    icon: 'download',
                    title: 'Installable itself',
                    body:
                        'The builder is a progressive web app: install it and it opens like a desktop application, with the shell available even before the network is.',
                },
                {
                    icon: 'sliders',
                    title: 'Light and dark',
                    body:
                        'A proper dark theme throughout, following your system setting by default and overridable per device.',
                },
                {
                    icon: 'code',
                    title: 'Built on open source',
                    body:
                        'The builder runs on [Puter, which is open source](' + LINKS.puterGithub + '), and the apps it makes are standard web files with no proprietary runtime. Nothing you build here depends on a format only this tool can read.',
                },
            ],
        },

        {
            type: 'cta',
            heading: 'The feature list is shorter than the thing it describes',
            body: 'Two minutes with the builder tells you more than this page can. For what each feature is for and how to compare builders on them, read [the main features of an AI app builder](/guides/main-features-of-an-ai-app-builder/).',
            label: 'Open the builder',
            href: buildLink(''),
        },
    ],

    related: ['ai-app-builder', 'ai-website-builder', 'guides/main-features-of-an-ai-app-builder', 'what-to-build', 'guides'],
};
