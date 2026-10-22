// Tallymark Tax Co. — a one-page site for an independent tax preparation office.
//
// Everything a business would change is plain data in this first part of the
// file: contact details, deadlines, fees, the document checklist, the team,
// reviews and questions. The page is rendered from it below, so a change here
// shows up everywhere it is used (the fee worksheet, the situation tabs, the
// checklist and the booking request all read the same FEES).

// ---- The business ----------------------------------------------------------

const BUSINESS = {
    name: 'Tallymark Tax Co.',
    brandName: 'Tallymark',
    brandTag: 'Tax Co.',
    phone: '(555) 014-2290',
    email: 'hello@tallymarktax.com',
    address: ['214 Linden Street, Suite 2', 'Fairhaven, MA 02719'],
    hours: [
        { season: 'January to April 15', rows: [['Mon–Fri', '8am–7pm'], ['Saturday', '9am–3pm']] },
        { season: 'The rest of the year', rows: [['Tue–Thu', '9am–5pm']] },
    ],
    // Booking requests are POSTed here as JSON when set (Formspree, a Puter
    // worker, any endpoint that accepts JSON). Left empty, the form opens an
    // email draft to `email` with the request filled in.
    formEndpoint: '',
};

// Federal deadlines, by month and day. A date that falls on a weekend moves
// to the next business day; holidays are not accounted for.
const DEADLINES = [
    { month: 1, day: 15, title: '4th-quarter estimated tax payment' },
    { month: 3, day: 15, title: 'S-corp and partnership returns' },
    { month: 4, day: 15, title: 'Individual returns, extensions and 1st-quarter estimates' },
    { month: 6, day: 15, title: '2nd-quarter estimated tax payment' },
    { month: 9, day: 15, title: '3rd-quarter estimates and extended business returns' },
    { month: 10, day: 15, title: 'Extended individual returns' },
];

// The fee worksheet. Each line is a flat price; `max` makes it countable
// (per business, per property…), `included` units are free, and `days` is
// what the line adds to the turnaround, as a [low, high] range.
const FEES = [
    { id: 'base', title: 'Federal return', form: '1040', note: 'Wages, interest, retirement and Social Security income, plus credits for kids', price: 240, fixed: true, days: [5, 7] },
    { id: 'states', title: 'State returns', note: 'Your first state is included', price: 65, included: 1, default: 1, max: 6, unit: ['state', 'states'], days: [0, 0] },
    { id: 'itemized', title: 'Itemized deductions', form: 'Sch. A', note: 'Mortgage interest, property tax, larger gifts to charity', price: 75, days: [0, 1] },
    { id: 'business', title: 'Freelance or side business', form: 'Sch. C', note: 'Per business, including self-employment tax', price: 185, max: 5, unit: ['business', 'businesses'], days: [1, 2] },
    { id: 'rental', title: 'Rental property', form: 'Sch. E', note: 'Per property, with depreciation', price: 125, max: 10, unit: ['property', 'properties'], days: [1, 1] },
    { id: 'investments', title: 'Stock, fund or crypto sales', form: 'Sch. D', note: 'Any number of brokerage statements', price: 90, days: [0, 1] },
    { id: 'entity', title: 'S-corp or partnership return', form: '1120-S / 1065', note: 'Per entity, K-1s for every owner included', price: 750, max: 5, unit: ['entity', 'entities'], days: [4, 6] },
    { id: 'prior', title: 'Unfiled past years', note: 'Per year, IRS transcripts pulled for you', price: 210, max: 6, unit: ['year', 'years'], days: [3, 5] },
];

