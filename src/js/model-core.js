// Which model builds the app, and how each one is called. Pure (no DOM, no
// network) so scripts/test-model-core.mjs can load it on its own, like
// editor-core.js.
//
// Every build model is reached through Puter's chat driver, which translates
// the builder's Claude-shaped history for the other vendors. The translation
// differs per route, and the registry below records what differs:
// - route: the Puter provider a request starts on. GPT-6.1 Sol needs OpenAI's
//   Responses API for tool calls (Chat Completions refuses tools for it), so it
//   is pinned there. Claude is pinned to Anthropic so a request doesn't start
//   on a reseller, whose translation drops images and allows several tool
//   calls per reply. A pin only picks the first route; Puter can still fall
//   back after a failure.
// - reasoningEffort: Sonnet 5.5 at 'medium' scores far below Opus, so it runs
//   at 'high'. 'medium' is Opus 5.5's own default.
// - toolResultMedia / pdf / gif: only Claude takes images and PDFs inside a
//   tool result. The other routes drop them or swap them for an error note, so
//   shapeHistory moves images into a user message of their own, and
//   ViewDocument refuses on models that can't take a PDF at all.
window.ModelCore = (function () {
    const DEFAULT_MODEL = 'claude-opus-5-5';

    // In picker order. label is the full name, short the composer button's,
    // note the line under the name in the picker. beta: true adds a Beta tag.
    const MODELS = {
        'claude-opus-5-5': {
            label: 'Claude Opus 5.5', short: 'Opus 5.5', family: 'claude', route: 'claude',
            reasoningEffort: 'medium', toolResultMedia: true, pdf: true, gif: true,
            note: 'Default. Optimized for Puter AI Builder.',
        },
        'claude-sonnet-5-5': {
            label: 'Claude Sonnet 5.5', short: 'Sonnet 5.5', family: 'claude', route: 'claude',
            reasoningEffort: 'high', toolResultMedia: true, pdf: true, gif: true,
            note: 'Fast and efficient for everyday builds.',
        },
        'gpt-6.1-sol': {
            label: 'GPT-6.1 Sol', short: 'GPT-6.1 Sol', family: 'openai', route: 'openai-responses',
            reasoningEffort: 'medium', toolResultMedia: false, pdf: false, gif: true,
            note: "OpenAI's flagship model, strong at reasoning.",
        },
        'gemini-4-argon': {
            label: 'Gemini 4 Argon', short: 'Gemini 4 Argon', family: 'gemini', route: 'gemini',
            reasoningEffort: 'medium', toolResultMedia: false, pdf: false, gif: false,
            note: "Google's flagship model, strong at coding.",
        },
    };

    function get(id) {
        return typeof id === 'string' && Object.prototype.hasOwnProperty.call(MODELS, id) ? MODELS[id] : null;
    }
    function idOrDefault(id) { return get(id) ? id : DEFAULT_MODEL; }
    function isClaude(id) { return MODELS[idOrDefault(id)].family === 'claude'; }
    function supportsPdf(id) { return MODELS[idOrDefault(id)].pdf; }
    function supportsGif(id) { return MODELS[idOrDefault(id)].gif; }
    function ids() { return Object.keys(MODELS); }

    // The picker's line under a model's name.
    function noteFor(id) {
        return MODELS[idOrDefault(id)].note;
    }

    // Who gets the picker, the same three states as the Code view
    // (EditorCore.access). 'hidden': flag off, or no real account (signed-out
    // and temporary users never have a project). 'locked': free plan, sees the
    // models with an upgrade offer and builds with the default. 'open': a paid
    // Puter plan.
    function pickerAccess(s) {
        s = s || {};
        if (!s.flagOn || !s.signedIn || s.isTemp) return 'hidden';
        return s.subscribed ? 'open' : 'locked';
    }

    // The model a project is set to: its own choice (stored on its system
    // message), else, for a project with no messages yet, the user's last pick,
    // else the default. Projects from before the picker stay on the default.
    function projectModel({ stored, isNew, lastPick } = {}) {
        if (get(stored)) return stored;
        if (isNew && get(lastPick)) return lastPick;
        return DEFAULT_MODEL;
    }

    // The model for one turn, read once when the turn starts and kept for every
    // round, retry and Resume of it: the project's model when the plan allows
    // choosing, else the fallback (the MODEL global), else the default.
    function resolveTurnModel({ chosen, allowed, fallback } = {}) {
        if (allowed && get(chosen)) return chosen;
        if (get(fallback)) return fallback;
        return DEFAULT_MODEL;
    }

    // The options for one puter.ai.chat build request. parallelToolCalls is
    // camelCase because puter.js only forwards that spelling. For Claude it
    // changes nothing on the wire (Puter already turns parallel calls off), so
    // the prompt cache is unaffected. Gemini has no such switch, which is why
    // handleMessageStream runs a whole reply's tool calls as one batch.
    function buildChatOptions(modelId, { tools, signal } = {}) {
        const id = idOrDefault(modelId);
        const m = MODELS[id];
        return {
            model: id,
            tools,
            stream: true,
            reasoning_effort: m.reasoningEffort,
            parallelToolCalls: false,
            provider: m.route,
            signal,
        };
    }

    // MCP tool schemas are written by whatever server the user connected.
    // Claude takes them as they are (client.mjs already flattens the one shape
    // it rejects). OpenAI and Google each refuse some JSON Schema features, and
    // a refused tool fails the whole request, not just its own calls. So for
    // them each schema is simplified first where that loses nothing the model
    // needs: local references ($ref into $defs, common from Python servers) are
    // inlined, and "type or null" fields (common from TypeScript servers) keep
    // their one real type. The server still validates the arguments it gets.
    // A schema that still has a reference or a field of several types is left
    // out of the turn, and the model is told (unavailableToolsNote).
    const MAX_INLINE_DEPTH = 8;
    // Where a schema holds other schemas. Only these are walked: everything
    // else is data (a parameter's name inside `properties`, an enum value, a
    // default, an example) and is copied as it is, so a parameter named
    // `definitions` or `$id`, or an example object holding a `$ref` key, is
    // never mistaken for a keyword.
    const SCHEMA_MAPS = new Set(['properties', 'patternProperties', 'dependentSchemas']);
    const SCHEMA_ONE = new Set(['items', 'additionalProperties', 'additionalItems', 'contains', 'not', 'if', 'then', 'else', 'propertyNames', 'unevaluatedProperties', 'unevaluatedItems']);
    const SCHEMA_LIST = new Set(['anyOf', 'oneOf', 'allOf', 'prefixItems']);
    // Keywords dropped from a schema node: the reference store, now inlined,
    // and identifiers the model doesn't need.
    const DROPPED = new Set(['$defs', 'definitions', '$schema', '$id']);
    const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

    function portableSchema(schema) {
        if (!isObject(schema)) return null;
        const defs = { ...(isObject(schema.definitions) ? schema.definitions : {}), ...(isObject(schema.$defs) ? schema.$defs : {}) };
        let ok = true;
        const walk = (node, depth, seen) => {
            // true / false schemas and anything malformed pass through as they are.
            if (!isObject(node)) return node;
            if (typeof node.$ref === 'string') {
                const m = /^#\/(?:\$defs|definitions)\/([^/]+)$/.exec(node.$ref);
                const name = m ? m[1] : null;
                if (!name || !Object.prototype.hasOwnProperty.call(defs, name) || seen.has(name) || depth >= MAX_INLINE_DEPTH) {
                    ok = false;
                    return node;
                }
                const { $ref, ...siblings } = node;
                // A description next to the reference describes this use of it.
                return { ...walk(defs[name], depth + 1, new Set([...seen, name])), ...walk(siblings, depth, seen) };
            }
            const out = {};
            for (const [key, value] of Object.entries(node)) {
                if (DROPPED.has(key)) continue;
                if (key === 'type' && Array.isArray(value)) {
                    const types = value.filter((t) => t !== 'null');
                    if (types.length > 1) ok = false;
                    out.type = types.length === 1 ? types[0] : (types.length ? value : 'null');
                } else if (SCHEMA_MAPS.has(key) && isObject(value)) {
                    const map = {};
                    for (const [name, sub] of Object.entries(value)) map[name] = walk(sub, depth, seen);
                    out[key] = map;
                } else if (SCHEMA_ONE.has(key)) {
                    out[key] = Array.isArray(value) ? value.map((v) => walk(v, depth, seen)) : walk(value, depth, seen);
                } else if (SCHEMA_LIST.has(key) && Array.isArray(value)) {
                    out[key] = value.map((v) => walk(v, depth, seen));
                } else {
                    out[key] = value;
                }
            }
            return out;
        };
        const result = walk(schema, 0, new Set());
        return ok ? result : null;
    }

    // The MCP tools a model can take, schemas simplified for it, and the ones
    // left out ({label, server}).
    function sortMcpTools(modelId, mcp) {
        if (isClaude(modelId)) return { tools: [...(mcp || [])], skipped: [] };
        const tools = [];
        const skipped = [];
        for (const t of mcp || []) {
            const schema = portableSchema(t && t.function && t.function.parameters);
            if (schema) tools.push({ ...t, function: { ...t.function, parameters: schema } });
            else skipped.push({ label: (t && (t.label || (t.function && t.function.name))) || 'a tool', server: (t && t.server) || '' });
        }
        return { tools, skipped };
    }

    // Tools for a turn: the builder's own, then the MCP tools the model can take.
    function turnTools(modelId, builtin, mcp) {
        return [...(builtin || []), ...sortMcpTools(modelId, mcp).tools];
    }
    function unavailableTools(modelId, mcp) {
        return sortMcpTools(modelId, mcp).skipped;
    }

    // What the model is told about the tools left out. The names come from the
    // connected server, so they are clipped to one short plain line each.
    function unavailableToolsNote(skipped) {
        if (!Array.isArray(skipped) || skipped.length === 0) return '';
        const clean = (s) => String(s || '').replace(/[\r\n[\]]+/g, ' ').trim().slice(0, 60);
        const byServer = new Map();
        for (const s of skipped) {
            const server = clean(s && s.server) || 'a connected service';
            if (!byServer.has(server)) byServer.set(server, []);
            byServer.get(server).push(clean(s && s.label) || 'a tool');
        }
        const list = [...byServer].map(([server, names]) => `${names.join(', ')} from ${server}`).join(' and ');
        return `[Some tools from the user's MCP connections are left out of this conversation, because this model can't take their input format. They are ${list}. If the user asks for something that needs them, tell them a Claude model, chosen in the model picker under the message box, can use them.]`;
    }

    const IMAGE_MOVED = '[The image is attached in the next message.]';
    const NO_PDF = "[A PDF document was here, but this model can't read PDF files. Use the file by its path, and if the user needs its content read, tell them that reading PDFs needs a Claude model.]";
    const NO_GIF = "[A GIF image was shown here, but this model can't take GIF images. Call ViewImage again if you need to see it.]";

    function isToolResultMessage(m) {
        return m && m.role === 'user' && m.content && typeof m.content === 'object'
            && !Array.isArray(m.content) && m.content.type === 'tool_result';
    }
    function isGif(part) {
        return part && part.source && part.source.media_type === 'image/gif';
    }
    function dropCacheControl(obj) {
        if (obj && typeof obj === 'object' && 'cache_control' in obj) delete obj.cache_control;
    }

    // Shape a request copy (prepareHistoryForAI's clone, mutated in place) for
    // the model it goes to. Returns the array to send. opts.unavailableTools
    // (from unavailableTools) adds a note about the MCP tools left out.
    //
    // For a Claude target with a Claude-made history the result is exactly what
    // was sent before this module existed: only the `model` stamps (new) and
    // fields that never occur on that route are removed, so the cached prefix
    // keeps hitting.
    function shapeHistory(messages, modelId, opts) {
        if (!Array.isArray(messages)) return messages;
        const targetId = idOrDefault(modelId);
        const target = MODELS[targetId];

        for (const m of messages) {
            if (!m || typeof m !== 'object') continue;
            // Which model wrote this message (tools.js stamps tool_use messages).
            // Bookkeeping only, never sent.
            const producer = m.model;
            if ('model' in m) delete m.model;
            if (m.role !== 'assistant' || !m.content || typeof m.content !== 'object') continue;
            const blocks = Array.isArray(m.content) ? m.content : [m.content];
            for (const b of blocks) {
                if (!b || b.type !== 'tool_use') continue;
                // The Responses item id (fc_…). OpenAI rejects it when it comes
                // back without the reasoning item that preceded it, and the
                // builder doesn't keep reasoning, so it is never sent back. The
                // call still matches its result by `id`.
                if ('canonical_id' in b) delete b.canonical_id;
                // Gemini's thought signature. Only Gemini reads it, and only for
                // calls it made itself.
                if ('extra_content' in b && producer !== targetId) delete b.extra_content;
            }
        }

        if (target.family === 'claude') return messages;

        // MCP tools left out of the turn: the model is told, on the system
        // message of this copy only, so it can explain instead of guessing.
        const note = unavailableToolsNote(opts && opts.unavailableTools);
        const sys = messages[0] && messages[0].role === 'system' ? messages[0] : null;
        if (note && sys) {
            if (Array.isArray(sys.content)) sys.content.push({ type: 'text', text: note });
            else if (typeof sys.content === 'string') sys.content += '\n\n' + note;
        }

        // Prompt-cache markers are Anthropic's. Other vendors cache on their own.
        for (const m of messages) {
            if (!m || typeof m !== 'object') continue;
            dropCacheControl(m);
            if (Array.isArray(m.content)) m.content.forEach(dropCacheControl);
            else dropCacheControl(m.content);
        }

        // Media. Images inside a tool result reach these routes as nothing or as
        // an error note, but an image in a user message is carried as a normal
        // image part. So each image moves to one user message placed after the
        // run of tool results it came from (a user message in between would
        // split the replies to one assistant turn). PDFs can't travel either
        // way, so they become a note.
        const out = [];
        let moved = [];
        const flush = () => {
            if (moved.length) out.push({ role: 'user', content: moved });
            moved = [];
        };
        for (const m of messages) {
            if (isToolResultMessage(m)) {
                const tr = m.content;
                if (Array.isArray(tr.content)) {
                    let caption = '';
                    tr.content = tr.content.map((part) => {
                        if (!part || typeof part !== 'object') return part;
                        if (part.type === 'text') { caption = part.text || caption; return part; }
                        if (part.type === 'document') return { type: 'text', text: NO_PDF };
                        if (part.type === 'image') {
                            if (isGif(part) && !target.gif) return { type: 'text', text: NO_GIF };
                            moved.push({ type: 'text', text: `[Tool output, not a message from the user] The image from the ViewImage result above${caption ? ` (${caption.replace(/:\s*$/, '')})` : ''}:` });
                            moved.push(part);
                            return { type: 'text', text: IMAGE_MOVED };
                        }
                        return part;
                    });
                }
                out.push(m);
                continue;
            }
            flush();
            // Chats from before attachments moved to assets/ carried images and
            // PDFs inline in the user's message.
            if (m && m.role === 'user' && Array.isArray(m.content)) {
                m.content = m.content.map((part) => {
                    if (part && part.type === 'document') return { type: 'text', text: NO_PDF };
                    if (part && part.type === 'image' && isGif(part) && !target.gif) return { type: 'text', text: NO_GIF };
                    return part;
                });
            }
            out.push(m);
        }
        flush();
        return out;
    }

    return {
        DEFAULT_MODEL, MODELS, get, ids, isClaude, supportsPdf, supportsGif, noteFor,
        pickerAccess, projectModel, resolveTurnModel, buildChatOptions, turnTools, shapeHistory,
        portableSchema, unavailableTools, unavailableToolsNote,
    };
})();
