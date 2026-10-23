// ============================================================================
// Content. Everything a car wash owner would change lives here as plain data:
// details, hours, wash menu, prices, plans, detailing services and FAQ.
// ============================================================================

const BUSINESS = {
  name: 'Lathermile',
  tunnel: 'Tunnel Nº1 · Express exterior + detail bay',
  street: '2410 Ferris Avenue',
  city: 'Millbrook, OH 43016',
  phone: '(614) 555-0148',
  email: 'hello@lathermile.example',
  tunnelFeet: 140,
  timeZone: 'America/New_York',
  parking: 'Free vacuums in all 14 bays after any wash. Last car into the tunnel 5 minutes before close.',
  hoursNote: 'The tunnel runs in rain and snow. It closes only below 15°F.',
};

// 0 = Sunday … 6 = Saturday. null = closed all day.
const HOURS = [
  ['08:00', '19:00'],
  ['07:00', '20:00'],
  ['07:00', '20:00'],
  ['07:00', '20:00'],
  ['07:00', '20:00'],
  ['07:00', '20:00'],
  ['07:00', '20:00'],
];

// How busy the tunnel usually is, by hour (0 = empty, 1 = packed).
// Drives the wait estimate on the lane board and the "how busy" chart.
const BUSY = {
  weekday: { 7: .15, 8: .3, 9: .25, 10: .3, 11: .45, 12: .65, 13: .55, 14: .45, 15: .55, 16: .8, 17: .9, 18: .6, 19: .25 },
  weekend: { 8: .3, 9: .55, 10: .8, 11: .95, 12: 1, 13: .9, 14: .8, 15: .7, 16: .6, 17: .45, 18: .3, 19: .2 },
};
const WAIT_MIN = 2;   // minutes, when the lane is empty
const WAIT_MAX = 18;  // minutes, at the busiest hour

const SIZES = [
  { id: 'car', label: 'Car', add: 0 },
  { id: 'big', label: 'SUV / truck', add: 3 },
];

// Colours: pink / blue / yellow are the three triple-foam colours.
const WASHES = [
  { id: 'rinse', name: 'Rinse', price: 10, color: 'var(--steel)',
    what: 'Pre-soak · soft-touch wash · spot-free rinse · power dry' },
  { id: 'shine', name: 'Shine', price: 15, color: 'var(--blue)',
    what: 'Rinse + undercarriage flush · wheel cleaner · triple foam' },
  { id: 'lather', name: 'Lather', price: 20, color: 'var(--pink)', tag: 'Most picked',
    what: 'Shine + tire shine · rain-repel glass · clear-coat protectant' },
  { id: 'mile', name: 'The Mile', price: 26, color: 'var(--yellow)',
    what: 'Every arch, all 140 ft: + ceramic seal · hot wax · towel finish' },
];

const EXTRAS = [
  { id: 'bugs', name: 'Bug prep', price: 3 },
  { id: 'wheels', name: 'Wheel brite', price: 4 },
  { id: 'mats', name: 'Mat wash', price: 3 },
  { id: 'scent', name: 'Air freshener', price: 2 },
];
const CODE_VALID_DAYS = 30;

const PLANS = [
  { id: 'shine', name: 'Shine Club', price: 21.99, single: 15, what: 'Unlimited Shine washes' },
  { id: 'lather', name: 'Lather Club', price: 29.99, single: 20, what: 'Unlimited Lather washes + free mat wash' },
  { id: 'mile', name: 'Mile Club', price: 36.99, single: 26, what: 'Unlimited Mile washes + 10% off detailing' },
];
const PLAN_FINE = 'One car per plan, matched by an RFID sticker on the windshield. Billed monthly, cancel any time online.';

// The tunnel, start to finish. `at` is seconds from the entrance.
const STAGES = [
  { name: 'Pre-soak', at: 0, color: 'var(--blue)', body: 'Two presoaks, low then high pH, loosen road film before anything touches paint.' },
  { name: 'Triple foam', at: 35, color: 'var(--pink)', body: 'Pink, blue and yellow conditioner arches. It smells like bubblegum. That part is on purpose.' },
  { name: 'Soft-touch', at: 70, color: 'var(--foam)', body: 'Closed-cell foam brushes that rinse clean between cars, so grit never rides along.' },
  { name: 'High pressure', at: 120, color: 'var(--blue)', body: 'Wheels, rockers and the undercarriage at 1,000 psi, where winter salt hides.' },
  { name: 'Seal & wax', at: 170, color: 'var(--yellow)', body: 'Ceramic seal and hot wax bond to the clear coat. Water beads for weeks.' },
  { name: 'Spot-free dry', at: 200, color: 'var(--foam)', body: 'Reverse-osmosis rinse, then 30 horsepower of blowers. Out the door at 4:00.' },
];

