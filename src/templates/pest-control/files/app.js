// ============================================================================
// Content — edit these lists to make the site your own.
// ============================================================================

const BUSINESS = {
  name: 'Kestrel Pest Co.',
  phone: '(555) 014-2290',
  phoneHref: '+15550142290',
  area: 'Greater Ashford County',
  street: '418 Tanner Row, Unit 3',
  city: 'Ashford, ST 40112',
  licence: 'State licence PC-40117 · Insured to $2M · Pet & child safe products',
  licenceShort: 'PC-40117 · Insured to $2M',
};

// ZIP codes you serve. Anything else gets a "call us" answer.
const SERVICE_ZIPS = [
  '40110', '40111', '40112', '40113', '40114', '40115', '40117', '40118',
  '40120', '40121', '40122', '40124', '40125', '40128', '40130', '40131',
  '40133', '40135', '40140', '40142',
];

// Office hours, Sunday first. null = closed. Inspections are booked inside these.
const HOURS = [
  null,
  { open: '07:00', close: '19:00' },
  { open: '07:00', close: '19:00' },
  { open: '07:00', close: '19:00' },
  { open: '07:00', close: '19:00' },
  { open: '07:00', close: '18:00' },
  { open: '08:00', close: '14:00' },
];

// Two-hour arrival windows offered for inspections (start, end).
const WINDOWS = [['08:00', '10:00'], ['10:00', '12:00'], ['13:00', '15:00'], ['15:00', '17:00']];
const BOOKABLE_DAYS = 10;

const TICKER = [
  'Trucks out today: 6',
  'Wasp nest? Same-day removal if you call before 2pm',
  'Free re-treatment if they come back',
  'Pet & child safe products as standard',
  'Termite inspections booked this week: 14',
  'Emergency line open 24 hours',
];

// The field guide. `rate` is what this pest adds to a visit in the quote;
// `oneTime` pests are priced as a single treatment, not per visit.
const PESTS = [
  {
    id: 'roach', no: '001', common: 'Cockroach', latin: 'Blattella germanica', img: 'img/roach.jpg',
    found: 'under the sink, 02:14', risk: 4, rate: 35,
    signs: ['Pepper-like droppings in drawers and behind appliances', 'A musty, oily smell', 'Brown egg cases near warm pipes'],
    treatment: 'Gel baits placed where they hide, a growth regulator to stop the next generation, and gaps around pipes sealed.',
  },
  {
    id: 'ant', no: '002', common: 'Carpenter ant', latin: 'Camponotus pennsylvanicus', img: 'img/ant.jpg',
    found: 'window frame, east wall', risk: 3, rate: 25,
    signs: ['Small piles of sawdust (frass) below wood', 'Winged ants indoors in spring', 'Faint rustling inside walls at night'],
    treatment: 'We follow the trail to the nest, treat it directly and fix the damp wood that drew them in.',
  },
  {
    id: 'termite', no: '003', common: 'Subterranean termite', latin: 'Reticulitermes flavipes', img: 'img/termite.jpg',
    found: 'crawl space, sill plate', risk: 5, rate: 690, oneTime: true,
    signs: ['Mud tubes on foundation walls', 'Wood that sounds hollow when tapped', 'Discarded wings on window sills'],
    treatment: 'A liquid barrier around the foundation plus bait stations, checked every quarter for five years.',
  },
  {
    id: 'mouse', no: '004', common: 'House mouse', latin: 'Mus musculus', img: 'img/mouse.jpg',
    found: 'loft insulation, north side', risk: 3, rate: 30,
    signs: ['Rice-sized droppings', 'Gnawed food packets and cables', 'Scratching in ceilings after dark'],
    treatment: 'Tamper-proof stations outside, traps inside, and every gap wider than a pencil sealed with steel mesh.',
  },
  {
    id: 'tick', no: '005', common: 'Deer tick', latin: 'Ixodes scapularis', img: 'img/tick.jpg',
    found: 'long grass by the back fence', risk: 4, rate: 35,
    signs: ['Ticks on pets after walks or yard time', 'Long grass, leaf litter and deer in the yard', 'A bite with a spreading red ring (see a doctor)'],
    treatment: 'Edges, leaf litter and shady borders treated where ticks wait, plus tick tubes that target the mice that carry them.',
  },
  {
    id: 'bedbug', no: '006', common: 'Bed bug', latin: 'Cimex lectularius', img: 'img/bedbug.jpg',
    found: 'mattress seam, guest room', risk: 4, rate: 480, oneTime: true,
    signs: ['Itchy bites in a line or cluster', 'Rust-coloured spots on sheets', 'Tiny pale eggs in mattress seams'],
    treatment: 'Whole-room heat treatment to 50 °C, then a residual follow-up two weeks later. Usually two visits.',
  },
  {
    id: 'mosquito', no: '007', common: 'Mosquito', latin: 'Aedes aegypti', img: 'img/mosquito.jpg',
    found: 'patio, around dusk', risk: 2, rate: 30,
    signs: ['Bites outdoors at dawn and dusk', 'Standing water in pots, gutters or toys', 'Larvae wriggling in rain barrels'],
    treatment: 'Breeding spots drained or treated, and a barrier spray on shrubs where they rest during the day.',
  },
  {
    id: 'wasp', no: '008', common: 'German wasp', latin: 'Vespula germanica', img: 'img/wasp.jpg',
    found: 'soffit above the back door', risk: 3, rate: 40,
    signs: ['Steady traffic in and out of one gap', 'Papery nest in sheds or roof spaces', 'Wasps chewing on fences and decking'],
    treatment: 'The nest treated at the entrance and removed once dead, same day if you call before 2pm.',
  },
];

