// =============================================================================
// Morrow Coffee: page code, shared by every page.
// The content lives in content.js. Each part below only runs on the pages that
// have a place for it, so you shouldn't need to change this file to update
// the menu, hours or anything else the shop says.
// =============================================================================

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEK = [1, 2, 3, 4, 5, 6, 0];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICONS = {
    sunrise: '<path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 4v4M5.6 9.6l1.8 1.8M18.4 9.6l-1.8 1.8M2 14h2M20 14h2"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
    sunset: '<path d="M4 18h16M7 18a5 5 0 0 1 10 0M12 9V4M9.5 6.5L12 9l2.5-2.5M2 14h2M20 14h2"/>',
    wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19.2" r="1" fill="currentColor"/>',
    plug: '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>',
    paw: '<circle cx="6" cy="10" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14" cy="6" r="1.8"/><circle cx="18" cy="10" r="1.8"/><path d="M12 11c-3 0-5.5 4-5.5 6.2 0 1.6 1.4 2.3 2.8 2 1-.2 1.8-.6 2.7-.6s1.7.4 2.7.6c1.4.3 2.8-.4 2.8-2C17.5 15 15 11 12 11z"/>',
    step: '<circle cx="10" cy="4.5" r="1.8"/><path d="M10 7.5v6h5l2.5 6M10 10.5h4.5"/><path d="M7.2 11.2a5.5 5.5 0 1 0 7.6 7.1"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15M5 19c2.5-4 5.5-7 9-9"/>',
    group: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20a5.5 5.5 0 0 1 11 0M14 15.2a4.5 4.5 0 0 1 7.5 3.3"/>',
    cup: '<path d="M4 9h13v4a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6zM17 10.5h1.5a2.5 2.5 0 0 1 0 5H16.5M8 3.5c-.8 1 .8 2 0 3M12 3.5c-.8 1 .8 2 0 3"/>',
    pin: '<path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.4" class="accent"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2" class="accent-line"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="1.5"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5" class="accent-line"/>',
};
const icon = (name) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// ---- Time helpers -----------------------------------------------------------

const toMinutes = (hhmm) => {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + (m || 0);
};

