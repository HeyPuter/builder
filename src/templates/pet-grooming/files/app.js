// Soapdish — dog & cat grooming.
// Everything a salon would change lives in the data block below: details,
// hours, prices by size and coat, add-ons, groomers, regulars, reviews, FAQ.
// The rest of the file renders it and runs the booking, ticket and tracker.

// ---------------------------------------------------------------- content --

const SHOP = {
  name: 'Soapdish',
  kind: 'Dog & cat grooming',
  address: '418 Linden Row, Portland, OR',
  mapQuery: '418 Linden Row Portland OR',
  parking: 'Two drop-off spaces out front, 10 minutes free.',
  phone: '(503) 555-0148',
  email: 'hello@soapdish.example',
  social: '@soapdish.grooming',
  // Bookings are saved in the visitor's browser and shown on their ticket.
  // Set an endpoint (Formspree, a webhook, your own API) to also POST each
  // booking there as JSON; leave it empty to skip.
  bookingEndpoint: '',
  // How far ahead people can book, in days.
  bookingWindow: 14,
  claimPrefix: 'SD',
};

// 24h clock, [open, close]; null = closed. Index 0 is Sunday.
const HOURS = [
  [9, 15],   // Sun
  null,      // Mon
  [8, 18],   // Tue
  [8, 18],   // Wed
  [8, 18],   // Thu
  [8, 18],   // Fri
  [8, 16],   // Sat
];

// Cat grooms only run in the quiet hours: these days, until this hour.
const CAT_HOURS = { days: [2, 4], until: 11 };

const SIZES = [
  { id: 'xs', label: 'XS', word: 'tiny',   weight: 'under 10 lb', scale: 0.46 },
  { id: 's',  label: 'S',  word: 'small',  weight: '10–25 lb',    scale: 0.6 },
  { id: 'm',  label: 'M',  word: 'medium', weight: '25–50 lb',    scale: 0.74 },
  { id: 'l',  label: 'L',  word: 'large',  weight: '50–80 lb',    scale: 0.88 },
  { id: 'xl', label: 'XL', word: 'giant',  weight: '80 lb +',     scale: 1 },
];

// price: multiplier on the base price; extra: added minutes.
const COATS = [
  { id: 'smooth', label: 'Short & smooth', note: 'labs, beagles, pugs', price: 1,    extra: 0 },
  { id: 'double', label: 'Thick double',   note: 'huskies, goldens, corgis', price: 1.15, extra: 15 },
  { id: 'curly',  label: 'Curly or long',  note: 'doodles, poodles, shih tzus', price: 1.25, extra: 30 },
];

// prices / minutes are per size, XS → XL. `cat` services ignore size and coat.
const SERVICES = [
  { id: 'full', name: 'Full groom', desc: 'Bath, blow-dry, haircut to your brief, nails, ears and a sanitary tidy.',
    prices: [65, 75, 90, 110, 135], minutes: [90, 105, 120, 150, 180] },
  { id: 'bath', name: 'Bath & tidy', desc: 'Two-shampoo bath, hand-dry, brush-out, nails, and a trim around face, feet and bum.',
    prices: [45, 52, 62, 75, 92], minutes: [60, 60, 75, 90, 105] },
  { id: 'deshed', name: 'De-shed spa', desc: 'For the dogs who leave a second dog on the sofa. Conditioning mask and a long blow-out.',
    prices: [55, 62, 78, 95, 118], minutes: [75, 75, 90, 105, 120] },
  { id: 'puppy', name: 'Puppy intro', desc: 'Under six months. A short, gentle first bath with lots of breaks and treats.',
    prices: [40, 40, 45, 50, 55], minutes: [45, 45, 45, 60, 60], flat: true },
  { id: 'nails', name: 'Nails & paws', desc: 'Clip or grind, paw-pad trim and balm. Walk-ins welcome before noon.',
    prices: [20, 20, 22, 24, 26], minutes: [20, 20, 20, 30, 30], flat: true },
  { id: 'cat', name: 'Cat groom', desc: 'Bath or waterless wash, comb-out, de-matting or a lion cut, nails. Quiet hours only.',
    prices: [75, 75, 75, 75, 75], minutes: [75, 75, 75, 75, 75], cat: true },
];

const ADDONS = [
  { id: 'teeth',   name: 'Teeth brushing',         price: 10 },
  { id: 'facial',  name: 'Blueberry facial',       price: 8 },
  { id: 'grind',   name: 'Nail grind (smooth edges)', price: 12 },
  { id: 'balm',    name: 'Paw balm',               price: 6 },
  { id: 'flea',    name: 'Flea & tick shampoo',    price: 14 },
  { id: 'bandana', name: 'Bandana or bow',         price: 0 },
];

// days: the weekdays each groomer works (0 = Sunday).
const GROOMERS = [
  { id: 'any',     name: 'whoever is free', days: [0, 2, 3, 4, 5, 6] },
  { id: 'marisol', name: 'Marisol (scissor work, doodles)', days: [2, 3, 4, 5, 6] },
  { id: 'theo',    name: 'Theo (big double coats)', days: [0, 3, 4, 5, 6] },
  { id: 'june',    name: 'June (cats, nervous first-timers)', days: [0, 2, 3, 4, 5] },
];

