// Alder & Ash: a full-service restaurant site.
//
// Everything a restaurant changes lives in the data below: contact details,
// opening hours, menus, tonight's specials, seating and private rooms. The
// open/closed status, the hours table, the bookable dates and table times
// are all worked out from HOURS, so hours are only ever edited in one place.

// ---------------------------------------------------------------------------
// Restaurant details
// ---------------------------------------------------------------------------

const CONFIG = {
  name: 'Alder & Ash',
  phone: '(555) 014-2290',
  phoneHref: '+15550142290',
  email: 'hello@alderandash.example',
  address: '214 Mercer Street, Riverside, CA 94000',
  addressShort: '214 Mercer Street, Riverside',
  instagram: 'https://instagram.com/',

  // Booking, event, gift card and newsletter requests are POSTed here as JSON
  // (a form service such as Formspree, or your own backend). Leave it empty
  // and each request opens the guest's email app, addressed to `email`.
  formEndpoint: '',

  maxPartyOnline: 6,       // larger groups are sent to private dining
  bookingDays: 30,         // how far ahead guests can book
  leadMinutes: 60,         // same-day bookings close this long before a table
  slotMinutes: 30,         // gap between table times
  lastSeatingMinutes: 75,  // last table this long before a service ends

  tastingPrice: 95,
  pairingPrice: 60,
  giftAmounts: [50, 100, 150, 250],
};

// Opening hours for each service, as 24-hour "HH:MM". A closing time earlier
// than the opening time runs past midnight. Days without an entry are closed.
// Bookable services offer table times; the bar is walk-in only.
const HOURS = [
  {
    id: 'brunch', label: 'Brunch', bookable: true,
    days: { sat: ['10:00', '14:30'], sun: ['10:00', '14:30'] },
  },
  {
    id: 'dinner', label: 'Dinner', bookable: true,
    days: {
      tue: ['17:00', '22:00'], wed: ['17:00', '22:00'], thu: ['17:00', '22:00'],
      fri: ['17:00', '23:00'], sat: ['17:00', '23:00'], sun: ['17:00', '21:00'],
    },
  },
  {
    id: 'bar', label: 'Bar', bookable: false,
    days: {
      tue: ['16:00', '23:30'], wed: ['16:00', '23:30'], thu: ['16:00', '23:30'],
      fri: ['16:00', '01:00'], sat: ['12:00', '01:00'], sun: ['12:00', '22:00'],
    },
  },
];

// Whole days the restaurant is closed. "MM-DD" repeats every year;
// "YYYY-MM-DD" is a single date.
const CLOSED_DATES = [
  { date: '12-25', label: 'Christmas Day' },
  { date: '01-01', label: "New Year's Day" },
];

// Where guests can sit. `services` limits a seat to some services;
// `maxParty` is the largest party it takes.
const SEATING = [
  { id: 'dining', label: 'Dining room', note: 'Tables and booths', icon: 'armchair', maxParty: 6 },
  { id: 'counter', label: "Chef's counter", note: 'Facing the hearth', icon: 'chef-hat', maxParty: 4, services: ['dinner'] },
  { id: 'bar', label: 'Bar seats', note: 'Full menu, high stools', icon: 'wine', maxParty: 3 },
];

// Shown beside the menus under today's date.
const SPECIALS = {
  note: 'From this morning\'s market, until they run out.',
  items: [
    { name: 'Hearth-roasted halibut', desc: 'Brown butter, charred leeks, potato purée', price: 38 },
    { name: 'Wild mushroom toast', desc: 'Sourdough, thyme, aged sherry', price: 15 },
    { name: 'Pear and bay leaf sorbet', desc: 'Candied walnut, olive oil', price: 9 },
  ],
};

// Dietary tags used on the menus. A vegan dish also counts as vegetarian.
const DIETS = [
  { id: 'v', label: 'Vegetarian', short: 'V' },
  { id: 'vg', label: 'Vegan', short: 'VG' },
  { id: 'gf', label: 'Gluten-free', short: 'GF' },
];

