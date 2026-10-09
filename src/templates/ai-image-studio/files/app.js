import { createIcons, icons } from 'https://cdn.jsdelivr.net/npm/lucide@latest/+esm';

// Images are generated with Puter's AI and saved per user: the image files in
// their own Puter storage (under this app's folder), and the list of what was
// made, with each prompt and its settings, in their key-value store. Each
// person signs in with Puter, so their storage and AI usage are their own.
const STORE_KEY = 'image-studio:images';
const SETTINGS_KEY = 'image-studio:settings';
const IMAGE_DIR = 'images';
const MAX_IMAGES = 150;        // the oldest are removed beyond this
const MAX_PARALLEL = 3;        // generations allowed to run at once
const MODEL = 'gpt-image-2';   // see https://docs.puter.com/AI/txt2img/

// A style adds its words to the end of the prompt.
const STYLES = [
    { id: 'none', label: 'None', swatch: 'from-zinc-600 to-zinc-800', words: '' },
    { id: 'photo', label: 'Photo', swatch: 'from-amber-200 via-orange-300 to-sky-600', words: 'Photorealistic photograph, natural light, 35mm lens, sharp focus, rich detail.' },
    { id: 'cinematic', label: 'Cinematic', swatch: 'from-teal-600 via-cyan-900 to-orange-500', words: 'Cinematic film still, dramatic lighting, shallow depth of field, anamorphic lens, color graded.' },
    { id: 'anime', label: 'Anime', swatch: 'from-pink-300 via-fuchsia-300 to-indigo-400', words: 'Anime illustration, clean line art, vibrant cel shading, expressive, studio quality.' },
    { id: '3d', label: '3D', swatch: 'from-violet-500 via-indigo-400 to-cyan-300', words: 'Stylized 3D render, soft global illumination, smooth materials, playful and polished.' },
    { id: 'watercolor', label: 'Watercolor', swatch: 'from-rose-200 via-amber-100 to-emerald-200', words: 'Delicate watercolor painting, soft washes, visible paper texture, loose brushwork.' },
    { id: 'pixel', label: 'Pixel art', swatch: 'from-lime-400 via-emerald-500 to-blue-700', words: '16-bit pixel art, limited palette, crisp pixels, retro video game look.' },
    { id: 'line', label: 'Line art', swatch: 'from-zinc-100 to-zinc-400', words: 'Minimal black ink line drawing on white paper, elegant continuous lines, no shading.' },
];

const RATIOS = [
    { id: '1:1', label: 'Square', w: 1, h: 1 },
    { id: '3:4', label: 'Portrait', w: 3, h: 4 },
    { id: '4:3', label: 'Landscape', w: 4, h: 3 },
    { id: '16:9', label: 'Wide', w: 16, h: 9 },
];

const QUALITIES = [
    { id: 'low', label: 'Fast', hint: 'Quickest. Good for trying out ideas.' },
    { id: 'medium', label: 'Balanced', hint: 'More detail, and takes a little longer.' },
    { id: 'high', label: 'Best', hint: 'The finest detail. Slowest, and uses the most AI credits.' },
];

// Shown on an empty gallery. Picking one fills in the form.
const IDEAS = [
    { title: 'Cozy reading nook', style: 'photo', ratio: '3:4', prompt: 'A cozy reading nook by a rainy window, warm lamp light, stacks of books and a sleeping orange cat on the cushion' },
    { title: 'Floating islands', style: '3d', ratio: '16:9', prompt: 'Tiny floating islands connected by rope bridges above the clouds, waterfalls spilling into the sky, golden hour' },
    { title: 'Night market', style: 'anime', ratio: '4:3', prompt: 'A bustling night market in a hillside town, paper lanterns, steam rising from food stalls, friends sharing snacks' },
];

const SURPRISES = [
    'A lighthouse keeper’s kitchen at dawn, copper pots, sea fog against the window, fresh bread on the table',
    'An astronaut tending a greenhouse garden on Mars, glowing grow lights, red dust outside the glass',
    'A fox in a knitted scarf reading a map in a snowy birch forest',
    'A retro diner on the moon, neon signs, Earth rising behind the counter',
    'A tiny dragon curled up asleep in a teacup on a stack of old books',
    'A sunlit Mediterranean alley with bougainvillea, a blue door and a bicycle leaning on the wall',
    'A koi pond seen from above, autumn leaves drifting on the water',
    'A cozy treehouse library at dusk, fairy lights, rope ladders, a telescope on the balcony',
    'A vintage travel poster for a city built on the back of a giant turtle',
    'A robot barista making latte art in a busy little café',
    'A field of glowing mushrooms in a misty forest at night, fireflies everywhere',
    'A minimalist mountain cabin in deep snow under the northern lights',
];

