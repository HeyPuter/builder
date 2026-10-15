// =============================================================================
// Morrow Coffee: content
// Everything a coffee shop changes from week to week lives in the data below:
// the shop's details, opening hours, menu, beans on the shelf and so on. The
// page is drawn from it, so editing a line here updates every place it shows.
// =============================================================================

const SHOP = {
    name: 'Morrow Coffee',
    shortName: 'Morrow',
    street: '214 Larch Street',
    city: 'Portland, OR 97214',
    phone: '(503) 555-0142',
    email: 'hello@morrowcoffee.example',
    // The shop's own time zone, so "open now" is right for every visitor.
    timezone: 'America/Los_Angeles',
    // Online ordering link (Square, Toast, ...). Empty: "Order ahead" calls the bar.
    orderUrl: '',
    // A maps link for the shop. Empty: a map search for the address above.
    mapUrl: '',
    // Where Tuesday letter sign-ups are sent, as a JSON POST of { email }.
    // Empty: the sign-up opens an email to the shop instead.
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

// What a quick note on the hero card says, by day (0 = Sunday). Optional.
const TODAY_NOTES = {
    0: 'Slow Sunday: pour-overs all day',
    2: 'Roasting today, the back room smells amazing',
    5: 'Open late until 7 pm',
    default: 'Pastries out of the oven at 7 & 11:30',
};

const TICKER = [
    'Roasted in house every Tuesday',
    'Oat & almond milk at no extra charge',
    'Cardamom buns out of the oven at 7',
    'Dogs welcome on the patio',
    'Bring your own cup, take 25¢ off',
    'Half-price pastries after 5 pm',
];

// The day in three parts. The one happening now is highlighted.
const DAYPARTS = [
    {
        name: 'Morning', from: '07:00', to: '11:00', icon: 'sunrise', photo: 'photos/morning.jpg',
        line: 'Pastries straight from the oven and batch brew on tap.',
        items: ['Cardamom buns', 'Batch brew', 'Egg & cheddar toastie'],
    },
    {
        name: 'Midday', from: '11:00', to: '15:00', icon: 'sun', photo: 'photos/midday.jpg',
        line: 'The second bake lands at 11:30. Everything comes iced.',
        items: ['Espresso tonic', 'Seasonal galette', 'Iced honey oat latte'],
    },
    {
        name: 'Afternoon', from: '15:00', to: '19:00', icon: 'sunset', photo: 'photos/afternoon.jpg',
        line: 'The slow bar opens up: pour-overs, cold brew and half-price pastries after 5.',
        items: ['Pour-over', 'Affogato', 'Cascara fizz'],
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
        id: 'espresso',
        label: 'Espresso bar',
        intro: 'Daybreak blend, pulled as a double.',
        items: [
            { id: 'espresso', name: 'Espresso', price: 3.25, desc: 'A double shot. Chocolate, hazelnut, a little brown sugar.' },
            { id: 'cortado', name: 'Cortado', price: 4.25, desc: 'Equal parts espresso and silky milk, in a glass.' },
            { id: 'flat-white', name: 'Flat white', price: [4.5, 5.25], desc: 'Two ristretto shots under a thin layer of microfoam.', tags: ['iced'] },
            { id: 'latte', name: 'Latte', price: [4.75, 5.5], desc: 'Espresso and plenty of steamed milk.', tags: ['iced'] },
            { id: 'honey-oat-latte', name: 'Honey oat latte', price: [5.25, 6], desc: 'Oat milk, wildflower honey and a pinch of sea salt.', tags: ['fav', 'iced'] },
            { id: 'cappuccino', name: 'Cappuccino', price: [4.5, 5.25], desc: 'Equal espresso, milk and foam. Cocoa on request.' },
            { id: 'mocha', name: 'Mocha', price: [5.25, 6], desc: '70% dark chocolate melted into a latte.', tags: ['iced'] },
            { id: 'espresso-tonic', name: 'Espresso tonic', price: 5, desc: 'A double over tonic and ice with an orange peel.', tags: ['iced'] },
        ],
    },
    {
        id: 'slow-bar',
        label: 'Slow bar',
        intro: 'Single origins, brewed by hand.',
        items: [
            { id: 'batch-brew', name: 'Batch brew', price: [3.25, 3.75], desc: 'Brewed every 30 minutes. Free refill if you stay.' },
            { id: 'pour-over', name: 'Pour-over', price: 5.5, desc: 'Any bean on the shelf, brewed to order. Takes about four minutes.', tags: ['fav'] },
            { id: 'cold-brew', name: 'Cold brew', price: [4.5, 5.25], desc: 'Steeped for 18 hours. Smooth, low acid, a bit like cola.', tags: ['iced'] },
            { id: 'shakerato', name: 'Maple shakerato', price: 5.25, desc: 'Espresso shaken hard with maple and ice, served up.', tags: ['iced'] },
            { id: 'affogato', name: 'Affogato', price: 6, desc: 'A shot poured over vanilla bean gelato from down the street.' },
            { id: 'tasting-flight', name: 'Tasting flight', price: 9, desc: 'Three of this week\'s beans side by side, with notes.' },
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
            { id: 'cascara-fizz', name: 'Cascara fizz', price: 4.5, desc: 'Sparkling tea made from dried coffee cherries. Tart, like hibiscus.', tags: ['iced', 'vg'] },
            { id: 'tea', name: 'Loose-leaf tea', price: 3.75, desc: 'Earl grey, sencha, chamomile or mint.', tags: ['vg'] },
        ],
    },
    {
        id: 'food',
        label: 'Pastry & food',
        intro: 'Baked in house from 6 am.',
        items: [
            { id: 'croissant', name: 'Butter croissant', price: 3.75, desc: 'Three days of laminating. Worth it.' },
            { id: 'cardamom-bun', name: 'Cardamom bun', price: 4.25, desc: 'Swedish-style knot with pearl sugar. Gone by 10.', tags: ['fav'] },
            { id: 'banana-bread', name: 'Banana bread', price: 3.95, desc: 'Brown butter and walnuts, served warm.', tags: ['gf'] },
            { id: 'galette', name: 'Seasonal galette', price: 4.75, desc: 'Whatever fruit the market had this week.' },
            { id: 'toastie', name: 'Egg & cheddar toastie', price: 8.5, desc: 'Soft scrambled egg, aged cheddar and chili crisp on sourdough.' },
            { id: 'avocado-toast', name: 'Avocado toast', price: 9.5, desc: 'Lemon, chili flakes and seeds on toasted rye.', tags: ['vg'] },
        ],
    },
];

const MENU_NOTE = 'Oat, almond and whole milk at no extra charge · Extra shot +$1 · Decaf on request';

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
        process: 'Natural / washed', altitude: '1,100–1,700 m', brew: 'Espresso, milk',
        notes: ['Milk chocolate', 'Hazelnut', 'Brown sugar'], roast: 3,
        price: 18, size: '12 oz', band: '#f2c75c',
    },
    {
        name: 'Kiambu AA', kind: 'Single origin', origin: 'Kenya · Kiambu County',
        process: 'Washed', altitude: '1,750 m', brew: 'Filter',
        notes: ['Blackcurrant', 'Grapefruit', 'Cane sugar'], roast: 1,
        price: 22, size: '12 oz', band: '#c4381e', bandInk: '#ffffff', fresh: true,
    },
    {
        name: 'Pink Bourbon', kind: 'Single origin', origin: 'Colombia · Huila',
        process: 'Washed', altitude: '1,850 m', brew: 'Filter, espresso',
        notes: ['Strawberry', 'Rose', 'Honey'], roast: 2,
        price: 24, size: '12 oz', band: '#eba9a1',
    },
    {
        name: 'Night Shift', kind: 'Decaf', origin: 'Colombia · Tolima',
        process: 'Sugarcane decaf', altitude: '1,600 m', brew: 'Anything',
        notes: ['Cocoa', 'Caramel', 'Red apple'], roast: 4,
        price: 18, size: '12 oz', band: '#9fb89a',
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
// (and remove REVIEWS_NOTE) before you publish.
const REVIEWS = [
    { quote: 'The cardamom buns are the reason I get up on Saturdays.', name: 'Priya', source: 'Google', stars: 5 },
    { quote: 'Best flat white in the neighborhood, and they remember your order by the second visit.', name: 'Tomás', source: 'Google', stars: 5 },
    { quote: 'Bright, quiet in the mornings, great for an hour of work with a pour-over.', name: 'Hannah', source: 'Yelp', stars: 5 },
];
const REVIEWS_NOTE = 'Sample reviews. Swap in your own before publishing.';

const GETTING_HERE = [
    { label: 'Bus', text: 'Lines 14 and 15 stop at Larch & 32nd, right outside.' },
    { label: 'Bike', text: 'Racks out front, plus a pump if you need air.' },
    { label: 'Car', text: 'Free street parking on Larch and the side streets.' },
];

// =============================================================================
// Page code. You shouldn't need to change anything below to update content.
// =============================================================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICONS = {
    sunrise: '<path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 4v4M5.6 9.6l1.8 1.8M18.4 9.6l-1.8 1.8M2 14h2M20 14h2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
    sunset: '<path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 9V4M9.5 6.5L12 9l2.5-2.5M2 14h2M20 14h2"/>',
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19.2" r="1" fill="currentColor"/>',
    plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>',
    paw: '<circle cx="6" cy="10" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14" cy="6" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M12 11c-3 0-5.5 4-5.5 6.2 0 1.6 1.4 2.3 2.8 2 1-.2 1.8-.6 2.7-.6s1.7.4 2.7.6c1.4.3 2.8-.4 2.8-2C17.5 15 15 11 12 11z"/>',
    step: '<circle cx="10" cy="4.5" r="1.8"/><path d="M10 7.5v6h5l2.5 6M10 10.5h4.5"/><path d="M7.2 11.2a5.5 5.5 0 1 0 7.6 7.1"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19c2.5-4 5.5-7 9-9"/>',
    group: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0M14 15.2a4.5 4.5 0 0 1 7.5 3.3"/>',
    cup: '<path d="M4 9h13v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6zM17 10.5h1.5a2.5 2.5 0 0 1 0 5H16.5M8 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3"/>',
};
const icon = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// ---- Time helpers -----------------------------------------------------------

