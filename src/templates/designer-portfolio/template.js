// Designer portfolio: a one-page static site for a graphic designer and 3D
// artist, with no backend. Projects, services and work history are plain lists
// at the top of files/app.js. See scripts/build-templates.mjs for the shape.
export default {
    slug: 'designer-portfolio',
    name: 'Graphic Designer Portfolio',
    category: 'Website',
    description: 'Graphic designers can show their best work here.',
    updated: '2026-10-09',
    workers: [],

    suggestions: [
        { label: 'Make it my portfolio', prompt: 'Rewrite the portfolio with my name, contact details, bio and work history. Here is who I am and what I do: ' },
        { label: 'Use my project images', prompt: 'Replace the drawn project covers with my own images. I will upload one image for each project.' },
        { label: 'Add case study pages', prompt: 'Give each project its own case study page with a large image, the brief, the process and the result, opened from its card.' },
        { label: 'Add a contact form', prompt: 'Add a contact form to the Say hello section that saves each message, and a private page where only I can read them.' },
        { label: 'Change the colors', prompt: 'Change the red and orange palette to deep blue and lemon yellow across the whole page, including the hero and the work section.' },
    ],

    page: {
        title: 'Free Graphic Designer Portfolio Template to Edit With AI',
        description:
            'Graphic designers and 3D artists can present projects, services and work history on this portfolio, with a contact section at the end.',
        ogTagline: 'A portfolio site with a point of view',
        features: [
            { icon: 'layout', title: 'Every section a portfolio needs', body: 'Hero with contact details, a project index, project cards, services with typical timelines, a bio with work history, and a contact section.' },
            { icon: 'file', title: 'Specs on every project', body: 'Each card lists format, production method and year, the details art directors and printers ask about first.' },
            { icon: 'pen', title: 'Content kept in one place', body: 'Projects, services and history are plain lists at the top of the script. Add a project there and it shows in the index and the grid.' },
            { icon: 'phone', title: 'Works on a phone', body: 'The hero, the work index and the project grid rearrange into one column on small screens.' },
        ],
        faq: [
            {
                q: 'Can I show my real work instead of the drawn covers?',
                a: [
                    'Yes. The covers as copied are drawn shapes standing in for project images. Upload your images and ask the builder to use them, or give a project an image path in the script.',
                ],
            },
            {
                q: 'Does the contact section have a form?',
                a: [
                    'Not as copied. It shows your email with a copy button, your phone number and your links. Ask the builder for a contact form and it adds one that saves messages to your account.',
                ],
            },
        ],
    },
};
