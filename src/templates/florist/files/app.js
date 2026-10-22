// =============================================================================
// Moth & Marigold — content. Edit the data below; the page is built from it.
// =============================================================================

const SHOP = {
  name: 'Moth & Marigold',
  street: '212 Larch Street',
  city: 'Portland, OR 97214',
  phone: '(503) 555-0148',
  email: 'hello@mothandmarigold.com',
  currency: '$',
};

// Opening hours, in the visitor's local time. Leave open/close empty for closed.
const HOURS = [
  { day: 'Monday',    open: '08:00', close: '18:00' },
  { day: 'Tuesday',   open: '08:00', close: '18:00' },
  { day: 'Wednesday', open: '08:00', close: '18:00' },
  { day: 'Thursday',  open: '08:00', close: '19:30' },
  { day: 'Friday',    open: '08:00', close: '19:30' },
  { day: 'Saturday',  open: '09:00', close: '17:00' },
  { day: 'Sunday',    open: '',      close: '' },
];

const DELIVERY = {
  sameDayCutoff: 13,           // order before 1pm for delivery the same day
  nextRunHour: 9,              // when the van leaves on the next delivery day
  days: [1, 2, 3, 4, 5, 6],    // Mon–Sat (0 = Sunday)
  // ZIP codes are matched from the most specific rule down: a full ZIP, then a prefix.
  zones: [
    { name: 'By bicycle', fee: 9,  zips: ['97201', '97202', '97204', '97205', '97209', '97210', '97212', '97214', '97215', '97227', '97232'] },
    { name: 'Across the city', fee: 15, prefixes: ['972'] },
    { name: 'Out by van', fee: 24, prefixes: ['970', '971'] },
  ],
};

const SIZES = [
  { id: 'posy',     label: 'Posy',     detail: 'About 12 stems, jam-jar size' },
  { id: 'generous', label: 'Generous', detail: 'About 25 stems, the usual' },
  { id: 'abundant', label: 'Abundant', detail: '40+ stems, needs a big vase' },
];

const BUNCHES = [
  {
    id: 'the-moth', name: 'The Moth', img: 'images/b-moth.jpg',
    note: 'Our night bunch. Dusky, plum-dark and a little gothic, for people who find pink too polite.',
    stems: 'Plum scabious · coffee roses · smoke bush · black hellebore · chocolate cosmos',
    prices: { posy: 48, generous: 72, abundant: 110 },
  },
  {
    id: 'marigold-hour', name: 'Marigold Hour', img: 'images/b-marigold.jpg',
    note: 'The colour of the last hour of sun. Orange, apricot and rust, loose and tall.',
    stems: 'Dahlias · apricot roses · marigolds · copper beech · rose hips',
    prices: { posy: 46, generous: 68, abundant: 104 },
  },
  {
    id: 'hedgerow', name: 'Hedge & Hollow', img: 'images/b-hedge.jpg',
    note: 'Mostly green, a little white. Looks picked from a lane rather than bought from a shop.',
    stems: 'Viburnum · white cosmos · wild carrot · ferns · ivy berries',
    prices: { posy: 42, generous: 62, abundant: 96 },
  },
  {
    id: 'lantern', name: 'Lantern', img: 'images/b-lantern.jpg',
    note: 'Loud on purpose. Reds and yellows for birthdays, apologies and grey Tuesdays.',
    stems: 'Ranunculus · tulips · craspedia · red anemones · mimosa',
    prices: { posy: 44, generous: 66, abundant: 100 },
  },
  {
    id: 'ghost-posy', name: 'Ghost Posy', img: 'images/b-ghost.jpg',
    note: 'Pale and quiet: chalk, blush and bone. Good for new babies and hard weeks.',
    stems: 'Garden roses · white lisianthus · sweet peas · dusty miller · astrantia',
    prices: { posy: 46, generous: 70, abundant: 108 },
  },
  {
    id: 'florists-choice', name: 'Florist’s Choice', img: 'images/b-choice.jpg',
    note: 'Whatever made us gasp at the market this morning. Trust us; we’ve been doing this a while.',
    stems: 'Changes daily, always seasonal',
    prices: { posy: 40, generous: 58, abundant: 90 },
  },
];

// The ticker: a few stems from this week's cut list, priced per stem.
const STEMS_THIS_WEEK = [
  ['Ranunculus “Cloni”', 4.5], ['Café au lait dahlias', 6], ['Garden roses', 6.5], ['Chocolate cosmos', 3],
  ['Smoke bush', 5], ['Scabious', 3.5], ['Rose hips', 4], ['Sweet peas', 2.5], ['Astrantia', 3],
];

