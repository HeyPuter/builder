/* =====================================================================
   CONTENT — edit these to make the site yours.
   ===================================================================== */

const STUDIO = {
  name: 'Ottilie Fenn',
  email: 'hello@ottiliefenn.example',
  phone: '(845) 555-0164',
  replyWithin: 'two days',
  retainer: 0.3, // share of the total that holds a date
};

// The three frames that cycle through the hero.
const HERO_FRAMES = [
  { src: 'photos/window-light.jpg', alt: 'A bride with curled hair, seen from behind, waiting by a tall blue window', caption: 'Agnes, before the aisle — Hollin House', pos: '50% 40%' },
  { src: 'photos/forest-bride.jpg', alt: 'A bride lifting her skirt as she walks into a dark green forest', caption: 'Ines, into the woods — Calder Woods', pos: '50% 50%' },
  { src: 'photos/forest-path.jpg', alt: 'A couple walking away down a forest path under tall trees', caption: 'The walk back — Calder Woods', pos: '56% 50%' },
];

// Contact sheets. `pick` is the index of the circled frame the couple chose.
const STORIES = [
  {
    id: 'lake', couple: 'Juniper & Cole', place: 'Lake Mira, NY', when: 'Sept 2025', film: 'OF 400', pick: 0,
    note: 'Ninety guests, one dock and a thunderstorm that cleared exactly in time for the vows.',
    frames: [
      { src: 'photos/dock.jpg', alt: 'A bride sitting at the end of a wooden dock on a wide lake', caption: 'The end of the dock, 4:10 pm' },
      { src: 'photos/cliff-embrace.jpg', alt: 'A couple embracing on rocks above dark water', caption: 'Above the quarry' },
      { src: 'photos/laughing-veil.jpg', alt: 'A bride laughing as wind lifts her veil', caption: 'Wind, finally' },
      { src: 'photos/pond-dusk.jpg', alt: 'A couple sitting together by a pond at sunset', caption: 'Dusk at the pond' },
      { src: 'photos/ring-bw.jpg', alt: 'Black and white close-up of a hand turning a wedding band', caption: 'Nervous hands' },
    ],
  },
  {
    id: 'woods', couple: 'Ines & Theo', place: 'Calder Woods', when: 'May 2025', film: 'OF 160', pick: 2,
    note: 'An elopement for two, a dog and an officiant who had to be home by six.',
    frames: [
      { src: 'photos/woods-walk.jpg', alt: 'A couple walking hand in hand into green woods', caption: 'Walking in' },
      { src: 'photos/forest-bride.jpg', alt: 'A bride lifting her skirt in a dark forest', caption: 'Lifting the hem' },
      { src: 'photos/forehead-kiss.jpg', alt: 'A groom kissing a bride on the forehead among leaves', caption: 'Just married' },
      { src: 'photos/golden-field.jpg', alt: 'A couple in a field of tall golden grass in late light', caption: 'The field, after' },
      { src: 'photos/forest-path.jpg', alt: 'A couple walking away down a forest path', caption: 'The walk back' },
    ],
  },
  {
    id: 'city', couple: 'Priya & Sam', place: 'City Hall & the river', when: 'Apr 2025', film: 'OF 400', pick: 3,
    note: 'Twelve minutes at city hall, then the whole afternoon wandering the river with friends.',
    frames: [
      { src: 'photos/columns.jpg', alt: 'A couple kissing on the steps in front of tall stone columns', caption: 'The steps' },
      { src: 'photos/footbridge.jpg', alt: 'A couple walking over an arched wooden footbridge', caption: 'Over the bridge' },
      { src: 'photos/stairs.jpg', alt: 'Close-up of a newlywed couple’s legs and shoes on old stone stairs', caption: 'Mill stairs' },
      { src: 'photos/big-sky.jpg', alt: 'A tiny bride standing on a green bank under a huge blue sky', caption: 'All that sky' },
      { src: 'photos/smile-bw.jpg', alt: 'Black and white photo of a bride smiling up at the groom', caption: 'Toasts' },
    ],
  },
  {
    id: 'barn', couple: 'Margot & Lou', place: 'Halsey Barn', when: 'Oct 2024', film: 'OF 800', pick: 4,
    note: 'Long tables, a rope swing and a dance floor that stayed full until the band was asked to leave.',
    frames: [
      { src: 'photos/aisle.jpg', alt: 'Guests turning to watch in a stone church aisle lined with sunflowers', caption: 'Down the aisle' },
      { src: 'photos/long-tables.jpg', alt: 'Long reception tables and benches in a bright timber barn', caption: 'Before anyone sat' },
      { src: 'photos/swing.jpg', alt: 'A wooden rope swing hanging from a tree above rows of white chairs', caption: 'The swing' },
      { src: 'photos/veil-close.jpg', alt: 'A close-up of a veil caught in the light', caption: 'Veil, mid-turn' },
      { src: 'photos/window-dance.jpg', alt: 'A couple dancing by tall windows at night', caption: 'First dance' },
      { src: 'photos/embrace-back.jpg', alt: 'A groom’s hands around a bride’s lace-backed dress', caption: 'Last song' },
    ],
  },
];

