// custom-domain.js — the user's own domains (www.example.com) on a published
// site, as the publish popover shows them. Pure and DOM-free, so
// scripts/test-custom-domain.mjs runs it directly. ui.js does the I/O.
//
// Puter connects a domain through its own dialog, puter.hosting.attach(),
// which resolves to the domain the user picked or added. The builder never
// holds a token that can read the user's domains (only Puter's dialog does),
// so it keeps what attach returned on the project's record
// (publishedDomains) and finds out a pending domain went live by fetching
// the domain itself and comparing it with the site's puter.site address
// (sameSite below).
//
// A domain serves a site by its puter.site name. Changing the site's address
// creates a new name and deletes the old one, so a domain recorded against
// the old name no longer serves this project. view() calls that 'moved', and
// the popover offers to connect it again.
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
        };
    }

    /** A saved list, cleaned: unreadable entries dropped, one per hostname. */
    function list(saved) {
        const out = [];
        for (const raw of (Array.isArray(saved) ? saved : [])) {
            const d = normalize(raw);
            if (d && !out.some((o) => o.hostname === d.hostname)) out.push(d);
        }
        return out;
    }

    /**
     * The list with `raw` first, in place of any entry for the same hostname.
     * The domain the user chose last is the site's address once it works
     * (liveUrl takes the first that does), so Change domain switches the
     * address without dropping the old one, which still serves the site.
     * Connecting a domain again (after an address change, or after Puter
     * dropped it and the user added it anew) replaces what was there.
     */
    function upsert(saved, raw) {
        const d = normalize(raw);
        const current = list(saved);
        if (!d) return current;
        return [d].concat(current.filter((o) => o.hostname !== d.hostname && !(d.uuid && o.uuid === d.uuid)));
    }

    /** The list with `hostname` marked as serving the site since `now`. */
    function markActive(saved, hostname, now) {
        const key = hostKey(hostname);
        return list(saved).map((d) => d.hostname !== key ? d
            : Object.assign({}, d, { status: 'active', statusDetail: null, activatedAt: d.activatedAt || now || Date.now() }));
    }

    /**
     * What the popover shows for one domain, given the puter.site name the
     * site has now: 'active', 'pending' (waiting for its DNS records),
     * 'failed' (Puter couldn't verify it), or 'moved' (recorded against a
     * name the site no longer has).
     */
    function view(domain, sub) {
        const d = normalize(domain);
        if (!d) return null;
        const current = String(sub || '').toLowerCase();
        const kind = d.site && current && d.site !== current ? 'moved' : d.status;
        return { kind, hostname: d.hostname, url: 'https://' + d.hostname + '/', domain: d };
    }

    /** The domains that may still go live, so the popover keeps checking them. */
    function waiting(saved, sub) {
        return list(saved).filter((d) => {
            const v = view(d, sub);
            return v && (v.kind === 'pending' || v.kind === 'failed');
        });
    }

    /**
     * The address to share: the latest chosen domain that serves this site,
     * else the puter.site address. A new pick that is still waiting for its
     * DNS records leaves the address on the one that works.
     */
    function liveUrl(saved, sub, publishedUrl) {
        for (const d of list(saved)) {
            const v = view(d, sub);
            if (v && v.kind === 'active') return v.url;
        }
        return publishedUrl || null;
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

    window.CustomDomain = { normalize, list, upsert, markActive, view, waiting, liveUrl, sameSite };
})();
