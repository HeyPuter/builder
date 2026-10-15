// Page content lives here as data so it is easy to find and change.
//
// SHOP fills every name, phone, email, address and handle on the page (any
// element with data-bind="<key>", and links with data-bind-href="tel|mailto|
// map|instagram"). HOURS drives the open-now line, the hours table, the walk-in
// wait and the days the booking form offers, in SHOP.timeZone.
//
// SERVICES is the menu. Visitors add services to "Your visit", which adds up
// the time and price and carries over to the booking form. Each BARBERS entry
// lists the days they cut, and the form only offers a barber's own days. The
// LOOKBOOK names the SERVICES ids and the BARBERS id behind each look.
//
// Every "Book a chair" button (data-book) opens SHOP.bookingUrl when it is set
// (a Booksy, Squire, Fresha, Square or other booking page), and otherwise jumps
// to the request form. The form opens an email to the chosen barber, or to
// SHOP.email when they have no email of their own or no barber is chosen.
//
// SAMPLE_CONTENT marks the shop, barbers, prices, reviews and photos as samples
// on the page. Set it to false once they are the shop's own.

const SAMPLE_CONTENT = true;

const SHOP = {
    name: 'Halfmoon Barber Co.',
    shortName: 'Halfmoon',
    kind: 'Barber Co.',
    since: 2014,
    city: 'Fairhaven',
    phone: '(555) 018-2240',
    email: 'chairs@example.com',
    instagram: '@halfmoonbarber',
    address: '88 Mercer Street, Fairhaven',
    parking: 'Free on Mercer Street after 6pm, and in the Dock Lane lot',
    payment: 'Cards, cash and tap to pay. Tip in cash or on the card reader.',
    timeZone: 'America/New_York',
    rating: 4.9,
    reviewCount: 612,
    // A booking page. Leave empty to use the request form below.
    bookingUrl: '',
};

// Opening hours per day, 24-hour clock. null is closed.
const HOURS = {
    Mon: null,
    Tue: ['10:00', '19:00'],
    Wed: ['10:00', '19:00'],
    Thu: ['10:00', '20:00'],
    Fri: ['09:00', '20:00'],
    Sat: ['08:00', '16:00'],
    Sun: ['10:00', '14:00'],
};

// The usual walk-in wait, shown in the hero while the shop is open. The first
// rule whose `days` (any day when left out) and hours match wins.
const WALK_INS = {
    policy: 'Welcome until an hour before close. Booked clients go first.',
    lastWalkInMinutes: 60,
    waits: [
        { days: ['Sat'], wait: '40 min or more', note: 'Saturdays fill up. Book ahead if you can.' },
        { from: '17:00', wait: '30 to 45 min', note: 'After-work rush. Booking skips the line.' },
        { from: '12:00', to: '14:00', wait: '20 to 30 min', note: 'Lunch hour is busy.' },
        { wait: '10 to 20 min', note: 'A quiet time to walk in.' },
    ],
};

const CATEGORIES = [
    { id: 'cuts', label: 'Haircuts' },
    { id: 'beard', label: 'Beard & shave' },
    { id: 'combos', label: 'Combos' },
    { id: 'extras', label: 'Add-ons' },
];

