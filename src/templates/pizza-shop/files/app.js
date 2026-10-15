// Page content lives here as data so it is easy to find and change.
//
// SHOP fills every name, phone, email and address on the page (any element
// with data-bind="<key>", and links with data-bind-href="tel|mailto|map|catering").
// HOURS drives the open-now line, the hours table and the order times, in
// SHOP.timeZone. MENU is the menu; each item's prices are keyed by SIZES.
// BUILDER is the build-a-pie price list. ZONES are the delivery areas.
// SPECIALS has one entry per weekday.
//
// Orders have no backend: the order tray sends the order as a text message
// (or an email) to SHOP.orderPhone / SHOP.email, and the shop confirms it.
//
// SAMPLE_CONTENT marks the reviews and rating as samples on the page. Set it
// to false once they are the shop's own.

const SAMPLE_CONTENT = true;

const SHOP = {
    name: 'Calder Street Pizza',
    shortName: 'Calder St.',
    since: 2014,
    street: 'Calder Street',
    address: '418 Calder Street, Northgate',
    phone: '(555) 017-3380',
    // The number orders are texted to. Usually the same as the phone.
    orderPhone: '(555) 017-3380',
    email: 'orders@example.com',
    seating: 'Twenty seats, a counter by the oven and a bench out front. Walk-ins only.',
    rating: '4.8',
    reviewCount: 1260,
    // The shop's time zone, so "open now" and order times are right for everyone.
    timeZone: 'America/New_York',
    // Minutes from order to ready for pickup, and how far ahead people can order.
    pickupMinutes: 20,
    deliveryMinutes: 45,
    orderDaysAhead: 2,
};

// 24-hour times. A missing day is closed. Closing after midnight is not
// supported; use '23:59' for a late night.
const HOURS = {
    Tue: ['11:30', '22:00'],
    Wed: ['11:30', '22:00'],
    Thu: ['11:30', '22:00'],
    Fri: ['11:30', '23:30'],
    Sat: ['12:00', '23:30'],
    Sun: ['12:00', '21:00'],
};

// Price keys used by MENU items, in the order they are shown.
const SIZES = {
    slice: 'Slice',
    s12: '12″',
    s16: '16″',
    half: 'Half tray',
    full: 'Full tray',
    one: '',
};

const CATEGORIES = [
    { id: 'red', label: 'Red pies', intro: 'Crushed tomato, fior di latte, olive oil. 12″ feeds one hungry person, 16″ feeds two or three.' },
    { id: 'white', label: 'White pies', intro: 'No tomato. Garlic cream or olive oil, more cheese and something green.' },
    { id: 'squares', label: 'Squares', intro: 'Grandma-style, baked in oiled steel trays. A half tray is 6 squares, a full tray 12.' },
    { id: 'slices', label: 'Slices', intro: 'At the counter all day, reheated in the wood oven while you wait.' },
    { id: 'sides', label: 'Sides', intro: '' },
    { id: 'sweets', label: 'Sweet', intro: '' },
    { id: 'drinks', label: 'Drinks', intro: 'Beer and wine for 21 and over, with ID, at the shop only.' },
];

// tags: veg, spicy, new. photo is optional and shows when hovering the row.
const MENU = [
    { id: 'margherita', cat: 'red', name: 'Margherita', desc: 'Tomato, fior di latte, basil, olive oil, sea salt.', prices: { s12: 15, s16: 21 }, tags: ['veg'], photo: 'photos/margherita.jpg', alt: 'A blistered margherita pizza with basil' },
    { id: 'pepperoni', cat: 'red', name: 'Cup & Char', desc: 'Tomato, mozzarella and a lot of small pepperoni that curl into cups.', prices: { s12: 17, s16: 24 }, photo: 'photos/pepperoni.jpg', alt: 'A pepperoni pizza on a metal stand' },
    { id: 'prosciutto', cat: 'red', name: 'Prosciutto & Honey', desc: 'Tomato, mozzarella, prosciutto added after the bake, a drizzle of honey.', prices: { s12: 19, s16: 26 }, photo: 'photos/prosciutto.jpg', alt: 'A pizza covered with thin slices of prosciutto' },
    { id: 'rocket', cat: 'red', name: 'Rocket Man', desc: 'Tomato, mozzarella, roasted peppers, a heap of arugula and shaved parmesan.', prices: { s12: 17, s16: 24 }, tags: ['veg'], photo: 'photos/rocket.jpg', alt: 'A pizza topped with fresh arugula on a wooden board' },
    { id: 'diavola', cat: 'red', name: 'Diavola', desc: 'Tomato, mozzarella, hot soppressata, Calabrian chili, hot honey.', prices: { s12: 18, s16: 25 }, tags: ['spicy'] },
    { id: 'marinara', cat: 'red', name: 'Marinara', desc: 'Tomato, garlic, oregano, olive oil. No cheese, and it does not need it.', prices: { s12: 12, s16: 17 }, tags: ['veg'] },
    { id: 'bianca', cat: 'white', name: 'Bianca', desc: 'Garlic cream, mozzarella, ricotta, black pepper.', prices: { s12: 16, s16: 22 }, tags: ['veg'], photo: 'photos/bianca.jpg', alt: 'A white pizza with charred spots on the crust' },
    { id: 'funghi', cat: 'white', name: 'Funghi', desc: 'Roasted mushrooms, fontina, thyme, a little truffle oil.', prices: { s12: 18, s16: 25 }, tags: ['veg'], photo: 'photos/funghi.jpg', alt: 'A mushroom and cheese pizza on a wooden board with rosemary' },
    { id: 'limone', cat: 'white', name: 'Limone', desc: 'Olive oil, mozzarella, lemon zest, arugula, ribbons of parmesan.', prices: { s12: 17, s16: 24 }, tags: ['veg', 'new'], photo: 'photos/limone.jpg', alt: 'A white pizza with arugula and shaved parmesan beside a lemon' },
    { id: 'grandma', cat: 'squares', name: 'Grandma', desc: 'Thin square, mozzarella underneath, stripes of garlicky tomato on top.', prices: { half: 16, full: 28 }, tags: ['veg'], photo: 'photos/grandma.jpg', alt: 'Square slices of pizza with stripes of tomato sauce on a rack' },
    { id: 'corner', cat: 'squares', name: 'Corner Piece', desc: 'Thick, crispy-edged square with pepperoni, brick cheese and sauce on top.', prices: { half: 19, full: 34 } },
    { id: 'slice-cheese', cat: 'slices', name: 'Cheese slice', desc: 'The classic. Ask for it well done.', prices: { slice: 4 }, tags: ['veg'] },
    { id: 'slice-pep', cat: 'slices', name: 'Pepperoni slice', desc: 'Cup & Char by the slice.', prices: { slice: 4.5 } },
    { id: 'slice-veg', cat: 'slices', name: 'Garden slice', desc: 'Mushroom, peppers, olives, onion.', prices: { slice: 5 }, tags: ['veg'], photo: 'photos/slice.jpg', alt: 'A slice of pizza with mushrooms, peppers and olives' },
    { id: 'slice-square', cat: 'slices', name: 'Grandma square', desc: 'One square from the tray.', prices: { slice: 4.5 }, tags: ['veg'] },
    { id: 'knots', cat: 'sides', name: 'Garlic knots', desc: 'Six knots, garlic butter, parmesan, a cup of marinara.', prices: { one: 7 }, tags: ['veg'] },
    { id: 'caesar', cat: 'sides', name: 'Little Caesar', desc: 'Romaine, anchovy dressing, pizza-crust croutons.', prices: { one: 10 } },
    { id: 'meatballs', cat: 'sides', name: 'Meatballs', desc: 'Three beef and pork meatballs in tomato, with ricotta.', prices: { one: 12 } },
    { id: 'dolce', cat: 'sweets', name: 'Dolce pie', desc: '12″ of chocolate hazelnut, strawberries and banana. For sharing.', prices: { one: 14 }, tags: ['veg'], photo: 'photos/dolce.jpg', alt: 'A dessert pizza with chocolate, strawberries and banana' },
    { id: 'cannoli', cat: 'sweets', name: 'Cannoli', desc: 'Filled to order with orange ricotta.', prices: { one: 4 }, tags: ['veg'] },
    { id: 'soda', cat: 'drinks', name: 'Fountain soda', desc: 'Cola, diet, lemon-lime, root beer.', prices: { one: 3 } },
    { id: 'italian-soda', cat: 'drinks', name: 'Italian soda', desc: 'Blood orange or lemon, in a glass bottle.', prices: { one: 4 } },
    { id: 'beer', cat: 'drinks', name: 'Draft beer', desc: 'Two local taps, ask what is on. In the shop only.', prices: { one: 7 }, dineInOnly: true },
];

