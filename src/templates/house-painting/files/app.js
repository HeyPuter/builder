// Wren & Roller Painting Co. — everything the page does.
//
// Make it yours by editing the data below: the business details, the paint
// palette and schemes the color studio uses, and the rates the estimator
// quotes from. The words on the page live in index.html.

const BUSINESS = {
  name: 'Wren & Roller Painting Co.',
  short: 'Wren & Roller',
  phone: '(555) 014-2290',
  area: 'Ashford Valley',
  founded: 2009,
  rating: '4.9',
  reviews: 386,
  license: 'Lic. #PC-20417',
  hours: 'Mon–Fri 7:30–5:00 · Saturday walkthroughs',
  bookingFor: 'next week',
  areas: ['Ashford', 'Elm Park', 'Millbrook', 'Old Town', 'Hillcrest', 'Riverside', 'South Fork', 'Maple Heights', 'Harbor Point', 'Cedar Bend'],
  // Where walkthrough requests go. With formEndpoint set (a form service, a
  // serverless function, your CRM's webhook) the form POSTs JSON there.
  // Without it, the visitor's email app opens addressed to `email`.
  email: 'hello@example.com',
  formEndpoint: '',
};

// The house palette. `note` is the one-line description the studio shows.
const PALETTE = [
  { code: 'WR-100', name: 'Cotton Sheet', hex: '#f6f4ee', note: 'a clean white with no blue in it' },
  { code: 'WR-101', name: 'Linen Closet', hex: '#efeae0', note: 'a warm white that works anywhere' },
  { code: 'WR-102', name: 'Buttermilk', hex: '#f1e6cc', note: 'soft cream that glows at night' },
  { code: 'WR-110', name: 'Oat Latte', hex: '#d8cbb5', note: 'a cozy, sandy neutral' },
  { code: 'WR-111', name: 'Garden Path', hex: '#b9b0a0', note: 'a greige that hides scuffs' },
  { code: 'WR-112', name: 'Wet Slate', hex: '#4d5357', note: 'deep gray, handsome on siding' },
  { code: 'WR-120', name: 'Sage Bundle', hex: '#a9b59b', note: 'reads soft and calm' },
  { code: 'WR-121', name: 'Porch Fern', hex: '#6f8569', note: 'a grounded garden green' },
  { code: 'WR-122', name: 'Deep Hedge', hex: '#34483c', note: 'moody and rich on millwork' },
  { code: 'WR-130', name: 'Morning Fog', hex: '#c9d3d6', note: 'an airy blue-gray' },
  { code: 'WR-131', name: 'Harbor Haze', hex: '#7e97a6', note: 'a weathered coastal blue' },
  { code: 'WR-132', name: 'Night Swim', hex: '#263a4f', note: 'a navy that never dates' },
  { code: 'WR-140', name: 'Apricot Jam', hex: '#e9b48f', note: 'sunny and flattering' },
  { code: 'WR-141', name: 'Clay Pot', hex: '#c0704f', note: 'an earthy terracotta' },
  { code: 'WR-142', name: 'Barn Door', hex: '#8e2f2a', note: 'a confident front-door red' },
  { code: 'WR-143', name: 'Porch Swing', hex: '#d9a441', note: 'a cheerful mustard' },
  { code: 'WR-150', name: 'Plum Jar', hex: '#5e3a4f', note: 'dusky and dramatic' },
  { code: 'WR-151', name: 'Ink Well', hex: '#1f2326', note: 'a soft black for doors and trim' },
];
const COLOR_OF_THE_MONTH = 'WR-121';

// The two scenes in the color studio. Each surface is a group in the SVG
// (data-surface="…") filled from the CSS variable --c-<surface>.
const SCENES = {
  room: {
    surfaces: [
      { key: 'walls', label: 'Walls' },
      { key: 'trim', label: 'Trim' },
      { key: 'ceiling', label: 'Ceiling' },
      { key: 'door', label: 'Door' },
    ],
    start: { walls: 'WR-120', trim: 'WR-100', ceiling: 'WR-100', door: 'WR-122' },
    schemes: [
      { name: 'Quiet morning', colors: { walls: 'WR-101', trim: 'WR-100', ceiling: 'WR-100', door: 'WR-131' } },
      { name: 'Garden room', colors: { walls: 'WR-120', trim: 'WR-100', ceiling: 'WR-100', door: 'WR-122' } },
      { name: 'Color drench', colors: { walls: 'WR-132', trim: 'WR-132', ceiling: 'WR-130', door: 'WR-132' } },
      { name: 'Sunday warmth', colors: { walls: 'WR-140', trim: 'WR-102', ceiling: 'WR-100', door: 'WR-141' } },
      { name: 'Library', colors: { walls: 'WR-122', trim: 'WR-122', ceiling: 'WR-102', door: 'WR-151' } },
    ],
  },
  house: {
    surfaces: [
      { key: 'body', label: 'Siding' },
      { key: 'trim', label: 'Trim' },
      { key: 'door', label: 'Door' },
      { key: 'shutters', label: 'Shutters' },
    ],
    start: { body: 'WR-131', trim: 'WR-100', door: 'WR-143', shutters: 'WR-132' },
    schemes: [
      { name: 'Farmhouse', colors: { body: 'WR-100', trim: 'WR-151', door: 'WR-142', shutters: 'WR-151' } },
      { name: 'Coastal', colors: { body: 'WR-131', trim: 'WR-100', door: 'WR-143', shutters: 'WR-132' } },
      { name: 'Cottage green', colors: { body: 'WR-120', trim: 'WR-101', door: 'WR-142', shutters: 'WR-122' } },
      { name: 'Desert clay', colors: { body: 'WR-110', trim: 'WR-100', door: 'WR-141', shutters: 'WR-111' } },
      { name: 'Slate & brass', colors: { body: 'WR-112', trim: 'WR-100', door: 'WR-143', shutters: 'WR-151' } },
    ],
  },
};

