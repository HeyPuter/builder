// Page content lives here as data so it is easy to find and change.
//
// FIRM fills every name, phone, email, address and disclaimer on the page (any
// element with data-bind="<key>", and links with data-bind-href="tel|mailto").
// JURISDICTION is where the firm is licensed: the state, the counties it
// covers and the courts it appears in. PRACTICE is the list of practice areas,
// and each one names the ATTORNEYS id of the lawyer who handles it.
//
// Every "Book a consultation" button (data-consult) opens FIRM.consultUrl when
// it is set (a Calendly, Clio Grow, Lawmatics or other booking page), and
// otherwise jumps to the consultation request form. The form opens an email to
// the lawyer for the chosen practice area, or to FIRM.email when that lawyer
// has no email of their own.
//
// SAMPLE_CONTENT marks the firm, credentials, bios and reviews as samples on the
// page. Set it to false once they are the firm's own.

const SAMPLE_CONTENT = true;

const FIRM = {
    name: 'Hale & Okafor, Attorneys at Law',
    shortName: 'Hale & Okafor',
    kind: 'Attorneys at Law',
    focus: 'Family and estate law',
    since: 2009,
    city: 'Brookhaven',
    phone: '(555) 014-7730',
    email: 'office@example.com',
    hours: 'Mon to Fri, 8:30am to 5:30pm',
    address: '412 Court Street, Suite 2, Brookhaven, Ohio',
    parking: 'Free lot behind the building, entrance on Elm Street',
    languages: 'English and Spanish',
    // A booking page for consultations. Leave empty to use the form below.
    consultUrl: '',
    // Some states require this label on lawyer websites. Set to '' to hide it.
    advertising: 'Attorney advertising',
    disclaimer: 'The information on this site is general information, not legal advice for your situation. Contacting us does not create an attorney-client relationship. We become your lawyers only after we have checked for conflicts and we both sign an engagement letter.',
    resultsDisclaimer: 'Every case is different. Past results and client reviews do not guarantee a similar outcome in your case.',
};

const JURISDICTION = {
    state: 'Ohio',
    counties: ['Linden County', 'Marlow County', 'Henley County', 'Ashby County'],
    courts: [
        'Linden County Court of Common Pleas, Domestic Relations Division',
        'Linden County Probate Court',
        'Marlow and Henley County Courts of Common Pleas',
        'Ohio Fifth District Court of Appeals',
    ],
    note: 'Live in another state, or own property in one? We can handle the Ohio side and work with a lawyer licensed there.',
};

// The fee and length of a first meeting, and when they happen. `days` and
// `times` set the openings shown on the page; `leadDays` keeps the first one
// at least that many days away.
const CONSULT = {
    length: '45 minutes',
    fee: '$150, credited to your fee if you hire us',
    modes: ['In person', 'Video', 'Phone'],
    days: ['Tue', 'Wed', 'Thu'],
    times: ['10:00am', '2:00pm'],
    leadDays: 2,
    // What you leave the meeting with.
    outcome: 'Your options, a likely timeline and a written fee quote',
};

