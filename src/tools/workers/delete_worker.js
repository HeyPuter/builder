window.tools.push({
    type: "function",
    function: {
        name: "delete_worker",
        description: "Deletes one of THIS project's Puter serverless workers and stops its execution. Only workers this project deployed (via create_worker) can be deleted; a worker that belongs to another project on the account is refused.",
        parameters: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "The name of the worker to delete."
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
        // Deployed workers are ACCOUNT-level resources keyed only by name and
        // shared by every project (and every other Puter app) on the account.
        // Unscoped, this call let a confused or prompt-injected model take down
        // ANOTHER project's live backend just by naming it — the same class of
        // hazard the fs tools' path sandbox closes for files. A project owns a
        // worker iff the deployed record's source file lives inside its
        // directory (WorkerOwnership.ownedWorkers — the rule deleteChat and
        // duplicateChat already rely on), so anything else is refused as a
        // model-directed error. The project dir comes from the turn's captured
        // state (window.projectRootDir) so a mid-turn chat switch can't widen
        // the scope, and the lookup goes through the account's worker list so
        // a lookup failure fails CLOSED (nothing is deleted on a blip).
        const root = window.projectRootDir(state);
        if (!root) throw new Error('Cannot determine the project directory, so the worker operation was refused for safety.');
        const worker = window.WorkerOwnership.findByName(await puter.workers.list(), name);
        if (!worker) throw new Error(`Worker '${name}' not found.`);
        if (!window.WorkerOwnership.ownedWorkers([worker], root).length) {
            throw new Error(`Worker '${worker.name}' does not belong to this project (its source file is not inside ${root}), so it cannot be deleted from here. Only workers created by this project can be deleted.`);
        }
        await puter.workers.delete(worker.name);
        return { success: true, name: worker.name };
    }
})
