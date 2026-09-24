// ---- Composer handoff: files from a marketing page into the builder ---------
//
// The hero composer on the static marketing pages (src/content/pages/
// ai-app-builder.js, ai-website-builder.js) behaves like the app's own: the
// visitor types, attaches files, presses send, and the build starts. The text
// travels in the URL (/?prompt=…&send=1, see applyPromptDeepLink in app.js);
// files cannot, so they are parked here, in IndexedDB, across the navigation.
// Both pages are served from the same origin, so the app reads what the
// marketing page wrote.
//
// This file is a classic script shared by BOTH sides: it is part of the app
// bundle (vite.config.js SCRIPTS) and inlined verbatim into every marketing
// page that carries a composer (scripts/build-seo.mjs), so the database name,
// the store and the record shape can never drift between writer and reader.
// Keep it dependency-free and ES5-safe for the same reason.
//
// The record is {files: File[], at: <ms timestamp>} under one fixed key: a
// second stash overwrites the first, and take() deletes as it reads, so a
// record is consumed at most once. Anything older than MAX_AGE_MS is treated as
// abandoned (the visitor closed the tab between stash and load) and dropped.
(function () {
    var DB_NAME = 'builder-handoff';
    var STORE = 'pending';
    var KEY = 'composer';
    var VERSION = 1;
    var MAX_AGE_MS = 10 * 60 * 1000;

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
        // Park the staged files for the app to pick up. Resolves once the write
        // has committed, so the caller can navigate the moment it settles.
        stash: function (files) {
            var list = Array.prototype.slice.call(files || []);
            return withStore('readwrite', function (store) {
                return store.put({ files: list, at: Date.now() }, KEY);
            });
        },

        // Read and delete the parked files in one transaction. Resolves with the
        // File[] (empty when nothing was parked, or it had gone stale).
        take: function () {
            return withStore('readwrite', function (store) {
                var req = store.get(KEY);
                store.delete(KEY);
                return req;
            }).then(function (record) {
                if (!record || !Array.isArray(record.files)) return [];
                if (typeof record.at !== 'number' || Date.now() - record.at > MAX_AGE_MS) return [];
                return record.files.filter(function (f) { return f instanceof File; });
            });
        },
    };
})();