const TAGS = { veg: 'Vegetarian', spicy: 'Spicy', new: 'New' };

// Build-a-pie. Topping prices are for the whole pie; a topping on one half
// costs half.
const BUILDER = {
    sizes: [
        { id: 's12', label: '12″', price: 12 },
        { id: 's16', label: '16″', price: 17 },
    ],
    bases: [
        { id: 'red', label: 'Red sauce', color: '#c8361d' },
        { id: 'white', label: 'Garlic cream', color: '#f3e3c1' },
        { id: 'pesto', label: 'Pesto', color: '#5f8a3a' },
    ],
    toppings: [
        { id: 'pepperoni', label: 'Pepperoni', price: { s12: 2, s16: 3 } },
        { id: 'sausage', label: 'Fennel sausage', price: { s12: 2.5, s16: 3.5 } },
        { id: 'mushroom', label: 'Mushrooms', price: { s12: 2, s16: 3 }, veg: true },
        { id: 'olive', label: 'Black olives', price: { s12: 1.5, s16: 2 }, veg: true },
        { id: 'onion', label: 'Red onion', price: { s12: 1, s16: 1.5 }, veg: true },
        { id: 'pepper', label: 'Green peppers', price: { s12: 1.5, s16: 2 }, veg: true },
        { id: 'jalapeno', label: 'Jalapeños', price: { s12: 1.5, s16: 2 }, veg: true },
        { id: 'basil', label: 'Fresh basil', price: { s12: 1, s16: 1 }, veg: true },
        { id: 'ricotta', label: 'Ricotta', price: { s12: 2, s16: 3 }, veg: true },
    ],
};

// Delivery areas. fee is added to the order; min is the smallest order.
const ZONES = [
    { name: 'Northgate', zips: ['02140', '02141'], fee: 2, min: 15 },
    { name: 'Riverside', zips: ['02138'], fee: 3, min: 20 },
    { name: 'Hollow Park', zips: ['02142', '02139'], fee: 4, min: 25 },
];

// One per weekday. A closed day can still have an entry; it is shown as closed.
const SPECIALS = {
    Mon: { title: 'Oven day off', body: 'We clean the oven and feed the starter. See you Tuesday.' },
    Tue: { title: 'Two-slice Tuesday', body: 'Any two slices and a fountain soda for $9.' },
    Wed: { title: 'Half-price knots', body: 'Garlic knots are $3.50 with any whole pie.' },
    Thu: { title: 'Pie of the week', body: 'Something new from the kitchen. Ask at the counter or call.' },
    Fri: { title: 'Late slices', body: 'Slices until close, and a 16″ cheese pie for $16 after 9pm.' },
    Sat: { title: 'Square Saturday', body: 'Full grandma trays are $24 all day.' },
    Sun: { title: 'Family night', body: 'Two 16″ pies, knots and a Caesar for $52.' },
};

const STATS = [
    { n: '48 hrs', label: 'dough rest' },
    { n: '90 sec', label: 'in the oven' },
    { n: '800°F', label: 'oven floor' },
];