const ENHANCE_INSTRUCTIONS = 'You rewrite prompts for an AI image generator. Keep the person’s idea and subject, and add concrete visual detail: setting, composition, lighting, colors and mood. Do not name an art style or medium unless they did; a style is chosen separately. Reply with the rewritten prompt only: one paragraph, under 70 words, no quotes and no preamble.';

const $ = (id) => document.getElementById(id);
const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const state = {
    images: [],              // saved images, newest first
    pending: [],             // generations in progress or failed
    urls: new Map(),         // image id -> object URL of its bytes
    nodes: new Map(),        // image or job id -> its card element
    settings: { style: 'none', ratio: '1:1', quality: 'low' },
    query: '',
    viewingId: null,
    session: 0,              // bumped on sign-out, so late results are dropped
    columns: 0,
};

const styleOf = (id) => STYLES.find(s => s.id === id) || STYLES[0];
const ratioOf = (id) => RATIOS.find(r => r.id === id) || RATIOS[0];
const qualityOf = (id) => QUALITIES.find(q => q.id === id) || QUALITIES[0];

function newId() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function icon(name, className = 'h-4 w-4') {
    const i = el('i', className);
    i.setAttribute('data-lucide', name);
    return i;
}

// ---- Storage ---------------------------------------------------------------

async function loadImages() {
    try {
        const raw = await puter.kv.get(STORE_KEY);
        const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
        state.images = Array.isArray(list) ? list.filter(i => i && i.id && i.file) : [];
    } catch (e) {
        state.images = [];
    }
}

async function loadSettings() {
    try {
        const raw = await puter.kv.get(SETTINGS_KEY);
        const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (s && typeof s === 'object') {
            state.settings = {
                style: styleOf(s.style).id,
                ratio: ratioOf(s.ratio).id,
                quality: qualityOf(s.quality).id,
            };
        }
    } catch (e) { /* the defaults will do */ }
}

// Writes run one after another, each with the list as it was when asked for,
// so a slow write can never land after a newer one.
let writes = Promise.resolve();
function saveImages() {
    const list = state.images.filter(i => !i.unsaved).map(({ unsaved, ...rest }) => rest);
    writes = writes
        .then(() => puter.kv.set(STORE_KEY, JSON.stringify(list)))
        .catch(() => toast('Your gallery could not be saved. It will try again on your next change.', { tone: 'error' }));
    return writes;
}

let settingsTimer = null;
function saveSettings() {
    clearTimeout(settingsTimer);
    settingsTimer = setTimeout(() => {
        puter.kv.set(SETTINGS_KEY, JSON.stringify(state.settings)).catch(() => { /* a preference, not data */ });
    }, 500);
}

// An image's bytes, as an object URL, read from storage the first time it
// is needed.
async function imageUrl(image) {
    if (state.urls.has(image.id)) return state.urls.get(image.id);
    const blob = await puter.fs.read(image.file);
    const url = URL.createObjectURL(blob);
    state.urls.set(image.id, url);
    return url;
}

function forget(image) {
    const url = state.urls.get(image.id);
    if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
    state.urls.delete(image.id);
    dropNode(image.id);
}

// Cards are kept between renders, so images do not reload or fade in again.
function dropNode(id) {
    const node = state.nodes.get(id);
    if (!node) return;
    state.nodes.delete(id);
    if (waiting.delete(node)) lazy.unobserve(node);
}

// ---- Generating ------------------------------------------------------------

function fullPrompt(job) {
    const words = styleOf(job.style).words;
    return words ? `${job.prompt}\n\n${words}` : job.prompt;
}

function running() {
    return state.pending.filter(j => !j.error).length;
}

