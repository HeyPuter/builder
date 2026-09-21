import fs from 'node:fs';

// ---- Regression guard for publish subdomain-error classification -----------
// The publish UI used to report EVERY puter.hosting.create failure as "that
// address is already taken", which mislabeled a `subdomain_limit_reached` error
// (account cap on published sites) — the user was told to pick another name when
// the name was fine. These pure classifiers separate the causes; a wrong verdict
// here puts a misleading alert in front of the user, so every branch is asserted.
//
// publish-errors.js is a classic browser-global script: it assigns
// window.puterErrInfo / window.isSubdomainLimitErr / window.isSubdomainTakenErr.
// Evaluate it with a minimal window, mirroring scripts/test-publish-state.mjs.

const SRC = new URL('../src/js/publish-errors.js', import.meta.url);
const src = fs.readFileSync(SRC, 'utf8');
const window = {};
new Function('window', src)(window);

const { puterErrInfo, isSubdomainLimitErr, isSubdomainTakenErr } = window;

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

for (const fn of ['puterErrInfo', 'isSubdomainLimitErr', 'isSubdomainTakenErr']) {
    if (typeof window[fn] !== 'function') {
        console.error(`FAIL - window.${fn} was not defined`);
        process.exit(1);
    }
}

// The exact body the reported bug came from (from the network tab).
const LIMIT = { error: 'Subdomain limit reached', message: 'Subdomain limit reached', code: 'subdomain_limit_reached' };

// --- the core bug: a limit error must be a limit error, NOT "taken" ---
check('limit error → isSubdomainLimitErr true', isSubdomainLimitErr(LIMIT) === true);
check('limit error → isSubdomainTakenErr false (was the bug)', isSubdomainTakenErr(LIMIT) === false);

// Limit code even if the human message changes.
check('limit by code alone', isSubdomainLimitErr({ code: 'subdomain_limit_reached', message: 'whatever' }) === true);
// Limit by message alone if the code field ever moves/disappears.
check('limit by message alone', isSubdomainLimitErr({ message: 'Subdomain limit reached' }) === true);
// Nested shape (some SDK rejections wrap the API body under .error).
check('limit nested under .error', isSubdomainLimitErr({ error: { code: 'subdomain_limit_reached' } }) === true);

// --- genuinely-taken errors still classify as taken (common case preserved) ---
check('taken by code', isSubdomainTakenErr({ code: 'subdomain_taken' }) === true);
check('taken by "already exists" message', isSubdomainTakenErr({ message: 'That subdomain already exists' }) === true);
check('taken by "in use" message', isSubdomainTakenErr({ message: 'Subdomain is in use' }) === true);
check('a taken error is NOT a limit error', isSubdomainLimitErr({ code: 'subdomain_taken' }) === false);

// --- unrelated failures are neither taken nor limit (fall through to generic) ---
const network = { message: 'Failed to fetch' };
check('network error → not limit', isSubdomainLimitErr(network) === false);
check('network error → not taken', isSubdomainTakenErr(network) === false);

// --- puterErrInfo shape extraction across the variants ---
check('info: top-level code+message', (() => { const i = puterErrInfo(LIMIT); return i.code === 'subdomain_limit_reached' && /limit/i.test(i.message); })());
check('info: nested .error.message', (() => { const i = puterErrInfo({ error: { message: 'boom', code: 'x' } }); return i.code === 'x' && i.message === 'boom'; })());
check('info: .error is a bare string', (() => { const i = puterErrInfo({ error: 'plain string reason' }); return i.message === 'plain string reason'; })());
check('info: string error falls back to String(e)', (() => { const i = puterErrInfo('oops'); return typeof i.message === 'string' && i.message.length > 0; })());

// --- robustness: null / undefined / garbage never throw ---
check('null does not throw and is neither', isSubdomainLimitErr(null) === false && isSubdomainTakenErr(null) === false);
check('undefined does not throw', isSubdomainLimitErr(undefined) === false);
check('empty object → neither', isSubdomainLimitErr({}) === false && isSubdomainTakenErr({}) === false);
check('puterErrInfo(null) → empty strings, no throw', (() => { const i = puterErrInfo(null); return i.code === '' && i.message === ''; })());

// --- ordering contract the callers rely on: limit is checked BEFORE taken, and
//     a limit error must never *also* read as taken (so the check order is safe).
check('limit error is exclusively limit (never also taken)', isSubdomainLimitErr(LIMIT) && !isSubdomainTakenErr(LIMIT));

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nAll publish-error classification checks passed');
