// =============================================================================
// CONTENT — edit everything about the business here.
// =============================================================================

const BUSINESS = {
  name: 'Pawment Walking Club',
  short: 'Pawment',
  tagline: 'Small-group dog walks, drop-ins and overnight sitting across the east side. Same walker, same days, a GPS pupdate after every walk.',
  area: 'East side dog walkers',
  est: 2016,
  phone: '(555) 014-2290',
  email: 'woof@pawment.example',
  emergency: 'Walker on the road? Text (555) 014-2291 any time.',
  address: 'Office & key safe: 18 Tanner Yard, Unit 4',
  currency: '$',
  packDiscount: 0.12,       // 10-pack saving, 0.12 = 12% off
  extraDogPrice: 0.5,       // each extra dog from the same home costs this share of the price
};

// Office hours. 0 = Sunday … 6 = Saturday. null = closed.
const HOURS = [
  { day: 'Sun', open: null },
  { day: 'Mon', open: '07:00', close: '19:00' },
  { day: 'Tue', open: '07:00', close: '19:00' },
  { day: 'Wed', open: '07:00', close: '19:00' },
  { day: 'Thu', open: '07:00', close: '19:00' },
  { day: 'Fri', open: '07:00', close: '19:00' },
  { day: 'Sat', open: '09:00', close: '15:00' },
];

// Services. `slots` are the start times you can book; `days` are the
// weekdays the service runs (0 = Sunday).
const SERVICES = [
  { id: 'pack', name: 'Pack walk', desc: 'An hour in the park with up to 3 friends. Our most booked walk.', length: '60 min', group: 'Max 4', price: 24, slots: ['08:00', '10:30', '13:00', '15:30'], days: [1, 2, 3, 4, 5] },
  { id: 'solo', name: 'Solo stroll', desc: 'One to one, at your dog\'s pace. For seniors, reactive dogs and the very nosy.', length: '45 min', group: 'Solo', price: 28, slots: ['09:00', '11:00', '12:00', '14:00', '17:00'], days: [1, 2, 3, 4, 5, 6] },
  { id: 'puppy', name: 'Puppy visit', desc: 'Toilet break, lunch, play and a little lead training while you work.', length: '30 min', group: 'Solo', price: 19, slots: ['10:00', '12:00', '14:00'], days: [1, 2, 3, 4, 5] },
  { id: 'dropin', name: 'Drop-in', desc: 'Food, water, litter, cuddles. For cats, rabbits and dogs who prefer the sofa.', length: '30 min', group: 'Any pet', price: 17, slots: ['08:00', '12:00', '18:00'], days: [0, 1, 2, 3, 4, 5, 6] },
  { id: 'overnight', name: 'Overnight sit', desc: 'A sitter in your home from 7pm to 8am, with an evening and morning walk.', length: '13 hrs', group: 'Your home', price: 85, slots: ['19:00'], days: [0, 1, 2, 3, 4, 5, 6], perNight: true },
  { id: 'meet', name: 'Meet & greet', desc: 'We come over, meet your dog, learn the routine and collect keys. Always free.', length: '20 min', group: 'At home', price: 0, slots: ['12:30', '17:30'], days: [1, 2, 3, 4, 5, 6], noPack: true },
];

// Slots already taken, by weekday (0 = Sunday). Requests made on this page
// are added on top of these.
const BOOKED = {
  1: ['10:30', '12:00'],
  2: ['08:00', '14:00'],
  3: ['13:00'],
  4: ['10:30', '17:00', '12:00'],
  5: ['08:00', '15:30'],
  6: ['09:00'],
};

const SIZES = ['Small (under 10kg)', 'Medium (10–25kg)', 'Large (25kg+)', 'Not a dog'];

// Neighbourhoods we cover. `codes` are the postcodes that match. `shape` is a
// polygon on the 600 x 600 area map, `at` is where its label sits.
const AREAS = [
  { name: 'Old Town', codes: ['PW1'], days: 'Mon–Sat', walker: 'Rosa', shape: '40,60 250,40 270,210 60,240', at: [80, 120] },
  { name: 'Canal Side', codes: ['PW2'], days: 'Mon–Fri', walker: 'Dev', shape: '270,40 560,70 540,230 290,210', at: [320, 110] },
  { name: 'Hillcrest', codes: ['PW3'], days: 'Mon–Sat', walker: 'Juno', shape: '60,260 270,230 300,400 40,420', at: [80, 310] },
  { name: 'Market Qtr', codes: ['PW4'], days: 'Mon–Fri', walker: 'Rosa', shape: '290,230 540,250 560,410 320,400', at: [340, 300] },
  { name: 'Millbrook', codes: ['PW5', 'PW6'], days: 'Tue–Sat', walker: 'Sam', shape: '40,440 300,420 320,560 60,560', at: [80, 480] },
  { name: 'Riverside', codes: ['PW7'], days: 'Mon–Fri', walker: 'Dev', shape: '340,420 560,430 550,560 340,560', at: [370, 480] },
];

