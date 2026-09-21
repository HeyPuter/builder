import { verticalPage } from '../verticals.js';

export default verticalPage({
    slug: 'therapists',
    navLabel: 'Therapists',

    title: 'Website Builder for Therapists and Counselors | Puter',
    description:
        'A calm practice website with services, fees, and a contact form, described in plain English and published free. Plus simple practice tools you shape yourself.',
    ogTagline: 'A practice site that feels like your office',

    eyebrow: 'For therapists',
    h1: 'A practice website as calm as your waiting room',
    lead:
        'Finding a therapist is stressful, and most therapy websites make it worse: cluttered, outdated, or clearly built from the same directory template. Describe your practice in plain English and get a site that sounds like you, reassures the person reading it, and costs nothing to run.',

    demo: {
        prompt: 'Build a calm website for my therapy practice with services and a contact form',
        app: {
            name: 'stillwater.puter.site',
            header: 'Stillwater Counseling',
            blocks: [
                {
                    kind: 'stats',
                    items: [
                        { value: '3', label: 'New inquiries' },
                        { value: 'Wed', label: 'Next opening' },
                    ],
                },
                {
                    kind: 'list',
                    rows: [
                        { title: 'Individual therapy', sub: '50 min · in person or video', tag: '' },
                        { title: 'Couples counseling', sub: '75 min · in person', tag: '' },
                        { title: 'First consultation', sub: '15 min · free by phone', tag: 'Book' },
                    ],
                },
            ],
        },
    },

    useCasesHeading: 'What therapists build here',
    useCasesIntro:
        'The public side of a practice: the site, the first contact, and the resources you hand out, all in your own voice.',
    useCases: [
        {
            icon: 'heart',
            title: 'A site that lowers the threshold',
            body:
                'Someone reading a therapist\'s website is often having a hard week. Clear services, a real photo, honest fees, and a gentle first step, written the way you actually speak.',
        },
        {
            icon: 'mail',
            title: 'A considered contact form',
            body:
                'What they are looking for, availability, insurance or self-pay: enough for a useful first reply, without asking a stranger to over-disclose in a text box.',
        },
        {
            icon: 'book',
            title: 'Resource pages for clients',
            body:
                'The grounding exercise, the reading list, the crisis numbers: pages you can send after a session instead of a photocopied handout that gets lost.',
        },
        {
            icon: 'calendar',
            title: 'Consultation scheduling',
            body:
                'Offer your free 15-minute consult slots and let people request one, so the first phone tag happens zero times instead of three.',
        },
        {
            icon: 'pen',
            title: 'Fees and policies, stated plainly',
            body:
                'Session fees, sliding scale, cancellation policy, superbills: laid out clearly so the money conversation is half-done before the first session.',
        },
        {
            icon: 'users',
            title: 'Group and workshop pages',
            body:
                'A page per group or workshop with dates, format, and a sign-up form, published when enrollment opens and unpublished when it fills.',
        },
    ],

    splitHeading: 'Your practice, described in your voice',
    splits: [
        {
            title: 'Say who you help and how you work',
            art: 'describe',
            body: [
                '"I see adults dealing with anxiety and burnout. Warm but not saccharine. I want visitors to feel that it is safe to reach out." A designer would charge four figures to interpret that; here it is simply the prompt.',
                'The site appears in a live preview, and you refine the wording and feel sentence by sentence until it reads like you.',
            ],
        },
        {
            title: 'Calm is a design decision',
            art: 'picker',
            body: [
                'Spacing, color, type, pace: click any element in the preview and adjust it directly, or describe the feeling ("softer", "more space", "less clinical") and let the builder translate.',
                'Every change is verified before it is called done, and every version is kept, so you can experiment without fear of breaking the site before Monday\'s sessions.',
            ],
        },
        {
            title: 'Private by default, public when you say so',
            art: 'publish',
            body: [
                'The site is a private draft until you choose to publish it to its own address. Contact form submissions are stored privately under your account, not emailed through a third-party plugin.',
                'And it is yours: download the files anytime and host them wherever your professional life takes you.',
            ],
        },
    ],

    promptsHeading: 'Prompts to begin with',
    prompts: [
        {
            title: 'Practice website',
            body: 'Services, approach, fees, and a gentle first step.',
            prompt:
                'Build a website for my private therapy practice. Sections: a calm hero that names who I help (adults with anxiety, grief, and life transitions), how I work in plain language, services with session length and fees including a sliding scale note, an about section with my credentials and photo placeholder, practical details (location, video sessions, insurance), and a contact form asking what they are seeking and their availability, with submissions saved privately for me. Soft, quiet design with generous whitespace.',
        },
        {
            title: 'Consultation requests',
            body: 'Free consult slots, requested without phone tag.',
            prompt:
                'Build a consultation request page for my therapy practice. I maintain a list of available 15-minute phone consultation slots each week. Visitors pick a slot, leave their first name, phone number, and what they are hoping to work on, and the slot becomes unavailable. I sign in to see requests, confirm or release slots, and add new ones. Store everything in my Puter account.',
        },
        {
            title: 'Client resource hub',
            body: 'Exercises and reading, one link per topic.',
            prompt:
                'Build a resource site I can share with therapy clients. Sections by topic (grounding techniques, sleep, anxiety, grief), each with short exercises written in a warm tone and a further-reading list I can edit. Include a prominent crisis resources section with hotline numbers. Let me sign in to add and edit resources easily. Calm, readable design, comfortable on phones.',
        },
        {
            title: 'Workshop page',
            body: 'One group, its dates, and a sign-up list.',
            prompt:
                'Build a page for my eight-week mindfulness group for adults. Sections: what the group is and who it suits, the eight weekly topics, dates, time, and location, the fee, and my background. Add a sign-up form (name, email, phone) that saves registrations privately and shows me a count against the 10-person limit, closing the form when full. Save it to my Puter account.',
        },
    ],

    faqHeading: 'What therapists ask before building',
    faq: [
        {
            q: 'Is this appropriate for confidential client information?',
            a: [
                'Treat it as your public-facing practice, not your clinical records system. It is excellent for the website, inquiries, scheduling consults, and shareable resources; session notes and treatment records belong in software that is explicitly contracted for that purpose under the regulations that apply to you, such as HIPAA in the United States.',
                'The contact form works like the ones on other practice sites: a visitor chooses what to share to start a conversation, and submissions are stored privately under your account rather than posted anywhere.',
            ],
        },
        {
            q: 'I am not technical at all. Honestly, how hard is this?',
            a: [
                'The interface is a conversation. You describe, it builds, you say what to adjust. The skill it rewards is knowing your practice and your people, which you have; the technical part is the builder\'s job, including checking its own work after every change.',
            ],
        },
        {
            q: 'What does it cost against a directory profile or a site builder plan?',
            a: [
                'Building and hosting are free with a Puter account. Directory profiles rent you a page in someone else\'s brand; site-builder plans bill monthly for templates. This is your own site, at its own address, at zero, with the files downloadable if you ever want to host elsewhere.',
            ],
        },
        {
            q: 'Can the site grow if I add a group practice later?',
            a: [
                'Yes. Adding a colleague\'s bio, a second location, or a groups page is a sentence each, whenever it happens. Nothing about the first version constrains the fifth; it is your site, revised in conversation, with every previous version kept.',
            ],
        },
    ],

    ctaHeading: 'Describe the practice you have built',
    ctaBody: 'Write three sentences about who you help and how it feels to work with you. That is the whole brief.',

    related: ['for', 'for/personal-trainers', 'for/tutors', 'what-to-build'],
});
