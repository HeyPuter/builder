export default {
    slug: 'car-wash',
    name: 'Car Wash',
    category: 'Website',
    description: 'A bold tunnel car wash site: buy a wash code online, an Unlimited plan calculator, detail bay booking and a live wait board.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        { label: 'Use my wash details', prompt: 'Replace the business name, address, phone, hours and wash prices in app.js with the details of my car wash, which I will paste next.' },
        { label: 'Add a second location', prompt: 'Add a second wash location with its own address and hours, and let visitors switch between locations on the lane board and in the hours section.' },
        { label: 'Add gift cards', prompt: 'Add a gift card section where visitors pick an amount and a wash package, write a short message, and get a printable gift card with a code.' },
        { label: 'Add a fleet page', prompt: 'Add a section for fleet and business accounts with volume pricing and a form that collects company name, fleet size and contact details.' },
    ],
    instructions: [
        '- All business content (name, address, hours, busy curve, wash packages, extras, Unlimited plans, tunnel stages, detailing services, reviews and FAQ) lives as plain data at the top of app.js. Change content there, not in the markup.',
        '- Keep the triple-foam palette (pink, blue, yellow on ink black) as the only accent colours, and keep Big Shoulders Display for headings and IBM Plex Mono for small text.',
        '- Checkout, Unlimited sign-up and detail bookings are demos stored in the browser. Say so if the user asks about taking real payments, and suggest connecting a payment provider or backend.',
    ].join('\n'),
    page: {
        title: 'Car Wash Website Template',
        description: 'A tunnel car wash website that sells wash codes online, shows Unlimited plan savings, books the detail bay and posts the live wait time.',
        ogTagline: 'Car wash website template',
        features: [
            { title: 'Buy a wash online', body: 'A pay-station menu board: pick a package, vehicle size and extras, and get a printed ticket with a wash code for the keypad.' },
            { title: 'Unlimited plans that sell themselves', body: 'Visitors say how often they wash and see, in huge type, how much a membership keeps in their pocket each month, then join in a short form.' },
            { title: 'Detail bay booking', body: 'Services, a two-week day strip and drop-off times that respect each service\'s length and the slots already taken.' },
            { title: 'Live lane board', body: 'Open or closed, the expected wait and closing time, worked out from your hours and an hourly busy curve in your own time zone.' },
            { title: 'The tunnel, stage by stage', body: 'A scroll-driven section where a car rides through pre-soak, triple foam, brushes, wax and dry, lighting each stage as it passes.' },
            { title: 'Easy to make yours', body: 'Prices, hours, plans, services, reviews and FAQ are plain data at the top of one file. Ask the builder to change any of it.' },
        ],
        faq: [
            { q: 'Does it take real payments?', a: ['Not yet. Wash codes, memberships and bookings are saved in the visitor\'s browser so you can see the whole flow. Ask the builder to connect a payment provider or a backend when you are ready to go live.'] },
            { q: 'Can I change the wash packages and prices?', a: ['Yes. They are a short list at the top of app.js. Edit it yourself, or tell the builder your menu and it will update the menu board, the ticket and the Unlimited calculator together.'] },
            { q: 'Is it only for tunnel washes?', a: ['It is designed around an express tunnel with a detail bay, but you can ask the builder to turn it into a self-serve, hand wash or mobile detailing site.'] },
        ],
    },
};
