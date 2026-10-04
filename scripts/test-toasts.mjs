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
// It also must hold while it is being read or used (below).
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
    get isConnected() { for (let n = this; n; n = n.parentNode) if (n === this.doc.body) return true; return false; }
    matches(sel) { return sel === ':focus-visible' ? this.doc.activeElement === this && this.doc.keyboard : false; }
    // focusin/focusout bubble: deliver to every ancestor, like the browser.
    bubble(t, ev) { for (let n = this; n; n = n.parentNode) for (const fn of n.listeners[t] || []) fn({ type: t, target: this, ...ev }); }
    focus() {
        const prev = this.doc.activeElement;
        if (prev === this) return;
        this.doc.activeElement = this;
        if (prev && prev.bubble) prev.bubble('focusout', { relatedTarget: this });
        this.bubble('focusin', { relatedTarget: prev && prev !== this.doc.body ? prev : null });
    }
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

// ---- A toast holds while it is being read or used --------------------------
// It auto-dismissed on a timer regardless: it vanished mid-read, taking its
// action button ("Reload", "Install") from under the pointer or keyboard focus.
// Dismissing it from the keyboard also dropped focus to <body>.
const buttons = (t) => ({ close: t.find('toast-close'), action: t.find('toast-action') });
{
    const p = page();
    const t = p.window.showToast('Update ready', { action: { label: 'Reload', onClick() {} } });
    p.advance(3000);
    t.dispatch('pointerenter', { pointerType: 'mouse' });
    p.advance(30000);
    check('hovered with a mouse: the toast stays', t.parentNode !== null && !t.classList.contains('toast-hide'));
    t.dispatch('pointerleave', { pointerType: 'mouse' });
    p.advance(2900);
    check('…and after the pointer leaves it gets the rest of its time (3 s here)', !t.classList.contains('toast-hide'));
    p.advance(200);
    check('…then goes', t.classList.contains('toast-hide'));
}
{
    const p = page();
    const t = p.window.showToast('x');
    p.advance(5900);
    t.dispatch('pointerenter', { pointerType: 'mouse' });
    t.dispatch('pointerleave', { pointerType: 'mouse' });
    p.advance(1900);
    check('left with almost no time to go: still at least two seconds', !t.classList.contains('toast-hide'));
    p.advance(200);
    check('…then goes', t.classList.contains('toast-hide'));
}
{
    const p = page();
    const t = p.window.showToast('x');
    p.advance(1000);
    t.dispatch('pointerenter', { pointerType: 'touch' });
    p.advance(5100);
    check('a touch does not hold the toast (its hover ends with the tap)', t.classList.contains('toast-hide'));
}
{
    const p = page();
    p.doc.keyboard = true;
    const composer = p.doc.body.appendChild(new El('textarea', p.doc));
    composer.focus();
    const t = p.window.showToast('Update ready', { action: { label: 'Reload', onClick() {} } });
    const { close, action } = buttons(t);
    p.advance(1000);
    action.focus();
    p.advance(20000);
    check('focus inside: the toast stays', !t.classList.contains('toast-hide'));
    close.focus();
    p.advance(20000);
    check('…while focus moves between its buttons too', !t.classList.contains('toast-hide'));
    close.dispatch('click');
    check('dismissed from the keyboard: focus goes back where it came from', p.doc.activeElement === composer);
}
{
    const p = page();
    p.doc.keyboard = false; // a mouse click focuses the button, not :focus-visible
    const composer = p.doc.body.appendChild(new El('textarea', p.doc));
    composer.focus();
    const t = p.window.showToast('x');
    const { close } = buttons(t);
    close.focus();
    close.dispatch('click');
    check('dismissed with a click or tap: focus is not moved (no phone keyboard popping up)', p.doc.activeElement === close);
}
{
    const p = page();
    p.doc.keyboard = true;
    const t = p.window.showToast('x');
    buttons(t).close.focus();
    p.advance(1000);
    p.doc.body.focus();   // focus entered at once, so all 6 s are still to go
    p.advance(5900);
    check('focus leaving the toast resumes the timer with the time it had left', !t.classList.contains('toast-hide'));
    p.advance(200);
    check('…then it goes', t.classList.contains('toast-hide'));
}
{
    const p = page();
    const t = p.window.showToast('Install the app', { duration: 0 });
    p.advance(60000);
    check('a sticky toast is still sticky', !t.classList.contains('toast-hide'));
}

// ---- A focused toast button can be seen ----------------------------------------
// The global focus ring is blue (the accent in dark mode): 2.9:1 on a default
// toast, 1.5:1 on an error and 1.2:1 on a warning, under the 3:1 a focus
// indicator needs. Toast buttons get a white ring, which must out-rank the
// dark-theme ring rule (html[data-theme="dark"] button:focus-visible).
{
    const css = fs.readFileSync(new URL('../src/css/styles.css', import.meta.url), 'utf8');
    check('toast buttons get a white focus ring',
        /\.toast \.toast-close:focus-visible,\s*\.toast \.toast-action:focus-visible \{ outline-color: #fff; \}/.test(css));
    check('…and the × is not dimmed while focused', /\.toast \.toast-close:focus-visible \{ opacity: 1; \}/.test(css));
    // Specificity: .toast .toast-close:focus-visible = (0,3,0) beats (0,2,2).
    check('the dark-theme ring rule is still the (lower-specificity) one it must beat',
        /html\[data-theme="dark"\] button:focus-visible/.test(css));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll toast checks passed.');