// Pricing. A collection is a preset of hours and add-ons; the planner and the
// price list both use the same numbers.
const RATES = { base: 1000, perHour: 550 };

const ADDONS = [
  { id: 'second', name: 'Second photographer', desc: 'Two angles on the vows; guests covered while you have portraits', price: 900 },
  { id: 'film', name: 'Medium-format film', desc: 'Three rolls of 120, hand-developed and scanned', price: 450 },
  { id: 'engagement', name: 'Engagement session', desc: 'Ninety minutes, anywhere you like, before the day', price: 600 },
  { id: 'album', name: 'Linen heirloom album', desc: '30 spreads, lay-flat, designed with you', price: 1200 },
  { id: 'rehearsal', name: 'Rehearsal dinner', desc: 'Two hours the night before', price: 800 },
];

const TRAVEL = [
  { id: 'local', name: 'Hudson Valley & NYC', price: 0 },
  { id: 'northeast', name: 'Elsewhere in the Northeast', price: 350 },
  { id: 'anywhere', name: 'Anywhere else in the world', price: 1500 },
];

const COLLECTIONS = [
  { id: 'elopement', name: 'The <em>Elopement</em>', plain: 'The Elopement', hours: 4, start: 14, addons: [], peek: 'photos/forest-bride.jpg',
    includes: ['One photographer', '250+ edited photographs', 'Help finding the spot'] },
  { id: 'day', name: 'The <em>Day</em>', plain: 'The Day', hours: 8, start: 13, addons: ['second'], peek: 'photos/window-dance.jpg',
    includes: ['Two photographers', '600+ edited photographs', 'A timeline planned together'] },
  { id: 'story', name: 'The Whole <em>Story</em>', plain: 'The Whole Story', hours: 12, start: 11.5, addons: ['second', 'film', 'engagement', 'album'], peek: 'photos/big-sky.jpg',
    includes: ['Everything in The Day', 'Engagement session', 'Medium-format film', 'Linen heirloom album'] },
];

// A typical wedding day, in 24h decimal hours.
const DAY_MOMENTS = [
  { t: 11, label: 'Getting ready' },
  { t: 13, label: 'Details & dress' },
  { t: 14.5, label: 'First look' },
  { t: 16, label: 'Ceremony' },
  { t: 17, label: 'Family photos' },
  { t: 18.5, label: 'Golden hour' },
  { t: 19.5, label: 'Toasts' },
  { t: 20.5, label: 'First dance' },
  { t: 22, label: 'Dance floor' },
  { t: 23.5, label: 'Sparkler exit' },
];
const DAY_RANGE = [10, 24];

