// Page content lives here as data so it is easy to find and change. Each block
// below is one thing the shop owner has to make their own:
//
//   BUSINESS      who you are: name, phone, email, address, license, timezone.
//                 Fills every element with data-bind="<key>", and links with
//                 data-bind-href="tel|sms|mailto".
//   VEHICLES,
//   SERVICES      what you fix and what it usually costs. The quick quote, the
//                 service cards, the booking form and the work order read it.
//   LIGHTS        the dashboard warning light guide.
//   SPECIALS      coupons. Each one hides itself after its end date.
//   JOBS, REVIEWS proof of work. Samples until SAMPLE_CONTENT is false.
//   HOURS,
//   BOOKING       when you work, and the drop-off and ride options.
//   ENQUIRY       where bookings go: an email address, or a form endpoint that
//                 accepts a JSON POST.
//
// SAMPLE_CONTENT marks the reviews, rating, offers, jobs and license as samples
// on the page. Set it to false once they are the shop's own.

const SAMPLE_CONTENT = true;

const BUSINESS = {
    name: 'Copperhill Auto Works',
    shortName: 'Copperhill',
    trade: 'Auto Works',
    since: 1998,
    phone: '(555) 014-2290',
    email: 'service@example.com',
    address: '218 Mill Street, Ashby',
    street: 'Mill Street',
    baseTown: 'Ashby',
    region: 'the Ashby area',
    license: 'State repair facility no. ARF-40712',
    bays: 6,
    techs: 5,
    rating: 4.9,
    reviewCount: 638,
    ratingSource: 'Google',
    makes: ['Toyota', 'Ford', 'Honda', 'Chevrolet', 'Subaru', 'Nissan', 'Hyundai', 'Jeep', 'Kia', 'Volkswagen', 'Mazda', 'Ram', 'GMC', 'BMW', 'Audi', 'Lexus', 'Tesla'],
    // Hours, "open now" and the drop-off days are worked out in this timezone,
    // whatever timezone the visitor is in.
    timezone: 'America/New_York',
};

const WARRANTY = { months: 24, miles: 24000, covers: 'Parts and labor on every repair we do.' };

// Price ranges below are for a car. Each vehicle type scales them by factor.
// ev: false on a service hides it for that type (an electric car has no oil).
const VEHICLES = [
    { id: 'car', label: 'Car', factor: 1 },
    { id: 'suv', label: 'SUV or van', factor: 1.15 },
    { id: 'truck', label: 'Pickup', factor: 1.3 },
    { id: 'hybrid', label: 'Hybrid', factor: 1.1 },
    { id: 'ev', label: 'Electric', factor: 1.15, ev: true },
];

// price is [low, high] for a car, parts and labor. hours is the usual time in
// the shop. wait: true means a customer can wait for it. ev: false means an
// electric car does not need it. fixed: true means the price does not scale.
const SERVICES = [
    { id: 'oil', cat: 'Maintenance', icon: 'oil', name: 'Synthetic oil change', blurb: 'Up to 5 quarts, new filter, fluids topped up and a free inspection.', price: [69, 99], hours: 0.5, wait: true, ev: false },
    { id: 'coolant', cat: 'Maintenance', icon: 'drop', name: 'Coolant flush', blurb: 'Old coolant out, the right type in, and the system pressure tested.', price: [139, 189], hours: 1, wait: true, ev: false },
    { id: 'plugs', cat: 'Maintenance', icon: 'spark', name: 'Spark plugs', blurb: 'For rough idle, misfires and lost fuel economy. Due around 100,000 miles.', price: [159, 329], hours: 1.5, ev: false },
    { id: 'brakes', cat: 'Brakes and tires', icon: 'disc', name: 'Brake pads and rotors', blurb: 'Per axle. Pads, rotors, hardware and a road test.', price: [319, 489], hours: 2 },
    { id: 'tires', cat: 'Brakes and tires', icon: 'tire', name: 'Tire rotation and balance', blurb: 'Evens out wear and stops the steering wheel shaking.', price: [49, 79], hours: 0.75, wait: true },
    { id: 'alignment', cat: 'Brakes and tires', icon: 'align', name: 'Wheel alignment', blurb: 'For pulling to one side, a crooked wheel or uneven tire wear.', price: [129, 159], hours: 1, wait: true },
    { id: 'diag', cat: 'Engine and diagnostics', icon: 'engine', name: 'Check engine diagnosis', blurb: 'Scan, tests and a written finding. Credited toward the repair.', price: [139, 139], hours: 1, wait: true, fixed: true },
    { id: 'timing', cat: 'Engine and diagnostics', icon: 'gear', name: 'Timing belt and water pump', blurb: 'A due-by-mileage job that saves the engine if done in time.', price: [649, 1149], hours: 6, ev: false },
    { id: 'battery', cat: 'Electrical', icon: 'battery', name: 'Battery replacement', blurb: 'Free test first. New battery fitted and the charging system checked.', price: [189, 299], hours: 0.5, wait: true },
    { id: 'alternator', cat: 'Electrical', icon: 'bolt', name: 'Alternator or starter', blurb: 'For dim lights, a battery light or a car that clicks but will not start.', price: [419, 749], hours: 3, ev: false },
    { id: 'ac', cat: 'AC and suspension', icon: 'snow', name: 'AC recharge and leak check', blurb: 'Dye test, refrigerant to spec and a vent temperature check.', price: [169, 249], hours: 1, wait: true },
    { id: 'struts', cat: 'AC and suspension', icon: 'shock', name: 'Shocks and struts', blurb: 'Per axle. For bouncing, nose-diving and clunks over bumps.', price: [529, 949], hours: 3 },
];

