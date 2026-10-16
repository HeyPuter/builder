// Crossfoot Bookkeeping
//
// Everything a business owner would change is plain data in the block below:
// the firm's details, services, prices, the sample books in the hero, reviews,
// team and questions. The page renders from it, and the quote builder prices
// from PRICING, so a new price only needs changing in one place.

/* ========================================================================== *
 * Content
 * ========================================================================== */

const BUSINESS = {
    name: 'Crossfoot Bookkeeping',
    shortName: 'Crossfoot',
    cityShort: 'Asheville',
    area: 'Asheville, North Carolina, and clients in all 50 states',
    address: 'Downtown Asheville, by appointment',
    phone: '(828) 555-0142',
    email: 'hello@crossfoot.example',
    hours: 'Mon to Fri, 8am to 5pm Eastern',
    rating: '4.9',
    reviewCount: 186,
    // Books are closed, and the monthly report sent, by this day of the month.
    closeDay: 10,
    // Where call requests go. With formEndpoint set (Formspree, Basin, your own
    // server), the form POSTs JSON there. Left empty, it opens an email to
    // `email` with the request filled in.
    formEndpoint: '',
};

const INDUSTRIES = [
    { label: 'Cafés and restaurants', icon: 'coffee' },
    { label: 'Trades and contractors', icon: 'hammer' },
    { label: 'Salons and studios', icon: 'scissors' },
    { label: 'Shops and online stores', icon: 'store' },
    { label: 'Agencies and consultants', icon: 'briefcase' },
    { label: 'Clinics and therapists', icon: 'stethoscope' },
    { label: 'Nonprofits', icon: 'hand-heart' },
];

// `preset` is what "Price it" sets in the quote builder.
const SERVICES = [
    {
        icon: 'book-open-check',
        title: 'Monthly bookkeeping',
        body: 'Every bank and card account reconciled to the statement, every transaction categorized, and the month closed on time.',
        price: 'from <b>$249</b>/mo',
        preset: {},
    },
    {
        icon: 'history',
        title: 'Catch-up and cleanup',
        body: 'Months or years behind? We rebuild the missing books from your statements, and nobody lectures you about it.',
        price: '<b>$95</b> per month behind',
        preset: { behind: 6 },
    },
    {
        icon: 'users',
        title: 'Payroll support',
        body: 'Pay runs, contractor 1099s and payroll tax filings, checked against your books every single cycle.',
        price: 'from <b>$40</b>/mo',
        preset: { addons: { payroll: true } },
    },
    {
        icon: 'percent',
        title: 'Sales tax filing',
        body: 'We track what you collect and file on time in every state where you owe, so notices stop arriving.',
        price: '<b>$60</b>/mo',
        preset: { addons: { salesTax: true } },
    },
    {
        icon: 'file-text',
        title: 'Invoicing and collections',
        body: 'Invoices go out on schedule, payments get matched, and late clients get a polite nudge from us, not you.',
        price: '<b>$75</b>/mo',
        preset: { addons: { invoicing: true } },
    },
    {
        icon: 'landmark',
        title: 'Year-end and tax handoff',
        body: 'Tax-ready financials and a tidy package for your CPA, or an introduction to one we trust.',
        price: '<b>Included</b> in every plan',
        preset: {},
    },
];

const PRICING = {
    // Set by monthly business expenses, the usual measure of how much there is to do.
    tiers: [
        { label: 'Under $10k', plan: 'Starter', base: 249 },
        { label: '$10k to $25k', plan: 'Starter', base: 349 },
        { label: '$25k to $50k', plan: 'Growing', base: 449 },
        { label: '$50k to $100k', plan: 'Growing', base: 599 },
        { label: '$100k to $250k', plan: 'Established', base: 849 },
    ],
    includedAccounts: 3,
    perAccount: 25,
    maxAccounts: 15,
    addons: [
        { id: 'payroll', label: 'Payroll support', price: 40, perPerson: 6 },
        { id: 'salesTax', label: 'Sales tax filing', price: 60 },
        { id: 'invoicing', label: 'Invoicing and collections', price: 75 },
        { id: 'billPay', label: 'Bill pay', price: 75 },
        { id: 'review', label: 'Monthly review call', price: 120 },
    ],
    maxPeople: 50,
    catchUpPerMonth: 95,
    maxBehind: 24,
    // Months of catch-up we can rebuild in one week.
    catchUpPerWeek: 4,
    annualDiscount: 0.10,
};

