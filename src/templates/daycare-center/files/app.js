/* =========================================================================
   Tumbletown Early Learning
   Everything a center would change lives in the data below: details, hours,
   rooms, the daily schedule, tuition, the menu, the calendar, staff, reviews
   and FAQ. The code underneath only renders it.
   ========================================================================= */

const CENTER = {
  name: 'Tumbletown',
  legalName: 'Tumbletown Early Learning',
  heroMeta: 'Ages 6 weeks – 5 years · Fernvale',
  lede: 'A neighborhood daycare and preschool with four small rooms, a garden, a nut-free kitchen and teachers who stay for years.',
  phone: '(555) 014-2290',
  email: 'hello@tumbletown.example',
  address: '48 Larkspur Street<br>Fernvale',
  mapQuery: '48 Larkspur Street, Fernvale',
  license: 'State license #CC-40917 · Inspected yearly',
  factRatio: '1:3',
  factHours: '7–6:30',
  factSince: '2009',
  // The center's own time zone, so "open now" and "right now" are right for
  // every visitor, wherever they are.
  timeZone: 'America/Chicago',
  // Optional: a URL that accepts a JSON POST (Formspree, a Puter worker, …).
  // Left empty, tour requests open the visitor's email app instead.
  formEndpoint: '',
};

// Opening hours, 24h "HH:MM". null = closed.
const HOURS = {
  Mon: ['07:00', '18:30'], Tue: ['07:00', '18:30'], Wed: ['07:00', '18:30'],
  Thu: ['07:00', '18:30'], Fri: ['07:00', '18:00'], Sat: null, Sun: null,
};

// Rooms by age. minMonths/maxMonths decide which room a birthday lands in.
// shape: circle | square | arch | half   color: sun | tomato | clover | pink
const ROOMS = [
  {
    id: 'nest', name: 'The Nest', ages: '6 weeks – 12 months', minMonths: 1.38 /* 6 wks */, maxMonths: 12,
    ratio: '1:3', group: 9, shape: 'circle', color: 'sun', photo: 'photos/rainbow-swing.jpg',
    photoAlt: 'A rainbow-striped baby swing in a calm room',
    blurb: 'A quiet, sunny room where babies keep their own rhythm. They eat and sleep when they need to, and we write it all down for you.',
    highlights: ['Own cot for every baby', 'Breast milk & formula welcome', 'Daily notes and photos', 'Garden buggy walks'],
    tuition: 2180, shortDays: false,
  },
  {
    id: 'burrow', name: 'The Burrow', ages: '12 – 24 months', minMonths: 12, maxMonths: 24,
    ratio: '1:4', group: 12, shape: 'square', color: 'tomato', photo: 'photos/block-tower.jpg',
    photoAlt: 'A tall tower of colorful toy bricks on a play mat',
    blurb: 'For new walkers and big explorers. Low shelves, lots of messy play, a sandpit of their own and plenty of naps.',
    highlights: ['Messy play every day', 'Toddler-sized garden', 'Potty learning, gently', 'Songs in two languages'],
    tuition: 1990, shortDays: false,
  },
  {
    id: 'treehouse', name: 'The Treehouse', ages: '2 – 3 years', minMonths: 24, maxMonths: 36,
    ratio: '1:6', group: 14, shape: 'arch', color: 'clover', photo: 'photos/light-board.jpg',
    photoAlt: 'Three young children making pictures on a big light-up peg board',
    blurb: 'Big feelings, big questions and a lot of building. A studio for paint and clay, and stories after lunch every day.',
    highlights: ['Art studio twice a week', 'Cooking on Fridays', 'Feelings & friendship circle', 'Short days available'],
    tuition: 1720, shortDays: true,
  },
  {
    id: 'launchpad', name: 'Launchpad', ages: '3 – 5 years', minMonths: 36, maxMonths: 60,
    ratio: '1:8', group: 16, shape: 'half', color: 'pink', photo: 'photos/number-tower.jpg',
    photoAlt: 'A tall tower of numbered wooden blocks',
    blurb: 'Our pre-K. Letters, numbers and long projects, forest walks on Thursdays, and a gentle hand-off to kindergarten.',
    highlights: ['Play-based pre-K', 'Forest Thursdays', 'Kindergarten-ready report', 'Short days available'],
    tuition: 1540, shortDays: true,
  },
];

