// =============================================================================
// SHOP CONTENT — edit everything about the shop here.
// Times are 24-hour "HH:MM". Prices are in dollars.
// =============================================================================

const SHOP = {
  name: 'Fennick Cleaners & Tailors',
  short: 'Fennick',
  trade: 'Cleaners & Tailors',
  est: 1958,
  street: '214 Alder Street',
  city: 'Brooklyn, NY 11222',
  phone: '(718) 555-0158',
  email: 'counter@fennickcleaners.com',
  parking: 'Two 15-minute spots out front, marked for Fennick customers. Bike rack by the door.',
  ticketPrefix: '58',      // every claim ticket starts with this, e.g. 58-2140
  currency: '$',
};

// One entry per weekday, Sunday first. null = closed all day.
// cutoff: drop off by this time for same-day service; ready: when same-day orders are back on the rack.
const HOURS = [
  null,                                                                       // Sunday
  { open: '07:00', close: '19:00', cutoff: '09:00', ready: '17:00' },         // Monday
  { open: '07:00', close: '19:00', cutoff: '09:00', ready: '17:00' },         // Tuesday
  { open: '07:00', close: '19:00', cutoff: '09:00', ready: '17:00' },         // Wednesday
  { open: '07:00', close: '19:00', cutoff: '09:00', ready: '17:00' },         // Thursday
  { open: '07:00', close: '19:00', cutoff: '09:00', ready: '17:00' },         // Friday
  { open: '08:00', close: '17:00', cutoff: '09:00', ready: '15:00' },         // Saturday
];
const HOLIDAY_NOTE = 'Closed Thanksgiving, Christmas Day and New Year’s Day.';

// Rush: same-day garments back in a few hours, for a surcharge.
const RUSH = { percent: 40, hours: 3, lastIn: '15:00' };

// The ledger of services, top of the page.
const SERVICES = [
  { name: 'Dry cleaning', from: 8.5, turn: 'Same day, in by 9', desc: 'Suits, dresses, coats, wool and silk. Spotted by hand under the lamp, cleaned in odorless silicone solvent, no perc.' },
  { name: 'Shirts', from: 3.75, turn: 'Same day', desc: 'Laundered and pressed on our collar-and-cuff press, then hand-finished. On hangers or boxed, starch to order.' },
  { name: 'Wash & fold', from: 2.25, unit: '/lb', turn: 'Next day', desc: 'Everyday laundry by the pound. Washed cold unless you say otherwise, dried low, folded square and wrapped.' },
  { name: 'Alterations', from: 14, turn: '3 days', desc: 'Hems, waists, sleeves, zips and buttons. Pinned and fitted at the counter by our tailor, Mr. Oduya.' },
  { name: 'Gowns & leather', from: 65, turn: '1–2 weeks', desc: 'Wedding gowns cleaned, pressed and boxed acid-free. Leather and suede cleaned and re-finished by specialists.' },
  { name: 'Household', from: 14, turn: '2 days', desc: 'Duvets, comforters, curtains, table linen and small rugs. We’ll take the curtains down for you, too.' },
];

// The price list. days: 0 = same-day eligible; otherwise working days to finish.
const PRICES = [
  { category: 'Shirts & suits', items: [
    { name: 'Shirt, laundered', note: 'on hanger', price: 3.75, days: 0 },
    { name: 'Shirt, hand-finished', note: 'linen, tuxedo', price: 6.5, days: 0 },
    { name: 'Trousers', price: 8.5, days: 0 },
    { name: 'Blazer or jacket', price: 11.5, days: 0 },
    { name: 'Suit, two-piece', price: 19, days: 0 },
    { name: 'Tie', price: 6, days: 0 },
    { name: 'Overcoat', note: 'wool, cashmere', price: 24, days: 1 },
  ] },
  { category: 'Dresses & knits', items: [
    { name: 'Dress', price: 16, days: 0 },
    { name: 'Blouse, silk', price: 9.5, days: 0 },
    { name: 'Skirt', price: 8.5, days: 0 },
    { name: 'Sweater', note: 'blocked to shape', price: 9, days: 0 },
    { name: 'Evening gown', note: 'from', price: 45, days: 3 },
  ] },
  { category: 'Household', items: [
    { name: 'Wash & fold', note: 'per lb, 10 lb min.', price: 2.25, days: 1, unit: 'lb', step: 5, min: 10 },
    { name: 'Duvet, queen', price: 38, days: 2 },
    { name: 'Comforter', price: 34, days: 2 },
    { name: 'Curtain panel', note: 'lined', price: 22, days: 2 },
    { name: 'Tablecloth', price: 14, days: 2 },
  ] },
  { category: 'Tailoring', items: [
    { name: 'Hem trousers', price: 14, days: 3 },
    { name: 'Take in or let out waist', price: 20, days: 3 },
    { name: 'Shorten sleeves', note: 'jacket', price: 26, days: 3 },
    { name: 'Replace zipper', price: 18, days: 3 },
    { name: 'Taper legs', price: 22, days: 3 },
    { name: 'Sew on button', price: 2, days: 0 },
  ] },
  { category: 'Leather & bridal', items: [
    { name: 'Leather jacket', price: 65, days: 7 },
    { name: 'Suede jacket', price: 70, days: 7 },
    { name: 'Wedding gown, clean & box', price: 245, days: 14 },
  ] },
];
const PRICE_FINE = 'Prices are per item and include a hanger and a poly bag. Buttons that go missing on our watch are replaced free.';

// Free pickup & delivery.
const DELIVERY = {
  zips: ['11222', '11211', '11206', '11249', '11237', '11101'],
  freeOver: 40,
  fee: 4.95,
  windows: [
    { id: 'am', label: 'Morning', range: '7–9 AM', start: '07:00' },
    { id: 'mid', label: 'Midday', range: '12–2 PM', start: '12:00' },
    { id: 'eve', label: 'Evening', range: '6–8 PM', start: '18:00', notOn: [6] },   // no evenings on Saturday
  ],
  daysAhead: 6,
};

