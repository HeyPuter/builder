// CodeMirror 6 for the Code view. This is the only file that imports
// @codemirror/*, so Vite emits it and the libraries as one lazy chunk (see
// ./entry.mjs). It knows nothing about projects, puter.js or plans: the classic
// UI in js/code-editor.js owns files, saving and gating, and drives an editor
// through the handle createEditor returns.
//
// Colors are CSS custom properties (--ce-*) and token classes (cm-tok-*)
// defined in css/styles.css, so a light/dark switch restyles an open editor
// with no script. Only the darkTheme facet (which picks CodeMirror's own
// fallback colors) follows data-theme from here.
//
// Protected ranges are lines Builder needs (the runtime tag, the error
// reporter, the generated install block). EditorCore.protectedRanges finds
// them. The editor shows them tinted with a lock, folds the long ones, and
// drops any keystroke, paste or delete that would change them. A whole-file
// replace from disk (setText) skips that filter, since it is not the user
// typing.

import { EditorState, Compartment, StateField, StateEffect, Prec, RangeSet, Transaction } from '@codemirror/state';
import {
    EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection,
    highlightActiveLine, dropCursor, rectangularSelection, Decoration, WidgetType, gutter, GutterMarker,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { search, searchKeymap, highlightSelectionMatches, openSearchPanel } from '@codemirror/search';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap, indentUnit } from '@codemirror/language';
import { tagHighlighter, tags } from '@lezer/highlight';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';

// Token classes, styled per theme in css/styles.css. More specific tags win.
const highlighter = tagHighlighter([
    { tag: tags.comment, class: 'cm-tok-comment' },
    { tag: tags.keyword, class: 'cm-tok-keyword' },
    { tag: [tags.string, tags.special(tags.string), tags.attributeValue], class: 'cm-tok-string' },
    { tag: [tags.regexp, tags.escape], class: 'cm-tok-regexp' },
    { tag: [tags.number, tags.bool, tags.null, tags.atom, tags.color, tags.unit], class: 'cm-tok-number' },
    { tag: tags.tagName, class: 'cm-tok-tag' },
    { tag: tags.attributeName, class: 'cm-tok-attr' },
    { tag: [tags.angleBracket, tags.punctuation, tags.bracket], class: 'cm-tok-punct' },
    { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], class: 'cm-tok-function' },
    { tag: tags.definition(tags.variableName), class: 'cm-tok-definition' },
    { tag: tags.propertyName, class: 'cm-tok-property' },
    { tag: [tags.typeName, tags.className, tags.namespace], class: 'cm-tok-type' },
    { tag: tags.operator, class: 'cm-tok-operator' },
    { tag: [tags.meta, tags.processingInstruction, tags.documentMeta], class: 'cm-tok-meta' },
    { tag: tags.heading, class: 'cm-tok-heading' },
    { tag: [tags.link, tags.url], class: 'cm-tok-link' },
    { tag: tags.emphasis, class: 'cm-tok-em' },
    { tag: tags.strong, class: 'cm-tok-strong' },
    { tag: tags.invalid, class: 'cm-tok-invalid' },
]);

const LANGUAGES = {
    html: () => html(),
    svg: () => html({ autoCloseTags: false }),
    css: () => css(),
    javascript: () => javascript(),
    json: () => json(),
    markdown: () => markdown(),
};
function languageExtension(kind) {
    const make = LANGUAGES[kind];
    return make ? make() : [];
}

