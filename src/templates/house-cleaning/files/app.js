// Page content lives here as data so it is easy to find and change.
//
//   BUSINESS      who you are: name, phone, email, address, rating, timezone.
//                 Fills every element with data-bind="<key>", and links with
//                 data-bind-href="tel|sms|mailto".
//   HOURS         office hours, shown in the footer and the booking panel.
//   AVAILABILITY  which days the teams clean, how far ahead the first free
//                 day is, and dates you are closed.
//   CLEANS        the types of clean and their price per bedroom and bathroom.
//   FREQUENCIES   recurring discounts (standard cleans only).
//   ADDONS        extras, and which cleans already include them.
//   PRICING       the minimum visit, rounding and the first recurring visit.
//   TOWNS         the service area: ZIP codes and any travel fee.
//   SERVICES      the four service cards, each a preset of the price builder.
//   ROOMS         the room by room checklist, per type of clean.
//   REVIEWS       proof. Samples until SAMPLE_CONTENT is false.
//   ENQUIRY       where booking requests go: an email address, or a form
//                 endpoint that accepts a JSON POST.
//
// SAMPLE_CONTENT marks the business, rating and reviews as samples on the
// page. Set it to false once they are the business's own.

const SAMPLE_CONTENT = true;

const BUSINESS = {
    name: 'Linen & Lime',
    since: 2015,
    phone: '(555) 013-7720',
    email: 'hello@example.com',
    address: '27 Orchard Street, Maple Harbor',
    region: 'Maple Harbor',
    baseTown: 'Maple Harbor',
    insurance: 'Insured and bonded, and every cleaner is background-checked.',
    rating: 4.9,
    reviewCount: 286,
    ratingSource: 'Google',
    homes: 520,
    // Hours and the first free cleaning day are worked out in this timezone,
    // whatever timezone the visitor is in.
    timezone: 'America/New_York',
};

// [opening hour, closing hour] in 24h time, or null when closed.
const HOURS = {
    Mon: [8, 18], Tue: [8, 18], Wed: [8, 18], Thu: [8, 18], Fri: [8, 18],
    Sat: [9, 15], Sun: null,
};

const AVAILABILITY = {
    // Days the cleaning teams work.
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    // A new customer's first visit is at least this many days from today.
    leadDays: 2,
    // ISO dates with no cleaning, such as holidays.
    closedDates: ['2026-11-26', '2026-12-25', '2027-01-01'],
};

// Price = base + perBed × bedrooms + perBath × bathrooms (a half bath counts
// half). Minutes are the total work time, split across the team of two.
const CLEANS = [
    {
        id: 'standard', label: 'Standard', name: 'Standard clean',
        base: 90, perBed: 20, perBath: 25,
        minutes: { base: 100, bed: 30, bath: 35 },
        blurb: 'Kitchen, bathrooms, dusting and floors, top to bottom.',
    },
    {
        id: 'deep', label: 'Deep', name: 'Deep clean',
        base: 150, perBed: 30, perBath: 40,
        minutes: { base: 180, bed: 45, bath: 55 },
        blurb: 'Everything in a standard clean, plus baseboards, grout, fans and the build-up.',
    },
    {
        id: 'moveout', label: 'Move-out', name: 'Move-in or move-out clean',
        base: 175, perBed: 35, perBath: 45,
        minutes: { base: 210, bed: 55, bath: 60 },
        blurb: 'An empty home cleaned inside every cupboard, oven and fridge.',
    },
];

// Only standard cleans repeat. `off` is the discount on each visit.
const FREQUENCIES = [
    { id: 'once', label: 'One time', off: 0 },
    { id: 'monthly', label: 'Monthly', off: 0.10 },
    { id: 'biweekly', label: 'Every 2 weeks', off: 0.15, tag: 'Popular' },
    { id: 'weekly', label: 'Weekly', off: 0.20 },
];

// `includedIn` lists the cleans that already do this, at no extra charge.
const ADDONS = [
    { id: 'oven', label: 'Inside oven', price: 35, minutes: 40, includedIn: ['moveout'] },
    { id: 'fridge', label: 'Inside fridge', price: 30, minutes: 30, includedIn: ['moveout'] },
    { id: 'cabinets', label: 'Inside cabinets', price: 40, minutes: 45, includedIn: ['moveout'], note: 'emptied first' },
    { id: 'windows', label: 'Inside windows', price: 45, minutes: 50, note: 'glass, sills and tracks' },
    { id: 'laundry', label: 'Wash and fold', price: 25, minutes: 20, note: 'one load' },
];

const PRICING = {
    minimum: 110,
    // Prices round up to the nearest this many dollars.
    roundTo: 5,
    // A new recurring customer's first visit is priced and done as this clean,
    // to bring the home to a level the regular visits can keep up. Set to ''
    // to price the first visit like every other.
    firstRecurringVisit: 'deep',
    teamSize: 2,
};

