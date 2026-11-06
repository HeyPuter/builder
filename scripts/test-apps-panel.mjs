import fs from 'node:fs';

// ---- Regression guard: the toolbar's Apps launcher ---------------------------
// Signed-in web users get a 3×3 "apps" button just left of the avatar that
// opens a panel showing puter.com/embed/apps in an iframe. Text-level checks
// that it is rendered only where the avatar is, sits right before it, behaves
// like the account panel (one open at a time, Escape / ✕ hand focus back,
// outside press closes) and that the stylesheet gives it its phone layout.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const ui = read('../src/js/ui.js');
const css = read('../src/css/styles.css');

function handler(event, selector) {
    const at = ui.indexOf(`$(document).on('${event}', '${selector}'`);
    if (at < 0) return '';
    return ui.slice(at, ui.indexOf('});', at) + 3);
}
function fnBody(name) {
    const at = ui.indexOf(`function ${name}(`);
    if (at < 0) return '';
    return ui.slice(at, ui.indexOf('\n}\n', at) + 3);
}

// ---- Toolbar button ----------------------------------------------------------
{
    const menu = fnBody('updateUserMenu');
    const signedIn = menu.slice(menu.indexOf('if (loggedIn && !isApp) {'), menu.indexOf('} else {'));
    const apps = signedIn.indexOf('class="apps-btn"');
    const avatar = signedIn.indexOf('class="user-menu-btn"');
    check('the apps button is rendered only in the signed-in web branch', apps > 0 && menu.split('class="apps-btn"').length === 2);
    check('…immediately left of the avatar', apps > 0 && avatar > apps && signedIn.lastIndexOf('h += githubLink;') < apps);
    check('…announces a dialog and its open state',
        /class="apps-btn" title="Apps" aria-label="Apps" aria-haspopup="dialog" aria-expanded="\$\{appsPanelOpen \? 'true' : 'false'\}"/.test(signedIn));
    check('a re-render keeps focus on it', menu.includes("'theme-toggle-btn', 'apps-btn', 'user-menu-btn'"));
    check('losing the signed-in web state closes an open panel', /if \(!\(loggedIn && !isApp\)\) window\.closeAppsPanel\?\.\(\);/.test(menu));
}

// ---- Panel -------------------------------------------------------------------
{
    check('it embeds puter.com/embed/apps', ui.includes("const APPS_EMBED_URL = 'https://puter.com/embed/apps';"));
    const build = fnBody('buildAppsPanel');
    check('the panel is a labelled dialog that starts hidden', build.includes('class="apps-panel" role="dialog" aria-label="Apps" tabindex="-1" hidden'));
    check('the iframe has a title', /<iframe class="apps-frame" title="[^"]+"/.test(build));
    check('the load listener is bound before src is set', build.indexOf("addEventListener('load'") < build.indexOf('frame.src = APPS_EMBED_URL'));
    check('the embed follows the app theme', build.includes('frame.style.colorScheme = getEffectiveTheme();') && fnBody('updateUserMenu').includes('window.syncAppsPanelTheme?.();'));

    const open = fnBody('openAppsPanel');
    check('opening reuses the built panel (built once)', /if \(!\$panel\.length\) \$panel = buildAppsPanel\(\);/.test(open));
    check('opening closes the account panel', open.includes('closeUserPanel();'));
    check('opening the account panel closes this one', fnBody('openUserPanel').includes('closeAppsPanel();'));

    check('the toolbar button toggles it', /if \(appsPanelOpen\) closeAppsPanel\(\);\s*else openAppsPanel\(\);/.test(handler('click', '.apps-btn')));
    check('✕ hands focus back to the button', /closeAppsPanel\(\);\s*\$\('\.apps-btn'\)\.trigger\('focus'\);/.test(handler('click', '.apps-panel-close')));
    {
        const at = ui.indexOf("$(document).on('keydown', '.apps-panel'");
        const body = ui.slice(at, ui.indexOf('});', at));
        check('Escape hands focus back too', at > 0 && /closeAppsPanel\(\);\s*\$\('\.apps-btn'\)\.trigger\('focus'\);/.test(body));
    }
    {
        const at = ui.indexOf("$(document).on('pointerdown', function(e) {\n    if (!appsPanelOpen) return;");
        const body = ui.slice(at, ui.indexOf('});', at));
        check('an outside press closes it, but not one on the panel, button or a Puter dialog',
            at > 0 && body.includes(".closest('.apps-panel')") && body.includes(".closest('.apps-btn')") && body.includes('isInPuterDialog(e.target)'));
    }
    check('a hidden button closes the panel instead of mis-aiming the caret',
        /if \(!btn \|\| !btn\.getClientRects\(\)\.length\) \{ closeAppsPanel\(\); return; \}/.test(fnBody('positionAppsPanel')));
}

// ---- Styles --------------------------------------------------------------------
{
    check('the panel honours [hidden]', /\.apps-panel\[hidden\] \{ display: none; \}/.test(css));
    check('it is sized from the measured top', css.includes('calc(100dvh - var(--apps-panel-top, 46px) - 12px)'));
    check('phones get an edge-to-edge sheet', /@media \(max-width: 600px\) \{\s*\.apps-panel \{\s*left: 8px;\s*right: 8px;/.test(css));
    check('the button gets a 44px touch target on phones', /\.github-link,\s*\.apps-btn,\s*\.user-menu-btn \{\s*width: 44px;/.test(css));
    check('it steps aside in the one-row phone preview toolbar', css.includes('body.preview-active .toolbar:not(:has(.feedback-btn)) .apps-btn'));
    check('dark mode styles the panel', css.includes('html[data-theme="dark"] .apps-panel {'));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll apps panel checks passed.');
