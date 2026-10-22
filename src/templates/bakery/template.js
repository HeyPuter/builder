export default {
    slug: 'bakery',
    name: 'Bakery',
    category: 'Website',
    description: 'A night-shift bakery site with a live oven board, a price list, pickup pre-orders and cake orders.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        { label: 'Use my bakery details', prompt: 'Replace Small Hours with my bakery: name, address, phone, opening hours and the bakes on the oven board.' },
        { label: 'Update the counter', prompt: 'Update the counter price list with my own breads, pastries and prices, and set the photos to match.' },
        { label: 'Change the bake times', prompt: 'Change the oven board schedule to my own bake times and how many of each come out of the oven.' },
        { label: 'Add a wholesale page', prompt: 'Add a wholesale section for cafes and restaurants with a standing-order enquiry form.' },
        { label: 'Match my colors', prompt: 'Change the color palette and fonts to match my bakery\'s brand, keeping the dark night-shift look.' },
    ],
    instructions: [
        '- All bakery content lives in the data objects at the top of app.js (BAKERY, HOURS, BAKES, COUNTER, CAKES). Change content there, not in the markup.',
        '- The oven board statuses, the open/closed pill and the pickup slots are computed from HOURS and BAKES against the visitor\'s clock. Keep them data-driven.',
        '- Pre-orders, cake orders and the "text me" list are saved in the visitor\'s browser (localStorage) until a real backend is added.',
        '- Keep the type pairing (Big Shoulders Display + IBM Plex Mono) unless the user asks for different fonts.',
    ].join('\n'),
    page: {
        title: 'Bakery Website Template with Live Oven Board',
        description: 'A bold bakery website template with a live oven board, a price list, pickup pre-orders and cake orders. Copy it and change it by describing what you want.',
        ogTagline: 'Live oven board, pre-orders and cake orders',
        features: [
            { title: 'A live oven board', body: 'Today\'s bakes as a departure board. Each one shows proofing, in the oven, out or sold out from the visitor\'s clock, with a countdown to the next.' },
            { title: 'The counter price list', body: 'Breads, pastries, cakes and savouries in one price list with filters, dietary tags, photos and sold-out stamps.' },
            { title: 'Pickup pre-orders', body: 'Visitors fill a box, pick a day and a time slot taken from your opening hours, and get a printed-style receipt with an order number.' },
            { title: 'Cake orders with notice', body: 'A cake order slip with sizes, flavours and an inscription, a live price, and a lead time so nobody books a cake for tomorrow.' },
            { title: 'Hours that know the time', body: 'An open or closed pill in the header and an hours table that highlights today, all from one list of opening hours.' },
            { title: 'Easy to change', body: 'Every detail, price and bake time sits in plain data at the top of the script, so changing the menu is a one-line edit or a one-line request.' },
        ],
        faq: [
            { q: 'Do pre-orders reach me?', a: ['In the template, pre-orders and cake orders are saved in the visitor\'s browser and shown as a receipt. Ask the builder to send them to you by email or store them in a backend when you are ready to take real orders.'] },
            { q: 'Can I change the bake times and menu?', a: ['Yes. Describe your bakes, times and prices and the builder updates the data at the top of the script. The oven board and price list follow automatically.'] },
        ],
    },
};
