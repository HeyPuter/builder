// Harlow & Finch Insurance: a one-page site for an independent insurance agency.
//
// Everything an agency would change is plain data at the top of this file:
// contact details and hours, the carriers you represent, the coverage cards,
// the coverage checkup (its questions and the rules that turn answers into
// recommendations), claim guides, agents, reviews and questions. The code
// below the data renders it and wires up the page.

// --- Agency ------------------------------------------------------------------

const AGENCY = {
    name: 'Harlow & Finch Insurance',
    phone: '(614) 555-0142',
    claimsPhone: '(614) 555-0199',
    email: 'hello@harlowfinch.example',
    street: '118 Elm Street, Suite 2',
    city: 'Riverton, OH 45001',
    states: 'OH, KY & IN',
    license: 'Ohio agency license #1234567.',
    rating: '4.9',
    reviewCount: '380+',
    carrierCount: 14,
    // Opening hours are read in this time zone, whatever the visitor's own.
    timeZone: 'America/New_York',
    // Day 0 is Sunday. [open, close] in 24-hour "HH:MM", or null when closed.
    hours: [
        null,
        ['08:30', '17:30'],
        ['08:30', '17:30'],
        ['08:30', '17:30'],
        ['08:30', '17:30'],
        ['08:30', '17:30'],
        ['09:00', '12:00'],
    ],
    // Where quote requests go. Empty: the visitor sends the finished request
    // from their own email app, addressed to `email`. Set a form endpoint URL
    // (Formspree, Basin, your own worker...) to POST it there as JSON instead.
    quoteEndpoint: '',
};

// --- Carriers ------------------------------------------------------------------
// Example names. `style` picks a wordmark look: serif, caps, italic, heavy, thin.

const CARRIERS = [
    { name: 'Northwind Mutual', style: 'serif', icon: 'wind' },
    { name: 'Keystone General', style: 'caps', icon: 'landmark' },
    { name: 'Bluepeak', style: 'heavy', icon: 'mountain' },
    { name: 'Meridian Life', style: 'italic', icon: 'sun' },
    { name: 'Harborline', style: 'thin', icon: 'anchor' },
    { name: 'Copperleaf', style: 'serif', icon: 'leaf' },
];

// --- Coverage --------------------------------------------------------------------
// `short` labels the quote chips; `covers` and `fit` fill the card.

const COVERAGES = [
    { id: 'home', line: 'personal', name: 'Homeowners', short: 'Home', icon: 'house',
        covers: 'The house, everything in it, and you if someone gets hurt on your property.',
        fit: 'you own a house, with or without a mortgage.' },
    { id: 'auto', line: 'personal', name: 'Auto', short: 'Auto', icon: 'car',
        covers: 'Accidents, theft and hail, plus the other driver’s bills when it’s your fault.',
        fit: 'anyone in the household drives.' },
    { id: 'renters', line: 'personal', name: 'Renters & condo', short: 'Renters / condo', icon: 'key-round',
        covers: 'Your belongings, a condo’s walls-in, and a hotel if a fire sends you out.',
        fit: 'a landlord or HOA insures the building, not you.' },
    { id: 'life', line: 'personal', name: 'Term life', short: 'Life', icon: 'heart-pulse',
        covers: 'A tax-free payout that replaces your income and clears the mortgage.',
        fit: 'a partner, kids or a mortgage rely on your paycheck.' },
    { id: 'umbrella', line: 'personal', name: 'Umbrella', short: 'Umbrella', icon: 'umbrella',
        covers: 'A million or more of extra liability on top of home and auto, for the lawsuit nobody expects.',
        fit: 'you have a pool, a teen driver or savings to protect.' },
    { id: 'flood', line: 'personal', name: 'Flood', short: 'Flood', icon: 'waves',
        covers: 'Rising water, which home and renters policies leave out. Building and belongings.',
        fit: 'it rains where you live. Many claims come from outside flood zones.' },
    { id: 'recreational', line: 'personal', name: 'Boat, RV & bike', short: 'Boat & RV', icon: 'sailboat',
        covers: 'The toys your car policy stops covering once they leave the driveway.',
        fit: 'weekends involve a trailer hitch or a helmet.' },
    { id: 'valuables', line: 'personal', name: 'Valuables', short: 'Valuables', icon: 'gem',
        covers: 'Rings, watches, art and gear at full appraised value, even if they’re lost.',
        fit: 'one item is worth more than a few thousand dollars.' },

    { id: 'bop', line: 'business', name: 'Business owner’s policy', short: 'Business owner’s', icon: 'store',
        covers: 'Property and liability in one package, priced for small businesses.',
        fit: 'you have a shop, office or studio.' },
    { id: 'liability', line: 'business', name: 'General liability', short: 'General liability', icon: 'shield-check',
        covers: 'Customer injuries, property damage and advertising claims against your business.',
        fit: 'clients visit you, or you work at theirs.' },
    { id: 'workers', line: 'business', name: 'Workers’ comp', short: 'Workers’ comp', icon: 'hard-hat',
        covers: 'Medical bills and lost wages when someone is hurt on the job.',
        fit: 'you have employees. Most states require it.' },
    { id: 'commercial-auto', line: 'business', name: 'Commercial auto', short: 'Commercial auto', icon: 'truck',
        covers: 'Vans, trucks and cars used for work, and the employees driving them.',
        fit: 'your vehicles carry tools, goods or a logo.' },
    { id: 'professional', line: 'business', name: 'Professional liability', short: 'Professional', icon: 'briefcase',
        covers: 'Claims that your advice or work cost a client money. Also called E&O.',
        fit: 'you sell expertise: design, consulting, accounting, IT.' },
    { id: 'cyber', line: 'business', name: 'Cyber', short: 'Cyber', icon: 'laptop',
        covers: 'Data breaches, ransomware and the cost of notifying your customers.',
        fit: 'you keep customer data or take card payments.' },
    { id: 'bonds', line: 'business', name: 'Surety bonds', short: 'Bonds', icon: 'file-badge',
        covers: 'License, permit and contract bonds, often issued the same day.',
        fit: 'a city, client or licensing board asks for one.' },
    { id: 'home-business', line: 'business', name: 'Home business', short: 'Home business', icon: 'lamp-desk',
        covers: 'Business gear, inventory and client visits that a home policy excludes.',
        fit: 'you run a side gig or small business from home.' },
];

