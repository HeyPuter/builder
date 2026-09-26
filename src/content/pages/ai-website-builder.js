import { buildLink, LINKS } from '../site.js';

export default {
    slug: 'ai-website-builder',
    updated: '2026-09-26',
    priority: 0.9,
    changefreq: 'weekly',
    navLabel: 'AI website builder',

    title: 'AI Website Builder - Build a website for free with AI',
    description:
        'Build a website with AI, no coding required. Turn your idea into a live website with Puter AI Builder. Get started for free, hosting included.',
    ogTagline: 'Describe the site. Publish the site.',

    hero: {
        eyebrow: 'AI website builder',
        h1: 'AI website builder that gives you a live website',
        lead:
            'Build a website with AI without writing a line of code. Puter AI Builder turns your idea into a live website, complete with free hosting.',
        note: 'Free with a [Puter](' + LINKS.puter + ') account. Runs in any modern browser, including on a phone. New to this? [Read the walkthrough](/guides/how-to-build-a-website-with-ai/).',
        composer: {
            submit: 'Start building',
            examples: [
                'A site for my pottery studio with class signups.',
                'A restaurant website with the menu and reservations.',
                'A portfolio for a freelance designer.',
                'A landing page for my newsletter.',
            ],
        },
    },

    sections: [
        {
            type: 'grid',
            id: 'what-you-get',
            heading: 'What you get',
            intro:
                'Everything you need to go from an idea to a live website.',
            items: [
                {
                    icon: 'layout',
                    title: 'Designs the website for you',
                    body:
                        'Describe what the site is for and Puter AI Builder designs it: pages, layout, navigation, and copy, written for you rather than adapted from a template.',
                },
                {
                    icon: 'phone',
                    title: 'Built for every screen',
                    body:
                        'Every site works on phones, tablets, and desktops from the start. Check it at any width in the preview and ask for changes on small screens specifically.',
                },
                {
                    icon: 'cursor',
                    title: 'Change anything by pointing at it',
                    body:
                        'Click a heading, a section, or an image in the live preview and say what should be different. Adjust spacing, colors, and type on the spot, and those tweaks stay put through later changes.',
                },
                {
                    icon: 'database',
                    title: 'Full stack when you need it',
                    body:
                        'A backend is included, so your site can grow beyond pages. Sign-in, forms that save, member areas, and AI features are ready when you want them, with nothing to set up.',
                },
                {
                    icon: 'globe',
                    title: 'Publish in one click, free hosting included',
                    body:
                        'Your site goes live at its own link the moment you want it, ready to share. Update it anytime and the change is live instantly.',
                },
                {
                    icon: 'users',
                    title: 'Free to run at any scale',
                    body:
                        'Hosting is included, and anything visitors use, like sign-in or AI features, is covered by their own [Puter](' + LINKS.puter + ') account. If your site takes off, you don\'t get a surprise bill. [How it works](' + LINKS.userPays + ').',
                },
            ],
        },

        {
            type: 'steps',
            id: 'how-to',
            heading: 'How to build a website with AI',
            intro: 'Four steps from an idea to a live website.',
            schema: {
                name: 'How to build a website with AI',
                description:
                    'Build and publish a static website from a plain-English description using the AI website builder at builder.puter.com.',
            },
            items: [
                {
                    title: 'Describe the website',
                    body:
                        'A sentence or two is enough: what the site is for, who it is for, and the pages you know you need. The more specific you are, the closer the first version will be.',
                },
                {
                    title: 'Watch it build',
                    body:
                        'Puter AI Builder designs the pages, writes the copy, and shows the site running in a live preview. A first version is usually ready in a couple of minutes.',
                },
                {
                    title: 'Make it yours',
                    body:
                        'Ask for changes in plain language, or click any element in the preview and say what should be different. Every version is saved, so you can always go back.',
                },
                {
                    title: 'Publish it',
                    body:
                        'Press Publish to get a live link you can share. Free hosting is included, and you can keep editing after it is live.',
                },
            ],
        },

        {
            type: 'prompts',
            id: 'starters',
            heading: 'Try one of these',
            intro: 'Pick one and Puter AI Builder makes it for you. Then make it yours by describing what to change.',
            items: [
                {
                    title: 'Portfolio',
                    body: 'Work samples, an about section, and a contact form that actually stores messages.',
                    prompt:
                        'Build a modern personal portfolio site with a bold hero, an about section, a projects grid where each project opens a detail view with images and a description, and a contact form. Store contact form submissions in my Puter account so I can read them later. Include a dark mode toggle and make it look great on a phone.',
                },
                {
                    title: 'Local business',
                    body: 'Services, prices, hours, and a booking request form.',
                    prompt:
                        'Build a one-page site for a small local business with a hero, a services section with prices, an about section, opening hours, customer testimonials, a booking request form that saves submissions, and a footer with contact details and a map embed. Warm, friendly, and easy to read on a phone.',
                },
                {
                    title: 'Product launch page',
                    body: 'A hero, feature highlights, pricing, FAQ, and an email waitlist.',
                    prompt:
                        'Build a product launch landing page with a strong hero and call to action, three feature highlights with icons, a pricing table with three tiers, an FAQ accordion, and an email waitlist form that stores signups. Clean, high-contrast, and modern.',
                },
                {
                    title: 'Documentation site',
                    body: 'A sidebar, searchable pages, and code samples that copy cleanly.',
                    prompt:
                        'Build a documentation site with a fixed sidebar of sections, a search box that filters pages as I type, syntax-highlighted code blocks with a copy button, anchored headings with a table of contents on each page, and a dark mode toggle.',
                },
                {
                    title: 'Event page',
                    body: 'Schedule, speakers, venue, and RSVP collection.',
                    prompt:
                        'Build an event page with a countdown to the date, a schedule broken into sessions with times and speakers, speaker bios in a grid, venue details with directions, and an RSVP form that saves responses. Make it energetic and colorful.',
                },
                {
                    title: 'Restaurant menu',
                    body: 'Categories, dietary tags, and a menu that is easy to update.',
                    prompt:
                        'Build a restaurant site with a hero photo, a menu organized by course with prices and dietary tags (vegetarian, vegan, gluten-free), opening hours, a location map, and a reservation request form. Let me edit the menu items from an admin view that saves to my Puter account.',
                },
            ],
        },

        {
            type: 'grid',
            id: 'beyond-static',
            columns: 2,
            heading: 'A website that can do things',
            intro:
                'Most website builders stop at pages. Every site built with Puter AI Builder runs on [Puter](' + LINKS.puter + '), so the backend is already there and your site can grow the moment you need it to.',
            items: [
                {
                    icon: 'database',
                    title: 'Backend included',
                    body:
                        'Contact forms, bookings, and signups save what people send, so submissions are yours to read. Add sign-in and per-user data whenever you want, with nothing to set up. Storage, accounts, and a database come with every site, and anything visitors use is covered by their own Puter account ([how it works](' + LINKS.userPays + ')).',
                },
                {
                    icon: 'sparkles',
                    title: 'AI features on the page',
                    body:
                        'A support chatbot that knows your business, an image generator for a campaign page, a summarizer for long documents. Your site can use chat, vision, and image models directly through Puter, with no API keys to manage and no AI bill for you to carry.',
                },
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'AI website builder FAQ',
            items: [
                {
                    q: 'What is an AI website builder?',
                    a: [
                        'An AI website builder turns a plain-language description into a complete website. You say what the site is for, who it is for, and the look you want, and the AI generates the pages, the layout, the copy, and the design, from colors and fonts to images, in minutes rather than weeks.',
                        'Unlike a template builder, it does not start from someone else\'s layout and ask you to bend it. The site is designed around your description, works on phones and desktops from the start, and comes with the basics a search engine needs already in place.',
                        'You don\'t need to know how to code. Once the first version is in front of you, you refine it the same way you started, by asking for changes or clicking the part you want changed, then publish it in one click. The one thing worth doing yourself is reading the copy, since the AI writes a first draft of your business rather than the final word. [How an AI website builder works](/guides/how-does-an-ai-website-builder-work/) explains what happens at each step.',
                    ],
                },
                {
                    q: 'What kinds of websites can I build?',
                    a: [
                        'Business sites, portfolios, landing pages, restaurant and menu sites, event pages, personal sites, and small online presences of every kind. Anything that is mostly pages, images, and text is a natural fit.',
                        'Because a backend is included, the site can also do more than show pages: forms that save submissions, bookings, sign-in, and AI features are all available when you need them.',
                    ],
                },
                {
                    q: 'How do I generate a website with AI?',
                    a: [
                        'Describe the site in a sentence or two, watch Puter AI Builder design and build it in the live preview, make it yours by asking for changes or pointing at what should be different, then press Publish. The four steps above walk through each one, and [how an AI website builder works](/guides/how-does-an-ai-website-builder-work/) explains what the AI is doing inside each step.',
                    ],
                },
                {
                    q: 'How long does it take?',
                    a: [
                        'A first version is usually ready in a couple of minutes. Getting it exactly how you want it is a conversation, and most sites are finished in a handful of changes. Every version is saved, so you can stop and pick it up later.',
                    ],
                },
                {
                    q: 'Can I use Puter AI Builder for free?',
                    a: [
                        'Yes. Building and publishing are free with a [Puter](' + LINKS.puter + ') account, and no card is required. Open Puter AI Builder, describe a site, and see it running right away. Very heavy use can hit the free tier\'s limits, at which point you can upgrade your account; ordinary building and publishing do not.',
                    ],
                },
                {
                    q: 'How much does it cost to operate?',
                    a: [
                        'Nothing. Anything visitors use, like sign-in or AI features, is covered by their own [Puter](' + LINKS.puter + ') account. If your site takes off, you don\'t get a surprise bill. [How it works](' + LINKS.userPays + ').',
                    ],
                },
                {
                    q: 'Does it include hosting and a domain?',
                    a: [
                        'Hosting is included. Every published site gets its own link that anyone can visit, served over HTTPS, with nothing to configure.',
                        'If you want your own domain, export the site and host it wherever your domain points, or put your domain in front of the published site with your DNS provider\'s redirect or proxy tools.',
                    ],
                },
                {
                    q: 'Will the site work on phones?',
                    a: [
                        'Yes. Sites are written responsively by default, and you can resize the preview to check. If something reads badly at a particular width, say so and it gets fixed for that width specifically.',
                    ],
                },
                {
                    q: 'Can I customize the design?',
                    a: [
                        'Yes, all of it. Describe the look you want, from colors and fonts to layout and mood, and it is designed that way from the start. Afterwards, click any element in the preview and say what should be different, or adjust spacing, colors, and type directly on it. There is no theme underneath limiting what can change.',
                    ],
                },
                {
                    q: 'Can I add my own images, logo, and copy?',
                    a: [
                        'Yes. Attach images, a logo, PDFs, or a text file with your copy in the chat and they are saved into the project for Puter AI Builder to use. You can also paste your text directly into the conversation and ask for it to be placed.',
                    ],
                },
                {
                    q: 'Do I own the website?',
                    a: [
                        'Yes. The design, the content, and the files are yours. There is no license to renew and no export wall. Keep it on [Puter](' + LINKS.puter + ') or take it somewhere else at any time.',
                        'The site is a normal set of web files with no framework and no proprietary format, so if you ever want a developer to take it over, you can hand them the export and they can continue in an ordinary editor.',
                    ],
                },
                {
                    q: 'Is it secure?',
                    a: [
                        'Published sites follow security best practices out of the box: every site is served over HTTPS with an SSL certificate handled for you, and there is no server of your own to patch or keep updated.',
                        'The backend keeps the risk small by default. Anything your site stores through forms or sign-in lives under each person\'s own [Puter](' + LINKS.puter + ') account, so visitors only ever touch their own data. Shared data exists only when you ask for it, and even then it runs on Puter rather than on a server you have to maintain.',
                    ],
                },
                {
                    q: 'Can I monetize my website?',
                    a: [
                        'Yes. Puter AI Builder does not process payments itself, so the usual approach is to link to a payment provider you already use, such as a checkout page or a payment link, and let the site handle everything around it. Ads, affiliate links, and lead forms work the same way they would on any website you own.',
                    ],
                },
                {
                    q: 'Is the site good for SEO?',
                    a: [
                        'Yes. The output is plain HTML, which is the easiest thing there is for a search engine to read. Ask for the specifics you want, such as title and description tags, a sitemap, headings that match your keywords, and social previews, and they will be written into the pages.',
                    ],
                },
                {
                    q: 'How is this different from Wix, Squarespace, or WordPress?',
                    a: [
                        'Those tools are editors: you work inside their canvas, their themes, and their plugin ecosystem, and your site stays there. That is a fair trade for many people, and it comes with a monthly bill and a ceiling.',
                        'With Puter AI Builder you describe the site and get real website files. There is no theme to work around, no plugin marketplace to shop in, and no lock-in, because you can export the whole site and host it anywhere. The trade is that you are describing rather than dragging, which is faster once you get used to it and less familiar at first.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Turn your idea into a live website',
            body: 'Build it with AI, no coding required. Free to start, hosting included.',
            label: 'Start building',
            href: buildLink(''),
        },
    ],

    related: ['ai-app-builder', 'use-cases', 'for', 'guides/how-to-build-a-website-with-ai', 'guides/how-does-an-ai-website-builder-work', 'what-to-build'],
};