// The rates the estimator quotes from. Prices include paint and prep.
const PRICING = {
  rangeLow: 0.92,   // the range shown is the estimate times these
  rangeHigh: 1.14,
  roundTo: 50,
  interior: {
    // walls and ceiling in sq ft, trim in linear ft (baseboard, casing, crown)
    rooms: [
      { key: 'bedroom', label: 'Bedroom', size: 'about 12 × 12', walls: 400, ceiling: 150, trim: 48, start: 2 },
      { key: 'primary', label: 'Primary bedroom', size: 'about 14 × 16', walls: 520, ceiling: 225, trim: 60, start: 0 },
      { key: 'living', label: 'Living room', size: 'about 16 × 18', walls: 600, ceiling: 290, trim: 68, start: 1 },
      { key: 'kitchen', label: 'Kitchen', size: 'walls around cabinets', walls: 260, ceiling: 180, trim: 30, start: 0 },
      { key: 'dining', label: 'Dining room', size: 'about 12 × 14', walls: 420, ceiling: 170, trim: 52, start: 0 },
      { key: 'bath', label: 'Bathroom', size: 'about 6 × 9', walls: 220, ceiling: 55, trim: 30, start: 0 },
      { key: 'hall', label: 'Hall or stairwell', size: 'tall walls, ladder work', walls: 480, ceiling: 110, trim: 60, factor: 1.25, start: 0 },
      { key: 'office', label: 'Home office', size: 'about 10 × 12', walls: 360, ceiling: 120, trim: 44, start: 0 },
    ],
    wallRate: 1.45,     // per sq ft of wall, two coats
    ceilingRate: 1.15,  // per sq ft of ceiling
    trimRate: 2.1,      // per linear ft
    doorRate: 95,       // per door, both sides and casing
    condition: [
      { key: 'good', label: 'Good shape', factor: 1 },
      { key: 'patch', label: 'Some patching', factor: 1.12 },
      { key: 'repair', label: 'Needs real repair', factor: 1.3 },
    ],
    colorChange: [
      { key: 'similar', label: 'Similar color', factor: 1, coats: 2 },
      { key: 'big', label: 'Big change', hint: 'light ↔ dark', factor: 1.22, coats: 3 },
    ],
    minimum: 650,
    crew: 2,
    included: ['Floors and furniture protected', 'Small patches, caulk and spot priming', 'Low-VOC paint, two finish coats', 'Daily cleanup and a labeled touch-up kit'],
    sqftPerHour: 150,   // per painter, per coat, cut-in included
    coverage: 350,      // sq ft per gallon per coat
  },
  exterior: {
    ratePerSqft: 2.7,   // per sq ft of living space, body and trim
    stories: [
      { key: '1', label: 'One', factor: 1 },
      { key: '2', label: 'Two', factor: 1.18 },
      { key: '3', label: 'Three', factor: 1.42 },
    ],
    siding: [
      { key: 'wood', label: 'Wood or fiber cement', factor: 1 },
      { key: 'vinyl', label: 'Vinyl or metal', factor: 0.9 },
      { key: 'stucco', label: 'Stucco', factor: 1.1 },
      { key: 'brick', label: 'Brick', factor: 1.22 },
    ],
    condition: [
      { key: 'sound', label: 'Sound', factor: 1 },
      { key: 'some', label: 'Some peeling', factor: 1.15 },
      { key: 'lots', label: 'Lots of peeling', factor: 1.38 },
    ],
    frontDoor: 240,
    shutterPair: 85,
    garageDoor: 320,
    deck: [
      { key: 'none', label: 'None', sqft: 0 },
      { key: 'small', label: 'Small', sqft: 150 },
      { key: 'medium', label: 'Medium', sqft: 300 },
      { key: 'large', label: 'Large', sqft: 500 },
    ],
    deckRate: 1.6,      // per sq ft, washed, brightened and stained
    minimum: 1800,
    crew: 3,
    included: ['Power wash and a day to dry', 'Plants, walks and windows covered', 'Caulk, spot priming and two finish coats', 'Daily cleanup and a labeled touch-up kit'],
    sqftPerHour: 90,
    coverage: 300,
  },
  cabinets: {
    perFront: 95,       // per door or drawer front, sprayed in the shop
    base: 900,          // frames, boxes and end panels, on site
    finish: [
      { key: 'painted', label: 'Painted', factor: 1 },
      { key: 'stained', label: 'Stained wood', factor: 1.2 },
      { key: 'laminate', label: 'Laminate', factor: 1.15 },
    ],
    island: 350,
    hardwarePerFront: 12,
    interiorsPerFront: 38,
    minimum: 1800,
    crew: 2,
    included: ['Counters, floors and appliances masked', 'Degreasing, sanding and bonding primer', 'Shop-sprayed enamel on doors and drawers', 'Hinges labeled and every door rehung'],
  },
};

