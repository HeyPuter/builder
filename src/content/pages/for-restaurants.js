import { verticalPage } from '../verticals.js';

export default verticalPage({
    slug: 'restaurants',
    navLabel: 'Restaurants',

    title: 'Website Builder for Restaurants and Cafes | Puter',
    description:
        'A restaurant website you can update yourself: menu, hours, specials, and reservation requests. Describe your place in plain English and it is live for free.',
    ogTagline: 'A site you update between rushes',

    eyebrow: 'For restaurants',
    h1: 'Change the menu without calling anyone',
    lead:
        'Your hours changed months ago and the site still lies about them, because updating it means emailing the person who built it. Describe your place in plain English and get a fast, handsome site you can change yourself, from your phone, between rushes.',

    demo: {
        prompt: 'Build a website for my cafe with the menu, hours, and a specials board',
        app: {
            name: 'petitfour.puter.site',
            header: 'Petit Four',
            blocks: [
                {
                    kind: 'stats',
                    items: [
                        { value: 'Open', label: 'Until 15:00 today' },
                        { value: '12', label: 'Reservation requests' },
                        { value: '3', label: 'Specials today' },
                    ],
                },
                {
                    kind: 'list',
                    rows: [
                        { title: 'Almond croissant', sub: 'Pastry · 4.50', tag: 'Popular' },
                        { title: 'Shakshuka', sub: 'Brunch · 12.00', tag: '' },
                        { title: 'Plum galette', sub: 'Special · 6.00', tag: 'Today' },
                    ],
                },
            ],
        },
    },

    useCasesHeading: 'What a restaurant actually needs online',
    useCasesIntro:
        'Nobody reads restaurant websites for fun. They want the menu, the hours, the address, and a table, in that order, on a phone, fast.',
    useCases: [
        {
            icon: 'utensils',
            title: 'A menu that is always current',
            body:
                'Edit a dish, a price, or the whole seasonal menu yourself, and the change is live in seconds. The PDF menu that requires a pinch-zoom dies here.',
        },
        {
            icon: 'star',
            title: 'A specials board',
            body:
                'Today\'s specials, updated from your phone during prep. Regulars check it before they walk over, which is exactly the habit you want them to have.',
        },
        {
            icon: 'calendar',
            title: 'Reservation requests',
            body:
                'A simple request form with party size, date, and time that lands in a list you confirm by text or call. No per-cover fee taken off your margin.',
        },
        {
            icon: 'mapPin',
            title: 'Hours and directions that tell the truth',
            body:
                'Holiday hours, kitchen-closes-early nights, the parking situation: the details that prevent the one-star "they were closed" review.',
        },
        {
            icon: 'link',
            title: 'A QR menu that is your site',
            body:
                'The code on the table opens your real menu page, not a third-party app demanding a download. Fast to load on restaurant wifi, readable in dim light.',
        },
        {
            icon: 'users',
            title: 'Staff tools in the back',
            body:
                'A shift schedule, an 86 board, a prep checklist: small internal apps your team opens on their phones, built from a sentence each.',
        },
    ],

    splitHeading: 'Describe your place, get your site',
    splits: [
        {
            title: 'Say it like you would to a regular',
            art: 'describe',
            body: [
                '"A neighborhood cafe, sourdough and pastry in the morning, brunch on weekends, warm and unfussy, here is the menu." That is the whole brief.',
                'The site takes shape in a live preview while you watch, with your sections, your dishes, and your voice, not a template\'s idea of a bistro.',
            ],
        },
        {
            title: 'Designed for the phone at the table',
            art: 'devices',
            body: [
                'Almost everyone who opens your site is on a phone, often standing outside or sitting at the table. Pages built here load instantly, put the menu one tap away, and make the address and hours impossible to miss.',
                'The same site works as the QR menu, so there is one thing to keep current instead of three.',
            ],
        },
        {
            title: 'Live today, changed by you tomorrow',
            art: 'publish',
            body: [
                'Publish to a real URL in one click and put it in your bio, your window sticker, and your table cards.',
                'When the menu changes, open the builder and say so: "replace the plum galette with a pear tart at 6.50". No developer, no invoice, no waiting.',
            ],
        },
    ],

    promptsHeading: 'Start with your menu in hand',
    prompts: [
        {
            title: 'Cafe website',
            body: 'Menu, hours, story, and location, warm and fast.',
            prompt:
                'Build a website for my neighborhood cafe, Petit Four. Sections: a warm hero with our name and one line about us, the menu grouped into pastry, brunch, and drinks with prices, our hours including weekend brunch times, our address with a map section, a short story about the bakery, and our Instagram link. Cozy, editorial design, phone-first, and easy for me to update dishes and prices.',
        },
        {
            title: 'Specials board',
            body: 'Update the day\'s specials from your phone during prep.',
            prompt:
                'Build a daily specials board for my restaurant. A private editor page where I sign in and add today\'s specials with a name, short description, and price, and a public page that displays them beautifully with today\'s date. Old specials archive automatically at the end of the day. Make the public page work great as a QR code target on phones.',
        },
        {
            title: 'Reservation requests',
            body: 'Party size, date, time, and a list you confirm from.',
            prompt:
                'Build a reservation request page for my restaurant. Guests pick a date, a time from our service windows (lunch 12:00 to 14:30, dinner 18:00 to 22:00), party size up to 8, and leave a name, phone number, and optional note. Requests save to a private dashboard where I mark each as confirmed or declined and see tonight\'s confirmed list in time order. Save everything to my Puter account.',
        },
        {
            title: 'Staff shift schedule',
            body: 'The week\'s shifts, visible to the whole team.',
            prompt:
                'Build a staff schedule app for my cafe. I sign in as the manager, add staff members, and assign shifts on a weekly grid (open, mid, close) per day. The published page shows the current week\'s schedule so staff can check it from their phones, and I can copy a week forward and swap two people\'s shifts easily. Keep all data in my Puter account.',
        },
    ],

    faqHeading: 'Asked from behind the counter',
    faq: [
        {
            q: 'Can I really update it myself, or will I need the builder person again?',
            a: [
                'You are the builder person now. Open the project, type "raise the flat white to 4.80 and add a cardamom bun", and the change is made, checked, and live. If you can send a text, you have the entire required skill set.',
            ],
        },
        {
            q: 'Can it take online orders and payments?',
            a: [
                'It does not process payments, so it will not replace your ordering platform. What it replaces is the site around it: menu, hours, specials, reservations, story. If you use an ordering service, the site links straight to it.',
            ],
        },
        {
            q: 'What does the site cost per month?',
            a: [
                'Nothing. Building and hosting on a puter.site address are free with a Puter account. For a business whose margins are counted in single percentage points, a website line item at zero is not a rounding error.',
            ],
        },
        {
            q: 'Will it be fast on phones? Our current site takes forever.',
            a: [
                'Sites built here are plain, lightweight web pages with no bloated theme underneath, so they load in a blink even on a weak signal. That matters twice in a restaurant: once for the person deciding where to eat, and once for the QR menu on your tables.',
            ],
        },
    ],

    ctaHeading: 'Your menu is the prompt',
    ctaBody: 'Paste it in, say what kind of place you run, and watch the site build itself.',

    related: ['for', 'for/photographers', 'for/personal-trainers', 'what-to-build'],
});
