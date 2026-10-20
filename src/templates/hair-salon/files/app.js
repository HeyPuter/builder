// Lustre: a one-page hair salon site.
//
// Everything a salon would change lives in the data below: the business,
// opening hours, the menu (priced per stylist level), the team, the first
// visit steps, the lookbook and reviews. The page renders itself from it.
// The business, people and reviews are sample content to replace.

const SALON = {
  name: 'Lustre',
  legalName: 'Lustre Hair Studio',
  area: 'Division St, Portland',
  neighborhood: 'on Division Street.',
  address: '2417 SE Division St, Portland, OR 97202',
  phone: '(503) 555-0147',
  email: 'hello@lustrehair.example',
  instagram: 'lustre.hair.studio',
  currency: '$',
  rating: { average: 4.9, count: 612 },
  // Where booking requests go. Leave empty to open the guest's email app,
  // addressed to `email` above. Or set a form endpoint that accepts a JSON
  // POST (Formspree, Basin, your own backend) and requests arrive there.
  bookingEndpoint: '',
};

// The two small figures in the corner of the hero.
const STATS = [
  { label: 'Established', value: '2016' },
  { label: 'Color clients a year', value: '1,200+' },
];

// Services offered as one-tap chips in the hero, by id from SERVICES.
const POPULAR = ['balayage', 'signature-cut', 'curl-cut', 'gloss'];

const OFFER = {
  percent: 20,
  category: 'color',
  text: 'Off your first color service with us, at any stylist level. Tick "first visit" when you book and we take it off at the desk.',
};

// Index 0 is Sunday, as in Date#getDay(). Times are 24-hour, local time.
const HOURS = [
  { day: 'Sunday', open: null },
  { day: 'Monday', open: null },
  { day: 'Tuesday', open: '10:00', close: '19:00' },
  { day: 'Wednesday', open: '10:00', close: '19:00' },
  { day: 'Thursday', open: '10:00', close: '20:00' },
  { day: 'Friday', open: '09:00', close: '18:00' },
  { day: 'Saturday', open: '09:00', close: '17:00' },
];

const BOOKING = {
  daysAhead: 21,      // how far ahead guests can ask for
  slotMinutes: 30,    // spacing of the start times offered
  leadMinutes: 120,   // earliest start today, from now
};

// Menu prices are per level, in the same order as LEVELS.
const LEVELS = [
  { id: 'stylist', name: 'Stylist', note: 'Two to five years behind the chair. Brilliant at everyday cuts and color.' },
  { id: 'senior', name: 'Senior', note: 'Six years and more, with advanced training in curls and blonding.' },
  { id: 'director', name: 'Director', note: 'Our educators. Book them for big changes and corrective work.' },
];

const CATEGORIES = [
  { id: 'cut', name: 'Cut & style' },
  { id: 'color', name: 'Color' },
  { id: 'texture', name: 'Curls & texture' },
  { id: 'care', name: 'Treatments' },
];

const SERVICES = [
  { id: 'signature-cut', cat: 'cut', name: 'Signature cut', desc: 'Consultation, wash, scalp massage, cut and a smooth finish.', mins: 60, price: [68, 82, 98] },
  { id: 'short-cut', cat: 'cut', name: 'Short & precision cut', desc: 'Pixies, crops and sharp bobs, with a free neck tidy between visits.', mins: 45, price: [60, 72, 86] },
  { id: 'blow-dry', cat: 'cut', name: 'Blow-dry & style', desc: 'Wash and a bouncy or sleek finish that lasts the week.', mins: 45, price: [48, 56, 66] },
  { id: 'kids-cut', cat: 'cut', name: 'Kids cut', desc: 'Twelve and under, with a little extra patience built in.', mins: 30, price: [36, 40, 46] },
  { id: 'event', cat: 'cut', name: 'Updo & event styling', desc: 'Weddings, galas, big nights. Bring photos and the outfit.', mins: 60, price: [90, 105, 120] },

  { id: 'root-touch-up', cat: 'color', name: 'Root touch-up', desc: 'Single-process color at the regrowth, with a gloss to refresh the ends.', mins: 90, price: [92, 108, 126] },
  { id: 'gloss', cat: 'color', name: 'Gloss & tone', desc: 'Adds shine and calms brassiness. Lovely between highlight visits.', mins: 45, price: [52, 60, 70] },
  { id: 'partial', cat: 'color', name: 'Partial highlights', desc: 'Brightness around the face and parting, blended to grow out softly.', mins: 120, price: [140, 165, 190] },
  { id: 'balayage', cat: 'color', name: 'Lived-in balayage', desc: 'Hand-painted color that looks good for three to four months.', mins: 180, price: [215, 250, 290] },
  { id: 'vivid', cat: 'color', name: 'Vivid color', desc: 'Copper, rose, violet and anything bright, with a lightening plan.', mins: 180, price: [180, 210, 245] },
  { id: 'correction', cat: 'color', name: 'Color correction', desc: 'Box dye, banding or a big change. Starts with a free consultation.', mins: 240, price: null },

  { id: 'curl-cut', cat: 'texture', name: 'Curl cut', desc: 'Cut dry, curl by curl, so the shape works with how your hair falls.', mins: 90, price: [90, 108, 128] },
  { id: 'curl-refresh', cat: 'texture', name: 'Curl refresh', desc: 'Cleanse, hydration mask and a diffused, defined finish. No cut.', mins: 60, price: [62, 72, 84] },
  { id: 'silk-press', cat: 'texture', name: 'Silk press', desc: 'A heat-protected, swingy straight finish for natural hair.', mins: 90, price: [85, 98, 115] },
  { id: 'smoothing', cat: 'texture', name: 'Smoothing treatment', desc: 'Formaldehyde-free frizz control that softens for 8 to 12 weeks.', mins: 150, price: [240, 275, 310] },

  { id: 'bond-repair', cat: 'care', name: 'Bond repair', desc: 'Strengthens hair during and after lightening. Add it to any color.', mins: 15, price: [35, 35, 35] },
  { id: 'scalp-ritual', cat: 'care', name: 'Scalp ritual', desc: 'Exfoliation, steam and a ten-minute head massage.', mins: 30, price: [45, 45, 45] },
  { id: 'mask', cat: 'care', name: 'Deep conditioning mask', desc: 'For dry, coarse or sun-tired lengths.', mins: 15, price: [28, 28, 28] },
  { id: 'fringe', cat: 'care', name: 'Fringe trim', desc: 'Free if you had a cut with us in the last six weeks.', mins: 15, price: [15, 15, 15] },
];

