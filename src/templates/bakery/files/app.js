// ============================================================
//  BAKERY CONTENT — edit everything here
// ============================================================

const BAKERY = {
  name: 'Small Hours Bakery',
  street: '14 Kiln Lane',
  area: 'Harbour Quarter',
  city: 'Portside 4012',
  phone: '(555) 014-0200',
  email: 'hello@smallhours.example',
  mapQuery: '14 Kiln Lane, Portside',
  ovensLit: '02:00',
  preorderCutoff: '20:00', // pre-orders for tomorrow close at this time
  currency: '$',
};

// Opening hours, Sunday first. null = closed all day.
const HOURS = [
  { day: 'Sunday',    open: '08:00', close: '14:00' },
  null, // Monday
  { day: 'Tuesday',   open: '07:00', close: '16:00' },
  { day: 'Wednesday', open: '07:00', close: '16:00' },
  { day: 'Thursday',  open: '07:00', close: '16:00' },
  { day: 'Friday',    open: '07:00', close: '17:00' },
  { day: 'Saturday',  open: '07:30', close: '15:00' },
];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// The oven board. `time` = out of the oven, `bake` = minutes in the oven,
// `lasts` = roughly how long the batch lasts on the counter (minutes).
const BAKES = [
  { time: '04:30', id: 'country',   name: 'Country sourdough',     batch: 48, bake: 45, lasts: 600 },
  { time: '05:10', id: 'croissant', name: 'Butter croissants',     batch: 96, bake: 18, lasts: 330 },
  { time: '05:40', id: 'baguette',  name: 'Baguettes',             batch: 60, bake: 24, lasts: 480 },
  { time: '06:20', id: 'pain',      name: 'Pain au chocolat',      batch: 72, bake: 18, lasts: 300 },
  { time: '07:00', id: 'rye',       name: 'Dark rye & caraway',    batch: 24, bake: 60, lasts: 560 },
  { time: '08:00', id: 'knot',      name: 'Cardamom knots',        batch: 60, bake: 16, lasts: 200 },
  { time: '09:30', id: 'focaccia',  name: 'Potato & rosemary focaccia', batch: 12, bake: 30, lasts: 260 },
  { time: '11:00', id: 'croissant2',name: 'Croissants, second bake', batch: 72, bake: 18, lasts: 240 },
  { time: '12:30', id: 'galette',   name: 'Seasonal fruit galettes', batch: 20, bake: 35, lasts: 210 },
  { time: '14:00', id: 'cookie',    name: 'Brown butter cookies',  batch: 80, bake: 12, lasts: 180 },
];

// The counter. `bake` links an item to a line on the oven board so it can
// show as sold out. Tags: V vegetarian, VG vegan, N contains nuts, R contains rye.
const COUNTER = [
  { id: 'c-country', cat: 'Bread',   name: 'Country sourdough', desc: '36-hour loaf, blistered dark crust, open crumb. 900 g.', price: 9.5,  tags: ['VG'], img: 'images/sourdough.jpg', bake: 'country' },
  { id: 'c-baguette',cat: 'Bread',   name: 'Baguette',          desc: 'Poolish, long cold ferment, shatters when you squeeze it.', price: 4.25, tags: ['VG'], img: 'images/baguette.jpg', bake: 'baguette' },
  { id: 'c-rye',     cat: 'Bread',   name: 'Dark rye & caraway',desc: '100% rye, molasses, caraway. Slice thin, keeps a week.', price: 10,   tags: ['VG', 'R'], img: 'images/rye.jpg', bake: 'rye' },
  { id: 'c-croiss',  cat: 'Pastry',  name: 'Butter croissant',  desc: '27 layers, cultured butter, three-day lamination.', price: 4.5,  tags: ['V'], img: 'images/croissant.jpg', bake: 'croissant' },
  { id: 'c-pain',    cat: 'Pastry',  name: 'Pain au chocolat',  desc: 'Two batons of 70% chocolate in croissant dough.', price: 5,    tags: ['V'], img: 'images/painchoc.jpg', bake: 'pain' },
  { id: 'c-knot',    cat: 'Pastry',  name: 'Cardamom knot',     desc: 'Brioche, freshly ground cardamom, pearl sugar.', price: 4.75, tags: ['V'], img: 'images/bun.jpg', bake: 'knot' },
  { id: 'c-galette', cat: 'Pastry',  name: 'Fruit galette',     desc: 'Whatever the market has: plum, pear, then rhubarb.', price: 6.5,  tags: ['V'], img: '', bake: 'galette' },
  { id: 'c-focaccia',cat: 'Savoury', name: 'Potato focaccia',   desc: 'Waxy potato, rosemary, flaky salt. Sold by the slab.', price: 7,    tags: ['VG'], img: '', bake: 'focaccia' },
  { id: 'c-ham',     cat: 'Savoury', name: 'Ham & gruyère croissant', desc: 'Second-bake croissant, béchamel, mustard.', price: 7.5, tags: [], img: 'images/croissant.jpg', bake: 'croissant2' },
  { id: 'c-cookie',  cat: 'Cake',    name: 'Brown butter cookie', desc: 'Dark chocolate, sea salt, crisp edge, soft middle.', price: 3.5, tags: ['V'], img: 'images/cookie.jpg', bake: 'cookie' },
  { id: 'c-loaf',    cat: 'Cake',    name: 'Hazelnut loaf cake',  desc: 'Brown butter, toasted hazelnut, sliced to order.', price: 5,   tags: ['V', 'N'], img: '' },
];

