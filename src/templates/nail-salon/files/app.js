/* Half Moon Nail Studio
   Everything the salon changes lives in the data at the top of this file:
   details, hours and the monthly offer, the menu, the shade bar, the lookbook,
   the artists, the shelf of take-home products and the reviews. The page
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
const SKIN_TONES = ['#f4d6c3', '#e5b394', '#c78a64', '#94603f', '#5d3a27'];

// The lookbook. `ring` styles the ring finger differently, as an accent nail.
// `pose`, `tone` and `tilt` only change the drawing on the card.
const LOOKS = [
  { id: 'signature', name: 'The Half Moon', bg: '#ead3d9', from: 60, pose: 'relaxed', tone: 0, tilt: -6,
    desc: 'Our signature: a milky base with mauve moons at the cuticle and one solid mauve nail.',
    look: { shade: 'milk-bath', shape: 'squoval', finish: 'gloss', detail: 'moon', accent: '#8b4a62', ring: { shade: 'house-mauve', detail: 'none' } } },
  { id: 'cola-chrome', name: 'Cherry Cola Chrome', bg: '#f3e3ad', from: 58, pose: 'peace', tone: 3, tilt: 6, flip: true,
    desc: 'Deep cherry gel under a sheer chrome powder, so it shifts from red to rose gold in the light.',
    look: { shade: 'cherry-cola', shape: 'almond', finish: 'chrome', detail: 'none' } },
  { id: 'micro-french', name: 'Micro French', bg: '#dfe5cb', from: 60, pose: 'open', tone: 2, tilt: -3,
    desc: 'A sheer ballet-pink base with the thinnest white tip. Quiet, clean and good with everything.',
    look: { shade: 'ballet-slipper', shape: 'almond', finish: 'gloss', detail: 'french', accent: '#fdfaf6' } },
  { id: 'pear-dots', name: 'Pear Dots', bg: '#f5dccf', from: 62, pose: 'relaxed', tone: 4, tilt: 4, flip: true,
    desc: 'Soft pear green with three hand-placed milk dots on every nail. Spring, all year long.',
    look: { shade: 'pear', shape: 'round', finish: 'gloss', detail: 'dots', accent: '#fdfaf6' } },
  { id: 'midnight', name: 'Midnight Sparkle', bg: '#e3dcef', from: 92, pose: 'relaxed', tone: 1, tilt: -4,
    desc: 'Coffin Gel-X in navy with a fine silver and gold glitter. Made for late dinners.',
    look: { shade: 'midnight-navy', shape: 'coffin', finish: 'glitter', detail: 'none' } },
  { id: 'fig-line', name: 'Fig & Gold Line', bg: '#ead3d9', from: 62, pose: 'open', tone: 3, tilt: 5, flip: true,
    desc: 'Matte fig with a single gold line painted across each nail by hand.',
    look: { shade: 'fig-jam', shape: 'squoval', finish: 'matte', detail: 'line', accent: '#e4c27c' } },
];

// Artists. `days` are the weekdays they work, Sunday = 0.
const ARTISTS = [
  { id: 'mina', name: 'Mina Park', role: 'Studio lead', bg: '#ead3d9', days: [2, 3, 4, 5, 6], pose: 'relaxed', tone: 1,
    bio: 'Russian manicures and BIAB that grows out invisibly. Fixes nails other salons gave up on.',
    look: { shade: 'bare-truth', shape: 'squoval', finish: 'gloss', detail: 'none' } },
  { id: 'lucia', name: 'Lucía Herrera', role: 'Nail artist', bg: '#f3e3ad', days: [0, 3, 4, 5, 6], pose: 'peace', tone: 2,
    bio: 'Hand-painted florals, fine lines and anything you can pin to a mood board.',
    look: { shade: 'lilac-hour', shape: 'almond', finish: 'gloss', detail: 'dots', accent: '#fdfaf6' } },
  { id: 'dee', name: 'Dee Okafor', role: 'Pedicure lead', bg: '#dfe5cb', days: [0, 2, 3, 4, 5], pose: 'open', tone: 4,
    bio: 'Long, slow spa pedicures. Ask about the hot-stone massage, it is worth the extra time.',
    look: { shade: 'tangerine', shape: 'round', finish: 'gloss', detail: 'none' } },
  { id: 'hana', name: 'Hana Sato', role: 'Extensions', bg: '#e3dcef', days: [0, 4, 5, 6], pose: 'point', tone: 0,
    bio: 'Gel-X and sculpted sets in almond, coffin and stiletto, balanced to last.',
    look: { shade: 'midnight-navy', shape: 'stiletto', finish: 'chrome', detail: 'none' } },
];

// The shelf: aftercare to take home. Added items are set aside at the front
// desk and paid for at the visit. `art` picks the drawing: dropper, bottle,
// tube or file. A bottle without a color uses the shade of the week.
const PRODUCTS = [
  { id: 'cuticle-oil', name: 'Moon Drop cuticle oil', size: '10 ml', price: 18, rating: 4.9, reviews: 212, art: 'dropper', color: '#e9b949', bg: '#f6ecd0',
    desc: 'Jojoba and sweet almond oil. Two drops a night keeps gel from lifting.' },
  { id: 'take-home-polish', name: 'Shade of the week, to go', size: '12 ml', price: 15, rating: 4.8, reviews: 96, art: 'bottle', bg: '#f5dccf',
    desc: 'The color you are wearing, for touch-ups between visits.' },
  { id: 'hand-cream', name: 'Fig & Oat hand cream', size: '60 ml', price: 22, rating: 4.8, reviews: 164, art: 'tube', color: '#e57aa3', bg: '#ead3d9',
    desc: 'Rich but never greasy. Our artists finish every manicure with it.' },
  { id: 'glass-file', name: 'Crystal glass file', size: '14 cm', price: 14, rating: 4.9, reviews: 98, art: 'file', color: '#c3c75c', bg: '#dfe5cb',
    desc: 'Seals the free edge as it shapes, so nails do not peel. Lasts for years.' },
];

const REVIEWS = [
  { quote: 'Mina fixed nails three other salons had given up on. Six weeks of BIAB and they are finally long and strong.', name: 'Priya S.', service: 'BIAB structured manicure' },
  { quote: 'I tried Cherry Cola chrome on the shade bar before I came in, and it looked exactly like that on my hands.', name: 'Jordan T.', service: 'Gel manicure with chrome' },
  { quote: 'Dee\'s spa pedicure is the best hour of my month. Quiet, warm, no upselling, and the polish lasts until the next one.', name: 'Alma R.', service: 'Half Moon spa pedicure' },
];

// The hands scattered over the hero arch (a 480 x 590 drawing). `shade: null`
// wears the shade of the week.
const HERO_HANDS = [
  { pose: 'relaxed', x: 330, y: 40, rotate: 168, scale: 0.5, shade: 'house-mauve', shape: 'almond' },
  { pose: 'peace', x: 395, y: 200, rotate: 28, scale: 0.5, shade: 'bubblegum', shape: 'round', flip: true },
  { pose: 'point', x: 70, y: 560, rotate: -152, scale: 0.48, shade: 'pear', shape: 'coffin', flip: true },
  { pose: 'relaxed', x: 410, y: 470, rotate: 196, scale: 0.52, shade: 'fern', shape: 'squoval' },
  { pose: 'peace', x: 30, y: 250, rotate: 70, scale: 0.44, shade: 'fern', shape: 'almond', flip: true },
  { pose: 'open', x: 210, y: 330, rotate: -14, scale: 0.66, shade: null, shape: 'almond' },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const INK = '#1f1a1c';
const CREAM = '#fffcf6';

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
const productColor = (p) => p.color || shadeById(SALON.shadeOfWeek).hex;

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
/* Line-drawn hands                                                     */
/* ------------------------------------------------------------------ */

