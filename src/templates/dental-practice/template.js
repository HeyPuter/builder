// Dental practice: a one-page static site for a dentist, with no backend. The
// practice details, hours, the dentist's bio and training, treatments and
// prices, smile gallery cases, insurance plans, membership plan, reviews, FAQ
// and where booking requests go are plain data at the top of files/app.js.
// Photos are CC0 stock (Unsplash via Wikimedia Commons) standing in for the
// dentist's portrait, office and patient photos. See src/templates/index.js
// for the shape.
export default {
    slug: 'dental-practice',
    name: 'Dentist Website',
    category: 'Website',
    description: 'A one-page site for a dentist, with a bio and credentials, before and after smile gallery, insurance checker and booking request form.',
    updated: '2026-10-12',
    workers: [],

    suggestions: [
        { label: 'Make it my practice', prompt: 'Change the practice name, dentist name and degree, phone, emergency line, email, address, hours and time zone to mine. Here are my details: ' },
        { label: 'Add my bio and photo', prompt: 'Replace the sample bio, training and memberships with mine, and use my headshot. I will upload the photo. Here is my background: ' },
        { label: 'Set my treatments and prices', prompt: 'Update the treatments, their "from" prices, chair time and visits, and the membership plan to match my practice: ' },
        { label: 'Use my smile cases', prompt: 'Replace the sample smile gallery with my own cases. I will upload a before and an after photo for each and tell you the treatment, visits and time taken.' },
        { label: 'Save booking requests', prompt: 'Make the booking form save each request instead of opening an email, and add a private page where only my front desk can read them, filtered by reason and day, without storing health details.' },
    ],

    // Kept in every fork's system prompt (see src/templates/index.js).
    instructions: [
        'This project is a website for a dental practice. Content lives as data at the top of app.js; keep it there when making changes:',
        '- PRACTICE holds the name, dentist, phone, emergency line, email, address, license and time zone, and fills every place they appear. Change contact details there, not in the HTML. When the practice, dentist or treatments change, also update the <title> and meta description in index.html, which are static.',
        '- HOURS drives the open-now line, the hours table and the days the booking form offers, in PRACTICE.timeZone.',
        '- INSURANCE is the list the insurance checker and the booking form read. Each booking REASON names a TEAM member, and the form sends to that person, or to PRACTICE.email when they have no email. Keep this routing when adding reasons or people.',
        '- The bio, training, memberships, license number, reviews, rating, review count and smile gallery are placeholders, and SAMPLE_CONTENT = true labels them as samples on the page. Never invent credentials, licenses, reviews, ratings or patient results for a real dentist; ask for real ones, or remove what they do not have. Set SAMPLE_CONTENT to false only once these are the dentist\'s own.',
        '- Smile gallery photos must be real patients of the practice, used with their consent. The sample "before" images are the "after" photo with a tint (sampleTint); never fake a before image for real cases.',
        '- The booking form must not collect health details (symptoms, history, medications), which fall under privacy rules like HIPAA. Keep the note asking visitors to leave them out. If asked to save requests or add health questions, store only contact and scheduling details and tell the user they need a compliant intake system for the rest.',
        '- The photos in photos/ are stock images. Suggest replacing them with the dentist\'s headshot and the office.',
        '- Keep the emergency number visible, and the call, emergency and book buttons easy to reach on a phone, including the bar fixed to the bottom of small screens.',
    ].join('\n'),

    page: {
        title: 'Dentist Website Template, Free to Edit With AI',
        description:
            'A one-page website for a dentist or dental practice, with a bio and credentials, treatments and prices, a before and after smile gallery and a booking form.',
        ogTagline: 'A dentist website patients can book from',
        lead:
            'A one-page site for a dentist. It introduces you with your training and memberships, lists your treatments with prices and chair time, shows before and after cases with a drag slider, tells visitors whether you take their insurance, and takes booking requests for a day and time of day. Copy it, then describe your practice and the page changes to fit.',
        features: [
            { icon: 'users', title: 'About the dentist', body: 'A portrait, a short note in your own words, your training timeline, memberships and license, so patients know who they will see.' },
            { icon: 'camera', title: 'Before and after gallery', body: 'Each case has a slider that patients drag to compare, with the treatment, number of visits and time taken.' },
            { icon: 'shieldCheck', title: 'Insurance checker', body: 'A visitor picks their plan and sees whether you are in network, and what happens if you are not. Patients without insurance see your membership plan.' },
            { icon: 'calendar', title: 'Booking requests', body: 'Patients pick a reason, a day from your open days and a time of day. The request goes to the person who handles that reason.' },
            { icon: 'clock', title: 'Live opening hours', body: 'The page shows whether you are open right now in your own time zone, and highlights today in the hours table.' },
            { icon: 'phone', title: 'Emergency line on every screen', body: 'The emergency number sits in the top bar, the visit card and the bar at the bottom of phone screens.' },
        ],
        faq: [
            {
                q: 'Where do booking requests go?',
                a: [
                    'As copied, the form opens the patient’s email app with a request to the person who handles that reason, such as the front desk or the dentist. Ask the builder to save requests instead and it adds a private page where your team reads them.',
                    'Do not collect medical history or other health details through the form unless your setup meets the privacy rules that apply to your practice, such as HIPAA in the US.',
                ],
            },
            {
                q: 'Are the bio, reviews and smile cases real?',
                a: [
                    'No. The dentist, bio, credentials, reviews and rating are placeholders, the photos are free stock images, and each sample "before" photo is the "after" photo with a tint. The page labels them as samples until you replace them with your own, and patient photos need the patient’s consent.',
                ],
            },
            {
                q: 'Does it work for orthodontists or a group practice?',
                a: [
                    'Yes. Describe your practice and the builder changes the treatments, the about section and the booking reasons. Ask it to add a team section with a card for each dentist and hygienist.',
                ],
            },
        ],
    },
};
