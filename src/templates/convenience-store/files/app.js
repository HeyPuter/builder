// ---------------------------------------------------------------------------
// Halfmoon Mart. Everything a store owner would change lives in this block:
// the store's details, counter hours, the hot case, the aisles and what is on
// them, the weekly deals and the services at the counter. The page is built
// from it, so edit here and the page follows.
// ---------------------------------------------------------------------------

const STORE = {
  name: 'Halfmoon Mart',
  street: 'Garnet St & 9th Ave',
  addressBig: '1180 Garnet St',
  cross: 'at the corner of 9th Ave, Eastgate',
  mapsQuery: '1180 Garnet St, Eastgate',
  phone: '(555) 014-2424',
  parking: '4 spots out front, 10 min',
  since: '1998',
  // Times on the page (the hero clock, open/closed, the hot case) use the
  // store's own time zone, wherever the visitor is.
  timezone: 'America/New_York',
  pickupMinutes: 10,
};

// Counter services and when each runs, as [open, close] in 24h "HH:MM".
// A close earlier than the open runs past midnight. 'all' means 24 hours.
const SERVICES = [
  { name: 'Coffee bar', note: 'Drip, cold brew, oat and whole milk. Refills 99¢.', hours: 'all' },
  { name: 'ATM', note: 'Inside by the door. $2.50 fee, free with any purchase over $10.', hours: 'all' },
  { name: 'Parcel lockers', note: 'Pick up and drop off for most carriers. Code from your tracking email.', hours: 'all' },
  { name: 'Hot case', note: 'Breakfast sandwiches, slices, dumplings. See the batch times above.', hours: [['06:00', '23:30']] },
  { name: 'Lottery & tickets', note: 'Scratchers, daily draws and transit cards.', hours: [['06:00', '02:00']] },
  { name: 'Copies & print', note: 'Black and white 15¢, color 50¢. Send it to the counter email.', hours: [['07:00', '22:00']] },
  { name: 'Bill pay & top-up', note: 'Phone credit, utility bills and prepaid cards.', hours: [['07:00', '23:00']] },
];

// The hot case: when each fresh batch comes out, and what is in it.
const HOT_BATCHES = [
  { time: '06:00', what: 'Egg & cheese rolls, hash browns, soft eggs' },
  { time: '11:00', what: 'Pizza slices, chicken rice bowls, dumplings' },
  { time: '16:00', what: 'Slices, spicy noodles, corn dogs' },
  { time: '21:00', what: 'Late slices, dumplings, sweet buns' },
];
const HOT_MENU = [
  { name: 'Egg & cheese roll', price: 3.75 },
  { name: 'Pizza slice, cheese or pepperoni', price: 2.95 },
  { name: 'Dumplings, 6 pc', price: 4.50 },
  { name: 'Chicken rice bowl', price: 6.25 },
  { name: 'Soft seasoned egg', price: 1.60 },
];

const AISLES = [
  { id: 1, name: 'Snacks' },
  { id: 2, name: 'Cold drinks' },
  { id: 3, name: 'Pantry' },
  { id: 4, name: 'Dairy & frozen' },
  { id: 5, name: 'Home & care' },
];

