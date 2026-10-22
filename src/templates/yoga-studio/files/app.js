// ─────────────────────────────────────────────────────────────────────────────
// Studio content. Edit these to make the site yours; everything on the page is
// drawn from them.
// ─────────────────────────────────────────────────────────────────────────────

const STUDIO = {
  name: 'Aube',
  tagline: 'A rooftop yoga house facing east',
  address: ['48 Larkin Row, 7th floor', 'Harbourside'],
  directions: 'Lift to the seventh floor, then one flight of stairs to the roof. Bike racks on Larkin Row; the tram stops at Pier Street, two minutes away.',
  phone: '(555) 014-2290',
  email: 'hello@aube-yoga.example',
  handle: '@aube.rooftop',
  // Used for sunrise and sunset times, and for "now" on the timetable.
  latitude: 40.7,
  longitude: -74.0,
  timeZone: 'America/New_York',
  matRental: 4,
};

const FACTS = [
  ['52', 'classes a week'],
  ['18', 'mats per class, never more'],
  ['3', 'walls of glass'],
  ['06:00', 'earliest sunrise class in June'],
];

// Opening hours, Monday first. null = closed.
const HOURS = [
  ['Monday', '05:15', '21:30'],
  ['Tuesday', '05:15', '21:30'],
  ['Wednesday', '05:15', '21:30'],
  ['Thursday', '05:15', '21:30'],
  ['Friday', '05:15', '20:00'],
  ['Saturday', '06:30', '18:00'],
  ['Sunday', '06:30', '13:00'],
];

const STYLES = [
  { id: 'sit', name: 'Breath & Sit', intensity: 1, beginner: true,
    body: 'Thirty minutes of breathwork and seated stillness. Cushions, blankets, no poses.' },
  { id: 'yin', name: 'Yin by Candle', intensity: 1, beginner: true,
    body: 'Long, supported holds of three to five minutes in a dim room. The slowest hour of the week.' },
  { id: 'restore', name: 'Restore', intensity: 2, beginner: true,
    body: 'Bolsters, straps and a teacher who adjusts you into rest. Good after a long run or a long week.' },
  { id: 'sunrise', name: 'Sunrise Flow', intensity: 3, beginner: true,
    body: 'Our signature. A steady vinyasa timed so the sun clears the harbour while you stand in warrior one.' },
  { id: 'slow', name: 'Slow Vinyasa', intensity: 3, beginner: true,
    body: 'Fewer poses, held longer, with time to learn the shapes. The best place to start.' },
  { id: 'strong', name: 'Strong Flow', intensity: 5, beginner: false,
    body: 'Fast transitions, arm balances and inversions. Bring some practice and a towel.' },
];

const TEACHERS = [
  { id: 'mara', name: 'Mara Lindqvist', role: 'Founder · Sunrise Flow', photo: 'images/shore.jpg',
    bio: 'Opened Aube after ten years of teaching on beaches at 5am. Still teaches four sunrises a week.' },
  { id: 'ines', name: 'Inès Okafor', role: 'Slow Vinyasa · Restore', photo: 'images/field.jpg',
    bio: 'A former physiotherapist who teaches alignment like a conversation, never a correction.' },
  { id: 'teo', name: 'Teo Marchetti', role: 'Strong Flow', photo: 'images/sea.jpg',
    bio: 'Climber, handstand obsessive and the reason the back row now does crow pose.' },
  { id: 'hana', name: 'Hana Sato', role: 'Yin · Breath & Sit', photo: 'images/pool.jpg',
    bio: 'Trained in Kyoto and Bali. Her yin classes run on candlelight and a single cello track.' },
];

