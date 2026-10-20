import fs from 'node:fs';

// ---- Regression guard for the Code view's pure half -------------------------
// src/js/editor-core.js decides who may edit, which lines Builder keeps read
// only, how an open file reacts to saves and to changes on disk, and what the
// AI is told about hand edits. A slip here either loses someone's work (a save
// over a newer file, a reload over unsaved text), lets the editor break what
// Builder needs (the runtime tag, the error reporter), or leaves the AI working
// from a stale copy. Evaluated from the production bytes with a bare window,
// like the other *-core tests. The wiring checks at the end make sure the files
// stay in the shipped bundle and the editor chunk stays lazy.

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const window = {};
new Function('window', read('../src/js/editor-core.js'))(window);
const C = window.EditorCore;

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

if (!C) {
    console.error('FAIL - window.EditorCore was not defined');
    process.exit(1);
}

// --- access ---
check('flag off hides the Code view', C.access({ flagOn: false, signedIn: true, subscribed: true }) === 'hidden');
check('signed out hides it', C.access({ flagOn: true, signedIn: false }) === 'hidden');
check('a temporary user never sees it', C.access({ flagOn: true, signedIn: true, isTemp: true, subscribed: true }) === 'hidden');
check('free plan can view', C.access({ flagOn: true, signedIn: true, subscribed: false }) === 'view');
check('paid plan can edit', C.access({ flagOn: true, signedIn: true, subscribed: true }) === 'edit');

// --- when a save has to wait ---
check('free plan cannot save', C.saveBlock({ access: 'view' }).reason === 'plan');
check('paid plan can save when idle', C.saveBlock({ access: 'edit' }) === null);
check('no save during a turn', C.saveBlock({ access: 'edit', turnRunning: true }).reason === 'turn');
check('no save during a restore', C.saveBlock({ access: 'edit', restoring: true }).reason === 'restore');
check('no save while publishing', C.saveBlock({ access: 'edit', publishing: true }).reason === 'publish');
check('read-only files never save', C.saveBlock({ access: 'edit', readOnly: true }).reason === 'readonly');
check('a deleted project never saves', C.saveBlock({ access: 'edit', deleted: true }).reason === 'deleted');
check('the plan reason comes before a busy turn',
    C.saveBlock({ access: 'view', turnRunning: true }).reason === 'plan');
check('every block has a message', ['plan', 'turn', 'restore', 'publish', 'readonly', 'deleted'].every((r) => {
    const s = { access: r === 'plan' ? 'view' : 'edit' };
    if (r === 'turn') s.turnRunning = true;
    if (r === 'restore') s.restoring = true;
    if (r === 'publish') s.publishing = true;
    if (r === 'readonly') s.readOnly = true;
    if (r === 'deleted') s.deleted = true;
    const b = C.saveBlock(s);
    return b && b.reason === r && b.message.length > 10;
}));

// --- file kinds ---
check('html is text', C.classify('index.html').kind === 'text' && C.classify('index.html').language === 'html');
check('nested js is javascript', C.classify('js/app.js').language === 'javascript');
check('svg opens as text', C.classify('icon.svg').kind === 'text' && C.classify('icon.svg').language === 'svg');
check('png is an image', C.classify('assets/a.png').kind === 'image');
check('a font is binary', C.classify('fonts/x.woff2').kind === 'binary');
check('unknown extensions are text', C.classify('notes.txt').kind === 'text' && C.classify('Dockerfile').language === 'plain');
check('workers/<name>.js is a backend', C.classify('workers/orders.js').backend === true);
check('a browser worker deeper down is not a backend', C.classify('workers/sub/x.js').backend === false);
check('a file named like a worker elsewhere is not a backend', C.classify('js/workers/orders.js').backend === false);
check('generated icons are flagged under the served root',
    C.classify('icons/icon-192.png', { servedRel: 'icons/icon-192.png' }).generatedIcon === true);
check('an icon outside the served root is not', C.classify('icons/icon-192.png', { servedRel: null }).generatedIcon === false);
check('manifest.json at the served root may be generated',
    C.classify('manifest.json', { servedRel: 'manifest.json' }).maybeGeneratedManifest === true);
check('deploy markers are hidden', C.classify('__deploy_1.png').hidden === true);
check('size limits', C.classify('big.js', { size: C.MAX_EDIT_BYTES + 1 }).tooLargeToEdit
    && !C.classify('big.js', { size: C.MAX_EDIT_BYTES + 1 }).tooLargeToView
    && C.classify('huge.js', { size: C.MAX_VIEW_BYTES + 1 }).tooLargeToView);