// What went wrong, in words, and whether trying the same prompt again could help.
function friendlyError(e) {
    const err = (e && e.error) || e || {};
    const code = err.errorCode || err.code || (e && (e.errorCode || e.code)) || '';
    const message = String(err.message || (e && e.message) || '');
    if (code === 'moderation_flagged' || /moderation|safety/i.test(message)) {
        return { text: 'The image filter turned this prompt down. Try describing it differently.', retry: false };
    }
    if (code === 'insufficient_funds') return { text: 'Your Puter account is out of AI credits for now.', retry: false };
    return { text: 'This image could not be created. Please try again.', retry: true };
}

async function measure(blob) {
    try {
        const bitmap = await createImageBitmap(blob);
        const size = { width: bitmap.width, height: bitmap.height };
        bitmap.close();
        return size;
    } catch (e) {
        return null;
    }
}

const EXTENSIONS = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg' };

async function runJob(job) {
    const session = state.session;
    const ratio = ratioOf(job.ratio);
    try {
        const result = await puter.ai.txt2img(fullPrompt(job), {
            model: MODEL,
            quality: job.quality,
            ratio: { w: ratio.w, h: ratio.h },
        });
        if (session !== state.session) return;

        const image = {
            id: job.id, prompt: job.prompt, style: job.style, ratio: job.ratio, quality: job.quality,
            width: ratio.w, height: ratio.h, createdAt: Date.now(), file: '',
        };
        let blob = null;
        try { blob = await (await fetch(result.src)).blob(); } catch (e) { /* kept for this visit only */ }

        if (blob && blob.size) {
            const size = await measure(blob);
            if (size) Object.assign(image, size);
            image.file = `${IMAGE_DIR}/${job.id}.${EXTENSIONS[blob.type] || 'png'}`;
            state.urls.set(image.id, URL.createObjectURL(blob));
            try {
                await puter.fs.write(image.file, blob, { createMissingParents: true });
            } catch (e) {
                image.unsaved = true;
            }
        } else {
            state.urls.set(image.id, result.src);
            image.unsaved = true;
        }
        if (session !== state.session) return;

        state.pending = state.pending.filter(j => j !== job);
        dropNode(job.id);
        state.images.unshift(image);
        pruneImages();
        if (image.unsaved) toast('This image could not be saved to your storage. Download it to keep it.', { tone: 'error', duration: 7000 });
        else saveImages();
        announce('Your image is ready.');
    } catch (e) {
        if (session !== state.session) return;
        job.error = friendlyError(e);
        dropNode(job.id);
    }
    render();
    updateGenerate();
}

function pruneImages() {
    const saved = state.images.filter(i => !i.unsaved);
    if (saved.length <= MAX_IMAGES) return;
    const drop = new Set(saved.slice(MAX_IMAGES));
    state.images = state.images.filter(i => !drop.has(i));
    for (const image of drop) {
        forget(image);
        puter.fs.delete(image.file).catch(() => { /* already gone */ });
    }
}

function generate() {
    const prompt = $('prompt').value.trim();
    $('form-error').textContent = '';
    if (!prompt) {
        $('form-error').textContent = 'Describe the image you want first.';
        $('prompt').focus();
        return;
    }
    if (running() >= MAX_PARALLEL) return;
    const job = { id: newId(), prompt, ...state.settings, startedAt: Date.now() };
    state.pending.unshift(job);
    render();
    const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    if (wide.matches) $('gallery-pane').scrollTo({ top: 0, behavior });
    else $('gallery-pane').scrollIntoView({ block: 'start', behavior });
    updateGenerate();
    runJob(job);
}

function retry(job) {
    job.error = null;
    job.startedAt = Date.now();
    dropNode(job.id);
    render();
    updateGenerate();
    runJob(job);
}

function dismiss(job) {
    state.pending = state.pending.filter(j => j !== job);
    dropNode(job.id);
    render();
    updateGenerate();
}

function updateGenerate() {
    const busy = running();
    const full = busy >= MAX_PARALLEL;
    $('generate').disabled = full;
    $('generate-label').textContent = full ? `${busy} images in progress` : busy ? `Generate another` : 'Generate';
}

// ---- Prompt helpers ----------------------------------------------------------

function textOf(response) {
    const content = response && response.message ? response.message.content : response;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map(p => (p && p.text) || '').join('');
    return String(response || '');
}