/* ---------------------------------------------------------------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const byCode = Object.fromEntries(PALETTE.map((c) => [c.code, c]));
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const roundTo = (n, step) => Math.round(n / step) * step;
const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Light reflectance value, approximated from the sRGB relative luminance.
function lrv(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return Math.round((0.2126 * r + 0.7152 * g + 0.0722 * b) * 100);
}

let toastTimer;
function toast(text) {
  const el = $('[data-toast]');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// Arrow keys move through a radio group and select as they go, like native radios.
function radioKeys(group, cols = 0) {
  group.addEventListener('keydown', (e) => {
    const items = $$('[role="radio"]', group);
    const i = items.indexOf(document.activeElement);
    if (i < 0) return;
    const step = { ArrowRight: 1, ArrowDown: cols || 1, ArrowLeft: -1, ArrowUp: -(cols || 1) }[e.key];
    let next;
    if (step) next = Math.min(items.length - 1, Math.max(0, i + step));
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = items.length - 1;
    else return;
    e.preventDefault();
    items[next].focus();
    items[next].click();
  });
}

function setRadio(group, selected) {
  $$('[role="radio"]', group).forEach((b) => {
    const on = b === selected;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  });
}

/* Business details ------------------------------------------------------ */

function fillBusiness() {
  $$('[data-biz]').forEach((el) => {
    const v = BUSINESS[el.dataset.biz];
    if (v !== undefined) el.textContent = String(v);
  });
  const tel = 'tel:+1' + BUSINESS.phone.replace(/\D/g, '').slice(-10);
  $$('[data-biz-phone]').forEach((a) => { a.href = tel; });
  $('[data-areas]').innerHTML = BUSINESS.areas.map((a) => `<li>${escapeHtml(a)}</li>`).join('');
  $('[data-year]').textContent = new Date().getFullYear();

  const month = byCode[COLOR_OF_THE_MONTH];
  if (month) {
    const chip = $('[data-month-chip]');
    chip.style.setProperty('--month', month.hex);
    $('[data-month-name]').textContent = month.name;
    $('[data-month-code]').textContent = month.code;
  }

  const head = $('.site-head');
  const onScroll = () => head.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* Color studio ---------------------------------------------------------- */

const studio = {
  scene: 'room',
  surface: { room: 'walls', house: 'body' },
  colors: { room: { ...SCENES.room.start }, house: { ...SCENES.house.start } },
};

function initStudio() {
  // Palette swatches, in palette order.
  const palette = $('[data-palette]');
  palette.setAttribute('role', 'radiogroup');
  palette.setAttribute('aria-label', 'Paint color');
  palette.innerHTML = PALETTE.map((c) =>
    `<button type="button" class="swatch" role="radio" aria-checked="false" tabindex="-1"
      style="--sw:${c.hex};--mark:${lrv(c.hex) > 50 ? '#1f2a26' : '#fff'}" data-code="${c.code}"
      title="${escapeHtml(c.name)} · ${c.code}" aria-label="${escapeHtml(c.name)}, ${c.code}"></button>`).join('');
  palette.addEventListener('click', (e) => {
    const b = e.target.closest('.swatch');
    if (b) paint(studio.surface[studio.scene], b.dataset.code);
  });
  radioKeys(palette, 6);

  $$('[data-scene]').forEach((b) => b.addEventListener('click', () => showScene(b.dataset.scene)));
  radioKeys($('[data-scene]').parentElement);

  const surfaces = $('[data-surfaces]');
  surfaces.addEventListener('click', (e) => {
    const b = e.target.closest('[data-surface-btn]');
    if (b) pickSurface(b.dataset.surfaceBtn);
  });
  radioKeys(surfaces);

  $$('.scene .paint').forEach((g) => g.addEventListener('click', () => pickSurface(g.dataset.surface)));

  $('[data-schemes]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-scheme]');
    if (!b) return;
    const scheme = SCENES[studio.scene].schemes[Number(b.dataset.scheme)];
    applyScheme(scheme);
  });

  $('[data-shuffle]').addEventListener('click', () => {
    const list = SCENES[studio.scene].schemes;
    const current = JSON.stringify(studio.colors[studio.scene]);
    const options = list.filter((s) => JSON.stringify(s.colors) !== current);
    applyScheme(options[Math.floor(Math.random() * options.length)]);
  });

  $('[data-save-colors]').addEventListener('click', () => {
    request.colors = { scene: studio.scene, colors: { ...studio.colors[studio.scene] } };
    renderAttached();
    toast('Colors added to your walkthrough request');
  });

  $('[data-month-chip]').addEventListener('click', () => {
    showScene('room');
    pickSurface('walls');
    paint('walls', COLOR_OF_THE_MONTH);
  });

  showScene('room');
  for (const scene of Object.keys(SCENES)) applyColors(scene);
}

