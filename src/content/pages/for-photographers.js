import { verticalPage } from '../verticals.js';

export default verticalPage({
    slug: 'photographers',
    navLabel: 'Photographers',

    title: 'Website and App Builder for Photographers | Puter',
    description:
        'Portfolio sites, client proofing galleries, booking forms, and pricing pages for photographers. Describe them in plain English and publish free, no code needed.',
    ogTagline: 'Show the work. Skip the website week.',

    eyebrow: 'For photographers',
    h1: 'You shot the work. Showing it should be the easy part.',
    lead:
        'Portfolio platforms charge monthly rent to put your images in their template, and proofing tools charge again per gallery. Describe the site or tool you want and get one you own: a portfolio in your style, galleries clients can pick from, a booking flow that fills the calendar.',

    demo: {
        prompt: 'Build a portfolio site with a gallery per shoot and a booking inquiry form',
        app: {
            name: 'lumenfoto.puter.site',
            header: 'Studio',
            blocks: [
                {
                    kind: 'stats',
                    items: [
                        { value: '9', label: 'Live galleries' },
                        { value: '3', label: 'Bookings this month' },
                        { value: '62', label: 'Client selects' },
                    ],
                },
                {
                    kind: 'list',
                    rows: [
                        { title: 'Nadia & Omar', sub: 'Wedding · 84 selects', tag: 'Proofing' },
                        { title: 'Aster Studio', sub: 'Brand shoot · editing', tag: 'In edit' },
                        { title: 'Meissner family', sub: 'Inquiry · Sat golden hour', tag: 'New' },
                    ],
                },
            ],
        },
    },

    useCasesHeading: 'What photographers build here',
    useCasesIntro:
        'Everything around the photographs: the showing, the choosing, the booking, and the quoting.',
    useCases: [
        {
            icon: 'camera',
            title: 'A portfolio that fits your eye',
            body:
                'Full-bleed, grid, film-strip, one project per page: describe the presentation you want instead of settling for the closest template. Your images set the mood; the site stays out of the way.',
        },
        {
            icon: 'eye',
            title: 'Client proofing galleries',
            body:
                'A private gallery per shoot where the client marks selects and leaves notes per frame. You see their picks in one list instead of a screenshot collage over text.',
        },
        {
            icon: 'mail',
            title: 'A booking inquiry flow',
            body:
                'Date, location, shoot type, budget range: inquiries arrive with everything you need to quote, saved in one place, instead of a four-email warm-up.',
        },
        {
            icon: 'receipt',
            title: 'Packages and pricing pages',
            body:
                'Your offerings laid out clearly enough that the wrong-budget inquiries filter themselves out, which is the polite way to protect your calendar.',
        },
        {
            icon: 'calendar',
            title: 'A shoot planner',
            body:
                'Shot lists, timelines, and locations per booking, shareable with the client so the day runs to your plan. Golden hour does not wait for scrolling through notes.',
        },
        {
            icon: 'zap',
            title: 'Mini-sites per event',
            body:
                'A wedding gets its own page: schedule, gallery link when ready, and a place for guests to drop their phone shots. A small touch clients remember and mention.',
        },
    ],

    splitHeading: 'Your portfolio, on your terms',
    splits: [
        {
            title: 'Direct it like a shoot',
            art: 'describe',
            body: [
                'You already know how to articulate a look: "dark, editorial, lots of negative space, images do the talking". That sentence is a design brief the builder can execute.',
                'Then refine by pointing: click the element that feels off in the live preview and say what is wrong with it, the way you would direct a retoucher.',
            ],
        },
        {
            title: 'Sharp on the screens clients actually use',
            art: 'devices',
            body: [
                'Couples shortlist photographers on a phone from the sofa. Sites built here are fast and phone-first, so your work is doing the convincing three seconds after the tap.',
                'The proofing gallery works the same way: clients pick selects on whatever screen they have, and their choices land in your dashboard.',
            ],
        },
        {
            title: 'Own the files, including the site itself',
            art: 'files',
            body: [
                'You insist on owning your negatives; the same instinct applies to your website. Everything built here is standard files you can download and host anywhere, under your own domain if you like.',
                'No monthly platform rent, no template license, no export wall between you and your own portfolio.',
            ],
        },
    ],

    promptsHeading: 'Prompts to start from',
    prompts: [
        {
            title: 'Portfolio site',
            body: 'Editorial, image-first, with projects and an about page.',
            prompt:
                'Build a portfolio website for a wedding and portrait photographer. Dark, editorial design where the images dominate: a full-bleed hero, a portfolio grid of projects that each open into their own gallery page, an about section with my portrait and approach, a pricing overview with three packages, and an inquiry form that saves submissions. I will add my own photos, so use elegant placeholders sized for photography.',
        },
        {
            title: 'Client proofing gallery',
            body: 'Private galleries, selects, and per-image notes.',
            prompt:
                'Build a client proofing tool for my photography studio. I sign in, create a gallery per shoot, and upload images to it. Each client gets a private link where they mark favorites, leave a note per image, and submit their final selects. I see each gallery\'s selects and notes in a dashboard and can export the chosen filenames as a list. Store everything in my Puter account.',
        },
        {
            title: 'Booking inquiry flow',
            body: 'Structured inquiries you can quote from immediately.',
            prompt:
                'Build a booking inquiry page for my photography business. The form asks for shoot type (wedding, portrait, brand), preferred date and location, estimated budget range, and how they found me, plus a message. Submissions save to a private dashboard where I mark each as new, quoted, booked, or declined, and see upcoming booked shoots sorted by date. Save it all to my Puter account.',
        },
        {
            title: 'Wedding day mini-site',
            body: 'One page per wedding: schedule, gallery, guest uploads.',
            prompt:
                'Build a single wedding mini-site for Nadia and Omar, September 14. Sections: their names and date in a beautiful serif treatment, the day\'s schedule, the venue with a map section, a gallery section I will fill after the shoot, and a guest photo wall where guests can upload their phone pictures with their name. Romantic, editorial design that works perfectly on phones.',
        },
    ],

    faqHeading: 'What photographers ask',
    faq: [
        {
            q: 'Where do my images live, and who owns them?',
            a: [
                'You do, at every layer. Images you add are files in your Puter storage, the site is files you can download as a zip, and nothing is locked to a platform. Delete, move, or rehost any of it whenever you like.',
            ],
        },
        {
            q: 'Can it really match my aesthetic, or will it look generated?',
            a: [
                'Design here is described, not picked from a theme gallery, so the ceiling is your ability to say what you want: reference the mood, the typography, the spacing, the photographers whose sites you admire. Then art-direct the result by clicking on elements and adjusting. The iteration loop is minutes long, so taste wins.',
            ],
        },
        {
            q: 'Is a proofing gallery private?',
            a: [
                'Galleries are as private as the link you share, and the tool can require clients to sign in for tighter control; nothing is listed publicly. For contractual or unreleased work, apply the same judgment you would with any proofing service and share links only with the client.',
            ],
        },
        {
            q: 'What is the catch compared to portfolio platforms?',
            a: [
                'The trade is honest: platforms give you a polished template ecosystem for a monthly fee; this gives you a site you describe, own, and host free on a puter.site address. You give up a template marketplace and gain full control, zero rent, and files you can walk away with.',
            ],
        },
    ],

    ctaHeading: 'Describe the portfolio you keep postponing',
    ctaBody: 'One sentence about your style and your work is enough to see the first version.',

    related: ['for', 'for/real-estate-agents', 'for/restaurants', 'what-to-build'],
});
