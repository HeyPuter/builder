import { verticalPage } from '../verticals.js';

export default verticalPage({
    slug: 'event-planners',
    navLabel: 'Event planners',

    title: 'Website and App Builder for Event Planners | Puter',
    description:
        'Client event sites, RSVP pages, vendor trackers, and run-of-show tools for event and wedding planners. Describe the event and it is built and published free.',
    ogTagline: 'Every event gets its own site',

    eyebrow: 'For event planners',
    h1: 'Give every event its own website',
    lead:
        'A wedding, a gala, a company offsite: each one generates the same scramble of RSVPs, vendor threads, and "what time does it start" texts. Describe the event in plain English and get its own site and tools: RSVPs collected, timeline shared, questions answered before they are asked.',

    demo: {
        prompt: 'Build an RSVP site for a 120-guest gala with the schedule and menu choices',
        app: {
            name: 'meridiangala.puter.site',
            header: 'Meridian Gala',
            blocks: [
                {
                    kind: 'stats',
                    items: [
                        { value: '86', label: 'Attending' },
                        { value: '12', label: 'Regrets' },
                        { value: '22', label: 'No reply yet' },
                    ],
                },
                {
                    kind: 'list',
                    rows: [
                        { title: 'Cocktail hour', sub: '6:30 · Terrace', tag: '' },
                        { title: 'Dinner service', sub: '7:45 · Main hall', tag: 'Menu' },
                        { title: 'Speeches', sub: '9:00 · 3 speakers', tag: 'Cue' },
                    ],
                },
            ],
        },
    },

    useCasesHeading: 'What planners build here',
    useCasesIntro:
        'One set of tools per event, spun up in an afternoon and retired when the last thank-you note is sent.',
    useCases: [
        {
            icon: 'layout',
            title: 'An event site per client',
            body:
                'The date, the venue, the schedule, the dress code, the parking: every question guests text the couple at 11pm, answered at one elegant link instead.',
        },
        {
            icon: 'mail',
            title: 'RSVPs with the details you actually need',
            body:
                'Attendance, plus-ones, meal choices, dietary notes, and song requests if you dare, collected into counts you can hand the caterer instead of a spreadsheet you retype.',
        },
        {
            icon: 'check',
            title: 'A vendor and task tracker',
            body:
                'Every vendor, contract status, deposit due date, and day-of contact on one board, per event. The binder, except it cannot be left in the other car.',
        },
        {
            icon: 'clock',
            title: 'A run-of-show everyone follows',
            body:
                'The minute-by-minute timeline, shared as a link with vendors and the venue, updated once by you instead of re-emailed five times. Backstage, everyone refreshes the same page.',
        },
        {
            icon: 'camera',
            title: 'After-event galleries',
            body:
                'A private page where the photographer\'s selects, the toasts, and guests\' phone shots live together, shared with everyone who was in the room and no one who was not.',
        },
        {
            icon: 'briefcase',
            title: 'A portfolio that books the next one',
            body:
                'Your past events, told properly: the brief, the venue transformed, the numbers. The site that turns "she planned Mia\'s wedding" into your next three inquiries.',
        },
    ],

    splitHeading: 'From the client brief to the last cue',
    splits: [
        {
            title: 'The client brief is the prompt',
            art: 'describe',
            body: [
                '"Black-tie gala for 120, terrace cocktails, seated dinner with three menu choices, RSVP by September 20." You already write this paragraph for every event; here it also builds the website.',
                'The site appears in a live preview styled to the event, and you refine it with the client on a call, changing things by describing them.',
            ],
        },
        {
            title: 'Guests on their phones, vendors on theirs',
            art: 'devices',
            body: [
                'Guests RSVP from the invitation\'s QR code in one thumb-scroll, and check the parking details from the car. Vendors pull up the run-of-show backstage on the same link they got last week.',
                'Everything built here is phone-first because on the day, nobody is at a desk, including you.',
            ],
        },
        {
            title: 'Change freely, even the week of',
            art: 'history',
            body: [
                'The string quartet cancels, the ceremony moves an hour, the menu loses the fish. Say the change and it is live everywhere at once, verified before it lands.',
                'Every version is snapshotted, so even a frantic Thursday-night edit can be rolled back calmly on Friday morning.',
            ],
        },
    ],

    promptsHeading: 'Prompts for the next event on your books',
    prompts: [
        {
            title: 'Wedding website',
            body: 'The details, the story, and RSVPs with meal choices.',
            prompt:
                'Build a wedding website for Nadia and Omar, September 14 at the Meridian Estate. Sections: their names and date in an elegant serif treatment, their story in a short paragraph, the schedule (ceremony 4:00, cocktails 5:00, dinner and dancing from 6:30), venue with a map section and parking notes, dress code, and an RSVP form (name, attending or regrets, number of guests, meal choice of beef, salmon, or vegetarian, dietary notes) that saves responses and shows the couple a private tally. Romantic, editorial design, phone-first.',
        },
        {
            title: 'Vendor tracker',
            body: 'Contracts, deposits, and day-of contacts per event.',
            prompt:
                'Build a vendor tracker for my event planning business. I create events, then add vendors to each with a category (venue, catering, florals, music, photo, rentals), contact person and phone, contract status (inquiring, quoted, booked, paid), deposit amount and due date, and notes. Show me a per-event board grouped by category, anything with a deposit due in the next 14 days highlighted, and a printable day-of contact sheet per event. Save it all to my Puter account.',
        },
        {
            title: 'Run-of-show timeline',
            body: 'The minute-by-minute, shared at one link.',
            prompt:
                'Build a run-of-show tool for events. I sign in and build a timeline of cues, each with a time, duration, what happens, who owns it, and a location, and I can insert and reorder cues easily. The published page shows the timeline in a clean readable schedule with a "now and next" section based on the current time. Let me duplicate a whole timeline as the starting point for the next event. Store everything in my Puter account.',
        },
        {
            title: 'Planner portfolio site',
            body: 'Past events, services, and an inquiry form that qualifies.',
            prompt:
                'Build a portfolio website for my event planning studio. Sections: a refined hero with my studio name and one line of positioning, a portfolio of past events each with a photo area, the brief, and one standout detail, services (full planning, partial planning, day-of coordination) with starting prices, kind words from clients, an about section, and an inquiry form (event type, date, venue if known, guest count, budget range) that saves submissions for me. Polished, editorial design that photographs well in a screenshot.',
        },
    ],

    faqHeading: 'What planners want to know',
    faq: [
        {
            q: 'Do I really make a new site for every event?',
            a: [
                'Yes, and it stops sounding extravagant once a site takes twenty minutes: duplicate a past event\'s project, swap the names, dates, and palette, and publish. Each event gets its own address, and unpublishing after the thank-you notes is one click.',
            ],
        },
        {
            q: 'Do guests need accounts to RSVP?',
            a: [
                'No. RSVP forms are open pages: guests tap the link from the invitation, answer, and are done in under a minute. Accounts only enter the picture for your own tools, like the vendor tracker, where your business data should sit behind your login.',
            ],
        },
        {
            q: 'Is the guest list private?',
            a: [
                'Responses save privately under the account that owns the event site; the public page shows the event, never the list. Share the tally with the couple or the caterer as an export, on your terms. Treat guest data with the discretion your clients hired you for, and this setup will not get in the way.',
            ],
        },
        {
            q: 'Can I charge clients for this?',
            a: [
                'Planners do: the event site and RSVP handling become a line item or a differentiator in your package, and since building and hosting cost you nothing, it is pure margin and pure polish. The site is your work product; price it like the rest of your taste.',
            ],
        },
    ],

    ctaHeading: 'Describe the next event on your calendar',
    ctaBody: 'You have written the brief already. Paste it in and watch the site appear.',

    related: ['for', 'for/musicians', 'for/restaurants', 'what-to-build'],
});
