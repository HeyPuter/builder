import { buildLink, LINKS } from '../site.js';

// Topic coverage and Google result order: research/open-source-ai-app-builder-serp.json.
// Running the interface locally still uses Puter's hosted services by default.
const starterPrompt = 'Build a responsive project tracker with projects, tasks, due dates, and a kanban board. Save my data to my Puter account, add search and filters, and include a CSV export button.';
const builderLicense = LINKS.builderGithub + '/blob/main/LICENSE';

export default {
    slug: 'open-source-ai-app-builder',
    updated: '2026-10-07',
    priority: 0.9,
    changefreq: 'weekly',
    navLabel: 'Open source',

    title: 'Open Source AI App Builder - Build, Fork & Export | Puter',
    description:
        'Build apps with an open source AI app builder. Use Puter free in your browser, fork the Apache 2.0 code, run the interface locally, and export your web apps.',
    ogTagline: 'Build an app. Own the files. Fork the builder.',

    hero: {
        eyebrow: 'Open source AI app builder',
        h1: 'Open source AI app builder you can make your own',
        lead:
            'Describe an app and get a working version with a live preview, backend services, and publishing. Puter AI Builder is open source: use it in your browser, inspect the code on GitHub, or fork it to build your own version.',
        cta: { label: 'Start building free', href: buildLink(starterPrompt) },
        secondary: { label: 'View on GitHub', href: LINKS.builderGithub },
        note: '[Apache 2.0 licensed](' + builderLicense + '). Free to start with a [Puter](' + LINKS.puter + ') account. Local setup uses Puter cloud services by default.',
        screenshot: {
            src: '/screenshots/software.webp',
            alt: 'Puter AI Builder with a working web app in the live preview',
        },
    },

    sections: [
        {
            type: 'grid',
            id: 'what-you-get',
            heading: 'Build with AI, keep control of the code',
            intro: 'For founders who want a first app, developers who want an editable starting point, and teams who want to adapt the builder itself.',
            items: [
                {
                    icon: 'code',
                    title: 'A public codebase you can fork',
                    body: 'Read how the builder works, change its interface or prompts, and contribute improvements through the [public GitHub repository](' + LINKS.builderGithub + '). The Apache 2.0 license gives you a starting point for your own version.',
                },
                {
                    icon: 'chat',
                    title: 'Turn a prompt into a working app',
                    body: 'Explain the screens and workflow you need. The AI writes HTML, CSS, and JavaScript, runs the preview, and checks for runtime errors. Keep refining the result in plain language without needing to write the first version yourself.',
                },
                {
                    icon: 'database',
                    title: 'Backend services included',
                    body: 'Use Puter.js for sign-in, storage, a key-value database, AI features, and serverless workers. A tracker can save records and an AI assistant can answer questions without provisioning a separate server or managing model API keys.',
                },
                {
                    icon: 'cursor',
                    title: 'Edit the preview and restore versions',
                    body: 'Select a button, card, or heading in the live preview and describe the change. Saved versions let you restore an earlier result when an experiment takes the app in the wrong direction.',
                },
                {
                    icon: 'download',
                    title: 'Export ordinary web files',
                    body: 'Download your project as a zip, open it in your editor, or give it to a developer. You can host the frontend elsewhere; calls to Puter services still use Puter unless you replace those integrations.',
                },
                {
                    icon: 'globe',
                    title: 'Publish and extend from one place',
                    body: 'Publish to a public URL with hosting included. Connect remote MCP servers to give the builder access to tools from other services, or adapt the source when your workflow needs a deeper change.',
                },
            ],
        },

        {
            type: 'prose',
            id: 'what-is-open-source',
            heading: 'What is an open source AI app builder?',
            body: [
                'An open source AI app builder turns a natural-language description into an app and publishes its own source under a license that allows people to inspect, modify, and redistribute it. You can change the software doing the building as well as the app it generates.',
                'Code export and open source answer different questions. Export tells you whether you can take your generated app away. A public repository and its license tell you whether you can inspect and adapt the builder. Puter AI Builder offers both: downloadable projects and an [Apache-licensed builder codebase](' + LINKS.builderGithub + ').',
                'Open source also does not mean every service runs on your machine. Check where generation happens, where data is stored, and what runs after you publish. With the default Puter setup, the interface can run locally while AI, accounts, storage, and workers use Puter services.',
            ],
        },

        {
            type: 'steps',
            id: 'how-to-build',
            heading: 'How to build an app with open source AI',
            intro: 'Start in the browser. You can explore the source or set up a fork whenever you need it.',
            schema: {
                name: 'How to build an app with Puter AI Builder',
                description: 'Describe, preview, refine, and publish a web app using the open source AI app builder at builder.puter.com.',
            },
            items: [
                {
                    title: 'Describe one useful workflow',
                    body: 'Open the builder and sign in with Puter. Say who the app is for, what users should do, and what it should save. Start with a small workflow such as adding a task, updating its status, and seeing a summary.',
                },
                {
                    title: 'Try the generated app',
                    body: 'Use the live preview to test buttons, forms, and navigation. If the app saves data, add a record and reload to check that it remains. Ask for corrections as you go.',
                },
                {
                    title: 'Refine the design and behavior',
                    body: 'Ask for another feature or select an element in the preview to change it. Check the layout on a phone as well as a desktop, and restore a saved version if you want to try a different approach.',
                },
                {
                    title: 'Publish or download the files',
                    body: 'Press Publish for a shareable link, or download the project as a zip to continue in your own editor. Review any backend dependencies before moving the app to another host.',
                },
            ],
        },

        {
            type: 'grid',
            id: 'hosted-or-local',
            heading: 'Use the hosted builder or run your own interface',
            columns: 2,
            items: [
                {
                    icon: 'globe',
                    title: 'Start online with no installation',
                    body: 'The [hosted builder](/) runs in a modern browser, including on a phone. Sign in, describe your app, and build with Puter services already connected. This is the quickest route to a first published app.',
                },
                {
                    icon: 'code',
                    title: 'Run a local copy or host a fork',
                    body: 'Clone the repository to develop the interface on your computer. Build the frontend for your own static host with `npm run build`. The default integration still needs an internet connection and a Puter account; this does not install an offline model or a local backend.',
                },
            ],
        },

        {
            type: 'steps',
            id: 'run-locally',
            heading: 'Run the open source builder locally',
            intro: 'You need Git, Node.js, and npm. These are the same setup commands used in the repository README.',
            items: [
                {
                    title: 'Clone the repository',
                    body: '`git clone https://github.com/HeyPuter/builder` downloads the builder source to your computer.',
                },
                {
                    title: 'Install dependencies',
                    body: 'Run `cd builder`, then `npm install` inside the project folder.',
                },
                {
                    title: 'Start the development server',
                    body: 'Run `npm run dev` and open the localhost URL printed in your terminal.',
                },
                {
                    title: 'Sign in and build',
                    body: 'Use your Puter account for the default AI and cloud services. You can now change the interface and prompts in your copy. See the [README](' + LINKS.builderGithub + '#getting-started) for setup and the [Puter.js docs](' + LINKS.docs + ') for service integration.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'starter-projects',
            heading: 'Start with an app you can use today',
            intro: 'Try a small app, inspect the output, and build on it. Each prompt opens in the builder ready to edit.',
            items: [
                {
                    title: 'Project tracker',
                    body: 'Tasks, due dates, a kanban board, and an export of your records.',
                    prompt: starterPrompt,
                },
                {
                    title: 'AI study assistant',
                    body: 'Turn notes into flashcards and quizzes, with decks saved between visits.',
                    prompt: 'Build a study assistant where I paste notes and use Puter AI to generate flashcards and a multiple-choice quiz. Let me review wrong answers, save decks to my Puter account, and download a deck as JSON. Make it responsive on phones.',
                },
                {
                    title: 'Business website',
                    body: 'A responsive site with services, project examples, and clear contact details.',
                    prompt: 'Build a responsive website for a freelance design studio with a home page, services, project gallery, and contact page. Use placeholder copy and images I can replace. Include page titles, meta descriptions, and accessible navigation.',
                },
            ],
        },

        {
            type: 'grid',
            id: 'choose-a-builder',
            heading: 'Which kind of open source builder fits your project?',
            intro: 'Start with the workflow and where you want the software to run. Different tools solve different parts of building an app.',
            columns: 2,
            items: [
                {
                    icon: 'chat',
                    title: 'Puter: browser building with managed services',
                    body: 'Choose Puter AI Builder when you want to describe a web app, try it in a preview, and publish with accounts, storage, and AI available. You can fork the builder and export the app; the default backend uses Puter.',
                },
                {
                    icon: 'code',
                    title: 'Dyad: a local desktop workflow',
                    body: '[Dyad](https://www.dyad.sh/) runs on your desktop and supports your own model keys and local models. It suits people who want their project files on their computer and want to choose the model used for generation.',
                },
                {
                    icon: 'sliders',
                    title: 'bolt.diy: choose your model provider',
                    body: '[bolt.diy](https://github.com/stackblitz-labs/bolt.diy) offers an open source prompt, preview, and code-editing workflow with multiple providers, including Ollama. Check its setup instructions if choosing your own inference provider is central to your project.',
                },
                {
                    icon: 'briefcase',
                    title: 'ToolJet: internal tools over existing data',
                    body: '[ToolJet](https://tooljet.com/) focuses on internal apps, database connections, and a visual builder, with a self-hosted option. It is a different starting point from generating standalone web files for a customer-facing app.',
                },
            ],
            after: ['For a broader look at hosted options, read our [AI app builder comparison](/best-ai-app-builder/).'],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'Open source AI app builder FAQ',
            items: [
                {
                    q: 'Is Puter AI Builder really open source?',
                    a: ['Yes. The [builder repository](' + LINKS.builderGithub + ') is public and released under [Apache License 2.0](' + builderLicense + '). You can inspect the source, fork it, and contribute changes. Bundled third-party libraries and fonts have their own licenses, listed in the repository.'],
                },
                {
                    q: 'Is it free, and what costs should I expect?',
                    a: ['The source is free to download, and the hosted builder is free to start with a Puter account. AI and cloud usage have account allowances; heavy use can require an upgrade. Running your own frontend can also incur costs from your hosting provider.',
                        'Published apps use the [user-pays model](' + LINKS.userPays + '): each user\'s Puter account covers the resources they consume. When you use your own app, your usage belongs to your account too. Open source does not mean unlimited free inference.'],
                },
                {
                    q: 'Can I self-host it and work completely offline?',
                    a: ['You can run the interface locally or host a built copy on your own server. The default setup still connects to Puter for AI, authentication, storage, and other services, so it needs internet access. A fully offline setup would require changing those integrations and supplying your own runtime and model.'],
                },
                {
                    q: 'Can I choose an AI model or bring my own API keys?',
                    a: ['The hosted builder uses a configured coding model through Puter, with no model API key required from you. It does not have a built-in provider picker for local models such as Ollama. Developers can adapt the AI integration in a fork; tools such as Dyad or bolt.diy offer provider selection as part of their existing workflow.'],
                },
                {
                    q: 'Do I own the generated code, and can I move it elsewhere?',
                    a: ['Your generated project files are yours to download and edit. Export the zip to keep developing in an ordinary editor or host the frontend elsewhere. Puter.js calls continue to use Puter, and serverless workers run there; moving those parts to a different backend requires integration changes.'],
                },
                {
                    q: 'Can I use the builder for commercial projects?',
                    a: ['Yes. The builder is available under Apache 2.0, which permits commercial use under its terms. Read the [license](' + builderLicense + ') and third-party notices when redistributing a fork. Services your app connects to have their own terms and usage limits.'],
                },
                {
                    q: 'Does running it locally keep all my data on my device?',
                    a: ['Running the interface locally changes where the frontend is served. In the default setup, prompts go to Puter\'s AI service and project files and app data can use Puter cloud storage. Open source lets you inspect those connections; it does not make the default workflow local-only.'],
                },
                {
                    q: 'What kinds of apps and websites can I build?',
                    a: ['Build responsive web apps such as trackers, dashboards, forms, prototypes, and tools with AI features. It also works as an [AI website builder](/ai-website-builder/) for business sites, portfolios, and landing pages. The output is web software; it does not generate native iOS or Android binaries.'],
                },
                {
                    q: 'Do I need to code, and is the result ready for real users?',
                    a: ['You can build and publish through conversation without coding. Running a fork or replacing a backend needs development skills. The builder checks for runtime errors, but you should still test the workflow, saved data, permissions, and connected services before inviting real users.'],
                },
                {
                    q: 'How is an open source builder different from an open source AI model?',
                    a: ['The builder is the software that turns your instructions into files, previews, and deployments. The model is the system generating the code. An open source builder can use a hosted model, a local model, or both, depending on its integrations. Puter AI Builder uses hosted AI through Puter by default.'],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Build your first app, then make it yours',
            body: 'Start free in the browser. Export the project, inspect the source, or fork the builder when you want to go further.',
            label: 'Start building free',
            href: buildLink(starterPrompt),
        },
    ],

    related: ['ai-app-builder', 'ai-website-builder', 'ai-software-builder', 'best-ai-app-builder', 'guides/how-to-write-a-build-prompt'],
};
