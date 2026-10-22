export default {
    slug: 'physical-therapy',
    name: 'Physical Therapy Clinic',
    category: 'Website',
    description: 'A bold landing page for a physical therapy clinic, with a clickable body map, online booking, an insurance checker and live opening hours.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        { label: 'Use my clinic details', prompt: 'Replace the clinic name, address, phone, email and opening hours with my clinic\'s details. Ask me for them first.' },
        { label: 'Change the team', prompt: 'Update the team list with my therapists: their names, credentials, what they specialise in and years in practice. Ask me for the details.' },
        { label: 'Edit prices and insurance', prompt: 'Update the visit types, self-pay prices and the list of insurance plans we accept. Ask me for our current rates and plans.' },
        { label: 'Add pelvic health', prompt: 'Add a pelvic health area to the body map and booking chips, with its own typical plan length, common conditions and therapist.' },
        { label: 'Send booking requests', prompt: 'Make the booking form send each appointment request to me by email instead of only saving it in the visitor\'s browser.' },
    ],
    instructions: [
        '- All content (clinic details, hours, body map areas, recovery track, team, visit types, prices, insurers, FAQ) lives as data at the top of app.js. Change content there, not in index.html.',
        '- Keep the look: chalk background, near-black ink, one coral "tape" accent (#ff5a36), condensed Archivo display type with small IBM Plex Mono labels. Do not add new accent colors.',
        '- Sections are numbered as angles (000°, 045°, 090°, 135°, 180°). Keep that sequence if sections are added or removed.',
        '- Body map hotspots use x/y on a 200×400 figure. A new area needs an x/y on the figure and appears in the booking chips automatically.',
        '- Booking requests are saved to localStorage under "aa-requests" and can be downloaded as a calendar file; there is no backend unless the user asks for one.',
    ].join('\n'),
    page: {
        title: 'Physical Therapy Clinic Website Template',
        description: 'A physical therapy clinic website with a clickable body map, online appointment booking, an insurance checker, self-pay prices and live opening hours.',
        ogTagline: 'A bold, working website for a physical therapy clinic',
        features: [
            { title: 'Where does it hurt?', body: 'A clickable body map. Each area shows what the clinic usually treats there, the typical plan length and number of visits, and which therapist sees it most, with a button that starts a booking for that area.' },
            { title: 'Online booking', body: 'Visitors pick a visit type, the area, a day and an open time slot, then leave their details. They get a confirmation with what to bring and can add the appointment to their calendar.' },
            { title: 'Insurance checker and prices', body: 'Type a plan name to see whether it is in network, next to a receipt-style list of self-pay prices.' },
            { title: 'Live opening hours', body: 'The visit section shows whether the clinic is open right now and when it next opens, with today highlighted in the hours table.' },
            { title: 'Recovery plan and team', body: 'A week-by-week track from evaluation to discharge, and a team list with credentials, specialties and years in practice.' },
            { title: 'Easy to edit', body: 'Every detail, from hours and prices to body map areas and FAQ, is plain data at the top of one file.' },
        ],
        faq: [
            { q: 'Do booking requests reach the clinic?', a: ['Out of the box, requests are saved in the visitor\'s browser and can be added to their calendar. Ask the builder to email requests to you or store them in a database, and it adds that.'] },
            { q: 'Can I change the body areas?', a: ['Yes. Each area is a short entry with a label, a position on the figure and its details. Add, remove or edit them, and the booking options follow.'] },
        ],
    },
};