// Availability. Anything not listed is open.
const BOOKED = [
  '2026-10-24', '2026-10-31', '2026-11-07', '2026-12-12', '2027-01-16', '2027-02-13', '2027-03-20', '2027-04-17', '2027-04-24',
  '2027-05-01', '2027-05-15', '2027-05-22', '2027-05-29', '2027-06-05', '2027-06-12', '2027-06-26',
  '2027-07-10', '2027-07-24', '2027-08-07', '2027-08-21', '2027-09-04', '2027-09-11', '2027-09-25', '2027-10-09', '2027-10-16',
  '2027-10-23', '2027-11-06', '2027-02-26',
];
const HELD = ['2026-11-14', '2027-06-19', '2027-07-31', '2027-09-18', '2027-10-02', '2027-12-04'];
const PEAK_MONTHS = [4, 5, 6, 7, 8, 9]; // May–October (0 = January)

const LETTERS = [
  { text: 'We forgot you were there, and then the gallery arrived and we cried at our kitchen table for an hour.', who: 'Juniper & Cole — Lake Mira, Sept 2025', img: 'photos/dock.jpg' },
  { text: 'She found the one picture of my grandmother laughing that day. That frame is on every wall in our family now.', who: 'Margot & Lou — Halsey Barn, Oct 2024', img: 'photos/window-dance.jpg' },
  { text: 'Our elopement was four hours long and somehow every minute of it is in there, even the dog stealing the bouquet.', who: 'Ines & Theo — Calder Woods, May 2025', img: 'photos/forehead-kiss.jpg' },
  { text: 'Calm, funny, invisible when it mattered. Our friends still ask who took the pictures.', who: 'Priya & Sam — City Hall, Apr 2025', img: 'photos/big-sky.jpg' },
];

const FACTS = [
  ['Weddings', '212'],
  ['Based in', 'Kingston, NY'],
  ['Cameras', 'Two digital, one Pentax 67'],
  ['Gallery in', '6–8 weeks'],
  ['Sneak peek', '72 hours'],
  ['Languages', 'English, French'],
];

const PROCESS = [
  { title: 'Write to me', body: 'Send the form below. I reply within two days with availability and a few questions.' },
  { title: 'A short call', body: 'Twenty minutes to see if we like each other. No pressure, no sales pitch.' },
  { title: 'Hold the date', body: 'A simple contract and a 30% retainer. The rest is due a month before.' },
  { title: 'Plan, then party', body: 'We build the day’s timeline together. On the day, you forget I’m there.' },
];

const FAQS = [
  { q: 'How many photographs will we get?', a: 'Roughly 75 to 100 per hour of coverage, every one edited by me. You get them in an online gallery you can share, download and order prints from.' },
  { q: 'Do you direct or pose people?', a: 'Very little. We make a short set of portraits together and I’ll organise family groups quickly with a list you send ahead. Otherwise I watch and wait.' },
  { q: 'How far ahead should we book?', a: 'Nine to fourteen months for a summer Saturday. Weekdays, winter dates and elopements often open up much closer to the day; it is always worth asking.' },
  { q: 'Do you travel?', a: 'Gladly. Within the Hudson Valley and NYC there is no travel fee. Elsewhere in the Northeast is a flat $350, and anywhere else in the world a flat $1,500 that covers flights and a room.' },
  { q: 'What if it rains?', a: 'Some of my favourite pictures were made in the rain. I carry clear umbrellas and we’ll have a covered plan B for portraits.' },
  { q: 'Can we change our collection later?', a: 'Yes. Add hours, a second photographer or an album any time up to a month before the wedding.' },
];

/* =====================================================================
   HELPERS
   ===================================================================== */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const pad2 = (n) => String(n).padStart(2, '0');
const fmtTime = (t) => {
  const h = Math.floor(t) % 24, m = Math.round((t - Math.floor(t)) * 60);
  return `${pad2(h)}:${pad2(m)}`;
};
const iso = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = new Date(); today.setHours(0, 0, 0, 0);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* =====================================================================
   BAR + MENU
   ===================================================================== */

const bar = $('#bar');
const nav = $('#nav');
const menuBtn = $('#menuBtn');
const onScroll = () => bar.classList.toggle('is-scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

function setMenu(open) {
  nav.classList.toggle('is-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.textContent = open ? 'Close' : 'Menu';
}
menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
nav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setMenu(false); menuBtn.focus(); } });

