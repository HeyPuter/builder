// Halden Electric: a one-page site for a local electrical contractor.
// Everything a business would change lives in the data below: contact
// details, services, the panel planner's numbers, reviews, FAQ and the area.

const BUSINESS = {
  name: 'Halden Electric',
  phone: '(555) 014-2290',
  email: 'office@haldenelectric.example',
  license: 'Lic. EC-0048213',
  since: 2004,
  region: 'Greater Riverton',
  regionShort: 'Riverton',
  rating: '4.9',
  reviewCount: '640+',
  callFee: '$89',
  warranty: '2 years',
  insurance: '$2M liability, bonded',
  onCall: { name: 'Dana Ruiz', role: 'Master electrician, 14 years', eta: 'under 60 min' },
  // Booking windows are two hours long. Days: 0 = Sunday … 6 = Saturday.
  hours: { days: [1, 2, 3, 4, 5, 6], open: 7, close: 18 },
  hoursText: 'Mon–Sat, 7 am – 6 pm',
};

// Where booking requests go. With an endpoint (Formspree, Basin, your own
// worker…) the form posts JSON there; without one it opens an email to
// BUSINESS.email with the request filled in.
const FORM = { endpoint: '' };

const SERVICES = [
  {
    id: 'panel', name: 'Panel upgrades', short: '100 A to 200 A service, new panels, subpanels',
    from: 'From $2,400', time: 'One day, power off 6–8 hours',
    photo: 'photos/breakers.jpg', alt: 'A row of circuit breakers inside a panel',
    body: 'Old fuse boxes, recalled panels and panels with no room left. We size the new service, deal with the utility and the permit, and leave every breaker labeled.',
    includes: ['Load calculation and permit', 'Utility disconnect and reconnect', 'New main, breakers and surge protection', 'Typed circuit directory'],
  },
  {
    id: 'ev', name: 'EV chargers', short: 'Level 2 home charging for any car',
    from: 'From $650', time: 'Half a day',
    photo: 'photos/ev-charging.jpg', alt: 'An electric car plugged in to charge',
    body: 'A dedicated 240 V circuit sized to your car and your panel. We mount the charger you bought, or help you choose one, and set up charging for off-peak rates.',
    includes: ['Panel capacity check', 'Dedicated 240 V circuit', 'Wall or pedestal mount', 'App and schedule setup'],
  },
  {
    id: 'lighting', name: 'Lighting', short: 'Recessed, pendants, under-cabinet, dimmers',
    from: 'From $180 a fixture', time: 'Most rooms in a day',
    photo: 'photos/kitchen-lighting.jpg', alt: 'A kitchen with recessed, cove and pendant lighting',
    body: 'From swapping one fixture to lighting a whole kitchen. We cut clean, patch tidy and match dimmers to the bulbs so nothing buzzes or flickers.',
    includes: ['Layout advice', 'Fixtures hung and leveled', 'Dimmers matched to bulbs', 'Drywall patched, ready to paint'],
  },
  {
    id: 'rewire', name: 'Rewiring', short: 'Knob-and-tube, aluminum, ungrounded circuits',
    from: 'Quoted room by room', time: '3–7 days for most homes',
    photo: 'photos/rewire.jpg', alt: 'Bare wire ends coming out of a white wall',
    body: 'Older wiring brought up to code with as few holes as possible. You can stay at home; rooms we are not working in keep their power.',
    includes: ['Room-by-room plan', 'Grounded outlets with GFCI and AFCI', 'Linked smoke and CO alarms', 'Final inspection'],
  },
  {
    id: 'backup', name: 'Backup power', short: 'Generators, transfer switches, home batteries',
    from: 'From $1,200', time: '1–2 days',
    photo: 'photos/solar-roof.jpg', alt: 'Solar panels on the roof of a brick house',
    body: 'Keep the fridge, furnace and Wi-Fi running through an outage. We wire generator inlets, standby generators and home batteries, including tie-ins with solar.',
    includes: ['Essential-load planning', 'Inlet or automatic transfer switch', 'Battery and solar tie-ins', 'Utility paperwork'],
  },
  {
    id: 'repair', name: 'Troubleshooting', short: 'Tripping breakers, dead outlets, flicker',
    from: '$89 flat call', time: 'Same day for most calls',
    photo: 'photos/rcd-switch.jpg', alt: 'A residual current breaker on a dark surface',
    body: 'We find the fault before we price the fix. The $89 call covers the diagnosis and is credited to the repair if you go ahead.',
    includes: ['Diagnosis with a written price', 'Most repairs on the first visit', 'Common parts on the truck', 'Photos of what we found'],
  },
  {
    id: 'outdoor', name: 'Outdoor & spa', short: 'Path, porch and security lights, hot tubs',
    from: 'From $350', time: 'Half a day to two days',
    photo: 'photos/house-dusk.jpg', alt: 'A modern house lit up at dusk',
    body: 'Weather-rated outdoor circuits, low-voltage landscape lighting, motion and security lights, and the disconnect a hot tub needs.',
    includes: ['Buried or surface conduit', 'GFCI-protected outdoor outlets', 'Timers and smart controls', 'Hot tub disconnects'],
  },
  {
    id: 'commercial', name: 'Commercial', short: 'Shops, offices and tenant fit-outs',
    from: 'Quoted per project', time: 'Scheduled around your hours',
    photo: 'photos/led-retrofit.jpg', alt: 'An electrician on a ladder fitting LED lights in an office corridor',
    body: 'Fit-outs, LED retrofits and service work for small businesses. We work nights and weekends so you don\'t have to close.',
    includes: ['Drawings and permits', 'LED and emergency lighting', 'Dedicated equipment circuits', 'After-hours scheduling'],
  },
];

