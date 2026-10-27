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
        // A call cut off at the output limit, or from a route that ignores the
        // strict schema, can arrive without data. Writing it would empty the file.
        if (typeof args.data !== 'string') {
            throw new Error("data is missing. Send the file's full content in data.");
        }
        // The user edited this file by hand in the Code view since the model
        // last read it: a whole-file write from the model's memory would drop
        // their change, so it must read the file first (see code-editor.js).
        await window.CodeEditor?.assertModelMayOverwrite?.(path);
        // Take the path's write-lock so this write can't interleave with the
        // background preview cache-bust's read-modify-write on the same file (a
        // stale-buffer write-back would otherwise clobber it). See withFileLock.
        // writeFileVerified reads the file back inside the lock to confirm the
        // bytes persisted (retry-then-throw on failure), so a write that silently
        // fails to land surfaces as a tool error instead of a false success.
        // A deployed worker's source goes live on save (see tools.js).
        const worker = await window.workerSaveTarget?.(path, state);
        const data = worker?.token ? window.stampWorkerCanary(args.data, worker.token) : args.data;
        await window.withFileLock(path, () => window.writeFileVerified(path, data));
        window.schedulePreviewRefresh?.();
        const live = await window.workerSaveResult?.(worker, data, state);
        return live ? { success: true, path, worker: live } : { success: true, path };
    }
})