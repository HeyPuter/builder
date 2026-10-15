export default {
    slug: 'tax-preparation',
    name: 'Tax Preparation Service',
    category: 'Website',
    description: 'A tax office site with a line-by-line fee worksheet, a document checklist, deadline alerts and intro call booking.',
    updated: '2026-10-15',
    workers: [],
    suggestions: [
        { label: 'Use my firm\'s details', prompt: 'Replace the business name, address, phone, email, hours, team and fees with my firm\'s details. Ask me for anything you need.' },
        { label: 'Add a client portal', prompt: 'Add a client portal where clients sign in with Puter, upload their tax documents securely and see the status of their return.' },
        { label: 'Add a Spanish version', prompt: 'Add an English/Spanish language switch with a full Spanish translation of the page, including the fee worksheet and checklist.' },
        { label: 'Add a tax tips blog', prompt: 'Add a tax tips section with short articles on common questions, like quarterly payments for freelancers and what to do with an IRS letter.' },
        { label: 'Send deadline reminders', prompt: 'Add a sign-up for email reminders before each federal tax deadline, and save the sign-ups so I can see them.' },
    ],
    instructions: [
        'The page content is plain data at the top of app.js: BUSINESS (name, contact details, hours, form endpoint), DEADLINES, FEES, SITUATIONS, CHECKLIST, TEAM, REVIEWS and FAQ. Change content there instead of hard-coding it in the markup; elements marked data-biz are filled from BUSINESS. The <title> and meta description in index.html are not, so update them too when the business changes.',
        'The fee worksheet, the "Who we help" tabs (their "from" price is the total of their preset), the document checklist (groups appear while their `when` fee line is on the worksheet) and the booking request all read FEES, so keep fee ids in sync when adding or renaming lines.',
        'Checklist item ids remember the visitor\'s ticks on their device, so keep them stable when rewording an item.',
        'Booking requests are POSTed as JSON to BUSINESS.formEndpoint when set; otherwise the form opens an email draft to BUSINESS.email. Never ask visitors to send tax documents by email.',
        'Keep the notes that fee estimates are confirmed at the intro call, that nothing on the site is tax advice for a visitor\'s situation, and that the business is not affiliated with the IRS.',
    ].join('\n'),
    page: {
        title: 'Tax Preparation Service Website Template | Puter',
        description: 'A website for a tax preparer or small tax office, with a flat-fee worksheet, a document checklist, deadline alerts and booking. Copy it and make it yours.',
        ogTagline: 'Flat fees, line by line',
        features: [
            {
                title: 'A fee worksheet visitors can trust',
                body: 'Visitors tick what is on their return (a business, rentals, investments, unfiled years) and see the flat fee add up line by line, with a turnaround estimate. Prices are plain data you can change in seconds.',
            },
            {
                title: 'A document checklist built from their answers',
                body: 'The checklist shows only what each visitor needs to bring, remembers their ticks on their device and prints cleanly, so the first meeting starts with everything on the table.',
            },
            {
                title: 'Deadlines that keep themselves current',
                body: 'A ribbon at the top counts down to the next federal deadline, and the booking section lists the key dates ahead, moved to the next business day when they land on a weekend.',
            },
            {
                title: 'Situations, team, reviews and booking',
                body: 'Tabs for families, freelancers, business owners, landlords, retirees and late filers, preparer profiles with credentials, reviews, questions and an intro call request that carries the estimate.',
            },
        ],
        faq: [
            {
                q: 'Can I change the fees and services?',
                a: ['Yes. Every fee line, its price and what it adds to the turnaround is plain data. Ask the builder to change a price, add a service like amended returns, or remove one you do not offer, and the worksheet, tabs and checklist all follow.'],
            },
            {
                q: 'Where do booking requests go?',
                a: ['By default the form opens an email draft to your address with the request and the visitor\'s estimate filled in. If you use a form service, or want requests saved to your Puter account, ask the builder to connect it.'],
            },
            {
                q: 'Does it work for an accounting firm, not just tax prep?',
                a: ['Yes. Describe your services and the builder can add bookkeeping or payroll lines to the worksheet, new situations to the tabs and the matching documents to the checklist.'],
            },
        ],
    },
};
