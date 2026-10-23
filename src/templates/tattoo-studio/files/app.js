// =============================================================================
// Studio content. Everything a studio would change lives here, as plain data.
// =============================================================================

var STUDIO = {
  name: 'Moth & Mercy Tattoo',
  city: 'Eastside, est. 2014',
  lede: 'Custom and flash tattooing by five resident artists. Fine line to full back pieces, done slow and done right.',
  street: '418 Larkspur Ave, Unit B',
  directions: 'Up the iron stairs beside the record shop. Street parking after 6pm; bus 14 stops at the corner of Larkspur & 9th.',
  phone: '(555) 014-6684',
  email: 'hello@mothandmercy.example',
  instagram: '@mothandmercy.tattoo',
  instagramUrl: 'https://instagram.com/',
  walkIns: 'Walk-ins Fri & Sat from 2pm',
  booksNote: 'Books open for November',
  // Shown in the scrolling strip under the hero.
  ticker: ['Books open — November', 'Flash Friday, 13th — $113 one-offs', 'Walk-ins Fri & Sat from 2pm', 'Guest spot: Ines Varga, Nov 4–15', 'Single-use needles, always'],
};

// Times are 24h "HH:MM"; null means closed. Index 0 is Sunday.
var HOURS = [
  null,
  null,
  ['12:00', '20:00'],
  ['12:00', '20:00'],
  ['12:00', '21:00'],
  ['12:00', '22:00'],
  ['11:00', '22:00'],
];

var PRICING = {
  minimum: 120,      // shop minimum, any tattoo
  deposit: 100,      // taken at booking, comes off the final price
  rules: [
    ['Shop minimum', '$120'],
    ['Hourly', 'from $150'],
    ['Deposit', '$100, off the final price'],
    ['Flash', 'fixed price, as marked'],
    ['Touch-ups', 'free within 3 months'],
  ],
};

// status: 'open' (taking bookings), 'waitlist' or 'closed'.
var ARTISTS = [
  { id: 'wren', name: 'Wren Calloway', styles: ['Fine line', 'Botanical'], rate: 160, status: 'open', since: 2014, photo: 'images/work-1.jpg' },
  { id: 'otis', name: 'Otis Marlow', styles: ['Traditional', 'Flash'], rate: 150, status: 'open', since: 2016, photo: 'images/work-2.jpg' },
  { id: 'saoirse', name: 'Saoirse Bell', styles: ['Blackwork', 'Ornamental'], rate: 170, status: 'waitlist', since: 2017, photo: 'images/work-3.jpg' },
  { id: 'dante', name: 'Dante Okafor', styles: ['Black & grey', 'Realism'], rate: 190, status: 'closed', since: 2019, photo: 'images/work-4.jpg' },
  { id: 'mika', name: 'Mika Hollis', styles: ['Neo-traditional', 'Colour'], rate: 160, status: 'open', since: 2021, photo: 'images/work-5.jpg' },
];

// Portfolio. `artist` matches an ARTISTS id; `style` drives the filter chips.
var WORK = [
  { src: 'images/work-1.jpg', artist: 'wren', style: 'Fine line', caption: 'Forearm, healed' },
  { src: 'images/work-2.jpg', artist: 'otis', style: 'Traditional', caption: 'Upper arm, fresh' },
  { src: 'images/work-3.jpg', artist: 'saoirse', style: 'Blackwork', caption: 'Back piece, session 4' },
  { src: 'images/work-4.jpg', artist: 'dante', style: 'Black & grey', caption: 'Shoulder, healed' },
  { src: 'images/work-5.jpg', artist: 'mika', style: 'Colour', caption: 'Calf, fresh' },
  { src: 'images/work-6.jpg', artist: 'otis', style: 'Traditional', caption: 'Sleeve in progress' },
  { src: 'images/work-7.jpg', artist: 'saoirse', style: 'Blackwork', caption: 'Hand, healed' },
  { src: 'images/work-8.jpg', artist: 'mika', style: 'Colour', caption: 'Back piece, session 3' },
];

