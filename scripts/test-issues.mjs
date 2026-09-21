import fs from 'node:fs';

// ---- Regression guard for the per-project issues logic (issues-core.js) ----
// IssuesCore owns the issues document shape, every mutation, the limits, and
// the send-to-AI message formatting. The UI layer (issues.js) applies each
// operation TWICE — optimistically to a cache and authoritatively to a fresh
// read — so beyond plain correctness these checks pin down the properties that
// double application depends on: immutability of inputs, determinism given
// explicit id/now, and idempotent re-application. It is intentionally pure /
// DOM-free; we evaluate the production bytes with a bare window and assert
// every branch, mirroring scripts/test-publish-state.mjs.

const SRC = new URL('../src/js/issues-core.js', import.meta.url);
const src = fs.readFileSync(SRC, 'utf8');

// issues-core.js is a classic browser-global script: it assigns
// window.IssuesCore. Evaluate it with a minimal window.
const window = {};
new Function('window', src)(window);
const Core = window.IssuesCore;

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

if (!Core || typeof Core.addIssue !== 'function') {
    console.error('FAIL - window.IssuesCore was not defined');
    process.exit(1);
}

const NOW = '2026-07-28T12:00:00.000Z';
const LATER = '2026-07-28T13:00:00.000Z';

// --- cleanIssueText -----------------------------------------------------------
check('clean: trims and keeps text', Core.cleanIssueText('  fix the header  ').text === 'fix the header');
check('clean: normalizes CRLF', Core.cleanIssueText('a\r\nb').text === 'a\nb');
check('clean: collapses 3+ blank lines', Core.cleanIssueText('a\n\n\n\nb').text === 'a\n\nb');
check('clean: strips trailing spaces per line', Core.cleanIssueText('a   \nb').text === 'a\nb');
check('clean: empty → error', Core.cleanIssueText('   ').error === 'empty');
check('clean: non-string → empty error', Core.cleanIssueText(null).error === 'empty');
check('clean: over the cap → too_long', Core.cleanIssueText('x'.repeat(Core.MAX_TEXT_LENGTH + 1)).error === 'too_long');
check('clean: exactly the cap is fine', Core.cleanIssueText('x'.repeat(Core.MAX_TEXT_LENGTH)).ok === true);

// --- normalizeDoc -------------------------------------------------------------
check('normalize: garbage → empty doc', Core.normalizeDoc('nope').issues.length === 0);
check('normalize: null → empty doc', Core.normalizeDoc(null).issues.length === 0);
check('normalize: sets schema 1', Core.normalizeDoc(null).schema === 1);
check('normalize: legacy bare array accepted',
    Core.normalizeDoc([{ id: 'i_1_a', text: 'hi' }]).issues.length === 1);
check('normalize: entries without text dropped',
    Core.normalizeDoc({ issues: [{ id: 'i_1_a' }, { id: 'i_2_b', text: '  ' }, 42, null] }).issues.length === 0);
check('normalize: over-long stored text is clamped, not dropped',
    Core.normalizeDoc({ issues: [{ id: 'i_1_a', text: 'y'.repeat(Core.MAX_TEXT_LENGTH + 50) }] })
        .issues[0].text.length === Core.MAX_TEXT_LENGTH);
check('normalize: bad status coerced to open',
    Core.normalizeDoc({ issues: [{ id: 'i_1_a', text: 'x', status: 'weird' }] }).issues[0].status === 'open');
check('normalize: resolved status kept',
    Core.normalizeDoc({ issues: [{ id: 'i_1_a', text: 'x', status: 'resolved' }] }).issues[0].status === 'resolved');