// tag: an optional flag printed in the corner of the shelf label.
const PRODUCTS = [
  { id: 'chips-salt', name: 'Sea salt kettle chips', size: '5 oz', price: 3.49, aisle: 1, tag: 'Local' },
  { id: 'trail-mix', name: 'Trail mix, sweet & salty', size: '8 oz', price: 4.99, aisle: 1 },
  { id: 'gummy', name: 'Sour gummy worms', size: '6 oz', price: 2.29, aisle: 1, tag: '2 for $4' },
  { id: 'choc-bar', name: 'Dark chocolate bar, 70%', size: '3.5 oz', price: 2.99, aisle: 1 },
  { id: 'popcorn', name: 'Butter popcorn, ready to eat', size: '4 oz', price: 3.25, aisle: 1 },
  { id: 'water', name: 'Spring water', size: '1 L', price: 1.49, aisle: 2 },
  { id: 'cold-brew', name: 'Cold brew coffee can', size: '11 oz', price: 3.99, aisle: 2, tag: 'New' },
  { id: 'sparkling', name: 'Grapefruit sparkling water', size: '12 oz', price: 1.25, aisle: 2 },
  { id: 'oj', name: 'Orange juice, no pulp', size: '52 oz', price: 4.79, aisle: 2 },
  { id: 'electro', name: 'Electrolyte drink, lemon', size: '20 oz', price: 2.49, aisle: 2 },
  { id: 'ramen', name: 'Instant ramen, spicy', size: '4.2 oz', price: 1.79, aisle: 3, tag: 'Hot pick' },
  { id: 'bread', name: 'Sliced white bread', size: '20 oz', price: 3.29, aisle: 3 },
  { id: 'pb', name: 'Peanut butter, crunchy', size: '16 oz', price: 3.99, aisle: 3 },
  { id: 'pasta', name: 'Spaghetti', size: '1 lb', price: 1.99, aisle: 3 },
  { id: 'milk', name: 'Whole milk', size: '½ gal', price: 3.49, aisle: 4 },
  { id: 'oat-milk', name: 'Oat milk, barista', size: '32 oz', price: 4.49, aisle: 4 },
  { id: 'eggs', name: 'Large eggs, dozen', size: '12 ct', price: 3.99, aisle: 4 },
  { id: 'ice-cream', name: 'Vanilla ice cream pint', size: '16 oz', price: 4.99, aisle: 4, tag: '2 for $8' },
  { id: 'ice', name: 'Bag of ice', size: '7 lb', price: 2.99, aisle: 4 },
  { id: 'tp', name: 'Toilet paper, 4 rolls', size: '4 ct', price: 4.99, aisle: 5 },
  { id: 'aa', name: 'AA batteries', size: '4 ct', price: 6.49, aisle: 5 },
  { id: 'pain', name: 'Pain relief tablets', size: '24 ct', price: 5.99, aisle: 5 },
  { id: 'toothbrush', name: 'Travel toothbrush kit', size: '1 ct', price: 3.49, aisle: 5 },
];

// Extra words the aisle finder knows, for things that are not on the order
// shelf above. spot is said the way the clerk would say it.
const FINDER = [
  { words: ['phone charger', 'charger', 'cable', 'usb'], aisle: 5, spot: 'top shelf, on the hooks by the batteries' },
  { words: ['umbrella', 'poncho'], aisle: 5, spot: 'in the bucket by the front door, when it rains' },
  { words: ['diapers', 'wipes', 'baby'], aisle: 5, spot: 'bottom shelf, back end' },
  { words: ['cat food', 'dog food', 'pet'], aisle: 3, spot: 'bottom shelf, past the pasta' },
  { words: ['bananas', 'fruit', 'apples'], aisle: 0, spot: 'in the basket on the counter, by the register' },
  { words: ['beer', 'wine'], aisle: 2, spot: 'last two cooler doors. ID for everyone, every time' },
  { words: ['stamps', 'envelope', 'envelopes'], aisle: 0, spot: 'ask at the register, we keep them behind the counter' },
  { words: ['tea', 'coffee beans', 'ground coffee'], aisle: 3, spot: 'middle shelf, next to the peanut butter' },
  { words: ['butter', 'cheese', 'yogurt'], aisle: 4, spot: 'second cooler door, middle shelf' },
  { words: ['frozen pizza', 'frozen'], aisle: 4, spot: 'the chest freezer at the end' },
];
const FINDER_EXAMPLES = ['oat milk', 'phone charger', 'ice', 'cat food', 'batteries'];

// The weekly deals receipt. was / now are per item.
const DEALS = {
  start: '2026-10-19',
  end: '2026-10-25',
  lines: [
    { name: 'Cold brew coffee can', was: 3.99, now: 2.99 },
    { name: 'Ice cream pint, 2 for', was: 9.98, now: 8.00 },
    { name: 'Sour gummy worms, 2 for', was: 4.58, now: 4.00 },
    { name: 'Coffee + egg roll, before 10am', was: 5.74, now: 4.50 },
    { name: 'Any 3 sparkling waters', was: 3.75, now: 3.00 },
    { name: 'Large eggs, dozen', was: 4.49, now: 3.99 },
  ],
};

