// Slatewright Roofing: the roof estimator and its drawing, the storm check,
// the project filter and the inspection request. Everything a roofer would
// change (contact details, prices, materials, colors, storm signs) is plain
// data at the top of this file; the code below only reads it.

const BUSINESS = {
  name: 'Slatewright Roofing Co.',
  phone: '(312) 555-0148', // also written in index.html
  phoneHref: 'tel:+13125550148',
  email: 'hello@slatewright.example',
  // Where inspection requests go. Leave empty and the visitor's email app
  // opens with the request written out, addressed to `email`. Or set the URL
  // of a form service that accepts a JSON POST (Formspree, Basin, your own).
  formEndpoint: '',
};

// Installed price per square (100 sq ft of roof surface), low and high, before
// pitch, height and shape labor. squaresPerDay is one crew on a simple roof.
const MATERIALS = [
  {
    id: 'architectural',
    name: 'Architectural shingle',
    short: 'Architectural',
    blurb: 'Laminated asphalt, rated for 130 mph wind. The everyday standard.',
    perSquare: [440, 560],
    squaresPerDay: 20,
    warranty: '50-yr material · 15-yr labor',
    texture: 'shingle',
    colors: [
      { name: 'Weathered Wood', hex: '#7b6c5b' },
      { name: 'Charcoal', hex: '#3d4043' },
      { name: 'Pewter Gray', hex: '#7c8186' },
      { name: 'Hickory', hex: '#6b4a33' },
      { name: 'Hunter Green', hex: '#3f5646' },
      { name: 'Driftwood', hex: '#9a8f80' },
    ],
  },
  {
    id: 'impact',
    name: 'Class 4 impact shingle',
    short: 'Class 4 impact',
    blurb: 'Rubberized asphalt rated for 2-inch hail. Many insurers discount it.',
    perSquare: [560, 720],
    squaresPerDay: 18,
    warranty: '50-yr material · 15-yr labor',
    texture: 'impact',
    colors: [
      { name: 'Barkwood', hex: '#5b4535' },
      { name: 'Slate Blend', hex: '#50565c' },
      { name: 'Onyx', hex: '#2b2d30' },
      { name: 'Sierra Gray', hex: '#8a8a85' },
      { name: 'Autumn Brown', hex: '#7a5236' },
    ],
  },
  {
    id: 'metal',
    name: 'Standing-seam metal',
    short: 'Standing seam',
    blurb: '24-gauge steel with concealed fasteners. Built for fifty years and up.',
    perSquare: [1050, 1400],
    squaresPerDay: 8,
    warranty: '40-yr finish · 15-yr labor',
    texture: 'metal',
    colors: [
      { name: 'Galvalume', hex: '#aeb3b5' },
      { name: 'Charcoal', hex: '#474c51' },
      { name: 'Matte Black', hex: '#26282a' },
      { name: 'Colonial Red', hex: '#7b2f2a' },
      { name: 'Evergreen', hex: '#2f4a3b' },
      { name: 'Copper Penny', hex: '#a35d36' },
    ],
  },
  {
    id: 'slate',
    name: 'Synthetic slate',
    short: 'Synthetic slate',
    blurb: 'The look of real slate at a quarter of the weight. Class A fire rated.',
    perSquare: [1150, 1550],
    squaresPerDay: 7,
    warranty: '50-yr material · 15-yr labor',
    texture: 'slate',
    colors: [
      { name: 'Vermont Gray', hex: '#5c6367' },
      { name: 'Plum Slate', hex: '#4e4450' },
      { name: 'Weathered Green', hex: '#5a6a5c' },
      { name: 'Midnight', hex: '#2c3035' },
    ],
  },
];

// waste: extra material for cuts, as a share of the roof. labor: extra labor.
const SHAPES = {
  gable: { name: 'gable', waste: 0.10, labor: 0 },
  hip: { name: 'hip', waste: 0.13, labor: 0.04 },
  complex: { name: 'cut-up', waste: 0.17, labor: 0.10 },
};