const SPECIALTIES = {
  'lived-in': 'Lived-in color',
  blonding: 'Blonding',
  correction: 'Color correction',
  precision: 'Precision cuts',
  curls: 'Curls & coils',
  'silk-press': 'Silk press',
  vivid: 'Vivid color',
  events: 'Events',
};

// `days` are the days each stylist works, 0 = Sunday.
const STYLISTS = [
  { id: 'ana', name: 'Ana Ortega', level: 'director', role: 'Founder', photo: 'photos/stylist-ana.jpg', specialties: ['lived-in', 'blonding', 'correction'], days: [2, 3, 4, 5], bio: 'Opened the studio after a decade in London salons. Plans color for how it will look in four months, not four days.' },
  { id: 'theo', name: 'Theo Marsh', level: 'senior', role: 'Senior stylist', photo: 'photos/stylist-theo.jpg', specialties: ['precision', 'events'], days: [3, 4, 5, 6], bio: 'Sharp bobs, clean fades and very honest advice about what a fringe does in Portland rain.' },
  { id: 'jordan', name: 'Jordan Bell', level: 'senior', role: 'Curl specialist', photo: 'photos/stylist-jordan.jpg', specialties: ['curls', 'silk-press'], days: [2, 4, 5, 6], bio: 'Trained in dry cutting for curls and coils. Teaches you the routine, not just the style.' },
  { id: 'mae', name: 'Mae Lindqvist', level: 'stylist', role: 'Stylist', photo: 'photos/stylist-mae.jpg', specialties: ['vivid', 'blonding'], days: [2, 3, 5, 6], bio: 'Our vivid color person. If it glows under the lights, Mae has probably mixed it.' },
];

const FIRST_VISIT = [
  { title: 'Consultation', text: 'We sit down before anything gets wet: your history, your routine, the photos you love and the ones you don\'t.', time: '15 min' },
  { title: 'Wash & ritual', text: 'A slow wash with a scalp massage, and tea, coffee or something sparkling while you settle in.', time: '10 min' },
  { title: 'The work', text: 'Cut, color or both. Your stylist talks you through each step, so there are no surprises in the mirror.', time: '45 to 180 min' },
  { title: 'Finish & plan', text: 'We style it, show you how to do it at home, and suggest when your next visit should be.', time: '10 min' },
];

const COLOR_PREP = [
  { title: 'Patch test 48 hours ahead', text: 'if you are new to us or have not had color for six months. It takes five minutes, any day we are open.' },
  { title: 'Come with dry, unstyled hair', text: 'so we can see its real texture and tone.' },
  { title: 'Bring three photos:', text: 'two looks you love and one you definitely don\'t.' },
  { title: 'Tell us about box dye or henna,', text: 'even from years ago. It changes how lightener behaves.' },
];

// `focus` is the CSS object-position used when a tile crops the photo.
const LOOKS = [
  { src: 'photos/look-copper.jpg', alt: 'Long copper curls, seen from behind at sunset', title: 'Sunset copper', tag: 'color', stylist: 'mae', w: 546, h: 683, focus: '50% 30%' },
  { src: 'photos/look-bridal.jpg', alt: 'A stylist pinning a soft bridal updo', title: 'Bridal updo', tag: 'styling', stylist: 'theo', w: 640, h: 480, focus: '50% 25%' },
  { src: 'photos/look-curls.jpg', alt: 'Big, shaped curls with a violet tint', title: 'Shaped curls', tag: 'curls', stylist: 'jordan', w: 600, h: 600, focus: '50% 35%' },
  { src: 'photos/look-blue.jpg', alt: 'Long, straight hair colored teal blue', title: 'Glacier blue', tag: 'color', stylist: 'mae', w: 640, h: 800, focus: '50% 40%' },
  { src: 'photos/look-fade.jpg', alt: 'A short textured cut with a skin fade', title: 'Textured fade', tag: 'cuts', stylist: 'theo', w: 640, h: 800, focus: '50% 35%' },
  { src: 'photos/look-honey.jpg', alt: 'Loose honey-blonde waves over the shoulder', title: 'Honey balayage', tag: 'color', stylist: 'ana', w: 512, h: 640, focus: '60% 50%' },
  { src: 'photos/look-layers.jpg', alt: 'Scissors cutting soft layers into brown hair', title: 'Soft layers', tag: 'cuts', stylist: 'ana', w: 640, h: 480, focus: '50% 40%' },
  { src: 'photos/look-braids.jpg', alt: 'Two Dutch braids from the hairline', title: 'Dutch braids', tag: 'styling', stylist: 'jordan', w: 640, h: 800, focus: '50% 30%' },
];
const LOOK_TAGS = { color: 'Color', cuts: 'Cuts', curls: 'Curls', styling: 'Styling' };