// The quick picks in the hero, with an optional shorter label.
const STARTER = [
    { id: 'home' }, { id: 'auto' }, { id: 'renters', label: 'Renters' },
    { id: 'life' }, { id: 'umbrella' }, { id: 'bop', label: 'Business' },
];

// --- Coverage checkup ------------------------------------------------------------
// `one` questions take a single answer, `many` any number. `when` hides a
// question that does not apply (its answer is then ignored).

const CHECKUP = [
    { id: 'home', type: 'one', q: 'Where do you live?',
        options: [['house', 'I own a house'], ['condo', 'I own a condo'], ['rent', 'I rent'], ['family', 'With family']] },
    { id: 'cars', type: 'one', q: 'How many vehicles are in your household?',
        options: [['0', 'None'], ['1', 'One'], ['2', 'Two'], ['3', 'Three or more']] },
    { id: 'young', type: 'one', q: 'Does anyone under 25 drive them?',
        hint: 'Young drivers raise the stakes of an at-fault accident.',
        skipped: 'Skipped: no vehicles.',
        when: (a) => a.cars !== '0',
        options: [['yes', 'Yes'], ['no', 'No']] },
    { id: 'income', type: 'one', q: 'Would anyone struggle without your income?',
        options: [['yes', 'Yes'], ['unsure', 'Not sure'], ['no', 'No']] },
    { id: 'work', type: 'one', q: 'Do you run a business or a side gig?',
        options: [['no', 'No'], ['home', 'Yes, from home'], ['shop', 'Yes, with a location or staff']] },
    { id: 'extras', type: 'many', q: 'Do any of these apply?', hint: 'Pick all that fit.',
        options: [['pool', 'Pool or trampoline'], ['dog', 'A dog'], ['toys', 'Boat, RV or motorcycle'],
            ['water', 'Near a river or coast'], ['valuables', 'Jewelry or collections'], ['assets', 'Savings over $500k'],
            ['none', 'None of these']] },
];

const has = (a, key, value) => Array.isArray(a[key]) && a[key].includes(value);

// Each rule that matches adds its coverage. The same coverage from two rules
// keeps the stronger level. `cover: null` is a tip with its own name and icon.
// Levels: essential, consider, tip.
const RULES = [
    { when: (a) => a.home === 'house', cover: 'home', level: 'essential',
        why: 'Your lender almost certainly requires it, and it’s what rebuilds the house after a fire or storm.' },
    { when: (a) => a.home === 'condo', cover: 'renters', level: 'essential', name: 'Condo (HO-6)',
        why: 'Your HOA insures the building, not your walls-in, your things or your liability.' },
    { when: (a) => a.home === 'rent', cover: 'renters', level: 'essential', name: 'Renters',
        why: 'Your landlord’s policy covers the building only. Renters insurance covers your things and your liability for a few dollars a week.' },
    { when: (a) => a.home === 'family', cover: 'renters', level: 'tip', name: 'Check the household policy',
        why: 'Relatives living together are often covered under the homeowner’s policy. Worth a two-minute check.' },
    { when: (a) => Number(a.cars) > 0, cover: 'auto', level: 'essential',
        why: 'Required by law. We size the liability limits to what you own, not just the state minimum.' },
    { when: (a) => a.young === 'yes', cover: 'umbrella', level: 'consider',
        why: 'Young drivers have more serious accidents. An umbrella adds a million or more of liability above your auto policy.' },
    { when: (a) => a.income === 'yes', cover: 'life', level: 'essential',
        why: 'Term life replaces your income for the years your family depends on it, and costs less than most people guess.' },
    { when: (a) => a.income === 'unsure', cover: 'life', level: 'consider',
        why: 'A quick needs check tells you whether you need it and how much. Many policies need no medical exam.' },
    { when: (a) => a.work === 'home', cover: 'home-business', level: 'essential',
        why: 'Home policies cover little business equipment and no business liability. A home-business policy closes the gap.' },
    { when: (a) => a.work === 'shop', cover: 'bop', level: 'essential',
        why: 'Bundles property and liability for your location, usually for less than buying them apart.' },
    { when: (a) => a.work === 'shop', cover: 'workers', level: 'consider',
        why: 'Required in most states once you have employees, and it shields you from injury lawsuits.' },
    { when: (a) => has(a, 'extras', 'pool') || has(a, 'extras', 'dog'), cover: 'umbrella', level: 'consider',
        why: 'Pool accidents and dog bites are among the most common liability claims. Umbrella cover is cheap per million.' },
    { when: (a) => has(a, 'extras', 'assets'), cover: 'umbrella', level: 'essential',
        why: 'A lawsuit can reach savings and future wages. An umbrella protects what you’ve built.' },
    { when: (a) => has(a, 'extras', 'toys'), cover: 'recreational', level: 'essential',
        why: 'Boats, RVs and motorcycles need their own policy once they leave the driveway.' },
    { when: (a) => has(a, 'extras', 'water'), cover: 'flood', level: 'consider',
        why: 'Home and renters policies exclude flood, and new flood policies usually wait 30 days to start.' },
    { when: (a) => has(a, 'extras', 'valuables'), cover: 'valuables', level: 'consider',
        why: 'Home policies cap jewelry theft at a few thousand dollars. Listing items covers them in full, even if lost.' },
    { when: (a) => a.home === 'house' && Number(a.cars) > 0, cover: null, level: 'tip',
        name: 'Bundle home and auto', icon: 'layers',
        why: 'Most carriers discount both policies when they’re together. We’ll price it both ways.' },
];

