export default {
    slug: 'wedding-photography',
    name: 'Wedding Photographer',
    category: 'Website',
    description: 'An editorial site for a wedding photographer, with contact-sheet galleries, a coverage planner and a date checker.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        {
            label: 'Use my name and photos',
            prompt: 'Change the photographer name everywhere to mine, and replace the stories in the contact sheets with my own weddings. I will upload the photos.',
        },
        {
            label: 'Update my prices',
            prompt: 'Update the hourly rate, base fee, add-ons and travel fees in the planner to my real prices, and make sure the three collections still add up.',
        },
        {
            label: 'Mark my booked dates',
            prompt: 'Update the availability calendar with my booked and on-hold dates for the next two years. I will paste the list.',
        },
        {
            label: 'Add a videography add-on',
            prompt: 'Add a short wedding film as an add-on in the coverage planner, with its own price and a line in the FAQ explaining what is included.',
        },
    ],
    instructions: [
        '- All content (names, stories, prices, add-ons, travel fees, booked and held dates, letters, FAQ) lives as plain data at the top of app.js. Change it there, not in the rendered HTML.',
        '- Collection prices are computed from RATES and ADDONS. Keep the price list and the coverage planner on the same numbers.',
        '- Keep the look: bone paper, ink and one oxblood accent, Instrument Serif with DM Mono labels, and the dark film-strip contact sheets with the circled pick.',
    ].join('\n'),
    page: {
        title: 'Wedding Photographer Website Template | Puter Builder',
        description: 'A free wedding photographer website template with film contact-sheet galleries, a coverage planner with live pricing, a date checker and an inquiry form.',
        ogTagline: 'Contact sheets, coverage planner, date checker',
        features: [
            {
                title: 'Galleries as contact sheets',
                body: 'Each wedding is a dark film strip with frame numbers and the couple\'s favourite frame circled. Tap any frame to open a full-screen viewer with keyboard and swipe navigation.',
            },
            {
                title: 'A coverage planner with live prices',
                body: 'Couples slide a coverage window across a typical wedding day, see which moments they would miss, add extras and travel, and get an estimate they can send with their inquiry.',
            },
            {
                title: 'Is your date free?',
                body: 'A year of Saturdays shown as dots, booked, on hold or open, plus a date picker for any day. Picking a date fills it into the inquiry form.',
            },
            {
                title: 'Collections, letters and an inquiry form',
                body: 'A typographic price list, letters from past couples, an FAQ and an inquiry form that checks its fields and confirms the date status in its reply.',
            },
        ],
        faq: [
            {
                q: 'Can I use my own photographs?',
                a: ['Yes. Upload your photos and ask the builder to swap them into the hero and the contact sheets. Every story, caption and alt text is plain data at the top of the script.'],
            },
            {
                q: 'Does the inquiry form send email?',
                a: ['Out of the box it checks the fields and shows a confirmation. Ask the builder to deliver inquiries to your inbox or save them in a database when you are ready.'],
            },
            {
                q: 'How do I change my prices and booked dates?',
                a: ['Tell the builder your rates, add-ons, travel fees and booked dates in plain language. The price list, the planner and the calendar all update from the same data.'],
            },
        ],
    },
};
