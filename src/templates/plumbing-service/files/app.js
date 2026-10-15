// Page content lives here as data so it is easy to find and change. Each block
// below is one thing the business owner has to make their own:
//
//   BUSINESS      who you are: name, phone, email, address, license, timezone.
//                 Fills every element with data-bind="<key>", and links with
//                 data-bind-href="tel|sms|mailto".
//   OFFER,
//   PRICES        what you charge: the service call, your promises and the
//                 flat-rate price list, by category.
//   FIRST_AID     what to do before the plumber arrives, per emergency.
//   ISSUES        the options in the booking form's "What is going on?" picker.
//   TOWNS, ZONES  where you work. The ZIP checks and trip fees read it.
//   JOBS, REVIEWS proof of work. Samples until SAMPLE_CONTENT is false.
//   HOURS,
//   AVAILABILITY  when you work. The open/closed status, the on-call line and
//                 the visit windows offered in the booking form all read it.
//   DRIP          the numbers behind the leaky faucet calculator.
//   ENQUIRY       where bookings go: an email address, or a form endpoint
//                 that accepts a JSON POST.
//
// SAMPLE_CONTENT marks the reviews, rating, stats, jobs and license as samples
// on the page. Set it to false once they are the business's own.

const SAMPLE_CONTENT = true;

const BUSINESS = {
    name: 'Kettle Creek Plumbing',
    shortName: 'Kettle Creek',
    trade: 'Plumbing & Drain',
    since: 2011,
    phone: '(555) 014-2290',
    email: 'hello@example.com',
    address: '27 Mill Race Lane, Millbrook',
    baseTown: 'Millbrook',
    region: 'the Millbrook valley',
    license: 'Master plumber license MP-30417',
    rating: 4.9,
    reviewCount: 286,
    ratingSource: 'Google',
    // The four numbers in the strip under the hero. Keep each label short.
    stats: [
        { value: '6,800+', label: 'jobs finished' },
        { value: '58 min', label: 'average emergency arrival' },
        { value: '90 days', label: 'clog-free guarantee' },
        { value: '2 yr', label: 'warranty on our work' },
    ],
    // Hours, visit windows and "open now" are worked out in this timezone,
    // whatever timezone the visitor is in.
    timezone: 'America/New_York',
};

// Opening hours for the office and routine visits, 24-hour clock. null is closed.
const HOURS = {
    Mon: [7, 18], Tue: [7, 18], Wed: [7, 18], Thu: [7, 18], Fri: [7, 18],
    Sat: [8, 13], Sun: null,
};

const AVAILABILITY = {
    // A visit can be requested for a window that starts at least this many
    // hours from now. Windows must fit inside HOURS for that day.
    leadHours: 2,
    windows: [
        { id: 'am', label: '8 to 10am', start: 8, end: 10 },
        { id: 'late-am', label: '10am to 12pm', start: 10, end: 12 },
        { id: 'pm', label: '1 to 3pm', start: 13, end: 15 },
        { id: 'late-pm', label: '3 to 5pm', start: 15, end: 17 },
    ],
    // Days with no routine visits (holidays, training days), as YYYY-MM-DD.
    closedDates: ['2026-11-26', '2026-12-25', '2027-01-01'],
    // Outside HOURS, a plumber on call answers the phone for these.
    onCall: { on: true, fee: 120, covers: 'burst pipes, flooding, sewer backups and no water' },
};

// The fees and promises that apply to every visit.
const OFFER = {
    serviceCall: 79,
    terms: [
        { title: 'Price first', body: 'You approve a flat price before any work starts. No hourly meter.' },
        { title: '$79 service call', body: 'Credited in full when you go ahead with the repair.' },
        { title: 'Clog-free for 90 days', body: 'If the same drain clogs again, we come back and clear it free.' },
        { title: 'Two-year warranty', body: 'On our labor and the parts we supply.' },
    ],
};

