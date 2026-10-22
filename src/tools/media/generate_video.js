// GenerateVideo — create a short clip with puter.ai.txt2vid and show it in the
// chat. Same flow as GenerateImage (see js/media.js); videos take a minute or
// more and cost noticeably more credits, so the prompt reserves this tool for
// explicit requests.
//
// It can start from an image (input_image), or continue an earlier clip
// (continue_from): Puter's video models take no video input, so the last frame
// of that clip is extracted in the browser and becomes the new clip's first
// frame. Sound: models that can, generate a soundtrack (generate_audio); the
// default Wan 2.7 models do.

(function () {
    // Output sizes for each shape. The default model works in resolution tiers
    // and reads the tier from the shorter side plus the aspect ratio; models
    // sized in pixels take the pair as-is. An unsupported value falls back to
    // the model's default rather than failing (see the txt2vid docs).
    const SIZES = {
        '16:9': '1280x720', '9:16': '720x1280', '1:1': '720x720',
        '4:3': '960x720', '3:4': '720x960',
    };
    // The supported shape nearest to a width/height ratio.
    function closestRatio(r) {
        let best = '16:9', bestD = Infinity;
        for (const key of Object.keys(SIZES)) {
            const [w, h] = key.split(':').map(Number);
            const d = Math.abs(Math.log(r / (w / h)));
            if (d < bestD) { bestD = d; best = key; }
        }
        return best;
    }
    const MIN_SECONDS = 2;
    const MAX_SECONDS = 10;
    // Puter's default video model (Wan 2.7 text-to-video) only takes text: a
    // starting image sent to it is rejected. A clip that starts from an image
    // goes to the image-to-video variant of the same model, which requires
    // one. Text-only clips keep Puter's default.
    const IMAGE_TO_VIDEO_MODEL = 'togetherai:wan-ai/wan2.7-i2v';

    window.tools.push({
        type: "function",
        function: {
            name: "GenerateVideo",
            description: "Generate a short video clip (a few seconds) from a text description, optionally starting from an image, and show it to the user in the chat. Use it ONLY when the user explicitly asks for a video, clip or animation. It takes a minute or more and uses noticeably more credits than an image, so generate one clip at a time. The video appears in the chat automatically; never repeat its path or link in your reply.",
            parameters: {
                type: "object",
                properties: {
                    prompt: {
                        type: "string",
                        description: "A detailed description of the clip: the subject, the motion, the camera movement (e.g. slow pan, aerial shot, close-up), the setting, style and mood."
                    },
                    aspect_ratio: {
                        type: "string",
                        enum: ["16:9", "9:16", "1:1", "4:3", "3:4"],
                        description: "Shape of the video. Default: the shape of input_image or continue_from when one is given, otherwise 16:9; use 9:16 for vertical/phone videos."
                    },
                    seconds: {
                        type: "number",
                        description: `Clip length in seconds, ${MIN_SECONDS} to ${MAX_SECONDS}. Default 5.`
                    },
                    input_image: {
                        type: "string",
                        description: "Optional path of an image the clip should start from (image-to-video): an image the user attached (in the project's assets/) or one you generated earlier in this chat."
                    },
                    continue_from: {
                        type: "string",
                        description: "Optional path of a video (one generated earlier in this chat, or one the user attached) to continue: the new clip starts exactly where that one ends. Describe what happens NEXT in the prompt, in the same style. Do not combine with input_image."
                    },
                    with_sound: {
                        type: "boolean",
                        description: "Whether the clip gets a generated soundtrack (ambient sound, effects, music matching the scene). Default true; set false when the user wants a silent clip."
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
            let ratio = SIZES[typeof args.aspect_ratio === 'string' ? args.aspect_ratio.trim() : ''] ? args.aspect_ratio.trim() : null;
            let seconds = Number(args.seconds);
            seconds = Number.isFinite(seconds) ? Math.min(MAX_SECONDS, Math.max(MIN_SECONDS, Math.round(seconds))) : 5;

            if (args.continue_from && args.input_image) {
                throw new Error('Use either input_image or continue_from, not both.');
            }
            let inputReference = null;
            let continuedFrom = null;
            if (typeof args.continue_from === 'string' && args.continue_from.trim()) {
                const abs = window.assertPathInProjectOrMedia(args.continue_from.trim(), state, 'continue_from');
                if (!/\.(mp4|webm|mov|m4v)$/i.test(abs)) throw new Error(`"${args.continue_from}" is not a video file (mp4, webm or mov).`);
                try {
                    const frame = await window.GeneratedMedia.videoFrameDataURL(abs);
                    inputReference = frame.dataURL;
                    continuedFrom = abs;
                    // Keep the original clip's shape unless one was asked for.
                    if (!ratio && frame.width && frame.height) ratio = closestRatio(frame.width / frame.height);
                } catch (e) {
                    throw new Error(`Could not read the last frame of "${args.continue_from}": ${e.message || e}. Tell the user; do not make an unrelated clip instead.`);
                }
            }
            if (typeof args.input_image === 'string' && args.input_image.trim()) {
                const abs = window.assertPathInProjectOrMedia(args.input_image.trim(), state, 'input_image');
                let ref;
                try { ref = await window.GeneratedMedia.imageDataURL(abs, { withSize: true }); }
                catch (e) { throw new Error(`Could not read the input image "${args.input_image}": ${e.message || e}`); }
                inputReference = typeof ref === 'string' ? ref : ref.dataURL;
                // Keep the image's shape unless one was asked for (a portrait
                // photo used to be animated into a 16:9 clip).
                if (!ratio && ref && ref.width && ref.height) ratio = closestRatio(ref.width / ref.height);
            }

            const withSound = args.with_sound !== false;
            return window.GeneratedMedia.runGeneration({
                kind: 'video',
                ext: 'mp4',
                prompt,
                ratio: ratio || '16:9',
                state,
                details: { with_sound: withSound, ...(continuedFrom && { continued_from: continuedFrom }) },
                trackProps: {
                    aspect_ratio: ratio || '16:9', seconds, with_sound: withSound,
                    start: continuedFrom ? 'continue' : inputReference ? 'image' : 'text',
                },
                generate: (extra) => {
                    const options = { seconds, size: SIZES[ratio || '16:9'], generate_audio: withSound, ...extra };
                    if (inputReference) {
                        options.model = IMAGE_TO_VIDEO_MODEL;
                        options.input_reference = inputReference;
                    }
                    return puter.ai.txt2vid(prompt, options);
                },
            });
        }
    });
})();