// One list per room, in order. Ten hops each.
const SCHEDULE = {
  nest: [
    ['07:00', 'Hello & cuddles', 'Warm hand-off from you'],
    ['08:00', 'Bottles & breakfast', 'On their own clock'],
    ['09:00', 'Tummy time', 'Mirrors and treasure baskets'],
    ['09:45', 'Morning nap', 'In their own cot'],
    ['11:00', 'Songs & board books', 'Lap time'],
    ['11:30', 'Lunch', 'Purées to finger food'],
    ['12:30', 'Buggy walk', 'Round the garden'],
    ['13:30', 'Afternoon naps', 'As long as they like'],
    ['15:30', 'Snack & sensory play', 'Water, sand, fabric'],
    ['16:30', 'Quiet play & home', 'Your daily note is ready'],
  ],
  burrow: [
    ['07:00', 'Arrivals', 'Free play'],
    ['08:15', 'Breakfast', 'Family style'],
    ['09:00', 'Messy play', 'Paint, dough, water'],
    ['10:00', 'Garden & sandpit', 'In all weather'],
    ['11:15', 'Music circle', 'Shakers and drums'],
    ['11:45', 'Lunch', 'Cooked here'],
    ['12:30', 'Nap', 'Lights low'],
    ['14:45', 'Snack', 'Fruit and crackers'],
    ['15:30', 'Blocks & stories', 'Build, knock down, repeat'],
    ['16:30', 'Outside till pick-up', 'Wave goodbye'],
  ],
  treehouse: [
    ['07:00', 'Arrivals & free play', 'Choose a corner'],
    ['08:15', 'Breakfast', 'Pour your own milk'],
    ['09:00', 'Morning circle', 'Who is here today?'],
    ['09:30', 'Studio', 'Paint, clay, collage'],
    ['10:30', 'Outdoor play', 'Climbing frame & bikes'],
    ['11:45', 'Lunch', 'Set the table'],
    ['12:30', 'Rest & quiet books', 'Short days go home'],
    ['14:30', 'Snack', 'Made by the kids on Fridays'],
    ['15:00', 'Building & pretend', 'Shop, vet, rocket'],
    ['16:15', 'Garden, then home', 'Water the beans'],
  ],
  launchpad: [
    ['07:00', 'Arrivals', 'Sign in your name'],
    ['08:15', 'Breakfast', 'Serve yourself'],
    ['09:00', 'Morning meeting', 'Plan the day'],
    ['09:30', 'Letters & numbers', 'Through games'],
    ['10:30', 'Forest walk or yard', 'Boots on'],
    ['11:45', 'Lunch', 'Talk about the morning'],
    ['12:30', 'Quiet hour', 'Short days go home'],
    ['13:30', 'Project time', 'This month: bridges'],
    ['14:45', 'Snack & clubs', 'Music, cooking, science'],
    ['16:00', 'Yard & pick-up', 'Show a grown-up your work'],
  ],
};

// Monthly tuition is the room's price (5 full days) times these.
const TUITION = {
  days: { 5: 1, 4: 0.86, 3: 0.7, 2: 0.52 },
  shortDay: { label: 'Short day', hours: '8:30 – 12:30', factor: 0.68 },
  fullDay: { label: 'Full day', hours: '7:00 – 6:30' },
  siblingDiscount: 0.1,
  registration: 125,
  currency: 'USD',
  note: 'Subsidies and employer vouchers accepted. Tuition is billed monthly; there is no charge for 2 weeks of family vacation a year.',
};

// The week's menu, Monday to Friday.
const MENU = {
  Mon: { Breakfast: 'Oatmeal with stewed apple', Lunch: 'Chicken & vegetable pie, peas', Snack: 'Pear slices, rice cakes' },
  Tue: { Breakfast: 'Yogurt, berries, granola (no nuts)', Lunch: 'Lentil bolognese with pasta', Snack: 'Cheese cubes, cucumber' },
  Wed: { Breakfast: 'Scrambled eggs on toast', Lunch: 'Fish pie with green beans', Snack: 'Banana bread (baked by the Treehouse)' },
  Thu: { Breakfast: 'Banana pancakes', Lunch: 'Bean & sweet potato chili, rice', Snack: 'Hummus, carrot sticks, pita' },
  Fri: { Breakfast: 'Whole-grain cereal & milk', Lunch: 'Homemade pizza, salad bar', Snack: 'Apple & cinnamon muffins' },
};
const MENU_NOTE = 'Cooked here every morning by Mei. Nut-free kitchen; dairy-free and vegetarian swaps every day.';

// Closures and events. Past ones hide themselves; tours skip closed days.
const CALENDAR = [
  { date: '2026-11-11', label: 'Closed: teacher training day', closed: true },
  { date: '2026-11-20', label: 'Pajama day & pancake breakfast' },
  { date: '2026-11-26', end: '2026-11-27', label: 'Closed: Thanksgiving', closed: true },
  { date: '2026-12-12', label: 'Lantern walk, 4 pm (families welcome)' },
  { date: '2026-12-24', end: '2027-01-01', label: 'Closed: winter break', closed: true },
  { date: '2027-01-18', label: 'Closed: MLK Day', closed: true },
  { date: '2027-02-12', label: 'Grandparents morning' },
  { date: '2027-03-19', label: 'Spring photos' },
  { date: '2027-05-31', label: 'Closed: Memorial Day', closed: true },
  { date: '2027-06-18', label: 'Launchpad graduation picnic' },
];

// Tour slots: which weekdays, which times, how many days ahead to offer.
const TOURS = { weekdays: ['Tue', 'Wed', 'Thu'], times: ['09:30', '10:30', '16:15'], daysAhead: 21, minutes: 45 };

