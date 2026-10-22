export default {
    slug: 'electrical-contractor',
    name: 'Electrical Contractor',
    category: 'Website',
    description: 'A one-page site for an electrician, with a panel load planner, a service directory, a 24/7 emergency line and booking.',
    updated: '2026-10-22',
    workers: [],
    suggestions: [
        { label: 'Use my business details', prompt: 'Change the business name, phone, email, license number, hours and service area to mine. Ask me for anything you need.' },
        { label: 'Save bookings to a list', prompt: 'Save booking requests in my Puter account and add a private page where I can see them and mark each one as scheduled.' },
        { label: 'Add a project gallery', prompt: 'Add a recent projects gallery with before and after photos, each captioned with the job, the town and how long it took.' },
        { label: 'Add financing options', prompt: 'Add a financing section for bigger jobs like panel upgrades and rewires, with example monthly payments and how to apply.' },
        { label: 'Add a rebate checker', prompt: 'Add a section listing local rebates and tax credits for EV chargers, heat pumps and panel upgrades, and link it from the panel planner.' },
    ],
    instructions: [
        'This is a one-page site for an electrical contractor.',
        'Content lives as plain data at the top of app.js: BUSINESS (name, phone, email, license, hours…), FORM, SERVICES, PLANNER, PLATE, STEPS, REVIEWS, FAQ and AREA. Change content there; index.html holds the layout and the hero copy.',
        'Keep the look: a full-bleed photo hero with a dark wash and white cards overlapping its bottom edge, white and light-gray sections with deep navy, one red-orange accent (amber only for things that are switched on), square-cornered buttons, Archivo for text and IBM Plex Mono for small technical labels.',
        'The panel planner is a rough guide. Keep its disclaimer, keep demand compared against 80% of the main service, and keep amps and prices plausible when adding or editing loads.',
        'Keep the 24/7 emergency number in the header and the emergency notice under the hero prominent.',
        'The booking form works without a backend: it posts to FORM.endpoint when set and otherwise opens an email to BUSINESS.email. Keep that fallback unless the user asks for another way to receive requests.',
        'Photos live in photos/. When the user attaches their own photos, use them in place of the stock ones.',
    ].join('\n'),
    page: {
        title: 'Electrical Contractor Website Template with a Panel Planner',
        description: 'A free electrician website template with a panel load planner, a circuit-style service list, a 24/7 emergency strip and a booking form you edit with AI.',
        ogTagline: 'Panel planner, services and booking for electricians',
        features: [
            {
                title: 'A panel planner visitors can play with',
                body: 'Homeowners switch on an EV charger, heat pump, induction range or hot tub and see estimated demand against their main service, a plain verdict and a ballpark price.',
            },
            {
                title: 'Plans that arrive with the booking',
                body: 'One button carries the planner summary into the booking form, so the first call already knows the service size, the new loads and whether an upgrade is likely.',
            },
            {
                title: 'Services as a circuit directory',
                body: 'Eight services listed like the label inside a panel door. Picking one shows a photo, what is included, the usual time on site and where pricing starts.',
            },
            {
                title: 'Emergency help that stands out',
                body: 'A 24/7 number in the header and a notice under the hero that tells visitors what to do about burning smells, sparks or a warm panel before they call.',
            },
            {
                title: 'Credentials up front',
                body: 'A photo hero with a live next-opening chip and the on-call electrician, promise cards for the call fee, warranty and rating, and an equipment-style rating plate.',
            },
            {
                title: 'Booking without a backend',
                body: 'The form checks what it needs, then posts to a form service of your choice or opens a ready-to-send email. All content is plain data at the top of app.js.',
            },
        ],
        faq: [
            {
                q: 'Can I change the panel planner\'s numbers?',
                a: ['Yes. Service sizes, home baselines, each load\'s amps and price range, and the upgrade options are plain data at the top of app.js. Ask the builder to change them, or to add loads like a sauna or a second EV charger.'],
            },
            {
                q: 'Where do booking requests go?',
                a: ['Out of the box, the form opens the visitor\'s email app with the request filled in and addressed to your business email. Set a form endpoint at the top of app.js to receive requests as JSON instead, or ask the builder to save them in your Puter account.'],
            },
            {
                q: 'Can I use the photos?',
                a: ['Yes. They are CC0 and public domain photos from rawpixel and Flickr. Swap in photos of your own crew, vans and finished jobs when you have them: real photos earn more trust than stock.'],
            },
        ],
    },
};