// The menus, as text. `service` links a menu to its hours in HOURS.
const MENUS = [
  {
    id: 'dinner', label: 'Dinner', service: 'dinner',
    groups: [
      {
        title: 'To start',
        items: [
          { name: 'Warm sourdough', desc: '48-hour loaf, cultured butter, smoked salt', price: 7, tags: ['v'] },
          { name: 'Oysters on ice', desc: 'Half dozen, shallot mignonette, charred lemon', price: 21, tags: ['gf'] },
          { name: 'Burrata and roasted grapes', desc: 'Saba, toasted hazelnut, grilled bread', price: 16, tags: ['v'] },
          { name: 'Beef tartare', desc: 'Smoked egg yolk, capers, potato crisps', price: 18, tags: ['gf'] },
        ],
      },
      {
        title: 'Small plates',
        items: [
          { name: 'Ember-roasted carrots', desc: 'Whipped feta, dukkah, carrot-top salsa', price: 14, tags: ['v', 'gf'] },
          { name: 'Grilled octopus', desc: 'Chickpeas, chorizo oil, lemon', price: 19, tags: ['gf'] },
          { name: 'Charred broccolini', desc: 'Chili crisp, sesame, lime', price: 12, tags: ['vg', 'gf'] },
          { name: 'Crispy pork belly', desc: 'Apple mostarda, pickled shallot', price: 17, tags: [] },
        ],
      },
      {
        title: 'From the hearth',
        items: [
          { name: 'Dry-aged ribeye, 14 oz', desc: 'Bone-marrow butter, watercress, fries', price: 56, tags: ['gf'] },
          { name: 'Wood-fired half chicken', desc: 'Salsa verde, roast garlic jus, bitter leaves', price: 32, tags: ['gf'] },
          { name: 'Hand-cut pappardelle', desc: 'Wild mushrooms, aged parmesan, thyme', price: 27, tags: ['v'] },
          { name: 'Smoked squash and farro', desc: 'Pumpkin seed pesto, crispy sage', price: 25, tags: ['vg'] },
          { name: 'Market fish', desc: 'Whatever came in this morning, ask your server', price: 'MP', tags: ['gf'] },
        ],
      },
      {
        title: 'Sides',
        items: [
          { name: 'Fries and aioli', price: 8, tags: ['v', 'gf'] },
          { name: 'Market greens, mustard dressing', price: 9, tags: ['vg', 'gf'] },
          { name: 'Creamed winter greens', price: 10, tags: ['v', 'gf'] },
        ],
      },
    ],
  },
  {
    id: 'brunch', label: 'Brunch', service: 'brunch',
    groups: [
      {
        title: 'Mornings',
        items: [
          { name: 'Buttermilk pancakes', desc: 'Brown butter, maple, whipped ricotta', price: 15, tags: ['v'] },
          { name: 'Shakshuka from the oven', desc: 'Two eggs, peppers, labneh, flatbread', price: 17, tags: ['v'] },
          { name: 'Steak and eggs', desc: 'Hanger steak, fried eggs, chimichurri', price: 26, tags: ['gf'] },
          { name: 'Smoked trout benedict', desc: 'Potato rösti, poached eggs, dill hollandaise', price: 21, tags: ['gf'] },
          { name: 'Granola and yogurt', desc: 'Stewed plums, honey, toasted oats', price: 12, tags: ['v'] },
        ],
      },
      {
        title: 'On the side',
        items: [
          { name: 'Thick-cut bacon', price: 6, tags: ['gf'] },
          { name: 'Crispy potatoes', price: 6, tags: ['vg', 'gf'] },
          { name: 'Toast and preserves', price: 5, tags: ['v'] },
        ],
      },
      {
        title: 'To drink',
        items: [
          { name: 'Fresh orange juice', price: 6, tags: ['vg', 'gf'] },
          { name: 'Bloody Mary', desc: 'Smoked tomato, horseradish, celery salt', price: 13, tags: ['vg', 'gf'] },
          { name: 'Spritz of the season', price: 12, tags: ['vg', 'gf'] },
        ],
      },
    ],
  },
  {
    id: 'bar', label: 'Bar & wine', service: 'bar',
    groups: [
      {
        title: 'Cocktails',
        items: [
          { name: 'Hearth Old Fashioned', desc: 'Bourbon, smoked demerara, orange', price: 15, tags: ['vg', 'gf'] },
          { name: 'Alder Sour', desc: 'Gin, pear, lemon, aquafaba', price: 14, tags: ['vg', 'gf'] },
          { name: 'Garden Spritz', desc: 'Bitter aperitivo, verjus, soda', price: 12, tags: ['vg', 'gf'] },
          { name: 'Low and Slow', desc: 'Zero-proof: smoked tea, honey, lemon', price: 9, tags: ['v', 'gf'] },
        ],
      },
      {
        title: 'By the glass',
        items: [
          { name: 'Crémant de Loire', desc: 'Sparkling, France', price: 14, tags: [] },
          { name: 'Grüner Veltliner', desc: 'White, Austria', price: 13, tags: [] },
          { name: 'Skin-contact Pinot Gris', desc: 'Orange, Oregon', price: 15, tags: [] },
          { name: 'Gamay', desc: 'Red, Beaujolais', price: 14, tags: [] },
          { name: 'Cabernet Franc', desc: 'Red, Loire Valley', price: 16, tags: [] },
        ],
      },
      {
        title: 'Bar snacks',
        items: [
          { name: 'Fried olives', desc: 'Stuffed with orange and fennel', price: 7, tags: ['v'] },
          { name: 'Potato chips and onion dip', price: 8, tags: ['v', 'gf'] },
          { name: 'The bar burger', desc: 'Dry-aged beef, cheddar, pickles, fries', price: 19, tags: [] },
        ],
      },
    ],
  },
  {
    id: 'dessert', label: 'Dessert',
    note: 'Served until the kitchen closes.',
    groups: [
      {
        title: 'Sweets',
        items: [
          { name: 'Burnt honey tart', desc: 'Crème fraîche, bee pollen', price: 12, tags: ['v'] },
          { name: 'Dark chocolate pot', desc: 'Sea salt, olive oil, shortbread', price: 11, tags: ['v'] },
          { name: 'Apple and oat crumble', desc: 'Miso caramel, vanilla ice cream', price: 12, tags: ['v'] },
          { name: 'Sorbet trio', desc: 'Ask for today\'s flavors', price: 9, tags: ['vg', 'gf'] },
        ],
      },
      {
        title: 'To finish',
        items: [
          { name: 'Three cheeses', desc: 'Honeycomb, oat crackers, pickled pear', price: 18, tags: ['v'] },
          { name: 'Espresso or cortado', price: 4, tags: ['v', 'gf'] },
          { name: 'Late-harvest Riesling', desc: '3 oz pour', price: 12, tags: [] },
        ],
      },
    ],
  },
];

// Private dining rooms and buyouts.
const ROOMS = [
  {
    id: 'cellar', name: 'The Cellar', photo: 'photos/room-cellar.jpg',
    alt: 'A dim, candlelit room with set tables and whitewashed walls',
    blurb: 'A candlelit room below the dining room, lined with our three hundred bottles.',
    seated: 12, standing: null, minimum: '$1,200',
    features: ['Set menu planned with the chef', 'Your own sommelier for the night', 'Private entrance from the courtyard'],
  },
  {
    id: 'garden', name: 'The Garden Room', photo: 'photos/room-garden.jpg',
    alt: 'A long table set with glasses and linen in a bright room',
    blurb: 'One long table under the skylight, with doors onto the heated terrace.',
    seated: 28, standing: 45, minimum: '$2,500',
    features: ['Screen and microphone for toasts', 'Terrace for a welcome drink', 'Family-style or plated menus'],
  },
  {
    id: 'buyout', name: 'The whole house', photo: 'photos/room-house.jpg',
    alt: 'Two bartenders smiling as they mix cocktails at a busy bar',
    blurb: 'The dining room, bar and terrace, all yours, for weddings and big celebrations.',
    seated: 80, standing: 140, minimum: 'On request',
    features: ['Custom cocktails from the bar team', 'A band by the hearth, or your playlist', 'Planning from first menu to last cab'],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Build an element: h('p', { class: 'x', onclick: fn }, 'text', child).
function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (k === 'class') node.className = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}
const icon = (name) => h('i', { 'data-lucide': name, 'aria-hidden': 'true' });

// Icons come from Lucide. The page works without them if the CDN is down.
let lucide = null;
function drawIcons() {
  if (lucide) lucide.createIcons({ icons: lucide.icons });
}
import('https://cdn.jsdelivr.net/npm/lucide@0.469.0/+esm')
  .then((mod) => { lucide = mod; drawIcons(); })
  .catch(() => {});

const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const toMinutes = (hm) => { const [hh, mm] = hm.split(':').map(Number); return hh * 60 + mm; };
const atMinutes = (day, mins) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, mins);