// The weekly timetable. Day 0 = Monday. [start, style id, teacher id, minutes, mats]
const TIMETABLE = {
  0: [['06:15', 'sunrise', 'mara', 60, 18], ['07:30', 'sit', 'hana', 30, 14], ['12:15', 'slow', 'ines', 45, 18], ['17:45', 'strong', 'teo', 60, 18], ['19:30', 'yin', 'hana', 75, 16]],
  1: [['06:15', 'sunrise', 'mara', 60, 18], ['09:30', 'restore', 'ines', 60, 12], ['12:15', 'strong', 'teo', 45, 18], ['18:00', 'slow', 'ines', 60, 18], ['19:45', 'sit', 'hana', 30, 14]],
  2: [['06:15', 'sunrise', 'teo', 60, 18], ['07:30', 'slow', 'ines', 45, 18], ['12:15', 'sit', 'hana', 30, 14], ['17:45', 'slow', 'mara', 60, 18], ['19:30', 'yin', 'hana', 75, 16]],
  3: [['06:15', 'sunrise', 'mara', 60, 18], ['09:30', 'slow', 'ines', 60, 18], ['12:15', 'restore', 'ines', 45, 12], ['17:30', 'strong', 'teo', 60, 18], ['19:30', 'restore', 'hana', 75, 12]],
  4: [['06:15', 'sunrise', 'mara', 60, 18], ['12:15', 'slow', 'teo', 45, 18], ['17:30', 'yin', 'hana', 75, 16]],
  5: [['07:00', 'sunrise', 'mara', 75, 18], ['09:00', 'strong', 'teo', 60, 18], ['10:30', 'slow', 'ines', 60, 18], ['16:30', 'restore', 'hana', 75, 12]],
  6: [['07:00', 'sunrise', 'ines', 75, 18], ['09:00', 'slow', 'mara', 60, 18], ['11:00', 'yin', 'hana', 75, 16]],
};

const PRICES = [
  { id: 'intro', name: 'New here', detail: 'Fourteen days, unlimited classes. Once per person.', price: 40, unit: '', seal: true },
  { id: 'drop', name: 'Single class', detail: 'Valid for one month.', price: 26, unit: '' },
  { id: 'ten', name: 'Ten classes', detail: 'Valid for six months. Share with one other person.', price: 220, unit: '' },
  { id: 'dawn', name: 'Dawn membership', detail: 'Every class that starts before 08:00.', price: 110, unit: '/mo' },
  { id: 'all', name: 'Unlimited', detail: 'Every class, plus a guest pass each month.', price: 168, unit: '/mo' },
];

const FAQ = [
  ['What should I bring?', 'Just yourself and something you can move in. We have mats, blocks, straps and towels, and filtered water on the roof. Mat rental is free on your first visit.'],
  ['When should I arrive?', 'Ten minutes early for your first class, so we can show you around and ask about any injuries. Doors close when class starts; for sunrise, the sun does not wait either.'],
  ['I have never done yoga. Where do I start?', 'Slow Vinyasa or Sunrise Flow. Use the "New-to-yoga friendly" filter on the timetable to see every class that suits a first-timer.'],
  ['Is the roof open in winter?', 'Yes. The studio is enclosed glass with underfloor heating, so the view stays and the wind does not.'],
  ['What if I need to cancel?', 'Cancel up to two hours before class and the credit returns to your pass. Later than that, or a no-show, and the class is used.'],
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const styleById = (id) => STYLES.find((s) => s.id === id);
const teacherById = (id) => TEACHERS.find((t) => t.id === id);
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fromMin = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const money = (n) => `$${n}`;
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const store = {
  get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ } },
};

// "Now" at the studio, whatever the visitor's own time zone.
function studioNow() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: STUDIO.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  return { y: +parts.year, m: +parts.month, d: +parts.day, minutes: +parts.hour * 60 + +parts.minute };
}

// A calendar day as a UTC date, so adding days never trips over DST.
function dayInfo(offset) {
  const n = studioNow();
  const date = new Date(Date.UTC(n.y, n.m - 1, n.d + offset));
  const weekday = (date.getUTCDay() + 6) % 7; // Monday = 0
  const key = date.toISOString().slice(0, 10);
  return { date, key, weekday, label: DAY_SHORT[weekday], num: date.getUTCDate(), month: MONTHS[date.getUTCMonth()], offset };
}