const STAFF = [
  { name: 'Rosa Delgado', role: 'Director', years: 17, note: 'Opened the Nest in 2009 and still knows every lullaby.', shape: 'arch', color: 'cobalt' },
  { name: 'Amara Okafor', role: 'Lead · The Nest', years: 11, note: 'Infant CPR instructor. Speaks English and Igbo.', shape: 'circle', color: 'sun' },
  { name: 'Ben Whitfield', role: 'Lead · The Burrow', years: 7, note: 'Builder of the tallest block towers on record.', shape: 'square', color: 'tomato' },
  { name: 'Priya Raman', role: 'Lead · The Treehouse', years: 9, note: 'Runs the studio. Has never met a glitter she liked.', shape: 'arch', color: 'clover' },
  { name: 'Jonah Ellis', role: 'Lead · Launchpad', years: 6, note: 'Forest-school trained. Knows the name of every beetle.', shape: 'half', color: 'pink' },
  { name: 'Mei Chen', role: 'Cook', years: 12, note: 'Runs our nut-free kitchen. Famous for the Wednesday banana bread.', shape: 'circle', color: 'tomato' },
];

const PROMISES = [
  { big: '1:3', small: 'babies to each teacher in the Nest. Better than the state requires, in every room.' },
  { big: '100%', small: 'of our staff are CPR & first-aid certified and background checked.' },
  { big: '0', small: 'nuts in our kitchen. Ever.' },
  { big: '2×', small: 'a day outside, in all weather. Spare boots are on us.' },
];

const REVIEWS = [
  { text: 'Our son cried for exactly one morning. Now he runs in without saying goodbye, which is rude, but we\'ll take it.', who: 'Hannah, Burrow parent' },
  { text: 'The daily notes from the Nest got me through my first months back at work. I knew every nap and every bottle.', who: 'Marcus, Nest parent' },
  { text: 'She came home talking about bridges for a month. Then she built one in our living room. Launchpad is magic.', who: 'Leila, Launchpad parent' },
  { text: 'Teachers who have been there for ten years tell you everything you need to know about a place.', who: 'Sam & Jo, two kids here' },
];

const FAQ = [
  ['How old does my child need to be to start?', 'We take babies from 6 weeks old in the Nest, and children up to 5 in Launchpad, our pre-K.'],
  ['Is there a waitlist?', 'The Nest and the Burrow usually have a waitlist of 3 to 6 months, so join early, even before your baby is born. The Treehouse and Launchpad often have places sooner.'],
  ['What do I need to bring?', 'Spare clothes, a sun hat, and anything that helps with sleep. We provide meals, diapers, wipes, sunscreen and all supplies.'],
  ['How will I know how the day went?', 'You get a daily note with meals, naps, diapers and a few photos, plus a short chat at pick-up. Teachers are happy to message during the day.'],
  ['What happens when my child is sick?', 'Children with a fever, vomiting or diarrhea stay home until they are 24 hours clear. We\'ll always call before it gets to that.'],
  ['Do you offer part-time places?', 'Yes, 2, 3, 4 or 5 days a week, and short days (8:30 to 12:30) in the Treehouse and Launchpad.'],
];

