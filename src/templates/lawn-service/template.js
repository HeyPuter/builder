// Lawn service: a one-page static site for a local lawn care business, with no
// backend. Business details, towns and crew days, prices, services, job photos,
// reviews and FAQ are plain data at the top of files/app.js. Photos are CC0
// stock (rawpixel, StockSnap, WordPress Photo Directory) standing in for the
// business's own job photos. See src/templates/index.js for the shape.
export default {
    slug: 'lawn-service',
    name: 'Lawn Care Business',
    category: 'Website',
    description: 'A one-page site for a local lawn care business, with a price checker, service area map and enquiry form.',
    updated: '2026-10-10',
    workers: [],

    suggestions: [
        { label: 'Make it my business', prompt: 'Change the business name, phone, email, hours, address, license and the towns, ZIP codes and crew days we cover to mine. Here are my details: ' },
        { label: 'Use my job photos', prompt: 'Replace the stock photos with my own job photos. I will upload them, and tell you the job, town and month for each.' },
        { label: 'Set my prices', prompt: 'Update the lawn sizes, mowing prices for each plan and the "from" price of each service to my prices: ' },
        { label: 'Save enquiries', prompt: 'Make the enquiry form save each message instead of opening an email, and add a private page where only I can read them, filtered by service.' },
        { label: 'Add before and after', prompt: 'Add a before and after slider to the recent jobs section. I will upload a before and an after photo for each job.' },
    ],

    // Kept in every fork's system prompt (see src/templates/index.js).
    instructions: [
        'This project is a website for a local lawn care business. Content lives as data at the top of app.js; keep it there when making changes:',
        '- BUSINESS holds the name, phone, email, hours, address and license, and fills every place they appear. Change contact details there, not in the HTML. When the business, towns or prices change, also update the <title> and meta description in index.html, which are static.',
        '- TOWNS is the service area. The ZIP checks, the map, the town list and the crew days all read it. PLANS and SIZES are the price list the price checker uses.',
        '- Each service names a TEAM member, and the enquiry form sends to that person, or to BUSINESS.email when they have no email. Keep this routing when adding services or people.',
        '- The reviews, the 4.9 rating, the review count, the job photos and the license number are placeholders, and SAMPLE_CONTENT = true labels them as samples on the page. Never invent reviews, ratings, licenses or job details for the user\'s real business; ask for real ones, or remove what they do not have. Set SAMPLE_CONTENT to false only once the reviews, rating and job photos are the user\'s own.',
        '- The photos in photos/ are stock images. Suggest replacing them with real job photos.',
        '- Keep the call, text and price buttons easy to reach on a phone, including the bar fixed to the bottom of small screens.',
    ].join('\n'),

    page: {
        title: 'Lawn Care Business Website Template, Free to Edit With AI',
        description:
            'A one-page website for a lawn care or landscaping business, with a price checker, a service area map with crew days, job photos and an enquiry form.',
        ogTagline: 'A lawn care website that quotes and books',
        lead:
            'A one-page site for a local lawn care business. Visitors enter their ZIP code and lawn size and get a price and a first visit date. The page also shows your services, recent jobs, the towns you cover and the day your crew works each one, and an enquiry form that goes to the right person. Copy it, then describe your business and the page changes to fit.',
        features: [
            { icon: 'calculator', title: 'Price checker in the hero', body: 'A visitor enters a ZIP code, a lawn size and how often, and sees a price per visit and the next date your crew can start.' },
            { icon: 'mapPin', title: 'Service area with crew days', body: 'A map and a list of the towns you cover, each with the weekday your crew works there, and a ZIP code check.' },
            { icon: 'camera', title: 'Recent jobs', body: 'Job photos with the service, town and month, filtered by service. Swap the stock photos for your own.' },
            { icon: 'mail', title: 'Enquiries sent to the right person', body: 'The enquiry form names who handles each service and opens an email to them with the details filled in.' },
            { icon: 'phone', title: 'Call and text on a phone', body: 'On small screens a bar stays at the bottom with call, text and price buttons.' },
            { icon: 'pen', title: 'Content kept in one place', body: 'Business details, towns, prices, services, reviews and questions are plain lists at the top of the script.' },
        ],
        faq: [
            {
                q: 'Where do enquiries go?',
                a: [
                    'As copied, the form opens the visitor’s email app with a message to the person who handles that service. Ask the builder to save enquiries instead and it adds a private page where you read them.',
                ],
            },
            {
                q: 'Are the reviews and photos real?',
                a: [
                    'No. The business, the reviews and the rating are placeholders, and the photos are free stock images. Replace them with your own reviews and job photos before you publish.',
                ],
            },
            {
                q: 'Does it work for landscaping or snow removal?',
                a: [
                    'Yes. Describe what you offer and the builder changes the services, prices and wording. The price checker and service area work the same way for any service with set routes.',
                ],
            },
        ],
    },
};
