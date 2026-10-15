// Page content lives here as data so it is easy to find and change. Each block
// below is one thing the business owner has to make their own:
//
//   BUSINESS      who you are: name, phone, email, address, license, warranty.
//                 Fills every element with data-bind="<key>", and links with
//                 data-bind-href="tel|sms|mailto".
//   ROOMS,
//   FINISHES,
//   EXTRAS        what you remodel and what it costs. The room list and the
//                 project planner both read them.
//   SCHEDULE      how long design and permits take, and how far out the build
//                 crews are booked. The planner's timeline reads it.
//   BEFORE_AFTER,
//   PROJECTS,
//   REVIEWS       proof of work. Samples until SAMPLE_CONTENT is false.
//   STEPS, FAQ    how you work.
//   TOWNS         where you work. The ZIP checks read it.
//   ENQUIRY       where visit requests go: an email address, or a form
//                 endpoint that accepts a JSON POST.
//
// SAMPLE_CONTENT marks the reviews, rating, figures, projects and license as
// samples on the page. Set it to false once they are the business's own.

const SAMPLE_CONTENT = true;

const BUSINESS = {
    name: 'Larkspur Remodeling Co.',
    shortName: 'Larkspur',
    trade: 'Remodeling Co.',
    since: 2010,
    projects: 380,
    phone: '(555) 014-2290',
    email: 'hello@example.com',
    address: '27 Millrace Lane, Oak Hollow',
    hours: 'Showroom Mon to Fri 8 to 5, Sat 9 to 1',
    region: 'Oak Hollow and the river towns',
    license: 'Home improvement contractor license HIC-0471182',
    warrantyYears: 5,
    proposalDays: 7,
    rating: 4.9,
    reviewCount: 126,
    ratingSource: 'Google',
};

// The rooms you remodel. Each size has a typical cost range for a full
// remodel (the middle finish) and the build weeks once work starts on site.
// permit: true means the room always needs a building permit.
const ROOMS = [
    {
        id: 'kitchen', name: 'Kitchens', single: 'Kitchen',
        photo: 'photos/kitchen-island.jpg', alt: 'A kitchen with white cabinets, a wood-paneled island and four wire bar stools',
        blurb: 'Layouts that work, cabinets to the ceiling and an island you can sit at.',
        sizes: [
            { id: 's', label: 'Small', note: 'Galley, up to 120 sq ft', cost: [28000, 38000], weeks: 6 },
            { id: 'm', label: 'Medium', note: '120 to 220 sq ft', cost: [42000, 58000], weeks: 8 },
            { id: 'l', label: 'Large', note: 'Open plan, 220 sq ft and up', cost: [65000, 90000], weeks: 11 },
        ],
    },
    {
        id: 'bathroom', name: 'Bathrooms', single: 'Bathroom',
        photo: 'photos/bath-green-tile.jpg', alt: 'A bathroom with dark green wall tile, a white basin on a wood vanity and a round lit mirror',
        blurb: 'Curbless showers, heated floors and storage that hides the clutter.',
        sizes: [
            { id: 's', label: 'Half bath', note: 'Toilet and sink', cost: [9000, 14000], weeks: 2 },
            { id: 'm', label: 'Full bath', note: 'Tub or shower, 40 to 70 sq ft', cost: [18000, 27000], weeks: 4 },
            { id: 'l', label: 'Primary suite', note: 'Separate shower and tub', cost: [32000, 48000], weeks: 6 },
        ],
    },
    {
        id: 'basement', name: 'Basements', single: 'Basement', permit: true,
        photo: 'photos/basement-brick.jpg', alt: 'A finished lower level with an exposed brick wall, a grey sectional sofa and wood floors',
        blurb: 'Dry, warm and bright enough to live in, with a bathroom if you want one.',
        sizes: [
            { id: 's', label: 'Up to 500 sq ft', note: 'One open room', cost: [30000, 42000], weeks: 6 },
            { id: 'm', label: '500 to 900 sq ft', note: 'Room and a bathroom', cost: [45000, 65000], weeks: 8 },
            { id: 'l', label: '900 sq ft and up', note: 'Several rooms', cost: [70000, 95000], weeks: 10 },
        ],
    },
    {
        id: 'living', name: 'Living spaces', single: 'Living space',
        photo: 'photos/living-herringbone.jpg', alt: 'A bright living room with herringbone wood floors, a blue sofa and long low cabinets',
        blurb: 'Open up a closed floor plan, new floors, built-ins and lighting.',
        sizes: [
            { id: 's', label: 'One room', note: 'Floors, lighting, built-ins', cost: [12000, 20000], weeks: 3 },
            { id: 'm', label: 'Two or three rooms', note: 'Joined into one space', cost: [28000, 42000], weeks: 5 },
            { id: 'l', label: 'A whole floor', note: 'New layout throughout', cost: [55000, 80000], weeks: 8 },
        ],
    },
    {
        id: 'addition', name: 'Additions', single: 'Addition', permit: true,
        photo: 'photos/addition-framing.jpg', alt: 'A house addition framed in timber and sheathing, with a builder cutting boards in the yard',
        blurb: 'More room without moving: bump-outs, family rooms and second stories.',
        sizes: [
            { id: 's', label: 'Bump-out', note: 'Up to 150 sq ft', cost: [55000, 80000], weeks: 10 },
            { id: 'm', label: 'One room', note: '150 to 400 sq ft', cost: [95000, 140000], weeks: 14 },
            { id: 'l', label: 'Second story', note: 'Or a full suite', cost: [180000, 260000], weeks: 20 },
        ],
    },
];

