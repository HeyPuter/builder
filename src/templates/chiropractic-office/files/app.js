// Northline Chiropractic: a one-page site for a chiropractic office.
//
// Everything the practice would change is plain data in this first part of
// the file: contact details, hours, the concerns on the spine map, the first
// visit, fees, coverage, questions, the team and patient stories. The code
// below it only renders that data and wires up the page.

// While true, the rating, reviews, insurance answers and the practice itself
// carry a small "Sample" label and the footer says so. Set it to false once
// every placeholder below has been replaced with the real thing.
const SAMPLE_CONTENT = true;

const PRACTICE = {
    name: 'Northline Chiropractic',
    tagline: 'Chiropractic, soft tissue and rehab',
    neighborhood: 'Downtown Boulder',
    street: '1418 Walnut Street, Suite 200',
    city: 'Boulder, CO 80302',
    phone: '(303) 555-0148',
    email: 'hello@northline.example',
    // Hours below are in this time zone, whatever zone the visitor is in.
    timeZone: 'America/Denver',
    parking: 'Two-hour street parking on Walnut, or the 14th Street garage (we validate). The HOP bus stops a block away.',
    // Optional. A URL that accepts a JSON POST of each booking request. When
    // empty, the form opens an email to `email` with the request filled in.
    formEndpoint: '',
    // Optional. Where new patients fill in intake forms before they come.
    formsUrl: '',
    // Optional. Where the "Read all reviews" link goes.
    reviewsUrl: '',
    rating: { average: 4.9, count: 286, source: 'Google' },
    firstVisitPrice: 79,
};

// One entry per weekday, Sunday first. Times are 24-hour "HH:MM" ranges.
const HOURS = [
    { day: 'Sunday', open: [] },
    { day: 'Monday', open: [['08:00', '12:00'], ['14:00', '18:30']] },
    { day: 'Tuesday', open: [['07:00', '13:00']] },
    { day: 'Wednesday', open: [['08:00', '12:00'], ['14:00', '18:30']] },
    { day: 'Thursday', open: [['07:00', '12:00'], ['15:00', '19:00']] },
    { day: 'Friday', open: [['08:00', '12:00'], ['14:00', '17:00']] },
    { day: 'Saturday', open: [['09:00', '12:00']] },
];

const HERO_QUOTE = {
    text: 'I had cancelled two ski trips because of my back. This winter I didn’t miss a weekend.',
    name: 'Maya R.',
    detail: 'Low back pain · 7 visits',
};

// The spine map. `spine` is the range it lights up, from vertebra ids C1-C7,
// T1-T12, L1-L5, S (sacrum) and Co (tailbone). Tapping a vertebra opens the
// first concern in this list whose range includes it. `plan` is typical, not
// a promise: visits are spread over the weeks, more at the start.
const CONCERNS = [
    {
        id: 'neck',
        name: 'Neck pain & stiffness',
        short: 'Neck',
        spine: ['C1', 'C7'],
        behind: 'Usually stiff joints and tight muscles from hours spent looking down or forward: laptops, phones, long drives. Sometimes it follows a whiplash or a bad night’s sleep.',
        check: ['How far you can turn and tilt', 'Joint movement, level by level', 'Arm strength, reflexes and sensation', 'Your desk, screen and pillow'],
        care: ['Gentle neck adjustments or low-force mobilization', 'Soft-tissue work for the upper shoulders and the base of the skull', 'Two or three five-minute exercises'],
        plan: { visits: 6, weeks: 4 },
        redFlag: 'neck pain follows a fall or a crash, or comes with numbness in both arms, a sudden severe headache or trouble speaking. Go to an emergency room.',
    },
    {
        id: 'upper-back',
        name: 'Upper back & shoulder blades',
        short: 'Upper back',
        spine: ['T1', 'T6'],
        behind: 'The ache between the shoulder blades that builds through the workday. Rounded shoulders and a forward head load the upper back for hours at a time.',
        check: ['Posture, standing and seated', 'Rib and upper back mobility', 'Shoulder blade control', 'How you breathe'],
        care: ['Upper back adjustments', 'Pin-and-stretch for the chest and the sides of the back', 'A desk reset and a band routine you can do at work'],
        plan: { visits: 5, weeks: 4 },
        redFlag: 'there is chest pain, shortness of breath, or pain spreading to the jaw or left arm. That can be your heart: call 911.',
    },
    {
        id: 'mid-back',
        name: 'Mid back & rib pain',
        short: 'Mid back',
        spine: ['T7', 'T12'],
        behind: 'Often a rib joint irritated by a twist, a cough or a heavy lift. It catches when you breathe in deeply or roll over in bed.',
        check: ['How each rib moves', 'Twisting and side bending', 'Where it hurts to press, and where it doesn’t'],
        care: ['Rib and mid-back mobilization', 'Soft-tissue work along the spine', 'Rotation drills to keep it moving'],
        plan: { visits: 4, weeks: 3 },
        redFlag: 'back pain comes with a fever, weight loss you can’t explain, or a history of cancer. That needs a medical work-up before hands-on care.',
    },
    {
        id: 'low-back',
        name: 'Low back pain',
        short: 'Low back',
        spine: ['L1', 'L5'],
        behind: 'The most common reason people come in. Most low back pain is mechanical (irritated joints, discs and muscles) and gets better with movement. Care helps it move along faster and stay away.',
        check: ['Which movements ease it and which flare it', 'Hip and pelvis mobility', 'Leg strength, reflexes and nerve tension', 'How you lift and sit'],
        care: ['Low back and pelvic adjustments', 'Soft-tissue work for the hips and back muscles', 'A short core and hip routine'],
        plan: { visits: 6, weeks: 4 },
        redFlag: 'you have numbness in the groin or inner thighs, new trouble controlling your bladder or bowels, or a leg getting weaker. Go to an emergency room now.',
    },
    {
        id: 'pelvis',
        name: 'Pelvis, SI joint & hips',
        short: 'Pelvis & hips',
        spine: ['S', 'Co'],
        behind: 'Pain low and to one side, near the dimples above the buttock. Often it is the sacroiliac joint, and it is common in runners, after a fall, and during or after pregnancy.',
        check: ['Sacroiliac joint tests', 'Hip rotation and strength', 'How you walk', 'Balance on one leg'],
        care: ['Pelvic adjustments or a drop-table technique', 'Glute and hip soft-tissue work', 'Hip strengthening'],
        plan: { visits: 5, weeks: 4 },
        redFlag: 'a fall onto the hip is followed by pain putting weight on that leg. It can be a fracture, so get it imaged first.',
    },
    {
        id: 'sciatica',
        name: 'Sciatica & leg pain',
        short: 'Sciatica',
        spine: ['L4', 'S'],
        nerve: true,
        behind: 'Pain, tingling or numbness that travels from the low back or buttock down the leg. Usually an irritated nerve root near a disc or joint, and most cases settle without surgery.',
        check: ['Straight-leg raise and other nerve tests', 'Strength, reflexes and sensation in each leg', 'Positions that pull the pain back toward the spine'],
        care: ['Gentle lumbar mobilization or flexion-distraction', 'Nerve-gliding exercises', 'Positions that ease it at work and in bed'],
        plan: { visits: 8, weeks: 6 },
        redFlag: 'the pain is in both legs, a foot slaps or drags when you walk, or your bladder or bowels change. That is an emergency: go to an ER.',
    },
    {
        id: 'headaches',
        name: 'Tension headaches',
        short: 'Headaches',
        spine: ['C1', 'C3'],
        skull: true,
        behind: 'A band-like ache at the back of the head or behind the eyes, often from tight muscles and stiff joints at the top of the neck. Worse at the end of a long screen day.',
        check: ['Upper neck joint movement', 'Tender points at the base of the skull', 'Jaw tension and posture', 'Your headache diary, if you keep one'],
        care: ['Upper neck mobilization', 'Release for the small muscles under the skull', 'Deep neck strengthening'],
        plan: { visits: 6, weeks: 5 },
        redFlag: 'it is the worst headache of your life, comes with a fever and a stiff neck, or brings vision loss or weakness. Call 911.',
    },
    {
        id: 'pregnancy',
        name: 'Back pain in pregnancy',
        short: 'Pregnancy',
        spine: ['L3', 'S'],
        behind: 'Your center of gravity moves forward and ligaments loosen, so the low back and pelvis carry more each month. Care is adapted to every trimester.',
        check: ['Pelvic and sacroiliac joint alignment', 'Hip and low back mobility', 'How you sleep, sit and lift'],
        care: ['Gentle adjustments side-lying or on a table with a belly cut-out', 'Soft-tissue work for the hips and low back', 'Exercises that are kind to the pelvic floor'],
        plan: { visits: 6, weeks: 6 },
        redFlag: 'you have bleeding, leaking fluid, regular contractions, or severe or one-sided belly pain. Call your OB or midwife right away.',
    },
];

