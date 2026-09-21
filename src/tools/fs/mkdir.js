window.tools.push({
    type: "function",
    function: {
            name: "mkdir",
            description: "Creates a directory",
            parameters: {
                type: "object",
                properties: {
                    paths_array: {
                        type: "array",
                        items: { type: "string" },
                        description: "An array of absolute paths of the directories to create. Absolute paths start with a /."
                    }
                },
                required: ["paths_array"],
                additionalProperties: false
            },
            strict: true
    },
    exec: async function(args, state) {
        // Confine every directory to be created to the project directory, and
        // create the RESOLVED paths (see the note in write.js).
        // See window.assertPathInProject.
        const paths = window.assertPathsInProject(args.paths_array, state);
        for (const path of paths) {
            // createMissingParents: puter.fs.mkdir rejects with not_found when
            // an intermediate directory is missing (verified live), so a single
            // "assets/images" in a fresh project failed and cost the model a
            // retry round. Nothing in the loop depends on the parent existing
            // first, and the path is already confined to the project above.
            await puter.fs.mkdir(path, { createMissingParents: true });
        }
        return true;
    }
})