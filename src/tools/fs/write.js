window.tools.push({
    type: "function",
    function: {
        name: "write",
        description: "Writes data to a file",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The absolute path of the file to write to. Absolute paths start with a /. This field is ABSOLUTELY required."
                },
                data: {
                    type: "string",
                    description: "The data to write to the file. This field is ABSOLUTELY required."
                },
            },
            required: ["path", "data"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function(args, state) {
        // Confine to the project directory before any IO — an out-of-project path
        // fails as a model-directed tool error. The RESOLVED path is what we
        // write to: a relative path is resolved against the project dir here, but
        // puter.fs would resolve it against the app-data root instead — landing
        // the file outside the project (in a sibling project, even) while this
        // guard reported it as in-bounds. See window.assertPathInProject.
        const path = window.assertPathInProject(args.path, state);
        // Take the path's write-lock so this write can't interleave with the
        // background preview cache-bust's read-modify-write on the same file (a
        // stale-buffer write-back would otherwise clobber it). See withFileLock.
        // writeFileVerified reads the file back inside the lock to confirm the
        // bytes persisted (retry-then-throw on failure), so a write that silently
        // fails to land surfaces as a tool error instead of a false success.
        await window.withFileLock(path, () => window.writeFileVerified(path, args.data));
        window.schedulePreviewRefresh?.();
        return { success: true, path };
    }
})