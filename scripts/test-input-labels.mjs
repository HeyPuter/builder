import fs from 'node:fs';

// ---- Regression guard: every text field the UI builds has a name ------------
// A screen reader announces a field by its accessible name. Several of the
// UI's fields had none — the Publish popover's and Settings' site-address
// fields, the sidebar's rename field — so they were read as a bare "edit
// text", and the typed-word delete confirmation was named only by its
// placeholder, the word itself. Every <input>, <textarea> and <select> written
// in the UI's markup must carry aria-label / aria-labelledby, sit inside a
// <label>, or be a hidden file picker.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const roots = ['../src/js', '../src/tools'];
const files = [];
const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = new URL(ent.name + (ent.isDirectory() ? '/' : ''), dir);
        if (ent.isDirectory()) walk(p);
        else if (/\.m?js$/.test(ent.name)) files.push(p);
    }
};
for (const r of roots) walk(new URL(r + '/', import.meta.url));

let seen = 0;
for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const rel = f.pathname.split('/src/')[1];
    src.split('\n').forEach((line, i) => {
        for (const m of line.matchAll(/<(?:input|textarea|select)\b[^>]*>/g)) {
            seen++;
            const tag = m[0];
            const named = /aria-label(ledby)?=/.test(tag)
                || /type="file"/.test(tag)
                || /<label\b[^>]*>(?:(?!<\/label>).)*$/.test(line.slice(0, m.index));
            check(`${rel}:${i + 1} ${(tag.match(/class="([^"]+)"/) || tag.match(/name="([^"]+)"/) || [, tag.slice(0, 40)])[1]} has an accessible name`, named, tag);
        }
    });
}
check('the scan found the UI\'s inputs (sanity)', seen >= 10, String(seen));

{
    const ui = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
    check('the delete confirmation\'s field is named by its "To confirm, type …" hint',
        /class="confirm-modal-input" aria-labelledby="confirm-modal-hint"/.test(ui) && /class="confirm-modal-hint" id="confirm-modal-hint"/.test(ui));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll input-label checks passed.');