// 17:30 -> "5:30 pm", 17:00 -> "5 pm".
function fmtMinutes(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60), mm = m % 60;
  const hr = hh % 12 || 12;
  return `${hr}${mm ? `:${pad(mm)}` : ''} ${hh < 12 ? 'am' : 'pm'}`;
}
const fmtClock = (date) => fmtMinutes(date.getHours() * 60 + date.getMinutes());
// "17:00"-"22:00" -> "5–10 pm"; "10:00"-"14:30" -> "10 am–2:30 pm".
function fmtRange([open, close]) {
  const a = fmtMinutes(toMinutes(open)), b = fmtMinutes(toMinutes(close));
  return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)}–${b}` : `${a}–${b}`;
}
const fmtDay = (d) => `${DAY_NAMES[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
const fmtPrice = (p) => (typeof p === 'number' ? String(p) : p);

function closure(date) {
  const full = dateKey(date), yearly = full.slice(5);
  return CLOSED_DATES.find((c) => c.date === full || c.date === yearly) || null;
}

// The opening windows that start on a given day, as real Date ranges.
function windowsOn(day, services = HOURS) {
  if (closure(day)) return [];
  const key = DAY_KEYS[day.getDay()];
  return services.flatMap((service) => {
    const span = service.days[key];
    if (!span) return [];
    const open = toMinutes(span[0]);
    let close = toMinutes(span[1]);
    if (close <= open) close += 1440;
    return [{ service, start: atMinutes(day, open), end: atMinutes(day, close) }];
  });
}

// Open now? Looks at today's windows and yesterday's late ones.
function currentStatus(now = new Date()) {
  const today = startOfDay(now);
  const live = [...windowsOn(addDays(today, -1)), ...windowsOn(today)]
    .filter((w) => w.start <= now && now < w.end);
  if (live.length) {
    const until = new Date(Math.max(...live.map((w) => w.end.getTime())));
    const parts = live.map((w) => `${w.service.label.toLowerCase()} until ${fmtClock(w.end)}`);
    return {
      state: 'open',
      short: `Open now · until ${fmtClock(until)}`,
      lead: 'Open now.',
      detail: `Serving ${parts.join(', ')}.`,
    };
  }
  for (let i = 0; i < 8; i += 1) {
    const day = addDays(today, i);
    const next = windowsOn(day).filter((w) => w.start > now).sort((a, b) => a.start - b.start)[0];
    if (!next) continue;
    const time = fmtClock(next.start);
    const dayName = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY_NAMES[day.getDay()];
    return {
      state: next.start - now < 60 * 60 * 1000 ? 'soon' : 'closed',
      short: i === 0 ? `Opens at ${time}` : `Closed · opens ${i === 1 ? 'tomorrow' : dayName.slice(0, 3)} ${time}`,
      lead: i === 0 ? `Opens at ${time} today.` : 'Closed right now.',
      detail: `${i === 0 ? 'First up' : `We open ${dayName} at ${time}`} for ${next.service.label.toLowerCase()}.`,
    };
  }
  return { state: 'closed', short: 'Closed', lead: 'Closed for now.', detail: '' };
}

// Bookable table times on a day, grouped by service. Past times and times
// inside the lead window are returned disabled.
function slotsOn(day, seatingId, now = new Date()) {
  const seat = SEATING.find((s) => s.id === seatingId);
  const earliest = new Date(now.getTime() + CONFIG.leadMinutes * 60000);
  return windowsOn(day, HOURS.filter((s) => s.bookable))
    .filter((w) => !seat || !seat.services || seat.services.includes(w.service.id))
    .map((w) => {
      const times = [];
      const last = w.end.getTime() - CONFIG.lastSeatingMinutes * 60000;
      for (let t = w.start.getTime(); t <= last; t += CONFIG.slotMinutes * 60000) {
        const at = new Date(t);
        times.push({ at, value: `${pad(at.getHours())}:${pad(at.getMinutes())}`, disabled: at < earliest });
      }
      return { service: w.service, times };
    })
    .filter((g) => g.times.length);
}
const hasOpenSlot = (day, seatingId) => slotsOn(day, seatingId).some((g) => g.times.some((t) => !t.disabled));

function bookableDays(seatingId) {
  const today = startOfDay(new Date());
  return Array.from({ length: CONFIG.bookingDays }, (_, i) => addDays(today, i))
    .map((day) => ({ day, open: hasOpenSlot(day, seatingId) }));
}

// Send a request to CONFIG.formEndpoint, or hand it to the guest's email app.
async function sendRequest(kind, subject, fields) {
  const clean = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== '' && v != null));
  if (CONFIG.formEndpoint) {
    const res = await fetch(CONFIG.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ kind, subject, ...clean }),
    });
    if (!res.ok) throw new Error(`The request could not be sent (${res.status}).`);
    return 'sent';
  }
  const body = Object.entries(clean).map(([k, v]) => `${k}: ${v}`).join('\n');
  const link = h('a', { href: `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}` });
  link.click();
  return 'mail';
}

let toastTimer = 0;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 4200);
}

