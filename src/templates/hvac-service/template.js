// HVAC service: a one-page static site for a local heating and cooling
// business, with no backend. Business details, services and fees, the
// maintenance plan, towns and zones, jobs, hours, visit windows, reviews, FAQ
// and where enquiries go are plain data at the top of files/app.js. Photos are
// CC0 stock (rawpixel, Wikimedia Commons) standing in for the business's own
// job photos. See src/templates/index.js for the shape.
export default {
    slug: 'hvac-service',
    name: 'HVAC Business',
    category: 'Website',
    description: 'A one-page site for a heating and cooling business, with a service request form that shows fees, live hours and service zones.',
    updated: '2026-10-12',
    workers: [],

    suggestions: [
        { label: 'Make it my business', prompt: 'Change the business name, phone, email, address, license, badges, timezone and opening hours to mine. Here are my details: ' },
        { label: 'Set my prices and terms', prompt: 'Update the diagnostic fee, tune-up price, after-hours fee, trip fees, warranty and maintenance plan to my terms: ' },
        { label: 'Set my service area', prompt: 'Replace the towns and ZIP codes with the ones I cover, and tell me which are in the standard and extended zones: ' },
        { label: 'Use my job photos', prompt: 'Replace the stock photos and sample jobs with my own. I will upload the photos and tell you the problem, the fix, the town and the month for each job.' },
        { label: 'Save requests', prompt: 'Make the booking form save each request instead of opening an email, and add a private page where only I can see them, sorted by visit window.' },
    ],

    // Kept in every fork's system prompt (see src/templates/index.js).
    instructions: [
        'This project is a website for a local HVAC (heating and cooling) business. Content lives as data at the top of app.js; keep it there when making changes:',
        '- BUSINESS is the company identity: name, phone, email, address, region, license, the round badges under the hero, brands, rating and timezone. It fills every place they appear. Change contact details there, not in the HTML. When the business, towns or prices change, also update the <title> and meta description in index.html, which are static.',
        '- OFFER, PLAN and SERVICES are the prices and terms. The request form, service rows and FAQ quote them, so keep the FAQ answers consistent with them when fees change. Only show badges (NATE, EPA, BBB and so on) the business really holds.',
        '- TOWNS and ZONES are the service area. The ZIP checks, map, trip fees and same-day rule read them.',
        '- HOURS and AVAILABILITY drive the open/closed status, the emergency line and the visit windows, in BUSINESS.timezone. The windows are requests the office confirms, not live bookings; never describe them as guaranteed appointments unless a real booking backend is added.',
        '- ENQUIRY is where requests go: endpoint (a JSON POST) if set, otherwise an email to ENQUIRY.email or BUSINESS.email. Ask the user for their own destination; never leave example.com in a published site.',
        '- The reviews, rating, review count, jobs, license number and photos are placeholders, and SAMPLE_CONTENT = true labels them on the page. Never invent reviews, ratings, licenses, certifications, warranties or job details for the user\'s real business; ask for real ones, or remove what they do not have. Set SAMPLE_CONTENT to false only once those are the user\'s own.',
        '- Keep the gas smell answer telling people to leave and call the gas company or 911. Keep the call button easy to reach on a phone, including the bar fixed to the bottom of small screens.',
    ].join('\n'),

    page: {
        title: 'HVAC Business Website Template, Free to Edit With AI',
        description:
            'A one-page website for an HVAC company, with a service request form that shows the fee and next visit window, live opening hours, service zones and job photos.',
        ogTagline: 'An HVAC website that shows the price and the next visit',
        lead:
            'A one-page site for a local heating and cooling company, in the classic navy and orange look of an established trade business. The service request form sits next to the intro: a visitor picks the problem and enters a ZIP code, and sees whether you cover them, the fee that applies and the next visit window, then sends it to your own email or form service. The page also shows your AC and heating services with prices, your terms and maintenance plan, recent jobs, reviews, the towns you serve and whether you are open right now. Copy it, then describe your business and the page changes to fit.',
        features: [
            { icon: 'wrench', title: 'Request form that quotes the fee', body: 'A visitor picks no heat, no cooling, a leak or another problem, enters a ZIP code and sees the fee and the first visit window before sending. A gas smell gets safety steps instead.' },
            { icon: 'clock', title: 'Open now and emergency line', body: 'Opening hours, holidays and the after-hours line are worked out in your timezone, so the page says whether you are open right now.' },
            { icon: 'mapPin', title: 'Service zones and trip fees', body: 'A map and list of the towns you cover, split into a same-day zone and an extended zone with a trip fee.' },
            { icon: 'receipt', title: 'Services with prices', body: 'Air conditioning and heating cards with repair, replacement and maintenance rows, plus your terms and maintenance plan, all quoted from one place.' },
            { icon: 'camera', title: 'Jobs with the problem and the fix', body: 'Each job shows the town, the month, what was wrong and what was done. Swap the stock photos for your own.' },
            { icon: 'mail', title: 'Requests go where you choose', body: 'The booking form opens an email to your address, or posts to a form service or backend of your own.' },
        ],
        faq: [
            {
                q: 'Where do booking requests go?',
                a: [
                    'As copied, the form opens the visitor’s email app with a message to the address you set. Add a form endpoint and it posts there instead, or ask the builder to save requests and it adds a private page where you read them.',
                ],
            },
            {
                q: 'Does it book real appointments?',
                a: [
                    'No. The visit windows come from your opening hours, and a visitor requests one. Your office confirms it by phone. It does not connect to scheduling software such as ServiceTitan or Housecall Pro.',
                ],
            },
            {
                q: 'Are the reviews and photos real?',
                a: [
                    'No. The business, reviews, rating, jobs and license number are placeholders, and the photos are free stock images. The page labels them as samples until you replace them.',
                ],
            },
        ],
    },
};