// The first visit. Minutes should add up to the length of the visit.
const VISIT_STEPS = [
    { minutes: 10, title: 'Settle in', body: 'Check in, finish a short intake form (or do it online before you come) and get a glass of water.' },
    { minutes: 15, title: 'Your story', body: 'When it started, what makes it worse and what you want to get back to. We write your goal down in your words.' },
    { minutes: 15, title: 'Exam', body: 'Posture and movement, joint and muscle checks, then quick nerve tests: reflexes, strength, sensation. X-rays only if the exam calls for them.' },
    { minutes: 10, title: 'Findings & plan', body: 'What we found, in plain language and on a spine model. You leave with a written plan: visits, home exercises, a re-check date and the cost.' },
    { minutes: 10, title: 'First treatment', body: 'If it’s right for you and you’re comfortable, your first treatment is today. If it isn’t, we tell you who to see instead.' },
];

const BRING = [
    'Clothes you can bend and twist in',
    'Your insurance card and a photo ID',
    'Recent X-rays, MRI reports or doctor’s notes',
    'A list of the medications you take',
];

const FEES = [
    { name: 'First visit', detail: 'History, exam, written plan and your first treatment', minutes: 60, price: PRACTICE.firstVisitPrice },
    { name: 'Adjustment visit', detail: 'A quick re-check and a chiropractic adjustment', minutes: 15, price: 55 },
    { name: 'Adjustment + soft tissue', detail: 'Adds hands-on muscle work or instrument-assisted release', minutes: 30, price: 85 },
    { name: 'Rehab session', detail: 'Coached exercise to build strength and control', minutes: 30, price: 70 },
    { name: 'Massage therapy', detail: 'With our licensed massage therapist. 90 minutes: $150', minutes: 60, price: 110 },
    { name: 'Six-visit pack', detail: 'Six adjustment visits, shareable with family. Never expires', price: 300, badge: 'Save $30' },
];

// The coverage checker, and the payment choices in the booking form.
// status: 'in' (in network), 'covered' (billed for you), 'self' or 'out'.
const COVERAGE = [
    { id: 'self', label: 'Paying myself', status: 'self', title: 'Simple self-pay prices',
        body: `First visit $${PRACTICE.firstVisitPrice}, then $55 per adjustment visit, or $300 for a pack of six. HSA and FSA cards work here too.` },
    { id: 'bcbs', label: 'Blue Cross Blue Shield', status: 'in', title: 'In network',
        body: 'Most plans cover chiropractic with a copay. We check your benefits before your first visit and tell you what you’ll owe.' },
    { id: 'aetna', label: 'Aetna', status: 'in', title: 'In network',
        body: 'Most plans cover chiropractic with a copay. We check your benefits before your first visit and tell you what you’ll owe.' },
    { id: 'cigna', label: 'Cigna', status: 'in', title: 'In network',
        body: 'Some Cigna plans need a visit approved before care starts. We request it for you, so plan on a day or two.' },
    { id: 'uhc', label: 'UnitedHealthcare', status: 'in', title: 'In network',
        body: 'Most plans cover chiropractic with a copay. We check your benefits before your first visit and tell you what you’ll owe.' },
    { id: 'medicare', label: 'Medicare', status: 'covered', title: 'Covered, with limits',
        body: 'Medicare Part B covers spinal adjustments when they are medically necessary. Exams, X-rays and massage are not covered, and we explain any cost before we start.' },
    { id: 'auto', label: 'Car accident claim', status: 'covered', title: 'We bill the claim',
        body: 'We bill your auto policy (MedPay or PIP) directly and keep your adjuster or attorney updated. Bring your claim number.' },
    { id: 'work', label: 'Workers’ comp', status: 'covered', title: 'We bill the claim',
        body: 'Bring your claim number and your adjuster’s contact. We send reports to your employer’s carrier after each visit.' },
    { id: 'other', label: 'Another plan', status: 'out', title: 'Out of network, still an option',
        body: 'You pay the self-pay price and we give you a superbill to send your insurer for reimbursement. Call and we’ll check your out-of-network benefits.' },
];