// ---------------------------------------------------------------------------
// Details, status and hours
// ---------------------------------------------------------------------------

function fillDetails() {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${CONFIG.name}, ${CONFIG.address}`)}`;
  for (const el of $$('[data-field]')) {
    const field = el.dataset.field;
    const keepText = el.classList.contains('btn') || el.classList.contains('social');
    if (field === 'phone') el.setAttribute('href', `tel:${CONFIG.phoneHref}`);
    if (field === 'email') el.setAttribute('href', `mailto:${CONFIG.email}`);
    if (field === 'instagram') { el.setAttribute('href', CONFIG.instagram); continue; }
    if (field === 'addressLines') {
      // "214 Mercer Street, Riverside, CA 94000" -> street on one line, town on the next.
      const [street, ...rest] = CONFIG.address.split(', ');
      el.replaceChildren(street, ...(rest.length ? [h('br'), rest.join(', ')] : []));
      continue;
    }
    if (!keepText && CONFIG[field] != null) el.textContent = CONFIG[field];
  }
  $('#directions').href = mapsUrl;
  $('[data-tasting-price]').textContent = CONFIG.tastingPrice;
  $('[data-pairing-price]').textContent = CONFIG.pairingPrice;
  for (const el of $$('[data-year]')) el.textContent = new Date().getFullYear();
}

function renderStatus() {
  const status = currentStatus();
  for (const el of $$('[data-status]')) {
    el.classList.toggle('is-open', status.state === 'open');
    el.classList.toggle('is-soon', status.state === 'soon');
    $('[data-status-text]', el).textContent = status.short;
  }
  for (const el of $$('[data-status-long]')) {
    el.replaceChildren(h('strong', {}, status.lead), status.detail ? ` ${status.detail}` : '');
  }
}

// Days in order Monday to Sunday, with the same hours grouped: ["Tue–Thu 5–10 pm", …].
function summaryRuns(service) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const runs = [];
  for (const d of order) {
    const span = service.days[DAY_KEYS[d]];
    const text = span ? fmtRange(span) : null;
    const last = runs[runs.length - 1];
    if (last && last.text === text) last.to = d;
    else runs.push({ from: d, to: d, text });
  }
  return runs.filter((r) => r.text).map((r) => {
    const a = DAY_NAMES[r.from].slice(0, 3), b = DAY_NAMES[r.to].slice(0, 3);
    return `${r.from === r.to ? a : `${a}–${b}`} ${r.text}`;
  });
}
const summarize = (service) => summaryRuns(service).join(' · ');

function renderHours() {
  const table = $('#hours');
  const headRow = $('thead tr', table);
  headRow.replaceChildren(h('th', { scope: 'col' }, 'Day'), ...HOURS.map((s) => h('th', { scope: 'col' }, s.label)));
  const today = new Date().getDay();
  const body = $('tbody', table);
  body.replaceChildren(...[1, 2, 3, 4, 5, 6, 0].map((d) => {
    const spans = HOURS.map((s) => s.days[DAY_KEYS[d]]);
    const row = h('tr', { class: d === today ? 'today' : null },
      h('th', { scope: 'row' }, h('span', { class: 'day-long' }, DAY_NAMES[d]), h('abbr', { class: 'day-short', title: DAY_NAMES[d] }, DAY_NAMES[d].slice(0, 3))));
    if (spans.every((s) => !s)) row.append(h('td', { colspan: HOURS.length, class: 'closed' }, 'Closed'));
    else for (const s of spans) row.append(h('td', { class: s ? null : 'closed' }, s ? fmtRange(s) : '—'));
    return row;
  }));

  const closed = CLOSED_DATES.map((c) => {
    const [m, d] = c.date.slice(-5).split('-').map(Number);
    return `${c.label} (${MONTHS[m - 1]} ${d})`;
  });
  $('#closures').textContent = closed.length ? `Closed all day on ${closed.join(' and ')}.` : '';

  $('#footer-hours').replaceChildren(...HOURS.map((s) => h('p', {},
    h('strong', {}, s.label),
    ...summaryRuns(s).flatMap((run, i) => [...(i ? [h('br')] : []), run]))));
}

// ---------------------------------------------------------------------------
// Specials and menus
// ---------------------------------------------------------------------------

function renderSpecials() {
  const today = new Date();
  $('[data-today]').textContent = fmtDay(today);
  $('#specials').replaceChildren(...SPECIALS.items.map((item) => h('li', {},
    h('strong', {}, item.name),
    h('span', { class: 'price' }, fmtPrice(item.price)),
    item.desc ? h('span', { class: 'desc' }, item.desc) : null,
  )));
  $('#specials-note').textContent = SPECIALS.note;
}

const menuState = { menu: MENUS[0].id, diets: new Set() };
const matchesDiet = (item, diet) => item.tags.includes(diet) || (diet === 'v' && item.tags.includes('vg'));

function renderMenuTabs() {
  const tabs = $('#menu-tabs');
  tabs.replaceChildren(...MENUS.map((m) => h('button', {
    class: 'tab', type: 'button', role: 'tab', id: `tab-${m.id}`,
    'aria-selected': String(m.id === menuState.menu), 'aria-controls': 'menu-panel',
    tabindex: m.id === menuState.menu ? '0' : '-1',
    onclick: () => { menuState.menu = m.id; renderMenuTabs(); renderMenu(); },
  }, m.label)));
}

function onTabKeys(e) {
  const idx = MENUS.findIndex((m) => m.id === menuState.menu);
  const dir = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 0;
  if (!dir) return;
  e.preventDefault();
  menuState.menu = MENUS[(idx + dir + MENUS.length) % MENUS.length].id;
  renderMenuTabs();
  renderMenu();
  $(`#tab-${menuState.menu}`).focus();
}

