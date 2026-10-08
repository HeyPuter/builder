// Feedback board backend.
//
// Every idea lives in this worker's own key-value store (me.puter.kv, which
// belongs to the account that deployed it), so the board is shared by
// everyone who opens the app, signed in or not.
//
// Storage layout, one key per thing so no request rewrites another's data:
//   feedback-board:idea:<idea>           { id, title, details, createdAt }
//   feedback-board:votes:<idea>          vote count, changed only by kv.incr
//   feedback-board:vote:<idea>:<voter>   present while that voter upvotes it
//
// Voters are anonymous ids the browser generates and remembers. They stop
// accidental double votes; they are not an identity check.

const IDEA_PREFIX = 'feedback-board:idea:';
const VOTES_PREFIX = 'feedback-board:votes:';
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

function parse(value) {
    if (typeof value !== 'string') return value;
    try { return JSON.parse(value); } catch (e) { return null; }
}

// Every idea with its vote count, newest first.
async function loadIdeas() {
    const [ideaRows, voteRows] = await Promise.all([
        me.puter.kv.list({ pattern: IDEA_PREFIX, returnValues: true }),
        me.puter.kv.list({ pattern: VOTES_PREFIX, returnValues: true }),
    ]);
    const votes = new Map();
    for (const row of voteRows || []) votes.set(row.key.slice(VOTES_PREFIX.length), Number(row.value) || 0);
    return (ideaRows || [])
        .map(row => parse(row.value))
        .filter(idea => idea && typeof idea.id === 'string')
        .map(idea => ({ ...idea, votes: Math.max(0, votes.get(idea.id) || 0) }))
        .sort((a, b) => b.createdAt - a.createdAt);
}

// An idea and everything stored about it, its voters included.
async function removeIdea(id) {
    const voterKeys = await me.puter.kv.list({ pattern: `feedback-board:vote:${id}:` });
    await Promise.all([
        me.puter.kv.del(IDEA_PREFIX + id),
        me.puter.kv.del(VOTES_PREFIX + id),
        ...(voterKeys || []).map(key => me.puter.kv.del(key)),
    ]);
}

// Keep the board bounded: past the cap, the least-voted old ideas go.
async function pruneIdeas() {
    const ideas = await loadIdeas();
    if (ideas.length <= MAX_IDEAS) return;
    ideas.sort((a, b) => (b.votes - a.votes) || (b.createdAt - a.createdAt));
    await Promise.all(ideas.slice(MAX_IDEAS).map(idea => removeIdea(idea.id)));
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

    const idea = { id: newId(), title, details, createdAt: Date.now() };
    await me.puter.kv.set(IDEA_PREFIX + idea.id, idea);
    idea.votes = 0;
    if (voter) {
        await me.puter.kv.set(voteKey(idea.id, voter), '1');
        idea.votes = await me.puter.kv.incr(VOTES_PREFIX + idea.id);
    }
    await pruneIdeas();
    return json({ idea: { ...idea, voted: !!voter } }, 201);
});

// Toggle `voter`'s upvote on an idea: { voter }.
router.post('/ideas/:id/vote', async ({ request, params }) => {
    const body = await readBody(request);
    const voter = cleanVoter(body && body.voter);
    if (!voter) return json({ error: 'Missing voter id.' }, 400);

    const idea = parse(await me.puter.kv.get(IDEA_PREFIX + params.id));
    if (!idea) return json({ error: 'That idea no longer exists.' }, 404);

    // The count only ever moves by kv.incr, which is atomic, so votes cast at
    // the same moment all land.
    const key = voteKey(idea.id, voter);
    const already = await me.puter.kv.get(key);
    if (already) await me.puter.kv.del(key);
    else await me.puter.kv.set(key, '1');
    idea.votes = Math.max(0, await me.puter.kv.incr(VOTES_PREFIX + idea.id, already ? -1 : 1));
    return { idea: { ...idea, voted: !already } };
});