const REVIEWS = [
  { name: 'Hannah K.', text: 'Ana talked me out of the platinum I asked for and into something I have now kept for two years. Nobody has ever been that honest with me in a salon.', service: 'Lived-in balayage', stylist: 'ana' },
  { name: 'Marcus T.', text: 'First person who has cut my curls dry and actually looked at how they sit. I left knowing exactly what to do in the shower the next morning.', service: 'Curl cut', stylist: 'jordan' },
  { name: 'Lena W.', text: 'Calm, bright and on time. The bob grew out so evenly I stretched it to ten weeks without anyone noticing.', service: 'Short & precision cut', stylist: 'theo' },
  { name: 'Sofia R.', text: 'Mae mixed a copper that photographs like a sunset. The bond repair meant my ends felt better after lightening than before.', service: 'Vivid color', stylist: 'mae' },
];

const VISIT_NOTES = [
  'Free two-hour parking on SE 25th Ave, and a bike rack by the door.',
  'Step-free entrance, a wide styling station and an accessible restroom.',
  'Gift cards at the desk or by phone, for any amount.',
];

const POLICY = [
  'Plans change. Give us 24 hours notice to move or cancel and there is no charge, so someone else can have the chair.',
  'Missed color appointments, or ones cancelled on the day, may be charged half the booked service.',
  'Running more than 15 minutes late? Call us and we will adapt the service so the next guest is not kept waiting.',
];

// ---------------------------------------------------------------------------
// Helpers

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// Build an element: h('p', { class: 'x', onclick: fn }, 'text', childNode).
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

const levelIndex = (id) => Math.max(0, LEVELS.findIndex((l) => l.id === id));
const levelName = (id) => LEVELS[levelIndex(id)].name;
const serviceById = (id) => SERVICES.find((s) => s.id === id);
const stylistById = (id) => STYLISTS.find((s) => s.id === id);
const money = (n) => SALON.currency + Math.round(n).toLocaleString('en-US');

function duration(mins) {
  const hrs = Math.floor(mins / 60);
  const rest = mins % 60;
  if (!hrs) return `${rest} min`;
  return rest ? `${hrs} h ${rest} min` : `${hrs} h`;
}

const toMinutes = (hhmm) => {
  const [hh, mm] = hhmm.split(':').map(Number);
  return hh * 60 + mm;
};

function clock(mins) {
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  const suffix = hh >= 12 ? 'pm' : 'am';
  const h12 = ((hh + 11) % 12) + 1;
  return mm ? `${h12}:${String(mm).padStart(2, '0')} ${suffix}` : `${h12} ${suffix}`;
}

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const longDate = (d) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// Replace a container's children. Buttons carry a data-key, so a focused one
// keeps focus across the re-render (keyboard users don't lose their place).
function swap(container, nodes) {
  const active = document.activeElement;
  const key = active && container.contains(active) ? active.dataset.key : undefined;
  container.replaceChildren(...nodes);
  if (key === undefined) return;
  const same = $$('[data-key]', container).find((el) => el.dataset.key === key);
  if (same && !same.disabled) same.focus();
}

// Arrow keys move the selection inside a radio-like group (roving tabindex).
function radioKeys(container, itemSelector) {
  container.addEventListener('keydown', (e) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1, Home: 'first', End: 'last' };
    if (!(e.key in keys)) return;
    const items = $$(itemSelector, container).filter((el) => !el.disabled);
    const i = items.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    const step = keys[e.key];
    const next = step === 'first' ? items[0] : step === 'last' ? items[items.length - 1] : items[(i + step + items.length) % items.length];
    next.focus();
    next.click();
  });
}

function setRoving(items, isSelected) {
  let any = false;
  items.forEach((el) => {
    const on = isSelected(el);
    el.tabIndex = on ? 0 : -1;
    any = any || (on && !el.disabled);
  });
  if (!any) {
    const first = items.find((el) => !el.disabled);
    if (first) first.tabIndex = 0;
  }
}

// ---------------------------------------------------------------------------
// State

const state = {
  level: 'senior',
  tab: CATEGORIES[0].id,
  picked: [],          // service ids, in the order they were added
  stylist: 'any',
  day: null,           // 'YYYY-MM-DD'
  time: null,          // minutes after midnight
  specialty: 'all',
  look: 'all',
  firstVisit: false,
};

// ---------------------------------------------------------------------------
// Business details, hours and the open/closed status

function openStatus(now = new Date()) {
  const today = HOURS[now.getDay()];
  const mins = now.getHours() * 60 + now.getMinutes();
  if (today.open && mins >= toMinutes(today.open) && mins < toMinutes(today.close)) {
    return { open: true, short: `Open until ${clock(toMinutes(today.close))}`, long: `Open now, until ${clock(toMinutes(today.close))} today.` };
  }
  for (let i = 0; i < 8; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const day = HOURS[d.getDay()];
    if (!day.open) continue;
    if (i === 0 && mins >= toMinutes(day.open)) continue;
    const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : day.day;
    const at = clock(toMinutes(day.open));
    return { open: false, short: `Opens ${i === 0 ? '' : when + ' '}${at}`.replace('  ', ' '), long: `Closed now. Opens ${when} at ${at}.` };
  }
  return { open: false, short: 'Closed', long: 'Closed for now.' };
}