// `price` in dollars, `minutes` in the chair. `tag` is a short label.
const SERVICES = [
    { id: 'signature', cat: 'cuts', name: 'Signature cut', price: 38, minutes: 45, tag: 'Most booked', desc: 'Clipper or scissor cut, wash, hot towel and style. Our standard.' },
    { id: 'skin-fade', cat: 'cuts', name: 'Skin fade', price: 42, minutes: 45, desc: 'Faded down to skin, blended by hand, with a razor line-up.' },
    { id: 'scissor', cat: 'cuts', name: 'Long hair scissor cut', price: 48, minutes: 60, desc: 'All scissors, for hair past the ears. Includes a wash and blow-dry.' },
    { id: 'buzz', cat: 'cuts', name: 'Buzz cut', price: 24, minutes: 20, desc: 'One guard all over, cleaned up at the neck and ears.' },
    { id: 'kids', cat: 'cuts', name: 'Kids cut', price: 26, minutes: 30, desc: 'Ages 12 and under. Booster seat and a lollipop included.' },
    { id: 'beard-trim', cat: 'beard', name: 'Beard trim & line-up', price: 22, minutes: 20, desc: 'Shaped with clippers and scissors, edges lined with a razor.' },
    { id: 'beard-sculpt', cat: 'beard', name: 'Beard sculpt', price: 30, minutes: 30, desc: 'A full reshape with hot towels, beard oil and a straight-razor finish.' },
    { id: 'shave', cat: 'beard', name: 'Hot towel shave', price: 40, minutes: 40, desc: 'Two hot towels, warm lather and a straight razor, finished with a cold towel.' },
    { id: 'head-shave', cat: 'beard', name: 'Head shave', price: 34, minutes: 30, desc: 'A straight-razor head shave with hot towels and a cooling balm.' },
    { id: 'cut-beard', cat: 'combos', name: 'Cut & beard', price: 55, minutes: 60, tag: 'Saves $5', desc: 'A signature cut and a beard trim and line-up, in one sitting.' },
    { id: 'full-moon', cat: 'combos', name: 'The Full Moon', price: 72, minutes: 80, tag: 'Saves $6', desc: 'A signature cut and a hot towel shave. Bring an hour and a half.' },
    { id: 'father-son', cat: 'combos', name: 'Parent & kid', price: 58, minutes: 60, desc: 'A signature cut and a kids cut, side by side in two chairs.' },
    { id: 'lineup', cat: 'extras', name: 'Line-up only', price: 15, minutes: 15, desc: 'Edges and neckline between cuts.' },
    { id: 'design', cat: 'extras', name: 'Hair design or part', price: 10, minutes: 10, desc: 'A shaved part or a simple design. Bring a photo for anything detailed.' },
    { id: 'grey', cat: 'extras', name: 'Grey blending', price: 25, minutes: 20, desc: 'A semi-permanent tint that softens grey, not hides it.' },
    { id: 'scalp', cat: 'extras', name: 'Scalp massage & mask', price: 15, minutes: 15, desc: 'A charcoal mask and a ten-minute scalp massage.' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const BARBERS = [
    {
        id: 'nico', name: 'Nico Albano', title: 'Owner · Chair 1',
        photo: 'photos/barber-1.jpg', alt: 'Nico, bearded, holding scissors and a comb above a client\'s hair',
        specialties: ['Scissor cuts', 'Long hair', 'Classic shaves'],
        bio: 'Opened Halfmoon in 2014 after ten years in other people\'s shops. Slow, careful scissor work is his thing.',
        days: ['Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
        email: '',
    },
    {
        id: 'ray', name: 'Ray Darzi', title: 'Senior barber · Chair 2',
        photo: 'photos/barber-2.jpg', alt: 'Ray, with curly hair and a beard, cutting a seated client\'s grey hair',
        specialties: ['Skin fades', 'Beard sculpting', 'Grey blending'],
        bio: 'The fade guy. Ray blends by hand under a bright lamp and will tell you honestly what your hair will and will not do.',
        days: ['Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        email: '',
    },
    {
        id: 'theo', name: 'Theo Marsh', title: 'Barber · Chair 3',
        photo: 'photos/barber-3.jpg', alt: 'Theo, with long hair tied up, trimming a client under angled strip lights',
        specialties: ['Designs', 'Textured crops', 'Kids cuts'],
        bio: 'Steady hands and endless patience. Theo does the designs, the tricky crowns and most of the first haircuts.',
        days: ['Tue', 'Thu', 'Fri', 'Sat', 'Sun'],
        email: '',
    },
];

// Each look: the words to use in the chair, the upkeep, the SERVICES ids to
// book for it and the BARBERS id of the barber who cuts it best.
const LOOKBOOK = [
    { id: 'mid-fade', name: 'Mid fade', photo: 'photos/cut-mid-fade.jpg', alt: 'Side view of a mid skin fade with a sharp line-up',
      sides: 'Skin at the bottom, fading up to a #2 just above the temple', top: 'Short and textured, about an inch, pushed forward', finish: 'Razor line-up at the forehead and temples', upkeep: 'Every 2 to 3 weeks', services: ['skin-fade'], barber: 'ray' },
    { id: 'taper-beard', name: 'Taper & full beard', photo: 'photos/cut-taper-beard.jpg', alt: 'Profile of a man with a high taper and a full trimmed beard',
      sides: 'High taper from a #1 to skin at the neckline', top: 'Short waves, about half an inch', finish: 'Beard blended into the taper, cheek line shaped with a razor', upkeep: 'Every 2 weeks', services: ['cut-beard'], barber: 'ray' },
    { id: 'design', name: 'Fade with a design', photo: 'photos/cut-design.jpg', alt: 'A skin fade with a zig-zag line shaved into the side',
      sides: 'Low skin fade', top: 'Short sponge twists or a crop', finish: 'A shaved design above the ear. Bring a photo of the one you want', upkeep: 'Every 2 weeks, or the design blurs', services: ['skin-fade', 'design'], barber: 'theo' },
    { id: 'buzz', name: 'Clean buzz', photo: 'photos/cut-buzz.jpg', alt: 'A barber with tattooed arms buzzing the back of a client\'s head',
      sides: 'A #2 all over, or a #3 on top and #1 on the sides', top: 'Same as the sides', finish: 'Square or tapered neckline. Say which', upkeep: 'Every 3 to 4 weeks', services: ['buzz'], barber: 'nico' },
    { id: 'scissor', name: 'Classic scissor cut', photo: 'photos/cut-scissor.jpg', alt: 'A barber combs and scissor-cuts an older man\'s grey hair',
      sides: 'Scissor over comb, tidy over the ears', top: 'Two to three inches, side part', finish: 'Natural neckline, a light pomade', upkeep: 'Every 4 to 6 weeks', services: ['signature'], barber: 'nico' },
    { id: 'shave', name: 'Hot towel shave', photo: 'photos/hot-towel-shave.jpg', alt: 'A barber holds a client\'s jaw while shaving him with a straight razor',
      finish: 'Two hot towels, lather, a straight razor and a cold towel to close', upkeep: 'Before a big day, or once a month as a treat', services: ['shave'], barber: 'nico' },
];

const PERKS = [
    'Hot towel with every cut',
    'Walk-ins welcome',
    'Coffee, tea and cold water',
    'Kids cuts from $26',
    'Open late Thursday and Friday',
    'Free line-up within a week if something is off',
];

const CLUB = {
    name: 'Chair Club',
    price: '$65 a month',
    perks: [
        'One signature cut or skin fade every month',
        'A free line-up between cuts',
        '15% off beard work, shaves and products',
        'Book up to four weeks ahead, before everyone else',
    ],
    note: 'Cancel any month at the counter. For one person; not shared.',
};

const RULES = [
    { title: 'Running late?', body: 'We hold your chair for 10 minutes. After that we may need to shorten the service or move you.' },
    { title: 'Can\'t make it?', body: 'Let us know four hours before so someone else can have the chair. Repeat no-shows are asked to pay ahead.' },
    { title: 'Kids', body: 'Twelve and under get the kids price. Under 16 come with an adult.' },
    { title: 'Not right?', body: 'Come back within seven days and we fix it, free.' },
];

const REVIEWS = [
    { name: 'Marcus T.', service: 'Skin fade with Ray', text: 'Best fade I have had in this city, and he actually listened when I said I did not want it too high. Booked my next one before I left.' },
    { name: 'Dana K.', service: 'Kids cut with Theo', text: 'My son hates haircuts. Theo talked dinosaurs the whole time and he walked out asking when he could come back.' },
    { name: 'Owen P.', service: 'The Full Moon with Nico', text: 'The hot towel shave is worth every dollar. Forty minutes of nobody needing anything from me.' },
];

const FAQ = [
    { q: 'Do you take walk-ins?', a: `Yes. ${WALK_INS.policy} The hero at the top of this page shows the usual wait for this time of day.` },
    { q: 'How long does a haircut take?', a: 'A signature cut or a fade takes about 45 minutes, including the wash and hot towel. The menu shows the time for each service, and "Your visit" adds them up.' },
    { q: 'Can I bring a photo?', a: 'Please do. A photo of the cut you want, from the front and the side, is the fastest way to get it right.' },
    { q: 'Do you cut curly and textured hair?', a: 'Yes, every barber here does. For tight curls, sponge twists or waves, Ray and Theo are the ones to ask for.' },
    { q: 'How do I pay?', a: SHOP.payment },
    { q: 'Do you sell gift cards?', a: 'Yes, at the counter or by phone, for any amount or for a specific service.' },
];

const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    scissors: '<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="M8.6 8.6 20 18M8.6 15.4 20 6"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
};

// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const money = (n) => `$${n}`;
const DAY_NAMES = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const serviceById = (id) => SERVICES.find((s) => s.id === id);
const barberById = (id) => BARBERS.find((b) => b.id === id);
const firstName = (name) => name.split(' ')[0];

function toMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

function fmtTime(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
}

function fmtMinutes(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h ? `${h} hr${m ? ` ${m} min` : ''}` : `${m} min`;
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
const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoursOn = (d) => HOURS[DAYS[d.getDay()]];

// "Open now, until 7pm" or "Closed, opens Tuesday at 10am".
function openStatus() {
    const now = shopNow();
    const today = HOURS[now.day];
    if (today && now.minutes >= toMinutes(today[0]) && now.minutes < toMinutes(today[1])) {
        return { open: true, text: `Open now, until ${fmtTime(today[1])}`, now, today };
    }
    if (today && now.minutes < toMinutes(today[0])) {
        return { open: false, text: `Closed, opens today at ${fmtTime(today[0])}`, now };
    }
    for (let i = 1; i <= 7; i++) {
        const d = addDays(now.date, i);
        const h = hoursOn(d);
        if (h) return { open: false, text: `Closed, opens ${i === 1 ? 'tomorrow' : DAY_NAMES[DAYS[d.getDay()]]} at ${fmtTime(h[0])}`, now };
    }
    return { open: false, text: 'Closed', now };
}

// ---- Shop details -----------------------------------------------------------

// The number for tel: links, from the displayed one. Ten digits without a
// country code are read as a US number.
function phoneLink(phone) {
    const digits = String(phone).replace(/\D/g, '');
    if (String(phone).trim().startsWith('+')) return `+${digits}`;
    return digits.length === 10 ? `+1${digits}` : digits;
}

function bindShop() {
    const values = {
        ...SHOP,
        rating: SHOP.rating.toFixed(1),
        reviewCount: SHOP.reviewCount.toLocaleString('en-US'),
    };
    document.querySelectorAll('[data-bind]').forEach((el) => {
        const v = values[el.dataset.bind];
        if (v !== undefined) el.textContent = v;
    });
    const hrefs = {
        tel: `tel:${phoneLink(SHOP.phone)}`,
        mailto: `mailto:${SHOP.email}`,
        map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SHOP.name}, ${SHOP.address}`)}`,
        instagram: `https://www.instagram.com/${SHOP.instagram.replace(/^@/, '')}/`,
    };
    document.querySelectorAll('[data-bind-href]').forEach((el) => { el.href = hrefs[el.dataset.bindHref]; });
    $('#hero-eyebrow').textContent = `Barbershop · ${SHOP.city} · Since ${SHOP.since}`;
    $('#walkin-policy').textContent = WALK_INS.policy;
    $('#year').textContent = new Date().getFullYear();
}

function renderHeroFacts() {
    const cuts = SERVICES.filter((s) => s.cat === 'cuts');
    const from = Math.min(...cuts.map((s) => s.price));
    const facts = [
        { b: `From ${money(from)}`, s: 'for a haircut' },
        { b: `${BARBERS.length} chairs`, s: 'and a barber for each' },
        { b: `${SHOP.rating.toFixed(1)} ★`, s: `${SHOP.reviewCount.toLocaleString('en-US')} reviews` },
    ];
    $('#hero-facts').innerHTML = facts.map((f) => `<li><b>${esc(f.b)}</b><span>${esc(f.s)}</span></li>`).join('');
}

// The open-now line and the hero's walk-in ticket.
function renderStatus() {
    const s = openStatus();
    document.querySelectorAll('[data-status]').forEach((el) => { el.textContent = s.text; });
    $('#status').classList.toggle('is-open', s.open);

    const lastWalkIn = s.open ? toMinutes(s.today[1]) - WALK_INS.lastWalkInMinutes : 0;
    if (s.open && s.now.minutes < lastWalkIn) {
        const rule = WALK_INS.waits.find((w) => (!w.days || w.days.includes(s.now.day))
            && (!w.from || s.now.minutes >= toMinutes(w.from))
            && (!w.to || s.now.minutes < toMinutes(w.to)));
        $('#wait-now').textContent = rule ? rule.wait : 'Walk right in';
        $('#wait-sub').textContent = rule && rule.note ? `Usual wait now. ${rule.note}` : 'Usual wait at this time of day.';
    } else {
        $('#wait-now').textContent = s.open ? 'Last walk-ins taken' : 'We are closed';
        $('#wait-sub').textContent = `${s.open ? 'Book a chair for another day.' : s.text.replace(/^Closed, o/, 'O')}.`;
    }
}

// The perks, twice over, so the marquee loops without a gap.
function renderPerks() {
    const items = PERKS.map((p) => `<li>${icon('scissors')}<span>${esc(p)}</span></li>`).join('');
    $('#perks').innerHTML = items + items.replace(/<li>/g, '<li aria-hidden="true">');
}

// Book buttons go to the booking page when there is one.
function initBooking() {
    if (!SHOP.bookingUrl) return;
    document.querySelectorAll('[data-book]').forEach((a) => {
        a.href = SHOP.bookingUrl;
        a.target = '_blank';
        a.rel = 'noopener';
    });
    const ext = $('#book-external');
    ext.href = SHOP.bookingUrl;
    ext.hidden = false;
    $('#book-lede').textContent = 'Pick a time online, or send a request here and your barber texts back to confirm.';
}

// ---- Menu and "Your visit" --------------------------------------------------

// The services in the visit, in the order they were added.
let visit = ['signature'];
let category = CATEGORIES[0].id;

function toggleService(id, on = !visit.includes(id)) {
    setVisit(on ? [...visit.filter((v) => v !== id), id] : visit.filter((v) => v !== id));
}

// Every view of the visit re-renders, and keyboard focus stays where it was:
// on the same Add button, or on the next remove button left in its list.
function setVisit(next) {
    const active = document.activeElement;
    const addId = active && active.dataset && active.dataset.add;
    const list = active && active.dataset && active.dataset.remove ? active.closest('#visit-items, #b-services') : null;
    const index = list ? [...list.querySelectorAll('[data-remove]')].indexOf(active) : -1;
    const cleared = active && active.id === 'visit-clear';
    visit = next;
    renderMenu();
    renderVisit();
    renderBookServices();
    renderDays();
    if (addId) {
        $(`#menu-list [data-add="${CSS.escape(addId)}"]`)?.focus();
    } else if (list) {
        const left = list.querySelectorAll('[data-remove]');
        const fallback = list.id === 'b-services' ? $('#b-add') : $('#menu-tabs [aria-selected="true"]');
        (left[Math.min(index, left.length - 1)] || fallback).focus();
    } else if (cleared) {
        $('#menu-tabs [aria-selected="true"]').focus();
    }
}

function initMenu() {
    const tabs = $('#menu-tabs');
    tabs.innerHTML = CATEGORIES.map((c) => `
        <button type="button" role="tab" id="tab-${esc(c.id)}" data-cat="${esc(c.id)}" aria-selected="${c.id === category}" tabindex="${c.id === category ? 0 : -1}">${esc(c.label)}</button>`).join('');
    const pick = (id, focus) => {
        category = id;
        tabs.querySelectorAll('[role="tab"]').forEach((t) => {
            const on = t.dataset.cat === id;
            t.setAttribute('aria-selected', String(on));
            t.tabIndex = on ? 0 : -1;
            if (on && focus) t.focus();
        });
        renderMenu();
    };
    tabs.addEventListener('click', (e) => {
        const t = e.target.closest('[role="tab"]');
        if (t) pick(t.dataset.cat);
    });
    tabs.addEventListener('keydown', (e) => {
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const i = CATEGORIES.findIndex((c) => c.id === category);
        pick(CATEGORIES[(i + step + CATEGORIES.length) % CATEGORIES.length].id, true);
    });
    $('#menu-list').addEventListener('click', (e) => {
        const b = e.target.closest('[data-add]');
        if (b) toggleService(b.dataset.add);
    });
    $('#visit-items').addEventListener('click', (e) => {
        const b = e.target.closest('[data-remove]');
        if (b) toggleService(b.dataset.remove, false);
    });
    $('#visit-clear').addEventListener('click', () => setVisit([]));
    renderMenu();
    renderVisit();
}

function renderMenu() {
    const list = $('#menu-list');
    list.setAttribute('aria-labelledby', `tab-${category}`);
    list.innerHTML = SERVICES.filter((s) => s.cat === category).map((s) => {
        const on = visit.includes(s.id);
        return `
        <div class="svc${on ? ' is-on' : ''}">
            <div class="svc-main">
                <h3>${esc(s.name)}${s.tag ? ` <span class="svc-tag">${esc(s.tag)}</span>` : ''}</h3>
                <p>${esc(s.desc)}</p>
            </div>
            <span class="svc-lead" aria-hidden="true"></span>
            <div class="svc-meta">
                <b class="svc-price">${money(s.price)}</b>
                <span class="svc-time">${icon('clock')}${s.minutes} min</span>
            </div>
            <button type="button" class="svc-add" data-add="${esc(s.id)}" aria-pressed="${on}" aria-label="${on ? 'Remove' : 'Add'} ${esc(s.name)}">${icon(on ? 'check' : 'plus')}<span>${on ? 'Added' : 'Add'}</span></button>
        </div>`;
    }).join('');
}

function visitTotals() {
    const items = visit.map(serviceById).filter(Boolean);
    return {
        items,
        price: items.reduce((n, s) => n + s.price, 0),
        minutes: items.reduce((n, s) => n + s.minutes, 0),
    };
}

function renderVisit() {
    const t = visitTotals();
    $('#visit-clear').hidden = !t.items.length;
    $('#visit-items').innerHTML = t.items.length
        ? t.items.map((s) => `
            <li>
                <span>${esc(s.name)}<small>${s.minutes} min</small></span>
                <b>${money(s.price)}</b>
                <button type="button" data-remove="${esc(s.id)}" aria-label="Remove ${esc(s.name)}">${icon('x')}</button>
            </li>`).join('')
        : '<li class="visit-empty">Nothing yet. Tap Add on a service.</li>';
    $('#visit-total').innerHTML = `
        <div><dt>Time in the chair</dt><dd>${t.items.length ? esc(fmtMinutes(t.minutes)) : '–'}</dd></div>
        <div><dt>Total</dt><dd class="visit-price">${money(t.price)}</dd></div>`;
    $('#visit-book').classList.toggle('is-disabled', !t.items.length);
    $('#visit-book').setAttribute('aria-disabled', String(!t.items.length));
}

// ---- Barbers ----------------------------------------------------------------

function renderBarbers() {
    const today = shopNow().day;
    const open = !!HOURS[today];
    $('#barber-list').innerHTML = BARBERS.map((b) => {
        const inToday = open && b.days.includes(today);
        return `
        <article class="barber">
            <figure class="barber-photo">
                <img src="${esc(b.photo)}" alt="${esc(b.alt || b.name)}" loading="lazy">
                ${inToday ? '<span class="in-today">In today</span>' : ''}
            </figure>
            <div class="barber-body">
                <p class="barber-title">${esc(b.title)}</p>
                <h3>${esc(b.name)}</h3>
                <p>${esc(b.bio)}</p>
                <ul class="barber-tags">${b.specialties.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
                <ol class="week" aria-label="Days ${esc(firstName(b.name))} cuts: ${esc(b.days.map((d) => DAY_NAMES[d]).join(', '))}">
                    ${WEEK.map((d) => `<li class="${b.days.includes(d) ? 'on' : ''}${d === today ? ' today' : ''}" aria-hidden="true">${d[0]}</li>`).join('')}
                </ol>
                <a class="btn btn-paper btn-sm" href="#book" data-barber="${esc(b.id)}">Book with ${esc(firstName(b.name))}</a>
            </div>
        </article>`;
    }).join('');
    $('#barber-list').addEventListener('click', (e) => {
        const a = e.target.closest('[data-barber]');
        if (!a || SHOP.bookingUrl) return;
        e.preventDefault();
        goToBooking({ barber: a.dataset.barber });
    });
    if (SHOP.bookingUrl) {
        document.querySelectorAll('[data-barber]').forEach((a) => { a.href = SHOP.bookingUrl; a.target = '_blank'; a.rel = 'noopener'; });
    }
}

// ---- Lookbook ---------------------------------------------------------------

let look = 0;

function initLookbook() {
    const root = $('#looks');
    root.innerHTML = LOOKBOOK.map((l, i) => `
        <button type="button" class="look" role="radio" aria-checked="${i === look}" tabindex="${i === look ? 0 : -1}" data-i="${i}">
            <img src="${esc(l.photo)}" alt="" loading="lazy">
            <span>${esc(l.name)}</span>
        </button>`).join('');
    const pick = (i, focus) => {
        look = i;
        root.querySelectorAll('.look').forEach((b, j) => {
            b.setAttribute('aria-checked', String(j === i));
            b.tabIndex = j === i ? 0 : -1;
            if (j === i && focus) b.focus();
        });
        renderLook();
    };
    root.addEventListener('click', (e) => {
        const b = e.target.closest('.look');
        if (b) pick(Number(b.dataset.i));
    });
    root.addEventListener('keydown', (e) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        pick((look + step + LOOKBOOK.length) % LOOKBOOK.length, true);
    });
    renderLook();
}

function renderLook() {
    const l = LOOKBOOK[look];
    const svcs = l.services.map(serviceById).filter(Boolean);
    const barber = barberById(l.barber);
    const rows = [['Sides', l.sides], ['Top', l.top], ['Finish', l.finish], ['Upkeep', l.upkeep]].filter(([, v]) => v);
    const price = svcs.reduce((n, s) => n + s.price, 0);
    const minutes = svcs.reduce((n, s) => n + s.minutes, 0);
    $('#look-out').innerHTML = `
        <figure class="look-photo"><img src="${esc(l.photo)}" alt="${esc(l.alt)}"></figure>
        <div class="look-card">
            <p class="look-kicker">How to ask for it</p>
            <h3>${esc(l.name)}</h3>
            <dl class="look-spec">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
            <div class="look-foot">
                ${svcs.length ? `<p class="look-svc"><b>${esc(svcs.map((s) => s.name).join(' + '))}</b><span>${money(price)} · ${esc(fmtMinutes(minutes))}</span></p>` : ''}
                ${barber ? `<p class="look-barber"><img src="${esc(barber.photo)}" alt="" width="36" height="36"><span>Ask for <b>${esc(firstName(barber.name))}</b></span></p>` : ''}
            </div>
            <button type="button" class="btn btn-ink btn-block" id="look-book">Book this look ${icon('arrow')}</button>
        </div>`;
    $('#look-book').addEventListener('click', () => {
        if (SHOP.bookingUrl) { window.open(SHOP.bookingUrl, '_blank', 'noopener'); return; }
        // The look's services become the visit.
        setVisit(svcs.map((s) => s.id));
        goToBooking({ barber: l.barber, note: `Looking for: ${l.name}` });
    });
}

// ---- Club, rules, reviews, hours, FAQ ---------------------------------------

function renderClub() {
    $('#club-name').textContent = CLUB.name;
    $('#club-price').textContent = CLUB.price;
    $('#club-perks').innerHTML = CLUB.perks.map((p) => `<li>${icon('check')}<span>${esc(p)}</span></li>`).join('');
    $('#club-note').textContent = CLUB.note;
    $('#club-join').addEventListener('click', (e) => {
        if (SHOP.bookingUrl) return;
        e.preventDefault();
        goToBooking({ note: `I would like to join ${CLUB.name}.` });
    });
    $('#rules').innerHTML = RULES.map((r) => `<li><h4>${esc(r.title)}</h4><p>${esc(r.body)}</p></li>`).join('');
}

function renderReviews() {
    $('#reviews').hidden = !REVIEWS.length;
    $('#review-list').innerHTML = REVIEWS.map((r) => `
        <figure class="review">
            <span class="review-stars" aria-hidden="true">★★★★★</span>
            <blockquote>${esc(r.text)}</blockquote>
            <figcaption><b>${esc(r.name)}</b><small>${esc(r.service)}</small></figcaption>
        </figure>`).join('');
}

function renderHours() {
    const today = shopNow().day;
    const row = (d) => {
        const h = HOURS[d];
        return `<li class="${d === today ? 'today' : ''}${h ? '' : ' closed'}">
            <span>${DAY_NAMES[d]}${d === today ? ' <small>today</small>' : ''}</span>
            <b>${h ? `${fmtTime(h[0])} – ${fmtTime(h[1])}` : 'Closed'}</b>
        </li>`;
    };
    $('#hours').innerHTML = WEEK.map(row).join('');
    $('#foot-hours').innerHTML = WEEK.map((d) => {
        const h = HOURS[d];
        return `<li>${d} ${h ? `${fmtTime(h[0])}–${fmtTime(h[1])}` : 'closed'}</li>`;
    }).join('');
}

function renderFaq() {
    $('#faq-list').innerHTML = FAQ.map((f, i) => `
        <details${i === 0 ? ' open' : ''}>
            <summary>${esc(f.q)}<span aria-hidden="true"></span></summary>
            <p>${esc(f.a)}</p>
        </details>`).join('');
}

// ---- Booking request --------------------------------------------------------

let timeOfDay = '';

// The next open days, within two weeks, that the chosen barber cuts and that
// still have room for the whole visit. "Any barber" offers every open day.
function bookableDays(barberId, count = 8) {
    const b = barberById(barberId);
    const now = shopNow();
    const out = [];
    for (let i = 0; out.length < count && i < 14; i++) {
        const d = addDays(now.date, i);
        if (b && !b.days.includes(DAYS[d.getDay()])) continue;
        if (slotsFor(d).length) out.push(d);
    }
    return out;
}

// Morning, afternoon and evening, where the visit can start in that part of
// the day and still finish by closing. Today starts 30 minutes from now.
function slotsFor(d) {
    const h = d && hoursOn(d);
    if (!h) return [];
    const open = toMinutes(h[0]);
    const close = toMinutes(h[1]);
    const now = shopNow();
    const earliest = isoDay(d) === isoDay(now.date) ? now.minutes + 30 : open;
    const length = visitTotals().minutes || 30;
    return [
        { label: 'Morning', from: open, to: 12 * 60 },
        { label: 'Afternoon', from: Math.max(open, 12 * 60), to: Math.min(close, 17 * 60) },
        { label: 'Evening', from: 17 * 60, to: close },
    ].filter((s) => {
        const start = Math.max(s.from, earliest);
        return s.to - s.from >= 45 && start < s.to && start + length <= close;
    }).map((s) => s.label);
}

function renderBookServices() {
    const chips = $('#b-services');
    const t = visitTotals();
    chips.innerHTML = t.items.length
        ? t.items.map((s) => `<li><span>${esc(s.name)}</span><button type="button" data-remove="${esc(s.id)}" aria-label="Remove ${esc(s.name)}">${icon('x')}</button></li>`).join('')
        : '<li class="chips-empty">No services yet. Add one below or from the menu.</li>';
    const add = $('#b-add');
    add.innerHTML = '<option value="">+ Add a service</option>' + CATEGORIES.map((c) => `
        <optgroup label="${esc(c.label)}">${SERVICES.filter((s) => s.cat === c.id && !visit.includes(s.id))
            .map((s) => `<option value="${esc(s.id)}">${esc(s.name)} · ${money(s.price)}</option>`).join('')}</optgroup>`).join('');
    $('#b-sum').innerHTML = t.items.length
        ? `<span>${icon('clock')}${esc(fmtMinutes(t.minutes))} in the chair</span><b>${money(t.price)}</b>`
        : '';
}

function renderDays() {
    const sel = $('#b-day');
    const prev = sel.value;
    const days = bookableDays($('#b-barber').value);
    const now = shopNow().date;
    sel.innerHTML = days.map((d) => {
        const diff = Math.round((d - now) / 864e5);
        const label = diff === 0 ? `Today, ${fmtDate(d)}` : diff === 1 ? `Tomorrow, ${fmtDate(d)}` : fmtDate(d);
        return `<option value="${isoDay(d)}">${esc(label)}</option>`;
    }).join('') || '<option value="">No open days in the next two weeks</option>';
    if ([...sel.options].some((o) => o.value === prev)) sel.value = prev;
    renderTimes();
}

function renderTimes() {
    const v = $('#b-day').value;
    const d = v ? new Date(`${v}T12:00:00`) : null;
    const slots = slotsFor(d);
    if (!slots.includes(timeOfDay)) timeOfDay = slots[0] || '';
    $('#b-time').innerHTML = slots.map((s) => `
        <label class="seg-opt">
            <input type="radio" name="b-time" value="${esc(s)}"${s === timeOfDay ? ' checked' : ''}>
            <span>${esc(s)}</span>
        </label>`).join('');
}

function initBookForm() {
    const form = $('#book-form');
    $('#b-barber').innerHTML = '<option value="">Any barber, first free</option>'
        + BARBERS.map((b) => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('');
    $('#b-barber').addEventListener('change', renderDays);
    $('#b-day').addEventListener('change', renderTimes);
    $('#b-time').addEventListener('change', (e) => { if (e.target.name === 'b-time') timeOfDay = e.target.value; });
    $('#b-add').addEventListener('change', (e) => { if (e.target.value) toggleService(e.target.value, true); });
    $('#b-services').addEventListener('click', (e) => {
        const b = e.target.closest('[data-remove]');
        if (b) toggleService(b.dataset.remove, false);
    });
    renderBookServices();
    renderDays();

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const note = $('#b-note-out');
        const val = (n) => form.elements[n].value.trim();
        const t = visitTotals();
        let bad = null;
        for (const n of ['name', 'phone']) {
            const el = form.elements[n];
            const empty = !el.value.trim();
            el.classList.toggle('invalid', empty);
            if (empty && !bad) bad = el;
        }
        if (!t.items.length) {
            note.textContent = 'Add at least one service.';
            note.className = 'form-note miss';
            $('#b-add').focus();
            return;
        }
        // The page may have been open a while: today's morning, or yesterday,
        // may be gone. Refresh the choices and ask again if they changed.
        const day = val('day');
        const time = timeOfDay;
        renderDays();
        if (day && (val('day') !== day || timeOfDay !== time)) {
            note.textContent = 'That time has passed, so we updated the day and time. Check them and send again.';
            note.className = 'form-note miss';
            $('#b-day').focus();
            return;
        }
        if (bad || !val('day')) {
            note.textContent = bad ? 'Add your name and a mobile number so your barber can text you.' : 'There is no open day to pick. Call us instead.';
            note.className = 'form-note miss';
            (bad || $('#b-day')).focus();
            return;
        }
        const barber = barberById(val('barber'));
        const dayLabel = $('#b-day').options[$('#b-day').selectedIndex].text;
        const lines = [
            `Name: ${val('name')}`,
            `Mobile: ${val('phone')}`,
            `Services: ${t.items.map((s) => s.name).join(', ')}`,
            `Time in the chair: ${fmtMinutes(t.minutes)}, ${money(t.price)}`,
            `Barber: ${barber ? barber.name : 'Any barber'}`,
            `Day: ${dayLabel}${timeOfDay ? `, ${timeOfDay.toLowerCase()}` : ''}`,
            '',
            val('note'),
        ];
        const to = (barber && barber.email) || SHOP.email;
        const subject = `Chair request: ${dayLabel}, ${val('name')}`;
        window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
        note.className = 'form-note ok';
        note.textContent = `Your email app should open with the request${barber ? ` to ${firstName(barber.name)}` : ''}. If it does not, call ${SHOP.phone}.`;
    });
}

// Jump to the form, with a barber or a note filled in.
function goToBooking({ barber, note } = {}) {
    const form = $('#book-form');
    if (barber !== undefined) { form.elements.barber.value = barber; renderDays(); }
    if (note) form.elements.note.value = note;
    setMenu(false);
    $('#book').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => form.elements.name.focus({ preventScroll: true }), 500);
}

function initVisitBook() {
    $('#visit-book').addEventListener('click', (e) => {
        e.preventDefault();
        if (!visit.length) return;
        if (SHOP.bookingUrl) { window.open(SHOP.bookingUrl, '_blank', 'noopener'); return; }
        goToBooking();
    });
}

// ---- Nav --------------------------------------------------------------------

function setMenu(open) {
    const toggle = $('.nav-toggle');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    $('#nav-links').classList.toggle('open', open);
}

function initNav() {
    $('.nav-toggle').addEventListener('click', (e) => {
        setMenu(e.currentTarget.getAttribute('aria-expanded') !== 'true');
    });
    $('#nav-links').addEventListener('click', (e) => {
        if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
}

function markSamples() {
    if (!SAMPLE_CONTENT) return;
    document.querySelectorAll('[data-sample]').forEach((el) => { el.hidden = false; });
}

bindShop();
markSamples();
renderHeroFacts();
renderStatus();
renderPerks();
initNav();
initMenu();
initVisitBook();
renderBarbers();
initLookbook();
renderClub();
renderReviews();
renderHours();
renderFaq();
initBookForm();
initBooking();
setInterval(renderStatus, 60 * 1000);
