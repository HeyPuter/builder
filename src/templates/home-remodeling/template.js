// Home remodeling: a one-page static site for a design-build remodeling
// company, with no backend. Business details, rooms and prices, finish levels,
// structural extras, schedule, the before and after project, recent projects,
// steps, reviews, FAQ, towns and where visit requests go are plain data at the
// top of files/app.js. Photos are CC0 stock (StockSnap, rawpixel, Wikimedia
// Commons) standing in for the business's own project photos. See
// scripts/build-templates.mjs for the shape.
export default {
    slug: 'home-remodeling',
    name: 'Home Remodeling Website',
    category: 'Website',
    description: 'Home remodelers use this to show past projects and price new ones.',
    updated: '2026-10-15',
    workers: [],

    suggestions: [
        { label: 'Make it my business', prompt: 'Change the business name, phone, email, address, showroom hours, license, warranty and the towns and ZIP codes we cover to mine. Here are my details: ' },
        { label: 'Set my prices', prompt: 'Update the room sizes, cost ranges and build weeks in the planner, the finish levels and the structural extras to match what my projects really cost: ' },
        { label: 'Use my project photos', prompt: 'Replace the stock photos and sample projects with my own. I will upload the photos and tell you the room, town, weeks on site and budget for each.' },
        { label: 'Add before and afters', prompt: 'Give every project a before photo and a before and after toggle like the featured kitchen. I will upload the before photos.' },
        { label: 'Save visit requests', prompt: 'Make the design visit form save each request, with the planner details, instead of opening an email, and add a private page where only I can see them.' },
    ],

    // Kept in every fork's system prompt (see scripts/build-templates.mjs).
    instructions: [
        'This project is a website for a home remodeling (design-build) company. Content lives as data at the top of app.js; keep it there when making changes:',
        '- BUSINESS holds the name, phone, email, address, hours, license, warranty years and the hero figures, and fills every place they appear. Change contact details there, not in the HTML. When the business, towns or prices change, also update the <title> and meta description in index.html, which are static.',
        '- ROOMS, FINISHES, EXTRAS and SCHEDULE drive the room list and the project planner. The planner shows a price range and a timeline, never a quote; keep the wording that the fixed price comes after the design visit.',
        '- BEFORE_AFTER is the featured project. Its two photos must be the same room before and after the work; never pair photos of different rooms.',
        '- ENQUIRY is where visit requests go: endpoint (a JSON POST) if set, otherwise an email to ENQUIRY.email or BUSINESS.email. Ask the user for their own destination; never leave example.com in a published site.',
        '- The reviews, rating, review count, years, rooms finished, projects, budgets and license number are placeholders, and SAMPLE_CONTENT = true labels them on the page. Never invent reviews, ratings, licenses, awards, warranties or project details for the user\'s real business; ask for real ones, or remove what they do not have. Set SAMPLE_CONTENT to false only once those are the user\'s own.',
        '- The photos in photos/ are stock images. Suggest replacing them with the business\'s own project photos.',
        '- Keep the call and book buttons easy to reach on a phone, including the bar fixed to the bottom of small screens.',
    ].join('\n'),

    page: {
        title: 'Free Home Remodeling Website Template to Edit With AI',
        description:
            'Homeowners price a room, see the timeline and book a design visit on this website for remodeling contractors, next to a before and after.',
        ogTagline: 'A remodeling website that prices the project',
        features: [
            { icon: 'calculator', title: 'Project planner with a price range', body: 'A visitor chooses the room, size, finish and extras such as moving a wall, and sees what similar projects cost, on a scale for that room.' },
            { icon: 'calendar', title: 'Timeline from visit to walkthrough', body: 'Design, permit, crew wait, build and walkthrough as a week-by-week bar chart, and roughly when the room could be finished.' },
            { icon: 'camera', title: 'Before and after', body: 'A featured project with a toggle between the before and after photos, plus recent projects with the town, weeks on site and budget.' },
            { icon: 'home', title: 'Rooms with starting prices', body: 'An index of the rooms you remodel, each with a "from" price and build time, that opens the room in the planner.' },
            { icon: 'mail', title: 'Design visit requests', body: 'The request form carries the planner details along with it, and opens an email to you or posts to a form service of your own.' },
            { icon: 'pen', title: 'Content kept in one place', body: 'Business details, rooms, prices, projects, steps, reviews and questions are plain lists at the top of the script.' },
        ],
        faq: [
            {
                q: 'Does the planner give real quotes?',
                a: [
                    'No. It shows a range from the cost figures you set for each room, finish and extra, and says the fixed price comes after the design visit. Ask the builder to change the figures to what your projects cost.',
                ],
            },
            {
                q: 'Where do visit requests go?',
                a: [
                    'As copied, the form opens the visitor’s email app with a message to the address you set, including what they chose in the planner. Add a form endpoint and it posts there instead, or ask the builder to save requests and it adds a private page where you read them.',
                ],
            },
            {
                q: 'Are the projects and reviews real?',
                a: [
                    'No. The business, reviews, rating, projects and license number are placeholders, and the photos are free stock images. The page labels them as samples until you replace them.',
                ],
            },
        ],
    },
};
