import { buildLink } from '../site.js';

const EXAMPLE_PROMPT =
    'Build a one-page site for a two-person landscaping business in Portland. Sections: a hero with the business name and a "get a quote" button, services with rough price ranges, a gallery of past work, a short about section with a photo of the two of us, testimonials, service area, and a quote request form that captures name, address, phone, and what they need. Save form submissions to my Puter account. Warm and outdoorsy, easy to read on a phone, and fast.';

export default {
    slug: 'guides/how-to-build-a-website-with-ai',
    parent: 'guides',
    updated: '2026-08-15',
    priority: 0.7,
    changefreq: 'monthly',
    navLabel: 'How to build a website with AI',
    type: 'guide',
    readingTime: '8 min read',

    title: 'How to Build a Website With AI: A Full Walkthrough | Puter',
    description:
        'How to describe, refine, and publish a real website with an AI builder: structure, tone, your own copy and images, editing by clicking, and getting it live on a URL.',
    ogTagline: 'Describe it, refine it, publish it',

    hero: {
        eyebrow: 'Guide',
        h1: 'How to build a website with AI',
        lead:
            'One example carried the whole way through, from the first description to a published address. The parts that matter are describing structure well, giving the design a direction, and knowing when to stop typing and start pointing.',
    },

    sections: [
        {
            type: 'prose',
            id: 'gather',
            heading: 'Step 0: Gather what you already have',
            body: [
                'Five minutes here saves a lot of back and forth. Before you write anything, collect the things only you can supply: your actual copy or a rough draft of it, your logo, photos, brand colors if you have them, and your real contact details.',
                'You can attach all of it in the conversation. Images, a logo, a PDF, a CSV, or a text file of your copy get saved into the project and used by name, so the first version can contain your real content rather than placeholder text you then have to replace one paragraph at a time.',
                'If you do not have copy yet, that is fine. Say what each section should say in one line and let the first version write something you can edit. Reacting to a draft is much easier than writing from nothing.',
            ],
        },

        {
            type: 'prose',
            id: 'describe',
            heading: 'Step 1: Describe the site',
            body: [
                'Three things do most of the work: what the site is for, who it is for, and what sections it needs. Design adjectives matter, but far less than people expect, and they only land once the structure is right.',
                'The example, in full:',
            ],
            quote: EXAMPLE_PROMPT,
            after: [
                'The section list is the important part. Naming your sections gets you a site whose shape is right on the first try, which is the thing that is genuinely tedious to fix later. Two words of tone ("warm and outdoorsy") are worth more than a paragraph of styling instructions, because tone is easy to adjust and structure is not.',
                'The mention of a form that saves submissions is deliberate. Most site builders make forms an upsell or a third-party embed. Here it is a normal request, and getting it into the first version means you find out immediately whether it works.',
            ],
        },

        {
            type: 'prose',
            id: 'structure-first',
            heading: 'Step 2: Fix structure before appearance',
            body: [
                'When the first version appears, resist the urge to start adjusting colors. Check the skeleton first, because structural changes invalidate cosmetic ones.',
            ],
            list: [
                '**Are the sections right, and in the right order?** Reordering is one sentence and it changes what everything else needs to look like.',
                '**Is the most important action obvious?** For a business site that is usually one call to action, repeated at the top and the bottom, and nothing competing with it.',
                '**Does it read on a phone?** Narrow the preview. Most visitors will see this width, and a layout that only works wide needs to be fixed now, not last.',
                '**Is anything missing that a visitor would look for?** Hours, service area, prices, whether you come to them. Missing information is a worse problem than imperfect styling and much easier to overlook.',
            ],
        },

        {
            type: 'prose',
            id: 'appearance',
            heading: 'Step 3: Then the appearance',
            body: [
                'Once the structure holds, switch from writing to pointing. Arm the element picker, click the exact thing you mean, and describe the change: "this heading is too big on mobile", "this section needs more room above it", "these cards should be the same height".',
                'For pure adjustment work (spacing, size, color, weight) the direct style controls are faster than any sentence. Nudge the selected element until it looks right and apply. Those edits are stored in a stylesheet of your own, which later AI changes leave alone, so your fine-tuning does not get overwritten by the next feature request.',
                'Global changes are still better said than clicked. "Use a warmer off-white background throughout and tighten the line height on body text" is one instruction that touches the whole site consistently, which is exactly what you want for anything systemic.',
            ],
        },

        {
            type: 'prose',
            id: 'interactive',
            heading: 'Step 4: The parts that do something',
            body: [
                'A site stops being brochureware the moment it needs to remember something. That is normally where other builders ask you to pick a plan or wire up a third-party service. Here it is another sentence.',
            ],
            list: [
                '**Forms that keep submissions.** "Save quote requests to my Puter account and give me an admin page listing them with newest first." You get the data, not an email into a void.',
                '**Content you can edit without rebuilding.** "Let me edit the services and prices from an admin view, and have the public page read them from storage." Now updating a price does not require another conversation.',
                '**Members-only pages.** "Put the client area behind a sign-in button using Puter accounts." Real authentication, no user database to run.',
                '**AI on the page.** "Add a chat widget that answers questions using the FAQ content on this site." The page can call AI models directly without you holding an API key.',
            ],
        },

        {
            type: 'prose',
            id: 'seo',
            heading: 'Step 5: Ask for the search-engine basics',
            body: [
                'A generated site starts out well positioned for this, because it is static HTML: the content is in the first response, with no client-side rendering for a crawler to work around. What it will not do unprompted is the specific metadata work, so ask for it explicitly.',
                'One request covers most of it: "add a unique title and meta description to each page, a canonical link, Open Graph and Twitter card tags using the hero image, JSON-LD structured data for a local business including address and opening hours, a sitemap.xml, and a robots.txt". Add "and make sure every image has a descriptive alt attribute" if accessibility and image search matter to you, which for a business with photos of its work, it does.',
                'The one thing worth checking by hand afterwards: that your page titles read like something a person would click, not like a keyword list. That is a judgment call, and it is yours.',
            ],
        },

        {
            type: 'prose',
            id: 'publish',
            heading: 'Step 6: Publish',
            body: [
                'Publish puts the site at its own address on puter.site immediately. No hosting account, no DNS, no build to wait for. Before that, the draft link lets you show work in progress to a partner or a client without anything being public.',
                'If you need your own domain, download the project as a zip and point your domain at any static host, or put your domain in front of the published address using your DNS provider\'s redirect or proxy tools. The output is plain static files, so every hosting option stays open to you.',
            ],
        },

        {
            type: 'prose',
            id: 'maintenance',
            heading: 'Living with it afterwards',
            body: [
                'Sites change slowly, which is exactly why the "I will just make that edit myself" moment arrives eventually. When it does, you can: open the project, change the text, and be done. Ordinary HTML, no build step, no framework.',
                'For anything larger, come back and describe it. Version history means a change you dislike costs one click to undo, so there is no reason to be cautious about trying an idea on a site that is already live.',
            ],
        },

        {
            type: 'cta',
            heading: 'Build the example site',
            body: 'The landscaping business prompt from this guide, ready to edit into your own.',
            label: 'Open with this prompt',
            href: buildLink(EXAMPLE_PROMPT),
        },
    ],

    related: ['guides/how-to-build-an-app-with-ai', 'guides/how-to-write-a-build-prompt', 'ai-website-builder', 'what-to-build'],
};