// The flat-rate price list, one tab per category. `from` is a starting
// price; `fixed` is the price; `free` is a free estimate. issue picks the
// matching option in the booking form.
const PRICES = [
    {
        id: 'drains', label: 'Drains & sewer', icon: 'drain',
        items: [
            { title: 'Sink, tub or shower clog', note: 'Cleared by cable from the nearest access point', from: 149, issue: 'clog' },
            { title: 'Toilet clog', note: 'Augered, and the wax seal checked', from: 129, issue: 'clog' },
            { title: 'Main sewer line clearing', note: 'From the cleanout, up to 100 ft', from: 289, issue: 'sewer' },
            { title: 'Sewer camera inspection', note: 'Video of the line and a written report', fixed: 199, issue: 'sewer' },
            { title: 'Hydro-jetting', note: 'For grease, scale and roots', from: 450, issue: 'sewer' },
        ],
    },
    {
        id: 'leaks', label: 'Leaks & pipes', icon: 'pipe',
        items: [
            { title: 'Leak detection', note: 'Acoustic and thermal, with no open walls', fixed: 179, issue: 'leak' },
            { title: 'Pipe repair', note: 'Copper, PEX or PVC, per section', from: 225, issue: 'leak' },
            { title: 'Shut-off valve replacement', note: 'Main or fixture valve', from: 185, issue: 'leak' },
            { title: 'Frozen pipe thaw', note: 'Thawed safely, then checked for splits', from: 199, issue: 'leak' },
            { title: 'Whole-house repipe', note: 'Written options after a walk-through', free: true, issue: 'install' },
        ],
    },
    {
        id: 'heaters', label: 'Water heaters', icon: 'heater',
        items: [
            { title: 'Water heater repair', note: 'Thermostat, element, valve or igniter', from: 165, issue: 'hot-water' },
            { title: 'Tank flush and check', note: 'Sediment flushed, anode and relief valve tested', fixed: 129, issue: 'hot-water' },
            { title: 'New tank water heater', note: '40 or 50 gal, installed and old one hauled away', from: 1650, issue: 'install' },
            { title: 'New tankless water heater', note: 'Gas or electric, sized to your home', from: 3400, issue: 'install' },
        ],
    },
    {
        id: 'fixtures', label: 'Fixtures', icon: 'tap',
        items: [
            { title: 'Running toilet repair', note: 'Flapper, fill valve or flush valve', from: 139, issue: 'toilet' },
            { title: 'Faucet install', note: 'Your faucet or ours, labor from', from: 165, issue: 'install' },
            { title: 'Toilet install', note: 'Old toilet removed, new seal and supply line', from: 245, issue: 'install' },
            { title: 'Garbage disposal install', note: 'Wired to an existing switch', from: 225, issue: 'install' },
            { title: 'Sump pump install', note: 'With a check valve and a test run', from: 695, issue: 'install' },
        ],
    },
];

// "Do this first": what to do before the plumber arrives. Keep the steps
// short and safe. call is the line under the steps.
const FIRST_AID = [
    {
        id: 'burst', label: 'Burst pipe or flooding', icon: 'pipe',
        steps: [
            'Turn off the main water shut-off. It is usually where the water line comes into the house, near the meter. Turn it clockwise until it stops.',
            'If water is near outlets, appliances or the electric panel, stay out of it. Switch that area off at the panel only if you can reach it while dry.',
            'Open the lowest faucet in the house to drain the pipes, and turn off the water heater.',
            'Move what you can off the wet floor and take photos for your insurer.',
        ],
        call: 'Then call us. Burst pipes are answered around the clock.',
    },
    {
        id: 'toilet', label: 'Toilet overflowing', icon: 'toilet',
        steps: [
            'Turn the small valve on the wall behind the toilet clockwise to stop the water.',
            'Lift the tank lid and raise the float to stop the tank refilling.',
            'Do not flush again. Try a flange plunger once the bowl level drops.',
            'If other drains gurgle or back up too, the main line is blocked. Stop using water everywhere.',
        ],
        call: 'Still overflowing, or backing up elsewhere? Call us.',
    },
    {
        id: 'sewer', label: 'Sewage backing up', icon: 'drain',
        steps: [
            'Stop running water, flushing toilets and using the washer or dishwasher, everywhere in the house.',
            'Keep children and pets away from the water. It carries bacteria.',
            'Do not pour chemical drain cleaner in. It will not clear a main line and makes the water caustic.',
            'If you know where the outdoor cleanout cap is, do not open it yourself.',
        ],
        call: 'Call us. We answer sewer backups around the clock.',
    },
    {
        id: 'hot-water', label: 'No hot water', icon: 'heater',
        steps: [
            'Electric heater: check its breaker in the panel. Reset it once only.',
            'Gas heater: check the pilot window. Relight it only by following the label on the tank.',
            'If the tank is leaking, turn the cold water valve on top of it clockwise and switch the heater off.',
            'If you smell gas, leave the house and call the gas company or 911 from outside.',
        ],
        call: 'Not back after that? Book a repair, usually the same day.',
    },
    {
        id: 'frozen', label: 'Frozen pipe', icon: 'snow',
        steps: [
            'Open the faucet the pipe feeds, so melting water has somewhere to go.',
            'Warm the pipe from the faucet end back with a hair dryer or a space heater kept at a safe distance.',
            'Never use an open flame or a heat gun.',
            'If the pipe has split, shut the main water off before it thaws.',
        ],
        call: 'Cannot reach it, or it has split? Call us.',
    },
];

// The options in the booking form's "What is going on?" picker. kind sets
// what the form says: repair (service call), install (free estimate),
// urgent (call now, with the first aid steps) or danger (gas).
const ISSUES = [
    { id: 'clog', label: 'Clogged drain', kind: 'repair' },
    { id: 'leak', label: 'Leak', kind: 'repair' },
    { id: 'hot-water', label: 'No hot water', kind: 'repair' },
    { id: 'toilet', label: 'Running toilet', kind: 'repair' },
    { id: 'sewer', label: 'Sewer backup', kind: 'urgent', aid: 'sewer' },
    { id: 'burst', label: 'Burst pipe', kind: 'urgent', aid: 'burst' },
    { id: 'install', label: 'New install', kind: 'install' },
    { id: 'gas', label: 'I smell gas', kind: 'danger' },
];

