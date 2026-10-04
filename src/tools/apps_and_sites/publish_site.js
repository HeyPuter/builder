window.tools.push({
    type: "function",
    function: {
        name: "publish_site",
        description: `Opens the app's live PREVIEW for the user by hosting its directory at a working URL shown in the preview pane. This is the in-progress preview the user watches while you build — it is NOT a public release of their app. The user decides if and when to make the app public themselves, using the Publish button in the preview; you never make it public, and you should not tell the user the app is "live"/"published" or share a public link.\n
Only files and folders contained within the hosted directory (its descendants) can be accessed through this preview URL. Any directories at the same level (siblings), directories above it (parents), or files in those directories are completely inaccessible — the hosted directory becomes an isolated root, and everything outside it is hidden and unreachable, as if it doesn't exist.\n
ABSOLUTELY VERY IMPORTANT: you only need to call this ONCE per app. The preview is connected to the directory and updates automatically when files change, so do NOT call it again on later edits.`,
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The absolute path of the directory to publish. Absolute paths start with a /."
                }
            },
            required: ["path"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function(args, state) {
        // Confine the published directory to the current project. Without this,
        // a confused or prompt-injected model could publish a sibling project or
        // the account root (e.g. "/<username>/") to a public *.puter.site URL —
        // an exfiltration primitive, not just local tampering. Every other
        // path-taking tool calls this guard; publish_site must too. See
        // window.assertPathInProject. The normalized, validated path is what we
        // publish and record below.
        const path = window.assertPathInProject(args.path, state);
        // The preview is the DRAFT, never a public release, so its address is
        // always minted in the preview-<uuid> form regardless of what subdomain
        // the model passes. The user-chosen public subdomain is minted later, at
        // Publish time. See window.makeDraftSubdomain.
        //
        // A project keeps ONE draft address. Each call used to mint a fresh
        // preview-<uuid> site, and the previous one stayed registered — still
        // serving the project, deleted by nothing (deleteChat only knows the
        // current previewUrl), and counted against the account's site limit
        // until Publish failed with "maximum number of published sites". When
        // the open project already has a draft site, point it at this
        // directory instead; mint a new one only if that fails (e.g. the site
        // was removed) or the project has none.
        let url = null;
        const existing = (!window.isStaleTurn?.(state) && typeof window.currentPreviewUrl === 'string')
            ? (window.currentPreviewUrl.match(/^https:\/\/(preview-[a-z0-9-]+)\.puter\.site\/?$/i) || [])[1]
            : null;
        if (existing) {
            try {
                await puter.hosting.update(existing, path);
                url = `https://${existing}.puter.site/`;
            } catch (e) { /* gone or unusable: mint a new draft below */ }
        }
        if (!url) {
            const site = await puter.hosting.create(window.makeDraftSubdomain(), path);
            url = `https://${site.subdomain}.puter.site/`;
        }
        // The hosting.create above is awaited, so the user may have navigated to
        // another project while it was in flight. If this turn is no longer the
        // open chat, do NOT touch the shared preview globals or the preview pane:
        // window.currentPreviewUrl/Path describe the now-open project, and
        // clobbering them would show this chat's site in the other project's
        // pane and let its URL be persisted onto that project. The site is still
        // published (returned below); we just don't hijack the live preview.
        if (window.isAborted?.(state?.abortController) || window.isStaleTurn?.(state)) {
            return { success: true, url };
        }
        // Remember which directory is served so the preview can drop its
        // propagation-probe marker into the correct (published) root.
        window.currentPreviewPath = path;
        // Show the published site in the in-window preview pane (browser-like
        // view). waitForReady makes the preview wait for the freshly-deployed
        // content to propagate to the CDN before showing it.
        if (typeof window.showAppPreview === 'function') {
            window.showAppPreview(url, { waitForReady: true });
        }
        // The project now has a real built app. If the user hasn't named it, give
        // it a relevant AI-generated name. Fire-and-forget (keyed by chatId, runs
        // once per project) so it never blocks or fails the turn.
        window.maybeAutoNameProject?.(state);
        return { success: true, url };
    }
})