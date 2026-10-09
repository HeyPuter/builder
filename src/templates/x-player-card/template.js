// X Player Card: a static page whose link, posted on X, shows a box people can
// use inside the post. index.html carries the card tags and is itself what
// plays inside the card. No backend. See src/templates/index.js for the shape.
export default {
    slug: 'x-player-card',
    name: 'X Player Card',
    category: 'Website',
    description: 'A page that shows something interactive inside an X post when you share its link.',
    updated: '2026-10-09',
    workers: [],

    suggestions: [
        { label: 'Set my published address', prompt: 'Replace https://your-site.puter.site in every card tag in index.html with my published address, which is: ' },
        { label: 'Put my app in the card', prompt: 'Replace this page with my own app, keeping the card tags in the head. It plays inside a 480 by 480 box on X. Here is what it does: ' },
        { label: 'Show a video instead', prompt: 'Replace this page with a video player that fills the 480 by 480 card box, keeping the card tags in the head. I will upload the video file.' },
        { label: 'Change the card text', prompt: 'Change the card title, description and the @yourhandle tag to match my project and my X account.' },
        { label: 'Use my preview image', prompt: 'Use the image I upload as preview.png, the picture X shows before someone presses play, and keep it square.' },
    ],

    // Kept in every fork's system prompt (see src/templates/index.js), so the
    // page stays a working Player Card whatever the user turns it into.
    instructions: [
        'This project is an X (Twitter) Player Card: when the page\'s link is posted on X, X plays the page itself inside a 480 by 480 card. Whatever the user changes, keep that working:',
        '- Keep every twitter:* meta tag (card, site, title, description, image, player, player:width, player:height) written directly in the <head> of index.html. X does not run JavaScript, so never add or change them from a script.',
        '- twitter:player must be the page\'s own full https:// address, and twitter:image a full https:// address too; X does not accept relative paths. A new copy\'s card tags still point at the template\'s site, not the user\'s, so after the user publishes, ask for their published address and update every card tag to it.',
        '- When the page or the user\'s content changes, update twitter:title and twitter:description to match. If the preview image changes, raise the ?v= number on the twitter:image address (?v=2, then ?v=3, and so on).',
        '- X keeps its first copy of a card for each link, so an updated page still shows the old card on X. Every time the user publishes an update, tell them to post the link with a new ?v= number at the end (their address plus ?v=2, then ?v=3, and so on), or X shows the old version.',
        '- The steps, the "Make your own" buttons and the links to the template\'s page are only the template\'s placeholder content. When the user puts in their own content, replace them; do not keep links to the template or to Puter AI Builder unless the user asks.',
        '- The page must work inside a 480 by 480 frame: the most important content fits in the first 480 pixels, links open in a new tab (target="_blank"), and the .in-frame scrolling in index.html and styles.css stays in place so the card can scroll.',
        '- Keep the page free of anything that blocks framing, such as an X-Frame-Options or frame-ancestors setting.',
    ].join('\n'),

    page: {
        title: 'X Player Card Template: Put Something Interactive in a Post',
        description:
            'A free template for an X (Twitter) Player Card. Share one link and your app or video plays inside the post. Copy it, customize it and publish it for free.',
        ogTagline: 'Something people can use inside an X post',
        lead:
            'A page that shows a working card inside an X post. Copy it, put your own app or video in the card, publish, and post the link on X.',
        features: [
            { icon: 'layout', title: 'Plays inside the post', body: 'People use your app or watch your video without leaving X.' },
            { icon: 'wand', title: 'Works as soon as you publish', body: 'The card shows the steps to make your own until you put your own content in it.' },
            { icon: 'globe', title: 'Ready to publish', body: 'Publish it from the builder and post the link. No hosting setup.' },
            { icon: 'check', title: 'Card tags already set', body: 'The tags X needs are written for you. Change the title and image to yours.' },
        ],
        faq: [
            {
                q: 'What is an X Player Card?',
                a: [
                    'It is a type of link preview on X (formerly Twitter). Instead of a picture and a title, the post shows a box that loads a web page in a frame, so people can play or watch without leaving their feed. X shows it when the linked page has twitter:card set to player and a twitter:player address.',
                ],
            },
            {
                q: 'Why do I have to add my published address after publishing?',
                a: [
                    'X needs full https:// addresses in the card tags, and your site does not have one until you publish it. Publish once, then ask the builder to replace https://your-site.puter.site with your address. The published page shows whether the tags match.',
                ],
            },
            {
                q: 'Why does the card not play on my phone?',
                a: [
                    'The X phone apps usually show the preview image with a play button rather than the box itself. Check your post in a desktop browser first, where the card plays inline.',
                ],
            },
            {
                q: 'I fixed the card but X still shows the old one. What now?',
                a: [
                    'X keeps its first copy of a card for each link. Post the link again with something added to the end, like ?v=2, and X reads the page fresh.',
                ],
            },
            {
                q: 'Can I put an app in a Player Card?',
                a: [
                    'X’s rules say Player Cards are for video and audio. A card with an app in it works, but X can turn it into a plain link at any time. Test from a protected account first if you want to see the card before anyone else does.',
                ],
            },
        ],
    },
};
