// Page content lives here as data so it is easy to find and change.
//
// BUSINESS fills every name, phone, email and address on the page (any element
// with data-bind="<key>", and links with data-bind-href="tel|sms|mailto").
// TOWNS is the service area: the ZIP checks, the map and the crew days all
// read it. PLANS × SIZES is the price list the quote bar uses.
// Enquiries are routed by service: each service names a TEAM member, and the
// form opens an email to that person (or to BUSINESS.email when the member
// has no email of their own).
//
// SAMPLE_CONTENT marks the reviews, rating and job photos as samples on the
// page. Set it to false once they are the business's own.

const SAMPLE_CONTENT = true;

const BUSINESS = {
    name: 'Hollis & Sons Lawn Care',
    shortName: 'Hollis & Sons',
    since: 2011,
    phone: '(555) 014-2280',
    email: 'office@example.com',
    hours: 'Mon to Sat, 7am to 6pm',
    address: '18 Mill Lane, Alder Creek',
    baseTown: 'Alder Creek',
    license: 'Licensed and insured, license LC-20418.',
    reviewCount: 318,
    lawnsCount: 640,
    // New customers start this many days from today at the earliest.
    leadDays: 2,
};

const TEAM = {
    sam: { name: 'Sam Hollis', role: 'owner, quotes and mowing' },
    maria: { name: 'Maria Ortiz', role: 'beds and planting lead' },
    dev: { name: 'Dev Hollis', role: 'seasonal work and cleanups' },
};

// x and y place each town on the map (a 520 × 440 drawing).
const TOWNS = [
    { name: 'Alder Creek', zips: ['40110', '40111'], day: 'Mon', x: 250, y: 228, base: true },
    { name: 'Millbrook', zips: ['40114'], day: 'Mon', x: 330, y: 176 },
    { name: 'Linden Park', zips: ['40112'], day: 'Tue', x: 168, y: 160 },
    { name: 'Fox Hollow', zips: ['40118'], day: 'Tue', x: 92, y: 230 },
    { name: 'Cedar Run', zips: ['40120'], day: 'Wed', x: 404, y: 252 },
    { name: 'Oak Terrace', zips: ['40121'], day: 'Wed', x: 438, y: 150 },
    { name: 'Willow Bend', zips: ['40115'], day: 'Wed', x: 300, y: 318 },
    { name: 'Stonebridge', zips: ['40124'], day: 'Thu', x: 190, y: 330 },
    { name: 'Briar Hill', zips: ['40125'], day: 'Thu', x: 116, y: 344 },
    { name: 'Elm Ridge', zips: ['40116'], day: 'Fri', x: 252, y: 92 },
    { name: 'Pine Crossing', zips: ['40128'], day: 'Fri', x: 382, y: 352 },
    { name: 'Maple Flats', zips: ['40130'], day: 'Fri', x: 352, y: 74 },
];

const DAY_COLORS = { Mon: '#2b7a4b', Tue: '#8cc63f', Wed: '#e3a92b', Thu: '#d8643a', Fri: '#4a8cc4', Sat: '#8a5cc2' };
const DAY_NAMES = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };

const SIZES = [
    { id: 's', label: 'Small', note: 'under 4,000 sq ft' },
    { id: 'm', label: 'Medium', note: '4,000 to 8,000 sq ft' },
    { id: 'l', label: 'Large', note: '8,000 to 15,000 sq ft' },
    { id: 'xl', label: 'Extra large', short: 'XL', note: '15,000 sq ft to 1 acre' },
];

const PLANS = [
    {
        id: 'weekly', label: 'Every week', short: 'Weekly', featured: true, badge: 'Most booked',
        prices: { s: 40, m: 50, l: 65, xl: 85 },
        points: ['Same crew and same day all season', 'Best for spring and early summer growth', 'Skip a week with a text, free'],
    },
    {
        id: 'biweekly', label: 'Every 2 weeks', short: 'Every 2 wks',
        prices: { s: 48, m: 60, l: 78, xl: 100 },
        points: ['Good for slow-growing or shady lawns', 'Same crew and same day', 'Switch to weekly any time'],
    },
    {
        id: 'once', label: 'One-time cut', short: 'One-time',
        prices: { s: 65, m: 80, l: 100, xl: 130 },
        points: ['Before a party, a sale or a move', 'Overgrown lawns quoted on the walk', 'Booked on Saturdays'],
    },
];

