// project-readme.js — the README.md every new project starts with.
//
// The same fixed text for every project, never written by the AI, so a
// project the user puts on GitHub (GitHub sync or a downloaded zip) says it
// was made with the builder and links back to it. versions.js adds it with a
// project's first version, so that version, the download and GitHub's first
// commit all carry it. A project that already has a readme of its own (an
// imported zip, a file the user made) keeps it, and a README the user deletes
// later stays deleted, since only the first version adds one.
//
// The links carry the badge's campaign (src/runtime.js) with their own source,
// so Plausible can count the visits that came through a README.
//
// Kept DOM-free so scripts/test-project-readme.mjs can run the production bytes.
(function () {
    'use strict';

    const FILE_NAME = 'README.md';

    const BUILDER_URL = 'https://builder.puter.com/?utm_source=puter-readme&utm_medium=readme&utm_campaign=created-with-puter';
    const PUTER_JS_URL = 'https://docs.puter.com/getting-started/';
    const WORKERS_URL = 'https://docs.puter.com/Workers/';

    const TEXT = `# Welcome to your AI Builder project

This project was built with [AI Builder by Puter](${BUILDER_URL}).

## Build with AI Builder

Open your project in [AI Builder](${BUILDER_URL}) and keep building.

- **Describe what you want.** AI Builder writes the code and shows the result in a live preview.
- **Publish it.** Put the project live at a free puter.site address, or on your own domain with a paid plan.
- **Backend included.** Sign-in, storage, databases, AI and serverless functions come from [Puter.js](${PUTER_JS_URL}), with no servers or API keys to set up.

## Development

Prefer working locally? The project is plain HTML, CSS and JavaScript with no build step, so any static file server runs it.

\`\`\`sh
git clone <this-repository-url>
cd <repository-name>
npx serve .
\`\`\`

Projects with a backend keep it in the \`workers/\` folder. Deploy those files to Puter as workers first, following the [Puter Workers docs](${WORKERS_URL}).

## Built with

- HTML, CSS and JavaScript
- [Puter.js](${PUTER_JS_URL}) for any sign-in, storage, database or AI features
`;

    // A top-level file GitHub would show as the repository's readme: README,
    // README.md, readme.txt, Readme.rst and so on. Any of them means the
    // project has its own, and the builder's is not added.
    function isReadmeName(name) {
        return /^readme(\.[^/]*)?$/i.test(String(name || ''));
    }

    // `items` is a readdir of the project's root folder.
    function hasReadme(items) {
        return Array.isArray(items) && items.some((it) => it && !it.is_dir && isReadmeName(it.name));
    }

    window.ProjectReadme = { FILE_NAME, TEXT, BUILDER_URL, isReadmeName, hasReadme };
})();
