// Half Moon Nail Studio: a one-page site for a nail salon, with a shade bar
// that paints nails live, a menu that totals time and price, and booking
// requests.
export default {
    slug: 'nail-salon',
    name: 'Nail Salon',
    category: 'Website',
    description: 'A nail studio site with a live shade try-on, a menu that adds up time and price, and booking requests.',
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
        'Salon details, opening hours, services and prices, shades, lookbook sets, artists and reviews are plain data at the top of app.js (SALON, SERVICES, SHADE_FAMILIES, LOOKS, ARTISTS, REVIEWS). Change them there: the menu, ticket, shade bar, lookbook, artist cards, booking form, hours table and open-now status are all drawn from that data.',
        'Phone, email, address, Instagram handle and walk-in time in index.html are filled in from SALON through data-salon attributes. Keep those attributes when editing the markup.',
        'Nails are drawn as SVG by nailSvg() from a shade, shape, finish and detail. Keep the shade bar, lookbook and artist cards working through it, and add photos alongside it rather than replacing it, unless the user asks otherwise.',
        'Booking sends a request, not a confirmed appointment: it POSTs JSON to SALON.bookingEndpoint when set, and otherwise opens the visitor\'s email app addressed to SALON.email. Taken time slots are simulated in slotsFor(). Never tell visitors a booking is confirmed instantly; to take real bookings, connect a form endpoint or the salon\'s booking provider.',
    ].join('\n'),
    page: {
        title: 'Nail Salon Website Template with a Shade Try-On',
        description: 'A nail salon website template with a shade bar that paints nails live, a menu that totals time and price, and booking requests you can publish today.',
        ogTagline: 'Try a shade, then book a chair',
        features: [
            {
                title: 'A shade bar that paints the nails',
                body: 'Visitors pick from thirty shades, five nail shapes, four finishes, nail art details and skin tones, and see the result on a hand as they choose.',
            },
            {
                title: 'A menu that adds itself up',
                body: 'Services sit in tabs for hands, feet, enhancements and art. Each one added updates a ticket with the total chair time and a price estimate.',
            },
            {
                title: 'Booking requests',
                body: 'Clients pick an artist, a day and a start time that fits the length of the visit, and can save it to their calendar. Requests reach you by email or a form endpoint.',
            },
            {
                title: 'Lookbook and artists',
                body: 'Six signature sets load onto the hand in one tap, and each artist card books that artist, limited to the days they work.',
            },
            {
                title: 'Open now, hours and policies',
                body: 'The top bar says whether you are open right now, the hours table marks today, and late arrival, cancellation and gift card policies are spelled out.',
            },
            {
                title: 'Yours in a sentence',
                body: 'Prices, shades, artists, hours and reviews are plain data in one place. Ask the builder for your own and the whole page follows.',
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