// The five stations of every visit, used by the tracker.
// `at` is where each one starts, as a share of the appointment's length.
const STAGES = [
  { name: 'Check-in', note: 'Nose-to-tail look-over and a brush-out.', at: 0 },
  { name: 'The tub', note: 'Two shampoos, warm water, a good rinse.', at: 0.12 },
  { name: 'Hand-dry', note: 'Towel, then a low, quiet blower. No cage dryers.', at: 0.4 },
  { name: 'Cut & tidy', note: 'Haircut, nails, ears, the finishing comb.', at: 0.62 },
  { name: 'Ready!', note: "We text you. Bandana on, waiting at the front.", at: 0.95 },
];

const REGULARS = [
  { pet: 'Pickle',  breed: 'Pomeranian',       cut: 'Round teddy face',          photo: 'photos/pomeranian.jpg' },
  { pet: 'Juniper', breed: 'Maine coon',       cut: 'Belly shave, comb-out',     photo: 'photos/maine-coon.jpg' },
  { pet: 'Rufus',   breed: 'Cavalier',         cut: 'Feathered ears, neat feet', photo: 'photos/cavalier.jpg', focus: '50% 22%' },
  { pet: 'Frank',   breed: 'Dachshund',        cut: 'Bath & nails, every 4 weeks', photo: 'photos/dachshund.jpg' },
  { pet: 'Bao',     breed: 'Cotton mix',       cut: 'Short summer cut',          photo: 'photos/smiley-mix.jpg', focus: '50% 35%' },
  { pet: 'Honey',   breed: 'Golden retriever', cut: 'De-shed spa',               photo: 'photos/golden.jpg' },
  { pet: 'Miso',    breed: 'Kitten',           cut: 'First nail trim',           photo: 'photos/kitten.jpg', focus: '50% 40%' },
  { pet: 'Gus',     breed: 'Chow mix',         cut: 'Lion-ish, by request',      photo: 'photos/fluffy-mix.jpg' },
  { pet: 'Dot',     breed: 'Bichon',           cut: 'Puppy cut, pom-pom tail',   photo: 'photos/running-bichon.jpg' },
];

const REVIEWS = [
  { quote: 'Otis came home looking like a cloud and, for the first time ever, not shaking. They texted me a photo halfway through.', who: 'Dana, with Otis (bernedoodle)' },
  { quote: 'The only place my cat has ever come back from without a grudge. The quiet-hours thing is real.', who: 'Priya, with Mochi (Persian)' },
  { quote: 'They told me the price for a 70 lb husky before I booked, and that was the price at pickup. Revolutionary.', who: 'Marcus, with Koda (husky)' },
  { quote: 'June spent ten minutes just letting our rescue sniff the tub. Worth every cent.', who: 'Ellie, with Bean (terrier mix)' },
];

const FIRST_VISIT = [
  { title: 'Bring proof of vaccines', body: 'Rabies and distemper for everyone, bordetella for dogs. A photo of the vet record on your phone is fine.' },
  { title: 'Walk them first', body: 'A short walk before drop-off means a calmer bath and fewer accidents on the table.' },
  { title: 'Show us a picture', body: "Bring a photo of the cut you like. \"A bit shorter\" means something different to everyone." },
  { title: 'Leave your mobile on', body: 'We text a photo when they are in the tub and again when they are ready. Pickup within 30 minutes, please.' },
];

const POLICIES = [
  { term: 'Cancelling', desc: 'Free up to 24 hours before. Later than that, or no-shows, are charged half the estimate.' },
  { term: 'Matting', desc: 'Heavy mats are shaved out, not brushed, because brushing them hurts. We call you before we do.' },
  { term: 'Late pickup', desc: '$1 a minute after the first 30, so the next dog is not waiting.' },
  { term: 'Seniors & nervous dogs', desc: 'We book them first thing, with extra time and breaks, at no extra cost.' },
  { term: 'Paying', desc: 'Card, cash or tap at pickup. Tips are shared with the whole team.' },
];

const FAQ = [
  { q: 'How often should my dog be groomed?', a: 'Curly and long coats every 4–6 weeks, double coats every 6–8, short coats every 8–12 or when they start to smell like a dog again.' },
  { q: 'Can I stay and watch?', a: "Most dogs settle faster when their person leaves, so we don't have a viewing window. We do text photos while they are with us." },
  { q: 'Do you use cage dryers?', a: 'Never. Every dog and cat is towel- and hand-dried with a low, quiet blower.' },
  { q: "What if my dog won't let you finish?", a: "We stop. You pay for the part we did, and we suggest a short practice visit or a vet-assisted groom." },
  { q: 'Do you take aggressive dogs?', a: "We take dogs who are scared, and we're good with them. If a dog bites, we stop the groom and call you; muzzles are used only with your OK." },
  { q: 'Is the price on the site the price I pay?', a: 'Yes, for a coat in normal condition. If we find heavy matting or fleas we call you before doing anything that changes the price.' },
];

const MARQUEE = 'fresh · fluffy · fussed over · hand-dried · ';

// ------------------------------------------------------------- utilities --

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + Math.round(n);
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pad = (n) => String(n).padStart(2, '0');
const fmtHour = (h) => {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
  const ap = hh >= 12 ? 'pm' : 'am';
  const h12 = ((hh + 11) % 12) + 1;
  return mm ? `${h12}:${pad(mm)}${ap}` : `${h12}${ap}`;
};
const fmtTime = (d) => fmtHour(d.getHours() + d.getMinutes() / 60);
const fmtDay = (d) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('soapdish.' + key); return v == null ? fallback : JSON.parse(v); } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('soapdish.' + key, JSON.stringify(value)); } catch { /* private mode: keep going */ }
  },
};

