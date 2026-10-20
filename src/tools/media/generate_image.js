// GenerateImage — create an image with puter.ai.txt2img and show it in the chat.
//
// The file is saved to the chat's media folder (see window.chatMediaDir), and
// the card rendering / saving / error wording are shared with GenerateVideo in
// js/media.js. With save_to_project the image is also copied into the project
// (for a website being built), which counts as a project change for version
// history and the preview.
//
// Reference images (input_images) may be attachments in the project or images
// generated earlier in this chat; they are read and downscaled locally, then
// sent as data: URIs, which every image provider accepts.

(function () {
    const MAX_INPUT_IMAGES = 4;
    const MAX_COUNT = 4;
    const IMAGE_EXT_RE = /\.(png|jpe?g|webp)$/i;

    window.tools.push({
        type: "function",
        function: {
            name: "GenerateImage",
            description: "Generate an image from a text description and show it to the user in the chat. Use it when the user asks for a picture, illustration, photo, logo, artwork, etc., or when a website you are building needs custom imagery. To edit, restyle or vary an existing image (one the user attached, or one you generated earlier), pass its path in input_images and describe the change in the prompt. The image appears in the chat automatically; never repeat its path or link in your reply.",
            parameters: {
                type: "object",
                properties: {
                    prompt: {
                        type: "string",
                        description: "A detailed description of the image: subject, setting, style/medium, composition, lighting, colors and mood. Stay faithful to what the user asked for. For an edit, describe the change to make to the input image(s)."
                    },
                    aspect_ratio: {
                        type: "string",
                        enum: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"],
                        description: "Shape of the image. Default 1:1. Use 16:9 for banners/hero images and wallpapers, 9:16 for phone wallpapers and stories."
                    },
                    count: {
                        type: "integer",
                        minimum: 1,
                        maximum: MAX_COUNT,
                        description: `How many versions to generate from this prompt, shown side by side so the user can pick (1 to ${MAX_COUNT}, default 1). Use 2-4 only when the user asks for options, variations or several images; each one costs credits.`
                    },
                    quality: {
                        type: "string",
                        enum: ["low", "medium", "high"],
                        description: "Rendering quality. Default medium. Use high only when the user asks for maximum detail (it costs more)."
                    },
                    input_images: {
                        type: "array",
                        items: { type: "string" },
                        description: "Optional paths of up to 4 reference images to edit or take inspiration from: images the user attached (in the project's assets/) or images you generated earlier in this chat."
                    },
                    save_to_project: {
                        type: "string",
                        description: "Only when the image is for a website/app you are building: a path inside the project to also save it to, e.g. \"assets/hero.png\". Then reference it by that relative path in the code. Omit for images the user just wants to see."
                    }
                },
                required: ["prompt"],
                additionalProperties: false
            },
            strict: false
        },
        exec: async function (args, state) {
            const prompt = String((args && args.prompt) || '').trim();
            if (!prompt) throw new Error('A non-empty prompt is required.');
            const ratio = window.GeneratedMedia.parseRatio(args.aspect_ratio) ? args.aspect_ratio.trim() : null;
            const quality = ['low', 'medium', 'high'].includes(args.quality) ? args.quality : 'medium';

            let projectDest = null;
            if (typeof args.save_to_project === 'string' && args.save_to_project.trim()) {
                projectDest = window.assertPathInProject(args.save_to_project.trim(), state, 'save_to_project');
                // The project folder itself ("." or "assets/..") is not a file:
                // with the extension appended it named a file NEXT TO the
                // project, outside it.
                if (projectDest === window.projectRootDir(state)) {
                    throw new Error('save_to_project must be a file path inside the project, like "assets/hero.png".');
                }
                if (!IMAGE_EXT_RE.test(projectDest)) projectDest += '.png';
            }

            const inputs = Array.isArray(args.input_images) ? args.input_images.filter(p => typeof p === 'string' && p.trim()) : [];
            if (inputs.length > MAX_INPUT_IMAGES) throw new Error(`At most ${MAX_INPUT_IMAGES} input images are supported.`);
            const inputImages = [];
            for (const p of inputs) {
                const abs = window.assertPathInProjectOrMedia(p.trim(), state, 'input_images');
                try { inputImages.push(await window.GeneratedMedia.imageDataURL(abs)); }
                catch (e) { throw new Error(`Could not read the input image "${p}": ${e.message || e}`); }
            }

            const GM = window.GeneratedMedia;
            const generate = (extra) => {
                const options = { quality, ...extra };
                if (ratio) {
                    const [w, h] = GM.RATIOS[ratio];
                    options.ratio = { w, h };
                }
                if (inputImages.length) options.input_images = inputImages;
                return puter.ai.txt2img(prompt, options);
            };
            const count = Math.min(MAX_COUNT, Math.max(1, Math.round(Number(args.count) || 1)));
            // Analytics (see GeneratedMedia.trackGeneration).
            const trackProps = { aspect_ratio: ratio || 'default', quality, edit: inputImages.length > 0 };
            if (count === 1) {
                return GM.runGeneration({ kind: 'image', ext: 'png', prompt, ratio, state, projectDest, generate, trackProps });
            }

            // Several versions: one grid message, one tile per version, all
            // generated in parallel. A version that fails drops its tile; the
            // rest still land. The request is reported as ONE analytics event
            // (count = versions asked for, failed = how many didn't land).
            const live = !window.isAborted?.(state?.abortController) && !window.isStaleTurn?.(state);
            let tiles = [];
            if (live) {
                const grid = GM.gridMessage({ kind: 'image', prompt, ratio, count });
                GM.appendToChat(grid.$msg);
                tiles = grid.tiles;
            }
            const numbered = (dest, i) => dest && dest.replace(/(\.[a-z0-9]+)$/i, `-${i + 1}$1`);
            const settled = await Promise.allSettled(Array.from({ length: count }, (_, i) => GM.runGeneration({
                kind: 'image', ext: 'png', prompt, ratio, state, generate,
                projectDest: numbered(projectDest, i),
                card: tiles[i] || null,
                track: false,
            })));
            const done = settled.filter(r => r.status === 'fulfilled').map(r => r.value);
            const failed = count - done.length;
            if (!done.length) {
                GM.trackGeneration('image', false, { ...trackProps, for_project: !!projectDest, count, reason: (settled[0].reason && settled[0].reason.failureReason) || 'error' });
                throw settled[0].reason;
            }
            GM.trackGeneration('image', true, { ...trackProps, for_project: done.some(r => r.relative_path), count, ...(failed && { failed }) });
            // The first SAVED version, if any: a reload shows the result only
            // when its own path is set, so an unsaved first version (null path)
            // used to make the whole grid vanish after a reload.
            const first = done.find(r => r.path) || done[0];
            const out = {
                __generated_media: true,
                success: true,
                kind: 'image',
                prompt,
                ...(ratio && { aspect_ratio: ratio }),
                count: done.length,
                items: done.map(r => ({ path: r.path, filename: r.filename, ...(r.relative_path && { relative_path: r.relative_path }) })),
                // The first version doubles as the result's own file, so a
                // reader that knows only single images still finds one.
                path: first.path,
                filename: first.filename,
            };
            out.note = `${done.length} versions are now showing side by side in the chat${failed ? ` (${failed} more failed)` : ''}. Do not repeat their paths or links. The user can say which one they like (first, second…).`
                + (done.some(r => r.relative_path) ? ` Saved into the project as: ${done.map(r => r.relative_path).filter(Boolean).join(', ')}.` : '')
                + ` To edit or reuse one, use its path: ${done.map((r, i) => `${i + 1}) ${r.path}`).join('; ')}.`;
            return out;
        }
    });
})();