check('generated manifest recognized', C.isGeneratedManifest('{"name":"x","generator":"builder.puter.com"}'));
check('a user manifest is not', !C.isGeneratedManifest('{"name":"x"}'));
check('folders sort first', C.sortEntries([{ name: 'b.js' }, { name: 'a', isDir: true }, { name: 'A.css' }])
    .map((e) => e.name).join(',') === 'a,A.css,b.js');

// --- text ---
check('CRLF and LF compare equal', C.sameContent('a\r\nb\n', 'a\nb\n'));
check('different text is different', !C.sameContent('a', 'b'));
check('two-space indent', C.detectIndent('a {\n  b;\n  c;\n}\n') === '  ');
check('four-space indent', C.detectIndent('function f() {\n    if (x) {\n        y();\n    }\n}\n') === '    ');
check('tab indent', C.detectIndent('a {\n\tb;\n\tc;\n}\n') === '\t');
check('hash is stable', C.hashText('hello') === C.hashText('hello') && C.hashText('hello') !== C.hashText('hellp'));

// --- protected ranges ---
const REPORTER = `<script>
window.onerror=function(msg,src,line,col,err){window.parent.postMessage({type:'app-error',message:msg},'*');};
</script>`;
const RUNTIME = '<script src="https://builder.puter.com/runtime.js" defer></script>';
const PWA = '<!-- puter-pwa: generated, do not edit -->\n    <link rel="manifest" href="manifest.json">\n    <!-- /puter-pwa -->';
const page = `<!DOCTYPE html>\n<html>\n<head>\n  <title>t</title>\n  ${REPORTER}\n  ${RUNTIME}\n  <script src="app.js"></script>\n  <script>console.log('mine')</script>\n    ${PWA}\n</head>\n<body></body>\n</html>\n`;
const ranges = C.protectedRanges(page);
check('three protected ranges in a page', ranges.length === 3);
check('ranges are in order', ranges.map((r) => r.kind).join(',') === 'reporter,runtime,pwa');
check('the reporter range is the whole script element',
    page.slice(ranges[0].from, ranges[0].to) === REPORTER && ranges[0].fold === true);
check('the runtime tag range is just the tag', page.slice(ranges[1].from, ranges[1].to) === RUNTIME && ranges[1].fold === false);
check('the pwa range runs marker to marker', page.slice(ranges[2].from, ranges[2].to) === PWA);
check('the app\'s own scripts stay editable', !ranges.some((r) => page.slice(r.from, r.to).includes('app.js') || page.slice(r.from, r.to).includes("'mine'")));
check('every range has a title', ranges.every((r) => typeof r.title === 'string' && r.title.length > 20));
check('folded ranges have a label', ranges.filter((r) => r.fold).every((r) => r.label));
check('legacy badge.js tag is protected', C.protectedRanges('<script defer src=\'https://builder.puter.com/badge.js\'></script>').length === 1);
check('a lookalike URL is not protected', C.protectedRanges('<script src="https://builder.puter.com/runtime.js-custom"></script>').length === 0);
check('a plain page has nothing protected', C.protectedRanges('<p>hi</p>').length === 0);
check('an unclosed pwa block is left alone', C.protectedRanges('<!-- puter-pwa: generated, do not edit -->\n<link>').length === 0);
check('generated blocks drop out of comparisons',
    C.withoutGeneratedBlocks(`a\n${PWA}\nb`) === C.withoutGeneratedBlocks(`a\n${PWA.replace('manifest.json', 'other.json')}\nb`));

