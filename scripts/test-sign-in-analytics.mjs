// Sign-in analytics (js/app.js). Prompt Sent says whether the visitor was
// signed in when they sent from the composer, and Sign In Result says how each
// sign-in the builder asked for ended (status) and where it started (source).
// Together they show how many signed-out visitors log in after sending.
//
// The helpers and ensureAuthenticated run for real against a stubbed puter
// and window. The send path and the entry points are checked in the source.

import fs from 'node:fs';

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { failures++; console.log('FAIL - ' + name); }
}

const APP = fs.readFileSync(new URL('../src/js/app.js', import.meta.url), 'utf8');
const UI = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const TEMPLATES = fs.readFileSync(new URL('../src/js/templates.js', import.meta.url), 'utf8');
const VOICE = fs.readFileSync(new URL('../src/js/voice-input.js', import.meta.url), 'utf8');

const a = APP.indexOf('// Sign-in analytics, for the funnel');
const fnAt = APP.indexOf('async function ensureAuthenticated(');
const b = APP.indexOf('\n}\n', fnAt) + 3;
check('the sign-in analytics block and ensureAuthenticated are found', a > 0 && fnAt > a && b > fnAt);
const CODE = APP.slice(a, b);

function load({ signIn, isSignedIn, user = null, track } = {}) {
    const calls = [];
    const win = {
        user,
        _authInitDone: true,
        track: track !== undefined ? track : (event, props) => calls.push([event, props]),
    };
    const puter = {
        auth: {
            signIn: signIn || (async () => ({ success: true })),
            getUser: async () => ({ username: 'someone', is_temp: false }),
            isSignedIn: isSignedIn || (() => false),
        },
    };
    const api = new Function('window', 'puter', 'initAuthenticatedState', 'applyHomeGreeting',
        CODE + '\nreturn { ensureAuthenticated, isSignedInNow, trackSignInResult };'
    )(win, puter, async () => {}, () => {});
    return { ...api, win, calls };
}

// A sign-in that works.
{
    const { ensureAuthenticated, calls, win } = load();
    await ensureAuthenticated('send');
    check('a sign-in that works reports signed_in with its source',
        calls.length === 1 && calls[0][0] === 'Sign In Result'
        && calls[0][1].status === 'signed_in' && calls[0][1].source === 'send');
    check('…and the user is set', win.user && win.user.username === 'someone');
}

// The popup closed without signing in.
{
    const { ensureAuthenticated, calls } = load({
        signIn: async () => { throw { error: 'auth_window_closed' }; },
    });
    let threw = null;
    try { await ensureAuthenticated('button'); } catch (e) { threw = e; }
    check('a closed popup reports closed with its source',
        calls.length === 1 && calls[0][1].status === 'closed' && calls[0][1].source === 'button');
    check('…and still throws to the caller', threw && threw.error === 'auth_window_closed');
}

// Any other sign-in error.
{
    const { ensureAuthenticated, calls } = load({
        signIn: async () => { throw { error: 'unsupported_origin' }; },
    });
    let threw = false;
    try { await ensureAuthenticated('template'); } catch (e) { threw = true; }
    check('another sign-in error reports failed',
        calls.length === 1 && calls[0][1].status === 'failed' && calls[0][1].source === 'template');
    check('…and still throws', threw);
}
{
    const { ensureAuthenticated, calls } = load({ signIn: async () => { throw new Error('network'); } });
    try { await ensureAuthenticated('voice'); } catch (e) { /* expected */ }
    check('a thrown Error (no error code) reports failed', calls.length === 1 && calls[0][1].status === 'failed');
}

// Already signed in: no popup, nothing to report.
{
    const { ensureAuthenticated, calls } = load({ user: { username: 'someone', is_temp: false } });
    await ensureAuthenticated('send');
    check('an already signed-in user sends no Sign In Result', calls.length === 0);
}

// A caller that names no source.
{
    const { ensureAuthenticated, calls } = load();
    await ensureAuthenticated();
    check('no source is reported as other', calls.length === 1 && calls[0][1].source === 'other');
}

// Analytics never breaks sign-in.
{
    const { ensureAuthenticated, win } = load({ track: null });
    let threw = false;
    try { await ensureAuthenticated('send'); } catch (e) { threw = true; }
    check('no window.track: sign-in still works', !threw && win.user);
}

// isSignedInNow follows puter.auth.isSignedIn and never throws.
{
    check('isSignedInNow is true when puter says signed in', load({ isSignedIn: () => true }).isSignedInNow() === true);
    check('isSignedInNow is false when puter says signed out', load({ isSignedIn: () => false }).isSignedInNow() === false);
    check('isSignedInNow is false when puter throws',
        load({ isSignedIn: () => { throw new Error('not ready'); } }).isSignedInNow() === false);
}

// The send path. Prompt Sent fires once per page load for a composer send,
// after the guards that call a send off and before the sign-in gate.
{
    const sendAt = APP.indexOf('async function sendChatMessage(');
    const sendSrc = APP.slice(sendAt, APP.indexOf('\n}\n', sendAt));
    const promptIdx = sendSrc.indexOf("window.track?.('Prompt Sent', { signed_in: isSignedInNow() });");
    const gateIdx = sendSrc.indexOf("await ensureAuthenticated('send');");
    const setupIdx = sendSrc.indexOf('_sendSetupInFlight = true;');
    check('send tracks Prompt Sent with signed_in', promptIdx > 0);
    check('…before the sign-in gate', gateIdx > promptIdx);
    check('…after the guards that call the send off', setupIdx > 0 && setupIdx < promptIdx);
    check('…only for a composer send (no resume, queued, or programmatic text)',
        sendSrc.includes('if (!_promptSentTracked && userInput == null && chat_input_message == null && !opts.resume && !opts.queued) {'));
    check('…once per page load', /let _promptSentTracked = false;/.test(APP)
        && sendSrc.includes('_promptSentTracked = true;'));
}

// Every place that can open the sign-in popup says where it is.
check('the Sign In button passes source button', UI.includes("await ensureAuthenticated('button');"));
check('Use this template passes source template', TEMPLATES.includes("await ensureAuthenticated('template');"));
check('the mic passes source voice', VOICE.includes("await ensureAuthenticated('voice');"));
{
    const at = UI.indexOf("$(document).on('signin', 'puter-user-menu'");
    const handler = UI.slice(at, UI.indexOf('\n});\n', at));
    check('a sign-in from the puter.js account menu reports signed_in with source menu',
        at > 0 && handler.includes("window.trackSignInResult?.('menu', 'signed_in');"));
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll sign-in analytics checks passed');
process.exit(failures ? 1 : 0);
