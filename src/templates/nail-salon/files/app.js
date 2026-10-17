/* Half Moon Nail Studio
   Everything the salon changes lives in the data at the top of this file:
   details and hours, the menu, the shade bar, the lookbook, the artists and
   the reviews. The page below the data only reads it. */

const SALON = {
  name: 'Half Moon Nail Studio',
  phone: '(555) 014-2290',
  email: 'hello@halfmoon.example',
  street: '218 Linden Ave, Portland',
  address: '218 Linden Avenue, Portland, OR 97214',
  instagram: 'halfmoon.nails',
  // Opening hours by weekday, Sunday first. null means closed. 24-hour "HH:MM".
  hours: [
    ['10:00', '17:00'], // Sunday
    null,               // Monday
    ['10:00', '19:00'], // Tuesday
    ['10:00', '19:00'], // Wednesday
    ['10:00', '20:00'], // Thursday
    ['09:00', '19:00'], // Friday
    ['09:00', '18:00'], // Saturday
  ],
  walkInsUntil: '17:00',
  bookAheadDays: 14,
  shadeOfWeek: 'cherry-cola',
  // Booking requests are POSTed here as JSON (a form service or your own
  // backend). Leave it empty and the request opens in the visitor's email app,
  // addressed to `email` above.
  bookingEndpoint: '',
};

const CATEGORIES = [
  { id: 'hands', label: 'Hands' },
  { id: 'feet', label: 'Feet' },
  { id: 'enhance', label: 'Enhancements' },
  { id: 'extras', label: 'Art & extras' },
];

const SERVICES = [
  { id: 'classic-mani', cat: 'hands', name: 'Classic manicure', mins: 35, price: 32, desc: 'Shape, cuticle care, a short hand massage and regular polish.' },
  { id: 'gel-mani', cat: 'hands', name: 'Gel manicure', mins: 50, price: 48, popular: true, desc: 'Cuticle care and gel polish that stays glossy for up to three weeks.' },
  { id: 'biab', cat: 'hands', name: 'BIAB structured manicure', mins: 75, price: 62, popular: true, desc: 'A flexible builder gel over your own nails to strengthen them while they grow.' },
  { id: 'russian', cat: 'hands', name: 'Russian manicure', mins: 90, price: 70, desc: 'Precise e-file cuticle work with gel laid close to the cuticle for a long, clean grow-out.' },
  { id: 'polish-change', cat: 'hands', name: 'Polish change', mins: 15, price: 16, desc: 'File, tidy and a fresh coat of regular polish.' },

  { id: 'classic-pedi', cat: 'feet', name: 'Classic pedicure', mins: 45, price: 42, desc: 'Soak, shape, cuticle care, callus smoothing and regular polish.' },
  { id: 'gel-pedi', cat: 'feet', name: 'Gel pedicure', mins: 60, price: 56, popular: true, desc: 'Everything in the classic pedicure, finished in gel that lasts all month.' },
  { id: 'spa-pedi', cat: 'feet', name: 'Half Moon spa pedicure', mins: 75, price: 74, desc: 'Sugar scrub, clay mask, hot stones and a warm paraffin wrap.' },
  { id: 'toe-change', cat: 'feet', name: 'Toe polish change', mins: 20, price: 20, desc: 'A quick shape and fresh polish for your toes.' },

  { id: 'gelx', cat: 'enhance', name: 'Gel-X extensions', mins: 100, price: 88, popular: true, desc: 'Soft gel tips in the length and shape you choose, with gel color.' },
  { id: 'acrylic', cat: 'enhance', name: 'Acrylic full set', mins: 90, price: 72, desc: 'Sculpted acrylic for extra length and strength, with gel color.' },
  { id: 'infill', cat: 'enhance', name: 'Infill', mins: 60, price: 55, desc: 'Rebalance and refill an extension set up to three weeks old.' },
  { id: 'removal', cat: 'enhance', name: 'Safe removal', mins: 30, price: 18, desc: 'Gentle soak-off of another salon\'s gel or acrylic, with a nourishing finish.' },

  { id: 'french', cat: 'extras', name: 'French or micro French', mins: 15, price: 12, desc: 'A crisp tip line in any color.' },
  { id: 'chrome', cat: 'extras', name: 'Chrome or cat-eye', mins: 10, price: 10, desc: 'Mirror chrome, pearl or magnetic cat-eye over gel.' },
  { id: 'art-2', cat: 'extras', name: 'Hand-painted art, 2 nails', mins: 20, price: 14, desc: 'Dots, lines, moons or a little flower on two accent nails.' },
  { id: 'art-full', cat: 'extras', name: 'Full art set', mins: 45, price: 35, desc: 'Hand-painted art on all ten nails. Bring a reference photo.' },
  { id: 'paraffin', cat: 'extras', name: 'Paraffin dip', mins: 10, price: 10, desc: 'Warm wax for soft hands or feet.' },
];

// The shade bar: five shades per family. `id` must be unique.
const SHADE_FAMILIES = [
  { id: 'nudes', label: 'Nudes', shades: [
    ['oat-milk', 'Oat Milk', '#ead5c3'], ['bare-truth', 'Bare Truth', '#ddb7a0'], ['toasted-almond', 'Toasted Almond', '#c39274'],
    ['cashmere', 'Cashmere', '#b89487'], ['cocoa-butter', 'Cocoa Butter', '#946651'],
  ] },
  { id: 'pinks', label: 'Pinks', shades: [
    ['ballet-slipper', 'Ballet Slipper', '#f3d3d6'], ['peony', 'Peony', '#efa5b7'], ['bubblegum', 'Bubblegum', '#f27ea3'],
    ['rosewater', 'Rosewater', '#d98b97'], ['hot-lips', 'Hot Lips', '#e0407a'],
  ] },
  { id: 'reds', label: 'Reds', shades: [
    ['cherry-cola', 'Cherry Cola', '#8e1b2e'], ['fire-engine', 'Fire Engine', '#d0212f'], ['tomato-girl', 'Tomato Girl', '#e2523a'],
    ['garnet', 'Garnet', '#6f1424'], ['poppy', 'Poppy', '#ef6a55'],
  ] },
  { id: 'berries', label: 'Berries', shades: [
    ['fig-jam', 'Fig Jam', '#5a2141'], ['lilac-hour', 'Lilac Hour', '#bba6d8'], ['plum-wine', 'Plum Wine', '#6c2b58'],
    ['orchid', 'Orchid', '#a65aa1'], ['mulberry', 'Mulberry', '#8b2b5b'],
  ] },
  { id: 'greens', label: 'Blues & greens', shades: [
    ['pistachio', 'Pistachio', '#bccf9c'], ['sage', 'Sage', '#97a888'], ['cornflower', 'Cornflower', '#7090d6'],
    ['teal-tide', 'Teal Tide', '#1f6d77'], ['midnight-navy', 'Midnight Navy', '#1e2a4e'],
  ] },
  { id: 'darks', label: 'Darks & whites', shades: [
    ['milk-bath', 'Milk Bath', '#f6f0e8'], ['smoke', 'Smoke', '#77706f'], ['olive-night', 'Olive Night', '#414631'],
    ['espresso', 'Espresso', '#3b2521'], ['ink', 'Ink', '#1d1a22'],
  ] },
];