const ATTORNEYS = [
    {
        id: 'hale', name: 'Claire Hale', title: 'Founding partner',
        photo: 'photos/attorney-1.jpg', alt: 'Claire Hale in a black blazer, smiling',
        focus: 'Divorce, custody and support',
        bio: 'Claire has practiced family law in Linden County since 2009. Most of her cases settle, and she prepares every one as if it will go to trial.',
        admitted: ['Ohio, 2009', 'U.S. District Court, Northern District of Ohio, 2011'],
        education: ['J.D., Case Western Reserve University School of Law', 'B.A., Kenyon College'],
        memberships: ['Board-certified specialist in family relations law', 'Linden County Bar Association, family law committee chair'],
        email: '',
    },
    {
        id: 'okafor', name: 'Daniel Okafor', title: 'Partner',
        photo: 'photos/attorney-2.jpg', alt: 'Daniel Okafor in a navy suit and striped tie',
        focus: 'Wills, trusts and probate',
        bio: 'Daniel writes wills and trusts for families and small business owners, and guides executors through probate from the first filing to the final account.',
        admitted: ['Ohio, 2012'],
        education: ['J.D., The Ohio State University Moritz College of Law', 'B.S. in Accounting, Miami University'],
        memberships: ['Ohio State Bar Association, estate planning section', 'Linden County Estate Planning Council'],
        email: '',
    },
    {
        id: 'reyes', name: 'Martín Reyes', title: 'Of counsel',
        photo: 'photos/attorney-3.jpg', alt: 'Martín Reyes in a dark suit, seated in his office',
        focus: 'Prenups and guardianship',
        bio: 'Martín has drafted prenuptial agreements and handled guardianships for adult children and aging parents for over thirty years. He meets clients in English or Spanish.',
        admitted: ['Ohio, 1992'],
        education: ['J.D., University of Cincinnati College of Law', 'B.A., Ohio University'],
        memberships: ['Ohio Hispanic Bar Association', 'Linden County Bar Association'],
        email: '',
    },
];

// `lawyer` is an ATTORNEYS id. `fee` is shown as written.
const PRACTICE = [
    {
        id: 'divorce', title: 'Divorce and dissolution', lawyer: 'hale',
        body: 'Ending a marriage by agreement (a dissolution) or through the court when you and your spouse disagree.',
        includes: ['Property and debt division', 'Spousal support', 'Retirement account orders'],
        fee: 'Dissolution flat fee from $2,500. Contested divorce hourly.',
    },
    {
        id: 'custody', title: 'Custody and child support', lawyer: 'hale',
        body: 'Parenting plans, child support and changes to existing orders when work, schools or homes change.',
        includes: ['Shared parenting plans', 'Support calculations', 'Changes to existing orders'],
        fee: 'Hourly, with a retainer set at the consultation.',
    },
    {
        id: 'prenup', title: 'Prenuptial agreements', lawyer: 'reyes',
        body: 'A clear agreement on property, debts and support, signed well before the wedding so it holds up later.',
        includes: ['Drafting or review', 'Disclosure schedules', 'Postnuptial agreements'],
        fee: 'Flat fee from $1,800.',
    },
    {
        id: 'wills', title: 'Wills and trusts', lawyer: 'okafor',
        body: 'Wills, living trusts, powers of attorney and health care directives, reviewed with you line by line.',
        includes: ['Will and power of attorney package', 'Revocable living trusts', 'Updates after a life change'],
        fee: 'Flat fee from $950. Trust plans from $2,400.',
    },
    {
        id: 'probate', title: 'Probate and estates', lawyer: 'okafor',
        body: 'Help for executors and families after a death, from opening the estate to the final account.',
        includes: ['Opening the estate', 'Notices, inventory and accounts', 'Small estate releases'],
        fee: 'Flat fee for small estates. Larger estates hourly.',
    },
    {
        id: 'guardianship', title: 'Guardianship', lawyer: 'reyes',
        body: 'Court guardianships for an aging parent or an adult child, and the alternatives that avoid one.',
        includes: ['Guardianship of the person or estate', 'Powers of attorney as an alternative', 'Annual reports'],
        fee: 'Flat fee from $2,200, plus court costs.',
    },
];