// Tracker stations, left to right.
const STATIONS = [
  { name: 'Tagged', desc: 'Counted, pinned with your number, pockets checked.' },
  { name: 'Spotted', desc: 'Stains treated by hand under the lamp.' },
  { name: 'Cleaned', desc: 'Dry cleaned or washed, whichever the label allows.' },
  { name: 'Pressed', desc: 'Steamed, pressed, collars by hand.' },
  { name: 'On the rack', desc: 'Bagged and hanging, ready for you.' },
];
// Fixed demo tickets; any other 58-xxxx number gets a made-up status.
const DEMO_TICKETS = {
  '58-2140': { stage: 4, items: '3 shirts, 1 suit', rack: 'B-14', total: 34.25 },
  '58-0417': { stage: 3, items: '1 wool overcoat, 2 trousers', total: 41 },
};

const STAINS = [
  { name: 'Wine', color: '#7b1630', do: ['Blot, don’t rub, with a clean white cloth.', 'Rinse from the back with cold water.', 'Bring it in within a day or two.'], dont: ['Salt or white wine “tricks”.', 'Hot water, which sets the tannin.', 'Ironing over it.'], foot: 'Red wine on silk? Don’t touch it at all. Bag it and bring it straight in.' },
  { name: 'Coffee', color: '#6b4426', do: ['Blot the excess right away.', 'Flush with cool water from behind.', 'Tell us if it had milk or sugar in it.'], dont: ['Soap on wool or silk.', 'Hot water or the dryer.', 'Rubbing, which spreads it.'], foot: 'Milky coffee is a protein stain; we treat it differently from black. Mention it at the counter.' },
  { name: 'Grease', color: '#c9a227', do: ['Scrape off anything solid.', 'Dust with cornstarch, wait 15 minutes, brush off.', 'Hang it, don’t fold it.'], dont: ['Water, which pushes oil in deeper.', 'Dish soap on dry-clean-only fabric.', 'The dryer, ever.'], foot: 'Salad dressing, butter, bike chain: all solvent jobs. This is exactly what dry cleaning is for.' },
  { name: 'Ink', color: '#1f3a8a', do: ['Put paper towel underneath.', 'Dab, from the outside in.', 'Note the pen type if you know it.'], dont: ['Hairspray, an old myth that leaves residue.', 'Water on ballpoint.', 'Scrubbing.'], foot: 'Ballpoint, gel and felt-tip each need a different solvent. Tell us which.' },
  { name: 'Makeup', color: '#c46b5a', do: ['Lift powder off with tape.', 'Blot foundation gently.', 'Keep it away from heat.'], dont: ['Makeup wipes on the fabric.', 'Rubbing lipstick, which smears.', 'Deodorant on top of it.'], foot: 'Collar foundation is our most common stain. Shirts come back clean, every time.' },
  { name: 'Blood', color: '#9b111e', do: ['Cold water only, straight away.', 'Blot from the back.', 'Bring it in soon.'], dont: ['Warm or hot water, which cooks it in.', 'Bleach on colors.', 'Ironing.'], foot: 'Fresh is easy, old is harder but usually still possible. Don’t give up on it.' },
  { name: 'Wax', color: '#3d6b4f', do: ['Let it harden; freeze it if you can.', 'Lift off the solid wax gently.', 'Leave the rest to us.'], dont: ['The iron-and-paper trick on silk.', 'Picking at it with a knife.', 'Washing first.'], foot: 'Colored candle wax leaves dye behind. We take out both.' },
];

const FAQ = [
  { q: 'What happens if you damage something?', a: 'It’s rare, but we own it. We’ll repair it, or pay up to ten times the cleaning price, following the fair claims guide used across the trade. Tell us within 30 days.' },
  { q: 'Do I need my pink ticket to collect?', a: 'It helps, but no. Give us your name and phone number at the counter and we’ll find your order.' },
  { q: 'How long do you keep unclaimed clothes?', a: 'Ninety days. We call you twice before then. After that, garments go to a local shelter.' },
  { q: 'Is your cleaning safe for sensitive skin?', a: 'We stopped using perc in 2009. We clean in an odorless silicone-based solvent and use fragrance-free detergent for wash & fold unless you ask for something else.' },
  { q: 'Can you clean a wedding gown that’s years old?', a: 'Usually, yes. Yellowing and old stains are often reversible. Bring it in for a free look and we’ll give you an honest estimate before we start.' },
  { q: 'Do you take hangers back?', a: 'Please do bring them. Wire hangers and poly bags go back into use or into recycling, and we give you 5 cents off per hanger.' },
];


// =============================================================================
// App — you shouldn't need to edit below to change content.
// =============================================================================

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STORE_KEY = 'fennick.pickups';

