// "What next?" suggestions tool.
//
// At the end of a build/edit turn the model calls SuggestNextSteps with 4-5 short
// follow-up ideas, which we render as clickable chips above the input (clicking a
// chip drops its full prompt into the composer — it does NOT auto-send). The big
// win over the old approach (a separate, cheap Haiku call fed a lossy HTML
// snapshot) is that the build model already has the FULL ground truth — every
// file it just wrote and the whole conversation — so it never re-suggests a
// feature the app already has, and its judgment about a genuinely useful next
// step is far better.
//
// Design notes:
// - We do NOT render here, mid-loop. We stash the validated set on
//   window._pendingTurnSuggestions and let app.js render it at end-of-turn, where
//   the supersede / chat-switch guards live and where chips naturally belong
//   (rendering mid-turn would show chips a later turn error would have to clear).
// - If the model never calls this tool (a pure conversational reply, or it simply
//   skipped), app.js falls back to the legacy Haiku generator so the user still
//   gets suggestions.
// - label/prompt are model-authored; they are rendered via .text()/.attr() in
//   app.js's renderContinueSuggestions (never interpolated as HTML).

window.tools.push({
    type: "function",
    function: {
        name: "SuggestNextSteps",
        description: "Show the user 4-5 one-click \"what next?\" suggestion chips above the input. Call this exactly ONCE as the final action of any turn that built or modified the app (after update_preview and your summary). You have just seen every file you wrote and the whole conversation, so propose ONLY things the app does NOT already have — never re-suggest an existing feature, section, or capability. Make each suggestion specific to what was just built or discussed and vary them across features, design/UX, content, integrations, and polish. You may skip this only for a pure conversational reply with nothing new to suggest. Never mention this tool to the user.",
        parameters: {
            type: "object",
            properties: {
                suggestions: {
                    type: "array",
                    description: "4 to 5 distinct next-step suggestions, ordered most useful first.",
                    items: {
                        type: "object",
                        properties: {
                            label: {
                                type: "string",
                                description: "A very short button caption, 2 to 5 words, no trailing punctuation (e.g. \"Add a dark mode\")."
                            },
                            prompt: {
                                type: "string",
                                description: "A clear, first-person instruction the user could send to carry out this step, 1 to 2 sentences (e.g. \"Add a dark mode toggle and remember my preference between visits.\")."
                            }
                        },
                        required: ["label", "prompt"],
                        additionalProperties: false
                    }
                }
            },
            required: ["suggestions"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function (args) {
        // Normalize defensively (the schema can't hard-cap sizes or trim strings):
        // keep entries that have both a label and a prompt, and at most 5.
        let list = Array.isArray(args && args.suggestions) ? args.suggestions : [];
        list = list
            .map(s => ({
                label: (s && typeof s.label === 'string') ? s.label.trim() : '',
                prompt: (s && typeof s.prompt === 'string') ? s.prompt.trim() : '',
            }))
            .filter(s => s.label && s.prompt)
            .slice(0, 5);

        // Hand off to app.js, which renders at end-of-turn under its supersede /
        // chat-switch guards. Empty list => app.js falls back to the Haiku path.
        window._pendingTurnSuggestions = list;

        return { success: true };
    }
});
