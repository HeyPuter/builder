// An in-memory GitHub for the sync tests: real git blob hashes (the engine
// checks them), trees as flat path maps, commits with parents, branches,
// compare, the REST endpoints github-sync.js calls, and GraphQL updateRefs
// with a real compare-and-swap. Every request is logged, and a test can push
// to a branch directly the way a developer would.

import crypto from 'node:crypto';

const enc = (s) => new TextEncoder().encode(s);

export function makeGitHub(opts = {}) {
    const token = opts.token || 'github_pat_' + 'A'.repeat(30);
    const login = opts.login || 'alice-gh';
    const blobs = new Map();
    const trees = new Map();
    const commits = new Map();
    const repos = new Map();
    const log = [];
    let seq = 1;
    const hooks = { beforeCommit: null };

    const sha1 = (buf) => crypto.createHash('sha1').update(buf).digest('hex');
    function putBlob(bytes) {
        const b = Buffer.from(bytes);
        const sha = sha1(Buffer.concat([Buffer.from(`blob ${b.length}\0`), b]));
        blobs.set(sha, new Uint8Array(b));
        return sha;
    }
    function putTree(flat) {
        const key = JSON.stringify([...flat.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)));
        const sha = sha1(Buffer.from('tree:' + key));
        trees.set(sha, new Map(flat));
        return sha;
    }
    function putCommit(tree, parents, message) {
        const sha = sha1(Buffer.from(`commit:${tree}:${parents.join(',')}:${message}:${seq++}`));
        commits.set(sha, { tree, parents, message });
        return sha;
    }
    function ancestors(sha) {
        const out = new Set();
        const stack = [sha];
        while (stack.length) {
            const s = stack.pop();
            if (!s || out.has(s) || !commits.has(s)) continue;
            out.add(s);
            stack.push(...commits.get(s).parents);
        }
        return out;
    }

    function createRepo(owner, name, o = {}) {
        const id = 1000 + repos.size;
        const repo = { id, node_id: 'R_' + id, owner, name, private: o.private !== false, default_branch: 'main', refs: new Map(), archived: false };
        repos.set(owner + '/' + name, repo);
        if (o.autoInit) {
            const tree = putTree(new Map([['README.md', { mode: '100644', sha: putBlob(enc(`# ${name}\n`)) }]]));
            repo.refs.set('main', putCommit(tree, [], 'Initial commit'));
        }
        return repo;
    }

    // A developer's push: changes { path: text | Uint8Array | null } on top
    // of the branch head. Returns the new commit.
    function push(owner, name, branch, changes, message) {
        const repo = repos.get(owner + '/' + name);
        const head = repo.refs.get(branch);
        const flat = new Map(head ? trees.get(commits.get(head).tree) : []);
        for (const [path, value] of Object.entries(changes)) {
            if (value === null) flat.delete(path);
            else flat.set(path, { mode: '100644', sha: putBlob(typeof value === 'string' ? enc(value) : value) });
        }
        const commit = putCommit(putTree(flat), head ? [head] : [], message || 'Developer change');
        repo.refs.set(branch, commit);
        return commit;
    }
    function forceBranch(owner, name, branch, commit) { repos.get(owner + '/' + name).refs.set(branch, commit); }
    function headFiles(owner, name, branch) {
        const repo = repos.get(owner + '/' + name);
        const head = repo.refs.get(branch);
        if (!head) return null;
        const out = {};
        for (const [path, e] of trees.get(commits.get(head).tree)) out[path] = new TextDecoder().decode(blobs.get(e.sha));
        return out;
    }
    function headCommit(owner, name, branch) {
        const c = repos.get(owner + '/' + name).refs.get(branch);
        return c ? Object.assign({ sha: c }, commits.get(c)) : null;
    }

    function listing(treeSha) {
        const flat = trees.get(treeSha);
        const folders = new Set();
        const out = [];
        for (const [path, e] of flat) {
            const parts = path.split('/');
            for (let i = 1; i < parts.length; i++) folders.add(parts.slice(0, i).join('/'));
            out.push({ path, mode: e.mode, type: e.mode === '160000' ? 'commit' : 'blob', sha: e.sha, size: e.mode === '160000' ? undefined : blobs.get(e.sha)?.length });
        }
        for (const f of folders) out.push({ path: f, mode: '040000', type: 'tree', sha: sha1(Buffer.from('folder:' + f)) });
        return out.sort((a, b) => (a.path < b.path ? -1 : 1));
    }

    function respond(status, data, headers = {}) {
        const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v)]));
        return {
            ok: status >= 200 && status < 300,
            status,
            statusText: String(status),
            headers: { get: (n) => (h.has(n.toLowerCase()) ? h.get(n.toLowerCase()) : null), forEach: (fn) => h.forEach((v, k) => fn(v, k)) },
            json: async () => (data instanceof Uint8Array ? JSON.parse(new TextDecoder().decode(data)) : data),
            arrayBuffer: async () => (data instanceof Uint8Array ? data.slice().buffer : enc(JSON.stringify(data)).buffer),
        };
    }
    const err = (status, message) => respond(status, { message });
    const repoData = (r) => ({ id: r.id, node_id: r.node_id, name: r.name, owner: { login: r.owner }, private: r.private, default_branch: r.default_branch, html_url: `https://github.com/${r.owner}/${r.name}`, archived: r.archived });

    async function fetch(url, init = {}) {
        const u = new URL(url);
        const method = (init.method || 'GET').toUpperCase();
        const path = decodeURIComponent(u.pathname);
        const headers = init.headers || {};
        const body = init.body ? JSON.parse(init.body) : null;
        log.push({ method, path });
        if (opts.fail && opts.fail(method, path)) throw new TypeError('Failed to fetch');
        if (headers.Authorization !== 'Bearer ' + token) return err(401, 'Bad credentials');
        let m;
        if (method === 'GET' && path === '/user') return respond(200, { login, id: 7 });
        if (method === 'GET' && path === '/user/repos') return respond(200, [...repos.values()].map(repoData));
        if (method === 'POST' && path === '/user/repos') return respond(201, repoData(createRepo(login, body.name, { private: body.private, autoInit: body.auto_init })));
        if (method === 'POST' && path === '/graphql') {
            const up = body.variables.updates[0];
            const repo = [...repos.values()].find((r) => r.node_id === body.variables.repo);
            const branch = up.name.replace('refs/heads/', '');
            const cur = repo.refs.get(branch);
            if (cur !== up.beforeOid) return respond(200, { data: null, errors: [{ type: 'STALE_DATA', message: `Expected ${up.name} to point to ${up.beforeOid} but it was ${cur}` }] });
            if (!commits.has(up.afterOid)) return respond(200, { data: null, errors: [{ type: 'NOT_FOUND', message: 'Could not resolve to a commit' }] });
            repo.refs.set(branch, up.afterOid);
            return respond(200, { data: { updateRefs: { clientMutationId: null } } });
        }
        if (!(m = /^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/.exec(path))) return err(404, 'Not Found');
        const repo = repos.get(m[1] + '/' + m[2]);
        if (!repo) return err(404, 'Not Found');
        const rest = m[3] || '';
        if (method === 'GET' && rest === '') return respond(200, repoData(repo));
        if (method === 'GET' && rest === '/branches') return respond(200, [...repo.refs.keys()].map((name) => ({ name })));
        if (method === 'GET' && (m = /^\/branches\/(.+)$/.exec(rest))) {
            const c = repo.refs.get(m[1]);
            if (!c) return err(404, 'Branch not found');
            return respond(200, { name: m[1], commit: { sha: c, commit: { tree: { sha: commits.get(c).tree } } }, protected: false }, { ETag: '"' + c + '"' });
        }
        if (method === 'GET' && (m = /^\/git\/trees\/([0-9a-f]+)$/.exec(rest))) {
            if (!trees.has(m[1])) return err(404, 'Not Found');
            return respond(200, { sha: m[1], tree: listing(m[1]), truncated: false });
        }
        if (method === 'GET' && (m = /^\/git\/blobs\/([0-9a-f]+)$/.exec(rest))) {
            if (!blobs.has(m[1])) return err(404, 'Not Found');
            return respond(200, blobs.get(m[1]));
        }
        if (method === 'POST' && rest === '/git/blobs') return respond(201, { sha: putBlob(Buffer.from(body.content, 'base64')) });
        if (method === 'POST' && rest === '/git/trees') {
            const flat = new Map(body.base_tree ? trees.get(body.base_tree) : []);
            for (const e of body.tree) {
                if (e.sha === null) {
                    if (!flat.has(e.path)) return err(422, 'tree.path not found');
                    flat.delete(e.path);
                } else {
                    if (!blobs.has(e.sha)) return err(422, 'tree.sha ' + e.sha + ' is not a valid blob');
                    flat.set(e.path, { mode: e.mode, sha: e.sha });
                }
            }
            return respond(201, { sha: putTree(flat) });
        }
        if (method === 'POST' && rest === '/git/commits') {
            if (hooks.beforeCommit) { const h = hooks.beforeCommit; hooks.beforeCommit = null; h(); }
            return respond(201, { sha: putCommit(body.tree, body.parents, body.message) });
        }
        if (method === 'GET' && (m = /^\/compare\/([0-9a-f]+)\.\.\.([0-9a-f]+)$/.exec(rest))) {
            const [base, head] = [m[1], m[2]];
            if (!commits.has(base) || !commits.has(head)) return err(404, 'Not Found');
            const headAnc = ancestors(head);
            const baseAnc = ancestors(base);
            let status = 'diverged';
            if (base === head) status = 'identical';
            else if (headAnc.has(base)) status = 'ahead';
            else if (baseAnc.has(head)) status = 'behind';
            const list = [...headAnc].filter((c) => !baseAnc.has(c)).map((sha) => ({ sha, commit: { message: commits.get(sha).message } }));
            return respond(200, { status, commits: list });
        }
        if (method === 'PUT' && (m = /^\/contents\/(.+)$/.exec(rest))) {
            const branch = body.branch || repo.default_branch;
            const head = repo.refs.get(branch);
            const flat = new Map(head ? trees.get(commits.get(head).tree) : []);
            flat.set(m[1], { mode: '100644', sha: putBlob(Buffer.from(body.content, 'base64')) });
            repo.refs.set(branch, putCommit(putTree(flat), head ? [head] : [], body.message));
            return respond(201, {});
        }
        return err(404, 'Not Found');
    }

    return { fetch, token, login, log, hooks, createRepo, push, forceBranch, headFiles, headCommit, repos, commits };
}
