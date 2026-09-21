import { buildLink } from '../site.js';

export default {
    slug: 'guides/how-to-write-a-build-prompt',
    parent: 'guides',
    updated: '2026-08-15',
    priority: 0.7,
    changefreq: 'monthly',
    navLabel: 'How to write a build prompt',
    type: 'guide',
    readingTime: '7 min read',

    title: 'How to Write a Prompt That Builds the Right App | Puter',
    description:
        'Six patterns that separate a prompt producing a demo from one producing something you can use, with before-and-after examples you can copy.',
    ogTagline: 'Six patterns, with before and after',

    hero: {
        eyebrow: 'Guide',
        h1: 'How to write a build prompt',
        lead:
            'Most disappointing results come from prompts that were perfectly clear to the person who wrote them. Here are the six patterns that account for most of the gap, each with a before and after you can copy directly.',
    },

    sections: [
        {
            type: 'prose',
            id: 'principle',
            heading: 'The one idea underneath all six',
            body: [
                'A build prompt is not a search query and it is not a spell. It is a brief. The useful mental model is that you are handing the job to a fast, capable contractor who has never met you, has no access to your team\'s context, and will make a reasonable-sounding decision about anything you leave unsaid.',
                'That reframing does most of the work by itself. It tells you to name your domain, to say who will use the thing, and to be specific about the handful of decisions you actually care about, while leaving the rest genuinely open instead of accidentally open.',
            ],
        },

        {
            type: 'compare',
            id: 'p1',
            heading: '1. Name the domain, not the category',
            body:
                'Software categories are generic; domains carry vocabulary, fields, and expectations. Naming the domain gets you the right defaults for free, and defaults are most of a first version.',
            before: 'Build a management app.',
            after:
                'Build a tool for a dental practice front desk to manage appointments: book a patient into a slot, see today at a glance, mark arrivals and no-shows, and reschedule by dragging an appointment to a new time.',
            note:
                'The second version gets you patient names, appointment durations, and a day view without asking. The first gets you a generic list of items with a status field.',
        },

        {
            type: 'compare',
            id: 'p2',
            heading: '2. List the actions, not the adjectives',
            body:
                'Descriptions of quality are unfalsifiable and produce nothing specific. Verbs produce interface. Three or four concrete actions do more than a paragraph of praise for the app that does not exist yet.',
            before: 'Build a powerful, intuitive, modern expense tracker with a great user experience.',
            after:
                'Build an expense tracker where I can log an expense with an amount, category, date, and optional photo of the receipt, see a running monthly total against a budget I set per category, filter by date range, and export a month as CSV.',
            note:
                'Every clause in the second version becomes something you can click. None of the adjectives in the first version become anything at all.',
        },

        {
            type: 'compare',
            id: 'p3',
            heading: '3. Say what should be true, not how to do it',
            body:
                'Implementation instructions constrain the solution to whatever you happened to think of. Stating the requirement lets it be solved properly, including in ways you would not have specified.',
            before: 'Add a function that strips dashes and spaces from the phone number field.',
            after:
                'I should be able to find a customer by phone number regardless of how it was typed, so searching for 5551234567 finds a record saved as (555) 123-4567.',
            note:
                'The second version also covers the parentheses, the leading country code, and the search box you forgot existed. State the how only when you have a specific reason, such as "use a serverless worker for this so the data is shared".',
        },

        {
            type: 'compare',
            id: 'p4',
            heading: '4. Say where the data lives',
            body:
                'An app that forgets everything on reload is the most common disappointment in a first version, and it is entirely preventable with one clause. Say whether the data is yours alone, shared with a team, or public.',
            before: 'Build a reading list app.',
            after:
                'Build a reading list app where I add books with an author and status, and everything is saved to my Puter account so it is still there when I come back on another device.',
            note:
                'For shared data, say so explicitly: "use a Puter serverless worker so everyone with the link sees the same list". For real-time collaboration, name it: "use the Puter peer API so people see each other\'s changes as they happen".',
        },

        {
            type: 'compare',
            id: 'p5',
            heading: '5. Give tone a direction, in two or three words',
            body:
                'Visual direction is worth including and worth keeping short. Two or three words set a coherent direction; a paragraph of styling instructions produces a design that is following orders rather than making sense.',
            before:
                'Make it look really professional and clean and modern with nice colors and good typography and a premium feel.',
            after: 'Make it calm and editorial: lots of white space, one accent color, generous line height.',
            note:
                'If you have brand colors, give the hex codes. If you have a logo, attach it. Otherwise leave the palette open, because it is much faster to say "warmer" once you can see something than to specify it in advance.',
        },

        {
            type: 'compare',
            id: 'p6',
            heading: '6. Ask for one coherent thing per turn',
            body:
                'This is the pattern people abandon first and regret most. A turn with six unrelated changes gives you six things to re-test at once, and no clean way to undo just the one that went wrong.',
            before:
                'Add CSV export, fix the date format, make the sidebar collapsible, add dark mode, change the font, and add a search box.',
            after:
                'In the transactions table: show dates as 12 Mar 2026 instead of 03/12/2026, and add a search box above the table that filters rows as I type.',
            note:
                'The remaining four requests are still worth making. Making them in three more turns takes less total time than untangling one turn that did six things at once.',
        },

        {
            type: 'prose',
            id: 'template',
            heading: 'A template you can fill in',
            body: [
                'If you want a starting shape rather than a set of principles, this covers the six patterns in about four lines. Fill in the brackets and delete anything that does not apply.',
            ],
            quote:
                'Build a [thing] for [who uses it, in what setting]. They need to [action one], [action two], and [action three]. Save data to [my Puter account / a Puter serverless worker so everyone sees the same data]. Make it [two or three words of tone], and make sure it works well on a phone.',
            after: [
                'That is enough for a first version of almost anything. Everything after it is better said in front of a running app than guessed at in advance.',
            ],
        },

        {
            type: 'prose',
            id: 'follow-ups',
            heading: 'Prompts for the second turn onwards',
            body: [
                'Follow-up prompts have a different job. The first prompt establishes what the app is; every one after it corrects a specific difference between what exists and what you meant. Three habits make those turns land.',
            ],
            list: [
                '**Point instead of locating.** Once the app is real, do not write "the third card in the second row". Arm the element picker, click the thing, and describe the change. It removes an entire class of misunderstanding.',
                '**Describe the symptom, not your diagnosis.** "The total does not update when I delete a row" is more useful than "the delete handler is not recalculating", because your diagnosis might be wrong and the symptom never is.',
                '**Say what to leave alone when it matters.** "Change only the checkout dialog. Do not touch the gear list." Useful when a previous turn drifted into places you liked as they were.',
            ],
        },

        {
            type: 'prose',
            id: 'not-worth',
            heading: 'Things that are not worth putting in a prompt',
            body: [
                'A few habits carried over from chatbots add length without adding results.',
            ],
            list: [
                '**Role-play preambles.** "You are a world-class senior engineer with twenty years of experience" does nothing here. The system already knows the job.',
                '**Politeness padding and pressure.** Please and thank you are free and harmless; "this is very important to my career" is not an input the build responds to.',
                '**Restating what is already automatic.** You do not need to ask for error handling to be checked, an installable manifest, icons, or a mobile-friendly layout. Those are already part of every build.',
                '**Specifying the stack.** The output is HTML, CSS, JavaScript, and Tailwind from a CDN, with Puter.js for anything that needs a backend. Asking for a different framework costs you the parts that are already wired together.',
            ],
        },

        {
            type: 'cta',
            heading: 'Try the template',
            body: 'Open the builder with the fill-in-the-blanks template loaded, and replace the brackets with your own project.',
            label: 'Open with the template',
            href: buildLink(
                'Build a [thing] for [who uses it, in what setting]. They need to [action one], [action two], and [action three]. Save data to my Puter account. Make it [two or three words of tone], and make sure it works well on a phone.',
            ),
        },
    ],

    related: ['guides/how-to-build-an-app-with-ai', 'guides/how-to-build-a-website-with-ai', 'vibe-coding', 'what-to-build'],
};
