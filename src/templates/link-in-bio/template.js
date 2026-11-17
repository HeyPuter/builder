// Link in bio: a one-page site for the single link in a social profile, with no
// backend and no JavaScript. A photo, a name and bio, social icons and a stack
// of link buttons, each with a small photo or an icon. All content is plain
// HTML in files/index.html. See scripts/build-templates.mjs for the shape.
export default {
    slug: 'link-in-bio',
    name: 'Link in Bio',
    category: 'Website',
    description: 'One simple page for every link in your social bio, with your photo, social icons and link buttons.',
    updated: '2026-11-17',
    workers: [],

    suggestions: [
        { label: 'Make it my page', prompt: 'Rewrite the page with my name, handle, bio, social profiles and links. Here is who I am and where my links should go: ' },
        { label: 'Use my photo', prompt: 'Use the photo I upload as my profile picture at the top of the page.' },
        { label: 'Change the colors', prompt: 'Change the colors of the page to suit my style. Here is what I have in mind: ' },
        { label: 'Add an email sign-up', prompt: 'Add an email sign-up under the links that saves each address to my account, and a private page where only I can see the list.' },
        { label: 'Count link clicks', prompt: 'Count how many times each link on the page is clicked, and add a private page where only I can see the totals for each link.' },
    ],

    instructions: [
        'This is a simple link in bio page. Keep it simple unless the user asks for more: one column with a photo, a name, a short bio, social icons and link buttons.',
        'All content is plain HTML in index.html. Each link is an <li> in the .links list, starting with either a small photo (<img class="thumb">) or an icon (<span class="ico">) from the icon list at the end of index.html. Links to other sites open in a new tab.',
        'When the name, bio or purpose of the page changes, also update the <title>, the meta description and the og: tags. Those are what link previews in apps show.',
        'Most visitors arrive from a phone, inside an app\'s own browser. Keep tap targets at least 44px and compress uploaded photos to under 300 KB.',
        'The sample photos are AI-generated. Every image has a Source comment above it. When the user\'s own photo replaces one, change that comment to say it is the user\'s own photo.',
    ].join('\n'),

    page: {
        title: 'Free Link in Bio Template You Can Edit With AI',
        description:
            'A free link in bio template with your photo, a short bio, social icons and link buttons with pictures or icons. Publish it and put the link in your bio.',
        ogTagline: 'Every link in your bio, on a page that is yours',
        features: [
            { icon: 'link', title: 'Link buttons with pictures or icons', body: 'Each button can start with a small photo, such as a video thumbnail or a product, or with a simple icon.' },
            { icon: 'users', title: 'Your photo, bio and socials', body: 'A round profile photo, your name and a short bio sit at the top, with icons for your social profiles underneath.' },
            { icon: 'phone', title: 'Made for phones', body: 'Most people open a bio link on their phone, so the page is one column with large buttons that are easy to tap.' },
            { icon: 'code', title: 'Plain HTML', body: 'The page is one HTML file and one stylesheet with no JavaScript, so it loads fast and is easy to change.' },
        ],
        faq: [
            {
                q: 'What is a link in bio page?',
                a: ['It is one page that holds every link you want to share, so the single link in your Instagram or TikTok profile can lead to all of them. Visitors tap the link in your bio, land on this page and choose where to go.'],
            },
            {
                q: 'Can I see how many people click my links?',
                a: ['Not as copied. Ask the builder to count link clicks and it adds counting, with a private page that only you can open.'],
            },
            {
                q: 'Can I put it on my own domain?',
                a: ['Every published page gets its own puter.site address. Connecting a domain you own needs a paid Puter plan. Ask the builder to connect it after you publish, then add the DNS records it shows you at your domain provider.'],
            },
        ],
    },
};