const SERVICES = [
    {
        id: 'mowing', title: 'Mowing and edging', from: 40, team: 'sam', big: true,
        photo: 'photos/mower.jpg', alt: 'Close-up of a lawn mower cutting long grass',
        body: 'Cut at the right height for the season, with crisp edges along every path and bed.',
        includes: ['Mow and stripe', 'Edge paths and beds', 'String trim around obstacles', 'Blow clippings off hard surfaces'],
    },
    {
        id: 'hedges', title: 'Hedge and shrub trimming', from: 90, team: 'sam',
        photo: 'photos/hedge-trim.jpg', alt: 'A neatly trimmed hedge running beside a driveway',
        body: 'Hand-shaped hedges and shrubs, with every cutting hauled away.',
    },
    {
        id: 'beds', title: 'Beds, mulch and planting', from: 120, team: 'maria',
        photo: 'photos/bed-edging.jpg', alt: 'A curved flower bed with pansies and fresh edging',
        body: 'Weeding, fresh mulch, new edging and seasonal color for your beds.',
    },
    {
        id: 'leaves', title: 'Leaf cleanup', from: 110, team: 'dev', tone: 'lime',
        body: 'Fall and spring cleanups. Leaves blown, bagged and taken away, gutters on request.',
    },
    {
        id: 'aeration', title: 'Aeration, seed and feed', from: 150, team: 'dev', tone: 'dark',
        body: 'Core aeration and overseeding in fall, with a feed plan that suits your grass.',
    },
];

const JOBS = [
    {
        photo: 'photos/front-yard.jpg', service: 'mowing', big: true,
        alt: 'A stone house with a freshly mowed front lawn and mulched shrub beds',
        title: 'Weekly mow and bed upkeep', place: 'Linden Park', when: 'Sep 2026',
    },
    {
        photo: 'photos/striped-lawn.jpg', service: 'mowing',
        alt: 'A large lawn with fresh mowing stripes between young trees',
        title: 'Two-acre stripe cut', place: 'Elm Ridge', when: 'Aug 2026',
    },
    {
        photo: 'photos/garden-beds.jpg', service: 'beds',
        alt: 'A white cottage behind full beds of grasses, hydrangeas and roses',
        title: 'Cottage bed planting', place: 'Fox Hollow', when: 'Jun 2026',
    },
    {
        photo: 'photos/mulch.jpg', service: 'beds',
        alt: 'A young shrub with a fresh ring of red mulch in a lawn',
        title: 'Spring mulch refresh', place: 'Cedar Run', when: 'Apr 2026',
    },
];

const PERKS = [
    { title: 'Same crew, same day', body: 'The people who cut your lawn in April still cut it in October.', icon: 'users' },
    { title: 'A text before we come', body: 'The evening before each visit, and a photo when we leave.', icon: 'chat' },
    { title: 'Rain moves us a day', body: 'If it pours, we come the next dry day and tell you first.', icon: 'rain' },
    { title: 'No contract', body: 'Pay after each visit. Pause or stop with one text.', icon: 'check' },
];

const STEPS = [
    { title: 'Check your price', body: 'Use the price checker above or call us. You get a price for your lawn size straight away.' },
    { title: 'We walk your yard', body: 'A free 15-minute visit to confirm the price, note gates and pets, and agree where the edges go.' },
    { title: 'Same day every week', body: 'Your crew comes on your town\'s day. You get a text the evening before and a photo after.' },
];

const REVIEWS = [
    { name: 'Megan R.', town: 'Linden Park', service: 'Weekly mowing since 2022', text: 'Same two guys every Tuesday for three summers. They close the gate, they text when they are done, and the edges along our walk have never looked this sharp.' },
    { name: 'Jorge T.', town: 'Cedar Run', service: 'Beds and mulch', text: 'Maria redid all four of our beds in one day and told us which shrubs to stop fighting with. Fair price, quoted on the spot.' },
    { name: 'Alison K.', town: 'Alder Creek', service: 'Fall cleanup', text: 'Booked by text on a Sunday, cleaned up on Wednesday. Forty bags of leaves gone and the lawn aerated while they were here.' },
];

