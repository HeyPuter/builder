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
                    description: "The absolute path of the file or directory to copy. Absolute paths start with a /."
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
        // See window.assertPathInProject.
        const src = window.assertPathInProject(args.path, state);
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