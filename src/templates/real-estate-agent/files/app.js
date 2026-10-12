// Page content lives here as data so it is easy to find and change.
//
// AGENT fills every name, phone, email, license and address on the page (any
// element with data-bind="<key>", and links with data-bind-href="tel|sms|mailto").
// Every "Book a consultation" button (data-book) opens AGENT.bookingUrl when it
// is set, and otherwise jumps to the enquiry form with "Book a consultation"
// picked.
//
// SECTIONS turns parts of the page on and off. A section also hides itself,
// with its menu link, when its list is empty, so a new agent with no listings
// or reviews yet can leave LISTINGS or TESTIMONIALS as [].
//
// SAMPLE_CONTENT marks the figures, listings, neighborhood numbers, reviews and
// sales as samples on the page. Set it to false once they are the agent's own.

const SAMPLE_CONTENT = true;

const AGENT = {
    name: 'Maren Ellis',
    firstName: 'Maren',
    role: 'Real estate agent',
    area: 'Cedar Bay',
    specialty: 'Family homes and first purchases in Cedar Bay and the five neighborhoods around the harbor.',
    since: 2014,
    phone: '(555) 014-8820',
    email: 'maren@example.com',
    hours: 'Mon to Sat, 9am to 7pm',
    brokerage: 'Fernway Realty Group',
    office: '240 Harbor Street, Cedar Bay',
    license: 'License #SA-0193842',
    licenseLine: 'Licensed real estate salesperson, License #SA-0193842.',
    brokerageLicense: 'Brokerage license #BR-0044127',
    fairHousing: 'Equal Housing Opportunity. Fernway Realty Group is committed to the Fair Housing Act. Information is deemed reliable but not guaranteed.',
    languages: 'English and Spanish',
    // A Calendly, Cal.com or other booking page. Leave empty to use the form.
    bookingUrl: '',
    // Shown in the footer, e.g. { label: 'Instagram', url: 'https://instagram.com/yourname' }.
    socials: [],
};

const SECTIONS = { services: true, listings: true, areas: true, proof: true, about: true, faq: true };

// The headline under the hero, with a small photo set between its two halves.
const STATEMENT = {
    before: 'I help families buy and sell homes in Cedar Bay',
    photo: 'photos/dining-bright.jpg',
    after: 'with straight answers, local numbers and a plan you can follow.',
};

const STATS = [
    { value: '12', label: 'Years selling in Cedar Bay' },
    { value: '214', label: 'Homes bought and sold' },
    { value: '19', label: 'Median days on market' },
    { value: '101%', label: 'Average sale to list price' },
];

// `topic` picks the matching option in the enquiry form.
const SERVICES = [
    {
        title: 'Buying a home', topic: 'buy', photo: 'photos/kitchen.jpg', tag: 'Buyers',
        body: 'I help you work out what you can afford, set up alerts for the streets you want, and see homes before they hit the big sites. When you find the one, I write an offer that fits the house and the seller.',
        includes: ['Price and payment plan', 'Private showings', 'Offer strategy', 'Inspection and closing'],
    },
    {
        title: 'Selling your home', topic: 'sell', photo: 'photos/dining.jpg', tag: 'Sellers',
        body: 'You get a price based on what sold on your street, a short list of fixes worth doing, and professional photos. I run every showing and talk you through each offer line by line.',
        includes: ['Pricing report', 'Staging and photos', 'Open houses', 'Offer review'],
    },
    {
        title: 'Relocating to Cedar Bay', topic: 'relocate', photo: 'photos/living-room.jpg', tag: 'Relocation',
        body: 'Moving from out of town? I tour neighborhoods with you by video, send honest notes on commute and schools, and can handle the whole purchase while you are still in your current city.',
        includes: ['Video tours', 'Neighborhood briefings', 'Remote closing'],
    },
    {
        title: 'Downsizing', topic: 'both', photo: 'photos/sunroom.jpg', tag: 'Downsizing',
        body: 'Selling a family home and buying a smaller one at the same time takes careful timing. I line up both sides so you move once, and I can recommend movers, estate sale and cleaning help.',
        includes: ['Buy and sell timing', 'Trusted movers', 'Estate sale help'],
    },
];

