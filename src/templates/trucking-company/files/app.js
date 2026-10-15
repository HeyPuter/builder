// Page content lives here as data so it is easy to find and change. Each block
// below is one thing the carrier has to make their own:
//
//   BUSINESS      who you are: name, phone, email, address, USDOT and MC
//                 numbers, insurance and timezone. Fills every element with
//                 data-bind="<key>", and links with data-bind-href="tel|mailto".
//   STATS         the numbers in the strip under the hero.
//   EQUIPMENT,
//   RATES         the trailers you pull and the ballpark rate per mile for
//                 each. The rate request reads both.
//   CITIES, HOME,
//   LANES         where you run. The map, the departures board, the rate
//                 request's cities, miles and transit days all read them.
//   DRIVERS       pay, home time, perks and hiring rules for the driver
//                 section and the application.
//   SAFETY,
//   REVIEWS       proof. Samples until SAMPLE_CONTENT is false.
//   HOURS         when the office is staffed. Dispatch answers 24/7.
//   ENQUIRY       where rate requests and applications go: email addresses,
//                 or a form endpoint that accepts a JSON POST.
//
// SAMPLE_CONTENT marks the authority numbers, insurance, safety record, stats
// and reviews as samples on the page. Set it to false once they are the
// carrier's own.

const SAMPLE_CONTENT = true;

const BUSINESS = {
    name: 'Ridgeway Freight Lines',
    shortName: 'Ridgeway',
    trade: 'Freight Lines',
    since: 1998,
    phone: '(555) 019-2040',
    email: 'dispatch@example.com',
    address: '2200 Terminal Drive, Springfield, MO',
    baseCity: 'Springfield, Missouri',
    baseShort: 'Springfield',
    usdot: '3104471',
    mc: '108452',
    cargoCover: 100000,
    liability: 1000000,
    // Office hours and the departures board clock run in this timezone,
    // whatever timezone the visitor is in.
    timezone: 'America/Chicago',
};

const STATS = [
    { value: '64', label: 'Company tractors' },
    { value: '150', label: 'Trailers' },
    { value: '98.4%', label: 'On time, last 12 months' },
    { value: '42M', label: 'Safe miles' },
];

// Office hours, 24-hour clock. null is closed. Dispatch answers the phone at
// all hours; these are for sales, billing and recruiting.
const HOURS = {
    Mon: [7, 18], Tue: [7, 18], Wed: [7, 18], Thu: [7, 18], Fri: [7, 18],
    Sat: [8, 12], Sun: null,
};

// The trailers you pull. perMile is the ballpark all-in rate the rate
// request shows on a regular lane; maxLb is the most it will take.
const EQUIPMENT = [
    {
        id: 'van', name: 'Dry van', size: '53′ trailers', perMile: 2.35, maxLb: 45000,
        photo: 'photos/loading-dock.jpg', alt: 'Two closed loading dock doors marked receiving on a brick warehouse',
        body: 'Palletized and floor-loaded freight. Drop a trailer at your dock and load it on your schedule.',
        specs: [['Pallets', '26 standard'], ['Max load', '45,000 lb'], ['Suspension', 'Air ride'], ['Drop trailers', 'Yes']],
    },
    {
        id: 'reefer', name: 'Refrigerated', size: '53′ reefers', perMile: 2.8, maxLb: 43500,
        photo: 'photos/cold-dock.jpg', alt: 'A forklift moving a tall pallet of boxed watermelons in a cold warehouse',
        body: 'Produce, dairy and frozen food, with the temperature logged the whole way and sent with the delivery receipt.',
        specs: [['Temp range', '−20°F to 70°F'], ['Pallets', '26 standard'], ['Max load', '43,500 lb'], ['Temp log', 'Every 15 min']],
    },
    {
        id: 'flatbed', name: 'Flatbed', size: '48′ flats and step decks', perMile: 3.05, maxLb: 47000,
        photo: 'photos/oversize-load.jpg', alt: 'A chrome truck hauling a wide steel load with an oversize load banner on the bumper',
        body: 'Steel, lumber, machinery and building materials. We pull the permits for oversize loads.',
        specs: [['Max load', '47,000 lb'], ['Deck', '48′ flat, 53′ step'], ['Securement', 'Chains, straps, tarps'], ['Oversize', 'Permits arranged']],
    },
];
const ALSO = ['Dedicated fleet', 'Team expedited', 'Power only', 'Drop and hook', 'Cross-dock at our terminal'];

const RATES = {
    // Show the ballpark price in the rate request. Set to false to show
    // miles and transit only.
    show: true,
    minimum: 650,
    // How far either side of the middle the ballpark range goes.
    spread: 0.08,
    // Added for a city pair off the regular lanes (the truck runs empty to
    // get there or back).
    offLane: 0.15,
};

