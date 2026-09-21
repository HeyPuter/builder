import fs from 'node:fs';

// ---- Regression + behavioral guard for in-turn preview verification --------
// update_preview now reloads the live preview AND verifies the freshly-loaded
// app actually runs before the model finishes the turn (window.verifyPreview in
// src/js/ui.js). The safety contract is that it is CONSERVATIVE: it reports
// runtime errors ONLY when the freshly-reloaded document actually loaded and
// emitted them — a missing preview, an abort/chat-switch, or a load timeout all
// resolve to a benign result, so a working app is never wrongly flagged (which
// would send the model rewriting healthy code). This test:
//   * text-asserts the wiring across prompt.js / ui.js / update_preview.js so it
//     can't silently drift (mirrors the other scripts/test-*.mjs guards), and
//   * evaluates the REAL verifyPreview state machine sliced out of ui.js and
//     drives it through the key scenarios (clean, errors, dedup, pre-commit
//     errors discarded, no-preview, aborted).

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const UI = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const PROMPT_SRC = fs.readFileSync(new URL('../src/js/prompt.js', import.meta.url), 'utf8');
const TOOL = fs.readFileSync(new URL('../src/tools/apps_and_sites/update_preview.js', import.meta.url), 'utf8');

// === 1. Wiring text-assertions ==============================================

// -- prompt.js: baked snippet gained script-load-failure detection ------------
check('prompt: snippet reports failed <script> loads',
    PROMPT_SRC.includes("window.addEventListener('error'") &&
    PROMPT_SRC.includes("t.tagName==='SCRIPT'") &&
    PROMPT_SRC.includes("'Failed to load script'"));
// It must be inside the SAME <script> template block as the other reporters
// (before the fetch IIFE), so generated apps emit it verbatim with the rest.
check('prompt: script-load listener sits with the other error reporters',
    PROMPT_SRC.indexOf("window.addEventListener('error'") > PROMPT_SRC.indexOf('window.onunhandledrejection=') &&
    PROMPT_SRC.indexOf("window.addEventListener('error'") < PROMPT_SRC.indexOf('var _f=window.fetch'));