// Hands are drawn like an ink sketch: one continuous outline from the wrist,
// around each finger and the thumb and back down, a few crease marks, and
// painted nails. Local coordinates: the knuckles sit near y = 0, fingers point
// up and the wrist runs off the bottom (y ≈ 230). Fingers are listed pinky
// first; `fold` bends a finger away so no nail shows.
const POSES = {
  open: { spread: 1, fingers: [{ a: -16, len: 150 }, { a: -6, len: 182 }, { a: 2, len: 192 }, { a: 11, len: 172 }], thumb: { a: 48, len: 126 } },
  relaxed: { spread: 0.9, fingers: [{ a: -9, len: 146 }, { a: -3, len: 178 }, { a: 2, len: 188 }, { a: 7, len: 170 }], thumb: { a: 38, len: 122 } },
  peace: { spread: 0.95, fingers: [{ a: -4, len: 150, fold: true }, { a: 0, len: 178, fold: true }, { a: -6, len: 192 }, { a: 14, len: 178 }], thumb: { a: 30, len: 112 } },
  point: { spread: 0.95, fingers: [{ a: -2, len: 150, fold: true }, { a: 0, len: 178, fold: true }, { a: 1, len: 186, fold: true }, { a: 6, len: 182 }], thumb: { a: 36, len: 116 } },
};
const FINGER_W = [44, 48, 50, 48];

