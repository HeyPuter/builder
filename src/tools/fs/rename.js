window.tools.push({
    type: "function",
    function: {
        name: "rename",
        description: "Renames a file or directory",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The absolute path of the file or directory to rename. Absolute paths start with a /."
                },
                new_name: {
                    type: "string",
                    description: "The new name of the file or directory."
                }
            },
            required: ["path", "new_name"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function(args, state) {
        // Confine the source to the project directory, and require new_name to be a
        // plain name (no slashes) so a rename can't relocate the file out of the
        // project. See window.assertPathInProject.
        const path = window.assertPathInProject(args.path, state);
        // The project directory's own name is the chat id every path, the
        // hosting connection and the conversation are bound to — renaming it
        // would orphan all of them.
        if (path === window.projectRootDir(state)) {
            throw new Error('Refusing to rename the project directory itself. Rename the files or folders inside it instead.');
        }
        if (typeof args.new_name !== 'string' || !args.new_name.trim() || /\//.test(args.new_name) || args.new_name === '.' || args.new_name === '..') {
            throw new Error('new_name must be a plain file or directory name without slashes.');
        }
        // Lock the source path so a concurrent background preview cache-bust can't
        // re-create it from a stale buffer after the rename moves it. See withFileLock.
        await window.withFileLock(path, () => puter.fs.rename(path, args.new_name));
        window.schedulePreviewRefresh?.();
        return { success: true, new_name: args.new_name };
    }
})