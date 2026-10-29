// set_secret — save an API key into one of this project's backends, in that
// worker's own private key-value store (see js/worker-secrets.js). The key
// never goes into a file: not the worker's code, not the project, not a
// version, not the draft site, not GitHub. The worker reads it at run time
// with me.puter.kv.get('secret:<NAME>').
//
// With live, the key goes only into the published copy of that backend
// ("<name>-live", see deployPublishedWorkers in ui.js), and publishing never
// replaces it. That's how the live site gets a live payment key while the
// preview keeps a test key. It's the one way the AI reaches the live backend,
// and it can only save a key there, never change its code.
//
// A dynamic backend (__workers/<name>.worker.js, see js/site-backends.js)
// runs as its site's own app, so its key goes into the preview site's store,
// shared by every backend of the site, and with live into the live site's.
//
// The result never repeats the key, so it doesn't spread further through the
// conversation than the message the user pasted it in.
window.tools.push({
    type: "function",
    function: {
        name: "set_secret",
        description: "Saves an API key or other secret for one of THIS project's backends (a worker made with create_worker), in that worker's own private key-value store. Use it for every key the user gives you, such as a Stripe or Whop key or any other API key, and never write a key into any file. Create or update the worker first, then call this. In the worker, read the key inside a route handler with await me.puter.kv.get('secret:NAME'). The user may be asked once to allow Builder to give keys to that backend. Publishing copies the preview's keys to the live site by itself. For a key only the live site should use, such as a live payment key while the preview keeps a test key, set live to true. That needs the site published first.",
        parameters: {
            type: "object",
            properties: {
                worker: {
                    type: "string",
                    description: "The name of this project's worker that uses the key."
                },
                name: {
                    type: "string",
                    description: "The key's name in UPPER_SNAKE_CASE, for example STRIPE_SECRET_KEY."
                },
                value: {
                    type: "string",
                    description: "The key itself, exactly as the user gave it."
                },
                live: {
                    type: "boolean",
                    description: "false saves the key for the preview, and publishing copies it to the live site. true saves it only for the live (published) site, where publishing never replaces it. Use true only for a key the live site should have instead of the preview's, such as a live payment key."
                }
            },
            required: ["worker", "name", "value", "live"],
            additionalProperties: false
        },
        strict: true
    },
    // What a project with dynamic backends is told instead (see
    // SiteBackends.toolsFor).
    dynamic: {
        description: "Saves an API key or other secret for one of THIS project's backends (a file in __workers/, or an older worker made with create_worker), in its own private key-value store, which every backend of the site shares. Use it for every key the user gives you, such as a Stripe or Whop key or any other API key, and never write a key into any file. Write the backend's file and open the preview first, then call this. In the backend, read the key inside a route handler with await me.puter.kv.get('secret:NAME'). The user may be asked once to allow Builder to give keys to that site. Publishing copies the preview's keys to the live site by itself. For a key only the live site should use, such as a live payment key while the preview keeps a test key, set live to true. That needs the site published first.",
        parameters: {
            worker: "The name of this project's backend that uses the key: the file name in __workers/ without .worker.js, or an older worker's name."
        }
    },
    exec: async function (args, state) {
        const WS = window.WorkerSecrets;
        if (!WS) throw new Error('Keys can’t be saved in this version of Builder.');
        const worker = String((args && args.worker) || '').trim();
        const name = String((args && args.name) || '').trim();
        if (!worker) throw new Error('worker must be the name of one of this project\'s workers.');
        if (!WS.validName(name)) throw new Error(`Invalid key name "${name}": use UPPER_SNAKE_CASE letters, digits and underscores, starting with a letter (for example STRIPE_SECRET_KEY).`);
        // Only this project's own backends, by the same ownership rule
        // create_worker and delete_worker use, read from the account's worker
        // list so a lookup failure refuses instead of guessing.
        const root = window.projectRootDir(state);
        if (!root) throw new Error('Cannot determine the project directory, so the key was not saved.');
        const live = !!(args && args.live);
        const value = String((args && args.value) || '');
        // For a dynamic backend, the key goes into the store of the site that
        // runs it, the preview's, or the live site's with live.
        const SB = window.SiteBackends;
        const site = SB?.siteOf(state) || null;
        const backends = site ? (await SB.list(site.servedDir)).map(b => b.name) : [];
        if (backends.includes(worker)) {
            const siteUrl = live ? site.publishedUrl : site.previewUrl;
            if (!siteUrl) {
                return { success: false, error: live
                    ? 'The site isn’t published yet, so it has no live backend to hold this key. Ask the user to publish first, then save the key again with live set to true.'
                    : 'The preview isn’t open yet, so the backend isn’t running anywhere to hold this key. Open the preview with publish_site, then save the key again.' };
            }
            const r = await WS.set({ site: siteUrl, backends }, name, value, { liveOnly: live });
            if (r.ok) {
                return {
                    success: true,
                    worker,
                    name,
                    live,
                    read_it_with: `await me.puter.kv.get('secret:${name}')`,
                    note: live
                        ? 'The key is saved only in the live site’s store, which all of its backends share. The live site uses it from the next request, the preview keeps its own, and publishing never replaces it. The code stays the same. Never write the key into a file or repeat it in your replies.'
                        : 'The key is saved in the preview’s private store, which all of this site’s backends share. Read it inside a route handler, never at the top of the script. The site’s pages run as the same app, so never read a secret: key from browser code, never write the key into a file, and never repeat it in your replies.',
                };
            }
            const why = {
                declined: 'The user didn\'t allow Builder to give keys to this site, so the backend can\'t use the key yet. Tell the user in one short sentence, and offer to try again when they\'re ready (calling set_secret again asks them again).',
                'no-app': live
                    ? 'The live site doesn’t run this backend yet, so it has no store to hold the key. Ask the user to publish first, then save the key again with live set to true.'
                    : 'The backend didn’t start on the preview, so the site has no store to hold the key yet. Check that the backend’s file is valid (saving it says whether it runs), then save the key again.',
                empty: 'The key is empty. Ask the user for the key.',
                'too-long': 'That is too long to be a key. Ask the user to check what they pasted.',
                failed: 'Saving the key failed. Try once more, and if it fails again tell the user.',
            };
            return { success: false, error: why[r.reason] || why.failed };
        }
        const all = await puter.workers.list();
        const record = window.WorkerOwnership.findByName(all, worker);
        if (!record) {
            throw new Error(site
                ? `Backend '${worker}' not found. Write its file, __workers/${worker}.worker.js in the folder the preview serves, first, then save the key.`
                : `Worker '${worker}' not found. Create it with create_worker first, then save the key.`);
        }
        if (!window.WorkerOwnership.ownedWorkers([record], root).length) {
            throw new Error(`Worker '${record.name}' does not belong to this project, so it can't hold this project's keys.`);
        }
        let target = record.name;
        if (live) {
            // The published copy of this backend, owned the way publishing
            // owns it, by being deployed from this project's published folder.
            const chatId = (state && state.currentChatId) || (typeof currentChatId !== 'undefined' ? currentChatId : '');
            const liveName = chatId && window.liveWorkerName ? window.liveWorkerName(record.name) : '';
            const liveRecord = liveName ? window.WorkerOwnership.findByName(all, liveName) : null;
            if (!liveRecord || !window.WorkerOwnership.ownedWorkers([liveRecord], window.publishedDirForChat(chatId)).length) {
                return { success: false, error: 'The site isn’t published yet, so it has no live backend to hold this key. Ask the user to publish first, then save the key again with live set to true.' };
            }
            target = liveRecord.name;
        }
        const r = await WS.set(target, name, value, { liveOnly: live });
        if (r.ok) {
            return {
                success: true,
                worker: target,
                name,
                live,
                read_it_with: `await me.puter.kv.get('secret:${name}')`,
                note: live
                    ? `The key is saved only in the live site’s backend ${target}. The live site uses it from the next request, the preview keeps its own, and publishing never replaces it. The worker’s code stays the same. Never write the key into a file or repeat it in your replies.`
                    : `The key is saved only in the backend ${target}. Read it inside a route handler, never at the top of the script, and never write it into a file or repeat it in your replies.`,
            };
        }
        const why = {
            declined: 'The user didn\'t allow Builder to give keys to this backend, so it can\'t use the key yet. Tell the user in one short sentence, and offer to try again when they\'re ready (calling set_secret again asks them again).',
            'no-app': 'This backend has no private store of its own, so it can\'t hold a key. Recreate it with create_worker, then save the key again.',
            empty: 'The key is empty. Ask the user for the key.',
            'too-long': 'That is too long to be a key. Ask the user to check what they pasted.',
            failed: 'Saving the key failed. Try once more, and if it fails again tell the user.',
        };
        return { success: false, error: why[r.reason] || why.failed };
    }
});