const pt = (x, y) => ({ x, y });
const along = (p, v, k = 1) => pt(p.x + v.x * k, p.y + v.y * k);
const r1 = (n) => Math.round(n * 10) / 10;
const xy = (p) => `${r1(p.x)} ${r1(p.y)}`;
const heading = (deg) => { const r = deg * Math.PI / 180; return { u: pt(Math.sin(r), -Math.cos(r)), n: pt(Math.cos(r), Math.sin(r)) }; };

// One finger (or the thumb) between two web points: the outline segment
// (left web, around the tip, right web), crease marks and where its nail goes.
function fingerParts(wl, wr, angle, len, w, fold) {
  const { u, n } = heading(angle);
  const base = pt((wl.x + wr.x) / 2, (wl.y + wr.y) / 2);
  const reach = fold ? len * 0.4 : len;
  const wt = fold ? w * 0.5 : w * 0.44;
  const tip = along(base, u, reach - wt);
  const tl = along(tip, n, -wt), tr = along(tip, n, wt);
  // Edges leave the webs a little way up the finger, so webs read as soft U shapes.
  const sl = along(wl, u, 7), sr = along(wr, u, 7);
  const bulge = w * 0.06;
  const cl = along(pt((sl.x + tl.x) / 2, (sl.y + tl.y) / 2), n, -bulge);
  const cr = along(pt((sr.x + tr.x) / 2, (sr.y + tr.y) / 2), n, bulge);
  const ry = fold ? wt * 0.92 : wt * 1.14;
  const outline = `Q${xy(cl)} ${xy(tl)}A${r1(wt)} ${r1(ry)} ${r1(angle)} 0 1 ${xy(tr)}Q${xy(cr)} ${xy(sr)}`;
  const crease = (t, k, lift = 3) => {
    const c = along(base, u, reach * t);
    return `M${xy(along(c, n, -w * k))}Q${xy(along(c, u, -lift))} ${xy(along(c, n, w * k))}`;
  };
  const creases = fold ? crease(0.66, 0.2, -4) : crease(0.4, 0.16) + crease(0.47, 0.11) + crease(0.69, 0.13);
  return { outline, creases, start: sl, end: sr, u, nail: fold ? null : { end: along(tip, u, wt), u, angle, width: wt * 2 * 0.76 } };
}