let enhancing = false;
async function enhance() {
    const before = $('prompt').value.trim();
    if (!before) {
        $('form-error').textContent = 'Write a few words first, and Enhance will build on them.';
        $('prompt').focus();
        return;
    }
    if (enhancing) return;
    enhancing = true;
    $('enhance').disabled = true;
    $('enhance').querySelector('span').textContent = 'Enhancing…';
    $('prompt').readOnly = true;
    try {
        const response = await puter.ai.chat([
            { role: 'system', content: ENHANCE_INSTRUCTIONS },
            { role: 'user', content: before },
        ]);
        const after = textOf(response).trim().replace(/^["“']+|["”']+$/g, '').slice(0, 1000);
        if (after && $('prompt').value.trim() === before) {
            setPrompt(after);
            toast('Prompt enhanced.', { action: 'Undo', onAction: () => setPrompt(before) });
        }
    } catch (e) {
        toast('Enhance is not available right now. Please try again.', { tone: 'error' });
    }
    enhancing = false;
    $('enhance').disabled = false;
    $('enhance').querySelector('span').textContent = 'Enhance';
    $('prompt').readOnly = false;
}

let lastSurprise = -1;
function surprise() {
    let i;
    do { i = Math.floor(Math.random() * SURPRISES.length); } while (i === lastSurprise && SURPRISES.length > 1);
    lastSurprise = i;
    setPrompt(SURPRISES[i]);
    $('prompt').focus();
}

function setPrompt(text) {
    $('prompt').value = text;
    updateCount();
    $('form-error').textContent = '';
}

function updateCount() {
    $('count').textContent = `${$('prompt').value.length} / 1000`;
}

// Fill the form from an earlier image or an idea.
function useSettings({ prompt, style, ratio, quality }) {
    setPrompt(prompt);
    state.settings = {
        style: styleOf(style).id,
        ratio: ratioOf(ratio).id,
        quality: quality ? qualityOf(quality).id : state.settings.quality,
    };
    syncChoices();
    saveSettings();
    $('prompt').focus();
    $('prompt').setSelectionRange(prompt.length, prompt.length);
}

// ---- Form controls -----------------------------------------------------------

function choice(group, value, checked, content, spanClass) {
    const label = el('label', 'choice relative block cursor-pointer');
    const input = el('input', 'peer');
    input.type = 'radio';
    input.name = group;
    input.value = value;
    input.checked = checked;
    const span = el('span', spanClass);
    span.append(...content);
    label.append(input, span);
    return label;
}

function renderControls() {
    $('styles').replaceChildren(...STYLES.map(s => choice('style', s.id, s.id === state.settings.style, [
        el('span', `block h-10 w-full rounded-lg bg-gradient-to-br ${s.swatch} ring-1 ring-inset ring-white/10`),
        el('span', 'mt-1 block truncate text-center text-[11px] font-medium', s.label),
    ], 'block rounded-xl p-1 text-zinc-400 hover:text-zinc-200 peer-checked:bg-white/10 peer-checked:text-white peer-checked:ring-1 peer-checked:ring-white/25')));

    $('ratios').replaceChildren(...RATIOS.map(r => {
        const scale = 14 / Math.max(r.w, r.h);
        const shape = el('span', 'block rounded-[3px] border-[1.5px] border-current');
        shape.style.width = `${Math.round(r.w * scale)}px`;
        shape.style.height = `${Math.round(r.h * scale)}px`;
        const box = el('span', 'flex h-4 items-center justify-center');
        box.append(shape);
        return choice('ratio', r.id, r.id === state.settings.ratio, [box, el('span', 'text-[11px] font-medium', r.label)],
            'flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-zinc-400 hover:text-zinc-200 peer-checked:bg-white/10 peer-checked:text-white');
    }));

    $('qualities').replaceChildren(...QUALITIES.map(q => choice('quality', q.id, q.id === state.settings.quality,
        [document.createTextNode(q.label)],
        'block rounded-lg px-2 py-1.5 text-center text-sm font-medium text-zinc-400 hover:text-zinc-200 peer-checked:bg-white/10 peer-checked:text-white')));
    $('quality-hint').textContent = qualityOf(state.settings.quality).hint;
}

function syncChoices() {
    for (const [group, value] of Object.entries({ style: state.settings.style, ratio: state.settings.ratio, quality: state.settings.quality })) {
        const input = document.querySelector(`input[name="${group}"][value="${CSS.escape(value)}"]`);
        if (input) input.checked = true;
    }
    $('quality-hint').textContent = qualityOf(state.settings.quality).hint;
}

$('create').addEventListener('change', (e) => {
    const t = e.target;
    if (t.type !== 'radio' || !(t.name in state.settings)) return;
    state.settings[t.name] = t.value;
    if (t.name === 'quality') $('quality-hint').textContent = qualityOf(t.value).hint;
    saveSettings();
});

// ---- Gallery -----------------------------------------------------------------

function visibleImages() {
    const q = state.query.trim().toLowerCase();
    return q ? state.images.filter(i => i.prompt.toLowerCase().includes(q)) : state.images;
}

function columnCount() {
    const w = $('grid').clientWidth || $('gallery-pane').clientWidth;
    return w >= 1100 ? 4 : w >= 720 ? 3 : w >= 300 ? 2 : 1;
}

const aspectOf = (item) => {
    const r = ratioOf(item.ratio);
    const w = item.width || r.w;
    const h = item.height || r.h;
    return { w, h };
};

// Lazy-load each image's bytes as its card nears view. On wide screens the
// gallery scrolls on its own; on narrow ones the whole page does.
const wide = matchMedia('(min-width: 1024px)');
const waiting = new Set();
let lazy = null;
function watchCards() {
    if (lazy) lazy.disconnect();
    lazy = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            lazy.unobserve(entry.target);
            waiting.delete(entry.target);
            const image = state.images.find(i => i.id === entry.target.dataset.id);
            if (image) showImage(entry.target, image);
        }
    }, { root: wide.matches ? $('gallery-pane') : null, rootMargin: '600px 0px' });
    for (const card of waiting) lazy.observe(card);
}
watchCards();
wide.addEventListener('change', watchCards);