// 420 → "7 am", 1110 → "6:30 pm"
function clock(mins) {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''} ${h < 12 ? 'am' : 'pm'}`;
}
const formatTime = (hhmm) => clock(toMinutes(hhmm));
const span = (h) => `${formatTime(h.open)} – ${formatTime(h.close)}`;

// Menu prices always show cents ("$6.00"); bag prices drop them when whole ("$18").
const formatPrice = (n, cents = true) => '$' + (cents || !Number.isInteger(n) ? n.toFixed(2) : String(n));

// The current day and minute in the shop's own time zone.
function shopNow() {
    const now = new Date();
    try {
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: SHOP.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(now);
        const get = (type) => (parts.find((p) => p.type === type) || {}).value;
        const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
        const minutes = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
        if (day >= 0 && Number.isFinite(minutes)) return { day, minutes };
    } catch (e) { /* unknown time zone: fall back to the visitor's clock */ }
    return { day: now.getDay(), minutes: now.getHours() * 60 + now.getMinutes() };
}

const hoursFor = (day) => HOURS.find((h) => h.day === day) || null;

function openStatus(now = shopNow()) {
    const today = hoursFor(now.day);
    if (today) {
        const open = toMinutes(today.open);
        const close = toMinutes(today.close);
        if (now.minutes >= open && now.minutes < close) {
            const soon = close - now.minutes <= 30;
            return {
                open: true,
                soon,
                short: soon ? `Closing soon · ${formatTime(today.close)}` : `Open · until ${formatTime(today.close)}`,
                long: soon ? `Closing at ${formatTime(today.close)}, last orders now` : `Open now until ${formatTime(today.close)}`,
            };
        }
        if (now.minutes < open) {
            return { open: false, short: `Opens ${formatTime(today.open)}`, long: `Closed right now. Opening at ${formatTime(today.open)} today` };
        }
    }
    for (let i = 1; i <= 7; i++) {
        const day = (now.day + i) % 7;
        const next = hoursFor(day);
        if (!next) continue;
        const when = i === 1 ? 'tomorrow' : DAY_NAMES[day];
        return { open: false, short: `Opens ${when} ${formatTime(next.open)}`, long: `Closed right now. Back ${when} at ${formatTime(next.open)}` };
    }
    return { open: false, short: 'Closed', long: 'Closed for now' };
}

// Days with the same hours, grouped: "Monday – Thursday · 7 am – 6 pm".
function groupedHours() {
    const groups = [];
    for (const day of WEEK) {
        const h = hoursFor(day);
        const text = h ? span(h) : 'Closed';
        const last = groups[groups.length - 1];
        if (last && last.text === text) last.days.push(day);
        else groups.push({ days: [day], text });
    }
    return groups.map((g) => ({
        label: g.days.length === 1 ? DAY_NAMES[g.days[0]] : `${DAY_NAMES[g.days[0]]} – ${DAY_NAMES[g.days[g.days.length - 1]]}`,
        text: g.text,
        days: g.days,
    }));
}

// ---- Shop details (every page) -------------------------------------------------

const phoneHref = () => 'tel:' + SHOP.phone.replace(/[^\d+]/g, '');
const mapHref = () => SHOP.mapUrl ||
    'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(`${SHOP.name}, ${SHOP.street}, ${SHOP.city}`);

function renderShop() {
    $$('[data-shop]').forEach((el) => {
        const value = SHOP[el.dataset.shop];
        if (value) el.textContent = value;
    });
    $$('[data-phone-link]').forEach((a) => { a.href = phoneHref(); });
    $$('[data-email-link]').forEach((a) => { a.href = 'mailto:' + SHOP.email; });
    $$('[data-map-link]').forEach((a) => { a.href = mapHref(); a.target = '_blank'; a.rel = 'noopener'; });
    $$('[data-order]').forEach((a) => {
        if (SHOP.orderUrl) {
            a.href = SHOP.orderUrl;
            a.target = '_blank';
            a.rel = 'noopener';
        } else {
            a.href = phoneHref();
            a.title = `Call ${SHOP.phone} to order ahead`;
        }
    });
    $$('[data-address]').forEach((el) => { el.innerHTML = `${esc(SHOP.street)}<br>${esc(SHOP.city)}`; });
    $$('[data-address-line]').forEach((el) => { el.textContent = `${SHOP.street}, ${SHOP.city.split(',')[0]}`; });
    $$('[data-socials]').forEach((el) => {
        el.innerHTML = SHOP.socials
            .map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a></li>`).join('');
    });
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
}

// ---- Hours and "open now" --------------------------------------------------------

function renderStatus() {
    const now = shopNow();
    const status = openStatus(now);
    const today = hoursFor(now.day);

    $$('[data-status]').forEach((el) => {
        el.classList.toggle('is-open', status.open && !status.soon);
        el.classList.toggle('is-soon', !!status.soon);
        const text = $('[data-status-text]', el);
        if (text) text.textContent = el.dataset.status === 'long' ? status.long : status.short;
    });
    $$('[data-today-hours]').forEach((el) => {
        el.textContent = today ? `Today ${span(today)}` : 'Closed today';
    });
    $$('[data-hours-summary]').forEach((el) => {
        el.innerHTML = groupedHours().map((g) => {
            const today = g.days.includes(now.day);
            return `<li class="${today ? 'is-today' : ''}"${today ? ' aria-current="date"' : ''}>
                <span>${esc(g.label)}</span><span>${esc(g.text)}</span></li>`;
        }).join('');
    });

    if ($('[data-dayparts]')) renderDayparts(now, status);
    if ($('[data-roast]')) renderRoast(now);
}