// --- Claims ----------------------------------------------------------------------

const CLAIM_GUIDES = [
    { id: 'auto', label: 'Car accident', icon: 'car', steps: [
        ['Get safe, then call 911 if anyone is hurt', 'Move out of traffic if you can and turn on your hazard lights.'],
        ['Swap details with the other driver', 'Name, phone, insurer and policy number, plate and license.'],
        ['Take photos of everything', 'Both cars, the scene, road signs and the other driver’s insurance card.'],
        ['Don’t admit fault or agree to settle', 'Stick to the facts. Fault is for the adjusters to decide.'],
        ['Call our claims line', 'We open the claim, line up a rental and point you to a trusted body shop.'],
    ] },
    { id: 'water', label: 'Water leak', icon: 'droplets', steps: [
        ['Shut off the water at the main', 'Usually where the line enters the house, near the meter.'],
        ['Cut the power to wet rooms', 'Only if you can reach the breaker without standing in water.'],
        ['Photograph the damage before cleanup', 'Wide shots first, then close-ups of floors, walls and belongings.'],
        ['Start drying out', 'Mop up, open windows and run fans. Keep receipts for anything you buy.'],
        ['Call our claims line', 'We’ll get a water mitigation crew out, often the same day.'],
    ] },
    { id: 'storm', label: 'Storm damage', icon: 'cloud-lightning', steps: [
        ['Stay clear of downed lines', 'Report them to the utility. Never touch anything in contact with a wire.'],
        ['Make temporary repairs', 'Tarp the roof and board windows to prevent more damage. Save the receipts.'],
        ['Document roof, siding and gutters', 'Take photos from the ground. Don’t climb a damaged roof.'],
        ['Be careful with door-to-door roofers', 'Never sign anything assigning your claim to a contractor.'],
        ['Call our claims line', 'We’ll get an adjuster scheduled and review the estimate with you.'],
    ] },
    { id: 'theft', label: 'Break-in or theft', icon: 'lock', steps: [
        ['Leave and call the police', 'Don’t go inside if the intruder may still be there.'],
        ['Get a copy of the police report', 'Carriers need the report number to open a theft claim.'],
        ['List what’s missing', 'Photos, receipts and serial numbers all help prove value.'],
        ['Lock down cards and accounts', 'Cancel stolen cards and change the locks if keys were taken.'],
        ['Call our claims line', 'We’ll open the claim and help you put together the inventory.'],
    ] },
];

// --- Agents, reviews, questions -------------------------------------------------

const AGENTS = [
    { name: 'Margaret Harlow', role: 'Founder & principal agent', since: 1994, photo: 'photos/agent-margaret.jpg',
        tags: ['Home', 'Life', 'Umbrella'], languages: 'English', phone: '(614) 555-0143' },
    { name: 'Daniel Finch', role: 'Partner, personal lines', since: 2009, photo: 'photos/agent-daniel.jpg',
        tags: ['Auto', 'Home', 'Young drivers'], languages: 'English', phone: '(614) 555-0144' },
    { name: 'Elena Vargas', role: 'Commercial lines', since: 2016, photo: 'photos/agent-elena.jpg',
        tags: ['Small business', 'Contractors', 'Cyber'], languages: 'English, Spanish', phone: '(614) 555-0145' },
    { name: 'Andre Whitfield', role: 'Claims advocate', since: 2012, photo: 'photos/agent-andre.jpg',
        tags: ['Claims', 'Flood', 'Storm damage'], languages: 'English', phone: '(614) 555-0146' },
];

const REVIEWS = [
    { featured: true, name: 'Renee & Tom K.', town: 'Riverton', tag: 'Home + auto · saved $640 a year',
        text: 'Our rate jumped 31% at renewal. Daniel re-shopped it in a day and we ended up with better coverage for $640 less. That’s the whole pitch, and it’s true.' },
    { name: 'Marcus J.', town: 'Cedar Hill', tag: 'Water claim · paid in 11 days',
        text: 'When a pipe burst over Christmas, Andre picked up on the second ring. An adjuster was at our door the next morning.' },
    { name: 'Ana L.', town: 'Riverton', tag: 'Business owner’s policy',
        text: 'Elena found a policy for my bakery that actually covers the walk-in cooler. The online quotes never even asked about it.' },
    { name: 'Jordan P.', town: 'Millbrook', tag: 'Auto · young driver',
        text: 'I’m 24 with a speeding ticket. They found me a carrier that didn’t treat me like a crash-test dummy.' },
    { name: 'Ifeoma O.', town: 'Ashford', tag: 'Term life',
        text: 'Margaret walked us through term life on a Saturday with the baby on my lap. No pressure, just clear numbers.' },
];

const FAQ = [
    ['What is an independent insurance agent?',
        'We’re licensed with many insurance companies instead of just one. That lets us compare price and coverage across carriers and recommend the one that fits you, not the one we’re paid to push.'],
    ['Does it cost more to buy through an agent?',
        'No. Carriers pay us a commission that’s already built into the price, whether you buy direct or through us. You pay the same premium and get a person to call.'],
    ['What do I need for a quote?',
        'For a home: the address and roughly when the roof was replaced. For a car: each driver’s license number and the year, make and model. Your current declarations page helps us match your coverage exactly.'],
    ['Can you review the policy I already have?',
        'Yes, and it’s free. Send us your declarations pages and we’ll show you where you’re over- or under-insured, even if you decide not to switch.'],
    ['Will a quote affect my credit score?',
        'No. Some carriers look at a credit-based insurance score, which is a soft check that never affects your credit score.'],
    ['What happens when my policy renews?',
        'We review every renewal. If the price jumps or your life changes, we re-shop the market and tell you whether switching is worth it.'],
];