// Towns with a travel fee add it to every visit.
const TOWNS = [
    { name: 'Maple Harbor', zips: ['02810', '02811'], fee: 0 },
    { name: 'Westbrook', zips: ['02812'], fee: 0 },
    { name: 'Saltmarsh', zips: ['02814'], fee: 0 },
    { name: 'Pell Point', zips: ['02815'], fee: 0 },
    { name: 'Aldergrove', zips: ['02817'], fee: 0 },
    { name: 'North Cove', zips: ['02818'], fee: 0 },
    { name: 'Ridgeway', zips: ['02820'], fee: 15 },
    { name: 'East Lyme Hills', zips: ['02822'], fee: 15 },
    { name: 'Tannery Falls', zips: ['02825'], fee: 20 },
    { name: 'Bayberry', zips: ['02827'], fee: 20 },
];

// Each card presets the price builder with a clean and how often.
const SERVICES = [
    {
        title: 'Recurring cleaning', clean: 'standard', freq: 'biweekly', badge: 'Most booked',
        photo: 'photos/living-room.jpg', alt: 'A bright white living room with a grey sofa and a tidy coffee table',
        body: 'Your home kept at its best, weekly, every two weeks or monthly. Same team, same day, skip a visit with a text.',
    },
    {
        title: 'One-time clean', clean: 'standard', freq: 'once',
        photo: 'photos/counter-wipe.jpg', alt: 'A gloved hand wiping a kitchen counter with a sponge',
        body: 'Before guests arrive, after they leave, or just because. The full standard checklist, once.',
    },
    {
        title: 'Deep clean', clean: 'deep', freq: 'once',
        photo: 'photos/floor-mop.jpg', alt: 'A flat mop cleaning a dark wooden floor',
        body: 'For spring, for the first visit, or for a home that has not been cleaned in a while. Baseboards, grout and build-up.',
    },
    {
        title: 'Move-in or move-out', clean: 'moveout', freq: 'once',
        photo: 'photos/empty-kitchen.jpg', alt: 'An empty modern kitchen with bright floors and a long window',
        body: 'An empty home cleaned inside every cupboard, oven and fridge, ready for the keys or the deposit check.',
    },
];

const PROMISES = [
    { icon: 'users', title: 'Same two cleaners', body: 'The team that learns your home keeps it.' },
    { icon: 'refresh', title: '24-hour re-clean', body: 'Missed a spot? We come back and fix it, free.' },
    { icon: 'caddy', title: 'Supplies brought in', body: 'Plant-based products and fresh cloths every visit.' },
    { icon: 'shield', title: 'Insured and vetted', body: 'Bonded, insured and background-checked.' },
];

// In each task, the letters say which cleans include it:
// s = standard, d = deep, m = move-out.
const ROOMS = [
    {
        id: 'kitchen', label: 'Kitchen',
        photo: 'photos/kitchen-sink.jpg', alt: 'A sunny kitchen sink with a wooden cabinet and oranges on the counter',
        tasks: [
            ['Counters, backsplash and sink scrubbed and dried', 'sdm'],
            ['Stovetop, hood and outside of appliances wiped', 'sdm'],
            ['Inside the microwave', 'sdm'],
            ['Floors vacuumed and mopped', 'sdm'],
            ['Cabinet fronts and handles hand-wiped', 'dm'],
            ['Baseboards and door frames', 'dm'],
            ['Inside oven and fridge', 'm'],
            ['Inside every cabinet and drawer', 'm'],
        ],
    },
    {
        id: 'bathrooms', label: 'Bathrooms',
        photo: 'photos/bathroom.jpg', alt: 'A bathroom with a freestanding white tub, a pink bath mat and a glass shower',
        tasks: [
            ['Toilet cleaned inside, outside and behind', 'sdm'],
            ['Shower, tub and tiles scrubbed', 'sdm'],
            ['Mirrors, taps and fixtures polished', 'sdm'],
            ['Floors mopped by hand', 'sdm'],
            ['Soap scum and limescale removed', 'dm'],
            ['Grout lines scrubbed', 'dm'],
            ['Exhaust fan cover dusted', 'dm'],
            ['Inside vanity and medicine cabinet', 'm'],
        ],
    },
    {
        id: 'bedrooms', label: 'Bedrooms',
        photo: 'photos/bedroom.jpg', alt: 'A made bed with grey pillows in a bedroom with sheer curtains',
        tasks: [
            ['Beds made, fresh linens put on if left out', 'sd'],
            ['Surfaces, shelves and decor dusted', 'sdm'],
            ['Mirrors and glass cleaned', 'sdm'],
            ['Floors vacuumed, under the bed where it reaches', 'sdm'],
            ['Switches and door handles wiped', 'sdm'],
            ['Ceiling fans and light fixtures dusted', 'dm'],
            ['Window sills and tracks', 'dm'],
            ['Inside closets and wardrobes', 'm'],
        ],
    },
    {
        id: 'living', label: 'Living areas',
        photo: 'photos/living-room.jpg', alt: 'A bright living room with a grey sofa, a rug and a plant',
        tasks: [
            ['Surfaces, shelves and decor dusted', 'sdm'],
            ['Sofa cushions vacuumed and straightened', 'sd'],
            ['Rugs vacuumed, hard floors mopped', 'sdm'],
            ['Bins emptied and relined', 'sdm'],
            ['Baseboards hand-wiped', 'dm'],
            ['Blinds and window sills dusted', 'dm'],
            ['Doors and frames spot-cleaned', 'dm'],
            ['Vents and light fixtures dusted', 'dm'],
        ],
    },
];