// Every color is a custom property with a light fallback, so an editor mounted
// before styles.css applies still reads. Line and match backgrounds are
// see-through: the selection is drawn on a layer behind the lines, and a solid
// color there (the active line, a locked line) would hide it.
const baseTheme = EditorView.theme({
    '&': {
        color: 'var(--ce-fg, #1f2328)',
        backgroundColor: 'var(--ce-bg, #fff)',
        fontSize: 'var(--ce-font-size, 13px)',
        height: '100%',
    },
    '&.cm-focused': { outline: 'none' },
    '.cm-scroller': {
        fontFamily: "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        lineHeight: '1.55',
    },
    '.cm-content': { caretColor: 'var(--ce-cursor, #1f2328)', paddingBottom: '40vh' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--ce-cursor, #1f2328)' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: 'var(--ce-selection, #cfe3ff)',
    },
    '.cm-gutters': {
        backgroundColor: 'var(--ce-gutter-bg, #fff)',
        color: 'var(--ce-gutter-fg, #6e7781)',
        border: 'none',
        borderRight: '1px solid var(--ce-border, #eaeef2)',
    },
    '.cm-activeLine': { backgroundColor: 'var(--ce-active-line, rgba(140, 149, 159, 0.08))' },
    '.cm-activeLineGutter': { backgroundColor: 'var(--ce-active-line, rgba(140, 149, 159, 0.08))', color: 'var(--ce-fg, #1f2328)' },
    '.cm-foldPlaceholder': {
        backgroundColor: 'var(--ce-fold-bg, #eaeef2)', color: 'var(--ce-fold-fg, #57606a)', border: 'none', padding: '0 6px',
    },
    '.cm-selectionMatch': { backgroundColor: 'var(--ce-match-bg, rgba(255, 212, 59, 0.35))' },
    '.cm-searchMatch': { backgroundColor: 'var(--ce-match-bg, rgba(255, 212, 59, 0.35))', outline: '1px solid var(--ce-match-border, #d4a72c)' },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'var(--ce-match-active, rgba(255, 196, 0, 0.6))' },
    '.cm-matchingBracket, .cm-nonmatchingBracket': { backgroundColor: 'var(--ce-match-bg, rgba(255, 212, 59, 0.35))', outline: 'none' },
    '.cm-panels': { backgroundColor: 'var(--ce-panel-bg, #f6f8fa)', color: 'var(--ce-fg, #1f2328)' },
    '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--ce-border, #eaeef2)' },
    '.cm-panels.cm-panels-bottom': { borderTop: '1px solid var(--ce-border, #eaeef2)' },
    '.cm-tooltip': {
        backgroundColor: 'var(--ce-panel-bg, #f6f8fa)', color: 'var(--ce-fg, #1f2328)', border: '1px solid var(--ce-border, #eaeef2)',
    },
    '.cm-protected-line': { backgroundColor: 'var(--ce-protected-bg, rgba(140, 149, 159, 0.11))' },
    '.cm-line-ai': { backgroundColor: 'var(--ce-ai-line-bg, rgba(46, 160, 67, 0.15))', boxShadow: 'inset 3px 0 0 var(--ce-ai-line-bar, #1a7f37)' },
    '.cm-line-user': { backgroundColor: 'var(--ce-user-line-bg, rgba(255, 212, 59, 0.3))', boxShadow: 'inset 3px 0 0 var(--ce-user-line-bar, #d4a72c)' },
    '.cm-line-error': { backgroundColor: 'var(--ce-error-line-bg, rgba(255, 129, 130, 0.18))', boxShadow: 'inset 3px 0 0 var(--ce-error-line-bar, #cf222e)' },
    '.cm-lock-gutter': { width: '18px' },
    '.cm-lock-marker': {
        display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%',
        color: 'var(--ce-gutter-fg, #6e7781)', cursor: 'default',
    },
    '.cm-lock-marker.is-foldable': { cursor: 'pointer' },
    '.cm-protected-fold': {
        font: 'inherit', fontFamily: "'Roboto', system-ui, sans-serif", fontSize: '12px',
        color: 'var(--ce-fold-fg, #57606a)', backgroundColor: 'var(--ce-fold-bg, #eaeef2)',
        border: 'none', borderRadius: '4px', padding: '0 8px', margin: '0 2px', cursor: 'pointer',
    },
});

