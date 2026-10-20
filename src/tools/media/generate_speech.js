// GenerateSpeech — turn text into spoken audio with puter.ai.txt2speech and show
// a player in the chat. Same card / saving / error flow as GenerateImage and
// GenerateVideo (js/media.js).
//
// Puter offers speech only: there is no music or sound-effect generation, so
// the prompt tells the model to say so rather than fake it.
//
// Uses OpenAI's gpt-4o-mini-tts through Puter: it reads many languages from
// the text alone and takes a plain-language `instructions` string for the
// delivery (tone, pace, accent, emotion). Puter's own default (AWS Polly
// standard) sounds robotic. txt2speech has no puter_output_path, so the clip is
// always saved from the URL the call returns (serverSave: false).

(function () {
    const MAX_CHARS = 3000; // Puter rejects longer text with input_too_large
    const MODEL = 'gpt-4o-mini-tts';
    const VOICES = ['alloy', 'ash', 'ballad', 'cedar', 'coral', 'echo', 'fable', 'marin', 'nova', 'onyx', 'sage', 'shimmer', 'verse'];
    const DEFAULT_VOICE = 'alloy';
    const AUDIO_EXT_RE = /\.mp3$/i;

    window.tools.push({
        type: "function",
        function: {
            name: "GenerateSpeech",
            description: `Turn text into natural spoken audio (text-to-speech) and show a player in the chat. Use it when the user wants something read aloud, a narration, voiceover, podcast-style intro, announcement, pronunciation example, or an audio version of text — or when a website you are building needs a spoken audio file. It speaks exactly the text you give it, in the language the text is written in. It cannot make music, singing or sound effects. Up to ${MAX_CHARS} characters per clip; split longer text into several clips. The player appears in the chat automatically; never repeat its path or link in your reply.`,
            parameters: {
                type: "object",
                properties: {
                    text: {
                        type: "string",
                        description: `The exact words to speak, at most ${MAX_CHARS} characters. Write it for the ear: no Markdown, headings, bullet symbols, URLs or emoji.`
                    },
                    voice: {
                        type: "string",
                        enum: VOICES,
                        description: `The voice. Default ${DEFAULT_VOICE}. Keep the same voice across clips that belong together.`
                    },
                    instructions: {
                        type: "string",
                        description: "Optional delivery directions in plain language: tone, pace, emotion, accent, character (e.g. \"warm and calm, like a bedtime story\", \"upbeat radio announcer\", \"slow and clear for a language learner\")."
                    },
                    save_to_project: {
                        type: "string",
                        description: "Only when the audio is for a website/app you are building: a path inside the project to also save it to, e.g. \"assets/intro.mp3\". Then reference it by that relative path in the code. Omit for audio the user just wants to hear."
                    }
                },
                required: ["text"],
                additionalProperties: false
            },
            strict: false
        },
        exec: async function (args, state) {
            const text = String((args && args.text) || '').trim();
            if (!text) throw new Error('Non-empty text is required.');
            if (text.length > MAX_CHARS) {
                throw new Error(`The text is ${text.length.toLocaleString()} characters; one clip can be at most ${MAX_CHARS.toLocaleString()}. Split it into shorter clips at natural breaks (paragraphs or sentences) and generate each one.`);
            }
            const voice = VOICES.includes(args.voice) ? args.voice : DEFAULT_VOICE;
            const instructions = typeof args.instructions === 'string' ? args.instructions.trim().slice(0, 1000) : '';

            let projectDest = null;
            if (typeof args.save_to_project === 'string' && args.save_to_project.trim()) {
                projectDest = window.assertPathInProject(args.save_to_project.trim(), state, 'save_to_project');
                // The project folder itself ("." or "assets/..") is not a file:
                // with the extension appended it named a file NEXT TO the
                // project, outside it.
                if (projectDest === window.projectRootDir(state)) {
                    throw new Error('save_to_project must be a file path inside the project, like "assets/intro.mp3".');
                }
                if (!AUDIO_EXT_RE.test(projectDest)) projectDest = projectDest.replace(/\.[a-z0-9]{1,5}$/i, '') + '.mp3';
            }

            return window.GeneratedMedia.runGeneration({
                kind: 'audio',
                ext: 'mp3',
                prompt: text,
                state,
                projectDest,
                serverSave: false,
                details: { voice, ...(instructions && { instructions }) },
                trackProps: { voice, styled: !!instructions },
                generate: (extra) => {
                    const options = { provider: 'openai', model: MODEL, voice, response_format: 'mp3', ...extra };
                    if (instructions) options.instructions = instructions;
                    return puter.ai.txt2speech(text, options);
                },
            });
        }
    });
})();