async function showImage(card, image) {
    const img = card.querySelector('img');
    try {
        img.src = await imageUrl(image);
    } catch (e) {
        card.querySelector('[data-missing]').classList.remove('hidden');
    }
}

function imageCard(image) {
    const { w, h } = aspectOf(image);
    const card = el('div', 'card group relative overflow-hidden rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]');
    card.dataset.id = image.id;
    card.style.aspectRatio = `${w} / ${h}`;

    const open = el('button', 'absolute inset-0 block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-400 rounded-2xl');
    open.setAttribute('aria-label', `Open image: ${image.prompt}`);
    open.addEventListener('click', () => openViewer(image.id));
    const img = el('img', 'h-full w-full object-cover');
    img.alt = image.prompt;
    img.decoding = 'async';
    img.addEventListener('load', () => img.classList.add('loaded'));
    open.append(img);

    const missing = el('div', 'absolute inset-0 hidden flex-col items-center justify-center gap-2 text-xs text-zinc-500');
    missing.dataset.missing = '';
    missing.append(icon('image-off', 'h-5 w-5'), el('span', '', 'Image file not found'));

    const caption = el('div', 'pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-10 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100');
    caption.append(el('p', 'line-clamp-2 text-[13px] leading-snug text-white/90', image.prompt));

    const actions = el('div', 'absolute right-2 top-2 flex gap-1.5 opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100');
    const quick = (name, label, fn) => {
        const b = el('button', 'flex h-8 w-8 items-center justify-center rounded-lg bg-black/50 text-white backdrop-blur-md transition hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400');
        b.setAttribute('aria-label', label);
        b.title = label;
        b.append(icon(name));
        b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
        return b;
    };
    actions.append(
        quick('refresh-cw', 'Use these settings', () => useSettings(image)),
        quick('download', 'Download', () => download(image)),
    );

    card.append(open, missing, caption, actions);
    if (state.urls.has(image.id)) img.src = state.urls.get(image.id);
    else { waiting.add(card); lazy.observe(card); }
    return card;
}