// The sample month in the hero: a coffee shop's bank account, ticked off line
// by line. Amounts are positive for money in, negative for money out.
const HERO_LEDGER = {
    client: 'Harbor & Pine Coffee',
    opening: 29542.75,
    rows: [
        { day: 1, desc: 'Card sales payout', cat: 'Sales', amount: 2418.50 },
        { day: 2, desc: 'Dairy delivery', cat: 'Cost of goods', amount: -612.40 },
        { day: 4, desc: 'Payroll run', cat: 'Payroll', amount: -4860.00 },
        { day: 7, desc: 'Electric bill', cat: 'Utilities', amount: -318.77 },
        { day: 9, desc: 'Ridgeline Roasters', cat: 'Cost of goods', amount: -1240.00 },
        { day: 12, desc: 'Card sales payout', cat: 'Sales', amount: 3106.25 },
        { day: 15, desc: 'Shop rent', cat: 'Rent', amount: -3200.00 },
    ],
    profit: 6912,
    change: '14%',
    // Net profit over the last six months, as bar heights.
    trend: [42, 55, 48, 61, 70, 82],
};

const TRADE = {
    give: [
        ['Read-only access to your bank feeds', 'once'],
        ['Receipts forwarded to one address', 'as they come'],
        ['Answers to one short list of questions', '15 min'],
        ['One flat monthly fee', 'from $249'],
    ],
    giveTotal: '≈ 1 hr a month',
    get: [
        ['Every account tied out to the statement', 'monthly'],
        ['Profit and loss, balance sheet, cash summary', 'by the 10th'],
        ['A named bookkeeper who knows your business', '1-day replies'],
        ['Tax-ready books and a clean CPA handoff', 'every year'],
    ],
    getTotal: '≈ 8 hrs a month',
};

const MONTH = [
    { from: 1, to: 3, title: 'Statements come in', body: 'Bank feeds sync on their own. You forward receipts to one email address whenever they turn up.' },
    { from: 4, to: 8, title: 'We reconcile and categorize', body: 'Every account is tied out to its statement. Questions arrive as one short list, not twenty emails.' },
    { from: 10, to: 10, title: 'Books closed, report sent', body: 'Profit and loss, balance sheet and cash summary land in your inbox, with a note in plain English.' },
    { from: 15, to: 15, title: 'A review call, if you want one', body: 'Thirty minutes with your bookkeeper on the numbers and what is coming up next month.' },
];

const REPORT = {
    client: 'Harbor & Pine Coffee',
    author: 'Ellen',
    tabs: [
        {
            label: 'Profit and loss',
            rows: [['Revenue', 48210], ['Cost of goods', -14630], ['Payroll', -15240], ['Rent and utilities', -5870], ['Everything else', -5558]],
            total: 'Net profit',
            change: '+14% on last month',
            note: 'Profit is up 14% on last month. Milk and coffee costs rose $410, mostly from the new oat milk supplier, so it is worth comparing quotes before the holidays.',
        },
        {
            label: 'Cash',
            rows: [['Opening cash', 31420], ['Money in', 49105], ['Money out', -42950], ['Owner draw', -4000]],
            total: 'Closing cash',
            change: '2.4 months covered',
            note: 'You have about 2.4 months of expenses in the bank. Holiday payroll lands in one week in December, so that will be the tightest point of the year.',
        },
        {
            label: 'Taxes ahead',
            rows: [['Sales tax collected', 3120], ['Payroll taxes held', 2240], ['Set aside for estimated tax', 4600]],
            total: 'Keep in reserve',
            change: 'Next due {nextTax}',
            note: 'Your next estimated tax payment is due {nextTax}. Moving $1,150 a week into the tax account until then keeps it painless.',
        },
    ],
};

const REVIEWS = [
    {
        quote: 'I was fourteen months behind and too embarrassed to call anyone. They caught me up in three weeks and never once made me feel bad about it.',
        name: 'Dana Whitfield',
        business: 'Whitfield Landscaping',
        result: '14 months caught up in 3 weeks',
    },
    {
        quote: 'The monthly note is my favorite email. Two paragraphs and I know exactly where the café stands and what to keep an eye on.',
        name: 'Marcus Osei',
        business: 'Harbor & Pine Coffee',
        result: 'Closed by the 10th, 22 months running',
    },
    {
        quote: 'Our CPA said it was the cleanest year-end package she had seen from a small studio. Tax season took one meeting instead of six.',
        name: 'Priya Raman',
        business: 'Fieldnote Design Studio',
        result: 'Year-end handoff in one meeting',
    },
];

const TEAM = [
    {
        name: 'Ellen Marsh',
        role: 'Founder and lead bookkeeper',
        credential: 'Certified QuickBooks ProAdvisor',
        years: '14 years keeping books',
        focus: 'Cafés, restaurants and shops',
    },
    {
        name: 'Jonah Reyes',
        role: 'Senior bookkeeper',
        credential: 'Xero Certified Advisor',
        years: '9 years keeping books',
        focus: 'Trades, contractors and job costing',
    },
    {
        name: 'Ama Boateng',
        role: 'Payroll and sales tax',
        credential: 'Certified Payroll Professional',
        years: '7 years in payroll',
        focus: 'Payroll, 1099s and multi-state sales tax',
    },
];