const WALKERS = [
  { name: 'Rosa', tag: 'Head walker · 9 yrs', photo: 'images/walker-rosa.jpg', alt: 'Rosa\'s terrier, Mop, grinning in the grass', bio: 'Started Pawment with one lead and a borrowed collie. Knows every off-lead field and every dog-friendly café within three miles.', facts: ['Canine first aid, level 3', 'Speaks fluent spaniel', 'Walks Old Town & Market Qtr'] },
  { name: 'Dev', tag: 'Pack walks · 5 yrs', photo: 'images/walker-dev.jpg', alt: 'Dev\'s papillon, Flick, running flat out across a lawn', bio: 'Former cross-country runner. Runs the big pack walks along the canal and is the reason half our dogs can do a perfect sit at the kerb.', facts: ['Reactive dog training cert.', 'Max 4 dogs, always', 'Walks Canal Side & Riverside'] },
  { name: 'Juno', tag: 'Puppies & seniors · 4 yrs', photo: 'images/walker-juno.jpg', alt: 'Juno\'s rescue, Bramble, resting in long grass', bio: 'Patient, quiet and very good with nervous dogs. If your puppy is learning the lead or your old boy needs a slower lap, Juno is your person.', facts: ['Puppy socialisation course', 'Medication & insulin trained', 'Walks Hillcrest'] },
  { name: 'Sam', tag: 'Sitting & drop-ins · 3 yrs', photo: 'images/walker-sam.jpg', alt: 'Sam\'s staffie, Lola, flat out on the living-room rug', bio: 'Our overnight sitter. Cats adore Sam, dogs follow Sam from room to room, and plants come back from holiday in better shape than they left.', facts: ['Cat behaviour certificate', 'Over 400 nights sat', 'Covers Millbrook'] },
];

// Sample walk reports for the "Pupdate" section. `route` is a list of points
// on a 400 x 300 map.
const PUPDATES = [
  { day: 'Mon', dog: 'Biscuit', walker: 'Rosa', start: '10:32', km: 3.4, mins: 58, pees: 4, poos: 1, photo: 'images/pup-1.jpg', note: 'Found a stick twice his size and refused to leave it. Brought it home. Sorry.', route: [[40, 250], [70, 190], [130, 170], [160, 110], [230, 90], [300, 120], [330, 190], [280, 230], [200, 220], [140, 250], [40, 250]] },
  { day: 'Tue', dog: 'Moss', walker: 'Dev', start: '08:04', km: 4.1, mins: 61, pees: 3, poos: 2, photo: 'images/pup-2.jpg', note: 'Pack walk along the canal. Moss did the full loop at a gallop and still had energy for the ball.', route: [[30, 60], [110, 70], [190, 60], [260, 90], [350, 80], [370, 160], [300, 200], [220, 190], [150, 230], [60, 210], [30, 60]] },
  { day: 'Wed', dog: 'Juniper', walker: 'Juno', start: '12:00', km: 1.2, mins: 31, pees: 2, poos: 1, photo: 'images/pup-3.jpg', note: 'Lead training going well! Sat at every kerb today. Lunch eaten, water topped up, crate door left open.', route: [[180, 260], [180, 200], [230, 170], [270, 200], [250, 250], [180, 260]] },
  { day: 'Thu', dog: 'Otto', walker: 'Rosa', start: '14:10', km: 2.6, mins: 47, pees: 5, poos: 1, photo: 'images/pup-4.jpg', note: 'Solo stroll at Otto speed. Long sniff at the bakery bins, a nap in the sun on the bench, home happy.', route: [[60, 60], [60, 140], [120, 160], [180, 220], [260, 240], [330, 200], [320, 120], [240, 90], [150, 70], [60, 60]] },
  { day: 'Fri', dog: 'Pepper', walker: 'Dev', start: '15:35', km: 3.9, mins: 60, pees: 3, poos: 1, photo: 'images/pup-5.jpg', note: 'Met a greyhound called Lightning and tried very hard to keep up. Muddy paws wiped, towel on the radiator.', route: [[50, 150], [120, 80], [210, 50], [300, 70], [360, 140], [320, 230], [230, 260], [140, 240], [80, 200], [50, 150]] },
];

