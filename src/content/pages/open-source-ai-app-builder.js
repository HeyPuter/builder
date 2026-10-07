import { buildLink, LINKS } from '../site.js';

// Running the interface locally still uses Puter's hosted services by default.
const starterPrompt = 'Build a responsive project tracker with projects, tasks, due dates, and a kanban board. Save my data to my Puter account, add search and filters, and include a CSV export button.';
const builderLicense = LINKS.builderGithub + '/blob/main/LICENSE';
const builderSetup = LINKS.builderGithub + '#getting-started';
const puterSelfHosting = LINKS.puterGithub + '/blob/main/doc/self-hosting.md';
const puterLocalSetup = LINKS.puterGithub + '#-local-development';
const puterOllamaSetup = puterSelfHosting + '#optional-local-llm-ollama';

export default {
    slug: 'open-source-ai-app-builder',
    updated: '2026-10-07',
    priority: 0.9,
    changefreq: 'weekly',
    navLabel: 'Open source',

    title: 'Open Source AI App Builder | Puter',
    description:
        'Build apps with an open source AI app builder. Use Puter free in your browser, fork the Apache 2.0 code, run the interface locally, and export your web apps.',
    ogTagline: 'Build an app. Own the files. Fork the builder.',

    hero: {
        eyebrow: 'Open source AI app builder',
        h1: 'Open source AI app builder',
        lead:
            'Puter AI Builder is open source. Build online, self-host it, or fork the code to make it your own.',
        cta: { label: 'Start building free', href: buildLink(starterPrompt) },
        secondary: { label: 'View on GitHub', href: LINKS.builderGithub },
        note: '[Apache 2.0 licensed](' + builderLicense + ').',
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
                    body: 'Fork the [GitHub repository](' + LINKS.builderGithub + ') to customize the builder or contribute changes. Released under [Apache 2.0](' + builderLicense + ').',
                },
                {
                    icon: 'chat',
                    title: 'Turn a prompt into a working app',
                    body: 'Describe your app. The AI writes HTML, CSS, and JavaScript with a live preview and runtime error checks.',
                },
                {
                    icon: 'database',
                    title: 'Backend services included',
                    body: '[Puter.js](' + LINKS.puterJs + ') provides sign-in, storage, a database, AI, and serverless workers. No API keys needed.',
                },
                {
                    icon: 'cursor',
                    title: 'Edit the preview and restore versions',
                    body: 'Select an element in the preview and describe your changes. Restore a saved version whenever you need.',
                },
                {
                    icon: 'download',
                    title: 'Export your code',
                    body: 'Download your project as a zip. Edit the code in your own editor or host the frontend elsewhere.',
                },
                {
                    icon: 'globe',
                    title: 'Publish and extend from one place',
                    body: 'Publish to a public URL on Puter, and connect remote MCP servers to add tools from other services.',
                },
            ],
        },

        {
            type: 'steps',
            id: 'run-locally',
            heading: 'Run the open source builder locally',
            intro: 'You need Git, Node.js, and npm. These are the same setup commands used in the [repository README](' + builderSetup + ').',
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
                    body: 'Use your Puter account for the default AI and cloud services. You can now change the interface and prompts in your copy. See the [README](' + builderSetup + ') for setup and the [Puter.js docs](' + LINKS.docs + ') for service integration.',
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
                    body: 'Clone the [repository](' + LINKS.builderGithub + ') to develop the interface on your computer. Build the frontend for your own static host with `npm run build`. The default integration still needs an internet connection and a Puter account; this does not install an offline model or a local backend.',
                },
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'Open source AI app builder FAQ',
            items: [
                {
                    q: 'Is Puter AI Builder really open source?',
                    a: ['Yes. The [builder repository](' + LINKS.builderGithub + ') is public and released under [Apache License 2.0](' + builderLicense + '). You can inspect the source, fork it, and contribute changes.'],
                },
                {
                    q: 'Can I self-host the builder without bringing my own API key?',
                    a: ['Yes. You can [run the builder locally](' + builderSetup + ') or host it on your own server. By default, it connects to Puter for AI and cloud services. Puter provides access to AI models at cost, with no markup and no need to bring your own key (BYOK). You only need a [Puter account](' + LINKS.puter + ').'],
                },
                {
                    q: 'Can I self-host Puter too for full control?',
                    a: ['Yes. [Puter itself is open source](' + LINKS.puterGithub + ') and can run on your own server or locally on your computer. Configure your self-hosted builder to connect to your own Puter instance, and you can manage the backend, accounts, data, and AI providers yourself.',
                        'The [Puter self-hosting guide](' + puterSelfHosting + ') explains the setup, including where to add your own provider API keys.'],
                },
                {
                    q: 'Can I use my own API keys or local AI models?',
                    a: ['Yes. With your own Puter instance, you can [add your provider API keys](' + puterSelfHosting + '#ai-providers) and configure the builder to use the models you choose. Self-hosted Puter also [supports Ollama](' + puterOllamaSetup + '), so you can run models on your own computer and configure the builder to use them.',
                        'To use local models, point the builder at your local Puter instance and update its configured AI models to your Ollama models.'],
                },
                {
                    q: 'Is it free, and what costs should I expect?',
                    a: ['The source is free to download, and the hosted builder is free to start with a Puter account. Puter provides AI at cost, with no markup. Usage counts toward your account\'s free allowance, and you can upgrade when you need more. You do not need to supply your own model API keys.',
                        'Published apps use the [user-pays model](' + LINKS.userPays + '): each user\'s Puter account covers the resources they consume. If you self-host Puter, you manage your own hosting and any provider API charges; local models run on your own hardware.'],
                },
                {
                    q: 'Do I own the generated code, and can I move it elsewhere?',
                    a: ['Your generated project files are yours to download and edit. Export the zip to keep developing in your own editor or host the frontend elsewhere. Puter.js calls continue to use Puter, and serverless workers run there; moving those parts to a different backend requires integration changes.'],
                },
                {
                    q: 'Can I use the builder for commercial projects?',
                    a: ['Yes. The builder is available under Apache 2.0, which permits commercial use under its terms. Read the [license](' + builderLicense + ') and third-party notices when redistributing a fork. Services your app connects to have their own terms and usage limits.'],
                },
                {
                    q: 'How can I keep my data on my own device?',
                    a: ['Run the [builder](' + builderSetup + '), [Puter](' + puterLocalSetup + '), and [Ollama](https://docs.ollama.com/quickstart) locally to keep your data on your own device. Connect the builder to your local Puter instance and configure it to use your [Ollama models](' + puterOllamaSetup + ') for AI.'],
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