const FAQ = [
    {
        q: 'What does a monthly plan include?',
        a: 'Reconciling every bank, card and loan account, categorizing every transaction, closing the month, and a report with your profit and loss, balance sheet and cash summary. You also get a named bookkeeper who answers questions within one business day, and tax-ready files at year end.',
    },
    {
        q: 'How do I get you my documents?',
        a: 'Most of it arrives on its own: you give us read-only access to your bank feeds once. Receipts and bills go to one email address. Anything we cannot work out lands in one short list of questions each month.',
    },
    {
        q: 'I am behind on my books. Can you still help?',
        a: 'Yes, and it is more common than you think. We rebuild the missing months from your statements for a flat fee per month, usually about a week for every four months, then move you onto a monthly plan.',
    },
    {
        q: 'Which software do you use?',
        a: 'We work in QuickBooks Online and Xero. If you use neither, we set one up for you and move your history across. You own the subscription and the data, always.',
    },
    {
        q: 'Do you file my taxes?',
        a: 'We prepare books that are ready for tax time and hand a clean package to your CPA. If you do not have one, we will introduce you to a CPA we work with every year. Sales tax and payroll tax filings we handle ourselves.',
    },
    {
        q: 'Is there a contract?',
        a: 'No. Plans run month to month and you can stop with 30 days notice. Paying yearly saves 10%, and you can still cancel; we refund the months you have not used.',
    },
    {
        q: 'Is my financial data safe?',
        a: 'We only ever ask for read-only access, so nobody here can move money. We never ask for your bank password, every account we use has two-factor sign-in, and your files stay in your own software.',
    },
];

const BOOK_STATUS = ['Up to date', 'A few months behind', 'More than a year behind', 'Not sure'];

// US federal estimated tax due dates (month is 1-12). The bar at the top
// counts down to the next one.
const TAX_DATES = [
    { month: 1, day: 15, label: 'Fourth-quarter estimated tax' },
    { month: 4, day: 15, label: 'First-quarter estimated tax' },
    { month: 6, day: 15, label: 'Second-quarter estimated tax' },
    { month: 9, day: 15, label: 'Third-quarter estimated tax' },
];

/* ========================================================================== *
 * Page
 * ========================================================================== */