// The three parts of the day, trimmed to the hours of the day they show.
function renderDayparts(now, status) {
    // Today while we're open or still to open; after closing, the next open day.
    const today = hoursFor(now.day);
    let day = now.day;
    let title = 'What\'s on today';
    if (status.open) {
        title = 'What\'s on right now';
    } else if (!today || now.minutes >= toMinutes(today.close)) {
        for (let i = 1; i <= 7; i++) {
            if (hoursFor((now.day + i) % 7)) { day = (now.day + i) % 7; break; }
        }
        title = `What's on ${day === (now.day + 1) % 7 ? 'tomorrow' : DAY_NAMES[day]}`;
    }
    $$('[data-now-title]').forEach((el) => { el.textContent = title; });
    const hours = hoursFor(day);
    const open = hours ? toMinutes(hours.open) : 0;
    const close = hours ? toMinutes(hours.close) : 24 * 60;

    const parts = DAYPARTS.map((p) => {
        const from = Math.max(toMinutes(p.from), open);
        const to = Math.min(toMinutes(p.to), close);
        return { ...p, from, to, off: to <= from };
    });
    const current = status.open && day === now.day
        ? parts.findIndex((p) => !p.off && now.minutes >= p.from && now.minutes < p.to)
        : -1;
    const next = current === -1
        ? parts.findIndex((p) => !p.off && (day !== now.day || p.to > now.minutes))
        : -1;

    $('[data-dayparts]').innerHTML = parts.map((p, i) => {
        const state = i === current ? 'is-now' : i === next ? 'is-next' : p.off ? 'is-off' : '';
        const badge = i === current ? 'Now' : 'Up next';
        const time = p.off ? `Not on ${day === now.day ? 'today' : DAY_NAMES[day]}` : `${clock(p.from)} – ${clock(p.to)}`;
        return `<li class="board-card ${state}">
            <span class="board-tape">${badge}</span>
            <p class="board-time">${icon(p.icon)}${time}</p>
            <h3>${esc(p.name)}</h3>
            <p class="board-line">${esc(p.line)}</p>
            <ul class="board-items">${p.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        </li>`;
    }).join('');
}

function renderRoast(now) {
    const days = (SHOP.roastDay - now.day + 7) % 7;
    const when = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : DAY_NAMES[SHOP.roastDay];
    const sub = days === 0 ? 'Fresh bags on the shelf by noon' : `In ${days} day${days === 1 ? '' : 's'}. Fresh bags by noon`;
    $('[data-roast-when]').innerHTML = `${esc(when)}<small>${esc(sub)}</small>`;
    $('[data-roast-week]').innerHTML = WEEK.map((day) => {
        const cls = [day === SHOP.roastDay ? 'is-roast' : '', day === now.day ? 'is-today' : ''].join(' ');
        return `<li class="${cls}">${DAY_NAMES[day][0]}</li>`;
    }).join('');
}

// The address, hours and contact columns shown on the home and Visit pages.
function renderInfoBand() {
    $$('[data-info-band]').forEach((band) => {
        const contactHref = band.dataset.infoBand === 'visit' ? '#contact' : 'visit.html#contact';
        band.innerHTML = `
            <div class="info-col info-sage">
                <span class="info-icon">${icon('pin')}</span>
                <h3>Find us</h3>
                <p class="info-big" data-address></p>
                <a class="scribble-link" href="#" data-map-link>Open in Maps</a>
            </div>
            <div class="info-col info-oat">
                <span class="info-icon">${icon('clock')}</span>
                <h3>Opening hours</h3>
                <ul class="hours-summary" data-hours-summary></ul>
                <p class="status" data-status="long"><span class="status-dot" aria-hidden="true"></span><span data-status-text></span></p>
            </div>
            <div class="info-col info-peach">
                <span class="info-icon">${icon('mail')}</span>
                <h3>Say hello</h3>
                <p class="info-big"><a href="#" data-phone-link data-shop="phone"></a><br><a href="#" data-email-link data-shop="email"></a></p>
                <a class="scribble-link" href="${contactHref}">Write to us</a>
            </div>`;
    });
}

// ---- Menu (menu page) ---------------------------------------------------------------

let activeSection = MENU[0].id;
let activeSize = SIZES[SIZES.length - 1].id;

const sizeIndex = () => Math.max(0, SIZES.findIndex((s) => s.id === activeSize));
const priceOf = (item) => (Array.isArray(item.price) ? item.price[Math.min(sizeIndex(), item.price.length - 1)] : item.price);
const findItem = (id) => {
    for (const section of MENU) {
        const item = section.items.find((i) => i.id === id);
        if (item) return { section, item };
    }
    return null;
};

const TAG_LABELS = { fav: 'House fav', iced: 'Iced ok', vg: 'Vegan', gf: 'GF' };