// The panel planner. Demand is in amps at 240 V and deliberately simple: a
// baseline for the home plus each planned load, compared with 80% of the
// main service (the usual limit for continuous load). Prices are installed
// ballparks for the electrical work only.
const PLANNER = {
  serviceSizes: [100, 125, 150, 200],
  defaultService: 100,
  homeSizes: [
    { id: 'small', label: 'Under 1,500 ft²', short: '< 1,500 ft²', base: 50 },
    { id: 'medium', label: '1,500–2,500 ft²', short: '1,500–2,500', base: 65 },
    { id: 'large', label: 'Over 2,500 ft²', short: '> 2,500 ft²', base: 85 },
  ],
  defaultHome: 'medium',
  loads: [
    { id: 'ev', label: 'EV charger', note: '40 A circuit', amps: 32, price: [650, 1400], on: true },
    { id: 'heatpump', label: 'Heat pump', note: '3-ton, all-electric', amps: 30, price: [450, 900] },
    { id: 'range', label: 'Induction range', note: '40 A circuit', amps: 30, price: [350, 800] },
    { id: 'water', label: 'Heat pump water heater', note: '30 A circuit', amps: 15, price: [300, 650] },
    { id: 'dryer', label: 'Electric dryer', note: '30 A circuit', amps: 24, price: [300, 600] },
    { id: 'spa', label: 'Hot tub', note: '50 A disconnect', amps: 40, price: [900, 1800] },
    { id: 'minisplit', label: 'Mini-split', note: 'One zone', amps: 10, price: [300, 600] },
    { id: 'shop', label: 'Workshop subpanel', note: '60 A feeder', amps: 30, price: [1200, 2400] },
  ],
  // Between 80% and 100%: a load manager can often stand in for an upgrade.
  loadManager: [600, 1500],
  // Over 100%: the smallest of these that keeps demand under 80%.
  upgrades: [
    { amps: 200, price: [2400, 4200] },
    { amps: 320, price: [4500, 8000] },
    { amps: 400, price: [5500, 9500] },
  ],
};

const PLATE = [
  { k: 'License', v: 'EC-0048213, State Electrical Board' },
  { k: 'Electricians', v: '6 masters, no subcontractors' },
  { k: 'Insurance', v: '$2M liability, bonded' },
  { k: 'Warranty', v: '2 years on workmanship' },
  { k: 'Permits', v: 'Pulled on every job that needs one' },
  { k: 'In service', v: 'Since 2004' },
];