const SHAPES = [
  { id: 'squoval', label: 'Squoval' }, { id: 'round', label: 'Round' }, { id: 'almond', label: 'Almond' },
  { id: 'coffin', label: 'Coffin' }, { id: 'stiletto', label: 'Stiletto' },
];
const FINISHES = [
  { id: 'gloss', label: 'Gloss' }, { id: 'matte', label: 'Matte' }, { id: 'chrome', label: 'Chrome' }, { id: 'glitter', label: 'Glitter' },
];
const DETAILS = [
  { id: 'none', label: 'None' }, { id: 'french', label: 'French tip' }, { id: 'moon', label: 'Half moon' },
  { id: 'dots', label: 'Dots' }, { id: 'line', label: 'Fine line' },
];
const SKIN_TONES = ['#f4d6c3', '#e5b394', '#c78a64', '#94603f', '#5d3a27'];

// The lookbook. `ring` styles the ring finger differently, as an accent nail.
const LOOKS = [
  { id: 'signature', name: 'The Half Moon', bg: '#f4dcd8', from: 60, desc: 'Our signature: a milky base with cherry moons at the cuticle and one solid cherry nail.',
    look: { shade: 'milk-bath', shape: 'squoval', finish: 'gloss', detail: 'moon', accent: '#9b1e3f', ring: { shade: 'cherry-cola', detail: 'none' } } },
  { id: 'cola-chrome', name: 'Cherry Cola Chrome', bg: '#f6e7b8', from: 58, desc: 'Deep cherry gel under a sheer chrome powder, so it shifts from red to rose gold in the light.',
    look: { shade: 'cherry-cola', shape: 'almond', finish: 'chrome', detail: 'none' } },
  { id: 'micro-french', name: 'Micro French', bg: '#dbe3c4', from: 60, desc: 'A sheer ballet-pink base with the thinnest white tip. Quiet, clean and good with everything.',
    look: { shade: 'ballet-slipper', shape: 'almond', finish: 'gloss', detail: 'french', accent: '#fdfaf6' } },
  { id: 'pistachio-dots', name: 'Pistachio Dots', bg: '#f3eee6', from: 62, desc: 'Soft green with three hand-placed milk dots on every nail. Spring, all year long.',
    look: { shade: 'pistachio', shape: 'round', finish: 'gloss', detail: 'dots', accent: '#fdfaf6' } },
  { id: 'midnight', name: 'Midnight Sparkle', bg: '#e3dcef', from: 92, desc: 'Coffin Gel-X in navy with a fine silver and gold glitter. Made for late dinners.',
    look: { shade: 'midnight-navy', shape: 'coffin', finish: 'glitter', detail: 'none' } },
  { id: 'fig-line', name: 'Fig & Gold Line', bg: '#f4dcd8', from: 62, desc: 'Matte fig with a single gold line painted across each nail by hand.',
    look: { shade: 'fig-jam', shape: 'squoval', finish: 'matte', detail: 'line', accent: '#e4c27c' } },
];

// Artists. `days` are the weekdays they work, Sunday = 0.
const ARTISTS = [
  { id: 'mina', name: 'Mina Park', role: 'Studio lead', bg: '#f4dcd8', days: [2, 3, 4, 5, 6],
    bio: 'Russian manicures and BIAB that grows out invisibly. Fixes nails other salons gave up on.',
    look: { shade: 'bare-truth', shape: 'squoval', finish: 'gloss', detail: 'none' } },
  { id: 'lucia', name: 'Lucía Herrera', role: 'Nail artist', bg: '#f6e7b8', days: [0, 3, 4, 5, 6],
    bio: 'Hand-painted florals, fine lines and anything you can pin to a mood board.',
    look: { shade: 'lilac-hour', shape: 'almond', finish: 'gloss', detail: 'dots', accent: '#fdfaf6' } },
  { id: 'dee', name: 'Dee Okafor', role: 'Pedicure lead', bg: '#dbe3c4', days: [0, 2, 3, 4, 5],
    bio: 'Long, slow spa pedicures. Ask about the hot-stone massage, it is worth the extra time.',
    look: { shade: 'tomato-girl', shape: 'round', finish: 'gloss', detail: 'none' } },
  { id: 'hana', name: 'Hana Sato', role: 'Extensions', bg: '#e3dcef', days: [0, 4, 5, 6],
    bio: 'Gel-X and sculpted sets in almond, coffin and stiletto, balanced to last.',
    look: { shade: 'midnight-navy', shape: 'stiletto', finish: 'chrome', detail: 'none' } },
];

