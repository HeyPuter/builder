// Plumbing service: a one-page static site for a local plumbing business, with
// no backend. Business details, the flat-rate price list, emergency first-aid
// steps, towns and zones, jobs, hours, visit windows, reviews, FAQ, the leaky
// faucet calculator and where bookings go are plain data at the top of
// files/app.js. Photos are CC0 stock (rawpixel, Wikimedia Commons) standing in
// for the business's own job photos. See scripts/build-templates.mjs for the shape.
export default {
    slug: 'plumbing-service',
    name: 'Plumbing Website',
    category: 'Website',
    description: 'Your plumbing business, with flat-rate prices and online booking.',
    updated: '2026-10-15',
    workers: [],

    suggestions: [
        { label: 'Make it my business', prompt: 'Change the business name, phone, email, address, license, timezone, opening hours and the numbers under the hero to mine. Here are my details: ' },
        { label: 'Set my prices', prompt: 'Update the service call fee, the flat-rate price list, the on-call fee and my promises to my own prices and terms: ' },
        { label: 'Set my service area', prompt: 'Replace the towns and ZIP codes with the ones I cover, and tell me which are in the standard and extended zones: ' },
        { label: 'Use my job photos', prompt: 'Replace the stock photos and sample jobs with my own. I will upload the photos and tell you what was wrong, what we did, the town and the month for each job.' },
        { label: 'Save bookings', prompt: 'Make the booking form save each request instead of opening an email, and add a private page where only I can see them, with emergencies first.' },
    ],

    // Kept in every fork's system prompt (see scripts/build-templates.mjs).
    instructions: [
        'This project is a website for a local plumbing business. Content lives as data at the top of app.js; keep it there when making changes:',
        '- BUSINESS is the company identity: name, phone, email, address, region, license, rating, the four stats under the hero and timezone. It fills every place they appear. Change contact details there, not in the HTML. When the business, towns or prices change, also update the <title> and meta description in index.html, which are static.',
        '- OFFER and PRICES are the fees, promises and flat-rate price list. The booking form, hero price ticket and FAQ quote them, so keep the FAQ answers consistent when fees change.',
        '- FIRST_AID holds the emergency steps. Keep them short and safe: shut the water off first, keep away from water near electricity, no open flames on frozen pipes. Do not remove the gas-smell advice (leave the house, call the gas company or 911 from outside), here or in the FAQ and booking form.',
        '- TOWNS and ZONES are the service area. The ZIP checks, trip fees and same-day rule read them.',
        '- HOURS and AVAILABILITY drive the open/closed status, the on-call line and the arrival windows, in BUSINESS.timezone. The windows are requests the office confirms, not live bookings; never describe them as guaranteed appointments unless a real booking backend is added.',
        '- ENQUIRY is where bookings go: endpoint (a JSON POST) if set, otherwise an email to ENQUIRY.email or BUSINESS.email. Ask the user for their own destination; never leave example.com in a published site.',
        '- The reviews, rating, stats, jobs, license number and photos are placeholders, and SAMPLE_CONTENT = true labels them on the page. Never invent reviews, ratings, licenses, guarantees or job details for the user\'s real business; ask for real ones, or remove what they do not have. Set SAMPLE_CONTENT to false only once those are the user\'s own.',
        '- Keep the call button easy to reach on a phone, including the bar fixed to the bottom of small screens.',
    ].join('\n'),

    page: {
        title: 'Free Plumbing Business Website Template to Edit With AI',
        description:
            'Flat-rate prices, emergency first-aid steps, a leaky faucet calculator and online booking, built for a local plumbing business.',
        ogTagline: 'A plumbing website that tells people what to do first',
        features: [
            { icon: 'phone', title: 'Emergency first aid', body: 'Pick a burst pipe, overflowing toilet, sewer backup, no hot water or a frozen pipe, and see the steps that limit the damage before you arrive.' },
            { icon: 'receipt', title: 'Flat-rate price list', body: 'Drains, pipes, water heaters and fixtures in tabs, with starting prices. Any row starts a booking for that job.' },
            { icon: 'clock', title: 'Open now and on-call line', body: 'Opening hours, holidays and the after-hours line are worked out in your timezone, so the page says whether you are open right now.' },
            { icon: 'mapPin', title: 'Service zones and trip fees', body: 'The towns you cover, split into a same-day zone and an extended zone with a trip fee, with a ZIP check.' },
            { icon: 'calculator', title: 'Leaky faucet calculator', body: 'Visitors slide to their drip rate and see the gallons and dollars it wastes a year, with a button to book the fix.' },
            { icon: 'mail', title: 'Bookings go where you choose', body: 'The booking form opens an email to your address, or posts to a form service or backend of your own. Emergencies are told to call instead.' },
        ],
        faq: [
            {
                q: 'Where do bookings go?',
                a: [
                    'As copied, the form opens the visitor’s email app with a message to the address you set. Add a form endpoint and it posts there instead, or ask the builder to save bookings and it adds a private page where you read them.',
                ],
            },
            {
                q: 'Does it book real appointments?',
                a: [
                    'No. The arrival windows come from your opening hours, and a visitor requests one. Your office confirms it by phone. It does not connect to scheduling software such as ServiceTitan or Jobber.',
                ],
            },
            {
                q: 'Are the reviews and photos real?',
                a: [
                    'No. The business, reviews, rating, numbers, jobs and license number are placeholders, and the photos are free stock images. The page labels them as samples until you replace them.',
                ],
            },
        ],
    },
};
