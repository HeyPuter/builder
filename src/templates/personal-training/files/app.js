// =============================================================================
// Rackline Strength — content
// Everything a studio owner would change lives in these objects. The page
// below is drawn from them, so editing a price, an hour or a coach here is all
// it takes.
// =============================================================================

const STUDIO = {
    name: 'Rackline',
    fullName: 'Rackline Strength',
    area: 'Foundry Lane · Est. 2016',
    address: ['41 Foundry Lane, Unit 3', 'Riverside, MA 02140'],
    addressNote: 'Roller door on the left of the courtyard. Two free parking bays out front; bike rack inside.',
    phone: '(555) 014-2270',
    email: 'coach@racklinestrength.com',
    currency: '$',
    weightUnit: 'kg',           // default unit for Plate math: 'kg' or 'lb'
};

// Opening hours, Monday first. [open, close] in 24h "HH:MM", or null when closed.
const HOURS = [
    ['Mon', ['06:00', '20:00']],
    ['Tue', ['06:00', '20:00']],
    ['Wed', ['06:00', '20:00']],
    ['Thu', ['06:00', '20:00']],
    ['Fri', ['06:00', '18:00']],
    ['Sat', ['07:00', '12:00']],
    ['Sun', null],
];

// "Today on the board" — the session written up on the whiteboard, by weekday
// (0 = Sunday … 6 = Saturday).
const BOARD = {
    0: { title: 'Rest day', items: ['Walk 30–45 min', 'Mobility flow 10 min', 'Sleep 8 h'], note: 'Studio closed. Recovery is training too.' },
    1: { title: 'Lower — strength', items: ['A  Back squat 5×5 @ 75%', 'B1 Romanian deadlift 3×8', 'B2 Split squat 3×10/side', 'C  Sled push 6×20 m'], note: 'Last rep should look like the first.' },
    2: { title: 'Upper — push / pull', items: ['A  Bench press 5×5 @ 75%', 'B1 Chest-supported row 4×10', 'B2 Half-kneel press 3×8/side', 'C  Farmer carry 4×30 m'], note: 'Brace before you breathe out.' },
    3: { title: 'Conditioning', items: ['A  Row 500 m × 6, 1:1 rest', 'B  KB swing EMOM 10 × 15', 'C  Dead bug 3×10'], note: 'Pace the first interval like the last.' },
    4: { title: 'Lower — power', items: ['A  Deadlift 6×3 @ 80%', 'B1 Box jump 4×4', 'B2 Hip thrust 3×10', 'C  Suitcase carry 4×20 m/side'], note: 'Bar speed over bar weight today.' },
    5: { title: 'Upper — volume', items: ['A  Weighted pull-up 4×6', 'B1 Incline DB press 4×10', 'B2 Cable row 4×12', 'C  Plank drag 3×12'], note: 'Leave one rep in the tank.' },
    6: { title: 'Open gym', items: ['Make-up sessions', 'Technique clinic 9:00', 'Testing days by appointment'], note: 'Saturday mornings only — 7 to noon.' },
};

// The first twelve weeks, shown as a training log.
const PHASES = [
    { weeks: '01–02', name: 'Assess', body: 'Movement screen, strength baselines, a long talk about your life outside the gym. Nothing gets loaded until we know how you move.' },
    { weeks: '03–06', name: 'Groove', body: 'Learn the six patterns — squat, hinge, push, pull, carry, brace — with weights you can own. Technique first, every set filmed.' },
    { weeks: '07–10', name: 'Build', body: 'Progressive overload, written week by week. Weights go up when your form says so, not when the calendar does.' },
    { weeks: '11–12', name: 'Prove', body: 'Re-test every baseline. You leave with the numbers, the videos and the plan for the next block.' },
];