// The "What is going on?" picker. `area` is a PRACTICE id, or null for
// matters the firm does not handle.
const SITUATIONS = [
    {
        label: 'We both agree to end our marriage', area: 'divorce',
        answer: 'When you agree on everything, Ohio lets you end the marriage by dissolution. It is usually faster and cheaper than a divorce.',
        timeline: 'Usually 2 to 4 months',
        bring: ['A list of assets and debts', 'Recent pay stubs or tax returns for both of you', 'Any agreement you have already drafted'],
    },
    {
        label: 'I was served divorce papers', area: 'divorce', urgent: true,
        answer: 'Read the papers for your deadline to answer, which in Ohio is usually 28 days from service. Call us soon, even before the consultation.',
        timeline: 'Contested cases take 6 to 12 months',
        bring: ['Every page you were served', 'Recent pay stubs and tax returns', 'Any existing court orders'],
    },
    {
        label: 'I need a custody or support order, or a change', area: 'custody',
        answer: 'Courts change orders when circumstances have changed since the last one. We start by looking at your current order.',
        timeline: 'Often 3 to 6 months',
        bring: ['Your current custody or support order', 'Your work schedule and the other parent\'s', 'School and activity calendars'],
    },
    {
        label: 'We are getting married and want a prenup', area: 'prenup',
        answer: 'Start at least three months before the wedding. Each of you needs your own lawyer and time to review the other\'s finances.',
        timeline: 'Usually 4 to 8 weeks',
        bring: ['Your wedding date', 'A list of your assets, debts and income', 'The name of your partner\'s lawyer, if they have one'],
    },
    {
        label: 'I want a will, trust or power of attorney', area: 'wills',
        answer: 'Most families need a will, financial and health care powers of attorney, and a living will. Some also benefit from a trust.',
        timeline: 'Signed in 2 to 3 weeks',
        bring: ['Who you want as executor and guardian', 'A rough list of what you own', 'Beneficiary forms for retirement accounts and life insurance'],
    },
    {
        label: 'Someone died and I need to handle the estate', area: 'probate',
        answer: 'If you are named executor, the first step is filing the will with the probate court. Some small estates qualify for a faster release.',
        timeline: 'Small estates in 2 to 3 months, most estates 6 to 12',
        bring: ['The original will, if there is one', 'The death certificate', 'Recent statements for bank and investment accounts'],
    },
    {
        label: 'A parent can no longer manage on their own', area: 'guardianship',
        answer: 'If your parent can still sign a power of attorney, that may avoid a court guardianship. If not, we can file for one.',
        timeline: 'Usually 4 to 8 weeks',
        bring: ['Any powers of attorney already signed', 'A doctor\'s note on their condition, if you have one', 'A list of their accounts and income'],
    },
    {
        label: 'Something else', area: null,
        answer: 'We only handle family and estate matters. For criminal, injury, business or immigration questions, the Linden County Bar Association runs a lawyer referral line.',
    },
];

// The opening paragraph of the "Our approach" section.
const STATEMENT = 'We have guided families in Linden County through divorce, custody and estates since 2009. We keep it simple. One lawyer stays with your case, the fee is in writing before any work starts, and you always know what happens next.';

const PROMISES = [
    { title: 'The fee in writing first', body: 'A flat fee or an hourly estimate in your engagement letter, before any work starts.' },
    { title: 'A call back in one business day', body: 'From your lawyer or their paralegal, not an answering service.' },
    { title: 'One lawyer, start to finish', body: 'The lawyer you meet at the consultation handles your case.' },
    { title: 'Updates every two weeks', body: 'A short email on where things stand, even when nothing has changed.' },
];

const STEPS = [
    { title: 'Request a consultation', body: 'Call or send the form. We ask the names of the other people involved first, to check that we can take your case.' },
    { title: 'Meet your lawyer', body: 'A 45-minute meeting in our office, by video or by phone. Bring the documents listed for your situation.' },
    { title: 'Get a written plan and fee', body: 'You leave with your options and a fee quote. You decide whether to hire us, with no pressure to sign that day.' },
    { title: 'We start work', body: 'Once you sign the engagement letter, your lawyer sends a first to-do list and the dates that matter.' },
];

const REVIEWS = [
    { name: 'Rachel M.', matter: 'Dissolution', text: 'Claire told us what it would cost on day one, and the final bill matched. We were divorced in eleven weeks and still speak to each other.' },
    { name: 'James and Ana T.', matter: 'Wills and trust', text: 'Daniel explained every page of our trust in plain words, and then did it again for my mother in Spanish with Martín in the room.' },
    { name: 'Priya S.', matter: 'Probate', text: 'I was the executor for my father and had no idea where to start. They sent a checklist the day I hired them and walked me through every filing.' },
];