function toast(msg) {
  const t = $('[data-toast]');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

// Small deterministic hash, so the same slot is "taken" on every visit.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967295;
}

// ---------------------------------------------------------- shop details --

function renderShop() {
  $$('[data-shop]').forEach((el) => {
    const v = SHOP[el.dataset.shop];
    if (v != null) el.textContent = el.dataset.shop === 'name' && el.closest('.mark') ? v.toLowerCase() : v;
  });
  const tel = SHOP.phone.replace(/[^\d+]/g, '');
  $$('[data-phone-link]').forEach((a) => { a.href = 'tel:' + tel; a.textContent = SHOP.phone; });
  $$('[data-email-link]').forEach((a) => { a.href = 'mailto:' + SHOP.email; a.textContent = SHOP.email; });
  $$('[data-map-link]').forEach((a) => { a.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(SHOP.mapQuery); });
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // Hours table, today highlighted.
  const today = new Date().getDay();
  const order = [2, 3, 4, 5, 6, 0, 1];
  $('[data-hours]').innerHTML = order.map((d) => {
    const h = HOURS[d];
    return `<tr${d === today ? ' class="today"' : ''}><th scope="row">${DAYS[d]}</th><td>${h ? `${fmtHour(h[0])}–${fmtHour(h[1])}` : 'Closed'}</td></tr>`;
  }).join('');

  // Short hours line for the hero, e.g. "Tue–Fri 8am–6pm · Sat 8am–4pm · Sun 9am–3pm".
  const groups = [];
  for (const d of order) {
    const h = HOURS[d];
    if (!h) continue;
    const label = `${fmtHour(h[0])}–${fmtHour(h[1])}`;
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.to = d; else groups.push({ from: d, to: d, label });
  }
  const short = (d) => DAYS[d].slice(0, 3);
  $$('[data-hours-short]').forEach((el) => {
    el.textContent = groups.map((g) => `${short(g.from)}${g.to !== g.from ? '–' + short(g.to) : ''} ${g.label}`).join(' · ');
  });
}

// Open / closed right now, and when that changes.
function openState(now = new Date()) {
  const h = HOURS[now.getDay()];
  const hr = now.getHours() + now.getMinutes() / 60;
  if (h && hr >= h[0] && hr < h[1]) return { open: true, text: `Open until ${fmtHour(h[1])} today` };
  for (let i = 0; i < 8; i++) {
    const d = new Date(now); d.setDate(now.getDate() + i);
    const hh = HOURS[d.getDay()];
    if (!hh || (i === 0 && hr >= hh[0])) continue;
    const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAYS[d.getDay()];
    return { open: false, text: `Opens ${when} at ${fmtHour(hh[0])}` };
  }
  return { open: false, text: 'Closed' };
}

function renderOpen() {
  const s = openState();
  const pill = $('[data-open-pill]');
  pill.textContent = s.open ? '● Open now' : '○ Closed';
  pill.classList.toggle('is-open', s.open);
  const word = $('[data-open-word]');
  word.textContent = s.open ? 'OPEN' : 'CLOSED';
  word.classList.toggle('is-closed', !s.open);
  $('[data-open-sub]').textContent = s.text + ' · ' + SHOP.address;
}

// ------------------------------------------------------------ dog's name --

const NAME_KEY = 'name';
let dogName = store.get(NAME_KEY, 'Biscuit') || 'Biscuit';

function setName(name, from) {
  dogName = name.trim().slice(0, 14) || 'your dog';
  store.set(NAME_KEY, name.trim());
  $$('[data-name-echo]').forEach((el) => { el.textContent = dogName; });
  $$('[data-dog-name]').forEach((el) => { if (el !== from) el.value = name.trim(); });
  sizeNameInput();
  fitHero();
}

function copyFont(el) {
  const cs = getComputedStyle(el);
  for (const k of ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'fontVariationSettings']) measurer.style[k] = cs[k];
}

// The hero input grows with the name, like a word in the headline.
const measurer = document.createElement('span');
measurer.className = 'measure';
measurer.setAttribute('aria-hidden', 'true');
document.body.appendChild(measurer);
function sizeNameInput() {
  const input = $('#dog-name');
  copyFont(input);
  measurer.textContent = input.value || input.placeholder || 'Name';
  input.style.width = Math.ceil(measurer.getBoundingClientRect().width + 6) + 'px';
}

// Long names shrink the headline instead of running off the page.
function fitHero() {
  const title = $('.hero-title');
  const line = $('.hero-line-1');
  title.style.removeProperty('--fit');
  sizeNameInput();
  const avail = title.clientWidth;
  let fit = 1;
  // A couple of passes: the input's width follows the font size.
  for (let i = 0; i < 4 && line.scrollWidth > avail; i++) {
    fit *= (avail / line.scrollWidth) * 0.98;
    title.style.setProperty('--fit', fit.toFixed(3));
    sizeNameInput();
  }
}