const REVIEWS = [
  { quote: 'Mina fixed nails three other salons had given up on. Six weeks of BIAB and they are finally long and strong.', name: 'Priya S.', service: 'BIAB structured manicure' },
  { quote: 'I tried Cherry Cola chrome on the shade bar before I came in, and it looked exactly like that on my hands.', name: 'Jordan T.', service: 'Gel manicure with chrome' },
  { quote: 'Dee\'s spa pedicure is the best hour of my month. Quiet, warm, no upselling, and the polish lasts until the next one.', name: 'Alma R.', service: 'Half Moon spa pedicure' },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + n.toLocaleString('en-US');
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fromMin = (m) => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
function fmtTime(hhmm) {
  const m = toMin(hhmm), h = Math.floor(m / 60), mm = m % 60;
  return `${h % 12 || 12}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}`;
}
function fmtDuration(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parseIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtDay = (iso) => { const d = parseIso(iso); return `${DAY_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const telHref = (phone) => 'tel:+1' + phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

function hexRgb(hex) { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
function luminance(hex) {
  const [r, g, b] = hexRgb(hex).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
// A small stable hash, so "taken" time slots stay the same between visits.
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

const SHADES = SHADE_FAMILIES.flatMap((f) => f.shades.map(([id, name, hex]) => ({ id, name, hex, family: f.id })));
SHADES.forEach((s, i) => { s.code = 'No. ' + String(i + 1).padStart(2, '0'); });
const shadeById = (id) => SHADES.find((s) => s.id === id) || SHADES[0];
const serviceById = (id) => SERVICES.find((s) => s.id === id);
const artistById = (id) => ARTISTS.find((a) => a.id === id);
const labelOf = (list, id) => (list.find((x) => x.id === id) || list[0]).label;

/* ------------------------------------------------------------------ */
/* Nail drawing                                                         */
/* ------------------------------------------------------------------ */

// Nail outlines in a 100-wide box: the free edge at the top, the cuticle
// curve at y≈144. Longer shapes reach above y=0.
const NAIL_PATHS = {
  squoval: 'M8 136V30Q8 10 28 10H72Q92 10 92 30V136Q50 152 8 136Z',
  round: 'M8 136V52Q8 4 50 4Q92 4 92 52V136Q50 152 8 136Z',
  almond: 'M8 136V62C8 22 38 -14 50 -20C62 -14 92 22 92 62V136Q50 152 8 136Z',
  coffin: 'M8 136V58L28 -14Q30 -22 38 -22H62Q70 -22 72 -14L92 58V136Q50 152 8 136Z',
  stiletto: 'M8 136V76C8 42 40 -4 50 -42C60 -4 92 42 92 76V136Q50 152 8 136Z',
};
const NAIL_TOP = { squoval: 10, round: 4, almond: -20, coffin: -22, stiletto: -42 };
const TIP_LINE = { squoval: 44, round: 40, almond: 28, coffin: 26, stiletto: 18 };
let nailUid = 0;

// One nail as SVG markup, in the 100-wide box above.
function nailSvg({ color, shape = 'almond', finish = 'gloss', detail = 'none', accent }) {
  const id = 'nl' + (++nailUid);
  const path = NAIL_PATHS[shape] || NAIL_PATHS.almond;
  const top = NAIL_TOP[shape] ?? 0;
  const ink = accent || (luminance(color) > 0.6 ? '#3a2228' : '#fdfaf6');
  const full = '<rect x="-20" y="-70" width="140" height="240"';
  let defs = `<clipPath id="${id}c"><path d="${path}"/></clipPath>`;
  let fill = color;
  if (finish === 'chrome') {
    defs += `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2=".3">` +
      `<stop offset="0" stop-color="${mix(color, '#000000', 0.35)}"/><stop offset=".3" stop-color="${mix(color, '#ffffff', 0.62)}"/>` +
      `<stop offset=".55" stop-color="${color}"/><stop offset=".74" stop-color="${mix(color, '#ffffff', 0.85)}"/>` +
      `<stop offset="1" stop-color="${mix(color, '#000000', 0.3)}"/></linearGradient>`;
    fill = `url(#${id}g)`;
  } else if (finish === 'matte') {
    fill = mix(color, '#9a8f8c', 0.1);
  }
  let body = `${full} fill="${fill}"/>`;
  if (finish === 'glitter') {
    defs += `<pattern id="${id}p" width="15" height="15" patternUnits="userSpaceOnUse" patternTransform="rotate(24)">` +
      '<circle cx="3" cy="4" r="1.8" fill="#ffffff" opacity=".85"/><circle cx="11" cy="9" r="1.4" fill="#f4d58c"/>' +
      '<circle cx="6" cy="12.5" r="1" fill="#ffffff" opacity=".7"/><circle cx="13.5" cy="2" r=".9" fill="#ffd3e0"/></pattern>';
    body += `${full} fill="url(#${id}p)"/>`;
  }
  if (detail === 'french') {
    const s = TIP_LINE[shape] ?? 30;
    body += `<path d="M-20 -70H120V${s}Q50 ${s - 34} -20 ${s}Z" fill="${ink}"/>`;
  } else if (detail === 'moon') {
    body += `<circle cx="50" cy="152" r="36" fill="${ink}"/>`;
  } else if (detail === 'dots') {
    const y0 = top + 42;
    body += [0, 1, 2].map((i) => `<circle cx="50" cy="${y0 + i * 26}" r="${7.5 - i * 1.2}" fill="${ink}"/>`).join('');
  } else if (detail === 'line') {
    body += `<path d="M66 160L34 ${top - 10}" stroke="${ink}" stroke-width="5"/>`;
  }
  if (finish === 'matte') {
    body += `<path d="M18 120V${top + 40}" stroke="#ffffff" stroke-width="14" stroke-linecap="round" opacity=".07"/>`;
  } else {
    body += `<path d="M24 120V${top + 34}" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity="${finish === 'chrome' ? 0.6 : 0.42}"/>` +
      `<path d="M75 ${top + 28}v13" stroke="#ffffff" stroke-width="5" stroke-linecap="round" opacity=".35"/>`;
  }
  return `<defs>${defs}</defs><g clip-path="url(#${id}c)">${body}</g>` +
    `<path d="${path}" fill="none" stroke="${mix(color, '#000000', 0.45)}" stroke-opacity=".3" stroke-width="2"/>`;
}

// A nail placed with its cuticle centered on (x, y), `width` wide.
function placedNail(opts, x, y, width) {
  const s = width / 84;
  return `<g transform="translate(${(x - 50 * s).toFixed(2)} ${(y - 144 * s).toFixed(2)}) scale(${s.toFixed(4)})">${nailSvg(opts)}</g>`;
}

// Resolve a look ({shade, shape, finish, detail, accent, ring}) into options
// for each of the five nails: thumb, index, middle, ring, pinky.
function lookNails(look) {
  const base = { color: shadeById(look.shade).hex, shape: look.shape, finish: look.finish, detail: look.detail, accent: look.accent };
  return [0, 1, 2, 3, 4].map((i) => {
    if (i !== 3 || !look.ring) return base;
    return { ...base, color: shadeById(look.ring.shade || look.shade).hex, detail: look.ring.detail ?? base.detail, finish: look.ring.finish || base.finish };
  });
}

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */

const state = {
  cart: [],
  look: { shade: SALON.shadeOfWeek, shape: 'almond', finish: 'gloss', detail: 'none', accent: null, ring: null, tone: 1 },
  lookChosen: false,
  family: shadeById(SALON.shadeOfWeek).family,
  menuTab: CATEGORIES[0].id,
  artist: 'any',
  date: null,
  time: null,
  lastRequest: null,
};

const cartMinutes = () => state.cart.reduce((n, id) => n + serviceById(id).mins, 0);
const cartPrice = () => state.cart.reduce((n, id) => n + serviceById(id).price, 0);

function toggleService(id, on = !state.cart.includes(id)) {
  if (on && !state.cart.includes(id)) state.cart.push(id);
  if (!on) state.cart = state.cart.filter((x) => x !== id);
  renderCart();
}

/* ------------------------------------------------------------------ */
/* Small widgets: tab lists and radio groups made of buttons            */
/* ------------------------------------------------------------------ */

const ARROWS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

function radioGroup(root, onPick) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[role="radio"]');
    if (b && !b.disabled && root.contains(b)) onPick(b.dataset.value);
  });
  root.addEventListener('keydown', (e) => {
    if (!(e.key in ARROWS)) return;
    const items = $$('[role="radio"]:not(:disabled)', root);
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = items[(i + ARROWS[e.key] + items.length) % items.length];
    onPick(next.dataset.value);
    // The pick may re-render the group; focus whatever now carries the value.
    const again = $$('[role="radio"]', root).find((b) => b.dataset.value === next.dataset.value);
    (again || next).focus();
  });
}