const PRICING = {
  overhang: 1.06, // eaves and rakes reach past the walls
  tearOffPerLayer: [95, 135], // per square, per layer removed
  permitAndDisposal: [450, 750], // permit, dumpster and haul-away, per job
  // Extra labor on steep roofs, by the lowest pitch each applies to.
  steepness: [
    { from: 11, add: 0.32 },
    { from: 9, add: 0.20 },
    { from: 7, add: 0.10 },
  ],
  height: { 1: 0, 2: 0.05, 3: 0.12 }, // extra labor by stories
};

const pitchWord = (p) => (p <= 4 ? 'low slope' : p <= 6 ? 'standard' : p <= 8 ? 'steep' : 'very steep');

// The storm check. level 3 = call now, 2 = inspect this week, 1 = low urgency.
const STORM_SIGNS = [
  { id: 'drip', text: 'Water dripping inside right now', level: 3 },
  { id: 'hole', text: 'A hole, a missing section or a tree limb on the roof', level: 3 },
  { id: 'stain', text: 'A new stain on a ceiling or in the attic', level: 2 },
  { id: 'missing', text: 'Shingles in the yard or bare patches on the roof', level: 2 },
  { id: 'granules', text: 'Piles of grit at the bottom of the downspouts', level: 2 },
  { id: 'dents', text: 'Hail dents in gutters, vents or the mailbox', level: 2 },
  { id: 'flashing', text: 'Metal flashing pulled away at the chimney or a wall', level: 2 },
  { id: 'lifted', text: 'A few shingles lifted, curled or creased', level: 1 },
];

const VERDICTS = {
  0: {
    status: 'Nothing checked yet',
    title: 'Tick what you can see',
    text: 'Look from the yard, with binoculars if you have them, then check the attic with a flashlight. Stay off the roof: wet shingles and loose debris are how storm injuries happen.',
    action: null,
  },
  1: {
    status: 'Low urgency',
    title: 'Worth a look this month',
    text: 'Lifted shingles can reseal in warm weather, but a creased tab usually tears off in the next strong wind. A free check takes about 30 minutes.',
    action: 'book',
  },
  2: {
    status: 'Inspect this week',
    title: 'Get it documented now',
    text: 'Damage like this lets water in on the next storm, and most policies want a claim filed promptly. We photograph every slope and write a report you can hand your insurer.',
    action: 'book',
  },
  3: {
    status: 'Emergency',
    title: 'Call now. Tarp today.',
    text: 'Set a bucket under drips, move what you can and switch off lights under a wet ceiling. Our storm line answers 24/7, and a crew tarps anywhere in the county within four hours.',
    action: 'call',
  },
};

const SERVICE_NAMES = {
  inspection: 'Free roof inspection',
  storm: 'Storm or hail damage',
  repair: 'Leak or repair',
  replacement: 'Replacement quote',
  metal: 'Metal roof quote',
  gutters: 'Gutters & ventilation',
};

// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const roundTo = (n, step) => Math.round(n / step) * step;
const range = ([lo, hi], step = 10) => `${money(roundTo(lo, step))} – ${money(roundTo(hi, step))}`;
const shortMoney = (n) => (n >= 1000 ? `$${(n / 1000).toFixed(n >= 100000 ? 0 : 1)}k` : money(n));
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// Header: a solid bar once the page scrolls, and a menu on small screens

const header = $('.site-header');
const menuButton = $('.menu-toggle');
const nav = $('#site-nav');
const updateHeader = () => header.classList.toggle('is-stuck', window.scrollY > 160);
window.addEventListener('scroll', updateHeader, { passive: true });
updateHeader();

function setMenu(open) {
  nav.classList.toggle('is-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
}
menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
nav.addEventListener('click', (ev) => { if (ev.target.closest('a')) setMenu(false); });
document.addEventListener('click', (ev) => { if (!header.contains(ev.target)) setMenu(false); });
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && nav.classList.contains('is-open')) {
    setMenu(false);
    menuButton.focus();
  }
});

// ---------------------------------------------------------------------------
// Hero photos: a slow crossfade with numbered buttons and a pause button

const slides = $$('.hero-slide');
const dots = $$('.pager-dot');
const playButton = $('.pager-play');
let slide = 0;
let slideTimer = null;
let paused = reduceMotion;

