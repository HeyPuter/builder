// Page content lives here as data so it is easy to find and change.
//
// PRACTICE fills every name, phone, email and address on the page (any element
// with data-bind="<key>", and links with data-bind-href="tel|emergency|mailto|
// map"). HOURS drives the open-now line, the hours table and the days offered
// in the booking form, all in the practice's own time zone.
// DENTIST is the about section: bio, training and memberships.
// INSURANCE is the list the insurance checker and the booking form read.
// Booking requests are routed by reason: each reason names a TEAM member, and
// the form opens an email to that person (or to PRACTICE.email when the member
// has no email of their own).
//
// SAMPLE_CONTENT marks the bio, credentials, reviews, rating and smile gallery
// as samples on the page. Set it to false once they are the dentist's own.

const SAMPLE_CONTENT = true;

const PRACTICE = {
    name: 'Marsh Family Dental',
    shortName: 'Marsh Dental',
    dentist: 'Dr. Elena Marsh',
    degree: 'DDS',
    since: 2012,
    phone: '(555) 013-4470',
    emergencyPhone: '(555) 013-4499',
    email: 'hello@example.com',
    address: '240 Linden Avenue, Suite 3, Fairmont',
    city: 'Fairmont',
    parking: 'Free parking behind the building, step-free entrance from the lot.',
    license: 'State dental license D-48213.',
    rating: '4.9',
    reviewCount: 412,
    // The practice's time zone, so "open now" is right for every visitor.
    timeZone: 'America/Chicago',
    // Booking requests start this many days from today at the earliest.
    leadDays: 1,
};

// 24-hour times. A missing day is closed.
const HOURS = {
    Mon: ['08:00', '17:00'],
    Tue: ['08:00', '17:00'],
    Wed: ['10:00', '19:00'],
    Thu: ['08:00', '17:00'],
    Fri: ['08:00', '14:00'],
    Sat: ['09:00', '13:00'],
};

const TEAM = {
    elena: { name: 'Dr. Elena Marsh', role: 'dentist' },
    rosa: { name: 'Rosa Delgado', role: 'front desk and insurance' },
    kim: { name: 'Kim Tran, RDH', role: 'lead hygienist' },
};

const DENTIST = {
    photo: 'photos/dentist.jpg',
    alt: 'A smiling woman with red hair in a light blue shirt, sitting by a window',
    intro: 'I opened this practice in 2012 so families in Fairmont could see the same dentist from their first tooth to their first crown. I explain what I see on the screen beside your chair, give you the cost before we start, and never rush a numb patient out of the room.',
    bio: [
        'Most of my week is general dentistry: checkups, fillings, crowns and the occasional toothache that cannot wait. The rest is cosmetic work, where I plan whitening, bonding, veneers and clear aligners from photos and a digital scan, so you see the result before we touch a tooth.',
        'Nervous patients are welcome. Tell us when you book and we leave extra time, start with a chat in the consult room, and agree on a hand signal to stop.',
    ],
    training: [
        { year: '2008', title: 'Doctor of Dental Surgery', place: 'State University School of Dentistry' },
        { year: '2009', title: 'General practice residency', place: 'Fairmont Regional Hospital' },
        { year: '2015', title: 'Clear aligner certification', place: 'Provider training, 40 hours' },
        { year: '2019', title: 'Implant restoration course', place: '12-month continuum, 120 hours' },
    ],
    memberships: [
        'Member, American Dental Association',
        'Member, Academy of General Dentistry',
        'State Dental Association, Fairmont chapter',
    ],
    facts: [
        { value: '14', label: 'years in practice' },
        { value: '60+', label: 'hours of training a year' },
        { value: '2', label: 'languages, English and Spanish' },
    ],
};

const CATEGORIES = [
    { id: 'general', label: 'General' },
    { id: 'cosmetic', label: 'Cosmetic' },
    { id: 'restorative', label: 'Restorative' },
    { id: 'urgent', label: 'Urgent' },
];