const STEPS = [
  { title: 'Book or call', body: 'Pick a two-hour window online or by phone. Emergencies go to the front of the line.' },
  { title: 'Flat price first', body: 'We diagnose, explain the options and give you a written price before any work starts.' },
  { title: 'Wired to code', body: 'We pull the permit, do the work and label everything we touch.' },
  { title: 'Inspected and tidy', body: 'We meet the inspector, vacuum up, and email you photos and paperwork.' },
];

const REVIEWS = [
  {
    name: 'Priya S.', place: 'Elm Heights', job: '200 A panel upgrade', stars: 5,
    text: 'They had the utility, the permit and the inspector lined up before I had even booked the day off. Power was back by 3 pm and every breaker is labeled in plain English.',
  },
  {
    name: 'Marcus T.', place: 'Old Mill', job: 'EV charger', stars: 5,
    text: 'Three companies quoted me a charger. Halden was the only one that checked whether my panel could take it first. It could, so I skipped an upgrade I never needed.',
  },
  {
    name: 'Joan and Bill K.', place: 'Riverside', job: 'Emergency call, 11 pm', stars: 5,
    text: 'We smelled something burning behind a light switch late at night. Dana was here in forty minutes, found a scorched connection and made it safe the same night.',
  },
];

const FAQ = [
  { q: 'Do you charge to come out?', a: 'A flat $89 service call covers the visit and the diagnosis, and it is credited to the bill if you go ahead with the repair. Quotes for planned work like panels, chargers and rewires are free.' },
  { q: 'Do you pull permits?', a: 'Yes, on every job that needs one, and we book and meet the inspector. The permit fee is on your quote, never added later.' },
  { q: 'How do I know my panel needs upgrading?', a: 'Breakers that trip often, a fuse box, a panel with no free spaces, or plans for an EV charger, heat pump or induction range. Try the panel planner above, then we confirm on site.' },
  { q: 'When is it an emergency?', a: 'Burning smells, sparks, a buzzing panel, outlets that are hot to the touch, or water near anything electrical: call right away, day or night. A dead outlet or a flickering bulb can wait for a booked visit.' },
  { q: 'What does the warranty cover?', a: 'Our workmanship, for two years from the day the job passes inspection. Fixtures and equipment carry the maker\'s warranty, which we register for you.' },
  { q: 'Do you work on businesses?', a: 'Yes: shops, offices, studios and restaurants. We can work after hours so you stay open.' },
];

const AREA = ['Riverton', 'Elm Heights', 'Old Mill', 'Riverside', 'Cedar Park', 'Hollis', 'North Fork', 'Lakeview', 'Brookfield', 'Westgate'];

// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + (Math.round(n / 50) * 50).toLocaleString('en-US');
const range = ([lo, hi]) => `${money(lo)}–${money(hi)}`;

// --- Business details -------------------------------------------------------

function fillBindings() {
  const digits = BUSINESS.phone.replace(/\D/g, '');
  const values = {
    ...BUSINESS,
    phoneHref: `tel:+1${digits.slice(-10)}`,
    emailHref: `mailto:${BUSINESS.email}`,
    onCallName: BUSINESS.onCall.name,
    onCallRole: BUSINESS.onCall.role,
    eta: BUSINESS.onCall.eta,
    years: new Date().getFullYear() - BUSINESS.since,
  };
  $$('[data-bind]').forEach((el) => { el.textContent = values[el.dataset.bind] ?? ''; });
  $$('[data-bind-href]').forEach((el) => { el.setAttribute('href', values[el.dataset.bindHref] ?? '#'); });
  $('#year').textContent = new Date().getFullYear();
}

const hourLabel = (h) => `${((h + 11) % 12) + 1} ${h >= 12 ? 'pm' : 'am'}`;

// The next free two-hour window: later today if there is room, otherwise the
// next working day's first window.
function nextOpening(now = new Date()) {
  const { days, open, close } = BUSINESS.hours;
  const hour = now.getHours() + now.getMinutes() / 60;
  if (days.includes(now.getDay()) && hour <= close - 3) {
    const start = Math.max(open, Math.ceil(hour + 1));
    return { today: true, text: `Booking today · next window ${hourLabel(start)}–${hourLabel(start + 2)}` };
  }
  for (let i = 1; i <= 7; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    if (!days.includes(day.getDay())) continue;
    const name = i === 1 ? 'tomorrow' : day.toLocaleDateString('en-US', { weekday: 'long' });
    return { today: false, text: `Next window ${name}, ${hourLabel(open)}–${hourLabel(open + 2)}` };
  }
  return { today: false, text: 'Call to book a window' };
}