// The almanac. tag: 'peak' (at its best), 'new' (just arrived), 'last' (final weeks), or ''.
const SEASONS = [
  { month: 'January',   intro: 'Bare branches and forced bulbs. The quietest month, and the most sculptural.', stems: [['Hellebores', 'peak'], ['Forced hyacinth', ''], ['Amaryllis', 'last'], ['Witch hazel', 'peak'], ['Pussy willow', 'new'], ['Anemones', 'new'], ['Eucalyptus', ''], ['Narcissus', 'new']] },
  { month: 'February',  intro: 'The first proper colour. Anemones, ranunculus and armfuls of mimosa.', stems: [['Anemones', 'peak'], ['Ranunculus', 'new'], ['Mimosa', 'peak'], ['Tulips', 'new'], ['Hellebores', ''], ['Quince blossom', 'new'], ['Narcissus', 'peak'], ['Muscari', '']] },
  { month: 'March',     intro: 'Blossom season. We bring in whole branches and let them open in the shop.', stems: [['Cherry blossom', 'peak'], ['Tulips', 'peak'], ['Ranunculus', 'peak'], ['Fritillaria', 'new'], ['Narcissus', ''], ['Magnolia', 'new'], ['Anemones', 'last'], ['Hyacinth', '']] },
  { month: 'April',     intro: 'Everything at once. The month we work the longest hours and complain the least.', stems: [['Parrot tulips', 'peak'], ['Lilac', 'new'], ['Ranunculus', 'peak'], ['Fritillaria', 'peak'], ['Apple blossom', ''], ['Hellebores', 'last'], ['Lily of the valley', 'new'], ['Viburnum', 'new']] },
  { month: 'May',       intro: 'Peonies arrive and everyone wants them. Order early in the week.', stems: [['Peonies', 'new'], ['Lilac', 'peak'], ['Alliums', 'new'], ['Sweet peas', 'new'], ['Viburnum', 'peak'], ['Foxgloves', 'new'], ['Tulips', 'last'], ['Cow parsley', 'peak']] },
  { month: 'June',      intro: 'Peony month, and the garden roses start. Wedding season in full swing.', stems: [['Peonies', 'peak'], ['Garden roses', 'peak'], ['Sweet peas', 'peak'], ['Delphinium', 'new'], ['Foxgloves', 'peak'], ['Astrantia', 'new'], ['Nigella', 'new'], ['Alliums', '']] },
  { month: 'July',      intro: 'Long, loose and meadowy. Cornflowers, scabious and the first dahlias.', stems: [['Scabious', 'peak'], ['Cornflowers', 'peak'], ['Dahlias', 'new'], ['Delphinium', ''], ['Garden roses', ''], ['Phlox', 'new'], ['Sweet peas', 'last'], ['Lisianthus', 'new']] },
  { month: 'August',    intro: 'Dahlias take over. Big heads, hot colours, endless variety.', stems: [['Dahlias', 'peak'], ['Zinnias', 'peak'], ['Cosmos', 'peak'], ['Sunflowers', 'new'], ['Amaranthus', 'new'], ['Scabious', ''], ['Phlox', ''], ['Gladioli', 'new']] },
  { month: 'September', intro: 'Still warm, starting to rust. The best month for colour, honestly.', stems: [['Dahlias', 'peak'], ['Chocolate cosmos', 'peak'], ['Rose hips', 'new'], ['Asters', 'new'], ['Sunflowers', ''], ['Zinnias', 'last'], ['Smoke bush', 'new'], ['Sedum', 'new']] },
  { month: 'October',   intro: 'Copper, plum and smoke. Berries, hips and the last dahlias before the frost.', stems: [['Dahlias', 'last'], ['Rose hips', 'peak'], ['Smoke bush', 'peak'], ['Chrysanthemums', 'new'], ['Asters', 'peak'], ['Copper beech', 'new'], ['Chocolate cosmos', ''], ['Physalis', 'new']] },
  { month: 'November',  intro: 'Chrysanthemums, which deserve better than their reputation, and dried things.', stems: [['Chrysanthemums', 'peak'], ['Nerine', 'peak'], ['Ilex berries', 'new'], ['Physalis', ''], ['Dried hydrangea', 'new'], ['Amaryllis', 'new'], ['Asters', 'last'], ['Eucalyptus', '']] },
  { month: 'December',  intro: 'Greens, berries and scent. Wreaths on the door and paperwhites everywhere.', stems: [['Paperwhites', 'peak'], ['Amaryllis', 'peak'], ['Ilex berries', 'peak'], ['Pine & fir', 'peak'], ['Hellebores', 'new'], ['Eucalyptus', ''], ['Anemones', 'new'], ['Chrysanthemums', 'last']] },
];