const LOCK_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';

// ---- Protected ranges --------------------------------------------------------

const setProtected = StateEffect.define();
const toggleFold = StateEffect.define();

class LockMarker extends GutterMarker {
    constructor(title, foldable) { super(); this.title = title; this.foldable = foldable; }
    eq(other) { return other.title === this.title && other.foldable === this.foldable; }
    toDOM() {
        const span = document.createElement('span');
        span.className = 'cm-lock-marker' + (this.foldable ? ' is-foldable' : '');
        span.title = this.title;
        span.innerHTML = LOCK_SVG;
        return span;
    }
}

class FoldWidget extends WidgetType {
    constructor(label, lines, index) { super(); this.label = label; this.lines = lines; this.index = index; }
    eq(other) { return other.label === this.label && other.lines === this.lines && other.index === this.index; }
    toDOM(view) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'cm-protected-fold';
        button.textContent = `${this.label} · ${this.lines} lines`;
        button.title = 'Show these lines';
        button.addEventListener('mousedown', (e) => e.preventDefault());
        button.addEventListener('click', (e) => {
            e.preventDefault();
            view.dispatch({ effects: toggleFold.of(this.index) });
        });
        return button;
    }
    ignoreEvent() { return true; }
}

// Ranges arrive as [{ from, to, kind, label, title, fold }] with from/to as
// offsets into the document. Lines inside a folded range are hidden behind one
// button. Unfolded ranges get a tint on every line they cover.
function buildProtect(state, ranges, open) {
    const doc = state.doc;
    const kept = ranges.filter((r) => r.from >= 0 && r.to > r.from && r.to <= doc.length);
    const deco = [];
    const folds = [];
    const locks = [];
    kept.forEach((r, i) => {
        const first = doc.lineAt(r.from);
        const last = doc.lineAt(r.to);
        const foldable = !!r.fold && last.number > first.number;
        locks.push(new LockMarker(r.title || 'Builder needs this line, so it can’t be changed here.', foldable).range(first.from));
        if (foldable && !open.has(i)) {
            const widget = Decoration.replace({ widget: new FoldWidget(r.label || 'Generated by Builder', last.number - first.number + 1, i) });
            deco.push(widget.range(r.from, r.to));
            folds.push(widget.range(r.from, r.to));
            deco.push(Decoration.line({ class: 'cm-protected-line' }).range(first.from));
            return;
        }
        for (let n = first.number; n <= last.number; n++) {
            deco.push(Decoration.line({ class: 'cm-protected-line' }).range(doc.line(n).from));
        }
    });
    return {
        ranges: kept,
        open,
        deco: Decoration.set(deco, true),
        folds: Decoration.set(folds, true),
        locks: RangeSet.of(locks, true),
    };
}

const protectField = StateField.define({
    create: (state) => buildProtect(state, [], new Set()),
    update(value, tr) {
        let ranges = value.ranges;
        let open = value.open;
        let changed = false;
        if (tr.docChanged && ranges.length) {
            ranges = ranges.map((r) => ({ ...r, from: tr.changes.mapPos(r.from, 1), to: tr.changes.mapPos(r.to, -1) }));
            changed = true;
        }
        for (const e of tr.effects) {
            if (e.is(setProtected)) { ranges = e.value || []; open = new Set(); changed = true; }
            else if (e.is(toggleFold)) {
                open = new Set(open);
                if (open.has(e.value)) open.delete(e.value); else open.add(e.value);
                changed = true;
            }
        }
        return changed ? buildProtect(tr.state, ranges, open) : value;
    },
    provide: (f) => [
        EditorView.decorations.from(f, (v) => v.deco),
        EditorView.atomicRanges.of((view) => view.state.field(f).folds),
    ],
});

