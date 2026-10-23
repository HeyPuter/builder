export default {
    slug: 'dog-walking',
    name: 'Dog Walking & Pet Sitting',
    category: 'Website',
    description: 'A loud, street-poster site for a dog walker or pet sitter, with a price timetable, area checker and booking.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        {
            label: 'Use my business name',
            prompt: 'Rename the business everywhere on the page to my business name, and update the phone number, email and neighbourhoods we cover. I will tell you the details.',
        },
        {
            label: 'Change my prices',
            prompt: 'Update the services timetable with my own services, durations and prices, and keep the 10-visit pack discount working with the new numbers.',
        },
        {
            label: 'Add my walkers',
            prompt: 'Replace the walkers in "The Pack" section with my own team. I will give you their names, how long they have walked dogs and a line about each.',
        },
        {
            label: 'Email me bookings',
            prompt: 'When someone sends a booking request, email the details to me as well as showing them their ticket, so I never miss a request.',
        },
        {
            label: 'Try a new colour',
            prompt: 'Swap the hi-vis orange accent for a different bold colour that suits my brand, and make sure text on it stays easy to read.',
        },
    ],
    instructions: 'This is a dog walking and pet sitting site. All business content (name, contact details, hours, services and prices, service areas, walkers, walk reports, reviews, FAQ, booking slots) lives as plain data at the top of app.js; change content there rather than hard-coding it into index.html. Keep the hi-vis orange single-accent palette, the condensed display type and the dotted GPS-route motif unless the user asks for a different look. Booking requests are saved in the visitor\'s browser (localStorage) until a backend is added.',
    page: {
        title: 'Dog walking & pet sitting website template',
        description: 'A bold website for a dog walker or pet sitter, with a price timetable, service-area checker, sample walk reports, your walkers and a working booking form.',
        ogTagline: 'A street-poster website for dog walkers and pet sitters.',
        features: [
            { title: 'Services timetable', body: 'Walks, drop-ins, puppy visits and overnight sitting, shown like a departures board, with a switch between single visits and a discounted 10-visit pack.' },
            { title: 'Service-area checker', body: 'Visitors type their postcode or neighbourhood and see straight away whether you cover their street and which days you walk there.' },
            { title: 'Booking requests', body: 'Pick a service, a day and a free slot, add the dog, see the price, and get a ticket with a reference. Visitors can review or cancel their requests.' },
            { title: 'Walk reports', body: 'A sample "pupdate" with the route on a mini map, time, distance and notes, so owners see what they get after every walk.' },
            { title: 'Your walkers and reviews', body: 'Meet the team, read reviews from owners and the rules every walk follows: insurance, first aid, key handling and small groups.' },
            { title: 'Easy to change', body: 'Every name, price, slot and area is plain data at the top of one file, so the builder can update your details in seconds.' },
        ],
        faq: [
            { q: 'Can I change the services and prices?', a: ['Yes. Ask the builder to update the timetable with your own services, durations and prices. The pack discount and the booking total follow the new numbers.'] },
            { q: 'Where do booking requests go?', a: ['Out of the box they are saved in the visitor\'s browser and shown as a ticket. Ask the builder to email them to you or store them in a database when you are ready.'] },
            { q: 'Does it work for cat sitting too?', a: ['Yes. The drop-in and overnight services cover cats and other pets, and you can ask the builder to add more services or rename them.'] },
        ],
    },
};
