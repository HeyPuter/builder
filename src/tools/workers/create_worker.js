window.tools.push({
    type: "function",
    function: {
        name: "create_worker",
        description: `Creates and deploys a new Puter serverless worker. The worker code must use the router object (automatically available) to define HTTP endpoints.

Worker names are shared by everyone on Puter, so Builder adds a short random suffix to the name you give (for example "guestbook" becomes "guestbook-k3x9p2"). Use the name, url and file_path this tool returns everywhere, including set_secret.

To change a worker that is already deployed, do not call this again with its whole code. Edit its source file (the file_path this tool returns, workers/<name>.js in the project) with edit or multi_edit. Saving that file redeploys the worker at the same URL, and the edit's result says whether the new code is live.

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
                    description: "A short name for the worker, which Builder makes unique with a suffix. Can contain letters, numbers, hyphens, and underscores."
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
        const requested = String((args && args.name) || '').trim();
        if (!requested) throw new Error('name must be a non-empty worker name.');
        // The documented charset, enforced: the name becomes both the source
        // file's basename (workers/<name>.js) and the worker's hostname. A name
        // like "../index" resolved to <root>/index.js — inside the project, so
        // the sandbox let it through — and overwrote the app's entry file.
        const WO = window.WorkerOwnership;
        const maxLen = WO.MAX_NAME_LENGTH || 50;
        if (!new RegExp('^[A-Za-z0-9_-]{1,' + maxLen + '}$').test(requested)) {
            throw new Error(`Invalid worker name "${requested}": use only letters, numbers, hyphens and underscores (1-${maxLen} characters).`);
        }
        // A call cut off at the output limit can arrive without its code, and
        // deploying that would replace a live backend with an empty one.
        if (typeof args.code !== 'string' || !args.code.trim()) {
            throw new Error("code is missing. Send the worker's full source in code.");
        }
        // The project directory, from the turn's captured state so a mid-turn
        // chat switch can't redirect the write (see window.projectRootDir).
        const root = window.projectRootDir(state);
        if (!root) throw new Error('Cannot determine the project directory, so the worker operation was refused for safety.');
        // Deployed workers are ACCOUNT-level resources keyed only by name, and
        // puter.workers.create() with a name that is already deployed REDEPLOYS
        // that worker. Names are also shared with everyone else on Puter (the
        // worker's URL, and the 'sandbox-<name>' app it runs as), so a plain
        // name like 'guestbook' is usually another user's, which puter.js
        // reports only as a TypeError. So a call for a worker this project
        // already deployed redeploys it (ownership = the deployed record's
        // source file lives inside this project's directory, see
        // WorkerOwnership.ownedWorkers), and any other call gets a new worker,
        // named after the request plus a suffix (WorkerOwnership.requestedName),
        // the same one every time this project asks for that name. Another
        // project's live backend is never replaced. The account's list is read
        // first, so a lookup failure fails CLOSED.
        const all = await puter.workers.list();
        const mine = WO.ownedForRequest(WO.ownedWorkers(all, root), root, requested);
        let name = mine ? mine.name : null;
        if (!name) {
            // A name another project or another Puter user already holds gets
            // a random suffix instead. Checked before anything is written, so
            // a taken name leaves no file behind.
            const heldElsewhere = async (candidate) => {
                if (WO.matchesByName(all, candidate).length) return true;
                if (!puter.apps || typeof puter.apps.get !== 'function') return false;
                let app;
                try { app = await puter.apps.get('sandbox-' + candidate); } catch (e) { return false; }
                if (!app) return false;
                return !app.owner || app.owner.uuid !== (await puter.getUser()).uuid;
            };
            const taken = (Array.isArray(all) ? all : []).map(w => w && w.name);
            for (let attempt = 0; attempt < 4 && !name; attempt++) {
                const candidate = attempt === 0 ? WO.requestedName(root, requested)
                    : WO.deriveCopyName(WO.newNameStem(requested), taken, WO.randomSuffix);
                if (!candidate) break;
                if (await heldElsewhere(candidate)) taken.push(candidate);
                else name = candidate;
            }
        }
        if (!name) throw new Error('Could not pick a free name for the worker. Call create_worker again.');
        // Write the worker code to a file in the app directory. Validate the
        // computed path so a name containing "/" or ".." can't escape the project
        // directory (returns the normalized in-project path). See assertPathInProject.
        const filePath = window.assertPathInProject(`${root}/workers/${name}.js`, state);
        // Hand edits to this backend in the Code view must not be replaced from
        // the model's memory: it reads the file again first (see write.js).
        await window.CodeEditor?.assertModelMayOverwrite?.(filePath);
        await puter.fs.mkdir(`${root}/workers`, { recursive: true });
        // This file lives in the app directory, so it must go through the same
        // write-lock + read-back-verify path as the fs tools: the lock keeps the
        // background preview cache-bust from racing this write, and
        // writeFileVerified confirms the bytes landed before workers.create reads
        // the file. See window.withFileLock / window.writeFileVerified.
        await window.withFileLock(filePath, () => window.writeFileVerified(filePath, args.code));

        let result;
        try {
            result = await puter.workers.create(name, filePath, { sandbox: true });
        } catch (e) {
            // puter.js reads the owner of the 'sandbox-<name>' app, which it
            // can't see when another Puter user holds the name (one who took it
            // since the check above). The next call sees it held and picks
            // another.
            const msg = typeof extractErrorText === 'function' ? extractErrorText(e) : String((e && e.message) || e);
            if (/reading 'uuid'|not owned by you/i.test(msg)) {
                throw new Error(`The worker name '${name}' is already taken by another Puter user. Call create_worker again, and Builder will pick another name.`);
            }
            throw e;
        }
        const out = {
            success: result.success !== false,
            name: name,
            url: result.url,
            file_path: filePath,
            errors: result.errors || []
        };
        if (name !== requested) out.note = `Builder named this worker '${name}' so its name is unique on Puter. Use this name and url from now on.`;
        return out;
    }
})