const DETAIL = {
  days: [2, 3, 4, 5, 6],            // Tue–Sat
  slots: ['09:00', '11:00', '13:00', '15:00'],
  windowDays: 14,                   // how far ahead people can book
};
const SERVICES = [
  { id: 'interior', name: 'Interior reset', price: 129, hours: 1.5, latest: '15:00',
    what: 'Vacuum, steam seats and carpets, every vent and seam, glass inside.' },
  { id: 'exterior', name: 'Decon & wax', price: 149, hours: 2, latest: '15:00',
    what: 'Hand wash, iron fallout and clay bar, then a carnauba wax.' },
  { id: 'full', name: 'Full detail', price: 279, hours: 4, latest: '11:00',
    what: 'Interior reset + decon & wax + engine bay and headlight restore.' },
  { id: 'ceramic', name: 'Ceramic coating', price: 649, hours: 8, latest: '09:00',
    what: 'One-step paint correction and a 3-year ceramic coating.' },
];

const REVIEWS = [
  ['Dana R.', 'Cleanest wheels I have had since the car was new.'],
  ['Marcus T.', 'Club paid for itself by the second week of February.'],
  ['Priya S.', 'The code thing is great. Skipped the whole line.'],
  ['Joel K.', 'Full detail took the dog out of my back seat. Finally.'],
  ['Ana M.', 'Four minutes, door to door. Every time.'],
  ['Ruth B.', 'They hand-dried the mirrors I always forget about.'],
];

const FAQ = [
  ['Will the brushes scratch my paint?', 'No. We use closed-cell foam, not cloth or bristle, and it is rinsed between every car. Foam cannot hold grit the way old cloth brushes did.'],
  ['What fits in the tunnel?', 'Most cars, SUVs and pickups up to 7 ft tall and 84 in wide, with tires up to 12 in wide. No dually trucks, open truck beds with loose items, or aftermarket roof racks.'],
  ['How does a wash code work?', 'Buy a wash above and you get a code. At the pay station, tap "Enter code" and type it in. Codes are good for ' + CODE_VALID_DAYS + ' days and work once.'],
  ['Can I cancel my Unlimited plan?', 'Yes, any time, online or at the window. You keep washing until the end of the month you paid for.'],
  ['Do I stay in the car?', 'Yes. Put it in neutral, hands off the wheel and feet off the brake. The conveyor does the rest and a green light tells you when to drive off.'],
  ['What if it rains the day after?', 'Bring your receipt or code back within 48 hours and the same wash is on us.'],
];

// ============================================================================
// App
// ============================================================================

