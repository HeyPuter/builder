// AppTests — read, save or delete the app's hidden tests (see js/app-tests.js
// for where they live, how they run and why the user never sees them).
// update_preview runs them; this tool only stores them. Offered only while
// FEATURE_FLAGS.appTests is on (available(), see builtinTools in tools.js).
// Not strict: its inputs are simple, and Claude allows at most 20 strict tools
// (scripts/test-mcp.mjs). Not a mutating tool
// (js/versions.js): the tests sit in the project's .puter/ folder, so the
// snapshot of any turn that changes the app already carries them, and a turn
// that only adjusts a test doesn't add a version the user can't tell apart.
window.tools.push({
    available: () => !!(window.FEATURE_FLAGS && window.FEATURE_FLAGS.appTests),
    type: "function",
    function: {
        name: "AppTests",
        description: "Reads, saves or deletes this app's automated tests. The user never sees them: they are kept outside the app's files, downloads and published site. update_preview runs them in an invisible copy of the app after every change and reports failures in its verification field. action \"write\" replaces all the tests with code, \"read\" returns them (empty if there are none), \"delete\" removes them.\n" +
            "code is plain JavaScript (no import/export) that runs inside the app's page, with these available:\n" +
            "- test(name, fn) or test(name, { page: 'about.html', mobile: true, timeout: 15000 }, fn): registers a test; fn may be async. Each page's tests run in order on one fresh load of that page (the main page by default; 1280x800, or 390x844 with mobile) and share its state. Default timeout 10s, at most 30s.\n" +
            "- await click(target), await fill(target, value), await press(target, key): act like a user. target is a CSS selector or an element; add { text: 'Add to cart' } as the last argument to pick the element containing that text. key is a key's name as in KeyboardEvent.key ('Enter', 'ArrowLeft', 'a', '1', or 'Space'). Each waits up to 3s for the element to be visible and enabled. fill also sets checkboxes (true/false), selects (an option value) and sliders (a number).\n" +
            "- await text(target) gives its trimmed text (the value for fields), await find(target) the element, visible(target) whether it is visible now; $(selector) and $$(selector) query the page.\n" +
            "- await waitFor(target or () => condition, { hidden, timeout }): waits (5s default) for an element to be visible, or hidden with hidden: true, or for the function to return something truthy.\n" +
            "- expect(value).toBe, toEqual, toContain, toMatch, toHaveLength, toBeTruthy, toBeFalsy, toBeNull, toBeGreaterThan, toBeLessThan, toBeCloseTo, each also after .not.\n" +
            "- dialogs lists the alert/confirm/prompt calls made during the current test (the first test also sees those from page load) as { type, message }; confirm answers true. setAIReply(text) sets what puter.ai.chat answers: called at the top level, for every test; inside a test, for the rest of that test.\n" +
            "While tests run, localStorage, sessionStorage and puter.kv start with the real data but writes stay in memory, AI calls return placeholders, the clipboard is the test's own (await navigator.clipboard.readText() gives what the app copied), and changing files with puter.fs, signing in or out, sending email or notifications, live AI conversations (puter.ai.convo), and requests that change data on the app's workers are refused, so the user's data is never touched; don't test flows that need those. IndexedDB and cookies are NOT protected: never write a test that saves, changes or deletes data the app keeps there. The camera, microphone, location and popups are not available, so don't test flows that need them either. A test that makes the page navigate or reload ends that page's tests. Write 3 to 10 short tests of the main user flows, check what a user would see, and don't depend on existing data, exact timing, or wording the user didn't ask for.",
        parameters: {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    enum: ["read", "write", "delete"],
                    description: "read, write (replace all the tests) or delete."
                },
                code: {
                    type: "string",
                    description: "For write: the complete tests. Not needed for read and delete."
                }
            },
            required: ["action"],
            additionalProperties: false
        }
    },
    exec: async function (args, state) {
        const T = window.AppTests;
        if (!T || !T.enabled()) throw new Error('Tests are not available in this version of Builder.');
        if (window.isAborted?.(state?.abortController) || window.isStaleTurn?.(state)) return { success: false, error: 'This turn has ended.' };
        const appDir = window.projectRootDir(state);
        if (!appDir) throw new Error('Cannot determine the project directory.');
        const action = args && args.action;
        if (action === 'read') {
            const code = await T.read(appDir);
            return code ? { success: true, code } : { success: true, code: '', note: 'This app has no tests yet.' };
        }
        if (action === 'delete') {
            await T.remove(appDir);
            return { success: true };
        }
        if (action === 'write') {
            if (typeof args.code !== 'string') throw new Error('code is missing. Send the complete tests in code.');
            await T.write(appDir, args.code);
            return { success: true, note: 'Saved. update_preview runs them.' };
        }
        throw new Error('action must be "read", "write" or "delete".');
    }
});