const MYTHS = [
    { myth: 'The popping sound is bones cracking.',
        truth: 'It’s a small gas bubble releasing in the joint fluid, the same as cracking your knuckles. No pop is needed for an adjustment to help, and there are gentle, silent techniques if you prefer.' },
    { myth: 'Once you start, you have to keep going forever.',
        truth: 'Every plan has an end date. Visits taper off as you improve, and you leave with exercises to stay that way. Check-ups after that are your call, never assumed.' },
    { myth: 'Adjustments hurt.',
        truth: 'Most people feel pressure, not pain. Some feel a bit sore for a day, like after a workout. Tell us what you’re comfortable with; there is always a gentler option.' },
    { myth: 'You need a doctor’s referral.',
        truth: 'Not to see us. A few insurance plans want one before they pay, and we’ll tell you on the phone if yours does.' },
    { myth: 'Chiropractors only crack backs.',
        truth: 'A typical visit mixes joint work, soft-tissue therapy and exercise coaching. Some visits have no adjustment at all.' },
    { myth: 'Not better yet? You just need more visits.',
        truth: 'If you aren’t improving by your re-check, we change the plan or refer you to a physical therapist, your doctor or for imaging. We don’t just add visits.' },
];

const TEAM = [
    { id: 'okafor', name: 'Dr. Ada Okafor', creds: 'DC', role: 'Clinic director',
        photo: 'photos/team-ada.jpg', alt: 'Portrait of Dr. Ada Okafor, smiling',
        bio: 'Fifteen years in practice and two kids of her own. Ada sees a lot of low backs, pregnancies and new parents, and she will happily explain anything twice.',
        focus: ['Low back & sciatica', 'Pregnancy & postpartum', 'Webster certified'] },
    { id: 'brandt', name: 'Dr. Owen Brandt', creds: 'DC, CCSP', role: 'Sports chiropractor',
        photo: 'photos/team-owen.jpg', alt: 'Portrait of Dr. Owen Brandt, laughing',
        bio: 'A former college runner who looks after Boulder’s trail and climbing crowd. Owen pairs adjustments with the strength work that keeps an injury from coming back.',
        focus: ['Runners & climbers', 'Neck & shoulders', 'Return-to-sport plans'] },
    { id: 'reyes', name: 'Marco Reyes', creds: 'LMT', role: 'Massage therapist',
        photo: 'photos/team-marco.jpg', alt: 'Portrait of Marco Reyes outdoors, arms crossed',
        bio: 'Deep tissue without the bruises. Marco works from the same plan as your doctor, so your massage targets the same problem. Habla español.',
        focus: ['Deep tissue', 'Desk tension', 'Before & after races'] },
];

const STORIES = [
    { photo: 'photos/story-running.jpg', alt: 'A runner on a gravel road under a blue sky',
        cameIn: 'Sciatica down the left leg', backTo: 'Trail half marathons', visits: 9, weeks: 6,
        quote: 'Owen didn’t just treat my back, he fixed how I was running. Nine visits later I was back on the Mesa Trail with no leg pain.',
        name: 'Daniel K.' },
    { photo: 'photos/story-cycling.jpg', alt: 'A cyclist riding a quiet road between green hills',
        cameIn: 'Neck pain on long rides', backTo: 'Eighty-mile Saturdays', visits: 6, weeks: 4,
        quote: 'They looked at photos of my bike fit and my desk. My neck stopped being the thing that ended the ride.',
        name: 'Sam T.' },
    { photo: 'photos/story-hiking.jpg', alt: 'A hiker with a backpack on a leafy forest trail',
        cameIn: 'Low back pain after my second baby', backTo: 'Hiking with a toddler on my back', visits: 8, weeks: 6,
        quote: 'Ada was gentle and honest, and she never pushed extra visits. The exercises fit into nap time, and they worked.',
        name: 'Lena M.' },
    { photo: 'photos/story-yoga.jpg', alt: 'A woman stretching her arms up in a meadow at sunset',
        cameIn: 'A stiff mid back from desk work', backTo: 'Sunrise yoga, no wincing', visits: 5, weeks: 4,
        quote: 'Five visits and a desk reset. I didn’t realise how much I’d stopped turning my body until I could again.',
        name: 'Priya S.' },
];

const BOOKING_TIMES = ['Early morning', 'Late morning', 'Afternoon', 'After 5 pm'];

// ---------------------------------------------------------------------------
// Rendering and behaviour. Content changes belong in the data above.
// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }[c]));
const money = (n) => '$' + Number(n).toLocaleString('en-US');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sampleTag = () => (SAMPLE_CONTENT ? '<span class="sample-tag">Sample</span>' : '');

const ICONS = {
    check: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m4.5 10.5 3.5 3.5 7.5-8"/></svg>',
    alert: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3 2.5 16.5h15L10 3Z"/><path d="M10 8.2v3.6M10 14.2v.1"/></svg>',
};

// --- Practice details ---------------------------------------------------------

