// =============================================================================
// Lowlight Liquor & Wine: everything a shop owner would change lives up here as
// plain data. The code below the line only reads it.
// =============================================================================

const STORE = {
  name: 'Lowlight',
  fullName: 'Lowlight Liquor & Wine',
  number: '418',
  established: '1987',
  street: '418 Calloway Avenue',
  city: 'Brooklyn, NY 11211',
  phone: '(718) 555-0148',
  parking: 'Street parking on Calloway. Bike rack out front. Step-free entrance.',
  minAge: 21,
  lastCallMinutes: 45,   // the neon sign switches to LAST CALL this long before close
  wineDiscount: 0.10,    // off every bottle of wine when the bag holds...
  wineDiscountMin: 6,    // ...at least this many bottles of wine
  delivery: {
    zips: ['11211', '11206', '11222', '11237', '11249'],
    fee: 5,
    freeOver: 100,
    minimum: 30,
    stopsBeforeClose: 60, // minutes: last delivery window ends this long before close
  },
};

// Opening hours, Sunday first. A close earlier than the open runs past midnight.
const HOURS = [
  { day: 'Sunday', open: '12:00', close: '22:00' },
  { day: 'Monday', open: '10:00', close: '23:00' },
  { day: 'Tuesday', open: '10:00', close: '23:00' },
  { day: 'Wednesday', open: '10:00', close: '23:00' },
  { day: 'Thursday', open: '10:00', close: '00:00' },
  { day: 'Friday', open: '10:00', close: '01:00' },
  { day: 'Saturday', open: '10:00', close: '01:00' },
];

const DEALS = [
  '10% off any six bottles of wine',
  'Calloway Ave Lager 12-pack · $18 all week',
  'Free whiskey flight Friday at 6',
  'Delivery in under an hour to 11211 and around',
  'Open till 1am Friday & Saturday',
  'Bring back six empties, take $1 off',
];

// The shelves, in the order they appear on the Board.
const SHELVES = [
  { id: 'whiskey', label: 'Whiskey' },
  { id: 'agave', label: 'Agave' },
  { id: 'gin', label: 'Gin & vodka' },
  { id: 'rum', label: 'Rum & amari' },
  { id: 'red', label: 'Red wine' },
  { id: 'white', label: 'White, pink & orange' },
  { id: 'bubbles', label: 'Bubbles' },
  { id: 'beer', label: 'Beer & cider' },
  { id: 'extras', label: 'Mixers & ice' },
];

