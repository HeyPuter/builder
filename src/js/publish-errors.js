// publish-errors.js — classify the failures that come back from
// puter.hosting.create when minting a public subdomain. Kept as pure, DOM-free
// functions so they can be unit-tested in isolation (see
// scripts/test-publish-errors.mjs) and shared by every publish/rename entry
// point in ui.js without each one re-deriving the rules.
//
// Background: the publish UI used to treat ANY create failure as "that address
// is already taken", which mislabeled unrelated failures — most visibly a
// `subdomain_limit_reached` error (the account has hit its cap on published
// sites), where the user was wrongly told to pick another name. These helpers
// pull the real code/message out of the SDK rejection and separate the distinct
// causes so the caller can show the right message.
//
// Loaded right after publish-state.js (see vite.config.js SCRIPTS) so ui.js can
// call window.isSubdomainLimitErr / window.isSubdomainTakenErr / window.puterErrInfo.
(function () {
    'use strict';

    // Pull a best-effort { code, message } out of a Puter SDK rejection. The
    // shape varies — sometimes the API fields are top-level (e.code / e.message),
    // sometimes nested under e.error (which may itself be a string) — so check
    // both before falling back to String(e). Always returns strings.
    window.puterErrInfo = function (e) {
        const code = (e && (e.code || (e.error && e.error.code))) || '';
        let message = (e && (e.message || (e.error && (e.error.message || e.error)))) || '';
        if (!message && e) { try { message = String(e); } catch (x) { message = ''; } }
        return { code: String(code || ''), message: String(message || '') };
    };

    // The account has hit its cap on published subdomains — a DIFFERENT failure
    // from a name being taken, and the one we were previously mislabeling.
    // Matched by the API's stable code, with a message fallback in case the code
    // field ever moves.
    window.isSubdomainLimitErr = function (e) {
        const info = window.puterErrInfo(e);
        return info.code === 'subdomain_limit_reached' || /subdomain limit reached/i.test(info.message);
    };

    // The requested subdomain is already in use. Puter's exact code for this
    // isn't contractually fixed here, so match a family of taken/conflict signals
    // across both the code and message rather than assuming every create failure
    // is a conflict (that assumption is exactly what mislabeled the limit error).
    // Callers should check isSubdomainLimitErr FIRST so a limit error is never
    // swept into this broader net.
    window.isSubdomainTakenErr = function (e) {
        const info = window.puterErrInfo(e);
        return /taken|already|exists|in[_ ]?use|conflict|duplicat|reserved/i.test(info.code + ' ' + info.message);
    };
})();
