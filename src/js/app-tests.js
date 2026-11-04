// app-tests.js — the builder side of an app's hidden tests.
//
// For apps with behaviour worth protecting, the AI keeps a few automated tests
// (the AppTests tool). After every change, update_preview runs them in an
// invisible copy of the app and hands any failures back to the AI, so it fixes
// a broken feature before the user ever sees it. The user is never shown the
// tests or their results:
//
//   * They live in the project's .puter/ folder (TESTS_REL), which the Code
//     view, GitHub sync, the zip download, the AI's readdir/search and the
//     preview's page scan all skip. Version snapshots, restores and Duplicate
//     copy the whole project folder, so a version keeps the tests that match
//     it. Publishing drops them from the release (stagePublishRelease in ui.js).
//   * They reach the app by postMessage, never as a page or script the app
//     loads, and run in a hidden, sandboxed frame (no dialogs, popups,
//     downloads, autoplay or device access) that never takes keyboard focus
//     from the builder for long (guardFocus).
//   * Inside that frame, half 3 of src/runtime.js keeps storage writes in
//     memory, answers AI calls with placeholders (no cost) and refuses
//     changes to files, sign-in and the app's backend data.
//
// Speed: the run starts the moment the visible preview has loaded and overlaps
// verifyPreview's watch for runtime errors (ui.js); an app without tests costs
// one file read, done while the preview reloads. Every wait is capped
// (timing.budget for the whole run, timing.ack for the runner to answer).
//
// Conservative like verifyPreview: anything that is not a test failing on the
// fresh app (no runner in the page, an older runtime.js, a page whose policy
// forbids eval, a stopped turn) is 'unavailable' or 'skipped', never a failure,
// so a healthy app is never sent back to the AI as broken. A failing group is
// run once more in a fresh frame and only tests failing both times count, so a
// flaky test can't cost the user an AI round.
//
// scripts/test-app-tests.mjs covers this file and the runner.
(function () {
    'use strict';

    const TESTS_REL = '.puter/builder/tests.js';
    const MAX_CODE = 100000;        // same cap as the runner (src/runtime.js)
    const FRAME_NAME = 'puter-test-runner';
    // How long to wait, in ms. An object so scripts/test-app-tests.mjs can
    // shorten them.
    const timing = {
        ack: 4000,      // the runner answers within this of the page loading
        load: 20000,    // the page itself must load within this
        budget: 45000,  // the whole run, every page and the retry
        poll: 250,
        start: 50,      // between adding the frame and loading the app in it
    };
    const MAX_GROUPS = 4;           // distinct pages / sizes per run
    const MAX_REPORTED = 8;         // failures handed to the AI
    const MAX_NAME = 120;
    const MAX_ERROR = 400;
    const SIZES = { desktop: { w: 1280, h: 800 }, mobile: { w: 390, h: 844 } };

    const enabled = () => !!(window.FEATURE_FLAGS && window.FEATURE_FLAGS.appTests);

    function testsPath(appDir) {
        const root = String(appDir || '').replace(/\/+$/, '');
        return root ? root + '/' + TESTS_REL : '';
    }

    function notFound(e) {
        if (typeof isNotFoundError === 'function') return isNotFoundError(e);
        const msg = String((e && (e.message || (e.error && e.error.message))) || e || '').toLowerCase();
        return msg.includes('not found') || msg.includes('does not exist') || msg.includes('no such');
    }

    // The saved tests, or null when there are none.
    async function read(appDir) {
        const path = testsPath(appDir);
        if (!path) return null;
        try {
            const text = await puter.fs.read(path).then(b => b.text());
            return typeof text === 'string' && text.trim() ? text : null;
        } catch (e) {
            if (notFound(e)) return null;
            throw e;
        }
    }

    // The names the runner hands the tests (API_NAMES in src/runtime.js; the
    // two lists must match). The check below compiles with all of them, so a
    // test that redeclares one (`const sleep = …`) is refused here, as the
    // runner would refuse it, instead of after a whole preview round.
    const API_NAMES = ['test', 'expect', '$', '$$', 'find', 'click', 'fill', 'press', 'text', 'visible',
        'waitFor', 'sleep', 'dialogs', 'setAIReply'];

    // A syntax error found now saves the AI a whole preview round. Compile
    // only (nothing runs); a builder page that forbids eval just skips this.
    function syntaxError(code) {
        let Ctor;
        try { Ctor = Object.getPrototypeOf(async function () {}).constructor; } catch (e) { return null; }
        try { new Ctor(...API_NAMES, code); return null; }
        catch (e) { return e && e.name === 'SyntaxError' ? e.message : null; }
    }

    async function write(appDir, code) {
        const path = testsPath(appDir);
        if (!path) throw new Error('Cannot determine the project directory, so the tests were not saved.');
        if (typeof code !== 'string' || !code.trim()) throw new Error('code is empty. To remove the tests, use action "delete".');
        if (code.length > MAX_CODE) throw new Error(`The tests are ${code.length} characters; keep them under ${MAX_CODE}. Test the main flows only.`);
        const bad = syntaxError(code);
        if (bad) throw new Error('The tests have a syntax error, so they were not saved: ' + bad);
        await window.withFileLock(path, () => window.writeFileVerified(path, code));
    }

    async function remove(appDir) {
        const path = testsPath(appDir);
        if (!path) throw new Error('Cannot determine the project directory.');
        try { await puter.fs.delete(path); }
        catch (e) { if (!notFound(e)) throw e; }
    }

    // ---- Pure helpers (exported for the tests) ------------------------------

    function groupKey(g) { return (g.page || '') + '|' + (g.mobile ? 'mobile' : 'desktop'); }

    // The address of a group's page, or null when it isn't a page of this app.
    function groupUrl(baseUrl, group) {
        let base, url;
        try { base = new URL(baseUrl); url = new URL(group.page || '', base); } catch (e) { return null; }
        if (url.origin !== base.origin) return null;
        url.hash = '';
        // A fresh address each time, like the visible preview's reload, so
        // nothing on the way serves an older copy of the page.
        url.searchParams.set('__pv', Date.now() + '_' + Math.random().toString(36).slice(2, 8));
        return url.href;
    }

    function cleanText(s, max) {
        const t = String(s == null ? '' : s).replace(/[`\r\n\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();
        return t.length > max ? t.slice(0, max) + '…' : t;
    }

    // A result the frame posted. The frame runs the app's code, so nothing in
    // it is trusted beyond its shape.
    function cleanResult(r) {
        if (!r || typeof r !== 'object') return null;
        return {
            name: cleanText(r.name, MAX_NAME) || 'Unnamed test',
            passed: r.passed === true,
            error: r.passed === true ? '' : (cleanText(r.error, MAX_ERROR) || 'Failed.'),
        };
    }

    function cleanGroups(groups) {
        const out = [];
        for (const g of Array.isArray(groups) ? groups : []) {
            if (!g || typeof g !== 'object') continue;
            const clean = { page: cleanText(g.page, 200), mobile: g.mobile === true };
            if (!out.some(o => groupKey(o) === groupKey(clean))) out.push(clean);
        }
        return out;
    }

    // Where a failing test ran, for the AI ('' for the main page at desktop size).
    function groupLabel(g) {
        const parts = [];
        if (g.page) parts.push('on ' + g.page);
        if (g.mobile) parts.push('at phone size');
        return parts.join(', ');
    }

    // A first run and its retry: a test counts as failed only if it failed both
    // times. A test the retry never reached keeps its first result. Both runs
    // go through the page's tests in the same order, so a test is matched by
    // its place, not its name (two tests may share one, and a passing one
    // must not stand in for the other).
    function mergeRetry(first, retry) {
        if (!retry) return first;
        const again = retry.results || [];
        return Object.assign({}, first, {
            results: (first.results || []).map((r, i) => {
                if (r.passed) return r;
                const a = again[i];
                return a && a.name === r.name && a.passed ? a : r;
            }),
        });
    }

    // Everything the runs found, as verifyPreview reports it.
    function summarize(runs) {
        const failures = [];
        let total = 0, passed = 0;
        for (const run of runs) {
            const where = groupLabel(run.group);
            if (run.setupError) {
                failures.push({ name: 'Setting up the tests', error: run.setupError, where: '' });
                continue;
            }
            if (run.badPage) {
                failures.push({ name: 'Tests for ' + JSON.stringify(run.group.page), error: 'That isn\'t a page of this app, so its tests did not run.', where: '' });
                continue;
            }
            for (const r of run.results || []) {
                total++;
                if (r.passed) passed++;
                else failures.push({ name: r.name, error: r.error, where });
            }
            if (run.left) {
                failures.push({
                    name: run.left,
                    error: 'The page navigated away or reloaded during this test, so the rest of this page\'s tests did not run. Tests must stay on their page (use { page } for another page).',
                    where,
                });
            }
        }
        return {
            status: failures.length ? 'failed' : 'passed',
            total,
            passed,
            failures: failures.slice(0, MAX_REPORTED),
            moreFailures: Math.max(0, failures.length - MAX_REPORTED),
        };
    }

    // ---- Running ------------------------------------------------------------

    function newRunId() {
        try { return crypto.randomUUID(); } catch (e) { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
    }

    // While a test frame exists it must never keep keyboard focus: the user may
    // be typing their next message, and keys would go to the hidden app. A test
    // that focuses a field can pull focus into the frame; the builder's window
    // then gets a blur, and focus goes straight back to whatever had it here.
    // Not from inside that blur: refocusing while the browser is still moving
    // focus into the frame leaves the builder's element looking active while
    // the frame keeps getting the keys. Just after it, the frame is plainly
    // the active element and taking focus back works, so the check runs a few
    // times over the next moment. Removing a focused frame drops focus to the
    // page body, so stop() gives it back too.
    //
    // "Whatever had it" is followed on every check, not only on focusin: focus
    // moving into the visible preview (the user trying their app while the
    // tests run) fires no focusin here, and giving focus back to the composer
    // then would send what they type for their app into the chat.
    function guardFocus(frame) {
        const usable = (el) => !!el && el !== frame && el !== document.body;
        let last = usable(document.activeElement) ? document.activeElement : null;
        const giveBack = () => {
            const now = document.activeElement;
            if (now !== frame) { if (usable(now)) last = now; return; }
            if (last && last.isConnected && typeof last.focus === 'function') {
                try { last.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
            }
            if (document.activeElement === frame) { try { frame.blur(); } catch (e) { /* ignore */ } }
        };
        const soon = () => { for (const ms of [0, 50, 150, 400]) setTimeout(giveBack, ms); };
        const onFocusIn = (e) => {
            if (e.target === frame) soon();
            else if (e.target && e.target !== document.body) last = e.target;
        };
        document.addEventListener('focusin', onFocusIn, true);
        window.addEventListener('blur', soon, true);
        return {
            check: giveBack,
            stop: () => {
                giveBack();
                // Only focus the frame still holds is given back once it is
                // gone; focus the user moved away themselves stays where it is.
                const held = document.activeElement === frame;
                document.removeEventListener('focusin', onFocusIn, true);
                window.removeEventListener('blur', soon, true);
                return () => {
                    // After the frame is gone: focus it held went to the body.
                    const a = document.activeElement;
                    if (held && (!a || a === document.body) && last && last.isConnected) {
                        try { last.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
                    }
                };
            },
        };
    }

    // Load one page in a fresh hidden frame and run the tests meant for it.
    // Always resolves. { unavailable } when the page has no runner (or can't
    // run tests), { aborted } when the turn ended, else the group's results.
    function runGroup(opts) {
        const { baseUrl, code, group, aborted, deadline } = opts;
        const url = groupUrl(baseUrl, group);
        if (!url) return Promise.resolve({ group, badPage: true, results: [] });
        const origin = new URL(url).origin;
        const runId = newRunId();
        const size = group.mobile ? SIZES.mobile : SIZES.desktop;

        return new Promise((resolve) => {
            const frame = document.createElement('iframe');
            frame.name = FRAME_NAME;
            frame.title = '';
            frame.tabIndex = -1;
            frame.setAttribute('aria-hidden', 'true');
            // Fewer powers than the visible preview: no allow-modals,
            // allow-popups, allow-downloads or top navigation, and nothing in
            // `allow`, so no autoplay, camera, microphone or location prompt.
            frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
            frame.setAttribute('allow', '');
            frame.setAttribute('loading', 'eager');
            // On screen (browsers throttle timers and animation frames in
            // off-screen cross-origin frames) but invisible and untouchable.
            frame.style.cssText = 'position:fixed;left:0;top:0;width:' + size.w + 'px;height:' + size.h + 'px;' +
                'border:0;margin:0;padding:0;opacity:0;pointer-events:none;z-index:-1;visibility:visible;';

            const results = [];
            let loads = 0, acked = false, current = null, finished = false, plan = null;
            let resend = null;
            const startedAt = Date.now();
            const focus = guardFocus(frame);

            function finish(out) {
                if (finished) return;
                finished = true;
                clearInterval(ticker);
                clearInterval(resend);
                window.removeEventListener('message', onMessage);
                const refocus = focus.stop();
                try { frame.src = 'about:blank'; } catch (e) { /* ignore */ }
                try { frame.remove(); } catch (e) { /* ignore */ }
                refocus();
                // What the runner announced, for a run that ended before its
                // own report (it left the page, or ran out of time).
                if (plan && !out.groups) out.groups = plan.groups;
                resolve(Object.assign({ group }, out));
            }

            function send() {
                try {
                    frame.contentWindow.postMessage({ type: 'puter-tests-run', runId, code, page: group.page, mobile: group.mobile }, origin);
                } catch (e) { /* frame gone or on another origin: the ack timer decides */ }
            }

            function onMessage(e) {
                if (finished || !frame.contentWindow || e.source !== frame.contentWindow || e.origin !== origin) return;
                const d = e.data;
                if (!d || typeof d !== 'object' || d.runId !== runId) return;
                if (d.type === 'puter-tests-ack') {
                    acked = true;
                    clearInterval(resend);
                } else if (d.type === 'puter-tests-plan') {
                    plan = { groups: cleanGroups(d.groups) };
                } else if (d.type === 'puter-tests-progress') {
                    current = cleanText(d.name, MAX_NAME) || null;
                } else if (d.type === 'puter-tests-result') {
                    const r = cleanResult(d.result);
                    if (r) results.push(r);
                    current = null;
                } else if (d.type === 'puter-tests-done') {
                    if (d.unavailable) return finish({ unavailable: true });
                    if (d.setupError) return finish({ setupError: cleanText(d.setupError, MAX_ERROR) });
                    const final = Array.isArray(d.results) ? d.results.map(cleanResult).filter(Boolean) : results;
                    finish({ results: final, groups: cleanGroups(d.groups), dropped: Math.max(0, +d.dropped || 0) });
                }
            }

            frame.addEventListener('load', () => {
                if (finished) return;
                // Some engines fire a load for the frame's initial blank
                // document. The app's page is cross-origin, so reading its
                // address throws; a readable about:blank is that initial one.
                try { if (frame.contentWindow.location.href === 'about:blank') return; } catch (e) { /* the app's page */ }
                loads++;
                if (acked) {
                    // The app navigated or reloaded the frame mid-run.
                    return finish({ results: results.slice(), left: current || 'A test' });
                }
                // First load, or a redirect before the runner answered: (re)send
                // until it acks, a few times, in case its listener is late.
                send();
                clearInterval(resend);
                let tries = 0;
                resend = setInterval(() => { if (!acked && ++tries <= 6) send(); else clearInterval(resend); }, 500);
            });

            let loadedAt = 0;
            const ticker = setInterval(() => {
                if (finished) return;
                focus.check();
                if (aborted()) return finish({ aborted: true });
                const now = Date.now();
                if (loads > 0 && !loadedAt) loadedAt = now;
                if (!loads && now - startedAt > timing.load) return finish({ unavailable: true });
                if (loadedAt && !acked && now - loadedAt > timing.ack) return finish({ unavailable: true });
                // Out of time for the whole run: keep what finished. The test
                // still running isn't blamed; the cap is the builder's, not
                // the test's own timeout.
                if (now > deadline) return finish({ results: results.slice(), outOfTime: true });
            }, timing.poll);

            window.addEventListener('message', onMessage);
            // In the page first, at its size, and only then pointed at the
            // app: a frame given its address before it has been laid out can
            // start the app with a 0x0 window (a canvas game sized from
            // innerWidth would be broken in the test and nowhere else).
            document.body.appendChild(frame);
            void frame.getBoundingClientRect();
            setTimeout(() => { if (!finished) frame.src = url; }, timing.start);
        });
    }

    // Run every test against the app at `baseUrl`. Resolves to
    // { status: 'passed' | 'failed' | 'none' | 'unavailable' | 'skipped', ... }.
    async function run({ baseUrl, code, aborted }) {
        if (!enabled() || !baseUrl || typeof code !== 'string' || !code.trim()) return { status: 'none' };
        const isAborted = () => { try { return typeof aborted === 'function' && !!aborted(); } catch (e) { return true; } };
        // A builder tab in the background has its timers slowed to about one a
        // second, the test frame's with it, so tests can time out for no
        // fault of the app. Failures from such a run aren't trusted.
        let wasHidden = document.visibilityState === 'hidden';
        const onVisibility = () => { if (document.visibilityState === 'hidden') wasHidden = true; };
        document.addEventListener('visibilitychange', onVisibility);
        try {
            const out = await runAll(common());
            if (out.status === 'failed' && wasHidden) return { status: 'skipped', reason: 'hidden' };
            return out;
        } finally {
            document.removeEventListener('visibilitychange', onVisibility);
        }
        function common() { return { baseUrl, code, aborted: isAborted, deadline: Date.now() + timing.budget }; }
    }

    async function runAll(common) {
        const deadline = common.deadline;
        const main = { page: '', mobile: false };
        const first = await runGroup(Object.assign({ group: main }, common));
        if (first.aborted) return { status: 'skipped' };
        if (first.unavailable) return { status: 'unavailable' };
        if (first.setupError) return summarize([first]);

        const groups = (first.groups || []).filter(g => groupKey(g) !== groupKey(main)).slice(0, MAX_GROUPS - 1);
        if (!groups.length && !(first.results || []).length && !first.left) return { status: 'none' };

        const runs = [first];
        for (const group of groups) {
            if (Date.now() > deadline) break;
            const r = await runGroup(Object.assign({ group }, common));
            if (r.aborted) return { status: 'skipped' };
            if (r.unavailable) continue; // e.g. a page without the runtime tag
            runs.push(r);
        }

        // Flaky-test guard: rerun each group that failed (not for setup
        // problems or a page that doesn't exist, which won't change).
        for (let i = 0; i < runs.length; i++) {
            const r = runs[i];
            const failed = (r.results || []).some(x => !x.passed);
            if (!failed || r.badPage || r.setupError || r.outOfTime || Date.now() > deadline) continue;
            const again = await runGroup(Object.assign({ group: r.group }, common));
            if (again.aborted) return { status: 'skipped' };
            if (again.unavailable || again.setupError || again.badPage) continue;
            runs[i] = mergeRetry(r, again);
            if (again.left === undefined && r.left) runs[i].left = undefined; // left the page only the first time
        }
        return summarize(runs);
    }

    window.AppTests = {
        enabled, testsPath, read, write, remove, run, timing,
        // Pure parts, for scripts/test-app-tests.mjs.
        _core: { groupKey, groupUrl, cleanResult, cleanGroups, mergeRetry, summarize, groupLabel, syntaxError, TESTS_REL, FRAME_NAME, API_NAMES },
    };
})();