// From starter to crust: hour marks on the process ruler.
const PROCESS = [
  { h: 0,  step: 'Feed the starter' },
  { h: 6,  step: 'Mix, rest, salt' },
  { h: 9,  step: 'Four folds' },
  { h: 12, step: 'Shape' },
  { h: 13, step: 'Cold retard, 22 h' },
  { h: 35, step: 'Score & bake' },
  { h: 36, step: 'Cool, then cut' },
];

// Celebration cakes. Price is for the smallest size.
const CAKES = [
  { id: 'choc',   name: 'Dark chocolate & malt', price: 48 },
  { id: 'lemon',  name: 'Lemon, olive oil & thyme', price: 44 },
  { id: 'carrot', name: 'Spiced carrot, brown butter frosting', price: 46 },
  { id: 'berry',  name: 'Vanilla sponge, seasonal berries', price: 50 },
];
const CAKE_SIZES = [
  { id: '6',  label: '6" · 8 slices',  mult: 1 },
  { id: '8',  label: '8" · 14 slices', mult: 1.5 },
  { id: '10', label: '10" · 22 slices', mult: 2.2 },
];
const CAKE_NOTICE_DAYS = 3;

// ============================================================
//  App
// ============================================================

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const money = (n) => BAKERY.currency + (Number.isInteger(n) ? n : n.toFixed(2));
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fmt = (min) => String(Math.floor(min / 60) % 24).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem('smallhours:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('smallhours:' + k, JSON.stringify(v)); } catch {} },
};
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const dateKey = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); x.setHours(0, 0, 0, 0); return x; };
const shortDate = (d) => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

/* ---------- open / closed ---------- */
function openState(now = new Date()) {
  const today = HOURS[now.getDay()];
  const m = now.getHours() * 60 + now.getMinutes();
  if (today && m >= toMin(today.open) && m < toMin(today.close)) {
    return { open: true, text: 'Open till ' + today.close };
  }
  if (today && m < toMin(today.open)) return { open: false, text: 'Opens ' + today.open };
  for (let i = 1; i <= 7; i++) {
    const d = addDays(now, i), h = HOURS[d.getDay()];
    if (h) return { open: false, text: 'Opens ' + (i === 1 ? 'tomorrow' : DAY_NAMES[d.getDay()].slice(0, 3)) + ' ' + h.open };
  }
  return { open: false, text: 'Closed' };
}

/* ---------- oven board ---------- */
// Which day the board shows: today if we bake today and the last batch has
// not long gone, otherwise the next baking day (all scheduled).
function boardDay(now = new Date()) {
  const m = now.getHours() * 60 + now.getMinutes();
  const last = BAKES[BAKES.length - 1];
  if (HOURS[now.getDay()] && m < toMin(last.time) + last.lasts) return { date: now, live: true };
  for (let i = 1; i <= 7; i++) {
    const d = addDays(now, i);
    if (HOURS[d.getDay()]) return { date: d, live: false };
  }
  return { date: now, live: false };
}

