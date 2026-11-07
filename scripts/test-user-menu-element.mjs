import fs from 'node:fs';

// ---- Regression guard: puter.js's <puter-user-menu> in the toolbar ----------
// When the running puter.js defines <puter-user-menu>, it holds the apps
// launcher and the account button, and the builder's own pair stands down.
// Checks that it is placed outside the re-rendered controls, that the builder
// then keeps its theme toggle and Send feedback in the toolbar, that its
// sign-in and sign-out reach the builder's usual paths, and that the stylesheet
// gives it the builder's look and phone layout. Without the element, the
// builder's own launcher and account panel are unchanged (test-apps-panel).

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8');
const ui = read('../src/js/ui.js');
const css = read('../src/css/styles.css');

function fnBody(name) {
    const at = ui.indexOf(`function ${name}(`);
    if (at < 0) return '';
    return ui.slice(at, ui.indexOf('\n}\n', at) + 3);
}
function handlerSource(event, selector) {
    const at = ui.indexOf(`$(document).on('${event}', '${selector}'`);
    if (at < 0) return '';
    return ui.slice(at, ui.indexOf('\n});\n', at) + 5);
}
// Runs a `$(document).on(...)` block against stubs and returns its handler.
function loadHandler(event, selector, globals) {
    let registered = null;
    const $ = () => ({ on: (_event, _selector, fn) => { registered = fn; } });
    const names = Object.keys(globals);
    new Function('$', 'document', ...names, handlerSource(event, selector))($, {}, ...names.map((n) => globals[n]));
    return registered;
}

// ---- Toolbar markup ------------------------------------------------------------
{
    const at = ui.indexOf('<div class="user-menu-container">');
    const markup = ui.slice(at, ui.indexOf("h += `</div>`;", at));
    check('the container holds a controls wrapper for updateUserMenu', markup.includes('<div class="user-menu-controls"></div>'));
    check('the element is added only when puter.js defines it',
        markup.includes("if (window.customElements?.get('puter-user-menu')) {"));
    check('…after the controls wrapper, so re-renders never replace it',
        markup.indexOf('<puter-user-menu') > markup.indexOf('<div class="user-menu-controls"></div>'));
    check('…with the builder\'s own wording', markup.includes('sign-in-label="Sign In" sign-out-label="Log out"'));
}

