// Inline vector art for the static marketing/SEO pages.
//
// Everything here is a string of SVG markup, wrapped by the renderer in
// scripts/build-seo.mjs. Two kinds live here:
//
//   ICONS   24x24 stroke icons drawn in one consistent style (1.8px stroke,
//           round caps and joins, no fills). They inherit `currentColor`, so
//           CSS decides their color and they work in both themes for free.
//
//   SCENES  Small illustrative vignettes used beside copy in `split` sections.
//           They are drawn entirely with the page's CSS variables (--surface,
//           --border, --accent, ...), so they re-theme with the document and
//           never ship a hardcoded palette.
//
// Both are first-party, build-time constants: they are inserted into the page
// unescaped, which is exactly why nothing in this file may ever come from
// user or remote input. The renderer throws on an unknown name, and the test
// suite renders every page, so a typo in a page module fails the build rather
// than shipping a blank spot.
//
// Like the rest of the marketing surface, keep em and en dashes out of any
// human-readable strings here (see the content-style checks in test-seo.mjs).

export const ICONS = {
    // ---- product ----
    sparkles:
        '<path d="M12 4l1.7 4.6L18.3 10l-4.6 1.7L12 16.3l-1.7-4.6L5.7 10l4.6-1.7L12 4z"/>' +
        '<path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z"/>',
    chat:
        '<path d="M20 12.5a7 7 0 0 1-7 7H5.5L4 21V12.5a7.5 7.5 0 0 1 8-7.5 7.5 7.5 0 0 1 8 7.5z"/>' +
        '<path d="M8.5 12.5h.01M12 12.5h.01M15.5 12.5h.01"/>',
    eye:
        '<path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z"/>' +
        '<circle cx="12" cy="12" r="2.8"/>',
    shieldCheck:
        '<path d="M12 3l7.5 3v5.5c0 4.7-3.2 7.7-7.5 9.5-4.3-1.8-7.5-4.8-7.5-9.5V6L12 3z"/>' +
        '<path d="M8.8 12l2.2 2.2 4.2-4.4"/>',
    database:
        '<ellipse cx="12" cy="5.5" rx="7.5" ry="2.8"/>' +
        '<path d="M4.5 5.5v6.5c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V5.5"/>' +
        '<path d="M4.5 12v6.5c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V12"/>',
    globe:
        '<circle cx="12" cy="12" r="9"/>' +
        '<path d="M3 12h18M12 3a13.4 13.4 0 0 1 3.5 9 13.4 13.4 0 0 1-3.5 9 13.4 13.4 0 0 1-3.5-9A13.4 13.4 0 0 1 12 3z"/>',
    download:
        '<path d="M12 4v10.5M7.5 10.5L12 15l4.5-4.5"/>' +
        '<path d="M4.5 16.5V18a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-1.5"/>',
    phone:
        '<rect x="7" y="3" width="10" height="18" rx="2.4"/>' +
        '<path d="M10.5 17.8h3"/>',
    cursor:
        '<path d="M5 4l6.5 15 1.9-6.1L19.5 11 5 4z"/>' +
        '<path d="M13.5 13.5L19 19"/>',
    sliders:
        '<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/>' +
        '<circle cx="15" cy="7.5" r="2"/><circle cx="9" cy="16.5" r="2"/>',
    history:
        '<path d="M4 5.5v5h5"/>' +
        '<path d="M4.6 10.4A8.5 8.5 0 1 1 3.5 14"/>' +
        '<path d="M12 8v4.5l3 1.8"/>',
    users:
        '<circle cx="9" cy="8" r="3.2"/>' +
        '<path d="M3.5 19.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/>' +
        '<path d="M15.5 5.2a3.2 3.2 0 0 1 0 5.6M17 14.7c2.1.6 3.5 2.3 3.5 4.8"/>',
    zap:
        '<path d="M13 3L5 13.5h6L11 21l8-10.5h-6L13 3z"/>',
    lock:
        '<rect x="5" y="10.5" width="14" height="9.5" rx="2"/>' +
        '<path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    chart:
        '<path d="M4 4v16h16"/>' +
        '<path d="M8.5 15.5V10M13 15.5V6.5M17.5 15.5v-5.5"/>',
    calendar:
        '<rect x="4" y="5.5" width="16" height="15" rx="2"/>' +
        '<path d="M8 3.5v4M16 3.5v4M4 10.5h16"/>' +
        '<path d="M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01"/>',
    receipt:
        '<path d="M6 3.5h12V20l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 20V3.5z"/>' +
        '<path d="M9 8h6M9 11.5h6M9 15h3.5"/>',
    folder:
        '<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V7z"/>',
    wand:
        '<path d="M4 20L15.5 8.5"/>' +
        '<path d="M17.5 3.5l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4z"/>',
    link:
        '<path d="M10 14a4.5 4.5 0 0 0 6.4.4l2.3-2.3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2"/>' +
        '<path d="M14 10a4.5 4.5 0 0 0-6.4-.4l-2.3 2.3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2"/>',
    check:
        '<circle cx="12" cy="12" r="9"/>' +
        '<path d="M8 12.2l2.7 2.7 5.3-5.6"/>',
    layout:
        '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/>' +
        '<path d="M3.5 9.5h17M9.5 9.5v10"/>',
    pen:
        '<path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/>' +
        '<path d="M14.5 6.5l3 3"/>',
    search:
        '<circle cx="10.5" cy="10.5" r="6.5"/>' +
        '<path d="M15.5 15.5L20.5 20.5"/>',
    bell:
        '<path d="M6 10a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10z"/>' +
        '<path d="M10 19a2.2 2.2 0 0 0 4 0"/>',
    mapPin:
        '<path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11z"/>' +
        '<circle cx="12" cy="9.8" r="2.6"/>',
    clock:
        '<circle cx="12" cy="12" r="9"/>' +
        '<path d="M12 7v5.5l3.5 2"/>',
    mail:
        '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/>' +
        '<path d="M4.5 7.5l7.5 5.5 7.5-5.5"/>',
    star:
        '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8L12 3.5z"/>',
    file:
        '<path d="M6 3.5h8l4 4V20.5H6V3.5z"/>' +
        '<path d="M14 3.5v4h4M9 12h6M9 15.5h6"/>',
    code:
        '<path d="M8.5 7L4 12l4.5 5M15.5 7L20 12l-4.5 5"/>',
    refresh:
        '<path d="M20 5.5v5h-5"/>' +
        '<path d="M19.4 10.5a8 8 0 1 0 .6 3"/>',

    // ---- professions ----
    dumbbell:
        '<path d="M7 8v8M4.5 9.5v5M17 8v8M19.5 9.5v5"/>' +
        '<path d="M7 12h10"/>',
    scale:
        '<path d="M12 4v16M8 20h8M12 6.5H6M12 6.5h6"/>' +
        '<path d="M6 6.5l-2.7 6a3 3 0 0 0 5.4 0l-2.7-6zM18 6.5l-2.7 6a3 3 0 0 0 5.4 0l-2.7-6z"/>',
    calculator:
        '<rect x="5" y="3.5" width="14" height="17" rx="2"/>' +
        '<path d="M8.5 7h7"/>' +
        '<path d="M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 15.5h.01M12 15.5h.01M15.5 15.5h.01"/>',
    home:
        '<path d="M4 11l8-7 8 7"/>' +
        '<path d="M6 9.5V20h12V9.5"/>' +
        '<path d="M10 20v-6h4v6"/>',
    utensils:
        '<path d="M7 3.5v6a2 2 0 0 0 4 0v-6M9 3.5V20.5"/>' +
        '<path d="M16.5 13.5V20.5M16.5 13.5c-1.6 0-2.5-2.2-2.5-5s1.2-5 2.5-5v10z"/>',
    camera:
        '<path d="M4 8.5a2 2 0 0 1 2-2h2l1.5-2.5h5L16 6.5h2a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.5z"/>' +
        '<circle cx="12" cy="13" r="3.5"/>',
    book:
        '<path d="M12 6.5c-1.5-1.6-3.8-2-8-2v13.5c4.2 0 6.5.4 8 2 1.5-1.6 3.8-2 8-2V4.5c-4.2 0-6.5.4-8 2z"/>' +
        '<path d="M12 6.5V20"/>',
    heart:
        '<path d="M12 20s-7.5-4.6-7.5-10A4.4 4.4 0 0 1 9 5.5c1.3 0 2.4.6 3 1.6a3.6 3.6 0 0 1 3-1.6 4.4 4.4 0 0 1 4.5 4.5c0 5.4-7.5 10-7.5 10z"/>',
    briefcase:
        '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/>' +
        '<path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 12.5h17"/>',
    wrench:
        '<path d="M14.8 6.2a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.7-3.7a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.7 3.7z"/>',
    sprout:
        '<path d="M12 20.5v-8"/>' +
        '<path d="M12 12.5C12 8.9 9.2 6 5 6c0 4.4 3 6.5 7 6.5z"/>' +
        '<path d="M12 10c.3-3 2.6-5 6.8-5 0 3.9-2.6 5.9-6.8 6"/>',
    scissors:
        '<circle cx="6.2" cy="6.2" r="2.8"/>' +
        '<circle cx="6.2" cy="17.8" r="2.8"/>' +
        '<path d="M8.3 8.3L20 20M20 4L8.3 15.7"/>',
    music:
        '<path d="M9 18.5V5.5l11-2V16"/>' +
        '<circle cx="6" cy="18.5" r="3"/>' +
        '<circle cx="17" cy="16" r="3"/>',
};

