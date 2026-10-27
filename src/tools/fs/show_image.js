// ShowImage — show an image file from the project in the chat, as the same
// card GenerateImage uses (js/media.js).
//
// For art the model drew itself: a logo or icon written as SVG is just a file,
// so a user who asked to see one ("design a logo for…") got a description and
// a path. Writing an SVG doesn't show it by itself, because every app writes
// an icon.svg and the chat would fill with cards nobody asked for.
//
// The result is shaped like a GenerateImage result (success, kind, path,
// filename), so loadChat shows the card again when the chat is reopened.
(function () {
    const IMAGE_EXT_RE = /\.(svg|png|jpe?g|webp|gif)$/i;

    // Add the card for a project image. Shared with RenderSvg. Not when the
    // turn was stopped or the user left the chat meanwhile. Returns whether
    // the card was added; a card that fails to show never fails the tool.
    window.showProjectImageInChat = async function (path, state) {
        const GM = window.GeneratedMedia;
        if (!GM || window.isAborted?.(state?.abortController) || window.isStaleTurn?.(state)) return false;
        const root = window.projectRootDir(state);
        const relative = path.startsWith(root + '/') ? path.slice(root.length + 1) : path;
        const filename = path.slice(path.lastIndexOf('/') + 1);
        try {
            const url = await GM.displayURL(path);
            // Again after the fetch: a chat switch meanwhile stopped the turn,
            // and the card would land in the chat the user switched to.
            if (window.isAborted?.(state?.abortController) || window.isStaleTurn?.(state)) return false;
            const $card = GM.pendingCard({ kind: 'image', prompt: relative });
            GM.fillCard($card, { kind: 'image', url, path, filename, prompt: relative });
            GM.appendToChat($card);
            return true;
        } catch (e) {
            console.warn('Could not show the image in the chat:', e);
            return false;
        }
    };

    window.tools.push({
        type: "function",
        function: {
            name: "ShowImage",
            description: "Show an image file from the project to the user in the chat. Use it when the user wants to see a graphic you drew, such as a logo or icon you wrote as an SVG, especially when there is no app to show it in yet. Not needed for images from GenerateImage or RenderSvg, which show themselves, or for images that are only part of the app.",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "The image to show (svg, png, jpg, webp or gif), e.g. \"assets/logo.svg\". Absolute, or relative to the app directory."
                    }
                },
                required: ["path"],
                additionalProperties: false
            },
            strict: false
        },
        exec: async function (args, state) {
            const raw = String((args && args.path) || '').trim();
            if (!raw) throw new Error('No image path provided.');
            const path = window.assertPathInProject(raw, state);
            if (!IMAGE_EXT_RE.test(path)) throw new Error(`"${raw}" is not an image. ShowImage shows svg, png, jpg, webp and gif files.`);
            try { await puter.fs.stat(path); }
            catch (e) { throw new Error(`"${raw}" does not exist. Write the file first, then show it.`); }

            const shown = await window.showProjectImageInChat(path, state);
            const root = window.projectRootDir(state);
            const relative = path.startsWith(root + '/') ? path.slice(root.length + 1) : path;
            return {
                success: true,
                kind: 'image',
                prompt: relative,
                path,
                filename: path.slice(path.lastIndexOf('/') + 1),
                note: shown
                    ? 'The image is now showing in the chat. Do not repeat its path, a link, or Markdown to display it.'
                    : 'The image could not be shown in the chat.',
            };
        }
    });
})();