function renderOpening() {
  const { today, text } = nextOpening();
  $('#opening-text').textContent = text;
  $('#opening').classList.toggle('is-later', !today);
}

// --- Services: the circuit directory ---------------------------------------

let currentService = SERVICES[0].id;

function renderDirectory() {
  $('#directory-list').innerHTML = SERVICES.map((s, i) => `
    <li>
      <button class="circuit" type="button" data-service="${s.id}" aria-pressed="false" aria-controls="service-detail">
        <span class="circuit-no">${String(i + 1).padStart(2, '0')}</span>
        <span><span class="circuit-name">${esc(s.name)}</span><span class="circuit-short">${esc(s.short)}</span></span>
        <span class="circuit-from">${esc(s.from)}</span>
      </button>
    </li>`).join('');
  $('#directory-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-service]');
    if (btn) selectService(btn.dataset.service);
  });
  selectService(currentService);
}

function selectService(id) {
  const s = SERVICES.find((x) => x.id === id) || SERVICES[0];
  currentService = s.id;
  $$('.circuit').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.service === s.id)));
  $('#service-detail').innerHTML = `
    <img src="${esc(s.photo)}" alt="${esc(s.alt)}" width="1000" height="625">
    <div class="service-body">
      <h3>${esc(s.name)}</h3>
      <div class="service-meta"><span class="tag tag-accent">${esc(s.from)}</span><span class="tag">${esc(s.time)}</span></div>
      <p>${esc(s.body)}</p>
      <ul class="checks">${s.includes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
      <a class="btn btn-accent" href="#book" data-book="${s.id}">Book ${esc(s.name.toLowerCase())} <span aria-hidden="true">→</span></a>
    </div>`;
}

// --- Panel planner ----------------------------------------------------------

const plan = {
  service: PLANNER.defaultService,
  home: PLANNER.defaultHome,
  on: new Set(PLANNER.loads.filter((l) => l.on).map((l) => l.id)),
};

function renderPlanner() {
  $('#service-sizes').innerHTML = PLANNER.serviceSizes.map((a) => `
    <label><input type="radio" name="service-size" value="${a}" ${a === plan.service ? 'checked' : ''}><span>${a} A</span></label>`).join('');
  $('#home-sizes').innerHTML = PLANNER.homeSizes.map((h) => `
    <label><input type="radio" name="home-size" value="${h.id}" ${h.id === plan.home ? 'checked' : ''} aria-label="${esc(h.label)}"><span>${esc(h.short)}</span></label>`).join('');
  $('#breakers').innerHTML = PLANNER.loads.map((l) => `
    <button class="breaker" type="button" role="switch" data-load="${l.id}" aria-checked="${plan.on.has(l.id)}">
      <span class="breaker-label">${esc(l.label)}</span>
      <span class="breaker-note">${esc(l.note)} · +${l.amps} A</span>
      <span class="breaker-handle" aria-hidden="true"><span class="breaker-amps">OFF</span></span>
    </button>`).join('');

  $('#service-sizes').addEventListener('change', (e) => { plan.service = Number(e.target.value); updatePlanner(); });
  $('#home-sizes').addEventListener('change', (e) => { plan.home = e.target.value; updatePlanner(); });
  $('#breakers').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-load]');
    if (!btn) return;
    const id = btn.dataset.load;
    if (plan.on.has(id)) plan.on.delete(id); else plan.on.add(id);
    btn.setAttribute('aria-checked', String(plan.on.has(id)));
    updatePlanner();
  });
  $('#send-plan').addEventListener('click', sendPlan);
  updatePlanner();
}