// Standing orders use the Florist's Choice bunch prices, less a discount.
const STANDING = {
  bunch: 'florists-choice',
  frequencies: [
    { id: 'weekly',      label: 'every week',      off: 0.15 },
    { id: 'fortnightly', label: 'every fortnight', off: 0.10 },
    { id: 'monthly',     label: 'every month',     off: 0.05 },
  ],
  defaultSize: 'generous',
  note: 'Delivered on the day you choose, from the first one onwards. Pause for holidays, skip a week, or cancel with a message.',
};

// Workshops repeat: `day` is "first|second|third|fourth|last <weekday>". The next sessions are listed.
const WORKSHOPS = [
  { id: 'seasonal-vase', title: 'A seasonal vase',     detail: 'Loose, hand-tied arrangement with what’s in this week', day: 'first Saturday',  time: '10:00–12:30', price: 95,  seats: 8 },
  { id: 'wreath',        title: 'Wreaths & hangings',  detail: 'Moss, branches and dried things on a willow ring',      day: 'second Thursday', time: '18:30–21:00', price: 85,  seats: 8 },
  { id: 'ikebana',       title: 'Fewer stems',         detail: 'An evening of line and space, borrowed from ikebana',  day: 'third Wednesday', time: '18:30–20:30', price: 75,  seats: 6 },
  { id: 'wedding-diy',   title: 'Your own wedding',    detail: 'Bouquet and buttonholes for couples who want to DIY',  day: 'last Saturday',   time: '13:00–16:30', price: 140, seats: 6 },
];
const WORKSHOPS_SHOWN = 6;

const CARE = [
  { title: 'Cut on a slant', body: 'Trim 2cm off every stem with a sharp knife or scissors, at an angle, as soon as they arrive.' },
  { title: 'Strip the water line', body: 'Take off any leaves that would sit below the water. They rot first and take the rest with them.' },
  { title: 'Cool, not cosy', body: 'Keep them away from radiators, sunny sills and the fruit bowl. Ripening fruit ages flowers fast.' },
  { title: 'Fresh water, often', body: 'Change it every two days and re-trim the stems. Clean water is most of the job.' },
  { title: 'Edit as you go', body: 'Pull stems as they fade and re-make a smaller bunch. The last week is often the best.' },
];

// =============================================================================
// Helpers
// =============================================================================

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => SHOP.currency + (Number.isInteger(n) ? n : n.toFixed(2));
const pad = (n) => String(n).padStart(2, '0');
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = SEASONS.map((s) => s.month);
const longDate = (d) => `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
const shortDate = (d) => `${DAY_NAMES[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const store = {
  get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage may be blocked */ } },
};

let toastTimer;
function toast(html) {
  const el = $('#toast');
  el.innerHTML = html;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// =============================================================================
// Delivery days and the hero ticket
// =============================================================================

const isDeliveryDay = (d) => DELIVERY.days.includes(d.getDay());

// The first day an order placed `now` can arrive.
function firstDeliveryDate(now = new Date()) {
  const d = startOfDay(now);
  if (isDeliveryDay(d) && now.getHours() < DELIVERY.sameDayCutoff) return d;
  do d.setDate(d.getDate() + 1); while (!isDeliveryDay(d));
  return d;
}

function renderTicket() {
  const now = new Date();
  const first = firstDeliveryDate(now);
  const sameDay = first.getTime() === startOfDay(now).getTime();
  const target = new Date(first);
  if (sameDay) target.setHours(DELIVERY.sameDayCutoff, 0, 0, 0);
  else target.setHours(DELIVERY.nextRunHour, 0, 0, 0);
  const left = Math.max(0, Math.floor((target - now) / 1000));
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60;

  $('#ticketClock').textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  $('#ticketDay').textContent = shortDate(now);
  $('#ticketLabel').textContent = sameDay ? 'Same-day delivery closes in' : 'The next van leaves in';
  const cutoff = DELIVERY.sameDayCutoff > 12 ? `${DELIVERY.sameDayCutoff - 12}pm` : `${DELIVERY.sameDayCutoff}am`;
  $('#ticketNote').textContent = sameDay
    ? `Order by ${cutoff} and it arrives today, ${longDate(now)}.`
    : `Order now for delivery on ${longDate(first)}.`;
}

function weekNumber(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t - y) / 86400000 + 1) / 7);
}

// =============================================================================
// Ticker and bunches ledger
// =============================================================================

function renderTicker() {
  const items = STEMS_THIS_WEEK.map(([n, p]) => `<div class="ticker-item"><b>${esc(n)}</b><span>${money(p)} / stem</span></div>`).join('');
  $('#tickerTrack').innerHTML = items + items.replace(/class="ticker-item"/g, 'class="ticker-item" aria-hidden="true"');
}