function renderFilters() {
  $('#menu-filters').replaceChildren(...DIETS.map((d) => h('button', {
    class: 'chip', type: 'button', 'aria-pressed': String(menuState.diets.has(d.id)),
    onclick: () => {
      if (menuState.diets.has(d.id)) menuState.diets.delete(d.id); else menuState.diets.add(d.id);
      renderFilters();
      renderMenu();
    },
  }, h('span', { class: 'tag', 'aria-hidden': 'true' }, d.short), d.label)));
  $('#menu-legend').replaceChildren(
    ...DIETS.map((d) => h('span', {}, h('span', { class: 'tag' }, d.short), d.label)),
    h('span', {}, 'MP = market price. Most dishes can be adapted; just ask.'),
  );
}

function renderMenu() {
  const menu = MENUS.find((m) => m.id === menuState.menu);
  const panel = $('#menu-panel');
  panel.setAttribute('aria-labelledby', `tab-${menu.id}`);
  const service = HOURS.find((s) => s.id === menu.service);
  const note = menu.note || (service ? summarize(service) : '');
  let shown = 0;
  const groups = menu.groups.map((g, i) => h('div', { class: 'menu-group' },
    h('h3', {}, g.title),
    i === 0 && note ? h('p', { class: 'group-note' }, note) : null,
    ...g.items.map((item) => {
      const ok = [...menuState.diets].every((d) => matchesDiet(item, d));
      if (ok) shown += 1;
      return h('div', { class: `dish${ok ? '' : ' dimmed'}` },
        h('div', { class: 'dish-line' },
          h('span', { class: 'dish-name' }, item.name,
            item.tags.length ? h('span', { class: 'tags' }, ...item.tags.map((t) => {
              const diet = DIETS.find((d) => d.id === t);
              return h('span', { class: 'tag', title: diet ? diet.label : t }, diet ? diet.short : t);
            })) : null),
          h('span', { class: 'dish-dots', 'aria-hidden': 'true' }),
          h('span', { class: 'dish-price' }, fmtPrice(item.price))),
        item.desc ? h('p', { class: 'dish-desc' }, item.desc) : null);
    })));
  panel.replaceChildren(...groups);
  if (menuState.diets.size && !shown) {
    panel.prepend(h('p', { class: 'menu-empty' }, 'Nothing on this menu matches every filter, but the kitchen can usually adapt a dish. Ask your server.'));
  }
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

const booking = { party: 2, date: null, seating: 'dining', time: null };

function partyLabel(n) { return `${n} ${n === 1 ? 'guest' : 'guests'}`; }

function ensureValidBooking() {
  const seat = SEATING.find((s) => s.id === booking.seating);
  if (!seat || booking.party > seat.maxParty) booking.seating = (SEATING.find((s) => booking.party <= s.maxParty) || SEATING[0]).id;
  const days = bookableDays(booking.seating);
  if (!booking.date || !days.some((d) => d.open && dateKey(d.day) === booking.date)) {
    const first = days.find((d) => d.open);
    booking.date = first ? dateKey(first.day) : null;
  }
  if (booking.time && booking.date) {
    const ok = slotsOn(fromKey(booking.date), booking.seating)
      .some((g) => g.times.some((t) => !t.disabled && t.value === booking.time));
    if (!ok) booking.time = null;
  }
}

function renderBooking() {
  ensureValidBooking();
  $('#party-out').textContent = partyLabel(booking.party);
  const partyNote = $('#party-note');
  if (booking.party < CONFIG.maxPartyOnline && partyNote.classList.contains('is-hot')) {
    partyNote.classList.remove('is-hot');
    partyNote.textContent = partyNote.dataset.text;
  }
  $('[data-party="-1"]').disabled = booking.party <= 1;
  $('[data-party="1"]').disabled = false;

  const dates = $('#dates');
  const keep = dates.scrollLeft;
  dates.replaceChildren(...bookableDays(booking.seating).map(({ day, open }) => {
    const key = dateKey(day);
    const closed = closure(day);
    return h('button', {
      class: 'date', type: 'button', disabled: !open,
      'aria-pressed': String(key === booking.date),
      'aria-label': `${DAY_NAMES[day.getDay()]} ${day.getDate()} ${MONTHS[day.getMonth()]}${open ? '' : closed ? `, closed for ${closed.label}` : ', no tables'}`,
      title: closed ? closed.label : null,
      onclick: () => { booking.date = key; renderBooking(); },
    },
    h('span', { class: 'dow' }, key === dateKey(new Date()) ? 'Today' : DAY_NAMES[day.getDay()].slice(0, 3)),
    h('span', { class: 'dnum' }, day.getDate()),
    h('span', { class: 'mon' }, MONTHS[day.getMonth()]));
  }));
  dates.scrollLeft = keep;

  $('#seating').replaceChildren(...SEATING.map((s) => {
    const tooBig = booking.party > s.maxParty;
    const day = booking.date ? fromKey(booking.date) : null;
    const none = day && !hasOpenSlot(day, s.id);
    return h('button', {
      class: 'seat', type: 'button', disabled: tooBig,
      'aria-pressed': String(s.id === booking.seating),
      onclick: () => { booking.seating = s.id; renderBooking(); },
    },
    h('strong', {}, icon(s.icon), s.label),
    h('span', {}, tooBig ? `Up to ${s.maxParty} guests` : none ? 'Not on this day' : s.note));
  }));

  const slotsEl = $('#slots');
  const groups = booking.date ? slotsOn(fromKey(booking.date), booking.seating) : [];
  const usable = groups.filter((g) => g.times.some((t) => !t.disabled));
  if (!usable.length) {
    slotsEl.replaceChildren(h('p', { class: 'slots-empty' }, booking.date
      ? 'No tables left for this seating on this day. Try another day, or another place to sit.'
      : 'Choose a date to see table times.'));
  } else {
    slotsEl.replaceChildren(...usable.map((g) => h('div', {},
      h('p', { class: 'slot-group-label' }, g.service.label),
      h('div', { class: 'slot-row' }, ...g.times.filter((t) => !t.disabled).map((t) => h('button', {
        class: 'slot', type: 'button',
        'aria-pressed': String(t.value === booking.time),
        onclick: () => { booking.time = t.value; renderBooking(); },
      }, fmtClock(t.at)))))));
  }

  const seat = SEATING.find((s) => s.id === booking.seating);
  const parts = [`Table for ${booking.party}`];
  if (booking.date) parts.push(fmtDay(fromKey(booking.date)));
  parts.push(booking.time ? fmtMinutes(toMinutes(booking.time)) : 'choose a time');
  parts.push(seat.label);
  $('#summary').textContent = parts.join(' · ');
  drawIcons();
}

function scrollDates(dir) {
  const el = $('#dates');
  el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
}

function bumpParty(delta) {
  const next = booking.party + delta;
  if (next > CONFIG.maxPartyOnline) {
    const note = $('#party-note');
    note.dataset.text ??= note.textContent;
    note.classList.add('is-hot');
    note.textContent = `${CONFIG.maxPartyOnline + 1} or more? Book a private dinner`;
    return;
  }
  booking.party = Math.max(1, next);
  renderBooking();
}

function fieldError(form, name, message) {
  const input = form.elements[name];
  input.closest('.field').classList.add('invalid');
  input.setAttribute('aria-invalid', 'true');
  return message;
}
function clearErrors(form) {
  for (const el of $$('.invalid', form)) el.classList.remove('invalid');
  for (const el of $$('[aria-invalid]', form)) el.removeAttribute('aria-invalid');
}

let lastBooking = null;

async function submitBooking(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const error = $('#booking-error');
  clearErrors(form);
  const problems = [];
  if (!booking.time) problems.push('choose a table time');
  if (!form.elements.name.value.trim()) problems.push(fieldError(form, 'name', 'add your name'));
  if (!form.elements.phone.value.trim()) problems.push(fieldError(form, 'phone', 'add a phone number'));
  if (!EMAIL_RE.test(form.elements.email.value.trim())) problems.push(fieldError(form, 'email', 'add a valid email'));
  if (problems.length) {
    error.textContent = `Almost there: ${problems.join(', ')}.`;
    error.hidden = false;
    const firstBad = $('.invalid input', form);
    if (firstBad) firstBad.focus();
    return;
  }
  error.hidden = true;

  const day = fromKey(booking.date);
  const seat = SEATING.find((s) => s.id === booking.seating);
  const when = `${DAY_NAMES[day.getDay()]} ${day.getDate()} ${MONTHS[day.getMonth()]} ${day.getFullYear()}, ${fmtMinutes(toMinutes(booking.time))}`;
  const details = {
    Guests: booking.party,
    Date: when,
    Seating: seat.label,
    Name: form.elements.name.value.trim(),
    Phone: form.elements.phone.value.trim(),
    Email: form.elements.email.value.trim(),
    Occasion: form.elements.occasion.value,
    Notes: form.elements.notes.value.trim(),
  };
  const button = $('#booking-submit');
  button.disabled = true;
  try {
    const how = await sendRequest('reservation', `Table for ${booking.party}, ${when}`, details);
    lastBooking = { ...booking, name: details.Name, seat: seat.label };
    const initials = (CONFIG.name.match(/[A-Za-z]+/g) || ['R']).map((w) => w[0]).join('').slice(0, 3).toUpperCase();
    $('#booked-ref').textContent = `${initials}-${booking.date.slice(5).replace('-', '')}-${booking.time.replace(':', '')}`;
    $('#booked-state').textContent = how === 'sent' ? 'Request sent' : 'Request ready';
    $('#booked-line').textContent = `Table for ${booking.party} · ${fmtDay(day)} · ${fmtMinutes(toMinutes(booking.time))}`;
    $('#booked-sub').textContent = `${seat.label} · ${details.Name}`;
    $('#booked-msg').textContent = how === 'sent'
      ? 'We\'ll email you to confirm shortly. Nothing is charged until you dine.'
      : 'Your email app has opened with your request filled in. Send it and we\'ll reply to confirm.';
    $('#booking-form').hidden = true;
    $('#booked').hidden = false;
    $('#booked').focus();
  } catch (err) {
    error.textContent = `${err.message} Please call us on ${CONFIG.phone}.`;
    error.hidden = false;
  } finally {
    button.disabled = false;
  }
}

function downloadCalendar() {
  if (!lastBooking) return;
  const start = new Date(fromKey(lastBooking.date).getTime() + toMinutes(lastBooking.time) * 60000);
  const end = new Date(start.getTime() + 2 * 60 * 60000);
  const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const esc = (s) => String(s).replace(/([,;\\])/g, '\\$1');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Restaurant//Booking//EN', 'BEGIN:VEVENT',
    `UID:${Date.now()}@restaurant`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`Dinner at ${CONFIG.name}`)}`,
    `LOCATION:${esc(CONFIG.address)}`,
    `DESCRIPTION:${esc(`Table for ${lastBooking.party}, ${lastBooking.seat}. Call ${CONFIG.phone} to change.`)}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = h('a', { href: url, download: 'reservation.ics' });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// The hero's quick search: pick party, day and time, then land in the full form.