function assessPlan() {
  const home = PLANNER.homeSizes.find((h) => h.id === plan.home);
  const loads = PLANNER.loads.filter((l) => plan.on.has(l.id));
  const demand = home.base + loads.reduce((n, l) => n + l.amps, 0);
  const ratio = demand / plan.service;
  let price = loads.reduce((p, l) => [p[0] + l.price[0], p[1] + l.price[1]], [0, 0]);
  let level; let title; let text; let upgrade = null;

  if (ratio <= 0.8) {
    level = 'ok';
    title = loads.length ? 'Fits on your current service' : 'Your panel has room to grow';
    text = `That leaves about ${Math.round(plan.service * 0.8 - demand)} A below the 80% line. ${loads.length ? 'No upgrade expected, just the new circuits.' : 'Switch on what you are planning to add.'}`;
  } else if (ratio <= 1) {
    level = 'tight';
    title = 'Tight: ask about load management';
    text = `You would run at ${Math.round(ratio * 100)}% of your ${plan.service} A service. A load manager or smart panel can share power between big loads and often avoids a full upgrade.`;
    price = [price[0] + PLANNER.loadManager[0], price[1] + PLANNER.loadManager[1]];
  } else {
    level = 'over';
    const fits = PLANNER.upgrades.find((u) => u.amps > plan.service && demand <= u.amps * 0.8);
    upgrade = fits || PLANNER.upgrades[PLANNER.upgrades.length - 1];
    title = `Plan on a ${upgrade.amps} A service upgrade`;
    text = fits
      ? `That is ${demand - plan.service} A more than a ${plan.service} A service can carry. A ${upgrade.amps} A service covers it with room to spare, and the ballpark includes it.`
      : `That is more than most homes draw, even on a ${upgrade.amps} A service. We would design it with you, likely with load management as well.`;
    price = [price[0] + upgrade.price[0], price[1] + upgrade.price[1]];
  }
  return { home, loads, demand, ratio, level, title, text, price, upgrade };
}

function updatePlanner() {
  const r = assessPlan();
  $('#load-amps').textContent = r.demand;
  $('#service-amps').textContent = plan.service;
  const fill = $('#meter-fill');
  fill.style.width = `${Math.min(r.ratio, 1) * 100}%`;
  fill.className = `meter-fill${r.level === 'ok' ? '' : ` is-${r.level}`}`;
  const verdict = $('#verdict');
  verdict.className = `verdict${r.level === 'ok' ? '' : ` is-${r.level}`}`;
  verdict.innerHTML = `<span class="verdict-dot" aria-hidden="true"></span><div><strong>${esc(r.title)}</strong><p>${esc(r.text)}</p></div>`;
  $('#readout-items').textContent = r.loads.length ? r.loads.map((l) => l.label).join(', ') : 'None yet';
  $('#readout-price').textContent = r.loads.length || r.upgrade ? range(r.price) : '$0';
}

function planSummary() {
  const r = assessPlan();
  const items = r.loads.length ? r.loads.map((l) => `${l.label} (${l.note})`).join(', ') : 'nothing new yet';
  return [
    `Panel plan: ${plan.service} A service, ${r.home.label} home.`,
    `Adding: ${items}.`,
    `Estimated demand ${r.demand} A (${Math.round(r.ratio * 100)}% of service). ${r.title}. Ballpark ${range(r.price)}.`,
  ].join('\n');
}

function sendPlan() {
  const r = assessPlan();
  const details = $('#details');
  const kept = details.value.replace(/Panel plan:[\s\S]*?Ballpark[^\n]*\n?/, '').trim();
  details.value = planSummary() + (kept ? `\n\n${kept}` : '');
  $('#service-select').value = r.level === 'over' ? 'panel' : 'plan';
  showForm();
  $('#book').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  setTimeout(() => $('[name="name"]').focus({ preventScroll: true }), 450);
}

// --- Credentials, steps, reviews, FAQ, area ---------------------------------

function renderStatic() {
  $('#plate-rows').innerHTML = PLATE.map((r) => `<div><dt>${esc(r.k)}</dt><dd>${esc(r.v)}</dd></div>`).join('');
  $('#steps').innerHTML = STEPS.map((s, i) => `
    <li class="step"><span class="step-node">${String(i + 1).padStart(2, '0')}</span><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></li>`).join('');
  $('#reviews-list').innerHTML = REVIEWS.map((r, i) => `
    <figure class="review">
      <div class="review-ticket"><span>Job ${String(2291 - i * 37).padStart(4, '0')} · ${esc(r.job)}</span><span class="review-stars" role="img" aria-label="${r.stars} out of 5 stars">${'★'.repeat(r.stars)}</span></div>
      <blockquote>${esc(r.text)}</blockquote>
      <figcaption><strong>${esc(r.name)}</strong> <span>· ${esc(r.place)}</span></figcaption>
    </figure>`).join('');
  $('#faq-list').innerHTML = FAQ.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
  $('#area-list').innerHTML = AREA.map((t) => `<li>${esc(t)}</li>`).join('');
}