const REVIEWS = [
  { text: 'Biscuit hears the van and does a lap of the hallway.', who: 'Hannah', dog: 'Biscuit, beagle' },
  { text: 'The pupdates are the best part of my working day.', who: 'Marcus', dog: 'Moss, collie cross' },
  { text: 'Two weeks away and the cat didn\'t even notice.', who: 'Priya', dog: 'Noodle, cat' },
  { text: 'Our nervous rescue now pulls towards Juno, not away.', who: 'Tom & Ali', dog: 'Otto, greyhound' },
];
const REVIEW_SCORE = { stars: 4.9, count: 312 };

const RULES = [
  { title: 'Small groups, never more than four', body: 'Pack walks are capped at four dogs, matched by size and energy. Everything else is solo.' },
  { title: 'Same walker, same days', body: 'Your dog gets one regular walker and a named backup who has already met them.' },
  { title: 'Insured, checked, trained', body: 'Every walker is background-checked, covered by public liability and care-custody insurance, and pet first-aid certified.' },
  { title: 'Keys are coded, never labelled', body: 'Keys live in a locked safe with a code tag. No address ever goes on a key.' },
  { title: 'GPS on every walk', body: 'Each walk is tracked and sent to you with the route, time, photos and any toilet business.' },
];

const FAQ = [
  { q: 'Do you do a trial walk?', a: 'Every new dog starts with a free meet & greet at home. After that the first walk is half price, so you can see how it goes.' },
  { q: 'What happens if it rains?', a: 'We walk. Dogs come home towelled off. In storms or extreme heat we swap to a shorter walk and indoor play, and tell you first.' },
  { q: 'How do I cancel or move a walk?', a: 'Free up to 6pm the day before. Later than that we charge half, because your walker has kept the slot for you.' },
  { q: 'Can you give medication?', a: 'Yes, tablets, drops and insulin. Leave clear instructions and we log every dose in the pupdate.' },
  { q: 'Do you walk dogs off lead?', a: 'Only with your written OK, only in safe fenced spaces, and only after a few weeks of solid recall with us.' },
  { q: 'How do I pay?', a: 'By monthly invoice, card or bank transfer. 10-packs are paid up front and never expire.' },
];

// Names that cycle in the hero, "WE WALK ___".
const HERO_DOGS = ['Biscuit', 'Moss', 'Juniper', 'Otto', 'Pepper', 'Noodle', 'Waffles', 'Bear'];

// =============================================================================
// APP
// =============================================================================

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => BUSINESS.currency + (Math.round(n * 100) / 100).toFixed(n % 1 ? 2 : 0);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const STORE_KEY = 'pawment.requests';

const store = {
  get() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; } },
  set(list) { try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch { /* storage off */ } },
};