function applyScheme(scheme) {
  Object.assign(studio.colors[studio.scene], scheme.colors);
  applyColors(studio.scene);
  renderStudio();
  toast(`Scheme: ${scheme.name}`);
}

function showScene(scene) {
  studio.scene = scene;
  const def = SCENES[scene];
  // SVG elements have no .hidden property, so toggle the attribute itself.
  $$('[data-scene-svg]').forEach((svg) => svg.toggleAttribute('hidden', svg.dataset.sceneSvg !== scene));
  setRadio($('[data-scene]').parentElement, $(`[data-scene="${scene}"]`));
  // Built once per scene, so keyboard focus survives every repaint after.
  $('[data-surfaces]').innerHTML = def.surfaces.map((s) =>
    `<button type="button" role="radio" aria-checked="false" tabindex="-1" data-surface-btn="${s.key}">
      <span class="dot" aria-hidden="true"></span>${s.label}</button>`).join('');
  $('[data-schemes]').innerHTML = def.schemes.map((s, i) => {
    const bars = def.surfaces.map((sf) => `<span style="background:${byCode[s.colors[sf.key]].hex}"></span>`).join('');
    return `<button type="button" class="scheme" data-scheme="${i}"><i aria-hidden="true">${bars}</i>${escapeHtml(s.name)}</button>`;
  }).join('');
  renderStudio();
}

function pickSurface(key) {
  studio.surface[studio.scene] = key;
  renderStudio();
}

function paint(surface, code) {
  studio.colors[studio.scene][surface] = code;
  applyColors(studio.scene);
  renderStudio();
}

function applyColors(scene) {
  const svg = $(`[data-scene-svg="${scene}"]`);
  for (const [surface, code] of Object.entries(studio.colors[scene])) {
    svg.style.setProperty(`--c-${surface}`, byCode[code].hex);
  }
}

function renderStudio() {
  const scene = studio.scene;
  const def = SCENES[scene];
  const active = studio.surface[scene];
  const colors = studio.colors[scene];

  const group = $('[data-surfaces]');
  $$('[data-surface-btn]', group).forEach((b) => {
    $('.dot', b).style.setProperty('--dot', byCode[colors[b.dataset.surfaceBtn]].hex);
  });
  setRadio(group, $(`[data-surface-btn="${active}"]`, group));
  $$('.scene .paint').forEach((g) => {
    g.classList.toggle('is-active', g.closest('svg').dataset.sceneSvg === scene && g.dataset.surface === active);
  });

  const color = byCode[colors[active]];
  $('.picked').style.setProperty('--picked', color.hex);
  $('[data-picked-for]').textContent = def.surfaces.find((s) => s.key === active).label;
  $('[data-picked-name]').textContent = color.name;
  $('[data-picked-code]').textContent = color.code;
  $('[data-picked-lrv]').textContent = lrv(color.hex);
  $('[data-picked-note]').textContent = color.note;

  setRadio($('[data-palette]'), $(`.swatch[data-code="${color.code}"]`));

  $('[data-my-scheme]').innerHTML = def.surfaces.map((s) => {
    const c = byCode[colors[s.key]];
    return `<li><span class="s-name">${s.label}</span><i style="--c:${c.hex}"></i><b>${escapeHtml(c.name)}</b><code>${c.code}</code></li>`;
  }).join('');
}

/* Estimator ------------------------------------------------------------- */

const est = {
  tab: 'interior',
  rooms: Object.fromEntries(PRICING.interior.rooms.map((r) => [r.key, r.start || 0])),
  int: { walls: true, ceilings: false, trim: false },
  doors: 0,
  intCondition: 'good',
  colorChange: 'similar',
  extSize: 2000,
  stories: '2',
  siding: 'wood',
  extCondition: 'sound',
  ext: { frontDoor: false },
  shutters: 0,
  garage: 0,
  deck: 'none',
  fronts: 26,
  cabFinish: 'painted',
  cab: { island: false, hardware: false, interiors: false },
};

