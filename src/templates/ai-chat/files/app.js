import { createIcons, icons } from 'https://cdn.jsdelivr.net/npm/lucide@latest/+esm';
import { marked } from 'https://cdn.jsdelivr.net/npm/marked@12/+esm';
import DOMPurify from 'https://cdn.jsdelivr.net/npm/dompurify@3/+esm';

// Conversations are saved per user in Puter's key-value store, so they follow
// each person across devices and stay private to them.
const STORE_KEY = 'ai-chat:conversations';
const MAX_CONVERSATIONS = 50;
const SYSTEM_PROMPT = 'You are a helpful, friendly assistant. Answer clearly and concisely, and use Markdown for lists, tables and code.';

const STARTERS = [
    { title: 'Plan a trip', prompt: 'Plan a relaxed three-day trip to Lisbon with food recommendations.' },
    { title: 'Explain a concept', prompt: 'Explain how compound interest works with a simple example.' },
    { title: 'Write an email', prompt: 'Write a short, polite email asking my landlord to fix the heating.' },
    { title: 'Brainstorm ideas', prompt: 'Give me ten name ideas for a neighborhood coffee shop.' },
];

const $ = (id) => document.getElementById(id);
const state = { conversations: [], currentId: null, streaming: false };

marked.setOptions({ breaks: true, gfm: true });
const renderMarkdown = (text) => DOMPurify.sanitize(marked.parse(text || ''));

function newId() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function current() {
    return state.conversations.find(c => c.id === state.currentId) || null;
}

// ---- Storage ---------------------------------------------------------------

async function loadConversations() {
    try {
        const raw = await puter.kv.get(STORE_KEY);
        const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
        state.conversations = Array.isArray(list) ? list : [];
    } catch (e) {
        state.conversations = [];
    }
}

let saveTimer = null;
function saveConversations() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        const list = state.conversations
            .filter(c => c.messages.length)
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, MAX_CONVERSATIONS);
        puter.kv.set(STORE_KEY, JSON.stringify(list)).catch(() => { /* retried on the next change */ });
    }, 400);
}

// ---- Rendering -------------------------------------------------------------

function renderConversations() {
    const nav = $('conversations');
    const list = state.conversations.filter(c => c.messages.length).sort((a, b) => b.updatedAt - a.updatedAt);
    if (!list.length) {
        const empty = document.createElement('p');
        empty.className = 'px-2 py-1 text-sm text-slate-400';
        empty.textContent = 'No conversations yet.';
        nav.replaceChildren(empty);
        return;
    }
    nav.replaceChildren(...list.map(c => {
        const row = document.createElement('div');
        row.className = `group flex items-center rounded-lg ${c.id === state.currentId ? 'bg-slate-200' : 'hover:bg-slate-100'}`;
        const open = document.createElement('button');
        open.className = 'min-w-0 flex-1 truncate px-3 py-2 text-left text-sm';
        open.textContent = c.title;
        open.addEventListener('click', () => { selectConversation(c.id); closeSidebar(); });
        const del = document.createElement('button');
        // Always shown on touch screens (no hover there); on hover elsewhere.
        del.className = 'mr-1 rounded-md p-1 text-slate-400 hover:bg-slate-300 hover:text-slate-700 md:hidden md:group-hover:block md:group-focus-within:block';
        del.setAttribute('aria-label', `Delete "${c.title}"`);
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', 'trash-2');
        icon.className = 'h-4 w-4';
        del.append(icon);
        del.addEventListener('click', () => deleteConversation(c.id));
        row.append(open, del);
        return row;
    }));
    createIcons({ icons });
}

function messageNode(message) {
    const wrap = document.createElement('div');
    if (message.role === 'user') {
        wrap.className = 'flex justify-end';
        const bubble = document.createElement('div');
        bubble.className = 'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl bg-slate-100 px-4 py-2.5';
        bubble.textContent = message.content;
        wrap.append(bubble);
    } else {
        wrap.className = 'flex gap-3';
        const avatar = document.createElement('span');
        avatar.className = 'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700';
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', 'sparkles');
        icon.className = 'h-4 w-4';
        avatar.append(icon);
        const body = document.createElement('div');
        body.className = 'markdown min-w-0 flex-1 break-words';
        if (message.error) body.classList.add('text-red-600');
        body.innerHTML = message.content ? renderMarkdown(message.content) : '<span class="typing"><i></i><i></i><i></i></span>';
        wrap.append(avatar, body);
    }
    return wrap;
}

function renderMessages() {
    const convo = current();
    const messages = convo ? convo.messages : [];
    $('chat-title').textContent = convo && convo.messages.length ? convo.title : 'New chat';
    $('empty').classList.toggle('hidden', messages.length > 0);
    $('messages').classList.toggle('hidden', messages.length === 0);
    $('messages').replaceChildren(...messages.map(messageNode));
    createIcons({ icons });
    scrollToBottom();
}

function scrollToBottom() {
    const s = $('scroller');
    s.scrollTop = s.scrollHeight;
}