function renderLedger() {
  $('#ledger').innerHTML = BUNCHES.map((b, i) => {
    const from = Math.min(...Object.values(b.prices));
    const sizes = SIZES.map((s, j) => `
      <label class="size">
        <input type="radio" name="size-${b.id}" value="${s.id}" ${j === 1 ? 'checked' : ''}>
        <span>${s.label}<small>${esc(s.detail)}</small></span>
        <b>${money(b.prices[s.id])}</b>
      </label>`).join('');
    return `
    <li class="row${i === 0 ? ' open' : ''}" data-id="${b.id}">
      <button class="row-head" type="button" aria-expanded="${i === 0}" aria-controls="detail-${b.id}">
        <span class="row-no">No. ${pad(i + 1)}</span>
        <span class="row-name">${esc(b.name)}</span>
        <span class="row-from">from ${money(from)}</span>
        <span class="row-plus" aria-hidden="true">+</span>
      </button>
      <div class="row-detail" id="detail-${b.id}">
        <div class="row-inner">
          <div class="row-body">
            <img class="row-photo" src="${b.img}" alt="${esc(b.name)} bunch" loading="lazy">
            <div class="row-copy">
              <p>${esc(b.note)}</p>
              <p class="mono row-stems">${esc(b.stems)}</p>
              <fieldset class="sizes"><legend class="mono">Size</legend>${sizes}</fieldset>
              <button class="btn btn-ink" type="button" data-add="${b.id}">Add to order slip</button>
            </div>
          </div>
        </div>
      </div>
    </li>`;
  }).join('');
}

function setupLedger() {
  $('#ledger').addEventListener('click', (e) => {
    const head = e.target.closest('.row-head');
    if (head) {
      const row = head.parentElement;
      const open = !row.classList.contains('open');
      row.classList.toggle('open', open);
      head.setAttribute('aria-expanded', open);
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add) {
      const b = BUNCHES.find((x) => x.id === add.dataset.add);
      const size = $(`input[name="size-${b.id}"]:checked`).value;
      const s = SIZES.find((x) => x.id === size);
      addToSlip({ key: `${b.id}:${size}`, name: b.name, detail: s.label, price: b.prices[size] });
      toast(`<b>${esc(b.name)}</b> · ${s.label} added`);
    }
  });
}

// =============================================================================
// Almanac
// =============================================================================

function renderAlmanac(index, animate) {
  const s = SEASONS[index];
  const m = $('#almanacMonth');
  m.textContent = s.month;
  if (animate) { m.classList.remove('swap'); void m.offsetWidth; m.classList.add('swap'); }
  $('#almanacIntro').textContent = s.intro;
  const label = { peak: 'At its best', new: 'Just in', last: 'Last weeks' };
  $('#almanacList').innerHTML = s.stems.map(([n, t]) => `<li><span>${esc(n)}</span>${t ? `<span class="tag ${t}">${label[t]}</span>` : ''}</li>`).join('');
  $$('.month-tab').forEach((b, i) => { b.setAttribute('aria-selected', i === index); b.tabIndex = i === index ? 0 : -1; });
}

function setupAlmanac() {
  const now = new Date().getMonth();
  $('#almanacTabs').innerHTML = SEASONS.map((s, i) =>
    `<button class="month-tab${i === now ? ' now' : ''}" role="tab" type="button" aria-label="${s.month}${i === now ? ' (this month)' : ''}">${s.month.slice(0, 3)}</button>`).join('');
  const tabs = $$('.month-tab');
  tabs.forEach((b, i) => b.addEventListener('click', () => renderAlmanac(i, true)));
  $('#almanacTabs').addEventListener('keydown', (e) => {
    const cur = tabs.findIndex((t) => t.getAttribute('aria-selected') === 'true');
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    const next = (cur + step + 12) % 12;
    renderAlmanac(next, true);
    tabs[next].focus();
  });
  renderAlmanac(now, false);
}

// =============================================================================
// Standing order
// =============================================================================

function standingPrice() {
  const bunch = BUNCHES.find((b) => b.id === STANDING.bunch);
  const size = $('#subSize').value;
  const freq = STANDING.frequencies.find((f) => f.id === $('#subFreq').value);
  return { bunch, size, freq, price: Math.round(bunch.prices[size] * (1 - freq.off)) };
}

function setupStanding() {
  $('#subSize').innerHTML = SIZES.map((s) => `<option value="${s.id}"${s.id === STANDING.defaultSize ? ' selected' : ''}>${s.label}</option>`).join('');
  $('#subFreq').innerHTML = STANDING.frequencies.map((f) => `<option value="${f.id}">${f.label}</option>`).join('');
  const update = () => {
    const { bunch, size, freq, price } = standingPrice();
    $('#subPrice').textContent = money(price);
    $('#subNote').textContent = `${Math.round(freq.off * 100)}% off the ${bunch.name} price (${money(bunch.prices[size])}). ${STANDING.note}`;
  };
  $('#subSize').addEventListener('change', update);
  $('#subFreq').addEventListener('change', update);
  $('#standingForm').addEventListener('submit', (e) => e.preventDefault());
  $('#subAdd').addEventListener('click', () => {
    const { size, freq, price } = standingPrice();
    const s = SIZES.find((x) => x.id === size);
    addToSlip({ key: `standing:${size}:${freq.id}`, name: 'Standing order', detail: `${s.label}, ${freq.label} · first delivery`, price });
    openSlip();
  });
  update();
}

