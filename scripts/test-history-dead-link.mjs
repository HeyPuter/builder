import fs from 'node:fs';

// ---- Regression guard: Back onto a dead project fixes the address bar --------
// Back/Forward re-opens the project the URL now names. When that project no
// longer exists (deleted since) — or its load fails — nothing switches, but
// the address bar kept the dead ?p=: a refresh then dropped the open project
// for the landing page, and a copied link went nowhere. The handler now puts
// the URL back on what is actually open.
//
// Runs the real popstate handler from app.js against stubs.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const app = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const marker = "window.addEventListener('popstate', ";
const a = app.indexOf(marker);
const b = app.indexOf('\n});\n', a);
const handlerSrc = app.slice(a + marker.length, b + 2);

function world({ url, open, listed, loadFails = false }) {
    const s = { url, currentChatId: open, savedChats: listed.map((id) => ({ id })), urlWrites: [], loads: [] };
    s.readUrlChatId = () => (s.url.match(/[?&]p=([^&]+)/) || [])[1] || null;
    s.setUrlChat = (id, { replace }) => { s.urlWrites.push({ id, replace }); s.url = id ? '/?p=' + id : '/'; };
    s.loadChat = async (id) => { s.loads.push(id); if (loadFails) throw new Error('read failed'); s.currentChatId = id; };
    s.isProcessing = false;
    s.chatHistory = [{ role: 'system' }, { role: 'user' }];
    s.new_chat = () => { s.newChat = true; };
    s.confirmLeaveActiveChat = async () => true;
    s.handler = new Function('s', `with (s) { return (${handlerSrc}); }`)(s);
    return s;
}

{
    const w = world({ url: '/?p=chat_dead', open: 'chat_b', listed: ['chat_b'] });
    await w.handler();
    check('Back onto a deleted project leaves the open project in the address bar', w.url === '/?p=chat_b' && w.urlWrites[0]?.replace === true, JSON.stringify(w));
    check('…without trying to load the dead one', w.loads.length === 0);
}
{
    const w = world({ url: '/?p=chat_dead', open: 'chat_new', listed: ['chat_b'] });
    await w.handler();
    check('…or a clean / when what is open was never saved (the landing)', w.url === '/', w.url);
}
{
    const w = world({ url: '/?p=chat_a', open: 'chat_b', listed: ['chat_a', 'chat_b'], loadFails: true });
    await w.handler();
    check('a project that fails to load leaves the address bar on the open one', w.loads[0] === 'chat_a' && w.url === '/?p=chat_b', w.url);
}
{
    const w = world({ url: '/?p=chat_a', open: 'chat_b', listed: ['chat_a', 'chat_b'] });
    await w.handler();
    check('an ordinary Back still opens the project and leaves its URL alone', w.currentChatId === 'chat_a' && w.urlWrites.length === 0);
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll history dead-link checks passed.');