const ZONES = {
    1: { name: 'Standard area', tripFee: 0, sameDay: true },
    2: { name: 'Extended area', tripFee: 35, sameDay: false },
};

const TOWNS = [
    { name: 'Millbrook', zips: ['12545'], zone: 1, base: true },
    { name: 'Stanford Falls', zips: ['12581'], zone: 1 },
    { name: 'Clove Valley', zips: ['12540'], zone: 1 },
    { name: 'Salt Point', zips: ['12578'], zone: 1 },
    { name: 'Verbank', zips: ['12585'], zone: 1 },
    { name: 'Pleasant Valley', zips: ['12569'], zone: 1 },
    { name: 'Amenia', zips: ['12501'], zone: 2 },
    { name: 'Pine Plains', zips: ['12567'], zone: 2 },
    { name: 'Rhinebeck', zips: ['12572'], zone: 2 },
    { name: 'Dover Plains', zips: ['12522'], zone: 2 },
];

// Recent jobs, shown as work tickets. kind is the filter chip.
const JOBS = [
    {
        no: '2291', photo: 'photos/job-water-heater.jpg', kind: 'Water heaters',
        alt: 'A plumber tightening a fitting beside a water heater with two wrenches',
        title: 'Water heater replaced in a morning', place: 'Salt Point', when: 'Sep 2026',
        problem: '14-year-old tank leaking from the base onto a finished basement floor.',
        fix: '50 gal tank installed with a new expansion tank and shut-off valve. Hot water by noon.',
    },
    {
        no: '2264', photo: 'photos/job-repipe.jpg', kind: 'Pipes',
        alt: 'Blue PEX water lines and a valve run along basement ceiling joists',
        title: 'Galvanized lines swapped for PEX', place: 'Millbrook', when: 'Aug 2026',
        problem: 'Low pressure upstairs and rusty water from 1950s galvanized pipe.',
        fix: 'Supply lines rerun in PEX over two days, with a valve for every fixture.',
    },
    {
        no: '2237', photo: 'photos/job-sink.jpg', kind: 'Drains',
        alt: 'Supply valves and the drain trap under a kitchen sink',
        title: 'Kitchen drain that kept coming back', place: 'Clove Valley', when: 'Jul 2026',
        problem: 'Kitchen sink clogged for the third time in a year.',
        fix: 'Line cabled and camera-checked, then a sagging trap arm re-pitched so grease drains.',
    },
    {
        no: '2210', photo: 'photos/job-faucet.jpg', kind: 'Fixtures',
        alt: 'A chrome single-lever kitchen faucet over a stainless sink',
        title: 'Dripping faucet and stuck valves', place: 'Verbank', when: 'Jun 2026',
        problem: 'Kitchen faucet dripping and both shut-off valves seized.',
        fix: 'New faucet and quarter-turn valves fitted in under two hours.',
    },
];

const REVIEWS = [
    { name: 'Alicia M.', town: 'Millbrook', when: 'Sep 2026', text: 'Pipe burst under the kitchen at 11pm. They talked me through the shut-off on the phone and were here 50 minutes later. Price agreed before they started.' },
    { name: 'Greg T.', town: 'Salt Point', when: 'Aug 2026', text: 'Gave me a repair price and a replacement price for the water heater and let me decide. No pressure. Cleaned up better than they found it.' },
    { name: 'Nadia K.', town: 'Pleasant Valley', when: 'Jul 2026', text: 'Camera showed roots in the sewer line. They showed me the video, jetted it and the basement drain has been fine since.' },
    { name: 'Owen R.', town: 'Verbank', when: 'May 2026', text: 'Small job, a running toilet and a dripping tub, and they still came the same day. Fair price, on time, shoe covers on.' },
];
const RATED_FOR = 'upfront prices, fast emergency arrival and clean work';

const FAQ = [
    { q: 'How much is a service call?', a: 'The service call is $79 during opening hours, and it is credited in full when you go ahead with the repair. Homes in the extended area add a $35 trip fee, which the ZIP check shows.' },
    { q: 'Do you come out at night and on weekends?', a: 'Yes, for burst pipes, flooding, sewer backups and no water. Call the main number and the plumber on call answers. Visits outside opening hours add $120.' },
    { q: 'Where is my main water shut-off?', a: 'Usually where the water line enters the house: in the basement or crawl space on the front wall, near the water meter, or in a utility closet. In warm climates it can be outside by the foundation. We will show you on any visit.' },
    { q: 'Should I use chemical drain cleaner?', a: 'We would rather you did not. It rarely clears a real blockage, it can damage older pipes, and it makes the job unsafe for whoever opens the drain next. Try a plunger, then call us.' },
    { q: 'Repair or replace my water heater?', a: 'Most tank heaters last 8 to 12 years. Under that, a repair is usually the better buy. Past that, or when the tank itself leaks, we give you both prices and you decide.' },
    { q: 'I smell gas. What should I do?', a: 'Leave the house now, without switching lights or appliances on or off. From outside, call your gas company emergency line or 911. Once it is safe, we can find and repair the leak.' },
];