const FAQ = [
    { q: 'Do I need to be home?', a: 'No. Most customers are at work when we come. Tell us about gates, codes and pets on the yard walk and we handle the rest.' },
    { q: 'Do I have to sign a contract?', a: 'No. You pay after each visit and can pause or stop with a text. Weekly customers keep their crew day for the season.' },
    { q: 'What happens when it rains?', a: 'We do not cut wet grass. Your visit moves to the next dry day and you get a text the evening before.' },
    { q: 'Do you bag the clippings?', a: 'We mulch them back into the lawn by default, which feeds the grass. Ask and we bag them and take them away at no extra charge.' },
    { q: 'How do I pay?', a: 'We send a receipt after each visit with a link to pay by card. Bank transfer works too.' },
    { q: 'Are you insured?', a: 'Yes. We carry liability insurance and a state landscaping license. We email the certificate to anyone who asks.' },
];

const ICONS = {
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.4 3-5 6-5s5.4 1.6 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14c2.6 0 4.4 1.3 5 4"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/>',
    rain: '<path d="M7 15a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 7.5a3.8 3.8 0 0 1 .5 7.5z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 10"/>',
    leaf: '<path d="M5 19c2-9 7-13 15-14-1 9-6 14-13 14"/><path d="M5 19l8-8"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
};

// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const money = (n) => `$${n}`;
const DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function fmtDate(d) {
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
}

// The first date at least BUSINESS.leadDays away that falls on `day` (or on
// any weekday when no day is given).
function nextStart(day) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + BUSINESS.leadDays);
    for (let i = 0; i < 8; i++) {
        const wd = d.getDay();
        if (day ? wd === DAY_INDEX[day] : wd >= 1 && wd <= 5) return d;
        d.setDate(d.getDate() + 1);
    }
    return d;
}

const townForZip = (zip) => TOWNS.find((t) => t.zips.includes(zip));
const sizeById = (id) => SIZES.find((s) => s.id === id);
const planById = (id) => PLANS.find((p) => p.id === id);

// ---- Business details --------------------------------------------------------

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
        fromPrice: `$${Math.min(...PLANS.flatMap((p) => Object.values(p.prices)))} a visit`,
        areaLine: `${BUSINESS.baseTown} and ${TOWNS.length - 1} nearby towns`,
        reviewCount: BUSINESS.reviewCount.toLocaleString('en-US'),
        lawnsCount: BUSINESS.lawnsCount.toLocaleString('en-US'),
    };
    document.querySelectorAll('[data-bind]').forEach((el) => {
        const v = values[el.dataset.bind];
        if (v !== undefined) el.textContent = v;
    });
    const dial = phoneLink(BUSINESS.phone);
    const hrefs = { tel: `tel:${dial}`, sms: `sms:${dial}`, mailto: `mailto:${BUSINESS.email}` };
    document.querySelectorAll('[data-bind-href]').forEach((el) => { el.href = hrefs[el.dataset.bindHref]; });
    $('#year').textContent = new Date().getFullYear();
}

function renderAvailability() {
    const first = nextStart();
    $('#hero-next').textContent = fmtDate(first);
    $('#hero-avail').textContent = `Taking new lawns, first visits from ${fmtDate(first)}`;
}

// ---- Segmented controls ---------------------------------------------------------

// A row of radio buttons styled as one control. Calls onChange(value).
function segmented(root, name, options, value, onChange) {
    root.innerHTML = options.map((o) => `
        <label class="seg-opt">
            <input type="radio" name="${name}" value="${esc(o.value)}"${o.value === value ? ' checked' : ''}>
            <span>${esc(o.label)}${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</span>
        </label>`).join('');
    root.addEventListener('change', (e) => { if (e.target.name === name) onChange(e.target.value); });
}

// ---- Quote bar ----------------------------------------------------------------

const quote = { size: 'm', plan: 'weekly' };

