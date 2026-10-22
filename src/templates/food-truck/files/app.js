// ============================================================================
// CONTENT — edit the truck's details here. Everything on the page reads from
// these objects: the live "where are we" board, the route, the menu board,
// the order ticket and the catering quote.
// ============================================================================

const BUSINESS = {
  name: 'Comal Comet',
  intro: 'Hand-pressed tortillas, birria that drips down your wrist, and a truck that parks somewhere new every day.',
  ring: 'HAND-PRESSED ✦ TORTILLAS ✦ EVERY DAY ✦ SINCE 2019 ✦',
  phone: '(555) 014-2290',
  email: 'hola@comalcomet.example',
  instagram: '@comalcomet',
  instagramUrl: 'https://instagram.com/',
  commissary: '212 Foundry Row, Portside',
  dealLine: 'Three tacos.<br>Twelve bucks.',
  dealSmall: 'Before noon, at every stop. No code, just ask at the window.',
  taxRate: 0.0875,
  orderLeadMinutes: 20,   // earliest pickup is this many minutes from now
  slotMinutes: 15,        // pickup times are offered every N minutes
};

// The weekly route. day: 0 = Sunday … 6 = Saturday. Times are 24-hour local
// time. A day with `off` shows on the route as a day off.
const SCHEDULE = [
  { day: 1, off: 'Day off. We re-season the comal.' },
  { day: 2, place: 'Harbor Yards', address: 'Pier 4 lot, 410 Harbor Way', open: '11:00', close: '14:30' },
  { day: 3, place: 'Civic Plaza', address: '1 Civic Center Dr', open: '11:00', close: '14:30' },
  { day: 4, place: 'Kiln St. Brewing', address: '88 Kiln St', open: '17:00', close: '21:30' },
  { day: 5, place: 'Alder & 5th', address: '500 Alder St', open: '11:00', close: '14:00' },
  { day: 5, place: 'Foundry Night Market', address: '212 Foundry Row', open: '18:00', close: '23:30' },
  { day: 6, place: 'Riverside Market', address: 'Riverside Park, Gate B', open: '09:00', close: '14:00' },
  { day: 6, place: 'Foundry Night Market', address: '212 Foundry Row', open: '18:00', close: '23:30' },
  { day: 0, place: 'Kestrel Park', address: 'Kestrel Park, north lawn', open: '11:00', close: '16:00' },
];

// The menu board. tags: V vegetarian, GF gluten-free, hot. soldOut shows the
// dish as 86'd. photo is optional and shows on the polaroid when hovered.
const MENU = [
  {
    category: 'Tacos', note: 'corn, pressed to order',
    items: [
      { id: 'birria', name: 'Birria quesataco', desc: 'Beef birria, melted Oaxaca cheese, griddled crisp, cup of consomé to dunk.', price: 5.00, tags: ['GF'], photo: 'photos/fried-tacos.jpg' },
      { id: 'pastor', name: 'Al pastor', desc: 'Achiote pork off the spit, charred pineapple, onion, cilantro.', price: 4.25, tags: ['GF', 'hot'], photo: 'photos/tacos-plate.jpg' },
      { id: 'asada', name: 'Carne asada', desc: 'Flank steak, salsa roja, white onion, a squeeze of lime.', price: 4.50, tags: ['GF'], photo: 'photos/tacos-limes.jpg' },
      { id: 'hongos', name: 'Hongos', desc: 'Oyster mushrooms, poblano rajas, crema, toasted pepitas.', price: 4.00, tags: ['V', 'GF'] },
      { id: 'baja', name: 'Baja fish', desc: 'Beer-battered cod, cabbage, chipotle crema.', price: 5.00, tags: [], soldOut: true },
    ],
  },
  {
    category: 'Bigger', note: 'for the very hungry',
    items: [
      { id: 'burrito', name: 'Comet burrito', desc: 'Flour tortilla, birria or asada, rice, beans, cheese, salsa verde. Foil-wrapped.', price: 13.00, tags: [], photo: 'photos/burrito.jpg' },
      { id: 'plate', name: 'Quesabirria plate', desc: 'Three quesatacos, a big cup of consomé, radish, lime.', price: 15.00, tags: ['GF'], photo: 'photos/fried-tacos.jpg' },
      { id: 'bowl', name: 'Veggie bowl', desc: 'Rice, black beans, hongos, elote, pico, avocado salsa.', price: 12.00, tags: ['V', 'GF'] },
    ],
  },
  {
    category: 'Sides', note: '',
    items: [
      { id: 'chips', name: 'Chips & salsa trio', desc: 'Roja, verde and habanero, chips fried this morning.', price: 5.00, tags: ['V', 'GF', 'hot'], photo: 'photos/chips-salsa.jpg' },
      { id: 'elote', name: 'Elote', desc: 'Grilled corn, mayo, cotija, tajín.', price: 5.00, tags: ['V', 'GF'] },
    ],
  },
  {
    category: 'Sweet & cold', note: '',
    items: [
      { id: 'churros', name: 'Churros & cajeta', desc: 'Cinnamon sugar, goat-milk caramel to dip.', price: 6.00, tags: ['V'], photo: 'photos/churros.jpg' },
      { id: 'horchata', name: 'Horchata', desc: 'Rice, cinnamon, vanilla, over ice.', price: 4.00, tags: ['V', 'GF'] },
      { id: 'jamaica', name: 'Agua de jamaica', desc: 'Hibiscus, a little lime.', price: 4.00, tags: ['V', 'GF'] },
    ],
  },
];

