import { createIcons, icons } from 'https://cdn.jsdelivr.net/npm/lucide@latest/+esm';

// Page content lives here as data so it is easy to find and change.

const PREVIEW_DAYS = [
    { day: 'Monday', items: [['09:00', 'Weekly planning', 'bg-brand-50 text-brand-700'], ['10:00', 'Focus: launch brief', 'bg-emerald-50 text-emerald-700'], ['14:30', 'Design review', 'bg-amber-50 text-amber-700']] },
    { day: 'Tuesday', items: [['09:30', 'Customer calls', 'bg-amber-50 text-amber-700'], ['13:00', 'Focus: pricing page', 'bg-emerald-50 text-emerald-700'], ['16:00', 'Buffer', 'bg-slate-100 text-slate-600']] },
    { day: 'Wednesday', items: [['10:00', 'Team sync', 'bg-amber-50 text-amber-700'], ['11:00', 'Focus: onboarding', 'bg-emerald-50 text-emerald-700'], ['15:00', 'Inbox zero', 'bg-brand-50 text-brand-700']] },
];

const FEATURES = [
    { icon: 'calendar-range', title: 'One plan for everything', body: 'Meetings, tasks and personal time live side by side, so nothing gets double-booked.' },
    { icon: 'brain', title: 'Realistic by default', body: 'Lumen learns how long things really take you and plans around it, buffers included.' },
    { icon: 'shuffle', title: 'Replans automatically', body: 'When your day changes, the rest of the week rearranges itself without the guilt.' },
    { icon: 'target', title: 'Goals that get time', body: 'Set weekly goals and Lumen reserves focus blocks for them before the week fills up.' },
    { icon: 'users', title: 'Shared team plans', body: 'See when teammates are heads down and find meeting slots that respect focus time.' },
    { icon: 'bar-chart-3', title: 'Weekly review', body: 'A short Friday summary of where your time went and what to carry into next week.' },
];

const PLANS = [
    { name: 'Personal', monthly: 0, yearly: 0, blurb: 'For planning your own week.', features: ['1 calendar', 'Unlimited tasks', 'Weekly review'], cta: 'Start free', featured: false },
    { name: 'Pro', monthly: 10, yearly: 8, blurb: 'For people with busy calendars.', features: ['Unlimited calendars', 'Automatic replanning', 'Focus goals', 'Priority support'], cta: 'Start 14-day trial', featured: true },
    { name: 'Team', monthly: 18, yearly: 14, blurb: 'For teams that plan together.', features: ['Everything in Pro', 'Shared team plans', 'Meeting slot finder', 'Admin controls'], cta: 'Contact sales', featured: false },
];

const FAQ = [
    { q: 'Which calendars does Lumen work with?', a: 'Google Calendar, Outlook and any calendar that supports iCal subscriptions.' },
    { q: 'Can I try Pro before paying?', a: 'Yes. Every account can try Pro free for 14 days, and you can switch back to Personal at any time.' },
    { q: 'What happens to my data if I cancel?', a: 'You can export your plans and tasks at any time, and we delete your account data 30 days after you cancel.' },
    { q: 'Is there a discount for nonprofits and schools?', a: 'Yes. Nonprofits and schools get 50% off Pro and Team. Get in touch and we will set it up.' },
];

let billing = 'monthly';

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
}

function icon(name, className) {
    const i = document.createElement('i');
    i.setAttribute('data-lucide', name);
    i.className = className;
    return i;
}

function renderPreview() {
    const root = document.getElementById('preview-days');
    root.replaceChildren(...PREVIEW_DAYS.map(({ day, items }) => {
        const col = el('div', 'rounded-lg border border-slate-200 p-3');
        col.append(el('p', 'mb-2 text-sm font-semibold text-slate-700', day));
        for (const [time, label, tone] of items) {
            const row = el('div', `mb-2 rounded-md px-3 py-2 text-xs font-medium ${tone}`);
            row.append(el('span', 'block opacity-70', time), el('span', 'block', label));
            col.append(row);
        }
        return col;
    }));
}