// Every bottle on the Board. `wine: true` counts toward the six-bottle discount.
const PRODUCTS = [
  { id: 'calloway-bib', shelf: 'whiskey', name: 'Calloway Bottled-in-Bond Bourbon', meta: 'Kentucky · 750ml · 50%', price: 34, note: 'Four years old, 100 proof, all caramel and baking spice. Our best seller since the day we opened.', tag: 'Staff pick' },
  { id: 'ninefold-rye', shelf: 'whiskey', name: 'Ninefold Straight Rye', meta: 'Indiana · 750ml · 46%', price: 29, note: 'Dill, black pepper, a little mint. The one we stir into Manhattans at the counter.' },
  { id: 'kettle-hollow', shelf: 'whiskey', name: 'Kettle Hollow Wheated Bourbon', meta: 'Kentucky · 750ml · 45%', price: 42, note: 'Soft and bready, like warm cornbread with honey. Good for someone who says they don\'t like whiskey.' },
  { id: 'harrow-glen-12', shelf: 'whiskey', name: 'Harrow Glen 12 Year Single Malt', meta: 'Speyside · 750ml · 43%', price: 58, note: 'Orchard fruit and a sherry finish. A safe gift that doesn\'t look like a safe gift.' },
  { id: 'peat-pier', shelf: 'whiskey', name: 'Peat & Pier Islay Malt', meta: 'Islay · 750ml · 46%', price: 64, note: 'Bonfire, seaweed, iodine. You know if you\'re a peat person.' },
  { id: 'low-tide-irish', shelf: 'whiskey', name: 'Low Tide Irish Whiskey', meta: 'Cork · 750ml · 40%', price: 27, note: 'Triple-distilled, light and easy. Coffee, ginger ale or straight up.' },
  { id: 'casa-ventana-blanco', shelf: 'agave', name: 'Casa Ventana Blanco Tequila', meta: 'Jalisco · 750ml · 40%', price: 36, note: '100% blue agave, no additives. Bright, peppery, built for margaritas.' },
  { id: 'casa-ventana-repo', shelf: 'agave', name: 'Casa Ventana Reposado', meta: 'Jalisco · 750ml · 40%', price: 44, note: 'Six months in old bourbon barrels. Vanilla on the nose, agave all the way through.' },
  { id: 'tierra-roja', shelf: 'agave', name: 'Tierra Roja Espadín Mezcal', meta: 'Oaxaca · 750ml · 45%', price: 52, note: 'Roasted in an earthen pit. Smoky, but in a campfire-with-friends way.', tag: 'Staff pick' },
  { id: 'santo-polvo', shelf: 'agave', name: 'Santo Polvo Tobalá Mezcal', meta: 'Oaxaca · 750ml · 48%', price: 96, note: 'Wild agave that takes fifteen years to grow. Sip it slowly, with an orange slice.' },
  { id: 'house-gin', shelf: 'gin', name: 'Lowlight House Gin', meta: 'Distilled two miles away · 750ml · 44%', price: 29, note: 'Made for us by a distillery down the road. Juniper, grapefruit peel, a pinch of pink peppercorn.', tag: 'Local' },
  { id: 'fernhill', shelf: 'gin', name: 'Fernhill London Dry Gin', meta: 'England · 1L · 43%', price: 24, note: 'Classic and piney. The gin-and-tonic gin.' },
  { id: 'brightwater', shelf: 'gin', name: 'Brightwater Vodka', meta: 'Upstate NY · 1L · 40%', price: 19, note: 'Clean, neutral, cheap enough for a punch bowl.' },
  { id: 'northfield', shelf: 'gin', name: 'Northfield Potato Vodka', meta: 'Poland · 750ml · 40%', price: 31, note: 'Creamy and a little earthy. Keep it in the freezer, serve with pickles.' },
  { id: 'cane-ember', shelf: 'rum', name: 'Cane & Ember 8 Year Rum', meta: 'Barbados · 750ml · 43%', price: 33, note: 'Banana bread, toffee, oak. A sipping rum that also makes a great daiquiri.' },
  { id: 'isla-palida', shelf: 'rum', name: 'Isla Pálida White Rum', meta: 'Puerto Rico · 750ml · 40%', price: 18, note: 'Light and grassy. For mojitos by the pitcher.' },
  { id: 'ostrava-amaro', shelf: 'rum', name: 'Ostrava Amaro', meta: 'Italy · 750ml · 28%', price: 38, note: 'Bittersweet orange and gentian. After dinner, over one big ice cube.' },
  { id: 'vermut-casa', shelf: 'rum', name: 'Vermut de la Casa', meta: 'Catalonia · 1L · 15%', price: 21, note: 'Sweet red vermouth. Over ice with an olive and a splash of soda: Sunday sorted.' },
  { id: 'monte-brina', shelf: 'red', wine: true, name: 'Monte Brina Nero d\'Avola', meta: 'Sicily · 2023', price: 14, note: 'Juicy, plummy, easy. Our house red for parties.' },
  { id: 'valle-fresco', shelf: 'red', wine: true, name: 'Valle Fresco Malbec', meta: 'Mendoza · 2022', price: 16, note: 'Dark fruit and violets. Burger night.' },
  { id: 'cotes-sable', shelf: 'red', wine: true, name: 'Côtes du Sable Grenache', meta: 'Southern Rhône · 2022', price: 17, note: 'Raspberry and garrigue. Slightly chilled in summer, at room temperature in winter.' },
  { id: 'hollow-oak', shelf: 'red', wine: true, name: 'Hollow Oak Cabernet Sauvignon', meta: 'Paso Robles · 2021', price: 22, note: 'Big, ripe, a little cedar. Steak, obviously.' },
  { id: 'ridgeback-pinot', shelf: 'red', wine: true, name: 'Ridgeback Pinot Noir', meta: 'Willamette Valley · 2022', price: 28, note: 'Cherry, forest floor, silky. Thanksgiving wine.' },
  { id: 'fiamma-nera', shelf: 'red', wine: true, name: 'Fiamma Nera Etna Rosso', meta: 'Sicily · 2021', price: 34, note: 'Grown on a volcano. Smoky red fruit and a lot of energy.' },
  { id: 'ostrea', shelf: 'white', wine: true, name: 'Ostrea Muscadet', meta: 'Loire · 2023', price: 16, note: 'Salty, lemony, made for oysters. Our house white for parties.' },
  { id: 'ria-clara', shelf: 'white', wine: true, name: 'Ría Clara Albariño', meta: 'Rías Baixas · 2023', price: 19, note: 'Peach and sea spray. Anything off the grill.' },
  { id: 'kesselberg', shelf: 'white', wine: true, name: 'Kesselberg Riesling Kabinett', meta: 'Mosel · 2022', price: 21, note: 'Off-dry and electric. Thai takeout\'s best friend.', tag: 'Staff pick' },
  { id: 'pale-hill', shelf: 'white', wine: true, name: 'Pale Hill Chardonnay', meta: 'Sonoma Coast · 2022', price: 26, note: 'Some oak, not too much. Roast chicken.' },
  { id: 'clos-puits', shelf: 'white', wine: true, name: 'Clos du Puits Sancerre', meta: 'Loire · 2023', price: 38, note: 'Flinty sauvignon blanc. Goat cheese and a long lunch.' },
  { id: 'pink-hour', shelf: 'white', wine: true, name: 'Pink Hour Rosé', meta: 'Provence · 2024', price: 15, note: 'Pale, dry, strawberry. Buy two.' },
  { id: 'skin-deep', shelf: 'white', wine: true, name: 'Skin Deep Orange Wine', meta: 'Slovenia · 2022', price: 27, note: 'White grapes left on their skins. Apricot, tea, a little grip.' },
  { id: 'ponte-verde', shelf: 'bubbles', wine: true, name: 'Ponte Verde Prosecco', meta: 'Veneto · NV', price: 14, note: 'Pear and apple. Spritzes and mimosas.' },
  { id: 'maison-lune', shelf: 'bubbles', wine: true, name: 'Maison Lune Crémant Brut', meta: 'Burgundy · NV', price: 24, note: 'Made like Champagne, priced like a Tuesday.' },
  { id: 'field-day', shelf: 'bubbles', wine: true, name: 'Field Day Pét-Nat', meta: 'Finger Lakes · 2024', price: 25, note: 'Cloudy, fizzy, a little funky. Porch wine.', tag: 'Staff pick' },
  { id: 'gerard-fils', shelf: 'bubbles', wine: true, name: 'Gérard Fils Champagne Brut', meta: 'Champagne · NV', price: 52, note: 'Grower Champagne: brioche, green apple, fine bubbles.' },
  { id: 'calloway-lager', shelf: 'beer', name: 'Calloway Ave Lager', meta: '12-pack cans · 4.6%', price: 18, note: 'Brewed for us around the corner. Crisp, cold, on sale all week.', tag: 'Local' },
  { id: 'halo-hazy', shelf: 'beer', name: 'Halo Hazy IPA', meta: '4-pack cans · 6.8%', price: 16, note: 'Mango, orange juice, soft bitterness.' },
  { id: 'coalyard-stout', shelf: 'beer', name: 'Coalyard Oatmeal Stout', meta: '4-pack cans · 5.9%', price: 14, note: 'Chocolate and coffee, silky.' },
  { id: 'orchard-row', shelf: 'beer', name: 'Orchard Row Dry Cider', meta: '6-pack cans · 6%', price: 13, note: 'Tart and dry. Gluten-free, for the friend who asks.' },
  { id: 'zero-hour', shelf: 'beer', name: 'Zero Hour Non-Alcoholic IPA', meta: '6-pack cans · 0.4%', price: 12, note: 'Tastes like the real thing. Stock it for the drivers.' },
  { id: 'ice', shelf: 'extras', name: 'Bag of ice', meta: '10 lb', price: 4, note: 'From the freezer by the door.' },
  { id: 'tonic', shelf: 'extras', name: 'Tonic water', meta: '1L', price: 4, note: 'Dry, not too sweet.' },
  { id: 'club-soda', shelf: 'extras', name: 'Club soda', meta: '1L', price: 3, note: 'Extra fizzy.' },
  { id: 'cherries', shelf: 'extras', name: 'Cocktail cherries', meta: '10 oz jar', price: 12, note: 'Dark, boozy, nothing like the neon ones.' },
];

