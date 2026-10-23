// ===================================================================
// Porthole Laundry — all the content lives here. Edit freely.
// ===================================================================

const BUSINESS = {
    name: 'Porthole',
    street: '418 Tumble Street',
    city: 'Eastside, OR 97214',
    since: 'Est. 2009',
    phone: '(503) 555-0148',
    email: 'hello@portholelaundry.example',
    // Used for the map and the "Get directions" link.
    lat: 45.5231,
    lng: -122.6465,
};

// 24-hour times, "24:00" means midnight. Day 0 is Sunday.
const HOURS = [
    { day: 'Sunday', open: '07:00', close: '22:00' },
    { day: 'Monday', open: '06:00', close: '24:00' },
    { day: 'Tuesday', open: '06:00', close: '24:00' },
    { day: 'Wednesday', open: '06:00', close: '24:00' },
    { day: 'Thursday', open: '06:00', close: '24:00' },
    { day: 'Friday', open: '06:00', close: '24:00' },
    { day: 'Saturday', open: '07:00', close: '24:00' },
];
const LAST_WASH_MINUTES = 60; // last wash starts this long before closing

// Washer sizes and what they cost per cycle.
const WASHERS = [
    { id: 'reg', name: 'Regular · 20 lb', short: '20 lb', price: 3.75, minutes: 28 },
    { id: 'big', name: 'Big · 40 lb', short: '40 lb', price: 6.5, minutes: 32 },
    { id: 'giant', name: 'Giant · 60 lb', short: '60 lb', price: 9.25, minutes: 36 },
];
const DRYER = { price: 0.25, minutes: 8 }; // $0.25 buys 8 minutes
const FOLD = { perLb: 1.95, minimum: 25, lbPerBag: 15 };
const EXTRAS = [
    { id: 'soap', name: 'Detergent pod', price: 1.0 },
    { id: 'soft', name: 'Softener', price: 0.75 },
    { id: 'sheets', name: 'Dryer sheets', price: 0.5 },
];

// The machines on the floor. type: washer | dryer. size: a WASHERS id for washers.
const MACHINES = [
    ...Array.from({ length: 10 }, (_, i) => ({ no: i + 1, type: 'washer', size: 'reg' })),
    ...Array.from({ length: 4 }, (_, i) => ({ no: i + 11, type: 'washer', size: i < 3 ? 'big' : 'giant' })),
    ...Array.from({ length: 10 }, (_, i) => ({ no: i + 15, type: 'dryer', minutes: 40 })),
];
const OUT_OF_ORDER = [12]; // machine numbers waiting for a repair

// start: the hour (24h) the pickup window opens.
const PICKUP_SLOTS = [
    { label: '8–10am', start: 8 },
    { label: '12–2pm', start: 12 },
    { label: '5–7pm', start: 17 },
    { label: '7–9pm', start: 19 },
];
const PICKUP_DAYS_AHEAD = 6;

const AMENITIES = [
    { name: 'Free Wi-Fi & outlets', note: 'At every seat' },
    { name: 'Espresso bar', note: '7–11am daily' },
    { name: 'Attendant on site', note: 'Until 10pm' },
    { name: 'Tables that fit a king sheet', note: 'Folding, not elbows' },
    { name: 'Kids’ corner', note: 'Books & blocks' },
];

const TICKER = [
    'Open 6am–midnight', 'Last wash 11pm', 'Attendant on site', 'Free Wi-Fi',
    'Card & coin', 'Wash & fold $1.95/lb', '24-hour turnaround', 'Espresso 7–11am',
];

