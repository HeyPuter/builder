// Page content lives here as data so it is easy to find and change. Each block
// below is one thing the business owner has to make their own:
//
//   BUSINESS      who you are: name, phone, email, address, license, timezone.
//                 Fills every element with data-bind="<key>", and links with
//                 data-bind-href="tel|sms|mailto".
//   SERVICES,
//   OFFER, PLAN   what you do and on what terms: prices, fees, warranty and
//                 the maintenance plan.
//   TOWNS, ZONES  where you work. The ZIP checks, the map and trip fees read it.
//   JOBS, REVIEWS proof of work. Samples until SAMPLE_CONTENT is false.
//   HOURS,
//   AVAILABILITY  when you work. The open/closed status, the emergency line and
//                 the visit windows offered on the page all read it.
//   ENQUIRY       where requests go: an email address, or a form endpoint
//                 that accepts a JSON POST.
//
// SAMPLE_CONTENT marks the reviews, rating, jobs and license as samples on the
// page. Set it to false once they are the business's own.

const SAMPLE_CONTENT = true;

const BUSINESS = {
    name: 'Northpoint Heating & Air',
    shortName: 'Northpoint',
    trade: 'Heating & Air',
    since: 2009,
    phone: '(555) 018-4470',
    email: 'service@example.com',
    address: '412 Foundry Road, Cedar Falls',
    baseTown: 'Cedar Falls',
    region: 'the Cedar Valley',
    license: 'State mechanical contractor license MC-58210',
    // Shown as round badges under the hero. Keep each to a few words.
    badges: [
        { top: 'NATE', bottom: 'Certified techs' },
        { top: 'EPA', bottom: 'Section 608' },
        { top: 'A+', bottom: 'BBB rating' },
        { top: '10 yr', bottom: 'Parts warranty' },
    ],
    brands: ['Carrier', 'Trane', 'Lennox', 'Goodman', 'Rheem', 'Mitsubishi'],
    rating: 4.9,
    reviewCount: 412,
    ratingSource: 'Google',
    // Hours, visit windows and "open now" are worked out in this timezone,
    // whatever timezone the visitor is in.
    timezone: 'America/Chicago',
};

// Opening hours for the office and routine visits, 24-hour clock. null is closed.
const HOURS = {
    Mon: [7, 19], Tue: [7, 19], Wed: [7, 19], Thu: [7, 19], Fri: [7, 19],
    Sat: [8, 14], Sun: null,
};

const AVAILABILITY = {
    // A visit can be requested for a window that starts at least this many
    // hours from now. Windows must fit inside HOURS for that day.
    leadHours: 2,
    windows: [
        { id: 'am', label: '8 to 11am', start: 8, end: 11 },
        { id: 'mid', label: '11am to 2pm', start: 11, end: 14 },
        { id: 'pm', label: '2 to 5pm', start: 14, end: 17 },
    ],
    // Days with no routine visits (holidays, training days), as YYYY-MM-DD.
    closedDates: ['2026-11-26', '2026-12-24', '2026-12-25', '2027-01-01'],
    // Outside HOURS, a technician on call answers the phone for these issues.
    emergency: { on: true, fee: 95, covers: 'no heat, no cooling and water leaks' },
};

// The fees and promises that apply to every visit.
const OFFER = {
    diagnosticFee: 89,
    tuneUpPrice: 119,
    terms: [
        'A flat price after the diagnosis, before any work starts',
        'The $89 diagnostic is waived when you go ahead with the repair',
        'Every repair covered for a year, parts and labor',
        'Free written estimates on new systems, with two or three options',
    ],
};

const PLAN = {
    name: 'Comfort Club',
    monthly: 15,
    yearly: 169,
    points: ['Spring AC and fall furnace tune-up', '15% off every repair', 'No diagnostic or after-hours fee', 'First slot when the weather turns'],
    terms: 'Per home, one heating and one cooling system. Cancel any time.',
};