// `from` is the self-pay price in dollars, before insurance.
const TREATMENTS = [
    {
        id: 'checkup', category: 'general', title: 'Checkup and cleaning', from: 145, length: '60 min', visits: '1 visit', featured: true,
        body: 'An exam with Dr. Marsh, a cleaning with our hygienist, and X-rays when you are due.',
        includes: ['Gum and oral cancer screening', 'Digital X-rays, low dose', 'Polish and fluoride', 'A written plan if anything needs work'],
    },
    { id: 'kids', category: 'general', title: 'Children’s visits', from: 95, length: '30 min', visits: 'Every 6 months', body: 'Gentle first visits from age one, sealants and fluoride, and a ride in the chair before anything starts.' },
    { id: 'gums', category: 'general', title: 'Gum treatment', from: 240, length: '60 min', visits: '1 to 2 visits', body: 'A deep cleaning below the gum line for bleeding or receding gums, then a check-up every three months.' },
    { id: 'fillings', category: 'restorative', title: 'Tooth-colored fillings', from: 180, length: '45 min', visits: '1 visit', body: 'Composite fillings matched to your tooth, placed and polished in one visit.' },
    { id: 'crowns', category: 'restorative', title: 'Crowns and bridges', from: 1150, length: '60 min each', visits: '2 visits', body: 'Porcelain crowns from a digital scan, with no putty trays. A temporary crown in between.' },
    { id: 'implants', category: 'restorative', title: 'Implant crowns', from: 3800, length: '30 to 60 min each', visits: 'Over 3 to 6 months', body: 'We plan the implant, a local surgeon places it, and Dr. Marsh fits and matches the final crown.' },
    { id: 'rootcanal', category: 'restorative', title: 'Root canal treatment', from: 950, length: '90 min', visits: '1 to 2 visits', body: 'Front and premolar teeth treated here. Molars that need a specialist are referred the same week.' },
    { id: 'whitening', category: 'cosmetic', title: 'Teeth whitening', from: 395, length: '90 min', visits: '1 visit', body: 'In-office whitening, or custom trays to use at home over two weeks. We check for sensitivity first.' },
    { id: 'aligners', category: 'cosmetic', title: 'Clear aligners', from: 3900, length: '20 min check-ins', visits: 'Over 6 to 18 months', body: 'A scan, a preview of your finished smile, and aligner trays that you change every week or two.' },
    { id: 'veneers', category: 'cosmetic', title: 'Veneers and bonding', from: 350, length: '60 min per tooth', visits: '1 to 2 visits', body: 'Bonding to fix chips and gaps in one visit, or porcelain veneers for a bigger change in shape and color.' },
    { id: 'emergency', category: 'urgent', title: 'Emergency visit', from: 120, length: '30 min', visits: 'Same day', tone: 'urgent', body: 'Toothache, a broken tooth or a lost crown. Call before 11am and we see you the same day.' },
];

// The smile gallery. `before` and `after` are the two photos for the slider.
// The samples reuse one stock photo with a tint for "before" (sampleTint),
// which is only there to show how the slider works.
const CASES = [
    {
        title: 'Whitening and edge bonding', treatment: 'whitening', visits: '2 visits', time: '3 weeks',
        after: 'photos/smile-4.jpg', before: 'photos/smile-4.jpg', sampleTint: true,
        alt: 'A woman in a black hat with red lipstick, smiling with her chin on her hand',
    },
    {
        title: 'Six months of clear aligners', treatment: 'aligners', visits: '5 check-ins', time: '6 months',
        after: 'photos/smile-2.jpg', before: 'photos/smile-2.jpg', sampleTint: true,
        alt: 'A woman with red flowers in her hair, smiling widely',
    },
    {
        title: 'Two porcelain veneers', treatment: 'veneers', visits: '2 visits', time: '2 weeks',
        after: 'photos/smile-3.jpg', before: 'photos/smile-3.jpg', sampleTint: true,
        alt: 'A woman resting her face in her hands, smiling',
    },
];