// Multiplies the cost and build weeks of the room size.
const FINISHES = [
    { id: 'refresh', label: 'Refresh', note: 'Same layout, new surfaces, fixtures and paint', cost: 0.72, weeks: 0.75 },
    { id: 'remodel', label: 'Full remodel', note: 'Better layout, quality mid-range materials', cost: 1, weeks: 1 },
    { id: 'custom', label: 'Custom', note: 'Made-to-measure cabinetry, stone and specialty fixtures', cost: 1.45, weeks: 1.25 },
];

// Structural work on top of the room. rooms lists where each one applies.
// Any of these needs a building permit.
const EXTRAS = [
    { id: 'wall', label: 'Remove or move a wall', cost: [6000, 14000], weeks: 1, rooms: ['kitchen', 'bathroom', 'basement', 'living'] },
    { id: 'plumbing', label: 'Move plumbing or gas lines', cost: [3500, 8000], weeks: 1, rooms: ['kitchen', 'bathroom', 'basement'] },
    { id: 'windows', label: 'New or bigger windows', cost: [2500, 7500], weeks: 0, rooms: ['kitchen', 'bathroom', 'basement', 'living'] },
    { id: 'hvac', label: 'Extend heating and cooling', cost: [4000, 9000], weeks: 1, rooms: ['basement', 'addition'] },
];

const SCHEDULE = {
    designWeeks: 3,      // design visit to signed drawings and fixed price
    permitWeeks: 3,      // typical wait for a building permit
    finishWeeks: 1,      // punch list and final walkthrough
    crewBookedWeeks: 8,  // how far out the build crews are booked today
};

// The one project shown with its before and after photos.
const BEFORE_AFTER = {
    title: 'A tired kitchen, taken back to the walls',
    body: 'The old kitchen had one fluorescent light, a worn checkerboard floor and almost nowhere to put anything. We stripped it to the walls, hung white shaker cabinets with the microwave over the range, and laid a new wood-look floor.',
    place: 'Riverside', weeks: 7, budget: '$41,000',
    before: { photo: 'photos/kitchen-before.jpg', alt: 'The kitchen before: bare walls, a stepladder, old checkerboard floor tile and a single ceiling light' },
    after: { photo: 'photos/kitchen-after.jpg', alt: 'The kitchen after: white shaker cabinets, a stainless microwave over the range, dark counters and a wood-look floor' },
};

