import fs from 'node:fs';
import { transform } from 'esbuild';

// ---- Regression guard for the click-to-edit feature ------------------------
// The element picker used to be a ~2.3KB minified IIFE baked into every page the
// model wrote, living inside the system-prompt template literal. It now ships as
// the SECOND HALF of the hosted runtime script (src/runtime.js, served at
// builder.puter.com/runtime.js) that every generated app loads with one tag. That
// move buys central updatability (the picker works on apps built before it
// existed) and stops the model re-emitting the helper on every build — but it
// spreads the feature across three files that must agree:
//
//   1. src/js/prompt.js — must bake the runtime tag (and must NOT bake the old
//      snippet), while leaving the INLINE error-reporting block untouched. That
//      block deliberately stays inline: it must install before anything else
//      runs and it reports script load failures, so hosting it would let an
//      outage silently blind the post-build verification.
//   2. src/runtime.js half 2 — the bridge itself: dormant until the builder arms
//      it, framed-documents-only, origin-locked, never stuck armed.
//   3. src/js/ui.js — the builder end of the protocol (arm message, readiness
//      ACK, selection intake). Renaming a message type on one side only would
//      break the feature silently, so the strings are checked against each other.
//
// The bridge is executed against a stub DOM in BOTH source and minified form
// (the build mangles identifiers), mirroring scripts/test-badge.mjs.

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const promptSrc = read('../src/js/prompt.js');
const runtimeSrc = read('../src/runtime.js');
const uiSrc = read('../src/js/ui.js');

const RUNTIME_TAG = '<script src="https://builder.puter.com/runtime.js" defer></script>';
const BUILDER_ORIGIN = 'https://builder.puter.com';

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

// ===========================================================================
//  1. The prompt side: runtime tag in, baked snippet out, error block intact
// ===========================================================================

// prompt.js is a classic browser-global script: it assigns window.system_prompt
// and reads window.FEATURE_FLAGS at call time. Evaluate it with a minimal window.
function render(flags) {
    const window = { FEATURE_FLAGS: flags };
    const factory = new Function('window', promptSrc + '\n;return window.system_prompt;');
    const fn = factory(window);
    if (typeof fn !== 'function') throw new Error('window.system_prompt was not defined');
    return fn({ username: 'tester' }, '/tester/AppData/app/chat-xyz');
}

const COMBOS = [
    ['both flags on', { clickToEdit: true, createdWithBadge: true }, true],
    ['click-to-edit only', { clickToEdit: true, createdWithBadge: false }, true],
    ['badge only', { clickToEdit: false, createdWithBadge: true }, true],
    ['both flags off', { clickToEdit: false, createdWithBadge: false }, false],
];

for (const [label, flags, wantsTag] of COMBOS) {
    const p = render(flags);

    // The tag must be baked whenever EITHER half is wanted — click-to-edit with
    // the badge flag off still needs the script, or the picker has no bridge.
    check(`[${label}] runtime tag ${wantsTag ? 'present' : 'absent'}`,
        p.includes(RUNTIME_TAG) === wantsTag);
    if (wantsTag) {
        check(`[${label}] runtime tag appears exactly once`, p.split(RUNTIME_TAG).length === 2);
    }

    // Error/fetch reporting is inline in EVERY state — it can never depend on a
    // flag or on the hosted script.
    check(`[${label}] inline error reporting present`, p.includes("type:'app-error'"));
    check(`[${label}] inline fetch reporting present`, p.includes("type:'fetch-error'"));
    check(`[${label}] inline script-load-failure reporting present`,
        p.includes("message:'Failed to load script'"));

    // The old baked picker must be gone for good — no leftovers of any kind.
    check(`[${label}] no baked picker snippet`,
        !p.includes('puter-select-mode') && !p.includes('puter-element-selected') &&
        !p.includes('getBoundingClientRect'));

    // No unresolved template placeholder survived the refactor.
    check(`[${label}] no unresolved \${…} placeholder`, !p.includes('${'));
}

