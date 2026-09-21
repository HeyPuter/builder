window.tools.push({
    type: "function",
    function: {
        name: "edit",
        description: "Replaces a specific section of an existing file with new content. Much faster than 'write' for small changes because you only specify the changed part. The old_content must match exactly (including whitespace and indentation).",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The absolute path of the file to edit."
                },
                old_content: {
                    type: "string",
                    description: "The exact existing text to find and replace. Must match the file content exactly, including whitespace and indentation."
                },
                new_content: {
                    type: "string",
                    description: "The replacement text."
                },
            },
            required: ["path", "old_content", "new_content"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function(args, state) {
        if (!args.old_content) {
            throw new Error("old_content cannot be empty. Use the 'write' tool to create new files.");
        }
        if (args.old_content === args.new_content) {
            throw new Error("old_content and new_content are identical. Nothing to change.");
        }

        // Confine to the project directory before any IO — an out-of-project path
        // fails as a model-directed tool error. The RESOLVED path is what we read
        // and write (see the note in write.js). See window.assertPathInProject.
        const path = window.assertPathInProject(args.path, state);

        // Serialize the ENTIRE read-modify-write under this path's write-lock, so
        // the background preview cache-bust (applyPreviewCacheBust) — or any other
        // writer to the same file — can't commit between our read and our write
        // and then have its stale-buffer write silently clobber this edit. The
        // read MUST be inside the lock for this to hold. See window.withFileLock.
        const result = await window.withFileLock(path, async () => {
            let content;
            try {
                content = await puter.fs.read(path).then(d => d.text());
            } catch (e) {
                throw new Error(`File not found: ${path}. Use the 'write' tool to create new files.`);
            }

            // Match against the clean source the model sees (read() hides these), not
            // the on-disk copy that may carry preview cache-bust tokens. The edit is
            // written back clean; the next preview refresh re-stamps the tokens.
            if (/\.html?$/i.test(path) && window.stripPreviewCacheBust) {
                content = window.stripPreviewCacheBust(content);
            }

            // window.applyFileEdit does the matching — exact first, then
            // whitespace- and unicode-flexible fallbacks — and returns the updated
            // content in '\n' form, or throws a model-directed Error when the match
            // is missing or ambiguous. It is a pure function, safe inside this lock
            // (which is NOT re-entrant). The model always outputs '\n'; if the file
            // used '\r\n' we restore it before writing.
            const hadCRLF = content.includes('\r\n');
            let updated = window.applyFileEdit(content, args.old_content, args.new_content);
            if (hadCRLF) updated = updated.replace(/\n/g, '\r\n');

            // Don't trust a bare write: confirm the new content actually landed
            // (read-back inside this lock, retry-then-throw on failure) so a write
            // that silently fails to persist surfaces as a tool error the model
            // must act on, not a false {success:true}. See window.writeFileVerified.
            await window.writeFileVerified(path, updated);
            return { success: true, path };
        });

        window.schedulePreviewRefresh?.();
        return result;
    }
})