// The leaky faucet calculator. One drip is about a quarter of a milliliter
// (USGS), so a gallon is about 15,140 drips. ratePer1000 is what a gallon
// costs in this area, water and sewer together, per 1,000 gallons.
const DRIP = {
    dripsPerGallon: 15140,
    ratePer1000: 14.5,
    gallonsPerShower: 16,
    start: 30,
};

// Where bookings go. With endpoint set (a form service or your own backend
// that accepts a JSON POST), the form sends there and shows a confirmation.
// Without it, the form opens an email to `email`, or BUSINESS.email.
const ENQUIRY = {
    email: '',
    endpoint: '',
};

const ICONS = {
    drain: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/>',
    pipe: '<path d="M3 7h9a5 5 0 0 1 5 5v9"/><path d="M3 12h7a2 2 0 0 1 2 2v7"/><path d="M3 5v9M15 21h6"/>',
    heater: '<rect x="6" y="3" width="12" height="16" rx="3"/><path d="M9 21v-2M15 21v-2M12 8c1.5 1.6 2.5 2.7 2.5 4.2a2.5 2.5 0 0 1-5 0C9.5 10.7 10.5 9.6 12 8z"/>',
    tap: '<path d="M4 9h9a4 4 0 0 1 4 4v1"/><path d="M8 9V5M5 5h6"/><path d="M17 18c.9 1.2 1.5 2 1.5 2.8a1.5 1.5 0 0 1-3 0c0-.8.6-1.6 1.5-2.8z"/>',
    toilet: '<path d="M6 3h7v7H6z"/><path d="M4 10h14a7 7 0 0 1-7 7h-1a6 6 0 0 1-6-6z"/><path d="M8 17l-1 4h8l-1-4"/>',
    snow: '<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11"/><path d="M9 3.5 12 6l3-2.5M9 20.5l3-2.5 3 2.5"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    valve: '<circle cx="12" cy="8" r="5"/><path d="M12 3v10M7 8h10M3 17h18M6 17v4M18 17v4"/>',
};

// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const money = (n) => `$${n.toLocaleString('en-US', n % 1 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : {})}`;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };

const townForZip = (zip) => TOWNS.find((t) => t.zips.includes(zip));
const issueById = (id) => ISSUES.find((i) => i.id === id);
const aidById = (id) => FIRST_AID.find((a) => a.id === id);
const zoneOf = (town) => (town && ZONES[town.zone]) || ZONES[1];

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
const hoursOn = (d) => (AVAILABILITY.closedDates.includes(isoDate(d)) ? null : HOURS[DAYS[d.getDay()]]);
const hourOf = (d) => d.getHours() + d.getMinutes() / 60;

function dayLabel(d, now) {
    const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 864e5);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Whether the office is open now, and when it next opens.
function openState() {
    const now = bizNow();
    const today = hoursOn(now);
    const h = hourOf(now);
    if (today && h >= today[0] && h < today[1]) return { open: true, until: today[1] };
    for (let i = 0; i < 14; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        const hrs = hoursOn(d);
        if (hrs && (i > 0 || h < hrs[0])) return { open: false, day: i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY_NAMES[DAYS[d.getDay()]], at: hrs[0] };
    }
    return { open: false };
}

// The next visit windows that fit inside opening hours and start at least
// leadHours from now. Extended-area homes start from tomorrow.
function nextWindows(count, { sameDay = true } = {}) {
    const now = bizNow();
    const earliest = hourOf(now) + AVAILABILITY.leadHours;
    const out = [];
    for (let i = sameDay ? 0 : 1; i < 21 && out.length < count; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        const hrs = hoursOn(d);
        if (!hrs) continue;
        for (const w of AVAILABILITY.windows) {
            if (w.start < hrs[0] || w.end > hrs[1]) continue;
            if (i === 0 && w.start < earliest) continue;
            out.push({
                id: `${isoDate(d)}-${w.id}`, day: dayLabel(d, now), label: w.label,
                // The absolute date, for the booking itself: "Today" means
                // nothing once the email is read the next morning.
                date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
            });
            if (out.length === count) break;
        }
    }
    return out;
}

const windowText = (w) => `${w.day}, ${w.label}`;

// ---- Business details ------------------------------------------------------------

// The number for tel: and sms: links, from the displayed one. Ten digits
// without a country code are read as a US number.
function phoneLink(phone) {
    const digits = String(phone).replace(/\D/g, '');
    if (String(phone).trim().startsWith('+')) return `+${digits}`;
    return digits.length === 10 ? `+1${digits}` : digits;
}

