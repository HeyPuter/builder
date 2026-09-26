import { buildLink, LINKS } from '../site.js';

const EXAMPLE_PROMPT =
    'Build a one-page site for a neighborhood bakery. Sections: a hero with the name and opening hours, a menu with prices, a gallery, a short about section, a map and address, and a contact form that saves messages to my Puter account. Warm and simple, easy to read on a phone.';

export default {
    slug: 'guides/how-does-an-ai-website-builder-work',
    parent: 'guides',
    updated: '2026-09-26',
    priority: 0.7,
    changefreq: 'monthly',
    navLabel: 'How does an AI website builder work?',
    type: 'guide',
    readingTime: '9 min read',

    title: 'How Does an AI Website Builder Work? | Puter',
    description:
        'How AI website builders turn a description into a live site, combine AI assistance with visual editing, and create layouts you can review on phones and desktops.',
    ogTagline: 'From a description to a live site',

    hero: {
        eyebrow: 'Guide',
        h1: 'How does an AI website builder work?',
        lead:
            'An AI website builder takes a description of a site in ordinary language and turns it into a working website, with layout, copy, and design chosen for you. This guide explains what happens in between, and why two tools that both call themselves AI website builders can produce very different things.',
    },

    sections: [
        {
            type: 'prose',
            id: 'short-answer',
            heading: 'The short answer',
            body: [
                'An AI website builder reads what you tell it about the site, decides what sections and pages it needs, writes the copy and picks a design, and produces a site you can edit and publish. Depending on the tool, it assembles existing components, generates code, or combines the two. You refine the draft with AI assistance, visual editing, or both.',
                'The details vary by tool, particularly how you edit the result and whether you can download its files. Apps rather than sites are covered in [what is an AI app builder](/guides/what-is-an-ai-app-builder/).',
            ],
        },

        {
            type: 'prose',
            id: 'generation-and-editing',
            heading: 'AI generation and visual editing work together',
            body: [
                'How a builder creates the first draft and how you edit it are separate questions. A tool can generate code and still give you visual controls, or assemble a site from existing components and let you revise it through conversation.',
            ],
            list: [
                '**Assembling components.** The AI arranges templates, sections, and design components, then fills them with copy and images based on your description. The available components and ways to extend them depend on the platform.',
                '**Generating code.** The AI writes the page structure, styling, and behavior as code. Puter AI Builder produces HTML, CSS, and JavaScript files this way. Other tools may combine generated code with an existing component library.',
            ],
            after: [
                'Either approach can offer AI assistance alongside visual editing. You might ask for a new services section, then use direct controls to adjust its spacing. Check the editing options, hosting, and code export separately; one does not guarantee the others.',
            ],
        },

        {
            type: 'steps',
            id: 'steps',
            heading: 'What happens, step by step',
            intro:
                'Seven steps, from the first sentence to a live address. The details vary by builder, but the basic workflow is the same.',
            items: [
                {
                    title: 'You describe the site',
                    body:
                        'The input is a sentence or a paragraph, sometimes with attachments such as a logo, photos, or your existing copy. Some builders guide you with questions. Either way, the useful information is the same. What the site is for, who it is for, and what sections it needs.',
                },
                {
                    title: 'The model works out what you meant',
                    body:
                        'A large language model reads the description and infers the parts you did not say. "A site for a two-person landscaping business" implies a services section, a quote form, a service area, and photos of past work, because that is what sites for that kind of business contain. Naming the domain is what makes this step go well, and [how to write a build prompt](/guides/how-to-write-a-build-prompt/) covers the rest.',
                },
                {
                    title: 'It produces the structure',
                    body:
                        'Pages, sections, and their order. The builder may arrange existing components, write the page structure as code, or combine both approaches. A bakery site might need a menu, opening hours, a gallery, and a contact section.',
                },
                {
                    title: 'It writes the copy and picks the design',
                    body:
                        'Headings, body text, calls to action, and placeholder details for anything you did not supply. A palette, type, and spacing are chosen to fit the tone you described, or a default if you did not describe one. Images come from a stock library, an image model, or the files you attached.',
                },
                {
                    title: 'It loads the site in a preview',
                    body:
                        'The assembled pages or generated files load so you can see and use the site. In Puter AI Builder, the preview runs the generated HTML, CSS, and JavaScript. The builder also watches the running page for errors and sends any it finds back to the model to fix before showing you the result.',
                },
                {
                    title: 'You review and change things',
                    body:
                        'Use AI assistance for a change such as adding a section or rewriting the introduction. Use visual editing to adjust a heading, color, or spacing directly. Tools that offer both let you switch between them. Review the site at phone and desktop widths as you make changes.',
                },
                {
                    title: 'You publish',
                    body:
                        'Once you have reviewed the content, links, forms, and mobile layout, publish the site to a hosted address. Hosting and custom-domain options depend on the platform. Some builders also let you download the files and choose your own host.',
                },
            ],
        },

        {
            type: 'prose',
            id: 'technology',
            heading: 'What the model is actually doing',
            body: [
                'The word "AI" in the name covers a stack of ordinary parts. The one doing most of the work is a large language model, the same kind that powers a chat assistant, given a long set of instructions about what a good website looks like. Those instructions are where the builder\'s opinions live. Mobile layouts first, readable contrast, one clear call to action, alt text on images, a sensible heading order. The model applies them to your description.',
                'Around the model sit the pieces that turn its output into a working site: component libraries, file editing, a preview, and publishing tools. Some builders also check the running site for errors. Images may come from a stock library, an image model, or your own uploads.',
                'Nothing in this stack understands your business. The model predicts what a good site for your description would contain, based on everything it has read. That is why it is strong on conventional sites and weaker on anything unusual, and why the details only you know, such as prices, hours, and what you actually offer, are the things to supply rather than let it guess.',
            ],
        },

        {
            type: 'prose',
            id: 'control',
            heading: 'Refining the site with AI assistance and visual editing',
            body: [
                'The first version is a draft. AI assistance is useful for adding a section, changing its content, or rearranging the page. Visual editing gives you direct control over individual details. Puter AI Builder combines them in three ways.',
            ],
            list: [
                '**Describe the change.** "Move testimonials above pricing and make the quote button more prominent." Useful for structural changes or changes across several parts of the site. Review the result to make sure the AI applied the change where you intended.',
                '**Point at the element.** Click the exact heading, card, or button in the preview and say what should be different. This removes the problem of describing where something is. In Puter AI Builder this is the [element picker](/features/).',
                '**Adjust it directly.** Use visual controls for spacing, size, color, and type on the selected element. Puter AI Builder keeps these edits in a stylesheet of your own, so later AI changes leave them alone.',
            ],
            after: [
                'If the builder gives you access to the code, there is a fourth option: open the files and edit them. The output of Puter AI Builder is ordinary HTML, CSS, and JavaScript with no build step, so changing a phone number is a text edit, and a developer can take the project over at any point.',
            ],
        },

        {
            type: 'prose',
            id: 'responsive-layouts',
            heading: 'How responsive layouts work',
            body: [
                'A responsive layout adapts the same site to different screen sizes. Cards that sit in a row on a desktop can stack on a phone, images shrink to fit, and navigation can collapse into a menu. The builder creates those layout rules through its components or generated styling.',
                'Review the result at both phone and desktop widths. Look for text that is too small, buttons that are hard to tap, images that overflow, and forms that are awkward to use. You can ask the AI for a specific correction, such as "Stack the menu cards on phones and make the contact button full width," then check the result again.',
            ],
        },

        {
            type: 'prose',
            id: 'vs-traditional',
            heading: 'AI website builder vs traditional website builder',
            body: [
                'A traditional builder gives you a template and a drag-and-drop editor, and you make every decision by hand. The differences with an AI builder are practical rather than philosophical.',
            ],
            list: [
                '**Starting point.** A traditional builder starts from a template you picked. An AI builder starts from a draft of your specific site, with your sections and a first pass at your copy.',
                '**Time to a first version.** Hours in a traditional builder, spent choosing and arranging. Minutes in an AI builder.',
                '**Editing.** A traditional workflow relies on manual edits. AI assistance lets you describe a change, and many builders combine that with visual controls for direct adjustments.',
                '**What the site can do.** Check the specific platform. Forms, bookings, payments, and other features may use built-in components, integrations, or generated code, each with its own setup and limits.',
                '**Ownership.** AI generation does not guarantee code export. Check whether you can download the site and what services it will still depend on if you host it elsewhere.',
            ],
        },

        {
            type: 'prose',
            id: 'limits',
            heading: 'Where it falls short',
            body: [
                'Being clear about the limits is more useful than another paragraph about speed. Four show up repeatedly.',
            ],
            list: [
                '**Generic output.** A first draft with no direction reads like every other first draft. The fix is to supply the things only you have, your real copy, your photos, your actual prices, and two or three words of tone. Sites that skip this look like AI sites.',
                '**Made-up details.** If you do not give it hours, prices, or an address, the model invents plausible ones. Check every fact on the page before publishing. This is the most common mistake with AI-built sites.',
                '**Complex functionality.** A store with tax rules, a [membership site with billing](/ai-saas-builder/), or an integration with your booking system needs more setup and testing than a simple page. Check what the platform already supports and what would need custom work. Expect to iterate, and to review what was built.',
                '**Judgment about correctness.** In a code-generating builder the code was written for you. Whether it works is checkable by clicking around. Whether it is secure, for a site that handles anything sensitive, is not, and needs a person who can read it.',
            ],
        },

        {
            type: 'prose',
            id: 'puter',
            heading: 'How Puter AI Builder does it',
            body: [
                'Here is the concrete version of the steps above in Puter AI Builder. You describe the site, with attachments if you have them. If something is genuinely open, you get one round of up to three questions, which you can skip. The model writes the files, a checklist shows progress, and the preview loads the site as it takes shape.',
                'After every change the preview is reloaded and watched for runtime errors. Anything that throws goes back to the model, which reads the file, fixes the cause, and checks again. You are told a change is done only once the page runs clean. What is not checked is whether the site says what you meant. That review is yours.',
                'Publishing puts the site on its own address on puter.site in one click, and the project can be downloaded as a zip at any time. Two limits to know about. A custom domain means pointing your DNS at the published address or hosting the downloaded files yourself, and each project belongs to one account, so two people cannot edit the same project at once. The [full walkthrough](/guides/how-to-build-a-website-with-ai/) carries one example site from prompt to published address, and the [landing page](/ai-landing-page-builder/) and [portfolio](/ai-portfolio-builder/) pages show what a first version includes for those two kinds of site.',
            ],
        },

        {
            type: 'faq',
            id: 'faq',
            heading: 'Common questions',
            items: [
                {
                    q: 'How does AI build a website for you?',
                    a: [
                        'A language model reads your description, decides what sections and pages a site like yours needs, writes the copy, and chooses a design. The builder assembles components, generates code, or combines both. You then refine the draft with AI assistance and the editing controls the tool provides, review it, and publish it.',
                    ],
                },
                {
                    q: 'Do AI website builders write code?',
                    a: [
                        'Some generate code, some assemble existing components, and some combine both. Whether you can view, edit, or export the code is a separate question. Puter AI Builder writes HTML, CSS, and JavaScript files that you can download and host elsewhere.',
                    ],
                },
                {
                    q: 'Are websites made with an AI website builder unique?',
                    a: [
                        'The structure and copy are generated for your description, so no two are identical. Whether they look distinctive depends on what you supply, and the [profession pages](/for/) show how much naming a specific line of work changes the first version. A site built from a one-line prompt with no images or copy of your own will look like other sites built that way. Real photos, your own words, and a tone direction make more difference than any setting.',
                    ],
                },
                {
                    q: 'Can I edit the site after the AI builds it?',
                    a: [
                        'Yes. The available controls depend on the tool: AI assistance, visual editing, and direct code editing can work together. In Puter AI Builder you can describe a change, select an element to edit, or adjust its styling with visual controls. Every change is saved as a version, so an edit that makes things worse is one click to undo.',
                    ],
                },
                {
                    q: 'How long does it take to build a website with AI?',
                    a: [
                        'A first version takes a couple of minutes. Getting it right takes as long as the review takes, which for a small business site is usually under an hour spread over a handful of changes. The slow part is gathering your own copy and photos, and that is worth doing before you start.',
                    ],
                },
                {
                    q: 'How much does an AI website builder cost?',
                    a: [
                        'Pricing varies by platform. Check generation limits, hosting, and custom-domain costs separately. Puter AI Builder is free with a [Puter](' + LINKS.puter + ') account, including hosting. People who use features of your site that consume storage or AI cover that through their own account. [How that works](' + LINKS.userPays + ').',
                    ],
                },
                {
                    q: 'Are AI-built websites good for SEO?',
                    a: [
                        'They can be, but review the finished site to make sure it is search-friendly. Check that each page has a descriptive title, clear headings, useful content, working links, and descriptions for meaningful images. You can ask the AI to help with these details and check what it produces. A responsive layout should also be part of that review. These are checks on the site itself; using an AI builder does not guarantee search rankings.',
                    ],
                },
                {
                    q: 'Is it legal to use AI to create a website?',
                    a: [
                        'Yes. You are responsible for the content, the same as if you had written it yourself, so check facts and claims and use images you have the right to use.',
                    ],
                },
                {
                    q: 'What is the difference between an AI website builder and a no-code builder?',
                    a: [
                        'A no-code builder gives you components to assemble by hand. An AI builder assembles a first version for you from a description. Many products are both, with AI for the first draft and a no-code editor for refinement. The question worth asking is what you own at the end, a project inside their editor or files you can take with you.',
                    ],
                },
            ],
        },

        {
            type: 'cta',
            heading: 'Watch the steps happen',
            body: 'Describe a site and see each step in this guide play out in the preview. Free with a Puter account.',
            label: 'Open with this prompt',
            href: buildLink(EXAMPLE_PROMPT),
        },
    ],

    related: ['ai-website-builder', 'guides/how-to-build-a-website-with-ai', 'guides/what-is-an-ai-app-builder', 'vibe-coding'],
};
