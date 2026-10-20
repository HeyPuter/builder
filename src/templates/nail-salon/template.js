// Half Moon Nail Studio: a one-page site for a nail salon in a line-drawn
// style, with a shade bar that paints nails live, a menu that totals time and
// price, an aftercare shelf and booking requests.
export default {
    slug: 'nail-salon',
    name: 'Nail Salon',
    category: 'Website',
    description: 'A line-drawn nail studio site with a live shade try-on, a menu that adds up the visit, an aftercare shelf and booking.',
    updated: '2026-10-15',
    workers: [],
    suggestions: [
        { label: 'Use my salon details', prompt: 'Replace the salon name, address, phone, hours, services, prices and artists with mine: ' },
        { label: 'Add photos of our work', prompt: 'Add a gallery of photos of our nail work, with filters by style and a lightbox, using the images I attach.' },
        { label: 'Add a gift card section', prompt: 'Add a gift card section where visitors pick an amount and a design, write a message and send the request to the salon.' },
        { label: 'Add a membership plan', prompt: 'Add a monthly membership section with three plans, what each one includes, and a button that starts a booking for that plan.' },
        { label: 'Add a Spanish version', prompt: 'Add a Spanish version of the whole page with a language switch in the header that remembers the visitor\'s choice.' },
    ],
    instructions: [
        'This is a one-page nail salon site: index.html holds the structure and copy, styles.css the look (color and type tokens in :root), and app.js the data and behavior.',
        'Salon details, opening hours, the monthly offer, services and prices, shades, lookbook sets, artists, shelf products and reviews are plain data at the top of app.js (SALON, SALON.offer, SERVICES, SHADE_FAMILIES, LOOKS, ARTISTS, PRODUCTS, REVIEWS). Change them there: the menu, ticket, shade bar, lookbook, artist cards, shelf, offer band, booking form, hours table and open-now status are all drawn from that data.',
        'Phone, email, address, Instagram handle and walk-in time in index.html are filled in from SALON through data-salon attributes. Keep those attributes when editing the markup.',
        'The illustrations are drawn in code in one ink style: handSvg() draws line-art hands, nailSvg() paints each nail from a shade, shape, finish and detail, and categoryIcon() and productArt() draw the menu tiles and shelf products. Keep new artwork in that style, and add photos alongside the drawings rather than replacing them, unless the user asks otherwise.',
        'Booking sends a request, not a confirmed appointment: it POSTs JSON to SALON.bookingEndpoint when set, and otherwise opens the visitor\'s email app addressed to SALON.email. Shelf products ride along on the request and are paid for at the visit; there is no online payment. Taken time slots are simulated in slotsFor(). Never tell visitors a booking is confirmed instantly or that they have paid; to take real bookings, connect a form endpoint or the salon\'s booking provider.',
    ].join('\n'),
    page: {
        title: 'Nail Salon Website Template with a Shade Try-On',
        description: 'A nail salon website template with line-drawn hands, a shade bar that paints nails live, an aftercare shelf and booking requests you can publish today.',
        ogTagline: 'Try a shade, then book a chair',
        features: [
            {
                title: 'A shade bar that paints the nails',
                body: 'Visitors pick from thirty shades, five nail shapes, four finishes, nail art details and five skin tones, and see the result on a line-drawn hand as they choose.',
            },
            {
                title: 'A menu that adds itself up',
                body: 'Services sit behind four illustrated category tiles. Each one added updates a ticket with the total chair time and a price estimate.',
            },
            {
                title: 'An aftercare shelf',
                body: 'Cuticle oil, take-home polish, hand cream and a glass file. Clients add them to their visit in one tap and pay at the studio.',
            },
            {
                title: 'Booking requests',
                body: 'Clients pick an artist, a day and a start time that fits the length of the visit, and can save it to their calendar. Requests reach you by email or a form endpoint.',
            },
            {
                title: 'Lookbook, artists and a monthly offer',
                body: 'Six signature sets drawn on hands of different skin tones, artist cards that book that artist, and an offer band that takes its discount off on the right days.',
            },
            {
                title: 'Yours in a sentence',
                body: 'Prices, shades, products, artists, hours and the offer are plain data in one place. Ask the builder for your own and the whole page follows.',
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
                q: 'Can I show photos of my own work?',
                a: ['Yes. Attach your photos and ask the builder to add a gallery or put them in the lookbook. The drawn nails in the shade bar keep working next to them.'],
            },
            {
                q: 'Does it work on phones?',
                a: ['Every section is laid out for small screens: the menu stacks, the hand sits above its controls, and the day and time pickers are sized for thumbs.'],
            },
        ],
    },
};