/* =====================================================================
   HERO: cycling frame
   ===================================================================== */

{
  const img = $('#heroImg');
  const count = $('#heroCount');
  const cap = $('#heroCap');
  let i = 0;
  const show = (n) => {
    const f = HERO_FRAMES[n];
    img.classList.add('is-fading');
    setTimeout(() => {
      img.src = f.src; img.alt = f.alt; img.style.objectPosition = f.pos;
      count.textContent = `FR. ${pad2(n + 1)}/${pad2(HERO_FRAMES.length)}`;
      cap.textContent = f.caption;
      img.classList.remove('is-fading');
    }, 450);
  };
  HERO_FRAMES.slice(1).forEach((f) => { const p = new Image(); p.src = f.src; });
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce && HERO_FRAMES.length > 1) setInterval(() => { if (!document.hidden) { i = (i + 1) % HERO_FRAMES.length; show(i); } }, 5200);
}

/* =====================================================================
   CONTACT SHEETS + LOUPE
   ===================================================================== */

const sheets = $('#sheets');
const tabs = $('#storyTabs');
let loupeList = [];
let loupeIndex = 0;

function renderTabs(active) {
  const items = [{ id: 'all', label: 'All four' }, ...STORIES.map((s) => ({ id: s.id, label: s.couple }))];
  tabs.innerHTML = items.map((t) =>
    `<button type="button" role="tab" data-story="${t.id}" aria-selected="${t.id === active}">${esc(t.label)}</button>`).join('');
}

function renderSheets(active) {
  const list = active === 'all' ? STORIES : STORIES.filter((s) => s.id === active);
  loupeList = [];
  sheets.innerHTML = list.map((s) => {
    const frames = s.frames.map((f, k) => {
      const idx = loupeList.push({ ...f, story: s }) - 1;
      const edge = `${s.film.split(' ')[1]} ▸ ${k * 2 + 12}${k % 2 ? 'A' : ''}`;
      return `<button class="frame" type="button" data-i="${idx}" aria-label="Open: ${esc(f.caption)}, ${esc(s.couple)}">
        <span class="edge" aria-hidden="true">${edge}</span>
        <img src="${f.src}" alt="${esc(f.alt)}" loading="lazy" width="300" height="200">
        ${k === s.pick ? '<span class="grease" aria-hidden="true"></span>' : ''}
      </button>`;
    }).join('');
    return `<article class="sheet">
      <div class="sheet-head">
        <h3>${esc(s.couple)} <em>— ${esc(s.place)}</em></h3>
        <span class="mono">${esc(s.film)} · ${esc(s.when)} · ${s.frames.length} frames</span>
      </div>
      <div class="strip" style="--n:${s.frames.length}">${frames}</div>
      ${active !== 'all' ? `<p class="sheet-note">${esc(s.note)}</p>` : ''}
    </article>`;
  }).join('');
}

function setStory(id) { renderTabs(id); renderSheets(id); }
tabs.addEventListener('click', (e) => { const b = e.target.closest('button[data-story]'); if (b) setStory(b.dataset.story); });
tabs.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const btns = $$('button', tabs);
  const cur = btns.indexOf(document.activeElement);
  if (cur < 0) return;
  const next = btns[(cur + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
  setStory(next.dataset.story);
  $(`button[data-story="${next.dataset.story}"]`, tabs).focus();
});
setStory('all');