const telLink = () => `<a href="tel:${esc(phoneLink(BUSINESS.phone))}">${esc(BUSINESS.phone)}</a>`;

function bindBusiness() {
    const values = {
        ...BUSINESS,
        rating: BUSINESS.rating.toFixed(1),
        reviewCount: BUSINESS.reviewCount.toLocaleString('en-US'),
        serviceCall: money(OFFER.serviceCall),
        years: new Date().getFullYear() - BUSINESS.since,
        nearbyCount: TOWNS.filter((t) => !t.base).length,
        ratedFor: RATED_FOR,
    };
    document.querySelectorAll('[data-bind]').forEach((el) => {
        const v = values[el.dataset.bind];
        if (v !== undefined) el.textContent = v;
    });
    const dial = phoneLink(BUSINESS.phone);
    const hrefs = { tel: `tel:${dial}`, sms: `sms:${dial}`, mailto: `mailto:${BUSINESS.email}` };
    document.querySelectorAll('[data-bind-href]').forEach((el) => { el.href = hrefs[el.dataset.bindHref]; });
    $('#year').textContent = new Date().getFullYear();

    // The sample price ticket in the hero quotes the first item of the price list.
    const first = PRICES[0].items[0];
    $('#ft-job').textContent = first.title;
    $('#ft-price').textContent = priceText(first).big;

    $('#stats').innerHTML = BUSINESS.stats.map((s) => `<li><b>${esc(s.value)}</b><span>${esc(s.label)}</span></li>`).join('');
}

// ---- Availability ----------------------------------------------------------------

function renderStatus() {
    const s = openState();
    const line = s.open
        ? `Open now until ${fmtHour(s.until)}`
        : `Office closed${s.day ? `, opens ${s.day} at ${fmtHour(s.at)}` : ''}`;
    document.querySelectorAll('[data-status]').forEach((el) => {
        el.textContent = line;
        el.closest('.status')?.classList.toggle('is-open', s.open);
    });
    const oc = AVAILABILITY.onCall;
    document.querySelectorAll('[data-oncall]').forEach((el) => {
        el.hidden = !oc.on;
        el.textContent = s.open ? 'Emergency line 24/7' : 'Plumber on call now';
    });
}

function renderHours() {
    const today = DAYS[bizNow().getDay()];
    $('#hours-list').innerHTML = Object.entries(HOURS).map(([d, h]) => `
        <li${d === today ? ' class="today"' : ''}><span>${DAY_NAMES[d]}</span><b>${h ? `${fmtHour(h[0])} to ${fmtHour(h[1])}` : 'Closed'}</b></li>`).join('');
    $('#foot-hours').innerHTML = Object.entries(HOURS).map(([d, h]) => `<li>${d}: ${h ? `${fmtHour(h[0])} to ${fmtHour(h[1])}` : 'Closed'}</li>`).join('');

    const oc = AVAILABILITY.onCall;
    const note = $('#oncall-note');
    note.hidden = !oc.on;
    if (oc.on) note.innerHTML = `${icon('phone')}<span>Outside these hours, call ${telLink()} for ${esc(oc.covers)}. A plumber on call answers. Visits outside opening hours add ${money(oc.fee)}.</span>`;
}

// ---- First aid --------------------------------------------------------------------

function renderAid(id) {
    const a = aidById(id) || FIRST_AID[0];
    document.querySelectorAll('#aid-tabs [role="tab"]').forEach((t) => {
        const on = t.dataset.aid === a.id;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
    });
    $('#aid-panel').setAttribute('aria-labelledby', `aid-tab-${a.id}`);
    $('#aid-title').textContent = a.label;
    $('#aid-steps').innerHTML = a.steps.map((s) => `<li><span>${esc(s)}</span></li>`).join('');
    $('#aid-call').textContent = a.call;
}

function initAid() {
    const tabs = $('#aid-tabs');
    tabs.innerHTML = FIRST_AID.map((a, i) => `
        <button type="button" role="tab" id="aid-tab-${esc(a.id)}" aria-controls="aid-panel" data-aid="${esc(a.id)}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${icon(a.icon)}<span>${esc(a.label)}</span></button>`).join('');
    tabs.addEventListener('click', (e) => {
        const b = e.target.closest('[data-aid]');
        if (b) renderAid(b.dataset.aid);
    });
    // Arrow keys move between tabs, as in any tab list.
    tabs.addEventListener('keydown', (e) => {
        const list = [...tabs.querySelectorAll('[role="tab"]')];
        const i = list.indexOf(document.activeElement);
        if (i < 0) return;
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const next = list[(i + step + list.length) % list.length];
        renderAid(next.dataset.aid);
        next.focus();
    });
    renderAid(FIRST_AID[0].id);
}

// ---- Prices -------------------------------------------------------------------------

function priceText(it) {
    if (it.free) return { small: '', big: 'Free estimate' };
    if (it.fixed != null) return { small: '', big: money(it.fixed) };
    return { small: 'from', big: money(it.from) };
}