// network: true for in-network plans. The checker and the booking form both
// read this list.
const INSURANCE = [
    { name: 'Delta Dental PPO', network: true },
    { name: 'Cigna Dental PPO', network: true },
    { name: 'MetLife PDP', network: true },
    { name: 'Guardian Dental', network: true },
    { name: 'Aetna Dental PPO', network: true },
    { name: 'United Concordia', network: true },
    { name: 'Humana Dental', network: false },
    { name: 'Medicaid', network: false },
];

const MEMBERSHIP = {
    name: 'Marsh Dental Membership',
    monthly: 29,
    yearly: 319,
    includes: ['Two checkups and cleanings a year', 'All routine X-rays', 'One emergency exam', '15% off fillings, crowns and whitening'],
};

// What a booking request is for, and who reads it.
const REASONS = [
    { id: 'new', label: 'New patient checkup', team: 'rosa' },
    { id: 'cleaning', label: 'Cleaning or checkup', team: 'kim' },
    { id: 'pain', label: 'Pain, a broken tooth or a lost crown', team: 'elena', urgent: true },
    { id: 'cosmetic', label: 'Whitening, veneers or aligners consult', team: 'elena' },
    { id: 'treatment', label: 'Treatment I have been told I need', team: 'elena' },
    { id: 'kids', label: 'Visit for my child', team: 'kim' },
    { id: 'insurance', label: 'A question about insurance or cost', team: 'rosa' },
];

const FIRST_VISIT = [
    { title: 'Request a time', body: 'Pick a day below or call. Rosa confirms by text within one working day and sends the forms to fill in on your phone.' },
    { title: 'Meet Dr. Marsh', body: 'A full exam, X-rays and photos, shown to you on the screen by the chair. Bring your questions.' },
    { title: 'Leave with a plan', body: 'A written plan with each step, the cost and what your insurance pays, before anything is booked.' },
];

const BRING = ['Photo ID and your insurance card', 'A list of the medicines you take', 'Your last X-rays, if they are under a year old', 'Glasses, if you need them to read the forms'];

const REVIEWS = [
    { name: 'Hannah W.', since: 'Patient since 2016', text: 'I had not been to a dentist in eight years and was embarrassed. Dr. Marsh showed me every photo, told me what could wait, and never once made me feel judged.' },
    { name: 'Marcus O.', since: 'Clear aligners, 2025', text: 'The scan preview sold me. Seven months later my teeth look exactly like the picture, and the check-ins never ran late.' },
    { name: 'Priya S.', since: 'Family of four', text: 'All four of us see the same dentist. The kids ask when they get to go back, which I did not think was possible.' },
];

const FAQ = [
    { q: 'Are you taking new patients?', a: 'Yes. New patient checkups are booked within about a week. Use the form below or call, and tell us if you are in pain so we can see you sooner.' },
    { q: 'What if I do not have insurance?', a: 'You can pay per visit at the prices shown, or join our membership plan for a monthly fee that covers your cleanings and X-rays. We also offer monthly payments for larger treatment.' },
    { q: 'Do you see children?', a: 'Yes, from their first tooth. Book the same day as a parent and we see you back to back.' },
    { q: 'I am nervous about the dentist. What can you do?', a: 'Tell us when you book. We leave extra time, start with a chat outside the treatment room, agree on a stop signal, and offer nitrous oxide for longer visits.' },
    { q: 'What counts as an emergency?', a: 'Severe tooth pain, swelling, a knocked-out or broken tooth, or bleeding that does not stop. Call the emergency line, even after hours. For swelling that affects your breathing or swallowing, go to the emergency room.' },
    { q: 'How do I pay?', a: 'Card, cash, HSA and FSA cards. We bill in-network insurance directly and collect your share at the visit.' },
];