const $ = (s, el = document) => el.querySelector(s);
const money = (n) => '$' + (Number.isInteger(n) ? n : n.toFixed(2));
const store = {
  get(k, fallback) { try { const v = localStorage.getItem('lathermile:' + k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } },
  set(k, v) { try { localStorage.setItem('lathermile:' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---- Time, in the business's own time zone ---------------------------------
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function bizNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: BUSINESS.timeZone, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short',
  }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  const date = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day));
  return { date, day: date.getUTCDay(), minutes: (+parts.hour % 24) * 60 + +parts.minute };
}
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
function fmtTime(hhmm, short) {
  const [h, m] = hhmm.split(':').map(Number);
  const hh = ((h + 11) % 12) + 1;
  return hh + (m || !short ? ':' + String(m).padStart(2, '0') : '') + (short ? (h < 12 ? 'am' : 'pm') : (h < 12 ? ' AM' : ' PM'));
}
const busyFor = (day) => (day === 0 || day === 6 ? BUSY.weekend : BUSY.weekday);

function status() {
  const now = bizNow();
  const today = HOURS[now.day];
  if (today && now.minutes >= toMin(today[0]) && now.minutes < toMin(today[1])) {
    const busy = busyFor(now.day)[Math.floor(now.minutes / 60)] ?? .2;
    return { open: true, wait: Math.round(WAIT_MIN + busy * (WAIT_MAX - WAIT_MIN)), closes: today[1], now };
  }
  // Next opening: later today, or the next open day.
  for (let i = 0; i < 8; i++) {
    const d = (now.day + i) % 7;
    const h = HOURS[d];
    if (!h || (i === 0 && now.minutes >= toMin(h[0]))) continue;
    return { open: false, opens: h[0], opensDay: i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY_NAMES[d].slice(0, 3), now };
  }
  return { open: false, now };
}

// ---- Static text ------------------------------------------------------------
function fillText() {
  const values = {
    ...BUSINESS,
    address: BUSINESS.street + ', ' + BUSINESS.city,
    cheapestPlan: money(Math.min(...PLANS.map((p) => p.price))),
  };
  document.querySelectorAll('[data-text]').forEach((el) => { el.textContent = values[el.dataset.text] ?? ''; });
  const tel = 'tel:' + BUSINESS.phone.replace(/[^\d+]/g, '');
  $('#call').href = tel;
  $('#call').textContent = 'Call ' + BUSINESS.phone;
  $('#foot-phone').href = tel;
  $('#foot-phone').textContent = BUSINESS.phone;
  $('#foot-email').href = 'mailto:' + BUSINESS.email;
  $('#foot-email').textContent = BUSINESS.email;
  $('#directions').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(BUSINESS.street + ', ' + BUSINESS.city);
  $('#year').textContent = new Date().getFullYear();
}

// ---- Lane board, hours, busy chart ----------------------------------------
function renderStatus() {
  const s = status();
  const state = $('#board-state');
  state.textContent = s.open ? 'Open' : 'Closed';
  state.classList.toggle('closed', !s.open);
  $('#board-wait').textContent = s.open ? '~' + s.wait + ' min' : '—';
  $('#board-next-label').textContent = s.open ? 'Closes' : 'Opens';
  $('#board-next').textContent = s.open ? fmtTime(s.closes, true) : s.opens ? fmtTime(s.opens, true) + ' ' + s.opensDay : '—';

  const pill = $('#open-pill');
  pill.textContent = s.open ? 'Open now' : 'Closed now';
  pill.classList.toggle('closed', !s.open);

  const today = HOURS[s.now.day];
  $('#exit-time').textContent = today ? fmtTime(today[1], true).replace(/:00/, '') : '—';
}

function renderHours() {
  const { day } = bizNow();
  const order = [1, 2, 3, 4, 5, 6, 0];
  $('#hours-table').insertAdjacentHTML('beforeend', '<tbody>' + order.map((d) => {
    const h = HOURS[d];
    return `<tr class="${d === day ? 'today' : ''}"><td>${DAY_NAMES[d]}</td><td>${h ? fmtTime(h[0]) + ' – ' + fmtTime(h[1]) : 'Closed'}</td></tr>`;
  }).join('') + '</tbody>');
}

function renderBusy() {
  const now = bizNow();
  let d = now.day;
  if (!HOURS[d]) d = HOURS.findIndex(Boolean);
  const h = HOURS[d];
  const curve = busyFor(d);
  const from = Math.floor(toMin(h[0]) / 60), to = Math.ceil(toMin(h[1]) / 60);
  const nowHour = Math.floor(now.minutes / 60);
  const bars = [];
  for (let hr = from; hr < to; hr++) {
    const v = curve[hr] ?? .1;
    const cls = d === now.day ? (hr === nowHour ? 'now' : hr < nowHour ? 'past' : '') : '';
    bars.push(`<i class="${cls}" style="height:${Math.round(v * 100)}%" title="${fmtTime(hr + ':00', true)}: ${v > .75 ? 'busy' : v > .4 ? 'steady' : 'quiet'}"></i>`);
  }
  $('#bars').innerHTML = bars.join('');
  $('#bars').setAttribute('aria-label', 'Usually busiest around ' + fmtTime(Object.entries(curve).sort((a, b) => b[1] - a[1])[0][0] + ':00', true));
  $('#bars-axis').innerHTML = `<span>${fmtTime(h[0], true)}</span><span>noon</span><span>${fmtTime(h[1], true)}</span>`;
  $('#busy-day').textContent = d === now.day ? 'today' : DAY_NAMES[d];
}

// ---- Reviews ticker --------------------------------------------------------
function renderTicker() {
  const items = REVIEWS.map(([who, text]) => `<span><b>★★★★★</b>“${escapeHtml(text)}” — ${escapeHtml(who)}</span>`).join('');
  $('#ticker').innerHTML = items + items.replace(/<span>/g, '<span aria-hidden="true">');
}

// ---- Menu board + ticket ---------------------------------------------------
const order = { wash: 'lather', size: 'car', extras: new Set() };

function renderMenu() {
  $('#size-opts').innerHTML = SIZES.map((s) =>
    `<label><input type="radio" name="size" value="${s.id}" ${s.id === order.size ? 'checked' : ''}><span>${s.label}${s.add ? ' +$' + s.add : ''}</span></label>`).join('');
  $('#size-opts').addEventListener('change', (e) => { order.size = e.target.value; orderChanged(); });

  $('#wash-rows').innerHTML = WASHES.map((w) =>
    `<button type="button" class="wash" role="radio" data-id="${w.id}" style="--c:${w.color}">
      <span class="wash-name">${w.name}</span>
      ${w.tag ? `<span class="wash-tag">${w.tag}</span>` : ''}
      <span class="wash-price"><sup>$</sup><span data-price="${w.id}">${w.price}</span></span>
      <span class="wash-what mono">${w.what}</span>
    </button>`).join('');
  const rows = $('#wash-rows');
  rows.addEventListener('click', (e) => {
    const b = e.target.closest('.wash');
    if (b) { order.wash = b.dataset.id; orderChanged(); }
  });
  rows.addEventListener('keydown', (e) => {
    const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const i = WASHES.findIndex((w) => w.id === order.wash);
    order.wash = WASHES[(i + keys[e.key] + WASHES.length) % WASHES.length].id;
    orderChanged();
    rows.querySelector(`[data-id="${order.wash}"]`).focus();
  });

  $('#extras').innerHTML = EXTRAS.map((x) =>
    `<label class="extra"><input type="checkbox" value="${x.id}"><span>${x.name}<b>+$${x.price}</b></span></label>`).join('');
  $('#extras').addEventListener('change', (e) => {
    e.target.checked ? order.extras.add(e.target.value) : order.extras.delete(e.target.value);
    orderChanged();
  });

  $('#buy').addEventListener('click', buy);
  $('#copy-code').addEventListener('click', copyCode);

  const saved = store.get('code');
  if (saved && saved.expires > Date.now()) showCode(saved, false);
  renderOrder();
}

function orderLines() {
  const w = WASHES.find((x) => x.id === order.wash);
  const s = SIZES.find((x) => x.id === order.size);
  const lines = [[w.name + ' wash', w.price]];
  if (s.add) lines.push([s.label, s.add]);
  EXTRAS.filter((x) => order.extras.has(x.id)).forEach((x) => lines.push([x.name, x.price]));
  return { lines, total: lines.reduce((n, l) => n + l[1], 0) };
}

function renderOrder() {
  const add = SIZES.find((x) => x.id === order.size).add;
  WASHES.forEach((w) => { $(`[data-price="${w.id}"]`).textContent = w.price + add; });
  document.querySelectorAll('.wash').forEach((b) => {
    const on = b.dataset.id === order.wash;
    b.setAttribute('aria-checked', on);
    b.tabIndex = on ? 0 : -1;
  });
  const { lines, total } = orderLines();
  $('#ticket-lines').innerHTML = lines.map(([n, p]) => `<li><span>${escapeHtml(n)}</span><span>${money(p)}</span></li>`).join('');
  $('#ticket-total').textContent = money(total);
}

function orderChanged() {
  // A new selection is a new purchase: put the button back.
  $('#ticket-code').hidden = true;
  $('#buy').hidden = false;
  renderOrder();
}

function buy() {
  const { lines, total } = orderLines();
  const digits = String(Math.floor(1000 + Math.random() * 9000));
  const letter = 'ACEHKMNPRTWXY'[Math.floor(Math.random() * 13)];
  const ticket = { code: `LM-${digits}-${letter}`, lines, total, expires: Date.now() + CODE_VALID_DAYS * 864e5 };
  store.set('code', ticket);
  showCode(ticket, true);
}

function showCode(t, animate) {
  $('#ticket-lines').innerHTML = t.lines.map(([n, p]) => `<li><span>${escapeHtml(n)}</span><span>${money(p)}</span></li>`).join('');
  $('#ticket-total').textContent = money(t.total);
  $('#code-value').textContent = t.code;
  $('#code-note').textContent = 'Type it at the pay station keypad. Good once, until ' +
    new Date(t.expires).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '.';
  // A barcode-looking strip derived from the code, so each ticket looks unique.
  let x = 0, bars = '';
  for (const ch of (t.code + t.code).replace(/-/g, '')) {
    const n = ch.charCodeAt(0);
    for (const w of [1 + (n % 3), 1 + ((n >> 2) % 2), 2 + (n % 2)]) { bars += `<rect x="${x}" width="${w}" height="40"/>`; x += w + 1 + ((n >> 1) % 2); }
  }
  const bc = $('#barcode');
  bc.setAttribute('viewBox', `0 0 ${x} 40`);
  bc.innerHTML = `<g fill="#0c0f17">${bars}</g>`;
  $('#ticket-code').hidden = false;
  $('#buy').hidden = true;
  const ticket = $('#ticket');
  if (animate) { ticket.classList.remove('printed'); void ticket.offsetWidth; ticket.classList.add('printed'); }
}

async function copyCode() {
  const btn = $('#copy-code');
  const code = $('#code-value').textContent;
  try { await navigator.clipboard.writeText(code); btn.textContent = 'Copied'; }
  catch { btn.textContent = code; }
  setTimeout(() => { btn.textContent = 'Copy code'; }, 1800);
}

// ---- The Mile ----------------------------------------------------------------
function renderStages() {
  $('#stages').innerHTML = STAGES.map((s) => {
    const t = Math.floor(s.at / 60) + ':' + String(s.at % 60).padStart(2, '0');
    return `<li class="stage" style="--c:${s.color}"><span class="stage-time mono">${t}</span><h3 class="stage-name">${s.name}</h3><p class="stage-body">${s.body}</p></li>`;
  }).join('');
  const section = $('#mile');
  const car = $('#car');
  const fill = $('#track-fill');
  const stages = [...document.querySelectorAll('.stage')];
  const total = 240; // seconds in the tunnel
  let ticking = false;
  const update = () => {
    ticking = false;
    if (getComputedStyle($('.track')).display === 'none') { stages.forEach((s) => s.classList.add('on')); return; }
    const r = section.getBoundingClientRect();
    const span = r.height - window.innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / (span > 0 ? span : 1)));
    const trackW = $('.track').clientWidth - car.clientWidth;
    car.style.transform = `translateX(${p * trackW}px)`;
    fill.style.width = (p * 100) + '%';
    stages.forEach((el, i) => el.classList.toggle('on', p * total >= STAGES[i].at - 1 || (i === 0)));
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
}