function bakeStatus(b, m, live) {
  const out = toMin(b.time);
  if (!live) return { key: 'sched', label: 'Scheduled' };
  if (m >= out + b.lasts) return { key: 'gone', label: 'Sold out' };
  if (m >= out) return { key: 'out', label: m - out < 30 ? 'Just out' : 'On the counter' };
  if (m >= out - b.bake) return { key: 'oven', label: 'In the oven' };
  if (m >= out - b.bake - 90) return { key: 'proof', label: 'Proofing' };
  return { key: 'sched', label: 'Scheduled' };
}

let lastBoardSig = '';
function renderBoard() {
  const now = new Date(), m = now.getHours() * 60 + now.getMinutes();
  const { date, live } = boardDay(now);
  const rows = BAKES.map((b) => ({ b, s: bakeStatus(b, m, live) }));
  const sig = rows.map((r) => r.s.key + r.s.label).join('|') + live;
  $('#ovenDate').textContent = (live ? 'Today · ' : 'Next bake · ') + date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  if (sig !== lastBoardSig) {
    lastBoardSig = sig;
    $('#boardRows').innerHTML = rows.map(({ b, s }, i) => `
      <div class="board__row is-${s.key}" role="row" style="--i:${i}">
        <span class="board__time" role="cell">${flap(b.time)}</span>
        <span class="board__name" role="cell">${esc(b.name)}</span>
        <span class="board__batch" role="cell">× ${b.batch}</span>
        <span class="board__status" role="cell"><i></i>${s.label}</span>
      </div>`).join('');
  }

  // hero ticket
  $('#tNow').textContent = fmt(m);
  const next = live ? BAKES.find((b) => toMin(b.time) > m) : BAKES[0];
  if (next) {
    const diff = live ? toMin(next.time) - m : null;
    $('#tNextLabel').textContent = live ? 'Next out' : 'First out ' + (addDays(now, 1).getDay() === date.getDay() ? 'tomorrow' : DAY_NAMES[date.getDay()]);
    $('#tNextTime').textContent = next.time;
    $('#tNextItem').textContent = next.name;
    $('#tCount').textContent = diff !== null ? (diff >= 60 ? Math.floor(diff / 60) + ' h ' + (diff % 60) + ' min' : diff + ' min') : 'Ovens lit ' + BAKERY.ovensLit;
  } else {
    $('#tNextLabel').textContent = 'Last out';
    const last = BAKES[BAKES.length - 1];
    $('#tNextTime').textContent = last.time;
    $('#tNextItem').textContent = last.name;
    $('#tCount').textContent = 'All out today';
  }
  const st = openState(now);
  $('#status').classList.toggle('is-open', st.open);
  $('#status span').textContent = st.text;
  renderSoldOut(rows, live);
}
// time digits as split-flap tiles
const flap = (t) => [...t].map((c) => c === ':' ? '<em>:</em>' : `<b>${c}</b>`).join('');