function syncRadios(root, value) {
  const items = $$('[role="radio"]', root);
  let focusable = null;
  items.forEach((b) => {
    const on = b.dataset.value === String(value);
    b.setAttribute('aria-checked', on);
    b.tabIndex = -1;
    if (on) focusable = b;
  });
  (focusable || items.find((b) => !b.disabled) || items[0] || {}).tabIndex = 0;
}

function tabList(root, tabs, selected, onPick) {
  root.innerHTML = tabs.map((t) =>
    `<button class="tab" type="button" role="tab" id="${root.id}-${t.id}" data-value="${t.id}" aria-selected="${t.id === selected}" tabindex="${t.id === selected ? 0 : -1}">${esc(t.label)}</button>`).join('');
  root.addEventListener('click', (e) => { const b = e.target.closest('[role="tab"]'); if (b) pick(b.dataset.value); });
  root.addEventListener('keydown', (e) => {
    if (!(e.key in ARROWS)) return;
    const items = $$('[role="tab"]', root);
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    e.preventDefault();
    const next = items[(i + ARROWS[e.key] + items.length) % items.length];
    next.focus();
    pick(next.dataset.value);
  });
  function pick(value) {
    $$('[role="tab"]', root).forEach((b) => { const on = b.dataset.value === value; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    onPick(value);
  }
}

/* ------------------------------------------------------------------ */
/* Salon details, opening status and hours                              */
/* ------------------------------------------------------------------ */

function renderSalonDetails() {
  $$('[data-salon="phone"]').forEach((a) => { a.textContent = SALON.phone; a.href = telHref(SALON.phone); });
  $$('[data-salon="email"]').forEach((a) => { a.textContent = SALON.email; a.href = 'mailto:' + SALON.email; });
  $$('[data-salon="street"]').forEach((a) => { a.textContent = SALON.street; });
  $$('[data-salon="address"]').forEach((el) => { el.textContent = SALON.address; });
  $$('[data-salon="instagram"]').forEach((a) => { a.textContent = '@' + SALON.instagram; a.href = 'https://www.instagram.com/' + SALON.instagram + '/'; });
  $$('[data-salon="walkins"]').forEach((el) => { el.textContent = `welcome until ${fmtTime(SALON.walkInsUntil)}`; });
  $('#directions').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(SALON.address);
  $('#year').textContent = new Date().getFullYear();
}

function renderOpenStatus() {
  const now = new Date();
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const today = SALON.hours[day];
  const box = $('#open-status');
  let text = 'Closed this week';
  let open = false;
  if (today && mins >= toMin(today[0]) && mins < toMin(today[1])) {
    open = true;
    text = `Open now · until ${fmtTime(today[1])}`;
  } else {
    for (let i = 0; i < 8; i++) {
      const h = SALON.hours[(day + i) % 7];
      if (!h || (i === 0 && mins >= toMin(h[0]))) continue;
      const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY_LONG[(day + i) % 7];
      text = `Closed · opens ${when} at ${fmtTime(h[0])}`;
      break;
    }
  }
  box.classList.toggle('is-closed', !open);
  $('.status-text', box).textContent = text;
}

function renderHours() {
  const today = new Date().getDay();
  const order = [1, 2, 3, 4, 5, 6, 0];
  $('#hours-table tbody').innerHTML = order.map((d) => {
    const h = SALON.hours[d];
    return `<tr class="${d === today ? 'today' : ''}"><th scope="row">${DAY_LONG[d]}</th><td>${h ? `${fmtTime(h[0])} – ${fmtTime(h[1])}` : 'Closed'}</td></tr>`;
  }).join('');
}

/* ------------------------------------------------------------------ */
/* Hero fan                                                             */
/* ------------------------------------------------------------------ */

function renderFan() {
  const svg = $('#hero-fan');
  const week = SALON.shadeOfWeek;
  const others = ['oat-milk', 'ballet-slipper', 'peony', 'fig-jam', 'pistachio', 'midnight-navy'].filter((id) => id !== week);
  const picks = [...others.slice(0, 3), week, ...others.slice(3, 6)];
  const angles = [-48, -32, -16, 0, 16, 32, 48];
  const px = 300, py = 500, r0 = 190, width = 100;
  const tips = picks.map((id, i) =>
    `<g class="tip" data-angle="${angles[i]}" style="transform: translate(${px}px, ${py}px) rotate(0deg)">` +
    `<rect x="-9" y="${-r0 - 30}" width="18" height="${r0 + 30}" rx="9" fill="#ffffff" fill-opacity=".72"/>` +
    placedNail({ color: shadeById(id).hex, shape: 'almond', finish: 'gloss' }, 0, -r0, width) +
    '</g>').join('');
  svg.innerHTML = tips + `<circle cx="${px}" cy="${py}" r="24" fill="#241619"/><circle cx="${px}" cy="${py}" r="9" fill="#f6e7b8"/>`;
  // Fan the tips out once they are on the page.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    $$('.tip', svg).forEach((t) => { t.style.transform = `translate(${px}px, ${py}px) rotate(${t.dataset.angle}deg)`; });
  }));
  const shade = shadeById(week);
  const card = $('#hero-shade');
  $('.chip', card).style.setProperty('--chip', shade.hex);
  $('strong', card).textContent = shade.name;
  card.addEventListener('click', () => applyLook({ shade: week, shape: 'almond', finish: 'gloss', detail: 'none' }));
}

