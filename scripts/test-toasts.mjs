import fs from 'node:fs';

// ---- Regression guard: toasts reach screen readers --------------------------
// Toasts are announced through an aria-live container. It used to be created
// together with the first toast and removed when the last one left — and
// screen readers announce what is ADDED to a live region they already know,
// mostly saying nothing for a region that appears with its content. So the
// first toast of every burst (a failed save, "couldn't be redeployed", …) went
// unheard. The region now exists once the page is parsed, before any toast,
// and stays. Each toast also had a live role of its own inside the live
// container, which can be read twice.
//
// Runs the real toast code from helpers.js against a small fake DOM.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const helpers = fs.readFileSync(new URL('../src/js/helpers.js', import.meta.url), 'utf8');
const start = helpers.indexOf('window._toastLastShown = window._toastLastShown || {};');
const end = helpers.indexOf('// Returns true if `url` carries a scheme', start);
if (start < 0 || end < 0) throw new Error('could not extract the toast code from helpers.js');
const TOAST = helpers.slice(start, end);

class El {
    constructor(tag, doc) {
        this.tagName = tag.toUpperCase(); this.doc = doc; this.children = []; this.parentNode = null;
        this.attrs = {}; this.listeners = {}; this.className = ''; this.textContent = '';
        const self = this;
        this.classList = {
            add: (c) => { const s = new Set(self.className.split(' ').filter(Boolean)); s.add(c); self.className = [...s].join(' '); },
            remove: (c) => { self.className = self.className.split(' ').filter((x) => x && x !== c).join(' '); },
            contains: (c) => self.className.split(' ').includes(c),
        };
    }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; }
    insertBefore(c, ref) { c.parentNode = this; this.children.splice(this.children.indexOf(ref), 0, c); return c; }
    removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; return c; }
    contains(x) { for (let n = x; n; n = n.parentNode) if (n === this) return true; return false; }
    addEventListener(t, fn) { (this.listeners[t] ||= []).push(fn); }
    dispatch(t, ev = {}) { for (const fn of this.listeners[t] || []) fn({ type: t, target: this, ...ev }); }
    focus() { const prev = this.doc.activeElement; this.doc.activeElement = this; prev?.dispatch?.('focusout', { relatedTarget: this }); this.dispatch('focusin', { relatedTarget: prev }); }
    find(cls) { for (const c of this.children) { if (c.classList.contains(cls)) return c; const f = c.find(cls); if (f) return f; } return null; }
}

function page({ parsed = true } = {}) {
    let now = 0;
    const timers = [];
    const doc = {
        body: null, activeElement: null, listeners: {},
        createElement: (t) => new El(t, doc),
        querySelector: (sel) => (doc.body ? (sel === '.toast-container' ? doc.body.find('toast-container') : null) : null),
        addEventListener: (t, fn) => { (doc.listeners[t] ||= []).push(fn); },
        parse() { doc.body = new El('body', doc); doc.activeElement = doc.body; for (const fn of doc.listeners.DOMContentLoaded || []) fn(); },
    };
    if (parsed) { doc.body = new El('body', doc); doc.activeElement = doc.body; }
    const window = {};
    const setTimeout = (fn, ms) => { const t = { at: now + ms, fn }; timers.push(t); return t; };
    const clearTimeout = (t) => { const i = timers.indexOf(t); if (i >= 0) timers.splice(i, 1); };
    const advance = (ms) => {
        const until = now + ms;
        for (;;) {
            timers.sort((a, b) => a.at - b.at);
            if (!timers.length || timers[0].at > until) break;
            const t = timers.shift(); now = t.at; t.fn();
        }
        now = until;
    };
    new Function('window', 'document', 'setTimeout', 'clearTimeout', 'requestAnimationFrame', 'Date', TOAST)(
        window, doc, setTimeout, clearTimeout, (fn) => fn(), { now: () => now });
    return { window, doc, advance, container: () => doc.querySelector('.toast-container') };
}

{
    const p = page({ parsed: false });
    check('nothing is touched before the page is parsed', p.doc.body === null);
    p.doc.parse();
    const c = p.container();
    check('the live region exists once the page is parsed — before any toast', !!c && c.getAttribute('aria-live') === 'polite' && c.children.length === 0);
    const t = p.window.showToast('Saved changes could not be written');
    check('a toast is added to that same, already-present region', t.parentNode === c && p.container() === c);
    check('…without a live role of its own (no double announcement)', t.getAttribute('role') === null);
    p.advance(7000);
    check('the toast leaves after its duration', c.children.length === 0);
    check('…and the region stays for the next one', p.container() === c);
    const t2 = p.window.showToast('Second');
    check('the next toast lands in the same region', t2.parentNode === c);
}
{
    const p = page();
    check('a page already parsed when the script runs gets its region at once', !!p.container());
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll toast checks passed.');