// ---- updateUserMenu ------------------------------------------------------------
{
    const menu = fnBody('updateUserMenu');
    check('it re-renders only the controls wrapper', menu.includes("const $container = $('.user-menu-controls');"));
    check('the builder\'s own launcher and account button stand down for the element',
        menu.includes("const sdkMenu = document.querySelector('puter-user-menu');")
        && menu.includes('const ownMenu = !isApp && !sdkMenu;')
        && menu.includes('if (loggedIn && ownMenu) {')
        && /if \(ownMenu\) \{\s*h \+= appsBtn;\s*h \+= `<button class="sign-in-btn">Sign In<\/button>`;/.test(menu));
    {
        // With the element, a signed-in user takes the else branch. The theme
        // toggle stays only inside Puter; with the element it is in Settings.
        const other = menu.slice(menu.indexOf('} else {'), menu.indexOf('$container.html(h);'));
        check('the toolbar theme toggle is only for signed-in users without the Settings gear',
            /if \(loggedIn && !\(sdkMenu && !isApp\)\) \{[\s\S]*class="theme-toggle-btn"/.test(other));
        check('the toolbar has no Send feedback button',
            !other.includes('feedback') && !ui.includes("on('click', '.feedback-btn'") && !css.includes('.feedback-btn'));
    }
    check('the builder paints its own avatar only for its own account button',
        /if \(loggedIn && ownMenu\) \{\s*paintAvatar\(/.test(menu));
    check('the element hides inside Puter, where it renders nothing but would take a gap',
        menu.includes('sdkMenu.hidden = isApp;'));
    check('the element follows the builder\'s theme', menu.includes("sdkMenu.setAttribute('theme', getEffectiveTheme());"));
}

// ---- Sign-in -------------------------------------------------------------------
{
    const user = { username: 'ann', uuid: 'u-1' };
    const calls = [];
    const window = {};
    const handler = loadHandler('signin', 'puter-user-menu', {
        window,
        initializeUser: async () => { calls.push('initializeUser'); return null; },
        ensureAuthenticated: async () => { calls.push(`ensureAuthenticated:${window.user?.username}`); },
        updateUserMenu: () => calls.push('updateUserMenu'),
        console,
    });
    await handler({ originalEvent: { detail: { user } } });
    check('the element\'s sign-in sets the user before finishing the setup, without asking again',
        window.user === user && calls[0] === 'updateUserMenu' && calls.includes('ensureAuthenticated:ann') && !calls.includes('initializeUser'),
        JSON.stringify(calls));

    calls.length = 0;
    delete window.user;
    await handler({ originalEvent: { detail: { user: null } } });
    check('without a user in the event, it reads one; with none, it stops short of the setup',
        calls.includes('initializeUser') && !calls.some((c) => c.startsWith('ensureAuthenticated')), JSON.stringify(calls));

    calls.length = 0;
    await handler({ originalEvent: { detail: { user: { username: 'tmp', is_temp: true } } } });
    check('a temporary account stops short of the setup too', !calls.some((c) => c.startsWith('ensureAuthenticated')), JSON.stringify(calls));
}

// ---- Sign-out -------------------------------------------------------------------
{
    check('both log-outs forget the account on this device the same way',
        /forgetAccountOnDevice\(\);\s*puter\.auth\.signOut\(\);\s*location\.reload\(\);/.test(handlerSource('click', '.user-panel-logout')));
    const calls = [];
    const handler = loadHandler('signout', 'puter-user-menu', {
        forgetAccountOnDevice: () => calls.push('forget'),
        location: { reload: () => calls.push('reload') },
        puter: { auth: { signOut: () => calls.push('signOut') } },
    });
    handler();
    check('the element\'s sign-out forgets the account and reloads, without signing out twice',
        calls.join(',') === 'forget,reload', calls.join(','));
}

// ---- Settings gear ---------------------------------------------------------------
{
    const menu = fnBody('updateUserMenu');
    const other = menu.slice(menu.indexOf('} else {'), menu.indexOf('$container.html(h);'));
    check('signed in with the element, a Settings gear is offered (not inside Puter)',
        /if \(loggedIn && sdkMenu && !isApp\) \{\s*h \+= `<button class="settings-btn" title="Settings" aria-label="Settings" aria-haspopup="dialog">\$\{settings_svg\}<\/button>`;/.test(other));
    check('…last in the controls, so it sits just left of the element',
        other.lastIndexOf('h +=') === other.indexOf('h += `<button class="settings-btn"'));
    check('…and keeps focus across re-renders', menu.includes("'settings-btn'"));
    check('the gear opens Settings', /\$\(document\)\.on\('click', '\.settings-btn'[\s\S]{0,120}window\.openSettings\?\.\(\);/.test(ui));
    const mcp = read('../src/js/mcp-ui.js');
    check('Settings is a dialog named "Settings" with MCP connections and Appearance tabs',
        mcp.includes('aria-labelledby="settings-title"') && mcp.includes('<h2 id="settings-title">Settings</h2>')
        && mcp.includes('role="tablist" aria-label="Settings sections"')
        && mcp.includes('role="tab" id="settings-tab-mcp" aria-controls="settings-panel-mcp" data-tab="mcp">MCP connections</button>')
        && mcp.includes('role="tab" id="settings-tab-appearance" aria-controls="settings-panel-appearance" data-tab="appearance">Appearance</button>')
        && mcp.includes('role="tabpanel" id="settings-panel-mcp" aria-labelledby="settings-tab-mcp"')
        && mcp.includes('role="tabpanel" id="settings-panel-appearance" aria-labelledby="settings-tab-appearance"'));
    check('Appearance holds the shared Light / Dark / Device radio group',
        mcp.includes('<span class="user-theme-label" id="settings-theme-label">Theme</span>')
        && mcp.includes("${window.themeSegmentHtml('settings-theme-label')}")
        && ui.includes("themeSegmentHtml('user-theme-label')"));
    check('…kept in sync wherever it is open', /window\.syncUserPanelTheme = function\(\) \{\s*const \$seg = \$\('\.user-theme-seg'\);/.test(ui));
    check('only the selected tab is a Tab stop; arrows and Home/End move between tabs',
        mcp.includes("$(this).attr({ 'aria-selected': selected ? 'true' : 'false', tabindex: selected ? '0' : '-1' });")
        && mcp.includes("const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];")
        && mcp.includes("this.hidden = this.dataset.tab !== key;"));
    check('closing after a theme change refocuses the re-rendered gear',
        mcp.includes("document.querySelector('.settings-btn')?.focus({ preventScroll: true });"));
    check('the account panel\'s MCP row opens Settings on the MCP tab',
        mcp.includes("$(document).on('click', '.user-panel-mcp', () => window.openSettings('mcp'));"));
    check('a backdrop click jolts Settings instead of closing it',
        /\$overlay\.on\('click', e => \{\s*if \(!pressedBackdrop \|\| e\.target !== \$overlay\[0\]\) return;[\s\S]*?classList\.add\('is-jolting'\);\s*\}\);/.test(mcp)
        && !/\$overlay\.on\('click', e => \{[^}]*closePanel/.test(mcp));
    check('the jolt animates, with a still ring under reduced motion',
        css.includes('.confirm-modal-overlay.open .settings-modal.is-jolting { animation: settings-jolt 0.3s ease; }')
        && /@media \(prefers-reduced-motion: reduce\) \{\s*\.confirm-modal-overlay\.open \.settings-modal\.is-jolting \{ animation: settings-jolt-still/.test(css));
    check('the gear takes the toolbar icons\' looks, in both themes and on phones',
        /\.apps-btn,\s*\.settings-btn \{\s*background: none;/.test(css)
        && css.includes('html[data-theme="dark"] .settings-btn { color: var(--text-secondary); }')
        && /\.settings-btn,\s*\.user-menu-btn \{\s*width: 44px;/.test(css));
}

// ---- Styles --------------------------------------------------------------------
{
    check('the controls wrapper joins the container\'s row', /\.user-menu-controls \{ display: contents; \}/.test(css));
    check('the element honours [hidden]', /puter-user-menu\[hidden\] \{ display: none; \}/.test(css));
    check('its parts take the builder\'s looks',
        ['apps-button', 'avatar', 'sign-in'].every((p) => css.includes(`puter-user-menu::part(${p}) {`)));
    check('phones get 44px targets', /puter-user-menu::part\(apps-button\) \{\s*width: 44px;/.test(css)
        && /puter-user-menu::part\(avatar\) \{\s*width: 44px;/.test(css));
    check('the cluster closes its gaps on phones', css.includes('.user-menu-container:has(puter-user-menu:not([hidden])) {'));
    check('the GitHub link steps aside for the signed-in row on phones',
        /@media \(max-width: 600px\) \{\s*\.user-menu-container:has\(\.settings-btn\) \.github-link \{ display: none; \}/.test(css));
    check('its apps button steps aside in the one-row phone preview toolbar',
        css.includes('body.preview-active .toolbar puter-user-menu::part(apps-button)'));
    check('dark mode styles its panels', css.includes('html[data-theme="dark"] puter-user-menu::part(apps-panel)'));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll <puter-user-menu> checks passed.');
