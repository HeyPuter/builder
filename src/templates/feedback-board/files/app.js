import { createIcons, icons } from 'https://cdn.jsdelivr.net/npm/lucide@latest/+esm';

// The board's backend: a Puter serverless worker (workers/ in this project).
const API = '{{WORKER_URL:api}}';

// An anonymous id for this browser, so the board can tell your upvotes apart
// from everyone else's without asking you to sign in.
const VOTER_KEY = 'feedback-board-voter';
function voterId() {
    let id = null;
    try { id = localStorage.getItem(VOTER_KEY); } catch (e) { /* storage blocked */ }
    if (!id || !/^[A-Za-z0-9-]{8,64}$/.test(id)) {
        id = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 12));
        try { localStorage.setItem(VOTER_KEY, id); } catch (e) { /* stays per-visit */ }
    }
    return id;
}
const VOTER = voterId();

const state = { ideas: [], sort: 'top', query: '', loading: true, error: '' };
// Ideas whose vote is on its way to the server. Every render rebuilds the
// buttons, so this (not the button's own disabled state) is what stops a
// quick second click from sending a second vote.
const pendingVotes = new Set();

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
    const res = await fetch(API + path, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* empty body */ }
    if (!res.ok) throw new Error((data && data.error) || `Request failed (${res.status})`);
    return data;
}

function timeAgo(ms) {
    const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return 'just now';
    const m = Math.round(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    if (d < 30) return `${d}d ago`;
    return new Date(ms).toLocaleDateString();
}

function visibleIdeas() {
    const q = state.query.toLowerCase();
    const list = state.ideas.filter(i => !q || i.title.toLowerCase().includes(q) || (i.details || '').toLowerCase().includes(q));
    return list.sort(state.sort === 'top'
        ? (a, b) => (b.votes - a.votes) || (b.createdAt - a.createdAt)
        : (a, b) => b.createdAt - a.createdAt);
}

function showState({ icon, title, body, action }) {
    $('state').classList.remove('hidden');
    $('state-icon').setAttribute('data-lucide', icon);
    $('state-title').textContent = title;
    $('state-body').textContent = body;
    const btn = $('state-action');
    btn.classList.toggle('hidden', !action);
    if (action) {
        btn.textContent = action.label;
        btn.onclick = action.run;
    }
}

function ideaItem(idea) {
    const li = document.createElement('li');
    li.className = 'flex gap-4 rounded-xl border border-slate-200 bg-white p-4';

    const vote = document.createElement('button');
    vote.type = 'button';
    vote.className = `flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-lg border text-sm font-semibold transition ${idea.voted
        ? 'border-teal-600 bg-teal-50 text-teal-700'
        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`;
    vote.disabled = pendingVotes.has(idea.id);
    vote.setAttribute('aria-pressed', String(!!idea.voted));
    vote.setAttribute('aria-label', `${idea.voted ? 'Remove your upvote from' : 'Upvote'} "${idea.title}", ${idea.votes} vote${idea.votes === 1 ? '' : 's'}`);
    const arrow = document.createElement('i');
    arrow.setAttribute('data-lucide', 'chevron-up');
    arrow.className = 'h-5 w-5';
    const count = document.createElement('span');
    count.textContent = idea.votes;
    vote.append(arrow, count);
    vote.addEventListener('click', () => toggleVote(idea));

    const body = document.createElement('div');
    body.className = 'min-w-0 flex-1';
    const title = document.createElement('h2');
    title.className = 'font-medium leading-snug';
    title.textContent = idea.title;
    body.append(title);
    if (idea.details) {
        const details = document.createElement('p');
        details.className = 'mt-1 whitespace-pre-line break-words text-sm text-slate-600';
        details.textContent = idea.details;
        body.append(details);
    }
    const meta = document.createElement('p');
    meta.className = 'mt-2 text-xs text-slate-400';
    meta.textContent = timeAgo(idea.createdAt);
    body.append(meta);

    li.append(vote, body);
    return li;
}

function render() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
        const active = btn.dataset.sort === state.sort;
        btn.classList.toggle('bg-slate-900', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('text-slate-600', !active);
        btn.setAttribute('aria-selected', String(active));
    });

    const list = $('ideas');
    $('state').classList.add('hidden');
    list.replaceChildren();

    if (state.loading) {
        $('summary').textContent = 'Loading ideas...';
    } else if (state.error) {
        $('summary').textContent = '';
        showState({ icon: 'cloud-off', title: "Couldn't load the board", body: state.error, action: { label: 'Try again', run: load } });
    } else {
        const ideas = visibleIdeas();
        const total = state.ideas.length;
        $('summary').textContent = total
            ? `${total} idea${total === 1 ? '' : 's'}${state.query ? `, ${ideas.length} matching` : ''}`
            : '';
        if (!total) {
            showState({ icon: 'lightbulb', title: 'No ideas yet', body: 'Be the first to suggest something.', action: { label: 'Share an idea', run: openForm } });
        } else if (!ideas.length) {
            showState({ icon: 'search-x', title: 'No matching ideas', body: 'Try a different search, or post it as a new idea.' });
        } else {
            list.append(...ideas.map(ideaItem));
        }
    }
    createIcons({ icons });
}

async function load() {
    state.loading = true;
    state.error = '';
    render();
    try {
        const data = await api(`/ideas?voter=${encodeURIComponent(VOTER)}`);
        state.ideas = Array.isArray(data && data.ideas) ? data.ideas : [];
    } catch (e) {
        state.error = 'Check your connection and try again.';
    }
    state.loading = false;
    render();
}

async function toggleVote(idea) {
    if (pendingVotes.has(idea.id)) return;
    pendingVotes.add(idea.id);
    // Optimistic: flip it now, put it back if the server says no.
    const before = { voted: idea.voted, votes: idea.votes };
    idea.voted = !idea.voted;
    idea.votes += idea.voted ? 1 : -1;
    render();
    try {
        const data = await api(`/ideas/${encodeURIComponent(idea.id)}/vote`, {
            method: 'POST',
            body: JSON.stringify({ voter: VOTER }),
        });
        Object.assign(idea, data.idea);
    } catch (e) {
        Object.assign(idea, before);
    }
    pendingVotes.delete(idea.id);
    render();
}

function openForm() {
    $('idea-form').classList.remove('hidden');
    $('form-error').textContent = '';
    $('idea-title').focus();
}

function closeForm() {
    $('idea-form').classList.add('hidden');
    $('idea-form').reset();
}

$('new-idea').addEventListener('click', openForm);
$('cancel-idea').addEventListener('click', closeForm);

$('idea-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = $('idea-title').value.trim();
    const details = $('idea-details').value.trim();
    if (!title) {
        $('form-error').textContent = 'Give your idea a short title.';
        $('idea-title').focus();
        return;
    }
    const submit = $('submit-idea');
    submit.disabled = true;
    submit.textContent = 'Posting...';
    try {
        const data = await api('/ideas', { method: 'POST', body: JSON.stringify({ title, details, voter: VOTER }) });
        state.ideas.unshift(data.idea);
        state.sort = 'new';
        closeForm();
        render();
    } catch (err) {
        $('form-error').textContent = err.message || 'Could not post your idea. Try again.';
    } finally {
        submit.disabled = false;
        submit.textContent = 'Post idea';
    }
});

document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => { state.sort = btn.dataset.sort; render(); });
});
$('search').addEventListener('input', (e) => { state.query = e.target.value.trim(); render(); });

load();