const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmtTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return m ? `${hh}:${String(m).padStart(2, '0')}${ap}` : `${hh}${ap}`;
};
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDate = (s) => parseIso(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

// ---- bind business details --------------------------------------------------
$$('[data-bind]').forEach((el) => { el.textContent = BUSINESS[el.dataset.bind] ?? ''; });
$$('[data-bind-href]').forEach((el) => {
  const kind = el.dataset.bindHref;
  el.href = kind === 'tel' ? 'tel:' + BUSINESS.phone.replace(/[^\d+]/g, '') : 'mailto:' + BUSINESS.email;
});
$('#year').textContent = new Date().getFullYear();
document.title = `${BUSINESS.name} — Dog walking & pet sitting`;

// ---- availability -----------------------------------------------------------
function takenSlots(dateStr, serviceId) {
  const day = parseIso(dateStr).getDay();
  const svc = SERVICES.find((s) => s.id === serviceId);
  const base = svc && svc.id === 'overnight' ? [] : (BOOKED[day] || []);
  const mine = store.get().filter((r) => r.date === dateStr && (r.service === serviceId || serviceId !== 'overnight')).map((r) => r.slot);
  return new Set([...base, ...mine]);
}
function freeSlots(dateStr, svc) {
  const day = parseIso(dateStr).getDay();
  if (!svc.days.includes(day)) return [];
  const taken = takenSlots(dateStr, svc.id);
  return svc.slots.filter((t) => !taken.has(t));
}
function nextFree() {
  const d = new Date();
  for (let i = 1; i < 21; i++) {
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
    const s = iso(day);
    const svc = SERVICES[0];
    const free = freeSlots(s, svc);
    if (free.length) return `${fmtDate(s)} ${fmtTime(free[0])}`;
  }
  return 'call us';
}

// ---- status ticker ----------------------------------------------------------
(function status() {
  const now = new Date();
  const h = HOURS[now.getDay()];
  const mins = now.getHours() * 60 + now.getMinutes();
  const open = h.open && mins >= toMin(h.open) && mins < toMin(h.close);
  const out = open ? 2 + ((now.getHours() * 7 + now.getDay()) % 5) : 0;
  const items = [
    open ? `<span class="live">${out} walkers out right now</span>` : `<span>Office closed · back ${nextOpen()}</span>`,
    `<span>Next pack walk: ${esc(nextFree())}</span>`,
    `<span>★ ${REVIEW_SCORE.stars} from ${REVIEW_SCORE.count} owners</span>`,
    `<span>Free meet &amp; greet for new dogs</span>`,
    `<span>Covering ${AREAS.map((a) => esc(a.name)).join(' · ')}</span>`,
  ].join('');
  $('#statusTrack').innerHTML = items + items;
  function nextOpen() {
    for (let i = 1; i <= 7; i++) {
      const dd = HOURS[(now.getDay() + i) % 7];
      if (dd.open) return `${dd.day} ${fmtTime(dd.open)}`;
    }
    return 'soon';
  }
})();

// ---- hero dog names ---------------------------------------------------------
(function heroDogs() {
  const el = $('#heroDog');
  let i = 0;
  el.textContent = HERO_DOGS[0];
  if (reduceMotion || HERO_DOGS.length < 2) return;
  setInterval(() => {
    el.classList.add('out');
    setTimeout(() => {
      i = (i + 1) % HERO_DOGS.length;
      el.textContent = HERO_DOGS[i];
      el.classList.remove('out');
    }, 320);
  }, 2200);
})();

// ---- hero route dot ---------------------------------------------------------
(function routeDot() {
  const svg = $('.route-hero');
  const path = $('#heroRoute');
  const dot = $('.route-dot', svg);
  const len = path.getTotalLength();
  let t = 0.22;
  const place = () => {
    const p = path.getPointAtLength(len * t);
    dot.setAttribute('cx', p.x); dot.setAttribute('cy', p.y);
  };
  place();
  if (reduceMotion) return;
  let last = performance.now();
  const step = (now) => {
    t = (t + (now - last) / 26000) % 1;
    last = now;
    place();
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
})();

// ---- timetable --------------------------------------------------------------
let packMode = false;
const pct = Math.round(BUSINESS.packDiscount * 100);
$('#packOff').textContent = `−${pct}%`;

function priceHtml(svc) {
  if (!svc.price) return 'Free';
  if (packMode && !svc.noPack) {
    const each = svc.price * (1 - BUSINESS.packDiscount);
    return `<s>${money(svc.price)}</s>${money(each)}<small>${money(each * 10)} for 10</small>`;
  }
  return `${money(svc.price)}<small>${svc.perNight ? 'per night' : 'per visit'}</small>`;
}
function renderBoard() {
  $('#board').innerHTML = SERVICES.map((s) => `
    <div class="row" role="row" data-id="${s.id}">
      <div class="row-name" role="cell"><strong>${esc(s.name)}</strong><span class="row-desc">${esc(s.desc)}</span></div>
      <span class="cell len" role="cell">${esc(s.length)}</span>
      <span class="cell" role="cell">${esc(s.group)}</span>
      <span class="price" role="cell"><span class="flip">${priceHtml(s)}</span></span>
      <span role="cell"><button type="button" class="row-go" aria-label="Book ${esc(s.name)}">→</button></span>
    </div>`).join('');
}
renderBoard();
$$('.toggle-btn').forEach((b) => b.addEventListener('click', () => {
  packMode = b.dataset.pack === 'pack';
  $$('.toggle-btn').forEach((x) => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on); });
  renderBoard();
  updateStub();
}));
$('#board').addEventListener('click', (e) => {
  const row = e.target.closest('.row');
  if (row) goBook(row.dataset.id);
});

