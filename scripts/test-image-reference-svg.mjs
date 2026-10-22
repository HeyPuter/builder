import fs from 'node:fs';

// ---- Regression guard: an SVG can be edited or animated ----------------------
// GenerateImage's input_images and GenerateVideo's input_image read the file
// with puter.fs.read, which returns it untyped. A PNG or GIF still decodes
// (the browser sniffs raster bytes), but an SVG only decodes when its blob says
// image/svg+xml, so every edit or animation of an SVG failed with '"logo.svg"
// is not a readable image.' The read is now typed from the file's extension
// before it is decoded — only when the bytes aren't a raster format already,
// so a JPEG saved as .png is still declared as the JPEG it is.
//
// Decoding needs a browser (checked in Chromium and WebKit); this runs the real
// imageDataURL from src/js/media.js with a stand-in for the decoder that, like
// a browser, can only decode an SVG blob that names its type.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const mediaSrc = read('../src/js/media.js');
const viewSrc = read('../src/tools/fs/view_image.js');

const files = {
    '/m/logo.svg': new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32"><rect width="64" height="32" fill="red"/></svg>']),
    '/m/photo.png': new Blob([new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4])]), // JPEG bytes behind a .png name
};
const win = { tools: [] };
// The real sniffer; a decoder stand-in.
new Function('window', 'document', viewSrc.slice(0, viewSrc.indexOf('window.tools.push(')))(win, {});
const seen = [];
const realSniff = win.__viewImageInternals.sniffImageType;
win.__viewImageInternals = {
    sniffImageType: realSniff,
    fitImageForVision: async (blob, mediaType, opts) => {
        seen.push({ type: blob.type, mediaType, force: !!(opts && opts.force) });
        const head = new TextDecoder().decode(new Uint8Array(await blob.slice(0, 4).arrayBuffer()));
        if (head.startsWith('<svg') && blob.type !== 'image/svg+xml') return { blob, mediaType, width: 0, height: 0, decodable: false };
        if (opts && opts.force) return { blob: new Blob([new Uint8Array([0x89, 0x50, 0x4E, 0x47])], { type: 'image/png' }), mediaType: 'image/png', width: 64, height: 32, fitted: true };
        return { blob, mediaType, width: 64, height: 32, fitted: false };
    },
};
// FileReader.readAsDataURL, as the browser does it.
globalThis.FileReader = class {
    readAsDataURL(blob) {
        blob.arrayBuffer().then((buf) => { this.result = `data:${blob.type || 'application/octet-stream'};base64,` + Buffer.from(buf).toString('base64'); this.onload(); });
    }
};
const puter = { fs: { read: async (p) => new Blob([await files[p].arrayBuffer()]) } };
const chain = new Proxy(function () {}, { get: () => () => chain, apply: () => chain });
new Function('window', 'puter', '$', 'localStorage', 'document', mediaSrc)(win, puter, () => chain, { getItem: () => null }, {});
const GM = win.GeneratedMedia;

let svg = null, err = null;
try { svg = await GM.imageDataURL('/m/logo.svg'); } catch (e) { err = e; }
check('an SVG reference image is readable', !err && typeof svg === 'string', err && err.message);
check('…decoded as image/svg+xml', seen[0] && seen[0].type === 'image/svg+xml', JSON.stringify(seen[0]));
check('…and sent re-encoded as a PNG the editors take', !!svg && svg.startsWith('data:image/png;base64,'), svg && svg.slice(0, 30));

seen.length = 0;
const jpg = await GM.imageDataURL('/m/photo.png');
check('raster bytes are not retyped from the name', seen[0] && seen[0].type === '' && seen[0].mediaType === 'image/jpeg', JSON.stringify(seen[0]));
check('…so a JPEG behind a .png name is still declared as a JPEG', jpg.startsWith('data:image/jpeg;base64,'), jpg.slice(0, 30));

// GenerateVideo keeps a start image's shape: the size comes back on request.
const sized = await GM.imageDataURL('/m/logo.svg', { withSize: true });
check('withSize also reports the image\'s size', sized && sized.width === 64 && sized.height === 32 && sized.dataURL === svg, JSON.stringify(sized && { w: sized.width, h: sized.height }));

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll SVG reference-image checks passed.');
