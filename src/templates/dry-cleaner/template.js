export default {
    slug: 'dry-cleaner',
    name: 'Dry Cleaner',
    category: 'Website',
    description: 'A neighborhood dry cleaner and tailor site with a live price receipt, pickup booking and ticket tracking.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        { label: 'Use my shop details', prompt: 'Replace the shop name, address, phone number, opening hours and same-day cut-off with my own details: ' },
        { label: 'Update my price list', prompt: 'Update the price list with my own garments, categories and prices. Here is my current list: ' },
        { label: 'Change delivery areas', prompt: 'Change the ZIP codes covered by free pickup and delivery, the free-delivery minimum and the pickup time windows to: ' },
        { label: 'Add a loyalty card', prompt: 'Add a stamp-card loyalty section in the same claim-ticket style: every tenth order is free, and customers can see their stamps after booking a pickup.' },
    ],
    instructions: [
        '- Keep the shop content (name, hours, cut-off times, services, prices, ZIP codes, stain tips, FAQ) as the plain data at the top of app.js; change content there, not in the markup.',
        '- Keep the claim-ticket style: perforated pink tickets, IBM Plex Mono for ticket and receipt text, Big Shoulders Display for big headings, and the red rubber stamp.',
        '- The open/closed status, the same-day "ready by" time, the receipt total and the pickup dates are all computed from the data in app.js; keep them working when the data changes.',
    ].join('\n'),
    page: {
        title: 'Dry cleaner website template',
        description: 'A dry cleaner and tailor website with same-day cut-off times, a price list that adds up, pickup booking, ticket tracking and a stain first-aid guide.',
        ogTagline: 'A dry cleaner site that prints its own claim tickets.',
        features: [
            { title: 'Live open and cut-off times', body: 'The hero claim ticket shows whether the shop is open right now and, if you drop off before the cut-off, the time your clothes will be ready.' },
            { title: 'Price list that adds up', body: 'Tap garments in the price list and a printed receipt adds them up, with an optional rush service and the ready-by time it buys.' },
            { title: 'Pickup and delivery booking', body: 'Customers check their ZIP code, pick a day and a time window, and get a numbered claim ticket they can add to their calendar.' },
            { title: 'Track a ticket', body: 'Type a ticket number to see where the order is, from received to ready on the rack, on a conveyor of hangers.' },
            { title: 'Stain first aid', body: 'What to do, and what not to do, for wine, coffee, grease, ink, makeup and more before bringing a garment in.' },
            { title: 'Easy to make your own', body: 'Hours, prices, services, delivery areas and FAQ live as plain data at the top of one file, so changing them is a one-line edit.' },
        ],
        faq: [
            { q: 'Can I use my own prices and garments?', a: ['Yes. The price list is plain data at the top of app.js, grouped by category. Ask the builder to replace it with your list and the receipt keeps adding up.'] },
            { q: 'Do pickup bookings reach me?', a: ['Bookings are saved in the visitor\'s browser and shown back as a claim ticket. Ask the builder to send them to you by email or to a backend when you are ready to take real orders.'] },
            { q: 'Where do the photos come from?', a: ['They are public domain (CC0) archival photographs of a 1950s shirt-pressing workshop, from the Dutch National Archives via Wikimedia Commons. Swap in photos of your own shop any time.'] },
        ],
    },
};