// ---- pupdate ----------------------------------------------------------------
function routeSvg(pts) {
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');
  const [sx, sy] = pts[0];
  return `<svg viewBox="0 0 400 300" aria-hidden="true">
    <rect class="park" x="120" y="100" width="150" height="90" rx="6"/>
    <g class="streets">
      <path d="M0 60 H400"/><path d="M0 150 H400"/><path d="M0 240 H400"/>
      <path d="M60 0 V300"/><path d="M180 0 V300"/><path d="M320 0 V300"/>
      <path d="M0 290 L400 20"/>
    </g>
    <path class="walk" d="${d}" pathLength="1000"/>
    <circle class="pin" cx="${sx}" cy="${sy}" r="7"/>
    <text class="pin-txt" x="${sx + 12}" y="${sy + 4}">HOME</text>
  </svg>`;
}
function renderPupdate(i) {
  const p = PUPDATES[i];
  $$('#puDays button').forEach((b, k) => { b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; });
  $('#puStats').innerHTML = `
    <div class="stat"><b>${p.km.toFixed(1)}</b><span>Kilometres</span></div>
    <div class="stat"><b>${p.mins}</b><span>Minutes out</span></div>
    <div class="stat"><b>${p.pees}</b><span>Pees</span></div>
    <div class="stat"><b>${p.poos}</b><span>Poos (bagged)</span></div>
    <p class="pu-quote">“${esc(p.note)}”</p>`;
  $('#puReceipt').innerHTML = `
    <header><span>Pupdate #${2400 + i * 17}</span><span>${esc(p.day)} ${esc(p.start)}</span></header>
    <div class="map">${routeSvg(p.route)}</div>
    <div class="photo"><img src="${esc(p.photo)}" alt="${esc(p.dog)} on today's walk"><div><b style="font:400 30px/1 var(--display);text-transform:uppercase">${esc(p.dog)}</b><br>Walked by ${esc(p.walker)}</div></div>
    <dl>
      <div><dt>Distance</dt><dd>${p.km.toFixed(1)} km</dd></div>
      <div><dt>Time out</dt><dd>${p.mins} min</dd></div>
      <div><dt>Water</dt><dd>Topped up</dd></div>
      <div><dt>Paws</dt><dd>Wiped</dd></div>
    </dl>
    <p class="sig">— ${esc(p.walker)}, ${esc(BUSINESS.short)}</p>`;
}
$('#puDays').innerHTML = PUPDATES.map((p, i) => `<button type="button" role="tab" id="pu-tab-${i}" aria-controls="puReceipt">${esc(p.day)}<span class="sr"> — ${esc(p.dog)}</span></button>`).join('');
$$('#puDays button').forEach((b, i) => {
  b.addEventListener('click', () => renderPupdate(i));
  b.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + PUPDATES.length) % PUPDATES.length;
    renderPupdate(n); $$('#puDays button')[n].focus();
  });
});
renderPupdate(0);

// ---- area -------------------------------------------------------------------
const norm = (s) => String(s).toUpperCase().replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
function findArea(q) {
  const n = norm(q);
  if (!n) return null;
  // The outward code: "PW5 2AB" -> PW5, "PW52AB" -> PW5, "PW5" -> PW5.
  const compact = n.replace(/ /g, '');
  const outward = n.includes(' ') ? n.split(' ')[0] : (compact.length >= 5 ? compact.slice(0, -3) : compact);
  return AREAS.find((a) => a.codes.includes(outward)) ||
    AREAS.find((a) => norm(a.name) === n || norm(a.name).startsWith(n) && n.length >= 3) || null;
}
(function renderMap() {
  const svg = $('#areaMap');
  svg.innerHTML = `<path class="river" d="M-20 425 C 120 390, 240 450, 330 410 S 520 400, 620 430"/>` +
    AREAS.map((a, i) => `<g class="zone-g" data-i="${i}">
      <polygon class="zone" points="${a.shape}" tabindex="0" role="button" aria-label="${esc(a.name)}, walked ${esc(a.days)}"/>
      <text class="zone-label" x="${a.at[0]}" y="${a.at[1]}">${esc(a.name)}</text>
      <text class="zone-days" x="${a.at[0]}" y="${a.at[1] + 20}">${esc(a.codes.join(' / '))} · ${esc(a.days.toUpperCase())}</text>
    </g>`).join('') +
    `<path class="map-route" d="M120 190 C 200 160, 260 240, 330 190 S 470 150, 500 210 S 430 330, 360 350 S 200 300, 150 360 S 140 500, 230 520 S 420 470, 480 520"/>
    <g class="hq" transform="translate(300 218)"><circle r="16"/><text y="5">HQ</text></g>`;
  $$('.zone-g', svg).forEach((g) => {
    const pick = () => { const a = AREAS[g.dataset.i]; $('#areaInput').value = a.name; showArea(a, a.name); };
    g.addEventListener('click', pick);
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
  });
  $('#areaList').innerHTML = AREAS.map((a) => `<li>${esc(a.name)} <span>${esc(a.codes.join('/'))}</span></li>`).join('');
})();
function showArea(a, q) {
  const out = $('#areaResult');
  $$('.zone-g').forEach((g) => g.classList.toggle('is-hit', a && AREAS[g.dataset.i] === a));
  if (a) {
    out.className = 'area-result yes';
    out.innerHTML = `<b>Yes!</b> We walk ${esc(a.name)} ${esc(a.days)}. Your walker would be ${esc(a.walker)}. <a href="#book" data-post="${esc(a.codes[0])}">Book a walk →</a>`;
  } else {
    out.className = 'area-result no';
    out.innerHTML = `<b>Not yet.</b> “${esc(q)}” is just off our map. Call ${esc(BUSINESS.phone)} and we'll see what we can do.`;
  }
}
$('#areaForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#areaInput').value.trim();
  if (q) showArea(findArea(q), q);
});
$('#areaResult').addEventListener('click', (e) => {
  const a = e.target.closest('[data-post]');
  if (a) { $('#fPost').value = a.dataset.post; checkPost(); }
});

