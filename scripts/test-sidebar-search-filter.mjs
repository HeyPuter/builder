import fs from 'node:fs';

// ---- Regression guard: the sidebar search filters without a rebuild ---------
// Each keystroke in the projects search box used to rebuild the whole sidebar
// list — ~40-65 ms with a few hundred projects (most of it re-laying-out every
// entry), several times that on a phone, so typing lagged. Every project is now
// rendered once and the search only hides the entries that don't match
// (applyChatSearchFilter), which must lay the list out exactly as one built
// from the matches alone:
//   * Pinned/Recent labels only while a pinned project matches (Recent also
//     needs a match of its own), else the flat, header-less list;
//   * the first VISIBLE entry under a label gets the tighter gap;
//   * "No projects match your search." when nothing matches.
//
// Functional for applyChatSearchFilter (the real function on a small fake DOM);
// text-level for its wiring into updateChatHistorySidebar and the CSS.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const app = read('../src/js/app.js');
const css = read('../src/css/styles.css');

const start = app.indexOf('function applyChatSearchFilter(chatList) {');
const end = app.indexOf('async function initializeUser() {');
if (start < 0 || end < 0) throw new Error('could not extract applyChatSearchFilter from app.js');
const FILTER = app.slice(start, end);

function el(cls, attrs = {}) {
    const classes = new Set(cls.split(' '));
    return {
        hidden: !!attrs.hidden,
        classList: {
            contains: (c) => classes.has(c),
            toggle: (c, on) => { if (on) classes.add(c); else classes.delete(c); },
        },
        getAttribute: (k) => attrs[k] ?? null,
        has: (c) => classes.has(c),
        text: attrs.text,
    };
}
function render(chats) {
    // What updateChatHistorySidebar builds: every project, sections when one is
    // pinned, and the (hidden) no-match message last.
    const kids = [];
    const pinned = chats.filter((c) => c.pinned), recent = chats.filter((c) => !c.pinned);
    const section = (label, key, items) => {
        if (!items.length) return;
        kids.push(el('chat-section-label', { 'data-section': key, text: label }));
        for (const c of items) kids.push(el('chat-item', { 'data-chat-id': c.id }));
    };
    if (pinned.length) { section('Pinned', 'pinned', pinned); section('Recent', 'recent', recent); }
    else for (const c of recent) kids.push(el('chat-item', { 'data-chat-id': c.id }));
    kids.push(el('chat-list-empty chat-list-no-match', { hidden: true, text: 'No projects match your search.' }));
    return { kids, children: () => ({ each(fn) { kids.forEach((k, i) => fn.call(k, i, k)); } }) };
}
// Shown children as compact tokens: label text, chat id (+ '^' when it has the
// tighter first-in-section gap), or the no-match message.
const visible = (list) => list.kids.filter((k) => !k.hidden)
    .map((k) => k.text ? k.text : k.getAttribute('data-chat-id') + (k.has('section-first') ? '^' : ''));

let refreshes = 0;
function run(chats, query, sidebarOpen = true) {
    const list = render(chats);
    const apply = new Function('savedChats', 'chatSearchQuery', 'chatHistorySidebarOpen', 'refreshStaleChatThumbs',
        FILTER + '\nreturn applyChatSearchFilter;')(chats, query, sidebarOpen, () => { refreshes++; });
    apply(list);
    return { list, again: (q) => { new Function('savedChats', 'chatSearchQuery', 'chatHistorySidebarOpen', 'refreshStaleChatThumbs',
        FILTER + '\nreturn applyChatSearchFilter;')(chats, q, sidebarOpen, () => { refreshes++; })(list); return visible(list); } };
}

