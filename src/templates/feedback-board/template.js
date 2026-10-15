// Feedback board: a shared idea board with upvotes, backed by one serverless
// worker (files/workers/api.js), deployed fresh for every copy.
export default {
    slug: 'feedback-board',
    name: 'Feedback Board App',
    category: 'App',
    description: 'Collect feature ideas from your users and let them vote.',
    updated: '2026-09-28',
    workers: ['api'],

    suggestions: [
        { label: 'Add status labels', prompt: 'Let me mark each idea as Planned, In progress or Done, show the status as a colored label, and let visitors filter the board by status.' },
        { label: 'Add an admin view', prompt: 'Add a private admin view, only for me after I sign in with Puter, where I can edit, merge and delete ideas.' },
        { label: 'Add comments', prompt: 'Let visitors leave short comments on each idea, shown in a thread under it.' },
        { label: 'Add categories', prompt: 'Add categories like Feature, Bug and Design. People pick one when posting, and the board can be filtered by category.' },
        { label: 'Make it my brand', prompt: 'Rename the board to my product name and change the colors and icon to match my brand: ' },
    ],

    page: {
        title: 'Feedback Board Template With Upvotes and a Real Backend',
        description:
            'Product teams can collect feature requests on this feedback board, where users post ideas and upvote them, backed by its own serverless API.',
        ogTagline: 'Collect ideas and let people vote',
        features: [
            { icon: 'users', title: 'Shared by everyone', body: 'Ideas and votes are stored by the app’s backend, so every visitor sees the same board. No sign-in needed to take part.' },
            { icon: 'zap', title: 'Its own backend', body: 'A serverless worker with endpoints to list ideas, post one and toggle an upvote. Your copy gets its own, deployed under your account.' },
            { icon: 'search', title: 'Sort and search', body: 'Switch between the most-voted and the newest ideas, and filter the board as you type.' },
            { icon: 'shieldCheck', title: 'Sensible limits', body: 'Titles and details are length-capped, the board keeps its best 200 ideas, and each browser gets one vote per idea.' },
        ],
        faq: [
            {
                q: 'Where are the ideas and votes stored?',
                a: [
                    'In a key-value store that belongs to the backend worker your copy deploys, which lives in your Puter account. Nothing is shared with the original template or with anyone else’s copy.',
                ],
            },
            {
                q: 'Can people vote more than once?',
                a: [
                    'Each browser gets an anonymous id and one vote per idea, which stops accidental double votes. It is not an identity check, so if you need one vote per person, ask the builder to require sign-in before voting.',
                ],
            },
        ],
    },
};