function renderPractice() {
    const digits = PRACTICE.phone.replace(/[^\d+]/g, '');
    const links = {
        phone: { href: 'tel:' + digits, text: PRACTICE.phone },
        email: { href: 'mailto:' + PRACTICE.email, text: PRACTICE.email },
        maps: { href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${PRACTICE.name}, ${PRACTICE.street}, ${PRACTICE.city}`) },
    };
    $$('[data-practice]').forEach((node) => {
        const value = PRACTICE[node.dataset.practice];
        if (typeof value === 'string') node.textContent = value;
    });
    $$('[data-practice-link]').forEach((node) => {
        const link = links[node.dataset.practiceLink];
        if (!link) return;
        node.href = link.href;
        if (link.text && !node.children.length) node.textContent = node.dataset.label || link.text;
    });
    $$('[data-year]').forEach((node) => { node.textContent = new Date().getFullYear(); });
    $$('[data-sample-note]').forEach((node) => { node.hidden = !SAMPLE_CONTENT; });
    if (PRACTICE.formsUrl) {
        $$('[data-forms-link]').forEach((node) => {
            node.href = PRACTICE.formsUrl;
            node.target = '_blank';
            node.rel = 'noopener';
        });
    } else {
        $$('[data-forms-link]').forEach((node) => node.remove());
    }
}

function renderHero() {
    const r = PRACTICE.rating;
    $('[data-proof]').innerHTML = `
        <li><p class="proof-value">${esc(r.average.toFixed(1))}<span class="proof-stars" aria-hidden="true">★★★★★</span></p><p class="proof-label">${esc(r.count)} ${esc(r.source)} reviews${sampleTag()}</p></li>
        ${COVERAGE.some((c) => c.status === 'in') ? '<li><p class="proof-value">In network</p><p class="proof-label">with most major plans</p></li>' : ''}
        <li><p class="proof-value">${money(PRACTICE.firstVisitPrice)}</p><p class="proof-label">first visit, self-pay</p></li>`;
    $('[data-hero-quote]').innerHTML = `
        <p>“${esc(HERO_QUOTE.text)}”</p>
        <footer><span class="hq-name">${esc(HERO_QUOTE.name)}</span><span class="hq-detail">${esc(HERO_QUOTE.detail)}</span>${sampleTag()}</footer>`;
}


// --- Hours and the live open/closed status ---------------------------------

const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
};

function clock(minutes, withSuffix = true) {
    const h24 = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    const h = h24 % 12 || 12;
    const suffix = h24 < 12 ? 'am' : 'pm';
    return `${h}${m ? ':' + String(m).padStart(2, '0') : ''}${withSuffix ? ' ' + suffix : ''}`;
}

function rangeText([from, to]) {
    const a = toMinutes(from);
    const b = toMinutes(to);
    const sameHalf = (a < 720) === (b < 720);
    return `${clock(a, !sameHalf)}–${clock(b)}`;
}

// The weekday and minute of the day at the office, wherever the visitor is.
function officeNow() {
    const now = new Date();
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: PRACTICE.timeZone, weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
        }).formatToParts(now);
        const part = (type) => parts.find((p) => p.type === type).value;
        const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(part('weekday'));
        if (day !== -1) return { day, minute: (Number(part('hour')) % 24) * 60 + Number(part('minute')) };
    } catch (e) { /* unknown time zone: fall back to the visitor's clock */ }
    return { day: now.getDay(), minute: now.getHours() * 60 + now.getMinutes() };
}

function hoursStatus(now = officeNow()) {
    const today = HOURS[now.day].open.map(([a, b]) => ({ start: toMinutes(a), end: toMinutes(b) }));
    const current = today.find((r) => now.minute >= r.start && now.minute < r.end);
    if (current) {
        const soon = current.end - now.minute <= 30;
        return { state: soon ? 'soon' : 'open', text: `${soon ? 'Closing soon' : 'Open now'} · until ${clock(current.end)}` };
    }
    const later = today.find((r) => r.start > now.minute);
    if (later) {
        const lunch = today.some((r) => r.end <= now.minute);
        return { state: 'closed', text: `${lunch ? 'Closed for lunch' : 'Closed'} · opens at ${clock(later.start)}` };
    }
    for (let i = 1; i <= 7; i++) {
        const next = HOURS[(now.day + i) % 7];
        if (next.open.length) {
            const when = i === 1 ? 'tomorrow' : next.day;
            return { state: 'closed', text: `Closed · opens ${when} at ${clock(toMinutes(next.open[0][0]))}` };
        }
    }
    return { state: 'closed', text: 'Closed' };
}

function renderStatus() {
    const status = hoursStatus();
    $$('[data-status]').forEach((node) => {
        node.dataset.state = status.state;
        $('[data-status-text]', node).textContent = status.text;
    });
    const today = officeNow().day;
    const order = [1, 2, 3, 4, 5, 6, 0];
    $('[data-hours] tbody').innerHTML = order.map((d) => {
        const h = HOURS[d];
        const times = h.open.length ? h.open.map(rangeText).join(', ') : 'Closed';
        return `<tr${d === today ? ' class="is-today"' : ''}><th scope="row">${esc(h.day)}${d === today ? ' <span class="today-tag">Today</span>' : ''}</th><td>${esc(times)}</td></tr>`;
    }).join('');
}

// --- Spine map -----------------------------------------------------------------

const VERTEBRAE = [
    ...Array.from({ length: 7 }, (_, i) => ({ id: 'C' + (i + 1), region: 'C' })),
    ...Array.from({ length: 12 }, (_, i) => ({ id: 'T' + (i + 1), region: 'T' })),
    ...Array.from({ length: 5 }, (_, i) => ({ id: 'L' + (i + 1), region: 'L' })),
    { id: 'S', region: 'S' },
    { id: 'Co', region: 'Co' },
];
const SPINE_ORDER = VERTEBRAE.map((v) => v.id);
const REGION_NAMES = { C: 'Cervical spine', T: 'Thoracic spine', L: 'Lumbar spine', S: 'Sacrum', Co: 'Tailbone' };

function inRange(id, [from, to]) {
    const i = SPINE_ORDER.indexOf(id);
    return i >= SPINE_ORDER.indexOf(from) && i <= SPINE_ORDER.indexOf(to);
}

function rangeLabel([from, to]) {
    if (from === to) return from;
    if (from === 'S' && to === 'Co') return 'Sacrum & tailbone';
    return `${from}–${to === 'S' ? 'sacrum' : to}`;
}

// A smooth curve through points [s, x] for s from 0 to 1 (Catmull-Rom).
function curve(points) {
    return (s) => {
        let i = points.findIndex((p, k) => k < points.length - 1 && s <= points[k + 1][0]);
        if (i === -1) i = points.length - 2;
        const p0 = points[Math.max(i - 1, 0)][1];
        const p1 = points[i][1];
        const p2 = points[i + 1][1];
        const p3 = points[Math.min(i + 2, points.length - 1)][1];
        const t = (s - points[i][0]) / (points[i + 1][0] - points[i][0]);
        const t2 = t * t;
        const t3 = t2 * t;
        return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
    };
}

// Lays the vertebrae out along a side-view S curve: the neck and low back
// curve forward (left), the upper back and sacrum curve back (right).
function buildSpine() {
    const sizes = { C: [12, 24, 4], T: [15, 29, 4], L: [21, 38, 6], S: [70, 44, 4], Co: [18, 14, 0] };
    let y = 78;
    const parts = VERTEBRAE.map((v, i) => {
        let [h, w, gap] = sizes[v.region];
        if (v.region === 'T') { h += i * 0.12 - 1; w += (i - 7) * 0.5; }
        if (v.region === 'L') { h += (i - 19) * 0.7; w += (i - 19) * 1.2; }
        const part = { ...v, top: y, h, w };
        y += h + gap;
        return part;
    });
    const total = y - 78;
    const offset = curve([[0, 2], [0.11, -12], [0.2, 0], [0.42, 22], [0.6, 6], [0.74, -14], [0.86, 0], [0.95, 22], [1, 14]]);
    const cx = 168;
    parts.forEach((p) => {
        const mid = p.top + p.h / 2;
        const s = (mid - 78) / total;
        p.x = cx + offset(s);
        p.y = mid;
        const ds = 0.01;
        const slope = (offset(Math.min(s + ds, 1)) - offset(Math.max(s - ds, 0))) / (2 * ds * total);
        p.angle = -Math.atan(slope) * 180 / Math.PI;
    });
    return { parts, height: y + 70 };
}

const SPINE = buildSpine();

function vertebraShape(p) {
    const { h, w } = p;
    if (p.region === 'S') {
        return `<path class="v-body" d="M${-w / 2} ${-h / 2} L${w / 2} ${-h / 2} Q${w / 2 + 4} ${h * 0.1} ${w / 6} ${h / 2} L${-w / 6} ${h / 2} Q${-w / 2 - 2} ${h * 0.05} ${-w / 2} ${-h / 2} Z"/>`;
    }
    if (p.region === 'Co') {
        return `<circle class="v-body" cx="0" cy="${-h / 4}" r="5"/><circle class="v-body" cx="1" cy="${h / 4 + 1}" r="3.6"/>`;
    }
    // A vertebral body (front, left) and its spinous process (back, right).
    const len = { C: 13, T: 20, L: 17 }[p.region];
    const drop = { C: 3, T: 9, L: 3 }[p.region];
    return `<rect class="v-body" x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${Math.min(5, h / 3)}"/>` +
        `<path class="v-proc" d="M${w / 2 - 2} ${-h / 2 + 2} L${w / 2 + len} ${drop - 2} Q${w / 2 + len + 3} ${drop + 1} ${w / 2 + len - 2} ${drop + 3} L${w / 2 - 2} ${h / 2 - 1} Z"/>`;
}

function renderSpine() {
    const { parts, height } = SPINE;
    const discs = parts.slice(0, -2).map((p, i) => {
        const next = parts[i + 1];
        const x = (p.x + next.x) / 2;
        const y = p.top + p.h + (next.top - p.top - p.h) / 2;
        return `<ellipse class="disc" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(Math.min(p.w, next.w) / 2 - 2).toFixed(1)}" ry="1.6" transform="rotate(${((p.angle + next.angle) / 2).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }).join('');
    const bones = parts.map((p) =>
        `<g class="v" data-v="${p.id}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${p.angle.toFixed(1)})"><title>${esc(p.id)}</title>${vertebraShape(p)}</g>`,
    ).join('');
    const labels = ['C', 'T', 'L', 'S'].map((region) => {
        const own = parts.filter((p) => p.region === region);
        const top = own[0].top;
        const bottom = own[own.length - 1].top + own[own.length - 1].h;
        const name = { C: 'Neck', T: 'Upper & mid back', L: 'Low back', S: 'Pelvis' }[region];
        const ids = region === 'S' ? 'Sacrum' : `${own[0].id}–${own[own.length - 1].id}`;
        const mid = (top + bottom) / 2;
        return `<g class="region-label"><path d="M86 ${top + 2} V${bottom - 2}"/><text x="78" y="${mid - 3}" text-anchor="end">${esc(name)}</text><text class="region-ids" x="78" y="${mid + 12}" text-anchor="end">${esc(ids)}</text></g>`;
    }).join('');
    const c1 = parts[0];
    const sacrum = parts.find((p) => p.id === 'S');
    const skull = `<text class="skull-label" x="${c1.x - 66}" y="${c1.top - 40}">Base of skull</text><path class="skull" d="M${c1.x - 64} ${c1.top - 30} C${c1.x - 40} ${c1.top + 4}, ${c1.x - 6} ${c1.top - 6}, ${c1.x + 14} ${c1.top - 12} C${c1.x + 40} ${c1.top - 20}, ${c1.x + 58} ${c1.top - 42}, ${c1.x + 64} ${c1.top - 66}"/>`;
    const nerve = `<path class="nerve" d="M${sacrum.x - 4} ${sacrum.y + 6} C${sacrum.x + 8} ${sacrum.y + 50}, ${sacrum.x + 2} ${sacrum.y + 86}, ${sacrum.x + 22} ${height - 8}"/>` +
        `<text class="nerve-label" x="${sacrum.x + 30}" y="${height - 18}">down the leg</text>`;
    $('[data-spine]').innerHTML = `
        <svg viewBox="0 0 320 ${Math.round(height)}" role="img" aria-label="Side view of the spine, from the neck down to the tailbone">
            ${labels}
            ${skull}
            ${nerve}
            <g class="discs">${discs}</g>
            <g class="bones">${bones}</g>
            <g class="bracket" data-bracket><path/><text x="0" y="0"></text></g>
        </svg>`;
}

let activeConcern = null;

function planWeeks({ visits, weeks }) {
    // Front-loaded: more visits early, tapering off as things improve.
    const base = Math.floor(visits / weeks);
    const extra = visits % weeks;
    return Array.from({ length: weeks }, (_, i) => base + (i < extra ? 1 : 0));
}

function selectConcern(id, { focus = false } = {}) {
    const concern = CONCERNS.find((c) => c.id === id) || CONCERNS[0];
    activeConcern = concern;
    $$('[data-concern-btn]').forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.concernBtn === concern.id)));
    const svg = $('[data-spine] svg');
    $$('.v', svg).forEach((g) => g.classList.toggle('is-on', inRange(g.dataset.v, concern.spine)));
    svg.classList.toggle('show-skull', !!concern.skull);
    svg.classList.toggle('show-nerve', !!concern.nerve);

    // The bracket to the right of the lit range, with its label.
    const lit = SPINE.parts.filter((p) => inRange(p.id, concern.spine));
    const top = lit[0].top - 2;
    const bottom = lit[lit.length - 1].top + lit[lit.length - 1].h + 2;
    const x = Math.max(...SPINE.parts.filter((p) => p.top + p.h >= top && p.top <= bottom).map((p) => p.x)) + 44;
    const bracket = $('[data-bracket]', svg);
    $('path', bracket).setAttribute('d', `M${x - 6} ${top} H${x} V${bottom} H${x - 6}`);
    const label = $('text', bracket);
    label.setAttribute('x', x + 8);
    label.setAttribute('y', (top + bottom) / 2 + 4);
    label.textContent = rangeLabel(concern.spine);

    const weeks = planWeeks(concern.plan);
    const firstRegion = VERTEBRAE.find((v) => v.id === concern.spine[0]).region;
    const regionText = firstRegion === 'S' ? 'Pelvis' : REGION_NAMES[firstRegion];
    $('[data-concern]').innerHTML = `
        <p class="concern-kicker">${esc(rangeLabel(concern.spine))} · ${esc(regionText)}</p>
        <h3 class="concern-title" tabindex="-1">${esc(concern.name)}</h3>
        <p class="concern-behind">${esc(concern.behind)}</p>
        <div class="concern-cols">
            <div><h4>What we check</h4><ul>${concern.check.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>
            <div><h4>Care usually includes</h4><ul>${concern.care.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>
        </div>
        <div class="plan">
            <div class="plan-copy"><p class="plan-num">${esc(concern.plan.visits)} <span>visits</span></p><p class="plan-sub">over about ${esc(concern.plan.weeks)} weeks, then a re-check</p></div>
            <ol class="plan-weeks" aria-label="Visits per week">${weeks.map((n, i) => `<li><span class="plan-dots">${'<i></i>'.repeat(n)}</span><span class="plan-wk">Wk ${i + 1}</span><span class="sr-only">: ${n} visit${n === 1 ? '' : 's'}</span></li>`).join('')}<li class="plan-recheck"><span class="plan-dots"><i></i></span><span class="plan-wk">Re-check</span></li></ol>
        </div>
        <p class="flag"><span class="flag-icon" aria-hidden="true">${ICONS.alert}</span><span><strong>See a doctor first if</strong> ${esc(concern.redFlag)}</span></p>
        <a class="btn btn-clay" href="#book" data-book-for="${esc(concern.id)}">Book a visit for ${esc(concern.short.toLowerCase())} <span aria-hidden="true">&rarr;</span></a>`;
    if (focus) $('.concern-title').focus({ preventScroll: true });
}

function setupSpine() {
    $('[data-concerns]').innerHTML = CONCERNS.map((c) =>
        `<button type="button" class="concern-btn" data-concern-btn="${esc(c.id)}" aria-pressed="false"><span class="concern-btn-name">${esc(c.name)}</span><span class="concern-btn-range">${esc(rangeLabel(c.spine))}</span></button>`,
    ).join('');
    renderSpine();
    $('[data-concerns]').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-concern-btn]');
        if (btn) selectConcern(btn.dataset.concernBtn);
    });
    const svg = $('[data-spine] svg');
    svg.addEventListener('click', (e) => {
        const g = e.target.closest('.v');
        if (!g) return;
        const match = CONCERNS.find((c) => inRange(g.dataset.v, c.spine));
        if (match) selectConcern(match.id, { focus: true });
    });
    selectConcern(CONCERNS[3].id);
}

// --- First visit -----------------------------------------------------------------

function setupTimeline() {
    $('[data-tl-bar]').innerHTML = VISIT_STEPS.map((s, i) =>
        `<span class="tl-seg" data-step="${i}" style="flex-grow:${s.minutes}"><span class="tl-seg-n">${i + 1}</span><span class="tl-seg-t">${esc(s.title)}</span></span>`,
    ).join('');
    let at = 0;
    $('[data-tl-steps]').innerHTML = VISIT_STEPS.map((s, i) => {
        const from = at;
        at += s.minutes;
        return `<li class="tl-step" data-step="${i}"><p class="tl-time">${from}–${at} min</p><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></li>`;
    }).join('');
    $('[data-bring]').innerHTML = BRING.map((b) => `<li><span class="bring-icon" aria-hidden="true">${ICONS.check}</span>${esc(b)}</li>`).join('');

    const timeline = $('[data-timeline]');
    const hot = (i) => $$('[data-step]', timeline).forEach((n) => n.classList.toggle('is-hot', n.dataset.step === i));
    timeline.addEventListener('mouseover', (e) => {
        const n = e.target.closest('[data-step]');
        if (n) hot(n.dataset.step);
    });
    timeline.addEventListener('mouseleave', () => hot(null));
}

// --- Fees and coverage -------------------------------------------------------------

function setupFees() {
    $('[data-fees]').innerHTML = FEES.map((f) => `
        <li class="fee">
            <div class="fee-main">
                <h3>${esc(f.name)}${f.badge ? ` <span class="fee-badge">${esc(f.badge)}</span>` : ''}</h3>
                <p>${esc(f.detail)}</p>
            </div>
            <span class="fee-leader" aria-hidden="true"></span>
            <span class="fee-meta">${f.minutes ? `<span class="fee-time">${esc(f.minutes)} min</span>` : ''}<span class="fee-price">${money(f.price)}</span></span>
        </li>`).join('');

    const select = $('[data-coverage-select]');
    select.innerHTML = `<option value="">Choose one</option>` + COVERAGE.map((c) => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('');
    const show = () => {
        const c = COVERAGE.find((x) => x.id === select.value);
        const box = $('[data-coverage-result]');
        if (!c) {
            const plans = COVERAGE.filter((x) => x.status === 'in');
            box.innerHTML = `<p class="coverage-empty">Pick how you’re paying to see what to expect. We double-check every plan before your first visit.</p>` +
                (plans.length ? `<ul class="coverage-plans" aria-label="In network with">${plans.map((x) => `<li>${esc(x.label)}</li>`).join('')}</ul>` : '');
            return;
        }
        box.innerHTML = `
            <p class="coverage-status" data-status-kind="${esc(c.status)}">${esc(c.title)}${sampleTag()}</p>
            <p>${esc(c.body)}</p>
            <a class="coverage-book" href="#book" data-book-payment-pick="${esc(c.id)}">Book with ${esc(c.id === 'self' ? 'self-pay' : c.label)} <span aria-hidden="true">&rarr;</span></a>`;
    };
    select.addEventListener('change', show);
    show();
}

// --- Myths --------------------------------------------------------------------------

function setupMyths() {
    $('[data-myths]').innerHTML = MYTHS.map((m, i) => `
        <article class="myth">
            <p class="myth-label">You may have heard</p>
            <h3 class="myth-q"><span>“${esc(m.myth)}”</span></h3>
            <div class="myth-a" id="myth-${i}" hidden><p class="myth-label myth-label-truth">What actually happens</p><p>${esc(m.truth)}</p></div>
            <button type="button" class="myth-btn" aria-expanded="false" aria-controls="myth-${i}"><span class="myth-btn-text">What actually happens</span><span class="myth-btn-icon" aria-hidden="true"></span></button>
        </article>`).join('');
    const set = (card, open) => {
        card.classList.toggle('is-open', open);
        $('.myth-a', card).hidden = !open;
        const btn = $('.myth-btn', card);
        btn.setAttribute('aria-expanded', String(open));
        $('.myth-btn-text', btn).textContent = open ? 'Hide the answer' : 'What actually happens';
    };
    const all = $('[data-myths-all]');
    const syncAll = () => {
        const open = $$('.myth').every((c) => c.classList.contains('is-open'));
        all.setAttribute('aria-pressed', String(open));
        all.textContent = open ? 'Hide every answer' : 'Show every answer';
    };
    $('[data-myths]').addEventListener('click', (e) => {
        const btn = e.target.closest('.myth-btn');
        if (!btn) return;
        const card = btn.closest('.myth');
        set(card, !card.classList.contains('is-open'));
        syncAll();
    });
    all.addEventListener('click', () => {
        const open = all.getAttribute('aria-pressed') !== 'true';
        $$('.myth').forEach((c) => set(c, open));
        syncAll();
    });
}

// --- Team and stories ----------------------------------------------------------------

function setupTeam() {
    $('[data-team]').innerHTML = TEAM.map((t) => `
        <article class="person">
            <div class="person-photo"><img src="${esc(t.photo)}" alt="${esc(t.alt)}" width="640" height="800" loading="lazy"></div>
            <div class="person-body">
                <p class="person-role">${esc(t.role)}</p>
                <h3>${esc(t.name)}<span class="person-creds">${esc(t.creds)}</span></h3>
                <p class="person-bio">${esc(t.bio)}</p>
                <ul class="person-focus">${t.focus.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
                <a class="person-book" href="#book" data-book-with="${esc(t.id)}">Book with ${esc(t.name.replace(/^Dr\.\s+/, '').split(' ')[0])} <span aria-hidden="true">&rarr;</span></a>
            </div>
        </article>`).join('');
}

function setupStories() {
    const r = PRACTICE.rating;
    $('[data-rating]').innerHTML = `
        <span class="rating-num">${esc(r.average.toFixed(1))}</span><span class="rating-stars" aria-hidden="true">★★★★★</span>
        <span class="rating-count">from ${esc(r.count)} ${esc(r.source)} reviews</span>${sampleTag()}
        ${PRACTICE.reviewsUrl ? `<a class="rating-link" href="${esc(PRACTICE.reviewsUrl)}" target="_blank" rel="noopener">Read them all <span aria-hidden="true">&rarr;</span></a>` : ''}`;
    const track = $('[data-stories]');
    track.innerHTML = STORIES.map((s) => `
        <figure class="story">
            <img src="${esc(s.photo)}" alt="${esc(s.alt)}" width="600" height="800" loading="lazy">
            <p class="story-top"><span class="story-name">${esc(s.name)}</span><span class="story-visits">${esc(s.visits)} visits · ${esc(s.weeks)} weeks</span>${sampleTag()}</p>
            <figcaption class="story-body">
                <p class="story-swap"><span class="swap-label">Came in with</span>${esc(s.cameIn)}</p>
                <p class="story-swap story-back"><span class="swap-label">Back to</span>${esc(s.backTo)}</p>
                <blockquote>“${esc(s.quote)}”</blockquote>
            </figcaption>
        </figure>`).join('');

    // Arrow buttons page through the cards; each is disabled at its end.
    const prev = $('[data-stories-prev]');
    const next = $('[data-stories-next]');
    const step = () => {
        const card = $('.story', track);
        return card ? card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 0) : track.clientWidth;
    };
    const sync = () => {
        prev.disabled = track.scrollLeft <= 2;
        next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
        $('.carousel-btns').hidden = prev.disabled && next.disabled;
    };
    prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior: reducedMotion ? 'auto' : 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: step(), behavior: reducedMotion ? 'auto' : 'smooth' }));
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    sync();
}

// --- Booking ----------------------------------------------------------------------

function setupBooking() {
    const form = $('[data-book-form]');
    const done = $('[data-book-done]');
    const concern = $('[data-book-concern]');
    const practitioner = $('[data-book-practitioner]');
    const payment = $('[data-book-payment]');

    concern.innerHTML = '<option value="">Choose what fits best</option>' + CONCERNS.map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('') +
        '<option value="checkup">A check-up, nothing hurts</option><option value="other">Something else</option>';
    practitioner.innerHTML = '<option value="">Whoever is free first</option>' +
        TEAM.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}, ${esc(t.role.toLowerCase())}</option>`).join('');
    payment.innerHTML = '<option value="">Not sure yet</option>' + COVERAGE.map((c) => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('');

    const order = [1, 2, 3, 4, 5, 6, 0];
    $('[data-book-days]').innerHTML = order.filter((d) => HOURS[d].open.length).map((d) =>
        `<label class="chip"><input type="checkbox" name="days" value="${esc(HOURS[d].day)}"><span>${esc(HOURS[d].day.slice(0, 3))}</span></label>`,
    ).join('');
    $('[data-book-times]').innerHTML = BOOKING_TIMES.map((t) =>
        `<label class="chip"><input type="checkbox" name="times" value="${esc(t)}"><span>${esc(t)}</span></label>`,
    ).join('');

    // Buttons elsewhere on the page that start a booking with a choice made.
    const flash = (field) => {
        const wrap = field.closest('.field');
        wrap.classList.remove('is-flash');
        void wrap.offsetWidth;
        wrap.classList.add('is-flash');
    };
    document.addEventListener('click', (e) => {
        const a = e.target.closest('[data-book-for], [data-book-with], [data-book-payment-pick]');
        if (!a) return;
        showForm();
        if (a.dataset.bookFor) { concern.value = a.dataset.bookFor; flash(concern); }
        if (a.dataset.bookWith) { practitioner.value = a.dataset.bookWith; flash(practitioner); }
        if (a.dataset.bookPaymentPick) { payment.value = a.dataset.bookPaymentPick; flash(payment); }
    });

    const error = $('[data-form-error]');
    const fail = (message, field) => {
        error.textContent = message;
        error.hidden = false;
        if (field) {
            field.setAttribute('aria-invalid', 'true');
            field.focus();
        }
    };
    form.addEventListener('input', (e) => {
        if (e.target.getAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid');
        error.hidden = true;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const name = String(data.get('name') || '').trim();
        const phone = String(data.get('phone') || '').trim();
        const email = String(data.get('email') || '').trim();
        if (!name) return fail('Please add your name.', form.elements.name);
        if (phone.replace(/\D/g, '').length < 7) return fail('Please add a phone number we can call or text.', form.elements.phone);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('That email address doesn’t look right.', form.elements.email);

        const label = (list, id, fallback) => (list.find((x) => x.id === id) || {}).label || fallback;
        const request = {
            concern: concern.value ? concern.options[concern.selectedIndex].text : 'Not specified',
            practitioner: practitioner.value ? (TEAM.find((t) => t.id === practitioner.value) || {}).name : 'First available',
            visitType: data.get('visitType'),
            days: data.getAll('days'),
            times: data.getAll('times'),
            payment: label(COVERAGE, payment.value, 'Not sure yet'),
            name, phone, email,
            notes: String(data.get('notes') || '').trim(),
            sentAt: new Date().toISOString(),
        };
        const lines = [
            `Name: ${request.name}`,
            `Phone: ${request.phone}`,
            request.email && `Email: ${request.email}`,
            `Visit: ${request.visitType}`,
            `Reason: ${request.concern}`,
            `With: ${request.practitioner}`,
            `Days: ${request.days.join(', ') || 'Any'}`,
            `Time of day: ${request.times.join(', ') || 'Any'}`,
            `Paying: ${request.payment}`,
            request.notes && `Notes: ${request.notes}`,
        ].filter(Boolean);

        const submit = $('[data-book-submit]');
        let viaEmail = !PRACTICE.formEndpoint;
        if (!viaEmail) {
            submit.disabled = true;
            submit.textContent = 'Sending…';
            try {
                const res = await fetch(PRACTICE.formEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify(request),
                });
                if (!res.ok) throw new Error('HTTP ' + res.status);
            } catch (err) {
                submit.disabled = false;
                submit.textContent = 'Send request';
                return fail(`Your request didn’t go through. Please try again, or call us at ${PRACTICE.phone}.`);
            }
            submit.disabled = false;
            submit.textContent = 'Send request';
        } else {
            const subject = `Visit request: ${request.name} (${request.concern})`;
            const mail = document.createElement('a');
            mail.href = `mailto:${PRACTICE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
            mail.click();
        }

        done.innerHTML = `
            <span class="done-icon" aria-hidden="true">${ICONS.check}</span>
            <h3>${viaEmail ? 'Almost there: send the email' : 'Request sent'}</h3>
            <p>${viaEmail
        ? `Your email app should have opened with the request filled in. Press send and we’ll call or text ${esc(request.phone)} to confirm a time. If nothing opened, call us at <a href="tel:${esc(PRACTICE.phone.replace(/[^\d+]/g, ''))}">${esc(PRACTICE.phone)}</a>.`
        : `Thanks, ${esc(request.name.split(' ')[0])}. We’ll call or text ${esc(request.phone)} to confirm a time.`}</p>
            <dl class="done-list">${lines.map((l) => {
        const [k, ...v] = l.split(': ');
        return `<div><dt>${esc(k)}</dt><dd>${esc(v.join(': '))}</dd></div>`;
    }).join('')}</dl>
            <button type="button" class="btn btn-ghost btn-sm" data-book-edit>Change the request</button>`;
        form.hidden = true;
        done.hidden = false;
        done.focus();
    });

    function showForm() {
        form.hidden = false;
        done.hidden = true;
    }
    done.addEventListener('click', (e) => {
        if (e.target.closest('[data-book-edit]')) {
            showForm();
            form.elements.name.focus();
        }
    });
}

// --- Page chrome ----------------------------------------------------------------------

function setupChrome() {
    const nav = $('[data-nav]');
    const btn = $('[data-menu-btn]');
    const menu = $('[data-menu]');
    const setMenu = (open) => {
        btn.setAttribute('aria-expanded', String(open));
        menu.hidden = !open;
        nav.classList.toggle('menu-open', open);
    };
    btn.addEventListener('click', () => setMenu(btn.getAttribute('aria-expanded') !== 'true'));
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !menu.hidden) {
            setMenu(false);
            btn.focus();
        }
    });
    window.matchMedia('(min-width: 1001px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });

    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // On published pages a small "Made with Puter" pill sits in the bottom-right
    // corner. While it is there, the phone bar on small screens grows to leave
    // room for it, so it never covers the Book button.
    const syncBadge = () => document.body.classList.toggle('has-badge', !!$('puter-badge'));
    new MutationObserver(syncBadge).observe(document.body, { childList: true });
    syncBadge();

    // The phone bar on small screens hides while the booking form is on screen.
    const bar = $('[data-action-bar]');
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => bar.classList.toggle('is-hidden', entry.isIntersecting), { threshold: 0.15 })
            .observe($('#book'));
    }

    // Sections ease in as they scroll into view.
    const items = $$('.sec-head, .about-copy, .about-photo, .spine-grid, .timeline, .bring, .fees, .coverage, .myth, .person, .stories, .book-aside, .book-card, .visit-grid');
    if (reducedMotion || !('IntersectionObserver' in window)) return;
    const seen = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in');
            seen.unobserve(entry.target);
        });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach((n) => {
        if (n.getBoundingClientRect().top > window.innerHeight) {
            n.classList.add('will-reveal');
            seen.observe(n);
        }
    });
}

renderPractice();
renderHero();
renderStatus();
setupSpine();
setupTimeline();
setupFees();
setupMyths();
setupTeam();
setupStories();
setupBooking();
setupChrome();
setInterval(renderStatus, 60 * 1000);
