export default {
    slug: 'florist',
    name: 'Florist',
    category: 'Website',
    description: 'A moody flower shop site with a same-day delivery countdown, weekly bunches, a seasonal almanac and an order slip.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        { label: 'Change the bunches', prompt: 'Replace this week\'s bunches with my own: update the names, descriptions, stems and the three size prices in the BUNCHES list in app.js.' },
        { label: 'Set my delivery zones', prompt: 'Update the delivery zones in app.js to my area: these ZIP codes and fees, and my same-day cutoff time.' },
        { label: 'Use my shop details', prompt: 'Change the shop name, address, phone, email and opening hours throughout the site to my own details.' },
        { label: 'Add a gift add-ons step', prompt: 'Let customers add extras to an order on the order slip, like a vase, chocolates or a candle, each with a price that adds to the total.' },
        { label: 'Send orders by email', prompt: 'When someone places an order or sends a wedding enquiry, email the details to me instead of only saving them in the browser.' },
    ],
    instructions: 'All shop content (details, hours, delivery zones and fees, bunches and prices, seasonal stems, standing-order discounts, workshops and care tips) lives as plain data at the top of app.js. Change content there rather than hard-coding it in index.html. Keep the visual language: Fraunces for display type with marigold italics for emphasis, DM Mono for small uppercase labels, the ink/bone/marigold palette, and the edge-to-edge wordmark. Orders, enquiries and workshop bookings are saved to localStorage until a backend is added.',
    page: {
        title: 'Florist website template with same-day delivery',
        description: 'A florist website with a same-day delivery countdown, weekly bunches, an order slip with ZIP checks and gift cards, subscriptions and workshops.',
        ogTagline: 'A flower shop site with delivery, subscriptions and bookings built in.',
        features: [
            { title: 'Same-day delivery countdown', body: 'The hero ticket counts down to the order cutoff and rolls over to the next delivery day after it passes, and on days you are closed.' },
            { title: 'Order slip with real checks', body: 'Customers pick a bunch and size, then check their ZIP against your delivery zones and fees. They choose a date you deliver and write a gift card with a live handwritten preview.' },
            { title: 'Seasonal almanac', body: 'Click any month to see what is in season, at its best, just in or in its last weeks. It opens on the current month.' },
            { title: 'Subscriptions, weddings and workshops', body: 'There is a standing-order picker with discounts, a wedding and events enquiry form with a budget slider, and workshop booking with live seat counts.' },
        ],
        faq: [
            { q: 'Where do I change the flowers and prices?', a: ['Everything is plain data at the top of app.js: the bunches and their three sizes, delivery zones and fees, opening hours, seasonal stems and workshops. You can also just ask the builder to change it for you.'] },
            { q: 'Does it take payments?', a: ['Not yet. Orders, enquiries and bookings are saved in the visitor\'s browser and shown back as a confirmation. Ask the builder to add a backend or a checkout when you are ready.'] },
        ],
    },
};