const toMinutes = (hhmm) => {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + (m || 0);
};

// "07:00" → "7 am", "18:30" → "6:30 pm"
function formatTime(hhmm) {
    const mins = toMinutes(hhmm) % (24 * 60);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const h12 = h % 12 || 12;
    return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}`;
}

// Menu prices always show cents ("$6.00"); bag prices drop them when whole ("$18").
const formatPrice = (n, cents = true) => '$' + (cents || !Number.isInteger(n) ? n.toFixed(2) : String(n));

// The current day and minute in the shop's own time zone.
function shopNow() {
    const now = new Date();
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: SHOP.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(now);
        const get = (type) => (parts.find((p) => p.type === type) || {}).value;
        const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
        const minutes = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
        if (day >= 0 && Number.isFinite(minutes)) return { day, minutes };
    } catch (e) { /* unknown time zone: fall back to the visitor's clock */ }
    return { day: now.getDay(), minutes: now.getHours() * 60 + now.getMinutes() };
}

const hoursFor = (day) => HOURS.find((h) => h.day === day) || null;

function openStatus(now = shopNow()) {
    const today = hoursFor(now.day);
    if (today) {
        const open = toMinutes(today.open);
        const close = toMinutes(today.close);
        if (now.minutes >= open && now.minutes < close) {
            const left = close - now.minutes;
            return {
                open: true,
                soon: left <= 30,
                short: left <= 30 ? `Closing soon · ${formatTime(today.close)}` : `Open · until ${formatTime(today.close)}`,
                long: left <= 30
                    ? `Closing at ${formatTime(today.close)}, last orders now`
                    : `Open now until ${formatTime(today.close)}`,
            };
        }
        if (now.minutes < open) {
            return { open: false, short: `Opens ${formatTime(today.open)}`, long: `Closed right now. Opening at ${formatTime(today.open)} today` };
        }
    }
    for (let i = 1; i <= 7; i++) {
        const day = (now.day + i) % 7;
        const next = hoursFor(day);
        if (!next) continue;
        const when = i === 1 ? 'tomorrow' : DAY_NAMES[day];
        return { open: false, short: `Opens ${when} ${formatTime(next.open)}`, long: `Closed right now. Back ${when} at ${formatTime(next.open)}` };
    }
    return { open: false, short: 'Closed', long: 'Closed for now' };
}

// ---- Shop details -----------------------------------------------------------

const phoneHref = () => 'tel:' + SHOP.phone.replace(/[^\d+]/g, '');
const mapHref = () => SHOP.mapUrl ||
    'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${SHOP.name}, ${SHOP.street}, ${SHOP.city}`);

