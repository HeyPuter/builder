// AI chat assistant: streaming replies from Puter's AI, conversations saved
// per user. No backend of its own: each person signs in with Puter and their
// usage and storage are their own.
export default {
    slug: 'ai-chat',
    name: 'AI Chat Assistant',
    category: 'App',
    description: 'A private AI assistant with streaming replies and saved conversations.',
    updated: '2026-09-28',
    workers: [],

    suggestions: [
        { label: 'Give it a personality', prompt: 'Turn the assistant into a patient cooking coach: change its instructions, its name, the starter prompts and the colors to match.' },
        { label: 'Add a model picker', prompt: 'Add a menu in the header to choose which AI model answers, and remember my choice.' },
        { label: 'Let me attach images', prompt: 'Let me attach an image to a message so the assistant can describe it or answer questions about it.' },
        { label: 'Add a dark mode', prompt: 'Add a dark mode that follows my system setting, with a toggle in the sidebar that remembers my choice.' },
        { label: 'Export a conversation', prompt: 'Add a button to export the current conversation as a Markdown file.' },
    ],

    page: {
        title: 'AI Chat Assistant Template With Saved Conversations',
        description:
            'A ready-made AI chat app with streaming replies, Markdown, and conversations saved to each user’s own account. Copy it and make it your own assistant.',
        ogTagline: 'Your own AI assistant, ready to change',
        lead:
            'A clean chat interface with streaming answers, Markdown and code formatting, and a sidebar of past conversations that follows each person across devices. Copy it, then give the assistant a job, a name and a look of your own.',
        features: [
            { icon: 'zap', title: 'Streaming replies', body: 'Answers appear word by word as they are written, with a typing indicator while the first words arrive.' },
            { icon: 'history', title: 'Saved conversations', body: 'Every chat is kept in the signed-in person’s own Puter storage, with a sidebar to reopen or delete them.' },
            { icon: 'code', title: 'Markdown and code', body: 'Lists, tables, links and code blocks are rendered cleanly, and sanitized before they are shown.' },
            { icon: 'lock', title: 'Private by design', body: 'People sign in with their own Puter account, so their conversations and AI usage are theirs, not yours.' },
        ],
        faq: [
            {
                q: 'Who pays for the AI in this app?',
                a: [
                    'Each person who uses it signs in with their own Puter account, and their usage is covered by that account. Your costs as the maker do not grow with the number of people chatting.',
                ],
            },
            {
                q: 'Can I change what the assistant is for?',
                a: [
                    'Yes. Describe the assistant you want, for example a writing tutor or a support agent for your product, and the builder changes its instructions, starter prompts and design to match.',
                ],
            },
        ],
    },
};