const STEPS = [
    { title: 'See your price', body: 'Tell us your bedrooms, bathrooms and extras above. The price you see is the price you pay.' },
    { title: 'Pick a day', body: 'Send a request with the day and arrival window that suit you. We confirm by text within a working hour.' },
    { title: 'We clean', body: 'Your two cleaners arrive in the window with everything they need. Be home or leave us a key or code.' },
    { title: 'Check the list', body: 'You get the ticked checklist by text. Anything missed, reply within 24 hours and we come back to fix it.' },
];

const REVIEWS = [
    { name: 'Hannah W.', town: 'Westbrook', service: 'Every 2 weeks since 2023', text: 'Rosa and Dee have been coming every other Thursday for two years. I never have to explain anything twice, and the checklist text means I know what got done.' },
    { name: 'Marcus O.', town: 'Maple Harbor', service: 'Move-out clean', text: 'Booked on a Monday, cleaned on the Wednesday, got our full deposit back. They even cleaned the oven racks the last tenants left behind.' },
    { name: 'Priya S.', town: 'North Cove', service: 'Deep clean', text: 'The price on the website was exactly the price on the invoice. The grout in our shower is a colour I forgot it was.' },
];

const ACCESS = ["I'll be home", 'Key or lockbox', 'Door code', 'Concierge or neighbour'];

const FAQ = [
    { q: 'Do I need to be home?', a: 'No. Most of our customers are at work. Leave a key, a lockbox or a door code, and tell us about pets and alarms in the booking form.' },
    { q: 'What if something is missed?', a: 'Reply to the checklist text within 24 hours and we come back to fix it for free, usually the next working day.' },
    { q: 'Do you bring your own supplies?', a: 'Yes. Vacuums, mops, cloths and plant-based products are included. If you prefer a product of your own, leave it out and tell us.' },
    { q: 'Why is the first recurring visit a deep clean?', a: 'It brings the home to a level the regular visits can keep up. From the second visit on, you pay the recurring price.' },
    { q: 'Can I skip or reschedule a visit?', a: 'Yes. Text us 48 hours before and there is no charge. Recurring plans have no contract and you can stop any time.' },
    { q: 'How do I pay?', a: 'We text a payment link after each visit. Card or bank transfer, and nothing is taken before the clean.' },
];

// Where booking requests go. With endpoint set (a form service or your own
// backend that accepts a JSON POST), the form sends there and shows a
// confirmation. Without it, the form opens an email to `email`, or
// BUSINESS.email.
const ENQUIRY = {
    email: '',
    endpoint: '',
};

const ICONS = {
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.4 3-5 6-5s5.4 1.6 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c2.6 0 4.4 1.3 5 4"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M20 20v-4h-4"/>',
    caddy: '<path d="M4 11h16l-1.5 9h-13z"/><path d="M8 11V6h3v5M14 11V4h2.5l1 2H16"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    team: '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M3 19c.5-3 2.5-4.5 5-4.5s4.5 1.5 5 4.5M11 19c.5-3 2.5-4.5 5-4.5s4.5 1.5 5 4.5"/>',
};

// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const money = (n) => `$${n.toLocaleString('en-US')}`;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };

const cleanById = (id) => CLEANS.find((c) => c.id === id) || CLEANS[0];
const freqById = (id) => FREQUENCIES.find((f) => f.id === id) || FREQUENCIES[0];
const townForZip = (zip) => TOWNS.find((t) => t.zips.includes(zip));
const isIncluded = (addon, cleanId) => (addon.includedIn || []).includes(cleanId);

// ---- Business time ------------------------------------------------------------

// Today where the business is, as a local Date. Falls back to the visitor's
// clock.
function bizToday() {
    try {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
            timeZone: BUSINESS.timezone, year: 'numeric', month: 'numeric', day: 'numeric',
        }).formatToParts(new Date()).map((p) => [p.type, p.value]));
        return new Date(+parts.year, +parts.month - 1, +parts.day, 12);
    } catch {
        const d = new Date();
        d.setHours(12, 0, 0, 0);
        return d;
    }
}