// The warning light guide. level is stop (pull over), soon (book within a few
// days) or watch (check at the next visit). color is the light's own color.
// service picks the job the "Book a check" button adds to the booking form.
const LIGHTS = [
    { id: 'engine', icon: 'engine', color: 'amber', level: 'soon', name: 'Check engine, steady',
        means: 'The engine computer has stored a fault. Often a loose gas cap, a failing sensor or the start of a misfire.',
        now: 'Tighten the gas cap. If the car drives normally, it is usually fine to drive to us. Book a scan in the next few days.', service: 'diag' },
    { id: 'engine-flash', icon: 'engine', color: 'amber', blink: true, level: 'stop', name: 'Check engine, flashing',
        means: 'An active misfire. Unburned fuel can overheat and ruin the catalytic converter within miles.',
        now: 'Ease off the gas and get off the road when it is safe. Do not drive far. Call us, or arrange a tow.', service: 'diag' },
    { id: 'oil', icon: 'oil', color: 'red', level: 'stop', name: 'Oil pressure',
        means: 'Oil pressure has dropped. The engine is low on oil, or the pump or a sensor is failing.',
        now: 'Pull over safely and switch the engine off. Once it cools, check the oil level. If the light stays on after topping up, do not drive it.', service: 'diag' },
    { id: 'temp', icon: 'temp', color: 'red', level: 'stop', name: 'Engine temperature',
        means: 'The engine is overheating, usually from low coolant, a leak, a fan or a thermostat.',
        now: 'Pull over and turn the engine off. Never open a hot radiator cap. Let it cool and call us before driving again.', service: 'coolant' },
    { id: 'battery', icon: 'battery', color: 'red', level: 'soon', name: 'Battery or charging',
        means: 'The charging system is not keeping up. Often the alternator, its belt or a worn battery.',
        now: 'Turn off heated seats, the rear defroster and the radio, and drive straight to us. The car can stall once the battery runs flat.', service: 'battery' },
    { id: 'brake', icon: 'brake', color: 'red', level: 'stop', name: 'Brake system',
        means: 'The parking brake is on, brake fluid is low, or the brake system has a fault.',
        now: 'Make sure the parking brake is fully off. If the light stays on or the pedal feels soft or low, do not drive. Call us.', service: 'brakes' },
    { id: 'abs', icon: 'abs', color: 'amber', level: 'soon', name: 'ABS',
        means: 'Anti-lock braking is switched off. Normal braking still works, but wheels can lock in a hard stop.',
        now: 'Drive gently, leave extra distance, and book a check. Usually a wheel speed sensor.', service: 'diag' },
    { id: 'tpms', icon: 'tpms', color: 'amber', level: 'watch', name: 'Tire pressure',
        means: 'One or more tires is well below the recommended pressure. Cold mornings can trigger it too.',
        now: 'Inflate to the pressure on the driver door sticker. If the light comes back within days, you likely have a slow leak.', service: 'tires' },
];

const LEVELS = {
    stop: { label: 'Stop when safe', tone: 'red' },
    soon: { label: 'Book within a few days', tone: 'amber' },
    watch: { label: 'Check at your next visit', tone: 'green' },
};

// ends is the last day the offer shows, as YYYY-MM-DD. service is the job the
// coupon's button adds to the booking form.
const SPECIALS = [
    { amount: '$40 off', title: 'Brake pads and rotors', fine: 'Per axle. Not combined with other offers.', ends: '2026-12-31', service: 'brakes' },
    { amount: '$59.95', title: 'Oil change and tire rotation', fine: 'Synthetic, up to 5 quarts. Most cars.', ends: '2026-12-31', service: 'oil' },
    { amount: 'Free', title: 'Battery and charging test', fine: 'Ten minutes, no appointment needed.', ends: '2027-03-31', service: 'battery' },
];

const PROCESS = [
    { title: 'Drop off', text: 'Book a day online, or leave your keys in the early-bird box the night before.' },
    { title: 'Inspect', text: 'We text you photos and a short video of what we find, with each repair priced.' },
    { title: 'Approve', text: 'Say yes or no to each line. Nothing extra goes on the bill without your OK.' },
    { title: 'Drive away', text: 'Pay by text or at the counter. Every repair carries our warranty.' },
];

const PERKS = [
    { icon: 'van', text: 'Free shuttle within 5 miles' },
    { icon: 'key', text: 'Loaner cars, booked ahead' },
    { icon: 'chat', text: 'Text updates with photos' },
    { icon: 'cup', text: 'Waiting room with Wi-Fi' },
];

const JOBS = [
    {
        photo: 'photos/brakes-lift.jpg', alt: 'A technician inspecting the underside of a car on a lift',
        vehicle: '2018 Toyota RAV4', miles: 74210, title: 'Grinding when stopping',
        found: 'Front pads worn to the metal, rotors scored.', fixed: 'Front pads and rotors, fluid tested.', total: 412,
    },
    {
        photo: 'photos/diagnostics.jpg', alt: 'A technician with a scan tablet beside an open engine bay',
        vehicle: '2015 Ford Escape', miles: 118400, title: 'Check engine light on',
        found: 'Code P0171, a cracked intake hose letting in air.', fixed: 'Hose replaced, fuel trims back to normal.', total: 238,
    },
    {
        photo: 'photos/battery.jpg', alt: 'Jumper cables clamped to a car battery under the hood',
        vehicle: '2019 Honda Accord', miles: 52900, title: 'Slow to start on cold mornings',
        found: 'Battery at 41% health, charging system fine.', fixed: 'New battery fitted and terminals cleaned.', total: 219,
    },
    {
        photo: 'photos/engine-bay.jpg', alt: 'A technician working in the engine bay of a car',
        vehicle: '2012 Subaru Outback', miles: 131050, title: 'Overheating in traffic',
        found: 'Radiator fan relay failed, coolant low.', fixed: 'Relay replaced, cooling system flushed and tested.', total: 326,
    },
];

