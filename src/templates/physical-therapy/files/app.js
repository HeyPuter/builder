// ===== Content =====================================================
// Everything the page says lives here. Change it and the page follows.

const CLINIC = {
  name: 'Arc & Axis',
  legal: '© Arc & Axis Physical Therapy',
  kicker: 'Physical therapy · Orthopedic · Sports · Post-surgical',
  lead: 'One-on-one physical therapy for pain, injuries and life after surgery. A full hour with a doctor of physical therapy, a plan you can follow at home, and a clear finish line.',
  heroMeasure: { label: 'R. shoulder flexion', degrees: 172 },
  heroFacts: ['No referral needed', 'Seen within 48 hrs', '4.9 ★ from 610 patients'],
  sessionMinutes: 55,
  approach: 'No aides, no double-booking, no ten minutes on a heat pack while your therapist runs between rooms. You get the same therapist from the first visit to the last, and every session ends with exercises you actually understand.',
  principles: [
    'Find the cause, not only the spot that hurts.',
    'Hands-on work to calm it down, then loading to make it last.',
    'Home programme on your phone, with video, after every visit.',
    'Measured progress: we retest range and strength every fourth visit.',
  ],
  directAccess: 'You can see a physical therapist without a doctor’s referral. Pick a time below and we will confirm by phone within one business day.',
  phone: '(555) 014-2290',
  email: 'hello@arcandaxis.example',
  street: '418 Fulton Street',
  cityLine: 'Second floor · Riverside, ST 00418',
  parking: 'Free parking behind the building, entrance on Pell Lane. Lift to the second floor.',
  mapQuery: '418 Fulton Street Riverside',
  priceNote: 'Card, HSA and FSA accepted. We give you a superbill to claim out-of-network.',
};

// Weekday 0 is Sunday. Times are 24h "HH:MM"; null means closed.
const HOURS = [
  { day: 'Sun', open: null, close: null },
  { day: 'Mon', open: '07:00', close: '19:00' },
  { day: 'Tue', open: '07:00', close: '19:00' },
  { day: 'Wed', open: '07:00', close: '19:00' },
  { day: 'Thu', open: '07:00', close: '19:00' },
  { day: 'Fri', open: '07:00', close: '17:00' },
  { day: 'Sat', open: '08:00', close: '13:00' },
];

// Body map hotspots. x/y are positions on the 200×400 figure.
const AREAS = [
  { id: 'neck', label: 'Neck', x: 100, y: 64, weeks: '4–6', visits: '6–8', lead: 'Most neck pain is a load problem, not damage. We settle the irritated tissue, then build the endurance your neck needs for a long day at a desk or behind the wheel.', common: ['Desk and posture strain', 'Whiplash', 'Tension headaches', 'Pinched nerve'], therapist: 'Priya Natarajan' },
  { id: 'shoulder', label: 'Shoulder', x: 64, y: 88, weeks: '6–12', visits: '10–14', lead: 'Shoulders reward patience. We restore the range first, then rebuild the rotator cuff and shoulder blade strength that keeps it from coming back.', common: ['Rotator cuff tears and tendinopathy', 'Frozen shoulder', 'Impingement', 'After surgery'], therapist: 'Marcus Oyelaran' },
  { id: 'elbow', label: 'Elbow & wrist', x: 146, y: 150, weeks: '4–8', visits: '6–10', lead: 'Tennis elbow, golfer’s elbow and wrist pain from screens or sport. We load the tendon gradually until it tolerates what you ask of it.', common: ['Tennis and golfer’s elbow', 'Carpal tunnel', 'Wrist sprain', 'Climber’s fingers'], therapist: 'Priya Natarajan' },
  { id: 'back', label: 'Low back', x: 100, y: 172, weeks: '4–8', visits: '6–10', lead: 'Backs are strong and most back pain gets better. We find what movement it is guarding against and give you a plan to get it moving again with confidence.', common: ['Disc irritation and sciatica', 'Muscle strain', 'Stiffness after sitting', 'Pregnancy back pain'], therapist: 'Elena Brandt' },
  { id: 'hip', label: 'Hip & pelvis', x: 118, y: 204, weeks: '6–10', visits: '8–12', lead: 'From runners’ hip pain to pelvic floor care before and after birth, we treat the whole region, including the parts people find hard to talk about.', common: ['Hip impingement', 'Bursitis', 'Pelvic floor therapy', 'Hip replacement rehab'], therapist: 'Elena Brandt' },
  { id: 'knee', label: 'Knee', x: 80, y: 296, weeks: '6–36', visits: '10–30', lead: 'ACL reconstruction, meniscus, kneecap pain and knee replacements. Every plan ends with return-to-sport or return-to-stairs testing, not a guess.', common: ['ACL reconstruction', 'Runner’s knee', 'Meniscus tears', 'Knee replacement'], therapist: 'Marcus Oyelaran' },
  { id: 'ankle', label: 'Ankle & foot', x: 120, y: 374, weeks: '3–8', visits: '6–10', lead: 'Sprains that keep re-rolling, Achilles pain, plantar heel pain. We rebuild balance and spring so the ankle trusts you again.', common: ['Ankle sprain', 'Achilles tendinopathy', 'Plantar heel pain', 'Shin splints'], therapist: 'Jonah Reyes' },
];