// --- one open file ---
let b = C.openBuffer('one\n');
check('a fresh buffer is clean', b.status === 'clean' && !C.isDirtyStatus(b.status));
b = C.reduceBuffer(b, { type: 'edit', text: 'two\n' });
check('typing makes it dirty', b.status === 'dirty' && C.isDirtyStatus(b.status));
b = C.reduceBuffer(b, { type: 'edit', text: 'one\n' });
check('typing it back makes it clean again', b.status === 'clean');
b = C.reduceBuffer(b, { type: 'disk', text: 'one\r\n' });
check('a line-ending-only disk change is no change', b.status === 'clean' && b.base === 'one\n');
b = C.reduceBuffer(b, { type: 'disk', text: 'AI wrote this\n' });
check('a clean buffer follows the disk', b.status === 'clean' && b.text === 'AI wrote this\n' && b.base === 'AI wrote this\n');
b = C.reduceBuffer(b, { type: 'edit', text: 'mine\n' });
b = C.reduceBuffer(b, { type: 'disk', text: 'theirs\n' });
check('a dirty buffer never loses its text to the disk', b.status === 'conflict' && b.text === 'mine\n' && b.disk === 'theirs\n');
const kept = C.reduceBuffer(b, { type: 'keepMine' });
check('keep mine rebases on the disk copy', kept.status === 'dirty' && kept.text === 'mine\n' && kept.base === 'theirs\n');
const taken = C.reduceBuffer(b, { type: 'useTheirs' });
check('use theirs takes the disk copy', taken.status === 'clean' && taken.text === 'theirs\n');
let s = C.reduceBuffer(C.reduceBuffer(C.openBuffer('a'), { type: 'edit', text: 'b' }), { type: 'saving' });
s = C.reduceBuffer(s, { type: 'edit', text: 'c' });
check('typing during a save keeps the new text', s.status === 'saving' && s.text === 'c');
s = C.reduceBuffer(s, { type: 'saved', text: 'b' });
check('a save that missed later typing leaves the buffer dirty', s.status === 'dirty' && s.base === 'b' && s.text === 'c');
s = C.reduceBuffer(s, { type: 'saving' });
s = C.reduceBuffer(s, { type: 'saved', text: 'c' });
check('a complete save is clean', s.status === 'clean');
let f = C.reduceBuffer(C.reduceBuffer(C.openBuffer('a'), { type: 'edit', text: 'b' }), { type: 'saving' });
f = C.reduceBuffer(f, { type: 'failed', error: 'offline' });
check('a failed save keeps the text and says why', f.status === 'error' && f.text === 'b' && f.error === 'offline' && C.isDirtyStatus(f.status));
check('the disk does not interrupt a save', C.reduceBuffer({ ...f, status: 'saving' }, { type: 'disk', text: 'x' }).status === 'saving');
const d = C.reduceBuffer(C.reduceBuffer(C.openBuffer('a'), { type: 'edit', text: 'b' }), { type: 'discard' });
check('discard goes back to the disk copy', d.status === 'clean' && d.text === 'a');
const blockPage = `x\n${PWA}\ny\n`;
let g = C.reduceBuffer(C.openBuffer(blockPage), { type: 'edit', text: blockPage + 'z\n' });
g = C.reduceBuffer(g, { type: 'disk', text: blockPage.replace('manifest.json', 'm2.json') });
check('a restamped install block is not a conflict', g.status === 'dirty' && g.base.includes('m2.json') && g.text.endsWith('z\n'));

// --- diffs ---
const ops = C.lineDiff('a\nb\nc\n', 'a\nB\nc\nd\n');
check('diff marks the change and the addition',
    ops.map((o) => o.op + o.text).join('|') === ' a|-b|+B| c|+d');
check('changed lines are in the new text', C.changedLines('a\nb\nc\n', 'a\nB\nc\nd\n').join(',') === '2,4');
check('identical text has no changed lines', C.changedLines('x\ny', 'x\ny').length === 0);
const ud = C.unifiedDiff('1\n2\n3\n4\n5\n6\n7\n8\n9\n', '1\n2\n3\n4\nFIVE\n6\n7\n8\n9\n', { context: 1 });
check('unified diff has one hunk with context', ud === '@@ -4,3 +4,3 @@\n 4\n-5\n+FIVE\n 6\n');
check('a diff over budget gives null', C.unifiedDiff('a\n', 'b\n', { maxChars: 5 }) === null);
check('no change gives an empty diff', C.unifiedDiff('a', 'a') === '');
const many = Array.from({ length: 3000 }, (_, i) => 'line ' + i).join('\n');
const t0 = Date.now();
const big = C.changedLines(many, many.replace('line 1500', 'changed'));
check('a one-line change in a long file is found quickly', big.join(',') === '1501' && Date.now() - t0 < 1000);