const FAQ = [
    { q: 'How much does a consultation cost?', a: `${CONSULT.fee.charAt(0).toUpperCase()}${CONSULT.fee.slice(1)}. It lasts ${CONSULT.length}, and you leave with your options and a written fee quote.` },
    { q: 'Is what I tell you confidential?', a: 'Yes. What you tell a lawyer in a consultation stays confidential, even if you do not hire us. Please keep the website form to a short summary until we have run a conflict check.' },
    { q: 'Do you offer flat fees?', a: 'For dissolutions, prenups, wills, trusts, guardianships and small estates, yes. Contested cases are billed hourly, and we give you an estimate in writing.' },
    { q: 'Can I pay in installments?', a: 'For flat-fee work, you can split the fee into three payments. We take cards and bank transfers.' },
    { q: 'Do you handle cases outside Ohio?', a: 'No. We are licensed in Ohio only. If part of your matter is in another state, we work alongside a lawyer licensed there.' },
    { q: 'Do I need a lawyer for an uncontested divorce?', a: 'Ohio does not require one, and the court has forms you can file yourself. A lawyer helps most when there is a house, a retirement account, a business or children involved.' },
];

const ICONS = {
    doc: '<path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M10 12h5M10 16h5"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-4 3.6-6 7-6s6.2 2 7 6"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 10"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    fee: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6.5 9.5v5M17.5 9.5v5"/>',
    alert: '<path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5M12 17v.5"/>',
    out: '<path d="M7 17 17 7M9 7h8v8"/>',
};

// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const initials = (name) => name.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).map((w) => w[0]).slice(0, 2).join('');
const DAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const lawyerById = (id) => ATTORNEYS.find((a) => a.id === id);
const areaById = (id) => PRACTICE.find((p) => p.id === id);

function fmtDate(d) {
    return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
}

// The next `count` consultation openings: each CONSULT.times on each
// CONSULT.days, starting CONSULT.leadDays from today.
function openings(count) {
    const out = [];
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + CONSULT.leadDays);
    const days = CONSULT.days.map((x) => DAY_INDEX[x]);
    for (let i = 0; i < 28 && out.length < count; i++) {
        if (days.includes(d.getDay())) {
            for (const t of CONSULT.times) if (out.length < count) out.push({ date: new Date(d), time: t });
        }
        d.setDate(d.getDate() + 1);
    }
    return out;
}

// ---- Firm details ----------------------------------------------------------------

// The number for tel: links, from the displayed one. Ten digits without a
// country code are read as a US number.
function phoneLink(phone) {
    const digits = String(phone).replace(/\D/g, '');
    if (String(phone).trim().startsWith('+')) return `+${digits}`;
    return digits.length === 10 ? `+1${digits}` : digits;
}

function bindFirm() {
    const values = {
        ...FIRM,
        jurisdiction: JURISDICTION.state,
        cityState: `${FIRM.city}, ${JURISDICTION.state}`,
    };
    document.querySelectorAll('[data-bind]').forEach((el) => {
        const v = values[el.dataset.bind];
        if (v === undefined) return;
        el.textContent = v;
        // An empty value (say, no advertising label) hides its element.
        el.hidden = v === '';
    });
    const hrefs = { tel: `tel:${phoneLink(FIRM.phone)}`, mailto: `mailto:${FIRM.email}` };
    document.querySelectorAll('[data-bind-href]').forEach((el) => { el.href = hrefs[el.dataset.bindHref]; });
    $('#hero-eyebrow').textContent = `${FIRM.focus} · ${FIRM.city}, ${JURISDICTION.state} · Since ${FIRM.since}`;
    $('#i-ack-text').textContent = `I understand that sending this form does not make ${FIRM.shortName} my lawyers.`;
    $('#year').textContent = new Date().getFullYear();
    $('#foot-admissions').textContent = `Licensed in ${JURISDICTION.state}. ${ATTORNEYS.map((a) => `${a.name}, admitted ${a.admitted[0]}`).join('. ')}.`;
}

