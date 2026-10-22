export default {
    slug: 'pet-grooming',
    name: 'Pet Grooming Salon',
    category: 'Website',
    description: 'A splashy one-page site for a dog and cat groomer, with prices by size and coat, online booking and a "ready for pickup" tracker.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        { label: 'Use my salon details', prompt: 'Replace the salon name, address, phone, email, hours and social handle with my own details: ' },
        { label: 'Change my prices', prompt: 'Update the services and add-ons on the price menu to match my price list, keeping prices by dog size and coat: ' },
        { label: 'Send bookings to me', prompt: 'Send every booking to my email so I get each appointment request, and show the customer a confirmation once it is sent.' },
        { label: 'Add mobile grooming', prompt: 'Add a mobile grooming van service: a section explaining it, the neighborhoods we cover with a travel fee, and an option for it in the booking form.' },
        { label: 'Add gift cards', prompt: 'Add a gift card section where people can pick an amount and a design, write a message, and send a request to buy it.' },
    ],
    instructions: 'The salon content (details, hours, sizes, coats, services and prices, add-ons, groomers, visit stages, regulars, reviews, first-visit tips, policies and FAQ) is plain data at the top of app.js; change it there rather than in the HTML. The dog\'s name typed in the hero is reused across the page through data-dog-name and data-name-echo, so keep those hooks when editing. Bookings are saved in the visitor\'s browser and can also be POSTed to SHOP.bookingEndpoint. Photos in photos/ are CC0 from the WordPress Photo Directory.',
    page: {
        title: 'Pet Grooming Salon Website Template',
        description: 'A website for a dog and cat grooming salon: prices by size and coat, online booking with a claim ticket, and a tracker that shows when the dog is ready.',
        ogTagline: 'Prices by size and coat, online booking and a pickup tracker for groomers.',
        features: [
            { title: 'Your dog\'s name in the headline', body: 'Visitors type their dog\'s name into the hero and it follows them through the page: the price menu, the tracker and the booking form.' },
            { title: 'Prices by size and coat', body: 'Pick a size from five dog silhouettes and a coat type, and every service on the menu shows its price and time for that dog. Add-ons are listed with their prices.' },
            { title: 'Booking in one sentence', body: 'Service, dog, size, coat, groomer and date read as a sentence. Open drop-off times depend on the service length, the groomer\'s days and what is already booked.' },
            { title: 'A claim ticket', body: 'Each booking prints a ticket with a claim number, drop-off and pickup times and the estimate, with buttons to add it to a calendar, email the salon or cancel.' },
            { title: '"Is my dog ready?" tracker', body: 'Customers enter their claim number and see which of the five grooming stations their pet is at and roughly when to come back.' },
            { title: 'Cats, first visits and policies', body: 'Quiet hours for cats, what to bring the first time, vaccine requirements, plain-language policies, reviews, an FAQ and live open or closed hours.' },
        ],
        faq: [
            { q: 'Where do bookings go?', a: ['They are saved on the visitor\'s device and shown on their ticket. Set a booking endpoint in app.js, or ask the builder to email bookings to you, to receive them.'] },
            { q: 'Can I change the services and prices?', a: ['Yes. Sizes, coat types, services, prices, times and add-ons are a short list at the top of app.js, or just describe your price list to the builder.'] },
            { q: 'Does it work for cats only, or mobile groomers?', a: ['Yes. Rename the services and change the copy, or ask the builder to add a mobile grooming area and travel fee.'] },
        ],
    },
};