const STEPPER_MAX = { doors: 20, shutters: 12, garage: 3, room: 6 };

function stepperHtml(label, value, max) {
  return `<button type="button" data-step="-1" aria-label="One fewer ${label}" ${value <= 0 ? 'disabled' : ''}>−</button>` +
    `<output aria-live="polite">${value}</output>` +
    `<button type="button" data-step="1" aria-label="One more ${label}" ${value >= max ? 'disabled' : ''}>+</button>`;
}

function initEstimator() {
  // Rooms
  const rooms = $('[data-rooms]');
  const drawRooms = () => {
    rooms.innerHTML = PRICING.interior.rooms.map((r) => {
      const n = est.rooms[r.key];
      return `<div class="room${n ? ' is-on' : ''}" data-room="${r.key}">
        <div><b>${r.label}</b><small>${r.size}</small></div>
        <div class="stepper" role="group" aria-label="${r.label}">${stepperHtml(r.label.toLowerCase(), n, STEPPER_MAX.room)}</div>
      </div>`;
    }).join('');
  };
  drawRooms();
  rooms.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const key = b.closest('[data-room]').dataset.room;
    est.rooms[key] = Math.min(STEPPER_MAX.room, Math.max(0, est.rooms[key] + Number(b.dataset.step)));
    const focusStep = b.dataset.step;
    drawRooms();
    const again = $(`[data-room="${key}"] [data-step="${focusStep}"]`);
    (again.disabled ? $(`[data-room="${key}"] [data-step="${-focusStep}"]`) : again).focus();
    update();
  });

  // Plain steppers
  $$('[data-stepper]').forEach((box) => {
    const key = box.dataset.stepper;
    const label = { doors: 'door', shutters: 'pair of shutters', garage: 'garage door' }[key];
    const draw = () => { box.innerHTML = stepperHtml(label, est[key], STEPPER_MAX[key]); };
    draw();
    box.setAttribute('role', 'group');
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-step]');
      if (!b) return;
      est[key] = Math.min(STEPPER_MAX[key], Math.max(0, est[key] + Number(b.dataset.step)));
      const dir = b.dataset.step;
      draw();
      const again = $(`[data-step="${dir}"]`, box);
      (again.disabled ? $(`[data-step="${-dir}"]`, box) : again).focus();
      update();
    });
  });

  // Segmented choices
  const choices = {
    intCondition: PRICING.interior.condition,
    colorChange: PRICING.interior.colorChange,
    stories: PRICING.exterior.stories,
    siding: PRICING.exterior.siding,
    extCondition: PRICING.exterior.condition,
    deck: PRICING.exterior.deck,
    cabFinish: PRICING.cabinets.finish,
  };
  for (const [key, list] of Object.entries(choices)) {
    const group = $(`[data-radio="${key}"]`);
    group.innerHTML = list.map((o) =>
      `<button type="button" role="radio" aria-checked="${est[key] === o.key}" tabindex="${est[key] === o.key ? 0 : -1}" data-value="${o.key}">${o.label}${o.hint ? `<small>${o.hint}</small>` : ''}</button>`).join('');
    group.addEventListener('click', (e) => {
      const b = e.target.closest('[data-value]');
      if (!b) return;
      est[key] = b.dataset.value;
      setRadio(group, b);
      update();
    });
    radioKeys(group);
  }

  // Checkboxes
  $$('[data-int]').forEach((cb) => cb.addEventListener('change', () => { est.int[cb.dataset.int] = cb.checked; update(); }));
  $$('[data-ext]').forEach((cb) => cb.addEventListener('change', () => { est.ext[cb.dataset.ext] = cb.checked; update(); }));
  $$('[data-cab]').forEach((cb) => cb.addEventListener('change', () => { est.cab[cb.dataset.cab] = cb.checked; update(); }));

  // Sliders
  $$('[data-range]').forEach((input) => {
    input.addEventListener('input', () => { est[input.dataset.range] = Number(input.value); update(); });
  });

  // Tabs
  const tabs = $$('[role="tab"]');
  tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.tab)));
  $('.tabs').addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const t = tabs[(next + tabs.length) % tabs.length];
    t.focus();
    showTab(t.dataset.tab);
  });

  // "Price this" on the service chips
  $$('[data-price]').forEach((b) => b.addEventListener('click', () => {
    showTab(b.dataset.price);
    if (b.dataset.deck) {
      est.deck = b.dataset.deck;
      setRadio($('[data-radio="deck"]'), $(`[data-radio="deck"] [data-value="${b.dataset.deck}"]`));
      update();
    }
    $('#pricing').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    $(`#tab-${b.dataset.price}`).focus({ preventScroll: true });
  }));

  $('[data-book-estimate]').addEventListener('click', () => {
    const q = quote();
    request.estimate = { tab: est.tab, text: `${q.title} · ${money(q.low)}–${money(q.high)}`, lines: q.lines, low: q.low, high: q.high };
    setProject({ interior: 'Interior rooms', exterior: 'Exterior', cabinets: 'Kitchen cabinets' }[est.tab]);
    renderAttached();
    goToForm();
  });

  update();
}