function initQuote() {
    segmented($('#q-size'), 'q-size', SIZES.map((s) => ({ value: s.id, label: s.short || s.label })), quote.size, (v) => { quote.size = v; refreshQuote(); });
    segmented($('#q-plan'), 'q-plan', PLANS.map((p) => ({ value: p.id, label: p.short })), quote.plan, (v) => { quote.plan = v; refreshQuote(); });
    $('#q-zip').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });
    $('#quote-form').addEventListener('submit', (e) => {
        e.preventDefault();
        showQuote(true);
    });
}

// Only re-render once a result is showing, so changing the size or plan
// updates the price without needing another press.
function refreshQuote() {
    if (!$('#quote-result').hidden) showQuote(false);
}

function showQuote(focus) {
    const zipInput = $('#q-zip');
    const zip = zipInput.value.trim();
    const out = $('#quote-result');
    if (!/^\d{5}$/.test(zip)) {
        zipInput.classList.add('invalid');
        out.hidden = true;
        zipInput.focus();
        return;
    }
    zipInput.classList.remove('invalid');
    const size = sizeById(quote.size);
    const plan = planById(quote.plan);
    const price = plan.prices[size.id];
    const town = townForZip(zip);
    out.hidden = false;

    if (town) {
        const start = plan.id === 'once' ? nextStart('Sat') : nextStart(town.day);
        const crewDay = plan.id === 'once' ? 'One-time cuts are booked on Saturdays' : `Our crew is in ${town.name} every ${DAY_NAMES[town.day]}`;
        const summary = `${plan.label}, ${size.label.toLowerCase()} lawn (${size.note}), quoted ${money(price)} per visit, first visit ${fmtDate(start)}.`;
        out.innerHTML = `
            <div class="qr-price"><b>${money(price)}</b><span>per visit</span></div>
            <div class="qr-text">
                <p class="qr-ok">${icon('check')}We cover ${esc(town.name)}</p>
                <p>${esc(crewDay)}, so your first visit could be <b>${esc(fmtDate(start))}</b>. ${esc(plan.label)} for a ${esc(size.label.toLowerCase())} lawn (${esc(size.note)}). The price is confirmed on a free yard walk.</p>
            </div>
            <div class="qr-actions">
                <button type="button" class="btn btn-lime" data-book>Book this start ${icon('arrow')}</button>
            </div>`;
        out.querySelector('[data-book]').addEventListener('click', () => prefillEnquiry({ service: 'mowing', zip, message: summary }));
    } else {
        out.innerHTML = `
            <div class="qr-price qr-price-miss"><b>${icon('pin')}</b></div>
            <div class="qr-text">
                <p class="qr-miss">We do not cover ${esc(zip)} yet</p>
                <p>Our crews work in ${esc(TOWNS.map((t) => t.name).join(', '))}. Send us your address anyway. We take a few lawns just outside the area when a route passes nearby.</p>
            </div>
            <div class="qr-actions">
                <button type="button" class="btn btn-dark" data-ask>Ask about my address</button>
            </div>`;
        out.querySelector('[data-ask]').addEventListener('click', () => prefillEnquiry({ service: 'mowing', zip, message: `My ZIP is ${zip}. Can you fit my lawn into a route nearby?` }));
    }
    if (focus) out.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ---- Perks, services, jobs, steps ---------------------------------------------

function renderPerks() {
    $('#perks').innerHTML = PERKS.map((p) => `
        <div class="perk">
            <span class="perk-icon">${icon(p.icon)}</span>
            <div><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div>
        </div>`).join('');
}

function renderServices() {
    $('#services-grid').innerHTML = SERVICES.map((s) => {
        const cls = ['svc', s.big ? 'svc-big' : '', s.photo ? 'svc-photo' : `svc-${s.tone || 'plain'}`].filter(Boolean).join(' ');
        const includes = s.includes ? `<ul class="svc-list">${s.includes.map((i) => `<li>${icon('check')}${esc(i)}</li>`).join('')}</ul>` : '';
        return `
        <article class="${cls}">
            ${s.photo ? `<img src="${esc(s.photo)}" alt="${esc(s.alt)}" loading="lazy">` : `<span class="svc-icon">${icon('leaf')}</span>`}
            <div class="svc-body">
                <p class="svc-from">from <b>${money(s.from)}</b></p>
                <h3>${esc(s.title)}</h3>
                <p>${esc(s.body)}</p>
                ${includes}
                <a class="svc-link" href="#contact" data-service="${esc(s.id)}">Ask about this ${icon('arrow')}</a>
            </div>
        </article>`;
    }).join('');
    $('#services-grid').addEventListener('click', (e) => {
        const a = e.target.closest('[data-service]');
        if (!a) return;
        e.preventDefault();
        prefillEnquiry({ service: a.dataset.service });
    });
    $('#foot-services').innerHTML = SERVICES.map((s) => `<li><a href="#services">${esc(s.title)}</a></li>`).join('');
}

function renderJobs(filter = 'all') {
    const list = JOBS.filter((j) => filter === 'all' || j.service === filter);
    $('#jobs').innerHTML = list.map((j, i) => `
        <figure class="job${j.big && filter === 'all' ? ' job-big' : ''}" style="--i:${i}">
            <img src="${esc(j.photo)}" alt="${esc(j.alt)}" loading="lazy">
            <figcaption>
                <b>${esc(j.title)}</b>
                <span>${icon('pin')}${esc(j.place)} · ${esc(j.when)}</span>
            </figcaption>
        </figure>`).join('');
}

function initJobFilter() {
    const used = [...new Set(JOBS.map((j) => j.service))];
    const opts = [{ id: 'all', title: 'All jobs' }, ...SERVICES.filter((s) => used.includes(s.id))];
    const root = $('#work-filter');
    root.innerHTML = opts.map((o, i) => `<button type="button" class="chip" aria-pressed="${i === 0}" data-filter="${esc(o.id)}">${esc(o.id === 'all' ? o.title : o.title.split(' and ')[0].split(',')[0])}</button>`).join('');
    root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-filter]');
        if (!b) return;
        root.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
        renderJobs(b.dataset.filter);
    });
    renderJobs();
}

