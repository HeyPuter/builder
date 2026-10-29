import fs from 'node:fs';

// ---- Regression guard: a published site's preview card has a full image URL --
// X, Facebook, LinkedIn and Discord don't resolve a relative og:image or
// twitter:image, and the AI can't write the full URL because it doesn't know
// the address the user publishes at. So the AI writes a relative path and
// publishing fills in the address, in the published copy only (ui.js). An
// address change moves the URLs to the new address.
//
// Runs the real social-images.js, and checks the publish wiring in ui.js.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const window = {};
new Function('window', read('../src/js/social-images.js'))(window);
const { absolutize } = window.SocialImages;

const SITE = 'https://cafe.puter.site/';
const PREVIEW = 'https://preview-1234.puter.site/';
const page = (head) => `<html><head>${head}</head><body><img src="assets/a.png"></body></html>`;

const rel = absolutize(page('<meta property="og:image" content="assets/preview.png">'), SITE + 'index.html');
check('a relative og:image gets the site address', rel.changed && rel.text.includes('content="https://cafe.puter.site/assets/preview.png"'));
check('nothing else on the page changes', rel.text.includes('<img src="assets/a.png">'));

const tw = absolutize(page(`<meta content='assets/x.png' name='twitter:image'>`), SITE + 'index.html');
check('twitter:image too, in either attribute order and quote style', tw.text.includes(`content='https://cafe.puter.site/assets/x.png'`));

const nested = absolutize(page('<meta property="og:image" content="../assets/p.png">'), SITE + 'menu/index.html');
check('a path is resolved from the page it is on', nested.text.includes('https://cafe.puter.site/assets/p.png'));
const rooted = absolutize(page('<meta property="og:image" content="/assets/p.png">'), SITE + 'menu/index.html');
check('a root path is resolved from the site root', rooted.text.includes('https://cafe.puter.site/assets/p.png'));
const spaced = absolutize(page('<meta property="og:image" content="assets/my card.png">'), SITE + 'index.html');
check('spaces are encoded', spaced.text.includes('https://cafe.puter.site/assets/my%20card.png'));

const variants = absolutize(page(
    '<meta property="og:image:url" content="a.png"><meta property="og:image:secure_url" content="b.png"><meta name="twitter:image:src" content="c.png">'),
SITE + 'index.html');
check('og:image:url, og:image:secure_url and twitter:image:src as well',
    ['a', 'b', 'c'].every((n) => variants.text.includes(`https://cafe.puter.site/${n}.png`)));

const other = absolutize(page('<meta property="og:image" content="https://cdn.example.com/x.png">'), SITE + 'index.html', [PREVIEW]);
check('a full URL on another site is left alone', !other.changed);
const data = absolutize(page('<meta property="og:image" content="data:image/png;base64,AAAA">'), SITE + 'index.html');
check('a data: URL is left alone', !data.changed);
const notSocial = absolutize(page('<meta property="og:title" content="assets/x.png"><link rel="icon" href="icon.png">'), SITE + 'index.html');
check('other tags are left alone', !notSocial.changed);

const preview = absolutize(page('<meta property="og:image" content="https://preview-1234.puter.site/assets/p.png?v=2">'), SITE + 'index.html', [PREVIEW]);
check('a URL on the preview moves to the published address',
    preview.text.includes('content="https://cafe.puter.site/assets/p.png?v=2"'));
const renamed = absolutize(rel.text, 'https://bistro.puter.site/index.html', ['https://cafe.puter.site/']);
check('after an address change, the URL moves to the new address',
    renamed.changed && renamed.text.includes('https://bistro.puter.site/assets/preview.png') && !renamed.text.includes('cafe.puter.site'));
const again = absolutize(rel.text, SITE + 'index.html', [PREVIEW]);
check('publishing again changes nothing', !again.changed && again.text === rel.text);
check('a bad page URL changes nothing', !absolutize(page('<meta property="og:image" content="a.png">'), 'not a url').changed);

// --- Publish wiring --------------------------------------------------------------
const ui = read('../src/js/ui.js');
const vite = read('../vite.config.js');
check('the module is in the bundle, before ui.js',
    vite.includes("'js/social-images.js'") && vite.indexOf("'js/social-images.js'") < vite.indexOf("'js/ui.js'"));
const publish = ui.slice(ui.indexOf('async function doPublish('), ui.indexOf('async function loadPublishedSiteMeta('));
check('a first publish fills in the new address once it exists',
    /url = `https:\/\/\$\{sub\}\.puter\.site\/`;[\s\S]{0,600}?await absolutizeSocialImagesInRelease\(releaseDir, url, \[startPreviewUrl\]\);/.test(publish));
check('a re-publish fills it in before the address serves the release',
    /await absolutizeSocialImagesInRelease\(releaseDir, url, \[startPreviewUrl\]\);\s*await puter\.hosting\.update\(existingSub, releaseDir\);/.test(publish));
const captures = publish.slice(publish.indexOf('const startUrl = window.currentPublishedUrl;'), publish.indexOf('const startPreviewUrl = window.currentPreviewUrl'));
check('the preview address is read with the publish address, before a project switch can change it',
    captures.length > 0 && !/\bawait\b/.test(captures.replace(/\/\/[^\n]*/g, '')));
check('both address editors move the URLs after the new address exists',
    /await puter\.hosting\.create\(newSub, path\);\s*const newUrl = `https:\/\/\$\{newSub\}\.puter\.site\/`;[\s\S]{0,400}?await absolutizeSocialImagesInRelease\(path, newUrl, \[oldUrl\]\);/.test(ui)
    && /await puter\.hosting\.create\(newSub, path\);[\s\S]{0,400}?await absolutizeSocialImagesInRelease\(path, `https:\/\/\$\{newSub\}\.puter\.site\/`, \[pub\.url\]\);/.test(ui));
const prompt = read('../src/js/prompt.js');
check('the prompt has the AI write a relative path', /og:image and twitter:image at the PNG with a relative path/.test(prompt));

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nAll social-images checks passed');
