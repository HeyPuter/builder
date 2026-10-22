// =============================================================================
// Morrow Coffee: content
// Everything the shop changes from week to week lives here: its details,
// opening hours, menu, beans on the shelf and so on. Every page is drawn from
// this file, so a change here shows up everywhere it appears.
// =============================================================================

const SHOP = {
    name: 'Morrow Coffee',
    shortName: 'Morrow',
    tagline: 'Coffee · Brunch · Bakery',
    street: '214 Larch Street',
    city: 'Portland, OR 97214',
    phone: '(503) 555-0142',
    email: 'hello@morrowcoffee.example',
    // The shop's own time zone, so "open now" is right for every visitor.
    timezone: 'America/Los_Angeles',
    // Online ordering link (Square, Toast, ...). Empty: "Order ahead" calls the shop.
    orderUrl: '',
    // A maps link for the shop. Empty: a map search for the address above.
    mapUrl: '',
    // Where the contact form and the Tuesday letter send a JSON POST.
    // Empty: they open an email to the shop instead.
    contactEndpoint: '',
    letterEndpoint: '',
    // The day beans are roasted: 0 = Sunday, 1 = Monday ... 6 = Saturday.
    roastDay: 2,
    socials: [
        { label: 'Instagram', url: 'https://www.instagram.com/' },
        { label: 'TikTok', url: 'https://www.tiktok.com/' },
        { label: 'Google reviews', url: 'https://www.google.com/maps' },
    ],
};

// 24-hour times. Leave a day out to show it as closed.
const HOURS = [
    { day: 1, open: '07:00', close: '18:00' },
    { day: 2, open: '07:00', close: '18:00' },
    { day: 3, open: '07:00', close: '18:00' },
    { day: 4, open: '07:00', close: '18:00' },
    { day: 5, open: '07:00', close: '19:00' },
    { day: 6, open: '08:00', close: '17:00' },
    { day: 0, open: '08:00', close: '15:00' },
];

// The day in three parts. The one happening now is highlighted on the home page.
const DAYPARTS = [
    {
        name: 'Morning', from: '07:00', to: '11:00', icon: 'sunrise',
        line: 'Pastries straight from the oven and batch brew on tap.',
        items: ['Cardamom buns', 'Batch brew', 'Egg & cheddar toastie'],
    },
    {
        name: 'Brunch', from: '11:00', to: '15:00', icon: 'sun',
        line: 'The kitchen is in full swing and everything comes iced.',
        items: ['Garden bowl', 'Morrow benny', 'Iced honey oat latte'],
    },
    {
        name: 'Afternoon', from: '15:00', to: '19:00', icon: 'sunset',
        line: 'Pour-overs, soup and bread, and half-price pastries after 5.',
        items: ['Pour-over', 'Soup of the day', 'Cascara fizz'],
    },
];

// Sizes for drinks with two prices. Items with one price ignore them.
const SIZES = [
    { id: 'small', label: '8 oz' },
    { id: 'regular', label: '12 oz' },
];