// "Who we help" tabs. `preset` is what "Price my return" puts on the fee
// worksheet (anything not listed goes back to its default), and the "from"
// price on each tab is that preset's total.
const SITUATIONS = [
    {
        id: 'family', label: 'W-2 & family',
        title: 'Paychecks, kids and maybe a mortgage.',
        body: 'Most of our returns look like this, and most still leave money on the table. We check every credit and whether itemizing beats the standard deduction.',
        handles: ['Child tax and dependent care credits', 'Itemized vs. standard deduction, checked both ways', 'Education credits and 529 withdrawals', 'A W-4 checkup so next April holds no surprises'],
        forms: ['1040', 'Schedule A', '2441', '8863'],
        preset: { itemized: 1 },
    },
    {
        id: 'freelance', label: 'Freelance & 1099',
        title: 'Self-employed, full time or on the side.',
        body: "You keep the receipts, we find the deductions, and you leave with quarterly payment reminders so January isn't a shock.",
        handles: ["Schedule C with every expense you're owed", 'Home office and vehicle deductions', 'Quarterly estimate vouchers for next year', 'SEP-IRA or solo 401(k) contribution math'],
        forms: ['Schedule C', 'Schedule SE', '8829', '1040-ES'],
        preset: { business: 1 },
    },
    {
        id: 'business', label: 'Small business',
        title: 'S-corps, partnerships and LLCs.',
        body: "Business and personal returns prepared together, by the same CPA, with a planning call in November while there's still time to act.",
        handles: ['1120-S and 1065 returns with K-1s', 'Reasonable salary review for S-corp owners', 'Contractor 1099s filed in January', 'A year-end planning call every November'],
        forms: ['1120-S', '1065', 'K-1', '1099-NEC'],
        preset: { entity: 1, itemized: 1 },
    },
    {
        id: 'landlord', label: 'Landlords',
        title: 'One rental or a dozen.',
        body: 'Depreciation schedules kept year to year, repairs sorted from improvements, and short-term rentals handled properly.',
        handles: ['Depreciation schedules carried forward', 'Repairs vs. improvements, sorted', 'Short-term and vacation rental rules', 'Passive loss limits and carryovers'],
        forms: ['Schedule E', '4562', '8582'],
        preset: { rental: 1, itemized: 1 },
    },
    {
        id: 'retired', label: 'Retired',
        title: 'Social Security, pensions and RMDs.',
        body: "Retirement income has its own puzzles. We make sure withdrawals are taxed the right way and plan next year's with you.",
        handles: ['Taxable share of Social Security, worked out', 'Required minimum distributions checked', 'IRA rollovers and Roth conversions reported right', 'Charitable gifts made straight from an IRA'],
        forms: ['SSA-1099', '1099-R', '8606'],
        preset: { investments: 1 },
    },
    {
        id: 'catch-up', label: 'Behind on filing',
        title: 'A few years behind? Very fixable.',
        body: "No lectures. We pull your records from the IRS, file what's missing and set up a payment plan if you need one.",
        handles: ['IRS wage and income transcripts pulled for you', 'Missing years filed, oldest first', 'Payment plans and penalty relief requests', 'Every IRS letter answered for you'],
        forms: ['1040', '9465', '843'],
        preset: { prior: 2 },
    },
];