const ICONS = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 10"/>',
    tick: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    x: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/>',
    tooth: '<path d="M7.5 4C5 4 3.5 6 3.8 8.8c.3 2.6 1.4 3.8 1.9 6.7.5 3 1 5.5 2.3 5.5 1.6 0 1.5-5 4-5s2.4 5 4 5c1.3 0 1.8-2.5 2.3-5.5.5-2.9 1.6-4.1 1.9-6.7C20.5 6 19 4 16.5 4 14.6 4 13.8 5 12 5S9.4 4 7.5 4z"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    alert: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.2v.1"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
};

// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const money = (n) => `$${n.toLocaleString('en-US')}`;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };

// ---- Time, in the practice's time zone ----------------------------------------

const toMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };

// '08:00' -> '8am', '17:30' -> '5:30pm'
function fmtTime(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const hour = h % 12 || 12;
    return `${hour}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
}

function fmtDate(d) {
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
}

// The practice's date and time now. `date` is that calendar day at noon, for
// day arithmetic and labels; `minutes` is the time of day.
function practiceNow() {
    let parts;
    try {
        parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
            timeZone: PRACTICE.timeZone, year: 'numeric', month: 'numeric', day: 'numeric',
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

// "Open now, until 5pm" or "Closed, opens Wed at 10am".
function openStatus() {
    const now = practiceNow();
    const today = HOURS[now.day];
    if (today && now.minutes >= toMinutes(today[0]) && now.minutes < toMinutes(today[1])) {
        return { open: true, text: `Open now, until ${fmtTime(today[1])}` };
    }
    if (today && now.minutes < toMinutes(today[0])) {
        return { open: false, text: `Closed, opens today at ${fmtTime(today[0])}` };
    }
    for (let i = 1; i <= 7; i++) {
        const d = addDays(now.date, i);
        const h = hoursOn(d);
        if (h) return { open: false, text: `Closed, opens ${i === 1 ? 'tomorrow' : DAY_NAMES[DAYS[d.getDay()]]} at ${fmtTime(h[0])}` };
    }
    return { open: false, text: 'Closed' };
}

// The next `count` open days a booking can ask for.
function bookableDays(count) {
    const now = practiceNow();
    const out = [];
    for (let i = PRACTICE.leadDays; out.length < count && i < PRACTICE.leadDays + 21; i++) {
        const d = addDays(now.date, i);
        if (hoursOn(d)) out.push(d);
    }
    return out;
}

// Morning, afternoon and evening, where the day's hours allow.
function slotsFor(d) {
    const h = hoursOn(d);
    if (!h) return [];
    const open = toMinutes(h[0]);
    const close = toMinutes(h[1]);
    const slots = [];
    if (open < 12 * 60) slots.push('Morning');
    if (close > 13 * 60 && open < 17 * 60) slots.push('Afternoon');
    if (close > 17 * 60 + 30) slots.push('Evening');
    return slots;
}

// ---- Practice details -----------------------------------------------------------

// The number for tel: links, from the displayed one. Ten digits without a
// country code are read as a US number.
function phoneLink(phone) {
    const digits = String(phone).replace(/\D/g, '');
    if (String(phone).trim().startsWith('+')) return `+${digits}`;
    return digits.length === 10 ? `+1${digits}` : digits;
}

function bindPractice() {
    const values = {
        ...PRACTICE,
        dentistFull: `${PRACTICE.dentist}, ${PRACTICE.degree}`,
        reviewCount: PRACTICE.reviewCount.toLocaleString('en-US'),
        years: String(new Date().getFullYear() - PRACTICE.since),
        networkCount: String(INSURANCE.filter((i) => i.network).length),
    };
    document.querySelectorAll('[data-bind]').forEach((el) => {
        const v = values[el.dataset.bind];
        if (v !== undefined) el.textContent = v;
    });
    const hrefs = {
        tel: `tel:${phoneLink(PRACTICE.phone)}`,
        emergency: `tel:${phoneLink(PRACTICE.emergencyPhone)}`,
        mailto: `mailto:${PRACTICE.email}`,
        map: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(PRACTICE.address)}`,
    };
    document.querySelectorAll('[data-bind-href]').forEach((el) => { el.href = hrefs[el.dataset.bindHref]; });
    $('#year').textContent = new Date().getFullYear();
}

