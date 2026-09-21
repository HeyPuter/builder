window.tools.push({
    type: "function",
    function: {
        name: "stat",
        description: "Gets information about a file or directory.",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The absolute path of the file or directory to get information about. Absolute paths start with a /."
                }
            },
            required: ["path"],
            additionalProperties: false
        },
        strict: true
    },

    exec: async function(args, state) {
        // Confine stat to the project directory, and stat the RESOLVED path (see
        // the note in write.js). See window.assertPathInProject.
        const path = window.assertPathInProject(args.path, state);
        const res = await puter.fs.stat(path);
        return {
            name: res.name,
            path: res.path,
            size: res.size,
            is_dir: res.is_dir,
            created: res.created,
            modified: res.modified,
        };
    }
})