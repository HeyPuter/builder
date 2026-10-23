export default {
    slug: 'daycare-center',
    name: 'Daycare Center',
    category: 'Website',
    description: 'A playful one-page site for a daycare or preschool, with a room finder, a live daily schedule, a tuition estimator and tour booking.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        { label: 'Use my center\'s details', prompt: 'Replace the name, address, phone, email, hours and license number with my center\'s details. I will paste them below.' },
        { label: 'Change rooms and ages', prompt: 'Update the rooms to match my center: their names, the age ranges, ratios, group sizes and what happens in each one.' },
        { label: 'Set my tuition', prompt: 'Change the tuition so it matches my prices: the monthly price for each room, the part-time days, short days and the sibling discount.' },
        { label: 'Post this week\'s menu', prompt: 'Replace the weekly menu with this week\'s breakfasts, lunches and snacks, and update the calendar with our upcoming closures and events.' },
        { label: 'Send tours to my inbox', prompt: 'Make tour and waitlist requests arrive by email without opening the visitor\'s email app, using a small backend that stores each request and emails me.' },
    ],
    page: {
        title: 'Daycare Center Website Template',
        description: 'A playful website for a daycare or preschool: rooms by age with a birthday room finder, a hopscotch daily schedule, a tuition estimator and tour booking.',
        ogTagline: 'Rooms, schedule, tuition and tour booking for a daycare',
        features: [
            { title: 'Rooms and a room finder', body: 'Each age group gets its own room with ratios, group size, highlights and a starting price. Parents enter a birthday to see which room their child joins and when they move up.' },
            { title: 'The day as a hopscotch', body: 'Every room\'s daily schedule is laid out as a hopscotch, with a stone on what is happening right now in the center\'s own time zone.' },
            { title: 'Tuition estimator', body: 'Families pick a room, days a week, full or short days and a sibling discount, and see a monthly price with every line item. The estimate can be attached to a tour request.' },
            { title: 'Weekly menu and calendar', body: 'This week\'s breakfasts, lunches and snacks, opened on today, plus upcoming closures and events. Past dates hide themselves.' },
            { title: 'Tour booking and waitlist', body: 'Visitors pick a tour day and time, or join the waitlist, then get a confirmation with an add-to-calendar file. Closed days are skipped automatically.' },
            { title: 'Easy to change', body: 'Hours, rooms, schedules, prices, menu, calendar, staff, reviews and FAQ are plain data at the top of app.js. Open-now status and opening hours update on their own.' },
        ],
        faq: [
            { q: 'Where do tour requests go?', a: ['By default they open the visitor\'s email app with everything filled in, addressed to your center. Set a form endpoint in app.js, or ask the builder to add a small backend, and they are sent straight to you instead.'] },
            { q: 'Can I change the rooms and age ranges?', a: ['Yes. Each room is one entry in a list with its name, ages, ratio, group size, shape, color, photo and price. The room finder and tuition estimator use the same list, so they stay in step.'] },
            { q: 'Are the photos free to use?', a: ['Yes. They are CC0 photos from the WordPress Photo Directory, so you can keep them or swap in photos of your own center.'] },
        ],
    },
};
