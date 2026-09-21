window.tools.push({
    type: "function",
    function: {
        name: "multi_edit",
        description: "Applies SEVERAL edits to a SINGLE file in one atomic operation. Prefer this over multiple separate 'edit' calls when changing the same file in more than one place. The edits are applied in order — each one sees the result of the previous — and the file is written only if ALL of them match; if any edit fails, NOTHING is changed. Each edit's old_content must match the file exactly (including whitespace and indentation), just like the 'edit' tool.",
        parameters: {
            type: "object",
            properties: {
                path: {
                    type: "string",
                    description: "The absolute path of the file to edit."
                },
                edits: {
                    type: "array",
                    description: "The edits to apply, in order. Each is applied to the result of the previous one, so later edits should target the file as it will look after the earlier ones.",
                    items: {
                        type: "object",
                        properties: {
                            old_content: {
                                type: "string",
                                description: "The exact existing text to find and replace. Must match the file content exactly, including whitespace and indentation."
                            },
                            new_content: {
                                type: "string",
                                description: "The replacement text."
                            }
                        },
                        required: ["old_content", "new_content"],
                        additionalProperties: false
                    }
                }
            },
            required: ["path", "edits"],
            additionalProperties: false
        },
        strict: true
    },
    exec: async function(args, state) {
        if (!Array.isArray(args.edits) || args.edits.length === 0) {
            throw new Error("edits must be a non-empty array of { old_content, new_content }. Use the 'write' tool to create new files.");
        }

        // Confine to the project directory before any IO — an out-of-project path
        // fails as a model-directed tool error. The RESOLVED path is what we read
        // and write (see the note in write.js). See window.assertPathInProject.
        const path = window.assertPathInProject(args.path, state);

        // Whole read-modify-write under the path's write-lock, exactly like the
        // 'edit' tool: the read MUST be inside the lock so the background preview
        // cache-bust can't commit between our read and our write and clobber it.
        // See window.withFileLock. All edits are applied to the in-memory content
        // and persisted with a SINGLE verified write, so the change is atomic — an
        // edit that fails to match aborts the whole batch without touching the file.
        const result = await window.withFileLock(path, async () => {
            let content;
            try {
                content = await puter.fs.read(path).then(d => d.text());
            } catch (e) {
                throw new Error(`File not found: ${path}. Use the 'write' tool to create new files.`);
            }

            // Match/write against the clean source the model sees (HTML preview
            // cache-bust tokens hidden); write back clean and let the next refresh
            // re-stamp. Mirrors the 'edit' tool.
            if (/\.html?$/i.test(path) && window.stripPreviewCacheBust) {
                content = window.stripPreviewCacheBust(content);
            }

            // The model always outputs '\n'; if the file used '\r\n' we restore it
            // once, after every edit has been applied in '\n' space.
            const hadCRLF = content.includes('\r\n');
            let working = content;
            for (let i = 0; i < args.edits.length; i++) {
                const e = args.edits[i] || {};
                try {
                    // Pure matcher — exact first, then whitespace-/unicode-flexible
                    // fallbacks — returns the updated content in '\n' form or throws.
                    working = window.applyFileEdit(working, e.old_content, e.new_content);
                } catch (err) {
                    // Surface which edit failed; nothing has been written yet.
                    const msg = (err && err.message) ? err.message : String(err);
                    throw new Error(`Edit ${i + 1} of ${args.edits.length} could not be applied: ${msg} (No changes were written — fix this edit and resend all the edits.)`);
                }
            }

            let updated = working;
            if (hadCRLF) updated = updated.replace(/\n/g, '\r\n');

            // Confirm the bytes actually persisted (read-back, retry-then-throw)
            // rather than trusting a bare write. See window.writeFileVerified.
            await window.writeFileVerified(path, updated);
            return { success: true, path, edits_applied: args.edits.length };
        });

        window.schedulePreviewRefresh?.();
        return result;
    }
})
