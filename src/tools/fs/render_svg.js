// RenderSvg — draw an SVG file in the project into a PNG file in the project.
//
// The model writes SVG well but `write` only stores text, so a site that needs
// a raster image of its own art (a social preview card, which X, Facebook and
// iMessage only take as PNG/JPG, a PNG favicon) had no way to get one: the
// model built a page with a canvas and a download button and asked the user to
// re-upload the file (issue #36). This draws the SVG in the builder itself,
// the same way manifest.js rasterizes icon.svg, and saves the bytes.
//
// The SVG is decoded as an <img>, so it can't run scripts or fetch anything:
// external images, stylesheets and web fonts are left out of the render and
// <text> falls back to the system fonts. The PNG shows in the chat as a card
// (js/media.js), and the result shows it to the model so it can check what it
// drew.
window.__renderSvgInternals = (function () {
    const MAX_EDGE = 4096;
    const DEFAULT_EDGE = 1200;

    // The root <svg> tag's viewBox width/height, else its plain numeric
    // width/height (which then become the viewBox). Null when it has neither.
    function intrinsicBox(svgText) {
        const open = String(svgText || '').match(/<svg\b[^>]*>/i);
        if (!open) return null;
        const vb = open[0].match(/\bviewBox\s*=\s*(["'])([^"']*)\1/i);
        if (vb) {
            const n = vb[2].trim().split(/[\s,]+/).map(Number);
            if (n.length === 4 && n[2] > 0 && n[3] > 0) return { w: n[2], h: n[3], hasViewBox: true };
            return null;
        }
        const attr = (name) => {
            const m = open[0].match(new RegExp(`\\s${name}\\s*=\\s*(["'])\\s*([\\d.]+)\\s*(px)?\\s*\\1`, 'i'));
            return m ? Number(m[2]) : 0;
        };
        const w = attr('width'), h = attr('height');
        return w > 0 && h > 0 ? { w, h, hasViewBox: false } : null;
    }

    // Output size in whole pixels. Both given: used as is. One given: the
    // other follows the drawing's shape. Neither: the long edge is 1200px.
    function outputSize(box, width, height) {
        const clamp = (n) => Math.min(MAX_EDGE, Math.max(1, Math.round(n)));
        const w = Number(width) > 0 ? Number(width) : 0;
        const h = Number(height) > 0 ? Number(height) : 0;
        if (w && h) return { width: clamp(w), height: clamp(h) };
        if (w) return { width: clamp(w), height: clamp(w * box.h / box.w) };
        if (h) return { width: clamp(h * box.w / box.h), height: clamp(h) };
        const scale = DEFAULT_EDGE / Math.max(box.w, box.h);
        return { width: clamp(box.w * scale), height: clamp(box.h * scale) };
    }

    // The SVG text ready for an <img>: the namespace an <img> requires (an SVG
    // without it decodes to nothing), a viewBox from width/height when it has
    // none, and the output size as its intrinsic size (normalizeSvgForRaster).
    function prepare(svgText, box, size) {
        let src = String(svgText || '');
        const open = src.match(/<svg\b[^>]*>/i);
        if (!open) return null;
        let tag = open[0];
        if (!/\sxmlns\s*=/i.test(tag)) tag = tag.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
        if (!box.hasViewBox) tag = tag.replace(/^<svg/i, `<svg viewBox="0 0 ${box.w} ${box.h}"`);
        src = src.slice(0, open.index) + tag + src.slice(open.index + open[0].length);
        return window.normalizeSvgForRaster(src, size.width, size.height);
    }

    // The result's first line, and the reader that finds the PNG in it again
    // when a chat is reopened (loadChat in app.js), so the chat card comes
    // back like GenerateImage's. The result is image blocks, not JSON, so the
    // relative path in this line is the only record of where the PNG went.
    function caption(source, relative, size) {
        return `Rendered "${source}" to "${relative}" (${size.width}×${size.height} PNG).`;
    }
    function renderedPath(blocks, root) {
        const first = Array.isArray(blocks) && blocks[0];
        const m = first && first.type === 'text' && /^Rendered "[^"]*" to "([^"]+\.png)"/i.exec(first.text || '');
        if (!m) return null;
        return m[1].startsWith('/') || !root ? m[1] : root.replace(/\/+$/, '') + '/' + m[1];
    }

    return { MAX_EDGE, DEFAULT_EDGE, intrinsicBox, outputSize, prepare, caption, renderedPath };
})();

window.tools.push({
    type: "function",
    function: {
        name: "RenderSvg",
        description: "Draw an SVG file in the project into a PNG file in the project, at the pixel size you choose. SVG stays the default for graphics you draw, so use this only where SVG isn't accepted: a social preview image for og:image/twitter:image (1200x630, referenced by its relative path, which publishing makes a full URL), or when the user asks for a PNG. Write the SVG with the write tool first. Keep the SVG self-contained: external images, stylesheets and web fonts are not loaded, and <text> uses the system fonts (embed other images as data: URIs). The rendered PNG is shown to you so you can check it. For photos or painted imagery use GenerateImage instead.",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The SVG file to draw, e.g. \"assets/preview.svg\". Absolute, or relative to the app directory."
                },
                output: {
                    type: "string",
                    description: "Where to save the PNG, e.g. \"assets/preview.png\". Defaults to the SVG's path with .png. An existing file there is replaced."
                },
                width: {
                    type: "integer",
                    minimum: 1,
                    maximum: 4096,
                    description: "Width of the PNG in pixels. Give only width or only height to keep the drawing's shape. With neither, the long edge is 1200px."
                },
                height: {
                    type: "integer",
                    minimum: 1,
                    maximum: 4096,
                    description: "Height of the PNG in pixels."
                }
            },
            required: ["path"],
            additionalProperties: false
        },
        strict: false
    },
    exec: async function (args, state) {
        const raw = String((args && args.path) || '').trim();
        if (!raw) throw new Error('No SVG path provided.');
        const path = window.assertPathInProject(raw, state);
        if (!/\.svg$/i.test(path)) throw new Error(`"${raw}" is not an .svg file. RenderSvg draws SVG files only.`);

        const rawOut = typeof args.output === 'string' && args.output.trim() ? args.output.trim() : path.replace(/\.svg$/i, '.png');
        let output = window.assertPathInProject(rawOut, state, 'output');
        if (output === window.projectRootDir(state)) {
            throw new Error('output must be a file path inside the project, like "assets/preview.png".');
        }
        if (!/\.png$/i.test(output)) output += '.png';

        const I = window.__renderSvgInternals;
        const svgText = await puter.fs.read(path).then((b) => b.text());
        const box = I.intrinsicBox(svgText);
        if (!box) {
            throw new Error(`"${raw}" has no usable size: give its root <svg> a viewBox (e.g. viewBox="0 0 1200 630") and render again.`);
        }
        const size = I.outputSize(box, args.width, args.height);
        const prepared = I.prepare(svgText, box, size);
        if (!prepared) throw new Error(`"${raw}" is not an SVG image.`);

        let url = null;
        let img;
        try {
            url = URL.createObjectURL(new Blob([prepared], { type: 'image/svg+xml' }));
            img = await new Promise((resolve, reject) => {
                const el = new Image();
                const timer = setTimeout(() => { el.src = ''; reject(new Error('timeout')); }, 10000);
                el.onload = () => { clearTimeout(timer); resolve(el); };
                el.onerror = () => { clearTimeout(timer); reject(new Error('decode')); };
                el.src = url;
            });
        } catch (e) {
            throw new Error(`"${raw}" could not be drawn. It must be well-formed XML: check for unclosed tags, a bare & (write &amp;) or < in text, and attributes without quotes. Fix the SVG and render again.`);
        } finally {
            if (url) { try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ } }
        }

        const canvas = document.createElement('canvas');
        canvas.width = size.width;
        canvas.height = size.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('The browser could not create a canvas to draw on.');
        ctx.drawImage(img, 0, 0, size.width, size.height);
        const png = await new Promise((resolve) => {
            try { canvas.toBlob((b) => resolve(b || null), 'image/png'); }
            catch (e) { resolve(null); }
        });
        if (!png) throw new Error('The browser could not encode the PNG. Try a smaller width and height.');

        // Same write-lock as the text tools (see withFileLock). writeFileVerified
        // compares text, so a PNG is checked by its size instead.
        await window.withFileLock(output, async () => {
            for (let attempt = 1; ; attempt++) {
                await puter.fs.write(output, png, { createMissingParents: true });
                let stat = null;
                try { stat = await puter.fs.stat(output); } catch (e) { stat = null; }
                if (stat && Number(stat.size) === png.size) return;
                if (attempt >= 3) throw new Error(`Write to ${output} did not persist. Render again.`);
                await new Promise((r) => setTimeout(r, 150));
            }
        });
        window.markProjectModified?.(undefined, state?.currentChatId);
        window.recordPreviewChange?.(output);
        window.schedulePreviewRefresh?.();

        const root = window.projectRootDir(state);
        const relative = output.startsWith(root + '/') ? output.slice(root.length + 1) : output;
        const filename = output.slice(output.lastIndexOf('/') + 1);

        // Show the PNG in the chat as a card, like GenerateImage (show_image.js).
        const shown = await window.showProjectImageInChat(output, state);
        const lead = I.caption(raw, relative, size)
            + (shown ? ' It is now showing in the chat, so do not repeat its path, a link, or Markdown to display it.' : '')
            + ' Reference it by that relative path in the code.';

        // Shown to the model fitted to the vision limits, like ViewImage. The
        // file on disk keeps the full size.
        const { fitImageForVision, VISION_MAX_BYTES } = window.__viewImageInternals;
        const fit = await fitImageForVision(png, 'image/png');
        if (fit.decodable === false || fit.blob.size > VISION_MAX_BYTES) {
            // Shaped like a GenerateImage result, so loadChat shows the card again.
            return { success: true, kind: 'image', prompt: relative, path: output, filename, width: size.width, height: size.height, note: lead };
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
        return {
            __contentBlocks: [
                { type: "text", text: lead + ' Check the image below; if something is missing or wrong, fix the SVG and render again:' },
                { type: "image", source: { type: "base64", media_type: fit.mediaType, data: base64 } },
            ],
        };
    }
});
