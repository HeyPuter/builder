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
        // With the element, a signed-in user takes the else branch: theme
        // toggle and Send feedback in the toolbar, as when hosted inside Puter.
        const other = menu.slice(menu.indexOf('} else {'), menu.indexOf('$container.html(h);'));
        check('signed in with the element: the theme toggle stays in the toolbar', /if \(loggedIn\) \{[\s\S]*class="theme-toggle-btn"/.test(other));
        check('…and so does Send feedback', other.includes('if (loggedIn && feedbackAvailable()) {'));
        check('…as an icon beside the element, and as the labelled pill inside Puter',
            /h \+= sdkMenu && !isApp\s*\? `<button class="feedback-btn feedback-icon-btn" title="Send feedback" aria-label="Send feedback">\$\{window\.feedback_svg\}<\/button>`\s*: `<button class="feedback-btn" title="Send feedback">Send feedback<\/button>`;/.test(other));
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

// ---- Styles --------------------------------------------------------------------
{
    check('the controls wrapper joins the container\'s row', /\.user-menu-controls \{ display: contents; \}/.test(css));
    check('the element honours [hidden]', /puter-user-menu\[hidden\] \{ display: none; \}/.test(css));
    check('its parts take the builder\'s looks',
        ['apps-button', 'avatar', 'sign-in'].every((p) => css.includes(`puter-user-menu::part(${p}) {`)));
    check('phones get 44px targets', /puter-user-menu::part\(apps-button\),\s*\.feedback-btn\.feedback-icon-btn \{\s*width: 44px;/.test(css)
        && /puter-user-menu::part\(avatar\) \{\s*width: 44px;/.test(css));
    check('the cluster closes its gaps on phones', css.includes('.user-menu-container:has(puter-user-menu:not([hidden])) {'));
    check('the GitHub link steps aside for the signed-in row on phones',
        /@media \(max-width: 600px\) \{\s*\.user-menu-container:has\(\.feedback-icon-btn\) \.github-link \{ display: none; \}/.test(css));
    check('its apps button steps aside in the one-row phone preview toolbar',
        css.includes('body.preview-active .toolbar:not(:has(.feedback-btn)) puter-user-menu::part(apps-button)'));
    check('dark mode styles its panels', css.includes('html[data-theme="dark"] puter-user-menu::part(apps-panel)'));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll <puter-user-menu> checks passed.');
