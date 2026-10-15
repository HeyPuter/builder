export default {
    slug: 'coffee-shop',
    name: 'Coffee Shop',
    category: 'Website',
    description: 'A neighborhood cafe site with live hours, a menu with cup sizes, a drink finder and beans on the shelf.',
    updated: '2026-10-15',
    workers: [],
    suggestions: [
        {
            label: 'Use my shop\'s details',
            prompt: 'Replace Morrow Coffee\'s name, address, phone, email and opening hours with my coffee shop\'s details. Ask me for them first.',
        },
        {
            label: 'Add an events section',
            prompt: 'Add an events section for latte art nights, cuppings and live music, with dates, times and a way to RSVP by email.',
        },
        {
            label: 'Sell gift cards',
            prompt: 'Add a gift card section where people pick an amount, write a short message and send a gift card to a friend by email.',
        },
        {
            label: 'Try a dark roast palette',
            prompt: 'Give the site a new color palette inspired by a dark roast: deep browns with a copper accent, keeping the same layout and fonts.',
        },
    ],
    instructions: [
        'This is a one-page website for a coffee shop.',
        'The shop details (name, address, phone, email, time zone, order and map links, roast day), opening hours, ticker, parts of the day, menu, beans, amenities, reviews and directions are plain data at the top of app.js. Change content there rather than in the markup, and keep each entry\'s shape: a menu price is a number, or [small, regular] for a drink sold in both cup sizes.',
        'Headlines and section copy are in index.html. Colors and fonts are CSS variables at the top of styles.css.',
        'The open/closed status, today\'s hours, the highlighted part of the day and the next roast are worked out from HOURS in SHOP.timezone, so keep that set to the shop\'s own time zone.',
        'Every FINDER answer must name the id of an item that exists in MENU.',
        'The reviews are samples. When the owner gives real ones, replace them and clear REVIEWS_NOTE. Never present made-up reviews as real.',
        'There is no backend: Order ahead calls the shop unless SHOP.orderUrl is set, Set one aside opens an email, and the Tuesday letter emails the shop unless SHOP.letterEndpoint is set.',
    ].join('\n'),
    page: {
        title: 'Coffee Shop Website Template with Menu, Hours & Beans',
        description: 'A free coffee shop website template with live opening hours, a menu with cup sizes, a drink finder and beans on the shelf. Make it yours by describing changes.',
        ogTagline: 'A cafe site with live hours, a menu and beans on the shelf.',
        features: [
            {
                title: 'Open now, in the shop\'s own time',
                body: 'The header status, today\'s hours and the hours table follow the shop\'s time zone, so every visitor sees whether you are open, closing soon or opening tomorrow.',
            },
            {
                title: 'A menu with cup sizes',
                body: 'Espresso, slow bar, not coffee and pastries in tabs, with tags for house favorites, iced and vegan, and an 8 oz / 12 oz switch that updates every price.',
            },
            {
                title: 'Order like a regular',
                body: 'Three taps (hot or iced, black or milk, gentle or bold) suggest a drink from the menu and jump straight to it.',
            },
            {
                title: 'The day in three parts',
                body: 'Morning, midday and afternoon cards highlight what is on right now, trimmed to each day\'s opening hours.',
            },
            {
                title: 'Beans on the shelf',
                body: 'Label-style cards with origin, process, tasting notes and a roast meter, a countdown to the next roast and a one-tap email to set a bag aside.',
            },
            {
                title: 'Visit, regulars and a newsletter',
                body: 'Address, directions and hours, a stamp card, reviews, and a sign-up that emails the shop or posts to your own mailing list.',
            },
        ],
        faq: [
            {
                q: 'Can I change the menu and prices?',
                a: ['Yes. Ask the builder in plain words, for example "add a pumpkin spice latte at $5.50 small and $6.25 regular". The menu is kept as simple data, so a change lands in one place and shows up everywhere it appears.'],
            },
            {
                q: 'Does it take online orders?',
                a: ['Not on its own. Order ahead calls the shop, or opens the ordering service you already use, like Square or Toast, once you add its link. You can also ask the builder to add an ordering page.'],
            },
            {
                q: 'Are the reviews real?',
                a: ['No. They are samples that show the layout. Replace them with your own customers\' words before you publish, or ask the builder to remove the section.'],
            },
            {
                q: 'Can I use the photos?',
                a: ['Yes. They are public domain (CC0) photos from Wikimedia Commons. To use your own, attach them in the builder and say where they should go.'],
            },
        ],
    },
};