// status: 'for-sale', 'under-offer' or 'sold'. `link` is the full listing on
// your brokerage or MLS site (optional). `open` is the next open house.
const LISTINGS = [
    {
        id: 'juniper-14', status: 'for-sale', price: 1185000, address: '14 Juniper Lane', area: 'Juniper Hill',
        beds: 4, baths: 3.5, sqft: 3120, photo: 'photos/hero-craftsman.jpg', open: 'Open Sat, 1 to 3pm',
        alt: 'Craftsman house with a three-car garage and a lit porch at dusk',
        blurb: 'Craftsman on a quiet cul-de-sac, with a big kitchen and a fenced backyard.',
        link: '',
    },
    {
        id: 'orchard-208', status: 'for-sale', price: 689000, address: '208 Orchard Way', area: 'The Orchards',
        beds: 3, baths: 2, sqft: 1840, photo: 'photos/stucco-ranch.jpg',
        alt: 'Single-story stucco house with a green lawn and a wide driveway',
        blurb: 'Single-story home on a corner lot, with a new roof and a two-car garage.',
        link: '',
    },
    {
        id: 'harbor-31', status: 'under-offer', price: 845000, address: '31 Mast Street', area: 'Old Harbor',
        beds: 3, baths: 2.5, sqft: 1960, photo: 'photos/yellow-door.jpg',
        alt: 'White brick townhouse with a yellow front door and black railings',
        blurb: 'Restored 1910 townhouse two blocks from the water, with a garden patio.',
        link: '',
    },
    {
        id: 'west-9', status: 'for-sale', price: 529000, address: '9 Linden Row, Unit B', area: 'Westbrook',
        beds: 2, baths: 2.5, sqft: 1420, photo: 'photos/townhomes.jpg',
        alt: 'Row of modern three-story townhomes with balconies and garages',
        blurb: 'End-unit townhome with a rooftop deck, close to the Westbrook station.',
        link: '',
    },
    {
        id: 'lake-77', status: 'sold', price: 972000, address: '77 Shoreline Drive', area: 'Lakeside',
        beds: 4, baths: 3, sqft: 2680, photo: 'photos/modern-gable.jpg',
        alt: 'Modern house with dark cladding and a sloped roof against a blue sky',
        blurb: 'Sold in nine days with four offers, after a weekend of open houses.',
        link: '',
    },
    {
        id: 'harbor-5', status: 'sold', price: 615000, address: '5 Rope Walk', area: 'Old Harbor',
        beds: 2, baths: 1, sqft: 1180, photo: 'photos/ivy-cottage.jpg',
        alt: 'Brick cottage with white windows, a white door and planters under the windows',
        blurb: 'A first home for a young couple, bought before it reached the open market.',
        link: '',
    },
];

const STATUS_LABELS = { 'for-sale': 'For sale', 'under-offer': 'Under offer', sold: 'Sold' };

