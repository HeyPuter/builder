import fs from 'node:fs';

// ---- Regression guard for the paid "remove branding" perk -------------------
// Subscribers publish without the "Made with Puter" badge: the publish flow
// strips the runtime tag from the release's HTML (see src/js/branding.js and
// stagePublishRelease in ui.js). A regex that misses a tag variant leaves a
// paying user's badge up; one that over-matches deletes the user's own scripts.

const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');
const window = {};
new Function('window', read('../src/js/branding.js'))(window);
const B = window.Branding;
const uiSrc = read('../src/js/ui.js');
const viteSrc = read('../vite.config.js');

let failures = 0;
function check(name, cond) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name); failures++; }
}

const TAG = '<script src="https://builder.puter.com/runtime.js" defer></script>';
const page = `<!doctype html>\n<html>\n<head>\n    <title>x</title>\n    ${TAG}\n    <script src="app.js"></script>\n</head>\n<body></body>\n</html>\n`;

const r = B.stripRuntimeTags(page);
check('strips the canonical tag', r.changed && !r.text.includes('builder.puter.com'));
check('leaves the line clean (no blank line behind)', r.text.includes('<title>x</title>\n    <script src="app.js"></script>'));
check('keeps the app\'s own scripts', r.text.includes('<script src="app.js"></script>'));
check('strips the legacy badge.js tag',
    !B.stripRuntimeTags('<script src="https://builder.puter.com/badge.js" defer></script>').text.includes('badge.js'));
check('strips single-quoted / attribute-first / no-defer variants', [
    "<script src='https://builder.puter.com/runtime.js' defer></script>",
    '<script defer src="https://builder.puter.com/runtime.js"></script>',
    '<SCRIPT SRC="https://builder.puter.com/runtime.js"></SCRIPT>',
    '<script src="https://builder.puter.com/runtime.js?v=2" defer></script>',
].every((t) => B.stripRuntimeTags(t).text === ''));
check('strips a page that includes the tag twice', !B.stripRuntimeTags(TAG + '\n' + TAG).text.includes('runtime'));
check('leaves other builder.puter.com scripts alone',
    !B.stripRuntimeTags('<script src="https://builder.puter.com/other.js"></script>').changed);
check('does not eat a following inline script',
    B.stripRuntimeTags(TAG + '<script>window.x=1</script>').text === '<script>window.x=1</script>');
check('leaves a look-alike filename alone (runtime.js-custom)',
    !B.stripRuntimeTags('<script src="https://builder.puter.com/runtime.js-custom"></script>').changed);
check('leaves a data-src attribute alone',
    !B.stripRuntimeTags('<script data-src="https://builder.puter.com/runtime.js" src="app.js"></script>').changed);
check('still strips when data-src sits beside the real src',
    B.stripRuntimeTags('<script data-x="1" src="https://builder.puter.com/runtime.js" defer></script>').text === '');
check('no tag → unchanged', !B.stripRuntimeTags('<p>hi</p>').changed);
check('hasRuntimeTag true/false', B.hasRuntimeTag(page) && !B.hasRuntimeTag('<p>hi</p>'));
check('hasRuntimeTag is stable across calls (global regex lastIndex)',
    B.hasRuntimeTag(page) && B.hasRuntimeTag(page) && B.hasRuntimeTag(page));

check('isSubscribed: subscribed true', B.isSubscribed({ username: 'a', subscribed: true }));
check('isSubscribed: false / missing / null', !B.isSubscribed({ subscribed: false }) && !B.isSubscribed({}) && !B.isSubscribed(null));
check('isSubscribed: truthy non-boolean is not enough', !B.isSubscribed({ subscribed: 'yes' }));
check('isSubscribed: temp user never counts', !B.isSubscribed({ is_temp: true, subscribed: true }));
check('upgrade url is puter.com billing', B.UPGRADE_URL === 'https://puter.com/#billing');

// Wiring: the module is bundled, and staging a release strips only for subscribers.
check('branding.js is in the bundle', viteSrc.includes("'js/branding.js'"));
check('stagePublishRelease strips for subscribers, on a fresh plan check',
    /const user = window\.refreshUserPlan \? await window\.refreshUserPlan\(\) : window\.user;\s*const branding = window\.Branding\?\.isSubscribed\(user\) \? 'removed' : 'kept';\s*if \(branding === 'removed'\) await stripBrandingFromRelease\(releaseDir\)/.test(uiSrc));
check('settings asks before switching away from a running build',
    /async function publishFromSettings\(\) \{[\s\S]*?confirmLeaveActiveChat\(\)[\s\S]*?close\(\);/.test(uiSrc));
check('the chat card is skipped for a stopped turn',
    read('../src/tools/chat_ui/upgrade.js').includes('!window.isAborted?.(state?.abortController) && !window.isStaleTurn?.(state)'));

// The upgrade funnel's analytics: every step and entry point is reported.
const upgradeToolSrcForTracking = read('../src/tools/chat_ui/upgrade.js');
for (const ev of ['Upgrade Prompt Shown', 'Upgrade Opened', 'Upgrade Clicked', 'Upgrade Completed']) {
    check(`tracks '${ev}'`, uiSrc.includes(`'${ev}'`) || upgradeToolSrcForTracking.includes(`'${ev}'`));
}
check('the chat card reports its impression', upgradeToolSrcForTracking.includes("'Upgrade Prompt Shown', { source: 'chat' }"));
check('chat badge requests are tracked', upgradeToolSrcForTracking.includes("'Badge Removal Requested'"));
check('Project Published carries branding', /'Project Published', \{[^}]*branding/.test(uiSrc));
check('usage-limit upgrade button is tracked', uiSrc.includes("'Upgrade Clicked', { source: 'usage_limit' }"));

// A free user asking the AI to drop the badge gets the upgrade offer, not an edit.
const promptSrc = read('../src/js/prompt.js');
const upgradeToolSrc = read('../src/tools/chat_ui/upgrade.js');
check('prompt routes badge-removal requests to OfferUpgrade', promptSrc.includes('Call the OfferUpgrade tool instead'));
check('OfferUpgrade tool is defined and bundled',
    upgradeToolSrc.includes('name: "OfferUpgrade"') && viteSrc.includes("'tools/chat_ui/upgrade.js'"));
check('a reloaded chat re-renders the upgrade card', read('../src/js/app.js').includes('toolResponse.__upgrade_offer'));

// Paid users see their benefits, and a detected upgrade shows the success dialog.
check('toolbar shows Benefits on a paid plan', uiSrc.includes("paidPlan ? 'Benefits' : 'Upgrade'"));
check('paid dialog points to a higher plan', uiSrc.includes('Need more credits? Move to a higher plan on Puter.'));
check('a detected upgrade opens the success dialog', uiSrc.includes('openUpgradeModal(source, { justUpgraded: true })'));
check('a paid user\'s See plans click never waits for an upgrade', uiSrc.includes('if (!paid) _upgradePending = source;'));

if (failures) { console.error(`\n${failures} check(s) failed`); process.exit(1); }
console.log('\nall branding checks passed');