const REVIEWS = [
    { name: 'Dana P.', note: 'Regular since 2019', text: 'The crust has those leopard spots you only get from a real fire, and it still holds up on the walk home. The Diavola with hot honey is the best thing on Calder Street.' },
    { name: 'Marcus L.', note: 'Ordered for an office party', text: 'Ordered eight trays the day before, they were ready to the minute and someone carried them to the car. Grandma squares disappeared first.' },
    { name: 'Priya S.', note: 'Slice at the counter', text: 'I come for a slice on my lunch break. Reheated in the wood oven, so it is crispier than when it was fresh. They remember my order now.' },
];

const FAQ = [
    { q: 'How do I order ahead?', a: 'Add what you want to the order, pick pickup or delivery and a time, and send it. It arrives as a text to the shop and we text back to confirm. You can always just call us too.' },
    { q: 'How do I pay?', a: 'In the shop or at the door, by card or cash. We do not take payment online.' },
    { q: 'Can I get half and half?', a: 'Yes, on any 12″ or 16″ pie. Build your own and put toppings on one half, or say which two pies you want in the order notes. You pay for the more expensive half.' },
    { q: 'Do you have gluten-free crust?', a: 'We make a gluten-free 12″ crust for $3 more, but it is baked in the same oven as everything else, so it is not safe for celiac disease.' },
    { q: 'Do you take reservations?', a: 'No, the shop is walk-in only. For groups of 8 or more, call us in the afternoon and we will hold the long table if we can.' },
    { q: 'Do you cater?', a: 'Yes. Full trays, pies by the dozen and a slice table. Give us a day\'s notice for 10 pies or more, and email us for anything bigger.' },
];

// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
const toMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

function fmtTime(mins) {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const ampm = h < 12 ? 'am' : 'pm';
    const h12 = h % 12 || 12;
    return m ? `${h12}:${String(m).padStart(2, '0')}${ampm}` : `${h12}${ampm}`;
}

function fmtDate(d) {
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
}

// The shop's date and time now. `date` is that calendar day at noon, for day
// arithmetic and labels; `minutes` is the time of day.
function shopNow() {
    let parts;
    try {
        parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
            timeZone: SHOP.timeZone, year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
        }).formatToParts(new Date()).map((p) => [p.type, p.value]));
    } catch {
        const d = new Date();
        parts = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() };
    }
    const date = new Date(Number(parts.year), Number(parts.month) - 1, Number(parts.day), 12);
    return { date, day: DAYS[date.getDay()], minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const hoursOn = (d) => HOURS[DAYS[d.getDay()]];

// "Open now, until 10pm" or "Closed, opens Tuesday at 11:30am".
function openStatus() {
    const now = shopNow();
    const today = HOURS[now.day];
    if (today && now.minutes >= toMinutes(today[0]) && now.minutes < toMinutes(today[1])) {
        return { open: true, text: `Open now, until ${fmtTime(toMinutes(today[1]))}` };
    }
    if (today && now.minutes < toMinutes(today[0])) {
        return { open: false, text: `Closed, opens today at ${fmtTime(toMinutes(today[0]))}` };
    }
    for (let i = 1; i <= 7; i++) {
        const d = addDays(now.date, i);
        const h = hoursOn(d);
        if (h) return { open: false, text: `Closed, opens ${i === 1 ? 'tomorrow' : DAY_NAMES[DAYS[d.getDay()]]} at ${fmtTime(toMinutes(h[0]))}` };
    }
    return { open: false, text: 'Closed' };
}

// The number for tel: and sms: links, from the displayed one. Ten digits
// without a country code are read as a US number.
function phoneLink(phone) {
    const digits = String(phone).replace(/\D/g, '');
    if (String(phone).trim().startsWith('+')) return `+${digits}`;
    return digits.length === 10 ? `+1${digits}` : digits;
}

const zoneForZip = (zip) => ZONES.find((z) => z.zips.includes(zip));
const itemById = (id) => MENU.find((m) => m.id === id);

let toastTimer;
function toast(text) {
    const el = $('#toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---- Shop details ------------------------------------------------------------

function bindShop() {
    const slices = MENU.filter((m) => m.prices.slice).map((m) => m.prices.slice);
    const values = {
        ...SHOP,
        reviewCount: SHOP.reviewCount.toLocaleString('en-US'),
        pickupLine: `${SHOP.pickupMinutes} min`,
        sliceFrom: slices.length ? money(Math.min(...slices)) : '',
    };
    document.querySelectorAll('[data-bind]').forEach((el) => {
        const v = values[el.dataset.bind];
        if (v !== undefined) el.textContent = v;
    });
    const hrefs = {
        tel: `tel:${phoneLink(SHOP.phone)}`,
        mailto: `mailto:${SHOP.email}`,
        map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SHOP.name}, ${SHOP.address}`)}`,
        catering: `mailto:${SHOP.email}?subject=${encodeURIComponent('Catering enquiry')}`,
    };
    document.querySelectorAll('[data-bind-href]').forEach((el) => { el.href = hrefs[el.dataset.bindHref]; });
    $('#ring-text').textContent = `Wood-fired · ${SHOP.address.split(',').pop().trim()} · Since ${SHOP.since} · Slices all day · `;
    $('#year').textContent = shopNow().date.getFullYear();
}

function renderStatus() {
    const s = openStatus();
    $('[data-status]').textContent = s.text;
    $('[data-status-wrap]').classList.toggle('closed', !s.open);
    const today = SPECIALS[shopNow().day];
    const sticker = $('#today-sticker');
    if (today && HOURS[shopNow().day]) {
        sticker.querySelector('b').textContent = today.title;
        sticker.hidden = false;
    } else {
        sticker.hidden = true;
    }
}

function renderTicker() {
    const names = MENU.filter((m) => ['red', 'white', 'squares'].includes(m.cat)).map((m) => m.name);
    const run = names.map((n) => `<span>${esc(n)}</span><i>✺</i>`).join('');
    // Two copies, so the loop is seamless.
    $('#ticker').innerHTML = `<div>${run}</div><div>${run}</div>`;
}

// ---- Menu ---------------------------------------------------------------------

let menuCat = CATEGORIES[0].id;

function initMenu() {
    const tabs = $('#menu-tabs');
    tabs.innerHTML = CATEGORIES.filter((c) => MENU.some((m) => m.cat === c.id)).map((c) =>
        `<button type="button" class="tab" data-cat="${esc(c.id)}" aria-pressed="${c.id === menuCat}">${esc(c.label)}</button>`).join('');
    tabs.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        menuCat = b.dataset.cat;
        tabs.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-pressed', String(t === b)));
        renderMenu();
    });
    $('#menu-list').addEventListener('click', (e) => {
        const b = e.target.closest('[data-add]');
        if (!b) return;
        const item = itemById(b.dataset.add);
        addLine({ kind: 'menu', id: item.id, size: b.dataset.size });
        b.classList.remove('pop');
        void b.offsetWidth;
        b.classList.add('pop');
    });
    $('#menu-legend').innerHTML = Object.entries(TAGS).map(([k, v]) => `<span class="tag tag-${k}">${esc(v)}</span>`).join('');
    initPeek();
    renderMenu();
}

