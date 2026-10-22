export default {
    slug: 'bookkeeping-service',
    name: 'Bookkeeping Service',
    category: 'Website',
    description: 'A one-page site for a bookkeeping firm, with a live monthly quote builder, a sample month-end report and a free call booking form.',
    updated: '2026-10-15',
    workers: [],
    suggestions: [
        {
            label: 'Use my firm details',
            prompt: 'Replace the sample firm name, city, phone number, email, hours and bookkeepers with my own. Ask me for the details first.',
        },
        {
            label: 'Match my prices',
            prompt: 'Update the quote builder to my own prices: the monthly fee for each expense range, the per-account fee, each add-on and the catch-up rate. Ask me for the numbers.',
        },
        {
            label: 'Save call requests',
            prompt: 'Save every free call request, with its quote, to a private list only I can see, instead of opening an email.',
        },
        {
            label: 'Add a document upload',
            prompt: 'Add a page where clients sign in and upload their receipts and bank statements for their bookkeeper.',
        },
        {
            label: 'Add a resources page',
            prompt: 'Add a resources page with three short guides for small business owners: a month-end checklist, common deductible expenses, and getting ready for tax season.',
        },
    ],
    instructions: [
        '- The firm\'s details, services, prices, the sample books in the hero, the sample report, reviews, team and questions are plain data at the top of app.js. Change content there rather than in index.html, and keep each list\'s shape so the page keeps rendering from it.',
        '- PRICING is the only source of prices. The quote receipt, the booking summary and the email draft all read from it, and the "from" prices on the service cards should match it. Keep the monthly total, the yearly discount and the one-time catch-up fee as separate lines.',
        '- The hero is a sample bank reconciliation. Its statement and books totals are computed from HERO_LEDGER.rows, so change the rows, never the totals.',
        '- Call requests go to BUSINESS.formEndpoint when it is set, and otherwise open an email draft to BUSINESS.email. Never say a call is booked when only an email draft was opened.',
        '- Unless the user asks for a different look, keep the ledger pad style: pale green paper, forest green ink, red pencil only for tick marks, stamps and small notes, and totals on a double underline.',
    ].join('\n'),
    page: {
        title: 'Bookkeeping Service Website Template, Free to Copy and Edit',
        description: 'A bookkeeping firm website with a live monthly quote builder, a sample reconciliation and report, and a call booking form. Copy it and edit it by chat.',
        ogTagline: 'A bookkeeping firm site with a live quote builder',
        features: [
            {
                icon: 'receipt',
                title: 'A quote builder that prices as you go',
                body: 'Visitors pick their monthly expenses, accounts, add-ons and how far behind they are, and get an itemized monthly price, a one-time catch-up fee and the date their books will be current.',
            },
            {
                icon: 'check',
                title: 'A reconciliation that ticks itself off',
                body: 'The hero is a sample bank reconciliation: every line gets a red pencil tick, the unreconciled amount counts down to zero, and the month is stamped balanced.',
            },
            {
                icon: 'chart',
                title: 'A sample monthly report',
                body: 'Tabs for profit and loss, cash and taxes ahead, each with its totals and a plain-English note from the bookkeeper.',
            },
            {
                icon: 'calendar',
                title: 'The month at a glance',
                body: 'A 31-day strip shows when statements come in, when the books close and when the review call happens, and the top bar counts down to the next estimated tax date.',
            },
            {
                icon: 'users',
                title: 'Services, team, reviews and questions',
                body: 'Six service cards that preset the quote, a T-account of what a client hands over and gets back, three bookkeepers, three reviews and seven common questions.',
            },
            {
                icon: 'phone',
                title: 'A free call booking form',
                body: 'Name, business, best time to call and where the books stand today, with the quote attached. It posts to a form service of your choice or opens an email to the firm.',
            },
        ],
        faq: [
            {
                q: 'Can I change the prices?',
                a: ['Yes. Every price lives in one place, and the quote builder and booking summary follow it. Tell the builder your fees and it updates them.'],
            },
            {
                q: 'Where do call requests go?',
                a: ['By default the form opens an email to the firm with the request and quote filled in. Ask the builder to send requests to a form service instead, or to save them to a private list only you can see.'],
            },
            {
                q: 'Does it suit an accounting or tax practice?',
                a: ['Yes. Describe your services and the builder will rename the sections, change the quote options and rewrite the copy for a CPA firm, a tax preparer or a fractional CFO.'],
            },
        ],
    },
};