// Cities the rate request offers, with coordinates for the map and the miles
// (straight-line distance times a road factor, unless a lane sets its own).
// Map labels sit on the side away from HOME; side: 'left' or 'right' moves one.
const CITIES = {
    SGF: { name: 'Springfield', state: 'MO', lat: 37.21, lon: -93.29 },
    MKC: { name: 'Kansas City', state: 'MO', lat: 39.1, lon: -94.58 },
    STL: { name: 'St. Louis', state: 'MO', lat: 38.63, lon: -90.2 },
    TUL: { name: 'Tulsa', state: 'OK', lat: 36.15, lon: -95.99 },
    OKC: { name: 'Oklahoma City', state: 'OK', lat: 35.47, lon: -97.52 },
    DAL: { name: 'Dallas', state: 'TX', lat: 32.78, lon: -96.8 },
    HOU: { name: 'Houston', state: 'TX', lat: 29.76, lon: -95.37 },
    LIT: { name: 'Little Rock', state: 'AR', lat: 34.75, lon: -92.29, side: 'left' },
    MEM: { name: 'Memphis', state: 'TN', lat: 35.15, lon: -90.05 },
    BNA: { name: 'Nashville', state: 'TN', lat: 36.16, lon: -86.78 },
    IND: { name: 'Indianapolis', state: 'IN', lat: 39.77, lon: -86.16 },
    CHI: { name: 'Chicago', state: 'IL', lat: 41.88, lon: -87.63 },
    OMA: { name: 'Omaha', state: 'NE', lat: 41.26, lon: -95.93 },
    DEN: { name: 'Denver', state: 'CO', lat: 39.74, lon: -104.99 },
    ATL: { name: 'Atlanta', state: 'GA', lat: 33.75, lon: -84.39 },
};
const HOME = 'SGF';

// Lanes out of HOME, run in both directions. weekly is how many trucks a week
// make the trip. miles is optional and overrides the estimate.
const LANES = [
    { to: 'DAL', weekly: 6 },
    { to: 'MKC', weekly: 8 },
    { to: 'STL', weekly: 7 },
    { to: 'TUL', weekly: 5 },
    { to: 'MEM', weekly: 5 },
    { to: 'CHI', weekly: 4 },
    { to: 'HOU', weekly: 3 },
    { to: 'OKC', weekly: 3 },
    { to: 'LIT', weekly: 3 },
    { to: 'BNA', weekly: 3 },
    { to: 'IND', weekly: 2 },
    { to: 'OMA', weekly: 2 },
    { to: 'ATL', weekly: 2 },
    { to: 'DEN', weekly: 1 },
];

const STEPS = [
    { tag: 'Within 1 hr', title: 'Rate', body: 'Send the lane and the freight. A dispatcher calls back with a firm all-in rate.' },
    { tag: 'Same day', title: 'Tender', body: 'Book it by email or phone. You get the truck number and driver’s name the day before pickup.' },
    { tag: 'Pickup', title: 'Load', body: 'On time for your appointment, or we call before it is late. Drop trailers wait at your dock.' },
    { tag: 'Every 4 hrs', title: 'Track', body: 'A tracking link from the truck’s ELD, and a check call at every stop.' },
    { tag: 'Within 24 hrs', title: 'Deliver', body: 'Signed delivery receipt and invoice by email. Reefer loads include the temperature log.' },
];

const DRIVERS = {
    // Company driver pay used by the calculator on the page.
    centsPerMile: 62,
    stopPay: 50,
    stopsPerWeek: 4,
    weeksPerYear: 50,
    homeTime: 'Home every weekend',
    // Applicants with less Class A experience than this see a note saying so.
    minMonths: 12,
    positions: [
        { id: 'regional', label: 'Company regional' },
        { id: 'local', label: 'Local, home daily' },
        { id: 'owner', label: 'Owner-operator' },
    ],
    experience: [
        { id: 'new', label: 'Under 1 year', months: 0 },
        { id: '1-2', label: '1 to 2 years', months: 12 },
        { id: '3-5', label: '3 to 5 years', months: 36 },
        { id: '5+', label: 'Over 5 years', months: 60 },
    ],
    endorsements: ['Hazmat', 'Tanker', 'Doubles', 'TWIC card'],
    perks: [
        'Paid every Friday by direct deposit',
        'Health, dental and vision from your first day',
        'Assigned 2023 or newer tractor, APU and inverter',
        'Paid orientation and $1,500 sign-on bonus',
        'No touch freight on dry van',
    ],
    ownerNote: 'Owner-operators keep 75% of the linehaul plus all fuel surcharge.',
};

// The record shown under "Safety you can look up", after the authority and
// insurance from BUSINESS.
const SAFETY = [
    ['Safety rating', 'Satisfactory'],
    ['Vehicle out-of-service', '9.8% (national 22%)'],
    ['Driver out-of-service', '2.1% (national 6.7%)'],
    ['ELD', 'Every truck'],
];