/* ========================================================================= */

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: TUITION.currency, maximumFractionDigits: 0 }).format(Math.round(n));
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fmtTime = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}`;
};
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const roomById = (id) => ROOMS.find((r) => r.id === id);

// "Now" at the center: weekday, minutes past midnight and the date there.
function centerNow() {
  const parts = {};
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: CENTER.timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', year: 'numeric', month: '2-digit', day: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date()).forEach((p) => { parts[p.type] = p.value; });
  } catch (e) {
    const d = new Date();
    return { day: DAYS[d.getDay()], min: d.getHours() * 60 + d.getMinutes(), date: new Date(d.getFullYear(), d.getMonth(), d.getDate()) };
  }
  return { day: parts.weekday, min: Number(parts.hour) * 60 + Number(parts.minute), date: new Date(+parts.year, +parts.month - 1, +parts.day) };
}

/* ---- Simple text fields from CENTER ---- */
function fillText() {
  $$('[data-text]').forEach((el) => {
    const k = el.dataset.text;
    if (k === 'tuitionNote') el.textContent = TUITION.note;
    else if (k === 'menuNote') el.textContent = MENU_NOTE;
    else if (k === 'address') el.innerHTML = CENTER.address;
    else if (CENTER[k] != null) el.textContent = CENTER[k];
  });
  $$('[data-href]').forEach((el) => {
    const k = el.dataset.href;
    if (k === 'phone') el.href = 'tel:' + CENTER.phone.replace(/[^\d+]/g, '');
    if (k === 'email') el.href = 'mailto:' + CENTER.email;
    if (k === 'map') el.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(CENTER.mapQuery);
  });
  $('#year').textContent = '© ' + new Date().getFullYear();
}

/* ---- Open now ---- */
function renderStatus() {
  const now = centerNow();
  const today = HOURS[now.day];
  const el = $('#status');
  let open = false, text;
  if (today && now.min >= toMin(today[0]) && now.min < toMin(today[1])) {
    open = true;
    text = `Open now · until ${fmtTime(today[1])}`;
  } else {
    // Next opening.
    let idx = DAYS.indexOf(now.day);
    let label = '';
    for (let i = 0; i < 8; i++) {
      const d = DAYS[(idx + i) % 7];
      const h = HOURS[d];
      if (!h) continue;
      if (i === 0 && now.min >= toMin(h[0])) continue;
      label = i === 0 ? `today ${fmtTime(h[0])}` : i === 1 ? `tomorrow ${fmtTime(h[0])}` : `${d} ${fmtTime(h[0])}`;
      break;
    }
    text = `Closed · opens ${label}`;
  }
  el.classList.toggle('open', open);
  el.querySelector('b').textContent = text;
}

function renderHours() {
  const now = centerNow();
  $('#hours').innerHTML = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => {
    const h = HOURS[d];
    return `<li class="${d === now.day ? 'today' : ''}"><span>${d}</span><span>${h ? fmtTime(h[0]) + ' – ' + fmtTime(h[1]) : 'Closed'}</span></li>`;
  }).join('');
}

/* ---- Rooms ---- */
let currentRoom = ROOMS[2].id;
function renderBlocks() {
  $('#blocks').innerHTML = ROOMS.map((r, i) => `
    <button class="block b-${r.shape} c-${r.color}" role="tab" id="tab-${r.id}" aria-controls="room" aria-selected="${r.id === currentRoom}" data-room="${r.id}" style="--tilt:${[-4, 3, -2, 5][i % 4]}deg">
      <span class="block-name">${esc(r.name)}</span>
      <span class="block-age mono">${esc(r.ages)}</span>
    </button>`).join('');
  $$('#blocks .block').forEach((b) => b.addEventListener('click', () => selectRoom(b.dataset.room)));
  $('#blocks').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const i = ROOMS.findIndex((r) => r.id === currentRoom);
    const next = ROOMS[(i + (e.key === 'ArrowRight' ? 1 : ROOMS.length - 1)) % ROOMS.length];
    selectRoom(next.id);
    $('#tab-' + next.id).focus();
  });
}

function selectRoom(id) {
  currentRoom = id;
  $$('#blocks .block').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.room === id)));
  const r = roomById(id);
  $('#room').setAttribute('aria-labelledby', 'tab-' + id);
  $('#room').innerHTML = `
    <div class="room-photo blk-shape ${r.shape} ph" style="background-image:url(${r.photo})" role="img" aria-label="${esc(r.photoAlt)}"></div>
    <div class="room-body">
      <h3 class="room-name">${esc(r.name)}</h3>
      <dl class="room-facts mono">
        <div><dt>Ages</dt><dd>${esc(r.ages)}</dd></div>
        <div><dt>Ratio</dt><dd>${esc(r.ratio)}</dd></div>
        <div><dt>Group</dt><dd>${r.group} children</dd></div>
        <div><dt>From</dt><dd>${money(r.tuition * TUITION.days[2] * (r.shortDays ? TUITION.shortDay.factor : 1))}/mo</dd></div>
      </dl>
      <p class="room-blurb">${esc(r.blurb)}</p>
      <ul class="room-hl">${r.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
      <p class="room-links"><a href="#day" data-goto-day="${r.id}">See the ${esc(r.name)} day →</a><a href="#tuition" data-goto-tuition="${r.id}">Price it →</a></p>
    </div>`;
  $('[data-goto-day]', $('#room')).addEventListener('click', () => setDayRoom(r.id));
  $('[data-goto-tuition]', $('#room')).addEventListener('click', () => { tu.room = r.id; renderTuition(); });
}

// Which room for a birthday, and when they move up.
function ageInMonths(dob, at) {
  let m = (at.getFullYear() - dob.getFullYear()) * 12 + (at.getMonth() - dob.getMonth());
  if (at.getDate() < dob.getDate()) m -= 1;
  const rem = (at - new Date(dob.getFullYear(), dob.getMonth() + m, dob.getDate())) / 86400000;
  return m + Math.max(0, rem) / 30.4;
}
function roomFor(dob, at) {
  const m = ageInMonths(dob, at);
  if (m < ROOMS[0].minMonths) return { tooYoung: true, from: new Date(dob.getFullYear(), dob.getMonth(), dob.getDate() + Math.round(ROOMS[0].minMonths * 30.44)) };
  const r = ROOMS.find((x) => m >= x.minMonths && m < x.maxMonths);
  return r ? { room: r } : { tooOld: true };
}
const longDate = (d) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
const monthYear = (d) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

function finderResult(dobStr, startStr) {
  if (!dobStr) return null;
  const dob = parseISO(dobStr);
  const start = startStr ? parseISO(startStr) : centerNow().date;
  const res = roomFor(dob, start);
  if (res.tooYoung) return { text: `A little too little for now: babies join the Nest from 6 weeks, so from <b>${longDate(res.from)}</b>. Join the waitlist today to hold a place.`, room: ROOMS[0] };
  if (res.tooOld) return { text: 'By then they\'ll be 5 and off to kindergarten. Ask us about our summer and after-school club.', room: null };
  const r = res.room;
  const i = ROOMS.indexOf(r);
  const next = ROOMS[i + 1];
  const moveUp = new Date(dob.getFullYear(), dob.getMonth() + r.maxMonths, dob.getDate());
  const tail = next ? ` They'd move up to <b>${esc(next.name)}</b> around <b>${monthYear(moveUp)}</b>.` : ` They'd stay until kindergarten, around <b>${monthYear(moveUp)}</b>.`;
  return { text: `They'd join <b>${esc(r.name)}</b> (${esc(r.ages)}).${tail}`, room: r };
}