// The inline error/fetch block must be byte-identical across every flag combo:
// nothing about the runtime tag may perturb the app's own error reporting.
function errorBlock(p) {
    const start = p.indexOf('window.onerror=');
    const sig = 'return p;};})();';
    const end = p.indexOf(sig, start);
    if (start < 0 || end < 0) throw new Error('error-reporting block not found');
    return p.slice(start, end + sig.length);
}
const blocks = COMBOS.map(([, flags]) => errorBlock(render(flags)));
check('inline error/fetch block byte-identical across all flag combos',
    blocks.every((b) => b === blocks[0]));

// Sanity: the prompt still renders with the per-project app dir embedded.
check('appDir embedded in rendered prompt',
    render({ clickToEdit: true, createdWithBadge: true }).includes('/tester/AppData/app/chat-xyz'));

// ===========================================================================
//  2. The bridge: behavior against a stub DOM (source AND minified)
// ===========================================================================
// src/runtime.js only touches the globals injected below. Half 1 (the badge) bails
// out on its first line in a framed document, so a framed run needs no
// badge-side stubs at all — if half 1 ever reached for localStorage/customElements
// before that guard, these runs would throw ReferenceError and fail loudly.

function makeStyle() {
    return { cssText: '', left: '', top: '', width: '', height: '', cursor: '' };
}

function makeDom(srcText, opts = {}) {
    const winListeners = {};
    const docListeners = {};
    const posted = [];

    class Node {
        constructor(tag, props = {}) {
            this.tagName = String(tag).toUpperCase();
            this.nodeType = 1;
            this.id = props.id || '';
            this.className = 'className' in props ? props.className : '';
            this.textContent = props.text || '';
            this.outerHTML = props.html || '';
            this.children = [];
            this.parentNode = null;
            this.style = makeStyle();
            this.rect = props.rect || { left: 11, top: 22, width: 33, height: 44 };
        }
        getBoundingClientRect() { return this.rect; }
        appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
        removeChild(child) {
            const i = this.children.indexOf(child);
            if (i >= 0) this.children.splice(i, 1);
            child.parentNode = null;
            return child;
        }
    }

    const parentWin = {
        postMessage(msg, targetOrigin) { posted.push({ msg, targetOrigin }); },
    };

    const win = {
        parent: parentWin,
        addEventListener(type, fn) { (winListeners[type] = winListeners[type] || []).push(fn); },
        removeEventListener(type, fn) {
            const a = winListeners[type] || [];
            const i = a.indexOf(fn);
            if (i >= 0) a.splice(i, 1);
        },
    };
    win.self = win;
    // Framed by default — that's the builder's preview pane. topLevel models a
    // published app someone is actually using.
    win.top = opts.topLevel ? win : { notSelf: true };

    const documentElement = new Node('html');
    const body = new Node('body');
    documentElement.appendChild(body);

    const document = {
        readyState: 'complete',
        documentElement,
        body,
        createElement(tag) { return new Node(tag); },
        addEventListener(type, fn) { (docListeners[type] = docListeners[type] || []).push(fn); },
        removeEventListener(type, fn) {
            const a = docListeners[type] || [];
            const i = a.indexOf(fn);
            if (i >= 0) a.splice(i, 1);
        },
    };

    const env = {
        window: win, document, parentWin, posted, Node,
        docListeners, winListeners, documentElement, body,
        exec: () => new Function('window', 'document', srcText)(win, document),
        // Deliver a postMessage to the bridge. Defaults are a legitimate arming
        // message from the real builder.
        send: (data, { source = parentWin, origin = BUILDER_ORIGIN } = {}) => {
            (winListeners.message || []).slice().forEach((fn) => fn({ source, origin, data }));
        },
        hover: (target) => {
            (docListeners.mousemove || []).slice().forEach((fn) => fn({ target }));
        },
        click: (target) => {
            const calls = { prevented: 0, stopped: 0 };
            const evt = {
                target,
                preventDefault() { calls.prevented++; },
                stopPropagation() { calls.stopped++; },
            };
            (docListeners.click || []).slice().forEach((fn) => fn(evt));
            return calls;
        },
        fireWin: (type) => { (winListeners[type] || []).slice().forEach((fn) => fn({})); },
        armed: () => (docListeners.click || []).length > 0,
        overlay: () => documentElement.children.find((c) => c.tagName === 'DIV') || null,
    };
    return env;
}