// Tags: 'fav' (house favourite), 'iced' (can be iced), 'vg' (vegan), 'gf' (gluten free).
const MENU = [
    {
        id: 'coffee',
        label: 'Coffee',
        intro: 'Espresso is Daybreak, our house blend. Filter changes with the roast.',
        items: [
            { id: 'espresso', name: 'Espresso', price: 3.25, desc: 'A double shot. Chocolate, hazelnut, a little brown sugar.' },
            { id: 'cortado', name: 'Cortado', price: 4.25, desc: 'Equal parts espresso and silky milk, in a glass.' },
            { id: 'flat-white', name: 'Flat white', price: [4.5, 5.25], desc: 'Two ristretto shots under a thin layer of microfoam.', tags: ['iced'] },
            { id: 'latte', name: 'Latte', price: [4.75, 5.5], desc: 'Espresso and plenty of steamed milk.', tags: ['iced'] },
            { id: 'honey-oat-latte', name: 'Honey oat latte', price: [5.25, 6], desc: 'Oat milk, wildflower honey and a pinch of sea salt.', tags: ['fav', 'iced'] },
            { id: 'cappuccino', name: 'Cappuccino', price: [4.5, 5.25], desc: 'Equal espresso, milk and foam. Cocoa on request.' },
            { id: 'batch-brew', name: 'Batch brew', price: [3.25, 3.75], desc: 'Brewed every 30 minutes. Free refill if you stay.' },
            { id: 'pour-over', name: 'Pour-over', price: 5.5, desc: 'Any bean on the shelf, brewed to order. About four minutes.', tags: ['fav'] },
            { id: 'cold-brew', name: 'Cold brew', price: [4.5, 5.25], desc: 'Steeped for 18 hours. Smooth, low acid, a bit like cola.', tags: ['iced'] },
            { id: 'espresso-tonic', name: 'Espresso tonic', price: 5, desc: 'A double over tonic and ice with an orange peel.', tags: ['iced'] },
        ],
    },
    {
        id: 'not-coffee',
        label: 'Not coffee',
        intro: 'For the friend who doesn\'t.',
        items: [
            { id: 'chai', name: 'Chai latte', price: [4.75, 5.5], desc: 'House-brewed with black tea, ginger and cardamom.', tags: ['iced'] },
            { id: 'dirty-chai', name: 'Dirty chai', price: [5.5, 6.25], desc: 'Our chai with a shot of espresso in it.', tags: ['iced'] },
            { id: 'matcha', name: 'Matcha latte', price: [5.25, 6], desc: 'Ceremonial-grade matcha, whisked to order.', tags: ['iced'] },
            { id: 'hot-chocolate', name: 'Hot chocolate', price: [4.25, 5], desc: 'Real chocolate, whole milk, a big marshmallow.' },
            { id: 'juice', name: 'Fresh juice', price: 6, desc: 'Orange, or carrot, apple and ginger. Pressed in the morning.', tags: ['vg'] },
            { id: 'cascara-fizz', name: 'Cascara fizz', price: 4.5, desc: 'Sparkling tea made from dried coffee cherries. Tart, like hibiscus.', tags: ['iced', 'vg'] },
            { id: 'tea', name: 'Loose-leaf tea', price: 3.75, desc: 'Earl grey, sencha, chamomile or mint.', tags: ['vg'] },
        ],
    },
    {
        id: 'brunch',
        label: 'Brunch',
        intro: 'From the kitchen, 8 am until 3 pm.',
        items: [
            { id: 'avocado-toast', name: 'Avocado toast', price: 11, desc: 'Smashed avocado, lemon, chili and seeds on toasted rye. Add an egg +2.', tags: ['vg', 'fav'] },
            { id: 'benny', name: 'Morrow benny', price: 14, desc: 'Poached eggs, ham or greens, brown butter hollandaise on an English muffin.' },
            { id: 'garden-bowl', name: 'Garden bowl', price: 13, desc: 'Grains, roast squash, greens, pickled onion, soft egg and tahini.', tags: ['gf'] },
            { id: 'yogurt-bowl', name: 'Berry yogurt bowl', price: 9, desc: 'Greek yogurt, house granola, berries and honey.', tags: ['gf'] },
            { id: 'french-toast', name: 'Brioche French toast', price: 12, desc: 'Thick-cut brioche, roasted fruit, crème fraîche and maple.' },
            { id: 'toastie', name: 'Egg & cheddar toastie', price: 8.5, desc: 'Soft scrambled egg, aged cheddar and chili crisp on sourdough.' },
            { id: 'soup', name: 'Soup of the day', price: 7.5, desc: 'Whatever the market had, with a thick slice of bread.', tags: ['vg'] },
        ],
    },
    {
        id: 'bakery',
        label: 'Bakery',
        intro: 'Baked in house from 6 am. Second bake at 11:30.',
        items: [
            { id: 'croissant', name: 'Butter croissant', price: 3.75, desc: 'Three days of laminating. Worth it.' },
            { id: 'almond-croissant', name: 'Almond croissant', price: 4.5, desc: 'Twice baked with frangipane and flaked almonds.' },
            { id: 'cardamom-bun', name: 'Cardamom bun', price: 4.25, desc: 'Swedish-style knot with pearl sugar. Gone by 10.', tags: ['fav'] },
            { id: 'banana-bread', name: 'Banana bread', price: 3.95, desc: 'Brown butter and walnuts, served warm.', tags: ['gf'] },
            { id: 'galette', name: 'Seasonal galette', price: 4.75, desc: 'Whatever fruit the market had this week.' },
            { id: 'cookie', name: 'Brown butter cookie', price: 3.25, desc: 'Dark chocolate, flaky salt, slightly underbaked on purpose.' },
        ],
    },
];