// Recent projects. room matches a ROOMS id and drives the filter. The first
// one is also the photo and "Recently finished" card in the hero.
const PROJECTS = [
    {
        room: 'kitchen', photo: 'photos/hero-kitchen.jpg', alt: 'A bright white kitchen with a teal island, pendant lights and blue bar stools',
        title: 'Teal island kitchen', place: 'Oak Hollow', when: 'Jun 2026', weeks: 9, budget: '$64,000',
        scope: 'Wall to the dining room removed, painted island with seating, cabinets to the ceiling.',
    },
    {
        room: 'bathroom', photo: 'photos/bath-green-tile.jpg', alt: 'A bathroom with dark green wall tile, a white basin on a wood vanity and a round lit mirror',
        title: 'Green tile guest bath', place: 'Fernbrook', when: 'Apr 2026', weeks: 4, budget: '$23,500',
        scope: 'Tub swapped for a walk-in shower, floating vanity, lit mirror.',
    },
    {
        room: 'basement', photo: 'photos/basement-brick.jpg', alt: 'A finished lower level with an exposed brick wall, a grey sectional sofa and wood floors',
        title: 'Brick-wall family room', place: 'Millbrook', when: 'Feb 2026', weeks: 8, budget: '$52,000',
        scope: 'Waterproofed, insulated and floored. Original brick cleaned and sealed.',
    },
    {
        room: 'living', photo: 'photos/living-herringbone.jpg', alt: 'A bright living room with herringbone wood floors, a blue sofa and long low cabinets',
        title: 'Herringbone living room', place: 'Riverside', when: 'Aug 2026', weeks: 5, budget: '$31,000',
        scope: 'Two small rooms joined, oak herringbone floor, built-in media wall.',
    },
    {
        room: 'bathroom', photo: 'photos/bath-primary.jpg', alt: 'A long primary bathroom with a white vanity, a makeup desk, a freestanding tub and tall windows',
        title: 'Primary suite with a soaking tub', place: 'Ashford', when: 'Sep 2026', weeks: 7, budget: '$46,000',
        scope: 'Closet borrowed for a double vanity, freestanding tub, basketweave marble floor.',
    },
    {
        room: 'kitchen', photo: 'photos/farmhouse-sink.jpg', alt: 'A white farmhouse sink under a bay window with a tall arched faucet',
        title: 'Bay window farmhouse kitchen', place: 'Cedar Bend', when: 'Mar 2026', weeks: 6, budget: '$38,000',
        scope: 'Sink moved under the new bay window, fireclay farmhouse sink, painted cabinets.',
    },
];

const STEPS = [
    { title: 'Design visit', when: 'Week 1', body: 'We measure the room, look at what is behind the walls where we can, and listen to how you use the space. Free, about an hour.' },
    { title: 'Drawings and a fixed price', when: 'Week 2', body: 'You get plans, 3D views and one fixed price. If we find something unexpected later, we show you before it costs you anything.' },
    { title: 'Selections and permits', when: 'Weeks 2 to 5', body: 'Pick cabinets, tile and fixtures with our designer in the showroom. We order everything and handle the permit.' },
    { title: 'Build', when: 'On site', body: 'One project lead runs the job and sends you a short update every Friday. Dust walls go up on day one and the site is swept every evening.' },
    { title: 'Walkthrough and warranty', when: 'Last week', body: 'We go through the room together and fix every item on the list. Our workmanship is covered for {warranty} years.' },
];

const REVIEWS = [
    { name: 'Hannah and Jo K.', place: 'Oak Hollow', project: 'Kitchen', text: 'The price in the contract was the price we paid. Our project lead texted every Friday with photos, which mattered because we were living upstairs the whole time.' },
    { name: 'Daniel M.', place: 'Riverside', project: 'Living room', text: 'They found knob-and-tube wiring in the wall we opened, stopped, showed us, and priced it before going on. No drama, done a day late.' },
    { name: 'Teresa A.', place: 'Fernbrook', project: 'Bathroom', text: 'Four weeks from demolition to our first shower. The tile work is better than in the photos we showed them.' },
    { name: 'Owen P.', place: 'Millbrook', project: 'Basement', text: 'Our basement used to flood every spring. Two springs later it is dry, warm and the kids live down there.' },
];