// ---- Unlimited ---------------------------------------------------------------
const club = { plan: 'lather', washes: 4 };

function renderClub() {
  $('#plans').innerHTML = PLANS.map((p) =>
    `<label class="plan"><input type="radio" name="plan" value="${p.id}" ${p.id === club.plan ? 'checked' : ''}>
      <span class="plan-name">${p.name}</span><span class="plan-price">${money(p.price)}<small>/mo</small></span>
      <span class="plan-what mono">${p.what}</span></label>`).join('');
  $('#plans-fine').textContent = PLAN_FINE;
  $('#plans').addEventListener('change', (e) => { club.plan = e.target.value; updateClub(); });
  $('#less').addEventListener('click', () => { club.washes = Math.max(1, club.washes - 1); updateClub(); });
  $('#more').addEventListener('click', () => { club.washes = Math.min(20, club.washes + 1); updateClub(); });
  updateClub();
}

function updateClub() {
  const p = PLANS.find((x) => x.id === club.plan);
  const atWindow = club.washes * p.single;
  const saved = atWindow - p.price;
  const breakEven = Math.ceil(p.price / p.single);
  $('#washes').textContent = club.washes;
  $('#saved-num').textContent = saved > 0 ? money(Math.round(saved)) : '$0';
  $('#saved-label').textContent = saved > 0
    ? `kept every month on ${p.name}. ${club.washes} washes at the window is ${money(atWindow)}; the club is ${money(p.price)}.`
    : `${p.name} pays for itself from wash #${breakEven}. At ${club.washes} a month, pay at the window.`;
  $('#join-plan-name').textContent = p.name;
}