check('normalize: duplicate ids keep first',
    Core.normalizeDoc({ issues: [{ id: 'i_1_a', text: 'first' }, { id: 'i_1_a', text: 'second' }] })
        .issues.map(i => i.text).join(',') === 'first');
{
    const doc = Core.normalizeDoc({ issues: [{ id: 'bad"id]<', text: 'x' }] });
    check('normalize: unsafe id replaced with a safe deterministic one', doc.issues[0].id === 'i_legacy_0');
    // Determinism matters beyond hygiene: the persistence layer applies each
    // mutation to two separate reads of the same file, keyed by id — random
    // replacement ids would make the second application miss its target.
    check('normalize: replacement ids are stable across reads',
        JSON.stringify(Core.normalizeDoc({ issues: [{ id: 'bad"id]<', text: 'x' }, { text: 'y' }] }))
        === JSON.stringify(Core.normalizeDoc({ issues: [{ id: 'bad"id]<', text: 'x' }, { text: 'y' }] })));
    const collide = Core.normalizeDoc({ issues: [{ id: 'i_legacy_1', text: 'a' }, { id: 42, text: 'b' }] });
    check('normalize: replacement id colliding with a stored id de-collides deterministically',
        collide.issues.length === 2 && collide.issues[1].id === 'i_legacy_1_d');
}
{
    // normalizeDoc and cleanIssueText share one scrub pipeline, so opening the
    // inline editor on untouched stored text and blurring must round-trip
    // byte-identical (a phantom "change" would wrongly clear the Sent stamp).
    const messy = 'a   \nb\n\n\n\nc\r\nd';
    const stored = Core.normalizeDoc({ issues: [{ id: 'i_1_a', text: messy }] }).issues[0].text;
    check('normalize/clean round trip: stored text re-cleans to itself',
        Core.cleanIssueText(stored).text === stored);
    // Clamping can expose trailing whitespace at the cut; a second normalize of
    // the clamped result must be a fixed point.
    const long = 'x'.repeat(Core.MAX_TEXT_LENGTH - 1) + '   \ny';
    const once = Core.normalizeDoc({ issues: [{ id: 'i_1_a', text: long }] }).issues[0].text;
    const twice = Core.normalizeDoc({ issues: [{ id: 'i_1_a', text: once }] }).issues[0].text;
    check('normalize: clamping is idempotent across reads', once === twice);
}
check('normalize: non-string timestamps → null',
    Core.normalizeDoc({ issues: [{ id: 'i_1_a', text: 'x', createdAt: 12345 }] }).issues[0].createdAt === null);
check('normalize: does NOT trim to MAX_ISSUES (no silent data loss)',
    Core.normalizeDoc({ issues: Array.from({ length: Core.MAX_ISSUES + 5 }, (_, n) => ({ id: 'i_1_' + n, text: 't' + n })) })
        .issues.length === Core.MAX_ISSUES + 5);

// --- addIssue -----------------------------------------------------------------
{
    const empty = Core.emptyDoc();
    const res = Core.addIssue(empty, '  Fix the broken button ', { id: 'i_1_add', now: NOW });
    check('add: ok', res.ok === true);
    check('add: input doc not mutated', empty.issues.length === 0);
    check('add: text cleaned', res.issue.text === 'Fix the broken button');
    check('add: status open', res.issue.status === 'open');
    check('add: timestamps from opts.now', res.issue.createdAt === NOW && res.issue.updatedAt === NOW);
    check('add: sentAt starts null', res.issue.sentAt === null);
    check('add: deterministic given id+now',
        JSON.stringify(Core.addIssue(empty, 'Fix the broken button', { id: 'i_1_add', now: NOW }).doc)
        === JSON.stringify(res.doc));
    const again = Core.addIssue(res.doc, 'whatever', { id: 'i_1_add', now: LATER });
    check('add: re-applying same id is an idempotent no-op', again.ok === true && again.doc.issues.length === 1
        && again.doc.issues[0].text === 'Fix the broken button');
    check('add: generated ids match the house shape',
        /^i_\d+_[a-z0-9]+$/.test(Core.addIssue(empty, 'x').issue.id));
    check('add: empty text refused', Core.addIssue(empty, '   ').error === 'empty');
    check('add: too-long text refused', Core.addIssue(empty, 'x'.repeat(Core.MAX_TEXT_LENGTH + 1)).error === 'too_long');
}
{
    const full = { schema: 1, issues: Array.from({ length: Core.MAX_ISSUES }, (_, n) => ({ id: 'i_1_' + n, text: 't', status: 'open', createdAt: NOW, updatedAt: NOW, sentAt: null })) };
    check('add: refused at the cap', Core.addIssue(full, 'one more').error === 'limit');
}