function renderMenu() {
    const cat = CATEGORIES.find((c) => c.id === menuCat);
    $('#menu-intro').textContent = cat.intro || '';
    $('#menu-list').innerHTML = MENU.filter((m) => m.cat === menuCat).map((m, i) => {
        const tags = (m.tags || []).map((t) => `<span class="tag tag-${t}">${esc(TAGS[t])}</span>`).join('');
        const prices = Object.keys(SIZES).filter((k) => m.prices[k] !== undefined).map((k) => m.dineInOnly
            ? `<span class="price price-static">${SIZES[k] ? `<small>${esc(SIZES[k])}</small>` : ''}${money(m.prices[k])}</span>`
            : `<button type="button" class="price" data-add="${esc(m.id)}" data-size="${k}" aria-label="Add ${esc(m.name)}${SIZES[k] ? ` ${esc(SIZES[k])}` : ''}, ${money(m.prices[k])}">${SIZES[k] ? `<small>${esc(SIZES[k])}</small>` : ''}${money(m.prices[k])}<span class="plus" aria-hidden="true">+</span></button>`).join('');
        return `
        <article class="dish${m.photo ? ' has-photo' : ''}" style="--i:${i}"${m.photo ? ` data-photo="${esc(m.photo)}"` : ''}>
            ${m.photo ? `<img class="dish-thumb" src="${esc(m.photo)}" alt="${esc(m.alt || '')}" loading="lazy">` : ''}
            <div class="dish-text">
                <h3>${esc(m.name)}${tags}</h3>
                <p>${esc(m.desc)}${m.dineInOnly ? ' <em>Dine in only.</em>' : ''}</p>
            </div>
            <span class="leader" aria-hidden="true"></span>
            <div class="prices">${prices}</div>
        </article>`;
    }).join('');
}

// On a mouse, rows with a photo show it floating beside the cursor.
function initPeek() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const peek = $('#peek');
    const img = peek.querySelector('img');
    const list = $('#menu-list');
    let current = null;
    list.addEventListener('mousemove', (e) => {
        const row = e.target.closest('[data-photo]');
        if (!row || e.target.closest('.prices')) {
            peek.classList.remove('on');
            current = null;
            return;
        }
        if (row !== current) {
            current = row;
            img.src = row.dataset.photo;
        }
        peek.style.transform = `translate(${e.clientX + 24}px, ${e.clientY - 90}px) rotate(-4deg)`;
        peek.classList.add('on');
    });
    list.addEventListener('mouseleave', () => { peek.classList.remove('on'); current = null; });
}

// ---- Build a pie --------------------------------------------------------------

// Each topping is off, or on the whole pie, the left half or the right half.
const build = { size: 's12', base: 'red', tops: {} };
const PLACES = ['whole', 'left', 'right'];
const PLACE_LABEL = { whole: 'Whole', left: 'Left half', right: 'Right half' };

function segmented(root, name, options, value, onChange) {
    root.innerHTML = options.map((o) => `
        <label class="seg-opt">
            <input type="radio" name="${name}" value="${esc(o.value)}"${o.value === value ? ' checked' : ''}>
            <span>${esc(o.label)}${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</span>
        </label>`).join('');
    root.addEventListener('change', (e) => { if (e.target.name === name) onChange(e.target.value); });
}

function buildPrice() {
    const size = BUILDER.sizes.find((s) => s.id === build.size);
    let total = size.price;
    for (const [id, place] of Object.entries(build.tops)) {
        const t = BUILDER.toppings.find((x) => x.id === id);
        total += place === 'whole' ? t.price[build.size] : t.price[build.size] / 2;
    }
    return Math.round(total * 100) / 100;
}

function buildSummary() {
    const base = BUILDER.bases.find((b) => b.id === build.base);
    const parts = [base.label];
    for (const place of PLACES) {
        const names = Object.entries(build.tops).filter(([, p]) => p === place)
            .map(([id]) => BUILDER.toppings.find((t) => t.id === id).label.toLowerCase());
        if (!names.length) continue;
        parts.push(place === 'whole' ? names.join(', ') : `${place} half: ${names.join(', ')}`);
    }
    return parts.join('; ');
}

function initBuilder() {
    segmented($('#b-size'), 'b-size', BUILDER.sizes.map((s) => ({ value: s.id, label: s.label, hint: `from ${money(s.price)}` })), build.size, (v) => { build.size = v; refreshBuilder(); });
    segmented($('#b-sauce'), 'b-sauce', BUILDER.bases.map((b) => ({ value: b.id, label: b.label })), build.base, (v) => { build.base = v; refreshBuilder(); });
    const tops = $('#b-tops');
    tops.innerHTML = BUILDER.toppings.map((t) => `
        <button type="button" class="top" data-top="${esc(t.id)}" aria-pressed="false">
            <svg viewBox="-12 -12 24 24" aria-hidden="true">${toppingShape(t.id, 0, 0, 0, 1.15)}</svg>
            <span class="top-name">${esc(t.label)}</span>
            <span class="top-place" aria-live="polite"></span>
        </button>`).join('');
    // Off → whole → left half → right half → off.
    tops.addEventListener('click', (e) => {
        const b = e.target.closest('[data-top]');
        if (!b) return;
        const id = b.dataset.top;
        const cur = build.tops[id];
        const next = !cur ? 'whole' : PLACES[PLACES.indexOf(cur) + 1];
        if (next) build.tops[id] = next; else delete build.tops[id];
        refreshBuilder();
    });
    $('#builder').addEventListener('submit', (e) => {
        e.preventDefault();
        addLine({ kind: 'custom', size: build.size, base: build.base, tops: { ...build.tops } });
    });
    refreshBuilder();
}

