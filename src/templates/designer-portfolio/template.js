// Designer portfolio: a one-page static site for a graphic designer and 3D
// artist, with no backend. Projects, services and work history are plain lists
// at the top of files/app.js. See src/templates/index.js for the shape.
export default {
    slug: 'designer-portfolio',
    name: 'Designer Portfolio',
    category: 'Website',
    description: 'A one-page portfolio for a graphic designer, with project cards, services and contact.',
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
        title: 'Graphic Designer Portfolio Template, Free to Edit With AI',
        description:
            'A one-page portfolio site for graphic designers and 3D artists, with project cards, services, work history and contact. Copy it and make it yours.',
        ogTagline: 'A portfolio site with a point of view',
        lead:
            'A hero laid out like a printer’s proof sheet, with your name set large and your best projects fanned out beside it, a work index printed on a typewriter roll, six project cards with print specs, a services list, a short bio and a contact section. Copy it, then describe your own work and the page changes to fit.',
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