const money = (n) => SHOP.currency + n.toFixed(2);
const mins = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const nowMins = (d) => d.getHours() * 60 + d.getMinutes();
const at = (date, hhmm) => { const d = new Date(date); d.setHours(0, 0, 0, 0); d.setMinutes(mins(hhmm)); return d; };
const addDays = (date, n) => { const d = new Date(date); d.setDate(d.getDate() + n); return d; };
const sameDay = (a, b) => a.toDateString() === b.toDateString();
function clock(d, { html = false } = {}) {
  let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const t = `${h}:${String(m).padStart(2, '0')}`;
  return html ? `${t}<small>${ap}</small>` : `${t} ${ap}`;
}
const clockOf = (hhmm, opts) => clock(at(new Date(), hhmm), opts);
const shortDate = (d) => `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
function relDay(d, from = new Date()) {
  if (sameDay(d, from)) return 'today';
  if (sameDay(d, addDays(from, 1))) return 'tomorrow';
  return DAYS[d.getDay()];
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// The next open day on or after `date` (inclusive), as a Date at midnight.
function nextOpenDay(date) {
  for (let i = 0; i < 14; i++) {
    const d = addDays(date, i); d.setHours(0, 0, 0, 0);
    if (HOURS[d.getDay()]) return d;
  }
  return null;
}
// n working days after `date`.
function addOpenDays(date, n) {
  let d = new Date(date);
  while (n > 0) { d = nextOpenDay(addDays(d, 1)); n--; }
  return d;
}
function isOpenAt(d) {
  const h = HOURS[d.getDay()];
  return !!h && nowMins(d) >= mins(h.open) && nowMins(d) < mins(h.close);
}
// When a garment dropped off at the counter right now (or at next opening) would be handed in.
function dropMoment(now = new Date()) {
  if (isOpenAt(now)) return now;
  const h = HOURS[now.getDay()];
  if (h && nowMins(now) < mins(h.open)) return at(now, h.open);
  const d = nextOpenDay(addDays(now, 1));
  return at(d, HOURS[d.getDay()].open);
}
// Ready time for a garment needing `days` working days, dropped at `drop`.
function readyFor(drop, days, rush = false) {
  const h = HOURS[drop.getDay()];
  if (days === 0) {
    if (rush && nowMins(drop) <= mins(RUSH.lastIn)) {
      const r = new Date(drop.getTime() + RUSH.hours * 3600e3);
      const close = at(drop, h.close);
      return r < close ? r : close;
    }
    if (nowMins(drop) <= mins(h.cutoff)) return at(drop, h.ready);
    const next = addOpenDays(drop, 1);
    return at(next, HOURS[next.getDay()].ready);
  }
  const d = addOpenDays(drop, days);
  return at(d, HOURS[d.getDay()].ready);
}
const rushAvailable = (drop) => nowMins(drop) <= mins(RUSH.lastIn);

// ---------- static content ----------
function fillShop() {
  $$('[data-shop-name]').forEach((el) => { el.textContent = SHOP.name; });
  $$('[data-shop-short]').forEach((el) => { el.textContent = SHOP.short; });
  $$('[data-shop-trade]').forEach((el) => { el.textContent = SHOP.trade; });
  $$('[data-shop-est]').forEach((el) => { el.textContent = SHOP.est; });
  $$('[data-address-short]').forEach((el) => { el.textContent = SHOP.street; });
  $$('[data-phone-link]').forEach((el) => { el.textContent = SHOP.phone; el.href = 'tel:' + SHOP.phone.replace(/[^\d+]/g, ''); });
  $$('[data-email-link]').forEach((el) => { el.textContent = SHOP.email; el.href = 'mailto:' + SHOP.email; });
  const words = SHOP.street.split(' ');
  const last = words.pop();
  $('[data-address-big]').innerHTML = `<span>${esc(words.join(' '))}</span><span>${esc(last)}.</span>`;
  $('[data-address-lines]').innerHTML = `${esc(SHOP.street)}<br>${esc(SHOP.city)}`;
  $('[data-parking]').textContent = SHOP.parking;
  $('[data-directions]').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${SHOP.street}, ${SHOP.city}`);
  $('[data-price-fine]').textContent = PRICE_FINE;
  $('[data-rush-label]').textContent = `+${RUSH.percent}% · back in ${RUSH.hours} hours if in by ${clockOf(RUSH.lastIn)}`;
  $('[data-delivery-blurb]').textContent = `Free pickup and delivery on orders over ${SHOP.currency}${DELIVERY.freeOver}, ${money(DELIVERY.fee)} under. Leave the bag with your doorman or on the stoop; it comes back pressed and hanging.`;
  document.title = `${SHOP.name} — Clean by five`;
}

// ---------- live status: strip + hero ticket ----------
function renderStatus() {
  const now = new Date();
  const open = isOpenAt(now);
  const today = HOURS[now.getDay()];
  const dot = $('[data-open-dot]');
  dot.className = 'dot ' + (open ? 'is-open' : 'is-closed');
  const drop = dropMoment(now);
  const dh = HOURS[drop.getDay()];
  $('[data-open-line]').textContent = open
    ? `Open now · closes ${clockOf(today.close)}`
    : `Closed · opens ${relDay(drop, now) === 'today' ? '' : relDay(drop, now) + ' '}${clock(drop)}`;
  $('[data-cutoff-line]').textContent = `Same-day if in by ${clockOf(dh.cutoff)} · Free pickup over ${SHOP.currency}${DELIVERY.freeOver}`;
  $('[data-hero-cutoff]').textContent = clockOf(dh.cutoff).replace(' AM', ' a.m.').replace(' PM', ' p.m.');
  $('[data-hero-ready]').textContent = clockOf(dh.ready).replace(' AM', ' a.m.').replace(' PM', ' p.m.');

  const ready = readyFor(drop, 0);
  const beforeCut = nowMins(drop) <= mins(dh.cutoff);
  $('[data-today-label]').textContent = sameDay(drop, now) ? `Today · ${shortDate(now)}` : `${relDay(drop, now)} · ${shortDate(drop)}`;
  if (beforeCut) {
    $('[data-drop-label]').textContent = 'Drop by';
    $('[data-drop-time]').innerHTML = clock(at(drop, dh.cutoff), { html: true });
  } else {
    $('[data-drop-label]').textContent = 'Drop now';
    $('[data-drop-time]').innerHTML = clock(drop, { html: true });
  }
  $$('[data-ready-time]').forEach((el) => { el.innerHTML = clock(ready, { html: true }); });
  $('[data-ready-time]').previousElementSibling.textContent = sameDay(ready, drop) ? 'Ready' : `Ready ${DAYS[ready.getDay()].slice(0, 3)}`;
  const fine = $('[data-ticket-fine]');
  if (!open) fine.textContent = `We’re closed right now. The counter opens ${relDay(drop, now)} at ${clock(drop)}.`;
  else if (beforeCut) fine.textContent = `Shirts, suits and dresses back the same day. Rush until ${clockOf(RUSH.lastIn)}.`;
  else if (rushAvailable(drop)) fine.textContent = `Past the same-day cut-off, but rush gets it back in ${RUSH.hours} hours.`;
  else fine.textContent = `In tonight, on the rack tomorrow at ${clockOf(HOURS[ready.getDay()].ready)}.`;
  const stamp = $('[data-hero-stamp]');
  const word = open ? 'Open' : 'Closed';
  if (stamp.textContent !== word || !stamp.dataset.done) {
    stamp.textContent = word; stamp.dataset.done = '1';
    stamp.classList.remove('thunk'); void stamp.offsetWidth; stamp.classList.add('thunk');
  }
  // Ticket number: changes daily, looks like a real stub.
  const start = new Date(now.getFullYear(), 0, 0);
  const doy = Math.floor((now - start) / 864e5);
  $('[data-ticket-no]').textContent = `Nº ${SHOP.ticketPrefix}-${String((doy * 37 + 1400) % 10000).padStart(4, '0')}`;
}