function renderShop() {
    $$('[data-shop]').forEach((el) => {
        const value = SHOP[el.dataset.shop];
        if (value) el.textContent = value;
    });
    $$('[data-phone-link]').forEach((a) => { a.href = phoneHref(); });
    $$('[data-email-link]').forEach((a) => { a.href = 'mailto:' + SHOP.email; });
    $$('[data-map-link]').forEach((a) => { a.href = mapHref(); });
    $$('[data-order]').forEach((a) => {
        if (SHOP.orderUrl) {
            a.href = SHOP.orderUrl;
            a.target = '_blank';
            a.rel = 'noopener';
        } else {
            a.href = phoneHref();
            a.title = `Call ${SHOP.phone} to order ahead`;
        }
    });
    const address = `${esc(SHOP.street)}<br>${esc(SHOP.city)}`;
    $('[data-address]').innerHTML = address;
    $('[data-footer-address]').innerHTML = address;
    $('[data-socials]').innerHTML = SHOP.socials
        .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('');
    $('[data-year]').textContent = new Date().getFullYear();
}

function renderTicker() {
    const track = $('[data-ticker]');
    const run = TICKER.map((t) => `<span>${esc(t)}</span>`).join('');
    // Two copies so the loop is seamless; the second is hidden from screen readers.
    track.innerHTML = reducedMotion ? run : run + `<div style="display:contents" aria-hidden="true">${run}</div>`;
}

