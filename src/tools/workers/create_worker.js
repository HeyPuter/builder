window.tools.push({
    type: "function",
    function: {
        name: "create_worker",
        description: `Creates and deploys a Puter serverless worker. The worker code must use the router object (automatically available) to define HTTP endpoints.

Example worker code:
  router.get('/', async ({ request }) => { return { message: 'Hello!' }; });
  router.post('/data', async ({ request }) => { const body = await request.json(); return { received: body }; });

Route handlers receive a SINGLE context object that you destructure as ({ request, user, params }) — NOT positional arguments:
- request: the incoming HTTP request (a standard Request object). Read a JSON body with "await request.json()", form data with "await request.formData()", query params via "new URL(request.url).searchParams".
- user: the calling user, with user.puter for that user's OWN resources (KV, FS, AI). ONLY populated when the worker is invoked via puter.workers.exec(); it is undefined for plain fetch() calls.
- params: URL path parameters for dynamic routes (e.g. /posts/:id).

IMPORTANT: "me" is NOT a handler parameter — it is a GLOBAL object available anywhere in the worker, representing the deployer (worker owner). Access the deployer's resources via me.puter (e.g. me.puter.kv.set(...), me.puter.fs, me.puter.ai), NOT me.kv. CORS (including OPTIONS preflight) is handled automatically; only add your own OPTIONS handler if you intend to override it.

Handlers can return: JSON objects, strings, Blob, Uint8Array, ReadableStream, or Response objects.

After deployment, full propagation may take 5-30 seconds across edge servers. Worker size limit is 10MB.`,
        parameters: {
            type: "object",
            properties: {
                name: {
                    type: "string",
                    description: "The name for the worker. Can contain letters, numbers, hyphens, and underscores."
                },
                code: {
                    type: "string",
                    description: "The JavaScript source code for the worker. Uses the router object to define endpoints."
                }
            },
            required: ["name", "code"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function(args, state) {
        const name = String((args && args.name) || '').trim();
        if (!name) throw new Error('name must be a non-empty worker name.');
        // The documented charset, enforced: the name becomes both the source
        // file's basename (workers/<name>.js) and the worker's hostname. A name
        // like "../index" resolved to <root>/index.js — inside the project, so
        // the sandbox let it through — and overwrote the app's entry file.
        const maxLen = window.WorkerOwnership.MAX_NAME_LENGTH || 50;
        if (!new RegExp('^[A-Za-z0-9_-]{1,' + maxLen + '}$').test(name)) {
            throw new Error(`Invalid worker name "${name}": use only letters, numbers, hyphens and underscores (1-${maxLen} characters).`);
        }
        // The project directory, from the turn's captured state so a mid-turn
        // chat switch can't redirect the write (see window.projectRootDir).
        const root = window.projectRootDir(state);
        if (!root) throw new Error('Cannot determine the project directory, so the worker operation was refused for safety.');
        // Write the worker code to a file in the app directory. Validate the
        // computed path so a name containing "/" or ".." can't escape the project
        // directory (returns the normalized in-project path). See assertPathInProject.
        const filePath = window.assertPathInProject(`${root}/workers/${name}.js`, state);
        // Deployed workers are ACCOUNT-level resources keyed only by name, and
        // puter.workers.create() with a name that is already deployed REDEPLOYS
        // that worker — it is the normal update path. So a name that belongs to
        // ANOTHER project would let this project silently replace that project's
        // live backend (the flip side of the hazard delete_worker guards). Refuse
        // unless the name is free or every existing holder is this project's own
        // (ownership = the deployed record's source file lives inside this
        // project's directory, see WorkerOwnership.ownedWorkers). Compared
        // case-insensitively, and read from the account's worker list so a lookup
        // failure fails CLOSED rather than risking a hijack.
        const clashes = window.WorkerOwnership.matchesByName(await puter.workers.list(), name);
        const foreign = clashes.filter(w => !window.WorkerOwnership.ownedWorkers([w], root).length);
        if (foreign.length) {
            throw new Error(`A worker named '${foreign[0].name}' already exists and belongs to a different project, so it cannot be created or redeployed from here. Choose a different name for this project's worker.`);
        }
        await puter.fs.mkdir(`${root}/workers`, { recursive: true });
        // This file lives in the app directory, so it must go through the same
        // write-lock + read-back-verify path as the fs tools: the lock keeps the
        // background preview cache-bust from racing this write, and
        // writeFileVerified confirms the bytes landed before workers.create reads
        // the file. See window.withFileLock / window.writeFileVerified.
        await window.withFileLock(filePath, () => window.writeFileVerified(filePath, args.code));

        const result = await puter.workers.create(name, filePath, { sandbox: true });
        return {
            success: result.success !== false,
            name: name,
            url: result.url,
            errors: result.errors || []
        };
    }
})