const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDay = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// The next `count` days a team can clean, from leadDays out.
function cleaningDays(count) {
    const out = [];
    const d = bizToday();
    d.setDate(d.getDate() + AVAILABILITY.leadDays);
    for (let i = 0; i < 60 && out.length < count; i++) {
        if (AVAILABILITY.days.includes(DAYS[d.getDay()]) && !AVAILABILITY.closedDates.includes(isoDate(d))) out.push(new Date(d));
        d.setDate(d.getDate() + 1);
    }
    return out;
}

function fmtHour(h) {
    const hr = Math.floor(h);
    const min = Math.round((h - hr) * 60);
    return `${hr % 12 || 12}${min ? `:${String(min).padStart(2, '0')}` : ''}${hr >= 12 && hr < 24 ? 'pm' : 'am'}`;
}

// Office hours grouped into runs of days with the same hours:
// [{ days: 'Mon to Fri', hours: '8am to 6pm' }, ...]
function hourRuns() {
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const runs = [];
    for (const day of order) {
        const h = HOURS[day];
        const text = h ? `${fmtHour(h[0])} to ${fmtHour(h[1])}` : 'Closed';
        const last = runs[runs.length - 1];
        if (last && last.hours === text) last.to = day;
        else runs.push({ from: day, to: day, hours: text });
    }
    return runs.map((r) => ({ days: r.from === r.to ? r.from : `${r.from} to ${r.to}`, hours: r.hours }));
}

// ---- Pricing --------------------------------------------------------------------

const roundUp = (n) => Math.ceil(n / PRICING.roundTo) * PRICING.roundTo;

function basePrice(clean, beds, baths) {
    return clean.base + clean.perBed * beds + clean.perBath * baths;
}

// The price and time for one home and set of choices.
function quote({ clean: cleanId, beds, baths, freq: freqId, addons = [], zip = '' }) {
    const clean = cleanById(cleanId);
    const freq = clean.id === 'standard' ? freqById(freqId) : FREQUENCIES[0];
    const town = townForZip(zip);
    const fee = town ? town.fee : 0;
    // Extras are billed per clean: one the first-visit clean includes is free
    // on that visit even when the regular clean charges for it.
    const billable = (c) => ADDONS.filter((a) => addons.includes(a.id) && !isIncluded(a, c.id));
    const sum = (list, key) => list.reduce((s, a) => s + a[key], 0);
    // The minimum covers the cleaning; the travel fee is always added on top.
    const visit = (c, off) => Math.max(PRICING.minimum, roundUp(basePrice(c, beds, baths) * (1 - off) + sum(billable(c), 'price'))) + fee;
    const workMinutes = (c) => c.minutes.base + c.minutes.bed * beds + c.minutes.bath * baths + sum(billable(c), 'minutes');
    const onSite = (c) => Math.max(1, Math.round((workMinutes(c) / PRICING.teamSize / 60) * 2) / 2);

    const extras = billable(clean);
    const price = visit(clean, freq.off);
    const hours = onSite(clean);

    let first = null;
    const firstClean = PRICING.firstRecurringVisit && freq.id !== 'once' && CLEANS.find((c) => c.id === PRICING.firstRecurringVisit);
    if (firstClean) first = { clean: firstClean, price: visit(firstClean, 0), hours: onSite(firstClean) };
    return { clean, freq, town, fee, extras, price, hours, first };
}

const fmtHours = (h) => {
    const whole = Math.floor(h);
    return `${whole}${h % 1 ? '½' : ''} hour${h === 1 ? '' : 's'}`;
};
const fmtBaths = (n) => `${Math.floor(n)}${n % 1 ? '½' : ''}`;
const homeText = (beds, baths) => `${beds ? `${beds} bedroom${beds === 1 ? '' : 's'}` : 'Studio'}, ${fmtBaths(baths)} bathroom${baths === 1 ? '' : 's'}`;

// ---- Business details ------------------------------------------------------------

// The number for tel: and sms: links, from the displayed one. Ten digits
// without a country code are read as a US number.
function phoneLink(phone) {
    const digits = String(phone).replace(/\D/g, '');
    if (String(phone).trim().startsWith('+')) return `+${digits}`;
    return digits.length === 10 ? `+1${digits}` : digits;
}

