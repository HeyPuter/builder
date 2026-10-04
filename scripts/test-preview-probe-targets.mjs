import fs from 'node:fs';

// ---- Regression guard: preview updates don't wait on avoidable round trips ----
// Before every preview reload the builder re-syncs the draft site, picks up to
// six files to probe on the live site, reads their on-disk bytes, and then
// waits at least ten seconds "measured from just after the re-sync". The six
// reads ran one after another, a round trip each, and the ten-second clock
// only started after them — so every update (and every update_preview call the
// model makes) took a second or more longer than the floor promises.
//
// Runs the real buildProbeTargets against a fake filesystem; text-checks that
// the floor's clock starts at the re-sync.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const ui = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const a = ui.indexOf('const _TEXT_RE =');
const b = ui.indexOf('\n}\n', ui.indexOf('async function buildProbeTargets('));
const DIR = '/u/app/c1';
let inFlight = 0, maxInFlight = 0;
const files = {
    [DIR + '/index.html']: '<p>home</p>', [DIR + '/app.js']: 'js', [DIR + '/styles.css']: 'css',
    [DIR + '/a.js']: 'a', [DIR + '/b.js']: 'b', [DIR + '/c.js']: 'c', [DIR + '/d.js']: 'd', [DIR + '/e.js']: 'e',
};
const puter = { fs: { read: async (p) => {
    inFlight++; maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((r) => setTimeout(r, 10));
    inFlight--;
    if (!(p in files)) throw new Error('not found');
    return { text: async () => files[p] };
} } };
const buildProbeTargets = new Function('puter', ui.slice(a, b + 2) + '\nreturn buildProbeTargets;')(puter);

{
    const changed = ['app.js', 'styles.css', 'gone.js', 'a.js', 'b.js', 'c.js', 'd.js', 'e.js', 'logo.png'].map((f) => DIR + '/' + f);
    const t0 = Date.now();
    const targets = await buildProbeTargets('https://preview-x.puter.site/', DIR, changed);
    const elapsed = Date.now() - t0;
    check('at most six files are probed', targets.length === 6, String(targets.length));
    check('the entry page is always among them', targets.some((t) => t.url.endsWith('/index.html')));
    check('an unreadable (deleted) file frees its slot for the next one', !targets.some((t) => t.url.endsWith('/gone.js')) && targets.length === 6);
    check('non-text files are never probed', !targets.some((t) => /\.png$/.test(t.url)));
    check('each target carries the bytes on disk', targets.find((t) => t.url.endsWith('/styles.css')).expected === 'css');
    check('the reads run in parallel, not one round trip after another', maxInFlight > 1 && elapsed < 6 * 10, `max in flight ${maxInFlight}, ${elapsed}ms`);
}

{
    const run = ui.slice(ui.indexOf('async function runPreviewRefresh('));
    const resync = run.indexOf('await puter.hosting.update(sub, dir);');
    const clock = run.indexOf('const waitStart = Date.now();');
    const probeRead = run.indexOf('targets = await buildProbeTargets(');
    check('the ten-second floor starts at the re-sync, before the probe reads', resync > 0 && clock > resync && clock < probeRead, `${resync} ${clock} ${probeRead}`);
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll preview probe-target checks passed.');