function showTab(tab) {
  est.tab = tab;
  $$('[role="tab"]').forEach((t) => {
    const on = t.dataset.tab === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
  });
  $$('[role="tabpanel"]').forEach((p) => { p.hidden = p.id !== `panel-${tab}`; });
  update();
}

function quote() {
  const P = PRICING;
  const lines = [];
  let total = 0, hours = 0, gallons = 0, crew = 2, title = '', code = '', note = '';
  const pick = (list, key) => list.find((o) => o.key === key);

  if (est.tab === 'interior') {
    const I = P.interior;
    const cond = pick(I.condition, est.intCondition);
    const change = pick(I.colorChange, est.colorChange);
    let base = 0, roomCount = 0, wallArea = 0, ceilArea = 0, trimLf = 0, wallsCost = 0;
    const parts = ['walls', 'ceilings', 'trim'].filter((k) => est.int[k]);
    for (const r of I.rooms) {
      const n = est.rooms[r.key];
      if (!n) continue;
      roomCount += n;
      const f = r.factor || 1;
      let cost = 0;
      if (est.int.walls) { cost += r.walls * I.wallRate * f; wallArea += r.walls * n; wallsCost += r.walls * I.wallRate * f * n; }
      if (est.int.ceilings) { cost += r.ceiling * I.ceilingRate * f; ceilArea += r.ceiling * n; }
      if (est.int.trim) { cost += r.trim * I.trimRate; trimLf += r.trim * n; }
      cost *= n;
      if (cost) lines.push([`${r.label}${n > 1 ? ' × ' + n : ''}`, cost]);
      base += cost;
    }
    if (est.doors) {
      const d = est.doors * I.doorRate;
      lines.push([plural(est.doors, 'door'), d]);
      base += d;
    }
    total = base;
    if (cond.factor > 1 && base) {
      const extra = base * (cond.factor - 1);
      lines.push([cond.key === 'repair' ? 'Drywall repair and priming' : 'Patching and spot priming', extra]);
      total += extra;
    }
    if (change.factor > 1 && wallsCost) {
      const extra = wallsCost * (change.factor - 1);
      lines.push(['Third coat for the color change', extra]);
      total += extra;
    }
    const coats = change.coats;
    const area = wallArea * coats + ceilArea * 2;
    hours = (area / I.sqftPerHour + trimLf / 35 + est.doors * 0.9) * cond.factor * 1.3;
    gallons = (wallArea * coats + ceilArea * 2) / I.coverage + trimLf / 160 + est.doors * 0.15;
    crew = roomCount > 5 ? 3 : I.crew;
    code = `INT-${String(roomCount + est.doors).padStart(2, '0')}`;
    if (!roomCount && !est.doors) return { empty: 'Add a room or a door to see a price.', code, crew };
    if (!total) return { empty: 'Choose walls, ceilings or trim to see a price.', code, crew };
    if (total < I.minimum) { lines.push(['Minimum visit', I.minimum - total]); total = I.minimum; }
    const painted = roomCount && parts.length ? [plural(roomCount, 'room'), parts.join(', ')] : [];
    if (est.doors) painted.push(plural(est.doors, 'door'));
    title = ['Interior', ...painted].join(' · ');
    note = 'Final price after a free 30-minute walkthrough. No add-ons we did not write down first.';
  }

  if (est.tab === 'exterior') {
    const E = P.exterior;
    const stories = pick(E.stories, est.stories);
    const siding = pick(E.siding, est.siding);
    const cond = pick(E.condition, est.extCondition);
    const deck = pick(E.deck, est.deck);
    const body = est.extSize * E.ratePerSqft * stories.factor * siding.factor;
    lines.push([`Body & trim · ${est.extSize.toLocaleString('en-US')} sq ft, ${stories.label.toLowerCase()} ${stories.key === '1' ? 'story' : 'stories'}`, body]);
    total = body;
    if (cond.factor > 1) {
      const extra = body * (cond.factor - 1);
      lines.push(['Scraping, sanding and priming', extra]);
      total += extra;
    }
    if (est.ext.frontDoor) { lines.push(['Front door', E.frontDoor]); total += E.frontDoor; }
    if (est.shutters) { const s = est.shutters * E.shutterPair; lines.push([`Shutters × ${est.shutters} pairs`, s]); total += s; }
    if (est.garage) { const g = est.garage * E.garageDoor; lines.push([plural(est.garage, 'garage door'), g]); total += g; }
    if (deck.sqft) { const d = deck.sqft * E.deckRate; lines.push([`Deck stain · about ${deck.sqft} sq ft`, d]); total += d; }
    if (total < E.minimum) { lines.push(['Minimum visit', E.minimum - total]); total = E.minimum; }
    const area = est.extSize * 1.1;
    hours = (area * 2 / E.sqftPerHour) * stories.factor * cond.factor * 1.35 + deck.sqft / 60 + est.shutters * 0.6 + est.garage * 2.5;
    gallons = area * 2 / E.coverage * 1.15 + deck.sqft / 200 + (est.ext.frontDoor ? 0.25 : 0);
    crew = E.crew;
    title = `Exterior · ${est.extSize.toLocaleString('en-US')} sq ft`;
    code = `EXT-${stories.key}${siding.key[0].toUpperCase()}`;
    note = 'Final price after a free walkthrough. We only paint when it stays dry and above 50°F, so dates can move with the weather.';
  }

  if (est.tab === 'cabinets') {
    const C = P.cabinets;
    const finish = pick(C.finish, est.cabFinish);
    const fronts = est.fronts * C.perFront;
    lines.push([`${est.fronts} doors & drawers, shop sprayed`, fronts]);
    lines.push(['Frames, boxes and end panels', C.base]);
    total = fronts + C.base;
    if (finish.factor > 1) {
      const extra = total * (finish.factor - 1);
      lines.push([finish.key === 'stained' ? 'Deglossing and grain-sealing primer' : 'Bonding primer for laminate', extra]);
      total += extra;
    }
    if (est.cab.island) { lines.push(['Island in a second color', C.island]); total += C.island; }
    if (est.cab.hardware) { const h = est.fronts * C.hardwarePerFront; lines.push(['Holes filled for new hardware', h]); total += h; }
    if (est.cab.interiors) { const n = est.fronts * C.interiorsPerFront; lines.push(['Cabinet interiors', n]); total += n; }
    if (total < C.minimum) { lines.push(['Minimum visit', C.minimum - total]); total = C.minimum; }
    // Doors leave for the shop; days on site cover masking, frames and rehanging.
    hours = (16 + est.fronts * 0.35 + (est.cab.interiors ? est.fronts * 0.3 : 0)) * finish.factor;
    gallons = est.fronts / 12 + 1 + (est.cab.interiors ? est.fronts / 20 : 0);
    crew = C.crew;
    title = `Cabinets · ${est.fronts} fronts`;
    code = `CAB-${est.fronts}`;
    note = 'Days are time in your kitchen. Doors and drawers spend 3 to 4 more days in our shop, and the kitchen stays usable meanwhile.';
  }

  const days = Math.max(1, Math.ceil((hours / (crew * 8)) * 2) / 2);
  return {
    title, code, crew, lines, note,
    low: roundTo(total * P.rangeLow, P.roundTo),
    high: roundTo(total * P.rangeHigh, P.roundTo),
    days,
    gallons: Math.max(1, Math.ceil(gallons)),
  };
}

