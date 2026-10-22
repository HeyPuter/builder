export default {
    slug: 'convenience-store',
    name: 'Convenience Store',
    category: 'Website',
    description: 'A 24-hour corner store site with a live store clock, shelf-tag products, an aisle finder and order-ahead pickup.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        { label: 'Use my store details', prompt: 'Change the store name, address, phone, time zone and parking note to mine: ' },
        { label: 'Update my shelves', prompt: 'Replace the products on the shelves with what my store actually sells, keeping the aisles and shelf tags: ' },
        { label: 'Set my counter hours', prompt: 'Update the counter services and their hours, and the hot case batch times, to match my store: ' },
        { label: 'Add this week\'s deals', prompt: 'Replace the deals on the weekly receipt, with their old and new prices and the dates they run: ' },
        { label: 'Email pickup orders', prompt: 'Send each pickup order to my email with the items, name, phone and pickup time, so the counter sees it right away.' },
    ],
    instructions: [
        '- The store\'s details, counter services and hours, hot case batches, aisles, products, aisle finder words and weekly deals are plain data at the top of app.js. Change content there, not in the HTML.',
        '- Times (hero clock, open or closed, hot case countdown, pickup slots) use STORE.timezone, the store\'s own time zone. Keep it that way.',
        '- Keep the look: Anton for display type, IBM Plex Mono for everything else, the red / yellow / mint stripe sign, yellow shelf-edge price tags and the torn receipt for deals.',
        '- Pickup orders are saved in the visitor\'s browser only; paying happens at the counter.',
    ].join('\n'),
    page: {
        title: 'Convenience Store Website Template | Puter Builder',
        description: 'A free convenience store website template with a live store clock, shelf-tag products, order-ahead pickup, an aisle finder and a weekly deals receipt.',
        ogTagline: 'A corner store site that is open when you are.',
        features: [
            { title: 'A live store clock', body: 'The hero shows the time at the store in its own time zone, with how many counter services are running right now.' },
            { title: 'Shelf-tag products', body: 'Products sit on a shelf rail as yellow price tags, grouped by aisle. One tap puts an item in the pickup bag.' },
            { title: 'Order ahead for pickup', body: 'Visitors pick a pickup time, leave a name and phone, and get a pickup ticket number to show at the register.' },
            { title: 'Where\'s the…?', body: 'An aisle finder answers like the clerk would: which aisle, which shelf, and a button to add the item to the bag.' },
            { title: 'Hot case countdown', body: 'A day timeline and a live countdown to the next fresh batch, with what comes out of the oven and the hot menu.' },
            { title: 'Weekly deals receipt and live hours', body: 'Deals print on a torn receipt with what each one saves, and every counter service shows open or closed right now.' },
        ],
        faq: [
            {
                q: 'Can I change the products, prices and aisles?',
                a: ['Yes. They are plain data at the top of app.js. Ask the builder to swap in your own products, prices, aisles and deals, and the shelves, the finder and the receipt all follow.'],
            },
            {
                q: 'Do pickup orders reach my store?',
                a: ['Out of the box, an order is saved in the visitor\'s browser and they get a ticket number to show at the counter. Ask the builder to email or text each order to you, and it will add a small backend for it.'],
            },
            {
                q: 'My store is not open 24 hours. Does that work?',
                a: ['Yes. Tell the builder your opening hours and it will change the hero to show open or closed, and limit pickup times to when you are open.'],
            },
        ],
    },
};