// --- updateIssueText ----------------------------------------------------------
{
    const doc = Core.addIssue(Core.emptyDoc(), 'old text', { id: 'i_1_e', now: NOW }).doc;
    doc.issues[0].sentAt = NOW; // pretend it was sent
    const res = Core.updateIssueText(doc, 'i_1_e', ' new text ', { now: LATER });
    check('edit: ok + cleaned', res.ok && res.issue.text === 'new text');
    check('edit: input not mutated', doc.issues[0].text === 'old text');
    check('edit: bumps updatedAt', res.issue.updatedAt === LATER);
    check('edit: clears sentAt (AI never saw the new words)', res.issue.sentAt === null);
    const same = Core.updateIssueText(res.doc, 'i_1_e', 'new text', { now: '2026-07-28T14:00:00.000Z' });
    check('edit: unchanged text keeps updatedAt', same.issue.updatedAt === LATER);
    check('edit: unknown id → not_found', Core.updateIssueText(doc, 'i_9_x', 'y').error === 'not_found');
    check('edit: empty text refused (never becomes a delete)', Core.updateIssueText(doc, 'i_1_e', '  ').error === 'empty');
}

// --- setIssueStatus -------------------------------------------------------------
{
    const doc = Core.addIssue(Core.emptyDoc(), 'a bug', { id: 'i_1_s', now: NOW }).doc;
    const res = Core.setIssueStatus(doc, 'i_1_s', 'resolved', { now: LATER });
    check('status: resolve works', res.ok && res.issue.status === 'resolved' && res.issue.updatedAt === LATER);
    check('status: input not mutated', doc.issues[0].status === 'open');
    const back = Core.setIssueStatus(res.doc, 'i_1_s', 'open', { now: LATER });
    check('status: reopen works', back.ok && back.issue.status === 'open');
    check('status: idempotent same-status keeps updatedAt',
        Core.setIssueStatus(res.doc, 'i_1_s', 'resolved', { now: '2026-07-28T15:00:00.000Z' }).issue.updatedAt === LATER);
    check('status: unknown id → not_found', Core.setIssueStatus(doc, 'i_9_x', 'resolved').error === 'not_found');
    check('status: invalid status refused', Core.setIssueStatus(doc, 'i_1_s', 'closed').error === 'bad_status');
}
// --- the review state machine ---------------------------------------------------
// open → review (AI turn finished) → resolved (user confirms) | open (still
// broken). Only the user's confirmation may land an issue in 'resolved', so
// the resolved list never contains unverified claims.
{
    let doc = Core.emptyDoc();
    doc = Core.addIssue(doc, 'sent and untouched', { id: 'i_1_a', now: NOW }).doc;
    doc = Core.addIssue(doc, 'edited after send', { id: 'i_2_b', now: NOW }).doc;
    doc = Core.addIssue(doc, 'never sent', { id: 'i_3_c', now: NOW }).doc;
    doc = Core.addIssue(doc, 'user resolved it first', { id: 'i_4_d', now: NOW }).doc;
    doc = Core.markIssuesSent(doc, ['i_1_a', 'i_2_b', 'i_4_d'], { now: NOW }).doc;
    doc = Core.updateIssueText(doc, 'i_2_b', 'new wording', { now: NOW }).doc; // clears its sentAt
    doc = Core.setIssueStatus(doc, 'i_4_d', 'resolved', { now: NOW }).doc;     // manual resolve

    const res = Core.markSentIssuesForReview(doc, ['i_1_a', 'i_2_b', 'i_4_d', 'i_9_gone'], { now: LATER });
    const by = id => res.doc.issues.find(i => i.id === id);
    check('review: moves the sent, untouched issue to review — NOT resolved',
        by('i_1_a').status === 'review' && by('i_1_a').updatedAt === LATER);
    check('review: keeps the sent stamp', by('i_1_a').sentAt === NOW);
    check('review: skips an issue edited after sending (new ask still open)',
        by('i_2_b').status === 'open');
    check('review: never touches unsent issues', by('i_3_c').status === 'open');
    check('review: leaves a manual resolve alone (no AI credit)',
        by('i_4_d').status === 'resolved' && by('i_4_d').resolvedBy === null);
    check('review: reports how many it actually changed', res.reviewed === 1);
    check('review: missing ids are skipped, not an error', res.ok === true);
    check('review: input doc not mutated', doc.issues.find(i => i.id === 'i_1_a').status === 'open');
    check('review: excluded from openIssues (never re-sent by "Send all")',
        Core.openIssues(res.doc).every(i => i.id !== 'i_1_a'));
    check('review: reviewIssues filters', Core.reviewIssues(res.doc).map(i => i.id).join(',') === 'i_1_a');

    // Confirm: review → resolved, credited to the AI.
    const conf = Core.confirmReviewIssues(res.doc, ['i_1_a', 'i_3_c', 'i_4_d', 'i_9_gone'], { now: LATER });
    const c = id => conf.doc.issues.find(i => i.id === id);
    check('confirm: review → resolved with AI credit',
        c('i_1_a').status === 'resolved' && c('i_1_a').resolvedBy === 'ai');
    check('confirm: only counts review items it changed', conf.confirmed === 1);
    check('confirm: never touches open or already-resolved issues',
        c('i_3_c').status === 'open' && c('i_4_d').resolvedBy === null);
    check('confirm: input doc not mutated', res.doc.issues.find(i => i.id === 'i_1_a').status === 'review');

    // The row circle on a review item also confirms (single-issue path).
    const circled = Core.setIssueStatus(res.doc, 'i_1_a', 'resolved', { now: LATER }).issue;
    check('confirm via circle: review → resolved gets AI credit', circled.resolvedBy === 'ai');
    const manual = Core.setIssueStatus(res.doc, 'i_3_c', 'resolved', { now: LATER }).issue;
    check('manual check-off: open → resolved carries NO AI credit', manual.resolvedBy === null);

    // Still broken: review → open, all stamps cleared, re-armed for sending.
    const broken = Core.setIssueStatus(res.doc, 'i_1_a', 'open', { now: LATER }).issue;
    check('still broken: review → open clears sentAt', broken.sentAt === null && broken.status === 'open');

    // Rewording a review item is a new ask: back to open.
    const reworded = Core.updateIssueText(res.doc, 'i_1_a', 'different ask now', { now: LATER }).issue;
    check('edit in review: changed text drops back to open',
        reworded.status === 'open' && reworded.sentAt === null);
    const untouched = Core.updateIssueText(res.doc, 'i_1_a', 'sent and untouched', { now: LATER }).issue;
    check('edit in review: unchanged text stays in review', untouched.status === 'review');
}
{
    // Reopening a resolved issue = "this is NOT fixed": the sent stamp and
    // AI credit must not survive, or the reopened row would read as handled.
    let doc = Core.addIssue(Core.emptyDoc(), 'a bug', { id: 'i_1_r', now: NOW }).doc;
    doc = Core.markIssuesSent(doc, ['i_1_r'], { now: NOW }).doc;
    doc = Core.markSentIssuesForReview(doc, ['i_1_r'], { now: NOW }).doc;
    doc = Core.confirmReviewIssues(doc, ['i_1_r'], { now: NOW }).doc;
    const reopened = Core.setIssueStatus(doc, 'i_1_r', 'open', { now: LATER }).issue;
    check('reopen: clears sentAt', reopened.sentAt === null);
    check('reopen: clears resolvedBy', reopened.resolvedBy === null);
    // Rewriting a resolved issue's text is the same lie-prevention case:
    // "Fixed by AI" must not survive onto words the AI never saw.
    const editedResolved = Core.updateIssueText(doc, 'i_1_r', 'different words', { now: LATER }).issue;
    check('edit resolved: clears resolvedBy', editedResolved.resolvedBy === null && editedResolved.status === 'resolved');
}
{
    check('normalize: review status kept',
        Core.normalizeDoc({ issues: [{ id: 'i_1_a', text: 'x', status: 'review' }] }).issues[0].status === 'review');
    check('normalize: resolvedBy "ai" kept',
        Core.normalizeDoc({ issues: [{ id: 'i_1_a', text: 'x', status: 'resolved', resolvedBy: 'ai' }] }).issues[0].resolvedBy === 'ai');
    check('normalize: garbage resolvedBy → null',
        Core.normalizeDoc({ issues: [{ id: 'i_1_a', text: 'x', resolvedBy: 'someone' }] }).issues[0].resolvedBy === null);
}

