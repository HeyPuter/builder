import { verticalPage } from '../verticals.js';

export default verticalPage({
    slug: 'salons',
    navLabel: 'Salons',

    title: 'Website Builder for Salons and Barbershops | Puter',
    description:
        'A salon website with your services, prices, stylists, and booking requests, described in plain English and published free. Update it from your phone between clients.',
    ogTagline: 'Updated between clients',

    eyebrow: 'For salons',
    h1: 'A salon site as sharp as the work in your chair',
    lead:
        'Your Instagram shows the work, but it cannot hold a price list, your hours, or a booking request. Describe your salon in plain English and get a site that does all three, matches your look, and takes thirty seconds to update when a price changes.',

    demo: {
        prompt: 'Build a site for my salon with services, prices, and booking requests',
        app: {
            name: 'goldcomb.puter.site',
            header: 'Gold Comb Studio',
            blocks: [
                {
                    kind: 'stats',
                    items: [
                        { value: '12', label: 'Requests today' },
                        { value: '5', label: 'Openings Friday' },
                        { value: '2', label: 'New reviews' },
                    ],
                },
                {
                    kind: 'list',
                    rows: [
                        { title: 'Cut and finish', sub: '45 min · 38', tag: '' },
                        { title: 'Balayage', sub: '2.5 hr · 140', tag: 'Popular' },
                        { title: 'Beard trim', sub: '20 min · 18', tag: '' },
                    ],
                },
            ],
        },
    },

    useCasesHeading: 'What salons and barbershops build here',
    useCasesIntro:
        'Clients decide with their eyes and book with their thumbs. Everything below is built for that, in your salon\'s own style.',
    useCases: [
        {
            icon: 'receipt',
            title: 'A price list that is never out of date',
            body:
                'Services, times, and prices, changed by you in a sentence the day they change. No more "the website says 30" conversations at the register.',
        },
        {
            icon: 'calendar',
            title: 'Booking requests without the phone tag',
            body:
                'Clients pick a service, a preferred day and time, and a stylist, and the request lands in your list to confirm by text. You stay in control of the book.',
        },
        {
            icon: 'users',
            title: 'A page per stylist',
            body:
                'Each chair gets a face, a specialty, and their own gallery, so new clients can ask for the right person instead of "whoever is free".',
        },
        {
            icon: 'scissors',
            title: 'A gallery that sells the chair',
            body:
                'Your best cuts and colors, organized by service, photographed on the phone you already hold all day. The site equivalent of the mirror-selfie wall, but yours.',
        },
        {
            icon: 'bell',
            title: 'A last-minute openings board',
            body:
                'A cancellation at 2:00 becomes a filled chair at 3:00: post the opening, share the link to your story, first request takes it.',
        },
        {
            icon: 'link',
            title: 'A link-in-bio that is actually yours',
            body:
                'One page with your booking request, price list, location, and hours, at your own address instead of a link tool\'s, styled like your salon rather than a list of buttons.',
        },
    ],

    splitHeading: 'Your look, your book, your link',
    splits: [
        {
            title: 'Describe the salon like a mood board',
            art: 'describe',
            body: [
                '"Warm minimal barbershop, black and brass, moody photos, prices in whole numbers, tone confident but friendly." The builder reads a brief like that the way a good stylist reads a reference photo.',
                'The first version appears in minutes, with your services and hours already in place.',
            ],
        },
        {
            title: 'Style it by pointing, like a consultation',
            art: 'picker',
            body: [
                'Click the thing that feels off in the live preview and say what you want: softer, bolder, more space, less beige. Or adjust color and type directly on the element and apply it when it looks right.',
                'A salon\'s site is part of its finish work. This is the tool that lets you obsess over it without a designer\'s hourly rate.',
            ],
        },
        {
            title: 'Live in the bio before your next client sits down',
            art: 'publish',
            body: [
                'Publish to your own address in one click and drop the link in your Instagram bio, your Google profile, and your booking confirmations.',
                'The whole site is yours to download as ordinary files, so if you ever move it to your own domain, it moves with you.',
            ],
        },
    ],

    promptsHeading: 'Prompts to try before your next appointment',
    prompts: [
        {
            title: 'Salon website',
            body: 'Services, prices, stylists, gallery, and requests.',
            prompt:
                'Build a website for my salon, Gold Comb Studio. Sections: a striking hero with our name and one line about the vibe, a full price list grouped by cuts, color, and treatments with times and prices, our three stylists each with a photo area, specialty, and short bio, a gallery of work I can add photos to, our hours and location with a map section, and a booking request form (service, preferred stylist, preferred day and time, name, phone) that saves requests for me. Warm minimal design, black and brass accents, phone-first.',
        },
        {
            title: 'Booking request manager',
            body: 'Requests in, confirmations out, no double phone tag.',
            prompt:
                'Build a booking request manager for my barbershop. Requests arrive with a service, preferred barber, preferred day and time, name, and phone number. I sign in to see new requests newest first, mark each as confirmed, rescheduled, or declined, and add a note with the final time. Show me today\'s confirmed appointments in time order and a per-barber view. Save everything to my Puter account.',
        },
        {
            title: 'Openings board',
            body: 'Turn cancellations into filled chairs the same day.',
            prompt:
                'Build a last-minute openings page for my salon. I sign in and post open slots with a service, stylist, time today or tomorrow, and an optional discounted price. The public page shows current openings and lets a client claim one with their name and phone, which removes it from the list and notifies my dashboard. Expired slots disappear automatically. Store everything in my Puter account.',
        },
        {
            title: 'Stylist portfolio page',
            body: 'One chair, one page: work, specialty, request button.',
            prompt:
                'Build a portfolio page for a single stylist. Sections: name and specialty (lived-in color and balayage), a short bio in the first person, a gallery grid I can add photos to, a price list for their services, and a "request an appointment" form (preferred day and time, name, phone) whose submissions save privately. Editorial, fashion-forward design with big images and generous whitespace.',
        },
    ],

    faqHeading: 'Asked from behind the chair',
    faq: [
        {
            q: 'Can clients book straight into my calendar?',
            a: [
                'They send a request with the service and their preferred time, and you confirm it, which most small salons prefer: the book stays under your control and no software double-stacks your Saturday. If you use a booking platform you like, the site links straight to it instead.',
            ],
        },
        {
            q: 'Is my Instagram not enough?',
            a: [
                'Instagram is your gallery; it is a bad price list, a worse booking form, and it belongs to an algorithm. The site holds the boring, decisive information (prices, hours, location, requests) at a link you own, and your bio points to it. The two do different jobs.',
            ],
        },
        {
            q: 'I change prices and hours a lot. How painful is updating?',
            a: [
                'A sentence per change: "raise the skin fade to 42" or "closed the first Monday of the month". The change is made, checked, and live in about a minute, from your phone, between clients. That is the entire maintenance story.',
            ],
        },
        {
            q: 'What does this cost the shop?',
            a: [
                'Nothing: building, publishing, and hosting on a puter.site address are free with a Puter account, and there is no booking-platform commission taking a cut of every appointment. For a shop that lives on margins per chair, the zero matters.',
            ],
        },
    ],

    ctaHeading: 'Describe your salon\'s look and your price list',
    ctaBody: 'Bring the vibe and the numbers. The site shows up styled to match.',

    related: ['for', 'for/photographers', 'for/restaurants', 'what-to-build'],
});
