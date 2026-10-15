// House cleaning: a one-page static site for a local home cleaning business,
// with no backend. Business details, cleans and prices, extras, towns, the
// room by room checklist, reviews, FAQ and where booking requests go are plain
// data at the top of files/app.js. Photos are CC0 stock (rawpixel) standing in
// for the business's own photos. See src/templates/index.js for the shape.
export default {
    slug: 'house-cleaning',
    name: 'House Cleaning Business',
    category: 'Website',
    description: 'A one-page site for a home cleaning business, with an instant price builder, a room by room checklist and a booking request form.',
    updated: '2026-10-15',
    workers: [],

    suggestions: [
        { label: 'Make it my business', prompt: 'Change the business name, phone, email, address, office hours, cleaning days, timezone and the towns and ZIP codes we cover to mine. Here are my details: ' },
        { label: 'Set my prices', prompt: 'Update the base price, price per bedroom and per bathroom for each type of clean, the recurring discounts, the extras and the minimum visit to my prices: ' },
        { label: 'Edit my checklist', prompt: 'Change the room by room checklist to match what my team does in a standard, deep and move-out clean: ' },
        { label: 'Use my photos', prompt: 'Replace the stock photos with my own. I will upload photos of homes we have cleaned and of my team.' },
        { label: 'Save requests', prompt: 'Make the booking form save each request instead of opening an email, and add a private page where only I can see them, sorted by preferred day.' },
    ],

    // Kept in every fork's system prompt (see src/templates/index.js).
    instructions: [
        'This project is a website for a local house cleaning business. Content lives as data at the top of app.js; keep it there when making changes:',
        '- BUSINESS is the company identity: name, phone, email, address, region, insurance line, rating, homes count and timezone. It fills every place they appear. Change contact details there, not in the HTML. When the business, towns or prices change, also update the <title> and meta description in index.html, which are static.',
        '- CLEANS, FREQUENCIES, ADDONS and PRICING are the price list. The price builder, the service cards, the booking summary and the checklist columns all read them, so a price changes in one place. Keep the FAQ answers consistent with them (the first recurring visit, skipping, payment).',
        '- ROOMS is the room by room checklist; the letters s, d and m on each task say which cleans include it. TOWNS is the service area with any travel fee. HOURS and AVAILABILITY drive the office hours and the first free cleaning day, in BUSINESS.timezone.',
        '- The preferred day is a request the office confirms, not a live booking; never describe it as a guaranteed appointment unless a real booking backend is added.',
        '- ENQUIRY is where requests go: endpoint (a JSON POST) if set, otherwise an email to ENQUIRY.email or BUSINESS.email. Ask the user for their own destination; never leave example.com in a published site.',
        '- The reviews, rating, review count, homes count and photos are placeholders, and SAMPLE_CONTENT = true labels them on the page. Never invent reviews, ratings, guarantees, insurance or background checks for the user\'s real business; ask, or remove what they do not offer. Set SAMPLE_CONTENT to false only once those are the user\'s own.',
        '- Keep the price builder easy to use on a phone, and the call, text and price buttons in the bar fixed to the bottom of small screens.',
    ].join('\n'),

    page: {
        title: 'House Cleaning Business Website Template, Free to Edit With AI',
        description:
            'A one-page website for a house cleaning or maid service, with an instant price builder, a room by room checklist, service area and a booking request form.',
        ogTagline: 'A cleaning website that shows the price before the booking',
        lead:
            'A one-page site for a local home cleaning business, in a fresh cream, deep green and lime look. A visitor picks a standard, deep or move-out clean, sets bedrooms, bathrooms, how often and any extras, and sees the price per visit, the time on site and the first free day straight away. The page also shows your services, exactly what gets cleaned in each room for each type of clean, your promise, reviews and the towns you cover, and ends in a booking form that carries the price along. Copy it, then describe your business and the page changes to fit.',
        features: [
            { icon: 'calculator', title: 'Instant price builder', body: 'Bedrooms, bathrooms, type of clean, how often and extras give a price per visit, the time on site and the first free day, with recurring discounts.' },
            { icon: 'check', title: 'Room by room checklist', body: 'Kitchen, bathrooms, bedrooms and living areas, with what a standard, deep and move-out clean each include. The clean being priced is highlighted.' },
            { icon: 'mapPin', title: 'Service area and travel fees', body: 'The towns you cover with any travel fee, and a ZIP check that adds the fee to the price.' },
            { icon: 'calendar', title: 'Booking request with the quote', body: 'Preferred day, arrival window and how to get in, sent with the price and choices the visitor made.' },
            { icon: 'mail', title: 'Requests go where you choose', body: 'The booking form opens an email to your address, or posts to a form service or backend of your own.' },
            { icon: 'pen', title: 'Prices kept in one place', body: 'Cleans, prices, extras, towns, checklist, reviews and questions are plain lists at the top of the script.' },
        ],
        faq: [
            {
                q: 'Where do booking requests go?',
                a: [
                    'As copied, the form opens the visitor’s email app with the request and the price filled in, addressed to you. Add a form endpoint and it posts there instead, or ask the builder to save requests and it adds a private page where you read them.',
                ],
            },
            {
                q: 'Does it take payments or real bookings?',
                a: [
                    'No. A visitor requests a day and you confirm it. It does not connect to scheduling or payment software such as Jobber or Launch27, though you can ask the builder to link to yours.',
                ],
            },
            {
                q: 'Are the reviews and photos real?',
                a: [
                    'No. The business, reviews and rating are placeholders, and the photos are free stock images. The page labels them as samples until you replace them.',
                ],
            },
        ],
    },
};