// A whole hand as SVG markup. `nails` are options for thumb, index, middle,
// ring and pinky (as lookNails returns them). `fill` hides what is behind the
// hand; `tone` is a skin color printed a little off the line, like a
// two-color print.
function handSvg({ pose = 'open', nails, tone = null, fill = null, ink = INK, stroke = 2.6, offset = 5, creases = true }) {
  const p = POSES[pose] || POSES.open;
  const total = FINGER_W.reduce((a, b) => a + b, 0) * p.spread;
  const webs = [];
  let x = -total / 2;
  for (let i = 0; i <= 4; i++) {
    webs.push(pt(x, 0.0026 * x * x + (i === 0 ? 30 : i === 4 ? 24 : 0)));
    if (i < 4) x += FINGER_W[i] * p.spread;
  }
  const fingers = p.fingers.map((f, i) => fingerParts(webs[i], webs[i + 1], f.a, f.len, FINGER_W[i], f.fold));

  // The thumb hinges below the index finger.
  const t = p.thumb, tw = 54;
  const { u: tu, n: tn } = heading(t.a);
  const tb = pt(webs[4].x + 2, webs[4].y + 80);
  const thumb = fingerParts(along(tb, tn, -tw / 2), along(tb, tn, tw / 2), t.a, t.len, tw, false);

  const w0 = webs[0], first = fingers[0], last = fingers[3];
  const wristL = pt(w0.x + 28, w0.y + 214);
  const wristR = pt(thumb.end.x - 30, thumb.end.y + 180);
  // Up the outer palm edge, arriving along the pinky's own direction.
  let d = `M${xy(wristL)}C${xy(pt(w0.x + 2, w0.y + 150))} ${xy(along(first.start, first.u, -46))} ${xy(first.start)}`;
  fingers.forEach((f, i) => {
    d += f.outline;
    if (fingers[i + 1]) d += `Q${xy(pt(webs[i + 1].x, webs[i + 1].y + 4))} ${xy(fingers[i + 1].start)}`;
  });
  // Down into the soft web between index and thumb, round the thumb, down to the wrist.
  d += `C${xy(along(last.end, last.u, -34))} ${xy(along(thumb.start, tu, -26))} ${xy(thumb.start)}` + thumb.outline;
  d += `C${xy(pt(thumb.end.x + 6, thumb.end.y + 46))} ${xy(pt(wristR.x + 12, wristR.y - 84))} ${xy(wristR)}`;

  const nailOpts = [nails[4], nails[3], nails[2], nails[1]];
  let paint = '';
  [...fingers.map((f, i) => [f, nailOpts[i]]), [thumb, nails[0]]].forEach(([f, o]) => {
    if (!f.nail || !o) return;
    const c = along(f.nail.end, f.nail.u, -134 * (f.nail.width / 84) * 0.96);
    paint += `<g transform="rotate(${r1(f.nail.angle)} ${xy(c)})">${placedNail(o, c.x, c.y, f.nail.width)}</g>`;
  });
  const lines = fingers.map((f) => f.creases).join('') + thumb.creases;
  return (fill ? `<path d="${d}Z" fill="${fill}"/>` : '') +
    (tone ? `<path d="${d}Z" fill="${tone}" transform="translate(${offset} ${r1(offset * 0.7)})"/>` : '') +
    `<path d="${d}" fill="none" stroke="${ink}" stroke-width="${r1(stroke)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    (creases ? `<path d="${lines}" fill="none" stroke="${ink}" stroke-width="${r1(stroke * 0.75)}" stroke-linecap="round"/>` : '') + paint;
}

// A hand framed for a card: fingers and thumb in view, the wrist running off
// the bottom edge.
function handCard({ pose, look, tone, tilt = 0, flip = false }) {
  const hand = handSvg({ pose, nails: lookNails(look), tone: SKIN_TONES[tone] || SKIN_TONES[1], stroke: 2.8 });
  return `<svg viewBox="-225 -244 450 360" aria-hidden="true"><g transform="rotate(${tilt}) scale(${flip ? -1 : 1} 1)">${hand}</g></svg>`;
}

/* ------------------------------------------------------------------ */
/* Icons and product drawings, in the same ink                          */
/* ------------------------------------------------------------------ */

function categoryIcon(id) {
  const ink = 'stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  if (id === 'hands') {
    const nails = Array(5).fill({ color: '#e4683f', shape: 'squoval', finish: 'gloss', detail: 'none' });
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><g transform="translate(29 38) scale(.15)">${handSvg({ pose: 'open', nails, ink: 'currentColor', stroke: 14, creases: false })}</g></svg>`;
  }
  if (id === 'feet') {
    const toes = [[20, 19, 7, 8.5], [31, 12, 5, 6], [40, 12.5, 4.5, 5.5], [48, 16.5, 4, 5], [54, 23.5, 3.5, 4.4]];
    return '<svg viewBox="0 0 64 64" aria-hidden="true">' +
      toes.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${r1(y - ry * 0.4)}" rx="${r1(rx * 0.62)}" ry="${r1(ry * 0.5)}" fill="#e57aa3"/>`).join('') +
      `<g ${ink}>${toes.map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('')}` +
      '<path d="M13 25c-2 10 0 22 6 32M57 31c1 9-1 17-5 25"/></g></svg>';
  }
  if (id === 'enhance') {
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><g transform="translate(16 9) scale(.28)">' +
      `<path d="${NAIL_PATHS.coffin}" fill="#e57aa3" transform="translate(5 4)"/>` +
      `<path d="${NAIL_PATHS.coffin}" stroke="currentColor" stroke-width="8" fill="none" stroke-linejoin="round"/>` +
      '<path d="M4 64h92" stroke="currentColor" stroke-width="7" stroke-dasharray="10 10"/></g>' +
      `<g ${ink}><path d="M50 14v10M45 19h10"/></g></svg>`;
  }
  return '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="45" cy="16" r="6" fill="#c3c75c"/>' +
    `<g ${ink}><path d="M12 54l24-24"/><path d="M33 27l6 6 6-9-3-3z"/><path d="M42 21c3-6 9-10 12-9 1 3-3 9-9 12"/><path d="M14 18v8M10 22h8M50 44v6M47 47h6"/></g></svg>`;
}