/* ------------------------------------------------------------------ */
/* Menu and the "your visit" ticket                                     */
/* ------------------------------------------------------------------ */

const PLUS = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

function renderMenu() {
  $('#menu-panels').innerHTML = CATEGORIES.map((c) => `
    <div role="tabpanel" id="panel-${c.id}" aria-labelledby="menu-tabs-${c.id}" ${c.id === state.menuTab ? '' : 'hidden'}>
      <ul class="service-list">
        ${SERVICES.filter((s) => s.cat === c.id).map((s) => `
          <li class="service">
            <h3>${esc(s.name)}${s.popular ? ' <span class="tag">Popular</span>' : ''}</h3>
            <p>${esc(s.desc)}</p>
            <div class="service-meta"><span class="price">${money(s.price)}</span><span class="mins">${fmtDuration(s.mins)}</span></div>
            <button class="add" type="button" data-service="${s.id}" aria-pressed="false" aria-label="Add ${esc(s.name)}">${PLUS}</button>
          </li>`).join('')}
      </ul>
    </div>`).join('');
  tabList($('#menu-tabs'), CATEGORIES, state.menuTab, (id) => {
    state.menuTab = id;
    $$('#menu-panels [role="tabpanel"]').forEach((p) => { p.hidden = p.id !== 'panel-' + id; });
  });
  $('#menu-panels').addEventListener('click', (e) => {
    const b = e.target.closest('[data-service]');
    if (b) toggleService(b.dataset.service);
  });
  $('#ticket-no').textContent = 'No. ' + String(1000 + Math.floor(Math.random() * 9000));
}

function renderCart() {
  $$('#menu-panels [data-service]').forEach((b) => {
    const s = serviceById(b.dataset.service);
    const on = state.cart.includes(s.id);
    b.setAttribute('aria-pressed', on);
    b.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + s.name);
  });
  const items = state.cart.map(serviceById);
  $('#ticket-empty').hidden = items.length > 0;
  $('#ticket-list').innerHTML = items.map((s) => `
    <li><span>${esc(s.name)}<span class="t-mins">${fmtDuration(s.mins)}</span></span><span>${money(s.price)}</span>
    <button class="remove" type="button" data-remove="${s.id}" aria-label="Remove ${esc(s.name)}">×</button></li>`).join('');
  $('#ticket-time').textContent = fmtDuration(cartMinutes());
  $('#ticket-price').textContent = money(cartPrice());
  $('#ticket-live').textContent = items.length ? `${items.length} selected, ${fmtDuration(cartMinutes())}, about ${money(cartPrice())}` : 'Nothing selected';
  renderBookServices();
  renderSlots();
  renderSummary();
}

/* ------------------------------------------------------------------ */
/* Shade bar                                                            */
/* ------------------------------------------------------------------ */

// Fingers of a left hand seen from above, thumb on the right.
const FINGERS = [
  { x: 74, top: 168, w: 50 },  // pinky
  { x: 136, top: 100, w: 58 }, // ring
  { x: 202, top: 70, w: 62 },  // middle
  { x: 268, top: 104, w: 60 }, // index
];
const THUMB = { x: 316, base: 456, len: 172, w: 66, rot: 26 };

function fingerSvg(x, top, w, bottom, tone, shadow, crease) {
  const c = (y) => `<path d="M${x - w * 0.2} ${y}q${w * 0.2} 5 ${w * 0.4} 0" stroke="${crease}" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".55"/>`;
  return `<rect x="${x - w / 2 + 5}" y="${top + 3}" width="${w}" height="${bottom - top}" rx="${w / 2}" fill="${shadow}"/>` +
    `<rect x="${x - w / 2}" y="${top}" width="${w}" height="${bottom - top}" rx="${w / 2}" fill="${tone}"/>` +
    c(top + (bottom - top) * 0.46) + c(top + (bottom - top) * 0.5);
}

function renderHand() {
  const look = state.look;
  const tone = SKIN_TONES[look.tone] || SKIN_TONES[1];
  const shadow = mix(tone, '#3a1a10', 0.16);
  const crease = mix(tone, '#3a1a10', 0.3);
  const nails = lookNails(look);
  const nailFor = (finger, opts) => placedNail(opts, finger.x, finger.top + finger.w * 1.18, finger.w * 0.74);
  const [pinky, ring, middle, index] = FINGERS;
  const t = THUMB, thumb = { x: t.x, top: t.base - t.len, w: t.w };
  // The hand rises into a round "moon" and is clipped by it.
  let s = '<defs><clipPath id="hand-clip"><circle cx="210" cy="250" r="216"/></clipPath></defs>' +
    '<circle cx="210" cy="250" r="216" fill="#faf5ef" opacity=".75"/><g clip-path="url(#hand-clip)">';
  s += `<rect x="${pinky.x - pinky.w / 2}" y="300" width="${index.x + index.w / 2 - pinky.x + pinky.w / 2 + 14}" height="260" rx="58" fill="${tone}"/>`;
  FINGERS.forEach((f) => { s += fingerSvg(f.x, f.top, f.w, 360, tone, shadow, crease); });
  s += `<g transform="rotate(${t.rot} ${t.x} ${t.base})">${fingerSvg(t.x, thumb.top, t.w, t.base + 40, tone, shadow, crease)}${nailFor(thumb, nails[0])}</g>`;
  // Look order is thumb, index, middle, ring, pinky.
  s += nailFor(pinky, nails[4]) + nailFor(ring, nails[3]) + nailFor(middle, nails[2]) + nailFor(index, nails[1]) + '</g>';
  $('#hand').innerHTML = s;

  const shade = shadeById(look.shade);
  const bits = [labelOf(FINISHES, look.finish), labelOf(SHAPES, look.shape)];
  if (look.detail !== 'none') bits.push(labelOf(DETAILS, look.detail));
  if (look.ring) bits.push(shadeById(look.ring.shade || look.shade).name + ' accent');
  $('#shade-code').textContent = shade.code;
  $('#hand-label').textContent = shade.name;
  $('#shade-meta').textContent = bits.join(' · ');
}