// ---- Hours, status and the parts of the day ----------------------------------

function renderStatus() {
    const now = shopNow();
    const status = openStatus(now);
    const today = hoursFor(now.day);

    $$('[data-status], [data-status-long]').forEach((el) => {
        el.classList.toggle('is-open', status.open && !status.soon);
        el.classList.toggle('is-soon', !!status.soon);
    });
    $('[data-status-short]').textContent = status.short;
    $('[data-status-text]').textContent = status.long;

    $('[data-today-label]').innerHTML = `<span class="status-dot" aria-hidden="true"></span>Today · ${DAY_NAMES[now.day]}`;
    $('[data-today-label]').classList.toggle('is-open', status.open);
    $('[data-today-hours]').textContent = today ? `${formatTime(today.open)} – ${formatTime(today.close)}` : 'Closed today';
    $('[data-today-note]').textContent = TODAY_NOTES[now.day] || TODAY_NOTES.default || '';

    const order = [1, 2, 3, 4, 5, 6, 0];
    $('[data-hours]').innerHTML = '<caption class="sr-only">Opening hours by day</caption><tbody>' + order.map((day) => {
        const h = hoursFor(day);
        const isToday = day === now.day;
        return `<tr class="${isToday ? 'is-today' : ''}">
            <th scope="row">${DAY_NAMES[day]}${isToday ? '<span class="today-tag">Today</span>' : ''}</th>
            <td>${h ? `${formatTime(h.open)} – ${formatTime(h.close)}` : '<span class="closed">Closed</span>'}</td>
        </tr>`;
    }).join('') + '</tbody>';

    renderDayparts(now, status);
    renderRoast(now);
}

function renderDayparts(now, status) {
    // Show today while we're open or still to open; after closing, the next open day.
    const today = hoursFor(now.day);
    let day = now.day;
    let title = 'What\'s on today';
    if (status.open) {
        title = 'What\'s on right now';
    } else if (!today || now.minutes >= toMinutes(today.close)) {
        for (let i = 1; i <= 7; i++) {
            if (hoursFor((now.day + i) % 7)) { day = (now.day + i) % 7; break; }
        }
        title = `What's on ${day === (now.day + 1) % 7 ? 'tomorrow' : DAY_NAMES[day]}`;
    }
    $('[data-now-title]').textContent = title;
    const hours = hoursFor(day);
    const open = hours ? toMinutes(hours.open) : 0;
    const close = hours ? toMinutes(hours.close) : 24 * 60;

    // Each part, trimmed to that day's opening hours.
    const parts = DAYPARTS.map((p) => {
        const from = Math.max(toMinutes(p.from), open);
        const to = Math.min(toMinutes(p.to), close);
        return { ...p, from, to, off: to <= from };
    });
    const current = status.open && day === now.day
        ? parts.findIndex((p) => !p.off && now.minutes >= p.from && now.minutes < p.to)
        : -1;
    const next = current === -1
        ? parts.findIndex((p) => !p.off && (day !== now.day || p.to > now.minutes))
        : -1;
    const clock = (mins) => formatTime(`${Math.floor(mins / 60)}:${mins % 60}`);

    $('[data-dayparts]').innerHTML = parts.map((p, i) => {
        const state = i === current ? 'is-now' : i === next ? 'is-next' : p.off ? 'is-off' : '';
        const badge = i === current ? 'Now' : 'Up next';
        const time = p.off ? `Not on ${day === now.day ? 'today' : DAY_NAMES[day]}` : `${clock(p.from)} – ${clock(p.to)}`;
        return `<li class="daypart ${state}">
            <span class="daypart-badge">${badge}</span>
            <p class="daypart-time">${icon(p.icon)}${time}</p>
            <h3>${esc(p.name)}</h3>
            <img class="daypart-photo" src="${esc(p.photo)}" alt="" width="84" height="84" loading="lazy">
            <p class="daypart-line">${esc(p.line)}</p>
            <ul class="daypart-items">${p.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        </li>`;
    }).join('');
}