function bindFinder() {
  $('#finder-start').value = iso(centerNow().date);
  $('#finder').addEventListener('submit', (e) => {
    e.preventDefault();
    const out = finderResult($('#finder-dob').value, $('#finder-start').value);
    if (!out) return;
    $('#finder-out').innerHTML = out.text;
    if (out.room) selectRoom(out.room.id);
  });
}

/* ---- The day as a hopscotch ---- */
let dayRoom = 'treehouse';
const HOP_COLORS = ['tomato', 'sun', 'cobalt', 'clover', 'pink'];
function renderDayTabs() {
  $('#day-tabs').innerHTML = ROOMS.map((r) => `<button type="button" role="tab" data-room="${r.id}" aria-selected="${r.id === dayRoom}" class="${r.id === dayRoom ? 'on' : ''}">${esc(r.name.replace(/^The /, ''))}</button>`).join('');
  $$('#day-tabs button').forEach((b) => b.addEventListener('click', () => setDayRoom(b.dataset.room)));
}
function setDayRoom(id) { dayRoom = id; renderDayTabs(); renderHop(); }

// Hopscotch layout: single, pair, single, pair… (1, 2-3, 4, 5-6, 7, 8-9, 10)
function renderHop() {
  const items = SCHEDULE[dayRoom] || [];
  const now = centerNow();
  const hours = HOURS[now.day];
  const openNow = hours && now.min >= toMin(hours[0]) && now.min < toMin(hours[1]);
  let current = -1;
  if (openNow) items.forEach((it, i) => { if (now.min >= toMin(it[0])) current = i; });

  let col = 1, html = '';
  const pattern = [1, 2, 1, 2, 1, 2, 1];
  let idx = 0;
  pattern.forEach((n) => {
    for (let k = 0; k < n && idx < items.length; k++, idx++) {
      const [t, what, note] = items[idx];
      const cls = n === 1 ? 'single' : k === 0 ? 'pair top' : 'pair bottom';
      html += `<li class="sq ${cls} c-${HOP_COLORS[idx % HOP_COLORS.length]}${idx === current ? ' now' : ''}" style="--col:${col}">
        <span class="sq-n" aria-hidden="true">${idx + 1}</span>
        <span class="sq-t mono">${fmtTime(t)}</span>
        <span class="sq-w">${esc(what)}</span>
        <span class="sq-note">${esc(note)}</span>
        ${idx === current ? '<span class="stone" aria-hidden="true">now</span>' : ''}
      </li>`;
    }
    col++;
  });
  $('#hop').innerHTML = html;
  const r = roomById(dayRoom);
  $('#now-line').innerHTML = current >= 0
    ? `<span class="pulse"></span>Right now in ${esc(r.name)}: <b>${esc(items[current][1].toLowerCase())}</b>`
    : `Everyone's home. ${esc(r.name)} starts again at ${fmtTime(items[0][0])}.`;
}

/* ---- Tuition ---- */
const tu = { room: 'treehouse', days: 5, length: 'full', sibling: false };
function chipRow(el, options, value, onPick) {
  el.innerHTML = options.map((o) => `<button type="button" class="chip${String(o.value) === String(value) ? ' on' : ''}" aria-pressed="${String(o.value) === String(value)}" ${o.disabled ? 'disabled' : ''} data-v="${o.value}">${o.label}</button>`).join('');
  $$('button', el).forEach((b) => b.addEventListener('click', () => onPick(b.dataset.v)));
}
function estimate() {
  const r = roomById(tu.room);
  const len = r.shortDays ? tu.length : 'full';
  const base = r.tuition;
  const days = base * TUITION.days[tu.days];
  const lengthAdj = len === 'short' ? days * (TUITION.shortDay.factor - 1) : 0;
  const sub = days + lengthAdj;
  const sib = tu.sibling ? -sub * TUITION.siblingDiscount : 0;
  const monthly = sub + sib;
  return { r, len, base, days, lengthAdj, sib, monthly, weekly: monthly * 12 / 52 };
}
function renderTuition() {
  const r = roomById(tu.room);
  if (!r.shortDays) tu.length = 'full';
  chipRow($('#tu-room'), ROOMS.map((x) => ({ value: x.id, label: esc(x.name) })), tu.room, (v) => { tu.room = v; renderTuition(); });
  chipRow($('#tu-days'), [2, 3, 4, 5].map((d) => ({ value: d, label: d + ' days' })), tu.days, (v) => { tu.days = Number(v); renderTuition(); });
  chipRow($('#tu-length'), [
    { value: 'full', label: `${TUITION.fullDay.label} <small>${TUITION.fullDay.hours}</small>` },
    { value: 'short', label: `${TUITION.shortDay.label} <small>${r.shortDays ? TUITION.shortDay.hours : '2 yrs +'}</small>`, disabled: !r.shortDays },
  ], tu.length, (v) => { tu.length = v; renderTuition(); });
  $('#tu-sibling').checked = tu.sibling;
  const e = estimate();
  $('#tu-price').innerHTML = `${money(e.monthly)}<small>/mo</small>`;
  const lines = [
    [`${e.r.name}, 5 full days`, money(e.base)],
    tu.days !== 5 ? [`${tu.days} days a week`, money(e.days - e.base)] : null,
    e.lengthAdj ? [`Short days (${TUITION.shortDay.hours})`, money(e.lengthAdj)] : null,
    e.sib ? [`Sibling discount (${TUITION.siblingDiscount * 100}%)`, money(e.sib)] : null,
    ['About per week', money(e.weekly)],
    ['One-time registration', money(TUITION.registration)],
  ].filter(Boolean);
  $('#tu-receipt').innerHTML = lines.map(([a, b]) => `<li><span>${esc(a)}</span><span>${b.replace('-', '−')}</span></li>`).join('');
}
function estimateSummary() {
  const e = estimate();
  return `${e.r.name}, ${tu.days} ${e.len === 'short' ? 'short' : 'full'} days a week${tu.sibling ? ', sibling discount' : ''}: about ${money(e.monthly)}/month`;
}
let estimateAttached = false;
function bindTuition() {
  $('#tu-sibling').addEventListener('change', (e) => { tu.sibling = e.target.checked; renderTuition(); });
  $('#tu-take').addEventListener('click', () => { estimateAttached = true; showEstimateChip(); });
}