/* ---------- counter ---------- */
let filter = 'All';
function renderFilters() {
  const cats = ['All', ...new Set(COUNTER.map((c) => c.cat))];
  $('#filters').innerHTML = cats.map((c) =>
    `<button type="button" role="tab" aria-selected="${c === filter}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
}
function renderMenu() {
  const list = COUNTER.filter((c) => filter === 'All' || c.cat === filter);
  $('#menu').innerHTML = list.map((c) => `
    <li class="item" data-id="${c.id}" data-img="${esc(c.img || '')}">
      ${c.img ? `<img class="item__thumb" src="${esc(c.img)}" alt="" loading="lazy">` : ''}
      <div class="item__main">
        <h3 class="item__name">${esc(c.name)}<span class="stamp" hidden>Sold out today</span></h3>
        <p class="item__desc mono">${esc(c.desc)}</p>
      </div>
      <div class="item__tags mono">${c.tags.map((t) => `<abbr title="${{ V: 'Vegetarian', VG: 'Vegan', N: 'Contains nuts', R: 'Contains rye' }[t] || t}">${t}</abbr>`).join('')}</div>
      <div class="item__price mono">${money(c.price)}</div>
      <button class="item__add" type="button" data-add="${c.id}" aria-label="Add ${esc(c.name)} to your box">+ Box</button>
    </li>`).join('');
  renderSoldOut();
}
let lastRows = null, lastLive = false;
function renderSoldOut(rows = lastRows, live = lastLive) {
  if (!rows) return;
  lastRows = rows; lastLive = live;
  const gone = new Set(rows.filter((r) => r.s.key === 'gone').map((r) => r.b.id));
  $$('#menu .item').forEach((li) => {
    const c = COUNTER.find((x) => x.id === li.dataset.id);
    const out = !!(c && c.bake && gone.has(c.bake));
    li.classList.toggle('is-gone', out);
    $('.stamp', li).hidden = !out;
    $('.item__add', li).textContent = out ? '+ Pre-order' : '+ Box';
  });
}

// photo that follows the cursor over the price list (fine pointers only)
function setupPeek() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const peek = $('#peek'), img = $('img', peek);
  const menu = $('#menu');
  menu.addEventListener('mousemove', (e) => {
    const li = e.target.closest('.item');
    if (!li || !li.dataset.img) { peek.classList.remove('is-on'); return; }
    if (img.getAttribute('src') !== li.dataset.img) img.src = li.dataset.img;
    peek.style.transform = `translate(${e.clientX + 24}px, ${e.clientY - 120}px) rotate(-3deg)`;
    peek.classList.add('is-on');
  });
  menu.addEventListener('mouseleave', () => peek.classList.remove('is-on'));
}

/* ---------- process ruler ---------- */
function renderRuler() {
  const max = PROCESS[PROCESS.length - 1].h;
  $('#ruler').innerHTML = PROCESS.map((p) =>
    `<li style="--at:${(p.h / max) * 100}%"><b>${p.h}h</b><span>${esc(p.step)}</span></li>`).join('');
}

/* ---------- box (pre-orders) ---------- */
let box = store.get('box', {});
let boxView = 'list'; // list | done
let lastOrder = null;
const boxItems = () => Object.entries(box).map(([id, q]) => ({ c: COUNTER.find((x) => x.id === id), q })).filter((x) => x.c && x.q > 0);
const boxTotal = () => boxItems().reduce((n, x) => n + x.c.price * x.q, 0);
function saveBox() { store.set('box', box); $('#boxCount').textContent = boxItems().reduce((n, x) => n + x.q, 0); }

function pickupDays() {
  const now = new Date();
  const start = nowMin() >= toMin(BAKERY.preorderCutoff) ? 2 : 1;
  const out = [];
  for (let i = start; out.length < 6 && i < start + 14; i++) {
    const d = addDays(now, i);
    if (HOURS[d.getDay()]) out.push(d);
  }
  return out;
}
function slotsFor(d) {
  const h = HOURS[d.getDay()];
  if (!h) return [];
  const s = [];
  for (let m = toMin(h.open); m <= toMin(h.close) - 60; m += 30) s.push(fmt(m) + '–' + fmt(m + 30));
  return s;
}

function renderBox() {
  const body = $('#boxBody');
  if (boxView === 'done' && lastOrder) {
    const o = lastOrder;
    body.innerHTML = `
      <p class="mono tiny">Order ${esc(o.no)} · ${esc(o.placed)}</p>
      <p class="receipt__big">See you ${esc(o.dayLabel)}.</p>
      <ul class="lines">${o.lines.map((l) => `<li><span>${l.q} × ${esc(l.name)}</span><span>${money(l.price * l.q)}</span></li>`).join('')}</ul>
      <div class="lines__total"><span>Pay at pickup</span><b>${money(o.total)}</b></div>
      <dl class="receipt__meta mono tiny">
        <dt>Pickup</dt><dd>${esc(o.dayLabel)}, ${esc(o.slot)}</dd>
        <dt>Name</dt><dd>${esc(o.name)}</dd>
        <dt>Where</dt><dd>${esc(BAKERY.street)}, ${esc(BAKERY.area)}</dd>
      </dl>
      <p class="receipt__barcode" aria-hidden="true">${esc(o.no)}</p>
      <button class="btn btn--ink wide" type="button" data-newbox>Start another box</button>`;
    return;
  }
  const items = boxItems();
  if (!items.length) {
    body.innerHTML = `<p class="receipt__big">Empty, like the counter at 3 pm.</p>
      <p class="mono small">Add bread and pastries from the counter, then pick a day and time to collect.</p>
      <a class="btn btn--ink wide" href="#counter" data-close>Go to the counter</a>`;
    return;
  }
  const days = pickupDays();
  body.innerHTML = `
    <ul class="lines">${items.map(({ c, q }) => `
      <li>
        <span>${esc(c.name)}<small class="mono">${money(c.price)} each</small></span>
        <span class="qty">
          <button type="button" data-dec="${c.id}" aria-label="One fewer ${esc(c.name)}">−</button>
          <b aria-live="polite">${q}</b>
          <button type="button" data-inc="${c.id}" aria-label="One more ${esc(c.name)}">+</button>
        </span>
      </li>`).join('')}</ul>
    <div class="lines__total"><span>Total, pay at pickup</span><b>${money(boxTotal())}</b></div>
    <form id="boxForm" class="boxform" novalidate>
      <label>Pickup day<select name="day" id="pickDay">${days.map((d, i) => `<option value="${i}">${shortDate(d)}</option>`).join('')}</select></label>
      <label>Time<select name="slot" id="pickSlot"></select></label>
      <label>Name<input name="name" autocomplete="name" required></label>
      <label>Phone<input name="phone" type="tel" autocomplete="tel" required></label>
      <p class="mono tiny boxform__err" id="boxErr" role="alert"></p>
      <button class="btn btn--ember wide" type="submit">Place pre-order · ${money(boxTotal())}</button>
      <p class="mono tiny">Orders for tomorrow close at ${BAKERY.preorderCutoff} tonight.</p>
    </form>`;
  const fillSlots = () => { $('#pickSlot').innerHTML = slotsFor(days[$('#pickDay').value]).map((s) => `<option>${s}</option>`).join(''); };
  $('#pickDay').addEventListener('change', fillSlots);
  fillSlots();
  $('#boxForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, name = f.name.value.trim(), phone = f.phone.value.trim();
    if (!name || phone.replace(/\D/g, '').length < 7) {
      $('#boxErr').textContent = !name ? 'Add a name for the order.' : 'Add a phone number we can reach you on.';
      (!name ? f.name : f.phone).focus();
      return;
    }
    const day = days[f.day.value];
    lastOrder = {
      no: 'SH-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      placed: new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
      date: dateKey(day), dayLabel: shortDate(day), slot: f.slot.value, name, phone,
      lines: items.map(({ c, q }) => ({ id: c.id, name: c.name, price: c.price, q })), total: boxTotal(),
    };
    const orders = store.get('orders', []); orders.push(lastOrder); store.set('orders', orders);
    box = {}; saveBox(); boxView = 'done'; renderBox();
    $('#receipt').classList.remove('print'); void $('#receipt').offsetWidth; $('#receipt').classList.add('print');
  });
}

const drawer = $('#drawer');
let lastFocus = null;
function openBox() {
  lastFocus = document.activeElement;
  if (boxView === 'done' && !lastOrder) boxView = 'list';
  renderBox();
  drawer.hidden = false;
  requestAnimationFrame(() => drawer.classList.add('is-open'));
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('.x', drawer).focus(), 50);
}
function closeBox() {
  drawer.classList.remove('is-open');
  document.body.style.overflow = '';
  setTimeout(() => { drawer.hidden = true; }, 300);
  if (lastFocus) lastFocus.focus();
}

function addToBox(id, btn) {
  box[id] = (box[id] || 0) + 1;
  saveBox();
  if (boxView === 'done') boxView = 'list';
  if (btn) {
    const orig = btn.textContent;
    btn.textContent = 'Added ✓'; btn.classList.add('is-added');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('is-added'); }, 1100);
  }
  const b = $('#openBox'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
}

/* ---------- cake order slip ---------- */
let cakeSel = CAKES[0].id, sizeSel = CAKE_SIZES[0].id;
function renderCakes() {
  $('#cakeChoices').innerHTML = CAKES.map((c) => `
    <label class="choice"><input type="radio" name="cake" value="${c.id}" ${c.id === cakeSel ? 'checked' : ''}>
      <span>${esc(c.name)}</span><span class="mono">from ${money(c.price)}</span></label>`).join('');
  $('#sizeChoices').innerHTML = CAKE_SIZES.map((s) => `
    <label class="chip"><input type="radio" name="size" value="${s.id}" ${s.id === sizeSel ? 'checked' : ''}><span>${esc(s.label)}</span></label>`).join('');
  const min = addDays(new Date(), CAKE_NOTICE_DAYS);
  $('#cakeDate').min = dateKey(min);
  $('#slipNo').textContent = 'No. ' + String(store.get('cakes', []).length + 101).padStart(4, '0');
  cakeTotal();
}
function cakePrice() {
  const c = CAKES.find((x) => x.id === cakeSel), s = CAKE_SIZES.find((x) => x.id === sizeSel);
  return Math.round(c.price * s.mult);
}
function cakeTotal() { $('#cakeTotal').textContent = money(cakePrice()); }

function setupCakes() {
  const form = $('#cakeForm');
  form.addEventListener('change', (e) => {
    if (e.target.name === 'cake') cakeSel = e.target.value;
    if (e.target.name === 'size') sizeSel = e.target.value;
    cakeTotal();
  });
  form.inscription.addEventListener('input', () => { $('#inscCount').textContent = form.inscription.value.length + '/30'; });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const err = $('#cakeErr');
    const v = form.date.value;
    const min = addDays(new Date(), CAKE_NOTICE_DAYS);
    let msg = '';
    if (!v) msg = 'Pick a pickup date.';
    else {
      const d = new Date(v + 'T12:00');
      if (d < min) msg = `We need ${CAKE_NOTICE_DAYS} days' notice. The earliest is ${shortDate(min)}.`;
      else if (!HOURS[d.getDay()]) msg = `We're closed on ${DAY_NAMES[d.getDay()]}s. Pick another day.`;
    }
    if (!msg && !form.name.value.trim()) msg = 'Add your name.';
    if (!msg && form.phone.value.replace(/\D/g, '').length < 7) msg = 'Add a phone number we can reach you on.';
    if (msg) { err.textContent = msg; return; }
    err.textContent = '';
    const c = CAKES.find((x) => x.id === cakeSel), s = CAKE_SIZES.find((x) => x.id === sizeSel);
    const order = { cake: c.name, size: s.label, date: v, name: form.name.value.trim(), phone: form.phone.value.trim(), inscription: form.inscription.value.trim(), price: cakePrice() };
    const all = store.get('cakes', []); all.push(order); store.set('cakes', all);
    form.classList.add('is-sent');
    form.innerHTML = `
      <div class="slip__top mono"><span>Cake order slip</span><span>No. ${String(all.length + 100).padStart(4, '0')}</span></div>
      <p class="slip__done">Got it, ${esc(order.name.split(' ')[0])}.</p>
      <p class="mono">${esc(order.cake)}, ${esc(order.size)}${order.inscription ? `, “${esc(order.inscription)}”` : ''}.</p>
      <p class="mono">Ready ${esc(shortDate(new Date(v + 'T12:00')))} from ${HOURS[new Date(v + 'T12:00').getDay()].open}. ${money(order.price)}, pay at pickup. We'll call to confirm.</p>
      <button class="btn btn--ink" type="button" id="cakeAgain">Order another cake</button>`;
    $('#cakeAgain').addEventListener('click', () => location.reload());
  });
}