function showSlide(i) {
  slide = (i + slides.length) % slides.length;
  slides.forEach((s, k) => s.classList.toggle('is-active', k === slide));
  dots.forEach((d, k) => d.setAttribute('aria-pressed', String(k === slide)));
}
function scheduleSlides() {
  clearInterval(slideTimer);
  if (!paused) slideTimer = setInterval(() => showSlide(slide + 1), 6500);
}
function setPaused(value) {
  paused = value;
  playButton.toggleAttribute('data-paused', value);
  playButton.setAttribute('aria-label', value ? 'Play the slideshow' : 'Pause the slideshow');
  scheduleSlides();
}
dots.forEach((dot, k) => dot.addEventListener('click', () => { showSlide(k); scheduleSlides(); }));
playButton.addEventListener('click', () => setPaused(!paused));
setPaused(paused);

// ---------------------------------------------------------------------------
// Estimator

const estForm = $('#est-form');
const state = {
  material: MATERIALS[0].id,
  colorIndex: Object.fromEntries(MATERIALS.map((m) => [m.id, 0])),
  touched: false,
};
let announceTimer;
const materialById = (id) => MATERIALS.find((m) => m.id === id) || MATERIALS[0];

function renderMaterials() {
  $('#materials').innerHTML = MATERIALS.map((m) => `
    <label class="material">
      <input type="radio" name="material" value="${m.id}"${m.id === state.material ? ' checked' : ''}>
      <span class="material-card">
        <strong>${esc(m.name)}</strong>
        <small>${esc(m.blurb)}</small>
        <em>${money(m.perSquare[0])}–${m.perSquare[1].toLocaleString('en-US')} / square</em>
      </span>
    </label>`).join('');
}

function renderSwatches() {
  const m = materialById(state.material);
  const current = state.colorIndex[m.id];
  $('#swatches').innerHTML = m.colors.map((c, i) => `
    <label class="swatch" title="${esc(c.name)}">
      <input type="radio" name="color" value="${i}" aria-label="${esc(c.name)}"${i === current ? ' checked' : ''}>
      <span style="background-color:${c.hex}"></span>
    </label>`).join('');
  $('#color-name').textContent = m.colors[current].name;
}

function readInputs() {
  const fd = new FormData(estForm);
  return {
    footprint: Number(fd.get('footprint')),
    stories: Number(fd.get('stories')),
    shape: String(fd.get('shape')),
    pitch: Number(fd.get('pitch')),
    layers: Number(fd.get('layers')),
  };
}

function estimate(s, material) {
  const pitchFactor = Math.sqrt(1 + (s.pitch / 12) ** 2);
  const shape = SHAPES[s.shape];
  const squares = (s.footprint * PRICING.overhang * pitchFactor * (1 + shape.waste)) / 100;
  const steep = PRICING.steepness.find((x) => s.pitch >= x.from);
  const extra = (steep ? steep.add : 0) + PRICING.height[s.stories] + shape.labor;
  const base = material.perSquare.map((p) => squares * p);
  const labor = base.map((b) => b * extra);
  const tearOff = PRICING.tearOffPerLayer.map((p) => squares * p * s.layers);
  const fixed = PRICING.permitAndDisposal;
  const total = [0, 1].map((i) => roundTo(base[i] + labor[i] + tearOff[i] + fixed[i], 100));
  const days = Math.max(1, Math.ceil((squares * (1 + extra)) / material.squaresPerDay + (s.layers - 1) * 0.5));
  return { squares, extra, base, labor, tearOff, fixed, total, days };
}