/* ------------------------------------------------------------------ *
 * Scenes
 *
 * Shared building blocks keep the vignettes visually consistent: every
 * scene is a 360x240 canvas, windows share one corner radius and stroke,
 * and the accent color is used exactly once per scene so it reads as a
 * highlight rather than decoration.
 * ------------------------------------------------------------------ */

const FRAME =
    '<rect x="1.5" y="1.5" width="357" height="237" rx="14" fill="var(--surface)" stroke="var(--border)"/>';

function windowBox(x, y, w, h, { bar = true } = {}) {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="var(--bg)" stroke="var(--border-2)"/>`;
    if (bar) {
        s += `<line x1="${x}" y1="${y + 22}" x2="${x + w}" y2="${y + 22}" stroke="var(--border)"/>` +
            `<circle cx="${x + 12}" cy="${y + 11}" r="2.6" fill="var(--border-2)"/>` +
            `<circle cx="${x + 21}" cy="${y + 11}" r="2.6" fill="var(--border-2)"/>` +
            `<circle cx="${x + 30}" cy="${y + 11}" r="2.6" fill="var(--border-2)"/>`;
    }
    return s;
}

function textLines(x, y, widths, gap = 10) {
    return widths.map((w, i) =>
        `<rect x="${x}" y="${y + i * gap}" width="${w}" height="4" rx="2" fill="var(--surface-2)"/>`,
    ).join('');
}

export const SCENES = {
    // A sentence in a chat bubble becoming a running app.
    describe:
        FRAME +
        `<rect x="26" y="36" width="150" height="44" rx="12" fill="var(--accent-soft)"/>` +
        `<rect x="40" y="50" width="96" height="5" rx="2.5" fill="var(--accent)" opacity="0.75"/>` +
        `<rect x="40" y="62" width="66" height="5" rx="2.5" fill="var(--accent)" opacity="0.45"/>` +
        `<path d="M186 96 h32 m0 0 l-8 -8 m8 8 l-8 8" stroke="var(--text-3)" fill="none"/>` +
        windowBox(120, 116, 214, 96) +
        `<rect x="134" y="150" width="60" height="26" rx="6" fill="var(--accent-soft)"/>` +
        `<rect x="202" y="150" width="60" height="26" rx="6" fill="var(--surface-2)"/>` +
        `<rect x="270" y="150" width="50" height="26" rx="6" fill="var(--surface-2)"/>` +
        textLines(134, 188, [110, 80]) +
        `<circle cx="308" cy="196" r="12" fill="var(--accent)"/>` +
        `<path d="M303 196l3.4 3.4 6-6.4" stroke="var(--accent-ink)" stroke-width="2" fill="none"/>`,

    // The verify loop: the preview reloads, an error is caught, the fix lands.
    verify:
        FRAME +
        windowBox(28, 34, 200, 130) +
        textLines(44, 76, [130, 100, 150, 90], 16) +
        `<rect x="44" y="138" width="120" height="12" rx="4" fill="var(--accent-soft)"/>` +
        // Reload ring, concentric with the check badge (centre 288,100), open at the
        // upper left with the arrowhead sitting on the arc's end tangent.
        `<path d="M288 56a44 44 0 1 1-41.4 29" stroke="var(--text-3)" fill="none" stroke-width="2"/>` +
        `<path d="M-9 -6L0 0L-9 6" transform="translate(246.6 85) rotate(-70)" stroke="var(--text-3)" fill="none" stroke-width="2"/>` +
        `<circle cx="288" cy="100" r="24" fill="var(--accent)"/>` +
        `<path d="M278 100l7 7 13-14" stroke="var(--accent-ink)" stroke-width="3" fill="none"/>` +
        textLines(48, 190, [180]) +
        `<circle cx="36" cy="192" r="4" fill="var(--accent)"/>`,

    // Click the element, describe the change.
    picker:
        FRAME +
        windowBox(28, 30, 304, 148) +
        textLines(46, 70, [120, 90]) +
        `<rect x="46" y="98" width="128" height="58" rx="8" fill="var(--surface-2)"/>` +
        `<rect x="190" y="98" width="124" height="58" rx="8" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 5"/>` +
        `<rect x="204" y="112" width="80" height="6" rx="3" fill="var(--accent)" opacity="0.55"/>` +
        `<rect x="204" y="128" width="56" height="6" rx="3" fill="var(--surface-2)"/>` +
        `<path d="M282 148l7 17 2.4-7.2 7.2-2L282 148z" fill="var(--text)" stroke="var(--bg)"/>` +
        `<rect x="196" y="186" width="136" height="30" rx="8" fill="var(--surface-2)"/>` +
        `<rect x="208" y="199" width="90" height="5" rx="2.5" fill="var(--text-3)"/>`,

    // Version history: snapshots you can walk back through.
    history:
        FRAME +
        // Restore ring sits fully left of the stack so nothing overlaps it; it runs
        // counter-clockwise with the arrowhead on the arc's end tangent.
        `<path d="M48 96a24 24 0 1 0 22.55 15.8" stroke="var(--accent)" fill="none" stroke-width="2.5"/>` +
        `<path d="M-8 -5.5L0 0L-8 5.5" transform="translate(70.55 111.8) rotate(-110)" stroke="var(--accent)" fill="none" stroke-width="2.5"/>` +
        `<rect x="88" y="88" width="196" height="104" rx="10" fill="var(--surface-2)" opacity="0.5"/>` +
        `<rect x="104" y="66" width="196" height="110" rx="10" fill="var(--surface-2)"/>` +
        windowBox(122, 44, 200, 118) +
        textLines(138, 86, [140, 100, 120], 16) +
        `<rect x="138" y="134" width="70" height="12" rx="4" fill="var(--accent-soft)"/>` +
        textLines(138, 196, [90]) +
        `<circle cx="126" cy="198" r="4" fill="var(--accent)"/>`,

    // One click to a live URL.
    publish:
        FRAME +
        windowBox(52, 58, 256, 128) +
        `<rect x="88" y="66" width="184" height="14" rx="7" fill="var(--surface-2)"/>` +
        `<circle cx="97" cy="73" r="4" fill="var(--accent)"/>` +
        `<rect x="108" y="70.5" width="120" height="5" rx="2.5" fill="var(--text-3)"/>` +
        textLines(72, 104, [150, 110]) +
        `<rect x="72" y="132" width="100" height="36" rx="8" fill="var(--accent-soft)"/>` +
        `<rect x="184" y="132" width="100" height="36" rx="8" fill="var(--surface-2)"/>` +
        `<circle cx="290" cy="52" r="22" fill="var(--accent)"/>` +
        `<path d="M283 52h14M290 45c2.6 2 2.6 12 0 14-2.6-2-2.6-12 0-14z" stroke="var(--accent-ink)" fill="none" stroke-width="1.8"/>` +
        `<circle cx="290" cy="52" r="7.5" stroke="var(--accent-ink)" fill="none" stroke-width="1.8"/>`,

    // The backend that is already there: storage, auth, AI, files.
    backend:
        FRAME +
        `<path d="M180 120L92 62M180 120l88-58M180 120L92 178M180 120l88 58" stroke="var(--border-2)" stroke-dasharray="2 5" stroke-width="1.6"/>` +
        windowBox(136, 92, 88, 56, { bar: false }) +
        `<rect x="150" y="106" width="60" height="6" rx="3" fill="var(--accent)" opacity="0.6"/>` +
        `<rect x="150" y="120" width="40" height="6" rx="3" fill="var(--surface-2)"/>` +
        `<circle cx="92" cy="62" r="24" fill="var(--surface-2)"/>` +
        `<ellipse cx="92" cy="56" rx="10" ry="4" stroke="var(--text-3)" fill="none" stroke-width="1.6"/>` +
        `<path d="M82 56v10c0 2.2 4.5 4 10 4s10-1.8 10-4V56" stroke="var(--text-3)" fill="none" stroke-width="1.6"/>` +
        `<circle cx="268" cy="62" r="24" fill="var(--surface-2)"/>` +
        `<rect x="260" y="60" width="16" height="12" rx="2.5" stroke="var(--text-3)" fill="none" stroke-width="1.6"/>` +
        `<path d="M263 60v-3.5a5 5 0 0 1 10 0V60" stroke="var(--text-3)" fill="none" stroke-width="1.6"/>` +
        `<circle cx="92" cy="178" r="24" fill="var(--surface-2)"/>` +
        `<path d="M92 168l2.6 6.9 6.9 2.6-6.9 2.6-2.6 6.9-2.6-6.9-6.9-2.6 6.9-2.6 2.6-6.9z" fill="var(--accent)" opacity="0.85"/>` +
        `<circle cx="268" cy="178" r="24" fill="var(--surface-2)"/>` +
        `<path d="M258 172h7l3 3.5h10v10h-20v-13.5z" stroke="var(--text-3)" fill="none" stroke-width="1.6"/>`,

    // The same app on a laptop and a phone.
    devices:
        FRAME +
        `<rect x="46" y="52" width="204" height="124" rx="8" fill="var(--bg)" stroke="var(--border-2)"/>` +
        `<path d="M30 190h236l-14-14H44l-14 14z" fill="var(--surface-2)" stroke="var(--border-2)"/>` +
        `<rect x="64" y="70" width="86" height="40" rx="6" fill="var(--accent-soft)"/>` +
        `<rect x="160" y="70" width="72" height="40" rx="6" fill="var(--surface-2)"/>` +
        textLines(64, 126, [120, 90, 140]) +
        `<rect x="270" y="70" width="62" height="120" rx="10" fill="var(--bg)" stroke="var(--border-2)"/>` +
        `<rect x="280" y="86" width="42" height="24" rx="5" fill="var(--accent-soft)"/>` +
        textLines(280, 122, [40, 30, 38]) +
        `<line x1="292" y1="180" x2="310" y2="180" stroke="var(--border-2)" stroke-width="2.4"/>`,

    // Real files you can open, read, and take anywhere.
    files:
        FRAME +
        `<path d="M36 62h44l12 14h96a10 10 0 0 1 10 10v76a10 10 0 0 1-10 10H36a10 10 0 0 1-10-10V72a10 10 0 0 1 10-10z" fill="var(--surface-2)" stroke="var(--border-2)"/>` +
        `<g transform="translate(196 48)">` +
        `<rect x="0" y="14" width="80" height="98" rx="8" fill="var(--bg)" stroke="var(--border-2)" transform="rotate(-4 40 63)"/>` +
        `<rect x="46" y="8" width="80" height="98" rx="8" fill="var(--bg)" stroke="var(--border-2)" transform="rotate(3 86 57)"/>` +
        `<rect x="92" y="16" width="46" height="20" rx="6" fill="var(--accent-soft)"/>` +
        `<rect x="60" y="46" width="52" height="5" rx="2.5" fill="var(--surface-2)"/>` +
        `<rect x="60" y="60" width="40" height="5" rx="2.5" fill="var(--surface-2)"/>` +
        `<rect x="60" y="74" width="48" height="5" rx="2.5" fill="var(--surface-2)"/>` +
        `</g>` +
        `<rect x="40" y="150" width="64" height="14" rx="5" fill="var(--bg)" stroke="var(--border-2)"/>` +
        `<rect x="112" y="150" width="64" height="14" rx="5" fill="var(--bg)" stroke="var(--border-2)"/>` +
        `<rect x="48" y="155" width="34" height="4" rx="2" fill="var(--accent)" opacity="0.6"/>` +
        `<rect x="120" y="155" width="34" height="4" rx="2" fill="var(--text-3)"/>`,
};

export const ICON_NAMES = Object.keys(ICONS);
export const SCENE_NAMES = Object.keys(SCENES);
