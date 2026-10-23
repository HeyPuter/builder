export default {
    slug: 'food-truck',
    name: 'Food Truck',
    category: 'Website',
    description: 'A loud one-page site for a taco truck: where it is parked right now, the week\'s route, an order-ahead menu board and catering quotes.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        {
            label: 'Change the cuisine',
            prompt: 'Turn this into a site for my food truck. We serve [cuisine]. Rewrite the menu in app.js with our real dishes, prices and dietary tags, and update the copy to match.',
        },
        {
            label: 'Set our weekly route',
            prompt: 'Update the SCHEDULE in app.js with our real weekly stops: [day, place, address, hours for each]. Keep a day off if we have one.',
        },
        {
            label: 'Send orders to my email',
            prompt: 'When someone sends an order ahead, email it to me with the items, pickup stop, pickup time, name and phone, instead of only showing the confirmation.',
        },
        {
            label: 'Add a loyalty punch card',
            prompt: 'Add a digital punch card: every order sent from the ticket earns a stamp, and the tenth taco is free. Show the card next to the ticket and keep it on the visitor\'s device.',
        },
    ],
    instructions: 'Business details, the weekly SCHEDULE, the MENU and the CATERING settings live as plain data at the top of app.js. Change content there rather than in the markup, and keep the "where are we now" board, the route and the order ticket reading from that data. Keep the look: Anton for display type, DM Mono for everything else, marigold, chile red, ink and masa colors, and very large headlines next to very small mono text.',
    page: {
        title: 'Food Truck Website Template: Live Location, Menu & Orders',
        description: 'A free food truck website template with a live "where are we parked" board, the week\'s route, an order-ahead menu and a catering quote form.',
        ogTagline: 'Where the truck is now, what is on the board, and order ahead',
        features: [
            {
                title: 'Where the truck is, right now',
                body: 'A departure-board strip reads the weekly schedule against the clock: parked and open with a countdown to closing, or the next stop and how long until the window opens.',
            },
            {
                title: 'The week\'s route',
                body: 'Every stop drawn along a winding road, today\'s highlighted, each with directions and an add-to-calendar file so regulars can plan lunch.',
            },
            {
                title: 'An order-ahead menu board',
                body: 'The menu is the truck\'s serving window: add dishes to a paper ticket, pick a stop and a pickup time from its real service hours, and get an order number. Sold-out dishes are marked 86\'d.',
            },
            {
                title: 'Catering with a live quote',
                body: 'A booking form with an availability calendar, a guest-count slider and packages, showing the estimate as it changes and handing the request to email.',
            },
            {
                title: 'Text alerts and house rules',
                body: 'Visitors pick the neighborhoods they care about to get a text when the truck parks nearby, and a short list answers payment, dietary and dog questions.',
            },
            {
                title: 'Content as plain data',
                body: 'Hours, stops, dishes, prices, catering rates and booked dates sit at the top of app.js, so updating the week is a quick edit or a sentence to the builder.',
            },
        ],
        faq: [
            {
                q: 'Does the location update by itself?',
                a: ['It follows the weekly schedule you set in app.js and the visitor\'s clock, so it always shows where the truck should be now or next. For one-off changes, ask the builder to add a closure or an extra stop to the schedule.'],
            },
            {
                q: 'Where do order-ahead orders go?',
                a: ['Out of the box the ticket confirms the order on the page and keeps it on the visitor\'s device. Ask the builder to email each order to you or send it to a form service, and it will wire that up.'],
            },
            {
                q: 'Can I use it for a truck that is not tacos?',
                a: ['Yes. Tell the builder what you serve and it will rewrite the menu, the photos and the copy while keeping the route, the ticket and the catering form working.'],
            },
        ],
    },
};