const REVIEWS = [
    { name: 'Rachel P.', role: 'Shipping manager', company: 'Ozark food distributor', lane: 'Springfield to Dallas', text: 'Three reefer loads a week for two years. They tell us about a late truck before the receiver does, and the temperature log is in my inbox with the receipt.' },
    { name: 'Glen H.', role: 'Plant logistics', company: 'Steel fabricator', lane: 'Tulsa to Springfield', text: 'Flatbed drivers who tarp properly and show up with their own chains. Oversize permits were sorted without us asking.' },
    { name: 'Monique A.', role: 'Receiving lead', company: 'Regional grocery DC', lane: 'Kansas City to Springfield', text: 'Same handful of drivers every week, always on the appointment. Our dock crew asks for them by name.' },
];

const FAQ = [
    { q: 'Are you a carrier or a broker?', a: 'A carrier. Our own trucks, trailers and employed drivers haul every load we book. We do not hand your freight to another company.' },
    { q: 'How fast do I get a rate?', a: 'Within an hour during office hours, and usually sooner. The ballpark on this page is a guide; the firm rate from dispatch includes fuel and any accessorials.' },
    { q: 'Do you haul less-than-truckload (LTL)?', a: 'No, full truckloads only. Partial loads of 12 pallets or more can share a trailer on our busier lanes; ask dispatch.' },
    { q: 'What does detention cost?', a: 'Two hours free at pickup and delivery, then $75 an hour, billed in 15-minute steps and backed by the ELD timestamps.' },
    { q: 'Can you haul outside your regular lanes?', a: 'Often, when a truck is nearby. Off-lane freight costs a little more because the truck may run empty one way.' },
    { q: 'How do I get your insurance certificate?', a: 'Email dispatch or ask on the rate request. We send a certificate naming you as certificate holder the same day.' },
];

// Where requests go. With endpoint set (a form service or your own backend
// that accepts a JSON POST), both forms send there with a "type" field.
// Without it, they open an email to `quotes` or `drivers`, or BUSINESS.email.
const ENQUIRY = {
    quotes: '',
    drivers: '',
    endpoint: '',
};

const ICONS = {
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
    route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};

// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const num = (n) => Math.round(n).toLocaleString('en-US');
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };

const cityLabel = (id) => `${CITIES[id].name}, ${CITIES[id].state}`;
const equipById = (id) => EQUIPMENT.find((e) => e.id === id) || EQUIPMENT[0];

// ---- Business time ------------------------------------------------------------

// The current wall-clock time where the business is, as a Date whose local
// fields read as the business's time. Falls back to the visitor's clock.
function bizNow() {
    try {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
            timeZone: BUSINESS.timezone, year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
        }).formatToParts(new Date()).map((p) => [p.type, p.value]));
        return new Date(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
    } catch {
        return new Date();
    }
}

function fmtHour(h) {
    const hr = Math.floor(h);
    const min = Math.round((h - hr) * 60);
    const ampm = hr >= 12 && hr < 24 ? 'pm' : 'am';
    return `${hr % 12 || 12}${min ? `:${String(min).padStart(2, '0')}` : ''}${ampm}`;
}

const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Whether the office is open now, and when it next opens.
function officeState() {
    const now = bizNow();
    const h = now.getHours() + now.getMinutes() / 60;
    const today = HOURS[DAYS[now.getDay()]];
    if (today && h >= today[0] && h < today[1]) return { open: true, until: today[1] };
    for (let i = 0; i < 8; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        const hrs = HOURS[DAYS[d.getDay()]];
        if (hrs && (i > 0 || h < hrs[0])) return { open: false, day: i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY_NAMES[DAYS[d.getDay()]], at: hrs[0] };
    }
    return { open: false };
}

// ---- Lanes and miles ---------------------------------------------------------------

function laneFor(a, b) {
    const other = a === HOME ? b : b === HOME ? a : null;
    return other ? LANES.find((l) => l.to === other) || null : null;
}

// Road miles between two cities: the lane's own figure, or the straight-line
// distance times 1.2 for the roads.
function milesBetween(a, b) {
    const lane = laneFor(a, b);
    if (lane && lane.miles) return lane.miles;
    const A = CITIES[a];
    const B = CITIES[b];
    const rad = (x) => (x * Math.PI) / 180;
    const h = Math.sin(rad(B.lat - A.lat) / 2) ** 2 +
        Math.cos(rad(A.lat)) * Math.cos(rad(B.lat)) * Math.sin(rad(B.lon - A.lon) / 2) ** 2;
    return Math.round(3959 * 2 * Math.asin(Math.sqrt(h)) * 1.2);
}

// A solo driver covers about 500 miles a day within the hours-of-service rules.
const transitDays = (miles) => Math.max(1, Math.ceil(miles / 500));
const daysText = (d) => `${d} day${d === 1 ? '' : 's'}`;

// ---- Business details ------------------------------------------------------------