function renderPrices(id) {
    const cat = PRICES.find((c) => c.id === id) || PRICES[0];
    document.querySelectorAll('#price-tabs [role="tab"]').forEach((t) => {
        const on = t.dataset.cat === cat.id;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
    });
    $('#price-panel').setAttribute('aria-labelledby', `price-tab-${cat.id}`);
    $('#price-list').innerHTML = cat.items.map((it) => {
        const p = priceText(it);
        return `
        <li>
            <div class="pl-name"><b>${esc(it.title)}</b><small>${esc(it.note)}</small></div>
            <span class="pl-dots" aria-hidden="true"></span>
            <div class="pl-price">${p.small ? `<small>${p.small}</small>` : ''}<b>${esc(p.big)}</b></div>
            <a class="pl-book" href="#book" data-issue="${esc(it.issue)}" data-job="${esc(it.title)}" aria-label="Book: ${esc(it.title)}">${icon('arrow')}</a>
        </li>`;
    }).join('');
}

function initPrices() {
    const tabs = $('#price-tabs');
    tabs.innerHTML = PRICES.map((c, i) => `
        <button type="button" role="tab" id="price-tab-${esc(c.id)}" aria-controls="price-panel" data-cat="${esc(c.id)}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${icon(c.icon)}<span>${esc(c.label)}</span></button>`).join('');
    tabs.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cat]');
        if (b) renderPrices(b.dataset.cat);
    });
    tabs.addEventListener('keydown', (e) => {
        const list = [...tabs.querySelectorAll('[role="tab"]')];
        const i = list.indexOf(document.activeElement);
        const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
        if (i < 0 || !step) return;
        e.preventDefault();
        const next = list[(i + step + list.length) % list.length];
        renderPrices(next.dataset.cat);
        next.focus();
    });
    renderPrices(PRICES[0].id);

    $('#terms').innerHTML = OFFER.terms.map((t) => `<li>${icon('check')}<div><b>${esc(t.title)}</b><span>${esc(t.body)}</span></div></li>`).join('');
    $('#foot-services').innerHTML = PRICES.map((c) => `<li><a href="#prices" data-cat-link="${esc(c.id)}">${esc(c.label)}</a></li>`).join('');
    document.addEventListener('click', (e) => {
        const a = e.target.closest('[data-cat-link]');
        if (a) renderPrices(a.dataset.catLink);
    });
}

// ---- Drip calculator ------------------------------------------------------------------

function initDrip() {
    const range = $('#drip-rate');
    const drop = $('#drip-drop');
    const ripple = $('#drip-ripple');
    range.value = DRIP.start;
    const update = () => {
        const perMin = Number(range.value);
        const gallons = (perMin * 60 * 24 * 365) / DRIP.dripsPerGallon;
        const cost = (gallons / 1000) * DRIP.ratePer1000;
        $('#drip-out-rate').textContent = `${perMin} drip${perMin === 1 ? '' : 's'} a minute`;
        $('#drip-gal').textContent = Math.round(gallons).toLocaleString('en-US');
        $('#drip-cost').textContent = money(Math.round(cost));
        $('#drip-showers').textContent = Math.round(gallons / DRIP.gallonsPerShower).toLocaleString('en-US');
        range.setAttribute('aria-valuetext', `${perMin} drips a minute, about ${Math.round(gallons)} gallons a year`);
        // The drop in the drawing falls at the chosen rate (capped so it stays visible).
        const every = `${Math.max(0.35, 60 / perMin).toFixed(2)}s`;
        drop.style.animationDuration = every;
        ripple.style.animationDuration = every;
        range.style.setProperty('--fill', `${((perMin - range.min) / (range.max - range.min)) * 100}%`);
    };
    range.addEventListener('input', update);
    $('#drip-rate-note').textContent = `At ${money(DRIP.ratePer1000)} per 1,000 gallons for water and sewer. One drip is about 1/4 ml.`;
    update();
}

// ---- Jobs and reviews -----------------------------------------------------------------

function renderJobs(filter = 'All') {
    $('#jobs').innerHTML = JOBS.filter((j) => filter === 'All' || j.kind === filter).map((j) => `
        <article class="ticket">
            <div class="ticket-photo"><img src="${esc(j.photo)}" alt="${esc(j.alt)}" loading="lazy"></div>
            <div class="ticket-body">
                <p class="ticket-head"><span>Job #${esc(j.no)}</span><span>${esc(j.kind)}</span></p>
                <h3>${esc(j.title)}</h3>
                <p class="ticket-meta">${icon('pin')}${esc(j.place)} · ${esc(j.when)}</p>
                <dl>
                    <div><dt>Found</dt><dd>${esc(j.problem)}</dd></div>
                    <div><dt>Fixed</dt><dd>${esc(j.fix)}</dd></div>
                </dl>
            </div>
        </article>`).join('');
}