// =============================================================================
// Weddings & events enquiry
// =============================================================================

function setupEnquiry() {
  const form = $('#enquiryForm');
  const budget = $('#budget');
  const showBudget = () => { $('#budgetOut').textContent = money(Number(budget.value)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  budget.addEventListener('input', showBudget);
  showBudget();
  form.date.min = isoDate(new Date());

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = $('#enquiryMsg');
    const bad = [];
    for (const f of [form.name, form.email, form.date]) {
      const ok = f.value.trim() && f.checkValidity() && !(f === form.date && parseIso(f.value) < startOfDay(new Date()));
      f.setAttribute('aria-invalid', !ok);
      if (!ok) bad.push(f);
    }
    if (bad.length) {
      msg.className = 'form-msg err';
      msg.textContent = 'Please add your name, a valid email and an event date that hasn’t passed.';
      bad[0].focus();
      return;
    }
    const data = Object.fromEntries(new FormData(form));
    const all = store.get('mm-enquiries', []);
    all.push({ ...data, sent: new Date().toISOString() });
    store.set('mm-enquiries', all);
    msg.className = 'form-msg ok';
    msg.textContent = `Thank you, ${data.name.trim().split(' ')[0]}. We’ll write to ${data.email} about ${longDate(parseIso(data.date))} within two working days.`;
    form.reset();
    showBudget();
  });
}

// =============================================================================
// Workshops
// =============================================================================

const ORD = { first: 1, second: 2, third: 3, fourth: 4, last: -1 };

function nthWeekday(year, month, rule) {
  const [ord, wd] = rule.toLowerCase().split(' ');
  const weekday = DAY_NAMES.findIndex((d) => d.toLowerCase() === wd);
  const n = ORD[ord];
  if (n === -1) {
    const d = new Date(year, month + 1, 0);
    while (d.getDay() !== weekday) d.setDate(d.getDate() - 1);
    return d;
  }
  const d = new Date(year, month, 1);
  while (d.getDay() !== weekday) d.setDate(d.getDate() + 1);
  d.setDate(d.getDate() + (n - 1) * 7);
  return d;
}

function upcomingSessions() {
  const today = startOfDay(new Date());
  const out = [];
  for (let k = 0; k < 4; k++) {
    const y = today.getFullYear(), m = today.getMonth() + k;
    for (const w of WORKSHOPS) {
      const d = nthWeekday(y, m, w.day);
      if (d >= today) out.push({ ...w, date: d, key: `${w.id}@${isoDate(d)}` });
    }
  }
  return out.sort((a, b) => a.date - b.date).slice(0, WORKSHOPS_SHOWN);
}