function setupMenu() {
    const tabs = $('[data-menu-tabs]');
    if (!tabs) return;
    tabs.innerHTML = MENU.map((s) =>
        `<button class="tab" type="button" role="tab" id="tab-${esc(s.id)}" aria-controls="menu-panel" data-tab="${esc(s.id)}">${esc(s.label)}</button>`,
    ).join('');
    tabs.addEventListener('click', (e) => {
        const tab = e.target.closest('[data-tab]');
        if (tab) selectSection(tab.dataset.tab);
    });
    tabs.addEventListener('keydown', (e) => {
        const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        let i = MENU.findIndex((s) => s.id === activeSection);
        if (e.key in keys) i = (i + keys[e.key] + MENU.length) % MENU.length;
        else if (e.key === 'Home') i = 0;
        else if (e.key === 'End') i = MENU.length - 1;
        else return;
        e.preventDefault();
        selectSection(MENU[i].id, { focusTab: true });
    });

    $('[data-sizes]').innerHTML = SIZES.map((s) =>
        `<label><input type="radio" name="size" value="${esc(s.id)}"${s.id === activeSize ? ' checked' : ''}><span>${esc(s.label)}</span></label>`,
    ).join('');
    $('[data-sizes]').addEventListener('change', (e) => {
        activeSize = e.target.value;
        renderMenuPanel();
        renderFinder();
    });
    $('[data-menu-panel]').id = 'menu-panel';
    $('[data-menu-note]').textContent = MENU_NOTE;

    // menu.html#brunch opens that section.
    const fromHash = () => {
        const id = decodeURIComponent(location.hash.slice(1));
        if (MENU.some((s) => s.id === id)) selectSection(id);
    };
    window.addEventListener('hashchange', fromHash);
    selectSection(activeSection);
    fromHash();
}

function selectSection(id, { focusTab = false } = {}) {
    activeSection = id;
    $$('[data-tab]').forEach((t) => {
        const on = t.dataset.tab === id;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (on && focusTab) t.focus();
    });
    renderMenuPanel();
}

function renderMenuPanel() {
    const section = MENU.find((s) => s.id === activeSection) || MENU[0];
    const panel = $('[data-menu-panel]');
    panel.setAttribute('aria-labelledby', `tab-${section.id}`);
    $('[data-sizes]').classList.toggle('is-idle', !section.items.some((i) => Array.isArray(i.price)));
    panel.innerHTML = `
        <div class="board-head"><h2>${esc(section.label)}</h2><p>${esc(section.intro || '')}</p></div>
        <ul class="menu-items">${section.items.map((item) => {
            const tags = (item.tags || []).map((t) => `<span class="tag${t === 'fav' ? ' tag-fav' : ''}">${esc(TAG_LABELS[t] || t)}</span>`).join('');
            return `<li class="menu-item" id="item-${esc(item.id)}" tabindex="-1">
                <div class="menu-item-top">
                    <span class="menu-item-name">${esc(item.name)}</span>
                    <span class="menu-item-price">${formatPrice(priceOf(item))}</span>
                </div>
                <p class="menu-item-desc">${esc(item.desc || '')}</p>
                ${tags ? `<p class="tags">${tags}</p>` : ''}
            </li>`;
        }).join('')}</ul>`;
}

// ---- Order like a regular (menu page) ------------------------------------------------

function finderPick() {
    const form = $('[data-finder]');
    const value = (name) => (form.querySelector(`input[name="${name}"]:checked`) || {}).value;
    return FINDER[[value('temp'), value('milk'), value('mood')].join('-')] || null;
}

function renderFinder() {
    const out = $('[data-finder-result]');
    if (!out) return;
    const pick = finderPick();
    const found = pick && findItem(pick.item);
    if (!found) {
        out.innerHTML = '<p>Pick one of each and we\'ll suggest something.</p>';
        return;
    }
    out.innerHTML = `
        <p class="finder-label">Try the</p>
        <p class="finder-name">${esc(found.item.name)} <span>${formatPrice(priceOf(found.item))}</span></p>
        <p class="finder-why">${esc(pick.why)}</p>
        <button class="scribble-link finder-go" type="button" data-finder-go="${esc(found.item.id)}">Find it on the menu</button>`;
}

function showOnMenu(id) {
    const found = findItem(id);
    if (!found) return;
    selectSection(found.section.id);
    const row = document.getElementById(`item-${id}`);
    if (!row) return;
    row.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    row.focus({ preventScroll: true });
    row.classList.add('is-picked');
    setTimeout(() => row.classList.remove('is-picked'), 1400);
}