// Ways to train. `perSession` is the price for one session; the page
// multiplies it by sessions per week × 4 for the monthly figure.
const PROGRAMS = [
    {
        id: 'one-to-one',
        name: '1:1 Coaching',
        short: '1:1',
        perSession: 85,
        sessions: { min: 1, max: 5, start: 2 },
        length: '60 min',
        blurb: 'You, one coach and a program written only for you. The fastest way to get strong and the safest way to come back from an injury.',
        includes: ['Written 12-week program', 'Every session coached', 'Monthly re-test & video review', 'Messaging with your coach'],
    },
    {
        id: 'semi-private',
        name: 'Semi-Private',
        short: 'Semi',
        perSession: 38,
        sessions: { min: 2, max: 5, start: 3 },
        length: '60 min · max 4 people',
        blurb: 'Your own program, run in a group of four or fewer. Same coach, same attention to the bar — split four ways.',
        includes: ['Individual program', 'Max 4 per coach', 'Quarterly re-test', 'Open-gym Saturdays'],
    },
    {
        id: 'online',
        name: 'Online Programming',
        short: 'Online',
        perSession: 0,
        monthly: 149,
        sessions: { min: 3, max: 6, start: 4 },
        length: 'Train anywhere',
        blurb: 'A program in your phone, weekly video form checks and a coach on the other end. For people with a gym of their own and a habit already.',
        includes: ['Program built to your equipment', 'Weekly form-check videos', 'Monthly call', 'Adjustments any day'],
    },
];

// The coaches. `photo` is a file in images/.
const COACHES = [
    { name: 'Mara Quill', role: 'Head coach · Founder', focus: 'Strength for 40+, return from injury', years: 14, photo: 'coach-1.jpg', best: 'Deadlift 190 kg' },
    { name: 'Teo Ballard', role: 'Strength coach', focus: 'Powerlifting, first-time lifters', years: 9, photo: 'coach-2.jpg', best: 'Squat 230 kg' },
    { name: 'Ines Okoro', role: 'Conditioning coach', focus: 'Engine work, hybrid & race prep', years: 7, photo: 'coach-3.jpg', best: '2k row 6:58' },
    { name: 'Sam Whitlow', role: 'Online & mobility', focus: 'Programming, mobility, pre/postnatal', years: 11, photo: 'coach-4.jpg', best: 'Clean & jerk 105 kg' },
];

// Results for the logbook. `from` and `to` are in the unit given.
const RESULTS = [
    { client: 'Dana R.', age: 52, lift: 'Deadlift', from: 40, to: 105, unit: 'kg', weeks: 24, note: 'First barbell lift of her life in week 2.' },
    { client: 'Marcus T.', age: 34, lift: 'Squat', from: 80, to: 150, unit: 'kg', weeks: 20, note: 'Knee pain gone by week 6.' },
    { client: 'Priya S.', age: 29, lift: 'Pull-up', from: 0, to: 8, unit: 'reps', weeks: 16, note: 'From band-assisted to strict.' },
    { client: 'Glen H.', age: 61, lift: 'Deadlift', from: 60, to: 140, unit: 'kg', weeks: 36, note: 'Back surgery in 2019.' },
    { client: 'Alana W.', age: 41, lift: 'Bench', from: 30, to: 62.5, unit: 'kg', weeks: 28, note: 'Two kids, three sessions a week.' },
    { client: 'Joel K.', age: 45, lift: 'Squat', from: 60, to: 125, unit: 'kg', weeks: 30, note: 'Lost 14 kg along the way.' },
];

// Free consults. Length in minutes; times offered each open day (24h).
const CONSULT = {
    minutes: 45,
    daysAhead: 10,
    times: ['06:30', '07:30', '09:00', '12:15', '16:00', '17:15', '18:30'],
    goals: ['Get stronger', 'Lose fat', 'Come back from injury', 'Sport performance', 'Move without pain', 'Learn to lift'],
};

const FAQ = [
    { q: 'I have never lifted. Is this for me?', a: 'Most of our clients had never touched a barbell. The first two weeks are spent learning how you move — nothing heavy until it is earned.' },
    { q: 'What happens at the free consult?', a: 'Forty-five minutes with a coach: a short conversation, a movement screen and a few easy tests. You leave with a recommendation, whether or not you sign up.' },
    { q: 'Do I need to commit to a contract?', a: 'No. Coaching is billed monthly and you can stop with 14 days’ notice. Most people stay because the numbers keep going up.' },
    { q: 'Can I train around an injury?', a: 'Yes — it is a large part of what we do. With your permission we will talk to your physio or doctor and write around it.' },
    { q: 'What should I bring?', a: 'Flat shoes, water and comfortable clothes. Chalk, belts and everything else is here.' },
];