function updateEstimate() {
  const s = readInputs();
  const m = materialById(state.material);
  const color = m.colors[state.colorIndex[m.id]];
  const e = estimate(s, m);

  for (const input of $$('input[type=range]', estForm)) {
    input.style.setProperty('--fill', `${((input.value - input.min) / (input.max - input.min)) * 100}%`);
  }
  $('#out-footprint').textContent = `${s.footprint.toLocaleString('en-US')} sq ft`;
  $('#out-pitch').textContent = `${s.pitch}/12 · ${pitchWord(s.pitch)}`;

  $('#price').textContent = `${money(e.total[0])} – ${money(e.total[1])}`;
  $('#f-squares').textContent = e.squares.toFixed(1);
  $('#f-days').textContent = e.days === 1 ? '1 day' : `${e.days} days`;
  $('#f-warranty').textContent = m.warranty;

  const rows = [
    [`${m.name}, ${e.squares.toFixed(1)} squares`, range(e.base)],
    e.extra > 0 && [`Labor for ${s.pitch}/12 pitch, ${s.stories} ${s.stories === 1 ? 'story' : 'stories'}, ${SHAPES[s.shape].name} roof`, '+ ' + range(e.labor)],
    [`Tear-off, ${s.layers} ${s.layers === 1 ? 'layer' : 'layers'} to the deck`, range(e.tearOff)],
    ['Permit, dumpster and disposal', range(e.fixed)],
  ].filter(Boolean);
  $('#breakdown').innerHTML = rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join('');

  const all = MATERIALS.map((mat) => ({ mat, total: estimate(s, mat).total }));
  const max = Math.max(...all.map((a) => a.total[1])) * 1.02;
  $('#compare').innerHTML = all.map(({ mat, total }) => `
    <li>
      <button type="button" class="compare-row" data-material="${mat.id}" aria-pressed="${mat.id === m.id}"
        title="${esc(mat.name)}: ${money(total[0])} – ${money(total[1])}">
        <span class="compare-name">${esc(mat.short)}</span>
        <span class="compare-track" aria-hidden="true"><span class="compare-bar" style="left:${(total[0] / max) * 100}%;width:${((total[1] - total[0]) / max) * 100}%"></span></span>
        <span class="compare-val">${shortMoney(total[0])}–${shortMoney(total[1])}</span>
      </button>
    </li>`).join('');

  drawHouse(s, m, color, e);
  updateAttachment(s, m, color, e);

  // Announce the new price once a slider settles, not on every step.
  clearTimeout(announceTimer);
  if (state.touched) announceTimer = setTimeout(() => {
    $('#price-live').textContent = `Estimated ${money(e.total[0])} to ${money(e.total[1])} for ${m.name.toLowerCase()}.`;
  }, 700);
}

function selectMaterial(id) {
  state.material = materialById(id).id;
  const radio = $(`input[name=material][value="${state.material}"]`, estForm);
  if (radio) radio.checked = true;
  renderSwatches();
  updateEstimate();
}

estForm.addEventListener('input', (ev) => {
  state.touched = true;
  if (ev.target.name === 'material') {
    selectMaterial(ev.target.value);
    return;
  }
  if (ev.target.name === 'color') {
    state.colorIndex[state.material] = Number(ev.target.value);
    $('#color-name').textContent = materialById(state.material).colors[state.colorIndex[state.material]].name;
  }
  updateEstimate();
});
estForm.addEventListener('submit', (ev) => ev.preventDefault());

$('#compare').addEventListener('click', (ev) => {
  const row = ev.target.closest('[data-material]');
  if (!row) return;
  state.touched = true;
  selectMaterial(row.dataset.material);
  const next = $(`#compare [data-material="${row.dataset.material}"]`);
  if (next) next.focus();
});

// The quick price card under the hero fills in the estimator and jumps to it.

$('#q-material').innerHTML = MATERIALS.map((m) => `<option value="${m.id}">${esc(m.name)}</option>`).join('');
$('#quick-form').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const input = $('#q-footprint');
  const footprint = Math.min(4000, Math.max(800, Math.round((Number(input.value) || 2000) / 50) * 50));
  input.value = footprint;
  $('#footprint').value = footprint;
  const stories = $(`input[name=stories][value="${$('#q-stories').value}"]`, estForm);
  if (stories) stories.checked = true;
  state.touched = true;
  selectMaterial($('#q-material').value);
  $('#estimate').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  $('#estimate-title').focus({ preventScroll: true });
});

// ---------------------------------------------------------------------------
// The house drawing: a front elevation that follows the inputs. Shapes are
// placed in a 600 x 470 space; the viewBox then zooms to fit the house.

