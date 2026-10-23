// Lowlight Liquor & Wine: a one-page site for a neighborhood liquor and wine
// shop. Shape documented in scripts/build-templates.mjs.

export default {
    slug: 'liquor-store',
    name: 'Liquor Store',
    category: 'Website',
    description: 'A late-night liquor and wine shop with a 21+ gate, a live open sign, order-ahead pickup and delivery, a mixed-case builder and tastings.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        {
            label: 'Use my shop\'s details',
            prompt: 'Change the shop name, address, phone number, opening hours and delivery ZIP codes to mine. I will paste them in my next message.',
        },
        {
            label: 'Replace the Board',
            prompt: 'Replace the bottles on the Board with my own list. Keep the shelves, prices and staff notes in the same format at the top of app.js.',
        },
        {
            label: 'Email me new orders',
            prompt: 'When someone reserves an order for pickup or delivery, send the order details to my email address so the counter can pull the bottles.',
        },
        {
            label: 'Add a wine club',
            prompt: 'Add a monthly wine club section with two or three tiers, what comes in each box, the price, and a sign-up form.',
        },
        {
            label: 'Add gift cards',
            prompt: 'Add a gift card section where people choose an amount, write a short message and reserve the card for pickup at the counter.',
        },
    ],
    instructions: 'This is a site for a shop that sells alcohol. Keep the 21+ age gate on the page and keep the "bring a photo ID" notes on pickup and delivery, even when the design changes. All store details, hours, products, staff picks, tastings, party math and mixed-case options are plain data at the top of app.js: change content there, not in the HTML. Every product id used by STAFF_PICKS and PARTY must exist in PRODUCTS.',
    page: {
        title: 'Liquor Store Website Template | Order Ahead, Hours, Tastings',
        description: 'A free liquor store website template with a 21+ age gate, a live open sign, a searchable price list, order-ahead pickup and delivery, and tastings.',
        ogTagline: 'A bottle shop site that stays open late.',
        features: [
            {
                title: 'Age gate and a live open sign',
                body: 'Visitors confirm they are 21 or older before they come in, and can choose to be remembered. A neon sign reads your real hours and switches between Open, Last call with the minutes left, and Closed with the next opening time.',
            },
            {
                title: 'The whole shop as a price list',
                body: 'Every bottle on one searchable board, grouped by shelf, with staff notes, an Under $20 filter and sorting by price. Search understands "under 25" as well as names, regions and styles.',
            },
            {
                title: 'Order ahead for pickup or delivery',
                body: 'A bag with quantities, an automatic 10% off six or more wines, pickup times in 15-minute steps from your hours, and delivery windows with a ZIP check, fee and minimum order.',
            },
            {
                title: 'Party math and a mixed-case builder',
                body: 'Guests, hours and what the crowd drinks turn into bottles, cases, mixers and ice, added to the bag in one tap. The mixed case prints a receipt for a budget and style, discount included.',
            },
            {
                title: 'Staff picks and tastings',
                body: 'Handwritten shelf talkers from your staff, each with an add-to-bag button, and weekly or monthly tastings with seats left and an RSVP that can be cancelled.',
            },
            {
                title: 'Everything is plain data',
                body: 'Hours, products, deals, staff picks, tastings, delivery ZIP codes and discounts are lists at the top of app.js, so changing the shop never means hunting through the layout.',
            },
        ],
        faq: [
            {
                q: 'Does the age gate verify anyone\'s age?',
                a: ['No. Like most liquor store sites, it asks visitors to confirm they are of legal drinking age before they enter. The real check is at pickup and delivery, which is why every order reminds the customer to bring a photo ID.'],
            },
            {
                q: 'Where do orders go?',
                a: ['As copied, orders and tasting RSVPs are saved in the visitor\'s browser and confirmed on screen, so you can try the whole flow. Ask the builder to email orders to you or store them in a backend when you are ready to take real ones.'],
            },
            {
                q: 'Can I change the hours, prices and products?',
                a: ['Yes. They are plain lists at the top of app.js, or you can ask the builder in plain language, for example "we close at 10pm on Sundays" or "add a sake shelf".'],
            },
        ],
    },
};