// Shelf talkers over the staff-picks photo. `spot` is where each one is taped on
// wide screens: left and top in percent of the photo, and a tilt in degrees.
const STAFF_PICKS = [
  { product: 'calloway-bib', staff: 'Dee', role: 'whiskey buyer', note: 'Tastes like a $60 bottle. Don\'t tell the distributor.', spot: [5, 22, -4] },
  { product: 'tierra-roja', staff: 'Marco', role: 'nights', note: 'Smoky, but in a campfire-with-friends way. Start your mezcal life here.', spot: [27, 50, 3] },
  { product: 'kesselberg', staff: 'June', role: 'wine', note: 'A little sweet, very zippy. Order Thai, open this, thank me later.', spot: [50, 20, -2] },
  { product: 'field-day', staff: 'Sam', role: 'weekends', note: 'Cloudy and fizzy and a bit wild. Porch wine. Drink it cold.', spot: [75, 8, 5] },
];

// Tastings repeat. `weekday` is 0 for Sunday; `nth` limits it to that week of
// the month (1 = the first one). The page shows the next few dates.
const TASTINGS = [
  { id: 'flights', title: 'Friday Night Flights', weekday: 5, time: '6–8pm', host: 'Dee', blurb: 'Three bourbons under $40, poured blind. Guess the price, win the bottle.', seats: 16, price: 'Free' },
  { id: 'counter', title: 'Saturday Wine Counter', weekday: 6, time: '3–6pm', host: 'June', blurb: 'Four bottles open from this week\'s mixed-case pile. Drop in, no pressure.', seats: 40, price: 'Free' },
  { id: 'no-snobs', title: 'Natural Wine, No Snobs', weekday: 3, time: '7–8:30pm', host: 'Sam', blurb: 'Pét-nats, orange wine and chillable reds, explained without the jargon.', seats: 12, price: 'Free' },
  { id: 'agave-101', title: 'Agave 101', weekday: 4, nth: 1, time: '7–8:30pm', host: 'Marco', blurb: 'Tequila vs. mezcal, from blanco to tobalá. $15, and you get it back off any bottle that night.', seats: 10, price: '$15' },
];

// Party math. Drinks per guest: `firstHour` in the first hour, `perHour` after.
const PARTY = {
  firstHour: 2,
  perHour: 1,
  mixes: [
    { id: 'wine', label: 'Wine', wine: 0.7, beer: 0.2, spirits: 0.1 },
    { id: 'beer', label: 'Beer', wine: 0.2, beer: 0.7, spirits: 0.1 },
    { id: 'cocktails', label: 'Cocktails', wine: 0.2, beer: 0.2, spirits: 0.6 },
    { id: 'even', label: 'A bit of everything', wine: 0.34, beer: 0.33, spirits: 0.33 },
  ],
  // What goes in the bag, and how many drinks one of each pours.
  red: { product: 'monte-brina', pours: 5 },
  white: { product: 'ostrea', pours: 5 },
  beer: { product: 'calloway-lager', pours: 12 },
  spirits: { product: 'brightwater', pours: 22 },
  mixer: { product: 'tonic', pours: 5 },
  ice: { product: 'ice', guestsPerBag: 10 },
};

// Mixed case options.
const CASE = {
  budgets: [
    { id: 'low', label: '≈ $15', min: 0, max: 18 },
    { id: 'mid', label: '≈ $25', min: 17, max: 29 },
    { id: 'high', label: '$35+', min: 26, max: 999 },
  ],
  styles: [
    { id: 'mix', label: 'Mix it up', shelves: ['red', 'white', 'bubbles'] },
    { id: 'red', label: 'Reds', shelves: ['red'] },
    { id: 'white', label: 'Whites & pink', shelves: ['white'] },
    { id: 'bubbles', label: 'Bubbles', shelves: ['bubbles'] },
  ],
  sizes: [6, 12],
};

// =============================================================================

