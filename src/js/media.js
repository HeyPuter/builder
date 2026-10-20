// media.js — Generated images, videos and audio in the chat.
//
// Shared by the GenerateImage / GenerateVideo / GenerateSpeech tools
// (src/tools/media/) and by loadChat (app.js), which re-renders past
// generations from their persisted tool results. Each generation shows as a
// card in the conversation: a placeholder while the provider works (image or
// speech: seconds, video: minutes), then the image, or a playable video or
// audio clip, with Download and Open buttons.
//
// Files are saved to the chat's media folder (window.chatMediaDir, outside the
// project directory — see helpers.js), so they survive version restores and
// can be copied into a website later.
//
// Everything model- or user-authored (the prompt, the file name) is set with
// .text()/.attr(), never interpolated into HTML.

window.GeneratedMedia = (function () {
    const open_svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`;

    // Aspect ratios the tools accept, as CSS aspect-ratio values for the
    // placeholder (the finished image sizes itself).
    const RATIOS = {
        '1:1': [1, 1], '16:9': [16, 9], '9:16': [9, 16], '4:3': [4, 3],
        '3:4': [3, 4], '3:2': [3, 2], '2:3': [2, 3],
    };
    function parseRatio(r) {
        return (typeof r === 'string' && RATIOS[r.trim()]) || null;
    }

    // A short, safe file name: <kind>_<timestamp>_<slug of the prompt>.<ext>.
    function fileName(kind, prompt, ext) {
        const slug = String(prompt || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40)
            .replace(/-+$/, '');
        const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '_');
        const rand = Math.random().toString(36).slice(2, 6);
        return `${kind}_${stamp}_${rand}${slug ? '_' + slug : ''}.${ext}`;
    }

    function chatBox() { return $('.chat-box'); }

    // 'image' | 'video' | 'audio' — anything unknown is treated as an image.
    function normKind(kind) { return kind === 'video' || kind === 'audio' ? kind : 'image'; }
    // How each kind is named in labels and messages.
    const NOUN = { image: 'image', video: 'video', audio: 'audio' };

    // Append a card to the conversation, keeping the floating activity dots
    // last (same placement as the upgrade card, see upgrade.js).
    function appendToChat($node) {
        const $box = chatBox();
        const $spinner = $box.find('.floating-spinner').detach();
        $box.append($node);
        if ($spinner.length) $node.after($spinner);
        if (window.shouldAutoScroll !== false && $box[0]) $box.scrollTop($box[0].scrollHeight);
    }

    // The card skeleton. `kind` is 'image', 'video' or 'audio'. A `tile` is one
    // cell of a multi-image grid (see gridMessage): the same card without its
    // own chat-message wrapper.
    function buildCard({ kind, prompt, ratio, tile = false }) {
        const $msg = tile
            ? $('<div class="generated-media-tile"><div class="message-content"></div></div>')
            : $('<div class="message ai-message generated-media-message"><div class="message-content"></div></div>');
        const $fig = $('<figure class="generated-media"></figure>').addClass('kind-' + normKind(kind));
        const r = kind === 'audio' ? null : parseRatio(ratio);
        // The ratio as CSS needs it twice: for the frame's aspect-ratio, and
        // as a number (width ÷ height) to size the card to the box the
        // finished media will take (styles.css), so it doesn't jump.
        if (r) {
            $fig[0].style.setProperty('--gm-ratio', `${r[0]} / ${r[1]}`);
            $fig[0].style.setProperty('--gm-ar', String(r[0] / r[1]));
            $fig.addClass('has-ratio');
        }
        const $frame = $('<div class="generated-media-frame"></div>');
        const $bar = $('<figcaption class="generated-media-bar"></figcaption>');
        const $caption = $('<span class="generated-media-caption"></span>').text(prompt || '');
        if (prompt) $caption.attr('title', prompt);
        $bar.append($caption);
        $fig.append($frame, $bar);
        $msg.find('.message-content').append($fig);
        return $msg;
    }

    // A card in its "generating…" state, with an elapsed-time counter. The
    // counter stops itself once the card leaves the page (a chat switch empties
    // the chat box) or is finished.
    // The counter is hidden from screen readers: it sits inside the role="status" region, and a status
    // region re-reads its whole text on every change, so "Generating image…
    // 1s", "…2s", "…3s" was spoken every second for as long as the provider
    // took. The label is announced once; a video's "few minutes" hint, which
    // only the counter showed, goes into the label for screen readers instead.
    function pendingCard({ kind, prompt, ratio, tile = false, label = null }) {
        const $msg = buildCard({ kind, prompt, ratio, tile });
        const $fig = $msg.find('.generated-media').addClass('is-pending');
        label = label || { video: 'Generating video', audio: 'Generating audio' }[kind] || 'Generating image';
        const $ph = $('<div class="generated-media-placeholder" role="status"></div>');
        const $status = $('<span class="generated-media-status shimmer"></span>').text(label + '…');
        if (kind === 'video') $status.append($('<span class="sr-only"></span>').text(' This can take a few minutes.'));
        $ph.append($status);
        const $elapsed = $('<span class="generated-media-elapsed" aria-hidden="true"></span>');
        if (kind === 'video') $elapsed.text('This can take a few minutes');
        $ph.append($elapsed);
        $fig.find('.generated-media-frame').append($ph);
        const started = Date.now();
        const timer = setInterval(() => {
            if (!document.contains($msg[0]) || !$fig.hasClass('is-pending')) { clearInterval(timer); return; }
            const s = Math.round((Date.now() - started) / 1000);
            const t = s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
            $elapsed.text(kind === 'video' ? `${t} · this can take a few minutes` : t);
        }, 1000);
        $msg.data('gmTimer', timer);
        return $msg;
    }

    function stopTimer($msg) {
        const t = $msg && $msg.data('gmTimer');
        if (t) clearInterval(t);
    }

    // Swap the placeholder for the finished image/video/audio and add its actions.
    function fillCard($msg, { kind, url, path, filename, prompt }) {
        kind = normKind(kind);
        stopTimer($msg);
        const $fig = $msg.find('.generated-media').removeClass('is-pending');
        const $frame = $fig.find('.generated-media-frame').empty();
        const alt = prompt ? String(prompt).slice(0, 300) : 'Generated ' + NOUN[kind];
        if (kind === 'audio') {
            const $au = $('<audio class="generated-media-el" controls preload="metadata"></audio>');
            $au.attr('src', url).attr('aria-label', alt);
            $frame.append($au);
        } else if (kind === 'video') {
            const $v = $('<video class="generated-media-el" controls playsinline preload="metadata"></video>');
            $v.attr('src', url).attr('aria-label', alt);
            $frame.append($v);
        } else {
            const $a = $('<a class="generated-media-link" target="_blank" rel="noopener noreferrer"></a>').attr('href', url);
            const $img = $('<img class="generated-media-el" decoding="async">').attr('src', url).attr('alt', alt);
            $a.append($img);
            $frame.append($a);
        }
        refreshOnError($fig, $frame.find('.generated-media-el')[0], url);
        const $bar = $fig.find('.generated-media-bar');
        $bar.find('.generated-media-actions').remove();
        const $actions = $('<span class="generated-media-actions"></span>');
        const $dl = $(`<button type="button" class="generated-media-download">${window.download_svg || ''}</button>`)
            .attr('title', 'Download').attr('aria-label', 'Download ' + NOUN[kind])
            .attr('data-url', url || '').attr('data-filename', filename || '');
        if (path) $dl.attr('data-path', path);
        const $open = $(`<a class="generated-media-open" target="_blank" rel="noopener noreferrer">${open_svg}</a>`)
            .attr('href', url).attr('title', 'Open in a new tab').attr('aria-label', 'Open in a new tab');
        $actions.append($dl, $open);
        $bar.append($actions);
        holdSizeUntilLoaded($msg, $fig, kind);
        const $box = chatBox();
        if (window.shouldAutoScroll !== false && $box[0] && $msg.closest('.chat-box').length) $box.scrollTop($box[0].scrollHeight);
        return $msg;
    }

    // A reused read URL (displayURL) whose token no longer works: drop it and
    // show the file from a fresh one, once.
    function refreshOnError($fig, el, url) {
        if (!el || !url) return;
        $(el).one('error', () => {
            const path = forgetReadURL(url);
            if (!path) return;
            api.displayURL(path).then((fresh) => {
                if (!fresh || fresh === url || !document.contains(el)) return;
                // A picture already shown as broken goes back to loading for
                // the retry (holdSizeUntilLoaded settles it again).
                if ($fig.hasClass('is-broken')) { showBroken($fig, false); $fig.addClass('is-loading'); }
                $(el).attr('src', fresh);
                $fig.find('.generated-media-link, .generated-media-open').attr('href', fresh);
                $fig.find('.generated-media-download').attr('data-url', fresh);
            }).catch(() => { /* the broken picture stays, as before */ });
        });
    }

    // An image has no size until the browser has its first bytes, so the card
    // used to collapse to just its caption bar the moment the placeholder
    // went, then jump to full height when the picture arrived. That jump
    // happened after the chat had scrolled to the bottom, leaving the caption
    // and Download button below the fold. Keep the placeholder's size
    // (.is-loading, styles.css) until the image loads — then, if the reader
    // was at the bottom, pin the chat there again, the same way
    // scrollChatToBottom (app.js) does. If it fails, say so in the same box
    // (.is-broken) rather than leaving the browser's broken-image glyph and a
    // clipped sliver of alt text; a later successful load (refreshOnError's
    // retry with a fresh URL) clears it, so these stay bound.
    // Images only: a video or audio player has a size of its own from the
    // start, and iOS may not load a video's metadata until it is played, so
    // waiting for it there could hide the player for good.
    function holdSizeUntilLoaded($msg, $fig, kind) {
        if (kind !== 'image') return;
        const img = $fig.find('img.generated-media-el')[0];
        // Already complete: it has its size (cached), or there is nothing to
        // wait for (no URL) — no load/error event may ever come.
        if (!img || img.complete) return;
        $fig.addClass('is-loading');
        const settle = (broken) => {
            const held = $fig.hasClass('is-loading');
            // Measured while the card still has the placeholder's size.
            const box = $msg.closest('.chat-box')[0];
            const atBottom = held && !!box && window.shouldAutoScroll !== false
                && (typeof window.chatBoxNearBottom !== 'function' || window.chatBoxNearBottom(box));
            $fig.removeClass('is-loading');
            showBroken($fig, broken);
            if (atBottom) $(box).scrollTop(box.scrollHeight);
        };
        $(img).on('load', () => settle(false)).on('error', () => settle(true));
    }

    // The failed-image state: the card keeps its box, with a note in it.
    function showBroken($fig, broken) {
        $fig.find('.generated-media-broken').remove();
        if (!broken) { $fig.removeClass('is-broken'); return; }
        $fig.addClass('is-broken');
        $fig.find('.generated-media-frame').append(
            $('<div class="generated-media-placeholder generated-media-broken"></div>')
                .append($('<span class="generated-media-status"></span>').text("Couldn't load this image")));
    }

    // Take a card off the page (generation failed, or the turn was stopped).
    function removeCard($msg) {
        stopTimer($msg);
        if (!$msg) return;
        const $grid = $msg.closest('.generated-media-grid-message');
        $msg.remove();
        // The last tile of a grid went: take the empty grid down with it.
        if ($grid.length && !$grid.find('.generated-media-tile').length) $grid.remove();
    }

    // A chat message holding a grid of `count` tiles (several images from one
    // request). Returns { $msg, tiles: [$tile…] } — each tile is a pending card
    // runGeneration fills in place.
    function gridMessage({ kind, prompt, ratio, count }) {
        const $msg = $('<div class="message ai-message generated-media-message generated-media-grid-message"><div class="message-content"></div></div>');
        const $grid = $('<div class="generated-media-grid" role="group"></div>')
            .attr('aria-label', `${count} generated images`).attr('data-count', String(count));
        const tiles = [];
        for (let i = 0; i < count; i++) {
            const $tile = pendingCard({ kind, prompt: `Option ${i + 1}`, ratio, tile: true });
            $tile.find('.generated-media-caption').attr('title', prompt || '');
            tiles.push($tile);
            $grid.append($tile);
        }
        $msg.find('.message-content').append($grid);
        return { $msg, tiles };
    }

    // Re-render a persisted generation (loadChat). `url` is a fresh read URL —
    // or, for a multi-image result (result.items), an array of them in order.
    function renderSaved(result, url) {
        // `url` lines up with result.items — one entry per item, saved or not —
        // so pair them BEFORE dropping a version that was never saved.
        // Filtering first shifted every later URL onto the wrong tile.
        const urls = Array.isArray(url) ? url : [url];
        let items = Array.isArray(result.items)
            ? result.items.map((it, i) => ({ it, url: urls[i] })).filter(p => p.it && p.it.path)
            : [];
        // A null URL is a file that's gone. With none left, show nothing —
        // as for a single image whose file is gone — rather than an empty
        // grid; with one left, show it like a lone saved version.
        const present = items.filter(p => p.url);
        if (items.length > 1 && !present.length) return null;
        if (items.length > 1 && present.length === 1) items = present;
        if (items.length > 1) {
            const { $msg, tiles } = gridMessage({ kind: 'image', prompt: result.prompt || '', ratio: result.aspect_ratio, count: items.length });
            items.forEach(({ it, url: u }, i) => {
                if (u) fillCard(tiles[i], { kind: 'image', url: u, path: it.path, filename: it.filename, prompt: result.prompt });
                else removeCard(tiles[i]);
            });
            // Some tiles went (each keeps its "Option n"): count what's left,
            // for the label and the layout (styles.css, data-count="3").
            if (present.length < items.length) {
                $msg.find('.generated-media-grid').attr('data-count', String(present.length))
                    .attr('aria-label', `${present.length} generated images`);
            }
            // Restored tiles are not "pending": no "Option n" caption churn.
            chatBox().append($msg);
            return $msg;
        }
        if (items.length === 1) {
            // Only one version of a grid was saved: show it as a single image.
            result = { ...result, path: items[0].it.path, filename: items[0].it.filename };
            url = items[0].url;
        }
        if (Array.isArray(url)) url = url[0];
        const name = result.path || result.filename || '';
        const kind = (result.kind === 'video' || result.kind === 'audio') ? result.kind
            : /\.mp4$/i.test(name) ? 'video'
                : /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(name) ? 'audio' : 'image';
        const $msg = buildCard({ kind, prompt: result.prompt || '', ratio: result.aspect_ratio });
        fillCard($msg, { kind, url, path: result.path, filename: result.filename, prompt: result.prompt });
        chatBox().append($msg);
        return $msg;
    }

    // Read an image file (project or media folder) as a data: URI for use as a
    // generation reference, downscaled the same way ViewImage fits images for
    // the vision API — a phone photo can be 12MB, far more than a request
    // should carry.
    // The data: URI must name the image's type. puter.fs.read returns files
    // untyped (application/octet-stream), and an image that already fit was
    // passed through as is, so the provider refused it ("unsupported mimetype
    // 'application/octet-stream'") — every edit or animation of a generated
    // image failed, while a big photo, re-encoded on the way, worked.
    // The editors take PNG, JPEG and WebP only, so anything else (a GIF) is
    // re-encoded.
    // `withSize: true` resolves to { dataURL, width, height } instead (the
    // size as sent; 0 when it couldn't be measured), so GenerateVideo can keep
    // a start image's shape.
    const PROVIDER_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
    async function imageDataURL(path, { withSize = false } = {}) {
        const blob = await puter.fs.read(path);
        let out = blob;
        let width = 0, height = 0;
        const internals = window.__viewImageInternals;
        if (internals && typeof internals.fitImageForVision === 'function') {
            const head = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
            const sniffed = internals.sniffImageType(head);
            // Raster bytes decode untyped, but an SVG only decodes when its
            // blob says image/svg+xml: type it from the name (not raster
            // bytes, so a JPEG saved as .png is still declared a JPEG below).
            let input = blob;
            const named = sniffed ? '' : mimeForPath(path);
            if (named && blob.type !== named) input = new Blob([blob], { type: named });
            const fit = await internals.fitImageForVision(input, sniffed || 'image/png', { force: !PROVIDER_IMAGE_TYPES.includes(sniffed) });
            if (fit.decodable === false) throw new Error(`"${path}" is not a readable image.`);
            out = fit.blob;
            width = fit.width || 0;
            height = fit.height || 0;
            const type = PROVIDER_IMAGE_TYPES.includes(out.type) ? out.type : fit.mediaType;
            if (PROVIDER_IMAGE_TYPES.includes(type) && out.type !== type) out = new Blob([out], { type });
        }
        const dataURL = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('Failed to read image'));
            reader.readAsDataURL(out);
        });
        return withSize ? { dataURL, width, height } : dataURL;
    }

    // A generation error as one plain sentence for the model to relay.
    function describeError(e, kind) {
        const what = NOUN[normKind(kind)];
        const code = e && (e.code || (e.error && e.error.code));
        const specific = e && (e.errorCode || (e.error && e.error.errorCode));
        const msg = (e && (e.message || (e.error && e.error.message) || (typeof e === 'string' ? e : ''))) || '';
        if (specific === 'moderation_flagged') return `The ${what} generator's content filter refused this request. Ask the user to rephrase it; do not retry the same prompt.`;
        if (code === 'insufficient_funds') return `The user doesn't have enough Puter credits to generate this ${what}. Tell them; do not retry.`;
        if (code === 'input_too_large') {
            if (normKind(kind) === 'audio') return `The text is too long to turn into one ${what} clip (the limit is about 3,000 characters). Split it into shorter parts.`;
            return `The input is too large for the ${what} generator. Shorten the prompt or use a smaller reference image.`;
        }
        if (code === 'upstream_timeout') return `The ${what} provider took too long to respond. The user can try again${kind === 'video' ? ', ideally with a shorter clip' : ''}.`;
        if (code === 'access_denied') return `The ${what} could not be saved (permission denied).`;
        return `Generating the ${what} failed${msg ? ': ' + String(msg).slice(0, 300) : '.'}`;
    }

    // The coarse reason a generation failed, for analytics (the same cases
    // describeError words for the model).
    function failureReason(e) {
        const code = e && (e.code || (e.error && e.error.code));
        const specific = e && (e.errorCode || (e.error && e.error.errorCode));
        if (specific === 'moderation_flagged') return 'moderation';
        if (code === 'insufficient_funds') return 'insufficient_funds';
        if (code === 'input_too_large') return 'too_large';
        if (code === 'upstream_timeout') return 'timeout';
        if (code === 'access_denied') return 'access_denied';
        return 'error';
    }

    // One Plausible event per request: "Image Generated" or "Image Generation
    // Failed" (likewise Video and Audio). `props` carry the request's options
    // (aspect ratio, quality, voice…) — never the prompt or a file name.
    const EVENT_NOUN = { image: 'Image', video: 'Video', audio: 'Audio' };
    function trackGeneration(kind, ok, props) {
        const noun = EVENT_NOUN[normKind(kind)];
        window.track?.(ok ? `${noun} Generated` : `${noun} Generation Failed`, { ...(props || {}) });
    }

    // Whether `path` exists (the provider's server-side save is the main path;
    // this confirms it before the result claims a saved file).
    async function exists(path) {
        try { await puter.fs.stat(path); return true; } catch (e) { return false; }
    }

    // Fallback save: fetch the provider's URL / data URI and write it ourselves.
    async function saveFromSrc(src, path) {
        const resp = await fetch(src);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const blob = await resp.blob();
        await puter.fs.write(path, blob, { overwrite: true, createMissingParents: true });
    }

    // A URL to show a saved file (generated media, an attachment) in the chat.
    // getReadURL mints an access token per file, and Puter rate-limits that
    // call: once it answered 429, every generated image and video was skipped
    // when a chat was reopened, and a generation that had just finished showed
    // the provider's temporary URL (or, merged videos, nothing), though the
    // files were there and plain reads still worked. So on a failure, read the
    // file and show it from a blob: URL. Those are revoked when the chat box
    // is cleared (revokeDisplayURLs, called by loadChat and new_chat).
    const MIME_BY_EXT = {
        png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
        svg: 'image/svg+xml', avif: 'image/avif', bmp: 'image/bmp', ico: 'image/x-icon',
        mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/mp4',
        mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac',
    };
    function mimeForPath(path) {
        const p = String(path || '');
        return MIME_BY_EXT[p.slice(p.lastIndexOf('.') + 1).toLowerCase()] || '';
    }
    let displayBlobURLs = [];
    function trackedBlobURL(blob) {
        const url = URL.createObjectURL(blob);
        displayBlobURLs.push(url);
        return url;
    }
    // Each getReadURL is a stat plus a new 24-hour access token, so every
    // open of a chat minted one per generated file again (20 images: 20, 40,
    // 60 tokens after three opens) — the very rate limit above. A read URL for
    // a file in a chat's media folder is reused for the session while its
    // token is fresh: those files are never overwritten (each generation gets
    // a new, unique name). Attachments and project files can be, so they
    // always get a new URL. A cached URL that fails to load is dropped and
    // replaced (refreshOnError).
    const READ_URL_TTL = 23 * 60 * 60 * 1000;
    const readURLCache = new Map(); // path -> { url, at }
    function cacheableReadURL(path) { return /\/\.media\/[^/]+\/[^/]+$/.test(String(path || '')); }
    // Forget a cached read URL (it failed to load); returns its path, or null.
    function forgetReadURL(url) {
        for (const [p, e] of readURLCache) if (e.url === url) { readURLCache.delete(p); return p; }
        return null;
    }
    async function displayURL(path) {
        const hit = readURLCache.get(path);
        if (hit && Date.now() - hit.at < READ_URL_TTL) return hit.url;
        readURLCache.delete(path);
        try {
            const url = await puter.fs.getReadURL(path);
            if (url && cacheableReadURL(path)) readURLCache.set(path, { url, at: Date.now() });
            return url;
        } catch (tokenError) {
            let blob;
            try { blob = await puter.fs.read(path); } catch (e) { throw tokenError; }
            // An SVG needs its type to show in an <img>, and Safari wants one
            // for a video; the read may come back untyped.
            const type = mimeForPath(path);
            if (type && blob.type !== type) blob = new Blob([blob], { type });
            return trackedBlobURL(blob);
        }
    }
    function revokeDisplayURLs() {
        const urls = displayBlobURLs;
        displayBlobURLs = [];
        for (const u of urls) { try { URL.revokeObjectURL(u); } catch (e) { /* noop */ } }
    }

    // A generation that couldn't be saved shows what the provider handed back;
    // for an image that's a data: URL, which Chromium refuses to open in a new
    // tab (WebKit opens a blank one). Show it from a blob: URL instead,
    // released with the chat like displayURL's.
    async function blobURLFromData(url) {
        const resp = await fetch(url);
        return trackedBlobURL(await resp.blob());
    }

    function saveAs(href, name) {
        const a = document.createElement('a');
        a.href = href;
        a.download = name || 'download';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    // Download a generated file. Prefers the saved copy (puter.fs.read gives a
    // same-origin blob, so the browser honours the file name); without one, a
    // blob: or data: URL (an unsaved generation) is saved under the file name
    // too, and anything else is opened.
    async function download({ path, url, filename }) {
        if (path) {
            try {
                const blob = await puter.fs.read(path);
                const href = URL.createObjectURL(blob);
                saveAs(href, filename || path.slice(path.lastIndexOf('/') + 1));
                setTimeout(() => URL.revokeObjectURL(href), 10000);
                return;
            } catch (e) { /* fall back to the URL */ }
        }
        if (url && /^(blob|data):/i.test(url)) saveAs(url, filename || (path ? path.slice(path.lastIndexOf('/') + 1) : ''));
        else if (url) window.open(url, '_blank', 'noopener');
        else window.showToast?.("Couldn't download the file — try again.", { type: 'error' });
    }

    $(document).on('click', '.generated-media-download', function (e) {
        e.preventDefault();
        const $b = $(this);
        download({ path: $b.attr('data-path') || '', url: $b.attr('data-url') || '', filename: $b.attr('data-filename') || '' });
    });

    // The shared exec of GenerateImage / GenerateVideo: everything except the
    // provider call itself (`generate(options)`), which differs per kind.
    // `serverSave: false` for a provider call that can't save the file itself
    // (txt2speech has no puter_output_path): it is then always saved from the
    // URL the call returns.
    // `card` is a pending card already on the page (a grid tile); without it a
    // new card is appended to the chat.
    // Optional hooks for a tool that makes the file itself rather than
    // generating it: `pendingLabel` for the card, `describeFailure` for its own
    // error wording, and `note` (a function, read once done) for a sentence to
    // lead the result's note.
    // Analytics: `trackProps` are added to the Generated / Generation Failed
    // event (see trackGeneration). `track: false` skips the event, for a caller
    // that reports one event for several generations (a multi-image grid);
    // a thrown error then carries its `failureReason`.
    async function runGeneration({ kind, ext, prompt, ratio, state, generate, projectDest, serverSave = true, details, card, pendingLabel = null, describeFailure = null, note = null, track = true, trackProps = null }) {
        const mediaDir = window.chatMediaDir(state);
        if (!mediaDir) throw new Error('Cannot determine where to save the ' + kind + ', so the request was refused.');
        const filename = fileName(kind, prompt, ext);
        const path = mediaDir + '/' + filename;
        const live = () => !window.isAborted?.(state?.abortController) && !window.isStaleTurn?.(state);
        const fail = (message, reason) => {
            api.removeCard($card);
            if (track) api.trackGeneration(kind, false, { ...trackProps, for_project: !!projectDest, count: 1, reason });
            const err = new Error(message);
            err.failureReason = reason;
            return err;
        };

        let $card = card || null;
        if (!$card && live()) {
            $card = api.pendingCard({ kind, prompt, ratio, label: pendingLabel });
            api.appendToChat($card);
        }
        // Stop: the provider call can't be cancelled, but the card must not
        // keep saying "Generating…" under a stopped turn.
        const signal = state?.abortController?.signal;
        const onAbort = () => api.removeCard($card);
        if (signal && signal.addEventListener) signal.addEventListener('abort', onAbort, { once: true });

        try {
            try { await puter.fs.mkdir(mediaDir, { recursive: true }); } catch (e) { /* exists */ }
            let result;
            const extra = serverSave ? { puter_output_path: path } : {};
            if (testMode()) extra.test_mode = true;
            try {
                result = await generate(extra);
            } catch (e) {
                throw fail(describeFailure ? describeFailure(e) : describeError(e, kind), failureReason(e));
            }
            // The browser SDK resolves to an <img>/<video> element; read its
            // src (String(video) is the URL too, String(img) is not).
            const asText = result ? String(result) : '';
            const src = (result && result.src) || (/^(https?:|data:|blob:)/i.test(asText) ? asText : '');
            let saved = serverSave ? await api.exists(path) : false;
            if (!saved && src) {
                try { await api.saveFromSrc(src, path); saved = true; } catch (e) { console.warn('Could not save generated ' + kind + ':', e); }
            }
            if (!saved && !src) {
                throw fail(`The ${kind} generator returned nothing. The user can try again.`, 'empty');
            }

            // Put a copy in the project when it's for a website.
            let projectPath = null;
            if (projectDest && saved) {
                const dir = projectDest.slice(0, projectDest.lastIndexOf('/'));
                const base = projectDest.slice(projectDest.lastIndexOf('/') + 1);
                try { await puter.fs.mkdir(dir, { recursive: true }); } catch (e) { /* exists */ }
                await window.withFileLock(projectDest, () => puter.fs.copy(path, dir, { newName: base, overwrite: true }));
                window.markProjectModified?.(undefined, state?.currentChatId);
                window.recordPreviewChange?.(projectDest);
                window.schedulePreviewRefresh?.();
                projectPath = projectDest;
            }

            if (live() && $card && api.onPage($card)) {
                let url = src;
                if (saved) {
                    try { url = await api.displayURL(path); } catch (e) { url = src || ''; }
                }
                if (/^data:/i.test(url)) {
                    try { url = await api.blobURLFromData(url); } catch (e) { /* keep the data: URL */ }
                }
                api.fillCard($card, { kind, url, path: saved ? path : null, filename, prompt });
            } else {
                api.removeCard($card);
            }
            if (track) api.trackGeneration(kind, true, { ...trackProps, for_project: !!projectPath, count: 1 });

            const out = {
                __generated_media: true,
                success: true,
                kind,
                prompt,
                ...(ratio && { aspect_ratio: ratio }),
                ...(details || {}),
                path: saved ? path : null,
                filename,
            };
            if (projectPath) {
                const root = window.projectRootDir(state);
                out.project_path = projectPath;
                out.relative_path = projectPath.startsWith(root + '/') ? projectPath.slice(root.length + 1) : projectPath;
            }
            const lead = typeof note === 'function' ? note() : null;
            out.note = (lead ? lead + ' ' : '') + `The ${kind}${kind === 'audio' ? ' player' : ''} is now showing in the chat${saved ? '' : ' (it could not be saved, so it will not survive a reload)'}. Do not repeat its path, a link, or Markdown to display it.`
                + (projectPath ? ` It was also saved into the project at ${out.relative_path}; reference it by that relative path in the site's code.` : '')
                + (saved && !projectPath ? ` To use it on a website later, copy it into the project with the copy tool (source: ${path}).` : '');
            return out;
        } finally {
            if (signal && signal.removeEventListener) signal.removeEventListener('abort', onAbort);
        }
    }

    // A frame of a saved video as a data: URI (for continuing the clip with
    // image-to-video). Read through puter.fs into a same-origin blob: drawing a
    // cross-origin <video> onto a canvas would taint it and refuse export.
    // `at` is seconds from the start; null (default) means the last frame.
    async function videoFrameDataURL(path, at = null, timeoutMs = 20000) {
        const blob = await puter.fs.read(path);
        const src = URL.createObjectURL(blob);
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;
        video.preload = 'auto';
        const waitFor = (ev) => new Promise((resolve, reject) => {
            const t = setTimeout(() => reject(new Error('timed out reading the video')), timeoutMs);
            video.addEventListener(ev, () => { clearTimeout(t); resolve(); }, { once: true });
            video.addEventListener('error', () => { clearTimeout(t); reject(new Error('the video could not be decoded')); }, { once: true });
        });
        try {
            const meta = waitFor('loadeddata');
            video.src = src;
            await meta;
            let duration = Number.isFinite(video.duration) ? video.duration : null;
            if (duration == null) {
                // Browser recordings (MediaRecorder WebM: screen or camera
                // captures) carry no duration, so it reads as Infinity and the
                // "last frame" was frame 0. Seeking far past the end makes the
                // browser find the real end.
                const seekedEnd = waitFor('seeked');
                video.currentTime = 1e7;
                await seekedEnd;
                duration = Number.isFinite(video.duration) ? video.duration : (video.currentTime || 0);
            }
            // A hair before the very end: some decoders return a black frame at
            // exactly `duration`.
            const target = at == null ? Math.max(0, duration - 0.05) : Math.min(Math.max(0, Number(at) || 0), Math.max(0, duration - 0.05));
            if (Math.abs(video.currentTime - target) > 0.01) {
                const seeked = waitFor('seeked');
                video.currentTime = target;
                await seeked;
            }
            const w = video.videoWidth, h = video.videoHeight;
            if (!w || !h) throw new Error('the video has no picture');
            const scale = Math.min(1, 1568 / Math.max(w, h));
            const canvas = document.createElement('canvas');
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            return { dataURL: canvas.toDataURL('image/jpeg', 0.92), time: target, duration, width: w, height: h };
        } finally {
            video.removeAttribute('src');
            try { video.load(); } catch (e) { /* ignore */ }
            URL.revokeObjectURL(src);
        }
    }

    // ---- Lightbox ----------------------------------------------------------
    // A click on a generated image opens it full-screen in the app (a modified
    // click — new tab, new window — still follows the link). Arrow keys move
    // between the images of the same grid; Escape, the close button or a click
    // on the backdrop close it, and focus returns to the image that opened it.
    const close_svg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
    const prev_svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>`;
    const next_svg = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>`;
    let lightbox = null; // { $el, items, index, opener }

    function lightboxItems($link) {
        const $grid = $link.closest('.generated-media-grid');
        const $links = $grid.length ? $grid.find('.generated-media-link') : $link;
        // Not a tile whose picture failed to load (showBroken): there is
        // nothing to show for it.
        return $links.toArray().filter(a => a === $link[0] || !$(a).closest('.generated-media').hasClass('is-broken')).map(a => {
            const $fig = $(a).closest('.generated-media');
            const $dl = $fig.find('.generated-media-download');
            return {
                url: a.getAttribute('href'),
                alt: $(a).find('img').attr('alt') || '',
                path: $dl.attr('data-path') || '',
                filename: $dl.attr('data-filename') || '',
                el: a,
            };
        });
    }

    function renderLightbox() {
        const { $el, items, index } = lightbox;
        const it = items[index];
        $el.find('.media-lightbox-img').attr('src', it.url).attr('alt', it.alt);
        const many = items.length > 1;
        $el.find('.media-lightbox-prev, .media-lightbox-next').prop('hidden', !many);
        $el.find('.media-lightbox-count').prop('hidden', !many).text(`${index + 1} / ${items.length}`);
        const cap = $el.find('.media-lightbox-caption').text(it.alt)[0];
        cap.scrollTop = 0;
        // A prompt longer than the caption's two lines scrolls: reachable by
        // keyboard too (and in the Tab cycle below) only then.
        const scrolls = cap.scrollHeight > cap.clientHeight + 1;
        if (scrolls) cap.setAttribute('tabindex', '0'); else cap.removeAttribute('tabindex');
        markCaptionClip(cap);
    }

    // Fade the caption's last line while more of it is hidden below.
    function markCaptionClip(cap) {
        cap.classList.toggle('is-clipped', cap.scrollTop + cap.clientHeight < cap.scrollHeight - 1);
    }

    function openLightbox($link) {
        closeLightbox(false);
        const items = lightboxItems($link);
        const index = Math.max(0, items.findIndex(it => it.el === $link[0]));
        const $el = $(`<div class="media-lightbox" role="dialog" aria-modal="true" aria-label="Image viewer">
            <div class="media-lightbox-top">
                <span class="media-lightbox-count" aria-live="polite"></span>
                <span class="media-lightbox-spacer"></span>
                <button type="button" class="media-lightbox-btn media-lightbox-download" title="Download" aria-label="Download image">${window.download_svg || ''}</button>
                <button type="button" class="media-lightbox-btn media-lightbox-close" title="Close (Esc)" aria-label="Close">${close_svg}</button>
            </div>
            <button type="button" class="media-lightbox-nav media-lightbox-prev" aria-label="Previous image">${prev_svg}</button>
            <figure class="media-lightbox-stage"><img class="media-lightbox-img" alt=""><figcaption class="media-lightbox-caption"></figcaption></figure>
            <button type="button" class="media-lightbox-nav media-lightbox-next" aria-label="Next image">${next_svg}</button>
        </div>`);
        lightbox = { $el, items, index, opener: $link[0] };
        $el.find('.media-lightbox-caption').on('scroll', function () { markCaptionClip(this); });
        $('body').append($el).addClass('media-lightbox-open');
        renderLightbox();
        requestAnimationFrame(() => $el.addClass('is-open'));
        $el.find('.media-lightbox-close')[0].focus();
    }

    function closeLightbox(restoreFocus = true) {
        if (!lightbox) return;
        const { $el, opener } = lightbox;
        lightbox = null;
        $('body').removeClass('media-lightbox-open');
        $el.remove();
        if (restoreFocus && opener && document.contains(opener)) { try { opener.focus({ preventScroll: true }); } catch (e) { /* ignore */ } }
    }

    function stepLightbox(delta) {
        if (!lightbox || lightbox.items.length < 2) return;
        const n = lightbox.items.length;
        lightbox.index = (lightbox.index + delta + n) % n;
        renderLightbox();
    }

    $(document).on('click', '.generated-media-link', function (e) {
        // Let the browser handle a new-tab / new-window / download click.
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        openLightbox($(this));
    });
    $(document).on('click', '.media-lightbox-close', () => closeLightbox());
    $(document).on('click', '.media-lightbox-prev', () => stepLightbox(-1));
    $(document).on('click', '.media-lightbox-next', () => stepLightbox(1));
    $(document).on('click', '.media-lightbox-download', function () {
        if (!lightbox) return;
        const it = lightbox.items[lightbox.index];
        download({ path: it.path, url: it.url, filename: it.filename });
    });
    // A click on the backdrop (not the picture or a control) closes.
    $(document).on('click', '.media-lightbox', function (e) {
        if (e.target === this || $(e.target).is('.media-lightbox-stage')) closeLightbox();
    });
    $(document).on('keydown', function (e) {
        if (!lightbox) return;
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeLightbox(); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); stepLightbox(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); stepLightbox(1); }
        else if (e.key === 'Tab') {
            // Keep focus inside the dialog.
            const f = lightbox.$el.find('button:not([hidden]), .media-lightbox-caption[tabindex="0"]').toArray();
            if (!f.length) return;
            const i = f.indexOf(document.activeElement);
            const nextI = e.shiftKey ? (i <= 0 ? f.length - 1 : i - 1) : (i === f.length - 1 ? 0 : i + 1);
            e.preventDefault();
            f[nextI].focus();
        }
    });

    // Whether the card is still in the conversation (a chat switch empties it).
    function onPage($msg) { return !!($msg && $msg[0] && document.contains($msg[0])); }

    // Developer switch: `localStorage.debugMediaTestMode = 1` makes every
    // generation use Puter's free sample image/clip (test_mode), to exercise
    // the flow without spending credits. Silent unless set.
    function testMode() {
        try { return typeof localStorage !== 'undefined' && !!localStorage.getItem('debugMediaTestMode'); }
        catch (e) { return false; }
    }

    // The UI and storage hooks runGeneration goes through. Exposed (and called
    // via this object) so scripts/test-generated-media.mjs can drive the real
    // generation flow without a DOM.
    const api = {
        RATIOS, parseRatio, fileName, pendingCard, fillCard, removeCard, appendToChat, onPage,
        exists, saveFromSrc, renderSaved, imageDataURL, describeError, download, runGeneration,
        displayURL, revokeDisplayURLs, mimeForPath, blobURLFromData, trackGeneration, failureReason,
        gridMessage, videoFrameDataURL, openLightbox, closeLightbox,
    };
    return api;
})();