const loupe = $('#loupe');
const loupeImg = $('#loupeImg');
let loupeReturn = null;
function openLoupe(i) {
  loupeReturn = document.activeElement;
  loupe.hidden = false;
  document.body.style.overflow = 'hidden';
  showLoupe(i);
  $('#loupeClose').focus();
}
function showLoupe(i) {
  loupeIndex = (i + loupeList.length) % loupeList.length;
  const f = loupeList[loupeIndex];
  loupeImg.src = f.src; loupeImg.alt = f.alt;
  $('#loupeCount').textContent = `${pad2(loupeIndex + 1)} / ${pad2(loupeList.length)}`;
  $('#loupeCap').textContent = `${f.caption} — ${f.story.couple}`;
}
function closeLoupe() {
  loupe.hidden = true;
  document.body.style.overflow = '';
  if (loupeReturn) loupeReturn.focus();
}
sheets.addEventListener('click', (e) => { const f = e.target.closest('.frame'); if (f) openLoupe(Number(f.dataset.i)); });
$('#loupeClose').addEventListener('click', closeLoupe);
$('#loupePrev').addEventListener('click', () => showLoupe(loupeIndex - 1));
$('#loupeNext').addEventListener('click', () => showLoupe(loupeIndex + 1));
loupe.addEventListener('click', (e) => { if (e.target === loupe) closeLoupe(); });
document.addEventListener('keydown', (e) => {
  if (loupe.hidden) return;
  if (e.key === 'Escape') closeLoupe();
  else if (e.key === 'ArrowLeft') showLoupe(loupeIndex - 1);
  else if (e.key === 'ArrowRight') showLoupe(loupeIndex + 1);
  else if (e.key === 'Tab') {
    const f = $$('button', loupe);
    const i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  }
});
{
  let x0 = null;
  loupe.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  loupe.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) showLoupe(loupeIndex + (dx < 0 ? 1 : -1));
    x0 = null;
  });
}

/* =====================================================================
   PLANNER: timeline + estimate
   ===================================================================== */

const plan = { start: 12, hours: 8, addons: new Set(), travel: TRAVEL[0].id };

function priceOf({ hours, addons, travel }) {
  const lines = [[`${hours} hours of coverage`, RATES.base + hours * RATES.perHour]];
  for (const a of ADDONS) if (addons.has(a.id)) lines.push([a.name, a.price]);
  const t = TRAVEL.find((x) => x.id === travel);
  if (t && t.price) lines.push([`Travel — ${t.name.toLowerCase()}`, t.price]);
  return { lines, total: lines.reduce((n, l) => n + l[1], 0) };
}

{
  const [a, b] = DAY_RANGE, span = b - a;
  $('#tlMoments').innerHTML = DAY_MOMENTS.map((m, k) => {
    const x = ((m.t - a) / span) * 100;
    const edge = x < 6 ? ' edge-l' : x > 94 ? ' edge-r' : '';
    return `<li class="tl-m ${k % 2 ? 'down' : 'up'}${edge}" style="--x:${x}%" data-t="${m.t}">
      <span class="tl-l">${esc(m.label)}</span><span class="tl-t mono">${fmtTime(m.t)}</span></li>`;
  }).join('');
  const hrs = [];
  for (let h = a; h <= b; h += 2) hrs.push(`<span>${fmtTime(h)}</span>`);
  $('#tlHours').innerHTML = hrs.join('');

  $('#addonList').innerHTML = ADDONS.map((ad) => `<label class="addon">
    <input type="checkbox" value="${ad.id}">
    <span><span class="a-name">${esc(ad.name)}</span><span class="a-desc">${esc(ad.desc)}</span></span>
    <span class="a-cost">+${money(ad.price)}</span></label>`).join('');
  $('#travelIn').innerHTML = TRAVEL.map((t) => `<option value="${t.id}">${esc(t.name)}${t.price ? ` (+${money(t.price)})` : ' (no fee)'}</option>`).join('');
}

const startIn = $('#startIn');
const hoursIn = $('#hoursIn');