const REVIEWS = [
    { name: 'Renee K.', vehicle: '2017 Honda CR-V', when: 'Sep 2026', text: 'They texted me photos of my brakes with the price for each axle. I did the fronts now and they told me the rears have about a year left. No pressure.' },
    { name: 'Luis M.', vehicle: '2014 F-150', when: 'Aug 2026', text: 'Dealer quoted me over $1,400 for the same timing job. Done here in a day for a lot less, and the tech walked me through the old parts.' },
    { name: 'Hannah B.', vehicle: '2020 RAV4 Hybrid', when: 'Jul 2026', text: 'Dropped the keys in the box on my way to the train, had a text with the findings by 9 and the car back by 4. Easy.' },
];

const FAQ = [
    { q: 'Will servicing here void my factory warranty?', a: 'No. Federal law lets you have scheduled maintenance done at an independent shop. We use parts that meet your maker\'s specs and keep records of every visit.' },
    { q: 'How much is a diagnosis?', a: 'A check engine diagnosis is $139. If you go ahead with the repair we recommend, it is credited toward the bill.' },
    { q: 'Can I bring my own parts?', a: 'For some jobs, yes, but we cannot warranty parts we did not supply. Ask when you book and we will tell you honestly whether it saves you money.' },
    { q: 'Do you work on hybrids and electric cars?', a: 'Yes. Brakes, tires, suspension, AC, 12-volt batteries and diagnostics on hybrids and EVs. High-voltage battery repairs go to the dealer.' },
    { q: 'How long will my car be here?', a: 'Most maintenance is done the same day, many jobs while you wait. Bigger repairs can take a day or two depending on parts. We text you a time once we have looked.' },
    { q: 'How do I pay?', a: 'We text you a secure link when the car is ready, or you can pay at the counter by card, cash or check. Financing is available on repairs over $500.' },
];

// Opening hours, 24-hour clock (7.5 is 7:30am). null is closed.
const HOURS = {
    Mon: [7.5, 18], Tue: [7.5, 18], Wed: [7.5, 18], Thu: [7.5, 18], Fri: [7.5, 18],
    Sat: [8, 13], Sun: null,
};

const BOOKING = {
    // Today is offered as a drop-off day until this hour.
    sameDayUntil: 10,
    days: 8,
    // Days the shop is closed (holidays), as YYYY-MM-DD.
    closedDates: ['2026-11-26', '2026-12-24', '2026-12-25', '2027-01-01'],
    keyDrop: 'Early-bird key box by the office door, open all night. Fill in an envelope and we start at opening.',
    rides: ['I have a ride', 'Free shuttle (within 5 miles)', 'Loaner car (ask ahead)'],
};

// Where bookings go. With endpoint set (a form service or your own backend
// that accepts a JSON POST), the form sends there and shows a confirmation.
// Without it, the form opens an email to `email`, or BUSINESS.email.
const ENQUIRY = {
    email: '',
    endpoint: '',
};

const ICONS = {
    oil: '<path d="M3 10h6l2-2h5l5-2v2.5l-4 3.5-2.5 5H5.5L3 14.5z"/><path d="M20.5 15c0 1-1 2-1.5 2s-1.5-1-1.5-2 1.5-2.5 1.5-2.5 1.5 1.5 1.5 2.5z"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    spark: '<path d="M10 2h4v4h-4zM9 6h6v3H9zM10.5 9h3v7h-3zM12 16v3m-2 2 2-2 2 2"/>',
    disc: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.5"/><path d="M17.5 5.5c2 1.5 3 4 3 6.5"/>',
    tire: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>',
    align: '<path d="M6 4v16M18 4v16M6 12h12"/><path d="M3 7l3-3 3 3M15 17l3 3 3-3"/>',
    engine: '<path d="M8.5 5.5h6M11.5 5.5V8M6 8h9.5l2 2.5H19V9h2.5v7H19v-1.5h-1.5L15 18H8.5L6 15.5H4.5V17H2.5v-6.5h2V12H6z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/><circle cx="12" cy="12" r="6.5"/>',
    battery: '<rect x="3" y="7" width="18" height="12" rx="1.5"/><path d="M6.5 7V5h3v2M14.5 7V5h3v2M6.5 13h3M8 11.5v3M14.5 13h3"/>',
    bolt: '<path d="M13 2 5 13.5h6L10 22l8-12h-6z"/>',
    snow: '<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11"/><path d="M9 3.5 12 6l3-2.5M9 20.5l3-2.5 3 2.5"/>',
    shock: '<path d="M9 2h6M12 2v4M8 6h8v6H8zM12 12v2M9 14l6 1.5-6 1.5 6 1.5-6 1.5 6 1.5M9 22h6"/>',
    temp: '<path d="M12 3v10M9.5 15.5a2.5 2.5 0 1 0 5 0c0-1-.6-1.8-1.5-2.3V4.5a1 1 0 0 0-2 0v8.7c-.9.5-1.5 1.3-1.5 2.3z"/><path d="M14 6h3M14 9h3M3 20c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/>',
    brake: '<circle cx="12" cy="12" r="6"/><path d="M12 9v3.5M12 15v.2"/><path d="M5 6a9 9 0 0 0 0 12M19 6a9 9 0 0 1 0 12"/>',
    abs: '<circle cx="12" cy="12" r="6.5"/><path d="M4.5 5.5a9.5 9.5 0 0 0 0 13M19.5 5.5a9.5 9.5 0 0 1 0 13"/><text x="12" y="14.2" text-anchor="middle" font-size="5.6" font-weight="700" font-family="Barlow, sans-serif" stroke="none" fill="currentColor">ABS</text>',
    tpms: '<path d="M7 5C4.5 7 4 10 4 12.5 4 16 5.5 19 8 20h8c2.5-1 4-4 4-7.5 0-2.5-.5-5.5-3-7.5"/><path d="M6 20.5h12M12 8v5M12 15.5v.2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    badge: '<circle cx="12" cy="9" r="6"/><path d="M8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5"/>',
    van: '<path d="M2 16V7h12l4 4h3v5h-2M2 16h2M9 16h6"/><circle cx="6.5" cy="16.5" r="2"/><circle cx="17" cy="16.5" r="2"/>',
    key: '<circle cx="7.5" cy="14.5" r="4"/><path d="M10.5 11.5 20 2M16 6l3 3M14 8l2 2"/>',
    chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8"/>',
    cup: '<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM16 10h2a2.5 2.5 0 0 1 0 5h-2M7 3c0 2 2 2 2 4M11 3c0 2 2 2 2 4"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 7.5 20 18M8.5 16.5 20 6"/>',
};