// ---- Join dialog ---------------------------------------------------------------
function initJoin() {
  const dlg = $('#join');
  const form = $('#join-form');
  $('#join-open').addEventListener('click', () => {
    const p = PLANS.find((x) => x.id === club.plan);
    $('#join-title').textContent = `${p.name}, ${money(p.price)}/mo`;
    form.hidden = false; $('#join-done').hidden = true; $('#join-error').textContent = '';
    dlg.showModal();
  });
  const close = () => dlg.close();
  $('#join-close').addEventListener('click', close);
  $('#join-finish').addEventListener('click', close);
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const bad = checkFields(form, {
      name: (v) => v.trim().length > 1,
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      plate: (v) => /^[A-Za-z0-9 -]{2,10}$/.test(v.trim()),
    });
    if (bad) { $('#join-error').textContent = bad; return; }
    const p = PLANS.find((x) => x.id === club.plan);
    const member = { ...data, plate: data.plate.trim().toUpperCase(), plan: p.id, since: Date.now(), id: 'LM' + Math.floor(100000 + Math.random() * 900000) };
    store.set('member', member);
    form.hidden = true;
    $('#join-done').hidden = false;
    $('#join-done-title').textContent = `Welcome, ${data.name.trim().split(' ')[0]}.`;
    $('#join-done-text').textContent = `${p.name} for ${member.plate}. Member ${member.id}. Pull up to any lane; we'll put your windshield sticker on at the gate and you're washing today.`;
    $('#join-finish').focus();
  });
}