// Quote rules. Price per visit = (BASE + pest rates + size fee) × plan factor.
const QUOTE = {
  base: 89,            // call-out, inspection and a general perimeter treatment
  sizeIncluded: 1500,  // sq ft included in the base price
  perExtra100: 3,      // added per extra 100 sq ft
  plans: [
    { id: 'once', name: 'One visit', factor: 1, per: 'one visit', note: 'One treatment with a 30-day guarantee.' },
    { id: 'quarterly', name: 'Quarterly', factor: 0.62, per: 'per visit · 4 a year', note: 'Free re-treatment between visits. Most popular.' },
    { id: 'monthly', name: 'Monthly', factor: 0.45, per: 'per visit · 12 a year', note: 'For heavy pressure, restaurants and rentals.' },
  ],
};

const STEPS = [
  { title: 'Find it', meta: 'Day 0 · 45 min', body: 'A technician walks every room, the loft, the crawl space and the yard with a torch and a moisture meter. You get photos of what we found.' },
  { title: 'Cut it off', meta: 'Day 0', body: 'Most infestations start at a gap, a leak or a pile of firewood. We seal and fix what we can on the spot and tell you what we can\'t.' },
  { title: 'Treat it where it lives', meta: 'Day 0–1', body: 'Baits, dusts and sprays placed where pests nest, not sprayed across your kitchen. Labelled, low-toxicity products only.' },
  { title: 'Come back', meta: 'Day 14 · and after', body: 'A follow-up visit to check the traps and bait. If anything is still moving, we keep coming back at no charge until it isn\'t.' },
];

const CASES = [
  { no: '2291', pest: 'Bed bugs', where: 'Elm Hollow', days: 9, quote: 'They found them in the skirting board, not just the bed. Two visits and we have slept fine since March.', who: 'Dana R.' },
  { no: '2304', pest: 'Mice', where: 'Old Mill Road', days: 12, quote: 'Every other company sold us traps. Kestrel crawled under the porch and found the hole they were using.', who: 'Marcus & Lee T.' },
  { no: '2317', pest: 'Wasps', where: 'Ashford centre', days: 1, quote: 'Called at eleven, nest gone by three. The technician showed my kids the nest from a safe distance.', who: 'Priya S.' },
  { no: '2342', pest: 'Termites', where: 'Larch Hill', days: 30, quote: 'Honest about the damage, honest about the price, and they still check the stations every quarter.', who: 'Owen M.' },
];