function setupFinder() {
    const form = $('[data-finder]');
    if (!form) return;
    form.addEventListener('change', renderFinder);
    form.addEventListener('submit', (e) => e.preventDefault());
    $('[data-finder-result]').addEventListener('click', (e) => {
        const go = e.target.closest('[data-finder-go]');
        if (go) showOnMenu(go.dataset.finderGo);
    });
    renderFinder();
}

// ---- Beans, the room, regulars and reviews ---------------------------------------------

function renderBeans() {
    const list = $('[data-beans]');
    if (!list) return;
    list.innerHTML = BEANS.map((b, i) => {
        const subject = encodeURIComponent(`Please set aside a bag of ${b.name}`);
        const body = encodeURIComponent(`Hi! Could you set aside a ${b.size} bag of ${b.name} for me? I'll pick it up on:\n\nName:\n`);
        const meter = Array.from({ length: 5 }, (_, n) => `<i class="${n < b.roast ? 'on' : ''}"></i>`).join('');
        const roastWord = ['light', 'light-medium', 'medium', 'medium-dark', 'dark'][Math.min(4, Math.max(0, b.roast - 1))];
        return `<li class="bag">
            <span class="bag-fold" aria-hidden="true"></span>
            ${b.fresh ? '<span class="bag-sticker">Just<br>roasted</span>' : ''}
            <div class="bag-label">
                <p class="bag-kind">${esc(b.kind)} · No. ${String(i + 1).padStart(2, '0')}</p>
                <h3 class="bag-name">${esc(b.name)}</h3>
                <p class="bag-origin">${esc(b.origin)}</p>
                <dl class="bag-specs">
                    <div><dt>Process</dt><dd>${esc(b.process)}</dd></div>
                    <div><dt>Brew as</dt><dd>${esc(b.brew)}</dd></div>
                </dl>
                <p class="bag-notes">${b.notes.map(esc).join(' · ')}</p>
                <p class="roast-meter" role="img" aria-label="Roast: ${roastWord}"><span>Light</span>${meter}<span>Dark</span></p>
            </div>
            <div class="bag-foot">
                <span class="bag-price">${formatPrice(b.price, false)} <small>/ ${esc(b.size)}</small></span>
                <a class="bag-reserve" href="mailto:${esc(SHOP.email)}?subject=${subject}&amp;body=${body}">Set one aside</a>
            </div>
        </li>`;
    }).join('');
}

function renderAmenities() {
    $$('[data-amenities]').forEach((el) => {
        el.innerHTML = AMENITIES.map((a) => `<li>${icon(a.icon)}<span>${esc(a.label)}</span></li>`).join('');
    });
}

function renderStampCard() {
    const el = $('[data-stamps]');
    if (!el) return;
    const slots = Array.from({ length: STAMP_CARD.stamps }, (_, i) => {
        if (i === STAMP_CARD.stamps - 1) return '<span class="stamp-slot is-free">Free</span>';
        if (i < STAMP_CARD.filled) {
            const tilt = [-14, 8, -4, 12, -9, 5, -12, 9, -6][i % 9];
            return `<span class="stamp-slot is-stamped" style="transform:rotate(${tilt}deg)">${icon('cup')}</span>`;
        }
        return `<span class="stamp-slot">${i + 1}</span>`;
    }).join('');
    el.innerHTML = `
        <div class="stamp-card-head"><strong>${esc(SHOP.shortName)}</strong><span>Regular's card</span></div>
        <div class="stamp-grid">${slots}</div>`;
}

function renderReviews() {
    const list = $('[data-reviews]');
    if (!list) return;
    list.innerHTML = REVIEWS.map((r) => `
        <li><figure class="review">
            <blockquote>“${esc(r.quote)}”</blockquote>
            <figcaption>${esc(r.name)} · ${esc(r.source)}</figcaption>
        </figure></li>`).join('');
    $$('[data-reviews-note]').forEach((el) => { el.textContent = REVIEWS_NOTE || ''; });
}

function renderGettingHere() {
    $$('[data-getting-here]').forEach((el) => {
        el.innerHTML = GETTING_HERE.map((g) => `<li><strong>${esc(g.label)}</strong><span>${esc(g.text)}</span></li>`).join('');
    });
}