// The number for tel: links, from the displayed one. Ten digits without a
// country code are read as a US number.
function phoneLink(phone) {
    const digits = String(phone).replace(/\D/g, '');
    if (String(phone).trim().startsWith('+')) return `+${digits}`;
    return digits.length === 10 ? `+1${digits}` : digits;
}

function bindBusiness() {
    const values = { ...BUSINESS, cargoCover: money(BUSINESS.cargoCover) };
    document.querySelectorAll('[data-bind]').forEach((el) => {
        const v = values[el.dataset.bind];
        if (v !== undefined) el.textContent = v;
    });
    const hrefs = { tel: `tel:${phoneLink(BUSINESS.phone)}`, mailto: `mailto:${BUSINESS.email}` };
    document.querySelectorAll('[data-bind-href]').forEach((el) => { el.href = hrefs[el.dataset.bindHref]; });
    $('#year').textContent = new Date().getFullYear();
    $('#lane-count').textContent = LANES.length;
}

function renderStatus() {
    const s = officeState();
    const line = s.open
        ? `Office open now until ${fmtHour(s.until)}`
        : `Office closed${s.day ? `, opens ${s.day} at ${fmtHour(s.at)}` : ''}`;
    document.querySelectorAll('[data-office]').forEach((el) => { el.textContent = line; });
    const now = bizNow();
    let zone = '';
    try {
        zone = new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS.timezone, timeZoneName: 'short' })
            .formatToParts(new Date()).find((p) => p.type === 'timeZoneName').value;
    } catch { /* the clock alone is enough */ }
    $('#board-clock').textContent = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${zone}`.trim();
}

// ---- Stats, equipment, steps ------------------------------------------------------

function renderStats() {
    $('#stats').innerHTML = STATS.map((s) => `<li><b>${esc(s.value)}</b><span>${esc(s.label)}</span></li>`).join('') +
        `<li><b>${new Date().getFullYear() - BUSINESS.since}</b><span>Years on the road</span></li>`;
}

function renderEquipment() {
    $('#equip-grid').innerHTML = EQUIPMENT.map((e) => `
        <article class="equip">
            <div class="equip-photo"><img src="${esc(e.photo)}" alt="${esc(e.alt)}" loading="lazy"><span>${esc(e.size)}</span></div>
            <div class="equip-body">
                <h3>${esc(e.name)}</h3>
                <p>${esc(e.body)}</p>
                <dl>${e.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
                <a class="equip-link" href="#request" data-equip="${esc(e.id)}">Rate a ${esc(e.name.toLowerCase())} load ${icon('arrow')}</a>
            </div>
        </article>`).join('');
    $('#also').innerHTML = `<span>Also</span>${ALSO.map((a) => `<b>${esc(a)}</b>`).join('')}`;
}

function renderSteps() {
    $('#steps').innerHTML = STEPS.map((s, i) => `
        <li style="--i:${i}">
            <span class="step-tag">${esc(s.tag)}</span>
            <h3><small>${String(i + 1).padStart(2, '0')}</small>${esc(s.title)}</h3>
            <p>${esc(s.body)}</p>
        </li>`).join('');
}

// ---- Lanes: map and departures board ---------------------------------------------------

// Equirectangular projection onto the 640 × 420 map, fitted to the cities.
function projector() {
    const pts = Object.values(CITIES);
    const pad = 46;
    const minLon = Math.min(...pts.map((c) => c.lon));
    const maxLon = Math.max(...pts.map((c) => c.lon));
    const minLat = Math.min(...pts.map((c) => c.lat));
    const maxLat = Math.max(...pts.map((c) => c.lat));
    const kx = Math.cos(((minLat + maxLat) / 2) * Math.PI / 180);
    const scale = Math.min((640 - pad * 2) / ((maxLon - minLon) * kx), (420 - pad * 2) / (maxLat - minLat));
    const offX = (640 - (maxLon - minLon) * kx * scale) / 2;
    const offY = (420 - (maxLat - minLat) * scale) / 2;
    return (c) => [offX + (c.lon - minLon) * kx * scale, offY + (maxLat - c.lat) * scale];
}

function renderLanes() {
    const proj = projector();
    const [hx, hy] = proj(CITIES[HOME]);
    const svg = $('#map');
    const grid = [];
    for (let x = 20; x < 640; x += 40) grid.push(`<path class="grid" d="M${x} 0V420"/>`);
    for (let y = 20; y < 420; y += 40) grid.push(`<path class="grid" d="M0 ${y}H640"/>`);
    const lanes = LANES.filter((l) => CITIES[l.to]).map((l) => {
        const [x, y] = proj(CITIES[l.to]);
        // Bow each lane a little so they read as routes, not spokes.
        const mx = (hx + x) / 2 - (y - hy) * 0.12;
        const my = (hy + y) / 2 + (x - hx) * 0.12;
        return `<path class="lane" data-lane="${esc(l.to)}" d="M${hx.toFixed(1)} ${hy.toFixed(1)}Q${mx.toFixed(1)} ${my.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}" style="--w:${1 + l.weekly * 0.35}"/>`;
    }).join('');
    const cities = Object.entries(CITIES).map(([id, c]) => {
        const [x, y] = proj(c);
        const home = id === HOME;
        const onLane = home || LANES.some((l) => l.to === id);
        const right = c.side ? c.side === 'right' : home || c.lon >= CITIES[HOME].lon;
        return `<g class="city${home ? ' city-home' : ''}${onLane ? '' : ' city-off'}" data-lane="${home ? '' : esc(id)}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">
            ${home ? '<rect x="-8" y="-8" width="16" height="16" rx="3"/>' : '<circle r="5"/>'}
            <text x="${right ? 12 : -12}" y="4" text-anchor="${right ? 'start' : 'end'}">${esc(c.name)}</text>
        </g>`;
    }).join('');
    svg.insertAdjacentHTML('beforeend', `${grid.join('')}<g>${lanes}</g>${cities}`);

    const rows = LANES.filter((l) => CITIES[l.to]).slice().sort((a, b) => b.weekly - a.weekly);
    $('#board').innerHTML = rows.map((l) => {
        const miles = milesBetween(HOME, l.to);
        return `<li><button type="button" data-lane="${esc(l.to)}" aria-label="Price ${esc(CITIES[HOME].name)} to ${esc(cityLabel(l.to))}">
            <span class="b-lane">${esc(CITIES[l.to].name)} <small>${esc(CITIES[l.to].state)}</small></span>
            <span>${num(miles)}</span>
            <span>${l.weekly}×</span>
            <span>${daysText(transitDays(miles))}</span>
        </button></li>`;
    }).join('');
    $('#foot-lanes').textContent = rows.map((l) => CITIES[l.to].name).join(' · ');

    const highlight = (id) => {
        svg.querySelectorAll('[data-lane]').forEach((el) => el.classList.toggle('on', !!id && el.dataset.lane === id));
        $('#board').querySelectorAll('[data-lane]').forEach((el) => el.classList.toggle('on', !!id && el.dataset.lane === id));
    };
    const hover = (e) => {
        const el = e.target.closest('[data-lane]');
        highlight(el && el.dataset.lane ? el.dataset.lane : null);
    };
    for (const el of [$('#board'), svg]) {
        el.addEventListener('mouseover', hover);
        el.addEventListener('focusin', hover);
        el.addEventListener('mouseleave', () => highlight(null));
    }
    // A lane on the map or the board fills the rate request with it.
    for (const el of [$('#board'), svg]) {
        el.addEventListener('click', (e) => {
            const t = e.target.closest('[data-lane]');
            if (!t || !t.dataset.lane) return;
            setRoute(HOME, t.dataset.lane);
            openTab('ship', { scroll: true, focus: true });
        });
    }
}

// ---- Drivers -----------------------------------------------------------------------

function renderDrivers() {
    $('#home-time').textContent = DRIVERS.homeTime;
    $('#perks').innerHTML = DRIVERS.perks.map((p) => `<li>${icon('check')}<span>${esc(p)}</span></li>`).join('');
    const range = $('#calc-miles');
    const update = () => {
        const miles = +range.value;
        const week = (miles * DRIVERS.centsPerMile) / 100 + DRIVERS.stopPay * DRIVERS.stopsPerWeek;
        $('#calc-miles-out').textContent = num(miles);
        $('#calc-week').textContent = money(week);
        $('#calc-year').textContent = money(week * DRIVERS.weeksPerYear);
        $('#calc-cpm').textContent = `${DRIVERS.centsPerMile}¢`;
        range.style.setProperty('--p', `${((miles - range.min) / (range.max - range.min)) * 100}%`);
    };
    range.addEventListener('input', update);
    update();
    $('#calc-note').textContent = `Company driver pay at ${DRIVERS.centsPerMile}¢ a mile plus ${money(DRIVERS.stopPay)} a stop, about ${DRIVERS.stopsPerWeek} stops a week, ${DRIVERS.weeksPerYear} weeks a year. An estimate, not an offer. ${DRIVERS.ownerNote}`;
}

// ---- Safety, reviews, FAQ -----------------------------------------------------------

function renderSafety() {
    const rows = [
        ['USDOT number', BUSINESS.usdot],
        ['MC number', BUSINESS.mc],
        ['Auto liability', money(BUSINESS.liability)],
        ['Cargo insurance', money(BUSINESS.cargoCover)],
        ...SAFETY,
    ];
    $('#creds').innerHTML = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    // Only link to the public record once the numbers are the carrier's own.
    const verify = $('#verify');
    verify.hidden = SAMPLE_CONTENT || !BUSINESS.usdot;
    verify.href = `https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${encodeURIComponent(BUSINESS.usdot)}`;
}

function renderReviews() {
    $('#review-list').innerHTML = REVIEWS.map((r, i) => `
        <figure class="review">
            <p class="review-lane">${icon('route')}${esc(r.lane)}</p>
            <blockquote>${esc(r.text)}</blockquote>
            <figcaption>
                <b class="sig">${esc(r.name)}</b><small>${esc(r.role)}, ${esc(r.company)}</small>
            </figcaption>
            <span class="pod" aria-hidden="true">POD #${String(48210 + i * 317)}</span>
        </figure>`).join('');
}

function renderFaq() {
    $('#faq-list').innerHTML = FAQ.map((f) => `
        <details>
            <summary>${esc(f.q)}<span aria-hidden="true"></span></summary>
            <p>${esc(f.a)}</p>
        </details>`).join('');
}

function renderHours() {
    $('#foot-hours').innerHTML = Object.entries(HOURS).map(([d, h]) => `<li><span>${d}</span><span>${h ? `${fmtHour(h[0])} to ${fmtHour(h[1])}` : 'Closed'}</span></li>`).join('');
}

// ---- Tabs ------------------------------------------------------------------------------

function openTab(which, { scroll = false, focus = false } = {}) {
    for (const id of ['ship', 'drive']) {
        const on = id === which;
        const tab = $(`#tab-${id}`);
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        $(`#panel-${id}`).hidden = !on;
        if (on && focus) tab.focus({ preventScroll: scroll });
    }
    if (scroll) {
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        $('#request').scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    }
}