function pendingCard(job) {
    const { w, h } = aspectOf(job);
    const card = el('div', `card relative overflow-hidden rounded-2xl ring-1 ${job.error ? 'bg-red-500/[0.04] ring-red-400/20' : 'shimmer ring-white/10'}`);
    card.style.aspectRatio = `${w} / ${h}`;
    card.style.minHeight = '180px';
    const body = el('div', 'absolute inset-0 flex flex-col items-center justify-center gap-2 p-5 text-center');
    if (job.error) {
        body.append(icon('triangle-alert', 'h-5 w-5 text-red-300'), el('p', 'max-w-[16rem] text-sm text-zinc-200', job.error.text));
        const row = el('div', 'mt-1 flex gap-2');
        const again = el('button', 'btn-primary !px-3 !py-1.5 !text-xs', job.error.retry ? 'Try again' : 'Edit prompt');
        again.addEventListener('click', () => {
            if (job.error.retry) return retry(job);
            dismiss(job);
            useSettings(job);
        });
        const close = el('button', 'btn-ghost !px-3 !py-1.5 !text-xs', 'Dismiss');
        close.addEventListener('click', () => dismiss(job));
        row.append(again, close);
        body.append(row);
    } else {
        const spinner = icon('loader-circle', 'h-6 w-6 text-accent-300 motion-safe:animate-spin');
        const elapsed = el('p', 'text-xs tabular-nums text-zinc-500');
        elapsed.dataset.elapsed = String(job.startedAt);
        elapsed.textContent = '0s';
        body.append(spinner, el('p', 'text-sm font-medium text-zinc-200', 'Creating your image'), elapsed);
    }
    body.append(el('p', 'mt-1 line-clamp-2 max-w-[18rem] text-xs text-zinc-500', job.prompt));
    card.append(body);
    return card;
}

function nodeFor(item) {
    let node = state.nodes.get(item.id);
    if (!node) {
        node = state.images.includes(item) ? imageCard(item) : pendingCard(item);
        state.nodes.set(item.id, node);
    }
    return node;
}

function render() {
    const images = visibleImages();
    const searching = !!state.query.trim();
    const items = [...(searching ? [] : state.pending), ...images];

    $('total').textContent = state.images.length === 1 ? '1 image' : `${state.images.length} images`;
    $('total').classList.toggle('hidden', !state.images.length);
    $('empty').classList.toggle('hidden', items.length > 0 || searching);
    $('no-results').classList.toggle('hidden', !(searching && !images.length));
    $('no-results-term').textContent = state.query.trim();

    // A masonry layout: each card goes to the column that is shortest so
    // far, so newer images stay near the top.
    const count = columnCount();
    state.columns = count;
    const columns = Array.from({ length: count }, () => ({ height: 0, node: el('div', 'flex min-w-0 flex-1 flex-col gap-3 sm:gap-4') }));
    for (const item of items) {
        const { w, h } = aspectOf(item);
        const column = columns.reduce((best, c) => (c.height < best.height - 0.01 ? c : best));
        column.node.append(nodeFor(item));
        column.height += h / w + 0.08;
    }
    $('grid').replaceChildren(...columns.map(c => c.node));
    createIcons({ icons });
}

function renderLoading() {
    const count = columnCount();
    const heights = [[1, 1.33, 0.75], [1.33, 0.56, 1], [0.75, 1, 1.33], [1, 0.75, 0.56]];
    $('loading').replaceChildren(...Array.from({ length: count }, (_, c) => {
        const col = el('div', 'flex min-w-0 flex-1 flex-col gap-3 sm:gap-4');
        for (const r of heights[c % heights.length]) {
            const block = el('div', 'shimmer rounded-2xl');
            block.style.aspectRatio = `1 / ${r}`;
            col.append(block);
        }
        return col;
    }));
}

function renderIdeas() {
    $('ideas').replaceChildren(...IDEAS.map(idea => {
        const b = el('button', 'group flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-left transition hover:border-white/20 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400');
        b.type = 'button';
        const head = el('span', 'flex items-center gap-2');
        head.append(el('span', `h-5 w-5 shrink-0 rounded-md bg-gradient-to-br ${styleOf(idea.style).swatch}`), el('span', 'text-sm font-medium text-zinc-100', idea.title));
        b.append(head, el('span', 'mt-2 line-clamp-3 block text-[13px] leading-relaxed text-zinc-400', idea.prompt));
        b.addEventListener('click', () => useSettings(idea));
        return b;
    }));
}

// Pending cards count their seconds.
setInterval(() => {
    for (const node of document.querySelectorAll('[data-elapsed]')) {
        const s = Math.floor((Date.now() - Number(node.dataset.elapsed)) / 1000);
        node.textContent = s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
    }
}, 1000);