// ---------- services ledger ----------
function renderServices() {
  $('[data-services]').innerHTML = SERVICES.map((s, i) => `
    <li class="svc reveal">
      <span class="svc-no">${String(i + 1).padStart(2, '0')}</span>
      <h3 class="svc-name">${esc(s.name)}</h3>
      <p class="svc-price">from <strong>${SHOP.currency}${s.from % 1 ? s.from.toFixed(2) : s.from}${s.unit ? `<small>${esc(s.unit)}</small>` : ''}</strong></p>
      <p class="svc-desc">${esc(s.desc)}</p>
      <p class="svc-turn">${esc(s.turn)}</p>
    </li>`).join('');
}

// ---------- prices + receipt ----------
const cart = new Map();   // "cat:idx" -> qty
let activeCat = 0;
let rush = false;
const itemAt = (key) => { const [c, i] = key.split(':').map(Number); return PRICES[c].items[i]; };

function renderTabs() {
  $('[data-price-tabs]').innerHTML = PRICES.map((c, i) => {
    const n = [...cart.keys()].filter((k) => k.startsWith(i + ':')).length;
    return `<button class="tab" role="tab" type="button" id="tab-${i}" aria-selected="${i === activeCat}" aria-controls="price-panel" tabindex="${i === activeCat ? 0 : -1}" data-cat="${i}">${esc(c.category)}${n ? ` · ${n}` : ''}</button>`;
  }).join('');
}
function renderPriceList() {
  const list = $('[data-price-list]');
  list.id = 'price-panel';
  list.setAttribute('aria-labelledby', 'tab-' + activeCat);
  list.innerHTML = PRICES[activeCat].items.map((it, i) => {
    const key = `${activeCat}:${i}`;
    const q = cart.get(key) || 0;
    const unit = it.unit ? `/${it.unit}` : '';
    return `<li class="item${q ? ' has-qty' : ''}">
      <span class="item-name"><span>${esc(it.name)}</span>${it.note ? `<small>${esc(it.note)}</small>` : ''}</span>
      <span class="item-price">${money(it.price)}${unit}</span>
      <span class="qty" role="group" aria-label="${esc(it.name)} quantity">
        <button type="button" data-dec="${key}" aria-label="Remove one ${esc(it.name)}" ${q ? '' : 'disabled'}>−</button>
        <output aria-live="polite">${q}${it.unit && q ? esc(it.unit) : ''}</output>
        <button type="button" data-inc="${key}" aria-label="Add one ${esc(it.name)}">+</button>
      </span>
    </li>`;
  }).join('');
}
function receiptTotals() {
  let sub = 0, sameDaySub = 0, maxDays = 0;
  for (const [key, q] of cart) {
    const it = itemAt(key);
    sub += it.price * q;
    if (it.days === 0) sameDaySub += it.price * q;
    maxDays = Math.max(maxDays, it.days);
  }
  const drop = dropMoment();
  const canRush = rush && rushAvailable(drop) && sameDaySub > 0;
  const rushAmt = canRush ? Math.round(sameDaySub * RUSH.percent) / 100 : 0;
  // Same-day items ready (rush or not); longer items set the overall date.
  const sameReady = readyFor(drop, 0, canRush);
  const longReady = maxDays ? readyFor(drop, maxDays) : null;
  const ready = longReady && longReady > sameReady ? longReady : sameReady;
  return { sub, rushAmt, total: sub + rushAmt, ready, count: [...cart].reduce((a, [key, q]) => a + (itemAt(key).unit ? 1 : q), 0), canRush };
}
function renderReceipt() {
  const lines = $('[data-receipt-lines]');
  const prev = new Set($$('li', lines).map((li) => li.dataset.key));
  lines.innerHTML = [...cart].map(([key, q]) => {
    const it = itemAt(key);
    const qty = it.unit ? `${q}${it.unit}` : `${q}×`;
    return `<li data-key="${key}" style="${prev.has(key) ? 'animation:none' : ''}"><span>${qty}</span><span>${esc(it.name)}</span><span>${money(it.price * q)}</span></li>`;
  }).join('');
  const t = receiptTotals();
  const empty = cart.size === 0;
  $('[data-receipt-empty]').hidden = !empty;
  $('[data-subtotal]').textContent = money(t.sub);
  $('[data-rush-row]').hidden = !t.rushAmt;
  $('[data-rush-amt]').textContent = money(t.rushAmt);
  $('[data-total]').textContent = money(t.total);
  const drop = dropMoment();
  const rushBox = $('[data-rush]');
  rushBox.disabled = !rushAvailable(drop);
  $('[data-rush-label]').textContent = rushAvailable(drop)
    ? `+${RUSH.percent}% on same-day items · back in ${RUSH.hours} hours`
    : `available until ${clockOf(RUSH.lastIn)} each day`;
  $('[data-receipt-ready]').textContent = empty ? '—' : `${relDay(t.ready)} ${clock(t.ready)}`.replace(/^./, (c) => c.toUpperCase());
  $('[data-receipt-book]').disabled = empty;
  $('[data-receipt-clear]').disabled = empty;
  $('[data-receipt-date]').textContent = shortDate(new Date());
}
function changeQty(key, delta) {
  const it = itemAt(key);
  const step = it.step || 1;
  let q = (cart.get(key) || 0);
  if (delta > 0) q = q ? q + step : (it.min || step);
  else q = q - step < (it.min || 1) ? 0 : q - step;
  if (q) cart.set(key, q); else cart.delete(key);
  renderTabs(); renderPriceList(); renderReceipt(); renderAttached();
}
function bindPrices() {
  $('[data-price-tabs]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    activeCat = +b.dataset.cat; renderTabs(); renderPriceList();
    $(`[data-cat="${activeCat}"]`).focus();
  });
  $('[data-price-tabs]').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    activeCat = (activeCat + (e.key === 'ArrowRight' ? 1 : -1) + PRICES.length) % PRICES.length;
    renderTabs(); renderPriceList(); $(`[data-cat="${activeCat}"]`).focus();
  });
  $('[data-price-list]').addEventListener('click', (e) => {
    const inc = e.target.closest('[data-inc]'); const dec = e.target.closest('[data-dec]');
    if (inc) { changeQty(inc.dataset.inc, 1); $(`[data-inc="${inc.dataset.inc}"]`).focus(); }
    if (dec) { const k = dec.dataset.dec; changeQty(k, -1); const again = $(`[data-dec="${k}"]`); (again && !again.disabled ? again : $(`[data-inc="${k}"]`)).focus(); }
  });
  $('[data-rush]').addEventListener('change', (e) => { rush = e.target.checked; renderReceipt(); renderAttached(); });
  $('[data-receipt-clear]').addEventListener('click', () => { cart.clear(); renderTabs(); renderPriceList(); renderReceipt(); renderAttached(); });
  $('[data-receipt-book]').addEventListener('click', () => {
    attachReceipt = true; renderAttached();
    $('#pickup').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}

// ---------- tracker ----------
function loadPickups() { try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; } }
function savePickups(list) { try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch { /* private mode: keep going */ } }
function normTicket(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 4) return `${SHOP.ticketPrefix}-${digits}`;
  if (digits.length === 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return null;
}
function lookupTicket(no) {
  const booked = loadPickups().find((p) => p.ticket === no);
  if (booked) return { booked };
  if (!no.startsWith(SHOP.ticketPrefix + '-')) return null;
  if (DEMO_TICKETS[no]) return { ...DEMO_TICKETS[no] };
  const n = +no.slice(-4);
  const pool = ['2 shirts', '1 dress', '1 suit', '4 shirts, 1 tie', '2 trousers', '1 duvet', '1 blazer, 1 skirt', '1 sweater, 3 shirts'];
  const stage = (n * 7 + 3) % 5;
  return { stage, items: pool[n % pool.length], rack: stage === 4 ? `${'ABCD'[n % 4]}-${(n % 30) + 1}` : null, total: 8 + (n % 9) * 4.25 };
}
function renderStations() {
  const ghost = '<svg class="ghost" viewBox="0 0 80 60" aria-hidden="true"><path d="M40 4a7 7 0 1 1 7 7c-3 0-7 2-7 5v6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M40 22 6 46h68Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>';
  $('[data-stations]').innerHTML = STATIONS.map((s, i) => `
    <li class="station" data-station="${i}">${ghost}
      <p class="st-no">${String(i + 1).padStart(2, '0')}</p>
      <h3 class="st-name">${esc(s.name)}</h3>
      <p class="st-desc">${esc(s.desc)}</p>
    </li>`).join('');
}
let trackedStage = null;
function placeTag() {
  const tag = $('[data-rail-tag]');
  if (trackedStage === null) { tag.classList.remove('on'); return; }
  const rail = $('[data-rail]').getBoundingClientRect();
  const st = $(`[data-station="${Math.max(0, trackedStage)}"]`).getBoundingClientRect();
  const vertical = matchMedia('(max-width: 860px)').matches;
  tag.style.transform = vertical
    ? `translate(0, ${st.top - rail.top + (trackedStage < 0 ? -40 : 0)}px)`
    : `translate(${st.left - rail.left + (trackedStage < 0 ? -40 : 4)}px, 0)`;
  tag.classList.add('on');
}
function showTicket(raw) {
  const hint = $('[data-track-hint]');
  const out = $('[data-track-result]');
  const no = normTicket(raw);
  hint.classList.remove('is-err');
  if (!no) {
    hint.classList.add('is-err');
    hint.textContent = `That doesn’t look like a ticket number. It’s six digits, like ${SHOP.ticketPrefix}-2140.`;
    return;
  }
  const r = lookupTicket(no);
  $('[data-track-input]').value = no;
  if (!r) {
    hint.classList.add('is-err');
    hint.textContent = `We can’t find ${no}. Fennick tickets start with ${SHOP.ticketPrefix}. Call us at ${SHOP.phone} and we’ll look it up.`;
    trackedStage = null; placeTag();
    $$('.station').forEach((el) => el.classList.remove('is-done', 'is-here'));
    out.innerHTML = '<p class="tr-empty">No ticket on the line with that number.</p>';
    return;
  }
  hint.textContent = '';
  const tag = $('[data-rail-tag]');
  $('[data-rail-tag-no]').textContent = no;
  tag.classList.remove('swinging'); void tag.offsetWidth; tag.classList.add('swinging');
  if (r.booked) {
    const p = r.booked;
    trackedStage = -1;
    out.innerHTML = `<div><p class="tr-status">Pickup <em>booked</em></p>
      <p class="tr-sub">Our driver comes ${esc(p.dayLabel)}, ${esc(p.window)}. Once your bag reaches the counter it gets tagged and joins the line.</p></div>
      <dl class="tr-facts"><div><dt>Ticket</dt><dd>${esc(no)}</dd></div><div><dt>Address</dt><dd>${esc(p.address)}</dd></div><div><dt>Bags</dt><dd>${esc(p.bags)}</dd></div></dl>`;
  } else {
    trackedStage = r.stage;
    const drop = dropMoment();
    const done = r.stage === 4;
    const eta = done ? null : readyFor(drop, 0);
    out.innerHTML = `<div><p class="tr-status">${done ? 'Ready on the <em>rack</em>' : `Now: <em>${esc(STATIONS[r.stage].name.toLowerCase())}</em>`}</p>
      <p class="tr-sub">${done ? `${isOpenAt(new Date()) ? `Come by any time before ${clockOf(HOURS[new Date().getDay()].close)}` : `Collect it from ${relDay(dropMoment())} at ${clock(dropMoment())}`}. Bring the stub, or just your name.` : `${STATIONS[r.stage].desc} Expected on the rack ${relDay(eta)} at ${clock(eta)}.`}</p></div>
      <dl class="tr-facts"><div><dt>Ticket</dt><dd>${esc(no)}</dd></div><div><dt>Items</dt><dd>${esc(r.items)}</dd></div>${r.rack ? `<div><dt>Rack</dt><dd>${esc(r.rack)}</dd></div>` : ''}<div><dt>Due at pickup</dt><dd>${money(r.total)}</dd></div></dl>`;
    if (done) $('div', out).insertAdjacentHTML('beforeend', '<div class="stamp thunk" aria-hidden="true">Ready</div>');
  }
  $$('.station').forEach((el, i) => {
    el.classList.toggle('is-done', i < trackedStage || (trackedStage === 4 && i === 4));
    el.classList.toggle('is-here', i === trackedStage);
  });
  placeTag();
}
function bindTracker() {
  $('[data-track-form]').addEventListener('submit', (e) => { e.preventDefault(); showTicket($('[data-track-input]').value); });
  $('[data-track-hint]').addEventListener('click', (e) => { const b = e.target.closest('[data-try]'); if (b) showTicket(b.dataset.try); });
  addEventListener('resize', placeTag);
}