function initName() {
  const hero = $('#dog-name');
  hero.value = store.get(NAME_KEY, 'Biscuit');
  $$('[data-dog-name]').forEach((el) => {
    el.value = hero.value;
    el.addEventListener('input', () => setName(el.value, el));
  });
  hero.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); hero.blur(); } });
  hero.addEventListener('focus', () => hero.select());
  setName(hero.value, hero);
  window.addEventListener('resize', fitHero);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitHero(); autosizeSelects(); });
}

// ---------------------------------------------------- bubbles & marquees --

function initBubbles() {
  const box = $('.bubbles');
  const make = () => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'bubble';
    b.tabIndex = -1;
    const size = 18 + Math.random() * 70;
    b.style.cssText = `--s:${size}px;left:${Math.random() * 96}%;--d:${9 + Math.random() * 10}s;--delay:${-Math.random() * 18}s;--drift:${(Math.random() - 0.5) * 80}px`;
    b.addEventListener('pointerdown', () => {
      b.classList.add('pop');
      setTimeout(() => { b.remove(); box.appendChild(make()); }, 260);
    });
    return b;
  };
  const n = reduceMotion ? 6 : 16;
  for (let i = 0; i < n; i++) box.appendChild(make());
}

function initMarquees() {
  const wave = $('[data-wave]');
  wave.textContent = MARQUEE.repeat(8);
  const sticker = $('[data-sticker]');
  if (reduceMotion) return;
  let offset = 0;
  const tick = () => {
    offset = (offset - 0.035) % 25;
    wave.setAttribute('startOffset', offset + '%');
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  sticker.closest('svg').classList.add('spin');
}

// --------------------------------------------------------------- pricing --

const state = { size: 'm', coat: 'double' };

function priceFor(service, sizeId, coatId) {
  const si = SIZES.findIndex((s) => s.id === sizeId);
  const coat = COATS.find((c) => c.id === coatId) || COATS[0];
  const base = service.prices[si];
  const mins = service.minutes[si];
  if (service.cat || service.flat) return { price: base, minutes: mins };
  return { price: Math.round(base * coat.price), minutes: mins + coat.extra };
}

const DOG_SVG = `<svg viewBox="0 0 120 90" aria-hidden="true"><path d="M18 46c-6-2-10-8-9-15 4 6 9 8 14 8l2-1c5-4 14-6 26-6h28l6-9c2-4 1-10 4-12 3-1 5 2 6 5 3-2 6-3 9-1l7 4c3 2 3 5 1 7l-6 3c-2 1-4 3-5 6l-3 9c-1 4-1 9-3 13l-2 4v20c0 2-2 3-4 3h-3c-2 0-3-1-3-3V67c-8 2-20 2-30 0v16c0 2-1 3-3 3h-3c-2 0-4-1-4-3V64c-5-3-8-8-9-14l-3 1c-4 0-10-1-13-5z"/></svg>`;

function renderMenuControls() {
  $('[data-sizes]').innerHTML = SIZES.map((s) => `
    <button type="button" role="radio" class="size" data-size="${s.id}" aria-checked="${s.id === state.size}" style="--k:${s.scale}">
      <span class="dog">${DOG_SVG}</span>
      <b>${s.label}</b><span class="mono">${s.weight}</span>
    </button>`).join('');
  $('[data-coats]').innerHTML = COATS.map((c) => `
    <button type="button" role="radio" class="coat" data-coat="${c.id}" aria-checked="${c.id === state.coat}">
      <b>${c.label}</b><span class="mono">${c.note}</span>
    </button>`).join('');
  $$('[data-size]').forEach((b) => b.addEventListener('click', () => { state.size = b.dataset.size; syncMenu(); syncBookingFromMenu(); }));
  $$('[data-coat]').forEach((b) => b.addEventListener('click', () => { state.coat = b.dataset.coat; syncMenu(); syncBookingFromMenu(); }));
  // Arrow keys move within each radio group.
  for (const group of $$('[role="radiogroup"]')) {
    group.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
      const items = $$('[role="radio"]', group);
      const i = items.indexOf(document.activeElement);
      if (i < 0) return;
      e.preventDefault();
      const next = items[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length];
      next.focus(); next.click();
    });
  }
}