// --- deleteIssue / restoreIssue -------------------------------------------------
{
    let doc = Core.emptyDoc();
    doc = Core.addIssue(doc, 'first', { id: 'i_1_a', now: NOW }).doc;
    doc = Core.addIssue(doc, 'second', { id: 'i_2_b', now: NOW }).doc;
    doc = Core.addIssue(doc, 'third', { id: 'i_3_c', now: NOW }).doc;
    const res = Core.deleteIssue(doc, 'i_2_b');
    check('delete: ok, returns issue + index for undo', res.ok && res.issue.text === 'second' && res.index === 1);
    check('delete: removed from doc', res.doc.issues.length === 2 && !res.doc.issues.some(i => i.id === 'i_2_b'));
    check('delete: input not mutated', doc.issues.length === 3);
    check('delete: unknown id → not_found', Core.deleteIssue(doc, 'i_9_x').error === 'not_found');
    const undo = Core.restoreIssue(res.doc, res.issue, res.index);
    check('restore: puts the issue back at its old index',
        undo.ok && undo.doc.issues.map(i => i.id).join(',') === 'i_1_a,i_2_b,i_3_c');
    check('restore: idempotent when already present',
        Core.restoreIssue(undo.doc, res.issue, res.index).doc.issues.length === 3);
    check('restore: out-of-range index clamps', Core.restoreIssue(res.doc, res.issue, 99).doc.issues.length === 3);
    check('restore: garbage refused', Core.restoreIssue(doc, null).ok === false);
}