function checkFields(form, rules) {
  let msg = '';
  for (const [name, ok] of Object.entries(rules)) {
    const input = form.elements[name];
    const valid = ok(input.value);
    input.setAttribute('aria-invalid', !valid);
    if (!valid && !msg) { msg = `Check the ${input.closest('label').querySelector('span').textContent.toLowerCase()}.`; input.focus(); }
  }
  return msg;
}

// ---- Detailing booking ---------------------------------------------------------
const booking = { service: 'interior', date: null, slot: null };
const isoDate = (d) => d.toISOString().slice(0, 10);

function bookedSlots() { return store.get('bookings', []); }
function isTaken(date, slot) {
  if (bookedSlots().some((b) => b.date === date && b.slot === slot)) return true;
  // Stand-in for a real calendar: about a third of slots are already taken.
  let h = 0;
  for (const c of date + slot) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 10 < 3;
}

function renderBooking() {
  $('#services').innerHTML = SERVICES.map((s) =>
    `<label class="svc"><input type="radio" name="service" value="${s.id}" ${s.id === booking.service ? 'checked' : ''}>
      <span class="svc-name">${s.name}</span><span class="svc-price">${money(s.price)}</span>
      <span class="svc-what mono">${s.what} ${s.hours >= 8 ? 'All day.' : s.hours + ' h.'}</span></label>`).join('');
  $('#services').addEventListener('change', (e) => { booking.service = e.target.value; booking.slot = null; renderSlots(); });

  const today = bizNow().date;
  const days = [];
  for (let i = 1; i <= DETAIL.windowDays; i++) {
    const d = new Date(today.getTime() + i * 864e5);
    days.push(d);
  }
  $('#days').innerHTML = days.map((d) => {
    const open = DETAIL.days.includes(d.getUTCDay());
    return `<label class="day"><input type="radio" name="date" value="${isoDate(d)}" ${open ? '' : 'disabled'}>
      <span>${DAY_NAMES[d.getUTCDay()].slice(0, 3)}<b>${d.getUTCDate()}</b></span></label>`;
  }).join('');
  $('#days').addEventListener('change', (e) => { booking.date = e.target.value; booking.slot = null; renderSlots(); });
  $('#slots').addEventListener('change', (e) => { booking.slot = e.target.value; });

  const first = $('#days input:not(:disabled)');
  if (first) { first.checked = true; booking.date = first.value; }
  renderSlots();

  $('#book').addEventListener('submit', submitBooking);
  $('#book-another').addEventListener('click', () => {
    $('#booked').hidden = true; $('#book').hidden = false; booking.slot = null; renderSlots();
    $('#book').scrollIntoView({ block: 'start' });
  });
}