function update() {
  // Slider readouts and fills
  $$('[data-range]').forEach((input) => {
    const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty('--fill', pct + '%');
    const out = $(`[data-out="${input.dataset.range}"]`);
    out.textContent = input.dataset.range === 'extSize' ? `${Number(input.value).toLocaleString('en-US')} sq ft` : input.value;
  });

  const q = quote();
  $('[data-ticket-code]').textContent = q.code;
  $('[data-included]').innerHTML = PRICING[est.tab].included.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  $('[data-crew]').textContent = plural(q.crew, 'painter');
  const book = $('[data-book-estimate]');
  if (q.empty) {
    $('[data-price-low]').textContent = '$—';
    $('[data-price-high]').textContent = '$—';
    $('[data-days]').textContent = '—';
    $('[data-gallons]').textContent = '—';
    $('[data-lines]').innerHTML = `<li class="is-note"><span>${q.empty}</span></li>`;
    book.disabled = true;
    return;
  }
  book.disabled = false;
  $('[data-ticket-note]').textContent = q.note;
  $('[data-price-low]').textContent = money(q.low);
  $('[data-price-high]').textContent = money(q.high);
  $('[data-days]').textContent = `${q.days} ${q.days === 1 ? 'day' : 'days'}`;
  $('[data-gallons]').textContent = `~${q.gallons} gal`;
  $('[data-lines]').innerHTML = q.lines.map(([label, amount]) =>
    `<li><span>${escapeHtml(label)}</span><span>${money(amount)}</span></li>`).join('');
}

/* Recent work filter ---------------------------------------------------- */

function initWork() {
  const buttons = $$('[data-filter]');
  buttons.forEach((b) => b.addEventListener('click', () => {
    const kind = b.dataset.filter;
    buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    $$('[data-work] .project').forEach((p) => {
      const show = kind === 'all' || p.dataset.kind === kind;
      p.hidden = !show;
      p.classList.remove('is-in');
      if (show) { void p.offsetWidth; p.classList.add('is-in'); }
    });
  }));
}