// ---- the pack ---------------------------------------------------------------
$('#walkers').innerHTML = WALKERS.map((w, i) => `
  <li class="walker">
    <button type="button" class="walker-btn" aria-expanded="false" aria-controls="w-${i}">
      <span class="num">${String(i + 1).padStart(2, '0')}</span>
      <span class="wname">${esc(w.name)}</span>
      <span class="wtag">${esc(w.tag)}</span>
      <span class="plus" aria-hidden="true">+</span>
    </button>
    <div class="walker-body" id="w-${i}"><div><div class="walker-inner">
      <img src="${esc(w.photo)}" alt="${esc(w.alt)}" loading="lazy">
      <div class="wbio"><p>${esc(w.bio)}</p><ul>${w.facts.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></div>
    </div></div></div>
  </li>`).join('');
$$('.walker-btn').forEach((b) => b.addEventListener('click', () => {
  const li = b.parentElement;
  const open = !li.classList.contains('is-open');
  $$('.walker').forEach((x) => { x.classList.remove('is-open'); $('.walker-btn', x).setAttribute('aria-expanded', 'false'); });
  if (open) { li.classList.add('is-open'); b.setAttribute('aria-expanded', 'true'); }
}));
$('.walker').classList.add('is-open');
$('.walker-btn').setAttribute('aria-expanded', 'true');

// ---- reviews ----------------------------------------------------------------
let qi = 0;
let qTimer;
$('#reviewScore').textContent = `★★★★★  ${REVIEW_SCORE.stars} / 5 · ${REVIEW_SCORE.count} owners`;
function showQuote(i) {
  qi = (i + REVIEWS.length) % REVIEWS.length;
  const r = REVIEWS[qi];
  const el = $('#quote');
  el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap');
  el.innerHTML = `<span class="qt">${esc(r.text)}</span><cite>${esc(r.who)} · <b>${esc(r.dog)}</b></cite>`;
  $('#qCount').textContent = `${String(qi + 1).padStart(2, '0')} / ${String(REVIEWS.length).padStart(2, '0')}`;
}
function autoQuote() { clearInterval(qTimer); if (!reduceMotion) qTimer = setInterval(() => showQuote(qi + 1), 6500); }
$('#qPrev').addEventListener('click', () => { showQuote(qi - 1); autoQuote(); });
$('#qNext').addEventListener('click', () => { showQuote(qi + 1); autoQuote(); });
showQuote(0); autoQuote();

