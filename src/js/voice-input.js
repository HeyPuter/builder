// voice-input.js — dictate a message instead of typing it.
//
// The mic button (next to Send) records with MediaRecorder, then transcribes
// with puter.ai.speech2txt and inserts the text at the caret. It never sends
// by itself: the user reviews and sends as usual.
//
// While recording, a bar over the composer shows a Cancel button, a live
// waveform, an elapsed timer and a Done button (focused, so Enter or Space
// finishes). Escape cancels. Recording stops on its own after MAX_SECONDS.
// The button only appears where recording is possible (a secure context with
// getUserMedia and MediaRecorder).

(function () {
    'use strict';

    const MAX_SECONDS = 5 * 60;
    const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    const X_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
    const CHECK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
    const SPIN_SVG = '<svg class="vr-spin" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-6.2-8.6"/></svg>';

    function supported() {
        return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
    }
    function pickMime() {
        for (const t of MIME_TYPES) { try { if (MediaRecorder.isTypeSupported(t)) return t; } catch (e) { /* ignore */ } }
        return '';
    }
    const reduceMotion = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    let rec = null; // the one active recording
    // Set from the click until the recording is up: sign-in and the mic
    // permission prompt both take a while, and a second click (or a
    // double-click) in that window started a second, orphaned recording.
    let starting = null;

    function barHtml() {
        return `<div class="voice-recorder" role="group" aria-label="Voice recording">`
            + `<button type="button" class="vr-btn vr-cancel" title="Cancel (Esc)" aria-label="Cancel recording">${X_SVG}</button>`
            + `<div class="vr-middle"><span class="vr-dot" aria-hidden="true"></span><canvas class="vr-wave" aria-hidden="true"></canvas><span class="vr-status shimmer" hidden>Transcribing…</span></div>`
            + `<span class="vr-time" aria-hidden="true">0:00</span>`
            + `<button type="button" class="vr-btn vr-done" title="Done" aria-label="Stop and transcribe">${CHECK_SVG}</button>`
            + `</div>`;
    }

    // Live waveform: a scrolling history of input levels, drawn as rounded
    // bars that fill the canvas width.
    function startWave(r) {
        const canvas = r.$bar.find('.vr-wave')[0];
        const ctx = canvas.getContext('2d');
        const levels = [];
        const data = new Uint8Array(r.analyser.fftSize);
        const draw = () => {
            if (!rec || rec !== r || r.stopped) return;
            const dpr = window.devicePixelRatio || 1;
            const w = canvas.clientWidth, h = canvas.clientHeight;
            if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
                canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
            }
            r.analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
            const level = Math.min(1, Math.sqrt(sum / data.length) * 4);
            const bar = 3, gap = 2, n = Math.max(1, Math.floor(w / (bar + gap)));
            levels.push(level);
            while (levels.length > n) levels.shift();
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = getComputedStyle(canvas).color;
            const offset = w - levels.length * (bar + gap);
            levels.forEach((lv, i) => {
                const bh = Math.max(2, lv * (h - 2));
                const x = offset + i * (bar + gap), y = (h - bh) / 2;
                if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, bar, bh, 1.5); ctx.fill(); }
                else ctx.fillRect(x, y, bar, bh);
            });
            // Remember which kind of handle this is: frame and timer ids are
            // separate counters, so cancelling both could stop someone else's.
            r.rafIsTimer = reduceMotion();
            r.raf = r.rafIsTimer ? setTimeout(draw, 250) : requestAnimationFrame(draw);
        };
        draw();
    }

    // Runs once per recording: Cancel during transcription comes after
    // finish() already tore down, and closing a closed AudioContext rejects.
    function teardown(r) {
        if (r.tornDown) return;
        r.tornDown = true;
        r.stopped = true;
        clearInterval(r.timer);
        if (r.raf) { if (r.rafIsTimer) clearTimeout(r.raf); else cancelAnimationFrame(r.raf); }
        try { r.stream.getTracks().forEach(t => t.stop()); } catch (e) { /* ignore */ }
        try { r.audioCtx && Promise.resolve(r.audioCtx.close()).catch(() => {}); } catch (e) { /* ignore */ }
    }

    // Whether focus may go back to the composer, by the rule every other
    // autofocus in the app follows. Not on phones: focusing the textarea pops
    // the on-screen keyboard up over the chat after a Cancel tap, or seconds
    // after Done when the transcript arrives. And not when the user has moved
    // on to another field meanwhile (composerMayTakeFocus): a transcript that
    // landed while they typed in the sidebar search pulled the cursor into the
    // composer mid-word. Called once the bar is gone, so focus that was on it
    // reads as <body>.
    function mayFocusComposer() {
        if (window.isMobileViewport?.()) return false;
        return typeof composerMayTakeFocus !== 'function' || composerMayTakeFocus();
    }

    function close(r, { focusComposer = true } = {}) {
        if (rec === r) rec = null;
        (r.inerted || []).forEach((el) => { el.inert = false; });
        r.$bar.remove();
        $('.chat-input').removeClass('recording transcribing');
        $('.voice-input-button').attr('aria-expanded', 'false');
        if (focusComposer && mayFocusComposer()) $('.chat-input-message').trigger('focus');
    }

    async function start() {
        if (rec || starting) return;
        const pending = starting = { cancelled: false };
        try { await begin(pending); }
        finally { if (starting === pending) starting = null; }
    }

    async function begin(pending) {
        // Transcription needs a Puter account; ask before the mic, not after.
        try { if (typeof ensureAuthenticated === 'function') await ensureAuthenticated(); }
        catch (e) { return; }
        if (pending.cancelled) return;
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        } catch (e) {
            if (pending.cancelled) return;
            const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
            const missing = e && e.name === 'NotFoundError';
            window.showToast?.(denied ? 'Microphone access is blocked. Allow it in your browser’s site settings to dictate.'
                : missing ? 'No microphone was found.' : 'Couldn’t start the microphone.', { type: 'error', key: 'voice-input' });
            return;
        }
        // Cancelled while the permission prompt was up: release the mic at once.
        if (pending.cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        const mimeType = pickMime();
        let recorder;
        try { recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined); }
        catch (e) { stream.getTracks().forEach(t => t.stop()); window.showToast?.('Recording isn’t supported in this browser.', { type: 'error' }); return; }

        const $input = $('.chat-input').first();
        const $bar = $(barHtml());
        $input.append($bar).addClass('recording');
        // The bar covers the composer, but its controls stayed in the Tab
        // order: Shift+Tab from Cancel reached the hidden textarea (typing
        // into it unseen) and a Send that started a turn mid-recording. Make
        // them inert until the bar closes — only those this set, so an inert
        // set elsewhere is left as it was.
        const inerted = $input.children().not($bar).toArray().filter((el) => !el.inert);
        inerted.forEach((el) => { el.inert = true; });
        $('.voice-input-button').attr('aria-expanded', 'true');
        const r = {
            stream, recorder, $bar, inerted, chunks: [], started: Date.now(), stopped: false, cancelled: false,
            chatId: typeof currentChatId !== 'undefined' ? currentChatId : null, mimeType: recorder.mimeType || mimeType,
        };
        rec = r;
        recorder.addEventListener('dataavailable', (e) => { if (e.data && e.data.size) r.chunks.push(e.data); });
        recorder.start(250);

        try {
            r.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const src = r.audioCtx.createMediaStreamSource(stream);
            r.analyser = r.audioCtx.createAnalyser();
            r.analyser.fftSize = 1024;
            src.connect(r.analyser);
            startWave(r);
        } catch (e) { /* the waveform is decoration only */ }

        r.timer = setInterval(() => {
            const s = (Date.now() - r.started) / 1000;
            $bar.find('.vr-time').text(fmt(s));
            if (s >= MAX_SECONDS) {
                window.showToast?.('Recording stopped at 5 minutes.', { type: 'info' });
                finish(r);
            }
        }, 250);
        $bar.find('.vr-done')[0].focus();
        window.announce?.('Recording. Press Escape to cancel.');
    }

    function stopRecorder(r) {
        return new Promise((resolve) => {
            if (r.recorder.state === 'inactive') return resolve();
            r.recorder.addEventListener('stop', () => resolve(), { once: true });
            try { r.recorder.stop(); } catch (e) { resolve(); }
        });
    }

    function cancel(r, { focusComposer = true } = {}) {
        if (!r) {
            // Nothing recording yet, but a start may be waiting on sign-in or
            // the permission prompt: make sure it never goes live.
            if (starting) starting.cancelled = true;
            return;
        }
        r.cancelled = true;
        stopRecorder(r).finally(() => teardown(r));
        close(r, { focusComposer });
        window.announce?.('Recording cancelled');
    }

    async function finish(r) {
        if (!r || r.finishing) return;
        r.finishing = true;
        await stopRecorder(r);
        teardown(r);
        if (r.cancelled) return;
        const seconds = (Date.now() - r.started) / 1000;
        const blob = new Blob(r.chunks, { type: (r.mimeType || 'audio/webm').split(';')[0] });
        if (seconds < 0.6 || blob.size < 1500) {
            close(r);
            window.showToast?.('That was too short — hold on a little longer while you speak.', { type: 'info', key: 'voice-input' });
            return;
        }
        // Transcribing: keep the bar (Cancel still works), swap the waveform
        // for a status line.
        $('.chat-input').addClass('transcribing');
        r.$bar.find('.vr-wave, .vr-dot').attr('hidden', '');
        r.$bar.find('.vr-status').removeAttr('hidden');
        r.$bar.find('.vr-done').prop('disabled', true).html(SPIN_SVG).attr('aria-label', 'Transcribing');
        r.$bar.find('.vr-cancel').attr('aria-label', 'Cancel transcription')[0].focus();
        window.announce?.('Transcribing');
        let text = '';
        try {
            const testMode = (() => { try { return !!localStorage.getItem('debugMediaTestMode'); } catch (e) { return false; } })();
            const result = await puter.ai.speech2txt(blob, { response_format: 'text', ...(testMode && { test_mode: true }) });
            text = String(typeof result === 'string' ? result : (result && result.text) || '').trim();
        } catch (e) {
            if (r.cancelled) return;
            close(r);
            const funds = e && (e.code === 'insufficient_funds' || (e.error && e.error.code === 'insufficient_funds'));
            window.showToast?.(funds ? 'Not enough Puter credits to transcribe.' : 'Couldn’t transcribe that — try again.', { type: 'error', key: 'voice-input' });
            return;
        }
        if (r.cancelled) return;
        // The user moved to another chat meanwhile: don't drop text into it.
        if (typeof currentChatId !== 'undefined' && r.chatId !== currentChatId) { close(r, { focusComposer: false }); return; }
        close(r, { focusComposer: false });
        if (!text) {
            window.showToast?.('No speech was detected.', { type: 'info', key: 'voice-input' });
            if (mayFocusComposer()) $('.chat-input-message').trigger('focus');
            return;
        }
        insertAtCaret(text);
        window.announce?.('Transcript added to your message');
    }

    function insertAtCaret(text) {
        const ta = document.querySelector('.chat-input-message');
        if (!ta) return;
        const start = ta.selectionStart ?? ta.value.length;
        const end = ta.selectionEnd ?? ta.value.length;
        const before = ta.value.slice(0, start), after = ta.value.slice(end);
        const pre = before && !/\s$/.test(before) ? ' ' : '';
        const post = after && !/^\s/.test(after) ? ' ' : '';
        ta.value = before + pre + text + post + after;
        const caret = (before + pre + text).length;
        if (mayFocusComposer()) ta.focus();
        try { ta.setSelectionRange(caret, caret); } catch (e) { /* ignore */ }
        if (typeof autoResizeTextarea === 'function') autoResizeTextarea(ta);
        // Same path as typing: the Send button state and the saved draft follow.
        $(ta).trigger('input');
    }

    $(document).on('click', '.voice-input-button', function (e) {
        e.preventDefault();
        if ($(this).prop('disabled')) return;
        if (rec) { finish(rec); return; }
        if (starting) return;
        start();
    });
    $(document).on('click', '.vr-cancel', () => cancel(rec));
    $(document).on('click', '.vr-done', () => finish(rec));
    // Escape cancels — unless it is meant for something on top: an open
    // dialog or lightbox, or a popover/menu that has focus. One Escape used to
    // close that AND throw the recording away.
    function escapeIsOurs(e) {
        if (e.isDefaultPrevented && e.isDefaultPrevented()) return false;
        if (document.querySelector('[aria-modal="true"]')) return false;
        const a = document.activeElement;
        return !(a && a.closest && a.closest('[role="dialog"], [role="menu"], [role="listbox"]'));
    }
    $(document).on('keydown', function (e) {
        if (rec && e.key === 'Escape' && escapeIsOurs(e)) { e.preventDefault(); e.stopPropagation(); cancel(rec); }
    });
    // Leaving the page mid-recording releases the microphone.
    window.addEventListener('pagehide', () => cancel(rec));

    $(function () {
        if (supported()) $('.voice-input-button').removeAttr('hidden');
    });

    window.VoiceInput = { supported, cancel: (opts) => cancel(rec, opts), isRecording: () => !!rec };
})();