/* Walkthrough request ---------------------------------------------------- */

const request = { estimate: null, colors: null };

function setProject(value) {
  const select = $('[data-request] [name="project"]');
  if ([...select.options].some((o) => o.value === value)) select.value = value;
}

function goToForm() {
  $('#estimate').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  $('[data-request] [name="name"]').focus({ preventScroll: true });
}

function colorsText(saved, withCodes) {
  const surfaces = SCENES[saved.scene].surfaces;
  return surfaces.map((s) => {
    const c = byCode[saved.colors[s.key]];
    return `${s.label}: ${c.name}${withCodes ? ` (${c.code})` : ''}`;
  });
}

function renderAttached() {
  const box = $('[data-attached]');
  const e = request.estimate, c = request.colors;
  box.hidden = !e && !c;
  $('[data-attached-estimate]').hidden = !e;
  $('[data-attached-colors]').hidden = !c;
  if (e) $('[data-attached-estimate-text]').textContent = e.text;
  if (c) {
    const surfaces = SCENES[c.scene].surfaces;
    $('[data-attached-colors-text]').innerHTML = surfaces.map((s) => {
      const col = byCode[c.colors[s.key]];
      return `<span><i style="--c:${col.hex}"></i>${s.label}: ${escapeHtml(col.name)}</span>`;
    }).join('');
  }
}

function initRequest() {
  const form = $('[data-request]');
  const error = $('[data-form-error]');

  $$('[data-project]').forEach((a) => a.addEventListener('click', () => setProject(a.dataset.project)));
  $$('[data-remove]').forEach((b) => b.addEventListener('click', () => {
    request[b.dataset.remove] = null;
    renderAttached();
    form.elements.name.focus();
  }));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = form.elements;
    const data = {
      name: f.name.value.trim(),
      phone: f.phone.value.trim(),
      email: f.email.value.trim(),
      address: f.address.value.trim(),
      project: f.project.value,
      timing: f.timing.value,
      message: f.message.value.trim(),
    };
    [f.name, f.phone, f.email].forEach((el) => el.removeAttribute('aria-invalid'));
    const problems = [];
    if (!data.name) { problems.push('your name'); f.name.setAttribute('aria-invalid', 'true'); }
    const phoneOk = data.phone.replace(/\D/g, '').length >= 7;
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
    if (data.phone && !phoneOk) { problems.push('a full phone number'); f.phone.setAttribute('aria-invalid', 'true'); }
    if (data.email && !emailOk) { problems.push('a valid email'); f.email.setAttribute('aria-invalid', 'true'); }
    if (!data.phone && !data.email) {
      problems.push('a phone number or email so we can reach you');
      f.phone.setAttribute('aria-invalid', 'true');
    }
    if (problems.length) {
      error.textContent = `Please add ${problems.join(', ')}.`;
      error.hidden = false;
      form.querySelector('[aria-invalid="true"]').focus();
      return;
    }
    error.hidden = true;

    const extras = [];
    if (request.estimate) {
      extras.push(`Estimate: ${request.estimate.text}`);
      request.estimate.lines.forEach(([label, amount]) => extras.push(`  - ${label}: ${money(amount)}`));
    }
    if (request.colors) extras.push('Colors: ' + colorsText(request.colors, true).join('; '));
    const payload = { ...data, estimate: request.estimate && request.estimate.text, colors: request.colors && colorsText(request.colors, true) };

    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      if (BUSINESS.formEndpoint) {
        const res = await fetch(BUSINESS.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Request failed');
        $('[data-sent-text]').textContent = 'A painter will call or text within one business day to pick a walkthrough time.';
      } else {
        const body = [
          `Name: ${data.name}`,
          data.phone && `Phone: ${data.phone}`,
          data.email && `Email: ${data.email}`,
          data.address && `Address: ${data.address}`,
          `Project: ${data.project}`,
          `Timing: ${data.timing}`,
          ...extras,
          data.message && `\n${data.message}`,
        ].filter(Boolean).join('\n');
        const subject = `Walkthrough request: ${data.project} (${data.name})`;
        window.location.href = `mailto:${BUSINESS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        $('[data-sent-text]').textContent = `Your email app should open with everything filled in. Just press send. If it does not, call or text ${BUSINESS.phone}.`;
      }
      $('[data-sent-name]').textContent = data.name.split(' ')[0];
      const sent = $('[data-sent]');
      sent.hidden = false;
      sent.focus();
    } catch (err) {
      error.textContent = `We could not send that. Please try again, or call ${BUSINESS.phone}.`;
      error.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });

  $('[data-sent-reset]').addEventListener('click', () => {
    form.reset();
    request.estimate = null;
    request.colors = null;
    renderAttached();
    $('[data-sent]').hidden = true;
    form.elements.name.focus();
  });
}

fillBusiness();
initStudio();
initEstimator();
initWork();
initRequest();