// 120 x 140, inked over a block of color printed slightly off the line.
function productArt(kind, color) {
  const ink = `stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const block = (d) => `<path d="${d}" fill="${color}" transform="translate(5 4)"/>`;
  let art;
  if (kind === 'dropper') {
    const body = 'M38 62h44v60a8 8 0 0 1-8 8H46a8 8 0 0 1-8-8z';
    art = block(body) + block('M52 20a8 8 0 0 1 16 0v22H52z') +
      `<g ${ink}><path d="${body}"/><path d="M52 42V20a8 8 0 0 1 16 0v22"/><path d="M46 42h28v20H46z"/><path d="M46 84h28M46 104h28"/><path d="M60 92c-3 4-3 7 0 7s3-3 0-7z"/></g>`;
  } else if (kind === 'bottle') {
    const body = 'M30 70q0-12 12-12h36q12 0 12 12v46q0 14-14 14H44q-14 0-14-14z';
    art = block(body) + `<g ${ink}><path d="${body}"/><path d="M50 58V14h20v44"/><path d="M50 26h20"/><path d="M38 76q0-8 8-8"/></g>`;
  } else if (kind === 'tube') {
    const body = 'M40 16h40l-6 92H46z';
    art = block(body) + `<g ${ink}><path d="${body}"/><path d="M40 16v-4h40v4M40 10h40"/><path d="M46 108h28v18H46z"/><path d="M52 40h16M50 52h20M54 64h12"/></g>`;
  } else {
    art = block('M70 24l18 6-34 102-18-6z') +
      `<g ${ink}><path d="M70 24l18 6-34 102-18-6z"/><path d="M64 42l14 5M60 54l14 5M56 66l14 5M52 78l14 5"/>` +
      '<path d="M26 44h26v74H26z" transform="rotate(-8 39 81)"/></g>';
  }
  return `<svg viewBox="0 0 120 140" aria-hidden="true">${art}</svg>`;
}

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */

const state = {
  cart: [],    // service ids
  shelf: [],   // product ids to take home
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
/* Hero, offer band and footer drawings                                 */
/* ------------------------------------------------------------------ */

function renderHeroArt() {
  const week = SALON.shadeOfWeek;
  $('#hero-pattern').innerHTML = HERO_HANDS.map((h, i) => {
    const nails = Array(5).fill({ color: shadeById(h.shade || week).hex, shape: h.shape, finish: 'gloss', detail: 'none' });
    const hand = handSvg({ pose: h.pose, nails, fill: '#efe4cf', stroke: 2 / h.scale });
    return `<g transform="translate(${h.x} ${h.y}) rotate(${h.rotate}) scale(${h.flip ? -h.scale : h.scale} ${h.scale})">` +
      `<g class="sway" style="animation-delay:${-i * 1.7}s">${hand}</g></g>`;
  }).join('');
  const shade = shadeById(week);
  const card = $('#hero-shade');
  $('.chip', card).style.setProperty('--chip', shade.hex);
  $('strong', card).textContent = shade.name;
  card.addEventListener('click', () => applyLook({ shade: week, shape: 'almond', finish: 'gloss', detail: 'none' }));
}

function renderOffer() {
  const o = SALON.offer;
  const band = $('#offer');
  if (!o) { band.hidden = true; return; }
  $('#offer-name').textContent = o.name;
  $('#offer-text').textContent = o.text;
  const nails = Array(5).fill({ color: shadeById('pear').hex, shape: 'almond', finish: 'gloss', detail: 'none' });
  $('#offer-art').innerHTML = `<g transform="rotate(-12)">${handSvg({ pose: 'peace', nails, ink: CREAM, stroke: 3 })}</g>`;
  $('#offer-book').addEventListener('click', () => {
    // Book the next day the offer applies, with a service it covers.
    if (!state.cart.some((id) => o.services.includes(id))) toggleService(o.services[0], true);
    const day = upcomingDays().find((d) => d.open && o.days.includes(d.d.getDay()));
    if (day) { state.date = day.iso; state.time = null; renderDays(); }
    $('#book').scrollIntoView({ behavior: smooth() });
  });
}

function renderFooterArt() {
  const nails = Array(5).fill({ color: shadeById(SALON.shadeOfWeek).hex, shape: 'almond', finish: 'gloss', detail: 'none' });
  $('#footer-art').innerHTML = `<g transform="rotate(14)">${handSvg({ pose: 'open', nails, ink: CREAM, stroke: 3 })}</g>`;
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

function renderShelf() {
  $('#shelf-grid').innerHTML = PRODUCTS.map((p) => `
    <article class="product">
      <div class="product-art" style="--bg:${p.bg}">${productArt(p.art, productColor(p))}</div>
      <div class="product-body">
        <p class="product-rating"><span aria-hidden="true">★</span> ${p.rating} <span>· ${p.reviews} reviews</span></p>
        <h3>${esc(p.name)}</h3>
        <p class="product-desc">${esc(p.desc)}</p>
        <div class="product-foot">
          <span class="product-price">${money(p.price)} <small>${esc(p.size)}</small></span>
          <button class="btn btn-small" type="button" data-product="${p.id}" aria-pressed="false">Add to visit</button>
        </div>
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
  $('#ticket-live').textContent = count ? `${count} in your visit, ${fmtDuration(cartMinutes())}, about ${money(cartPrice() + shelfPrice())}` : 'Nothing selected';
  renderBookServices();
  renderSlots();
  renderSummary();
}