const FAQS = [
    { q: 'Do I need coins?', a: 'No. Every machine takes cards and phones, and there is a change machine by the door if you prefer quarters.' },
    { q: 'Can I bring my own detergent?', a: 'Of course. If you forget, pods, softener and dryer sheets are sold at the counter.' },
    { q: 'How does wash & fold work?', a: 'Drop your bag at the counter or book a pickup. We weigh it, wash it on your preferences, fold it and have it ready (or back at your door) within 24 hours.' },
    { q: 'What if a machine eats my money?', a: 'Tell the attendant or call us. We refund on the spot or add credit to your next wash.' },
    { q: 'Do you wash comforters and sleeping bags?', a: 'Yes. Our 60 lb giants take a king comforter easily. For down, use a low-heat dry and add a few extra minutes.' },
    { q: 'Is there parking?', a: 'Six free spaces behind the building, plus a loading spot right by the door for heavy baskets.' },
];

// ===================================================================
// Below here: how the page works.
// ===================================================================

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const money = (n) => '$' + n.toFixed(2).replace(/\.00$/, '');
const money2 = (n) => '$' + n.toFixed(2);
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } },
};

function fmtTime(t) {
    let m = toMin(t);
    if (m >= 1440) return '12AM';
    const h = Math.floor(m / 60), mm = m % 60;
    const ap = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return h12 + (mm ? ':' + String(mm).padStart(2, '0') : '') + ap;
}

// ---------- toast ----------
let toastTimer;
function toast(msg) {
    const t = $('[data-toast]');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 5000);
}