function initJobs() {
    const kinds = ['All', ...new Set(JOBS.map((j) => j.kind))];
    const root = $('#job-filter');
    root.innerHTML = kinds.map((k, i) => `<button type="button" class="chip" aria-pressed="${i === 0}" data-kind="${esc(k)}">${k === 'All' ? 'All jobs' : esc(k)}</button>`).join('');
    root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-kind]');
        if (!b) return;
        root.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
        renderJobs(b.dataset.kind);
    });
    renderJobs();
}

function renderReviews() {
    $('#review-list').innerHTML = REVIEWS.map((r) => `
        <figure class="review">
            <span class="stars" aria-label="5 out of 5 stars">★★★★★</span>
            <blockquote>${esc(r.text)}</blockquote>
            <figcaption><i aria-hidden="true">${esc(r.name.charAt(0))}</i><span><b>${esc(r.name)}</b><small>${esc(r.town)} · ${esc(r.when)}</small></span></figcaption>
        </figure>`).join('');
}

function renderFaq() {
    $('#faq-list').innerHTML = FAQ.map((f) => `
        <details>
            <summary>${esc(f.q)}<span aria-hidden="true"></span></summary>
            <p>${esc(f.a)}</p>
        </details>`).join('');
}

// ---- Service area ---------------------------------------------------------------------

function renderArea() {
    const zoneIds = Object.keys(ZONES).map(Number).sort();
    $('#towns').innerHTML = zoneIds.map((z) => `
        <div class="zone zone-${z}">
            <p class="zone-head"><i></i><b>${esc(ZONES[z].name)}</b><span>${ZONES[z].tripFee ? `${money(ZONES[z].tripFee)} trip fee, next-day visits` : 'No trip fee, same-day visits'}</span></p>
            <ul>${TOWNS.filter((t) => t.zone === z).map((t) => `<li${t.base ? ' class="base"' : ''}>${esc(t.name)}</li>`).join('')}</ul>
        </div>`).join('');
    $('#foot-towns').textContent = TOWNS.map((t) => t.name).join(', ');

    const zc = $('#zc-zip');
    zc.addEventListener('input', () => { zc.value = zc.value.replace(/\D/g, ''); });
    $('#zip-check').addEventListener('submit', (e) => {
        e.preventDefault();
        const zip = zc.value.trim();
        const out = $('#zip-out');
        const town = townForZip(zip);
        out.className = 'zip-out';
        if (!/^\d{5}$/.test(zip)) {
            out.textContent = 'Enter a 5-digit ZIP code.';
        } else if (town) {
            const zone = zoneOf(town);
            const first = nextWindows(1, { sameDay: zone.sameDay })[0];
            out.classList.add('ok');
            out.textContent = `Yes, ${town.name} is in our ${zone.name.toLowerCase()}${zone.tripFee ? ` (${money(zone.tripFee)} trip fee)` : ', with no trip fee'}.${first ? ` First visit window: ${windowText(first)}.` : ''}`;
        } else {
            out.classList.add('miss');
            out.textContent = `${zip} is outside our usual area. Send a booking anyway and we will tell you if we can come.`;
        }
    });
}

// ---- Booking form ---------------------------------------------------------------------------

let issue = ISSUES[0].id;

function initIssues() {
    $('#f-issues').innerHTML = ISSUES.map((i) => `
        <label class="issue issue-${esc(i.kind)}">
            <input type="radio" name="issue" value="${esc(i.id)}"${i.id === issue ? ' checked' : ''}>
            <span>${esc(i.label)}</span>
        </label>`).join('');
    $('#f-issues').addEventListener('change', (e) => {
        if (e.target.name !== 'issue') return;
        issue = e.target.value;
        refreshBooking();
    });
}

function setIssue(id) {
    const input = document.querySelector(`#f-issues input[value="${id}"]`);
    if (!input) return;
    input.checked = true;
    issue = id;
    refreshBooking();
}

function fillWindowOptions() {
    const sel = $('#f-window');
    const keep = sel.value;
    const zone = zoneOf(townForZip($('#f-zip').value.trim()));
    sel.innerHTML = nextWindows(8, { sameDay: zone.sameDay }).map((w) => `<option value="${esc(w.id)}" data-full="${esc(`${w.date}, ${w.label} (${BUSINESS.timezone})`)}">${esc(windowText(w))}</option>`).join('') +
        '<option value="any">First available</option>';
    if ([...sel.options].some((o) => o.value === keep)) sel.value = keep;
}

