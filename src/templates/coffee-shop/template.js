export default {
    slug: 'coffee-shop',
    name: 'Coffee Shop',
    category: 'Website',
    description: 'A four-page cafe site with live hours, a chalkboard menu with cup sizes, a drink finder and beans on the shelf.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        {
            label: 'Use my shop\'s details',
            prompt: 'Replace Morrow Coffee\'s name, address, phone, email and opening hours with my coffee shop\'s details. Ask me for them first.',
        },
        {
            label: 'Add an events page',
            prompt: 'Add an Events page for latte art nights, cuppings and live music, with dates, times and a way to RSVP by email, and link it in the menu bar.',
        },
        {
            label: 'Sell gift cards',
            prompt: 'Add a gift card section where people pick an amount, write a short message and send a gift card to a friend by email.',
        },
        {
            label: 'Try a garden palette',
            prompt: 'Give the site a new color palette inspired by a kitchen garden: deep green instead of black, with tomato red buttons. Keep the layout and fonts.',
        },
    ],
    instructions: [
        'This is a four-page website for a coffee shop: index.html (home), menu.html, about.html (our story) and visit.html.',
        'The shop details (name, address, phone, email, time zone, order and map links, form endpoints, roast day), opening hours, parts of the day, menu, beans, amenities, reviews, directions and contact topics are plain data in content.js. Change content there rather than in the markup, and keep each entry\'s shape: a menu price is a number, or [small, regular] for a drink sold in both cup sizes.',
        'app.js is the page code shared by every page. Headlines and copy are in each page\'s HTML, and colors and fonts are CSS variables at the top of styles.css.',
        'Every page repeats the same header and footer, so a change to the menu bar, logo or footer must be made on every page. A new page must copy the same <head> (error snippet first, the Puter runtime tag, fonts, styles.css, content.js and app.js) and be linked from the menu bar and footer on every page.',
        'The open/closed status, today\'s hours, the highlighted part of the day and the next roast are worked out from HOURS in SHOP.timezone, so keep that set to the shop\'s own time zone. Every FINDER answer must name the id of an item that exists in MENU.',
        'The reviews are samples. When the owner gives real ones, replace them and clear REVIEWS_NOTE. Never present made-up reviews as real.',
        'There is no backend: Order ahead calls the shop unless SHOP.orderUrl is set, Set one aside opens an email, and the contact form and Tuesday letter email the shop unless their endpoints are set.',
    ].join('\n'),
    page: {
        title: 'Coffee Shop Website Template with Menu, Hours & Beans',
        description: 'A free coffee shop website template with a home page, chalkboard menu, our story and visit pages, live opening hours and a drink finder. Make it yours with AI.',
        ogTagline: 'A four-page cafe site with live hours and a chalkboard menu.',
        features: [
            {
                title: 'Four pages, one look',
                body: 'Home, Menu, Our story and Visit share a black header with a round hand-drawn logo, hand-lettered headings, coral buttons and photos taped to the page.',
            },
            {
                title: 'Open now, in the shop\'s own time',
                body: 'The status in the header, today\'s hours and the hours list follow the shop\'s time zone, so every visitor sees whether you are open, closing soon or opening tomorrow.',
            },
            {
                title: 'A chalkboard menu with cup sizes',
                body: 'Coffee, not coffee, brunch and bakery on a chalkboard, with tags for house favorites, iced, vegan and GF, and an 8 oz / 12 oz switch that updates every price.',
            },
            {
                title: 'Order like a regular',
                body: 'Three taps (hot or iced, black or milk, gentle or bold) suggest a drink and jump straight to it on the menu.',
            },
            {
                title: 'Beans on the shelf',
                body: 'Kraft-bag cards with origin, process, tasting notes and a roast meter, a countdown to the next roast day and a one-tap email to set a bag aside.',
            },
            {
                title: 'A story page and a contact form',
                body: 'How the shop started, the room and its amenities, a stamp card, and a Visit page with directions and a contact form that emails the shop or posts to your own endpoint.',
            },
        ],
        faq: [
            {
                q: 'Can I change the menu and prices?',
                a: ['Yes. Ask the builder in plain words, for example "add a pumpkin spice latte at $5.50 small and $6.25 regular". The menu is kept as simple data, so a change lands in one place and shows up everywhere it appears.'],
            },
            {
                q: 'Can I add or remove pages?',
                a: ['Yes. Ask for an Events, Catering or Jobs page and the builder adds it with the same header and footer and links it from the menu bar. You can also fold a page into another if you want a smaller site.'],
            },
            {
                q: 'Does it take online orders?',
                a: ['Not on its own. Order ahead calls the shop, or opens the ordering service you already use, like Square or Toast, once you add its link. You can also ask the builder to add an ordering page.'],
            },
            {
                q: 'Are the reviews and photos real?',
                a: ['The reviews are samples that show the layout. Replace them with your own customers\' words before you publish. The photos are public domain (CC0) from Wikimedia Commons; to use your own, attach them in the builder and say where they go.'],
            },
        ],
    },
};
