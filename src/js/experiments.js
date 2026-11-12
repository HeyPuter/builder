// Every A/B test the builder runs, in one place. Each one lists its variants,
// the event prop that reports it, and how a visitor is put in a group. Code
// that acts on a test asks experiment(name) for the visitor's variant, which
// is null outside the test, and its events spread experimentProps(name).
//
// To pick a variant by hand, in the console:
//   experiment()                            every test, your variant, the valid ones
//   experiment('starter')                   your variant
//   experiment.set('starter', 'developer')  force one in this browser
//   experiment.reset('starter')             back to your own (reset() for all)
// A forced variant is kept in localStorage under experimentOverrides and wins
// even in a test you're outside of. Your own variant stays stored, for when
// you reset. Reload after a change, since some tests read it as the page loads.
//
// Loaded before ui.js and app.js, which both read it.
(function () {
    const OVERRIDES_KEY = 'experimentOverrides';

    // Half and half, the first variant below 0.5. A running test's variants
    // must keep their order, or the stored draws would mean the other one.
    const draw = variants => (Math.random() < 0.5 ? variants[0] : variants[1]);

    // A variant drawn once per browser and kept in localStorage under key. With
    // storage blocked it's drawn for this load only.
    const drawnThisLoad = {};
    function drawOnce(key, variants) {
        if (Object.prototype.hasOwnProperty.call(drawnThisLoad, key)) return drawnThisLoad[key];
        let v = null;
        try {
            v = localStorage.getItem(key);
            if (!variants.includes(v)) {
                v = draw(variants);
                localStorage.setItem(key, v);
            }
        } catch (e) {}
        if (!variants.includes(v)) v = draw(variants);
        drawnThisLoad[key] = v;
        return v;
    }

    // ---- starter: the developer starter pills --------------------------------
    // Visitors from developer.puter.com or docs.puter.com are split in half. The
    // 'developer' variant sees DEVELOPER_STARTER_PROMPTS (ui.js), the 'default'
    // variant the usual STARTER_PROMPTS. Everyone else is outside the test and
    // sees the usual ones.
    //
    // The source comes from the referrer (both sites send one), or from the docs
    // link's utm_source when a browser drops it. It is read once as this file
    // loads, before cleanLandingUtmParams (app.js) scrubs the URL, and kept for
    // the tab's session, so a reload or a trip to /what-to-build/ and back stays
    // in the test. The variant is drawn once per browser and kept, since most
    // visitors arrive signed out and there is no uuid to hash yet.
    //
    // 'Project Created' carries it as pill_variant. The split is even, so
    // comparing its count per variant is the result.
    const STARTER_TEST_SOURCES = ['developer.puter.com', 'docs.puter.com'];

    function starterTestSource(referrer, search) {
        try {
            const host = new URL(referrer).hostname;
            if (STARTER_TEST_SOURCES.includes(host)) return host;
        } catch (e) {}
        try {
            const utm = (new URLSearchParams(search).get('utm_source') || '').toLowerCase();
            if (STARTER_TEST_SOURCES.includes(utm)) return utm;
        } catch (e) {}
        return null;
    }

    const starterSource = (function () {
        let source = starterTestSource(document.referrer, window.location.search);
        try {
            if (source) sessionStorage.setItem('starterTestSource', source);
            else source = sessionStorage.getItem('starterTestSource');
        } catch (e) {}
        return STARTER_TEST_SOURCES.includes(source) ? source : null;
    })();

    // ---- speed: the fast first build (ended) ---------------------------------
    // Ended 2026-11-12, when fast mode (js/fast-mode.js) opened to every
    // signed-in account. A fast build is now the user's to switch on, and
    // every first build runs at the usual speed. The code stays for a rerun.
    //
    // While it ran, every browser was split in half. The 'fast' variant built
    // each project's first build on Opus at Puter's fast service speed
    // (serviceSpeed 'fast', see turnServiceSpeed in app.js), the 'standard'
    // variant at the usual speed. Other models and later builds ran the same
    // in both. The question was whether a faster first build means fewer
    // people give up on it. The variant is drawn once per browser and kept.
    //
    // Build Started, Build Completed, Build Abandoned and Usage Limit Hit carry
    // it as speed_variant, on every build, and Build Completed's took says how
    // long the build ran. First-build Build Abandoned per variant is the
    // result. Fast costs more, so first-build Usage Limit Hit per variant shows
    // whether fewer abandons only means more builds ran out of credits first (a
    // limit hit is never counted as abandoned).
    //
    // A rerun has to deal with fast mode. Its switch makes a standard
    // variant's first build fast too, and the fast variant's events don't
    // record it as fast_mode, since app.js asks this test's speed first.

    // ---- limitDialog: the builder's own Low Balance dialog --------------------
    // On the web, half of accounts see the builder's own out-of-credits dialog in
    // place of puter.js's Low Balance one (see installLowBalanceOverride in
    // ui.js). The cohort comes from a hash of the uuid, so it's the same on every
    // load and device. It rides on 'Usage Limit Hit' and 'Upgrade After Limit',
    // and the upgrade rate per cohort is the second divided by the first. Inside
    // the Puter desktop the desktop draws its own prompt, so those accounts are
    // 'app' and stay out of the comparison, even with a variant forced.
    // `openLimitModal()` opens the dialog directly.
    const onWeb = () => typeof puter !== 'undefined' && !!puter && puter.env === 'web';
    function limitDialogCohort() {
        const id = window.user && window.user.uuid;
        if (!id) return 'default';
        let h = 2166136261; // FNV-1a
        for (let i = 0; i < id.length; i++) {
            h ^= id.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return (h >>> 0) % 2 ? 'custom' : 'default';
    }

    // assign(variants) gives the visitor's own variant, used when none is
    // forced. It's one of variants, or null for a visitor outside the test.
    // excluded(), when a test has one, gives the value for a visitor who can't
    // take part at all (null when they can). That one wins over a forced
    // variant too. ended, when a test has one, is the day it stopped
    // (YYYY-MM-DD). Nobody is put in it, so it reads null and its events carry
    // nothing, but a forced variant still applies, to try one by hand. Taking
    // ended out runs it again, with the draws browsers kept.
    const EXPERIMENTS = {
        starter: {
            variants: ['developer', 'default'], prop: 'pill_variant',
            assign: variants => (starterSource ? drawOnce('starterTestArm', variants) : null),
        },
        speed: {
            variants: ['fast', 'standard'], prop: 'speed_variant',
            ended: '2026-11-12',
            assign: variants => drawOnce('speedTestArm', variants),
        },
        limitDialog: {
            variants: ['custom', 'default'], prop: 'cohort',
            excluded: () => (onWeb() ? null : 'app'),
            assign: limitDialogCohort,
        },
    };

    const known = name => typeof name === 'string' && Object.prototype.hasOwnProperty.call(EXPERIMENTS, name);
    const warnUnknown = name => console.warn(`experiment: there is no ${JSON.stringify(name)}. Known: ${Object.keys(EXPERIMENTS).join(', ')}`);

    function readOverrides() {
        try {
            const o = JSON.parse(localStorage.getItem(OVERRIDES_KEY));
            return o && typeof o === 'object' && !Array.isArray(o) ? o : {};
        } catch (e) {
            return {};
        }
    }

    function writeOverrides(o) {
        try {
            if (Object.keys(o).length) localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o));
            else localStorage.removeItem(OVERRIDES_KEY);
        } catch (e) {
            console.warn('experiment: storage is blocked, so nothing can be forced');
        }
    }

    function forcedVariant(name) {
        const v = readOverrides()[name];
        return EXPERIMENTS[name].variants.includes(v) ? v : null;
    }

    // The visitor's variant, and whether it was forced.
    function resolve(name) {
        const e = EXPERIMENTS[name];
        const excluded = e.excluded ? e.excluded() : null;
        if (excluded != null) return { variant: excluded, forced: false };
        const forced = forcedVariant(name);
        if (forced) return { variant: forced, forced: true };
        if (e.ended) return { variant: null, forced: false };
        return { variant: e.assign(e.variants), forced: false };
    }

    // The visitor's variant of one test, null outside it. With no name, prints
    // every test instead.
    function experiment(name) {
        if (name === undefined) {
            const rows = {};
            for (const n of Object.keys(EXPERIMENTS)) {
                const { variant, forced } = resolve(n);
                rows[n] = {
                    variant,
                    valid: EXPERIMENTS[n].variants.join(' | '),
                    how: forced ? 'forced' : EXPERIMENTS[n].ended ? 'ended' : EXPERIMENTS[n].variants.includes(variant) ? 'drawn' : 'not in test',
                };
            }
            console.table(rows);
            return;
        }
        if (!known(name)) { warnUnknown(name); return null; }
        return resolve(name).variant;
    }

    experiment.set = function (name, variant) {
        if (!known(name)) { warnUnknown(name); return; }
        const variants = EXPERIMENTS[name].variants;
        if (!variants.includes(variant)) {
            console.warn(`experiment: ${name} has no variant ${JSON.stringify(variant)}. Valid: ${variants.join(', ')}`);
            return;
        }
        writeOverrides({ ...readOverrides(), [name]: variant });
    };

    experiment.reset = function (name) {
        if (name === undefined) { writeOverrides({}); return; }
        if (!known(name)) { warnUnknown(name); return; }
        const o = readOverrides();
        delete o[name];
        writeOverrides(o);
    };

    // { [prop]: variant } for a visitor in the test, {} outside it.
    function experimentProps(name) {
        const v = experiment(name);
        return v == null ? {} : { [EXPERIMENTS[name].prop]: v };
    }

    window.experiment = experiment;
    window.experimentProps = experimentProps;
})();