// ---------- pickup ----------
let pickDay = null, pickWin = null, attachReceipt = false;
function pickupDays() {
  const out = []; const now = new Date();
  for (let i = 0; out.length < DELIVERY.daysAhead && i < 21; i++) {
    const d = addDays(now, i); d.setHours(0, 0, 0, 0);
    if (!HOURS[d.getDay()]) continue;
    if (i === 0 && !windowsFor(d).some((w) => !w.disabled)) continue;
    out.push(d);
  }
  return out;
}
function windowsFor(day) {
  const now = new Date(); const h = HOURS[day.getDay()];
  return DELIVERY.windows.map((w) => {
    const start = at(day, w.start);
    const disabled = (w.notOn || []).includes(day.getDay()) || mins(w.start) >= mins(h.close) || start.getTime() - now.getTime() < 60 * 60e3;
    return { ...w, disabled };
  });
}
function renderDays() {
  const days = pickupDays();
  if (!pickDay || !days.some((d) => sameDay(d, pickDay))) pickDay = days[0];
  $('[data-days]').innerHTML = days.map((d, i) => `
    <button type="button" class="day" role="radio" aria-checked="${sameDay(d, pickDay)}" tabindex="${sameDay(d, pickDay) ? 0 : -1}" data-day="${i}">
      <small>${i === 0 && sameDay(d, new Date()) ? 'Today' : DAYS[d.getDay()].slice(0, 3)}</small><strong>${d.getDate()}</strong><small>${MONTHS[d.getMonth()]}</small>
    </button>`).join('');
  renderWindows();
}
function renderWindows() {
  const wins = windowsFor(pickDay);
  if (!pickWin || wins.find((w) => w.id === pickWin)?.disabled) pickWin = (wins.find((w) => !w.disabled) || {}).id || null;
  $('[data-windows]').innerHTML = wins.map((w) => `
    <button type="button" class="win" role="radio" aria-checked="${w.id === pickWin}" tabindex="${w.id === pickWin ? 0 : -1}" data-win="${w.id}" ${w.disabled ? 'disabled' : ''}>
      <small>${esc(w.label)}</small><strong>${esc(w.range)}</strong>
    </button>`).join('');
}
function zipStatus(zip) {
  if (!/^\d{5}$/.test(zip)) return null;
  return DELIVERY.zips.includes(zip);
}
function renderZipQuick() {
  const v = $('[data-zip-quick]').value.trim();
  const out = $('[data-zip-quick-out]');
  const s = zipStatus(v);
  out.className = 'zip-out' + (s === true ? ' ok' : s === false ? ' no' : '');
  out.textContent = s === null ? (v ? 'Five digits, please.' : `We cover ${DELIVERY.zips.length} ZIP codes around the shop.`)
    : s ? 'We pick up on your block.' : `Not yet, sorry. We cover ${DELIVERY.zips.join(', ')}.`;
}
function renderAttached() {
  const box = $('[data-attached]');
  if (!attachReceipt || !cart.size) { box.hidden = true; return; }
  const t = receiptTotals();
  box.hidden = false;
  box.innerHTML = `<span>Attached: ${t.count} item${t.count === 1 ? '' : 's'} · est. ${money(t.total)}${t.canRush ? ' · rush' : ''}</span><button type="button" class="btn-link" data-detach>Remove</button>`;
}
function renderUpcoming() {
  const now = Date.now();
  const list = loadPickups().filter((p) => p.when > now - 2 * 3600e3).sort((a, b) => a.when - b.when);
  const box = $('[data-upcoming]');
  if (!list.length) { box.hidden = true; return; }
  const p = list[0];
  box.hidden = false;
  box.innerHTML = `<span>Your next pickup · Nº ${esc(p.ticket)}</span><strong>${esc(p.dayLabel)}, ${esc(p.window)}</strong>
    <span>${esc(p.address)}</span>
    <div class="row"><button type="button" class="btn-link" data-track-this="${esc(p.ticket)}">Track it</button><button type="button" class="btn-link" data-cancel="${esc(p.ticket)}">Cancel pickup</button></div>`;
}
function icsFor(p) {
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const start = new Date(p.when); const end = new Date(p.when + 2 * 3600e3);
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fennick//Pickup//EN', 'BEGIN:VEVENT',
    `UID:${p.ticket}@fennick`, `DTSTAMP:${fmt(new Date())}`, `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
    `SUMMARY:${SHOP.short} pickup — bag out by ${clock(start)}`,
    `DESCRIPTION:Ticket ${p.ticket}. ${p.bags} bag(s). Questions? ${SHOP.phone}`,
    `LOCATION:${p.address}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
}
function showBooked(p) {
  const form = $('[data-pickup-form]');
  const box = $('[data-booked]');
  form.hidden = true;
  box.hidden = false;
  box.innerHTML = `
    <article class="ticket">
      <div class="ticket-hole" aria-hidden="true"></div>
      <header class="ticket-head"><span>Pickup ticket</span><span>Nº ${esc(p.ticket)}</span></header>
      <p class="ticket-date">${esc(p.dayLabel)}</p>
      <dl class="ticket-rows">
        <div><dt>Window</dt><dd>${esc(p.window)}</dd></div>
        <div><dt>Bags</dt><dd>${esc(p.bags)}</dd></div>
      </dl>
      <p class="ticket-fine">${esc(p.name)} · ${esc(p.address)}, ${esc(p.zip)}${p.order ? `<br>With: ${esc(p.order)}` : ''}${p.notes ? `<br>Note: ${esc(p.notes)}` : ''}</p>
      <div class="stamp thunk" aria-hidden="true">Booked</div>
      <div class="ticket-stub"><span>Bag out by ${esc(p.window.split('–')[0])}</span><span>${esc(SHOP.phone)}</span></div>
    </article>
    <div class="booked-actions">
      <button type="button" class="btn-ink" data-ics>Add to calendar</button>
      <button type="button" class="btn-link" data-track-this="${esc(p.ticket)}">Track this ticket</button>
      <button type="button" class="btn-link" data-another>Book another</button>
    </div>`;
  box.focus();
  $('[data-ics]', box).addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([icsFor(p)], { type: 'text/calendar' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `fennick-pickup-${p.ticket}.ics` });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('[data-another]', box).addEventListener('click', () => {
    box.hidden = true; form.hidden = false; form.reset(); attachReceipt = false;
    renderAttached(); renderDays(); $('[data-form-err]').textContent = '';
    form.querySelector('[name="name"]').focus();
  });
}
function bindPickup() {
  const form = $('[data-pickup-form]');
  $('[data-days]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-day]'); if (!b) return;
    pickDay = pickupDays()[+b.dataset.day]; renderDays(); $(`[data-day="${b.dataset.day}"]`).focus();
  });
  $('[data-windows]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-win]'); if (!b || b.disabled) return;
    pickWin = b.dataset.win; renderWindows(); $(`[data-win="${pickWin}"]`).focus();
  });
  // Arrow keys move within each radio group.
  for (const [sel, attr] of [['[data-days]', 'day'], ['[data-windows]', 'win']]) {
    $(sel).addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      e.preventDefault();
      const btns = $$(`[data-${attr}]:not(:disabled)`, $(sel));
      const i = btns.indexOf(document.activeElement);
      const next = btns[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length];
      next.click();
    });
  }
  $('[data-zip-quick]').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
    renderZipQuick();
    if (zipStatus(e.target.value)) form.zip.value = e.target.value;
  });
  form.zip.addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });
  $('[data-attached]').addEventListener('click', (e) => { if (e.target.closest('[data-detach]')) { attachReceipt = false; renderAttached(); } });
  form.addEventListener('input', (e) => { if (e.target.matches('input')) e.target.removeAttribute('aria-invalid'); });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('[data-form-err]');
    const f = Object.fromEntries(new FormData(form));
    const bad = [];
    const mark = (name, ok) => { form[name].setAttribute('aria-invalid', ok ? 'false' : 'true'); if (!ok) bad.push(name); };
    mark('name', f.name.trim().length > 1);
    mark('phone', f.phone.replace(/\D/g, '').length >= 7);
    mark('address', f.address.trim().length > 4);
    const zs = zipStatus(f.zip.trim());
    mark('zip', zs === true);
    if (!pickDay || !pickWin) { err.textContent = 'Pick a day and a window that still has room.'; return; }
    if (bad.length) {
      err.textContent = zs === false ? `We don’t deliver to ${f.zip} yet. Covered: ${DELIVERY.zips.join(', ')}.` : 'A few fields need a look: ' + bad.join(', ') + '.';
      form[bad[0]].focus();
      return;
    }
    err.textContent = '';
    const win = DELIVERY.windows.find((w) => w.id === pickWin);
    const when = at(pickDay, win.start).getTime();
    const existing = new Set(loadPickups().map((p) => p.ticket));
    let ticket;
    do { ticket = `${SHOP.ticketPrefix}-${String(Math.floor(1000 + Math.random() * 9000))}`; } while (existing.has(ticket) || DEMO_TICKETS[ticket]);
    const t = attachReceipt && cart.size ? receiptTotals() : null;
    const p = {
      ticket, when, window: win.range,
      dayLabel: `${DAYS[pickDay.getDay()]} ${pickDay.getDate()} ${MONTHS[pickDay.getMonth()]}`,
      name: f.name.trim(), phone: f.phone.trim(), address: f.address.trim(), zip: f.zip.trim(), bags: f.bags, notes: f.notes.trim(),
      order: t ? `${t.count} item${t.count === 1 ? '' : 's'}, est. ${money(t.total)}${t.sub < DELIVERY.freeOver ? ` + ${money(DELIVERY.fee)} delivery` : ''}` : '',
    };
    savePickups([...loadPickups(), p]);
    showBooked(p);
    renderUpcoming();
  });

  // Track / cancel links live in two places.
  document.addEventListener('click', (e) => {
    const tr = e.target.closest('[data-track-this]');
    if (tr) { showTicket(tr.dataset.trackThis); $('#track').scrollIntoView({ behavior: 'smooth' }); }
    const c = e.target.closest('[data-cancel]');
    if (c) { savePickups(loadPickups().filter((p) => p.ticket !== c.dataset.cancel)); renderUpcoming(); }
  });
}