function renderSteps() {
    $('#steps').innerHTML = STEPS.map((s, i) => `
        <li class="step">
            <span class="step-n">0${i + 1}</span>
            <h3>${esc(s.title)}</h3>
            <p>${esc(s.body)}</p>
        </li>`).join('');
}

// ---- Service area -------------------------------------------------------------

function renderArea() {
    const days = Object.keys(DAY_COLORS);
    $('#towns').innerHTML = TOWNS.slice().sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day) || a.name.localeCompare(b.name)).map((t) => `
        <li data-town="${esc(t.name)}">
            <i style="--c:${DAY_COLORS[t.day]}"></i>
            <span class="t-name">${esc(t.name)}${t.base ? ' <small>our yard</small>' : ''}</span>
            <span class="t-zip">${esc(t.zips.join(', '))}</span>
            <span class="t-day">${esc(DAY_NAMES[t.day])}</span>
        </li>`).join('');
    $('#legend').innerHTML = days.map((d) => `<span><i style="--c:${DAY_COLORS[d]}"></i>${DAY_NAMES[d]}</span>`).join('');
    $('#foot-towns').textContent = TOWNS.map((t) => t.name).join(', ');

    const svg = $('#map');
    const LAND = 'M70 120C96 56 196 34 280 40s190 18 214 92-8 134-30 196-120 86-210 84S76 410 46 344 44 184 70 120z';
    const base = TOWNS.find((t) => t.base) || TOWNS[0];
    const roads = TOWNS.filter((t) => t !== base).map((t) => {
        const mx = (base.x + t.x) / 2 + (t.y - base.y) * 0.12;
        const my = (base.y + t.y) / 2 - (t.x - base.x) * 0.12;
        return `<path class="road" d="M${base.x} ${base.y} Q${mx} ${my} ${t.x} ${t.y}"/>`;
    }).join('');
    const towns = TOWNS.map((t) => `
        <g class="town${t.base ? ' town-base' : ''}" data-town="${esc(t.name)}" transform="translate(${t.x} ${t.y})">
            <circle class="halo" r="26" fill="${DAY_COLORS[t.day]}"/>
            <circle class="dot" r="${t.base ? 11 : 8}" fill="${DAY_COLORS[t.day]}"/>
            ${t.base ? '<path d="M-4.5 1.5 0 -3l4.5 4.5v3.5h-9z" fill="#fff"/>' : ''}
            <text y="${t.base ? 28 : 24}" text-anchor="middle">${esc(t.name)}</text>
        </g>`).join('');
    svg.insertAdjacentHTML('beforeend', `
        <defs>
            <pattern id="mapstripes" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
                <rect width="13" height="26" fill="rgba(18,48,31,.045)"/>
            </pattern>
            <clipPath id="mapland"><path d="${LAND}"/></clipPath>
        </defs>
        <path class="land" d="${LAND}"/>
        <g clip-path="url(#mapland)">
            <rect width="520" height="440" fill="url(#mapstripes)"/>
            <path class="river" d="M20 270C90 250 130 290 200 262s110-90 180-70 110 10 140-20"/>
        </g>
        ${roads}
        ${towns}`);

    const highlight = (name) => {
        svg.querySelectorAll('.town').forEach((g) => g.classList.toggle('on', g.dataset.town === name));
        $('#towns').querySelectorAll('li').forEach((li) => li.classList.toggle('on', li.dataset.town === name));
    };
    const hover = (e) => {
        const el = e.target.closest('[data-town]');
        highlight(el ? el.dataset.town : null);
    };
    $('#towns').addEventListener('mouseover', hover);
    svg.addEventListener('mouseover', hover);
    $('#towns').addEventListener('mouseleave', () => highlight(null));
    svg.addEventListener('mouseleave', () => highlight(null));

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
            out.classList.add('ok');
            out.textContent = `Yes, ${town.name} is on our ${DAY_NAMES[town.day]} route. The next free start there is ${fmtDate(nextStart(town.day))}.`;
            highlight(town.name);
        } else {
            out.classList.add('miss');
            out.textContent = `${zip} is outside our routes for now. Send us your address and we will tell you if a crew passes nearby.`;
            highlight(null);
        }
    });
}

