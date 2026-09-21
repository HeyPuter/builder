import { verticalPage } from '../verticals.js';

export default verticalPage({
    slug: 'nonprofits',
    navLabel: 'Nonprofits',

    title: 'Website Builder for Nonprofits and Charities | Puter',
    description:
        'A nonprofit website with programs, events, and volunteer signups, built from a plain-English description and hosted free. Keep the budget for the mission.',
    ogTagline: 'Keep the budget for the mission',

    eyebrow: 'For nonprofits',
    h1: 'Every dollar on the website is a dollar off the mission',
    lead:
        'Nonprofit websites are built by whoever volunteered, then frozen when they move on. Describe your organization in plain English and get a site anyone on the team can update: programs, events, volunteer signups, and a story donors can actually find.',

    demo: {
        prompt: 'Build a website for our food bank with programs, volunteer shifts, and events',
        app: {
            name: 'harvesthope.puter.site',
            header: 'Harvest Hope',
            blocks: [
                {
                    kind: 'stats',
                    items: [
                        { value: '34', label: 'Volunteers this week' },
                        { value: '3', label: 'Events this month' },
                        { value: '1,240', label: 'Meals last week' },
                    ],
                },
                {
                    kind: 'list',
                    rows: [
                        { title: 'Saturday sort shift', sub: '9:00 · 8 of 12 filled', tag: 'Open' },
                        { title: 'Fall food drive', sub: 'Oct 3 · City Hall', tag: 'Event' },
                        { title: 'Driver run', sub: 'Thu 7:30 · 2 needed', tag: 'Urgent' },
                    ],
                },
            ],
        },
    },

    useCasesHeading: 'What organizations build here',
    useCasesIntro:
        'The public face of a nonprofit runs on the same few pages everywhere. The difference is whether your team can change them without filing a ticket.',
    useCases: [
        {
            icon: 'sprout',
            title: 'A site that explains the mission fast',
            body:
                'Who you serve, what you do about it, and proof it works, stated plainly enough that a first-time visitor understands you in one screen. Clarity is a fundraising strategy.',
        },
        {
            icon: 'users',
            title: 'Volunteer signups that fill shifts',
            body:
                'Real shifts with dates, slots, and a signup form, not an email address and hope. You see who is coming; volunteers see where they are needed most.',
        },
        {
            icon: 'calendar',
            title: 'Event pages with RSVPs',
            body:
                'Each fundraiser, drive, or open day gets its own page with the details and an RSVP count you can plan catering around. Publish it when tickets open, retire it after.',
        },
        {
            icon: 'book',
            title: 'Program pages that stay current',
            body:
                'One page per program, updated by the person who runs it, in a sentence: "move the pantry hours to Tuesday evenings". No webmaster in the loop.',
        },
        {
            icon: 'receipt',
            title: 'Donation pages, honestly wired',
            body:
                'The story, the impact numbers, and a clear button that links to the payment processor you already use. The builder does not touch the money; it makes the case for giving it.',
        },
        {
            icon: 'chart',
            title: 'Impact reports people read',
            body:
                'The annual report as a living web page: the numbers, the stories, the photos, readable on a phone. Costs nothing to print and reaches donors who never open PDFs.',
        },
    ],

    splitHeading: 'A website the whole team can hold',
    splits: [
        {
            title: 'Describe the organization, not the layout',
            art: 'describe',
            body: [
                '"We are a food bank serving two counties. We need our programs, volunteer shifts, an events page, and a donate button that goes to our existing giving page." That paragraph is the whole project scope.',
                'The site builds itself in a live preview, and anyone on staff can review it before it goes anywhere.',
            ],
        },
        {
            title: 'Signups and RSVPs, stored without an IT person',
            art: 'backend',
            body: [
                'Volunteer signups and event RSVPs save to storage under your organization\'s account. There is no plugin to update, no database the board treasurer worries about, and no monthly form-tool fee.',
                'Export the lists whenever you need them for the spreadsheet the rest of the workflow lives in.',
            ],
        },
        {
            title: 'It survives the person who built it',
            art: 'files',
            body: [
                'Every nonprofit has the story: the volunteer who built the site left, and now nobody has the password. Here the site is plain files owned by the organization\'s account, editable by describing changes, and downloadable as a zip at any time.',
                'Institutional memory should not live in one browser\'s saved logins.',
            ],
        },
    ],

    promptsHeading: 'Prompts for the next board meeting',
    prompts: [
        {
            title: 'Organization site',
            body: 'Mission, programs, events, and ways to help.',
            prompt:
                'Build a website for our food bank, Harvest Hope. Sections: a clear mission statement with one strong photo area, what we do in three programs (pantry, meal delivery, community fridge), upcoming events, how to volunteer with a signup form that saves names and emails, a donate section that links to our existing giving page, and contact details with our hours. Warm, hopeful design that is easy to read for all ages.',
        },
        {
            title: 'Volunteer shift board',
            body: 'Shifts with slots, signups, and a coordinator view.',
            prompt:
                'Build a volunteer shift signup tool for our nonprofit. As the coordinator I sign in and create shifts with a date, time, role, location, and number of slots. The public page lists upcoming shifts with open slots, and volunteers sign up with a name, email, and phone. Full shifts close automatically. I see a roster per shift, can remove a signup, and export the week as CSV. Store everything in our Puter account.',
        },
        {
            title: 'Fundraiser event page',
            body: 'One event, its story, and an RSVP count you can plan on.',
            prompt:
                'Build an event page for our annual harvest dinner fundraiser on October 3. Sections: the story of what the dinner supports, date, time, and venue with a map section, the evening\'s schedule, a suggested donation note linking to our existing giving page, and an RSVP form (name, email, number of guests, dietary notes) that saves responses and shows me a private total headcount. Elegant, festive design.',
        },
        {
            title: 'Impact report page',
            body: 'The annual report as a page donors actually read.',
            prompt:
                'Build an annual impact report page for our nonprofit. Sections: a headline with the year\'s single most important number, our mission in one line, four key statistics with short explanations, two program highlights told as brief stories with photo areas, a financial transparency section with a simple expenses breakdown I can edit, thank-yous to partners, and a closing call to volunteer or give. Clean, credible design that prints decently too.',
        },
    ],

    faqHeading: 'What boards and coordinators ask',
    faq: [
        {
            q: 'Can it take donations directly?',
            a: [
                'No, and treat that as a feature: the builder never handles your donors\' payment details. Your donate button links to the processor you already trust, and the site\'s job is the part that actually raises the money: the story, the numbers, and the ask.',
            ],
        },
        {
            q: 'We have no technical staff, and our volunteers rotate. Who maintains this?',
            a: [
                'Whoever can write a sentence. Updates are requests in plain English ("add the winter coat drive to events"), every change is verified before it lands, and every version is kept, so an enthusiastic volunteer cannot permanently break anything.',
            ],
        },
        {
            q: 'Is free really free, or is there a catch a treasurer should know about?',
            a: [
                'Building, publishing, and hosting on a puter.site address cost nothing, with no card on file. Very heavy storage use can hit the free account\'s limits, which matters to almost no nonprofit website. The honest catch is only that your address ends in puter.site unless you download the files and host them on your own domain.',
            ],
        },
        {
            q: 'Where does volunteer and RSVP information live?',
            a: [
                'In storage under your organization\'s own Puter account, not on a public page and not in a third-party form tool\'s database. Publishing the site does not publish the signups. Treat contact lists with the same care you already do, and export them only to places your organization controls.',
            ],
        },
    ],

    ctaHeading: 'Describe your organization and what it needs',
    ctaBody: 'The mission statement you already have is most of the prompt.',

    related: ['for', 'for/therapists', 'for/tutors', 'what-to-build'],
});