function bindBusiness() {
    const values = {
        ...BUSINESS,
        rating: BUSINESS.rating.toFixed(1),
        reviewCount: BUSINESS.reviewCount.toLocaleString('en-US'),
        homes: BUSINESS.homes.toLocaleString('en-US'),
        years: new Date().getFullYear() - BUSINESS.since,
    };
    document.querySelectorAll('[data-bind]').forEach((el) => {
        const v = values[el.dataset.bind];
        if (v !== undefined) el.textContent = v;
    });
    const dial = phoneLink(BUSINESS.phone);
    const hrefs = { tel: `tel:${dial}`, sms: `sms:${dial}`, mailto: `mailto:${ENQUIRY.email || BUSINESS.email}` };
    document.querySelectorAll('[data-bind-href]').forEach((el) => { el.href = hrefs[el.dataset.bindHref]; });
    $('#year').textContent = new Date().getFullYear();

    const runs = hourRuns();
    $('#foot-hours').innerHTML = runs.map((r) => `<li><span>${esc(r.days)}</span><span>${esc(r.hours)}</span></li>`).join('');
    $('#hours-line').textContent = runs.filter((r) => r.hours !== 'Closed').map((r) => `${r.days} ${r.hours}`).join(', ');
    $('#foot-services').innerHTML = SERVICES.map((s) => `<li><a href="#price" data-clean="${esc(s.clean)}" data-freq="${esc(s.freq)}">${esc(s.title)}</a></li>`).join('');

    const first = cleaningDays(1)[0];
    if (first) $('#next-open').textContent = fmtDay(first);
}

// ---- Static sections ------------------------------------------------------------

function renderPromises() {
    $('#promise').innerHTML = PROMISES.map((p) => `
        <li>${icon(p.icon)}<span><b>${esc(p.title)}</b>${esc(p.body)}</span></li>`).join('');
}

function renderServices() {
    $('#services-grid').innerHTML = SERVICES.map((s) => {
        const q = quote({ clean: s.clean, beds: 2, baths: 1, freq: s.freq });
        const per = q.freq.id !== 'once' ? `per visit, ${q.freq.label.toLowerCase()}` : 'one visit';
        return `
        <article class="svc">
            <div class="svc-photo"><img src="${esc(s.photo)}" alt="${esc(s.alt)}" width="1024" height="683" loading="lazy">${s.badge ? `<span class="svc-badge">${esc(s.badge)}</span>` : ''}</div>
            <div class="svc-body">
                <h3>${esc(s.title)}</h3>
                <p>${esc(s.body)}</p>
                <div class="svc-foot">
                    <span class="svc-price"><small>from</small> ${money(q.price)} <small>${esc(per)}</small></span>
                    <a class="svc-go" href="#price" data-clean="${esc(s.clean)}" data-freq="${esc(s.freq)}" aria-label="Price ${esc(s.title.toLowerCase())} for my home">Price it ${icon('arrow')}</a>
                </div>
            </div>
        </article>`;
    }).join('');
}

let activeRoom = ROOMS[0].id;

function renderRooms() {
    $('#room-tabs').innerHTML = ROOMS.map((r) => `
        <button type="button" role="tab" id="tab-${esc(r.id)}" aria-controls="room-panel" data-room="${esc(r.id)}"
            aria-selected="${r.id === activeRoom}" tabindex="${r.id === activeRoom ? 0 : -1}">${esc(r.label)}</button>`).join('');
    renderRoomPanel();
}

function renderRoomPanel() {
    const room = ROOMS.find((r) => r.id === activeRoom);
    const panel = $('#room-panel');
    panel.setAttribute('aria-labelledby', `tab-${room.id}`);
    const cols = CLEANS.map((c) => ({ id: c.id, label: c.label, key: c.id[0] }));
    const mark = (on) => (on ? `<span class="tick">${icon('check')}<span class="sr-only">Included</span></span>` : '<span class="dash" aria-hidden="true">–</span><span class="sr-only">Not included</span>');
    panel.innerHTML = `
        <figure class="room-photo"><img src="${esc(room.photo)}" alt="${esc(room.alt)}" width="1024" height="700" loading="lazy"></figure>
        <table class="checklist">
            <caption class="sr-only">${esc(room.label)}: what each clean includes</caption>
            <thead><tr><th scope="col">${esc(room.label)}</th>${cols.map((c) => `<th scope="col" data-col="${esc(c.id)}">${esc(c.label)}</th>`).join('')}</tr></thead>
            <tbody>${room.tasks.map(([task, keys]) => `
                <tr><th scope="row">${esc(task)}</th>${cols.map((c) => `<td data-col="${esc(c.id)}">${mark(keys.includes(c.key))}</td>`).join('')}</tr>`).join('')}
            </tbody>
        </table>`;
    highlightColumn();
}

// The checklist column of the clean picked in the price builder stands out.
function highlightColumn() {
    document.querySelectorAll('.checklist [data-col]').forEach((el) => el.classList.toggle('on', el.dataset.col === state.clean));
}