const G = { width: 600, bottom: 470, cx: 300, ground: 418, halfW: 150, story: 70, eave: 16, hipRun: 112 };

function drawHouse(s, m, color, e) {
  const { cx, ground, halfW, story, eave } = G;
  const slope = s.pitch / 12;
  const top = ground - s.stories * story; // top of the walls, where the eaves sit
  const left = cx - halfW - eave;
  const right = cx + halfW + eave;
  const out = [];

  // The roof outline and the height of its surface at any x.
  let roof;
  let rise;
  let ridgeHalf;
  if (s.shape === 'gable') {
    rise = (halfW + eave) * slope;
    ridgeHalf = 0;
    roof = `M${left} ${top}L${cx} ${top - rise}L${right} ${top}Z`;
  } else {
    rise = G.hipRun * slope;
    ridgeHalf = halfW + eave - G.hipRun;
    roof = `M${left} ${top}L${cx - ridgeHalf} ${top - rise}L${cx + ridgeHalf} ${top - rise}L${right} ${top}Z`;
  }
  const surfaceY = (x) => {
    const d = Math.max(0, Math.abs(x - cx) - ridgeHalf);
    return top - rise + d * slope;
  };
  const chX = cx - 112;
  const chTop = Math.min(surfaceY(chX + 22), surfaceY(chX)) - 26;

  // Frame the house: zoom in on a low house, out on a tall one, keeping the
  // bottom edge and the aspect ratio fixed so the layout never jumps.
  const H = Math.max(360, G.bottom - (Math.min(top - rise, chTop) - 96));
  const W = (H * G.width) / G.bottom;
  const x0 = cx - W / 2;
  const y0 = G.bottom - H;
  $('#house').setAttribute('viewBox', `${x0} ${y0} ${W} ${H}`);
  const edgeL = x0 + 22;
  const edgeR = x0 + W - 22;

  // Ground, walls, siding, windows and the door.
  out.push(`<rect x="${edgeL}" y="${ground}" width="${edgeR - edgeL}" height="12" fill="url(#tex-ground)"/>`);
  out.push(`<path class="outline" d="M${edgeL} ${ground}H${edgeR}"/>`);
  out.push(`<rect class="wall" x="${cx - halfW}" y="${top}" width="${halfW * 2}" height="${ground - top}"/>`);
  for (let y = top + 10; y < ground; y += 10) {
    out.push(`<path d="M${cx - halfW + 1} ${y}H${cx + halfW - 1}" stroke="#15191c" stroke-opacity=".07"/>`);
  }
  for (let f = 0; f < s.stories; f++) {
    const floor = ground - f * story;
    if (f > 0) out.push(`<path class="trim" d="M${cx - halfW} ${floor}H${cx + halfW}"/>`);
    for (const dx of [-96, 0, 96]) {
      if (f === 0 && dx === 0) {
        out.push(`<rect class="wall" x="${cx - 17}" y="${floor - 58}" width="34" height="58"/>`);
        out.push(`<rect class="glass" x="${cx - 10}" y="${floor - 51}" width="20" height="14"/>`);
        out.push(`<circle cx="${cx + 10}" cy="${floor - 28}" r="2" fill="#15191c"/>`);
        continue;
      }
      const x = cx + dx - 18;
      const y = floor - 54;
      out.push(`<rect class="glass" x="${x}" y="${y}" width="36" height="40"/>`);
      out.push(`<path class="trim" d="M${x + 18} ${y}V${y + 40}M${x} ${y + 20}H${x + 36}M${x - 4} ${y + 42}H${x + 40}"/>`);
    }
  }

  // Shrubs either side of the door.
  for (const bx of [cx - 128, cx + 128]) {
    out.push(`<path d="M${bx - 26} ${ground}a26 20 0 0 1 52 0Z" fill="#7d8d6f" stroke="#1b2126" stroke-width="1.5"/>`);
  }

  // Chimney, drawn first so the roof covers its base.
  out.push(`<rect class="brick" x="${chX}" y="${chTop}" width="22" height="${surfaceY(chX) - chTop + 2}"/>`);
  out.push(`<rect x="${chX - 3}" y="${chTop - 5}" width="28" height="6" fill="#38424a"/>`);

  // The roof: color, then the material's texture, then the edge.
  out.push(`<path d="${roof}" fill="${color.hex}"/>`);
  out.push(`<path d="${roof}" fill="url(#tex-${m.texture})"/>`);
  out.push(`<path class="roof-edge" d="${roof}"/>`);

  // Cut-up roofs get a cross gable (two valleys) and, when there is room, a dormer.
  if (s.shape === 'complex') {
    const gHalf = 70;
    const gx = cx - 80;
    const gRise = gHalf * slope;
    const g = `M${gx - gHalf} ${top}L${gx} ${top - gRise}L${gx + gHalf} ${top}Z`;
    out.push(`<path d="${g}" fill="${color.hex}"/><path d="${g}" fill="url(#tex-${m.texture})"/><path class="roof-edge" d="${g}"/>`);
    const dx = cx + 78;
    const base = top - rise * 0.22;
    const wallH = Math.min(30, rise * 0.4);
    const dRise = 24 * slope;
    if (base - wallH - dRise > top - rise + 4) {
      out.push(`<rect class="wall" x="${dx - 20}" y="${base - wallH}" width="40" height="${wallH}"/>`);
      out.push(`<rect class="glass" x="${dx - 11}" y="${base - wallH + 5}" width="22" height="${Math.max(8, wallH - 10)}"/>`);
      const d = `M${dx - 24} ${base - wallH}L${dx} ${base - wallH - dRise}L${dx + 24} ${base - wallH}Z`;
      out.push(`<path d="${d}" fill="${color.hex}"/><path d="${d}" fill="url(#tex-${m.texture})"/><path class="roof-edge" d="${d}"/>`);
    }
  }

  // Fascia along the eave.
  out.push(`<rect x="${left}" y="${top}" width="${right - left}" height="6" fill="#1b2126"/>`);

  // Pitch symbol on the right slope: 12 across, the rise down to the roof line.
  const ex = right;
  const px = cx + ridgeHalf;
  const ax = px + (ex - px) * 0.42;
  const ay = surfaceY(ax);
  const run = 42;
  const drop = run * slope;
  out.push(`<path class="dim" d="M${ax} ${ay - 8}H${ax + run}V${ay + drop - 8}"/>`);
  out.push(`<text class="dim-text" x="${ax + run / 2}" y="${ay - 14}" text-anchor="middle">12</text>`);
  out.push(`<text class="dim-text" x="${ax + run + 7}" y="${ay + drop / 2 - 4}">${s.pitch}</text>`);

  // Callout naming the material and color, with a leader to the roof.
  const ty = y0 + 34;
  const labelW = Math.max(m.name.length, color.name.length) * 8.6 + 8;
  const lx = cx - 40;
  const ly = surfaceY(lx) + (top - surfaceY(lx)) * 0.45;
  out.push(`<path class="dim" d="M${lx} ${ly}L${edgeL + labelW} ${ty + 8}H${edgeL}"/><circle cx="${lx}" cy="${ly}" r="3.5" fill="#a34e24"/>`);
  out.push(`<text x="${edgeL}" y="${ty}">${esc(m.name.toUpperCase())}</text>`);
  out.push(`<text x="${edgeL}" y="${ty + 26}" class="dim-text">${esc(color.name.toUpperCase())}</text>`);

  // Roof area, top right.
  out.push(`<text x="${edgeR}" y="${ty}" text-anchor="end">ROOF SURFACE</text>`);
  out.push(`<text x="${edgeR}" y="${ty + 26}" text-anchor="end" class="dim-text">${e.squares.toFixed(1)} SQUARES</text>`);

  // Footprint dimension under the house.
  const dy = ground + 30;
  const wl = cx - halfW;
  const wr = cx + halfW;
  out.push(`<path class="dim" d="M${wl} ${dy}H${wr}M${wl} ${dy - 8}V${dy + 8}M${wr} ${dy - 8}V${dy + 8}M${wl - 5} ${dy + 5}l10 -10M${wr - 5} ${dy + 5}l10 -10"/>`);
  out.push(`<rect x="${cx - 92}" y="${dy - 10}" width="184" height="20" fill="#f9f7f2"/>`);
  out.push(`<text class="dim-text" x="${cx}" y="${dy + 5}" text-anchor="middle">${s.footprint.toLocaleString('en-US')} SQ FT FOOTPRINT</text>`);

  $('#scene').innerHTML = out.join('');
  $('#house-desc').textContent =
    `A ${s.stories}-story house with a ${SHAPES[s.shape].name} roof at ${s.pitch}/12 pitch in ${m.name.toLowerCase()}, color ${color.name}.`;
}

