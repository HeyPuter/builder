import { verticalPage } from '../verticals.js';

export default verticalPage({
    slug: 'personal-trainers',
    navLabel: 'Personal trainers',

    title: 'App and Website Builder for Personal Trainers | Puter',
    description:
        'Client portals, booking pages, workout trackers, and a site for your training business. Describe what you need in plain English and it is built, tested, and live.',
    ogTagline: 'Software for your training business',

    eyebrow: 'For personal trainers',
    h1: 'Your training business deserves better than a spreadsheet',
    lead:
        'The plans live in one app, the schedule in another, the check-ins in a group chat. Describe the tool you actually want, in plain English, and get a working app or website you own: a client portal, a booking page, a progress tracker, or all three.',

    demo: {
        prompt: 'Build a client portal where my clients can see their workout plan and book sessions',
        app: {
            name: 'coachdesk.puter.site',
            header: 'This week',
            blocks: [
                {
                    kind: 'stats',
                    items: [
                        { value: '18', label: 'Sessions booked' },
                        { value: '24', label: 'Active clients' },
                        { value: '6', label: 'Check-ins due' },
                    ],
                },
                {
                    kind: 'list',
                    rows: [
                        { title: 'Maya R.', sub: 'Strength · Tue 7:00', tag: 'Booked' },
                        { title: 'Jon P.', sub: 'Mobility · Tue 9:30', tag: 'Booked' },
                        { title: 'Alba G.', sub: 'Week 4 check-in', tag: 'Due' },
                    ],
                },
            ],
        },
    },

    useCasesHeading: 'The tools trainers actually build here',
    useCasesIntro:
        'Not templates. Each of these is generated from a description of your business, so it matches how you actually train people.',
    useCases: [
        {
            icon: 'calendar',
            title: 'A booking page that fills your week',
            body:
                'Clients pick from the slots you offer, you see the week on one grid, and a cancellation frees the slot without a text thread. Built around your session types and your hours.',
        },
        {
            icon: 'users',
            title: 'A client portal',
            body:
                'Each client signs in with their own account and sees their plan, their session history, and what you assigned this week. No more PDFs re-exported every Monday.',
        },
        {
            icon: 'chart',
            title: 'Progress tracking that clients can see',
            body:
                'Lifts, weight, measurements, photos: logged in seconds, charted over months. Nothing motivates a client like their own line going up.',
        },
        {
            icon: 'dumbbell',
            title: 'A workout plan builder',
            body:
                'Assemble sessions from your own exercise library, assign them to clients, and duplicate a good week instead of rewriting it. Your programming style, encoded once.',
        },
        {
            icon: 'layout',
            title: 'A site that sells your training',
            body:
                'Your approach, your packages, your results, and one clear way to get in touch. Live at a real URL the same afternoon you describe it.',
        },
        {
            icon: 'sparkles',
            title: 'AI inside your own app',
            body:
                'The apps you build can call AI themselves: draft a week of programming from your notes, summarize a month of check-ins, or answer common client questions.',
        },
    ],

    splitHeading: 'From a sentence to software, without hiring anyone',
    splits: [
        {
            title: 'Describe it like you would to another trainer',
            art: 'describe',
            body: [
                'You do not need to know what a database is. "My clients should log each set, and I want to see who trained this week" is a complete, buildable specification.',
                'The builder writes the files, runs the app next to the conversation, and you watch it take shape. A first version lands in minutes, not weeks.',
            ],
        },
        {
            title: 'It lives on your clients\' phones',
            art: 'devices',
            body: [
                'Everything built here works on a phone by default and can be added to a home screen like a native app, with your name and your icon.',
                'A client opens your portal from their gym bag between sets, logs the workout, and the numbers are on your dashboard before their shower.',
            ],
        },
        {
            title: 'One link, and you own everything behind it',
            art: 'publish',
            body: [
                'Publish and your app is live at its own address to share in your bio, your booking confirmations, and your check-in emails.',
                'The result is ordinary web files you can download and take anywhere. If you outgrow this, nothing is trapped.',
            ],
        },
    ],

    promptsHeading: 'Steal one of these prompts',
    prompts: [
        {
            title: 'Session booking page',
            body: 'Your offer, your slots, and a week view of who booked what.',
            prompt:
                'Build a session booking page for my personal training business. I offer 30 and 60 minute sessions, Monday to Saturday between 6:00 and 18:00. Clients pick a session type and an open slot and enter their name and email. Show me a weekly calendar of all bookings, let me block out slots I am not available, and save everything to my Puter account.',
        },
        {
            title: 'Client portal with plans',
            body: 'Clients sign in, see their program, and check off workouts.',
            prompt:
                'Build a client portal for my personal training business. I sign in as the coach and create clients, each with a weekly workout plan made of exercises with sets, reps, and notes. Each client signs in with their own Puter account and sees only their plan, checks off completed workouts, and leaves a comment per session. Show me a dashboard of who trained this week and who has not.',
        },
        {
            title: 'Progress tracker',
            body: 'Bodyweight, lifts, and measurements charted over time.',
            prompt:
                'Build a client progress tracker where I can log, per client, their bodyweight, key lifts (squat, bench, deadlift), and measurements on any date, then see a chart per metric over time with personal records highlighted. Let me export a client\'s history as CSV and keep everything saved to my Puter account.',
        },
        {
            title: 'Training business site',
            body: 'A one-page site with packages, results, and a contact form.',
            prompt:
                'Build a one-page website for my personal training business. Sections: a strong intro about my coaching approach, three training packages with prices, client results, an about section with my certifications, and a contact form that saves inquiries so I can review them. Clean, energetic design that works well on phones.',
        },
    ],

    faqHeading: 'Questions trainers ask',
    faq: [
        {
            q: 'Do my clients need anything special to use what I build?',
            a: [
                'A link and a browser. If the app stores per-client data, like a plan or a progress log, each client signs in with a free Puter account so their data is saved under their own name. There is nothing to install, and it works on any phone.',
            ],
        },
        {
            q: 'I already track everything in a spreadsheet. Why switch?',
            a: [
                'The spreadsheet works until a client has to touch it. An app gives each client their own view, their own login, and a phone-sized interface for logging a set between sets, while you keep one dashboard across everyone.',
                'You can also ask the builder to make your app import a CSV export of your existing sheet, so switching does not mean retyping.',
            ],
        },
        {
            q: 'What does this cost me as my client list grows?',
            a: [
                'Building is free with a Puter account. Apps built here run on a model where each signed-in user\'s storage comes with their own account, so a portal with thirty clients does not send you a growing hosting bill.',
            ],
        },
        {
            q: 'Can I change it myself later?',
            a: [
                'Yes, in two ways. Ask for the change in plain English, or click the element in the live preview and describe what should be different. Every change is snapshotted, so a bad idea is one restore away from undone.',
            ],
        },
        {
            q: 'Can it take payments for my sessions?',
            a: [
                'The builder does not process payments for you, so treat it as the system of record rather than the checkout. Trainers typically track packages and sessions used in the app and take payment however they already do, or link out to their existing payment page.',
            ],
        },
    ],

    ctaHeading: 'Describe the tool your training business needs',
    ctaBody: 'One sentence about your clients and your week is enough to see a first version running.',

    related: ['for', 'for/tutors', 'for/therapists', 'what-to-build'],
});