// The document checklist. A group with `when` only appears while that fee
// line is on the worksheet. Items are [id, text, optional note]; ids keep the
// visitor's ticks, so keep them stable when rewording.
const CHECKLIST = [
    {
        id: 'everyone', title: 'Everyone', items: [
            ['photo-id', 'Photo ID for you, and your spouse if filing jointly'],
            ['last-return', "Last year's tax return", 'Federal and state, new clients only'],
            ['ssn', 'Social Security numbers and birth dates for everyone on the return'],
            ['bank', 'Bank routing and account number', 'For a direct-deposit refund or a payment'],
            ['letters', 'Any IRS or state letters from this year'],
        ],
    },
    {
        id: 'income', title: 'Income', items: [
            ['w2', 'W-2 from every employer'],
            ['interest', '1099-INT and 1099-DIV from banks and funds'],
            ['retirement', 'SSA-1099 and 1099-R', 'Social Security, pensions and IRA withdrawals'],
            ['health', 'Form 1095-A', 'Only if you bought insurance on the marketplace'],
            ['estimates-paid', 'Dates and amounts of estimated tax payments'],
        ],
    },
    {
        id: 'deductions', title: 'Deductions', when: 'itemized', items: [
            ['1098', 'Form 1098 mortgage interest statement'],
            ['property-tax', 'Property tax bills you paid'],
            ['charity', 'Receipts for gifts to charity', 'A written receipt is needed for any single gift of $250 or more'],
            ['medical', 'Medical and dental expenses', 'Only worth gathering if they were large this year'],
        ],
    },
    {
        id: 'business', title: 'Your business', when: 'business', items: [
            ['1099-nec', '1099-NEC and 1099-K forms you received'],
            ['pl', 'Income and expense totals', 'A profit and loss report, a spreadsheet or your bookkeeping export'],
            ['mileage', 'Business mileage log'],
            ['home-office', 'Home office size and the size of your whole home'],
            ['equipment', 'Receipts for larger equipment purchases'],
        ],
    },
    {
        id: 'rentals', title: 'Rentals', when: 'rental', items: [
            ['rents', 'Rent received, per property'],
            ['rental-expenses', 'Repairs, insurance, management fees and utilities'],
            ['rental-1098', 'Form 1098 for each rental mortgage'],
            ['closing', 'Closing statement', 'If you bought or sold a property this year'],
        ],
    },
    {
        id: 'investments', title: 'Investments', when: 'investments', items: [
            ['1099-b', 'Consolidated 1099 from each brokerage'],
            ['crypto', 'Gains and losses report from any crypto exchange'],
            ['basis', 'What you paid for anything you sold that was bought long ago'],
        ],
    },
    {
        id: 'entity', title: 'S-corp or partnership', when: 'entity', items: [
            ['prior-entity', "Last year's business return"],
            ['books', 'Year-end balance sheet and profit and loss'],
            ['payroll', 'Payroll reports: W-3 and quarterly 941s'],
            ['contractors', 'Contractors you paid, with their W-9s'],
            ['k1-in', 'K-1s from any other partnership or S-corp'],
        ],
    },
    {
        id: 'catching-up', title: 'Catching up', when: 'prior', items: [
            ['notices', 'Every IRS or state notice, even unopened ones'],
            ['old-forms', 'Any W-2s and 1099s you still have for those years', "Missing some? We'll request your transcripts from the IRS"],
        ],
    },
];

const TEAM = [
    {
        name: 'Margaret Ellison', credential: 'EA', role: 'Founder · 22 years',
        photo: 'photos/preparer-margaret.jpg', alt: 'Margaret Ellison smiling in the office, arms folded',
        quote: "I'd rather spend twenty minutes explaining your return than have you sign something you don't understand.",
        specialties: ['Families', 'Retirees', 'IRS letters'],
    },
    {
        name: 'André Baptiste', credential: 'CPA', role: 'Partner · 14 years',
        photo: 'photos/preparer-andre.jpg', alt: 'André Baptiste smiling at his desk',
        quote: 'Most owners overpay because nobody looked in November. I look in November.',
        specialties: ['S-corps', 'Partnerships', 'Year-end planning'],
    },
    {
        name: 'Claire Novak', credential: 'EA', role: 'Enrolled agent · 9 years',
        photo: 'photos/preparer-claire.jpg', alt: 'Claire Novak working on a laptop at her desk',
        quote: "Behind by a few years? Very common, very fixable. Let's start with one.",
        specialties: ['Freelancers', 'Landlords', 'Back taxes'],
    },
];

const REVIEWS = [
    { name: 'Priya S.', persona: 'Freelancer', text: 'I sent a folder of crumpled 1099s and got back a finished return, a plan for quarterly payments and a reminder for each one. First year I wasn\'t dreading January.' },
    { name: 'Tom & Rosa D.', persona: 'Landlords', text: 'We bought our first rental and had no idea what depreciation was. Claire walked us through it in twenty minutes, and the fee was exactly the estimate.' },
    { name: 'Marcus L.', persona: 'Behind on filing', text: 'Three years unfiled. They pulled my transcripts, filed all three in a month and set up a payment plan I can actually afford.' },
    { name: 'Jen K.', persona: 'Small business', text: 'André does our S-corp and both our personal returns. The November planning call alone saves us more than the fee.' },
    { name: 'David R.', persona: 'Retired', text: 'Margaret finally made my mother\'s Social Security and IRA withdrawals make sense, and she never once made us feel silly for asking.' },
    { name: 'Alicia W.', persona: 'W-2 & family', text: 'Two kids, one daycare, one mortgage. Thirty minutes on video, and the refund landed in under three weeks.' },
];