function initTabs() {
    const list = $('.ticket-tabs');
    list.addEventListener('click', (e) => {
        const t = e.target.closest('[role="tab"]');
        if (t) openTab(t.id.replace('tab-', ''));
    });
    list.addEventListener('keydown', (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        const current = $('#tab-ship').getAttribute('aria-selected') === 'true' ? 'ship' : 'drive';
        const next = e.key === 'Home' ? 'ship' : e.key === 'End' ? 'drive' : current === 'ship' ? 'drive' : 'ship';
        openTab(next, { focus: true });
    });
    document.addEventListener('click', (e) => {
        const a = e.target.closest('[data-tab]');
        if (!a) return;
        e.preventDefault();
        openTab(a.dataset.tab, { scroll: true, focus: true });
    });
}

// ---- Rate request -------------------------------------------------------------------------

let equip = EQUIPMENT[0].id;

const newRef = () => {
    const d = bizNow();
    return `RQ-${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(Math.floor(1000 + Math.random() * 9000))}`;
};

function setRoute(from, to) {
    $('#q-from').value = from;
    $('#q-to').value = to;
    refreshEstimate();
}

// The route and load date the form opens with: HOME to the busiest lane,
// loading tomorrow. Also restored after a request is sent.
function resetRoute() {
    const busiest = LANES.slice().sort((a, b) => b.weekly - a.weekly)[0];
    const date = $('#q-date');
    date.min = isoDate(bizNow());
    const tomorrow = bizNow();
    tomorrow.setDate(tomorrow.getDate() + 1);
    date.value = isoDate(tomorrow);
    setRoute(HOME, busiest ? busiest.to : Object.keys(CITIES).find((c) => c !== HOME));
}