// Must not corrupt the template literal it lives in.
check('prompt: no template-literal metacharacters in the added listener',
    !/window\.addEventListener\('error'[^;]*[`$\\]/.test(
        PROMPT_SRC.slice(PROMPT_SRC.indexOf("window.addEventListener('error'"),
                         PROMPT_SRC.indexOf('var _f=window.fetch'))));

// -- prompt.js: behavioral rules describe the verify/fix loop -----------------
check('prompt: update_preview rule describes the verification loop',
    /update_preview[\s\S]*verif/i.test(PROMPT_SRC) &&
    PROMPT_SRC.includes('re-verify') || /verification[\s\S]*field/i.test(PROMPT_SRC));
check('prompt: SuggestNextSteps waits for a clean preview',
    /SuggestNextSteps[\s\S]*update_preview has come back clean/i.test(PROMPT_SRC));

// -- ui.js: the verification surface exists -----------------------------------
check('ui: defines window.verifyPreview', UI.includes('window.verifyPreview = async function'));
check('ui: defines window._notifyPreviewReloadCommit', UI.includes('window._notifyPreviewReloadCommit = function'));
check('ui: refreshPreviewWhenReady signals the reload-commit before setting src',
    UI.indexOf('window._notifyPreviewReloadCommit?.();') < UI.indexOf("$frame.attr('src', url);") &&
    UI.indexOf('window._notifyPreviewReloadCommit?.();') > UI.indexOf('async function refreshPreviewWhenReady'));
check('ui: buffer capture is gated on `capturing` and the trusted-frame check',
    UI.includes('if (!capturing) return;') && UI.includes('if (!isTrustedPreviewMessage(event)) return;'));
check('ui: verifyPreview returns no-preview when no pane is open',
    UI.includes("return { status: 'no-preview' };"));

// -- update_preview.js: awaits verify, retry ceiling, conservative return ------
check('tool: awaits window.verifyPreview', TOOL.includes('await window.verifyPreview(state)'));
check('tool: falls back to the plain refresh when verify is unavailable',
    TOOL.includes("typeof window.verifyPreview !== 'function'") &&
    TOOL.includes('window.schedulePreviewRefresh?.();') &&
    TOOL.includes('window.flushPreviewRefresh?.();'));
check('tool: only surfaces a verification field on confirmed errors',
    TOOL.includes("health.status !== 'errors'") && TOOL.includes('return { success: true };'));
check('tool: bounds automatic fix rounds per turn', TOOL.includes('MAX_ATTEMPTS') && TOOL.includes('state._verifyAttempts'));

// === 2. Behavioral test of the real verifyPreview state machine =============

// Slice the whole verification IIFE (comment banner through its closing })();)
// straight out of ui.js and evaluate it against mocks — zero drift.
const vStart = UI.indexOf('// --- In-turn preview verification');
const vEnd = UI.indexOf("$(document).on('click', '.send'", vStart);
if (vStart < 0 || vEnd < 0) { console.error('FAIL - could not slice verifyPreview'); process.exit(1); }
const sliceSrc = UI.slice(vStart, vEnd);

// The capture listener drops errors about the externally-hosted "Made with
// Puter" badge script — slice the real filter so the harness runs it.
const bStart = UI.indexOf('function isRuntimeAssetError');
const bEnd = UI.indexOf('\n}', bStart);
if (bStart < 0 || bEnd < 0) { console.error('FAIL - could not slice isRuntimeAssetError'); process.exit(1); }
// eslint-disable-next-line no-new-func
const isRuntimeAssetError = new Function('return ' + UI.slice(bStart, bEnd + 2))();

// A fresh, fully-isolated instance per scenario so cases can run in parallel
// without sharing the module-level buffer/capturing/pending state.
function makeInstance(opts) {
    opts = Object.assign({ previewActive: true, hasFrame: true, aborted: false, commit: true, errorsAfterLoad: [] }, opts || {});
    const loadHandlers = [];
    const frame = {
        length: opts.hasFrame ? 1 : 0,
        on(ev, fn) { if (ev === 'load') loadHandlers.push(fn); return this; },
        off(ev, fn) { if (ev === 'load') { const i = loadHandlers.indexOf(fn); if (i >= 0) loadHandlers.splice(i, 1); } return this; },
    };
    const body = { hasClass: (c) => (c === 'preview-active' ? opts.previewActive : false) };
    const $ = (sel) => (sel === '.preview-frame' ? frame : sel === 'body' ? body : { length: 0 });
    const listeners = [];
    const win = {
        currentPreviewUrl: 'https://example.puter.site/',
        isAborted: () => opts.aborted,
        isStaleTurn: () => false,
        addEventListener(ev, fn) { if (ev === 'message') listeners.push(fn); },
        schedulePreviewRefresh() {},
        flushPreviewRefresh() {
            if (!opts.commit) return; // model of a refresh that never reloads
            setTimeout(() => {
                win._notifyPreviewReloadCommit && win._notifyPreviewReloadCommit();
                loadHandlers.slice().forEach((h) => h());
                for (const e of opts.errorsAfterLoad) {
                    listeners.forEach((fn) => fn({ data: { type: 'app-error', message: e }, source: {} }));
                }
            }, 30);
        },
    };
    const post = (msg) => listeners.forEach((fn) => fn({ data: { type: 'app-error', message: msg }, source: {} }));
    // isRuntimeAssetError is the REAL implementation sliced out of ui.js, so this
    // harness exercises the production runtime filter, not a stand-in.
    // eslint-disable-next-line no-new-func
    new Function('window', '$', 'isTrustedPreviewMessage', 'isRuntimeAssetError',
        sliceSrc + '\nreturn null;')(win, $, () => true, isRuntimeAssetError);
    return { win, post };
}

async function run() {
    const clean = makeInstance({ errorsAfterLoad: [] });
    const errs = makeInstance({ errorsAfterLoad: ['Boom happened', 'Second failure'] });
    // A runtime load failure (404/outage of the central builder host) must never
    // flag the app as broken; a real error alongside it must still be reported.
    // Both the current path and the legacy one older apps load are covered.
    const badge = makeInstance({ errorsAfterLoad: ['Failed to load script: https://builder.puter.com/runtime.js'] });
    const legacy = makeInstance({ errorsAfterLoad: ['Failed to load script: https://builder.puter.com/badge.js'] });
    const badgeMixed = makeInstance({ errorsAfterLoad: ['Failed to load script: https://builder.puter.com/runtime.js', 'Boom happened'] });
    const dedup = makeInstance({ errorsAfterLoad: ['Same error', 'Same error', 'Same error', 'Other'] });
    const noPane = makeInstance({ previewActive: false });
    const aborted = makeInstance({ aborted: true });
    // The refresh bowed out without committing (superseded by a pane hide /
    // chat switch, or the preview URL changed under it): its reload never
    // comes, so verification must return promptly instead of sitting out the
    // whole load timeout (which held the model's update_preview call ~50s).
    const superseded = makeInstance({ commit: false });
    superseded.win.previewRefreshInFlight = () => false;
    const supersededStart = Date.now();

    // Pre-commit errors must be discarded: fire one synchronously (before the
    // 30ms reload-commit, while capturing is off) — it must NOT be reported.
    const preCommit = makeInstance({ errorsAfterLoad: [] });
    const preCommitPromise = preCommit.win.verifyPreview({});
    preCommit.post('This fired before the reload committed');

    const [rClean, rErrs, rDedup, rNoPane, rAborted, rPreCommit, rBadge, rLegacy, rBadgeMixed, rSuperseded] = await Promise.all([
        clean.win.verifyPreview({}),
        errs.win.verifyPreview({}),
        dedup.win.verifyPreview({}),
        noPane.win.verifyPreview({}),
        aborted.win.verifyPreview({}),
        preCommitPromise,
        badge.win.verifyPreview({}),
        legacy.win.verifyPreview({}),
        badgeMixed.win.verifyPreview({}),
        superseded.win.verifyPreview({}),
    ]);
    const supersededMs = Date.now() - supersededStart;

    check('verify: clean load with no errors → ok', rClean.status === 'ok');
    check('verify: errors on the fresh document → errors reported',
        rErrs.status === 'errors' && rErrs.errors.length === 2 &&
        rErrs.errors.some((e) => e.includes('Boom happened')));
    check('verify: identical errors are deduped',
        rDedup.status === 'errors' && rDedup.errors.length === 2);
    check('verify: no preview open → no-preview (never an error)', rNoPane.status === 'no-preview');
    check('verify: aborted/stale turn → skipped (never an error)', rAborted.status === 'skipped');
    check('verify: errors before the reload-commit are discarded → ok', rPreCommit.status === 'ok');
    check('verify: a refresh that bowed out without committing → skipped promptly (never an error)',
        rSuperseded.status === 'skipped' && rSuperseded.reason === 'superseded' && supersededMs < 5000);
    check('verify: runtime load failure alone → ok (never flags the app)', rBadge.status === 'ok');
    check('verify: LEGACY badge.js load failure alone → ok (older apps)', rLegacy.status === 'ok');
    check('verify: runtime failure filtered, real error still reported',
        rBadgeMixed.status === 'errors' && rBadgeMixed.errors.length === 1 &&
        rBadgeMixed.errors[0].includes('Boom happened'));
}

await run();

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll preview-verification checks passed.');