/* ---- Fridge ---- */
function renderMagnets() {
  const colors = ['tomato', 'cobalt', 'sun', 'clover', 'pink'];
  const words = ['ON', 'THE', 'FRIDGE'];
  let i = 0;
  $('.magnets').innerHTML = words.map((w) => `<span class="mword">${[...w].map((ch) => `<span class="mag c-${colors[i++ % colors.length]}" style="--r:${((i * 37) % 13) - 6}deg" aria-hidden="true">${ch}</span>`).join('')}</span>`).join('');
}
let menuDay = null;
function renderMenu() {
  const keys = Object.keys(MENU);
  const now = centerNow();
  if (!menuDay) menuDay = keys.includes(now.day) ? now.day : keys[0];
  // Monday of this week (or next week on weekends).
  const d = new Date(now.date);
  const dow = d.getDay();
  d.setDate(d.getDate() + (dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow));
  $('#menu-week').textContent = 'Week of ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  $('#menu-days').innerHTML = keys.map((k) => `<button type="button" role="tab" aria-selected="${k === menuDay}" class="${k === menuDay ? 'on' : ''}" data-d="${k}">${k}${k === now.day ? '<i>today</i>' : ''}</button>`).join('');
  $$('#menu-days button').forEach((b) => b.addEventListener('click', () => { menuDay = b.dataset.d; renderMenu(); }));
  $('#menu-list').innerHTML = Object.entries(MENU[menuDay]).map(([meal, food]) => `<div><dt>${esc(meal)}</dt><dd>${esc(food)}</dd></div>`).join('');
}
function upcomingEvents(from) {
  const list = CALENDAR.filter((e) => parseISO(e.end || e.date) >= from);
  return list.length ? list : CALENDAR.slice(-3);
}
function renderCalendar() {
  const items = upcomingEvents(centerNow().date).slice(0, 5);
  const fmt = (s) => parseISO(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const range = (e) => {
    if (!e.end) return fmt(e.date);
    const sameMonth = parseISO(e.end).getMonth() === parseISO(e.date).getMonth();
    return fmt(e.date) + '–' + (sameMonth ? parseISO(e.end).getDate() : fmt(e.end));
  };
  $('#cal-list').innerHTML = items.map((e) => `<li class="${e.closed ? 'closed' : ''}"><span class="mono">${range(e)}</span>${esc(e.label)}</li>`).join('');
  $('#fridge-quote').textContent = '“' + REVIEWS[1].text + '”';
  $('#fridge-cite').textContent = '— ' + REVIEWS[1].who;
}
const isClosed = (d) => CALENDAR.some((e) => e.closed && d >= parseISO(e.date) && d <= parseISO(e.end || e.date));

/* ---- Staff roll call ---- */
function renderRoll() {
  $('#roll').innerHTML = STAFF.map((s) => `
    <li class="roll-row">
      <span class="roll-shape blk-shape ${s.shape} c-${s.color}" aria-hidden="true"></span>
      <span class="roll-name">${esc(s.name)}</span>
      <span class="roll-role mono">${esc(s.role)}</span>
      <span class="roll-note">${esc(s.note)}</span>
      <span class="roll-years"><b>${s.years}</b> yrs</span>
    </li>`).join('');
  const leads = STAFF.filter((s) => /^Lead/.test(s.role));
  $('#avg-years').textContent = Math.round(leads.reduce((n, s) => n + s.years, 0) / leads.length);
}
function renderPromises() {
  $('#nums').innerHTML = PROMISES.map((p, i) => `<li class="num n-${i}"><b>${esc(p.big)}</b><span>${esc(p.small)}</span></li>`).join('');
}

/* ---- Reviews ---- */
let reviewIdx = 0;
function renderReview() {
  const r = REVIEWS[reviewIdx];
  $('#review-text').textContent = r.text;
  $('#review-who').textContent = r.who;
  $('#review-count').textContent = `${reviewIdx + 1} / ${REVIEWS.length}`;
}
function bindReviews() {
  $('#review-prev').addEventListener('click', () => { reviewIdx = (reviewIdx + REVIEWS.length - 1) % REVIEWS.length; renderReview(); });
  $('#review-next').addEventListener('click', () => { reviewIdx = (reviewIdx + 1) % REVIEWS.length; renderReview(); });
}

/* ---- FAQ ---- */
function renderFaq() {
  $('#faq-list').innerHTML = FAQ.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}<span aria-hidden="true">+</span></summary><p>${esc(a)}</p></details>`).join('');
}

/* ---- Tour booking ---- */
const tour = { mode: 'tour', date: null, time: null };
function tourDays() {
  const out = [];
  const now = centerNow();
  const d = new Date(now.date);
  for (let i = 0; i <= TOURS.daysAhead; i++) {
    const day = DAYS[d.getDay()];
    if (TOURS.weekdays.includes(day) && HOURS[day] && !isClosed(d)) {
      const times = TOURS.times.filter((t) => i > 0 || toMin(t) > now.min + 60);
      if (times.length) out.push({ date: new Date(d), times });
    }
    d.setDate(d.getDate() + 1);
  }
  return out;
}
function renderTourDays() {
  const days = tourDays();
  if (!tour.date || !days.some((x) => iso(x.date) === tour.date)) tour.date = days[0] ? iso(days[0].date) : null;
  $('#day-tiles').innerHTML = days.map((x) => {
    const k = iso(x.date);
    return `<button type="button" class="tile${k === tour.date ? ' on' : ''}" aria-pressed="${k === tour.date}" data-d="${k}">
      <span class="mono">${DAYS[x.date.getDay()]}</span><b>${x.date.getDate()}</b><span class="mono">${x.date.toLocaleDateString('en-US', { month: 'short' })}</span></button>`;
  }).join('') || '<p>No tour days in the next few weeks. Please call us.</p>';
  $$('#day-tiles .tile').forEach((b) => b.addEventListener('click', () => { tour.date = b.dataset.d; tour.time = null; renderTourDays(); }));
  const sel = days.find((x) => iso(x.date) === tour.date);
  const times = sel ? sel.times : [];
  if (!times.includes(tour.time)) tour.time = times[0] || null;
  chipRow($('#slot-chips'), times.map((t) => ({ value: t, label: fmtTime(t) })), tour.time, (v) => { tour.time = v; renderTourDays(); });
}
function setMode(mode) {
  tour.mode = mode;
  $$('.tour-form [data-mode]').forEach((b) => { const on = b.dataset.mode === mode; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
  $('#tour-when').hidden = mode !== 'tour';
  $('#wait-when').hidden = mode !== 'waitlist';
  $('#tour-submit').textContent = mode === 'tour' ? 'Book my tour' : 'Join the waitlist';
}
function showEstimateChip() {
  const chip = $('#estimate-chip');
  chip.hidden = !estimateAttached;
  if (estimateAttached) chip.innerHTML = `<span>Estimate attached: ${esc(estimateSummary())}</span><button type="button" aria-label="Remove estimate">×</button>`;
  const x = $('button', chip);
  if (x) x.addEventListener('click', () => { estimateAttached = false; showEstimateChip(); });
}
function icsFor(data, start) {
  const end = new Date(start.getTime() + TOURS.minutes * 60000);
  const stamp = (d) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}00`;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tumbletown//Tour//EN', 'BEGIN:VEVENT',
    `UID:${Date.now()}@tumbletown`, `DTSTAMP:${stamp(new Date())}`,
    `DTSTART;TZID=${CENTER.timeZone}:${stamp(start)}`, `DTEND;TZID=${CENTER.timeZone}:${stamp(end)}`,
    `SUMMARY:Tour of ${CENTER.legalName}`,
    `LOCATION:${CENTER.mapQuery}`,
    `DESCRIPTION:Tour for ${data.child}. Questions? ${CENTER.phone}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}
function bindTour() {
  $$('.tour-form [data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
  $('#f-dob').addEventListener('change', (e) => {
    const res = e.target.value ? finderResult(e.target.value) : null;
    $('#f-room').value = res && res.room ? res.room.name : res ? 'Ask us' : '';
  });
  $('#tour-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const err = $('#form-error');
    err.textContent = '';
    const data = Object.fromEntries(new FormData(form));
    const missing = $$('[required]', form).filter((i) => !i.value.trim());
    if (missing.length) { err.textContent = 'Please fill in: ' + missing.map((i) => i.previousElementSibling.textContent.toLowerCase()).join(', ') + '.'; missing[0].focus(); return; }
    if (!/^\S+@\S+\.\S+$/.test(data.email)) { err.textContent = 'That email address doesn\'t look right.'; form.email.focus(); return; }
    if (tour.mode === 'tour' && (!tour.date || !tour.time)) { err.textContent = 'Please pick a day and a time.'; return; }

    const when = tour.mode === 'tour' ? parseISO(tour.date) : null;
    if (when) { const [h, m] = tour.time.split(':').map(Number); when.setHours(h, m); }
    const payload = {
      type: tour.mode, ...data,
      tour: when ? `${when.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}, ${fmtTime(tour.time)}` : null,
      estimate: estimateAttached ? estimateSummary() : null,
    };
    const btn = $('#tour-submit');
    btn.disabled = true;
    let sent = false;
    if (CENTER.formEndpoint) {
      try {
        const res = await fetch(CENTER.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
        sent = res.ok;
      } catch (_) { sent = false; }
      if (!sent) { btn.disabled = false; err.textContent = `Something went wrong sending that. Please call us on ${CENTER.phone}.`; return; }
    }
    btn.disabled = false;
    showTicket(payload, when, sent);
  });
}
function mailtoFor(p) {
  const subject = p.type === 'tour' ? `Tour request: ${p.tour}` : `Waitlist: ${p.child}`;
  const body = [
    p.type === 'tour' ? `Tour: ${p.tour}` : `Hoped-for start: ${p.start || 'flexible'}`,
    `Parent: ${p.parent}`, `Email: ${p.email}`, `Phone: ${p.phone || '-'}`,
    `Child: ${p.child}, born ${p.dob}${p.room ? ' (' + p.room + ')' : ''}`,
    p.estimate ? `Estimate: ${p.estimate}` : '', p.notes ? `Notes: ${p.notes}` : '',
  ].filter(Boolean).join('\n');
  return `mailto:${CENTER.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
function showTicket(p, when, sent) {
  const t = $('#ticket');
  const head = p.type === 'tour'
    ? `<p class="mono">Tour for ${esc(p.child)}</p><h3>See you ${esc(p.tour)}.</h3>`
    : `<p class="mono">Waitlist</p><h3>${esc(p.child)} is on the list.</h3>`;
  const sendLine = sent
    ? `<p>We've got it, and we'll email ${esc(p.email)} within one working day.</p>`
    : `<p>One last step: send it to us from your email app, and we'll reply within one working day.</p><a class="btn btn-sun" href="${mailtoFor(p)}">Send the request →</a>`;
  t.innerHTML = `<span class="ticket-punch" aria-hidden="true"></span>${head}
    <dl class="mono">
      <div><dt>Room</dt><dd>${esc(p.room || 'We\'ll work it out')}</dd></div>
      ${p.type === 'tour' ? `<div><dt>Where</dt><dd>${esc(CENTER.mapQuery)}</dd></div>` : `<div><dt>Start</dt><dd>${esc(p.start || 'Flexible')}</dd></div>`}
      ${p.estimate ? `<div><dt>Estimate</dt><dd>${esc(p.estimate)}</dd></div>` : ''}
    </dl>
    ${sendLine}
    <p class="ticket-actions">${when ? '<button type="button" class="btn btn-line-light" id="ics">Add to calendar</button>' : ''}<button type="button" class="btn btn-line-light" id="again">Make another request</button></p>`;
  $('#tour-form').hidden = true;
  t.hidden = false;
  t.focus();
  if (when) $('#ics').addEventListener('click', () => {
    const blob = new Blob([icsFor(p, when)], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tumbletown-tour.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
  $('#again').addEventListener('click', () => { t.hidden = true; $('#tour-form').hidden = false; $('#tour-form').reset(); renderTourDays(); });
}

/* ---- Footer wordmark: tumbling letter blocks ---- */
function renderWordmark() {
  const colors = ['tomato', 'sun', 'cobalt', 'clover', 'pink', 'paper'];
  $('#foot-word').innerHTML = [...CENTER.name].map((ch, i) => `<span class="tl c-${colors[i % colors.length]}" style="--r:${[-6, 4, -3, 7, -5, 2, -7, 5, -2, 6][i % 10]}deg" aria-hidden="true">${esc(ch)}</span>`).join('');
}

/* ---- Nav ---- */
function bindNav() {
  const btn = $('#nav-toggle');
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  });
  $$('#nav-links a').forEach((a) => a.addEventListener('click', () => { btn.setAttribute('aria-expanded', 'false'); document.body.classList.remove('menu-open'); }));
}

/* ---- Boot ---- */
fillText();
renderStatus();
renderHours();
renderBlocks();
selectRoom(currentRoom);
bindFinder();
renderDayTabs();
renderHop();
renderTuition();
bindTuition();
renderMagnets();
renderMenu();
renderCalendar();
renderRoll();
renderPromises();
renderReview();
bindReviews();
renderFaq();
setMode('tour');
renderTourDays();
bindTour();
renderWordmark();
bindNav();
// Keep "open now" and "right now" honest while the page sits open.
setInterval(() => { renderStatus(); renderHop(); }, 60000);
