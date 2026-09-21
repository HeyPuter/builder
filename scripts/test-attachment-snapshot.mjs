import fs from 'node:fs';

// ---- Regression guard: attachments count as project changes -----------------
// Every attachment the user sends is written into <appDir>/assets/. The
// version-history machinery (versions.js) only snapshots a turn when
// window.markProjectModified was called during it, and only takes the
// pre-restore safety snapshot when the working dir is flagged dirty. The
// attachment-save path in sendChatMessage used to skip that call, so a turn in
// which the model wrote no files (a clarifying question, a plain reply about the
// file) left the new assets un-snapshotted — and the next Restore/undo, which
// reconciles the dir to an exact copy of an older snapshot, deleted them with no
// restore point to recover from.
//
// Text-level guard: the asset write in app.js must be followed by the
// markProjectModified call inside the same try block, and markProjectModified
// must keep treating a call with NO tool name as a genuine change.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const app = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const versions = fs.readFileSync(new URL('../src/js/versions.js', import.meta.url), 'utf8');

// --- app.js: the asset write marks the project modified -------------------
const writeIdx = app.indexOf('await puter.fs.write(assetPath, a.file);');
check('the attachment-save path still writes each file into assets/', writeIdx >= 0);
const afterWrite = app.slice(writeIdx, writeIdx + 2500);
const markIdx = afterWrite.indexOf('window.markProjectModified?.(undefined, turnChatId)');
check('the asset write is followed by markProjectModified', markIdx >= 0);
// It must sit in the same try block as the write — i.e. before the catch that
// swallows a failed save — so a file that did NOT land never counts as a change.
// Strip comments first so a mention of the catch in prose can't fool the scan.
const codeOnly = afterWrite.replace(/^\s*\/\/.*$/gm, '');
const catchIdx = codeOnly.indexOf('} catch (e) {');
const markInCode = codeOnly.indexOf('window.markProjectModified?.(undefined, turnChatId)');
check('the mark happens before the save-failure catch (only a landed file counts)',
    markInCode >= 0 && catchIdx > markInCode);
// And after resetTurnFileChanges at turn start, so it is attributed to THIS turn.
check('resetTurnFileChanges runs before the attachments are saved',
    app.indexOf('window.resetTurnFileChanges?.()') < writeIdx);

// --- versions.js: a tool-less call is a change -----------------------------
// Evaluate the real markProjectModified so the guard can't drift from the code.
const a = versions.indexOf('    window.markProjectModified = function');
const b = versions.indexOf('    window.resetTurnFileChanges = function');
check('markProjectModified is defined in versions.js', a >= 0 && b > a);
const block = versions.slice(a, b);
const MUTATING_TOOLS = new Set(['write', 'edit', 'multi_edit', 'delete', 'copy', 'move', 'rename', 'mkdir', 'create_worker']);
const win = {};
new Function('window', 'MUTATING_TOOLS', block)(win, MUTATING_TOOLS);
win._filesChangedThisTurn = 0;
win._projectDirtySinceSnapshot = false;
win.markProjectModified();
check('a call with no tool name counts as a file change', win._filesChangedThisTurn === 1);
check('… and flags the working dir dirty since the last snapshot', win._projectDirtySinceSnapshot === true);
win.markProjectModified('ReadTextFile');
check('a read-only tool still does not count', win._filesChangedThisTurn === 1);
win.markProjectModified('write');
check('a mutating tool still counts', win._filesChangedThisTurn === 2);
// The dirty state is per chat: a change attributed to ANOTHER chat (a turn
// that kept running after the user switched away) must not mark the open one.
win._projectDirtySinceSnapshot = false;
win.markProjectModified('write', 'some-other-chat');
check('a change in another chat does not dirty the open chat', win._projectDirtySinceSnapshot === false);
win.markProjectModified('write');
check('… while a change in the open chat does', win._projectDirtySinceSnapshot === true);

if (failures) { console.error(`\n${failures} attachment-snapshot check(s) failed.`); process.exit(1); }
console.log('\nAll attachment-snapshot checks passed.');