// Catering: packages are priced per guest. Food below the minimum is topped
// up to it. Dates in bookedDates (YYYY-MM-DD) can't be picked.
const CATERING = {
  minGuests: 25,
  maxGuests: 300,
  leadDays: 10,
  monthsAhead: 12,
  minimumFood: 1200,
  includedHours: 2,
  hourOptions: [2, 3, 4, 5],
  extraHourFee: 175,
  freeMiles: 10,
  perMileFee: 3,
  serviceRate: 0.18,
  depositRate: 0.25,
  packages: [
    { id: 'tacobar', name: 'Taco bar', desc: 'Three taco fillings, chips & salsa trio, aguas frescas.', perGuest: 16 },
    { id: 'fullspread', name: 'Full spread', desc: 'Taco bar plus birria with consomé, elote and churros.', perGuest: 22 },
    { id: 'latenight', name: 'Late night', desc: 'After 9pm: quesatacos, burritos and churros until the last guest.', perGuest: 19 },
  ],
  bookedDates: ['2026-11-07', '2026-11-14', '2026-11-21', '2026-11-28', '2026-12-05', '2026-12-12', '2026-12-13', '2026-12-19', '2026-12-31', '2027-01-16', '2027-02-14'],
};

// Text alerts: the neighborhoods people can follow.
const NEIGHBORHOODS = ['Harbor Yards', 'Downtown', 'Kiln District', 'Foundry Row', 'Riverside', 'Kestrel Park'];

// The short list beside the alerts form.
const RULES = [
  { title: 'Cards, cash, phones', body: 'All welcome. Tips go straight to the crew on the line.' },
  { title: 'Allergies? Tell us', body: 'Our tortillas are corn, our fryer is shared. Ask and we will walk you through every dish.' },
  { title: 'Dogs eat free', body: 'Well-behaved dogs get a plain tortilla. Ask for the perro special.' },
  { title: 'We sell out', body: 'Birria runs out most days. Order ahead and it is held for you.' },
];

// ============================================================================
// APP
// ============================================================================

const $ = (sel, root = document) => root.querySelector(sel);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'text') n.textContent = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) n.append(kid);
  return n;
};
const money = (n) => '$' + n.toFixed(2);
const moneyRound = (n) => '$' + Math.round(n).toLocaleString('en-US');
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const store = {
  get(key, fallback) { try { const v = localStorage.getItem('comet:' + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem('comet:' + key, JSON.stringify(value)); } catch { /* storage may be blocked */ } },
};

const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
function fmtTime(mins) {
  const h = Math.floor(mins / 60) % 24, m = mins % 60;
  const ap = h < 12 ? 'am' : 'pm';
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}${ap}` : `${h12}${ap}`;
}
const fmtRange = (s) => `${fmtTime(toMin(s.open))}–${fmtTime(toMin(s.close))}`;
const mapsUrl = (s) => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${s.address}`);
const stops = SCHEDULE.filter((s) => !s.off);

