import fs from 'node:fs';

// ---- Regression guard: only written files are queued for preview checking ----
// After every tool call the dispatcher records the paths it touched; before the
// preview reloads, those files are probed on the live site (at most six, see
// buildProbeTargets in ui.js) until they serve the new bytes. The recording ran
// for EVERY tool, so the files the model merely read (ReadTextFile, ViewImage,
// stat, SearchFiles…) took probe slots, and a file that actually changed could
// go unverified — the preview then reloaded before it had propagated.
//
// Runs the real handleToolCalls from tools.js against stubs, with the real
// isMutatingTool from versions.js.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const versions = read('../src/js/versions.js');
const m = versions.indexOf('const MUTATING_TOOLS =');
const e = versions.indexOf('window.isMutatingTool = function', m);
const eEnd = versions.indexOf('};', e) + 2;
const win = {};
new Function('window', versions.slice(m, versions.indexOf('\n', m)) + '\n' + versions.slice(e, eEnd))(win);
check('versions.js exposes isMutatingTool', typeof win.isMutatingTool === 'function' && win.isMutatingTool('write') && !win.isMutatingTool('ReadTextFile'));

// The real path resolver from helpers.js: the tools act on the path it
// returns (relative paths resolved against the project, ./ ../ // normalised),
// so the recording must report THAT path.
const helpers = read('../src/js/helpers.js');
const hStart = helpers.indexOf('window.normalizePosixPath = function');
const hEnd = helpers.indexOf('window.assertPathsInProject = function');
new Function('window', helpers.slice(hStart, hEnd))(win);
check('helpers.js exposes assertPathInProject', typeof win.assertPathInProject === 'function');

const tools = read('../src/js/tools.js');
const recorded = [];
let aborted = false;
win.recordPreviewChange = (p) => recorded.push(p);
win.markProjectModified = () => {};
const handleToolCalls = new Function('window',
    'const generateMessageId = () => "m"; const hasActiveTodos = () => false; const appendMessage = () => {};' +
    'const isAborted = () => aborted; const isStaleTurn = () => false; const scheduleSaveCurrentChat = () => {};' +
    'let aborted = false; window.__abort = () => { aborted = true; }; window.__reset = () => { aborted = false; };' +
    'const executeFunction = async (name) => { if (name === "edit") window.__abort(); return { ok: true }; };' +
    'const hasToolResultFor = () => false;' +
    tools.slice(tools.indexOf('function addToolResultToHistory('), tools.indexOf('function hasToolResultFor(')) +
    tools.slice(tools.indexOf('async function handleToolCalls('), tools.lastIndexOf('}') + 1) +
    '\nreturn handleToolCalls;')(win);

const use = (id, name, input) => ({ type: 'tool_use', id, name, input });
await handleToolCalls([
    use('1', 'ReadTextFile', { path: '/u/app/styles.css' }),
    use('2', 'ViewImage', { path: '/u/app/assets/logo.png' }),
    use('3', 'stat', { path: '/u/app/data.json' }),
    use('4', 'SearchFiles', { path: '/u/app', query: 'x', is_regex: false, case_sensitive: false }),
    use('5', 'write', { path: '/u/app/index.html', content: '<p>new</p>' }),
    use('6', 'rename', { path: '/u/app/old.js', new_name: 'new.js' }),
    use('7', 'edit', { path: '/u/app/app.js', old_content: 'a', new_content: 'b' }),
], true, { chatHistory: [], abortController: {}, currentChatId: 'c1', appDir: '/u/app' });

check('files the model only read are not queued for checking',
    !recorded.some((p) => /styles\.css|logo\.png|data\.json/.test(p)) && !recorded.includes('/u/app'), JSON.stringify(recorded));
check('files the model wrote are queued, at the path they landed',
    recorded.includes('/u/app/index.html') && recorded.includes('/u/app/new.js') && recorded.includes('/u/app/app.js'), JSON.stringify(recorded));

// The model may spell a path relatively or with ./ ../ //; the tools resolve
// it against the project, and the probe matches by exact prefix — so what is
// recorded must be the resolved path, or the file goes unverified.
recorded.length = 0;
win.__reset();
await handleToolCalls([
    use('8', 'write', { path: 'styles.css', content: 'b{}' }),
    use('9', 'write', { path: './app.js', content: 'b' }),
    use('10', 'write', { path: '/u/app/pages/../index.html', content: '<p/>' }),
    use('11', 'rename', { path: 'assets//old.png', new_name: 'new.png' }),
    use('12', 'copy', { path: './a.js', destination: 'lib/' }),
    use('13', 'move', { paths_array: ['b.js', './c.js'], destination: '/u/app/lib' }),
    use('14', 'edit', { path: 'app.js', old_content: 'a', new_content: 'b' }), // last: the stub aborts the turn here
], true, { chatHistory: [], abortController: {}, currentChatId: 'c1', appDir: '/u/app' });
check('a relative path is recorded resolved against the project', recorded.includes('/u/app/styles.css') && recorded.includes('/u/app/app.js'), JSON.stringify(recorded));
check('./ ../ and // are normalised away', recorded.includes('/u/app/index.html') && recorded.includes('/u/app/assets/new.png'), JSON.stringify(recorded));
check('copy and move record the resolved landing paths', recorded.includes('/u/app/lib/a.js') && recorded.includes('/u/app/lib/b.js') && recorded.includes('/u/app/lib/c.js'), JSON.stringify(recorded));
check('nothing is recorded as the model spelled it', !recorded.some((p) => !p.startsWith('/u/app/') || p.includes('/./') || p.includes('/../') || p.includes('//')), JSON.stringify(recorded));

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll preview change-recording checks passed.');
