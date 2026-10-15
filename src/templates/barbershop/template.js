// Barbershop: a one-page static site for a barbershop, with no backend. The
// shop's details, hours, walk-in waits, service menu, barbers and the days they
// cut, lookbook, membership, house rules, reviews and FAQ are plain data at the
// top of files/app.js. Photos are CC0 stock (from Wikimedia Commons, some via
// Unsplash) standing in for the shop's own barbers, cuts and interior. See
// scripts/build-templates.mjs for the shape.
export default {
    slug: 'barbershop',
    name: 'Barbershop Website',
    category: 'Website',
    description: 'Barbershop website with services, barbers and chair booking.',
    updated: '2026-10-15',
    workers: [],

    suggestions: [
        { label: 'Make it my shop', prompt: 'Change the shop name, phone, email, Instagram, address, parking, hours and time zone to mine. Here are my details: ' },
        { label: 'Set my menu and prices', prompt: 'Replace the sample services with my menu. Here are my services with their prices and how long each takes: ' },
        { label: 'Add my barbers', prompt: 'Replace the sample barbers with my team. I will upload a photo of each and tell you their name, chair, specialties and the days they cut.' },
        { label: 'Use my booking page', prompt: 'Send every "Book a chair" button to my booking page instead of the request form. The link is: ' },
        { label: 'Save requests', prompt: 'Make the booking form save each request instead of opening an email, and add a private page where only my barbers can see them, filtered by barber and day.' },
    ],

    // Kept in every fork's system prompt (see scripts/build-templates.mjs).
    instructions: [
        'This project is a website for a barbershop. Content lives as data at the top of app.js; keep it there when making changes:',
        '- SHOP holds the name, contact details, Instagram, rating, time zone and booking link (bookingUrl), and fills every place they appear. Change them there, not in the HTML. When the shop, its city or its services change, also update the <title>, meta description, hero headline and hero text in index.html, which are static.',
        '- HOURS drives the open-now line, the hours table, the walk-in wait (WALK_INS) and the days the booking form offers, in SHOP.timeZone.',
        '- SERVICES is the menu. "Your visit" and the booking form share one list of chosen services and add up their minutes and prices. Each BARBERS entry lists the days they cut, and the form only offers those days. Each LOOKBOOK look names SERVICES ids and a BARBERS id. Keep these links when adding services, barbers or looks.',
        '- The shop, barbers, bios, prices, rating, review count, reviews and walk-in waits are samples, and SAMPLE_CONTENT = true labels them on the page. Never invent reviews, ratings or awards for the user\'s real shop; ask for real ones, or remove what they do not have. Set SAMPLE_CONTENT to false only once they are the user\'s own.',
        '- The photos in photos/ are stock images of other shops. Suggest replacing them with the shop\'s own barbers, cuts and interior.',
        '- Keep the call, directions and book buttons easy to reach on a phone, including the bar fixed to the bottom of small screens.',
    ].join('\n'),

    page: {
        title: 'Free Barbershop Website Template to Edit With AI',
        description:
            'Show your service menu, barbers, a lookbook of cuts and walk-in times on this barbershop website, and let clients request a chair.',
        ogTagline: 'A barbershop website that fills the chairs',
        features: [
            { icon: 'scissors', title: 'A menu that adds up', body: 'Services by category with prices and chair time. Visitors add what they want and see the total time and price before they book.' },
            { icon: 'users', title: 'Barber profiles', body: 'A photo, bio and specialties for each barber, the days they cut, and who is in today.' },
            { icon: 'camera', title: 'Lookbook with "how to ask"', body: 'Each look shows the words to use in the chair for the sides, top and finish, how often it needs a touch-up, and which barber cuts it best.' },
            { icon: 'clock', title: 'Live hours and walk-in wait', body: 'The page shows whether you are open right now in your time zone, and the usual walk-in wait for this time of day.' },
            { icon: 'calendar', title: 'Chair requests', body: 'Visitors pick a barber, one of that barber\'s days and a time of day. The request goes to that barber, or to your booking page if you use one.' },
            { icon: 'star', title: 'Membership and house rules', body: 'A monthly membership card, your late and cancellation rules, and reviews with your rating.' },
        ],
        faq: [
            {
                q: 'Where do booking requests go?',
                a: [
                    'As copied, the form opens the visitor’s email app with a request to the barber they picked, or to the shop when they pick any barber. If you use a booking page such as Booksy, Squire or Fresha, add its link and every booking button opens it. Ask the builder to save requests instead and it adds a private page where your barbers read them.',
                ],
            },
            {
                q: 'Are the barbers, prices and reviews real?',
                a: [
                    'No. The shop, barbers, prices, rating and reviews are placeholders, and the photos are free stock images. The page labels them as samples until you replace them with your own.',
                ],
            },
            {
                q: 'Does it work for a salon or a one-chair shop?',
                a: [
                    'Yes. Describe your shop and the builder changes the menu, the team section and the booking form. With one barber, ask it to drop the barber choice from the form.',
                ],
            },
        ],
    },
};