function renderCreds() {
    const years = new Date().getFullYear() - FIRM.since;
    const creds = [
        { b: `${years} years`, s: `practicing in ${JURISDICTION.counties[0] || JURISDICTION.state}` },
        { b: `${ATTORNEYS.length} attorneys`, s: `licensed in ${JURISDICTION.state}` },
        { b: FIRM.languages, s: 'spoken at every meeting' },
    ].filter((c) => c.b);
    $('#creds').innerHTML = creds.map((c) => `<li><b>${esc(c.b)}</b><span>${esc(c.s)}</span></li>`).join('');
}

function renderNextConsult() {
    const [first] = openings(1);
    if (!first) return;
    $('#next-consult').textContent = `${fmtDate(first.date)}, ${first.time}`;
    const modes = CONSULT.modes.map((m) => m.toLowerCase());
    const how = modes.length > 1 ? `${modes.slice(0, -1).join(', ')} or ${modes[modes.length - 1]}` : modes[0];
    $('#next-consult-sub').textContent = `${CONSULT.length}, ${how}`;
}

// Consultation buttons go to the booking page when there is one.
function initConsult() {
    if (!FIRM.consultUrl) return;
    document.querySelectorAll('[data-consult]').forEach((a) => {
        a.href = FIRM.consultUrl;
        a.target = '_blank';
        a.rel = 'noopener';
    });
    const ext = $('#consult-external');
    ext.href = FIRM.consultUrl;
    ext.hidden = false;
    $('#contact-lede').textContent = 'Pick a time online, or send the form and we will call you within one business day to run a conflict check and set a time.';
}

// ---- Matter finder ------------------------------------------------------------------

let situation = 0;

function initFinder() {
    const root = $('#situations');
    root.innerHTML = SITUATIONS.map((s, i) => `
        <button type="button" class="situation${s.urgent ? ' is-urgent' : ''}" role="radio" aria-checked="${i === situation}" tabindex="${i === situation ? 0 : -1}" data-i="${i}">
            <span class="sit-dot" aria-hidden="true"></span>${esc(s.label)}
        </button>`).join('');
    const pick = (i, focus) => {
        situation = i;
        root.querySelectorAll('.situation').forEach((b, j) => {
            b.setAttribute('aria-checked', String(j === i));
            b.tabIndex = j === i ? 0 : -1;
            if (j === i && focus) b.focus();
        });
        renderFinder();
    };
    root.addEventListener('click', (e) => {
        const b = e.target.closest('.situation');
        if (b) pick(Number(b.dataset.i));
    });
    // Arrow keys move through the options, like a radio group.
    root.addEventListener('keydown', (e) => {
        const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        pick((situation + step + SITUATIONS.length) % SITUATIONS.length, true);
    });
    renderFinder();
}