// A believable number of seats already taken, stable per session, plus local bookings.
function seatsTaken(s) {
  let h = 0;
  for (const c of s.key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const seeded = h % (s.seats - 1);
  const mine = store.get('mm-bookings', []).filter((b) => b.key === s.key).reduce((n, b) => n + b.seats, 0);
  return Math.min(s.seats, seeded + mine);
}

function renderSessions() {
  const list = upcomingSessions();
  $('#sessions').innerHTML = list.map((s) => {
    const taken = seatsTaken(s);
    const left = s.seats - taken;
    const dots = Array.from({ length: s.seats }, (_, i) => `<i class="${i < taken ? 'taken' : ''}"></i>`).join('');
    return `
    <li class="session" data-key="${s.key}">
      <div class="session-main">
        <p class="session-date"><b>${s.date.getDate()}</b><span>${MONTHS[s.date.getMonth()].slice(0, 3)}<br>${DAY_NAMES[s.date.getDay()].slice(0, 3)}</span></p>
        <p class="session-title">${esc(s.title)}<small>${esc(s.detail)}</small></p>
        <p class="session-meta when">${esc(s.time)}<br>${money(s.price)} a seat</p>
        <div class="session-meta">${left ? `${left} of ${s.seats} seats left` : 'Full'}<div class="seats" aria-hidden="true">${dots}</div></div>
        <button class="btn btn-ink" type="button" data-book="${s.key}" ${left ? '' : 'disabled'}>${left ? 'Book a seat' : 'Sold out'}</button>
      </div>
      <div class="session-book">
        <form class="book-form" data-key="${s.key}" novalidate>
          <label>Name<input name="name" required autocomplete="name"></label>
          <label>Email<input name="email" type="email" required autocomplete="email"></label>
          <label>Seats<select name="seats">${Array.from({ length: Math.min(left, 4) }, (_, i) => `<option>${i + 1}</option>`).join('')}</select></label>
          <button class="btn btn-marigold" type="submit">Confirm · ${money(s.price)}</button>
        </form>
        <p class="form-msg" role="status"></p>
      </div>
    </li>`;
  }).join('');
}

function setupWorkshops() {
  renderSessions();
  const root = $('#sessions');
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-book]');
    if (!b) return;
    const li = b.closest('.session');
    const open = !li.classList.contains('booking');
    $$('.session.booking', root).forEach((x) => x.classList.remove('booking'));
    li.classList.toggle('booking', open);
    if (open) $('input', li).focus();
  });
  root.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const li = form.closest('.session');
    const msg = $('.form-msg', li);
    let ok = true;
    for (const f of [form.name, form.email]) {
      const valid = f.value.trim() && f.checkValidity();
      f.setAttribute('aria-invalid', !valid);
      ok = ok && valid;
    }
    if (!ok) { msg.className = 'form-msg err'; msg.textContent = 'Please add your name and a valid email.'; return; }
    const s = upcomingSessions().find((x) => x.key === form.dataset.key);
    const seats = Number(form.seats.value);
    const all = store.get('mm-bookings', []);
    all.push({ key: s.key, title: s.title, date: isoDate(s.date), name: form.name.value.trim(), email: form.email.value.trim(), seats });
    store.set('mm-bookings', all);
    renderSessions();
    toast(`<b>${seats} seat${seats > 1 ? 's' : ''}</b> booked · ${esc(s.title)}, ${shortDate(s.date)}`);
  });
}

// =============================================================================
// Care, visit
// =============================================================================

function renderCare() {
  $('#careSteps').innerHTML = CARE.map((c) => `<li><h3>${esc(c.title)}</h3><p>${esc(c.body)}</p></li>`).join('');
}