// --- markIssuesSent -------------------------------------------------------------
{
    let doc = Core.emptyDoc();
    doc = Core.addIssue(doc, 'a', { id: 'i_1_a', now: NOW }).doc;
    doc = Core.addIssue(doc, 'b', { id: 'i_2_b', now: NOW }).doc;
    const res = Core.markIssuesSent(doc, ['i_1_a', 'i_9_gone'], { now: LATER });
    check('sent: stamps only the listed ids', res.ok
        && res.doc.issues[0].sentAt === LATER && res.doc.issues[1].sentAt === null);
    check('sent: missing ids are skipped, not an error', res.ok === true);
    check('sent: input not mutated', doc.issues[0].sentAt === null);
}

// --- unmarkIssuesSent -----------------------------------------------------------
// The revert for a "Sent" stamp whose turn never started (sign-in dismissed,
// another send mid-setup). Only OUR stamp may be taken back, so a later real
// send of the same issue is never undone.
{
    let doc = Core.emptyDoc();
    doc = Core.addIssue(doc, 'a', { id: 'i_1_a', now: NOW }).doc;
    doc = Core.addIssue(doc, 'b', { id: 'i_2_b', now: NOW }).doc;
    doc = Core.markIssuesSent(doc, ['i_1_a', 'i_2_b'], { now: NOW }).doc;
    const res = Core.unmarkIssuesSent(doc, ['i_1_a', 'i_9_gone'], { now: NOW });
    check('unsent: clears only the listed ids', res.ok && res.doc.issues[0].sentAt === null && res.doc.issues[1].sentAt === NOW);
    check('unsent: input not mutated', doc.issues[0].sentAt === NOW);
    const later = Core.markIssuesSent(doc, ['i_1_a'], { now: LATER }).doc;
    const stale = Core.unmarkIssuesSent(later, ['i_1_a'], { now: NOW });
    check('unsent: a newer real stamp is never undone by a stale revert', stale.doc.issues[0].sentAt === LATER);
    const twice = Core.unmarkIssuesSent(res.doc, ['i_1_a'], { now: NOW });
    check('unsent: idempotent', twice.ok && twice.doc.issues[0].sentAt === null);
    check('unsent: signature changes when a stamp is taken back', Core.signature(doc) !== Core.signature(res.doc));
}