(function () {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    function esc(value) {
        return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function money(n, cents) {
        const digits = cents ? 2 : 0;
        const s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
        return (n < 0 ? '−$' : '$') + s;
    }
    function ordinal(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
    function initials(name) {
        return name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase();
    }
    const fmtDay = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const fmtLong = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const monthName = (d) => d.toLocaleDateString('en-US', { month: 'long' });
    const icon = (name) => `<i data-lucide="${esc(name)}"></i>`;

    // The month the hero and report show: the last one closed, a couple of
    // days ahead of the promised close day.
    const closeDate = Math.max(1, BUSINESS.closeDay - 2);
    const closedOn = new Date(today.getFullYear(), today.getMonth() - (today.getDate() >= closeDate ? 0 : 1), closeDate);
    const lastMonth = new Date(closedOn.getFullYear(), closedOn.getMonth() - 1, 1);

    function nextTaxDate() {
        for (let y = today.getFullYear(); y <= today.getFullYear() + 1; y++) {
            for (const t of TAX_DATES) {
                const d = new Date(y, t.month - 1, t.day);
                if (d >= today) return { date: d, label: t.label };
            }
        }
        return null;
    }
    const nextTax = nextTaxDate();

    /* Business details ------------------------------------------------------ */

    function fillBusiness() {
        const values = { ...BUSINESS, closeDayOrdinal: ordinal(BUSINESS.closeDay), reviewCount: String(BUSINESS.reviewCount) };
        $$('[data-biz]').forEach((el) => {
            const v = values[el.dataset.biz];
            if (v !== undefined) el.textContent = v;
        });
        $$('[data-biz-tel]').forEach((a) => { a.href = 'tel:' + BUSINESS.phone.replace(/[^\d+]/g, ''); });
        $$('[data-biz-mail]').forEach((a) => { a.href = 'mailto:' + BUSINESS.email; });
        $('#year').textContent = today.getFullYear();
    }

    function renderTaxBar() {
        if (!nextTax) return;
        const days = Math.round((nextTax.date - today) / 86400000);
        const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
        $('#tax-text').innerHTML = `${esc(nextTax.label)} is due <strong>${esc(fmtDay(nextTax.date))}</strong>, ${when}. We will have your numbers ready.`;
    }

    /* Hero ledger ----------------------------------------------------------- */

    const TICK_PATH = 'M3 12.5c2 1.4 3.6 3.2 4.9 5.6C10.6 11.6 15 6.5 21.5 3.5';

    function renderLedger() {
        const L = HERO_LEDGER;
        const mm = String(lastMonth.getMonth() + 1).padStart(2, '0');
        const closing = L.rows.reduce((sum, r) => sum + r.amount, L.opening);
        $('#ledger-client').textContent = L.client;
        $('#ledger-month').textContent = monthName(lastMonth);
        $('#tick-total').textContent = L.rows.length;
        $('#ledger-statement').textContent = money(closing, true);
        $('#ledger-books').textContent = money(closing, true);
        $('#stamp-date').textContent = fmtDay(closedOn) + ' · ' + initials(BUSINESS.shortName + ' Books');
        $('#ledger-rows').innerHTML = L.rows.map((r) => `
            <li class="ledger-row">
                <span class="ledger-date">${mm}/${String(r.day).padStart(2, '0')}</span>
                <span class="ledger-desc"><span>${esc(r.desc)}</span><span class="ledger-cat">${esc(r.cat)}</span></span>
                <span class="ledger-amt${r.amount > 0 ? ' in' : ''}">${r.amount > 0 ? '+' : ''}${esc(money(r.amount, true))}</span>
                <svg class="ledger-tick" viewBox="0 0 24 22" aria-hidden="true"><path d="${TICK_PATH}"/></svg>
            </li>`).join('');

        $('#chip-sent').textContent = fmtDay(closedOn);
        $('#chip-month').textContent = monthName(lastMonth);
        $('#chip-profit').textContent = money(L.profit);
        $('#chip-change').textContent = L.change;
        $('#chip-bars').innerHTML = L.trend.map((h) => `<span style="--h:${Number(h)}%"></span>`).join('');

        animateLedger();
    }

    function animateLedger() {
        const ledger = $('.ledger');
        const rows = $$('.ledger-row');
        const diff = $('#ledger-diff');
        const count = $('#tick-count');
        let left = HERO_LEDGER.rows.reduce((sum, r) => sum + Math.abs(r.amount), 0);

        const tick = (i) => {
            rows[i].classList.add('is-ticked');
            left -= Math.abs(HERO_LEDGER.rows[i].amount);
            count.textContent = i + 1;
            diff.textContent = money(Math.max(0, left), true);
        };
        const finish = () => {
            diff.textContent = money(0, true);
            diff.parentElement.classList.add('is-zero');
            ledger.classList.add('is-stamped');
        };

        diff.textContent = money(left, true);
        if (reduceMotion) {
            rows.forEach((_, i) => tick(i));
            finish();
            return;
        }
        let i = 0;
        const step = () => {
            if (i > 0) rows[i - 1].classList.remove('is-ticking');
            if (i >= rows.length) { setTimeout(finish, 260); return; }
            rows[i].classList.add('is-ticking');
            tick(i);
            i += 1;
            setTimeout(step, 340);
        };
        setTimeout(step, 700);
    }

    /* Lists ----------------------------------------------------------------- */

    function renderIndustries() {
        $('#industries').innerHTML = INDUSTRIES.map((x) => `<li>${icon(x.icon)}${esc(x.label)}</li>`).join('');
        $('#b-industry').innerHTML = INDUSTRIES.map((x) => `<option>${esc(x.label)}</option>`).join('') + '<option>Something else</option>';
    }

    function renderServices() {
        $('#services-list').innerHTML = SERVICES.map((s, i) => `
            <article class="service">
                <span class="service-icon">${icon(s.icon)}</span>
                <h3>${esc(s.title)}</h3>
                <p>${esc(s.body)}</p>
                <div class="service-foot">
                    <span class="service-price">${s.price}</span>
                    <button type="button" class="link-btn" data-preset="${i}">Price it ${icon('arrow-right')}</button>
                </div>
            </article>`).join('');
        $('#footer-services').innerHTML = SERVICES.map((s) => `<li><a href="#services">${esc(s.title)}</a></li>`).join('');
    }

    function renderTrade() {
        const list = (rows) => rows.map(([a, b]) => `<li><span>${esc(a)}</span><span>${esc(b)}</span></li>`).join('');
        $('#t-give').innerHTML = list(TRADE.give);
        $('#t-get').innerHTML = list(TRADE.get);
        $('#t-give-total').textContent = TRADE.giveTotal;
        $('#t-get-total').textContent = TRADE.getTotal;
    }

    function renderMonth() {
        const stepFor = (day) => MONTH.findIndex((s) => day >= s.from && day <= s.to);
        const cells = [];
        for (let d = 1; d <= 31; d++) {
            const s = stepFor(d);
            const isStart = s >= 0 && MONTH[s].from === d;
            const isToday = d === today.getDate();
            cells.push(`<div class="day${isToday ? ' is-today' : ''}"${s >= 0 ? ` data-step="${s + 1}"` : ''}>` +
                `<b>${d}</b>${isStart ? `<i>${String(s + 1).padStart(2, '0')}</i>` : '<i></i>'}</div>`);
        }
        const grid = $('#month-grid');
        grid.innerHTML = cells.join('');
        const range = (s) => (s.from === s.to ? `Day ${s.from}` : `Days ${s.from} to ${s.to}`);
        $('#month-steps').innerHTML = MONTH.map((s, i) => `
            <li class="month-step" tabindex="0" data-step="${i + 1}">
                <span class="step-days"><span class="step-swatch" data-step="${i + 1}"></span>${range(s)}</span>
                <h3>${esc(s.title)}</h3>
                <p>${esc(s.body)}</p>
            </li>`).join('');

        const focus = (n) => {
            grid.classList.toggle('has-focus', !!n);
            $$('.day', grid).forEach((c) => c.classList.toggle('is-focus', c.dataset.step === n));
        };
        $$('.month-step').forEach((el) => {
            el.addEventListener('mouseenter', () => focus(el.dataset.step));
            el.addEventListener('focus', () => focus(el.dataset.step));
            el.addEventListener('mouseleave', () => focus(null));
            el.addEventListener('blur', () => focus(null));
        });
    }

    function renderReport() {
        $('#report-client').textContent = REPORT.client;
        $('#report-month').textContent = monthName(lastMonth) + ' ' + lastMonth.getFullYear();
        const fill = (text) => text.replace(/\{nextTax\}/g, nextTax ? fmtDay(nextTax.date) : 'soon');
        const tabs = $('#report-tabs');
        tabs.innerHTML = REPORT.tabs.map((t, i) =>
            `<button type="button" class="tab" role="tab" id="tab-${i}" aria-controls="report-panel" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(t.label)}</button>`).join('');
        const panel = $('#report-panel');

        const show = (i) => {
            const t = REPORT.tabs[i];
            const total = t.rows.reduce((sum, r) => sum + r[1], 0);
            $$('.tab', tabs).forEach((b, j) => {
                b.setAttribute('aria-selected', String(i === j));
                b.tabIndex = i === j ? 0 : -1;
            });
            panel.setAttribute('aria-labelledby', 'tab-' + i);
            panel.innerHTML = `
                <ul class="statement">
                    ${t.rows.map(([label, amt]) => `<li><span>${esc(label)}</span><span class="dots"></span><span class="amt${amt < 0 ? ' neg' : ''}">${esc(money(amt))}</span></li>`).join('')}
                </ul>
                <p class="statement-total"><span>${esc(t.total)}</span><span class="change">${esc(fill(t.change))}</span><span class="dots"></span><span class="amt">${esc(money(total))}</span></p>
                <p class="note"><span class="note-from">A note from ${esc(REPORT.author)}</span>${esc(fill(t.note))}</p>`;
        };
        tabs.addEventListener('click', (e) => {
            const b = e.target.closest('.tab');
            if (b) show($$('.tab', tabs).indexOf(b));
        });
        tabs.addEventListener('keydown', (e) => {
            const all = $$('.tab', tabs);
            const at = all.indexOf(document.activeElement);
            if (at < 0) return;
            let to = null;
            if (e.key === 'ArrowRight') to = (at + 1) % all.length;
            if (e.key === 'ArrowLeft') to = (at - 1 + all.length) % all.length;
            if (e.key === 'Home') to = 0;
            if (e.key === 'End') to = all.length - 1;
            if (to === null) return;
            e.preventDefault();
            show(to);
            all[to].focus();
        });
        show(0);
    }

    function renderReviews() {
        $('#reviews-list').innerHTML = REVIEWS.map((r, i) => `
            <figure class="review">
                <blockquote>${esc(r.quote)}</blockquote>
                <p class="review-result">${icon('check')}${esc(r.result)}</p>
                <figcaption class="review-who">
                    <span class="avatar" data-tone="${i % 3}" aria-hidden="true">${esc(initials(r.name))}</span>
                    <span><b>${esc(r.name)}</b><span>${esc(r.business)}</span></span>
                </figcaption>
            </figure>`).join('');
    }

    function renderTeam() {
        $('#team-list').innerHTML = TEAM.map((p, i) => `
            <article class="person">
                <span class="avatar" data-tone="${(i + 1) % 3}" aria-hidden="true">${esc(initials(p.name))}</span>
                <h3>${esc(p.name)}</h3>
                <p class="person-role">${esc(p.role)}</p>
                <ul class="person-meta">
                    <li>${icon('badge-check')}<span>${esc(p.credential)}</span></li>
                    <li>${icon('calendar-clock')}<span>${esc(p.years)}</span></li>
                    <li>${icon('target')}<span>${esc(p.focus)}</span></li>
                </ul>
            </article>`).join('');
    }

    function renderFaq() {
        $('#faq-list').innerHTML = FAQ.map((f, i) => `
            <details${i === 0 ? ' open' : ''}>
                <summary>${esc(f.q)}<span class="faq-icon" aria-hidden="true">${icon('plus')}</span></summary>
                <p class="faq-answer">${esc(f.a)}</p>
            </details>`).join('');
    }

    /* Quote builder --------------------------------------------------------- */

    const quote = {
        tier: 1,
        accounts: PRICING.includedAccounts,
        addons: Object.fromEntries(PRICING.addons.map((a) => [a.id, false])),
        people: 5,
        behind: 0,
        billing: 'monthly',
        touched: false,
    };

    function priceQuote() {
        const tier = PRICING.tiers[quote.tier];
        const lines = [{ label: 'Monthly bookkeeping', sub: tier.label + ' in expenses', amount: tier.base }];
        const extra = Math.max(0, quote.accounts - PRICING.includedAccounts);
        lines.push({
            label: `${quote.accounts} bank and card account${quote.accounts === 1 ? '' : 's'}`,
            sub: extra ? `${PRICING.includedAccounts} included, ${extra} × $${PRICING.perAccount}` : `up to ${PRICING.includedAccounts} included`,
            amount: extra * PRICING.perAccount,
        });
        for (const a of PRICING.addons) {
            if (!quote.addons[a.id]) continue;
            lines.push({
                label: a.label,
                sub: a.perPerson ? `${quote.people} ${quote.people === 1 ? 'person' : 'people'} on payroll` : '',
                amount: a.price + (a.perPerson ? a.perPerson * quote.people : 0),
            });
        }
        const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
        const discount = quote.billing === 'annual' ? Math.round(subtotal * PRICING.annualDiscount) : 0;
        const catchUp = quote.behind * PRICING.catchUpPerMonth;
        // About a week to onboard, then a week per few months of catch-up.
        const current = new Date(today);
        current.setDate(current.getDate() + 7 + Math.ceil(quote.behind / PRICING.catchUpPerWeek) * 7);
        while (current.getDay() === 0 || current.getDay() === 6) current.setDate(current.getDate() + 1);
        return { tier, lines, subtotal, discount, monthly: subtotal - discount, catchUp, current };
    }

    function behindText(n) {
        if (n === 0) return 'Up to date';
        if (n >= PRICING.maxBehind) return `${n}+ months`;
        return `${n} month${n === 1 ? '' : 's'}`;
    }

    function renderQuoteForm() {
        $('#tier-options').innerHTML = PRICING.tiers.map((t, i) => `
            <label class="seg">
                <input type="radio" name="tier" value="${i}"${i === quote.tier ? ' checked' : ''}>
                <span>${esc(t.label.replace(' to ', '–'))}<small>${esc(t.plan)}</small></span>
            </label>`).join('');
        $('#addon-options').innerHTML = PRICING.addons.map((a) => `
            <label class="addon">
                <input type="checkbox" name="addon" value="${esc(a.id)}">
                <span class="addon-box">${icon('check')}</span>
                <span class="addon-text"><b>${esc(a.label)}</b><small>$${a.price}/mo${a.perPerson ? ` + $${a.perPerson} a person` : ''}</small></span>
            </label>`).join('') + `
            <div class="addon-people" id="people-row" hidden>
                <span id="people-label">People on payroll</span>
                <div class="stepper stepper-sm" role="group" aria-labelledby="people-label">
                    <button type="button" data-step="people" data-dir="-1" aria-label="One fewer person">${icon('minus')}</button>
                    <output id="people-value" aria-live="polite"></output>
                    <button type="button" data-step="people" data-dir="1" aria-label="One more person">${icon('plus')}</button>
                </div>
            </div>`;
        $('#behind').max = PRICING.maxBehind;
        $('#annual-save').textContent = `save ${Math.round(PRICING.annualDiscount * 100)}%`;
        $('#accounts-help').textContent = `${PRICING.includedAccounts} included, then $${PRICING.perAccount}/mo each.`;

        const form = $('#quote-form');
        form.addEventListener('change', (e) => {
            const t = e.target;
            if (t.name === 'tier') quote.tier = Number(t.value);
            if (t.name === 'addon') quote.addons[t.value] = t.checked;
            if (t.name === 'billing') quote.billing = t.value;
            quote.touched = true;
            updateQuote(true);
        });
        $('#behind').addEventListener('input', (e) => {
            quote.behind = Number(e.target.value);
            quote.touched = true;
            updateQuote(true);
        });
        form.addEventListener('click', (e) => {
            const b = e.target.closest('[data-step]');
            if (!b) return;
            const key = b.dataset.step;
            const max = key === 'accounts' ? PRICING.maxAccounts : PRICING.maxPeople;
            quote[key] = Math.min(max, Math.max(1, quote[key] + Number(b.dataset.dir)));
            quote.touched = true;
            updateQuote(true);
        });
        form.addEventListener('submit', (e) => e.preventDefault());

        $('#services-list').addEventListener('click', (e) => {
            const b = e.target.closest('[data-preset]');
            if (!b) return;
            const p = SERVICES[Number(b.dataset.preset)].preset || {};
            if (p.behind !== undefined) quote.behind = Math.min(PRICING.maxBehind, p.behind);
            for (const [id, on] of Object.entries(p.addons || {})) quote.addons[id] = on;
            quote.touched = true;
            syncControls();
            updateQuote(true);
            $('#pricing').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            $('input[name="tier"]:checked').focus({ preventScroll: true });
        });

        $('#quote-book').addEventListener('click', () => {
            quote.touched = true;
            updateAttach();
            $('#book').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
            $('#b-name').focus({ preventScroll: true });
        });

        syncControls();
        updateQuote(false);
    }

    // Puts the controls in line with `quote`, after a service preset changes it.
    function syncControls() {
        $$('input[name="tier"]').forEach((r) => { r.checked = Number(r.value) === quote.tier; });
        $$('input[name="addon"]').forEach((c) => { c.checked = !!quote.addons[c.value]; });
        $$('input[name="billing"]').forEach((r) => { r.checked = r.value === quote.billing; });
        $('#behind').value = quote.behind;
    }

    function updateQuote(bump) {
        const q = priceQuote();
        $('#accounts-value').textContent = quote.accounts;
        $('#people-value').textContent = quote.people;
        $('#people-row').hidden = !quote.addons.payroll;
        $$('[data-step="accounts"]').forEach((b) => { b.disabled = Number(b.dataset.dir) < 0 ? quote.accounts <= 1 : quote.accounts >= PRICING.maxAccounts; });
        $$('[data-step="people"]').forEach((b) => { b.disabled = Number(b.dataset.dir) < 0 ? quote.people <= 1 : quote.people >= PRICING.maxPeople; });
        const range = $('#behind');
        range.style.setProperty('--fill', (quote.behind / PRICING.maxBehind) * 100 + '%');
        $('#behind-value').textContent = behindText(quote.behind);

        $('#quote-number').textContent = 'No. CF-' + String(today.getFullYear()).slice(2) +
            String(today.getMonth() + 1).padStart(2, '0') + String(today.getDate()).padStart(2, '0');
        $('#quote-date').textContent = fmtDay(today);
        $('#receipt-plan').textContent = `${q.tier.plan} plan`;
        const lines = q.lines.map((l) => `
            <li>
                <span class="label">${esc(l.label)}${l.sub ? `<small>${esc(l.sub)}</small>` : ''}</span>
                <span class="dots"></span>
                <span class="amt${l.amount ? '' : ' muted'}">${l.amount ? esc(money(l.amount)) : 'incl.'}</span>
            </li>`);
        if (q.discount) {
            lines.push(`<li class="discount"><span class="label">Paid yearly<small>${Math.round(PRICING.annualDiscount * 100)}% off</small></span><span class="dots"></span><span class="amt">−${esc(money(q.discount))}</span></li>`);
        }
        $('#receipt-lines').innerHTML = lines.join('');
        $('#receipt-monthly').textContent = money(q.monthly);
        $('#receipt-once').innerHTML = q.catchUp
            ? `<span>Catch-up, ${esc(behindText(quote.behind))}, one time</span><b>${esc(money(q.catchUp))}</b>`
            : '';
        $('#receipt-current').textContent = (quote.behind ? 'Caught up and current by ' : 'First month closed by ') + fmtLong(q.current);

        if (bump && !reduceMotion) {
            const r = $('#receipt');
            r.classList.remove('is-bumped');
            void r.offsetWidth;
            r.classList.add('is-bumped');
        }
        updateAttach();
    }

    function quoteSummary() {
        const q = priceQuote();
        const extras = PRICING.addons.filter((a) => quote.addons[a.id]).map((a) => a.label.toLowerCase());
        let s = `${q.tier.plan} plan, ${money(q.monthly)}/mo${quote.billing === 'annual' ? ' paid yearly' : ''}`;
        if (q.catchUp) s += ` + ${money(q.catchUp)} catch-up`;
        const detail = [`${q.tier.label} in monthly expenses`, `${quote.accounts} account${quote.accounts === 1 ? '' : 's'}`].concat(extras);
        if (quote.addons.payroll) detail.push(`${quote.people} on payroll`);
        if (quote.behind) detail.push(`${behindText(quote.behind)} behind`);
        return { short: s, detail: detail.join(', ') };
    }

    function updateAttach() {
        const box = $('#quote-attach');
        if (!quote.touched) { box.hidden = true; return; }
        box.hidden = false;
        $('#quote-attach-text').textContent = quoteSummary().short;
    }

    /* Booking --------------------------------------------------------------- */

    function setupBooking() {
        $('#b-status').innerHTML = BOOK_STATUS.map((s, i) => `
            <label class="chip"><input type="radio" name="status" value="${esc(s)}"${i === 0 ? ' checked' : ''}><span>${esc(s)}</span></label>`).join('');

        const form = $('#book-form');
        const error = $('#form-error');
        const done = $('#book-done');
        const fields = { name: $('#b-name'), business: $('#b-business'), email: $('#b-email') };
        const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

        Object.values(fields).forEach((el) => el.addEventListener('input', () => el.removeAttribute('aria-invalid')));

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const missing = [];
            if (!fields.name.value.trim()) missing.push(fields.name);
            if (!fields.business.value.trim()) missing.push(fields.business);
            if (!emailOk(fields.email.value.trim())) missing.push(fields.email);
            Object.values(fields).forEach((el) => {
                if (missing.includes(el)) el.setAttribute('aria-invalid', 'true');
                else el.removeAttribute('aria-invalid');
            });
            if (missing.length) {
                error.textContent = missing.includes(fields.email) && fields.email.value.trim()
                    ? 'That email address does not look quite right.'
                    : 'Please add your name, business and email so we can reach you.';
                missing[0].focus();
                return;
            }
            error.textContent = '';

            const data = {
                name: fields.name.value.trim(),
                business: fields.business.value.trim(),
                email: fields.email.value.trim(),
                phone: $('#b-phone').value.trim(),
                industry: $('#b-industry').value,
                bestTime: $('#b-time').value,
                books: (form.querySelector('input[name="status"]:checked') || {}).value || '',
                message: $('#b-message').value.trim(),
            };
            if (quote.touched && $('#b-quote').checked) {
                const s = quoteSummary();
                data.quote = `${s.short} (${s.detail})`;
            }

            const submit = form.querySelector('[type="submit"]');
            submit.disabled = true;
            try {
                if (BUSINESS.formEndpoint) {
                    const res = await fetch(BUSINESS.formEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                        body: JSON.stringify(data),
                    });
                    if (!res.ok) throw new Error('The request was not accepted (' + res.status + ').');
                    showDone(data, false);
                } else {
                    showDone(data, true);
                    openEmail(data);
                }
            } catch (err) {
                error.innerHTML = `We could not send that just now. Please call <a href="tel:${esc(BUSINESS.phone.replace(/[^\d+]/g, ''))}">${esc(BUSINESS.phone)}</a> or email <a href="mailto:${esc(BUSINESS.email)}">${esc(BUSINESS.email)}</a>.`;
            } finally {
                submit.disabled = false;
            }
        });

        $('#book-again').addEventListener('click', () => {
            done.hidden = true;
            form.hidden = false;
            form.reset();
            updateAttach();
            fields.name.focus();
        });

        function mailtoFor(data) {
            const lines = [
                `Name: ${data.name}`,
                `Business: ${data.business} (${data.industry})`,
                `Email: ${data.email}`,
                data.phone ? `Phone: ${data.phone}` : '',
                `Best time to call: ${data.bestTime}`,
                `Books today: ${data.books}`,
                data.quote ? `Quote: ${data.quote}` : '',
                data.message ? `\n${data.message}` : '',
            ].filter(Boolean);
            return `mailto:${BUSINESS.email}?subject=${encodeURIComponent('Free call request: ' + data.business)}&body=${encodeURIComponent(lines.join('\n'))}`;
        }
        function openEmail(data) {
            try { window.location.href = mailtoFor(data); } catch (e) { /* the link in the confirmation still works */ }
        }
        function showDone(data, byEmail) {
            const first = data.name.split(/\s+/)[0];
            $('#done-title').textContent = byEmail
                ? `Almost there, ${first}. Send the email to book your call.`
                : `Thanks, ${first}. Your call request is in.`;
            $('#done-stamp').textContent = byEmail ? 'Drafted' : 'Received';
            $('#done-date').textContent = fmtDay(new Date());
            $('#done-text').innerHTML = byEmail
                ? `Your email app should open with the request filled in, ready to send. If it did not, <a href="${esc(mailtoFor(data))}">open it here</a> or call ${esc(BUSINESS.phone)}.`
                : `We will call you within one business day, in the ${esc(data.bestTime.toLowerCase())}. A confirmation is on its way to ${esc(data.email)}.`;
            form.hidden = true;
            done.hidden = false;
            done.focus();
        }
    }

    /* Header ---------------------------------------------------------------- */

    function setupNav() {
        const btn = $('.menu-btn');
        const nav = $('#site-nav');
        const close = () => { nav.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false'); };
        btn.addEventListener('click', () => {
            const open = !nav.classList.contains('is-open');
            nav.classList.toggle('is-open', open);
            btn.setAttribute('aria-expanded', String(open));
        });
        nav.addEventListener('click', (e) => { if (e.target.closest('a')) close(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && nav.classList.contains('is-open')) { close(); btn.focus(); }
        });
        window.matchMedia('(min-width: 961px)').addEventListener('change', close);
    }

    /* Icons ----------------------------------------------------------------- */

    // Lucide turns every <i data-lucide="name"> into an inline SVG. The page
    // works without it, so a slow or blocked CDN only costs the icons.
    let lucide = null;
    function drawIcons() {
        if (lucide) lucide.createIcons({ icons: lucide.icons, attrs: { 'aria-hidden': 'true' } });
    }
    function loadIcons() {
        import('https://cdn.jsdelivr.net/npm/lucide@0.469.0/+esm')
            .then((mod) => { lucide = mod; drawIcons(); })
            .catch(() => {});
        // Lists re-render as the quote changes; give their new icons a pass.
        new MutationObserver(() => { if (lucide && document.querySelector('i[data-lucide]')) drawIcons(); })
            .observe(document.body, { childList: true, subtree: true });
    }

    fillBusiness();
    renderTaxBar();
    renderLedger();
    renderIndustries();
    renderServices();
    renderTrade();
    renderMonth();
    renderReport();
    renderReviews();
    renderTeam();
    renderFaq();
    renderQuoteForm();
    setupBooking();
    setupNav();
    loadIcons();
})();