const FAQ = [
  { q: 'Is the treatment safe for my kids and pets?', a: 'Yes. We use labelled, low-toxicity products placed in cracks, voids and bait stations rather than open spraying. We will tell you if any room needs to stay closed, which is rarely more than an hour.' },
  { q: 'Do I need to be home?', a: 'For the first inspection, yes, so we can show you what we find. For outdoor-only follow-ups you can leave the gate open and we will text you a report.' },
  { q: 'How fast can you come?', a: 'Most inspections happen the same or next working day. Wasp nests and rodents inside the living space are treated as emergencies.' },
  { q: 'What if they come back?', a: 'On a quarterly or monthly plan, call us and we re-treat within 48 hours at no charge. One-off visits carry a 30-day guarantee.' },
  { q: 'Do I have to sign a contract?', a: 'No. Plans run visit to visit and you can cancel any time before the next one. Termite protection is the exception: it is a five-year warranty, paid yearly.' },
  { q: 'How do I prepare for a visit?', a: 'Clear the space under sinks and along the walls of affected rooms, and keep pets in another room. For bed bugs we send a full checklist when you book.' },
];

// ============================================================================
// Helpers
// ============================================================================

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, ...kids) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== false && v != null) node.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null) node.append(kid.nodeType ? kid : document.createTextNode(kid));
  return node;
};
const money = (n) => Math.round(n).toLocaleString('en-US');
const pestById = (id) => PESTS.find((p) => p.id === id);
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDay = (d) => `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: keep it in memory only */ }
  },
};

// ============================================================================
// Business details, ticker, hours
// ============================================================================

function fillBusiness() {
  document.querySelectorAll('[data-biz]').forEach((node) => {
    const value = { name: BUSINESS.name, phone: BUSINESS.phone, area: BUSINESS.area, licence: BUSINESS.licence, 'licence-short': BUSINESS.licenceShort }[node.dataset.biz];
    if (value) node.textContent = value;
  });
  document.querySelectorAll('[data-biz-href="tel"]').forEach((a) => { a.href = `tel:${BUSINESS.phoneHref}`; });
  $('#addr').textContent = `${BUSINESS.street}, ${BUSINESS.city}`;
  $('#foot-addr').textContent = `${BUSINESS.street}, ${BUSINESS.city}`;
  $('#year').textContent = new Date().getFullYear();
}

function renderTicker() {
  const run = () => TICKER.map((t) => el('span', { class: 'tick' }, t));
  // Two copies so the loop is seamless; the second is hidden from screen readers.
  $('#ticker').append(el('span', { class: 'tick-run' }, run()), el('span', { class: 'tick-run', 'aria-hidden': 'true' }, run()));
}

function renderHours() {
  const today = new Date().getDay();
  const order = [1, 2, 3, 4, 5, 6, 0];
  $('#hours').append(...order.map((d) => {
    const h = HOURS[d];
    return el('tr', { class: d === today ? 'is-today' : '' },
      el('th', { scope: 'row' }, DAY_NAMES[d]),
      el('td', {}, h ? `${h.open}–${h.close}` : 'Emergencies only'));
  }));
}

// ============================================================================
// Field guide
// ============================================================================

function riskBars(level) {
  return el('span', { class: 'risk', 'aria-label': `Risk ${level} of 5` },
    [1, 2, 3, 4, 5].map((i) => el('i', { class: i <= level ? 'on' : '' })));
}

function renderDrawer() {
  const drawer = $('#drawer');
  PESTS.forEach((p) => {
    drawer.append(el('div', { role: 'listitem', class: 'cell' },
      el('button', { class: 'specimen', type: 'button', 'aria-controls': 'entry', 'aria-expanded': 'false', 'data-id': p.id, onclick: () => openEntry(p.id) },
        el('span', { class: 'spec-no mono' }, `Nº ${p.no}`),
        el('img', { src: p.img, alt: '', loading: 'lazy' }),
        el('span', { class: 'spec-name' }, p.common),
        el('span', { class: 'spec-latin' }, p.latin))));
  });
}

function openEntry(id) {
  const p = pestById(id);
  const entry = $('#entry');
  const already = !entry.hidden && entry.dataset.id === id;
  document.querySelectorAll('.specimen').forEach((b) => {
    const on = b.dataset.id === id && !already;
    b.classList.toggle('is-open', on);
    b.setAttribute('aria-expanded', String(on));
  });
  if (already) { entry.hidden = true; entry.dataset.id = ''; return; }
  entry.dataset.id = id;
  entry.replaceChildren(
    el('figure', { class: 'entry-fig' },
      el('img', { src: p.img, alt: `${p.common}, ${p.latin}` }),
      el('figcaption', { class: 'tag' },
        el('span', { class: 'tag-no' }, `Specimen Nº ${p.no}`),
        el('span', { class: 'tag-latin' }, p.latin),
        el('span', { class: 'tag-row' }, `Collected: ${p.found}`))),
    el('div', { class: 'entry-body' },
      el('p', { class: 'mono label label-dark' }, `Entry Nº ${p.no}`),
      el('h3', { class: 'entry-title' }, p.common),
      el('p', { class: 'entry-latin' }, p.latin),
      el('div', { class: 'entry-grid' },
        el('div', {}, el('p', { class: 'mono entry-k' }, 'Signs to look for'), el('ul', { class: 'signs' }, p.signs.map((s) => el('li', {}, s)))),
        el('div', {}, el('p', { class: 'mono entry-k' }, 'How we treat it'), el('p', {}, p.treatment)),
        el('div', { class: 'entry-meta' },
          el('p', { class: 'mono entry-k' }, 'Risk to your home'), riskBars(p.risk),
          el('p', { class: 'mono entry-k' }, p.oneTime ? 'Treatment from' : 'Adds to a visit'),
          el('p', { class: 'entry-price' }, `$${money(p.rate)}`))),
      el('div', { class: 'entry-actions' },
        el('button', { class: 'btn btn-hot', type: 'button', onclick: () => quoteFor(id) }, `Price my ${p.common.toLowerCase()} problem`),
        el('button', { class: 'btn btn-line', type: 'button', onclick: () => openEntry(id) }, 'Close'))));
  entry.hidden = false;
  entry.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'nearest' });
}

// ============================================================================
// Method
// ============================================================================

function renderSteps() {
  $('#steps').append(...STEPS.map((s, i) => el('li', { class: 'step' },
    el('span', { class: 'step-no', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
    el('h3', { class: 'step-title' }, s.title),
    el('p', { class: 'step-body' }, s.body),
    el('p', { class: 'step-meta mono' }, s.meta))));
}

// ============================================================================
// Quote builder
// ============================================================================

const quote = { pests: new Set(['roach']), size: 1800, plan: 'quarterly' };

function renderQuoteControls() {
  $('#q-pests').append(...PESTS.map((p) => el('label', { class: 'chip' },
    el('input', { type: 'checkbox', value: p.id, checked: quote.pests.has(p.id), onchange: (e) => {
      e.target.checked ? quote.pests.add(p.id) : quote.pests.delete(p.id);
      updateQuote();
    } }),
    el('span', {}, p.common))));
  $('#q-plans').append(...QUOTE.plans.map((pl) => el('label', { class: 'plan' },
    el('input', { type: 'radio', name: 'plan', value: pl.id, checked: pl.id === quote.plan, onchange: () => { quote.plan = pl.id; updateQuote(); } }),
    el('span', {}, pl.name))));
  $('#q-size').addEventListener('input', (e) => { quote.size = Number(e.target.value); updateQuote(); });
}

function computeQuote() {
  const plan = QUOTE.plans.find((p) => p.id === quote.plan);
  const chosen = PESTS.filter((p) => quote.pests.has(p.id));
  const recurring = chosen.filter((p) => !p.oneTime);
  const oneTime = chosen.filter((p) => p.oneTime);
  const extra = Math.max(0, quote.size - QUOTE.sizeIncluded);
  const sizeFee = Math.ceil(extra / 100) * QUOTE.perExtra100;
  const visit = (QUOTE.base + sizeFee + recurring.reduce((n, p) => n + p.rate, 0)) * plan.factor;
  const oneTimeTotal = oneTime.reduce((n, p) => n + p.rate, 0);
  const lines = [[`Inspection & perimeter${plan.factor < 1 ? ` (${Math.round((1 - plan.factor) * 100)}% plan discount)` : ''}`, QUOTE.base * plan.factor]];
  if (sizeFee) lines.push([`Size: ${money(quote.size)} sq ft`, sizeFee * plan.factor]);
  recurring.forEach((p) => lines.push([p.common, p.rate * plan.factor]));
  const isOnce = plan.id === 'once';
  oneTime.forEach((p) => lines.push([`${p.common} treatment${isOnce ? '' : ' · first visit only'}`, p.rate]));
  return { plan, chosen, visit, oneTimeTotal, lines, headline: isOnce ? visit + oneTimeTotal : visit };
}

function updateQuote() {
  const q = computeQuote();
  $('#q-size-out').textContent = `${money(quote.size)} sq ft`;
  $('#q-price').textContent = money(q.headline);
  $('#q-per').textContent = q.plan.per;
  $('#q-ref').textContent = `Ref Q-${String(Math.round(q.headline * 7 + quote.size)).padStart(5, '0')}`;
  $('#q-lines').replaceChildren(...q.lines.map(([k, v]) => el('li', {}, el('span', {}, k), el('span', {}, `$${money(v)}`))));
  const extra = q.plan.id !== 'once' && q.oneTimeTotal ? ` One-time treatments add $${money(q.oneTimeTotal)} to the first visit.` : '';
  $('#q-note').textContent = (q.chosen.length ? q.plan.note : 'Nothing picked yet: this is our general perimeter treatment.') + extra;
}

function quoteFor(id) {
  quote.pests = new Set([id]);
  document.querySelectorAll('#q-pests input').forEach((i) => { i.checked = i.value === id; });
  updateQuote();
  $('#quote').scrollIntoView({ behavior: 'smooth' });
}

// ============================================================================
// Service area
// ============================================================================

function nextOpenSlot() {
  for (const day of bookableDays()) {
    const free = windowsFor(day).find((w) => !isTaken(day, w));
    if (free) return `${fmtDay(day)}, ${free[0]}–${free[1]}`;
  }
  return null;
}

function initZip() {
  const out = $('#zip-result');
  $('#zip-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const zip = $('#zip-input').value.trim();
    out.className = 'zip-result mono';
    if (!/^\d{5}$/.test(zip)) { out.textContent = 'Enter a 5-digit ZIP code.'; out.classList.add('is-bad'); return; }
    if (SERVICE_ZIPS.includes(zip)) {
      const slot = nextOpenSlot();
      out.replaceChildren(`Yes, we cover ${zip}. Next open inspection: ${slot || 'call us'}. `, el('a', { href: '#book' }, 'Book it →'));
      out.classList.add('is-good');
      $('#book-form').zip.value = zip;
    } else {
      out.replaceChildren(`Not ${zip} yet. Call ${BUSINESS.phone}: we travel for termite and bed bug jobs.`);
      out.classList.add('is-bad');
    }
  });
  $('#zip-input').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); });
}

// ============================================================================
// Booking
// ============================================================================

const BOOK_KEY = 'kestrel-bookings';
const booking = { day: null, window: null };

function bookableDays() {
  const days = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  // Start tomorrow if today's last window has already begun.
  const now = new Date();
  if (now.getHours() * 60 + now.getMinutes() >= mins(WINDOWS[WINDOWS.length - 1][0]) - 60) d.setDate(d.getDate() + 1);
  while (days.length < BOOKABLE_DAYS) {
    if (HOURS[d.getDay()]) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function windowsFor(day) {
  const h = HOURS[day.getDay()];
  if (!h) return [];
  const now = new Date();
  const isToday = dayKey(day) === dayKey(now);
  return WINDOWS.filter(([start, end]) => mins(start) >= mins(h.open) && mins(end) <= mins(h.close) &&
    (!isToday || mins(start) > now.getHours() * 60 + now.getMinutes() + 60));
}

// Some windows look booked already (a stand-in for a real calendar), plus the visitor's own bookings.
function isTaken(day, w) {
  const key = `${dayKey(day)} ${w[0]}`;
  if (store.get(BOOK_KEY, []).some((b) => `${b.day} ${b.window[0]}` === key)) return true;
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 3 === 0;
}

function renderDays() {
  const days = bookableDays();
  const wrap = $('#days');
  wrap.replaceChildren(...days.map((d) => {
    const full = windowsFor(d).every((w) => isTaken(d, w));
    return el('button', {
      type: 'button', role: 'radio', class: 'day', 'aria-checked': String(booking.day === dayKey(d)), disabled: full,
      'data-day': dayKey(d), onclick: () => { booking.day = dayKey(d); booking.window = null; renderDays(); renderSlots(); },
    }, el('span', { class: 'mono' }, DAY_NAMES[d.getDay()]), el('strong', {}, String(d.getDate())), el('span', { class: 'mono' }, full ? 'Full' : MONTHS[d.getMonth()]));
  }));
  if (!booking.day) {
    const first = days.find((d) => windowsFor(d).some((w) => !isTaken(d, w)));
    if (first) { booking.day = dayKey(first); renderDays(); }
  }
}

function renderSlots() {
  const day = bookableDays().find((d) => dayKey(d) === booking.day);
  const wrap = $('#slots');
  if (!day) { wrap.replaceChildren(el('p', { class: 'mono muted' }, 'Pick a day first.')); return; }
  wrap.replaceChildren(...windowsFor(day).map((w) => {
    const taken = isTaken(day, w);
    const on = booking.window && booking.window[0] === w[0];
    return el('button', {
      type: 'button', role: 'radio', class: 'slot', 'aria-checked': String(!!on), disabled: taken,
      onclick: () => { booking.window = w; renderSlots(); },
    }, `${w[0]}–${w[1]}`, el('span', { class: 'mono' }, taken ? 'Booked' : 'Open'));
  }));
}

function initBooking() {
  const sel = $('#book-pest');
  sel.append(el('option', { value: '' }, 'Not sure yet'), ...PESTS.map((p) => el('option', { value: p.id }, p.common)));
  renderDays();
  renderSlots();

  $('#q-book').addEventListener('click', () => {
    const first = [...quote.pests][0];
    if (first) sel.value = first;
  });

  const form = $('#book-form');
  form.zip.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('#book-error');
    const data = Object.fromEntries(new FormData(form));
    const fail = (msg, field) => { err.textContent = msg; if (field) form[field].focus(); };
    form.querySelectorAll('[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
    const mark = (f) => form[f].setAttribute('aria-invalid', 'true');
    if (!booking.day || !booking.window) return fail('Pick a day and an arrival window above.');
    if (!data.name.trim()) { mark('name'); return fail('Tell us your name.', 'name'); }
    if (data.phone.replace(/\D/g, '').length < 7) { mark('phone'); return fail('We need a phone number to confirm.', 'phone'); }
    if (!data.address.trim()) { mark('address'); return fail('Add the street address we are visiting.', 'address'); }
    if (!/^\d{5}$/.test(data.zip)) { mark('zip'); return fail('Enter a 5-digit ZIP code.', 'zip'); }
    if (!SERVICE_ZIPS.includes(data.zip)) { mark('zip'); return fail(`${data.zip} is outside our area. Call ${BUSINESS.phone} and we will see what we can do.`, 'zip'); }
    err.textContent = '';
    const q = computeQuote();
    const record = {
      ref: `KP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      day: booking.day, window: booking.window, ...data,
      quote: q.chosen.length ? `$${money(q.headline)} ${q.plan.per}` : null,
    };
    store.set(BOOK_KEY, [...store.get(BOOK_KEY, []), record]);
    showConfirm(record);
  });
}