// ---- Forms: contact (Visit page) and the Tuesday letter (every page) ----------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST to an endpoint when one is set, else open an email to the shop.
async function deliver({ endpoint, payload, subject, body }) {
    if (endpoint) {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('status ' + res.status);
        return 'sent';
    }
    window.location.href = `mailto:${SHOP.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    return 'mail';
}

function setupLetter() {
    $$('[data-letter]').forEach((form) => {
        const input = form.querySelector('input[type="email"]');
        const msg = form.parentElement.querySelector('[data-letter-msg]');
        const say = (text, error = false) => {
            msg.textContent = text;
            msg.classList.toggle('is-error', error);
        };
        input.addEventListener('input', () => input.removeAttribute('aria-invalid'));
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = input.value.trim();
            if (!EMAIL_RE.test(email)) {
                input.setAttribute('aria-invalid', 'true');
                say('That email doesn\'t look quite right.', true);
                input.focus();
                return;
            }
            const button = form.querySelector('button');
            button.disabled = true;
            try {
                const how = await deliver({
                    endpoint: SHOP.letterEndpoint,
                    payload: { email },
                    subject: 'Add me to the Tuesday letter',
                    body: `Please add ${email} to the Tuesday letter.`,
                });
                if (how === 'sent') form.reset();
                say(how === 'sent' ? 'You\'re on the list. See you Tuesday.' : 'Your email app should open with a note to us. Hit send and you\'re in.');
            } catch (err) {
                say('We couldn\'t sign you up just now. Please try again in a moment.', true);
            } finally {
                button.disabled = false;
            }
        });
    });
}

function setupContact() {
    const form = $('[data-contact]');
    if (!form) return;
    const topic = form.querySelector('select[name="topic"]');
    topic.innerHTML = CONTACT_TOPICS.map((t) => `<option>${esc(t)}</option>`).join('');
    const msg = $('[data-contact-msg]');
    const say = (text, error = false) => {
        msg.textContent = text;
        msg.classList.toggle('is-error', error);
    };
    form.addEventListener('input', (e) => e.target.removeAttribute('aria-invalid'));
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        for (const key of Object.keys(data)) data[key] = String(data[key]).trim();
        const bad = [];
        if (!data.name) bad.push(['name', 'Please tell us your name.']);
        if (!EMAIL_RE.test(data.email || '')) bad.push(['email', 'Please check your email address.']);
        if (!data.message) bad.push(['message', 'Please write a short message.']);
        if (bad.length) {
            bad.forEach(([name]) => form.elements[name].setAttribute('aria-invalid', 'true'));
            say(bad[0][1], true);
            form.elements[bad[0][0]].focus();
            return;
        }
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        try {
            const how = await deliver({
                endpoint: SHOP.contactEndpoint,
                payload: data,
                subject: `${data.topic}: from ${data.name}`,
                body: `${data.message}\n\n${data.name}\n${data.email}`,
            });
            if (how === 'sent') form.reset();
            say(how === 'sent' ? 'Thanks! We\'ll write back within a day or two.' : 'Your email app should open with your message. Hit send and we\'ll write back soon.');
        } catch (err) {
            say(`We couldn't send that just now. You can always email ${SHOP.email}.`, true);
        } finally {
            button.disabled = false;
        }
    });
}

// ---- Navigation ------------------------------------------------------------------------

function setupNav() {
    const toggle = $('[data-nav-toggle]');
    const links = $('[data-nav-links]');
    if (!toggle || !links) return;
    const setOpen = (open) => {
        links.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.querySelector('.sr-only').textContent = open ? 'Close the menu' : 'Open the menu';
    };
    toggle.addEventListener('click', () => setOpen(!links.classList.contains('is-open')));
    links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && links.classList.contains('is-open')) {
            setOpen(false);
            toggle.focus();
        }
    });
}

// ---- Start -------------------------------------------------------------------------------

renderInfoBand();
renderShop();
renderStatus();
setupMenu();
setupFinder();
renderBeans();
renderAmenities();
renderStampCard();
renderReviews();
renderGettingHere();
setupContact();
setupLetter();
setupNav();

// Keep "open now" and the part of the day current while the page stays open.
setInterval(renderStatus, 60 * 1000);
