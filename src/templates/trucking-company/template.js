// Trucking company: a one-page static site for an asset-based truckload
// carrier, with no backend. The carrier's details and authority numbers,
// fleet stats, trailers and rates, cities and lanes, how a load moves, driver
// pay and perks, safety record, reviews, FAQ, office hours and where rate
// requests and applications go are plain data at the top of files/app.js.
// Photos are CC0 stock (rawpixel) standing in for the carrier's own trucks
// and terminal. See scripts/build-templates.mjs for the shape.
export default {
    slug: 'trucking-company',
    name: 'Trucking Company Website',
    category: 'Website',
    description: 'Freight carriers can quote loads and hire drivers here.',
    updated: '2026-10-15',
    workers: [],

    suggestions: [
        { label: 'Make it my company', prompt: 'Change the company name, phone, email, address, USDOT and MC numbers, insurance, timezone and office hours to mine. Here are my details: ' },
        { label: 'Set my lanes', prompt: 'Replace the home terminal, cities and weekly lanes with the ones I run. Here they are, with how many trucks a week go on each: ' },
        { label: 'Set my rates', prompt: 'Update the trailers I pull and the ballpark rate per mile, minimum charge and off-lane markup to my numbers: ' },
        { label: 'Update driver pay', prompt: 'Change the driver pay per mile, stop pay, home time, perks, positions and experience rule to match what I offer: ' },
        { label: 'Save requests', prompt: 'Make the rate request and driver application save each submission instead of opening an email, and add a private page where only I can see them, newest first.' },
    ],

    // Kept in every fork's system prompt (see scripts/build-templates.mjs).
    instructions: [
        'This project is a website for a trucking company (a truckload carrier). Content lives as data at the top of app.js; keep it there when making changes:',
        '- BUSINESS is the company identity: name, phone, email, address, USDOT and MC numbers, insurance amounts and timezone. It fills every place they appear. Change contact details there, not in the HTML. When the company, base city or lanes change, also update the <title> and meta description in index.html, which are static.',
        '- EQUIPMENT and RATES are the trailers and ballpark prices. The rate request quotes them; its price is labeled a guide, not a quote, and must stay that way unless the user says their rates are fixed. RATES.show = false hides the price.',
        '- CITIES, HOME and LANES are where the company runs. The map, departures board, rate request cities, miles and transit days all read them. Miles are estimated from coordinates unless a lane sets miles.',
        '- DRIVERS drives the pay calculator, perks and the application. Keep the calculator labeled an estimate, not an offer.',
        '- HOURS is when the office is staffed; dispatch is described as 24/7. If the user does not run 24/7 dispatch, change that wording everywhere.',
        '- ENQUIRY is where rate requests and applications go: endpoint (a JSON POST) if set, otherwise an email to ENQUIRY.quotes or ENQUIRY.drivers, falling back to BUSINESS.email. Ask the user for their own destination; never leave example.com in a published site.',
        '- The USDOT and MC numbers, insurance, safety record, stats, reviews and photos are placeholders, and SAMPLE_CONTENT = true labels them on the page and hides the FMCSA lookup link. Never invent authority numbers, insurance, safety ratings, inspection rates, reviews or stats for the user\'s real company; ask for real ones, or remove what they do not have. Set SAMPLE_CONTENT to false only once those are the user\'s own.',
        '- Do not describe the company as a broker unless the user says it is one; the copy says it hauls on its own trucks.',
    ].join('\n'),

    page: {
        title: 'Free Trucking Company Website Template to Edit With AI',
        description:
            'When shippers request a rate on this trucking company website, they see miles, transit time and a ballpark price, and drivers can apply too.',
        ogTagline: 'A trucking website that prices the lane and hires the driver',
        features: [
            { icon: 'calculator', title: 'Rate request with a ballpark', body: 'Pick the pick-up and delivery cities and the trailer, and see the miles, transit days and a price range before sending it for a firm rate.' },
            { icon: 'mapPin', title: 'Lanes map and departures board', body: 'Your home terminal and weekly lanes on a map, with a board of miles, trucks a week and transit days. Pick a lane to price it.' },
            { icon: 'wrench', title: 'Trailers with specs', body: 'Dry van, refrigerated and flatbed cards with capacity, weight and features, each linking to a rate request for that trailer.' },
            { icon: 'users', title: 'Driver recruiting', body: 'A pay calculator, perks and a one-minute application that says up front what experience you hire.' },
            { icon: 'shieldCheck', title: 'Authority and safety record', body: 'USDOT and MC numbers, insurance and inspection record in one place, with a link to the public FMCSA record once the numbers are yours.' },
            { icon: 'mail', title: 'Requests go where you choose', body: 'Rate requests and applications open an email to your dispatch and recruiting addresses, or post to a form service or backend of your own.' },
        ],
        faq: [
            {
                q: 'Is the price on the rate request a real quote?',
                a: [
                    'No. It is a ballpark from your rate per mile for each trailer, with a minimum charge and a markup off your regular lanes. The page labels it a guide, and your dispatcher sends the firm rate.',
                ],
            },
            {
                q: 'Does it connect to my TMS or load board?',
                a: [
                    'No. Requests go to your email or a form endpoint. It does not book loads, track trucks or post to load boards.',
                ],
            },
            {
                q: 'Are the numbers and reviews real?',
                a: [
                    'No. The company, USDOT and MC numbers, insurance, safety record, stats and reviews are placeholders, and the photos are free stock images. The page labels them as samples until you replace them.',
                ],
            },
        ],
    },
};