// ---- rules, faq, hours ------------------------------------------------------
$('#rules').innerHTML = RULES.map((r) => `<li><h3>${esc(r.title)}</h3><p>${esc(r.body)}</p></li>`).join('');
$('#faqList').innerHTML = FAQ.map((f, i) => `<details class="faq-item"${i ? '' : ' open'}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');
$('#hours').innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => {
  const h = HOURS[d];
  return `<li class="${d === new Date().getDay() ? 'today' : ''}"><span>${h.day}</span><span>${h.open ? `${fmtTime(h.open)} – ${fmtTime(h.close)}` : 'Closed'}</span></li>`;
}).join('');

// ---- booking ----------------------------------------------------------------
const form = $('#bookForm');
const state = { service: SERVICES[0].id, slot: null };
const fDate = $('#fDate');
const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
const maxDay = new Date(); maxDay.setDate(maxDay.getDate() + 60);
fDate.min = iso(tomorrow); fDate.max = iso(maxDay);
$('#fSize').innerHTML = SIZES.map((s) => `<option>${esc(s)}</option>`).join('');

function svc() { return SERVICES.find((s) => s.id === state.service); }
function renderSvcChips() {
  $('#svcChips').innerHTML = SERVICES.map((s) => `<button type="button" class="chip" data-id="${s.id}" aria-pressed="${s.id === state.service}">${esc(s.name)}<small>${s.price ? money(s.price) : 'Free'} · ${esc(s.length)}</small></button>`).join('');
}
function renderSlots() {
  const box = $('#slotChips');
  if (!fDate.value) { box.innerHTML = '<p class="hint">Pick a day first.</p>'; state.slot = null; return; }
  const s = svc();
  const day = parseIso(fDate.value).getDay();
  if (!s.days.includes(day)) {
    box.innerHTML = `<p class="hint bad">${esc(s.name)} doesn't run on ${HOURS[day].day}s. Try another day.</p>`;
    state.slot = null; return;
  }
  const taken = takenSlots(fDate.value, s.id);
  if (state.slot && (taken.has(state.slot) || !s.slots.includes(state.slot))) state.slot = null;
  box.innerHTML = s.slots.map((t) => `<button type="button" class="chip" data-slot="${t}" aria-pressed="${t === state.slot}" ${taken.has(t) ? 'disabled aria-label="' + fmtTime(t) + ', taken"' : ''}>${fmtTime(t)}</button>`).join('') +
    (s.slots.every((t) => taken.has(t)) ? '<p class="hint bad">Fully booked that day. Try the next one.</p>' : '');
}
function total() {
  const s = svc();
  const dogs = Math.max(1, Math.min(3, Number($('#fDogs').value) || 1));
  let each = s.price;
  if (packMode && !s.noPack) each *= 1 - BUSINESS.packDiscount;
  return each + each * BUSINESS.extraDogPrice * (dogs - 1);
}
function updateStub() {
  const s = svc();
  $('#stubDog').textContent = $('#fDog').value.trim() || 'Your dog';
  $('#stubSvc').textContent = s.name + (packMode && !s.noPack ? ' (pack)' : '');
  $('#stubWhen').textContent = fDate.value ? `${fmtDate(fDate.value)}${state.slot ? ', ' + fmtTime(state.slot) : ''}` : '—';
  $('#stubDogs').textContent = $('#fDogs').value || 1;
  $('#stubTotal').textContent = s.price ? money(total()) : 'Free';
}
function checkPost() {
  const v = $('#fPost').value.trim();
  const hint = $('#postHint');
  if (!v) { hint.textContent = ''; hint.className = 'hint'; return null; }
  const a = findArea(v);
  hint.textContent = a ? `✓ ${a.name} — walked ${a.days} by ${a.walker}` : 'Outside our area for now. Send it anyway and we\'ll call you.';
  hint.className = 'hint ' + (a ? 'ok' : 'bad');
  return a;
}

renderSvcChips();
renderSlots();
updateStub();

$('#svcChips').addEventListener('click', (e) => {
  const b = e.target.closest('.chip'); if (!b) return;
  state.service = b.dataset.id;
  renderSvcChips(); renderSlots(); updateStub();
});
$('#slotChips').addEventListener('click', (e) => {
  const b = e.target.closest('.chip'); if (!b || b.disabled) return;
  state.slot = b.dataset.slot;
  renderSlots(); updateStub();
  $('#slotChips').closest('.field').classList.remove('invalid');
});
fDate.addEventListener('change', () => { renderSlots(); updateStub(); fDate.closest('.field').classList.remove('invalid'); });
$$('.stepper button').forEach((b) => b.addEventListener('click', () => {
  const inp = $('#fDogs');
  inp.value = Math.max(1, Math.min(3, (Number(inp.value) || 1) + Number(b.dataset.step)));
  updateStub();
}));
$('#fDogs').addEventListener('input', updateStub);
$('#fDog').addEventListener('input', updateStub);
$('#fPost').addEventListener('input', checkPost);
form.addEventListener('input', (e) => { const f = e.target.closest('.field'); if (f) f.classList.remove('invalid'); });

function goBook(serviceId) {
  if (serviceId && SERVICES.some((s) => s.id === serviceId)) {
    state.service = serviceId;
    renderSvcChips(); renderSlots(); updateStub();
  }
  $('#book').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}