const FAQ = [
    { q: 'How accurate is the planner?', a: 'It uses what similar projects cost us over the last year, materials and labor included. Most of our final prices land inside the range. Your fixed price comes after the design visit, once we have measured and seen the space.' },
    { q: 'Do I need a permit?', a: 'Anything that moves walls, plumbing, gas or wiring, and every basement and addition, needs one. We draw the plans, apply for it and meet the inspector. It is included in the price.' },
    { q: 'Can we live at home during the work?', a: 'Usually, yes. We seal the work area with dust walls, keep one route through the house clear and set up a temporary kitchen when we take yours out.' },
    { q: 'How do payments work?', a: 'A deposit when you sign, then payments at set stages of the build, with the last one after the final walkthrough. Financing is available, subject to credit approval.' },
    { q: 'Who will be in my house?', a: 'Our own carpenters, plus licensed electricians and plumbers we have worked with for years. Your project lead is there every day work happens.' },
    { q: 'What does the warranty cover?', a: 'Our workmanship for {warranty} years from the walkthrough. Appliances, fixtures and materials carry their makers\' warranties, which we register for you.' },
];

const TOWNS = [
    { name: 'Oak Hollow', zips: ['04921', '04922'] },
    { name: 'Riverside', zips: ['04925'] },
    { name: 'Fernbrook', zips: ['04927'] },
    { name: 'Millbrook', zips: ['04930'] },
    { name: 'Ashford', zips: ['04932'] },
    { name: 'Cedar Bend', zips: ['04935'] },
    { name: 'Hartwell', zips: ['04938'] },
    { name: 'Stonebridge', zips: ['04941'] },
];

const START_OPTIONS = ['As soon as possible', 'In 1 to 3 months', 'In 3 to 6 months', 'Just getting ideas'];

// Where visit requests go. With endpoint set (a form service or your own
// backend that accepts a JSON POST), the form sends there and shows a
// confirmation. Without it, the form opens an email to `email`, or BUSINESS.email.
const ENQUIRY = {
    email: '',
    endpoint: '',
};

// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
const roundTo = (n, step) => Math.round(n / step) * step;
const withWarranty = (s) => s.replaceAll('{warranty}', BUSINESS.warrantyYears);
const roomById = (id) => ROOMS.find((r) => r.id === id) || ROOMS[0];
const townForZip = (zip) => TOWNS.find((t) => t.zips.includes(zip));

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
        projects: BUSINESS.projects.toLocaleString('en-US'),
        years: new Date().getFullYear() - BUSINESS.since,
        warrantyLine: `${BUSINESS.warrantyYears}-year workmanship warranty`,
    };
    document.querySelectorAll('[data-bind]').forEach((el) => {
        const v = values[el.dataset.bind];
        if (v !== undefined) el.textContent = v;
    });
    const dial = phoneLink(BUSINESS.phone);
    const hrefs = { tel: `tel:${dial}`, sms: `sms:${dial}`, mailto: `mailto:${ENQUIRY.email || BUSINESS.email}` };
    document.querySelectorAll('[data-bind-href]').forEach((el) => { el.href = hrefs[el.dataset.bindHref]; });
    $('#year').textContent = new Date().getFullYear();
}

function markSamples() {
    if (!SAMPLE_CONTENT) return;
    document.querySelectorAll('[data-sample]').forEach((el) => { el.hidden = false; });
}

// ---- Rooms -------------------------------------------------------------------------

function fromPrice(room) {
    const low = Math.min(...room.sizes.map((s) => s.cost[0])) * FINISHES[0].cost;
    return money(roundTo(low, 500));
}

function weeksSpan(room) {
    const w = room.sizes.map((s) => s.weeks);
    return `${Math.max(1, Math.round(Math.min(...w) * FINISHES[0].weeks))} to ${Math.round(Math.max(...w) * FINISHES[FINISHES.length - 1].weeks)} weeks`;
}