const FAQ = [
    {
        q: 'How do you set your fees?',
        a: ['Flat fees by the forms your return needs, using the same worksheet you see above. We confirm the fee at your intro call before any work starts, and we never charge a percentage of your refund.'],
    },
    {
        q: 'Do I have to come to the office?',
        a: ['No. About half our clients never visit. Meet by video, upload documents to our secure portal from your phone, or leave a folder in the drop-off box by the front door.'],
    },
    {
        q: 'What if I get an IRS letter or an audit?',
        a: ['Send it to us. For three years after we file a return, we answer any IRS or state letter about it at no charge.', 'Enrolled agents and CPAs can represent you before the IRS, so most of the time you never have to speak to them yourself.'],
    },
    {
        q: 'How long until I get my refund?',
        a: ['Most individual returns are ready to review within a week of your documents arriving. Once we e-file, the IRS issues most refunds within 21 days, and we keep an eye on yours.'],
    },
    {
        q: 'I missed the deadline. Is it too late?',
        a: ["Not at all. If you're owed a refund there's no penalty for filing late, and you generally have three years to claim it. If you owe, filing sooner keeps penalties smaller, and we can ask for penalty relief where it applies."],
    },
    {
        q: "What's the difference between an EA and a CPA?",
        a: ['Both are licensed to prepare returns and represent you before the IRS. Enrolled agents are licensed by the IRS itself and work only on tax; CPAs are licensed by the state and also cover accounting and business finance. We match your preparer to your return.'],
    },
];

// ---- Helpers -----------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + n.toLocaleString('en-US');
const plural = (n, [one, many]) => `${n} ${n === 1 ? one : many}`;
const telHref = (phone) => 'tel:+1' + phone.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');

const store = {
    get(key, fallback) {
        try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
    },
    set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: not remembered */ }
    },
};

// ---- Business details --------------------------------------------------------

function fillBusiness() {
    $$('[data-biz]').forEach((el) => {
        switch (el.dataset.biz) {
            case 'brand-name': el.textContent = BUSINESS.brandName; break;
            case 'brand-tag': el.textContent = BUSINESS.brandTag; break;
            case 'legal-name': el.textContent = BUSINESS.name; break;
            case 'phone': el.textContent = BUSINESS.phone; break;
            case 'phone-link': el.href = telHref(BUSINESS.phone); break;
            case 'email': el.textContent = BUSINESS.email; break;
            case 'email-link': el.href = 'mailto:' + BUSINESS.email; break;
            case 'address': el.innerHTML = BUSINESS.address.map(esc).join('<br>'); break;
        }
    });
    $('#office-hours').innerHTML = BUSINESS.hours.map((h) =>
        h.rows.map(([days, time]) => `<span class="hours-row"><span>${esc(days)}</span><span>${esc(time)}</span></span>`).join('') +
        `<span class="hours-season">${esc(h.season)}</span>`,
    ).join('<span style="display:block;height:10px"></span>');
    $('.site-header .brand').setAttribute('aria-label', `${BUSINESS.name}, home`);
    $('#year').textContent = new Date().getFullYear();
}

// The return being prepared: last year's, until the extended deadline passes.
function taxYear(now = new Date()) {
    const pastOct15 = now.getMonth() > 9 || (now.getMonth() === 9 && now.getDate() > 15);
    return pastOct15 ? now.getFullYear() : now.getFullYear() - 1;
}

// ---- Deadlines ---------------------------------------------------------------

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

function deadlineDate({ month, day }, year) {
    const date = new Date(year, month - 1, day);
    while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
    return date;
}

function upcomingDeadlines(now = new Date()) {
    const today = startOfDay(now);
    const list = [];
    for (const year of [today.getFullYear(), today.getFullYear() + 1]) {
        for (const d of DEADLINES) {
            const date = deadlineDate(d, year);
            if (date >= today) list.push({ ...d, date, days: Math.round((date - today) / 86400000) });
        }
    }
    return list.sort((a, b) => a.date - b.date);
}

