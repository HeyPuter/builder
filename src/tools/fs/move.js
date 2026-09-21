window.tools.push({
    type: "function",
    function: {
        name: "move",
        description: "Moves a file or directory",
        parameters: {
            type: "object",
            properties: {
                paths_array: {
                    type: "array",
                    items: { type: "string" },
                    description: "An array of absolute paths of the files or directories to move. Absolute paths start with a /.",
                },
                destination: {
                    type: "string",
                    description: "The absolute path of the destination directory. Absolute paths start with a /."
                }
            },
            required: ["paths_array", "destination"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function(args, state) {
        // Confine every source path and the destination directory to the project.
        // See window.assertPathInProject.
        const paths = window.assertPathsInProject(args.paths_array, state);
        const destination = window.assertPathInProject(args.destination, state, 'destination');
        // Moving the project directory into itself (the only in-project
        // destination there is) makes no sense and would orphan the hosting
        // connection and the conversation bound to its path.
        const root = window.projectRootDir(state);
        if (paths.some(p => p === root)) {
            throw new Error('Refusing to move the project directory itself. Move the files or folders inside it instead.');
        }
        for (const path of paths) {
            // Lock each source path so a concurrent background preview cache-bust
            // can't re-create it from a stale buffer after we move it away. See
            // window.withFileLock.
            await window.withFileLock(path, () => puter.fs.move(path, destination));
        }
        window.schedulePreviewRefresh?.();
        return true;
    }
})