function renderRooms() {
    $('#room-list').innerHTML = ROOMS.map((r, i) => `
        <li>
            <a class="room" href="#planner" data-room="${esc(r.id)}"${i === 0 ? ' aria-current="true"' : ''}>
                <span class="room-n">${String(i + 1).padStart(2, '0')}</span>
                <span class="room-main"><b>${esc(r.name)}</b><small>${esc(r.blurb)}</small></span>
                <span class="room-meta"><b>from ${fromPrice(r)}</b><small>${weeksSpan(r)} on site</small></span>
                <span class="room-go" aria-hidden="true">→</span>
            </a>
        </li>`).join('');
    // The photo fades out, swaps, and fades back in. A newer selection
    // cancels a swap still waiting, so the photo always matches the caption.
    let swap = null;
    const show = (id) => {
        const r = roomById(id);
        const img = $('#room-photo');
        clearTimeout(swap);
        if (img.getAttribute('src') === r.photo) {
            img.classList.remove('swap');
        } else {
            img.classList.add('swap');
            swap = setTimeout(() => { img.src = r.photo; img.classList.remove('swap'); }, 160);
        }
        $('#room-caption').textContent = r.name;
        $('#room-list').querySelectorAll('.room').forEach((a) => a.toggleAttribute('aria-current', a.dataset.room === id));
    };
    const onPoint = (e) => { const a = e.target.closest('[data-room]'); if (a) show(a.dataset.room); };
    $('#room-list').addEventListener('mouseover', onPoint);
    $('#room-list').addEventListener('focusin', onPoint);
    show(ROOMS[0].id);
    $('#foot-rooms').innerHTML = ROOMS.map((r) => `<li><a href="#planner" data-room="${esc(r.id)}">${esc(r.name)}</a></li>`).join('');
}

// ---- Planner -----------------------------------------------------------------------

const plan = { room: ROOMS[0].id, size: 'm', finish: 'remodel', extras: new Set() };

function estimate() {
    const room = roomById(plan.room);
    const size = room.sizes.find((s) => s.id === plan.size) || room.sizes[1] || room.sizes[0];
    const finish = FINISHES.find((f) => f.id === plan.finish) || FINISHES[1];
    const extras = EXTRAS.filter((x) => plan.extras.has(x.id) && x.rooms.includes(room.id));
    let low = size.cost[0] * finish.cost;
    let high = size.cost[1] * finish.cost;
    let build = Math.max(1, Math.round(size.weeks * finish.weeks));
    for (const x of extras) { low += x.cost[0]; high += x.cost[1]; build += x.weeks; }
    const permit = !!room.permit || extras.length > 0 || finish.id !== 'refresh';
    const phases = [
        { id: 'design', label: 'Design', weeks: SCHEDULE.designWeeks },
        { id: 'permit', label: 'Permit', weeks: permit ? SCHEDULE.permitWeeks : 0 },
        { id: 'build', label: 'Build', weeks: build },
        { id: 'finish', label: 'Walkthrough', weeks: SCHEDULE.finishWeeks },
    ];
    // The build cannot start before a crew is free, whatever the paperwork.
    const ready = SCHEDULE.designWeeks + phases[1].weeks;
    const wait = Math.max(0, SCHEDULE.crewBookedWeeks - ready);
    const total = phases.reduce((n, p) => n + p.weeks, 0) + wait;
    return { room, size, finish, extras, permit, phases, wait, total, low: roundTo(low, 1000), high: roundTo(high, 1000) };
}

function segButtons(name, items, current) {
    return items.map((it) => `
        <label class="seg-opt">
            <input type="radio" name="${name}" value="${esc(it.id)}"${it.id === current ? ' checked' : ''}>
            <span><b>${esc(it.label)}</b>${it.note ? `<small>${esc(it.note)}</small>` : ''}</span>
        </label>`).join('');
}

// The room radios are built once and only change their checked state, so
// keyboard focus stays in the group while arrow keys move between rooms.
function renderRoomInputs() {
    $('#p-room').innerHTML = segButtons('room', ROOMS.map((r) => ({ id: r.id, label: r.single })), plan.room);
}

function setRoom(id) {
    plan.room = id;
    $('#p-room').querySelectorAll('input').forEach((i) => { i.checked = i.value === id; });
    renderPlannerInputs();
    renderEstimate();
}

