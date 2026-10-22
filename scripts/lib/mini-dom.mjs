// Test helper: a tiny DOM + jQuery stand-in, just enough to run the real
// src/js/media.js card code (buildCard / pendingCard / fillCard / the lightbox)
// in node. Elements keep real attributes, classes, children and text, so a test
// can inspect what the code built; events are fired by hand (el.fire('load')).
// Selectors: comma lists of compounds (tag, .class, [attr], [attr="v"]) with
// descendant combinators — what media.js uses, nothing more.

class Text {
    constructor(data) { this.nodeType = 3; this.data = String(data); this.parentNode = null; }
    get textContent() { return this.data; }
}

export class El {
    constructor(tag) {
        this.nodeType = 1;
        this.tagName = String(tag).toUpperCase();
        this.attrs = new Map();
        this.childNodes = [];
        this.parentNode = null;
        this.listeners = {};
        this.jqData = {};
        this.props = {};
        this.scrollTop = 0;
        const self = this;
        this.style = { setProperty(k, v) { self.style[k] = v; } };
        this.classList = {
            add: (...c) => c.forEach(x => self.addClass(x)),
            remove: (...c) => c.forEach(x => self.removeClass(x)),
            contains: (c) => self.hasClass(c),
            toggle: (c, on) => { const v = on === undefined ? !self.hasClass(c) : !!on; v ? self.addClass(c) : self.removeClass(c); return v; },
        };
    }
    get children() { return this.childNodes.filter(n => n.nodeType === 1); }
    get textContent() { return this.childNodes.map(n => n.textContent).join(''); }
    set textContent(v) { this.childNodes.forEach(n => { n.parentNode = null; }); this.childNodes = []; if (v !== '') this.appendChild(new Text(v)); }
    get className() { return this.attrs.get('class') || ''; }
    set className(v) { this.attrs.set('class', String(v)); }
    get classes() { return this.className.split(/\s+/).filter(Boolean); }
    hasClass(c) { return this.classes.includes(c); }
    addClass(c) { const s = new Set(this.classes); String(c).split(/\s+/).filter(Boolean).forEach(x => s.add(x)); this.attrs.set('class', [...s].join(' ')); }
    removeClass(c) { const rm = String(c).split(/\s+/); this.attrs.set('class', this.classes.filter(x => !rm.includes(x)).join(' ')); }
    getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
    setAttribute(k, v) { this.attrs.set(k, String(v)); }
    removeAttribute(k) { this.attrs.delete(k); }
    hasAttribute(k) { return this.attrs.has(k); }
    appendChild(n) { if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; this.childNodes.push(n); return n; }
    insertAfter(n, ref) { if (n.parentNode) n.parentNode.removeChild(n); n.parentNode = this; this.childNodes.splice(this.childNodes.indexOf(ref) + 1, 0, n); }
    removeChild(n) { const i = this.childNodes.indexOf(n); if (i >= 0) this.childNodes.splice(i, 1); n.parentNode = null; return n; }
    remove() { if (this.parentNode) this.parentNode.removeChild(this); }
    replaceWith(n) { const p = this.parentNode; if (!p) return; p.insertAfter(n, this); p.removeChild(this); }
    contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
    descendants() { const out = []; const walk = (e) => e.children.forEach(c => { out.push(c); walk(c); }); walk(this); return out; }
    querySelectorAll(sel) { return this.descendants().filter(e => matches(e, sel)); }
    querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
    matches(sel) { return matches(this, sel); }
    closest(sel) { for (let x = this; x && x.nodeType === 1; x = x.parentNode) if (matches(x, sel)) return x; return null; }
    addEventListener(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
    removeEventListener(ev, fn) { this.listeners[ev] = (this.listeners[ev] || []).filter(f => f !== fn); }
    fire(ev, extra = {}) { const e = { type: ev, target: this, preventDefault() {}, stopPropagation() {}, ...extra }; [...(this.listeners[ev] || [])].forEach(f => f.call(this, e)); return e; }
    focus() { if (this.ownerDocument) this.ownerDocument.activeElement = this; }
}

function compoundMatches(el, c) {
    const m = c.match(/^([a-z0-9-]*)((?:\.[\w-]+)*)((?:\[[^\]]+\])*)$/i);
    if (!m) throw new Error('mini-dom: unsupported selector ' + c);
    if (m[1] && el.tagName !== m[1].toUpperCase()) return false;
    for (const cls of (m[2].match(/\.[\w-]+/g) || [])) if (!el.hasClass(cls.slice(1))) return false;
    for (const a of (m[3].match(/\[[^\]]+\]/g) || [])) {
        const am = a.match(/^\[([\w-]+)(?:="?([^"]*)"?)?\]$/);
        if (!el.hasAttribute(am[1])) return false;
        if (am[2] !== undefined && el.getAttribute(am[1]) !== am[2]) return false;
    }
    return true;
}
function matches(el, sel) {
    return String(sel).split(',').some(part => {
        const chain = part.trim().split(/\s+/);
        if (!compoundMatches(el, chain[chain.length - 1])) return false;
        let x = el.parentNode, i = chain.length - 2;
        while (i >= 0 && x && x.nodeType === 1) { if (compoundMatches(x, chain[i])) i--; x = x.parentNode; }
        return i < 0;
    });
}