function setEquip(id) {
    const input = document.querySelector(`#q-equip input[value="${id}"]`);
    if (!input) return;
    input.checked = true;
    equip = id;
    refreshEstimate();
}

const weightOf = () => Number(String($('#q-weight').value).replace(/[^\d.]/g, '')) || 0;

// The box above the contact fields: miles, transit, whether this is one of
// our lanes, and a ballpark price for the chosen trailer.
function refreshEstimate() {
    const from = $('#q-from').value;
    const to = $('#q-to').value;
    const box = $('#q-estimate');
    if (from === to) {
        box.className = 'estimate est-warn';
        box.innerHTML = `${icon('alert')}<p>Pick a different delivery city.</p>`;
        return;
    }
    const e = equipById(equip);
    const miles = milesBetween(from, to);
    const lane = laneFor(from, to);
    const days = transitDays(miles);
    const mid = Math.max(RATES.minimum, miles * e.perMile * (lane ? 1 : 1 + RATES.offLane));
    const round = (n) => Math.round(n / 25) * 25;
    const lo = Math.max(RATES.minimum, round(mid * (1 - RATES.spread)));
    const hi = Math.max(lo, round(mid * (1 + RATES.spread)));
    const w = weightOf();
    const heavy = w > e.maxLb
        ? `<p class="est-line est-bad">${icon('alert')}${num(w)} lb is over the ${num(e.maxLb)} lb a ${esc(e.name.toLowerCase())} takes. Dispatch will suggest a split or another trailer.</p>`
        : '';
    box.className = `estimate${lane ? ' est-lane' : ''}`;
    box.innerHTML = `
        <div class="est-figs">
            <div><small>Miles</small><b>${num(miles)}</b></div>
            <div><small>Transit</small><b>${daysText(days)}</b></div>
            ${RATES.show ? `<div class="est-price"><small>Ballpark, all in</small><b>${money(lo)}–${money(hi).replace('$', '')}</b></div>` : ''}
        </div>
        <p class="est-line">${lane
            ? `${icon('route')}Regular lane: ${lane.weekly} truck${lane.weekly === 1 ? '' : 's'} a week`
            : `${icon('clock')}Not a weekly lane. We quote it when a truck is nearby.`}</p>
        ${heavy}
        ${RATES.show ? '<p class="est-fine">A guide, not a quote. Dispatch confirms a firm rate.</p>' : ''}`;
}