// ---------- stains ----------
let activeStain = 0;
function renderStains() {
  $('[data-stain-words]').innerHTML = STAINS.map((s, i) => `
    <button type="button" class="sw" role="tab" id="stain-${i}" aria-selected="${i === activeStain}" aria-controls="stain-card" tabindex="${i === activeStain ? 0 : -1}" data-stain="${i}" data-n="${String(i + 1).padStart(2, '0')}">
      <i class="blot" style="background:${s.color}" aria-hidden="true"></i>${esc(s.name)}
    </button>`).join('');
  const s = STAINS[activeStain];
  const card = $('[data-stain-card]');
  card.id = 'stain-card';
  card.setAttribute('aria-labelledby', 'stain-' + activeStain);
  card.innerHTML = `
    <p class="sc-kicker"><span>First ten minutes</span><span>${String(activeStain + 1).padStart(2, '0')} / ${String(STAINS.length).padStart(2, '0')}</span></p>
    <h3 class="sc-title">${esc(s.name)}</h3>
    <div class="sc-cols">
      <div class="sc-do"><h3>Do</h3><ul>${s.do.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="sc-dont"><h3>Don’t</h3><ul>${s.dont.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
    </div>
    <p class="sc-foot">${esc(s.foot)}</p>`;
}
function bindStains() {
  const wrap = $('[data-stain-words]');
  wrap.addEventListener('click', (e) => { const b = e.target.closest('[data-stain]'); if (!b) return; activeStain = +b.dataset.stain; renderStains(); $(`[data-stain="${activeStain}"]`).focus(); });
  wrap.addEventListener('keydown', (e) => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft'].includes(e.key)) return;
    e.preventDefault();
    activeStain = (activeStain + (e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : -1) + STAINS.length) % STAINS.length;
    renderStains(); $(`[data-stain="${activeStain}"]`).focus();
  });
}