const AREAS = [
    {
        name: 'Old Harbor', photo: 'photos/brick-terrace.jpg', alt: 'A row of brick terraced houses with pink and orange front doors',
        summary: 'Brick townhouses and small cottages from the early 1900s, a short walk from the ferry, cafes and the Saturday market.',
        median: '$742,000', typical: '1910s townhouse', days: '14 days', commute: '25 min by ferry',
        goodFor: ['Walking everywhere', 'Older homes', 'No yard work'],
        tip: 'Ask for the sewer line scope report. Many of these homes still have clay pipes, and replacing them runs $8,000 to $15,000.',
    },
    {
        name: 'Juniper Hill', photo: 'photos/hillside-town.jpg', alt: 'Hillside houses with red roofs among trees under a cloudy sky',
        summary: 'Larger family homes on quarter-acre lots, with the top-rated elementary school in the district and views over the bay.',
        median: '$1,090,000', typical: '4-bed craftsman', days: '21 days', commute: '35 min by car',
        goodFor: ['Families', 'Big yards', 'Quiet streets'],
        tip: 'Homes on the north slope sell for about 8% more for the view. The south slope gets more sun and has bigger gardens.',
    },
    {
        name: 'Westbrook', photo: 'photos/suburban-street.jpg', alt: 'A wide suburban street with palm trees and single-story homes',
        summary: 'Newer townhomes and condos around the Westbrook rail station, with the lowest prices of the five neighborhoods.',
        median: '$498,000', typical: '2-bed townhome', days: '17 days', commute: '18 min by train',
        goodFor: ['First homes', 'Commuters', 'Low upkeep'],
        tip: 'Check the HOA reserve study before you offer. Two complexes here raised dues by over $100 a month last year.',
    },
    {
        name: 'Lakeside', photo: 'photos/lake-dock.jpg', alt: 'A wooden dock on a still lake with pine trees behind',
        summary: 'Modern homes and a few older cabins around Lake Ardin, with private docks on the east shore.',
        median: '$935,000', typical: '3-bed modern', days: '28 days', commute: '40 min by car',
        goodFor: ['Water access', 'Remote workers', 'Space'],
        tip: 'Lakefront homes need flood insurance. Get a quote in the first week of your inspection period, not at the end.',
    },
    {
        name: 'The Orchards', photo: 'photos/aerial-pools.jpg', alt: 'Aerial view of houses with red roofs, gardens and backyard pools',
        summary: 'Single-story homes from the 1970s and 80s on former orchard land, many with pools and new kitchens.',
        median: '$664,000', typical: '3-bed ranch', days: '16 days', commute: '30 min by car',
        goodFor: ['Single-story living', 'Pools', 'Downsizers'],
        tip: 'Pool homes here sell in about the same time as homes without one, so do not overpay for the pool.',
    },
];

const TESTIMONIALS = [
    { text: 'Maren told us which houses to skip before we wasted a Saturday on them. We bought in Juniper Hill on our second offer, under asking, with the inspection fixes paid by the seller.', name: 'Priya and Tom S.', detail: 'Bought in Juniper Hill' },
    { text: 'She priced our home from what had actually sold on our street, not what the neighbors hoped for. Four offers in nine days.', name: 'Daniel R.', detail: 'Sold in Lakeside' },
    { text: 'We were moving from Denver with two kids. Maren did video tours at 7am our time and handled the closing while we were still packing.', name: 'Alicia M.', detail: 'Relocated to Old Harbor' },
];

// side: 'Seller' or 'Buyer'. Use the street name only if a client prefers not
// to show their house number.
const SALES = [
    { address: '77 Shoreline Drive', area: 'Lakeside', side: 'Seller', price: 972000, days: 9 },
    { address: '412 Crest Road', area: 'Juniper Hill', side: 'Buyer', price: 1140000, days: 23 },
    { address: '5 Rope Walk', area: 'Old Harbor', side: 'Buyer', price: 615000, days: 0 },
    { address: '18 Pippin Court', area: 'The Orchards', side: 'Seller', price: 701000, days: 12 },
    { address: '9 Station Mews, Unit 4', area: 'Westbrook', side: 'Buyer', price: 476500, days: 15 },
];

const ABOUT = [
    'I grew up two streets from the Old Harbor ferry and bought my first home in Westbrook. I know what it feels like to stretch a budget and wonder if you are paying too much.',
    'Before real estate I spent eight years as a project manager, and I still run every move like a project: a written plan, dates for each step, and a weekly update so you never have to chase me for news.',
    'I work with a small number of clients at a time, so I can answer the phone when you call and be at every showing myself.',
];

const STEPS = [
    { title: 'Consultation', body: 'A free 45-minute talk about your timing, budget and the neighborhoods you like.' },
    { title: 'A written plan', body: 'Within two days you get a plan with prices, dates and the next three steps.' },
    { title: 'Showings or listing', body: 'We tour homes or prepare yours for sale, with an update from me every Friday.' },
    { title: 'Offer to keys', body: 'I negotiate, manage inspections and deadlines, and meet you at closing.' },
];