// Build: html > body > div#main > ul > li,li,li  and  body > section > p
function makeTree(Node, documentElement, body) {
    const main = new Node('div', { id: 'main' });
    body.appendChild(main);
    const ul = new Node('ul');
    main.appendChild(ul);
    const lis = [0, 1, 2].map((i) => {
        const li = new Node('li', {
            className: 'row r' + i,
            text: 'item ' + i,
            html: '<li class="row r' + i + '">item ' + i + '</li>',
        });
        ul.appendChild(li);
        return li;
    });
    const section = new Node('section');
    body.appendChild(section);
    const p = new Node('p', { text: 'hello', html: '<p>hello</p>' });
    section.appendChild(p);
    return { main, ul, lis, section, p };
}

function runBridgeChecks(label, srcText) {
    let parses = true;
    try { new Function(srcText); } catch (e) { parses = false; console.error(`  ${label} syntax error: ` + e.message); }
    check(`[${label}] runtime.js is valid JavaScript`, parses);

    // --- dormancy -----------------------------------------------------------
    {
        const dom = makeDom(srcText);
        dom.exec();
        check(`[${label}] framed page installs a message listener and nothing else`,
            (dom.winListeners.message || []).length === 1 &&
            (dom.docListeners.click || []).length === 0 &&
            (dom.docListeners.mousemove || []).length === 0);
        check(`[${label}] dormant: no overlay, no cursor change, nothing posted`,
            dom.overlay() === null && dom.body.style.cursor === '' && dom.posted.length === 0);
    }

    // A published app is top-level: the bridge must install NOTHING there.
    {
        const dom = makeDom(srcText, { topLevel: true });
        try { dom.exec(); } catch (e) { /* half 1 needs badge stubs we don't inject */ }
        check(`[${label}] top-level page installs no bridge listener at all`,
            (dom.winListeners.message || []).length === 0 &&
            dom.window.__puterSelectBridge === undefined);
    }

    // Double include (tag twice on the page) → still one bridge.
    {
        const dom = makeDom(srcText);
        dom.exec();
        dom.exec();
        check(`[${label}] double script include still yields a single bridge`,
            (dom.winListeners.message || []).length === 1);
        dom.send({ type: 'puter-select-mode', enabled: true });
        check(`[${label}] double include ACKs once, arms once`,
            dom.posted.length === 1 && (dom.docListeners.click || []).length === 1);
    }

    // --- arming + the readiness handshake ------------------------------------
    {
        const dom = makeDom(srcText);
        dom.exec();
        dom.send({ type: 'puter-select-mode', enabled: true });
        check(`[${label}] arming installs the hover/click listeners`,
            (dom.docListeners.mousemove || []).length === 1 &&
            (dom.docListeners.click || []).length === 1);
        check(`[${label}] arming sets the crosshair cursor`, dom.body.style.cursor === 'crosshair');
        check(`[${label}] arming ACKs with puter-select-ready`,
            dom.posted.length === 1 && dom.posted[0].msg.type === 'puter-select-ready');
        check(`[${label}] ACK is addressed to the arming origin, never '*'`,
            dom.posted[0].targetOrigin === BUILDER_ORIGIN);

        // Re-arming is idempotent (no duplicate listeners).
        dom.send({ type: 'puter-select-mode', enabled: true });
        check(`[${label}] re-arming does not stack listeners`,
            (dom.docListeners.click || []).length === 1);

        // Explicit disarm tears everything down.
        dom.send({ type: 'puter-select-mode', enabled: false });
        check(`[${label}] disarm removes listeners, overlay and cursor`,
            (dom.docListeners.click || []).length === 0 &&
            (dom.docListeners.mousemove || []).length === 0 &&
            dom.overlay() === null && dom.body.style.cursor === '');
    }

    // --- who may arm it -----------------------------------------------------
    // Only the builder. Otherwise any page that iframes a published app could
    // arm the picker and read the markup of whatever the visitor clicks.
    const rejected = [
        ['a third-party embedder', 'https://evil.example'],
        ['a lookalike domain', 'https://evil-puter.com'],
        ['a suffix-attack domain', 'https://puter.com.evil.example'],
        ['a puter.com subdomain over http', 'http://builder.puter.com'],
        ['another generated app (*.puter.site)', 'https://app.puter.site'],
        ['an opaque origin', 'null'],
        ['an empty origin', ''],
    ];
    for (const [why, origin] of rejected) {
        const dom = makeDom(srcText);
        dom.exec();
        dom.send({ type: 'puter-select-mode', enabled: true }, { origin });
        check(`[${label}] refuses to arm for ${why} (${origin || 'empty'})`,
            !dom.armed() && dom.posted.length === 0);
    }
    const accepted = [
        ['the production builder', 'https://builder.puter.com'],
        ['a staging builder host', 'https://builder-staging.puter.com'],
        ['the bare apex', 'https://puter.com'],
        ['a local dev server', 'http://localhost:5173'],
        ['a loopback dev server', 'http://127.0.0.1:8080'],
    ];
    for (const [why, origin] of accepted) {
        const dom = makeDom(srcText);
        dom.exec();
        dom.send({ type: 'puter-select-mode', enabled: true }, { origin });
        check(`[${label}] arms for ${why} (${origin}) and replies to it`,
            dom.armed() && dom.posted.length === 1 && dom.posted[0].targetOrigin === origin);
    }
    // A message from a window that isn't our parent is ignored even if its
    // origin looks right (a nested frame or an opener must not drive us).
    {
        const dom = makeDom(srcText);
        dom.exec();
        dom.send({ type: 'puter-select-mode', enabled: true }, { source: { other: true } });
        check(`[${label}] refuses to arm for a non-parent sender`,
            !dom.armed() && dom.posted.length === 0);
    }
    // Unrelated message types are ignored.
    {
        const dom = makeDom(srcText);
        dom.exec();
        dom.send({ type: 'something-else', enabled: true });
        dom.send(null);
        dom.send({});
        check(`[${label}] ignores unrelated messages`, !dom.armed() && dom.posted.length === 0);
    }

    // --- hovering -----------------------------------------------------------
    {
        const dom = makeDom(srcText);
        dom.exec();
        const t = makeTree(dom.Node, dom.documentElement, dom.body);

        // Not armed: hovering must do nothing at all.
        dom.hover(t.p);
        check(`[${label}] hover before arming does nothing`, dom.overlay() === null);

        dom.send({ type: 'puter-select-mode', enabled: true });
        dom.hover(t.p);
        const ov = dom.overlay();
        check(`[${label}] hover outlines the element on <html>`, !!ov && ov.parentNode === dom.documentElement);
        check(`[${label}] outline never intercepts clicks`,
            !!ov && ov.style.cssText.includes('pointer-events:none') &&
            ov.style.cssText.includes('position:fixed'));
        check(`[${label}] outline is positioned from the element's rect`,
            ov.style.left === '11px' && ov.style.top === '22px' &&
            ov.style.width === '33px' && ov.style.height === '44px');

        // Moving to another element reuses the single overlay node.
        t.lis[0].rect = { left: 1, top: 2, width: 3, height: 4 };
        dom.hover(t.lis[0]);
        check(`[${label}] hover reuses one overlay node and repositions it`,
            dom.documentElement.children.filter((c) => c.tagName === 'DIV').length === 1 &&
            dom.overlay().style.left === '1px');

        // Scroll/resize keep the outline glued to the hovered element.
        t.lis[0].rect = { left: 5, top: 6, width: 7, height: 8 };
        dom.fireWin('scroll');
        check(`[${label}] scroll repositions the outline`, dom.overlay().style.top === '6px');
        t.lis[0].rect = { left: 9, top: 10, width: 11, height: 12 };
        dom.fireWin('resize');
        check(`[${label}] resize repositions the outline`, dom.overlay().style.top === '10px');
    }

    // --- picking ------------------------------------------------------------
    {
        const dom = makeDom(srcText);
        dom.exec();
        const t = makeTree(dom.Node, dom.documentElement, dom.body);
        dom.send({ type: 'puter-select-mode', enabled: true });
        dom.hover(t.lis[1]);
        const calls = dom.click(t.lis[1]);

        const sel = dom.posted[1];
        check(`[${label}] click swallows the event (app never acts on a pick)`,
            calls.prevented === 1 && calls.stopped === 1);
        check(`[${label}] click posts puter-element-selected to the arming origin`,
            !!sel && sel.msg.type === 'puter-element-selected' && sel.targetOrigin === BUILDER_ORIGIN);
        check(`[${label}] payload carries a locator the model can find`,
            sel.msg.selector === 'div#main > ul > li:nth-of-type(2)');
        check(`[${label}] payload carries tag/id/className/text/html`,
            sel.msg.tag === 'li' && sel.msg.id === '' && sel.msg.className === 'row r1' &&
            sel.msg.text === 'item 1' && sel.msg.html === '<li class="row r1">item 1</li>');
        check(`[${label}] one pick per arming: select mode exits itself`,
            !dom.armed() && dom.overlay() === null && dom.body.style.cursor === '');

        // A second click after the pick is not handled (listeners are gone).
        const after = dom.click(t.p);
        check(`[${label}] no further picks after disarming`,
            after.prevented === 0 && dom.posted.length === 2);
    }

    // Selector shapes: id short-circuits the walk; no-id paths chain from <body>.
    {
        const dom = makeDom(srcText);
        dom.exec();
        const t = makeTree(dom.Node, dom.documentElement, dom.body);
        dom.send({ type: 'puter-select-mode', enabled: true });
        dom.click(t.p);
        check(`[${label}] selector chains to <body> when there is no id`,
            dom.posted[1].msg.selector === 'body > section > p');

        const dom2 = makeDom(srcText);
        dom2.exec();
        const t2 = makeTree(dom2.Node, dom2.documentElement, dom2.body);
        dom2.send({ type: 'puter-select-mode', enabled: true });
        dom2.click(t2.main);
        check(`[${label}] selector stops at the nearest id`,
            dom2.posted[1].msg.selector === 'div#main');
    }

    // Oversized content is clipped so a pick can never balloon the next prompt.
    {
        const dom = makeDom(srcText);
        dom.exec();
        const big = new dom.Node('p', { text: 'x'.repeat(500), html: 'y'.repeat(2000) });
        dom.body.appendChild(big);
        dom.send({ type: 'puter-select-mode', enabled: true });
        dom.click(big);
        const m = dom.posted[1].msg;
        check(`[${label}] text is clipped to 200 chars`, m.text === 'x'.repeat(200) + '...');
        check(`[${label}] html is clipped to 800 chars`, m.html === 'y'.repeat(800) + '...');
    }

    // SVG elements expose className as an object, not a string — must not leak it.
    {
        const dom = makeDom(srcText);
        dom.exec();
        const svg = new dom.Node('svg', { className: { baseVal: 'icon' }, text: '', html: '<svg/>' });
        dom.body.appendChild(svg);
        dom.send({ type: 'puter-select-mode', enabled: true });
        dom.click(svg);
        check(`[${label}] non-string className is normalized to ''`, dom.posted[1].msg.className === '');
    }

    // The badge host (half 1) is not in any app file — it can never be picked,
    // and clicking it must not end select mode.
    {
        const dom = makeDom(srcText);
        dom.exec();
        const t = makeTree(dom.Node, dom.documentElement, dom.body);
        const badge = new dom.Node('puter-badge', { html: '<puter-badge></puter-badge>' });
        dom.body.appendChild(badge);
        dom.send({ type: 'puter-select-mode', enabled: true });
        dom.hover(t.p);
        const before = dom.overlay().style.left;
        dom.hover(badge);
        check(`[${label}] hovering the badge leaves the previous outline alone`,
            dom.overlay().style.left === before);
        const calls = dom.click(badge);
        check(`[${label}] clicking the badge picks nothing but still stays armed`,
            dom.posted.length === 1 && calls.prevented === 1 && dom.armed());
    }

    // --- nothing escapes into the host page ---------------------------------
    // This file is cross-origin to the app, so an uncaught error arrives at the
    // app's inline reporter as an unattributable "Script error." the builder
    // cannot filter — it would be handed to the model as a bug in healthy app
    // code. Weird DOM must be swallowed, and a pick must still disarm.
    {
        const dom = makeDom(srcText);
        dom.exec();
        dom.send({ type: 'puter-select-mode', enabled: true });
        // Throws while the payload is being built (inside the try/finally).
        const hostile = new dom.Node('p');
        Object.defineProperty(hostile, 'outerHTML', { get() { throw new Error('boom'); } });
        let threw = false;
        try { dom.click(hostile); } catch (e) { threw = true; }
        check(`[${label}] a throwing pick neither escapes nor leaves us armed`,
            !threw && !dom.armed() && dom.body.style.cursor === '' && dom.overlay() === null);
    }
    {
        const dom = makeDom(srcText);
        dom.exec();
        dom.send({ type: 'puter-select-mode', enabled: true });
        // Throws before the try block even starts (during the badge-host check).
        const hostile = { nodeType: 1, get tagName() { throw new Error('boom'); } };
        let threw = false;
        try { dom.hover(hostile); dom.click(hostile); } catch (e) { threw = true; }
        check(`[${label}] a hostile event target never throws into the page`, !threw);
    }
    {
        const dom = makeDom(srcText);
        dom.exec();
        let threw = false;
        try {
            dom.send({ get type() { throw new Error('boom'); } });
            dom.fireWin('scroll');
        } catch (e) { threw = true; }
        check(`[${label}] a hostile message never throws into the page`, !threw);
    }
}