// --- Booking form -----------------------------------------------------------

function renderForm() {
  $('#service-select').innerHTML = [
    '<option value="">Choose one</option>',
    ...SERVICES.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`),
    '<option value="plan">New circuits from my panel plan</option>',
    '<option value="other">Something else</option>',
  ].join('');

  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-book]');
    if (!link) return;
    $('#service-select').value = link.dataset.book;
    showForm();
  });

  const form = $('#book-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const problems = validate(data);
    $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
    if (problems.length) {
      problems.forEach(([name]) => form.elements[name].setAttribute('aria-invalid', 'true'));
      showError(problems.map(([, msg]) => msg).join(' '));
      form.elements[problems[0][0]].focus();
      return;
    }
    showError('');
    const service = $('#service-select').selectedOptions[0].textContent;
    const request = { ...data, service, business: BUSINESS.name, sent: new Date().toISOString() };
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    try {
      if (FORM.endpoint) {
        const res = await fetch(FORM.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(request),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showDone(`Thanks, ${data.name.split(' ')[0]}. We'll text ${data.phone} within the hour to confirm your window.`);
      } else {
        const body = [
          `Name: ${data.name}`, `Phone: ${data.phone}`, `Email: ${data.email || '-'}`, `Address: ${data.address}`,
          `Service: ${service}`, `How soon: ${data.urgency}`, '', data.details || '',
        ].join('\n');
        window.location.href = `mailto:${BUSINESS.email}?subject=${encodeURIComponent(`Visit request: ${service}`)}&body=${encodeURIComponent(body)}`;
        showDone(`Your email app should open with the request ready to send. If it doesn't, call ${BUSINESS.phone} and we'll book you in.`);
      }
      form.reset();
    } catch (err) {
      showError(`That didn't go through. Please try again, or call ${BUSINESS.phone}.`);
    } finally {
      button.disabled = false;
    }
  });

  $('#book-again').addEventListener('click', () => { showForm(); $('[name="name"]').focus(); });
}

function validate(d) {
  const out = [];
  if (!d.name.trim()) out.push(['name', 'Add your name.']);
  if (d.phone.replace(/\D/g, '').length < 7) out.push(['phone', 'Add a phone number we can text.']);
  if (d.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) out.push(['email', 'Check the email address.']);
  if (!d.address.trim()) out.push(['address', 'Add your street or ZIP.']);
  if (!d.service) out.push(['service', 'Choose what you need.']);
  return out;
}

function showError(msg) {
  const el = $('#form-error');
  el.textContent = msg;
  el.hidden = !msg;
}

function showDone(text) {
  $('#book-done-text').textContent = text;
  $('#book-form').hidden = true;
  $('#book-done').hidden = false;
  $('#book-done').focus();
}

function showForm() {
  $('#book-form').hidden = false;
  $('#book-done').hidden = true;
}

// --- Header -----------------------------------------------------------------

function setupMenu() {
  const header = $('.site-header');
  const toggle = $('.menu-toggle');
  const setOpen = (open) => {
    header.classList.toggle('menu-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  toggle.addEventListener('click', () => setOpen(!header.classList.contains('menu-open')));
  $('#site-nav').addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('menu-open')) { setOpen(false); toggle.focus(); }
  });

  // Highlight the nav link of the section in the middle of the screen.
  const links = $$('#site-nav a[href^="#"]:not(.nav-book)');
  const sections = links.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  if (!('IntersectionObserver' in window) || !sections.length) return;
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => {
        const on = a.getAttribute('href') === `#${entry.target.id}`;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => spy.observe(s));
}

fillBindings();
renderOpening();
renderDirectory();
renderPlanner();
renderStatic();
renderForm();
setupMenu();
