import fs from 'node:fs';
import vm from 'node:vm';

// ---- Regression guard: a Stopped turn that unwinds late stays out of the way --
// Stop drops isProcessing at once, but a turn parked in a slow tool (tool execs
// aren't abortable) only reaches its end-of-turn teardown when that tool
// returns. By then the user may have started a newer turn in the same chat, or
// a version restore (restore is only refused while a turn is PROCESSING). The
// late teardown used to:
//   * snapshot the project mid-restore — capturing a half-restored directory
//     under the stopped prompt's label, while its cap prune deleted the version
//     being restored from (index.current left pointing at a missing version);
//   * snapshot/save over the newer turn's state — its save (interrupted:true)
//     landing after the newer turn's final save brought back a Resume banner
//     on a finished build;
//   * remove the newer turn's thinking dots;
//   * settle the Issues batch of the newer turn as failed.
//
// Functional for versions.js (the real module in a VM, a late snapshot fired
// mid-restore); text-level for the guards in app.js, tools.js and issues.js.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');

// ---- versions.js: a snapshot requested mid-restore is refused ----------------
{
    const source = read('../src/js/versions.js');
    const appDir = '/alice/AppData/builder/project';
    const root = '/alice/AppData/builder/.versions/chat1';
    const files = new Map();
    const versions = [];
    for (let i = 1; i <= 30; i++) {
        versions.push({ id: 'v' + i, label: 'turn ' + i });
        for (let f = 0; f < 5; f++) files.set(`${root}/v${i}/f${f}.js`, `v${i}-f${f}`);
    }
    for (let f = 0; f < 5; f++) files.set(`${appDir}/f${f}.js`, `v30-f${f}`);
    files.set(root + '/index.json', JSON.stringify({ current: 'v30', versions }));
    const tick = () => new Promise((r) => setTimeout(r, 2));
    const under = (p) => [...files.keys()].some((k) => k.startsWith(p + '/'));
    let copies = 0, lateFired = false;
    const events = new Map();
    const alerts = [];
    const $ = (t) => ({ length: 0, on(e, s, h) { if (typeof s === 'string') events.set(e + ':' + s, h); return this; }, prop() { return this; }, data() { return t.versionId; } });
    const window = { user: { username: 'alice' }, showToast() {}, showPreviewUpdating() {} };
    const puter = {
        appID: 'builder',
        ui: { alert: async (m) => alerts.push(String(m)) },
        fs: {
            read: async (p) => { await tick(); if (!files.has(p)) throw new Error('not found: ' + p); return { text: async () => files.get(p) }; },
            write: async (p, d) => { await tick(); files.set(p, d); },
            mkdir: async () => {},
            stat: async (p) => { await tick(); if (!under(p)) throw new Error('not found: ' + p); return {}; },
            readdir: async (p) => {
                await tick();
                const m = new Map();
                for (const k of files.keys()) {
                    if (!k.startsWith(p + '/')) continue;
                    const rel = k.slice(p.length + 1);
                    m.set(rel.split('/')[0], { name: rel.split('/')[0], is_dir: rel.includes('/') });
                }
                return [...m.values()];
            },
            copy: async (from, to, o = {}) => {
                await tick();
                if (from.startsWith(root + '/v1/')) {
                    copies++;
                    // The Stopped turn reaches its end-of-turn snapshot while the
                    // restore is copying the old version in.
                    if (copies === 1 && !lateFired) {
                        lateFired = true;
                        window.createProjectVersion({ chatId: 'chat1', appDir, label: 'the prompt the user stopped' });
                    }
                }
                if (!files.has(from) && !under(from)) throw new Error('not found: ' + from);
                const dest = to + '/' + (o.newName || from.split('/').at(-1));
                if (files.has(from)) files.set(dest, files.get(from));
                else for (const [k, v] of [...files]) if (k.startsWith(from + '/')) files.set(dest + k.slice(from.length), v);
            },
            delete: async (p) => { await tick(); for (const k of [...files.keys()]) if (k === p || k.startsWith(p + '/')) files.delete(k); },
        },
    };
    vm.runInNewContext(source, {
        window, puter, $, document: {}, currentChatId: 'chat1', currentAppDir: appDir, isProcessing: false,
        puterConfirm: async () => true, localStorage: { getItem() { return null; }, setItem() {} },
        isNotFoundError: (e) => /not found/.test(e.message), console: { warn() {}, error() {} },
    });
    check('restoresStartedFor starts at zero', window.restoresStartedFor('chat1') === 0);
    events.get('click:.version-restore').call({ versionId: 'v1' }, { preventDefault() {}, stopPropagation() {} });
    for (let n = 0; n < 50 && !window._restoringVersion; n++) await tick();
    for (let n = 0; n < 1000 && window._restoringVersion; n++) await tick();
    await new Promise((r) => setTimeout(r, 100));
    const idx = JSON.parse(files.get(root + '/index.json'));
    check('a late snapshot fired mid-restore was actually attempted (the scenario ran)', lateFired);
    check('the version restored from is still listed', idx.versions.some((v) => v.id === 'v1'));
    check('…and its files are still on disk', under(root + '/v1'));
    check('index.current names the restored version', idx.current === 'v1', idx.current);
    check('no snapshot was taken of the half-restored directory', !idx.versions.some((v) => v.label === 'the prompt the user stopped'),
        JSON.stringify(idx.versions.at(-1)));
    check('the project holds exactly the restored version', [0, 1, 2, 3, 4].every((f) => files.get(`${appDir}/f${f}.js`) === `v1-f${f}`));
    check('restoresStartedFor counted the restore', window.restoresStartedFor('chat1') === 1);
    check('no error was shown', alerts.length === 0, JSON.stringify(alerts));
}

