window.tools.push({
    type: "function",
    function: {
        name: "list_workers",
        description: "Lists THIS project's Puter serverless workers (the ones it deployed with create_worker) with their metadata. Workers belonging to other projects on the account are not listed and cannot be used from here.",
        parameters: {
            type: "object",
            properties: {},
            required: [],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function(args, state) {
        // Deployed workers are ACCOUNT-level resources shared by every project
        // (and every other Puter app) on the account, so the raw list is not this
        // project's to see: it carries other projects' worker names, live URLs and
        // source paths — which embed their chat ids — straight into this
        // conversation's context, where they persist and are re-sent every turn.
        // Worse, the model then has no way to tell them apart from its own, and
        // wiring this app to another project's backend silently couples the two
        // (and breaks this app when that project is deleted).
        //
        // create_worker and delete_worker already scope by ownership (the
        // deployed record's source file lives inside this project's directory —
        // WorkerOwnership.ownedWorkers); this is the read side of that same
        // sandbox, and the counterpart to readdir being confined to the project
        // dir. The project dir comes from the turn's captured state so a mid-turn
        // chat switch can't widen the scope.
        const root = window.projectRootDir(state);
        if (!root) throw new Error('Cannot determine the project directory, so the worker operation was refused for safety.');
        const workers = window.WorkerOwnership.ownedWorkers(await puter.workers.list(), root);
        return {
            success: true,
            workers: workers.map(w => ({
                name: w.name,
                url: w.url,
                file_path: w.file_path,
                created_at: w.created_at
            }))
        };
    }
})