new ResizeObserver(() => {
    if ($('app').classList.contains('hidden')) return;
    if (columnCount() !== state.columns) render();
}).observe($('gallery-pane'));

let searchTimer = null;
$('search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { state.query = $('search').value; render(); }, 120);
});

// ---- Image actions -----------------------------------------------------------

function fileName(image) {
    const base = image.prompt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'image';
    const ext = (image.file && image.file.split('.').pop()) || 'png';
    return `${base}.${ext}`;
}

async function download(image) {
    try {
        const a = el('a');
        a.href = await imageUrl(image);
        a.download = fileName(image);
        document.body.append(a);
        a.click();
        a.remove();
    } catch (e) {
        toast('This image could not be downloaded.', { tone: 'error' });
    }
}

// Deleting is immediate, with a few seconds to undo before the file goes.
function removeImage(image) {
    const index = state.images.indexOf(image);
    if (index < 0) return;
    state.images.splice(index, 1);
    dropNode(image.id);
    if (!image.unsaved) saveImages();
    render();
    let undone = false;
    toast('Image deleted.', {
        action: 'Undo',
        duration: 6000,
        onAction: () => {
            undone = true;
            state.images.splice(Math.min(index, state.images.length), 0, image);
            if (!image.unsaved) saveImages();
            render();
        },
        onClose: () => {
            if (undone) return;
            forget(image);
            if (image.file && !image.unsaved) puter.fs.delete(image.file).catch(() => { /* already gone */ });
        },
    });
}

// ---- Viewer ------------------------------------------------------------------

function viewerList() {
    return visibleImages();
}

async function openViewer(id) {
    const list = viewerList();
    const index = list.findIndex(i => i.id === id);
    if (index < 0) return;
    const image = list[index];
    state.viewingId = id;
    $('viewer-prompt').textContent = image.prompt;
    $('viewer-style').textContent = styleOf(image.style).label;
    $('viewer-ratio').textContent = `${ratioOf(image.ratio).label} · ${image.ratio}`;
    $('viewer-quality').textContent = qualityOf(image.quality).label;
    $('viewer-date').textContent = new Date(image.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    $('viewer-prev').disabled = index === 0;
    $('viewer-next').disabled = index === list.length - 1;
    const img = $('viewer-image');
    img.alt = image.prompt;
    img.removeAttribute('src');
    if (!$('viewer').open) {
        $('viewer').showModal();
        $('viewer-close').focus();
    }
    try {
        const url = await imageUrl(image);
        if (state.viewingId === id) img.src = url;
    } catch (e) { /* the details still show */ }
}

function step(delta) {
    const list = viewerList();
    const index = list.findIndex(i => i.id === state.viewingId);
    const next = list[index + delta];
    if (next) openViewer(next.id);
}

function viewing() {
    return state.images.find(i => i.id === state.viewingId) || null;
}

$('viewer-close').addEventListener('click', () => $('viewer').close());
$('viewer-prev').addEventListener('click', () => step(-1));
$('viewer-next').addEventListener('click', () => step(1));
$('viewer-stage').addEventListener('click', (e) => { if (e.target === e.currentTarget) $('viewer').close(); });
$('viewer').addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
});
$('viewer').addEventListener('close', () => { state.viewingId = null; });
$('viewer-download').addEventListener('click', () => { const i = viewing(); if (i) download(i); });
$('viewer-copy').addEventListener('click', async () => {
    const i = viewing();
    if (!i) return;
    try {
        await navigator.clipboard.writeText(i.prompt);
        toast('Prompt copied.');
    } catch (e) {
        toast('The prompt could not be copied.', { tone: 'error' });
    }
});
$('viewer-remix').addEventListener('click', () => {
    const i = viewing();
    if (!i) return;
    $('viewer').close();
    useSettings(i);
});
$('viewer-delete').addEventListener('click', () => {
    const i = viewing();
    if (!i) return;
    const list = viewerList();
    const index = list.indexOf(i);
    const next = list[index + 1] || list[index - 1];
    removeImage(i);
    if (next) openViewer(next.id);
    else $('viewer').close();
});

// ---- Toasts ------------------------------------------------------------------

const live = el('div', 'sr-only');
live.setAttribute('aria-live', 'polite');
document.body.append(live);
function announce(text) {
    live.textContent = '';
    setTimeout(() => { live.textContent = text; }, 50);
}

