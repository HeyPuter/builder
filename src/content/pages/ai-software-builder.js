import { buildLink, LINKS } from '../site.js';

export default {
    slug: 'ai-software-builder',
    parent: 'use-cases',
    updated: '2026-09-23',
    priority: 0.9,
    changefreq: 'weekly',
    navLabel: 'AI software builder',

    title: 'AI Software Builder - Build business software for free',
    description:
        'Build internal tools and business software with AI, no coding required. Sign-in, a database, storage, and hosting are included. Free with a Puter account, no lock-in.',
    ogTagline: 'Describe the tool. Run the business on it.',

    hero: {
        eyebrow: 'AI software builder',
        h1: 'AI software builder that turns a description into working business software',
        lead:
            'Describe the internal tool, portal, or workflow your team needs and Puter AI Builder writes it, runs it, and fixes its own errors. Sign-in, a database, and hosting are already there.',
        cta: { label: 'Start building', href: '/' },
        secondary: { label: 'Browse use cases', href: '/use-cases/' },
        note: 'Free with a [Puter](' + LINKS.puter + ') account. Runs in any modern browser, nothing to install.',
        screenshot: {
            src: '/screenshots/software.webp',
            alt: 'Build expense tracker software with Puter AI Builder',
        },
    },

    sections: [
        {
            type: 'grid',
            id: 'what-you-get',
            heading: 'What you get',
            intro:
                'The parts of business software that usually take a team to set up, already done.',
            items: [
                {
                    icon: 'lock',
                    title: 'Sign-in with no user table to build',
                    body:
                        'People sign in to your software with their [Puter](' + LINKS.puter + ') account. No password reset flow to write, no sessions to manage, and each person\'s data is kept under their own account from the first login.',
                },
                {
                    icon: 'database',
                    title: 'A database with no schema to design',
                    body:
                        'Records, settings, and files are stored through Puter.js the moment the software exists. There is no database server to provision, no migration to run, and no connection string to keep secret.',
                },
                {
                    icon: 'zap',
                    title: 'Shared data and automations',
                    body:
                        'When a tool needs state everyone sees, a webhook, scheduled work, or a small API, Puter AI Builder deploys a serverless worker from the same conversation. Multi-user software without a server of your own.',
                },
                {
                    icon: 'shieldCheck',
                    title: 'Runs clean before it reaches you',
                    body:
                        'Each change is loaded in the live preview and watched for runtime errors. Anything that throws goes back to the AI, which reads the file, repairs the cause, and re-verifies before the turn is reported as done.',
                },
                {
                    icon: 'download',
                    title: 'Standard files, no lock-in',
                    body:
                        'The output is plain HTML, CSS, and JavaScript with no build step. Download the whole project as a zip at any time and host it on any static host, or hand it to a developer to keep going.',
                },
                {
                    icon: 'users',
                    title: 'Free to run for a team of any size',
                    body:
                        'Everyone who uses your software covers their own storage and AI usage through their own [Puter](' + LINKS.puter + ') account, so ten users or ten thousand cost you the same: nothing. [How it works](' + LINKS.userPays + ').',
                },
            ],
        },

        {
            type: 'split',
            id: 'real-software',
            heading: 'Built like software, not a mockup',
            intro:
                'The gap between a generated screen and a tool a team relies on is auth, data, and reliability. These three close it.',
            items: [
                {
                    title: 'The backend is already running',
                    art: 'backend',
                    body: [
                        'Every project can call Puter.js for accounts, a key-value store, file storage, and AI models the moment it is created, already authenticated. The usual first week of setup does not happen.',
                        'For anything that has to live outside the browser, a serverless worker gives you shared state, webhooks, scheduled jobs, or a public API without renting or patching a server. Real-time features like screen sharing and live collaboration use Puter\'s peer-to-peer API.',
                    ],
                },
                {
                    title: 'Software that checks itself',
                    art: 'verify',
                    body: [
                        'A turn is not finished until the preview runs without errors. If a change breaks something, the AI sees the error, fixes the file that caused it, and runs it again before you ever look.',
                        'Every turn is also snapshotted with a note about what changed. Restore any earlier version in a click, and a safety snapshot is taken first so the restore itself can be undone.',
                    ],
                },
                {
                    title: 'Yours to take anywhere',
                    art: 'files',
                    body: [
                        'The project is a normal folder of web files. There is no proprietary runtime, no framework to learn, and no export wall between you and the code.',
                        'Keep it published on Puter, or download the zip and put it on your own hosting. Puter itself is [open source](' + LINKS.puterGithub + '), so the platform underneath is not a black box either.',
                    ],
                },
            ],
        },

        {
            type: 'steps',
            id: 'how-to',
            heading: 'How to build software with AI',
            intro: 'Four steps from a problem your team has to a tool that solves it.',
            schema: {
                name: 'How to build software with AI',
                description:
                    'Build working business software with sign-in, a database, and hosting from a plain-English description using the AI software builder at builder.puter.com.',
            },
            items: [
                {
                    title: 'Describe the workflow',
                    body:
                        'Say who uses the software, what they record, and what they need to see. Mention sign-in if more than one person will use it and shared data if everyone should see the same records.',
                },
                {
                    title: 'Let it build and check itself',
                    body:
                        'Puter AI Builder writes the screens, wires up storage and accounts, runs the result, and repairs any runtime error it finds. Longer builds show a plain-language checklist of what is done and what is left.',
                },
                {
                    title: 'Refine by pointing or asking',
                    body:
                        'Click the exact table, button, or field in the preview and say what should change, or ask in a sentence. Adjust spacing, colors, and type directly, and those edits stay put through later turns.',
                },
                {
                    title: 'Share it with the team',
                    body:
                        'Send a private draft link for feedback first, then press Publish to put it on its own address. Teammates sign in with their own accounts, and updates go live the moment you publish again.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'starters',
            heading: 'Software teams actually ask for',
            intro:
                'Pick one and Puter AI Builder makes it. Then describe how your business does it differently.',
            items: [
                {
                    title: 'IT helpdesk',
                    body: 'Tickets with priorities, assignment, and a shared queue for the whole team.',
                    prompt:
                        'Build an IT helpdesk where staff sign in with their Puter account to submit tickets with a title, description, and priority, and agents can assign tickets, change the status (Open, In progress, Resolved), and leave comments. Use a Puter serverless worker so every agent sees the same queue, and show open tickets by priority on a dashboard.',
                },
                {
                    title: 'Employee onboarding tracker',
                    body: 'Checklists per new hire, owners for each task, and a view of who is behind.',
                    prompt:
                        'Build an employee onboarding tracker where I create a checklist template of tasks with an owner and a due offset in days, start a new hire from the template with a start date, and see each hire\'s progress with overdue tasks highlighted. Save everything to my Puter account and let me export a hire\'s checklist as CSV.',
                },
                {
                    title: 'Expense approvals',
                    body: 'Submit, approve, reject, and see totals by month and category.',
                    prompt:
                        'Build an expense approval tool where employees sign in, submit an expense with an amount, category, date, and a receipt photo, and a manager sees a queue to approve or reject with a note. Store receipts as files in Puter, keep shared records in a Puter serverless worker, and show approved totals per month and per category.',
                },
                {
                    title: 'Client portal',
                    body: 'Each client sees only their own projects, files, and status updates.',
                    prompt:
                        'Build a client portal where I sign in as the admin to create projects, upload deliverables, and post status updates, and each client signs in with their own Puter account to see only their projects, download their files, and leave comments. Store files in Puter storage and shared project data in a serverless worker.',
                },
                {
                    title: 'Field inspection reports',
                    body: 'Photos, checklists, and an AI-written summary from a phone on site.',
                    prompt:
                        'Build a field inspection app for a phone where an inspector picks a site, works through a checklist with pass, fail, and notes per item, attaches photos, and gets an AI-generated summary of the issues found using Puter\'s vision model. Save reports to my Puter account and produce a clean printable report page for each inspection.',
                },
                {
                    title: 'Shift roster',
                    body: 'Weekly schedule, swap requests, and a view each person can check on their phone.',
                    prompt:
                        'Build a shift roster where a manager builds a weekly schedule by assigning staff to morning, afternoon, and night shifts, staff sign in to see their own week and request a swap, and the manager approves or declines swaps. Keep the schedule in a Puter serverless worker so everyone sees the current version, and make it easy to read on a phone.',
                },
            ],
        },

        {
            type: 'grid',
            id: 'fit',
            columns: 2,
            heading: 'What it is good for, and what it is not',
            intro:
                'An AI software builder is only useful if you know its edges before you start. Here are ours.',
            items: [
                {
                    icon: 'check',
                    title: 'A good fit',
                    body:
                        'Internal tools, trackers, approval workflows, client and member portals, dashboards over your own records, admin panels, and AI-assisted tools like summarizers and intake assistants. Anything a web page can do, with real sign-in and real storage behind it, and multi-user when you need it.',
                },
                {
                    icon: 'code',
                    title: 'Not the right tool',
                    body:
                        'Native iOS or Android binaries, desktop installers, and software that must run on your own servers. Everything built here is web software: it installs to a home screen like an app and the files can be hosted anywhere, but backend code runs as Puter workers, not on a machine you manage. It also does not process payments itself.',
                },
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'AI software builder FAQ',
            items: [
                {
                    q: 'What is an AI software builder?',
                    a: [
                        'An AI software builder takes a description of what a piece of software should do and produces the software itself: the screens, the data model, the logic, and the plumbing between them. Where an AI app builder tends to mean a single-purpose app, an AI software builder is expected to handle the things business software needs, such as sign-in for several people, records that persist, files, and workflows that move between users.',
                        'Puter AI Builder does this in the browser. You describe the tool, it writes the files, runs them in a live preview, checks them for errors, and connects them to accounts, storage, and a database through Puter.js. You refine the result by asking for changes or clicking the part that should be different, then publish it to its own address.',
                    ],
                },
                {
                    q: 'Can I build software without any coding knowledge?',
                    a: [
                        'Yes. The whole process happens in plain English, from the first description to publishing, and the builder fills in conventional choices where you have not specified something rather than leaving you a skeleton. If a request is genuinely ambiguous, you get at most one short round of product questions with suggested answers, never technical ones.',
                        'You do not need to read the code, but you can. It is standard HTML, CSS, and JavaScript, so a developer can pick it up later without learning a platform.',
                    ],
                },
                {
                    q: 'What kinds of software can I build with it?',
                    a: [
                        'The software small teams keep needing and rarely get built: ticketing and helpdesks, approval workflows, onboarding and compliance trackers, client portals, CRMs, inventory and asset registers, scheduling, dashboards, admin panels, and internal knowledge tools.',
                        'Because the software can use Puter\'s accounts, storage, AI models, workers, and peer-to-peer connections, it can be multi-user, include AI features like summarizing or classifying records, and support real-time collaboration, all without a separate backend project.',
                    ],
                },
                {
                    q: 'Is it real software or just a prototype?',
                    a: [
                        'Real software. The preview is the actual program running, not a rendering: people can sign in, save records, upload files, and come back tomorrow to find their data. Publishing puts the same files on a public address with HTTPS handled for you.',
                        'What makes it more than a prototype is what is behind it. Each person\'s data is stored under their own [Puter](' + LINKS.puter + ') account, shared data lives in a serverless worker, and every change is verified before it is handed back. What it is not is a substitute for a review: for anything that handles money, health information, or other people\'s personal data, read what was built before you rely on it.',
                    ],
                },
                {
                    q: 'Is there a free AI software builder? What is the catch?',
                    a: [
                        'Puter AI Builder is free to use with a [Puter](' + LINKS.puter + ') account, no card required, and publishing is free too. There is no credit meter to watch while you iterate.',
                        'The honest limits: very heavy use can reach the free tier\'s limits, at which point you can upgrade your Puter account, and the people who use what you build bring their own Puter account for the storage and AI they consume. Ordinary building, publishing, and iterating do not run into either.',
                    ],
                },
                {
                    q: 'How much does it cost to run for my team?',
                    a: [
                        'Nothing, at any size. Each person using your software covers their own storage and AI usage through their own [Puter](' + LINKS.puter + ') account, so there is no per-seat fee and no bill that grows with adoption. [How the user-pays model works](' + LINKS.userPays + ').',
                    ],
                },
                {
                    q: 'How do several people use the same software with shared data?',
                    a: [
                        'Say so in the prompt. Sign-in comes from Puter accounts, so every user has their own identity with nothing for you to manage. Data that belongs to one person, like their settings or drafts, is stored under their account automatically.',
                        'Data everyone should see, like a shared ticket queue or a schedule, goes in a serverless worker that Puter AI Builder deploys from the same conversation. Ask for roles, such as an admin who can create projects and clients who can only see their own, and it is written into the logic.',
                    ],
                },
                {
                    q: 'What happens when the AI gets it wrong?',
                    a: [
                        'Runtime errors are mostly caught before you see them: after each change the preview is reloaded and watched, and anything it throws is sent back to the AI to fix and re-verify. A turn is not reported as done until the software runs clean.',
                        'When the logic is wrong rather than broken, tell it in a sentence or click the element that misbehaves and describe the fix. If a change made things worse, restore the previous version from history and take a different run at it. Restores are themselves undoable.',
                    ],
                },
                {
                    q: 'Can I change something small after it is built?',
                    a: [
                        'Yes, and small changes are the easy case. Click the field, column, or button in the preview and say what should be different, so you never have to explain which of four similar cards you mean. For spacing, colors, size, and type, adjust them directly on the element and the result is committed to a stylesheet the AI leaves alone on later turns.',
                    ],
                },
                {
                    q: 'Can my team build it with me?',
                    a: [
                        'The project itself belongs to one [Puter](' + LINKS.puter + ') account, so building happens from one account at a time rather than as simultaneous editing. You can share a private draft link so colleagues can try the work in progress before anything is public, and duplicate a project to branch off a variation.',
                        'The software you build is a different matter: it can be fully multi-user, with teammates and clients signing in with their own accounts and shared records in a worker.',
                    ],
                },
                {
                    q: 'Do I own the code, and can I move it to my own codebase or hosting?',
                    a: [
                        'Yes. Everything generated is yours, with no license to renew and no export wall. Download the whole project as a zip whenever you like. It is plain web files with no build step, so it runs on any static host or straight off a disk, and a developer can continue in an ordinary editor.',
                        'Calls to accounts, storage, and AI go through Puter.js, which keeps working from any host. Worker code runs on Puter rather than on a server you operate, which is the one part that is not lift-and-shift.',
                    ],
                },
                {
                    q: 'Can it build desktop software or native mobile apps?',
                    a: [
                        'No. Puter AI Builder produces web software only. It does not output a desktop installer or an iOS or Android binary, and it does not publish to app stores.',
                        'What you get instead is closer than it sounds: every project ships with a web manifest and icon set, so it installs to a phone home screen or a desktop and opens full screen like an installed app, with updates live for everyone the moment you publish.',
                    ],
                },
                {
                    q: 'Can it connect to my spreadsheets, existing tools, or APIs?',
                    a: [
                        'You can attach CSVs, PDFs, images, and text files, and they are saved into the project for the builder to read and import, so starting from an existing spreadsheet export is straightforward. There is no directory of ready-made integrations or a live sync with a spreadsheet, so do not expect a one-click connector.',
                        'For two-way connections, a serverless worker can receive webhooks and expose an API, and the software can call outside services the way any web software does. Describe the service and what should happen, and treat the result as a first draft to test against the real thing.',
                    ],
                },
                {
                    q: 'Is it secure enough for business data?',
                    a: [
                        'The defaults keep the risk small. Published software is served over HTTPS with the certificate handled for you, there is no server of your own to patch, and each person\'s data lives under their own [Puter](' + LINKS.puter + ') account, so users only touch what is theirs unless you deliberately share it through a worker.',
                        'What the builder does not do is audit your requirements for you. If your organization needs specific compliance guarantees, check Puter\'s current terms and documentation against them, and review the generated logic around permissions before you roll it out.',
                    ],
                },
                {
                    q: 'Do AI software builders replace developers?',
                    a: [
                        'For the long tail of internal tools that never justified a developer\'s time, yes, in the sense that the tool gets built at all. For software with strict compliance needs, unusual integrations, or heavy custom infrastructure, a developer is still the right call, and the export makes handing off easy.',
                        'The practical shift is that the person who understands the workflow can now build the first working version themselves, and a developer, if one is involved at all, starts from running software rather than from a document.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Build the tool your team keeps asking for',
            body: 'Describe it, and get working software with sign-in, a database, and hosting. Free to build, free to run.',
            label: 'Start building',
            href: buildLink(''),
        },
    ],

    related: ['use-cases', 'ai-app-builder', 'ai-website-builder', 'what-to-build'],
};
