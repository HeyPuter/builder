// Real estate agent: a one-page static site for an agent's own business, with
// no backend. Agent details, listings, neighborhoods, reviews, sales and FAQ
// are plain data at the top of files/app.js, and SECTIONS switches parts of the
// page off. Photos are CC0 stock (StockSnap) standing in for the agent's own
// headshot and listing photos. See scripts/build-templates.mjs for the shape.
export default {
    slug: 'real-estate-agent',
    name: 'Real Estate Agent Website',
    category: 'Website',
    description: 'Show your listings and book clients as a real estate agent.',
    updated: '2026-10-12',
    workers: [],

    suggestions: [
        { label: 'Make it my business', prompt: 'Change the agent name, brokerage, license numbers, phone, email, office, service area and specialty to mine. Here are my details: ' },
        { label: 'Add my listings', prompt: 'Replace the sample listings with my own. I will upload the photos and give you the address, price, status, beds, baths, square feet and listing link for each.' },
        { label: 'Use my booking link', prompt: 'Make every "Book a consultation" button open my booking page: ' },
        { label: 'Set my neighborhoods', prompt: 'Replace the five sample neighborhoods with the areas I work in, with my own median prices, typical homes and the tip I give buyers for each: ' },
        { label: 'Save enquiries', prompt: 'Make the contact form save each message instead of opening an email, and add a private page where only I can read them, filtered by buying or selling.' },
    ],

    // Kept in every fork's system prompt (see scripts/build-templates.mjs).
    instructions: [
        'This project is a website for a real estate agent. Content lives as data at the top of app.js; keep it there when making changes:',
        '- AGENT holds the name, brokerage, license numbers, phone, email, office, area and specialty, and fills every place they appear. Change them there, not in the HTML. When they change, also update the <title> and meta description in index.html, which are static.',
        '- AGENT.bookingUrl drives every "Book a consultation" button. When it is empty the buttons open the enquiry form. Keep the buttons prominent, including the bar fixed to the bottom of small screens.',
        '- SECTIONS turns sections off, and a section with an empty list hides itself and its menu link. To remove a section (for example a new agent with no listings or reviews yet), set it to false or empty its list rather than deleting the HTML.',
        '- The stats, listings, neighborhood figures, testimonials, recent sales, license numbers and headshot are placeholders, and SAMPLE_CONTENT = true labels them as samples on the page. Never invent reviews, sales figures, prices, licenses or credentials for the user\'s real business; ask for real ones, or remove what they do not have. Set SAMPLE_CONTENT to false only once these are the user\'s own.',
        '- Keep the brokerage name, license numbers and the fair housing line in the footer, since many places require them on agent websites. Change the wording only to match the user\'s brokerage or local rules.',
        '- The photos in photos/ are stock images. Suggest replacing them with the agent\'s headshot and real listing photos.',
    ].join('\n'),

    page: {
        title: 'Free Real Estate Agent Website Template to Edit With AI',
        description:
            'Real estate agents get a site for featured listings, neighborhood guides, recent sales and client reviews, with a button to book a consultation.',
        ogTagline: 'A real estate agent site that books consultations',
        features: [
            { icon: 'home', title: 'Featured properties', body: 'A carousel of your listings with price, status, beds, baths and square feet, filtered by for sale, under offer and sold. Each one has an enquiry button.' },
            { icon: 'mapPin', title: 'Neighborhood guides', body: 'Each area you serve gets a median price, typical home, time to sell, commute and the advice you give buyers there.' },
            { icon: 'calendar', title: 'Book a consultation', body: 'The button sits in the menu, the hero, the footer and a bar on phones. Point it at your Calendly or other booking page, or let it open the form.' },
            { icon: 'star', title: 'Client proof', body: 'Testimonials and a table of recent sales showing the neighborhood, the price, whether you represented the buyer or the seller, and days on market.' },
            { icon: 'sliders', title: 'Sections you can remove', body: 'New agent with no listings or reviews yet? Switch a section off and its menu link goes with it.' },
            { icon: 'mail', title: 'Enquiry form', body: 'Visitors say whether they want to buy, sell or relocate, pick a listing and their timeline, and the form opens an email to you with it all filled in.' },
        ],
        faq: [
            {
                q: 'Are the listings, reviews and sales real?',
                a: [
                    'No. The agent, the listings, the neighborhoods, the reviews and the sales figures are placeholders, and the photos are free stock images. The page labels them as samples until you replace them with your own.',
                ],
            },
            {
                q: 'Can I connect my booking calendar?',
                a: [
                    'Yes. Give the builder your Calendly, Cal.com or other booking link and every Book a consultation button opens it. Without a link, the buttons open the enquiry form with a consultation picked.',
                ],
            },
            {
                q: 'Can it pull listings from the MLS automatically?',
                a: [
                    'Not as copied. Listings are a short list you edit, each with an optional link to the full listing on your brokerage or MLS site. Ask the builder to add or update a listing and it changes the list.',
                ],
            },
        ],
    },
};