// ---------------------------------------------------------------------------
// Below here is how the page works.
// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const money = (n) => '$' + n.toFixed(2);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fmtTime = (min) => {
  min = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(min / 60), m = min % 60;
  const ap = h < 12 ? 'am' : 'pm';
  return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${ap}`;
};

const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {} },
};

// The time right now in the store's time zone, as hours/minutes/seconds.
function storeNow() {
  const parts = {};
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: STORE.timezone, hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short' })
      .formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });
  } catch (e) {
    const d = new Date();
    Object.assign(parts, { hour: d.getHours(), minute: d.getMinutes(), second: d.getSeconds(), weekday: d.toDateString().slice(0, 3) });
  }
  const h = Number(parts.hour) % 24, m = Number(parts.minute), s = Number(parts.second);
  return { h, m, s, day: parts.weekday, min: h * 60 + m, sec: h * 3600 + m * 60 + s };
}

function isOpen(hours, min) {
  if (hours === 'all') return true;
  return hours.some(([a, b]) => {
    const o = toMin(a), c = toMin(b);
    return c > o ? min >= o && min < c : min >= o || min < c;
  });
}
const hoursText = (hours) => hours === 'all' ? '24 hours' : hours.map(([a, b]) => `${fmtTime(toMin(a))}–${fmtTime(toMin(b))}`).join(', ');

// Store details into every [data-store] slot.
document.querySelectorAll('[data-store]').forEach((el) => {
  const v = STORE[el.dataset.store];
  if (v != null) el.textContent = v;
});
document.title = `${STORE.name} — Open 24 hours on ${STORE.street}`;
$('#year').textContent = new Date().getFullYear();
$('#directions').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(STORE.mapsQuery);
$('#callStore').href = 'tel:' + STORE.phone.replace(/[^\d+]/g, '');

// ---- Ticker ----------------------------------------------------------------
{
  const words = ['Open 24 hours', ...SERVICES.map((s) => s.name), 'Ice cold', 'Hot coffee', 'Cash or card', 'Order ahead'];
  const run = words.map((w) => `<span>${esc(w)}</span><b aria-hidden="true">✶</b>`).join('');
  $('#ticker').innerHTML = `<div>${run}</div><div aria-hidden="true">${run}</div>`;
}

// ---- Hero clock and the live bits that tick with it ---------------------------
const batchMins = HOT_BATCHES.map((b) => toMin(b.time));
const hotHours = SERVICES.find((s) => s.name === 'Hot case');

function nextBatch(now) {
  let best = null;
  HOT_BATCHES.forEach((b, i) => {
    let diff = batchMins[i] * 60 - now.sec;
    if (diff <= 0) diff += 86400;
    if (!best || diff < best.diff) best = { ...b, diff };
  });
  return best;
}

function tick() {
  const now = storeNow();
  const hh = String(now.h).padStart(2, '0'), mm = String(now.m).padStart(2, '0');
  $('#heroClock').innerHTML = `${hh}<span class="colon">:</span>${mm}`;
  $('#heroStatus').textContent = 'Open now. Open always.';
  $('#heroMeta').textContent = `${now.day} · ${fmtTime(now.min)} at the store · ${SERVICES.filter((s) => isOpen(s.hours, now.min)).length} of ${SERVICES.length} counter services running`;

  const nb = nextBatch(now);
  const d = nb.diff;
  $('#batchCountdown').textContent = [Math.floor(d / 3600), Math.floor(d / 60) % 60, d % 60].map((n) => String(n).padStart(2, '0')).join(':');
  $('#batchWhat').textContent = `${fmtTime(toMin(nb.time))}: ${nb.what}`;
  $('#batchLabel').textContent = hotHours && isOpen(hotHours.hours, now.min) ? 'Next batch out of the oven in' : 'Hot case is resting. First batch in';
  const needle = $('#dayline .needle');
  if (needle) needle.style.left = (now.sec / 864) + '%';

  if (now.s === 0 || !tick.started) renderHours(now);
  tick.started = true;
}

// ---- Hot case --------------------------------------------------------------
{
  const track = $('#dayline');
  const [open, close] = hotHours ? hotHours.hours[0].map(toMin) : [0, 1440];
  track.innerHTML = `<span class="window" style="left:${open / 14.4}%;width:${(close - open) / 14.4}%"></span>` +
    batchMins.map((m) => `<span class="batch" style="left:${m / 14.4}%"></span>`).join('') +
    '<span class="needle"></span>';
  $('#hotMenu').innerHTML = HOT_MENU.map((i) =>
    `<li><span>${esc(i.name)}</span><span class="lead" aria-hidden="true"></span><span>${money(i.price)}</span></li>`).join('');
}

// ---- Counter hours (visit) and services list -----------------------------------
function renderHours(now) {
  $('#hoursList').innerHTML = SERVICES.map((s) => {
    const open = isOpen(s.hours, now.min);
    return `<li class="${open ? 'is-open' : 'is-closed'}"><span>${esc(s.name)}</span><span>${hoursText(s.hours)}</span><b>${open ? 'Open' : 'Closed'}</b></li>`;
  }).join('');
  document.querySelectorAll('.service-state').forEach((el) => {
    const s = SERVICES[Number(el.dataset.i)];
    const open = isOpen(s.hours, now.min);
    el.textContent = open ? 'Open now' : 'Closed now';
    el.classList.toggle('is-closed', !open);
  });
}
$('#serviceList').innerHTML = SERVICES.map((s, i) =>
  `<li><span class="svc-num">${String(i + 1).padStart(2, '0')}</span>` +
  `<h3 class="svc-name">${esc(s.name)}</h3>` +
  `<p class="svc-note">${esc(s.note)}</p>` +
  `<p class="svc-hours">${hoursText(s.hours)} <span class="service-state" data-i="${i}"></span></p></li>`).join('');

tick();
setInterval(tick, 1000);

// ---- Shelves ---------------------------------------------------------------
let basket = store.get('halfmoon-bag', {});
let currentAisle = AISLES[0].id; // the aisle the shelves open on; 0 shows everything

function barcode(seed, w = 120, h = 34) {
  let x = 0, n = 0, out = '';
  for (const c of seed + seed) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  while (x < w) {
    n = (n * 1103515245 + 12345) >>> 0;
    const bw = 1 + (n >>> 28) % 3;
    if ((n >>> 17) & 1) out += `<rect x="${x}" y="0" width="${bw}" height="${h}"/>`;
    x += bw + 1;
  }
  return out;
}

function renderTabs() {
  const tabs = [{ id: 0, name: 'Everything' }, ...AISLES];
  $('#aisleTabs').innerHTML = tabs.map((a) =>
    `<button type="button" role="tab" class="aisle-sign" aria-selected="${a.id === currentAisle}" data-aisle="${a.id}">` +
    `<span class="aisle-no">${a.id || '★'}</span><span class="aisle-name">${esc(a.name)}</span></button>`).join('');
}

function renderRail() {
  const list = PRODUCTS.filter((p) => !currentAisle || p.aisle === currentAisle);
  $('#rail').innerHTML = list.map((p) => {
    const [whole, cents] = p.price.toFixed(2).split('.');
    const qty = basket[p.id] || 0;
    return `<button type="button" class="tag${qty ? ' in-bag' : ''}" data-id="${p.id}" aria-label="Add ${esc(p.name)}, ${money(p.price)}, to pickup bag${qty ? ` (${qty} in bag)` : ''}">` +
      (p.tag ? `<span class="tag-flag">${esc(p.tag)}</span>` : '') +
      `<span class="tag-name">${esc(p.name)}</span>` +
      `<span class="tag-price"><span class="cur">$</span>${whole}<span class="cents">${cents}</span></span>` +
      `<span class="tag-foot"><span>${esc(p.size)} · Aisle ${p.aisle}</span><svg viewBox="0 0 120 34" class="tag-code" aria-hidden="true">${barcode(p.id)}</svg></span>` +
      `<span class="tag-add" aria-hidden="true">${qty ? qty + ' in bag' : '+ Add'}</span>` +
      `</button>`;
  }).join('');
}

$('#aisleTabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-aisle]');
  if (!b) return;
  currentAisle = Number(b.dataset.aisle);
  renderTabs();
  renderRail();
});
$('#aisleTabs').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const btns = [...document.querySelectorAll('.aisle-sign')];
  const i = btns.indexOf(document.activeElement);
  if (i < 0) return;
  const next = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
  next.click();
  $(`.aisle-sign[data-aisle="${next.dataset.aisle}"]`).focus();
});
$('#rail').addEventListener('click', (e) => {
  const t = e.target.closest('.tag');
  if (!t) return;
  addToBag(t.dataset.id, 1);
  t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump');
});

// ---- Pickup bag ------------------------------------------------------------
const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

function addToBag(id, delta) {
  const q = (basket[id] || 0) + delta;
  if (q <= 0) delete basket[id]; else basket[id] = Math.min(q, 20);
  store.set('halfmoon-bag', basket);
  renderRail();
  renderCount();
  if (!$('#basket').hidden) renderBasket();
}
function renderCount() {
  const n = Object.values(basket).reduce((a, b) => a + b, 0);
  $('#basketCount').textContent = n;
  $('#basketOpen').classList.toggle('has-items', n > 0);
}
function pickupSlots() {
  const now = storeNow();
  const first = Math.ceil((now.min + STORE.pickupMinutes) / 15) * 15;
  return Array.from({ length: 12 }, (_, i) => first + i * 15);
}

function renderBasket() {
  const ids = Object.keys(basket).filter((id) => byId[id]);
  const body = $('#basketBody');
  const last = store.get('halfmoon-ticket', null);
  if (!ids.length) {
    body.innerHTML = `<p class="empty">Your bag is empty. Tap any yellow tag on the shelves to add it.</p>` +
      (last ? ticketHtml(last) : '') +
      `<a class="btn btn-ink" href="#shelves" data-close>Go to the shelves</a>`;
    return;
  }
  const total = ids.reduce((s, id) => s + byId[id].price * basket[id], 0);
  body.innerHTML =
    `<ul class="bag-lines">${ids.map((id) => {
      const p = byId[id];
      return `<li><div><p class="bag-name">${esc(p.name)}</p><p class="bag-meta">${esc(p.size)} · ${money(p.price)} · Aisle ${p.aisle}</p></div>` +
        `<div class="qty"><button type="button" data-q="${id}" data-d="-1" aria-label="One less ${esc(p.name)}">−</button><span>${basket[id]}</span>` +
        `<button type="button" data-q="${id}" data-d="1" aria-label="One more ${esc(p.name)}">+</button></div></li>`;
    }).join('')}</ul>` +
    `<p class="bag-total"><span>Estimated total</span><span>${money(total)}</span></p>` +
    `<form class="bag-form" id="bagForm" novalidate>` +
    `<label>Pickup time<select name="slot" required>${pickupSlots().map((m) => `<option value="${m}">${fmtTime(m)}</option>`).join('')}</select></label>` +
    `<label>Your name<input name="who" autocomplete="given-name" required maxlength="40"></label>` +
    `<label>Phone, for a text when it's ready<input name="phone" type="tel" autocomplete="tel" required inputmode="tel"></label>` +
    `<p class="form-error" id="bagError" role="alert"></p>` +
    `<button class="btn btn-yellow btn-block" type="submit">Place pickup order</button>` +
    `<p class="small">You pay at the counter, cash or card. We hold orders for 2 hours.</p>` +
    `</form>`;
}