(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));
  const money = (n) => '$' + (Math.round(n * 100) / 100).toFixed(Number.isInteger(Math.round(n * 100) / 100) ? 0 : 2);
  const money2 = (n) => '$' + n.toFixed(2);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode: keep it in memory */ }
    },
  };

  // ---- Time helpers ---------------------------------------------------------
  const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  function clock(min) {
    min = ((min % 1440) + 1440) % 1440;
    const h = Math.floor(min / 60), m = min % 60;
    if (h === 0 && m === 0) return 'midnight';
    if (h === 12 && m === 0) return 'noon';
    const hh = h % 12 || 12;
    return hh + (m ? ':' + String(m).padStart(2, '0') : '') + (h < 12 ? 'am' : 'pm');
  }
  // Today's opening window in minutes from today's midnight (close may pass 1440).
  function windowFor(dayIndex) {
    const h = HOURS[dayIndex];
    const open = toMin(h.open);
    let close = toMin(h.close);
    if (close <= open) close += 1440;
    return { open, close };
  }
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  // Where the shop is right now: open (and for how long), or closed (and until when).
  function status(now = new Date()) {
    const mins = now.getHours() * 60 + now.getMinutes();
    const today = now.getDay();
    const y = windowFor((today + 6) % 7);
    if (mins < y.close - 1440) return { open: true, left: y.close - 1440 - mins, closesAt: y.close };
    const t = windowFor(today);
    if (mins >= t.open && mins < t.close) return { open: true, left: t.close - mins, closesAt: t.close };
    for (let i = mins < t.open ? 0 : 1; i < 8; i++) {
      const w = windowFor((today + i) % 7);
      return { open: false, opensAt: w.open, inDays: i, day: HOURS[(today + i) % 7].day };
    }
    return { open: false };
  }

  // Time slots across today and the next open day, as [{value, label}].
  function slots({ step, lead, length = 0, stopBefore = 0 }) {
    const now = new Date();
    const out = [];
    for (let d = 0; d < 3 && out.length < 24; d++) {
      const day = addDays(startOfDay(now), d);
      const w = windowFor(day.getDay());
      const nowMin = d === 0 ? now.getHours() * 60 + now.getMinutes() : -Infinity;
      let start = Math.max(w.open, Math.ceil((nowMin + lead) / step) * step);
      start = Math.ceil(start / step) * step;
      for (let m = start; m + length <= w.close - stopBefore && out.length < 24; m += step) {
        const when = d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : HOURS[day.getDay()].day;
        const label = when + ' ' + (length ? clock(m) + '–' + clock(m + length) : clock(m));
        const at = new Date(day.getTime() + m * 60000);
        out.push({ value: at.toISOString(), label });
      }
    }
    return out;
  }

  // ---- Fill in store details ------------------------------------------------
  const stop = STORE.delivery.stopsBeforeClose;
  const deliveryLine = `We deliver to ${STORE.delivery.zips.join(', ')} until ${stop === 60 ? 'an hour' : stop + ' minutes'} before close. ${money(STORE.delivery.fee)} fee, free over ${money(STORE.delivery.freeOver)}, ${money(STORE.delivery.minimum)} minimum.`;
  const fills = {
    name: STORE.fullName,
    number: STORE.number,
    minAge: STORE.minAge,
    street: STORE.street,
    city: STORE.city,
    parking: STORE.parking,
    deliveryLine,
    caseOff: Math.round(STORE.wineDiscount * 100) + '%',
    heroMeta: `${STORE.street} · Est. ${STORE.established}`,
    gateMeta: `${STORE.fullName} · Nº ${STORE.number}`,
    countLine: `${PRODUCTS.length} bottles, cans and jars on the Board, open late every night.`,
    footerLine: `${STORE.fullName} · ${STORE.street}, ${STORE.city} · ${STORE.phone}`,
  };
  $$('[data-store]').forEach((el) => { const v = fills[el.dataset.store]; if (v !== undefined) el.textContent = v; });
  $('#directions').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(STORE.street + ', ' + STORE.city);
  $('#call').href = 'tel:' + STORE.phone.replace(/[^0-9+]/g, '');
  $('#call').textContent = STORE.phone;

  // ---- Age gate --------------------------------------------------------------
  const gate = $('#gate');
  if (!store.get('lowlight-age-ok', false) && !sessionStorageOk()) {
    gate.hidden = false;
    document.body.classList.add('locked');
    setTimeout(() => $('#gate-yes').focus(), 50);
  }
  function sessionStorageOk() { try { return sessionStorage.getItem('lowlight-age-ok') === '1'; } catch (e) { return false; } }
  $('#gate-yes').addEventListener('click', () => {
    if ($('#gate-remember').checked) store.set('lowlight-age-ok', true);
    try { sessionStorage.setItem('lowlight-age-ok', '1'); } catch (e) { /* ignore */ }
    gate.classList.add('leaving');
    document.body.classList.remove('locked');
    setTimeout(() => { gate.hidden = true; }, 350);
  });
  $('#gate-no').addEventListener('click', () => {
    $('#gate-sorry').hidden = false;
    $('#gate-yes').disabled = true;
  });

  // ---- Mobile menu -----------------------------------------------------------
  const menuBtn = $('#menu-btn');
  menuBtn.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  $$('#nav a').forEach((a) => a.addEventListener('click', () => {
    document.body.classList.remove('menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }));

  // ---- Neon sign ---------------------------------------------------------------
  function paintNeon() {
    const s = status();
    const sign = $('#neon');
    sign.classList.remove('is-open', 'is-last', 'is-closed');
    if (s.open && s.left <= STORE.lastCallMinutes) {
      sign.classList.add('is-last');
      $('#neon-word').textContent = 'Last call';
      $('#neon-sub').textContent = `${s.left} min left · closes ${clock(s.closesAt)}`;
    } else if (s.open) {
      sign.classList.add('is-open');
      $('#neon-word').textContent = 'Open';
      $('#neon-sub').textContent = `till ${clock(s.closesAt)} tonight`;
    } else {
      sign.classList.add('is-closed');
      $('#neon-word').textContent = 'Closed';
      const when = s.inDays === 0 ? 'today' : s.inDays === 1 ? 'tomorrow' : s.day;
      $('#neon-sub').textContent = `opens ${clock(s.opensAt)} ${when}`;
    }
  }
  paintNeon();
  setInterval(paintNeon, 30000);

  // ---- Ticker ------------------------------------------------------------------
  const tick = DEALS.map((d) => `<span>${esc(d)}</span><i aria-hidden="true">✦</i>`).join('');
  $('#ticker').innerHTML = tick + `<span aria-hidden="true" class="dup">${tick.replace(/<span>/g, '<span aria-hidden="true">')}</span>`;

  // ---- Bag ---------------------------------------------------------------------
  let bag = store.get('lowlight-bag', {});
  for (const id of Object.keys(bag)) if (!byId[id] || !(bag[id] > 0)) delete bag[id];

  function addToBag(id, qty = 1, quiet) {
    bag[id] = (bag[id] || 0) + qty;
    saveBag();
    if (!quiet) toast(`${byId[id].name} is in your bag`);
  }
  function saveBag() { store.set('lowlight-bag', bag); renderBag(); }
  function totals(mode, zip) {
    const lines = Object.entries(bag).map(([id, qty]) => ({ p: byId[id], qty }));
    const subtotal = lines.reduce((n, l) => n + l.p.price * l.qty, 0);
    const wineCount = lines.filter((l) => l.p.wine).reduce((n, l) => n + l.qty, 0);
    const wineValue = lines.filter((l) => l.p.wine).reduce((n, l) => n + l.p.price * l.qty, 0);
    const discount = wineCount >= STORE.wineDiscountMin ? wineValue * STORE.wineDiscount : 0;
    const afterDiscount = subtotal - discount;
    const fee = mode === 'delivery' ? (afterDiscount >= STORE.delivery.freeOver ? 0 : STORE.delivery.fee) : 0;
    return { lines, subtotal, wineCount, discount, fee, total: afterDiscount + fee, count: lines.reduce((n, l) => n + l.qty, 0) };
  }
  function currentMode() { const r = $('#order-form input[name=mode]:checked'); return r ? r.value : 'pickup'; }

  function renderBag() {
    const t = totals(currentMode());
    $('#bag-count').textContent = t.count;
    $('#bag-open').classList.toggle('has-items', t.count > 0);
    $('#bag-empty').hidden = t.count > 0;
    $('#order-form').hidden = t.count === 0;
    $('#bag-items').innerHTML = t.lines.map(({ p, qty }) => `
      <li class="bag-item">
        <div class="bag-name"><strong>${esc(p.name)}</strong><span class="mono">${esc(p.meta)}</span></div>
        <div class="qty" role="group" aria-label="Quantity of ${esc(p.name)}">
          <button type="button" data-dec="${p.id}" aria-label="One fewer">−</button>
          <span>${qty}</span>
          <button type="button" data-inc="${p.id}" aria-label="One more">+</button>
        </div>
        <span class="bag-price mono">${money(p.price * qty)}</span>
      </li>`).join('');
    const need = STORE.wineDiscountMin - t.wineCount;
    $('#bag-totals').innerHTML = t.count === 0 ? '' : `
      <p><span>Subtotal</span><span>${money2(t.subtotal)}</span></p>
      ${t.discount ? `<p class="good"><span>${Math.round(STORE.wineDiscount * 100)}% off ${t.wineCount} wines</span><span>−${money2(t.discount)}</span></p>`
        : t.wineCount > 0 ? `<p class="hint"><span>Add ${need} more wine${need === 1 ? '' : 's'} for ${Math.round(STORE.wineDiscount * 100)}% off</span><span></span></p>` : ''}
      ${currentMode() === 'delivery' ? `<p><span>Delivery</span><span>${t.fee ? money2(t.fee) : 'Free'}</span></p>` : ''}
      <p class="total"><span>Total</span><span>${money2(t.total)}</span></p>`;
  }
  $('#bag-items').addEventListener('click', (e) => {
    const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]');
    if (inc) { bag[inc.dataset.inc]++; saveBag(); }
    if (dec) { const id = dec.dataset.dec; bag[id]--; if (bag[id] <= 0) delete bag[id]; saveBag(); }
  });

  // Drawer open/close
  const drawer = $('#drawer'), shade = $('#drawer-shade');
  let lastFocus = null;
  function openDrawer() {
    lastFocus = document.activeElement;
    $('#toast').classList.remove('show');
    $('#drawer-done').hidden = true;
    $('#drawer-body').hidden = false;
    fillSlots();
    renderBag();
    drawer.hidden = false; shade.hidden = false;
    requestAnimationFrame(() => { drawer.classList.add('open'); shade.classList.add('open'); });
    document.body.classList.add('locked');
    $('#bag-close').focus();
  }
  function closeDrawer() {
    drawer.classList.remove('open'); shade.classList.remove('open');
    document.body.classList.remove('locked');
    setTimeout(() => { drawer.hidden = true; shade.hidden = true; }, 250);
    if (lastFocus) lastFocus.focus();
  }
  $('#bag-open').addEventListener('click', openDrawer);
  $('#bag-close').addEventListener('click', closeDrawer);
  shade.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) closeDrawer(); });

  // Order form
  const form = $('#order-form');
  function fillSlots() {
    const delivery = currentMode() === 'delivery';
    const list = delivery
      ? slots({ step: 60, lead: 45, length: 60, stopBefore: STORE.delivery.stopsBeforeClose })
      : slots({ step: 15, lead: 20 });
    $('#slot-label').textContent = delivery ? 'Delivery window' : 'Pickup time';
    $('#slot').innerHTML = list.map((s) => `<option value="${s.value}">${esc(s.label)}</option>`).join('');
    $$('.delivery-only', form).forEach((el) => { el.hidden = !delivery; });
  }
  $$('input[name=mode]', form).forEach((r) => r.addEventListener('change', () => { fillSlots(); renderBag(); }));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const err = (msg) => { $('#order-error').textContent = msg; };
    const t = totals(data.mode);
    if (!t.count) return err('Your bag is empty.');
    if (!data.name.trim()) return err('Add the name on your ID.');
    if ((data.phone.match(/\d/g) || []).length < 7) return err('Add a phone number so we can text you when it\'s ready.');
    if (data.mode === 'delivery') {
      if (!data.address.trim()) return err('Add the street address for delivery.');
      if (!STORE.delivery.zips.includes(data.zip.trim())) return err(`We don't deliver to ${data.zip.trim() || 'that ZIP'} yet. Pickup is always open.`);
      if (t.total - t.fee < STORE.delivery.minimum) return err(`Delivery starts at ${money(STORE.delivery.minimum)}. Add a little more, or switch to pickup.`);
    }
    if (!data.slot) return err('Pick a time.');
    err('');
    const order = {
      id: 'LL-' + String(Math.floor(1000 + Math.random() * 9000)),
      at: new Date().toISOString(),
      mode: data.mode,
      slot: $('#slot').selectedOptions[0].textContent,
      name: data.name.trim(),
      items: t.lines.map((l) => ({ id: l.p.id, qty: l.qty })),
      total: Math.round(t.total * 100) / 100,
    };
    const orders = store.get('lowlight-orders', []);
    orders.push(order);
    store.set('lowlight-orders', orders);
    bag = {}; saveBag(); form.reset(); fillSlots();
    $('#drawer-body').hidden = true;
    const done = $('#drawer-done');
    done.hidden = false;
    done.innerHTML = `
      <p class="mono kicker">Reserved</p>
      <p class="done-id">${order.id}</p>
      <p class="done-copy">${order.mode === 'pickup' ? 'It\'ll be bagged at the counter' : 'Our driver will be at your door'} <strong>${esc(order.slot)}</strong>. ${money2(order.total)}, paid ${order.mode === 'pickup' ? 'at the register' : 'at the door'}.</p>
      <p class="done-copy">Bring a photo ID. We text ${esc(data.phone)} if anything's out of stock.</p>
      <button class="btn btn-amber btn-wide" type="button" id="done-close">Done</button>`;
    $('#done-close').addEventListener('click', closeDrawer);
    $('#done-close').focus();
  });

  // ---- The Board -----------------------------------------------------------------
  const tabs = [{ id: 'all', label: 'All' }, ...SHELVES, { id: 'under20', label: 'Under $20' }];
  let shelf = 'all', query = '', sort = 'cat';
  $('#board-tabs').innerHTML = tabs.map((t) => `<button type="button" role="tab" data-shelf="${t.id}" aria-selected="${t.id === 'all'}">${esc(t.label)}</button>`).join('');
  $('#board-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-shelf]');
    if (!b) return;
    shelf = b.dataset.shelf;
    $$('#board-tabs [role=tab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
    renderBoard();
  });
  $('#board-search').addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); renderBoard(); });
  $('#board-sort').addEventListener('change', (e) => { sort = e.target.value; renderBoard(); });

  function renderBoard() {
    let list = PRODUCTS.filter((p) => shelf === 'all' || (shelf === 'under20' ? p.price < 20 : p.shelf === shelf));
    if (query) {
      const under = query.match(/under\s*\$?(\d+)/);
      const words = query.replace(/under\s*\$?\d+/, '').split(/\s+/).filter(Boolean);
      const shelfName = (p) => (SHELVES.find((s) => s.id === p.shelf) || {}).label || '';
      list = list.filter((p) => (!under || p.price < Number(under[1])) &&
        words.every((w) => (p.name + ' ' + p.meta + ' ' + p.note + ' ' + shelfName(p) + ' ' + (p.tag || '')).toLowerCase().includes(w)));
    }
    const order = SHELVES.map((s) => s.id);
    if (sort === 'low') list.sort((a, b) => a.price - b.price);
    else if (sort === 'high') list.sort((a, b) => b.price - a.price);
    else if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
    else list.sort((a, b) => order.indexOf(a.shelf) - order.indexOf(b.shelf));

    let lastShelf = null;
    $('#board-list').innerHTML = list.map((p) => {
      const head = sort === 'cat' && p.shelf !== lastShelf
        ? `<li class="shelf-head" aria-hidden="true">${esc(SHELVES.find((s) => s.id === p.shelf).label)}</li>` : '';
      lastShelf = p.shelf;
      return head + `
        <li class="row" data-id="${p.id}">
          <button class="row-main" type="button" aria-expanded="false">
            <span class="row-name">${esc(p.name)}${p.tag ? ` <em class="tag">${esc(p.tag)}</em>` : ''}</span>
            <span class="row-dots" aria-hidden="true"></span>
            <span class="row-price">${money(p.price)}</span>
          </button>
          <button class="row-add" type="button" data-add="${p.id}" aria-label="Add ${esc(p.name)} to bag">+</button>
          <div class="row-more"><span class="mono">${esc(p.meta)}</span><p>${esc(p.note)}</p></div>
        </li>`;
    }).join('');
    $('#board-empty').hidden = list.length > 0;
  }
  $('#board-list').addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      addToBag(add.dataset.add);
      add.classList.add('pop');
      setTimeout(() => add.classList.remove('pop'), 300);
      return;
    }
    const main = e.target.closest('.row-main');
    if (main) {
      const row = main.parentElement;
      const open = row.classList.toggle('open');
      main.setAttribute('aria-expanded', String(open));
    }
  });
  renderBoard();

  // ---- Staff picks (shelf talkers) -----------------------------------------------
  $('#talkers').innerHTML = STAFF_PICKS.map((s, i) => {
    const p = byId[s.product];
    const [left, top, tilt] = s.spot;
    return `
      <article class="talker" style="--x:${left}%;--y:${top}%;--tilt:${tilt}deg;--i:${i}">
        <span class="tape" aria-hidden="true"></span>
        <p class="talker-staff mono">${esc(s.staff)} · ${esc(s.role)}</p>
        <h3 class="talker-name">${esc(p.name)}</h3>
        <p class="talker-note">“${esc(s.note)}”</p>
        <div class="talker-foot">
          <span class="talker-price">${money(p.price)}</span>
          <button type="button" class="talker-add" data-add="${p.id}">Add to bag</button>
        </div>
      </article>`;
  }).join('');
  $('#talkers').addEventListener('click', (e) => { const b = e.target.closest('[data-add]'); if (b) addToBag(b.dataset.add); });

  // ---- Segmented controls helper --------------------------------------------------
  function seg(container, name, options, checked, onChange) {
    container.innerHTML = options.map((o) => `
      <label class="seg-opt"><input type="radio" name="${name}" value="${o.id}" ${o.id === checked ? 'checked' : ''}><span>${esc(o.label)}</span></label>`).join('');
    container.addEventListener('change', (e) => onChange(e.target.value));
  }

  // ---- Party math ---------------------------------------------------------------
  let mix = 'even';
  seg($('#party-mix'), 'mix', PARTY.mixes, mix, (v) => { mix = v; renderParty(); });
  ['guests', 'hours'].forEach((id) => $('#' + id).addEventListener('input', renderParty));
  $('#party-ice').addEventListener('change', renderParty);
  let partyBag = [];
  function renderParty() {
    const guests = Number($('#guests').value), hours = Number($('#hours').value);
    $('#guests-out').textContent = guests;
    $('#hours-out').textContent = hours;
    const drinks = guests * (PARTY.firstHour + Math.max(0, hours - 1) * PARTY.perHour);
    const m = PARTY.mixes.find((x) => x.id === mix);
    const wineBottles = Math.ceil((drinks * m.wine) / PARTY.red.pours);
    const red = Math.ceil(wineBottles / 2), white = wineBottles - red;
    const beerPacks = Math.ceil((drinks * m.beer) / PARTY.beer.pours);
    const spiritDrinks = drinks * m.spirits;
    const spirits = Math.ceil(spiritDrinks / PARTY.spirits.pours);
    const mixers = Math.ceil(spiritDrinks / PARTY.mixer.pours);
    const ice = $('#party-ice').checked ? Math.ceil(guests / PARTY.ice.guestsPerBag) : 0;
    partyBag = [
      [PARTY.red.product, red, 'bottles of red'],
      [PARTY.white.product, white, 'bottles of white'],
      [PARTY.beer.product, beerPacks, '12-packs of lager'],
      [PARTY.spirits.product, spirits, 'liters of vodka'],
      [PARTY.mixer.product, mixers, 'liters of tonic'],
      [PARTY.ice.product, ice, 'bags of ice'],
    ].filter((x) => x[1] > 0);
    const cost = partyBag.reduce((n, [id, q]) => n + byId[id].price * q, 0);
    const big = $('#party-drinks');
    big.textContent = drinks;
    big.parentElement.classList.remove('bump'); void big.offsetWidth; big.parentElement.classList.add('bump');
    $('#party-breakdown').innerHTML = partyBag.map(([id, q, unit]) => `
      <li><span class="pb-q">${q}</span><span class="pb-u">${esc(unit)}<small class="mono">${esc(byId[id].name)} · ${money(byId[id].price)}</small></span></li>`).join('') +
      `<li class="pb-total mono"><span>About ${money(cost)} before the wine discount</span></li>`;
  }
  $('#party-add').addEventListener('click', () => {
    partyBag.forEach(([id, q]) => addToBag(id, q, true));
    toast('The whole party is in your bag');
  });
  $('#party-form').addEventListener('submit', (e) => e.preventDefault());
  renderParty();

  // ---- Mixed case -----------------------------------------------------------------
  let budget = 'mid', style = 'mix', size = 12, caseItems = [];
  seg($('#case-budget'), 'budget', CASE.budgets, budget, (v) => { budget = v; });
  seg($('#case-style'), 'style', CASE.styles, style, (v) => { style = v; });
  seg($('#case-size'), 'size', CASE.sizes.map((n) => ({ id: String(n), label: n + ' bottles' })), String(size), (v) => { size = Number(v); });

  function buildCase() {
    const b = CASE.budgets.find((x) => x.id === budget);
    const s = CASE.styles.find((x) => x.id === style);
    let pool = PRODUCTS.filter((p) => p.wine && s.shelves.includes(p.shelf) && p.price >= b.min && p.price <= b.max);
    if (!pool.length) pool = PRODUCTS.filter((p) => p.wine && s.shelves.includes(p.shelf));
    pool = pool.slice().sort(() => Math.random() - 0.5);
    const counts = {};
    for (let i = 0; i < size; i++) { const p = pool[i % pool.length]; counts[p.id] = (counts[p.id] || 0) + 1; }
    caseItems = Object.entries(counts).map(([id, qty]) => ({ p: byId[id], qty }));
    renderReceipt();
  }
  function renderReceipt() {
    const r = $('#receipt');
    const now = new Date();
    const subtotal = caseItems.reduce((n, l) => n + l.p.price * l.qty, 0);
    const off = subtotal * STORE.wineDiscount;
    const total = subtotal - off;
    const bars = Array.from({ length: 46 }, () => `<i style="width:${1 + Math.floor(Math.random() * 3)}px"></i>`).join('');
    r.innerHTML = `
      <p class="rc-store">${esc(STORE.fullName.toUpperCase())}</p>
      <p class="rc-small">${esc(STORE.street)} · ${esc(STORE.phone)}</p>
      <p class="rc-small">${now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} ${clock(now.getHours() * 60 + now.getMinutes())} · MIXED CASE</p>
      <p class="rc-rule"></p>
      <ul class="rc-lines">
        ${caseItems.map(({ p, qty }) => `<li><span>${qty} × ${esc(p.name)}</span><span>${money2(p.price * qty)}</span><small>${esc(p.meta)}</small></li>`).join('')}
      </ul>
      <p class="rc-rule"></p>
      <p class="rc-row"><span>${size} BOTTLES</span><span>${money2(subtotal)}</span></p>
      <p class="rc-row"><span>CASE ${Math.round(STORE.wineDiscount * 100)}% OFF</span><span>−${money2(off)}</span></p>
      <p class="rc-row rc-total"><span>TOTAL</span><span>${money2(total)}</span></p>
      <p class="rc-small">≈ ${money2(total / size)} A BOTTLE</p>
      <div class="rc-bars" aria-hidden="true">${bars}</div>
      <div class="rc-actions">
        <button type="button" class="btn btn-ink" id="case-add">Add the case to my bag</button>
        <button type="button" class="btn btn-ghost-ink" id="case-shuffle">Shuffle</button>
      </div>`;
    r.classList.remove('printing'); void r.offsetWidth; r.classList.add('printing');
    $('#case-add').addEventListener('click', () => {
      caseItems.forEach(({ p, qty }) => addToBag(p.id, qty, true));
      toast(`${size} bottles are in your bag, ${Math.round(STORE.wineDiscount * 100)}% off`);
    });
    $('#case-shuffle').addEventListener('click', buildCase);
  }
  $('#case-form').addEventListener('submit', (e) => { e.preventDefault(); buildCase(); });
  buildCase();

  // ---- Tastings ---------------------------------------------------------------------
  function nextDates(t, count) {
    const out = [];
    let d = startOfDay(new Date());
    for (let i = 0; i < 70 && out.length < count; i++, d = addDays(d, 1)) {
      if (d.getDay() !== t.weekday) continue;
      if (t.nth && Math.ceil(d.getDate() / 7) !== t.nth) continue;
      out.push(d);
    }
    return out;
  }
  const rsvps = store.get('lowlight-rsvps', {});
  function renderEvents() {
    const items = TASTINGS.flatMap((t) => nextDates(t, t.nth ? 1 : 2).map((d) => ({ t, d })))
      .sort((a, b) => a.d - b.d).slice(0, 6);
    $('#events').innerHTML = items.map(({ t, d }, i) => {
      const key = t.id + '@' + d.toISOString().slice(0, 10);
      const mine = rsvps[key];
      // A steady, believable number already signed up, so it differs per date.
      const taken = Math.min(t.seats - 1, Math.floor(t.seats * (0.35 + ((d.getDate() * 7 + t.seats) % 10) / 20)));
      const left = t.seats - taken - (mine ? mine.party : 0);
      return `
        <li class="event ${i % 2 ? 'alt' : ''}" data-key="${key}">
          <div class="ev-date"><span class="ev-day">${d.getDate()}</span><span class="mono">${d.toLocaleDateString(undefined, { month: 'short' })} · ${HOURS[d.getDay()].day.slice(0, 3)}</span></div>
          <div class="ev-body">
            <h3>${esc(t.title)}</h3>
            <p>${esc(t.blurb)}</p>
            <p class="mono ev-meta">${esc(t.time)} · with ${esc(t.host)} · ${esc(t.price)}</p>
          </div>
          <div class="ev-act">
            <p class="mono ev-left"><span class="seats" style="--fill:${Math.round(((t.seats - left) / t.seats) * 100)}%"></span>${left > 0 ? left + ' seats left' : 'Full: walk-ins welcome'}</p>
            ${mine ? `<p class="ev-mine">You're on the list${mine.party > 1 ? ' (+' + (mine.party - 1) + ')' : ''}. <button type="button" class="link" data-cancel="${key}">Cancel</button></p>`
              : left > 0 ? `<button type="button" class="btn btn-line" data-rsvp="${key}">Save me a seat</button>` : ''}
            <form class="rsvp" data-form="${key}" hidden>
              <label class="field"><span>Name</span><input name="name" required autocomplete="name"></label>
              <label class="field"><span>Email</span><input name="email" type="email" required autocomplete="email"></label>
              <label class="field"><span>How many?</span><select name="party">${[1, 2, 3, 4].filter((n) => n <= left).map((n) => `<option>${n}</option>`).join('')}</select></label>
              <button class="btn btn-amber" type="submit">Confirm</button>
            </form>
          </div>
        </li>`;
    }).join('');
  }
  $('#events').addEventListener('click', (e) => {
    const open = e.target.closest('[data-rsvp]');
    if (open) {
      const f = $(`form[data-form="${open.dataset.rsvp}"]`);
      f.hidden = false; open.hidden = true;
      f.querySelector('input').focus();
    }
    const cancel = e.target.closest('[data-cancel]');
    if (cancel) { delete rsvps[cancel.dataset.cancel]; store.set('lowlight-rsvps', rsvps); renderEvents(); toast('Seat released'); }
  });
  $('#events').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    if (!f.reportValidity()) return;
    const data = Object.fromEntries(new FormData(f));
    rsvps[f.dataset.form] = { name: data.name.trim(), email: data.email.trim(), party: Number(data.party) };
    store.set('lowlight-rsvps', rsvps);
    renderEvents();
    toast(`See you there, ${data.name.trim().split(' ')[0]}`);
  });
  renderEvents();

  // ---- Visit: hours table and delivery check -----------------------------------------
  const today = new Date().getDay();
  $('#hours-table').innerHTML = HOURS.map((h, i) => {
    const w = windowFor(i);
    return `<tr class="${i === today ? 'today' : ''}"><th scope="row">${h.day}${i === today ? ' <em>today</em>' : ''}</th><td>${clock(w.open)} – ${clock(w.close)}</td></tr>`;
  }).join('');
  $('#zip-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const zip = $('#zip').value.trim();
    const out = $('#zip-result');
    if (!/^\d{5}$/.test(zip)) { out.textContent = 'Five digits, please.'; out.className = 'zip-result'; return; }
    if (STORE.delivery.zips.includes(zip)) {
      out.textContent = `Yes, we deliver to ${zip}. Usually under an hour, ${money(STORE.delivery.fee)} or free over ${money(STORE.delivery.freeOver)}.`;
      out.className = 'zip-result yes';
    } else {
      out.textContent = `Not ${zip} yet, sorry. Order ahead for pickup and it'll be waiting at the counter.`;
      out.className = 'zip-result no';
    }
  });

  // ---- Toast --------------------------------------------------------------------------
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.innerHTML = `${esc(msg)} <button type="button" class="link" id="toast-open">View bag</button>`;
    t.classList.add('show');
    $('#toast-open').addEventListener('click', () => { t.classList.remove('show'); openDrawer(); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }

  renderBag();
})();