function initRoomTabs() {
    const tabs = $('#room-tabs');
    tabs.addEventListener('click', (e) => {
        const b = e.target.closest('[data-room]');
        if (!b) return;
        activeRoom = b.dataset.room;
        renderRooms();
        $(`#tab-${activeRoom}`).focus();
    });
    tabs.addEventListener('keydown', (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        const i = ROOMS.findIndex((r) => r.id === activeRoom);
        const n = ROOMS.length;
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + n) % n;
        activeRoom = ROOMS[next].id;
        renderRooms();
        $(`#tab-${activeRoom}`).focus();
    });
    renderRooms();
}

function renderExtras() {
    $('#extras').innerHTML = ADDONS.map((a) => {
        const inc = CLEANS.filter((c) => isIncluded(a, c.id)).map((c) => c.label.toLowerCase());
        return `<li><b>${esc(a.label)}</b><span>${money(a.price)}${a.note ? `, ${esc(a.note)}` : ''}${inc.length ? `. Included in ${esc(inc.join(' and '))}` : ''}</span></li>`;
    }).join('');
}

function renderSteps() {
    $('#steps').innerHTML = STEPS.map((s, i) => `
        <li><span class="step-n" aria-hidden="true">${i + 1}</span><div><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></div></li>`).join('');
}

function renderReviews() {
    $('#review-list').innerHTML = REVIEWS.map((r) => `
        <figure class="review">
            <span class="stars" aria-hidden="true">★★★★★</span>
            <blockquote>${esc(r.text)}</blockquote>
            <figcaption><b>${esc(r.name)}</b><span>${esc(r.town)} · ${esc(r.service)}</span></figcaption>
        </figure>`).join('');
}