// ---------------------------------------------------------------------------
// Storm check

const signsEl = $('#signs');
signsEl.innerHTML = STORM_SIGNS.map((sign) => `
  <label class="sign">
    <input type="checkbox" name="sign" value="${sign.id}">
    <span class="sign-card">${esc(sign.text)}</span>
  </label>`).join('');

const LEVEL_ICONS = {
  0: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg>',
  1: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
  2: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  3: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17v.5"/></svg>',
};

const checkedSigns = () => $$('input[name=sign]:checked', signsEl).map((i) => STORM_SIGNS.find((s) => s.id === i.value));

function updateVerdict() {
  const signs = checkedSigns();
  const level = signs.reduce((n, s) => Math.max(n, s.level), 0);
  const v = VERDICTS[level];
  let action = '';
  if (v.action === 'call') {
    action = `<a class="btn btn-copper btn-lg" href="${BUSINESS.phoneHref}">Call ${esc(BUSINESS.phone)}</a>
      <p class="verdict-count" style="margin-top:14px">Or <a href="#book" data-book-storm>book a storm inspection</a> once it's safe.</p>`;
  } else if (v.action === 'book') {
    action = '<a class="btn btn-copper btn-lg" href="#book" data-book-storm>Book a free storm inspection</a>';
  }
  const verdict = $('#verdict');
  verdict.dataset.level = String(level);
  verdict.innerHTML = `
    <p class="verdict-status">${LEVEL_ICONS[level]}${esc(v.status)}</p>
    <h3>${esc(v.title)}</h3>
    <p>${esc(v.text)}</p>
    ${signs.length ? `<p class="verdict-count">${signs.length} ${signs.length === 1 ? 'sign' : 'signs'} noted</p>` : ''}
    ${action}`;
}
signsEl.addEventListener('change', updateVerdict);
updateVerdict();