// Sunrise and sunset (the standard NOAA approximation), as studio-local HH:MM.
function sunTimes(date, lat, lng) {
  const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545;
  const d = (date.valueOf() + 12 * 36e5) / dayMs - 0.5 + J1970 - J2000;
  const lw = rad * -lng, phi = rad * lat;
  const n = Math.round(d - 0.0009 - lw / (2 * Math.PI));
  const ds = 0.0009 + lw / (2 * Math.PI) + n;
  const M = rad * (357.5291 + 0.98560028 * ds);
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const L = M + C + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(L) * Math.sin(rad * 23.4397));
  const noon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const w = Math.acos((Math.sin(rad * -0.833) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
  const set = J2000 + 0.0009 + (w + lw) / (2 * Math.PI) + n + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const rise = noon - (set - noon);
  const fmt = (j) => new Intl.DateTimeFormat('en-GB', { timeZone: STUDIO.timeZone, hour: '2-digit', minute: '2-digit' })
    .format(new Date((j + 0.5 - J1970) * dayMs));
  return { rise: fmt(rise), set: fmt(set) };
}

// Mats already taken by other people: fixed per class so it does not jump
// around between visits. Replace with your booking system's numbers.
function takenElsewhere(id, mats) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return Math.min(mats, Math.round((h % 1000) / 1000 * mats * 1.05));
}

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

const state = {
  day: 0,
  style: 'all',
  beginner: false,
  bookings: store.get('aube-bookings', []),
  pending: null,
};

function classesFor(day) {
  return (TIMETABLE[day.weekday] || []).map(([start, styleId, teacherId, minutes, mats]) => {
    const id = `${day.key}T${start}-${styleId}`;
    const mine = state.bookings.find((b) => b.id === id);
    const taken = takenElsewhere(id, mats) + (mine && !mine.waitlist ? 1 : 0);
    const now = studioNow();
    return {
      id, day, start, minutes, mats,
      style: styleById(styleId), teacher: teacherById(teacherId),
      left: Math.max(0, mats - taken),
      past: day.offset === 0 && toMin(start) <= now.minutes,
      mine,
    };
  });
}