const relDays = (n) => (n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`);
const shortDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function renderDeadlines() {
    const list = upcomingDeadlines();
    const next = list[0];
    if (next) {
        const lead = next.days === 0 ? 'Due today' : 'Next federal deadline';
        $('#deadline-text').innerHTML = `${lead}: <strong>${esc(shortDate(next.date))}</strong> · ${esc(next.title)}${next.days > 0 ? ` · ${relDays(next.days)}` : '. Running late? Call us.'}`;
    }
    $('#date-list').innerHTML = list.slice(0, 5).map((d) => `
        <li class="${d.days <= 30 ? 'soon' : ''}">
            <time datetime="${d.date.toISOString().slice(0, 10)}">${esc(d.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))}</time>
            <span>${esc(d.title)}</span>
            <span class="rel">${relDays(d.days)}</span>
        </li>`).join('');
}

// ---- Fee worksheet -----------------------------------------------------------

const FEE_KEY = 'tallymark.fees';
const feeById = Object.fromEntries(FEES.map((f) => [f.id, f]));
const defaultQty = (f) => (f.fixed ? 1 : f.default || 0);
const maxQty = (f) => f.max || 1;

function clampQty(f, n) {
    if (f.fixed) return 1;
    n = Math.round(Number(n)) || 0;
    return Math.max(0, Math.min(maxQty(f), n));
}

function presetQty(preset = {}) {
    return Object.fromEntries(FEES.map((f) => [f.id, clampQty(f, preset[f.id] ?? defaultQty(f))]));
}

const saved = store.get(FEE_KEY, null);
const state = {
    qty: presetQty(saved && typeof saved === 'object' ? saved : {}),
    situation: SITUATIONS[0].id,
};

function lineItems(qty) {
    return FEES.filter((f) => qty[f.id] > 0).map((f) => {
        const n = qty[f.id];
        const billable = f.fixed ? 1 : Math.max(0, n - (f.included || 0));
        return { fee: f, n, amount: billable * f.price };
    });
}

const totalOf = (lines) => lines.reduce((sum, l) => sum + l.amount, 0);

function turnaround(lines) {
    let lo = 0, hi = 0;
    for (const { fee, n } of lines) {
        const units = fee.fixed ? 1 : n;
        lo += fee.days[0] * units;
        hi += fee.days[1] * units;
    }
    return [lo, Math.max(lo + 1, hi)];
}

function priceLabel(f) {
    if (f.fixed) return money(f.price);
    if (f.included) return `+${money(f.price)} each after ${f.included}`;
    return f.max > 1 ? `${money(f.price)} each` : money(f.price);
}

function renderFeeOptions() {
    $('#fee-option-list').innerHTML = FEES.map((f) => {
        const n = state.qty[f.id];
        const stepper = f.max > 1 && n > 0 ? `
            <div class="stepper" role="group" aria-label="How many ${esc(f.unit[1])}">
                <button type="button" data-step="-1" data-fee="${f.id}" aria-label="One fewer" ${n <= 1 ? 'disabled' : ''}>−</button>
                <output aria-live="polite">${esc(plural(n, f.unit))}</output>
                <button type="button" data-step="1" data-fee="${f.id}" aria-label="One more" ${n >= f.max ? 'disabled' : ''}>+</button>
            </div>` : '';
        return `
            <div class="fee-option">
                <input type="checkbox" id="fee-${f.id}" data-fee="${f.id}" ${n > 0 ? 'checked' : ''} ${f.fixed ? 'disabled' : ''}>
                <div>
                    <label for="fee-${f.id}">
                        <span class="opt-title">${esc(f.title)}${f.form ? `<span class="opt-form">${esc(f.form)}</span>` : ''}</span>
                        <span class="opt-note">${esc(f.note)}</span>
                    </label>
                    ${stepper}
                </div>
                <span class="opt-price">${esc(priceLabel(f))}</span>
            </div>`;
    }).join('');
}

function renderWorksheet() {
    const lines = lineItems(state.qty);
    $('#worksheet-lines').innerHTML = lines.map(({ fee, n, amount }) => {
        let qty = '';
        if (fee.max > 1 && n > 1) qty =`× ${n}${fee.included ? ` · ${fee.included} incl.` : ''}`;
        return `<li>
            <span class="desc">${esc(fee.title)}${fee.form ? ` (${esc(fee.form)})` : ''}</span>
            <span class="amt ${amount ? '' : 'zero'}">${qty ? `<span class="qty">${esc(qty)}</span>&nbsp;&nbsp;` : ''}${amount ? money(amount) : 'incl.'}</span>
        </li>`;
    }).join('');
    const total = totalOf(lines);
    const [lo, hi] = turnaround(lines);
    $('#fee-total').textContent = money(total);
    $('#attach-total').textContent = money(total);
    $('#fee-turnaround').textContent = `Ready in about ${lo}–${hi} business days once your documents are in.`;
}

function setQty(id, n) {
    const f = feeById[id];
    if (!f) return;
    state.qty[id] = clampQty(f, n);
    store.set(FEE_KEY, state.qty);
    renderFeeOptions();
    renderWorksheet();
    renderChecklist();
}

function bindFees() {
    const list = $('#fee-option-list');
    list.addEventListener('change', (e) => {
        const box = e.target.closest('input[type="checkbox"][data-fee]');
        if (!box) return;
        const f = feeById[box.dataset.fee];
        setQty(f.id, box.checked ? Math.max(1, f.default || 1) : 0);
        $(`#fee-${f.id}`).focus();
    });
    list.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-step]');
        if (!btn) return;
        const id = btn.dataset.fee;
        const step = Number(btn.dataset.step);
        setQty(id, state.qty[id] + step);
        // Keep focus on the same control after the re-render.
        const again = $(`button[data-fee="${id}"][data-step="${step}"]`);
        (again && !again.disabled ? again : $(`#fee-${id}`)).focus();
    });
    $('#fee-options').addEventListener('submit', (e) => e.preventDefault());
    $('#book-with-estimate').addEventListener('click', () => { $('#attach-estimate').checked = true; });
}

