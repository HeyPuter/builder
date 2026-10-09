// AI image studio: text-to-image with style, shape and quality options, and a
// gallery saved per user (image files in their Puter storage, the list in
// their key-value store). No backend of its own: each person signs in with
// Puter and their usage and storage are their own.
export default {
    slug: 'ai-image-studio',
    name: 'AI Image Studio',
    category: 'App',
    description: 'Turn prompts into images, with styles, shapes and a private gallery.',
    updated: '2026-10-08',
    workers: [],

    suggestions: [
        { label: 'Edit an uploaded photo', prompt: 'Let me upload a photo and describe a change, like "make it winter" or "turn it into a watercolor", and create a new image from it.' },
        { label: 'Add a model picker', prompt: 'Add a menu to the create panel to choose which AI image model to use, and remember my choice.' },
        { label: 'Make several at once', prompt: 'Add a count option from 1 to 4, so one prompt creates that many variations side by side.' },
        { label: 'Add collections', prompt: 'Let me organize my images into named collections, with a filter above the gallery to show one collection at a time.' },
        { label: 'Add a light mode', prompt: 'Add a light mode that follows my system setting, with a toggle in the header that remembers my choice.' },
    ],

    page: {
        title: 'AI Image Generator Template With Styles and a Saved Gallery',
        description:
            'A ready-made AI image generator with style presets, aspect ratios, prompt enhancement and a gallery saved to each user’s own account. Copy it and make it your own.',
        ogTagline: 'Your own AI image generator, ready to change',
        lead:
            'Describe an image, pick a style and a shape, and watch it appear in a gallery that follows each person across devices. Copy it, then turn it into a logo maker, a sticker studio, a product photo tool or anything else that starts with a picture.',
        features: [
            { icon: 'wand', title: 'Styles and shapes', body: 'Eight style presets from photo to pixel art, four aspect ratios, and three quality levels, all one click away.' },
            { icon: 'sparkles', title: 'Prompt help', body: 'Enhance turns a few words into a detailed prompt with AI, and Surprise me fills in an idea when you need one.' },
            { icon: 'folder', title: 'Saved gallery', body: 'Every image is saved to the signed-in person’s own Puter storage, with search, a full-screen viewer and downloads.' },
            { icon: 'lock', title: 'Private by design', body: 'People sign in with their own Puter account, so their images and AI usage are theirs, not yours.' },
        ],
        faq: [
            {
                q: 'Who pays for the images people create?',
                a: [
                    'Each person who uses it signs in with their own Puter account, and their usage is covered by that account. Your costs as the maker do not grow with the number of images created.',
                ],
            },
            {
                q: 'Can I make it for a specific kind of image?',
                a: [
                    'Yes. Describe what you want, for example a logo maker, a children’s book illustrator or a tool for product photos, and the builder changes the styles, example prompts and design to match.',
                ],
            },
            {
                q: 'Where are the images stored?',
                a: [
                    'In the storage of whoever made them: each image is a file in their own Puter account, and the gallery list sits in their key-value store. Nothing is shared with you or with other people using the app.',
                ],
            },
        ],
    },
};
