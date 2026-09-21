import { verticalPage } from '../verticals.js';

export default verticalPage({
    slug: 'real-estate-agents',
    navLabel: 'Real estate agents',

    title: 'Website and App Builder for Real Estate Agents | Puter',
    description:
        'Listing sites, open house sign-in apps, lead trackers, and neighborhood guides for agents. Describe what you need and it is built, verified, and published free.',
    ogTagline: 'Your listings, your leads, your link',

    eyebrow: 'For real estate agents',
    h1: 'Every listing deserves its own link',
    lead:
        'The brokerage site buries your listings three menus deep, and the portals sell the leads your work generated. Describe the site or tool you want, in plain English, and get one you own: a listing page, an open house sign-in, a lead tracker that is actually yours.',

    demo: {
        prompt: 'Build a listing site with an open house sign-in page for my buyers',
        app: {
            name: 'homesbyleah.puter.site',
            header: 'Listings',
            blocks: [
                {
                    kind: 'stats',
                    items: [
                        { value: '14', label: 'Active listings' },
                        { value: '9', label: 'Showings this week' },
                        { value: '32', label: 'New leads' },
                    ],
                },
                {
                    kind: 'list',
                    rows: [
                        { title: '42 Cedar Lane', sub: '4 bd · Open Sun 1:00', tag: 'Live' },
                        { title: '118 Fox Run', sub: '3 bd · Offer review', tag: 'Pending' },
                        { title: '7 Marsh Court', sub: '2 bd · Photos Tue', tag: 'Soon' },
                    ],
                },
            ],
        },
    },

    useCasesHeading: 'What agents build here',
    useCasesIntro:
        'Tools for the two things the job actually is: making listings look worth a visit, and never letting a lead go cold.',
    useCases: [
        {
            icon: 'home',
            title: 'A single-listing site',
            body:
                'One property, one beautiful page: photos, the details that sell it, the open house time, and a contact form. A link worth printing on the yard sign.',
        },
        {
            icon: 'pen',
            title: 'Open house sign-in',
            body:
                'A tablet-friendly sign-in that captures name, contact, and whether they have an agent, straight into your lead list instead of a clipboard you retype at midnight.',
        },
        {
            icon: 'users',
            title: 'A lead tracker that is yours',
            body:
                'Every inquiry with its source, stage, and next follow-up date, on one board. Not rented from a portal that sells the same buyer to three other agents.',
        },
        {
            icon: 'mapPin',
            title: 'Neighborhood guides',
            body:
                'The schools, the coffee, the commute: pages that answer what buyers actually search, with your name and number on every one of them.',
        },
        {
            icon: 'calculator',
            title: 'Buyer calculators',
            body:
                'Monthly payment and closing cost estimators that keep buyers on your page instead of a portal\'s, and end with a button that books a call with you.',
        },
        {
            icon: 'layout',
            title: 'Your own agent site',
            body:
                'Sold results, current listings, what working with you is like, and a way to reach you that is not a brokerage switchboard. Live the afternoon you describe it.',
        },
    ],

    splitHeading: 'From "I need a page for this listing" to a live link',
    splits: [
        {
            title: 'Describe the listing page over your morning coffee',
            art: 'describe',
            body: [
                '"A page for a four-bed colonial at 42 Cedar Lane: hero photo, gallery, the highlights, open house this Sunday at 1:00, and a form for private showings." Send that, and watch the page assemble in the live preview.',
                'Swap in your photos, adjust the copy by clicking on it and saying what to change, and it is ready before your first showing.',
            ],
        },
        {
            title: 'Built for the phone in the buyer\'s hand',
            art: 'devices',
            body: [
                'Buyers open listing links standing in front of the house. Everything built here is phone-first by default, loads instantly, and can be saved to a home screen like an app.',
                'The open house sign-in runs full-screen on the tablet by the door, and every entry lands in the same lead list you check from your car.',
            ],
        },
        {
            title: 'Publish now, repoint later',
            art: 'publish',
            body: [
                'One click puts the page at its own address to text, post, and print on flyers. Each listing can have its own link, and taking a sold listing down is one click too.',
                'It is all standard web files underneath: download the zip and host under your own domain whenever you want.',
            ],
        },
    ],

    promptsHeading: 'Prompts that are ready to show',
    prompts: [
        {
            title: 'Single-listing page',
            body: 'One property, sold properly, with a showing request form.',
            prompt:
                'Build a single-property listing page for a 4 bedroom, 2.5 bath colonial at 42 Cedar Lane: a large hero section, a photo gallery I can add images to, key details (price, beds, baths, square footage, lot, year built), a highlights list, an open house banner with date and time, a map section, and a private showing request form that saves submissions for me. Elegant, phone-first design.',
        },
        {
            title: 'Open house sign-in',
            body: 'Tablet sign-in flowing straight into a lead list.',
            prompt:
                'Build an open house sign-in app. Full-screen tablet mode shows the property address and a short form: name, phone, email, are they working with an agent, and how did they hear about it. Each entry saves with a timestamp. A private dashboard I sign into lists all sign-ins by property and date and exports to CSV. Store everything in my Puter account.',
        },
        {
            title: 'Lead pipeline board',
            body: 'Sources, stages, and the next follow-up, never dropped.',
            prompt:
                'Build a lead tracker for a real estate agent. I add leads with a name, contact, source (open house, referral, sign call, portal), budget range, and areas of interest, then move them across a board: New, Contacted, Touring, Offer, Closed, Lost. Each lead has a notes timeline and a next follow-up date, with anything overdue highlighted on a dashboard. Save it to my Puter account.',
        },
        {
            title: 'Neighborhood guide',
            body: 'The local page buyers search for, with your name on it.',
            prompt:
                'Build a neighborhood guide page for the Maplewood district: an overview of who it suits, sections on schools, commute options, parks, and favorite local spots, a gallery I can add photos to, and a "thinking of buying or selling here" section with my details and a contact form that saves inquiries. Warm, editorial design that reads like a magazine feature.',
        },
    ],

    faqHeading: 'What agents want to know',
    faq: [
        {
            q: 'Can every listing really have its own page?',
            a: [
                'Yes. You can build one listing-site app that holds all your properties, or spin up a dedicated page per listing in a few minutes each; agents do both. Each published app gets its own address, and unpublishing a sold property is one click.',
            ],
        },
        {
            q: 'Do the leads belong to me?',
            a: [
                'Entirely. Sign-ins and form submissions save to storage under your Puter account. No portal sits between you and the buyer, no one else is sold the same lead, and you can export everything to CSV whenever you like.',
            ],
        },
        {
            q: 'I am not technical and I have showings all weekend. How long does this take?',
            a: [
                'A first working version of a listing page or sign-in app typically appears within minutes of the description. Refining it is conversational: click the thing you want changed in the preview and say what should be different. It is designed to fit between appointments.',
            ],
        },
        {
            q: 'Does this comply with my brokerage\'s advertising rules?',
            a: [
                'The builder gives you full control of the page, so include whatever your brokerage and state require: brokerage name, license numbers, fair housing notices. Tell the builder the required disclosures in your prompt and they become part of the design rather than an afterthought.',
            ],
        },
    ],

    ctaHeading: 'Give your next listing its own link',
    ctaBody: 'Describe the property the way you would to a buyer, and see the page built in front of you.',

    related: ['for', 'for/photographers', 'for/lawyers', 'what-to-build'],
});