const FAQ = [
    { q: 'Does a consultation cost anything?', a: 'No. It is free, takes about 45 minutes, and you are under no obligation to work with me afterwards.' },
    { q: 'How is your commission paid?', a: 'It is agreed in writing before we start. When you sell, it is paid from the sale proceeds at closing. When you buy, we sign a buyer agreement that states my fee up front, and I explain who pays it in your situation.' },
    { q: 'Do I need a mortgage pre-approval before we look at homes?', a: 'Not for the first conversation. Before we tour, a pre-approval helps, because sellers here expect one with every offer. I can introduce you to three local lenders.' },
    { q: 'How long does it take to sell a home in Cedar Bay?', a: 'Homes I listed in the last year went under contract in a median of 19 days. Add 30 to 45 days to close after that.' },
    { q: 'Can you help if I am moving from another state?', a: 'Yes. Most of my relocation clients see homes by video first, visit once for a weekend of showings, and sign the closing papers remotely.' },
];

const TOPICS = [
    { id: 'consult', label: 'Book a consultation' },
    { id: 'buy', label: 'Buy a home' },
    { id: 'sell', label: 'Sell my home' },
    { id: 'both', label: 'Buy and sell' },
    { id: 'relocate', label: `Relocate to ${AGENT.area}` },
    { id: 'question', label: 'Ask a question' },
];

const WHEN = ['Within 3 months', '3 to 6 months', 'Later this year', 'Just looking'];

// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `$${Number(n).toLocaleString('en-US')}`;
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const OUT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg>';

// ---- Agent details ------------------------------------------------------------

// The number for tel: and sms: links, from the displayed one. Ten digits
// without a country code are read as a US number.
function phoneLink(phone) {
    const digits = String(phone).replace(/\D/g, '');
    if (String(phone).trim().startsWith('+')) return `+${digits}`;
    return digits.length === 10 ? `+1${digits}` : digits;
}

function bindAgent() {
    const years = new Date().getFullYear() - AGENT.since;
    const values = { ...AGENT, years: `${years} years in ${AGENT.area}`, office: `${AGENT.brokerage}, ${AGENT.office}` };
    document.querySelectorAll('[data-bind]').forEach((el) => {
        const key = el.dataset.bind;
        // The footer's brokerage block already names the brokerage on its own line.
        const v = key === 'office' && el.closest('.footer') ? AGENT.office : values[key];
        if (v !== undefined) el.textContent = v;
    });
    const dial = phoneLink(AGENT.phone);
    const hrefs = { tel: `tel:${dial}`, sms: `sms:${dial}`, mailto: `mailto:${AGENT.email}` };
    document.querySelectorAll('[data-bind-href]').forEach((el) => { el.href = hrefs[el.dataset.bindHref]; });
    document.querySelectorAll('[data-bind-alt]').forEach((el) => { el.alt = `${AGENT.name}, ${AGENT.role.toLowerCase()} in ${AGENT.area}`; });
    $('#about-img').alt = `${AGENT.name} at the ${AGENT.brokerage} office`;
    $('#year').textContent = new Date().getFullYear();

    const socials = AGENT.socials.filter((s) => s.url);
    const li = $('#foot-socials');
    li.hidden = !socials.length;
    li.innerHTML = `<span class="socials">${socials.map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join('')}</span>`;
}

// ---- Sections that can be removed -------------------------------------------------

function applySections() {
    const has = {
        services: SERVICES.length, listings: LISTINGS.length, areas: AREAS.length,
        proof: TESTIMONIALS.length || SALES.length, about: ABOUT.length, faq: FAQ.length,
    };
    document.querySelectorAll('[data-section]').forEach((sec) => {
        const key = sec.dataset.section;
        const show = SECTIONS[key] !== false && !!has[key];
        sec.hidden = !show;
        document.querySelectorAll(`[data-nav="${key}"]`).forEach((a) => { a.hidden = !show; });
    });
    $('#quotes').hidden = !TESTIMONIALS.length;
    $('#sales-block').hidden = !SALES.length;
}

const isOn = (key) => SECTIONS[key] !== false;