const TRACK = [
  { when: 'Day 1', title: 'Evaluation', body: '75 minutes. History, movement testing, a working diagnosis and your first exercises before you leave.' },
  { when: 'Wk 1–2', title: 'Calm it down', body: 'Hands-on treatment and gentle movement to bring pain down so you can sleep, sit and walk normally.' },
  { when: 'Wk 3–6', title: 'Build capacity', body: 'Strength and control work, progressed every visit. Fewer sessions, more done at home.' },
  { when: 'Wk 7–10', title: 'Load it', body: 'Heavier, faster, sport- and job-specific. We test against numbers, not how it feels on the day.' },
  { when: 'Wk 12', title: 'Back to it', body: 'Discharge testing, a plan to keep going on your own, and a check-in call a month later.' },
];

const TEAM = [
  { name: 'Elena Brandt', role: 'DPT, OCS · Clinic director', focus: 'Spine, pelvic health, pregnancy and postpartum', years: 14 },
  { name: 'Marcus Oyelaran', role: 'DPT, SCS', focus: 'ACL and shoulder surgery, return to sport', years: 9 },
  { name: 'Priya Natarajan', role: 'DPT, CMPT', focus: 'Neck, headaches, hand and elbow', years: 11 },
  { name: 'Jonah Reyes', role: 'DPT, CSCS', focus: 'Runners, foot and ankle, gait analysis', years: 6 },
];

// Visit types for booking. minutes sets the calendar event length.
const VISITS = [
  { id: 'eval', label: 'Initial evaluation', minutes: 75, price: 165, note: 'First visit' },
  { id: 'follow', label: 'Follow-up session', minutes: 55, price: 120, note: 'Returning patients' },
  { id: 'gait', label: 'Running gait analysis', minutes: 60, price: 140, note: 'Video + report' },
  { id: 'virtual', label: 'Virtual visit', minutes: 30, price: 70, note: 'From home' },
];

const EXTRAS = [
  { label: 'Dry needling add-on', price: 35 },
  { label: 'Discharge strength testing', price: 0, priceText: 'Included' },
  { label: 'Home programme app', price: 0, priceText: 'Included' },
];

// status: 'in' = in network, 'out' = we give you a superbill.
const INSURERS = [
  { name: 'Aetna', status: 'in' },
  { name: 'Blue Cross Blue Shield', status: 'in' },
  { name: 'Cigna', status: 'in' },
  { name: 'UnitedHealthcare', status: 'in' },
  { name: 'Medicare', status: 'in' },
  { name: 'Humana', status: 'out' },
  { name: 'Kaiser Permanente', status: 'out' },
  { name: 'Tricare', status: 'in' },
  { name: 'Workers’ compensation', status: 'in' },
  { name: 'Auto accident (PIP)', status: 'in' },
];

const BRING = [
  'Photo ID and your insurance card',
  'Clothes you can move in — shorts for knees and hips',
  'Any scans, surgical notes or referral, if you have them',
  'Arrive 10 minutes early for paperwork',
];

