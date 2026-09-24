// ---- Composer handoff: a marketing-page send, carried into the builder ------
//
// The hero composer on the static marketing pages (src/content/pages/
// ai-app-builder.js, ai-website-builder.js) behaves like the app's own: the
// visitor types, attaches files, presses send, and the build starts. Files
// cannot travel in a URL, so the whole send (text and files) is parked here,
// in IndexedDB, across the navigation, and the URL carries only the record's
// id (/?prompt=…&handoff=<id>, see applyPromptDeepLink in app.js). Both pages
// are served from the same origin, so the app reads what the marketing page
// wrote.
//
// The id is what makes the automatic send safe. Storage is same-origin, so a
// record can only have been written by a page of ours, from a visitor's own
// press of the button: an outside link to /?prompt=…&handoff=x finds no record
// and degrades to a prefilled box (the plain ?prompt= deep link). Each send
// gets its own id, so two tabs never read each other's files, and a record
// that was never picked up (the tab closed between write and load) cannot be
// attached to a later, unrelated send. take() deletes as it reads, so a
// record is consumed at most once, and sweeps anything older than MAX_AGE_MS.
//
// This file is a classic script shared by BOTH sides: it is part of the app
// bundle (vite.config.js SCRIPTS) and inlined verbatim into every marketing
// page that carries a composer (scripts/build-seo.mjs), so the database name,
// the store and the record shape can never drift between writer and reader.
// Keep it dependency-free and ES5-safe for the same reason.
(function () {
    var DB_NAME = 'builder-handoff';
    var STORE = 'pending';
    var VERSION = 1;
    var MAX_AGE_MS = 10 * 60 * 1000;

    function newId() {
        try {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
        } catch (e) { /* fall through */ }
        return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
    }

    function isStale(record) {
        return !record || typeof record.at !== 'number' || Date.now() - record.at > MAX_AGE_MS;
    }

    function openDb() {
        return new Promise(function (resolve, reject) {
            var idb = window.indexedDB;
            if (!idb) { reject(new Error('IndexedDB is not available')); return; }
            var req;
            try { req = idb.open(DB_NAME, VERSION); } catch (e) { reject(e); return; }
            req.onupgradeneeded = function () {
                var db = req.result;
                if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
            };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error || new Error('Could not open the handoff database')); };
            req.onblocked = function () { reject(new Error('The handoff database is blocked')); };
        });
    }

    // Run `fn(store)` inside one transaction and resolve with the result of the
    // request it returns once the transaction has committed.
    function withStore(mode, fn) {
        return openDb().then(function (db) {
            return new Promise(function (resolve, reject) {
                var tx, req;
                try {
                    tx = db.transaction(STORE, mode);
                    req = fn(tx.objectStore(STORE));
                } catch (e) { db.close(); reject(e); return; }
                tx.oncomplete = function () { db.close(); resolve(req ? req.result : undefined); };
                tx.onerror = function () { db.close(); reject(tx.error || new Error('Handoff transaction failed')); };
                tx.onabort = tx.onerror;
            });
        });
    }

    window.BuilderHandoff = {
        // Park one send: {prompt, files}. Resolves with the record's id once
        // the write has committed, so the caller can put it in the URL and
        // navigate the moment it settles.
        stash: function (send) {
            var id = newId();
            var record = {
                id: id,
                prompt: typeof (send && send.prompt) === 'string' ? send.prompt : '',
                files: Array.prototype.slice.call((send && send.files) || []),
                at: Date.now(),
            };
            return withStore('readwrite', function (store) {
                store.put(record, id);
                return { result: id };
            });
        },

        // Read and delete the record with this id in one transaction, sweeping
        // abandoned records on the way. Resolves with {prompt, files} or null
        // when there is no such record (or it had gone stale).
        take: function (id) {
            if (typeof id !== 'string' || !id) return Promise.resolve(null);
            return withStore('readwrite', function (store) {
                var all = store.getAll();
                all.onsuccess = function () {
                    (all.result || []).forEach(function (rec) {
                        if (isStale(rec) && rec && typeof rec.id === 'string') store.delete(rec.id);
                    });
                };
                var req = store.get(id);
                store.delete(id);
                return req;
            }).then(function (record) {
                if (isStale(record) || !Array.isArray(record.files)) return null;
                return {
                    prompt: typeof record.prompt === 'string' ? record.prompt : '',
                    files: record.files.filter(function (f) { return f instanceof File; }),
                };
            });
        },
    };
})();
