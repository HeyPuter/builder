import { buildLink, LINKS } from '../site.js';

const EXAMPLE_PROMPT =
    'Build an equipment checkout tracker for a small video production team. I need to register gear with a name, category, and serial number, check an item out to a person with a due date, check it back in, see everything currently out with anything overdue highlighted in red, and search by gear name or person. Keep a full history per item and save everything to my Puter account.';

export default {
    slug: 'guides/how-to-build-an-app-with-ai',
    parent: 'guides',
    updated: '2026-08-15',
    priority: 0.7,
    changefreq: 'monthly',
    navLabel: 'How to build an app with AI',
    type: 'guide',
    readingTime: '9 min read',

    title: 'How to Build an App With AI: A Full Walkthrough | Puter',
    description:
        'A complete walkthrough of building a real app by describing it: the first prompt, what happens while it builds, how to iterate safely, and how to publish it.',
    ogTagline: 'From one sentence to a published app',

    hero: {
        eyebrow: 'Guide',
        h1: 'How to build an app with AI',
        lead:
            'This is a walkthrough of the whole thing, using one real example the whole way through. By the end you will have a working app on a public URL, and more usefully, a sense of what to say at each step to get there without a fight.',
    },

    sections: [
        {
            type: 'prose',
            id: 'before',
            heading: 'Before you start: pick the right first project',
            body: [
                'The single biggest factor in whether this goes well is what you choose to build. Good first projects share three properties: you understand the problem yourself, the app is for a small known audience, and being wrong is cheap.',
                'That points you at internal tools, personal utilities, trackers, calculators, and prototypes. It points you away from anything that takes payments or holds strangers\' personal data on day one. Not because it cannot build those, but because judging whether it built them *correctly* takes skills you should acquire on something lower stakes.',
                'For this walkthrough the example is an equipment checkout tracker for a small video production team. It is a real shape of problem: a handful of people, some expensive gear, and a group chat where "who has the C70?" gets asked twice a week.',
            ],
        },

        {
            type: 'prose',
            id: 'first-prompt',
            heading: 'Step 1: The first prompt',
            body: [
                'Write it the way you would explain the tool to a competent colleague who has never seen your process. Three things carry most of the weight: what the thing is, who uses it, and the two or three actions it must support.',
                'Here is the prompt for the example, in full:',
            ],
            quote: EXAMPLE_PROMPT,
            after: [
                'Notice what it does and does not do. It names the domain (video gear, a small team) so the vocabulary and the default fields come out right. It lists the actual actions rather than gesturing at "management". It mentions persistence, because an app that forgets everything on reload is a common and avoidable first-version disappointment. And it says nothing whatsoever about how any of it should be implemented.',
                'It is also about as long as a first prompt should be. Longer is not better past this point: extra detail on a first version is guesswork about an app you have not seen yet. You will have much better instructions after you have clicked through something.',
            ],
        },

        {
            type: 'prose',
            id: 'questions',
            heading: 'Step 2: Questions, if there are any',
            body: [
                'If your request leaves something genuinely open, you get one short round of questions, at most three, always about the product rather than the technology. Something like whether gear should be checked out to a name you type or to a fixed list of team members.',
                'Answer them if you have an opinion, and skip them if you do not. Skipping is not a penalty: sensible defaults are used, and changing a default later is a one-sentence request. There is only ever one round, so you will not be interrogated.',
            ],
        },

        {
            type: 'prose',
            id: 'watching',
            heading: 'Step 3: What happens while it builds',
            body: [
                'A checklist appears in plain language, showing what is being worked on. Files are written, the preview fills in, and when the app is ready it is opened for you automatically.',
                'One thing worth understanding, because it changes how much you have to check: after the app is loaded into the preview, it is watched for runtime errors. If anything throws, the error goes back to the AI, which reads the file that broke, fixes the cause, and reloads to check again. It repeats until the app runs clean. So by the time you are told a turn is finished, "it loads and does not crash" has already been verified. What has *not* been verified is whether it does what you meant. That part is yours.',
            ],
        },

        {
            type: 'steps',
            id: 'first-review',
            heading: 'Step 4: The first review',
            intro:
                'Spend three minutes here and you will save twenty later. Use the app like a person in a hurry, not like someone admiring it.',
            items: [
                {
                    title: 'Do the main job end to end',
                    body:
                        'In the example: register a camera, check it out to someone, check it back in. If the core loop works, everything else is detail. If it does not, say so before asking for anything new.',
                },
                {
                    title: 'Try the empty state',
                    body:
                        'Open it with no data at all. An app that looks broken before you have added anything is the most common first-version flaw, and one sentence fixes it: "when there is no gear yet, show a friendly empty state with a button to add the first item".',
                },
                {
                    title: 'Put in bad data',
                    body:
                        'A blank name. A due date in the past. A serial number four hundred characters long. Two items with the same name. You are looking for silent failures, not crashes.',
                },
                {
                    title: 'Reload the page',
                    body:
                        'Everything you entered should still be there. If it is not, that is the highest-priority fix, because every later test depends on it.',
                },
                {
                    title: 'Look at it narrow',
                    body:
                        'Resize the preview to phone width. If half the team will use this on a phone in a storage room, this is not a cosmetic check.',
                },
            ],
        },

        {
            type: 'prose',
            id: 'iterating',
            heading: 'Step 5: Iterating without making things worse',
            body: [
                'This is where projects either converge or slowly degrade, and the difference is almost entirely about turn size.',
                'The instinct is to batch: you found six things, so you list six things. Resist it. A turn with six unrelated changes gives you six things to re-test simultaneously, and when one of them is wrong you cannot cleanly undo just that one. Two or three related changes per turn is the sweet spot, and it is faster overall even though each turn feels smaller.',
            ],
            list: [
                '**Group by area, not by priority.** "Fix the overdue highlighting and the date format in the same list" is one coherent turn. "Fix the overdue highlighting and add CSV export" is two.',
                '**Say what should be true, not what to change.** "Overdue items should be obvious at a glance from across the room" gives better results than "make the text red", because it lets the AI solve the actual problem.',
                '**Point instead of describing.** Once the app is real, stop writing "the third column in the checked-out table". Arm the element picker, click the thing, and describe the change. It is faster and it removes an entire class of misunderstanding.',
                '**Use direct visual edits for fiddly work.** Spacing, sizes, and colors on a specific element are quicker to nudge with the style controls than to describe. Those edits are kept in their own stylesheet, so later AI changes will not quietly undo them.',
                '**Snapshot before anything structural.** Version history records every turn. Before you say "reorganize this into three tabs", know that the current version is one click away.',
            ],
        },

        {
            type: 'prose',
            id: 'stuck',
            heading: 'When it gets stuck',
            body: [
                'Occasionally you will ask for the same fix three times and get three versions of the same wrong thing. Repeating yourself louder does not help. Three things do:',
            ],
            list: [
                '**Restate the goal instead of the fix.** Describe the outcome you want from scratch, without referencing the previous attempts. You may be anchoring it to an approach that cannot work.',
                '**Restore and take a different run.** Roll back to before the attempts and describe the requirement differently. This is almost always faster than pushing through a stuck sequence.',
                '**Isolate it.** "Ignore everything else. In the checkout dialog specifically, the due date defaults to today instead of a week from today. Fix only that." Narrowing the scope narrows the search.',
            ],
        },

        {
            type: 'prose',
            id: 'data',
            heading: 'Step 6: Data, accounts, and other people',
            body: [
                'The example app saves to your Puter account, which means each person who opens it sees their own data. That is right for a personal tracker and wrong for a shared one: your team needs to see the same gear list.',
                'For genuinely shared state, ask for a [serverless worker](' + LINKS.workers + '): "put the gear list behind a Puter worker so everyone on the team sees the same data". The worker runs off the client, holds the shared record, and the app talks to it. For real-time features (people seeing each other\'s changes as they happen, video, multiplayer), the [peer API](' + LINKS.peer + ') is the right tool, and it is worth saying so explicitly in the prompt.',
                'For sign-in, ask for a sign-in button using Puter accounts. You get real authentication with no user table to run, and the app can show a clear signed-in and signed-out state rather than surprising people with a popup.',
            ],
        },

        {
            type: 'prose',
            id: 'publish',
            heading: 'Step 7: Publishing',
            body: [
                'Until you publish, the app runs in a private preview that only you can open. When you are ready, Publish gives it a public address on puter.site that anyone with the link can use. It takes one click, there is no build to wait for, and you can take it down again just as quickly.',
                'If you want to show it to someone before that, share the draft link instead. It points at your work-in-progress preview and updates as you keep building, which is ideal for "does this look right to you?" without committing to anything public.',
                'Publishing does not freeze the project. Keep making changes afterwards and push them live whenever you want.',
            ],
        },

        {
            type: 'prose',
            id: 'ownership',
            heading: 'What you end up owning',
            body: [
                'The project is a folder of ordinary files: HTML, CSS, JavaScript, and Tailwind loaded from a CDN. There is no build step, no framework, and no proprietary format. You can download the whole thing as a zip at any point and host it anywhere that serves static files, or open it in an editor and keep going yourself.',
                'That is worth knowing at the start, not just at the end, because it changes how much you have to trust any single tool. Being able to leave is the thing that makes staying a choice.',
            ],
        },

        {
            type: 'prose',
            id: 'when-to-stop',
            heading: 'Knowing when to stop',
            body: [
                'The failure mode nobody warns you about is not a broken app. It is an app that has been "nearly done" for two weeks because every session adds one more feature.',
                'Ship it at the point where it does the job you originally described, even if the list of nice-to-haves is still long. A tool people are actually using generates better change requests in a week than you will generate by yourself in a month, and you will build the right next feature instead of the one that seemed exciting on day one.',
            ],
        },

        {
            type: 'cta',
            heading: 'Build the example',
            body: 'The equipment tracker prompt from this guide, ready to send. Edit it into your own problem first if you have one.',
            label: 'Open with this prompt',
            href: buildLink(EXAMPLE_PROMPT),
        },
    ],

    related: ['guides/how-to-write-a-build-prompt', 'guides/how-to-build-a-website-with-ai', 'ai-app-builder', 'what-to-build'],
};