// Deleting inside a protected range is dropped, and the rest of the same edit
// still applies: a select-all delete removes everything around the locked
// lines, and block indent or dedent changes every line outside them.
// Moving lines, pasting or dropping text across one is dropped whole instead:
// applying only the half outside would copy Builder's lines and break the
// page. So is any other edit that would lose some of its typed text, since
// its parts depend on each other: typing over a selection that starts in a
// lock would delete the selection and drop the letter. A single Replace over
// a lock is dropped whole too, and Replace All leaves out each match that
// overlaps one, so no match is half replaced. The comment commands carry no
// user event: one that touches a lock, or wraps it by adding "<!--" or "-->"
// right at its edge, is dropped whole, since a half-applied comment hides
// the rest of the page. onBlocked(kind) lets the UI say what happened:
// 'whole' when nothing was applied, 'skipped' when the locked parts of a
// larger edit were left out.
function protectFilter(onBlocked) {
    return EditorState.changeFilter.of((tr) => {
        const { ranges } = tr.startState.field(protectField);
        if (!ranges.length || !tr.docChanged) return true;
        let touches = false;
        let inserts = false;
        let dropsInsert = false;
        const straddles = [];
        // Each change on its own (one per Replace All match).
        tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
            if (inserted.length) inserts = true;
            if (ranges.some((r) => fromA < r.to && toA > r.from)) {
                touches = true;
                if (inserted.length) straddles.push([fromA, toA]);
            }
            // CodeMirror keeps inserted text with the start of its change, so
            // the text is lost when that start is inside a range, or on its
            // first character for a replacement.
            if (inserted.length && ranges.some((r) => fromA < r.to && (fromA > r.from || (fromA === r.from && toA > fromA)))) {
                dropsInsert = true;
            }
        }, true);
        const noEvent = tr.annotation(Transaction.userEvent) == null;
        if (!touches && noEvent) {
            tr.changes.iterChanges((fromA, toA) => {
                if (ranges.some((r) => fromA <= r.to && toA >= r.from)) touches = true;
            }, true);
        }
        if (!touches) return true;
        const replaceAll = tr.isUserEvent('input.replace.all');
        const independent = replaceAll || tr.isUserEvent('input.indent') || tr.isUserEvent('indent') || tr.isUserEvent('delete.dedent');
        if ((inserts && (tr.isUserEvent('move') || tr.isUserEvent('input.paste') || tr.isUserEvent('input.drop')
            || (tr.isUserEvent('input.replace') && !replaceAll)
            || (dropsInsert && !independent)))
            || noEvent) {
            onBlocked?.('whole');
            return false;
        }
        if (tr.isUserEvent('input') || tr.isUserEvent('delete') || tr.isUserEvent('indent')) onBlocked?.('skipped');
        const spans = ranges.map((r) => [r.from, r.to]);
        if (replaceAll) spans.push(...straddles);
        spans.sort((a, b) => a[0] - b[0]);
        const out = [];
        for (const [a, b] of spans) {
            if (out.length && a <= out[out.length - 1]) out[out.length - 1] = Math.max(out[out.length - 1], b);
            else out.push(a, b);
        }
        return out;
    });
}

const lockGutter = gutter({
    class: 'cm-lock-gutter',
    markers: (view) => view.state.field(protectField).locks,
    initialSpacer: () => new LockMarker('', false),
    domEventHandlers: {
        mousedown(view, line) {
            const { ranges } = view.state.field(protectField);
            const i = ranges.findIndex((r) => r.fold && view.state.doc.lineAt(r.from).from === line.from);
            if (i < 0) return false;
            view.dispatch({ effects: toggleFold.of(i) });
            return true;
        },
    },
});

// ---- Line marks (AI changes, the user's unsaved lines, an error line) -------