/* ---------- visit ---------- */
function renderVisit() {
  $('#addrLine1').textContent = BAKERY.street;
  $('#addrLine2').textContent = BAKERY.area;
  $('#contactLines').innerHTML = `${esc(BAKERY.street)}<br>${esc(BAKERY.area)}, ${esc(BAKERY.city)}<br><br>
    <a href="tel:${BAKERY.phone.replace(/[^\d+]/g, '')}">${esc(BAKERY.phone)}</a><br>
    <a href="mailto:${esc(BAKERY.email)}">${esc(BAKERY.email)}</a>`;
  $('#mapLink').href = 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(BAKERY.mapQuery);
  const today = new Date().getDay();
  const order = [1, 2, 3, 4, 5, 6, 0];
  $('#hoursTable tbody').innerHTML = order.map((i) => {
    const h = HOURS[i];
    return `<tr class="${i === today ? 'is-today' : ''}"><th scope="row">${DAY_NAMES[i]}${i === today ? ' <span>today</span>' : ''}</th>
      <td>${h ? h.open + ' – ' + h.close : 'Closed, we sleep'}</td></tr>`;
  }).join('');
  $('#footName').textContent = '© ' + new Date().getFullYear() + ' ' + BAKERY.name;
  $('#heroLine').textContent = `Ovens lit at ${BAKERY.ovensLit} · ${BAKERY.street}, ${BAKERY.area}`;

  $('#pingForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#pingPhone').value.trim();
    const msg = $('#pingMsg');
    if (v.replace(/\D/g, '').length < 7) { msg.textContent = 'That number looks short. Try again?'; return; }
    const list = store.get('ping', []);
    if (!list.includes(v)) list.push(v);
    store.set('ping', list);
    $('#pingPhone').value = '';
    const today = boardDay();
    let when = 'today';
    if (!today.live || nowMin() >= toMin(BAKES[0].time)) {
      const next = boardDay(addDays(new Date(), 1)).date;
      when = next.getDay() === addDays(new Date(), 1).getDay() ? 'tomorrow' : DAY_NAMES[next.getDay()];
    }
    msg.textContent = `You're on the list. First text: ${when}, around ${BAKES[0].time}.`;
  });
}