function renderSlots() {
  const svc = SERVICES.find((s) => s.id === booking.service);
  const slots = DETAIL.slots.filter((t) => toMin(t) <= toMin(svc.latest));
  $('#slots').innerHTML = slots.map((t) => {
    const taken = !booking.date || isTaken(booking.date, t);
    return `<label class="slot"><input type="radio" name="slot" value="${t}" ${taken ? 'disabled' : ''} ${booking.slot === t ? 'checked' : ''}><span>${fmtTime(t, true)}</span></label>`;
  }).join('');
  const free = slots.filter((t) => booking.date && !isTaken(booking.date, t)).length;
  $('#slots-note').textContent = free
    ? (svc.hours >= 4 ? `${svc.name} needs the bay ${svc.hours >= 8 ? 'all day' : 'for ' + svc.hours + ' hours'}, so it starts by ${fmtTime(svc.latest, true)}.` : 'Pick up the same afternoon. We text when it is ready.')
    : 'That day is full for this service. Try another day.';
}

function submitBooking(e) {
  e.preventDefault();
  const form = e.target;
  const err = $('#book-error');
  if (!booking.date) { err.textContent = 'Pick a day.'; return; }
  if (!booking.slot) { err.textContent = 'Pick a drop-off time.'; $('#slots input:not(:disabled)')?.focus(); return; }
  const bad = checkFields(form, {
    name: (v) => v.trim().length > 1,
    phone: (v) => v.replace(/\D/g, '').length >= 7,
    car: (v) => v.trim().length > 1,
  });
  if (bad) { err.textContent = bad; return; }
  err.textContent = '';
  const svc = SERVICES.find((s) => s.id === booking.service);
  const data = Object.fromEntries(new FormData(form));
  const all = bookedSlots();
  all.push({ date: booking.date, slot: booking.slot, service: svc.id, name: data.name.trim(), phone: data.phone.trim(), car: data.car.trim() });
  store.set('bookings', all);

  const d = new Date(booking.date + 'T00:00:00Z');
  $('#booked-when').textContent = `${DAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()} ${d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}, ${fmtTime(booking.slot, true)}`;
  $('#booked-what').textContent = `${svc.name} for the ${data.car.trim()}. ${money(svc.price)}, paid at pick-up.`;
  $('#booked-note').textContent = `We'll text ${data.phone.trim()} the day before. Drop the keys at the detail bay window, left of the tunnel exit.`;
  form.reset();
  form.hidden = true;
  $('#booked').hidden = false;
  $('#booked').focus();
  // Keep the radio state in sync after reset.
  booking.slot = null;
  $(`#services input[value="${booking.service}"]`).checked = true;
  $(`#days input[value="${booking.date}"]`).checked = true;
  renderSlots();
}

// ---- FAQ, nav --------------------------------------------------------------------
function renderFaq() {
  $('#faq').innerHTML = FAQ.map(([q, a]) => `<details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join('');
}

// Set the hero wordmark edge to edge, whatever the font and width.
function fitWordmark() {
  const word = $('.hero-word');
  const span = word.firstElementChild;
  word.style.fontSize = '';
  const avail = word.clientWidth;
  const base = parseFloat(getComputedStyle(word).fontSize);
  if (span.offsetWidth) word.style.fontSize = (base * avail / span.offsetWidth).toFixed(2) + 'px';
}

function initNav() {
  const btn = $('.nav-toggle');
  const links = $('#nav-links');
  btn.addEventListener('click', () => {
    const open = links.classList.toggle('open');
    btn.setAttribute('aria-expanded', open);
    btn.textContent = open ? 'Close' : 'Menu';
  });
  links.addEventListener('click', (e) => {
    if (e.target.closest('a')) { links.classList.remove('open'); btn.setAttribute('aria-expanded', false); btn.textContent = 'Menu'; }
  });
}

fillText();
renderStatus();
renderHours();
renderBusy();
renderTicker();
renderMenu();
renderStages();
renderClub();
initJoin();
renderBooking();
renderFaq();
initNav();
fitWordmark();
document.fonts?.ready.then(fitWordmark);
window.addEventListener('resize', fitWordmark);
setInterval(renderStatus, 60000);