function ticketHtml(t) {
  return `<div class="ticket" role="status"><p class="label">Pickup ticket</p><p class="ticket-no">#${t.no}</p>` +
    `<p>${esc(t.name)}, it'll be at the counter at <b>${fmtTime(t.slot)}</b>.</p>` +
    `<p class="small">${t.count} item${t.count === 1 ? '' : 's'} · about ${money(t.total)} · show this number at the register.</p></div>`;
}

$('#basketBody').addEventListener('click', (e) => {
  const q = e.target.closest('[data-q]');
  if (q) addToBag(q.dataset.q, Number(q.dataset.d));
  if (e.target.closest('[data-close]')) closeBasket();
});
$('#basketBody').addEventListener('submit', (e) => {
  e.preventDefault();
  const f = e.target;
  const name = f.elements.who.value.trim();
  const phone = f.elements.phone.value.replace(/[^\d]/g, '');
  const err = $('#bagError');
  if (!name) { err.textContent = 'Add a name so we know whose bag it is.'; f.elements.who.focus(); return; }
  if (phone.length < 7) { err.textContent = 'Add a phone number we can text when it is ready.'; f.elements.phone.focus(); return; }
  const ids = Object.keys(basket).filter((id) => byId[id]);
  const ticket = {
    no: String(Math.floor(1000 + Math.random() * 9000)),
    name, slot: Number(f.elements.slot.value),
    count: ids.reduce((s, id) => s + basket[id], 0),
    total: ids.reduce((s, id) => s + byId[id].price * basket[id], 0),
    items: ids.map((id) => ({ id, qty: basket[id] })),
  };
  store.set('halfmoon-ticket', ticket);
  basket = {};
  store.set('halfmoon-bag', basket);
  renderRail();
  renderCount();
  $('#basketBody').innerHTML = ticketHtml(ticket) + `<button type="button" class="btn btn-line-ink btn-block" data-close>Done</button>`;
  $('.ticket').focus?.();
});