// --- Helpers --------------------------------------------------------------------------

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name) => `<i data-lucide="${esc(name)}" aria-hidden="true"></i>`;
const coverage = (id) => COVERAGES.find((c) => c.id === id);
const telHref = (phone) => `tel:+1${String(phone).replace(/\D/g, '').slice(-10)}`;
const initials = (name) => name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join('');
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollToEl = (el) => el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });

// Icons are a nicety: the page works without them if the CDN is unreachable.
let lucide = null;
function refreshIcons() {
    if (lucide) lucide.createIcons({ icons: lucide.icons });
}
import('https://cdn.jsdelivr.net/npm/lucide@1.40.0/+esm')
    .then((mod) => { lucide = mod; refreshIcons(); })
    .catch(() => {});

// --- Agency details, hours and the open-now badge --------------------------------

function fillAgency() {
    $$('[data-agency]').forEach((el) => {
        const value = AGENCY[el.dataset.agency];
        if (value !== undefined) el.textContent = value;
    });
    const links = {
        phone: [telHref(AGENCY.phone), AGENCY.phone],
        claimsPhone: [telHref(AGENCY.claimsPhone), AGENCY.claimsPhone],
        email: [`mailto:${AGENCY.email}`, AGENCY.email],
        maps: [`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${AGENCY.street}, ${AGENCY.city}`)}`, null],
    };
    $$('[data-agency-link]').forEach((el) => {
        const [href, text] = links[el.dataset.agencyLink] || [];
        if (!href) return;
        el.href = href;
        if (text) ($('span', el) || el).textContent = text;
    });
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    const more = Math.max(0, AGENCY.carrierCount - CARRIERS.length);
    $$('[data-carrier-more]').forEach((el) => { el.textContent = more; });
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const toMinutes = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
function formatTime(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const suffix = h >= 12 ? 'pm' : 'am';
    const hour = h % 12 || 12;
    return m ? `${hour}:${String(m).padStart(2, '0')} ${suffix}` : `${hour} ${suffix}`;
}

// The current day and minute in the agency's time zone.
function agencyNow() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: AGENCY.timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date());
    const get = (type) => (parts.find((p) => p.type === type) || {}).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

function openStatus() {
    const { day, minutes } = agencyNow();
    const today = AGENCY.hours[day];
    if (today && minutes >= toMinutes(today[0]) && minutes < toMinutes(today[1])) {
        return { open: true, text: `Open now · until ${formatTime(today[1])}` };
    }
    if (today && minutes < toMinutes(today[0])) {
        return { open: false, text: `Closed · opens today at ${formatTime(today[0])}` };
    }
    for (let i = 1; i <= 7; i++) {
        const next = AGENCY.hours[(day + i) % 7];
        if (next) {
            const when = i === 1 ? 'tomorrow' : DAY_NAMES[(day + i) % 7].slice(0, 3);
            return { open: false, text: `Closed · opens ${when} at ${formatTime(next[0])}` };
        }
    }
    return { open: false, text: 'Closed' };
}

function renderHours() {
    const status = openStatus();
    const badge = $('[data-open-status]');
    badge.classList.toggle('is-open', status.open);
    $('[data-open-text]', badge).textContent = status.text;

    const { day } = agencyNow();
    const order = [1, 2, 3, 4, 5, 6, 0];
    $('[data-hours]').innerHTML = order.map((d) => {
        const h = AGENCY.hours[d];
        const time = h ? `${formatTime(h[0])} – ${formatTime(h[1])}` : 'Closed';
        return `<li class="${d === day ? 'is-today' : ''}"><span>${DAY_NAMES[d].slice(0, 3)}</span><span>${time}</span></li>`;
    }).join('');
}

// --- Carriers --------------------------------------------------------------------------

function renderCarriers() {
    const item = (c, hidden) => `<li class="carrier cw-${esc(c.style)}"${hidden ? ' aria-hidden="true"' : ''}>${icon(c.icon)}<span>${esc(c.name)}</span></li>`;
    // Two copies, so the marquee can loop without a gap.
    $('[data-carriers]').innerHTML = CARRIERS.map((c) => item(c, false)).join('') + CARRIERS.map((c) => item(c, true)).join('');

    const slots = [9, 29.5, 50, 70.5, 91];
    const hot = [0, 2];
    $('[data-funnel-carriers]').innerHTML = CARRIERS.slice(0, slots.length).map((c, i) =>
        `<li class="${hot.includes(i) ? 'is-hot' : ''}" style="top:${slots[i]}%">${esc(c.name)}</li>`).join('');
}

// --- Picked coverages (shared by the hero, the cards, the form and the tray) ------------

const picked = new Set();

function setPicked(id, on) {
    if (on) picked.add(id); else picked.delete(id);
    syncPicked();
}

function syncPicked() {
    $$('input[data-cover]').forEach((input) => { input.checked = picked.has(input.value); });
    $$('[data-cover-card]').forEach((card) => {
        const on = picked.has(card.dataset.coverCard);
        card.classList.toggle('is-picked', on);
        const button = $('.cov-add', card);
        button.setAttribute('aria-pressed', String(on));
        button.innerHTML = on ? `${icon('check')}Added` : `${icon('plus')}Add to quote`;
    });
    refreshIcons();
    updateTray();
}

const chip = (c, label) =>
    `<label class="chip"><input type="checkbox" value="${esc(c.id)}" data-cover>` +
    `<span>${icon(c.icon)}${esc(label || c.short)}</span></label>`;

function renderStarter() {
    $('[data-starter-chips]').innerHTML = STARTER.map((s) => chip(coverage(s.id), s.label)).join('');
}

function renderQuoteChips() {
    const group = (line, title) =>
        `<p class="chip-group">${title}</p><div class="chip-row">` +
        COVERAGES.filter((c) => c.line === line).map((c) => chip(c)).join('') + '</div>';
    $('[data-quote-chips]').innerHTML = group('personal', 'For you &amp; family') + group('business', 'For your business');
}

document.addEventListener('change', (event) => {
    const input = event.target;
    if (input.matches('input[data-cover]')) setPicked(input.value, input.checked);
});

// --- Coverage cards ------------------------------------------------------------------------

let currentLine = 'personal';

function renderCoverage() {
    const grid = $('[data-coverage-grid]');
    grid.setAttribute('aria-labelledby', `tab-${currentLine}`);
    grid.innerHTML = COVERAGES.filter((c) => c.line === currentLine).map((c, i) => `
        <article class="cov" data-cover-card="${esc(c.id)}" style="animation-delay:${i * 40}ms">
            <div class="cov-top">
                <span class="cov-icon">${icon(c.icon)}</span>
                <button class="cov-add" type="button" aria-pressed="false" aria-label="Add ${esc(c.name)} to my quote" data-add="${esc(c.id)}"></button>
            </div>
            <h3>${esc(c.name)}</h3>
            <p>${esc(c.covers)}</p>
            <p class="cov-fit"><b>Good if</b> ${esc(c.fit)}</p>
        </article>`).join('');
    syncPicked();
}

function setLine(line, focus) {
    currentLine = line;
    $$('.toggle [role="tab"]').forEach((tab) => {
        const on = tab.dataset.line === line;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        if (on && focus) tab.focus();
    });
    renderCoverage();
}

function initCoverage() {
    const tabs = $$('.toggle [role="tab"]');
    tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => setLine(tab.dataset.line));
        tab.addEventListener('keydown', (event) => {
            if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
            event.preventDefault();
            const next = tabs[(i + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
            setLine(next.dataset.line, true);
        });
    });
    $('[data-coverage-grid]').addEventListener('click', (event) => {
        const button = event.target.closest('[data-add]');
        if (button) setPicked(button.dataset.add, !picked.has(button.dataset.add));
    });
    $$('[data-footer-line]').forEach((link) => link.addEventListener('click', () => setLine(link.dataset.footerLine)));
    renderCoverage();
}

// --- Hero quote starter ---------------------------------------------------------------------

function initStarter() {
    const form = $('[data-starter]');
    const zip = $('[data-starter-zip]');
    const note = $('[data-starter-note]');
    zip.addEventListener('input', () => { zip.value = zip.value.replace(/\D/g, '').slice(0, 5); });
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!picked.size) { note.textContent = 'Pick at least one thing to protect.'; return; }
        if (zip.value && zip.value.length !== 5) { note.textContent = 'Enter a 5-digit ZIP code, or leave it blank.'; zip.focus(); return; }
        note.textContent = '';
        prepareQuote();
        if (zip.value) field('zip').value = zip.value;
        goToQuote(2);
    });
}

// --- Coverage checkup ---------------------------------------------------------------------------

const answers = {};
const LEVEL_ORDER = { essential: 0, consider: 1, tip: 2 };
const LEVEL_LABEL = { essential: 'Essential', consider: 'Worth a look', tip: 'Tip' };

const visibleQuestions = () => CHECKUP.filter((q) => !q.when || q.when(answers));
const isAnswered = (q) => (q.type === 'many' ? Array.isArray(answers[q.id]) && answers[q.id].length > 0 : answers[q.id] !== undefined);

function recommend() {
    const byKey = new Map();
    for (const rule of RULES) {
        if (!rule.when(answers)) continue;
        const c = rule.cover ? coverage(rule.cover) : null;
        const rec = {
            key: rule.cover || rule.name,
            cover: rule.cover,
            level: rule.level,
            name: rule.name || (c && c.name),
            icon: rule.icon || (c && c.icon) || 'sparkles',
            why: rule.why,
        };
        const prev = byKey.get(rec.key);
        if (!prev || LEVEL_ORDER[rec.level] < LEVEL_ORDER[prev.level]) byKey.set(rec.key, rec);
    }
    return [...byKey.values()].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

function renderCheckupForm() {
    $('[data-checkup]').innerHTML = CHECKUP.map((q, i) => {
        const type = q.type === 'many' ? 'checkbox' : 'radio';
        const options = q.options.map(([value, label]) =>
            `<label class="opt"><input type="${type}" name="cq-${esc(q.id)}" value="${esc(value)}"><span>${esc(label)}</span></label>`).join('');
        return `
            <fieldset class="q" data-q="${esc(q.id)}">
                <legend class="q-title"><span class="q-num">${String(i + 1).padStart(2, '0')}</span>
                    <span>${esc(q.q)}<span class="q-hint" data-q-hint>${esc(q.hint || '')}</span></span></legend>
                <div class="q-options">${options}</div>
            </fieldset>`;
    }).join('');
}

function readCheckup() {
    for (const q of CHECKUP) {
        const inputs = $$(`[name="cq-${q.id}"]`);
        if (q.type === 'many') {
            const values = inputs.filter((i) => i.checked).map((i) => i.value);
            if (values.length) answers[q.id] = values; else delete answers[q.id];
        } else {
            const checked = inputs.find((i) => i.checked);
            if (checked) answers[q.id] = checked.value; else delete answers[q.id];
        }
    }
}

function syncCheckupForm() {
    for (const q of CHECKUP) {
        const fieldset = $(`[data-q="${q.id}"]`);
        const applies = !q.when || q.when(answers);
        fieldset.disabled = !applies;
        if (!applies) {
            $$('input', fieldset).forEach((i) => { i.checked = false; });
            delete answers[q.id];
        }
        $('[data-q-hint]', fieldset).textContent = applies ? (q.hint || '') : (q.skipped || '');
        fieldset.classList.toggle('is-answered', applies && isAnswered(q));
    }
}

function renderCheckupResult() {
    const panel = $('[data-checkup-result]');
    const questions = visibleQuestions();
    const done = questions.filter(isAnswered).length;
    const total = questions.length;
    const circumference = 2 * Math.PI * 30;
    const ring = `
        <div class="res-ring" role="img" aria-label="${done} of ${total} questions answered">
            <svg viewBox="0 0 74 74"><circle class="track" cx="37" cy="37" r="30"/>
            <circle class="bar" cx="37" cy="37" r="30" stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - done / total)}"/></svg>
            <b>${done}/${total}</b>
        </div>`;

    if (!done) {
        panel.innerHTML = `
            <div class="res-head">${ring}<div><h3>Your checkup</h3><p>Results update as you answer.</p></div></div>
            <div class="res-empty"><span class="empty-icon">${icon('clipboard-check')}</span>
            <p>Answer the first question to see what your household should have covered, and why.</p></div>`;
        refreshIcons();
        return;
    }

    const recs = recommend();
    const count = (level) => recs.filter((r) => r.level === level).length;
    const quotable = recs.filter((r) => r.cover && r.level !== 'tip');
    const summary = recs.length
        ? `${count('essential')} essential · ${count('consider')} worth a look`
        : 'Nothing stands out yet. Keep going.';
    const items = recs.map((r) => `
        <li class="res-item">
            <span class="res-icon">${icon(r.icon)}</span>
            <div><h4>${esc(r.name)} <span class="tag tag-${r.level}">${LEVEL_LABEL[r.level]}</span></h4><p>${esc(r.why)}</p></div>
        </li>`).join('');

    panel.innerHTML = `
        <div class="res-head">${ring}<div><h3>${done === total ? 'Your checkup' : 'So far…'}</h3><p>${summary}</p></div></div>
        <ul class="res-list">${items}</ul>
        <div class="res-actions">
            ${quotable.length ? `<button class="btn btn-primary btn-lg" type="button" data-checkup-quote>Quote these for me ${icon('arrow-right')}</button>` : ''}
            <button class="btn btn-ghost" type="button" data-checkup-reset>${icon('rotate-ccw')}Start over</button>
            <p class="res-note">A starting point, not advice for your exact situation. An agent will confirm what fits.</p>
        </div>`;
    refreshIcons();
}

function checkupSummary() {
    const lines = [];
    for (const q of visibleQuestions()) {
        if (!isAnswered(q)) continue;
        const values = [].concat(answers[q.id]);
        const labels = values.map((v) => (q.options.find((o) => o[0] === v) || [, v])[1]);
        lines.push(`${q.q} ${labels.join(', ')}`);
    }
    return lines.length ? `From my coverage checkup:\n${lines.map((l) => `- ${l}`).join('\n')}` : '';
}

function initCheckup() {
    renderCheckupForm();
    const form = $('[data-checkup]');
    form.addEventListener('change', (event) => {
        const input = event.target;
        // "None of these" clears the other options, and any other option clears it.
        if (input.type === 'checkbox' && input.checked) {
            const group = $$(`[name="${input.name}"]`);
            if (input.value === 'none') group.forEach((i) => { if (i !== input) i.checked = false; });
            else group.forEach((i) => { if (i.value === 'none') i.checked = false; });
        }
        readCheckup();
        syncCheckupForm();
        renderCheckupResult();
    });
    form.addEventListener('submit', (event) => event.preventDefault());

    $('[data-checkup-result]').addEventListener('click', (event) => {
        if (event.target.closest('[data-checkup-reset]')) {
            form.reset();
            readCheckup();
            syncCheckupForm();
            renderCheckupResult();
            $('input', form).focus();
        }
        if (event.target.closest('[data-checkup-quote]')) {
            prepareQuote();
            recommend().filter((r) => r.cover && r.level !== 'tip').forEach((r) => picked.add(r.cover));
            syncPicked();
            const notes = $('[data-quote-notes]');
            const summary = checkupSummary();
            if (summary && !notes.value.includes('From my coverage checkup')) {
                notes.value = notes.value ? `${notes.value}\n\n${summary}` : summary;
            }
            goToQuote(1);
        }
    });
    syncCheckupForm();
    renderCheckupResult();
}

// --- Claim guides ----------------------------------------------------------------------------------

let currentGuide = CLAIM_GUIDES[0].id;

function renderGuide() {
    const tabs = $('[data-guide-tabs]');
    tabs.innerHTML = CLAIM_GUIDES.map((g) => {
        const on = g.id === currentGuide;
        return `<button type="button" role="tab" id="guide-${esc(g.id)}" aria-selected="${on}" aria-controls="guide-panel" tabindex="${on ? 0 : -1}" data-guide="${esc(g.id)}">${icon(g.icon)}${esc(g.label)}</button>`;
    }).join('');

    const guide = CLAIM_GUIDES.find((g) => g.id === currentGuide);
    const panel = $('[data-guide-panel]');
    panel.id = 'guide-panel';
    panel.setAttribute('aria-labelledby', `guide-${guide.id}`);
    panel.innerHTML = `
        <ol class="guide-list">${guide.steps.map(([title, detail]) => `
            <li><label><input type="checkbox"><div><b>${esc(title)}</b><span>${esc(detail)}</span></div></label></li>`).join('')}
        </ol>
        <div class="guide-foot"><span data-guide-count><b>0</b> of ${guide.steps.length} done</span>
            <a class="btn btn-primary" href="${telHref(AGENCY.claimsPhone)}">${icon('phone')}Call ${esc(AGENCY.claimsPhone)}</a></div>`;
    refreshIcons();
}

function initGuide() {
    const tabs = $('[data-guide-tabs]');
    tabs.addEventListener('click', (event) => {
        const tab = event.target.closest('[data-guide]');
        if (!tab) return;
        currentGuide = tab.dataset.guide;
        renderGuide();
    });
    tabs.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        const i = CLAIM_GUIDES.findIndex((g) => g.id === currentGuide);
        const step = event.key === 'ArrowRight' ? 1 : CLAIM_GUIDES.length - 1;
        currentGuide = CLAIM_GUIDES[(i + step) % CLAIM_GUIDES.length].id;
        renderGuide();
        $(`[data-guide="${currentGuide}"]`).focus();
    });
    $('[data-guide-panel]').addEventListener('change', () => {
        const boxes = $$('[data-guide-panel] input[type="checkbox"]');
        $('[data-guide-count] b').textContent = boxes.filter((b) => b.checked).length;
    });
    renderGuide();
}

// --- Agents, reviews, questions -------------------------------------------------------------------------

function renderTeam() {
    $('[data-team]').innerHTML = AGENTS.map((a) => {
        const first = a.name.split(' ')[0];
        return `
        <article class="agent">
            <div class="agent-photo"><img src="${esc(a.photo)}" alt="${esc(a.name)}" loading="lazy" width="600" height="660"><span class="agent-since">Since ${esc(a.since)}</span></div>
            <div class="agent-body">
                <h3>${esc(a.name)}</h3>
                <p class="agent-role">${esc(a.role)}</p>
                <div class="agent-tags">${a.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</div>
                <p class="agent-lang">${icon('languages')}${esc(a.languages)}</p>
                <div class="agent-actions">
                    <a href="${telHref(a.phone)}" aria-label="Call ${esc(a.name)} at ${esc(a.phone)}">${icon('phone')}Call</a>
                    <button type="button" data-ask="${esc(a.name)}">${icon('message-square')}Ask ${esc(first)}</button>
                </div>
            </div>
        </article>`;
    }).join('');
    $('[data-team]').addEventListener('click', (event) => {
        const button = event.target.closest('[data-ask]');
        if (!button) return;
        prepareQuote();
        quoteAgent = button.dataset.ask;
        const notes = $('[data-quote-notes]');
        const line = `I’d like to work with ${quoteAgent}.`;
        if (!notes.value.includes(line)) notes.value = notes.value ? `${line}\n${notes.value}` : line;
        goToQuote(picked.size ? 2 : 1);
    });
}

function renderReviews() {
    const ordered = [...REVIEWS].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    $('[data-reviews]').innerHTML = ordered.map((r) => `
        <figure class="review${r.featured ? ' is-featured' : ''}">
            <span class="stars" role="img" aria-label="5 out of 5 stars">★★★★★</span>
            <blockquote>${esc(r.text)}</blockquote>
            <span class="review-tag">${icon(r.featured ? 'badge-dollar-sign' : 'check')}${esc(r.tag)}</span>
            <figcaption class="review-who"><span class="avatar" aria-hidden="true">${esc(initials(r.name))}</span>
                <span><b>${esc(r.name)}</b><small>${esc(r.town)}</small></span></figcaption>
        </figure>`).join('');
}

function renderFaq() {
    $('[data-faq]').innerHTML = FAQ.map(([q, a], i) => `
        <details class="faq-item"${i === 0 ? ' open' : ''}>
            <summary>${esc(q)}<span class="faq-plus">${icon('plus')}</span></summary>
            <p>${esc(a)}</p>
        </details>`).join('');
}

// --- Quote request ---------------------------------------------------------------------------------------

let quoteStep = 1;
let quoteAgent = '';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Bring back the form after a finished request, before a caller fills it in.
function prepareQuote() {
    if (!$('[data-quote-done]').hidden) resetQuote();
}

function goToQuote(step) {
    showStep(step === 2 && !picked.size ? 1 : step, false);
    scrollToEl($('#quote'));
    const target = step === 1 ? $('[data-quote-chips] input') : $(`.quote-step[data-step="${quoteStep}"] input:not([type="radio"])`);
    if (target) setTimeout(() => target.focus({ preventScroll: true }), reduceMotion() ? 0 : 500);
}

function showStep(step, focus = true) {
    quoteStep = step;
    $$('.quote-step').forEach((fs) => { fs.hidden = Number(fs.dataset.step) !== step; });
    $$('[data-quote-progress] li').forEach((li, i) => {
        li.classList.toggle('is-current', i + 1 === step);
        li.classList.toggle('is-done', i + 1 < step);
        if (i + 1 === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
    $('[data-quote-back]').hidden = step === 1;
    $('[data-quote-next]').innerHTML = step === 3 ? `Send my quote request ${icon('send')}` : `Continue ${icon('arrow-right')}`;
    refreshIcons();
    if (focus) {
        const first = $(`.quote-step[data-step="${step}"] input:not([type="radio"])`);
        if (first) first.focus();
    }
}

function setError(key, message, field) {
    $(`[data-error="${key}"]`).textContent = message;
    $$(`.quote-step input`).forEach((i) => i.removeAttribute('aria-invalid'));
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
    return !message;
}

// A quote form control by name. (form.name would be the form's own name.)
const field = (name) => $('[data-quote-form]').elements.namedItem(name);

function validateStep(step) {
    if (step === 1) {
        return setError('coverage', picked.size ? '' : 'Choose at least one coverage to compare.');
    }
    if (step === 2) {
        if (!field('name').value.trim()) return setError('about', 'Please add your name.', field('name'));
        if (!/^\d{5}$/.test(field('zip').value)) return setError('about', 'Please enter a 5-digit ZIP code.', field('zip'));
        return setError('about', '');
    }
    const contact = field('contact').value;
    const phone = field('phone').value.replace(/\D/g, '');
    const email = field('email').value.trim();
    if (contact !== 'Email' && phone.length < 10) return setError('contact', `Add a phone number so we can ${contact.toLowerCase()} you.`, field('phone'));
    if (contact === 'Email' && !email) return setError('contact', 'Add an email address so we can write back.', field('email'));
    if (email && !EMAIL_RE.test(email)) return setError('contact', 'That email address doesn’t look right.', field('email'));
    return setError('contact', '');
}

function collectQuote() {
    return {
        coverages: COVERAGES.filter((c) => picked.has(c.id)).map((c) => c.name),
        name: field('name').value.trim(),
        zip: field('zip').value,
        currentCarrier: field('carrier').value.trim(),
        renewalDate: field('renewal').value,
        phone: field('phone').value.trim(),
        email: field('email').value.trim(),
        contactBy: field('contact').value,
        agent: quoteAgent,
        notes: field('notes').value.trim(),
    };
}

function quoteEmail(q) {
    const lines = [
        `Coverage to compare: ${q.coverages.join(', ')}`,
        `Name: ${q.name}`,
        `ZIP: ${q.zip}`,
        q.currentCarrier && `Current carrier: ${q.currentCarrier}`,
        q.renewalDate && `Renewal date: ${q.renewalDate}`,
        q.phone && `Phone: ${q.phone}`,
        q.email && `Email: ${q.email}`,
        `Best way to reach me: ${q.contactBy}`,
        q.agent && `Preferred agent: ${q.agent}`,
        q.notes && `\n${q.notes}`,
    ].filter(Boolean);
    const subject = `Quote request: ${q.coverages.join(', ')}`;
    return `mailto:${AGENCY.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

function showDone(q, sent) {
    // The request is captured in `q`; the next quote starts from a clean slate.
    picked.clear();
    syncPicked();
    $('[data-quote-form]').hidden = true;
    $('[data-quote-progress]').hidden = true;
    const done = $('[data-quote-done]');
    done.hidden = false;
    $('[data-done-name]').textContent = q.name.split(' ')[0] || 'there';
    const way = { Call: 'call', Text: 'text', Email: 'email' }[q.contactBy] || 'reach';
    const text = $('[data-done-text]');
    if (sent) {
        text.innerHTML = `We’ll ${way} you within one business day with quotes for ${esc(q.coverages.join(', '))} from every carrier that fits.`;
    } else {
        text.innerHTML = `One last step: send it from your email app. It’s already written for you. Prefer to talk? Call <a href="${telHref(AGENCY.phone)}">${esc(AGENCY.phone)}</a>.` +
            `<span class="done-mail"><a class="btn btn-primary btn-lg" href="${esc(quoteEmail(q))}">${icon('mail')}Open my email app</a></span>`;
    }
    refreshIcons();
    done.focus();
}

function resetQuote() {
    const form = $('[data-quote-form]');
    form.reset();
    form.hidden = false;
    $('[data-quote-progress]').hidden = false;
    $('[data-quote-done]').hidden = true;
    quoteAgent = '';
    syncPicked();
    $$('[data-error]').forEach((e) => { e.textContent = ''; });
    showStep(1, false);
}

function initQuote() {
    renderQuoteChips();
    const form = $('[data-quote-form]');
    const zip = field('zip');
    zip.addEventListener('input', () => { zip.value = zip.value.replace(/\D/g, '').slice(0, 5); });
    $('[data-quote-back]').addEventListener('click', () => showStep(quoteStep - 1));
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateStep(quoteStep)) return;
        if (quoteStep < 3) { showStep(quoteStep + 1); return; }

        const q = collectQuote();
        if (!AGENCY.quoteEndpoint) { showDone(q, false); return; }
        const button = $('[data-quote-next]');
        button.disabled = true;
        try {
            const res = await fetch(AGENCY.quoteEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify(q),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            showDone(q, true);
        } catch {
            setError('contact', `We couldn’t send that just now. Please try again or call ${AGENCY.phone}.`);
        } finally {
            button.disabled = false;
        }
    });
    $('[data-quote-reset]').addEventListener('click', () => {
        resetQuote();
        $('[data-quote-chips] input').focus();
    });
    showStep(1, false);
}