const FAQ = [
  { q: 'Do I need a referral from my doctor?', a: 'Not to be seen. Most plans let you come straight to us. A few plans and Medicare need a doctor to sign your plan of care, and we arrange that for you after the first visit.' },
  { q: 'How many visits will I need?', a: 'Most people need six to twelve. Tap the body map above for the typical range by area. You will know your number at the end of the first visit, and we will tell you if it changes.' },
  { q: 'What happens at the first visit?', a: 'We talk through what happened and what you want to get back to, test how you move, explain what we think is going on, start treatment, and send you home with two or three exercises.' },
  { q: 'Do you do dry needling?', a: 'Yes, when it helps. It is always optional and is added to a normal session for a small fee.' },
  { q: 'Can I cancel or move an appointment?', a: 'Of course. Call or email at least 24 hours ahead and there is no charge. Late cancellations are charged at half the session price.' },
];

// ===== App =========================================================

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + n;
const pad = (n) => String(n).padStart(2, '0');
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fmtTime = (min) => { const h = Math.floor(min / 60), m = min % 60; return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'am' : 'pm'}`; };
const phoneHref = 'tel:' + CLINIC.phone.replace(/[^\d+]/g, '');
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// --- Simple bindings ---
const binds = {
  name: CLINIC.name, legal: CLINIC.legal, kicker: CLINIC.kicker, lead: CLINIC.lead,
  heroMeasureLabel: CLINIC.heroMeasure.label, sessionMinutes: CLINIC.sessionMinutes,
  approach: CLINIC.approach, directAccess: CLINIC.directAccess, street: CLINIC.street,
  cityLine: CLINIC.cityLine, parking: CLINIC.parking, priceNote: CLINIC.priceNote,
};
for (const el of $$('[data-bind]')) {
  const k = el.dataset.bind;
  if (k === 'phoneLink') { el.href = phoneHref; el.textContent = CLINIC.phone; }
  else if (k === 'emailLink') { el.href = 'mailto:' + CLINIC.email; el.textContent = CLINIC.email; }
  else if (k === 'mapLink') { el.href = 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(CLINIC.mapQuery); }
  else if (k in binds) el.textContent = binds[k];
}
const list = (name, html) => { for (const el of $$(`[data-list="${name}"]`)) el.innerHTML = html; };

list('heroFacts', CLINIC.heroFacts.map((f) => `<li>${esc(f)}</li>`).join(''));
list('principles', CLINIC.principles.map((p) => `<li>${esc(p)}</li>`).join(''));
list('track', TRACK.map((t, i) => `
  <li style="--i:${i}">
    <span class="track-when mono">${esc(t.when)}</span>
    <span class="track-dot"></span>
    <h3>${esc(t.title)}</h3>
    <p>${esc(t.body)}</p>
  </li>`).join(''));
list('team', TEAM.map((p, i) => `
  <li>
    <span class="team-n mono">${pad(i + 1)}</span>
    <span class="team-name">${esc(p.name)}</span>
    <span class="team-role mono">${esc(p.role)}</span>
    <span class="team-focus">${esc(p.focus)}</span>
    <span class="team-yrs mono">${p.years} yrs</span>
  </li>`).join(''));
list('prices', [...VISITS.map((v) => ({ label: `${v.label} · ${v.minutes} min`, text: money(v.price) })),
  ...EXTRAS.map((e) => ({ label: e.label, text: e.priceText || '+' + money(e.price) }))]
  .map((r) => `<li><span>${esc(r.label)}</span><i></i><b class="mono">${esc(r.text)}</b></li>`).join(''));
list('bring', BRING.map((b) => `<li>${esc(b)}</li>`).join(''));
list('faq', FAQ.map((f) => `<details><summary>${esc(f.q)}<i aria-hidden="true"></i></summary><p>${esc(f.a)}</p></details>`).join(''));
$('#insurers').innerHTML = INSURERS.map((i) => `<option value="${esc(i.name)}">`).join('');

// --- Header: mobile drawer + solid bar after the hero ---
const bar = $('.bar'), burger = $('.burger'), drawer = $('#drawer');
const setDrawer = (open) => {
  drawer.hidden = !open; burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  document.body.classList.toggle('locked', open);
};
burger.addEventListener('click', () => setDrawer(drawer.hidden));
drawer.addEventListener('click', (e) => { if (e.target.closest('a')) setDrawer(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) { setDrawer(false); burger.focus(); } });
const onScroll = () => bar.classList.toggle('solid', scrollY > innerHeight * 0.6);
addEventListener('scroll', onScroll, { passive: true }); onScroll();

// --- Hero goniometer: ticks + needle sweep ---
(() => {
  const ticks = $('.gonio-ticks');
  let svg = '';
  for (let d = 0; d <= 180; d += 5) {
    const r = Math.PI * (1 - d / 180), long = d % 30 === 0;
    const r1 = 96, r2 = long ? 86 : 91;
    svg += `<line x1="${(Math.cos(r) * r1).toFixed(2)}" y1="${(-Math.sin(r) * r1).toFixed(2)}" x2="${(Math.cos(r) * r2).toFixed(2)}" y2="${(-Math.sin(r) * r2).toFixed(2)}" stroke="currentColor" stroke-width="${long ? 1 : .5}"/>`;
    if (d % 90 === 0) svg += `<text x="${(Math.cos(r) * 76).toFixed(1)}" y="${(-Math.sin(r) * 76 + 3).toFixed(1)}" text-anchor="middle">${d}</text>`;
  }
  ticks.innerHTML = svg;
  const arm = $('.gonio-arm'), num = $('.gonio-num'), target = CLINIC.heroMeasure.degrees;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const set = (d) => { arm.setAttribute('transform', `rotate(${d})`); num.textContent = Math.round(d); };
  if (reduce) return set(target);
  const t0 = performance.now(), dur = 1800;
  const step = (t) => {
    const p = Math.min(1, (t - t0 - 300) / dur), e = p <= 0 ? 0 : 1 - Math.pow(1 - p, 4);
    set(e * target);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
})();

// --- Body map ---
const state = { area: null, visit: VISITS[0].id, day: null, time: null };
const spots = $('.spots'), mapList = $('.map-list'), mapCard = $('.map-card');
spots.innerHTML = AREAS.map((a) => `
  <g class="spot" data-area="${a.id}" transform="translate(${a.x} ${a.y})" tabindex="-1" aria-hidden="true">
    <circle class="spot-ring" r="13"/><circle class="spot-dot" r="6"/>
  </g>`).join('');
mapList.innerHTML = AREAS.map((a, i) => `
  <button type="button" role="tab" data-area="${a.id}" aria-selected="false" id="tab-${a.id}">
    <span class="mono">${pad(i + 1)}</span>${esc(a.label)}
  </button>`).join('');

function showArea(id, { focus = false } = {}) {
  const a = AREAS.find((x) => x.id === id) || AREAS[0];
  for (const b of $$('button', mapList)) {
    const on = b.dataset.area === a.id;
    b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1;
    if (on && focus) b.focus();
  }
  for (const s of $$('.spot', spots)) s.classList.toggle('on', s.dataset.area === a.id);
  mapCard.setAttribute('aria-labelledby', 'tab-' + a.id);
  mapCard.innerHTML = `
    <h3 class="display map-title">${esc(a.label)}</h3>
    <dl class="map-stats">
      <div><dt class="mono">Typical plan</dt><dd>${esc(a.weeks)}<small>weeks</small></dd></div>
      <div><dt class="mono">Visits</dt><dd>${esc(a.visits)}</dd></div>
    </dl>
    <p class="map-lead">${esc(a.lead)}</p>
    <ul class="map-common">${a.common.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    <p class="map-who mono">Most often seen by <b>${esc(a.therapist)}</b></p>
    <button type="button" class="btn btn-tape" data-book="${a.id}">Book for my ${esc(a.label.toLowerCase())}</button>`;
}
spots.addEventListener('click', (e) => { const g = e.target.closest('.spot'); if (g) showArea(g.dataset.area); });
mapList.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) showArea(b.dataset.area); });
mapList.addEventListener('keydown', (e) => {
  const i = AREAS.findIndex((a) => a.id === $('[aria-selected="true"]', mapList).dataset.area);
  const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
  if (!d) return;
  e.preventDefault();
  showArea(AREAS[(i + d + AREAS.length) % AREAS.length].id, { focus: true });
});
mapCard.addEventListener('click', (e) => {
  const b = e.target.closest('[data-book]');
  if (!b) return;
  selectArea(b.dataset.book);
  $('#book').scrollIntoView({ behavior: 'smooth' });
});
showArea('knee');

// --- Booking desk ---
const form = $('.desk'), confirmBox = $('.confirm');
$('[data-list="visits"]').innerHTML = VISITS.map((v) => `
  <label class="visit-opt">
    <input type="radio" name="visit" value="${v.id}" ${v.id === state.visit ? 'checked' : ''}>
    <span class="visit-name">${esc(v.label)}</span>
    <span class="visit-meta mono">${v.minutes} min · ${esc(v.note)}</span>
    <b class="visit-price mono">${money(v.price)}</b>
  </label>`).join('');
$('[data-list="areaChips"]').innerHTML = [...AREAS, { id: 'other', label: 'Something else' }].map((a) => `
  <label class="chip"><input type="radio" name="area" value="${a.id}"><span>${esc(a.label)}</span></label>`).join('');

function selectArea(id) {
  state.area = id;
  const r = $(`input[name="area"][value="${id}"]`, form);
  if (r) r.checked = true;
  summarize();
}

// Bookable days: the next 12 open days, starting tomorrow.
const DAY_COUNT = 12;
function openDays() {
  const out = [], d = new Date(); d.setHours(0, 0, 0, 0);
  while (out.length < DAY_COUNT) {
    d.setDate(d.getDate() + 1);
    if (HOURS[d.getDay()].open) out.push(new Date(d));
  }
  return out;
}
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// Some slots already taken, the same ones on every load for a given day.
function taken(key, min) {
  let h = 0; for (const c of key + min) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 5 < 2;
}
const days = openDays();
const daysEl = $('.days'), slotsEl = $('.slots');
daysEl.innerHTML = days.map((d) => `
  <label class="day"><input type="radio" name="day" value="${dayKey(d)}">
    <span class="mono">${d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
    <b>${d.getDate()}</b>
    <span class="mono">${d.toLocaleDateString(undefined, { month: 'short' })}</span>
  </label>`).join('');

function renderSlots() {
  if (!state.day) { slotsEl.innerHTML = '<p class="slots-empty mono">Pick a day to see times.</p>'; return; }
  const d = days.find((x) => dayKey(x) === state.day);
  const h = HOURS[d.getDay()], visit = VISITS.find((v) => v.id === state.visit);
  const out = [];
  for (let m = toMin(h.open); m + visit.minutes <= toMin(h.close); m += 60) out.push(m);
  slotsEl.innerHTML = out.map((m) => {
    const busy = taken(state.day, m);
    return `<label class="slot${busy ? ' busy' : ''}"><input type="radio" name="time" value="${m}" ${busy ? 'disabled' : ''} ${String(state.time) === String(m) ? 'checked' : ''}><span>${fmtTime(m)}</span></label>`;
  }).join('');
  if (!out.some((m) => String(m) === String(state.time) && !taken(state.day, m))) state.time = null;
}

function summarize() {
  const v = VISITS.find((x) => x.id === state.visit);
  const a = AREAS.find((x) => x.id === state.area);
  const d = state.day && days.find((x) => dayKey(x) === state.day);
  const parts = [v.label, a ? a.label : null,
    d ? d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : null,
    state.time != null ? fmtTime(+state.time) : null];
  $('.summary').textContent = parts.filter(Boolean).join(' · ') + ` — ${money(v.price)}`;
}

form.addEventListener('change', (e) => {
  const t = e.target;
  if (t.name === 'visit') { state.visit = t.value; renderSlots(); }
  if (t.name === 'area') state.area = t.value;
  if (t.name === 'day') { state.day = t.value; renderSlots(); }
  if (t.name === 'time') state.time = t.value;
  summarize();
});

const insResult = $('.ins-result');
form.elements.insurance.addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  const hit = q.length > 1 && INSURERS.find((i) => i.name.toLowerCase().startsWith(q) || i.name.toLowerCase() === q);
  insResult.className = 'ins-result mono' + (hit ? ' ' + hit.status : '');
  insResult.textContent = !q ? '' : !hit ? 'Not on our list — call us and we will check your benefits for you.'
    : hit.status === 'in' ? `✓ ${hit.name}: in network. You pay your usual copay.`
    : `${hit.name}: out of network. Pay self-pay rates and claim back with our superbill.`;
});

let lastBooking = null;
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const err = $('.form-error');
  const f = form.elements;
  const missing = [];
  if (!state.area) missing.push('the area');
  if (!state.day) missing.push('a day');
  if (state.time == null) missing.push('a time');
  for (const k of ['name', 'phone', 'email']) {
    const ok = f[k].value.trim() && f[k].checkValidity();
    f[k].setAttribute('aria-invalid', String(!ok));
    if (!ok) missing.push(k === 'email' ? 'a valid email' : 'your ' + k);
  }
  if (missing.length) { err.textContent = 'Please add ' + missing.join(', ') + '.'; return; }
  err.textContent = '';
  const v = VISITS.find((x) => x.id === state.visit);
  const d = days.find((x) => dayKey(x) === state.day);
  const start = new Date(d); start.setMinutes(+state.time);
  lastBooking = {
    ref: 'AA-' + Math.random().toString(36).slice(2, 7).toUpperCase(),
    visit: v.label, minutes: v.minutes, area: state.area,
    start: start.toISOString(), name: f.name.value.trim(), phone: f.phone.value.trim(),
    email: f.email.value.trim(), insurance: f.insurance.value.trim(), notes: f.notes.value.trim(),
  };
  const all = store.get('aa-requests') || [];
  all.push(lastBooking); store.set('aa-requests', all);

  $('.confirm-ref').textContent = 'Request ' + lastBooking.ref;
  $('.confirm-body').textContent = `${lastBooking.name.split(' ')[0]}, we have held ${v.label.toLowerCase()} on ${start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at ${fmtTime(+state.time)}. We will call ${lastBooking.phone} within one business day to confirm. Here is what to bring:`;
  form.hidden = true; confirmBox.hidden = false; confirmBox.focus();
});

confirmBox.addEventListener('click', (e) => {
  const act = e.target.closest('[data-action]')?.dataset.action;
  if (act === 'again') {
    form.reset(); Object.assign(state, { area: null, visit: VISITS[0].id, day: dayKey(days[0]), time: null });
    $('input[name="day"]', daysEl).checked = true;
    insResult.textContent = ''; renderSlots(); summarize();
    confirmBox.hidden = true; form.hidden = false; form.querySelector('input').focus();
  }
  if (act === 'ics' && lastBooking) {
    const s = new Date(lastBooking.start), en = new Date(s.getTime() + lastBooking.minutes * 60000);
    const z = (x) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Arc and Axis//Booking//EN', 'BEGIN:VEVENT',
      `UID:${lastBooking.ref}@arcandaxis`, `DTSTAMP:${z(new Date())}`, `DTSTART:${z(s)}`, `DTEND:${z(en)}`,
      `SUMMARY:${lastBooking.visit} — ${CLINIC.name} Physical Therapy`,
      `LOCATION:${CLINIC.street}\\, ${CLINIC.cityLine.replace(/,/g, '\\,')}`,
      `DESCRIPTION:Request ${lastBooking.ref}. Bring: ${BRING.join('; ').replace(/,/g, '\\,')}`,
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    a.download = 'arc-and-axis-appointment.ics';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
});
state.day = dayKey(days[0]);
$('input[name="day"]', daysEl).checked = true;
renderSlots(); summarize();

// --- Hours + open-now status ---
(() => {
  const now = new Date(), today = now.getDay();
  const order = [1, 2, 3, 4, 5, 6, 0];
  list('hours', order.map((i) => {
    const h = HOURS[i];
    return `<tr class="${i === today ? 'today' : ''}"><th>${h.day}</th><td>${h.open ? `${fmtTime(toMin(h.open))} – ${fmtTime(toMin(h.close))}` : 'Closed'}</td></tr>`;
  }).join(''));
  const h = HOURS[today], mins = now.getHours() * 60 + now.getMinutes();
  const open = h.open && mins >= toMin(h.open) && mins < toMin(h.close);
  let msg;
  if (open) msg = `Open now · until ${fmtTime(toMin(h.close))}`;
  else {
    let k = 0, i = today;
    if (h.open && mins < toMin(h.open)) msg = `Closed · opens ${fmtTime(toMin(h.open))} today`;
    else {
      do { i = (i + 1) % 7; k++; } while (!HOURS[i].open && k < 7);
      msg = `Closed · opens ${k === 1 ? 'tomorrow' : HOURS[i].day} ${fmtTime(toMin(HOURS[i].open))}`;
    }
  }
  const st = $('.status');
  st.classList.toggle('open', !!open);
  $('span', st).textContent = msg;
})();

// --- Reveal on scroll ---
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const io = new IntersectionObserver((es) => {
    for (const en of es) if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }, { threshold: 0.15 });
  for (const el of $$('.track-list, .team-list li, .deg')) { el.classList.add('pre'); io.observe(el); }
}