function showConfirm(b) {
  const [y, m, d] = b.day.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const pest = pestById(b.pest);
  const box = $('#confirm');
  box.replaceChildren(
    el('p', { class: 'mono label label-dark' }, 'Inspection confirmed'),
    el('p', { class: 'confirm-ref' }, b.ref),
    el('dl', { class: 'confirm-list mono' },
      el('dt', {}, 'When'), el('dd', {}, `${fmtDay(date)}, arriving ${b.window[0]}–${b.window[1]}`),
      el('dt', {}, 'Where'), el('dd', {}, `${b.address}, ${b.zip}`),
      el('dt', {}, 'Looking for'), el('dd', {}, pest ? pest.common : 'Not sure yet'),
      b.quote ? [el('dt', {}, 'Quote'), el('dd', {}, b.quote)] : null),
    el('p', {}, `We will text ${b.phone} when the technician is on the way. Need to change it? Call ${BUSINESS.phone}.`),
    el('div', { class: 'entry-actions' },
      el('button', { class: 'btn btn-line', type: 'button', onclick: () => cancelBooking(b.ref) }, 'Cancel this booking'),
      el('button', { class: 'btn btn-hot', type: 'button', onclick: resetBooking }, 'Book another')));
  $('#book-form').hidden = true;
  document.querySelectorAll('.book-step').forEach((s) => { s.hidden = true; });
  box.hidden = false;
  box.focus();
}