function renderPlan() {
  const [a, b] = DAY_RANGE, span = b - a;
  // Keep the window inside the day.
  if (plan.start + plan.hours > b) plan.start = Math.max(a, b - plan.hours);
  startIn.value = plan.start; hoursIn.value = plan.hours;
  const end = plan.start + plan.hours;
  $('#startOut').textContent = fmtTime(plan.start);
  $('#hoursOut').textContent = `${plan.hours} hours`;
  const win = $('#tlWindow');
  win.style.left = ((plan.start - a) / span) * 100 + '%';
  win.style.width = (plan.hours / span) * 100 + '%';
  $('#tlWindowLabel').textContent = `${fmtTime(plan.start)} → ${fmtTime(end)}`;

  const missed = [];
  $$('.tl-m').forEach((li) => {
    const t = Number(li.dataset.t);
    const inside = t >= plan.start && t <= end;
    li.classList.toggle('is-in', inside);
    li.classList.toggle('is-out', !inside);
    if (!inside) missed.push(li.querySelector('.tl-l').textContent.toLowerCase());
  });

  $$('#addonList input').forEach((i) => { i.checked = plan.addons.has(i.value); });
  $('#travelIn').value = plan.travel;

  const { lines, total } = priceOf(plan);
  $('#quoteTotal').textContent = money(total);
  $('#quoteLines').innerHTML = lines.map(([n, p]) => `<li><span>${esc(n)}</span><span>${money(p)}</span></li>`).join('') +
    `<li><span>Retainer to hold the date</span><span>${money(total * STUDIO.retainer)}</span></li>`;
  $('#quoteMisses').textContent = missed.length
    ? `You’d miss: ${missed.join(', ')}.`
    : 'You’d have all of it, start to finish.';
}

startIn.addEventListener('input', () => {
  plan.start = Number(startIn.value);
  if (plan.start + plan.hours > DAY_RANGE[1]) plan.hours = Math.max(4, DAY_RANGE[1] - plan.start);
  renderPlan();
});
hoursIn.addEventListener('input', () => { plan.hours = Number(hoursIn.value); renderPlan(); });
$('#addonList').addEventListener('change', (e) => {
  if (e.target.checked) plan.addons.add(e.target.value); else plan.addons.delete(e.target.value);
  renderPlan();
});
$('#travelIn').addEventListener('change', (e) => { plan.travel = e.target.value; renderPlan(); });
renderPlan();

function planSummary() {
  const { lines, total } = priceOf(plan);
  return `${fmtTime(plan.start)}–${fmtTime(plan.start + plan.hours)} · ` + lines.map((l) => l[0]).join(' + ') + ` · est. ${money(total)}`;
}

/* =====================================================================
   COLLECTIONS: price list
   ===================================================================== */

{
  const roman = ['I', 'II', 'III', 'IV', 'V'];
  $('#priceList').innerHTML = COLLECTIONS.map((c, k) => {
    const { total } = priceOf({ hours: c.hours, addons: new Set(c.addons), travel: TRAVEL[0].id });
    return `<li class="price" data-peek="${c.peek}">
      <span class="price-num">${roman[k]}.</span>
      <h3 class="price-name">${c.name}</h3>
      <span class="price-hours mono">${c.hours} hours</span>
      <p class="price-cost"><small>From</small>${money(total)}</p>
      <button class="btn price-go" type="button" data-collection="${c.id}">Plan it <span aria-hidden="true">→</span></button>
      <ul class="price-incl mono">${c.includes.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
    </li>`;
  }).join('');

  $('#priceList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-collection]');
    if (!b) return;
    const c = COLLECTIONS.find((x) => x.id === b.dataset.collection);
    plan.hours = c.hours; plan.start = c.start; plan.addons = new Set(c.addons);
    renderPlan();
    $('#fCollection').value = c.id;
    $('#day').scrollIntoView({ behavior: 'smooth' });
  });

  // A photo follows the cursor over each row (mouse only).
  const peek = $('#hoverPeek');
  const peekImg = $('img', peek);
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.price').forEach((row) => {
      row.addEventListener('mouseenter', () => { peekImg.src = row.dataset.peek; peek.classList.add('is-on'); });
      row.addEventListener('mouseleave', () => peek.classList.remove('is-on'));
      row.addEventListener('mousemove', (e) => { peek.style.left = e.clientX + 150 + 'px'; peek.style.top = e.clientY + 'px'; });
    });
  }
}

/* =====================================================================
   AVAILABILITY
   ===================================================================== */

const bookedSet = new Set(BOOKED);
const heldSet = new Set(HELD);
let pickedIso = null;

function statusOf(dateIso) {
  const d = parseIso(dateIso);
  if (d < today) return 'past';
  if (bookedSet.has(dateIso)) return 'booked';
  if (heldSet.has(dateIso)) return 'held';
  return 'open';
}

