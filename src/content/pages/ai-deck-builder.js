import { buildLink, LINKS } from '../site.js';

const starterPrompt = 'Build an 8-slide online presentation for a product launch: title, audience problem, product introduction, two benefit slides, a demo slide, pricing, and a closing call to action. Use clearly labeled placeholders for facts I have not supplied. Include keyboard and swipe navigation, fullscreen mode, and a print layout for saving to PDF. Make it readable on a laptop and a phone, ready to publish at a shareable URL.';

export default {
    slug: 'ai-deck-builder',
    parent: 'use-cases',
    updated: '2026-09-23',
    priority: 0.9,
    changefreq: 'weekly',
    navLabel: 'AI online deck builder',

    title: 'AI Online Deck Builder - Create & Share Presentations',
    description:
        'Build an online deck with AI. Present in your browser, share one URL, and update the same link as your story changes. Print to PDF or download web files. Free to start.',
    ogTagline: 'An online deck. One link to present and share.',

    hero: {
        eyebrow: 'AI online deck builder',
        h1: 'AI online deck builder for presentations you share by link',
        lead:
            'Turn your outline into an online presentation with AI. Present in your browser, send the link to your audience, and edit and republish the deck at the same URL whenever your story changes.',
        cta: { label: 'Build an online deck', href: buildLink(starterPrompt) },
        secondary: { label: 'How to write the prompt', href: '/guides/how-to-write-a-build-prompt/' },
        note: 'Free with a [Puter](' + LINKS.puter + ') account. Present online, print to PDF, or download web files. No PowerPoint or Google Slides export.',
        screenshot: {
            src: '/screenshots/deck.webp',
            alt: 'Build an online pitch deck with Puter AI Builder',
        },
    },

    sections: [
        {
            type: 'grid',
            id: 'what-you-get',
            heading: 'Your presentation, ready for the browser',
            intro:
                'Go from an outline to an online deck with a consistent design, editable slides, and one link to present and share.',
            items: [
                {
                    icon: 'layout',
                    title: 'Writes and designs the slides',
                    body:
                        'Describe the deck, the audience, and the point you need to land. Add your outline, brand colors, logo, and images. Puter AI Builder works out the slide order, writes the copy, and designs a consistent presentation around them.',
                },
                {
                    icon: 'eye',
                    title: 'Present and share from one URL',
                    body:
                        'Publish the deck and open its link in a browser. Ask for arrow-key and swipe navigation, fullscreen mode, and speaker notes. Your audience can open the same presentation on a laptop, tablet, or phone.',
                },
                {
                    icon: 'chart',
                    title: 'Live data and interactive slides',
                    body:
                        'Your online slides can include a chart drawn from your own numbers, a pricing calculator, a working product demo, or a poll the room answers. Describe the interaction you want alongside the story.',
                },
                {
                    icon: 'cursor',
                    title: 'Point at the slide you want changed',
                    body:
                        'Click any heading, chart, or bullet in the live preview and say what to do with it. Adjust spacing, colors, and type on the spot, and those tweaks stay put through later changes.',
                },
                {
                    icon: 'shieldCheck',
                    title: 'Checks its own work',
                    body:
                        'After every change the builder runs the deck and watches for errors. If a slide breaks, it reads the file, fixes the cause, and verifies again before handing it back. Every version is saved.',
                },
                {
                    icon: 'users',
                    title: 'Free to build, free to share at any scale',
                    body:
                        'Publishing is free, and anything viewers use, like sign-in or an AI feature on a slide, is covered by their own [Puter](' + LINKS.puter + ') account. If the deck gets passed around, you don\'t get a surprise bill. [How it works](' + LINKS.userPays + ').',
                },
            ],
        },

        {
            type: 'split',
            id: 'last-mile',
            heading: 'Edit your online deck. Keep the same share link.',
            intro:
                'Refine the copy and design in the preview, then republish when you are ready. The URL you already sent still opens your presentation.',
            items: [
                {
                    title: 'Change exactly the slide you mean',
                    art: 'picker',
                    body: [
                        'Click the slide, the chart, or the one bullet that reads wrong in the live preview and say what should be different. No describing which of the twelve slides you mean.',
                        'For styling, adjust spacing, colors, and type directly on the element. Those edits are kept in a stylesheet of your own that later changes leave alone.',
                    ],
                },
                {
                    title: 'Publish updates at the same URL',
                    art: 'publish',
                    body: [
                        'Press Publish and the deck is at its own address, served over HTTPS, with nothing to configure. Send the link before the meeting, present from it during the meeting, and leave it up afterwards.',
                        'Edit in the builder and publish again whenever the story changes. Anyone opening the same URL gets the updated deck. A private draft link lets a co-founder review changes before you publish them.',
                    ],
                },
                {
                    title: 'Try a bolder version, keep the safe one',
                    art: 'history',
                    body: [
                        'Every change is saved as a version. Ask for a riskier layout or a rewritten narrative, and if it lands worse, go back in a click. Duplicate the project to keep an investor version and a customer version side by side.',
                    ],
                },
            ],
        },

        {
            type: 'steps',
            id: 'how-to',
            heading: 'How to build and share an online deck with AI',
            intro: 'Four steps from your outline to an online presentation at its own URL.',
            schema: {
                name: 'How to build and share an online deck with AI',
                description:
                    'Create an online presentation from an outline with Puter AI Builder, refine the slides, and publish a link you can present from and update.',
            },
            items: [
                {
                    title: 'Describe your online presentation',
                    body:
                        'Say who it is for, what decision you want at the end, and roughly how many slides. Paste your outline or attach the document the deck should be based on. Add your real numbers, brand colors, logo, and images.',
                },
                {
                    title: 'Watch it build',
                    body:
                        'Puter AI Builder plans the slide order, writes the content, designs the slides, and shows the deck running in a live preview. A first version is usually ready in a couple of minutes.',
                },
                {
                    title: 'Make it yours',
                    body:
                        'Ask for changes in plain language, or click any slide element and say what should be different. Tighten the copy, swap a chart, add speaker notes. Every version is saved, so you can always go back.',
                },
                {
                    title: 'Publish, present, and update',
                    body:
                        'Press Publish to get your presentation URL. Open it in a browser to present, or send it to your audience. After an edit, republish at the same link. You can also print to PDF or download a zip of the web files.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'starters',
            heading: 'Start with an online deck for your next meeting',
            intro:
                'Pick a presentation to build, then add your own story, facts, and style. Each one is made to present in a browser and share by link.',
            items: [
                {
                    title: 'Investor pitch deck',
                    body: 'Problem, solution, market, traction, team, and the ask, with a live traction chart.',
                    prompt:
                        'Build a 12-slide online seed-stage pitch deck for a B2B SaaS startup: problem, solution, product, market size, business model, traction with a line chart I can update from an editable table, competition, team, financial projections, and the ask. Use clearly labeled placeholders for figures I have not supplied. Keyboard and swipe navigation, a fullscreen mode, and a speaker notes panel I can toggle with the N key. Save my edits to my Puter account.',
                },
                {
                    title: 'Sales deck with a pricing calculator',
                    body: 'A product story that ends on a slide the prospect can play with.',
                    prompt:
                        'Build an online sales deck for a scheduling tool aimed at dental clinics: the problem they have, how the product solves it, placeholders for three real customer stories, and a final slide with an interactive ROI calculator where the prospect enters their number of chairs and monthly no-shows and sees estimated savings from clearly stated assumptions. Clean and confident, easy to read from across a room or from a shared link on a phone.',
                },
                {
                    title: 'Quarterly business review',
                    body: 'Results, charts, wins, misses, and next quarter, from numbers you paste in.',
                    prompt:
                        'Build an online quarterly business review deck with a title slide, headline numbers, revenue and churn charts drawn from a table of monthly figures I can edit in an admin view, top three wins, top three misses with what we learned, and next quarter priorities. Label missing figures as placeholders. Keep the figures saved to my Puter account so I can update them each quarter and present from the same URL.',
                },
                {
                    title: 'Lecture deck with quiz slides',
                    body: 'Teaching slides that pause to check the room understood.',
                    prompt:
                        'Build a 15-slide online lecture deck introducing photosynthesis for a first-year biology class, with a diagram slide, a worked example, and three multiple-choice quiz slides that reveal the answer on a click. Add a progress bar along the bottom, arrow-key and swipe navigation, and a printable handout view that puts two slides per page for browser PDF printing.',
                },
                {
                    title: 'Conference talk with a timer',
                    body: 'Speaker notes, a visible clock, and a link the audience keeps.',
                    prompt:
                        'Build an online deck for a 25-minute conference talk about remote team rituals that I will present from my browser: a bold title slide, section dividers, mostly one idea per slide with large type, a closing slide with my contact details and a QR code to this deck\'s URL. Include speaker notes that show only on my screen, an elapsed-time clock in the corner, and keyboard shortcuts for next, previous, and blackout.',
                },
                {
                    title: 'Agency credentials deck',
                    body: 'Who you are, what you have done, and how to hire you, at a link you send prospects.',
                    prompt:
                        'Build an online credentials deck for a small design agency: who we are, our process in four steps, six case studies each with a before-and-after image pair and one result metric, client logos, services and starting prices, and a contact slide with a short inquiry form that saves submissions to my Puter account. Use labeled placeholders for images, clients, and results I have not supplied. Sophisticated and image-led, readable on a phone when a prospect opens the link.',
                },
            ],
        },

        {
            type: 'grid',
            id: 'beyond-slides',
            columns: 2,
            heading: 'An online presentation your audience can interact with',
            intro:
                'Your deck runs as a web app on [Puter](' + LINKS.puter + '). Add a calculator, a live chart, or a product demo when it helps explain the story, and let your audience try it from the presentation link.',
            items: [
                {
                    icon: 'chart',
                    title: 'Numbers that are current when you present',
                    body:
                        'Charts drawn from a table you edit, a dashboard slide that reads from your data, a calculator the audience drives themselves. Store the figures in your Puter account and update them before each meeting instead of re-exporting a file. Storage, accounts, and a database come with every deck ([how it works](' + LINKS.userPays + ')).',
                },
                {
                    icon: 'sparkles',
                    title: 'AI on the slide, if you want it',
                    body:
                        'A slide that answers questions about your product in your voice, a live demo of the AI feature you are pitching, a summary generated from what the room typed in. The deck can use chat, vision, and image models directly through Puter, with no API keys to manage and no AI bill for you to carry.',
                },
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'AI online deck builder FAQ',
            items: [
                {
                    q: 'What is an AI online deck builder?',
                    a: [
                        'An AI online deck builder turns your outline or plain-language description into a presentation you can open in a browser. Describe the audience, the story, and the point you need to land, and Puter AI Builder plans the slide order, writes the copy, and designs the slides.',
                        'Publish the deck to get a URL for presenting and sharing. Edit it in the builder and republish whenever it changes; the same link opens the updated presentation. You can also print to PDF or download the deck as web files.',
                        'You don\'t need to know how to code or design. You refine the deck the same way you started, by asking for changes or clicking the slide you want changed, then publish it in one click.',
                    ],
                },
                {
                    q: 'Is the online deck builder free?',
                    a: [
                        'Yes. Building, publishing, and presenting are free with a [Puter](' + LINKS.puter + ') account, and no card is required. There is no watermark on the deck and no cap on how many people can open the link. Very heavy use can hit the free tier\'s limits, at which point you can upgrade your account; ordinary building and iterating do not.',
                    ],
                },
                {
                    q: 'How long does it take to build a deck?',
                    a: [
                        'A first version usually lands in a couple of minutes. Getting it exactly right is a conversation, and most decks are finished in a handful of changes: tighten this slide, swap that chart, cut the two that drag. Every version is saved, so you can stop and pick it up before the meeting.',
                    ],
                },
                {
                    q: 'Can I customize the generated deck?',
                    a: [
                        'Yes, all of it. Describe the look you want up front, from colors and fonts to mood, and attach your logo and images so the deck is built around them. Afterwards, click any element in the preview and say what should be different, or adjust spacing, colors, and type directly on it. There is no template underneath limiting what can change.',
                    ],
                },
                {
                    q: 'Can I export to PowerPoint, Keynote, or Google Slides?',
                    a: [
                        'There is no PowerPoint, Keynote, or Google Slides export. Puter AI Builder creates an online presentation made of web files. Present from its URL, use your browser\'s Print option to save a PDF, or download a zip of the complete web project.',
                        'Choose this workflow when you can present from a browser or share a link. If a client or conference requires an editable .pptx, .key, or Google Slides deck, you will need a tool that produces that format.',
                    ],
                },
                {
                    q: 'Can I update the online deck after sharing its link?',
                    a: [
                        'Yes. Open the project in Puter AI Builder, describe your changes, and review them in the preview. Press Publish again to update the presentation at the same URL. Anyone opening that link gets the latest published version, so you do not need to send another address.',
                        'A PDF or downloaded zip is a snapshot of the deck when you saved it. Print or download it again if you need a file with the latest changes.',
                    ],
                },
                {
                    q: 'How do I present an online deck?',
                    a: [
                        'Open the link in a browser, press the fullscreen key, and use the arrow keys, a clicker, or swipes to move through the slides. Ask for speaker notes and you get a notes panel you toggle with a key on your own screen. Because it is a web page, the same link works on a laptop, a tablet, and a phone.',
                        'If you want to present with no network at all, export the zip beforehand. The deck runs straight off your disk with no build step.',
                    ],
                },
                {
                    q: 'What slides should be in a pitch deck?',
                    a: [
                        'The investor-standard order is problem, solution, product, market, business model, traction, competition, team, financials, and the ask, in ten to fourteen slides. Ask for a pitch deck and Puter AI Builder follows that structure by default, then reorders or drops slides when you tell it what your story actually needs.',
                    ],
                },
                {
                    q: 'Can the AI write my financial projections and market numbers?',
                    a: [
                        'It can lay them out and chart them, and it will fill gaps with plausible-looking figures if you let it. Don\'t. Every AI deck tool is prone to invented statistics, and an investor will find them. Give it your real numbers, or a range you can defend, and ask it to mark anything it assumed so you can replace it before the meeting.',
                        'The advantage of a web deck is that the numbers can live in a table you edit rather than in a dozen text boxes, so updating them next quarter is one change, not a redesign.',
                    ],
                },
                {
                    q: 'Is it good enough for real investor presentations?',
                    a: [
                        'The structure, the design, and the mechanics are. The content is only as good as what you put in: a three-sentence prompt gets you a competent generic deck, while your notes, your numbers, and a clear ask get you a deck that sounds like you. Read every slide before you present it, the same as you would with any tool.',
                    ],
                },
                {
                    q: 'Do I need design skills?',
                    a: [
                        'No. Layout, type, spacing, and color are handled for you and kept consistent across every slide. If something looks off, click it and say so, or adjust it directly. The one skill that matters is knowing what you want the room to decide at the end, and that was always your job.',
                    ],
                },
                {
                    q: 'What happens when the AI gets a slide wrong?',
                    a: [
                        'Runtime errors are caught before you see them: after each change Puter AI Builder reloads the deck, watches for anything that breaks, and sends it back to the AI to fix and re-verify.',
                        'For everything else, click the offending slide element and describe the fix in a sentence. If a change made the whole deck worse, version history restores the earlier one in a click.',
                    ],
                },
                {
                    q: 'Who can see my deck, and is my data safe?',
                    a: [
                        'Nothing is public until you press Publish, and unpublishing is just as immediate. Before that, a private draft link lets one person review the work in progress without making it public. If you want to restrict a published deck, ask for a sign-in gate so viewers have to sign in with a [Puter](' + LINKS.puter + ') account before the slides load.',
                        'Anything the deck stores, like figures behind a chart or answers to a poll slide, lives under each person\'s own Puter account, so viewers only ever touch their own data.',
                    ],
                },
                {
                    q: 'Can my team build the deck together?',
                    a: [
                        'Each project belongs to one Puter account, so building happens from one account at a time. Share the private draft link for review and comments in whatever channel your team already uses, then fold the feedback in yourself. The published deck can be fully multi-user if you need it to be, for example a poll or Q&A slide the audience fills in.',
                    ],
                },
                {
                    q: 'Do I own the deck?',
                    a: [
                        'Yes. The design, the content, and the files are yours, with no license to renew and no export wall. The deck is a normal folder of HTML, CSS, and JavaScript with no proprietary format, so you can download it as a zip at any time, host it on your own domain, or hand it to a designer to keep working on in an ordinary editor.',
                    ],
                },
                {
                    q: 'How much does it cost to share the deck widely?',
                    a: [
                        'Nothing. Hosting is included, and anything viewers use, like sign-in or an AI feature on a slide, is covered by their own [Puter](' + LINKS.puter + ') account. If the link gets forwarded a thousand times, you don\'t get a surprise bill. [How it works](' + LINKS.userPays + ').',
                    ],
                },
                {
                    q: 'When should I choose an online presentation?',
                    a: [
                        'An online deck fits meetings you present from your own browser, sales decks you send to prospects, teaching slides your class revisits, and updates that should stay available at one URL. It also gives your audience a place to try a calculator, chart, or demo inside the presentation.',
                        'Puter AI Builder creates HTML, CSS, and JavaScript files you can download and host elsewhere. Use the published link for the current deck and browser PDF printing for a static copy. For a workflow that requires editing in PowerPoint, Keynote, or Google Slides, choose a tool with native slide-file export.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Build your online deck. Share one link.',
            body: 'Turn your outline into a browser presentation with AI, then edit and republish at the same URL. Free to start, hosting included.',
            label: 'Build an online deck',
            href: buildLink(starterPrompt),
        },
    ],

    related: ['use-cases', 'ai-app-builder', 'ai-website-builder', 'guides/how-to-write-a-build-prompt'],
};
