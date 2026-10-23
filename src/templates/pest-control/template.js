export default {
    slug: 'pest-control',
    name: 'Pest Control Company',
    category: 'Website',
    description: 'A bold field-guide website for a pest control company, with a pest identifier, instant quotes and inspection booking.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        { label: 'Use my business details', prompt: 'Replace the company name, phone number, address, licence number, hours and service-area ZIP codes with my own business details. Ask me for anything you need.' },
        { label: 'Change the pests I treat', prompt: 'Update the pest field guide so it lists only the pests my company treats, with my own treatment notes and starting prices for each.' },
        { label: 'Adjust plan prices', prompt: 'Change the plan prices in the quote builder: tell me the current pricing rules first, then update them to the prices I give you.' },
        { label: 'Add a commercial page', prompt: 'Add a section for commercial customers (restaurants, warehouses, offices) with a separate request form that asks for business name, site size and visit frequency.' },
    ],
    page: {
        title: 'Pest Control Company Website Template, Free to Copy',
        description: 'A pest control website with a clickable pest field guide, a live quote builder, ZIP code service-area check and an inspection booking calendar. Edit it with AI.',
        ogTagline: 'Pest guide, quotes and booking for exterminators',
        features: [
            { title: 'A pest field guide', body: 'Visitors click a pest in the specimen drawer to see the signs to look for, the risk it brings, how you treat it and what it costs to start.' },
            { title: 'Instant quotes', body: 'Pick the pests, the size of the home and a one-off or recurring plan, and the price updates as you go. All prices sit in one list at the top of the code.' },
            { title: 'Service-area check', body: 'A ZIP code box tells visitors straight away whether you cover their address, and offers a call back when you do not.' },
            { title: 'Inspection booking', body: 'A calendar of open slots that respects your opening hours. Booked slots are remembered in the visitor\'s browser and confirmed with a reference number.' },
            { title: 'A guarantee that stands out', body: 'Your re-treatment promise gets a full-width section of its own, next to your licence and insurance details.' },
            { title: 'Reviews and answers', body: 'Customer stories written as case files, and a list of common questions about safety for children and pets, preparation and timing.' },
        ],
        faq: [
            { q: 'Who is this template for?', a: ['Exterminators and pest control companies: general pest, termites, rodents, mosquitoes, bed bugs and wasps. It works for a one-truck operator as well as a company with several crews.'] },
            { q: 'Can I change the pests, prices and ZIP codes?', a: ['Yes. They are plain lists at the top of the page\'s script, so you can edit them yourself or ask the builder to do it for you.'] },
            { q: 'Do bookings and quote requests reach me?', a: ['Out of the box they are saved in the visitor\'s browser and shown back to them. Ask the builder to send them to your email or store them in a database when you are ready to take real bookings.'] },
        ],
    },
};
