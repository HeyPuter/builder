export default {
    slug: 'tattoo-studio',
    name: 'Tattoo Studio',
    category: 'Website',
    description: 'A blackletter tattoo studio site with an artist ledger, a flash wall you can claim from, a booking slip with live estimates and day-by-day aftercare.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        { label: 'Use my studio details', prompt: 'Replace the studio name, address, hours, phone, email and Instagram with my own details. I will paste them next.' },
        { label: 'Add my artists', prompt: 'Replace the five artists with my team: their names, styles, hourly rates and whether their books are open. I will list them next.' },
        { label: 'Swap in my flash', prompt: 'Let me upload photos of my own flash sheets and use them on the flash wall instead of the drawn designs, with my prices.' },
        { label: 'Email booking requests', prompt: 'Send each booking request to my email with all its details, so requests do not only stay on the visitor\'s device.' },
        { label: 'Add a gift card page', prompt: 'Add a gift card section where people choose an amount, write a message and get a printable card with a code.' },
    ],
    instructions: 'This is a tattoo studio website. All studio content (details, hours, pricing, artists, portfolio, flash, placements, aftercare, FAQ) is plain data at the top of app.js; change content there instead of in the HTML. Flash designs are SVG drawings in flash-art.js, referenced by key from FLASH[].art. Keep the look: ink black, bone and stencil violet, Pirata One blackletter set very large against small IBM Plex Mono labels. Booking requests and claimed flash are saved in the visitor\'s browser only; say so if the user asks where requests go.',
    page: {
        title: 'Tattoo Studio Website Template: Artists, Flash and Booking',
        description: 'A tattoo studio website with an artist ledger, a claimable flash wall, a booking form with live price estimates, aftercare by day and open-now hours.',
        ogTagline: 'Artists, flash and bookings for a tattoo studio',
        features: [
            { title: 'Artist ledger', body: 'Every resident artist with their styles, hourly rate and whether their books are open, on a waitlist or closed. Pick one to see their work or book them.' },
            { title: 'Portfolio by style', body: 'Healed and fresh work in a full-bleed grid, filtered by style or artist, with a larger view on click. Hovering turns a photo into a violet stencil.' },
            { title: 'Claimable flash wall', body: 'One-off designs pinned to a paper wall with their price. Claiming one fills in the booking form, and once it is booked it is stamped as claimed.' },
            { title: 'Booking with estimates', body: 'Custom, flash or cover-up requests with placement, size and ink. The time, price range and deposit update as visitors fill it in.' },
            { title: 'Aftercare, day by day', body: 'Visitors drag through the first 30 days of healing and see what to do at each stage, so the shop answers fewer of the same questions.' },
            { title: 'Hours and open now', body: 'Weekly hours with today highlighted, and a live open or closed sign in the header that says when the studio opens next.' },
        ],
        faq: [
            {
                q: 'Where do booking requests go?',
                a: ['In the template they are saved in the visitor\'s browser and listed under the form. Ask the builder to email each request to you, or to save them to a list only you can see.'],
            },
            {
                q: 'Can I use my own flash sheets?',
                a: ['Yes. The flash wall ships with drawn designs, and you can ask the builder to replace them with photos of your own flash and your prices.'],
            },
            {
                q: 'How do I change prices and the estimate?',
                a: ['Each artist\'s hourly rate, the shop minimum, the deposit and the placement multipliers are plain data at the top of the code. Describe your pricing and the builder updates them.'],
            },
        ],
    },
};
