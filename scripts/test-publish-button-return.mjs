import fs from 'node:fs';

// ---- Regression guard: the Publish button stays busy on return ---------------
// A publish runs for several seconds, and its progress note invites the user to
// keep building meanwhile — so switching to another project and back mid-publish
// is ordinary use. refreshPublishButton used to bail outright while a publish of
// the open project was running: right while the user stayed put (setPublishBusy
// had painted the button), wrong when they came BACK — the button then kept the
// label and state painted for the project they had visited in between, enabled,
// until the publish finished. Runs the real refreshPublishButton against a small
// fake jQuery.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}
const ui = fs.readFileSync(new URL('../src/js/ui.js', import.meta.url), 'utf8');
const publishState = fs.readFileSync(new URL('../src/js/publish-state.js', import.meta.url), 'utf8');

function extract(src, signature, end = '\n};\n') {
    const a = src.indexOf(signature);
    if (a < 0) throw new Error('could not find ' + signature);
    const b = src.indexOf(end, a);
    return src.slice(a, b + end.length);
}

function run({ busyHere, publishedUrl }) {
    const btn = { attrs: {}, disabled: null, label: null };
    const panel = { rendered: 0 };
    const $ = (sel) => {
        if (sel === '.preview-publish-btn') return {
            length: 1,
            attr(k, v) { btn.attrs[k] = v; return this; },
            prop(k, v) { btn[k] = v; return this; },
            find() { return { text(t) { btn.label = t; } }; },
        };
        if (sel === '.preview-publish-panel') return { hasClass: () => false };
        throw new Error('unexpected selector ' + sel);
    };
    const window = {
        currentPublishedUrl: publishedUrl, currentPublishedVersionId: 'v1',
        getCurrentVersionId: () => 'v2', _projectDirtySinceSnapshot: false,
    };
    const code = publishState +
        '\nlet currentChatId = "A"; const _publishBusyChats = new Set(busyHere ? ["A"] : []);' +
        '\nlet _publishPanelOpen = true; function renderPublishPanel() { panel.rendered++; }' +
        '\n' + extract(ui, 'function publishBusyHere() {', '\n}\n') +
        '\n' + extract(ui, 'window.refreshPublishButton = function () {') +
        '\nwindow.refreshPublishButton();';
    new Function('$', 'window', 'busyHere', 'panel', code)($, window, busyHere, panel);
    return { btn, panel };
}

{
    // Came back to A while A's publish is still running. The button was last
    // painted for project B (say "Published", enabled).
    const { btn, panel } = run({ busyHere: true, publishedUrl: null });
    check('a publish of the open project in flight: the button is disabled', btn.disabled === true);
    check('…and says so', btn.label === 'Publishing…', btn.label);
    check('…with this project\'s own state, not the previous project\'s', btn.attrs['data-state'] === 'unpublished', btn.attrs['data-state']);
    check('…and the popover is left alone (it shows the progress view)', panel.rendered === 0);
}
{
    const { btn, panel } = run({ busyHere: false, publishedUrl: 'https://a.puter.site' });
    check('no publish in flight: the button is enabled with its real label', btn.disabled === false && btn.label && btn.label !== 'Publishing…', btn.label);
    check('…and an open popover is re-rendered', panel.rendered === 1);
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll publish-button-return checks passed.');
