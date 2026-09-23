import { buildLink, LINKS } from '../site.js';

export default {
    slug: 'ai-form-builder',
    parent: 'use-cases',
    updated: '2026-09-23',
    priority: 0.9,
    changefreq: 'weekly',
    navLabel: 'AI form builder',

    title: 'AI Form Builder - Free forms, surveys, and quizzes with AI',
    description:
        'Build a form with AI, no coding required. Describe it, get a working form that saves every submission to your Puter account, and publish it for free.',
    ogTagline: 'Describe the form. Collect the responses.',

    hero: {
        eyebrow: 'AI form builder',
        h1: 'AI form builder that collects real responses',
        lead:
            'Build a form with AI without writing a line of code. Puter AI Builder turns your description into a working form, with submissions saved to your account and a private view to read them.',
        cta: { label: 'Start building', href: '/' },
        secondary: { label: 'How to write a build prompt', href: '/guides/how-to-write-a-build-prompt/' },
        note: 'Free with a [Puter](' + LINKS.puter + ') account. Runs in any modern browser, including on a phone.',
        demo: {
            prompt: 'Build a client intake form for my studio with a private page where I can read every submission',
            app: {
                name: 'intake.puter.site',
                header: 'Submissions',
                blocks: [
                    {
                        kind: 'stats',
                        items: [
                            { value: '23', label: 'This week' },
                            { value: '91%', label: 'Completed' },
                            { value: '4', label: 'Unread' },
                        ],
                    },
                    {
                        kind: 'list',
                        rows: [
                            { title: 'Maya Chen', sub: 'Brand refresh · Tue 09:14', tag: 'New' },
                            { title: 'Tom Okafor', sub: 'Product photos · Mon 16:40', tag: 'Read' },
                            { title: 'Lena Ruiz', sub: 'Event coverage · Mon 11:02', tag: 'Replied' },
                        ],
                    },
                ],
            },
        },
    },

    sections: [
        {
            type: 'grid',
            id: 'what-you-get',
            heading: 'What you get',
            intro:
                'Everything you need to go from a description to a form that is live and collecting responses.',
            items: [
                {
                    icon: 'wand',
                    title: 'Writes the form from a description',
                    body:
                        'Say what the form is for and Puter AI Builder writes the fields, labels, validation, error messages, and thank-you state, with multi-step layouts and conditional questions when you ask for them.',
                },
                {
                    icon: 'database',
                    title: 'Submissions saved, nothing to set up',
                    body:
                        'Every response is stored in your [Puter](' + LINKS.puter + ') account the moment it is sent. No spreadsheet to connect, no database to create, and no third-party form service holding your data.',
                },
                {
                    icon: 'shieldCheck',
                    title: 'Checks and fixes its own work',
                    body:
                        'After every change the builder runs the form and watches for errors. If a field breaks or a submit fails, it reads the file, fixes the cause, and verifies again before handing it back to you.',
                },
                {
                    icon: 'cursor',
                    title: 'Point at the field you want changed',
                    body:
                        'Click any field, label, or button in the live preview and say what to do with it. Precise edits to the exact question you mean, without describing where it is.',
                },
                {
                    icon: 'globe',
                    title: 'Publish in one click, free hosting included',
                    body:
                        'Your form goes live at its own link the moment you want it, ready to share anywhere a link goes. Change it later and the update is live instantly.',
                },
                {
                    icon: 'users',
                    title: 'No per-response pricing',
                    body:
                        'Hosting is included, and there is no plan that meters your forms or your responses. Anything visitors use, like sign-in or AI features, is covered by their own [Puter](' + LINKS.puter + ') account. [How it works](' + LINKS.userPays + ').',
                },
            ],
        },

        {
            type: 'split',
            id: 'last-mile',
            heading: 'A form that collects, not just a form that looks right',
            intro:
                'Most form generators stop at the layout and leave the response handling to someone else. These three things are why the form you get here actually works end to end.',
            items: [
                {
                    title: 'Responses land in your account',
                    art: 'backend',
                    body: [
                        'Submissions are saved to storage you own on [Puter](' + LINKS.puter + '), and the builder makes a private admin view alongside the form where you can read, search, and export them as CSV.',
                        'For a public form that anyone can fill in without signing in, Puter AI Builder can deploy a serverless worker from the same conversation to collect the responses, so shared collection works without a server of your own.',
                    ],
                },
                {
                    title: 'Errors get fixed before you see them',
                    art: 'verify',
                    body: [
                        'Every change is run and checked before it comes back to you. If validation breaks or a submit stops saving, Puter AI Builder fixes it and checks again.',
                        'You spend your time on what the form should ask, not on why the submit button stopped working.',
                    ],
                },
                {
                    title: 'Change exactly what you mean',
                    art: 'picker',
                    body: [
                        'Click a field in the live preview and say what you want changed: make it required, turn it into a dropdown, move it to step two. No describing where things are.',
                        'Every change is saved as a version, so if a rewrite makes the form worse, go back to the previous one in a click and try again.',
                    ],
                },
            ],
        },

        {
            type: 'steps',
            id: 'how-to',
            heading: 'How to build a form with AI',
            intro: 'Four steps from a description to a form that is collecting responses.',
            schema: {
                name: 'How to build a form with AI',
                description:
                    'Build and publish a working online form that saves submissions from a plain-English description using the AI form builder at builder.puter.com.',
            },
            items: [
                {
                    title: 'Describe the form',
                    body:
                        'Say what it is for, who fills it in, and the questions you know you need. Mention anything special: required fields, file uploads, multiple steps, a thank-you message. The more specific you are, the closer the first version will be.',
                },
                {
                    title: 'Watch it build',
                    body:
                        'Puter AI Builder writes the form, wires up saving to your account, runs it, and checks that a submission goes through. A first version is usually ready in a couple of minutes.',
                },
                {
                    title: 'Refine by talking, or by pointing',
                    body:
                        'Ask for the next change in plain language, or click any field in the preview and say what should be different. Every version is saved, so you can always go back.',
                },
                {
                    title: 'Publish and share the link',
                    body:
                        'Press Publish to get a public link. Responses show up in your private admin view as they arrive, and you can export the form itself whenever you like.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'starters',
            heading: 'Not sure where to start? Try one of these',
            intro:
                'Pick one and Puter AI Builder makes it for you. Then make it yours by describing what to change.',
            items: [
                {
                    title: 'Contact form',
                    body: 'Name, email, message, and an inbox you can actually read.',
                    prompt:
                        'Build a contact form with name, email, subject, and message fields, inline validation, and a friendly thank-you state after sending. Save every submission to my Puter account and give me a private inbox page where I can read messages, mark them as handled, and export everything as CSV.',
                },
                {
                    title: 'Client intake form',
                    body: 'A multi-step questionnaire for new clients, with a file upload.',
                    prompt:
                        'Build a three-step client intake form for a design studio: contact details, then project goals and budget range, then a file upload for a brief or reference images. Show a progress bar, validate each step before moving on, save submissions and uploaded files to my Puter account, and give me an admin page to review each client.',
                },
                {
                    title: 'Event registration',
                    body: 'Ticket types, dietary needs, and a live headcount.',
                    prompt:
                        'Build an event registration form with name, email, ticket type (general, student, speaker), dietary requirements, and a plus-one option that reveals extra fields when checked. Save registrations to my Puter account and add a private dashboard showing total headcount, a breakdown by ticket type, and a CSV export.',
                },
                {
                    title: 'Customer feedback survey',
                    body: 'Ratings, open answers, and a results page with charts.',
                    prompt:
                        'Build a customer feedback survey with a 1 to 5 star rating for three areas, a net promoter score question, and two open text answers. Save responses to my Puter account and create a private results page with average scores per area, a bar chart of the NPS distribution, and a button that uses AI to summarize the open answers into themes.',
                },
                {
                    title: 'Quiz with scoring',
                    body: 'Multiple choice, instant results, and a leaderboard.',
                    prompt:
                        'Build a ten-question multiple-choice quiz about world geography with one question per screen, instant feedback after each answer, a final score with a shareable result, and a leaderboard. Save each attempt to my Puter account so the leaderboard persists, and let me edit the questions from a private admin page.',
                },
                {
                    title: 'Job application form',
                    body: 'Resume upload, screening questions, and a review board.',
                    prompt:
                        'Build a job application form with contact details, a resume upload, a portfolio link, three short screening questions, and a consent checkbox. Save applications and resumes to my Puter account and give me a private review board where I can move applicants between New, Shortlisted, and Rejected columns and add notes.',
                },
            ],
        },

        {
            type: 'grid',
            id: 'beyond-the-form',
            columns: 2,
            heading: 'More than a form',
            intro:
                'A form built here is a small app, so it can do anything an app can do. Everything it uses runs on [Puter](' + LINKS.puter + '), with the backend already there.',
            items: [
                {
                    icon: 'sliders',
                    title: 'Logic, files, and multiple steps',
                    body:
                        'Conditional questions that appear based on earlier answers, running totals and calculated fields, file uploads that are stored with the response, multi-page flows with a progress bar, and per-field validation. Ask for it in plain language and it is written into the form.',
                },
                {
                    icon: 'chart',
                    title: 'Read responses your way',
                    body:
                        'The private admin view is built to your description: a table with search and filters, a card per response, a chart of results, a CSV export button. Because the form can use AI models through Puter, it can also summarize open answers or tag responses for you, with no API keys to manage.',
                },
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'AI form builder FAQ',
            items: [
                {
                    q: 'What is an AI form builder?',
                    a: [
                        'An AI form builder turns a plain-language description into a working online form. You say what the form is for and what it needs to ask, and the AI writes the questions, the field types, the validation, and the design, then shows you the result so you can try it right away.',
                        'You don\'t need to know how to code. With Puter AI Builder you refine the form the same way you started, by asking for changes or clicking the field you want changed, and the form saves its submissions to your account from the first version. Hosting and storage are included, so there is nothing to connect or maintain yourself.',
                        'Compared with a traditional form service, the difference is what you end up with: a normal set of web files you own, rather than a form living inside someone else\'s dashboard on a plan that meters your responses.',
                    ],
                },
                {
                    q: 'How do I create a form with AI?',
                    a: [
                        'Describe the form in a sentence or two, watch Puter AI Builder write and run it in the live preview, make it yours by asking for changes or pointing at the field that should be different, then press Publish to get a link. The four steps above walk through each one.',
                        'If you already have the questions, paste them into the chat, or attach the PDF or document they live in, and ask for them to be turned into a form.',
                    ],
                },
                {
                    q: 'What types of forms can I build?',
                    a: [
                        'Contact forms, sign-up and waitlist forms, registration forms, intake questionnaires, order and booking requests, surveys, feedback forms, quizzes with scoring, applications with file uploads, and internal forms for a team. Anything that asks questions and needs the answers kept is a natural fit.',
                        'Because the form is a small app rather than a widget, it can also be the front door to something bigger: an intake form that feeds a client list, a survey with a results dashboard, a quiz with a persistent leaderboard, or an application form with a review board. If you want to build on the data you collect, you can do it in the same project.',
                    ],
                },
                {
                    q: 'Where do the submissions go, and how do I see responses?',
                    a: [
                        'Submissions are saved to your [Puter](' + LINKS.puter + ') account, in storage you own. Alongside the form, Puter AI Builder builds a private admin view where you can read responses, search and filter them, and export them as CSV. Describe the view you want and it is built that way.',
                        'For a public form that anyone can fill in without an account, the builder can deploy a serverless worker from the same conversation to collect the responses. There is no separate form-service dashboard to log into: the admin view is part of the project and lives at a private link.',
                    ],
                },
                {
                    q: 'Is Puter AI Builder free to use?',
                    a: [
                        'Yes. Building and publishing are free with a [Puter](' + LINKS.puter + ') account, and no card is required. Open Puter AI Builder, describe a form, and try it in the preview right away. Nothing is public until you decide to publish.',
                        'There is no per-form or per-response plan. Very heavy use can hit the free tier\'s storage limits, at which point you can upgrade your Puter account; ordinary forms, surveys, and response volumes do not.',
                    ],
                },
                {
                    q: 'How much does it cost to run a form?',
                    a: [
                        'Nothing to keep it online. Hosting is included, and anything visitors use, like sign-in or AI features, is covered by their own [Puter](' + LINKS.puter + ') account. If a form takes off, you don\'t get a surprise bill. [How it works](' + LINKS.userPays + ').',
                    ],
                },
                {
                    q: 'Can I customize the design and branding?',
                    a: [
                        'Yes, all of it. Describe the look you want, attach your logo, and the form is designed that way from the start. Afterwards, click any element in the preview and say what should be different, or adjust spacing, colors, and type directly on it. There is no theme underneath limiting what can change, and no plan tier that unlocks removing someone else\'s branding.',
                    ],
                },
                {
                    q: 'Can I add conditional logic, calculations, and multi-page forms?',
                    a: [
                        'Yes. Ask for questions that appear only after a particular answer, fields that calculate a total, steps with a progress bar, or a summary page before submitting, and it is written into the form. If a rule turns out wrong, say so in a sentence or click the field and describe the fix.',
                    ],
                },
                {
                    q: 'Can I create a quiz or survey with AI?',
                    a: [
                        'Yes. A quiz can score answers, show feedback per question, and keep a leaderboard. A survey can use ratings, scales, and open answers, and come with a results page that charts the responses. Because the form can use AI models through Puter, it can also summarize open answers into themes for you.',
                    ],
                },
                {
                    q: 'Will my form work on phones?',
                    a: [
                        'Yes. Forms are written responsively by default, and you can resize the preview to check them at any width. If a step reads badly on a small screen, say so and it gets fixed for that width specifically.',
                    ],
                },
                {
                    q: 'Can I accept payments in my form?',
                    a: [
                        'Puter AI Builder does not process payments and has no native payment field. The usual approach is to collect the order or booking details in the form and then send people to a payment provider you already use, such as a checkout page or a payment link. The form handles everything around it: the questions, the confirmation, and the record of who asked for what.',
                    ],
                },
                {
                    q: 'Are AI-generated forms accurate enough, and what happens when the AI gets it wrong?',
                    a: [
                        'The first version is a strong draft rather than a finished product, and the fastest way to treat it is as one. Read through the questions, fill the form in yourself in the preview, and check that a submission shows up in the admin view.',
                        'Most runtime errors are caught before you see them: Puter AI Builder reloads the preview after each change, watches for errors, and sends them back to the AI to fix and re-verify. For everything else, tell it what is wrong in one sentence, or click the field and describe the fix. If a change made things worse overall, version history lets you restore an earlier snapshot and take a different run at it.',
                    ],
                },
                {
                    q: 'Is my data safe? Is it HIPAA compliant?',
                    a: [
                        'Published forms are served over HTTPS, and submissions are stored under your own [Puter](' + LINKS.puter + ') account rather than in a third-party form service. There is no server of your own to patch or keep updated.',
                        'Puter AI Builder does not claim HIPAA compliance or any other regulatory certification, and code you did not write is still code you are responsible for. For health information, financial details, or other sensitive personal data, review what was built and treat the AI as a fast first draft rather than a compliance review.',
                    ],
                },
                {
                    q: 'Do I own the form? Can I put it on my own site or domain?',
                    a: [
                        'Yes. The form, the design, and every response are yours. There is no license to renew and no export wall. Keep it on [Puter](' + LINKS.puter + ') or take it somewhere else at any time.',
                        'The project is a normal set of HTML, CSS, and JavaScript files with no build step, so you can download it as a zip and host it wherever your domain points. To keep it on Puter under your own domain, put your domain in front of the published link with your DNS provider\'s redirect or proxy tools.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Turn your questions into a working form',
            body: 'Build it with AI, no coding required. Free to start, hosting and response storage included.',
            label: 'Start building',
            href: buildLink(''),
        },
    ],

    related: ['use-cases', 'ai-app-builder', 'ai-website-builder', 'guides/how-to-write-a-build-prompt'],
};
