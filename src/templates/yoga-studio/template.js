// Yoga studio website: a rooftop studio's site built around the hours of a
// day, with a working week timetable, mat reservations and waitlists, passes,
// teachers, opening hours and a guided breathing exercise. Plain HTML, CSS and
// JavaScript; all content lives as data at the top of app.js.
export default {
    slug: 'yoga-studio',
    name: 'Yoga Studio',
    category: 'Website',
    description: 'A yoga studio site with a live weekly timetable, mat booking and waitlists, passes, teachers and hours.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        { label: 'Use my studio details', prompt: 'Replace the studio name, address, phone, email, opening hours and location with my own studio\'s details. Ask me for anything you need.' },
        { label: 'Change the timetable', prompt: 'Update the weekly timetable with my real classes, teachers and mat counts. Ask me for my schedule first.' },
        { label: 'Add a workshops page', prompt: 'Add a workshops and retreats section with dates, prices and a sign-up form, styled to match the rest of the site.' },
        { label: 'Save bookings online', prompt: 'Store mat reservations and waitlists in a real backend so the studio can see who booked each class, instead of only on the visitor\'s device.' },
        { label: 'Try a cooler palette', prompt: 'Recolour the site around a cool sea-blue morning instead of warm sunrise oranges, keeping the dawn-to-night idea.' },
    ],
    instructions: [
        '- All studio content (details, hours, class styles, teachers, the weekly timetable, prices and FAQ) lives as plain data at the top of app.js. Change content there rather than in the HTML.',
        '- The page runs from dawn at the top to night at the bottom: each section\'s top background colour matches the previous section\'s bottom colour. Keep that chain intact when adding or reordering sections.',
        '- Times on the timetable, sunrise/sunset and "open now" are in STUDIO.timeZone, not the visitor\'s time zone.',
    ].join('\n'),
    page: {
        title: 'Yoga Studio Website Template with Timetable & Booking',
        description: 'A free yoga studio website template with a weekly class timetable, mat reservations and waitlists, passes, teachers and opening hours. Edit it with AI.',
        ogTagline: 'A yoga studio site with a timetable and mat booking',
        features: [
            { title: 'A timetable people can book from', body: 'Seven days ahead, filtered by class style or for beginners, with mats left on every class. Full classes switch to a waitlist.' },
            { title: 'Reservations that remember', body: 'Visitors reserve a mat, add it to their calendar, and see or cancel their bookings under Your mat.' },
            { title: 'Passes and memberships', body: 'A price list with an intro offer. Choosing a pass holds it under the visitor\'s name with a start date.' },
            { title: 'Teachers, hours and first-visit answers', body: 'Each teacher shows their next class, the hours show whether the studio is open right now, and a short FAQ covers a first visit.' },
            { title: 'Sunrise built in', body: 'Today\'s sunrise and sunset are worked out for the studio\'s location and shown on the timetable\'s day bar.' },
            { title: 'Content as plain data', body: 'Classes, teachers, prices and hours are simple lists at the top of one file, so changing them is a single sentence to the builder.' },
        ],
        faq: [
            { q: 'Does it take real bookings?', a: ['Reservations are saved in the visitor\'s browser, so the whole flow works the moment you copy it. Ask the builder to store them in a backend when you want to see every booking yourself.'] },
            { q: 'Can I change the classes and times?', a: ['Yes. The weekly timetable is a short list of start times, class styles, teachers and mat counts. Describe your schedule and the builder rewrites it.'] },
            { q: 'Will it work for a studio that is not on a roof?', a: ['Of course. The dawn-to-night colours suit any studio, and the name, photos and copy are yours to change.'] },
        ],
    },
};