function renderBusiness() {
  const status = openStatus();
  const pill = $('[data-open-status]');
  pill.textContent = status.short;
  pill.classList.toggle('is-open', status.open);
  const detail = $('[data-open-detail]');
  detail.textContent = status.long;
  detail.classList.toggle('is-open', status.open);

  const banner = $('[data-offer-banner]');
  banner.replaceChildren(`New guests: ${OFFER.percent}% off your first color service. `, h('a', { href: '#first-visit' }, 'How it works'));

  $('[data-salon-name]').textContent = SALON.name;
  $('[data-brand-link]').setAttribute('aria-label', `${SALON.name}, back to top`);
  $$('[data-wordmark]').forEach((el) => el.replaceChildren(h('span', {}, SALON.name)));
  $('[data-hero-area]').textContent = SALON.area;
  $('[data-stats]').replaceChildren(...STATS.map((st) => h('div', {}, h('dt', {}, st.label), h('dd', {}, st.value))));
  $$('[data-rating-average]').forEach((el) => { el.textContent = SALON.rating.average.toFixed(1); });
  $$('[data-rating-count]').forEach((el) => { el.textContent = SALON.rating.count.toLocaleString('en-US'); });

  $('[data-neighborhood]').textContent = SALON.neighborhood;
  $('[data-address]').textContent = SALON.address;
  $('[data-directions]').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(SALON.address)}`;
  const phone = $('[data-phone-link]');
  phone.textContent = SALON.phone;
  phone.href = `tel:${SALON.phone.replace(/[^\d+]/g, '')}`;
  const email = $('[data-email-link]');
  email.textContent = SALON.email;
  email.href = `mailto:${SALON.email}`;

  const handle = `@${SALON.instagram}`;
  $('[data-instagram]').textContent = handle;
  const ig = $('[data-instagram-link]');
  ig.textContent = handle;
  ig.href = `https://instagram.com/${SALON.instagram}`;
  $('[data-footer-address]').textContent = SALON.address;
  $('[data-year]').textContent = new Date().getFullYear();
  $('[data-legal-name]').textContent = SALON.legalName;
  $('[data-team-count]').textContent = `${STYLISTS.length} stylists`;

  const todayIndex = new Date().getDay();
  // Monday first reads more naturally on a salon's door.
  const order = [1, 2, 3, 4, 5, 6, 0];
  $('[data-hours] tbody').replaceChildren(...order.map((i) => {
    const d = HOURS[i];
    return h('tr', { class: i === todayIndex ? 'is-today' : null },
      h('th', { scope: 'row' }, d.day),
      d.open
        ? h('td', {}, `${clock(toMinutes(d.open))} – ${clock(toMinutes(d.close))}`)
        : h('td', { class: 'closed' }, 'Closed'));
  }));
  $('[data-visit-notes]').replaceChildren(...VISIT_NOTES.map((n) => h('li', {}, n)));
  $('[data-policy]').replaceChildren(...POLICY.map((p) => h('p', {}, p)));
}

// ---------------------------------------------------------------------------
// Menu

function priceFor(service, level = state.level) {
  return service.price ? service.price[levelIndex(level)] : null;
}

function renderLevels() {
  const wrap = $('[data-levels]');
  swap(wrap, LEVELS.map((l) => h('button', {
    type: 'button', role: 'radio', 'aria-checked': String(l.id === state.level), dataset: { key: l.id },
    onclick: () => setLevel(l.id),
  }, l.name)));
  setRoving($$('button', wrap), (el) => el.dataset.key === state.level);
  $('[data-level-note]').textContent = LEVELS[levelIndex(state.level)].note;
}

function setLevel(id, { animate = true } = {}) {
  if (id === state.level) return;
  state.level = id;
  renderLevels();
  renderMenu(animate);
  renderQuick();
}

function renderTabs() {
  const wrap = $('[data-tabs]');
  swap(wrap, CATEGORIES.map((c) => h('button', {
    type: 'button', class: 'tab', role: 'tab', id: `tab-${c.id}`, dataset: { key: c.id },
    'aria-selected': String(c.id === state.tab), 'aria-controls': 'menu-panel',
    tabindex: c.id === state.tab ? '0' : '-1',
    onclick: () => { state.tab = c.id; renderTabs(); renderMenu(); },
  }, c.name, h('sup', {}, SERVICES.filter((s) => s.cat === c.id).length))));
  const panel = $('[data-menu-panel]');
  panel.id = 'menu-panel';
  panel.setAttribute('aria-labelledby', `tab-${state.tab}`);
}

function renderMenu(animate = false) {
  const list = $('[data-menu-list]');
  swap(list, SERVICES.filter((s) => s.cat === state.tab).map((s) => {
    const price = priceFor(s);
    const on = state.picked.includes(s.id);
    return h('li', { class: 'svc' },
      h('div', { class: 'svc-main' }, h('h3', {}, s.name), h('p', {}, s.desc)),
      h('span', { class: 'svc-dots', 'aria-hidden': 'true' }),
      h('span', { class: 'svc-time' }, s.price ? duration(s.mins) : 'Consult first'),
      h('span', { class: `svc-price${animate ? ' is-changing' : ''}` },
        price === null ? 'Quote' : [h('small', {}, 'from'), money(price)]),
      h('button', {
        type: 'button', class: 'add-btn', 'aria-pressed': String(on), dataset: { key: s.id },
        'aria-label': `${on ? 'Remove' : 'Add'} ${s.name} ${on ? 'from' : 'to'} your visit`,
        onclick: () => togglePick(s.id),
      }, on ? '✓' : '+'));
  }));
}

// The hero's quick-add card: popular services as one-tap toggles.
function renderQuick() {
  swap($('[data-quick]'), POPULAR.map(serviceById).filter(Boolean).map((s) => {
    const on = state.picked.includes(s.id);
    const price = priceFor(s);
    return h('li', {}, h('button', {
      type: 'button', class: 'quick-chip', 'aria-pressed': String(on), dataset: { key: s.id },
      'aria-label': `${on ? 'Remove' : 'Add'} ${s.name} ${on ? 'from' : 'to'} your visit`,
      onclick: () => togglePick(s.id),
    }, s.name, price === null ? null : h('small', {}, `from ${money(price)}`)));
  }));
}

