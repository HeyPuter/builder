export default {
    slug: 'hair-salon',
    name: 'Hair Salon',
    category: 'Website',
    description: 'A soft, editorial one-page site for a hair studio: a menu priced by stylist level, the team, a lookbook and booking requests.',
    updated: '2026-10-15',
    workers: [],
    suggestions: [
        {
            label: 'Use my salon details',
            prompt: 'Replace the sample salon with mine. Name: [salon name]. Address: [street, city]. Phone: [phone]. Email: [email]. Instagram: [handle]. Opening hours: [days and times]. Keep the layout and colors.',
        },
        {
            label: 'Update the price menu',
            prompt: 'Update the service menu with my real services. For each one I will give the name, a one-line description, the time it takes and the price at each stylist level: [list]. Remove any services I do not list.',
        },
        {
            label: 'Introduce my team',
            prompt: 'Replace the sample stylists with my team. For each person: name, level (stylist, senior or director), role, specialties, the days they work and a two-sentence bio: [team]. I will upload their photos next.',
        },
        {
            label: 'Send requests to my inbox',
            prompt: 'Booking requests currently open the guest\'s email app. Send them to my form endpoint instead so they arrive without the guest sending an email: [endpoint URL].',
        },
        {
            label: 'Match my brand colors',
            prompt: 'Restyle the site in my brand colors: [colors]. Keep the warm, editorial feel, the serif headings and good contrast for reading.',
        },
    ],
    instructions: 'This is a one-page hair salon site. Its content is plain data at the top of app.js: SALON (business details and an optional bookingEndpoint), STATS, POPULAR, OFFER, HOURS, BOOKING, LEVELS, CATEGORIES, SERVICES (each price is a list with one entry per level, in LEVELS order, or null for consult-only), SPECIALTIES, STYLISTS, FIRST_VISIT, COLOR_PREP, LOOKS, REVIEWS, VISIT_NOTES and POLICY. Edit that data rather than hard-coding content in index.html, and keep ids consistent: POPULAR, services, stylists, looks and reviews refer to each other by id. The menu, the quick-add chips, the booking form and the estimate all read from SERVICES and LEVELS, so a price change belongs there only. The giant name in the hero and footer is SALON.name, sized to fit by fitWordmarks(). The hero photo is two stacked layers, photos/hero.jpg and photos/hero-cutout.webp (the same photo with its background removed), so the name sits behind the person. If the user replaces the hero photo, also remove the hero-cut image from index.html unless they supply a matching cut-out, or the old person will cover the new photo. The booking form sends a request, never a confirmed appointment: keep that wording honest, and keep it working without a backend (it opens an email when bookingEndpoint is empty). Photos live in photos/; when the user uploads their own, replace the matching file or update its path in the data. The business, team and reviews are samples to replace with the user\'s own.',
    page: {
        title: 'Hair Salon Website Template: Menu, Team and Booking',
        description: 'A hair salon website template with a service menu priced by stylist level, stylist profiles, a lookbook, reviews and a booking request form. Make it yours with AI.',
        ogTagline: 'Menu, team and booking in one page',
        features: [
            {
                title: 'A menu priced by stylist level',
                body: 'Services sit in tabs for cuts, color, curls and treatments. Switch between stylist, senior and director and every price on the menu updates.',
            },
            {
                title: 'Build a visit in a few taps',
                body: 'Guests add services from the menu or the popular picks in the hero. A tray keeps count of the time and price, and carries the visit into the booking form.',
            },
            {
                title: 'Stylists guests can choose',
                body: 'Each stylist has a photo, level, specialties, the days they work and a short bio. Guests can filter by specialty and book with one person directly.',
            },
            {
                title: 'Booking requests that fit the day',
                body: 'Guests pick services, a stylist and a day, and see only start times that fit before closing. The request goes to your email or to a form endpoint.',
            },
            {
                title: 'A first visit, explained',
                body: 'Four steps from consultation to finish, a new guest offer that the estimate applies, and a checklist for color appointments.',
            },
            {
                title: 'Lookbook, reviews and hours',
                body: 'A filterable gallery with a full-screen viewer, reviews with a rating summary, and opening hours that show whether you are open right now.',
            },
        ],
        faq: [
            {
                q: 'How do booking requests reach the salon?',
                a: ['By default the form opens the guest\'s email app with the request written out, addressed to your salon. Give the builder a form endpoint, such as one from a form service or your own backend, and requests are posted there instead.'],
            },
            {
                q: 'Can I change the services, prices and stylist levels?',
                a: ['Yes. Tell the builder your services and what each level charges. The menu, the booking form and the price estimate all update from the same list, so they always agree.'],
            },
            {
                q: 'Does it work for a barbershop or a solo stylist?',
                a: ['Yes. Ask for one price level instead of three, a single stylist profile, or different service categories. Describe how you work and the builder adjusts the page.'],
            },
        ],
    },
};