const CHATS = [
    { id: 'recipe', title: 'Recipe finder', previewUrl: 'https://draft-0.puter.site/' },
    { id: 'todo', title: 'Todo app', previewUrl: 'https://draft-1.puter.site/', publishedUrl: 'https://todo-app.puter.site/', pinned: true },
    { id: 'blog', title: 'Recipe blog', previewUrl: 'https://draft-2.puter.site/', pinned: true },
    { id: 'chess', title: 'Chess game', previewUrl: 'https://draft-3.puter.site/', publishedUrl: 'https://chess-game.puter.site/' },
    { id: 'sync', title: 'Todo with sync', previewUrl: 'https://draft-4.puter.site/' },
];
const show = (q, chats = CHATS) => visible(run(chats, q).list).join(' ');

check('no query: everything, in sections', show('') === 'Pinned todo^ blog Recent recipe^ chess sync', show(''));
check('matches in both sections: both labels, each first match gets the tight gap',
    show('todo') === 'Pinned todo^ Recent sync^', show('todo'));
check('the tight gap moves to the first entry that is still shown', show('recipe') === 'Pinned blog^ Recent recipe^', show('recipe'));
check('no pinned match: the flat list, no labels, no tight gaps', show('chess') === 'chess', show('chess'));
check('only pinned matches: Pinned label alone', show('blog') === 'Pinned blog^', show('blog'));
check('matches the published address', show('chess-game') === 'chess', show('chess-game'));
check('matches the draft address', show('draft-4') === 'sync', show('draft-4'));
check('case-insensitive and trimmed', show('  TODO ') === show('todo'));
check('nothing matches: just the message', show('zzz') === 'No projects match your search.', show('zzz'));
{
    const flat = CHATS.map((c) => ({ ...c, pinned: false }));
    check('nobody pinned: flat list as before', show('', flat) === 'recipe todo blog chess sync', show('', flat));
    check('nobody pinned, filtered: flat matches', show('recipe', flat) === 'recipe blog', show('recipe', flat));
}
{
    const r = run(CHATS, 'zzz');
    check('re-filtering the same list restores what an earlier query hid', r.again('').join(' ') === show(''), r.again('').join(' '));
    check('…and hides again', r.again('chess').join(' ') === 'chess');
}
{
    refreshes = 0;
    run(CHATS, 'todo', true);
    check('with the sidebar open, entries shown again get their skipped thumbnail refreshes', refreshes === 1);
    refreshes = 0;
    run(CHATS, 'todo', false);
    check('…not while it is closed (opening does that)', refreshes === 0);
}

// ---- Wiring ------------------------------------------------------------------
{
    const fn = app.slice(app.indexOf('function updateChatHistorySidebar() {'), start);
    const sig = fn.slice(fn.indexOf('const renderSig = '), fn.indexOf('chatList.data(\'renderSig\', renderSig);'));
    check('the render signature leaves the query out (a keystroke is not a rebuild)', !/chatSearchQuery|\bq\b/.test(sig), sig);
    check('an unchanged list just re-applies the filter', /if \(chatList\.data\('renderSig'\) === renderSig\) \{\s*applyChatSearchFilter\(chatList\);\s*return;/.test(fn));
    check('a rebuild renders every project and filters after', /savedChats\.filter\(chat => chat\.pinned\)/.test(fn)
        && /chat-list-no-match" hidden/.test(fn) && /applyChatSearchFilter\(chatList\);\s*\n\s*\n\s*\/\/ The rename editor/.test(fn));
    check('labels carry their section', /attr\('data-section', section\)/.test(fn));
    check('CSS: hidden entries are really hidden (.chat-item is flex)', /\.chat-list > \[hidden\] \{ display: none; \}/.test(css));
    check('CSS: the tight gap follows the filter\'s marker, not DOM adjacency',
        /\.chat-item\.section-first \{ margin-top: 2px; \}/.test(css) && !/\.chat-section-label \+ \.chat-item/.test(css));
    const ui = read('../src/js/ui.js');
    check('deleting a filtered-out entry does not wait out the removal animation',
        /if \(!\$item\.length \|\| \$item\.prop\('hidden'\) \|\|/.test(ui));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll sidebar search-filter checks passed.');
