import fs from 'node:fs';

// ---- Regression guard: a Puter alert closed with Escape still answers --------
// Standalone, puter.ui.alert renders a <puter-alert> holding a native modal
// <dialog>, which the browser also closes on Escape — and that close answered
// nothing: the alert's promise stayed pending forever. Flows holding a guard
// across the dialog never let go: Escape on "Restore the project to this
// version?" (or on a restore error) left window._restoringVersion set, so Send,
// Publish and every later restore were refused until a reload.
//
// Runs the real wrapper from helpers.js around a stand-in for the SDK's alert
// that behaves like the standalone component (answers on a button/backdrop
// click; a native Escape fires cancel and closes the dialog without answering;
// the close event comes with the next frame, which a hidden tab never paints).

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const helpers = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const startMarker = '(function answerAlertsClosedWithoutAnswer() {';
const start = helpers.indexOf(startMarker);
const end = helpers.indexOf('\n})();', start);
if (start < 0 || end < 0) throw new Error('could not extract the alert wrapper from helpers.js');
const WRAPPER = helpers.slice(start, end + '\n})();'.length);

const tick = () => new Promise((r) => setTimeout(r, 5));

function world({ desktop = false } = {}) {
    const alerts = new Set();
    let last = null;
    const document = { querySelectorAll: (sel) => (sel === 'puter-alert' ? [...alerts] : []) };
    const ui = {
        alert(message) {
            if (desktop) return Promise.resolve('desktop-answer'); // posted to the desktop, no element here
            const dialog = new EventTarget();
            dialog.open = true;
            const el = {
                message, isConnected: true,
                shadowRoot: { querySelector: (s) => (s === 'dialog' ? dialog : null) },
                remove() { alerts.delete(el); el.isConnected = false; },
            };
            alerts.add(el);
            let respond;
            const answer = new Promise((r) => { respond = r; });
            // A button / backdrop click: the component answers, then closes.
            el.click = (value) => {
                respond(value === undefined ? null : value);
                dialog.open = false;
                el.remove();
                setTimeout(() => dialog.dispatchEvent(new Event('close')), 1);
            };
            // A native Escape: cancel, then the dialog closes (no answer).
            el.escape = ({ fireClose = false } = {}) => {
                const go = dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
                if (!go) return;
                dialog.open = false;
                if (fireClose) setTimeout(() => dialog.dispatchEvent(new Event('close')), 1);
            };
            el.dialog = dialog;
            last = el;
            return answer;
        },
    };
    const window = { puter: { ui } };
    new Function('window', 'document', WRAPPER)(window, document);
    return { ui, alerts, get last() { return last; }, wrapAgain: () => new Function('window', 'document', WRAPPER)(window, document) };
}
const settled = async (p) => { let v = 'pending'; p.then((x) => { v = x; }); await tick(); await tick(); return v; };

{
    const w = world();
    const p = w.ui.alert('Restore the project to this version?', [{ label: 'Yes', value: 'true' }, { label: 'No', value: 'false' }]);
    w.last.click('true');
    check('a button answer comes through unchanged', await settled(p) === 'true');
}
{
    const w = world();
    const p = w.ui.alert('Restore failed: …');
    w.last.escape();
    check('Escape answers null (what a backdrop click answers) — even with no close event (hidden tab)', await settled(p) === null);
    check('…and the closed alert is removed from the page', w.alerts.size === 0);
}
{
    const w = world();
    const p = w.ui.alert('x');
    w.last.escape({ fireClose: true });
    check('Escape with its close event: answered once, null', await settled(p) === null);
}
{
    const w = world();
    const p = w.ui.alert('x');
    const el = w.last;
    el.dialog.addEventListener('cancel', (e) => e.preventDefault());
    el.escape();
    check('a cancel something prevented (dialog still up) stays unanswered', await settled(p) === 'pending' && el.dialog.open);
    el.click('ok');
    check('…until a real answer', await settled(p) === 'ok');
}
{
    const w = world();
    const p = w.ui.alert('x');
    w.last.click(undefined);
    check('a backdrop click still answers null', await settled(p) === null);
}
{
    const w = world({ desktop: true });
    const p = w.ui.alert('x');
    check('inside the Puter desktop the SDK\'s answer passes straight through', await settled(p) === 'desktop-answer');
}
{
    const w = world();
    const wrapped = w.ui.alert;
    w.wrapAgain();
    check('loading the wrapper twice does not wrap twice', w.ui.alert === wrapped && wrapped.answersOnClose === true);
}
{
    const w = world();
    const p1 = w.ui.alert('first');
    const first = w.last;
    const p2 = w.ui.alert('second');
    w.last.click('2');
    first.escape();
    check('two alerts at once each settle on their own dialog', await settled(p2) === '2' && await settled(p1) === null);
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll alert-escape checks passed.');