// ---- Who we help --------------------------------------------------------------

function renderSituationTabs() {
    $('#situation-tabs').innerHTML = SITUATIONS.map((s) => `
        <button type="button" role="tab" id="tab-${s.id}" data-situation="${s.id}"
            aria-controls="situation-panel" aria-selected="${s.id === state.situation}" tabindex="${s.id === state.situation ? 0 : -1}">${esc(s.label)}</button>`).join('');
}

function renderSituationPanel() {
    const s = SITUATIONS.find((x) => x.id === state.situation);
    const from = totalOf(lineItems(presetQty(s.preset)));
    const panel = $('#situation-panel');
    panel.setAttribute('aria-labelledby', `tab-${s.id}`);
    panel.innerHTML = `
        <div class="situation-main">
            <h3>${esc(s.title)}</h3>
            <p>${esc(s.body)}</p>
            <ul class="handles">${s.handles.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        </div>
        <div class="situation-side">
            <div>
                <small>Forms we file for this</small>
                <div class="forms">${s.forms.map((f) => `<span>${esc(f)}</span>`).join('')}</div>
            </div>
            <div class="from">
                <small>Typical flat fee</small>
                <strong>${money(from)}</strong>
                <span>Federal and one state return</span>
            </div>
            <button class="btn" type="button" data-price="${s.id}">Price my return →</button>
        </div>`;
}

function selectSituation(id, focus = false) {
    state.situation = id;
    $$('#situation-tabs [role="tab"]').forEach((t) => {
        const on = t.dataset.situation === id;
        t.setAttribute('aria-selected', on);
        t.tabIndex = on ? 0 : -1;
        if (on && focus) t.focus();
    });
    renderSituationPanel();
}

function bindSituations() {
    const tabs = $('#situation-tabs');
    tabs.addEventListener('click', (e) => {
        const tab = e.target.closest('[role="tab"]');
        if (tab) selectSituation(tab.dataset.situation);
    });
    tabs.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        let i = SITUATIONS.findIndex((s) => s.id === state.situation);
        if (e.key in keys) i = (i + keys[e.key] + SITUATIONS.length) % SITUATIONS.length;
        else if (e.key === 'Home') i = 0;
        else if (e.key === 'End') i = SITUATIONS.length - 1;
        else return;
        e.preventDefault();
        selectSituation(SITUATIONS[i].id, true);
    });
    $('#situation-panel').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-price]');
        if (!btn) return;
        const s = SITUATIONS.find((x) => x.id === btn.dataset.price);
        state.qty = presetQty(s.preset);
        store.set(FEE_KEY, state.qty);
        renderFeeOptions();
        renderWorksheet();
        renderChecklist();
        $('#book-situation').value = s.label;
        $('#fees').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
        $('#worksheet-title').closest('.worksheet').animate?.(
            [{ boxShadow: '0 0 0 4px #f3dc5a' }, { boxShadow: '0 0 0 0 rgba(243,220,90,0)' }],
            { duration: 1400, delay: 400 },
        );
    });
}