const VOID = new Set(['img', 'input', 'br', 'hr', 'meta', 'source']);
export function parseHTML(html) {
    const root = new El('#fragment');
    let cur = root;
    const re = /<\/([\w-]+)\s*>|<([\w-]+)((?:\s+[\w:-]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|([^<]+)/g;
    let m;
    while ((m = re.exec(html))) {
        if (m[1]) { if (cur.parentNode) cur = cur.parentNode; continue; }
        if (m[5] !== undefined) { if (m[5].trim() || cur !== root) cur.appendChild(new Text(m[5])); continue; }
        const el = new El(m[2]);
        const attrRe = /([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
        let a;
        while ((a = attrRe.exec(m[3] || ''))) el.setAttribute(a[1], a[2] ?? a[3] ?? a[4] ?? '');
        cur.appendChild(el);
        if (!m[4] && !VOID.has(m[2].toLowerCase())) cur = el;
    }
    return root.childNodes.filter(n => n.nodeType === 1);
}

// A document with <body>, plus a jQuery stand-in bound to it.
export function makeDom() {
    const document = new El('#document');
    const html = new El('html');
    const body = new El('body');
    document.appendChild(html);
    html.appendChild(body);
    document.body = body;
    document.documentElement = html;
    document.activeElement = body;
    const own = (els) => { els.forEach(e => { e.ownerDocument = document; e.descendants().forEach(d => { d.ownerDocument = document; }); }); return els; };
    document.createElement = (t) => own([new El(t)])[0];
    const delegated = []; // [events, selector|null, fn]

    class Q {
        constructor(els) { this.els = els.filter(Boolean); this.length = this.els.length; this.els.forEach((e, i) => { this[i] = e; }); }
        each(fn) { this.els.forEach((e, i) => fn.call(e, i, e)); return this; }
        toArray() { return [...this.els]; }
        find(sel) { return new Q([...new Set(this.els.flatMap(e => e.querySelectorAll(sel)))]); }
        closest(sel) { return new Q([...new Set(this.els.map(e => e.closest(sel)))]); }
        is(sel) { return this.els.some(e => e.nodeType === 1 && matches(e, sel)); }
        addClass(c) { this.els.forEach(e => e.addClass(c)); return this; }
        removeClass(c) { this.els.forEach(e => e.removeClass(c)); return this; }
        hasClass(c) { return this.els.some(e => e.hasClass(c)); }
        attr(k, v) {
            if (v === undefined) return this.els[0] ? (this.els[0].getAttribute(k) ?? undefined) : undefined;
            this.els.forEach(e => e.setAttribute(k, v)); return this;
        }
        removeAttr(k) { this.els.forEach(e => e.removeAttribute(k)); return this; }
        prop(k, v) {
            if (v === undefined) return this.els[0] ? (k in this.els[0].props ? this.els[0].props[k] : this.els[0].hasAttribute(k)) : undefined;
            this.els.forEach(e => { e.props[k] = v; if (v === true) e.setAttribute(k, ''); else if (v === false) e.removeAttribute(k); }); return this;
        }
        data(k, v) { if (v === undefined) return this.els[0] ? this.els[0].jqData[k] : undefined; this.els.forEach(e => { e.jqData[k] = v; }); return this; }
        text(v) { if (v === undefined) return this.els.map(e => e.textContent).join(''); this.els.forEach(e => { e.textContent = String(v); }); return this; }
        empty() { this.els.forEach(e => { e.textContent = ''; }); return this; }
        append(...items) {
            const target = this.els[0];
            for (const it of items) for (const n of toNodes(it)) target.appendChild(n);
            return this;
        }
        after(x) { const e = this.els[0]; for (const n of toNodes(x).reverse()) e.parentNode.insertAfter(n, e); return this; }
        remove() { this.els.forEach(e => e.remove()); return this; }
        detach() { return this.remove(); }
        scrollTop(v) {
            const e = this.els[0];
            if (v === undefined) return e ? e.scrollTop : undefined;
            if (e) e.scrollTop = Math.max(0, Math.min(v, (e.scrollHeight ?? 0) - (e.clientHeight ?? 0)));
            return this;
        }
        on(events, sel, fn) {
            if (typeof sel === 'function') { fn = sel; sel = null; }
            if (this.els[0] === document) { delegated.push([events.split(/\s+/), sel, fn]); return this; }
            this.els.forEach(e => events.split(/\s+/).forEach(ev => e.addEventListener(ev, fn)));
            return this;
        }
        // jQuery's .one: once PER event type.
        one(events, fn) {
            this.els.forEach(e => events.split(/\s+/).forEach(ev => {
                const once = function (evt) { e.removeEventListener(ev, once); return fn.call(this, evt); };
                e.addEventListener(ev, once);
            }));
            return this;
        }
        trigger(ev) { this.els.forEach(e => e.fire(ev)); return this; }
    }
    function toNodes(x) {
        if (x == null) return [];
        if (x instanceof Q) return x.toArray();
        if (x instanceof El || x instanceof Text) return [x];
        if (typeof x === 'string') return x.trim().startsWith('<') ? own(parseHTML(x)) : [new Text(x)];
        return [];
    }
    function $(x) {
        if (typeof x === 'function') return undefined;
        if (x instanceof Q) return x;
        if (x instanceof El) return new Q([x]);
        if (x === document || x === undefined || x === null) return new Q(x ? [x] : []);
        if (typeof x === 'string') {
            if (x.trim().startsWith('<')) return new Q(own(parseHTML(x)));
            return new Q(document.querySelectorAll(x));
        }
        return new Q([x]);
    }
    // Fire an event on `el`, running its own listeners and then the
    // document-delegated ones whose selector matches it or an ancestor.
    function dispatch(el, type, extra = {}) {
        const e = el.fire(type, extra);
        for (const [evs, sel, fn] of delegated) {
            if (!evs.includes(type)) continue;
            if (!sel) { fn.call(document, e); continue; }
            const hit = el.closest(sel);
            if (hit) fn.call(hit, e);
        }
        return e;
    }
    return { document, body, $, dispatch, El, parseHTML };
}