function initRate() {
    const opts = Object.keys(CITIES).sort((a, b) => cityLabel(a).localeCompare(cityLabel(b)))
        .map((id) => `<option value="${esc(id)}">${esc(cityLabel(id))}</option>`).join('');
    $('#q-from').innerHTML = opts;
    $('#q-to').innerHTML = opts;
    $('#q-equip').innerHTML = EQUIPMENT.map((e) => `
        <label class="pick"><input type="radio" name="equip" value="${esc(e.id)}"${e.id === equip ? ' checked' : ''}><span>${esc(e.name)}</span></label>`).join('');
    $('#q-equip').addEventListener('change', (e) => { if (e.target.name === 'equip') { equip = e.target.value; refreshEstimate(); } });
    resetRoute();
    for (const id of ['#q-from', '#q-to']) $(id).addEventListener('change', refreshEstimate);
    $('#q-weight').addEventListener('input', refreshEstimate);
    $('#q-swap').addEventListener('click', () => setRoute($('#q-to').value, $('#q-from').value));
    $('#ref').textContent = newRef();
    $('#q-note').textContent = ENQUIRY.endpoint
        ? 'Goes straight to dispatch. We call back within the hour.'
        : `Opens your email app with the request to ${ENQUIRY.quotes || BUSINESS.email}.`;

    // Any "Rate a ... load" link picks that trailer.
    document.addEventListener('click', (e) => {
        const a = e.target.closest('[data-equip]');
        if (!a) return;
        e.preventDefault();
        setEquip(a.dataset.equip);
        openTab('ship', { scroll: true, focus: true });
    });

    $('#panel-ship').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const note = $('#q-note');
        if (!checkRequired(form, ['name', 'phone'], note, 'Add your name and a phone number so dispatch can call you back.')) return;
        if (!checkValid(form, note, { email: 'Check the email address.', date: 'Pick a load date from today on.' })) return;
        const val = (n) => form.elements[n].value.trim();
        const from = val('from');
        const to = val('to');
        if (from === to) {
            note.textContent = 'Pick a delivery city different from the pick-up city.';
            note.className = 'f-note miss';
            form.elements.to.focus();
            return;
        }
        const miles = milesBetween(from, to);
        const data = {
            type: 'rate-request',
            ref: $('#ref').textContent,
            from: cityLabel(from),
            to: cityLabel(to),
            equipment: equipById(equip).name,
            ready: val('date'),
            weight: val('weight'),
            miles,
            name: val('name'),
            company: val('company'),
            phone: val('phone'),
            email: val('email'),
            notes: val('notes'),
        };
        const subject = `Rate request ${data.ref}: ${data.from} to ${data.to}, ${data.equipment}`;
        const lines = [
            `Ref: ${data.ref}`,
            `Lane: ${data.from} to ${data.to} (about ${num(miles)} miles)`,
            `Equipment: ${data.equipment}`,
            `Ready to load: ${data.ready || 'not given'}`,
            `Weight: ${data.weight ? `${data.weight} lb` : 'not given'}`,
            '',
            `Name: ${data.name}`,
            ...(data.company ? [`Company: ${data.company}`] : []),
            `Phone: ${data.phone}`,
            ...(data.email ? [`Email: ${data.email}`] : []),
            '',
            data.notes,
        ];
        send(form, data, subject, lines, ENQUIRY.quotes, note, () => {
            setEquip(EQUIPMENT[0].id);
            resetRoute();
            $('#ref').textContent = newRef();
        });
    });
}

// ---- Driver application -------------------------------------------------------------------

let position = DRIVERS.positions[0].id;

function refreshFit() {
    const box = $('#d-fit');
    const exp = DRIVERS.experience.find((x) => x.id === $('#d-exp').value);
    if (exp && exp.months < DRIVERS.minMonths) {
        box.className = 'estimate est-warn';
        box.innerHTML = `${icon('alert')}<p>We hire drivers with ${DRIVERS.minMonths} months of Class A experience or more. Send it anyway and we will keep it on file.</p>`;
        return;
    }
    box.className = 'estimate est-lane';
    box.innerHTML = position === 'owner'
        ? `<p class="est-line">${icon('check')}${esc(DRIVERS.ownerNote)}</p>`
        : `<p class="est-line">${icon('check')}${DRIVERS.centsPerMile}¢ a mile, ${esc(DRIVERS.homeTime.toLowerCase())}. A recruiter calls within one business day.</p>`;
}