function renderFeatures() {
    const root = document.getElementById('features-grid');
    root.replaceChildren(...FEATURES.map(f => {
        const card = el('div', 'rounded-xl border border-slate-200 p-6');
        const chip = el('span', 'inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600');
        chip.append(icon(f.icon, 'h-5 w-5'));
        card.append(chip, el('h3', 'mt-4 font-semibold', f.title), el('p', 'mt-2 text-sm text-slate-600', f.body));
        return card;
    }));
}

function renderPricing() {
    const root = document.getElementById('pricing-grid');
    root.replaceChildren(...PLANS.map(plan => {
        const price = billing === 'yearly' ? plan.yearly : plan.monthly;
        const card = el('div', `flex flex-col rounded-2xl border p-8 ${plan.featured ? 'border-brand-600 ring-1 ring-brand-600' : 'border-slate-200'}`);
        const head = el('div', 'flex items-center justify-between');
        head.append(el('h3', 'text-lg font-semibold', plan.name));
        if (plan.featured) head.append(el('span', 'rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700', 'Most popular'));
        const amount = el('p', 'mt-4 flex items-baseline gap-1');
        amount.append(el('span', 'text-4xl font-bold', price === 0 ? 'Free' : `$${price}`));
        if (price !== 0) amount.append(el('span', 'text-sm text-slate-500', '/ user / month'));
        const list = el('ul', 'mt-6 flex-1 space-y-3 text-sm text-slate-700');
        for (const f of plan.features) {
            const li = el('li', 'flex items-center gap-2');
            li.append(icon('check', 'h-4 w-4 text-brand-600'), document.createTextNode(f));
            list.append(li);
        }
        const cta = el('a', `mt-8 rounded-lg px-4 py-2.5 text-center text-sm font-medium ${plan.featured ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`, plan.cta);
        cta.href = '#signup';
        card.append(head, el('p', 'mt-2 text-sm text-slate-600', plan.blurb), amount, list, cta);
        return card;
    }));
    document.querySelectorAll('.billing-btn').forEach(btn => {
        const active = btn.dataset.billing === billing;
        btn.classList.toggle('bg-slate-900', active);
        btn.classList.toggle('text-white', active);
        btn.classList.toggle('text-slate-600', !active);
        btn.setAttribute('aria-pressed', String(active));
    });
    createIcons({ icons });
}

function renderFaq() {
    const root = document.getElementById('faq-list');
    root.replaceChildren(...FAQ.map(item => {
        const details = el('details', 'group px-6 py-5');
        const summary = el('summary', 'flex cursor-pointer list-none items-center justify-between gap-4 font-medium');
        summary.append(el('span', '', item.q), icon('chevron-down', 'h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180'));
        details.append(summary, el('p', 'mt-3 text-sm text-slate-600', item.a));
        return details;
    }));
}

function setupMenu() {
    const toggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('mobile-menu');
    toggle.addEventListener('click', () => {
        const open = menu.classList.toggle('hidden') === false;
        toggle.setAttribute('aria-expanded', String(open));
    });
    menu.addEventListener('click', (e) => {
        if (e.target.closest('a')) {
            menu.classList.add('hidden');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });
}

// The waitlist form only confirms on screen for now. Connect it to a backend
// (for example a Puter serverless worker) to actually collect sign-ups.
function setupSignup() {
    const form = document.getElementById('signup-form');
    const input = document.getElementById('signup-email');
    const message = document.getElementById('signup-message');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = input.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            message.textContent = 'Please enter a valid email address.';
            input.focus();
            return;
        }
        message.textContent = `Thanks! We will email ${email} when your spot opens.`;
        form.reset();
    });
}

document.querySelectorAll('.billing-btn').forEach(btn => {
    btn.addEventListener('click', () => { billing = btn.dataset.billing; renderPricing(); });
});
document.getElementById('year').textContent = new Date().getFullYear();

renderPreview();
renderFeatures();
renderFaq();
renderPricing();
setupMenu();
setupSignup();
createIcons({ icons });