function saveBookings() {
  store.set('aube-bookings', state.bookings);
  $('[data-mat-count]').textContent = state.bookings.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static content
// ─────────────────────────────────────────────────────────────────────────────

function fillText() {
  $$('[data-text]').forEach((el) => {
    const v = STUDIO[el.dataset.text];
    if (typeof v === 'string') el.textContent = el.classList.contains('wordmark') ? v.toLowerCase() : v;
  });
  $('[data-year]').textContent = new Date().getFullYear();
  $('[data-facts]').innerHTML = FACTS.map(([n, t]) => `<li><span class="fact-n">${esc(n)}</span><span class="fact-t">${esc(t)}</span></li>`).join('');
  $('[data-address]').innerHTML = STUDIO.address.map(esc).join('<br>');
  const q = encodeURIComponent(STUDIO.address.join(', '));
  $('[data-map-link]').href = `https://www.openstreetmap.org/search?query=${q}`;
  const phone = $('[data-phone-link]');
  phone.href = `tel:${STUDIO.phone.replace(/[^\d+]/g, '')}`; phone.textContent = STUDIO.phone;
  const mail = $('[data-email-link]');
  mail.href = `mailto:${STUDIO.email}`; mail.textContent = STUDIO.email;
  $('[data-mat-price]').textContent = `(${money(STUDIO.matRental)})`;
}

function renderSun() {
  const today = dayInfo(0);
  const sun = sunTimes(today.date, STUDIO.latitude, STUDIO.longitude);
  $('[data-sunrise]').textContent = sun.rise;
  $('[data-sunset]').textContent = sun.set;
  $('[data-hero-clock]').textContent = fromMin(Math.max(0, toMin(sun.rise) - 40));
}

function renderNextClass() {
  const box = $('[data-next-class]');
  for (let i = 0; i < 7; i++) {
    const next = classesFor(dayInfo(i)).find((c) => !c.past && c.left > 0);
    if (!next) continue;
    const when = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : `${next.day.label} ${next.day.num}`;
    box.innerHTML = `<span class="label">Next open class</span>
      <button class="sunclock-name" type="button" data-book="${esc(next.id)}">${esc(when)} ${esc(next.start)} · ${esc(next.style.name)}</button>
      <span class="sunclock-meta">with ${esc(next.teacher.name.split(' ')[0])} · ${next.left} mat${next.left === 1 ? '' : 's'} left</span>`;
    return;
  }
}

function renderStyles() {
  $('[data-styles]').innerHTML = STYLES.map((s, i) => `
    <li class="style-row">
      <span class="style-num">${String(i + 1).padStart(2, '0')}</span>
      <h3 class="style-name">${esc(s.name)}</h3>
      <div class="style-body">
        <p>${esc(s.body)}</p>
        <div class="intensity" aria-label="Intensity ${s.intensity} of 5"><span style="--w:${s.intensity / 5}"></span></div>
        <button class="link" type="button" data-show-style="${s.id}">See this week's times →</button>
      </div>
    </li>`).join('');
}

function nextClassOf(teacherId) {
  for (let i = 0; i < 7; i++) {
    const c = classesFor(dayInfo(i)).find((x) => x.teacher.id === teacherId && !x.past);
    if (c) return c;
  }
  return null;
}

function renderTeachers() {
  $('[data-teachers]').innerHTML = TEACHERS.map((t, i) => {
    const next = nextClassOf(t.id);
    const when = next ? `${next.day.offset === 0 ? 'Today' : next.day.label} ${next.start} · ${next.style.name}` : 'Off this week';
    return `<li class="teacher" data-teacher="${t.id}" tabindex="0" ${i === 0 ? 'data-active' : ''}>
      <span class="teacher-name">${esc(t.name)}</span>
      <span class="teacher-role">${esc(t.role)}</span>
      <div class="teacher-more">
        <img class="teacher-thumb" src="${esc(t.photo)}" alt="" loading="lazy">
        <p>${esc(t.bio)}</p>
        ${next ? `<button class="link" type="button" data-book="${esc(next.id)}">Next: ${esc(when)} →</button>` : `<span class="label">${esc(when)}</span>`}
      </div>
    </li>`;
  }).join('');
  const img = $('[data-teacher-img]');
  const activate = (li) => {
    $$('.teacher').forEach((x) => x.toggleAttribute('data-active', x === li));
    const t = teacherById(li.dataset.teacher);
    if (img.getAttribute('src') !== t.photo) {
      img.classList.add('swap');
      setTimeout(() => { img.src = t.photo; img.classList.remove('swap'); }, 160);
    }
  };
  $$('.teacher').forEach((li) => {
    li.addEventListener('mouseenter', () => activate(li));
    li.addEventListener('focus', () => activate(li));
    li.addEventListener('click', () => activate(li));
  });
}

function renderPrices() {
  const intro = PRICES.find((p) => p.seal);
  if (intro) $('[data-seal-price]').textContent = money(intro.price);
  $('[data-prices]').innerHTML = PRICES.map((p) => `
    <li class="ledger-row${p.seal ? ' is-intro' : ''}">
      <div class="ledger-name"><h3>${esc(p.name)}</h3><p>${esc(p.detail)}</p></div>
      <span class="ledger-dots" aria-hidden="true"></span>
      <span class="ledger-price">${money(p.price)}<small>${esc(p.unit)}</small></span>
      <button class="btn btn-ink" type="button" data-pass="${p.id}" aria-label="Choose ${esc(p.name)}">Choose</button>
    </li>`).join('');
}

function renderHours() {
  const today = dayInfo(0).weekday;
  $('[data-hours]').innerHTML = HOURS.map(([day, open, close], i) => `
    <tr${i === today ? ' class="is-today"' : ''}><th scope="row">${esc(day)}${i === today ? ' <span class="label">today</span>' : ''}</th>
    <td>${open ? `${esc(open)} – ${esc(close)}` : 'Closed'}</td></tr>`).join('');
  const [, open, close] = HOURS[today];
  const now = studioNow().minutes;
  const el = $('[data-open-now]');
  if (open && now >= toMin(open) && now < toMin(close)) {
    el.innerHTML = `<span class="dot dot-open"></span> Open now · until ${esc(close)}`;
  } else {
    let i = 1; while (i < 8 && !HOURS[(today + i) % 7][1]) i++;
    const opensToday = open && now < toMin(open);
    const [nextDay, nextOpen] = opensToday ? [HOURS[today][0], open] : HOURS[(today + i) % 7];
    el.innerHTML = `<span class="dot"></span> Closed now · opens ${opensToday ? 'today' : esc(nextDay)} at ${esc(nextOpen)}`;
  }
}

function renderFaq() {
  $('[data-faq]').innerHTML = FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// Timetable
// ─────────────────────────────────────────────────────────────────────────────

function renderDays() {
  $('[data-days]').innerHTML = Array.from({ length: 7 }, (_, i) => {
    const d = dayInfo(i);
    return `<button class="day" role="tab" type="button" data-day="${i}" aria-selected="${i === state.day}" tabindex="${i === state.day ? 0 : -1}">
      <span class="day-name">${i === 0 ? 'Today' : i === 1 ? 'Tmrw' : d.label}</span><span class="day-num">${d.num}</span></button>`;
  }).join('');
}

function renderFilters() {
  const opts = [{ id: 'all', name: 'Everything' }, ...STYLES];
  $('[data-style-filter]').innerHTML = opts.map((s) =>
    `<button class="chip" type="button" data-style="${s.id}" aria-pressed="${state.style === s.id}">${esc(s.name)}</button>`).join('');
  $('[data-beginner]').checked = state.beginner;
}

const DAY_START = 5 * 60, DAY_END = 22 * 60;
const pos = (m) => ((m - DAY_START) / (DAY_END - DAY_START)) * 100;

function renderTimetable() {
  const day = dayInfo(state.day);
  const all = classesFor(day);
  const shown = all.filter((c) => (state.style === 'all' || c.style.id === state.style) && (!state.beginner || c.style.beginner));

  // The day bar: every class of the day as a band on the sky, the filtered ones lit.
  const sun = sunTimes(day.date, STUDIO.latitude, STUDIO.longitude);
  const now = studioNow().minutes;
  $('[data-daybar]').innerHTML =
    `<span class="daybar-sun" style="left:${pos(toMin(sun.rise))}%" title="Sunrise ${sun.rise}"></span>` +
    `<span class="daybar-sun is-set" style="left:${pos(toMin(sun.set))}%" title="Sunset ${sun.set}"></span>` +
    (state.day === 0 && now > DAY_START && now < DAY_END ? `<span class="daybar-now" style="left:${pos(now)}%"><span>now</span></span>` : '') +
    all.map((c) => `<span class="daybar-class${shown.includes(c) ? '' : ' is-dim'}${c.past ? ' is-past' : ''}"
      style="left:${pos(toMin(c.start))}%;width:${(c.minutes / (DAY_END - DAY_START)) * 100}%"></span>`).join('');

  const list = $('[data-classes]');
  if (!shown.length) {
    list.innerHTML = `<li class="empty">Nothing matches on ${day.offset === 0 ? 'today' : `${day.label} ${day.num}`}. <button class="link" type="button" data-clear>Show every class</button></li>`;
    return;
  }
  list.innerHTML = shown.map((c) => {
    const pct = Math.round(((c.mats - c.left) / c.mats) * 100);
    let action;
    if (c.mine) action = `<button class="btn btn-booked" type="button" data-cancel="${esc(c.id)}">${c.mine.waitlist ? 'Waitlisted' : 'Booked'} · cancel</button>`;
    else if (c.past) action = `<span class="label">Started</span>`;
    else if (c.left === 0) action = `<button class="btn btn-line" type="button" data-book="${esc(c.id)}">Join waitlist</button>`;
    else action = `<button class="btn btn-ink" type="button" data-book="${esc(c.id)}">Reserve</button>`;
    return `<li class="class${c.past ? ' is-past' : ''}${c.mine ? ' is-mine' : ''}">
      <span class="class-time">${esc(c.start)}</span>
      <div class="class-main">
        <h3 class="class-name">${esc(c.style.name)}</h3>
        <p class="class-meta">${esc(c.teacher.name)} · ${c.minutes} min${c.style.beginner ? ' · <span class="tag">new-friendly</span>' : ''}</p>
      </div>
      <div class="class-mats" title="${c.left} of ${c.mats} mats left">
        <span class="mats-bar"><span style="width:${pct}%"></span></span>
        <span class="mats-text">${c.left === 0 ? 'Full' : `${c.left} mat${c.left === 1 ? '' : 's'} left`}</span>
      </div>
      <div class="class-action">${action}</div>
    </li>`;
  }).join('');
}

function findClass(id) {
  for (let i = 0; i < 7; i++) {
    const c = classesFor(dayInfo(i)).find((x) => x.id === id);
    if (c) return c;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking
// ─────────────────────────────────────────────────────────────────────────────

const bookDialog = $('[data-book-dialog]');
const bookForm = $('[data-book-form]');

function openBooking(id) {
  const c = findClass(id);
  if (!c || c.past) return;
  state.pending = c;
  const waitlist = c.left === 0;
  bookForm.reset();
  const saved = store.get('aube-me', {});
  bookForm.name.value = saved.name || '';
  bookForm.email.value = saved.email || '';
  $('[data-book-fields]').hidden = false;
  $('[data-book-when]').textContent = `${c.day.offset === 0 ? 'Today' : `${c.day.label} ${c.day.num} ${c.day.month}`} · ${c.start}–${fromMin(toMin(c.start) + c.minutes)}`;
  $('[data-book-title]').textContent = c.style.name;
  $('[data-book-meta]').textContent = waitlist
    ? `This class is full. Join the waitlist and we will email you the moment a mat opens up.`
    : `With ${c.teacher.name}. ${c.left} of ${c.mats} mats left.`;
  $('[data-first-note]').hidden = true;
  const submit = $('[data-book-submit]');
  submit.textContent = waitlist ? 'Join the waitlist' : 'Reserve my mat';
  submit.hidden = false;
  bookDialog.showModal();
}

bookForm.first.addEventListener('change', () => {
  const intro = PRICES.find((p) => p.seal);
  const note = $('[data-first-note]');
  note.hidden = !bookForm.first.checked;
  note.textContent = intro
    ? `Welcome. Your mat rental is free today, and you can start the “${intro.name}” pass for ${money(intro.price)} at the front desk.`
    : 'Welcome. Your mat rental is free today.';
});

bookForm.addEventListener('submit', (e) => {
  if (e.submitter && e.submitter.value === 'cancel') return;
  e.preventDefault();
  if (!bookForm.reportValidity()) return;
  const c = state.pending;
  const waitlist = c.left === 0;
  const booking = {
    id: c.id, waitlist, name: bookForm.name.value.trim(), email: bookForm.email.value.trim(),
    mat: bookForm.mat.checked && !bookForm.first.checked, first: bookForm.first.checked,
    title: c.style.name, teacher: c.teacher.name, date: c.day.key, start: c.start, minutes: c.minutes,
  };
  store.set('aube-me', { name: booking.name, email: booking.email });
  state.bookings = state.bookings.filter((b) => b.id !== c.id).concat(booking);
  saveBookings();
  renderAll();
  $('[data-book-fields]').hidden = true;
  $('[data-book-submit]').hidden = true;
  $('[data-book-title]').textContent = waitlist ? 'You are on the waitlist.' : 'Your mat is waiting.';
  const meta = $('[data-book-meta]');
  meta.innerHTML = `${esc(c.style.name)} with ${esc(c.teacher.name)}. ${waitlist
    ? 'We will email you if a mat opens up.'
    : `Arrive ten minutes early${booking.mat ? '; your rental mat and towel will be laid out' : ''}.`}
    <br><button class="link" type="button" data-ics="${esc(c.id)}">Add to my calendar ↓</button>`;
});

function cancelBooking(id) {
  state.bookings = state.bookings.filter((b) => b.id !== id);
  saveBookings();
  renderAll();
  renderMat();
}

function downloadIcs(id) {
  const b = state.bookings.find((x) => x.id === id);
  if (!b) return;
  const stamp = (date, hhmm) => `${date.replace(/-/g, '')}T${hhmm.replace(':', '')}00`;
  const end = fromMin(toMin(b.start) + b.minutes);
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Aube//Timetable//EN', 'BEGIN:VEVENT',
    `UID:${b.id}@aube`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;TZID=${STUDIO.timeZone}:${stamp(b.date, b.start)}`, `DTEND;TZID=${STUDIO.timeZone}:${stamp(b.date, end)}`,
    `SUMMARY:${b.title} at ${STUDIO.name}`, `DESCRIPTION:With ${b.teacher}. Arrive ten minutes early.`,
    `LOCATION:${STUDIO.address.join(', ')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `${STUDIO.name.toLowerCase()}-${b.date}-${b.start.replace(':', '')}.ics`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const matDialog = $('[data-mat-dialog]');
function renderMat() {
  const list = $('[data-mat-list]');
  const items = state.bookings.slice().sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  list.innerHTML = items.length ? items.map((b) => {
    const d = new Date(`${b.date}T00:00:00Z`);
    return `<li><span class="mat-when">${DAY_SHORT[(d.getUTCDay() + 6) % 7]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} · ${esc(b.start)}</span>
      <span class="mat-what">${esc(b.title)}${b.waitlist ? ' <span class="tag">waitlist</span>' : ''}</span>
      <span class="mat-btns"><button class="link" type="button" data-ics="${esc(b.id)}">Calendar</button>
      <button class="link" type="button" data-cancel="${esc(b.id)}">Cancel</button></span></li>`;
  }).join('') : `<li class="empty">No mats reserved yet. <a class="link" href="#schedule" data-close-mat>Find a class →</a></li>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Passes
// ─────────────────────────────────────────────────────────────────────────────

const passDialog = $('[data-pass-dialog]');
const passForm = $('[data-pass-form]');
let pendingPass = null;

function openPass(id) {
  pendingPass = PRICES.find((p) => p.id === id);
  passForm.reset();
  const saved = store.get('aube-me', {});
  passForm.name.value = saved.name || '';
  passForm.email.value = saved.email || '';
  passForm.start.value = dayInfo(0).key;
  passForm.start.min = dayInfo(0).key;
  $('[data-pass-fields]').hidden = false;
  $('[data-pass-submit]').hidden = false;
  $('[data-pass-price]').textContent = `${money(pendingPass.price)}${pendingPass.unit}`;
  $('[data-pass-title]').textContent = pendingPass.name;
  $('[data-pass-meta]').textContent = `${pendingPass.detail} We hold it under your name; pay at the front desk on your first visit.`;
  passDialog.showModal();
}

passForm.addEventListener('submit', (e) => {
  if (e.submitter && e.submitter.value === 'cancel') return;
  e.preventDefault();
  if (!passForm.reportValidity()) return;
  store.set('aube-me', { name: passForm.name.value.trim(), email: passForm.email.value.trim() });
  const passes = store.get('aube-passes', []);
  passes.push({ id: pendingPass.id, start: passForm.start.value, at: Date.now() });
  store.set('aube-passes', passes);
  $('[data-pass-fields]').hidden = true;
  $('[data-pass-submit]').hidden = true;
  $('[data-pass-title]').textContent = 'Held for you.';
  const [y, m, d] = passForm.start.value.split('-').map(Number);
  $('[data-pass-meta]').innerHTML = `${esc(pendingPass.name)}, starting ${d} ${MONTHS[m - 1]} ${y}. A confirmation is on its way to ${esc(passForm.email.value.trim())}.
    <br><a class="link" href="#schedule" data-close-pass>Now reserve your first mat →</a>`;
});

// ─────────────────────────────────────────────────────────────────────────────
// Breath room
// ─────────────────────────────────────────────────────────────────────────────

const breath = { timer: null, running: false };
const PHASES = [['Breathe in', 4, 'in'], ['Hold', 7, 'hold'], ['Let it go', 8, 'out']];

function stopBreath(message = 'Ready') {
  clearTimeout(breath.timer);
  breath.running = false;
  const orb = $('[data-breath-orb]');
  orb.dataset.phase = '';
  orb.style.setProperty('--dur', '1.2s');
  $('[data-breath-word]').textContent = message;
  $('[data-breath-count]').textContent = '';
  $('[data-breath-toggle]').textContent = message === 'Ready' ? 'Begin four rounds' : 'Again';
}

function runBreath() {
  const orb = $('[data-breath-orb]');
  const word = $('[data-breath-word]');
  const count = $('[data-breath-count]');
  let round = 0, phase = 0, left = PHASES[0][1];
  breath.running = true;
  $('[data-breath-toggle]').textContent = 'Stop';
  const enter = () => {
    const [label, secs, key] = PHASES[phase];
    orb.style.setProperty('--dur', `${secs}s`);
    orb.dataset.phase = key;
    word.textContent = label;
    left = secs;
  };
  const tick = () => {
    count.textContent = `${left} · round ${round + 1} of 4`;
    left -= 1;
    if (left < 0) {
      phase = (phase + 1) % 3;
      if (phase === 0) round += 1;
      if (round === 4) { stopBreath('Well done.'); return; }
      enter();
      count.textContent = `${left} · round ${round + 1} of 4`;
      left -= 1;
    }
    breath.timer = setTimeout(tick, 1000);
  };
  enter();
  tick();
}

// ─────────────────────────────────────────────────────────────────────────────
// Wiring
// ─────────────────────────────────────────────────────────────────────────────

function renderAll() {
  renderTimetable();
  renderNextClass();
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('button, a');
  if (!t) return;
  const d = t.dataset;
  if (d.day !== undefined) { state.day = +d.day; renderDays(); renderTimetable(); $(`[data-day="${state.day}"]`).focus(); }
  else if (d.style) { state.style = d.style; renderFilters(); renderTimetable(); }
  else if (d.showStyle) {
    state.style = d.showStyle; state.beginner = false; renderFilters(); renderTimetable();
    $('#schedule').scrollIntoView({ behavior: 'smooth' });
  }
  else if (d.clear !== undefined) { state.style = 'all'; state.beginner = false; renderFilters(); renderTimetable(); }
  else if (d.book) openBooking(d.book);
  else if (d.cancel) cancelBooking(d.cancel);
  else if (d.ics) downloadIcs(d.ics);
  else if (d.pass) openPass(d.pass);
  else if (d.openMat !== undefined) { renderMat(); matDialog.showModal(); }
  else if (d.closeMat !== undefined) matDialog.close();
  else if (d.closePass !== undefined) passDialog.close();
  else if (d.breathToggle !== undefined) { if (breath.running) stopBreath(); else runBreath(); }
});

$('[data-days]').addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  state.day = (state.day + (e.key === 'ArrowRight' ? 1 : 6)) % 7;
  renderDays(); renderTimetable();
  $(`[data-day="${state.day}"]`).focus();
});

$('[data-beginner]').addEventListener('change', (e) => { state.beginner = e.target.checked; renderTimetable(); });

// Close a dialog by clicking the dimmed backdrop.
$$('dialog').forEach((dlg) => dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); }));

$('[data-letter]').addEventListener('submit', (e) => {
  e.preventDefault();
  const email = $('#letter-email').value.trim();
  const list = store.get('aube-letter', []);
  if (!list.includes(email)) list.push(email);
  store.set('aube-letter', list);
  $('.letter-row').hidden = true;
  $('[data-letter-done]').hidden = false;
});

// Start on the first day that still has a class left.
for (let i = 0; i < 7; i++) {
  if (classesFor(dayInfo(i)).some((c) => !c.past)) { state.day = i; break; }
}

fillText();
renderSun();
renderDays();
renderFilters();
renderStyles();
renderTeachers();
renderPrices();
renderHours();
renderFaq();
renderAll();
saveBookings();

const nav = $('.nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Keep "now", "started" and open/closed honest if the page stays open.
setInterval(() => { renderSun(); renderTimetable(); renderNextClass(); renderHours(); }, 60 * 1000);
