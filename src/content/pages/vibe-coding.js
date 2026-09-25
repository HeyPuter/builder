import { buildLink } from '../site.js';

export default {
    slug: 'vibe-coding',
    updated: '2026-08-15',
    priority: 0.8,
    changefreq: 'monthly',
    navLabel: 'What is vibe coding?',

    title: 'What Is Vibe Coding? A Straight Answer | Puter',
    description:
        'Vibe coding means describing software in plain language and letting AI write it. Where the term came from, what it is good at, where it fails, and how to do it well.',
    ogTagline: 'The term, the technique, the limits',

    hero: {
        eyebrow: 'Reference',
        h1: 'Vibe coding, explained',
        lead:
            'Vibe coding is building software by describing what you want in ordinary language and letting an AI write the code, staying at the level of intent instead of syntax. Here is where the phrase came from, what the technique is genuinely good at, and where it stops working.',
        cta: { label: 'Try it', href: '/' },
        secondary: { label: 'How to write a build prompt', href: '/guides/how-to-write-a-build-prompt/' },
    },

    sections: [
        {
            type: 'prose',
            id: 'definition',
            heading: 'The short definition',
            body: [
                'Vibe coding is writing software by describing the result you want and letting an AI produce the implementation. You review the behavior rather than the code: you run the thing, see whether it does what you meant, and describe the next change.',
                'The term comes from [a post by Andrej Karpathy](https://x.com/karpathy/status/1886192184808149383) on 2 February 2025, describing a way of working where you "fully give in to the vibes, embrace exponentials, and forget that the code even exists". It spread quickly, and by November 2025 Collins Dictionary had made it [their word of the year](https://en.wikipedia.org/wiki/Vibe_coding).',
                'What made the phrase stick is that it named a real shift in where the effort goes. In conventional programming, most of the work is translating an idea into syntax. In vibe coding, the translation is free and the scarce skills become describing precisely, judging output quickly, and knowing when to stop trusting it.',
            ],
        },

        {
            type: 'grid',
            id: 'good-at',
            columns: 2,
            heading: 'What it is genuinely good at',
            intro:
                'The technique is not equally useful everywhere. It is strongest where the cost of being wrong is low and the feedback loop is fast.',
            items: [
                {
                    title: 'Software that would otherwise not exist',
                    body:
                        'The tools that were never worth a developer\'s week: a tracker for one team\'s odd process, a calculator for one recurring decision, an internal dashboard for four people. Vibe coding moves the break-even point far enough that these get built.',
                },
                {
                    title: 'The first eighty percent of a prototype',
                    body:
                        'Getting from nothing to something you can click through is where AI is furthest ahead of hand-writing. A rough working version reveals more about what you actually want than another round of wireframes.',
                },
                {
                    title: 'Unfamiliar territory',
                    body:
                        'Working in a language, API, or domain you do not know well, the model carries the boilerplate and the conventions while you supply the judgment about what the thing should do.',
                },
                {
                    title: 'Interfaces and layout',
                    body:
                        'Describing a layout is faster than writing one, and iterating on it visually is faster still. This is the part of the job where "make the sidebar narrower and move the filters into it" beats twenty minutes of CSS.',
                },
            ],
        },

        {
            type: 'prose',
            id: 'limits',
            heading: 'Where it breaks down',
            body: [
                'Being honest about the failure modes is what separates a working method from a hype cycle. Four are worth planning around.',
            ],
            list: [
                '**Confident wrongness.** Generated code that runs is not the same as generated code that is correct. Edge cases, empty states, and error paths are where models are weakest, precisely because those paths do not show up when you click through the happy path.',
                '**Security and privacy.** Handling payments, credentials, health data, or anything under a compliance regime is not a place to accept code you have not read. This is the single clearest boundary of the technique.',
                '**Accumulated drift.** Twenty rounds of "just add one more thing" produce software nobody has ever read end to end. Without occasional consolidation, changes get slower and regressions get stranger.',
                '**Understanding debt.** If you cannot explain roughly how your app works, you cannot judge whether a change is safe, and you cannot take over from the AI when it gets stuck. That is fine for a weekend tool and a real problem for anything you depend on.',
            ],
            after: [
                'None of these are arguments against the technique. They are the reason the useful question is not "is vibe coding good?" but "what is this particular thing for, and what happens if it is wrong?" A habit tracker and a payroll system deserve different amounts of scrutiny.',
            ],
        },

        {
            type: 'steps',
            id: 'doing-it-well',
            heading: 'How to do it well',
            intro:
                'The people who get consistently good results are not writing longer prompts. They are running a tighter loop.',
            items: [
                {
                    title: 'Describe outcomes, not implementations',
                    body:
                        '"People should be able to find a booking by phone number even with the dashes typed differently" is a better instruction than "add a normalize function". Say what should be true; leave the how alone unless you have a specific reason.',
                },
                {
                    title: 'Change one thing at a time',
                    body:
                        'A request with five unrelated changes gives you five things to review at once and no clean way to undo the one that went wrong. Small turns are faster overall, even though each one feels slower.',
                },
                {
                    title: 'Test the behavior, not the code',
                    body:
                        'Use the app the way an annoyed user would: empty inputs, huge inputs, double clicks, the back button, a slow connection. This is the review that actually catches things, and it does not require reading a line.',
                },
                {
                    title: 'Snapshot before anything risky',
                    body:
                        'Before a big restructuring, make sure you can get back. Version history turns a bad idea into a thirty-second detour instead of an evening spent undoing it by hand.',
                },
                {
                    title: 'Read the parts that matter',
                    body:
                        'You do not have to read everything. Read the code that touches money, personal data, permissions, or anything you would be embarrassed to get wrong in public. That is usually a small fraction of the app.',
                },
            ],
        },

        {
            type: 'prose',
            id: 'terminology',
            heading: 'Vibe coding vs AI-assisted coding',
            body: [
                'The two get used interchangeably and should not be. AI-assisted coding means a developer writing code with a model helping: completions, refactors, explanations. The human still reads and owns every line.',
                'Vibe coding means accepting output based on whether the software behaves correctly, without reading it line by line. Karpathy\'s original framing was explicit about that, and it is the part that makes the term useful. Purists object to the phrase for exactly this reason, since "not reading the code" is a description of a risk, not a methodology.',
                'Both are legitimate. The mistake is doing one while believing you are doing the other: skimming AI output, feeling like you reviewed it, and shipping something to production on that basis.',
            ],
        },

        {
            type: 'prose',
            id: 'where-puter-fits',
            heading: 'Where this builder fits',
            body: [
                'Puter\'s builder is designed for the loop above rather than for a one-shot demo. After every change it reloads the app, watches for runtime errors, and hands them back to the AI to fix before telling you the turn is done, which removes most of the "it looks right but throws on load" class of problem.',
                'Every turn is snapshotted, so restoring is a click. You can click an element in the running app instead of describing where it is. And because the output is plain HTML, CSS, and JavaScript rather than a proprietary format, reading the parts that matter is realistic: you can open the files, and you can download the whole project and take it elsewhere.',
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'Common questions',
            items: [
                {
                    q: 'Who coined the term "vibe coding"?',
                    a: [
                        'Andrej Karpathy, in [a post on X](https://x.com/karpathy/status/1886192184808149383) on 2 February 2025. He described a way of working where you "fully give in to the vibes, embrace exponentials, and forget that the code even exists", and noted that it had become possible because the models had got good enough to make it practical.',
                    ],
                },
                {
                    q: 'Is vibe coding just prompting?',
                    a: [
                        'Prompting is one input. The technique is the loop: describe, run, judge the behavior, describe the next change, and keep the ability to roll back. Most of the skill is in the judging and the scoping, not in the wording of any single prompt.',
                    ],
                },
                {
                    q: 'Is vibe coding safe for production apps?',
                    a: [
                        'It depends entirely on what the app does. An internal tracker that only your team uses carries almost no risk. Anything handling payments, credentials, or other people\'s personal data needs code review by someone who understands it, whether a human or an AI wrote it.',
                    ],
                },
                {
                    q: 'Do I need to know how to code?',
                    a: [
                        'To build something useful, no. To judge whether what you built is trustworthy, some understanding helps a great deal, and it grows naturally as you read the output of a few dozen changes.',
                    ],
                },
                {
                    q: 'Will it replace programmers?',
                    a: [
                        'It has already changed what the job looks like more than it has reduced the need for it. The parts that are hard to automate (deciding what to build, judging whether it is correct, and owning the consequences when it is not) are the parts vibe coding puts more weight on, not less.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Try the loop for yourself',
            body: 'One sentence, a running app, and a preview that tells you the truth about whether it works.',
            label: 'Open the builder',
            href: buildLink(''),
        },
    ],

    related: ['ai-app-builder', 'guides/what-is-an-ai-app-builder', 'guides/how-to-write-a-build-prompt', 'guides/how-to-build-an-app-with-ai', 'what-to-build'],
};