function renderFinder() {
    const s = SITUATIONS[situation];
    const area = s.area ? areaById(s.area) : null;
    const lawyer = area ? lawyerById(area.lawyer) : null;
    const out = $('#finder-out');
    if (!area) {
        out.innerHTML = `
            <div class="fo-card fo-miss">
                <p class="fo-kicker">Outside our practice</p>
                <h3>We may not be the right firm</h3>
                <p class="fo-answer">${esc(s.answer)}</p>
                <p class="fo-answer">Not sure? Call <a href="tel:${esc(phoneLink(FIRM.phone))}">${esc(FIRM.phone)}</a> and we will tell you in a few minutes whether we can help.</p>
            </div>`;
        return;
    }
    out.innerHTML = `
        <div class="fo-card">
            <p class="fo-kicker">${esc(area.title)}</p>
            ${s.urgent ? `<p class="fo-urgent">${icon('alert')}Time-sensitive. Call <a href="tel:${esc(phoneLink(FIRM.phone))}">${esc(FIRM.phone)}</a> today.</p>` : ''}
            <p class="fo-answer">${esc(s.answer)}</p>
            <dl class="fo-facts">
                ${lawyer ? `<div class="fo-lawyer"><dt>Your lawyer</dt><dd>${lawyer.photo ? `<img src="${esc(lawyer.photo)}" alt="" width="40" height="40">` : `<span class="fo-avatar">${esc(initials(lawyer.name))}</span>`}<span><b>${esc(lawyer.name)}</b><small>${esc(lawyer.title)}</small></span></dd></div>` : ''}
                <div><dt>${icon('fee')}Fee</dt><dd>${esc(area.fee)}</dd></div>
                ${s.timeline ? `<div><dt>${icon('clock')}Timeline</dt><dd>${esc(s.timeline)}</dd></div>` : ''}
            </dl>
            ${s.bring && s.bring.length ? `<p class="fo-bring-title">Bring to your consultation</p><ul class="fo-bring">${s.bring.map((b) => `<li>${icon('check')}${esc(b)}</li>`).join('')}</ul>` : ''}
            <div class="fo-actions">
                <a class="btn btn-ink" href="#contact" data-finder-book>Book a consultation ${icon('arrow')}</a>
            </div>
        </div>`;
    const book = out.querySelector('[data-finder-book]');
    if (FIRM.consultUrl) {
        book.href = FIRM.consultUrl;
        book.target = '_blank';
        book.rel = 'noopener';
    } else {
        book.addEventListener('click', (e) => {
            e.preventDefault();
            prefillIntake({ area: area.id, message: s.label });
        });
    }
}

// ---- Promises, practice areas, attorneys --------------------------------------------