// The two big service cards, and the three rows under each. price is one of
// diag (OFFER.diagnosticFee), tuneup (OFFER.tuneUpPrice) or estimate (free).
// issue picks the matching "What is going on?" option in the form.
const SERVICES = [
    {
        id: 'cooling', title: 'Air conditioning', icon: 'snow',
        photo: 'photos/condenser-check.jpg', alt: 'An outdoor air conditioning unit beside a brick house',
        items: [
            { title: 'AC repair', price: 'diag', issue: 'no-cool' },
            { title: 'AC replacement', price: 'estimate', issue: 'replace' },
            { title: 'AC maintenance', price: 'tuneup', issue: 'tuneup' },
        ],
    },
    {
        id: 'heating', title: 'Heating', icon: 'flame',
        photo: 'photos/winter-house.jpg', alt: 'A brick and siding house with snow on the shrubs and lawn',
        items: [
            { title: 'Furnace and heat pump repair', price: 'diag', issue: 'no-heat' },
            { title: 'Furnace replacement', price: 'estimate', issue: 'replace' },
            { title: 'Heating maintenance', price: 'tuneup', issue: 'tuneup' },
        ],
    },
];
const ALSO = ['Heat pumps', 'Ductless mini-splits', 'Duct sealing', 'Humidifiers', 'Air cleaners', 'Smart thermostats'];

// The options in the request form's "What is going on?" picker. kind sets
// the price terms shown: repair (diagnostic fee), tuneup, estimate or danger.
const ISSUES = [
    { id: 'no-cool', label: 'No cooling', kind: 'repair', urgent: true },
    { id: 'no-heat', label: 'No heat', kind: 'repair', urgent: true },
    { id: 'leak', label: 'Water leak', kind: 'repair', urgent: true },
    { id: 'noise', label: 'Noise or smell', kind: 'repair' },
    { id: 'tuneup', label: 'Tune-up', kind: 'tuneup' },
    { id: 'replace', label: 'New system', kind: 'estimate' },
    { id: 'gas', label: 'I smell gas', kind: 'danger' },
];

const ZONES = {
    1: { name: 'Standard area', tripFee: 0, sameDay: true },
    2: { name: 'Extended area', tripFee: 39, sameDay: false },
};

// x and y place each town on the map (a 520 × 440 drawing, centered on the shop).
const TOWNS = [
    { name: 'Cedar Falls', zips: ['50613', '50614'], zone: 1, x: 260, y: 220, base: true },
    { name: 'Waverly Park', zips: ['50677'], zone: 1, x: 318, y: 152 },
    { name: 'Hudson', zips: ['50643'], zone: 1, x: 214, y: 290 },
    { name: 'Janesville', zips: ['50647'], zone: 1, x: 188, y: 168 },
    { name: 'Evansdale', zips: ['50707'], zone: 1, x: 340, y: 262 },
    { name: 'Raymond', zips: ['50667'], zone: 1, x: 300, y: 310 },
    { name: 'Dike', zips: ['50624'], zone: 2, x: 104, y: 214 },
    { name: 'Denver', zips: ['50622'], zone: 2, x: 360, y: 74 },
    { name: 'La Porte City', zips: ['50651'], zone: 2, x: 392, y: 368 },
    { name: 'Reinbeck', zips: ['50669'], zone: 2, x: 120, y: 340 },
    { name: 'Dunkerton', zips: ['50626'], zone: 2, x: 446, y: 186 },
    { name: 'New Hartford', zips: ['50660'], zone: 2, x: 150, y: 86 },
];

