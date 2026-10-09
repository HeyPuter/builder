// Page content lives here as data so it is easy to find and change.
//
// Each project shows in the typewriter index and as a card. Its `cover` is a
// drawn placeholder (one of: record, kiln, poster, spheres, books, field).
// Give a project an `image` (a file path or URL) to show real work instead.

const PROJECTS = [
    {
        id: 'hearth', title: 'Hearth Records', category: 'Music',
        summary: 'A label identity built around one red circle and a lot of warm noise.',
        blurb: 'Identity for an independent folk label. The red label circle is the whole logo, so it works on a sleeve, a sticker and a 16px favicon.',
        specs: [['Format', '12" sleeve, 310 × 310 mm'], ['Print', 'Offset, Pantone 485 C + black'], ['Year', '2025']],
        cover: { kind: 'record', label: 'Hearth Records', note: 'Side A · 33⅓ RPM' },
        alt: 'Black vinyl record with a red label reading Hearth Records',
    },
    {
        id: 'kiln', title: 'Kiln Ceramics', category: 'Brand',
        summary: 'Wordmark, packaging and glaze cards for a two-person pottery studio.',
        blurb: 'A lowercase serif wordmark and a set of pot silhouettes that double as packaging stamps.',
        specs: [['Format', 'Boxes, labels, glaze cards'], ['Print', 'Rubber stamp on kraft, 350 gsm'], ['Year', '2024']],
        cover: { kind: 'kiln', word: 'kiln', note: 'Est. 2019 · Caldas da Rainha' },
        alt: 'Orange cover with the wordmark kiln and three pot silhouettes',
    },
    {
        id: 'line28', title: 'Line 28', category: 'Poster',
        summary: 'A series of transit posters for the city\'s oldest tram route.',
        blurb: 'Twelve posters, one per stop, using only the tram\'s own yellow and the red of the route number.',
        specs: [['Format', 'A1, 594 × 841 mm'], ['Print', 'Screen print, 2 colours'], ['Year', '2023']],
        cover: { kind: 'poster', number: '28', note: 'Martim Moniz → Prazeres' },
        alt: 'Yellow poster with a huge red number 28 above black hazard stripes',
    },
    {
        id: 'soft', title: 'Soft Objects', category: '3D',
        summary: 'Personal render series about fruit, wax and light.',
        blurb: 'An ongoing study of subsurface scattering. Each piece is one object, one light and no post-processing.',
        specs: [['Format', '3000 × 3750 px stills'], ['Tools', 'Blender, Cycles, 4096 samples'], ['Year', '2022 – now']],
        cover: { kind: 'spheres', note: 'Render 07 / 12' },
        alt: 'Two glossy rendered spheres, red and green, on a pastel gradient',
    },
    {
        id: 'press', title: 'Small Hours Press', category: 'Editorial',
        summary: 'Cover system for a poetry imprint, 14 titles so far.',
        blurb: 'A cover grid where only the title and one colour change, so the shelf reads as a single series.',
        specs: [['Format', 'B-format, 129 × 198 mm'], ['Print', 'Riso, Munken Pure 150 gsm'], ['Year', '2021 – 2025']],
        cover: { kind: 'books', titles: ['Late Light', 'Salt Year', 'Low Tide'] },
        alt: 'Three book covers in cream, red and sand on a black ground',
    },
    {
        id: 'field', title: 'Field Notes Fest', category: 'Event',
        summary: 'Identity for a three-day outdoor music festival.',
        blurb: 'A blurred poppy field shot low in the grass became the whole look. Signage, wristbands and a 40-page programme.',
        specs: [['Format', 'Posters, signage, programme'], ['Print', 'CMYK offset, uncoated'], ['Year', '2025']],
        cover: { kind: 'field', word: 'field notes', note: '12 – 14 June' },
        alt: 'Poster with red serif text over a blurred field of poppies',
    },
];

// The projects dealt onto the hero as printed proofs, back to front.
const HERO_PROOFS = ['line28', 'kiln', 'hearth', 'field'];

