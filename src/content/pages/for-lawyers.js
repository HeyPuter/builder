import { verticalPage } from '../verticals.js';

export default verticalPage({
    slug: 'lawyers',
    navLabel: 'Lawyers',

    title: 'App and Website Builder for Lawyers and Law Firms | Puter',
    description:
        'A firm website, client intake, deadline tracking, and small office tools for a solo practice or small firm. Described in plain English, built and published free.',
    ogTagline: 'Practice tools, minus the agency',

    eyebrow: 'For lawyers',
    h1: 'A firm website and office tools, without the agency retainer',
    lead:
        'Most legal software is priced for firms with an IT budget, and most firm websites are a five-figure agency project. Describe what your practice needs in plain English and get working software you own: an intake flow, a matter tracker, a clean site that brings in clients.',

    demo: {
        prompt: 'Build an intake form and matter tracker for my family law practice',
        app: {
            name: 'harborlaw.puter.site',
            header: 'Matters',
            blocks: [
                {
                    kind: 'stats',
                    items: [
                        { value: '12', label: 'Open matters' },
                        { value: '4', label: 'Filings due' },
                        { value: '9', label: 'New inquiries' },
                    ],
                },
                {
                    kind: 'list',
                    rows: [
                        { title: 'Alvarez custody', sub: 'Discovery · due Fri', tag: 'Active' },
                        { title: 'Estate of Byrne', sub: 'Probate · drafting', tag: 'Active' },
                        { title: 'Chen consult', sub: 'Intake · Fri 14:00', tag: 'New' },
                    ],
                },
            ],
        },
    },

    useCasesHeading: 'What a small practice builds here',
    useCasesIntro:
        'The tools below are the ones solo and small-firm lawyers keep half-building in spreadsheets. Each one is generated from a description of how your practice actually runs.',
    useCases: [
        {
            icon: 'layout',
            title: 'A firm site that wins the first call',
            body:
                'Practice areas in plain language, your background, and one obvious way to reach you. Prospective clients decide in minutes; the site\'s job is to make that decision easy.',
        },
        {
            icon: 'pen',
            title: 'Client intake that arrives structured',
            body:
                'A form that asks exactly what you need for a conflicts check and a first consult, and lands in a list you can review, instead of a voicemail you have to transcribe.',
        },
        {
            icon: 'calendar',
            title: 'A deadline docket',
            body:
                'Matters, their key dates, and what is due this week, sorted so nothing statute-shaped sneaks up on you. Built around your practice areas and your terminology.',
        },
        {
            icon: 'clock',
            title: 'A time and billing log',
            body:
                'Start a timer or enter time in six-minute increments, tag it to a matter, and export a month of entries when it is time to bill. Small, fast, and exactly yours.',
        },
        {
            icon: 'folder',
            title: 'A document checklist per client',
            body:
                'Every matter type has its list: what you need from the client, what has arrived, what is still missing. Clients see their own checklist instead of calling to ask.',
        },
        {
            icon: 'book',
            title: 'Plain-language explainers',
            body:
                'A page that answers the ten questions every client asks in the first meeting. It saves an hour per consult and quietly ranks for the searches clients actually make.',
        },
    ],

    splitHeading: 'Built the way you would brief a junior',
    splits: [
        {
            title: 'Say what the tool must do, not how to build it',
            art: 'describe',
            body: [
                '"Intake form for family law: names, opposing party for the conflicts check, a short summary, how they found me. New submissions appear in a list only I can see." That is a complete spec here.',
                'The builder writes the files and runs the result next to the conversation, so you review a working tool, not a proposal.',
            ],
        },
        {
            title: 'Checked after every change',
            art: 'verify',
            body: [
                'After each revision the app is reloaded and watched for errors, and anything that breaks is fixed before the turn is called done. You still review the substance, the way you would any junior\'s work, but the mechanical failures are caught for you.',
                'Every version is snapshotted. If a change made things worse, restore the previous one and take a different run at it.',
            ],
        },
        {
            title: 'Your files, your call',
            art: 'files',
            body: [
                'Everything generated is ordinary HTML, CSS, and JavaScript you can read, download as a zip, and hand to your IT person or host under your own domain.',
                'Nothing about your practice gets locked inside a vendor\'s proprietary format. That clause matters to you professionally; it is honored here.',
            ],
        },
    ],

    promptsHeading: 'Start from a working prompt',
    prompts: [
        {
            title: 'Firm website',
            body: 'Practice areas, your background, and a consult request form.',
            prompt:
                'Build a website for my solo law practice. Sections: a clear statement of who I help and with what, three practice areas each explained in plain language, my background and bar admissions, answers to five common client questions, and a consultation request form that saves submissions for me to review. Professional, calm design, no stock-photo clichés.',
        },
        {
            title: 'Intake and conflicts list',
            body: 'Structured intake submissions with a private review queue.',
            prompt:
                'Build a client intake tool for my law practice. The public page is a form: full name, contact details, opposing party name for a conflicts check, matter type from a list I define, and a short description. Submissions save to a private dashboard where I sign in, see new inquiries, search past ones by any name, and mark each as consult booked, declined, or retained.',
        },
        {
            title: 'Deadline docket',
            body: 'Matters and dates, with this week front and center.',
            prompt:
                'Build a deadline tracker for a small law office. I add matters with a client name, matter type, and court, then add deadlines to each with a date, a description, and a lead-time reminder window. Show a dashboard of everything due in the next 14 days sorted by date and highlighted by urgency, plus a per-matter view. Save it all to my Puter account.',
        },
        {
            title: 'Time and billing log',
            body: 'Timers, six-minute increments, and a monthly export.',
            prompt:
                'Build a time tracking tool for my law practice. I add matters, then log time against them with a running timer or manual entry rounded to six-minute increments, each entry with a description and a billable flag. Show totals per matter and per month, and export any month as CSV for invoicing. Keep everything in my Puter account.',
        },
    ],

    faqHeading: 'Questions lawyers ask first',
    faq: [
        {
            q: 'Where does client information entered into these tools live?',
            a: [
                'In your Puter account\'s storage, under your login, not on a public server you have to administer. Drafts are private until you publish, and publishing a page does not expose the data your tools store.',
                'Professional judgment still applies: this is general-purpose software, not a legal-specific compliance product. Review what you build, the way you would any system a vendor handed you, before moving privileged material into it.',
            ],
        },
        {
            q: 'I bill in six-minute increments. Do I have time to learn a builder?',
            a: [
                'The learning curve is one sentence long: describe the tool. A working intake form or docket typically exists within minutes, and refining it is a conversation, not a course. Lawyers are professionally good at precise instructions, which is the entire skill involved.',
            ],
        },
        {
            q: 'Can my paralegal and I both use the same tool?',
            a: [
                'Yes. Tools can be built with shared data so the people you choose see the same matter list, or they can be single-user. Say which you want in the description and the builder sets it up accordingly.',
            ],
        },
        {
            q: 'What does it cost a small firm?',
            a: [
                'Building and publishing are free with a Puter account, with no card required. There is no per-seat license and no annual contract, which is a sentence rarely true of anything else on a law office\'s software list.',
            ],
        },
        {
            q: 'Can I put the site on my firm\'s domain?',
            a: [
                'Publishing gives you a puter.site address instantly. For your own domain, download the site as a zip; it is standard static files that any host, including the one your domain already sits on, can serve as-is.',
            ],
        },
    ],

    ctaHeading: 'Describe what your practice needs',
    ctaBody: 'The intake form you have been meaning to fix is one plain-English paragraph away.',

    related: ['for', 'for/accountants', 'for/real-estate-agents', 'what-to-build'],
});