$('#verdict').addEventListener('click', (ev) => {
  if (!ev.target.closest('[data-book-storm]')) return;
  const signs = checkedSigns();
  setService('storm');
  if (signs.length) {
    const notes = $('#b-notes');
    const line = `From the storm check: ${signs.map((s) => s.text.toLowerCase()).join('; ')}.`;
    if (!notes.value.includes('From the storm check:')) notes.value = notes.value ? `${notes.value}\n${line}` : line;
  }
});

// ---------------------------------------------------------------------------
// Links that preset the estimator or the request form

function setService(id) {
  const select = $('#b-service');
  if (select && SERVICE_NAMES[id]) select.value = id;
}

document.addEventListener('click', (ev) => {
  const link = ev.target.closest('a[data-service], a[data-material]');
  if (!link) return;
  if (link.dataset.service) setService(link.dataset.service);
  if (link.dataset.material) {
    state.touched = true;
    selectMaterial(link.dataset.material);
  }
});

$('#lock-estimate').addEventListener('click', () => {
  state.touched = true;
  setService(state.material === 'metal' ? 'metal' : 'replacement');
  $('#attach-estimate').checked = true;
  updateEstimate();
});

// ---------------------------------------------------------------------------
// Project filter

$$('.chips .chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const kind = chip.dataset.filter;
    $$('.chips .chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    $$('#projects .project').forEach((p) => { p.hidden = kind !== 'all' && p.dataset.kind !== kind; });
  });
});

// ---------------------------------------------------------------------------
// Inspection request

const bookForm = $('#book-form');
const bookDone = $('#book-done');
const status = $('#form-status');
let estimateSummary = '';