// The giant name in the hero and footer: scaled so it spans its box.
function fitWordmarks() {
  for (const el of $$('[data-wordmark]')) {
    const text = el.firstElementChild;
    if (!text) continue;
    el.style.fontSize = '100px';
    const width = text.getBoundingClientRect().width;
    if (width) el.style.fontSize = `${(100 * el.clientWidth * 0.96) / width}px`;
  }
}

// ---------------------------------------------------------------------------
// Stylists

function renderSpecialtyFilter() {
  const used = [...new Set(STYLISTS.flatMap((s) => s.specialties))];
  const wrap = $('[data-specialty-filter]');
  swap(wrap, ['all', ...used].map((id) => h('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(state.specialty === id), dataset: { key: id },
    onclick: () => { state.specialty = id; renderSpecialtyFilter(); renderStylists(); },
  }, id === 'all' ? 'Everyone' : SPECIALTIES[id] || id)));
}

function workDays(days) {
  // Collapse runs of days: [2,3,4,5] -> "Tue–Fri", [2,4,5,6] -> "Tue, Thu–Sat".
  const short = (i) => HOURS[i].day.slice(0, 3);
  const sorted = [...days].sort((a, b) => a - b);
  const runs = [];
  for (const d of sorted) {
    const last = runs[runs.length - 1];
    if (last && d === last[1] + 1) last[1] = d;
    else runs.push([d, d]);
  }
  return runs.map(([a, b]) => (a === b ? short(a) : b === a + 1 ? `${short(a)}, ${short(b)}` : `${short(a)}–${short(b)}`)).join(', ');
}

function renderStylists() {
  const shown = STYLISTS.filter((s) => state.specialty === 'all' || s.specialties.includes(state.specialty));
  $('[data-stylists]').replaceChildren(...shown.map((s) => h('li', { class: 'stylist' },
    h('figure', { class: 'stylist-photo' },
      h('img', { src: s.photo, alt: `Portrait of ${s.name}`, loading: 'lazy', width: 480, height: 600 }),
      h('figcaption', { class: 'glass stylist-plate' },
        h('h3', { class: 'stylist-name' }, s.name),
        h('span', { class: 'level-badge' }, levelName(s.level)))),
    h('p', { class: 'stylist-role' }, s.role),
    h('p', { class: 'stylist-bio' }, s.bio),
    h('ul', { class: 'tag-list', 'aria-label': 'Specialties' }, s.specialties.map((t) => h('li', {}, SPECIALTIES[t] || t))),
    h('p', { class: 'stylist-days' }, `In the studio ${workDays(s.days)}`),
    h('a', { class: 'btn btn-ghost btn-sm', href: '#book', onclick: () => chooseStylist(s.id) }, `Book with ${s.name.split(' ')[0]}`))));
  $('[data-stylists-empty]').hidden = shown.length > 0;
}

// ---------------------------------------------------------------------------
// First visit, lookbook and reviews

function renderFirstVisit() {
  $('[data-steps]').replaceChildren(...FIRST_VISIT.map((s, i) => h('li', {},
    h('span', { class: 'step-num', 'aria-hidden': 'true' }, String(i + 1).padStart(2, '0')),
    h('h3', {}, s.title),
    h('p', {}, s.text),
    h('span', { class: 'step-time' }, s.time))));
  $('[data-offer-percent]').replaceChildren(`${OFFER.percent}% `, h('em', {}, 'off'));
  $('[data-offer-text]').textContent = OFFER.text;
  $('[data-offer-cta]').addEventListener('click', () => {
    const box = $('[data-first-visit]');
    box.checked = true;
    state.firstVisit = true;
    renderSummary();
  });
  $('[data-color-prep]').replaceChildren(...COLOR_PREP.map((c) => h('li', {}, h('strong', {}, c.title), ' ', c.text)));
}

function visibleLooks() {
  return LOOKS.filter((l) => state.look === 'all' || l.tag === state.look);
}

function renderLooks() {
  const used = [...new Set(LOOKS.map((l) => l.tag))];
  const filter = $('[data-look-filter]');
  swap(filter, ['all', ...used].map((id) => h('button', {
    type: 'button', class: 'chip', 'aria-pressed': String(state.look === id), dataset: { key: id },
    onclick: () => { state.look = id; renderLooks(); },
  }, id === 'all' ? 'All work' : LOOK_TAGS[id] || id)));

  const looks = visibleLooks();
  const grid = $('[data-looks]');
  grid.classList.toggle('is-filtered', state.look !== 'all');
  grid.replaceChildren(...looks.map((l, i) => {
    const by = stylistById(l.stylist);
    return h('li', { class: 'look' },
      h('button', { type: 'button', 'aria-label': `${l.title}${by ? `, by ${by.name}` : ''}. Open larger`, onclick: () => openLightbox(i) },
        h('img', { src: l.src, alt: l.alt, loading: 'lazy', width: l.w, height: l.h, style: l.focus ? `object-position: ${l.focus}` : null }),
        h('span', { class: 'glass look-cap', 'aria-hidden': 'true' }, h('strong', {}, l.title), by ? `by ${by.name.split(' ')[0]}` : '')));
  }));
}