// ---- Booking -------------------------------------------------------------------

function initBooking() {
    document.querySelectorAll('[data-book]').forEach((a) => {
        if (AGENT.bookingUrl) {
            a.href = AGENT.bookingUrl;
            a.target = '_blank';
            a.rel = 'noopener';
            return;
        }
        a.addEventListener('click', (e) => {
            e.preventDefault();
            prefillEnquiry({ topic: 'consult' });
        });
    });
}

// ---- Intro --------------------------------------------------------------------------

function renderIntro() {
    $('#statement').innerHTML = `${esc(STATEMENT.before)} <span class="pill" aria-hidden="true"><img src="${esc(STATEMENT.photo)}" alt=""></span> ${esc(STATEMENT.after)}`;
    $('#stats').innerHTML = STATS.map((s) => `<div class="stat"><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('');
    $('#stats').hidden = !STATS.length;
}

// ---- Services -------------------------------------------------------------------

function renderServices() {
    const list = $('#svc-list');
    list.innerHTML = SERVICES.map((s, i) => `
        <div class="svc-item${i === 0 ? ' open' : ''}">
            <h3><button type="button" class="svc-btn" id="svc-b${i}" aria-expanded="${i === 0}" aria-controls="svc-p${i}" data-i="${i}"><small>0${i + 1}</small>${esc(s.title)}</button></h3>
            <div class="svc-body" id="svc-p${i}" role="region" aria-labelledby="svc-b${i}">
                <div class="svc-inner">
                    <p>${esc(s.body)}</p>
                    ${s.includes ? `<ul>${s.includes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
                    <a class="svc-link" href="#contact" data-topic="${esc(s.topic)}">Talk to me about ${esc(s.title.toLowerCase())} ${ARROW}</a>
                </div>
            </div>
        </div>`).join('');
    $('#svc-media').innerHTML = SERVICES.map((s, i) => `<img src="${esc(s.photo)}" alt="" loading="lazy" class="${i === 0 ? 'on' : ''}">`).join('') +
        `<span class="svc-tag" id="svc-tag">${esc(SERVICES[0] ? SERVICES[0].tag : '')}</span>`;
    // Collapsed panels stay out of the tab order.
    const sync = () => list.querySelectorAll('.svc-item').forEach((item) => {
        item.querySelector('.svc-body').inert = !item.classList.contains('open');
    });
    sync();

    list.addEventListener('click', (e) => {
        const link = e.target.closest('[data-topic]');
        if (link) {
            e.preventDefault();
            prefillEnquiry({ topic: link.dataset.topic });
            return;
        }
        const b = e.target.closest('.svc-btn');
        if (!b) return;
        const i = Number(b.dataset.i);
        list.querySelectorAll('.svc-item').forEach((item, j) => {
            item.classList.toggle('open', j === i);
            item.querySelector('.svc-btn').setAttribute('aria-expanded', String(j === i));
        });
        sync();
        $('#svc-media').querySelectorAll('img').forEach((img, j) => img.classList.toggle('on', j === i));
        $('#svc-tag').textContent = SERVICES[i].tag;
    });
}

// ---- Listings ---------------------------------------------------------------------

const homeById = (id) => LISTINGS.find((h) => h.id === id);

function homeFacts(h) {
    return [
        h.beds != null ? `${h.beds} bed` : '',
        h.baths != null ? `${h.baths} bath` : '',
        h.sqft ? `${h.sqft.toLocaleString('en-US')} sq ft` : '',
    ].filter(Boolean);
}

function renderListings(filter = 'all') {
    const list = LISTINGS.filter((h) => filter === 'all' || h.status === filter);
    const track = $('#list-track');
    track.innerHTML = list.map((h, i) => {
        const sold = h.status === 'sold';
        return `
        <article class="home" style="--i:${i}">
            <div class="home-photo">
                <img src="${esc(h.photo)}" alt="${esc(h.alt)}" loading="lazy">
                <span class="badge" data-status="${esc(h.status)}">${esc(STATUS_LABELS[h.status] || h.status)}</span>
                ${h.open && !sold ? `<span class="home-open">${esc(h.open)}</span>` : ''}
            </div>
            <div class="home-top">
                <h3>${esc(h.address)}</h3>
                <span class="home-price">${sold ? '<span class="sr-only">Sold for </span>' : ''}${money(h.price)}</span>
            </div>
            <p class="home-area">${esc(h.area)}</p>
            ${h.blurb ? `<p class="home-blurb">${esc(h.blurb)}</p>` : ''}
            <ul class="home-facts">${homeFacts(h).map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
            <div class="home-links">
                <button type="button" data-ask="${esc(h.id)}">${sold ? 'Ask about homes like this' : 'Ask about this home'} ${ARROW}</button>
                ${h.link ? `<a class="muted" href="${esc(h.link)}" target="_blank" rel="noopener">Full listing ${OUT}</a>` : ''}
            </div>
        </article>`;
    }).join('');
    track.scrollLeft = 0;
    updateArrows();
}

function updateArrows() {
    const t = $('#list-track');
    const [prev, next] = document.querySelectorAll('.list-arrows .round-btn');
    prev.disabled = t.scrollLeft <= 4;
    next.disabled = t.scrollLeft + t.clientWidth >= t.scrollWidth - 4;
}

function initListings() {
    if (!LISTINGS.length || !isOn('listings')) return;
    const statuses = Object.keys(STATUS_LABELS).filter((s) => LISTINGS.some((h) => h.status === s));
    const filter = $('#list-filter');
    if (statuses.length > 1) {
        const opts = [{ id: 'all', label: 'All', n: LISTINGS.length }, ...statuses.map((s) => ({ id: s, label: STATUS_LABELS[s], n: LISTINGS.filter((h) => h.status === s).length }))];
        filter.innerHTML = opts.map((o, i) => `<button type="button" class="chip" aria-pressed="${i === 0}" data-filter="${esc(o.id)}">${esc(o.label)}<b>${o.n}</b></button>`).join('');
        filter.addEventListener('click', (e) => {
            const b = e.target.closest('[data-filter]');
            if (!b) return;
            filter.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
            renderListings(b.dataset.filter);
        });
    }

    const track = $('#list-track');
    document.querySelector('.list-arrows').addEventListener('click', (e) => {
        const b = e.target.closest('[data-dir]');
        if (!b) return;
        const card = track.querySelector('.home');
        const step = card ? card.getBoundingClientRect().width + 22 : track.clientWidth * 0.8;
        track.scrollBy({ left: step * Number(b.dataset.dir), behavior: 'smooth' });
    });
    track.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    track.addEventListener('click', (e) => {
        const b = e.target.closest('[data-ask]');
        if (!b) return;
        const h = homeById(b.dataset.ask);
        if (h.status === 'sold') {
            prefillEnquiry({ topic: 'buy', message: `I saw that ${h.address} in ${h.area} sold. Do you know of similar homes coming up?` });
        } else {
            prefillEnquiry({ topic: 'buy', home: h.id });
        }
    });
    renderListings();
}

// ---- Neighborhoods -------------------------------------------------------------

function renderArea(i) {
    const a = AREAS[i];
    const panel = $('#area-panel');
    panel.setAttribute('aria-labelledby', `area-t${i}`);
    panel.innerHTML = `
        <div class="area-photo"><img src="${esc(a.photo)}" alt="${esc(a.alt)}"></div>
        <div class="area-body">
            <div>
                <h3>${esc(a.name)}</h3>
                <p class="area-sum">${esc(a.summary)}</p>
                ${a.tip ? `<p class="area-tip"><b>What I tell buyers</b>${esc(a.tip)}</p>` : ''}
                <button type="button" class="btn btn-dark btn-sm area-ask" data-area="${i}">Ask about ${esc(a.name)} ${ARROW}</button>
            </div>
            <dl class="area-figs">
                <div><dt>Median sale price</dt><dd>${esc(a.median)}</dd></div>
                <div><dt>Typical home</dt><dd>${esc(a.typical)}</dd></div>
                <div><dt>Time to sell</dt><dd>${esc(a.days)}</dd></div>
                <div><dt>To downtown</dt><dd>${esc(a.commute)}</dd></div>
                ${a.goodFor && a.goodFor.length ? `<div class="area-good"><dt>Good for</dt><dd>${a.goodFor.map((g) => `<span>${esc(g)}</span>`).join('')}</dd></div>` : ''}
            </dl>
        </div>`;
    // Replay the fade on every switch.
    panel.style.animation = 'none';
    void panel.offsetWidth;
    panel.style.animation = '';
}

function initAreas() {
    if (!AREAS.length || !isOn('areas')) return;
    const tabs = $('#area-tabs');
    tabs.innerHTML = AREAS.map((a, i) => `
        <button type="button" class="area-tab" role="tab" id="area-t${i}" aria-controls="area-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}" data-i="${i}">
            <span>${esc(a.name)}</span><small>${esc(a.median)}</small>
        </button>`).join('');
    const select = (i, focus) => {
        tabs.querySelectorAll('.area-tab').forEach((t, j) => {
            t.setAttribute('aria-selected', String(j === i));
            t.tabIndex = j === i ? 0 : -1;
            if (j === i && focus) t.focus();
        });
        renderArea(i);
    };
    tabs.addEventListener('click', (e) => {
        const t = e.target.closest('.area-tab');
        if (t) select(Number(t.dataset.i), false);
    });
    tabs.addEventListener('keydown', (e) => {
        const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        if (!(e.key in keys)) return;
        e.preventDefault();
        const cur = Number(document.activeElement.dataset.i || 0);
        select((cur + keys[e.key] + AREAS.length) % AREAS.length, true);
    });
    $('#area-panel').addEventListener('click', (e) => {
        const b = e.target.closest('[data-area]');
        if (b) prefillEnquiry({ topic: 'buy', message: `I am interested in homes in ${AREAS[Number(b.dataset.area)].name}.` });
    });
    select(0, false);
}

// ---- Client proof -----------------------------------------------------------------

function renderProof() {
    $('#quotes').innerHTML = TESTIMONIALS.map((t) => `
        <figure class="quote">
            <blockquote>${esc(t.text)}</blockquote>
            <figcaption><b>${esc(t.name)}</b><span>${esc(t.detail)}</span></figcaption>
        </figure>`).join('');
    $('#sales').innerHTML = SALES.map((s) => `
        <tr>
            <td>${esc(s.address)}</td>
            <td>${esc(s.area)}</td>
            <td><span class="rep${s.side === 'Buyer' ? ' rep-buyer' : ''}">${esc(s.side)}</span></td>
            <td>${money(s.price)}</td>
            <td>${s.days === 0 ? 'Off market' : `${esc(s.days)}<span class="d-unit"> days</span>`}</td>
        </tr>`).join('');
}

// ---- About, steps and FAQ ------------------------------------------------------------

function renderAbout() {
    $('#about-story').innerHTML = ABOUT.map((p) => `<p>${esc(p)}</p>`).join('');
    const facts = [
        { label: 'Licensed since', value: AGENT.since },
        { label: 'Brokerage', value: AGENT.brokerage },
        { label: 'Neighborhoods', value: AREAS.length ? `${AGENT.area} and ${AREAS.length} more` : AGENT.area },
        { label: 'Languages', value: AGENT.languages },
    ].filter((f) => f.value);
    $('#facts').innerHTML = facts.map((f) => `<li><span>${esc(f.label)}</span>${esc(f.value)}</li>`).join('');
    $('#steps').innerHTML = STEPS.map((s, i) => `
        <li class="step">
            <span class="step-n">0${i + 1}</span>
            <h4>${esc(s.title)}</h4>
            <p>${esc(s.body)}</p>
        </li>`).join('');
    $('.steps-title').hidden = !STEPS.length;
}

function renderFaq() {
    $('#faq-list').innerHTML = FAQ.map((f, i) => `
        <details${i === 0 ? ' open' : ''}>
            <summary>${esc(f.q)}<span aria-hidden="true"></span></summary>
            <p>${esc(f.a)}</p>
        </details>`).join('');
}

// ---- Enquiry form ---------------------------------------------------------------------

let when = WHEN[0];

function segmented(root, name, options, value, onChange) {
    root.innerHTML = options.map((o) => `
        <label class="seg-opt">
            <input type="radio" name="${name}" value="${esc(o)}"${o === value ? ' checked' : ''}>
            <span>${esc(o)}</span>
        </label>`).join('');
    root.addEventListener('change', (e) => { if (e.target.name === name) onChange(e.target.value); });
}

function initEnquiry() {
    const form = $('#enquiry');
    $('#e-topic').innerHTML = TOPICS.map((t) => `<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('');
    const homes = isOn('listings') ? LISTINGS.filter((h) => h.status !== 'sold') : [];
    $('#e-home-field').hidden = !homes.length;
    $('#e-home').innerHTML = '<option value="">None in particular</option>' +
        homes.map((h) => `<option value="${esc(h.id)}">${esc(h.address)}, ${esc(h.area)} (${money(h.price)})</option>`).join('');
    segmented($('#e-when'), 'e-when', WHEN, when, (v) => { when = v; });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = (n) => form.elements[n].value.trim();
        let bad = null;
        for (const n of ['name', 'email']) {
            const el = form.elements[n];
            const wrong = n === 'email' ? !/^\S+@\S+\.\S+$/.test(el.value.trim()) : !el.value.trim();
            el.classList.toggle('invalid', wrong);
            if (wrong && !bad) bad = el;
        }
        const note = $('#e-note');
        if (bad) {
            note.textContent = 'Add your name and a valid email so I can reply.';
            note.className = 'form-note miss';
            bad.focus();
            return;
        }
        const topic = TOPICS.find((t) => t.id === val('topic'));
        const home = homeById(val('home'));
        const lines = [
            `Name: ${val('name')}`,
            `Email: ${val('email')}`,
            `Phone: ${val('phone') || 'not given'}`,
            `I would like to: ${topic.label}`,
            home ? `Home: ${home.address}, ${home.area} (${money(home.price)})` : '',
            `Planning to move: ${when}`,
            '',
            val('message'),
        ].filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== ''));
        const subject = `${topic.label}${home ? `: ${home.address}` : ''}, from ${val('name')}`;
        window.location.href = `mailto:${AGENT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
        note.className = 'form-note ok';
        note.textContent = `Your email app should open with the message to ${AGENT.firstName}. If it does not, call or text ${AGENT.phone}.`;
    });
}

function prefillEnquiry({ topic, home, message }) {
    const form = $('#enquiry');
    if (topic) form.elements.topic.value = topic;
    if (home !== undefined && !$('#e-home-field').hidden) form.elements.home.value = home;
    if (message) form.elements.message.value = message;
    setMenu(false);
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => form.elements.name.focus({ preventScroll: true }), 500);
}

// ---- Nav -------------------------------------------------------------------------------

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

// Sizes the hero name to fill the width of the hero, for a name of any length.
function fitName() {
    const h1 = $('.hero-name');
    const name = h1.firstElementChild;
    const fit = () => {
        h1.style.fontSize = '';
        const cs = getComputedStyle(h1);
        const room = h1.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const size = parseFloat(cs.fontSize) * room / name.getBoundingClientRect().width;
        // On short screens the name is capped so it leaves room for the rest of the hero.
        const cap = Math.max(64, $('.hero').clientHeight * 0.25);
        h1.style.fontSize = `${Math.min(size * 0.98, cap, 300)}px`;
    };
    fit();
    if (document.fonts) document.fonts.ready.then(fit);
    window.addEventListener('resize', fit);
}

function markSamples() {
    if (!SAMPLE_CONTENT) return;
    document.querySelectorAll('[data-sample]').forEach((el) => { el.hidden = false; });
}

bindAgent();
fitName();
applySections();
markSamples();
initNav();
renderIntro();
renderServices();
initListings();
initAreas();
renderProof();
renderAbout();
renderFaq();
initEnquiry();
initBooking();