function renderStatus() {
    const s = openStatus();
    document.querySelectorAll('[data-status]').forEach((el) => {
        el.textContent = s.text;
        el.closest('.status')?.classList.toggle('is-open', s.open);
    });
    const first = bookableDays(1)[0];
    if (first) $('#hero-next').textContent = fmtDate(first);
}

function renderHours() {
    const today = practiceNow().day;
    const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    $('#hours').innerHTML = order.map((d) => {
        const h = HOURS[d];
        return `<li class="${d === today ? 'today' : ''}${h ? '' : ' closed'}">
            <span>${DAY_NAMES[d]}${d === today ? ' <small>today</small>' : ''}</span>
            <b>${h ? `${fmtTime(h[0])} to ${fmtTime(h[1])}` : 'Closed'}</b>
        </li>`;
    }).join('');
}

// ---- Segmented controls --------------------------------------------------------------

// A row of radio buttons styled as one control. Calls onChange(value).
function segmented(root, name, options, value, onChange) {
    root.innerHTML = options.map((o) => `
        <label class="seg-opt">
            <input type="radio" name="${name}" value="${esc(o.value)}"${o.value === value ? ' checked' : ''}${o.disabled ? ' disabled' : ''}>
            <span>${esc(o.label)}${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</span>
        </label>`).join('');
    root.onchange = (e) => { if (e.target.name === name) onChange(e.target.value); };
}

// ---- Insurance checker ----------------------------------------------------------------

function insuranceOptions() {
    return INSURANCE.map((i) => `<option value="${esc(i.name)}">${esc(i.name)}</option>`).join('') +
        '<option value="other">My plan is not listed</option><option value="none">I do not have insurance</option>';
}

function initInsurance() {
    const sel = $('#ins-plan');
    sel.innerHTML = '<option value="">Choose your insurance</option>' + insuranceOptions();
    sel.addEventListener('change', showInsurance);
    $('#ins-list').innerHTML = INSURANCE.filter((i) => i.network).map((i) => `<li>${icon('tick')}${esc(i.name)}</li>`).join('');
    renderMembership();
}

function showInsurance() {
    const value = $('#ins-plan').value;
    const out = $('#ins-result');
    if (!value) { out.hidden = true; return; }
    const plan = INSURANCE.find((i) => i.name === value);
    let cls, head, body;
    if (plan && plan.network) {
        cls = 'ok';
        head = `${plan.name} is in network`;
        body = 'We bill them directly and check your benefits before your first visit, so you know your share before you sit down.';
    } else if (plan) {
        cls = 'warn';
        head = `We are out of network with ${plan.name}`;
        body = 'You can still see us. We send the claim for you, you pay our fee at the visit, and your plan pays you back what your out-of-network benefits allow. Call Rosa and she will check your benefits first.';
    } else if (value === 'none') {
        cls = 'info';
        head = 'No insurance, no problem';
        body = `Pay per visit at the prices on this page, or join our membership plan for ${money(MEMBERSHIP.monthly)} a month, which covers your checkups, cleanings and X-rays.`;
    } else {
        cls = 'info';
        head = 'Tell us your plan';
        body = 'Many plans let you see any dentist. Send us the name on your card with your booking request and Rosa checks your benefits before you come in.';
    }
    out.className = `ins-result ins-${cls}`;
    out.innerHTML = `
        <span class="ins-icon">${icon(cls === 'ok' ? 'check' : cls === 'warn' ? 'alert' : 'shield')}</span>
        <div><p class="ins-head">${esc(head)}</p><p>${esc(body)}</p></div>
        <button type="button" class="btn btn-dark btn-sm" data-book-ins>Request a visit ${icon('arrow')}</button>`;
    out.hidden = false;
    out.querySelector('[data-book-ins]').addEventListener('click', () => prefillBooking({ reason: 'new', insurance: value }));
}