function renderSwatches() {
  const fam = SHADE_FAMILIES.find((f) => f.id === state.family) || SHADE_FAMILIES[0];
  $('#swatches').innerHTML = SHADES.filter((s) => s.family === fam.id).map((s) =>
    `<button class="swatch" type="button" role="radio" data-value="${s.id}" style="--c:${s.hex}"><span class="cap" aria-hidden="true"></span>${esc(s.name)}</button>`).join('');
  syncRadios($('#swatches'), state.look.shade);
}

function pillGroup(root, items) {
  root.setAttribute('role', 'radiogroup');
  root.innerHTML = items.map((x) => `<button class="pill" type="button" role="radio" data-value="${x.id}">${esc(x.label)}</button>`).join('');
}

function syncShadeControls() {
  syncRadios($('#swatches'), state.look.shade);
  syncRadios($('#shapes'), state.look.shape);
  syncRadios($('#finishes'), state.look.finish);
  syncRadios($('#details'), state.look.detail);
  syncRadios($('#tones'), state.look.tone);
  renderHand();
}

function setLook(patch) {
  Object.assign(state.look, patch);
  syncShadeControls();
  renderSummary();
}

// Put a whole look (from the lookbook, an artist or the hero) on the hand.
function applyLook(look) {
  const shade = shadeById(look.shade);
  if (shade.family !== state.family) {
    state.family = shade.family;
    $$('#families [role="tab"]').forEach((b) => { const on = b.dataset.value === state.family; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    renderSwatches();
  }
  setLook({ accent: null, ring: null, detail: 'none', ...look, shade: shade.id });
}

function initShadeBar() {
  tabList($('#families'), SHADE_FAMILIES, state.family, (id) => { state.family = id; renderSwatches(); });
  renderSwatches();
  pillGroup($('#shapes'), SHAPES);
  pillGroup($('#finishes'), FINISHES);
  pillGroup($('#details'), DETAILS);
  const tones = $('#tones');
  tones.setAttribute('role', 'radiogroup');
  tones.innerHTML = SKIN_TONES.map((c, i) => `<button class="tone" type="button" role="radio" data-value="${i}" style="--c:${c}" aria-label="Skin tone ${i + 1}"></button>`).join('');

  // Picking a new shade clears accents that belonged to the previous look.
  radioGroup($('#swatches'), (id) => setLook({ shade: id, ring: null, accent: null }));
  radioGroup($('#shapes'), (id) => setLook({ shape: id }));
  radioGroup($('#finishes'), (id) => setLook({ finish: id }));
  radioGroup($('#details'), (id) => setLook({ detail: id }));
  radioGroup(tones, (i) => setLook({ tone: Number(i) }));
  syncShadeControls();

  $('#surprise').addEventListener('click', () => {
    const r = (list) => list[Math.floor(Math.random() * list.length)];
    applyLook({ shade: r(SHADES).id, shape: r(SHAPES).id, finish: r(FINISHES).id, detail: Math.random() < 0.5 ? 'none' : r(DETAILS).id });
  });
  $('#use-shade').addEventListener('click', bookWithLook);
}

// "Book with this look": note the look on the request and make sure the visit
// has the services it needs.
function bookWithLook() {
  state.lookChosen = true;
  const look = state.look;
  const hasBase = state.cart.some((id) => ['hands', 'enhance'].includes(serviceById(id).cat) && id !== 'removal');
  if (!hasBase) toggleService(['coffin', 'stiletto'].includes(look.shape) ? 'gelx' : 'gel-mani', true);
  if (look.finish === 'chrome') toggleService('chrome', true);
  if (look.detail === 'french') toggleService('french', true);
  if (['moon', 'dots', 'line'].includes(look.detail) || look.ring) {
    if (!state.cart.includes('art-full')) toggleService('art-2', true);
  }
  renderSummary();
  $('#book').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

/* ------------------------------------------------------------------ */
/* Lookbook, artists and reviews                                        */
/* ------------------------------------------------------------------ */

function setSvg(look) {
  const nails = lookNails(look);
  const sizes = [62, 50, 54, 48, 40];
  const xs = [42, 100, 156, 210, 260];
  const base = 196;
  return `<svg viewBox="0 56 300 150" aria-hidden="true">${nails.map((n, i) => placedNail(n, xs[i], base - (i === 0 ? 0 : 6), sizes[i])).join('')}</svg>`;
}

function renderLooks() {
  $('#look-grid').innerHTML = LOOKS.map((l) => `
    <article class="look">
      <div class="look-art" style="--bg:${l.bg}">${setSvg(l.look)}</div>
      <div class="look-body">
        <h3>${esc(l.name)}</h3>
        <p>${esc(l.desc)}</p>
        <div class="look-foot">
          <span class="from"><small>from</small>${money(l.from)}</span>
          <button class="link-btn" type="button" data-look="${l.id}">Try it on</button>
        </div>
      </div>
    </article>`).join('');
  $('#look-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-look]');
    if (!b) return;
    applyLook(LOOKS.find((l) => l.id === b.dataset.look).look);
    $('#shades').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}

// [2, 3, 4, 5, 6] -> "Tue–Sat", in Monday-first order.
function dayRange(days) {
  const order = [1, 2, 3, 4, 5, 6, 0];
  const runs = [];
  order.forEach((d, i) => {
    if (!days.includes(d)) return;
    const last = runs[runs.length - 1];
    if (last && last.end === i - 1) last.end = i; else runs.push({ start: i, end: i });
  });
  return runs.map((r) => r.start === r.end ? DAY_SHORT[order[r.start]] :
    `${DAY_SHORT[order[r.start]]}${r.end - r.start > 1 ? '–' : ', '}${DAY_SHORT[order[r.end]]}`).join(', ');
}

function renderArtists() {
  $('#artist-grid').innerHTML = ARTISTS.map((a) => {
    const look = a.look;
    const nail = `<svg viewBox="-15 -50 130 200" aria-hidden="true">${nailSvg({ color: shadeById(look.shade).hex, shape: look.shape, finish: look.finish, detail: look.detail, accent: look.accent })}</svg>`;
    return `
    <article class="artist">
      <div class="artist-top" style="--bg:${a.bg}"><span class="initial" aria-hidden="true">${esc(a.name[0])}.</span>${nail}</div>
      <div class="artist-body">
        <p class="artist-role">${esc(a.role)}</p>
        <h3>${esc(a.name)}</h3>
        <p>${esc(a.bio)}</p>
        <p class="artist-days">In the studio ${dayRange(a.days)}</p>
        <button class="link-btn" type="button" data-artist="${a.id}">Book with ${esc(a.name.split(' ')[0])}</button>
      </div>
    </article>`;
  }).join('');
  $('#artist-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-artist]');
    if (!b) return;
    pickArtist(b.dataset.artist);
    $('#book').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
}

function renderReviews() {
  $('#review-grid').innerHTML = REVIEWS.map((r) => `
    <figure class="review">
      <span class="stars" aria-label="5 out of 5 stars">★★★★★</span>
      <blockquote>“${esc(r.quote)}”</blockquote>
      <figcaption><strong>${esc(r.name)}</strong> · ${esc(r.service)}</figcaption>
    </figure>`).join('');
}

/* ------------------------------------------------------------------ */
/* Booking                                                              */
/* ------------------------------------------------------------------ */

function renderBookServices() {
  const box = $('#book-services');
  if (!box) return;
  const chosen = state.cart.map(serviceById);
  const quick = SERVICES.filter((s) => s.popular && !state.cart.includes(s.id));
  box.innerHTML =
    (chosen.length ? `<ul class="chosen">${chosen.map((s) => `<li>${esc(s.name)} <button class="remove" type="button" data-remove="${s.id}" aria-label="Remove ${esc(s.name)}">×</button></li>`).join('')}</ul>` : '') +
    `<div class="quick"><span class="quick-label">${chosen.length ? 'Add more:' : 'Popular:'}</span>` +
    quick.map((s) => `<button class="pill" type="button" data-quick="${s.id}">+ ${esc(s.name)}</button>`).join('') +
    `<a class="link-btn" href="#menu">Full menu</a></div>`;
}

const worksOn = (artistId, weekday) => artistId === 'any' ? true : artistById(artistId).days.includes(weekday);

// Bookable start times for a day: open to close minus the visit length, every
// 15 minutes, skipping the past and a stable set of taken slots.
function slotsFor(iso) {
  const d = parseIso(iso);
  const hours = SALON.hours[d.getDay()];
  if (!hours || !worksOn(state.artist, d.getDay())) return [];
  const length = Math.max(cartMinutes(), 30);
  const now = new Date();
  const earliest = iso === isoDate(now) ? now.getHours() * 60 + now.getMinutes() + 30 : 0;
  const out = [];
  for (let m = toMin(hours[0]); m + length <= toMin(hours[1]); m += 15) {
    if (m < earliest) continue;
    const time = fromMin(m);
    const busy = hash(`${iso}|${state.artist}|${time}`) % 100;
    out.push({ time, taken: busy < (state.artist === 'any' ? 16 : 38) });
  }
  return out;
}

function upcomingDays() {
  const start = new Date();
  return Array.from({ length: SALON.bookAheadDays }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const iso = isoDate(d);
    return { iso, d, open: slotsFor(iso).some((s) => !s.taken) };
  });
}

function renderArtistPick() {
  const box = $('#book-artists');
  const opts = [{ id: 'any', name: 'First free', sub: 'Any artist', bg: '#faf5ef', mono: '☾' },
    ...ARTISTS.map((a) => ({ id: a.id, name: a.name.split(' ')[0], sub: a.role, bg: a.bg, mono: a.name[0] }))];
  box.innerHTML = opts.map((o) =>
    `<button class="artist-opt" type="button" role="radio" data-value="${o.id}" style="--bg:${o.bg}"><span class="mono" aria-hidden="true">${esc(o.mono)}</span>${esc(o.name)}<small>${esc(o.sub)}</small></button>`).join('');
  syncRadios(box, state.artist);
}

function renderDays() {
  const days = upcomingDays();
  if (state.date && !days.some((d) => d.iso === state.date && d.open)) state.date = null;
  if (!state.date) state.date = (days.find((d) => d.open) || {}).iso || null;
  $('#book-days').innerHTML = days.map(({ iso, d, open }) =>
    `<button class="day" type="button" role="radio" data-value="${iso}" ${open ? '' : 'disabled'} aria-label="${DAY_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${open ? '' : ', unavailable'}">` +
    `<span class="dow">${DAY_SHORT[d.getDay()]}</span><span class="dnum">${d.getDate()}</span><span class="mon">${MONTHS[d.getMonth()]}</span></button>`).join('');
  syncRadios($('#book-days'), state.date);
  renderSlots();
}

function renderSlots() {
  const box = $('#book-slots');
  if (!box) return;
  const slots = state.date ? slotsFor(state.date) : [];
  if (state.time && !slots.some((s) => s.time === state.time && !s.taken)) state.time = null;
  if (!slots.some((s) => !s.taken)) {
    box.innerHTML = `<p class="slots-note">${state.date ? 'No free times left on this day.' : 'No free days in the next two weeks with this artist.'} Try another day or artist, or call us on ${esc(SALON.phone)}.</p>`;
    box.removeAttribute('role');
  } else {
    box.setAttribute('role', 'radiogroup');
    box.setAttribute('aria-label', 'Start time');
    box.innerHTML = slots.map((s) =>
      `<button class="slot" type="button" role="radio" data-value="${s.time}" ${s.taken ? `disabled aria-label="${fmtTime(s.time)}, taken"` : ''}>${fmtTime(s.time)}</button>`).join('');
    syncRadios(box, state.time);
  }
  renderSummary();
}

function pickArtist(id) {
  state.artist = id;
  syncRadios($('#book-artists'), id);
  renderDays();
}

function lookText() {
  const l = state.look;
  const bits = [shadeById(l.shade).name, labelOf(FINISHES, l.finish), labelOf(SHAPES, l.shape)];
  if (l.detail !== 'none') bits.push(labelOf(DETAILS, l.detail));
  if (l.ring) bits.push(shadeById(l.ring.shade || l.shade).name + ' accent nail');
  return bits.join(', ');
}

function renderSummary() {
  const list = $('#summary-list');
  if (!list) return;
  const services = state.cart.map(serviceById);
  const artist = state.artist === 'any' ? 'First free artist' : artistById(state.artist).name;
  const when = state.date && state.time ? `${fmtDay(state.date)} · ${fmtTime(state.time)}` : 'Pick a day and time';
  const rows = [
    ['Services', services.length ? services.map((s) => esc(s.name)).join('<br>') : 'None yet'],
    ['Artist', esc(artist)],
    ['When', esc(when)],
  ];
  if (state.lookChosen) rows.push(['Look', `${esc(lookText())} <button class="remove" type="button" id="drop-look" aria-label="Remove the look">×</button>`]);
  if (services.length) rows.push(['Takes', fmtDuration(cartMinutes())]);
  list.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('') +
    `<div class="total"><dt>Estimate</dt><dd>${money(cartPrice())}</dd></div>`;
}

function showError(msg, field) {
  const box = $('#form-error');
  box.textContent = msg;
  box.hidden = false;
  if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
}

function buildRequest(form) {
  const data = new FormData(form);
  const services = state.cart.map(serviceById);
  return {
    salon: SALON.name,
    services: services.map((s) => s.name),
    artist: state.artist === 'any' ? 'First free artist' : artistById(state.artist).name,
    date: state.date,
    time: state.time,
    minutes: cartMinutes(),
    estimate: cartPrice(),
    look: state.lookChosen ? lookText() : '',
    name: String(data.get('name') || '').trim(),
    phone: String(data.get('phone') || '').trim(),
    email: String(data.get('email') || '').trim(),
    notes: String(data.get('notes') || '').trim(),
  };
}

function requestText(r) {
  return [
    `Booking request for ${SALON.name}`,
    '',
    `When: ${fmtDay(r.date)} at ${fmtTime(r.time)} (${fmtDuration(r.minutes)})`,
    `Services: ${r.services.join(', ')}`,
    `Artist: ${r.artist}`,
    r.look ? `Look: ${r.look}` : '',
    `Estimate: ${money(r.estimate)}`,
    '',
    `Name: ${r.name}`,
    `Mobile: ${r.phone}`,
    r.email ? `Email: ${r.email}` : '',
    r.notes ? `Notes: ${r.notes}` : '',
  ].filter((line, i, all) => line || all[i - 1]).join('\n');
}

async function submitBooking(e) {
  e.preventDefault();
  const form = e.currentTarget;
  $$('[aria-invalid]', form).forEach((f) => f.removeAttribute('aria-invalid'));
  $('#form-error').hidden = true;
  const r = buildRequest(form);
  if (!r.services.length) return showError('Add at least one service to your visit.', $('#book-services button, #book-services a'));
  if (!r.date || !r.time) return showError('Pick a day and a start time.', $('#book-slots [role="radio"]:not(:disabled)') || $('#book-days [role="radio"]:not(:disabled)'));
  if (!r.name) return showError('Tell us your name.', form.elements.name);
  if (r.phone.replace(/\D/g, '').length < 7) return showError('Add a mobile number so we can confirm by text.', form.elements.phone);
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) return showError('That email address does not look right.', form.elements.email);

  const button = $('#submit');
  button.disabled = true;
  try {
    if (SALON.bookingEndpoint) {
      const res = await fetch(SALON.bookingEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(r) });
      if (!res.ok) throw new Error('Request failed with status ' + res.status);
      $('#confirm-text').textContent = `We have your request for ${fmtDay(r.date)} at ${fmtTime(r.time)} with ${r.artist.toLowerCase() === 'first free artist' ? 'the first free artist' : r.artist}. We will text ${r.phone} to confirm.`;
    } else {
      const subject = `Booking request: ${fmtDay(r.date)} at ${fmtTime(r.time)}`;
      window.location.href = `mailto:${SALON.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(requestText(r))}`;
      $('#confirm-text').textContent = `Your email app should open with the request addressed to ${SALON.email}. Press send and we will text ${r.phone} to confirm. If nothing opened, call us on ${SALON.phone}.`;
    }
    state.lastRequest = r;
    form.hidden = true;
    const confirm = $('#confirm');
    confirm.hidden = false;
    confirm.focus();
  } catch (err) {
    showError(`We could not send that just now. Please try again or call us on ${SALON.phone}.`);
  } finally {
    button.disabled = false;
  }
}

