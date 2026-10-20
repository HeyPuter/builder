// Largest ReadTextFile result, in characters (~60k tokens). See the cap note in
// exec below. A window global so the regression test can read the same number.
window.READ_TEXT_FILE_MAX_CHARS = 250000;

window.tools.push({
    type: "function",
    function: {
        name: "ReadTextFile",
        description: "Reads text data from a text file",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The absolute path of the file to read from. Absolute paths start with a /."
                }
            },
            required: ["path"],
            additionalProperties: false
        },
        strict: false
    },
    exec: async function(args, state) {
        // Confine reads to the project directory (no peeking at the wider account).
        // See window.assertPathInProject.
        const path = window.assertPathInProject(args.path, state);
        let blob;
        try {
            blob = await puter.fs.read(path);
        } catch (e) {
            // A file that is gone has no hand edits left to protect, so the
            // write tool may create it again (see code-editor.js).
            if (typeof isNotFoundError === 'function' && isNotFoundError(e)) window.CodeEditor?.noteModelRead?.(path);
            throw e;
        }
        let text = await blob.text();
        // Hide preview cache-bust tokens (a serving detail) so the model only
        // ever sees the clean source it wrote.
        if (/\.html?$/i.test(path) && window.stripPreviewCacheBust) {
            text = window.stripPreviewCacheBust(text);
        }
        // Cap what one read pulls into the conversation. The result is stored in
        // the chat history and re-sent with every later request, so a single
        // huge file (text attachments can be 10MB) didn't just fail this request
        // with "prompt is too long" — the persisted block failed every request
        // after it too, bricking the project. The cap is far above any real
        // source file (~6000 lines); what it stops are data dumps, which the
        // model should reference by path or search, not read whole.
        const MAX_CHARS = window.READ_TEXT_FILE_MAX_CHARS;
        // A file read whole: once the model has this result, the write tool may
        // replace it again (code-editor.js). tools.js lifts its guard after
        // the round, so only when the result is kept, and not for a write in
        // this same response. Not for a file it sees only the start of.
        if (state) state.lastFullRead = text.length <= MAX_CHARS ? path : null;
        if (text.length > MAX_CHARS) {
            const total = text.length;
            text = text.slice(0, MAX_CHARS) +
                `\n\n[…truncated: this file is ${total.toLocaleString()} characters long and only the first ${MAX_CHARS.toLocaleString()} are shown. ` +
                `To find specific content in the rest, use SearchFiles; if the app only needs the file (to load, serve or link it), reference it by path instead of reading it.]`;
        }
        return text;
    }
})
