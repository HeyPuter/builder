// custom-domain.js — the user's own domain (www.example.com) on a published
// site, as the publish popover shows it. Pure and DOM-free, so
// scripts/test-custom-domain.mjs runs it directly. ui.js does the I/O.
//
// Puter connects a domain through its own dialog, puter.hosting.attach(),
// which resolves to the domain the user picked or added. The builder never
// holds a token that can read the user's domains (only Puter's dialog does),
// so it keeps what attach returned on the project's record
// (publishedDomains, a list of at most one) and finds out a pending domain
// went live by fetching the domain itself and comparing it with the site's
// puter.site address (sameSite below).
//
// A domain serves a site by its puter.site name. Changing the site's address
// creates a new name and deletes the old one, so a domain recorded against
// the old name no longer serves this project. view() calls that 'moved', and
// the popover offers to connect it again.
//
// A domain that worked can stop later, out of the builder's sight: removed or
// moved to another site in Puter, its DNS changed, its renewal lapsed. The
// popover checks a working domain again when it opens, and one that no longer
// shows the site is marked lost (lostAt) until a check finds it working.
(function () {
    'use strict';

    const STATUSES = new Set(['pending', 'active', 'failed']);
    const HOST_RE = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

    function hostKey(hostname) {
        return String(hostname || '').trim().toLowerCase().replace(/\.+$/, '');
    }

    /**
     * The fields the builder keeps from a CustomDomain, or null when the
     * value isn't one (a hostname that couldn't go into a URL included).
     */
    function normalize(raw) {
        if (!raw || typeof raw !== 'object') return null;
        const hostname = hostKey(raw.hostname);
        if (!HOST_RE.test(hostname)) return null;
        const records = (Array.isArray(raw.records) ? raw.records : [])
            .filter((r) => r && typeof r === 'object' && r.name && r.value)
            .map((r) => ({
                type: String(r.type || ''),
                name: String(r.name),
                value: String(r.value),
                purpose: String(r.purpose || ''),
                required: r.required !== false,
            }));
        return {
            uuid: raw.uuid ? String(raw.uuid) : null,
            hostname,
            site: raw.site ? String(raw.site).toLowerCase() : null,
            status: STATUSES.has(raw.status) ? raw.status : 'pending',
            statusDetail: raw.statusDetail ? String(raw.statusDetail) : null,
            isApex: raw.isApex === true,
            records,
            activatedAt: typeof raw.activatedAt === 'number' ? raw.activatedAt : null,
            lostAt: typeof raw.lostAt === 'number' ? raw.lostAt : null,
        };
    }

    /**
     * A saved list, cleaned: its first readable domain, as a project has one
     * at most. The first is the one the user chose last.
     */
    function list(saved) {
        for (const raw of (Array.isArray(saved) ? saved : [])) {
            const d = normalize(raw);
            if (d) return [d];
        }
        return [];
    }

    /**
     * The list once the user picks `raw` in Puter's dialog: that domain alone,
     * in place of the one the project had. Change domain leaves the old one
     * serving the site on Puter's side (apps can't remove a domain), but it is
     * no longer this project's. A pick that can't be read changes nothing.
     */
    function set(saved, raw) {
        const d = normalize(raw);
        return d ? [d] : list(saved);
    }

    /** The list without `hostname`, once another project took it over. */
    function remove(saved, hostname) {
        const key = hostKey(hostname);
        return list(saved).filter((d) => d.hostname !== key);
    }

    /** The list with `hostname` marked as serving the site since `now`. */
    function markActive(saved, hostname, now) {
        const key = hostKey(hostname);
        return list(saved).map((d) => d.hostname !== key ? d
            : Object.assign({}, d, { status: 'active', statusDetail: null, activatedAt: d.activatedAt || now || Date.now(), lostAt: null }));
    }

    /** The list with `hostname`, which worked, found not showing the site since `now`. */
    function markLost(saved, hostname, now) {
        const key = hostKey(hostname);
        return list(saved).map((d) => d.hostname !== key ? d
            : Object.assign({}, d, { lostAt: d.lostAt || now || Date.now() }));
    }

    /**
     * What the popover shows for one domain, given the puter.site name the
     * site has now: 'active', 'pending' (waiting for its DNS records),
     * 'failed' (Puter couldn't verify it), 'lost' (it worked, and no longer
     * shows the site), or 'moved' (recorded against a name the site no
     * longer has).
     */
    function view(domain, sub) {
        const d = normalize(domain);
        if (!d) return null;
        const current = String(sub || '').toLowerCase();
        const kind = d.site && current && d.site !== current ? 'moved'
            : d.status === 'active' && d.lostAt ? 'lost' : d.status;
        return { kind, hostname: d.hostname, url: 'https://' + d.hostname + '/', domain: d };
    }

    /** The domains that may still go live, so the popover keeps checking them. */
    function waiting(saved, sub) {
        return list(saved).filter((d) => {
            const v = view(d, sub);
            return v && (v.kind === 'pending' || v.kind === 'failed' || v.kind === 'lost');
        });
    }

    /**
     * The address to share: the project's domain once it serves this site,
     * else the puter.site address.
     */
    function liveUrl(saved, sub, publishedUrl) {
        for (const d of list(saved)) {
            const v = view(d, sub);
            if (v && v.kind === 'active') return v.url;
        }
        return publishedUrl || null;
    }

    /**
     * The address the project list shows for a site published at
     * `publishedUrl`: its domain while that serves the site, else null (the
     * list then shows the puter.site address).
     */
    function domainUrl(saved, publishedUrl) {
        const m = String(publishedUrl || '').match(/^https?:\/\/([^.\/]+)\.puter\.site/i);
        if (!m) return null;
        const url = liveUrl(saved, m[1], publishedUrl);
        return url && url !== publishedUrl ? url : null;
    }

    /**
     * The hostname of a saved list's domain, whatever its state, or null. The
     * project list keeps it, so a domain another project takes is found there
     * without reading every project's file.
     */
    function hostOf(saved) {
        const d = list(saved)[0];
        return d ? d.hostname : null;
    }

    /**
     * Whether two reads of a site's home page ({ body, lastModified }, or
     * null when the read failed) came from the same site. The same page, or
     * the same file modified at the same time when the host serves the bytes
     * a little differently.
     */
    function sameSite(a, b) {
        if (!a || !b) return false;
        if (typeof a.body === 'string' && a.body && a.body === b.body) return true;
        return !!a.lastModified && a.lastModified === b.lastModified;
    }

    window.CustomDomain = { normalize, list, set, remove, markActive, markLost, view, waiting, liveUrl, domainUrl, hostOf, sameSite };
})();
