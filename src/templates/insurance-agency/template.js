export default {
    slug: 'insurance-agency',
    name: 'Insurance Agency',
    category: 'Website',
    description: 'An independent insurance agency site with a coverage checkup, claim guides and a quote request form.',
    updated: '2026-10-15',
    workers: [],
    suggestions: [
        {
            label: 'Use my agency details',
            prompt: 'Replace Harlow & Finch with my agency. Ask me for our name, phone and claims numbers, address, hours, licensed states, license number and the carriers we represent, then update the whole site.',
        },
        {
            label: 'Save quote requests',
            prompt: 'Save every quote request so I can follow up: add a small backend that stores each request, and a private page where I can review them and mark them as contacted.',
        },
        {
            label: 'Add a life insurance page',
            prompt: 'Add a term life insurance page with a simple needs calculator (income, debts, years until the kids are grown) and link to it from the Term life coverage card.',
        },
        {
            label: 'Add a Spanish version',
            prompt: 'Add a Spanish version of the site with a language switch in the header. Keep the layout, the coverage checkup and the quote form working in both languages.',
        },
        {
            label: 'Match my brand',
            prompt: 'Restyle the site in my brand. Ask me for my logo and colors, then update the color palette, the logo mark in the header and footer, and the app icon to match.',
        },
    ],
    instructions: [
        '- The page renders from the data at the top of app.js (AGENCY, CARRIERS, COVERAGES, STARTER, CHECKUP, RULES, CLAIM_GUIDES, AGENTS, REVIEWS, FAQ). Change content there rather than hard-coding it into index.html, and keep the static fallback text in index.html in step with AGENCY.',
        '- Every STARTER id and every RULES `cover` must be a COVERAGES id (or `cover: null` with its own name and icon).',
        '- The agency, carriers, agents, reviews, phone numbers (555-01xx), license number and stats are placeholders. Replace them with the user\'s own; never invent real carrier names, ratings, license numbers, prices or savings the user did not give.',
        '- Keep insurance copy plain and careful: no promises of coverage, prices or claim outcomes. Keep the footer disclaimer and the note under the checkup results.',
        '- Quote requests open the visitor\'s email app unless AGENCY.quoteEndpoint is set, in which case they are POSTed there as JSON. Keep the per-step validation.',
        '- Icons are Lucide names (kebab-case) loaded from jsDelivr. After inserting markup with new icons, call refreshIcons().',
        '- Colors and fonts are CSS custom properties in :root of styles.css; restyle through them.',
    ].join('\n'),
    page: {
        title: 'Insurance agency website template with a quote form',
        description: 'A free insurance agency website template: coverage cards, a two-minute coverage checkup, claim guides, agent profiles and a three-step quote request form.',
        ogTagline: 'Coverage checkup, claims help and quotes',
        features: [
            {
                icon: 'shieldCheck',
                title: 'Coverage cards for people and businesses',
                body: 'Home, auto, life, umbrella and more, with a switch to business lines. Each card says what it covers and who needs it, and adds itself to the quote.',
            },
            {
                icon: 'check',
                title: 'A two-minute coverage checkup',
                body: 'Six questions about home, cars, family and work turn into a list of essential and worth-a-look coverage, each with a plain-language reason.',
            },
            {
                icon: 'file',
                title: 'A three-step quote request',
                body: 'Coverage, a few details and the best way to reach the visitor. It goes to your inbox through their email app, or to a form endpoint you choose.',
            },
            {
                icon: 'phone',
                title: 'Claims help that works at 2 a.m.',
                body: 'A 24/7 claims line and step-by-step checklists for a car accident, a water leak, storm damage or a break-in.',
            },
            {
                icon: 'users',
                title: 'Agents with direct lines',
                body: 'Profiles with specialties, languages and a call button, plus a way to ask for a specific agent on the quote.',
            },
            {
                icon: 'clock',
                title: 'Hours that know when you are open',
                body: 'The header shows open or closed in your own time zone, and the contact block highlights today\'s hours.',
            },
        ],
        faq: [
            {
                q: 'Can I list the insurance companies my agency represents?',
                a: ['Yes. The carrier strip, the comparison graphic and the coverage cards all come from short lists at the top of the code. Ask the builder to swap in your carriers and lines of business.'],
            },
            {
                q: 'Where do quote requests go?',
                a: ['Out of the box, a finished request opens in the visitor\'s email app, addressed to your agency and already written. You can point it at a form service instead, or ask the builder to save requests to a private page.'],
            },
            {
                q: 'Can I change the coverage checkup questions?',
                a: ['Yes. The questions and the rules that turn answers into recommendations are plain data. Describe what you want to ask, and what each answer should recommend, and the builder updates both.'],
            },
        ],
    },
};