function renderStatement() {
    $('#statement').textContent = STATEMENT;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

function renderPromises() {
    $('#promises').innerHTML = PROMISES.map((p, i) => `
        <li class="promise">
            <span class="promise-n">${ROMAN[i] || i + 1}</span>
            <div><h3>${esc(p.title)}</h3><p>${esc(p.body)}</p></div>
        </li>`).join('');
}

// The first three attorneys, fanned out in the hero, with the first one in
// the middle.
function renderHeroTeam() {
    const [lead, ...rest] = ATTORNEYS;
    const fan = rest.length ? [rest[0], lead, rest[1]].filter(Boolean) : [lead];
    $('#hero-team').innerHTML = fan.map((a, i) => `
        <figure class="team-card" style="--i:${i}">
            ${a.photo ? `<img src="${esc(a.photo)}" alt="${esc(a.alt || a.name)}"${a === lead ? ' fetchpriority="high"' : ''}>` : `<span class="lawyer-initials">${esc(initials(a.name))}</span>`}
            <figcaption><b>${esc(a.name)}</b><span>${esc(a.focus)}</span></figcaption>
        </figure>`).join('');
}

function renderPractice() {
    $('#practice-grid').innerHTML = PRACTICE.map((p, i) => {
        const lawyer = lawyerById(p.lawyer);
        return `
        <article class="area">
            <span class="area-n">${String(i + 1).padStart(2, '0')}</span>
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.body)}</p>
            <ul class="area-list">${p.includes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
            <p class="area-fee">${icon('fee')}<span>${esc(p.fee)}</span></p>
            <div class="area-foot">
                ${lawyer ? `<span class="area-lawyer">${lawyer.photo ? `<img src="${esc(lawyer.photo)}" alt="" width="30" height="30" loading="lazy">` : ''}${esc(lawyer.name)}</span>` : '<span></span>'}
                <a class="area-link" href="#contact" data-area="${esc(p.id)}">Ask about this ${icon('arrow')}</a>
            </div>
        </article>`;
    }).join('');
    $('#practice-grid').addEventListener('click', (e) => {
        const a = e.target.closest('[data-area]');
        if (!a) return;
        e.preventDefault();
        prefillIntake({ area: a.dataset.area });
    });
    $('#foot-practice').innerHTML = PRACTICE.map((p) => `<li><a href="#practice">${esc(p.title)}</a></li>`).join('');
}

function renderAttorneys() {
    const list = (label, items) => items && items.length
        ? `<div class="cred"><dt>${esc(label)}</dt>${items.map((x) => `<dd>${esc(x)}</dd>`).join('')}</div>` : '';
    $('#attorney-list').innerHTML = ATTORNEYS.map((a) => `
        <article class="lawyer">
            <figure class="lawyer-photo">
                ${a.photo ? `<img src="${esc(a.photo)}" alt="${esc(a.alt || a.name)}" loading="lazy">` : `<span class="lawyer-initials">${esc(initials(a.name))}</span>`}
            </figure>
            <div class="lawyer-body">
                <p class="lawyer-title">${esc(a.title)}</p>
                <h3>${esc(a.name)}</h3>
                <p class="lawyer-focus">${esc(a.focus)}</p>
                <p>${esc(a.bio)}</p>
                <dl class="creds-list">
                    ${list('Admitted', a.admitted)}
                    ${list('Education', a.education)}
                    ${list('Memberships', a.memberships)}
                </dl>
                <a class="lawyer-mail" href="mailto:${esc(a.email || FIRM.email)}">${icon('chat')}Email ${esc(a.name.split(' ')[0])}</a>
            </div>
        </article>`).join('');
}

// ---- Consultation and jurisdiction ----------------------------------------------------

function renderProcess() {
    $('#steps').innerHTML = STEPS.map((s, i) => `
        <li class="step">
            <span class="step-n">${i + 1}</span>
            <div><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></div>
        </li>`).join('');
    const facts = [
        ['Length', CONSULT.length],
        ['Fee', CONSULT.fee],
        ['How', CONSULT.modes.join(', ')],
        ['You leave with', CONSULT.outcome],
    ].filter(([, v]) => v);
    $('#consult-facts').innerHTML = facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    $('#slots').innerHTML = openings(4).map((o) => `<li><b>${esc(fmtDate(o.date))}</b><span>${esc(o.time)}</span></li>`).join('');
}

function renderJurisdiction() {
    $('#counties').innerHTML = JURISDICTION.counties.map((c, i) => `<li>${esc(c)}${i === 0 ? ' <small>our office</small>' : ''}</li>`).join('');
    $('#courts').innerHTML = JURISDICTION.courts.map((c) => `<li>${esc(c)}</li>`).join('');
    $('#juris-note').textContent = JURISDICTION.note || '';
    $('#juris-note').hidden = !JURISDICTION.note;
}

// ---- Reviews and FAQ ----------------------------------------------------------------

function renderReviews() {
    const sec = $('#reviews');
    sec.hidden = !REVIEWS.length;
    $('#review-list').innerHTML = REVIEWS.map((r) => `
        <figure class="review">
            <span class="quote-mark" aria-hidden="true">“</span>
            <blockquote>${esc(r.text)}</blockquote>
            <figcaption><b>${esc(r.name)}</b><small>${esc(r.matter)}</small></figcaption>
        </figure>`).join('');
}

function renderFaq() {
    $('#faq-list').innerHTML = FAQ.map((f, i) => `
        <details${i === 0 ? ' open' : ''}>
            <summary>${esc(f.q)}<span aria-hidden="true"></span></summary>
            <p>${esc(f.a)}</p>
        </details>`).join('');
}

// ---- Consultation request form, routed by practice area --------------------------

let mode = CONSULT.modes[0];

function routeFor(areaId) {
    const area = areaById(areaId);
    const lawyer = (area && lawyerById(area.lawyer)) || null;
    return lawyer
        ? { name: lawyer.name, role: lawyer.focus.toLowerCase(), email: lawyer.email || FIRM.email }
        : { name: 'the front desk', role: '', email: FIRM.email };
}

function showRoute() {
    const r = routeFor($('#i-area').value);
    $('#i-route').innerHTML = `${icon('user')}<span>Goes to <b>${esc(r.name)}</b>${r.role ? `, ${esc(r.role)}` : ''}.</span>`;
}

function segmented(root, name, options, value, onChange) {
    root.innerHTML = options.map((o) => `
        <label class="seg-opt">
            <input type="radio" name="${name}" value="${esc(o)}"${o === value ? ' checked' : ''}>
            <span>${esc(o)}</span>
        </label>`).join('');
    root.addEventListener('change', (e) => { if (e.target.name === name) onChange(e.target.value); });
}

function initIntake() {
    const form = $('#intake');
    const area = $('#i-area');
    area.innerHTML = PRACTICE.map((p) => `<option value="${esc(p.id)}">${esc(p.title)}</option>`).join('') + '<option value="other">Something else</option>';
    area.addEventListener('change', showRoute);
    showRoute();
    $('#i-county').innerHTML = JURISDICTION.counties.map((c) => `<option>${esc(c)}</option>`).join('') + '<option value="Other">Another county</option>';
    segmented($('#i-mode'), 'i-mode', CONSULT.modes, mode, (v) => { mode = v; });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = (n) => form.elements[n].value.trim();
        const note = $('#i-note');
        let bad = null;
        for (const n of ['name', 'phone']) {
            const el = form.elements[n];
            const empty = !el.value.trim();
            el.classList.toggle('invalid', empty);
            if (empty && !bad) bad = el;
        }
        const email = form.elements.email;
        const badEmail = !!email.value.trim() && !/^\S+@\S+\.\S+$/.test(email.value.trim());
        email.classList.toggle('invalid', badEmail);
        if (badEmail && !bad) bad = email;
        const ack = form.elements.ack;
        ack.closest('.ack').classList.toggle('invalid', !ack.checked);
        if (!ack.checked && !bad) bad = ack;
        if (bad) {
            note.textContent = bad === ack
                ? 'Please tick the box to confirm you have read it.'
                : bad === email ? 'Check the email address, or leave it empty.' : 'Add your name and a phone number so we can call you back.';
            note.className = 'form-note miss';
            bad.focus();
            return;
        }
        const route = routeFor(val('area'));
        const areaTitle = area.options[area.selectedIndex].text;
        const lines = [
            `Name: ${val('name')}`,
            `Phone: ${val('phone')}`,
            `Email: ${val('email') || 'not given'}`,
            `County: ${val('county')}`,
            `Matter: ${areaTitle}`,
            `Other people involved: ${val('other') || 'not given'}`,
            `Consultation by: ${mode}`,
            '',
            val('message'),
        ];
        const subject = `Consultation request: ${areaTitle}, ${val('name')}`;
        window.location.href = `mailto:${route.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
        note.className = 'form-note ok';
        note.textContent = `Your email app should open with the request to ${route.name}. If it does not, call ${FIRM.phone}.`;
    });
}

function prefillIntake({ area, message }) {
    const form = $('#intake');
    if (area) { form.elements.area.value = area; showRoute(); }
    if (message) form.elements.message.value = message;
    setMenu(false);
    $('#contact').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => form.elements.name.focus({ preventScroll: true }), 500);
}

// ---- Nav ----------------------------------------------------------------------------

function setMenu(open) {
    const toggle = $('.nav-toggle');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    $('#nav-links').classList.toggle('open', open);
}

function initNav() {
    $('.nav-toggle').addEventListener('click', (e) => {
        setMenu(e.currentTarget.getAttribute('aria-expanded') !== 'true');
    });
    $('#nav-links').addEventListener('click', (e) => {
        if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
}

function markSamples() {
    if (!SAMPLE_CONTENT) return;
    document.querySelectorAll('[data-sample]').forEach((el) => { el.hidden = false; });
}

bindFirm();
markSamples();
renderCreds();
renderNextConsult();
initNav();
initFinder();
renderStatement();
renderPromises();
renderHeroTeam();
renderPractice();
renderAttorneys();
renderProcess();
renderJurisdiction();
renderReviews();
renderFaq();
initIntake();
initConsult();