const MARQUEE = ['No mirrors', 'No music videos', 'No crowds', 'Just coaching', 'Every rep counts', 'Written programs', 'Real numbers'];

// =============================================================================
// Page
// =============================================================================

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
        else if (v === true) el.setAttribute(k, '');
        else if (v !== false && v != null) el.setAttribute(k, v);
    }
    for (const kid of kids.flat()) if (kid != null) el.append(kid);
    return el;
};
const store = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } },
};
const money = (n) => STUDIO.currency + n.toLocaleString('en-US');
const toMin = (t) => { const [a, b] = t.split(':').map(Number); return a * 60 + b; };
const clock = (t) => {
    const [hh, mm] = t.split(':').map(Number);
    const ap = hh >= 12 ? 'pm' : 'am';
    const h12 = hh % 12 || 12;
    return mm ? `${h12}:${String(mm).padStart(2, '0')}${ap}` : `${h12}${ap}`;
};
const DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const hoursFor = (date) => (HOURS.find(([d]) => DAY_INDEX[d] === date.getDay()) || [])[1] || null;

let toastTimer;
function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ---- Static bits -------------------------------------------------------------
function renderBasics() {
    $$('[data-bind="name"]').forEach((el) => { el.textContent = STUDIO.name; });
    $$('[data-bind="area"]').forEach((el) => { el.textContent = STUDIO.area; });
    $('#foot-copy').textContent = `© ${new Date().getFullYear()} ${STUDIO.fullName} · ${STUDIO.address.join(', ')}`;

    const words = MARQUEE.concat(MARQUEE);
    $('#tape-track').append(...words.map((w) => h('span', { text: w })));
}

// ---- Open / closed line in the hero --------------------------------------
function renderOpenNow() {
    const now = new Date();
    const today = hoursFor(now);
    const mins = now.getHours() * 60 + now.getMinutes();
    const el = $('#hero-open');
    if (today && mins >= toMin(today[0]) && mins < toMin(today[1])) {
        el.innerHTML = '';
        el.append(h('i', { class: 'dot' }), `Floor open — until ${clock(today[1])}`);
        el.classList.add('is-open');
        return;
    }
    // Next opening time.
    for (let i = 0; i < 8; i++) {
        const d = new Date(now); d.setDate(now.getDate() + i);
        const hrs = hoursFor(d);
        if (!hrs) continue;
        if (i === 0 && mins >= toMin(hrs[0])) continue;
        const day = i === 0 ? 'today' : i === 1 ? 'tomorrow' : d.toLocaleDateString('en-US', { weekday: 'long' });
        el.textContent = `Closed — opens ${day} ${clock(hrs[0])}`;
        return;
    }
}

// ---- The board ------------------------------------------------------------------
function renderBoard() {
    const now = new Date();
    const b = BOARD[now.getDay()];
    $('#board-day').textContent = 'On the board · ' + now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    $('#board-title').textContent = b.title;
    $('#board-list').replaceChildren(...b.items.map((t) => h('li', { text: t })));
    $('#board-note').textContent = b.note;
}

// ---- 01 Method ---------------------------------------------------------------
function renderPhases() {
    $('#phases').replaceChildren(...PHASES.map((p) =>
        h('li', { class: 'log-row' },
            h('span', { class: 'log-weeks mono', text: 'Wk ' + p.weeks }),
            h('span', { class: 'log-name', text: p.name }),
            h('p', { class: 'log-body mono', text: p.body }),
        )));
}

// ---- 02 Training + price builder ----------------------------------------
const trainState = { id: PROGRAMS[0].id, per: Object.fromEntries(PROGRAMS.map((p) => [p.id, p.sessions.start])) };