const setLineMarks = StateEffect.define();
const lineMarkField = StateField.define({
    create: () => Decoration.none,
    update(deco, tr) {
        deco = deco.map(tr.changes);
        for (const e of tr.effects) {
            if (!e.is(setLineMarks)) continue;
            if (!e.value) { deco = Decoration.none; continue; }
            const { lines, kind } = e.value;
            const marks = [];
            for (const n of lines) {
                if (n >= 1 && n <= tr.state.doc.lines) {
                    marks.push(Decoration.line({ class: 'cm-line-' + kind }).range(tr.state.doc.line(n).from));
                }
            }
            deco = Decoration.set(marks, true);
        }
        return deco;
    },
    provide: (f) => EditorView.decorations.from(f),
});

// ---- The editor --------------------------------------------------------------

function isDarkTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
}

// opts:
//   doc, language ('html'|'svg'|'css'|'javascript'|'json'|'markdown'|'plain'),
//   readOnly (typing blocked, selection and search still work),
//   editable (false: no caret or keyboard at all, used on phones until Edit),
//   wrap, indent ('  ', '    ' or '\t'), label (accessible name),
//   computeProtected(text) -> ranges,
//   onChange(text), onSave(), onCursor({ line, col }), onEditAttempt(coords),
//   onProtectedBlock(kind) ('whole': an edit over protected lines was dropped
//   entirely; 'skipped': the protected parts of an edit were left out).
export function createEditor(parent, opts = {}) {
    const cfg = {
        language: opts.language || 'plain',
        readOnly: !!opts.readOnly,
        editable: opts.editable !== false,
        wrap: !!opts.wrap,
        indent: opts.indent || '  ',
    };
    const language = new Compartment();
    const readOnly = new Compartment();
    const editable = new Compartment();
    const wrap = new Compartment();
    const theme = new Compartment();
    const indent = new Compartment();
    const computeProtected = typeof opts.computeProtected === 'function' ? opts.computeProtected : () => [];

    const tabSize = (unit) => (unit === '\t' ? 4 : unit.length);

    function readOnlyAttempt(view) {
        if (!view.state.readOnly) return false;
        const coords = view.coordsAtPos(view.state.selection.main.head);
        opts.onEditAttempt?.(coords);
        return false;
    }

    function extensions() {
        return [
            lockGutter,
            lineNumbers(),
            foldGutter(),
            highlightActiveLineGutter(),
            highlightSpecialChars(),
            history(),
            drawSelection(),
            dropCursor(),
            indentOnInput(),
            syntaxHighlighting(highlighter),
            bracketMatching(),
            closeBrackets(),
            rectangularSelection(),
            highlightActiveLine(),
            highlightSelectionMatches(),
            search({ top: true }),
            Prec.highest(keymap.of([{
                key: 'Mod-s',
                preventDefault: true,
                run: () => { opts.onSave?.(); return true; },
            }])),
            keymap.of([
                ...closeBracketsKeymap,
                ...defaultKeymap,
                ...searchKeymap,
                ...historyKeymap,
                ...foldKeymap,
                indentWithTab,
            ]),
            protectField.init((state) => buildProtect(state, computeProtected(state.doc.toString()), new Set())),
            protectFilter((kind) => opts.onProtectedBlock?.(kind)),
            lineMarkField,
            baseTheme,
            EditorView.contentAttributes.of({ 'aria-label': opts.label || 'Code editor' }),
            EditorView.domEventHandlers({
                keydown(e, view) {
                    if (e.metaKey || e.ctrlKey || e.altKey) return false;
                    // Tab is left out: in a read-only editor it only moves focus.
                    if (e.key.length === 1 || e.key === 'Enter' || e.key === 'Backspace' || e.key === 'Delete') {
                        return readOnlyAttempt(view);
                    }
                    return false;
                },
                paste: (e, view) => readOnlyAttempt(view),
                drop: (e, view) => readOnlyAttempt(view),
            }),
            EditorView.updateListener.of((update) => {
                if (update.docChanged) opts.onChange?.(update.state.doc.toString());
                if (update.docChanged || update.selectionSet) {
                    const head = update.state.selection.main.head;
                    const line = update.state.doc.lineAt(head);
                    opts.onCursor?.({ line: line.number, col: head - line.from + 1 });
                }
            }),
            language.of(languageExtension(cfg.language)),
            readOnly.of(EditorState.readOnly.of(cfg.readOnly)),
            editable.of(EditorView.editable.of(cfg.editable)),
            wrap.of(cfg.wrap ? EditorView.lineWrapping : []),
            theme.of(EditorView.darkTheme.of(isDarkTheme())),
            indent.of([indentUnit.of(cfg.indent), EditorState.tabSize.of(tabSize(cfg.indent))]),
        ];
    }

    function makeState(doc, cursor) {
        const anchor = Math.max(0, Math.min(cursor || 0, doc.length));
        return EditorState.create({ doc, selection: { anchor }, extensions: extensions() });
    }

    const view = new EditorView({ state: makeState(String(opts.doc || ''), 0), parent });

    // The darkTheme facet picks CodeMirror's own fallback colors. Our colors are
    // custom properties, so only this flag needs a script when the theme flips.
    let dark = isDarkTheme();
    const themeObserver = typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            const now = isDarkTheme();
            if (now === dark) return;
            dark = now;
            view.dispatch({ effects: theme.reconfigure(EditorView.darkTheme.of(now)) });
        })
        : null;
    themeObserver?.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    function reconfigure(compartment, ext) {
        view.dispatch({ effects: compartment.reconfigure(ext) });
    }

    return {
        view,
        getText: () => view.state.doc.toString(),
        // Replace the whole document, e.g. after the AI or a restore changed the
        // file on disk. Undo history starts over, so undo can never step back
        // into a version the editor no longer owns. Scroll and caret are kept
        // as close as the new text allows.
        setText(text) {
            const scroll = view.scrollDOM.scrollTop;
            const head = view.state.selection.main.head;
            view.setState(makeState(String(text || ''), head));
            view.scrollDOM.scrollTop = scroll;
            requestAnimationFrame(() => { view.scrollDOM.scrollTop = scroll; });
        },
        setReadOnly(on) {
            cfg.readOnly = !!on;
            reconfigure(readOnly, EditorState.readOnly.of(cfg.readOnly));
        },
        setEditable(on) {
            cfg.editable = !!on;
            reconfigure(editable, EditorView.editable.of(cfg.editable));
        },
        setWrap(on) {
            cfg.wrap = !!on;
            reconfigure(wrap, cfg.wrap ? EditorView.lineWrapping : []);
        },
        setLanguage(kind) {
            cfg.language = kind || 'plain';
            reconfigure(language, languageExtension(cfg.language));
        },
        // Recompute the protected ranges from the current text (after a reload
        // the UI calls setText, which already does this).
        refreshProtected() {
            view.dispatch({ effects: setProtected.of(computeProtected(view.state.doc.toString())) });
        },
        focus: () => view.focus(),
        hasFocus: () => view.hasFocus,
        getCursor() {
            const head = view.state.selection.main.head;
            const line = view.state.doc.lineAt(head);
            return { line: line.number, col: head - line.from + 1 };
        },
        gotoLine(lineNumber, col = 1) {
            const doc = view.state.doc;
            const n = Math.max(1, Math.min(doc.lines, Math.floor(lineNumber) || 1));
            const line = doc.line(n);
            const pos = Math.min(line.to, line.from + Math.max(0, (Math.floor(col) || 1) - 1));
            view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
        },
        markLines(lines, kind) {
            view.dispatch({ effects: setLineMarks.of({ lines: Array.isArray(lines) ? lines : [], kind: kind || 'ai' }) });
        },
        clearMarks() {
            view.dispatch({ effects: setLineMarks.of(null) });
        },
        openSearch() {
            openSearchPanel(view);
        },
        destroy() {
            themeObserver?.disconnect();
            view.destroy();
        },
    };
}