// The controls that depend on the room: sizes, finishes and extras.
function renderPlannerInputs() {
    const room = roomById(plan.room);
    if (!room.sizes.some((s) => s.id === plan.size)) plan.size = room.sizes[Math.min(1, room.sizes.length - 1)].id;
    $('#p-size').innerHTML = segButtons('size', room.sizes, plan.size);
    $('#p-finish').innerHTML = segButtons('finish', FINISHES, plan.finish);
    const extras = EXTRAS.filter((x) => x.rooms.includes(room.id));
    $('#p-extras').innerHTML = extras.length
        ? extras.map((x) => `
            <label class="check">
                <input type="checkbox" name="extra" value="${esc(x.id)}"${plan.extras.has(x.id) ? ' checked' : ''}>
                <span>${esc(x.label)}<small>+${money(x.cost[0])} to ${money(x.cost[1])}</small></span>
            </label>`).join('')
        : '<p class="none">Nothing to add for this room.</p>';
}

function addWeeks(weeks) {
    const d = new Date();
    d.setDate(d.getDate() + Math.round(weeks * 7));
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function renderEstimate() {
    const e = estimate();
    $('#est-range').textContent = `${money(e.low)} to ${money(e.high)}`;
    // The bar places the range on a scale from the cheapest to the dearest
    // option for this room.
    const all = e.room.sizes.flatMap((s) => [s.cost[0] * FINISHES[0].cost, s.cost[1] * FINISHES[FINISHES.length - 1].cost]);
    const extraMax = EXTRAS.filter((x) => x.rooms.includes(e.room.id)).reduce((n, x) => n + x.cost[1], 0);
    const min = Math.min(...all);
    const max = Math.max(...all) + extraMax;
    const pct = (v) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
    const fill = $('#est-fill');
    fill.style.left = `${pct(e.low)}%`;
    fill.style.width = `${Math.max(3, pct(e.high) - pct(e.low))}%`;
    $('#est-scale').innerHTML = `<span>${money(roundTo(min, 1000))}</span><span>${money(roundTo(max, 1000))}</span>`;

    const onSite = e.phases.find((p) => p.id === 'build').weeks;
    $('#est-weeks').innerHTML = `${e.total} weeks <small>${onSite} of them on site</small>`;
    let at = 0;
    const bars = [];
    for (const p of e.phases) {
        if (p.id === 'build' && e.wait) {
            bars.push({ id: 'wait', label: 'Crew booked', weeks: e.wait, start: at });
            at += e.wait;
        }
        if (p.weeks) bars.push({ ...p, start: at });
        at += p.weeks;
    }
    $('#gantt').innerHTML = bars.map((b) => `
        <li class="g-${b.id}">
            <span class="g-label">${esc(b.label)}</span>
            <span class="g-track"><i style="left:${(b.start / e.total) * 100}%;width:${(b.weeks / e.total) * 100}%"></i></span>
            <span class="g-weeks">${b.weeks} wk</span>
        </li>`).join('');
    $('#est-start').textContent = `Book a design visit this week and you could be finished around ${addWeeks(e.total + 1)}.${e.permit ? ' Includes the building permit.' : ''}`;
}

function initPlanner() {
    renderRoomInputs();
    renderPlannerInputs();
    renderEstimate();
    $('#planner-form').addEventListener('change', (ev) => {
        const t = ev.target;
        if (t.name === 'room') { setRoom(t.value); return; }
        if (t.name === 'size') plan.size = t.value;
        if (t.name === 'finish') plan.finish = t.value;
        if (t.name === 'extra') t.checked ? plan.extras.add(t.value) : plan.extras.delete(t.value);
        renderEstimate();
    });
    // A room link anywhere on the page opens it in the planner.
    document.addEventListener('click', (ev) => {
        const a = ev.target.closest('a[data-room]');
        if (a) setRoom(a.dataset.room);
    });
}

function planSummary() {
    const e = estimate();
    const parts = [`${e.room.single}, ${e.size.label.toLowerCase()}`, e.finish.label.toLowerCase(), ...e.extras.map((x) => x.label.toLowerCase())];
    return { e, text: `${parts.join(', ')}. Planner range ${money(e.low)} to ${money(e.high)}, about ${e.total} weeks.` };
}

// ---- Hero card, before and after ---------------------------------------------------------

function renderHeroCard() {
    const p = PROJECTS[0];
    if (!p) { $('#hero-card').hidden = true; return; }
    const img = $('#hero-img');
    img.src = p.photo;
    img.alt = p.alt;
    $('#hero-card').innerHTML = `
        <span class="hc-kicker">Recently finished</span>
        <b>${esc(p.title)}</b>
        <span class="hc-meta">${esc(p.place)} · ${p.weeks} weeks · ${esc(p.budget)}</span>`;
}

function initBeforeAfter() {
    const ba = BEFORE_AFTER;
    $('#ba-title').textContent = ba.title;
    $('#ba-body').textContent = ba.body;
    $('#ba-facts').innerHTML = [['Where', ba.place], ['On site', `${ba.weeks} weeks`], ['Budget', ba.budget]]
        .map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    const before = $('#ba-before');
    const after = $('#ba-after');
    before.src = ba.before.photo;
    after.src = ba.after.photo;
    const frame = $('#ba-frame');
    const set = (which) => {
        frame.dataset.show = which;
        before.alt = which === 'before' ? ba.before.alt : '';
        after.alt = which === 'after' ? ba.after.alt : '';
        $('#ba-stamp').textContent = which === 'before' ? 'Before' : 'After';
        document.querySelectorAll('[data-ba]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ba === which)));
    };
    document.querySelectorAll('[data-ba]').forEach((b) => b.addEventListener('click', () => set(b.dataset.ba)));
    frame.addEventListener('click', () => set(frame.dataset.show === 'after' ? 'before' : 'after'));
    set('after');
}

// ---- Work, steps, reviews, FAQ ---------------------------------------------------------------

function renderProjects(filter = 'all') {
    $('#projects').innerHTML = PROJECTS.filter((p) => filter === 'all' || p.room === filter).map((p, i) => `
        <article class="project" style="--i:${i}">
            <div class="project-photo"><img src="${esc(p.photo)}" alt="${esc(p.alt)}" loading="lazy"><span>${esc(roomById(p.room).single)}</span></div>
            <div class="project-body">
                <h3>${esc(p.title)}</h3>
                <p>${esc(p.scope)}</p>
                <dl>
                    <div><dt>Town</dt><dd>${esc(p.place)}</dd></div>
                    <div><dt>On site</dt><dd>${p.weeks} weeks</dd></div>
                    <div><dt>Budget</dt><dd>${esc(p.budget)}</dd></div>
                </dl>
            </div>
        </article>`).join('');
}

function initProjects() {
    const used = ROOMS.filter((r) => PROJECTS.some((p) => p.room === r.id));
    const root = $('#work-filter');
    root.innerHTML = [{ id: 'all', name: 'All' }, ...used].map((r, i) => `<button type="button" class="chip" aria-pressed="${i === 0}" data-filter="${esc(r.id)}">${esc(r.name)}</button>`).join('');
    root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-filter]');
        if (!b) return;
        root.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
        renderProjects(b.dataset.filter);
    });
    renderProjects();
}

