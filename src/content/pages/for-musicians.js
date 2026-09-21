import { verticalPage } from '../verticals.js';

export default verticalPage({
    slug: 'musicians',
    navLabel: 'Musicians',

    title: 'Website Builder for Musicians and Bands | Puter',
    description:
        'An artist website with your music, shows, press kit, and a mailing list you own, built from a description of your sound and published free. No platform rent.',
    ogTagline: 'Your music, your site, your list',

    eyebrow: 'For musicians',
    h1: 'A band site the algorithm cannot take away',
    lead:
        'Streaming platforms own the play button, socials own the feed, and neither owns you a living. Describe your sound in plain English and get the one piece of internet that is actually yours: shows, releases, a press kit bookers open, and a mailing list nobody can throttle.',

    demo: {
        prompt: 'Build a site for my band with our shows, music links, and a mailing list',
        app: {
            name: 'thelowtides.puter.site',
            header: 'The Low Tides',
            blocks: [
                {
                    kind: 'stats',
                    items: [
                        { value: '6', label: 'Shows booked' },
                        { value: '214', label: 'List signups' },
                        { value: 'Oct 4', label: 'Single drops' },
                    ],
                },
                {
                    kind: 'list',
                    rows: [
                        { title: 'The Blue Room', sub: 'Oct 12 · Portland', tag: 'Tickets' },
                        { title: 'Harvest Fest', sub: 'Oct 19 · Salem', tag: 'Free' },
                        { title: 'KEXP session', sub: 'Nov 2 · in studio', tag: 'Live' },
                    ],
                },
            ],
        },
    },

    useCasesHeading: 'What artists build here',
    useCasesIntro:
        'The pieces of a music career that should not live on rented land, each built to sound like you.',
    useCases: [
        {
            icon: 'music',
            title: 'An artist site with an actual aesthetic',
            body:
                'Your sound has a look; the site should have it too. Describe the mood like liner notes and get a design that matches the record, not a template that matches everyone\'s.',
        },
        {
            icon: 'calendar',
            title: 'A show calendar you update from the van',
            body:
                'Dates, venues, cities, and ticket links, added in a sentence when the booking confirms. Past shows archive themselves; the next one is always on top.',
        },
        {
            icon: 'file',
            title: 'A press kit bookers actually open',
            body:
                'Bio, photos, streaming numbers, stage plot, and one contact, on a single fast page instead of a 40MB email attachment. Send one link; get booked.',
        },
        {
            icon: 'mail',
            title: 'A mailing list that belongs to you',
            body:
                'The signup form feeds a list you can export and take anywhere. Two hundred emails you own beat two thousand followers an algorithm decides who sees.',
        },
        {
            icon: 'star',
            title: 'Release pages worth the link',
            body:
                'Each single or record gets its own page: artwork, the story behind it, credits, and every streaming link in one place. The link you post everywhere on release day.',
        },
        {
            icon: 'camera',
            title: 'Photos and video, curated',
            body:
                'The live shots and clips that actually represent the band, chosen by you, not whatever the tagged-photos tab dredged up for a promoter doing homework.',
        },
    ],

    splitHeading: 'From liner notes to live site',
    splits: [
        {
            title: 'Describe the sound, get the look',
            art: 'describe',
            body: [
                '"Surf-tinged indie rock, warm and a little melancholy, grainy photos, cream and deep blue, type like a 70s record sleeve." That brief is enough to build from.',
                'Then tune it like a mix: click what is off in the live preview and say what to change, until the site sounds like the band looks.',
            ],
        },
        {
            title: 'Everything exports, including the fans',
            art: 'files',
            body: [
                'The site is ordinary web files you can download and host anywhere, and the mailing list exports whenever you want it. Nothing about your audience is held hostage to a platform\'s pricing tier.',
                'Bands break up, rebrand, and change hosting. Your work should survive all three.',
            ],
        },
        {
            title: 'Live before the merch table is packed',
            art: 'publish',
            body: [
                'Publish in one click and the address is ready for the poster QR code, the bio link, and the back of the setlist. Announce the show, drop the single page, update the calendar, all from a phone in the green room.',
                'Unpublish or rework any of it just as fast. Release cycles move; the site keeps up.',
            ],
        },
    ],

    promptsHeading: 'Prompts to soundcheck',
    prompts: [
        {
            title: 'Band website',
            body: 'The sound, the shows, the music, and the list.',
            prompt:
                'Build a website for my indie rock band, The Low Tides. Sections: a full-bleed hero with our name and one line about the sound, an upcoming shows list with dates, venues, cities, and ticket links that I can update easily, a music section with our releases and streaming links, an about section with our story and a photo area, a mailing list signup (name and email) that saves subscribers for me to export, and a contact line for booking. Moody, analog design, cream and deep blue, type like a vintage record sleeve.',
        },
        {
            title: 'Electronic press kit',
            body: 'One link that gets the band booked.',
            prompt:
                'Build a one-page electronic press kit for my band. Sections: a short third-person bio in two lengths (one line and one paragraph), high-res photo areas with a note that they are download-friendly, three highlight numbers I can edit (monthly listeners, biggest show, radio play), two embedded-style quotes from press, a live video link section, a stage plot and tech rider section as a simple list, and one booking contact. Clean, fast, and printable, so a promoter can skim it in 60 seconds.',
        },
        {
            title: 'Show calendar manager',
            body: 'Confirmed dates in, tidy public calendar out.',
            prompt:
                'Build a show calendar tool for my band. I sign in and add shows with a date, venue, city, ticket link, and a flag for free or ticketed. The public page lists upcoming shows soonest first and moves past shows into an archive section automatically. Let me mark a show as sold out, cancel one with a visible note, and export the list as CSV for our booker. Keep everything in my Puter account.',
        },
        {
            title: 'Single release page',
            body: 'One song, its story, and every place to hear it.',
            prompt:
                'Build a release page for our new single "Undertow", out October 4. Sections: the cover art large, a one-paragraph story about the song, buttons linking to it on the streaming services (I will paste the links), credits (written, recorded, mixed, mastered by), a lyrics section, and a mailing list signup that saves emails so fans hear about the next one first. Dark, atmospheric design built around the artwork.',
        },
    ],

    faqHeading: 'Backstage questions',
    faq: [
        {
            q: 'Why not just a link-in-bio tool and the socials?',
            a: [
                'Those are distribution, not a home. A link tool cannot hold a press kit, a show archive, or a story, and the socials show your posts to whoever the feed favors this week. The site is where bookers, press, and superfans land when they want more than 15 seconds, and it feeds the mailing list, which is the only audience channel you fully own.',
            ],
        },
        {
            q: 'Can people play our music on the site?',
            a: [
                'The honest setup: the site links to your music where it already lives and pays (streaming platforms, Bandcamp) and can host short clips you own outright for previews. Full self-hosted streaming is possible since you own the files, but for most bands the link-out keeps the play counts where they count.',
            ],
        },
        {
            q: 'Who owns the mailing list, really?',
            a: [
                'You. Signups are stored under your own account, exportable to CSV whenever you like, and no one emails your fans but you. If you graduate to a dedicated email service later, the list moves with you in one export.',
            ],
        },
        {
            q: 'We have no budget. What is the actual cost?',
            a: [
                'Zero: building, publishing, and hosting on a puter.site address are free with a Puter account. The typical alternative is a website-builder subscription that costs more per year than a run of tour posters. Spend the difference on the posters.',
            ],
        },
    ],

    ctaHeading: 'Describe your sound and your next show',
    ctaBody: 'Write it like liner notes. The site comes back looking like the record.',

    related: ['for', 'for/photographers', 'for/event-planners', 'what-to-build'],
});