let lastFocus = null;
function openBasket() {
  lastFocus = document.activeElement;
  renderBasket();
  $('#basket').hidden = false;
  $('#scrim').hidden = false;
  requestAnimationFrame(() => { $('#basket').classList.add('open'); $('#basketClose').focus(); });
  document.body.classList.add('locked');
}
function closeBasket() {
  $('#basket').classList.remove('open');
  $('#basket').hidden = true;
  $('#scrim').hidden = true;
  document.body.classList.remove('locked');
  if (lastFocus) lastFocus.focus();
}
$('#basketOpen').addEventListener('click', openBasket);
$('#basketClose').addEventListener('click', closeBasket);
$('#scrim').addEventListener('click', closeBasket);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$('#basket').hidden) closeBasket();
  if (e.key === 'Tab' && !$('#basket').hidden) {
    const f = [...$('#basket').querySelectorAll('button, a, input, select')].filter((el) => !el.disabled);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});

// ---- Aisle finder ------------------------------------------------------------
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const aisleName = (id) => id === 0 ? 'The counter' : `Aisle ${id}, ${AISLES.find((a) => a.id === id)?.name.toLowerCase()}`;

function find(q) {
  const n = norm(q);
  if (!n) return null;
  const singular = n.replace(/s$/, '');
  for (const f of FINDER) {
    if (f.words.some((w) => w === n || w === singular)) return { title: aisleName(f.aisle), spot: f.spot, aisle: f.aisle };
  }
  // Every word asked for has to start a word of the product name, so "ice"
  // finds the bag of ice and not orange juice.
  const asked = n.split(' ').map((w) => w.replace(/s$/, ''));
  const hits = PRODUCTS.filter((p) => {
    const words = norm(p.name).split(' ');
    return asked.every((w) => words.some((pw) => pw.startsWith(w)));
  }).sort((a, b) => a.name.length - b.name.length); // the plainest match first
  if (hits.length) {
    const p = hits[0];
    return { title: aisleName(p.aisle), spot: `${p.name}, ${money(p.price)}. ${hits.length > 1 ? `Plus ${hits.length - 1} more like it there.` : 'Eye level, price tag on the shelf edge.'}`, aisle: p.aisle, product: p };
  }
  for (const f of FINDER) {
    if (f.words.some((w) => w.includes(singular) || singular.includes(w))) return { title: aisleName(f.aisle), spot: f.spot, aisle: f.aisle };
  }
  return null;
}