function cancelBooking(ref) {
  store.set(BOOK_KEY, store.get(BOOK_KEY, []).filter((b) => b.ref !== ref));
  resetBooking();
}

function resetBooking() {
  booking.day = null;
  booking.window = null;
  $('#book-form').reset();
  $('#book-form').hidden = false;
  document.querySelectorAll('.book-step').forEach((s) => { s.hidden = false; });
  $('#confirm').hidden = true;
  renderDays();
  renderSlots();
}

// ============================================================================
// Reviews and FAQ
// ============================================================================

function renderCases() {
  $('#case-list').append(...CASES.map((c) => el('figure', { class: 'case' },
    el('p', { class: 'case-head mono' },
      el('span', {}, `Case ${c.no}`), el('span', {}, c.pest), el('span', {}, c.where),
      el('span', {}, `Closed in ${c.days} day${c.days === 1 ? '' : 's'}`)),
    el('blockquote', { class: 'case-quote' }, `“${c.quote}”`),
    el('figcaption', { class: 'mono' }, `— ${c.who}`))));
}

function renderFaq() {
  $('#faq-list').append(...FAQ.map((f, i) => el('details', { class: 'faq-item', open: i === 0 },
    el('summary', {}, el('span', { class: 'mono faq-n' }, String(i + 1).padStart(2, '0')), el('span', { class: 'faq-text' }, f.q), el('span', { class: 'faq-plus', 'aria-hidden': 'true' })),
    el('p', {}, f.a))));
}

// ============================================================================

fillBusiness();
renderTicker();
renderHours();
renderDrawer();
renderSteps();
renderQuoteControls();
updateQuote();
renderCases();
renderFaq();
initZip();
initBooking();