function renderRoast(now) {
    const days = (SHOP.roastDay - now.day + 7) % 7;
    const when = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : DAY_NAMES[SHOP.roastDay];
    const sub = days === 0
        ? 'Fresh bags on the shelf by noon'
        : `In ${days} day${days === 1 ? '' : 's'}. Fresh bags by noon`;
    $('[data-roast-when]').innerHTML = `${esc(when)}<small>${esc(sub)}</small>`;
    $('[data-roast-week]').innerHTML = [1, 2, 3, 4, 5, 6, 0].map((day) => {
        const cls = [day === SHOP.roastDay ? 'is-roast' : '', day === now.day ? 'is-today' : ''].join(' ');
        return `<li class="${cls}">${DAY_NAMES[day][0]}</li>`;
    }).join('');
}

// ---- Menu -------------------------------------------------------------------

let activeSection = MENU[0].id;
let activeSize = SIZES[SIZES.length - 1].id;

const sizeIndex = () => Math.max(0, SIZES.findIndex((s) => s.id === activeSize));
const priceOf = (item) => (Array.isArray(item.price) ? item.price[Math.min(sizeIndex(), item.price.length - 1)] : item.price);
const findItem = (id) => {
    for (const section of MENU) {
        const item = section.items.find((i) => i.id === id);
        if (item) return { section, item };
    }
    return null;
};

const TAG_LABELS = { fav: 'House fav', iced: 'Iced ok', vg: 'Vegan', gf: 'GF' };

function renderMenuTabs() {
    const tabs = $('[data-menu-tabs]');
    tabs.innerHTML = MENU.map((s) =>
        `<button class="tab" type="button" role="tab" id="tab-${esc(s.id)}" aria-controls="menu-panel" data-tab="${esc(s.id)}">${esc(s.label)}</button>`,
    ).join('');
    tabs.addEventListener('click', (e) => {
        const tab = e.target.closest('[data-tab]');
        if (tab) selectSection(tab.dataset.tab);
    });
    tabs.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        let i = MENU.findIndex((s) => s.id === activeSection);
        if (e.key in keys) i = (i + keys[e.key] + MENU.length) % MENU.length;
        else if (e.key === 'Home') i = 0;
        else if (e.key === 'End') i = MENU.length - 1;
        else return;
        e.preventDefault();
        selectSection(MENU[i].id, { focusTab: true });
    });

    $('[data-sizes]').innerHTML = SIZES.map((s) =>
        `<label><input type="radio" name="size" value="${esc(s.id)}"${s.id === activeSize ? ' checked' : ''}><span>${esc(s.label)}</span></label>`,
    ).join('');
    $('[data-sizes]').addEventListener('change', (e) => {
        activeSize = e.target.value;
        renderMenuPanel();
        renderFinder();
    });

    const panel = $('[data-menu-panel]');
    panel.id = 'menu-panel';
    $('[data-menu-note]').textContent = MENU_NOTE;
}

function selectSection(id, { focusTab = false } = {}) {
    activeSection = id;
    $$('[data-tab]').forEach((t) => {
        const on = t.dataset.tab === id;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focusTab) t.focus();
    });
    renderMenuPanel();
}