$$('[data-service]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); goBook(a.dataset.service); }));

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const err = $('#formError');
  const bad = [];
  const mark = (el, ok) => { el.closest('.field').classList.toggle('invalid', !ok); if (!ok) bad.push(el); };
  mark($('#fDog'), $('#fDog').value.trim().length > 0);
  mark(fDate, !!fDate.value && fDate.value >= fDate.min && fDate.value <= fDate.max);
  mark($('#slotChips'), !!state.slot);
  mark($('#fName'), $('#fName').value.trim().length > 1);
  mark($('#fPhone'), $('#fPhone').value.replace(/\D/g, '').length >= 7);
  mark($('#fPost'), $('#fPost').value.trim().length > 1);
  if (bad.length) {
    err.textContent = 'A few things missing — check the fields in red.';
    const first = bad[0];
    (first.matches('input, select, textarea') ? first : first.querySelector('button:not(:disabled)') || fDate).focus();
    return;
  }
  err.textContent = '';
  const s = svc();
  const req = {
    ref: 'PW-' + Math.random().toString(36).slice(2, 6).toUpperCase() + String(Date.now()).slice(-2),
    service: s.id,
    serviceName: s.name + (packMode && !s.noPack ? ' (10-pack)' : ''),
    date: fDate.value,
    slot: state.slot,
    dog: $('#fDog').value.trim(),
    size: $('#fSize').value,
    dogs: Number($('#fDogs').value) || 1,
    owner: $('#fName').value.trim(),
    phone: $('#fPhone').value.trim(),
    postcode: $('#fPost').value.trim(),
    notes: $('#fNotes').value.trim(),
    total: s.price ? total() : 0,
    area: (findArea($('#fPost').value) || {}).name || null,
    created: new Date().toISOString(),
  };
  store.set([...store.get(), req]);
  showPass(req);
  form.reset();
  state.slot = null;
  $('#fDogs').value = 1;
  checkPost(); renderSlots(); updateStub(); renderMine();
});

function showPass(r) {
  $('#passInner').innerHTML = `
    <div class="pass-top mono"><span>${esc(BUSINESS.short)} · Request received</span><span>${esc(r.ref)}</span></div>
    <div class="pass-body">
      <p class="mono">Admit one good dog</p>
      <p class="pass-dog" id="passTitle">${esc(r.dog)}</p>
      <div class="pass-grid">
        <div><span>Service</span><b>${esc(r.serviceName)}</b></div>
        <div><span>When</span><b>${esc(fmtDate(r.date))}<br>${esc(fmtTime(r.slot))}</b></div>
        <div><span>Total</span><b>${r.total ? money(r.total) : 'Free'}</b></div>
      </div>
      <div class="pass-bar" aria-hidden="true"></div>
      <p>Thanks ${esc(r.owner.split(' ')[0])}! ${r.area ? `${esc(r.area)} is on our route.` : 'We\'ll check your street.'} We'll call ${esc(r.phone)} within two hours (office hours) to confirm.</p>
      <button type="button" class="btn btn-dark" id="passClose">Done</button>
    </div>`;
  const dlg = $('#pass');
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  $('#passClose').focus();
  $('#passClose').addEventListener('click', () => (dlg.close ? dlg.close() : dlg.removeAttribute('open')));
}
$('#pass').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.close(); });

function renderMine() {
  const list = store.get().sort((a, b) => (a.date + a.slot).localeCompare(b.date + b.slot));
  $('#mine').hidden = !list.length;
  $('#mineList').innerHTML = list.map((r) => `
    <li>
      <span class="ref">${esc(r.ref)}</span>
      <span class="what"><b>${esc(r.dog)} · ${esc(r.serviceName)}</b><span>${esc(fmtDate(r.date))}, ${esc(fmtTime(r.slot))} · ${r.total ? money(r.total) : 'Free'}</span></span>
      <button type="button" data-cancel="${esc(r.ref)}">Cancel</button>
    </li>`).join('');
}
$('#mineList').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cancel]'); if (!b) return;
  store.set(store.get().filter((r) => r.ref !== b.dataset.cancel));
  renderMine(); renderSlots();
});
renderMine();

// ---- mobile dock & reveal ---------------------------------------------------
(function dock() {
  const d = $('#dock');
  const seen = new Set();
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => (en.isIntersecting ? seen.add(en.target) : seen.delete(en.target)));
    d.classList.toggle('hide', seen.size > 0);
  }, { threshold: 0.05 });
  io.observe($('.hero-actions'));
  io.observe($('#book'));
  io.observe($('.foot-legal'));
})();

(function reveal() {
  if (reduceMotion || !('IntersectionObserver' in window)) return;
  const els = $$('.mega, .area-title, .rules-list li, .walker, .sit-title, .faq-title, .board .row');
  els.forEach((el) => el.classList.add('reveal'));
  const io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
})();