// ---------------------------------------------------------------------------

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name) => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;
const money = (n) => `$${n.toLocaleString('en-US')}`;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' };

const serviceById = (id) => SERVICES.find((s) => s.id === id);
const vehicleById = (id) => VEHICLES.find((v) => v.id === id) || VEHICLES[0];
const offersFor = (s, v) => !(v.ev && s.ev === false);

// The price range of a service for a vehicle type, rounded to $5 once scaled.
function priceFor(s, v) {
    if (s.fixed || v.factor === 1) return s.price;
    return s.price.map((p) => Math.round((p * v.factor) / 5) * 5);
}
const range = ([lo, hi]) => (lo === hi ? money(lo) : `${money(lo)} to ${money(hi)}`);

function timeText(total) {
    const hours = Math.round(total * 2) / 2;
    if (hours <= 1.5) return `About ${hours < 1 ? `${Math.round(hours * 60)} minutes` : hours === 1 ? 'an hour' : `${hours} hours`}`;
    if (hours <= 7) return `About ${hours} hours, same day`;
    return 'One to two days';
}

// ---- Business time ------------------------------------------------------------

// The current wall-clock time where the shop is, as a Date whose local fields
// read as the shop's time. Falls back to the visitor's clock.
function bizNow() {
    try {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
            timeZone: BUSINESS.timezone, year: 'numeric', month: 'numeric', day: 'numeric',
            hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
        }).formatToParts(new Date()).map((p) => [p.type, p.value]));
        return new Date(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute);
    } catch {
        return new Date();
    }
}

function fmtHour(h) {
    const hr = Math.floor(h);
    const min = Math.round((h - hr) * 60);
    const ampm = hr >= 12 && hr < 24 ? 'pm' : 'am';
    return `${hr % 12 || 12}${min ? `:${String(min).padStart(2, '0')}` : ''}${ampm}`;
}

const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoursOn = (d) => (BOOKING.closedDates.includes(isoDate(d)) ? null : HOURS[DAYS[d.getDay()]]);
const hourOf = (d) => d.getHours() + d.getMinutes() / 60;
const hoursText = (h) => (h ? `${fmtHour(h[0])} to ${fmtHour(h[1])}` : 'Closed');

// Whether the shop is open now, and when it next opens.
function openState() {
    const now = bizNow();
    const today = hoursOn(now);
    const h = hourOf(now);
    if (today && h >= today[0] && h < today[1]) return { open: true, until: today[1] };
    for (let i = 0; i < 14; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        const hrs = hoursOn(d);
        if (hrs && (i > 0 || h < hrs[0])) return { open: false, day: i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAY_NAMES[DAYS[d.getDay()]], at: hrs[0] };
    }
    return { open: false };
}

// The next open days a car can be dropped off. Today counts until
// BOOKING.sameDayUntil.
function dropDays() {
    const now = bizNow();
    const out = [];
    for (let i = 0; i < 30 && out.length < BOOKING.days; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        const hrs = hoursOn(d);
        if (!hrs) continue;
        if (i === 0 && hourOf(now) >= Math.min(BOOKING.sameDayUntil, hrs[1])) continue;
        out.push({
            id: isoDate(d), hours: hrs,
            top: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : DAYS[d.getDay()],
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            long: `${i === 0 ? 'Today, ' : i === 1 ? 'Tomorrow, ' : ''}${d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`,
        });
    }
    return out;
}

// A repair order number for the tickets: year and day of the year.
function roNumber(suffix) {
    const now = bizNow();
    const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    return `RO ${String(now.getFullYear()).slice(2)}${String(doy).padStart(3, '0')}-${suffix}`;
}

// ---- Business details ------------------------------------------------------------

// The number for tel: and sms: links, from the displayed one. Ten digits
// without a country code are read as a US number.
function phoneLink(phone) {
    const digits = String(phone).replace(/\D/g, '');
    if (String(phone).trim().startsWith('+')) return `+${digits}`;
    return digits.length === 10 ? `+1${digits}` : digits;
}

function bindBusiness() {
    const values = {
        ...BUSINESS,
        rating: BUSINESS.rating.toFixed(1),
        reviewCount: BUSINESS.reviewCount.toLocaleString('en-US'),
        years: new Date().getFullYear() - BUSINESS.since,
    };
    document.querySelectorAll('[data-bind]').forEach((el) => {
        const v = values[el.dataset.bind];
        if (v !== undefined) el.textContent = v;
    });
    const dial = phoneLink(BUSINESS.phone);
    const hrefs = { tel: `tel:${dial}`, sms: `sms:${dial}`, mailto: `mailto:${ENQUIRY.email || BUSINESS.email}` };
    document.querySelectorAll('[data-bind-href]').forEach((el) => { el.href = hrefs[el.dataset.bindHref]; });
    $('#year').textContent = new Date().getFullYear();
    $('#directions').href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${BUSINESS.name}, ${BUSINESS.address}`)}`;

    $('#hero-trust').innerHTML = `
        <li>${icon('star')}<span><b>${esc(values.rating)} rating</b><small>${esc(values.reviewCount)} ${esc(BUSINESS.ratingSource)} reviews</small></span></li>
        <li>${icon('badge')}<span><b>ASE certified</b><small>${esc(BUSINESS.techs)} technicians</small></span></li>
        <li>${icon('shield')}<span><b>${WARRANTY.months} mo / ${(WARRANTY.miles / 1000)}k mi</b><small>warranty</small></span></li>`;

    // Two copies of the list, so the strip scrolls without a gap.
    const makes = BUSINESS.makes.map((m) => `<span>${esc(m)}</span>`).join('');
    $('#makes').innerHTML = `<div aria-hidden="false">${makes}</div><div aria-hidden="true">${makes}</div>`;
}