/* ------------------------------------------------------------------ */
/* Shade bar                                                            */
/* ------------------------------------------------------------------ */

function renderHand() {
  const look = state.look;
  const hand = handSvg({ pose: 'open', nails: lookNails(look), tone: SKIN_TONES[look.tone] || SKIN_TONES[1], stroke: 2.8, offset: 6 });
  // The hand rises into a round "moon" and is clipped by it.
  $('#hand').innerHTML = '<defs><clipPath id="hand-clip"><circle cx="0" cy="-12" r="226"/></clipPath></defs>' +
    `<circle cx="0" cy="-12" r="226" fill="${CREAM}"/><g clip-path="url(#hand-clip)"><g transform="translate(-8 10)">${hand}</g></g>`;

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
  $('#book').scrollIntoView({ behavior: smooth() });
}

/* ------------------------------------------------------------------ */
/* Lookbook, artists and reviews                                        */
/* ------------------------------------------------------------------ */

function renderLooks() {
  $('#look-grid').innerHTML = LOOKS.map((l) => `
    <article class="look">
      <div class="look-art" style="--bg:${l.bg}">${handCard({ pose: l.pose, look: l.look, tone: l.tone, tilt: l.tilt, flip: l.flip })}</div>
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
  $('#artist-grid').innerHTML = ARTISTS.map((a) => `
    <article class="artist">
      <div class="artist-top" style="--bg:${a.bg}"><span class="initial" aria-hidden="true">${esc(a.name[0])}.</span>${handCard({ pose: a.pose, look: a.look, tone: a.tone })}</div>
      <div class="artist-body">
        <p class="artist-role">${esc(a.role)}</p>
        <h3>${esc(a.name)}</h3>
        <p>${esc(a.bio)}</p>
        <p class="artist-days">In the studio ${dayRange(a.days)}</p>
        <button class="link-btn" type="button" data-artist="${a.id}">Book with ${esc(a.name.split(' ')[0])}</button>
      </div>
    </article>`).join('');
  $('#artist-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-artist]');
    if (!b) return;
    pickArtist(b.dataset.artist);
    $('#book').scrollIntoView({ behavior: smooth() });
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
  const opts = [{ id: 'any', name: 'First free', sub: 'Any artist', bg: '#f6f0e4', mono: '☾' },
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
renderHeroArt();
renderMenu();
renderShelf();
initShadeBar();
renderLooks();
renderArtists();
renderReviews();
initBooking();
renderOffer();
renderFooterArt();
renderCart();
initNav();
