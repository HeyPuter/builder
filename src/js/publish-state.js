// publish-state.js — the single source of truth for what the Publish control
// should show. Kept as a pure, DOM-free function so it can be unit-tested in
// isolation (see scripts/test-publish-state.mjs) and reused by both the toolbar
// button and the publish popover without duplicating the rules.
//
// Background: the live preview (window.currentPreviewUrl, the "draft") auto-syncs
// to the working directory every turn. Publishing is a SEPARATE, user-only act
// that pushes the current files to a stable public subdomain. This function
// answers: given what was last published and where the working dir is now, is
// the public site missing, up to date, or behind unpublished changes?
//
// Loaded right after helpers.js (see vite.config.js SCRIPTS) so every later
// module can call window.computePublishState.
(function () {
    'use strict';

    /**
     * Decide the Publish control's state from the published baseline + the live
     * working state.
     *
     * @param {object} opts
     * @param {string|null} opts.publishedUrl       Public site URL, or null/'' if never published.
     * @param {string|null} opts.publishedVersionId Version snapshot id captured at last publish (or null).
     * @param {string|null} opts.currentVersionId   The working dir's current version snapshot id (or null).
     * @param {boolean}     opts.dirtySinceSnapshot  True if files changed but aren't captured by a snapshot yet.
     * @returns {{state:'unpublished'|'clean'|'dirty', dirty:boolean, label:string}}
     */
    window.computePublishState = function (opts) {
        opts = opts || {};
        const publishedUrl = opts.publishedUrl || null;

        // Never published → the call to action is the first publish.
        if (!publishedUrl) {
            return { state: 'unpublished', dirty: false, label: 'Publish' };
        }

        // Published already. It's "dirty" (has unpublished changes) when the
        // working dir's version pointer has moved past what we published, OR when
        // there are edits not yet captured by any snapshot. The version-pointer
        // comparison is the primary signal — snapshots fire at the end of every
        // modifying turn, and a Restore moves the pointer too, so "pointer differs
        // from the published one" cleanly covers edits, restores, and undo/redo.
        // We only compare when we actually have a current pointer to compare; with
        // no snapshots yet we lean on the un-snapshotted flag alone.
        const versionMoved = !!opts.currentVersionId && opts.currentVersionId !== opts.publishedVersionId;
        const dirty = versionMoved || !!opts.dirtySinceSnapshot;

        return dirty
            ? { state: 'dirty', dirty: true, label: 'Publish changes' }
            : { state: 'clean', dirty: false, label: 'Published' };
    };
})();