function renderStatus() {
    const s = openState();
    const line = s.open
        ? `Open now, until ${fmtHour(s.until)}`
        : `Closed${s.day ? `, opens ${s.day} at ${fmtHour(s.at)}` : ''}`;
    document.querySelectorAll('[data-status]').forEach((el) => {
        el.textContent = line;
        el.closest('.status')?.classList.toggle('is-open', s.open);
    });
}

// ---- Shared state: vehicle type and chosen services -----------------------------------

const state = { vehicle: 'car', quote: 'brakes', picked: new Set(), day: null };

function setVehicle(id) {
    state.vehicle = id;
    document.querySelectorAll('[data-vehicle]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.vehicle === id)));
    const v = vehicleById(id);
    // Drop what an electric car does not need.
    for (const sid of [...state.picked]) if (!offersFor(serviceById(sid), v)) state.picked.delete(sid);
    renderQuoteOptions();
    renderQuote();
    renderServicePicker();
    fillDrop();
    renderOrder();
}

function vehicleSeg() {
    return VEHICLES.map((v) => `<button type="button" role="radio" data-vehicle="${esc(v.id)}" aria-checked="${v.id === state.vehicle}">${esc(v.label)}</button>`).join('');
}

// ---- Quick quote -------------------------------------------------------------------

function renderQuoteOptions() {
    const v = vehicleById(state.vehicle);
    const sel = $('#q-service');
    const cats = [...new Set(SERVICES.map((s) => s.cat))];
    sel.innerHTML = cats.map((c) => `
        <optgroup label="${esc(c)}">${SERVICES.filter((s) => s.cat === c && offersFor(s, v)).map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')}</optgroup>`).join('');
    if (![...sel.options].some((o) => o.value === state.quote)) state.quote = sel.options[0].value;
    sel.value = state.quote;
}

function renderQuote() {
    const s = serviceById(state.quote);
    const v = vehicleById(state.vehicle);
    const rows = [
        ['Parts and labor', range(priceFor(s, v)), 'big'],
        ['Time in the shop', timeText(s.hours)],
        ['Wait or drop off', s.wait ? 'You can wait for it' : 'Drop off'],
        ['Warranty', `${WARRANTY.months} months / ${WARRANTY.miles.toLocaleString('en-US')} miles`],
    ];
    $('#q-lines').innerHTML = rows.map(([k, val, cls]) => `<div${cls ? ` class="${cls}"` : ''}><dt>${esc(k)}</dt><dd>${esc(val)}</dd></div>`).join('');
}

function initQuote() {
    $('#quote-no').textContent = roNumber('Q');
    $('#q-vehicle').setAttribute('role', 'radiogroup');
    $('#q-vehicle').setAttribute('aria-label', 'Vehicle type');
    $('#q-vehicle').innerHTML = vehicleSeg();
    renderQuoteOptions();
    renderQuote();
    $('#q-service').addEventListener('change', (e) => { state.quote = e.target.value; renderQuote(); });
    $('#q-book').addEventListener('click', () => goBook(state.quote));
    $('#quote').addEventListener('submit', (e) => e.preventDefault());
}

// ---- Services ----------------------------------------------------------------------

function renderServices(filter = 'All') {
    const v = VEHICLES[0];
    $('#svc-grid').innerHTML = SERVICES.filter((s) => filter === 'All' || s.cat === filter).map((s, i) => `
        <article class="svc" style="--i:${i}">
            <div class="svc-top">${icon(s.icon)}<span>${esc(s.cat)}</span></div>
            <h3>${esc(s.name)}</h3>
            <p>${esc(s.blurb)}</p>
            <div class="svc-foot">
                <span class="mono">${s.price[0] === s.price[1] ? '' : 'from '}<b>${money(priceFor(s, v)[0])}</b></span>
                <span class="svc-time">${icon('clock')}${s.hours < 1 ? `${Math.round(s.hours * 60)} min` : `${s.hours} hr${s.hours > 1 ? 's' : ''}`}</span>
                <button type="button" class="svc-add" data-service="${esc(s.id)}" aria-label="Book ${esc(s.name)}">${icon('arrow')}</button>
            </div>
        </article>`).join('');
}

function initServices() {
    const cats = ['All', ...new Set(SERVICES.map((s) => s.cat))];
    const root = $('#svc-filter');
    root.innerHTML = cats.map((c, i) => `<button type="button" class="chip" aria-pressed="${i === 0}" data-cat="${esc(c)}">${c === 'All' ? 'All services' : esc(c)}</button>`).join('');
    root.addEventListener('click', (e) => {
        const b = e.target.closest('[data-cat]');
        if (!b) return;
        root.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === b)));
        renderServices(b.dataset.cat);
    });
    renderServices();
    const footer = SERVICES.filter((s, i, a) => a.findIndex((x) => x.cat === s.cat) === i);
    $('#foot-services').innerHTML = footer.map((s) => `<li><a href="#services">${esc(s.cat)}</a></li>`).join('');
}

// ---- Warning lights ----------------------------------------------------------------

