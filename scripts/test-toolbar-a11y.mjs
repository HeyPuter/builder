import fs from 'node:fs';

// ---- Regression guard: preview-toolbar controls say what they are -----------
// Small accessibility gaps in the preview toolbar, each invisible to a screen
// reader user:
//   * the click-to-edit toggle had no pressed state — nothing said whether
//     select mode was on;
//   * the device trigger was named just "Desktop" / "Tablet" / "Mobile", with
//     nothing saying it sizes the preview;
//   * the hosted-app theme toggle was always "Toggle dark mode", never saying
//     which mode was on;
//   * the version-history panel was an anonymous div although its button
//     announces a dialog;

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const ui = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');

// ---- Click-to-edit toggle: aria-pressed follows the select mode --------------
{
    check('the toggle starts unpressed', /<button class="preview-select-element" title="Select an element to edit" aria-pressed="false">/.test(ui));
    check('arming/disarming it from the toolbar updates the pressed state',
        /\$\(this\)\.toggleClass\('active', active\)\.attr\('aria-pressed', active \? 'true' : 'false'\);/.test(ui));
    const disarms = ui.match(/\$\('\.preview-select-element'\)\.removeClass\('active'\)[^;]*;/g) || [];
    check('every disarm (a pick, a reload, no bridge answering) clears it too',
        disarms.length >= 2 && disarms.every((d) => d.includes(".attr('aria-pressed', 'false')")), disarms.join('\n'));
}

// ---- Device trigger: named for what it controls ------------------------------
{
    check('the trigger starts as "Preview size: Desktop"',
        /<button class="preview-device-trigger" title="Desktop" aria-label="Preview size: Desktop"/.test(ui));
    const fn = ui.slice(ui.indexOf('function setPreviewDevice(device) {'), ui.indexOf('window.setPreviewDevice = setPreviewDevice;'));
    check('…and its name follows the chosen size', /\.attr\('aria-label', 'Preview size: ' \+ window\.DEVICE_LABELS\[device\]\)/.test(fn));
}

// ---- Hosted-app theme toggle: a toggle with a state ---------------------------
check('the theme toggle is "Dark mode", pressed when dark is on',
    /class="theme-toggle-btn"[^`]*aria-label="Dark mode" aria-pressed="\$\{dark \? 'true' : 'false'\}"/.test(ui)
    && !/aria-label="Toggle dark mode"/.test(ui));

// ---- Version history: the dialog its button announces ------------------------
{
    const versions = fs.readFileSync(new URL('../src/js/versions.js', import.meta.url), 'utf8');
    check('the history button announces a dialog', /class="preview-versions" title="Version history" aria-haspopup="dialog"/.test(ui));
    check('…and every state of the panel (list, loading, unavailable) is that labelled dialog',
        (versions.match(/'<div class="preview-versions-panel" role="dialog" aria-label="Version history">'/g) || []).length === 3
        && !/'<div class="preview-versions-panel">'/.test(versions));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll toolbar a11y checks passed.');
