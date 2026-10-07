// ViewImage — load an image file's visual contents into the conversation so the
// model can actually SEE it. Attached images are saved to the app's assets/
// directory but are NOT embedded inline (see sendChatMessage in app.js), so the
// model fetches an image on demand with this tool only when the task requires
// looking at it. This keeps vision tokens off the request for images that just
// need to be placed/linked by path.
//
// The image is fitted to what the vision API accepts before it is sent (see
// fitImageForVision). The pure-ish fitting helper lives on
// window.__viewImageInternals so it can be exercised directly in a browser.
window.__viewImageInternals = (function () {
    // Anthropic rejects an image over 5MB or 8000px, and downscales anything
    // over ~1568px on its long edge server-side anyway (at full token cost).
    // Stay comfortably inside: attachments may be up to 30MB (dragdrop.js), and
    // a phone photo is routinely 3–12MB and 4000px+. The 5MB is measured on the
    // base64 payload, which is 4/3 the size of the bytes, so 4MB of raw image
    // (5.33MB encoded) was still rejected; 3.5MB encodes to under 4.7MB.
    const VISION_MAX_BYTES = 3.5 * 1024 * 1024;
    const VISION_MAX_EDGE = 1568;
    // How many times to shrink further when a re-encode is still too big.
    const MAX_SHRINK_ROUNDS = 4;

    // Decode to something drawImage accepts, plus its pixel size. Prefers
    // createImageBitmap (off-main-thread, honours EXIF orientation); falls back
    // to an <img> over an object URL. Returns null when the bytes don't decode.
    async function decode(blob) {
        if (typeof createImageBitmap === 'function') {
            try {
                const bmp = await createImageBitmap(blob, { imageOrientation: 'from-image' });
                return { img: bmp, width: bmp.width, height: bmp.height, release: () => { try { bmp.close && bmp.close(); } catch (e) {} } };
            } catch (e) { /* fall through to the <img> path */ }
        }
        if (typeof Image !== 'function' || typeof URL === 'undefined' || !URL.createObjectURL) return null;
        const url = URL.createObjectURL(blob);
        try {
            const img = await new Promise((resolve, reject) => {
                const el = new Image();
                el.onload = () => resolve(el);
                el.onerror = () => reject(new Error('decode failed'));
                el.src = url;
            });
            return { img, width: img.naturalWidth, height: img.naturalHeight, release: () => { try { URL.revokeObjectURL(url); } catch (e) {} } };
        } catch (e) {
            try { URL.revokeObjectURL(url); } catch (e2) {}
            return null;
        }
    }

    // The format the bytes are actually in — among the four the vision API
    // takes — or null. The API rejects an image whose bytes don't match its
    // declared media_type, and a file's extension often lies: images saved from
    // the web are routinely WebP or JPEG behind a .png/.jpg name.
    function sniffImageType(bytes) {
        const b = bytes || [];
        const at = (i, ...vals) => vals.every((v, k) => b[i + k] === v);
        if (at(0, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) return 'image/png';
        if (at(0, 0xFF, 0xD8, 0xFF)) return 'image/jpeg';
        if (at(0, 0x47, 0x49, 0x46, 0x38)) return 'image/gif';                               // GIF8
        if (at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50)) return 'image/webp'; // RIFF....WEBP
        return null;
    }

    function toBlob(canvas, type, quality) {
        return new Promise((resolve) => {
            try { canvas.toBlob((b) => resolve(b || null), type, quality); }
            catch (e) { resolve(null); }
        });
    }

    // Return { blob, mediaType, width, height, fitted, originalWidth,
    // originalHeight } — the original when it already fits, otherwise a
    // re-encoded copy: downscaled to VISION_MAX_EDGE on the long edge, PNG when
    // the source may carry transparency (png/gif), JPEG otherwise, then shrunk
    // further (and pushed to JPEG) until it is under VISION_MAX_BYTES. `force`
    // re-encodes even an image that fits (bytes in a format the API won't
    // take). If the bytes can't be decoded at all, the original is returned
    // untouched with decodable:false — the caller decides whether to use it.
    async function fitImageForVision(blob, mediaType, { force = false } = {}) {
        const decoded = await decode(blob);
        if (!decoded) return { blob, mediaType, width: 0, height: 0, fitted: false, decodable: false };
        const { width, height } = decoded;
        const longEdge = Math.max(width, height);
        try {
            if (!force && blob.size <= VISION_MAX_BYTES && longEdge <= VISION_MAX_EDGE) {
                return { blob, mediaType, width, height, fitted: false };
            }
            const keepsAlpha = mediaType === 'image/png' || mediaType === 'image/gif';
            let scale = Math.min(1, VISION_MAX_EDGE / longEdge);
            let type = keepsAlpha ? 'image/png' : 'image/jpeg';
            let out = null, w = width, h = height;
            for (let round = 0; round <= MAX_SHRINK_ROUNDS; round++) {
                w = Math.max(1, Math.round(width * scale));
                h = Math.max(1, Math.round(height * scale));
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                if (!ctx) break;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(decoded.img, 0, 0, w, h);
                out = await toBlob(canvas, type, type === 'image/jpeg' ? 0.85 : undefined);
                if (out && out.size <= VISION_MAX_BYTES) break;
                // Still too big: a PNG gives up its alpha for JPEG's far smaller
                // size first; after that, shrink the long edge by a fifth a round.
                if (type === 'image/png') type = 'image/jpeg';
                else scale *= 0.8;
            }
            if (!out || out.size > VISION_MAX_BYTES) {
                // Couldn't fit it — hand back the best attempt (or the original);
                // the caller refuses anything still over the limit.
                return out
                    ? { blob: out, mediaType: type, width: w, height: h, fitted: true, originalWidth: width, originalHeight: height }
                    : { blob, mediaType, width, height, fitted: false };
            }
            return { blob: out, mediaType: type, width: w, height: h, fitted: true, originalWidth: width, originalHeight: height };
        } finally {
            decoded.release();
        }
    }

    return { VISION_MAX_BYTES, VISION_MAX_EDGE, fitImageForVision, sniffImageType };
})();

