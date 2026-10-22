export default {
    slug: 'personal-training',
    name: 'Personal Training Studio',
    category: 'Website',
    description: 'A bold site for a personal trainer or strength studio, with a price builder, a 1RM plate calculator and free-consult booking.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        { label: 'Use my studio details', prompt: 'Replace the studio name, address, phone, email and opening hours with mine. I will paste them in next.' },
        { label: 'Change my prices', prompt: 'Update the training options and prices in the PROGRAMS data to match what I offer. Ask me for each option.' },
        { label: 'Add my coaches', prompt: 'Replace the four coaches with my team: names, roles, specialties and photos. Ask me for the details.' },
        { label: 'Add a class timetable', prompt: 'Add a weekly group-class timetable section after Training, with class names, times and coaches kept as data at the top of app.js.' },
        { label: 'Switch to pounds', prompt: 'Make pounds the default unit across the site: the plate calculator, the logbook results and the board.' },
    ],
    page: {
        title: 'Personal Training Website Template, Free | Puter Builder',
        description: 'A personal training studio website to copy and change with AI: a live price builder, coach roster, client results, a 1RM plate calculator and consult booking.',
        ogTagline: 'Personal training studio website template',
        features: [
            { title: 'Today on the board', body: 'A whiteboard card in the hero shows the session written up for each day of the week, next to a live open-or-closed line from your hours.' },
            { title: 'Price builder', body: 'Visitors pick 1:1, semi-private or online coaching, set sessions per week and see their monthly price before they book.' },
            { title: 'Free-consult booking', body: 'A day and time picker built from your opening hours, a short intake form with goals, and a list of booked consults visitors can cancel.' },
            { title: 'Plate math calculator', body: 'Enter a recent set to estimate a one-rep max, choose a percentage, and see the bar loaded plate by plate in kilograms or pounds.' },
            { title: 'Client logbook', body: 'Results shown as training-log rows, start to now, filterable by lift.' },
            { title: 'Easy to edit', body: 'Hours, prices, coaches, results and FAQs are plain data at the top of app.js, so changes are one line each.' },
        ],
        faq: [
            { q: 'Does the booking form send me an email?', a: ['Not on its own: bookings are saved in the visitor\'s browser so the flow works out of the box. Ask the builder to connect it to email or a backend when you are ready.'] },
            { q: 'Can I use it for a gym or a group-class studio?', a: ['Yes. Rename the training options, change the prices and ask the builder to add a class timetable.'] },
        ],
    },
};