function refreshBuilder() {
    const size = BUILDER.sizes.find((s) => s.id === build.size);
    document.querySelectorAll('#b-tops .top').forEach((b) => {
        const place = build.tops[b.dataset.top];
        b.setAttribute('aria-pressed', String(!!place));
        b.dataset.place = place || '';
        b.querySelector('.top-place').textContent = place ? PLACE_LABEL[place] : '';
    });
    $('#b-price').textContent = money(buildPrice());
    $('#b-detail').textContent = `${size.label} pie`;
    $('#pie-caption').textContent = buildSummary();
    drawPie();
}

// A small seeded random generator, so toppings land in the same spots every
// time the pie is redrawn.
function seeded(seed) {
    let s = 0;
    for (const c of seed) s = (s * 31 + c.charCodeAt(0)) >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function toppingShape(id, x, y, rot, scale = 1) {
    const g = (inner) => `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)}) scale(${scale})">${inner}</g>`;
    switch (id) {
        case 'pepperoni': return g('<circle r="10" fill="#a8261a"/><circle r="10" fill="none" stroke="#7d1a10" stroke-width="1.5"/><circle cx="-3" cy="-2" r="1.6" fill="#e6a07f"/><circle cx="3.5" cy="2.5" r="1.3" fill="#e6a07f"/><circle cx="2" cy="-4.5" r="1" fill="#e6a07f"/>');
        case 'sausage': return g('<path d="M-6-5c4-4 10-2 10 3s-2 9-7 8-8-7-3-11z" fill="#7a4a2c"/><circle cx="-1" cy="0" r="1.2" fill="#a8774f"/>');
        case 'mushroom': return g('<path d="M-9 1a9 8 0 0 1 18 0z" fill="#d9c3a0" stroke="#8c6b45" stroke-width="1.2"/><path d="M-3 1h6v7h-6z" fill="#e8d8bc" stroke="#8c6b45" stroke-width="1.2"/>');
        case 'olive': return g('<circle r="5" fill="none" stroke="#1d1a17" stroke-width="3.4"/>');
        case 'onion': return g('<path d="M-8 4a9 9 0 0 1 16 0" fill="none" stroke="#9b4b8a" stroke-width="2.4" stroke-linecap="round"/>');
        case 'pepper': return g('<path d="M-8 3a8 7 0 0 1 16 0" fill="none" stroke="#3f8a2e" stroke-width="3" stroke-linecap="round"/>');
        case 'jalapeno': return g('<circle r="5.5" fill="#5aa13a"/><circle r="3.2" fill="#c9df8a"/><circle cx="-1" cy="0" r=".8" fill="#f2f0d8"/><circle cx="1.2" cy=".6" r=".8" fill="#f2f0d8"/>');
        case 'basil': return g('<path d="M0-9c7 3 7 13 0 17-7-4-7-14 0-17z" fill="#2f7a35"/><path d="M0-8v15" stroke="#1f5524" stroke-width="1"/>');
        case 'ricotta': return g('<path d="M-6-3c2-5 9-4 9 1 4 1 3 7-1 7-2 3-8 2-8-2-3-1-3-5 0-6z" fill="#fbf7ee" stroke="#e4dccb" stroke-width="1"/>');
        default: return '';
    }
}

function drawPie() {
    const base = BUILDER.bases.find((b) => b.id === build.base);
    const big = build.size === 's16';
    const R = big ? 150 : 128;
    const sauceR = R - 16;
    const rand = seeded('cheese');
    let cheese = '';
    // Melted cheese: soft blobs with a browned edge here and there.
    for (let i = 0; i < 40; i++) {
        const a = rand() * Math.PI * 2;
        const d = Math.sqrt(rand()) * (sauceR - 10);
        const r = 7 + rand() * 11;
        const x = (Math.cos(a) * d).toFixed(1);
        const y = (Math.sin(a) * d).toFixed(1);
        cheese += `<ellipse cx="${x}" cy="${y}" rx="${r.toFixed(1)}" ry="${(r * (0.65 + rand() * 0.35)).toFixed(1)}" transform="rotate(${(rand() * 180).toFixed(0)} ${x} ${y})" fill="${rand() < 0.2 ? '#f1d59a' : '#fcf1d4'}" opacity="${(0.75 + rand() * 0.2).toFixed(2)}"/>`;
    }
    let tops = '';
    for (const [id, place] of Object.entries(build.tops)) {
        const r = seeded(id);
        const count = big ? 16 : 12;
        let placed = 0;
        for (let tries = 0; placed < count && tries < 200; tries++) {
            const a = r() * Math.PI * 2;
            const d = Math.sqrt(r()) * (sauceR - 14);
            const x = Math.cos(a) * d;
            const y = Math.sin(a) * d;
            const rot = r() * 360;
            if (place === 'left' && x > -6) continue;
            if (place === 'right' && x < 6) continue;
            if (place !== 'whole' && placed >= count / 2 + 2) break;
            tops += toppingShape(id, x, y, rot);
            placed++;
        }
    }
    const halves = Object.values(build.tops).some((p) => p !== 'whole')
        ? `<line x1="0" y1="${-sauceR}" x2="0" y2="${sauceR}" stroke="rgba(255,255,255,.55)" stroke-width="2" stroke-dasharray="5 6"/>` : '';
    $('#pie').innerHTML = `<title id="pie-label">Your pizza: ${esc(buildSummary())}</title>
        <defs>
            <radialGradient id="crust" r=".5"><stop offset=".86" stop-color="#e7b46d"/><stop offset=".95" stop-color="#c98a43"/><stop offset="1" stop-color="#9b5f27"/></radialGradient>
        </defs>
        <g class="pie-group">
            <circle r="${R}" fill="url(#crust)"/>
            <circle cx="${-R * 0.55}" cy="${-R * 0.72}" r="7" fill="#3a2414" opacity=".55"/>
            <circle cx="${R * 0.82}" cy="${R * 0.3}" r="5" fill="#3a2414" opacity=".5"/>
            <circle cx="${R * 0.1}" cy="${R * 0.93}" r="6" fill="#3a2414" opacity=".45"/>
            <circle r="${sauceR}" fill="${base.color}"/>
            ${cheese}
            ${halves}
            ${tops}
        </g>`;
}

// ---- This week, story, reviews, FAQ --------------------------------------------

function renderWeek() {
    const now = shopNow();
    // Start the week on today, so the first card is always what is on now.
    $('#week-list').innerHTML = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(now.date, i);
        const key = DAYS[d.getDay()];
        const h = HOURS[key];
        const s = SPECIALS[key] || { title: 'Regular menu', body: '' };
        return `
        <li class="day${i === 0 ? ' today' : ''}${h ? '' : ' closed'}">
            <p class="day-name">${i === 0 ? '<span class="today-tag">Today</span>' : ''}${esc(DAY_NAMES[key])}</p>
            <h3>${esc(h ? s.title : (SPECIALS[key] ? s.title : 'Closed'))}</h3>
            <p>${esc(s.body)}</p>
            <p class="day-hours">${h ? `${fmtTime(toMinutes(h[0]))} to ${fmtTime(toMinutes(h[1]))}` : 'Closed'}</p>
        </li>`;
    }).join('');
}

