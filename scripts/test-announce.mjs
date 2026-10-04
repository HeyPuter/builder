import fs from 'node:fs';

// ---- Regression guard: build failures and status changes are spoken ---------
// The chat box isn't a live region (streaming output read out token by token
// would be unusable), so a failed build's error card, the "interrupted —
// Resume" banner and the "reconnecting…" status appeared in silence: a screen
// reader user heard nothing when their build failed or paused. They are now
// sent to window.announce, whose persistent, visually hidden regions exist
// before any message (a region inserted together with its text is mostly not
// announced).
//
// Functional for window.announce (the real code on a small fake DOM); text-level
// for the call sites in app.js.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const helpers = read('../src/js/helpers.js');
const start = helpers.indexOf('const _announcers = {};');
const end = helpers.indexOf('// Returns true if `url` carries a scheme', start);
if (start < 0 || end < 0) throw new Error('could not extract window.announce from helpers.js');
const CODE = helpers.slice(start, end);

function page({ parsed = true } = {}) {
    let now = 0;
    const timers = [];
    const body = { children: [], appendChild(c) { this.children.push(c); c.isConnected = true; return c; } };
    const doc = {
        body: parsed ? body : null, listeners: {},
        createElement: () => ({ attrs: {}, textContent: '', isConnected: false, setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; } }),
        addEventListener: (t, fn) => { (doc.listeners[t] ||= []).push(fn); },
        parse() { doc.body = body; for (const fn of doc.listeners.DOMContentLoaded || []) fn(); },
    };
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
    const window = {};
    new Function('window', 'document', 'setTimeout', 'clearTimeout', CODE)(window, doc, setTimeout, clearTimeout);
    const region = (kind) => body.children.find((c) => c.attrs['data-announcer'] === kind);
    return { window, doc, body, advance, region };
}

{
    const p = page({ parsed: false });
    p.doc.parse();
    const polite = p.region('polite'), assertive = p.region('assertive');
    check('both regions exist once the page is parsed — before any message',
        !!polite && !!assertive && polite.textContent === '' && assertive.textContent === '');
    check('polite is role=status, assertive is role=alert', polite.attrs.role === 'status' && assertive.attrs.role === 'alert');
    check('…and they are visually hidden', polite.attrs.role && /sr-only/.test(polite.className));

    p.window.announce('Error: The AI service is unavailable.', { assertive: true });
    p.advance(60);
    check('an assertive message lands in the alert region', assertive.textContent === 'Error: The AI service is unavailable.' && polite.textContent === '');
    p.window.announce('The AI service is busy — reconnecting… (1/5)');
    p.advance(60);
    check('a polite one in the status region', polite.textContent === 'The AI service is busy — reconnecting… (1/5)');
    p.window.announce('The AI service is busy — reconnecting… (2/5)');
    check('a new message first empties the region (so it reads as new)', polite.textContent === '');
    p.advance(60);
    check('…then shows the new text', polite.textContent === 'The AI service is busy — reconnecting… (2/5)');
    let changes = 0;
    const before = polite.textContent;
    p.window.announce(before);
    p.advance(60);
    if (polite.textContent !== before) changes++;
    check('the same text again while it is still up is not repeated (no double banner announcement)', changes === 0 && polite.textContent === before);
    p.advance(7100);
    check('messages are cleared a little later (nothing stale at the end of the page)', polite.textContent === '' && assertive.textContent === '');
    p.window.announce(before);
    p.advance(60);
    check('…after which the same text can be announced again', polite.textContent === before);
}
{
    const p = page();
    p.window.announce('');
    p.window.announce(null);
    p.advance(100);
    check('empty messages are ignored', p.region('polite').textContent === '');
}

// ---- Call sites ----------------------------------------------------------------
{
    const app = read('../src/js/app.js');
    check('a failed build announces its error (assertive)',
        /appendErrorMessage\(friendlyError\);\s*window\.announce\?\.\('Error: ' \+ friendlyError, \{ assertive: true \}\);/.test(app));
    check('…the usage-limit stop too', /usage-limited-chat[\s\S]{0,400}window\.announce\?\.\('You have reached the current tier/.test(app));
    const resume = app.slice(app.indexOf('function showResumeBanner('), app.indexOf('window.showResumeBanner = showResumeBanner;'));
    check('the interrupted/Resume banner announces itself', /window\.announce\?\.\(\(message \|\| 'The response was interrupted\.'\)/.test(resume));
    const retry = app.slice(app.indexOf('function showRetryStatus('), app.indexOf('function clearRetryStatus('));
    check('the reconnecting status announces itself', /window\.announce\?\.\(text\);/.test(retry));
    const restore = app.slice(app.indexOf('if (message.isError) {'), app.indexOf('if (message.isError) {') + 200);
    check('errors re-rendered from a saved chat are not announced', !/announce/.test(restore));
}
{
    const css = read('../src/css/styles.css');
    check('CSS: .sr-only hides visually but keeps it readable', /\.sr-only \{[^}]*clip-path: inset\(50%\);[^}]*\}/.test(css) && !/\.sr-only \{[^}]*display: none/.test(css));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll announce checks passed.');
