import fs from 'node:fs';

// ---- Regression guard: composer dictation (src/js/voice-input.js) -----------
// Runs the real module against a minimal jQuery stand-in and fake
// getUserMedia / MediaRecorder / speech2txt.
//
//   * Starting waits on sign-in and the mic permission prompt. A second click
//     (or a double-click) in that window used to start a SECOND recording: two
//     open microphones and two bars, and Cancel only stopped one — the other
//     kept the mic on and, five minutes later, transcribed itself (billed) into
//     the composer.
//   * A cancel that arrives while the start is still pending (a chat switch,
//     leaving the page) must keep it from going live.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const src = fs.readFileSync(new URL('../src/js/voice-input.js', import.meta.url), 'utf8');
const flush = (ms = 5) => new Promise((r) => setTimeout(r, ms));

// Chainable jQuery stand-in: every method returns the wrapper; $(document).on
// handlers are captured so tests can fire them.
function makeJQ() {
    const handlers = [];
    const counts = { bars: 0, removed: 0 };
    function wrap(tag) {
        const el = { focus() {}, getContext() { return null; }, clientWidth: 100, clientHeight: 20, closest: () => null };
        const w = new Proxy({ 0: el, length: 1 }, {
            get(t, k) {
                if (k in t) return t[k];
                if (k === 'then' || typeof k === 'symbol') return undefined;
                return (...args) => {
                    if (k === 'on') { handlers.push(args); return w; }
                    if (k === 'remove' && tag.includes('voice-recorder')) counts.removed++;
                    if ((k === 'prop' || k === 'attr' || k === 'data') && args.length === 1) return k === 'prop' ? false : undefined;
                    if ((k === 'text' || k === 'val') && args.length === 0) return '';
                    if (k === 'hasClass' || k === 'is') return false;
                    return w;
                };
            },
        });
        return w;
    }
    const $ = (x) => {
        if (typeof x === 'function') return undefined; // $(ready) — not needed here
        const tag = typeof x === 'string' ? x : 'obj';
        if (tag.includes('class="voice-recorder"')) counts.bars++;
        return wrap(tag);
    };
    const fire = (evt, sel, e = { preventDefault() {}, stopPropagation() {} }) => {
        for (const args of handlers) {
            const [ev, s, fn] = typeof args[1] === 'function' ? [args[0], null, args[1]] : args;
            if (ev === evt && (s || null) === (sel || null)) fn.call({}, e);
        }
    };
    return { $, fire, counts };
}

function setup() {
    const { $, fire, counts } = makeJQ();
    const streams = [], pendingMic = [], recorders = [];
    const navigator = { mediaDevices: { getUserMedia: () => new Promise((res) => pendingMic.push(() => {
        const s = { stopped: 0, getTracks() { return [{ stop: () => { s.stopped++; } }]; } };
        streams.push(s); res(s);
    })) } };
    class MediaRecorder {
        static isTypeSupported(t) { return t === 'audio/webm'; }
        constructor(stream, o) { this.state = 'inactive'; this.mimeType = o && o.mimeType; this.l = {}; recorders.push(this); }
        addEventListener(ev, fn) { (this.l[ev] ||= []).push(fn); }
        start() { this.state = 'recording'; }
        stop() {
            this.state = 'inactive';
            (this.l.dataavailable || []).forEach((f) => f({ data: new Blob([new Uint8Array(9000)]) }));
            setTimeout(() => (this.l.stop || []).forEach((f) => f()));
        }
    }
    const ta = { value: '', selectionStart: 0, selectionEnd: 0, focus() {}, setSelectionRange() {} };
    const stt = { calls: 0, impl: async () => 'hello there' };
    const doc = {
        modalOpen: false,
        activeElement: null,
        querySelector(sel) { return sel.includes('aria-modal') ? (this.modalOpen ? {} : null) : ta; },
    };
    const win = { isSecureContext: true, MediaRecorder, addEventListener() {}, showToast() {}, announce() {}, matchMedia: () => ({ matches: false }) };
    const realNow = Date.now;
    let offset = 0;
    const clock = { advance(ms) { offset += ms; } };
    const DateStub = { now: () => realNow() + offset };
    new Function('window', 'navigator', '$', 'MediaRecorder', 'document', 'puter', 'localStorage', 'Date', src)(
        win, navigator, $, MediaRecorder, doc,
        { ai: { speech2txt: (...a) => { stt.calls++; return stt.impl(...a); } } },
        { getItem: () => null }, DateStub,
    );
    const setSpeech = (fn) => { stt.impl = fn; };
    return { win, fire, counts, streams, pendingMic, recorders, ta, stt, clock, setSpeech, doc };
}