const SERVICES = [
    {
        title: 'Graphic design',
        items: [['Brand identity', '4 – 8 weeks'], ['Posters and print campaigns', '2 – 4 weeks'], ['Packaging and labels', '3 – 6 weeks'], ['Editorial and book covers', 'per title']],
        tools: ['Illustrator', 'InDesign', 'Figma', 'Glyphs'],
    },
    {
        title: '3D',
        items: [['Product and packaging renders', '1 – 3 weeks'], ['Art direction stills', '1 – 2 weeks'], ['Short loops for social', '6 – 15 s'], ['Type in 3D', 'per piece']],
        tools: ['Blender', 'Cinema 4D', 'Redshift', 'Substance'],
    },
];

const HISTORY = [
    { years: '2023 – now', role: 'Independent', detail: 'identity, print, 3D', place: 'Lisbon' },
    { years: '2021 – 2023', role: 'Designer', detail: 'Atelier Norte', place: 'Porto' },
    { years: '2019 – 2021', role: 'Junior designer', detail: 'Casa Tipo', place: 'Lisbon' },
    { years: '2015 – 2019', role: 'BA Communication Design', detail: '', place: 'Lisbon' },
];

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
}

// Drawn placeholder covers, one builder per kind.
const COVERS = {
    record(c, cover) {
        const disc = el('div', 'disc');
        const label = el('div', 'lbl');
        label.append(...splitWords(cover.label));
        disc.append(label);
        c.append(disc, el('span', 'side', cover.note));
    },
    kiln(c, cover) {
        const pots = el('div', 'pots');
        pots.append(el('i'), el('i'), el('i'));
        c.append(el('small', '', cover.note), el('b', '', cover.word), pots);
    },
    poster(c, cover) {
        const stripes = el('div', 'stripes');
        stripes.append(el('span', '', cover.note));
        c.append(el('div', 'num', cover.number), stripes);
    },
    spheres(c, cover) {
        c.append(el('span', '', cover.note), el('i'), el('i'), el('i'));
    },
    books(c, cover) {
        for (const title of cover.titles) {
            const book = el('div', 'book');
            book.append(...splitWords(title), el('small', '', 'Poems'));
            c.append(book);
        }
    },
    field(c, cover) {
        const canvas = el('canvas');
        canvas.dataset.field = '';
        canvas.setAttribute('aria-hidden', 'true');
        const word = el('div', 't');
        word.append(...splitWords(cover.word));
        c.append(canvas, word, el('div', 'd', cover.note));
    },
};

// "Late Light" -> Late<br>Light, without touching innerHTML.
function splitWords(text) {
    return String(text).split(' ').flatMap((w, i) => (i ? [document.createElement('br'), w] : [w]));
}

function renderIndex() {
    const root = document.getElementById('project-index');
    root.replaceChildren(...PROJECTS.map(p => {
        const li = el('li');
        const dots = el('div', 'dots');
        dots.append(el('i'), el('i'), el('i'));
        const h = el('h3');
        const link = el('a', '', p.title);
        link.href = `#${p.id}`;
        h.append(link);
        li.append(dots, el('span', 'chip', p.category), h, el('p', '', p.summary));
        return li;
    }));
    document.getElementById('issue-count').textContent = String(PROJECTS.length).padStart(2, '0');
}

// A project's image, or its drawn placeholder cover.
function renderCover(p) {
    const cover = el('div', `cover cv-${p.cover ? p.cover.kind : 'image'}`);
    if (p.image) {
        const img = el('img');
        img.src = p.image;
        img.alt = p.alt || p.title;
        cover.append(img);
    } else if (p.cover && COVERS[p.cover.kind]) {
        cover.setAttribute('role', 'img');
        cover.setAttribute('aria-label', p.alt || p.title);
        COVERS[p.cover.kind](cover, p.cover);
    }
    return cover;
}

function renderHeroProofs() {
    const root = document.getElementById('hero-proofs');
    const proofs = HERO_PROOFS.map(id => PROJECTS.find(p => p.id === id)).filter(Boolean).map((p, i) => {
        const link = el('a', 'proof');
        link.href = `#${p.id}`;
        const fig = el('figure');
        fig.style.margin = '0';
        const caption = el('figcaption');
        caption.append(el('span', '', `Fig. ${i + 1}  ${p.title}`), el('span', '', p.category));
        fig.append(renderCover(p), caption);
        link.append(fig);
        return link;
    });
    root.prepend(...proofs);
}