function renderQuickbook() {
  const party = $('#qb-party');
  if (!party.options.length) {
    for (let n = 1; n <= CONFIG.maxPartyOnline; n += 1) party.append(h('option', { value: n }, partyLabel(n)));
    party.append(h('option', { value: 'group' }, `${CONFIG.maxPartyOnline + 1}+ guests`));
    party.value = '2';
  }
  const dateSel = $('#qb-date');
  const todayKey = dateKey(new Date());
  const tomorrowKey = dateKey(addDays(new Date(), 1));
  const open = bookableDays('dining').filter((d) => d.open).slice(0, 14);
  const prevDate = dateSel.value;
  dateSel.replaceChildren(...open.map(({ day }) => {
    const key = dateKey(day);
    const prefix = key === todayKey ? 'Today, ' : key === tomorrowKey ? 'Tomorrow, ' : '';
    return h('option', { value: key }, prefix + fmtDay(day));
  }));
  if (open.some((d) => dateKey(d.day) === prevDate)) dateSel.value = prevDate;
  renderQuickTimes();
}

function renderQuickTimes() {
  const timeSel = $('#qb-time');
  const key = $('#qb-date').value;
  const prev = timeSel.value;
  const times = key ? slotsOn(fromKey(key), 'dining').flatMap((g) => g.times.filter((t) => !t.disabled)) : [];
  timeSel.replaceChildren(...times.map((t) => h('option', { value: t.value }, fmtClock(t.at))));
  const preferred = [prev, '19:00', '19:30', '18:30', '11:00'].find((v) => times.some((t) => t.value === v));
  if (preferred) timeSel.value = preferred;
}