// --- A double-click starts one recording, not two ---------------------------
{
    const t = setup();
    t.fire('click', '.voice-input-button');
    t.fire('click', '.voice-input-button');
    await flush();
    check('a double-click asks for the microphone once', t.pendingMic.length === 1, 'getUserMedia calls: ' + t.pendingMic.length);
    t.pendingMic.forEach((f) => f());
    await flush();
    check('one recorder and one bar', t.recorders.length === 1 && t.counts.bars === 1, `recorders ${t.recorders.length}, bars ${t.counts.bars}`);
    t.win.VoiceInput.cancel();
    await flush();
    check('cancel releases every microphone that was opened', t.streams.every((s) => s.stopped > 0));
    check('nothing is left recording', !t.win.VoiceInput.isRecording());
}

// --- A cancel while the permission prompt is up keeps it from going live -----
{
    const t = setup();
    t.fire('click', '.voice-input-button');
    await flush();
    t.win.VoiceInput.cancel(); // e.g. the user switched chats or left the page
    t.pendingMic.forEach((f) => f()); // permission granted afterwards
    await flush();
    check('a start cancelled while pending never shows a bar', t.counts.bars === 0);
    check('…and releases the microphone it was granted', t.streams.length === 1 && t.streams[0].stopped > 0);
    check('…and is not recording', !t.win.VoiceInput.isRecording());
    t.fire('click', '.voice-input-button');
    await flush();
    check('a new click after that starts normally', t.pendingMic.length === 2);
}

// --- The normal path still works --------------------------------------------
{
    const t = setup();
    t.fire('click', '.voice-input-button');
    await flush();
    t.pendingMic.forEach((f) => f());
    await flush();
    check('recording', t.win.VoiceInput.isRecording());
    t.clock.advance(2000);
    t.fire('click', '.vr-done');
    await flush(20);
    check('Done transcribes once', t.stt.calls === 1);
    check('the transcript lands in the composer', t.ta.value === 'hello there', JSON.stringify(t.ta.value));
    check('the microphone is released', t.streams[0].stopped > 0);
    check('the bar is removed', t.counts.removed >= 1 && !t.win.VoiceInput.isRecording());
}

// --- Escape belongs to whatever is on top -----------------------------------
{
    const t = setup();
    t.fire('click', '.voice-input-button');
    await flush();
    t.pendingMic.forEach((f) => f());
    await flush();
    const esc = (extra = {}) => ({ key: 'Escape', preventDefault() {}, stopPropagation() {}, isDefaultPrevented: () => false, ...extra });
    t.doc.modalOpen = true;
    t.fire('keydown', null, esc());
    await flush();
    check('Escape with a modal dialog open leaves the recording alone', t.win.VoiceInput.isRecording());
    t.doc.modalOpen = false;
    t.fire('keydown', null, esc({ isDefaultPrevented: () => true }));
    await flush();
    check('Escape already handled (the lightbox) leaves the recording alone', t.win.VoiceInput.isRecording());
    t.doc.activeElement = { closest: (sel) => (sel.includes('[role="dialog"]') ? {} : null) };
    t.fire('keydown', null, esc());
    await flush();
    check('Escape inside a focused popover leaves the recording alone', t.win.VoiceInput.isRecording());
    t.doc.activeElement = null;
    t.fire('keydown', null, esc());
    await flush();
    check('a plain Escape still cancels', !t.win.VoiceInput.isRecording() && t.streams[0].stopped > 0);
}

// --- Cancel during transcription tears down once --------------------------
// finish() has already torn down; a second AudioContext.close() rejects, which
// surfaced as an uncaught promise error.
{
    const t = setup();
    let closes = 0;
    const unhandled = [];
    const onUnhandled = (e) => unhandled.push(e);
    process.on('unhandledRejection', onUnhandled);
    t.win.AudioContext = class {
        constructor() { this.closed = false; }
        createMediaStreamSource() { return { connect() {} }; }
        createAnalyser() { return { fftSize: 0, getByteTimeDomainData() {} }; }
        close() { closes++; if (this.closed) return Promise.reject(new Error('InvalidStateError')); this.closed = true; return Promise.resolve(); }
    };
    let release;
    t.setSpeech(() => new Promise((res) => { release = res; }));
    t.fire('click', '.voice-input-button');
    await flush();
    t.pendingMic.forEach((f) => f());
    await flush();
    t.clock.advance(2000);
    t.fire('click', '.vr-done');
    await flush(20);
    t.fire('click', '.vr-cancel'); // cancel while transcribing
    await flush(20);
    release('late text');
    await flush(20);
    process.off('unhandledRejection', onUnhandled);
    check('the audio context is closed exactly once', closes === 1, 'closes: ' + closes);
    check('no unhandled rejection', unhandled.length === 0, String(unhandled[0]));
    check('a cancelled transcription inserts nothing', t.ta.value === '');
}

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall voice input checks passed');