function renderMembership() {
    $('#membership').innerHTML = `
        <p class="tag">No insurance?</p>
        <h3>${esc(MEMBERSHIP.name)}</h3>
        <p class="mem-price"><b>${money(MEMBERSHIP.monthly)}</b><span>a month, or ${money(MEMBERSHIP.yearly)} a year</span></p>
        <ul>${MEMBERSHIP.includes.map((i) => `<li>${icon('tick')}${esc(i)}</li>`).join('')}</ul>
        <a class="btn btn-line btn-sm" href="#book" data-membership>Ask about joining</a>`;
    $('#membership [data-membership]').addEventListener('click', (e) => {
        e.preventDefault();
        prefillBooking({ reason: 'insurance', insurance: 'none', message: `I would like to join the ${MEMBERSHIP.name}.` });
    });
}

// ---- Hero badge and the treatments strip ----------------------------------------------------------

function renderHeroExtras() {
    $('#badge-text').textContent = `New patients welcome · ${PRACTICE.city} · `;
    // Two copies, so the strip loops without a gap.
    const items = TREATMENTS.map((t) => `<span>${esc(t.title)}</span><i>✦</i>`).join('');
    $('#ticker').innerHTML = items + items;
}

// ---- About the dentist ------------------------------------------------------------------

function renderAbout() {
    $('#about-bio').innerHTML = DENTIST.bio.map((p) => `<p>${esc(p)}</p>`).join('');
    $('#about-intro').textContent = DENTIST.intro;
    $('#about-facts').innerHTML = DENTIST.facts.map((f) => `<li><b>${esc(f.value)}</b><span>${esc(f.label)}</span></li>`).join('');
    $('#training').innerHTML = DENTIST.training.map((t) => `
        <li><span class="tr-year">${esc(t.year)}</span><div><b>${esc(t.title)}</b><span>${esc(t.place)}</span></div></li>`).join('');
    $('#memberships').innerHTML = DENTIST.memberships.map((m) => `<li>${icon('shield')}${esc(m)}</li>`).join('');
}

// ---- Treatments ----------------------------------------------------------------------------

function renderTreatments(filter = 'all') {
    const list = TREATMENTS.filter((t) => filter === 'all' || t.category === filter);
    $('#tx-grid').innerHTML = list.map((t, i) => {
        const cls = ['tx', t.featured && filter === 'all' ? 'tx-featured' : '', t.tone ? `tx-${t.tone}` : ''].filter(Boolean).join(' ');
        const includes = t.includes ? `<ul class="tx-list">${t.includes.map((x) => `<li>${icon('tick')}${esc(x)}</li>`).join('')}</ul>` : '';
        const cat = CATEGORIES.find((c) => c.id === t.category);
        return `
        <article class="${cls}" style="--i:${i}">
            <div class="tx-top">
                <span class="tx-cat">${esc(cat ? cat.label : t.category)}</span>
                <span class="tx-from">from <b>${money(t.from)}</b></span>
            </div>
            <h3>${esc(t.title)}</h3>
            <p>${esc(t.body)}</p>
            ${includes}
            <dl class="tx-meta">
                <div><dt>Chair time</dt><dd>${esc(t.length)}</dd></div>
                <div><dt>Visits</dt><dd>${esc(t.visits)}</dd></div>
            </dl>
            <a class="tx-link" href="#book" data-treatment="${esc(t.id)}">${t.category === 'urgent' ? 'Get seen today' : 'Book this'} ${icon('arrow')}</a>
        </article>`;
    }).join('');
}