const JOBS = [
    {
        photo: 'photos/job-heat-pump.jpg', kind: 'Install',
        alt: 'A new outdoor heat pump unit on a paved patio beside a house',
        title: 'Old furnace swapped for a heat pump', place: 'Waverly Park', when: 'Sep 2026',
        problem: '24-year-old furnace and a failing AC in a 1,900 sq ft house.',
        fix: '3-ton variable-speed heat pump with gas backup, installed in one day.',
    },
    {
        photo: 'photos/job-control-board.jpg', kind: 'Repair',
        alt: 'Technician in safety glasses wiring a control',
        title: 'Furnace shutting off at night', place: 'Hudson', when: 'Jan 2026',
        problem: 'Furnace locked out three times a night in a cold snap.',
        fix: 'Failed control board replaced and flame sensor cleaned. Heat back that afternoon.',
    },
    {
        photo: 'photos/job-ductwork.jpg', kind: 'Install',
        alt: 'Technician running wiring through the open wall framing of a basement',
        title: 'Heat and air for a finished basement', place: 'Cedar Falls', when: 'Mar 2026',
        problem: 'Three new basement rooms with no heating or cooling.',
        fix: 'Two duct runs and a return added, and a second thermostat zone wired in.',
    },
    {
        photo: 'photos/job-thermostat.jpg', kind: 'Maintenance',
        alt: 'A finger setting a touchscreen thermostat on a wall',
        title: 'Fall tune-up and thermostat', place: 'Janesville', when: 'Oct 2026',
        problem: 'One floor always colder than the other.',
        fix: 'Furnace tuned, dampers balanced and a smart thermostat set up.',
    },
];

const REVIEWS = [
    { name: 'Dana W.', town: 'Hudson', when: 'Aug 2026', text: 'Called at 9, technician here by 1. He showed me the burnt capacitor, told me the price before touching anything, and the diagnostic fee came off the bill.' },
    { name: 'Marcus L.', town: 'Waverly Park', when: 'Sep 2026', text: 'Three written options with the running costs for each, no upsell. The crew had the old furnace out and the heat pump running by 4pm.' },
    { name: 'Priya S.', town: 'Cedar Falls', when: 'Jan 2026', text: 'They remind me about the tune-ups so I do not have to. When the furnace quit in January we were seen the same morning.' },
    { name: 'Tom R.', town: 'Evansdale', when: 'Jul 2026', text: 'Same tech both visits, boots covered, cleaned up after. Our upstairs is finally as cool as the downstairs.' },
];
const RATED_FOR = 'upfront prices, same-day repairs and tidy technicians';

const FAQ = [
    { q: 'How much is a service call?', a: 'The diagnostic visit is $89 during opening hours, and it is waived when you go ahead with the repair. Homes in the extended area add a trip fee, which the ZIP check shows.' },
    { q: 'Do you come out at night or on weekends?', a: 'Yes, for no heat, no cooling and water leaks. Call the main number outside opening hours and the technician on call answers. After-hours visits add $95, or nothing for Comfort Club members.' },
    { q: 'Should I repair or replace my system?', a: 'If the system is under 10 years old, repair is usually the better buy. Past 15 years, or when a repair costs more than a third of a new system, we show you both prices and let you decide.' },
    { q: 'Which brands do you work on?', a: 'All the major brands of furnaces, air conditioners, heat pumps and mini-splits. We install Carrier and Mitsubishi.' },
    { q: 'Do you offer financing?', a: 'Yes, on new systems, with monthly payments subject to credit approval. Ask for the terms at your estimate.' },
    { q: 'How often should I change my filter?', a: 'Every 1 to 3 months for a standard 1-inch filter, more often with pets. Thick 4-inch media filters last 6 to 12 months.' },
];

// Where requests go. With endpoint set (a form service or your own backend
// that accepts a JSON POST), the form sends there and shows a confirmation.
// Without it, the form opens an email to `email`, or BUSINESS.email.
const ENQUIRY = {
    email: '',
    endpoint: '',
};

const ICONS = {
    snow: '<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11"/><path d="M9 3.5 12 6l3-2.5M9 20.5l3-2.5 3 2.5"/>',
    flame: '<path d="M12 22c4 0 7-2.8 7-7 0-4.5-4-7.5-5-12-3 2-4 5-4 7-1-1-1.5-2-1.5-3C6 9 5 11.5 5 15c0 4.2 3 7 7 7z"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
};

// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const money = (n) => `$${n.toLocaleString('en-US')}`;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };

const townForZip = (zip) => TOWNS.find((t) => t.zips.includes(zip));
const issueById = (id) => ISSUES.find((i) => i.id === id);
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
            out.push({ id: `${isoDate(d)}-${w.id}`, day: dayLabel(d, now), label: w.label });
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

