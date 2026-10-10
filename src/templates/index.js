// The official project templates, in the order they are shown.
//
// Each template is a folder here:
//   <slug>/template.js     the metadata below (data only, no Node APIs, so the
//                          page registry and the tests can import it)
//   <slug>/files/          the app itself, copied verbatim into every fork
//   <slug>/screenshot.png  a 1280x800 capture of the app, for its card and page
//
// template.js shape:
//   slug         the folder name, and /templates/<slug>/
//   name         shown on the card, the page and as the new project's title
//   category     short tag on the card ("App", "Website")
//   description  one line for the card and the dialog
//   updated      ISO date, for the page and the sitemap
//   workers      names of the serverless workers the template ships, each at
//                files/workers/<name>.js. The frontend refers to one only as
//                {{WORKER_URL:<name>}}; a fork deploys its own and swaps in
//                the URL (see js/template-core.js).
//   suggestions  the "what next?" chips a fresh fork opens with
//   instructions optional rules for the model, in plain text, added to every
//                fork's system prompt so they hold through the user's later
//                changes (TemplateCore.buildTemplateNote). Max 2000 chars.
//   page         copy for the static page (see src/content/templates.js)
//
// Adding a template is: create the folder, import it here, and add it to the
// array. The build validates it (scripts/build-templates.mjs), ships its files
// and index entry, and renders its page; test-templates.mjs checks the rest.

import landingPage from './landing-page/template.js';
import feedbackBoard from './feedback-board/template.js';
import aiChat from './ai-chat/template.js';
import aiImageStudio from './ai-image-studio/template.js';
import designerPortfolio from './designer-portfolio/template.js';
import xPlayerCard from './x-player-card/template.js';
import lawnService from './lawn-service/template.js';

export const TEMPLATES = [
    feedbackBoard,
    aiChat,
    aiImageStudio,
    landingPage,
    designerPortfolio,
    xPlayerCard,
    lawnService,
];

export default TEMPLATES;