// One-off flash. `art` is a key in flash-art.js. claimed: already tattooed.
var FLASH = [
  { id: 'f01', title: 'Mercy heart', art: 'heart', price: 220, size: '3 in', artist: 'otis', claimed: false },
  { id: 'f02', title: 'Night moth', art: 'moth', price: 180, size: '3 in', artist: 'wren', claimed: false },
  { id: 'f03', title: 'Long dagger', art: 'dagger', price: 160, size: '4 in', artist: 'otis', claimed: true },
  { id: 'f04', title: 'Red rose', art: 'rose', price: 200, size: '3 in', artist: 'mika', claimed: false },
  { id: 'f05', title: 'Homebound swallow', art: 'swallow', price: 190, size: '3 in', artist: 'otis', claimed: false },
  { id: 'f06', title: 'Garden snake', art: 'snake', price: 240, size: '5 in', artist: 'mika', claimed: false },
  { id: 'f07', title: 'Watcher', art: 'eye', price: 210, size: '3 in', artist: 'saoirse', claimed: true },
  { id: 'f08', title: 'Sleepy moon', art: 'moon', price: 170, size: '3 in', artist: 'wren', claimed: false },
  { id: 'f09', title: 'Grin', art: 'skull', price: 200, size: '3 in', artist: 'otis', claimed: false },
  { id: 'f10', title: 'Anchor', art: 'anchor', price: 160, size: '3 in', artist: 'otis', claimed: false },
  { id: 'f11', title: 'Sacred heart', art: 'sacred', price: 260, size: '4 in', artist: 'mika', claimed: false },
  { id: 'f12', title: 'Borrowed time', art: 'hourglass', price: 230, size: '4 in', artist: 'saoirse', claimed: false },
];

// Hours-per-inch multipliers for the estimate.
var PLACEMENTS = [
  { id: 'forearm', label: 'Forearm', factor: 1 },
  { id: 'upperarm', label: 'Upper arm', factor: 1 },
  { id: 'calf', label: 'Calf', factor: 1 },
  { id: 'thigh', label: 'Thigh', factor: 1 },
  { id: 'chest', label: 'Chest', factor: 1.15 },
  { id: 'back', label: 'Back', factor: 1.1 },
  { id: 'ribs', label: 'Ribs', factor: 1.35 },
  { id: 'hand', label: 'Hand / fingers', factor: 1.25 },
  { id: 'neck', label: 'Neck', factor: 1.3 },
];

// Aftercare, by stage. `from` is the first day the stage applies.
var AFTERCARE = [
  { from: 1, title: 'Leave the wrap on, then wash.', items: ['Keep the film on for 3–5 hours (second-skin: up to 3 days).', 'Wash with warm water and unscented soap, clean hands only.', 'Pat dry with paper towel. No bath towels.', 'Expect some ink and plasma to weep. That is normal.'] },
  { from: 3, title: 'It will feel tight and warm.', items: ['Wash twice a day.', 'A very thin layer of unscented lotion, rubbed in fully.', 'Loose, clean clothes over it. Sleep on clean sheets.', 'No swimming, baths, saunas or sunbeds.'] },
  { from: 5, title: 'Peeling starts. Hands off.', items: ['Flakes and light scabs are part of it.', 'Do not pick, scratch or peel. Slap it lightly if it itches.', 'Keep moisturising lightly, two or three times a day.'] },
  { from: 15, title: 'Looks cloudy? It is settling.', items: ['A milky "silver skin" can sit over the ink for a while.', 'Keep it moisturised and out of strong sun.', 'Swimming is fine again once all flaking has stopped.'] },
  { from: 30, title: 'Healed on top. Protect it for life.', items: ['SPF 50 whenever it sees sun.', 'Book your free touch-up now if anything healed patchy.', 'Send us a healed photo. We love those.'] },
];