function bindBusiness() {
    const values = {
        ...BUSINESS,
        rating: BUSINESS.rating.toFixed(1),
        reviewCount: BUSINESS.reviewCount.toLocaleString('en-US'),
        diagnosticFee: money(OFFER.diagnosticFee),
        years: new Date().getFullYear() - BUSINESS.since,
        ratedFor: RATED_FOR,
    };
    document.querySelectorAll('[data-bind]').forEach((el) => {
        const v = values[el.dataset.bind];
        if (v !== undefined) el.textContent = v;
    });
    const dial = phoneLink(BUSINESS.phone);
    const hrefs = { tel: `tel:${dial}`, sms: `sms:${dial}`, mailto: `mailto:${ENQUIRY.email || BUSINESS.email}` };
    document.querySelectorAll('[data-bind-href]').forEach((el) => { el.href = hrefs[el.dataset.bindHref]; });
    $('#year').textContent = new Date().getFullYear();

    $('#badges').innerHTML = BUSINESS.badges.map((b) => `
        <li class="badge">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56"/><circle cx="60" cy="60" r="47"/></svg>
            <b>${esc(b.top)}</b><span>${esc(b.bottom)}</span>
        </li>`).join('');
    $('#brands').textContent = BUSINESS.brands.join(' · ');
}

// ---- Availability ----------------------------------------------------------------

function renderStatus() {
    const s = openState();
    const line = s.open
        ? `Open now until ${fmtHour(s.until)}`
        : `Closed${s.day ? `, opens ${s.day} at ${fmtHour(s.at)}` : ''}`;
    document.querySelectorAll('[data-status]').forEach((el) => {
        el.textContent = line;
        el.closest('.status')?.classList.toggle('is-open', s.open);
    });
    const em = AVAILABILITY.emergency;
    document.querySelectorAll('[data-emergency]').forEach((el) => {
        el.hidden = !em.on;
        el.textContent = s.open ? '24/7 emergency service' : 'Emergency line on now';
    });
}

function renderSchedule() {
    $('#hours-list').innerHTML = Object.entries(HOURS).map(([d, h]) => `
        <li${d === DAYS[bizNow().getDay()] ? ' class="today"' : ''}><span>${DAY_NAMES[d]}</span><b>${h ? `${fmtHour(h[0])} to ${fmtHour(h[1])}` : 'Closed'}</b></li>`).join('');
    $('#foot-hours').innerHTML = Object.entries(HOURS).map(([d, h]) => `<li>${d}: ${h ? `${fmtHour(h[0])} to ${fmtHour(h[1])}` : 'Closed'}</li>`).join('');

    const em = AVAILABILITY.emergency;
    const note = $('#emergency-note');
    note.hidden = !em.on;
    if (em.on) note.innerHTML = `${icon('phone')}<span>Outside these hours, call <a href="tel:${esc(phoneLink(BUSINESS.phone))}">${esc(BUSINESS.phone)}</a> for ${esc(em.covers)}. A technician on call answers. After-hours visits add ${money(em.fee)}.</span>`;

    const slots = nextWindows(6);
    $('#slots').innerHTML = slots.length
        ? slots.map((w) => `<li><button type="button" class="slot" data-window="${esc(w.id)}"><b>${esc(w.day)}</b><span>${esc(w.label)}</span></button></li>`).join('')
        : '<li class="slot-none">Call us for the next opening.</li>';
}

// ---- Services, terms, jobs ------------------------------------------------------------

function priceTag(p) {
    if (p === 'diag') return `${money(OFFER.diagnosticFee)} diagnostic`;
    if (p === 'tuneup') return `${money(OFFER.tuneUpPrice)} per system`;
    if (p === 'estimate') return 'Free estimate';
    return '';
}