function renderReviews() {
  $('[data-reviews]').replaceChildren(...REVIEWS.map((r) => {
    const by = stylistById(r.stylist);
    return h('li', { class: 'review' },
      h('p', { class: 'stars', 'aria-label': '5 out of 5 stars' }, '★★★★★'),
      h('blockquote', {}, `“${r.text}”`),
      h('div', { class: 'review-meta' },
        h('span', { class: 'avatar', 'aria-hidden': 'true' }, r.name.charAt(0)),
        h('span', {}, h('strong', {}, r.name), `${r.service}${by ? ` with ${by.name.split(' ')[0]}` : ''}`)));
  }));
}

// Lightbox over the lookbook, stepping through the photos currently shown.
let lightboxIndex = 0;
function openLightbox(i) {
  const dlg = $('[data-lightbox]');
  lightboxIndex = i;
  showLightbox();
  if (!dlg.open) dlg.showModal();
}
function showLightbox() {
  const looks = visibleLooks();
  const l = looks[lightboxIndex];
  if (!l) return;
  const img = $('[data-lightbox-img]');
  img.src = l.src;
  img.alt = l.alt;
  const by = stylistById(l.stylist);
  $('[data-lightbox-caption]').replaceChildren(h('strong', {}, l.title), `${LOOK_TAGS[l.tag] || l.tag}${by ? ` · by ${by.name}` : ''} · ${lightboxIndex + 1} of ${looks.length}`);
}
function stepLightbox(dir) {
  const n = visibleLooks().length;
  lightboxIndex = (lightboxIndex + dir + n) % n;
  showLightbox();
}
function initLightbox() {
  const dlg = $('[data-lightbox]');
  $('[data-lightbox-prev]').addEventListener('click', () => stepLightbox(-1));
  $('[data-lightbox-next]').addEventListener('click', () => stepLightbox(1));
  $('[data-lightbox-close]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') stepLightbox(1);
    if (e.key === 'ArrowLeft') stepLightbox(-1);
  });
}

// ---------------------------------------------------------------------------
// The visit: picked services, stylist, day and time

function togglePick(id) {
  const i = state.picked.indexOf(id);
  if (i === -1) state.picked.push(id);
  else state.picked.splice(i, 1);
  renderMenu();
  renderQuick();
  renderPicker();
  renderDays();
  renderTimes();
  renderSummary();
  renderTray();
}

function chooseStylist(id) {
  state.stylist = id;
  const s = stylistById(id);
  if (s) setLevel(s.level, { animate: false });
  // A day they do not work is no longer a valid choice.
  if (state.day && !dayOpenFor(fromKey(state.day))) { state.day = null; state.time = null; }
  renderStylistPicker();
  renderDays();
  renderTimes();
  renderSummary();
}

function totalMinutes() {
  return state.picked.reduce((n, id) => n + serviceById(id).mins, 0);
}

function renderPicker() {
  swap($('[data-svc-picker]'), CATEGORIES.map((c) => h('div', {},
    h('p', { class: 'svc-group-title' }, c.name),
    h('div', { class: 'chips' }, SERVICES.filter((s) => s.cat === c.id).map((s) => h('button', {
      type: 'button', class: 'pick', 'aria-pressed': String(state.picked.includes(s.id)), dataset: { key: s.id },
      onclick: () => togglePick(s.id),
    }, s.name))))));
}

function renderStylistPicker() {
  const wrap = $('[data-stylist-picker]');
  const opts = [{ id: 'any' }, ...STYLISTS];
  swap(wrap, opts.map((s) => h('button', {
    type: 'button', class: 'stylist-opt', role: 'radio', 'aria-checked': String(state.stylist === s.id), dataset: { key: s.id },
    onclick: () => chooseStylist(s.id),
  },
  s.id === 'any' ? h('span', { class: 'any', 'aria-hidden': 'true' }, '✶') : h('img', { src: s.photo, alt: '', width: 40, height: 40 }),
  h('span', {}, s.id === 'any' ? 'First available' : s.name.split(' ')[0],
    h('small', {}, s.id === 'any' ? 'Any level' : levelName(s.level))))));
  setRoving($$('.stylist-opt', wrap), (el) => el.dataset.key === state.stylist);
}

function dayOpenFor(date) {
  const hours = HOURS[date.getDay()];
  if (!hours.open) return false;
  const s = stylistById(state.stylist);
  return !s || s.days.includes(date.getDay());
}

function slotsFor(date) {
  const hours = HOURS[date.getDay()];
  if (!dayOpenFor(date)) return [];
  const length = Math.max(totalMinutes(), BOOKING.slotMinutes);
  let start = toMinutes(hours.open);
  const lastStart = toMinutes(hours.close) - length;
  const now = new Date();
  if (dayKey(date) === dayKey(now)) {
    const earliest = now.getHours() * 60 + now.getMinutes() + BOOKING.leadMinutes;
    while (start < earliest) start += BOOKING.slotMinutes;
  }
  const out = [];
  for (let t = start; t <= lastStart; t += BOOKING.slotMinutes) out.push(t);
  return out;
}

function renderDays() {
  const wrap = $('[data-days]');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 0; i < BOOKING.daysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  swap(wrap, days.map((d) => {
    const key = dayKey(d);
    const usable = dayOpenFor(d) && slotsFor(d).length > 0;
    return h('button', {
      type: 'button', class: 'day', role: 'radio', 'aria-checked': String(state.day === key), dataset: { key },
      disabled: !usable, 'aria-label': `${longDate(d)}${usable ? '' : ', unavailable'}`,
      onclick: () => { state.day = key; state.time = null; renderDays(); renderTimes(); renderSummary(); clearError('day'); },
    },
    h('span', {}, d.toLocaleDateString('en-US', { weekday: 'short' })),
    h('b', {}, d.getDate()),
    h('span', {}, d.toLocaleDateString('en-US', { month: 'short' })));
  }));
  setRoving($$('.day', wrap), (el) => el.dataset.key === state.day);
}

