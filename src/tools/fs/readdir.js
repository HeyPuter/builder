window.tools.push({
    type: "function",
    function: {
        name: "readdir",
        description: "Reads the contents of a directory. Returns an array of files and directories.",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The absolute path of the directory to read from. Absolute paths start with a /."
                },
            },
            required: ["path"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function(args, state) {
        // Confine directory listings to the project directory, and list the
        // RESOLVED path (see the note in write.js).
        // See window.assertPathInProject.
        const path = window.assertPathInProject(args.path, state);
        const res = await puter.fs.readdir(path);
        return res
            // Hide internal CDN-propagation marker files from the model.
            .filter(item => !(!item.is_dir && /^__deploy_.*\.png$/.test(item.name)))
            .map(item => ({
                name: item.name,
                is_dir: item.is_dir,
            }));
    }
})