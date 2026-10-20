// Upgrade-offer tool.
//
// The "Made with Puter" badge comes from the runtime tag every page carries
// (see prompt.js and src/runtime.js), and removing it is a paid perk: the
// publish flow strips the tag when a subscriber ticks the box (branding.js). A free user who
// asks the AI to remove the badge would otherwise get it done for free by an
// edit to the tag, so the prompt tells the model to call this tool instead.
// For a free user it puts an Upgrade card in the chat whose button opens the
// upgrade dialog; for a subscriber it shows nothing and tells the model how
// to turn the badge off in Publish.
//
// The result carries __upgrade_offer so a reloaded chat can show the card
// again (see loadChat in app.js).

(function () {
    function renderUpgradeCard({ append = true } = {}) {
        const $node = $(
            '<div class="upgrade-card message ai-message"><div class="message-content">' +
                '<div class="upgrade-card-inner">' +
                    '<span>Remove the “Made with Puter” badge with a paid Puter subscription.</span>' +
                    '<button type="button" class="upgrade-card-btn">Upgrade</button>' +
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

    window.tools.push({
        type: "function",
        function: {
            name: "OfferUpgrade",
            description: "Call this when the user asks to remove, hide, or change the \"Made with Puter\" badge. Never edit or remove the Puter runtime script tag to do it. Removing the badge needs a paid Puter subscription. For a free user this shows an Upgrade button in the chat; the result tells you what to say.",
            parameters: {
                type: "object",
                properties: {},
                additionalProperties: false
            },
            strict: true
        },
        exec: async function (args, state) {
            // Ask Puter, not the copy loaded at page start: the user may have
            // upgraded in another tab since. (Also refreshes that copy.)
            const user = window.refreshUserPlan ? await window.refreshUserPlan() : window.user;
            const subscribed = window.Branding.isSubscribed(user);
            window.track?.('Badge Removal Requested', { subscribed });
            if (subscribed) {
                return {
                    __upgrade_offer: true,
                    subscribed: true,
                    instruction: "The user has a paid Puter subscription. They can remove the badge from their public site themselves (the builder preview never shows it). Tell them in one or two short sentences to open Publish, tick \"Remove the 'Made with Puter' badge\", and publish. Do not edit the runtime script tag.",
                };
            }
            // The turn may have been stopped, or the chat switched, while the
            // plan was being fetched: no card for a turn that is gone.
            if (!window.isAborted?.(state?.abortController) && !window.isStaleTurn?.(state)) {
                renderUpgradeCard();
                window.track?.('Upgrade Prompt Shown', { source: 'chat' });
            }
            return {
                __upgrade_offer: true,
                subscribed: false,
                instruction: "An Upgrade button is now showing in the chat. Tell the user in one or two short sentences that removing the badge needs a paid Puter subscription, and that after upgrading they tick \"Remove the 'Made with Puter' badge\" in Publish and publish their site. Do not edit the runtime script tag.",
            };
        }
    });
})();