// ---- Document checklist -----------------------------------------------------

const CHECK_KEY = 'tallymark.checklist';
const ticked = new Set(store.get(CHECK_KEY, []));

function visibleGroups() {
    return CHECKLIST.filter((g) => !g.when || state.qty[g.when] > 0);
}

function renderChecklist() {
    const groups = visibleGroups();
    $('#checklist-groups').innerHTML = groups.map((g) => {
        const done = g.items.filter(([id]) => ticked.has(`${g.id}.${id}`)).length;
        return `
            <section class="check-group" aria-label="${esc(g.title)}">
                <h3>${esc(g.title)} <small>${done}/${g.items.length}</small></h3>
                <ul>${g.items.map(([id, text, note]) => {
                    const key = `${g.id}.${id}`;
                    return `<li><label class="check-item">
                        <input type="checkbox" data-check="${esc(key)}" ${ticked.has(key) ? 'checked' : ''}>
                        <span>${esc(text)}${note ? `<small>${esc(note)}</small>` : ''}</span>
                    </label></li>`;
                }).join('')}</ul>
            </section>`;
    }).join('');
    const all = groups.flatMap((g) => g.items.map(([id]) => `${g.id}.${id}`));
    const done = all.filter((k) => ticked.has(k)).length;
    const pct = all.length ? Math.round((done / all.length) * 100) : 0;
    $('#checklist-count').textContent = `${done} of ${all.length}`;
    const meter = $('#checklist-meter');
    meter.setAttribute('aria-valuenow', pct);
    meter.firstElementChild.style.width = pct + '%';
}