function renderMenuPanel() {
    const section = MENU.find((s) => s.id === activeSection) || MENU[0];
    const panel = $('[data-menu-panel]');
    panel.setAttribute('aria-labelledby', `tab-${section.id}`);
    const sized = section.items.some((i) => Array.isArray(i.price));
    $('[data-sizes]').classList.toggle('is-idle', !sized);
    panel.innerHTML = `
        <div class="menu-panel-intro"><h3>${esc(section.label)}</h3><p>${esc(section.intro || '')}</p></div>
        <ul class="menu-items">${section.items.map((item) => {
            const tags = (item.tags || []).map((t) => `<span class="tag${t === 'fav' ? ' tag-fav' : ''}">${esc(TAG_LABELS[t] || t)}</span>`).join('');
            return `<li class="menu-item" id="item-${esc(item.id)}" tabindex="-1">
                <div class="menu-item-top">
                    <span class="menu-item-name">${esc(item.name)}</span>
                    <span class="menu-item-price">${formatPrice(priceOf(item))}</span>
                </div>
                <p class="menu-item-desc">${esc(item.desc || '')}</p>
                ${tags ? `<p class="tags">${tags}</p>` : ''}
            </li>`;
        }).join('')}</ul>`;
}

// ---- Order like a regular ----------------------------------------------------

function finderPick() {
    const form = $('[data-finder]');
    const value = (name) => (form.querySelector(`input[name="${name}"]:checked`) || {}).value;
    const key = [value('temp'), value('milk'), value('mood')].join('-');
    return FINDER[key] || null;
}

function renderFinder() {
    const out = $('[data-finder-result]');
    const pick = finderPick();
    const found = pick && findItem(pick.item);
    if (!found) {
        out.innerHTML = '<p>Pick one of each and we\'ll suggest something.</p>';
        return;
    }
    out.innerHTML = `
        <p class="finder-result-label">Try the</p>
        <p class="finder-result-name">${esc(found.item.name)} <span>${formatPrice(priceOf(found.item))}</span></p>
        <p>${esc(pick.why)}</p>
        <button class="finder-go" type="button" data-finder-go="${esc(found.item.id)}">Find it on the menu</button>`;
}

function showOnMenu(id) {
    const found = findItem(id);
    if (!found) return;
    selectSection(found.section.id);
    const row = document.getElementById(`item-${id}`);
    if (!row) return;
    row.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    row.focus({ preventScroll: true });
    row.classList.add('is-picked');
    setTimeout(() => row.classList.remove('is-picked'), 1400);
}

// ---- Beans, room and regulars -------------------------------------------------

function renderBeans() {
    $('[data-beans]').innerHTML = BEANS.map((b, i) => {
        const subject = encodeURIComponent(`Please set aside a bag of ${b.name}`);
        const body = encodeURIComponent(`Hi! Could you set aside a ${b.size} bag of ${b.name} for me? I'll pick it up on:\n\nName:\n`);
        const meter = Array.from({ length: 5 }, (_, n) => `<i class="${n < b.roast ? 'on' : ''}"></i>`).join('');
        const roastWord = ['light', 'light-medium', 'medium', 'medium-dark', 'dark'][Math.min(4, Math.max(0, b.roast - 1))];
        return `<li class="bag" style="--band:${esc(b.band)};--band-ink:${esc(b.bandInk || '#24170f')}">
            <p class="bag-band"><span>${esc(b.kind)}</span><span>No. ${String(i + 1).padStart(2, '0')}</span></p>
            ${b.fresh ? '<span class="bag-sticker">Just<br>roasted</span>' : ''}
            <div class="bag-body">
                <h3 class="bag-name">${esc(b.name)}</h3>
                <p class="bag-origin">${esc(b.origin)}</p>
                <dl class="bag-specs">
                    <div><dt>Process</dt><dd>${esc(b.process)}</dd></div>
                    <div><dt>Altitude</dt><dd>${esc(b.altitude)}</dd></div>
                    <div><dt>Brew as</dt><dd>${esc(b.brew)}</dd></div>
                </dl>
                <ul class="bag-notes" aria-label="Tasting notes">${b.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>
                <p class="roast-meter" role="img" aria-label="Roast: ${roastWord}"><span>Light</span>${meter}<span>Dark</span></p>
                <div class="bag-foot">
                    <span class="bag-price">${formatPrice(b.price, false)} <small>/ ${esc(b.size)}</small></span>
                    <a class="bag-reserve" href="mailto:${esc(SHOP.email)}?subject=${subject}&amp;body=${body}">Set one aside</a>
                </div>
            </div>
        </li>`;
    }).join('');
}

