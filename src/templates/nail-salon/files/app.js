/* Half Moon Nail Studio
   Everything the salon changes lives in the data at the top of this file:
   details, hours and the monthly offer, the menu, the shade bar, the featured
   sets, the artists, the shop of take-home products and the reviews. The page
   below the data only reads it. */

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
  shadeOfWeek: 'tangerine',
  // The offer band. Bookings on one of `days` (Sunday = 0) take `percent` off
  // the listed services. Set offer to null to hide the band.
  offer: {
    name: 'Midweek Moons',
    text: '15% off gel and BIAB manicures every Tuesday and Wednesday.',
    days: [2, 3],
    services: ['gel-mani', 'biab'],
    percent: 15,
  },
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
    ['ballet-slipper', 'Ballet Slipper', '#f3d3d6'], ['peony', 'Peony', '#efa5b7'], ['bubblegum', 'Bubblegum', '#e57aa3'],
    ['rosewater', 'Rosewater', '#d98b97'], ['hot-lips', 'Hot Lips', '#e0407a'],
  ] },
  { id: 'reds', label: 'Reds & oranges', shades: [
    ['tangerine', 'Tangerine', '#e4683f'], ['cherry-cola', 'Cherry Cola', '#8e1b2e'], ['fire-engine', 'Fire Engine', '#d0212f'],
    ['tomato-girl', 'Tomato Girl', '#e2523a'], ['garnet', 'Garnet', '#6f1424'],
  ] },
  { id: 'berries', label: 'Berries', shades: [
    ['house-mauve', 'House Mauve', '#8b4a62'], ['fig-jam', 'Fig Jam', '#5a2141'], ['lilac-hour', 'Lilac Hour', '#bba6d8'],
    ['plum-wine', 'Plum Wine', '#6c2b58'], ['orchid', 'Orchid', '#a65aa1'],
  ] },
  { id: 'greens', label: 'Greens & blues', shades: [
    ['pear', 'Pear', '#c3c75c'], ['fern', 'Fern', '#4f8a55'], ['pistachio', 'Pistachio', '#bccf9c'],
    ['cornflower', 'Cornflower', '#7090d6'], ['midnight-navy', 'Midnight Navy', '#1e2a4e'],
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

// Featured sets. `ring` styles the ring finger differently, as an accent nail.
// `bg` tints the card; `rating` and `reviews` show under the name.
const LOOKS = [
  { id: 'signature', name: 'The Half Moon', bg: '#f3e6ea', from: 60, rating: 4.9, reviews: 312,
    desc: 'Our signature: a milky base with mauve moons at the cuticle and one solid mauve nail.',
    look: { shade: 'milk-bath', shape: 'squoval', finish: 'gloss', detail: 'moon', accent: '#8f5d6e', ring: { shade: 'house-mauve', detail: 'none' } } },
  { id: 'cola-chrome', name: 'Cherry Cola Chrome', bg: '#f6ede2', from: 58, rating: 4.8, reviews: 187,
    desc: 'Deep cherry gel under a sheer chrome powder, so it shifts from red to rose gold in the light.',
    look: { shade: 'cherry-cola', shape: 'almond', finish: 'chrome', detail: 'none' } },
  { id: 'micro-french', name: 'Micro French', bg: '#eef0ea', from: 60, rating: 4.9, reviews: 264,
    desc: 'A sheer ballet-pink base with the thinnest white tip. Quiet, clean and good with everything.',
    look: { shade: 'ballet-slipper', shape: 'almond', finish: 'gloss', detail: 'french', accent: '#fdfaf6' } },
  { id: 'pear-dots', name: 'Pear Dots', bg: '#f1f1e3', from: 62, rating: 4.7, reviews: 98,
    desc: 'Soft pear green with three hand-placed milk dots on every nail. Spring, all year long.',
    look: { shade: 'pear', shape: 'round', finish: 'gloss', detail: 'dots', accent: '#fdfaf6' } },
  { id: 'midnight', name: 'Midnight Sparkle', bg: '#ebe8f2', from: 92, rating: 4.8, reviews: 141,
    desc: 'Coffin Gel-X in navy with a fine silver and gold glitter. Made for late dinners.',
    look: { shade: 'midnight-navy', shape: 'coffin', finish: 'glitter', detail: 'none' } },
  { id: 'fig-line', name: 'Fig & Gold Line', bg: '#f3e6ea', from: 62, rating: 4.8, reviews: 119,
    desc: 'Matte fig with a single gold line painted across each nail by hand.',
    look: { shade: 'fig-jam', shape: 'squoval', finish: 'matte', detail: 'line', accent: '#e4c27c' } },
];

// Artists. `days` are the weekdays they work, Sunday = 0.
const ARTISTS = [
  { id: 'mina', name: 'Mina Park', role: 'Studio lead', bg: '#f3e6ea', days: [2, 3, 4, 5, 6],
    bio: 'Russian manicures and BIAB that grows out invisibly. Fixes nails other salons gave up on.',
    look: { shade: 'bare-truth', shape: 'squoval', finish: 'gloss', detail: 'none' } },
  { id: 'lucia', name: 'Lucía Herrera', role: 'Nail artist', bg: '#f6ede2', days: [0, 3, 4, 5, 6],
    bio: 'Hand-painted florals, fine lines and anything you can pin to a mood board.',
    look: { shade: 'lilac-hour', shape: 'almond', finish: 'gloss', detail: 'dots', accent: '#fdfaf6' } },
  { id: 'dee', name: 'Dee Okafor', role: 'Pedicure lead', bg: '#eef0ea', days: [0, 2, 3, 4, 5],
    bio: 'Long, slow spa pedicures. Ask about the hot-stone massage, it is worth the extra time.',
    look: { shade: 'tangerine', shape: 'round', finish: 'gloss', detail: 'none' } },
  { id: 'hana', name: 'Hana Sato', role: 'Extensions', bg: '#ebe8f2', days: [0, 4, 5, 6],
    bio: 'Gel-X and sculpted sets in almond, coffin and stiletto, balanced to last.',
    look: { shade: 'midnight-navy', shape: 'stiletto', finish: 'chrome', detail: 'none' } },
];

// The shelf: aftercare to take home. Added items are set aside at the front
// desk and paid for at the visit. Photos live in photos/ (from Pexels).
const PRODUCTS = [
  { id: 'cuticle-oil', name: 'Moon Drop cuticle oil', size: '10 ml', price: 18, rating: 4.9, reviews: 212,
    photo: 'photos/cuticle-oil.jpg', alt: 'An amber dropper bottle of cuticle oil in soft sunlight',
    desc: 'Jojoba and sweet almond oil. Two drops a night keeps gel from lifting.' },
  { id: 'take-home-polish', name: 'Shade of the week, to go', size: '12 ml', price: 15, rating: 4.8, reviews: 96,
    photo: 'photos/polish.jpg', alt: 'A hand opening a bottle of bright pink nail polish',
    desc: 'The color you are wearing, for touch-ups between visits.' },
  { id: 'hand-cream', name: 'Fig & Oat hand cream', size: '60 ml', price: 22, rating: 4.8, reviews: 164,
    photo: 'photos/hand-cream.jpg', alt: 'Hand cream squeezed from a tube into an open palm on a pink background',
    desc: 'Rich but never greasy. Our artists finish every manicure with it.' },
  { id: 'glass-file', name: 'Crystal glass file', size: '14 cm', price: 14, rating: 4.9, reviews: 98,
    photo: 'photos/glass-file.jpg', alt: 'A pink glass nail file beside a bottle of white polish',
    desc: 'Seals the free edge as it shapes, so nails do not peel. Lasts for years.' },
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
const smooth = () => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

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
const productById = (id) => PRODUCTS.find((p) => p.id === id);
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

// Five nails laid out like a press-on set: thumb, index, middle, ring, pinky.
function setSvg(look, { width = 300, base = 196 } = {}) {
  const nails = lookNails(look);
  const sizes = [62, 50, 54, 48, 40];
  const xs = [42, 100, 156, 210, 260];
  const k = width / 300;
  return nails.map((n, i) => placedNail(n, xs[i] * k, base - (i === 0 ? 0 : 6), sizes[i] * k)).join('');
}

// A polish bottle in the look's shade and finish, 160 x 250, cap at the top.
function bottleSvg(look, x = 0, y = 0) {
  const id = 'bt' + (++nailUid);
  const color = shadeById(look.shade).hex;
  const body = 'M14 92q0-18 18-18h96q18 0 18 18v126q0 22-22 22H36q-22 0-22-22z';
  let defs = `<clipPath id="${id}c"><path d="${body}"/></clipPath>`;
  let fill = color;
  if (look.finish === 'chrome') {
    defs += `<linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="${mix(color, '#000000', 0.3)}"/>` +
      `<stop offset=".35" stop-color="${mix(color, '#ffffff', 0.6)}"/><stop offset=".6" stop-color="${color}"/>` +
      `<stop offset=".8" stop-color="${mix(color, '#ffffff', 0.8)}"/><stop offset="1" stop-color="${mix(color, '#000000', 0.25)}"/></linearGradient>`;
    fill = `url(#${id}g)`;
  } else if (look.finish === 'matte') {
    fill = mix(color, '#9a8f8c', 0.1);
  }
  let inside = `<rect x="0" y="60" width="160" height="200" fill="${fill}"/>`;
  if (look.finish === 'glitter') {
    defs += `<pattern id="${id}p" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(20)">` +
      '<circle cx="3" cy="4" r="1.6" fill="#ffffff" opacity=".85"/><circle cx="10" cy="9" r="1.3" fill="#f4d58c"/><circle cx="6" cy="12" r=".9" fill="#ffffff" opacity=".7"/></pattern>';
    inside += `<rect x="0" y="60" width="160" height="200" fill="url(#${id}p)"/>`;
  }
  // Glass: a little clear space at the top of the bottle, and a soft shine.
  inside += `<rect x="0" y="60" width="160" height="34" fill="#ffffff" opacity=".55"/>`;
  if (look.finish !== 'matte') inside += '<rect x="30" y="104" width="12" height="112" rx="6" fill="#ffffff" opacity=".45"/>';
  return `<g transform="translate(${x} ${y})"><defs>${defs}</defs>` +
    `<rect x="52" y="0" width="56" height="70" rx="8" fill="#2b2326"/><rect x="60" y="8" width="8" height="54" rx="4" fill="#ffffff" opacity=".18"/>` +
    `<rect x="46" y="64" width="68" height="14" rx="4" fill="#3a3034"/>` +
    `<g clip-path="url(#${id}c)">${inside}</g>` +
    `<path d="${body}" fill="none" stroke="${mix(color, '#000000', 0.35)}" stroke-opacity=".25" stroke-width="2"/>` +
    `<rect x="44" y="168" width="72" height="40" rx="6" fill="#ffffff" opacity=".92"/>` +
    `<text x="80" y="185" text-anchor="middle" font-family="Playfair Display, Georgia, serif" font-size="13" fill="#2b2326">Half Moon</text>` +
    `<text x="80" y="200" text-anchor="middle" font-family="Figtree, system-ui, sans-serif" font-size="9" letter-spacing="1.5" fill="#6f6367">${esc(shadeById(look.shade).code.toUpperCase())}</text></g>`;
}

// Solid category icons in the brand mauve, 64 x 64.
function categoryIcon(id) {
  const wrap = (inner) => `<svg viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
  if (id === 'hands') {
    return wrap('<rect x="24" y="4" width="16" height="22" rx="4"/><rect x="21" y="24" width="22" height="6" rx="2"/>' +
      '<path d="M12 40q0-10 10-10h20q10 0 10 10v14q0 6-6 6H18q-6 0-6-6z"/>');
  }
  if (id === 'feet') {
    return wrap('<ellipse cx="34" cy="42" rx="14" ry="19"/><ellipse cx="22" cy="14" rx="6" ry="7"/><circle cx="32" cy="10" r="4.4"/>' +
      '<circle cx="40.5" cy="12" r="3.9"/><circle cx="47.5" cy="16.5" r="3.4"/><circle cx="52" cy="23" r="3"/>');
  }
  if (id === 'enhance') {
    return wrap(`<g transform="translate(17 8) scale(.3)"><path d="${NAIL_PATHS.coffin}"/></g>` +
      '<path d="M49 6v10M44 11h10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>');
  }
  return wrap('<path d="M10 56l26-26 6 6-26 26z" transform="translate(0 -6)"/><path d="M38 22l8-8 6 6-8 8z"/>' +
    '<path d="M46 14c4-6 10-8 12-6 2 2 0 8-6 12z"/><path d="M14 10l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M50 40l1.5 4.5L56 46l-4.5 1.5L50 52l-1.5-4.5L44 46l4.5-1.5z"/>');
}

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */

const state = {
  cart: [],    // service ids
  shelf: [],   // product ids to take home
  look: { shade: SALON.shadeOfWeek, shape: 'almond', finish: 'gloss', detail: 'none', accent: null, ring: null },
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
const shelfPrice = () => state.shelf.reduce((n, id) => n + productById(id).price, 0);

// What the offer takes off this visit, once the day is known.
function offerDiscount() {
  const o = SALON.offer;
  if (!o || !state.date || !o.days.includes(parseIso(state.date).getDay())) return 0;
  const base = state.cart.filter((id) => o.services.includes(id)).reduce((n, id) => n + serviceById(id).price, 0);
  return Math.round(base * o.percent / 100);
}
const estimate = () => cartPrice() + shelfPrice() - offerDiscount();

function toggleService(id, on = !state.cart.includes(id)) {
  if (on && !state.cart.includes(id)) state.cart.push(id);
  if (!on) state.cart = state.cart.filter((x) => x !== id);
  renderCart();
}

function toggleProduct(id, on = !state.shelf.includes(id)) {
  if (on && !state.shelf.includes(id)) state.shelf.push(id);
  if (!on) state.shelf = state.shelf.filter((x) => x !== id);
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

function tabList(root, tabs, selected, onPick, { cls = 'tab', label = (t) => esc(t.label) } = {}) {
  root.innerHTML = tabs.map((t) =>
    `<button class="${cls}" type="button" role="tab" id="${root.id}-${t.id}" data-value="${t.id}" aria-selected="${t.id === selected}" tabindex="${t.id === selected ? 0 : -1}">${label(t)}</button>`).join('');
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
/* Announcement bar and promo band                                      */
/* ------------------------------------------------------------------ */

function renderOffer() {
  const o = SALON.offer;
  if (!o) {
    $('#offer').hidden = true;
    $('#announce-offer').textContent = `Walk-ins welcome until ${fmtTime(SALON.walkInsUntil)}`;
    return;
  }
  $('#announce-offer').textContent = `${o.name}: ${o.text}`;
  $('#offer-name').textContent = o.name;
  $('#offer-text').textContent = o.text;
  $('#offer-book').addEventListener('click', () => {
    // Book the next day the offer applies, with a service it covers.
    if (!state.cart.some((id) => o.services.includes(id))) toggleService(o.services[0], true);
    const day = upcomingDays().find((d) => d.open && o.days.includes(d.d.getDay()));
    if (day) { state.date = day.iso; state.time = null; renderDays(); }
    $('#book').scrollIntoView({ behavior: smooth() });
  });
}

/* ------------------------------------------------------------------ */
/* Menu, shelf and the "your visit" ticket                              */
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
  }, {
    cls: 'cat-tile',
    label: (c) => {
      const list = SERVICES.filter((s) => s.cat === c.id);
      const from = Math.min(...list.map((s) => s.price));
      return `<span class="cat-icon">${categoryIcon(c.id)}</span><span class="cat-name">${esc(c.label)}</span>` +
        `<span class="cat-meta">${list.length} services · from ${money(from)}</span>`;
    },
  });
  $('#menu-panels').addEventListener('click', (e) => {
    const b = e.target.closest('[data-service]');
    if (b) toggleService(b.dataset.service);
  });
  $('#ticket-no').textContent = 'No. ' + String(1000 + Math.floor(Math.random() * 9000));
}

const stars = (rating) => `<span class="stars" aria-hidden="true">${'★'.repeat(Math.round(rating))}${'☆'.repeat(5 - Math.round(rating))}</span>`;

function renderShelf() {
  $('#shelf-grid').innerHTML = PRODUCTS.map((p) => `
    <article class="card product">
      <div class="card-media"><img src="${esc(p.photo)}" alt="${esc(p.alt)}" width="720" height="720" loading="lazy"></div>
      <div class="card-body">
        <div class="card-title"><h3>${esc(p.name)}</h3><span class="price">${money(p.price)}</span></div>
        <p class="rating">${stars(p.rating)} <span>${p.rating} · ${p.reviews} reviews</span></p>
        <p class="card-desc">${esc(p.desc)} <span class="size">${esc(p.size)}</span></p>
        <button class="btn btn-primary btn-small" type="button" data-product="${p.id}" aria-pressed="false">Add to visit</button>
      </div>
    </article>`).join('');
  $('#shelf-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-product]');
    if (b) toggleProduct(b.dataset.product);
  });
}

function renderCart() {
  $$('#menu-panels [data-service]').forEach((b) => {
    const s = serviceById(b.dataset.service);
    const on = state.cart.includes(s.id);
    b.setAttribute('aria-pressed', on);
    b.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + s.name);
  });
  $$('#shelf-grid [data-product]').forEach((b) => {
    const on = state.shelf.includes(b.dataset.product);
    b.setAttribute('aria-pressed', on);
    b.textContent = on ? 'Added ✓' : 'Add to visit';
  });
  const services = state.cart.map(serviceById);
  const products = state.shelf.map(productById);
  $('#ticket-empty').hidden = services.length + products.length > 0;
  $('#ticket-list').innerHTML =
    services.map((s) => `
      <li><span>${esc(s.name)}<span class="t-mins">${fmtDuration(s.mins)}</span></span><span>${money(s.price)}</span>
      <button class="remove" type="button" data-remove="${s.id}" aria-label="Remove ${esc(s.name)}">×</button></li>`).join('') +
    products.map((p) => `
      <li><span>${esc(p.name)}<span class="t-mins">Take home</span></span><span>${money(p.price)}</span>
      <button class="remove" type="button" data-remove-product="${p.id}" aria-label="Remove ${esc(p.name)}">×</button></li>`).join('');
  const o = SALON.offer;
  const hint = $('#ticket-offer');
  hint.hidden = !(o && state.cart.some((id) => o.services.includes(id)));
  if (o) hint.textContent = `${o.name}: ${o.percent}% off on ${o.days.map((d) => DAY_SHORT[d]).join(' and ')}.`;
  $('#ticket-time').textContent = fmtDuration(cartMinutes());
  $('#ticket-price').textContent = money(cartPrice() + shelfPrice());
  const count = services.length + products.length;
  const badge = $('#bag-count');
  badge.hidden = count === 0;
  badge.textContent = count;
  $('#bag').setAttribute('aria-label', count ? `Your visit, ${count} added` : 'Your visit, nothing added yet');
  $('#ticket-live').textContent = count ? `${count} in your visit, ${fmtDuration(cartMinutes())}, about ${money(cartPrice() + shelfPrice())}` : 'Nothing selected';
  renderBookServices();
  renderSlots();
  renderSummary();
}

/* ------------------------------------------------------------------ */
/* Shade bar                                                            */
/* ------------------------------------------------------------------ */

function renderPreview() {
  const look = state.look;
  // A bottle of the shade beside the set, on a soft round backdrop.
  $('#preview').innerHTML = '<circle cx="280" cy="170" r="150" fill="#f3e6ea"/>' +
    bottleSvg(look, 46, 50) +
    `<g transform="translate(232 70)">${setSvg(look, { width: 300 })}</g>` +
    '<rect x="220" y="282" width="320" height="6" rx="3" fill="#e9dce0"/>';

  const shade = shadeById(look.shade);
  const bits = [labelOf(FINISHES, look.finish), labelOf(SHAPES, look.shape)];
  if (look.detail !== 'none') bits.push(labelOf(DETAILS, look.detail));
  if (look.ring) bits.push(shadeById(look.ring.shade || look.shade).name + ' accent');
  $('#shade-code').textContent = shade.code;
  $('#preview-label').textContent = shade.name;
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
  renderPreview();
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

  // Picking a new shade clears accents that belonged to the previous look.
  radioGroup($('#swatches'), (id) => setLook({ shade: id, ring: null, accent: null }));
  radioGroup($('#shapes'), (id) => setLook({ shape: id }));
  radioGroup($('#finishes'), (id) => setLook({ finish: id }));
  radioGroup($('#details'), (id) => setLook({ detail: id }));
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
  $('#book').scrollIntoView({ behavior: smooth() });
}

/* ------------------------------------------------------------------ */
/* Lookbook, artists and reviews                                        */
/* ------------------------------------------------------------------ */

function renderLooks() {
  $('#look-grid').innerHTML = LOOKS.map((l) => `
    <article class="card look">
      <div class="card-media" style="--bg:${l.bg}"><svg viewBox="0 56 300 150" aria-hidden="true">${setSvg(l.look)}</svg></div>
      <div class="card-body">
        <div class="card-title"><h3>${esc(l.name)}</h3><span class="price"><small>from</small> ${money(l.from)}</span></div>
        <p class="rating">${stars(l.rating)} <span>${l.rating} · ${l.reviews} reviews</span></p>
        <p class="card-desc">${esc(l.desc)}</p>
        <button class="btn btn-primary btn-small" type="button" data-look="${l.id}">Try it on</button>
      </div>
    </article>`).join('');
  $('#look-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-look]');
    if (!b) return;
    applyLook(LOOKS.find((l) => l.id === b.dataset.look).look);
    $('#shades').scrollIntoView({ behavior: smooth() });
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
    const shade = shadeById(a.look.shade);
    return `
    <article class="card artist">
      <div class="artist-top" style="--bg:${a.bg}">
        <span class="avatar" aria-hidden="true">${esc(a.name.split(' ').map((w) => w[0]).join(''))}</span>
        <span class="signature"><span class="chip" style="--chip:${shade.hex}" aria-hidden="true"></span>Signature: ${esc(shade.name)}</span>
      </div>
      <div class="card-body">
        <p class="artist-role">${esc(a.role)}</p>
        <h3>${esc(a.name)}</h3>
        <p class="card-desc">${esc(a.bio)}</p>
        <p class="artist-days">In the studio ${dayRange(a.days)}</p>
        <button class="btn btn-outline btn-small" type="button" data-artist="${a.id}">Book with ${esc(a.name.split(' ')[0])}</button>
      </div>
    </article>`;
  }).join('');
  $('#artist-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-artist]');
    if (!b) return;
    pickArtist(b.dataset.artist);
    $('#book').scrollIntoView({ behavior: smooth() });
  });
}

function renderReviews() {
  $('#review-grid').innerHTML = REVIEWS.map((r) => `
    <figure class="card review">
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
  const products = state.shelf.map(productById);
  const quick = SERVICES.filter((s) => s.popular && !state.cart.includes(s.id));
  box.innerHTML =
    (chosen.length || products.length ? '<ul class="chosen">' +
      chosen.map((s) => `<li>${esc(s.name)} <button class="remove" type="button" data-remove="${s.id}" aria-label="Remove ${esc(s.name)}">×</button></li>`).join('') +
      products.map((p) => `<li class="chosen-product"><small>Take home</small> ${esc(p.name)} <button class="remove" type="button" data-remove-product="${p.id}" aria-label="Remove ${esc(p.name)}">×</button></li>`).join('') +
      '</ul>' : '') +
    `<div class="quick"><span class="quick-label">${chosen.length ? 'Add more:' : 'Popular:'}</span>` +
    quick.map((s) => `<button class="pill" type="button" data-quick="${s.id}">+ ${esc(s.name)}</button>`).join('') +
    '<a class="link-btn" href="#menu">Full menu</a></div>';
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
  const opts = [{ id: 'any', name: 'First free', sub: 'Any artist', bg: '#f4f1f0', mono: '☾' },
    ...ARTISTS.map((a) => ({ id: a.id, name: a.name.split(' ')[0], sub: a.role, bg: a.bg, mono: a.name[0] }))];
  box.innerHTML = opts.map((o) =>
    `<button class="artist-opt" type="button" role="radio" data-value="${o.id}" style="--bg:${o.bg}"><span class="mono" aria-hidden="true">${esc(o.mono)}</span>${esc(o.name)}<small>${esc(o.sub)}</small></button>`).join('');
  syncRadios(box, state.artist);
}

function renderDays() {
  const days = upcomingDays();
  const offerDays = SALON.offer ? SALON.offer.days : [];
  if (state.date && !days.some((d) => d.iso === state.date && d.open)) state.date = null;
  if (!state.date) state.date = (days.find((d) => d.open) || {}).iso || null;
  $('#book-days').innerHTML = days.map(({ iso, d, open }) => {
    const deal = open && offerDays.includes(d.getDay());
    return `<button class="day${deal ? ' is-deal' : ''}" type="button" role="radio" data-value="${iso}" ${open ? '' : 'disabled'} aria-label="${DAY_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${open ? '' : ', unavailable'}${deal ? ', ' + esc(SALON.offer.name) : ''}">` +
      `<span class="dow">${DAY_SHORT[d.getDay()]}</span><span class="dnum">${d.getDate()}</span><span class="mon">${MONTHS[d.getMonth()]}</span></button>`;
  }).join('');
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
  const products = state.shelf.map(productById);
  const artist = state.artist === 'any' ? 'First free artist' : artistById(state.artist).name;
  const when = state.date && state.time ? `${fmtDay(state.date)} · ${fmtTime(state.time)}` : 'Pick a day and time';
  const rows = [
    ['Services', services.length ? services.map((s) => esc(s.name)).join('<br>') : 'None yet'],
  ];
  if (products.length) rows.push(['Take home', products.map((p) => esc(p.name)).join('<br>')]);
  rows.push(['Artist', esc(artist)], ['When', esc(when)]);
  if (state.lookChosen) rows.push(['Look', `${esc(lookText())} <button class="remove" type="button" id="drop-look" aria-label="Remove the look">×</button>`]);
  if (services.length) rows.push(['Takes', fmtDuration(cartMinutes())]);
  const off = offerDiscount();
  if (off) rows.push([esc(SALON.offer.name), `−${money(off)}`]);
  list.innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('') +
    `<div class="total"><dt>Estimate</dt><dd>${money(estimate())}</dd></div>`;
}

function showError(msg, field) {
  const box = $('#form-error');
  box.textContent = msg;
  box.hidden = false;
  if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
}

function buildRequest(form) {
  const data = new FormData(form);
  const off = offerDiscount();
  return {
    salon: SALON.name,
    services: state.cart.map((id) => serviceById(id).name),
    takeHome: state.shelf.map((id) => productById(id).name),
    artist: state.artist === 'any' ? 'First free artist' : artistById(state.artist).name,
    date: state.date,
    time: state.time,
    minutes: cartMinutes(),
    offer: off ? `${SALON.offer.name}, −${money(off)}` : '',
    estimate: estimate(),
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
    r.takeHome.length ? `Take home: ${r.takeHome.join(', ')}` : '',
    `Artist: ${r.artist}`,
    r.look ? `Look: ${r.look}` : '',
    r.offer ? `Offer: ${r.offer}` : '',
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
      $('#confirm-text').textContent = `We have your request for ${fmtDay(r.date)} at ${fmtTime(r.time)} with ${state.artist === 'any' ? 'the first free artist' : r.artist}. We will text ${r.phone} to confirm.`;
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
  const notes = [r.services.join(', ')];
  if (r.takeHome.length) notes.push('Take home: ' + r.takeHome.join(', '));
  if (r.look) notes.push('Look: ' + r.look);
  notes.push('Requested, waiting for confirmation.');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Half Moon Nail Studio//Booking//EN', 'BEGIN:VEVENT',
    `UID:${Date.now()}@halfmoon`, `DTSTAMP:${now}`, `DTSTART:${stamp(r.date, r.time)}`, `DTEND:${stamp(r.date, end)}`,
    `SUMMARY:${escIcs('Nails at ' + SALON.name)}`, `LOCATION:${escIcs(SALON.address)}`,
    `DESCRIPTION:${escIcs(notes.join('\n'))}`,
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
    const rp = e.target.closest('[data-remove-product]');
    if (rp) { toggleProduct(rp.dataset.removeProduct, false); return; }
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
    state.shelf = [];
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
renderMenu();
renderShelf();
initShadeBar();
renderLooks();
renderArtists();
renderReviews();
initBooking();
renderOffer();
renderCart();
initNav();