function answer(q) {
  const out = $('#finderAnswer');
  const r = find(q);
  if (!r) {
    out.innerHTML = `<p class="ans-big">Not on our shelves.</p><p class="ans-spot">Ask at the counter. We take requests and restock on Tuesdays and Fridays.</p>`;
    return;
  }
  out.innerHTML = `<p class="ans-big">${esc(r.title)}</p><p class="ans-spot">${esc(r.spot.charAt(0).toUpperCase() + r.spot.slice(1))}</p>` +
    (r.product ? `<button type="button" class="btn btn-ink" data-add="${r.product.id}">Add to pickup bag</button>` : '') +
    (r.aisle ? `<button type="button" class="btn btn-line-ink" data-goto="${r.aisle}">Show aisle ${r.aisle}</button>` : '');
}
$('#finderForm').addEventListener('submit', (e) => { e.preventDefault(); answer($('#finderInput').value); });
$('#finderAnswer').addEventListener('click', (e) => {
  const add = e.target.closest('[data-add]');
  if (add) { addToBag(add.dataset.add, 1); add.textContent = 'Added. Add another'; }
  const go = e.target.closest('[data-goto]');
  if (go) {
    currentAisle = Number(go.dataset.goto);
    renderTabs(); renderRail();
    $('#shelves').scrollIntoView({ behavior: 'smooth' });
  }
});
$('#finderChips').innerHTML = FINDER_EXAMPLES.map((w) => `<button type="button" class="chip">${esc(w)}</button>`).join('');
$('#finderChips').addEventListener('click', (e) => {
  const c = e.target.closest('.chip');
  if (!c) return;
  $('#finderInput').value = c.textContent;
  answer(c.textContent);
});

// ---- Deals receipt ------------------------------------------------------------
{
  const fmtDay = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  $('#dealsDates').textContent = `${fmtDay(DEALS.start)} – ${fmtDay(DEALS.end)}`;
  $('#dealLines').innerHTML = DEALS.lines.map((l) =>
    `<li><span class="r-name">${esc(l.name)}</span><span class="r-lead" aria-hidden="true"></span><span class="r-now">${money(l.now)}</span>` +
    `<span class="r-was">was ${money(l.was)} · save ${money(l.was - l.now)}</span></li>`).join('');
  $('#dealSave').textContent = money(DEALS.lines.reduce((s, l) => s + l.was - l.now, 0));
  $('#dealBarcode').innerHTML = barcode(DEALS.start, 200, 40);
}

renderTabs();
renderRail();
renderCount();
