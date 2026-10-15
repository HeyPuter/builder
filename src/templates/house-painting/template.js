export default {
    slug: 'house-painting',
    name: 'House Painting Company',
    category: 'Website',
    description: 'A painting contractor site with a price estimator, a color visualizer, recent work and walkthrough booking.',
    updated: '2026-10-15',
    workers: [],
    suggestions: [
        { label: 'Use my business details', prompt: 'Change the business name, phone number, license number and service area towns to mine: ' },
        { label: 'Set my prices', prompt: 'Update the estimator rates to match my pricing: interior walls per square foot, exterior per square foot of home, and cabinets per door or drawer.' },
        { label: 'Use my paint brand colors', prompt: 'Replace the color studio palette with real colors from my favorite paint brand, with their names and codes, and update the schemes to match.' },
        { label: 'Add a before and after slider', prompt: 'Add a before and after slider to the recent work section so visitors can drag between the old and the new paint on a project.' },
    ],
    instructions: [
        '- Business details, the paint palette, the color studio scenes and schemes, and the estimator rates are plain data at the top of app.js. Change them there instead of hard-coding values elsewhere.',
        '- The page text, services, projects, process, reviews and FAQ are written in index.html. Keep the "from" prices on the service cards in line with the rates in app.js.',
        '- The color studio recolors inline SVG scenes through CSS variables named --c-<surface>, set on each scene\'s <svg>. A new paintable part is a group with data-surface="<surface>" whose shapes use the matching fill class, plus an entry in that scene\'s surfaces list.',
        '- Keep the estimator honest: it shows a price range with its line items and says the final price comes after a free walkthrough.',
        '- The photos in photos/ are CC0 stock. Replace them with the business\'s own job photos when the user provides them.',
    ].join('\n'),
    page: {
        title: 'House Painting Company Website Template with Color Visualizer',
        description: 'A house painting company website with an instant price estimator, a room and house color visualizer, recent work and a walkthrough booking form.',
        ogTagline: 'Estimator, color studio and booking for painters',
        features: [
            {
                title: 'Instant price estimator',
                body: 'Interior rooms, exteriors and cabinets, each priced from rates you set. Visitors see a range, days on site, gallons of paint and every line item.',
            },
            {
                title: 'Color studio',
                body: 'Visitors repaint the walls, trim, ceiling and door of a living room, or the siding, trim, door and shutters of a house, from your palette or a ready scheme.',
            },
            {
                title: 'Requests that carry the details',
                body: 'The estimate and the chosen colors travel with the walkthrough request, to your inbox or to a form endpoint you set.',
            },
            {
                title: 'Services as paint chips',
                body: 'Six services on paint-chip cards, each with a starting price and a button that opens the estimator set up for that job.',
            },
            {
                title: 'Recent work',
                body: 'A project gallery that filters by interiors, exteriors and cabinets, with blue-tape labels, days on site and the colors used.',
            },
            {
                title: 'Process, promise and FAQ',
                body: 'A five-step process that ends in a blue-tape walkthrough, a warranty band, reviews and answers to what homeowners ask before booking.',
            },
        ],
        faq: [
            {
                q: 'Can I change the prices and the paint colors?',
                a: ['Yes. The rates, the palette, the color schemes and your business details are plain data at the top of app.js. You can also ask the builder, for example "charge $3 a square foot for exteriors".'],
            },
            {
                q: 'Where do walkthrough requests go?',
                a: ['By default the form opens the visitor\'s email app addressed to you, with the estimate and colors filled in. Set a form endpoint in app.js and requests are posted there instead.'],
            },
            {
                q: 'Can I use the photos?',
                a: ['Yes. They are CC0 photos from StockSnap and the WordPress Photo Directory. Swap in photos of your own jobs whenever you are ready.'],
            },
        ],
    },
};
