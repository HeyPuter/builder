window.tools.push({
    type: "function",
    function: {
        name: "delete",
        description: "Deletes a file or directory",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The absolute path of the file or directory to delete. Absolute paths start with a /."
                }
            },
            required: ["path"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function(args, state) {
        // Confine to the project directory before deleting — an out-of-project path
        // fails as a model-directed tool error. The RESOLVED path is what we act
        // on (see the note in write.js). See window.assertPathInProject.
        const path = window.assertPathInProject(args.path, state);
        // Never the project directory itself: the hosting connection and the
        // conversation are bound to it, and a single injected call wiping the
        // whole project is not a change the model should be able to make in
        // one step. Files and folders inside it are fair game.
        if (path === window.projectRootDir(state)) {
            throw new Error('Refusing to delete the project directory itself. Delete the files or folders inside it instead.');
        }
        // Take the path's write-lock so a concurrent background preview cache-bust
        // can't be mid read-modify-write on this file and then re-create it with a
        // stale buffer after we delete it. See window.withFileLock.
        await window.withFileLock(path, () => puter.fs.delete(path));
        window.schedulePreviewRefresh?.();
        return { success: true };
    }
})