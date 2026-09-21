import fs from 'node:fs';

// ---- Regression guard: saveCurrentChat updates the LIVE sidebar entry --------
// saveCurrentChatUnlocked (app.js) captured `existingIndex`/`existing` from
// savedChats at the top, then awaited two filesystem calls, then wrote the
// rebuilt entry back at that index. deleteChat filters savedChats (shifting
// every later index) and duplicateChat unshifts, so a build's checkpoint save
// racing a delete landed its entry on a NEIGHBOUR's slot and that project fell
// out of the sidebar and chat-list.json. A rename or pin that landed during the
// awaits mutated the live entry, which the stale rebuild silently reverted.
// Evaluates the REAL function sliced out of app.js against a stub filesystem
// whose write hook mutates the list mid-save, the way those actions do.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const src = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const start = src.indexOf('async function saveCurrentChatUnlocked(context) {');
const end = src.indexOf('\n// Merge just the public-site (Publish) fields', start);
if (start < 0 || end <= start) { console.error('FAIL - could not slice saveCurrentChatUnlocked'); process.exit(1); }
const body = src.slice(start, end);

// Build a sandbox: every global the function touches is injected. `onWrite`
// runs while the chat file is being written — i.e. between the capture at the
// top of the function and the list update at the bottom.
function sandbox({ savedChats, currentChatId, onWrite }) {
    const written = [];
    const calls = { saveChatList: 0, sidebar: 0, url: [] };
    const deleted = new Set();
    const puter = {
        fs: {
            read: async () => ({ text: async () => JSON.stringify({}) }),
            write: async (p, data) => { written.push([p, data]); if (onWrite) await onWrite({ savedChats, deleted }); },
        },
    };
    const factory = new Function(
        '_deletedChatIds', 'savedChats', '_aiProjectTitles', 'generateChatTitle', 'chatFilePath', 'puter',
        'currentChatId', 'window', '_suggestionsByChat', 'setUrlChat', 'saveChatList',
        'updateChatHistorySidebar', 'updateDocumentTitle', 'console',
        body + '\n; return saveCurrentChatUnlocked;',
    );
    const fn = factory(
        deleted, savedChats, new Map(), () => 'Generated title', (id) => `chat-history/${id}.json`, puter,
        currentChatId, { currentPreviewUrl: 'https://y.puter.site/' }, new Map(),
        (id) => calls.url.push(id), async () => { calls.saveChatList++; },
        () => { calls.sidebar++; }, () => {}, { error: () => {}, warn: () => {} },
    );
    return { fn, written, calls, deleted };
}
const history = [{ role: 'system', content: 'x' }, { role: 'user', content: 'hello' }];
const entry = (id, extra) => Object.assign({ id, title: 'T ' + id, customTitle: false, aiTitled: false, timestamp: '2026-01-0' + id.slice(-1) + 'T00:00:00.000Z', lastModified: 'old', previewUrl: null, publishedUrl: null, pinned: false }, extra);

// === A: another project deleted while this one's save was in flight ==========
{
    const list = [entry('c1'), entry('c2'), entry('c3')];
    const s = sandbox({
        savedChats: list, currentChatId: 'c2',
        onWrite: async ({ savedChats }) => { savedChats.splice(0, 1); }, // deleteChat(c1) shifts the indexes
    });
    await s.fn({ chatHistory: history, currentChatId: 'c2', interrupted: false });
    check('delete during save: the saved project stays a single, updated entry',
        list.filter(c => c.id === 'c2').length === 1 && list.find(c => c.id === 'c2').lastModified !== 'old');
    check('delete during save: the neighbour is NOT clobbered', list.some(c => c.id === 'c3'), JSON.stringify(list.map(c => c.id)));
    check('delete during save: order preserved', list.map(c => c.id).join(',') === 'c2,c3');
    check('delete during save: original creation timestamp kept', list.find(c => c.id === 'c2').timestamp === '2026-01-02T00:00:00.000Z');
}

// === B: renamed during the save ==============================================
{
    const list = [entry('c1')];
    const s = sandbox({
        savedChats: list, currentChatId: 'c1',
        onWrite: async ({ savedChats }) => { savedChats[0].title = 'Renamed'; savedChats[0].customTitle = true; },
    });
    await s.fn({ chatHistory: history, currentChatId: 'c1', interrupted: false });
    check('rename during save: the new name survives', list[0].title === 'Renamed' && list[0].customTitle === true, list[0].title);
}

// === C: pinned during the save ===============================================
{
    const list = [entry('c1')];
    const s = sandbox({
        savedChats: list, currentChatId: 'c1',
        onWrite: async ({ savedChats }) => { savedChats[0].pinned = true; },
    });
    await s.fn({ chatHistory: history, currentChatId: 'c1', interrupted: false });
    check('pin during save: the pin survives', list[0].pinned === true);
}

// === D: an AI title that landed on the entry during the save is kept =========
{
    const list = [entry('c1')];
    const s = sandbox({
        savedChats: list, currentChatId: 'c1',
        onWrite: async ({ savedChats }) => { savedChats[0].title = 'Recipe Finder'; savedChats[0].aiTitled = true; },
    });
    await s.fn({ chatHistory: history, currentChatId: 'c1', interrupted: false });
    check('AI title landing during save: kept over the first-message fallback', list[0].title === 'Recipe Finder' && list[0].aiTitled === true);
}

// === E: THIS project deleted while its save was in flight ====================
{
    const list = [entry('c1'), entry('c2')];
    const s = sandbox({
        savedChats: list, currentChatId: 'c1',
        onWrite: async ({ savedChats, deleted }) => { deleted.add('c1'); savedChats.splice(0, 1); },
    });
    await s.fn({ chatHistory: history, currentChatId: 'c1', interrupted: false });
    check('deleted mid-save: never re-added to the list', !list.some(c => c.id === 'c1'), JSON.stringify(list.map(c => c.id)));
    check('deleted mid-save: the list is not re-persisted by this save', s.calls.saveChatList === 0);
}

// === F: the ordinary paths still work ========================================
{
    const list = [entry('c1'), entry('c2')];
    const s = sandbox({ savedChats: list, currentChatId: 'c2' });
    await s.fn({ chatHistory: history, currentChatId: 'c2', interrupted: false });
    check('plain update: entry rebuilt in place', list.length === 2 && list[1].id === 'c2' && list[1].title === 'Generated title');
    check('plain update: list persisted + sidebar refreshed', s.calls.saveChatList === 1 && s.calls.sidebar === 1);
}
{
    const list = [entry('c1')];
    const s = sandbox({ savedChats: list, currentChatId: 'c9' });
    await s.fn({ chatHistory: history, currentChatId: 'c9', interrupted: false });
    check('new project: unshifted to the top', list[0].id === 'c9' && list.length === 2);
    check('new project: URL reflects it', s.calls.url.includes('c9'));
    check('new project: not pinned', list[0].pinned === false);
}

if (failures) { console.error(`\n${failures} chat-list entry check(s) failed.`); process.exit(1); }
console.log('\nAll chat-list entry checks passed.');
