// Half Moon Nail Studio: a one-page site for a nail salon, laid out like a
// boutique store: a photo hero, service category tiles with a menu that
// totals time and price, featured sets, a shade bar, a shop of take-home
// aftercare and booking requests.
export default {
    slug: 'nail-salon',
    name: 'Nail Salon',
    category: 'Website',
    description: 'A nail studio site with service tiles that add up the visit, a shade preview, a take-home shop and booking requests.',
    updated: '2026-10-20',
    workers: [],
    suggestions: [
        { label: 'Use my salon details', prompt: 'Replace the salon name, address, phone, hours, services, prices and artists with mine: ' },
        { label: 'Use my own photos', prompt: 'Replace the hero photo and the shop product photos with the images I attach, keeping the same crops and layout.' },
        { label: 'Add a gallery of our work', prompt: 'Add a gallery of photos of our nail work, with filters by style and a lightbox, using the images I attach.' },
        { label: 'Add a gift card section', prompt: 'Add a gift card section where visitors pick an amount and a design, write a message and send the request to the salon.' },
        { label: 'Add a membership plan', prompt: 'Add a monthly membership section with three plans, what each one includes, and a button that starts a booking for that plan.' },
    ],
    instructions: [
        'This is a one-page nail salon site: index.html holds the structure and copy, styles.css the look (color and type tokens in :root), and app.js the data and behavior. Photos live in photos/.',
        'Salon details, opening hours, the monthly offer, services and prices, shades, featured sets, artists, shop products and reviews are plain data at the top of app.js (SALON, SALON.offer, SERVICES, SHADE_FAMILIES, LOOKS, ARTISTS, PRODUCTS, REVIEWS). Change them there: the announcement bar, category tiles, menu, ticket, featured sets, shade bar, promo band, shop, artist cards, booking form, hours table and open-now status are all drawn from that data.',
        'Phone, email, address, Instagram handle and walk-in time in index.html are filled in from SALON through data-salon attributes. Keep those attributes when editing the markup.',
        'Nails and polish bottles are drawn in code (nailSvg, setSvg, bottleSvg) from a shade, shape, finish and detail, so the shade bar and featured sets follow the data. The hero and shop use photos; when the user attaches their own, swap the file paths rather than the layout.',
        'Booking sends a request, not a confirmed appointment: it POSTs JSON to SALON.bookingEndpoint when set, and otherwise opens the visitor\'s email app addressed to SALON.email. Shop products ride along on the request and are paid for at the visit; there is no online payment. Taken time slots are simulated in slotsFor(). Never tell visitors a booking is confirmed instantly or that they have paid; to take real bookings, connect a form endpoint or the salon\'s booking provider.',
    ].join('\n'),
    page: {
        title: 'Nail Salon Website Template with a Shade Preview',
        description: 'A nail salon website template with service tiles, a shade bar that previews each set, a shop of take-home aftercare and booking requests you can publish today.',
        ogTagline: 'Pick a shade, then book a chair',
        features: [
            {
                title: 'Services that add themselves up',
                body: 'Four category tiles open the menu for hands, feet, enhancements and art. Each service added updates a ticket with the total chair time and a price estimate.',
            },
            {
                title: 'Featured sets',
                body: 'Six signature sets shown like products, with a price, a rating and a button that puts the set in the shade bar.',
            },
            {
                title: 'A shade bar',
                body: 'Visitors pick from thirty shades, five nail shapes, four finishes and nail art details, and see the bottle and the set change as they choose.',
            },
            {
                title: 'A take-home shop',
                body: 'Cuticle oil, polish, hand cream and a glass file, each added to the visit in one tap and paid for at the studio.',
            },
            {
                title: 'Booking requests',
                body: 'Clients pick an artist, a day and a start time that fits the length of the visit, and can save it to their calendar. Requests reach you by email or a form endpoint.',
            },
            {
                title: 'A monthly offer',
                body: 'The announcement bar and a promo band advertise the offer, the day picker marks the days it applies, and the booking summary takes the discount off.',
            },
        ],
        faq: [
            {
                q: 'Can clients book real appointments with it?',
                a: [
                    'The booking form collects the services, artist, day, time and contact details and sends them to you as a request, which you confirm by text or email. Give it a form endpoint to receive requests as JSON, or leave it empty and each request opens in the client\'s email app, addressed to you.',
                    'Taken times are simulated so the page looks lived in. Ask the builder to connect your booking provider or to remove them.',
                ],
            },
            {
                q: 'Can I use photos of my own studio and products?',
                a: ['Yes. Attach your photos and ask the builder to use them for the hero or the shop, or to add a gallery of your work. Prices and product details change in the same request.'],
            },
            {
                q: 'Does it work on phones?',
                a: ['Every section is laid out for small screens: the category tiles sit two by two, the hero text sits over the bottom of the photo, and the day and time pickers are sized for thumbs.'],
            },
        ],
    },
};