// ---- Prices --------------------------------------------------------------------

let priceSize = 'm';

function renderPlans() {
    const size = sizeById(priceSize);
    $('#plans').innerHTML = PLANS.map((p) => `
        <article class="plan${p.featured ? ' plan-featured' : ''}">
            ${p.badge ? `<span class="plan-badge">${esc(p.badge)}</span>` : ''}
            <h3>${esc(p.label)}</h3>
            <p class="plan-price"><b>${money(p.prices[size.id])}</b><span>per visit</span></p>
            <p class="plan-size">${esc(size.label)} lawn, ${esc(size.note)}</p>
            <ul>${p.points.map((pt) => `<li>${icon('check')}${esc(pt)}</li>`).join('')}</ul>
            <a class="btn ${p.featured ? 'btn-lime' : 'btn-outline'}" href="#quote" data-plan="${esc(p.id)}">Check my area</a>
        </article>`).join('');
}

function initPlans() {
    segmented($('#price-size'), 'price-size', SIZES.map((s) => ({ value: s.id, label: s.short || s.label })), priceSize, (v) => { priceSize = v; renderPlans(); });
    renderPlans();
    $('#plans').addEventListener('click', (e) => {
        const a = e.target.closest('[data-plan]');
        if (!a) return;
        // Carry the size and plan into the quote bar.
        quote.plan = a.dataset.plan;
        quote.size = priceSize;
        document.querySelector(`input[name="q-plan"][value="${quote.plan}"]`).checked = true;
        document.querySelector(`input[name="q-size"][value="${quote.size}"]`).checked = true;
        setTimeout(() => $('#q-zip').focus({ preventScroll: true }), 400);
    });
}

// ---- Reviews and FAQ -------------------------------------------------------------

function renderReviews() {
    $('#review-list').innerHTML = REVIEWS.map((r) => `
        <figure class="review">
            <span class="stars" aria-label="5 out of 5 stars">★★★★★</span>
            <blockquote>${esc(r.text)}</blockquote>
            <figcaption>
                <span class="r-avatar" aria-hidden="true">${esc(r.name.split(' ').map((w) => w[0]).join(''))}</span>
                <span><b>${esc(r.name)}</b><small>${esc(r.town)} · ${esc(r.service)}</small></span>
            </figcaption>
        </figure>`).join('');
}

