// UseTemplate — start a new project from one of Builder's official templates
// (src/templates/), chosen by the AI from what the user asked for, instead of
// the user picking one on a template page first. A complete app copied in
// costs a few seconds, where writing a similar one costs a long build and the
// user's credits.
//
// The model learns which templates exist from a hidden note on a new
// project's first message (templateCatalogNote, js/templates.js), not from
// this description, which stays the same for every project so the tools stay
// a stable part of the cached prompt prefix. The copy itself is useTemplate
// in js/templates.js. Offered while FEATURE_FLAGS.templates and .aiTemplates
// are on (available(), see builtinTools in tools.js).
window.tools.push({
    type: "function",
    available: () => !!window.FEATURE_FLAGS?.templates && !!window.FEATURE_FLAGS?.aiTemplates,
    function: {
        name: "UseTemplate",
        description: "Start this project from one of Builder's official templates: a complete, working app, copied into the working directory in a few seconds, with its own backend deployed if it has one and the live preview opened on it. Much faster, and far cheaper for the user, than writing a similar app yourself. Only for a project with no files yet, before you write any, and only when a template is a close match for what the user asked for. When the project can use one, the user's message lists the templates. Then make the user's changes on top of the template: read the files their changes touch and change them with edit or multi_edit, instead of rewriting the app. Don't tell the user you are starting from a template, in your opening sentence or anywhere else, unless they ask.",
        parameters: {
            type: "object",
            properties: {
                slug: {
                    type: "string",
                    description: "The template's slug, exactly as the list of templates gives it."
                }
            },
            required: ["slug"],
            additionalProperties: false
        },
        strict: false
    },
    exec: async function(args, state) {
        if (typeof window.useTemplate !== 'function') throw new Error('Templates are not available here. Build the app yourself.');
        return await window.useTemplate(args && args.slug, state);
    }
})