// ---------- hours + faq ----------
function renderHours() {
  const today = new Date().getDay();
  const order = [1, 2, 3, 4, 5, 6, 0];
  $('[data-hours]').innerHTML = `<caption class="sr">Opening hours</caption>` + order.map((d) => {
    const h = HOURS[d];
    return `<tr class="${d === today ? 'today' : ''}"><th scope="row"><span>${DAYS[d]}</span></th><td>${h ? `${clockOf(h.open)} – ${clockOf(h.close)}` : 'Closed'}</td></tr>`;
  }).join('');
  const weekday = HOURS[1];
  $('[data-hours-fine]').textContent = `Same-day: in by ${clockOf(weekday.cutoff)}, ready at ${clockOf(weekday.ready)} (Saturdays ${clockOf(HOURS[6].ready)}). ${HOLIDAY_NOTE}`;
}
function renderFaq() {
  $('[data-faq]').innerHTML = FAQ.map((f, i) => `
    <div class="qa">
      <h3 style="margin:0"><button type="button" aria-expanded="false" aria-controls="qa-${i}" id="qa-b-${i}">${esc(f.q)}<i aria-hidden="true"></i></button></h3>
      <div class="qa-a" id="qa-${i}" role="region" aria-labelledby="qa-b-${i}"><div><p>${esc(f.a)}</p></div></div>
    </div>`).join('');
  $('[data-faq]').addEventListener('click', (e) => {
    const b = e.target.closest('button[aria-expanded]'); if (!b) return;
    const open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', String(open));
    b.closest('.qa').classList.toggle('open', open);
  });
}

