import fs from 'node:fs';

// ---- Regression guard: a project keeps one draft site --------------------------
// publish_site minted a fresh preview-<uuid> site on every call, and the model
// calls it again whenever it (re)creates an app in a project ("make it a todo
// app instead"). The old draft stayed registered — still serving the project,
// deleted by nothing (deleteChat only knows the current previewUrl), and
// counted against the account's site limit until Publish failed with "maximum
// number of published sites". A project with a draft site now re-points it.
//
// Runs the real tool against stubbed hosting.

let failures = 0;
function check(name, cond, detail) {
    if (cond) console.log('ok   - ' + name);
    else { console.error('FAIL - ' + name + (detail ? '\n       ' + detail : '')); failures++; }
}

const src = fs.readFileSync(new URL('../src/tools/apps_and_sites/publish_site.js', import.meta.url), 'utf8');

function world({ currentPreviewUrl = null, updateFails = false, stale = false } = {}) {
    const calls = [];
    let n = 0;
    const win = {
        tools: [],
        currentPreviewUrl,
        assertPathInProject: (p) => p,
        makeDraftSubdomain: () => 'preview-new-' + (++n),
        isStaleTurn: () => stale,
        isAborted: () => false,
        showAppPreview: (url) => calls.push(['show', url]),
        maybeAutoNameProject: () => {},
    };
    const puter = {
        hosting: {
            create: async (sub, path) => { calls.push(['create', sub, path]); return { subdomain: sub }; },
            update: async (sub, path) => { calls.push(['update', sub, path]); if (updateFails) throw new Error('subdomain not found'); },
        },
    };
    new Function('window', 'puter', src)(win, puter);
    const tool = win.tools.find((t) => t.function.name === 'publish_site');
    return { win, calls, run: (path) => tool.exec({ path }, { currentChatId: 'c1' }) };
}

{
    const w = world();
    const res = await w.run('/u/app/c1');
    check('a project with no draft site gets one', res.url === 'https://preview-new-1.puter.site/' && w.calls[0][0] === 'create', JSON.stringify(w.calls));
}
{
    const w = world({ currentPreviewUrl: 'https://preview-3f2a9c1e-1111-4222-8333-944445555666.puter.site/' });
    const res = await w.run('/u/app/c1');
    check('calling it again re-points the existing draft site', w.calls[0][0] === 'update' && w.calls[0][1] === 'preview-3f2a9c1e-1111-4222-8333-944445555666', JSON.stringify(w.calls));
    check('…mints no new site', !w.calls.some((c) => c[0] === 'create'));
    check('…and reports the same address', res.url === 'https://preview-3f2a9c1e-1111-4222-8333-944445555666.puter.site/');
    check('…which the preview then shows', w.calls.some((c) => c[0] === 'show' && c[1] === res.url));
    check('the preview root follows the new directory', w.win.currentPreviewPath === '/u/app/c1');
}
{
    const w = world({ currentPreviewUrl: 'https://preview-abc.puter.site/', updateFails: true });
    const res = await w.run('/u/app/c1');
    check('a draft site that can no longer be updated is replaced by a new one', res.url === 'https://preview-new-1.puter.site/', JSON.stringify(w.calls));
}
{
    const w = world({ currentPreviewUrl: 'https://my-public-site.puter.site/' });
    await w.run('/u/app/c1');
    check('only a preview-* draft address is ever reused (never a public one)', w.calls[0][0] === 'create', JSON.stringify(w.calls));
}
{
    const w = world({ currentPreviewUrl: 'https://preview-other-project.puter.site/', stale: true });
    await w.run('/u/app/c1');
    check('a turn whose project is no longer open never re-points the open project\'s draft', w.calls[0][0] === 'create', JSON.stringify(w.calls));
}

if (failures) { console.error(`\n${failures} check(s) FAILED`); process.exit(1); }
console.log('\nAll publish-site reuse checks passed.');
