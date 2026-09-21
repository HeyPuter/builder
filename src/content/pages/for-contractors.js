import { verticalPage } from '../verticals.js';

export default verticalPage({
    slug: 'contractors',
    navLabel: 'Contractors',

    title: 'Website and App Builder for Contractors | Puter',
    description:
        'Quote request forms, job photo galleries, and a website that wins local work for contractors and tradespeople. Describe your trade and it is built and live, free.',
    ogTagline: 'Win the job before the site visit',

    eyebrow: 'For contractors',
    h1: 'A contractor site that works while you are on site',
    lead:
        'Agencies quote four figures for five pages about your trade, then charge again every time your phone number changes. Describe your business in plain English instead and get a site that brings in quote requests, shows your work, and costs nothing to run.',

    demo: {
        prompt: 'Build a site for my plumbing business with services and a quote request form',
        app: {
            name: 'reddingplumbing.puter.site',
            header: 'Quote requests',
            blocks: [
                {
                    kind: 'stats',
                    items: [
                        { value: '9', label: 'New requests' },
                        { value: '4', label: 'Quotes sent' },
                        { value: '2', label: 'Jobs booked' },
                    ],
                },
                {
                    kind: 'list',
                    rows: [
                        { title: 'Burst pipe repair', sub: 'Oakdale · this week', tag: 'Urgent' },
                        { title: 'Bathroom refit', sub: 'Marion St · flexible', tag: 'Quote' },
                        { title: 'Water heater swap', sub: 'Callback Tue 8:00', tag: 'Booked' },
                    ],
                },
            ],
        },
    },

    useCasesHeading: 'What tradespeople build here',
    useCasesIntro:
        'A customer with a leak gives your site about ten seconds. Everything below is designed for that ten seconds, and for the paperwork that follows.',
    useCases: [
        {
            icon: 'layout',
            title: 'A site that answers the three questions',
            body:
                'What you do, where you work, and how to reach you, visible without scrolling. Licensed and insured, right up top, because that is the first filter customers apply.',
        },
        {
            icon: 'mail',
            title: 'Quote requests that arrive complete',
            body:
                'Job type, address, photos of the problem, and how soon they need it, in one structured request instead of a voicemail you return from a crawl space.',
        },
        {
            icon: 'camera',
            title: 'Before-and-after galleries',
            body:
                'Your finished jobs, organized by type of work. Nothing sells a bathroom refit like the last bathroom you refitted, photographed on the phone already in your pocket.',
        },
        {
            icon: 'mapPin',
            title: 'A page per service area',
            body:
                'A short page for each town or suburb you cover, describing the work you do there. It is the honest version of local search optimization, and the version that works.',
        },
        {
            icon: 'star',
            title: 'A reviews page you control',
            body:
                'Collect the kind words that currently live in text messages and put them where a customer comparing three plumbers will actually see them.',
        },
        {
            icon: 'calendar',
            title: 'A job board for the crew',
            body:
                'This week\'s jobs, addresses, and who is on them, checkable from the truck. An internal tool, built in an evening, that replaces the whiteboard nobody updates.',
        },
    ],

    splitHeading: 'Built between jobs, not between invoices',
    splits: [
        {
            title: 'Describe the business like you would over the counter',
            art: 'describe',
            body: [
                '"Family plumbing outfit, two vans, emergency callouts and bathroom renovations, serving Redding and the towns around it." That is the whole brief, and the first version of the site exists a few minutes after you send it.',
                'No design meetings, no revisions invoice. Say what is wrong with it and it gets fixed while you watch.',
            ],
        },
        {
            title: 'Your customers are on their phones. So are you.',
            art: 'devices',
            body: [
                'A homeowner with a burst pipe is searching from a phone in a wet hallway. Your site loads instantly, puts the call button under their thumb, and the quote form works one-handed.',
                'You check the request list from the truck, the job board from the supply house, and change your holiday hours from the couch.',
            ],
        },
        {
            title: 'On the side of the van by Friday',
            art: 'publish',
            body: [
                'Publish and the site is live at its own address, ready for the van, the cards, and the yard signs. Change the price list or add a finished job any evening, yourself, in a sentence.',
                'It is standard web files underneath: download the zip and put it on your own domain whenever you are ready.',
            ],
        },
    ],

    promptsHeading: 'Prompts from the trades',
    prompts: [
        {
            title: 'Trade business site',
            body: 'Services, service area, credentials, and a quote form.',
            prompt:
                'Build a website for my plumbing business. Sections: a header with my logo space, phone number, and "licensed and insured", the services I offer (emergency repairs, bathroom renovations, water heaters, drains), the towns I serve, photos of finished work I can add to, three customer reviews I will paste in, and a quote request form (job type, address, description, photos, urgency) that saves submissions for me to review. Bold, trustworthy design that works perfectly on phones.',
        },
        {
            title: 'Quote request tracker',
            body: 'Every inquiry, its status, and who to call back.',
            prompt:
                'Build a quote request tracker for my contracting business. Requests come in with a name, phone, address, job type, and description. I move each one through stages: New, Site visit booked, Quote sent, Won, Lost. Let me add a quote amount and notes per request, see this week\'s site visits in date order, and search past requests by name or street. Save everything to my Puter account.',
        },
        {
            title: 'Before-and-after gallery',
            body: 'Finished jobs by category, uploaded from your phone.',
            prompt:
                'Build a project gallery site for my renovation business. I sign in and add projects with a title, category (kitchen, bathroom, exterior, other), a short description, and before and after photos uploaded from my phone. The public page shows projects in a clean grid filterable by category, each opening into a before-and-after view. Make adding a project from a phone as easy as possible.',
        },
        {
            title: 'Crew job board',
            body: 'The week\'s jobs, addresses, and assignments, from the truck.',
            prompt:
                'Build a weekly job board for my two-crew contracting business. I add jobs with a customer name, address, job description, materials notes, and assign them to Crew A or Crew B on a day of the week. Each crew opens the published page on their phone and sees only the current week in day order, with a tap-to-navigate address link. Let me copy unfinished jobs to next week. Store it in my Puter account.',
        },
    ],

    faqHeading: 'Fair questions from the trades',
    faq: [
        {
            q: 'I type with two fingers. Honestly, can I do this?',
            a: [
                'If you can text a customer, yes. You describe the site the way you would describe a job over the phone, and the building, testing, and publishing happen for you. The two-finger typing is a one-time cost of about three sentences.',
            ],
        },
        {
            q: 'Will this get me found on Google in my area?',
            a: [
                'It gives you the on-site half: a fast site with your services, your towns, and your reviews in plain, crawlable text, which is what local search rewards. The other half is your Google Business Profile, which is free and separate; set that up too and point it at your new site. No honest tool can promise you rankings, and you should be suspicious of the ones that do.',
            ],
        },
        {
            q: 'What does it cost against the agency quote in my inbox?',
            a: [
                'Nothing to build, nothing monthly, free hosting on a puter.site address. The agency quote is buying design meetings and a maintenance retainer; here the maintenance is you typing "add the new water heater brand we install" whenever it comes up.',
            ],
        },
        {
            q: 'Can customers send photos of the job with their request?',
            a: [
                'Yes, and you should ask for them: a photo of the leak sorts an emergency from a someday, and half your quoting happens before the site visit. Photo uploads land in the same request list as everything else.',
            ],
        },
    ],

    ctaHeading: 'Describe your trade and your service area',
    ctaBody: 'Two sentences about the work you do and where you do it. The site takes it from there.',

    related: ['for', 'for/real-estate-agents', 'for/salons', 'what-to-build'],
});