function saturdays(year) {
  const out = [];
  const d = new Date(year, 0, 1);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  while (d.getFullYear() === year) { out.push(new Date(d)); d.setDate(d.getDate() + 7); }
  return out;
}

const thisYear = today.getFullYear();
const YEARS = [thisYear, thisYear + 1];
let shownYear = YEARS[1];

function renderYear() {
  $('#yearSwitch').innerHTML = YEARS.map((y) => `<button type="button" data-year="${y}" aria-pressed="${y === shownYear}">${y}</button>`).join('');
  const byMonth = MONTHS.map(() => []);
  saturdays(shownYear).forEach((d) => byMonth[d.getMonth()].push(d));
  $('#yearDots').innerHTML = byMonth.map((days, m) => `<div class="ym"><span class="ym-name">${MONTHS[m]}</span>${days.map((d) => {
    const k = iso(d), st = statusOf(k);
    const label = `${d.getDate()} ${MONTHS[m]} — ${st === 'past' ? 'passed' : st === 'held' ? 'on hold' : st}`;
    return `<button type="button" class="dot is-${st}${k === pickedIso ? ' is-picked' : ''}" data-date="${k}" aria-label="${label}" title="${label}"${st === 'past' ? ' disabled' : ''}></button>`;
  }).join('')}</div>`).join('');
}

function pickDate(dateIso) {
  pickedIso = dateIso;
  const d = parseIso(dateIso);
  const st = statusOf(dateIso);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  $('#dateWhen').textContent = d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const cta = $('#dateCta');
  const copy = {
    open: ['Open.', d.getDay() === 6
      ? 'That Saturday is free. Dates go quickly; a short call and a retainer hold it for you.'
      : `${weekday}s are wonderfully quiet, and weekday weddings get 15% off any collection.`],
    held: ['On hold.', 'Another couple is holding it for a few more days. Write to me and you’ll be first in line if it opens up.'],
    booked: ['Booked.', 'I’m already somewhere that day. Ask me about a trusted associate photographer, or a day either side.'],
    past: ['Passed.', 'That date is behind us. Pick one that’s still to come.'],
  }[st];
  $('#dateStatus').textContent = copy[0];
  $('#dateNote').textContent = copy[1];
  cta.hidden = st === 'past';
  cta.firstChild.textContent = st === 'open' ? 'Hold this date ' : st === 'held' ? 'Join the waitlist ' : 'Ask about it ';
  $('#dateIn').value = dateIso;
  if (d.getFullYear() !== shownYear && YEARS.includes(d.getFullYear())) shownYear = d.getFullYear();
  renderYear();
}

$('#yearSwitch').addEventListener('click', (e) => { const b = e.target.closest('[data-year]'); if (b) { shownYear = Number(b.dataset.year); renderYear(); } });
$('#yearDots').addEventListener('click', (e) => { const b = e.target.closest('[data-date]'); if (b && !b.disabled) pickDate(b.dataset.date); });
$('#dateIn').min = iso(today);
$('#dateIn').addEventListener('change', (e) => { if (e.target.value) pickDate(e.target.value); });
$('#dateCta').addEventListener('click', () => { if (pickedIso) $('#fDate').value = pickedIso; });
renderYear();

// Start with next season's first open Saturday picked, so the panel is never empty.
{
  const next = saturdays(YEARS[1]).find((d) => PEAK_MONTHS.includes(d.getMonth()) && statusOf(iso(d)) === 'open');
  if (next) pickDate(iso(next));
}

// "N Saturdays left" in the hero: open peak-season Saturdays next year.
{
  const y = YEARS[1];
  const left = saturdays(y).filter((d) => PEAK_MONTHS.includes(d.getMonth()) && statusOf(iso(d)) === 'open').length;
  $('#datesLeft').textContent = left;
  $('#datesLeftYear').textContent = y;
}

/* =====================================================================
   LETTERS
   ===================================================================== */

