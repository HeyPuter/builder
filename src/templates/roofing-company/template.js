// A one-page site for a residential roofing contractor: an instant roof
// estimator with a live elevation drawing, a storm damage check, recent
// projects, warranty, reviews, FAQ and an inspection request form.

export default {
    slug: 'roofing-company',
    name: 'Roofing Company',
    category: 'Website',
    description: 'A roofing contractor site with an instant roof estimator, a live color preview, a storm damage check and inspection booking.',
    updated: '2026-10-15',
    workers: [],
    suggestions: [
        {
            label: 'Use my business details',
            prompt: 'Replace Slatewright Roofing with my company\'s name, phone, email, license number, address and service towns everywhere on the page. Here they are:',
        },
        {
            label: 'Set my prices',
            prompt: 'Update the roof estimator with my installed price per square for each material, my tear-off price per layer, and my permit and disposal fee.',
        },
        {
            label: 'Show monthly payments',
            prompt: 'Under the estimate, show the monthly payment for the current price range on 12-month, 5-year and 10-year financing terms.',
        },
        {
            label: 'Add a gutter estimate',
            prompt: 'Add seamless gutters and gutter guards to the estimator, priced per linear foot from the house footprint, with their own color choices.',
        },
        {
            label: 'Keep a list of requests',
            prompt: 'Save every inspection request to my account and add a private page where I can see new requests and mark them as scheduled.',
        },
    ],
    instructions: [
        'This is a one-page website for a roofing contractor: index.html, styles.css, app.js and photos/.',
        'Business details, estimator prices, materials and their colors, roof shapes, pitch and height surcharges and the storm check items are plain data at the top of app.js (BUSINESS, MATERIALS, SHAPES, PRICING, STORM_SIGNS, VERDICTS). Change that data rather than the code below it.',
        'The phone number, email, license number, address and service towns are also written in index.html. When the user changes one, update every place it appears in both files.',
        'The hero photos are the .hero-slide images in index.html, one numbered .pager-dot button each; add or remove both together. The quick price card under the hero fills in the estimator and lists the materials from MATERIALS.',
        'The estimator drawing is SVG built by drawHouse() in app.js, placed in a 600 x 470 space with a viewBox that zooms to fit the house. Keep new shapes on or near the house so they stay in frame, and give a new material a texture pattern in index.html whose id is tex-<texture>.',
        'The request form posts JSON to BUSINESS.formEndpoint when it is set; otherwise it writes the request into the visitor\'s email app, addressed to BUSINESS.email. Do not tell the user requests are saved or delivered anywhere else unless you build that.',
        'The prices are illustrative. When the user gives their own, replace them and keep the note under the price.',
    ].join('\n'),
    page: {
        title: 'Roofing company website template with an instant estimate',
        description: 'A roofing contractor website with a roof price estimator, a live drawing of the house, a storm damage check and inspection booking. Copy it and make it yours.',
        ogTagline: 'A roofing site that prices the roof while visitors watch.',
        features: [
            {
                title: 'Instant roof estimator',
                body: 'Footprint, stories, roof shape, pitch, layers to tear off and material become squares, days on site and a price range with a line by line breakdown.',
            },
            {
                title: 'A drawing that follows along',
                body: 'A front elevation of the house redraws as visitors change the pitch, shape, stories, material and color, with drafting-style dimensions.',
            },
            {
                title: 'Every material side by side',
                body: 'The same roof priced in architectural shingle, impact-rated shingle, standing-seam metal and synthetic slate, one click apart.',
            },
            {
                title: 'Storm damage check',
                body: 'Visitors tick what they can see from the ground and get a clear next step: call now for a tarp, book an inspection this week, or keep an eye on it.',
            },
            {
                title: 'Proof that wins the job',
                body: 'Recent projects with material, color and area, a warranty panel, reviews, service towns with inspection lead times, and an FAQ.',
            },
            {
                title: 'Inspection booking',
                body: 'A request form that carries the online estimate and storm notes along, sent to a form service or written out in the visitor\'s email app.',
            },
        ],
        faq: [
            {
                q: 'Can I use my own prices and materials?',
                a: ['Yes. Prices per square, tear-off, permit fees, pitch and height surcharges, materials and their colors are plain data at the top of app.js. Ask the builder to change them, or edit them yourself.'],
            },
            {
                q: 'Where do inspection requests go?',
                a: ['Until you connect a form service, the form writes each request into the visitor\'s email app, addressed to you. Give the builder a form endpoint, or ask it to save requests to your Puter account, and they arrive without the email step.'],
            },
            {
                q: 'Does it work on phones?',
                a: ['Yes. Every section stacks on small screens, and a call and booking bar stays at the bottom of the screen, where most storm-night visitors will be.'],
            },
        ],
    },
};
