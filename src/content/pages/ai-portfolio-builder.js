import { buildLink, LINKS } from '../site.js';

export default {
    slug: 'ai-portfolio-builder',
    parent: 'use-cases',
    updated: '2026-09-23',
    priority: 0.9,
    changefreq: 'weekly',
    navLabel: 'AI portfolio builder',

    title: 'AI Portfolio Builder - Create a portfolio website free with AI',
    description:
        'Build a portfolio website with AI from your resume, images, and copy. Galleries, case studies, and a contact form that saves messages. Free to publish.',
    ogTagline: 'Your work, on a site of its own',

    hero: {
        eyebrow: 'AI portfolio builder',
        h1: 'AI portfolio builder that turns your work into a live site',
        lead:
            'Describe what you do, attach your work, and Puter AI Builder designs a portfolio website around it: galleries, case studies, an about page, and a contact form that reaches you. Published in minutes, free.',
        cta: { label: 'Start building', href: '/' },
        secondary: { label: 'Built for photographers', href: '/for/photographers/' },
        note: 'Free with a [Puter](' + LINKS.puter + ') account. Runs in any modern browser, including on a phone.',
        demo: {
            prompt: 'Build a portfolio for my product design work with case studies and a contact form',
            app: {
                name: 'linokafor.puter.site',
                header: 'Lin Okafor, Product Designer',
                blocks: [
                    {
                        kind: 'stats',
                        items: [
                            { value: '12', label: 'Projects shown' },
                            { value: '4', label: 'Case studies' },
                            { value: '3', label: 'New messages' },
                        ],
                    },
                    {
                        kind: 'list',
                        rows: [
                            { title: 'Rebanking onboarding', sub: 'Case study · Fintech', tag: 'Featured' },
                            { title: 'Atlas design system', sub: 'Case study · B2B SaaS', tag: '2026' },
                            { title: 'Nightjar mobile app', sub: 'Case study · Consumer', tag: 'Shipped' },
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
                'Everything a portfolio needs to get you hired, with nothing to install and nothing to configure.',
            items: [
                {
                    icon: 'wand',
                    title: 'A design built around your work',
                    body:
                        'There is no template underneath. Say what you make and the mood you want, from quiet and editorial to bold and dark, and Puter AI Builder lays out the galleries, case-study pages, about page, and navigation to suit it.',
                },
                {
                    icon: 'folder',
                    title: 'Starts from what you already have',
                    body:
                        'Attach your images, logo, PDFs, and a resume or CV, or paste your bio and project descriptions into the chat. They are saved into the project and used as the source material for the site.',
                },
                {
                    icon: 'mail',
                    title: 'A contact form that reaches you',
                    body:
                        'Messages from the contact form are stored in your own [Puter](' + LINKS.puter + ') account, so an inquiry from a recruiter or client is yours to read, with no form service to sign up for.',
                },
                {
                    icon: 'cursor',
                    title: 'Point at the detail you want changed',
                    body:
                        'Click a thumbnail, a heading, or a caption in the live preview and say what should be different. Adjust spacing, color, and type on the spot, and those tweaks survive later changes.',
                },
                {
                    icon: 'shieldCheck',
                    title: 'Checks its own work before you see it',
                    body:
                        'After every change the site is reloaded and watched for errors. A broken gallery or a filter that stops working is fixed and re-verified before the turn is handed back to you.',
                },
                {
                    icon: 'globe',
                    title: 'Live in one click, hosted for free',
                    body:
                        'Publish puts your portfolio on its own address, served over HTTPS, ready to paste into an application or a bio. Hosting is included, and visitors do not need an account to see it. [How the free model works](' + LINKS.userPays + ').',
                },
            ],
        },

        {
            type: 'split',
            id: 'your-work',
            heading: 'Made from your work, not from a template',
            intro:
                'Portfolio builders usually hand you a layout and ask you to pour your work into it. This one starts the other way round.',
            items: [
                {
                    title: 'Your files are the brief',
                    art: 'files',
                    body: [
                        'Drop in the project images, your logo, a PDF case study, and your resume. Puter AI Builder reads what it needs and writes the pages from it: project titles, descriptions, an about page in your voice, and the right skills in the right order.',
                        'It is a first draft of you rather than the final word, so read the copy before you share it. Changing a line is a sentence in the chat.',
                    ],
                },
                {
                    title: 'Inquiries land in your account',
                    art: 'backend',
                    body: [
                        'A portfolio exists to start conversations, so the contact form is not decorative. Submissions are saved to your own [Puter](' + LINKS.puter + ') account and you can ask for a simple private inbox page to read them.',
                        'The same backend is there if you want more later: a sign-in-only client area, a private page for work under NDA, or an AI feature on the page. Nothing to set up, and anything a visitor uses is covered by their own account.',
                    ],
                },
                {
                    title: 'Try a bolder look, keep the one that lands',
                    art: 'history',
                    body: [
                        'Every change is saved as a version. Ask for a full-bleed gallery, a dark theme, or a completely different typeface, and if you liked the previous one better, restore it in a click.',
                        'Duplicate the project to keep a second variation alongside the first, each with its own preview and its own link.',
                    ],
                },
            ],
        },

        {
            type: 'steps',
            id: 'how-to',
            heading: 'How to build a portfolio with AI',
            intro: 'Four steps from a folder of work to a link you can send.',
            schema: {
                name: 'How to build a portfolio with AI',
                description:
                    'Build and publish a portfolio website from your own work, resume, and a plain-English description using the AI portfolio builder at builder.puter.com.',
            },
            items: [
                {
                    title: 'Say what you do and attach your work',
                    body:
                        'One or two sentences: your discipline, who you want to reach, and the feel you are after. Attach images, a resume, or a PDF of past projects, or paste in links and descriptions.',
                },
                {
                    title: 'Watch the site take shape',
                    body:
                        'Puter AI Builder designs the pages, places your work, writes the first-draft copy, and shows the site running in a live preview. A first version is usually ready in a couple of minutes.',
                },
                {
                    title: 'Refine it by pointing and asking',
                    body:
                        'Reorder projects, swap a hero image, tighten the bio, or click any element and say what should change. Every version is saved, so you can experiment freely.',
                },
                {
                    title: 'Publish and send the link',
                    body:
                        'Press Publish for a public address you can put on a resume, a job application, or a social profile. Keep editing after it is live, and download the files whenever you want.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'starters',
            heading: 'Portfolio prompts to start from',
            intro:
                'Pick the one closest to your field and attach your work. Then make it yours by describing what to change.',
            items: [
                {
                    title: 'Product designer',
                    body: 'Case studies with problem, process, and outcome, plus a filterable project grid.',
                    prompt:
                        'Build a product design portfolio with a short hero introducing me, a project grid filterable by type (mobile, web, design systems), and a case-study page per project with sections for the problem, my process, and the outcome, with image galleries in each. Add an about page built from my attached resume and a contact form that saves messages to my Puter account.',
                },
                {
                    title: 'Photographer',
                    body: 'Full-screen galleries by series, a lightbox, and a booking inquiry form.',
                    prompt:
                        'Build a photography portfolio with a full-bleed hero image, galleries organized by series (weddings, portraits, editorial) with a lightbox and keyboard navigation, an about page with my photo and bio, session pricing, and a booking inquiry form that saves each request to my Puter account. Lazy-load images so it stays fast on a phone.',
                },
                {
                    title: 'Developer',
                    body: 'Projects with live links, a tech stack section, and a downloadable resume.',
                    prompt:
                        'Build a developer portfolio with a projects section where each card has a screenshot, description, tech stack tags, and links to the live site and the repository, an experience timeline generated from my attached resume, a skills section, a resume download button, and a contact form whose submissions are saved to my Puter account. Dark theme with a light toggle.',
                },
                {
                    title: 'Writer or journalist',
                    body: 'Clips sorted by publication and topic, with reading-time estimates.',
                    prompt:
                        'Build a writing portfolio with a clean, typography-first design, a clips page where each piece shows the headline, publication, date, topic tag, and a link to the original, filters by topic and publication, a short bio page, a testimonials section from editors, and a contact form that stores messages in my Puter account.',
                },
                {
                    title: 'Illustrator or artist',
                    body: 'An image-first gallery, commissions info, and a shop link.',
                    prompt:
                        'Build an illustration portfolio with a masonry gallery of my attached artwork, tags for medium and subject that filter the gallery, a commissions page with what I offer and current availability, a link out to my print shop, and a contact form that saves inquiries to my Puter account. Playful colors and generous whitespace.',
                },
                {
                    title: 'Student or career changer',
                    body: 'Coursework, personal projects, and an AI assistant that answers questions from your resume.',
                    prompt:
                        'Build a portfolio for someone starting out, with a projects section for coursework and personal projects, a skills-in-progress section, an about page built from my attached resume, and a small chat widget that uses Puter AI to answer visitor questions about my background using the resume text. Include a contact form that saves messages to my Puter account.',
                },
            ],
        },

        {
            type: 'grid',
            id: 'what-to-include',
            columns: 2,
            heading: 'What to put in a portfolio',
            intro:
                'The tool matters less than the choices. A few that come up in every hiring conversation, and how to get them built.',
            items: [
                {
                    icon: 'star',
                    title: 'Strongest work first, and fewer pieces',
                    body:
                        'Six to ten pieces you are proud of beat thirty you are not. Tell Puter AI Builder which projects are featured and it will give them the space on the home page, with the rest behind a filter or an archive page.',
                },
                {
                    icon: 'book',
                    title: 'Case studies that show your thinking',
                    body:
                        'For design, UX, and engineering work, a page per project with the problem, your role, the process, and the result does more than a grid of thumbnails. Attach the PDF or paste the notes and ask for a case-study page built from them.',
                },
                {
                    icon: 'users',
                    title: 'An about page that sounds like you',
                    body:
                        'A photo, a paragraph in the first person, and where you are based. The AI drafts it from your resume; you fix the two sentences that are not quite you. Ask for it to be shorter or warmer and it will be.',
                },
                {
                    icon: 'mail',
                    title: 'One obvious way to reach you',
                    body:
                        'A contact form on every page footer, plus your email and the links you actually check. Submissions are saved to your account, and you can ask for an inbox page so nothing gets lost.',
                },
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'AI portfolio builder FAQ',
            items: [
                {
                    q: 'What is an AI portfolio builder?',
                    a: [
                        'An AI portfolio builder takes your work, your resume, and a short description of what you do, and produces a finished portfolio website: the layout, the galleries, the case-study pages, the copy, and the contact form, without you picking a template or writing code.',
                        'The difference from a template-based portfolio maker is where it starts. A template asks you to fit your work into someone else\'s layout. Puter AI Builder starts from your description and your files and designs around them, then lets you refine the result by asking for changes or clicking the part you want different. The output is a normal website you own.',
                    ],
                },
                {
                    q: 'How do I make a portfolio website with AI?',
                    a: [
                        'Open Puter AI Builder, describe your discipline and the feel you want, and attach your work: images, a resume or CV, PDFs of past projects, or pasted descriptions. A first version appears in the live preview within a couple of minutes. Reorder projects, change the look, and fix the copy by asking in plain language or clicking the element in question, then press Publish to get a link. The steps above walk through each stage.',
                    ],
                },
                {
                    q: 'Can I build a portfolio with AI for free?',
                    a: [
                        'Yes. Building, previewing, and publishing a portfolio are free with a [Puter](' + LINKS.puter + ') account, and no card is required. The published site is served on its own puter.site address with HTTPS. Very heavy use can hit the free tier\'s limits, at which point you can upgrade your account; building and publishing a portfolio does not.',
                    ],
                },
                {
                    q: 'How long does it take to build an AI portfolio?',
                    a: [
                        'A first version usually takes a couple of minutes. Getting it exactly right is a short conversation: most portfolios are done in a handful of changes, and the longest part is usually choosing which work to show. Every version is saved, so you can stop and come back later.',
                    ],
                },
                {
                    q: 'Can AI build my portfolio from my resume?',
                    a: [
                        'Yes. Attach your resume or CV as a PDF or text file and it becomes source material: the experience timeline, the skills list, and the about page are drafted from it, and you can ask for a resume download button on the site as well.',
                        'Puter AI Builder does not pull from GitHub, Dribbble, or Behance automatically. Paste the links and descriptions you want included, or attach the images, and they are placed for you.',
                    ],
                },
                {
                    q: 'What should I include in my portfolio, and how many projects?',
                    a: [
                        'A small number of your strongest pieces, a case study or two that show how you think, a short about page with a photo, and one clear way to contact you. Six to ten projects is plenty for most fields; recruiters rarely get past the first few.',
                        'If you do not have client work yet, coursework, personal projects, and redesigns of existing products all count. Say so in the prompt and the site is framed accordingly, with a skills-in-progress section rather than a fake client list.',
                    ],
                },
                {
                    q: 'Do I need design or coding skills?',
                    a: [
                        'No. You describe the site and the AI designs and codes it. Taste still helps: knowing which pieces to lead with, and that the copy should be shorter, is most of what makes a portfolio good, and you supply that in plain language. If you can code, the project is standard HTML, CSS, and JavaScript you can edit directly.',
                    ],
                },
                {
                    q: 'Can I use my own high-resolution images, and will they slow the site down?',
                    a: [
                        'Yes, attach them and they are saved into the project and placed where you ask. Large originals are the usual reason a portfolio loads slowly, so ask for lazy loading and thumbnails that open the full image in a lightbox, and export web-sized versions for the gallery rather than print files. If a page feels slow on a phone, say so and it gets fixed for that page.',
                    ],
                },
                {
                    q: 'Can visitors contact me through my portfolio?',
                    a: [
                        'Yes. Ask for a contact or booking form and submissions are stored in your own [Puter](' + LINKS.puter + ') account, where you can read them, and you can ask for a private inbox page inside the site. Add your email and social links alongside it so people can use whichever they prefer.',
                    ],
                },
                {
                    q: 'Will my portfolio be mobile-friendly?',
                    a: [
                        'Yes. Sites are written responsively from the start, and you can resize the preview to check any width. Galleries reflow, case studies stay readable, and the contact form works with a thumb. If something reads badly on a particular screen size, say which one and it is fixed there specifically.',
                    ],
                },
                {
                    q: 'Can I use a custom domain?',
                    a: [
                        'Every published portfolio gets its own puter.site address with HTTPS included. If you want your own domain, export the site and host it wherever your domain points, or put your domain in front of the published site with your DNS provider\'s redirect or proxy tools. There is no domain purchase or connection built into the builder itself.',
                    ],
                },
                {
                    q: 'Can I optimize my AI portfolio for SEO?',
                    a: [
                        'Yes. The output is plain HTML, which search engines read easily. Ask for the specifics: a title and description on each page, descriptive alt text for your images, headings that name your discipline and city, a sitemap, and social preview images, and they are written into the pages. Remember that a portfolio mostly gets found through the link you share, so the site title and social preview matter most.',
                    ],
                },
                {
                    q: 'Do I own the portfolio, and can I move it later?',
                    a: [
                        'Yes. The design, the copy, and the files are yours. Download the whole project as a zip at any time; it is standard HTML, CSS, and JavaScript with no build step and no proprietary format, so it runs on any static host or straight off your disk. If you outgrow the builder or a developer takes over, they continue in an ordinary editor. There is no export wall and no plan to keep paying to keep access.',
                    ],
                },
                {
                    q: 'What happens if the AI gets it wrong, or a change breaks something?',
                    a: [
                        'Most breakages are caught before you see them: after each change the preview is reloaded and watched for errors, and anything it throws goes back to the AI to fix and re-verify.',
                        'For everything else, tell it what is off in a sentence, or click the element and describe the fix. If a redesign made the site worse overall, restore the previous version from history and try a different direction. The copy is the thing to read yourself, since the AI drafts a description of you and only you know what is accurate.',
                    ],
                },
                {
                    q: 'What does it cost to keep the portfolio online?',
                    a: [
                        'Nothing. Hosting on puter.site is included, and anything a visitor uses that touches the backend, such as sending a message through the form or asking the on-page AI assistant a question, is covered by their own [Puter](' + LINKS.puter + ') account rather than yours. A portfolio that gets a burst of traffic after a viral post does not produce a bill. [How it works](' + LINKS.userPays + ').',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Put your work on a site of its own',
            body: 'Describe what you do, attach your work, and publish a portfolio with AI. Free to build, free to host.',
            label: 'Start building',
            href: buildLink(''),
        },
    ],

    related: ['use-cases', 'ai-website-builder', 'ai-app-builder', 'for/photographers', 'guides/how-to-build-a-website-with-ai'],
};