function renderStats() {
    $('#stats').innerHTML = STATS.map((s) => `<li><b>${esc(s.n)}</b><span>${esc(s.label)}</span></li>`).join('');
}

function renderReviews() {
    $('#review-list').innerHTML = REVIEWS.map((r, i) => `
        <figure class="review" style="--tilt:${[-1.2, 0.8, -0.4][i % 3]}deg">
            <span class="stars" aria-label="5 out of 5 stars">★★★★★</span>
            <blockquote>${esc(r.text)}</blockquote>
            <figcaption><b>${esc(r.name)}</b><small>${esc(r.note)}</small></figcaption>
        </figure>`).join('');
}

function renderFaq() {
    $('#faq-list').innerHTML = FAQ.map((f, i) => `
        <details${i === 0 ? ' open' : ''}>
            <summary>${esc(f.q)}<span aria-hidden="true"></span></summary>
            <p>${esc(f.a)}</p>
        </details>`).join('');
}

// ---- Hours and delivery ----------------------------------------------------------

function renderHours() {
    const today = shopNow().day;
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    $('#hours tbody').innerHTML = order.map((d) => {
        const h = HOURS[d];
        return `<tr${d === today ? ' class="today"' : ''}><th scope="row">${esc(DAY_NAMES[d])}</th><td>${h ? `${fmtTime(toMinutes(h[0]))} to ${fmtTime(toMinutes(h[1]))}` : 'Closed'}</td></tr>`;
    }).join('');
}

function zoneLine(z) {
    return `${z.name}: ${money(z.fee)} delivery, ${money(z.min)} minimum`;
}

function renderZones() {
    $('#zones').innerHTML = ZONES.map((z) => `
        <li><b>${esc(z.name)}</b><span>${esc(z.zips.join(', '))}</span><span>${money(z.fee)} fee · ${money(z.min)} min</span></li>`).join('');
    const input = $('#zc-zip');
    input.addEventListener('input', () => { input.value = input.value.replace(/\D/g, ''); });
    $('#zip-check').addEventListener('submit', (e) => {
        e.preventDefault();
        const zip = input.value.trim();
        const out = $('#zip-out');
        const z = zoneForZip(zip);
        out.className = 'zip-out';
        if (!/^\d{5}$/.test(zip)) {
            out.textContent = 'Enter a 5-digit ZIP code.';
        } else if (z) {
            out.classList.add('ok');
            out.textContent = `Yes, we deliver to ${zip}. ${zoneLine(z)}, about ${SHOP.deliveryMinutes} minutes.`;
        } else {
            out.classList.add('miss');
            out.textContent = `${zip} is outside our delivery area, but pickup is always on.`;
        }
    });
}

// ---- Order tray ----------------------------------------------------------------

const STORE_KEY = 'pizza-order-v1';
let lines = [];
const order = { mode: 'pickup' };

function loadLines() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
        lines = Array.isArray(saved) ? saved.filter(lineIsValid) : [];
    } catch { lines = []; }
}

function saveLines() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(lines)); } catch { /* private mode */ }
}

// A saved line can outlive a menu change, so drop any that no longer match.
function lineIsValid(l) {
    if (!l || !(l.qty > 0)) return false;
    if (l.kind === 'menu') { const m = itemById(l.id); return !!m && m.prices[l.size] !== undefined && !m.dineInOnly; }
    if (l.kind === 'custom') {
        if (!BUILDER.sizes.some((s) => s.id === l.size) || !BUILDER.bases.some((b) => b.id === l.base)) return false;
        if (!l.tops || typeof l.tops !== 'object' || Array.isArray(l.tops)) return false;
        return Object.entries(l.tops).every(([id, place]) => {
            const t = BUILDER.toppings.find((x) => x.id === id);
            return !!t && PLACES.includes(place) && typeof t.price[l.size] === 'number';
        });
    }
    return false;
}

function lineKey(l) {
    return l.kind === 'menu' ? `m:${l.id}:${l.size}` : `c:${l.size}:${l.base}:${Object.entries(l.tops).sort().map((e) => e.join('=')).join(',')}`;
}

