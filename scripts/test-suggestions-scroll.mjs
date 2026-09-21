import fs from 'node:fs';

// ---- Regression guard: suggestion chips must not yank a reader to the bottom -
// renderContinueSuggestions re-pins the chat box after inserting the chip row
// (the row shrinks the box, pushing the last message below the fold). It used
// to gate that on window.shouldAutoScroll — a flag the scroll listener only
// turns off for a scroll-up DURING a turn — so when the Haiku fallback delivered
// chips a few seconds after the turn ended, a user who had scrolled up to
// re-read was jumped back to the latest message. The gate is now a direct
// measurement (chatBoxNearBottom) taken BEFORE the row is inserted.

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const APP = new URL('../src/js/app.js', import.meta.url);
const src = fs.readFileSync(APP, 'utf8');

// The pure helper.
const a = src.indexOf('function chatBoxNearBottom(');
const b = src.indexOf('\n}\n', a);
if (a < 0 || b <= a) throw new Error('could not extract chatBoxNearBottom from app.js');
const nearBottom = new Function(src.slice(a, b + 3) + '\nreturn chatBoxNearBottom;')();

const box = (scrollTop, scrollHeight, clientHeight) => ({ scrollTop, scrollHeight, clientHeight });
check('pinned to the very bottom → near', nearBottom(box(1000, 1500, 500)) === true);
check('within the 50px slack → near', nearBottom(box(960, 1500, 500)) === true);
check('scrolled up past the slack → not near', nearBottom(box(900, 1500, 500)) === false);
check('scrolled to the top of a long chat → not near', nearBottom(box(0, 5000, 600)) === false);
check('content shorter than the box (nothing to scroll) → near', nearBottom(box(0, 300, 600)) === true);
check('missing element → treated as near (safe default: pin)', nearBottom(null) === true);

// The render path must measure BEFORE inserting the row and gate the re-pin on
// that measurement, not on window.shouldAutoScroll.
const r0 = src.indexOf('function renderContinueSuggestions(');
const r1 = src.indexOf('\n}\n', r0);
const render = src.slice(r0, r1);
const measureAt = render.indexOf("const wasNearBottom = chatBoxNearBottom($('.chat-box')[0]);");
const insertAt = render.indexOf("$('.chat-input').before($row);");
const pinAt = render.indexOf('if (wasNearBottom) {');
check('renderContinueSuggestions measures the box position', measureAt > 0);
check('…before the row is inserted', measureAt > 0 && insertAt > measureAt);
check('…and gates the re-pin on that measurement', pinAt > insertAt);
check('the re-pin no longer keys off window.shouldAutoScroll', !/if \(window\.shouldAutoScroll\) \{\s*const cb = \$\('\.chat-box'\)/.test(render));

// The scroll listener shares the same definition of "at the bottom".
const l0 = src.indexOf("$('.chat-box').on('scroll'");
const l1 = src.indexOf('});', l0);
check('the auto-scroll listener uses the shared helper', /chatBoxNearBottom\(this\)/.test(src.slice(l0, l1)));

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll suggestion-scroll checks passed.');