function renderStarters() {
    $('starters').replaceChildren(...STARTERS.map(s => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'rounded-xl border border-slate-200 px-4 py-3 text-left hover:bg-slate-50';
        const t = document.createElement('span');
        t.className = 'block text-sm font-medium';
        t.textContent = s.title;
        const p = document.createElement('span');
        p.className = 'mt-0.5 block text-sm text-slate-500';
        p.textContent = s.prompt;
        b.append(t, p);
        b.addEventListener('click', () => send(s.prompt));
        return b;
    }));
}

function updateSend() {
    $('send').disabled = state.streaming || !$('prompt').value.trim();
}

// ---- Conversations ---------------------------------------------------------

function startConversation() {
    const convo = { id: newId(), title: 'New chat', messages: [], updatedAt: Date.now() };
    state.conversations.push(convo);
    state.currentId = convo.id;
    return convo;
}

function selectConversation(id) {
    if (state.streaming) return;
    state.currentId = id;
    renderConversations();
    renderMessages();
}

function deleteConversation(id) {
    if (state.streaming && id === state.currentId) return;
    state.conversations = state.conversations.filter(c => c.id !== id);
    if (state.currentId === id) state.currentId = null;
    saveConversations();
    renderConversations();
    renderMessages();
}

async function send(text) {
    const content = String(text || '').trim();
    if (!content || state.streaming) return;
    const convo = current() || startConversation();
    if (!convo.messages.length) convo.title = content.length > 48 ? content.slice(0, 45) + '...' : content;
    convo.messages.push({ role: 'user', content });
    const reply = { role: 'assistant', content: '' };
    convo.messages.push(reply);
    convo.updatedAt = Date.now();

    state.streaming = true;
    $('prompt').value = '';
    autoGrow();
    updateSend();
    renderConversations();
    renderMessages();

    const history = [{ role: 'system', content: SYSTEM_PROMPT }]
        .concat(convo.messages.slice(0, -1).filter(m => !m.error).map(m => ({ role: m.role, content: m.content })));
    const node = $('messages').lastElementChild.querySelector('.markdown');
    let frame = 0;
    try {
        const stream = await puter.ai.chat(history, { stream: true });
        for await (const part of stream) {
            if (!part || typeof part.text !== 'string') continue;
            reply.content += part.text;
            if (!frame) {
                frame = requestAnimationFrame(() => {
                    frame = 0;
                    node.innerHTML = renderMarkdown(reply.content);
                    scrollToBottom();
                });
            }
        }
        if (!reply.content) reply.content = 'I did not get a reply. Please try again.';
    } catch (e) {
        reply.error = true;
        reply.content = 'Something went wrong while answering. Please try again.';
    }
    cancelAnimationFrame(frame);
    state.streaming = false;
    convo.updatedAt = Date.now();
    saveConversations();
    renderConversations();
    renderMessages();
    updateSend();
}

// ---- Layout ----------------------------------------------------------------

function openSidebar() {
    $('sidebar').classList.remove('-translate-x-full');
    $('scrim').classList.remove('hidden');
}
function closeSidebar() {
    $('sidebar').classList.add('-translate-x-full');
    $('scrim').classList.add('hidden');
}
function autoGrow() {
    const t = $('prompt');
    t.style.height = 'auto';
    t.style.height = Math.min(t.scrollHeight, 192) + 'px';
}

// ---- Auth ------------------------------------------------------------------

function showSignedOut() {
    $('app').classList.add('hidden');
    $('app').classList.remove('flex');
    $('signed-out').classList.remove('hidden');
    $('signed-out').classList.add('flex');
    createIcons({ icons });
}

async function showApp() {
    $('signed-out').classList.add('hidden');
    $('signed-out').classList.remove('flex');
    $('app').classList.remove('hidden');
    $('app').classList.add('flex');
    try {
        const user = await puter.auth.getUser();
        $('username').textContent = user.username;
        $('avatar').textContent = (user.username || '?').charAt(0).toUpperCase();
    } catch (e) { /* the name is decoration */ }
    await loadConversations();
    state.currentId = null;
    renderStarters();
    renderConversations();
    renderMessages();
    $('prompt').focus();
}

$('sign-in').addEventListener('click', async () => {
    $('sign-in-error').textContent = '';
    try {
        await puter.auth.signIn();
        await showApp();
    } catch (e) {
        $('sign-in-error').textContent = 'Sign-in was cancelled. Try again when you are ready.';
    }
});
$('sign-out').addEventListener('click', () => {
    puter.auth.signOut();
    state.conversations = [];
    showSignedOut();
});

$('composer').addEventListener('submit', (e) => { e.preventDefault(); send($('prompt').value); });
$('prompt').addEventListener('input', () => { autoGrow(); updateSend(); });
$('prompt').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.matchMedia('(pointer: fine)').matches) {
        e.preventDefault();
        send($('prompt').value);
    }
});
$('new-chat').addEventListener('click', () => {
    if (state.streaming) return;
    state.currentId = null;
    renderConversations();
    renderMessages();
    closeSidebar();
    $('prompt').focus();
});
$('open-sidebar').addEventListener('click', openSidebar);
$('close-sidebar').addEventListener('click', closeSidebar);
$('scrim').addEventListener('click', closeSidebar);

if (puter.auth.isSignedIn()) showApp();
else showSignedOut();
