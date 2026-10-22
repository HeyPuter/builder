export default {
    slug: 'restaurant',
    name: 'Restaurant',
    category: 'Website',
    description: 'A full-service restaurant site with menus, live hours, table booking, private dining and gift cards.',
    updated: '2026-10-15',
    workers: [],
    suggestions: [
        {
            label: 'Make it my restaurant',
            prompt: 'Change the restaurant name, address, phone, hours and menus to mine: ',
        },
        {
            label: 'Save bookings for staff',
            prompt: 'Store every reservation request in a backend and add a password-protected page where staff can see the day\'s bookings and confirm or cancel them.',
        },
        {
            label: 'Add an events calendar',
            prompt: 'Add an events section for wine dinners and holiday menus, each with a date, price per guest, seats left and a button that books it.',
        },
        {
            label: 'Sell gift cards online',
            prompt: 'Let guests pay for gift cards online by card, choosing the amount, the recipient\'s name and a personal message.',
        },
        {
            label: 'Add a Spanish version',
            prompt: 'Add a language switcher with Spanish translations of the menus, hours, booking form and every heading.',
        },
    ],
    instructions: [
        '- The restaurant\'s details, hours, menus, specials, seating and private rooms are plain data at the top of app.js (CONFIG, HOURS, CLOSED_DATES, SEATING, SPECIALS, DIETS, MENUS, ROOMS). Change content there rather than writing it into index.html, and keep each kind of content in one place.',
        '- HOURS drives the open-now status, the hours table, the footer hours, the bookable dates and the table times. Change opening hours only in HOURS and CLOSED_DATES.',
        '- Bookings, private dining enquiries, gift cards and newsletter sign-ups go through sendRequest(): POSTed as JSON to CONFIG.formEndpoint when it is set, otherwise opened as an email to CONFIG.email. They are requests the restaurant confirms. Never tell a guest a table is confirmed unless a real backend has accepted it.',
        '- Keep menus as real text with prices and dietary tags, never images or PDFs, so they stay readable on phones and by search engines.',
        '- Parties larger than CONFIG.maxPartyOnline are sent to private dining. Keep that route when changing the booking form.',
        '- Colors, fonts and spacing are CSS variables in :root in styles.css. Change the palette there, and keep the theme-color meta tag and icon.svg matching the main color.',
    ].join('\n'),
    page: {
        title: 'Restaurant Website Template with Table Booking',
        description: 'A restaurant website template with menus as text, live opening hours, a table booking form, private dining enquiries and gift cards. Copy it and make it yours.',
        ogTagline: 'Menus, hours and bookings, ready for service',
        features: [
            {
                title: 'Menus guests can read',
                body: 'Dinner, brunch, bar and dessert menus as real text with prices, dietary tags and filters for vegetarian, vegan and gluten-free. No PDFs to pinch and zoom.',
            },
            {
                title: 'Hours that know the time',
                body: 'Set opening hours once for each service. The site shows whether you are open right now, highlights today, and skips holidays you have marked closed.',
            },
            {
                title: 'Table booking',
                body: 'Guests pick a party size, a date, where to sit and a time from slots worked out from your hours, then send the request with an add-to-calendar file.',
            },
            {
                title: 'Private dining and events',
                body: 'Rooms with photos, capacities and minimum spend, and an enquiry form. Bigger groups are steered here instead of the regular booking form.',
            },
            {
                title: 'Tonight\'s specials',
                body: 'A dated card of tonight\'s specials beside the menus, next to the chef\'s tasting menu, so regulars see what is new before they book.',
            },
            {
                title: 'Gift cards and a newsletter',
                body: 'Request a gift card in a few taps and join a monthly letter. Requests go to your inbox or to a form service of your choice.',
            },
        ],
        faq: [
            {
                q: 'Does the booking form connect to OpenTable or Resy?',
                a: [
                    'Not out of the box. Requests arrive by email, or at a form service if you add its address. Ask the builder to link your OpenTable, Resy or Tock page instead, or to store bookings in a dashboard for your staff.',
                ],
            },
            {
                q: 'How do I change the menu and the opening hours?',
                a: [
                    'Describe the change in plain language, such as "add a lamb shoulder for $34 to the hearth section" or "we now open at 4 pm on Fridays". The menus, hours and booking times all update from one place.',
                ],
            },
            {
                q: 'Can I use my own photos?',
                a: [
                    'Yes. Attach your photos in the chat and say where they go. The included photos are public domain, so you can also keep them.',
                ],
            },
        ],
    },
};