function renderTimes() {
  const wrap = $('[data-times]');
  const hint = $('[data-time-hint]');
  if (!state.day) {
    wrap.replaceChildren();
    hint.textContent = 'Pick a day to see start times. Greyed-out days are closed, or your stylist is off.';
    return;
  }
  const date = fromKey(state.day);
  const slots = slotsFor(date);
  if (state.time !== null && !slots.includes(state.time)) state.time = null;
  swap(wrap, slots.map((t) => h('button', {
    type: 'button', class: 'pick', role: 'radio', 'aria-checked': String(state.time === t), dataset: { key: t },
    onclick: () => { state.time = t; renderTimes(); renderSummary(); clearError('time'); },
  }, clock(t))));
  setRoving($$('.pick', wrap), (el) => Number(el.dataset.key) === state.time);
  const mins = totalMinutes();
  if (!slots.length) hint.textContent = 'Nothing that long fits on this day. Try another day, or call us and we will plan it with you.';
  else if (!mins) hint.textContent = 'Times shown for a short visit. Add services and they adjust to fit before we close.';
  else hint.textContent = `Start times that fit about ${duration(mins)} before we close. We confirm the exact time by text.`;
}

// The estimate: picked services at the chosen stylist's level, or a range
// across levels for "first available".
function estimate() {
  const s = stylistById(state.stylist);
  const levels = s ? [s.level] : LEVELS.map((l) => l.id);
  const picked = state.picked.map(serviceById);
  const consult = picked.some((p) => !p.price);
  const totals = levels.map((lvl) => {
    let sum = 0;
    let off = 0;
    for (const p of picked) {
      const price = priceFor(p, lvl);
      if (price === null) continue;
      sum += price;
      if (state.firstVisit && p.cat === OFFER.category) off += price * OFFER.percent / 100;
    }
    return { sum: sum - off, off };
  });
  const low = totals.reduce((a, b) => (b.sum < a.sum ? b : a));
  const high = totals.reduce((a, b) => (b.sum > a.sum ? b : a));
  return { low, high, consult, ranged: low.sum !== high.sum };
}

function renderSummary() {
  const s = stylistById(state.stylist);
  const lines = $('[data-summary-lines]');
  if (!state.picked.length) {
    lines.replaceChildren(h('li', { class: 'muted' }, 'No services yet. Add them from the menu or the list.'));
  } else {
    lines.replaceChildren(...state.picked.map(serviceById).map((p) => {
      let price;
      if (!p.price) price = 'Quote';
      else if (s) price = money(priceFor(p, s.level));
      else {
        const lo = Math.min(...p.price);
        const hi = Math.max(...p.price);
        price = lo === hi ? money(lo) : `${money(lo)}–${money(hi)}`;
      }
      return h('li', {},
        h('span', {}, p.name, h('button', { type: 'button', class: 'remove', 'aria-label': `Remove ${p.name}`, onclick: () => togglePick(p.id) }, '×')),
        h('span', {}, price));
    }));
  }
  $('[data-sum-stylist]').textContent = s ? `${s.name} (${levelName(s.level)})` : 'First available';
  $('[data-sum-when]').textContent = state.day
    ? `${fromKey(state.day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}${state.time !== null ? `, ${clock(state.time)}` : ''}`
    : 'Not chosen';
  const mins = totalMinutes();
  $('[data-sum-duration]').textContent = mins ? `About ${duration(mins)}` : '–';

  const est = estimate();
  const total = $('[data-sum-total]');
  if (!state.picked.length) total.textContent = '–';
  else if (!est.high.sum && est.consult) total.textContent = 'By quote';
  else total.textContent = (est.ranged ? `${money(est.low.sum)}–${money(est.high.sum)}` : money(est.low.sum)) + (est.consult ? ' + quote' : '');

  const discount = $('[data-sum-discount]');
  const off = est.ranged ? `${money(est.low.off)}–${money(est.high.off)}` : money(est.low.off);
  discount.hidden = !(state.firstVisit && est.high.off > 0);
  discount.textContent = `Includes your new guest ${OFFER.percent}% off color (${off}).`;
}

function renderTray() {
  const tray = $('[data-tray]');
  const n = state.picked.length;
  if (!n || trayHiddenBySection) { tray.hidden = true; return; }
  tray.hidden = false;
  const est = estimate();
  $('[data-tray-count]').textContent = `${n} ${n === 1 ? 'service' : 'services'}`;
  const range = est.ranged ? `${money(est.low.sum)}–${money(est.high.sum)}` : money(est.low.sum);
  const price = est.high.sum ? ` · ${range}${est.consult ? ' + quote' : ''}` : ' · by quote';
  $('[data-tray-detail]').textContent = `· about ${duration(totalMinutes())}${price}`;
}

// ---------------------------------------------------------------------------
// Sending the request

function clearError(name) {
  const el = $(`[data-error="${name}"]`);
  if (el) el.hidden = true;
  const input = $(`[name="${name}"]`);
  if (input) input.removeAttribute('aria-invalid');
}

function showError(name) {
  const el = $(`[data-error="${name}"]`);
  if (el) el.hidden = false;
  const input = $(`[name="${name}"]`);
  if (input) input.setAttribute('aria-invalid', 'true');
}

function requestText(data) {
  const lines = [
    `Booking request for ${SALON.name}`,
    '',
    `Services: ${data.services.join(', ')}`,
    `Stylist: ${data.stylist}`,
    `Preferred time: ${data.when}`,
    `Time in the chair: about ${data.duration}`,
    `Estimate: ${data.estimate}`,
    '',
    `Name: ${data.name}`,
    `Mobile: ${data.phone}`,
  ];
  if (data.email) lines.push(`Email: ${data.email}`);
  lines.push(`First visit: ${data.firstVisit ? 'yes' : 'no'}`);
  if (data.notes) lines.push('', `Notes: ${data.notes}`);
  return lines.join('\n');
}

