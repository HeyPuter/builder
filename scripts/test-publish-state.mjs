import fs from 'node:fs';

// ---- Regression guard for the Publish (draft vs. published) state machine ---
// computePublishState is the single source of truth for the Publish button +
// popover: it decides whether the public site is missing, up to date, or behind
// unpublished changes. The button label and the dot indicator are derived from
// it, so a wrong branch here would mislead the user about what's actually live.
// It is intentionally pure/DOM-free; we evaluate the production bytes with a
// bare window and assert every branch, mirroring scripts/test-click-to-edit.mjs.

const SRC = new URL('../src/js/publish-state.js', import.meta.url);
const src = fs.readFileSync(SRC, 'utf8');

// publish-state.js is a classic browser-global script: it assigns
// window.computePublishState. Evaluate it with a minimal window.
const window = {};
new Function('window', src)(window);
const compute = window.computePublishState;

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

if (typeof compute !== 'function') {
    console.error('FAIL - window.computePublishState was not defined');
    process.exit(1);
}

// --- never published ---
const unpub = compute({ publishedUrl: null, currentVersionId: 'v1' });
check('no url → unpublished', unpub.state === 'unpublished' && unpub.dirty === false);
check('unpublished label is "Publish"', unpub.label === 'Publish');
check('empty-string url is also unpublished', compute({ publishedUrl: '' }).state === 'unpublished');

// --- published, up to date (working pointer == published pointer) ---
const clean = compute({ publishedUrl: 'https://x.puter.site/', publishedVersionId: 'v3', currentVersionId: 'v3' });
check('matching versions → clean', clean.state === 'clean' && clean.dirty === false);
check('clean label is "Published"', clean.label === 'Published');

// --- published, working dir moved ahead (new snapshot since publish) ---
const moved = compute({ publishedUrl: 'https://x.puter.site/', publishedVersionId: 'v3', currentVersionId: 'v4' });
check('advanced version → dirty', moved.state === 'dirty' && moved.dirty === true);
check('dirty label is "Publish changes"', moved.label === 'Publish changes');

// --- published, then Restored to an OLDER snapshot (pointer differs again) ---
const restored = compute({ publishedUrl: 'https://x.puter.site/', publishedVersionId: 'v4', currentVersionId: 'v2' });
check('restore to a different version → dirty', restored.state === 'dirty');

// --- published with un-snapshotted edits, pointer not yet moved ---
const unsnapshotted = compute({ publishedUrl: 'https://x.puter.site/', publishedVersionId: 'v3', currentVersionId: 'v3', dirtySinceSnapshot: true });
check('un-snapshotted edits → dirty', unsnapshotted.state === 'dirty');

// --- published when no version system pointer exists yet (defensive) ---
const noVersions = compute({ publishedUrl: 'https://x.puter.site/', publishedVersionId: null, currentVersionId: null });
check('published, no version pointers, no edits → clean', noVersions.state === 'clean');
const noVersionsButEdited = compute({ publishedUrl: 'https://x.puter.site/', publishedVersionId: null, currentVersionId: null, dirtySinceSnapshot: true });
check('published, no pointers, but edited → dirty', noVersionsButEdited.state === 'dirty');

// --- no args / garbage doesn't throw and reads as unpublished ---
check('no args → unpublished (no throw)', compute().state === 'unpublished');

// --- loadChat must not wipe a project's published state -------------------
// hideAppPreview() nulls the published globals (it tears the pane down), and
// saveCurrentChat persists those globals for the open chat. So in loadChat any
// preview teardown has to run BEFORE the chat's publishedUrl/Path/VersionId/At
// are restored — otherwise a project published from Settings without a live
// preview is silently un-published on its next open (regression guard).
const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
{
    const a = APP.indexOf('async function loadChat(');
    const b = APP.indexOf('async function deleteChat(');
    check('loadChat slice found', a >= 0 && b > a);
    const LOAD = APP.slice(a, b);
    const hideIdx = LOAD.indexOf('hideAppPreview()');
    const restoreIdx = LOAD.indexOf('window.currentPublishedUrl = chat.publishedUrl');
    check('loadChat tears the old preview down BEFORE restoring published state',
        hideIdx >= 0 && restoreIdx > hideIdx);
    check('loadChat never tears the preview down AFTER the published state is restored',
        restoreIdx >= 0 && LOAD.indexOf('hideAppPreview()', restoreIdx) === -1);
}

// --- a rebuilt chat index keeps each project's published link -------------
// recoverChatListFromFiles reconstructs chat-list.json from the per-chat files
// when the index is missing/corrupt. The sidebar draws its "open app" link from
// the entry's publishedUrl, so the rebuild must carry it over (regression guard).
{
    const a = APP.indexOf('async function recoverChatListFromFiles(');
    const b = APP.indexOf('async function saveChatList(');
    check('recoverChatListFromFiles slice found', a >= 0 && b > a);
    const RECOVER = APP.slice(a, b);
    check('rebuilt list entries carry publishedUrl', RECOVER.includes('publishedUrl: chat.publishedUrl'));
}

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nAll publish-state checks passed');