function renderFaq() {
    $('#faq-list').innerHTML = FAQ.map((f, i) => `
        <details${i === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
}

function zipMessage(zip) {
    if (!zip) return { text: '', cls: '' };
    if (zip.length < 5) return { text: '', cls: '' };
    const town = townForZip(zip);
    if (!town) return { text: `We do not clean in ${zip} yet. Call us and we will tell you who does.`, cls: 'miss' };
    return { text: town.fee ? `${town.name}: we clean there, with a ${money(town.fee)} travel fee per visit.` : `${town.name}: we clean there, no travel fee.`, cls: 'ok' };
}

function renderArea() {
    $('#towns').innerHTML = TOWNS.map((t) => `
        <li${t.name === BUSINESS.baseTown ? ' class="base"' : ''}>${icon('pin')}<span>${esc(t.name)}</span><small>${t.fee ? `+${money(t.fee)}` : 'no fee'}</small></li>`).join('');
    const input = $('#zc-zip');
    const out = $('#zip-out');
    const run = () => {
        const zip = input.value.trim();
        const m = zip.length === 5 ? zipMessage(zip) : { text: zip ? 'Enter a 5 digit ZIP code.' : '', cls: zip ? 'miss' : '' };
        out.textContent = m.text;
        out.className = `zip-out ${m.cls}`;
        if (zip.length === 5) setZip(zip);
    };
    input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '');
        if (input.value.length === 5) run();
        else { out.textContent = ''; out.className = 'zip-out'; setZip(''); }
    });
    $('#zip-check').addEventListener('submit', (e) => { e.preventDefault(); run(); });
}

// ---- Price builder --------------------------------------------------------------

const state = {
    clean: 'standard',
    beds: 2,
    baths: 1,
    freq: 'biweekly',
    addons: [],
    zip: '',
};
const LIMITS = { beds: [0, 6, 1], baths: [1, 5, 0.5] };

function renderQuoteControls() {
    $('#q-type').innerHTML = CLEANS.map((c) => `
        <label><input type="radio" name="clean" value="${esc(c.id)}"${c.id === state.clean ? ' checked' : ''}><span>${esc(c.label)}</span></label>`).join('');
    $('#q-freq').innerHTML = FREQUENCIES.map((f) => `
        <label><input type="radio" name="freq" value="${esc(f.id)}"${f.id === state.freq ? ' checked' : ''}><span>${esc(f.label)}${f.off ? `<small>${Math.round(f.off * 100)}% off</small>` : ''}</span>${f.tag ? `<i>${esc(f.tag)}</i>` : ''}</label>`).join('');
    renderAddonControls();
}

function renderAddonControls() {
    $('#q-addons').innerHTML = ADDONS.map((a) => {
        const inc = isIncluded(a, state.clean);
        const on = inc || state.addons.includes(a.id);
        return `<label class="${inc ? 'inc' : ''}"><input type="checkbox" value="${esc(a.id)}"${on ? ' checked' : ''}${inc ? ' disabled' : ''}><span>${esc(a.label)}<small>${inc ? 'included' : `+${money(a.price)}`}</small></span></label>`;
    }).join('');
}

function refreshQuote() {
    const q = quote(state);
    $('#q-beds').textContent = state.beds ? state.beds : 'Studio';
    $('#q-baths').textContent = fmtBaths(state.baths);
    document.querySelectorAll('[data-step]').forEach((b) => {
        const [min, max] = LIMITS[b.dataset.step];
        const v = state[b.dataset.step];
        b.disabled = b.dataset.dir === '1' ? v >= max : v <= min;
    });
    const recurring = q.clean.id === 'standard';
    $('#q-freq-wrap').hidden = !recurring;
    $('#q-price').textContent = money(q.price);
    $('#q-per').textContent = q.freq.id !== 'once' ? `per visit, ${q.freq.label.toLowerCase()}` : 'for the visit';

    const meta = [
        `${icon('clock')}<span>About ${fmtHours(q.hours)} on site, team of ${PRICING.teamSize}</span>`,
    ];
    if (q.first) meta.push(`${icon('check')}<span>First visit is a ${esc(q.first.clean.name.toLowerCase())}, ${money(q.first.price)}</span>`);
    const day = cleaningDays(1)[0];
    if (day) meta.push(`${icon('calendar')}<span>First free day ${esc(fmtDay(day))}</span>`);
    $('#q-meta').innerHTML = meta.map((m) => `<li>${m}</li>`).join('');

    const zipOut = $('#q-zip-out');
    const m = zipMessage(state.zip);
    zipOut.textContent = m.cls === 'ok' ? (q.fee ? `${q.town.name}, +${money(q.fee)} travel` : `${q.town.name}, no travel fee`) : m.text;
    zipOut.className = `q-zip-out ${m.cls}`;

    highlightColumn();
    renderSummary(q);
}

function setClean(id) {
    state.clean = cleanById(id).id;
    const radio = document.querySelector(`#q-type input[value="${state.clean}"]`);
    if (radio) radio.checked = true;
    renderAddonControls();
    refreshQuote();
}

function setFreq(id) {
    state.freq = freqById(id).id;
    const radio = document.querySelector(`#q-freq input[value="${state.freq}"]`);
    if (radio) radio.checked = true;
    refreshQuote();
}

// One ZIP drives the quote; both ZIP fields show it.
function setZip(zip) {
    state.zip = zip;
    if ($('#q-zip').value !== zip) $('#q-zip').value = zip;
    const area = $('#zc-zip');
    if (area.value !== zip && document.activeElement !== area) {
        area.value = zip;
        $('#zip-out').textContent = '';
    }
    refreshQuote();
}

function initQuote() {
    renderQuoteControls();
    const form = $('#price');
    form.addEventListener('submit', (e) => e.preventDefault());
    $('#q-type').addEventListener('change', (e) => setClean(e.target.value));
    $('#q-freq').addEventListener('change', (e) => setFreq(e.target.value));
    $('#q-addons').addEventListener('change', (e) => {
        const id = e.target.value;
        state.addons = e.target.checked ? [...new Set([...state.addons, id])] : state.addons.filter((a) => a !== id);
        refreshQuote();
    });
    form.addEventListener('click', (e) => {
        const b = e.target.closest('[data-step]');
        if (!b) return;
        const key = b.dataset.step;
        const [min, max, step] = LIMITS[key];
        state[key] = Math.min(max, Math.max(min, state[key] + step * Number(b.dataset.dir)));
        refreshQuote();
    });
    const zip = $('#q-zip');
    zip.addEventListener('input', () => {
        zip.value = zip.value.replace(/\D/g, '');
        setZip(zip.value.length === 5 ? zip.value : '');
    });

    // Any link that names a clean or frequency presets the builder.
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[data-clean]');
        if (!a) return;
        setClean(a.dataset.clean);
        if (a.dataset.freq) setFreq(a.dataset.freq);
    });
    refreshQuote();
}

// ---- Booking request ------------------------------------------------------------

function renderSummary(q) {
    const rows = [
        ['Clean', q.clean.name],
        ['Home', homeText(state.beds, state.baths)],
    ];
    if (q.clean.id === 'standard') rows.push(['How often', q.freq.label]);
    const included = ADDONS.filter((a) => isIncluded(a, q.clean.id)).map((a) => a.label.toLowerCase());
    const extras = q.extras.map((a) => a.label.toLowerCase());
    rows.push(['Extras', extras.length ? extras.join(', ') : 'None']);
    if (included.length) rows.push(['Included', included.join(', ')]);
    if (q.town) rows.push(['Town', `${q.town.name}${q.fee ? `, +${money(q.fee)} travel` : ''}`]);
    rows.push(['Time on site', `About ${fmtHours(q.hours)}`]);
    $('#sum-list').innerHTML = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('') + `
        <div class="sum-price"><dt>${q.freq.id !== 'once' ? 'Per visit' : 'Price'}</dt><dd>${money(q.price)}</dd></div>
        ${q.first ? `<p class="sum-first">The first visit is a ${esc(q.first.clean.name.toLowerCase())} at ${money(q.first.price)}, about ${esc(fmtHours(q.first.hours))}. Then ${money(q.price)} ${esc(q.freq.label.toLowerCase())}.</p>` : ''}`;
}