function renderServices() {
    $('#services-grid').innerHTML = SERVICES.map((s) => `
        <div class="svc-col">
            <a class="svc-card" href="#request" data-issue="${esc(s.items[0].issue)}">
                <img src="${esc(s.photo)}" alt="${esc(s.alt)}" loading="lazy">
                <span>${esc(s.title)}</span>
            </a>
            <ul class="svc-rows">
                ${s.items.map((it) => `
                <li><a href="#request" data-issue="${esc(it.issue)}">${icon(s.icon)}<b>${esc(it.title)}</b><small>${esc(priceTag(it.price))}</small></a></li>`).join('')}
            </ul>
        </div>`).join('');
    $('#also').innerHTML = `<span>Also:</span> ${ALSO.map((a) => `<b>${esc(a)}</b>`).join('')}`;
    $('#foot-services').innerHTML = SERVICES.flatMap((s) => s.items).map((it) => `<li><a href="#services">${esc(it.title)}</a></li>`).join('');
}

function renderTerms() {
    $('#terms').innerHTML = OFFER.terms.map((t) => `<li>${icon('check')}<span>${esc(t)}</span></li>`).join('');
    $('#plan').innerHTML = `
        <div>
            <p class="plan-name">${esc(PLAN.name)}</p>
            <p class="plan-price"><b>${money(PLAN.monthly)}</b>/month <span>or ${money(PLAN.yearly)} a year</span></p>
            <p class="plan-terms">${esc(PLAN.terms)}</p>
        </div>
        <ul>${PLAN.points.map((p) => `<li>${icon('check')}${esc(p)}</li>`).join('')}</ul>
        <a class="btn btn-orange btn-sm" href="#request" data-plan>Join</a>`;
}