/* ---------- wiring ---------- */
document.addEventListener('click', (e) => {
  const t = e.target;
  const add = t.closest('[data-add]');
  if (add) { addToBox(add.dataset.add, add); return; }
  const cat = t.closest('[data-cat]');
  if (cat) { filter = cat.dataset.cat; renderFilters(); renderMenu(); return; }
  if (t.closest('#openBox')) { openBox(); return; }
  if (t.closest('[data-close]')) { closeBox(); return; }
  const inc = t.closest('[data-inc]'), dec = t.closest('[data-dec]');
  if (inc || dec) {
    const id = (inc || dec).dataset[inc ? 'inc' : 'dec'];
    box[id] = Math.max(0, (box[id] || 0) + (inc ? 1 : -1));
    if (!box[id]) delete box[id];
    saveBox(); renderBox();
    return;
  }
  if (t.closest('[data-newbox]')) { boxView = 'list'; lastOrder = null; renderBox(); }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !drawer.hidden) closeBox();
  if (e.key === 'Tab' && !drawer.hidden) {
    const f = $$('button, a[href], input, select', drawer).filter((x) => x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});

renderFilters();
renderMenu();
renderRuler();
renderCakes();
setupCakes();
renderVisit();
renderBoard();
saveBox();
setupPeek();
setInterval(renderBoard, 15000);
const bar = $('.bar');
const onScroll = () => bar.classList.toggle('is-solid', scrollY > 60);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Set the giant wordmarks edge to edge, whatever the font and screen width.
function fitWords() {
  $$('.hero__word, .foot__word').forEach((el) => {
    const cs = getComputedStyle(el);
    const avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    el.style.fontSize = '100px';
    const spans = [...el.children];
    const stacked = cs.flexDirection === 'column';
    const w = stacked ? Math.max(...spans.map((s) => s.offsetWidth)) : spans.reduce((n, s) => n + s.offsetWidth, 0) * 1.05;
    el.style.fontSize = Math.floor((100 * avail) / w) + 'px';
  });
}
fitWords();
if (document.fonts) document.fonts.ready.then(fitWords);
addEventListener('resize', fitWords);
