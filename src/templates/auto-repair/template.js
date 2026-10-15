// Auto repair: a one-page static site for an independent car repair shop, with
// no backend. Business details, vehicle types, services and price ranges,
// warning lights, specials, jobs, reviews, hours, booking options and where
// bookings go are plain data at the top of files/app.js. Photos are CC0 stock
// (rawpixel public domain, StockSnap) standing in for the shop's own photos.
// See scripts/build-templates.mjs for the shape.
export default {
    slug: 'auto-repair',
    name: 'Auto Repair Shop Website',
    category: 'Website',
    description: 'Built for auto repair shops taking drop-off bookings.',
    updated: '2026-10-15',
    workers: [],

    suggestions: [
        { label: 'Make it my shop', prompt: 'Change the shop name, phone, email, address, license, number of bays and technicians, timezone and opening hours to mine. Here are my details: ' },
        { label: 'Set my prices', prompt: 'Update the services, their price ranges, time in the shop and the vehicle type price factors to my prices: ' },
        { label: 'Update my specials', prompt: 'Replace the coupons with my current offers, with an end date for each: ' },
        { label: 'Use my shop photos', prompt: 'Replace the stock photos and sample jobs with my own. I will upload the photos and tell you the vehicle, mileage, problem, fix and total for each job.' },
        { label: 'Save bookings', prompt: 'Make the booking form save each drop-off instead of opening an email, and add a private page where only I can see them, sorted by drop-off day.' },
    ],

    // Kept in every fork's system prompt (see scripts/build-templates.mjs).
    instructions: [
        'This project is a website for an independent auto repair shop. Content lives as data at the top of app.js; keep it there when making changes:',
        '- BUSINESS holds the name, phone, email, address, street, license, bays, technicians, makes, rating and timezone, and fills every place they appear. Change contact details there, not in the HTML. When the shop, town or prices change, also update the <title> and meta description in index.html, which are static.',
        '- SERVICES and VEHICLES are the price list. The quick quote, service cards, booking form and work order all read them. Prices are typical ranges, not fixed quotes: keep the wording that the shop confirms the price and the customer approves it before work starts.',
        '- LIGHTS is the warning light guide. Keep the safety advice for red lights (oil pressure, temperature, brakes, a flashing check engine light): stop when safe, do not keep driving, call the shop or a tow.',
        '- HOURS and BOOKING drive the open/closed status and the drop-off days, in BUSINESS.timezone. A booking is a request the shop confirms, not a guaranteed slot, unless a real booking backend is added.',
        '- ENQUIRY is where bookings go: endpoint (a JSON POST) if set, otherwise an email to ENQUIRY.email or BUSINESS.email. Ask the user for their own destination; never leave example.com in a published site.',
        '- The reviews, rating, review count, specials, jobs, license number and photos are placeholders, and SAMPLE_CONTENT = true labels them on the page. Never invent reviews, ratings, certifications (such as ASE), warranties, offers or job details for the user\'s real shop; ask for real ones, or remove what they do not have. Set SAMPLE_CONTENT to false only once those are the user\'s own.',
        '- Keep the call and booking buttons easy to reach on a phone, including the bar fixed to the bottom of small screens.',
    ].join('\n'),

    page: {
        title: 'Free Auto Repair Shop Website Template to Edit With AI',
        description:
            'This car repair shop website gives instant price quotes, explains dashboard warning lights, lists specials and takes drop-off bookings.',
        ogTagline: 'An auto repair website that quotes before they call',
        features: [
            { icon: 'calculator', title: 'Quick quote in the hero', body: 'Pick a car, SUV, pickup, hybrid or electric car and a job, and see the price range, time in the shop and whether you can wait for it.' },
            { icon: 'zap', title: 'Warning light guide', body: 'Tap a dashboard light to see what it means, how urgent it is and what to do now, with a button to book a check.' },
            { icon: 'receipt', title: 'Booking that builds a work order', body: 'Visitors pick services and a drop-off day, and a live work order adds up the estimate before they send it.' },
            { icon: 'wrench', title: 'Services with prices', body: 'Service cards with a starting price and time, filtered by category, all read from one price list.' },
            { icon: 'scissors', title: 'Specials that expire', body: 'Coupons with an end date hide themselves once the offer is over, and fill the booking form when used.' },
            { icon: 'clock', title: 'Open now and drop-off days', body: 'Opening hours and holidays are worked out in your timezone, so the page shows whether you are open and the next days you take cars.' },
        ],
        faq: [
            {
                q: 'Where do bookings go?',
                a: [
                    'As copied, the form opens the visitor’s email app with the work order filled in. Add a form endpoint and it posts there instead, or ask the builder to save bookings and it adds a private page where you read them.',
                ],
            },
            {
                q: 'Are the prices real quotes?',
                a: [
                    'They are typical ranges you set for each job, scaled for the vehicle type. The page says you confirm the exact price after a look. It does not connect to shop management software such as Tekmetric or Shopmonkey.',
                ],
            },
            {
                q: 'Are the reviews and photos real?',
                a: [
                    'No. The shop, reviews, rating, offers, jobs and license number are placeholders, and the photos are free stock images. The page labels them as samples until you replace them.',
                ],
            },
        ],
    },
};
