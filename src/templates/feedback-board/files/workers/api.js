// Feedback board backend.
//
// Every idea lives in this worker's own key-value store (me.puter.kv, which
// belongs to the account that deployed it), so the board is shared by
// everyone who opens the app, signed in or not.
//
// Storage layout:
//   feedback-board:ideas                 JSON array of ideas, newest first
//   feedback-board:vote:<idea>:<voter>   present while that voter upvotes it
//
// Voters are anonymous ids the browser generates and remembers. They stop
// accidental double votes; they are not an identity check.

const IDEAS_KEY = 'feedback-board:ideas';
const MAX_IDEAS = 200;
const MAX_TITLE = 100;
const MAX_DETAILS = 500;

function json(body, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function newId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function cleanVoter(value) {
    const voter = String(value || '');
    return /^[A-Za-z0-9-]{8,64}$/.test(voter) ? voter : '';
}

async function loadIdeas() {
    const raw = await me.puter.kv.get(IDEAS_KEY);
    if (!raw) return [];
    try {
        const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(list) ? list : [];
    } catch (e) {
        return [];
    }
}

async function saveIdeas(ideas) {
    await me.puter.kv.set(IDEAS_KEY, JSON.stringify(ideas));
}

function voteKey(ideaId, voter) {
    return `feedback-board:vote:${ideaId}:${voter}`;
}

async function readBody(request) {
    try {
        return await request.json();
    } catch (e) {
        return null;
    }
}

// All ideas, each with whether `voter` (from ?voter=) has upvoted it.
router.get('/ideas', async ({ request }) => {
    const voter = cleanVoter(new URL(request.url).searchParams.get('voter'));
    const ideas = await loadIdeas();
    const voted = voter
        ? await Promise.all(ideas.map(idea => me.puter.kv.get(voteKey(idea.id, voter))))
        : ideas.map(() => null);
    return {
        ideas: ideas.map((idea, i) => ({ ...idea, voted: !!voted[i] })),
    };
});

// Post a new idea: { title, details?, voter? }. The author's own upvote is
// counted straight away, the way most boards work.
router.post('/ideas', async ({ request }) => {
    const body = await readBody(request);
    if (!body) return json({ error: 'Send the idea as JSON.' }, 400);
    const title = String(body.title || '').trim().slice(0, MAX_TITLE);
    const details = String(body.details || '').trim().slice(0, MAX_DETAILS);
    if (!title) return json({ error: 'Give your idea a short title.' }, 400);
    const voter = cleanVoter(body.voter);

    const ideas = await loadIdeas();
    const idea = { id: newId(), title, details, votes: voter ? 1 : 0, createdAt: Date.now() };
    ideas.unshift(idea);
    // Keep the board bounded: past the cap, the least-voted old ideas go.
    if (ideas.length > MAX_IDEAS) {
        ideas.sort((a, b) => (b.votes - a.votes) || (b.createdAt - a.createdAt));
        ideas.length = MAX_IDEAS;
    }
    await saveIdeas(ideas);
    if (voter) await me.puter.kv.set(voteKey(idea.id, voter), '1');
    return json({ idea: { ...idea, voted: !!voter } }, 201);
});

// Toggle `voter`'s upvote on an idea: { voter }.
router.post('/ideas/:id/vote', async ({ request, params }) => {
    const body = await readBody(request);
    const voter = cleanVoter(body && body.voter);
    if (!voter) return json({ error: 'Missing voter id.' }, 400);

    const ideas = await loadIdeas();
    const idea = ideas.find(i => i.id === params.id);
    if (!idea) return json({ error: 'That idea no longer exists.' }, 404);

    const key = voteKey(idea.id, voter);
    const already = await me.puter.kv.get(key);
    if (already) {
        await me.puter.kv.del(key);
        idea.votes = Math.max(0, (idea.votes || 0) - 1);
    } else {
        await me.puter.kv.set(key, '1');
        idea.votes = (idea.votes || 0) + 1;
    }
    await saveIdeas(ideas);
    return { idea: { ...idea, voted: !already } };
});