function initTreatments() {
    const root = $('#tx-filter');
    const used = CATEGORIES.filter((c) => TREATMENTS.some((t) => t.category === c.id));
    root.innerHTML = [{ id: 'all', label: 'All' }, ...used].map((c, i) =>
        `<button type="button" class="chip" aria-pressed="${i === 0}" data-filter="${esc(c.id)}">${esc(c.label)}</button>`).join('');
    root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-filter]');
        if (!b) return;
        root.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
        renderTreatments(b.dataset.filter);
    });
    $('#tx-grid').addEventListener('click', (e) => {
        const a = e.target.closest('[data-treatment]');
        if (!a) return;
        e.preventDefault();
        const t = TREATMENTS.find((x) => x.id === a.dataset.treatment);
        const reason = t.category === 'urgent' ? 'pain' : t.category === 'cosmetic' ? 'cosmetic' : t.id === 'kids' ? 'kids' : t.id === 'checkup' ? 'new' : 'treatment';
        prefillBooking({ reason, message: `I am asking about: ${t.title}.` });
    });
    renderTreatments();
    $('#foot-treatments').innerHTML = TREATMENTS.slice(0, 6).map((t) => `<li><a href="#treatments">${esc(t.title)}</a></li>`).join('');
}

// ---- Smile gallery: a before and after slider per case ----------------------------------------

function renderCases() {
    $('#cases').innerHTML = CASES.map((c, i) => {
        const t = TREATMENTS.find((x) => x.id === c.treatment);
        const tint = SAMPLE_CONTENT && c.sampleTint ? ' ba-tint' : '';
        return `
        <figure class="case">
            <div class="ba" style="--pos:50%">
                <img src="${esc(c.after)}" alt="After: ${esc(c.alt)}" loading="lazy">
                <div class="ba-before${tint}"><img src="${esc(c.before)}" alt="" loading="lazy"></div>
                <span class="ba-label ba-l">Before</span>
                <span class="ba-label ba-r">After</span>
                <span class="ba-handle" aria-hidden="true"><i></i></span>
                <input type="range" min="0" max="100" value="50" aria-label="Before and after, case ${i + 1}: drag to compare">
            </div>
            <figcaption>
                <b>${esc(c.title)}</b>
                <span>${esc(t ? t.title : '')} · ${esc(c.visits)} · ${esc(c.time)}</span>
            </figcaption>
        </figure>`;
    }).join('');
    $('#cases').addEventListener('input', (e) => {
        if (e.target.type !== 'range') return;
        e.target.closest('.ba').style.setProperty('--pos', `${e.target.value}%`);
    });
}

// ---- First visit, reviews, FAQ ---------------------------------------------------------------

function renderFirstVisit() {
    $('#steps').innerHTML = FIRST_VISIT.map((s, i) => `
        <li class="step"><span class="step-n">${i + 1}</span><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></li>`).join('');
    $('#bring').innerHTML = BRING.map((b) => `<li>${icon('tick')}${esc(b)}</li>`).join('');
}

