import fs from 'node:fs';

// ---- Regression guard: the image viewer's full prompt can be read ------------
// The full-screen image viewer showed the prompt clamped to two lines with an
// ellipsis, and nothing revealed the rest; on a touch screen it was nowhere to
// be read (the chat card's caption is one line with a hover-only tooltip). The
// caption now keeps its two-line height but scrolls, fades its last line while
// more is hidden, and joins the viewer's Tab cycle when it scrolls.
//
// Text-level for the CSS and the Tab cycle; functional for the fade marker.
// Checked in Chromium at 390px and 1280px: fade on open, gone when scrolled to
// the end, the caption reachable by Tab only when it scrolls.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const css = fs.readFileSync(new URL('../src/css/styles.css', import.meta.url), 'utf8');
const media = fs.readFileSync(new URL('../src/js/media.js', import.meta.url), 'utf8');

const rule = /\n\.media-lightbox-caption \{([^}]*)\}/.exec(css);
check('the caption rule is present', !!rule);
check('it is no longer clamped with an ellipsis', rule && !/line-clamp/.test(rule[1]) && !/overflow: hidden/.test(rule[1]));
check('…it keeps two lines of height and scrolls', rule && /max-height: 2\.8em;/.test(rule[1]) && /overflow-y: auto;/.test(rule[1]));
check('a clipped caption fades its last line', /\.media-lightbox-caption\.is-clipped \{[^}]*mask-image/.test(css));
check('the Tab cycle includes a scrolling caption',
    /find\('button:not\(\[hidden\]\), \.media-lightbox-caption\[tabindex="0"\]'\)/.test(media));

{
    const at = media.indexOf('    function markCaptionClip(cap) {');
    check('markCaptionClip is present', at >= 0);
    const markCaptionClip = new Function(media.slice(at, media.indexOf('\n    }\n', at) + 7) + 'return markCaptionClip;')();
    const cap = (top, client, height) => {
        const cls = new Set();
        return { scrollTop: top, clientHeight: client, scrollHeight: height, classList: { toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)) }, has: () => cls.has('is-clipped') };
    };
    const a = cap(0, 36, 91); markCaptionClip(a);
    check('more text below → faded', a.has());
    const b = cap(55, 36, 91); markCaptionClip(b);
    check('scrolled to the end → not faded', !b.has());
    const c = cap(0, 36, 36); markCaptionClip(c);
    check('a caption that fits → not faded', !c.has());
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll lightbox caption checks passed.');