// --- Tray, header and navigation ----------------------------------------------------------------------------

const inView = { hero: true, quote: false };

function updateTray() {
    const tray = $('[data-tray]');
    const names = COVERAGES.filter((c) => picked.has(c.id)).map((c) => c.short);
    const list = names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ');
    $('[data-tray-list]').textContent = list;
    tray.classList.toggle('is-hidden', !names.length || inView.hero || inView.quote);
}

function initChrome() {
    const header = $('[data-header]');
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const nav = $('#site-nav');
    const menuButton = $('[data-menu-btn]');
    const setMenu = (open) => {
        nav.classList.toggle('is-open', open);
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        menuButton.innerHTML = icon(open ? 'x' : 'menu');
        refreshIcons();
    };
    menuButton.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
    nav.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuButton.focus(); }
    });

    if (!('IntersectionObserver' in window)) return;
    const watch = new IntersectionObserver((entries) => {
        for (const entry of entries) inView[entry.target.id === 'top' ? 'hero' : 'quote'] = entry.isIntersecting;
        updateTray();
    }, { threshold: 0.15 });
    watch.observe($('#top'));
    watch.observe($('#quote'));

    const links = $$('.nav a[href^="#"]');
    const spy = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${entry.target.id}`));
        }
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach((a) => { const section = $(a.getAttribute('href')); if (section) spy.observe(section); });
}

// --- Start ------------------------------------------------------------------------------------------------------

fillAgency();
renderHours();
setInterval(renderHours, 60 * 1000);
renderCarriers();
renderStarter();
initCoverage();
initStarter();
initCheckup();
initGuide();
renderTeam();
renderReviews();
renderFaq();
initQuote();
initChrome();
syncPicked();