function submitQuickbook(e) {
  e.preventDefault();
  const party = $('#qb-party').value;
  if (party === 'group') { openEventDialog(null, CONFIG.maxPartyOnline + 2); return; }
  booking.party = Number(party);
  booking.date = $('#qb-date').value || null;
  booking.time = $('#qb-time').value || null;
  booking.seating = 'dining';
  showBookingForm();
  renderBooking();
  $('#reserve').scrollIntoView({ behavior: 'smooth', block: 'start' });
  setTimeout(() => {
    const target = booking.time ? $('#booking-form input[name="name"]') : $('#slots button:not(:disabled)');
    if (target) target.focus({ preventScroll: true });
  }, 600);
}

function showBookingForm() {
  $('#booked').hidden = true;
  $('#booking-form').hidden = false;
}

// ---------------------------------------------------------------------------
// Private dining
// ---------------------------------------------------------------------------

function renderRooms() {
  $('#rooms').replaceChildren(...ROOMS.map((room) => h('article', { class: 'room' },
    h('figure', { class: 'room-photo' },
      h('img', { src: room.photo, alt: room.alt, loading: 'lazy', width: 900, height: 1230 }),
      h('figcaption', {}, h('h3', {}, room.name))),
    h('p', { class: 'room-blurb' }, room.blurb),
    h('dl', { class: 'capacity' },
      h('div', {}, h('dt', {}, 'Seated'), h('dd', {}, room.seated)),
      h('div', {}, h('dt', {}, 'Standing'), h('dd', {}, room.standing || '—')),
      h('div', {}, h('dt', {}, 'Min. spend'), h('dd', {}, room.minimum))),
    h('ul', { class: 'features' }, ...room.features.map((f) => h('li', {}, f))),
    h('button', { class: 'btn btn-line', type: 'button', onclick: () => openEventDialog(room.id) }, `Enquire about ${room.name.replace(/^The /, 'the ')}`))));
  const select = $('#event-room');
  select.replaceChildren(...ROOMS.map((r) => h('option', { value: r.id }, r.name)), h('option', { value: '' }, 'Not sure yet'));
}

function updateEventHint() {
  const room = ROOMS.find((r) => r.id === $('#event-room').value);
  const guests = Number($('#event-guests').value) || 0;
  const hint = $('#event-hint');
  if (!room) { hint.textContent = 'We\'ll suggest the right space.'; return; }
  const max = Math.max(room.seated, room.standing || 0);
  hint.textContent = guests > max
    ? `${room.name} holds up to ${max}. We'll suggest a bigger space.`
    : `${room.name}: up to ${room.seated} seated${room.standing ? `, ${room.standing} standing` : ''}.`;
}

function openEventDialog(roomId, guests) {
  const dialog = $('#event-dialog');
  const form = $('#event-form');
  clearErrors(form);
  $('.form-error', form).hidden = true;
  const room = ROOMS.find((r) => r.id === roomId)
    || ROOMS.find((r) => Math.max(r.seated, r.standing || 0) >= (guests || 0))
    || ROOMS[0];
  $('#event-room').value = roomId === null && !guests ? '' : room.id;
  $('#event-guests').value = guests || Math.min(room.seated, 10);
  $('#event-date').min = dateKey(addDays(new Date(), 1));
  updateEventHint();
  if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', '');
  drawIcons();
}

async function submitEvent(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const error = $('.form-error', form);
  clearErrors(form);
  const problems = [];
  if (!form.elements.date.value) problems.push(fieldError(form, 'date', 'pick a date'));
  if (!(Number(form.elements.guests.value) >= 2)) problems.push(fieldError(form, 'guests', 'say how many guests'));
  if (!form.elements.name.value.trim()) problems.push(fieldError(form, 'name', 'add your name'));
  if (!EMAIL_RE.test(form.elements.email.value.trim())) problems.push(fieldError(form, 'email', 'add a valid email'));
  if (problems.length) {
    error.textContent = `Almost there: ${problems.join(', ')}.`;
    error.hidden = false;
    return;
  }
  const room = ROOMS.find((r) => r.id === form.elements.room.value);
  const day = fromKey(form.elements.date.value);
  try {
    const how = await sendRequest('private-event', `Private dining: ${form.elements.guests.value} guests, ${fmtDay(day)}`, {
      Space: room ? room.name : 'Not sure yet',
      Date: `${DAY_NAMES[day.getDay()]} ${day.getDate()} ${MONTHS[day.getMonth()]} ${day.getFullYear()}`,
      Guests: form.elements.guests.value,
      Occasion: form.elements.type.value,
      Format: form.elements.format.value,
      Name: form.elements.name.value.trim(),
      Email: form.elements.email.value.trim(),
      Message: form.elements.message.value.trim(),
    });
    $('#event-dialog').close();
    form.reset();
    toast(how === 'sent' ? 'Thank you. Our events lead will reply within a day.' : 'Your email app has opened with the enquiry. Send it and we\'ll reply within a day.');
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
  }
}

// ---------------------------------------------------------------------------
// Gift cards and newsletter
// ---------------------------------------------------------------------------

let giftAmount = CONFIG.giftAmounts[1] || CONFIG.giftAmounts[0];