function renderProjects() {
    const root = document.getElementById('project-grid');
    root.replaceChildren(...PROJECTS.map(p => {
        const card = el('article', 'card');
        card.id = p.id;
        const cover = renderCover(p);

        const specs = el('dl', 'spec');
        for (const [label, value] of p.specs) specs.append(el('dt', '', label), el('dd', '', value));

        card.append(cover, el('h3', '', p.title), el('p', 'blurb', p.blurb), specs);
        return card;
    }));
}

function renderServices() {
    const root = document.getElementById('caps');
    root.replaceChildren(...SERVICES.map(s => {
        const col = el('div', 'cap');
        const list = el('ul');
        for (const [name, time] of s.items) {
            const li = el('li');
            li.append(el('span', '', name), el('span', '', time));
            list.append(li);
        }
        const tools = el('div', 'tools');
        tools.append(...s.tools.map(t => el('span', '', t)));
        col.append(el('h3', '', s.title), list, tools);
        return col;
    }));
}

function renderHistory() {
    const root = document.getElementById('timeline');
    root.replaceChildren(...HISTORY.map(h => {
        const li = el('li');
        const role = el('span', 'role');
        role.append(el('b', '', h.role));
        if (h.detail) role.append(` · ${h.detail}`);
        li.append(el('span', 'yr', h.years), role, el('span', 'where', h.place));
        return li;
    }));
}

// Seeded random, so the field covers look the same on every load.
function rng(seed) {
    return () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };
}

// A blurred field of poppies and grass, drawn with soft radial blobs that
// get bigger toward the bottom, like a photo shot low with a shallow focus.
function paintField(canvas, seed, horizon) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const r = rng(seed);

    const ground = ctx.createLinearGradient(0, h * horizon, 0, h);
    ground.addColorStop(0, 'rgba(251,250,246,0)');
    ground.addColorStop(0.35, 'rgba(214,214,150,.55)');
    ground.addColorStop(1, 'rgba(160,172,82,.95)');
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, w, h);

    const petals = ['232,88,42', '240,122,58', '212,42,31', '246,160,90'];
    const stems = ['118,138,60', '96,120,52', '150,160,80'];
    const count = Math.round(w * h / 2600);
    for (let i = 0; i < count; i++) {
        const y = h * horizon + Math.pow(r(), 0.6) * h * (1 - horizon) + (r() - 0.5) * 40;
        const x = r() * w;
        const depth = (y - h * horizon) / (h * (1 - horizon));
        const flower = r() < 0.55;
        const size = (flower ? 6 : 4) + depth * (flower ? 22 : 12) * (0.5 + r());
        const color = flower ? petals[(r() * petals.length) | 0] : stems[(r() * stems.length) | 0];
        const alpha = (flower ? 0.55 : 0.35) * Math.min(1, depth + 0.25);
        const blob = ctx.createRadialGradient(x, y, 0, x, y, size);
        blob.addColorStop(0, `rgba(${color},${alpha})`);
        blob.addColorStop(0.55, `rgba(${color},${alpha * 0.6})`);
        blob.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = blob;
        ctx.beginPath();
        ctx.ellipse(x, y, size, size * (flower ? 0.8 : 1.6), 0, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Every field cover, including the copy dealt onto the hero.
function paintFields() {
    document.querySelectorAll('canvas[data-field]').forEach(c => paintField(c, 77, 0.35));
}

function setupCopyEmail() {
    const button = document.getElementById('copy-email');
    const email = document.getElementById('email');
    const selectEmail = () => {
        const range = document.createRange();
        range.selectNodeContents(email);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        button.textContent = 'Selected, press Ctrl+C';
    };
    button.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(email.textContent.trim());
            button.textContent = 'Copied';
        } catch {
            selectEmail();
        }
        setTimeout(() => { button.textContent = 'Copy email'; }, 2200);
    });
}

renderHeroProofs();
renderIndex();
renderProjects();
renderServices();
renderHistory();
paintFields();
setupCopyEmail();
document.getElementById('year').textContent = new Date().getFullYear();

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(paintFields, 150);
});