// ---------- business details ----------
function fillBusiness() {
    $$('[data-biz]').forEach((el) => { const v = BUSINESS[el.dataset.biz]; if (v) el.textContent = v; });
    const tel = 'tel:' + BUSINESS.phone.replace(/[^\d+]/g, '');
    $$('[data-call]').forEach((a) => { a.href = tel; if (!a.textContent.trim() || a.closest('.foot')) a.textContent = BUSINESS.phone; });
    $$('[data-call]').forEach((a) => { if (a.classList.contains('btn')) a.textContent = 'Call ' + BUSINESS.phone; });
    $$('[data-email]').forEach((a) => { a.href = 'mailto:' + BUSINESS.email; a.textContent = BUSINESS.email; });
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    const dest = encodeURIComponent(`${BUSINESS.street}, ${BUSINESS.city}`);
    $$('[data-directions]').forEach((a) => { a.href = `https://www.google.com/maps/dir/?api=1&destination=${dest}`; });
    const d = 0.006;
    const bbox = [BUSINESS.lng - d, BUSINESS.lat - d * 0.7, BUSINESS.lng + d, BUSINESS.lat + d * 0.7].join(',');
    $$('[data-map]').forEach((f) => { f.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${BUSINESS.lat},${BUSINESS.lng}`; });
    const cheapest = Math.min(...WASHERS.map((w) => w.price));
    $$('[data-price="cheapest"]').forEach((el) => { el.textContent = money2(cheapest); });
    $$('[data-price="fold"]').forEach((el) => { el.textContent = money2(FOLD.perLb); });
    $$('[data-price="fold-min"]').forEach((el) => { el.textContent = money(FOLD.minimum); });
    const items = [...TICKER, ...TICKER].map((t) => `<span>${t}</span><span class="tick-star">✺</span>`).join('');
    $('[data-ticker]').innerHTML = items + items;
}

// ---------- hours / open now ----------
function openState(now = new Date()) {
    const day = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    const today = HOURS[day];
    const o = toMin(today.open), c = toMin(today.close);
    if (mins >= o && mins < c) {
        const lastWash = c - LAST_WASH_MINUTES;
        const left = c - mins;
        return { open: true, short: `Open · til ${fmtTime(today.close)}`,
            long: left <= 60 ? `Open — closing in ${left} min` : `Open now — closes ${fmtTime(today.close)}${mins >= lastWash ? ' (washers closed)' : ''}` };
    }
    // find next opening
    for (let i = 0; i < 8; i++) {
        const d = (day + i) % 7;
        const h = HOURS[d];
        if (i === 0 && mins >= toMin(h.open)) continue;
        const when = i === 0 ? 'today' : i === 1 ? 'tomorrow' : h.day;
        return { open: false, short: `Closed · opens ${fmtTime(h.open)}`, long: `Closed — opens ${when} at ${fmtTime(h.open)}` };
    }
    return { open: false, short: 'Closed', long: 'Closed' };
}

function renderHours() {
    const s = openState();
    $$('[data-open-status]').forEach((el) => { el.textContent = s.short; });
    $$('[data-open-status-long]').forEach((el) => { el.textContent = s.long; });
    $$('[data-open-led]').forEach((el) => { el.className = 'led ' + (s.open ? 'led-green' : 'led-red'); });
    const today = new Date().getDay();
    const rows = [1, 2, 3, 4, 5, 6, 0].map((d) => {
        const h = HOURS[d];
        return `<tr${d === today ? ' class="is-today" aria-current="date"' : ''}><th scope="row">${h.day}${d === today ? ' <em>today</em>' : ''}</th><td>${fmtTime(h.open)} – ${fmtTime(h.close)}</td></tr>`;
    }).join('');
    const tbl = $('[data-hours-table]');
    tbl.innerHTML = '<caption class="sr">Opening hours</caption>' + rows;
    // The big headline shows the most common weekday hours.
    const wk = HOURS[3];
    $('[data-hours-big]').innerHTML = `${fmtTime(wk.open)}<span>–</span>${fmtTime(wk.close)}`;
    $('[data-last-wash]').textContent = `Last wash starts ${LAST_WASH_MINUTES} min before closing. Dryers run until close.`;
}

// ---------- machine board (simulated live data) ----------
const washerById = Object.fromEntries(WASHERS.map((w) => [w.id, w]));
let machines = [];
let filter = 'all';
let selected = null;
const reminders = new Set();

function cycleMinutes(m) { return m.type === 'washer' ? washerById[m.size].minutes : m.minutes; }

function seedMachines() {
    const now = Date.now();
    machines = MACHINES.map((m, i) => {
        const broken = OUT_OF_ORDER.includes(m.no);
        // A stable-looking mix: roughly 40% running at load.
        const busy = !broken && ((i * 7 + 3) % 5 < 2);
        const total = cycleMinutes(m) * 60000;
        const ends = busy ? now + total * (0.15 + ((i * 37) % 80) / 100) : 0;
        return { ...m, broken, ends };
    });
}

function remaining(m, now = Date.now()) { return Math.max(0, m.ends - now); }
function isFree(m, now) { return !m.broken && remaining(m, now) === 0; }
function clock(ms) {
    const s = Math.ceil(ms / 1000);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function machineLabel(m) { return (m.type === 'washer' ? 'W' : 'D') + String(m.no).padStart(2, '0'); }
function machineDesc(m) { return m.type === 'washer' ? `${washerById[m.size].short} washer` : 'Dryer'; }

function buildBoard() {
    const grid = $('[data-board]');
    grid.innerHTML = machines.map((m) => `
        <button type="button" class="mach mach-${m.type}" role="listitem" data-no="${m.no}">
            <span class="mach-no">${machineLabel(m)}</span>
            <span class="mach-door"><span class="mach-drum"></span></span>
            <span class="mach-size">${m.type === 'washer' ? washerById[m.size].short : m.minutes + ' min'}</span>
            <span class="mach-state"><i class="led"></i><span class="mach-time"></span></span>
            <span class="mach-bell" aria-hidden="true">●</span>
        </button>`).join('');
    grid.addEventListener('click', (e) => {
        const b = e.target.closest('.mach');
        if (!b) return;
        const m = machines.find((x) => x.no === Number(b.dataset.no));
        selected = selected === m.no ? null : m.no;
        renderPanel();
        tickBoard();
    });
}

function tickBoard() {
    const now = Date.now();
    let free = 0;
    for (const m of machines) {
        const el = $(`.mach[data-no="${m.no}"]`);
        const rem = remaining(m, now);
        const state = m.broken ? 'broken' : rem > 0 ? 'busy' : 'free';
        if (state === 'free') free++;
        // A reminder fires once, when its machine finishes.
        if (reminders.has(m.no) && state === 'free') {
            reminders.delete(m.no);
            const msg = `${machineLabel(m)} is done — time to swap your load.`;
            toast(msg);
            if ('Notification' in window && Notification.permission === 'granted') {
                try { new Notification(BUSINESS.name + ' Laundry', { body: msg }); } catch { /* not allowed here */ }
            }
            if (selected === m.no) renderPanel();
        }
        el.dataset.state = state;
        el.classList.toggle('is-selected', selected === m.no);
        el.classList.toggle('has-bell', reminders.has(m.no));
        el.hidden = !(filter === 'all' || filter === m.type || (filter === 'free' && state === 'free'));
        el.querySelector('.led').className = 'led ' + (state === 'free' ? 'led-green' : state === 'busy' ? 'led-amber' : 'led-red');
        el.querySelector('.mach-time').textContent = state === 'free' ? 'FREE' : state === 'busy' ? clock(rem) : 'OUT';
        el.setAttribute('aria-label', `${machineLabel(m)}, ${machineDesc(m)}, ${state === 'free' ? 'free' : state === 'busy' ? clock(rem) + ' left' : 'out of order'}`);
    }
    $$('[data-free-count]').forEach((el) => { el.textContent = free; });
    $$('[data-total-count]').forEach((el) => { el.textContent = machines.filter((m) => !m.broken).length; });
    if (selected) {
        const m = machines.find((x) => x.no === selected);
        const t = $('[data-panel-time]');
        if (t && remaining(m, now) > 0) t.textContent = clock(remaining(m, now));
    }
}

// Someone walks in now and then: start a random free machine.
function simulateCustomers() {
    const free = machines.filter((m) => isFree(m) && m.no !== selected);
    if (free.length > 6 && Math.random() < 0.5) {
        const m = free[Math.floor(Math.random() * free.length)];
        m.ends = Date.now() + cycleMinutes(m) * 60000;
    }
}

function renderPanel() {
    const p = $('[data-board-panel]');
    if (!selected) { p.hidden = true; p.innerHTML = ''; return; }
    const m = machines.find((x) => x.no === selected);
    const rem = remaining(m);
    let body;
    if (m.broken) {
        body = `<p><b>${machineLabel(m)}</b> · ${machineDesc(m)}</p><p>Out of order — a repair is booked. Try another one nearby.</p>`;
    } else if (rem === 0) {
        const price = m.type === 'washer' ? `${money2(washerById[m.size].price)} · ${washerById[m.size].minutes} min cycle` : `${money2(DRYER.price)} per ${DRYER.minutes} min`;
        body = `<p><b>${machineLabel(m)}</b> · ${machineDesc(m)}</p><p class="panel-free">Free right now. ${price}.</p>`;
    } else {
        const on = reminders.has(m.no);
        body = `<p><b>${machineLabel(m)}</b> · ${machineDesc(m)} · <span data-panel-time>${clock(rem)}</span> left</p>
            <button type="button" class="btn ${on ? 'btn-ghost' : 'btn-lemon'}" data-remind>${on ? 'Cancel reminder' : 'Remind me when it’s done'}</button>`;
    }
    p.innerHTML = body + '<button type="button" class="panel-x" data-panel-close aria-label="Close">×</button>';
    p.hidden = false;
}

function initBoard() {
    seedMachines();
    buildBoard();
    $('.board-filter').addEventListener('click', (e) => {
        const b = e.target.closest('[data-filter]');
        if (!b) return;
        filter = b.dataset.filter;
        $$('.board-filter [data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        tickBoard();
    });
    $('[data-board-panel]').addEventListener('click', (e) => {
        if (e.target.closest('[data-panel-close]')) { selected = null; renderPanel(); tickBoard(); return; }
        if (e.target.closest('[data-remind]')) {
            const m = machines.find((x) => x.no === selected);
            if (reminders.has(m.no)) {
                reminders.delete(m.no);
                toast(`Reminder for ${machineLabel(m)} cancelled.`);
            } else {
                reminders.add(m.no);
                toast(`We’ll ping you when ${machineLabel(m)} finishes. Keep this page open.`);
                if ('Notification' in window && Notification.permission === 'default') {
                    try { Notification.requestPermission(); } catch { /* ignore */ }
                }
            }
            renderPanel();
            tickBoard();
        }
    });
    tickBoard();
    setInterval(tickBoard, 1000);
    setInterval(simulateCustomers, 9000);
}

// ---------- price list + calculator ----------
const calc = { washers: { reg: 1, big: 0, giant: 0 }, dry: 32, extras: new Set(['soap']) };

function renderPriceList() {
    const rows = [
        ...WASHERS.map((w) => [`Wash · ${w.name}`, money2(w.price), `${w.minutes} min`]),
        ['Dry · any dryer', money2(DRYER.price), `per ${DRYER.minutes} min`],
        ['Wash & fold', money2(FOLD.perLb) + '/lb', `${money(FOLD.minimum)} min.`],
        ...EXTRAS.map((x) => [x.name, money2(x.price), 'at the counter']),
    ];
    $('[data-price-list]').innerHTML = '<dl>' + rows.map(([a, b, c]) =>
        `<div class="pl-row"><dt>${a}</dt><dd class="pl-price mono">${b}</dd><dd class="pl-note mono">${c}</dd></div>`).join('') + '</dl>';
}

function renderCalc() {
    const box = $('[data-calc-washers]');
    box.innerHTML = WASHERS.map((w) => `
        <div class="receipt-row">
            <span class="rr-name">${w.short} wash <small>× ${money2(w.price)}</small></span>
            <span class="stepper">
                <button type="button" data-step="${w.id}" data-d="-1" aria-label="Fewer ${w.short} washes">−</button>
                <output data-count="${w.id}" aria-live="polite">${calc.washers[w.id]}</output>
                <button type="button" data-step="${w.id}" data-d="1" aria-label="More ${w.short} washes">+</button>
            </span>
        </div>`).join('');
    const ex = $('[data-calc-extras]');
    ex.insertAdjacentHTML('beforeend', EXTRAS.map((x) => `
        <label class="receipt-check"><input type="checkbox" value="${x.id}" ${calc.extras.has(x.id) ? 'checked' : ''}>
        <span>${x.name}</span><span>${money2(x.price)}</span></label>`).join(''));
    box.addEventListener('click', (e) => {
        const b = e.target.closest('[data-step]');
        if (!b) return;
        const id = b.dataset.step;
        calc.washers[id] = Math.max(0, Math.min(9, calc.washers[id] + Number(b.dataset.d)));
        $(`[data-count="${id}"]`).textContent = calc.washers[id];
        updateCalc();
    });
    $('[data-calc-dry]').addEventListener('input', (e) => { calc.dry = Number(e.target.value); updateCalc(); });
    ex.addEventListener('change', (e) => {
        if (e.target.checked) calc.extras.add(e.target.value); else calc.extras.delete(e.target.value);
        updateCalc();
    });
    updateCalc();
}

function updateCalc() {
    const loads = Object.values(calc.washers).reduce((a, b) => a + b, 0);
    const washCost = WASHERS.reduce((s, w) => s + w.price * calc.washers[w.id], 0);
    const dryCost = loads ? (calc.dry / DRYER.minutes) * DRYER.price * loads : 0;
    const extras = EXTRAS.filter((x) => calc.extras.has(x.id)).reduce((s, x) => s + x.price * loads, 0);
    const total = washCost + dryCost + extras;
    $('[data-calc-dry-label]').textContent = calc.dry ? `${calc.dry} min · ${money2((calc.dry / DRYER.minutes) * DRYER.price)}/load` : 'No drying';
    $('[data-calc-total]').textContent = money2(total);
    const longest = Math.max(0, ...WASHERS.filter((w) => calc.washers[w.id]).map((w) => w.minutes));
    const mins = loads ? longest + calc.dry + 10 : 0;
    $('[data-calc-time]').textContent = loads
        ? `${loads} load${loads > 1 ? 's' : ''} side by side · ready in about ${mins >= 60 ? Math.floor(mins / 60) + ' hr ' : ''}${mins % 60 ? (mins % 60) + ' min' : ''}`
        : 'Add a wash to get started';
}

// ---------- wash & fold pickup ----------
const pickup = { day: 0, slot: 0, bags: 2 };

function pickupDays() {
    const out = [];
    const d = new Date();
    for (let i = 0; i <= PICKUP_DAYS_AHEAD; i++) {
        const x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i);
        out.push({ date: x, label: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : x.toLocaleDateString('en-US', { weekday: 'short' }), sub: x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) });
    }
    return out;
}

// Today's windows close for booking an hour before they start.
function slotPassed(dayIndex, slot) {
    return dayIndex === 0 && new Date().getHours() >= slot.start - 1;
}

function renderPickup() {
    const days = pickupDays();
    const dayBox = $('[data-days]');
    dayBox.insertAdjacentHTML('beforeend', days.map((d, i) => `
        <label class="chip"><input type="radio" name="day" value="${i}"><span><b>${d.label}</b><small>${d.sub}</small></span></label>`).join(''));
    const slotBox = $('[data-slots]');
    slotBox.insertAdjacentHTML('beforeend', PICKUP_SLOTS.map((s, i) => `
        <label class="chip"><input type="radio" name="slot" value="${i}"><span><b>${s.label}</b></span></label>`).join(''));
    dayBox.addEventListener('change', (e) => { pickup.day = Number(e.target.value); syncSlots(); });
    slotBox.addEventListener('change', (e) => { pickup.slot = Number(e.target.value); });
    $$('[data-bags]').forEach((b) => b.addEventListener('click', () => {
        pickup.bags = Math.max(1, Math.min(8, pickup.bags + Number(b.dataset.bags)));
        updateBags();
    }));
    // Default: the first day that still has a slot.
    pickup.day = PICKUP_SLOTS.every((s) => slotPassed(0, s)) ? 1 : 0;
    $(`[name="day"][value="${pickup.day}"]`).checked = true;
    syncSlots();
    updateBags();
    $('[data-pickup]').addEventListener('submit', submitPickup);
    renderClaims();
}

function syncSlots() {
    let first = -1;
    $$('[name="slot"]').forEach((r, i) => {
        r.disabled = slotPassed(pickup.day, PICKUP_SLOTS[i]);
        if (!r.disabled && first < 0) first = i;
    });
    const cur = $(`[name="slot"][value="${pickup.slot}"]`);
    if (!cur || cur.disabled) pickup.slot = Math.max(0, first);
    $(`[name="slot"][value="${pickup.slot}"]`).checked = true;
}

function bagEstimate() {
    const lb = pickup.bags * FOLD.lbPerBag;
    return { lb, price: Math.max(FOLD.minimum, lb * FOLD.perLb) };
}

function updateBags() {
    $('[data-bags-n]').textContent = pickup.bags;
    const { lb, price } = bagEstimate();
    $('[data-bags-est]').textContent = `about ${lb} lb · est. ${money2(price)}`;
}

function submitPickup(e) {
    e.preventDefault();
    const f = e.target;
    const err = $('[data-pickup-err]');
    const name = f.name.value.trim(), phone = f.phone.value.trim(), address = f.address.value.trim();
    $$('.field input', f).forEach((i) => i.removeAttribute('aria-invalid'));
    const bad = [];
    if (!name) bad.push(['name', 'your name']);
    if (phone.replace(/\D/g, '').length < 7) bad.push(['phone', 'a phone number we can text']);
    if (address.length < 5) bad.push(['address', 'a pickup address']);
    if (bad.length) {
        bad.forEach(([n]) => f[n].setAttribute('aria-invalid', 'true'));
        err.textContent = 'We need ' + bad.map((b) => b[1]).join(', ') + '.';
        f[bad[0][0]].focus();
        return;
    }
    err.textContent = '';
    const days = pickupDays();
    const { lb, price } = bagEstimate();
    const claim = {
        no: 'PL-' + String(Math.floor(1000 + Math.random() * 9000)),
        name, phone, address, notes: f.notes.value.trim(),
        date: days[pickup.day].date.toISOString(), slot: PICKUP_SLOTS[pickup.slot].label,
        bags: pickup.bags, lb, price,
    };
    const list = store.get('porthole-claims', []);
    list.unshift(claim);
    store.set('porthole-claims', list.slice(0, 5));
    f.reset();
    pickup.bags = 2;
    $(`[name="day"][value="${pickup.day}"]`).checked = true;
    syncSlots();
    updateBags();
    renderClaims(true);
    toast(`Booked! Claim ${claim.no}. We’ll text ${phone} when the driver is on the way.`);
}

function renderClaims(fresh) {
    const list = store.get('porthole-claims', []);
    const box = $('[data-claims]');
    if (!list.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<p class="mono label">Your pickups</p>' + list.map((c, i) => {
        const d = new Date(c.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return `<div class="claim${fresh && i === 0 ? ' is-new' : ''}">
            <span class="claim-no mono">${c.no}</span>
            <span class="claim-when">${d} · ${c.slot}</span>
            <span class="claim-meta mono">${c.bags} bag${c.bags > 1 ? 's' : ''} · est. ${money2(c.price)}</span>
            <button type="button" class="claim-x mono" data-cancel="${c.no}">Cancel</button>
        </div>`;
    }).join('');
}

function initClaims() {
    $('[data-claims]').addEventListener('click', (e) => {
        const b = e.target.closest('[data-cancel]');
        if (!b) return;
        store.set('porthole-claims', store.get('porthole-claims', []).filter((c) => c.no !== b.dataset.cancel));
        renderClaims();
        toast(`Pickup ${b.dataset.cancel} cancelled.`);
    });
}

// ---------- amenities + FAQ ----------
function renderLists() {
    $('[data-amenities]').innerHTML = AMENITIES.map((a, i) =>
        `<li><span class="mono room-n">${String(i + 1).padStart(2, '0')}</span><span class="room-name">${a.name}</span><span class="mono room-note">${a.note}</span></li>`).join('');
    $('[data-faq]').innerHTML = FAQS.map((f, i) => `
        <details${i === 0 ? ' open' : ''}><summary><span class="mono faq-n">Q${i + 1}</span><span>${f.q}</span><i aria-hidden="true"></i></summary><p>${f.a}</p></details>`).join('');
}

// ---------- header ----------
function initHeader() {
    const btn = $('.bar-menu');
    const bar = $('.bar');
    btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', String(open));
        bar.classList.toggle('is-open', open);
    });
    $$('#nav a').forEach((a) => a.addEventListener('click', () => {
        btn.setAttribute('aria-expanded', 'false');
        bar.classList.remove('is-open');
    }));
    const onScroll = () => bar.classList.toggle('is-scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

// ---------- edge-to-edge wordmarks ----------
function fitText() {
    $$('.hero-word, .foot-word').forEach((el) => {
        const box = el.parentElement;
        const cs = getComputedStyle(box);
        const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        el.style.fontSize = '100px';
        el.style.fontSize = (100 * avail / el.scrollWidth) + 'px';
    });
}

fillBusiness();
fitText();
if (document.fonts) document.fonts.ready.then(fitText);
window.addEventListener('resize', fitText);
renderHours();
setInterval(renderHours, 30000);
initBoard();
renderPriceList();
renderCalc();
renderPickup();
initClaims();
renderLists();
initHeader();