function updateAttachment(s, m, color, e) {
  estimateSummary = `${m.name}, ${color.name} · ${e.squares.toFixed(1)} squares at ${s.pitch}/12 · ${money(e.total[0])} – ${money(e.total[1])}`;
  $('#attach-summary').textContent = estimateSummary;
  $('#attach-wrap').hidden = !state.touched;
}

function collectRequest() {
  const fd = new FormData(bookForm);
  const get = (k) => String(fd.get(k) || '').trim();
  return {
    name: get('name'),
    phone: get('phone'),
    email: get('email'),
    address: get('address'),
    service: SERVICE_NAMES[get('service')] || get('service'),
    time: get('time'),
    notes: get('notes'),
    estimate: state.touched && $('#attach-estimate').checked ? estimateSummary : '',
  };
}

function validate(r) {
  const bad = [];
  if (!r.name) bad.push(['b-name', 'your name']);
  if (r.phone.replace(/\D/g, '').length < 7) bad.push(['b-phone', 'a phone number we can call']);
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) bad.push(['b-email', 'a valid email (or leave it empty)']);
  if (!r.address) bad.push(['b-address', 'the property address']);
  return bad;
}

function requestLines(r) {
  return [
    ['Name', r.name],
    ['Phone', r.phone],
    ['Email', r.email],
    ['Address', r.address],
    ['Need', r.service],
    ['Best time', r.time],
    ['Notes', r.notes],
    ['Online estimate', r.estimate],
  ].filter(([, v]) => v);
}

function showDone(r, mode) {
  const first = r.name.split(/\s+/)[0];
  const lines = requestLines(r);
  $('#done-summary').innerHTML = lines
    .filter(([k]) => k !== 'Notes')
    .map(([k, v]) => `<li><span>${esc(k)}</span><span>${esc(v)}</span></li>`).join('');
  const text = $('#done-text');
  if (mode === 'sent') {
    $('#done-title').textContent = 'Request received.';
    text.innerHTML = `Thanks, ${esc(first)}. We'll call from ${esc(BUSINESS.phone)} within two business hours to set a time.`;
  } else {
    const subject = `Inspection request: ${r.address}`;
    const body = lines.map(([k, v]) => `${k}: ${v}`).join('\n');
    const href = `mailto:${BUSINESS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    $('#done-title').textContent = 'One step left.';
    text.innerHTML = `Thanks, ${esc(first)}. Your request is written out below. Send it from your email app and we'll call within two business hours.<br><br>
      <a class="btn btn-copper btn-lg" href="${esc(href)}">Open it in my email</a>`;
  }
  bookForm.hidden = true;
  bookDone.hidden = false;
  bookDone.focus();
}

bookForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const r = collectRequest();
  const bad = validate(r);
  $$('[aria-invalid]', bookForm).forEach((el) => el.removeAttribute('aria-invalid'));
  if (bad.length) {
    bad.forEach(([id]) => $(`#${id}`).setAttribute('aria-invalid', 'true'));
    status.textContent = `Please add ${new Intl.ListFormat('en', { type: 'conjunction' }).format(bad.map(([, what]) => what))}.`;
    $(`#${bad[0][0]}`).focus();
    return;
  }
  status.textContent = '';
  if (!BUSINESS.formEndpoint) {
    showDone(r, 'email');
    return;
  }
  const button = $('button[type=submit]', bookForm);
  button.disabled = true;
  button.textContent = 'Sending…';
  try {
    const res = await fetch(BUSINESS.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(r),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    showDone(r, 'sent');
  } catch {
    status.textContent = `That didn't go through. Please try again, or call ${BUSINESS.phone}.`;
  } finally {
    button.disabled = false;
    button.textContent = 'Request my free inspection';
  }
});

$('#book-again').addEventListener('click', () => {
  bookForm.reset();
  bookDone.hidden = true;
  bookForm.hidden = false;
  updateEstimate();
  $('#b-name').focus();
});

// ---------------------------------------------------------------------------

$('#year').textContent = new Date().getFullYear();
renderMaterials();
renderSwatches();
updateEstimate();