runBridgeChecks('source', runtimeSrc);

// The build ships this file MINIFIED with identifiers mangled (see closeBundle in
// vite.config.js) — run the identical suite over those bytes.
const { code: minifiedSrc } = await transform(runtimeSrc, {
    minifyWhitespace: true,
    minifySyntax: true,
    minifyIdentifiers: true,
    legalComments: 'none',
    target: 'es2020',
});
runBridgeChecks('minified', minifiedSrc);

// ===========================================================================
//  3. The two ends of the protocol still speak the same words
// ===========================================================================
// The bridge and the builder now live in different files, so a rename on one
// side would silently kill the feature.

check('builder arms select mode with puter-select-mode',
    uiSrc.includes("postMessage({ type: 'puter-select-mode', enabled: active }") &&
    runtimeSrc.includes("'puter-select-mode'"));
check('builder listens for the readiness ACK the bridge sends',
    uiSrc.includes("event.data.type !== 'puter-select-ready'") &&
    runtimeSrc.includes("type: 'puter-select-ready'"));
check('builder listens for the selection the bridge sends',
    uiSrc.includes("event.data.type !== 'puter-element-selected'") &&
    runtimeSrc.includes("type: 'puter-element-selected'"));
// The ACK fallback must outlast a cold-cache fetch of the hosted bridge, or a
// healthy app gets told click-to-edit is unavailable.
check('ACK fallback window leaves room for the network fetch',
    /selectAckTimer = setTimeout\(function\(\) \{[\s\S]*?\}, (\d+)\);/.exec(uiSrc)?.[1] >= 2000);

if (failures) { console.error('\n' + failures + ' check(s) failed'); process.exit(1); }
console.log('\nAll click-to-edit checks passed.');