const openToasts = new Set();
function toast(message, { action, onAction, onClose, tone, duration = 4000 } = {}) {
    const node = el('div', `toast pointer-events-auto flex max-w-md items-center gap-3 rounded-xl border px-4 py-2.5 text-sm shadow-2xl shadow-black/50 ${tone === 'error' ? 'border-red-400/20 bg-zinc-900 text-red-200' : 'border-white/10 bg-zinc-900 text-zinc-100'}`);
    node.setAttribute('role', tone === 'error' ? 'alert' : 'status');
    node.append(el('span', 'flex-1', message));
    let closed = false;
    const close = () => {
        if (closed) return;
        closed = true;
        openToasts.delete(close);
        clearTimeout(timer);
        node.remove();
        if (onClose) onClose();
    };
    if (action) {
        const b = el('button', 'rounded-md px-2 py-1 font-semibold text-accent-300 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400', action);
        b.addEventListener('click', () => { if (onAction) onAction(); close(); });
        node.append(b);
    }
    const timer = setTimeout(close, duration);
    openToasts.add(close);
    $('toasts').append(node);
    return close;
}

// ---- Layout and keyboard -----------------------------------------------------

$('shortcut').textContent = isMac ? '⌘ ↵' : 'Ctrl ↵';
$('create').addEventListener('submit', (e) => { e.preventDefault(); generate(); });
$('prompt').addEventListener('input', () => { updateCount(); $('form-error').textContent = ''; });
$('prompt').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.isComposing) { e.preventDefault(); generate(); }
});
$('enhance').addEventListener('click', enhance);
$('surprise').addEventListener('click', surprise);
document.addEventListener('keydown', (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName);
    if (e.key === '/' && !typing && !$('viewer').open && !$('app').classList.contains('hidden')) {
        e.preventDefault();
        $('prompt').focus();
    }
});

function setMenu(open) {
    $('account-menu').classList.toggle('hidden', !open);
    $('account').setAttribute('aria-expanded', String(open));
    if (open) $('sign-out').focus();
}
$('account').addEventListener('click', (e) => { e.stopPropagation(); setMenu($('account-menu').classList.contains('hidden')); });
document.addEventListener('click', (e) => { if (!$('account-menu').contains(e.target)) setMenu(false); });
$('account-menu').addEventListener('keydown', (e) => { if (e.key === 'Escape') { setMenu(false); $('account').focus(); } });

// ---- Auth --------------------------------------------------------------------

function showSignedOut() {
    $('app').classList.add('hidden');
    $('app').classList.remove('flex');
    $('signed-out').classList.remove('hidden');
    $('signed-out').classList.add('flex');
    createIcons({ icons });
}

async function showApp() {
    $('signed-out').classList.add('hidden');
    $('signed-out').classList.remove('flex');
    $('app').classList.remove('hidden');
    $('app').classList.add('flex');
    renderLoading();
    renderIdeas();
    renderControls();
    updateCount();
    updateGenerate();
    createIcons({ icons });
    try {
        const user = await puter.auth.getUser();
        $('username').textContent = user.username;
        $('avatar').textContent = (user.username || '?').charAt(0).toUpperCase();
    } catch (e) { /* the name is decoration */ }
    await Promise.all([loadImages(), loadSettings()]);
    $('loading').replaceChildren();
    syncChoices();
    render();
    if (matchMedia('(pointer: fine)').matches) $('prompt').focus();
}

$('sign-in').addEventListener('click', async () => {
    $('sign-in-error').textContent = '';
    try {
        await puter.auth.signIn();
        await showApp();
    } catch (e) {
        $('sign-in-error').textContent = 'Sign-in was cancelled. Try again when you are ready.';
    }
});

$('sign-out').addEventListener('click', async () => {
    setMenu(false);
    // Finish deletions waiting on an undo, and any write still on its way,
    // before the account changes.
    for (const close of [...openToasts]) close();
    clearTimeout(settingsTimer);
    await writes;
    state.session++;
    puter.auth.signOut();
    for (const image of state.images) forget(image);
    state.images = [];
    state.pending = [];
    state.nodes.clear();
    state.query = '';
    $('search').value = '';
    setPrompt('');
    $('grid').replaceChildren();
    showSignedOut();
});

if (puter.auth.isSignedIn()) showApp();
else showSignedOut();