// ---- app.js: the late teardown leaves newer work alone -------------------------
{
    const app = read('../src/js/app.js');
    const send = app.slice(app.indexOf('async function sendChatMessage('));
    check('each turn records itself as its chat\'s newest', /_latestTurnSeqByChat\.set\(turnChatId, turnSeq\)/.test(send));
    check('the restore count is read at turn start', /const turnRestoreGen = window\.restoresStartedFor\?\.\(turnChatId\)/.test(send));
    check('the end-of-turn snapshot is skipped once superseded in this chat or after a restore began',
        /if \(!supersededSameChat && !restoredSince && window\._filesChangedThisTurn > 0\)/.test(send));
    check('the end-of-turn save is skipped once a newer turn owns this chat',
        /if \(!supersededSameChat\) \{\s*try \{\s*await Promise\.race\(\[\s*scheduleSaveCurrentChat\(turnSaveContext\)/.test(send));
    check('the issues report carries the turn id', /notifyIssuesTurnFinished\?\.\(\{ chatId: turnChatId, succeeded: turnSucceeded, turnSeq \}\)/.test(send));
    check('callers can learn which turn carries them', /opts\.onTurnStart\(turnSeq\)/.test(send));
}

// ---- tools.js: no touching another turn's spinner -------------------------------
{
    const tools = read('../src/js/tools.js');
    const body = tools.slice(tools.indexOf('async function handleToolCalls('));
    const bail = body.indexOf("if (isAborted(c.abortController) || isStaleTurn(c)) {\n        return { error: 'Aborted', history: c.chatHistory };\n    }\n    spinner = showSpinner();");
    check('a stopped/stale round bails before showSpinner() can hand it another turn\'s dots', bail > 0);
    check('…and never removes a spinner on that path', !/spinner\.remove\(\)/.test(body.slice(0, body.indexOf('await abortableAwait(puter.ai.chat('))));
    check('a stopped/stale round skips its mid-turn checkpoint save (the turn\'s own end-of-turn save covers it)',
        /if \(toolCalls\.length > 0 && !isAborted\(c\.abortController\) && !isStaleTurn\(c\)\) \{\s*scheduleSaveCurrentChat\(c\);/.test(body));
}

// ---- issues.js: a batch is settled only by the turn that carries it -----------
{
    const issues = read('../src/js/issues.js');
    check('the batch records the turn carrying it', /onTurnStart: \(seq\) => \{ armed\.turnSeq = seq; \}/.test(issues));
    check('another turn\'s report is ignored', /batch\.turnSeq != null && opts\.turnSeq != null && batch\.turnSeq !== opts\.turnSeq\) return;/.test(issues));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll stopped-turn unwind checks passed.');
