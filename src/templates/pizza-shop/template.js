// Pizza shop: a one-page static site for a neighborhood pizzeria, with no
// backend. Shop details, hours, the menu, build-a-pie prices, delivery zones,
// weekly specials, reviews and FAQ are plain data at the top of files/app.js.
// Orders go out as a text message or email to the shop. Photos are CC0 stock
// (Wikimedia Commons, including Unsplash and Pexels uploads) standing in for
// the shop's own. See scripts/build-templates.mjs for the shape.
export default {
    slug: 'pizza-shop',
    name: 'Pizza Shop Website',
    category: 'Website',
    description: "Let customers order from your pizzeria's menu online.",
    updated: '2026-10-15',
    workers: [],

    suggestions: [
        { label: 'Make it my shop', prompt: 'Change the shop name, phone, the number orders are texted to, email, address, hours and time zone to mine. Here are my details: ' },
        { label: 'Put in my menu', prompt: 'Replace the sample menu with mine, keeping the sections, sizes and tags. Here is my menu with prices: ' },
        { label: 'Use my food photos', prompt: 'Replace the stock photos with photos of my own pies and my oven. I will upload them and tell you which dish each one is.' },
        { label: 'Take orders online', prompt: 'Save each order instead of sending it by text, and add a private kitchen page where only my staff can see new orders come in and mark them ready.' },
        { label: 'Add a deal of the day', prompt: 'Show a banner at the top of the page with today\'s special, and let customers add the special to their order in one tap.' },
    ],

    // Kept in every fork's system prompt (see scripts/build-templates.mjs).
    instructions: [
        'This project is a website for a pizza shop. Content lives as data at the top of app.js; keep it there when making changes:',
        '- SHOP holds the name, phone, the order number, email, address and time zone, and fills every place they appear. Change contact details there, not in the HTML. When the shop or menu changes, also update the <title> and meta description in index.html, which are static.',
        '- HOURS drives the open-now line, the hours table, the week of specials and the order times, in SHOP.timeZone.',
        '- MENU items belong to a CATEGORIES entry and price by SIZES keys. The build-a-pie (BUILDER), the order tray and the ticker all read this data; keep the same shape when adding items, sizes or toppings.',
        '- ZONES are the delivery ZIP codes, fees and minimums used by the ZIP check and the order tray.',
        '- There is no payment online. Orders go to SHOP.orderPhone by text or SHOP.email by email and the shop confirms them. Do not add card fields; if asked to take payment, explain it needs a payment provider.',
        '- The reviews, rating and review count are placeholders, and SAMPLE_CONTENT = true labels them as samples. Never invent reviews or ratings for the user\'s real shop; ask for real ones, or remove them. Set SAMPLE_CONTENT to false only once they are the shop\'s own.',
        '- The photos in photos/ are stock images. Suggest replacing them with the shop\'s own food photos.',
        '- Keep the call and order buttons easy to reach on a phone, including the bar fixed to the bottom of small screens.',
    ].join('\n'),

    page: {
        title: 'Free Pizza Shop Website Template to Edit With AI',
        description:
            'Let customers order from your menu, build their own pie and check delivery on a pizzeria website that also shows weekly specials and hours.',
        ogTagline: 'A pizzeria website people order from',
        features: [
            { icon: 'utensils', title: 'A menu customers order from', body: 'Sections for pies, squares, slices, sides and drinks. Tap a size and price to add it to the order. On a computer, hovering a dish shows its photo.' },
            { icon: 'sliders', title: 'Build your own pie', body: 'Pick a size and base, then tap toppings onto the whole pie or one half. The pizza is drawn as you go and the price updates.' },
            { icon: 'phone', title: 'Orders sent to your phone', body: 'The order tray takes pickup or delivery, a time from your opening hours, a name and a phone number, then sends the order to you by text or email.' },
            { icon: 'mapPin', title: 'Delivery area check', body: 'Customers enter a ZIP code and see whether you deliver there, the fee and the minimum order.' },
            { icon: 'calendar', title: 'Specials for every day', body: 'A card for each day of the week with that day\'s deal and hours, starting from today.' },
            { icon: 'clock', title: 'Open now', body: 'The page shows whether you are open right now in your own time zone, and highlights today in the hours table.' },
        ],
        faq: [
            {
                q: 'How do orders reach me?',
                a: [
                    'As copied, the order tray opens the customer’s messages app with the full order addressed to your shop’s number, or their email app if they choose email. You reply to confirm. Ask the builder to save orders instead and it adds a private kitchen page where your staff see them come in.',
                ],
            },
            {
                q: 'Can customers pay online?',
                a: [
                    'Not as copied. Customers pay in the shop or at the door. Taking card payments needs a payment provider, which you can ask the builder to help you connect.',
                ],
            },
            {
                q: 'Are the reviews and photos real?',
                a: [
                    'No. The shop, the menu, the reviews and the rating are placeholders, and the photos are free stock images. Replace them with your own before you publish.',
                ],
            },
        ],
    },
};