function initForm() {
  const form = $('[data-book-form]');
  const note = $('[data-form-note]');
  const submit = $('[data-submit]');

  $('[data-first-visit]').addEventListener('change', (e) => { state.firstVisit = e.target.checked; renderSummary(); renderTray(); });
  for (const name of ['name', 'phone', 'email']) {
    form.elements[name].addEventListener('input', () => clearError(name));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.elements.name.value.trim();
    const phone = form.elements.phone.value.trim();
    const email = form.elements.email.value.trim();
    const notes = form.elements.notes.value.trim();

    const problems = [];
    if (!state.picked.length) problems.push('services');
    if (!state.day) problems.push('day');
    else if (state.time === null) problems.push('time');
    if (!name) problems.push('name');
    if (phone.replace(/\D/g, '').length < 7) problems.push('phone');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push('email');
    ['services', 'day', 'time', 'name', 'phone', 'email'].forEach(clearError);
    if (problems.length) {
      problems.forEach(showError);
      const first = problems[0];
      const target = form.elements[first] || $(`[data-error="${first}"]`).closest('fieldset');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (form.elements[first]) form.elements[first].focus({ preventScroll: true });
      note.textContent = 'A few details are missing. They are marked in the form.';
      return;
    }

    const s = stylistById(state.stylist);
    const est = estimate();
    const data = {
      services: state.picked.map((id) => serviceById(id).name),
      stylist: s ? s.name : 'First available',
      date: state.day,
      time: clock(state.time),
      when: `${longDate(fromKey(state.day))}, ${clock(state.time)}`,
      duration: duration(totalMinutes()),
      estimate: $('[data-sum-total]').textContent,
      newGuestDiscount: state.firstVisit && est.high.off > 0,
      name, phone, email, notes,
      firstVisit: state.firstVisit,
    };

    note.textContent = '';
    if (SALON.bookingEndpoint) {
      submit.disabled = true;
      submit.textContent = 'Sending…';
      try {
        const res = await fetch(SALON.bookingEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ ...data, message: requestText(data) }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        showDone(data, 'sent');
      } catch (err) {
        note.textContent = `That didn't go through. Please try again, or call us on ${SALON.phone}.`;
      } finally {
        submit.disabled = false;
        submit.textContent = 'Send booking request';
      }
      return;
    }

    const subject = `Booking request: ${data.services[0]}${data.services.length > 1 ? ` + ${data.services.length - 1} more` : ''}`;
    const href = `mailto:${SALON.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(requestText(data))}`;
    window.location.href = href;
    showDone(data, 'email');
  });

  $('[data-book-again]').addEventListener('click', () => {
    form.reset();
    Object.assign(state, { picked: [], stylist: 'any', day: null, time: null, firstVisit: false });
    $('[data-done]').hidden = true;
    $('.summary-card').hidden = false;
    renderAll();
    form.elements.name.focus();
  });
}

function showDone(data, how) {
  const first = data.name.split(' ')[0];
  $('[data-done-title]').textContent = `Thank you, ${first}.`;
  $('[data-done-text]').textContent = how === 'sent'
    ? `We have your request for ${data.when}. Someone from the desk will text ${data.phone} within one working day to confirm.`
    : `Your email app should have opened with the request addressed to ${SALON.email}. Send it and we will text ${data.phone} within one working day to confirm. Nothing opened? Call us on ${SALON.phone}.`;
  $('.summary-card').hidden = true;
  const done = $('[data-done]');
  done.hidden = false;
  done.focus();
}

// ---------------------------------------------------------------------------
// Page chrome: header, mobile nav, the visit tray

let trayHiddenBySection = false;

function initChrome() {
  const header = $('[data-header]');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const nav = $('[data-nav]');
  const toggle = $('[data-nav-toggle]');
  const setOpen = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('.nav-toggle-text').textContent = open ? 'Close' : 'Menu';
  };
  toggle.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  $$('a', nav).forEach((a) => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
  });

  // The tray steps aside while the booking form is on screen.
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      trayHiddenBySection = entries[0].isIntersecting;
      renderTray();
    }, { threshold: 0.08 }).observe($('#book'));
  }

  radioKeys($('[data-levels]'), 'button');
  radioKeys($('[data-stylist-picker]'), '.stylist-opt');
  radioKeys($('[data-days]'), '.day');
  radioKeys($('[data-times]'), '.pick');
  $('[data-tabs]').addEventListener('keydown', (e) => {
    const dir = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!dir) return;
    const i = CATEGORIES.findIndex((c) => c.id === state.tab);
    state.tab = CATEGORIES[(i + dir + CATEGORIES.length) % CATEGORIES.length].id;
    renderTabs();
    renderMenu();
    $(`#tab-${state.tab}`).focus();
  });
}

function renderAll() {
  renderQuick();
  renderLevels();
  renderTabs();
  renderMenu();
  renderPicker();
  renderStylistPicker();
  renderDays();
  renderTimes();
  renderSummary();
  renderTray();
}

renderBusiness();
fitWordmarks();
if (document.fonts) document.fonts.ready.then(fitWordmarks);
let fitFrame = 0;
window.addEventListener('resize', () => {
  cancelAnimationFrame(fitFrame);
  fitFrame = requestAnimationFrame(fitWordmarks);
});
renderSpecialtyFilter();
renderStylists();
renderFirstVisit();
renderLooks();
renderReviews();
initLightbox();
initChrome();
initForm();
renderAll();
