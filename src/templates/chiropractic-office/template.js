export default {
    slug: 'chiropractic-office',
    name: 'Chiropractic Office',
    category: 'Website',
    description: 'A chiropractic clinic site with a clickable spine map, a minute-by-minute first visit, clear fees and a booking request form.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        { label: 'Use my practice details', prompt: 'Replace the sample practice with mine. Name, address, phone, email and hours: ' },
        { label: 'Link my booking software', prompt: 'Send every Book a visit button to my online scheduling page instead of the request form. The link is: ' },
        { label: 'Add a concern to the spine map', prompt: 'Add jaw pain (TMJ) to the spine map, with what we check, typical care, a visit plan and a see-a-doctor-first note like the others.' },
        { label: 'Add a new patient special', prompt: 'Add a new patient special near the top of the page with an end date and fine print, and show it in the fees list too.' },
        { label: 'Switch to a calm blue palette', prompt: 'Change the colors to a calm blue palette while keeping the same contrast, layout and overall feel.' },
    ],
    instructions: [
        'This is a one-page website for a chiropractic office.',
        '- All practice content is plain data at the top of app.js: PRACTICE (contact details, time zone, form endpoint), HOURS, HERO_QUOTE, CONCERNS (the spine map), VISIT_STEPS, BRING, FEES, COVERAGE, MYTHS, TEAM and STORIES. Change content there, keeping each entry\'s shape, rather than editing the rendered HTML.',
        '- The hero and "Care with an end date" copy and the section headings are in index.html. Headings pair upright words with one italic word in <em> (for example "Where does it <em>hurt?</em>"); keep that pattern for new sections.',
        '- Spine map ranges use the vertebra ids C1-C7, T1-T12, L1-L5, S (sacrum) and Co (tailbone).',
        '- Keep a "see a doctor first" note on every concern and the medical disclaimer in the footer. Do not claim chiropractic treats or cures conditions outside the muscles, joints and nerves (such as asthma, ear infections, allergies or immunity), and do not promise outcomes.',
        '- Booking requests are sent as JSON to PRACTICE.formEndpoint when it is set; otherwise they open an email to PRACTICE.email.',
        '- SAMPLE_CONTENT labels the placeholder practice, reviews, rating and insurance answers. Set it to false only once the user has replaced them with real details.',
    ].join('\n'),
    page: {
        title: 'Chiropractic Office Website Template with a Spine Map',
        description: 'A free chiropractic website template with a clickable spine map, a minute-by-minute first visit, clear fees, a coverage check and a booking request form.',
        ogTagline: 'Spine map, first visit, fees and booking',
        features: [
            {
                title: 'A spine map for "where does it hurt?"',
                body: 'Tap a vertebra or pick one of eight common concerns to see what is usually behind it, what gets checked, typical care, a visit plan that tapers week by week and when to see a doctor first.',
            },
            {
                title: 'The first visit, minute by minute',
                body: 'A sixty-minute timeline from check-in to first treatment, plus what to bring, so new patients know exactly what to expect.',
            },
            {
                title: 'Clear fees and a coverage check',
                body: 'A price list with visit lengths, and a "How are you paying?" check with answers for self-pay, in-network plans, Medicare, car accident and workers\' comp claims.',
            },
            {
                title: 'Myths, answered',
                body: 'Six front-desk questions as cards that strike through what people have heard and show what actually happens.',
            },
            {
                title: 'Team and patient stories',
                body: 'Practitioner cards with focus areas and a "Book with" link, and a carousel of photo stories that say what each patient came in with and got back to.',
            },
            {
                title: 'Booking requests and live hours',
                body: 'A request form that buttons across the page prefill, sent to your inbox or a form endpoint, and an open-now status kept in the office\'s own time zone.',
            },
        ],
        faq: [
            {
                q: 'Can patients book appointments with it?',
                a: ['It takes booking requests. By default the form opens an email to the practice with every detail filled in, or it can send each request to a form endpoint you set. If you use scheduling software, ask the builder to point the Book buttons at your booking link instead.'],
            },
            {
                q: 'How do I change the conditions on the spine map?',
                a: ['Each concern is a short entry in app.js: the part of the spine it covers, what you check, typical care, a visit plan and a see-a-doctor-first note. Describe the change to the builder, for example "add jaw pain", and it edits that list.'],
            },
            {
                q: 'Are the reviews and insurance details real?',
                a: ['No. The practice, team, reviews, rating and insurance answers are samples, and the page labels them that way. Replace them with your own before you publish, then turn the sample labels off.'],
            },
        ],
    },
};
