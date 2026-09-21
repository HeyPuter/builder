import fs from 'node:fs';

// ---- Regression guard: the version cap never retires a restore's target ----
// performCreateVersion prunes the oldest snapshots past MAX_VERSIONS. A
// restore of a project sitting at the cap first takes a "Before restore"
// safety snapshot (when the working dir is dirty) — pushing the history one
// over the cap AFTER the restore has already verified its target exists. The
// plain oldest-first prune then deleted the restore target itself when it was
// the oldest version, and the restore failed with "not found" against a
// snapshot that no longer existed: the user asked for version 1 and lost it.
//
// Evaluates the real versionsToPrune out of versions.js and text-asserts that
// the restore passes its target as `protect`.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const src = fs.readFileSync(new URL('../src/js/versions.js', import.meta.url), 'utf8');
const a = src.indexOf('    function versionsToPrune(');
const b = src.indexOf('    window.__versionsToPrune = versionsToPrune;');
if (a < 0 || b <= a) throw new Error('could not extract versionsToPrune from versions.js');
const capMatch = src.match(/const MAX_VERSIONS = (\d+);/);
const MAX_VERSIONS = Number(capMatch && capMatch[1]);
check('MAX_VERSIONS is a positive number', MAX_VERSIONS > 0);
const versionsToPrune = new Function('MAX_VERSIONS', src.slice(a, b) + '\n; return versionsToPrune;')(MAX_VERSIONS);

const mk = (n) => Array.from({ length: n }, (_, i) => ({ id: 'v_' + String(i + 1).padStart(3, '0') }));
const ids = (arr) => arr.map(v => v.id).join(',');

// Under the cap: nothing goes.
check('under the cap → nothing pruned', versionsToPrune(mk(MAX_VERSIONS), 'v_001').length === 0);
check('exactly at the cap → nothing pruned', versionsToPrune(mk(MAX_VERSIONS), 'v_' + String(MAX_VERSIONS).padStart(3, '0')).length === 0);

// One over: the oldest goes, unless it is current or protected.
{
    const list = mk(MAX_VERSIONS + 1);
    check('one over the cap → the oldest is pruned', ids(versionsToPrune(list, list[list.length - 1].id)) === 'v_001');
    check('… but not when the oldest is the current version (the next oldest goes instead)',
        ids(versionsToPrune(list, 'v_001')) === 'v_002');
    check('… and not when the oldest is the restore target (protect)',
        ids(versionsToPrune(list, list[list.length - 1].id, 'v_001')) === 'v_002');
    check('current AND protect are both exempt', ids(versionsToPrune(list, 'v_001', 'v_002')) === 'v_003');
}

// The exact failure: restore the OLDEST of a capped, dirty project.
{
    const list = mk(MAX_VERSIONS);
    const safety = { id: 'v_safety' };
    list.push(safety); // the "Before restore" snapshot lands and becomes current
    const pruned = versionsToPrune(list, safety.id, 'v_001');
    check('restoring version 1 at the cap: version 1 survives the safety snapshot\'s prune',
        !pruned.some(v => v.id === 'v_001'));
    check('… exactly one other version is retired to hold the cap', ids(pruned) === 'v_002');
}

// Several over (legacy over-full index): prunes just enough, oldest first.
{
    const list = mk(MAX_VERSIONS + 3);
    check('three over → the three oldest go', ids(versionsToPrune(list, 'v_050')) === 'v_001,v_002,v_003');
}
check('odd input tolerated', versionsToPrune(null, null).length === 0);

// --- wiring: the restore hands its target over as `protect` ----------------
const restore = src.slice(src.indexOf('async function restoreVersion('), src.indexOf('// ----- undo/redo toolbar navigation'));
check('restoreVersion passes protect: versionId to the safety snapshot',
    /createProjectVersion\(\{[^}]*label: 'Before restore'[^}]*protect: versionId/.test(restore));
check('performCreateVersion prunes via versionsToPrune with opts.protect',
    /versionsToPrune\(index\.versions, index\.current, opts\.protect\)/.test(src));

if (failures) { console.error(`\n${failures} version-prune check(s) failed.`); process.exit(1); }
console.log('\nAll version-prune checks passed.');