function lineInfo(l) {
    if (l.kind === 'menu') {
        const m = itemById(l.id);
        return { name: m.name, detail: SIZES[l.size] || '', unit: m.prices[l.size] };
    }
    const saved = { ...build };
    Object.assign(build, { size: l.size, base: l.base, tops: l.tops });
    const info = { name: `Build-your-own ${BUILDER.sizes.find((s) => s.id === l.size).label}`, detail: buildSummary(), unit: buildPrice() };
    Object.assign(build, saved);
    return info;
}

function addLine(l) {
    const key = lineKey(l);
    const existing = lines.find((x) => lineKey(x) === key);
    if (existing) existing.qty++;
    else lines.push({ ...l, qty: 1 });
    saveLines();
    renderTray();
    const info = lineInfo(l);
    toast(`Added ${info.name}${l.kind === 'menu' && info.detail ? ` ${info.detail}` : ''}`);
    document.querySelectorAll('[data-tray-count]').forEach((b) => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
}

function subtotal() {
    return lines.reduce((n, l) => n + lineInfo(l).unit * l.qty, 0);
}

function deliveryZone() {
    return order.mode === 'delivery' ? zoneForZip($('#o-zip').value.trim()) : null;
}

function renderTray() {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    document.querySelectorAll('[data-tray-count]').forEach((b) => { b.textContent = count; b.hidden = !count; });
    $('#lines').innerHTML = lines.map((l, i) => {
        const info = lineInfo(l);
        return `
        <li class="line">
            <div class="line-text"><b>${esc(info.name)}</b>${info.detail ? `<small>${esc(info.detail)}</small>` : ''}</div>
            <div class="qty">
                <button type="button" data-qty="-1" data-i="${i}" aria-label="One less ${esc(info.name)}">−</button>
                <span>${l.qty}</span>
                <button type="button" data-qty="1" data-i="${i}" aria-label="One more ${esc(info.name)}">+</button>
            </div>
            <span class="line-price">${money(Math.round(info.unit * l.qty * 100) / 100)}</span>
        </li>`;
    }).join('');
    const empty = !lines.length;
    $('#tray-empty').hidden = !empty;
    $('#checkout').hidden = empty;
    $('#tray-foot').hidden = empty;
    renderTotals();
}

function renderTotals() {
    const sub = Math.round(subtotal() * 100) / 100;
    const z = deliveryZone();
    const rows = [['Subtotal', money(sub)]];
    if (order.mode === 'delivery') rows.push(['Delivery', z ? money(z.fee) : '—']);
    const total = sub + (z ? z.fee : 0);
    rows.push(['Total', money(Math.round(total * 100) / 100)]);
    $('#totals').innerHTML = rows.map(([k, v], i) => `<div${i === rows.length - 1 ? ' class="grand"' : ''}><dt>${k}</dt><dd>${v}</dd></div>`).join('') +
        '<p class="pay-note">Pay in the shop or at the door. Tax is added when you pay.</p>';
    const hint = $('#o-zip-out');
    if (order.mode === 'delivery') {
        const zip = $('#o-zip').value.trim();
        hint.className = 'hint';
        if (!zip) hint.textContent = `We deliver to ${ZONES.map((x) => x.name).join(', ')}.`;
        else if (!/^\d{5}$/.test(zip)) hint.textContent = 'Enter a 5-digit ZIP code.';
        else if (!z) { hint.textContent = `Sorry, ${zip} is outside our delivery area. Pickup is always on.`; hint.classList.add('miss'); }
        else if (sub < z.min) { hint.textContent = `${z.name} has a ${money(z.min)} minimum. Add ${money(Math.round((z.min - sub) * 100) / 100)} more.`; hint.classList.add('miss'); }
        else { hint.textContent = `${zoneLine(z)}. About ${SHOP.deliveryMinutes} minutes.`; hint.classList.add('ok'); }
    }
}

// Order times: as soon as possible when the order can be ready before
// closing, then 15-minute slots for the next few open days. Slot values carry
// the date, so a choice made before midnight still means the same day after.
function orderTimes() {
    const now = shopNow();
    const lead = order.mode === 'delivery' ? SHOP.deliveryMinutes : SHOP.pickupMinutes;
    const out = [];
    const today = HOURS[now.day];
    if (today && now.minutes >= toMinutes(today[0]) && now.minutes + lead <= toMinutes(today[1])) {
        out.push({ value: 'asap', label: `As soon as possible (about ${lead} min)`, text: 'As soon as possible' });
    }
    for (let i = 0; i <= SHOP.orderDaysAhead; i++) {
        const d = addDays(now.date, i);
        const h = hoursOn(d);
        if (!h) continue;
        const open = toMinutes(h[0]) + lead;
        const close = toMinutes(h[1]) - 15;
        let start = Math.max(open, i === 0 ? now.minutes + lead + 10 : 0);
        start = Math.ceil(start / 15) * 15;
        const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : DAY_NAMES[DAYS[d.getDay()]];
        const opts = [];
        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dateText = fmtDate(d);
        for (let m = start; m <= close; m += 15) {
            opts.push({ value: `${ymd} ${m}`, label: fmtTime(m), text: `${dateText} at ${fmtTime(m)}` });
        }
        if (opts.length) out.push({ group: dayLabel, opts });
    }
    return out;
}

function renderTimes() {
    const sel = $('#o-time');
    const prev = sel.value;
    sel.innerHTML = orderTimes().map((o) => o.group
        ? `<optgroup label="${esc(o.group)}">${o.opts.map((x) => `<option value="${esc(x.value)}">${esc(x.label)}</option>`).join('')}</optgroup>`
        : `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
    if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
}

// The current option for a selected value, or undefined once it has passed.
function timeOption(value) {
    return orderTimes().flatMap((o) => (o.group ? o.opts : [o])).find((o) => o.value === value);
}

function orderText() {
    const f = $('#order-form').elements;
    const z = deliveryZone();
    const out = [`New ${order.mode} order for ${SHOP.shortName}`, ''];
    for (const l of lines) {
        const info = lineInfo(l);
        out.push(`${l.qty} × ${info.name}${info.detail ? ` (${info.detail})` : ''}: ${money(Math.round(info.unit * l.qty * 100) / 100)}`);
    }
    const sub = Math.round(subtotal() * 100) / 100;
    out.push('', `Subtotal: ${money(sub)}`);
    if (z) out.push(`Delivery (${z.name}): ${money(z.fee)}`);
    out.push(`Total: ${money(Math.round((sub + (z ? z.fee : 0)) * 100) / 100)}`, '');
    const time = timeOption(f.time.value).text;
    out.push(`${order.mode === 'delivery' ? 'Deliver' : 'Pickup'}: ${time}`);
    if (order.mode === 'delivery') out.push(`Address: ${f.address.value.trim()}, ${f.zip.value.trim()}`);
    out.push(`Name: ${f.name.value.trim()}`, `Phone: ${f.phone.value.trim()}`);
    if (f.notes.value.trim()) out.push(`Notes: ${f.notes.value.trim()}`);
    return out.join('\n');
}

// Returns the first problem as text, marking the field, or null when the
// order can be sent.
function checkOrder() {
    const f = $('#order-form').elements;
    const need = ['name', 'phone'];
    if (order.mode === 'delivery') need.unshift('zip', 'address');
    let bad = null;
    for (const n of need) {
        const empty = !f[n].value.trim();
        f[n].classList.toggle('invalid', empty);
        if (empty && !bad) bad = f[n];
    }
    if (bad) { bad.focus(); return order.mode === 'delivery' ? 'Add your address, name and phone number.' : 'Add your name and a phone number so we can confirm.'; }
    // The drawer may have sat open past a slot or past closing.
    if (!timeOption(f.time.value)) {
        renderTimes();
        f.time.focus();
        return f.time.value
            ? 'That time is no longer available. Pick another time and send again.'
            : 'We are not taking orders for the next few days. Call the shop.';
    }
    if (order.mode === 'delivery') {
        const z = deliveryZone();
        if (!z) { f.zip.classList.add('invalid'); f.zip.focus(); return 'That ZIP code is outside our delivery area. Switch to pickup, or call us.'; }
        if (subtotal() < z.min) return `Delivery to ${z.name} has a ${money(z.min)} minimum.`;
    }
    return null;
}

function sendOrder(via) {
    const note = $('#o-note');
    const problem = checkOrder();
    if (problem) {
        note.className = 'form-note miss';
        note.textContent = problem;
        return;
    }
    const body = orderText();
    if (via === 'email') {
        window.location.href = `mailto:${SHOP.email}?subject=${encodeURIComponent(`${order.mode === 'delivery' ? 'Delivery' : 'Pickup'} order, ${$('#order-form').elements.name.value.trim()}`)}&body=${encodeURIComponent(body)}`;
    } else {
        // "?&body=" works on both iOS and Android.
        window.location.href = `sms:${phoneLink(SHOP.orderPhone)}?&body=${encodeURIComponent(body)}`;
    }
    note.className = 'form-note ok';
    note.textContent = `Your ${via === 'email' ? 'email' : 'messages'} app should open with the order. Send it and we will reply to confirm. Nothing happened? Call ${SHOP.phone}.`;
}

function initTray() {
    const dlg = $('#tray');
    loadLines();
    segmented($('#o-mode'), 'o-mode', [{ value: 'pickup', label: 'Pickup' }, { value: 'delivery', label: 'Delivery' }], order.mode, (v) => {
        order.mode = v;
        $('#o-zip-field').hidden = v !== 'delivery';
        renderTimes();
        renderTotals();
    });
    document.querySelectorAll('.tray-open').forEach((b) => b.addEventListener('click', () => {
        renderTimes();
        renderTray();
        $('#o-note').textContent = '';
        if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    }));
    const close = () => { if (dlg.open) dlg.close(); };
    dlg.addEventListener('click', (e) => {
        if (e.target === dlg || e.target.closest('[data-close]')) close();
    });
    $('#lines').addEventListener('click', (e) => {
        const b = e.target.closest('[data-qty]');
        if (!b) return;
        const i = Number(b.dataset.i);
        const step = b.dataset.qty;
        const l = lines[i];
        l.qty += Number(step);
        if (l.qty <= 0) lines.splice(i, 1);
        saveLines();
        renderTray();
        // The buttons were redrawn, so put keyboard focus back on the same
        // control, the next row's when this one was removed, or the empty
        // state's link.
        if (lines.length) {
            const row = Math.min(i, lines.length - 1);
            $(`#lines [data-i="${row}"][data-qty="${lines[row] === l ? step : '-1'}"]`).focus();
        } else {
            $('#tray-empty a').focus();
        }
    });
    const zip = $('#o-zip');
    zip.addEventListener('input', () => { zip.value = zip.value.replace(/\D/g, ''); renderTotals(); });
    $('#order-form').addEventListener('input', (e) => e.target.classList && e.target.classList.remove('invalid'));
    $('#order-form').addEventListener('submit', (e) => { e.preventDefault(); sendOrder('text'); });
    $('#send-email').addEventListener('click', () => sendOrder('email'));
    renderTray();
}

// ---- Nav -----------------------------------------------------------------------------

function initNav() {
    const toggle = $('.nav-toggle');
    const links = $('#nav-links');
    const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        links.classList.toggle('open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    const head = $('.site-head');
    const onScroll = () => head.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

function markSamples() {
    if (!SAMPLE_CONTENT) return;
    document.querySelectorAll('[data-sample]').forEach((el) => { el.hidden = false; });
}

bindShop();
markSamples();
renderStatus();
renderTicker();
initNav();
initMenu();
initBuilder();
renderWeek();
renderStats();
renderReviews();
renderHours();
renderZones();
renderFaq();
initTray();
// Keep the open-now line and order times current on a page left open.
setInterval(renderStatus, 60 * 1000);
