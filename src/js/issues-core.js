// issues-core.js — pure logic for per-project issues (see issues.js for the UI).
//
// Issues are a lightweight per-project punch list: the user jots down bugs,
// tweaks, and ideas while trying their app, then sends any of them to the AI as
// a single chat message. This module owns the document shape, every mutation,
// the limits, and the message formatting — and is deliberately DOM-free and
// side-effect-free (no jQuery, no puter, no globals beyond window.IssuesCore)
// so scripts/test-issues.mjs can evaluate it with a bare `window` and assert
// every branch, the same way test-publish-state.mjs exercises publish-state.js.
//
// All mutation helpers are IMMUTABLE: they never touch the doc they're given
// and return `{ ok: true, doc: <new doc>, ... }` or `{ ok: false, error }`.
// That matters for the persistence layer (issues.js), which applies the same
// operation twice — optimistically to the in-memory cache for an instant
// render, then authoritatively to a fresh read of the stored doc right before
// writing — so operations must be deterministic (ids/timestamps are passed in,
// not minted per application) and safe to re-apply.

(function () {
    'use strict';

    // Hard caps. MAX_ISSUES bounds the doc (and the panel) to something that
    // stays fast to read/write as one JSON file; MAX_TEXT_LENGTH bounds a
    // single issue so a paste of a whole log can't balloon the doc or the chat
    // message built from it. Adding past the cap is refused (never silently
    // trimmed) — see addIssue. normalizeDoc deliberately does NOT trim to the
    // cap: dropping stored entries on read would be silent data loss.
    const MAX_ISSUES = 200;
    const MAX_TEXT_LENGTH = 2000;

    function generateIssueId() {
        return 'i_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    }

    function emptyDoc() {
        return { schema: 1, issues: [] };
    }

    // Issue lifecycle: 'open' (on the punch list) → 'review' (an AI turn
    // finished fixing it; awaiting the user's verification in the preview) →
    // 'resolved' (verified). Only the user moves an issue INTO 'resolved' —
    // the AI finishing only ever advances open → review, so the resolved list
    // never contains unverified claims.
    function isValidStatus(s) {
        return s === 'open' || s === 'review' || s === 'resolved';
    }

    // The one text-scrubbing pipeline: normalize newlines, drop trailing
    // whitespace per line, collapse runs of blank lines, trim. Shared by
    // cleanIssueText (new input) and normalizeDoc (stored data) so a
    // load → edit → blur round trip of untouched text is byte-identical —
    // otherwise it would register as a change, bump updatedAt, and wrongly
    // clear the "Sent" stamp. Idempotent.
    function scrubText(text) {
        return String(text)
            .replace(/\r\n?/g, '\n')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    // Clean a candidate issue text. Returns { ok: true, text } or
    // { ok: false, error: 'empty' | 'too_long' }.
    function cleanIssueText(text) {
        if (typeof text !== 'string') return { ok: false, error: 'empty' };
        const t = scrubText(text);
        if (!t) return { ok: false, error: 'empty' };
        if (t.length > MAX_TEXT_LENGTH) return { ok: false, error: 'too_long' };
        return { ok: true, text: t };
    }

    // Ids appear in DOM attribute selectors (`[data-issue-id="…"]`), so only a
    // conservative charset is accepted from storage; anything else is re-minted.
    // Our own generateIssueId output always passes.
    function isValidId(id) {
        return typeof id === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(id);
    }

    // Coerce anything (parsed JSON, a legacy bare array, garbage) into a valid
    // doc. Never throws. Entries that aren't objects or have no usable text are
    // dropped; duplicate or unsafe ids are re-minted/deduped; over-long text is
    // clamped (stored data is kept, unlike cleanIssueText which refuses new
    // input); unknown statuses read as 'open' so an issue can never disappear
    // from both lists.
    function normalizeDoc(raw) {
        const doc = emptyDoc();
        const list = Array.isArray(raw)
            ? raw
            : (raw && Array.isArray(raw.issues) ? raw.issues : []);
        const seen = new Set();
        let idx = -1;
        for (const entry of list) {
            idx++;
            if (!entry || typeof entry !== 'object') continue;
            let text = typeof entry.text === 'string' ? scrubText(entry.text) : '';
            if (!text) continue;
            // Clamp, then re-scrub: the cut can expose trailing whitespace that
            // the next read's scrub would remove, and normalization must be
            // idempotent (two reads of the same bytes must agree exactly).
            if (text.length > MAX_TEXT_LENGTH) text = scrubText(text.slice(0, MAX_TEXT_LENGTH));
            if (!text) continue;
            // Missing/unsafe ids get a DETERMINISTIC position-derived id, never
            // a random one: the persistence layer applies each mutation to two
            // separate reads of the file, and an id that changed between reads
            // would make the second application silently miss its target.
            let id = entry.id;
            if (!isValidId(id)) {
                id = 'i_legacy_' + idx;
                while (seen.has(id)) id += '_d'; // deterministic de-collision
            }
            if (seen.has(id)) continue;
            seen.add(id);
            doc.issues.push({
                id,
                text,
                status: isValidStatus(entry.status) ? entry.status : 'open',
                createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : null,
                updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : null,
                sentAt: typeof entry.sentAt === 'string' ? entry.sentAt : null,
                // 'ai' when the fix came from an AI turn (set when the user
                // confirms it from the review state); null for a manual
                // check-off of something the user fixed/decided themselves.
                resolvedBy: entry.resolvedBy === 'ai' ? 'ai' : null,
            });
        }
        return doc;
    }

    function cloneDoc(doc) {
        return {
            schema: 1,
            issues: ((doc && doc.issues) || []).map(i => Object.assign({}, i)),
        };
    }

    function openIssues(doc) {
        return ((doc && doc.issues) || []).filter(i => i.status === 'open');
    }

    // Fixed by an AI turn, awaiting the user's verification. Excluded from
    // openIssues on purpose: a batch send (the review card's "Send back to
    // AI") must not re-send work that's already done pending a check.
    function reviewIssues(doc) {
        return ((doc && doc.issues) || []).filter(i => i.status === 'review');
    }

    function resolvedIssues(doc) {
        return ((doc && doc.issues) || []).filter(i => i.status === 'resolved');
    }

    // Append a new open issue. opts.id / opts.now exist so the caller can apply
    // the same add twice (optimistic + authoritative) and get the same result;
    // both default to fresh values. Re-applying with an id that already exists
    // is an idempotent no-op success.
    function addIssue(doc, text, opts) {
        opts = opts || {};
        const cleaned = cleanIssueText(text);
        if (!cleaned.ok) return cleaned;
        const base = cloneDoc(doc);
        const id = opts.id || generateIssueId();
        const existing = base.issues.find(i => i.id === id);
        if (existing) return { ok: true, doc: base, issue: existing };
        if (base.issues.length >= MAX_ISSUES) return { ok: false, error: 'limit' };
        const when = opts.now || new Date().toISOString();
        const issue = { id, text: cleaned.text, status: 'open', createdAt: when, updatedAt: when, sentAt: null, resolvedBy: null };
        base.issues.push(issue);
        return { ok: true, doc: base, issue };
    }

    // Rewrite an issue's text. Clears sentAt — a "Sent" badge on since-edited
    // text would claim the AI saw words it never did. For the same reason a
    // reworded review item drops back to open: the AI fixed the OLD wording,
    // so whatever the new words ask for hasn't been done.
    function updateIssueText(doc, id, text, opts) {
        opts = opts || {};
        const cleaned = cleanIssueText(text);
        if (!cleaned.ok) return cleaned;
        const base = cloneDoc(doc);
        const issue = base.issues.find(i => i.id === id);
        if (!issue) return { ok: false, error: 'not_found' };
        if (issue.text !== cleaned.text) {
            issue.text = cleaned.text;
            issue.updatedAt = opts.now || new Date().toISOString();
            issue.sentAt = null;
            // Same logic as the sent stamp: "Fixed by AI" on rewritten words
            // would credit the AI with text it never saw.
            issue.resolvedBy = null;
            if (issue.status === 'review') issue.status = 'open';
        }
        return { ok: true, doc: base, issue };
    }

    function setIssueStatus(doc, id, status, opts) {
        opts = opts || {};
        if (!isValidStatus(status)) return { ok: false, error: 'bad_status' };
        const base = cloneDoc(doc);
        const issue = base.issues.find(i => i.id === id);
        if (!issue) return { ok: false, error: 'not_found' };
        if (issue.status !== status) {
            const from = issue.status;
            issue.status = status;
            issue.updatedAt = opts.now || new Date().toISOString();
            // Reopening means "this is NOT fixed": drop the sent stamp (a "Sent"
            // chip on a reopened issue would read as already-handled) and any
            // AI-resolution credit. A fresh send re-stamps it.
            if (status === 'open') {
                issue.sentAt = null;
                issue.resolvedBy = null;
            }
            // Confirming FROM review credits the fix to the AI turn that did
            // it; a direct open → resolved check-off stays the user's own.
            if (status === 'resolved') {
                issue.resolvedBy = from === 'review' ? 'ai' : null;
            }
        }
        return { ok: true, doc: base, issue };
    }

    // Move a batch to 'review' after the AI turn that was fixing these ids
    // finished cleanly. Deliberately conservative about what it claims: an id
    // is skipped if it's gone (deleted meanwhile), no longer open (the user
    // already resolved it), or its sentAt was cleared (the text was EDITED
    // after sending — the AI fixed the old wording, so the new ask is still
    // open). The batch never lands in 'resolved' directly: only the user's
    // confirmation does that. Returns { ok, doc, reviewed: <count changed> }.
    function markSentIssuesForReview(doc, ids, opts) {
        opts = opts || {};
        const wanted = new Set(ids || []);
        const when = opts.now || new Date().toISOString();
        const base = cloneDoc(doc);
        let reviewed = 0;
        for (const issue of base.issues) {
            if (!wanted.has(issue.id)) continue;
            if (issue.status !== 'open') continue;
            if (!issue.sentAt) continue;
            issue.status = 'review';
            issue.updatedAt = when;
            reviewed++;
        }
        return { ok: true, doc: base, reviewed };
    }

    // The user verified a batch of review items ("Confirm all", or one row's
    // circle): review → resolved, credited to the AI. Ids that aren't in
    // review anymore (reopened, deleted, already confirmed) are skipped.
    // Returns { ok, doc, confirmed: <count changed> }.
    function confirmReviewIssues(doc, ids, opts) {
        opts = opts || {};
        const wanted = new Set(ids || []);
        const when = opts.now || new Date().toISOString();
        const base = cloneDoc(doc);
        let confirmed = 0;
        for (const issue of base.issues) {
            if (!wanted.has(issue.id)) continue;
            if (issue.status !== 'review') continue;
            issue.status = 'resolved';
            issue.resolvedBy = 'ai';
            issue.updatedAt = when;
            confirmed++;
        }
        return { ok: true, doc: base, confirmed };
    }

    function deleteIssue(doc, id) {
        const base = cloneDoc(doc);
        const idx = base.issues.findIndex(i => i.id === id);
        if (idx === -1) return { ok: false, error: 'not_found' };
        const issue = base.issues[idx];
        base.issues.splice(idx, 1);
        return { ok: true, doc: base, issue, index: idx };
    }

    // Undo for deleteIssue: put the exact issue object back at its old index
    // (clamped). Idempotent — restoring an id that's already present succeeds
    // without duplicating. Deliberately allowed even at MAX_ISSUES: undo must
    // always work, and it only returns what was just there.
    function restoreIssue(doc, issue, index) {
        if (!issue || typeof issue !== 'object' || typeof issue.id !== 'string') {
            return { ok: false, error: 'not_found' };
        }
        const base = cloneDoc(doc);
        if (base.issues.some(i => i.id === issue.id)) return { ok: true, doc: base };
        const at = Math.max(0, Math.min(base.issues.length, typeof index === 'number' ? index : base.issues.length));
        base.issues.splice(at, 0, Object.assign({}, issue));
        return { ok: true, doc: base };
    }

    // Stamp sentAt on the given ids (missing ids are skipped — they may have
    // been deleted in another tab between send and persist).
    function markIssuesSent(doc, ids, opts) {
        opts = opts || {};
        const wanted = new Set(ids || []);
        const when = opts.now || new Date().toISOString();
        const base = cloneDoc(doc);
        for (const issue of base.issues) {
            if (wanted.has(issue.id)) issue.sentAt = when;
        }
        return { ok: true, doc: base };
    }

    // Take a sentAt stamp back — only where it is exactly the one we wrote
    // (opts.now), so a later, real send of the same issue is never undone.
    // Used when the turn the stamp announced never started (the user
    // dismissed the sign-in prompt, another send was mid-setup): a "Sent"
    // chip on a row the AI never saw is the one claim the punch list must
    // never make. Idempotent and deterministic like its counterpart.
    function unmarkIssuesSent(doc, ids, opts) {
        opts = opts || {};
        const wanted = new Set(ids || []);
        const base = cloneDoc(doc);
        for (const issue of base.issues) {
            if (!wanted.has(issue.id)) continue;
            if (opts.now && issue.sentAt !== opts.now) continue;
            issue.sentAt = null;
        }
        return { ok: true, doc: base };
    }

    // Cheap signature of everything the panel/badge renders, used to skip
    // redundant re-renders when a background read matches the optimistic cache.
    // Unlike version history, issue rows are mutable (text edits, status flips,
    // sent stamps), so updatedAt/sentAt are part of the signature.
    function signature(doc) {
        return ((doc && doc.issues) || [])
            .map(i => i.id + ':' + i.status + ':' + (i.updatedAt || '') + ':' + (i.sentAt || ''))
            .join('|');
    }

    // Build the chat message for a batch of issues. Plain text — it renders as
    // the user's own bubble and goes to the model verbatim, so no HTML and no
    // hidden preamble. Multi-line issue text is indented under its number so
    // the list stays unambiguous for both the reader and the model.
    function formatForAI(issues) {
        const list = (issues || []).filter(i => i && typeof i.text === 'string' && i.text.trim());
        if (list.length === 0) return '';
        if (list.length === 1) {
            return 'Please fix the following issue:\n\n' + list[0].text.trim();
        }
        const lines = list.map((issue, n) => {
            const parts = issue.text.trim().split('\n');
            const first = (n + 1) + '. ' + parts[0];
            const rest = parts.slice(1).map(l => '   ' + l);
            return [first].concat(rest).join('\n');
        });
        return 'Please fix the following issues:\n\n' + lines.join('\n');
    }

    window.IssuesCore = {
        MAX_ISSUES,
        MAX_TEXT_LENGTH,
        generateIssueId,
        emptyDoc,
        cleanIssueText,
        normalizeDoc,
        cloneDoc,
        openIssues,
        reviewIssues,
        resolvedIssues,
        addIssue,
        updateIssueText,
        setIssueStatus,
        markSentIssuesForReview,
        confirmReviewIssues,
        deleteIssue,
        restoreIssue,
        markIssuesSent,
        unmarkIssuesSent,
        signature,
        formatForAI,
    };
})();