function syncMenu() {
  $$('[data-size]').forEach((b) => { const on = b.dataset.size === state.size; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
  $$('[data-coat]').forEach((b) => { const on = b.dataset.coat === state.coat; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; });
  $('[data-price-list]').innerHTML = SERVICES.map((s, i) => {
    const p = priceFor(s, state.size, state.coat);
    const mins = p.minutes >= 60 ? `${Math.floor(p.minutes / 60)}h${p.minutes % 60 ? ' ' + (p.minutes % 60) + 'm' : ''}` : `${p.minutes} min`;
    return `<li class="price-row${s.cat ? ' is-cat' : ''}">
      <span class="num mono">${pad(i + 1)}</span>
      <div class="pr-name"><h3>${esc(s.name)}</h3><p>${esc(s.desc)}</p></div>
      <span class="leader" aria-hidden="true"></span>
      <span class="pr-time mono">${mins}</span>
      <b class="pr-price">${s.cat ? '<small>cats</small>' : ''}${money(p.price)}</b>
      <a class="pr-book" href="#book" data-book-service="${s.id}" aria-label="Book ${esc(s.name)}">Book →</a>
    </li>`;
  }).join('');
  bindBookLinks();
}

function renderAddons() {
  $('[data-addon-list]').innerHTML = ADDONS.map((a) => `<li><span>${esc(a.name)}</span><span class="leader"></span><b>${a.price ? money(a.price) : 'free'}</b></li>`).join('');
}

// --------------------------------------------------------------- regulars --

function renderRegulars() {
  $('[data-regulars]').innerHTML = REGULARS.map((r, i) => `
    <figure class="tile t${i % 9}">
      <img src="${r.photo}" alt="${esc(r.pet)}, a ${esc(r.breed.toLowerCase())}" loading="lazy"${r.focus ? ` style="object-position:${r.focus}"` : ''}>
      <figcaption><b>${esc(r.pet)}</b><span class="mono">${esc(r.breed)} · usual: ${esc(r.cut)}</span></figcaption>
    </figure>`).join('');
}

// ---------------------------------------------------------------- booking --

const form = () => $('[data-book-form]');
const tickets = () => store.get('tickets', []);
let chosenTime = null;

function bookableDays() {
  const out = [];
  const now = new Date();
  for (let i = 0; out.length < SHOP.bookingWindow && i < 60; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if (HOURS[d.getDay()]) out.push(d);
  }
  return out;
}

function fillSelect(sel, items, value) {
  sel.innerHTML = items.map((it) => `<option value="${esc(it.value)}">${esc(it.label)}</option>`).join('');
  if (value != null && items.some((it) => it.value === value)) sel.value = value;
}

function initBooking() {
  const f = form();
  fillSelect(f.service, SERVICES.map((s) => ({ value: s.id, label: s.name.toLowerCase() })), 'full');
  fillSelect(f.size, SIZES.map((s) => ({ value: s.id, label: s.word })), state.size);
  fillSelect(f.coat, COATS.map((c) => ({ value: c.id, label: c.label.toLowerCase() })), state.coat);
  $('[data-b-addons]').innerHTML = ADDONS.map((a) => `
    <label class="chip"><input type="checkbox" name="addon" value="${a.id}"><span>${esc(a.name)} <i>${a.price ? '+' + money(a.price) : 'free'}</i></span></label>`).join('');

  ['service', 'size', 'coat', 'groomer', 'date'].forEach((n) => f[n].addEventListener('change', () => {
    if (n === 'size' || n === 'coat') { state[n] = f[n].value; syncMenu(); }
    if (n === 'service' || n === 'date') refreshGroomers();
    if (n !== 'groomer') refreshDates();
    renderTimes();
    updateTotal();
  }));
  f.groomer.addEventListener('change', () => { refreshDates(); renderTimes(); });
  $$('input[name="addon"]', f).forEach((c) => c.addEventListener('change', updateTotal));
  f.addEventListener('submit', submitBooking);
  refreshGroomers();
  refreshDates();
  renderTimes();
  updateTotal();
  autosizeSelects();
  f.addEventListener('change', autosizeSelects);
}

// Selects in the sentence are as wide as their chosen words.
function autosizeSelects() {
  $$('.madlib-text select, .madlib-text input').forEach((el) => {
    copyFont(el);
    measurer.textContent = el.tagName === 'SELECT' ? el.options[el.selectedIndex]?.text || '' : (el.value || el.placeholder || 'name');
    el.style.width = Math.ceil(measurer.getBoundingClientRect().width + (el.tagName === 'SELECT' ? 34 : 10)) + 'px';
  });
}

function currentService() { return SERVICES.find((s) => s.id === form().service.value) || SERVICES[0]; }

function refreshGroomers() {
  const f = form();
  const svc = currentService();
  // Cats are June's; everyone else can take any dog.
  const list = svc.cat ? GROOMERS.filter((g) => g.id === 'june') : GROOMERS;
  fillSelect(f.groomer, list.map((g) => ({ value: g.id, label: g.name })), f.groomer.value);
  // Size and coat do not matter for cats.
  f.size.closest('.slot').classList.toggle('muted', !!svc.cat);
  f.coat.closest('.slot').classList.toggle('muted', !!svc.cat);
}

function refreshDates() {
  const f = form();
  const svc = currentService();
  const groomer = GROOMERS.find((g) => g.id === f.groomer.value) || GROOMERS[0];
  const days = bookableDays().filter((d) => groomer.days.includes(d.getDay()) && (!svc.cat || CAT_HOURS.days.includes(d.getDay())));
  const today = dateKey(new Date());
  fillSelect(f.date, days.map((d) => ({ value: dateKey(d), label: dateKey(d) === today ? 'today' : fmtDay(d) })), f.date.value);
  if (!refreshDates.picked) {
    // First run: start on the first day that still has a few open times.
    const { minutes } = priceFor(svc, f.size.value, f.coat.value);
    const good = days.find((d) => slotsFor(dateKey(d), svc, minutes, f.groomer.value).filter((x) => !x.taken).length >= 4);
    if (good) f.date.value = dateKey(good);
    refreshDates.picked = true;
  }
  autosizeSelects();
}

function slotsFor(dayKey, svc, minutes, groomerId) {
  const d = fromKey(dayKey);
  const h = HOURS[d.getDay()];
  if (!h) return [];
  const end = svc.cat ? Math.min(h[1], CAT_HOURS.until) : h[1];
  const booked = tickets().filter((t) => t.date === dayKey && !t.cancelled).map((t) => t.time);
  const now = new Date();
  const out = [];
  for (let t = h[0]; t + minutes / 60 <= end + 0.001; t += 0.5) {
    const at = new Date(d); at.setHours(Math.floor(t), (t % 1) * 60, 0, 0);
    const past = at.getTime() < now.getTime() + 60 * 60 * 1000;
    const label = fmtHour(t);
    const busy = hash(dayKey + label + groomerId) < 0.38 || booked.includes(label);
    out.push({ t, label, taken: past || busy });
  }
  return out;
}

function renderTimes() {
  const f = form();
  const svc = currentService();
  const { minutes } = priceFor(svc, f.size.value, f.coat.value);
  const slots = f.date.value ? slotsFor(f.date.value, svc, minutes, f.groomer.value) : [];
  const box = $('[data-times]');
  if (!slots.length) { box.innerHTML = '<p class="mono tiny">No times that day. Try another date.</p>'; chosenTime = null; return; }
  if (!slots.some((s) => s.label === chosenTime && !s.taken)) chosenTime = null;
  box.innerHTML = slots.map((s) => `
    <button type="button" class="time${s.label === chosenTime ? ' on' : ''}" data-time="${s.label}" ${s.taken ? 'disabled aria-label="' + s.label + ', taken"' : `aria-pressed="${s.label === chosenTime}"`}>${s.label}</button>`).join('');
  $$('[data-time]', box).forEach((b) => b.addEventListener('click', () => {
    chosenTime = b.dataset.time;
    $$('[data-time]', box).forEach((x) => { x.classList.toggle('on', x === b); if (!x.disabled) x.setAttribute('aria-pressed', x === b); });
    $('[data-book-error]').textContent = '';
  }));
}

function quote() {
  const f = form();
  const svc = currentService();
  const p = priceFor(svc, f.size.value, f.coat.value);
  const addons = $$('input[name="addon"]:checked', f).map((c) => ADDONS.find((a) => a.id === c.value));
  const total = p.price + addons.reduce((n, a) => n + a.price, 0);
  return { svc, minutes: p.minutes + addons.length * 5, total, addons };
}

function updateTotal() {
  const q = quote();
  $('[data-total]').textContent = money(q.total);
  const pickupNote = q.minutes >= 60 ? `about ${Math.floor(q.minutes / 60)}h${q.minutes % 60 ? ' ' + (q.minutes % 60) + 'm' : ''}` : `about ${q.minutes} min`;
  $('[data-duration]').textContent = `${pickupNote} with us`;
}

function syncBookingFromMenu() {
  const f = form();
  f.size.value = state.size;
  f.coat.value = state.coat;
  renderTimes(); updateTotal(); autosizeSelects();
}

function bindBookLinks() {
  $$('[data-book-service]').forEach((a) => {
    if (a.dataset.bound) return;
    a.dataset.bound = '1';
    a.addEventListener('click', () => {
      const f = form();
      f.service.value = a.dataset.bookService;
      f.size.value = state.size; f.coat.value = state.coat;
      refreshGroomers(); refreshDates(); renderTimes(); updateTotal(); autosizeSelects();
    });
  });
}

function newClaim() {
  const used = new Set(tickets().map((t) => t.claim));
  let c;
  do { c = `${SHOP.claimPrefix}-${String(1000 + Math.floor(Math.random() * 9000))}`; } while (used.has(c));
  return c;
}

async function submitBooking(e) {
  e.preventDefault();
  const f = form();
  const err = $('[data-book-error]');
  const missing = [];
  if (!f.pet.value.trim()) missing.push("your pet's name");
  if (!f.date.value) missing.push('a date');
  if (!chosenTime) missing.push('a drop-off time');
  if (!f.owner.value.trim()) missing.push('your name');
  if (f.phone.value.replace(/\D/g, '').length < 7) missing.push('a mobile number');
  if (!f.vaccines.checked) missing.push('the vaccine box ticked');
  if (missing.length) {
    err.textContent = 'Almost. We still need ' + missing.join(', ') + '.';
    return;
  }
  err.textContent = '';
  const q = quote();
  const groomer = GROOMERS.find((g) => g.id === f.groomer.value);
  const t = {
    claim: newClaim(),
    pet: f.pet.value.trim(),
    service: q.svc.id,
    serviceName: q.svc.name,
    size: f.size.value,
    coat: f.coat.value,
    groomer: groomer.id,
    groomerName: groomer.id === 'any' ? 'Any groomer' : groomer.name.split(' ')[0],
    date: f.date.value,
    time: chosenTime,
    minutes: q.minutes,
    total: q.total,
    addons: q.addons.map((a) => a.name),
    owner: f.owner.value.trim(),
    phone: f.phone.value.trim(),
    notes: f.notes.value.trim(),
    created: Date.now(),
  };
  const list = tickets(); list.push(t); store.set('tickets', list);
  if (SHOP.bookingEndpoint) {
    try {
      await fetch(SHOP.bookingEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(t) });
    } catch { toast("Saved here, but we couldn't reach the salon. Give us a call to confirm."); }
  }
  showTicket(t, true);
  renderMyTickets();
  renderTimes();
  f.notes.value = '';
}

function startOf(t) {
  const d = fromKey(t.date);
  const m = /^(\d+)(?::(\d+))?(am|pm)$/.exec(t.time);
  let h = +m[1] % 12; if (m[3] === 'pm') h += 12;
  d.setHours(h, +(m[2] || 0), 0, 0);
  return d;
}

function ticketHTML(t) {
  const start = startOf(t);
  const pickup = new Date(start.getTime() + t.minutes * 60000);
  const size = SIZES.find((s) => s.id === t.size);
  const coat = COATS.find((c) => c.id === t.coat);
  const svc = SERVICES.find((s) => s.id === t.service);
  return `
  <article class="ticket${t.cancelled ? ' cancelled' : ''}" aria-label="Claim ticket ${t.claim}">
    <div class="ticket-main">
      <p class="mono tiny">${esc(SHOP.name)} · claim ticket</p>
      <p class="ticket-claim">${t.claim}</p>
      <p class="ticket-pet">${esc(t.pet)}</p>
      <dl class="mono">
        <dt>Service</dt><dd>${esc(t.serviceName)}${svc && svc.cat ? '' : ` · ${size ? size.label : ''} · ${coat ? coat.label.toLowerCase() : ''}`}</dd>
        <dt>Drop-off</dt><dd>${fmtDay(start)}, ${t.time}</dd>
        <dt>Ready about</dt><dd>${fmtTime(pickup)}</dd>
        <dt>Groomer</dt><dd>${esc(t.groomerName)}</dd>
        ${t.addons.length ? `<dt>Add-ons</dt><dd>${esc(t.addons.join(', '))}</dd>` : ''}
      </dl>
    </div>
    <div class="ticket-stub">
      <span class="mono tiny">Estimate</span>
      <b>${money(t.total)}</b>
      ${t.cancelled ? '<span class="stamp">Cancelled</span>' : `
      <button type="button" class="linkish" data-ics="${t.claim}">Add to calendar</button>
      <a class="linkish" href="${mailtoFor(t)}">Email the salon</a>
      <button type="button" class="linkish" data-track="${t.claim}">Track</button>
      <button type="button" class="linkish danger" data-cancel="${t.claim}">Cancel</button>`}
    </div>
  </article>`;
}

function mailtoFor(t) {
  const body = `Hi ${SHOP.name},\n\nI've booked ${t.serviceName} for ${t.pet} on ${fmtDay(startOf(t))} at ${t.time} (claim ${t.claim}).\n\n${t.owner}\n${t.phone}${t.notes ? '\n\nNotes: ' + t.notes : ''}`;
  return `mailto:${SHOP.email}?subject=${encodeURIComponent('Booking ' + t.claim + ' · ' + t.pet)}&body=${encodeURIComponent(body)}`;
}

function showTicket(t, fresh) {
  const zone = $('[data-ticket-zone]');
  zone.innerHTML = `<p class="mono label">${fresh ? `Booked. Keep this ticket, ${esc(t.owner.split(' ')[0])}:` : 'Your ticket'}</p>${ticketHTML(t)}`;
  zone.classList.remove('printing'); void zone.offsetWidth; zone.classList.add('printing');
  bindTicketButtons(zone);
  if (fresh) zone.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
}

function renderMyTickets() {
  const upcoming = tickets().filter((t) => !t.cancelled && startOf(t).getTime() + t.minutes * 60000 > Date.now() - 864e5);
  const box = $('[data-my-tickets]');
  if (!upcoming.length) { box.innerHTML = ''; return; }
  box.innerHTML = `<h3 class="mono label">Your bookings on this device</h3><ul>${upcoming.map((t) =>
    `<li><button type="button" class="linkish" data-open-ticket="${t.claim}">${t.claim}</button> · ${esc(t.pet)} · ${esc(t.serviceName)} · ${fmtDay(startOf(t))} ${t.time}</li>`).join('')}</ul>`;
  $$('[data-open-ticket]', box).forEach((b) => b.addEventListener('click', () => {
    const t = tickets().find((x) => x.claim === b.dataset.openTicket); if (t) showTicket(t, false);
  }));
}

function bindTicketButtons(root) {
  $$('[data-cancel]', root).forEach((b) => b.addEventListener('click', () => {
    if (!confirm(`Cancel ${b.dataset.cancel}? Free up to 24 hours before.`)) return;
    const list = tickets(); const t = list.find((x) => x.claim === b.dataset.cancel);
    if (!t) return;
    t.cancelled = true; store.set('tickets', list);
    showTicket(t, false); renderMyTickets(); renderTimes();
    toast('Cancelled. That time is open again.');
  }));
  $$('[data-ics]', root).forEach((b) => b.addEventListener('click', () => downloadIcs(tickets().find((x) => x.claim === b.dataset.ics))));
  $$('[data-track]', root).forEach((b) => b.addEventListener('click', () => {
    $('#claim').value = b.dataset.track; track(b.dataset.track);
    $('#tracker').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }));
}

function downloadIcs(t) {
  if (!t) return;
  const s = startOf(t);
  const e = new Date(s.getTime() + t.minutes * 60000);
  const stamp = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Soapdish//Booking//EN', 'BEGIN:VEVENT',
    `UID:${t.claim}-${t.created}@soapdish`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(s)}`, `DTEND:${stamp(e)}`,
    `SUMMARY:${t.pet} at ${SHOP.name} (${t.serviceName})`,
    `LOCATION:${SHOP.address.replace(/,/g, '\\,')}`,
    `DESCRIPTION:Claim ${t.claim}. Estimate ${money(t.total)}. Call ${SHOP.phone} to change.`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  a.download = `${t.claim}.ics`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ---------------------------------------------------------------- tracker --

function renderStages(active = -1, progress = 0) {
  $('[data-stages]').innerHTML = STAGES.map((s, i) => {
    const cls = i < active ? 'done' : i === active ? 'now' : '';
    const fill = i < active ? 1 : i === active ? progress : 0;
    return `<li class="stage ${cls}" style="--fill:${fill.toFixed(3)}" ${i === active ? 'aria-current="step"' : ''}>
      <span class="stage-n">${i + 1}</span>
      <h3>${esc(s.name)}</h3><p>${esc(s.note)}</p>
      <span class="bar" aria-hidden="true"></span>
    </li>`;
  }).join('');
}

function demoTicket() {
  const start = new Date(Date.now() - 52 * 60000);
  return { claim: `${SHOP.claimPrefix}-0000`, pet: dogName === 'your dog' ? 'Biscuit' : dogName, start, minutes: 120 };
}

function track(raw) {
  const claim = raw.trim().toUpperCase().replace(/\s+/g, '');
  const status = $('[data-tracker-status]');
  let t = tickets().find((x) => x.claim === claim);
  let start, minutes, pet;
  if (claim === `${SHOP.claimPrefix}-0000`) { const d = demoTicket(); start = d.start; minutes = d.minutes; pet = d.pet; }
  else if (t) { start = startOf(t); minutes = t.minutes; pet = t.pet; }
  else {
    renderStages();
    status.innerHTML = `We can't find <b>${esc(claim || '…')}</b> on this device. Call us on <a href="tel:${SHOP.phone.replace(/[^\d+]/g, '')}">${SHOP.phone}</a> and we'll check the book.`;
    return;
  }
  if (t && t.cancelled) { renderStages(); status.innerHTML = `<b>${esc(claim)}</b> was cancelled.`; return; }
  const p = (Date.now() - start.getTime()) / (minutes * 60000);
  if (p < 0) {
    renderStages();
    status.innerHTML = `<b>${esc(pet)}</b> is booked in for ${fmtDay(start)} at ${fmtTime(start)}. See you then.`;
    return;
  }
  if (p > 3) { renderStages(STAGES.length); status.innerHTML = `<b>${esc(pet)}</b> has been home a while. Book the next one before the fur wins.`; return; }
  let idx = 0;
  STAGES.forEach((s, i) => { if (p >= s.at) idx = i; });
  const next = STAGES[idx + 1];
  const local = next ? (p - STAGES[idx].at) / (next.at - STAGES[idx].at) : 1;
  renderStages(idx, Math.min(1, local));
  const ready = new Date(start.getTime() + minutes * 60000 * STAGES[STAGES.length - 1].at);
  status.innerHTML = idx === STAGES.length - 1
    ? `<b>${esc(pet)} is ready!</b> Come on in. We're at ${esc(SHOP.address.split(',')[0])}.`
    : `<b>${esc(pet)}</b> is at station ${idx + 1}: ${esc(STAGES[idx].name.toLowerCase())}. Ready around <b>${fmtTime(ready)}</b>.`;
}