function bindChecklist() {
    $('#checklist-groups').addEventListener('change', (e) => {
        const box = e.target.closest('[data-check]');
        if (!box) return;
        if (box.checked) ticked.add(box.dataset.check); else ticked.delete(box.dataset.check);
        store.set(CHECK_KEY, [...ticked]);
        renderChecklist();
        $(`[data-check="${CSS.escape(box.dataset.check)}"]`)?.focus();
    });
    $('#checklist-clear').addEventListener('click', () => {
        ticked.clear();
        store.set(CHECK_KEY, []);
        renderChecklist();
    });
    $('#checklist-print').addEventListener('click', () => {
        document.body.classList.add('print-checklist');
        window.print();
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('print-checklist'));
}

// ---- Team, reviews, questions ---------------------------------------------

function renderPeople() {
    $('#team-list').innerHTML = TEAM.map((p) => `
        <article class="person">
            <div class="person-photo">
                <img src="${esc(p.photo)}" alt="${esc(p.alt)}" width="400" height="500" loading="lazy">
                <span class="credential" title="${p.credential === 'EA' ? 'Enrolled agent' : 'Certified public accountant'}">${esc(p.credential)}</span>
            </div>
            <div class="person-body">
                <h3>${esc(p.name)}</h3>
                <p class="person-role">${esc(p.role)}</p>
                <blockquote>“${esc(p.quote)}”</blockquote>
                <div class="tags">${p.specialties.map((s) => `<span>${esc(s)}</span>`).join('')}</div>
            </div>
        </article>`).join('');

    $('#review-list').innerHTML = REVIEWS.map((r) => `
        <figure class="review">
            <span class="stars" aria-label="5 out of 5 stars">★★★★★</span>
            <blockquote>${esc(r.text)}</blockquote>
            <footer><span>${esc(r.name)}</span><span class="persona">${esc(r.persona)}</span></footer>
        </figure>`).join('');

    $('#faq-list').innerHTML = FAQ.map((f, i) => `
        <details ${i === 0 ? 'open' : ''}>
            <summary>${esc(f.q)}</summary>
            ${f.a.map((p) => `<p>${esc(p)}</p>`).join('')}
        </details>`).join('');
}

// ---- Booking request --------------------------------------------------------

function renderBookingOptions() {
    $('#book-situation').innerHTML = [...SITUATIONS.map((s) => s.label), 'Not sure yet']
        .map((label) => `<option>${esc(label)}</option>`).join('');
}

function bookingSummary(data) {
    const lines = [
        `Intro call request for ${BUSINESS.name}`,
        '',
        `Name: ${data.name}`,
        `Email: ${data.email}`,
    ];
    if (data.phone) lines.push(`Phone: ${data.phone}`);
    lines.push(`Situation: ${data.situation}`, `Meet: ${data.meet}`, `Best time: ${data.when}`);
    if (data.notes) lines.push('', `Notes: ${data.notes}`);
    if (data.attach) {
        const items = lineItems(state.qty);
        lines.push('', `Fee estimate for tax year ${taxYear()}: ${money(totalOf(items))}`);
        for (const { fee, n, amount } of items) {
            lines.push(`  - ${fee.title}${n > 1 ? ` × ${n}` : ''}: ${amount ? money(amount) : 'included'}`);
        }
    }
    return lines.join('\n');
}

function bindBooking() {
    const form = $('#book-form');
    const error = $('#book-error');
    const done = $('#book-done');

    const fail = (msg, field) => {
        error.textContent = msg;
        error.hidden = false;
        if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
    };

    form.addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        error.hidden = true;
        const fd = new FormData(form);
        const data = {
            name: String(fd.get('name') || '').trim(),
            email: String(fd.get('email') || '').trim(),
            phone: String(fd.get('phone') || '').trim(),
            situation: fd.get('situation'),
            meet: fd.get('meet'),
            when: fd.get('when'),
            notes: String(fd.get('notes') || '').trim(),
            attach: fd.get('attach') === 'on',
        };
        if (!data.name) return fail('Please tell us your name.', form.elements.name);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return fail('Please enter an email address we can reply to.', form.elements.email);

        const summary = bookingSummary(data);
        const mail = `mailto:${BUSINESS.email}?subject=${encodeURIComponent(`Intro call request: ${data.name}`)}&body=${encodeURIComponent(summary)}`;
        const submit = form.querySelector('[type="submit"]');

        if (BUSINESS.formEndpoint) {
            submit.disabled = true;
            submit.textContent = 'Sending…';
            try {
                const res = await fetch(BUSINESS.formEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ ...data, estimate: data.attach ? totalOf(lineItems(state.qty)) : null, summary }),
                });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                showDone(data, summary, null);
            } catch {
                fail(`We couldn't send that just now. Please call ${BUSINESS.phone} or email ${BUSINESS.email}.`);
            } finally {
                submit.disabled = false;
                submit.textContent = 'Request my intro call';
            }
            return;
        }

        showDone(data, summary, mail);
        const a = document.createElement('a');
        a.href = mail;
        a.click();
    });

    function showDone(data, summary, mail) {
        const first = data.name.split(/\s+/)[0];
        $('#book-done-title').textContent = mail ? 'Your request is ready to send.' : `Thanks, ${first}. Request received.`;
        $('#book-done-text').textContent = mail
            ? `Your email app should open with this filled in, so just press send. If it didn't open, use the button below or call ${BUSINESS.phone}.`
            : "We'll reply within one business day to set up your intro call.";
        $('#book-summary').textContent = summary;
        const link = $('#book-mail');
        link.hidden = !mail;
        if (mail) link.href = mail;
        form.hidden = true;
        done.hidden = false;
        done.focus();
    }

    $('#book-again').addEventListener('click', () => {
        done.hidden = true;
        form.hidden = false;
        form.elements.name.focus();
    });
}

// ---- Navigation -------------------------------------------------------------

function bindNav() {
    const toggle = $('.menu-toggle');
    const nav = $('#site-nav');
    const close = () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); };
    toggle.addEventListener('click', () => {
        const open = !nav.classList.contains('open');
        nav.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && nav.classList.contains('open')) { close(); toggle.focus(); } });
}

// ---- Start --------------------------------------------------------------------

fillBusiness();
$$('[data-tax-year]').forEach((el) => { el.textContent = taxYear(); });
renderDeadlines();
renderSituationTabs();
renderSituationPanel();
renderFeeOptions();
renderWorksheet();
renderChecklist();
renderPeople();
renderBookingOptions();
bindSituations();
bindFees();
bindChecklist();
bindBooking();
bindNav();