function initDrive() {
    $('#d-position').innerHTML = DRIVERS.positions.map((p) => `
        <label class="pick"><input type="radio" name="position" value="${esc(p.id)}"${p.id === position ? ' checked' : ''}><span>${esc(p.label)}</span></label>`).join('');
    $('#d-position').addEventListener('change', (e) => { if (e.target.name === 'position') { position = e.target.value; refreshFit(); } });
    $('#d-exp').innerHTML = DRIVERS.experience.map((x) => `<option value="${esc(x.id)}">${esc(x.label)}</option>`).join('');
    $('#d-exp').value = (DRIVERS.experience.find((x) => x.months >= DRIVERS.minMonths) || DRIVERS.experience[0]).id;
    $('#d-exp').addEventListener('change', refreshFit);
    $('#d-endorse').innerHTML = DRIVERS.endorsements.map((x) => `
        <label class="chip"><input type="checkbox" name="endorse" value="${esc(x)}"><span>${esc(x)}</span></label>`).join('');
    const zip = $('#d-zip');
    zip.addEventListener('input', () => { zip.value = zip.value.replace(/\D/g, ''); });
    refreshFit();
    $('#d-note').textContent = ENQUIRY.endpoint
        ? 'Goes straight to our recruiter.'
        : `Opens your email app with the application to ${ENQUIRY.drivers || BUSINESS.email}.`;

    $('#panel-drive').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        if (!checkRequired(form, ['name', 'phone'], $('#d-note'), 'Add your name and a phone number so our recruiter can call you.')) return;
        const val = (n) => form.elements[n].value.trim();
        const exp = form.elements.experience;
        const data = {
            type: 'driver-application',
            position: DRIVERS.positions.find((p) => p.id === position).label,
            name: val('name'),
            phone: val('phone'),
            experience: exp.options[exp.selectedIndex].text,
            zip: val('zip'),
            endorsements: [...form.querySelectorAll('input[name="endorse"]:checked')].map((i) => i.value).join(', '),
        };
        const subject = `Driver application: ${data.name}, ${data.position}`;
        const lines = [
            `Position: ${data.position}`,
            `Name: ${data.name}`,
            `Phone: ${data.phone}`,
            `Class A experience: ${data.experience}`,
            `Home ZIP: ${data.zip || 'not given'}`,
            `Endorsements: ${data.endorsements || 'none'}`,
        ];
        send(form, data, subject, lines, ENQUIRY.drivers, $('#d-note'), () => {
            position = DRIVERS.positions[0].id;
            form.querySelector('input[name="position"]').checked = true;
            $('#d-exp').value = (DRIVERS.experience.find((x) => x.months >= DRIVERS.minMonths) || DRIVERS.experience[0]).id;
            refreshFit();
        });
    });
}

// ---- Sending -----------------------------------------------------------------------------

function checkRequired(form, names, note, message) {
    let bad = null;
    for (const n of names) {
        const el = form.elements[n];
        const empty = !el.value.trim();
        el.classList.toggle('invalid', empty);
        el.setAttribute('aria-invalid', String(empty));
        if (empty && !bad) bad = el;
    }
    if (!bad) return true;
    note.textContent = message;
    note.className = 'f-note miss';
    bad.focus();
    return false;
}

// The browser's own checks (email format, the date's min) for fields the
// form does not mark required. messages maps a field name to its message.
function checkValid(form, note, messages) {
    const bad = [...form.elements].find((el) => el.willValidate && !el.validity.valid);
    if (!bad) return true;
    bad.classList.add('invalid');
    bad.setAttribute('aria-invalid', 'true');
    bad.addEventListener('input', () => { bad.classList.remove('invalid'); bad.setAttribute('aria-invalid', 'false'); }, { once: true });
    note.textContent = messages[bad.name] || 'Check the highlighted field.';
    note.className = 'f-note miss';
    bad.focus();
    return false;
}

async function send(form, data, subject, lines, email, note, onSent) {
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
            onSent();
            note.className = 'f-note ok';
            note.textContent = `Thanks, ${data.name.split(' ')[0]}. We will call you shortly.`;
        } catch {
            note.className = 'f-note miss';
            note.textContent = `That did not send. Please call ${BUSINESS.phone} instead.`;
        } finally {
            btn.disabled = false;
        }
        return;
    }
    window.location.href = `mailto:${email || BUSINESS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    note.className = 'f-note ok';
    note.textContent = `Your email app should open with this filled in. If it does not, call ${BUSINESS.phone}.`;
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
initTabs();
renderStats();
renderEquipment();
renderLanes();
renderSteps();
renderDrivers();
renderSafety();
renderReviews();
renderFaq();
renderHours();
renderStatus();
initRate();
initDrive();
// Keep the office status and board clock current on a page left open.
setInterval(renderStatus, 30 * 1000);