const toMinutes = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const fmtTime = (t) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}${m ? ':' + pad(m) : ''}${h < 12 ? 'am' : 'pm'}`;
};

function renderVisit() {
  $('#visitAddress').innerHTML = `${esc(SHOP.street)}<br><em>${esc(SHOP.city)}</em>`;
  $('#visitContact').innerHTML = `<a href="tel:${SHOP.phone.replace(/[^\d+]/g, '')}">${esc(SHOP.phone)}</a> &nbsp;·&nbsp; <a href="mailto:${SHOP.email}">${esc(SHOP.email)}</a>`;
  $$('[data-shop="street"]').forEach((el) => { el.textContent = SHOP.street; });

  const now = new Date();
  const todayName = DAY_NAMES[now.getDay()];
  $('#hoursBody').innerHTML = HOURS.map((h) =>
    `<tr class="${h.day === todayName ? 'today' : ''}"><td>${h.day}${h.day === todayName ? ' · today' : ''}</td><td>${h.open ? `${fmtTime(h.open)} – ${fmtTime(h.close)}` : 'Closed'}</td></tr>`).join('');

  const status = $('#openStatus');
  const today = HOURS.find((h) => h.day === todayName);
  const mins = now.getHours() * 60 + now.getMinutes();
  if (today && today.open && mins >= toMinutes(today.open) && mins < toMinutes(today.close)) {
    status.className = 'visit-status open';
    status.textContent = `Open now · until ${fmtTime(today.close)}`;
  } else {
    let next = null;
    for (let i = 0; i < 7 && !next; i++) {
      const d = new Date(now); d.setDate(d.getDate() + i);
      const h = HOURS.find((x) => x.day === DAY_NAMES[d.getDay()]);
      if (h && h.open && (i > 0 || mins < toMinutes(h.open))) next = { h, label: i === 0 ? 'today' : i === 1 ? 'tomorrow' : h.day };
    }
    status.className = 'visit-status';
    status.textContent = next ? `Closed now · opens ${next.label} at ${fmtTime(next.h.open)}` : 'Closed';
  }
}

// =============================================================================
// Order slip
// =============================================================================

let slip = store.get('mm-slip', []);

function saveSlip() { store.set('mm-slip', slip); renderSlip(); }

function addToSlip(item) {
  const found = slip.find((x) => x.key === item.key);
  if (found) found.qty += 1;
  else slip.push({ ...item, qty: 1 });
  saveSlip();
  const c = $('#slipCount');
  c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump');
}

function zoneFor(zip) {
  if (!/^\d{5}$/.test(zip)) return undefined;
  return DELIVERY.zones.find((z) => z.zips && z.zips.includes(zip))
    || DELIVERY.zones.find((z) => z.prefixes && z.prefixes.some((p) => zip.startsWith(p)))
    || null;
}

const orderForm = () => $('#orderForm');
const mode = () => orderForm().mode.value;

function renderSlip() {
  const count = slip.reduce((n, x) => n + x.qty, 0);
  $('#slipCount').textContent = count;
  const items = $('#slipItems');
  if (!slip.length) {
    items.innerHTML = `<li class="slip-empty">Nothing on the slip yet. <a href="#bunches" data-close>Choose a bunch</a> and it lands here.</li>`;
  } else {
    items.innerHTML = slip.map((x, i) => `
      <li>
        <span class="it-name">${esc(x.name)}<small>${esc(x.detail)}</small></span>
        <span class="it-price">${money(x.price * x.qty)}</span>
        <span class="qty"><button type="button" data-qty="${i}:-1" aria-label="One fewer ${esc(x.name)}">−</button><span>${x.qty}</span><button type="button" data-qty="${i}:1" aria-label="One more ${esc(x.name)}">+</button></span>
        <button class="it-remove" type="button" data-remove="${i}">Remove</button>
      </li>`).join('');
  }
  renderTotals();
}

function renderTotals() {
  const sub = slip.reduce((n, x) => n + x.price * x.qty, 0);
  let fee = 0, feeText = '—';
  if (mode() === 'pickup') { feeText = 'Free'; $('#feeLabel').textContent = 'Collection'; }
  else {
    $('#feeLabel').textContent = 'Delivery';
    const z = zoneFor($('#zip').value.trim());
    if (z) { fee = z.fee; feeText = money(fee); }
  }
  $('#subTotal').textContent = money(sub);
  $('#feeTotal').textContent = feeText;
  $('#grandTotal').textContent = money(sub + fee);
}

function checkZip() {
  const v = $('#zip').value.trim();
  const msg = $('#zipMsg');
  const z = zoneFor(v);
  if (!v) { msg.className = 'zip-msg mono'; msg.textContent = 'Enter a ZIP to check we reach you.'; }
  else if (z === undefined) { msg.className = 'zip-msg mono'; msg.textContent = 'A ZIP code is five digits.'; }
  else if (z === null) { msg.className = 'zip-msg mono err'; msg.textContent = 'Sorry, we don’t deliver there yet. Collection is free.'; }
  else { msg.className = 'zip-msg mono ok'; msg.textContent = `✓ ${z.name} · ${money(z.fee)}`; }
  renderTotals();
  return z;
}

function checkDate() {
  const input = $('#orderDate');
  const msg = $('#dateMsg');
  const first = firstDeliveryDate();
  if (!input.value) { msg.className = 'mono date-msg'; msg.textContent = `Earliest: ${longDate(first)}`; return false; }
  const d = parseIso(input.value);
  if (d < first) { msg.className = 'mono date-msg err'; msg.textContent = `The earliest we can do is ${longDate(first)}.`; return false; }
  if (!isDeliveryDay(d)) { msg.className = 'mono date-msg err'; msg.textContent = `We’re closed on ${DAY_NAMES[d.getDay()]}s. Pick another day.`; return false; }
  msg.className = 'mono date-msg'; msg.textContent = `✓ ${longDate(d)}`;
  return true;
}

function updateCard() {
  const to = $('#recipient').value.trim();
  const text = $('#cardMsg').value;
  $('#cardTo').textContent = to ? `For ${to}` : 'For someone lovely';
  $('#cardText').textContent = text.trim() || 'Your words, in our hand.';
  $('#msgCount').textContent = `${text.length}/160`;
}

let lastFocus = null;
function openSlip() {
  lastFocus = document.activeElement;
  $('#slip').hidden = false;
  $('#slipScrim').hidden = false;
  $('#slipBody').hidden = false;
  $('#slipDone').hidden = true;
  document.body.style.overflow = 'hidden';
  checkDate();
  $('#closeSlip').focus();
}
function closeSlip() {
  $('#slip').hidden = true;
  $('#slipScrim').hidden = true;
  document.body.style.overflow = '';
  if (lastFocus) lastFocus.focus();
}

function setupSlip() {
  const form = orderForm();
  const first = firstDeliveryDate();
  $('#orderDate').min = isoDate(first);
  $('#orderDate').value = isoDate(first);

  $('#openSlip').addEventListener('click', openSlip);
  $('#closeSlip').addEventListener('click', closeSlip);
  $('#slipScrim').addEventListener('click', closeSlip);
  $('#doneClose').addEventListener('click', closeSlip);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#slip').hidden) closeSlip();
    if (e.key === 'Tab' && !$('#slip').hidden) {
      const f = $$('#slip button, #slip input, #slip textarea, #slip a[href]').filter((el) => el.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  });

  $('#slipItems').addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { closeSlip(); return; }
    const q = e.target.closest('[data-qty]');
    if (q) {
      const [i, d] = q.dataset.qty.split(':').map(Number);
      slip[i].qty += d;
      if (slip[i].qty <= 0) slip.splice(i, 1);
      saveSlip();
      return;
    }
    const r = e.target.closest('[data-remove]');
    if (r) { slip.splice(Number(r.dataset.remove), 1); saveSlip(); }
  });

  $$('input[name="mode"]', form).forEach((r) => r.addEventListener('change', () => {
    const pickup = mode() === 'pickup';
    $('#zipRow').hidden = pickup;
    $('#addressRow').hidden = pickup;
    renderTotals();
  }));
  $('#zip').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 5); checkZip(); });
  $('#orderDate').addEventListener('change', checkDate);
  $('#recipient').addEventListener('input', updateCard);
  $('#cardMsg').addEventListener('input', updateCard);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const msg = $('#orderMsg');
    const problems = [];
    if (!slip.length) problems.push('add a bunch to the slip');
    const delivery = mode() === 'delivery';
    if (delivery) {
      const z = zoneFor($('#zip').value.trim());
      $('#zip').setAttribute('aria-invalid', !z);
      if (!z) problems.push('use a ZIP we deliver to');
      const addrOk = !!form.address.value.trim();
      form.address.setAttribute('aria-invalid', !addrOk);
      if (!addrOk) problems.push('add the delivery address');
    }
    const dateOk = checkDate();
    $('#orderDate').setAttribute('aria-invalid', !dateOk);
    if (!dateOk) problems.push('choose a date we’re open');
    const recOk = !!form.recipient.value.trim();
    form.recipient.setAttribute('aria-invalid', !recOk);
    if (!recOk) problems.push('say who it’s for');
    const emailOk = form.email.value.trim() && form.email.checkValidity();
    form.email.setAttribute('aria-invalid', !emailOk);
    if (!emailOk) problems.push('add your email');

    if (problems.length) {
      msg.className = 'form-msg err';
      msg.textContent = `Nearly there: please ${problems.join(', ')}.`;
      return;
    }

    const seq = store.get('mm-order-seq', 1040) + 1;
    store.set('mm-order-seq', seq);
    const zone = delivery ? zoneFor($('#zip').value.trim()) : null;
    const total = slip.reduce((n, x) => n + x.price * x.qty, 0) + (zone ? zone.fee : 0);
    const order = {
      no: `MM-${seq}`, items: slip, mode: mode(), zip: form.zip.value, address: form.address.value.trim(),
      date: form.date.value, recipient: form.recipient.value.trim(), email: form.email.value.trim(),
      message: form.message.value.trim(), total, placed: new Date().toISOString(),
    };
    const orders = store.get('mm-orders', []);
    orders.push(order);
    store.set('mm-orders', orders);

    $('#doneNo').textContent = order.no;
    const when = longDate(parseIso(order.date));
    $('#doneText').textContent = delivery
      ? `Flowers for ${order.recipient} will arrive on ${when}. We’ll email ${order.email} when they’re on their way. Total ${money(total)}.`
      : `Flowers for ${order.recipient} will be ready to collect from ${SHOP.street} on ${when}. Total ${money(total)}, paid on collection.`;
    slip = [];
    saveSlip();
    form.reset();
    $('#zipRow').hidden = false;
    $('#addressRow').hidden = false;
    $('#orderDate').value = isoDate(firstDeliveryDate());
    msg.textContent = '';
    checkZip();
    updateCard();
    $('#slipBody').hidden = true;
    $('#slipDone').hidden = false;
    $('#doneClose').focus();
  });

  renderSlip();
  updateCard();
}

// =============================================================================
// Header
// =============================================================================

function setupHeader() {
  const top = $('#top');
  const btn = $('#menuBtn');
  const onScroll = () => top.classList.toggle('is-solid', window.scrollY > 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  btn.addEventListener('click', () => {
    const open = !top.classList.contains('menu-open');
    top.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', open);
    btn.textContent = open ? 'Close' : 'Menu';
  });
  $$('#topNav a').forEach((a) => a.addEventListener('click', () => {
    top.classList.remove('menu-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'Menu';
  }));
}

// =============================================================================
// Start
// =============================================================================

const now = new Date();
$('#ticketNo').textContent = pad(now.getMonth() + 1) + pad(now.getDate());
$('#weekNo').textContent = weekNumber(now);
$('#year').textContent = now.getFullYear();
renderTicker();
renderLedger();
setupLedger();
setupAlmanac();
setupStanding();
setupEnquiry();
setupWorkshops();
renderCare();
renderVisit();
setupSlip();
setupHeader();
renderTicket();
setInterval(renderTicket, 1000);
setInterval(renderVisit, 60000);