function renderSteps() {
    $('#steps').innerHTML = STEPS.map((s, i) => `
        <li>
            <span class="step-dot">${i + 1}</span>
            <div>
                <p class="step-when">${esc(s.when)}</p>
                <h3>${esc(s.title)}</h3>
                <p>${esc(withWarranty(s.body))}</p>
            </div>
        </li>`).join('');
}

function renderReviews() {
    $('#review-grid').innerHTML = REVIEWS.map((r, i) => `
        <figure class="review${i === 0 ? ' review-lead' : ''}">
            <span class="stars" aria-label="5 out of 5 stars">★★★★★</span>
            <blockquote>${esc(r.text)}</blockquote>
            <figcaption><b>${esc(r.name)}</b><small>${esc(r.project)} · ${esc(r.place)}</small></figcaption>
        </figure>`).join('');
}

function renderFaq() {
    $('#faq-list').innerHTML = FAQ.map((f, i) => `
        <details${i === 0 ? ' open' : ''}>
            <summary>${esc(f.q)}<span aria-hidden="true"></span></summary>
            <p>${esc(withWarranty(f.a))}</p>
        </details>`).join('');
}

// ---- Service area ----------------------------------------------------------------------

function zipMessage(zip) {
    if (!/^\d{5}$/.test(zip)) return { cls: '', text: 'Enter a 5-digit ZIP code.' };
    const town = townForZip(zip);
    return town
        ? { cls: 'ok', text: `Yes, we work in ${town.name}. Design visits there are free.` }
        : { cls: 'miss', text: `${zip} is outside our usual area. Send a request anyway and we will tell you if we can take it on.` };
}