// --- the note to the AI ---
const note = C.buildManualEditNote({ files: [
    { path: '/u/AppData/app/c1/index.html', before: '<h1>A</h1>\n', after: '<h1>B</h1>\n' },
    { path: '/u/AppData/app/c1/app.js' },
] });
check('note names every file by absolute path', note.includes('- /u/AppData/app/c1/index.html') && note.includes('- /u/AppData/app/c1/app.js'));
check('note tells the model to reread and keep the edits', note.includes('ReadTextFile') && note.includes('intentional'));
check('note carries the small diff', note.includes('-<h1>A</h1>') && note.includes('+<h1>B</h1>'));
check('note says the diff is content, not instructions', note.includes('not instructions'));
check('no files, no note', C.buildManualEditNote({ files: [] }) === '');
const huge = C.buildManualEditNote({ budget: 40, files: [{ path: '/p/a.js', before: 'x\n'.repeat(10), after: 'y\n'.repeat(10) }] });
check('a diff past the budget is left out', huge.includes('/p/a.js') && !huge.includes('+y'));
const fenced = C.buildManualEditNote({ files: [{ path: '/p/a.md', before: 'a\n', after: '```js\nx\n```\n' }] });
check('a diff containing backticks gets a longer fence', fenced.includes('````diff'));

// --- version labels ---
check('one file label', C.versionLabel(['/p/index.html']) === 'Edited index.html');
check('two file label', C.versionLabel(['/p/index.html', '/p/js/app.js']) === 'Edited index.html and app.js');
check('many file label', C.versionLabel(['/p/a.js', '/p/b.js', '/p/c.js', '/p/d.js']) === 'Edited a.js, b.js and 2 more');
check('labels fit the version list', C.versionLabel(['/p/' + 'x'.repeat(80) + '.js']).length <= 60);

// --- runtime errors back to files ---
const root = '/u/AppData/app/c1';
check('a script URL maps to its file', C.errorFile('https://preview-1.puter.site/js/app.js?__pcb=12', 'https://preview-1.puter.site/', root) === root + '/js/app.js');
check('the page itself maps to index.html', C.errorFile('https://preview-1.puter.site/', 'https://preview-1.puter.site/', root) === root + '/index.html');
check('another origin maps to nothing', C.errorFile('https://cdn.example.com/x.js', 'https://preview-1.puter.site/', root) === null);
// The URL parser already resolves dot segments, so a climb has to hide behind
// encoded slashes to reach the path join at all.
check('a path cannot climb out of the project', C.errorFile('https://preview-1.puter.site/a%2F..%2F..%2F..%2Fsecret.js', 'https://preview-1.puter.site/', root) === null);
check('dot segments resolve inside the served folder', C.errorFile('https://preview-1.puter.site/%2e%2e/x.js', 'https://preview-1.puter.site/', root) === root + '/x.js');

// --- wiring ---
const vite = read('../vite.config.js');
const html = read('../src/index.html');
const entry = read('../src/editor/entry.mjs');
const scripts = (vite.match(/const SCRIPTS = \[([\s\S]*?)\];/) || [])[1] || '';
check('editor-core ships in the bundle', scripts.includes("'js/editor-core.js'"));
check('the Code view UI ships after app.js and versions.js',
    scripts.indexOf("'js/code-editor.js'") > scripts.indexOf("'js/versions.js'")
    && scripts.indexOf("'js/versions.js'") > scripts.indexOf("'js/app.js'"));
check('the editor loader is a module script before the MCP entry',
    html.indexOf('/editor/entry.mjs') > 0 && html.indexOf('/editor/entry.mjs') < html.indexOf('/mcp/entry.mjs'));
check('the loader imports CodeMirror lazily, never statically',
    entry.includes("import('./codemirror.mjs')") && !/^\s*import\s/m.test(entry));
check('the loader retries after a failed fetch', /editorModule\s*=\s*null/.test(entry));
check('the editor chunk stays out of the precache', /EDITOR_CHUNK_RE\.test\(f\)/.test(vite) && /codemirror-/.test(vite));
const flags = read('../src/js/helpers.js');
check('the codeEditor flag is a literal boolean', /^\s*codeEditor:\s*(true|false)\s*,/m.test(flags));

// --- hooks that keep hand edits and the AI in step ---
// Each of these closes a way a hand edit could be lost or the AI could work
// from a stale copy. A refactor that drops one must fail here.
const app = read('../src/js/app.js');
const ui = read('../src/js/ui.js');
const versions = read('../src/js/versions.js');
const tools = read('../src/js/tools.js');
const write = read('../src/tools/fs/write.js');
const readTool = read('../src/tools/fs/read.js');
const worker = read('../src/tools/workers/create_worker.js');
const editor = read('../src/js/code-editor.js');
check('write refuses a hand-edited file the model has not reread, before taking the lock',
    write.indexOf('await window.CodeEditor?.assertModelMayOverwrite?.(path);') > 0
    && write.indexOf('await window.CodeEditor?.assertModelMayOverwrite?.(path);') < write.indexOf('window.withFileLock('));
