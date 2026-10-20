// Upgrade-offer tool.
//
// Two paid perks are reachable from a conversation, and the model calls this
// tool for either one (the `feature` argument):
//
// * "badge": the "Made with Puter" badge comes from the runtime tag every page
//   carries (see prompt.js and src/runtime.js), and removing it is a paid
//   perk: the publish flow strips the tag when a subscriber ticks the box
//   (branding.js). A free user who asks the AI to remove the badge would
//   otherwise get it done for free by an edit to the tag, so the prompt tells
//   the model to call this tool instead.
// * "code_editor": Builder's Code view (js/code-editor.js) shows every file,
//   and editing them by hand is a paid perk. The tool description is also how
//   the model learns the Code view exists, so it can point people to it. It
//   never stops the model from making a change the user asks for in chat.
//
// For a free user it puts an Upgrade card in the chat whose button opens the
// upgrade dialog; for a subscriber it shows nothing and tells the model how to
// use the perk.
//
// The result carries __upgrade_offer (and the feature) so a reloaded chat can
// show the card again (see loadChat in app.js). Offers saved before the code
// editor existed carry no feature and are the badge.

(function () {
    const CODE_EDITOR = !!(window.FEATURE_FLAGS && window.FEATURE_FLAGS.codeEditor);

    const CARDS = {
        badge: { text: 'Remove the “Made with Puter” badge with a paid Puter subscription.', source: 'chat' },
        code_editor: { text: 'Edit your app’s code yourself with a paid Puter subscription. You can already read every file in Code.', source: 'chat_code_editor' },
    };

    function renderUpgradeCard({ append = true, feature = 'badge' } = {}) {
        // A code-editor offer saved while the Code view shipped has nothing to
        // offer once the flag is off.
        if (feature === 'code_editor' && !CODE_EDITOR) return null;
        const card = CARDS[feature] || CARDS.badge;
        const $node = $(
            '<div class="upgrade-card message ai-message"><div class="message-content">' +
                '<div class="upgrade-card-inner">' +
                    `<span>${card.text}</span>` +
                    `<button type="button" class="upgrade-card-btn" data-source="${card.source}">Upgrade</button>` +
                '</div>' +
            '</div></div>');
        if (append) {
            const $chatBox = $('.chat-box');
            const floatingSpinner = $chatBox.find('.floating-spinner').detach();
            $chatBox.append($node);
            if (floatingSpinner.length) $node.after(floatingSpinner);
            if (window.shouldAutoScroll) $chatBox.scrollTop($chatBox[0].scrollHeight);
        }
        return $node;
    }
    window.renderUpgradeCard = renderUpgradeCard;

    // Static per build (flag-derived at load), so the tool definition stays a
    // stable part of the cached prompt prefix.
    const description = CODE_EDITOR
        ? "Call this when the user asks to remove, hide, or change the \"Made with Puter\" badge (feature \"badge\"), or asks to see, open, or edit the app's code or files themselves (feature \"code_editor\"). Never edit or remove the Puter runtime script tag to remove the badge. Builder has a Code view: the Code button in the preview toolbar shows every file in the project. Anyone can read the code there; editing and saving it by hand needs a paid Puter subscription, and so does removing the badge. This tool never limits what you do: keep making every change the user asks for in chat, on any plan. For a free user it shows an Upgrade button in the chat; the result tells you what to say."
        : "Call this when the user asks to remove, hide, or change the \"Made with Puter\" badge. Never edit or remove the Puter runtime script tag to do it. Removing the badge needs a paid Puter subscription. For a free user this shows an Upgrade button in the chat; the result tells you what to say.";

    window.tools.push({
        type: "function",
        function: {
            name: "OfferUpgrade",
            description,
            parameters: CODE_EDITOR
                ? {
                    type: "object",
                    properties: {
                        feature: {
                            type: "string",
                            enum: ["badge", "code_editor"],
                            description: "badge: the user wants to remove, hide, or change the \"Made with Puter\" badge. code_editor: the user wants to see, open, or edit the app's code themselves."
                        }
                    },
                    required: ["feature"],
                    additionalProperties: false
                }
                : {
                    type: "object",
                    properties: {},
                    additionalProperties: false
                },
            strict: true
        },
        exec: async function (args, state) {
            const feature = CODE_EDITOR && args && args.feature === 'code_editor' ? 'code_editor' : 'badge';
            // Ask Puter, not the copy loaded at page start: the user may have
            // upgraded in another tab since. (Also refreshes that copy.)
            const user = window.refreshUserPlan ? await window.refreshUserPlan() : window.user;
            const subscribed = window.Branding.isSubscribed(user);
            if (feature === 'badge') window.track?.('Badge Removal Requested', { subscribed });
            else window.track?.('Code Editing Requested', { subscribed });
            if (subscribed) {
                return feature === 'badge'
                    ? {
                        __upgrade_offer: true,
                        subscribed: true,
                        instruction: "The user has a paid Puter subscription. They can remove the badge from their public site themselves (the builder preview never shows it). Tell them in one or two short sentences to open Publish, tick \"Remove the 'Made with Puter' badge\", and publish. Do not edit the runtime script tag.",
                    }
                    : {
                        __upgrade_offer: true,
                        feature,
                        subscribed: true,
                        instruction: "The user has a paid Puter subscription, so they can edit the code themselves. Tell them in one or two short sentences to click Code in the preview toolbar, open a file, edit it, and save with the Save button or Cmd+S (Ctrl+S on Windows). Mention that you will see their saved changes, and that you can still make changes for them in chat.",
                    };
            }
            // The turn may have been stopped, or the chat switched, while the
            // plan was being fetched: no card for a turn that is gone.
            if (!window.isAborted?.(state?.abortController) && !window.isStaleTurn?.(state)) {
                renderUpgradeCard({ feature });
                window.track?.('Upgrade Prompt Shown', { source: CARDS[feature].source });
            }
            return feature === 'badge'
                ? {
                    __upgrade_offer: true,
                    subscribed: false,
                    instruction: "An Upgrade button is now showing in the chat. Tell the user in one or two short sentences that removing the badge needs a paid Puter subscription, and that after upgrading they tick \"Remove the 'Made with Puter' badge\" in Publish and publish their site. Do not edit the runtime script tag.",
                }
                : {
                    __upgrade_offer: true,
                    feature,
                    subscribed: false,
                    instruction: "An Upgrade button is now showing in the chat. Tell the user in one or two short sentences that they can already read every file by clicking Code in the preview toolbar, and that editing the code themselves needs a paid Puter subscription. Offer to make the change they want for them now in chat, which works on any plan.",
                };
        }
    });
})();