// ---------- layout helpers ----------
// Fit the giant headings exactly to the width they sit in.
function fit() {
  const h = $('[data-fit]');
  const avail = h.parentElement.clientWidth - parseFloat(getComputedStyle(h.parentElement).paddingLeft) * 2;
  const spans = $$(':scope > span', h);
  const oneLine = !matchMedia('(max-width: 860px)').matches;
  h.style.fontSize = '100px';
  const range = document.createRange();
  range.selectNodeContents(h);
  const w = oneLine ? range.getBoundingClientRect().width : Math.max(...spans.map((s) => { range.selectNodeContents(s); return range.getBoundingClientRect().width; }));
  h.style.fontSize = Math.floor(100 * avail / w * 0.995) + 'px';
  const foot = $('[data-fit-foot]');
  foot.style.fontSize = '100px';
  range.selectNodeContents(foot);
  const footAvail = foot.parentElement.clientWidth - parseFloat(getComputedStyle(foot.parentElement).paddingLeft) * 2;
  foot.style.fontSize = Math.floor(100 * footAvail / range.getBoundingClientRect().width * 0.99) + 'px';
  placeHeroTicket();
}
function placeHeroTicket() {
  const t = $('.hero-ticket');
  if (matchMedia('(max-width: 860px)').matches) { t.style.top = ''; return; }
  const photo = $('.hero-photo');
  t.style.top = (photo.offsetTop + 34) + 'px';
}
function bindMenu() {
  const btn = $('[data-menu-toggle]'); const menu = $('[data-menu]');
  const set = (open) => { btn.setAttribute('aria-expanded', String(open)); menu.hidden = !open; };
  btn.addEventListener('click', () => set(menu.hidden));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { set(false); btn.focus(); } });
  addEventListener('resize', () => { if (!matchMedia('(max-width: 860px)').matches) set(false); });
}
function bindReveal() {
  const els = $$('.reveal');
  if (!('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('in')); return; }
  const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => io.observe(el));
}

// ---------- boot ----------
fillShop();
renderStatus();
renderServices();
renderTabs(); renderPriceList(); renderReceipt(); bindPrices();
renderStations(); bindTracker();
renderDays(); renderZipQuick(); renderUpcoming(); bindPickup();
renderStains(); bindStains();
renderHours(); renderFaq();
bindMenu(); bindReveal();
fit();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
addEventListener('resize', fit);
addEventListener('load', fit);
// Keep the clock-driven bits honest if the page stays open.
setInterval(() => { renderStatus(); renderReceipt(); }, 60e3);
