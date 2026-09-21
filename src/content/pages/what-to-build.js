import { buildLink, LINKS } from '../site.js';

export default {
    slug: 'what-to-build',
    updated: '2026-08-15',
    priority: 0.8,
    changefreq: 'monthly',
    navLabel: 'What to build',

    title: 'What to Build With AI: 31 Ideas and the Prompts | Puter',
    description:
        'Thirty-one things worth building with an AI app builder, each with the full prompt to start from: internal tools, personal utilities, sites, study aids, and games.',
    ogTagline: '31 ideas, and the prompt for each',

    hero: {
        eyebrow: 'Ideas',
        h1: 'What to build',
        lead:
            'The hardest part of an AI builder is not the building. It is the blank box. Below are thirty-one things worth making, each with a full starting prompt, grouped by what you might be trying to get done. Every one opens the builder with the prompt already loaded, ready for you to edit.',
        cta: { label: 'Start from a blank prompt', href: '/' },
        secondary: { label: 'How to write a good prompt', href: '/guides/how-to-write-a-build-prompt/' },
    },

    sections: [
        {
            type: 'prose',
            id: 'how-to-use',
            body: [
                'A prompt below is a starting point, not a spell. Change the details to match your situation before you send it: the fields you actually track, the stages your process actually has, the words your team actually uses. A prompt with your specifics in it produces a first version you can use, rather than a generic demo you then have to bend.',
            ],
        },

        {
            type: 'prompts',
            id: 'work',
            heading: 'Internal tools for work',
            intro:
                'The software that never gets built because it would only help six people. Now it costs an afternoon.',
            items: [
                {
                    title: 'Applicant tracker',
                    body: 'Candidates through stages, with notes and a scorecard per interview.',
                    prompt:
                        'Build an applicant tracker where I can add candidates with a name, role, source, and résumé link, move them through stages (Applied, Screen, Interview, Offer, Hired, Rejected) on a drag-and-drop board, add dated notes and a 1 to 5 scorecard per interview round, and filter by role. Save everything to my Puter account.',
                },
                {
                    title: 'Asset checkout log',
                    body: 'Who has the laptop, the camera, or the van, and since when.',
                    prompt:
                        'Build an equipment checkout log where I can register assets with a name, category, and serial number, check one out to a person with a due date, check it back in, and see everything currently out with anything overdue highlighted. Include a full history per asset and a search box. Persist it to my Puter account.',
                },
                {
                    title: 'Meeting cost calculator',
                    body: 'A live counter of what the meeting is costing while it runs.',
                    prompt:
                        'Build a meeting cost calculator where I enter the number of attendees and an average hourly rate, press start, and watch a live running total of what the meeting has cost so far. Add a history of past meetings with their duration and cost, and a weekly total.',
                },
                {
                    title: 'Shift scheduler',
                    body: 'A weekly grid, drag-and-drop staff, and a warning when someone is over hours.',
                    prompt:
                        'Build a shift scheduler for a small team with a weekly grid of days and shift slots, staff I can add with a name and maximum weekly hours, drag-and-drop assignment onto slots, a per-person hours total that turns red when it exceeds their maximum, and a printable week view. Save everything to my Puter account.',
                },
                {
                    title: 'Client portal',
                    body: 'A signed-in space where each client sees only their own files and updates.',
                    prompt:
                        'Build a client portal where clients sign in with their Puter account and see only their own project updates and files. Give me an admin view where I can post an update or upload a file for a specific client. Use Puter authentication and file storage, and show a clear signed-in state.',
                },
                {
                    title: 'Incident log',
                    body: 'Timestamped entries, severity, and a timeline you can hand to anyone.',
                    prompt:
                        'Build an incident log where I can open an incident with a title, severity, and start time, append timestamped updates as things develop, mark it resolved with a resolution note, and view a clean timeline of any past incident. Include a filter by severity and a monthly summary count. Persist to my Puter account.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'personal',
            heading: 'Personal and everyday',
            intro: 'Small, specific tools that fit your life rather than the average of everyone\'s.',
            items: [
                {
                    title: 'Grocery planner',
                    body: 'Meals for the week, and a shopping list that assembles itself.',
                    prompt:
                        'Build a weekly meal planner where I can save recipes with their ingredients, drag recipes onto a seven-day plan, and generate a consolidated shopping list from the plan with quantities combined and items grouped by supermarket section. Let me check items off while shopping. Save everything to my Puter account.',
                },
                {
                    title: 'Subscription auditor',
                    body: 'Everything you pay monthly, sorted by how little you use it.',
                    prompt:
                        'Build a subscription tracker where I log recurring payments with an amount, billing cycle, renewal date, and how often I actually use it (daily, weekly, rarely, never). Show the monthly and annual total, a list sorted by cost per use, and a warning for anything renewing in the next seven days. Persist to my Puter account.',
                },
                {
                    title: 'Reading list',
                    body: 'Books, progress, notes, and what to read next.',
                    prompt:
                        'Build a reading tracker where I add books with an author, page count, and status (want to read, reading, finished), log my current page to see a progress bar, keep notes and quotes per book with page numbers, and see stats for the year including books finished and pages read. Save it to my Puter account.',
                },
                {
                    title: 'Home inventory',
                    body: 'What you own, what it cost, and where the receipt is.',
                    prompt:
                        'Build a home inventory app for insurance purposes where I add items with a room, description, purchase date, value, and photo, see totals by room and overall, attach receipt images, and export the whole inventory as a printable list. Store photos in my Puter file storage.',
                },
                {
                    title: 'Trip planner',
                    body: 'An itinerary, a budget, and a packing list in one place.',
                    prompt:
                        'Build a trip planner where I create a trip with dates and a destination, add day-by-day itinerary items with times and locations, track a budget with planned versus actual spending by category, and keep a packing checklist. Show a countdown to departure. Persist everything to my Puter account.',
                },
                {
                    title: 'Split the bill',
                    body: 'Shared expenses for a group, and who owes whom at the end.',
                    prompt:
                        'Build a shared-expense splitter where I create a group with names, log expenses saying who paid and who it was split between (evenly or by custom amounts), and see a settle-up view showing the minimum set of payments needed to square everyone up. Save groups between visits.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'sites',
            heading: 'Sites and pages',
            intro: 'Static where it should be static, interactive where it needs to be.',
            items: [
                {
                    title: 'Portfolio',
                    body: 'Work, an about page, and a contact form that keeps what people send.',
                    prompt:
                        'Build a personal portfolio site with a bold hero, an about section, a projects grid where each project opens a detail view with images and a write-up, and a contact form that saves submissions to my Puter account so I can read them later. Include a dark mode toggle.',
                },
                {
                    title: 'Landing page',
                    body: 'Hero, features, pricing, FAQ, and a waitlist that collects emails.',
                    prompt:
                        'Build a product launch landing page with a strong hero and call to action, three feature highlights, a three-tier pricing table, an FAQ accordion, and an email waitlist form that stores signups in my Puter account. Clean and high contrast.',
                },
                {
                    title: 'Documentation site',
                    body: 'A sidebar, instant search, and code blocks that copy properly.',
                    prompt:
                        'Build a documentation site with a fixed sidebar of sections, a search box that filters pages as I type, syntax-highlighted code blocks with a copy button, a per-page table of contents, and a dark mode toggle.',
                },
                {
                    title: 'Link hub',
                    body: 'One page, every link, and a count of what people actually click.',
                    prompt:
                        'Build a personal link-in-bio page with a profile photo, a short bio, and a stack of link buttons with icons. Let me edit the links from an admin view saved to my Puter account, and track how many times each link has been clicked.',
                },
                {
                    title: 'Wedding or event page',
                    body: 'Details, schedule, directions, and RSVPs you can actually count.',
                    prompt:
                        'Build an event page with a countdown, a schedule of the day with times, venue details and directions, an FAQ for guests, a photo gallery, and an RSVP form that records names, guest counts, and dietary requirements. Store RSVPs so I can see them in a list with totals.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'learning',
            heading: 'Learning and teaching',
            intro: 'Where AI inside the app you built does most of the work.',
            items: [
                {
                    title: 'Flashcards from your notes',
                    body: 'Paste notes, get cards, study them with spaced repetition.',
                    prompt:
                        'Build a flashcard app where I paste in study notes and it uses AI to generate question-and-answer cards from them. Let me review cards with a spaced repetition schedule based on whether I got each one right, see how many are due today, and organize cards into decks saved to my Puter account.',
                },
                {
                    title: 'Language practice',
                    body: 'A conversation partner that corrects you and tracks vocabulary.',
                    prompt:
                        'Build a language practice app where I pick a language and a topic and have a text conversation with an AI partner that replies in that language, gently corrects my mistakes with a short explanation, and collects every new word I encounter into a vocabulary list I can review later. Save my history and vocabulary.',
                },
                {
                    title: 'Quiz builder for a class',
                    body: 'Write questions once, share a link, see the results.',
                    prompt:
                        'Build a quiz tool where a teacher creates a quiz with multiple-choice and short-answer questions, shares a link with students, and sees each submission with an automatic score for the multiple-choice parts. Use a Puter serverless worker so submissions from different people all reach the teacher.',
                },
                {
                    title: 'Reading comprehension helper',
                    body: 'Paste an article, get a summary, key terms, and questions.',
                    prompt:
                        'Build a study helper where I paste in an article or a chapter and it produces a plain-language summary, a glossary of key terms with definitions, and five comprehension questions with answers I can reveal one at a time. Keep a history of everything I have studied.',
                },
                {
                    title: 'Practice problem generator',
                    body: 'Endless questions at the right difficulty, with worked solutions.',
                    prompt:
                        'Build a math practice app where I choose a topic and difficulty and it generates practice problems one at a time, checks my answer, and shows a step-by-step worked solution when I get one wrong or ask for it. Track my accuracy by topic over time.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'creative',
            heading: 'Games and creative tools',
            intro: 'The category where a rough first version is most fun to poke at.',
            items: [
                {
                    title: 'Solitaire',
                    body: 'Klondike with drag-and-drop, undo, and a satisfying win animation.',
                    prompt:
                        'Build a Klondike solitaire game with drag-and-drop cards, a draw pile, four suit foundations, automatic win detection, undo, and a hint button. Include smooth dealing and flipping animations, sound effects, and a celebration when the game is won.',
                },
                {
                    title: 'Pixel art editor',
                    body: 'A grid, a palette, and an export that keeps the pixels crisp.',
                    prompt:
                        'Build a pixel art editor with a resizable grid, a color palette I can edit, pencil, fill, eraser, and eyedropper tools, undo and redo, onion-skinning across frames for simple animation, and export as a PNG at a chosen scale with no smoothing.',
                },
                {
                    title: 'Story generator',
                    body: 'AI writing and AI illustration in the same page.',
                    prompt:
                        'Build a children\'s story generator where I enter a character, a setting, and a lesson, and it uses AI to write a short illustrated story with a generated image for each page. Let me flip through the pages, regenerate any page I do not like, and save finished stories to my Puter account.',
                },
                {
                    title: 'Music sequencer',
                    body: 'A step grid, a few sounds, and something you can actually jam on.',
                    prompt:
                        'Build a step sequencer with a 16-step grid across four instrument tracks (kick, snare, hi-hat, bass), adjustable tempo, per-step toggling, play and stop controls, and the ability to save and load patterns from my Puter account. Use the Web Audio API to synthesize the sounds.',
                },
                {
                    title: 'Typing trainer',
                    body: 'Words per minute, accuracy, and a heatmap of the keys you fumble.',
                    prompt:
                        'Build a typing practice app that shows a passage to type, highlights the current character, tracks words per minute and accuracy live, and at the end shows a results screen with a keyboard heatmap of which keys I mistyped most. Keep a history of my sessions with a progress chart.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'multiuser',
            heading: 'Multi-user and real-time',
            intro:
                'These need something running off the client, which is what [serverless workers](' + LINKS.workers + ') and the [peer API](' + LINKS.peer + ') are for.',
            items: [
                {
                    title: 'Shared standup board',
                    body: 'Everyone posts, everyone sees, no accounts required.',
                    prompt:
                        'Build a team standup board where anyone with the link can post what they did yesterday, what they are doing today, and any blockers, with their name and a timestamp. Use a Puter serverless worker so posts are shared across everyone who opens the page, and group entries by day.',
                },
                {
                    title: 'Live poll',
                    body: 'Ask a room a question and watch the bars move.',
                    prompt:
                        'Build a live polling app where I create a question with options and share a link, and results update in real time as people vote, shown as an animated bar chart with vote counts and percentages. Use a Puter serverless worker to hold the votes, and prevent the same browser voting twice.',
                },
                {
                    title: 'Video call room',
                    body: 'A link, a room, and video that connects peer to peer.',
                    prompt:
                        'Build a simple video chat room using the Puter peer API where one person starts a room and gets a shareable invite code, others join with that code, and everyone sees a grid of video tiles with mute and camera toggles and a text chat sidebar. Read the Peer API documentation carefully first.',
                },
                {
                    title: 'Collaborative whiteboard',
                    body: 'Two cursors, one canvas, changes appearing as they happen.',
                    prompt:
                        'Build a collaborative whiteboard where people join a room by invite code and draw together in real time using the Puter peer API, with visible cursors for each participant, pen color and size options, an eraser, and a clear button. Read the Peer API documentation carefully first.',
                },
            ],
        },

        {
            type: 'links',
            id: 'by-profession',
            heading: 'Or start from your profession',
            intro:
                'If you build for your work, there is probably a page written for it: what to make, the exact prompts, and the questions your field asks.',
            items: [
                {
                    icon: 'briefcase',
                    label: 'See every profession page',
                    slug: 'for',
                    body: 'Trainers, lawyers, accountants, agents, restaurants, photographers, tutors, therapists.',
                },
                {
                    icon: 'dumbbell',
                    label: 'For personal trainers',
                    slug: 'for/personal-trainers',
                    body: 'Client portals, booking pages, workout plans, and progress charts.',
                },
                {
                    icon: 'scale',
                    label: 'For lawyers',
                    slug: 'for/lawyers',
                    body: 'A firm site, structured intake, deadline dockets, and time tracking.',
                },
            ],
        },

        {
            type: 'prose',
            id: 'still-stuck',
            heading: 'Still not sure?',
            body: [
                'Then start from something that already annoys you. The best first project is almost always a small irritation you have personally: the spreadsheet you dread opening, the recurring calculation you do in your head, the thing your team keeps asking about in chat because there is nowhere to look it up.',
                'Those make good projects because you already know when the result is right, which is the single most useful thing to have when the AI does the typing. A generic idea from a list leaves you guessing about the requirements; your own annoyance does not.',
            ],
        },

        {
            type: 'cta',
            heading: 'Pick one and start',
            body: 'Edit the prompt to match your situation, send it, and you will have something to react to in a couple of minutes.',
            label: 'Open the builder',
            href: buildLink(''),
        },
    ],

    related: ['ai-app-builder', 'ai-website-builder', 'guides/how-to-write-a-build-prompt', 'guides/how-to-build-an-app-with-ai'],
};