function initArea() {
    $('#towns').innerHTML = TOWNS.map((t) => `<li>${esc(t.name)}</li>`).join('');
    const zc = $('#zc-zip');
    zc.addEventListener('input', () => { zc.value = zc.value.replace(/\D/g, ''); });
    $('#zip-check').addEventListener('submit', (e) => {
        e.preventDefault();
        const m = zipMessage(zc.value.trim());
        const out = $('#zip-out');
        out.className = `zip-out ${m.cls}`;
        out.textContent = m.text;
    });
}

// ---- Visit form -------------------------------------------------------------------------

// The planner details as they were when the visitor pressed "Send this to
// us". A snapshot, so later planner changes cannot alter what the form shows
// and sends without the visitor seeing it.
let attachedPlan = null;

function renderPlanChip() {
    const box = $('#f-plan');
    box.hidden = !attachedPlan;
    if (!attachedPlan) return;
    box.innerHTML = `<span><b>From the planner:</b> ${esc(attachedPlan)}</span><button type="button" aria-label="Remove the planner details">×</button>`;
}

function initVisit() {
    $('#f-room').innerHTML = ROOMS.map((r) => `<option value="${esc(r.id)}">${esc(r.single)}</option>`).join('') + '<option value="other">Something else</option>';
    $('#f-when').innerHTML = START_OPTIONS.map((o) => `<option>${esc(o)}</option>`).join('');
    const fzip = $('#f-zip');
    fzip.addEventListener('input', () => { fzip.value = fzip.value.replace(/\D/g, ''); });

    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-from-planner]')) {
            attachedPlan = planSummary().text;
            $('#f-room').value = plan.room;
            renderPlanChip();
            setTimeout(() => $('#f-name').focus({ preventScroll: true }), 500);
        }
        if (e.target.closest('#f-plan button')) { attachedPlan = null; renderPlanChip(); }
    });

    const note = $('#f-note');
    const dest = () => (ENQUIRY.endpoint
        ? 'Goes straight to our office. We call back within one working day.'
        : `Opens your email app with the request to ${ENQUIRY.email || BUSINESS.email}.`);
    note.textContent = dest();

    $('#visit-form').addEventListener('submit', async (e) => {
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
        if (bad) {
            note.className = 'f-note miss';
            note.textContent = 'Add your name and a phone number so we can arrange the visit.';
            bad.focus();
            return;
        }
        const town = townForZip(val('zip'));
        const roomSel = form.elements.room;
        const data = {
            name: val('name'),
            phone: val('phone'),
            email: val('email'),
            zip: val('zip'),
            town: town ? town.name : '',
            project: roomSel.options[roomSel.selectedIndex].text,
            start: val('when'),
            plan: attachedPlan || '',
            message: val('message'),
        };
        const subject = `Design visit request: ${data.project}${data.town ? `, ${data.town}` : data.zip ? `, ${data.zip}` : ''}`;

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
                attachedPlan = null;
                renderPlanChip();
                note.className = 'f-note ok';
                note.textContent = `Thanks, ${data.name.split(' ')[0]}. We will call you to set a time for the visit.`;
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
            `Project: ${data.project}`,
            `Start: ${data.start}`,
            ...(data.plan ? [`Planner: ${data.plan}`] : []),
            '',
            data.message,
        ];
        window.location.href = `mailto:${ENQUIRY.email || BUSINESS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
        note.className = 'f-note ok';
        note.textContent = `Your email app should open with the request filled in. If it does not, call ${BUSINESS.phone}.`;
    });
}

// ---- Header -------------------------------------------------------------------------------

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

bindBusiness();
markSamples();
initNav();
renderHeroCard();
renderRooms();
initPlanner();
initBeforeAfter();
initProjects();
renderSteps();
renderReviews();
initArea();
renderFaq();
initVisit();
