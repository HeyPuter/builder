window.tools.push({
    type: "function",
    function: {
        name: "copy",
        description: "Copies a file or directory",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The absolute path of the file or directory to copy. Absolute paths start with a /. May also be an image, video or audio clip you generated earlier in this chat (to use it in the project)."
                },
                destination: {
                    type: "string",
                    description: "The absolute path of the destination directory. Absolute paths start with a /. IMPORTANT: Make sure that you are specifying the destination directory and not the destination file."
                }
            },
            required: ["path", "destination"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function(args, state) {
        // Confine both the source and the destination directory to the project.
        // The source may also be media generated earlier in this chat (its
        // media folder sits outside the project), so the model can put it on
        // the website. See window.assertPathInProject / assertPathInProjectOrMedia.
        const src = window.assertPathInProjectOrMedia(args.path, state);
        const destDir = window.assertPathInProject(args.destination, state, 'destination');
        // puter.fs.copy lands the new entry at destination/<basename(source)>.
        // Lock that resolved path — the same path tools.js records as the preview
        // change — so a concurrent background preview cache-bust can't be mid
        // read-modify-write on the freshly-copied file and clobber it with a stale
        // buffer. See window.withFileLock (matches write/move/rename/delete).
        const dest = destDir + '/' + src.slice(src.lastIndexOf('/') + 1);
        await window.withFileLock(dest, () => puter.fs.copy(src, destDir));
        window.schedulePreviewRefresh?.();
        return { success: true, path: destDir };
    }
})