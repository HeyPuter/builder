export default {
    slug: 'laundromat',
    name: 'Laundromat',
    category: 'Website',
    description: 'A bold laundromat site with a live machine board, a price calculator, wash & fold pickup booking and opening hours.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        { label: 'Use my laundromat details', prompt: 'Replace the name, address, phone number, opening hours and prices with my laundromat\'s real details. Ask me for anything you need.' },
        { label: 'Change machine count', prompt: 'Change the machine board to match my laundromat: ask me how many washers and dryers I have, their sizes and how long each cycle takes.' },
        { label: 'Add a loyalty card', prompt: 'Add a loyalty card section where every tenth wash is free, with a stamp card visitors can see and a short explanation of how it works.' },
        { label: 'Add commercial accounts', prompt: 'Add a section for commercial laundry accounts (gyms, salons, restaurants, Airbnb hosts) with weekly pickup pricing and a quote request form.' },
        { label: 'Try a new color scheme', prompt: 'Swap the cobalt blue and lemon yellow for a different bold two-color scheme that suits a laundromat, and update the whole site to match.' },
    ],
    page: {
        title: 'Laundromat Website Template',
        description: 'A laundromat website with a live machine board, a load price calculator, wash & fold pickup booking, opening hours and FAQs. Copy it and make it yours with AI.',
        ogTagline: 'A laundromat website, ready to make your own',
        features: [
            { title: 'Live machine board', body: 'Every washer and dryer on one board, with free machines and countdowns for the ones running. Tap a running machine to get a reminder when it finishes.' },
            { title: 'Price calculator', body: 'Visitors pick their washers, dryer time and extras and see the total printed on a receipt before they leave home.' },
            { title: 'Wash & fold pickup', body: 'A booking form for pickup and delivery with time slots, an estimated price and a claim ticket with an order number.' },
            { title: 'Hours and location', body: 'Opening hours with today highlighted and an open-now status, plus the address, a map and directions.' },
            { title: 'Easy to edit', body: 'Prices, hours, machines and FAQs live as plain data at the top of the script, so changing them is quick, by hand or with AI.' },
            { title: 'Works on phones', body: 'Laid out for small screens first, so people can check for a free machine on their way over.' },
        ],
        faq: [
            { q: 'Can I change the number of machines?', a: ['Yes. The washers and dryers are a list at the top of the script. Ask the builder to change the count, sizes or cycle times and the board updates.'] },
            { q: 'Is the machine board connected to real machines?', a: ['Not out of the box. It simulates busy and free machines so the page looks alive. The builder can connect it to a backend if your machines report their status.'] },
            { q: 'Where do pickup bookings go?', a: ['The template keeps them in the visitor\'s browser and shows a claim ticket. Ask the builder to send them to you by email or store them in a backend.'] },
        ],
    },
};
