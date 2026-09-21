window.tools.push({
    type: "function",
    function: {
        name: "get_worker",
        description: "Gets information about one of THIS project's Puter serverless workers. A worker that belongs to another project on the account is reported as not found.",
        parameters: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "The name of the worker to get information for."
                }
            },
            required: ["name"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function(args, state) {
        const name = String((args && args.name) || '').trim();
        if (!name) throw new Error('name must be a non-empty worker name.');
        // Scoped exactly like list_workers / delete_worker: a worker is this
        // project's iff its deployed source file lives inside this project's
        // directory (WorkerOwnership.ownedWorkers). Without this, naming any
        // worker on the account returned its live URL and source path — another
        // project's backend, handed to this project's model. Authorization is
        // decided from the account list so a lookup failure fails CLOSED; the
        // details then come from workers.get, which carries file_uid.
        const root = window.projectRootDir(state);
        if (!root) throw new Error('Cannot determine the project directory, so the worker operation was refused for safety.');
        const owned = window.WorkerOwnership.findByName(await puter.workers.list(), name);
        if (!owned || !window.WorkerOwnership.ownedWorkers([owned], root).length) {
            // Same shape as before for a miss, so the model handles it the same
            // way — a foreign worker is simply not this project's to see.
            return { success: false, error: `Worker '${name}' not found in this project.` };
        }
        const worker = await puter.workers.get(owned.name);
        if (!worker) {
            return { success: false, error: `Worker '${owned.name}' not found in this project.` };
        }
        return {
            success: true,
            name: worker.name,
            url: worker.url,
            file_path: worker.file_path,
            file_uid: worker.file_uid,
            created_at: worker.created_at
        };
    }
})
