import fs from 'node:fs';

// ---- Regression guard: the dictation bar hides the composer from Tab too -----
// While dictating, the recording bar covers the composer, but the controls under
// it stayed in the Tab order: Shift+Tab from Cancel went to the hidden mic,
// attach button and textarea (typing there unseen), and to a Send that started
// a turn mid-recording. They are now inert while the bar is open — only those
// the bar made inert are restored when it closes, before focus returns to the
// composer.
//
// Text-level. Checked in Chromium with a fake microphone: Shift+Tab from Done
// went Done > Cancel > mic > attach > textarea before, Done > Cancel > the
// content above the composer after; Escape leaves nothing inert and focuses
// the composer.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const src = fs.readFileSync(new URL('../src/js/voice-input.js', import.meta.url), 'utf8');
check('opening the bar makes the composer\'s other children inert',
    /const inerted = \$input\.children\(\)\.not\(\$bar\)\.toArray\(\)\.filter\(\(el\) => !el\.inert\);\s*inerted\.forEach\(\(el\) => \{ el\.inert = true; \}\);/.test(src));
check('…remembering which', /stream, recorder, \$bar, inerted,/.test(src));
const close = src.slice(src.indexOf('function close(r'), src.indexOf('\n    }\n', src.indexOf('function close(r')));
check('closing the bar restores exactly those', /\(r\.inerted \|\| \[\]\)\.forEach\(\(el\) => \{ el\.inert = false; \}\);/.test(close));
check('…before focus goes back to the composer', close.indexOf('el.inert = false') < close.indexOf("trigger('focus')"));

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll voice recorder inert checks passed.');