function renderFaq() {
    $('#faq-list').innerHTML = FAQ.map((f, i) => `
        <details${i === 0 ? ' open' : ''}>
            <summary>${esc(f.q)}<span aria-hidden="true"></span></summary>
            <p>${esc(f.a)}</p>
        </details>`).join('');
}

// ---- Enquiry form, routed by service ------------------------------------------------

let reach = 'Call';

function routeFor(serviceId) {
    const s = SERVICES.find((x) => x.id === serviceId);
    const person = TEAM[s ? s.team : 'sam'] || Object.values(TEAM)[0];
    return { ...person, email: person.email || BUSINESS.email };
}

function showRoute() {
    const person = routeFor($('#e-service').value);
    $('#e-route').innerHTML = `${icon('chat')}<span>Goes to <b>${esc(person.name)}</b>, ${esc(person.role)}.</span>`;
}

function initEnquiry() {
    const sel = $('#e-service');
    sel.innerHTML = SERVICES.map((s) => `<option value="${esc(s.id)}">${esc(s.title)}</option>`).join('') + '<option value="other">Something else</option>';
    sel.addEventListener('change', showRoute);
    showRoute();
    segmented($('#e-reach'), 'e-reach', ['Call', 'Text', 'Email'].map((v) => ({ value: v, label: v })), reach, (v) => { reach = v; });
    $('#e-zip').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });

    $('#enquiry').addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target;
        const val = (n) => form.elements[n].value.trim();
        let bad = null;
        for (const n of ['name', 'phone']) {
            const el = form.elements[n];
            const empty = !el.value.trim();
            el.classList.toggle('invalid', empty);
            if (empty && !bad) bad = el;
        }
        const note = $('#e-note');
        if (bad) {
            note.textContent = 'Add your name and a phone number so we can reach you.';
            note.className = 'form-note miss';
            bad.focus();
            return;
        }
        const person = routeFor(val('service'));
        const serviceTitle = sel.options[sel.selectedIndex].text;
        const zip = val('zip');
        const town = townForZip(zip);
        const lines = [
            `Name: ${val('name')}`,
            `Phone: ${val('phone')}`,
            `Address: ${val('address') || 'not given'}${zip ? `, ${zip}` : ''}${town ? ` (${town.name}, ${DAY_NAMES[town.day]} route)` : ''}`,
            `Service: ${serviceTitle}`,
            `Best way to reach me: ${reach}`,
            '',
            val('message'),
        ];
        const subject = `Enquiry: ${serviceTitle}${zip ? `, ${zip}` : ''}`;
        window.location.href = `mailto:${person.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
        note.className = 'form-note ok';
        note.textContent = `Your email app should open with the message to ${person.name}. If it does not, call or text ${BUSINESS.phone}.`;
    });
}

function prefillEnquiry({ service, zip, message }) {
    const form = $('#enquiry');
    if (service) { form.elements.service.value = service; showRoute(); }
    if (zip) form.elements.zip.value = zip;
    if (message) form.elements.message.value = message;
    $('#contact').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => form.elements.name.focus({ preventScroll: true }), 500);
}

// ---- Nav -----------------------------------------------------------------------------

function initNav() {
    const toggle = $('.nav-toggle');
    const links = $('#nav-links');
    toggle.addEventListener('click', () => {
        setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    links.addEventListener('click', (e) => {
        if (e.target.closest('a')) setOpen(false);
    });
    function setOpen(open) {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        links.classList.toggle('open', open);
    }
}

function markSamples() {
    if (!SAMPLE_CONTENT) return;
    document.querySelectorAll('[data-sample]').forEach((el) => { el.hidden = false; });
    $('#jobs-note').textContent = 'Sample photos. Replace them with photos of your own jobs before publishing.';
}

bindBusiness();
markSamples();
renderAvailability();
initNav();
initQuote();
renderPerks();
renderServices();
initJobFilter();
renderSteps();
renderArea();
initPlans();
renderReviews();
renderFaq();
initEnquiry();