function renderJobs(filter = 'All') {
    $('#jobs').innerHTML = JOBS.filter((j) => filter === 'All' || j.kind === filter).map((j, i) => `
        <article class="job" style="--i:${i}">
            <div class="job-photo"><img src="${esc(j.photo)}" alt="${esc(j.alt)}" loading="lazy"><span>${esc(j.kind)}</span></div>
            <div class="job-body">
                <p class="job-meta">${icon('pin')}${esc(j.place)} · ${esc(j.when)}</p>
                <h3>${esc(j.title)}</h3>
                <dl>
                    <div><dt>Problem</dt><dd>${esc(j.problem)}</dd></div>
                    <div><dt>Fix</dt><dd>${esc(j.fix)}</dd></div>
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

// ---- Reviews and FAQ -------------------------------------------------------------------

function renderReviews() {
    $('#review-list').innerHTML = REVIEWS.map((r) => `
        <figure class="review">
            <figcaption><b>${esc(r.name)}</b><small>${esc(r.town)} · ${esc(r.when)}</small></figcaption>
            <span class="stars" aria-label="5 out of 5 stars">★★★★★</span>
            <blockquote>${esc(r.text)}</blockquote>
        </figure>`).join('');
}

function renderFaq() {
    $('#faq-list').innerHTML = FAQ.map((f) => `
        <details>
            <summary>${esc(f.q)}<span aria-hidden="true"></span></summary>
            <p>${esc(f.a)}</p>
        </details>`).join('');
}

// ---- Service area -------------------------------------------------------------------

function renderArea() {
    const zoneIds = Object.keys(ZONES).map(Number).sort();
    $('#towns').innerHTML = TOWNS.slice().sort((a, b) => a.zone - b.zone || a.name.localeCompare(b.name)).map((t) => `
        <li class="zone-${t.zone}" data-town="${esc(t.name)}"><i></i>${esc(t.name)}</li>`).join('');
    $('#legend').innerHTML = zoneIds.map((z) => `<span class="zone-${z}"><i></i>${esc(ZONES[z].name)}: ${ZONES[z].tripFee ? `${money(ZONES[z].tripFee)} trip fee, next-day visits` : 'no trip fee, same-day visits'}</span>`).join('');
    $('#foot-towns').textContent = TOWNS.map((t) => t.name).join(', ');

    const svg = $('#map');
    const base = TOWNS.find((t) => t.base) || TOWNS[0];
    const dist = (t) => Math.hypot(t.x - base.x, t.y - base.y);
    // Each ring reaches just past the furthest town in its zone.
    const radius = (z) => Math.max(40, ...TOWNS.filter((t) => t.zone <= z).map(dist)) + 34;
    const rings = zoneIds.slice().reverse().map((z) => `<circle class="ring ring-${z}" cx="${base.x}" cy="${base.y}" r="${radius(z)}"/>`).join('');
    const towns = TOWNS.map((t) => `
        <g class="town zone-${t.zone}${t.base ? ' town-base' : ''}" data-town="${esc(t.name)}" transform="translate(${t.x} ${t.y})">
            <circle class="halo" r="22"/>
            <circle class="dot" r="${t.base ? 12 : 7}"/>
            ${t.base ? '<path d="M-5 1.5 0 -3.5l5 5v4h-10z" fill="#fff"/>' : ''}
            <text y="${t.base ? 29 : 22}" text-anchor="middle">${esc(t.name)}</text>
        </g>`).join('');
    svg.insertAdjacentHTML('beforeend', `
        <path class="road" d="M0 250C120 236 200 214 260 220s160 30 260 10"/>
        <path class="road" d="M240 0C250 90 262 160 260 220s-30 140-20 220"/>
        <path class="river" d="M0 120C80 140 140 110 200 150s90 120 170 130 110 60 150 90"/>
        ${rings}
        ${towns}`);

    const highlight = (name) => {
        svg.querySelectorAll('.town').forEach((g) => g.classList.toggle('on', g.dataset.town === name));
        $('#towns').querySelectorAll('li').forEach((li) => li.classList.toggle('on', li.dataset.town === name));
    };
    const hover = (e) => {
        const el = e.target.closest('[data-town]');
        highlight(el ? el.dataset.town : null);
    };
    for (const el of [$('#towns'), svg]) {
        el.addEventListener('mouseover', hover);
        el.addEventListener('mouseleave', () => highlight(null));
    }

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
            highlight(null);
        } else if (town) {
            const zone = zoneOf(town);
            const first = nextWindows(1, { sameDay: zone.sameDay })[0];
            out.classList.add('ok');
            out.textContent = `Yes, ${town.name} is in our ${zone.name.toLowerCase()}${zone.tripFee ? ` (${money(zone.tripFee)} trip fee)` : ', with no trip fee'}.${first ? ` First visit window: ${windowText(first)}.` : ''}`;
            highlight(town.name);
        } else {
            out.classList.add('miss');
            out.textContent = `${zip} is outside our area. Send us your address and we will tell you if we can come.`;
            highlight(null);
        }
    });
}

// ---- Request form -------------------------------------------------------------------------

let issue = 'no-cool';

function initIssues() {
    $('#f-issues').innerHTML = ISSUES.map((i) => `
        <label class="issue${i.kind === 'danger' ? ' issue-danger' : ''}">
            <input type="radio" name="issue" value="${esc(i.id)}"${i.id === issue ? ' checked' : ''}>
            <span>${esc(i.label)}</span>
        </label>`).join('');
    $('#f-issues').addEventListener('change', (e) => {
        if (e.target.name !== 'issue') return;
        issue = e.target.value;
        refreshRequest();
    });
}

function setIssue(id) {
    const input = document.querySelector(`#f-issues input[value="${id}"]`);
    if (!input) return;
    input.checked = true;
    issue = id;
    refreshRequest();
}

function fillWindowOptions() {
    const sel = $('#f-window');
    const keep = sel.value;
    const zone = zoneOf(townForZip($('#f-zip').value.trim()));
    sel.innerHTML = nextWindows(8, { sameDay: zone.sameDay }).map((w) => `<option value="${esc(w.id)}">${esc(windowText(w))}</option>`).join('') +
        '<option value="any">First available</option>';
    if ([...sel.options].some((o) => o.value === keep)) sel.value = keep;
}

// The box above the send button: what this visit costs and when it can
// happen, for the chosen problem and ZIP. A gas smell replaces the form's
// send button with safety steps.
function refreshRequest() {
    const it = issueById(issue);
    const box = $('#f-terms');
    const danger = it.kind === 'danger';
    $('#request').classList.toggle('is-danger', danger);
    if (danger) {
        box.className = 'f-terms f-danger';
        box.innerHTML = `${icon('alert')}<div><b>Leave the house now.</b> Do not switch lights or appliances on or off. From outside, call your gas company's emergency line or 911. Once it is safe, call us to find the cause.</div>`;
        return;
    }
    const zip = $('#f-zip').value.trim();
    const town = /^\d{5}$/.test(zip) ? townForZip(zip) : null;
    const zone = zoneOf(town);
    const lines = [];
    if (it.kind === 'repair') lines.push(`${money(OFFER.diagnosticFee)} diagnostic, waived if you go ahead with the repair`);
    if (it.kind === 'tuneup') lines.push(`${money(OFFER.tuneUpPrice)} per system, or included in the ${esc(PLAN.name)}`);
    if (it.kind === 'estimate') lines.push('Free in-home estimate with written options');
    if (town && zone.tripFee) lines.push(`${money(zone.tripFee)} trip fee for ${esc(town.name)}`);
    let where = '';
    if (/^\d{5}$/.test(zip)) {
        where = town
            ? `<p class="f-ok">${icon('check')}We cover ${esc(town.name)}</p>`
            : `<p class="f-miss">${icon('pin')}<span>${esc(zip)} is outside our area. Send it anyway and we will tell you if we can come.</span></p>`;
    }
    const state = openState();
    const after = it.urgent && !state.open && AVAILABILITY.emergency.on
        ? `<p class="f-after">${icon('clock')}<span>Need someone tonight? Call <a href="tel:${esc(phoneLink(BUSINESS.phone))}">${esc(BUSINESS.phone)}</a>. After-hours visits add ${money(AVAILABILITY.emergency.fee)}.</span></p>`
        : '';
    box.className = 'f-terms';
    box.innerHTML = `${where}<ul>${lines.map((l) => `<li>${l}</li>`).join('')}</ul>${after}`;
}

function initRequest() {
    initIssues();
    fillWindowOptions();
    const zip = $('#f-zip');
    zip.addEventListener('input', () => {
        zip.value = zip.value.replace(/\D/g, '');
        if (zip.value.length === 5 || !zip.value) fillWindowOptions();
        refreshRequest();
    });
    refreshRequest();
    $('#f-dest').textContent = ENQUIRY.endpoint
        ? 'Sent straight to our office. We call back within an hour during opening hours.'
        : `Opens your email app with the request to ${ENQUIRY.email || BUSINESS.email}.`;

    // Any link to #request that names a problem, window or plan fills the form.
    document.addEventListener('click', (e) => {
        const a = e.target.closest('[data-issue], [data-window], [data-plan]');
        if (!a) return;
        if (a.dataset.issue) setIssue(a.dataset.issue);
        if (a.dataset.plan !== undefined) { setIssue('tuneup'); $('#f-msg').value = `I would like to join the ${PLAN.name}.`; }
        if (a.dataset.window) {
            const sel = $('#f-window');
            if ([...sel.options].some((o) => o.value === a.dataset.window)) sel.value = a.dataset.window;
        }
        if (a.tagName === 'BUTTON') $('#request').scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => $('#f-name').focus({ preventScroll: true }), 500);
    });

    $('#request').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        if (issueById(issue).kind === 'danger') return;
        const val = (n) => form.elements[n].value.trim();
        let bad = null;
        for (const n of ['name', 'phone']) {
            const el = form.elements[n];
            const empty = !el.value.trim();
            el.classList.toggle('invalid', empty);
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
            window: win.options[win.selectedIndex].text,
            message: val('message'),
        };
        const subject = `Service request: ${data.issue}${data.zip ? `, ${data.zip}` : ''}`;

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
renderStatus();
initNav();
renderServices();
renderTerms();
initJobs();
renderReviews();
renderArea();
renderSchedule();
renderFaq();
initRequest();
// Keep "open now" and the visit windows current on a page left open.
setInterval(() => { renderStatus(); renderSchedule(); fillWindowOptions(); refreshRequest(); }, 5 * 60 * 1000);