function fillDays() {
    const sel = $('#f-day');
    const prev = sel.value;
    sel.innerHTML = cleaningDays(12).map((d) => `<option value="${isoDate(d)}">${esc(d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }))}</option>`).join('');
    if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
}

function initBooking() {
    fillDays();
    $('#f-access').innerHTML = ACCESS.map((a, i) => `<label><input type="radio" name="access" value="${esc(a)}"${i === 0 ? ' checked' : ''}><span>${esc(a)}</span></label>`).join('');
    const note = $('#f-note');
    const destination = () => {
        note.className = 'f-note';
        note.textContent = ENQUIRY.endpoint
            ? 'Sent straight to our office. We confirm by text within a working hour.'
            : `Opens your email app with the request to ${ENQUIRY.email || BUSINESS.email}.`;
    };
    destination();

    $('#book-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const val = (n) => form.elements[n].value.trim();
        let bad = null;
        for (const n of ['name', 'phone', 'address']) {
            const el = form.elements[n];
            const empty = !el.value.trim();
            el.classList.toggle('invalid', empty);
            if (empty && !bad) bad = el;
        }
        // Email is optional, but one that is given must be valid.
        const email = form.elements.email;
        const badEmail = !email.checkValidity();
        email.classList.toggle('invalid', badEmail);
        if (!bad && badEmail) {
            note.textContent = 'Check the email address, or leave it blank.';
            note.className = 'f-note miss';
            email.focus();
            return;
        }
        if (bad) {
            note.textContent = 'Add your name, a mobile number and the address so we can confirm the day.';
            note.className = 'f-note miss';
            bad.focus();
            return;
        }
        const q = quote(state);
        const day = form.elements.day;
        const data = {
            name: val('name'),
            phone: val('phone'),
            email: val('email'),
            address: val('address'),
            zip: state.zip,
            town: q.town ? q.town.name : '',
            clean: q.clean.name,
            home: homeText(state.beds, state.baths),
            frequency: q.freq.label,
            extras: q.extras.map((a) => a.label).join(', ') || 'None',
            price: money(q.price),
            firstVisit: q.first ? `${q.first.clean.name}, ${money(q.first.price)}` : '',
            day: day.options[day.selectedIndex] ? day.options[day.selectedIndex].text : '',
            time: val('time'),
            access: form.elements.access.value,
            message: val('message'),
        };
        const subject = `Cleaning request: ${data.clean}, ${data.home}`;

        if (ENQUIRY.endpoint) {
            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            note.className = 'f-note';
            note.textContent = 'Sending...';
            try {
                const res = await fetch(ENQUIRY.endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ subject, ...data }),
                });
                if (!res.ok) throw new Error(String(res.status));
                form.reset();
                fillDays();
                note.className = 'f-note ok';
                note.textContent = `Thanks, ${data.name.split(' ')[0]}. We will text you to confirm the day.`;
            } catch {
                note.className = 'f-note miss';
                note.textContent = `That did not send. Please call ${BUSINESS.phone} instead.`;
            } finally {
                btn.disabled = false;
            }
            return;
        }

        const lines = [
            `Name: ${data.name}`,
            `Mobile: ${data.phone}`,
            ...(data.email ? [`Email: ${data.email}`] : []),
            `Address: ${data.address}${data.zip ? `, ${data.zip}` : ''}${data.town ? ` (${data.town})` : ''}`,
            '',
            `Clean: ${data.clean}`,
            `Home: ${data.home}`,
            `How often: ${data.frequency}`,
            `Extras: ${data.extras}`,
            `Price shown: ${data.price}${q.freq.id !== 'once' ? ' per visit' : ''}`,
            ...(data.firstVisit ? [`First visit: ${data.firstVisit}`] : []),
            '',
            `Preferred day: ${data.day}`,
            `Arrival: ${data.time}`,
            `Access: ${data.access}`,
            '',
            data.message,
        ];
        window.location.href = `mailto:${ENQUIRY.email || BUSINESS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
        note.className = 'f-note ok';
        note.textContent = `Your email app should open with the request filled in. If it does not, call ${BUSINESS.phone}.`;
    });
}

// ---- Header ------------------------------------------------------------------------------

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
    const header = $('.header');
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

function markSamples() {
    if (!SAMPLE_CONTENT) return;
    document.querySelectorAll('[data-sample]').forEach((el) => { el.hidden = false; });
}

bindBusiness();
markSamples();
initNav();
renderPromises();
renderServices();
initRoomTabs();
renderExtras();
renderSteps();
renderReviews();
renderArea();
renderFaq();
initQuote();
initBooking();
// Keep the first free day current on a page left open overnight.
setInterval(() => { bindBusiness(); fillDays(); refreshQuote(); }, 60 * 60 * 1000);