window.tools.push({
    type: "function",
    function: {
        name: "ViewImage",
        description: "View the visual contents of an image file in the project (e.g. an image the user attached, saved under assets/). Use this ONLY when you need to SEE an image to complete the task — for example to match a design mockup, describe or lay out a photo, or pick colors from it. You do NOT need to call this just to reference or link an image by path in code.",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Path to the image file. May be absolute (starts with /) or relative to the app directory (e.g. \"assets/logo.png\")."
                }
            },
            required: ["path"],
            additionalProperties: false
        },
        strict: false
    },
    exec: async function (args, state) {
        const raw = ((args && args.path) || '').trim();
        if (!raw) throw new Error('No image path provided.');

        // Resolve relative paths against the current app directory. The attachment
        // note also gives the model the absolute path, so an absolute path always
        // works even if appDir isn't available here.
        const baseDir = (state && state.appDir) || (typeof currentAppDir !== 'undefined' ? currentAppDir : '');
        let path = raw;
        if (!path.startsWith('/')) {
            const cleanBase = baseDir ? baseDir.replace(/\/+$/, '') + '/' : '';
            path = cleanBase + path.replace(/^\.?\/+/, '');
        }

        // Confine to the project directory (after resolving any relative path), so
        // the model can't read images outside the project. See assertPathInProject.
        path = window.assertPathInProject(path, state);

        const ext = (path.split('.').pop() || '').toLowerCase();

        // SVG is text, not a raster image the vision API accepts — return its
        // source so the model can read it directly.
        if (ext === 'svg') {
            const blob = await puter.fs.read(path);
            let text = await blob.text();
            // Same cap as ReadTextFile, for the same reason: the result is kept
            // in the chat history and re-sent with every later request, so an
            // exported multi-megabyte illustration failed this request with
            // "prompt is too long" — and every request after it.
            const MAX_CHARS = window.READ_TEXT_FILE_MAX_CHARS || 250000;
            if (text.length > MAX_CHARS) {
                const total = text.length;
                text = text.slice(0, MAX_CHARS) +
                    `\n\n[…truncated: this SVG is ${total.toLocaleString()} characters long and only the first ${MAX_CHARS.toLocaleString()} are shown. ` +
                    `To find specific content in the rest, use SearchFiles; to use the image in the app, reference it by path instead of reading it.]`;
            }
            return { __contentBlocks: [{ type: "text", text: `Contents of SVG image "${path}":\n\n${text}` }] };
        }

        // Media types the vision API accepts.
        const mediaByExt = {
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
            webp: 'image/webp', gif: 'image/gif',
        };
        const mediaType = mediaByExt[ext];
        if (!mediaType) {
            throw new Error(`"${path}" is not a viewable image. Supported formats: png, jpg, webp, gif, svg.`);
        }

        // Fit the image to the vision API's limits BEFORE it enters the
        // conversation. An oversized image didn't just fail this request: the
        // rejected block was already in the persisted history, so every later
        // request in the chat failed the same way — the project was bricked.
        // The same goes for anything the API would reject: an image labelled
        // with the wrong media_type (by its extension rather than its bytes),
        // bytes that are no supported image at all, or one that can't be made
        // small enough. Those are refused here, before they reach the history.
        const { fitImageForVision, sniffImageType, VISION_MAX_BYTES } = window.__viewImageInternals;
        const original = await puter.fs.read(path);
        const sniffed = sniffImageType(new Uint8Array(await original.slice(0, 16).arrayBuffer()));
        // Unknown bytes (AVIF, HEIC, BMP… behind a .png name) are re-encoded to
        // PNG/JPEG when the browser can decode them.
        const fit = await fitImageForVision(original, sniffed || mediaType, { force: !sniffed });
        // Bytes no modern browser can decode (a corrupt or truncated file) would
        // be rejected by the API too.
        if (fit.decodable === false || (!sniffed && !fit.fitted)) {
            throw new Error(`"${path}" can't be viewed: its contents aren't a readable png, jpg, webp or gif image. Do not retry; reference the file by path if the app only needs it.`);
        }
        if (fit.blob.size > VISION_MAX_BYTES) {
            throw new Error(`"${path}" is too large to view, even downscaled. Do not retry; reference the file by path if the app only needs it.`);
        }
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result || '';
                const comma = result.indexOf(',');
                resolve(comma >= 0 ? result.slice(comma + 1) : result);
            };
            reader.onerror = () => reject(reader.error || new Error('Failed to read image'));
            reader.readAsDataURL(fit.blob);
        });

        const resized = fit.fitted && (fit.width !== fit.originalWidth || fit.height !== fit.originalHeight);
        const caption = resized
            ? `Contents of image "${path}" (shown downscaled from ${fit.originalWidth}×${fit.originalHeight} to ${fit.width}×${fit.height} to fit; the file itself is unchanged):`
            : `Contents of image "${path}":`;
        return {
            __contentBlocks: [
                { type: "text", text: caption },
                { type: "image", source: { type: "base64", media_type: fit.mediaType, data: base64 } },
            ],
        };
    }
});