// Every service window from today for `days` days, as real Dates.
function windows(days = 8, from = new Date()) {
  const out = [];
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let d = 0; d < days; d++) {
    const date = new Date(base); date.setDate(base.getDate() + d);
    for (const s of stops.filter((x) => x.day === date.getDay())) {
      const start = new Date(date); start.setMinutes(toMin(s.open));
      const end = new Date(date); end.setMinutes(toMin(s.close));
      out.push({ stop: s, start, end });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

// --- business details in the markup -----------------------------------------
function fillBusiness() {
  const tel = 'tel:' + BUSINESS.phone.replace(/[^\d+]/g, '');
  document.querySelectorAll('[data-biz]').forEach((n) => {
    const key = n.dataset.biz;
    if (key === 'phoneLink') { n.href = tel; if (!n.textContent.trim()) n.textContent = BUSINESS.phone; }
    else if (key === 'emailLink') { n.href = 'mailto:' + BUSINESS.email; n.textContent = BUSINESS.email; }
    else if (key === 'instagramLink') { n.href = BUSINESS.instagramUrl; if (n.closest('.footer')) n.textContent = BUSINESS.instagram; }
    else if (key === 'dealLine') n.innerHTML = BUSINESS.dealLine;
    else if (BUSINESS[key] != null) n.textContent = BUSINESS[key];
  });
  $('#year').textContent = new Date().getFullYear();
}

// --- the departure board -------------------------------------------------------
function renderFlaps(text) {
  const box = $('#bs-clock');
  box.replaceChildren(...[...text].map((c) => el('span', { class: c === ':' ? 'sep' : null, text: c })));
}
function pad(n) { return String(n).padStart(2, '0'); }
function updateBoard() {
  const now = new Date();
  const ws = windows(9, now);
  const current = ws.find((w) => w.start <= now && now < w.end);
  const next = ws.find((w) => w.start > now);
  const w = current || next;
  const lamp = $('#lamp');
  if (!w) return;
  const ms = (current ? w.end : w.start) - now;
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600), m = Math.floor(totalSec % 3600 / 60), s = totalSec % 60;
  if (current) {
    const lastCall = ms < 30 * 60000;
    $('#bs-label').textContent = lastCall ? 'Last call' : 'Now parked';
    $('#bs-clock-label').textContent = 'Window closes in';
    lamp.className = 'lamp ' + (lastCall ? 'soon' : 'on');
  } else {
    const sameDay = w.start.toDateString() === now.toDateString();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const when = sameDay ? 'today' : (w.start.toDateString() === tomorrow.toDateString() ? 'tomorrow' : DAYS[w.start.getDay()]);
    $('#bs-label').textContent = 'Next stop · ' + when;
    $('#bs-clock-label').textContent = 'Window opens in';
    lamp.className = 'lamp';
  }
  $('#bs-place').textContent = w.stop.place;
  $('#bs-address').textContent = w.stop.address;
  $('#bs-hours').textContent = `${SHORT[w.start.getDay()]} ${fmtRange(w.stop)}`;
  $('#bs-directions').href = mapsUrl(w.stop);
  renderFlaps(`${pad(h)}:${pad(m)}:${pad(s)}`);
  $('#bs-clock').setAttribute('aria-label', `${h} hours ${m} minutes`);
}

// --- ticker ----------------------------------------------------------------------
function renderTicker() {
  const order = [2, 3, 4, 5, 6, 0, 1];
  const bits = order.flatMap((d) => SCHEDULE.filter((s) => s.day === d).map((s) =>
    s.off ? `${SHORT[d]} · day off` : `${SHORT[d]} · ${s.place} · ${fmtRange(s)}`));
  const line = () => el('span', {}, ...bits.flatMap((b) => [b, el('b', { text: '✦' })]));
  $('#ticker').replaceChildren(line(), line());
}

// --- the route -------------------------------------------------------------------
function icsFor(stop) {
  const now = new Date();
  const next = windows(8, now).find((w) => w.stop === stop && w.end > now) || windows(8, now).find((w) => w.stop === stop);
  const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const utc = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Comal Comet//Route//EN', 'BEGIN:VEVENT',
    `UID:${stop.day}-${stop.open}-${stop.place.replace(/\W+/g, '')}@comet`,
    `DTSTAMP:${utc}`,
    `DTSTART:${stamp(next.start)}`, `DTEND:${stamp(next.end)}`,
    'RRULE:FREQ=WEEKLY',
    `SUMMARY:${BUSINESS.name} at ${stop.place}`,
    `LOCATION:${stop.address}`,
    `DESCRIPTION:Order ahead and skip the line.`,
    'END:VEVENT', 'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
  const a = el('a', { href: URL.createObjectURL(blob), download: `${BUSINESS.name}-${stop.place}.ics`.replace(/\s+/g, '-').toLowerCase() });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function renderRoute() {
  const order = [2, 3, 4, 5, 6, 0, 1];
  const today = new Date().getDay();
  const list = $('#stops');
  list.style.setProperty('--n', order.length);
  list.replaceChildren(...order.map((d, i) => {
    const entries = SCHEDULE.filter((s) => s.day === d);
    const off = entries.find((s) => s.off);
    const body = el('div', { class: 'stop-body' },
      el('h3', { class: 'stop-day', text: SHORT[d] }),
      d === today && !off ? el('span', { class: 'here-tag mono', text: 'Today' }) : null,
      off ? el('div', { class: 'stop-slot' }, el('p', { class: 'stop-place', text: off.off }))
        : entries.map((s) => el('div', { class: 'stop-slot' },
          el('p', { class: 'stop-place', text: s.place }),
          el('p', { class: 'stop-time mono', text: `${fmtRange(s)} · ${s.address}` }),
          el('p', { class: 'stop-links mono' },
            el('a', { href: mapsUrl(s), target: '_blank', rel: 'noopener', text: 'Map' }),
            el('button', { type: 'button', text: '+ Calendar', 'aria-label': `Add ${DAYS[d]} at ${s.place} to your calendar`, onclick: () => icsFor(s) })))),
    );
    return el('li', { class: `stop ${i % 2 ? 'down' : 'up'}${off ? ' off' : ''}${d === today ? ' today' : ''}`, 'aria-label': DAYS[d] },
      el('span', { class: 'dot', 'aria-hidden': 'true' }), body);
  }));
  drawRoad();
}

// The dashed road is drawn through the stop dots, so it follows the layout.
function drawRoad() {
  const svg = $('#road-line');
  const road = $('#road');
  if (getComputedStyle(svg).display === 'none') return;
  // Size the road so the tallest stop above and below the line both fit.
  const tallest = (sel) => Math.max(0, ...[...road.querySelectorAll(sel)].map((b) => b.offsetHeight));
  const up = tallest('.stop.up .stop-body'), down = tallest('.stop.down .stop-body');
  const c = up + 72 + 44;
  const list = $('#stops');
  list.style.setProperty('--c', c + 'px');
  list.style.setProperty('--h', (c + 44 + 72 + down + 8) + 'px');
  const box = road.getBoundingClientRect();
  const pts = [...road.querySelectorAll('.dot')].map((d) => {
    const r = d.getBoundingClientRect();
    return [r.left + r.width / 2 - box.left, r.top + r.height / 2 - box.top];
  });
  if (pts.length < 2) return;
  const first = [pts[0][0] - 400, pts[0][1] + 40], last = [box.width + 400, pts.at(-1)[1] - 40];
  const all = [first, ...pts, last];
  let d = `M${all[0][0]},${all[0][1]}`;
  for (let i = 1; i < all.length; i++) {
    const [x0, y0] = all[i - 1], [x1, y1] = all[i];
    const mx = (x0 + x1) / 2;
    d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
  svg.innerHTML = `<path d="${d}"/>`;
}

// --- the menu board ----------------------------------------------------------------
const ITEMS = new Map(MENU.flatMap((c) => c.items).map((i) => [i.id, i]));
let cart = store.get('cart', {});
for (const id of Object.keys(cart)) if (!ITEMS.has(id) || ITEMS.get(id).soldOut) delete cart[id];

function tagEl(t) {
  const label = { V: 'Vegetarian', GF: 'Gluten-free', hot: 'Hot' }[t] || t;
  return el('i', { class: 'tag' + (t === 'hot' ? ' hot' : ''), title: label, 'aria-label': label, text: t === 'hot' ? '🌶' : t });
}

function showPolaroid(item) {
  const img = $('#polaroid-img');
  const pol = img.closest('.polaroid');
  if (!item.photo || img.getAttribute('src') === item.photo) { $('#polaroid-cap').textContent = item.name; return; }
  img.src = item.photo;
  $('#polaroid-cap').textContent = item.name;
  pol.classList.remove('swap'); void pol.offsetWidth; pol.classList.add('swap');
}

function renderMenu() {
  $('#menu-board').replaceChildren(...MENU.map((cat) => el('section', { class: 'cat', 'aria-label': cat.category },
    el('h3', { class: 'cat-title' }, cat.category, cat.note ? el('small', { text: cat.note }) : null),
    el('ul', { class: 'items' }, cat.items.map((it) => {
      const li = el('li', { class: 'item' + (it.soldOut ? ' out' : ''), onmouseenter: () => showPolaroid(it) },
        el('p', { class: 'item-name' }, el('span', { text: it.name }), ...(it.tags || []).map(tagEl)),
        el('p', { class: 'item-price mono', text: money(it.price) }),
        el('p', { class: 'item-desc', text: it.desc }),
        it.soldOut
          ? el('span', { class: 'eighty-six', text: "86'd", title: 'Sold out today' })
          : el('button', {
            class: 'add', type: 'button', 'aria-label': `Add ${it.name} to your ticket`, text: '+',
            onfocus: () => showPolaroid(it),
            onclick: (e) => { addToCart(it.id); const b = e.currentTarget; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); },
          }));
      return li;
    })))));
}

function addToCart(id, delta = 1) {
  cart[id] = (cart[id] || 0) + delta;
  if (cart[id] <= 0) delete cart[id];
  store.set('cart', cart);
  if (!$('#ticket-done').hidden) { $('#ticket-done').hidden = true; }
  renderTicket();
}

function cartTotals() {
  const sub = Object.entries(cart).reduce((n, [id, q]) => n + ITEMS.get(id).price * q, 0);
  const tax = sub * BUSINESS.taxRate;
  return { sub, tax, total: sub + tax, count: Object.values(cart).reduce((a, b) => a + b, 0) };
}

function renderTicket() {
  const entries = Object.entries(cart);
  const empty = entries.length === 0;
  const done = !$('#ticket-done').hidden;
  $('#ticket-lines').replaceChildren(...entries.map(([id, q]) => {
    const it = ITEMS.get(id);
    return el('li', { class: 'tl' },
      el('span', { class: 'qty' },
        el('button', { type: 'button', 'aria-label': `One less ${it.name}`, text: '−', onclick: () => addToCart(id, -1) }),
        el('span', { text: q }),
        el('button', { type: 'button', 'aria-label': `One more ${it.name}`, text: '+', onclick: () => addToCart(id, 1) })),
      el('span', { class: 'tl-name', text: it.name }),
      el('span', { text: money(it.price * q) }));
  }));
  const t = cartTotals();
  $('#ticket-empty').hidden = !empty || done;
  $('#ticket-totals').hidden = empty;
  $('#ticket-pickup').hidden = empty || done;
  $('#t-sub').textContent = money(t.sub);
  $('#t-tax-label').textContent = `Tax ${(BUSINESS.taxRate * 100).toFixed(2).replace(/\.?0+$/, '')}%`;
  $('#t-tax').textContent = money(t.tax);
  $('#t-total').textContent = money(t.total);
  $('#ticket-bar-sum').textContent = `${t.count} item${t.count === 1 ? '' : 's'} · ${money(t.total)}`;
  updateTicketBar();
  if (!empty && !done) fillPickup();
}

// Pickup stops: the windows that still have a pickup slot left.
let pickupWindows = [];
function slotsFor(w) {
  const now = new Date();
  const earliest = new Date(Math.max(w.start, now.getTime() + BUSINESS.orderLeadMinutes * 60000));
  const step = BUSINESS.slotMinutes * 60000;
  const out = [];
  for (let t = Math.ceil(earliest.getTime() / step) * step; t <= w.end.getTime() - step; t += step) out.push(new Date(t));
  return out;
}
function fillPickup() {
  const stopSel = $('#pickup-stop');
  const prev = stopSel.value;
  pickupWindows = windows(8).filter((w) => slotsFor(w).length).slice(0, 4);
  const now = new Date();
  stopSel.replaceChildren(...pickupWindows.map((w, i) => {
    const day = w.start.toDateString() === now.toDateString() ? 'Today' : DAYS[w.start.getDay()];
    return el('option', { value: String(i), text: `${day} · ${w.stop.place}` });
  }));
  if (prev && pickupWindows[+prev]) stopSel.value = prev;
  fillTimes();
}
function fillTimes() {
  const w = pickupWindows[+$('#pickup-stop').value];
  const timeSel = $('#pickup-time');
  const prev = timeSel.value;
  const slots = w ? slotsFor(w) : [];
  timeSel.replaceChildren(...slots.map((d) => el('option', { value: d.toISOString(), text: fmtTime(d.getHours() * 60 + d.getMinutes()) })));
  if (slots.some((d) => d.toISOString() === prev)) timeSel.value = prev;
}

function submitTicket(e) {
  e.preventDefault();
  const err = $('#ticket-error');
  const name = $('#pickup-name').value.trim();
  const phone = $('#pickup-phone').value.trim();
  const w = pickupWindows[+$('#pickup-stop').value];
  const when = $('#pickup-time').value;
  if (!Object.keys(cart).length) { err.textContent = 'Your ticket is empty.'; return; }
  if (!w || !when) { err.textContent = 'Pick a stop and a time.'; return; }
  if (!name) { err.textContent = 'Add a name for the ticket.'; $('#pickup-name').focus(); return; }
  if (phone.replace(/\D/g, '').length < 10) { err.textContent = 'Add a phone number so we can text you.'; $('#pickup-phone').focus(); return; }
  err.textContent = '';
  const t = cartTotals();
  const d = new Date(when);
  const no = 'C-' + String(Math.floor(100 + Math.random() * 900));
  const order = { no, name, phone, notes: $('#pickup-notes').value.trim(), stop: w.stop.place, address: w.stop.address, time: when, items: { ...cart }, total: t.total };
  store.set('lastOrder', order);
  const day = d.toDateString() === new Date().toDateString() ? 'today' : DAYS[d.getDay()];
  $('#done-no').textContent = no;
  $('#done-text').textContent = `Thanks, ${name}. ${t.count} item${t.count === 1 ? '' : 's'}, ${money(t.total)}. Pick up at ${w.stop.place} (${w.stop.address}) ${day} at ${fmtTime(d.getHours() * 60 + d.getMinutes())}. We'll text ${phone} when it's up. Pay at the window.`;
  cart = {}; store.set('cart', cart);
  $('#ticket-done').hidden = false;
  renderTicket();
  $('#ticket-totals').hidden = true;
  $('#ticket-done').focus();
}

let ticketVisible = false;
function updateTicketBar() {
  const bar = $('#ticket-bar');
  bar.hidden = !Object.keys(cart).length || ticketVisible;
}

// --- catering -----------------------------------------------------------------------
const cater = { date: null, view: null };
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function catMinDate() { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + CATERING.leadDays); return d; }
function catMaxDate() { const d = catMinDate(); d.setMonth(d.getMonth() + CATERING.monthsAhead); return d; }

function renderCal() {
  const min = catMinDate(), max = catMaxDate();
  if (!cater.view) cater.view = new Date(min.getFullYear(), min.getMonth(), 1);
  const v = cater.view;
  $('#cal-month').textContent = v.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  $('#cal-prev').disabled = v <= new Date(min.getFullYear(), min.getMonth(), 1);
  $('#cal-next').disabled = v >= new Date(max.getFullYear(), max.getMonth(), 1);
  const cells = SHORT.map((s) => el('span', { class: 'cal-dow', text: s.slice(0, 2) }));
  for (let i = 0; i < v.getDay(); i++) cells.push(el('span'));
  const days = new Date(v.getFullYear(), v.getMonth() + 1, 0).getDate();
  for (let n = 1; n <= days; n++) {
    const d = new Date(v.getFullYear(), v.getMonth(), n);
    const key = iso(d);
    const booked = CATERING.bookedDates.includes(key);
    const out = d < min || d > max;
    const picked = cater.date === key;
    cells.push(el('button', {
      type: 'button',
      class: 'cal-day' + (booked ? ' booked' : '') + (picked ? ' picked' : ''),
      disabled: booked || out,
      'aria-pressed': picked ? 'true' : 'false',
      'aria-label': d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + (booked ? ', booked' : ''),
      text: n,
      onclick: () => { cater.date = key; renderCal(); renderQuote(); $(`[data-date="${key}"]`)?.focus(); },
      'data-date': key,
    }));
  }
  $('#cal-grid').replaceChildren(...cells);
}

function renderPackages() {
  const box = $('#packages');
  box.append(...CATERING.packages.map((p, i) => el('label', { class: 'pkg' },
    el('input', { type: 'radio', name: 'pkg', value: p.id, checked: i === 0, onchange: renderQuote }),
    el('span', { class: 'pkg-name' }, p.name, el('span', { class: 'pkg-desc', text: p.desc })),
    el('span', { class: 'pkg-price mono', text: `$${p.perGuest} / guest` }))));
  const hours = $('#cater-hours');
  hours.replaceChildren(...CATERING.hourOptions.map((h) => el('option', { value: h, text: `${h} hours` })));
  const g = $('#guests');
  g.min = CATERING.minGuests; g.max = CATERING.maxGuests;
}

function quote() {
  const guests = +$('#guests').value;
  const pkg = CATERING.packages.find((p) => p.id === (document.querySelector('input[name=pkg]:checked') || {}).value) || CATERING.packages[0];
  const hours = +$('#cater-hours').value;
  const miles = Math.max(0, +$('#cater-miles').value || 0);
  const food = guests * pkg.perGuest;
  const topUp = Math.max(0, CATERING.minimumFood - food);
  const extraHours = Math.max(0, hours - CATERING.includedHours) * CATERING.extraHourFee;
  const travel = Math.max(0, miles - CATERING.freeMiles) * CATERING.perMileFee;
  const service = (food + topUp) * CATERING.serviceRate;
  const total = food + topUp + extraHours + travel + service;
  return { guests, pkg, hours, miles, food, topUp, extraHours, travel, service, total, deposit: total * CATERING.depositRate };
}

function renderQuote() {
  const q = quote();
  $('#guests-out').textContent = q.guests;
  $('#quote-total').textContent = moneyRound(q.total);
  const li = (a, b) => el('li', {}, el('span', { text: a }), el('span', { text: b }));
  $('#quote-lines').replaceChildren(...[
    li(`${q.pkg.name}, ${q.guests} × $${q.pkg.perGuest}`, moneyRound(q.food)),
    q.topUp ? li(`Food minimum (${moneyRound(CATERING.minimumFood)})`, '+' + moneyRound(q.topUp)) : null,
    q.extraHours ? li(`${q.hours - CATERING.includedHours} extra hour${q.hours - CATERING.includedHours > 1 ? 's' : ''}`, moneyRound(q.extraHours)) : null,
    li(q.travel ? `Travel, ${q.miles - CATERING.freeMiles} mi past ${CATERING.freeMiles}` : `Travel (first ${CATERING.freeMiles} mi free)`, q.travel ? moneyRound(q.travel) : '$0'),
    li(`Crew & service ${Math.round(CATERING.serviceRate * 100)}%`, moneyRound(q.service)),
    li(cater.date ? `Deposit to hold ${new Date(cater.date + 'T12:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Deposit to hold a date', moneyRound(q.deposit)),
  ].filter(Boolean));
}

function submitCatering(e) {
  e.preventDefault();
  const err = $('#cater-error');
  const name = $('#cater-name').value.trim();
  const email = $('#cater-email').value.trim();
  if (!cater.date) { err.textContent = 'Pick a date on the calendar first.'; $('#cal').scrollIntoView({ block: 'center' }); return; }
  if (!name) { err.textContent = 'Tell us your name.'; $('#cater-name').focus(); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'Add an email so we can confirm.'; $('#cater-email').focus(); return; }
  err.textContent = '';
  const q = quote();
  const date = new Date(cater.date + 'T12:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const occasion = $('#cater-occasion').value.trim();
  const summary = `${date} · ${q.guests} guests · ${q.pkg.name} · ${q.hours} hours · ${q.miles} miles out · estimate ${moneyRound(q.total)}`;
  store.set('cateringRequest', { date: cater.date, name, email, occasion, guests: q.guests, pkg: q.pkg.id, hours: q.hours, miles: q.miles, total: Math.round(q.total) });
  $('#cater-done-text').textContent = `${summary}. We hold dates for 48 hours and confirm by email within a day, ${name.split(' ')[0]}.`;
  const body = `Hi ${BUSINESS.name},\n\nWe'd like to book the truck.\n\n${summary.split(' · ').join('\n')}\nOccasion: ${occasion || '—'}\n\n${name}\n${email}`;
  $('#cater-mail').href = `mailto:${BUSINESS.email}?subject=${encodeURIComponent('Truck booking: ' + date)}&body=${encodeURIComponent(body)}`;
  $('#cater-done').hidden = false;
  $('#cater-form button[type=submit]').textContent = 'Update my request';
  $('#cater-done').focus();
}

// --- text alerts + rules ------------------------------------------------------------
function renderAlerts() {
  const saved = store.get('alerts', null);
  $('#hoods').append(...NEIGHBORHOODS.map((h) => el('label', { class: 'hood' },
    el('input', { type: 'checkbox', value: h, checked: saved ? saved.hoods.includes(h) : false }),
    el('span', { text: h }))));
  if (saved) {
    $('#alert-phone').value = saved.phone;
    showAlertsDone(saved);
  }
  $('#rules').replaceChildren(...RULES.map((r) => el('li', {}, el('p', {}, el('b', { text: r.title }), r.body))));
}
function showAlertsDone(s) {
  const n = $('#alerts-done');
  n.hidden = false;
  n.textContent = `You're on the list. We'll text ${s.phone} when we park in ${s.hoods.join(', ')}. Reply STOP any time.`;
}
function submitAlerts(e) {
  e.preventDefault();
  const err = $('#alert-error');
  const hoods = [...document.querySelectorAll('#hoods input:checked')].map((i) => i.value);
  const phone = $('#alert-phone').value.trim();
  if (!hoods.length) { err.textContent = 'Pick at least one neighborhood.'; return; }
  if (phone.replace(/\D/g, '').length < 10) { err.textContent = 'Add a mobile number with area code.'; $('#alert-phone').focus(); return; }
  err.textContent = '';
  const s = { phone, hoods };
  store.set('alerts', s);
  showAlertsDone(s);
}

// --- mobile menu ----------------------------------------------------------------------
function setupSheet() {
  const btn = $('.menu-toggle');
  const sheet = $('#sheet');
  const set = (open) => {
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('.sr-only').textContent = open ? 'Close menu' : 'Open menu';
    sheet.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  };
  btn.addEventListener('click', () => set(sheet.hidden));
  sheet.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) { set(false); btn.focus(); } });
  window.matchMedia('(min-width: 1101px)').addEventListener('change', (m) => { if (m.matches) set(false); });
}

// --- boot ------------------------------------------------------------------------------
fillBusiness();
renderTicker();
renderRoute();
renderMenu();
renderPackages();
renderCal();
renderQuote();
renderAlerts();
setupSheet();
updateBoard();
setInterval(updateBoard, 1000);
renderTicket();
// Pickup slots move with the clock.
setInterval(() => { if (!$('#ticket-pickup').hidden) fillPickup(); }, 60000);

$('#pickup-stop').addEventListener('change', fillTimes);
$('#ticket').addEventListener('submit', submitTicket);
$('#ticket-new').addEventListener('click', () => { $('#ticket-done').hidden = true; renderTicket(); document.querySelector('.add')?.focus(); });
$('#guests').addEventListener('input', renderQuote);
$('#cater-hours').addEventListener('change', renderQuote);
$('#cater-miles').addEventListener('input', renderQuote);
$('#cal-prev').addEventListener('click', () => { cater.view.setMonth(cater.view.getMonth() - 1); renderCal(); });
$('#cal-next').addEventListener('click', () => { cater.view.setMonth(cater.view.getMonth() + 1); renderCal(); });
$('#cater-form').addEventListener('submit', submitCatering);
$('#alerts-form').addEventListener('submit', submitAlerts);

if ('IntersectionObserver' in window) {
  new IntersectionObserver(([entry]) => { ticketVisible = entry.isIntersecting; updateTicketBar(); }).observe($('#ticket'));
}
let resizeTimer;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawRoad, 120); });
document.fonts?.ready.then(drawRoad);