{
  let i = 0;
  const box = $('#letter');
  const show = (n, animate = true) => {
    i = (n + LETTERS.length) % LETTERS.length;
    const L = LETTERS[i];
    const apply = () => {
      $('#letterText').textContent = L.text;
      $('#letterWho').textContent = L.who;
      $('#letterImg').src = L.img;
      $('#letterCount').textContent = `${pad2(i + 1)} / ${pad2(LETTERS.length)}`;
      box.classList.remove('is-fading');
    };
    if (!animate) return apply();
    box.classList.add('is-fading');
    setTimeout(apply, 300);
  };
  $('#letterPrev').addEventListener('click', () => show(i - 1));
  $('#letterNext').addEventListener('click', () => show(i + 1));
  show(0, false);
}

/* =====================================================================
   ABOUT, PROCESS, FAQ
   ===================================================================== */

$('#facts').innerHTML = FACTS.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
$('#process').innerHTML = PROCESS.map((p) => `<li><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></li>`).join('');
$('#faqList').innerHTML = FAQS.map((f, k) => `<details${k === 0 ? ' open' : ''}><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('');

/* =====================================================================
   INQUIRY
   ===================================================================== */

const form = $('#inqForm');
const done = $('#inqDone');
$('#emailLink').href = `mailto:${STUDIO.email}`;
$('#emailLink').textContent = STUDIO.email;
$('#phoneText').textContent = STUDIO.phone;
$('#fCollection').innerHTML = '<option value="">Not sure yet</option>' +
  COLLECTIONS.map((c) => `<option value="${c.id}">${esc(c.plain)}</option>`).join('') +
  '<option value="custom">My own plan (from the planner)</option>';
$('#fDate').min = iso(today);

$('#sendPlan').addEventListener('click', () => {
  $('#fPlan').value = planSummary();
  $('#fPlanWrap').hidden = false;
  $('#fCollection').value = 'custom';
  if (pickedIso && !$('#fDate').value) $('#fDate').value = pickedIso;
  $('#inquire').scrollIntoView({ behavior: 'smooth' });
  setTimeout(() => $('#fNames').focus({ preventScroll: true }), 600);
});
$('#fCollection').addEventListener('change', (e) => {
  if (e.target.value === 'custom') { $('#fPlan').value = planSummary(); $('#fPlanWrap').hidden = false; }
  else $('#fPlanWrap').hidden = true;
});

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const names = $('#fNames'), email = $('#fEmail'), msg = $('#fMessage'), date = $('#fDate');
  const problems = [];
  [names, email, msg, date].forEach((f) => f.classList.remove('is-invalid'));
  if (!names.value.trim()) { problems.push('your names'); names.classList.add('is-invalid'); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) { problems.push('an email I can reply to'); email.classList.add('is-invalid'); }
  if (msg.value.trim().length < 10) { problems.push('a few words about you two'); msg.classList.add('is-invalid'); }
  if (date.value && parseIso(date.value) < today) { problems.push('a date that hasn’t passed'); date.classList.add('is-invalid'); }
  const err = $('#fError');
  if (problems.length) {
    err.textContent = 'Almost — I still need ' + problems.join(', ') + '.';
    err.hidden = false;
    form.querySelector('.is-invalid').focus();
    return;
  }
  err.hidden = true;

  const first = names.value.trim().split(/\s*(?:&|and|\+)\s*/i)[0];
  let when = 'your day';
  if (date.value) {
    const st = statusOf(date.value);
    const d = parseIso(date.value).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    when = st === 'open' ? `${d} — and good news, it’s still open` : st === 'held' ? `${d}, which is on hold — you’re first on the waitlist` : `${d}, which is booked — I’ll suggest someone I trust`;
  }
  $('#doneTitle').textContent = `Thank you, ${first}.`;
  $('#doneText').textContent = `I’ve got your letter about ${when}. I’ll write back to ${email.value.trim()} within ${STUDIO.replyWithin}.`;
  form.hidden = true;
  done.hidden = false;
  done.focus();
});
$('#inqAgain').addEventListener('click', () => {
  form.reset();
  $('#fPlanWrap').hidden = true;
  done.hidden = true;
  form.hidden = false;
  $('#fNames').focus();
});