function priceOf(p, perWeek) {
    if (p.monthly) return { month: p.monthly, session: null };
    return { month: p.perSession * perWeek * 4, session: p.perSession };
}

function renderTrainTabs() {
    $('#train-tabs').replaceChildren(...PROGRAMS.map((p, i) =>
        h('button', {
            class: 'train-name', role: 'tab', id: 'tab-' + p.id, 'aria-controls': 'train-panel',
            'aria-selected': String(p.id === trainState.id), tabindex: p.id === trainState.id ? '0' : '-1',
            onclick: () => { trainState.id = p.id; renderTrain(); },
            onkeydown: (e) => {
                if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
                e.preventDefault();
                const next = PROGRAMS[(i + (e.key === 'ArrowDown' ? 1 : PROGRAMS.length - 1)) % PROGRAMS.length];
                trainState.id = next.id; renderTrain(); $('#tab-' + next.id).focus();
            },
        }, h('span', { class: 'train-idx mono', text: String(i + 1).padStart(2, '0') }), p.name)));
}

function renderTrain() {
    renderTrainTabs();
    const p = PROGRAMS.find((x) => x.id === trainState.id);
    const per = trainState.per[p.id];
    const price = priceOf(p, per);
    const set = (v) => { trainState.per[p.id] = Math.min(p.sessions.max, Math.max(p.sessions.min, v)); renderTrain(); };

    const dots = h('div', { class: 'week-dots', 'aria-hidden': 'true' },
        ...['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => h('span', { class: i < per ? 'on' : '', text: d })));

    $('#train-panel').setAttribute('aria-labelledby', 'tab-' + p.id);
    $('#train-panel').replaceChildren(
        h('p', { class: 'mono train-len', text: p.length }),
        h('p', { class: 'train-blurb', text: p.blurb }),
        h('ul', { class: 'train-inc mono' }, ...p.includes.map((t) => h('li', { text: t }))),
        h('div', { class: 'train-calc' },
            h('div', { class: 'train-per' },
                h('p', { class: 'mono', text: p.monthly ? 'Training days you plan per week' : 'Sessions per week' }),
                h('div', { class: 'stepper stepper--dark' },
                    h('button', { type: 'button', 'aria-label': 'One fewer', disabled: per <= p.sessions.min, onclick: () => set(per - 1) }, '−'),
                    h('output', { 'aria-live': 'polite', text: String(per) }),
                    h('button', { type: 'button', 'aria-label': 'One more', disabled: per >= p.sessions.max, onclick: () => set(per + 1) }, '+'),
                ),
                dots,
            ),
            h('div', { class: 'train-price' },
                h('p', { class: 'mono', text: price.session ? `${money(price.session)} / session · billed monthly` : 'Flat monthly fee' }),
                h('p', { class: 'train-month' }, money(price.month), h('small', { text: '/mo' })),
            ),
        ),
        h('a', {
            class: 'btn btn-tape', href: '#book',
            onclick: () => { $('#f-program').value = p.id; },
        }, `Start with a free consult →`),
    );
}

// ---- 03 Coaches -------------------------------------------------------------
function renderCoaches() {
    const peek = $('#roster-peek');
    const img = $('#roster-img');
    const list = $('#roster-list');
    const show = (c, row) => {
        img.src = 'images/' + c.photo;
        img.alt = c.name;
        peek.classList.add('show');
        $$('.coach', list).forEach((r) => r.classList.toggle('active', r === row));
    };
    list.replaceChildren(...COACHES.map((c, i) => {
        const row = h('li', { class: 'coach' });
        const btn = h('button', {
            class: 'coach-btn', 'aria-expanded': 'false',
            onmouseenter: () => show(c, row),
            onfocus: () => show(c, row),
            onclick: () => {
                const open = row.classList.toggle('open');
                btn.setAttribute('aria-expanded', String(open));
                show(c, row);
            },
        },
        h('span', { class: 'coach-idx mono', text: String(i + 1).padStart(2, '0') }),
        h('span', { class: 'coach-name', text: c.name }),
        h('span', { class: 'coach-role mono', text: c.role }));
        const detail = h('div', { class: 'coach-detail' },
            h('img', { src: 'images/' + c.photo, alt: c.name, loading: 'lazy' }),
            h('dl', { class: 'mono' },
                h('dt', { text: 'Focus' }), h('dd', { text: c.focus }),
                h('dt', { text: 'Coaching' }), h('dd', { text: c.years + ' years' }),
                h('dt', { text: 'Best lift' }), h('dd', { text: c.best }),
            ));
        row.append(btn, detail);
        return row;
    }));
    $('#roster').addEventListener('mouseleave', () => peek.classList.remove('show'));
    $('#roster').addEventListener('mousemove', (e) => {
        const r = $('#roster').getBoundingClientRect();
        peek.style.setProperty('--y', (e.clientY - r.top) + 'px');
    });
}

// ---- 04 Logbook --------------------------------------------------------------
let logFilter = 'All';
function renderLogbook() {
    const lifts = ['All', ...new Set(RESULTS.map((r) => r.lift))];
    $('#log-filter').replaceChildren(...lifts.map((l) => h('button', {
        class: 'chip', 'aria-pressed': String(l === logFilter), text: l,
        onclick: () => { logFilter = l; renderLogbook(); },
    })));
    const rows = RESULTS.filter((r) => logFilter === 'All' || r.lift === logFilter);
    // Bars are scaled within each unit, so reps never sit on a kilogram scale.
    const maxBy = {};
    for (const r of rows) maxBy[r.unit] = Math.max(maxBy[r.unit] || 0, r.to);
    const fmt = (n, u) => `${n}${u === 'reps' ? '' : ' '}${u === 'reps' ? ' reps' : u}`;
    $('#ledger').replaceChildren(
        h('div', { class: 'ledger-row ledger-hd mono', role: 'row' },
            ...['Client', 'Lift', 'Start → Now', 'Weeks', ''].map((t) => h('span', { role: 'columnheader', text: t }))),
        ...rows.map((r) => h('div', { class: 'ledger-row', role: 'row' },
            h('span', { class: 'ledger-client', role: 'cell' }, r.client, h('small', { class: 'mono', text: `${r.age} · ${r.note}` })),
            h('span', { class: 'mono', role: 'cell', text: r.lift }),
            h('span', { class: 'ledger-nums', role: 'cell' },
                h('s', { text: fmt(r.from, r.unit) }), ' → ', h('b', { text: fmt(r.to, r.unit) })),
            h('span', { class: 'mono', role: 'cell', text: String(r.weeks) }),
            h('span', { class: 'ledger-bar', role: 'cell', 'aria-label': `${Math.round((r.to - r.from) / Math.max(r.from, 1) * 100)}% up` },
                h('i', { style: `--a:${r.from / maxBy[r.unit]};--b:${r.to / maxBy[r.unit]}` })),
        )),
    );
    const kg = RESULTS.filter((r) => r.unit === 'kg').reduce((n, r) => n + (r.to - r.from), 0);
    $('#ledger-total').textContent = `${kg} kg added to the bar across these clients — and counting.`;
}

// ---- 05 Plate math -----------------------------------------------------------
const PLATES = {
    kg: { bar: 20, plates: [25, 20, 15, 10, 5, 2.5, 1.25], round: 2.5 },
    lb: { bar: 45, plates: [45, 35, 25, 10, 5, 2.5], round: 5 },
};
const PLATE_LOOK = { // height, width — bigger plates read bigger
    25: [170, 30], 20: [170, 26], 15: [150, 22], 10: [124, 18], 5: [92, 14], 2.5: [74, 11], 1.25: [60, 9],
    45: [170, 30], 35: [156, 24],
};
const calcState = { unit: STUDIO.weightUnit === 'lb' ? 'lb' : 'kg', pct: 80 };

function oneRepMax(w, reps) {
    if (reps <= 1) return w;
    return w * (1 + reps / 30);       // Epley
}

function loadBar(target, unit) {
    const cfg = PLATES[unit];
    let side = Math.max(0, (target - cfg.bar) / 2);
    const out = [];
    for (const p of cfg.plates) {
        while (side + 1e-9 >= p) { out.push(p); side -= p; }
    }
    return out;
}

function drawBar(plates, unit) {
    const svg = $('#bar');
    const ns = 'http://www.w3.org/2000/svg';
    const el = (tag, a) => { const e = document.createElementNS(ns, tag); for (const k in a) e.setAttribute(k, a[k]); return e; };
    svg.replaceChildren();
    const cy = 100;
    svg.append(el('rect', { x: 10, y: cy - 5, width: 620, height: 10, rx: 3, class: 'b-shaft' }));
    svg.append(el('rect', { x: 150, y: cy - 14, width: 14, height: 28, class: 'b-collar' }));
    svg.append(el('rect', { x: 476, y: cy - 14, width: 14, height: 28, class: 'b-collar' }));
    let xl = 148, xr = 492;
    plates.forEach((p, i) => {
        const [ph, pw] = PLATE_LOOK[p] || [80, 12];
        const heavy = i === 0 || p >= (unit === 'kg' ? 20 : 45);
        const cls = heavy ? 'b-plate b-plate--hi' : 'b-plate';
        xl -= pw + 2;
        const a = el('rect', { x: xl, y: cy - ph / 2, width: pw, height: ph, rx: 3, class: cls });
        const b = el('rect', { x: xr, y: cy - ph / 2, width: pw, height: ph, rx: 3, class: cls });
        a.style.animationDelay = b.style.animationDelay = (i * 40) + 'ms';
        svg.append(a, b);
        xr += pw + 2;
    });
}

function renderCalc() {
    const unit = calcState.unit;
    const w = parseFloat($('#calc-weight').value);
    const reps = Math.round(parseFloat($('#calc-reps').value));
    const valid = w > 0 && reps >= 1 && reps <= 12;
    const max = valid ? oneRepMax(w, reps) : 0;
    const cfg = PLATES[unit];
    $('#calc-unit').textContent = unit;
    $('#calc-max').textContent = valid ? (Math.round(max * 2) / 2).toString() : '—';
    $('#calc-max-unit').textContent = unit;

    $('#pct').replaceChildren(...[60, 70, 75, 80, 85, 90, 95].map((p) => {
        const load = Math.max(cfg.bar, Math.round((max * p / 100) / cfg.round) * cfg.round);
        return h('button', {
            type: 'button', class: 'pct-btn', 'aria-pressed': String(p === calcState.pct),
            onclick: () => { calcState.pct = p; renderCalc(); },
        }, h('span', { class: 'mono', text: p + '%' }), h('b', { text: valid ? String(load) : '—' }));
    }));

    const target = valid ? Math.max(cfg.bar, Math.round((max * calcState.pct / 100) / cfg.round) * cfg.round) : cfg.bar;
    const plates = loadBar(target, unit);
    drawBar(plates, unit);
    $('#bar-label').textContent = `${calcState.pct}% → ${target} ${unit} on a ${cfg.bar} ${unit} bar`;
    $('#bar-per-side').textContent = plates.length ? 'Each side: ' + plates.join(' + ') + ' ' + unit : 'Empty bar — just the ' + cfg.bar + ' ' + unit + '.';
}

function initCalc() {
    $('#calc').addEventListener('input', renderCalc);
    $('#calc').addEventListener('submit', (e) => e.preventDefault());
    $$('#calc [data-step]').forEach((b) => b.addEventListener('click', () => {
        const r = $('#calc-reps');
        r.value = Math.min(12, Math.max(1, (parseInt(r.value, 10) || 1) + Number(b.dataset.step)));
        renderCalc();
    }));
    $('#calc-unit').addEventListener('click', () => {
        const w = $('#calc-weight');
        const v = parseFloat(w.value) || 0;
        if (calcState.unit === 'kg') { calcState.unit = 'lb'; w.value = Math.round(v * 2.20462); }
        else { calcState.unit = 'kg'; w.value = Math.round(v / 2.20462 * 2) / 2; }
        renderCalc();
    });
    if (calcState.unit === 'lb') $('#calc-weight').value = 225;
    renderCalc();
}

// ---- 06 Booking --------------------------------------------------------------
const BOOK_KEY = 'rackline.consults';
const TAKEN_SEED = [3, 9, 14, 20, 26, 31, 37, 44, 52, 58]; // fake "already booked" pattern
const book = { day: null, time: null, goals: new Set() };

function dateKey(d) { return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'); }
function bookings() { return store.get(BOOK_KEY, []); }

function openDays() {
    const out = [];
    const start = new Date(); start.setHours(0, 0, 0, 0);
    for (let i = 0; out.length < CONSULT.daysAhead && i < 30; i++) {
        const d = new Date(start); d.setDate(start.getDate() + i);
        if (hoursFor(d)) out.push(d);
    }
    return out;
}

function slotsFor(day) {
    const hrs = hoursFor(day);
    if (!hrs) return [];
    const now = new Date();
    const mine = bookings();
    return CONSULT.times.filter((t) => toMin(t) >= toMin(hrs[0]) && toMin(t) + CONSULT.minutes <= toMin(hrs[1]))
        .map((t, i) => {
            const at = new Date(day); at.setHours(...t.split(':').map(Number));
            const seed = (day.getDate() * 7 + i * 5) % 60;
            const taken = TAKEN_SEED.includes(seed) || mine.some((b) => b.day === dateKey(day) && b.time === t);
            return { t, taken, past: at <= new Date(now.getTime() + 60 * 60 * 1000) };
        });
}

function setStep(n) {
    $$('.book-steps li').forEach((li) => li.classList.toggle('on', Number(li.dataset.s) <= n));
}

function renderDays() {
    const days = openDays();
    if (!book.day || !days.some((d) => dateKey(d) === book.day)) {
        const first = days.find((d) => slotsFor(d).some((s) => !s.taken && !s.past));
        book.day = first ? dateKey(first) : null;
    }
    $('#days').replaceChildren(...days.map((d) => {
        const free = slotsFor(d).filter((s) => !s.taken && !s.past).length;
        return h('button', {
            type: 'button', class: 'day', 'aria-pressed': String(dateKey(d) === book.day), disabled: !free,
            onclick: () => { book.day = dateKey(d); book.time = null; renderDays(); setStep(2); },
        },
        h('span', { class: 'mono', text: d.toLocaleDateString('en-US', { weekday: 'short' }) }),
        h('b', { text: String(d.getDate()) }),
        h('small', { class: 'mono', text: free ? `${free} open` : 'Full' }));
    }));
    renderSlots();
}

function renderSlots() {
    const day = book.day ? new Date(book.day + 'T00:00:00') : null;
    const slots = day ? slotsFor(day) : [];
    $('#slots').replaceChildren(...slots.map((s) => h('button', {
        type: 'button', class: 'slot', 'aria-pressed': String(s.t === book.time), disabled: s.taken || s.past,
        onclick: () => { book.time = s.t; renderSlots(); setStep(3); $('#f-name').focus({ preventScroll: true }); },
    }, clock(s.t), s.taken ? h('small', { class: 'mono', text: 'taken' }) : null)));
    const picked = $('#book-picked');
    if (day && book.time) {
        picked.textContent = `${day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${clock(book.time)} · ${CONSULT.minutes} min`;
        picked.classList.add('ok');
    } else {
        picked.textContent = day ? 'Now pick a time.' : 'Pick a day and a time above.';
        picked.classList.remove('ok');
    }
}

function renderMine() {
    const list = bookings().filter((b) => new Date(b.day + 'T' + b.time) > new Date());
    $('#mine').hidden = !list.length;
    $('#mine-list').replaceChildren(...list.map((b) => {
        const d = new Date(b.day + 'T' + b.time);
        const prog = PROGRAMS.find((p) => p.id === b.program);
        return h('li', {},
            h('span', {}, h('b', { text: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + clock(b.time) }),
                h('small', { class: 'mono', text: `${b.name} · ${prog ? prog.name : ''}` })),
            h('button', {
                type: 'button', class: 'btn btn-line', text: 'Cancel',
                onclick: () => {
                    store.set(BOOK_KEY, bookings().filter((x) => x.id !== b.id));
                    renderMine(); renderDays(); toast('Consult cancelled. The slot is open again.');
                },
            }));
    }));
}

function initBooking() {
    $('#f-program').replaceChildren(...PROGRAMS.map((p) => h('option', { value: p.id, text: p.name })), h('option', { value: 'unsure', text: 'Not sure yet' }));
    $('#f-goals').replaceChildren(...CONSULT.goals.map((g) => h('button', {
        type: 'button', class: 'chip', 'aria-pressed': 'false', text: g,
        onclick: (e) => {
            const on = !book.goals.has(g);
            on ? book.goals.add(g) : book.goals.delete(g);
            e.currentTarget.setAttribute('aria-pressed', String(on));
        },
    })));

    $('#book-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const err = $('#form-error');
        const name = $('#f-name').value.trim();
        const email = $('#f-email').value.trim();
        $$('#book-form .bad').forEach((x) => x.classList.remove('bad'));
        let msg = '';
        if (!book.day || !book.time) msg = 'Pick a day and a time first.';
        else if (!name) { msg = 'Tell us your name.'; $('#f-name').classList.add('bad'); }
        else if (!/^\S+@\S+\.\S+$/.test(email)) { msg = 'That email doesn’t look right.'; $('#f-email').classList.add('bad'); }
        err.textContent = msg;
        if (msg) return;

        const entry = {
            id: Date.now().toString(36), day: book.day, time: book.time, name, email,
            phone: $('#f-phone').value.trim(), program: $('#f-program').value,
            goals: [...book.goals], notes: $('#f-notes').value.trim(),
        };
        store.set(BOOK_KEY, [...bookings(), entry]);
        const d = new Date(entry.day + 'T' + entry.time);
        toast(`Booked: ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}, ${clock(entry.time)}. See you on the floor, ${name.split(' ')[0]}.`);
        e.target.reset();
        book.time = null; book.goals.clear();
        $$('#f-goals .chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
        setStep(1);
        renderDays(); renderMine();
    });
    renderDays();
    renderMine();
}

// ---- Visit + FAQ -------------------------------------------------------------
function renderVisit() {
    $('#visit-addr').replaceChildren(...STUDIO.address.flatMap((l, i) => i ? [h('br'), l] : [l]));
    $('#visit-note').textContent = STUDIO.addressNote;
    const today = new Date().getDay();
    $('#hours').replaceChildren(...HOURS.map(([d, hrs]) => h('tr', { class: DAY_INDEX[d] === today ? 'today' : '' },
        h('th', { scope: 'row', text: d }),
        h('td', { text: hrs ? `${clock(hrs[0])} – ${clock(hrs[1])}` : 'Closed' }))));
    $('#visit-contact').replaceChildren(
        h('a', { href: 'tel:' + STUDIO.phone.replace(/[^\d+]/g, ''), text: STUDIO.phone }), h('br'),
        h('a', { href: 'mailto:' + STUDIO.email, text: STUDIO.email }));
    $('#faq-list').replaceChildren(...FAQ.map((f, i) => h('details', { class: 'qa', open: i === 0 },
        h('summary', {}, h('span', { text: f.q }), h('i', { 'aria-hidden': 'true' })),
        h('p', { class: 'mono', text: f.a }))));
}

// ---- Nav ---------------------------------------------------------------------
function initNav() {
    const nav = $('#nav');
    const toggle = $('#nav-toggle');
    const onScroll = () => nav.classList.toggle('solid', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $$('#nav-links a, .nav-cta').forEach((a) => a.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
    }));
}

renderBasics();
renderOpenNow();
renderBoard();
renderPhases();
renderTrain();
renderCoaches();
renderLogbook();
initCalc();
initBooking();
renderVisit();
initNav();