var FAQ = [
  ['Do I need to be 18?', 'Yes, no exceptions, with a valid photo ID on the day. We cannot tattoo minors even with a parent present.'],
  ['How does the deposit work?', 'A $100 deposit holds your date and pays for drawing time. It comes off the final price. Reschedule with 48 hours\' notice and it moves with you.'],
  ['Can I walk in?', 'Fridays and Saturdays from 2pm, first come, first served, for flash and small pieces. Everything else is by appointment.'],
  ['Will you cover up an old tattoo?', 'Often, yes. Send a clear photo in daylight with your request. Some pieces need a laser session or two first, and we\'ll tell you honestly.'],
  ['Can I bring someone?', 'One friend is welcome. The studio is small, so no groups, please.'],
  ['Do you tattoo over scars or stretch marks?', 'Usually, once a scar is fully healed (about a year). Bring it up in your request and we\'ll pair you with the right artist.'],
];

// =============================================================================
// App
// =============================================================================

(function () {
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
  var artistById = function (id) { return ARTISTS.find(function (a) { return a.id === id; }); };
  var STATUS = { open: 'Books open', waitlist: 'Waitlist', closed: 'Books closed' };

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem('mm.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('mm.' + k, JSON.stringify(v)); } catch (e) { /* storage off */ } },
  };

  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }

  // ---- Studio text --------------------------------------------------------
  $$('[data-studio]').forEach(function (el) { el.textContent = STUDIO[el.getAttribute('data-studio')] || ''; });
  $('#year').textContent = new Date().getFullYear();
  $('#heroFacts').innerHTML = [STUDIO.booksNote, STUDIO.walkIns, 'Shop minimum ' + money(PRICING.minimum)]
    .map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('');

  var tick = STUDIO.ticker.map(function (t) { return '<span>' + esc(t) + '</span><svg viewBox="0 0 64 64"><use href="#moth-mark"/></svg>'; }).join('');
  $('#ticker').innerHTML = tick + tick;

  // ---- Hours / open now ---------------------------------------------------
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var mins = function (hhmm) { var p = hhmm.split(':'); return +p[0] * 60 + +p[1]; };
  var fmt = function (hhmm) {
    var m = mins(hhmm), h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return h + (mm ? ':' + String(mm).padStart(2, '0') : '') + ap;
  };

  function renderStatus() {
    var now = new Date(), d = now.getDay(), m = now.getHours() * 60 + now.getMinutes();
    var today = HOURS[d], text, open = false;
    if (today && m >= mins(today[0]) && m < mins(today[1])) {
      open = true;
      text = 'Open now · until ' + fmt(today[1]);
    } else {
      for (var i = 0; i < 8; i++) {
        var day = (d + i) % 7, h = HOURS[day];
        if (h && (i > 0 || m < mins(h[0]))) {
          text = 'Closed · opens ' + (i === 0 ? 'today' : i === 1 ? 'tomorrow' : DAYS[day]) + ' ' + fmt(h[0]);
          break;
        }
      }
    }
    var s = $('#status');
    s.classList.toggle('is-open', open);
    $('span', s).textContent = text || 'Closed';
  }

  function renderHours() {
    var d = new Date().getDay();
    $('#hours tbody').innerHTML = [1, 2, 3, 4, 5, 6, 0].map(function (i) {
      var h = HOURS[i];
      return '<tr' + (i === d ? ' class="today"' : '') + '><th scope="row">' + DAYS[i] + '</th><td>' +
        (h ? fmt(h[0]) + ' – ' + fmt(h[1]) : 'Closed') + '</td></tr>';
    }).join('');
    var tel = STUDIO.phone.replace(/[^\d+]/g, '');
    $('#phoneLink').href = 'tel:' + tel; $('#phoneLink').textContent = STUDIO.phone;
    $('#mailLink').href = 'mailto:' + STUDIO.email; $('#mailLink').textContent = STUDIO.email;
    $('#instaLink').href = STUDIO.instagramUrl; $('#instaLink').textContent = STUDIO.instagram;
  }
  renderStatus(); renderHours();
  setInterval(renderStatus, 60000);

  // ---- Artists ledger -------------------------------------------------------
  var activeArtist = null, activeStyle = 'All';

  function renderLedger() {
    $('#ledger').innerHTML = ARTISTS.map(function (a, i) {
      return '<div class="row' + (activeArtist === a.id ? ' is-active' : '') + '" role="listitem" data-id="' + a.id + '">' +
        '<span class="row-no">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<button class="row-name" data-act="filter" aria-pressed="' + (activeArtist === a.id) + '">' + esc(a.name) + '</button>' +
        '<span class="row-styles">' + a.styles.map(esc).join(' / ') + '</span>' +
        '<span class="row-rate">' + money(a.rate) + '/hr</span>' +
        '<span class="row-status s-' + a.status + '"><i></i>' + STATUS[a.status] + '</span>' +
        (a.status === 'closed'
          ? '<span class="row-book is-off">—</span>'
          : '<button class="row-book" data-act="book">' + (a.status === 'open' ? 'Book' : 'Join list') + ' →</button>') +
        '</div>';
    }).join('');
  }

  $('#ledger').addEventListener('click', function (e) {
    var btn = e.target.closest('button'); if (!btn) return;
    var id = btn.closest('.row').getAttribute('data-id');
    if (btn.getAttribute('data-act') === 'book') {
      $('#artistSel').value = id;
      updateEstimate();
      document.getElementById('book').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    activeArtist = activeArtist === id ? null : id;
    activeStyle = 'All';
    renderLedger(); renderWork();
    if (activeArtist) document.getElementById('work').scrollIntoView({ behavior: 'smooth' });
  });

  // A photo that follows the cursor over the ledger (mouse only).
  var peek = $('#peek');
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $('#ledger').addEventListener('mousemove', function (e) {
      var row = e.target.closest('.row');
      if (!row) { peek.classList.remove('show'); return; }
      var a = artistById(row.getAttribute('data-id'));
      if (peek.getAttribute('src') !== a.photo) peek.src = a.photo;
      var box = $('#artists').getBoundingClientRect();
      peek.style.transform = 'translate(' + (e.clientX - box.left + 24) + 'px,' + (e.clientY - box.top - 120) + 'px) rotate(-3deg)';
      peek.classList.add('show');
    });
    $('#ledger').addEventListener('mouseleave', function () { peek.classList.remove('show'); });
  }

  // ---- Work -----------------------------------------------------------------
  // Rows that always fill the 12-column grid: wide pairs (7+5, then 5+7)
  // alternate with rows of three. Each span is [cols, rows, phone cols, phone rows].
  function layout(n) {
    var out = [], flip = false, lastPair = false;
    while (out.length < n) {
      var rem = n - out.length;
      if (rem === 1) out.push([12, 3, 6, 3]);
      else if (rem === 2 || rem === 4 || (rem !== 3 && !lastPair)) {
        out.push(flip ? [5, 3, 3, 3] : [7, 3, 3, 3], flip ? [7, 3, 3, 3] : [5, 3, 3, 3]);
        flip = !flip; lastPair = true;
      } else {
        out.push([4, 2, 2, 2], [4, 2, 2, 2], [4, 2, 2, 2]);
        lastPair = false;
      }
    }
    return out;
  }

  function renderWork() {
    var styles = ['All'].concat(WORK.map(function (w) { return w.style; }).filter(function (s, i, a) { return a.indexOf(s) === i; }));
    $('#styleChips').innerHTML = styles.map(function (s) {
      return '<button class="chip" aria-pressed="' + (s === activeStyle && !activeArtist) + '" data-style="' + esc(s) + '">' + esc(s) + '</button>';
    }).join('') + (activeArtist
      ? '<button class="chip chip-artist" aria-pressed="true" data-clear="1">' + esc(artistById(activeArtist).name) + ' ×</button>'
      : '');
    var items = WORK.filter(function (w) {
      return (activeArtist ? w.artist === activeArtist : (activeStyle === 'All' || w.style === activeStyle));
    });
    $('#workCount').textContent = items.length + ' piece' + (items.length === 1 ? '' : 's');
    var spans = layout(items.length);
    $('#workGrid').innerHTML = items.map(function (w, i) {
      var a = artistById(w.artist), sp = spans[i];
      return '<button class="piece" style="--c:' + sp[0] + ';--r:' + sp[1] + ';--mc:' + sp[2] + ';--mr:' + sp[3] + '" data-src="' + esc(w.src) + '" data-cap="' + esc(w.caption + ' — ' + a.name) + '">' +
        '<img src="' + esc(w.src) + '" alt="' + esc(w.style + ' tattoo by ' + a.name + ', ' + w.caption.toLowerCase()) + '" loading="lazy">' +
        '<span class="piece-cap"><b>' + esc(a.name) + '</b>' + esc(w.style) + '</span></button>';
    }).join('') || '<p class="empty">No pieces yet. Ask about this artist\'s portfolio in your request.</p>';
  }

  $('#styleChips').addEventListener('click', function (e) {
    var c = e.target.closest('.chip'); if (!c) return;
    if (c.hasAttribute('data-clear')) activeArtist = null;
    else { activeArtist = null; activeStyle = c.getAttribute('data-style'); }
    renderLedger(); renderWork();
  });

  var lb = $('#lightbox');
  $('#workGrid').addEventListener('click', function (e) {
    var p = e.target.closest('.piece'); if (!p) return;
    $('#lbImg').src = p.getAttribute('data-src');
    $('#lbImg').alt = $('img', p).alt;
    $('#lbCap').textContent = p.getAttribute('data-cap');
    if (lb.showModal) lb.showModal(); else lb.setAttribute('open', '');
  });
  $('#lbClose').addEventListener('click', function () { lb.close(); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });

  // ---- Flash wall -----------------------------------------------------------
  var claimed = store.get('claimed', []);
  var isClaimed = function (f) { return f.claimed || claimed.indexOf(f.id) !== -1; };

  function renderFlash() {
    var only = $('#availOnly').checked;
    $('#flashSheet').innerHTML = FLASH.filter(function (f) { return !only || !isClaimed(f); }).map(function (f, i) {
      var gone = isClaimed(f);
      return '<article class="flash-card' + (gone ? ' is-claimed' : '') + '" style="--r:' + ((i * 37) % 7 - 3) * 0.6 + 'deg">' +
        '<svg viewBox="0 0 100 120" role="img" aria-label="' + esc(f.title) + ' flash design">' + (window.FLASH_ART[f.art] || '') + '</svg>' +
        '<div class="flash-meta"><h3>' + esc(f.title) + '</h3><span>' + esc(f.size) + ' · ' + esc(artistById(f.artist).name.split(' ')[0]) + '</span></div>' +
        '<div class="flash-buy"><b>' + money(f.price) + '</b>' +
        (gone ? '<span class="stamp">Claimed</span>' : '<button class="claim" data-id="' + f.id + '">Claim</button>') +
        '</div></article>';
    }).join('');
  }

  $('#availOnly').addEventListener('change', renderFlash);
  $('#flashSheet').addEventListener('click', function (e) {
    var b = e.target.closest('.claim'); if (!b) return;
    var f = FLASH.find(function (x) { return x.id === b.getAttribute('data-id'); });
    $('input[name=kind][value=flash]').checked = true;
    $('#flashSel').value = f.id;
    $('#artistSel').value = f.artist;
    syncKind();
    toast(f.title + ' is held on your request. Fill in the slip to claim it.');
    document.getElementById('book').scrollIntoView({ behavior: 'smooth' });
  });

  // ---- Booking ----------------------------------------------------------------
  var form = $('#bookForm');
  var placement = 'forearm';

  $('#pricing').innerHTML = PRICING.rules.map(function (r) { return '<li><span>' + esc(r[0]) + '</span><b>' + esc(r[1]) + '</b></li>'; }).join('');

  $('#artistSel').innerHTML = '<option value="">First available</option>' + ARTISTS.map(function (a) {
    return '<option value="' + a.id + '"' + (a.status === 'closed' ? ' disabled' : '') + '>' + esc(a.name) +
      (a.status === 'open' ? '' : ' (' + STATUS[a.status].toLowerCase() + ')') + '</option>';
  }).join('');

  function renderFlashOptions() {
    $('#flashSel').innerHTML = FLASH.filter(function (f) { return !isClaimed(f); }).map(function (f) {
      return '<option value="' + f.id + '">' + esc(f.title) + ' — ' + money(f.price) + '</option>';
    }).join('');
  }

  $('#placeChips').innerHTML = PLACEMENTS.map(function (p) {
    return '<button type="button" class="chip" data-place="' + p.id + '" aria-pressed="' + (p.id === placement) + '">' + esc(p.label) + '</button>';
  }).join('');
  $('#placeChips').addEventListener('click', function (e) {
    var c = e.target.closest('.chip'); if (!c) return;
    placement = c.getAttribute('data-place');
    $$('.chip', $('#placeChips')).forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
    updateEstimate();
  });

  var kind = function () { return $('input[name=kind]:checked').value; };
  function syncKind() {
    var flash = kind() === 'flash';
    $('#flashPick').hidden = !flash;
    $('#size').disabled = flash;
    updateEstimate();
  }

  function estimate() {
    var a = artistById($('#artistSel').value);
    if (kind() === 'flash') {
      var f = FLASH.find(function (x) { return x.id === $('#flashSel').value; });
      if (!f) return null;
      return { hours: '1–2 hrs', price: money(f.price) + ' fixed', deposit: money(PRICING.deposit) };
    }
    var size = +$('#size').value;
    var pf = PLACEMENTS.find(function (p) { return p.id === placement; }).factor;
    var ink = $('input[name=ink]:checked').value === 'color' ? 1.25 : 1;
    var cover = kind() === 'coverup' ? 1.4 : 1;
    var hrs = Math.max(1, 0.25 + size * 0.42 * pf * ink * cover);
    var rate = a ? a.rate : 160;
    var lo = Math.max(PRICING.minimum, hrs * 0.85 * rate), hi = Math.max(PRICING.minimum + 40, hrs * 1.2 * rate);
    var hLo = Math.max(1, Math.floor(hrs * 0.85 * 2) / 2), hHi = Math.ceil(hrs * 1.2 * 2) / 2;
    var sessions = hHi > 6 ? ' · ' + Math.ceil(hHi / 5) + ' sessions' : '';
    return {
      hours: (hLo === hHi ? hLo : hLo + '–' + hHi) + ' hrs' + sessions,
      price: money(Math.round(lo / 10) * 10) + '–' + money(Math.round(hi / 10) * 10),
      deposit: money(PRICING.deposit),
    };
  }

  function updateEstimate() {
    var s = +$('#size').value;
    $('#sizeOut').textContent = kind() === 'flash' ? 'as drawn' : s + (s === 1 ? ' inch' : ' inches');
    var est = estimate() || { hours: '—', price: '—', deposit: '—' };
    $('#estHours').textContent = est.hours;
    $('#estPrice').textContent = est.price;
    $('#estDeposit').textContent = est.deposit;
  }

  form.addEventListener('input', updateEstimate);
  $$('input[name=kind]').forEach(function (r) { r.addEventListener('change', syncKind); });
  $('#when').min = new Date().toISOString().slice(0, 10);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = '';
    if (!$('#fname').value.trim()) err = 'Add your name so we know who to write back to.';
    else if (!/^\S+@\S+\.\S+$/.test($('#email').value.trim())) err = 'Add an email we can reach you on.';
    else if (kind() !== 'flash' && $('#idea').value.trim().length < 8) err = 'Tell us a little about the idea (a sentence is plenty).';
    else if (kind() === 'flash' && !$('#flashSel').value) err = 'Pick a flash design, or switch to custom.';
    else if (!$('#adult').checked) err = 'We can only tattoo clients who are 18 or older.';
    $('#formError').textContent = err;
    if (err) return;

    var a = artistById($('#artistSel').value);
    var f = kind() === 'flash' ? FLASH.find(function (x) { return x.id === $('#flashSel').value; }) : null;
    var est = estimate();
    var list = store.get('requests', []);
    var ref = 'MM-' + String(Date.now()).slice(-5);
    list.unshift({
      ref: ref,
      what: f ? f.title + ' (flash)' : (kind() === 'coverup' ? 'Cover-up' : 'Custom') + ', ' + $('#size').value + ' in, ' + PLACEMENTS.find(function (p) { return p.id === placement; }).label.toLowerCase(),
      artist: a ? a.name : 'First available',
      price: est.price,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
    store.set('requests', list.slice(0, 6));
    if (f) {
      claimed.push(f.id);
      store.set('claimed', claimed);
      renderFlash(); renderFlashOptions();
      $('input[name=kind][value=custom]').checked = true;
    }
    form.reset();
    placement = 'forearm';
    $$('.chip', $('#placeChips')).forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-place') === placement)); });
    syncKind();
    renderReceipts();
    toast('Request ' + ref + ' sent. We reply within 3 working days.');
  });

  function renderReceipts() {
    var list = store.get('requests', []);
    $('#receipts').hidden = !list.length;
    $('#receiptList').innerHTML = list.map(function (r) {
      return '<li><b>' + esc(r.ref) + '</b><span>' + esc(r.what) + ' · ' + esc(r.artist) + '</span><span>' + esc(r.price) + ' · sent ' + esc(r.date) + '</span><em>Awaiting reply</em></li>';
    }).join('');
  }

  // ---- Aftercare --------------------------------------------------------------
  function renderCare() {
    var day = +$('#careRange').value, stage = AFTERCARE[0];
    AFTERCARE.forEach(function (s) { if (day >= s.from) stage = s; });
    $('#careNum').textContent = day;
    $('#careOut').textContent = day;
    $('#careHead').textContent = stage.title;
    $('#careList').innerHTML = stage.items.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    $('#careRange').style.setProperty('--p', ((day - 1) / 29 * 100) + '%');
  }
  $('#careRange').addEventListener('input', renderCare);

  // ---- FAQ ----------------------------------------------------------------------
  $('#faqList').innerHTML = FAQ.map(function (q, i) {
    return '<details' + (i === 0 ? ' open' : '') + '><summary><span>' + String(i + 1).padStart(2, '0') + '</span>' + esc(q[0]) + '</summary><p>' + esc(q[1]) + '</p></details>';
  }).join('');

  // ---- Mobile menu ---------------------------------------------------------------
  var menuBtn = $('#menuBtn');
  menuBtn.addEventListener('click', function () {
    var open = document.body.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.textContent = open ? 'Close' : 'Menu';
  });
  $('#nav').addEventListener('click', function (e) {
    if (!e.target.closest('a')) return;
    document.body.classList.remove('menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.textContent = 'Menu';
  });

  renderLedger(); renderWork(); renderFlash(); renderFlashOptions(); syncKind(); renderReceipts(); renderCare();
})();
