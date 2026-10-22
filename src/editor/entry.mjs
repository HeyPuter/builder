// Loader for the Code view's editor (js/code-editor.js).
//
// CodeMirror is about as big as the whole app bundle, so it lives in its own
// chunk (./codemirror.mjs) that is fetched the first time someone opens Code,
// never at page load. The classic scripts cannot use import() themselves: the
// classic bundle is an emitted asset Rollup never rewrites, so an import() in
// it works in dev and 404s in production. This module only publishes the
// loader. A failed fetch clears the memo so the next open tries again.
//
// Listed before /mcp/entry.mjs in index.html: both module scripts run as one
// merged entry, and a throw in an earlier one would leave this unset.
let editorModule = null;
window.loadCodeEditor = function () {
    editorModule ??= import('./codemirror.mjs').catch((error) => {
        editorModule = null;
        throw error;
    });
    return editorModule;
};