check('create_worker refuses the same way', worker.includes('await window.CodeEditor?.assertModelMayOverwrite?.(filePath);'));
check('ReadTextFile lifts the guard at once for a file that is gone, and notes a whole read for after the round',
    (readTool.match(/window\.CodeEditor\?\.noteModelRead\?\.\(path\)/g) || []).length === 1
    && readTool.includes('if (state) state.lastFullRead = text.length <= MAX_CHARS ? path : null;'));
check('a whole read lifts its guard once the round is over, only when its result was kept in the open chat',
    tools.includes('if (fullRead) c.readsThisRound.push(fullRead);')
    && tools.includes("if (typeof chatHistory !== 'undefined' && c.chatHistory === chatHistory) {")
    && /if \(isAborted\(c\.abortController\) \|\| isStaleTurn\(c\)\) \{\s*liftReadGuards\(\);\s*return/.test(tools)
    && /liftReadGuards\(\);\s*\/\/ Checkpoint this round/.test(tools));
check('the refusal also covers a file whose read comes back truncated',
    editor.includes('If the read comes back truncated, use edit or multi_edit, since writing the whole file stays refused.'));
check('renames, moves, copies and deletes carry the guard, after the tool succeeded',
    tools.indexOf('window.CodeEditor?.onModelFileOp?.(toolCall.name, toolCall.input, c);') > tools.indexOf('const toolResponse = await executeFunction('));
check('open files follow what the AI writes', tools.includes('window.CodeEditor?.onToolWrite?.(toolCall.name, c.currentChatId);'));
check('a send saves code and takes a version before the turn, then checks the busy guards again',
    /await window\.CodeEditor\.beforeTurn\(\{/.test(app)
    && app.indexOf('await window.CodeEditor.beforeTurn({') < app.indexOf('    isProcessing = true;\n')
    && /window\._restoringVersion \|\| window\.isRestoreStarting\?\.\(setupChatId\)\) busyNow =/.test(app) && /isPublishStarting\?\.\(setupChatId\)\) busyNow =/.test(app));
check('the composer is read only while the send saves code', app.includes("if (lockComposer) $composer.prop('readonly', true);"));
check('the hidden note rides on the user message and clears only once it is in history',
    app.includes("if (manualEditNote) contentParts.push({ type: 'text-hidden', text: manualEditNote });")
    && /userMessageAppended = true;\s*if \(manualEditNote\) window\.CodeEditor\?\.notePosted\?\.\(turnChatId\);/.test(app));
check('the editor unlocks only after the turn has unwound',
    /resetUIState\(turnChatId\);[\s\S]{0,300}window\.CodeEditor\?\.onTurnEnd\?\.\(turnChatId\);/.test(app));
check('switching, deleting and copying projects tell the editor',
    app.includes('window.CodeEditor?.onProjectSwitch?.();') && app.includes('window.CodeEditor?.onProjectDeleting?.(chatId);')
    && app.indexOf('window.CodeEditor?.onProjectDeleted?.(chatId,') > app.indexOf('if (undeleted.length) {')
    && app.includes('window.CodeEditor?.onProjectCopied?.(chatId, newId, oldAppDir, newAppDir, workerRenames);'));
check('Back/Forward and closing the tab guard unsaved code',
    app.includes('(isProcessing || window.CodeEditor?.hasUnsaved?.())') && app.includes('if (!isProcessing && !window.CodeEditor?.hasUnsaved?.()) return;'));
check('both preview error handlers hold their automatic fix after hand edits',
    (ui.match(/if \(window\.CodeEditor\?\.holdAutoFix\?\.\(\{ report: errorReport/g) || []).length === 2);
check('leaving a project asks about unsaved code', /async function confirmLeaveActiveChat\(\) \{[\s\S]*?window\.CodeEditor\.confirmLeave\(\)/.test(ui));
check('publishing saves code first behind a starting lock',
    ui.includes('_publishStarting.add(savingFor);') && ui.includes('await window.CodeEditor.prepareForPublish(savingFor);'));
check('publishing waits while a send is being set up, or a restore saves code first',
    /function publishBlockedReason\(\) \{[\s\S]*?_sendSetupInFlight\) return 'task';[\s\S]*?window\.isRestoreStarting\?\.\(currentChatId\)\) return 'restore';/.test(ui));
check('a send waits while a publish or a restore saves code first',
    app.includes('if (window.isPublishInFlight?.(currentChatId) || window.isPublishStarting?.(currentChatId)) {')
    && app.includes('if (window._restoringVersion || window.isRestoreStarting?.(currentChatId)) {'));
check('a publish that yields after its save says why, and leaves no preview refresh pending',
    /const blockedNow = publishBlockedReason\(\);\s*if \(blockedNow \|\| publishBusyHere\(\)\) \{\s*renderPublishPanel\(\);/.test(ui)
    && ui.includes('if (savedCodeForPublish && currentChatId === chatId) flushPreviewRefresh();'));
check('both plan refresh paths reach the editor', (ui.match(/window\.CodeEditor\?\.onPlanChanged\?\.\(\);/g) || []).length === 2);
check('the picker is disarmed inside the app, not just in the toolbar', /window\.disarmPreviewPicker = function \(\) \{[\s\S]*?enabled: false/.test(ui));
check('restores save code first behind a starting mark, wait for sends and publishes, and report whether their note was posted',
    /_restoresStarting\.add\(startingChat\);[\s\S]{0,200}await window\.CodeEditor\.beforeRestore\(startingChat, \{ skipConfirm \}\);[\s\S]{0,120}_restoresStarting\.delete\(startingChat\);/.test(versions)
    && versions.includes('window.CodeEditor?.onRestoreEnd?.(chatId, filesTouched, restoreNoted);')
    && /restoreNoted = true;/.test(versions) && /_sendSetupInFlight\)\) \{\s*await puter\.ui\.alert\('Please wait for the current task/.test(versions));
check('a saved backend redeploys under its own name, sandboxed, on the restore queue',
    /window\.redeployWorkerSource = function[\s\S]*?puter\.workers\.create\(worker\.name, worker\.file_path, \{ sandbox: true \}\)/.test(versions));
check('a save re-checks a delete inside the lock, before writing',
    /if \(deleted\(file\.chatId\)\) return \{ gone: true \};\s*let out = text;/.test(editor));
check('the auto-fix hold rests on the stored note, so it survives a reload or a switch',
    /holdAutoFix\(err\) \{[\s\S]*?if \(!hasPendingNote\(chatId\) && !hasUnsaved\(chatId\)\) return false;/.test(editor));
const cm = read('../src/editor/codemirror.mjs');
check('an edit that would lose typed text over locked lines is dropped whole, except Replace All, indenting and dedenting',
    cm.includes("const independent = replaceAll || tr.isUserEvent('input.indent') || tr.isUserEvent('indent') || tr.isUserEvent('delete.dedent');")
    && cm.includes('|| (dropsInsert && !independent)))'));
check('a single Replace over a lock is dropped whole, and Replace All leaves out each match that overlaps one',
    cm.includes("|| (tr.isUserEvent('input.replace') && !replaceAll)")
    && cm.includes('if (replaceAll) spans.push(...straddles);'));
check('a comment toggle that touches or wraps a lock is dropped whole',
    cm.includes('const noEvent = tr.annotation(Transaction.userEvent) == null;')
    && cm.includes('|| noEvent) {')
    && /if \(!touches && noEvent\) \{[\s\S]*?fromA <= r\.to && toA >= r\.from/.test(cm));
check('a send called off after part of its save runs the preview refresh it scheduled',
    app.includes('if (currentChatId === setupChatId && _loadChatSeq === _loadChatSettledSeq) window.flushPreviewRefresh?.();'));
check('a send called off during setup clears its flag before the editor redraws',
    /if \(!ready \|\| currentChatId !== setupChatId \|\| busyNow\) \{[\s\S]{0,200}?_sendSetupInFlight = false;\s*window\.CodeEditor\.onTurnEnd\?\.\(setupChatId\);/.test(app));
check('the editor redraws when a publish or a restore starts or stops saving code first',
    /_publishStarting\.add\(savingFor\);\s*window\.CodeEditor\?\.onStartingChange\?\.\(\);/.test(ui)
    && /_publishStarting\.delete\(savingFor\);\s*window\.CodeEditor\?\.onStartingChange\?\.\(\);/.test(ui)
    && /_restoresStarting\.add\(startingChat\);\s*window\.CodeEditor\?\.onStartingChange\?\.\(\);/.test(versions)
    && /_restoresStarting\.delete\(startingChat\);\s*window\.CodeEditor\?\.onStartingChange\?\.\(\);/.test(versions)
    && editor.includes('onStartingChange() { renderChrome(); },'));
check('a failed pre-publish save still runs the preview refresh its earlier saves scheduled',
    /if \(settled === 'failed'\) \{[\s\S]{0,200}?if \(currentChatId === savingFor\) flushPreviewRefresh\(\);/.test(ui));
check('a restore is dropped when the user leaves the project during its pre-save',
    /_restoresStarting\.delete\(startingChat\);[\s\S]{0,400}?if \(currentChatId !== startingChat\) return;\s*if \(!editorReady\) return;/.test(versions));
check('a locked-line warning sits over the status instead of replacing it',
    /function flashStatus\(text\) \{[\s\S]*?S\.flash = flash;/.test(editor) && editor.includes('const shown = S.flash || S.status;'));
check('a copied backend keeps its hand-edit note and guard under its renamed file',
    /onProjectCopied\(fromChatId, toChatId, fromAppDir, toAppDir, renames\) \{[\s\S]*?\[norm\(r\.copiedFilePath\), norm\(r\.newFilePath\)\][\s\S]*?return renamed\.get\(q\) \|\| q;/.test(editor));
check('edits to a file deleted elsewhere count for the leave checks, and leaving asks first',
    editor.includes('hasUnsaved: (chatId) => hasUnsaved(chatId) || strandedFiles(chatId).length > 0,')
    && /async confirmLeave\(\) \{[\s\S]*?const askStranded = async \(\) => \{\s*const fresh = strandedFiles\(\)/.test(editor)
    && (editor.match(/if \(!await askStranded\(\)\) return false;/g) || []).length === 2
    && /const leave = \(\) => \{\s*for \(const f of lost\) clearDraft\(f\.abs\);/.test(editor)
    && /if \(choice === 'discard'\) \{[^}]*?for \(const f of strandedFiles\(\)\) lost\.add\(f\);\s*discardAll\(\);\s*return leave\(\);/.test(editor));
check('a file deleted elsewhere shows the unsaved dot, and closing it drops its draft',
    editor.includes("const dirty = holdsUnsaved(file);") && editor.includes("const dirty = holdsUnsaved(f);")
    && editor.includes("(hasUnsaved() || strandedFiles().length > 0)")
    && editor.includes("if (file.buf && file.buf.status === 'deleted') clearDraft(abs);"));
const moveTool = read('../src/tools/fs/move.js');
check('a move carries each file’s guard as it lands, and the after-tool hook leaves moves alone',
    /await window\.withFileLock\(path, \(\) => puter\.fs\.move\(path, destination\)\);[\s\S]{0,300}?window\.CodeEditor\?\.onModelFileOp\?\.\('move', \{ paths_array: \[path\], destination \}, state\);/.test(moveTool)
    && tools.includes("if (toolCall.name !== 'move') window.CodeEditor?.onModelFileOp?.(toolCall.name, toolCall.input, c);"));
check('the editor is read only while it saves before a publish, a restore or leaving',
    editor.includes('!turnRunning() && !settlingIn(file.chatId) &&')
    && editor.includes('return await whileSettling(chatId || S.chatId, () => saveAll(Object.assign({ chatId }, opts))) ? \'ok\' : \'failed\';')
    && editor.includes('if (!await whileSettling(S.chatId, () => saveAll())) {'));
check('a save keeps the draft of text typed while it ran, but not of dropped edits or a closed file',
    editor.includes('if (open && C.isDirtyStatus(file.buf.status)) saveDraftSoon(file);')
    && /if \(file\.dropped\) \{[\s\S]{0,400}?file\.buf = C\.reduceBuffer\(file\.buf, \{ type: 'discard' \}\);/.test(editor)
    && editor.includes("if (file.buf.status === 'saving') file.dropped = true;"));
check('saving before a turn, publish, restore or leave saves again when it joined an older save',
    editor.includes("if (saved && file.handle && file.buf && file.buf.status === 'dirty') saved = await saveFile(file, opts);"));

if (failures) {
    console.error(`\n${failures} check(s) failed`);
    process.exit(1);
}
console.log('\nAll editor-core checks passed');
