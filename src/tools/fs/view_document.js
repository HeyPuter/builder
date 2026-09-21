// ViewDocument — load a PDF's contents into the conversation so the model can
// read it. Attached PDFs are saved to the app's assets/ directory but are NOT
// embedded inline (see sendChatMessage in app.js); the model pulls one in on
// demand with this tool only when the task requires reading it. This keeps large
// documents off every request when they just need to be served or linked by path
// — the text analog of ViewImage for PDFs.
//
// Limits: the vision/document API reads at most 100 pages per request and
// 32MB per request (the document travels base64-encoded, so ~24MB of PDF).
// Attachments already cap PDFs at 10MB, but a 10MB PDF can easily run to
// several hundred pages, and a rejected document block did not just fail this
// request: it sat in the persisted history until the next user turn retired
// it, and the model retried the same read on the next message and failed the
// same way. Check before the pages enter the conversation and hand the model
// an error it can act on instead. The pure helpers live on
// window.__viewDocumentInternals for scripts/test-view-document.mjs.
window.__viewDocumentInternals = (function () {
    const MAX_PDF_PAGES = 100;
    const MAX_PDF_BYTES = 24 * 1024 * 1024;
    // Count page objects ("/Type /Page", not "/Pages"). PDFs that pack their
    // objects into compressed object streams hide them from this scan, so the
    // estimate can be LOW but never high: a document this rejects really has
    // more pages than the API accepts; one it lets through may still be over.
    function estimatePdfPages(text) {
        const re = /\/Type\s*\/Page\b(?!s)/g;
        let n = 0;
        while (re.exec(text)) n++;
        return n;
    }
    return { MAX_PDF_PAGES, MAX_PDF_BYTES, estimatePdfPages };
})();

window.tools.push({
    type: "function",
    function: {
        name: "ViewDocument",
        description: "Read the contents of a PDF document in the project (e.g. a PDF the user attached, saved under assets/). Use this ONLY when you need to read a PDF's content to complete the task — for example to summarize it, extract data from it, or base the app's content on it. You do NOT need to call this just to link or serve a PDF by path in code. For text or code files use ReadTextFile; for images use ViewImage.",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "Path to the PDF file. May be absolute (starts with /) or relative to the app directory (e.g. \"assets/report.pdf\")."
                }
            },
            required: ["path"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function (args, state) {
        const raw = ((args && args.path) || '').trim();
        if (!raw) throw new Error('No document path provided.');

        // Resolve relative paths against the current app directory. The attachment
        // note also gives the model the absolute path, so an absolute path always
        // works even if appDir isn't available here.
        const baseDir = (state && state.appDir) || (typeof currentAppDir !== 'undefined' ? currentAppDir : '');
        let path = raw;
        if (!path.startsWith('/')) {
            const cleanBase = baseDir ? baseDir.replace(/\/+$/, '') + '/' : '';
            path = cleanBase + path.replace(/^\.?\/+/, '');
        }

        // Confine to the project directory (after resolving any relative path), so
        // the model can't read documents outside the project. See assertPathInProject.
        path = window.assertPathInProject(path, state);

        const ext = (path.split('.').pop() || '').toLowerCase();
        if (ext !== 'pdf') {
            throw new Error(`"${path}" is not a PDF. ViewDocument reads PDF files; for text or code files use ReadTextFile, and for images use ViewImage.`);
        }

        const blob = await puter.fs.read(path);
        const I = window.__viewDocumentInternals;
        if (blob.size > I.MAX_PDF_BYTES) {
            throw new Error(`"${path}" is ${(blob.size / (1024 * 1024)).toFixed(1)}MB, too large to read (the limit is ${Math.round(I.MAX_PDF_BYTES / (1024 * 1024))}MB). Do not retry; tell the user the document is too large to read and ask for a smaller export, or reference it by path if the app only needs to serve or link it.`);
        }
        const pages = I.estimatePdfPages(await blob.text());
        if (pages > I.MAX_PDF_PAGES) {
            throw new Error(`"${path}" has about ${pages} pages; at most ${I.MAX_PDF_PAGES} can be read. Do not retry; tell the user the document is too long to read and ask for the relevant pages as a shorter PDF, or reference it by path if the app only needs to serve or link it.`);
        }
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result || '';
                const comma = result.indexOf(',');
                resolve(comma >= 0 ? result.slice(comma + 1) : result);
            };
            reader.onerror = () => reject(reader.error || new Error('Failed to read document'));
            reader.readAsDataURL(blob);
        });

        return {
            __contentBlocks: [
                { type: "text", text: `Contents of document "${path}":` },
                { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
            ],
        };
    }
});