function initTracker() {
  renderStages();
  $('[data-tracker-form]').addEventListener('submit', (e) => { e.preventDefault(); track($('#claim').value); });
  $('[data-demo-claim]').addEventListener('click', () => { $('#claim').value = `${SHOP.claimPrefix}-0000`; track($('#claim').value); });
}

// ------------------------------------------------------- the rest of it --

function renderFirstVisit() {
  $('[data-first-visit]').innerHTML = FIRST_VISIT.map((f, i) => `<li><span class="big-n">${pad(i + 1)}</span><div><h3>${esc(f.title)}</h3><p>${esc(f.body)}</p></div></li>`).join('');
  $('[data-policies]').innerHTML = POLICIES.map((p) => `<div><dt>${esc(p.term)}</dt><dd>${esc(p.desc)}</dd></div>`).join('');
}

let reviewAt = 0;
function renderReview() {
  const r = REVIEWS[reviewAt];
  const fig = $('[data-review]');
  fig.innerHTML = `<blockquote>“${esc(r.quote)}”</blockquote><figcaption class="mono">${esc(r.who)}</figcaption>`;
  $('[data-review-count]').textContent = `${reviewAt + 1} / ${REVIEWS.length}`;
}
function initReviews() {
  renderReview();
  $('[data-review-prev]').addEventListener('click', () => { reviewAt = (reviewAt + REVIEWS.length - 1) % REVIEWS.length; renderReview(); });
  $('[data-review-next]').addEventListener('click', () => { reviewAt = (reviewAt + 1) % REVIEWS.length; renderReview(); });
}

function renderFaq() {
  $('[data-faq]').innerHTML = FAQ.map((f) => `<details><summary>${esc(f.q)}<span aria-hidden="true">+</span></summary><p>${esc(f.a)}</p></details>`).join('');
}

// ------------------------------------------------------------------ boot --

renderShop();
renderOpen();
setInterval(renderOpen, 60000);
renderMenuControls();
renderAddons();
syncMenu();
renderRegulars();
initBooking();
initName();
initBubbles();
initMarquees();
initTracker();
renderFirstVisit();
initReviews();
renderFaq();
renderMyTickets();
