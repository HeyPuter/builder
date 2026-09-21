// The page registry. Order here is the order pages appear in the sitemap and in
// /llms.txt, so it should read as a sensible tour of the site.
//
// Adding a page is: write the content module, import it here, and add it to the
// array. Everything else (the static file, the canonical URL, the sitemap entry,
// the llms.txt line, the Open Graph card, the footer link if you add one to
// FOOTER_NAV in site.js) follows from that.
//
// Profession pages live under /for/ and are built by the verticalPage factory
// (src/content/verticals.js): shared skeleton, fully individual copy.

import aiAppBuilder from './ai-app-builder.js';
import aiWebsiteBuilder from './ai-website-builder.js';
import whatToBuild from './what-to-build.js';
import features from './features.js';
import vibeCoding from './vibe-coding.js';
import forHub from './for.js';
import forPersonalTrainers from './for-personal-trainers.js';
import forLawyers from './for-lawyers.js';
import forAccountants from './for-accountants.js';
import forRealEstateAgents from './for-real-estate-agents.js';
import forRestaurants from './for-restaurants.js';
import forPhotographers from './for-photographers.js';
import forTutors from './for-tutors.js';
import forTherapists from './for-therapists.js';
import forContractors from './for-contractors.js';
import forNonprofits from './for-nonprofits.js';
import forSalons from './for-salons.js';
import forMusicians from './for-musicians.js';
import forEventPlanners from './for-event-planners.js';
import guides from './guides.js';
import guideBuildAnApp from './guide-build-an-app.js';
import guideBuildAWebsite from './guide-build-a-website.js';
import guideBuildPrompt from './guide-build-prompt.js';

export const PAGES = [
    aiAppBuilder,
    aiWebsiteBuilder,
    whatToBuild,
    features,
    vibeCoding,
    forHub,
    forPersonalTrainers,
    forLawyers,
    forAccountants,
    forRealEstateAgents,
    forRestaurants,
    forPhotographers,
    forTutors,
    forTherapists,
    forContractors,
    forNonprofits,
    forSalons,
    forMusicians,
    forEventPlanners,
    guides,
    guideBuildAnApp,
    guideBuildAWebsite,
    guideBuildPrompt,
];

export const BY_SLUG = new Map(PAGES.map((p) => [p.slug, p]));

// Every profession page, in hub order. Exported for the hub's checks in
// test-seo.mjs.
export const VERTICALS = PAGES.filter((p) => p.parent === 'for');

export default PAGES;