function downloadCalendar() {
  const r = state.lastRequest;
  if (!r) return;
  const stamp = (iso, hhmm) => iso.replace(/-/g, '') + 'T' + hhmm.replace(':', '') + '00';
  const end = fromMin(toMin(r.time) + Math.max(r.minutes, 30));
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const escIcs = (s) => s.replace(/[\\,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Half Moon Nail Studio//Booking//EN', 'BEGIN:VEVENT',
    `UID:${Date.now()}@halfmoon`, `DTSTAMP:${now}`, `DTSTART:${stamp(r.date, r.time)}`, `DTEND:${stamp(r.date, end)}`,
    `SUMMARY:${escIcs('Nails at ' + SALON.name)}`, `LOCATION:${escIcs(SALON.address)}`,
    `DESCRIPTION:${escIcs(r.services.join(', ') + (r.look ? '\nLook: ' + r.look : '') + '\nRequested, waiting for confirmation.')}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'half-moon-booking.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function initBooking() {
  renderArtistPick();
  radioGroup($('#book-artists'), pickArtist);
  radioGroup($('#book-days'), (iso) => { state.date = iso; state.time = null; syncRadios($('#book-days'), iso); renderSlots(); });
  radioGroup($('#book-slots'), (time) => { state.time = time; syncRadios($('#book-slots'), time); renderSummary(); });
  renderBookServices();
  renderDays();

  // Remove buttons in the ticket, the booking form and the summary.
  document.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove]');
    if (rm) { toggleService(rm.dataset.remove, false); return; }
    const quick = e.target.closest('[data-quick]');
    if (quick) { toggleService(quick.dataset.quick, true); return; }
    if (e.target.closest('#drop-look')) { state.lookChosen = false; renderSummary(); }
  });

  const form = $('#booking');
  form.addEventListener('submit', submitBooking);
  form.addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));
  $('#add-calendar').addEventListener('click', downloadCalendar);
  $('#book-another').addEventListener('click', () => {
    form.reset();
    state.cart = [];
    state.time = null;
    state.lookChosen = false;
    $('#confirm').hidden = true;
    form.hidden = false;
    renderCart();
    renderDays();
    $('#book').scrollIntoView();
  });
}

/* ------------------------------------------------------------------ */
/* Header                                                               */
/* ------------------------------------------------------------------ */

function initNav() {
  const toggle = $('.nav-toggle');
  const nav = $('#nav');
  const set = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open);
    $('.sr-only', toggle).textContent = open ? 'Close menu' : 'Open menu';
  };
  toggle.addEventListener('click', () => set(!nav.classList.contains('is-open')));
  nav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { set(false); toggle.focus(); } });
}

/* ------------------------------------------------------------------ */

renderSalonDetails();
renderOpenStatus();
setInterval(renderOpenStatus, 60 * 1000);
renderHours();
renderFan();
renderMenu();
initShadeBar();
renderLooks();
renderArtists();
renderReviews();
initBooking();
renderCart();
initNav();