function renderReviews() {
    $('#review-list').innerHTML = REVIEWS.map((r) => `
        <figure class="review">
            <span class="stars" aria-label="5 out of 5 stars">★★★★★</span>
            <blockquote>${esc(r.text)}</blockquote>
            <figcaption>
                <span class="r-avatar" aria-hidden="true">${esc(r.name.split(' ').map((w) => w[0]).join(''))}</span>
                <span><b>${esc(r.name)}</b><small>${esc(r.since)}</small></span>
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

// ---- Booking request, routed by reason -------------------------------------------------------------

const booking = { patient: 'New', day: '', slot: '' };

function routeFor(reasonId) {
    const r = REASONS.find((x) => x.id === reasonId);
    const person = TEAM[r ? r.team : 'rosa'] || Object.values(TEAM)[0];
    return { ...person, email: person.email || PRACTICE.email };
}

function showRoute() {
    const id = $('#b-reason').value;
    const reason = REASONS.find((r) => r.id === id);
    const person = routeFor(id);
    $('#b-route').innerHTML = `${icon('chat')}<span>Goes to <b>${esc(person.name)}</b>, ${esc(person.role)}.</span>`;
    $('#b-urgent').hidden = !(reason && reason.urgent);
}

function renderDays() {
    const days = bookableDays(8);
    if (!days.some((d) => d.toDateString() === booking.day)) booking.day = days[0] ? days[0].toDateString() : '';
    segmented($('#b-day'), 'b-day', days.map((d) => ({
        value: d.toDateString(),
        label: d.toLocaleDateString('en-US', { weekday: 'short' }),
        hint: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
    })), booking.day, (v) => { booking.day = v; renderSlots(); });
    renderSlots();
}

function renderSlots() {
    const slots = slotsFor(new Date(booking.day));
    if (!slots.includes(booking.slot)) booking.slot = slots[0] || '';
    segmented($('#b-slot'), 'b-slot', slots.map((s) => ({ value: s, label: s })), booking.slot, (v) => { booking.slot = v; });
}

function initBooking() {
    const sel = $('#b-reason');
    sel.innerHTML = REASONS.map((r) => `<option value="${esc(r.id)}">${esc(r.label)}</option>`).join('');
    sel.addEventListener('change', showRoute);
    showRoute();
    $('#b-insurance').innerHTML = '<option value="">Choose one</option>' + insuranceOptions();
    segmented($('#b-patient'), 'b-patient', ['New', 'Returning'].map((v) => ({ value: v, label: `${v} patient` })), booking.patient, (v) => { booking.patient = v; });
    renderDays();

    $('#booking').addEventListener('submit', (e) => {
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
        const note = $('#b-note');
        if (bad) {
            note.textContent = 'Add your name and a phone number so we can confirm your visit.';
            note.className = 'form-note miss';
            bad.focus();
            return;
        }
        const person = routeFor(val('reason'));
        const reasonLabel = sel.options[sel.selectedIndex].text;
        const ins = $('#b-insurance');
        const insurance = ins.value ? ins.options[ins.selectedIndex].text : 'not given';
        const day = booking.day ? fmtDate(new Date(booking.day)) : 'any day';
        const lines = [
            `Name: ${val('name')}`,
            `Phone: ${val('phone')}`,
            `Email: ${val('email') || 'not given'}`,
            `${booking.patient} patient`,
            `Reason: ${reasonLabel}`,
            `Insurance: ${insurance}`,
            `Preferred time: ${day}, ${booking.slot ? booking.slot.toLowerCase() : 'any time'}`,
            '',
            val('message'),
        ];
        const subject = `Visit request: ${reasonLabel}, ${day}`;
        window.location.href = `mailto:${person.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
        note.className = 'form-note ok';
        note.textContent = `Your email app should open with the request to ${person.name}. If it does not, call ${PRACTICE.phone}.`;
    });
}

function prefillBooking({ reason, insurance, message }) {
    const form = $('#booking');
    if (reason) { form.elements.reason.value = reason; showRoute(); }
    if (insurance) form.elements.insurance.value = insurance;
    if (message) form.elements.message.value = message;
    $('#book').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => form.elements.name.focus({ preventScroll: true }), 500);
}

// ---- Nav -----------------------------------------------------------------------------------

function initNav() {
    const toggle = $('.nav-toggle');
    const links = $('#nav-links');
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    function setOpen(open) {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        links.classList.toggle('open', open);
    }
}

function markSamples() {
    if (!SAMPLE_CONTENT) return;
    document.querySelectorAll('[data-sample]').forEach((el) => { el.hidden = false; });
}

bindPractice();
markSamples();
initNav();
renderStatus();
renderHours();
initInsurance();
renderHeroExtras();
renderAbout();
initTreatments();
renderCases();
renderFirstVisit();
renderReviews();
renderFaq();
initBooking();
// Keep the open-now line right while the page stays open.
setInterval(renderStatus, 60 * 1000);