function renderLight(id) {
    const l = LIGHTS.find((x) => x.id === id);
    const lv = LEVELS[l.level];
    const s = serviceById(l.service);
    document.querySelectorAll('[data-light]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.light === id)));
    $('#light-card').innerHTML = `
        <div class="lc-head">
            <span class="lamp lamp-${esc(l.color)}${l.blink ? ' blink' : ''}">${icon(l.icon)}</span>
            <div><h3>${esc(l.name)}</h3><p class="level level-${esc(lv.tone)}">${l.level === 'stop' ? icon('alert') : icon('clock')}${esc(lv.label)}</p></div>
        </div>
        <dl>
            <div><dt>What it means</dt><dd>${esc(l.means)}</dd></div>
            <div><dt>What to do now</dt><dd>${esc(l.now)}</dd></div>
        </dl>
        <div class="lc-foot">
            ${l.level === 'stop' ? `<a class="btn btn-yellow btn-sm" href="tel:${esc(phoneLink(BUSINESS.phone))}">${icon('phone')}Call ${esc(BUSINESS.phone)}</a>` : ''}
            <button type="button" class="btn ${l.level === 'stop' ? 'btn-ghost' : 'btn-yellow'} btn-sm" data-service="${esc(s.id)}" data-note="${esc(`Warning light: ${l.name}.`)}">Book a check</button>
            <span class="mono">${esc(s.name)}: ${range(s.price)}</span>
        </div>`;
}

function initLights() {
    $('#cluster').innerHTML = LIGHTS.map((l) => `
        <button type="button" class="lamp-btn" data-light="${esc(l.id)}" aria-pressed="false" aria-label="${esc(l.name)}">
            <span class="lamp lamp-${esc(l.color)}${l.blink ? ' blink' : ''}">${icon(l.icon)}</span>
            <small>${esc(l.name)}</small>
        </button>`).join('');
    $('#cluster').addEventListener('click', (e) => {
        const b = e.target.closest('[data-light]');
        if (b) renderLight(b.dataset.light);
    });
    renderLight(LIGHTS[0].id);
}

// ---- Process, specials, shop, jobs, reviews, FAQ ----------------------------------------

function renderProcess() {
    $('#steps').innerHTML = PROCESS.map((p, i) => `
        <li><span class="mono">${String(i + 1).padStart(2, '0')}</span><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></li>`).join('');
}

function renderSpecials() {
    const today = isoDate(bizNow());
    const live = SPECIALS.filter((s) => !s.ends || s.ends >= today);
    $('#specials').hidden = !live.length;
    $('#coupons').innerHTML = live.map((s) => `
        <article class="coupon">
            <span class="cut">${icon('scissors')}</span>
            <p class="c-amount">${esc(s.amount)}</p>
            <h3>${esc(s.title)}</h3>
            <p class="c-fine">${esc(s.fine)}${s.ends ? ` Ends ${esc(new Date(`${s.ends}T12:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }))}.` : ''}</p>
            <button type="button" class="c-use" data-service="${esc(s.service)}" data-note="${esc(`Offer: ${s.amount} ${s.title}.`)}">Use this offer ${icon('arrow')}</button>
        </article>`).join('');
}

function renderShop() {
    $('#perks').innerHTML = PERKS.map((p) => `<li>${icon(p.icon)}<span>${esc(p.text)}</span></li>`).join('');
    $('#warranty').innerHTML = `
        <p class="w-big mono">${WARRANTY.months}<small>mo</small><i>/</i>${WARRANTY.miles / 1000}<small>k mi</small></p>
        <p><b>Warranty</b>${esc(WARRANTY.covers)}</p>`;
}

function renderJobs() {
    $('#jobs').innerHTML = JOBS.map((j, i) => `
        <article class="job" style="--i:${i}">
            <div class="job-photo"><img src="${esc(j.photo)}" alt="${esc(j.alt)}" loading="lazy"></div>
            <div class="job-body">
                <p class="job-car mono">${esc(j.vehicle)} · ${j.miles.toLocaleString('en-US')} mi</p>
                <h3>${esc(j.title)}</h3>
                <dl>
                    <div><dt>Found</dt><dd>${esc(j.found)}</dd></div>
                    <div><dt>Fixed</dt><dd>${esc(j.fixed)}</dd></div>
                </dl>
                <p class="job-total mono">Approved <b>${money(j.total)}</b></p>
            </div>
        </article>`).join('');
}

function renderReviews() {
    $('#review-list').innerHTML = REVIEWS.map((r) => `
        <figure class="review">
            <span class="stars" aria-label="5 out of 5 stars">★★★★★</span>
            <blockquote>${esc(r.text)}</blockquote>
            <figcaption><b>${esc(r.name)}</b><small class="mono">${esc(r.vehicle)} · ${esc(r.when)}</small></figcaption>
        </figure>`).join('');
}

function renderFaq() {
    $('#faq-list').innerHTML = FAQ.map((f) => `
        <details>
            <summary>${esc(f.q)}<span aria-hidden="true"></span></summary>
            <p>${esc(f.a)}</p>
        </details>`).join('');
}

// ---- Hours and map ------------------------------------------------------------------

function renderHours() {
    const now = bizNow();
    const today = DAYS[now.getDay()];
    // Today's row follows BOOKING.closedDates, like the status and drop-off days.
    const holiday = HOURS[today] && !hoursOn(now);
    $('#hours').innerHTML = Object.entries(HOURS).map(([d, h]) => `
        <li${d === today ? ' class="today"' : ''}><span>${DAY_NAMES[d]}</span><b class="mono">${d === today && holiday ? 'Closed today' : hoursText(h)}</b></li>`).join('');
    $('#foot-hours').innerHTML = Object.entries(HOURS).map(([d, h]) => `<li>${d}: ${hoursText(h)}</li>`).join('');
    $('#keydrop').innerHTML = BOOKING.keyDrop ? `${icon('key')}<span>${esc(BOOKING.keyDrop)}</span>` : '';
}

function renderMap() {
    $('#map').insertAdjacentHTML('beforeend', `
        <path class="park" d="M384 74h96v62h-96z"/>
        <path class="river" d="M-10 262C80 242 140 282 220 262s150-40 270-10"/>
        <g class="streets">
            <path d="M0 60h480"/><path d="M0 222h480"/>
            <path d="M90 0v300"/><path d="M210 0v300"/><path d="M370 0v300"/>
        </g>
        <path class="main" d="M0 150h480"/>
        <text class="st" x="22" y="140">${esc(BUSINESS.street)}</text>
        <rect class="block" x="226" y="80" width="80" height="50" rx="3"/>
        <g class="lot"><rect x="226" y="166" width="50" height="40" rx="3"/><text x="251" y="192" text-anchor="middle">P</text></g>
        <g class="pin" transform="translate(266 112)">
            <circle r="26" class="pulse"/>
            <path d="M0 0c-9-11-14-17-14-24a14 14 0 0 1 28 0c0 7-5 13-14 24z"/>
            <circle cy="-24" r="5" class="pin-dot"/>
        </g>`);
}

// ---- Booking ------------------------------------------------------------------------

function renderServicePicker() {
    const v = vehicleById(state.vehicle);
    $('#f-services').innerHTML = SERVICES.filter((s) => offersFor(s, v)).map((s) => `
        <label class="pick-item">
            <input type="checkbox" value="${esc(s.id)}"${state.picked.has(s.id) ? ' checked' : ''}>
            <span>${icon(s.icon)}${esc(s.name)}</span>
        </label>`).join('');
}

function fillDrop() {
    const sel = $('#f-drop');
    const keep = sel.value;
    const day = dropDays().find((d) => d.id === state.day);
    const open = day ? day.hours[0] : 8;
    const canWait = state.picked.size > 0 && [...state.picked].every((id) => serviceById(id).wait);
    const opts = [
        ['open', `At opening, ${fmtHour(open)}`],
        ['box', 'Key box, the night before'],
        ['wait', canWait ? 'I will wait for it' : 'I will wait (quick jobs only)', !canWait],
    ];
    sel.innerHTML = opts.map(([id, label, off]) => `<option value="${id}"${off ? ' disabled' : ''}>${esc(label)}</option>`).join('');
    sel.value = [...sel.options].some((o) => o.value === keep && !o.disabled) ? keep : 'open';
}

function renderDays() {
    const days = dropDays();
    if (!days.some((d) => d.id === state.day)) state.day = days[0]?.id || null;
    $('#f-days').innerHTML = days.length
        ? days.map((d) => `<button type="button" class="day" data-day="${esc(d.id)}" aria-pressed="${d.id === state.day}"><small>${esc(d.top)}</small><b>${esc(d.date)}</b></button>`).join('')
        : `<p class="none">Call us for the next opening.</p>`;
}

function renderOrder() {
    const v = vehicleById(state.vehicle);
    const form = $('#book-form');
    const car = [form.elements.year.value, form.elements.make.value.trim(), form.elements.model.value.trim()].filter(Boolean).join(' ');
    const picked = [...state.picked].map(serviceById);
    const total = picked.reduce((t, s) => { const p = priceFor(s, v); return [t[0] + p[0], t[1] + p[1]]; }, [0, 0]);
    const hours = picked.reduce((t, s) => t + s.hours, 0);
    const day = dropDays().find((d) => d.id === state.day);
    const drop = form.elements.drop;
    const ride = form.elements.ride;
    $('#order').innerHTML = `
        <dl class="o-meta">
            <div><dt>Vehicle</dt><dd>${esc(car || `A ${v.label.toLowerCase()}`)}</dd></div>
            <div><dt>Drop-off</dt><dd>${day ? esc(day.long) : 'Call to arrange'}${drop.selectedIndex >= 0 ? `<small>${esc(drop.options[drop.selectedIndex].text)}</small>` : ''}</dd></div>
            <div><dt>Getting home</dt><dd>${esc(ride.value || BOOKING.rides[0])}</dd></div>
        </dl>
        <ul class="o-lines">
            ${picked.length
                ? picked.map((s) => `<li><span>${esc(s.name)}</span><b class="mono">${range(priceFor(s, v))}</b><button type="button" class="o-x" data-remove="${esc(s.id)}" aria-label="Remove ${esc(s.name)}">×</button></li>`).join('')
                : '<li class="o-empty">Not sure what it needs? Pick <b>Check engine diagnosis</b> or tell us what it is doing.</li>'}
        </ul>
        ${picked.length ? `
        <div class="o-total"><span>Estimate</span><b class="mono">${range(total)}</b></div>
        <p class="o-time">${icon('clock')}${esc(timeText(hours))}</p>` : ''}
        <p class="o-fine">An estimate, not a bill. We confirm the price after a look and you approve each line before work starts.</p>`;
}

function togglePick(id, on) {
    if (on) state.picked.add(id); else state.picked.delete(id);
    const box = document.querySelector(`#f-services input[value="${id}"]`);
    if (box) box.checked = on;
    fillDrop();
    renderOrder();
}

// Jump to the booking form with a service picked, and an optional note.
function goBook(id, note) {
    const s = serviceById(id);
    if (s && !offersFor(s, vehicleById(state.vehicle))) setVehicle('car');
    if (s) togglePick(id, true);
    const msg = $('#f-msg');
    if (note && !msg.value.includes(note)) msg.value = `${note}${msg.value ? `\n${msg.value}` : ''}`;
    $('#book').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => $('#f-make').focus({ preventScroll: true }), 600);
}

function initBooking() {
    $('#order-no').textContent = roNumber('B');
    const form = $('#book-form');
    const now = bizNow().getFullYear() + 1;
    form.elements.year.innerHTML = '<option value="">Year</option>' + Array.from({ length: 36 }, (_, i) => `<option>${now - i}</option>`).join('');
    $('#make-list').innerHTML = BUSINESS.makes.map((m) => `<option value="${esc(m)}">`).join('');
    $('#f-vehicle').innerHTML = vehicleSeg();
    $('#f-ride').innerHTML = BOOKING.rides.map((r) => `<option>${esc(r)}</option>`).join('');
    renderServicePicker();
    renderDays();
    fillDrop();
    renderOrder();
    $('#f-dest').textContent = ENQUIRY.endpoint
        ? 'Sent straight to the shop. We text you to confirm.'
        : `Opens your email app with the booking to ${ENQUIRY.email || BUSINESS.email}.`;

    $('#f-services').addEventListener('change', (e) => togglePick(e.target.value, e.target.checked));
    $('#f-days').addEventListener('click', (e) => {
        const b = e.target.closest('[data-day]');
        if (!b) return;
        state.day = b.dataset.day;
        $('#f-days').querySelectorAll('.day').forEach((d) => d.setAttribute('aria-pressed', String(d === b)));
        fillDrop();
        renderOrder();
    });
    form.addEventListener('input', renderOrder);
    form.addEventListener('change', renderOrder);
    $('#order').addEventListener('click', (e) => {
        const x = e.target.closest('[data-remove]');
        if (x) togglePick(x.dataset.remove, false);
    });

    // Vehicle type buttons in the quote and the form share one state.
    document.addEventListener('click', (e) => {
        const vb = e.target.closest('[data-vehicle]');
        if (vb) { setVehicle(vb.dataset.vehicle); return; }
        const sb = e.target.closest('[data-service]');
        if (sb) goBook(sb.dataset.service, sb.dataset.note);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const val = (n) => form.elements[n].value.trim();
        let bad = null;
        for (const n of ['name', 'phone']) {
            const el = form.elements[n];
            const empty = !el.value.trim();
            el.classList.toggle('invalid', empty);
            if (empty && !bad) bad = el;
        }
        const note = $('#f-note');
        // novalidate keeps the browser's bubbles off, so check the optional email here.
        const email = form.elements.email;
        const badEmail = !!email.value.trim() && !email.checkValidity();
        email.classList.toggle('invalid', badEmail);
        if (bad || badEmail) {
            note.textContent = bad ? 'Add your name and a mobile number so we can confirm.' : 'Check the email address, or leave it empty.';
            note.className = 'f-note miss';
            (bad || email).focus();
            return;
        }
        const v = vehicleById(state.vehicle);
        const day = dropDays().find((d) => d.id === state.day);
        const drop = form.elements.drop;
        const picked = [...state.picked].map(serviceById);
        const data = {
            name: val('name'),
            phone: val('phone'),
            email: val('email'),
            vehicle: [val('year'), val('make'), val('model')].filter(Boolean).join(' ') || v.label,
            vehicleType: v.label,
            services: picked.map((s) => `${s.name} (${range(priceFor(s, v))})`),
            day: day ? day.long : 'To arrange',
            dropOff: drop.options[drop.selectedIndex].text,
            ride: val('ride'),
            message: val('message'),
        };
        const subject = `Drop-off: ${data.vehicle}, ${data.day}`;

        if (ENQUIRY.endpoint) {
            const btn = document.querySelector('.order-send');
            btn.disabled = true;
            note.className = 'f-note';
            note.textContent = 'Sending...';
            try {
                const res = await fetch(ENQUIRY.endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({ subject, ...data }),
                });
                if (!res.ok) throw new Error(String(res.status));
                form.reset();
                state.picked.clear();
                renderServicePicker();
                fillDrop();
                renderOrder();
                note.className = 'f-note ok';
                note.textContent = `Thanks, ${data.name.split(' ')[0]}. We will text you to confirm.`;
            } catch {
                note.className = 'f-note miss';
                note.textContent = `That did not send. Please call ${BUSINESS.phone} instead.`;
            } finally {
                btn.disabled = false;
            }
            return;
        }

        const lines = [
            `Name: ${data.name}`,
            `Mobile: ${data.phone}`,
            ...(data.email ? [`Email: ${data.email}`] : []),
            `Vehicle: ${data.vehicle} (${data.vehicleType})`,
            `Drop-off: ${data.day}, ${data.dropOff}`,
            `Getting home: ${data.ride}`,
            '',
            'Work requested:',
            ...(data.services.length ? data.services.map((s) => `- ${s}`) : ['- Not sure, please take a look']),
            '',
            data.message,
        ];
        window.location.href = `mailto:${ENQUIRY.email || BUSINESS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
        note.className = 'f-note ok';
        note.textContent = `Your email app should open with the booking filled in. If it does not, call ${BUSINESS.phone}.`;
    });
}

// ---- Header ------------------------------------------------------------------------------

function initNav() {
    const toggle = $('.nav-toggle');
    const links = $('#nav-links');
    const setOpen = (open) => {
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        links.classList.toggle('open', open);
    };
    toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
    links.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    const header = $('.header');
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
}

function markSamples() {
    if (!SAMPLE_CONTENT) return;
    document.querySelectorAll('[data-sample]').forEach((el) => { el.hidden = false; });
}

bindBusiness();
markSamples();
renderStatus();
initNav();
initQuote();
initServices();
initLights();
renderProcess();
renderSpecials();
renderShop();
renderJobs();
renderReviews();
renderHours();
renderMap();
renderFaq();
initBooking();
// Keep "open now" and the drop-off days current on a page left open.
setInterval(() => { renderStatus(); renderHours(); renderDays(); fillDrop(); renderOrder(); }, 5 * 60 * 1000);