function renderAmenities() {
    $('[data-amenities]').innerHTML = AMENITIES.map((a) => `<li>${icon(a.icon)}<span>${esc(a.label)}</span></li>`).join('');
}

function renderStampCard() {
    const slots = Array.from({ length: STAMP_CARD.stamps }, (_, i) => {
        if (i === STAMP_CARD.stamps - 1) return '<span class="stamp-slot is-free">Free</span>';
        if (i < STAMP_CARD.filled) {
            const tilt = [-14, 8, -4, 12, -9, 5, -12, 9, -6][i % 9];
            return `<span class="stamp-slot is-stamped" style="transform:rotate(${tilt}deg)">${icon('cup')}</span>`;
        }
        return `<span class="stamp-slot">${i + 1}</span>`;
    }).join('');
    $('[data-stamps]').innerHTML = `
        <div class="stamp-card-head"><strong>${esc(SHOP.shortName)}</strong><span>Regular's card</span></div>
        <div class="stamp-grid">${slots}</div>`;
}

function renderReviews() {
    $('[data-reviews]').innerHTML = REVIEWS.map((r) => `
        <li><figure class="review">
            <blockquote>“${esc(r.quote)}”</blockquote>
            <figcaption><span class="stars" aria-label="${r.stars} out of 5 stars">${'★'.repeat(r.stars)}</span>${esc(r.name)} · ${esc(r.source)}</figcaption>
        </figure></li>`).join('');
    $('[data-reviews-note]').textContent = REVIEWS_NOTE || '';
}

function renderGettingHere() {
    $('[data-getting-here]').innerHTML = GETTING_HERE
        .map((g) => `<li><strong>${esc(g.label)}</strong><span>${esc(g.text)}</span></li>`).join('');
}

// ---- Tuesday letter -----------------------------------------------------------

function setupLetter() {
    const form = $('[data-letter]');
    const input = form.querySelector('input[type="email"]');
    const msg = $('[data-letter-msg]');
    const say = (text, error = false) => {
        msg.textContent = text;
        msg.classList.toggle('is-error', error);
    };
    input.addEventListener('input', () => input.removeAttribute('aria-invalid'));
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = input.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            input.setAttribute('aria-invalid', 'true');
            say('That email doesn\'t look quite right.', true);
            input.focus();
            return;
        }
        if (SHOP.letterEndpoint) {
            const button = form.querySelector('button');
            button.disabled = true;
            try {
                const res = await fetch(SHOP.letterEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }),
                });
                if (!res.ok) throw new Error('status ' + res.status);
                form.reset();
                say('You\'re on the list. See you Tuesday.');
            } catch (err) {
                say('We couldn\'t sign you up just now. Please try again in a moment.', true);
            } finally {
                button.disabled = false;
            }
            return;
        }
        const subject = encodeURIComponent('Add me to the Tuesday letter');
        const body = encodeURIComponent(`Please add ${email} to the Tuesday letter.`);
        window.location.href = `mailto:${SHOP.email}?subject=${subject}&body=${body}`;
        say('Your email app should open with a note to us. Hit send and you\'re in.');
    });
}

// ---- Navigation -------------------------------------------------------------------

function setupNav() {
    const nav = $('[data-nav]');
    const toggle = $('[data-nav-toggle]');
    const links = $('[data-nav-links]');
    const setOpen = (open) => {
        links.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.querySelector('.sr-only').textContent = open ? 'Close the menu' : 'Open the menu';
    };
    toggle.addEventListener('click', () => setOpen(!links.classList.contains('is-open')));
    links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && links.classList.contains('is-open')) {
            setOpen(false);
            toggle.focus();
        }
    });
    const onScroll = () => nav.classList.toggle('is-stuck', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

// ---- Start ----------------------------------------------------------------------

renderShop();
renderTicker();
renderStatus();
renderMenuTabs();
selectSection(activeSection);
renderBeans();
renderAmenities();
renderStampCard();
renderReviews();
renderGettingHere();
setupLetter();
setupNav();

const finderForm = $('[data-finder]');
finderForm.addEventListener('change', renderFinder);
finderForm.addEventListener('submit', (e) => e.preventDefault());
$('[data-finder-result]').addEventListener('click', (e) => {
    const go = e.target.closest('[data-finder-go]');
    if (go) showOnMenu(go.dataset.finderGo);
});
renderFinder();

// Keep "open now" and the part of the day current while the page stays open.
setInterval(renderStatus, 60 * 1000);
