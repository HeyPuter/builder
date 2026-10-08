// Product landing page: a complete static marketing site for a fictional
// product, with no backend. See src/templates/index.js for the shape.
export default {
    slug: 'landing-page',
    name: 'Product Landing Page',
    category: 'Website',
    description: 'A polished landing page with features, pricing, FAQ and a waitlist form.',
    updated: '2026-09-28',
    workers: [],

    suggestions: [
        { label: 'Make it about my product', prompt: 'Rewrite the whole page for my product. Here is what it does and who it is for: ' },
        { label: 'Save waitlist sign-ups', prompt: 'Make the waitlist form actually save the email addresses people submit, and give me a private page where I can see and export them.' },
        { label: 'Change the brand colors', prompt: 'Change the brand color across the page to a deep green, and update the logo icon to match.' },
        { label: 'Add testimonials', prompt: 'Add a testimonials section between pricing and the FAQ with three customer quotes, names and roles.' },
        { label: 'Add a dark mode', prompt: 'Add a dark mode that follows my system setting, with a toggle in the header that remembers my choice.' },
    ],

    page: {
        title: 'Free Product Landing Page Template, Ready to Edit With AI',
        description:
            'A finished product landing page with a hero, features, pricing tiers, FAQ and a waitlist form. Copy it to your account and reshape it by describing changes.',
        ogTagline: 'A finished landing page you can reshape',
        lead:
            'Hero, features, a three-tier pricing table, an FAQ and a waitlist form, already designed and responsive. Copy it into your account, then describe your own product and watch the page change to fit it.',
        features: [
            { icon: 'layout', title: 'Every section a launch needs', body: 'Navigation, hero, customer logos, a features grid, how it works, pricing, FAQ, a sign-up band and a footer.' },
            { icon: 'phone', title: 'Responsive from the start', body: 'The layout, menu and pricing cards adapt from a wide desktop down to a phone, with a mobile menu included.' },
            { icon: 'sliders', title: 'Monthly and yearly pricing', body: 'A billing toggle switches every plan between monthly and yearly prices, with the popular plan highlighted.' },
            { icon: 'pen', title: 'Content kept in one place', body: 'Features, plans and questions are plain lists at the top of the script, so changing copy never means hunting through markup.' },
        ],
        faq: [
            {
                q: 'Can I turn this into a page for my own product?',
                a: [
                    'Yes. That is what it is for. Describe your product, who it is for and what it costs, and the builder rewrites the copy, pricing and sections to match. Change the colors, fonts or layout the same way.',
                ],
            },
            {
                q: 'Does the waitlist form collect emails?',
                a: [
                    'Not yet. As copied, it checks the address and thanks the visitor, but stores nothing. Ask the builder to save sign-ups and it adds a small backend that keeps them in your account.',
                ],
            },
        ],
    },
};
