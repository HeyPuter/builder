// github-ui.js — the Source control toolbar button and popover, which save a
// project to GitHub (the UI half of js/github-sync.js).
//
// One popover per project, with the toolbar's popover rules: one open at a
// time (each sibling's opener closes this one, and this one closes them),
// closed on a project switch, by Escape, by ✕ and by a click outside. It paints
// from what the engine already knows (its state, the link record, the cached
// plan) and asks the engine for fresh facts when it opens.
//
// Sign-in is the development provider for now: a pasted fine-grained token.
// Production swaps the token form for a "Connect GitHub" popup without
// touching the rest of the panel (see Auth in github-sync.js).

(function () {
    'use strict';
    if (!window.GitHubSync || !window.GitHubCore) return;
    const Sync = window.GitHubSync;
    const Core = window.GitHubCore;

    // The toolbar shows a branch, not GitHub's logo. The navigation bar's
    // GitHub logo already links to Builder's own repository.
    window.source_control_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>';

    // A fine-grained token with the permissions sync uses, filled in on
    // GitHub's own form.
    const TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new?name=Puter%20Builder&description=Lets%20Puter%20Builder%20save%20projects%20to%20GitHub&contents=write&administration=write&workflows=write';

    let _open = false;
    let _login = null;
    let _error = '';
    let _busyAction = false;
    // What the user has typed or picked in the forms, so a redraw (a sync
    // state changing) never resets it. name and isPrivate belong to the
    // project in formChat, and start over for another project.
    const _form = { token: '', name: null, isPrivate: true, formChat: null };

    const esc = (s) => (typeof htmlEscape === 'function' ? htmlEscape(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
    function chatId() { return typeof currentChatId !== 'undefined' ? currentChatId : null; }
    function subscribed() { return !!(window.Branding && window.Branding.isSubscribed(window.user)); }
    function repoLabel(link) { return link && link.repo ? `${link.repo.owner}/${link.repo.name}` : ''; }
    function repoUrl(link) { return link && link.repo ? (link.repo.htmlUrl || `https://github.com/${link.repo.owner}/${link.repo.name}`) : '#'; }
    function p(text) { return `<p class="publish-blurb">${text}</p>`; }
    function heading(text) { return `<div class="gh-heading">${text}</div>`; }
    function button(cls, text, attrs, primary) {
        return `<button type="button" class="${primary ? 'publish-action ' : 'gh-btn '}${cls}"${attrs || ''}${_busyAction ? ' disabled' : ''}><span>${text}</span></button>`;
    }

    // ---- What the panel says --------------------------------------------------

    const WAITING = {
        ai: 'GitHub has newer changes. Builder brings them in when the AI finishes.',
        'unsaved-code': 'GitHub has newer changes. They come in once your code edits are saved.',
        busy: 'Builder brings in GitHub’s changes once the current task is done.',
        'not-a-version': 'Your newest edits go to GitHub once they’re saved as a version. That happens when you send a message or leave Code.',
        stopped: 'Your last change was stopped before it finished, so it isn’t on GitHub yet. It goes with your next change.',
        offline: 'You’re offline. Your versions are kept in Builder and go to GitHub when you’re back online.',
        unreachable: 'Builder couldn’t reach GitHub. It tries again soon.',
        slowed: 'GitHub asked Builder to slow down. It tries again in a few minutes.',
    };

    // Sign-in. For a project set up to save to GitHub (link), it says where
    // the versions go once GitHub is connected again, after Disconnect GitHub
    // or after GitHub stopped accepting the token.
    function tokenForm(link) {
        return heading(link ? 'Connect GitHub again' : 'Connect GitHub') + tokenBody(link);
    }
    function tokenBody(link) {
        return p(link
                ? `Builder isn’t connected to GitHub, so this project isn’t being saved to ${esc(repoLabel(link))}. That happens after you disconnect GitHub, or when your token expires or is deleted on GitHub. Your versions are kept in Builder and go to GitHub once you connect again.`
                : 'Create a fine-grained token on GitHub for all your repositories, with Administration, Contents and Workflows set to read and write. Builder uses it to create a repository for this project and save every file to it, workflows included. Paste it here. Builder keeps it private to Builder.') +
            `<a class="gh-link" href="${TOKEN_URL}" target="_blank" rel="noopener noreferrer">Create a token on GitHub</a>` +
            `<div class="gh-row"><input type="password" class="gh-input gh-token-input" value="${esc(_form.token)}" placeholder="github_pat_…" autocomplete="off" spellcheck="false" aria-label="GitHub token"></div>` +
            button('gh-token-connect', 'Connect', '', true);
    }

    // The footer's two scopes. This project's link to its repository, and the
    // account Builder is connected to GitHub as, which every project uses.
    function stopRow() {
        return '<div class="gh-footer-row"><button type="button" class="gh-linkbtn gh-stop">Stop saving this project to GitHub</button></div>';
    }
    function accountRow() {
        return `<div class="gh-footer-row">Signed in as @${esc(_login || '')} · <button type="button" class="gh-linkbtn gh-signout">Disconnect GitHub</button></div>`;
    }

    // Builder saves a project only to a new repository it creates for it, so
    // starting is a name and whether it's private.
    function connectForm(title) {
        if (_form.name === null) _form.name = Core.repoNameFromTitle(title || 'my-site');
        return heading('Save this project to GitHub') +
            p('Builder creates a repository for this project and saves every version to it.') +
            `<label class="gh-label">Repository name<input type="text" class="gh-input gh-name-input" value="${esc(_form.name)}" spellcheck="false"></label>` +
            `<label class="gh-check"><input type="checkbox" class="gh-private"${_form.isPrivate ? ' checked' : ''}> Private. Only you and people you invite can see the code.</label>` +
            button('gh-start', 'Start saving', '', true) +
            '<div class="gh-footer">' + accountRow() + '</div>';
    }

    // What a linked project's panel says, as { title, body, sync }. The title
    // sits in the top row beside the Sync button, which sync: false leaves out
    // where syncing can't help. The Sync button stands in for the "Check
    // again" and "Try now" buttons each state used to have.
    function stateView(link, s) {
        const repo = esc(repoLabel(link));
        const branch = esc(link.branch);
        const kind = s ? s.kind : 'checking';
        const view = (title, body, sync) => ({ title, body: body || '', sync: sync !== false });
        // Shown only before a project's first result. After that a check
        // keeps the last result up (see render).
        if (kind === 'checking') return view('Checking GitHub…');
        if (kind === 'saving') return view('Saving to GitHub…', p('Your latest version is on its way. You can keep building.'));
        if (kind === 'bringing') return view('Bringing in changes from GitHub…', p('Your current version stays in Version history. The preview reloads when the changes are in.'));
        if (kind === 'up-to-date') return view('Saved to GitHub.');
        if (kind === 'waiting') {
            return view('Not saved to GitHub yet', p(WAITING[s.reason] || 'Builder tries again soon.') +
                (s.reason === 'stopped' ? button('gh-send-stopped', 'Save it to GitHub', ` data-version="${esc(s.versionId || '')}"`) : ''));
        }
        if (kind === 'collision') {
            const conflicts = (link.conflicts || []);
            if (!conflicts.length) return view('Saved to GitHub.');
            const title = conflicts.length === 1 ? `GitHub also changed ${esc(conflicts[0].path)}` : `GitHub also changed ${conflicts.length} files`;
            return view(title, conflicts.map((c) => {
                const name = esc(c.path);
                const what = c.kind === 'deleted-here' ? `${name} was removed here and changed on GitHub. Builder kept it removed.`
                    : c.kind === 'deleted-on-github' ? `${name} was changed here and removed on GitHub. Builder kept it.`
                        : c.kind === 'turn' ? `${name} came in from GitHub while the AI was working, and the AI changed it too. Builder kept the project’s copy.`
                            : `${name} changed both here and on GitHub. Builder kept the project’s copy, so your preview didn’t change.`;
                return '<div class="gh-card">' + p(what + ' GitHub’s copy is still in the repository’s history.') +
                    '<div class="gh-actions">' +
                        button('gh-conflict-github', 'Use GitHub’s copy', ` data-path="${name}"`) +
                        button('gh-conflict-keep', 'Keep this copy', ` data-path="${name}"`) +
                    '</div></div>';
            }).join('') + p(`Everything else is saved in ${repo}.`));
        }
        if (kind === 'history') {
            return view('GitHub’s history was changed',
                p(`Someone moved or rewrote the branch ${branch} on GitHub. People do this to undo changes or to remove something private, such as a key. Nothing is deleted either way.`) +
                button('gh-history-github', 'Use GitHub’s version', '', true) +
                p('Builder gets the files from GitHub. Your current version stays in Version history.') +
                button('gh-history-project', 'Keep this project’s version') +
                p('GitHub gets this project’s files on top of its new history. If the change on GitHub removed something private, this can put it back.') +
                button('gh-history-later', 'Not now'), false);
        }
        // GitHub's own check refused a version with a key in it. Builder
        // never holds a version back for a key. It saves it, and the AI warns
        // the user about the key in the chat (keyNews in the engine).
        if (kind === 'secret') {
            return view('GitHub didn’t accept this version',
                p(`GitHub found a secret key in ${s.path ? esc(s.path) : 'this version'} and refused it. Ask the AI to move the key into your backend’s private storage, and the next version goes through.`));
        }
        if (kind === 'signed-out') return view('Connect GitHub again', tokenBody(link), false);
        if (kind === 'lapsed') {
            return view('Saving to GitHub is paused',
                p('Your paid plan has ended, so Builder stopped saving to GitHub and bringing changes in. Your repository and everything on it stay as they are, and Builder keeps making versions.') +
                button('gh-upgrade', 'Upgrade', ' data-source="github"', true), false);
        }
        if (kind === 'repo-missing') return view('Builder can’t reach your repository', p(`The repository ${repo} may have been deleted, or Builder’s access to it was removed on GitHub. Nothing in your project changed.`));
        if (kind === 'branch-missing') return view('The GitHub branch is gone', p(`The branch ${branch} was deleted on GitHub. Nothing in your project changed.`));
        if (kind === 'rules') return view('GitHub won’t accept direct saves', p(s.signed ? `The rules on ${branch} require signed commits, which Builder can’t make from a browser.` : `The rules on ${branch} only accept changes through a pull request.`));
        if (kind === 'archived') return view('The repository is archived', p(`GitHub doesn’t accept changes to ${repo} while it is archived.`));
        if (kind === 'too-big') return view('This repository is too big', p('It is too big for Builder to keep in step with a project. Choose another one, or create a new repository.'), false);
        return view('Something went wrong', p(esc((s && s.message) || 'Builder couldn’t finish syncing with GitHub.')));
    }

    // Only the files this project actually keeps out, such as one the user
    // chose to keep out (with the way to include it again). Nothing when
    // there are none.
    function keptOutList(link) {
        const items = (link.keptOut || []).map((k) => {
            const why = k.reason === 'secret-in' ? 'Holds a secret key, so Builder doesn’t bring it in.' : (Core.EXCLUSION_TEXT[k.reason] || Core.EXCLUSION_TEXT.user);
            const undo = k.reason === 'user' ? ` <button type="button" class="gh-linkbtn gh-include" data-path="${esc(k.path)}">Include it again</button>` : '';
            return `<li><code>${esc(k.path)}</code> ${esc(why)}${undo}</li>`;
        }).join('');
        if (!items) return '';
        return `<details class="gh-details"><summary>Files kept out of GitHub</summary><ul class="gh-list">${items}</ul></details>`;
    }

    function render() {
        const $panel = $('.preview-github-panel');
        if (!$panel.length) return;
        const id = chatId();
        const link = id ? Sync.linkFor(id) : null;
        const linked = !!(link && !link.disconnected);
        let body = '';
        let holdState = false;
        if (!subscribed() && !linked) {
            body = heading('Save this project to GitHub') +
                p('Builder can save every version of this project to a GitHub repository you own, and bring in changes made there.') +
                button('gh-upgrade', 'Upgrade', ' data-source="github"', true) +
                // Signed in from an earlier plan, so the token can still go.
                (_login ? '<div class="gh-footer">' + accountRow() + '</div>' : '');
        } else if (!_login && !(linked && Sync.stateFor(id) && Sync.stateFor(id).kind === 'lapsed')) {
            // A linked project can stop saving without connecting first.
            body = linked ? tokenForm(link) + '<div class="gh-footer">' + stopRow() + '</div>' : tokenForm(null);
        } else if (!linked) {
            const title = (typeof savedChats !== 'undefined' && Array.isArray(savedChats) && (savedChats.find((c) => c.id === id) || {}).title) || '';
            body = connectForm(title);
        } else {
            // The top row says where things stand, with the Sync button at
            // its right, and the repository under it is the link to GitHub.
            // Opening the panel starts a check, and the result usually comes
            // back the same. So while one runs, the last result stays up with
            // its buttons waiting, and only the Sync button says so.
            const now = Sync.stateFor(id);
            const syncing = !!(now && ['checking', 'saving', 'bringing'].includes(now.kind));
            const checking = !!(now && now.kind === 'checking');
            const shown = checking && now.prev ? now.prev : now;
            holdState = checking && shown !== now;
            const v = stateView(link, shown);
            const label = syncing ? 'Syncing…' : shown && shown.kind === 'up-to-date' ? 'Synced' : 'Sync';
            const sync = v.sync
                ? `<button type="button" class="gh-sync${syncing ? ' is-syncing' : ''}"${syncing || _busyAction ? ' disabled' : ''}>${window.reload_svg || ''}<span>${label}</span></button>`
                : '';
            body = '<div class="gh-summary">' +
                    `<div class="gh-top"><div class="gh-heading">${v.title}</div>${sync}</div>` +
                    `<a class="gh-link gh-repo" href="${esc(repoUrl(link))}" target="_blank" rel="noopener noreferrer">${esc(repoLabel(link))} (${esc(link.branch)})</a>` +
                '</div>' +
                (v.body ? `<div class="gh-state">${v.body}</div>` : '') +
                '<div class="gh-footer">' +
                    keptOutList(link) +
                    stopRow() +
                    (_login ? accountRow() : '') +
                '</div>';
        }
        if (_error) body += `<div class="gh-error" role="alert">${esc(_error)}</div>`;
        // A redraw keeps the kept-out list open if it was.
        const listOpen = $panel.find('.gh-details').prop('open');
        $panel.find('.github-panel-body').html(body);
        if (listOpen) $panel.find('.gh-details').prop('open', true);
        if (holdState) $panel.find('.gh-state').find('button, input, select').prop('disabled', true);
    }

    // The toolbar button's dot: something here needs the user.
    function paintButton() {
        const $btn = $('.preview-github-btn');
        if (!$btn.length) return;
        const id = chatId();
        const link = id ? Sync.linkFor(id) : null;
        // A check shows the last result, as the panel does (see render).
        const now = id ? Sync.stateFor(id) : null;
        const s = now && now.kind === 'checking' && now.prev ? now.prev : now;
        const attention = !!(link && !link.disconnected && s && ['collision', 'history', 'secret', 'signed-out', 'repo-missing', 'branch-missing', 'rules', 'archived', 'error'].includes(s.kind));
        $btn.find('.preview-github-dot').prop('hidden', !attention);
        const state = !link || link.disconnected || !s ? ''
            : s.kind === 'up-to-date' ? 'Saved to GitHub'
                : s.kind === 'saving' ? 'Saving to GitHub…'
                    : s.kind === 'bringing' ? 'Bringing in changes from GitHub…'
                        : attention ? 'Needs your attention' : '';
        const title = state ? `Source control — ${state}` : 'Source control';
        $btn.attr('title', title).attr('aria-label', title);
    }

    // ---- Open and close ---------------------------------------------------------

    async function openPanel() {
        if (!window.user) return;
        window.closeVersionsPanel?.();
        window.closePublishPanel?.();
        window.closeSharePanel?.();
        window.closeIssuesPanel?.();
        window.closeDevicePanel?.();
        _open = true;
        _error = '';
        // The suggested repository name came from the project it was opened
        // for. Another project starts over with its own.
        if (_form.formChat !== chatId()) Object.assign(_form, { name: null, isPrivate: true, formChat: chatId() });
        $('.preview-github-btn').attr('aria-expanded', 'true');
        let $panel = $('.preview-github-panel');
        if (!$panel.length) {
            $panel = $(
                '<div class="preview-github-panel" role="dialog" aria-label="GitHub integration" tabindex="-1">' +
                    `<div class="github-panel-header"><span class="github-panel-title">GitHub integration<span class="beta-badge">Beta</span></span><button type="button" class="github-panel-close" title="Close">${window.cross_svg || window.x_svg || '✕'}</button></div>` +
                    '<div class="github-panel-body"></div>' +
                '</div>');
            $('.preview-pane').append($panel);
        }
        render();
        window.positionPanelCaret?.('.preview-github-panel', '.preview-github-btn');
        $panel.trigger('focus');
        // Fresh facts: the plan, the sign-in and the link record.
        const id = chatId();
        try { if (window.refreshUserPlan) await window.refreshUserPlan(); } catch (e) { /* cached plan */ }
        try { _login = await Sync.signedInAs(); } catch (e) { /* unknown */ }
        let link = null;
        try { link = await Sync.readLink(id); } catch (e) { /* cached link */ }
        if (!_open || chatId() !== id) return;
        render();
        if (link && !link.disconnected) Sync.checkNow(id);
        window.track?.('GitHub Panel Opened', { linked: !!(link && !link.disconnected), plan: subscribed() ? 'paid' : 'free' });
    }

    function closePanel() {
        _open = false;
        $('.preview-github-btn').attr('aria-expanded', 'false');
        $('.preview-github-panel').remove();
    }
    window.closeGitHubPanel = closePanel;

    // Run one action from the panel. Its controls are disabled in place, not
    // redrawn: a redraw here would drop what the user typed, and would take
    // the clicked button out of the page before the click finished.
    async function act(fn) {
        if (_busyAction) return;
        _busyAction = true;
        _error = '';
        const $panel = $('.preview-github-panel');
        $panel.find('.gh-error').remove();
        $panel.find('button, input, select').not('.github-panel-close').prop('disabled', true);
        try {
            await fn();
        } catch (e) {
            _error = (e && e.message) || 'Something went wrong. Try again.';
        } finally {
            _busyAction = false;
            if (_open) render();
            paintButton();
        }
    }

    // ---- Events -------------------------------------------------------------------

    window.addEventListener('github-sync-changed', (e) => {
        const id = e && e.detail ? e.detail.chatId : null;
        if (id && id !== chatId()) return;
        paintButton();
        // Not under someone typing: the next change, or closing and opening
        // the panel, shows the new state.
        const redraw = () => {
            const typing = $(document.activeElement).is('.preview-github-panel input, .preview-github-panel select');
            if (_open && !_busyAction && !typing) render();
        };
        // No project means a sign-in or a sign-out (here, or GitHub refusing
        // the token), which changes who the panel says Builder is connected as.
        if (!id && _open) Sync.signedInAs().then((login) => { _login = login; redraw(); }).catch(() => {});
        redraw();
    });

    $(document).on('click', '.preview-github-btn', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (_open) closePanel(); else openPanel();
    });
    $(document).on('click', '.github-panel-close', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closePanel();
        $('.preview-github-btn').trigger('focus');
    });
    $(document).on('keydown', '.preview-github-panel', function (e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            closePanel();
            $('.preview-github-btn').trigger('focus');
        }
    });
    $(document).on('click', function (e) {
        if (!_open) return;
        const $t = $(e.target);
        if (window.isInPuterDialog?.(e.target)) return;
        // A click on something a redraw has since taken out of the page
        // started inside the panel.
        if (!document.documentElement.contains(e.target)) return;
        if ($t.closest('.preview-github-panel').length || $t.closest('.preview-github-btn').length) return;
        closePanel();
    });

    // A click inside the panel is the panel's: it stops here, so the
    // close-on-outside-click handler above never sees it.
    const on = (selector, handler) => $(document).on('click', '.preview-github-panel ' + selector, function (e) {
        e.preventDefault();
        e.stopPropagation();
        handler.call(this, $(this));
    });

    // Keep what is typed and picked (see _form).
    $(document).on('input', '.preview-github-panel .gh-token-input', function () { _form.token = String($(this).val() || ''); });
    $(document).on('input', '.preview-github-panel .gh-name-input', function () { _form.name = String($(this).val() || ''); });
    $(document).on('change', '.preview-github-panel .gh-private', function () { _form.isPrivate = $(this).prop('checked'); });
    $(document).on('keydown', '.preview-github-panel .gh-token-input', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); $('.preview-github-panel .gh-token-connect').trigger('click'); }
    });

    on('.gh-upgrade', () => { closePanel(); window.openUpgradeModal?.('github'); });
    on('.gh-token-connect', () => {
        const token = String($('.preview-github-panel .gh-token-input').val() || _form.token || '');
        act(async () => {
            const r = await Sync.auth.signInWithToken(token);
            _login = r.login;
            _form.token = '';
            const link = Sync.linkFor(chatId());
            if (link && !link.disconnected) Sync.checkNow(chatId());
        });
    });
    on('.gh-start', () => {
        // Read before act() disables the form.
        const $p = $('.preview-github-panel');
        const name = String($p.find('.gh-name-input').val() || _form.name || '').trim();
        const isPrivate = $p.find('.gh-private').length ? $p.find('.gh-private').prop('checked') : _form.isPrivate;
        act(async () => {
            if (!name) throw new Error('Give the repository a name.');
            await Sync.connect(chatId(), { name, isPrivate });
        });
    });
    on('.gh-sync', () => Sync.checkNow(chatId()));
    on('.gh-conflict-github', ($b) => act(() => Sync.resolveConflict(chatId(), $b.attr('data-path'), 'github')));
    on('.gh-conflict-keep', ($b) => act(() => Sync.resolveConflict(chatId(), $b.attr('data-path'), 'keep')));
    on('.gh-history-github', () => act(() => Sync.resolveHistory(chatId(), 'github')));
    on('.gh-history-project', () => act(async () => {
        const ok = typeof puterConfirm === 'function'
            ? await puterConfirm('Put this project’s files on GitHub, on top of its new history? If the change on GitHub removed something private, this can put it back.')
            : true;
        if (ok) await Sync.resolveHistory(chatId(), 'project');
    }));
    on('.gh-history-later', () => act(() => Sync.resolveHistory(chatId(), 'later')));
    on('.gh-include', ($b) => act(() => Sync.includeAgain(chatId(), $b.attr('data-path'))));
    on('.gh-send-stopped', ($b) => act(() => Sync.sendStoppedTurn(chatId(), $b.attr('data-version'))));
    on('.gh-stop', () => act(async () => {
        const ok = typeof puterConfirm === 'function'
            ? await puterConfirm('Stop saving this project to GitHub? The repository and its history stay on GitHub, and the project stays here. Saving to GitHub again later creates a new repository.')
            : true;
        if (ok) await Sync.disconnect(chatId());
    }));
    on('.gh-signout', () => act(async () => {
        const ok = typeof puterConfirm === 'function'
            ? await puterConfirm('Disconnect GitHub from Builder? Builder forgets your GitHub token, and your projects stop saving to GitHub until you connect again. Your repositories don’t change. The token stays on GitHub until you delete it there.')
            : true;
        if (!ok) return;
        await Sync.auth.signOut();
        _login = null;
        // A project set up to save shows it isn't saving any more, now
        // rather than at its next check.
        const link = Sync.linkFor(chatId());
        if (link && !link.disconnected) Sync.checkNow(chatId());
    }));
})();
