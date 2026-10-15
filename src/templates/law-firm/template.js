// Law firm: a one-page static site for a small law firm or solo lawyer, with no
// backend. The firm's details, jurisdiction, attorneys and their credentials,
// practice areas, consultation terms, reviews and FAQ are plain data at the top
// of files/app.js. Photos are free stock images standing in for the firm's own
// portraits and office. See scripts/build-templates.mjs for the shape.
export default {
    slug: 'law-firm',
    name: 'Law Firm Website',
    category: 'Website',
    description: 'Law firms and solo lawyers get consultation requests through this site.',
    updated: '2026-10-12',
    workers: [],

    suggestions: [
        { label: 'Make it my firm', prompt: 'Change the firm name, phone, email, hours, address, the state we are licensed in, the counties and courts we cover, and our practice areas to mine. Here are my details: ' },
        { label: 'Add my attorneys', prompt: 'Replace the sample attorneys with ours. I will upload a portrait of each and give you their name, title, bar admissions, education and memberships.' },
        { label: 'Use my booking page', prompt: 'Send every "Book a consultation" button to my booking page instead of the form. The link is: ' },
        { label: 'Save requests', prompt: 'Make the consultation form save each request instead of opening an email, and add a private page where only I can read them, filtered by practice area.' },
        { label: 'Add a page per area', prompt: 'Give each practice area its own page with a longer explanation, the fee, the usual timeline and its own questions, linked from the practice area cards.' },
    ],

    // Kept in every fork's system prompt (see scripts/build-templates.mjs).
    instructions: [
        'This project is a website for a law firm. Content lives as data at the top of app.js; keep it there when making changes:',
        '- FIRM holds the name, contact details, booking link (consultUrl), the attorney advertising label and the disclaimers, and fills every place they appear. JURISDICTION holds the state, counties and courts. Change them there, not in the HTML. When the firm, its location or its practice areas change, also update the <title>, meta description, hero headline and hero text in index.html, which are static.',
        '- Each PRACTICE area names the ATTORNEYS id of the lawyer who handles it. The "What is going on?" picker (SITUATIONS) and the consultation form both route by it. Keep this routing when adding areas or lawyers.',
        '- The firm, attorneys, bar admissions, schools, memberships, certifications, fees and reviews are samples, and SAMPLE_CONTENT = true labels them on the page. Never invent credentials, bar numbers, certifications, case results, reviews or fees for the user\'s real firm; ask for real ones, or remove what they do not have. Set SAMPLE_CONTENT to false only once they are the user\'s own.',
        '- Keep the disclaimer that contacting the firm does not create an attorney-client relationship, the results disclaimer near reviews, and the form\'s warning not to send confidential details. Lawyer advertising rules vary by state; when the user adds testimonials, case results or words like "specialist" or "expert", remind them to check their state bar\'s rules.',
        '- The photos in photos/ are stock images. Suggest replacing them with real portraits and office photos.',
        '- Keep the call and consultation buttons easy to reach on a phone, including the bar fixed to the bottom of small screens.',
    ].join('\n'),

    page: {
        title: 'Free Law Firm Website Template to Edit With AI',
        description:
            'Law firms and solo lawyers present practice areas, attorney bios and bar admissions here, and take new matters through an intake form.',
        ogTagline: 'A law firm website that books consultations',
        features: [
            { icon: 'search', title: 'A "what is going on?" picker', body: 'A visitor picks their situation and sees the practice area, the lawyer who handles it, the fee, a likely timeline and what to bring.' },
            { icon: 'users', title: 'Attorney bios with credentials', body: 'Each lawyer has a portrait, a focus, a short bio, bar admissions, education and memberships.' },
            { icon: 'mapPin', title: 'Jurisdiction', body: 'The state you are licensed in, the counties you cover and the courts you appear in, so visitors know whether you can take their case.' },
            { icon: 'calendar', title: 'Consultation details', body: 'The length, fee and format of a first meeting, the next openings, and a link to your booking page if you have one.' },
            { icon: 'mail', title: 'Intake form with a conflict check', body: 'The form asks for the other people involved, warns visitors not to send confidential details, and goes to the lawyer for that practice area.' },
            { icon: 'pen', title: 'Disclaimers included', body: 'An attorney advertising label, a no attorney-client relationship notice and a past results disclaimer, each editable in one place.' },
        ],
        faq: [
            {
                q: 'Where do consultation requests go?',
                a: [
                    'As copied, the form opens the visitor’s email app with a message to the lawyer for that practice area. If you use a booking page such as Calendly or Clio Grow, add its link and every consultation button opens it. Ask the builder to save requests instead and it adds a private page where you read them.',
                ],
            },
            {
                q: 'Are the attorneys and reviews real?',
                a: [
                    'No. The firm, the lawyers, their credentials and the reviews are placeholders, and the photos are free stock images. Replace them with your own before you publish.',
                ],
            },
            {
                q: 'Does it follow lawyer advertising rules?',
                a: [
                    'It includes an attorney advertising label and the usual disclaimers, but the rules differ by state, especially for testimonials, case results and words like "specialist". Check your state bar’s rules before you publish. The template is not legal advice.',
                ],
            },
        ],
    },
};