function renderAmounts() {
  const wrap = $('#amounts');
  wrap.replaceChildren(...CONFIG.giftAmounts.map((amt) => h('button', {
    class: 'amount', type: 'button', role: 'radio', 'aria-checked': String(amt === giftAmount),
    tabindex: amt === giftAmount ? '0' : '-1',
    onclick: () => { giftAmount = amt; renderAmounts(); },
    onkeydown: (e) => {
      const dir = ['ArrowRight', 'ArrowDown'].includes(e.key) ? 1 : ['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const list = CONFIG.giftAmounts;
      giftAmount = list[(list.indexOf(giftAmount) + dir + list.length) % list.length];
      renderAmounts();
      $('.amount[aria-checked="true"]').focus();
    },
  }, `$${amt}`)));
}

function showFormMessage(form, text, isError = false) {
  const msg = $('.form-msg', form.closest('[data-msg-scope]') || form);
  msg.textContent = text;
  msg.classList.toggle('is-error', isError);
  msg.hidden = false;
}

async function submitGift(e) {
  e.preventDefault();
  const form = e.currentTarget;
  clearErrors(form);
  const problems = [];
  if (!form.elements.recipient.value.trim()) problems.push(fieldError(form, 'recipient', 'who it\'s for'));
  if (!EMAIL_RE.test(form.elements.email.value.trim())) problems.push(fieldError(form, 'email', 'your email'));
  if (problems.length) { showFormMessage(form, `Please add ${problems.join(' and ')}.`, true); return; }
  try {
    const how = await sendRequest('gift-card', `Gift card: $${giftAmount}`, {
      Amount: `$${giftAmount}`,
      For: form.elements.recipient.value.trim(),
      Email: form.elements.email.value.trim(),
    });
    form.reset();
    showFormMessage(form, how === 'sent' ? 'Thank you. We\'ll email a payment link shortly.' : 'Your email app has opened. Send the request and we\'ll reply with a payment link.');
  } catch (err) {
    showFormMessage(form, err.message, true);
  }
}

async function submitLetter(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const email = form.elements.email.value.trim();
  if (!EMAIL_RE.test(email)) { showFormMessage(form, 'Please enter a valid email.', true); form.elements.email.focus(); return; }
  try {
    const how = await sendRequest('newsletter', 'Add me to the Supper Letter', { Email: email });
    form.reset();
    showFormMessage(form, how === 'sent' ? 'You\'re on the list. See you at supper.' : 'Your email app has opened. Send it and we\'ll add you.');
  } catch (err) {
    showFormMessage(form, err.message, true);
  }
}

// ---------------------------------------------------------------------------
// Page chrome
// ---------------------------------------------------------------------------

function setupChrome() {
  // The compact bar slides in once the hero has scrolled out of view, and is
  // inert while hidden so keyboard users don't tab into it.
  const bar = $('#bar');
  const sheet = $('#sheet-nav');
  let barShown = false;
  const showBar = (show) => {
    barShown = show;
    bar.classList.toggle('show', show);
    bar.inert = !show || !sheet.hidden;
  };
  showBar(false);
  new IntersectionObserver(([entry]) => showBar(!entry.isIntersecting), { rootMargin: '-64px 0px 0px 0px' })
    .observe($('.hero'));

  // Full-screen menu on small screens. The page behind it is inert while open.
  const openers = $$('.menu-btn[aria-controls="sheet-nav"]');
  let opener = null;
  const setNav = (open) => {
    sheet.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    $('main').inert = open;
    $('.footer').inert = open;
    showBar(barShown);
    for (const b of openers) b.setAttribute('aria-expanded', String(open));
    if (open) $('[data-close-nav]', sheet).focus();
    else if (opener) opener.focus({ preventScroll: true });
  };
  for (const b of openers) b.addEventListener('click', () => { opener = b; setNav(true); drawIcons(); });
  $('[data-close-nav]', sheet).addEventListener('click', () => setNav(false));
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) { opener = null; setNav(false); } });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) setNav(false);
  });

  // Links that preset the occasion, e.g. the hearth menu or a supper night.
  for (const link of $$('[data-occasion]')) {
    link.addEventListener('click', () => {
      $('#occasion').value = link.dataset.occasion;
      showBookingForm();
    });
  }
}

function init() {
  fillDetails();
  renderStatus();
  renderHours();
  renderSpecials();
  renderMenuTabs();
  renderFilters();
  renderMenu();
  renderRooms();
  renderAmounts();
  renderQuickbook();
  renderBooking();
  setupChrome();

  $('#menu-tabs').addEventListener('keydown', onTabKeys);
  $('#quickbook').addEventListener('submit', submitQuickbook);
  $('#qb-date').addEventListener('change', renderQuickTimes);
  $('#booking-form').addEventListener('submit', submitBooking);
  for (const b of $$('[data-party]')) b.addEventListener('click', () => bumpParty(Number(b.dataset.party)));
  for (const b of $$('[data-scroll]')) b.addEventListener('click', () => scrollDates(Number(b.dataset.scroll)));
  $('#party-note').addEventListener('click', (e) => { e.preventDefault(); openEventDialog(null, CONFIG.maxPartyOnline + 2); });
  $('[data-event-open]').addEventListener('click', (e) => { e.preventDefault(); openEventDialog(null); });
  $('#add-calendar').addEventListener('click', downloadCalendar);
  $('#book-again').addEventListener('click', () => { showBookingForm(); booking.time = null; renderBooking(); });
  $('#event-form').addEventListener('submit', submitEvent);
  $('#event-room').addEventListener('change', updateEventHint);
  $('#event-guests').addEventListener('input', updateEventHint);
  $('[data-close]').addEventListener('click', () => $('#event-dialog').close());
  $('#gift-form').addEventListener('submit', submitGift);
  $('#letter-form').addEventListener('submit', submitLetter);

  // Keep the status, times and dates honest as the clock moves on, without
  // pulling focus from someone halfway through a form.
  setInterval(() => {
    renderStatus();
    if (!$('#quickbook').contains(document.activeElement)) renderQuickbook();
    if (!$('#booking').contains(document.activeElement)) renderBooking();
  }, 60 * 1000);
  drawIcons();
}

init();