const MENU_NOTE = 'Oat, almond and whole milk at no extra charge. Extra shot +$1. Decaf on request.';

// "Order like a regular": temperature, then milk, then mood → a menu item id.
const FINDER = {
    'hot-black-gentle': { item: 'batch-brew', why: 'Clean and easy. And the refill is free if you stay.' },
    'hot-black-bold': { item: 'espresso', why: 'Short, sweet and to the point. Our house blend at its best.' },
    'hot-milk-gentle': { item: 'honey-oat-latte', why: 'The one most of our regulars order. Soft, sweet, a little salty.' },
    'hot-milk-bold': { item: 'cortado', why: 'All the espresso flavor, with just enough milk to round it off.' },
    'iced-black-gentle': { item: 'cold-brew', why: 'Steeped overnight, so it\'s smooth with no bitterness.' },
    'iced-black-bold': { item: 'espresso-tonic', why: 'Bright, fizzy and properly strong. A summer favourite.' },
    'iced-milk-gentle': { item: 'latte', why: 'Ask for it iced, maybe with a pump of honey.' },
    'iced-milk-bold': { item: 'dirty-chai', why: 'Spiced chai with a shot of espresso in it. Iced, it\'s dangerous.' },
};

// Beans on the shelf. roast: 1 (light) to 5 (dark). fresh: shows a sticker.
const BEANS = [
    {
        name: 'Daybreak', kind: 'House blend', origin: 'Brazil & Colombia',
        process: 'Natural / washed', brew: 'Espresso, milk',
        notes: ['Milk chocolate', 'Hazelnut', 'Brown sugar'], roast: 3, price: 18, size: '12 oz',
    },
    {
        name: 'Kiambu AA', kind: 'Single origin', origin: 'Kenya · Kiambu',
        process: 'Washed', brew: 'Filter',
        notes: ['Blackcurrant', 'Grapefruit', 'Cane sugar'], roast: 1, price: 22, size: '12 oz', fresh: true,
    },
    {
        name: 'Pink Bourbon', kind: 'Single origin', origin: 'Colombia · Huila',
        process: 'Washed', brew: 'Filter, espresso',
        notes: ['Strawberry', 'Rose', 'Honey'], roast: 2, price: 24, size: '12 oz',
    },
    {
        name: 'Night Shift', kind: 'Decaf', origin: 'Colombia · Tolima',
        process: 'Sugarcane decaf', brew: 'Anything',
        notes: ['Cocoa', 'Caramel', 'Red apple'], roast: 4, price: 18, size: '12 oz',
    },
];

const AMENITIES = [
    { icon: 'wifi', label: 'Fast wifi, no time limit' },
    { icon: 'plug', label: 'Outlets along the bar' },
    { icon: 'paw', label: 'Dogs welcome on the patio' },
    { icon: 'step', label: 'Step-free entrance & restroom' },
    { icon: 'leaf', label: 'Compostable cups, or bring yours' },
    { icon: 'group', label: 'Big table for groups of 10' },
];

const STAMP_CARD = { stamps: 10, filled: 6 };

// These are sample reviews to show the layout. Replace them with real ones
// (and clear REVIEWS_NOTE) before you publish.
const REVIEWS = [
    { quote: 'The cardamom buns are the reason I get up on Saturdays.', name: 'Priya', source: 'Google' },
    { quote: 'Best flat white in the neighborhood, and they remember your order by the second visit.', name: 'Tomás', source: 'Google' },
    { quote: 'Bright and quiet in the mornings. The garden bowl is my standing Tuesday order.', name: 'Hannah', source: 'Yelp' },
];
const REVIEWS_NOTE = 'Sample reviews. Swap in your own before publishing.';

const GETTING_HERE = [
    { label: 'Bus', text: 'Lines 14 and 15 stop at Larch & 32nd, right outside.' },
    { label: 'Bike', text: 'Racks out front, plus a pump if you need air.' },
    { label: 'Car', text: 'Free street parking on Larch and the side streets.' },
];

// Topics offered in the contact form on the Visit page.
const CONTACT_TOPICS = ['Just saying hello', 'A group of 8 or more', 'Catering & coffee for events', 'Wholesale beans', 'Jobs'];