// --- open/resolved views ---------------------------------------------------------
{
    let doc = Core.emptyDoc();
    doc = Core.addIssue(doc, 'a', { id: 'i_1_a', now: NOW }).doc;
    doc = Core.addIssue(doc, 'b', { id: 'i_2_b', now: NOW }).doc;
    doc = Core.setIssueStatus(doc, 'i_1_a', 'resolved', { now: LATER }).doc;
    check('views: openIssues filters', Core.openIssues(doc).map(i => i.id).join(',') === 'i_2_b');
    check('views: resolvedIssues filters', Core.resolvedIssues(doc).map(i => i.id).join(',') === 'i_1_a');
    check('views: tolerate null doc', Core.openIssues(null).length === 0 && Core.resolvedIssues(null).length === 0);
}

// --- signature -------------------------------------------------------------------
{
    let doc = Core.addIssue(Core.emptyDoc(), 'a', { id: 'i_1_a', now: NOW }).doc;
    const s0 = Core.signature(doc);
    check('signature: stable for identical docs', s0 === Core.signature(Core.cloneDoc(doc)));
    check('signature: changes on add', s0 !== Core.signature(Core.addIssue(doc, 'b', { id: 'i_2_b', now: NOW }).doc));
    check('signature: changes on status flip', s0 !== Core.signature(Core.setIssueStatus(doc, 'i_1_a', 'resolved', { now: LATER }).doc));
    check('signature: changes on edit', s0 !== Core.signature(Core.updateIssueText(doc, 'i_1_a', 'edited', { now: LATER }).doc));
    check('signature: changes on sent stamp', s0 !== Core.signature(Core.markIssuesSent(doc, ['i_1_a'], { now: LATER }).doc));
    check('signature: empty doc → empty string', Core.signature(Core.emptyDoc()) === '');
    check('signature: tolerates null', Core.signature(null) === '');
}

// --- formatForAI ------------------------------------------------------------------
{
    check('format: no issues → empty string', Core.formatForAI([]) === '');
    check('format: tolerates null', Core.formatForAI(null) === '');
    const one = Core.formatForAI([{ id: 'i', text: 'Button is broken' }]);
    check('format: single issue, singular phrasing, no numbering',
        one === 'Please fix the following issue:\n\nButton is broken');
    const many = Core.formatForAI([
        { id: 'a', text: 'First bug' },
        { id: 'b', text: 'Second bug\nwith a second line' },
    ]);
    check('format: multiple issues numbered', many.startsWith('Please fix the following issues:\n\n1. First bug\n2. Second bug'));
    check('format: continuation lines indented under their number', many.includes('\n   with a second line'));
    check('format: blank/invalid entries skipped',
        Core.formatForAI([{ id: 'a', text: '  ' }, { id: 'b', text: 'real' }, null])
        === 'Please fix the following issue:\n\nreal');
}

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nAll issues-core checks passed');
