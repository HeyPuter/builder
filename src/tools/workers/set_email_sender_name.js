// set_email_sender_name — the name recipients see on email one of this
// project's backends sends (see js/worker-sender.js). The address stays a
// Puter address; only the name next to it changes.
//
// Sets it on the preview's backend and, when the site is published, on the
// live one too, so the user asks once and both send under the same name.
// Before the first publish only the preview has a backend, and publishing
// copies the name over by itself.
window.tools.push({
    type: "function",
    function: {
        name: "set_email_sender_name",
        description: "Sets the sender name recipients see on email that one of THIS project's backends (a worker made with create_worker) sends with puter.email.sendTransactional, for example \"Makor Family Portal\". The address after the name is always a Puter address and can't be changed. Only the name can. A backend's sender name starts out as its internal name (sandbox-<worker name>), so set one whenever a backend sends email. Use the name the user asked for, or else the site's or business's name. Sets the preview and, if the site is published, the live site too, and publishing copies it to the live site later. Pass an empty name to go back to the default.",
        parameters: {
            type: "object",
            properties: {
                worker: {
                    type: "string",
                    description: "The name of this project's worker that sends the email."
                },
                name: {
                    type: "string",
                    description: "The sender name recipients should see, at most 78 characters, with no @, quotes, backslashes or angle brackets. An empty string puts the default back."
                }
            },
            required: ["worker", "name"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function (args, state) {
        const WSN = window.WorkerSender;
        // What the AI should do when the name can't be set.
        function refusal(reason, length, workerName) {
            const why = {
                'too-long': `That name is ${length} characters long, and a sender name can be at most 78. Ask the user for a shorter one.`,
                'bad-chars': 'A sender name can\'t contain @, quotes, backslashes, angle brackets or line breaks. It\'s only the name people see, not an email address, so ask the user for a name without them.',
                'no-app': 'This backend doesn\'t run as an app of its own, so its sender name can\'t be set. Tell the user in one short sentence.',
                forbidden: `Puter didn't let Builder rename this backend, probably because it was first set up outside Builder. Tell the user they can set the name themselves: open the Dev Center at https://puter.com/app/dev-center, find the app named sandbox-${workerName || 'the worker name'}, change its title to the name they want, and save.`,
                failed: 'Setting the sender name failed. Try once more, and if it fails again tell the user.',
            };
            return why[reason] || why.failed;
        }
        if (!WSN) throw new Error('The sender name can’t be set in this version of Builder.');
        const worker = String((args && args.worker) || '').trim();
        const raw = String((args && args.name) || '');
        if (!worker) throw new Error('worker must be the name of one of this project\'s workers.');
        const reset = !raw.trim();
        let name = null;
        if (!reset) {
            const c = WSN.check(raw);
            if (!c.ok) return { success: false, error: refusal(c.reason, c.length) };
            name = c.name;
        }
        // Only this project's own backends, by the same ownership rule the
        // other worker tools use, read from the account's worker list so a
        // lookup failure refuses instead of guessing.
        const root = window.projectRootDir(state);
        if (!root) throw new Error('Cannot determine the project directory, so the sender name was not changed.');
        const all = await puter.workers.list();
        const record = window.WorkerOwnership.findByName(all, worker);
        if (!record) throw new Error(`Worker '${worker}' not found. Create it with create_worker first, then set its sender name.`);
        if (!window.WorkerOwnership.ownedWorkers([record], root).length) {
            throw new Error(`Worker '${record.name}' does not belong to this project, so its sender name can't be changed here.`);
        }

        const r = await WSN.set(record.name, reset ? '' : name);
        if (!r.ok) return { success: false, error: refusal(r.reason, r.length, record.name) };

        // The published copy of this backend, owned the way publishing owns
        // it: deployed from this project's published folder.
        let live = 'not-published';
        const chatId = (state && state.currentChatId) || (typeof currentChatId !== 'undefined' ? currentChatId : '');
        const liveName = chatId && window.liveWorkerName ? window.liveWorkerName(record.name) : '';
        const liveRecord = liveName ? window.WorkerOwnership.findByName(all, liveName) : null;
        if (liveRecord && window.publishedDirForChat &&
            window.WorkerOwnership.ownedWorkers([liveRecord], window.publishedDirForChat(chatId)).length) {
            const lr = await WSN.set(liveRecord.name, reset ? '' : name);
            live = lr.ok ? 'updated' : 'failed';
        }

        const shown = reset ? `its default name (sandbox-${record.name})` : `"${name}"`;
        const where = live === 'updated' ? 'on the preview and the live site' : 'on the preview';
        const after = live === 'updated' ? ''
            : live === 'failed' ? ' The live site’s backend couldn’t be changed this time, so its email still uses the old name. Publishing again copies the name to it.'
            : ' The site isn’t published yet. Publishing gives the live site the same name by itself.';
        return {
            success: true,
            worker: record.name,
            sender_name: name,
            live,
            note: `Email from this backend ${where} now goes out as ${shown}.${after} The address after the name is always a Puter address and can't be changed. Tell the user in one short sentence.`,
        };
    }
});