// The box above the send button: what this visit costs and when it can
// happen, for the chosen problem and ZIP. An emergency puts the phone number
// and the first steps first; a gas smell replaces the send button with
// safety steps.
function refreshBooking() {
    const it = issueById(issue);
    const box = $('#f-terms');
    const form = $('#book-form');
    form.classList.toggle('is-danger', it.kind === 'danger');
    if (it.kind === 'danger') {
        box.className = 'f-terms f-danger';
        box.innerHTML = `${icon('alert')}<div><b>Leave the house now.</b> Do not switch lights or appliances on or off. From outside, call your gas company's emergency line or 911. Once it is safe, call us to find the leak.</div>`;
        return;
    }
    const zip = $('#f-zip').value.trim();
    const town = /^\d{5}$/.test(zip) ? townForZip(zip) : null;
    const zone = zoneOf(town);
    const lines = [];
    if (it.kind === 'repair' || it.kind === 'urgent') lines.push(`${money(OFFER.serviceCall)} service call, credited when you go ahead with the repair`);
    if (it.kind === 'install') lines.push('Free estimate with written options');
    if (town && zone.tripFee) lines.push(`${money(zone.tripFee)} trip fee for ${esc(town.name)}`);
    let where = '';
    if (/^\d{5}$/.test(zip)) {
        where = town
            ? `<p class="f-ok">${icon('check')}We cover ${esc(town.name)}</p>`
            : `<p class="f-miss">${icon('pin')}<span>${esc(zip)} is outside our usual area. Send it anyway and we will tell you if we can come.</span></p>`;
    }
    let urgent = '';
    if (it.kind === 'urgent') {
        const aid = aidById(it.aid);
        const fee = !openState().open && AVAILABILITY.onCall.on
            ? `<span>A plumber on call answers now. Visits outside opening hours add ${money(AVAILABILITY.onCall.fee)}.</span>`
            : '';
        urgent = `<div class="f-urgent">${icon('phone')}<div><b>Do not wait for a reply: call ${telLink()}.</b>${aid ? `<span>First: ${esc(aid.steps[0])}</span>` : ''}${fee}</div></div>`;
    } else if (!openState().open && AVAILABILITY.onCall.on && it.kind === 'repair') {
        urgent = `<p class="f-after">${icon('clock')}<span>Water going where it should not? Call ${telLink()} now. Visits outside opening hours add ${money(AVAILABILITY.onCall.fee)}.</span></p>`;
    }
    box.className = 'f-terms';
    box.innerHTML = `${urgent}${where}<ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul>`;
}

function initBooking() {
    initIssues();
    fillWindowOptions();
    const zip = $('#f-zip');
    zip.addEventListener('input', () => {
        zip.value = zip.value.replace(/\D/g, '');
        if (zip.value.length === 5 || !zip.value) fillWindowOptions();
        refreshBooking();
    });
    refreshBooking();
    $('#f-dest').textContent = ENQUIRY.endpoint
        ? 'Sent straight to our office. We call back within the hour during opening hours.'
        : `Opens your email app with the booking to ${ENQUIRY.email || BUSINESS.email}.`;

    // Any link to #book that names a problem or a job fills the form.
    document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href="#book"][data-issue]');
        if (!a) return;
        setIssue(a.dataset.issue);
        if (a.dataset.job) $('#f-msg').value = `${a.dataset.job}. `;
        setTimeout(() => $('#f-name').focus({ preventScroll: true }), 500);
    });

    $('#book-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        if (issueById(issue).kind === 'danger') return;
        const val = (n) => form.elements[n].value.trim();
        let bad = null;
        for (const n of ['name', 'phone']) {
            const el = form.elements[n];
            const empty = !el.value.trim();
            el.classList.toggle('invalid', empty);
            el.setAttribute('aria-invalid', String(empty));
            if (empty && !bad) bad = el;
        }
        const note = $('#f-note');
        if (bad) {
            note.textContent = 'Add your name and a phone number so we can confirm the visit.';
            note.className = 'f-note miss';
            bad.focus();
            return;
        }
        const town = townForZip(val('zip'));
        const win = form.elements.window;
        const data = {
            name: val('name'),
            phone: val('phone'),
            email: val('email'),
            zip: val('zip'),
            town: town ? town.name : '',
            issue: issueById(issue).label,
            window: win.options[win.selectedIndex].dataset.full || win.options[win.selectedIndex].text,
            message: val('message'),
        };
        const subject = `Booking: ${data.issue}${data.zip ? `, ${data.zip}` : ''}`;

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
                setIssue(ISSUES[0].id);
                fillWindowOptions();
                note.className = 'f-note ok';
                note.textContent = `Thanks, ${data.name.split(' ')[0]}. We will call you to confirm the visit.`;
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
            `Phone: ${data.phone}`,
            ...(data.email ? [`Email: ${data.email}`] : []),
            `ZIP: ${data.zip || 'not given'}${data.town ? ` (${data.town})` : ''}`,
            `Problem: ${data.issue}`,
            `Preferred window: ${data.window}`,
            '',
            data.message,
        ];
        window.location.href = `mailto:${ENQUIRY.email || BUSINESS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
        note.className = 'f-note ok';
        note.textContent = `Your email app should open with the booking filled in. If it does not, call ${BUSINESS.phone}.`;
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
renderStatus();
initNav();
initAid();
initPrices();
initDrip();
initJobs();
renderReviews();
renderArea();
renderHours();
renderFaq();
initBooking();
// Keep "open now" and the visit windows current on a page left open.
setInterval(() => { renderStatus(); renderHours(); fillWindowOptions(); refreshBooking(); }, 5 * 60 * 1000);
