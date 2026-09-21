import { verticalPage } from '../verticals.js';

export default verticalPage({
    slug: 'accountants',
    navLabel: 'Accountants',

    title: 'App and Website Builder for Accountants | Puter',
    description:
        'Client document portals, deadline calendars, engagement trackers, and a practice site for accountants and bookkeepers. Describe it, get working software, free.',
    ogTagline: 'Practice tools that reconcile',

    eyebrow: 'For accountants',
    h1: 'You automate everyone\'s books. Automate your own office.',
    lead:
        'Chasing documents by email, tracking deadlines in a spreadsheet, re-explaining your fees every February. Describe the tool that would fix it, in plain English, and get a working app or a clean practice site you own by the end of a coffee.',

    demo: {
        prompt: 'Build a client document checklist tracker for tax season',
        app: {
            name: 'ledgerline.puter.site',
            header: 'Tax season',
            blocks: [
                {
                    kind: 'stats',
                    items: [
                        { value: '38', label: 'Returns in progress' },
                        { value: '11', label: 'Waiting on docs' },
                        { value: '6', label: 'Ready to file' },
                    ],
                },
                {
                    kind: 'list',
                    rows: [
                        { title: 'Okafor LLC', sub: 'Missing: bank statements', tag: 'Waiting' },
                        { title: 'J. & M. Silva', sub: 'All documents in', tag: 'Ready' },
                        { title: 'Brightside Cafe', sub: 'Missing: payroll summary', tag: 'Waiting' },
                    ],
                },
            ],
        },
    },

    useCasesHeading: 'What accountants and bookkeepers build here',
    useCasesIntro:
        'Every practice runs on the same three verbs: collect, track, remind. These are the tools that do it without another subscription.',
    useCases: [
        {
            icon: 'folder',
            title: 'A document collection portal',
            body:
                'Each client sees their own checklist of what you need and what has arrived. The February email chain titled "one more thing" quietly disappears.',
        },
        {
            icon: 'calendar',
            title: 'A filing deadline calendar',
            body:
                'Every client, every entity, every due date, with what is coming in the next 30 days on top. Built around the filing types your practice actually handles.',
        },
        {
            icon: 'briefcase',
            title: 'An engagement tracker',
            body:
                'Who is signed, who is mid-work, who is waiting on review, and what each engagement is worth. Your pipeline, visible at a glance instead of in your head.',
        },
        {
            icon: 'calculator',
            title: 'Calculators that bring in clients',
            body:
                'A quarterly estimated-tax or take-home-pay calculator on your site answers the question a prospect searched for, and your firm\'s name is at the top of the page.',
        },
        {
            icon: 'layout',
            title: 'A practice site that signals order',
            body:
                'Clients hire an accountant to bring order. A tidy, fast site with services, fixed-fee packages, and a clear intake form makes that promise before you say a word.',
        },
        {
            icon: 'check',
            title: 'Internal checklists that get followed',
            body:
                'Month-end close, onboarding, year-end: the steps your practice repeats, as a checklist app your whole team ticks through, with a record of who did what and when.',
        },
    ],

    splitHeading: 'A system you specify, not software you settle for',
    splits: [
        {
            title: 'Describe the workflow you already have',
            art: 'describe',
            body: [
                '"Clients upload documents against a checklist I set per client. I see everyone\'s status on one screen, sorted by who is blocking me." You have just written the specification.',
                'The builder turns it into a working app in the live preview next to the conversation, and you refine it the same way: in sentences.',
            ],
        },
        {
            title: 'Data that stays put, in an account you control',
            art: 'backend',
            body: [
                'Tools built here store their records in Puter\'s cloud under your account: client lists, statuses, checklists, saved between visits without you running a server.',
                'Where clients sign in, each one\'s data sits under their own account. You are not administering a database, and you are not emailing spreadsheets around.',
            ],
        },
        {
            title: 'Numbers you can audit, because you can read the code',
            art: 'files',
            body: [
                'A calculator on your site is a professional statement, so you should be able to check its work. Everything built here is plain files you can open and read: the formula is right there, not in a vendor\'s black box.',
                'Download the whole project as a zip whenever you like and host it under your own domain.',
            ],
        },
    ],

    promptsHeading: 'Prompts you can send as-is',
    prompts: [
        {
            title: 'Document checklist portal',
            body: 'Per-client checklists with a status dashboard for you.',
            prompt:
                'Build a document collection tracker for my accounting practice. I create clients and assign each a checklist of required documents (W-2s, 1099s, bank statements, receipts, custom items). I mark items as requested, received, or not applicable, add notes, and see a dashboard of all clients sorted by how many items are still missing. Save everything to my Puter account.',
        },
        {
            title: 'Filing deadline calendar',
            body: 'All entities and due dates, next 30 days on top.',
            prompt:
                'Build a filing deadline tracker for an accounting practice. I add clients with an entity type, then add filings per client with a form name, period, due date, and status (not started, in progress, filed). Show a dashboard of everything due in the next 30 days sorted by date, a monthly calendar view, and per-client history. Keep it saved to my Puter account.',
        },
        {
            title: 'Estimated tax calculator',
            body: 'A lead-generating calculator page for your site.',
            prompt:
                'Build a clean one-page quarterly estimated tax calculator for freelancers: they enter expected annual income, expenses, and filing status, and it shows estimated quarterly payments with the math explained step by step and a disclaimer that it is an estimate, not advice. Add a short section about my accounting practice with a contact form that saves inquiries.',
        },
        {
            title: 'Engagement pipeline',
            body: 'Proposals to signed to done, with values per stage.',
            prompt:
                'Build an engagement tracker for my bookkeeping practice. I add prospects and clients with a service type and monthly value, and move them through stages (Inquiry, Proposal sent, Signed, Onboarding, Active, Off-boarded) on a drag-and-drop board. Show total monthly value per stage and a notes timeline per client. Save everything to my Puter account.',
        },
    ],

    faqHeading: 'The questions accountants ask',
    faq: [
        {
            q: 'Is client financial data safe in a tool like this?',
            a: [
                'Data your tools store lives in Puter cloud storage under your account and is not public; publishing a page does not publish its data. Each signed-in client\'s records sit under their own account.',
                'Apply the same professional skepticism you would to any software vendor: read what was built, start with lower-sensitivity workflows like checklists and statuses, and move up as it earns trust.',
            ],
        },
        {
            q: 'Will a generated calculator get the math right?',
            a: [
                'The builder runs and verifies the app after every change, so mechanical errors are caught. The formulas themselves are in plain JavaScript you can open and check line by line, which is more auditability than most calculator widgets offer. For anything you publish under your name, review the math once yourself; you are the accountant.',
            ],
        },
        {
            q: 'Can my clients use a portal without new accounts everywhere?',
            a: [
                'Clients sign in with a free Puter account once, and that works across anything you build. For tools only your team touches, no client accounts are involved at all.',
            ],
        },
        {
            q: 'What does it cost against yet another practice subscription?',
            a: [
                'Nothing to build, publish, and use with a free Puter account: no per-seat fee and no tax-season surge pricing. The economics matter because these are exactly the tools that never justify a $70-per-month line item, which is why they stay spreadsheets.',
            ],
        },
    ],

    ctaHeading: 'Describe the tool your practice keeps improvising',
    ctaBody: 'One paragraph about how documents move through your office is enough to see it built.',

    related: ['for', 'for/lawyers', 'for/real-estate-agents', 'what-to-build'],
});
